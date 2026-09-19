// Drives a real client all the way from connect() to a spawned body, and prints
// what the server drew and what it built.
//
//   node tools/harness/probe-spawn.js [--seed N] [--gamemode ffa] [--name X] [--out FILE]
//
// The differential corpus is headless: it proves the simulation matches with
// nobody watching. It cannot prove the thing that actually decides whether a
// deployed Go server stays in step with a deployed Node one, which is whether a
// player JOINING spends the same randomness in the same order.
//
// getSpawnLocation (sockets.js:1127) draws a team in tdm and tag rooms whether or
// not it uses it, and two more for a random point unless the room has a fixed
// spawn; spawn() (:1145) draws a team in the default branch and a colour when
// random_body_colors is on. Get any of those counts wrong and the port is
// identical right up to the moment somebody plays it, and then permanently
// wrong.
//
// So this counts them. It boots the real server the way run.js does, connects a
// fake socket (tools/harness/fakesocket.js) through the real socketManager,
// walks the real handshake, and records the draw counter either side of each
// step along with every field of the body that came out.
//
// internal/wire's TestSpawnMatchesNode asserts the same numbers.

'use strict';

require('../fdlibm-pow');
const fs = require('fs');
const path = require('path');

function flag(name, dflt) {
  const i = process.argv.indexOf('--' + name);
  return i === -1 ? dflt : process.argv[i + 1];
}
const SEED = Number(flag('seed', 1));
const GAMEMODE = String(flag('gamemode', 'ffa'));
const NAME = String(flag('name', 'Probe'));
const TICKS = Number(flag('ticks', 0));
const OUT = flag('out', null);

const det = require('./determinism.js').install({ seed: SEED });

const serverRoot = path.join(__dirname, 'js', 'server');
if (!fs.existsSync(serverRoot)) {
  console.error(`patched tree missing at ${serverRoot}\nrun: node tools/harness/setup.js`);
  process.exit(1);
}
const dotenv = require(path.join(serverRoot, 'lib', 'dotenv.js'));
const envFile = path.join(serverRoot, '.env');
if (fs.existsSync(envFile)) {
  const env = dotenv(fs.readFileSync(envFile).toString());
  for (const k in env) process.env[k] = env[k];
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
global.onServerLoaded = () => {};
global.launchedOnMainServer = true;
global.servers.push({ loadedViaMainServer: true });

const { gameServer } = require(path.join(serverRoot, 'game.js'));
const manager = new gameServer(
  Config.host, Config.port, GAMEMODE.split(',').map(s => s.trim()).filter(Boolean),
  'Harness', 'Local', 'Harness',
  { id: 'harness', maxPlayers: 1 }, {}, false, false, false, false);
global.gameManager = manager;
console.log = realLog;

const { connectClient } = require('./fakesocket.js');

// Steps are recorded rather than asserted: the probe's job is to say what Node
// did, and the Go test's job is to agree with it.
const steps = [];
function step(name, fn) {
  const before = det.rngCalls;
  const value = fn();
  steps.push({ name, draws: det.rngCalls - before, value: value === undefined ? null : value });
  return value;
}

// gameServer's constructor already ran start(), so the room and its gameHandler
// exist by now. What it also did was arm the game loop on an interval
// (game/index.js:515); the harness drives the tick body itself so the count is
// exact, and run.js drops the same timer for the same reason.
const handler = manager.gameHandler;
if (!handler.harnessGameLoopTimer) {
  throw new Error('gameHandler.harnessGameLoopTimer missing -- re-run tools/harness/setup.js');
}
clearInterval(handler.harnessGameLoopTimer);
const cycleSpeed = manager.room.cycleSpeed;
let ticks = 0;
function tick() {
  ticks++;
  det.advanceTo(ticks * cycleSpeed);
  handler.gameloop();
}

steps.push({
  name: 'boot',
  draws: det.rngCalls,
  value: { entities: global.entities.size, cycleSpeed },
});

// checkUsers gates the whole loop body on a connected socket (game/index.js:14),
// so ticking before the client joins would do nothing. Ticks before the join are
// therefore only meaningful with a client already present, which is why the
// default is none.
if (TICKS) {
  step(`${TICKS} ticks before joining`, () => {
    for (let i = 0; i < TICKS; i++) tick();
    return { entities: global.entities.size };
  });
}

let socket = null;
step('connect', () => {
  socket = connectClient(manager, { serverRoot });
  return {
    id: socket.id,
    ip: socket.ip,
    frames: socket.opcodesSince(0),
    clients: manager.socketManager.clients.length,
  };
});

// The client's half of the handshake, in the order socketinit.js sends it: `k`
// answers `W`, then `s` with needsRoom answers `w`.
step('key', () => {
  socket.clientSend('k', '');
  return { frames: socket.opcodesSince(0), verified: socket.status.verified };
});

const beforeRoom = socket.outbox.length;
step('needsRoom', () => {
  socket.clientSend('s', '', 1, 0, false, 0);
  return {
    frames: socket.opcodesSince(beforeRoom),
    camera: { x: socket.camera.x, y: socket.camera.y, fov: socket.camera.fov },
    rememberedTeam: socket.rememberedTeam === undefined ? null : socket.rememberedTeam,
    playerLoc: socket.player.loc ? { x: socket.player.loc.x, y: socket.player.loc.y } : null,
  };
});

const beforeSpawn = socket.outbox.length;

// The spawn request itself creates NOTHING. sockets.js:304 arms a 20 ms
// setInterval and returns; even when all three conditions already hold, the
// first check is one timer tick away. So this step must draw nothing and send
// nothing, and the body appears in the next one.
step('spawn request', () => {
  socket.clientSend('s', NAME, 0, 0, false, 0);
  return {
    frames: socket.opcodesSince(beforeSpawn),
    hasBody: !!socket.player.body,
    pendingTimers: det.pendingTimers(),
  };
});

// Firing that timer without running a game loop, so initalizePlayer's draws are
// its own and not mixed with a tick's.
const beforeInit = socket.outbox.length;
step('the 20ms poll fires', () => {
  det.advanceTo(det.clock.ms + 20);
  return {
    frames: socket.opcodesSince(beforeInit),
    hasBody: !!socket.player.body,
    readyToBroadcast: socket.status.readyToBroadcast,
    camera: { x: socket.camera.x, y: socket.camera.y, fov: socket.camera.fov },
  };
});

// The body, as it stands the moment initalizePlayer finished and before any tick
// has touched it. This is what internal/room's SpawnPlayerBody has to produce.
function snapshotBody(body) {
  if (!body) return null;
  return {
    id: body.id,
    label: body.label,
    index: body.index,
    name: body.name,
    team: body.team,
    colorBase: body.color.base,
    x: body.x, y: body.y,
    size: body.size, SIZE: body.SIZE,
    health: body.health.amount, healthMax: body.health.max,
    shield: body.shield.amount, shieldMax: body.shield.max,
    invuln: body.invuln,
    isProtected: !!body.isProtected,
    isPlayer: !!body.isPlayer,
    rerootUpgradeTree: body.rerootUpgradeTree === undefined ? null : body.rerootUpgradeTree,
    skillPoints: body.skill.points,
    skillLevel: body.skill.level,
    skillScore: body.skill.score,
    acceleration: body.acceleration,
    topSpeed: body.topSpeed,
    canSeeInvisible: !!body.settings.canSeeInvisible,
    upgrades: body.upgrades.map(u => ({
      branch: u.branch, branchLabel: u.branchLabel, index: u.index, level: u.level,
    })),
    controllers: body.controllers.map(c => c.constructor.name),
  };
}

const bodyAtSpawn = snapshotBody(socket.player.body);

// One frame with the client watching. This is the first thing a browser draws,
// and it is also where the HUD's first block goes out.
const beforeFrame = socket.outbox.length;
step('one frame with a client watching', () => {
  tick();
  const frames = socket.outbox.slice(beforeFrame);
  const uplink = frames.filter(f => f[0] === 'u').pop() || null;
  return {
    opcodes: frames.map(f => f[0]),
    // The GUI mask, and how long the uplink is. Both are read by the Go test.
    guiMask: uplink ? uplink[8] : null,
    uplinkLength: uplink ? uplink.length : null,
  };
});

const body = socket.player.body;
const bodySnap = bodyAtSpawn;

const out = {
  generatedBy: 'tools/harness/probe-spawn.js',
  seed: SEED,
  gamemode: GAMEMODE,
  name: NAME,
  ticksBeforeJoin: TICKS,
  note: 'draws is Math.random calls spent by that step. The counts are what a Go ' +
        'port has to match exactly: getSpawnLocation and spawn each draw, and a ' +
        'wrong count moves every later draw in the room.',
  steps,
  body: bodySnap,
  bodyAfterOneTick: snapshotBody(socket.player.body),
  skippedUpgrades: body && body.skippedUpgrades
    ? Array.from(body.skippedUpgrades, x => (x === undefined ? 0 : x))
    : null,
  totalDraws: det.rngCalls,
};

const text = JSON.stringify(out, null, 2) + '\n';
if (OUT) {
  fs.mkdirSync(path.dirname(OUT), { recursive: true });
  fs.writeFileSync(OUT, text);
  console.log(`wrote ${OUT}`);
} else {
  console.log(text);
}
