# arras-go architecture

This is the contract. Every ported module must fit it. If a port needs something this
document does not allow, stop and raise it rather than inventing a local workaround —
divergent designs across modules are the main way a port like this fails.

## What we are porting, and what we are not

- `js-src/server/**` — ported to Go. This is the work.
- `js-src/server/lib/definitions/**` — NOT ported. Emitted as JSON by `tools/dump-definitions.js`
  and loaded at boot. 32,004 lines of declarative data; hand-porting it buys nothing.
- `js-src/public/**` — NOT touched. The browser client stays in JavaScript.

That last point governs everything else: the Go server must speak the existing binary
protocol byte for byte, because the unchanged JS client is on the other end. See
`docs/protocol.md`. When in doubt, match the JS behaviour exactly — including its bugs.

## Package layout

    cmd/server/          entry point, flag parsing, boot
    cmd/clienthost/      serves js-src/public and the server list   (from server.js's HTTP half)
    internal/vmath/      Vector and angle/clamp helpers              (from vector.js)
    internal/jsutil/     JS-semantics helpers and RNG                (from util.js, random.js)
    internal/spatial/    HashGrid                                   (from lib/hashgrid.js)
    internal/config/     config types, env overrides                (from config.js)
    internal/defs/       definition loading + PARENT resolution      (from gen/definitions.json)
    internal/maze/       maze generation                            (from miscFiles/mazeGenerator.js)
    internal/entity/     Entity, EntityID, World slab
    internal/sim/        physics, collision, the tick loop          (from game/, miscFiles/)
    internal/guns/       gun firing, bullet spawning                (from game/entities/gun.js)
    internal/ctrl/       the 32 io_ controllers                     (from miscFiles/controllers.js)
    internal/jsmath/     V8-compatible sin/cos/pow/...              (from v8/src/base/ieee754.cc)
    internal/define/     applies a resolved definition to an entity (from entity.js define())
    internal/room/       room, gamemode, spawning                   (from game/roomSetup/)
    internal/net/        fasttalk codec, websocket server, mockups  (from lib/fasttalk.js, game/network/)
    internal/trace/      the differential trace format, both ends   (mirrors tools/harness/run.js)
    internal/wire/       composes room with its adapters             (no JS counterpart)

`cmd/server` deliberately serves no files: every request to it is a websocket upgrade
attempt, which is what `server.js:328` treats them as. The Node original serves the client
from the same process because that process is also its web server; here that half is
`cmd/clienthost`, and `docs/running-locally.md` is how the two are run together.

Dependencies point downward only. These are the edges as they actually are — read out of
the imports, not out of anyone's intention for them:

    jsmath, spatial, config       nothing
    vmath                         jsmath
    jsutil                        jsmath, vmath
    defs, maze                    jsutil
    entity                        config, jsmath, spatial, vmath
    trace                         entity, vmath
    sim                           entity, spatial, config, jsutil, vmath, jsmath
    guns, ctrl                    entity and below
    define                        defs, entity, guns, ctrl
    room                          defs, entity, config, jsutil, vmath, jsmath
    net                           entity, config, jsutil, jsmath
    wire                          room, net, sim, define, guns, ctrl, defs,
                                  entity, maze, spatial, config, jsutil

The shape worth noticing is that `room` and `net` are **siblings, not a stack**. Neither
imports the other, and neither imports `sim`, `guns`, `ctrl` or `define`. Every one of
those couplings goes through a small interface — `room`'s `Definer`, `ControllerAttacher`,
`Lifegiver`, `Comms` and `MazeGenerator` (`internal/room/definer.go`), and `net`'s
`PhotoSource` and `Hooks`. Nothing is wired together until `cmd/`.

That is what let five of these packages be written concurrently against a moving tree
without blocking on each other, and it is worth preserving.

`internal/wire` is the one package that sits *above* `room`, and it is worth saying why,
because it looks like a layering violation and is not. Four of `room`'s five seam
interfaces are declared purely in terms of `internal/entity` types, so their implementors
sit below `room` and never import it. `MazeGenerator` is the exception: it returns
`room.MazeLayout`, a room-owned type, so anything implementing it *must* import `room`.
`wire` is where that adapter lives, and it is the natural home for the rest of the
composition as it lands — `cmd/gotrace` and `cmd/server` both need it, and shared code
between two commands belongs in neither. Nothing in the tree may import `wire` except
package `main`; `internal/arch` enforces that.

`Comms` is the second adapter and the reason `wire` imports `net`: `room` announces
through `socketManager.broadcast` and `entity.sendMessage`, and neither package may
import the other. `wire.Boot` is the third thing here, and the least obvious — it is the
*boot order*, which is load-bearing rather than stylistic (see "Randomness must be
injectable" and docs/verification.md's phase table). Stating it once means the server and
the differential harness cannot drift apart on it. `wire.NewDefiner` used to sit behind a
`definer` build tag so that a half-written `internal/define` could not stop `cmd/server`
building. That package is green -- 2,488 definitions checked against Node -- so the tag
is gone and every build defines entities.

`maze` had no importers at all until `wire` gave it one. It is complete and exactly
verified against the real `mazeGenerator.js` (docs/verification.md), and
`wire.MazeAdapter` now satisfies `room`'s `MazeGenerator` — replaying maze's own pinned
corpus through the adapter, draw counts included, so a hoisted generator or a transposed
coordinate fails the build rather than quietly shifting the RNG stream. `Definer` was the last seam;
`internal/define` fills it, and the end-to-end differential it was standing in the way of
now runs across 44 gamemodes, ten long runs and eight boss runs (docs/verification.md). `trace` sits beside `sim`
rather than at the bottom because its writer takes a `*entity.World` and reads the slab;
nothing reads back into it.

If you find yourself needing an upward import, that is a design smell — raise it.

Two of these are not ports of a JS file. `internal/jsmath` exists because Go's `math`
package and V8's are different implementations and disagree on about a quarter of `sin`
and `cos` inputs, which makes exact comparison impossible; see docs/verification.md,
"The libm problem". `internal/trace` holds the differential trace format — the writer the
Go server uses and the reader `cmd/simdiff` uses, deliberately in one package so the two
halves cannot drift apart.

## Entity representation — the central decision

The JS entity graph is cyclic. Every entity holds `master`, `source`, `parent` and
`bulletparent`, and those routinely point at each other and at themselves
(`entity.js` sets `this.source = this` and `this.parent = this` in the constructor).
A direct pointer port would hand Go's GC a dense cyclic object graph to trace every
cycle — which is most of what makes the Node version slow in the first place.

**Entities live in a slab and refer to each other by handle, never by pointer.**

```go
// EntityID is a generational handle. The zero value is deliberately invalid so that
// a forgotten field does not silently alias entity 0.
type EntityID struct {
    Index uint32
    Gen   uint32
}

func (id EntityID) Valid() bool { return id.Gen != 0 }

type World struct {
    entities []Entity   // slab, indexed by EntityID.Index
    gens     []uint32   // generation per slot; bumped on free
    free     []uint32   // free-list of reusable indices

    // Hot fields, kept as parallel arrays for the physics and collision sweep.
    // Index-aligned with `entities`. See "Hot/cold split" below.
    pos, vel, accel []vmath.Vec2
    aabb            []AABB
    size            []float64
    flags           []EntityFlags
}

func (w *World) Get(id EntityID) *Entity   // nil if stale
func (w *World) Alive(id EntityID) bool
func (w *World) Spawn(...) EntityID
func (w *World) Destroy(id EntityID)
```

Rules that follow from this, and they are not negotiable:

1. **Never store a `*Entity` across a tick boundary.** A pointer from `Get` is valid only
   until the next `Spawn`, which may grow and therefore reallocate the slab. Store the
   `EntityID`. This is the single easiest way to introduce a heisenbug here.
2. **Always check `Get` for nil.** A handle to a destroyed entity resolves to nil rather
   than to whatever got recycled into that slot. The JS code frequently holds references
   to dead entities and relies on flag checks; the generation counter is how we make that
   safe instead of merely usual.
3. **`Destroy` does not compact.** It bumps the generation and pushes the index onto the
   free-list. Iteration order is therefore stable within a tick.

Mapping from the JS is mechanical: `this.master` becomes `e.Master EntityID`,
`this.master.x` becomes `w.Get(e.Master).X` with a nil check, and so on.

## Hot/cold split

Profiling of the JS version (see `docs/profiling.md` once it exists) points at the
per-entity tick loop in `game/index.js:206`. The fields that loop touches for *every*
entity every tick live in the parallel arrays on `World`:

    pos, vel, accel, aabb, size, flags

Everything else — labels, guns, skill trees, ownership, definition references — lives in
the `Entity` struct and is touched only when that entity is actually active.

When porting, put a field in the parallel arrays **only** if the main tick loop reads it
unconditionally. Everything else goes in `Entity`. Do not add to the hot arrays without
saying why; each one costs memory bandwidth in the sweep.

## The tick loop

The JS version runs four `setInterval` loops per room at different rates
(`game/index.js:515-545`). Port them as one goroutine per room driving a `time.Ticker`
at the base cycle rate, with the slower work gated on tick counters. Separate tickers
would let the loops interleave, and the JS versions cannot interleave because Node is
single-threaded — reproducing that ordering matters for behavioural fidelity.

Do not port the `logs.*.set()` / `.mark()` instrumentation as-is. In the JS it calls
`performance.now()` eight times per entity per tick and pushes to an unbounded slice
(`game/debug/logs.js:10`). Go's equivalent goes behind a build tag or a compile-time
constant so it costs nothing when off.

## Concurrency

Rooms are already isolated: the JS runs each in a `worker_threads` worker
(`game.js:1`). Port that to one goroutine per room. **Entities never cross rooms**, so a
room's `World` needs no locking — it is owned by its goroutine. Cross-room communication
goes over channels carrying plain values, never `*Entity` or `EntityID` (a handle is
meaningless in another room's slab).

The network layer is the exception: websocket reads land on their own goroutines. They
must not touch a `World` directly. Parse into a plain command struct, send it down a
channel, and let the room goroutine apply it in tick order.

## Definition ordinals are a wire contract — do not re-derive them

`js-src/server/lib/definitions/combined.js:44-49` assigns every definition a numeric
ordinal by walking the `Class` object in insertion order:

```js
let i = 0;
for (let key in Class) {
    Class[key].index = i;
    classMap.set(i++, key);
}
```

Insertion order comes from `loadGroups()`, which recurses through the definitions
directory with `fs.readdirSync` and `require`s whatever it finds
(`combined.js:70-85`). So the ordinal depends on **filesystem enumeration order**.

That ordinal is not internal. `entity.js:194` stringifies it onto each entity as
`.index`, and `sockets.js:677-690` uses it as the key to look up and ship mockup data
to the client. Assign ordinals differently and entities render as the wrong thing.

**Rule: Go must never compute these ordinals itself.** The dumper captures the
name→ordinal map exactly as Node produces it, and Go loads that map verbatim. This
sidesteps the readdirSync-order dependency completely rather than trying to reproduce it.

Related: `game/addons/` is loaded the same way (`combined.js:88-110`), and an addon that
exports a function is *called* with `{ Class, Config, Events }`, so it can mutate the
definition table before ordinals are assigned. The Go port has no equivalent of dynamic
`require`. Runtime-loadable addons are **out of scope** unless raised and agreed —
the port targets the definition set as dumped, with whatever addons were present at
dump time baked in. Flag it if a module you are porting depends on addon behaviour.

## Config is three things wearing one name

`Config` in the JS is a mutable bag built up in five layers — file defaults, server
`properties`, a gamemode merge, ad-hoc installs by gamemode scripts, and live mutation
by admin chat commands. Do not port it as one struct. It splits into three:

**1. `config.Tuning` — the 69 static keys from `config.js`.** Read at boot, never
written. Copied by value into each room, so a room can never scribble on another's.
None of these are environment-overridable: `grep process.env` over the server finds only
permission tokens and an API key, never a `Config` key (`permissions.js:11-32`,
`game.js:193`). The `.env` file is a separate subsystem and belongs in its own package,
not in config.

**2. Room-mutable state — `mode` and `teams`.** `chatCommands.js:110-115` writes both at
runtime. These live on the room and are owned by the room goroutine.

Two type traps to carry over exactly: `Config.teams` receives `args[1]` straight from a
chat command with no coercion (`chatCommands.js:115`), so it can be a string where the
rest of the code expects a number; and `Config.groups` is read as both a party size and
a plain boolean. Model each as whatever the *consumers* need and convert at the
assignment site — do not widen every consumer to handle both.

**3. Gamemode state that is not config at all.** `clan_wars.js:7`, `mothership.js:11` and
`outbreak.js:4` staple whole new keys onto `Config` at gamemode load —
`Config.OURBREAK_FUNCTIONS` is a *function table*. These are per-gamemode state that the
JS happens to hang off the config object because it is a convenient global. In Go they
belong to the gamemode, not to `config.Tuning`.

Corollary: a Go `config.Tuning` field is only correct if it is genuinely read-only after
boot. If you find a module writing to one, it belongs in category 2 or 3 — raise it
rather than making the field mutable.

## PARENT resolution: four algorithms, and none of them is `flatten`

**An earlier version of this section had the merge table wrong on four of five rows, and
then listed only two of the four algorithms.** Both corrections came from executing the
JS, not from reading it: the table below is `tools/gen-defs-vectors.js` output, and
`internal/defs/resolve_golden_test.go` holds every definition to it.

`global.flatten` (`loaders/global.js:611-629`) looks like the generic answer and is **dead
code** — no call sites anywhere. `gen/definitions-flat.json` was produced with it and is a
**debug aid only, never gameplay data**.

The live algorithms:

| Field | `define` (entity.js:176) | `defineSplit` (global.js:407) |
|---|---|---|
| `BODY`, `SIZE` | **set** (`entity.js:439`: `this.SPEED = set.BODY.SPEED`) | multiply |
| `GUNS`, `TURRETS` | **replace wholesale** (`entity.js:414` clears the map first) | append / merge by type |
| `PROPS` | **never read** — `define` only calls `this.props.clear()` (`entity.js:181`) | append |
| `LABEL` | **overwrite** (`entity.js:190`) | concatenate |
| `COLOR` | per-channel merge | per-channel merge |

`define` is the primary path every entity takes at spawn. `defineSplit` handles the split
branches. `docs/definitions-report.md` section 6b has the citations.

**Which define runs depends on what the object is, and there are two more.** `entity.js`'s
TURRETS block reads as if it were defining an entity, but `o` is a `turretEntity`, so
`o.define` is `turretEntity.js:109` — a third algorithm reading about a third of the keys
and none of the rest, with its own constructor values and its own
`define("genericEntity")` seed. A prop is the same story with `Prop.prototype.define`
(`propEntity.js:48`, eight keys). `internal/defs` implements all four. Assuming a turret
gets `Entity.prototype.define` put 180,757 wrong field values into
`Resolved.Turrets[].Resolved`; see `docs/found-bugs.md` #55.

That `PROPS` row is not a curiosity — see `docs/found-bugs.md` #11. 246 definitions carry
decorative geometry that never reaches an entity through the primary path.

**Ordinals stay verbatim.** Each definition's `.index` is a wire contract — stringified
onto entities and used as the mockup key. Load it; never compute, sort or renumber it.

One untested edge: array-form `PARENT` is specified as "later element wins, arrays do not
concatenate", but every live definition has exactly one parent, so that path has never run
against real data.

**Edge count:** the tree has 2,398 PARENT edges. An earlier note said 853 — that was a
grep of `PARENT:` in the source text, which misses the 1,293 procedurally generated
definitions. Never size anything off a grep here.

**`internal/defs` imports `internal/jsutil`.** The layout section calls `defs` dependency
free; the serverPortal re-roll requires an injected RNG. `jsutil` is a leaf, so there is no
cycle. Accepted.

## There are 2,492 definitions, not 1,325

A `grep` for `Class.x =` finds 1,288 lines, of which 1,199 are live and distinct. The
other **1,293 definitions are created procedurally at load time** by helpers such as
`LayeredBoss`, `makeRelic` and the auto-turret generators, and never appear as literal
assignments. `Object.keys(Class).length` is 2,492 and that is the real number. Every one
carries its wire ordinal inline as `.index` (0-2491, unique) — see the ordinals section
above.

Corollary: never size anything off a grep of the source text.

## `serverPortal` spawn delays are randomised at load, and stay that way

`Class.serverPortal`'s 60 gun spawn delays are drawn from `Math.random()` when the
definitions load (`generics.js:701-705`), so the real Node server gets different values on
every restart. `gen/definitions.json` has one run's frozen values baked in.

**Decision: Go re-rolls them at boot** from the injectable RNG, rather than using the
frozen values. The standing rule is to match JS behaviour, and the JS behaviour is to
re-roll. `internal/defs` is responsible for this; the frozen values in the JSON are to be
ignored for this definition.

## Randomness must be injectable

`random.js` is **unseeded** — every function bottoms out in `Math.random()`, and there are
84 `Math.random()` call sites across the server. (An earlier draft of this document called
it a seeded RNG. That was wrong.)

That is a problem for verifying this port. The only way to know a ported simulation
matches the original is to run both on identical input and diff the output, and that
requires both sides to draw the same random sequence.

**Rule: no package-level randomness anywhere in the simulation.** Every function that
needs randomness takes a `*rand.Rand` (or a struct holding one) explicitly. Never call
`rand.Float64()` and friends at package level — that is unseedable and untestable.

This buys the differential harness: seed the Go side, and run a *copy* of the JS tree
(never `js-src/` itself, which stays pristine) with `Math.random` replaced by the same
seeded generator. Then the two are directly comparable tick for tick. Without injectable
randomness the port can only be spot-checked, and a 20,000-line port that is only
spot-checked is not one anybody should trust.

## Embedding generated data

`go:embed` patterns cannot contain `..`, so a package can only embed files at or below
its own directory. Generated JSON therefore lives in two places:

- `gen/*.json` — canonical output of the dump tools. Inspectable, diffable, the thing you
  read when you want to know what was generated.
- `internal/<pkg>/data/*.json` — a copy, so the package can embed it. Gitignored, never
  hand-edited.

`tools/sync-embeds.sh` copies one to the other. Run it after any dump tool:

    node tools/dump-definitions.js && tools/sync-embeds.sh

Each data-loading package embeds from its own `data/` directory with go:embed, and also
exposes a path-based loader so tests can point at a fixture. Do not solve this per package
in some other way — one mechanism, used everywhere.

## Decisions settled while porting Entity

**Gun and Controller objects live outside `entity`.** Dependencies point downward, so
`entity` cannot hold a `guns.Gun`. Entity stores `GunID` / `ControllerID` handles into
tables owned by the room. The controller table must expose a controller *kind*, because
`addController` (entity.js:133) deduplicates by constructor.

**Time is injectable, like randomness.** `entity.js` stamps three timestamps per entity
and `game/debug/logs.js` reads the clock in the hot loop. The differential harness freezes
time to a virtual clock; Go does the same through `World.Now`. Never call `time.Now()`
directly in simulation code — it is as unreproducible as `rand.Float64()`.

**float64 everywhere in simulation state.** This used to say float32 in the hot arrays,
for memory bandwidth. It was wrong and it is now fixed — see "The hot arrays are float64"
below. JS numbers are float64, so anything narrower cannot reproduce a Node value, and
the differential harness is the reason this port can be trusted at all. The only place
that still narrows is the wire, because the protocol does.

**`Config.growth` is gamemode state, not tuning.** It is installed by
`game/gamemodes/config/growth.js:3`, so it is architecture category 3. It reaches `size`
and `refreshBodyAttributes` through an explicit context struct.

**`World.Tuning` must be set before spawning.** `NewWorld(capacity)` cannot take it, so it
is a settable field. If a room forgets, `Spawn` leaves `Skill` zeroed rather than dividing
by a zero skill cap — silent, not loud. Set it at room construction.

**`Skill.LSPF` needs a Go-side registry.** It is a definition-supplied *function*
(`groups/bosses/dev.js:1297`), and the JSON dump drops functions. `internal/defs` keys a
small registry by definition name to restore that one case. It is the only known instance;
if another appears, it goes in the same registry rather than getting its own mechanism.

## What the differential harness cannot cover

`tools/harness/run.js` bypasses `checkUsers()` (`game/index.js:517`), which gates the real
loop on at least one connected client. With no socket it is always false, so honouring it
would tick nothing.

The consequence is not cosmetic: `maintainloop`'s boss spawner (`game/index.js:387`)
checks the same condition, so **natural boss spawns never happen in the harness** —
confirmed empirically over 1500 ticks. Any Go-vs-JS diff therefore never exercises boss
code paths. Boss behaviour needs its own targeted tests; do not read a clean diff as
covering it.

Also unpatched: `crypto.randomUUID()` at `sockets.js:2054`, the only randomness outside
`Math.random`. It sits inside `socketManager.connect()` and is unreachable without a
socket, but it becomes live nondeterminism the moment the harness fakes a client.

Budget at least 600 ticks and pass `--bots`. Without bots the world is 120 static walls
and drifting food, and `spawnBots` withholds movement controllers for 3-10 seconds, so a
100-tick run looks like it works while proving almost nothing.

## Memory shape

Measured with `go run ./cmd/memcheck`:

| | |
|---|---|
| Definition table, retained after load | **36 MB** |
| Resolving all 2,492 definitions | **+0.0 MB** — fully transient |
| Load-time churn | ~185 MB allocated, ~459k allocs, ~700 ms |

The load figure is decoder garbage, not footprint. The table is immutable after load, so
it is **shared by every room in the process** rather than paid per room — the per-room cost
is the entity slab.

Resolution retaining nothing is the property worth protecting. If a change makes
`Resolve` retain per-definition state, 2,492 resolutions start costing real memory and
`cmd/memcheck` will show it.

Beware when measuring: `runtime.KeepAlive` is needed around the thing being measured, or
the GC collects it before `ReadMemStats` and the reading comes out *below* baseline —
which reads as "resolving frees memory".

## The hot arrays are float64 (migration completed 2026-09-07)

An earlier version of this document required float32 in `World`'s parallel arrays, for
memory bandwidth. That rule is gone. Everything in simulation state — `vmath.Vec2`,
`World.Pos`, `Vel`, `Accel`, `Size`, `spatial.Box`, `Entity.OriginalSize`,
`Control.Power` — is float64.

The reason is verification, not taste. JS numbers are float64 throughout, so a float32
position cannot reproduce a Node position. `internal/sim` measured the gap at up to
1.55e-4 units per step; it compounds every tick until two entities collide in one
implementation and miss in the other, at which point `cmd/simdiff` has nothing exact
left to compare and no tolerance can tell drift from a bug.

The bandwidth this costs is 48 KB at 2,000 entities — 96 KB instead of 48 KB for
position, velocity and acceleration. Both fit in L2. That was the whole trade.

Two concrete things went green the moment it landed, having failed before:
`internal/vmath`'s golden test now matches Node exactly on all 27 cases, including
`(0.1, 0.2)`, which was wrong in the seventh digit, and `(1e-200, 1e-200)`, where both
components underflowed to zero and collapsed `direction` from Pi/4 to 0.

Narrowing to float32 is still correct in one place: the wire. `internal/net` quantises
to float32 because the protocol does, and that narrowing happens where the JS narrows
too.

### What this exposed

With the float32 noise gone, a smaller disagreement became visible underneath it: Go's
`math` package and V8's are different implementations, and they disagree on about a
quarter of `sin` and `cos` inputs. See docs/verification.md, "The libm problem". Until
`internal/jsmath` lands, exact physics comparison is still out of reach — but for a
reason that is now measured and named rather than buried.

## Conventions

- **No globals.** The JS installs `Class`, `Config`, `entities`, `grid`, `util` and more as
  globals via `loaders/global.js`. Each becomes an explicit field or parameter. If a
  ported function needs five of them, it takes a context struct — it does not reach out.
- **No allocation in the tick loop.** The JS allocates a fresh `collisionArray` per entity
  per tick and a photo object in `takeSelfie()`. Reuse buffers with `buf = buf[:0]`.
  A `go test -bench` with `-benchmem` showing non-zero allocs/op in the tick path is a
  defect, not a tuning opportunity.
- **float64 everywhere, including the hot arrays.** The client never sees the extra
  precision — but `cmd/simdiff` does, and reproducing Node's arithmetic exactly is worth
  far more than the 48 KB. Narrow to float32 only at the wire, where `docs/protocol.md`
  says the protocol itself quantises.
- **Errors:** return them. The tick loop logs and continues on a per-entity error rather
  than aborting the room — matching the JS `try/catch` around `gameloop()`
  (`game/index.js:518`). Do not panic in simulation code.
- **Naming:** JS `camelCase` becomes Go `CamelCase` for exported, `camelCase` for
  unexported. Keep the original name so the two trees stay greppable against each other —
  `contemplationOfMortality` stays `contemplationOfMortality`, however odd it reads.
- **Comments in plain English.** Short sentences saying why, not banner blocks. Do not
  restate what the code does.
- **Tuning constants live in `internal/config`**, not as file-local `const` in whatever
  module happens to use them.

## Rules for port agents

1. Read this file and `docs/protocol.md` before writing code.
2. Port one module. Do not touch files outside the scope you were given — other agents are
   working in the same tree concurrently.
3. `js-src/` is read-only. Never modify it.
4. Match JS behaviour exactly, including apparent bugs. If you believe you have found a
   real bug, write it in `docs/found-bugs.md` with `file:line` and port the buggy
   behaviour anyway. Deciding to fix it is not yours or mine to make unilaterally.
5. Every module ships with a test. Where the JS behaviour is checkable, the test compares
   against values taken from the JS source rather than against your own implementation.
6. If this document does not cover something you need, say so in your report. Do not
   invent a second way of doing it.

Co-Authored-By: Haiku
