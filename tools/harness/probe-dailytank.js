// Records the daily-tank slot: the three `DT*` ad opcodes (sockets.js:696-727)
// and the upgrade request that redefines into it (sockets.js:450-453 into
// entity.js:877-885).
//
//   node tools/harness/probe-dailytank.js [--seed N] [--out FILE]
//
// Config.daily_tank is not a config.js key -- it arrives as one of a server-list
// row's `properties`, which game.js:96-98 copies onto Config -- so this probe
// sets it the way that copy would, and the room boots with one. Without it all
// three opcodes kick, which is what six of the seven shipped rows do.
//
// What the probe settles:
//
//   * that Config.daily_tank_INDEX is resolved on connect, not at load,
//   * the exact `DTA` payload, including which of the two keys JSON.stringify
//     drops and which ad the one random draw picks,
//   * that an ad below the tier sends nothing at all, and that an upgrade below
//     the tier is silent while one above it without an ad is not,
//   * the delay between `DTA` and the socket being credited with the ad, which
//     is two nested setTimeouts and a ping,
//   * and the whole upgrade: the popups, the label, and the emptied menu.
//
// internal/wire's TestDailyTankMatchesNode replays it.

'use strict';

require('../fdlibm-pow');
const fs = require('fs');
const path = require('path');

function flag(name, dflt) {
  const i = process.argv.indexOf('--' + name);
  return i === -1 ? dflt : process.argv[i + 1];
}
const SEED = Number(flag('seed', 1));
const OUT = flag('out', null);

// The shipped daily_tank (config.js:99-113), with one addition: an
// image_wait_time on the image entry, so the branch that reads it is exercised
// rather than only the `?? "3"` fallback.
const DAILY_TANK = {
  tank: 'whirlwind',
  tier: 3,
  ads: true,
  ad_sources: [
    { file: 'example_video_ad.mp4', use_regular_ad_size: true },
    { file: 'example_image_ad.png', use_regular_ad_size: true, image_wait_time: 2 },
  ],
};

const det = require('./determinism.js').install({ seed: SEED });
const { boot } = require('./bootserver.js');
const { connectClient } = require('./fakesocket.js');

const srv = boot({
  det,
  gamemode: 'ffa',
  maxPlayers: 8,
  config: { bot_cap: 0, daily_tank: DAILY_TANK },
});
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
    name, note,
    draws: det.rngCalls - before,
    threw,
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
  if (!s.player.body) throw new Error(`probe-dailytank: no body for ${name}`);
  return s;
}

function tickFor(ms) {
  const n = Math.ceil(ms / srv.cycleSpeed) + 1;
  for (let i = 0; i < n; i++) srv.tick();
}

const popups = frames => frames.filter(f => f[0] === 'm').map(f => f[2]);
const opsOf = frames => frames.map(f => f[0]);

const socket = spawnClient('Watcher');
const body = socket.player.body;

step('the index is resolved on connect', 'sockets.js:2225-2231 assigns ' +
  'Config.daily_tank_INDEX inside connect(), so it does not exist until somebody has ' +
  'joined -- and it is the class ordinal as a string, not the class name.',
  () => ({
    tank: Config.daily_tank.tank,
    tier: Config.daily_tank.tier,
    ads: Config.daily_tank.ads,
    tierMultiplier: Config.tier_multiplier,
    index: Config.daily_tank_INDEX ?? null,
    upgradeDelay: Config.upgrade_delay,
    bodyLevel: body.skill.level,
  }));

step('an ad request below the tier', 'The level test at sockets.js:698 fails, and failing ' +
  'it is silence -- no frame, no popup, no draw.',
  () => {
    socket.takeOutbox();
    socket.clientSend('DTA');
    const frames = socket.takeOutbox();
    return { opcodes: opsOf(frames), watchedAdClient: !!socket.status.daily_tank_watched_ad_client };
  });

step('level up past the tier', 'The `L` cheat, the same route probe-upgrade.js takes.',
  () => {
    let guard = 400;
    while (body.skill.level < Config.tier_multiplier * Config.daily_tank.tier && guard--) {
      socket.clientSend('L');
    }
    return { level: body.skill.level, points: body.skill.points };
  });

step('an upgrade request before the ad', 'entity.js:884: above the tier and without the ad, ' +
  'the request is refused with a message rather than ignored.',
  () => {
    socket.takeOutbox();
    socket.clientSend('U', 0, -1);
    const frames = socket.takeOutbox();
    return {
      said: popups(frames),
      index: body.index,
      label: body.label,
      upgrades: body.upgrades.length,
      pending: body.upgradePending ? {
        number: body.upgradePending.number,
        tankLabel: body.upgradePending.tankLabel,
        dailyTankRequest: !!body.upgradePending.dailyTankRequest,
      } : null,
    };
  });

const ad = step('the ad request', 'One draw -- ran.choose over ad_sources -- and one DTA frame. ' +
  'The payload is built by hand in the source, so which keys are present is part of it.',
  () => {
    socket.takeOutbox();
    socket.clientSend('DTA');
    const frames = socket.takeOutbox();
    return {
      opcodes: opsOf(frames),
      payload: (frames.find(f => f[0] === 'DTA') || [])[1] ?? null,
      watchedAdClient: !!socket.status.daily_tank_watched_ad_client,
      watchedAd: !!socket.status.daily_tank_watched_ad,
    };
  });

step('acknowledging before the timer lands', 'DTAD only answers once the server has decided ' +
  'the ad has actually played; until then it is silence.',
  () => {
    socket.takeOutbox();
    socket.clientSend('DTAD');
    return { opcodes: opsOf(socket.takeOutbox()), watchedAd: !!socket.status.daily_tank_watched_ad };
  });

const isImage = /\.(png|jpe?g)$/.test(JSON.parse(ad.payload || '{}').src || '');
step('the ad timer lands', 'The nested pair at sockets.js:703-707: the client ping, then the ' +
  'wait time in seconds. Only an image ad arms them -- a video one never credits itself, so ' +
  'the client has to say when it finished.',
  () => {
    tickFor(6000);
    return {
      isImage,
      watchedAdClient: !!socket.status.daily_tank_watched_ad_client,
      watchedAd: !!socket.status.daily_tank_watched_ad,
    };
  });

step('acknowledging after it lands', 'Now DTAD answers, and the socket is credited.',
  () => {
    socket.takeOutbox();
    socket.clientSend('DTAD');
    return { opcodes: opsOf(socket.takeOutbox()), watchedAd: !!socket.status.daily_tank_watched_ad };
  });

step('the upgrade', 'entity.js:877-885 with the ad watched. The menu is emptied and the body ' +
  'is redefined into the named class, then the shared tail sends the popups.',
  () => {
    socket.takeOutbox();
    socket.clientSend('U', 0, -1);
    const frames = socket.takeOutbox();
    return {
      said: popups(frames),
      index: body.index,
      label: body.label,
      upgrades: body.upgrades.length,
      defs: body.defs.slice(),
      pending: body.upgradePending ? { tankLabel: body.upgradePending.tankLabel } : null,
    };
  });

step('the ad start acknowledgement', 'DTAST answers immediately and, because its case has no ' +
  'break, falls through into NWB and forces a full rebroadcast.',
  () => {
    const s2 = spawnClient('Starter');
    s2.takeOutbox();
    s2.clientSend('DTAST', 4.75);
    const frames = s2.takeOutbox();
    const before = !!s2.status.daily_tank_watched_ad_client;
    tickFor(6000);
    return {
      opcodes: opsOf(frames),
      forceNewBroadcast: !!s2.status.forceNewBroadcast,
      watchedAdClientBefore: before,
      watchedAdClientAfter: !!s2.status.daily_tank_watched_ad_client,
    };
  });

const out = {
  generatedBy: 'tools/harness/probe-dailytank.js',
  seed: SEED,
  gamemode: 'ffa',
  dailyTank: DAILY_TANK,
  note: 'Config.daily_tank is set the way a server-list row\'s properties would set it.',
  cycleSpeed: srv.cycleSpeed,
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
