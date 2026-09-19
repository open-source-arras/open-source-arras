// Records the exact CHAT_MESSAGE_ENTITY payloads a client is sent.
//
//   node tools/harness/probe-chat.js [--seed N] [--gamemode ffa] [--out FILE]
//
// The chat loop (sockets.js:100-125) is a 200 ms interval that sends every view
// a JSON string, and the `M` handler (sockets.js:638-674) runs one turn of it by
// hand so the sender does not wait. Neither is reachable from a headless run,
// and the payload is a string rather than a list of wire values -- so it is the
// one frame in the protocol where the exact bytes matter and nothing else checks
// them.
//
// What the probe settles:
//
//   * the JSON shape, key order included, for one speaker and for two,
//   * that messages come back newest-first, because the handler unshifts,
//   * that chat ids come from one counter shared across speakers,
//   * what the sanitiser does to a section sign, and what JSON.stringify does to
//     quotes, backslashes, newlines and non-ASCII,
//   * that an entity whose messages have all expired still gets an entry with an
//     empty list, forever,
//   * and what a muted socket gets instead.
//
// internal/wire's TestChatMatchesNode replays it.

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
const sockets = manager.socketManager;

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
  steps.push({ name, note, draws: det.rngCalls - before, threw, time: util.time(), value: value === undefined ? null : value });
  return value;
}

function spawnClient(name) {
  const s = connectClient(manager, { serverRoot });
  s.clientSend('k', '');
  s.clientSend('s', '', 1, 0, false, 0);
  s.clientSend('s', name, 0, 0, false, 0);
  srv.advance(20);
  if (!s.player.body) throw new Error(`probe-chat: no body for ${name}`);
  return s;
}

const a = spawnClient('Alpha');
const b = spawnClient('Bravo');
// Two players spawn wherever the room puts them, which in a 12,000-unit arena is
// nowhere near each other -- and a view only reports entities in its nearby list,
// so a chat probe built on the spawn positions watches two people talk to
// themselves. Bravo is moved next to Alpha and both lists are given time to
// rebuild: getNearby is refreshed at most every visible_list_interval.
b.player.body.x = a.player.body.x + 60;
b.player.body.y = a.player.body.y + 60;
const settleTicks = Math.ceil(Config.visible_list_interval / srv.cycleSpeed) + 4;
for (let i = 0; i < settleTicks; i++) srv.tick();

// The last CHAT_MESSAGE_ENTITY a socket was sent, as the raw string.
function payloads(sock) {
  return sock.takeOutbox().filter(f => f[0] === 'CHAT_MESSAGE_ENTITY').map(f => f[1]);
}

step('the bodies', 'The two ids every payload below is keyed on.',
  () => ({ alpha: a.player.body.id, bravo: b.player.body.id, duration: Config.chat_message_duration }));

step('a quiet room', 'One turn of the loop with nothing said: every view still gets a frame, ' +
  'and the array is empty because no entity has a chat log yet.',
  () => {
    a.takeOutbox();
    b.takeOutbox();
    sockets.chatLoop();
    return { alpha: payloads(a), bravo: payloads(b) };
  });

step('one message', 'The `M` handler stores it and runs the loop itself, so both sockets get a ' +
  'frame from that call before the interval comes round.',
  () => {
    a.takeOutbox();
    b.takeOutbox();
    a.clientSend('M', 'hello everyone');
    return { alpha: payloads(a), bravo: payloads(b) };
  });

step('a second message from the same body', 'unshift, so the newest is first and the chat id ' +
  'counter has moved on.',
  () => {
    a.takeOutbox();
    a.clientSend('M', 'and again');
    return { alpha: payloads(a) };
  });

step('both bodies talking', 'Two entries. The order is the order the view lists them in, not ' +
  'the order they spoke.',
  () => {
    a.takeOutbox();
    b.takeOutbox();
    b.clientSend('M', 'bravo here');
    return { alpha: payloads(a), bravo: payloads(b) };
  });

step('characters JSON has to escape', 'A quote, a backslash, a newline, a tab and a rune outside ' +
  'ASCII. JSON.stringify escapes the first five and passes the rune through as UTF-8; a Go port ' +
  'using encoding/json would also escape < > and &, which Node does not.',
  () => {
    a.takeOutbox();
    b.clientSend('M', 'a "quote" and a \\ and <b> & é中\n\ttail');
    return { alpha: payloads(a) };
  });

step('the section sign', 'Config.sanitize_chat_input doubles it twice -- the source\'s own ' +
  'comment says it only works with four.',
  () => {
    a.takeOutbox();
    b.takeOutbox();
    b.clientSend('M', 'colour § here');
    return { alpha: payloads(a), bravo: payloads(b), sanitize: Config.sanitize_chat_input };
  });

step('a muted socket', 'status.disablechat keeps the entry list and empties every message list, ' +
  'so the client is told who is nearby and not what they said.',
  () => {
    a.takeOutbox();
    a.status.disablechat = true;
    sockets.chatLoop();
    const out = payloads(a);
    a.status.disablechat = false;
    return out;
  });

step('after everything has expired', 'The clock moves past chat_message_duration. The messages ' +
  'go; the entries do not, because chats[id] is never deleted -- so both bodies keep a slot with ' +
  'an empty list for as long as the room lives.',
  () => {
    srv.advance(Config.chat_message_duration + 1);
    a.takeOutbox();
    sockets.chatLoop();
    return payloads(a);
  });

step('a message from a body that has none', 'The store is keyed by entity id and the entry ' +
  'survived the expiry, so this appends to the same log rather than making a new one.',
  () => {
    a.takeOutbox();
    a.clientSend('M', 'still here');
    return payloads(a);
  });

step('chat with no body', 'The handler returns before it touches the store when player.body is ' +
  'null, which is what a dead player is.',
  () => {
    const dead = spawnClient('Ghost');
    dead.player.body.kill();
    srv.tick();
    dead.takeOutbox();
    a.takeOutbox();
    dead.clientSend('M', 'from beyond');
    return { hasBody: !!dead.player.body, ghost: payloads(dead), alpha: payloads(a) };
  });

const out = {
  generatedBy: 'tools/harness/probe-chat.js',
  seed: SEED,
  gamemode: GAMEMODE,
  note: 'Each payload is the second element of a CHAT_MESSAGE_ENTITY frame, verbatim. ' +
        'JSON.stringify produced it, so byte-for-byte is the comparison worth making.',
  chatMessageDuration: Config.chat_message_duration,
  // How many ticks the probe ran before the first step, so a replay settles the
  // two nearby lists the same way.
  settleTicks,
  visibleListInterval: Config.visible_list_interval,
  sanitizeChatInput: Config.sanitize_chat_input,
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
