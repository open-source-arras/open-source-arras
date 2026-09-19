// Drives a spawned player through the upgrade and stat-point paths, and prints
// what the real server does with each request.
//
//   node tools/harness/probe-upgrade.js [--seed N] [--gamemode ffa] [--out FILE]
//
// Three things this exists to settle, none of which a reading of the source can:
//
//   1. The stand-still delay. `Config.upgrade_delay` is 3,000 ms, and outside a
//      base an upgrade does not apply -- it parks in `upgradePending` and waits
//      for the player to hold still. What the server sends in the meantime, and
//      what the HUD does with an emptied upgrade list, is measured here.
//   2. Which row a delayed upgrade actually lands on. entity.js:855 reads
//      `this.upgrades[number]` with the RAW number to find a label, and
//      entity.js:888 applies `skippedUpgrades` to that same number before reading
//      the row it will really use. When any upgrade has been skipped those are
//      two different rows.
//   3. Whether an out-of-range index takes the process down. `incoming` has no
//      try/catch, and the delay branch dereferences `upgrade.class` without a
//      bounds check.
//
// internal/wire's TestUpgradeMatchesNode asserts what comes out.

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

const srv = boot({ det, gamemode: GAMEMODE });
const { manager, serverRoot } = srv;

const steps = [];
function step(name, fn) {
  const before = det.rngCalls;
  let value = null;
  let threw = null;
  try {
    value = fn();
  } catch (e) {
    threw = String((e && e.message) || e);
  }
  steps.push({
    name,
    draws: det.rngCalls - before,
    threw,
    value: value === undefined ? null : value,
  });
  return value;
}

// A spawned player, by the same route probe-spawn.js takes.
//
// Each kick test gets a client of its own. A kicked socket is closed, its body is
// killed, and bringToLife stops running for it -- so a kick anywhere in the middle
// silently turns every later step into a no-op against a dead entity.
function spawnClient(name) {
  const s = connectClient(manager, { serverRoot });
  s.clientSend('k', '');
  s.clientSend('s', '', 1, 0, false, 0);
  s.clientSend('s', name, 0, 0, false, 0);
  srv.advance(20); // the 20 ms poll at sockets.js:304
  if (!s.player.body) throw new Error(`probe-upgrade: no body for ${name}`);
  return s;
}

const socket = spawnClient('Upgrader');
const body = socket.player.body;

// Levelling by hand rather than by playing: the `L` cheat is the shortest route
// to a body with upgrades available, and Config.level_cap_cheat allows it.
step('level up to the first upgrade tier', () => {
  let guard = 200;
  while (body.skill.level < Config.tier_multiplier && guard--) {
    socket.clientSend('L');
  }
  return { level: body.skill.level, points: body.skill.points, score: body.skill.score };
});

// One frame, so the HUD publishes the upgrade list the client would click on.
socket.takeOutbox();
srv.tick();
function guiOf(frames) {
  const u = frames.filter(f => f[0] === 'u').pop();
  return u ? u[8] : null;
}
const afterLevel = socket.takeOutbox();

step('the menu the client sees', () => ({
  guiMask: guiOf(afterLevel),
  upgrades: body.upgrades
    .filter(u => body.skill.level >= u.level)
    .map(u => `${u.branch}_${u.branchLabel}_${u.index}`),
  skippedUpgrades: Array.from(body.skippedUpgrades || [], x => (x === undefined ? 0 : x)),
  inBase: body.inBase(),
  upgradeDelay: Config.upgrade_delay,
}));

// --- the stat point path ----------------------------------------------------
// `x` carries a stat index and a max flag. sockets.js:492 loops while max is set
// and there are points left, so max=1 pours everything into one stat at once.
const STATS = ['atk', 'hlt', 'spd', 'str', 'pen', 'dam', 'rld', 'mob', 'rgn', 'shi'];
step('one point into atk', () => {
  socket.clientSend('x', 0, 0);
  return {
    amounts: STATS.map(s => body.skill.amount(s)),
    points: body.skill.points,
    health: body.health.max,
    topSpeed: body.topSpeed,
  };
});
step('max out hlt', () => {
  socket.clientSend('x', 1, 1);
  return {
    amounts: STATS.map(s => body.skill.amount(s)),
    points: body.skill.points,
    health: body.health.max,
    cap: body.skill.cap('hlt'),
  };
});
step('a stat with no points left', () => {
  socket.clientSend('x', 2, 0);
  return { amounts: STATS.map(s => body.skill.amount(s)), points: body.skill.points };
});
step('an out-of-range stat index kicks', () => {
  const victim = spawnClient('StatKick');
  victim.clientSend('x', 99, 0);
  return { kickedFor: victim.kickedFor, closed: victim.closed };
});

// --- the upgrade path -------------------------------------------------------
// The body has been moving since it spawned, so lastMovementTime is recent and
// the delay applies. This is the ordinary case for a player in ffa.
const beforeUpgrade = socket.outbox.length;
const labelBefore = body.label;
step('an upgrade request outside a base', () => {
  socket.clientSend('U', 0, 0);
  return {
    label: body.label,
    pending: body.upgradePending
      ? {
          number: body.upgradePending.number,
          branchId: body.upgradePending.branchId,
          // global.js:217 reads `.branch`, which entity.js:864 never writes.
          branch: body.upgradePending.branch === undefined ? null : body.upgradePending.branch,
          tankLabel: body.upgradePending.tankLabel,
          lastIndex: body.upgradePending.lastIndex,
        }
      : null,
    // sendMessage's frame is ['m', duration, text] (sockets.js:26), so the
    // text is field 2.
    messages: socket.outbox.slice(beforeUpgrade).filter(f => f[0] === 'm').map(f => f[2]),
  };
});

// The HUD empties the upgrade list while one is pending (sockets.js:936).
socket.takeOutbox();
srv.tick();
step('the menu while an upgrade is pending', () => {
  const frames = socket.takeOutbox();
  return { guiMask: guiOf(frames) };
});

// Holding still. The delay is measured from max(lastMovementTime, lastFiredTime),
// and the resolver at global.js:216 applies the upgrade once it has elapsed.
step('hold still past the delay', () => {
  const target = Config.upgrade_delay + 200;
  const before = det.clock.ms;
  let guard = 2000;
  let ticks = 0;
  while (det.clock.ms - before < target && guard-- && body.upgradePending) {
    srv.tick();
    ticks++;
  }
  const now = Date.now();
  return {
    ticks,
    label: body.label,
    index: body.index,
    pending: body.upgradePending ? 'still pending' : null,
    labelChanged: body.label !== labelBefore,
    // The resolver's own three inputs, so a stuck upgrade says why.
    sinceLastAction: now - Math.max(body.lastMovementTime, body.lastFiredTime),
    isPlayer: !!body.isPlayer,
    dead: body.isDead(),
  };
});

// --- the crash --------------------------------------------------------------
// A second player, because the first has upgraded and its menu has changed. The
// index is past the end of the list, which the delay branch does not check.
const socket2 = spawnClient('Crasher');
const body2 = socket2.player.body;

step('an out-of-range upgrade index while the delay applies', () => {
  if (!body2) return { skipped: 'no second body' };
  return {
    upgradeCount: body2.upgrades.length,
    inBase: body2.inBase(),
    // The throw, if it comes, is caught by step() and reported as `threw`.
    sent: (socket2.clientSend('U', 999, 0), true),
    kickedFor: socket2.kickedFor,
  };
});

const out = {
  generatedBy: 'tools/harness/probe-upgrade.js',
  seed: SEED,
  gamemode: GAMEMODE,
  note: 'draws is Math.random calls spent by that step; threw is the message of an ' +
        'exception that escaped the handler, which sockets.js:187 does not catch.',
  upgradeDelay: Config.upgrade_delay,
  tierMultiplier: Config.tier_multiplier,
  levelCapCheat: Config.level_cap_cheat,
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
