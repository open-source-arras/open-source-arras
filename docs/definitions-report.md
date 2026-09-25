# Entity definitions dump — report

Produced by `tools/dump-definitions.js`, which writes `gen/definitions.json` (PARENT
intact) and `gen/definitions-flat.json` (PARENT resolved). This document is the write-up
`docs/architecture.md` promises for that script. `js-src/` was never written to while
producing any of this — the dumper only `require()`s files there.

Headline numbers from a production run (`node tools/dump-definitions.js`):

| | raw (`definitions.json`) | flat (`definitions-flat.json`) |
|---|---|---|
| definitions | 2,492 | 2,492 |
| non-serialisable values | 1,110 (100 function, 1,010 undefined) | 1,284 (147 function, 1,137 undefined) |
| `__classRef` normalizations | 1,778 | 1,971 |
| PARENT anomalies (unresolvable to string/classRef) | 0 | n/a (flat has no PARENT key) |
| cross-check vs. real `global.flatten` | n/a | 2,492 checked, **0 mismatches** |

No RegExp, Map, Set, Symbol, BigInt, Date, or unexpected class instance was found
anywhere in the tree. Every non-JSON value is a plain JS `function` or an explicit
`undefined`, and every one of them is recorded in place as a
`{"__nonSerialisable": ...}` sentinel — see [section 4](#4-non-serialisable-values).

## 1. Load approach

The dumper does not parse the JS. It requires the real boot chain and calls the real
loader, then serialises whatever ends up in `Class`:

1. `require('js-src/server/loaders/loader.js')` — this is the same file `server.js` and
   `game.js` require first. It runs `loaders/global.js` (which creates `Class`, `Config`,
   `ensureIsClass`, `util`, `ran`, `Tile`, `flatten`, `defineSplit`, ...) and then the
   entity/gun/controller machinery (`Entity`, `Gun`, `IO`, `ioTypes`, `turretEntity`,
   `Prop`, `bulletEntity`) that the definition files assume exists. This step matters
   more than it looks: `js-src/server/lib/definitions/groups/testing.js` declares
   `class io_turretWithMotion extends IO` at its top level, which throws immediately if
   `IO` is not already a real global — a hand-rolled stub set would have to guess that.
2. `global.Config.startup_logs = false` — silences the real per-file console logging so
   the dumper's own summary is the only stdout output. This mutates an in-memory object
   in the dumper's own throwaway process; it is not persisted anywhere.
3. `global.Class` is wrapped in a `Proxy` whose `set` trap logs every assignment (key,
   order, whether it overwrote an existing key). This is what makes the reconciliation in
   section 2 precise instead of a guess — it catches `Class.foo = ...` and
   `Class[expr] = ...` identically, which a text search cannot.
4. `new definitionCombiner({groups, addonsFolder}).loadDefinitions(true, false)` — the
   exact class `js-src/server/lib/definitions/combined.js` exports, pointed at
   `lib/definitions/groups` and `lib/definitions/entityAddons`, with
   `includeGameAddons: false`. `js-src/server/game/addons/` (chat commands, key bindings,
   server travel) is a separate, much heavier subsystem that is out of scope for this
   dump — the task and its reconciliation grep are both scoped to
   `js-src/server/lib/definitions`, so this mirrors that instead of guessing at it.

### Why "just require it" is the only reliable approach, with two proofs from this run

- `js-src/server/lib/definitions/entityAddons/betterRetrograde/tanks.js` and
  `js-src/server/lib/definitions/entityAddons/scenexe.js` both open with a bare
  `return;` right after their requires. In CommonJS that exits the module wrapper
  function early, so every `Class.foo = ...` after it (87 of them combined, see
  section 2) never runs. A text or regex scan of the file would count them as live
  definitions; requiring the file does not, because Node itself skips that code.
- `js-src/server/lib/definitions/entityAddons/marchMadness/marchMadness.js` is a single
  `if (Config.march_madness) { ... }` block. `Config.march_madness` is `undefined` in the
  base `config.js` (falsy), so this dumper — like the real server under the same config —
  never executes any of it.

Neither of those is visible from the source text alone; both fall out for free from
actually running the loader.

### Safety check performed before running anything

Before requiring `loader.js`, every file it pulls in transitively was read and checked
by hand for: non-relative `require()` targets (none beyond Node's `events` builtin —
`ws`, the one npm dependency, is only required by `game.js`/`server.js`, which this
dumper never touches), top-level `setInterval`/`.listen(`/`createServer`/`new Worker`/
`process.exit` (none — the one `setInterval` found, in `groups/testing.js:173`, is
inside an `ON: [{event: 'fire', handler: ...}]` closure, never called at load time), and
top-level filesystem writes (none). Loading is confined to reading `.js` files under
`js-src/server` and computing in memory.

## 2. Definition count and reconciliation

**2,492** definitions were loaded — not the ~1,325 estimated in the task, and not the
1,288 the task's own reconciliation grep reports:

```
grep -rhoE '^\s*Class\.[A-Za-z0-9_]+\s*=' js-src/server/lib/definitions | wc -l
# 1288
```

The full accounting, run against this same source tree:

```
1,288   static "Class.name = " source lines (the grep above)
-  87   inside dead code that a `return;` disables before it runs:
        - entityAddons/scenexe.js                    (84 lines)
        - entityAddons/example/exampleAddon.js         (2 lines)
        - entityAddons/betterRetrograde/tanks.js       (1 line)
= 1,201 "Class.name = " lines that actually execute
-    2  duplicate re-assignments of a name already assigned earlier in the same file
        (see "Two harmless overwrites" below)
= 1,199 distinct names contributed by static "Class.name = " assignments
+ 1,293 distinct names contributed by "Class[expr] = " assignments — i.e. generated
        procedurally, at runtime, by a helper function that a group file calls, often
        many times (see below)
= 2,492 Object.keys(Class).length — matches the dumper's own count exactly
```

The 1,293 procedurally-generated names are the reason the task's own estimate needed
reconciling in the first place, and they are also why static parsing was ruled out for
this job: nothing in the source text enumerates them, because they don't exist until a
facilitator function executes. Concretely:

- **`LayeredBoss`** (`facilitators.js:1257`) does `Class[this.identifier] = {...}` in its
  constructor and `Class[this.identifier + "Layer" + this.layerID] = layer` in
  `addLayer()` (`facilitators.js:1308`). `groups/bosses/*.js` calls `new LayeredBoss(...)`
  roughly 40 times and follows most of them with one or more `.addLayer(...)` calls —
  see the `paladin` example in section 8, which is one `new LayeredBoss` plus two
  `addLayer` calls contributing 3 definitions (`paladin`, `paladinLayer1`,
  `paladinLayer2`) that appear nowhere as `Class.x = ` in the source.
- **`makeRelic`** (`facilitators.js:1337-1338`) does
  `Class[Math.random().toString(36)] = relicCasing` / `relicBody` for each polygon relic
  — 154 such entries this run (see section 3, they get renamed to stable names).
- **`makeAuto`/`makeTurret`/`weaponArray`-style generators** and the tier-loop blocks in
  `groups/tanks.js` (e.g. `Class[\`tripleAuto${type...}\`] = makeAuto(...)`,
  `tanks.js:1459`) and **`generatorMatrix`** in `entityAddons/generators.js` synthesize
  the rest across the auto-tank and generator-tank families.

### Two harmless overwrites

The dumper's assignment log also reports every case where a name was assigned twice.
There are exactly two, both in `js-src/server/lib/definitions/groups/turrets.js`:

```
1481: Class.undertowTurret = makeTurret("undertow", {canRepel: true, limitFov: true, extraStats: []})
1482: Class.forkTurret     = makeTurret("fork",     {canRepel: true, limitFov: true, extraStats: []})
...
1509: Class.undertowTurret = makeTurret("undertow", {canRepel: true, limitFov: true, extraStats: []})
1510: Class.forkTurret     = makeTurret("fork",     {canRepel: true, limitFov: true, extraStats: []})
```

Both calls are identical, so the second assignment overwrites the first with an
equivalent value — a copy-paste redundancy in the source, not a behavioural difference.
Nothing to port around; noted here because the dumper is built to report every overwrite
it sees, not just the ones that turn out to matter.

## 3. Two sources of run-to-run non-determinism (and what the dumper does about them)

Running the dumper twice and diffing the output finds exactly 215 differing leaf values
between any two runs, all accounted for:

| count | cause |
|---|---|
| 1 | `meta.generatedAt` timestamp — expected |
| 154 | `meta.anonymousKeyRenames[].originalKey` — expected, see below |
| 60 | `Class.serverPortal.GUNS[*].POSITION[6]` — a real random value baked in at JS load time, see below |

**154 renamed anonymous keys.** `makeRelic` (`facilitators.js:1337-1338`) registers small
turret sub-parts under `Class[Math.random().toString(36)]`. Nothing ever looks these up
by name — their one reference is the object itself, placed inline as a `TURRETS[].TYPE`
value, which the `__classRef` mechanism (section 5) already resolves by identity. Left
alone, these 154 names would make `definitions.json` churn on every regeneration for no
semantic reason, so the dumper renames each one, before serialising, to
`anon_<index>_<slug of its LABEL>` — e.g. `0.jg52kualiae` → `anon_111_Relic_Casing`. The
`index` used is the same stable, insertion-order number `loadDefinitions()` itself
assigns (confirmed identical across runs for every one of the other 2,338 definitions),
so the rename changes nothing about which object is which or what references what — it
only replaces a cosmetic, unstable identifier with a stable one. `meta.anonymousKeyRenames`
in both JSON files lists every rename made (`originalKey`, `stableName`, `index`); the
`originalKey` field is, by construction, whatever that run's random draw happened to
produce, so it is the one field that legitimately differs run to run.

**60 genuinely random data values — not a dumper artifact.** `groups/generics.js:701-705`:

```js
for (let i = 0; i < 60; i++) {
    let spawnDelay = Math.random() * 252;
    if (spawnDelay < 20) spawnDelay = Math.random() * 4;
    Class.serverPortal.GUNS.push({
        POSITION: [2, 8, 1, -150, 0, 360 / 60 * i, spawnDelay],
        ...
    });
}
```

This runs once, at module load, in the real server too — restart the actual Node
server twice and `Class.serverPortal`'s 60 spawn delays would differ between those two
boots exactly the same way. The dumper reports this faithfully rather than papering over
it: `Class.serverPortal.GUNS[i].POSITION[6]` in `definitions.json` is whatever value this
particular run's `Math.random()` happened to produce, frozen at dump time. **This is the
one place a Go implementer must make a conscious choice**: either treat the shipped value
as fixed forever (simplest — `serverPortal` gets one fixed set of spawn delays instead of
a new one every boot), or special-case this field in `internal/defs` and re-roll it at Go
boot with the same distribution (`rand()*252`, re-rolled to `rand()*4` if the first draw
is under 20) to preserve the original "different every restart" behaviour. Nothing else
in `js-src/server/lib/definitions` calls `Math.random()` outside of an `ON:`/tick handler
closure (those only run during actual gameplay and do not affect the static shape of
`Class`) or the disabled/gated code already covered in section 1 and 2 — this was
confirmed by grepping every `Math.random()` call under `lib/definitions` and checking
each call site by hand.

## 4. Non-serialisable values

Every function, and every explicit `undefined`, is replaced in place with a sentinel
object and recorded in `meta.nonSerialisable` (kind + path; the sentinel left in the
tree itself additionally carries the source text). Full detail lives in the JSON;
this section is the complete accounting by kind and field.

### Functions — 100 in raw, 147 in flat

All 100 are real behaviour, not incidental data — tick/event handlers and one per-level
skill-point callback. Grouped by owning definition (raw dump):

| definition | count | field shape |
|---|---|---|
| `serverPortal` | 61 | 60 × `GUNS[i].PROPERTIES.TYPE[1].ON[0].handler` + 1 × `ON[0].handler` |
| `onTest` | 5 | `ON[0..4].handler` (a dev/test definition) |
| `trplnrBossVulnerableForm` | 2 | `ON[0].handler`, `ON[1].handler` |
| `absoluteSolver` | 2 | `ON[0].handler`, `ON[1].handler` |
| `toothlessBase` | 1 | `defineLevelSkillPoints` (not an `ON:` handler — see section 8) |
| `toothlessBossTurret` | 1 | `GUNS[0].PROPERTIES.TYPE[1].TICK_HANDLER` |
| 28 other definitions | 1 each | `ON[0].handler` |

(`portalAura`, `spiralBullet`, `pythonBullet`, `undertowBullet`, `wranglerMinion`,
`oroborosTrap`, `cocci`, `rocket`, `spectator`, `banHammer`, `flailBall`, `maceBall`,
`ihdtiBall`, `celestial`, `trplnrBoss`, `trplnrBossBulletHellForm`, `helenaBoss`,
`legionaryCrasherSpawner`, `legionaryCrasherSpawnerFix`, `eternal`, `terrestrial`,
`teamWall`, `tagBullet`, `roaringParent`, `roaringLancer`, `ntf_tailBolt0`, `ghoster`,
`switcheroo` are the 28 one-each definitions.)

Flat has 147 (98→144 `handler`, 1→2 `defineLevelSkillPoints`, 1→1 `TICK_HANDLER`) because
flattening pulls each definition's *inherited* fields in too — a descendant of
`serverPortal`-adjacent generic entities that never appears in the raw list picks up an
inherited `ON:` handler once flattened. Same underlying function values, more paths that
reach them.

### `undefined` — 1,010 in raw, 1,137 in flat

Every one of these traces back to the same JS idiom: a facilitator function parameter
with no default, forwarded into an object literal via shorthand — e.g.
`LayeredBoss`'s constructor (`facilitators.js:1257`) takes `BODY, SIZE, VALUE` with no
defaults and does `Class[this.identifier] = {..., BODY, SIZE, VALUE, ...}`; most
`celestials.js` boss calls only pass 8 positional arguments, so those three keys are
`undefined` on ~40 boss definitions. By trailing field name (raw):

| field | count | field | count |
|---|---|---|---|
| `PROPERTIES` | 309 | `SIZE` | 43 |
| `INTANGIBLE` | 153 | `VALUE` | 43 |
| `TURRETS` | 97 | `UPGRADE_LABEL` | 38 |
| `MAX_CHILDREN` | 76 | `UPGRADE_TOOLTIP` | 36 |
| `AI` | 90 | `UPGRADE_COLOR` | 32 |
| `BODY` | 52 | `PROPS` | 1 |

**This is safe to treat as "field absent", not a mystery value to preserve.** Every
place the real game reads these fields guards with `!= null`
(e.g. `entity.js:437`: `if (set.BODY.SPEED != null) this.SPEED = set.BODY.SPEED;`), and
`!= null` is `false` for both `undefined` and a genuinely missing key. Flagging them as
`__nonSerialisable` rather than letting `JSON.stringify` silently drop them was still the
right call — dropping them silently would have been indistinguishable from "we forgot to
check this field ever gets set to `undefined` on purpose" — but a Go implementer can
treat every `{"__nonSerialisable": "undefined", ...}` sentinel exactly like an absent
key.

Zero RegExp, Map, Set, Symbol, BigInt, Date, or unexpected class instance occurred
anywhere in either file. Zero true circular references were found (see section 6 for
why PARENT itself can't produce one in this dump).

## 5. `__classRef` normalization

1,778 values in the raw dump (1,971 in flat) are not strings but are, by object
identity, one of the other entries in `Class`. Reduced to `{"__classRef": "<name>"}`
instead of inlining a full duplicate copy — the target is still the same row of
`definitions`, so nothing is lost, and this keeps `PARENT` (and everything else) uniform
across the file: always either a plain string, a `__classRef` sentinel, or an array of
those, never a mix of "sometimes a name, sometimes a full nested copy of another
definition."

Two distinct source patterns produce these, both confirmed by reading the code that
creates them:

- **257 are `PARENT`.** `facilitators.js:1406`, `exports.makeCrasher = type => ({PARENT: type, ..., VALUE: type.VALUE * 5, ...})`
  — `type` here is already a resolved definition *object* (the function reads
  `type.LABEL`, `type.VALUE`, `type.BODY.HEALTH` directly), not a name string, so every
  crasher's `PARENT` is a live reference to its base type's object, not the string
  `"egg"`/`"square"`/etc. Without normalization this would inline the entire base
  definition — SHAPE, GUNS, everything — under every single crasher's `PARENT` key.
- **1,521 are other fields**, overwhelmingly `GUNS[i].PROPERTIES.TYPE[0]`. The pattern
  (seen on `serverPortal` and similar entities) is
  `TYPE: [someAlreadyResolvedType, {ON: [...], ...overrides}]` — a base type resolved to
  its object up front, paired with an override object carrying e.g. a custom `ON:`
  handler. This is the same shape `exports.dereference` (`facilitators.js:83`) produces
  and is a completely ordinary way to attach a one-off behaviour on top of a stock type
  without duplicating it. It is *not* PARENT-related; it happens because the same
  identity-reuse pattern the codebase uses for inheritance is also used for this.

Zero `parentAnomalies` were recorded — every one of the 853 `PARENT:` occurrences in the
source resolves to a plain string, a `__classRef`, or an array of those; nothing fell
through to a deep-inlined nested object.

## 6. PARENT merge semantics

**There is no single merge algorithm to port.** This codebase contains two different
ones, they disagree on several fields, and only one of them is dead code. Emitting a
"flattened" file at all required figuring out which is which; this section is that
finding, with the source lines that prove it, because getting it backwards would quietly
change stat balance in the Go port.

### 6a. `global.flatten` — exists, but is dead code

`js-src/server/loaders/global.js:611-629`:

```js
global.flatten = (output, definition) => {
    definition = ensureIsClass(definition);
    if (definition.PARENT) {
        if (!Array.isArray(definition.PARENT)) {
            flatten(output, definition.PARENT);
        } else for (let parent of definition.PARENT) {
            flatten(output, parent);
        }
    }
    for (let key in definition) {
        if (key !== "PARENT") {
            output[key] = definition[key];
        }
    }
    return output;
};
```

Recursive, ancestors-first (a definition's own keys are applied *after* its whole PARENT
chain has been walked, so a descendant's key always wins over an ancestor's same key),
**shallow**: `output[key] = definition[key]` is a plain reference assignment, so if a
key's value is itself an object (`BODY`, `COLOR`, ...), the *entire* nested object is
replaced wholesale by whichever definition in the chain last mentioned that key — sibling
fields an ancestor set inside that same nested object are gone, not merged. A `PARENT`
array is walked element by element, each one flattened into the same accumulator in
order, so a later array element's keys beat an earlier element's same keys — arrays are
never concatenated, only the last contributor of each key survives. This is exactly what
`gen/definitions-flat.json` implements (a cycle-guarded, path-tracking port of the above,
cross-checked line-for-line against calling the real function on all 2,492 definitions —
0 mismatches).

**`global.flatten` is never called anywhere else in this codebase.** Confirmed by
grepping every `.js` file under `js-src` for `flatten(`: the only call sites are the two
recursive self-calls inside its own body. No gamemode script, network handler, editor
tool, or entity file invokes it. It is the codebase's own reference implementation of "a
generic flatten," left in the source, unused.

### 6b. What actually resolves PARENT at runtime — and it isn't one algorithm either

Every real definition applies through `Entity.prototype.define`
(`js-src/server/game/entities/entity.js:176`) for the entity's primary class chain
(`defs[0]` and its own recursive `PARENT`), and through `defineSplit`
(`js-src/server/loaders/global.js:407`) for every other entry in a multi-definition
`defs` array (a `PARENT` array's 2nd+ element, or an additional upgrade branch). Both
recurse ancestors-first like `flatten`, but neither is a generic key-overwrite — each
field name has its own, different rule, and the two functions don't even agree with each
other:

| field | `define()` — primary chain (`entity.js`) | `defineSplit()` — extra branches (`global.js`) |
|---|---|---|
| `BODY.*` stats | **set** per sub-key, ancestor fallback (`entity.js:437-455`: `if (set.BODY.SPEED != null) this.SPEED = set.BODY.SPEED;`) | **multiply** per sub-key (`global.js`: `if (set.BODY.HEALTH != null) my.HEALTH *= set.BODY.HEALTH;`) |
| `SIZE` | **set**: `this.SIZE = set.SIZE * this.squiggle` | **multiply**: `my.SIZE *= set.SIZE * my.squiggle` |
| `GUNS`/`TURRETS`/`PROPS` | **replace wholesale** — `this.guns.clear(); this.gunsArrayed = [];` before rebuilding (`entity.js:414`) | **append** — pushed onto the existing list, nothing cleared |
| `CONTROLLERS` | merge **by controller class**, via `addController` (`entity.js:133-145`): a new controller of a type already present replaces that one in place; a new type is appended | same `addController` call, same by-type merge |
| `COLOR` | **per-channel merge with ancestor fallback**, via `Color.prototype.interpret` (`miscFiles/color.js:35-58`): `this.#hueShift = color.HUE_SHIFT ?? ... ?? this.#hueShift ?? 0` — a child COLOR that only sets `HUE_SHIFT` leaves the inherited `BASE`/`SATURATION_SHIFT`/etc. untouched | n/a (not read in `defineSplit`) |
| `LABEL` | **overwrite**: `this.label = set.LABEL` | **concatenate**: `my.label = my.label + "-" + set.LABEL` |
| `UPGRADES_TIER_*` | **always accumulate** — pushed onto `this.upgrades`, every level of the chain contributes, nothing is ever cleared | same, always accumulate |
| `MAX_CHILDREN` | not read here | **add**: `my.maxChildren += set.MAX_CHILDREN` (and reset to `null` if a branch omits it — `global.js`, right after the `MAX_CHILDREN` check) |

`BODY` and `COLOR` are the two fields worth being most careful about, because they look
like ordinary nested objects and the natural instinct is to deep-merge or shallow-replace
them the same way regardless of context — neither is correct:

- `flatten()`'s `output.BODY = definition.BODY` would **lose** any inherited BODY
  sub-stat the closest definition's own BODY doesn't repeat.
- The real primary-chain `define()` **keeps** every inherited BODY sub-stat except the
  ones the closest definition explicitly overrides (an implicit per-key deep merge, not a
  replace).
- The real `defineSplit()` branch path **compounds** BODY sub-stats multiplicatively down
  the whole chain rather than either replacing or merging them.
- `COLOR` follows the primary-chain rule (per-channel merge with fallback) always, since
  `defineSplit` never reads `COLOR` at all.

### What this means for `internal/defs`

`gen/definitions.json` (PARENT intact) is the file to build inheritance resolution from,
and that resolution has to be the field-specific logic in the table above, not a generic
merge — `gen/definitions-flat.json` reproduces `global.flatten`'s shallow semantics
faithfully (verified against the real function on every definition), but `global.flatten`
itself is dead code nobody has ever exercised against real gameplay, so treat that file
as an inspection/debug aid only — e.g. "what does this definition look like with
inherited top-level keys filled in, nearest-definition-wins" — never as a source of
resolved stats. Matching the primary-chain-vs-branch distinction requires knowing, for
each definition instantiated in Go, whether it's playing the role of `defs[0]` (walk its
own `PARENT` chain via the `define()` column above) or an additional branch (`defineSplit`
column) — that distinction lives in how the Go entity-spawning code assembles a `defs`
array, not in the JSON itself.

## 7. Config sensitivity of this specific dump

Several files branch on `Config.*` at module-load time (not inside a runtime handler),
so the shape of `Class` this dump captured depends on the exact `Config` this ran under:
the plain top-level `js-src/server/config.js` object, with **no** gamemode-specific
`properties` override applied (those are only merged in by `gameServer`'s constructor in
`game.js`, which this dumper never constructs). Verified values at dump time:

```
arms_race = undefined   classic_food = false      retrograde = undefined
teams = undefined       spawn_class = "basic"      march_madness = undefined
level_cap_cheat = 45    fireworks = false          daily_tank = undefined
```

Every one of `arms_race`, `classic_food`, `retrograde`, `teams`, `march_madness` is
falsy under this config, so every load-time branch gated on them was **skipped** in this
dump:

- `Config.arms_race` gates several `addUpgrades`/`removeUpgrades` calls across
  `groups/tanks.js` and `entityAddons/dreadnoughts/dreadv2.js` (extra tier-4 upgrade
  paths). Skipped.
- `Config.classic_food` gates `groups/dev.js`'s dreadnought-menu variant choice and a
  3-entry splice into `Class.menu_mysticalBosses.UPGRADES_TIER_0`
  (`groups/bosses/mysticals.js:277-278`). Skipped.
- `Config.teams == 1` gates a block in `groups/tanks.js:11079-11086` that adds `healer`
  and removes `smasher` from `Class.basic.UPGRADES_TIER_2` (among other swaps). Skipped —
  confirmed directly: this dump's `Class.basic.UPGRADES_TIER_2` is `["smasher"]`, not
  `["smasher", "healer"]` (see section 8).
- `Config.retrograde` gates one more `addUpgrades` call in `groups/tanks.js` (the
  matching call in `entityAddons/betterRetrograde/tanks.js` is moot — that whole file is
  dead code, section 1). Skipped.
- `Config.march_madness` gates the entirety of `entityAddons/marchMadness/marchMadness.js`.
  Skipped.

If the Go port needs definitions as they'd look under a specific gamemode's config
overrides, either regenerate this dump with `Config` patched to that gamemode's
`properties` before calling `loadDefinitions`, or port these five conditionals into Go's
own load-time logic over the (config-independent) JSON this run produced. `spawn_class`
is not a branch — it's used as a literal value (an upgrade-menu entry, a
`REROOT_UPGRADE_TREE` default) — under this config it resolves to the string `"basic"`
wherever it appears, which the JSON already reflects correctly.

## 8. Round-trip verification

Five definitions, chosen for range: the plainest tank, one with a facilitator-generated
`GUNS` array, a procedurally-generated boss, a `PARENT`-array definition, and a
non-serialisable function. Every number below was traced back to its exact source
expression by hand — not eyeballed for plausibility.

### `Class.basic` — `groups/tanks.js:8`

```js
Class.basic = {
    PARENT: 'genericTank', LABEL: "Basic", DANGER: 4,
    GUNS: [{ POSITION: {LENGTH: 18, WIDTH: 8},
              PROPERTIES: {SHOOT_SETTINGS: combineStats([g.basic]), TYPE: 'bullet'} }]
};
```

`combineStats` (`facilitators.js:17`) starts every stat at `1` and multiplies in each
listed gun-value table's fields (`?? 1` for anything a table omits).
`g.basic` (`gunvals.js:18`): `{reload:10.5, recoil:1.4, shudder:0.1, damage:0.75, speed:4, spray:15}`.
Dumped `SHOOT_SETTINGS`: `reload:10.5, recoil:1.4, shudder:0.1, size:1, health:1,
damage:0.75, pen:1, speed:4, maxSpeed:1, range:1, density:1, spray:15, resist:1` — every
field matches exactly, unmentioned fields correctly default to `1`.

The dumped object also carries `UPGRADES_TIER_1: ["twin","sniper","machineGun",
"flankGuard","director","pounder","trapper","desmos"]` and `UPGRADES_TIER_2: ["smasher"]`
— **not present in the literal above**. These come from
`addUpgrades('basic', 1, [...])` / `addUpgrades('basic', 2, ['smasher'])` at
`tanks.js:10532-10533`, ~10,500 lines further down the same file, executed against the
already-created `Class.basic` object. This is expected and correct — the dump reflects
`Class.basic`'s final state after the *entire* file has run, not the state at its
`Class.basic = {...}` line — but it means comparing "the JSON" to "the literal at the
assignment" is the wrong comparison; the right one is the JSON against every place in
the source that ever touches that name, which is what was actually checked here. (This
also verifies section 7's `Config.teams` finding: a later block,
`tanks.js:11079-11081`, would add `'healer'` to and remove `'smasher'` from this same
array if `Config.teams == 1` — the dumped array is `["smasher"]`, confirming that block
did not run.)

### `Class.twin` — `groups/tanks.js:177`, `GUNS` via a facilitator

```js
Class.twin = {
    PARENT: 'genericTank', LABEL: "Twin",
    GUNS: weaponMirror({ POSITION: {LENGTH: 20, WIDTH: 8, Y: 5.5},
                          PROPERTIES: {SHOOT_SETTINGS: combineStats([g.basic, g.twin]), TYPE: 'bullet'} },
                        {delayIncrement: 0.5})
};
```

`weaponMirror` (`facilitators.js:1061`) pushes the original weapon unchanged, then a
clone with `POSITION.Y` negated, `POSITION.ANGLE` negated (`-0`, and `JSON.stringify(-0)`
is `"0"` — correctly seen as `0` in the dump, not a bug), and
`POSITION.DELAY = (0 ?? 0) + 0.5, then % 1 = 0.5`. Dumped `GUNS`: gun 0's `POSITION` is
exactly `{LENGTH:20, WIDTH:8, Y:5.5}` (no `ANGLE`/`DELAY` — only the mirrored clone gets
those), gun 1's is `{LENGTH:20, WIDTH:8, Y:-5.5, ANGLE:0, DELAY:0.5}`. Both matches exact.

`combineStats([g.basic, g.twin])` with `g.twin` (`gunvals.js:82`:
`{recoil:0.5, shudder:0.9, health:0.9, damage:0.7, spray:1.2}`): `recoil = 1.4*0.5 = 0.7`,
`shudder = 0.1*0.9 = 0.09` (dumped as `0.09000000000000001` — IEEE-754 float
representation, expected, not an error), `health = 1*0.9 = 0.9`,
`damage = 0.75*0.7 = 0.525` (dumped as `0.5249999999999999`, same reason), `spray =
15*1.2 = 18`. Every field on both guns matches exactly.

### `Class.paladin` — `groups/bosses/celestials.js:76`, a procedurally-generated boss

```js
let paladin = new LayeredBoss(null, "Paladin", "celestial", 9, "purple", "baseTrapTurret", 6.5, 5.5);
paladin.addLayer({gun: {...}}, true, null, 16);
paladin.addLayer({turret: {...}}, true, 6);
```

`LayeredBoss`'s constructor (`facilitators.js:1257`) takes `(identifier, NAME, PARENT,
SHAPE, COLOR, trapTurretType, trapTurretSize, layerScale, noSizeAn, BODY, SIZE, VALUE)` —
this call passes only 8 positional arguments, so `noSizeAn` defaults `false` and `BODY`,
`SIZE`, `VALUE` are `undefined`. Dumped: `NO_SIZE_ANIMATION: false`, and `BODY`/`SIZE`/
`VALUE` are all `{"__nonSerialisable": "undefined", ...}` — exact match. 9 `TURRETS`
entries at `360/9*(i+0.5)` for `i=0..8` = `20,60,100,...,340` degrees, each
`POSITION[0] = trapTurretSize = 6.5`, `TYPE: "baseTrapTurret"` — all 9 match exactly.

The two `addLayer` calls append two more `TURRETS` entries. `this.layerSize` starts at
`20`; `addLayer` does `this.layerSize -= (layerScale ?? this.layerScale)`. First call
passes `layerScale = null`, so `null ?? this.layerScale` falls through to the
constructor's own `layerScale = 5.5` → `20 - 5.5 = 14.5`. Second call passes
`layerScale = 6` explicitly → `14.5 - 6 = 8.5`. Dumped: `TURRETS[9].POSITION[0] = 14.5,
TYPE:"paladinLayer1"` and `TURRETS[10].POSITION[0] = 8.5, TYPE:"paladinLayer2"` — both
match exactly, including which of the two `addLayer` calls' explicit-vs-defaulted
`layerScale` argument produced which number.

### `Class.genSentrySwarm` — `entityAddons/generators.js:97`, a `PARENT` array

```js
Class.genSentrySwarm = {
    TYPE: [], PARENT: ["sentrySwarm"],
    CONTROLLERS: ["nearestDifferentMaster", "mapTargetToGoal", "hangOutNearMaster"],
};
```

Dumped `PARENT`: `["sentrySwarm"]` — preserved exactly as a single-element array of
strings, no `__classRef` needed since it was already a name. (No definition anywhere in
this codebase currently uses a *multi*-element `PARENT` array — every array-form
`PARENT` found, here and in `entityAddons/scenexe.js`'s dead code, has exactly one
element — so the "later array element wins" rule from section 6a is a real code path
that exists but is not currently exercised by any live definition.)

### `Class.toothlessBase` — `groups/bosses/dev.js:1274`, a non-serialisable function

```js
Class.toothlessBase = {
    PARENT: 'genericTank', LABEL: "Absolute Solver",
    BODY: {SPEED: 0.8*base.SPEED, FOV: 1.5*base.FOV, HEALTH: 6*base.HEALTH, DAMAGE: 2*base.DAMAGE},
    SKILL_CAP: Array(10).fill(smshskl + 3),
    defineLevelSkillPoints: (level) => {
        if (level < 2) return 0;
        if (level <= 40) return 1;
        if (level <= 45 && level & (1 == 1)) return 1;
        return 0;
    },
};
```

`base` (`constants.js:13-20`): `SPEED:5.25, HEALTH:20, DAMAGE:3, FOV:1.02`. Dumped `BODY`:
`SPEED:4.2 (5.25*0.8)`, `FOV:1.53 (1.02*1.5)`, `HEALTH:120 (20*6)`, `DAMAGE:6 (3*2)` — all
exact. `SKILL_CAP` dumped as ten `15`s, matching `smshskl = 12` (`constants.js`) `+ 3`.
`defineLevelSkillPoints` is dumped as:

```json
{
  "__nonSerialisable": "function",
  "path": "Class.toothlessBase.defineLevelSkillPoints",
  "name": "defineLevelSkillPoints",
  "source": "(level) => {\r\n        if (level < 2) return 0; ..."
}
```

— the `source` field is the function's exact original text (V8 preserves it verbatim,
`\r\n` line endings included because the source file is CRLF), so a Go implementer
reading this JSON can transcribe the logic by hand with no reconstruction risk. This is
also the one field on this definition that is *not* an `ON:`-style event handler — it is
called directly (grep the game code for `defineLevelSkillPoints` to find the call site
before porting its logic).

## 9. What a Go implementer must know — checklist

1. **Top-level JSON shape is `{meta, definitions}`, not a flat map of names.** Iterate
   `definitions`; `meta` carries everything in this report in machine-readable form
   (counts, the full `nonSerialisable` and `classRefNormalizations` index lists, the
   `anonymousKeyRenames` table, the flatten cross-check result).
2. **Use `definitions.json` (PARENT intact) as the source of truth.** Resolve
   inheritance in Go using the field-specific rules in section 6b's table, not a generic
   merge — and know whether the definition you're resolving is playing the role of
   `defs[0]` (the `define()` column) or an additional branch (the `defineSplit` column),
   because the same field can mean "set" in one context and "multiply" or "concatenate"
   in the other.
3. **`definitions-flat.json` is a debug/inspection aid, not gameplay data.** It faithfully
   reproduces the codebase's own (unused) `global.flatten`, cross-checked against that
   real function on all 2,492 definitions with zero mismatches — but that function
   disagrees with the real inheritance path on `BODY`, `SIZE`, `GUNS`/`TURRETS`/`PROPS`,
   `CONTROLLERS`, `COLOR`, and `LABEL` (section 6b). Do not resolve stats from it.
4. **Every non-JSON value is a `{"__nonSerialisable": kind, path, source, ...}`
   sentinel** (`kind` is `"function"` or `"undefined"` in this dump; `"regexp"`, `"map"`,
   `"set"`, `"date"`, `"symbol"`, `"bigint"`, `"class-instance"`, or `"circular"` are
   supported by the dumper but did not occur). `undefined` sentinels can be treated as
   "key absent" (section 4). `function` sentinels carry the exact original JS source in
   `source` — port that logic by hand; do not attempt to execute it.
5. **Every `{"__classRef": "name"}` value is a reference by object identity to another
   entry in the same `definitions` map** — look it up there, do not expect inline data.
6. **154 definitions have synthetic names** of the form `anon_<index>_<label-slug>`
   (listed in `meta.anonymousKeyRenames`) in place of the `Math.random()`-derived names
   the JS server would generate fresh on every boot. Don't treat these names as stable
   API surface a player-facing feature could reference — they exist only so every `Class`
   entry has a key.
7. **`Class.serverPortal`'s 60 gun spawn-delays are a real per-boot-random value in the
   original game** (section 3), frozen at whatever this dump's generation happened to
   roll. Decide deliberately whether to keep that fixed or re-roll it at Go boot; don't
   let it pass as "just another number" without that decision being made on purpose.
8. **This dump reflects one fixed `Config`** — the plain `js-src/server/config.js`
   object with no gamemode `properties` override (section 7). `Config.arms_race`,
   `classic_food`, `retrograde`, `teams == 1`, and `march_madness` all gate real
   structural differences in `Class` and were all off for this run. Regenerate under a
   different effective `Config` if a specific gamemode's variant is needed.
9. **`index` on every definition is the same stable, insertion-order integer the real
   server's `loadDefinitions()` assigns** (`classMap` in the JS). It was confirmed
   identical across repeated runs for every definition except (by construction) nothing —
   even the 154 renamed ones keep their real index, only their name changed.
10. **Regenerating this file is not perfectly byte-stable** — expect the `generatedAt`
    timestamp, the 154 `originalKey` fields, and `Class.serverPortal`'s 60 spawn-delay
    floats to differ between runs (and nothing else); see section 3 for why each of those
    three is expected and what it means.

## Files produced

- `tools/dump-definitions.js` — the dumper (run: `node tools/dump-definitions.js`).
- `gen/definitions.json` — 2,492 definitions, PARENT intact (~8.6 MB).
- `gen/definitions-flat.json` — 2,492 definitions, PARENT resolved via the ported
  `global.flatten` (~11.4 MB, larger despite `__classRef` compaction because flattening
  pulls inherited fields — including inherited functions — into every definition).
- `docs/definitions-report.md` — this document.
