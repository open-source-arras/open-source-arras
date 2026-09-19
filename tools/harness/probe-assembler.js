// Drives the assembler merge (game/index.js:133-165) directly and prints every field
// it touches, because no run reaches it on its own.
//
//   node tools/harness/probe-assembler.js
//
// The merge needs two entities whose settings.hitsOwnType is "assembler" -- in the
// shipped data that is exactly `assemblent`, the trap an Assembler drops -- to touch
// while they share a parent. Bots do drop them, and 1,500-tick differentials across
// six gamemodes with --spawnclass assembler never once had two of them meet: they are
// fired 25 ticks apart, they creep outward at SPEED 0.7 and die at RANGE 200, and the
// tank has moved on by the time the next one lands. So the pair is built here instead,
// put on top of each other, and collided by hand.
//
// It boots the real server the way run.js does and calls the real
// gameHandler.collide, so what it prints is Node's answer and not a model of it.
// internal/wire's TestAssemblerMergeMatchesNode asserts the same numbers.
'use strict';

require('../fdlibm-pow');
const fs = require('fs');
const path = require('path');

function arg(name, dflt) {
  const i = process.argv.indexOf('--' + name);
  return i === -1 ? dflt : Number(process.argv[i + 1]);
}
const SEED = arg('seed', 1);
// The generator is re-seeded immediately before the merge so the ten effect entities'
// velocities start from draw 0 of a known stream, which is what makes them comparable
// against a Go test that has not run a boot at all.
const MERGE_SEED = arg('mergeseed', 12345);

const det = require('./determinism.js').install({ seed: SEED });

const serverRoot = path.join(__dirname, 'js', 'server');
const dotenv = require(path.join(serverRoot, 'lib', 'dotenv.js'));
const envFile = path.join(serverRoot, '.env');
if (fs.existsSync(envFile)) {
  const env = dotenv(fs.readFileSync(envFile).toString());
  for (const k in env) process.env[k] = env[k];
}

const realLog = console.log;
console.log = () => {};
console.warn = () => {};

// loader.js installs Class, Config, entities, ran, definitionCombiner and Entity onto
// global, which is why none of them are required by name here.
const GLOBAL = require(path.join(serverRoot, 'loaders', 'loader.js'));
new definitionCombiner({
  groups: path.join(serverRoot, 'lib', 'definitions', 'groups'),
  addonsFolder: path.join(serverRoot, 'lib', 'definitions', 'entityAddons'),
}).loadDefinitions();
GLOBAL.loadRooms(false);
global.onServerLoaded = () => {};
global.launchedOnMainServer = true;
global.servers.push({ loadedViaMainServer: true });

const { gameServer } = require(path.join(serverRoot, 'game.js'));
const manager = new gameServer(
  Config.host, Config.port, ['ffa'], 'Harness', 'Local', 'Harness',
  { id: 'harness', maxPlayers: 1 }, {}, false, false, false, false);
global.gameManager = manager;
const handler = manager.gameHandler;
console.log = realLog;

// The parent both traps report. The merge only cares that the two ids match, so this
// is a bare object rather than a tank -- a real Assembler would put itself here.
const parent = { id: 4242 };

function makeTrap(x, y) {
  const o = new Entity({ x, y });
  o.define('assemblent');
  o.team = -1;
  o.parent = parent;
  o.refreshBodyAttributes();
  o.health.amount = o.health.max;
  return o;
}

// Overlapping, so advancedcollide has something to push apart after the merge.
const a = makeTrap(0, 0);
const b = makeTrap(2, 0);

const before = {
  hitsOwnType: a.settings.hitsOwnType,
  a: snap(a),
  b: snap(b),
  entities: global.entities.size,
};

const knownIds = new Set([...global.entities.keys()]);
const drawsBefore = det.rngCalls;
Math.random = det.mulberry32(MERGE_SEED);
let merged = 0;
Math.random = (raw => function random() { merged++; return raw(); })(Math.random);

handler.collide(a, b);

const fresh = [];
for (const [id, e] of global.entities) {
  if (knownIds.has(id)) continue;
  fresh.push({
    id, label: e.label, team: e.team, SIZE: e.SIZE, size: e.size,
    vx: e.velocity.x, vy: e.velocity.y, alpha: e.alpha,
    motionType: e.settings.motionType,
  });
}

function snap(e) {
  return {
    id: e.id,
    assemblerLevel: e.assemblerLevel === undefined ? null : e.assemblerLevel,
    SIZE: e.SIZE, SPEED: e.SPEED, HEALTH: e.HEALTH, DAMAGE: e.DAMAGE,
    health: e.health.amount, healthMax: e.health.max,
    dead: e.isDead(),
    x: e.x, y: e.y, vx: e.velocity.x, vy: e.velocity.y,
  };
}

realLog(JSON.stringify({
  seed: SEED,
  mergeSeed: MERGE_SEED,
  before,
  after: { a: snap(a), b: snap(b) },
  drawsBeforeMerge: drawsBefore,
  drawsInMerge: merged,
  spawned: fresh,
}, null, 2));

det.clearAllTimers();
