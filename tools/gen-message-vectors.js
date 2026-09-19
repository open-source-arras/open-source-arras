// Generates golden vectors for the message layer (internal/net/messages.go).
//
// Where the JS message construction is self-contained, the real source text is
// sliced out of sockets.js and evaluated, so the expected bytes come from the
// shipping code rather than from a transcription of it. That covers flatten(),
// publish() (the GUI block), floppy(), getstuff() and the Delta class.
//
// Everything is then encoded with the unmodified fasttalk.js encoder.
//
// Output: gen/message-vectors.json


// Math.pow in Node is the host's libm unless this flag is set, so reference
// output captured without it is specific to the machine that produced it.
// See tools/fdlibm-pow.js.
require('./fdlibm-pow');
const path = require('path');
const fs = require('fs');

const root = path.resolve(__dirname, '..');
const ft = require(path.join(root, 'js-src', 'server', 'lib', 'fasttalk.js'));
const socketsSrc = fs.readFileSync(
  path.join(root, 'js-src', 'server', 'game', 'network', 'sockets.js'), 'utf8');

const hex = u8 => Buffer.from(u8).toString('hex');

// --- slice real function bodies out of sockets.js --------------------------

// Returns the source text from `marker` up to the brace that closes the block
// it opens. Good enough here because none of the sliced regions contain a brace
// inside a string or a regex literal.
function sliceBlock(marker) {
  const start = socketsSrc.indexOf(marker);
  if (start === -1) throw new Error(`marker not found: ${marker}`);
  let i = socketsSrc.indexOf('{', start);
  let depth = 0;
  for (let j = i; j < socketsSrc.length; j++) {
    const c = socketsSrc[j];
    if (c === '{') depth++;
    else if (c === '}') {
      depth--;
      if (depth === 0) return socketsSrc.slice(start, j + 1);
    }
  }
  throw new Error(`unbalanced braces after ${marker}`);
}

// util.error is the only free identifier inside floppy(); util.clamp is used by
// the minimap delta builders, which are transcribed rather than sliced.
const util = { error: () => {}, clamp: (v, l, h) => v < l ? l : v > h ? h : v };

const sliced = {
  flatten: sliceBlock('    flatten(data) {'),
  publish: sliceBlock('    publish(gui) {'),
  floppy: sliceBlock('    floppy(value = null) {'),
  container: sliceBlock('    container(player) {'),
  getstuff: sliceBlock('    getstuff(s) {'),
  Delta: sliceBlock('        const Delta = class {'),
};

// Rebuild the three methods as an object so `this.flatten` still resolves.
const sm = eval(`({
  ${sliced.flatten},
  ${sliced.publish},
  ${sliced.floppy},
  ${sliced.container},
  ${sliced.getstuff},
})`);
const Delta = eval(`(() => { ${sliced.Delta}; return Delta; })()`);

// --- vector plumbing -------------------------------------------------------

const cases = [];
function C(name, site, input, note) {
  let bytes = null, err = null, roundTrip = null;
  try {
    const enc = ft.encode(input);
    bytes = hex(enc);
    roundTrip = ft.decode(enc);
  } catch (e) {
    err = String(e && e.message ? e.message : e);
  }
  cases.push({ name, site, input: ser(input), bytes, err, roundTrip: ser(roundTrip), note });
}

const _f64 = new DataView(new ArrayBuffer(8));
function f64bits(v) { _f64.setFloat64(0, v, false); return Buffer.from(_f64.buffer).toString('hex'); }

function ser(arr) {
  if (arr == null) return null;
  return arr.map(v => {
    if (typeof v === 'number') {
      if (Number.isNaN(v)) return { __num: 'nan', bits: f64bits(v) };
      if (v === Infinity) return { __num: 'inf' };
      if (v === -Infinity) return { __num: '-inf' };
      if (Object.is(v, -0)) return { __num: '-0' };
    }
    return v;
  });
}

// ===========================================================================
// 3.1 server -> client, the payload-free and simple ones
// ===========================================================================

C('W', 'sockets.js:2235', ['W', true]);
C('w', 'sockets.js:205', ['w', true]);
C('RM', 'sockets.js:1980', ['RM']);
C('RL', 'sockets.js:1998', ['RL']);
C('T', 'sockets.js:694', ['T']);
C('K', 'sockets.js:53', ['K'], 'sent via lastWords, socket terminated after');
C('temporaryban', 'sockets.js:236', ['temporaryban']);
C('permanentban', 'sockets.js:244', ['permanentban']);
C('DTAD', 'sockets.js:715', ['DTAD']);
C('DTAST', 'sockets.js:721', ['DTAST']);
C('RE', 'chatCommands.js:301', ['RE']);
C('CC', 'chatCommands.js:307', ['CC']);

C('message', 'sockets.js:227', ['message', 'This server is private.']);
C('message full', 'sockets.js:231', ['message', 'This server is full, please rejoin later.']);
C('m popup', 'sockets.js:28', ['m', 10000, 'hello world'], 'Config.popup_message_duration = 10000');
C('m arena closed', 'sockets.js:264', ['m', 5000, 'Arena Closed.']);
C('m empty text', 'sockets.js:28', ['m', 10000, ''], 'empty string takes the 0b1001 tag');
C('m unicode text', 'sockets.js:28', ['m', 10000, 'héllo 世界']);
C('Em', 'chatCommands.js:26', ['Em', 15000, JSON.stringify(['line one', 'line two'])]);
C('z name colour', 'sockets.js:1170', ['z', '#ff0000']);
C('t transfer', 'sockets.js:2041', ['t', 'example.com:3000', '00ff12ab']);
C('S clock bounce', 'sockets.js:328', ['S', 1234567.5, 98765]);
C('p pong', 'sockets.js:337', ['p', (12.34).toFixed(1)], 'toFixed returns a string, so the tag is 0b1010');
C('p pong integral', 'sockets.js:337', ['p', (0).toFixed(1)]);
C('svInfo', 'speedLoop.js:24', ['svInfo', 'ffa', (3.456).toFixed(1)]);

C('c force camera', 'sockets.js:1284', ['c', 0, 0, 2000]);
C('c force camera fractional', 'sockets.js:1284', ['c', -1234.5, 6789.25, 2000]);

// R / r room setup. The tile grid is exactly the map() at sockets.js:287 and :37.
const tiles = [
  [{ color: 16, visibleOnBlackout: true, image: false }, { color: 17, visibleOnBlackout: false, image: false }],
  [{ color: 16, visibleOnBlackout: true, image: 'grass.png' }, { color: 0, visibleOnBlackout: false, image: false }],
];
C('R room setup', 'sockets.js:283', [
  'R', 4000, 2000,
  JSON.stringify(tiles),
  JSON.stringify(1788000000000),
  1,
  JSON.stringify({ active: false, color: 0 }),
  false,
]);
C('r room refresh', 'sockets.js:33', [
  'r', 4000, 2000,
  JSON.stringify(tiles.map(row => row.map(t => ({ color: t.color, image: t.image ?? false })))),
]);

C('F death report', 'sockets.js:1523', ['F', 12345, 67, 0, 3, 1, 0, 42, 2, '5', '7-12']);
C('F death no killers', 'sockets.js:1523', ['F', 0, 0, 0, 0, 0, 0, 0, 0]);

C('CHAT_MESSAGE_ENTITY', 'sockets.js:124', ['CHAT_MESSAGE_ENTITY',
  JSON.stringify([{ id: 12, messages: [{ text: 'hi', id: 0 }, { text: 'yo', id: 1 }] }])]);
C('CHAT_MESSAGE_ENTITY muted', 'sockets.js:123', ['CHAT_MESSAGE_ENTITY',
  JSON.stringify([{ id: 12, messages: [] }])]);

C('DTA image ad', 'sockets.js:701', ['DTA',
  JSON.stringify({ src: 'ad.png', normalAdSize: true, waitTime: 3 })]);
C('DTA video ad', 'sockets.js:701', ['DTA',
  JSON.stringify({ src: 'ad.mp4', normalAdSize: false, waitTime: 'isVideo' })]);

// SH: the object literal is entity.js:497-507 verbatim, including applyOn,
// which docs/protocol.md's field list leaves out.
C('SH camera shake', 'entity.js:524', ['SH', JSON.stringify({
  type: 'camera', duration: 10, amount: 5.5, keepShake: false, push: false,
  applyOn: { upgrade: true, shoot: false },
})]);
C('SH gui shake', 'entity.js:907', ['SH', JSON.stringify({
  type: 'gui', duration: 30, amount: 2, keepShake: true, push: true,
  applyOn: { upgrade: false, shoot: true },
})]);

// M: number on the sendMockup path, string on the load_all_mockups path.
C('M numeric index', 'sockets.js:1444', ['M', 12, JSON.stringify({ index: '12', name: 'Basic' })]);
C('M string index', 'sockets.js:2222', ['M', '12', JSON.stringify({ index: '12', name: 'Basic' })]);
C('M large numeric index', 'sockets.js:1444', ['M', 700, '{}']);

// Never sent by any server code; the client parses them anyway.
C('gSvInfo', 'socketinit.js:883', ['gSvInfo', 'ffa', 17], 'decode-only: no server talk() site');
C('I', 'socketinit.js:1087', ['I', true], 'decode-only');
C('AS', 'socketinit.js:1237', ['AS'], 'decode-only');
C('DS', 'socketinit.js:1241', ['DS'], 'decode-only');

// ===========================================================================
// 3.2 client -> server
// ===========================================================================

C('cs k with key', 'sockets.js:202', ['k', 'sometoken']);
C('cs k no key', 'sockets.js:202', ['k']);
C('cs s room request', 'socketinit.js:845', ['s', '', 1, 0, false, 0]);
C('cs s spawn', 'socketinit.js:938', ['s', 'player', 0, 1, false, 0]);
C('cs s spawn transfer', 'socketinit.js:938', ['s', 'player', 0, 0, '00ff12ab', 1]);
C('cs S sync', 'socketinit.js:862', ['S', 1788000000000], 'Date.now() is float32-quantised');
C('cs p ping', 'socketinit.js:834', ['p', 1234.5]);
C('cs d downlink', 'socketinit.js:1031', ['d', 98765]);
C('cs C command', 'socketinit.js:1305', ['C', 100, -250, 1, 0b00010011]);
C('cs C reverse', 'socketinit.js:1305', ['C', 0, 0, -1, 255]);
C('cs hash keys', 'canvas.js:417', ['#', 'KeyW', '-KeyA']);
C('cs hash empty', 'canvas.js:417', ['#']);
C('cs t toggle', 'canvas.js:261', ['t', 0, 1]);
C('cs U upgrade', 'canvas.js:326', ['U', 3, 1]);
C('cs U daily tank', 'sockets.js:450', ['U', 0, -1]);
C('cs x stat', 'canvas.js:311', ['x', 4, 0]);
C('cs x stat max', 'canvas.js:311', ['x', 9, 1]);
C('cs L', 'canvas.js:240', ['L']);
C('cs 1', 'canvas.js:249', ['1']);
C('cs H', 'canvas.js:243', ['H']);
C('cs M chat', 'canvas.js:23', ['M', 'hello everyone']);
C('cs T', 'global.js:451', ['T']);
C('cs DTA', 'canvas.js:602', ['DTA']);
C('cs DTAD', 'canvas.js:604', ['DTAD']);
C('cs DTAST', 'socketinit.js:1109', ['DTAST', 15.5]);
C('cs NWB', 'socketinit.js:932', ['NWB']);

// ===========================================================================
// 3.3.1 / 3.3.2 entity + gun records, through the real flatten()
// ===========================================================================

// gun.getPhotoInfo() key order, gun.js:606-623, with lastShot spread first.
const gun = (over = {}) => Object.assign({
  time: 4321, power: 2.5,
  color: '16 0 1 0 false',
  alpha: 1, strokeWidth: 3.5,
  borderless: false, drawFill: true, drawAbove: false,
  length: 20, width: 12.5, aspect: 1, angle: 0, direction: 0, offset: 0, layer: 0,
}, over);

// turretEntity.camera(), turretEntity.js:275
const turretPhoto = (over = {}) => Object.assign({
  type: 0x01,
  index: '13',
  size: 10.5, realSize: 9.75,
  facing: 1.25,
  angle: 0, direction: 0, offset: 0,
  sizeFactor: 12,
  mirrorMasterAngle: false,
  layer: 0,
  color: '12 0 1 0 false',
  guns: [], turrets: [],
}, over);

// bulletEntity.camera(), bulletEntity.js:361
const bulletPhoto = (over = {}) => Object.assign({
  type: 0x10,
  id: 4242, index: '9',
  x: 100.5, y: -200.25, vx: 3.5, vy: -1.25,
  size: 8, realSize: 8,
  health: 1, shield: 0, alpha: 1,
  facing: 0.75, vfacing: 0.01,
  layer: 0,
  color: '6 0 1 0 false',
  guns: [], turrets: [],
}, over);

// Entity.camera(), entity.js:743
const fullPhoto = (over = {}) => Object.assign({
  type: 0x06,
  invuln: false,
  id: 7, index: '0',
  x: -1000.5, y: 2000.25, vx: 0, vy: 0,
  size: 25, realSize: 25,
  health: 0.5, shield: 0.25, alpha: 1,
  facing: 3.14159, vfacing: 0,
  twiggle: false,
  layer: 5,
  color: '10 0 1 0 false',
  borderless: false, drawFill: true,
  name: '#ffffffplayer', score: 12345,
  guns: [], turrets: [],
}, over);

C('flatten turret', 'sockets.js:1291', ['u', ...sm.flatten(turretPhoto())]);
C('flatten turret with gun', 'sockets.js:1291', ['u', ...sm.flatten(turretPhoto({ guns: [gun()] }))]);
C('flatten bullet', 'sockets.js:1305', ['u', ...sm.flatten(bulletPhoto())]);
C('flatten bullet health rounding', 'sockets.js:1318',
  ['u', ...sm.flatten(bulletPhoto({ health: 1e-9, shield: 1e-9, alpha: 0.5 }))],
  'health uses ceil and shield uses round, so 1e-9 gives 1 and 0');
C('flatten full', 'sockets.js:1322', ['u', ...sm.flatten(fullPhoto())]);
C('flatten full no nameplate', 'sockets.js:1322', ['u', ...sm.flatten(fullPhoto({ type: 0x02 }))]);
C('flatten full scoreLabel', 'sockets.js:1346',
  ['u', ...sm.flatten(fullPhoto({ score: '3 players' }))],
  'settings.scoreLabel is always a string (serverTravel.js:36), so score is a union');
C('flatten full with guns', 'sockets.js:1351',
  ['u', ...sm.flatten(fullPhoto({ guns: [gun(), gun({ power: 0, time: 0 })] }))]);
C('flatten nested turrets', 'sockets.js:1357', ['u', ...sm.flatten(fullPhoto({
  turrets: [turretPhoto({ guns: [gun()] }), turretPhoto({ turrets: [turretPhoto()] })],
}))]);

// ===========================================================================
// 3.3.4 GUI block, through the real publish()
// ===========================================================================

// A stand-in for the floppy-backed gui object publish() reads. Anything left
// null is absent from the block, exactly as an unflagged floppy would be.
function guiFor(vals) {
  const p = k => ({ publish: () => (k in vals ? vals[k] : null) });
  return {
    master: { teamColor: '10 0 1 0 false' },
    bodyid: vals.bodyid ?? 99,
    fps: p('fps'), label: p('label'), score: p('score'), points: p('points'),
    upgrades: p('upgrades'), color: p('color'), stats: p('statsdata'),
    skills: p('skills'), accel: p('accel'), topspeed: p('top'),
    root: p('root'), class: p('class'), visibleName: p('visibleName'),
    dailyTank: p('dailyTank'),
  };
}
const statTriples = [];
for (const s of ['atk', 'hlt', 'spd', 'str', 'pen', 'dam', 'rld', 'mob', 'rgn', 'shi']) {
  statTriples.push(s.toUpperCase(), 9, 7);
}

C('gui empty', 'sockets.js:1030', ['u', ...sm.publish(guiFor({}))], 'publish() always returns at least [0]');
C('gui fps only', 'sockets.js:975', ['u', ...sm.publish(guiFor({ fps: 0.75 }))]);
C('gui fps zero', 'sockets.js:977', ['u', ...sm.publish(guiFor({ fps: 0 }))],
  'o.fps || 1 turns a genuine 0 into 1');
C('gui label', 'sockets.js:979', ['u', ...sm.publish(guiFor({ label: '0', color: '11 0 1 0 false', bodyid: 7 }))]);
C('gui label no colour', 'sockets.js:982', ['u', ...sm.publish(guiFor({ label: '0', bodyid: 7 }))],
  'falls back to gui.master.teamColor');
C('gui score', 'sockets.js:985', ['u', ...sm.publish(guiFor({ score: JSON.stringify([1000, 2, 1, 0]) }))]);
C('gui upgrades', 'sockets.js:993', ['u', ...sm.publish(guiFor({ upgrades: ['0_Basic_1', '1_Wing_2'] }))]);
C('gui upgrades empty', 'sockets.js:993', ['u', ...sm.publish(guiFor({ upgrades: [] }))]);
C('gui statsdata', 'sockets.js:997', ['u', ...sm.publish(guiFor({ statsdata: statTriples }))]);
C('gui skills', 'sockets.js:1001', ['u', ...sm.publish(guiFor({ skills: '000102030405060708ff' }))]);
C('gui dailyTank', 'sockets.js:1025', ['u', ...sm.publish(guiFor({ dailyTank: JSON.stringify(['12', true]) }))]);
C('gui everything', 'sockets.js:974', ['u', ...sm.publish(guiFor({
  fps: 1, label: '0', color: '11 0 1 0 false', bodyid: 7,
  score: JSON.stringify([1000, 2, 1, 0]), points: 5,
  upgrades: ['0_Basic_1'], statsdata: statTriples, skills: '000102030405060708ff',
  accel: 1.5, top: 12.25, root: 'basic', class: 'Basic', visibleName: 1,
  dailyTank: JSON.stringify(['12', false]),
}))], 'every bit set, mask 0x1fff');

// getstuff() builds the 20-char hex skills string in reverse stat order.
const fakeSkill = {
  amount: s => ({ atk: 1, hlt: 2, spd: 3, str: 4, pen: 5, dam: 6, rld: 7, mob: 8, rgn: 9, shi: 255 })[s],
};
cases.push({
  name: 'getstuff hex string', site: 'sockets.js:890', input: null, bytes: null, err: null,
  roundTrip: null, note: 'reverse stat order', value: sm.getstuff(fakeSkill),
});

// ===========================================================================
// full u frames
// ===========================================================================

C('u camera only', 'sockets.js:1636', ['u', true, 1234.5, -6789.25]);
C('u full empty world', 'sockets.js:1646',
  ['u', 98765, 100.5, -200.25, 2000, 1.5, -0.5, false, ...sm.publish(guiFor({})), 0]);
C('u full one entity', 'sockets.js:1646', (() => {
  const view = [].concat(sm.flatten(fullPhoto()));
  return ['u', 98765, 100.5, -200.25, 2000, 1.5, -0.5, false, ...sm.publish(guiFor({ fps: 1 })), 1, ...view];
})());
C('u full three entities', 'sockets.js:1646', (() => {
  const visible = [sm.flatten(fullPhoto()), sm.flatten(bulletPhoto()), sm.flatten(fullPhoto({ id: 8, type: 0 }))];
  const view = [].concat(...visible);
  return ['u', 98765, 0, 0, 2000, 0, 0, true, ...sm.publish(guiFor({})), visible.length, ...view];
})());
C('u lastCycle of one', 'sockets.js:1648',
  ['u', 1, 100.5, -200.25, 2000, 0, 0, false, 0, 0],
  'byte-ambiguous with the camera-only form: 1 and true share tag 0b0001');

// ===========================================================================
// 3.3.5 delta blocks, through the real Delta class
// ===========================================================================

// finder just hands back what update() was given, so the test drives the rows.
const rowsDelta = len => new Delta(len, rows => rows.slice().sort((a, b) => a.id - b.id));

function deltaCase(name, site, len, seq, note) {
  const d = rowsDelta(len);
  let last;
  for (const rows of seq) last = d.update(0, ...rows);
  C(name, site, ['b', ...last.update], note);
  C(name + ' reset', site, ['b', ...last.reset], note);
}

const lbRow = (id, score, render) => ({
  id, data: [score, '0', 'player' + id, '11 0 1 0 false', '11 0 1 0 false', '#FFFFFF', 'Basic', render],
});

deltaCase('delta minimap create', 'sockets.js:1797', 5, [
  [{ id: 1, data: [0, -12, 34, '16 0 1 0 false', 25] },
   { id: 2, data: [2, 127, -128, '17 0 1 0 false', 100] }],
]);
deltaCase('delta minimap update one', 'sockets.js:1686', 5, [
  [{ id: 1, data: [0, -12, 34, '16 0 1 0 false', 25] },
   { id: 2, data: [2, 127, -128, '17 0 1 0 false', 100] }],
  [{ id: 1, data: [0, -11, 34, '16 0 1 0 false', 25] },
   { id: 2, data: [2, 127, -128, '17 0 1 0 false', 100] }],
]);
deltaCase('delta minimap delete', 'sockets.js:1703', 5, [
  [{ id: 1, data: [0, -12, 34, 'c', 25] }, { id: 2, data: [2, 1, 2, 'c', 100] }],
  [{ id: 2, data: [2, 1, 2, 'c', 100] }],
]);
deltaCase('delta teams', 'sockets.js:1822', 3, [
  [{ id: 5, data: [10, -10, '10 0 1 0 false'] }],
]);
deltaCase('delta leaderboard create', 'sockets.js:1852', 7, [
  [lbRow(1, 5000, true), lbRow(2, 1200, false)],
], 'eight fields on the wire, dataLength is seven');

// OPEN QUESTION 1: does a change confined to field 7 emit anything?
{
  const d = rowsDelta(7);
  d.update(0, lbRow(1, 5000, true));
  const only7 = d.update(0, lbRow(1, 5000, false));
  const also0 = rowsDelta(7);
  also0.update(0, lbRow(1, 5000, true));
  const scoreToo = also0.update(0, lbRow(1, 4999, false));

  const d8 = rowsDelta(8);
  d8.update(0, lbRow(1, 5000, true));
  const only7at8 = d8.update(0, lbRow(1, 5000, false));

  cases.push({
    name: 'leaderboard dataLength probe', site: 'sockets.js:1694', input: null,
    bytes: null, err: null, roundTrip: null,
    note: 'renderOnLeaderboard is field 7 and the compare loop stops at 7',
    probe: {
      changeField7Only_len7: only7.update,
      changeField7Only_len8: only7at8.update,
      changeField0And7_len7: scoreToo.update,
      resetCarriesAllEight: only7.reset,
    },
  });
  C('delta leaderboard field7 only', 'sockets.js:1694', ['b', ...only7.update],
    'dataLength 7 means this is an empty update');
}

// b frames: three concatenated blocks, no separators.
{
  const mm = rowsDelta(5), tm = rowsDelta(3), lb = rowsDelta(7);
  const mmU = mm.update(0, { id: 1, data: [0, -12, 34, '16 0 1 0 false', 25] });
  const tmU = tm.update(0, { id: 5, data: [10, -10, '10 0 1 0 false'] });
  const lbU = lb.update(0, lbRow(1, 5000, true));
  C('b reset frame', 'sockets.js:1981', ['b', ...mmU.reset, ...tmU.reset, ...lbU.reset]);
  C('b update frame', 'sockets.js:1989', ['b', ...mmU.update, ...tmU.update, ...lbU.update]);
  C('b no team', 'sockets.js:1992', ['b', ...mmU.update, 0, 0, ...lbU.update],
    'the [0, 0] literal stands in for an absent team block');
}

// ===========================================================================
// Coverage the Go side needs that the sections above do not reach
// ===========================================================================

// p / svInfo: the payload is toFixed(1), so these pin the rounding as well as
// the bytes. 0.25 and 0.05 are the interesting ones — toFixed strips the sign
// first and then rounds the exact binary value, ties going up.
for (const v of [0, 0.25, -0.25, 0.35, 0.05, 12.34, 1234.5678, 255.55, 1e20, -7.5]) {
  C(`p pong ${v}`, 'sockets.js:337', ['p', v.toFixed(1)]);
}
C('svInfo slow', 'speedLoop.js:24', ['svInfo', 'tag', (33.333).toFixed(1)]);

// Every GUI bit on its own, so a mis-ordered payload cannot hide behind a
// neighbour.
C('gui points', 'sockets.js:989', ['u', ...sm.publish(guiFor({ points: 12 }))]);
C('gui accel', 'sockets.js:1005', ['u', ...sm.publish(guiFor({ accel: 1.5 }))]);
C('gui topspeed', 'sockets.js:1009', ['u', ...sm.publish(guiFor({ top: 12.25 }))]);
C('gui root', 'sockets.js:1013', ['u', ...sm.publish(guiFor({ root: 'basic' }))]);
C('gui class', 'sockets.js:1017', ['u', ...sm.publish(guiFor({ class: 'Basic' }))]);
C('gui visibleName', 'sockets.js:1021', ['u', ...sm.publish(guiFor({ visibleName: 1 }))]);
C('gui score fractional', 'sockets.js:985',
  ['u', ...sm.publish(guiFor({ score: JSON.stringify([1234.5, 0, 0, 0]) }))],
  'JSON number formatting has to match');

// A full uplink carrying a nameplate whose score is a scoreLabel string.
C('u full scoreLabel entity', 'sockets.js:1346', (() => {
  const view = sm.flatten(fullPhoto({ score: '3 players', name: '#ffffffPortal' }));
  return ['u', 98765, 0, 0, 2000, 0, 0, false, ...sm.publish(guiFor({})), 1, ...view];
})());

// Turret and bullet records inside a real uplink, not just on their own.
C('u full mixed layouts', 'sockets.js:1646', (() => {
  const visible = [
    sm.flatten(fullPhoto({ turrets: [turretPhoto({ guns: [gun()] })] })),
    sm.flatten(bulletPhoto({ guns: [gun()] })),
  ];
  return ['u', 5, -1.5, 2.5, 1500.25, 0, 0, true, ...sm.publish(guiFor({ fps: 0.5 })), 2,
    ...[].concat(...visible)];
})());

// A leaderboard delta that actually updates, not just creates.
deltaCase('delta leaderboard update', 'sockets.js:1694', 7, [
  [lbRow(1, 5000, true), lbRow(2, 1200, false)],
  [lbRow(1, 4000, true), lbRow(2, 1200, false)],
], 'only row 1 changed');
deltaCase('delta leaderboard create then add', 'sockets.js:1710', 7, [
  [lbRow(2, 1200, false)],
  [lbRow(1, 5000, true), lbRow(2, 1200, false)],
]);

// ===========================================================================
// Helper semantics, so the Go ports of these are checked against V8 and not
// against a reading of the spec
// ===========================================================================

const helpers = {
  // Number.prototype.toFixed(1) — sockets.js:337, speedLoop.js:24.
  toFixed1: [0, 1, 0.25, -0.25, 0.35, -0.35, 0.05, 1.05, 2.5, -2.5, 12.34, 1234.5678,
    255.55, 0.0499999, 123456789.987, 1e20, 1e21, -1e21, 1 / 3, -0.01, -0.05, 1e-7, -1e-7,
    NaN, Infinity, -Infinity, -0]
    .map(v => ({ in: ser([v])[0], out: v.toFixed(1) })),

  // Number.prototype.toString() — sockets.js:207 and :720.
  numberToString: [0, -0, 1, 255, 1.5, -2.25, 1e20, 1e21, 1.2345e21, 1e-6, 9.9e-7, 1e-7,
    4294967295, -4294967296, 0.1, NaN, Infinity, -Infinity]
    .map(v => ({ in: ser([v])[0], out: String(v) })),

  // String(m[0]).split(".")[0] — the DTAST duration, sockets.js:720.
  dtastDuration: [15.5, 15, 0, -3.25, 1e21, 0.5, NaN]
    .map(v => ({ in: ser([v])[0], out: String(v).split('.')[0] })),

  // encodeURI(name).split(/%..|./).length — the only name limit, sockets.js:269.
  nameTokens: ['', 'a', 'hello world', 'x'.repeat(47), 'x'.repeat(48), 'é',
    'é', 'ÿ', '😀', '~!*()', 'ab#c', '%', '"', '<>', '`',
    '', ' ', 'Player_1']
    .map(s => ({ in: s, out: encodeURI(s).split(/%..|./).length })),

  // String.prototype.trim() — the permission key, sockets.js:207.
  trim: ['  key  ', '\t\n key \r\n', '﻿key﻿', ' key ',
    ' key　', 'key', '', '   ']
    .map(s => ({ in: s, out: s.trim() })),

  // getstuff, sockets.js:890. Input is in the forward atk..shi order.
  skillsHex: [
    { in: [1, 2, 3, 4, 5, 6, 7, 8, 9, 255], out: sm.getstuff({ amount: s => ({ atk: 1, hlt: 2, spd: 3, str: 4, pen: 5, dam: 6, rld: 7, mob: 8, rgn: 9, shi: 255 })[s] }) },
    { in: [0, 0, 0, 0, 0, 0, 0, 0, 0, 0], out: sm.getstuff({ amount: () => 0 }) },
    { in: [16, 32, 48, 64, 80, 96, 112, 128, 144, 160], out: sm.getstuff({ amount: s => ({ atk: 16, hlt: 32, spd: 48, str: 64, pen: 80, dam: 96, rld: 112, mob: 128, rgn: 144, shi: 160 })[s] }) },
  ],

  // util.clamp(Math.floor(256 * v / dim), -128, 127) — sockets.js:1812.
  minimapQuantise: [[0, 4000], [1999, 4000], [2000, 4000], [-2000, 4000], [-2001, 4000],
    [123.7, 4000], [-123.7, 4000], [1e9, 4000]]
    .map(([v, dim]) => ({ in: [v, dim], out: util.clamp(Math.floor((256 * v) / dim), -128, 127) })),

  // Math.ceil(65535 * h) vs Math.round(65535 * s) vs Math.round(255 * a) —
  // sockets.js:1318.
  quantise: [0, 1e-9, 0.5, 0.999999, 1]
    .map(v => ({ in: v, health: Math.ceil(65535 * v), shield: Math.round(65535 * v), alpha: Math.round(255 * v) })),
};

// ===========================================================================
// JSON payload shapes, so the Go encoder can be checked byte for byte
// ===========================================================================

const jsonCases = {
  'SH camera': JSON.stringify({
    type: 'camera', duration: 10, amount: 5.5, keepShake: false, push: false,
    applyOn: { upgrade: true, shoot: false },
  }),
  'DTA image': JSON.stringify({ src: 'ad.png', normalAdSize: true, waitTime: 3 }),
  'DTA video': JSON.stringify({ src: 'ad.mp4', normalAdSize: false, waitTime: 'isVideo' }),
  'blackout': JSON.stringify({ active: true, color: 3 }),
  'gui score': JSON.stringify([1000, 2, 1, 0]),
  'gui dailyTank': JSON.stringify(['12', true]),
  'gui dailyTank none': JSON.stringify([false]),
  'chat': JSON.stringify([{ id: 12, messages: [{ text: 'hi <b>', id: 0 }] }]),
  'serverStartTime': JSON.stringify(1788000000000),
  'float in json': JSON.stringify({ a: 1.5, b: 1, c: -0.25 }),
};

// ===========================================================================

const out = {
  generated: new Date().toISOString(),
  source: 'js-src/server/game/network/sockets.js (flatten/publish/floppy/getstuff/Delta sliced and evaluated)',
  note: 'bytes are lowercase hex of fasttalk.encode(input). roundTrip is decode(encode(input)).',
  json: jsonCases,
  helpers,
  cases,
};

const dest = path.join(root, 'gen', 'message-vectors.json');
fs.mkdirSync(path.dirname(dest), { recursive: true });
fs.writeFileSync(dest, JSON.stringify(out, null, 2));

const ok = cases.filter(c => c.bytes !== null).length;
console.log(`wrote ${cases.length} message vectors (${ok} encoded) -> gen/message-vectors.json`);

const probe = cases.find(c => c.probe);
console.log('\nOPEN QUESTION 1 — leaderboard dataLength:');
for (const [k, v] of Object.entries(probe.probe)) {
  console.log(`  ${k.padEnd(26)} ${JSON.stringify(v)}`);
}
console.log('\ngetstuff:', cases.find(c => c.value).value);
