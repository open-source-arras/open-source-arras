// Generates golden vectors for the per-client view layer (internal/net/view.go).
//
// Like tools/gen-message-vectors.js, the JS is sliced out of the shipping
// sockets.js and evaluated, so the expected values come from the real
// implementation rather than a transcription. That covers flatten(),
// getInvisEntityAlpha(), perspective() and the two field-of-view checks.
//
// The camera() implementations are sliced out of entities/*.js the same way and
// driven against hand-built plain objects, because a real Entity cannot be
// constructed without the whole game.
//
// Output: gen/view-vectors.json


// Math.pow in Node is the host's libm unless this flag is set, so reference
// output captured without it is specific to the machine that produced it.
// See tools/fdlibm-pow.js.
require('./fdlibm-pow');
const path = require('path');
const fs = require('fs');

const root = path.resolve(__dirname, '..');
const src = f => fs.readFileSync(path.join(root, 'js-src', 'server', f), 'utf8');

const socketsSrc = src(path.join('game', 'network', 'sockets.js'));

// --- slicing ---------------------------------------------------------------

function sliceBlock(text, marker) {
  const start = text.indexOf(marker);
  if (start === -1) throw new Error(`marker not found: ${marker}`);
  let i = text.indexOf('{', start);
  let depth = 0;
  for (let j = i; j < text.length; j++) {
    const c = text[j];
    if (c === '{') depth++;
    else if (c === '}') {
      depth--;
      if (depth === 0) return text.slice(start, j + 1);
    }
  }
  throw new Error(`unbalanced braces after ${marker}`);
}

// perspective builds a Color and reads Config and getTeamColor. Both are
// globals in the real server; here they are stubs that record what was asked
// for, so the vectors say which team colour the branch chose.
let Config = {
  random_body_colors: false,
  groups: false,
  mode: 'ffa',
  tag: false,
};
global.Config = Config;
class Color {
  constructor(base) { this.compiled = `${base} 0 1 0 false`; }
}
global.Color = Color;
global.getTeamColor = team => `team${team}`;
global.global = global;

const sm = eval(`({
  ${sliceBlock(socketsSrc, '    flatten(data) {')},
  ${sliceBlock(socketsSrc, '    getInvisEntityAlpha(player, other, canSeeInvisible = false) {')},
  ${sliceBlock(socketsSrc, '    perspective(e, player, data) {')},
})`);

// The two visibility predicates. `check` is the closure inside eyes(); the
// nearby refresh writes the same maths with the constant folded in first, and
// the detailed check uses a different aspect ratio again. All three are lifted
// verbatim from sockets.js:1547, :1570 and :1597.
const check = (camera, obj, arenaClosed) => {
  let fov = arenaClosed ? 1.6 : 1;
  return Math.abs(obj.x - camera.x) < camera.fov * fov + 1.5 * obj.size + 100 &&
    Math.abs(obj.y - camera.y) < camera.fov * fov * 0.5625 + 1.5 * obj.size + 100;
};
const broadCheck = (camera, entity, arenaClosed) => {
  const camFovBroad = camera.fov * (arenaClosed ? 1.6 : 1);
  const camXBound = camFovBroad + 100;
  const camYBound = camFovBroad * 0.5625 + 100;
  return Math.abs(entity.x - camera.x) < camXBound + 1.5 * entity.size &&
    Math.abs(entity.y - camera.y) < camYBound + 1.5 * entity.size;
};
const fineCheck = (camera, entity) => {
  const camX = camera.x, camY = camera.y, camFov = camera.fov;
  const limitDistance = 1.5;
  const fovDiv = camFov / limitDistance;
  const fovDivY = fovDiv * (9 / 13);
  return Math.abs(entity.x - camX) < fovDiv + 1.5 * entity.size &&
    Math.abs(entity.y - camY) < fovDivY + 1.5 * entity.size;
};
// The fov easing at sockets.js:1560.
const easeFov = (fov, fovNow) => fov + Math.max((fovNow - fov) / 30, fovNow - fov);

// lazyRealSizes, subFunctions.js:43-58.
let lazyRealSizes = [1, 1, 1];
for (let i = 3; i < 17; i++) {
  const circum = (2 * Math.PI) / i;
  lazyRealSizes.push(Math.sqrt(circum * (1 / Math.sin(circum))));
}
// subFunctions.js:50 wraps the table in a Proxy that fills in any missing index
// on demand, so a shape past 16 is a real value rather than undefined.
lazyRealSizes = new Proxy(lazyRealSizes, {
  get: function (arr, i) {
    if (!(i in arr) && !isNaN(i)) {
      const circum = (2 * Math.PI) / i;
      arr[i] = Math.sqrt(circum * (1 / Math.sin(circum)));
    }
    return arr[i];
  },
});
const realSizeOf = (size, shape) => size * lazyRealSizes[Math.floor(Math.abs(shape))];

// --- serialisation ---------------------------------------------------------

const _f64 = new DataView(new ArrayBuffer(8));
function f64bits(v) { _f64.setFloat64(0, v, false); return Buffer.from(_f64.buffer).toString('hex'); }
function num(v) {
  if (typeof v !== 'number') return v;
  if (Number.isNaN(v)) return { __num: 'nan', bits: f64bits(v) };
  if (v === Infinity) return { __num: 'inf' };
  if (v === -Infinity) return { __num: '-inf' };
  if (Object.is(v, -0)) return { __num: '-0' };
  return v;
}
function ser(v) {
  if (v === null || v === undefined) return null;
  if (Array.isArray(v)) return v.map(ser);
  if (typeof v === 'number') return num(v);
  if (typeof v === 'object') {
    const o = {};
    for (const k of Object.keys(v)) o[k] = ser(v[k]);
    return o;
  }
  return v;
}

// --- fixtures --------------------------------------------------------------

const gun = () => ({
  time: 4321, power: 2.5, color: '16 0 1 0 false', alpha: 1, strokeWidth: 3.5,
  borderless: false, drawFill: true, drawAbove: false, length: 20, width: 12.5,
  aspect: 1, angle: 0, direction: 0, offset: 0, layer: 0,
});

const fullPhoto = (over = {}) => Object.assign({
  type: 0x02 | 0x04, invuln: false, id: 7, index: '0',
  x: -1000.5, y: 2000.25, vx: 0, vy: 0,
  size: 25, realSize: realSizeOf(25, 4),
  health: 0.5, shield: 0.25, alpha: 1,
  facing: 3.14159, vfacing: 0, twiggle: false, layer: 5,
  color: '10 0 1 0 false', borderless: false, drawFill: true,
  name: '#ffffffplayer', score: 12345,
  guns: [gun()], turrets: [],
}, over);

const bulletPhoto = (over = {}) => Object.assign({
  type: 0x10, id: 4242, index: '9', x: 100.5, y: -200.25, vx: 3.5, vy: -1.25,
  size: 8, realSize: realSizeOf(8, 3), health: 1, shield: 0, alpha: 1,
  facing: 0.75, vfacing: 0.01, layer: 0, color: '6 0 1 0 false',
  guns: [], turrets: [],
}, over);

const turretPhoto = (over = {}) => Object.assign({
  type: 0x01, index: '13', size: 10.5, realSize: realSizeOf(10.5, 6),
  facing: 1.25, angle: 0, direction: 0, offset: 0, sizeFactor: 12,
  mirrorMasterAngle: false, layer: 0, color: '12 0 1 0 false',
  guns: [], turrets: [],
}, over);

const viewer = (over = {}) => ({
  body: Object.assign({
    id: 1, x: 0, y: 0, team: -1,
    settings: { canSeeInvisible: false },
  }, over.body || {}),
  command: Object.assign({ autospin: false }, over.command || {}),
  teamColor: over.teamColor === undefined ? '10 0 1 0 false' : over.teamColor,
});

const subject = (over = {}) => Object.assign({
  alpha: 1, limited: false,
  master: { id: 99 }, source: { team: -2 },
  x: 0, y: 0, settings: { fullyInvisible: false },
}, over);

// --- collection ------------------------------------------------------------

const out = {
  flatten: [],
  invisAlpha: [],
  perspective: [],
  perspectiveLeak: [],
  fov: [],
  easeFov: [],
  realSize: [],
};

function flattenCase(name, site, photo) {
  out.flatten.push({ name, site, photo: ser(photo), flat: ser(sm.flatten(photo)) });
}

flattenCase('full', 'sockets.js:1322', fullPhoto());
flattenCase('full unnamed', 'sockets.js:1322', fullPhoto({ type: 0x02 }));
flattenCase('full with turret', 'sockets.js:1356', fullPhoto({ turrets: [turretPhoto()] }));
flattenCase('bullet', 'sockets.js:1305', bulletPhoto());
flattenCase('turret', 'sockets.js:1291', turretPhoto());
flattenCase('turret nested', 'sockets.js:1356', turretPhoto({ turrets: [turretPhoto({ index: '14' })] }));
flattenCase('full two guns', 'sockets.js:1352', fullPhoto({ guns: [gun(), gun()] }));

function invisCase(name, v, o, canSee) {
  out.invisAlpha.push({
    name,
    player: ser(v), other: ser(o), canSeeInvisible: !!canSee,
    alpha: num(sm.getInvisEntityAlpha(v, o, canSee)),
  });
}

invisCase('own entity, alpha 0.4', viewer(), subject({ alpha: 0.4, master: { id: 1 } }));
invisCase('own entity, alpha 0', viewer(), subject({ alpha: 0, master: { id: 1 } }));
invisCase('far, alpha 0.4', viewer(), subject({ alpha: 0.4, x: 400, y: 0 }));
invisCase('at range boundary', viewer(), subject({ alpha: 0.4, x: 300, y: 0 }));
invisCase('near, alpha 0.4', viewer(), subject({ alpha: 0.4, x: 150, y: 0 }));
invisCase('near, alpha 0', viewer(), subject({ alpha: 0, x: 150, y: 0 }));
invisCase('diagonal', viewer(), subject({ alpha: 0.2, x: 90, y: 120 }));
invisCase('fully invisible', viewer(), subject({ alpha: 0.3, x: 10, y: 0, settings: { fullyInvisible: true } }));
invisCase('canSeeInvisible true', viewer(), subject({ alpha: 0.4, x: 150, y: 0 }), true);
invisCase('canSeeInvisible true, alpha 0', viewer(), subject({ alpha: 0, x: 150, y: 0 }), true);

function perspectiveCase(name, site, cfg, v, o, photo) {
  Object.assign(Config, {
    random_body_colors: false, groups: false, mode: 'ffa', tag: false,
  }, cfg);
  const flat = sm.flatten(photo);
  const before = flat.slice();
  const result = sm.perspective(o, v, flat);
  out.perspective.push({
    name, site,
    config: { ...Config },
    player: ser(v), entity: ser(o), photo: ser(photo),
    before: ser(before),
    result: ser(result),
    cacheAfter: ser(flat),
    teamColorAfter: v.teamColor,
    aliasesCache: result === flat,
  });
}

perspectiveCase('no body', 'sockets.js:1386',
  {}, { body: null, command: {}, teamColor: 'x' }, subject(), fullPhoto());
perspectiveCase('opaque, other team', 'sockets.js:1385',
  { mode: 'tdm' }, viewer(), subject(), fullPhoto());
perspectiveCase('invisible other', 'sockets.js:1387',
  { mode: 'tdm' }, viewer(), subject({ alpha: 0.4, x: 150 }), fullPhoto({ alpha: 0.4 }));
perspectiveCase('own body autospin', 'sockets.js:1396',
  { mode: 'tdm' }, viewer({ command: { autospin: true } }),
  subject({ master: { id: 1 } }), fullPhoto());
perspectiveCase('own body autospin, bullet layout', 'sockets.js:1396',
  { mode: 'tdm' }, viewer({ command: { autospin: true } }),
  subject({ master: { id: 1 }, limited: true }), bulletPhoto());
perspectiveCase('canSeeInvisible full', 'sockets.js:1400',
  { mode: 'tdm' }, viewer({ body: { settings: { canSeeInvisible: true } } }),
  subject({ alpha: 0.4, x: 150 }), fullPhoto({ alpha: 0.4 }));
perspectiveCase('canSeeInvisible bullet', 'sockets.js:1402',
  { mode: 'tdm' }, viewer({ body: { settings: { canSeeInvisible: true } } }),
  subject({ alpha: 0.4, x: 150, limited: true }), bulletPhoto({ alpha: 0.4 }));
perspectiveCase('team colour full, ffa', 'sockets.js:1412',
  { mode: 'ffa' }, viewer(), subject({ source: { team: -1 } }), fullPhoto());
perspectiveCase('team colour bullet, ffa', 'sockets.js:1411',
  { mode: 'ffa' }, viewer(), subject({ source: { team: -1 }, limited: true }), bulletPhoto());
perspectiveCase('team colour, groups', 'sockets.js:1412',
  { groups: true, mode: 'tdm' }, viewer(), subject({ source: { team: -1 } }), fullPhoto());
perspectiveCase('team colour, clan not tag', 'sockets.js:1412',
  { mode: 'clan', tag: false }, viewer(), subject({ source: { team: -1 } }), fullPhoto());
perspectiveCase('team colour, clan and tag', 'sockets.js:1408',
  { mode: 'clan', tag: true }, viewer(), subject({ source: { team: -1 } }), fullPhoto());
perspectiveCase('own body random colours', 'sockets.js:1394',
  { mode: 'ffa', random_body_colors: true }, viewer(),
  subject({ master: { id: 1 }, source: { team: -1 } }), fullPhoto());

// --- the cross-viewer leak -------------------------------------------------
//
// Two viewers see the same invisible entity in the same tick, sharing one
// flattenedPhoto. The first writes its own alpha straight into the cache
// (sockets.js:1388) before any slice; the second has no body, so perspective
// returns the cache untouched — and ships the first viewer's alpha.
{
  Object.assign(Config, { random_body_colors: false, groups: false, mode: 'tdm', tag: false });
  const photo = fullPhoto({ alpha: 0.4 });
  const flattenedPhoto = sm.flatten(photo);           // the shared cache
  const pristine = flattenedPhoto.slice();

  const near = viewer({ body: { id: 1, x: 150, y: 0 } });
  const e = subject({ alpha: 0.4, x: 0, y: 0 });
  const nearFrame = sm.perspective(e, near, flattenedPhoto).slice();

  const spectator = { body: null, command: {}, teamColor: 'x' };
  const spectatorFrame = sm.perspective(e, spectator, flattenedPhoto).slice();

  out.perspectiveLeak.push({
    name: 'invisible alpha leaks to a body-less viewer',
    site: 'sockets.js:1388',
    pristineAlpha: num(pristine[18]),
    nearViewerAlpha: num(nearFrame[18]),
    spectatorAlpha: num(spectatorFrame[18]),
    cacheAlphaAfter: num(flattenedPhoto[18]),
    leaked: spectatorFrame[18] !== pristine[18],
  });

  // The same pair with the far viewer first, to show the value that leaks is
  // whichever viewer ran last, not a fixed one.
  const photo2 = fullPhoto({ alpha: 0.4 });
  const cache2 = sm.flatten(photo2);
  const far = viewer({ body: { id: 2, x: 250, y: 0 } });
  const farFrame = sm.perspective(subject({ alpha: 0.4 }), far, cache2).slice();
  const spectatorFrame2 = sm.perspective(subject({ alpha: 0.4 }), { body: null, command: {}, teamColor: 'x' }, cache2).slice();
  out.perspectiveLeak.push({
    name: 'a more distant viewer leaks a different alpha again',
    site: 'sockets.js:1388',
    pristineAlpha: num(sm.flatten(fullPhoto({ alpha: 0.4 }))[18]),
    nearViewerAlpha: num(farFrame[18]),
    spectatorAlpha: num(spectatorFrame2[18]),
    cacheAlphaAfter: num(cache2[18]),
    leaked: spectatorFrame2[18] !== sm.flatten(fullPhoto({ alpha: 0.4 }))[18],
  });
}

// --- field of view ---------------------------------------------------------

for (const arenaClosed of [false, true]) {
  for (const fov of [2000, 3000.5]) {
    for (const size of [0, 25, 1000]) {
      for (const [x, y] of [[0, 0], [2050, 0], [0, 1200], [2100, 1200], [-2099, -1124], [5000, 5000]]) {
        const camera = { x: 10, y: -20, fov };
        const obj = { x, y, size };
        out.fov.push({
          camera, obj, arenaClosed,
          check: check(camera, obj, arenaClosed),
          broad: broadCheck(camera, obj, arenaClosed),
          fine: fineCheck(camera, obj),
        });
      }
    }
  }
}

for (const [fov, fovNow] of [[2000, 2000], [2000, 3000], [3000, 2000], [2000, 1000], [1234.5, 987.25], [0, 2000]]) {
  out.easeFov.push({ fov, fovNow, result: num(easeFov(fov, fovNow)) });
}

for (const [size, shape] of [[25, 0], [25, 1], [25, 3], [25, 4], [10.5, 6], [8, 16], [8, -5], [8, 3.9], [8, 20]]) {
  out.realSize.push({ size, shape, result: num(realSizeOf(size, shape)) });
}

const dest = path.join(root, 'gen', 'view-vectors.json');
fs.mkdirSync(path.dirname(dest), { recursive: true });
fs.writeFileSync(dest, JSON.stringify(out, null, 1));
console.log(`wrote ${dest}`);
for (const k of Object.keys(out)) console.log(`  ${k}: ${out[k].length}`);
