// Counts the Math.random() draws that definition loading consumes, and how many of
// them come from makeRelic's unique-key hack (facilitators.js:1337-1338).
//
// makeRelic mints its two anonymous Class keys with Math.random().toString(36). The
// keys are throwaway, but the draws are not: they advance the one global stream every
// later random number in the server comes from. A port that materialises the same
// definitions from pre-dumped data without replaying those draws produces an
// identical definition table and a permanently offset RNG stream.
require('./fdlibm-pow.js');

const path = require('path');
const serverRoot = path.join(__dirname, '..', 'js-src', 'server');

let calls = 0;
const raw = Math.random;
Math.random = function () { calls++; return raw(); };

require(path.join(serverRoot, 'loaders', 'loader.js'));

const before = calls;
const { definitionCombiner } = require(path.join(serverRoot, 'lib', 'definitions', 'combined.js'));
new definitionCombiner({
  groups: path.join(serverRoot, 'lib', 'definitions', 'groups'),
  addonsFolder: path.join(serverRoot, 'lib', 'definitions', 'entityAddons'),
}).loadDefinitions();
const after = calls;

// makeRelic's keys are Math.random().toString(36), i.e. "0.xxxxx".
const relicKeys = Object.keys(global.Class).filter(k => /^0\./.test(k));

console.log(JSON.stringify({
  drawsBeforeLoad: before,
  drawsDuringLoad: after - before,
  totalDefinitions: Object.keys(global.Class).length,
  relicKeyCount: relicKeys.length,
  makeRelicCalls: relicKeys.length / 2,
  drawsFromMakeRelic: relicKeys.length,
  drawsFromElsewhere: (after - before) - relicKeys.length,
  sampleRelicKeys: relicKeys.slice(0, 3),
}, null, 2));
