// Records every Math.random() call made during definition loading, tagged with the
// source line that made it, in order.
//
// The count alone is not enough to fix the Go loader. The discarded makeRelic key
// draws and the draws whose values are actually kept are INTERLEAVED, so replaying
// the right number in the wrong order gives a matching draw count and different
// values everywhere downstream -- the worst kind of near-miss, because rngCalls
// agrees and simdiff's first check passes.
require('./fdlibm-pow.js');

const path = require('path');
const serverRoot = path.join(__dirname, '..', 'js-src', 'server');

const log = [];
const raw = Math.random;
Math.random = function () {
  // Frame 0 is Error, frame 1 is this wrapper, frame 2 is the real caller.
  const site = (new Error().stack || '').split('\n')[2] || '?';
  const m = site.match(/([^\\/(]+\.js):(\d+):\d+/);
  log.push(m ? m[1] + ':' + m[2] : site.trim());
  return raw();
};

require(path.join(serverRoot, 'loaders', 'loader.js'));
const start = log.length;
const { definitionCombiner } = require(path.join(serverRoot, 'lib', 'definitions', 'combined.js'));
new definitionCombiner({
  groups: path.join(serverRoot, 'lib', 'definitions', 'groups'),
  addonsFolder: path.join(serverRoot, 'lib', 'definitions', 'entityAddons'),
}).loadDefinitions();

const during = log.slice(start);

const bySite = {};
for (const s of during) bySite[s] = (bySite[s] || 0) + 1;

// Collapse the ordered list into runs, which is what the Go loader has to reproduce.
const runs = [];
for (const s of during) {
  if (runs.length && runs[runs.length - 1].site === s) runs[runs.length - 1].n++;
  else runs.push({ site: s, n: 1 });
}

console.log(JSON.stringify({
  totalDuringLoad: during.length,
  bySite,
  runCount: runs.length,
  firstFacilitatorsAt: during.findIndex(s => s.startsWith('facilitators')),
  lastGenericsAt: during.map((s,i)=>s.startsWith('generics')?i:-1).filter(i=>i>=0).pop(),
  firstGenericsAt: during.findIndex(s => s.startsWith('generics')),
  lastFacilitatorsAt: during.map((s,i)=>s.startsWith('facilitators')?i:-1).filter(i=>i>=0).pop(),
  firstRuns: runs.slice(0, 4),
  lastRuns: runs.slice(-3),
}, null, 2));
