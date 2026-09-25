# The differential harness

`architecture.md` ("Randomness must be injectable") sets the goal: the only way to know the
Go port matches the original is to run both on identical input and diff the output. That
needs the JS side to be reproducible, which it is not — `random.js` is unseeded and there
are 71 `Math.random()` call sites across `js-src/server`.

This harness makes the JS side reproducible. It boots a room headlessly, replaces
`Math.random` with the same mulberry32 the Go port uses, replaces the clock and the timer
queue with virtual ones, steps the game loop an exact number of times, and writes one JSON
line of world state per tick.

Three files, all under `tools/harness/`:

| File | Does |
|---|---|
| `setup.js` | Copies `js-src/` to `tools/harness/js/` and applies two source patches |
| `determinism.js` | Installs the seeded RNG, virtual clock and virtual timers on `globalThis` |
| `run.js` | Boots a room, drives the tick loop, writes the JSONL |

`js-src/` is never written to. `tools/harness/js/` is disposable and gitignored — delete it
and re-run `setup.js`. Never hand-edit it; the next refresh silently drops the change.

## How to run

    node tools/harness/setup.js                     # once, and after any js-src change
    node tools/harness/run.js --seed 1 --ticks 100 --out gen/harness-1.jsonl

| Flag | Default | Meaning |
|---|---|---|
| `--seed N` | `1` | mulberry32 seed, coerced with `>>> 0` |
| `--ticks N` | `100` | exact number of `gameloop()` calls, one JSONL line each |
| `--gamemode X` | `ffa` | comma-separated, passed through to `gameServer` |
| `--bots N` | unset | sets `Config.bot_cap`; leave unset for a world of walls and food |
| `--spawnclass NAME` | unset | sets `Config.spawn_class`, the class every bot spawns as |
| `--checkusers` | off | makes `gameHandler.checkUsers()` answer true with no client connected |
| `--bosscooldown N` | unset | sets `Config.boss_spawn_cooldown` (260 as shipped) |
| `--notrace` | off | runs every tick and serialises none, which makes `--out` optional |
| `--quiet` | off | mutes the game's own startup chatter, keeps the harness summary |
| `--out FILE` | required | JSONL destination; parent directories are created |

It prints a JSON summary to stdout and exits on its own. Non-zero exit means the simulation
threw; the stack goes to stderr and the JSONL keeps every tick completed before the throw.

**`--spawnclass` is how you reach a subsystem bots cannot upgrade into.** A bot walks its
own random upgrade path from `Config.spawn_class`, so a tank several tiers away is
effectively unreachable: no run at any length had ever fired a `SHOOT_ON_DEATH` gun or a
necro gun. `--spawnclass beeman` fires 24,360 of the former in 1,500 ticks and
`--spawnclass necromancer` reaches the latter. Both sides take the flag, and so does
`probe-drawsites.js`. Its parser used to ignore flags it did not know, so a probe run
missing one explained a different simulation from the one being debugged; it now exits 2
on an unknown flag and prints the list it does know.

**`--checkusers` is how you reach the boss spawner.** `checkUsers()` is
`global.gameManager.clients.length >= 1` (game/index.js:14), the harness never opens a
socket, and maintainloop's boss spawner (:387) tests it — so no differential had ever
spawned a natural boss. The flag replaces the method and nothing else: everything that
reads `clients.length` for itself (tag.js:46, sandbox.js:6, the view builders) still sees
an empty room, and `cmd/gotrace --checkusers` is limited the same way
(`room.RoomConfig.ForceCheckUsers`, which is why tag and sandbox read `clientCount()`
rather than `checkUsers()`).

Pair it with `--bosscooldown`. The shipped cooldown of 260 counts 1000 ms maintain cycles,
so the first wave is around 8,000 ticks in; at `--bosscooldown 3` it lands on tick 329 of a
seed-1 `ffa` run. Both summaries report the roster at the end — `"bosses"` in run.js's JSON,
`N natural bosses alive` from gotrace — so a run says whether it actually reached the
spawner rather than merely enabling it.

**`--notrace` is for timing, not for diffing.** `JSON.stringify` over ~220 entities per
tick is most of this program's wall clock at any useful length — a 1,500-tick `ffa` run
writes 89 MB — so a speed comparison that includes it is mostly a comparison of two JSON
encoders. `cmd/gotrace` takes the same flag, and the pair is what the numbers in
docs/verification.md's performance section were measured with. The simulation itself is
untouched: the run draws the same 15,311 random numbers either way.

**`tools/dump-mockups.js` is the other kind of tool here: a dump, not a probe.** It boots
the real server's definition loader, runs `loadAllMockups()` and writes all 2,492 mockups
to `gen/mockups.json` for `./tools/sync-embeds.sh` to copy into `internal/net/data/`. Same
shape as `dump-definitions.js` and `dump-rooms.js`, and for the same reason: the builder is
a second implementation of `define()` with its own geometry and its own JSON rules, and
nothing in the simulation depends on its output. See `docs/running-locally.md`.

**`probe-assembler.js` is the pattern for anything a run cannot reach.** It boots the
real server, builds the two entities the assembler merge needs, re-seeds `Math.random` so
the effect velocities come off draw 0 of a known stream, calls the real
`gameHandler.collide` and prints every field the merge touches as JSON. `internal/wire`'s
`TestAssemblerMergeMatchesNode` asserts those numbers. When a code path cannot be reached
by any differential, driving both sides by hand from the same generator state is the next
best thing -- and it is still Node's answer rather than a reading of Node's source.

**Use `--bots` for anything you intend to diff against Go.** Without it the world is 120
static walls plus drifting food: reproducible, but it exercises almost none of the
simulation. See "What the default world actually does" below.

## The patches

`setup.js` applies exactly two string swaps to the copy. Each declares the number of
occurrences it expects and the script aborts if the count is off — a silently skipped patch
would give a harness that runs but lies.

**1. `server/game.js:4` — make `ws` optional.**

```js
const ws = require("ws");
// becomes
const ws = (() => { try { return require("ws"); } catch (e) { return null; } })();
```

`js-src` has no `node_modules`, so a bare `require` throws at module load. The harness never
opens a socket, so `ws` is genuinely unused; the guard keeps `startWebServer()` failing
loudly if anything ever calls it.

**2. `server/game/index.js:515` — expose the game loop's timer handle.**

```js
let gameLoop = setInterval(() => {
// becomes
let gameLoop = this.harnessGameLoopTimer = setInterval(() => {
```

`gameHandler.run()` arms four `setInterval` loops. The harness drives the tick body itself
so the count is exact, so that one interval has to be cancelled; the other three stay armed
and fire off the virtual clock at their real rates.

`setup.js` also asserts that `gameHandler.run()` still contains the five statements `run.js`
mirrors by hand (`RUN_BODY_MARKERS`). If upstream changes that body, setup fails rather than
letting the harness quietly simulate something else.

Everything else is a runtime install in `determinism.js` — nothing else is patched into the
tree.

## The four loops

`gameHandler.run()` (game/index.js:513) arms these:

| Loop | Rate | In the harness |
|---|---|---|
| game loop | `cycleSpeed` = 33.333 ms | **cancelled**; `run.js` calls the body directly, once per `--ticks` |
| `maintainloop` | 1000 ms | armed, fires off the virtual clock |
| `otherloop` | 200 ms | armed — this is where bots spawn (`quickMaintainLoop`, :431) |
| `healingLoop` | `Config.regenerate_tick` = 100 ms | armed |

`run.js` advances the virtual clock to `(tick + 1) * cycleSpeed` before each tick body,
firing everything due on the way in `(deadline, insertion)` order. The target is computed
from the tick counter rather than accumulated, so it cannot drift.

Two statements from the real interval are deliberately **not** mirrored:

- **`:517  if (this.checkUsers())`** gates the entire body on `gameManager.clients.length >= 1`.
  The harness never opens a socket, so this is always false and honouring it would tick
  nothing at all. Bypassing it is the only way the harness simulates anything — but it is a
  real behavioural divergence, and it has one visible consequence: `maintainloop`'s boss
  spawner (`:387`) checks `checkUsers()` too, so **natural boss spawns never happen in the
  harness**. Confirmed empirically: no `boss` entity appears in a 1500-tick run.
- **`:518` the try/catch**, which calls `this.stop()` and swallows the error into
  `gameSpeedCheckHandler.onError`. The harness catches at the outer level so it can print
  the stack and exit non-zero.

## mulberry32

`determinism.js` replaces `Math.random` with mulberry32 seeded from `--seed`:

```js
function mulberry32(seed) {
  let a = seed >>> 0;
  return function () {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
```

This is the same generator as `internal/jsutil/mulberry32.go`. Two details make them agree:
`Math.imul` is a 32-bit multiply keeping the low 32 bits, which is what `uint32` multiply
does in Go; and `>>>` is a *logical* shift, so the Go state must be `uint32` and never
`int32` — an arithmetic shift diverges on any seed with the top bit set.

Verified: the JS above and `NewMulberry32` produce identical first-five draws for seeds
`0`, `1`, `42`, `123456789` and `0xdeadbeef`. The Go side has those vectors as a test
(`internal/jsutil/mulberry32_test.go`); the values were captured from Node, not from the Go
code, so the test is a real cross-check rather than a tautology.

The seed is used raw (`seed >>> 0`) with no mixing step. To draw the same sequence from Go,
call `NewMulberry32(seed)` with the same integer and take `Float64()`.

Boot consumes about 1037 draws before tick 0 (map generation, wall placement). `rngCalls` on
every JSONL line is the running total, so a Go/JS diff can be localised to the tick where
the draw counts part company.

## Virtual clock and virtual timers

`Date.now()`, no-arg `new Date()` and `performance.now()` all read a counter that only the
harness advances. Every other `Date` form (`new Date(ms)`, `new Date(str)`, `Date.parse`,
`Date.UTC`) is untouched.

The epoch is fixed at `1700000000000` (2023-11-14T22:13:20Z) rather than 0, because the game
stores `creationTime` and friends and a zero timestamp is falsy. Elapsed milliseconds are
the authoritative counter and timer deadlines live in elapsed space; the epoch is added only
when `Date.now()` is read. At 1.7e12 a double's step is 2^-12 ms, so keeping deadlines in
elapsed space keeps them exact rather than quantised. `performance.now()` returns elapsed
directly, matching its real semantics as a counter from process start.

`setTimeout`/`setInterval`/`setImmediate` go into a binary heap keyed on
`(deadline, insertion sequence)` — ties break on insertion order, which is what Node does.
Delays outside `[1, 2^31-1]` coerce to 1, again matching Node. Nothing real is ever
scheduled, which is why the process has no pending handles and exits on its own.

A `FIRE_BUDGET` of 1,000,000 callbacks in one step aborts the run rather than spinning
forever on a zero-delay timer that re-arms itself.

## Doors that are nailed shut

`determinism.js` replaces these so they throw instead of quietly doing the wrong thing:

- `net.Server.prototype.listen` — covers `server.js:309` and `game.js:236`. Also covers
  `http.createServer().listen()`, since `http.Server` extends `net.Server`.
- `worker_threads.Worker` — covers `server.js:240`.

Both verified to throw. The harness reaches neither in a normal run; the guards exist so a
future change cannot start a listener or a worker without anyone noticing.

## The fake socket

`tools/harness/fakesocket.js` is a client with no network under it. `socketManager.connect`
(`sockets.js:2049`) hangs about forty things off the socket it is given but only ever reads
six of them -- `send`, `on`, `close`, `terminate`, `readyState`/`OPEN` -- plus an http `req`
it mines for an IP. Supplying those six is the whole of it: the socket that comes back is
the real one `connect()` decorated, and every frame the server sends is decoded onto
`.outbox`.

Its own send-to-server method is called `clientSend`, not `talk`. `connect()` assigns
`socket.talk` itself -- that is the server's send-to-client -- and a method of that name
would be silently replaced by it.

One thing had to be nailed down before a fake client could exist. `sockets.js:2054` gives
every socket `crypto.randomUUID()`, which reads the OS entropy pool rather than
`Math.random`, so it is nondeterminism the seed does not cover. `determinism.js` replaces
it with a counter rather than with a seeded draw, deliberately: drawing would mean a client
connecting shifts every later number in the room, which is precisely the thing the harness
exists to measure. `socket.id` is only ever compared to another id (`:2239`) and used to key
the minimap delta (`:1955`), so a counter is exact for every use it has.

`tools/harness/bootserver.js` is the boot every probe shares: `run.js`'s forty lines of
`.env`, loader, definitions, rooms and a `gameServer` built on the "loaded via the main
server" path, plus a `tick()`.

That `tick()` has to be `run.js`'s, not `handler.gameloop()` on its own. The interval at
`game/index.js:519` runs five things -- `gameloop`, `syncedDelaysLoop`, `foodloop`,
`roomLoop` and the gamemode's `quickloop` -- and a probe that calls only the first is
simulating a room with no food, no synced delays, no tile ticks and no gamemode. It was
exactly that for a while, which is a good illustration of how a probe can be confidently
wrong: the spawn and upgrade probes it produced were still correct, because they measure
things that happen in the first few ticks, and the broadcast probe was quietly describing a
different game by tick 100.

`maxPlayers` defaults to 1 there. A probe that connects two clients must raise it, or the
second is refused mid-handshake and then spawns anyway on a closed socket -- see
found-bugs #82.

## The Go side: cmd/gotrace

`cmd/gotrace` is the mirror of `run.js`, taking the same flags and writing the same
schema:

    node tools/harness/run.js --seed 1 --ticks 600 --bots 8 --out js.jsonl
    go run ./cmd/gotrace     --seed 1 --ticks 600 --bots 8 --out go.jsonl
    go run ./cmd/simdiff js.jsonl go.jsonl

The writer is `internal/trace`, which holds the reader too — `cmd/simdiff` decodes
through the same types the Go server encodes with, so the two halves of the format
cannot drift apart. `internal/trace`'s interop test additionally checks the field set
against `gen/harness-sample.jsonl`, three ticks of real `run.js` output, in both
directions: a field Node emits that Go ignores fails the build, and so does the reverse.

`buildWorld` boots a real room, so the two traces are directly comparable. As of
2026-09-08 seeds 1-10 agree exactly over 600 ticks with 8 bots, seeds 1-3 over 2000, and
seed 1 over 5000 -- every field of every entity on every tick. See `docs/verification.md`
for the table and for the defects that got it there.

What agrees, and how it is checked:

- **The virtual clock, exactly.** All 20 timestamps of a 20-tick run are the same
  float64 as Node's, `33.333333333333336` included. The two sides compute
  `(tick + 1) * cycleSpeed` and land on identical bits.
- **The RNG stream**, values and cumulative draw counts both -- see
  `internal/jsutil`'s golden test.
- **The trace format**, in both directions.
- **The simulation itself**, per the runs above.

## Probes

When a diff does appear, these are the tools that localise it. They come in pairs -- one
flag on the Node probe, one environment variable on `cmd/gotrace` -- and they print the
same shape so the two outputs line up.

| question | Node | Go |
|---|---|---|
| which line took each draw this tick? | `probe-drawsites.js --from N --to N` | `GOTRACE_SITES=N` |
| ...in draw order, not as a tally | `--order` (prints `JSDRAW`) | `GOTRACE_ORDER=1` (`GODRAW`) |
| ...with a call stack | | `GOTRACE_DEEP=1` (`GOSTACK`) |
| what does one entity look like each tick? | `--ent N` | `GOTRACE_ENT=N` |
| every bot's class, level, menu, guns | `--dumpbots` | `GOTRACE_BOTS=N` |
| every write to one entity's accel, in order | `--accel N` (`JSACCEL`) | `GOTRACE_ACCEL=N` (`GOACCEL`) |
| which pairs collided, in order | `--collide N` (`JSCOLLIDE`) | |
| why a bot rejected each target candidate | `--ndm N` (`NDM`) | |
| every `Math.*` call and its result | `--math` | replay through `internal/jsmath` |
| new entities, with the line that created them | `--newents` | |
| one entity's guns, bonds and firing arcs | `--turrets N` (`TUR`) | `GOTRACE_ENT=N` prints `arc=` |
| every controller's think() in and out | `--think N` (`THINK`) | |
| every input `runMove`'s motion switch reads | `--move N` (`MOVE`) | |
| every `SHOOT_ON_DEATH` shot and its inputs | `--sod` (`SOD`) | |
| every outbreak zombify, with `defs[0]` as it really is | `--zombify` (`ZOMBIFY`) | |
| how often each late-wired `sim.Hook` fired | | `GOTRACE_HOOKS=1` (`GOHOOK`) |
| what the assembler merge does, when nothing reaches it | `probe-assembler.js` | `TestAssemblerMergeMatchesNode` |
| what a player joining draws, and the body it gets | `probe-spawn.js` | `TestSpawnMatchesNode` |
| what upgrading and spending stat points does | `probe-upgrade.js` | `TestUpgradeMatchesNode` |
| what the HUD sends, field by field | `../gen-gui-vectors.js` | `TestGUIBlockMatchesTheJS` |
| what a leaderboard row holds, in every mode | `../gen-leaderboard-vectors.js` | `TestLeaderboardMatchesNode` |
| the frames one client gets from the 250 ms loop | `probe-broadcast.js` | `TestBroadcastMatchesNode` |
| randomness per tick with a client attached | `probe-broadcast.js` | `TestBroadcastDrawsPerTick` |
| which line each draw came from, with a client | `probe-clientdraws.js` | (diagnostic) |

`probe-spawn.js` answers the question the corpus is structurally unable to ask. Every run
in `gen/verify` is headless, so it proves an empty room evolves identically and says
nothing about what happens when somebody joins -- which is where `getSpawnLocation` and
`spawn()` spend randomness. The probe connects a client through the real `socketManager`
(see the fake socket below), walks the handshake, and records the draw counter either side
of every step along with every field of the body. Run it per gamemode, because the branches
draw different numbers:

```sh
node tools/harness/probe-spawn.js --seed 1 --gamemode ffa --out gen/spawn-probe-ffa-s1.json
```

`gen-gui-vectors.js` is the same idea applied to code that cannot be required at all.
`sockets.js` is one 2,252-line class that touches `Config`, the entity table and the
loader's globals at module scope, but the five methods behind the HUD -- `floppy`,
`container`, `getstuff`, `update`, `publish` -- need only `util.error` and three Config
keys. The generator slices them out by their signatures, hangs them on a throwaway class,
and drives that with scripted bodies, recording for each frame both the state `update()`
read and the array `publish()` returned. It throws if the boundaries move.

`probe-broadcast.js` and `gen-leaderboard-vectors.js` split the same subsystem the way
the two rows above suggest. The vectors drive the real `makeLeaderboardList`,
`makeLeaderboardHPList` and the four board finders -- sliced out of `sockets.js` with the
same trick `gen-gui-vectors.js` uses -- over synthetic entities, which is the only way to
reach a tie on score, a zero score, an eleventh candidate, a tag room or a boss board. The
probe drives a real client through thirteen firings of the live interval and records the
frames, which is the only way to see which firing resets, what a board switch does to a
stale snapshot, and that `forceNewBroadcast` never turns itself off (found-bugs #78).

`TestBroadcastDrawsPerTick` came out of the same probe and is worth its own line: it
compares the draw counter tick by tick against Node **with a client attached**, which is a
different simulation from the headless one the corpus covers. A view keeps nearby entities
awake instead of dozing for fifteen ticks in sixteen, and -- the reason the test exists --
the first time a socket sees a class, the server builds that class's mockup mid-frame out
of the simulation's own generator (found-bugs #83). The headless corpus was IDENTICAL for
120 ticks while the client-attached run drifted at tick 0; `probe-clientdraws.js` named the
line in one run.

`GOTRACE_HOOKS` answers a question the diff itself cannot: an IDENTICAL run proves
nothing about a hook neither side ever reached. It counts `Zombify`, `ShootOnDeath` (both
invocations and the subset with a gun actually carrying the flag), `Necro` (calls and
conversions) and the assembler pair, and prints the tally at the end of the run. It is
what showed the first three were reachable only with `--spawnclass`, and that the fourth
is not reachable at all -- which is why the assembler merge is pinned by the probe in the
row above rather than by a differential.

Two rules of thumb, both learned the hard way:

**Compare ordered sequences, not totals.** Matching totals say nothing about order, and
order is what a last-bit divergence is usually made of. The broad-phase cell size being 6
instead of 7 showed up as five identical accelerations summed in a different order; no
comparison of the sum could have found it.

**Ask the JS rather than reasoning about it.** `--ndm` exists because a bot ignoring a
target that looked perfectly valid produced a confident, wrong theory about view-based
activation; one run of the probe printed `danger=NaN` and ended the question.

## Output schema

JSONL, one object per line, one line per tick, in tick order. Entities are **sorted by
numeric id**, so ordering never depends on `Map` iteration.

Per line:

| Field | Meaning |
|---|---|
| `tick` | 0-based tick index |
| `time` | virtual milliseconds elapsed (`(tick + 1) * 33.333…`) |
| `rngCalls` | cumulative `Math.random()` draws since install, boot included |
| `nextEntityId` | `global.entitiesIdLog` — the id the next spawn will take |
| `count` | number of entities in `entities` |
| `entities` | array, ascending by `id` |

Per entity, in this field order (the order is the file's order — keep it stable):

| Field | Meaning |
|---|---|
| `id` | `entity.id`, the numeric slab id |
| `index` | definition ordinal as a **string** — `entity.js:194` does `set.index.toString()`, so it is already a string in the JS and is passed through as one. This is the wire ordinal described in architecture.md. |
| `type` | `wall`, `tank`, `food`, `bullet`, `drone`, `trap`, `minion`, `swarm`, … |
| `label` | display name, e.g. `Rock`, `Pentagon`, `Triplex` |
| `team` | team number; walls are `-101` |
| `x`, `y` | position |
| `vx`, `vy` | `entity.velocity.x/y` |
| `size` | `entity.size` |
| `facing` | radians |
| `health`, `healthMax` | from `entity.health.amount` / `.max` |
| `shield`, `shieldMax` | from `entity.shield.amount` / `.max` |
| `alpha` | render alpha; `takeSelfie`/zombify set it to 0 |
| `master` | `entity.master.id`, or the entity's own id when it is its own master |
| `dead` | `entity.isDead()` |

Non-finite numbers are emitted as the strings `"NaN"`, `"Infinity"`, `"-Infinity"` rather
than as `null`. `JSON.stringify` turns them into `null`, which would hide exactly the kind
of divergence this harness exists to catch. A missing field is `null`.

Lines are wide: about 52 KB/tick with 10 bots, so a 1500-tick run is ~100 MB. Stream the
file rather than `readFileSync`-ing it.

## What the default world actually does

With no `--bots`, the room is 6300×6300 with **120 static walls** (Rock/Stone/Gravel) plus
food that spawns over time. The walls never move. Over 100 ticks the entity count goes
120 → 137 and only the food drifts. The run is perfectly reproducible, but it exercises
almost none of the simulation — do not mistake it for verification.

With `--bots`, bots spawn one per `otherloop` firing (every 200 ms of virtual time), but
`spawnBots` (game/index.js:500) only hands a bot its movement controllers after
`3000 + Math.floor(Math.random() * 7000)` ms. **So for the first ~90 ticks bots sit still**,
gaining levels and turning but not moving. This is real game behaviour reproduced faithfully
by the virtual clock, not a harness bug — but it means a 100-tick run with bots still shows
almost no movement. Budget **at least 600 ticks (20 s virtual)** for a run that actually
exercises movement, firing and collision.

## What does not boot, and why

Nothing is stubbed. Each of these is either unreachable or explicitly guarded:

| Subsystem | Status |
|---|---|
| HTTP server (`server.js:76`, `:309`) | Never created. `run.js` uses the `share_client_server` boot path, which does not build one. |
| Web/WS server (`game.js:236` `startWebServer`) | Never called — `gameServer` skips it when `parentPort` is falsy. `ws` is not installed and the require is guarded. |
| Worker threads (`server.js:240`) | Never spawned; `Worker` throws if anything tries. |
| Client sockets | `socketManager` is constructed but no client ever connects, so `clients.length` stays 0. |
| Natural boss spawns | Gated on `checkUsers()` (`game/index.js:387`), which is always false. Bosses can still be spawned by other paths; none fire in a default run. |
| `crypto.randomUUID()` (`sockets.js:2054`) | **Not patched.** It is the only randomness source outside `Math.random`, and it sits inside `socketManager.connect()`, which the harness cannot reach without a socket. If a future harness feature fakes a client connection, this becomes a live nondeterminism source and must be seeded too. |

Definition ordinals come from `fs.readdirSync` order (see architecture.md), so they are
stable on one filesystem but are not guaranteed identical across machines. Verified stable
across a full `setup.js` tree regeneration on this box. When diffing against Go, take the
name→ordinal map from `tools/dump-definitions.js` on the same machine rather than assuming.

## Verified behaviour

Measured on Node v24.18.0, Windows 11.

- **Same seed is byte-identical.** Three runs of `--seed 1 --ticks 600 --bots 8`
  (31,432,549 bytes each) produced one md5, `dc1ee5e2…`, and `cmp` reported no difference.
  Repeated at `--ticks 1500 --bots 10` (99,790,168 bytes): identical. A fourth run made
  after deleting `tools/harness/js/` and re-running `setup.js` matched the earlier three
  byte for byte.
- **Different seeds differ.** `--seed 7` against `--seed 1` at 600 ticks: `cmp` reports a
  difference at line 1 char 50 — the wall layout, generated from the RNG at room setup.
- **Speed.** ~360-370 ticks/s at 1500 ticks with 10 bots (~280 entities); ~500-700 ticks/s
  on smaller worlds. Boot costs ~550 ms on top. `--seed 1 --ticks 100` is 694 ms
  end to end.
- **The simulation is live.** 1500 ticks with 10 bots: 1927 distinct entity ids created,
  1807 spawns, 1648 destroys, mean 101.8 entities moving per tick, peak 280 simultaneous.
  Individual bots travel 1400-2200 units, grow from size 12 to 24, gain health 40 → 220 and
  upgrade class (Basic → Triplex, Assembler, Auto-Builder …), spawning bullets, traps,
  drones, minions and swarms.
- **It exits clean.** `process.getActiveResourcesInfo()` at exit is `[]`,
  `process._getActiveHandles()` is empty and `process._getActiveRequests()` is 0. There is
  no `process.exit()` at the end of `run.js` — the process ends because the event loop
  drained, which is the stronger claim. Node process count on the machine is unchanged
  before and after.

## Gotchas

- `setup.js` does **not** write `.gitignore`. `/tools/harness/js/` is already ignored; the
  script checks and warns rather than editing a file other agents share. (An earlier version
  compared against the unanchored `tools/harness/js/` and so would have appended a duplicate
  line on every run.)
- `run.js` installs determinism *before* requiring any game module. Moving that require
  later would let a module capture the real `Math.random` at load and silently break
  reproducibility. Keep it first.
- The harness mutes the game's own `console.log` under `--quiet` but restores it in a
  `finally`, so a crash still prints.
