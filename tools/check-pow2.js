// vector.js's length/lengthSquared getters use Math.pow(x, 2), not x * x.
// Those are not the same function. This reports how often they disagree, under the
// same fdlibm pow the harness forces (tools/fdlibm-pow.js), so the answer is about
// the server being ported rather than about this machine's libm.
require('./fdlibm-pow.js');

let differ = 0, total = 0;
let firstFew = [];

// A deterministic sweep rather than Math.random, so this is reproducible.
let seed = 12345;
const next = () => {
  seed = (seed * 1103515245 + 12345) & 0x7fffffff;
  return seed / 0x7fffffff;
};

for (let i = 0; i < 200000; i++) {
  // Velocities in the range the game actually uses, plus some extremes.
  const x = (next() - 0.5) * (i % 7 === 0 ? 1e-3 : 40);
  total++;
  const a = Math.pow(x, 2);
  const b = x * x;
  if (a !== b) {
    differ++;
    if (firstFew.length < 4) firstFew.push({ x, pow: a, mul: b, ulpDiff: a - b });
  }
}

// And the exact shape vector.js uses.
let lenDiffer = 0;
for (let i = 0; i < 100000; i++) {
  const x = (next() - 0.5) * 40, y = (next() - 0.5) * 40;
  const viaPow = Math.sqrt(Math.pow(x, 2) + Math.pow(y, 2));
  const viaMul = Math.sqrt(x * x + y * y);
  if (viaPow !== viaMul) lenDiffer++;
}

console.log(JSON.stringify({
  samples: total,
  powVsMulDiffer: differ,
  powVsMulPercent: (100 * differ / total).toFixed(3) + '%',
  lengthGetterDiffer: lenDiffer,
  lengthGetterPercent: (100 * lenDiffer / 100000).toFixed(3) + '%',
  examples: firstFew,
}, null, 2));
