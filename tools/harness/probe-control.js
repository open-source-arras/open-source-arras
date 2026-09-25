// Records the `H` handler (sockets.js:531-635) and giveUp (entity.js:155-174):
// taking control of a mothership or a dominator, and every way control ends.
//
//   node tools/harness/probe-control.js [--seed N] [--gamemode mothership] [--out FILE]
//
// One key does two opposite things. If the body the player is in is already
// under control, `H` hands it back; otherwise it looks for something to take.
// Which of the three branches runs is decided by the room's flags, not by the
// packet, and the three differ in four small ways that are easy to get wrong by
// reading: only the dominator branch freezes the controller's goal, only it
// silences the death message of the tank left behind, and only the mothership
// and dominator branches require the candidate to be on the player's team.
//
// What the probe settles:
//
//   * which entity is picked out of the candidate list, and what the player's
//     body, name, FOV and skill points are afterwards,
//   * that the tank left behind is killed, and whether the room is told,
//   * the exact popups, including the two the mothership time limit sends and
//     when each lands,
//   * what giveUp puts back -- controllers, name, underControl -- and the
//     throwaway body it kills the player with,
//   * and the message a player gets when there is nothing to take.
//
// internal/wire's TestControlMatchesNode replays it.

'use strict';

require('../fdlibm-pow');
const fs = require('fs');
const path = require('path');

function flag(name, dflt) {
  const i = process.argv.indexOf('--' + name);
  return i === -1 ? dflt : process.argv[i + 1];
}
const SEED = Number(flag('seed', 1));
const GAMEMODE = flag('gamemode', 'mothership');
const OUT = flag('out', null);

// Long enough that the source takes the two-timer branch (> 10 s), short enough
// that a probe can sit through it. Both halves are exercised.
const TIME_LIMIT = 20_000;

const det = require('./determinism.js').install({ seed: SEED });
const { boot } = require('./bootserver.js');
const { connectClient } = require('./fakesocket.js');

const srv = boot({
  det,
  gamemode: GAMEMODE,
  maxPlayers: 8,
  // teams is deliberately NOT pinned. mothership.js reads `Config.teams ?? a
  // random 2-4`, and the port reproduces the random arm; setting it here would
  // take a branch the port does not have and cost a draw the port does.
  config: { bot_cap: 0, mothership_time_limit: TIME_LIMIT },
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
  if (!s.player.body) throw new Error(`probe-control: no body for ${name}`);
  return s;
}

// tickFor runs whole ticks until at least ms of virtual time has passed. Every
// probe and every replay share the tick loop; only Node has advance().
function tickFor(ms) {
  const n = Math.ceil(ms / srv.cycleSpeed) + 1;
  for (let i = 0; i < n; i++) srv.tick();
}

// Every popup the socket has been sent since the last call, in order.
const popups = s => s.takeOutbox().filter(f => f[0] === 'm').map(f => f[2]);

// One controllable entity as the handler sees it.
function candidate(e) {
  if (!e) return null;
  return {
    id: e.id,
    team: e.team,
    name: e.name,
    label: e.label,
    isMothership: !!e.isMothership,
    isDominator: !!e.isDominator,
    isBoss: !!e.isBoss,
    underControl: !!e.underControl,
    controllers: e.controllers.map(c => c.constructor.name),
    fov: e.FOV,
    dontIncreaseFov: !!e.dontIncreaseFov,
    skillPoints: e.skill.points,
  };
}

const controllables = () => {
  const out = [];
  for (const e of entities.values()) {
    if (e.isDominator || e.isMothership || e.isBoss) out.push(candidate(e));
  }
  return out;
};

// game.js:323 defers `gamemodeManager.request("start")` by 200 ms, so neither
// the motherships nor the dominators exist for the first six ticks. Nothing to
// take control of until they do.
const SETTLE_TICKS = 10;
for (let i = 0; i < SETTLE_TICKS; i++) srv.tick();

// The takeover is the mothership branch on a mothership map and the dominator
// branch on a domination one. Domination's dominators all start on
// TEAM_ENEMIES, which no player is ever on, so a probe of that branch has to put
// one on the player's team first -- exactly what capturing one does at
// dominator.js:41-60. The replay does the same, by id.
const forced = [];
const socket = spawnClient('Pilot');
const body = socket.player.body;

step('the room and the candidates', 'What the handler has to choose from before anything is ' +
  'pressed, and which team the player landed on. The mothership branch and the dominator ' +
  'branch both require a match.',
  () => {
    if (GAMEMODE !== 'mothership') {
      // Hand the player's team one dominator, and record which.
      for (const e of entities.values()) {
        if (e.isDominator) {
          e.team = body.team;
          forced.push(e.id);
          break;
        }
      }
    }
    return {
      mothership: !!Config.mothership,
      domination: !!Config.domination,
      bossControl: !!Config.boss_control,
      timeLimit: Config.mothership_time_limit,
      playerTeam: body.team,
      playerBody: body.id,
      playerName: body.name,
      forcedOntoPlayerTeam: forced,
      candidates: controllables(),
    };
  });

step('H takes control', 'One H and one tick. The swap itself happens inside the handler; the ' +
  'tick is what lets the body left behind actually die.',
  () => {
    socket.takeOutbox();
    socket.clientSend('H');
    const took = candidate(socket.player.body);
    const said = popups(socket);
    srv.tick();
    const old = entities.get(body.id) || body;
    return {
      said,
      took,
      bodyIsNowCandidate: socket.player.body.id !== body.id,
      oldBodyDead: old.isDead(),
      oldBodyInMap: entities.has(body.id),
      oldBodyDontSendDeathMessage: !!old.dontSendDeathMessage,
      deceased: socket.status.deceased,
    };
  });

step('a second player finds nothing to take', 'The candidate the first player is in is filtered ' +
  'out by underControl. On a domination map the only one on this player\'s team is that one, ' +
  'so this is the "none available" message either way.',
  () => {
    const s2 = spawnClient('Latecomer');
    // Put every remaining candidate out of reach the way one already taken is,
    // so the branch is reached regardless of which team the second player drew.
    for (const e of entities.values()) {
      if ((e.isDominator || e.isMothership || e.isBoss) && !e.underControl) e.underControl = true;
    }
    s2.takeOutbox();
    s2.clientSend('H');
    return {
      said: popups(s2),
      stillOwnBody: !!s2.player.body && !s2.player.body.isMothership && !s2.player.body.isDominator,
    };
  });

if (GAMEMODE === 'mothership') {
  step('the ten second warning', 'mothership_time_limit is 20 s, so the source arms one timeout ' +
    'at 10 s and that one arms the next. Nothing has been pressed; this is the clock.',
    () => {
      socket.takeOutbox();
      // Ticked rather than advanced. The clock a probe shares with the port is
      // the one the tick loop drives; jumping it with advance() moves Node's
      // timer queue and leaves the port's tick counter -- and so its own timer
      // drain -- where it was.
      tickFor(TIME_LIMIT - 10_000);
      return { said: popups(socket), stillInControl: !!socket.player.body.underControl };
    });

  step('control runs out', 'The inner timeout. giveUp puts the ship back and kills the player ' +
    'with a throwaway body, which is what returns them to the death screen.',
    () => {
      const ship = socket.player.body;
      socket.takeOutbox();
      tickFor(10_000);
      const now = socket.player.body;
      return {
        said: popups(socket),
        ship: candidate(entities.get(ship.id) || ship),
        newBodyIsShip: !!now && now.id === ship.id,
        newBodyLabel: now ? now.label : null,
        newBodyPassive: now ? !!now.passive : null,
        newBodyUnderControl: now ? !!now.underControl : null,
        newBodyDead: now ? now.isDead() : null,
      };
    });
} else {
  step('H hands it back', 'The other arm of the same key: the body is already under control, so ' +
    'this is a relinquish and the takeover branches are never reached.',
    () => {
      const dom = socket.player.body;
      socket.takeOutbox();
      socket.clientSend('H');
      const said = popups(socket);
      const now = socket.player.body;
      srv.tick();
      return {
        said,
        dominator: candidate(entities.get(dom.id) || dom),
        newBodyIsDominator: !!now && now.id === dom.id,
        newBodyLabel: now ? now.label : null,
        newBodyPassive: now ? !!now.passive : null,
        newBodyUnderControl: now ? !!now.underControl : null,
        newBodyDead: now ? now.isDead() : null,
      };
    });
}

const out = {
  generatedBy: 'tools/harness/probe-control.js',
  seed: SEED,
  gamemode: GAMEMODE,
  timeLimit: TIME_LIMIT,
  note: 'Entities are recorded by id and by the fields the handler writes, so a replay compares ' +
        'what control did rather than the objects it did it to.',
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
