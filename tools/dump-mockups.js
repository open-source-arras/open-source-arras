// Dump every mockup the real server builds, as JSON, for internal/net to serve.
//
//   node tools/dump-mockups.js --out internal/net/data/mockups.json
//
// A mockup is the render recipe the browser client needs before it can draw
// anything: shape, colour, guns, turrets, props and the measured bounding
// circle, per class. Without one the client draws `global.missingno` -- the
// magenta placeholder -- for every entity on screen, and its death screen throws.
//
// This is a dump rather than a port, for the same reason tools/dump-rooms.js and
// tools/dump-definitions.js are. The builder is a second, parallel implementation
// of define() living in js-src/server/miscFiles/ (mockups.js, mockupEntity.js,
// mockup_dimentions.js) that shares no code with entity.js and resolves several
// fields differently -- SIZE, COLOR and the settings block are overwritten at
// every level of the PARENT chain with `??` defaults where entity.js guards them
// with `!= null`. Porting it means reproducing Welzl's minimum enclosing circle,
// a Fisher-Yates whose bias differs from the one in random.js, and a JSON encoder
// that drops undefined keys and passes NaN through as null. That is a large
// amount of geometry to get subtly wrong in a payload no differential covers,
// and none of it feeds the simulation: nothing the server computes depends on a
// mockup. Taking Node's own answer is both shorter and more exact.
//
// What the dump does NOT reproduce is the DRAW placement. The shipped config has
// load_all_mockups false, so the real server builds a mockup the first time a
// socket sees the class -- inside that socket's frame, mid-tick, spending
// randomness from the simulation stream (VARIES_IN_SIZE's randomRange, and one
// raw draw per endpoint in getDimensionsNormal's shuffle). Building them offline
// spends those draws offline. That is the same trade `load_all_mockups: true`
// makes on the real server, which builds all of them at boot before a tick has
// run; see docs/verification.md.
//
// Determinism: the draws above mean two runs of this tool disagree unless the
// generator is seeded. tools/harness/determinism.js is installed for that, so
// re-running it produces a byte-identical file.

'use strict';

require('./fdlibm-pow');
const fs = require('fs');
const path = require('path');

function parseArgs(argv) {
  const out = { out: null, seed: 1, quiet: false };
  const known = new Set(['out', 'seed', 'quiet']);
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i];
    if (!a.startsWith('--')) {
      console.error('dump-mockups: unexpected argument ' + a);
      process.exit(2);
    }
    const key = a.slice(2);
    if (!known.has(key)) {
      console.error('dump-mockups: unknown flag --' + key);
      console.error('known: --out --seed --quiet');
      process.exit(2);
    }
    if (key === 'quiet') { out.quiet = true; continue; }
    i++;
    if (i >= argv.length) {
      console.error('dump-mockups: --' + key + ' needs a value');
      process.exit(2);
    }
    out[key] = key === 'seed' ? Number(argv[i]) : argv[i];
  }
  return out;
}

const args = parseArgs(process.argv.slice(2));
if (!args.out) {
  console.error('dump-mockups: --out is required');
  process.exit(2);
}

const repoRoot = path.join(__dirname, '..');
const serverRoot = path.join(repoRoot, 'js-src', 'server');

require('./harness/determinism.js').install({ seed: args.seed });

// server.js:17-23, then :26-37. The same boot tools/harness/run.js does, minus
// the room: mockups need the definitions and nothing else.
const dotenv = require(path.join(serverRoot, 'lib', 'dotenv.js'));
const envFile = path.join(serverRoot, '.env');
if (fs.existsSync(envFile)) {
  const env = dotenv(fs.readFileSync(envFile).toString());
  for (const k in env) process.env[k] = env[k];
}
require(path.join(serverRoot, 'loaders', 'loader.js'));
new definitionCombiner({
  groups: path.join(serverRoot, 'lib', 'definitions', 'groups'),
  addonsFolder: path.join(serverRoot, 'lib', 'definitions', 'entityAddons'),
}).loadDefinitions();

// global.loadAllMockups (global.js:718) is `for (let k in Class) buildMockup(k,
// false)` and nothing else. It is spelled out here rather than called so each
// build's cost in randomness can be measured, which is the whole reason the
// draws array below exists: the shipped server has load_all_mockups off, so it
// builds a mockup the first time a socket sees the class -- mid-tick, out of the
// simulation's own generator. A port that reads a mockup out of a table instead
// spends none of those draws and drifts from Node the moment a client connects.
//
// So the count is recorded per mockup and internal/net burns it at the same
// point. The values are not needed: the mockup itself comes from this file.
const { buildMockup } = require(path.join(serverRoot, 'miscFiles', 'mockups.js'));
const det = require('./harness/determinism.js');
const draws = [];
if (!args.quiet) console.log('Started Loading All Mockups...');
for (const className in Class) {
  const before = det.rngCalls;
  const at = mockupData.length;
  buildMockup(className, false);
  // A build that pushed nothing is a class buildMockup skipped; keep the arrays
  // the same length as mockupData rather than assuming one push per class.
  if (mockupData.length > at) draws.push(det.rngCalls - before);
}
if (!args.quiet) console.log('Finished created ' + mockupData.length + ' MockupEntities.');
if (draws.length !== mockupData.length) {
  console.error('dump-mockups: measured ' + draws.length + ' builds for ' +
    mockupData.length + ' mockups');
  process.exit(1);
}

// mockupMap is index -> position in mockupData (global.js:14). The index is the
// key the client stores them under and the `M` message carries, and it is not
// always a plain number -- a split tank's is composite -- so it is kept as the
// string it already is.
const payload = {
  generatedBy: 'tools/dump-mockups.js',
  note: 'Output of js-src/server/loaders/global.js loadAllMockups(). Do not hand-edit; re-run the tool.',
  seed: args.seed,
  count: mockupData.length,
  // The order is buildMockup's, which is `for (let k in Class)` -- source
  // declaration order. Kept, because sockets.js:2220's bulk push walks
  // mockupData in exactly this order.
  mockups: mockupData,
  index: mockupMap,
  // Math.random draws buildMockup spends per mockup, in the same order. See the
  // loop above.
  draws,
  totalDraws: draws.reduce((a, b) => a + b, 0),
};

const outPath = path.isAbsolute(args.out) ? args.out : path.join(repoRoot, args.out);
fs.mkdirSync(path.dirname(outPath), { recursive: true });
fs.writeFileSync(outPath, JSON.stringify(payload));
if (!args.quiet) {
  const bytes = fs.statSync(outPath).size;
  console.log('wrote ' + outPath + ' (' + mockupData.length + ' mockups, ' + bytes + ' bytes)');
}
