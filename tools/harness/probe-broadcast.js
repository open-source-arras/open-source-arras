// Captures the 250 ms broadcast -- the minimap and the leaderboard -- as the
// real server sends it to a client.
//
//   node tools/harness/probe-broadcast.js [--seed N] [--gamemode ffa] [--bots N] [--out FILE]
//
// This is the half of the client that is still blank in the Go port: an empty
// minimap box and an empty leaderboard. The builders themselves are pinned
// separately and exactly by tools/gen-leaderboard-vectors.js; what only a
// running server can answer is the loop around them --
//
//   * which firing carries the reset form and which carries a diff,
//   * the order of the frames in a burst (RM before the b, RL after it),
//   * how many mockups ride along with a board,
//   * what a board switch does to the socket in the same firing,
//   * and whether forceNewBroadcast ever turns itself off.
//
// internal/wire's TestBroadcastMatchesNode replays every step against the Go
// server and compares the frames.

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
const BOTS = Number(flag('bots', 8));
const OUT = flag('out', null);

const det = require('./determinism.js').install({ seed: SEED });
const { boot } = require('./bootserver.js');
const { connectClient } = require('./fakesocket.js');

const srv = boot({ det, gamemode: GAMEMODE, config: { bot_cap: BOTS } });
const { manager, serverRoot } = srv;

// checkUsers gates the whole game loop on a connected socket (game/index.js:517),
// and the bot roster is topped up inside it -- so nothing populates the room
// until a client is there. That is why the client joins before any ticking.
const socket = connectClient(manager, { serverRoot });
socket.clientSend('k', '');
socket.clientSend('s', '', 1, 0, false, 0);
socket.clientSend('s', 'Watcher', 0, 0, false, 0);
srv.advance(20); // the 20 ms spawn poll at sockets.js:304
if (!socket.player.body) throw new Error('probe-broadcast: no body after the spawn');
const body = socket.player.body;
const joinDraws = det.rngCalls;

// Randomness spent per tick, for the whole run. It is the first thing to look at
// when a replay disagrees: the rows of a leaderboard are eight bots a hundred
// ticks into a simulation, so a single extra draw anywhere shows up as a
// different name, a different class and a different id, all at once and none of
// them near the cause.
//
// A client changes the simulation, which is why this is worth recording
// separately from the headless differential: with a view attached, entities near
// the camera stay awake instead of dozing off for fifteen ticks in sixteen.
const tickDraws = [];
function tick() {
  srv.tick();
  tickDraws.push(det.rngCalls);
}

// One tick, so the room is running before anything is measured.
tick();

// The interval fires on the virtual clock, so a burst is however many ticks it
// takes to cross the next 250 ms boundary. Ceil, plus one, so a burst always
// contains exactly one firing however the boundary lines up.
const ticksPer250 = Math.ceil(250 / srv.cycleSpeed);

const steps = [];

// step runs one burst and records everything the Go side has to reproduce: the
// frames, in order, and the board the room believes in.
function step(label, note, before) {
  socket.takeOutbox();
  const draws0 = det.rngCalls;
  if (before) before();
  for (let i = 0; i < ticksPer250; i++) tick();
  const frames = socket.takeOutbox();
  const broadcasts = frames.filter(f => f[0] === 'b');
  steps.push({
    label,
    note,
    draws: det.rngCalls - draws0,
    // Only the opcodes that belong to this loop; a burst also carries the
    // per-frame uplink, which is another test's business.
    opcodes: frames.map(f => f[0]).filter(o => o === 'b' || o === 'RM' || o === 'RL'),
    mockups: frames.filter(f => f[0] === 'M').length,
    broadcasts: broadcasts.length,
    frame: broadcasts.length ? broadcasts[broadcasts.length - 1] : null,
    topPlayerID: manager.room.topPlayerID,
    selectedLeaderboard: socket.status.selectedLeaderboard,
    seesAllTeams: socket.status.seesAllTeams,
    needsNewBroadcast: socket.status.needsNewBroadcast,
    forceNewBroadcast: socket.status.forceNewBroadcast,
    entities: global.entities.size,
  });
}

step('the first broadcast', 'status.needsNewBroadcast starts true (sockets.js:2126), so the ' +
  'first firing a client sees is an RM followed by the reset form: every row of ' +
  'all three blocks.');

step('the second', 'needsNewBroadcast is now false, so this is the diff -- and it is the ' +
  'first firing that can show a delete.');

step('a score', 'The `L` cheat, twenty times. makeLeaderboardList picks by score and ' +
  'breaks on the first zero, so before this the player is not on the board at ' +
  'all whatever the bots are doing.',
  () => { for (let i = 0; i < 20; i++) socket.clientSend('L'); });

step('the default board', 'Switching boards is a chat command (chatCommands.js:56). This sets the ' +
  'same field by hand, without the forceNewBroadcast the command also sets, so ' +
  'the diff on show is the one the client actually gets: a diff of the NEW ' +
  'board against the OLD board\'s stale snapshot for this socket.',
  () => { socket.status.selectedLeaderboard = 'default'; });

step('the players board', 'Only bodies with a socket. In a room of bots that is one row.',
  () => { socket.status.selectedLeaderboard = 'players'; });

step('the boss board', 'Through makeLeaderboardHPList, so ids come back offset by 100 and the ' +
  'label is Class.hp.LABEL. An ffa room this young has no bosses, which is the ' +
  'point: an empty board still has to delete the rows the last board left.',
  () => { socket.status.selectedLeaderboard = 'bosses'; });

step('back to global', 'The global board\'s own snapshot for this socket is four firings stale, ' +
  'so this diff is against what the board looked like then.',
  () => { socket.status.selectedLeaderboard = 'global'; });

step('all teams', 'status.seesAllTeams swaps the per-socket team block for the whole-room ' +
  'one (keyCommands.js:730). The socket\'s own team Delta keeps being updated ' +
  'underneath, so switching back is not a reset.',
  () => { socket.status.seesAllTeams = true; });

step('and back', 'The team block returns to this socket\'s own Delta, which has been kept ' +
  'current the whole time -- so the client gets a diff against a snapshot it was ' +
  'never sent, and rows it already has are not repeated.',
  () => { socket.status.seesAllTeams = false; });

step('NWB', 'The `NWB` packet (sockets.js:727). It sets forceNewBroadcast, which makes ' +
  'this firing end with an RM and an RL and arms needsNewBroadcast for the next.',
  () => { socket.clientSend('NWB'); });

step('the firing after NWB', 'Nothing in js-src ever assigns forceNewBroadcast false again, so this ' +
  'firing -- and every firing after it, for the life of the socket -- sends the ' +
  'whole minimap and the whole leaderboard again, four times a second.');

step('and the one after that', 'Same, to show it is not a one-off.');

step('stop', 'The chat command\'s third state (chatCommands.js:300). The socket is ' +
  'skipped before the leaderboard is even built, so no b at all -- and its team ' +
  'Delta is still updated, because that happens above the `continue`.',
  () => { socket.status.selectedLeaderboard = 'stop'; });

// What the room holds, read directly rather than off the wire, so a mismatch in
// the Go replay says whether the world diverged or only the builder did.
function candidates() {
  const out = [];
  for (const e of global.entities.values()) {
    if (e.settings.leaderboardable && e.settings.drawShape && !e.incognito &&
        (e.type === 'tank' || e.killCount.solo || e.killCount.assists)) {
      out.push({
        id: e.id,
        score: Math.round(e.skill.score),
        index: e.index,
        name: e.name,
        label: e.label,
        type: e.type,
        team: e.team,
        leaderboardColor: e.leaderboardColor === undefined ? null : e.leaderboardColor,
      });
    }
  }
  return out.sort((a, b) => b.score - a.score || a.id - b.id);
}

const out = {
  generatedBy: 'tools/harness/probe-broadcast.js',
  seed: SEED,
  gamemode: GAMEMODE,
  bots: BOTS,
  note: 'A `b` frame is three delta blocks back to back -- minimap (5 fields), team ' +
        '(3), leaderboard (8) -- each written as a delete count, that many ids, an ' +
        'update count, and that many id-plus-row groups. The blocks have no ' +
        'separators, so the field counts are the only thing that says where one ends.',
  cycleSpeed: srv.cycleSpeed,
  ticksPer250,
  bodyID: body.id,
  bodyTeam: body.team,
  ticksRun: srv.ticksRun(),
  joinDraws,
  tickDraws,
  candidates: candidates(),
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
