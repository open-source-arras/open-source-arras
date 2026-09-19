// Dumps js-src/server/lib/definitions/ (the `Class` object the real server builds at
// boot) to JSON, for the Go port's internal/defs package to load. See
// docs/architecture.md and docs/definitions-report.md for the full write-up.
//
// Approach: this does NOT parse the JS. It requires the real boot chain
// (js-src/server/loaders/loader.js) so every global the definition files expect at
// require time (Class, Config, ensureIsClass, util, ran, IO, ioTypes, Gun, Entity, ...)
// exists exactly as it does for the real server, then calls the real
// `definitionCombiner` that server.js/game.js use. That is the only reliable way to
// get this right: some of these files are procedural generators that call a helper
// hundreds of times to synthesize classes (see the reconciliation section this script
// prints), and at least one addon (entityAddons/betterRetrograde/tanks.js) opens with a
// bare `return;` that disables the rest of the file. A text or AST scan would not know
// to honour either of those; actually running the loader does, for free.
//
// Read-only on js-src: everything below only `require()`s files under js-src/server.
// This script never writes, moves, or deletes anything there.

'use strict';

const fs = require('fs');
const path = require('path');

const REPO_ROOT = path.resolve(__dirname, '..');
const SERVER_ROOT = path.join(REPO_ROOT, 'js-src', 'server');
const DEFINITIONS_ROOT = path.join(SERVER_ROOT, 'lib', 'definitions');
const GEN_DIR = path.join(REPO_ROOT, 'gen');

function relToRepo(p) {
  return path.relative(REPO_ROOT, p).split(path.sep).join('/');
}

// ---------------------------------------------------------------------------
// 1. Boot the real server's globals, without booting a real server.
// ---------------------------------------------------------------------------
// loader.js requires global.js (which sets up Class, Config, ensureIsClass, util, ran,
// ...) plus the entity/gun/controller machinery some definition files need at require
// time (groups/testing.js does `class io_turretWithMotion extends IO`, which needs the
// real IO base class to already be global). Checked by hand before writing this script:
// none of loader.js's own requires open a socket, start a timer/interval, spawn a
// worker, or touch the filesystem beyond reading the .js files themselves — see the
// "load approach" section of docs/definitions-report.md for the file-by-file check.
require(path.join(SERVER_ROOT, 'loaders', 'loader.js'));

// Silence the real per-file startup logging (`if (Config.startup_logs) console.log(...)`
// inside loadDefinitions) so this tool's own summary is the only thing on stdout. This
// only mutates an in-memory config object in this throwaway process; it does not touch
// any file under js-src.
global.Config.startup_logs = false;

// Every `Class.foo = ...` / `Class[expr] = ...` assignment from here on is one we want a
// record of: the reconciliation below depends on knowing not just the final key count,
// but how many assignment operations happened and how many were overwrites of an
// already-existing key. A Proxy catches both dot- and bracket-notation assignment
// uniformly, which a text search cannot (see the facilitators.js dynamic-key generators
// counted in the reconciliation section).
const assignmentLog = []; // { key, order, isOverwrite }
const seenKeys = new Set();
global.Class = new Proxy(global.Class, {
  set(target, key, value) {
    if (typeof key === 'string') {
      assignmentLog.push({ key, order: assignmentLog.length, isOverwrite: seenKeys.has(key) });
      seenKeys.add(key);
    }
    target[key] = value;
    return true;
  },
});
const Class = global.Class;

// ---------------------------------------------------------------------------
// 2. Load definitions the way server.js does, scoped to lib/definitions only.
// ---------------------------------------------------------------------------
// `includeGameAddons: false` below is deliberate: js-src/server/game/addons/ is a
// separate, much heavier subsystem (chat commands, key bindings, server travel) that is
// out of scope for this dump — the task and its reconciliation grep are both scoped to
// js-src/server/lib/definitions. Passing false here mirrors that scope exactly instead
// of guessing at it.
const { definitionCombiner } = require(path.join(DEFINITIONS_ROOT, 'combined.js'));
new definitionCombiner({
  groups: path.join(DEFINITIONS_ROOT, 'groups'),
  addonsFolder: path.join(DEFINITIONS_ROOT, 'entityAddons'),
}).loadDefinitions(true, false);

const finalKeys = Object.keys(Class);
console.log(`Loaded ${finalKeys.length} definitions (${assignmentLog.length} assignment ops, ` +
  `${assignmentLog.filter(a => a.isOverwrite).length} of them overwrites of an existing key).`);

// facilitators.js's makeRelic (facilitators.js:1337-1338) registers a handful of small
// anonymous turret sub-parts under `Class[Math.random().toString(36)]` — it needs *some*
// unique key to hang them on, but nothing ever looks them up by name (their one
// reference is the direct object placed inline as a TURRETS[].TYPE value, which the
// __classRef normalization below already resolves by identity). Left alone, those
// random names would make gen/definitions.json churn on every regeneration for no
// semantic reason. They're replaced here with a name derived from each entry's stable,
// insertion-order `index` (assigned by the real loadDefinitions() above, unaffected by
// this step) plus a slug of its LABEL, purely for reproducibility and readability —
// nothing about which object is which, or what references what, changes.
const RANDOM_KEY_RE = /^0\.[0-9a-z]+$/;
function slugify(s) {
  const cleaned = String(s || '').replace(/[^A-Za-z0-9]+/g, '_').replace(/^_+|_+$/g, '');
  return cleaned || 'entry';
}
const outNameFor = new Map(); // original Class key -> stable output name
const anonKeyRenames = []; // { originalKey, stableName, index }
for (const k of finalKeys) {
  if (RANDOM_KEY_RE.test(k)) {
    const stable = `anon_${Class[k].index}_${slugify(Class[k].LABEL)}`;
    outNameFor.set(k, stable);
    anonKeyRenames.push({ originalKey: k, stableName: stable, index: Class[k].index });
  } else {
    outNameFor.set(k, k);
  }
}
if (anonKeyRenames.length) {
  console.log(`Renamed ${anonKeyRenames.length} Math.random()-keyed anonymous entries to stable names (e.g. ` +
    `${anonKeyRenames[0].originalKey} -> ${anonKeyRenames[0].stableName}).`);
}

// ---------------------------------------------------------------------------
// 3. Serialisation: never silently drop a non-JSON value.
// ---------------------------------------------------------------------------
// Two kinds of thing get flagged as we walk the tree:
//  - `__nonSerialisable` sentinels: a function, RegExp, Map/Set, class instance,
//    symbol, bigint, Date, explicit `undefined`, or a true circular reference. These
//    cannot become plain data; we record what they were and where, in place, so nothing
//    vanishes silently.
//  - `__classRef` sentinels: a value that is not a string but *is*, by object identity,
//    one of the other entries in `Class` (e.g. facilitators.js's `makeCrasher` embeds
//    the resolved parent object itself, not its name, as `PARENT: type`). Reduced to
//    `{"__classRef": "<name>"}` instead of inlining a full duplicate copy of that other
//    definition. This is lossless — the target is still the same row of `definitions`.
const nonSerialisable = []; // { kind, path, name?, className?, source }
const classRefNormalizations = []; // { path, targetName }
const parentAnomalies = []; // PARENT resolved to something other than a string/array-of-strings/known-classRef

let reverseClassMap; // built once Class is fully loaded, in main()

function recordNonSerialisable(kind, pathStr, extra) {
  const rec = Object.assign({ kind, path: pathStr }, extra);
  nonSerialisable.push(rec);
  return rec;
}

function classify(value) {
  if (value === null) return 'null';
  const t = typeof value;
  if (t === 'undefined') return 'undefined';
  if (t === 'function') return 'function';
  if (t === 'symbol') return 'symbol';
  if (t === 'bigint') return 'bigint';
  // NaN and the infinities are numbers JSON cannot hold: JSON.stringify writes them
  // as `null`, which on the Go side is indistinguishable from an absent key. That
  // difference is load-bearing -- `if (set.DANGER != null)` (entity.js:302) runs for
  // NaN and skips for null -- so they get a sentinel of their own. See found-bug #61.
  if (t === 'number' && !Number.isFinite(value)) return 'nonfinite';
  if (t === 'string' || t === 'number' || t === 'boolean') return 'primitive';
  if (Array.isArray(value)) return 'array';
  if (value instanceof RegExp) return 'regexp';
  if (value instanceof Map) return 'map';
  if (value instanceof Set) return 'set';
  if (value instanceof Date) return 'date';
  const proto = Object.getPrototypeOf(value);
  if (proto === Object.prototype || proto === null) return 'plain-object';
  return 'class-instance';
}

function safeFnSource(fn) {
  try {
    return Function.prototype.toString.call(fn);
  } catch (e) {
    return `<source unavailable: ${e.message}>`;
  }
}

// `ancestors` is the set of container objects currently on the path from the root of
// the *current* top-level definition down to here — used to detect true circular
// references (an object that is its own, or an ancestor's own, descendant) without
// hanging. It is not a "seen anywhere" set: the same sub-object legitimately appearing
// at two unrelated paths (e.g. two turrets sharing a POSITION literal via a JS
// variable) is not a cycle and is serialised at both places independently, matching
// what JSON.stringify would do.
// A resolved PARENT value is "clean" if it's a plain string, a `__classRef` sentinel
// (an object-identity reference we reduced to a name), or an array of those. Anything
// else (a deep-inlined nested object because it wasn't identity-linked to any known
// Class entry, or a non-serialisable sentinel) is worth flagging separately.
function isCleanParentValue(v) {
  if (typeof v === 'string') return true;
  if (v && typeof v === 'object' && !Array.isArray(v) && typeof v.__classRef === 'string') return true;
  if (Array.isArray(v)) return v.every(isCleanParentValue);
  return false;
}

function checkParentAnomaly(pathPrefix, out) {
  if (Object.prototype.hasOwnProperty.call(out, 'PARENT') && !isCleanParentValue(out.PARENT)) {
    parentAnomalies.push({ path: `${pathPrefix}.PARENT`, resolved: out.PARENT });
  }
}

function serialize(value, pathStr, ancestors) {
  const kind = classify(value);
  switch (kind) {
    case 'null':
    case 'primitive':
      return value;

    case 'undefined':
      recordNonSerialisable('undefined', pathStr, { source: null });
      return { __nonSerialisable: 'undefined', path: pathStr };

    case 'nonfinite': {
      const kind = Number.isNaN(value) ? 'NaN' : (value > 0 ? 'Infinity' : '-Infinity');
      recordNonSerialisable(kind, pathStr, { source: String(value) });
      return { __nonSerialisable: kind, path: pathStr };
    }

    case 'function': {
      const source = safeFnSource(value);
      recordNonSerialisable('function', pathStr, { name: value.name || null, source });
      return { __nonSerialisable: 'function', path: pathStr, name: value.name || null, source };
    }

    case 'regexp': {
      const source = value.toString();
      recordNonSerialisable('regexp', pathStr, { source });
      return { __nonSerialisable: 'regexp', path: pathStr, source };
    }

    case 'symbol': {
      const source = value.toString();
      recordNonSerialisable('symbol', pathStr, { source });
      return { __nonSerialisable: 'symbol', path: pathStr, source };
    }

    case 'bigint': {
      const source = value.toString();
      recordNonSerialisable('bigint', pathStr, { source });
      return { __nonSerialisable: 'bigint', path: pathStr, source };
    }

    case 'date': {
      const source = value.toISOString();
      recordNonSerialisable('date', pathStr, { source });
      return { __nonSerialisable: 'date', path: pathStr, source };
    }

    case 'map':
    case 'set': {
      let entries = null;
      try {
        entries = serialize(kind === 'map' ? [...value.entries()] : [...value.values()], `${pathStr}.<entries>`, ancestors);
      } catch (e) { /* best effort only */ }
      recordNonSerialisable(kind, pathStr, { source: `size=${value.size}` });
      return { __nonSerialisable: kind, path: pathStr, size: value.size, entries };
    }

    case 'class-instance': {
      const className = value.constructor ? value.constructor.name : '(anonymous)';
      const own = {};
      for (const k of Object.keys(value)) own[k] = value[k];
      recordNonSerialisable('class-instance', pathStr, { className, source: `own properties: ${Object.keys(value).join(', ')}` });
      return {
        __nonSerialisable: 'class-instance',
        path: pathStr,
        className,
        ownProperties: serialize(own, `${pathStr}.<ownProperties>`, ancestors),
      };
    }

    case 'array': {
      if (ancestors.has(value)) {
        recordNonSerialisable('circular', pathStr, { source: 'array revisits a container already on this path' });
        return { __nonSerialisable: 'circular', path: pathStr };
      }
      ancestors.add(value);
      const out = value.map((el, i) => serialize(el, `${pathStr}[${i}]`, ancestors));
      ancestors.delete(value);
      return out;
    }

    case 'plain-object': {
      const refName = reverseClassMap.get(value);
      if (refName !== undefined) {
        classRefNormalizations.push({ path: pathStr, targetName: refName });
        return { __classRef: refName };
      }
      if (ancestors.has(value)) {
        recordNonSerialisable('circular', pathStr, { source: 'object revisits a container already on this path' });
        return { __nonSerialisable: 'circular', path: pathStr };
      }
      ancestors.add(value);
      const out = {};
      for (const k of Object.keys(value)) {
        out[k] = serialize(value[k], `${pathStr}.${k}`, ancestors);
      }
      ancestors.delete(value);
      checkParentAnomaly(pathStr, out);
      return out;
    }

    default:
      recordNonSerialisable('unknown', pathStr, { source: String(value) });
      return { __nonSerialisable: 'unknown', path: pathStr, source: String(value) };
  }
}

function serializeClassEntry(name, obj) {
  const ancestors = new Set([obj]);
  const out = {};
  for (const k of Object.keys(obj)) {
    out[k] = serialize(obj[k], `Class.${name}.${k}`, ancestors);
  }
  checkParentAnomaly(`Class.${name}`, out);
  return out;
}

// ---------------------------------------------------------------------------
// 4. PARENT flattening: a cycle-guarded, path-tracking port of the codebase's own
//    `global.flatten` (js-src/server/loaders/global.js:611-627), cross-checked below
//    against that real function on every single definition before we trust it.
// ---------------------------------------------------------------------------
function resolveClassLike(nameOrObj) {
  // Mirrors the real `ensureIsClass` (loaders/global.js) exactly, including its use of
  // `in` (which also sees Object.prototype's inherited keys) rather than
  // hasOwnProperty. That is a latent footgun in the original — a PARENT string that
  // happened to collide with e.g. "toString" would resolve to Object.prototype.toString
  // instead of throwing — but no real definition name does, so it is inert in practice.
  // Documented here rather than silently "fixed", per this repo's port rule to match JS
  // behaviour exactly.
  if (nameOrObj !== null && typeof nameOrObj === 'object') return nameOrObj;
  if (nameOrObj in Class) return Class[nameOrObj];
  throw new Error(`Definition "${nameOrObj}" was attempted to be gotten but does not exist!`);
}

function flattenInto(output, definition, ancestry, chainDescription) {
  definition = resolveClassLike(definition);
  if (ancestry.has(definition)) {
    throw new Error(`PARENT cycle detected: ${chainDescription.join(' -> ')} -> (repeats)`);
  }
  if (definition.PARENT) {
    const parents = Array.isArray(definition.PARENT) ? definition.PARENT : [definition.PARENT];
    for (const parent of parents) {
      const resolved = resolveClassLike(parent);
      ancestry.add(definition);
      flattenInto(output, resolved, ancestry, chainDescription.concat(String(parent)));
      ancestry.delete(definition);
    }
  }
  for (const key of Object.keys(definition)) {
    if (key !== 'PARENT') output[key] = definition[key];
  }
  return output;
}

function myFlatten(name) {
  return flattenInto({}, Class[name], new Set(), [name]);
}

// Reference-aware structural equality used only to cross-check `myFlatten` against the
// real `global.flatten`. Functions/RegExp/etc. compare by reference (both algorithms
// only ever copy references, never transform values), plain data compares by value.
function crossCheckEqual(a, b) {
  if (Object.is(a, b)) return true;
  if (a === null || b === null) return false;
  if (typeof a !== 'object' || typeof b !== 'object') return false;
  if (Array.isArray(a) !== Array.isArray(b)) return false;
  if (Array.isArray(a)) {
    if (a.length !== b.length) return false;
    for (let i = 0; i < a.length; i++) if (!crossCheckEqual(a[i], b[i])) return false;
    return true;
  }
  const proto = Object.getPrototypeOf(a);
  if (proto !== Object.prototype && proto !== null) return a === b; // class instances: reference only
  const ak = Object.keys(a), bk = Object.keys(b);
  if (ak.length !== bk.length) return false;
  for (const k of ak) {
    if (!Object.prototype.hasOwnProperty.call(b, k)) return false;
    if (!crossCheckEqual(a[k], b[k])) return false;
  }
  return true;
}

// ---------------------------------------------------------------------------
// 5. Main
// ---------------------------------------------------------------------------
function main() {
  reverseClassMap = new Map();
  for (const name of finalKeys) reverseClassMap.set(Class[name], outNameFor.get(name));

  const generatedAt = new Date().toISOString();

  // --- raw (PARENT intact) ---
  const rawDefinitions = {};
  for (const name of finalKeys) rawDefinitions[outNameFor.get(name)] = serializeClassEntry(outNameFor.get(name), Class[name]);
  const rawNonSerialisableCount = nonSerialisable.length;
  const rawClassRefCount = classRefNormalizations.length;
  const rawParentAnomalies = parentAnomalies.slice();
  const rawNonSerialisableList = nonSerialisable.slice();
  const rawClassRefList = classRefNormalizations.slice();

  // --- flat (PARENT resolved) ---
  nonSerialisable.length = 0;
  classRefNormalizations.length = 0;
  parentAnomalies.length = 0;

  const flattenErrors = []; // { name, message }
  const crossCheckMismatches = []; // { name }
  const flatPlain = {}; // name -> plain flattened JS object, before JSON-safety serialisation

  for (const name of finalKeys) {
    try {
      flatPlain[name] = myFlatten(name);
    } catch (e) {
      flattenErrors.push({ name: outNameFor.get(name), message: e.message });
    }
  }

  // Cross-check every successfully-flattened definition against the real
  // `global.flatten` from js-src/server/loaders/global.js, unmodified.
  for (const name of Object.keys(flatPlain)) {
    let real;
    try {
      real = global.flatten({}, Class[name]);
    } catch (e) {
      crossCheckMismatches.push({ name: outNameFor.get(name), reason: `real global.flatten threw: ${e.message}` });
      continue;
    }
    if (!crossCheckEqual(flatPlain[name], real)) {
      crossCheckMismatches.push({ name: outNameFor.get(name), reason: 'structural mismatch vs global.flatten' });
    }
  }

  const flatDefinitions = {};
  for (const name of Object.keys(flatPlain)) {
    const outName = outNameFor.get(name);
    const ancestors = new Set([flatPlain[name]]);
    const out = {};
    for (const k of Object.keys(flatPlain[name])) {
      out[k] = serialize(flatPlain[name][k], `Class.${outName}.${k}`, ancestors);
    }
    flatDefinitions[outName] = out;
  }
  const flatNonSerialisableCount = nonSerialisable.length;
  const flatClassRefCount = classRefNormalizations.length;
  const flatParentAnomalies = parentAnomalies.slice();
  const flatNonSerialisableList = nonSerialisable.slice();
  const flatClassRefList = classRefNormalizations.slice();

  const overwrites = assignmentLog.filter(a => a.isOverwrite);

  const sharedMeta = {
    generatedAt,
    generatorScript: 'tools/dump-definitions.js',
    sourceRoot: relToRepo(DEFINITIONS_ROOT),
    definitionCount: finalKeys.length,
    assignmentOpsTotal: assignmentLog.length,
    assignmentOverwrites: overwrites.length,
    overwrittenKeys: [...new Set(overwrites.map(o => o.key))].sort(),
    anonymousKeysRenamed: anonKeyRenames.length,
    anonymousKeyRenames: anonKeyRenames,
  };

  const rawOut = {
    meta: Object.assign({}, sharedMeta, {
      kind: 'raw',
      description: 'Class definitions exactly as loaded, with PARENT references left ' +
        'intact (string or array of strings naming another entry in `definitions`, ' +
        'except where noted below). Go resolves inheritance at load time from this ' +
        'file; see docs/definitions-report.md for the exact per-field merge semantics ' +
        'to replicate (they are NOT a generic object merge).',
      nonSerialisableCount: rawNonSerialisableCount,
      nonSerialisableByKind: countByKind(rawNonSerialisableList),
      nonSerialisable: rawNonSerialisableList.map(({ kind, path }) => ({ kind, path })),
      classRefNormalizationCount: rawClassRefCount,
      classRefNormalizations: rawClassRefList,
      parentAnomalies: rawParentAnomalies,
    }),
    definitions: rawDefinitions,
  };

  const flatOut = {
    meta: Object.assign({}, sharedMeta, {
      kind: 'flat',
      description: 'Best-effort flattening of each definition\'s PARENT chain using a ' +
        'cycle-guarded port of the codebase\'s own (unused-at-runtime) ' +
        '`global.flatten` (js-src/server/loaders/global.js:611-627): PARENT-first, ' +
        'own-keys-last, whole-key overwrite, no PARENT key in the output. Cross-checked ' +
        'field-for-field against the real global.flatten for every definition (see ' +
        'crossCheck below). This is NOT how the live server actually resolves ' +
        'inheritance for gameplay (Entity.prototype.define / defineSplit use different, ' +
        'field-specific semantics — multiplicative BODY/SIZE, accumulating GUNS/' +
        'TURRETS/PROPS/CONTROLLERS, concatenating LABEL in some contexts). Treat this ' +
        'file as an inspection/debug aid, not a gameplay-accurate resolved-stats table. ' +
        'See docs/definitions-report.md.',
      definitionCount: Object.keys(flatDefinitions).length,
      flattenErrors,
      crossCheckAgainstRealFlatten: {
        checked: Object.keys(flatPlain).length,
        mismatches: crossCheckMismatches,
      },
      nonSerialisableCount: flatNonSerialisableCount,
      nonSerialisableByKind: countByKind(flatNonSerialisableList),
      nonSerialisable: flatNonSerialisableList.map(({ kind, path }) => ({ kind, path })),
      classRefNormalizationCount: flatClassRefCount,
      classRefNormalizations: flatClassRefList,
      parentAnomalies: flatParentAnomalies,
    }),
    definitions: flatDefinitions,
  };

  fs.mkdirSync(GEN_DIR, { recursive: true });
  fs.writeFileSync(path.join(GEN_DIR, 'definitions.json'), JSON.stringify(rawOut, null, 2));
  fs.writeFileSync(path.join(GEN_DIR, 'definitions-flat.json'), JSON.stringify(flatOut, null, 2));

  console.log('');
  console.log('=== gen/definitions.json (raw, PARENT intact) ===');
  console.log(`definitions: ${finalKeys.length}`);
  console.log(`non-serialisable values: ${rawNonSerialisableCount} ${JSON.stringify(countByKind(rawNonSerialisableList))}`);
  console.log(`__classRef normalizations (object-identity PARENT/etc. reduced to a name): ${rawClassRefCount}`);
  console.log(`PARENT anomalies (not a clean string/array-of-strings/classRef): ${rawParentAnomalies.length}`);
  console.log('');
  console.log('=== gen/definitions-flat.json (PARENT resolved) ===');
  console.log(`definitions flattened: ${Object.keys(flatDefinitions).length}`);
  console.log(`flatten errors: ${flattenErrors.length}`);
  if (flattenErrors.length) console.log(flattenErrors.slice(0, 20));
  console.log(`cross-check vs real global.flatten: ${Object.keys(flatPlain).length} checked, ${crossCheckMismatches.length} mismatches`);
  if (crossCheckMismatches.length) console.log(crossCheckMismatches.slice(0, 20));
  console.log(`non-serialisable values: ${flatNonSerialisableCount} ${JSON.stringify(countByKind(flatNonSerialisableList))}`);
  console.log(`__classRef normalizations: ${flatClassRefCount}`);
  console.log('');
  console.log(`assignment ops total: ${assignmentLog.length}, overwrites: ${overwrites.length}`);
  if (overwrites.length) console.log('overwritten keys:', [...new Set(overwrites.map(o => o.key))].sort());
}

function countByKind(list) {
  const out = {};
  for (const { kind } of list) out[kind] = (out[kind] || 0) + 1;
  return out;
}

main();
