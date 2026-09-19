// Captures what the server sends a player whose body has just died.
//
//   node tools/harness/probe-death.js [--seed N] [--gamemode ffa] [--out FILE]
//
// The death branch (sockets.js:1513-1532) runs inside the frame, before the
// camera is read, and it does four things in one order: mark the socket
// deceased, send `F` with the whole scoreboard, drop the body, and start the
// respawn clock. Two of those are only observable from outside -- the frame the
// client gets, and what the socket will accept next -- so they are measured
// here rather than read off the source.
//
// What the probe settles:
//
//   * the `F` payload, field by field, including the lifetime in whole seconds
//     and the variable-length killer tail,
//   * whether the frame that carries it also carries an uplink,
//   * what the HUD does on the same frame,
//   * that the body is gone from the room afterwards and the socket will take a
//     fresh `s`,
//   * and how a body killed with no killer differs from one with a list.
//
// internal/wire's TestDeathMatchesNode replays it.

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
const OUT = flag('out', null);

const det = require('./determinism.js').install({ seed: SEED });
const { boot } = require('./bootserver.js');
const { connectClient } = require('./fakesocket.js');

// maxPlayers, because this probe connects two clients: on the default of 1 the
// second is refused mid-handshake and then spawns anyway on a closed socket, and
// every frame it is sent afterwards is silently dropped. See found-bugs #82.
const srv = boot({ det, gamemode: GAMEMODE, maxPlayers: 8, config: { bot_cap: 0 } });
const { manager, serverRoot } = srv;

const steps = [];
function step(name, note, fn) {
  const before = det.rngCalls;
  let value = null;
  let threw = null;
  try {
    value = fn();
  } catch (e) {
    threw = String((e && e.message) || e);
  }
  steps.push({
    name, note, threw,
    draws: det.rngCalls - before,
    // The two clocks a Go replay has to stand on before it can compare a
    // lifetime: util.time() is what the report measures against, and the tick
    // count is what drives it.
    time: util.time(),
    ticks: srv.ticksRun(),
    value: value === undefined ? null : value,
  });
  return value;
}

function spawnClient(name) {
  const s = connectClient(manager, { serverRoot });
  s.clientSend('k', '');
  s.clientSend('s', '', 1, 0, false, 0);
  s.clientSend('s', name, 0, 0, false, 0);
  srv.advance(20);
  if (!s.player.body) throw new Error(`probe-death: no body for ${name}`);
  return s;
}

const socket = spawnClient('Doomed');
const body = socket.player.body;
// `let begin = util.time()` (sockets.js:1251) was taken inside that call, so
// this is the origin the report's lifetime is measured from -- to within
// whatever the spawn poll's own 20 ms did, which is why it is recorded rather
// than assumed.
const spawnedAt = util.time();

// A score and a few kills, so every field of the report has something in it
// rather than a zero.
for (let i = 0; i < 12; i++) socket.clientSend('L');
body.killCount.solo = 3;
body.killCount.assists = 2;
body.killCount.bosses = 1;
body.killCount.polygons = 7;

// Some ticks, so the lifetime is not zero. util.time() is the clock the report
// measures against, and `begin` was captured when the body was made.
for (let i = 0; i < 60; i++) srv.tick();

step('what the report will be made of', 'Read off the room, so a Go replay can say whether a wrong field ' +
  'came from the report or from the body it was built from.',
  () => ({
    score: body.skill.score,
    level: body.skill.level,
    solo: body.killCount.solo,
    assists: body.killCount.assists,
    bosses: body.killCount.bosses,
    polygons: body.killCount.polygons,
    killers: body.killCount.killers.slice(),
    respawnDelay: Config.respawn_delay,
    deceased: socket.status.deceased,
    hasSpawned: socket.status.hasSpawned,
  }));

// entity.kill() (entity.js:1244) is what the suicide handler uses on children:
// invuln off, godmode off, health -100. The death is then noticed by the frame,
// which is the path under test.
const deathFrames = step('the frame the death arrives on',
  'kill() then one tick. sockets.js:1517 fires inside gazeUpon, BEFORE the camera ' +
  'is read, so the `F` goes out ahead of that frame\'s `u` -- and the `u` is the ' +
  'camera-only form, because the body is gone by the time it is written.',
  () => {
    socket.takeOutbox();
    body.kill();
    srv.tick();
    const frames = socket.takeOutbox();
    return {
      opcodes: frames.map(f => f[0]),
      report: frames.find(f => f[0] === 'F') || null,
      // sendMessage's frame is ['m', duration, text] (sockets.js:26). These come
      // from the room's own death handling (entity.js:1195-1204), not from the
      // socket layer, and they arrive before the report.
      messages: frames.filter(f => f[0] === 'm').map(f => f[2]),
      uplinkLength: (frames.find(f => f[0] === 'u') || []).length || null,
      deceased: socket.status.deceased,
      hasBody: !!socket.player.body,
      hasSpawned: socket.status.hasSpawned,
      readyToBroadcast: socket.status.readyToBroadcast,
    };
  });

step('the next tick sends nothing else', 'The body is null, so the death branch cannot run twice.',
  () => {
    socket.takeOutbox();
    srv.tick();
    const frames = socket.takeOutbox();
    return { opcodes: frames.map(f => f[0]), reports: frames.filter(f => f[0] === 'F').length };
  });

step('respawning', 'A second `s` after a death. status.deceased was set by the death branch, ' +
  'which is what stops sockets.js:224 kicking it for spawning while alive.',
  () => {
    socket.clientSend('s', 'Doomed', 0, 0, false, 0);
    srv.advance(20);
    return {
      hasBody: !!socket.player.body,
      newBodyID: socket.player.body ? socket.player.body.id : null,
      score: socket.player.body ? socket.player.body.skill.score : null,
      deceased: socket.status.deceased,
    };
  });

// A second client, killed with a list of killers, for the variable-length tail.
// The three ticks are not decoration: the spawn poll advances the clock 20 ms
// past the last tick, and the lifetime in the report is measured from the
// instant the body was made.
const second = spawnClient('Blamed');
const body2 = second.player.body;
for (let i = 0; i < 3; i++) srv.tick();
step('a death with killers', 'killCount.killers holds definition INDEX strings, not entity ids ' +
  '(entity.js:1138), so the tail is strings on the wire and stays valid after the ' +
  'killer itself dies.',
  () => {
    body2.killCount.killers.push('782', '791', '782');
    second.takeOutbox();
    body2.kill();
    srv.tick();
    const frames = second.takeOutbox();
    return {
      opcodes: frames.map(f => f[0]),
      report: frames.find(f => f[0] === 'F') || null,
      killers: body2.killCount.killers.slice(),
    };
  });

const out = {
  generatedBy: 'tools/harness/probe-death.js',
  seed: SEED,
  gamemode: GAMEMODE,
  note: 'The `F` payload is score, lifetime in whole seconds, respawn delay, then the ' +
        'four kill counters, then how many killers and that many index strings ' +
        '(sockets.js:1252).',
  respawnDelay: Config.respawn_delay,
  cycleSpeed: srv.cycleSpeed,
  spawnedAt,
  steps,
};

const text = JSON.stringify(out, null, 2) + '\n';
if (OUT) {
  fs.mkdirSync(path.dirname(OUT), { recursive: true });
  fs.writeFileSync(OUT, text);
  console.log(`wrote ${OUT}`);
} else {
  console.log(text);
}
