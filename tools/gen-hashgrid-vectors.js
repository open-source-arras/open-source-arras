// Generates golden vectors for the broad-phase collision index by running the real
// JS HashGrid. The Go port is verified against these results rather than against
// anyone's reading of hashgrid.js.
//
// Output: gen/hashgrid-vectors.json

const path = require('path');
const fs = require('fs');

const HashGrid = require(path.resolve(__dirname, '..', 'js-src', 'server', 'lib', 'hashgrid.js'));

// The JS grid stores whole entities and reads .bond / .minX / .maxX / .minY / .maxY
// off them during query. Plain objects are enough to drive it.
function ent(id, minX, minY, maxX, maxY, bond) {
  return { id, minX, minY, maxX, maxY, bond: bond ? {} : null };
}

// A small deterministic PRNG so the fixtures are reproducible without depending on
// Math.random. Same mulberry32 the differential harness uses.
function mulberry32(a) {
  return function () {
    a |= 0; a = a + 0x6D2B79F5 | 0;
    var t = Math.imul(a ^ a >>> 15, 1 | a);
    t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t;
    return ((t ^ t >>> 14) >>> 0) / 4294967296;
  };
}

const scenarios = [];

function run(name, shift, entities, queries, note) {
  const grid = new HashGrid(shift);
  for (const e of entities) {
    grid.insert(e, e.minX, e.minY, e.maxX, e.maxY);
  }
  const results = queries.map(q => {
    const out = grid.query(q[0], q[1], q[2], q[3]);
    // query() returns a shared Set that the next call clears, so snapshot it now.
    return [...out].map(e => e.id).sort((a, b) => a - b);
  });
  scenarios.push({
    name, shift, note,
    entities: entities.map(e => ({
      id: e.id, minX: e.minX, minY: e.minY, maxX: e.maxX, maxY: e.maxY, bond: !!e.bond,
    })),
    queries,
    results,
  });
}

// Overlap is tested with strict < and >, so edge contact is not a hit.
run('edge contact', 6,
  [ent(0, 100, 100, 200, 200)],
  [[0, 100, 100, 200], [0, 100, 101, 200], [200, 100, 300, 200], [199, 100, 300, 200]],
  'hashgrid.js:35 uses strict inequalities');

// A box spanning many cells must still come back exactly once.
run('multi-cell dedup', 6,
  [ent(0, 0, 0, 500, 500), ent(1, 10, 10, 20, 20)],
  [[0, 0, 500, 500], [0, 0, 64, 64]],
  'the JS returns a Set, so no duplicates');

// Bonded entities sit in the grid but are never returned.
run('bonded excluded', 6,
  [ent(0, 0, 0, 50, 50, true), ent(1, 0, 0, 50, 50), ent(2, 10, 10, 40, 40, true)],
  [[0, 0, 50, 50]],
  'hashgrid.js:34 skips entity.bond');

// Negative coordinates exercise the ToInt32-then-arithmetic-shift behaviour of `>>`.
run('negative coordinates', 6,
  [ent(0, -200, -200, -100, -100), ent(1, -64, -64, 64, 64), ent(2, -1, -1, 1, 1)],
  [[-200, -200, -100, -100], [-70, -70, -60, -60], [-1, -1, 1, 1], [-300, -300, 300, 300]],
  'negative shifts floor toward -Infinity after truncating');

// Straddling the origin is where a sign error shows up.
run('straddling origin', 4,
  [ent(0, -10, -10, 10, 10), ent(1, -5, 5, 5, 15), ent(2, 5, -15, 15, -5)],
  [[-20, -20, 20, 20], [0, 0, 1, 1], [-16, -16, 0, 0]],
  'small cells so the straddle spans several');

// Different cell sizes must not change which pairs collide, only how they bucket.
for (const shift of [3, 6, 9]) {
  const rnd = mulberry32(1234 + shift);
  const es = [];
  // Dense on purpose: a sparse world produces almost no hits and would not
  // exercise the bucketing at all.
  for (let i = 0; i < 120; i++) {
    const x = Math.floor(rnd() * 700) - 100;
    const y = Math.floor(rnd() * 700) - 100;
    const w = 10 + Math.floor(rnd() * 70);
    const h = 10 + Math.floor(rnd() * 70);
    es.push(ent(i, x, y, x + w, y + h, rnd() < 0.15));
  }
  const qs = [];
  const qr = mulberry32(999 + shift);
  for (let i = 0; i < 25; i++) {
    const x = Math.floor(qr() * 700) - 100;
    const y = Math.floor(qr() * 700) - 100;
    qs.push([x, y, x + 120, y + 120]);
  }
  run(`randomised shift=${shift}`, shift, es, qs,
    'cell size changes bucketing, never the answer');
}

const out = {
  generated: new Date().toISOString(),
  source: 'js-src/server/lib/hashgrid.js',
  note: 'results are entity ids returned by query(), sorted ascending',
  scenarios,
};

const dest = path.resolve(__dirname, '..', 'gen', 'hashgrid-vectors.json');
fs.mkdirSync(path.dirname(dest), { recursive: true });
fs.writeFileSync(dest, JSON.stringify(out, null, 2));

const totalQueries = scenarios.reduce((a, s) => a + s.queries.length, 0);
console.log(`wrote ${scenarios.length} scenarios, ${totalQueries} queries -> gen/hashgrid-vectors.json`);
for (const s of scenarios) {
  const hits = s.results.reduce((a, r) => a + r.length, 0);
  console.log(`  ${s.name.padEnd(24)} ${s.entities.length} entities, ${s.queries.length} queries, ${hits} hits`);
}
