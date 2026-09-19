// Emits Math.PI * 2 * x for the real mulberry32 sequence, as exact hex float bits,
// so the Go side can compare bit patterns rather than decimal renderings.
require('./fdlibm-pow.js');

function mulberry32(a) {
  return function () {
    a |= 0; a = (a + 0x6D2B79F5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

const rand = mulberry32(1);
const buf = new DataView(new ArrayBuffer(8));
const bits = v => { buf.setFloat64(0, v); return buf.getBigUint64(0).toString(16).padStart(16, '0'); };

const out = [];
for (let i = 0; i < 500; i++) {
  const x = rand();
  const a = Math.PI * 2 * x;
  const TAU = 2 * Math.PI;
  const wrapped = (a % TAU + TAU) % TAU;
  out.push({ i, x: bits(x), angle: bits(a), wrapped: bits(wrapped) });
}
const fs = require('fs'), path = require('path');
const dest = path.join(__dirname, '..', 'gen', 'angle-vectors.json');
fs.writeFileSync(dest, JSON.stringify({ generated: new Date().toISOString(),
  source: 'Math.PI * 2 * mulberry32(1)(), and the (x % TAU + TAU) % TAU wrap runFace applies',
  note: 'float64 bit patterns as hex; decimal rendering hides last-place differences',
  cases: out }, null, 1));
console.log('wrote ' + dest + ' (' + out.length + ' cases)');
