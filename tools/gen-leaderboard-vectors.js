// Golden vectors for the leaderboard and per-socket minimap builders
// (internal/net/leaderboard.go).
//
// Output: gen/leaderboard-vectors.json
//
// The builders are sliced out of sockets.js and run, rather than transcribed,
// for the same reason gen-gui-vectors.js slices the HUD: sockets.js cannot be
// required -- it is one 2,252-line class that touches Config, the entity map and
// half a dozen globals at module scope -- but the individual builders are
// self-contained arrow functions with a handful of free identifiers, and those
// can be supplied.
//
// What a live probe cannot reach is exactly what is pinned here: an entity with
// a zero score, a tie on score, more than ten candidates, a leaderboardColor, an
// empty name, a boss board with something on it, a tag room. A running ffa room
// produces none of those in the first few seconds, and some of them not at all.
//
// Each case carries its INPUT as well as its output, so the Go side replays the
// same entities rather than restating them.

'use strict';

require('./fdlibm-pow');
const fs = require('fs');
const path = require('path');

const root = path.resolve(__dirname, '..');
const socketsSrc = fs.readFileSync(
  path.join(root, 'js-src', 'server', 'game', 'network', 'sockets.js'), 'utf8');

// sliceBlock is gen-message-vectors.js's: from `marker` to the brace that closes
// the block it opens.
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

// A `new Delta(n, args => { ... })` statement loses its closing paren to
// sliceBlock, because the brace it balances is the arrow body's. The paren
// always follows immediately, so putting it back is exact rather than hopeful.
function sliceDelta(marker) {
  const text = sliceBlock(marker);
  const after = socketsSrc[socketsSrc.indexOf(text) + text.length];
  if (after !== ')') throw new Error(`expected ) after the arrow body of ${marker}, got ${after}`);
  return text + ')';
}

// --- the free identifiers the sliced code reads ----------------------------

const ROOM_W = 8000;
const ROOM_H = 8000;

const util = { clamp: (v, l, h) => (v < l ? l : v > h ? h : v) };

// A stand-in for the Delta class. The real one is pinned by
// gen-message-vectors.js; what is wanted here is the finder it is handed.
class Delta {
  constructor(dataLength, finder) {
    this.dataLength = dataLength;
    this.finder = finder;
  }
}

let entities = new Map();
let Config = {};
const Class = { hp: { LABEL: '##% HP' }, tagMode: { LABEL: 'Players', index: '999' } };
const teamNames = ['Blue', 'Green', 'Red', 'Purple'];
const getTeamColor = team => `team${-team}`;

global.gameManager = { room: { width: ROOM_W, height: ROOM_H, topPlayerID: null } };

const sliced = {
  makeLeaderboardList: sliceBlock('        let makeLeaderboardList = (list, args) => {'),
  makeLeaderboardHPList: sliceBlock('        let makeLeaderboardHPList = (list) => {'),
  minimapTeams: sliceDelta('        let minimapTeams = new Delta(3, args => {'),
  globalLeaderboard: sliceDelta('        let globalLeaderboard = new Delta(7, args => {'),
  defaultLeaderboard: sliceDelta('        let defaultLeaderboard = new Delta(7, args => {'),
  playerLeaderboard: sliceDelta('        let playerLeaderboard = new Delta(7, args => {'),
  bossLeaderboard: sliceDelta('        let bossLeaderboard = new Delta(7, args => {'),
};

// The finders call makeLeaderboardList, so the two helpers have to be reachable
// when the finder RUNS, not when it is built. They are assigned into bindings
// declared HERE rather than eval'd whole: a `let` inside a direct eval lands in
// the eval's own scope and is gone the moment it returns, which is a quiet way
// to get "makeLeaderboardList is not defined" out of a finder that was built
// without complaint.
const expr = text => text.replace(/^\s*let\s+[A-Za-z0-9_]+\s*=\s*/, '');
const makeLeaderboardList = eval(expr(sliced.makeLeaderboardList));
const makeLeaderboardHPList = eval(expr(sliced.makeLeaderboardHPList));
const minimapTeams = eval(expr(sliced.minimapTeams));
const globalLeaderboard = eval(expr(sliced.globalLeaderboard));
const defaultLeaderboard = eval(expr(sliced.defaultLeaderboard));
const playerLeaderboard = eval(expr(sliced.playerLeaderboard));
const bossLeaderboard = eval(expr(sliced.bossLeaderboard));

// --- synthetic entities ----------------------------------------------------

// ent fills in the subset of an entity the builders touch. Every field is
// spelled out, because the JSON is the Go side's input as well as this side's.
function ent(o) {
  const e = {
    id: o.id,
    index: o.index === undefined ? String(700 + o.id) : o.index,
    name: o.name === undefined ? `E${o.id}` : o.name,
    label: o.label === undefined ? 'Basic' : o.label,
    type: o.type === undefined ? 'tank' : o.type,
    team: o.team === undefined ? -1 : o.team,
    x: o.x === undefined ? 0 : o.x,
    y: o.y === undefined ? 0 : o.y,
    score: o.score === undefined ? 100 : o.score,
    health: o.health === undefined ? 50 : o.health,
    healthMax: o.healthMax === undefined ? 100 : o.healthMax,
    compiled: o.compiled === undefined ? 'red 0 1 0 false' : o.compiled,
    // null is the JS's undefined here: every read is a truth test, so an unset
    // colour and a colour of 0 take the same branch.
    leaderboardColor: o.leaderboardColor === undefined ? null : o.leaderboardColor,
    minimapColor: o.minimapColor === undefined ? null : o.minimapColor,
    nameColor: o.nameColor === undefined ? null : o.nameColor,
    incognito: !!o.incognito,
    isPlayer: !!o.isPlayer,
    isBoss: !!o.isBoss,
    allowedOnMinimap: o.allowedOnMinimap === undefined ? true : o.allowedOnMinimap,
    // masterOf names another entity by id; unset means the entity is its own
    // master, which is how the JS spells "not a turret".
    master: o.master === undefined ? null : o.master,
    solo: o.solo === undefined ? 0 : o.solo,
    assists: o.assists === undefined ? 0 : o.assists,
    leaderboardable: o.leaderboardable === undefined ? true : o.leaderboardable,
    drawShape: o.drawShape === undefined ? true : o.drawShape,
    renderOnLeaderboard: o.renderOnLeaderboard === undefined ? null : o.renderOnLeaderboard,
  };
  return e;
}

// live turns the recorded form into the object shape the builders read.
function live(spec) {
  const byID = new Map();
  const out = spec.map(e => {
    const o = {
      id: e.id,
      index: e.index,
      name: e.name,
      label: e.label,
      type: e.type,
      team: e.team,
      x: e.x,
      y: e.y,
      skill: { score: e.score },
      health: { amount: e.health, max: e.healthMax },
      color: { compiled: e.compiled },
      leaderboardColor: e.leaderboardColor === null ? undefined : e.leaderboardColor,
      minimapColor: e.minimapColor === null ? undefined : e.minimapColor,
      nameColor: e.nameColor === null ? undefined : e.nameColor,
      incognito: e.incognito,
      isPlayer: e.isPlayer,
      isBoss: e.isBoss,
      allowedOnMinimap: e.allowedOnMinimap,
      killCount: { solo: e.solo, assists: e.assists },
      settings: {
        leaderboardable: e.leaderboardable,
        drawShape: e.drawShape,
        renderOnLeaderboard: e.renderOnLeaderboard === null ? undefined : e.renderOnLeaderboard,
      },
      isDead() { return this.health.amount <= 0; },
    };
    byID.set(e.id, o);
    return o;
  });
  spec.forEach((e, i) => { out[i].master = e.master === null ? out[i] : byID.get(e.master); });
  entities = new Map(out.map(o => [o.id, o]));
  return { list: out, byID };
}

// --- case plumbing ---------------------------------------------------------

const cases = [];

// C runs one case and records its input beside its output. `spec.call` names
// which builder to drive; `spec.config` is the Config the sliced code reads.
function C(name, site, note, spec) {
  const input = (spec.entities || []).map(ent);
  Config = Object.assign({ mode: 'teams', tag: false, groups: false }, spec.config || {});
  const { list, byID } = live(input);

  // The two arms of the global board take their contents from Config rather
  // than from the entity map.
  if (spec.tagTeams) Config.tag_data = { getData: () => spec.tagTeams };
  if (spec.motherships) {
    Config.mothership_data = { getData: () => spec.motherships.map(id => byID.get(id)) };
  }

  global.gameManager.room.topPlayerID = null;
  let rows = null;
  let threw = null;
  try {
    const finder = {
      list: () => makeLeaderboardList(list.slice(), spec.args || []),
      hp: () => makeLeaderboardHPList(list.slice()),
      global: () => globalLeaderboard.finder(spec.args || []),
      default: () => defaultLeaderboard.finder(spec.args || []),
      players: () => playerLeaderboard.finder(spec.args || []),
      bosses: () => bossLeaderboard.finder(spec.args || []),
      minimapTeams: () => minimapTeams.finder(spec.args || []),
    }[spec.call];
    if (!finder) throw new Error(`unknown builder ${spec.call}`);
    rows = finder().map(r => ({ id: r.id, data: r.data }));
  } catch (e) {
    threw = String((e && e.message) || e);
  }

  cases.push({
    name,
    site,
    note,
    call: spec.call,
    config: {
      mode: Config.mode,
      tag: !!Config.tag,
      groups: !!Config.groups,
      mothership: !!Config.mothership,
    },
    args: spec.args || [],
    tagTeams: spec.tagTeams || null,
    motherships: spec.motherships || null,
    entities: input,
    threw,
    topPlayerID: global.gameManager.room.topPlayerID,
    rows,
  });
}

// --- makeLeaderboardList ---------------------------------------------------

const FFA = { mode: 'ffa' };
const GROUPS = { mode: 'teams', groups: true };
const FFA_TAG = { mode: 'ffa', tag: true };

C('order, ties and the final id sort', 'sockets.js:1729',
  'The pick is a selection sort taking the highest score each pass, so a tie goes ' +
  'to the earliest entry in the list. The result is then re-sorted by id, which is ' +
  'what the delta merge needs -- the score order never reaches the wire.',
  {
    call: 'list',
    entities: [
      { id: 5, score: 100 }, { id: 3, score: 300 }, { id: 9, score: 300 }, { id: 1, score: 200 },
    ],
  });

C('a zero score ends the whole list', 'sockets.js:1737',
  '`is` starts at 0 and the test is `val > is`, so an entity on exactly zero is ' +
  'never picked -- and because the break fires on the first pass that finds ' +
  'nothing better, every remaining entity goes with it.',
  { call: 'list', entities: [{ id: 1, score: 0 }, { id: 2, score: 0 }, { id: 3, score: 5 }] });

C('a negative score is dropped too', 'sockets.js:1734',
  'Same test: a score below zero cannot beat the initial 0 either.',
  { call: 'list', entities: [{ id: 1, score: -50 }, { id: 2, score: 10 }] });

C('the cap is ten', 'sockets.js:1730',
  'Twelve candidates on descending scores; the two smallest never appear.',
  {
    call: 'list',
    entities: Array.from({ length: 12 }, (_, i) => ({ id: 100 + i, score: 1000 - i * 10 })),
  });

C('score is rounded, not truncated', 'sockets.js:1747',
  'Math.round, so a half goes up.',
  {
    call: 'list',
    entities: [{ id: 1, score: 10.5 }, { id: 2, score: 10.4 }, { id: 3, score: 0.5 }],
  });

C('colours: plain teams room', 'sockets.js:1743',
  'No leaderboardColor, no groups, not ffa: both colour fields are the entity\'s ' +
  'own compiled colour.',
  { call: 'list', entities: [{ id: 1, compiled: 'blue 0 1 0 false' }] });

C('colours: ffa without tag', 'sockets.js:1743',
  'The two fields differ here and nowhere else: field 3 is palette 12 and field 4 ' +
  'is palette 11, so an ffa leaderboard is deliberately two-tone.',
  { call: 'list', config: FFA, entities: [{ id: 1, compiled: 'blue 0 1 0 false' }] });

C('colours: ffa with tag', 'sockets.js:1743',
  'tag turns both halves of the ffa test off, so the room falls back to the entity ' +
  'colour.',
  { call: 'list', config: FFA_TAG, entities: [{ id: 1, compiled: 'blue 0 1 0 false' }] });

C('colours: groups', 'sockets.js:1743',
  'Config.groups takes the palette-11 branch for both fields: the second test is ' +
  '`Config.mode == ffa && !Config.tag`, which a groups teams room fails.',
  { call: 'list', config: GROUPS, entities: [{ id: 1, compiled: 'blue 0 1 0 false' }] });

C('colours: leaderboardColor wins everywhere', 'sockets.js:1743',
  'Set by spawnBots on every bot (game/index.js:455). It suppresses both palette ' +
  'branches, in every mode, for both fields.',
  {
    call: 'list', config: FFA,
    entities: [{ id: 1, leaderboardColor: '7', compiled: 'blue 0 1 0 false' }],
  });

C('colours: a numeric zero leaderboardColor is falsy', 'sockets.js:1743',
  'spawnBots assigns `Math.floor(Math.random() * 20)` when random_body_colors is ' +
  'on, so one bot in twenty draws 0 -- and every read is a truth test, so that bot ' +
  'silently loses its colour. Same shape as the minimapColor bug.',
  {
    call: 'list', config: FFA,
    entities: [{ id: 1, leaderboardColor: 0, compiled: 'blue 0 1 0 false' }],
  });

C('nameColor falls back to uppercase #FFFFFF', 'sockets.js:1752',
  'Entities are constructed with a lowercase #ffffff (entity.js:73), so the ' +
  'fallback only shows for one that has had it cleared.',
  {
    call: 'list',
    entities: [
      { id: 1 }, { id: 2, nameColor: '#ffffff' }, { id: 3, nameColor: '' },
      { id: 4, nameColor: '#ff0000' },
    ],
  });

C('renderOnLeaderboard defaults to true', 'sockets.js:1756',
  '`?? true`, so only an explicit false turns it off. genericEntity sets ' +
  'CAN_BE_ON_LEADERBOARD without ever setting RENDER_ON_LEADERBOARD, so the ' +
  'undefined case is what every food and wall row takes. It is also the eighth ' +
  'field, the one the Delta never compares.',
  {
    call: 'list',
    entities: [{ id: 1 }, { id: 2, renderOnLeaderboard: false }, { id: 3, renderOnLeaderboard: true }],
  });

C('args, which the builder ignores', 'sockets.js:1729',
  'The socket\'s own body id is computed per subscriber at sockets.js:1966 and ' +
  'handed to the finder, whose parameter list ends at `args` without ever reading ' +
  'it. These rows are identical to the ones the case above produces with no args ' +
  'at all, which is the whole point: two sockets on one board get the same bytes.',
  { call: 'list', config: FFA, args: [1], entities: [{ id: 1 }, { id: 2 }] });

C('an empty board writes -1', 'sockets.js:1760',
  'topPlayerID is written on every call, for every subscriber, four times a second.',
  { call: 'list', entities: [] });

// --- makeLeaderboardHPList -------------------------------------------------

C('hp list: ids are offset by 100', 'sockets.js:1775',
  'So a boss row and a player row for the same entity cannot collide inside one ' +
  'Delta. It also means the client is told about an id no entity has -- and that ' +
  'topPlayerID, written from the same list, is an id + 100.',
  {
    call: 'hp',
    entities: [
      { id: 1, score: 300, health: 25, healthMax: 100, label: 'Guardian' },
      { id: 2, score: 100, health: 100, healthMax: 300, label: 'Summoner' },
    ],
  });

C('hp list: still ordered and cut by SCORE', 'sockets.js:1768',
  'The percentage is what it shows, but the pick is `skill.score` -- so a boss on ' +
  'full health with no score is not on the board at all.',
  {
    call: 'hp',
    entities: [
      { id: 1, score: 0, health: 100, healthMax: 100 },
      { id: 2, score: 5, health: 1, healthMax: 100 },
    ],
  });

C('hp list: an empty name shows the label', 'sockets.js:1779',
  'The reverse of the score board, which shows an empty name as empty.',
  {
    call: 'hp',
    entities: [
      { id: 1, score: 10, name: '', label: 'Palisade' },
      { id: 2, score: 9, name: 'Named', label: 'Palisade' },
    ],
  });

C('hp list: the percentage is rounded', 'sockets.js:1777',
  'amount/max*100, rounded, so a boss on a thousandth of its health reads 0 while ' +
  'still alive. A zero maximum gives NaN, which the encoder is happy to send.',
  {
    call: 'hp',
    entities: [
      { id: 1, score: 10, health: 1, healthMax: 1000 },
      { id: 2, score: 9, health: 2, healthMax: 3 },
      { id: 3, score: 8, health: 0, healthMax: 0 },
    ],
  });

C('hp list: the colours and the last two fields are fixed', 'sockets.js:1780',
  'Both colour fields are the entity colour whatever the mode is and whatever ' +
  'leaderboardColor says, the name colour is a hardcoded lowercase #ffffff, the ' +
  'label is Class.hp.LABEL and the eighth field is a literal false.',
  {
    call: 'hp', config: FFA,
    entities: [{ id: 1, score: 10, compiled: 'blue 0 1 0 false', leaderboardColor: '7' }],
  });

// --- the four finders ------------------------------------------------------

const MIXED = [
  { id: 1, type: 'tank', score: 500, isPlayer: true },
  { id: 2, type: 'tank', score: 400, incognito: true },
  { id: 3, type: 'food', score: 300, solo: 1 },
  { id: 4, type: 'food', score: 250 },
  { id: 5, type: 'miniboss', score: 200, assists: 2 },
  { id: 6, type: 'crasher', score: 150 },
  { id: 7, type: 'tank', score: 100, leaderboardable: false },
  { id: 8, type: 'tank', score: 90, drawShape: false },
  { id: 9, type: 'miniboss', score: 80, isBoss: true },
  { id: 10, type: 'wall', score: 70, solo: 3 },
];

C('globalLeaderboard: the filter', 'sockets.js:1852',
  'leaderboardable && drawShape && !incognito && (tank || has a kill). Food with a ' +
  'kill is admitted -- this is the only board that takes it.',
  { call: 'global', entities: MIXED });

C('defaultLeaderboard: the filter', 'sockets.js:1907',
  'The same filter with `type !== "food"` bolted on, which is the whole difference ' +
  'between the two boards.',
  { call: 'default', entities: MIXED });

C('playerLeaderboard: the filter', 'sockets.js:1922',
  'isPlayer, which is a socket-driven body -- not a bot, and not a tank a gamemode ' +
  'spawned. No kill-count arm at all.',
  { call: 'players', entities: MIXED });

C('bossLeaderboard: the filter', 'sockets.js:1934',
  'isBoss or type miniboss, with no incognito test, and it goes through the HP ' +
  'builder -- so the ids come back offset by 100.',
  { call: 'bosses', entities: MIXED });

C('globalLeaderboard under tag', 'sockets.js:1854',
  'One row per team from Config.tag_data.getData(), holding the team\'s member ' +
  'count, the team NAME, and Class.tagMode\'s index and label. The entity map is ' +
  'not read at all, and topPlayerID is not written -- the arm returns before it.',
  { call: 'global', config: { mode: 'ffa', tag: true }, tagTeams: [7, 3, 0], entities: MIXED });

C('globalLeaderboard under mothership', 'sockets.js:1871',
  'One row per LIVING mothership: health percentage, team name, Class.hp. A dead ' +
  'one is skipped, so the board shrinks as they fall, and the surviving rows keep ' +
  'their spawn order rather than being sorted.',
  {
    call: 'global',
    config: { mode: 'teams', mothership: true },
    motherships: [40, 41],
    entities: [
      { id: 40, health: 60, healthMax: 200, index: '900' },
      { id: 41, health: 0, healthMax: 200, index: '900' },
    ],
  });

C('tag beats mothership', 'sockets.js:1854',
  'Both arms return early and tag is tested first, so a room with both configured ' +
  'shows the tag board.',
  {
    call: 'global',
    config: { mode: 'ffa', tag: true, mothership: true },
    tagTeams: [2],
    motherships: [40],
    entities: [{ id: 40, health: 60, healthMax: 200 }],
  });

// --- minimapTeams ----------------------------------------------------------

C('minimapTeams: the filter and the team argument', 'sockets.js:1822',
  'Tanks on the asked-for team whose master is themselves. A turret has a master ' +
  'that is not itself and is skipped; so is a tank on another team, anything that ' +
  'is not a tank, and anything hidden from the minimap.',
  {
    call: 'minimapTeams', args: [-1],
    entities: [
      { id: 1, type: 'tank', team: -1, x: 1000, y: -2000 },
      { id: 2, type: 'tank', team: -2 },
      { id: 3, type: 'tank', team: -1, master: 1 },
      { id: 4, type: 'food', team: -1 },
      { id: 5, type: 'tank', team: -1, allowedOnMinimap: false },
    ],
  });

C('minimapTeams: an undefined team matches nothing', 'sockets.js:1825',
  'Which is what the Delta\'s own seeding call does: `this.finder([])` leaves ' +
  'args[0] undefined, and `my.team === undefined` is false for every entity. So a ' +
  'socket\'s first team block is a diff against an empty list.',
  { call: 'minimapTeams', args: [], entities: [{ id: 1, type: 'tank', team: -1 }] });

C('minimapTeams: the position quantiser', 'sockets.js:1827',
  'floor(256 * v / dimension), clamped to a signed byte, over a room 8000 across -- ' +
  'so the clamp bites well before the wall, and a negative coordinate floors away ' +
  'from zero.',
  {
    call: 'minimapTeams', args: [-1],
    entities: [
      { id: 1, type: 'tank', team: -1, x: 0, y: 0 },
      { id: 2, type: 'tank', team: -1, x: 3999, y: -3999 },
      { id: 3, type: 'tank', team: -1, x: 99999, y: -99999 },
      { id: 4, type: 'tank', team: -1, x: -1, y: 1 },
      { id: 5, type: 'tank', team: -1, x: 31.25, y: -31.25 },
    ],
  });

// The colour branch, once per mode. minimapColor wins; otherwise groups, ffa or
// untagged clan give palette 10 -- note this builder uses 10 where
// minimapAllTeams uses 12 for the identical test.
for (const [label, config] of [
  ['teams', { mode: 'teams' }],
  ['ffa', { mode: 'ffa' }],
  ['groups', { mode: 'teams', groups: true }],
  ['ffa+tag', { mode: 'ffa', tag: true }],
  ['clan', { mode: 'clan' }],
  ['clan+tag', { mode: 'clan', tag: true }],
]) {
  C(`minimapTeams: the colour branch, ${label}`, 'sockets.js:1831',
    'The JS is `Config.groups || (Config.mode == "ffa" || Config.mode == "clan" && ' +
    '!Config.tag)`, and && binds tighter than ||, so the !tag term qualifies clan ' +
    'only: an ffa room takes the flat colour whether or not tag is on.',
    {
      call: 'minimapTeams', args: [-1], config,
      entities: [
        { id: 1, type: 'tank', team: -1, compiled: 'blue 0 1 0 false' },
        { id: 2, type: 'tank', team: -1, compiled: 'blue 0 1 0 false', minimapColor: '18' },
        { id: 3, type: 'tank', team: -1, compiled: 'blue 0 1 0 false', minimapColor: 0 },
      ],
    });
}

const out = {
  generatedBy: 'tools/gen-leaderboard-vectors.js',
  note: 'Every row is {id, data}. The builders were sliced out of sockets.js and run; ' +
        'nothing here is transcribed. topPlayerID is the side effect the two list ' +
        'builders leave on the room, and null means the case never wrote it.',
  roomWidth: ROOM_W,
  roomHeight: ROOM_H,
  classHPLabel: Class.hp.LABEL,
  classTagModeLabel: Class.tagMode.LABEL,
  classTagModeIndex: Class.tagMode.index,
  teamNames,
  cases,
};

const outPath = path.join(root, 'gen', 'leaderboard-vectors.json');
fs.mkdirSync(path.dirname(outPath), { recursive: true });
fs.writeFileSync(outPath, JSON.stringify(out, null, 2) + '\n');
console.log(`wrote ${outPath} (${cases.length} cases)`);
