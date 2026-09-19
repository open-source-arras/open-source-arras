// Generates golden vectors for the io_* AI controllers by running the real JS classes
// straight out of js-src/server/miscFiles/controllers.js.
//
// Bodies are plain duck-typed objects (same technique as tools/gen-sim-vectors.js):
// everything a controller's constructor or think() reads is set directly as a plain
// property, so real Entity/Room/GameManager machinery never has to boot.
//
// Scope: most controllers covered here have think()s that draw no randomness at all.
// Three do draw -- moveInCircles and fleeAtLowHealth in their constructor,
// hangOutNearMaster inside think() itself -- and an earlier version of this file left
// all three out, on the theory that jsutil.Rand couldn't be made to draw the same
// stream as Math.random(). That stopped being true once jsutil.Rand moved onto
// mulberry32 (internal/jsutil/random.go) and tools/gen-rng-vectors.js proved the two
// sides draw identically from it. TR() below is that same technique: patch
// Math.random to mulberry32 and seed it fresh per case *before* constructing (a
// constructor that draws needs the seed live before `new`, not just before this
// file's initial require -- see tools/gen-rng-vectors.js's own header), then record
// the cumulative draw count either side of every construct/think() call, not just
// the values it produced. The rest of the 32 -- the ones still missing here -- depend
// on a connected player, room geometry, or a candidate/wall pool this duck-typed
// harness has nothing to stand in for; internal/ctrl's test file headers say which
// and why for each.
//
// Output: gen/ctrl-vectors.json, and the same object printed to stdout.
//
// Run with:  node tools/gen-ctrl-vectors.js


// Math.pow in Node is the host's libm unless this flag is set, so reference
// output captured without it is specific to the machine that produced it.
// See tools/fdlibm-pow.js.
require('./fdlibm-pow');
const path = require('path');
const fs = require('fs');

const ROOT = path.resolve(__dirname, '..');
const SRC = path.join(ROOT, 'js-src', 'server');

// loaders/global.js installs Config/util/ran/grid cleanly on its own (confirmed by
// tools/gen-sim-vectors.js's own comment) -- no need to boot the whole game.
require(path.join(SRC, 'loaders', 'global.js'));
Object.assign(global.Config, {
  run_speed: 1.5,
  bullet_spawn_offset: 0.65,
});
global.gameManager = {
  roomSpeed: 1,
  runSpeed: 1.5,
  room: { width: 6300, height: 6300, center: { x: 0, y: 0 } },
};

const { ioTypes } = require(path.join(SRC, 'miscFiles', 'controllers.js'));

const cases = [];
function T(name, fn) {
  let result = null, err = null;
  try {
    result = fn();
  } catch (e) {
    err = String(e && e.message ? e.message : e);
  }
  cases.push({ name, result: serialise(result), err });
}

function serialise(v) {
  if (v == null) return v;
  if (typeof v === 'number') {
    if (Number.isNaN(v)) return { __num: 'nan' };
    if (!Number.isFinite(v)) return { __num: v > 0 ? 'inf' : '-inf' };
    return v;
  }
  if (Array.isArray(v)) return v.map(serialise);
  if (typeof v === 'object') {
    const out = {};
    for (const k of Object.keys(v)) out[k] = serialise(v[k]);
    return out;
  }
  return v;
}

// v is a minimal Vector-shaped {x,y} plain object -- every controller here only ever
// reads .x/.y off targets/goals, never calls a Vector method on them.
const v = (x, y) => ({ x, y });

// mulberry32/rngCalls/seedRandom/TR: infrastructure for the three RNG-drawing cases
// below (moveInCircles/hangOutNearMaster/fleeAtLowHealth). Same generator as
// tools/gen-rng-vectors.js, copied rather than shared, since that file intentionally
// has no exports (it is a standalone script, like this one).
function mulberry32(a) {
  return function () {
    rngCalls++;
    a |= 0; a = a + 0x6D2B79F5 | 0;
    var t = Math.imul(a ^ a >>> 15, 1 | a);
    t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t;
    return ((t ^ t >>> 14) >>> 0) / 4294967296;
  };
}
let rngCalls = 0;
const realMathRandom = Math.random;

// seedRandom reseeds AND zeroes the draw counter, so every TR() case's counts start
// fresh at 0 -- cases don't need to agree on a shared running total, only on their own.
function seedRandom(s) {
  rngCalls = 0;
  Math.random = mulberry32(s);
}

// TR is T, but for a case whose constructor and/or think() draws randomness: it seeds
// fresh before calling fn (so a constructor-time draw sees the seed already live --
// the ordering trap tools/gen-rng-vectors.js's header warns about), then restores the
// real Math.random afterwards so a later plain T() case never draws from mulberry32 by
// accident. fn is expected to return a plain object recording drawsBefore/drawsAfter
// around every construct/think() call it makes, not just the values -- see the three
// call sites below for the shape.
function TR(name, seed, fn) {
  seedRandom(seed);
  let result = null, err = null;
  try {
    result = fn();
  } catch (e) {
    err = String(e && e.message ? e.message : e);
  } finally {
    Math.random = realMathRandom;
  }
  cases.push({ name, seed, result: serialise(result), err });
}

// -- io_doNothing --
T('doNothing/basic', () => {
  const b = { x: 12.5, y: -7 };
  return new ioTypes.doNothing(b).think();
});

// -- io_alwaysFire --
T('alwaysFire/basic', () => new ioTypes.alwaysFire({}).think());

// -- io_targetSelf --
T('targetSelf/basic', () => new ioTypes.targetSelf({}).think());

// -- io_mapAltToFire --
T('mapAltToFire/altTrue', () => new ioTypes.mapAltToFire({}).think({ alt: true }));
T('mapAltToFire/altFalse', () => new ioTypes.mapAltToFire({}).think({ alt: false }));
T('mapAltToFire/altUndefined', () => new ioTypes.mapAltToFire({}).think({}));

// -- io_mapFireToAlt --
T('mapFireToAlt/fireNoGuns', () => new ioTypes.mapFireToAlt({ gunsArrayed: [] }).think({ fire: true }));
T('mapFireToAlt/fireAltFireGun', () =>
  new ioTypes.mapFireToAlt({ gunsArrayed: [{ altFire: false }, { altFire: true }] }).think({ fire: true }));
T('mapFireToAlt/onlyIfHasAltFireGun_none', () =>
  new ioTypes.mapFireToAlt({ gunsArrayed: [{ altFire: false }] }, { onlyIfHasAltFireGun: true }).think({ fire: true }));
T('mapFireToAlt/noFire', () => new ioTypes.mapFireToAlt({ gunsArrayed: [{ altFire: true }] }).think({ fire: false }));

// -- io_onlyAcceptInArc --
T('onlyAcceptInArc/insideArc', () =>
  new ioTypes.onlyAcceptInArc({ firingArc: [0, 1] }).think({ target: v(1, 0) }));
T('onlyAcceptInArc/outsideArc', () =>
  new ioTypes.onlyAcceptInArc({ firingArc: [0, 0.1] }).think({ target: v(0, 1) }));
T('onlyAcceptInArc/noTarget', () => new ioTypes.onlyAcceptInArc({ firingArc: [0, 1] }).think({}));

// -- io_mapTargetToGoal --
T('mapTargetToGoal/main', () =>
  new ioTypes.mapTargetToGoal({ x: 100, y: 200 }).think({ main: true, target: v(5, -5) }));
T('mapTargetToGoal/altOnly', () =>
  new ioTypes.mapTargetToGoal({ x: 0, y: 0 }).think({ alt: true, target: v(3, 4) }));
T('mapTargetToGoal/neither', () =>
  new ioTypes.mapTargetToGoal({ x: 0, y: 0 }).think({ target: v(3, 4) }));

// -- io_canRepel --
T('canRepel/altAndTarget', () => {
  const b = { x: 10, y: 10, master: { master: { x: 0, y: 0 } } };
  return new ioTypes.canRepel(b).think({ alt: true, target: v(7, -2) });
});
T('canRepel/noAlt', () => {
  const b = { x: 10, y: 10, master: { master: { x: 0, y: 0 } } };
  return new ioTypes.canRepel(b).think({ alt: false, target: v(7, -2) });
});

// -- io_stackGuns --
// calculator: "fixed reload" makes reloadStat always resolve to 1 (controllers.js:413)
// without needing a real Skill/bulletStats object -- Context.GunInfo.ReloadStat is
// already the pre-resolved number on the Go side, so the Go test just uses 1 too.
function gun(over) { return Object.assign({ canShoot: true, stack: true, cycle: 0.5, angle: 0, calculator: 'fixed reload', settings: { reload: 1 } }, over); }
T('stackGuns/picksLowestReadiness', () => {
  const b = { guns: [gun({ cycle: 0.9, angle: 0.3 }), gun({ cycle: 0.1, angle: -0.2 })] };
  return new ioTypes.stackGuns(b).think({ target: v(10, 0) });
});
T('stackGuns/skipsNonStack', () => {
  const b = { guns: [gun({ stack: false, cycle: 0.99 }), gun({ cycle: 0.5, angle: 0.1 })] };
  return new ioTypes.stackGuns(b).think({ target: v(0, 10) });
});
T('stackGuns/noTarget', () => new ioTypes.stackGuns({ guns: [] }).think({}));
T('stackGuns/timeUntilFireBlocks', () => {
  const b = { guns: [gun({ cycle: 0.5 })] };
  return new ioTypes.stackGuns(b, { timeUntilFire: 100 }).think({ target: v(1, 0) });
});

// -- io_spin --
T('spin/default', () => new ioTypes.spin({}).think({}));
T('spin/customSpeedAndStart', () => new ioTypes.spin({}, { startAngle: 1, speed: 0.1 }).think({}));
T('spin/onlyWhenIdle_withTarget', () =>
  new ioTypes.spin({}, { onlyWhenIdle: true }).think({ target: v(0, 5), fire: true }));
T('spin/independentBonded', () => {
  const b = { bond: 1, bound: { angle: 0.5 } };
  return new ioTypes.spin(b, { independent: true, startAngle: 0.2, speed: 0 }).think({});
});

// -- io_spin2 --
T('spin2/constructNoAlt', () => {
  const b = { master: { control: { alt: false } } };
  const io = new ioTypes.spin2(b, { speed: 0.1 });
  return { facingType: b.facingType, facingTypeArgs: b.facingTypeArgs };
});
T('spin2/constructAltReversed', () => {
  const b = { master: { control: { alt: true } } };
  const io = new ioTypes.spin2(b, { speed: 0.1 });
  return { facingType: b.facingType, facingTypeArgs: b.facingTypeArgs };
});
T('spin2/thinkFlipsOnAltChange', () => {
  const b = { master: { control: { alt: false } } };
  const io = new ioTypes.spin2(b, { speed: 0.1, reverseOnTheFly: true });
  b.master.control.alt = true;
  io.think({});
  return { facingType: b.facingType, facingTypeArgs: b.facingTypeArgs };
});
T('spin2/thinkNoOpWithoutReverseOnTheFly', () => {
  const b = { master: { control: { alt: false } }, facingType: 'x', facingTypeArgs: { speed: 999 } };
  const io = new ioTypes.spin2(b, { speed: 0.1 });
  b.facingType = 'x'; b.facingTypeArgs = { speed: 999 }; // overwrite ctor's own seed to detect a no-op
  b.master.control.alt = true;
  io.think({});
  return { facingType: b.facingType, facingTypeArgs: b.facingTypeArgs };
});

// -- io_zoom --
T('zoom/altWithTarget_freshOverride', () => {
  const b = { x: 100, y: 100, cameraOverrideX: null };
  new ioTypes.zoom(b, { distance: 50 }).think({ alt: true, target: v(1, 0) });
  return { x: b.cameraOverrideX, y: b.cameraOverrideY };
});
T('zoom/notAlt_clears', () => {
  const b = { x: 100, y: 100, cameraOverrideX: 5, cameraOverrideY: 6 };
  new ioTypes.zoom(b).think({});
  return { x: b.cameraOverrideX, y: b.cameraOverrideY };
});
T('zoom/dynamicRecomputes', () => {
  const b = { x: 0, y: 0, cameraOverrideX: 999, cameraOverrideY: 999 };
  new ioTypes.zoom(b, { distance: 10, dynamic: true }).think({ alt: true, target: v(0, 1) });
  return { x: b.cameraOverrideX, y: b.cameraOverrideY };
});
// permanent=true with no input.target at all is an implicit precondition the JS
// crashes on (Math.atan2(input.target.y,...) reads .y off undefined) -- not a
// reachable case worth pinning; every real permanent-zoom definition pairs it with a
// controller upstream that always supplies a target. Exercise permanent with a target
// present instead, which is the case that actually matters.
T('zoom/permanentWithTarget', () => {
  const b = { x: 0, y: 0, cameraOverrideX: null };
  new ioTypes.zoom(b, { distance: 10, permanent: true }).think({ target: v(0, 3) });
  return { x: b.cameraOverrideX, y: b.cameraOverrideY };
});

// -- io_formulaTarget --
T('formulaTarget/defaultSine_twoFrames', () => {
  const b = { x: 10, y: 20, facing: 0 };
  const io = new ioTypes.formulaTarget(b);
  io.think();
  return io.think();
});
T('formulaTarget/masterAngle', () => {
  const b = { x: 0, y: 0, facing: 1, master: { facing: 2 } };
  const io = new ioTypes.formulaTarget(b, { masterAngle: true });
  return io.think();
});

// -- io_scaleWithMaster --
T('scaleWithMaster/changes', () => {
  const b = { size: 20, master: { size: 40 } };
  new ioTypes.scaleWithMaster(b).think();
  return { SIZE: b.SIZE };
});
T('scaleWithMaster/unchangedSkipsWrite', () => {
  const b = { size: 20, master: { size: 0 }, SIZE: 777 };
  new ioTypes.scaleWithMaster(b).think();
  return { SIZE: b.SIZE }; // storedSize starts 0 === master.size(0), so no write
});

// -- io_whirlwind --
T('whirlwind/constructDefaults', () => {
  const b = { size: 10, skill: { spd: 0 }, aiSettings: { SPEED: 0 } };
  new ioTypes.whirlwind(b);
  return { angle: b.angle, dist: b.dist, inverseDist: b.inverseDist, useOwnMaster: b.useOwnMaster };
});
T('whirlwind/thinkFireGrows', () => {
  const b = { size: 10, skill: { spd: 1 }, aiSettings: { SPEED: 5 } };
  new ioTypes.whirlwind(b, { radiusScalingSpeed: 3 }).think({ fire: true });
  return { angle: b.angle, dist: b.dist, inverseDist: b.inverseDist };
});
T('whirlwind/thinkAltShrinks', () => {
  const b = { size: 10, skill: { spd: 1 }, aiSettings: { SPEED: 5 } };
  new ioTypes.whirlwind(b, { radiusScalingSpeed: 3 }).think({ alt: true });
  return { angle: b.angle, dist: b.dist, inverseDist: b.inverseDist };
});

// -- io_orbit --
T('orbit/basic', () => {
  const master = { angle: 0, dist: 50, inverseDist: 20, x: 100, y: 100, useOwnMaster: false };
  const grandmaster = { angle: 90, dist: 70, inverseDist: 30, x: 200, y: 200 };
  master.master = grandmaster;
  const b = { angle: 45, master };
  const io = new ioTypes.orbit(b);
  io.think({});
  return { x: b.x, y: b.y, facing: b.facing };
});
T('orbit/useOwnMaster', () => {
  const master = { angle: 10, dist: 15, inverseDist: 5, x: 0, y: 0, useOwnMaster: true };
  const b = { angle: 0, master };
  const io = new ioTypes.orbit(b);
  io.think({});
  return { x: b.x, y: b.y, facing: b.facing };
});
T('orbit/inverted', () => {
  const master = { angle: 0, dist: 50, inverseDist: 20, x: 0, y: 0, useOwnMaster: false };
  const grandmaster = { angle: 0, dist: 0, inverseDist: 0, x: 0, y: 0 };
  master.master = grandmaster;
  const b = { angle: 0, master };
  const io = new ioTypes.orbit(b, { invert: true });
  io.think({});
  return { x: b.x, y: b.y, facing: b.facing };
});

// -- io_boomerang --
T('boomerang/beforeTurnover', () => {
  const master = { x: 50, y: 50, control: { target: v(2, 0) } };
  const b = { range: 0, master };
  const io = new ioTypes.boomerang(b);
  return io.think({});
});
T('boomerang/afterTurnover', () => {
  const master = { x: 70, y: 80, control: { target: v(2, 0) } };
  const b = { range: 10, master };
  const io = new ioTypes.boomerang(b);
  io.think({}); // range(10) > r(0) => r=10, no turnover yet (needs r*0.5=5 boundary)
  b.range = 4; // r stays 10 (4 is not > 10); turnover flips true THIS call, but the
  // return still comes from the not-yet-turned-over branch (checked before the flip)
  io.think({});
  master.x = 99; master.y = 88; // move the master so the branch is visible
  return io.think({}); // now genuinely in the turned-over branch
});

// -- io_goToMasterTarget --
T('goToMasterTarget/farFromGoal', () => {
  const master = { x: 0, y: 0, control: { target: v(30, 40) }, reverseTank: 1 };
  const b = { x: 500, y: 500, master };
  return new ioTypes.goToMasterTarget(b).think();
});
T('goToMasterTarget/reachedGoal_countsDown', () => {
  const master = { x: 0, y: 0, control: { target: v(0, 0) }, reverseTank: 1 };
  const b = { x: 0, y: 0, master };
  const io = new ioTypes.goToMasterTarget(b);
  for (let i = 0; i < 5; i++) io.think();
  return io.think(); // countdown exhausted -> undefined
});

// -- io_disableOnOverride --
T('disableOnOverride/pacifyThenRelease', () => {
  const grand = { autoOverride: false };
  const parentMaster = { autoOverride: false, master: grand };
  const parent = { master: parentMaster };
  const b = { parent, alpha: 1, DAMAGE: 40, refreshBodyAttributes: () => {} };
  const io = new ioTypes.disableOnOverride(b);
  io.think({});
  parentMaster.autoOverride = true;
  for (let i = 0; i < 30; i++) io.think({});
  const pacified = { alpha: b.alpha, DAMAGE: b.DAMAGE };
  parentMaster.autoOverride = false;
  for (let i = 0; i < 30; i++) io.think({});
  return { pacified, released: { alpha: b.alpha, DAMAGE: b.DAMAGE } };
});
T('disableOnOverride/grandOverride', () => {
  const grand = { autoOverride: true };
  const parentMaster = { autoOverride: false, master: grand };
  const parent = { master: parentMaster };
  const b = { parent, alpha: 1, DAMAGE: 10, refreshBodyAttributes: () => {} };
  const io = new ioTypes.disableOnOverride(b);
  for (let i = 0; i < 30; i++) io.think({});
  return { alpha: b.alpha, DAMAGE: b.DAMAGE };
});

// -- io_snake --
function snakeBody(rangeNow, RANGE) {
  const grandmaster = { control: { target: v(30, 0) } };
  const master = { control: { alt: false }, facing: 0, master: grandmaster };
  return {
    x: 0, y: 0, size: 10, velocity: { direction: 0 },
    RANGE, range: rangeNow, master,
  };
}
T('snake/constructAndOneStep', () => {
  const b = snakeBody(100, 100);
  const io = new ioTypes.snake(b);
  const afterCtor = { x: b.x, y: b.y };
  io.think({});
  return { afterCtor, afterStep: { x: b.x, y: b.y } };
});
T('snake/severalSteps', () => {
  const b = snakeBody(80, 100);
  const io = new ioTypes.snake(b);
  for (let i = 0; i < 4; i++) { b.range -= 5; io.think({}); }
  return { x: b.x, y: b.y };
});

// -- io_snakeTillNot --
T('snakeTillNot/stepsWhenFlagFalse', () => {
  const b = snakeBody(90, 100);
  const io = new ioTypes.snakeTillNot(b);
  io.think({});
  return { x: b.x, y: b.y, flag: b.dontEverDareToDoThatSnakeShitEverAgainYouPieceOfShit };
});
T('snakeTillNot/staysPutWhenFlagTrue', () => {
  const b = snakeBody(90, 100);
  b.dontEverDareToDoThatSnakeShitEverAgainYouPieceOfShit = true;
  const io = new ioTypes.snakeTillNot(b);
  const before = { x: b.x, y: b.y };
  io.think({});
  return { before, after: { x: b.x, y: b.y } };
});

// -- io_oroboros --
T('oroboros/flyThenCircle', () => {
  const master = { control: { target: v(10, 0) }, x: 0, y: 0 };
  const b = { x: 0, y: 0, master, skill: { raw: [0, 0, 0, 0, 9] }, facing: 0 };
  const io = new ioTypes.oroboros(b, { range: 5, speed: 0.5 });
  const r1 = io.think({}); // still within range -> goal
  b.x = 50; b.y = 0; // now far enough to trigger circling
  io.think({});
  return { r1, afterCircle: { x: b.x, y: b.y, facing: b.facing, flag: b.dontEverDareToDoThatSnakeShitEverAgainYouPieceOfShit } };
});

// -- io_moveInCircles (controllers.js:138-164) -- the constructor draws irandom(5)+
// random(2pi) (timer, pathAngle); think() itself draws nothing, but the timer/
// pathAngle/goal it set at construction (or at the last reset) carry across ticks --
// `!this.timer--` only fires the reset-and-reroll block on the tick the *pre*-
// decrement timer hits zero, and the goal that reset computes uses pathAngle from
// *before* this same reset mutates it for next time. A single think() call cannot
// show any of that, so this drives several and snapshots the instance's own fields
// every tick, not just the returned goal.
function moveInCirclesCase(x, y, velocityLength, acceleration, ticks) {
  return () => {
    const b = { x, y, velocity: { length: velocityLength }, ACCELERATION: acceleration };
    const io = new ioTypes.moveInCircles(b);
    const construct = {
      drawsAfter: rngCalls,
      timer: io.timer, pathAngle: io.pathAngle, goal: { x: io.goal.x, y: io.goal.y },
    };
    const thinks = [];
    for (let i = 0; i < ticks; i++) {
      const drawsBefore = rngCalls;
      const out = io.think();
      thinks.push({
        drawsBefore, drawsAfter: rngCalls,
        timer: io.timer, pathAngle: io.pathAngle, goal: { x: io.goal.x, y: io.goal.y },
        power: out.power,
      });
    }
    return { setup: { x, y, velocityLength, acceleration }, construct, thinks };
  };
}
TR('moveInCircles/lowAccel', 1, moveInCirclesCase(10, 20, 90, 0, 20));
TR('moveInCircles/highAccel', 42, moveInCirclesCase(10, 20, 90, 5, 20));

// -- io_hangOutNearMaster (controllers.js:826-869) -- no randomness in the
// constructor, but think() draws a variable 0/2/3 depending on whether this tick
// rerolls currentGoal (dist > bound2, OR a lingering timer > 30 -- two independent
// ways in) and separately whether it rolls the 30%-chance timer++ (only when
// dist < bound2). And whichever branch just rerolled currentGoal, the goal THIS tick
// returns is a snapshot from *before* that reroll -- the fresh point only surfaces on
// the *next* call. Three scenarios exercise the three ways this plays out:
//   - farAlwaysRerolls: dist stays far past bound2 for the whole run, so every tick
//     rerolls (2 draws/tick) and the returned goal is always one tick stale.
//   - closeTimerReroll: dist stays comfortably under bound2 (1 draw/tick, from the
//     30%-chance test) until the timer itself climbs past 30 and forces a reroll
//     (3 draws that tick) even though distance alone never asked for one.
//   - transitionFarToClose: dist starts past bound2 and is walked down below it over
//     the run, so the draws-per-tick count itself flips from 2 to 1 partway through --
//     exactly the kind of shift a wrong draw count elsewhere would also produce, so
//     this is the case most likely to catch that failure mode by accident if the other
//     two didn't.
function hangOutCase(bodyX, bodyY, bodySize, sourceX, sourceY, sourceSize, velX, velY, ticks, moveBodyXBy) {
  return () => {
    const source = { x: sourceX, y: sourceY, size: sourceSize };
    const b = { x: bodyX, y: bodyY, size: bodySize, source, invisible: [0, 0], velocity: { x: velX, y: velY } };
    const io = new ioTypes.hangOutNearMaster(b);
    const construct = { goal: { x: io.currentGoal.x, y: io.currentGoal.y } };
    const thinks = [];
    for (let i = 0; i < ticks; i++) {
      const drawsBefore = rngCalls;
      const out = io.think({});
      thinks.push({
        bodyX: b.x,
        drawsBefore, drawsAfter: rngCalls,
        timer: io.timer, goal: { x: io.currentGoal.x, y: io.currentGoal.y },
        out,
      });
      if (moveBodyXBy) { b.x += moveBodyXBy; if (b.x < 5) b.x = 5; }
    }
    return {
      setup: { bodyX, bodyY, bodySize, sourceX, sourceY, sourceSize, velX, velY },
      construct, thinks,
    };
  };
}
TR('hangOutNearMaster/farAlwaysRerolls', 5, hangOutCase(500, 0, 10, 0, 0, 10, 1, 2, 10, 0));
TR('hangOutNearMaster/closeTimerReroll', 13, hangOutCase(5, 0, 10, 0, 0, 10, 3, 4, 90, 0));
TR('hangOutNearMaster/transitionFarToClose', 21, hangOutCase(500, 0, 10, 0, 0, 10, 1, 2, 30, -20));

// -- io_fleeAtLowHealth (controllers.js:921-937) -- the constructor draws
// gauss(0.7,0.15) (two draws) and clamps it into [0.1,0.9]; think() itself draws
// nothing, but the clamped fear it latched at construction has to keep being read
// back correctly, tick after tick, against a health/fire/target combination that
// changes every call. seed=1 lands on the clamp's upper edge (fear pins to exactly
// 0.9, proving the clamp fires rather than just passing gauss's raw draw through);
// seed=2 lands on an interior, unclamped value, for contrast.
function fleeCase(x, y, ticks) {
  return () => {
    const b = { x, y };
    const io = new ioTypes.fleeAtLowHealth(b);
    const construct = { drawsAfter: rngCalls, fear: io.fear };
    const thinks = [];
    for (const t of ticks) {
      b.health = { amount: t.healthAmount, max: t.healthMax };
      const drawsBefore = rngCalls;
      const out = io.think({ fire: t.fire, target: t.target });
      thinks.push({
        healthAmount: t.healthAmount, healthMax: t.healthMax, fire: t.fire, target: t.target,
        drawsBefore, drawsAfter: rngCalls, out,
      });
    }
    return { setup: { x, y }, construct, thinks };
  };
}
TR('fleeAtLowHealth/clampedHighFear', 1, fleeCase(10, 10, [
  { healthAmount: 100, healthMax: 100, fire: true, target: v(1, 0) },
  { healthAmount: 80, healthMax: 100, fire: false, target: v(1, 0) },
  { healthAmount: 80, healthMax: 100, fire: true, target: null },
  { healthAmount: 80, healthMax: 100, fire: true, target: v(1, 0) },
  { healthAmount: 95, healthMax: 100, fire: true, target: v(0, 2) },
  { healthAmount: 1, healthMax: 100, fire: true, target: v(-3, 4) },
]));
TR('fleeAtLowHealth/interiorFear', 2, fleeCase(20, -15, [
  { healthAmount: 50, healthMax: 100, fire: true, target: v(5, 5) },
  { healthAmount: 58, healthMax: 100, fire: true, target: v(5, 5) },
  { healthAmount: 60, healthMax: 100, fire: true, target: v(2, -1) },
]));

// -- vector.js's timeOfImpact (the module-level geometry helper internal/ctrl's
// geometry.go ports as timeOfImpact -- pure, and exported, so worth pinning even
// though it's not one of the 32 io_* classes). --
const { timeOfImpact } = require(path.join(SRC, 'game', 'entities', 'vector.js'));
T('timeOfImpact/headOn', () => timeOfImpact(v(100, 0), v(-20, 0), 30));
T('timeOfImpact/perpendicular', () => timeOfImpact(v(50, 50), v(10, -5), 20));
T('timeOfImpact/equalSpeedLinear', () => timeOfImpact(v(100, 0), v(-30, 0), 30));
T('timeOfImpact/noSolution', () => timeOfImpact(v(100, 0), v(30, 0), 5));
T('timeOfImpact/receding', () => timeOfImpact(v(100, 0), v(30, 0), 30));

const dest = path.join(ROOT, 'gen', 'ctrl-vectors.json');
fs.mkdirSync(path.dirname(dest), { recursive: true });
fs.writeFileSync(dest, JSON.stringify(cases, null, 1));
console.log(JSON.stringify(cases, null, 1));
console.log(`\n${cases.length} vectors written to ${path.relative(ROOT, dest)}`);
