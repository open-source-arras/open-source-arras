// Everything that makes a run reproducible. Require this before any game module:
// it swaps out Math.random, the clock and the timer queue on globalThis, and the
// game tree picks those up when it loads.
//
// Three things are replaced:
//   1. Math.random  -> mulberry32, seeded from --seed.
//   2. The clock    -> Date.now / new Date() / performance.now read a virtual counter
//                      that only the harness advances.
//   3. Timers       -> setTimeout/setInterval go into a virtual queue keyed on that same
//                      counter. Nothing real is ever scheduled, so the process has no
//                      pending handles and exits on its own.
//   4. crypto.randomUUID -> a counter. It is the only other source of entropy the
//                      server reaches for, and it must not spend seeded draws.
//
// It also nails shut the two doors the harness must not open: listening sockets and
// worker threads. Those throw rather than silently doing the wrong thing.

'use strict';

// ---------------------------------------------------------------------------
// mulberry32
// ---------------------------------------------------------------------------
// Four lines of uint32 arithmetic, chosen so the Go port can draw the identical
// sequence. See docs/harness.md for the Go transcription.
function mulberry32(seed) {
  let a = seed >>> 0;
  return function () {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

// ---------------------------------------------------------------------------
// virtual clock
// ---------------------------------------------------------------------------
// Fixed base so timestamps are plausible dates rather than 1970 — the game stores
// creationTime and friends, and a zero timestamp is falsy.
//
// `ms` (elapsed) is the authoritative counter and everything internal works in that
// space. Adding the epoch only happens at the moment Date.now() is read: at 1.7e12 a
// double's step is 2^-12 ms, so keeping timer deadlines in elapsed space keeps them
// exact instead of quantised.
const EPOCH_MS = 1700000000000; // 2023-11-14T22:13:20.000Z

const clock = {
  base: EPOCH_MS,
  ms: 0, // virtual milliseconds elapsed since base
  now() { return this.base + this.ms; },
};

// ---------------------------------------------------------------------------
// virtual timer queue
// ---------------------------------------------------------------------------
// A binary heap keyed on (due, seq). Ties break on insertion order, which is what
// Node does for same-deadline timers.
const heap = [];
let seq = 0;
const live = new Map(); // id -> record, for clearTimeout/clearInterval

function less(a, b) { return a.due !== b.due ? a.due < b.due : a.seq < b.seq; }

function heapPush(rec) {
  heap.push(rec);
  let i = heap.length - 1;
  while (i > 0) {
    const p = (i - 1) >> 1;
    if (!less(heap[i], heap[p])) break;
    [heap[i], heap[p]] = [heap[p], heap[i]];
    i = p;
  }
}

function heapPop() {
  const top = heap[0];
  const last = heap.pop();
  if (heap.length) {
    heap[0] = last;
    let i = 0;
    for (;;) {
      const l = 2 * i + 1, r = l + 1;
      let m = i;
      if (l < heap.length && less(heap[l], heap[m])) m = l;
      if (r < heap.length && less(heap[r], heap[m])) m = r;
      if (m === i) break;
      [heap[i], heap[m]] = [heap[m], heap[i]];
      i = m;
    }
  }
  return top;
}

// Node coerces a delay outside [1, 2^31-1] to 1.
function normaliseDelay(d) {
  d = Number(d);
  return (d >= 1 && d <= 2147483647) ? d : 1;
}

class VirtualTimer {
  constructor(id) { this.id = id; }
  ref() { return this; }
  unref() { return this; }
  hasRef() { return true; }
  refresh() {
    const rec = live.get(this.id);
    if (rec && !rec.cleared) { rec.due = clock.ms + rec.delay; heapPush(rec); }
    return this;
  }
  [Symbol.toPrimitive]() { return this.id; }
}

let nextId = 1;

function schedule(fn, delay, args, repeating) {
  if (typeof fn !== 'function') throw new TypeError('callback must be a function');
  const d = normaliseDelay(delay);
  const rec = {
    id: nextId++,
    seq: seq++,
    due: clock.ms + d, // deadlines live in elapsed-ms space
    delay: d,
    repeating,
    fn,
    args,
    cleared: false,
  };
  rec.handle = new VirtualTimer(rec.id);
  live.set(rec.id, rec);
  heapPush(rec);
  if (onSchedule) onSchedule(rec);
  return rec.handle;
}

let onSchedule = null; // run.js hooks this to find the game loop's own interval

function cancel(handle) {
  if (handle == null) return;
  const id = typeof handle === 'object' ? handle.id : Number(handle);
  const rec = live.get(id);
  if (rec) { rec.cleared = true; live.delete(id); }
}

// Fires every timer due at or before `targetMs` (elapsed virtual ms), in (due, seq)
// order, then parks the clock exactly on it. A callback sees the clock at its own
// deadline, not at the end of the step, which is what real timers do.
const FIRE_BUDGET = 1000000;
function advanceTo(targetMs) {
  let fired = 0;
  while (heap.length && heap[0].due <= targetMs) {
    const rec = heapPop();
    if (rec.cleared) continue;
    if (++fired > FIRE_BUDGET) {
      throw new Error(`virtual timer queue did not settle: ${FIRE_BUDGET} callbacks in one step ` +
                      `(a zero-delay timer is probably re-arming itself)`);
    }
    clock.ms = rec.due;
    if (rec.repeating) {
      rec.due += rec.delay;
      rec.seq = seq++;
      heapPush(rec);
    } else {
      live.delete(rec.id);
    }
    rec.fn(...rec.args);
  }
  clock.ms = targetMs;
  return fired;
}

function pendingTimers() {
  let n = 0;
  for (const rec of live.values()) if (!rec.cleared) n++;
  return n;
}

function clearAllTimers() {
  for (const rec of live.values()) rec.cleared = true;
  live.clear();
  heap.length = 0;
}

// ---------------------------------------------------------------------------
// install
// ---------------------------------------------------------------------------
let installed = false;
let rngCalls = 0;
let rawRandom = null;

function install(opts) {
  if (installed) throw new Error('determinism.install() called twice');
  installed = true;

  const seed = opts.seed >>> 0;
  rawRandom = mulberry32(seed);
  Math.random = function random() { rngCalls++; return rawRandom(); };

  if (opts.epoch != null) clock.base = opts.epoch;

  // Date: no-arg construction and Date.now() read the virtual clock. Every other
  // form (new Date(ms), new Date(str), Date.parse, Date.UTC) is untouched.
  const RealDate = Date;
  class HarnessDate extends RealDate {
    constructor(...args) {
      if (args.length === 0) super(clock.now());
      else super(...args);
    }
    static now() { return clock.now(); }
  }
  Object.defineProperty(HarnessDate, 'name', { value: 'Date' });
  globalThis.Date = HarnessDate;

  // performance.now() is a plain millisecond counter from process start, so it maps
  // onto elapsed virtual ms rather than onto the wall clock.
  try {
    Object.defineProperty(globalThis.performance, 'now', {
      value: function now() { return clock.ms; },
      writable: true, configurable: true,
    });
  } catch (e) {
    globalThis.performance = { now: () => clock.ms };
  }

  globalThis.setTimeout = (fn, delay, ...args) => schedule(fn, delay, args, false);
  globalThis.setInterval = (fn, delay, ...args) => schedule(fn, delay, args, true);
  globalThis.clearTimeout = cancel;
  globalThis.clearInterval = cancel;
  globalThis.setImmediate = (fn, ...args) => schedule(fn, 1, args, false);
  globalThis.clearImmediate = cancel;

  // crypto.randomUUID, which sockets.js:2054 gives every socket as its id.
  //
  // The real one reads the OS entropy pool, not Math.random, so it must NOT draw
  // from the seeded stream: a socket connecting would shift every later draw and
  // the two sides would diverge for a reason that has nothing to do with the
  // game. A counter is exact for every use the id has -- sockets.js only ever
  // compares one id to another (:2239) and keys the minimap delta on it (:1955).
  //
  // The shape is a v4 UUID because that is what the client and the ban list see.
  let uuidCounter = 0;
  const nodeCrypto = require('crypto');
  nodeCrypto.randomUUID = function randomUUID() {
    const n = (++uuidCounter).toString(16).padStart(12, '0');
    return `00000000-0000-4000-8000-${n}`;
  };

  // Doors that must stay shut.
  const net = require('net');
  net.Server.prototype.listen = function () {
    throw new Error('harness: refusing to open a listening socket (server.js:309 / game.js:236)');
  };
  const wt = require('worker_threads');
  wt.Worker = class Worker {
    constructor() { throw new Error('harness: refusing to spawn a worker thread (server.js:240)'); }
  };

  return api;
}

const api = {
  install,
  mulberry32,
  clock,
  advanceTo,
  pendingTimers,
  clearAllTimers,
  get rngCalls() { return rngCalls; },
  set onSchedule(fn) { onSchedule = fn; },
  EPOCH_MS,
};

module.exports = api;
