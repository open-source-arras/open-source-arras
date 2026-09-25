// Records what the `T` handler sends: the mockups a client needs to draw the
// whole upgrade tree its tank belongs to.
//
//   node tools/harness/probe-tanktree.js [--seed N] [--out FILE]
//
// `T` (sockets.js:675) is the client asking for the class tree, and what comes
// back is a burst of `M` frames -- one per class, in the order two mutually
// recursive functions reach them -- followed by a bare `T`. The order is the
// whole contract: sendMockup recurses into turrets and, for a class marked
// sendAllMockups, into every upgrade; sendMockupUpgrades recurses into upgrades
// only, and calls sendMockup for each class on the way. Both are guarded by
// per-socket "already sent" lists, and the two lists are SEPARATE, so a class can
// be sent by one and still be walked by the other.
//
// What the probe settles:
//
//   * the exact list of indexes a fresh tank's `T` sends, in order,
//   * that a second `T` with no change sends nothing but the bare `T`, because
//     status.lastTank still matches,
//   * what the roots are: the union of every rerootUpgradeTree on the classes in
//     a hyphenated index, deduplicated, in first-seen order,
//   * and that the mockups already sent by the spawn are not sent again.
//
// internal/wire's TestTankTreeMatchesNode replays it.

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
  steps.push({ name, note, draws: det.rngCalls - before, threw, value: value === undefined ? null : value });
  return value;
}

function spawnClient(name) {
  const s = connectClient(manager, { serverRoot });
  s.clientSend('k', '');
  s.clientSend('s', '', 1, 0, false, 0);
  s.clientSend('s', name, 0, 0, false, 0);
  srv.advance(20);
  if (!s.player.body) throw new Error(`probe-tanktree: no body for ${name}`);
  return s;
}

const socket = spawnClient('Treeman');
const body = socket.player.body;

// A `T` burst, as opcodes and as the mockup indexes in send order.
function askForTree(sock) {
  sock.takeOutbox();
  sock.clientSend('T');
  const frames = sock.takeOutbox();
  return {
    opcodes: frames.map(f => f[0]),
    mockups: frames.filter(f => f[0] === 'M').map(f => f[1]),
    lastTank: sock.status.lastTank,
    received: sock.status.mockupData.receivedIndexes.slice(),
    receivedUpgradePacks: sock.status.mockupData.receivedUpgradePackIndexes.slice(),
  };
}

step('the tank before anything is asked for', 'The spawn already pushed the mockups for what ' +
  'is on screen, so `T` only has to fill in the rest -- and which ones those are depends on ' +
  'what the client has been sent, not on the class alone.',
  () => ({
    index: body.index,
    label: body.label,
    lastTank: socket.status.lastTank,
    received: socket.status.mockupData.receivedIndexes.slice(),
    receivedUpgradePacks: socket.status.mockupData.receivedUpgradePackIndexes.slice(),
  }));

step('the first T', 'One burst of `M` frames and then the bare `T` the client waits for.',
  () => askForTree(socket));

step('a second T with the same tank', 'status.lastTank still matches body.index, so the whole ' +
  'body of the handler is skipped and only the acknowledgement goes out.',
  () => askForTree(socket));

step('T after an upgrade', 'A different index, so lastTank no longer matches and the walk runs ' +
  'again -- over the new class, and over whatever of the tree the two received lists have not ' +
  'already covered.',
  () => {
    // Level up to the first upgrade tier and take the first branch, the way
    // probe-upgrade.js does.
    for (let i = 0; i < 60 && !body.upgrades.some(u => body.skill.level >= u.level); i++) {
      socket.clientSend('L');
    }
    const before = body.index;
    socket.clientSend('U', 0, 0);
    // The upgrade delay: hold still and tick until it lands.
    for (let i = 0; i < 400 && body.index === before; i++) srv.tick();
    return {
      indexBefore: before,
      indexAfter: body.index,
      label: body.label,
      burst: askForTree(socket),
    };
  });

step('a fresh client asking for the same tree', 'Nothing has been sent to this socket except ' +
  'what its own spawn pushed, so the burst is the closest thing to the whole tree the handler ' +
  'ever produces.',
  () => {
    const s2 = spawnClient('Sapling');
    return {
      index: s2.player.body.index,
      received: s2.status.mockupData.receivedIndexes.slice(),
      burst: askForTree(s2),
    };
  });

const out = {
  generatedBy: 'tools/harness/probe-tanktree.js',
  seed: SEED,
  gamemode: GAMEMODE,
  note: 'Mockup indexes are recorded rather than mockup bodies: the bodies come from ' +
        'tools/dump-mockups.js and are already pinned. What `T` decides is which ones and ' +
        'in what order.',
  spawnClass: Config.spawn_class,
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
