// Records what Config.clan_wars_ft (game/gamemodes/scripts/clan_wars.js) does.
//
//   node tools/harness/probe-clanwars.js [--seed N] [--out FILE]
//
// The clan roster is the only part of a clan_wars room that a headless sweep
// cannot reach: every entry point takes a player NAME, and the differential
// harness never spawns a named player. So the four closures are driven here
// directly, with plain objects standing in for bodies -- which is all the source
// ever asks of them, since it reads only x, y, size and originalName.
//
// What the probe settles:
//
//   * the team and index each new clan is stamped with, in creation order,
//   * that a second member of a known clan joins it rather than starting another,
//   * where a member spawns relative to the clanmate chosen for them, and how
//     many random numbers each spawn costs,
//   * what an empty clan and an unknown tag fall back to, and what those cost,
//   * and what removing a body that is not on the roster does to the roster.
//
// internal/room's TestClanWarsMatchesNode replays it.

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

const det = require('./determinism.js').install({ seed: SEED });
const { boot } = require('./bootserver.js');

const srv = boot({ det, gamemode: 'clan_wars', config: { bot_cap: 0 } });
const BOOT_DRAWS = det.rngCalls;

const ft = Config.clan_wars_ft;

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
  steps.push({ name, note, at: before, draws: det.rngCalls - before, threw, value: value === undefined ? null : value });
  return value;
}

// The roster as the Go side can see it: clans in creation order, each with the
// ids of its party members. Bodies are the fakes below, so `id` is ours.
const roster = () => ft.getClans().map(c => ({
  fullClanName: c.fullClanName,
  clanName: c.clanName,
  team: c.team,
  index: c.index,
  party: c.partyEntities.map(e => e.id),
}));

let nextID = 1;
const bodies = {};
function fakeBody(name, x, y, size) {
  const b = { id: nextID++, originalName: name, name, x, y, size };
  bodies[b.id] = b;
  return b;
}

step('an empty roster', 'Nothing registered yet; getClans is the array the loop walks.',
  () => ({ clans: roster() }));

step('registering a tag with no body', 'sockets.js:1132 calls add(name) with one argument, so ' +
  'addToPartyList defaults to false and only the clan is created. `team: this.teamID++` and ' +
  '`index: this.index++` both store the pre-increment value, so the FIRST clan is filed under ' +
  'index -1.',
  () => {
    ft.add('[AAA] Alice');
    return { clans: roster() };
  });

step('a second tag', 'The counters carry over: teamID climbs from 110, index from -1.',
  () => {
    ft.add('[BBB] Bob');
    return { clans: roster() };
  });

step('a name with no tag', 'checkName finds no brackets, so nothing happens at all.',
  () => {
    ft.add('Untagged Player');
    return { clans: roster() };
  });

step('adding a body to a known clan', 'sockets.js:1200 passes the fresh body as addToPartyList. ' +
  'The clan is re-found rather than reused, which is what lets this land on a tag registered ' +
  'by an earlier call.',
  () => {
    ft.add('[AAA] Alice', fakeBody('[AAA] Alice', 100, 200, 30));
    return { clans: roster() };
  });

step('adding a body under a brand new tag', 'One call does both halves: create the clan, then ' +
  'put the body in it.',
  () => {
    ft.add('[CCC] Carol', fakeBody('[CCC] Carol', -500, 750, 12));
    return { clans: roster() };
  });

step('a second body in the same clan', 'Two members, so getSpawn has something to choose between.',
  () => {
    ft.add('[AAA] Andy', fakeBody('[AAA] Andy', -40, -60, 55));
    return { clans: roster() };
  });

step('getPlayerInfo for a known tag', 'The clan\'s own team and its bracketed name.',
  () => ft.getPlayerInfo('[AAA] Anyone'));

step('getPlayerInfo for an unknown name', 'getRandomTeam(), which draws.',
  () => ft.getPlayerInfo('Nobody At All'));

step('getPlayerInfo for an unregistered tag', 'A bracketed name whose clan was never added ' +
  'takes the same branch as an unbracketed one, because the find comes back undefined.',
  () => ft.getPlayerInfo('[ZZZ] Zoe'));

// Six spawns off the same two-member clan, so the choice, both offsets and the
// draw count are all pinned rather than one lucky sample.
step('six spawns beside a clanmate', 'ran.choose picks a member, then one Math.random per axis. ' +
  'The two axes are not mirror images: x spreads over `size - 24` and shifts DOWN by size, ' +
  'y spreads over `size + 24` and shifts UP by it, so a new member always lands below and ' +
  'left of the clanmate they spawned on.',
  () => {
    const out = [];
    for (let i = 0; i < 6; i++) {
      const before = det.rngCalls;
      const loc = ft.getSpawn('[AAA] Someone');
      out.push({ x: loc.x, y: loc.y, draws: det.rngCalls - before });
    }
    return out;
  });

step('a spawn beside the only member of a clan', 'One candidate, so the choice is forced and only ' +
  'the two offsets vary.',
  () => {
    const loc = ft.getSpawn('[CCC] Craig');
    return { x: loc.x, y: loc.y };
  });

step('a spawn for a clan with nobody in it', 'ran.choose is irandom(-1) = floor(random() * 0), ' +
  'which is always 0 and still takes a number out of the stream -- so an empty clan costs one ' +
  'draw and THEN falls through to the random point, which costs two more.',
  () => {
    const loc = ft.getSpawn('[BBB] Barry');
    return { x: loc.x, y: loc.y };
  });

step('a spawn for an unknown name', 'No clan at all, so no choose draw: straight to ' +
  'getSpawnableArea.',
  () => {
    const loc = ft.getSpawn('Nobody At All');
    return { x: loc.x, y: loc.y };
  });

step('removing a member', 'util.remove swaps the last member into the hole rather than shifting, ' +
  'so the roster order changes even for a removal from the middle.',
  () => {
    ft.remove(bodies[1]);
    return { clans: roster() };
  });

step('removing a body that is not on the roster', 'indexOf gives -1 and the source hands that ' +
  'straight to util.remove, where `arr[-1] = arr.pop()` files the popped member under a ' +
  'property named "-1" and leaves the array one shorter. An unrelated clanmate is evicted.',
  () => {
    const stranger = fakeBody('[AAA] Stranger', 0, 0, 10);
    ft.remove(stranger);
    return { clans: roster(), strangerID: stranger.id };
  });

step('removing from a clan that is now empty', 'The pop branch on an empty array does nothing, ' +
  'because -1 === length - 1 there.',
  () => {
    ft.remove(bodies[3]);
    ft.remove(bodies[3]);
    return { clans: roster() };
  });

step('removing a body whose name has no tag', 'checkName comes back null, so the whole body ' +
  'is skipped.',
  () => {
    ft.remove(fakeBody('No Tag Here', 0, 0, 10));
    return { clans: roster() };
  });

const out = {
  generatedBy: 'tools/harness/probe-clanwars.js',
  seed: SEED,
  gamemode: 'clan_wars',
  note: 'Clan rosters are keyed by the bracketed tag in a player name. Bodies here are plain ' +
        'objects, because clan_wars.js reads only x, y, size and originalName off one.',
  // Where the shared generator stood when the room finished booting. Every
  // step's `at` is measured from the same origin, so a Go replay that boots the
  // same seed can check it is drawing in lockstep before it compares a single
  // coordinate -- a spawn point that disagrees because the stream is one number
  // out is a different fault from one that disagrees because the arithmetic is.
  bootDraws: BOOT_DRAWS,
  bodies,
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
