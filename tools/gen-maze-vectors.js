// Pins internal/maze to the real MazeGenerator.
//
// This is the largest piece of the port that has never been checked against
// executing JavaScript. internal/maze is ~2,600 lines and its test suite compares the
// Go against dimensions "read straight off each run* method's map string" — that is,
// against the Go's own transcription of the JS, which is exactly the thing in doubt.
//
// It matters more than most: the maze decides where every wall in a room goes, so if
// it is wrong then every entity in the differential trace is in the wrong place from
// tick 0 and nothing downstream can be diagnosed.
//
// mazeGenerator.js has no requires, so it can be driven directly. Math.random is
// patched to mulberry32 first — the same generator internal/jsutil.Rand sources — so
// the Go side can replay the identical draw sequence and the two must agree square for
// square, not merely in aggregate.
//
// Output: gen/maze-vectors.json


// Math.pow in Node is the host's libm unless this flag is set, so reference
// output captured without it is specific to the machine that produced it.
// See tools/fdlibm-pow.js.
require('./fdlibm-pow');
const path = require('path');
const fs = require('fs');

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

const { MazeGenerator } = require(
  path.resolve(__dirname, '..', 'js-src', 'server', 'miscFiles', 'mazeGenerator.js'));

// Every type internal/maze's runTrial dispatch handles.
//
// Type 80 gets one seed rather than three because it is a 128x128 maze and a single
// placeMinimal takes about five minutes and four million random draws in Node. That
// is worth knowing on its own — a room configured for it stalls for minutes at boot —
// and it is recorded in the corpus, but three of them is fifteen minutes for very
// little extra coverage. It also goes last, so a run that is cut short still has
// every cheap type.
const TYPES = [0, 1, 2, 4, 8, 9, 10, 11, 12, 13, 14, 15, 16, 17, 18, 19, 20, 80];
const SEEDS = [1, 12345, 99999];
const EXPENSIVE = new Set([80]);

const dest = path.resolve(__dirname, '..', 'gen', 'maze-vectors.json');
fs.mkdirSync(path.dirname(dest), { recursive: true });

const cases = [];
// Written after every case, not once at the end: the first attempt at this corpus was
// killed by a timeout during the last type and lost forty-eight completed cases along
// with it.
function save() {
  fs.writeFileSync(dest, JSON.stringify({
    generated: new Date().toISOString(),
    source: 'js-src/server/miscFiles/mazeGenerator.js, Math.random patched to mulberry32',
    note: 'draws is the number of Math.random() calls placeMinimal consumed, construction included',
    cases,
  }, null, 2));
}

for (const type of TYPES) {
  for (const seed of (EXPENSIVE.has(type) ? SEEDS.slice(0, 1) : SEEDS)) {
    // A fresh generator per case, and the seed installed BEFORE construction: the
    // constructor takes a draw of its own for staticRand (mazeGenerator.js:147), and
    // erodeSym4 reuses it for the generator's whole lifetime. Seeding afterwards
    // would put the two sides one draw apart forever.
    calls = 0;
    Math.random = mulberry32(seed);

    let result = null, err = null;
    const started = Date.now();
    try {
      result = new MazeGenerator(type).placeMinimal();
    } catch (e) {
      err = String(e && e.message ? e.message : e);
    }
    const ms = Date.now() - started;

    cases.push({
      type,
      seed,
      err,
      ms,
      draws: calls,
      width: result ? result.width : null,
      height: result ? result.height : null,
      // squares can be null: placeMinimal returns null when 510 trials all fail.
      squares: result && result.squares
        ? result.squares.map((s) => [s.x, s.y, s.size])
        : null,
    });
    save();
    process.stdout.write(
      `type ${String(type).padStart(2)} seed ${String(seed).padStart(5)}: ` +
      (err ? `ERROR ${err}` :
        `${result.squares ? result.squares.length : 'null'} squares, ` +
        `${result.width}x${result.height}, ${calls} draws, ${ms}ms`) + '\n');
  }
}

const ok = cases.filter((c) => !c.err && c.squares).length;
console.log(`
wrote ${cases.length} cases (${ok} produced squares) -> gen/maze-vectors.json`);
