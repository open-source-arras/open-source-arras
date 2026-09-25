// Reports which JS line each Math.random() draw came from, per tick, with a
// client attached.
//
//   node tools/harness/probe-clientdraws.js [--seed 1] [--bots 8] [--ticks 12] [--from 0] [--to 3]
//
// probe-drawsites.js does the same for the headless run the differential
// harness drives. This one is for the other simulation: with a view attached,
// entities near the camera stay awake instead of dozing for fifteen ticks in
// sixteen (subFunctions.js:20), so a client-connected room draws differently
// from a headless one and the two diagnostics do not substitute for each other.
//
// It is a diagnostic, not a reference. Nothing reads its output but a person.

'use strict';

require('../fdlibm-pow');

function arg(name, dflt) {
  const i = process.argv.indexOf('--' + name);
  return i === -1 ? dflt : Number(process.argv[i + 1]);
}
const SEED = arg('seed', 1);
const BOTS = arg('bots', 8);
const TICKS = arg('ticks', 12);
const FROM = arg('from', 0);
const TO = arg('to', TICKS - 1);
const GAMEMODE = process.argv.includes('--gamemode')
  ? process.argv[process.argv.indexOf('--gamemode') + 1] : 'ffa';

const det = require('./determinism.js').install({ seed: SEED });
const { boot } = require('./bootserver.js');
const { connectClient } = require('./fakesocket.js');

const srv = boot({ det, gamemode: GAMEMODE, config: { bot_cap: BOTS } });

const socket = connectClient(srv.manager, { serverRoot: srv.serverRoot });
socket.clientSend('k', '');
socket.clientSend('s', '', 1, 0, false, 0);
socket.clientSend('s', 'Watcher', 0, 0, false, 0);
srv.advance(20);
if (!socket.player.body) throw new Error('probe-clientdraws: no body after the spawn');

// The recording shim goes on after the join, so the boot's own draws are not in
// the way. It records the first frame inside the patched server tree, which is
// the line that actually asked for randomness; random.js frames are the shared
// helper rather than the caller and are skipped.
let recording = false;
let tally = new Map();
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
  }
  return rawRandom();
};

for (let t = 0; t < TICKS; t++) {
  recording = t >= FROM && t <= TO;
  tally = new Map();
  const before = det.rngCalls;
  srv.tick();
  const spent = det.rngCalls - before;
  if (!recording) continue;
  console.log(`tick ${t}: ${spent} draws, ${global.entities.size} entities`);
  for (const [site, n] of [...tally].sort((a, b) => b[1] - a[1])) {
    console.log(`  ${String(n).padStart(4)}  ${site}`);
  }
}
