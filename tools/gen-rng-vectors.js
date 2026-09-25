// Proves the Go RNG and the harness's patched JS RNG are the same stream.
//
// The differential harness replaces the JS server's Math.random with mulberry32.
// internal/jsutil.Rand draws from the same generator. That is only useful if the
// helper functions built on top also consume the SAME NUMBER of draws in the same
// order — otherwise the two sides stay in step for a while and then silently part
// company, which is the hardest kind of divergence to find.
//
// So this records both the value and the cumulative draw count after every call.
//
// Output: gen/rng-vectors.json

const path = require('path');
const fs = require('fs');

// Must be installed before random.js is required, and it reads Math.random at call
// time anyway, so this covers both.
let calls = 0;
function mulberry32(a) {
  return function () {
    calls++;
    a |= 0; a = a + 0x6D2B79F5 | 0;
    var t = Math.imul(a ^ a >>> 15, 1 | a);
    t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t;
    return ((t ^ t >>> 14) >>> 0) / 4294967296;
  };
}

const SEED = 12345;
Math.random = mulberry32(SEED);

const ran = require(path.resolve(__dirname, '..', 'js-src', 'server', 'lib', 'random.js'));

const steps = [];
function step(name, fn) {
  const before = calls;
  let value, err = null;
  try {
    value = fn();
  } catch (e) {
    err = String(e && e.message ? e.message : e);
  }
  steps.push({
    name,
    value: serialise(value),
    drawsBefore: before,
    drawsAfter: calls,
    draws: calls - before,
    err,
  });
}

function serialise(v) {
  if (typeof v === 'number') {
    if (Number.isNaN(v)) return { __num: 'nan' };
    if (!Number.isFinite(v)) return { __num: v > 0 ? 'inf' : '-inf' };
  }
  return v;
}

// A scripted sequence, deliberately interleaved. Running each function in its own
// block would hide an off-by-one in draw consumption; interleaving means a single
// extra or missing draw shifts everything after it and the test says exactly where.
const arr = [10, 20, 30, 40, 50];

for (let round = 0; round < 3; round++) {
  step('random(100)', () => ran.random(100));
  step('randomAngle()', () => ran.randomAngle());
  step('randomRange(-5,5)', () => ran.randomRange(-5, 5));
  step('irandom(10)', () => ran.irandom(10));
  step('irandomRange(3,9)', () => ran.irandomRange(3, 9));
  step('chance(0.5)', () => ran.chance(0.5));
  step('dice(6)', () => ran.dice(6));
  step('choose(arr)', () => ran.choose(arr));
  // Variable-draw functions: these are where a mismatched implementation shows up,
  // because the number of draws depends on the values drawn.
  step('gauss(0,1)', () => ran.gauss(0, 1));
  step("gaussInverse(0,10,3)", () => ran.gaussInverse(0, 10, 3));
  step('gaussRing(5,1)', () => ran.gaussRing(5, 1));
  step('pointInUnitCircle()', () => ran.pointInUnitCircle());
  step('shuffle(arr)', () => ran.shuffle(arr));
  step('chooseN(arr,3)', () => ran.chooseN(arr, 3));
  step('chooseChance(1,2,3)', () => ran.chooseChance(1, 2, 3));
}

const out = {
  generated: new Date().toISOString(),
  source: 'js-src/server/lib/random.js, with Math.random patched to mulberry32',
  seed: SEED,
  note: 'draws is the number of Math.random() calls the function consumed',
  totalDraws: calls,
  steps,
};

const dest = path.resolve(__dirname, '..', 'gen', 'rng-vectors.json');
fs.mkdirSync(path.dirname(dest), { recursive: true });
fs.writeFileSync(dest, JSON.stringify(out, null, 2));

console.log(`wrote ${steps.length} steps, ${calls} total draws -> gen/rng-vectors.json`);
const variable = {};
for (const s of steps) {
  (variable[s.name] ||= new Set()).add(s.draws);
}
console.log('draws consumed per call:');
for (const [name, set] of Object.entries(variable)) {
  const list = [...set].sort((a, b) => a - b);
  console.log(`  ${name.padEnd(22)} ${list.join(', ')}${list.length > 1 ? '   <- variable' : ''}`);
}
