// Measures where Go's math package and V8's disagree, bit for bit.
//
// This exists because of a failure in internal/jsutil's RNG golden test: after the
// hot arrays moved to float64, three of forty-five cases still differed — by exactly
// one unit in the last place, in values derived from Math.cos and Math.sin.
//
// That is not a rounding preference, it is a blocker. Go's sin and cos come from
// Cephes; V8's come from fdlibm. Neither is wrong — IEEE 754 does not require
// correctly-rounded transcendentals — but they are not the same function, and a
// physics simulation is chaotic: one ulp of divergence in a facing angle compounds
// until two entities collide in one implementation and miss in the other. No
// tolerance in cmd/simdiff fixes that, it only postpones it.
//
// So before writing anything, measure: which functions actually differ, over the
// argument ranges this game uses, and by how much.
//
// Values are exchanged as raw float64 bit patterns. A decimal round trip would be
// exact in principle and is exactly the kind of "in principle" that wastes a day.
//
// Output: gen/math-vectors.json

const path = require('path');
const fs = require('fs');

const buf = new DataView(new ArrayBuffer(8));
function bits(v) {
  buf.setFloat64(0, v);
  return buf.getBigUint64(0).toString(16).padStart(16, '0');
}
function num(h) {
  buf.setBigUint64(0, BigInt('0x' + h));
  return buf.getFloat64(0);
}

// Math.pow has to be captured twice, because Node's Math.pow is not V8's own pow.
// v8/src/numbers/ieee754.cc forwards it to the platform's std::pow whenever the V8
// flag use_std_math_pow is set, and that flag defaults to true. So the `pow` case
// below is the host C library — the Windows UCRT here, glibc on Linux — and two
// machines running the same Node can disagree. Turning the flag off gets V8's own
// fdlibm implementation, which is identical everywhere; that is captured as
// `pow_fdlibm` and is what internal/jsmath is held to. See docs/verification.md.
//
// The child is handed the parent's exact arguments on stdin rather than regenerating
// them, because positions() below calls Math.pow itself — regenerating in the child
// would move the inputs as well as the outputs.
if (process.argv.includes('--pow-only')) {
  const pairs = JSON.parse(fs.readFileSync(0, 'utf8'));
  process.stdout.write(JSON.stringify({
    fn: 'pow_fdlibm',
    arity: 2,
    samples: pairs.map(([a, b]) => ({ a, b, r: bits(Math.pow(num(a), num(b))) })),
  }));
  return;
}

// A deterministic generator, so re-running produces the same corpus.
function mulberry32(a) {
  return function () {
    a |= 0; a = a + 0x6D2B79F5 | 0;
    var t = Math.imul(a ^ a >>> 15, 1 | a);
    t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t;
    return ((t ^ t >>> 14) >>> 0) / 4294967296;
  };
}
const rand = mulberry32(20260907);

const TAU = Math.PI * 2;

// Ranges chosen to match how the server actually calls these, not to stress-test the
// library. Angles are the main one: facing accumulates without being normalised, so
// it wanders well outside [-PI, PI] and argument reduction starts to matter.
function angles(n) {
  const out = [];
  for (let i = 0; i < n; i++) {
    const r = rand();
    if (r < 0.4) out.push(rand() * TAU - Math.PI);       // the common case
    else if (r < 0.7) out.push(rand() * 200 - 100);       // an accumulated facing
    else if (r < 0.85) out.push(rand() * 2e6 - 1e6);      // a long-lived spinner
    else out.push(rand() * 1e10 - 5e9);                   // reduction territory
  }
  // Exact multiples and halves of PI, where reduction is most delicate.
  for (const k of [0, 1, 2, 3, 4, 6, 8, 100, 1e6]) {
    out.push(k * Math.PI, k * Math.PI / 2, -k * Math.PI, -k * Math.PI / 2);
  }
  return out;
}

function positions(n) {
  const out = [];
  for (let i = 0; i < n; i++) {
    const r = rand();
    if (r < 0.6) out.push(rand() * 32000 - 16000);  // room coordinates
    else if (r < 0.8) out.push(rand() * 200 - 100); // velocities
    else out.push((rand() - 0.5) * Math.pow(10, Math.floor(rand() * 20) - 8));
  }
  out.push(0, -0, 1, -1, 0.5, -0.5);
  return out;
}

const cases = [];
function unary(name, fn, args) {
  cases.push({
    fn: name,
    arity: 1,
    samples: args.map((x) => ({ a: bits(x), r: bits(fn(x)) })),
  });
}
function binary(name, fn, pairs) {
  cases.push({
    fn: name,
    arity: 2,
    samples: pairs.map(([x, y]) => ({ a: bits(x), b: bits(y), r: bits(fn(x, y)) })),
  });
}

const N = 3000;

// The random draws above never produce a zero, an infinity, a NaN, a subnormal or a
// value on an overflow threshold, and every one of these functions has a branch for
// them. A corpus without these passes while leaving all of that untested — which is
// the same trap the hashgrid fixture fell into.
const SPECIAL = [
  0, -0, Infinity, -Infinity, NaN, 1, -1, 0.5, -0.5, 2, -2,
  Number.MIN_VALUE, -Number.MIN_VALUE,             // smallest subnormal
  2.2250738585072014e-308, 1e-320,                 // smallest normal, a subnormal
  Number.MAX_VALUE, -Number.MAX_VALUE,
  1152921504606846976, -1152921504606846976,       // 2**60: past the medium reduction
  73786976294838206464, 1e300, -1e300,             // 2**66: past atan's last threshold
];

// Thresholds each routine actually branches on, so the branch is taken rather than
// merely present. Pi/4 and pi/2 are where sin and cos hand over to argument reduction;
// exp's pair are the overflow and underflow limits from fdlibm itself.
const TRIG_EDGES = [
  0.7853981633974483, -0.7853981633974483,         // pi/4
  1.5707963267948966, -1.5707963267948966,         // pi/2
  2.356194490192345, 823549.6645408,               // 3pi/4, ~2**19*(pi/2)
  6.123233995736766e-17, 1.4901161193847656e-08,   // below the 2**-27 kernel cutoffs
  3.725290298461914e-09,
];
const EXP_EDGES = [709.782712893384, 709.7827128933841, -745.1332191019411,
  -745.1332191019412, 1, -1, 0.34657359027997264, 1.0397207708399179];
const ASIN_EDGES = [0.975, -0.975, 0.9999999999999999, -0.9999999999999999,
  6.938893903907228e-18, 1.5, -1.5];

unary('sin', Math.sin, angles(N).concat(SPECIAL, TRIG_EDGES));
unary('cos', Math.cos, angles(N).concat(SPECIAL, TRIG_EDGES));
unary('tan', Math.tan, angles(N).concat(SPECIAL, TRIG_EDGES));
unary('atan', Math.atan, positions(N).concat(SPECIAL, [0.4375, -0.4375, 1.1875, 2.4375]));
unary('sqrt', Math.sqrt, positions(N).map(Math.abs).concat(SPECIAL));
unary('log', Math.log, positions(N).map((v) => Math.abs(v) + 1e-12).concat(SPECIAL));
unary('exp', Math.exp,
  positions(N).map((v) => Math.max(-700, Math.min(700, v / 100))).concat(SPECIAL, EXP_EDGES));
unary('acos', Math.acos,
  positions(N).map((v) => Math.max(-1, Math.min(1, v / 16000))).concat(SPECIAL, ASIN_EDGES));
unary('asin', Math.asin,
  positions(N).map((v) => Math.max(-1, Math.min(1, v / 16000))).concat(SPECIAL, ASIN_EDGES));
unary('cbrt', Math.cbrt, positions(N).concat(SPECIAL));

// Every sign and infinity combination, because atan2 picks its quadrant from the signs
// and has a dedicated return for each of the sixteen.
const atan2Corners = [];
for (const a of [0, -0, Infinity, -Infinity, NaN, 1, -1, 1e-300, -1e-300]) {
  for (const b of [0, -0, Infinity, -Infinity, NaN, 1, -1, 1e300, -1e300]) {
    atan2Corners.push([a, b]);
  }
}

const pos = positions(N), pos2 = positions(N);
binary('atan2', Math.atan2, pos.map((v, i) => [v, pos2[i]]).concat(atan2Corners));
binary('hypot', Math.hypot, pos.map((v, i) => [v, pos2[i]]).concat(atan2Corners));

// pow's exponents are what the game actually raises things to: 2 and 0.5 dominate,
// with a handful of others from the size and damage curves.
const powExponents = [2, 0.5, 1.5, 3, 0.25, 1 / 3, -1, -0.5, 0.7, 1.7];
const powPairs = [];
for (let i = 0; i < N; i++) {
  const base = Math.abs(pos[i % pos.length]);
  powPairs.push([base, powExponents[i % powExponents.length]]);
}
// pow has nineteen documented special cases and an over/underflow test; these reach
// them, including the ECMAScript-only one where (+-1) ** (+-Infinity) is NaN.
for (const a of [0, -0, Infinity, -Infinity, NaN, 1, -1, 2, -2, 0.5, -0.5, 1e300, 5e-324]) {
  for (const b of [0, -0, Infinity, -Infinity, NaN, 1, -1, 2, 3, -3, 0.5, 1024, -1075,
    1e300, 4503599627370496, 4503599627370497]) {
    powPairs.push([a, b]);
  }
}
binary('pow', Math.pow, powPairs);

// Re-run the same pairs through V8's own pow. See the note beside --pow-only above.
const { execFileSync } = require('child_process');
cases.push(JSON.parse(execFileSync(
  process.execPath,
  ['--no-use-std-math-pow', __filename, '--pow-only'],
  {
    input: JSON.stringify(cases[cases.length - 1].samples.map((s) => [s.a, s.b])),
    encoding: 'utf8',
    maxBuffer: 1 << 26,
  })));

const dest = path.resolve(__dirname, '..', 'gen', 'math-vectors.json');
fs.mkdirSync(path.dirname(dest), { recursive: true });
fs.writeFileSync(dest, JSON.stringify({
  generated: new Date().toISOString(),
  note: 'float64 bit patterns as 16 hex digits, big-endian',
  powNote: 'pow is this host’s std::pow (V8 flag use_std_math_pow, on by default); ' +
    'pow_fdlibm is V8’s own implementation, captured under --no-use-std-math-pow',
  node: process.version,
  platform: process.platform + '/' + process.arch,
  cases,
}, null, 2));

let total = 0;
for (const c of cases) total += c.samples.length;
console.log(`wrote ${cases.length} functions, ${total} samples -> gen/math-vectors.json`);
