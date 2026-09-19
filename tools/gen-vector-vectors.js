// Pins internal/vmath to the real Vector class.
//
// The subtle part is not the arithmetic, it is that vector.js's x and y are GETTERS
// that scrub NaN to zero — and write the zero back. So `v.length` on a vector with a
// NaN component does not return NaN: it returns the length with that component
// treated as 0, and heals the vector on the way past. Every derived getter
// (lengthSquared, length, direction, isShorterThan) reads through them and inherits
// both halves of that.
//
// A Go port that computes from the raw fields returns NaN instead and propagates it
// through the physics. Reading the class and believing you have understood it is
// exactly how that ships, so this executes it.
//
// Output: gen/vector-vectors.json

const path = require('path');
const fs = require('fs');

const { Vector } = require(path.resolve(__dirname, '..', 'js-src', 'server', 'game', 'entities', 'vector.js'));

function num(v) {
  if (typeof v !== 'number') return v;
  // JSON.stringify(-0) is "0", so a negative zero would reach the Go side as +0 —
  // and atan2(-0, -0) is -PI where atan2(0, 0) is 0. Tag it.
  if (Object.is(v, -0)) return { __num: '-0' };
  if (Number.isFinite(v)) return v;
  if (Number.isNaN(v)) return { __num: 'nan' };
  return { __num: v > 0 ? 'inf' : '-inf' };
}

const NAN = 0 / 0;
const INF = 1 / 0;

const inputs = [
  [0, 0],
  [1, 0],
  [0, 1],
  [-1, 0],
  [0, -1],
  [3, 4],
  [-3, 4],
  [3, -4],
  [-3, -4],
  [0.1, 0.2],
  [1e-8, 1e-8],
  [1e8, 1e8],
  [1e154, 1e154], // squaring these overflows to Infinity
  [1e-200, 1e-200], // and these underflow to 0
  [Math.PI, Math.E],
  [-0, -0],
  [5, 0],
  [30, 40],
  // The NaN cases, which are the whole point.
  [NAN, 0],
  [0, NAN],
  [NAN, NAN],
  [NAN, 3],
  [4, NAN],
  // And the infinities, which the getters do NOT scrub — isNaN(Infinity) is false.
  [INF, 0],
  [0, INF],
  [INF, INF],
  [-INF, 1],
];

// isShorterThan is inclusive (`<= d * d`), so the boundary is worth testing on both
// sides of exactly.
const shorterThanDistances = [0, 1, 4.9999, 5, 5.0001, 50, INF, NAN];

const cases = inputs.map(([x, y]) => {
  // A fresh vector per reading: the getters mutate, so sharing one would let an
  // earlier reading heal the input for a later one.
  const fresh = () => new Vector(x, y);

  const shorterThan = shorterThanDistances.map((d) => ({
    d: num(d),
    result: fresh().isShorterThan(d),
  }));

  // Show the healing explicitly: read a derived getter, then look at the raw field.
  const healed = new Vector(x, y);
  const rawBefore = { X: num(healed.X), Y: num(healed.Y) };
  void healed.length;
  const rawAfter = { X: num(healed.X), Y: num(healed.Y) };

  const nulled = new Vector(x, y);
  nulled.null();

  return {
    in: { x: num(x), y: num(y) },
    lengthSquared: num(fresh().lengthSquared),
    length: num(fresh().length),
    direction: num(fresh().direction),
    getX: num(fresh().x),
    getY: num(fresh().y),
    shorterThan,
    rawBefore,
    rawAfter,
    afterNull: { X: num(nulled.X), Y: num(nulled.Y) },
  };
});

const dest = path.resolve(__dirname, '..', 'gen', 'vector-vectors.json');
fs.mkdirSync(path.dirname(dest), { recursive: true });
fs.writeFileSync(dest, JSON.stringify({
  generated: new Date().toISOString(),
  source: 'js-src/server/game/entities/vector.js',
  note: 'x and y are NaN-scrubbing getters; every derived getter reads through them',
  cases,
}, null, 2));

console.log(`wrote ${cases.length} cases -> gen/vector-vectors.json`);

// Report the cases where reading a getter changed the vector, since that is the
// behaviour most likely to be missed.
const healedCases = cases.filter((c) =>
  JSON.stringify(c.rawBefore) !== JSON.stringify(c.rawAfter));
console.log(`${healedCases.length} of ${cases.length} cases are mutated by reading .length:`);
for (const c of healedCases) {
  console.log(`  (${JSON.stringify(c.in.x)}, ${JSON.stringify(c.in.y)})` +
    ` -> (${JSON.stringify(c.rawAfter.X)}, ${JSON.stringify(c.rawAfter.Y)})`);
}
