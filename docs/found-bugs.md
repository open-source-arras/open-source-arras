# Defects found in the JS server during the port

Per `docs/architecture.md` rule 4, these are recorded but **reproduced faithfully** in the
Go port. Fixing any of them changes game behaviour and is a separate decision.

---

## 1. HashGrid key collision beyond ±32768 cells

`js-src/server/lib/hashgrid.js:2,17`

Cell coordinates are packed as `x + y * 65536`. Once `|x| >= 32768` the packed key
collides with a neighbouring row's, so distant entities become collision candidates for
each other.

Whether this is reachable depends on world size versus cell size: it needs
`worldWidth >> cellSize` to exceed 32768. Not yet checked against the real config.

**Ported as-is** in `internal/spatial/hashgrid.go`.

---

## 2. Profiler runs unconditionally in the hottest loop

`js-src/server/game/index.js:206` and `js-src/server/game/debug/logs.js:10`

The per-entity tick loop calls `logs.<x>.set()` / `.mark()` four times per entity, and
`mark()` is:

```js
mark() { this.logTimes.push(performance.now() - this.trackingStart); }
```

That is 8 `performance.now()` calls and 4 slice pushes per entity per tick, into arrays
that grow unbounded until `record()` or `sum()` drains them. There is no debug gate.

At 2,000 entities and 30 Hz that is roughly 480k clock reads and 240k pushes per second.

**Not ported.** `docs/architecture.md` requires this to sit behind a compile-time constant
so it costs nothing when off. This is a pure win with no behavioural change.

---

## 3. Per-tick allocations in the entity loop

`js-src/server/game/index.js`

Three allocations per entity per tick:

- `instance.collisionArray = []` — a fresh slice every entity, every tick
- `grid.query()` returns a `Set`, re-hashing every candidate on every query (`hashgrid.js:29`)
- `takeSelfie()` calls `this.camera()`, allocating a photo object (`entities/entity.js`)

**Not ported.** The Go version reuses buffers; `internal/spatial` uses a stamp-based dedup
instead of a Set and holds its output slice across queries. Behaviour is identical, the
allocation is not.

---

## 4. Per-instance closures in the Entity constructor

`js-src/server/game/entities/entity.js:29-38`

`this.removeFromGrid` and `this.addToGrid` are assigned as arrow functions inside the
constructor, so every entity allocates its own closure objects rather than sharing a
prototype method. Costs memory per entity and defeats V8's hidden-class optimisation.

**Not applicable** to the Go port — these become plain methods.

---

## 5. Vector getters silently swallow NaN

`js-src/server/game/entities/vector.js:7,11`

```js
get x() { if (isNaN(this.X)) this.X = 0; return this.X; }
```

Any NaN entering a vector is zeroed on the next read. This masks upstream arithmetic bugs
rather than surfacing them — `physics()` (`entity.js`) even has an explicit "Void Error!"
branch for velocity going null, suggesting this has bitten before.

**Ported deliberately** as `vmath.Vec2.Scrub()`. Go would otherwise propagate the NaN and
diverge from Node within a tick.

---

## 6. `shuffle()` is a biased Fisher-Yates variant

`js-src/server/lib/random.js:73-80`

```js
exports.shuffle = (arr) => {
    arr = arr.slice();
    for (let i = arr.length - 1; i > 0; i--) {
        let j = Math.floor(Math.random() * i);
        [arr[j], arr[i]] = [arr[i], arr[j]];
    }
    return arr;
}
```

Correct Fisher-Yates draws the swap partner `j` from `[0, i]` inclusive
(`Math.floor(Math.random() * (i + 1))`), so that index `i` sometimes swaps with itself and
stays put. This draws `j` from `[0, i)` instead — index `i` can never be swapped with
itself — so every position is denied the "stays in place" outcome a correct shuffle would
give it with probability `1/(i+1)`. The permutation distribution is not uniform.

For exactly two elements the bias is total rather than merely statistical: the only loop
iteration is `i = 1`, so `j = Math.floor(Math.random() * 1)` is always `0`, and the single
swap always fires. `random.shuffle(['A','B'])` returns `['B','A']` on every call — verified
against real Node output (200/200 trials, 0 identity permutations).

All shuffle-derived output inherits this — `shuffle`, `chooseN`, and therefore
`chooseBossName` (boss name selection).

**Ported as-is** as `jsutil.Shuffle`. Matching the biased distribution matters more than
fixing it: boss-name (and other shuffle-derived) selection must stay statistically
identical to the JS server, and "fixing" the bias silently would be exactly the kind of
divergence this port is trying to avoid.

---

## 7. `chooseN()` loops forever if `arr` is empty

`js-src/server/lib/random.js:61-71`

```js
exports.chooseN = (arr, num) => {
    let result = [], extendedArr = [];
    while (extendedArr.length < num) {
        extendedArr.push(...exports.shuffle(arr));
    }
    ...
}
```

If `arr` is empty and `num > 0`, `shuffle(arr)` always returns `[]`, so `extendedArr` never
grows and the `while` condition never becomes false — an unconditional hang, not just a
slow path. Not reachable from `chooseBossName`'s only real call sites (`nameLists.bots`,
`.a`, `.castle`, `.legion` are all non-empty), but reachable from `chooseN` directly by any
future caller that doesn't check first.

**Ported as-is** as `jsutil.ChooseN` (same structure, same hang for the same input) per
`docs/architecture.md` rule 4. No test in `random_test.go` calls it with an empty slice,
since that test would simply hang rather than fail.

---

## 8. `updateAABB` leaves a stale rectangle behind, and the grid is queried with it

`js-src/server/game/entities/entity.js:108-119`

```js
this.updateAABB = (active) => {
    this.antiNaN.update();
    if (!active || (!this.collidingBond && this.bond != null)) {
        this.isInGrid = false;
    } else {
        this.isInGrid = true;
        this.minX = this.x - this.size;
        ...
    }
};
```

`minX..maxY` are written only in the else branch. An entity that fails the gate — inactive,
or bonded without `collidingBond` — keeps whatever rectangle it last had, and if it was
born bonded that rectangle is still all zeroes, i.e. the origin.

The rectangle is not then ignored. `game/index.js:255` queries the broad phase with
`instance.minX .. instance.maxY` for **every** entity, in or out of the grid. So a bonded
turret collision-checks whatever currently sits at its last unbonded position, or at the
world origin if it never had one.

Note `isInGrid` and the query's bonded filter are two separate gates: `hashgrid.js:34`
drops bonded entities as *candidates* regardless of insertion, which masks part of this —
a stale-boxed bonded entity still finds non-bonded neighbours near its ghost rectangle.

**Ported as-is** in `World.UpdateAABB`, pinned by
`TestUpdateAABBLeavesBoxStaleWhenGated`. The first cut of this port rebuilt the box
unconditionally, which is tidier and diverges.

---

## 9. Leaderboard delta compares 7 fields but transmits 8

`js-src/server/game/network/sockets.js:1756`

The leaderboard row carries eight fields, the eighth being `renderOnLeaderboard`
(`entry.settings.renderOnLeaderboard ?? true`; the HP, tag and mothership builders hardcode
`false`). The `Delta` it is pushed through is constructed with `dataLength = 7`.

The client stores the field as `renderEntity` (`socketinit.js:807`) and `app.js:3820` uses
it to decide whether to draw the tank's mini-image beside the row. Driven against the real
`Delta` class: a change confined to field 7 emits `[0, 0]` — an empty update — while the
same rows through `new Delta(8)` emit the whole row. The reset form carries all eight
either way, so the icon corrects itself on the next full send.

Reasons to read it as a bug rather than a decision: every other `Delta` in the file has
`dataLength` exactly equal to its row length (5/5, 3/3), the `?? true` default reads like a
later addition to an existing row, and suppressing the update saves nothing — the field is
already in the payload.

**Ported as 7.** The effect is a stale icon until the next reset.

---

## 10. `socket.anon` is read but never assigned

`js-src/server/game/network/sockets.js:1985, 1993`

Two read sites, no assignment anywhere in the tree, and no dynamic `socket[key] =` or
`Object.assign(socket, …)` for it to hide behind. It is therefore always `undefined`, and
both guarded branches take the same path every time.

**Not ported.** Dead state, reproduced by simply not existing — the branch it guards
behaves identically.

---

## 11. `PROPS` never reaches an entity through the primary definition chain

`js-src/server/game/entities/entity.js:181` and `js-src/server/loaders/global.js:467`

`Entity.prototype.define` opens with `this.props.clear()` at every level of the PARENT
recursion, and then never reads `set.PROPS` — a grep for `PROPS` over `entity.js` finds
only that `clear()`. The only `new Prop(...)` in the whole tree is inside `defineSplit`
(`global.js:467`), which runs only for the 2nd and later entries of a `defs` array.

So a definition that declares `PROPS` renders none of them when it is spawned normally,
because normal spawning is `define(oneClass)` — a defs array of length 1, no branches.
Confirmed by running the real `define` against `Class.sphere` (6 `PROPS` entries) with a
recording `Prop` constructor: zero props are constructed and `this.props.size` is 0.

246 definitions in `gen/definitions.json` carry a non-empty `PROPS` array. All of their
decorative geometry is dead unless they are used as a split-upgrade branch.

**Ported as-is** in `internal/defs/resolve.go`: `define` clears `Resolved.Props` and never
fills it; only `defineSplit` builds `ResolvedProp` entries.

---

## 12. An inherited `SYNC_WITH_TANK` is silently wiped by every descendant

`js-src/server/game/entities/entity.js:558`

```js
this.syncWithTank = set.SYNC_WITH_TANK ?? false
```

Unlike every other field in `define`, this assignment is not behind an
`if (set.X != null)` guard. `define` recurses ancestors-first and each level runs the
statement, so the last one to run — the definition being spawned — always wins. A child
that says nothing about `SYNC_WITH_TANK` resets an ancestor's `true` to `false`.

21 definitions inherit a `true` they never see, including every flail
(`flail`, `doubleFlail`, `flangle`, `mace`, `bigMama`, `flace`, `flooster`,
`itHurtsDontTouchIt`, `tripleFlail`) under `genericFlail`, and `destroyerDominator`
under `dominator`.

**Ported as-is**: `internal/defs/resolve.go` assigns `res.SyncWithTank` unconditionally at
every level, and `TestSyncWithTankIsNotInherited` pins the behaviour.

---

## 13. Turret danger is read off the array, not the element, so every turret gets `DANGER: 0`

`js-src/server/game/entities/entity.js:474-480`

```js
type = Array.isArray(def.TYPE) ? def.TYPE : [def.TYPE];
for (let j = 0; j < type.length; j++) {
    o.define(type[j]);
    if (type.TURRET_DANGER) turretDanger = true;   // `type` is the array
}
if (!turretDanger) o.define({ DANGER: 0 });
```

`type.TURRET_DANGER` reads a property off the array object rather than off `type[j]`, so
it is always `undefined`. `turretDanger` can never become true and every turret ever
built is redefined with `DANGER: 0`, discarding whatever danger value its own definition
chain resolved. Verified against the real `define`: all 11 of `Class.paladin`'s turrets
come out with `dangerValue === 0`.

Currently the two are indistinguishable — no definition in `gen/definitions.json` sets
`TURRET_DANGER` at all — so fixing the indexing alone would not change behaviour today.

**Ported as-is**: `Resolver.resolveTurrets` forces `DangerValue` to 0 on every turret.

---

## 14. Definitions write `RATEFFECTS`; the entity reads `RATIO_EFFECTS`

`js-src/server/game/entities/entity.js:256`, `js-src/server/lib/definitions/groups/generics.js:34,238`

```js
if (set.RATIO_EFFECTS != null) this.settings.ratioEffects = set.RATIO_EFFECTS;
```

The only two definitions that try to control this write `RATEFFECTS`
(`genericEntity: true`, and one `false`), and no definition anywhere writes
`RATIO_EFFECTS`. `settings.ratioEffects` is therefore never set from a definition on a
real entity. `bulletEntity.js:186` has the same mismatch; only `mockupEntity.js:256`
sidesteps it, with `set.RATIO_EFFECTS ?? true`.

**Ported as-is**: `internal/defs` carries both keys, and the resolver reads
`RATIO_EFFECTS`, so `Settings.RatioEffects` stays absent for every definition in this
dump — exactly as on the JS side.

---

## 15. Twelve prop positions are written in the turret layout and are misread

`js-src/server/game/entities/propEntity.js:14-20` vs `turretEntity.js:61-69`

The two array forms differ: a turret's is `[SIZE, X, Y, ANGLE, ARC, LAYER]`, a prop's is
`[SIZE, X, Y, ANGLE, LAYER]` — no `ARC` slot. Twelve prop entries are written with six
elements in the turret layout:

```
menu_sentries PROPS[0]  [12,0,0,0,360,1]
pumpkin       PROPS[0..10]  e.g. [6,-4.5,0,0,360,1]
```

`propEntity.js` maps index 4 to `LAYER`, so these props get `LAYER: 360` — the intended
`ARC` — and the real layer at index 5 is dropped on the floor.

Latent rather than visible today, because bug #11 means no prop is ever constructed
through the primary chain in the first place.

**Ported as-is**: `internal/defs` reads a prop POSITION with the five-slot layout, and
keeps anything past it in `MountPosition.Unread` so the value is not lost as well as
misread.

---

## 16. An `undefined` handler in `ON` abandons the rest of `define`

`js-src/server/game/entities/entity.js:486-489`

```js
for (let { event, handler, once = false } of set.ON) {
    if ("undefined" == typeof handler) return;   // `return`, not `continue`
```

A single malformed `ON` entry does not skip that entry — it returns from `define`
entirely, so everything after the `ON` block is never applied: `SHAKE`, `NECRO`,
`SYNC_WITH_TANK`, `mockup`, `this.defs`, the `define` event, and every `defineSplit`
branch. The entity ends up half-defined with no error.

Not reachable with the current data: all 98 `ON[].handler` values in
`gen/definitions.json` are real functions.

**Ported as-is**: `Resolver.define` returns early on an absent handler.

---

## 17. `runYinYang`'s missing braces run one erosion call once instead of eight times

`js-src/server/miscFiles/mazeGenerator.js:993-995`

```js
for (let i = 0; i < 8; i++)
  this.erodeSym2(0, 2)
  this.erodeSym2(1, 2)
```

No braces, so the `for` loop's body is only the first statement. `this.erodeSym2(1, 2)`
is not inside the loop at all — it runs exactly once, immediately after the loop finishes,
despite the shared indentation making it look like the eighth line of an 8-iteration block.
The yin-yang map (mazeType 20) ends up eroded once from the `(1, 2)` pass where the
surrounding code clearly intends eight.

Every other multi-statement loop body in this file is wrapped in `{ }` (compare
`runNormal2`, `run2Teams`, `runAcropolis`, all a few dozen lines away); this is the one
place that pattern was dropped, which is why it reads as a mistake rather than a deliberate
asymmetry.

**Ported as-is** in `internal/maze/maze.go`'s `runYinYang`: `erodeSym2(0, 2)` runs in an
8-iteration loop, then `erodeSym2(1, 2)` runs once, unconditionally, matching the JS control
flow rather than its indentation.

---

## 18. `firmcollidehard` divides by a config key that does not exist

`js-src/server/miscFiles/collisionFunctions.js:86,96,97,102,103`

Five divisions, all by `Config.runSpeed`:

```js
let repel = (my.acceleration + n.acceleration) * (...) / buffer / Config.runSpeed;
my.velocity.x -= 0.05 * (item2.x - item1.x) / dist / Config.runSpeed;
```

`config.js` spells the key `run_speed`, and a repo-wide grep finds `Config.runSpeed`
assigned nowhere — only `gameManager.runSpeed` exists (`game.js:128`). So each of these
is `x / undefined`, which is `NaN`. The function's entire effect is to write NaN into
the velocities and accelerations of two colliding tanks. `antiNaN` then rolls both back
on the next `updateAABB` and counts a strike.

It is reachable: `game/index.js:177` picks it over `firmcollide` for two tanks with
`hitsOwnType: "hardOnlyTanks"` whenever `Config.train` is on, which the `train_wars`
gamemode sets.

**Ported as-is** in `internal/sim/collisionfuncs.go` (`Firmcollidehard`), with the
missing key spelled `math.NaN()` so the divisions behave identically. Pinned by the
`firmcollidehard.train` golden vector, which was produced by running the real JS.

---

## 19. `firmcollide`'s two speed guards are always true

`js-src/server/miscFiles/collisionFunctions.js:46,50`

```js
if (mySpeed <= Math.max(mySpeed, my.topSpeed)) { ... }
if (nSpeed  <= Math.max(nSpeed,  n.topSpeed))  { ... }
```

`Math.max(a, b)` is never smaller than `a`, so both conditions hold for every finite
speed. The separation nudge is applied unconditionally. The intent was presumably
`mySpeed <= my.topSpeed` — "don't push something that is already going faster than it
should" — which is what `firmcollidehard` does two functions down, where the same idea
is written as `my.velocity.length <= s1` with `s1 = Math.max(velocity.length, topSpeed)`
and is *also* always true.

**Ported as-is.** The guards are kept in `Firmcollide` rather than removed, so the day
someone fixes the JS the diff lands in one place in both trees.

---

## 20. The `droneCollision` buffer is `+Inf` when both drones are still

`js-src/server/game/index.js:145`

```js
let a = 1 + 10 / (Math.max(instance.velocity.length, other.velocity.length));
firmcollide(instance, other, a);
```

The `pushOnlyTeam` arm ten lines above writes the same expression as
`10 / (Math.max(...) + 10)`. This one has no `+ 10`, so two drones that are both
stationary divide by zero and hand `firmcollide` a buffer of `Infinity`. Inside
`firmcollide` that makes `bufferLimit` infinite, the band test passes, and
`factor = (...) * (Infinity - dist) / (Infinity * runSpeed * dist)` is `Infinity/Infinity`
— NaN into both accelerations.

Two drones of the same team at rest is not an exotic state; it is what a drone swarm
looks like the moment it stops.

**Ported as-is** in `Collide`, pinned by `TestDroneCollisionBufferIsInfiniteWhenBothAreStill`.

---

## 21. `mooncollide` reverses the tangential velocity as well as the normal one

`js-src/server/miscFiles/collisionFunctions.js:328-329`

```js
bounce.velocity.x = newVelocityMagnitude * Math.sin(Math.PI - relativeVelocityAngle - angleFromMoonToBounce);
bounce.velocity.y = newVelocityMagnitude * Math.cos(Math.PI - relativeVelocityAngle - angleFromMoonToBounce);
```

`x` takes the sine and `y` the cosine, which is the opposite of the usual convention.
Expanding it with `t` for the tangential component and `p` for the perpendicular one,
and `A` for the angle from the moon to the body, gives

    (p·cos A + t·sin A,  p·sin A − t·cos A)

where a reflection off the surface is

    (p·cos A − t·sin A,  p·sin A + t·cos A)

The normal component is reflected correctly; the tangential one comes out negated. A
body glancing off a round wall has its sideways drift reversed as well as its approach,
so it does not skim the wall — it comes back the way it arrived.

**Ported as-is** in `Mooncollide`, pinned by the three `mooncollide.*` golden vectors.

---

## 22. Five properties are read in collision code and assigned nowhere

`js-src/server/miscFiles/collisionFunctions.js:401,402,512,520,583,590` and
`js-src/server/loaders/global.js:334,371`

Each of these gates real behaviour and is permanently falsy, because nothing in
`js-src` ever writes it:

| Read | Written | Effect of it being dead |
|---|---|---|
| `bounce.god` (`:401`) | nowhere (`godmode` is the real field) | a maze wall ignores godmode |
| `bounce.passive` (`:401`, `:463`, `:512`, `:583`) | only on `fakeBody` at `entity.js:170`, a mockup helper | passive bodies are not exempt from maze walls |
| `bounce.isInvulnerable` (`:512`, `:520`, `:583`, `:590`) | nowhere — it is a *parameter* name in `bindToMaster` (`entity.js:625`), not a property | damaging and healing maze walls hit invulnerable turrets |
| `bounce.store.noWallCollision` (`:402`) | nowhere | the opt-out has no way to be switched on |
| `my.reverseTargetWithTank` (`global.js:334`, `:371`, `controllers.js:285`) | nowhere | the ternary always picks `reverseTank` |

`bounce.god` is the interesting one: the same line reads `bounce.isArenaCloser` and
`bounce.master.isArenaCloser`, both of which are real, so the author clearly meant
`godmode` and the typo has been invisible ever since.

**Ported as-is** — each read is either omitted with a comment at the call site or wired
to a permanently-false field, so the ported branch structure still matches.

---

## 23. `move()` with no argument writes `null` into the action timestamps

`js-src/server/game/entities/entity.js:655,674,956` and
`js-src/server/loaders/global.js:237,243-244`

```js
move(now) { global.runMove(this, now ?? null) };
global.runMove = (my, now = Date.now()) => { ... }
```

A default parameter fires for `undefined` and not for `null`. `move()` with no argument
passes `undefined` into `now`, `undefined ?? null` is `null`, and `runMove` receives
`null` — so the default `Date.now()` never applies. Two lines later:

```js
if (gactive && my.lastMovementTime) my.lastMovementTime = now;
if (my.control.fire && my.lastFiredTime) my.lastFiredTime = now;
```

both write `null`. The two call sites are `bindToMaster` (`:655`) and
`unbindFromMaster` (`:674`), so any tank that has had a turret bound or unbound while
moving loses both timestamps permanently — the `&& my.lastMovementTime` guard means
they are never written again once they are falsy.

The consequence is at `global.js:209`: `Math.max(null, null)` is `0`, so
`now - lastAction >= Config.upgrade_delay` is true forever and the stand-still timer
before an upgrade stops applying to that tank.

**Ported as-is.** `Entity.LastMovementTime` is an `int64`, so `null` is represented as
`0`, which is falsy in both languages and therefore behaves identically at every read
site. `Sim.RunMove` documents that those two call sites pass `0`.

---

## 24. `FACING_TYPE: "manual"` with no `ANGLE` sets facing to NaN

`js-src/server/loaders/global.js:396-398`

```js
case "manual":
    if ((my.facingTypeArgs.angle ?? 0) !== my.facing) {
        my.facing = my.facingTypeArgs.angle;
    }
```

The guard defaults an absent angle to `0`; the assignment does not. So an entity with
`FACING_TYPE: ["manual"]` and no `ANGLE`, whose facing is anything other than exactly
`0`, assigns `undefined` to `facing`, and the wrap at the bottom of `runFace`
(`(facing % TAU + TAU) % TAU`) turns that into `NaN`. `vfacing` follows. Facing is not
covered by `antiNaN`, which only watches position, velocity and acceleration, so the
NaN persists and goes out on the wire.

**Ported as-is** in `Sim.RunFace`, pinned by the `runFace.manual.noAngle` golden vector.

---

## 25. A corner hit on a bouncy maze wall multiplies acceleration instead of reflecting it

`js-src/server/miscFiles/collisionFunctions.js:595-596`

```js
const dot = bounce.accel.x * nx + bounce.accel.y * ny;
bounce.accel.x += (bounce.accel.x - 2 * dot * nx) * bounceFactor;
bounce.accel.y += (bounce.accel.y - 2 * dot * ny) * bounceFactor;
```

`(a - 2·dot·n)` is the reflected acceleration, and `bounceFactor` is 18.5. Adding
`18.5 ×` the reflection to the acceleration that is already there gives roughly
`19.5 ×` the original magnitude rather than a bounce; the face branch fifty lines above
uses the same constant as a flat `±18.5`, which suggests `=` was meant here rather than
`+=`. Two corner hits in consecutive ticks put the body's acceleration into the
hundreds.

**Ported as-is** in `Mazewallcustomcollide`, pinned by the
`mazewallcustom.corner.walltype4` golden vector.

---

## 26. The assembler merge reads `parent.id` before checking `parent` for null

`js-src/server/game/index.js:139-142`

```js
if (
    target2.assemblerLevel >= 10 || target1.assemblerLevel >= 10 ||
    target1.isDead() || target2.isDead() ||
    (target1.parent.id !== target2.parent.id &&
        target1.parent.id != null &&
        target2.parent.id != null)
) {
```

The two `!= null` tests are meant to tolerate a missing parent, but the comparison that
runs first already dereferences `.id` on both. `destroy()` sets `instance.parent = null`
for every child of a destroyed entity (`entity.js:1271`), so two assemblers whose parent
has just died throw a `TypeError` here. `gameloop()` is wrapped in a `try/catch` that
calls `this.stop()`, so the whole room stops ticking.

**Not ported literally.** `docs/architecture.md` forbids panicking in simulation code, so
`Sim.assemblerMerge` treats a stale parent handle as an absent id and carries on. This is
the one place in this module where the port deliberately does not reproduce the JS
behaviour; it is called out at the function.

---

## 27. `advancedcollide` computes two values it never reads

`js-src/server/miscFiles/collisionFunctions.js:213-216,278`

`pen._me.sqr` and `pen._n.sqr` are `Math.pow(penetration, 2)` and are read nowhere —
only the `sqrt` halves are used. `reductionFactor` is assigned
`Math.min(deathFactor._me, deathFactor._n)` and is likewise never read; the impulse
scales by the two death factors separately, further down.

Harmless, but worth recording: `reductionFactor` looks like it was meant to be the
impulse scale and was superseded, so anyone reading the damage block for the first time
will spend a while looking for its use.

**Not ported.** Neither has a side effect.

---

## 28. Not a defect, but a trap: `getDamage`'s `capped` argument defaults to **true**

`js-src/server/game/entities/healthType.js:17`

```js
getDamage(amount, capped = true) { ... }
```

Every call in `entity.js` and most of `collisionFunctions.js` passes one argument and so
gets the capped behaviour, which clamps the returned damage to the pool's current
amount. Only `advancedcollide`'s two death-factor probes pass `false` explicitly:

```js
let stuff = my.health.getDamage(damageToApply._n, false);
```

A Go port has no default arguments, so every call site has to name the value, and
getting it backwards is silent: it only shows up on an overkill hit, where the uncapped
form reports far more damage than the pool can absorb and both death factors — and
therefore the collision impulse — come out wrong.

Recorded here because the first cut of `internal/sim` did get it backwards, and the
golden vector that caught it (`mortality.overkill`) had to be added on purpose. Anyone
porting `gun.js` or the controllers will meet the same default.

---

## 29. `perspective` mutates the shared flattened photo before its first `slice`

`js-src/server/game/network/sockets.js:1387-1389`

```js
perspective(e, player, data) {
    if (player.body != null) {
        if (e.alpha < 1 && !e.limited && !player.body.settings.canSeeInvisible) {
            data[18] = Math.round(255 * this.getInvisEntityAlpha(player, e));
        }
        if (player.body.id === e.master.id) {
            data = data.slice(); // So we don't mess up references to the original
```

`data` is `entity.flattenedPhoto`, cached on the entity at `sockets.js:1611` and shared by
every viewer in the tick. The first branch writes straight into it. The comment about not
messing up the original is on the *second* branch, one statement too late; branches three
and four copy as well, so the invisibility write is the only one that does not.

**It is observable, and not rarely.** The value written is one viewer's, computed from that
viewer's distance to the entity (`getInvisEntityAlpha`, `sockets.js:1362`). Any later
viewer that re-enters the same branch overwrites it with its own and comes out correct, so
two living players do not leak into each other. What leaks is a viewer that skips the
branch entirely, and the largest such group is **viewers with no body**: `perspective`
returns immediately when `player.body == null` (`sockets.js:1386`), handing back the shared
array untouched. Every player between dying and respawning is in that state,
`status.readyToBroadcast` stays true across a death, and `gazeUpon` keeps running for them
(`game/index.js:281`). So a dead player sees invisible entities at whatever alpha the last
living viewer happened to compute.

Driven against the real `perspective` (`tools/gen-view-vectors.js`): an entity with
`alpha 0.4` flattens with `data[18] = 102`. A viewer 150 units away turns that into 159
**in the shared cache**, and a body-less viewer processed next ships 159. Move the first
viewer to 250 units and the same spectator ships 121 instead. What a spectator sees is
decided by where somebody else is standing.

The blast radius is one tick: `takeSelfie` nulls `flattenedPhoto` before rebuilding the
photo (`entity.js:962-963`), so the corruption does not accumulate.

**Ported as-is** in `Perspective` (`internal/net/view.go`), which writes into the shared
cache before appending, and pinned by `TestPerspectiveLeaksAlphaAcrossViewers` against the
Node values above.

---

## 30. The per-socket traffic monitor never runs, and its counter is never incremented

`js-src/server/game/network/sockets.js:747`, `:765`, `:776`, `:2140`

`traffic(socket)` is a factory: it returns the closure that does the work.

```js
traffic(socket) {
    let strikes = 0;
    return () => { ... };
}
```

The only caller is

```js
let trafficMonitoring = setInterval(() => this.traffic(socket), 1500);
```

which calls the **factory** every 1500 ms and throws the closure away. The body never
executes, so neither the heartbeat kick at `:760` nor the request-volume kick at `:771`
fires from this timer.

It is dead twice over: `socket.status.requests` is never incremented anywhere in
`js-src`. It is read at `:765` and reset at `:776`, both inside the closure that never
runs, so even a corrected `setInterval` could not make the volume check fire.

Heartbeat enforcement is not lost — the 250 ms broadcast loop does the same check at
`sockets.js:2005`, and that one does run. What is absent is the request-rate limit, so a
connected client can send as fast as it likes and nothing counts it.

**Ported, but not wired.** `Manager.Traffic` (`internal/net/socket.go`) is the closure's
body, so the check stays greppable against the JS; nothing calls it, which matches a server
where it never runs. `Manager.Apply` does increment `Status.Requests` — harmless, since
nothing reads it unless a room opts in, and it makes the dead check testable.

---

## 31. `getInvisEntityAlpha`'s `canSeeInvisible` argument is never passed

`js-src/server/game/network/sockets.js:1362`, `:1388`, `:1401`

```js
getInvisEntityAlpha(player, other, canSeeInvisible = false) {
    ...
    if (canSeeInvisible) {
        alpha = other.alpha ? other.alpha * 0.55 + 0.45 : 0.45;
    } else if (!other.settings.fullyInvisible) {
        // distance-based fade
```

Both call sites pass two arguments, so the parameter is always `false` and the
`0.55/0.45` branch is unreachable. The second call site is the telling one:

```js
if (player.body.settings.canSeeInvisible) {
    data = data.slice();
    let alpha = this.getInvisEntityAlpha(player, e);   // the flag it exists for
```

A player with `CAN_SEE_INVISIBLE_ENTITIES` therefore gets the ordinary distance fade
rather than the flat 0.45 floor the parameter was written to give them, and an entity with
`FULL_INVISIBLE` stays at its raw alpha for them as well. Measured against the real
function: an entity at `alpha 0.4`, 150 units away, resolves to `0.625` on the live path
and to `0.67` with the flag passed.

The same function carries a dead store two lines below: `if (!other.alpha) alpha = 1` at
`:1370` is overwritten by every path that follows it.

**Ported as-is**: `GetInvisEntityAlpha` keeps the parameter, and both call sites in
`Perspective` pass `false`. `TestGetInvisEntityAlphaMatchesNode` pins all ten cases,
including the two the live code cannot reach.

---

## 32. `perspective`'s invisibility write assumes the full layout and can extend the array

`js-src/server/game/network/sockets.js:1387-1389` vs `:1291-1304`

The invisibility branch writes `data[18]` guarded only by `!e.limited`, which excludes
bullets but not turrets or props. A turret's record is twelve fields
(`sockets.js:1291-1304`) followed by the gun count, the guns and the turret count — so a
turret with no guns flattens to fourteen elements and index 18 does not exist.

In JavaScript that assignment does not fail. It extends the array, leaving indices 14-17 as
holes, and those reach `protocol.encode` as `undefined`, which throws the bare string
`"Unencodable data type"` (`fasttalk.js:112`). Nothing wraps `talk()`
(`sockets.js:2063-2067`), so the throw leaves `gazeUpon`, leaves `gameloop`, and lands in
the `catch` at `game/index.js:518` — which calls `this.stop()`. **One invisible gunless
turret in somebody's field of view stops the room.**

It needs a bonded turret that is also a top-level visible entity, with `DRAW_SELF` and
`alpha < 1`. Turrets are in `entities` and do get photographed (`turretEntity.js:275`), so
the path exists; whether any current definition reaches it was not established. With one or
more guns the record is long enough, and the write lands inside gun 0's fields instead —
corrupting that gun's `borderless` rather than throwing.

This is the same layout blindness as `docs/protocol.md` section 2.4 #11, which is about
`data[10]` in the autospin branch; that one is always in bounds because every layout has at
least eleven fields.

**Not reproducible as-is in Go**, and that divergence is deliberate: a slice write past
`len` panics, and taking the room down with a panic is worse than the JS outcome rather
than faithful to it. `Perspective` returns `ErrPhotoIndexOutOfRange` at exactly the point
the JS would create the hole, `GazeUpon` refuses the frame, and
`TestPerspectiveRefusesShortRecord` pins it. The JS stops the room; the Go port drops one
frame and names the reason.

---

## 33. `nearestDifferentMaster`/`healTeamMasters` pass an argument their own `wouldHitWall` method ignores, so the "wall now blocks the lock" recheck never fires

`js-src/server/miscFiles/controllers.js:473-474,541` (and the identical `617-618,685`
for `healTeamMasters`)

```js
wouldHitWall(entity) {
    if (!this.lockThroughWalls) return wouldHitWall(this.body, entity);
    ...
}
...
if (
    ... ||
    this.wouldHitWall(this.body, this.targetLock) // Very expensive
)
```

The method takes exactly one parameter, `entity`. The call site passes two. JavaScript
does not error on extra arguments — the first (`this.body`) binds to `entity` and the
second (`this.targetLock`, the value the check is obviously supposed to be about) is
silently discarded. Inside the method this evaluates to the free
`wouldHitWall(this.body, this.body)`: a zero-length ray checked against every wall, which
never reports a hit except in the astronomically unlikely case that the body's own
position sits exactly on a wall edge.

Verified against the real classes with a wall placed directly between a body at `(0,0)`
and a locked target at `(100,0)`: the call the class actually makes,
`wouldHitWall(this.body, this.targetLock)`, returns `false`; the evidently-intended
single-argument call `wouldHitWall(this.targetLock)` returns `true` for the same wall.
So "drop the target lock if a wall has since moved into the line of fire" is dead code in
the live server — a locked target stays locked through a wall, every time.

**Ported as-is**: `ctrl.wouldHitWallBuggySelfCheck` reproduces the same free-function call
with `me == enemy`, and both `thinkNearestDifferentMaster` and `thinkHealTeamMasters` call
it instead of the (evidently intended, but never actually reachable) real recheck against
`st.TargetLock`'s position.

---

## 34. `addController`'s in-place splice skips the second of two same-kind new controllers, so a duplicate slips through the dedup

`js-src/server/game/entities/entity.js:133-146`

```js
addController(newIO) {
    if (!Array.isArray(newIO)) newIO = [newIO];
    for (let oldId = 0; oldId < this.controllers.length; oldId++) {
        for (let newId = 0; newId < newIO.length; newId++) {
            let oldIO = this.controllers[oldId];
            let io = newIO[newId];
            if (io.constructor === oldIO.constructor) {
                this.controllers[oldId] = io;
                newIO.splice(newId, 1);
            }
        }
    }
    this.controllers = this.controllers.concat(newIO);
}
```

The inner loop's bound, `newIO.length`, is re-read every iteration, and `newId` is never
adjusted after `newIO.splice(newId, 1)` shortens the array out from under it. Passing two
*new* controllers of the same kind together, against one *existing* controller of that
kind, reproduces the skip: `newId=0` matches, replaces `this.controllers[oldId]` in place,
and splices itself out — sliding the second new spec down into index 0. The loop then
advances to `newId=1`, which `1 < newIO.length` (now `1`) rejects, so the second spec is
never compared against `oldIO` at all in this `oldId` pass. It survives to the trailing
`this.controllers.concat(newIO)` and is appended as a genuine second controller of a kind
`addController` was supposed to allow only one of.

**Ported as-is** in `internal/ctrl/table.go`'s `Table.Add`, which is a literal port of the
same nested-loop-plus-splice (Go's `append(newIO[:newID], newIO[newID+1:]...)` for the
JS's `splice`), reproducing the identical skip. `TestTableAddSpliceSkipBug` drives exactly
this scenario and asserts the caller-visible duplicate-kind attachment, not a clean dedup.

---

## 35. `disableOnOverride`'s `initialAlpha` latch is a truthy check, so a body whose alpha starts at exactly 0 never latches and re-arms every tick

`js-src/server/miscFiles/controllers.js:1184`

```js
think(input) {
    if (!this.initialAlpha) {
        this.initialAlpha = this.body.alpha;
        this.targetAlpha = this.initialAlpha;
    }
```

The intent is "latch the starting alpha once, the first time `think()` runs" — but the
guard tests truthiness, not whether `initialAlpha` has been set yet. An entity whose alpha
happens to be exactly `0` on the first call latches `0`, which is falsy, so `!0` is `true`
on every subsequent call too: the body never leaves the "just latched" state, and both
branches below (`this.pacify`/`!this.pacify`) keep re-evaluating against a same-tick
`initialAlpha` instead of a value fixed at construction. Verified against the real class:
constructed with `alpha: 0`, `initialAlpha` reads back `0` (falsy) after both the first and
a second `think()` call, proving it never latches.

Harmless for the common case (most bodies do not start at exactly alpha 0), but the
pacify/release logic that depends on a stable `initialAlpha` silently never stabilizes for
the ones that do.

**Ported as-is** in `thinkDisableOnOverride` (`internal/ctrl/think_aim.go`): the Go
condition is `st.DisableInitialAlpha == 0`, a direct truthy-check equivalent, not a
`Has`-flag — see that function's doc comment.

---

## 36. `whirlwind` reads `AI_SETTINGS.SPEED` with no default, permanently poisoning the body's angle with `NaN` if it was never set

`js-src/server/miscFiles/controllers.js:1096`

```js
this.body.angle += (this.body.skill.spd * 2 + this.body.aiSettings.SPEED) * Math.PI / 180;
```

Every other numeric read off `aiSettings` in this file is defaulted (`?? 0` or similar);
this one is not. An entity whose definition never sets `AI_SETTINGS.SPEED` has
`aiSettings.SPEED === undefined`, and `undefined + number` is `NaN`. Since this line is
`+=` onto `this.body.angle` itself, one `NaN` tick poisons `angle` for the rest of the
entity's life — every subsequent `think()` computes `NaN + anything = NaN` forever.
Verified against the real class: constructing with `aiSettings: {}` (no `SPEED` key) and
calling `think()` twice leaves `body.angle` at `NaN` both times.

**Ported as-is** in `thinkWhirlwind` (`internal/ctrl/think_motion.go`): `AISettings.HasSPEED`
is read with no fallback other than `math.NaN()`, matching the JS's unguarded read exactly
rather than defaulting it to something that would never `NaN`.

---

## 37. `DRAW_FILL`'s own default check reads a lowercase key that no data sets, so the non-null branch is dead

`js-src/server/game/entities/gun.js:59`

```js
this.drawFill = PROPERTIES.DRAW_FILL == null ? true : PROPERTIES.drawFill;
```

The ternary's condition tests the correctly-cased `DRAW_FILL`, but the value it uses when
that check fails is the *lowercase* `drawFill` -- a key no real `GUNS[].PROPERTIES` block
ever sets (every definition uses the upper-case form). So whenever `DRAW_FILL` actually is
set, this line reads `PROPERTIES.drawFill`, which is `undefined`, and assigns `undefined`
rather than the real value. The line's net effect, for every gun in the shipped data,
reduces to `this.drawFill = true` unconditionally.

`gun.js:70` re-checks the correctly-cased key a few lines later (`if (PROPERTIES.DRAW_FILL
!= null) this.drawFill = PROPERTIES.DRAW_FILL;`) and is what actually applies a
`DRAW_FILL: false` gun. So the visible behavior is correct by the time the constructor
finishes -- this line is a dead intermediate step, not a bug a player would ever notice --
but a reader tracing the constructor top-to-bottom sees line 59 promise to honor
`PROPERTIES.drawFill` and would reasonably expect a lower-case key to work.

**Ported as-is** in `internal/guns/gun.go`'s `NewGun`: `g.DrawFill = true` is set
unconditionally at the point matching line 59, then the correctly-cased
`props.DrawFill.Get()` check (matching line 70) can still override it.
`TestNewGunDrawFillAlwaysTrue` (`gun_test.go`) pins the net outcome.

---

## 38. `flattenDefinition` overwrites `COLOR` wholesale, while every other merge path blends it channel by channel

`js-src/server/lib/util.js:175-197` vs `js-src/server/miscFiles/color.js:34-46`

```js
for (let key in definition) {
    if (key === "PARENT") continue;
    if (key === "BODY") { continue; }
    output[key] = definition[key];
}
```

Every other place a `COLOR` block reaches an entity -- `Entity.prototype.define`,
`Color.prototype.interpret` itself -- merges it channel by channel: `BASE`, `HUE_SHIFT`,
`SATURATION_SHIFT`, `BRIGHTNESS_SHIFT` and `ALLOW_BRIGHTNESS_INVERT` are each applied
independently, so a later level that only sets `HUE_SHIFT` leaves an earlier level's
`BASE` in place. `flattenDefinition` is the one merge path that does not: it is a generic
`for...in` copy with no special case for `COLOR`, so an entire `COLOR` object at one
PARENT level (or one element of a multi-element TYPE array) replaces whatever an earlier
level's `COLOR` had contributed, discarding any channel the later one does not mention.

This runs on every bullet's TYPE list once, at gun construction (`gun.js:153`,
`setBulletType`), before the bullet type is ever flattened into `bulletEntity`'s own
`define`. Checked directly against `gen/definitions.json`: 61 named bullet types and 145
inline bullet TYPE objects set `COLOR`, so a bullet type with a `PARENT` chain where an
ancestor sets, say, `HUE_SHIFT` and the child sets only `BASE` loses the ancestor's hue
shift entirely once flattened -- the child's `COLOR: {BASE: "..."}` replaces the whole
object, not just the base channel.

**Ported as-is** in `internal/guns/flatten.go`'s `flattenInto`: `if def.Color.Kind !=
defs.ColorNone { out.Color = def.Color }` is a wholesale replace, deliberately not the
per-channel `applyColorSpec` helper (`color.go`) used everywhere else in this package.
`TestFlattenColorWholesaleOverwrite` (`flatten_test.go`) pins the divergence directly: a
parent's `HUE_SHIFT` does not survive a child's string-form `COLOR`.

---

## 39. Whether a bullet forces the heavier "no entity limit" spawn path depends on its TYPE list's own TURRETS/ON, not on what it inherits through PARENT

`js-src/server/game/entities/gun.js:146-172`

```js
setBulletType(masterLabel, label, list) {
    let noentitylimit = false;
    for (let i = 0; i < list.length; i++) {
        let node = ensureIsClass(list[i]);
        if (node.TURRETS != null || node.ON != null) noentitylimit = true;
    }
    this.bulletType = util.flattenDefinition(list);
}
```

The `noentitylimit` scan walks the TYPE list's own elements and asks each one directly for
`TURRETS`/`ON` -- it does not resolve that element's own `PARENT` chain first the way
`flattenDefinition` (called immediately after, on the same list) does. So a bullet type
that only *inherits* `TURRETS` or `ON` from a parent definition, without setting either
directly on the TYPE element itself, does not set `noentitylimit` here, even though
`this.bulletType` (the flattened result, fully `PARENT`-aware) ends up carrying the
inherited `TURRETS`/`ON` anyway a few lines later.

`noentitylimit` decides which JS class `fire()` spawns as (`new Entity` vs `new
bulletEntity`, `gun.js:381-388`) -- the two constructors that respectively do or do not
know how to read `TURRETS`/`ON`/`MAX_CHILDREN`/`MAX_BULLETS`/`LEVEL_CAP` off the flattened
definition (`entity.js`'s `define` vs `bulletEntity.js`'s). A bullet in this state gets a
fully-populated `TURRETS` block on `this.bulletType` that the class it actually gets
constructed as (`bulletEntity`, since `noentitylimit` stayed false) has no code path to
ever read -- the inherited turrets are silently unreachable.

**Ported as-is** in `internal/guns/flatten.go`'s `setBulletType`: the `noEntityLimit` scan
calls `derefType` on each TYPE element directly and checks only that element's own
`Turrets`/`On`, deliberately not recursing `Parent` the way `flattenBulletType` (called on
the same list, two lines later) does. `TestSetBulletTypeNoEntityLimitDirectOnly`
(`flatten_test.go`) pins both halves: the direct-only check missing an inherited
`TURRETS`, and the flattened result carrying it anyway.

---

## 40. `live()`'s flat-reload-rate special case is spelled with a space, so it only ever matches necro guns, never `fixedReload` ones

`js-src/server/game/entities/gun.js:233`

```js
this.cycleTimer += 1 / (this.settings.reload * speed * (this.calculator == "necro" ||
    this.calculator == "fixed reload" ? 1 : sk.rld));
```

`STAT_CALCULATOR`'s real values are unspaced (`interpret()`'s own switch, `gun.js:646-679`,
recognises `"fixedReload"`) -- there is no gun anywhere whose calculator is ever the
literal string `"fixed reload"` with a space. So the `|| this.calculator == "fixed
reload"` half of this condition can never be true, and the reload-rate side of a
`fixedReload` gun's cycle timer keeps scaling by the shooter's reload skill (`sk.rld`)
exactly like a `"default"` gun would, rather than the flat, skill-independent rate the
calculator's own name (and its `interpret()` counterpart, which *does* force
`reloadRateFactor = 1` for both `"necro"` and `"fixedReload"` correctly) clearly intends.

The asymmetry is visible in `interpret()` itself (`gun.js:670-679`): its own `case
"fixedReload":` and `case "necro":` both set `this.reloadRateFactor = 1` correctly,
spelled right. Only this one line, five hundred bytes away in the same file, has the
typo -- strong evidence the author meant to match the calculator name and mistyped it
once.

**Ported as-is** in `internal/guns/fire.go`'s `Live`: `rateIsFlat := g.Calculator ==
CalcNecro || g.Calculator == "fixed reload"` reproduces the exact unreachable string
literal rather than `CalcFixedReload`, so a `fixedReload` gun's cycle timer keeps scaling
by `sk.Rld` in this port too, matching the live server. Pinned by `TestLiveCycleTimerHeld`
(`fire_test.go`) against real Node output, using a gun whose calculator this bug leaves at
the skill-scaled rate.

---

## 41. `getTracking`'s speed/range estimate has no `?? 1` guard, unlike every other reader of the same bullet-body snapshot

`js-src/server/game/entities/gun.js:595-604`

```js
getTracking() {
    let sk = this.bulletStats === "master" ? this.body.skill : this.bulletStats;
    return {
        speed: global.gameManager.runSpeed * sk.spd * this.settings.maxSpeed * this.bulletBodyStats.SPEED,
        range: Math.sqrt(sk.spd) * this.settings.range * this.bulletBodyStats.RANGE,
    };
}
```

`interpret()`'s own final multiply pass reads the identical `this.bulletBodyStats`
snapshot with an explicit fallback: `out.speed *= this.bulletBodyStats.SPEED ?? 1`
(`gun.js:682-686`), because most bullet types' own `BODY` block does not set
`SPEED`/`RANGE` at all -- absence is supposed to mean "no adjustment," not "zero."
`getTracking` reads the same two keys with no `?? 1` anywhere, so whenever a bullet
type's `BODY` leaves them unset (the common case), `this.bulletBodyStats.SPEED`/`.RANGE`
are `undefined`, and both `speed` and `range` come out `NaN`.

Grepping `js-src` for `getTracking(` finds no caller at all -- it is not wired into any
socket message, controller, or UI-facing computation in this snapshot of the source. So
the `NaN` this produces has nowhere to be observed today; it is a real, reachable bug in
the sense that calling the method produces garbage, but an inert one in the sense that
nothing currently depends on its result. Recorded rather than silently "fixed," since a
future caller (this method reads like an unfinished client-tracking-reticle feature)
would inherit the same `NaN` on the live server.

**Ported as-is** in `internal/guns/fire.go`'s `GetTracking`: `bodySpecNumOrNaN` reads
`BulletBodyStats.Speed`/`.Range` with no fallback, matching the missing guard exactly,
while `Interpret` (`calc.go`) keeps its own `.Or(1)` on the same fields.
`TestGetTrackingNaN` (`fire_test.go`) pins the NaN outcome structurally -- there is no
live-client output to pin it against, per the point above.

---

## 42. Addendum to #13: `turretEntity.js`'s own `define()` never reads `DANGER` at all, so the bug is unreachable-by-design, not merely reset

`js-src/server/game/entities/turretEntity.js:109-227` (the method `o.define(type[j])` in
#13's quoted block, `:190-206`, calls into)

Entry #13 above documents `type.TURRET_DANGER` being read off the array rather than an
element, making `turretDanger` always false and `o.define({DANGER: 0})` always fire when
a turret is spawned. Reading `turretEntity.js`'s own `define()` in full (the method that
both `o.define(type[j])` and the later `o.define({DANGER:0})` call, since `o` is always a
`turretEntity` instance here) shows it has no `DANGER`/`set.DANGER` handling anywhere in
its ~120 lines -- unlike `entity.js`'s `define()`, which does (`entity.js:302`, `if
(set.DANGER != null) this.dangerValue = set.DANGER;`). This block reads as a copy-paste
of `entity.js`'s own identical TURRETS-handling code (`entity.js:469-485`, for a bullet
spawning turrets under `noentitylimit`) into `turretEntity.js` (for a turret spawning
child turrets), without adapting it to the fact that `o` here is never a bare `Entity`.

The practical consequence is stronger than #13's framing of "discarding whatever danger
value its own definition chain resolved": a turret's `dangerValue` cannot be set by
**any** TYPE element's own `DANGER` field in the first place, with or without the
array/element indexing mistake -- `o.define(type[j])` would not apply it even if
`turretDanger` were computed correctly, because the method it calls never looks at the
key. The two bugs compound to the same observable outcome (every turret's `dangerValue`
is always its constructor default) but for two independent reasons, only one of which
#13 describes.

**Ported as-is** in `internal/guns/turret.go`'s `SpawnTurrets`: `t.DangerValue = 0` is set
explicitly and unconditionally, matching the observable outcome directly rather than
relying on a fresh entity's zero-value default to happen to agree with it -- see that
line's own comment for the full mechanism. `TestSpawnTurretsVulnerableAndDanger`
(`turret_test.go`) drives a TYPE element that sets `DANGER: 99` and confirms the turret
still comes out at 0.

## 43. `makeRelic` mints Class keys from `Math.random()`, spending the global RNG stream

`facilitators.js:1337-1338`:

```js
Class[Math.random().toString(36)] = relicCasing;
Class[Math.random().toString(36)] = relicBody;
```

`makeRelic` needs two throwaway names for anonymous definitions that are only ever
reached through `TURRETS` references, and generates them by stringifying a random
number in base 36. `food.js` calls `makeRelic` 77 times, so definition loading spends
**154 draws** producing names nothing reads.

That is not merely wasteful. The server has one global `Math.random()` stream, so those
154 draws shift the position of every random number the server draws afterwards, for
the entire life of the process. A key generator has been given authority over the
world's layout: the maze, rock placement and spawn positions all land differently than
they would if the keys were named `relic0`, `relic1` — and if a future edit adds or
removes a `makeRelic` call, every one of those moves again, for a reason with no
apparent connection to any of them.

**Ported as-is, deliberately.** `internal/defs`' `burnRelicKeyDraws` consumes exactly
154 draws at the same point in the sequence. It does not generate the keys — the Go
definition table comes from a dump and has no need of them — but the draws are load
bearing and the values are not.

**How it was found.** By the end-to-end differential harness, and not before. Every
definition in the Go table was already pinned against Node and every one matched: the
table is right, and no test of the table could have seen this. What the harness saw was
`rngCalls` diverging at tick 0 — 154 of the 161 draws by which the Go setup undershot
the Node one. `tools/count-relic-draws.js` and `tools/trace-def-draws.js` (which tags
every load-time draw with the source line that made it) then attributed them exactly,
including the ordering that fixes where the burn belongs: the 65 `serverPortal` draws
occupy positions 0-64 and these 154 occupy 65-218, sequentially, not interleaved.

## 44. The food caps are not caps: a group spawn overshoots them

`game/index.js:336-345` (nest food; the plain-food branch below it is the same shape):

```js
if (this.nestFoods.length < Config.food_cap_nest) {
    const tile = ran.choose(...).randomInside();
    for (let i = 0; i < totalFoods; i++) {
        const o = spawnFoodEntity(tile, Config.food_types_nest);
        this.nestFoods.push(o);
        ...
    }
}
```

`totalFoods` was decided earlier in the same tick and is `1 + floor(random() *
Config.food_group_cap)` one time in five. The cap is tested **once**, before the loop,
so a group spawn that starts at `food_cap_nest - 1` runs to completion and leaves the
array up to `food_group_cap - 1` entries over. The overshoot is not corrected later:
nothing trims these arrays, they only shrink when a food dies.

So `food_cap_nest` is a spawn *threshold*, not a cap, and the same is true of
`food_cap`. A server operator reading the config name has no way to know this.

**Ported as-is** (`internal/room/spawn.go`'s `FoodLoop`).

**How it was found.** `TestFoodLoop_SpawnsWithinCaps` asserted a hard cap and passed
for as long as it existed. It was not a good test — it was a test that had never been
run on a stream that started a group spawn on the boundary. Correcting the unrelated
154-draw shortfall in definition loading (#43) shifted every draw the room sees, and it
failed on iteration 342 with 17 nest foods against a cap of 15. The assertion now
states the real bound and says why, which is the part that was actually missing.

The general lesson is worth keeping: a passing RNG-dependent test proves the code
survived *one* stream. Changing an unrelated draw count is a cheap, brutal way to find
out which of those tests were asserting something true and which were asserting
something that merely happened.

---

## 45. `tileClass.wall`'s spooky-theme branch references a variable that was never declared

`js-src/server/game/roomSetup/tiles/default.js` (the `wall` tileClass's `INIT`)

The wall spawned by this tile is bound to a local named `o`:

```js
let o = new Entity(loc);
o.define("wall");
...
if (Config.spooky_theme) {
    let eyeSize = 12 * (Math.random() + 0.45);
    let spookyEye = new Entity({ x: wall.x + (wall.size - eyeSize * 2) * Math.random() - wall.size / 2, ... })
```

The spooky-theme block reads `wall.x` / `wall.size`, but nothing in this INIT ever
declares a variable named `wall` — the entity is `o`. With `Config.spooky_theme` on,
every wall tile throws a `ReferenceError` the instant it initializes. Compare
`maze.js`/`labyrinth.js`/`siege.js`'s own near-identical spooky-eye blocks (entry #50's
neighbourhood in the source), all three of which name their local variable `wall` and
so do not have this problem — this file is the one place the local got named `o`
instead, most likely by copy-pasting the block from one of those three without
renaming the reference to match.

**Ported as-is** in `internal/room/tile_behaviors.go`'s `spawnWall`: with
`Tuning.SpookyTheme` set, the function returns an error at the point the JS would
throw, rather than silently skipping the decoration or panicking (panicking in
simulation code is against `docs/architecture.md`; returning an error is this port's
standard substitute for a JS throw that would otherwise crash the process).

---

## 46. The `roid` tile registers itself into the default spawn pool twice

`js-src/server/game/roomSetup/tiles/rocks.js` (the `roid` tileClass's `INIT`)

```js
INIT: (tile, room, gameManager) => {
    placeRoids(tile, room, gameManager, roidTypes),
    room.spawnableDefault.push(tile);
    room.spawnableDefault.push(tile);
}
```

(reconstructed shape; the source spaces the two pushes across a comma-expression and a
following statement, not two adjacent calls, but both execute unconditionally every
time a `roid` tile initializes.) The `rock` tileClass's own `INIT`, a few lines above in
the same file, pushes once. Nothing distinguishes a `roid` tile from a `rock` tile that
would justify double weight in the default spawn pool — `getSpawnableArea` picks a tile
uniformly at random from whichever pool it draws from, so every `roid` tile is twice as
likely to be chosen as every `rock` tile for ordinary (non-nest, non-enemy) spawns.

**Ported as-is** in `internal/room/tile_behaviors.go`'s `roidTileInit`: `ctx.Pools.RegisterDefault(t)`
is called twice, giving the tile the same doubled weight in `SpawnPools.Default`.

---

## 47. A portal room with exactly one portal tile crashes on the first teleport

`js-src/server/game/roomSetup/tiles/portal.js` (the `portal` tileClass's `TICK`)

```js
let exitport = ran.choose(portals.filter(p => p !== tile) || room.random());
```

`Array.prototype.filter` always returns an array — even an empty one — and an empty
array is truthy in JavaScript, so `|| room.random()` can never run; it is dead code
written as though `filter` could return a falsy "nothing found" value. With exactly one
portal tile in the room, `portals.filter(p => p !== tile)` is `[]`, and
`ran.choose([])` — the real `choose`, `js-src/server/lib/random.js` — is
`arr[Math.floor(Math.random() * arr.length)]`, i.e. `arr[0]` on a zero-length array,
which is `undefined`. `exitport` is `undefined`, and the very next line
(`exitport.loc`) throws a `TypeError`. Any tank crossing the room's only portal tile
crashes the room the same way entry #26's stale-parent dereference does.

**Not reproducible as-is in Go**, for the same reason as entry #26: panicking in
simulation code is against `docs/architecture.md`. `internal/room/tile_behaviors.go`'s
`portalTileTick` returns an error at the point the JS would throw (`len(candidates) ==
0`), rather than either panicking or silently inventing the `room.random()` fallback
the source's own dead code implies but never reaches.

---

## 48. `isPlayerTeam` accepts every integer, including team 0 and every positive id

`js-src/server/loaders/global.js:69`

```js
const isPlayerTeam = (team) => team < 0 || team > -11;
```

The two arms of this `||` are meant to bound a team to the ten negative player-team
slots, `-1` through `-10` — but as written, every integer satisfies at least one of
them: anything less than `-10` satisfies `team < 0`, and anything from `-10` upward
(including `0` and every positive number) satisfies `team > -11`. The only way to make
this a real range check is `&&`. `isPlayerTeam` is unconditionally `true` for any
argument, including `0`, a positive player id, and the two negative sentinels
`TEAM_ROOM` (`-100`) and `TEAM_ENEMIES` (`-101`) that it exists specifically to
exclude — `global.getWeakestTeam` and `dominator.js`'s kill-attribution both call it
expecting the sentinels to read `false`.

**Ported as-is** as `room.IsPlayerTeam`, which always returns `true`. Every caller in
this package that reads it (`GetWeakestTeam`'s live-team scan, `Domination.onDead`'s
killer filter) therefore never actually filters by team on that basis either — see
those functions' own doc comments.

---

## 49. `room.getAt` swaps which axis divides by which tile dimension

`js-src/server/game.js:444-453`

```js
getAt(location) {
    if (!this.isInRoom(location)) return undefined;
    let row = Math.floor((location.y + this.height / 2) / this.tileWidth);
    let col = Math.floor((location.x + this.width / 2) / this.tileHeight);
    return this.setup[row] ? this.setup[row][col] : undefined;
}
```

Every other place a world position becomes a grid cell — `tileEntity`'s own `loc`
getter, `room.isAt`, `randomInside`'s inverse — divides the `y` axis by `tileHeight` and
the `x` axis by `tileWidth`. This one divides `y` by `tileWidth` and `x` by
`tileHeight`, the pairing swapped. On a room with square tiles (`tileWidth ==
tileHeight`, true of every shipped `map_tile_width`/`map_tile_height` pair) the two
divisors are numerically equal and the swap has no observable effect; the bug would
only surface for a room configured with non-square tiles, which no shipped gamemode
config does.

**Ported as-is** in `internal/room/tiles.go`'s `Grid.GetAt`, including the swap, rather
than "corrected" to match `TileInstance.Loc`'s own (non-swapped) pairing — see that
function's own doc comment, and `TestGrid_GetAt_ReproducesRowColSwap`.

---

## 50. Boss-wave and mothership-corner selection use JavaScript's classic broken `Array#sort` shuffle

`js-src/server/game/index.js` (maintainloop's boss-wave pick) and
`js-src/server/game/gamemodes/scripts/mothership.js:31` (spawn corner order):

```js
selection.bosses.sort(() => 0.5 - Math.random())[i % selection.bosses.length]
...
].sort(() => 0.5 - Math.random());
```

`Array#sort`'s contract only guarantees a consistent ordering for a comparator that
defines a total order; `() => 0.5 - Math.random()` does not (it returns a different,
random sign for the same pair on every comparison the engine happens to make), so the
result is not a uniform shuffle — it is whatever bias the engine's particular sort
algorithm happens to produce from an inconsistent comparator, which is
implementation- and even data-size-dependent (V8's sort switches strategy above roughly
10 elements). This is a different, unrelated defect from entry #6's `lib/random.js`
`shuffle()`: that one is a *fixed*, well-defined (if biased) function that this port
reproduces bit-for-bit; this is a native engine primitive with no fixed algorithm to
reproduce at all — there is no Node output that "the" correct port would match, because
two runs of the real server can legitimately disagree on V8-version grounds alone.

**Not reproduced bit-exactly, by necessity rather than choice.** `internal/room/spawn.go`'s
`MaintainBosses` and `internal/room/mothership.go`'s `spawn` both draw the evidently
intended result — a uniformly random pick / a uniformly random assignment — via
`jsutil.Rand.Choose`/`.Shuffle` instead of attempting to model V8's sort. This is the
one place in this port where RNG-call-count parity with the JS was deliberately not
pursued; see both functions' own doc comments.

---

## 51. `outbreak.js`'s third zombify guard can never be true, because `!x` is never `=== 0`

`js-src/server/game/gamemodes/scripts/outbreak.js:15`

```js
if (liveEntity.defs[0].BODY || liveEntity.defs[0].DANGER || !liveEntity.defs[0].DANGER === 0) {
    liveEntity.destroy();
    return;
}
```

`!` binds tighter than `===`, so the third clause parses as `(!liveEntity.defs[0].DANGER)
=== 0` — and `!x` always produces a boolean, which strict equality never considers equal
to the number `0`, regardless of what `DANGER` holds. The clause is dead: it can never
contribute a `true` to the `||`, so the guard as a whole behaves exactly as if it read
`BODY || DANGER`, no matter what was intended for the third term.

And the two surviving clauses are dead too, for a different reason. `this.defs` holds
the *arguments* `define()` was called with, not the classes they resolved to
(`entity.js:564-565`), and for anything spawned by name that argument is a string:

```
ZOMBIFY tick=472 id=138 label=Gunner Trapper defsLen=1   d0type=string d0=gunnerTrapper BODY=undefined DANGER=undefined
```

That is `probe-drawsites.js --zombify` on a seed-1 outbreak run. `"gunnerTrapper".BODY`
is `undefined`, so is `.DANGER`, and the tank is zombified — even though the class it
names has a full `BODY` block. The guard can only ever fire for a `defs[0]` that is an
inline definition object spelling `BODY` or `DANGER` at its top level, which nothing in
the shipped data does. The three-clause guard is, in practice, unreachable in its
entirety.

**Ported as-is** in `internal/room/outbreak.go`'s `Zombify`, which now reproduces
nothing of the guard and says why. An earlier version of this port resolved the class
name and read `BODY` off the *resolved* chain, which fires for every tank — so the Go
side destroyed the corpse where Node grew a zombie from it. That is the shape to watch
for when porting a guard: the JS reads a property off a value, and the port reads it
off what that value *means*.

---

## 52. `dominator.js` declares a `won` field that is never used and uses a `gameWon` field that is never declared or reset

`js-src/server/game/gamemodes/scripts/dominator.js`

```js
defineProperties() {
    this.teamcounts = {};
    this.won = false;
    this.gameActive = false;
    this.neededToWin = 4;
}
...
if (newTeam !== TEAM_ENEMIES && this.teamcounts[newTeam] >= this.neededToWin && !this.gameWon) {
    this.gameWon = true;
    ...
}
...
reset() {
    this.gameActive = false;
    this.defineProperties();
}
```

`this.won` is assigned in `defineProperties()` and never read or written anywhere else
in the file — dead state. `this.gameWon`, the field the win check and win-broadcast
guard actually use, is never assigned in `defineProperties()` at all, so it starts
`undefined` (falsy, which happens to make the first check behave as intended) — but
because `reset()` only calls `defineProperties()`, `gameWon` is never cleared once a
game has been won. A `Domination` object that has already produced one winning team
silently refuses to ever announce a second one, even after `reset()`, for the rest of
the process's life. In practice this is masked by the room closing shortly after a win,
but the two fields read as a single one that was renamed partway through writing the
file, with the `defineProperties()` reset accidentally left pointed at the old name.

**Ported as-is** in `internal/room/dominator.go`: `Domination.gameWon` is the only field
kept (the dead `won` carries no behaviour to reproduce), and `Reset` deliberately does
not clear it, matching the source's own never-reset behaviour — see that field's doc
comment.

## 53. `GUN_STAT_SCALE` is read only by `Entity.prototype.define`, and no shipped definition puts it anywhere that define can see

`js-src/server/game/entities/entity.js:426` and `:709`

```js
if (set.GUN_STAT_SCALE) this.gunStatScale = set.GUN_STAT_SCALE;
```

The setter behind that line is real work — it folds the scale into every gun's
`shootSettings` via `combineStats`, re-derives `trueRecoil` and re-runs `interpret()`:

```js
set gunStatScale(gunStatScale) {
    if (!Array.isArray(gunStatScale)) gunStatScale = [gunStatScale];
    for (let gun of this.guns.values()) {
        if (!gun.shootSettings) continue;
        gun.shootSettings = combineStats([gun.shootSettings, ...gunStatScale]);
        gun.trueRecoil = gun.shootSettings.recoil;
        gun.interpret();
    }
}
```

The definitions use the key heavily. There are **419 sites** carrying it, and every one
of them is in a place `Entity.prototype.define` never looks:

| where the key sits | sites |
| --- | ---: |
| `TURRETS[].TYPE[]` | 337 |
| `GUNS[].PROPERTIES.TYPE[]` | 82 |
| anywhere `define` reads `set` from (top level, or a `PARENT` entry) | **0** |

A `TURRETS[].TYPE[]` entry is handed to `new turretEntity(...)` and then to
*turretEntity.js's* `define` (turretEntity.js:109), a different and much smaller merge —
and it has no `GUN_STAT_SCALE` branch. A `GUNS[].PROPERTIES.TYPE[]` entry is handed to a
bullet at fire time and goes through `bulletEntity.js`'s `define` (bulletEntity.js:107),
which has no such branch either. `entity.js:426` is the only reader in the tree.

So every one of those 419 scales is inert. `celestials.js:95`'s cruiser turret asks for
`{health: 1.2, damage: 1.3, speed: 1.1, maxSpeed: 1.1, resist: 1.05}` and gets none of
it; `dreadv2.js:884`'s missile asks for `{recoil: 0.6}` and fires at full recoil. This is
the same shape of defect as #11 (`PROPS`): a key the data authors clearly believe in,
wired to a reader that the data can never reach.

Note the difference from #13/#42, though. `DANGER` is unreachable because the *turret*
path drops it; here the turret and bullet paths drop it too, but the entity path that
does read it is never given the key by any shipped definition. Adding the branch to
`turretEntity.prototype.define` would switch on 337 balance changes at once, so this is
not a one-line fix even though it looks like one.

**Ported as-is.** `internal/define` implements `entity.js:426`'s branch faithfully
(`applyGunStatScale` in `internal/define/apply.go`, including the `if (set.X)` truthiness
test rather than `!= null`, so a `0` would also be ignored), and `internal/guns`'
turret and bullet paths do not. The Go behaviour therefore matches: nothing in the
shipped table scales a gun this way.

**How it was found.** By instrumenting the live table rather than reading it. Every
`GUN_STAT_SCALE` value object in `global.Class` was replaced with a read-recording
accessor after the real loader had built the table, and then the real
`Entity.prototype.define` and the real `turretEntity.prototype.define` were run over all
2,492 definitions. Result: **224 reads, 0 of them from anything under
`js-src/server/game/entities`** — every read was the harness's own serialisation walk.
`Entity.prototype.define.toString()` contains the token; `turretEntity.prototype.define`'s
and the bullet's do not.

## 54. `Class.rcs` names a controller that does not exist, so the definition throws if anything ever spawns it

`js-src/server/lib/definitions/groups/turrets.js:906-921`

```js
// RCS (for space)
Class.rcs = {
    PARENT: 'genericTank',
    LABEL: "RCS Thruster",
    INDEPENDENT: true,
    CONTROLLERS: ['rcs'],
    ...
}
```

There is no `ioTypes.rcs`. `ioTypes` has 33 members and none of them is named anything
like it. `Entity.prototype.define` reaches `new ioTypes[io[0]](...)` at entity.js:224,
gets `TypeError: ioTypes[io[0]] is not a constructor`, logs
`Controller "rcs" was attempted to be gotten but does not exist!` and rethrows
(entity.js:226-227). The definition cannot be applied to anything.

Two things make this survivable in the shipped game rather than a crash:

- Nothing references `rcs`. It is not a `PARENT`, not a `TURRETS[].TYPE`, not in any
  spawn table or gamemode — a whole-tree search for the word finds only its own two
  lines. It is reachable only through an admin spawn or a console `define("rcs")`.
- The throw is not caught anywhere above. If someone does spawn it, the entity has
  already had its whole `PARENT` chain applied and is left half-defined, and whatever
  was driving the spawn dies with the exception.

It is the *only* such definition: sweeping every `CONTROLLERS` array in the loaded table
against `ioTypes` finds exactly one missing name, `rcs`, used by exactly one definition,
`rcs`.

**Ported as-is.** `internal/define`'s `applyControllers` returns an error naming the
unknown controller, which is the same refusal at the same point. `Class.rcs` is
consequently the one definition of the 2,492 that neither Node nor Go can define, and the
golden-vector test asserts that both sides refuse it rather than exempting it.

**How it was found.** By the golden-vector run over all 2,492 definitions: it was the one
definition the corpus generator recorded as unresolvable, and the Go side independently
refused the same one for the same reason. The `ioTypes` sweep above then confirmed it is
unique.

---

## 55. `internal/defs` resolved every turret with `Entity.prototype.define`, but a turret is a `turretEntity` and gets a different define

`js-src/server/game/entities/entity.js:469-483`, `js-src/server/game/entities/turretEntity.js:3-86,109-227`

This one is a defect in the port, not in the JS, and it is recorded here because the JS
is what makes it easy to get wrong: `entity.js`'s TURRETS block reads as if it were
defining an entity.

```js
o = new turretEntity(def.POSITION, this, this.master),
type = Array.isArray(def.TYPE) ? def.TYPE : [def.TYPE];
for (let j = 0; j < type.length; j++) o.define(type[j]);
```

`o` is a `turretEntity`, so `o.define` is `turretEntity.js:109`, not
`Entity.prototype.define`. It is a **third** merge algorithm alongside `define` and
`defineSplit`, and it reads about a third of the keys:

    LAYER index NAME LABEL ANGLE DISPLAY_NAME TYPE WALL_TYPE MIRROR_MASTER_ANGLE
    INDEPENDENT SMOOTHNESS SHAPE COLOR CONTROLLERS FACING_TYPE defineLevelSkillPoints
    RECALC_SKILL EXTRA_SKILL MAX_CHILDREN HAS_NO_RECOIL AI GUNS SIZE TURRETS BODY

and nothing else. No `DANGER`, `GLOW`, `ALPHA`, `INVISIBLE`, `VALUE`, `SKILL`,
`SKILL_CAP`, `LEVEL`, `UPGRADES_TIER_*`, `ON`, `NECRO`, `SHAKE`, `SYNC_WITH_TANK`,
`MOTION_TYPE`, `TEAM`, `VARIES_IN_SIZE`, and none of the twenty-odd `settings.*` keys
`entity.js` writes. `SIZE` is a plain assignment with no `squiggle` multiply and no
`coreSize` latch. Two keys go the other way and are turret-only: `MIRROR_MASTER_ANGLE`
and `SMOOTHNESS`, which `entity.js`'s define never reads.

Its constructor differs too. `turretEntity.js:36` runs `this.define("genericEntity")`
before any TYPE is applied, `:50` prefixes the bond's label onto the turret's, and `:53`
takes the bond's team.

`Resolver.resolveTurrets` used to build each turret with the full `Entity` define on a
bare `Resolved`, so `Resolved.Turrets[i].Resolved` carried a whole settings bag, an
alpha, a squiggle, a `coreSize`, skills, a score and a `dangerValue` no turret ever gets
— and was missing everything `genericEntity` puts on one. Over the 1,318 definitions with
TURRETS that was 180,757 wrong or missing field values.

**Fixed** in `internal/defs/resolve.go`: `defineTurret` ports `turretEntity.js:109` and
`buildTurret` ports its constructor. `Prop.prototype.define` (`propEntity.js:48`, eight
keys, its own constructor values, and no `genericEntity` seed) had the identical problem
on `defineSplit`'s PROPS path and is ported the same way as `defineProp` / `buildProp`.

**How it was found.** `tools/gen-defs-vectors.js` resolves all 2,492 definitions through
the real loader and `internal/defs/resolve_golden_test.go` compares every field; the
turret sub-resolutions were where the mismatches were. `internal/guns` had already ported
`turretEntity` correctly for the live path, and `internal/define/apply.go:508` documents
routing around `internal/defs`' turret resolution for exactly this reason — so the wrong
data was unused, but it was public and it was wrong.

---

## 56. `gen/definitions.json` cannot carry NaN, negative zero, or a portable `Math.pow`

`tools/dump-definitions.js`

The dumper writes the definition table with `JSON.stringify`, which has no NaN, no
infinities and no signed zero, and it does not `require('./fdlibm-pow')` the way every
other generator whose output can depend on `pow` does. Three consequences, all measured
by `tools/gen-defs-vectors.js`, which diffs the live table against the dumped one before
resolving anything (`dumpLosses` in `gen/defs-vectors.json`, asserted by
`TestDumpCannotRepresentSomeDefinitionValues`):

**20 NaN values become `null`, which reads as absent.** This is the one that changes
behaviour. `entity.js:302` is `if (set.DANGER != null) this.dangerValue = set.DANGER`,
and `NaN != null` is **true**, so the real server assigns the NaN. The dump writes
`null`, `internal/defs` reads null as absent (correctly — that is what `!= null` means),
and the definition silently inherits its parent's danger instead. `autoTrapper` resolves
to `dangerValue` 5 in Go and NaN in Node. Seventeen `DANGER` keys are affected
(`autoSwarm`, `autoSunchip`, `autoMinion`, `autoTrap`, `autoTrapper`, `megaAutoTrapper`,
`tripleAutoTrapper`, `ultraAutoTrapper`, `tripleMegaAutoTrapper`, `pentaAutoTrapper`,
`bushwhacker`, `eagle`, `peashooter`, `baseMechTurretTrap`, `napoleonUpperTurretBullet`,
`turretedTrap`, `gladiatorAutoMinion_dreadsV2`) plus three
`GUNS[0].PROPERTIES.SHOOT_SETTINGS.size` (`nestKeeperGen`, `nestWardenGen`,
`nestGuardianGen`).

**135 negative zeros become `+0`.** All are `GUNS[].POSITION.Y` or `.ANGLE` produced by
`weaponMirror` negating a zero — `twin`, `gunner`, `overseer`, the whole mirrored-gun
family. `JSON.stringify(-0)` is `"0"`. No behavioural difference is known here (`sin`,
`cos` and the offset arithmetic all agree on the two zeros), but it is the same class of
loss as the NaN above, and `docs/verification.md` already records that a format which
cannot distinguish these is how a float divergence hides.

**45 stat values are whatever the dumping machine's `Math.pow` returned.** The
labyrinth-boss generator computes `BODY.HEALTH`, `BODY.DAMAGE` and `VALUE` with
`Math.pow`, and `tools/fdlibm-pow.js`'s own header explains why that is not portable:
Node's `Math.pow` is the host C library unless `--no-use-std-math-pow` is passed. So
`gen/definitions.json`'s `laby_*` stats are Windows UCRT values, one ulp from V8's own
`pow` — which is what `internal/jsmath.Pow` reproduces and what every other corpus in
this tree is captured with. Regenerating the dump on Linux would change them again.

**Not fixed here.** The pow half is one `require` and a regeneration; the NaN and `-0`
halves need the dumper to emit a sentinel and `internal/defs` to decode it, which touches
every `Opt[float64]`. Both change a table three other packages embed. `gen/defs-vectors.json`
records every affected site so the fix can be verified when it is made.

---

## 57. `Config.banned_characters` does not exist, so the name filter deletes the word "undefined" from player names

`js-src/server/game/network/sockets.js:277`

```js
name = name.replace(Config.banned_characters, '');
```

`banned_characters` is never assigned anywhere in `js-src` — the grep finds exactly this
one line, and `config.js` has no such key. So the argument is `undefined`, and
`String.prototype.replace` coerces a non-RegExp first argument to a string: it looks for
the literal seven-plus-two characters `undefined` and removes the **first** occurrence.

Confirmed by running it rather than by reading it:

```
$ node -e "let Config={}; console.log(JSON.stringify('undefined hero'.replace(Config.banned_characters,'')))"
" hero"
$ node -e "let Config={}; console.log(JSON.stringify('Bobundefined2'.replace(Config.banned_characters,'')))"
"Bob2"
```

So the filter that is supposed to strip banned characters instead censors one specific
English word, and does nothing else. Found while wiring `cmd/server`: the socket layer's
`ManagerConfig.BannedCharacters` has no `config.Tuning` field to read from, which is how
the missing key surfaced.

**Not ported.** `internal/net`'s `stripBanned` (socket.go) reads an empty
`BannedCharacters` as "strip nothing" and returns the name unchanged, and `wire.Boot`
leaves the field empty because there is no config key to fill it from. Reproducing the JS
exactly would mean hard-coding the string `"undefined"` as the default filter, which is
not a decision to make unilaterally (docs/architecture.md, rule 4). Anyone who does
decide to match it should set `ManagerConfig.BannedCharacters` and teach `stripBanned`
that its argument is a substring to remove once, not a character set — the current
implementation is a set filter, so it would strip every `u`, `n`, `d`, `e`, `f`, `i`
instead.

## 58. A bot's `leftoverUpgrades` is never spent, because `upgrade()` never returns anything

`quickMaintainLoop` spends a bot's leftover class upgrades like this
(game/index.js:426-428):

```js
if (o.leftoverUpgrades && o.upgrade(ran.irandomRange(0, o.upgrades.length))) {
    o.leftoverUpgrades--;
}
```

`Entity.prototype.upgrade` (entity.js:835-921) has no `return` on any path that applies
an upgrade. It returns early with a bare `return;` from the stand-still-delay branch and
from `if (!upgraded) return;`, and otherwise runs off the end of the function. Every one
of those evaluates to `undefined`, so the `&&` is always falsy and the decrement is dead
code.

The consequence is not that upgrades never happen — the call still runs and still
applies. It is that the counter never goes down, so a bot that spawns with any
`leftoverUpgrades` at all keeps drawing `irandomRange` and re-rolling its class on
**every** 200 ms tick for the rest of its life. That is one draw per such bot per tick,
and a bot that reaches the level for a tier keeps hopping between the tanks of that tier
instead of settling on one.

```
$ node -e "
function upgrade() { let upgraded = true; if (!upgraded) return; /* falls off the end */ }
console.log(upgrade());"
undefined
```

**Ported as-is**, including the never-decrementing counter. `internal/define`'s
`Upgrade` does return an honest bool — a Go function that silently returned nothing
would be a different kind of lie — and `internal/room`'s caller throws it away exactly
the way the source's `&&` does. See the doc comment on `define.Upgrade` for the full
list of what that function does and does not reproduce.

## 59. A `Gun` consumes an entity id, so entity ids are not entity ids

`entitiesIdLog` is described by its name and by `entity.js:2` as the entity id counter,
and `Entity`, `bulletEntity`, `turretEntity` and `propEntity` all draw from it. So does
`Gun` (gun.js:8):

```js
this.id = entitiesIdLog++;
```

A gun is not an entity: it is never inserted into the `entities` map, never ticked, never
collided, never serialised as an entity. But it takes a number out of the same sequence,
so the ids of real entities have holes in them whose size depends on how many gun barrels
the definitions involved happen to have. Spawning one `basic` bot advances the counter by
two — one for the tank, one for its single gun.

Measured against the real server:

```
$ node tools/harness/probe-drawsites.js --seed 1 --ticks 7 --bots 8 --newents
CREATE id=120 at new Entity <- gameHandler.spawnBots (game/index.js:445)
   ... nextEntityId goes 120 -> 122 on that tick; 121 is the gun and is never registered
```

This matters beyond tidiness: `nextEntityId` is shipped to clients, and any comparison
that pairs two runs' entities by id (which is what the differential harness does) drifts
apart the moment one side allocates gun ids and the other does not.

**Ported.** `internal/guns`' `Gun` takes an id off the same counter through
`entity.World.TakeWireID`, and turrets and props take theirs from `World.Spawn`: in this
port those two are entities (carrying `entity.FlagUnlisted`, so nothing walks them as
one) precisely where `turretEntity` and `Prop` are not, which lands them on the same
sequence the source puts them on. `nextEntityId` is written into the trace every tick and
`cmd/simdiff` compares it, so the whole corpus -- 44 gamemodes at 150 ticks, ten long runs
at 1,500 -- is a standing check that the two counters advance in step.

## 60. `this.body.guns.length` is `undefined`, so three controller loops never run

`entity.js:50` makes `guns` a Map and keeps a parallel array beside it:

```js
this.guns = new Map();
this.gunsArrayed = [];
```

A Map has no `length`. Three controllers iterate the Map anyway:

```js
for (let i = 0; i < this.body.guns.length; i++) {   // controllers.js:410, :523, :667
```

`0 < undefined` is false, so the body of each of these runs zero times, for every entity
in the game, on every tick. The three are `io_stackGuns` (:410), `io_nearestDifferentMaster`
(:523) and `io_healTeamMasters` (:667). The sibling loops that walk `gunsArrayed`
(`io_mapFireToAlt`, :375) are ordinary array loops and do run.

What the dead code was meant to do is pick a functional gun and size the AI's world by it:

```js
let tracking = this.body.topSpeed,
    range = this.body.fov;
for (let i = 0; i < this.body.guns.length; i++) {
    if (this.body.guns[i].canShoot && !this.body.aiSettings.SKYNET) {
        let v = this.body.guns[i].getTracking();
        ...
        tracking = v.speed;
        range = Math.min(range, ...);
        break;
    }
}
```

Because it never runs, every bot in the shipped game leads its target by its own
**topSpeed** rather than by its bullet speed, and searches out to its own **fov** rather
than to its gun's range. For the seed-1 Octo Tank that is 5.6 instead of 7.4, and 1374
instead of 145 — an order of magnitude, not a rounding difference. `io_stackGuns` is
dead outright: its only statement is inside the loop, so it always returns `{}`.

Note that the loop also indexes the Map with `this.body.guns[i]`, which would be
`undefined` even if the guard passed, so the first iteration would throw. The bug keeps
itself invisible.

**Ported.** `internal/ctrl` keeps the loops and gates them on a named constant:

```go
// internal/ctrl/context.go
const jsGunsMapLength = 0
```

so the intent stays readable and the day arras writes `guns.size` the fix is one
declaration. The differential caught this as a bot facing that drifted from tick 33.

## 61. Seventeen definitions carry `DANGER: NaN`, and the AI refuses to target any of them

`facilitators.js` builds derived tanks by reading the parent's DANGER and adding to it:

```js
output.DANGER = type.DANGER + dangerIncrement   // makeGuard, facilitators.js:589
```

`type` there is the raw definition object, not a resolved one. `Class.sniper` has no
DANGER of its own — it inherits one through `PARENT: 'genericTank'` at define time — so
`type.DANGER` is `undefined` and the sum is **NaN**. Seven facilitators do this
(`:504`, `:589`, `:632`, `:703`, `:778`, `:855`, `:1728`), and `:504` even writes
`type.DANGER + dangerIncrement ?? 7`, which cannot help: `??` catches null and undefined,
and NaN is neither.

Seventeen shipped definitions come out with a NaN DANGER, Bushwhacker, Eagle, Peashooter
and the whole auto-trapper family among them. `entity.js:302` then assigns it:

```js
if (set.DANGER != null) this.dangerValue = set.DANGER;   // NaN != null is true
```

so the NaN lands on the entity and shadows the 5 the parent would have given. Both
targeting controllers refuse such an entity outright:

```js
if (isNaN(e.dangerValue)) return false;   // controllers.js:458, :614
```

A Bushwhacker is therefore invisible to every AI in the game. It is never locked onto,
never counted toward `mostDangerous`, and never shot at by a bot. Measured on the real
server:

```
$ node tools/harness/probe-drawsites.js --seed 2 --ticks 280 --bots 8 --ndm 122
NDM tick=276 cand=128 type=tank label=Bushwhacker valid=false wall=false danger=NaN
```

Three more NaNs are gun stats rather than danger values —
`nestKeeperGen`, `nestWardenGen` and `nestGuardianGen` each have a NaN
`SHOOT_SETTINGS.size`.

**Ported, and it needed a change to the dump.** `JSON.stringify(NaN)` is `null`, so
`gen/definitions.json` used to lose all twenty; `internal/defs` read null as absent, the
PARENT chain supplied a real number, and Go's bots hunted tanks the real server ignores.
`tools/dump-definitions.js` now writes `{"__nonSerialisable": "NaN"}` for any non-finite
number and `Opt[float64]` decodes it as a present value, because `NaN != null`. A fresh
entity's `DangerValue` starts at NaN too, matching `undefined` — see
`internal/entity/world.go`'s `initEntity`, which does the same for `fov`.

This was the seed-2 divergence at tick 276: Go's Octo Tank locked onto a Bushwhacker
that Node cannot see.

## 62. `util.remove` deletes the last element when asked to remove something that isn't there

`js-src/server/lib/util.js:154`

```js
exports.remove = (array, index) => {
    if (index === array.length - 1) {
        return array.pop();
    } else {
        let o = array[index];
        array[index] = array.pop();
        return o;
    }
};
```

Every caller spells it `util.remove(list, list.indexOf(x))`, and `indexOf` gives `-1` when
`x` is not in the list. `-1` is never `array.length - 1` for a non-empty array, so the
else branch runs: it reads `array[-1]` (undefined), pops the real last element, and
assigns it to the string property `"-1"`. **Removing something that was never there
deletes the last element** and returns undefined.

That is not hypothetical. `destroy()` (entity.js:1259-1263) does this on purpose-adjacent
code:

```js
if (this.bulletparent != null) {
    util.remove(this.bulletparent.bulletchildren, this.bulletparent.bulletchildren.indexOf(this));
    for (let gun of this.bulletparent.guns.values()) {
        util.remove(gun.bulletchildren, gun.bulletchildren.indexOf(this));
    }
}
```

`this.bulletparent` defaults to `this` (entity.js:16), so the guard always passes, and the
loop walks **every** gun of the bulletparent. The dying bullet is in at most one of those
lists; each of the others loses its newest bulletchild instead. A tank with eight barrels
therefore drops seven live bullets out of its own bookkeeping every time one bullet dies,
which makes the remaining barrels believe they have room they do not.

The swap-remove half matters too: the last element is moved into the hole, so these lists
are not in insertion order after the first removal. `destroyOldest` (gun.js:271) iterates
`children` and breaks ties on `creationTime` by list order, so which child gets killed
depends on this shuffling.

**Ported** in `internal/wire/destroy.go`'s `jsRemoveID`, pop and all.

Note the mirror-image mistake on the Go side, which the seed-3 differential caught: the
`children` sweep next to it must touch exactly ONE gun, because `this.parent.children`
(entity.js:1270) is a single list. Applying `util.remove` to every gun of the shooter
turns the pop above into a bug the real server does not have — an overseer's two drone
guns each lost a child from their list whenever the other's drone died, so both fired past
their MAX_CHILDREN of 4 and the tank ran nine drones instead of eight.

## 63. A dead food keeps its slot under `food_cap` for up to a second and a half

`js-src/server/game/index.js:316-323`

`foodloop` caps how much food exists by comparing three list lengths against
`Config.food_cap`, `food_cap_nest` and `enemy_cap_nest`. Nothing ever removes an entry
from those lists except a per-food repeating timer set when it spawns:

```js
const setupCleanup = (arr, o) => {
    const loop = setInterval(() => {
        if (o.isDead()) {
            util.remove(arr, arr.indexOf(o));
            clearInterval(loop);
        }
    }, 1500);
};
```

So a food eaten one millisecond after its interval fires stays counted for another 1499,
and the room refuses to spawn a replacement for that whole window. With `food_cap` reached
and food being eaten steadily, the effective population sits below the cap by however much
gets eaten per 1.5 seconds, permanently. There is no event on death and no sweep; the
interval is the only path.

The removal is `util.remove(arr, arr.indexOf(o))`, so found-bug #62 applies here too --
though not harmfully, since the entry is always present when this fires.

**Ported.** `internal/room/timers.go` carries `timerFoodCleanup`, `timerNestFoodCleanup`
and `timerEnemyFoodCleanup`, one repeating 1500 ms timer per spawned food, each removing
its own id and stopping. `internal/room/spawn.go`'s foodloop deliberately does NOT prune
dead ids: doing so keeps the lists shorter than the real server's, which spawns food where
the original has already hit its cap. The seed-1 differential caught that at tick 1017 as
one extra Egg and ten extra draws.

## 64. Regenerating a maze leaves every old wall in `global.walls` forever

`js-src/server/game/gamemodes/scripts/maze.js:7-13`, `labyrinth.js`, `siege.js:305-315`

`generate()` clears the previous layout with two loops:

```js
for (let o of entities.values()) {
    if (o.type === "wall") o.destroy();
}
let mazeGenerator = new global.mazeGenerator.MazeGenerator(this.type);
let { squares, width, height } = mazeGenerator.placeMinimal();
for (let instance of entities) {
    if (instance.type == "wall") instance.kill();
}
```

Neither loop takes a wall out of `global.walls`, the array `wouldHitWall`
(controllers.js:59) raycasts against. The only thing that ever does is the handler each
wall spawn registers:

```js
wall.on("dead", () => { util.remove(walls, walls.indexOf(wall)) })
```

and `destroy()` (entity.js:1250) does not emit `'dead'` — only
`contemplationOfMortality` does (entity.js:1222), and it is reached by dying, not by
being destroyed. So the first loop removes the walls from `entities` while leaving them
in `walls`.

The second loop is meant to be the one that kills them, and it never runs a single
iteration: `entities` is a `Map`, so `for (let instance of entities)` binds `instance`
to a `[key, value]` pair, and an array has no `.type`. `instance.type == "wall"` is
`undefined == "wall"`, false, every time. (The first loop spells it `entities.values()`
and gets it right.)

The result is that `walls` only grows. Every wave of a siege game adds its layout to the
list and none of the previous ones leave, and because the array holds a reference to the
entity object, each ghost keeps the hitbox and the x/y it had when it was destroyed.
Bots go on refusing to target through walls that are no longer there, on a map that
gains a fresh set of phantoms every wave.

**Ported.** `internal/room/walls.go`'s `removeWall` is reached only from
`Room.OnEntityDeath` — the death event, not `destroy()` — so a destroyed wall stays in
`Room.Walls`. `internal/wire`'s `Lifegiver.walls` therefore keeps handing controllers an
entry whose entity is gone, and stops refreshing its position once it is, which is the
frozen `crate.x`/`crate.y` the JS ends up reading off the retained object.

## 65. `makeHitbox` mirrors the wall instead of rotating it

`js-src/server/loaders/global.js:640-666`

```js
relativeCorners[i] = {
    x: distance * Math.sin(relativeCorners[i]),
    y: distance * Math.cos(relativeCorners[i])
};
```

`x` takes the sine and `y` the cosine, which is the reflection of the usual
`x = cos, y = sin` across the line `y = x`. Because `wall.angle` is added to each corner
angle *before* the sin/cos, the reflection turns the wall's rotation the wrong way: a
wall at `+30°` gets the hitbox of a wall at `-30°`.

It is currently dormant. The corner angles are `Math.atan2(±_size, ±_size)`, i.e. the
four diagonals of a square, and that set is symmetric under the reflection; every wall
class descends from `Class.wall`, which pins `ANGLE: 0` (obstacles.js:73); and
`FACING_TYPE: ['noFacing', { angle: Math.PI / 2 }]` sets `facing`, which makeHitbox does
not read. So today the mirror is invisible — the first wall definition to carry a
non-zero `ANGLE` is the one that finds it.

**Ported verbatim**, sin and cos included, in `internal/ctrl/hitbox.go`.

## 66. `define()` builds every ancestor's guns, turrets and controllers, then throws them away

`js-src/server/game/entities/entity.js:184-190`, `:216`, `:413`, `:469`

`define(set)` recurses into `PARENT` before it applies any of the level's own fields:

```js
if (set.PARENT != null) {
    if (Array.isArray(set.PARENT)) {
        for (let i = 0; i < set.PARENT.length; i++) this.define(set.PARENT[i], false);
    } else this.define(set.PARENT, false);
}
```

Three of the blocks that follow are constructive, not declarative:

- `CONTROLLERS` (`:216`) builds an `io` object per entry and merges them with `addController`.
- `GUNS` (`:413`) clears the gun map and builds a `new Gun` per entry.
- `TURRETS` (`:469`) destroys the existing turrets and builds a `new turretEntity` per entry.

So every ancestor that declares one of these runs it in full, and the child then
replaces the result. The replaced objects are garbage; what they consumed on the way
out is not. `new Gun`, `new turretEntity`, `new propEntity`, `new bulletEntity` and
`new Entity` all take the next id from the one counter (`entity.js:2`
`global.entitiesIdLog = 0`), and `io_nearestDifferentMaster`'s constructor is
`this.tick = ran.irandom(30)` (`controllers.js:442`) — a draw.

`Class.antiTankMachineGun` is the clearest case. Its `PARENT` is `dominator`, which
declares `CONTROLLERS: ["nearestDifferentMaster", ["spin", {onlyWhenIdle: true}]]` and
one turret; the child re-declares both controllers (in the other order) and three
turrets of its own. Building one ATMG therefore:

- builds **two** `nearestDifferentMaster`s, drawing twice, and keeps the second;
- spends an entity id on a turret that is destroyed a few lines later.

Measured on the `tile_testing` room, whose grid has one ATMG tile: the wall spawned
straight after it is id 222 in Node and was id 221 here, and every id in the room after
that point was one lower.

There is a second, quieter consequence. `addController` replaces a same-kind
controller **in place**, so the surviving list is in the *ancestor's* order, not the
child's: the ATMG ends up `[nearestDifferentMaster, spin]` — `dominator`'s order —
even though its own `CONTROLLERS` lists `spin` first. Controllers are merged in list
order, so this is visible behaviour, not bookkeeping.

**Ported.** `internal/defs`'s `Resolved.Steps` records each `CONTROLLERS`, `GUNS` and
`TURRETS` block as the `PARENT` walk reaches it (`defs.DefineStep`), and
`internal/define` replays them in that order rather than applying the flattened end
state: `applyControllerSteps` for the first, `applyBuildSteps` for the other two. The
end state is unchanged — the resolver already ported `addController` — but the ids and
the draws now match.

## 67. A bot whose random body colour rolls 0 is invisible in its own colour on the minimap

`spawnBots` gives every bot one colour and writes it to three places
(`game/index.js:453-456`):

```js
let color = Config.random_body_colors ? Math.floor(Math.random() * 20) : team ? getTeamColor(team) : 'red';
o.color.base = color;
o.leaderboardColor = color;
o.minimapColor = color;
```

All three minimap builders read that last one the same way (`sockets.js:1814`, `:1831`,
`:1846`):

```js
my.minimapColor ? my.minimapColor + " 0 1 0 false" : <default>
```

`Math.floor(Math.random() * 20)` is 0 through 19, and `0` is falsy. So one bot in
twenty — the ones that roll palette entry 0 — takes the `<default>` branch and is drawn
in the room's team colour instead of its own, while its body, in the main view, is
palette entry 0 as intended. The two disagree for that bot and only that bot.

Nothing else in the file guards a palette index against zero this way; `color.base`
takes the same value through `Color.prototype` and renders it correctly. The bug is
the truthiness test standing in for a "was it set" test on a field whose valid range
includes 0.

**Reproduced.** `room.EntityExtras.MinimapColor` is a string, and
`paletteColorString` returns `""` for index 0 so the read site's `!= ""` lands on the
same branch the JS's `?` does.

## 68. `minimapAllTeams` guards on a property nothing ever sets

`sockets.js:1840`:

```js
if (my.type === "tank" && my.master === my && !my.lifetime) {
```

`lifetime` is assigned nowhere in `js-src` — not in `entity.js`'s constructor, not in
`define`, not by any gamemode script or addon. The read is `undefined` at every call,
so `!my.lifetime` is always true and the term is inert.

It reads like a guard against short-lived entities (a drone, a decoy) appearing on the
all-teams minimap, which `my.master === my` already handles for everything with a
master. Whatever it was meant to catch, it catches nothing.

**Not ported**, and named in `internal/net`'s `MinimapAllTeams` so a reader comparing
the two does not go looking for the missing condition.

---

## 69. `bulletEntity`'s empty `updateBodyInfo` leaves every bullet's `fov` undefined, which silently swaps the formula its AI uses for targeting range

`js-src/server/game/entities/bulletEntity.js:349`

```js
updateBodyInfo() {};
```

`bulletEntity` is introduced as "basically an (Entity) but with heavy limitations to
improve performance", and this is one of the limitations: `Entity.prototype`'s version
(`entity.js:623`) is `this.fov = 1 * this.FOV * 275 * Math.sqrt(this.size)`, and the
override does nothing at all. So `fov` is never assigned on a bullet. Not stale, not
zero — the property does not exist, and every read of it is `undefined`.

That is not confined to the camera, which is presumably what the override was aiming
at. `io_nearestDifferentMaster` opens with it (`controllers.js:521`, `:534`):

```js
let tracking = this.body.topSpeed,
    range = this.body.fov;
...
if (!Number.isFinite(range)) {
    range = 640 * this.body.FOV;
}
```

`Number.isFinite(undefined)` is false, so *every bullet in the game* takes the fallback
branch. A bullet's targeting range is `640 * FOV` — a constant multiple of its raw stat
— while every other entity's is `FOV * 275 * sqrt(size)`, which shrinks as the entity
gets smaller. For a fresh Beeman trap drone (`FOV` 1.5, size 2.82) the two are 960 and
693: a 39% difference, and the difference between holding a target lock across a tick
and dropping it.

**Ported as-is.** `internal/wire`'s `bringToLife` now skips `UpdateBodyInfo` for
anything carrying `entity.FlagLimited`, which is exactly the discriminator — `fire()`
chooses `new bulletEntity` over `new Entity` on the same `noentitylimit` test that sets
the flag. `internal/entity` already models the undefined `fov` as `NaN`, so the
`!Number.isFinite` fallback needed no change once the write stopped happening. Before
this, a Go swarm drone acquired a lock on the tick it was fired and lost it on the next
think of the same tick, which the seed-1 `--spawnclass beeman` differential reported as
sixty bullets with slightly wrong velocities.

---

## 70. `necroDefineGuns` writes a key for every revivable shape even when the filter finds nothing, and a drone depends on that empty key

`js-src/server/game/entities/entity.js:534-538`

```js
this.settings.necroDefineGuns = {};
for (let shape of this.settings.necroTypes) {
    this.settings.necroDefineGuns[shape] = this.gunsArrayed.filter(...)[0];
}
```

`.filter(...)[0]` is `undefined` when nothing matches, and assigning `undefined` into an
object still creates the key. That reads like a no-op and is not one, because
`bulletInit` later walks the *same* list and overwrites those keys
(`gun.js:461-463`):

```js
for (let shape of o.settings.necroTypes) {
    o.settings.necroDefineGuns[shape] = this;
}
```

A necromancer's drone carries `NECRO` itself and has no guns of its own, so its own
filter matches nothing every time. The only reason a drone can revive anything is that
the empty keys are there for the firing gun to fill in.

**Ported as-is**, and it was not: `internal/define`'s and `internal/guns`' builders both
dropped shapes whose filter missed, because a Go `[]NecroGun` has no "present but
undefined" state the way a JS object property does. Both now emit an entry per shape
with a zero `GunID` — which `internal/wire`'s `Hooks.Necro` treats as the JS's `!gun`
bail — so `bulletInit`'s rewrite has something to rewrite. Without it a necromancer's
drones never converted anything, and the seed-1 `--spawnclass necromancer` differential
found the first square that survived.

---

## 71. The nexus tile's message throttle arms a new clear on every tick, so it throttles exactly one message

`js-src/server/game/roomSetup/tiles/nexus.js:7-10`

```js
if (entity.skill.level < 90) {
    !entity.nexus_alerted && entity.sendMessage("You need to be level 90 to enter this room!");
    entity.nexus_alerted = true;
    setTimeout(() => entity.nexus_alerted = false, 50);
```

The flag reads like a 50 ms rate limit and is not one. Lines 9 and 10 run on every tile
tick the entity is standing there, not only on the tick that sent the message, so a
fresh clear is armed 50 ms out every tick and they pile up one per tick. At the stock
cycle speed a tick is 33.3 ms, so 50 ms is longer than one tick and shorter than two:
from the third tick onward one of those clears always lands before the tick runs, the
flag is found down again, and the message goes out. The suppression covers exactly one
tick and then stops working.

At 1000/30 ms per tick, over five ticks:

| tick | t (ms) | clear that fires first | flag at tick | message |
|------|--------|------------------------|--------------|---------|
| 0 | 0 | -- | down | yes |
| 1 | 33.3 | -- | up | no |
| 2 | 66.7 | armed at tick 0, due 50 | down | yes |
| 3 | 100 | armed at tick 1, due 83.3 | down | yes |
| 4 | 133.3 | armed at tick 2, due 116.7 | down | yes |

**Ported as-is.** `EntityExtras.NexusAlerted` is a plain bool again and the clear is a
real entry on the room's timer queue (`timerNexusAlertClear`), one per tick, exactly as
many as the source arms. This port previously kept a single deadline that
`nexusTileTick` pushed forward on every tick, which is the opposite failure: a deadline
re-armed every tick never expires, so the port sent one message and then went silent
forever. `internal/room`'s `TestNexusTile_AlertThrottleOnlySuppressesOneTick` pins the
count at four messages over those five ticks.

`sendMessage` is a no-op on anything but a player-controlled entity
(`entity.js:1241`, overridden per player at `entity.js:150`), so no differential run can
see this; it is a real difference for a human standing on the tile in a nexus room.

---

## 72. `spawn()` arms a delay-less `setInterval` per player that can only ever assign a value the body already holds

`js-src/server/game/network/sockets.js:1221-1227` (and the same shape at `:1207-1214`)

The default arm of the team switch, the one every ffa player takes, ends with this:

```js
let team = filter.length ? player.team : getRandomTeam();
body.team = team;
body.color.base = ...;
let loop = setInterval(() => {
    for (let e of entities.values()) {
        if (body.team !== e.team || body.team !== -101 || body.team !== -1 || body.team !== -2 || body.team !== -3 || body.team !== -4) {
            clearInterval(loop);
        } else body.team = team;
    }
})
```

Three things are wrong with it at once, and they cancel out.

The condition is a chain of `||` between `!==` tests against five different constants, so
it is false only for a `body.team` that is simultaneously equal to `e.team`, `-101`, `-1`,
`-2`, `-3` and `-4`. No number is. It is therefore true on the first entity examined, and
the interval clears itself on its first firing.

If it did not clear, the else branch assigns `body.team = team` -- the value assigned two
lines above, which nothing between has changed. The loop's entire effect is to write a
variable back onto itself.

And `setInterval` with no delay is a 1 ms interval, so had the guard ever been false the
loop would have run a thousand times a second for the life of the body, walking every
entity in the game each time.

The one case where the guard is not reached is an empty `entities` map: the `for...of`
body never runs, nothing clears, and the interval stays armed forever. A room always has
walls by the time a player can spawn, so this never happens either.

`getRandomTeam()` returns `-Math.floor(Math.random() * 3000) + 1`, which does include
-101 -- but a `body.team` of -101 fails the next clause (`!== -1`) instead, so even that
clears on the first entity.

**Not ported.** `internal/room`'s `SpawnPlayerBody` takes the same draw for the team and
the same draw for the colour, in the same order, and simply omits a loop whose only
reachable behaviour is to clear itself. The clan arm at `:1207-1214` is the same code
against `Config.clan_wars_ft.getClans()` and is omitted for the same reason.

## 73. The HUD's skipped-upgrade counter increments the last branch it saw, not the branch it is counting

`sockets.js:919-936`, inside the per-frame HUD update. For every upgrade row the player is
not yet high enough level to take, it keeps a count per branch so that
`entity.js:888` can turn a branch-relative upgrade number back into an absolute index into
`this.upgrades`:

```js
let skippedUpgrades = [0];
for (let i = 0; i < b.upgrades.length; i++) {
    let upgrade = b.upgrades[i];
    if (b.skill.level >= b.upgrades[i].level) {
        upgrades.push(...);
    } else {
        if (upgrade.branch >= skippedUpgrades.length) {
            skippedUpgrades[upgrade.branch] = 1;
        } else {
            skippedUpgrades[skippedUpgrades.length - 1]++;
        }
    }
}
b.skippedUpgrades = skippedUpgrades;
```

The else arm indexes `skippedUpgrades.length - 1`. That is the highest branch the loop has
reached so far, which is only the row's own branch when the rows arrive in ascending branch
order and never revisit one. The moment a skipped row's branch is lower than a branch
already seen, its count lands on the wrong entry.

The `if` arm has a second problem feeding the first. Assigning past the end of a JS array
extends it and leaves holes, so a first skip in branch 3 turns `[0]` into
`[0, <2 empty>, 1]` -- length 4, with nothing at 1 or 2. Every later skip in branch 0, 1 or
2 then takes the else arm and increments index 3.

Driving the shipped code with four skipped rows in branches 3, 1, 5 and 2, in that order
(`tools/gen-gui-vectors.js`, case "sparse branches leave holes in skippedUpgrades"), gives:

```
[0, <hole>, <hole>, 2, <hole>, 2]
```

Branch 3 is credited with branch 1's skip and branch 5 with branch 2's, while branches 1
and 2 are credited with nothing. `entity.js:888` sums entries `0 .. branchId-1` to offset
the number it was given, so a player picking an upgrade out of a branch after any of this
gets a different tank from the one they clicked.

The holes themselves are harmless: that same line reads `this.skippedUpgrades[i] ?? 0`.

**Ported as-is.** `internal/wire/gui.go`'s `updateUpgrades` writes the same array with the
same off-by-branch arithmetic, and Go's zero-filled slice growth gives the `?? 0` reading of
a hole for free. It is pinned by the vector case named above, which is generated by running
the real `update()`.

## 74. Every upgrade the server offers is named `..._undefined_...`, and the client works around it by name

`sockets.js:925` builds the id the client uses for one row of the upgrade menu:

```js
upgrades.push(upgrade.branch.toString() + "_" + upgrade.branchLabel + "_" + upgrade.index);
```

`upgrade.branchLabel` is `this.branchLabel` copied off the defining entity at
`entity.js:357`, and that field is only ever assigned by `entity.js:334`:

```js
if (set.BRANCH_LABEL != null) this.branchLabel = set.BRANCH_LABEL;
```

No definition in the shipped set has a `BRANCH_LABEL`. Not one -- the key does not appear
anywhere under `lib/definitions/`, and `gen/definitions.json` has no trace of it. So
`branchLabel` is `undefined` on every upgrade row in the game, and JavaScript's `+` spells
an undefined out in full. The `basic` tank's first upgrade goes out as

```
0_undefined_791
```

The client knows. `app.js:3869` is

```js
let upgradeBranchLabel = upgrade[1] == "undefined" ? "" : upgrade[1];
```

-- a string comparison against the literal word, which is only there because the server
sends it. The heading is then suppressed because the label is empty, which is the intended
appearance; the bug is entirely in the identifier.

**Ported as-is, and this port had it wrong first.** `internal/define`'s `applyUpgrades`
resolved an absent `BRANCH_LABEL` to `""` with `Opt.Or("")`, which made the same row
`0__791` -- indistinguishable to the eye, identical on screen because the client's fallback
produces an empty label either way, and different on the wire from what Node sends.
`entity.Upgrade` now carries `HasBranchLabel` alongside the string so the two states stay
apart, and `internal/wire/gui.go` writes the word out. Found by running the shipped
`update()` against a row with no label (`tools/gen-gui-vectors.js`, case "an upgrade with no
branch label spells it \"undefined\"") rather than by reading either side.

## 75. A delayed upgrade resolves with the wrong branch, because the resolver reads a field the writer never wrote

`entity.js:862-869` parks an upgrade that has to wait out the stand-still delay:

```js
this.upgradePending = {
    number,
    branchId,
    tankLabel,
    lastReminder: now,
    lastIndex: this.index,
    dailyTankRequest,
};
```

`global.js:217` takes it back out:

```js
my.upgrade(my.upgradePending.number, my.upgradePending.branch, true, my.upgradePending.dailyTankRequest);
```

`branchId` in, `branch` out. There is no `branch` on that object, so what reaches `upgrade()`
is `undefined`, and the first thing `upgrade()` does with it is

```js
for (let i = 0; i < branchId; i++) { number += this.skippedUpgrades[i] ?? 0; };
```

`0 < undefined` is `false`, so the loop runs zero times and the skipped-upgrade offset is
never applied. Confirmed against Node rather than assumed: the probe records
`"branch": null` on a pending record whose `branchId` is `0`.

The effect is that a delayed upgrade and an immediate one resolve the same click to
different rows. Immediate upgrades happen in a base, or with a permissions key, or with
`upgrade_delay` set to 0; delayed ones are what every ordinary player in an ordinary
gamemode gets. So the branched half of the upgrade menu behaves one way in a base and
another way outside it.

It is invisible for `branchId` 0, which is why it has survived: `for (i = 0; i < 0; i++)`
runs zero times too, and the shipped `basic` tree is entirely branch 0.

**Ported as-is.** `internal/wire/upgrade.go`'s `resolvePendingUpgrade` stores the branch id
and then passes 0, which is that same zero-iteration loop. Pinned by
`TestUpgradeMatchesNode`.

## 76. An out-of-range upgrade index crashes the room, from an otherwise well-formed packet

The `U` handler validates four things (`sockets.js:456`): that both fields are numbers,
that neither is negative, and that the branch is finite. It does not check that the
upgrade index is inside the menu. Both paths out of it then behave differently:

- `entity.js:889` -- the apply path -- tests `number < this.upgrades.length` first.
- `entity.js:855` -- the stand-still path -- does not:

  ```js
  upgrade = this.upgrades[number];
  list = Array.isArray(upgrade.class) ? upgrade.class : [upgrade.class]
  ```

  `this.upgrades[999]` is `undefined` and `.class` on it throws.

`socketManager.incoming` (`sockets.js:187`) has no try/catch, and the `ws` message handler
it is called from has none either, so the TypeError leaves the handler and takes the worker
down. Every player in that room is disconnected by one packet from one of them.

Reaching it needs only what an ordinary player already is: outside a base, having moved in
the last three seconds, with no permissions key. `tools/harness/probe-upgrade.js` sends
`['U', 999, 0]` to the shipped server under exactly those conditions and records

```
"threw": "Cannot read properties of undefined (reading 'class')"
```

**NOT ported, deliberately, and this is the only intentional behavioural deviation in the
player path.** A Go server that panicked here would be the same outage for the same packet.
`internal/wire/upgrade.go` drops the request instead, and
`TestOutOfRangeUpgradeDoesNotPanic` asserts the deviation -- including that the probe still
records the throw, so that if the source ever grows the missing bounds check this port
follows it rather than keeping a deviation nobody needs.

## 77. The tank a delayed upgrade promises is not always the tank it delivers

Same two lines as #76, read for their other consequence. The stand-still path finds the
label to put in "Upgrading to ..." by reading `this.upgrades[number]` with the number
exactly as the client sent it (`entity.js:855`). The apply path, when the delay finally
elapses, reads `this.upgrades[number]` after adding the skipped-upgrade offset
(`entity.js:888`).

Those are the same row only when the offset is zero. A player at a level where some branch
has upgrades they have outgrown gets told they are upgrading to one tank and, three seconds
later, becomes another.

In the shipped data the offset is zero for branch 0, and #75 keeps it zero for every
delayed upgrade regardless of branch -- so the two bugs currently cancel, and fixing either
one alone would make this one visible.

**Ported as-is.** `internal/wire/upgrade.go`'s `pendingTankLabel` reads the unoffset row and
says so.

## 78. One `NWB` packet makes a socket receive the whole minimap and leaderboard four times a second, for as long as it stays connected

`js-src/server/game/network/sockets.js:727, 1996`

`socket.status.forceNewBroadcast` starts false (`:2128`). The `NWB` packet sets it:

```js
case "NWB": {
    socket.status.forceNewBroadcast = true;
} break;
```

and the tail of the 250 ms broadcast reads it:

```js
if (socket.status.forceNewBroadcast) {
    socket.talk("RM");
    socket.talk("RL");
    socket.status.needsNewBroadcast = true;
}
```

Nothing anywhere in `js-src` ever assigns it `false` again. `needsNewBroadcast` is the flag
that means "send the reset form next time", and it is cleared properly (`:1987`) -- but this
block sets it again on every single firing.

So a socket that sends one `NWB` moves permanently into the reset form: an `RM`, a `b`
carrying every minimap row and every leaderboard row, then another `RM` and an `RL`, four
times a second, until it disconnects. `tools/harness/probe-broadcast.js` measures the cost
on a room of eight bots a hundred ticks old: the ordinary diff is 79 values and the reset is
812, and the two firings after the `NWB` are both the long one.

The `DTAST` case above it (`:718`) has no `break`, so a daily-tank ad-start falls through
into `NWB` and arms the same thing without asking.

**Ported as-is.** `internal/wire/broadcast.go` reproduces the frame-for-frame sequence and
`TestBroadcastMatchesNode` replays the three firings around it, including the two that
follow.

## 79. The leaderboard is handed the viewer's own body id and throws it away

`js-src/server/game/network/sockets.js:1966, 1729`

The broadcast computes something per subscriber and passes it to the leaderboard finder:

```js
leaderboardUpdate = getLeaderboard.update(
    socket.id,
    (Config.groups || (Config.mode == 'ffa' && !Config.tag)) && socket.player.body ? socket.player.body.id : null
);
```

`Delta.update(id = 0, ...args)` collects that into `args` and hands it to the finder, which
passes it on:

```js
let globalLeaderboard = new Delta(7, args => { ...; return makeLeaderboardList(list, args); });
let makeLeaderboardList = (list, args) => { ... }
```

`makeLeaderboardList`'s body never mentions `args`. Neither does `makeLeaderboardHPList`,
which does not even take it.

The guard on the value says what it was for: it is computed only in the modes where every
row is drawn in the same flat palette colour (#67's `11 0 1 0 false`), which is exactly when
a player cannot pick their own row out of the board -- so the intent was to colour the
viewer's own row differently. It has never done anything. Two sockets on the same board get
byte-identical leaderboard blocks, which `tools/gen-leaderboard-vectors.js`'s "args, which
the builder ignores" case shows directly by running the real builder twice with different
values.

**Ported as absent.** `internal/net/leaderboard.go` takes no such argument; the
per-subscriber `Delta` is still per-subscriber, because the SNAPSHOT differs even though the
rows do not.

## 80. `topPlayerID` is whatever the last subscriber's board said

`js-src/server/game/network/sockets.js:1761, 1793`

Both list builders end with:

```js
global.gameManager.room.topPlayerID = topTen.length ? topTen[0].id : -1;
```

That is room state, written from inside a per-socket build, once per subscriber per firing.
Its only reader is `entity.js:1206`, which uses it to decide whether a death is announced to
everyone as the leader being usurped.

With one client it is simply the top of that client's board. With several it is the top of
whichever board the last subscriber in the list happens to be watching -- and the four
boards disagree by construction: the boss board's ids are entity ids **plus 100**
(`sockets.js:1775`), so a room whose last subscriber is watching bosses has a `topPlayerID`
that matches no entity at all and no death is ever announced. A subscriber watching an empty
board leaves it at `-1` for everyone.

The two arms that replace the global board (tag, `:1854`; mothership, `:1871`) return before
the assignment, so in those rooms it keeps whatever an ordinary board left there, forever.

**Ported as-is.** `internal/net`'s `LeaderboardSettings.TopPlayerID` is a callback writing
`room.TopPlayerID`, called from the same place with the same value, and the vectors record
what each case leaves behind -- including the two that write nothing.

## 81. The delta handler keeps a snapshot per socket id and never drops one

`js-src/server/game/network/sockets.js:1675`

```js
update(id = 0, ...args) {
    if (!this.data[id]) this.data[id] = this.finder([]);
```

`id` is `socket.id`, a `crypto.randomUUID()` assigned in `connect()` (`:2054`), and
`this.data` is an array being used as a map. There are five Deltas keyed this way -- the
team minimap and the four leaderboards -- so each connection adds up to five entries.

`deltaHandler.unsubscribe` (`:2018`) removes the socket from the subscriber list. Nothing
removes its snapshots. A long-running room therefore holds one team-minimap snapshot and up
to four leaderboard snapshots for every socket that has ever connected to it, each holding
up to ten rows of strings, none of which will be read again -- a reconnecting client gets a
fresh UUID.

**Not ported.** `internal/wire`'s per-socket state is keyed by socket and dropped in
`disconnected`, which is a deviation with no observable effect: the entries the JS keeps are
unreachable by construction.

## 82. "Server full" cannot refuse anyone when the cap is zero, and the socket it does refuse spawns anyway

`js-src/server/game/network/sockets.js:230`

```js
if (!global.gameManager.webProperties.maxPlayers < 1 && this.clients.length > global.gameManager.webProperties.maxPlayers) return (
    socket.talk("message", "This server is full, please rejoin later."),
    socket.kick("Server full.")
)
```

`!` binds tighter than `<`, so the first test is `(!maxPlayers) < 1`, which is `false < 1` --
always true -- for any non-zero cap, and `true < 1`, always false, for a cap of `0` or
`undefined`. The intent was plainly `maxPlayers >= 1`. The practical effect is narrow,
because an unset cap should not refuse anyone anyway; a cap of exactly `0`, though, refuses
nobody rather than everybody.

The second half is the interesting one. `kick` is:

```js
socket.kick = (reason) => { util.warn(reason + " Kicking."); socket.close(); };
```

It closes the socket and nothing else. The `message` handler stays registered, so packets
already in flight -- and, on the harness's synchronous socket, packets sent immediately
afterwards -- are still processed by a socket that has been through the disconnect path.
A client that sends its two `s` packets back to back gets the first refused and the second
honoured: `[INFO]: A player disconnected before entering the game!` is followed one line
later by `[INFO]: Second has spawned into the game`. The body exists, it is owned by a socket
whose `readyState` is CLOSED, and every frame written to it is dropped.

**Not reachable in this port.** `internal/net`'s `Socket.Kick` latches `closed`, and every
send tests it. The room-capacity check itself is not wired: `maxPlayers` is a server-list web
property, not a `config.js` key.

## 83. What a client looks at changes the simulation, because mockups are built out of the shared random stream

`js-src/server/game/network/sockets.js:1441`, `js-src/server/miscFiles/mockup_dimentions.js:178`

`Config.load_all_mockups` is false in the shipped config, so `mockupData` starts empty and
stays that way until somebody asks:

```js
let mockup = mockupData[mockupMap[index]];
if (!mockup) mockup = this.generateMockup(index);
```

`generateMockup` calls `buildMockup`, which measures the class with Welzl's minimum
enclosing circle over a list it shuffles first:

```js
for (let i = endPoints.length - 1; i > 0; i--) {
    let j = Math.floor(Math.random() * (i + 1));
    [endPoints[i], endPoints[j]] = [endPoints[j], endPoints[i]];
}
```

`Math.random` is the same generator the simulation draws from. So the first time any socket
sees a class -- in its frame, mid-tick -- the room spends between zero and about forty draws
building a picture, and every draw after that lands one place further along. Measured across
the whole table: 43,493 draws over 2,492 classes, 1,406 of which cost anything at all. The
basic tank costs 19.

A room's evolution therefore depends on which classes its clients have looked at and in what
order. Two servers on the same seed with different spectators are running different
simulations. Setting `load_all_mockups` moves all 43,493 draws to boot (`game.js:315`) and
makes the room deterministic again, which is presumably not why the option exists.

**Ported.** `tools/dump-mockups.js` records what each build costs and `internal/net`'s
`Mockups.build` burns exactly that on the first send of a class, from the room's generator,
at the same point in the same frame. The mockup itself still comes from the dump; only the
randomness is reproduced. Without this the port's stream matched Node exactly with no client
attached and drifted within a dozen ticks with one -- which is how it was found.

## 84. Removing a body that is not in a clan party evicts whoever is last

`game/gamemodes/scripts/clan_wars.js:28-34`, on every clan-wars death
(`sockets.js:1521`) and every clan-wars disconnect (`sockets.js:146`):

```js
remove: (entity) => {
    let clanCheck = this.checkName(entity.originalName);
    if (clanCheck) {
        let clan = this.clans.find(o => o.clanName === clanCheck[1]);
        util.remove(clan.partyEntities, clan.partyEntities.indexOf(entity));
    }
},
```

`indexOf` gives `-1` for a body that is not on the roster, and that goes straight into
`util.remove` (`util.js:154`), which does not check it:

```js
exports.remove = (array, index) => {
    if (index === array.length - 1) return array.pop();
    let o = array[index];
    array[index] = array.pop();
    return o;
};
```

`-1 === array.length - 1` only when the array is empty, and there `pop()` does nothing. On
a party with anyone in it the else branch runs: `array[-1] = array.pop()` files the popped
member under a property literally named `"-1"` and leaves the array one shorter. So a body
that was never in the party removes somebody who was, and the victim is whoever joined the
clan most recently. They stay in the game and keep their team; they just stop being a
spawn anchor, and the property `"-1"` hangs off the array holding a reference to them.

Reachable whenever a `[TAG]` player's body is not the one `add` put on the roster: a
bacteria takeover (`global.js:682` swaps `player.body` for a bullet child), a dominator
takeover, or a second `remove` for a body already removed.

**Ported.** `internal/room`'s `ClanWars.Remove` drops the last member on a miss instead of
touching a negative index, and `internal/wire`'s `TestClanWarsMatchesNode` pins it against
what Node actually did.

## 85. The clan branch's team re-roll cannot run, and leaks a timer when it cannot clear

`sockets.js:1201-1208`, in the spawn path's `case 'clan'`:

```js
if (!body.clan) {
    let loop = setInterval(() => {
    for (let e of Config.clan_wars_ft.getClans()) {
            if (body.team !== e.team || body.team !== -101 || body.team !== -1 || body.team !== -2 || body.team !== -3 || body.team !== -4) {
                clearInterval(loop);
            } else body.team = getRandomTeam();
        }
    })
}
```

The guard is five `!==` tests joined by `||`, and a number cannot equal two different
values at once, so at least one of them is true for every possible team. The first clan in
the list therefore clears the interval and the `else` -- the only statement that does
anything -- is unreachable. This is the same shape as the default branch's dead interval
(#72), one arm of the same switch.

The one thing it does do is on the other path: with no clans registered at all the `for`
body never runs, nothing calls `clearInterval`, and a `setInterval` with no delay keeps
firing at 1 ms for the life of the process. Every unnamed player who spawns into a
clan-wars room before any clan exists leaves one behind.

Not ported. `internal/room`'s `SpawnPlayerBody` says so at the line it would have been.

## 86. `getPlayerInfo` and `getSpawn` throw on a tag whose clan was never registered

`clan_wars.js:35-59`. Both read `clan.team` / `clan.partyEntities` straight off the result
of `this.clans.find(...)`:

```js
getSpawn: (name) => {
    let clanCheck = this.checkName(name);
    if (clanCheck) {
        let clan = this.clans.find(o => o.clanName === clanCheck[1]);
        let TheChosenOne = ran.choose(clan.partyEntities);
```

A name with brackets in it takes the known-clan branch whether or not the clan exists, so
`clan` is `undefined` and both throw `TypeError: Cannot read properties of undefined`. The
no-clan fallback beneath them -- a random team, a random spawnable point -- is only reached
by a name with no brackets at all.

Unreachable from the only caller: `sockets.js:1131` calls `add(name)` one line before
either of them, and `add` registers any bracketed tag it has not seen. It is reachable from
anywhere else that ever calls these with a name that has not been through `add`.

Not ported as a panic: `internal/room`'s `ClanWars` answers as the no-clan branch would.
`internal/wire`'s `TestClanWarsMatchesNode` records the throw and states why it does not
replay it -- Node throws before drawing, and the fallback team costs a random number, so
making the call would put the generator one number ahead for every step after it.

## 87. A clan member always spawns below and to the left of the clanmate they spawn on

`clan_wars.js:40-43`:

```js
return {
    x: TheChosenOne.x + (TheChosenOne.size - 12 * 2) * Math.random() - TheChosenOne.size,
    y: TheChosenOne.y + (TheChosenOne.size + 12 * 2) * Math.random() + TheChosenOne.size
};
```

The two lines are meant to be the same expression twice and are not: `x` subtracts `12 * 2`
from the spread and shifts down by `size`, `y` adds it and shifts up. The result is not an
area around the clanmate but a rectangle hanging off one corner of them --
`x ∈ [x₀ - size, x₀ - 24)` and `y ∈ [y₀ + size, y₀ + 2·size + 24)`, which for the default
tank size never contains the clanmate's own position and is never centred on it. A clan
therefore drifts diagonally across the map as it grows, each new member appearing below-left
of the one they anchored to.

The `ran.choose` above it is worth its own line: `irandom(-1)` is `floor(Math.random() * 0)`,
so an empty party costs a draw and then returns `undefined` -- the draw is spent before the
emptiness is noticed, and the fallback then spends two more.

**Ported.** `internal/room`'s `ClanWars.GetSpawn`, with `TestClanWarsMatchesNode` comparing
six consecutive spawns off a two-member clan against Node coordinate for coordinate.

## 88. The "killed you with" list names the wrong tool as soon as one label repeats

`entity.js:1181-1191`, the tail of every death message:

```js
let killCounts = {};
for (let { label } of killTools) {
    if (!killCounts[label]) killCounts[label] = 0;
    killCounts[label]++;
}
let killCountEntries = Object.entries(killCounts).map(([name, count], i) => name);
for (let i = 0; i < killCountEntries.length; i++) {
    killText += (killCounts[killCountEntries[i]] == 1) ? util.addArticle(killTools[i].label) : killCounts[killCountEntries[i]] + ' ' + killCountEntries[i] + 's';
    killText += i < killCountEntries.length - 2 ? ', ' : ' and ';
}
```

The comment above it explains the intent: collapse "a Machine Gunner Bullet and a Machine
Gunner Bullet and a Machine Gunner Bullet" into "3 Machine Gunner Bullets". The plural
branch does that correctly, reading `killCountEntries[i]` — the label.

The singular branch reads `killTools[i].label` instead: the *i*-th kill tool, not the tool
whose label is the *i*-th distinct one. The two indices agree only while every tool in the
collision array has a different label, which is exactly the case the grouping exists to
stop being true. Die to two Machine Gunner Bullets and one Sniper Bullet and the message
reads "2 Machine Gunner Bullets and a Machine Gunner Bullet" — the singular entry names
`killTools[1]`, the second bullet, rather than the sniper round.

The `map(([name, count], i) => name)` on the line above throws away `count` and `i` after
destructuring them, which is the same idea half-written.

`Object.entries` also orders integer-like keys numerically before the string keys, so a
class labelled `"7"` would sort ahead of everything regardless of when it hit. No shipped
definition has such a label.

**Ported.** `internal/wire`'s `deathAnnouncer.appendKillTools` indexes `KillTools[i]` for
the singular case and the label list for the plural one, the same way round.

## 89. A chat log is never deleted, so anyone who has ever spoken costs a frame entry forever

`sockets.js:100-125` against `loaders/global.js:21`'s `global.chats = {}`:

```js
for (let i in chats) {
    chats[i].messages = chats[i].messages.filter((chat) => chat.expires > now);
}
...
if (chats[id]) {
    array.push({ id: id, messages: [] });
```

The expiry filters the *messages*; the entry that holds them is never removed. `chats[id]`
stays truthy for the life of the process, so an entity that said one word fifteen seconds
ago still produces `{"id":123,"messages":[]}` in every chat frame sent to anybody standing
near it — and the object itself is retained, keyed by an id that is never reused.

Two consequences. The frame is bigger than it needs to be, on a loop that fires five times
a second for every client. And the store grows without bound: one entry per entity that has
ever chatted, for as long as the room lives.

The loop also sends unconditionally. A room where nobody has said anything still sends
every client `["CHAT_MESSAGE_ENTITY", "[]"]` five times a second.

**Ported.** `internal/net`'s `Chats` keeps the entry after the messages go, and
`internal/wire`'s `TestChatMatchesNode` pins the empty-entry payload against Node's.

## 90. The list of siblings a promoted Bacteria clone is supposed to cut loose can never have anything in it

`loaders/global.js:682-716`, the branch a Bacteria player takes instead of dying:

```js
let newchildren = player.body.bulletchildren,
    removedchildren = player.body.bulletchildren;

newchildren = newchildren.filter((e) => e.id !== a.id && e !== null && e.master === a.master);
removedchildren = newchildren.filter((e) => e.master !== a.master);
```

`removedchildren` is built from `newchildren`, not from the body's list -- and
`newchildren` has already been filtered down to `master === a.master`. Filtering that for
`master !== a.master` is filtering a set for the negation of the property that defines it,
so `removedchildren` is always empty and the `forEach` under it never runs. The clones the
branch means to orphan and destroy come along with the promoted one instead.

The second line was almost certainly meant to read `player.body.bulletchildren.filter(...)`.
As written the two lines' shared initialiser -- `let newchildren = ..., removedchildren = ...`
pointing at the same array -- is dead: both names are reassigned before either is read.

Two more things the branch does not do. It never touches `master`, so the promoted clone
and every sibling still point at the body that just died -- a reference that outlives the
`entities` map entry, because the JS heap keeps the object alive for as long as anything
names it. And `a` is taken as `bulletchildren[length - 1]` with no check that it is still
alive: a destroyed bullet is still an object, still passes `!== undefined && !== null`, and
is promoted to be the player's body.

**Ported.** `internal/wire`'s `becomeBulletChildren` keeps the empty removal list (as an
absence: nothing is destroyed) and leaves `master` alone. The dead-`a` case cannot arise
here -- a destroyed handle resolves to nothing, so the port falls through to an ordinary
death -- which is the one place this port cannot follow, and is noted in the function's own
comment. `TestBacteriaDeathMatchesNode` pins the surviving siblings, their links and the
promoted clone against Node's, `gen/bacteria-probe-s1.json`.

## 91. The tile-colour refresh the server is written to send can never fire

`js-src/server/miscFiles/color.js:63-70`, `js-src/server/game.js:538-541`

`Color.recompile` ends by raising a flag the room loop is watching for:

```js
if (this.isTile && this.compiled != oldColor) {
    room.sendColorsToClient = true;
}
```

and `roomLoop` clears that flag and calls `sockets.broadcastRoom()`. Neither half can run,
for three independent reasons. `isTile` is the second constructor argument (`color.js:8`)
and no `new Color(...)` in the server passes one, so it is always `undefined`. Tiles do not
hold a `Color` anyway -- `miscFiles/tileEntity.js:17` is `this.color = tile.color`, a plain
string, so a tile recolour never goes through `recompile` at all. And `room` is not declared
in `color.js`, not required there, and not among the globals `loaders/global.js` installs,
so reaching the line would throw `ReferenceError: room is not defined` rather than set
anything. `this.room.sendColorsToClient` at `game.js:538` is therefore permanently
`undefined`, and the `broadcastRoom()` under it never runs.

Nothing is lost in practice: the three gamemodes that recolour tiles call `broadcastRoom()`
themselves from the tail of their `on('dead')` handlers (`dominator.js:81`, `assault.js:46`,
`siege.js:210`), and that is what actually keeps clients in sync.

**Ported as-is.** `internal/entity`'s `Color.IsTile`/`TileColorChanged` keep the flag and
nothing sets or reads it, and `Grid.TickTiles` keeps no check for it, because the check in
the source never passes. The live refresh is `room.Comms.BroadcastRoom`, called from the
same three death reactions.
