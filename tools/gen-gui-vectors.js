// Generates golden vectors for the HUD block by running the REAL floppy,
// container, getstuff, update and publish out of sockets.js.
//
// Output: gen/gui-vectors.json
//
// sockets.js cannot be required: it is one 2,252-line class that reaches for
// Config, the entity table and the loader's globals at module scope. What it can
// do is give up the five methods that matter, which are self-contained apart
// from `util.error` and a handful of Config keys. This slices their source text
// out of the file, hangs it on a throwaway class and drives that with scripted
// bodies -- so the values below are the shipped code's answers, not a reading of
// it.
//
// The slice is bounded by the two method signatures either side of the block. If
// somebody moves or renames them this fails loudly instead of quietly capturing
// the wrong lines.

const path = require('path');
const fs = require('fs');

const root = path.resolve(__dirname, '..');
const src = fs.readFileSync(path.join(root, 'js-src', 'server', 'game', 'network', 'sockets.js'), 'utf8');

const FIRST = '    floppy(value = null) {';
const LAST = '    initalizePlayer(epackage, socket) {';
const from = src.indexOf(FIRST);
const to = src.indexOf(LAST);
if (from < 0 || to < 0 || to <= from) {
  throw new Error('cannot find the gui methods in sockets.js: the boundaries moved');
}
const body = src.slice(from, to);
for (const name of ['floppy(', 'container(', 'getstuff(', 'update(gui)', 'publish(gui)', 'newgui =']) {
  if (!body.includes(name)) throw new Error(`the sliced region is missing ${name}`);
}

// Config keys the sliced code reads. daily_tank is deliberately absent: it
// reaches Config as a server-list property (game.js:102) and this port boots
// from a gamemode, so the else arm at sockets.js:943 is the live one.
const Config = {
  tier_multiplier: 15,
  spawn_class: 'basic',
};
const util = { error: () => {} };
const globalStub = { fps: 'Unknown', gameManager: { roomSpeed: 1 } };

const GuiBits = new Function('Config', 'util', 'global', `
  return class GuiBits {
${body}  };
`)(Config, util, globalStub);

const bits = new GuiBits();

// A scripted skill. The three methods the HUD calls are the whole interface, and
// scripting them is what isolates the floppy plumbing from skills.js -- which
// internal/entity already pins on its own.
function makeSkill(state) {
  return {
    get score() { return state.score; },
    get points() { return state.points; },
    get level() { return state.level; },
    title: stat => state.titles[stat],
    cap: (stat, real = false) => (real ? state.realCaps[stat] : state.caps[stat]),
    amount: stat => state.amounts[stat],
  };
}

const STATS = ['atk', 'hlt', 'spd', 'str', 'pen', 'dam', 'rld', 'mob', 'rgn', 'shi'];
const TITLES = {
  rld: 'Reload', pen: 'Bullet Penetration', str: 'Bullet Health', dam: 'Bullet Damage',
  spd: 'Bullet Speed', shi: 'Shield Capacity', atk: 'Body Damage', hlt: 'Max Health',
  rgn: 'Shield Regeneration', mob: 'Movement Speed',
};

function skillState(over = {}) {
  const caps = {}, realCaps = {}, amounts = {};
  for (const s of STATS) {
    caps[s] = over.cap === undefined ? 9 : over.cap;
    realCaps[s] = over.realCap === undefined ? 9 : over.realCap;
    amounts[s] = over.amounts && over.amounts[s] !== undefined ? over.amounts[s] : 0;
  }
  return {
    score: over.score || 0,
    points: over.points || 0,
    level: over.level || 0,
    titles: TITLES,
    caps, realCaps, amounts,
  };
}

function makeBody(over = {}) {
  const state = skillState(over.skill || {});
  const b = {
    id: over.id === undefined ? 7 : over.id,
    index: over.index === undefined ? '12' : over.index,
    skill: makeSkill(state),
    killCount: { solo: 0, assists: 0, bosses: 0, ...(over.killCount || {}) },
    upgrades: over.upgrades || [],
    upgradePending: over.upgradePending || null,
    acceleration: over.acceleration === undefined ? 1.5 : over.acceleration,
    topSpeed: over.topSpeed === undefined ? 8 : over.topSpeed,
    label: over.label === undefined ? 'Basic' : over.label,
    settings: { canSeeInvisible: over.canSeeInvisible || false },
    defs: over.defs || ['basic'],
    socket: { status: { daily_tank_watched_ad: false } },
    skippedUpgrades: undefined,
  };
  if (over.rerootUpgradeTree !== undefined) b.rerootUpgradeTree = over.rerootUpgradeTree;
  b.__state = state;
  return b;
}

// JSON cannot carry NaN, and the fps field is NaN on every frame of a server
// whose speed loop has not run -- which is every frame of this port.
function encode(v) {
  if (typeof v === 'number' && Number.isNaN(v)) return { __num: 'nan' };
  return v;
}

const cases = [];

// snapshot is exactly the set of body fields update(gui) reads (sockets.js:907-953),
// flattened. The Go test replays these rather than re-scripting the same bodies,
// so there is one description of each case and it is this one.
//
// `root` is null when rerootUpgradeTree is undefined and a string when it is set,
// which is the distinction Go cannot make from "" alone.
function snapshot(b, player) {
  return {
    teamColor: player.teamColor,
    bodyID: b.id,
    index: b.index,
    score: b.skill.score,
    solo: b.killCount.solo,
    assists: b.killCount.assists,
    bosses: b.killCount.bosses,
    points: b.skill.points,
    level: b.skill.level,
    upgradePending: !!b.upgradePending,
    upgrades: b.upgrades.map(u => ({
      branch: u.branch,
      // null rather than a dropped key: undefined and "" reach the wire as
      // different strings, so the Go side has to be able to tell them apart.
      branchLabel: u.branchLabel === undefined ? null : u.branchLabel,
      index: u.index,
      level: u.level,
    })),
    titles: STATS.map(s => b.skill.title(s)),
    caps: STATS.map(s => b.skill.cap(s)),
    softCaps: STATS.map(s => b.skill.cap(s, true)),
    amounts: STATS.map(s => b.skill.amount(s)),
    accel: b.acceleration,
    topSpeed: b.topSpeed,
    root: b.rerootUpgradeTree === undefined ? null : b.rerootUpgradeTree,
    class: b.label,
    canSeeInvisible: b.settings.canSeeInvisible,
    // Config.daily_tank is unset above, so sockets.js:943 is the live arm.
    dailyTankJSON: JSON.stringify([false]),
  };
}

// One case is a fresh gui plus a list of frames. Each frame mutates the body,
// snapshots it, and then does exactly what sockets.js:1643-1655 does: update,
// then publish.
function C(name, over, frames, note) {
  const player = { body: makeBody(over), teamColor: over.teamColor || '#00b0e1' };
  const gui = bits.newgui(player);
  const out = [];
  for (const step of frames) {
    step(player.body, player.body.__state, player);
    const input = snapshot(player.body, player);
    gui.update();
    out.push({ input, published: gui.publish().map(encode) });
  }
  cases.push({
    name,
    note,
    frames: out,
    skippedUpgrades: player.body.skippedUpgrades === undefined
      ? null
      : Array.from(player.body.skippedUpgrades, x => (x === undefined ? 0 : x)),
  });
}

const noop = () => {};

// --- the shape of a first frame, and of the frames after it ---
C('first frame then two idle ones', {}, [noop, noop, noop],
  'everything on frame 1, then mask 0 forever -- except fps, which re-flags on ' +
  'every frame because global.fps is "Unknown" and NaN never equals itself');

// --- one field at a time ---
C('score changes', {}, [
  noop,
  (b, st) => { st.score = 1200; },
  (b, st) => { st.score = 1200; },
  (b, st) => { st.score = 1201; },
]);

C('points and level', {}, [
  noop,
  (b, st) => { st.points = 3; },
  (b, st) => { st.level = 15; },
]);

C('class and label change together on an upgrade', {}, [
  noop,
  b => { b.label = 'Twin'; b.index = '42'; },
]);

C('acceleration and top speed', {}, [
  noop,
  b => { b.acceleration = 2.25; },
  b => { b.topSpeed = 9.5; b.acceleration = 2.25; },
]);

C('canSeeInvisible toggles', {}, [
  noop,
  b => { b.settings.canSeeInvisible = true; },
  b => { b.settings.canSeeInvisible = false; },
]);

// --- the stats container: one stat moving re-sends all thirty values ---
C('one cap moves, the whole table is re-sent', {}, [
  noop,
  (b, st) => { st.caps.atk = 10; },
  (b, st) => { st.caps.atk = 10; },
], 'container() is all-or-nothing by design (sockets.js:857-870)');

C('soft cap and real cap differ', { skill: { cap: 6, realCap: 9 } }, [noop]);

// --- getstuff: the 20-character hex string, high stat first ---
C('skill amounts pack into hex', {
  skill: { amounts: { atk: 1, hlt: 2, spd: 3, str: 4, pen: 5, dam: 6, rld: 7, mob: 8, rgn: 9, shi: 10 } },
}, [noop], 'reverse order, two hex digits each (sockets.js:891-903)');

C('a skill amount over 255 overflows its two digits', {
  skill: { amounts: { atk: 300 } },
}, [noop], 'padStart(2) does not truncate, so this is three characters');

// --- the upgrade menu ---
const menu = [
  { branch: 0, branchLabel: 'weapon', index: '101', level: 15 },
  { branch: 0, branchLabel: 'weapon', index: '102', level: 30 },
  { branch: 1, branchLabel: 'body', index: '201', level: 15 },
  { branch: 1, branchLabel: 'body', index: '202', level: 45 },
];
C('upgrades appear as the level rises', { upgrades: menu }, [
  noop,
  (b, st) => { st.level = 15; },
  (b, st) => { st.level = 30; },
  (b, st) => { st.level = 45; },
]);

C('a pending upgrade empties the menu', { upgrades: menu, skill: { level: 45 } }, [
  noop,
  b => { b.upgradePending = { number: 0 }; },
  b => { b.upgradePending = null; },
]);

// The sparse-branch case: skippedUpgrades grows with holes, and a later skip in
// a lower branch increments the LAST element rather than its own.
C('sparse branches leave holes in skippedUpgrades', {
  upgrades: [
    { branch: 3, branchLabel: 'a', index: '301', level: 99 },
    { branch: 1, branchLabel: 'b', index: '302', level: 99 },
    { branch: 5, branchLabel: 'c', index: '303', level: 99 },
    { branch: 2, branchLabel: 'd', index: '304', level: 99 },
  ],
}, [noop], 'sockets.js:926-931 indexes length-1, not branch');

// No definition in the shipped set defines BRANCH_LABEL, so this -- not the
// three-part string with a label in it -- is what every real upgrade row looks
// like. JS concatenation spells undefined out; app.js:3869 tests for the word.
C('an upgrade with no branch label spells it "undefined"', {
  skill: { level: 15 },
  upgrades: [
    { branch: 0, index: '791', level: 15 },
    { branch: 1, branchLabel: 'body', index: '201', level: 15 },
  ],
}, [noop], 'branchLabel is undefined on every row in the dump');

C('branch zero counts up in place', {
  upgrades: [
    { branch: 0, branchLabel: 'a', index: '401', level: 99 },
    { branch: 0, branchLabel: 'a', index: '402', level: 99 },
  ],
}, [noop]);

// --- rerootUpgradeTree: undefined is not "" ---
C('no reroot means the field never appears', {}, [noop, noop]);
C('a reroot appears once', { rerootUpgradeTree: 'dreadnought_dreadsV1' }, [noop, noop]);
C('an empty-string reroot does publish', { rerootUpgradeTree: '' }, [noop],
  'REROOT_UPGRADE_TREE: [] resolves to "" and "" != null, so it goes out');

// --- the label branch carries the colour and the body id with it ---
C('team colour alone never reaches the client', { teamColor: '#00b0e1' }, [
  noop,
  (b, st, p) => { p.teamColor = '#f14e54'; },
  (b, st, p) => { p.teamColor = '#f14e54'; b.label = 'Sniper'; },
], 'the colour floppy publishes and clears whether or not the label does ' +
   '(sockets.js:979-984), and the fallback reads the live value');

const out = {
  generatedBy: 'tools/gen-gui-vectors.js',
  source: 'js-src/server/game/network/sockets.js',
  note: 'Each frame carries the body state update() read and the publish() array it ' +
        'produced. Element 0 of published is the bit mask; the rest are payloads in ' +
        'ascending bit order. skippedUpgrades is what update() wrote back onto the ' +
        'body, with JS array holes flattened to 0 the way entity.js:888 reads them.',
  statOrder: STATS,
  cases,
};

const dest = process.argv.includes('--out')
  ? process.argv[process.argv.indexOf('--out') + 1]
  : path.join(root, 'gen', 'gui-vectors.json');
fs.mkdirSync(path.dirname(dest), { recursive: true });
fs.writeFileSync(dest, JSON.stringify(out, null, 2) + '\n');
console.log(`wrote ${cases.length} cases to ${dest}`);
