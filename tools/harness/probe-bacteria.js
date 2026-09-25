// Records what happens when a Bacteria's body dies: the branch at
// sockets.js:1529 that hands the player one of their own bullets instead of
// killing them.
//
//   node tools/harness/probe-bacteria.js [--seed N] [--out FILE]
//
// The death branch has two arms. The ordinary one sends `F` and starts the
// respawn clock. The other is picked by a LABEL comparison -- the source's own
// comment is "(WHY IS THIS A LABEL CHECK)" -- and runs becomeBulletChildren
// (loaders/global.js:682), which promotes the newest bullet to be the player and
// rebuilds the family tree around it. Nothing dies and nothing is reported.
//
// Reachable only in a room whose spawn_class is bacteria, which is a testing
// class in no upgrade tree. It is probed rather than read because the promotion
// touches six fields on four kinds of entity and the source's own filter for
// "which children come along" cannot select anything.
//
// What the probe settles:
//
//   * that no death report is sent and the socket is not marked deceased,
//   * which bullet becomes the body and what its parent, source and bulletparent
//     end up as,
//   * which siblings follow it and which are destroyed -- the answer to the
//     second is "none, ever",
//   * the two settings the promotion forces on,
//   * and that a Bacteria with no bullets left takes the ordinary arm instead.
//
// internal/wire's TestBacteriaDeathMatchesNode replays it.

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
const { connectClient } = require('./fakesocket.js');

const srv = boot({
  det,
  gamemode: 'ffa',
  maxPlayers: 8,
  config: { bot_cap: 0, spawn_class: 'bacteria' },
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
  steps.push({ name, note, draws: det.rngCalls - before, threw, ticks: srv.ticksRun(), value: value === undefined ? null : value });
  return value;
}

function spawnClient(name) {
  const s = connectClient(manager, { serverRoot });
  s.clientSend('k', '');
  s.clientSend('s', '', 1, 0, false, 0);
  s.clientSend('s', name, 0, 0, false, 0);
  srv.advance(20);
  if (!s.player.body) throw new Error(`probe-bacteria: no body for ${name}`);
  return s;
}

// A snapshot of one entity's family links, by id, so a Go replay can compare the
// shape rather than the objects.
const link = e => e == null ? null : e.id;
function shot(e) {
  if (!e) return null;
  return {
    id: e.id,
    label: e.label,
    index: e.index,
    master: link(e.master),
    parent: link(e.parent),
    source: link(e.source),
    bulletparent: link(e.bulletparent),
    bulletchildren: e.bulletchildren.map(link),
    isPlayer: !!e.isPlayer,
    controllers: e.controllers.map(c => c.constructor.name),
    connectChildrenOnCamera: !!e.settings.connectChildrenOnCamera,
    persistsAfterDeath: !!e.settings.persistsAfterDeath,
    isDead: e.isDead(),
  };
}

const socket = spawnClient('Germ');
const body = socket.player.body;

step('the spawn class', 'The label check the branch turns on is on the body\'s MASTER, and a ' +
  'player body is its own master.',
  () => ({
    spawnClass: Config.spawn_class,
    label: body.label,
    masterLabel: body.master.label,
    id: body.id,
    maxBullets: body.maxBullets,
  }));

// Hold the left mouse button and tick until several clones are out. The bacteria
// gun is reload 2 with WAIT_TO_CYCLE, so this is not instant, and the clones have
// a lifespan -- the count plateaus rather than climbing to MAX_BULLETS.
socket.clientSend('C', 500, 0, 0, 16); // lmb held down
let fired = 0;
for (let i = 0; i < 900 && socket.player.body.bulletchildren.length < 4; i++) {
  srv.tick();
  fired++;
}
for (let i = 0; i < 3; i++) srv.tick();

const before = step('the family before the death', 'The bullets the body has out. The one that ' +
  'gets promoted is the LAST of them, which is the newest.',
  () => ({
    body: shot(body),
    children: body.bulletchildren.map(shot),
  }));

step('the frame the body dies on', 'kill() then one tick. The branch runs inside gazeUpon, so ' +
  'the whole promotion happens before the frame is written.',
  () => {
    socket.takeOutbox();
    body.kill();
    srv.tick();
    const frames = socket.takeOutbox();
    return {
      opcodes: frames.map(f => f[0]),
      reports: frames.filter(f => f[0] === 'F').length,
      deceased: socket.status.deceased,
      hasBody: !!socket.player.body,
      newBodyID: socket.player.body ? socket.player.body.id : null,
      newBody: shot(socket.player.body),
      // The old body, so a replay can say whether it was left alone.
      oldBody: shot(body),
    };
  });

step('what happened to each clone', 'Which of the clones the body had out are still in the ' +
  'entity map after the tick that killed it, and what their health is. destroy() spares the ' +
  'children of anything whose master label is "Bacteria" (entity.js:1272, :1281), so any that ' +
  'are gone went for a reason of their own.',
  () => {
    const live = new Map();
    for (const e of entities.values()) live.set(e.id, e);
    return before.children.map(c => {
      const e = live.get(c.id);
      return { id: c.id, inMap: !!e, health: e ? e.health.amount : null, isDead: e ? e.isDead() : null, range: e ? e.range : null };
    });
  });

step('the siblings', 'a.bulletchildren after the promotion: every other bullet whose master ' +
  'matched, which is all of them. The `removedchildren` list the source builds is filtered from ' +
  'the list it has ALREADY filtered to master === a.master, so its test for master !== a.master ' +
  'can never match and nothing is ever destroyed.',
  () => {
    const a = socket.player.body;
    return {
      bulletchildren: a.bulletchildren.map(shot),
      // Every bullet the old body had, so a replay can account for all of them.
      wasBefore: before.children.map(c => c.id),
    };
  });

step('the promoted bullet still plays', 'Ticks after the promotion. It has the player\'s ' +
  'controllers, so it should be alive and moving rather than expiring like a bullet.',
  () => {
    const a = socket.player.body;
    const x0 = a.x, y0 = a.y;
    for (let i = 0; i < 30; i++) srv.tick();
    return {
      stillBody: socket.player.body ? socket.player.body.id : null,
      alive: !a.isDead(),
      moved: (a.x !== x0) || (a.y !== y0),
      bulletchildren: a.bulletchildren.length,
    };
  });

step('a bacteria with no bullets out', 'The else arm. bulletchildren is empty, so exit() runs ' +
  'and this is an ordinary death with a report.',
  () => {
    const s2 = spawnClient('Sterile');
    const b2 = s2.player.body;
    // No autofire and one tick, so nothing has been fired.
    srv.tick();
    const kids = b2.bulletchildren.length;
    s2.takeOutbox();
    b2.kill();
    srv.tick();
    const frames = s2.takeOutbox();
    return {
      childrenAtDeath: kids,
      opcodes: frames.map(f => f[0]),
      report: frames.find(f => f[0] === 'F') || null,
      deceased: s2.status.deceased,
      hasBody: !!s2.player.body,
    };
  });

const out = {
  generatedBy: 'tools/harness/probe-bacteria.js',
  seed: SEED,
  gamemode: 'ffa',
  spawnClass: 'bacteria',
  note: 'Every entity is recorded by id and by what its family links point at, so a replay ' +
        'compares the shape of the tree rather than the objects in it.',
  cycleSpeed: srv.cycleSpeed,
  ticksToFire: fired,
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
