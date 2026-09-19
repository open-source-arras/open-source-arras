// Records what V8's Array.prototype.sort actually does with the
// `() => 0.5 - Math.random()` comparator the mothership and boss spawners use:
// the permutation it lands on and how many times it asked.
//
//   node tools/gen-v8sort-vectors.js > gen/v8sort-vectors.json
//
// internal/jsutil's TestSortRandomComparatorMatchesV8 reads the result. The point is
// that neither number is derivable: the comparator is random, so the question count
// depends on the answers, and the permutation is whatever TimSort's internal moves
// leave behind.
'use strict';

const det = require('./harness/determinism.js').install({ seed: 1 });

const out = [];
for (let n = 0; n <= 20; n++) {
  for (let trial = 0; trial < 20; trial++) {
    const arr = [];
    for (let i = 0; i < n; i++) arr.push(i);
    const before = det.rngCalls;
    arr.sort(() => 0.5 - Math.random());
    out.push({ n, trial, draws: det.rngCalls - before, result: arr });
  }
}
process.stdout.write(JSON.stringify({ seed: 1, cases: out }, null, 1));
