// Generates golden vectors for the simulation core by running the real JS.
//
// It requires js-src/server/miscFiles/collisionFunctions.js and the real
// Entity.prototype methods, installs the globals those files reach for, and calls them
// on duck-typed bodies. The Go port in internal/sim is checked against these results
// rather than against anyone's reading of the source.
//
// Bodies here are plain objects with the same fields the real Entity carries. The two
// derived quantities the collision code reads through getters — size and realSize —
// are installed with Object.defineProperty so they shadow the prototype accessors
// without dragging in the whole definition table.
//
// Output: gen/sim-vectors.json
//
// Run with:  node tools/gen-sim-vectors.js


// Math.pow in Node is the host's libm unless this flag is set, so reference
// output captured without it is specific to the machine that produced it.
// See tools/fdlibm-pow.js.
require('./fdlibm-pow');
const path = require('path');
const fs = require('fs');

const ROOT = path.resolve(__dirname, '..');
const SRC = path.join(ROOT, 'js-src', 'server');

const ROOM_SPEED = 1;   // gameManager.roomSpeed = Config.game_speed
const RUN_SPEED = 1.5;  // gameManager.runSpeed  = Config.run_speed

// loaders/global.js installs Config, util, ran, the grid and — the reason it is here —
// global.runMove and global.runFace, which entity.js:956-958 delegate to. It requires
// cleanly on its own, so the whole game does not have to boot for these vectors.
require(path.join(SRC, 'loaders', 'global.js'));

const vectorModule = require(path.join(SRC, 'game', 'entities', 'vector.js'));
global.Vector = vectorModule.Vector;
Object.assign(global.Config, {
  run_speed: RUN_SPEED,
  game_speed: ROOM_SPEED,
  room_bound_force: 0.01,
  damage_multiplier: 1,
  knockback_multiplier: 0.75,
  round_arena: false,
});
global.gameManager = {
  roomSpeed: ROOM_SPEED,
  runSpeed: RUN_SPEED,
  room: { width: 6300, height: 6300 },
};
const subFunctions = require(path.join(SRC, 'game', 'entities', 'subFunctions.js'));
global.lazyRealSizes = subFunctions.lazyRealSizes;

const { HealthType } = require(path.join(SRC, 'game', 'entities', 'healthType.js'));
const cf = require(path.join(SRC, 'miscFiles', 'collisionFunctions.js'));
const { Entity } = require(path.join(SRC, 'game', 'entities', 'entity.js'));

let nextId = 1;

// body builds one duck-typed entity. Everything the ported functions read has a
// default here, so a scenario only names what it actually cares about.
function body(over = {}) {
  const o = {
    id: over.id != null ? over.id : nextId++,
    label: '',
    type: 'tank',
    team: 1,
    shape: 0,
    walltype: 0,

    x: 0,
    y: 0,
    velocity: new global.Vector(0, 0),
    accel: new global.Vector(0, 0),
    stepRemaining: 1,

    SIZE: 10,
    FOV: 1,
    sizeMultiplier: 1,

    acceleration: 1,
    topSpeed: 10,
    maxSpeed: 10,
    damp: 0.05,
    density: 1,
    penetration: 1,
    damage: 1,
    pushability: 1,
    knockback: 0,
    intangibility: 0,
    heteroMultiplier: 0,
    range: 0,
    RANGE: 0,
    damageReceived: 0,
    alpha: 1,

    facing: 0,
    vfacing: 0,
    firingArc: [0, 360],
    reverseTank: 1,
    isPlayer: false,
    eastereggs: { braindamage: false },
    lastMovementTime: 1000,
    lastFiredTime: 1000,
    motionType: '',
    motionTypeArgs: {},
    facingType: '',
    facingTypeArgs: {},
    control: { target: new vectorModule.Vector(0, 0), goal: { x: 0, y: 0 }, main: false, alt: false, fire: false, power: 1 },
    invuln: false,
    godmode: false,
    healer: false,
    isArenaCloser: false,
    ac: false,
    collisionArray: [],
    originalSize: undefined,
    originalFov: undefined,
    touchingSizeWall: undefined,
    touchingFovWall: undefined,
    store: {},

    settings: {
      canGoOutsideRoom: false,
      ratioEffects: false,
      damageEffects: false,
      motionEffects: false,
      damageClass: 0,
      buffVsFood: false,
      necroTypes: [],
      hitsOwnType: '',
    },
  };
  Object.assign(o, over);
  if (over.settings) o.settings = Object.assign({}, o.settings, over.settings);
  o.master = over.master || o;
  o.health = over.health || new HealthType(100, 'static', 0);
  o.shield = over.shield || new HealthType(0, 'dynamic', 0);

  // size and realSize are prototype getters on a real Entity. entity.js:681 reduces to
  // SIZE * sizeMultiplier for a level-0 body with no coreSize and no HEALTH_WITH_LEVEL,
  // which is what every scenario here is; keeping it live rather than frozen matters,
  // because mazewallcustomcollide changes SIZE mid-call and then reads size again.
  Object.defineProperty(o, 'size', {
    get() { return o.SIZE * o.sizeMultiplier; },
    configurable: true,
  });
  Object.defineProperty(o, 'realSize', {
    get() { return o.size * global.lazyRealSizes[Math.floor(Math.abs(o.shape))]; },
    configurable: true,
  });
  Object.defineProperty(o, 'mass', {
    get() { return o.density * (o.size ** 2 + 1); },
    configurable: true,
  });
  Object.defineProperty(o, 'xMotion', {
    get() { return (o.velocity.x + o.accel.x) / global.gameManager.roomSpeed; },
    configurable: true,
  });
  Object.defineProperty(o, 'yMotion', {
    get() { return (o.velocity.y + o.accel.y) / global.gameManager.roomSpeed; },
    configurable: true,
  });
  o.damageMultiplier = Entity.prototype.damageMultiplier.bind(o);
  o.isDead = () => o.health.amount <= 0;
  o.kill = () => { o.invuln = false; o.godmode = false; o.health.amount = -100; };
  o.destroy = () => { o.destroyed = true; };
  o.necro = () => false;
  return o;
}

// num keeps non-finite values visible instead of letting JSON.stringify turn them
// into null, the same way the differential harness does.
function num(v) {
  if (typeof v !== 'number') return v;
  if (Number.isNaN(v)) return 'NaN';
  if (v === Infinity) return 'Infinity';
  if (v === -Infinity) return '-Infinity';
  return v;
}

// full records the complete input state of a body, so the Go test can rebuild it
// field for field rather than guessing at the defaults this file happens to use.
function full(o) {
  return {
    id: o.id,
    label: o.label,
    type: o.type,
    team: o.team,
    shape: num(o.shape),
    walltype: o.walltype,

    x: num(o.x),
    y: num(o.y),
    vx: num(o.velocity.x),
    vy: num(o.velocity.y),
    ax: num(o.accel.x),
    ay: num(o.accel.y),
    stepRemaining: num(o.stepRemaining),

    SIZE: num(o.SIZE),
    sizeMultiplier: num(o.sizeMultiplier),
    FOV: num(o.FOV),

    acceleration: num(o.acceleration),
    topSpeed: num(o.topSpeed),
    maxSpeed: num(o.maxSpeed),
    damp: num(o.damp),
    density: num(o.density),
    penetration: num(o.penetration),
    damage: num(o.damage),
    pushability: num(o.pushability),
    knockback: num(o.knockback),
    intangibility: num(o.intangibility),
    heteroMultiplier: num(o.heteroMultiplier),
    range: num(o.range),
    RANGE: num(o.RANGE),
    damageReceived: num(o.damageReceived),
    alpha: num(o.alpha),

    healer: o.healer,
    isArenaCloser: o.isArenaCloser,
    ac: o.ac,
    invuln: o.invuln,
    godmode: o.godmode,
    isPlayer: !!o.isPlayer,
    braindamage: !!o.eastereggs.braindamage,

    facing: num(o.facing),
    reverseTank: num(o.reverseTank),
    firingArc: [num(o.firingArc[0]), num(o.firingArc[1])],
    lastMovementTime: num(o.lastMovementTime),
    lastFiredTime: num(o.lastFiredTime),

    motionType: o.motionType,
    motionTypeArgs: {
      speed: o.motionTypeArgs.speed === undefined ? null : num(o.motionTypeArgs.speed),
      damp: o.motionTypeArgs.damp === undefined ? null : num(o.motionTypeArgs.damp),
      turnVelocity: o.motionTypeArgs.turnVelocity === undefined ? null : num(o.motionTypeArgs.turnVelocity),
      keepSpeed: !!o.motionTypeArgs.keepSpeed,
    },
    facingType: o.facingType,
    facingTypeArgs: {
      angle: o.facingTypeArgs.angle === undefined ? null : num(o.facingTypeArgs.angle),
      multiplier: o.facingTypeArgs.multiplier === undefined ? null : num(o.facingTypeArgs.multiplier),
      smoothness: o.facingTypeArgs.smoothness === undefined ? null : num(o.facingTypeArgs.smoothness),
      speed: o.facingTypeArgs.speed === undefined ? null : num(o.facingTypeArgs.speed),
    },
    control: {
      targetX: num(o.control.target.x),
      targetY: num(o.control.target.y),
      goalX: num(o.control.goal.x),
      goalY: num(o.control.goal.y),
      main: !!o.control.main,
      alt: !!o.control.alt,
      fire: !!o.control.fire,
      power: num(o.control.power),
    },

    health: { max: num(o.health.max), amount: num(o.health.amount), type: o.health.type, resist: num(o.health.resist), regen: num(o.health.regen) },
    shield: { max: num(o.shield.max), amount: num(o.shield.amount), type: o.shield.type, resist: num(o.shield.resist), regen: num(o.shield.regen) },

    settings: {
      canGoOutsideRoom: !!o.settings.canGoOutsideRoom,
      ratioEffects: !!o.settings.ratioEffects,
      damageEffects: !!o.settings.damageEffects,
      motionEffects: !!o.settings.motionEffects,
      damageClass: o.settings.damageClass | 0,
      buffVsFood: !!o.settings.buffVsFood,
      necroTypes: o.settings.necroTypes || [],
      hitsOwnType: o.settings.hitsOwnType || '',
    },
  };
}

// snap records everything a resolver can move on one body.
function snap(o) {
  return {
    x: num(o.x),
    y: num(o.y),
    vx: num(o.velocity.x),
    vy: num(o.velocity.y),
    ax: num(o.accel.x),
    ay: num(o.accel.y),
    stepRemaining: num(o.stepRemaining),
    damageReceived: num(o.damageReceived),
    health: num(o.health.amount),
    shield: num(o.shield.amount),
    SIZE: num(o.SIZE),
    FOV: num(o.FOV),
    facing: num(o.facing),
    vfacing: num(o.vfacing),
    maxSpeed: num(o.maxSpeed),
    damp: num(o.damp),
    lastMovementTime: num(o.lastMovementTime),
    lastFiredTime: num(o.lastFiredTime),
    collisions: o.collisionArray.length,
    destroyed: !!o.destroyed,
    touchingSizeWall: o.touchingSizeWall === undefined ? null : o.touchingSizeWall,
    touchingFovWall: o.touchingFovWall === undefined ? null : o.touchingFovWall,
  };
}

const scenarios = [];

// pair runs a two-body resolver and records both bodies before and after.
function pair(name, fn, a, b, note) {
  const input = { a: full(a), b: full(b) };
  fn(a, b);
  scenarios.push({ name, note: note || '', input, after: { a: snap(a), b: snap(b) } });
}

// ---------------------------------------------------------------------------
// entity.js: physics, friction, confinement
// ---------------------------------------------------------------------------

const single = [];

function solo(name, fn, o, note) {
  const input = full(o);
  const roundArena = !!global.Config.round_arena;
  fn(o);
  single.push({ name, note: note || '', roundArena, input, after: snap(o) });
}

solo('physics.basic', (o) => Entity.prototype.physics.call(o),
  body({ x: 1, y: 2, velocity: new global.Vector(3, 4), accel: new global.Vector(0.5, -0.25), stepRemaining: 0.4 }),
  'accel folds into velocity, stepRemaining resets to 1, position moves a full step');

solo('physics.nanAccel', (o) => Entity.prototype.physics.call(o),
  body({ x: 10, y: -5, velocity: new global.Vector(1.5, 2.5), accel: new global.Vector(NaN, 3) }),
  'the scrubbing getter turns the NaN acceleration into 0 rather than poisoning x');

solo('physics.negative', (o) => Entity.prototype.physics.call(o),
  body({ x: -1234.5, y: 987.25, velocity: new global.Vector(-7.5, 0.125), accel: new global.Vector(-0.75, 0.5) }));

solo('friction.overSpeed', (o) => Entity.prototype.friction.call(o),
  body({ velocity: new global.Vector(3, 4), maxSpeed: 2, damp: 0.05 }),
  'motion 5 against maxSpeed 2: the excess is divided by k+1, not removed');

solo('friction.underSpeed', (o) => Entity.prototype.friction.call(o),
  body({ velocity: new global.Vector(1, 1), maxSpeed: 10, damp: 0.05 }),
  'no excess, so nothing happens');

solo('friction.zeroDamp', (o) => Entity.prototype.friction.call(o),
  body({ velocity: new global.Vector(30, 40), maxSpeed: 1, damp: 0 }),
  'damp is a truthiness test, so zero disables friction entirely');

solo('friction.bigDamp', (o) => Entity.prototype.friction.call(o),
  body({ velocity: new global.Vector(-12.5, 6.25), maxSpeed: 3.5, damp: 2.75 }));

solo('confine.inside', (o) => Entity.prototype.confinementToTheseEarthlyShackles.call(o),
  body({ x: 0, y: 0, SIZE: 10 }),
  'well inside the room, so no force');

solo('confine.pastLeft', (o) => Entity.prototype.confinementToTheseEarthlyShackles.call(o),
  body({ x: -3400, y: 0, SIZE: 10 }));

solo('confine.pastCorner', (o) => Entity.prototype.confinementToTheseEarthlyShackles.call(o),
  body({ x: 3500.5, y: -3300.25, SIZE: 25 }));

solo('confine.canGoOutside', (o) => Entity.prototype.confinementToTheseEarthlyShackles.call(o),
  body({ x: -9000, y: 9000, SIZE: 10, settings: { canGoOutsideRoom: true } }));

// The round arena is a different Config, so it gets its own pass.
{
  global.Config.round_arena = true;
  solo('confine.round.outside', (o) => Entity.prototype.confinementToTheseEarthlyShackles.call(o),
    body({ x: 3000, y: 2000, SIZE: 10 }),
    'lerps toward the origin once past width/2');
  solo('confine.round.inside', (o) => Entity.prototype.confinementToTheseEarthlyShackles.call(o),
    body({ x: 100, y: -200, SIZE: 10 }));
  global.Config.round_arena = false;
}

// ---------------------------------------------------------------------------
// collisionFunctions.js
// ---------------------------------------------------------------------------

pair('simplecollide.apart', cf.simplecollide,
  body({ x: 0, y: 0 }), body({ x: 10, y: 0 }));

pair('simplecollide.diagonal', cf.simplecollide,
  body({ x: -3.5, y: 2.25, pushability: 2 }), body({ x: 4.75, y: -1.5, pushability: 0.5 }));

pair('simplecollide.intangible', cf.simplecollide,
  body({ x: 0, y: 0, intangibility: 1, pushability: 0.25 }),
  body({ x: 6, y: 8, intangibility: 0.5, pushability: 4 }),
  'intangibility replaces pushability with 1 on both sides');

pair('firmcollide.overlap', (a, b) => cf.firmcollide(a, b),
  body({ x: 0, y: 0, SIZE: 10, shape: 0 }), body({ x: 12, y: 0, SIZE: 10, shape: 0 }));

pair('firmcollide.buffered', (a, b) => cf.firmcollide(a, b, 30),
  body({ x: 0, y: 0, SIZE: 10, acceleration: 2 }), body({ x: 35, y: 10, SIZE: 10, acceleration: 3 }),
  'inside the buffer band but not touching');

pair('firmcollide.shaped', (a, b) => cf.firmcollide(a, b),
  body({ x: 0, y: 0, SIZE: 8, shape: 4, velocity: new global.Vector(2, 1) }),
  body({ x: 14, y: 3, SIZE: 9, shape: 5, velocity: new global.Vector(-1, 0.5) }),
  'realSize uses lazyRealSizes, so the overlap test is not on size alone');

pair('firmcollide.spikes', (a, b) => cf.firmcollide(a, b),
  body({ x: 0, y: 0, SIZE: 10, label: 'Spike', velocity: new global.Vector(3, -2) }),
  body({ x: 11, y: 4, SIZE: 10, label: 'Mega Spike', velocity: new global.Vector(-1, 1) }),
  'two Spikes reflect and come away five times faster');

pair('firmcollidehard.train', (a, b) => cf.firmcollidehard(a, b, 20),
  body({ x: 0, y: 0, SIZE: 10, velocity: new global.Vector(1, 1) }),
  body({ x: 12, y: 5, SIZE: 10, velocity: new global.Vector(-1, 0) }),
  'divides by Config.runSpeed, which does not exist, so everything it writes is NaN');

pair('reflectcollide.overlap', cf.reflectcollide,
  body({ x: 0, y: 0, SIZE: 20 }), body({ x: 15, y: 5, SIZE: 10 }));

pair('advancedcollide.push', (a, b) => cf.advancedcollide(a, b, false, false),
  body({ x: 0, y: 0, SIZE: 10, velocity: new global.Vector(5, 0) }),
  body({ x: 15, y: 0, SIZE: 10, velocity: new global.Vector(-5, 0) }),
  'no damage, plain impulse');

pair('advancedcollide.overlapping', (a, b) => cf.advancedcollide(a, b, false, false),
  body({ x: 0, y: 0, SIZE: 10 }), body({ x: 4, y: 3, SIZE: 10 }),
  'already overlapping with no relative motion: C < 0 so t stays 0');

pair('advancedcollide.damage', (a, b) => cf.advancedcollide(a, b, true, true),
  body({ x: 0, y: 0, SIZE: 10, team: 1, damage: 5, velocity: new global.Vector(8, 0), maxSpeed: 10 }),
  body({ x: 16, y: 2, SIZE: 10, team: 2, damage: 3, velocity: new global.Vector(-4, 1), maxSpeed: 10 }),
  'cross-team, so both damageReceived values land');

pair('advancedcollide.damageEffects', (a, b) => cf.advancedcollide(a, b, true, true),
  body({
    x: 0, y: 0, SIZE: 12, team: 1, damage: 7, penetration: 2, velocity: new global.Vector(6, 3),
    maxSpeed: 9, heteroMultiplier: 0.5, settings: { damageEffects: true, ratioEffects: true },
  }),
  body({
    x: 20, y: 5, SIZE: 11, team: 2, damage: 4, penetration: 3, velocity: new global.Vector(-3, -1),
    maxSpeed: 7, heteroMultiplier: 0.25, settings: { damageEffects: true, ratioEffects: true },
  }));

pair('advancedcollide.shield', (a, b) => cf.advancedcollide(a, b, true, true),
  body({
    x: 0, y: 0, SIZE: 10, team: 1, damage: 30, velocity: new global.Vector(9, 0), maxSpeed: 10,
    shield: new HealthType(50, 'dynamic', 0),
  }),
  body({
    x: 17, y: 0, SIZE: 10, team: 2, damage: 40, velocity: new global.Vector(-6, 0), maxSpeed: 10,
    shield: new HealthType(20, 'dynamic', 0),
  }),
  'shields absorb before health, and a lethal hit scales the impulse by the death factor');

pair('advancedcollide.firmPositive', (a, b) => cf.advancedcollide(a, b, false, false, 1.5),
  body({ x: 0, y: 0, SIZE: 10, velocity: new global.Vector(4, 1) }),
  body({ x: 14, y: 2, SIZE: 10, velocity: new global.Vector(-2, 0) }),
  'the pushOnlyTeam arm: only n is accelerated, and combinedDepth.up is added to both axes');

pair('advancedcollide.firmNegative', (a, b) => cf.advancedcollide(a, b, false, false, -2),
  body({ x: 0, y: 0, SIZE: 10, velocity: new global.Vector(4, 1) }),
  body({ x: 14, y: 2, SIZE: 10, velocity: new global.Vector(-2, 0) }));

pair('advancedcollide.healer', (a, b) => cf.advancedcollide(a, b, true, true),
  body({ x: 0, y: 0, SIZE: 10, team: 7, type: 'tank', damage: 6, velocity: new global.Vector(3, 0), maxSpeed: 8 }),
  body({ x: 16, y: 0, SIZE: 10, team: 7, healer: true, damage: -4, velocity: new global.Vector(-3, 0), maxSpeed: 8 }),
  'a same-team healer applies negative damage and then returns before pushing');

pair('advancedcollide.knockback', (a, b) => cf.advancedcollide(a, b, false, true),
  body({ x: 0, y: 0, SIZE: 10, knockback: 2, density: 2, velocity: new global.Vector(5, 5) }),
  body({ x: 13, y: 9, SIZE: 10, knockback: 3, density: 0.5, velocity: new global.Vector(-1, -1) }));

pair('mooncollide.tank', cf.mooncollide,
  body({ x: 0, y: 0, SIZE: 40, type: 'wall' }),
  body({ x: 30, y: 10, SIZE: 10, type: 'tank', velocity: new global.Vector(-5, 2) }),
  'elasticity 0 for a tank: it is only placed on the edge');

pair('mooncollide.bullet', cf.mooncollide,
  body({ x: 0, y: 0, SIZE: 40, type: 'wall' }),
  body({ x: 25, y: -20, SIZE: 6, type: 'bullet', velocity: new global.Vector(-8, 6) }),
  'elasticity 1 for a bullet: it bounces');

pair('mooncollide.food', cf.mooncollide,
  body({ x: 100, y: -50, SIZE: 35, type: 'wall' }),
  body({ x: 120, y: -35, SIZE: 8, type: 'food', pushability: 0.4, velocity: new global.Vector(-3, -4) }));

pair('mazewallcollide.leftFace', cf.mazewallcollide,
  body({ x: 0, y: 0, SIZE: 30, shape: 4, walltype: 1, type: 'wall', team: -101 }),
  body({ x: -25, y: 3, SIZE: 10, type: 'tank', team: 1, velocity: new global.Vector(4, 1) }));

pair('mazewallcollide.topFace', cf.mazewallcollide,
  body({ x: 0, y: 0, SIZE: 30, shape: 4, walltype: 1, type: 'wall', team: -101 }),
  body({ x: 2, y: -26, SIZE: 10, type: 'tank', team: 1, velocity: new global.Vector(0, 5) }));

pair('mazewallcollide.corner', cf.mazewallcollide,
  body({ x: 0, y: 0, SIZE: 30, shape: 4, walltype: 1, type: 'wall', team: -101 }),
  body({ x: -28, y: -28, SIZE: 12, type: 'tank', team: 1, velocity: new global.Vector(3, 3) }));

pair('mazewallcollide.bulletDies', cf.mazewallcollide,
  body({ x: 0, y: 0, SIZE: 30, shape: 4, walltype: 1, type: 'wall', team: -101 }),
  body({ x: -25, y: 0, SIZE: 5, type: 'bullet', team: 1, velocity: new global.Vector(9, 0) }),
  'anything that is not a tank, miniboss, food or crasher is destroyed by a maze wall');

for (const wt of [2, 3, 4, 5, 6, 7, 8]) {
  pair(`mazewallcustom.face.walltype${wt}`, cf.mazewallcustomcollide,
    body({ x: 0, y: 0, SIZE: 30, shape: 4, walltype: wt, type: 'wall', team: -101 }),
    body({
      x: -25, y: 2, SIZE: 10, FOV: 1, type: 'tank', team: 1,
      velocity: new global.Vector(4, 1), health: new HealthType(100, 'static', 0),
    }));
}

pair('mazewallcustom.noContact', cf.mazewallcustomcollide,
  body({ x: 0, y: 0, SIZE: 30, shape: 4, walltype: 5, type: 'wall', team: -101 }),
  body({ x: 500, y: 500, SIZE: 10, type: 'tank', team: 1 }),
  'not colliding, so both touching flags become false');

pair('mazewallcustom.corner.walltype4', cf.mazewallcustomcollide,
  body({ x: 0, y: 0, SIZE: 30, shape: 4, walltype: 4, type: 'wall', team: -101 }),
  body({ x: -28, y: -28, SIZE: 12, type: 'tank', team: 1, accel: new global.Vector(1, 2) }));

pair('mazewallcustom.corner.walltype5', cf.mazewallcustomcollide,
  body({ x: 0, y: 0, SIZE: 30, shape: 4, walltype: 5, type: 'wall', team: -101 }),
  body({ x: -28, y: -28, SIZE: 12, type: 'tank', team: 1 }),
  'the corner reposition reads size *after* the switch, so it uses the doubled SIZE; the face push does not, because wallPushPositions was computed first');

pair('mazewallcustom.corner.walltype8', cf.mazewallcustomcollide,
  body({ x: 0, y: 0, SIZE: 30, shape: 4, walltype: 8, type: 'wall', team: -101 }),
  body({ x: 28, y: 28, SIZE: 12, type: 'tank', team: 1, velocity: new global.Vector(1, -2) }),
  'the bottom-right corner scales both velocity components and skips the reposition');

// ---------------------------------------------------------------------------
// loaders/global.js: runMove and runFace
// ---------------------------------------------------------------------------

const NOW = 1234567;
const V = vectorModule.Vector;

function ctl(over) {
  return Object.assign(
    { target: new V(0, 0), goal: { x: 0, y: 0 }, main: false, alt: false, fire: false, power: 1 },
    over);
}

function move(name, o, note) {
  const input = full(o);
  global.runMove(o, NOW);
  single.push({ name: 'runMove.' + name, note: note || '', roundArena: false, input, after: snap(o) });
}

function face(name, o, note) {
  const input = full(o);
  global.runFace(o);
  single.push({ name: 'runFace.' + name, note: note || '', roundArena: false, input, after: snap(o) });
}

move('grow.default', body({ motionType: 'grow', SIZE: 10 }), 'no speed argument, so SIZE grows by 1');
move('grow.speed', body({ motionType: 'grow', SIZE: 10, motionTypeArgs: { speed: 2.5 } }));
move('glide', body({ motionType: 'glide', topSpeed: 7.5, damp: 0.5 }));
move('glide.damp', body({ motionType: 'glide', topSpeed: 7.5, motionTypeArgs: { damp: 0.25 } }));
move('motor.active', body({
  motionType: 'motor', x: 0, y: 0, acceleration: 3, topSpeed: 8,
  control: ctl({ goal: { x: 30, y: 40 } }),
}));
move('motor.idle', body({
  motionType: 'motor', x: 5, y: 5, acceleration: 3, topSpeed: 8,
  control: ctl({ goal: { x: 5, y: 5 } }),
}), 'goal equals position, so gactive is false and lastMovementTime is not stamped');
move('motor.power', body({
  motionType: 'motor', x: 0, y: 0, acceleration: 3, topSpeed: 8,
  control: ctl({ goal: { x: -30, y: 40 }, fire: true, power: 0.5 }),
}));
move('swarm.far', body({
  motionType: 'swarm', x: 0, y: 0, SIZE: 5, acceleration: 2, topSpeed: 6, range: 12,
  velocity: new V(1, -1), control: ctl({ goal: { x: 60, y: 80 } }),
}));
move('swarm.near', body({
  motionType: 'swarm', x: 0, y: 0, SIZE: 50, acceleration: 2, topSpeed: 6,
  velocity: new V(1, -1), control: ctl({ goal: { x: 3, y: 4 } }),
}), 'inside its own size, so it coasts instead of steering');
move('swarm.turnVelocity', body({
  motionType: 'swarm', x: 0, y: 0, SIZE: 5, acceleration: 2, topSpeed: 6,
  motionTypeArgs: { turnVelocity: 30 }, velocity: new V(2, 2),
  control: ctl({ goal: { x: 100, y: 0 } }),
}));
move('chase.far', body({
  motionType: 'chase', x: 0, y: 0, SIZE: 5, acceleration: 2, topSpeed: 6,
  velocity: new V(1, 1), control: ctl({ goal: { x: 60, y: 80 } }),
}));
move('chase.nearNoKeep', body({
  motionType: 'chase', x: 0, y: 0, SIZE: 20, acceleration: 2, topSpeed: 6, maxSpeed: 6,
  velocity: new V(1, 1), control: ctl({ goal: { x: 3, y: 4 } }),
}), 'inside twice its size with no keepSpeed, so maxSpeed drops to 0');
move('chase.nearKeep', body({
  motionType: 'chase', x: 0, y: 0, SIZE: 20, acceleration: 2, topSpeed: 6,
  motionTypeArgs: { keepSpeed: true }, velocity: new V(1, 1),
  control: ctl({ goal: { x: 3, y: 4 } }),
}));
move('chase.idleKeep', body({
  motionType: 'chase', x: 9, y: 9, SIZE: 20, acceleration: 2, topSpeed: 6,
  motionTypeArgs: { keepSpeed: true }, velocity: new V(1, 1),
  control: ctl({ goal: { x: 9, y: 9 } }),
}));
move('drift', body({
  motionType: 'drift', x: 0, y: 0, acceleration: 4, maxSpeed: 9,
  control: ctl({ goal: { x: 2, y: -3 }, power: 0.75 }),
}));
move('unknown', body({ motionType: 'bound', x: 1, y: 2, velocity: new V(3, 4) }),
  'MOTION_TYPE "bound" matches no case, so only the accel line at the bottom runs');

{
  const src = body({ x: 40, y: -60, velocity: new V(2, -3) });
  const o = body({ motionType: 'withMaster', x: 0, y: 0, velocity: new V(9, 9) });
  o.source = src;
  move('withMaster', o, 'copies position and velocity from source, not master');
}

face('spin', body({ facingType: 'spin', facing: 1 }));
face('spin.speed', body({ facingType: 'spin', facing: 1, facingTypeArgs: { speed: 0.5 } }));
face('spinWhenIdle.firing', body({
  facingType: 'spinWhenIdle', facing: 1, control: ctl({ target: new V(3, 4), fire: true }),
}));
face('spinWhenIdle.idle', body({
  facingType: 'spinWhenIdle', facing: 1, control: ctl({ target: new V(3, 4) }),
}));
face('turnWithSpeed', body({ facingType: 'turnWithSpeed', facing: 0.25, velocity: new V(6, 8) }));
face('turnWithSpeed.multiplier', body({
  facingType: 'turnWithSpeed', facing: 0.25, velocity: new V(6, 8),
  facingTypeArgs: { multiplier: -2 },
}));
face('withMotion', body({ facingType: 'withMotion', facing: 0.25, velocity: new V(-6, 8) }));
face('smoothWithMotion', body({ facingType: 'smoothWithMotion', facing: 0.25, velocity: new V(-6, 8) }));
face('looseWithMotion.smoothness', body({
  facingType: 'looseWithMotion', facing: 0.25, velocity: new V(-6, 8),
  facingTypeArgs: { smoothness: 1.5 },
}));
face('toTarget.npc', body({
  facingType: 'toTarget', facing: 0.25, control: ctl({ target: new V(-3, 4) }),
}));
face('toTarget.player', body({
  facingType: 'toTarget', facing: 0.25, isPlayer: true, reverseTank: -1,
  control: ctl({ target: new V(-3, 4) }),
}), 'a player multiplies the target by reverseTank, which is -1 for a reversed tank');
face('toTarget.braindamage', body({
  facingType: 'withTarget', facing: 0.25, eastereggs: { braindamage: true },
  control: ctl({ target: new V(-3, 4) }),
}), 'a bare return, so the wrap and the vfacing update are skipped too');
face('locksFacing.free', body({
  facingType: 'locksFacing', facing: 0.25, control: ctl({ target: new V(0, -5) }),
}));
face('locksFacing.locked', body({
  facingType: 'locksFacing', facing: 0.25, control: ctl({ target: new V(0, -5), alt: true }),
}));
face('looseToTarget', body({
  facingType: 'looseToTarget', facing: 3, control: ctl({ target: new V(1, 1) }),
}));
face('noFacing.first', body({ facingType: 'noFacing', facing: 2, facingTypeArgs: { angle: 1.25 } }),
  'lastSavedFacing starts undefined, so the first call always snaps to the angle');
face('noFacing.noAngle', body({ facingType: 'noFacing', facing: 2 }));
face('bound.noMain', body({ facingType: 'bound', facing: 1, firingArc: [0.5, 0.75] }));
face('bound.mainInArc', body({
  facingType: 'bound', facing: 1, firingArc: [0.5, 3], control: ctl({ target: new V(1, 1), main: true }),
}));
face('bound.mainOutOfArc', body({
  facingType: 'bound', facing: 1, firingArc: [0.5, 0.1], control: ctl({ target: new V(-1, -1), main: true }),
}), 'the target is outside the arc, so it clamps to the arc centre');
face('bound.mainPlayerMaster', body({
  facingType: 'bound', facing: 1, firingArc: [0.5, 3], isPlayer: true, reverseTank: -1,
  control: ctl({ target: new V(2, -2), main: true }),
}));
face('spinOnFire.firing', body({
  facingType: 'spinOnFire', facing: 1, control: ctl({ target: new V(1, 0), fire: true }),
}), 'the inner increment of facing is overwritten by the outer compound assignment');
face('spinOnFire.idle', body({
  facingType: 'spinOnFire', facing: 1, firingArc: [0.5, 0.75], control: ctl({ target: new V(1, 0) }),
}));
face('manual.angle', body({ facingType: 'manual', facing: 1, facingTypeArgs: { angle: 2.5 } }));
face('manual.match', body({ facingType: 'manual', facing: 0 }),
  'the ?? 0 in the guard matches facing 0, so nothing happens');
face('manual.noAngle', body({ facingType: 'manual', facing: 1 }),
  'the guard defaults the angle to 0 but the assignment does not, so facing becomes NaN');

// ---------------------------------------------------------------------------
// entity.js: contemplationOfMortality, damage settling only
// ---------------------------------------------------------------------------
//
// Only the part before the death branch. Everything past `if (this.isDead())` is
// kill messages, broadcasts and the leaderboard, which need the socket manager and
// the room; internal/sim hands that to a hook instead of building it.

function mortality(name, o, note) {
  o.emit = () => {};
  o.guns = new Map();
  o.blend = { color: '#FFFFFF', amount: 0 };
  o.skill = { score: 0 };
  o.killCount = { solo: 0, assists: 0, bosses: 0, polygons: 0, killers: [] };
  o.setKillers = () => {};
  o.sendMessage = () => {};
  o.readyToDie = false;
  const input = full(o);
  input.settings.diesAtRange = !!o.settings.diesAtRange;
  input.settings.diesAtLowSpeed = !!o.settings.diesAtLowSpeed;
  const ret = Entity.prototype.contemplationOfMortality.call(o);
  const after = snap(o);
  after.mortality = ret;
  after.blend = num(o.blend.amount);
  after.range = num(o.range);
  single.push({ name: 'mortality.' + name, note: note || '', roundArena: false, input, after });
}

mortality('invuln', body({ damageReceived: 40, invuln: true }),
  'invulnerable, so the damage is dropped rather than applied');
mortality('healthOnly', body({ damageReceived: 40 }));
mortality('overkill', body({ damageReceived: 500 }),
  'more damage than health: getDamage is uncapped here, so the pool goes negative');
mortality('shieldAbsorbs', body({
  damageReceived: 30,
  shield: new HealthType(50, 'dynamic', 0),
}), 'a dynamic shield scales what it takes by how full it is, and the rest reaches health');
mortality('shieldPartial', body({
  damageReceived: 90,
  shield: new HealthType(40, 'dynamic', 0),
}));
mortality('heal', body({ damageReceived: -25, health: new HealthType(100, 'static', 0) }),
  'negative damage heals, and getDamage caps it at the missing points');
mortality('diesAtRange', body({
  damageReceived: 0, range: 0.5, settings: { diesAtRange: true },
}), 'range runs down by 1/roomSpeed a tick and kill() drops health to -100 when it goes negative');
mortality('diesAtLowSpeed', body({
  damageReceived: 0, topSpeed: 10, velocity: new V(1, 1), settings: { diesAtLowSpeed: true },
}), 'under half topSpeed with an empty collision array, so it bleeds 1/roomSpeed a tick');
mortality('diesAtLowSpeedFast', body({
  damageReceived: 0, topSpeed: 10, velocity: new V(8, 8), settings: { diesAtLowSpeed: true },
}));

// ---------------------------------------------------------------------------
// Real simulation data, from the differential harness
// ---------------------------------------------------------------------------
//
// The vectors above call the JS functions directly, which pins the arithmetic but says
// nothing about whether the tick composes them the way this port does. These samples
// come from a real 300-tick run: for each entity present in two consecutive ticks, the
// acceleration the JS must have applied is recovered as v(t+1) - v(t), and the sample
// is kept when the position moved by exactly v(t+1) / roomSpeed — that is, when
// physics() was the only thing that moved it that tick. The Go side replays each
// sample through one physics step and has to land on the same place.

function sampleHarness() {
  const cp = require('child_process');
  const os = require('os');
  const harness = path.join(ROOT, 'tools', 'harness', 'run.js');
  const tree = path.join(ROOT, 'tools', 'harness', 'js');
  if (!fs.existsSync(tree)) {
    console.warn('tools/harness/js is missing; run `node tools/harness/setup.js` for the harness samples');
    return null;
  }
  const tmp = path.join(fs.mkdtempSync(path.join(os.tmpdir(), 'simvec-')), 'run.jsonl');
  cp.execFileSync(process.execPath,
    [harness, '--seed', '1', '--ticks', '300', '--bots', '8', '--quiet', '--out', tmp],
    { stdio: ['ignore', 'ignore', 'inherit'] });

  const lines = fs.readFileSync(tmp, 'utf8').split('\n').filter(Boolean).map(JSON.parse);
  fs.rmSync(path.dirname(tmp), { recursive: true, force: true });

  const roomSpeed = ROOM_SPEED;
  const samples = [];
  let matched = 0, total = 0;
  for (let i = 0; i + 1 < lines.length; i++) {
    const prev = new Map(lines[i].entities.map(e => [e.id, e]));
    for (const cur of lines[i + 1].entities) {
      const p = prev.get(cur.id);
      if (!p) continue;
      if ([p.x, p.y, p.vx, p.vy, cur.x, cur.y, cur.vx, cur.vy].some(v => typeof v !== 'number')) continue;
      total++;
      if (p.x + cur.vx / roomSpeed !== cur.x || p.y + cur.vy / roomSpeed !== cur.y) continue;
      matched++;
      // Every 400th match, so the fixture stays small and spans the whole run.
      if (matched % 400 !== 0) continue;
      samples.push({
        tick: lines[i].tick,
        id: cur.id,
        type: cur.type,
        x: num(p.x), y: num(p.y), vx: num(p.vx), vy: num(p.vy),
        ax: num(cur.vx - p.vx), ay: num(cur.vy - p.vy),
        nextX: num(cur.x), nextY: num(cur.y), nextVX: num(cur.vx), nextVY: num(cur.vy),
      });
    }
  }
  return { ticks: lines.length, considered: total, physicsOnly: matched, roomSpeed, samples };
}

const harnessSteps = sampleHarness();

// ---------------------------------------------------------------------------

const out = {
  note: 'Generated by tools/gen-sim-vectors.js from the real js-src. Do not hand-edit.',
  roomSpeed: ROOM_SPEED,
  runSpeed: RUN_SPEED,
  config: {
    room_bound_force: global.Config.room_bound_force,
    damage_multiplier: global.Config.damage_multiplier,
    knockback_multiplier: global.Config.knockback_multiplier,
    run_speed: global.Config.run_speed,
  },
  room: { width: global.gameManager.room.width, height: global.gameManager.room.height },
  lazyRealSizes: Array.from({ length: 20 }, (_, i) => num(global.lazyRealSizes[i])),
  single,
  pairs: scenarios,
  harnessSteps,
};

const dest = path.join(ROOT, 'gen', 'sim-vectors.json');
fs.mkdirSync(path.dirname(dest), { recursive: true });
fs.writeFileSync(dest, JSON.stringify(out, null, 1));
console.log(`${single.length} single-body and ${scenarios.length} pair vectors`
  + (harnessSteps ? `, ${harnessSteps.samples.length} harness samples (${harnessSteps.physicsOnly}/${harnessSteps.considered} entity-ticks were physics-only)` : '')
  + ` -> ${path.relative(ROOT, dest)}`);
