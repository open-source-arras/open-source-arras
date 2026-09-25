// Resolves every definition in the real JS and records what `define` left behind, so
// internal/defs can be compared against Node value for value rather than spot-checked.
//
// Output: gen/defs-vectors.json
//
// Approach, and why it is this one: `Entity.prototype.define` (entity.js:176) is the
// merge. It cannot be safely read off and reimplemented -- this project's own
// architecture doc once had four of its five merge rows wrong -- so this runs the real
// function. It boots js-src/server/loaders/loader.js exactly as tools/dump-definitions.js
// does, then calls the real define for all 2,492 definitions and records the result.
//
// The `this` it runs against is a mock, seeded with the values internal/defs' newResolved
// seeds and carrying only the members define touches. Gun and the ioTypes controllers are
// swapped for recorders: define builds real objects out of them, and what matters here is
// which definition's GUNS and CONTROLLERS won the merge, not the machinery those objects
// would later drive. ensureIsClass, Color and Skill are the real ones, because define's
// observable output depends on what they do.
//
// Turrets are the real turretEntity class, patched rather than replaced -- a turret that
// carries turrets of its own builds them from turretEntity.js's module-local class
// binding, which `global.turretEntity` does not reach. That matters because `o.define` in
// entity.js's TURRETS block is turretEntity.js:109, a third merge algorithm reading about
// a third of the keys entity.js's define reads.
//
// One boundary is drawn deliberately, and the Go side has to agree with it: a turret is
// captured at the end of its define, before entity.js:482's `o.fixFacing()`. fixFacing is
// not part of define -- it rewrites facingType off the bond's facing -- and internal/guns
// ports it separately (turret.go:310).
//
// Read-only on js-src: this only require()s files under js-src/server.

'use strict';

// First, before any game code: Node's Math.pow is the host C library unless this flag is
// set, and differs between machines. See tools/fdlibm-pow.js.
require('./fdlibm-pow');

const fs = require('fs');
const path = require('path');

const REPO_ROOT = path.resolve(__dirname, '..');
const SERVER_ROOT = path.join(REPO_ROOT, 'js-src', 'server');
const DEFINITIONS_ROOT = path.join(SERVER_ROOT, 'lib', 'definitions');
const GEN_DIR = path.join(REPO_ROOT, 'gen');

// The seed internal/defs' tests use: Load(jsutil.NewRand(1)) for the table and
// NewResolver(set, jsutil.NewRand(1)) for each resolution.
const SEED = 1;

// ---------------------------------------------------------------------------
// The shared RNG
// ---------------------------------------------------------------------------
// internal/jsutil.Rand draws from mulberry32. Math.random becomes the same generator so
// both sides see the same stream: VARIES_IN_SIZE calls ran.randomRange(0.8, 1.2) inside
// define (entity.js:317), and serverPortal's spawn delays are re-rolled below.

let draws = 0;

function mulberry32(a) {
  return function () {
    draws++;
    a |= 0; a = a + 0x6D2B79F5 | 0;
    let t = Math.imul(a ^ a >>> 15, 1 | a);
    t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t;
    return ((t ^ t >>> 14) >>> 0) / 4294967296;
  };
}

function reseed(seed) {
  draws = 0;
  Math.random = mulberry32(seed >>> 0);
}

// ---------------------------------------------------------------------------
// Boot the real loader
// ---------------------------------------------------------------------------

require(path.join(SERVER_ROOT, 'loaders', 'loader.js'));
global.Config.startup_logs = false;

// define reads global.gameManager twice: it hands it to every controller constructor
// (recorders here), and the TEAM branch scans connected players. No player owns a
// definition, so an empty socket manager is the honest answer rather than a stub.
global.gameManager = {
  socketManager: { players: [] },
  room: { width: 0, height: 0 },
  views: [],
  runSpeed: 1,
};

const { definitionCombiner } = require(path.join(DEFINITIONS_ROOT, 'combined.js'));
new definitionCombiner({
  groups: path.join(DEFINITIONS_ROOT, 'groups'),
  addonsFolder: path.join(DEFINITIONS_ROOT, 'entityAddons'),
}).loadDefinitions(true, false);

const Class = global.Class;
const Entity = global.Entity;
const Skill = global.Skill;
const RealTurretEntity = global.turretEntity;
const RealGun = global.Gun;
const RealIoTypes = global.ioTypes;

// tools/dump-definitions.js renames facilitators.js:1337's Math.random()-keyed anonymous
// entries to a stable `anon_<index>_<slug>`, so gen/definitions.json -- and therefore Go
// -- knows them by that name. Same rename here, or a chunk of the relic parts would be
// unnameable.
const RANDOM_KEY_RE = /^0\.[0-9a-z]+$/;
function slugify(s) {
  const cleaned = String(s || '').replace(/[^A-Za-z0-9]+/g, '_').replace(/^_+|_+$/g, '');
  return cleaned || 'entry';
}
const nameOf = new Map();
for (const k of Object.keys(Class)) {
  nameOf.set(k, RANDOM_KEY_RE.test(k) ? `anon_${Class[k].index}_${slugify(Class[k].LABEL)}` : k);
}
// Identity, not deep equality: a TYPE or PARENT entry often holds the live object, and
// two definitions can be structurally equal without being the same one.
const classNameByObject = new Map();
for (const k of Object.keys(Class)) classNameByObject.set(Class[k], nameOf.get(k));

// ---------------------------------------------------------------------------
// Match Go's boot
// ---------------------------------------------------------------------------

// The Go side does not resolve the live JS table -- it resolves gen/definitions.json,
// and plain JSON cannot carry three things the live table contains: NaN (JSON.stringify
// writes null, which internal/defs reads as absent), negative zero (written as 0), and
// whatever Math.pow returned on the machine that ran tools/dump-definitions.js, which
// does not require tools/fdlibm-pow and so used the host C library.
//
// Those are dump defects, not merge defects, and mixing them into this corpus would put
// them in the middle of every mismatch report. So the live table is first pulled back to
// exactly what the dump can express, and each site is logged: the corpus then isolates
// the merge, and internal/defs' TestDumpCannotRepresentSomeDefinitionValues asserts the
// log so a new loss cannot appear unnoticed. See docs/found-bugs.md #56.
function reconcileWithDump(dumped) {
  const losses = [];
  const seen = new WeakSet();

  const isOpaque = v => v !== null && typeof v === 'object' &&
    (v.__classRef !== undefined || v.__nonSerialisable !== undefined);
  // NaN and the infinities DO survive the dump now, as a sentinel of their own
  // (tools/dump-definitions.js). They read as opaque above, so they have to be turned
  // back into numbers before the comparison or a value the dump carries perfectly
  // would be logged as a loss and deleted.
  const sentinelNumber = v => {
    if (v === null || typeof v !== 'object') return undefined;
    switch (v.__nonSerialisable) {
      case 'NaN': return NaN;
      case 'Infinity': return Infinity;
      case '-Infinity': return -Infinity;
      default: return undefined;
    }
  };
  // String(-0) is "0", which would make the most common loss invisible in its own log.
  const show = v => (Object.is(v, -0) ? '-0' : String(v));

  function walk(name, live, ref, pathParts) {
    if (live === null || typeof live !== 'object' || seen.has(live)) return;
    seen.add(live);
    if (ref === null || typeof ref !== 'object' || isOpaque(ref)) return;
    for (const key of Object.keys(live)) {
      const l = live[key], d = ref[key];
      const path = pathParts.concat(key);
      if (typeof l === 'number') {
        const dn = sentinelNumber(d);
        if (dn !== undefined) {
          if (!Object.is(l, dn)) {
            losses.push({ definition: name, path: path.join('.'), live: show(l), dumped: show(dn) });
            live[key] = dn;
          }
          continue;
        }
        // A number the dump turned into null or an explicit-undefined sentinel is a
        // key internal/defs never sees at all.
        if (d === undefined || d === null || isOpaque(d)) {
          losses.push({ definition: name, path: path.join('.'), live: show(l), dumped: 'absent' });
          delete live[key];
        } else if (typeof d === 'number' && !Object.is(l, d)) {
          losses.push({ definition: name, path: path.join('.'), live: show(l), dumped: show(d) });
          live[key] = d;
        }
        continue;
      }
      // Class references are their own top-level entries; the dump normalises them to a
      // __classRef sentinel, so descending would compare an object against a marker.
      if (Object.values(Class).includes(l)) continue;
      walk(name, l, d, path);
    }
  }

  for (const k of Object.keys(Class)) walk(nameOf.get(k), Class[k], dumped[nameOf.get(k)], []);
  return losses;
}

const dumpedDefinitions = JSON.parse(
  fs.readFileSync(path.join(GEN_DIR, 'definitions.json'), 'utf8')).definitions;
const dumpLosses = reconcileWithDump(dumpedDefinitions);

// generics.js:701 draws serverPortal's 60 spawn delays from Math.random at module load,
// so the real server gets different ones on every restart and internal/defs re-rolls them
// from its injected RNG at load. Same generator, same seed and the same gun-matching
// predicate as (*Set).rerollServerPortal, so the two tables agree before anything is
// resolved.
function rerollServerPortal() {
  const rng = mulberry32(SEED);
  const guns = Class.serverPortal && Class.serverPortal.GUNS;
  if (!guns) throw new Error('serverPortal has no GUNS');
  let found = 0;
  const rewritten = [];
  for (let gi = 0; gi < guns.length; gi++) {
    const gun = guns[gi];
    const p = gun.POSITION;
    if (!Array.isArray(p)) continue;
    if (p[0] !== 2 || p[1] !== 8 || p[2] !== 1 || p[3] !== -150 || p[4] !== 0 || p[6] == null) continue;
    const want = 360 / 60 * found;
    if (p[5] !== want) throw new Error(`serverPortal generated gun ${found} has angle ${p[5]}, expected ${want}`);
    let d = rng() * 252;
    if (d < 20) d = rng() * 4;
    p[6] = d;
    rewritten.push(`GUNS.${gi}.POSITION.6`);
    found++;
  }
  if (found !== 60) throw new Error(`serverPortal has ${found} generated guns, expected 60`);
  return rewritten;
}
// The re-roll owns those delays, so the pull-back above is undone for them and they are
// not a dump loss anyone can observe.
const rerolled = new Set(rerollServerPortal().map(p => `serverPortal ${p}`));
for (let i = dumpLosses.length - 1; i >= 0; i--) {
  if (rerolled.has(`${dumpLosses[i].definition} ${dumpLosses[i].path}`)) dumpLosses.splice(i, 1);
}

// These three branches drive the live Skill in ways that change what a resolution leaves
// behind: reset() zeroes the raw skills and the LSPF, and the RESET_STATS cap dance
// clamps them to zero. None occurs in this dump; only LEVEL calls reset(), which is what
// lets the raw-value capture below stay as small as it is. If a regenerated dump grows
// one of these, that capture has to be revisited rather than quietly reporting the wrong
// numbers.
{
  const risky = ['RESET_STATS', 'RESET_UPGRADES', 'RECALC_SKILL'];
  const found = [];
  for (const k of Object.keys(Class)) {
    for (const key of risky) if (Class[k][key] != null) found.push(`${k}.${key}`);
  }
  if (found.length) {
    throw new Error(
      `this dump now contains ${found.slice(0, 5).join(', ')}: those branches drive the live ` +
      'Skill and the raw-value capture in this script assumes only LEVEL does. Re-read the ' +
      'RecordingSkill notes before trusting its output.');
  }
}

// ---------------------------------------------------------------------------
// Recorders for Gun and the controllers
// ---------------------------------------------------------------------------

let nextId = 1;

// GunRecorder stands in for game/entities/gun.js. define stores the object and clears its
// `store`; everything else the real Gun computes belongs to internal/guns. The raw
// definition is kept because that is exactly what internal/defs' Resolved.Guns aliases.
class GunRecorder {
  constructor(body, info) {
    this.id = nextId++;
    this.store = {};
    this.info = info;
    // entity.js:545's NECRO block reads gun.bulletType.NECRO on every gun. The real Gun
    // assigns bulletType only when PROPERTIES.TYPE is present (gun.js:76), so a gun
    // without one makes that read throw -- reproduced rather than papered over.
    const props = info && info.PROPERTIES;
    if (props != null && props.TYPE != null && !global.Config.disable_guns) {
      const list = Array.isArray(props.TYPE) ? props.TYPE : [props.TYPE];
      const flattened = { BODY: {} };
      for (const t of list) global.util.flattenDefinition(flattened, global.ensureIsClass(t));
      this.bulletType = flattened;
    }
  }
}

// Five io_ constructors take numbers out of the shared stream. A recorder that skips
// them does not merely lose those numbers -- it hands the next number to whoever asks
// next, and inside define that is VARIES_IN_SIZE's size jitter (entity.js:318), which
// runs right after the CONTROLLERS block (:217). `crasher` shows it plainly: with a
// silent recorder its squiggle is the first number in the stream, and in the running
// game it is the second, because io_nearestDifferentMaster took the first.
//
// So each recorder spends exactly what the real constructor spends, through the real
// ran helpers rather than a hand-rolled count -- ran.gauss is two draws, not one, and
// that is not a thing to remember correctly twice.
//
//   io_moveInCircles           controllers.js:142-143  irandom + random
//   io_nearestDifferentMaster  controllers.js:442      irandom
//   io_healTeamMasters         controllers.js:598      irandom
//   io_fleeAtLowHealth         controllers.js:924      gauss (two)
//
// io_wanderAroundMap (controllers.js:965) is the fifth and is deliberately left out.
// Its draw is `ran.choose(gameManager.room.spawnableDefault).randomInside()`, and there
// is no room here -- the generator boots the loader, not a game. internal/ctrl models
// the same absence with a nil Context.RandomSpot, which likewise draws nothing, so the
// two sides agree by both declining. One definition carries it.
const controllerConstructorDraws = {
  moveInCircles() { ran.irandom(5); ran.random(2 * Math.PI); },
  nearestDifferentMaster() { ran.irandom(30); },
  healTeamMasters() { ran.irandom(30); },
  fleeAtLowHealth() { ran.gauss(0.7, 0.15); },
};

// One recorder class per ioTypes entry. They must be distinct classes: addController
// (entity.js:133) deduplicates on `io.constructor === oldIO.constructor`, so one shared
// class would collapse every controller into a single slot.
const ioRecorders = {};
for (const name of Object.keys(RealIoTypes)) {
  const spend = controllerConstructorDraws[name];
  const cls = class ControllerRecorder {
    constructor(body, args) {
      this.ioName = name;
      this.ioArgs = args;
      if (spend) spend();
    }
  };
  Object.defineProperty(cls, 'name', { value: `io_${name}` });
  ioRecorders[name] = cls;
}

// ---------------------------------------------------------------------------
// The skill
// ---------------------------------------------------------------------------

// Which entity's define is currently running. A turret shares its bond's Skill object
// (turretEntity.js:49), so "who is being defined" is the only way to tell the bond's own
// SKILL from one a turret wrote through the same object.
const ownerStack = [];
function owner() { return ownerStack[ownerStack.length - 1]; }

// RecordingSkill is the real Skill with a call-depth counter. `depth` tells a call define
// made from one the Skill made itself: reset() calls set(), and set()/setCaps() call
// update(). Only a depth-0 call is a definition's own SKILL / SKILL_CAP / EXTRA_SKILL /
// VALUE, and those are the raw merge outcome -- what internal/defs models -- while the
// inherited fields keep the live values a real entity would carry.
class RecordingSkill extends Skill {
  constructor() {
    super();
    this.depth = 0;
    this.recording = true; // the constructor's own setCaps must not count
  }
  reset(...a) {
    const direct = this.recording && this.depth === 0;
    const o = direct && owner();
    this.depth++;
    try {
      return super.reset(...a);
    } finally {
      this.depth--;
      // entity.js:366's LEVEL branch is `reset(); while (level < LEVEL) {...};
      // refreshBodyAttributes()`. Opening the window here and closing it in
      // refreshBodyAttributes brackets exactly those statements, so the score and points
      // the level ladder produces are not mistaken for a definition's own VALUE or
      // EXTRA_SKILL.
      if (o) { o.directResets++; o.inLevelLoop = true; }
    }
  }
  set(v) {
    if (this.recording && this.depth === 0 && owner()) owner().shadow.skills = v.slice();
    this.depth++;
    try { return super.set(v); } finally { this.depth--; }
  }
  setCaps(v) {
    if (this.recording && this.depth === 0 && owner()) owner().shadow.caps = v.slice();
    this.depth++;
    try { return super.setCaps(v); } finally { this.depth--; }
  }
  update(...a) {
    this.depth++;
    try { return super.update(...a); } finally { this.depth--; }
  }
  maintain(...a) {
    this.depth++;
    try { return super.maintain(...a); } finally { this.depth--; }
  }
}

// score, points and LSPF are plain properties define assigns directly, so they need
// accessors rather than method wrappers. update() also adds to points, but only from
// inside set/setCaps, so the depth test separates them.
function recordedProperty(prop, apply) {
  const hidden = `_${prop}`;
  Object.defineProperty(RecordingSkill.prototype, prop, {
    get() { return this[hidden]; },
    set(v) {
      const old = this[hidden];
      this[hidden] = v;
      const o = owner();
      if (this.recording && this.depth === 0 && o && !o.inLevelLoop) apply(o.shadow, v, old);
    },
    configurable: true,
  });
}
recordedProperty('score', (shadow, v) => { shadow.score = v; });
// EXTRA_SKILL is `points += v`, and points may already carry what update()'s cap clamp
// added, so only the delta is the definition's own contribution.
recordedProperty('points', (shadow, v, old) => { shadow.points += v - old; });
recordedProperty('LSPF', (shadow, v) => { shadow.lspf = v; shadow.lspfAssignments++; });

// ---------------------------------------------------------------------------
// The mock entities
// ---------------------------------------------------------------------------

// MockEntity holds what both entity.js's and turretEntity.js's define touch. The two
// subclasses below seed their own constructor's initial values and route `define` to
// their own real method -- they are genuinely different merges, and treating them as one
// is the mistake this corpus exists to catch.
class MockEntity {
  constructor() {
    this.id = nextId++;
    this.master = this;
    this.source = this;
    this.parent = this;
    this.bulletparent = this;
    this.store = {};
    this.controllers = [];
    this.definitionEvents = [];
    this.guns = new Map();
    this.gunsArrayed = [];
    this.turrets = new Map();
    this.props = new Map();
    this.upgrades = [];
    this.settings = {};
    this.aiSettings = {};
    this.children = [];
    this.bulletchildren = [];
    this.color = new global.Color(16);
    this.skill = new RecordingSkill();
    this.initialAiSettings = this.aiSettings;

    this.shadow = { skills: undefined, caps: undefined, points: 0, score: undefined, lspf: undefined, lspfAssignments: 0 };
    this.directResets = 0;
    this.inLevelLoop = false;
    this.onCalls = 0;
    this.defineDepth = 0;
  }

  addController(newIO) { return Entity.prototype.addController.call(this, newIO); }

  // Definition hooks are registered on the entity's EventEmitter. Nothing is emitted
  // here, so counting is enough -- and the count is what separates internal/defs' Funcs
  // list from its Events list, which RESET_EVENTS clears.
  on() { this.onCalls++; }
  removeListener() {}
  emit() {}

  // The real body is health and speed bring-up against a live world, which internal/defs
  // does not model either. It doubles as the marker that closes the LEVEL ladder.
  refreshBodyAttributes() {
    if (this.inLevelLoop) {
      this.shadow.level = this.skill.level;
      this.inLevelLoop = false;
    }
  }
}

// EntityMock seeds entity.js:60-91 -- the values the constructor puts in place before
// (and, for alpha/invisible/alphaRange, immediately after) `define("genericEntity")`.
// `squiggle`, `coreSize`, `team` and `allowedOnMinimap` are deliberately left unset,
// because the constructor does not set them either.
class EntityMock extends MockEntity {
  constructor() {
    super();
    this.glow = { radius: null, color: new global.Color(-1).compiled, alpha: 1, recursion: 1 };
    this.firingArc = [0, 360];
    this.necro = () => {};
    // Only what internal/defs' newResolved seeds, so the comparison is about the merge
    // and not about which side models the constructor. entity.js:68 also sets
    // `this.SIZE = 1`; internal/defs leaves Size absent until a definition assigns one,
    // and an entity that never gets a SIZE keeps the constructor's 1 either way.
    this.sizeMultiplier = 1;
    // The constructor does not assign squiggle; it becomes 1 because entity.js:71's
    // `define("genericEntity")` runs VARIES_IN_SIZE: false before any other define ever
    // sees the entity. internal/defs seeds it as an initial value for that reason, and
    // this mock has to agree or every SIZE would come out NaN.
    this.squiggle = 1;
    this.alpha = 1;
    this.invisible = [0, 0];
    this.alphaRange = [0, 1];
    // entity.js:493 gates SHAKE on the entity having a socket, so a socketless mock
    // would never exercise the branch internal/defs does model. A recording stub keeps
    // the branch live without pretending anything is connected.
    this.socket = { talks: [], talk(...a) { this.talks.push(a); } };
  }

  // entity.js:127. Only RESET_UPGRADES / RESET_STATS reach it and neither occurs in this
  // dump, but the filter's `[0]` really does leave `[undefined]` behind when there is no
  // listenToPlayer, so it is transcribed rather than simplified.
  reset(keepPlayerController = true) {
    this.controllers = keepPlayerController
      ? [this.controllers.filter(con => con instanceof ioRecorders.listenToPlayer)[0]]
      : [];
  }

  define(defs, ...rest) {
    ownerStack.push(this);
    this.defineDepth++;
    try {
      return Entity.prototype.define.call(this, defs, ...rest);
    } finally {
      this.defineDepth--;
      ownerStack.pop();
    }
  }
}

// Turrets use the REAL turretEntity class, patched rather than replaced.
//
// A turret is built by `new turretEntity(...)` and defined by turretEntity.js's own
// define (:109) -- a third merge algorithm reading roughly a third of the keys
// entity.js's define reads. A stand-in class cannot be substituted for it: a turret that
// carries turrets of its own constructs them from turretEntity.js's *module-local* class
// binding, which `global.turretEntity` does not reach. So the real class is used and only
// the members that need a live world are overridden.

// initRecording gives a real turretEntity the same bookkeeping MockEntity carries, since
// it is not one. Done on first define rather than in a constructor hook, which a class
// binding this script does not own cannot have.
function initRecording(o) {
  if (o.shadow !== undefined) return;
  o.shadow = { skills: undefined, caps: undefined, points: 0, score: undefined, lspf: undefined, lspfAssignments: 0 };
  o.directResets = 0;
  o.inLevelLoop = false;
  o.onCalls = 0;
  o.defineDepth = 0;
  o.initialAiSettings = o.aiSettings;
}

const realTurretDefine = RealTurretEntity.prototype.define;
RealTurretEntity.prototype.define = function (defs, ...rest) {
  initRecording(this);
  // The outermost defines on a turret are entity.js:476's, one per TYPE element, plus
  // the `{DANGER: 0}` at :480 -- see docs/found-bugs.md #13 and #42. The constructor's
  // own define("genericEntity") runs before `bond` is assigned, so it is not one.
  if (this.bond !== undefined && this.defineDepth === 0) {
    (this.typeDefines || (this.typeDefines = [])).push(...refList(defs));
  }
  ownerStack.push(this);
  this.defineDepth++;
  try {
    return realTurretDefine.call(this, defs, ...rest);
  } finally {
    this.defineDepth--;
    ownerStack.pop();
  }
};

// The real body is damage/density bring-up off a live skill; internal/defs does not model
// it either. Kept only as the marker that closes a LEVEL ladder.
RealTurretEntity.prototype.refreshBodyAttributes = function () {
  if (this.inLevelLoop) {
    this.shadow.level = this.skill.level;
    this.inLevelLoop = false;
  }
};

// entity.js:482 and turretEntity.js:205 call this after the defines. It rewrites
// facingType off the bond's facing, which is turret bring-up rather than merging;
// internal/guns ports it (turret.go:310) and this corpus captures a turret at the end of
// its define, so fixFacing is counted and not applied.
RealTurretEntity.prototype.fixFacing = function () {
  this.fixFacingCalls = (this.fixFacingCalls || 0) + 1;
};

// The real destroy tears an entity out of the live world's entity map, child lists and
// target set. Redefining a chain that sets TURRETS twice calls it; what a definition
// resolves to does not depend on any of that.
RealTurretEntity.prototype.destroy = function () {};

// ---------------------------------------------------------------------------
// Running one definition
// ---------------------------------------------------------------------------

function withRecorders(fn) {
  global.Gun = GunRecorder;
  global.ioTypes = ioRecorders;
  try {
    return fn();
  } finally {
    global.Gun = RealGun;
    global.ioTypes = RealIoTypes;
  }
}

function resolveOne(key) {
  reseed(SEED);
  ownerStack.length = 0;
  const mock = new EntityMock();
  // emitEvent false: the 'define' event runs the definition's own handlers against a live
  // world, and internal/defs does not run them either -- it records them.
  withRecorders(() => mock.define([Class[key]], false));
  // define's last act is targetableEntities.set(this.id, this) on a process-wide Map.
  // Left alone it would retain every mock and turret built here.
  global.targetableEntities.clear();
  return { mock, draws };
}

// ---------------------------------------------------------------------------
// Serialising
// ---------------------------------------------------------------------------

// JSON has no NaN, no infinities and no signed zero, and two nulls compare equal -- which
// would hide exactly the divergence a float port is likeliest to have. Tag them as
// strings, the way internal/trace already does.
function num(v) {
  if (typeof v !== 'number') return undefined;
  if (Number.isNaN(v)) return 'NaN';
  if (v === Infinity) return 'Infinity';
  if (v === -Infinity) return '-Infinity';
  if (Object.is(v, -0)) return '-0';
  return v;
}

// An absent key means the JS never assigned that field, which is what internal/defs' Opt
// models. A present key always carries a value.
function putRaw(out, key, v) {
  if (v === undefined || v === null) return;
  out[key] = v;
}
function putNum(out, key, v) {
  if (v === undefined || v === null) return;
  out[key] = num(v);
}

function refName(ref) {
  if (typeof ref === 'string') return ref;
  const known = classNameByObject.get(ref);
  return known === undefined ? '<inline>' : known;
}
function refList(v) {
  if (v == null) return [];
  const list = Array.isArray(v) ? v : [v];
  return list.map(refName);
}

const BODY_KEYS = [
  ['ACCELERATION', 'ACCELERATION'], ['SPEED', 'SPEED'], ['HEALTH', 'HEALTH'],
  ['RESIST', 'RESIST'], ['SHIELD', 'SHIELD'], ['REGEN', 'REGEN'], ['DAMAGE', 'DAMAGE'],
  ['PENETRATION', 'PENETRATION'], ['RANGE', 'RANGE'], ['FOV', 'FOV'],
  ['SHOCK_ABSORB', 'SHOCK_ABSORB'], ['RECOIL_MULTIPLIER', 'RECOIL_MULTIPLIER'],
  ['DENSITY', 'DENSITY'], ['STEALTH', 'STEALTH'], ['PUSHABILITY', 'PUSHABILITY'],
  ['KNOCKBACK', 'KNOCKBACK'], ['heteroMultiplier', 'HETERO'],
];

const SETTING_BOOLS = [
  'no_collisions', 'drawHealth', 'drawShape', 'damageEffects', 'ratioEffects',
  'motionEffects', 'acceptsScore', 'givesKillMessage', 'canGoOutsideRoom',
  'diesAtLowSpeed', 'diesAtRange', 'independent', 'persistsAfterDeath',
  'clearOnMasterUpgrade', 'healthWithLevel', 'obstacle', 'fullyInvisible',
  'canSeeInvisible', 'hasNoRecoil', 'attentionCraver', 'defeatMessage', 'buffVsFood',
  'leaderboardable', 'renderOnLeaderboard', 'reloadToAcceleration', 'variesInSize',
  'noSizeAnimation', 'connectChildrenOnCamera',
];

const SHOOT_SETTING_KEYS = [
  'damage', 'density', 'health', 'maxSpeed', 'pen', 'range', 'recoil', 'reload',
  'resist', 'shudder', 'size', 'speed', 'spray',
];
const STAT_SCALE_KEYS = [
  'damage', 'density', 'health', 'maxSpeed', 'pen', 'range', 'recoil', 'reload',
  'resist', 'size', 'speed',
];
const GUN_PROP_NUMS = ['ALPHA', 'MAX_CHILDREN', 'SPAWN_OFFSET', 'STROKE_WIDTH'];
const GUN_PROP_BOOLS = [
  'ALT_FIRE', 'AUTOFIRE', 'BORDERLESS', 'DELAY_SPAWN', 'DESTROY_OLDEST_CHILD',
  'DRAW_ABOVE', 'DRAW_FILL', 'FIXED_RELOAD', 'INDEPENDENT_CHILDREN',
  'INDEPENDENT_MASTER', 'NEGATIVE_RECOIL', 'NO_LIMITATIONS', 'SHOOT_ON_DEATH',
  'SYNCS_SKILLS', 'WAIT_TO_CYCLE',
];
const GUN_POSITION_SLOTS = ['LENGTH', 'WIDTH', 'ASPECT', 'X', 'Y', 'ANGLE', 'DELAY', 'LAYER'];
const TURRET_POSITION_SLOTS = ['SIZE', 'X', 'Y', 'ANGLE', 'ARC', 'LAYER'];
const CONTROLLER_ARG_NUMS = [
  'amplitude', 'distance', 'leash', 'orbit', 'range', 'repel', 'speed',
  'turnwiserange', 'yOffset',
];
const CONTROLLER_ARG_BOOLS = [
  'independent', 'invert', 'lockThroughWalls', 'lookAtGoal', 'onlyIfHasAltFireGun',
  'onlyWhenIdle', 'replicatePlayerMovement', 'useOwnMaster',
];
const BEHAVIOUR_ARG_NUMS = ['angle', 'damp', 'smoothness', 'speed', 'turnVelocity'];
const AI_BOOLS = ['BLIND', 'CHASE', 'FARMER', 'FULL_VIEW', 'IGNORE_SHAPES', 'NO_LEAD',
  'SKYNET', 'STRAFE', 'chase', 'independent', 'skynet'];
const SKILL_NAME_KEYS = ['body_damage', 'max_health', 'bullet_speed', 'bullet_health',
  'bullet_pen', 'bullet_damage', 'reload', 'move_speed', 'shield_regen', 'shield_cap'];

function colorSpecCompiled(spec) {
  const c = new global.Color(-1);
  c.interpret(spec);
  return c.compiled;
}

function serialiseGun(out, prefix, g) {
  const info = g.info || {};
  const pos = info.POSITION;
  out[`${prefix}.POSITION.fromArray`] = Array.isArray(pos);
  if (Array.isArray(pos)) {
    for (let i = 0; i < GUN_POSITION_SLOTS.length; i++) putNum(out, `${prefix}.POSITION.${GUN_POSITION_SLOTS[i]}`, pos[i]);
    if (pos.length > GUN_POSITION_SLOTS.length) out[`${prefix}.POSITION.extraSlots`] = pos.length - GUN_POSITION_SLOTS.length;
  } else if (pos != null) {
    for (const k of GUN_POSITION_SLOTS) putNum(out, `${prefix}.POSITION.${k}`, pos[k]);
    putNum(out, `${prefix}.POSITION.HEIGHT`, pos.HEIGHT);
  }
  const p = info.PROPERTIES;
  if (p != null) {
    out[`${prefix}.PROPERTIES.present`] = true;
    for (const k of GUN_PROP_NUMS) putNum(out, `${prefix}.PROPERTIES.${k}`, p[k]);
    for (const k of GUN_PROP_BOOLS) putRaw(out, `${prefix}.PROPERTIES.${k}`, p[k]);
    putRaw(out, `${prefix}.PROPERTIES.LABEL`, p.LABEL);
    putRaw(out, `${prefix}.PROPERTIES.STAT_CALCULATOR`, p.STAT_CALCULATOR);
    if (p.IDENTIFIER != null) {
      const isStr = typeof p.IDENTIFIER === 'string';
      out[`${prefix}.PROPERTIES.IDENTIFIER.isString`] = isStr;
      out[`${prefix}.PROPERTIES.IDENTIFIER`] = isStr ? p.IDENTIFIER : num(p.IDENTIFIER);
    }
    if (p.COLOR != null) out[`${prefix}.PROPERTIES.COLOR`] = colorSpecCompiled(p.COLOR);
    if (p.TYPE != null) {
      const types = refList(p.TYPE);
      out[`${prefix}.PROPERTIES.TYPE.len`] = types.length;
      types.forEach((t, i) => { out[`${prefix}.PROPERTIES.TYPE.${i}`] = t; });
    }
    if (p.SHOOT_SETTINGS != null) {
      out[`${prefix}.PROPERTIES.SHOOT_SETTINGS.present`] = true;
      for (const k of SHOOT_SETTING_KEYS) putNum(out, `${prefix}.PROPERTIES.SHOOT_SETTINGS.${k}`, p.SHOOT_SETTINGS[k]);
    }
  }
}

function serialiseBehaviour(out, prefix, name, args) {
  if (name === undefined) return;
  out[`${prefix}.name`] = name;
  if (args != null) {
    for (const k of BEHAVIOUR_ARG_NUMS) putNum(out, `${prefix}.args.${k}`, args[k]);
    putRaw(out, `${prefix}.args.independent`, args.independent);
  }
}

// serialise projects one defined entity onto exactly the fields internal/defs' Resolved
// carries. Every one of them is here: a field left out is a field the Go test cannot
// check, which is how a corpus ends up passing while proving nothing.
function serialise(mock) {
  const out = {};

  putRaw(out, 'index', mock.index);
  putRaw(out, 'name', mock.name);
  putRaw(out, 'label', mock.label);
  putRaw(out, 'displayName', mock.displayName);
  if (mock.type !== undefined) {
    if (Array.isArray(mock.type)) {
      out['type.isList'] = true;
      out['type.len'] = mock.type.length;
      mock.type.forEach((t, i) => { out[`type.${i}`] = t; });
    } else {
      out['type.isList'] = false;
      out['type.str'] = mock.type;
    }
  }
  putNum(out, 'walltype', mock.walltype);
  putNum(out, 'layerID', mock.layerID);
  putNum(out, 'angle', mock.angle);
  putRaw(out, 'branchLabel', mock.branchLabel);
  putRaw(out, 'upgradeColor', mock.upgradeColor);

  putNum(out, 'shape', mock.shape);
  if (mock.shapeData !== undefined) {
    if (typeof mock.shapeData === 'number') {
      out['shapeData.kind'] = 'number';
      out['shapeData.num'] = num(mock.shapeData);
    } else if (typeof mock.shapeData === 'string') {
      out['shapeData.kind'] = 'string';
      out['shapeData.str'] = mock.shapeData;
    } else {
      out['shapeData.kind'] = 'polygon';
      out['shapeData.len'] = mock.shapeData.length;
    }
  }
  putRaw(out, 'color', mock.color && mock.color.compiled);
  if (mock.glow != null && mock.glow.radius !== null) {
    out['glow.radius'] = num(mock.glow.radius);
    out['glow.color'] = mock.glow.color;
    out['glow.alpha'] = num(mock.glow.alpha);
    out['glow.recursion'] = num(mock.glow.recursion);
  }
  putNum(out, 'alpha', mock.alpha);
  if (mock.alphaRange !== undefined) {
    out['alphaRange.0'] = num(mock.alphaRange[0]);
    out['alphaRange.1'] = num(mock.alphaRange[1]);
  }
  if (mock.invisible !== undefined) {
    out['invisible.0'] = num(mock.invisible[0]);
    out['invisible.1'] = num(mock.invisible[1]);
  }
  putRaw(out, 'borderless', mock.borderless);
  putRaw(out, 'drawFill', mock.drawFill);

  serialiseBehaviour(out, 'motionType', mock.motionType, mock.motionTypeArgs);
  serialiseBehaviour(out, 'facingType', mock.facingType, mock.facingTypeArgs);

  out['controllers.len'] = mock.controllers.length;
  mock.controllers.forEach((c, i) => {
    if (c == null) { out[`controllers.${i}.name`] = '<undefined>'; return; }
    out[`controllers.${i}.name`] = c.ioName;
    if (c.ioArgs != null) {
      out[`controllers.${i}.args.present`] = true;
      for (const k of CONTROLLER_ARG_NUMS) putNum(out, `controllers.${i}.args.${k}`, c.ioArgs[k]);
      for (const k of CONTROLLER_ARG_BOOLS) putRaw(out, `controllers.${i}.args.${k}`, c.ioArgs[k]);
    }
  });

  // Identity, not emptiness: `AI: {}` is applied by define and has to read as present.
  if (mock.aiSettings !== mock.initialAiSettings) {
    out['ai.present'] = true;
    for (const k of AI_BOOLS) putRaw(out, `ai.${k}`, mock.aiSettings[k]);
    putNum(out, 'ai.SPEED', mock.aiSettings.SPEED);
    if (mock.aiSettings.extraStats != null) {
      out['ai.extraStats.len'] = mock.aiSettings.extraStats.length;
      mock.aiSettings.extraStats.forEach((v, i) => { out[`ai.extraStats.${i}`] = num(v); });
    }
  }
  putRaw(out, 'ignoredByAi', mock.ignoredByAi);
  putRaw(out, 'allowedOnMinimap', mock.allowedOnMinimap);

  for (const [prop, key] of BODY_KEYS) putNum(out, `body.${key}`, mock[prop]);

  putNum(out, 'dangerValue', mock.dangerValue);
  putRaw(out, 'intangibility', mock.intangibility);
  putRaw(out, 'healer', mock.healer);
  putRaw(out, 'immuneToTiles', mock.immuneToTiles);
  putNum(out, 'autospinBoost', mock.autospinBoost);
  putNum(out, 'team', mock.team);

  putNum(out, 'SIZE', mock.SIZE);
  putNum(out, 'coreSize', mock.coreSize);
  putNum(out, 'squiggle', mock.squiggle);

  // entity.js keeps guns in gunsArrayed as well as in the Map; turretEntity.js:186 fills
  // only the Map. Both are insertion-ordered.
  const guns = mock.gunsArrayed || [...mock.guns.values()];
  out['guns.len'] = guns.length;
  guns.forEach((g, i) => serialiseGun(out, `guns.${i}`, g));
  // define never refills the prop map on this path -- docs/found-bugs.md #11 -- and a
  // turretEntity has no prop map at all, which comes to the same zero.
  out['props.len'] = mock.props ? mock.props.size : 0;

  const turrets = [...mock.turrets.values()];
  out['turrets.len'] = turrets.length;
  turrets.forEach((t, i) => {
    // turretEntity.js:59-85 parses POSITION -- array or object, with its own defaults --
    // into `bound` and keeps nothing else, so that is what there is to compare against.
    // It checks the layout interpretation as well as the merge.
    const b = t.bound;
    if (b != null) {
      putNum(out, `turrets.${i}.bound.size`, b.size);
      putNum(out, `turrets.${i}.bound.angle`, b.angle);
      putNum(out, `turrets.${i}.bound.direction`, b.direction);
      putNum(out, `turrets.${i}.bound.offset`, b.offset);
      putNum(out, `turrets.${i}.bound.arc`, b.arc);
      putNum(out, `turrets.${i}.bound.layer`, b.layer);
    }
    putRaw(out, `turrets.${i}.collidingBond`, t.collidingBond);
    const defines = t.typeDefines || [];
    out[`turrets.${i}.defines.len`] = defines.length;
    defines.forEach((n, j) => { out[`turrets.${i}.defines.${j}`] = n; });
    const sub = serialise(t);
    for (const k of Object.keys(sub)) out[`turrets.${i}.res.${k}`] = sub[k];
  });

  if (mock.gunStatScale != null) {
    out['gunStatScale.present'] = true;
    for (const k of STAT_SCALE_KEYS) putNum(out, `gunStatScale.${k}`, mock.gunStatScale[k]);
  }
  putNum(out, 'maxChildren', mock.maxChildren);
  putNum(out, 'maxBullets', mock.maxBullets);
  putRaw(out, 'shootOnDeath', mock.shootOnDeath);
  putRaw(out, 'spawnOnDeath', mock.spawnOnDeath);

  // The raw merge outcome, not the live Skill's -- see RecordingSkill.
  const sh = mock.shadow;
  putNum(out, 'level', sh.level);
  putNum(out, 'levelCap', mock.levelCap);
  if (sh.caps !== undefined) sh.caps.forEach((v, i) => { out[`skillCaps.${i}`] = num(v); });
  if (sh.skills !== undefined) sh.skills.forEach((v, i) => { out[`skills.${i}`] = num(v); });
  out['extraSkill'] = num(sh.points);
  putNum(out, 'score', sh.score);
  out['lspf'] = sh.lspf != null;

  const upgrades = mock.upgrades || [];
  out['upgrades.len'] = upgrades.length;
  upgrades.forEach((u, i) => {
    out[`upgrades.${i}.index`] = u.index;
    out[`upgrades.${i}.tier`] = u.tier;
    out[`upgrades.${i}.branch`] = u.branch;
    putRaw(out, `upgrades.${i}.branchLabel`, u.branchLabel);
    out[`upgrades.${i}.redefineAll`] = u.redefineAll;
    const classes = (u.class || []).map(refName);
    out[`upgrades.${i}.classes.len`] = classes.length;
    classes.forEach((c, j) => { out[`upgrades.${i}.classes.${j}`] = c; });
  });
  putRaw(out, 'batchUpgrades', mock.batchUpgrades);
  putRaw(out, 'isArenaCloser', mock.isArenaCloser);
  putRaw(out, 'rerootUpgradeTree', mock.rerootUpgradeTree);
  if (mock.abilities != null) {
    out['abilities.len'] = mock.abilities.length;
    mock.abilities.forEach((a, i) => { out[`abilities.${i}`] = a; });
  }

  const events = mock.definitionEvents || [];
  out['events.len'] = events.length;
  events.forEach((e, i) => {
    out[`events.${i}.event`] = e.event;
    out[`events.${i}.once`] = e.once;
    out[`events.${i}.hasHandler`] = e.handler !== undefined;
  });
  // internal/defs' Funcs list, which RESET_EVENTS does not clear.
  out['funcs'] = mock.onCalls + mock.shadow.lspfAssignments;

  putRaw(out, 'syncWithTank', mock.syncWithTank);

  const s = mock.settings;
  for (const k of SETTING_BOOLS) putRaw(out, `settings.${k}`, s[k]);
  putRaw(out, 'settings.hitsOwnType', s.hitsOwnType);
  putRaw(out, 'settings.killMessage', s.killMessage);
  putRaw(out, 'settings.broadcastMessage', s.broadcastMessage);
  putNum(out, 'settings.damageClass', s.damageClass);
  putRaw(out, 'settings.mirrorMasterAngle', s.mirrorMasterAngle);
  putNum(out, 'settings.smoothness', s.smoothness);
  if (s.skillNames != null) {
    for (const k of SKILL_NAME_KEYS) out[`settings.skillNames.${k}`] = s.skillNames[k];
  }
  if (s.necroTypes != null) {
    out['settings.necroTypes.len'] = s.necroTypes.length;
    s.necroTypes.forEach((v, i) => { out[`settings.necroTypes.${i}`] = num(v); });
  }
  if (s.shakeProperties != null) {
    out['settings.shakeProperties.len'] = s.shakeProperties.length;
    s.shakeProperties.forEach((p, i) => {
      out[`settings.shakeProperties.${i}.type`] = p.type;
      putNum(out, `settings.shakeProperties.${i}.duration`, p.duration);
      putNum(out, `settings.shakeProperties.${i}.amount`, p.amount);
      out[`settings.shakeProperties.${i}.keepShake`] = p.keepShake;
      out[`settings.shakeProperties.${i}.push`] = p.push;
      out[`settings.shakeProperties.${i}.applyOn.upgrade`] = p.applyOn.upgrade;
      out[`settings.shakeProperties.${i}.applyOn.shoot`] = p.applyOn.shoot;
    });
  }

  return out;
}

// ---------------------------------------------------------------------------
// Run every definition
// ---------------------------------------------------------------------------

const results = [];
const names = Object.keys(Class).sort((a, b) => Class[a].index - Class[b].index);
let failures = 0;

for (const key of names) {
  const name = nameOf.get(key);
  try {
    const { mock, draws: used } = resolveOne(key);
    results.push({ name, ok: true, draws: used, fields: serialise(mock) });
  } catch (e) {
    failures++;
    results.push({ name, ok: false, error: String((e && e.message) || e) });
  }
}

// ---------------------------------------------------------------------------
// Cross-check against the table Go actually loads, then write
// ---------------------------------------------------------------------------

const dumped = dumpedDefinitions;
const dumpedNames = Object.keys(dumped);
if (dumpedNames.length !== results.length) {
  throw new Error(`this run built ${results.length} definitions but gen/definitions.json has ` +
    `${dumpedNames.length}; the corpus would describe a different table than Go loads`);
}
for (const r of results) {
  if (!(r.name in dumped)) {
    throw new Error(`definition ${r.name} is not in gen/definitions.json; regenerate that first`);
  }
}

let fieldCount = 0;
for (const r of results) if (r.fields) fieldCount += Object.keys(r.fields).length;

const out = {
  generated: new Date().toISOString(),
  source: 'js-src/server/game/entities/entity.js define() (and turretEntity.js define() for turrets), via loaders/loader.js',
  seed: SEED,
  note: 'Keys match internal/defs/resolve_golden_test.go\'s flattening of a *Resolved. An ' +
    'absent key means the JS never assigned that field. Non-finite numbers and negative ' +
    'zero are tagged as strings. A turret is captured at the end of its define, before ' +
    'entity.js:482 fixFacing.',
  definitions: results.length,
  failures,
  fields: fieldCount,
  dumpLosses,
  vectors: results,
};

fs.mkdirSync(GEN_DIR, { recursive: true });
const dest = path.join(GEN_DIR, 'defs-vectors.json');
fs.writeFileSync(dest, JSON.stringify(out));
const bytes = fs.statSync(dest).size;

console.log(`resolved ${results.length} definitions (${failures} could not resolve), ` +
  `${fieldCount} fields, ${(bytes / 1e6).toFixed(1)} MB -> gen/defs-vectors.json`);
console.log(`${dumpLosses.length} definition values gen/definitions.json cannot express, ` +
  `pulled back before resolving (see dumpLosses)`);
for (const r of results) if (!r.ok) console.log(`  could not resolve ${r.name}: ${r.error}`);
