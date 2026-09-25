// Reports which JS source line each Math.random() draw came from, per tick, so a
// per-tick draw-count difference against Go can be attributed to a call site
// rather than guessed at.
//
//   node tools/harness/probe-drawsites.js --seed 1 --ticks 20 --bots 8 --from 8 --to 14
//
// It is a diagnostic, not a reference: it drives the same boot run.js does but
// throws the trace away and prints call-site tallies instead.
'use strict';

require('../fdlibm-pow');
const fs = require('fs');
const path = require('path');

function arg(name, dflt) {
  const i = process.argv.indexOf('--' + name);
  return i === -1 ? dflt : Number(process.argv[i + 1]);
}
// Every flag this file reads. It is checked rather than documented because the parser
// is a pile of indexOf calls with no "unknown option" path: a typo, or a flag that run.js
// has and this does not, used to be ignored in silence -- and a probe quietly explaining
// a DIFFERENT simulation from the run it was called about has cost hours more than once.
// (--spawnclass was the case that did it: the probe ran `basic` bots while the run under
// investigation ran Beemans, and dutifully reported that the bullets in question were
// never fired.)
const KNOWN_FLAGS = new Set([
  // values
  'seed', 'ticks', 'bots', 'from', 'to', 'gamemode', 'spawnclass', 'bosscooldown',
  'ent', 'accel', 'collide', 'ndm', 'think', 'move', 'turrets', 'turretskill',
  // switches
  'checkusers', 'order', 'values', 'deep', 'dumpbots', 'newents', 'math', 'pools',
  'walls', 'wallmove', 'fire', 'sod', 'zombify', 'lead', 'snake', 'idlog', 'ctorlog',
  'killlog', 'destroylog',
]);
{
  const unknown = process.argv.slice(2)
    .filter(a => a.startsWith('--'))
    .map(a => a.slice(2).split('=')[0])
    .filter(a => !KNOWN_FLAGS.has(a));
  if (unknown.length) {
    console.error('probe-drawsites: unknown flag(s): ' + unknown.map(u => '--' + u).join(', '));
    console.error('known: ' + [...KNOWN_FLAGS].sort().map(k => '--' + k).join(' '));
    process.exit(2);
  }
}

const SEED = arg('seed', 1);
const TICKS = arg('ticks', 20);
const BOTS = arg('bots', 8);
const FROM = arg('from', 0);
const TO = arg('to', TICKS);

const det = require('./determinism.js').install({ seed: SEED });

const serverRoot = path.join(__dirname, 'js', 'server');
const dotenv = require(path.join(serverRoot, 'lib', 'dotenv.js'));
const envFile = path.join(serverRoot, '.env');
if (fs.existsSync(envFile)) {
  const env = dotenv(fs.readFileSync(envFile).toString());
  for (const k in env) process.env[k] = env[k];
}

// Wrap timeOfImpact BEFORE controllers.js is required: it destructures the export at
// load time, so the wrapper has to be in place first.
if (process.argv.includes('--lead')) {
  const vecPath = path.join(serverRoot, 'game', 'entities', 'vector.js');
  const vec = require(vecPath);
  const real = vec.timeOfImpact;
  vec.timeOfImpact = function (p, v, s) {
    const out = real(p, v, s);
    if (leadRecording) {
      console.log('LEAD diffx ' + Math.round(p.x * 1e6) + ' diffy ' + Math.round(p.y * 1e6) +
        ' radx ' + Math.round(v.x * 1e6) + ' rady ' + Math.round(v.y * 1e6) +
        ' track ' + Math.round(s * 1e6) + ' lead ' + Math.round(out * 1e6));
    }
    return out;
  };
}
// --ctorlog wraps io_nearestDifferentMaster's constructor and logs which body each
// one is built for, with the frame that built it. The constructor draws
// (controllers.js:442's ran.irandom(30)), so a per-site draw count that is one short
// on the Go side is answered by lining these up.
if (process.argv.includes('--ctorlog')) {
  const cpath = path.join(serverRoot, 'miscFiles', 'controllers.js');
  const mod = require(cpath);
  const real = mod.ioTypes.nearestDifferentMaster;
  mod.ioTypes.nearestDifferentMaster = class extends real {
    constructor(body, opts, gm) {
      const frame = (new Error().stack.split(String.fromCharCode(10))[2] || '').trim()
        .replace(/^.*js[\/]server[\/]/, '').replace(/\)$/, '');
      // stderr, not console.log: this probe silences console.log for the whole of
      // server boot, which is exactly the window these constructions happen in.
      process.stderr.write('NDMNEW id=' + (body && body.id) + ' label=' + (body && body.label) +
        ' type=' + (body && body.type) + ' at ' + frame + String.fromCharCode(10));
      super(body, opts, gm);
    }
  };
}

// --idlog logs every entitiesIdLog allocation -- Entity, bulletEntity, turretEntity,
// propEntity and Gun all draw from the one counter (entity.js:2) -- with the frame
// that made it, so an id-count difference against Go can be attributed rather than
// guessed at.
if (process.argv.includes('--idlog')) {
  const files = ['game/entities/entity.js', 'game/entities/gun.js',
    'game/entities/turretEntity.js', 'game/entities/propEntity.js',
    'game/entities/bulletEntity.js'];
  const names = ['Entity', 'Gun', 'turretEntity', 'propEntity', 'bulletEntity'];
  for (let i = 0; i < files.length; i++) {
    const mod = require(path.join(serverRoot, files[i]));
    const cls = mod[names[i]];
    if (!cls) continue;
    const wrapped = class extends cls {
      constructor(...a) {
        super(...a);
        const frame = (new Error().stack.split(String.fromCharCode(10))[2] || '').trim()
          .replace(/^.*js[\/]server[\/]/, '').replace(/\)$/, '');
        process.stderr.write('IDLOG ' + names[i] + ' id=' + this.id + ' at ' + frame +
          String.fromCharCode(10));
      }
    };
    Object.defineProperty(wrapped, 'name', { value: names[i] });
    mod[names[i]] = wrapped;
  }
}

let leadRecording = false;
let snakeRecording = false;
let mathRecording = false;
let fireRecording = false;
if (process.argv.includes('--fire')) {
  const Gun = require(path.join(serverRoot, 'game', 'entities', 'gun.js')).Gun;
  const realFire = Gun.prototype.fire;
  Gun.prototype.fire = function (gx, gy, sk) {
    const bv = this.body.velocity;
    const pre = { f: this.body.facing, a: this.angle, sp: this.settings.speed,
      vx: bv.x, vy: bv.y, vlen: bv.length, gx, gy, bs: this.body.size, bx: this.body.x, by: this.body.y };
    const before = entitiesIdLog;
    const out = realFire.call(this, gx, gy, sk);
    if (fireRecording) {
      const child = entities.get(entitiesIdLog - 1);
      console.log('FIRE new=' + (entitiesIdLog - 1) + ' prevId=' + before +
        ' facing=' + pre.f.toExponential(20) + ' angle=' + pre.a.toExponential(20) +
        ' speed=' + pre.sp + ' spd=' + (this.bulletStats === 'master' ? this.body.skill : this.bulletStats).spd.toExponential(20) +
        ' bvx=' + pre.vx.toExponential(20) + ' bvy=' + pre.vy.toExponential(20) +
        ' bvlen=' + pre.vlen.toExponential(20) +
        ' gx=' + pre.gx.toExponential(20) + ' gy=' + pre.gy.toExponential(20) +
        ' bsize=' + pre.bs.toExponential(20) +
        ' childv=' + (child && child.velocity ? child.velocity.x.toExponential(20) + ',' + child.velocity.y.toExponential(20) : '-'));
    }
    return out;
  };
}

if (process.argv.includes('--math')) {
  const fns = ['sin', 'cos', 'tan', 'atan', 'atan2', 'sqrt', 'log', 'exp', 'pow'];
  for (const name of fns) {
    const real = Math[name];
    Math[name] = function (...a) {
      const r = real.apply(Math, a);
      if (mathRecording) console.log('MATH ' + name + ' ' + a.map(v => v.toExponential(20)).join(' ') + ' -> ' + r.toExponential(20));
      return r;
    };
  }
}

// --ndm N reports, for body N's io_nearestDifferentMaster, why each targetable
// candidate was accepted or rejected on the ticks buildList actually runs.
let ndmTick = -1;
const accelWrapped = new Set();
if (process.argv.indexOf('--ndm') !== -1) {
  const want = Number(process.argv[process.argv.indexOf('--ndm') + 1]);
  const ctl = require(path.join(serverRoot, 'miscFiles', 'controllers.js'));
  const Base = ctl.ioTypes.nearestDifferentMaster;
  const realValidate = Base.prototype.validate;
  const realWall = Base.prototype.wouldHitWall;
  const realBuild = Base.prototype.buildList;
  Base.prototype.buildList = function (range) {
    if (this.body.id !== want) return realBuild.call(this, range);
    const sqrRange = range * range;
    const sqrRangeMaster = sqrRange * 4 / 3;
    for (const e of targetableEntities.values()) {
      const ok = realValidate.call(this, e, this.body, this.body.master.master, sqrRange, sqrRangeMaster);
      const wall = realWall.call(this, e);
      let arc = null;
      if (ok && !wall) {
        arc = this.body.aiSettings.view360 ||
          Math.abs(util.angleDifference(util.getDirection(this.body, e), this.body.firingArc[0])) < this.body.firingArc[1];
      }
      console.log('NDM tick=' + ndmTick + ' cand=' + e.id + ' type=' + e.type + ' label=' + e.label +
        ' valid=' + ok + ' wall=' + wall + ' arc=' + arc +
        ' danger=' + e.dangerValue + ' alpha=' + e.alpha + ' bond=' + (e.bond ? e.bond.id : null));
    }
    const out = realBuild.call(this, range);
    console.log('NDM tick=' + ndmTick + ' range=' + range + ' finals=' + JSON.stringify(out.map(e => e.id)) +
      ' arc=' + JSON.stringify(this.body.firingArc) + ' view360=' + this.body.aiSettings.view360);
    return out;
  };
}

// --collide N logs every pairwise collision call that involves entity N, in the order
// the game loop makes them.
if (process.argv.indexOf('--collide') !== -1) {
  const want = Number(process.argv[process.argv.indexOf('--collide') + 1]);
  const cf = require(path.join(serverRoot, 'miscFiles', 'collisionFunctions.js'));
  for (const name of Object.keys(cf)) {
    const real = cf[name];
    cf[name] = function (my, n, ...rest) {
      if (my && n && (my.id === want || n.id === want)) {
        console.log('JSCOLLIDE ' + name + ' my=' + my.id + '(' + my.label + ') n=' + n.id +
          '(' + n.label + ') myXY=' + my.x + ',' + my.y + ' nXY=' + n.x + ',' + n.y);
      }
      return real.call(this, my, n, ...rest);
    };
  }
}

if (process.argv.includes('--snake')) {
  const ctl = require(path.join(serverRoot, 'miscFiles', 'controllers.js'));
  const Base = ctl.ioTypes.snake;
  ctl.ioTypes.snake = class extends Base {
    constructor(body, opts) {
      const before = { x: body.x, y: body.y, size: body.size, SIZE: body.SIZE,
        coreSize: body.coreSize, sm: body.sizeMultiplier,
        vd: body.velocity.direction, vx: body.velocity.x, vy: body.velocity.y };
      super(body, opts);
      if (snakeRecording) {
        console.log('SNAKE id=' + body.id + ' beforeXY=' + before.x.toFixed(4) + ',' + before.y.toFixed(4) +
          ' afterXY=' + body.x.toFixed(4) + ',' + body.y.toFixed(4) +
          ' size=' + before.size + ' SIZE=' + before.SIZE + ' coreSize=' + before.coreSize +
          ' sm=' + before.sm + ' vdir=' + before.vd + ' v=' + before.vx.toFixed(4) + ',' + before.vy.toFixed(4));
      }
    }
  };
}


const realLog = console.log;
console.log = () => {};
console.warn = () => {};

const GLOBAL = require(path.join(serverRoot, 'loaders', 'loader.js'));
new definitionCombiner({
  groups: path.join(serverRoot, 'lib', 'definitions', 'groups'),
  addonsFolder: path.join(serverRoot, 'lib', 'definitions', 'entityAddons'),
}).loadDefinitions();
GLOBAL.loadRooms(false);
Config.bot_cap = BOTS;
// --spawnclass NAME, the same override run.js takes. Without it this probe silently
// runs `basic` bots while the run it is meant to explain runs something else -- which
// is exactly what happened once, and cost an afternoon of probes reporting zero.
{
  const i = process.argv.indexOf('--spawnclass');
  if (i !== -1 && process.argv[i + 1]) Config.spawn_class = process.argv[i + 1];
  // --bosscooldown N, likewise: the shipped 260 puts the first wave ~8,000 ticks in,
  // so a probe without it explains a run that has no boss in it.
  const b = process.argv.indexOf('--bosscooldown');
  if (b !== -1 && process.argv[b + 1]) Config.boss_spawn_cooldown = Number(process.argv[b + 1]);
}
global.onServerLoaded = () => {};
global.launchedOnMainServer = true;
global.servers.push({ loadedViaMainServer: true });

const { gameServer } = require(path.join(serverRoot, 'game.js'));
const { gameHandler } = require(path.join(serverRoot, 'game', 'index.js'));

const gmIdx = process.argv.indexOf('--gamemode');
const GAMEMODES = gmIdx === -1 ? ['ffa'] : process.argv[gmIdx + 1].split(',').map(x => x.trim()).filter(Boolean);
const manager = new gameServer(
  Config.host, Config.port, GAMEMODES, 'Harness', 'Local', 'Harness',
  { id: 'harness', maxPlayers: 1 }, {}, false, false, false, false);
global.gameManager = manager;
const handler = new gameHandler(manager);
// --checkusers, the same override run.js takes: checkUsers() gates the boss spawner and
// no harness run has a client. Same limit -- the method only, not the clients array.
if (process.argv.includes('--checkusers')) handler.checkUsers = () => true;

// Every draw records the first frame inside the patched server tree, which is the
// line that actually asked for randomness (ran.js frames are skipped -- they are
// the shared helper, not the caller).
let recording = false;
const tally = new Map();
const seqOut = [];
const rawRandom = Math.random;
Math.random = function random() {
  if (recording) {
    const stack = new Error().stack.split('\n').slice(2);
    let site = 'unknown';
    for (const line of stack) {
      if (!line.includes('js\\server') && !line.includes('js/server')) continue;
      const short = line.replace(/^.*js[\\/]server[\\/]/, '').replace(/\)$/, '').trim();
      if (short.includes('random.js')) continue;
      site = short;
      break;
    }
    tally.set(site, (tally.get(site) || 0) + 1);
    const v = rawRandom();
    seqOut.push(process.argv.includes('--values') ? site + ' v=' + v : site);
    return v;
  }
  return rawRandom();
};

console.log = realLog;

// --pools dumps room.spawnableDefault in order. ran.choose picks by index, so two
// lists of the same length with the tiles in a different order give the same draw
// count and a different answer -- which is not something a draw-count diff can see.
if (process.argv.includes('--pools')) {
  const pool = manager.room.spawnableDefault;
  process.stderr.write('POOL room w=' + manager.room.width + ' h=' + manager.room.height + ' tw=' + manager.room.tileWidth + ' th=' + manager.room.tileHeight + ' xg=' + manager.room.xgrid + ' yg=' + manager.room.ygrid + String.fromCharCode(10));
  process.stderr.write('POOL spawnableDefault n=' + pool.length + String.fromCharCode(10));
  pool.forEach((t, i) => process.stderr.write(
    'POOL ' + i + ' x=' + t.gridLoc.x + ' y=' + t.gridLoc.y + ' name=' + t.name + String.fromCharCode(10)));
}

// --think N logs every controller's think() input and output for one entity, inside
// the --from/--to window. It is the only way to see which controller is actually
// setting control.target when several could be.
if (process.argv.indexOf('--think') !== -1) {
  const want = Number(process.argv[process.argv.indexOf('--think') + 1]);
  for (const name of Object.keys(global.ioTypes)) {
    const proto = global.ioTypes[name].prototype;
    if (!proto || !proto.think) continue;
    const real = proto.think;
    proto.think = function (input) {
      const out = real.call(this, input);
      if (recording && this.body && this.body.id === want) {
        process.stderr.write('THINK ' + name + ' in=' + JSON.stringify(input) +
          ' spot=' + JSON.stringify(this.spot) + ' body=' + this.body.x + ',' + this.body.y +
          ' out=' + JSON.stringify(out) + String.fromCharCode(10));
      }
      return out;
    };
  }
}

// --killlog N logs the stack every time one entity's kill() runs, which is what tells a
// natural death apart from a gun trimming its oldest child.
if (process.argv.indexOf('--killlog') !== -1) {
  const want = Number(process.argv[process.argv.indexOf('--killlog') + 1]);
  for (const proto of [global.Entity.prototype, require(path.join(serverRoot, 'game', 'entities', 'bulletEntity.js')).bulletEntity.prototype]) {
    if (!proto || !proto.kill) continue;
    const real = proto.kill;
    proto.kill = function () {
      if (this.id === want) {
        const stack = new Error().stack.split(String.fromCharCode(10)).slice(2)
          .filter(l => l.includes('js' + require('path').sep + 'server'))
          .map(l => l.replace(/^.*js[\/]server[\/]/, '').replace(/\)$/, '').trim())
          .slice(0, 5);
        process.stderr.write('KILL tick=' + ndmTick + ' id=' + this.id + '  ' + stack.join('  <-  ') + String.fromCharCode(10));
      }
      return real.call(this);
    };
  }
}

// --destroylog N logs the stack every time one entity leaves the `entities` map, which
// is the only reliable way to tell a death apart from a destroy done by something else
// entirely (a gun trimming its oldest child, a parent tearing down its brood).
if (process.argv.indexOf('--destroylog') !== -1) {
  const want = Number(process.argv[process.argv.indexOf('--destroylog') + 1]);
  const realDelete = entities.delete.bind(entities);
  entities.delete = function (k) {
    if (k === want) {
      const stack = new Error().stack.split(String.fromCharCode(10)).slice(2)
        .filter(l => l.includes('js' + require('path').sep + 'server'))
        .map(l => l.replace(/^.*js[\/]server[\/]/, '').replace(/\)$/, '').trim())
        .slice(0, 6);
      process.stderr.write('DESTROY tick=' + ndmTick + ' id=' + k + '  ' + stack.join('  <-  ') + String.fromCharCode(10));
    }
    return realDelete(k);
  };
}

const cycleSpeed = manager.room.cycleSpeed;
const seenEnts = new Set();
let lastWallCount = -1;
const wallSpawnPos = new Map();
if (process.argv.includes('--newents')) {
  const realSet = entities.set.bind(entities);
  entities.set = function (k, v) {
    const stack = new Error().stack.split(String.fromCharCode(10)).slice(2)
      .filter(l => l.includes('js' + require('path').sep + 'server'))
      .map(l => l.replace(/^.*js[\/]server[\/]/, '').replace(/\)$/, '').trim())
      .slice(0, 4);
    console.log('CREATE id=' + k + ' at ' + stack.join('  <-  '));
    return realSet(k, v);
  };
}

// --zombify logs every outbreak zombify() call: what defs[0] actually is at that
// moment (a class-name string, an inline object, or absent) and whether the
// BODY/DANGER guard fires. The Go port resolved the name into a class and read BODY
// off that, which is not what the JS reads.
if (process.argv.includes('--zombify')) {
  const ob = require(path.join(serverRoot, 'game', 'gamemodes', 'scripts', 'outbreak.js'));
  const real = ob.Outbreak.prototype.zombify;
  ob.Outbreak.prototype.zombify = function (live) {
    const d0 = live.defs ? live.defs[0] : undefined;
    console.log('ZOMBIFY tick=' + ndmTick + ' id=' + live.id + ' label=' + live.label +
      ' defsLen=' + (live.defs ? live.defs.length : 'none') +
      ' d0type=' + typeof d0 + ' d0=' + (typeof d0 === 'string' ? d0 : JSON.stringify(d0)) +
      ' BODY=' + (d0 == null ? 'n/a' : JSON.stringify(d0.BODY)) +
      ' DANGER=' + (d0 == null ? 'n/a' : JSON.stringify(d0.DANGER)) +
      ' nextId=' + entitiesIdLog);
    const out = real.call(this, live);
    console.log('ZOMBIFY-DONE tick=' + ndmTick + ' nextId=' + entitiesIdLog +
      ' stillAlive=' + entities.has(live.id));
    return out;
  };
}

// --sod logs every SHOOT_ON_DEATH shot entity.js:1077 takes, with the inputs
// Gun.prototype.fire reads: the gun's own angle and speed setting, the skill spd
// multiplier, and the dying body's facing and velocity. It wraps the gun rather than
// fire() because a SHOOT_ON_DEATH gun is reached from contemplationOfMortality, not
// from live().
if (process.argv.includes('--sod')) {
  const GunMod = require(path.join(serverRoot, 'game', 'entities', 'gun.js'));
  const realShoot = GunMod.Gun.prototype.shoot;
  GunMod.Gun.prototype.shoot = function () {
    if (this.shootOnDeath) {
      const b = this.body;
      const sk = this.bulletStats === 'master' ? b.skill : this.bulletStats;
      const before = entitiesIdLog;
      const out = realShoot.call(this);
      const child = entities.get(before);
      console.log('SOD tick=' + ndmTick + ' body=' + b.id + ' new=' + before +
        ' angle=' + this.angle.toExponential(20) +
        ' speed=' + this.settings.speed +
        ' spd=' + sk.spd.toExponential(20) +
        ' facing=' + b.facing.toExponential(20) +
        ' bvx=' + b.velocity.x.toExponential(20) +
        ' bvy=' + b.velocity.y.toExponential(20) +
        ' bvlen=' + b.velocity.length.toExponential(20) +
        ' bsize=' + b.size.toExponential(20) +
        ' childv=' + (child && child.velocity
          ? child.velocity.x.toExponential(20) + ',' + child.velocity.y.toExponential(20)
          : '-'));
      return out;
    }
    return realShoot.call(this);
  };
}

// --move N wraps global.runMove for one entity and prints every input the motion
// switch reads, so a velocity that comes out a fraction different from Go's can be
// attributed to the term that differs rather than guessed at.
if (process.argv.indexOf('--move') !== -1) {
  const wantMove = Number(process.argv[process.argv.indexOf('--move') + 1]);
  const realMove = global.runMove;
  global.runMove = function (my, now) {
    if (my && my.id === wantMove) {
      console.log('MOVE tick=' + ndmTick + ' id=' + my.id +
        ' motion=' + my.motionType +
        ' accel=' + my.acceleration.toExponential(20) +
        ' roomSpeed=' + global.gameManager.roomSpeed +
        ' topSpeed=' + my.topSpeed.toExponential(20) +
        ' range=' + my.range +
        ' turnVel=' + JSON.stringify(my.motionTypeArgs.turnVelocity) +
        ' size=' + my.size.toExponential(20) +
        ' gx=' + (my.control.goal.x - my.x).toExponential(20) +
        ' gy=' + (my.control.goal.y - my.y).toExponential(20) +
        ' vx=' + my.velocity.x.toExponential(20) +
        ' vy=' + my.velocity.y.toExponential(20) +
        ' damp=' + my.damp +
        ' fov=' + my.fov + ' FOV=' + my.FOV + ' coreSize=' + my.coreSize + ' SIZE=' + my.SIZE);
    }
    return realMove.call(this, my, now);
  };
}

for (let t = 0; t < TICKS; t++) {
  ndmTick = t;
  recording = t >= FROM && t <= TO;
  leadRecording = recording;
  snakeRecording = recording;
  mathRecording = recording;
  fireRecording = recording;
  if (recording) tally.clear();
  const before = det.rngCalls;
  det.advanceTo((t + 1) * cycleSpeed);
  handler.gameloop();
  global.syncedDelaysLoop();
  if (Config.enable_food) handler.foodloop();
  manager.roomLoop();
  manager.gamemodeManager.request('quickloop');
  const after = det.rngCalls;
  if (recording) {
    if (process.argv.includes('--order')) {
      seqOut.forEach((site, k) => console.log('JSDRAW ' + t + ' ' + k + ' ' + site));
      seqOut.length = 0;
    } else {
      const rows = [...tally.entries()].sort((a, b) => b[1] - a[1]);
      console.log('tick ' + t + '  draws ' + (after - before));
      for (const [site, n] of rows) console.log('   ' + String(n).padStart(4) + '  ' + site);
    }
  }
  if (process.argv.includes('--newents')) {
    for (const [id, o] of entities) {
      if (seenEnts.has(id)) continue;
      seenEnts.add(id);
      console.log('NEW tick=' + t + ' id=' + id + ' type=' + o.type + ' label=' + o.label +
        ' index=' + o.index + ' master=' + (o.master ? o.master.id : '-') +
        ' bond=' + (o.bond ? o.bond.id : '-'));
    }
  }
  if (process.argv.includes('--turretskill')) {
    for (const o of entities.values()) {
      if (!o.turrets || !o.turrets.size) continue;
      for (const tur of o.turrets.values()) {
        console.log('TSK tick=' + t + ' body=' + o.id + ' label=' + o.label +
          ' turret=' + tur.label + ' same=' + (tur.skill === o.skill) +
          ' bodyRaw=' + JSON.stringify(o.skill.raw) + ' turRaw=' + JSON.stringify(tur.skill.raw));
      }
    }
  }
  // --accel N logs every write to entity N's accel vector, in order, with the JS
  // stack frame that made it. The sum's ORDER is what a last-bit divergence usually
  // comes down to, and a total tells you nothing about it.
  if (process.argv.indexOf('--accel') !== -1) {
    const want = Number(process.argv[process.argv.indexOf('--accel') + 1]);
    const o = entities.get(want);
    if (o && !accelWrapped.has(want)) {
      accelWrapped.add(want);
      const real = o.accel;
      o.accel = new Proxy(real, {
        set(target, prop, value) {
          if (prop === 'x' || prop === 'y') {
            const frame = (new Error().stack.split(String.fromCharCode(10))[2] || '').trim()
              .replace(/^.*js[\/]server[\/]/, '').replace(/\)$/, '');
            console.log('JSACCEL tick=' + t + ' ' + prop + ' ' + target[prop].toExponential(20) +
              ' -> ' + Number(value).toExponential(20) + '  at ' + frame);
          }
          target[prop] = value;
          return true;
        },
      });
    }
  }
  if (process.argv.indexOf('--ent') !== -1) {
    const want = Number(process.argv[process.argv.indexOf('--ent') + 1]);
    const o = entities.get(want);
    if (o) {
      console.log('ENT tick=' + t + ' id=' + o.id + ' label=' + o.label +
        ' active=' + o.activation.active + ' timer=' + o.activation.timer +
        ' isBot=' + o.isBot + ' isPlayer=' + o.isPlayer +
        ' skipLife=' + o.skipLife + ' alwaysActive=' + o.alwaysActive +
        ' dead=' + o.isDead() + ' inGrid=' + o.isInGrid +
        ' range=' + o.range + ' diesAtRange=' + o.settings.diesAtRange + ' hp=' + o.health.amount +
        ' dals=' + o.settings.diesAtLowSpeed + ' topSpeed=' + o.topSpeed + ' vlen=' + o.velocity.length + ' coll=' + o.collisionArray.length + ' dmgRecv=' + o.damageReceived +
        ' box=' + o.minX + ',' + o.minY + ',' + o.maxX + ',' + o.maxY + ' size=' + o.size +
        ' facing=' + o.facing + ' facingType=' + o.facingType +
        ' target=' + JSON.stringify(o.control.target) +
        ' main=' + o.control.main + ' fire=' + o.control.fire +
        ' vx=' + o.velocity.x + ' vy=' + o.velocity.y +
        ' power=' + o.control.power + ' goal=' + JSON.stringify(o.control.goal) +
        ' ctrl=' + JSON.stringify(o.controllers.map(c => ({
          n: c.constructor.name, tick: c.tick, timer: c.timer,
          pathAngle: c.pathAngle, goal: c.goal,
          lock: c.targetLock ? c.targetLock.id : null }))));
    } else {
      console.log('ENT tick=' + t + ' id=' + want + ' MISSING');
    }
  }
  // --turrets N dumps every turret bonded to one entity, recursively. Turrets are
  // not in the `entities` map (turretEntity never calls entities.set), so --ent
  // cannot reach one by id, and an auto turret's own control state is exactly what a
  // "why did this fire" question needs.
  if (process.argv.indexOf('--turrets') !== -1) {
    const want = Number(process.argv[process.argv.indexOf('--turrets') + 1]);
    const root = entities.get(want);
    if (root) {
      const walk = (o, depth) => {
        for (const tur of o.turrets.values()) {
          console.log('TUR tick=' + ndmTick + ' depth=' + depth + ' id=' + tur.id + ' label=' + tur.label +
            ' facing=' + tur.facing + ' facingType=' + tur.facingType +
            ' target=' + JSON.stringify(tur.control.target) +
            ' fire=' + tur.control.fire + ' main=' + tur.control.main + ' alt=' + tur.control.alt +
            ' arc=' + JSON.stringify(tur.firingArc) + ' bound=' + JSON.stringify(tur.bound) +
            ' refFacing=' + tur.bond.facing +
            ' guns=' + JSON.stringify([...tur.guns.values()].map(g => [
              g.canShoot, g.cycleTimer, g.maxCycleTimer, g.autofire, g.children.length, g.countsOwnKids, g.settings && g.settings.reload])));
          walk(tur, depth + 1);
        }
      };
      walk(root, 0);
    } else {
      console.log('TUR tick=' + ndmTick + ' id=' + want + ' MISSING');
    }
  }
  // --walls dumps global.walls whenever its length changes: the wall entities the
  // maze/labyrinth/siege scripts and the wall tile push, with the hitbox makeHitbox
  // built for each. Go's equivalent is GOTRACE_WALLS=1.
  if (process.argv.includes('--walls')) {
    if (walls.length !== lastWallCount) {
      lastWallCount = walls.length;
      console.log('WALLS tick=' + t + ' n=' + walls.length);
      for (const w of walls) {
        console.log('WALL id=' + w.id + ' x=' + w.x + ' y=' + w.y +
          ' size=' + w.size + ' SIZE=' + w.SIZE + ' coreSize=' + w.coreSize +
          ' angle=' + w.angle + ' r=' + w.hitboxRadius +
          ' hb=' + w.hitbox.map(e => e.map(p => p.x.toFixed(6) + ',' + p.y.toFixed(6)).join('|')).join(' '));
      }
    }
  }
  // --wallmove answers one question: does a wall ever move after it spawns? If it
  // never does, the hitbox position can be latched at spawn instead of read live.
  if (process.argv.includes('--wallmove')) {
    let moved = 0;
    for (const w of walls) {
      const seen = wallSpawnPos.get(w.id);
      if (!seen) { wallSpawnPos.set(w.id, { x: w.x, y: w.y }); continue; }
      if (seen.x !== w.x || seen.y !== w.y) {
        moved++;
        if (moved <= 3) {
          console.log('WALLMOVE tick=' + t + ' id=' + w.id +
            ' from=' + seen.x + ',' + seen.y + ' to=' + w.x + ',' + w.y);
        }
      }
    }
    if (t === TICKS - 1) console.log('WALLMOVE total moved=' + moved + ' of ' + walls.length);
  }
  if (process.argv.includes('--dumpbots')) {
    for (const o of [...entities.values()].filter(e => e.isBot)) {
      console.log('BOT tick=' + t + ' id=' + o.id + ' label=' + o.label +
        ' defs=' + JSON.stringify(o.defs) + ' upgrades=' + o.upgrades.length +
        ' level=' + o.skill.level + ' leftover=' + o.leftoverUpgrades +
        ' menu=' + JSON.stringify(o.upgrades.map(u => u.level)) +
        ' fov=' + o.fov + ' topSpeed=' + o.topSpeed +
        ' ctrlTarget=' + JSON.stringify(o.control.target) +
        ' lockPos=' + JSON.stringify(o.controllers[0] && o.controllers[0].targetLock ? {x:o.controllers[0].targetLock.x, y:o.controllers[0].targetLock.y, vx:o.controllers[0].targetLock.velocity.x, vy:o.controllers[0].targetLock.velocity.y} : null) +
        ' ctrl=' + JSON.stringify(o.controllers.map(c => ({
          n: c.constructor.name, tick: c.tick, lead: c.lead,
          lock: c.targetLock ? c.targetLock.id : null }))) +
        ' facingType=' + o.facingType + ' facingArgs=' + JSON.stringify(o.facingTypeArgs) +
        ' facing=' + o.facing + ' firingArc=' + JSON.stringify(o.firingArc) +
        ' ctrlMain=' + o.control.main + ' ctrlFire=' + o.control.fire +
        ' skynet=' + o.aiSettings.SKYNET +
        ' gunsLen=' + o.guns.length + ' gunsSize=' + o.guns.size +
        ' shoot=' + JSON.stringify([...o.guns.values()].map(g => g.canShoot)) +
        ' track=' + JSON.stringify([...o.guns.values()].map(g => g.canShoot ? g.getTracking() : null)));
    }
  }
}
