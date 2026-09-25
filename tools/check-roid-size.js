// rocks.js's placeRoids computes `checkRadius = 10 + def.SIZE` from the RAW Class
// object -- a plain field read, not a resolved definition. This reports whether the
// roid definitions actually carry their own SIZE, because if they inherit it through
// PARENT then the JS reads undefined and checkRadius is NaN.
require('./fdlibm-pow.js');

const path = require('path');
const serverRoot = path.join(__dirname, '..', 'js-src', 'server');

const realLog = console.log;
console.log = () => {};
require(path.join(serverRoot, 'loaders', 'loader.js'));
const { definitionCombiner } = require(path.join(serverRoot, 'lib', 'definitions', 'combined.js'));
new definitionCombiner({
  groups: path.join(serverRoot, 'lib', 'definitions', 'groups'),
  addonsFolder: path.join(serverRoot, 'lib', 'definitions', 'entityAddons'),
}).loadDefinitions();
console.log = realLog;

const rows = [];
for (const n of ['rock', 'stone', 'gravel', 'pumpkin']) {
  const c = global.Class[n];
  if (!c) { rows.push({ name: n, missing: true }); continue; }
  rows.push({
    name: n,
    ownSIZE: Object.prototype.hasOwnProperty.call(c, 'SIZE') ? c.SIZE : '<not own>',
    readSIZE: c.SIZE,
    PARENT: c.PARENT,
    checkRadius: 10 + c.SIZE,
    checkRadiusIsNaN: Number.isNaN(10 + c.SIZE),
    VARIES_IN_SIZE: c.VARIES_IN_SIZE,
  });
}
console.log(JSON.stringify(rows, null, 2));
