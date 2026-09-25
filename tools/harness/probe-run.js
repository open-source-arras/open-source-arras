// PROBE COPY of run.js. Not the harness -- a copy of it with draw-counting probes
// added, kept because the technique found two real defects (docs/verification.md,
// "What the first end-to-end run found") and the next divergence will want it again.
//
// It reports three things run.js does not:
//   PROBE setup:*         cumulative draws at each boot phase
//   PROBE_perTickDraws    draws per call in the tick body, by name
//   PROBE_roomSetupSites  draws during gameServer construction, by source line
//
// Because it is a copy it will drift from run.js. It is a diagnostic, never a
// reference: if the two ever disagree, run.js is right. Re-copy it from run.js and
// re-apply the probes rather than trusting this file to still mirror the harness.
//
//   node tools/harness/probe-run.js --seed 1 --ticks 4 --gamemode ffa --out gen/probe.jsonl
//
const PROBE={};
// Headless, deterministic driver for the JS simulation.
//
//   node tools/harness/run.js --seed 1 --ticks 200 --gamemode ffa --out gen/harness-1.jsonl
//
// Boots a room the way server.js's "share_client_server" path does — no HTTP server,
// no worker thread, no sockets — then steps the game loop exactly --ticks times and
// writes one JSON line of world state per tick.
//
// Two invariants the whole thing exists for:
//   same seed  -> byte-identical output files
//   other seed -> different output files

'use strict';


// Math.pow in Node is the host's libm unless this flag is set, so reference
// output captured without it is specific to the machine that produced it.
// See tools/fdlibm-pow.js.
require('../fdlibm-pow');
const fs = require('fs');
const path = require('path');

// ---------------------------------------------------------------------------
// args
// ---------------------------------------------------------------------------
function parseArgs(argv) {
  const out = {
    seed: 1,
    ticks: 100,
    gamemode: 'ffa',
    out: null,
    bots: null,
    quiet: false,
  };
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i];
    const take = () => {
      const v = argv[++i];
      if (v === undefined) { console.error(`${a} needs a value`); process.exit(2); }
      return v;
    };
    switch (a) {
      case '--seed': out.seed = Number(take()); break;
      case '--ticks': out.ticks = Number(take()); break;
      case '--gamemode': out.gamemode = take(); break;
      case '--out': out.out = take(); break;
      case '--bots': out.bots = Number(take()); break;
      case '--quiet': out.quiet = true; break;
      // --fullsites prints every room-setup draw in order, not just the first 12
      // distinct sites, so it can be diffed line for line against
      // `GOTRACE_SETUPSITES=1 go run ./cmd/gotrace`.
      case '--fullsites': break;
      case '-h': case '--help':
        console.log('usage: node tools/harness/run.js --seed N --ticks N [--gamemode ffa] ' +
                    '[--bots N] [--quiet] --out FILE');
        process.exit(0);
      default:
        console.error(`unknown argument: ${a}`);
        process.exit(2);
    }
  }
  if (!Number.isFinite(out.seed)) { console.error('--seed must be a number'); process.exit(2); }
  if (!Number.isInteger(out.ticks) || out.ticks < 0) { console.error('--ticks must be a non-negative integer'); process.exit(2); }
  if (!out.out) { console.error('--out is required'); process.exit(2); }
  return out;
}

const args = parseArgs(process.argv.slice(2));

// ---------------------------------------------------------------------------
// determinism first, before a single game module loads
// ---------------------------------------------------------------------------
const det = require('./determinism.js').install({ seed: args.seed });

const jsRoot = path.join(__dirname, 'js');
const serverRoot = path.join(jsRoot, 'server');
if (!fs.existsSync(serverRoot)) {
  console.error(`patched tree missing at ${serverRoot}\nrun: node tools/harness/setup.js`);
  process.exit(1);
}

// Game startup is chatty and its text is not part of the artefact. Keep stdout for
// the harness's own summary so a caller can parse it.
const realLog = console.log;
const realWarn = console.warn;
const realErr = console.error;
function muteGame() {
  if (!args.quiet) return;
  console.log = () => {};
  console.warn = () => {};
}
function unmuteGame() {
  console.log = realLog;
  console.warn = realWarn;
  console.error = realErr;
}

// ---------------------------------------------------------------------------
// boot — mirrors server.js:17-38 then server.js:266-275 (the loadViaMain branch)
// ---------------------------------------------------------------------------
function boot() {
  // server.js:17-23 — .env into process.env. permissions.js and game.js read these.
  const dotenv = require(path.join(serverRoot, 'lib', 'dotenv.js'));
  const envFile = path.join(serverRoot, '.env');
  if (fs.existsSync(envFile)) {
    const env = dotenv(fs.readFileSync(envFile).toString());
    for (const k in env) process.env[k] = env[k];
  }

  // server.js:26 — installs Class, Config, entities, grid, util, ran ... onto global.
  const GLOBAL = require(path.join(serverRoot, 'loaders', 'loader.js'));

  // server.js:31-37 — definitions must exist before any room does.
  const MARK=(n)=>{ PROBE['setup:'+n]=det.rngCalls; };
  MARK('start');
  new definitionCombiner({
    groups: path.join(serverRoot, 'lib', 'definitions', 'groups'),
    addonsFolder: path.join(serverRoot, 'lib', 'definitions', 'entityAddons'),
  }).loadDefinitions();
  MARK('afterDefinitions');
  GLOBAL.loadRooms(false);
  MARK('afterLoadRooms');
  global.__SITES = [];
  global.__recordSites = false;
  {
    const raw = Math.random;
    Math.random = function () {
      if (global.__recordSites) {
        const fr = (new Error().stack || '').split(String.fromCharCode(10)).slice(2);
        const named = [];
        for (const f of fr) {
          const m = f.match(/([^\\/(]+\.js):(\d+):\d+/);
          if (m) named.push(m[1] + ':' + m[2]);
          if (named.length >= 3) break;
        }
        // Frame 0 is often random.js itself; report the first caller outside it,
        // keeping the helper name so the two together read as "who called what".
        const helper = named[0] || '?';
        const caller = named.find(x => !x.startsWith('random.js')) || '?';
        global.__SITES.push(helper.startsWith('random.js') ? caller + ' via ' + helper : helper);
      }
      return raw();
    };
  }

  if (Config.load_all_mockups) global.loadAllMockups();

  if (args.bots != null) Config.bot_cap = args.bots;

  // server.js:262 defines this; game.js:261 calls it once the room is up.
  global.onServerLoaded = () => {};

  // server.js:266-268 — the "loaded via the main server" path. It is the only boot
  // that stays on this thread and never binds a port, which is exactly what we want.
  global.launchedOnMainServer = true;
  global.servers.push({ loadedViaMainServer: true });

  const { gameServer } = require(path.join(serverRoot, 'game.js'));
  const { gameHandler } = require(path.join(serverRoot, 'game', 'index.js'));

  const gamemodes = args.gamemode.split(',').map(s => s.trim()).filter(Boolean);

  global.__recordSites = true;
  const manager = new gameServer(
    Config.host,                          // host
    Config.port,                          // port (never bound — see determinism.js)
    gamemodes,                            // gamemode
    'Harness',                            // region
    'Local',                              // serverHost
    'Harness',                            // location
    { id: 'harness', maxPlayers: 1 },     // webProperties
    {},                                   // properties (per-server Config overrides)
    false, false, false,                  // featured / unlisted / private
    false                                 // parentPort: falsy => no worker, no web server
  );

  global.__recordSites = false;
  MARK('afterGameServer');
  return { manager, gameHandler };
}

// ---------------------------------------------------------------------------
// output
// ---------------------------------------------------------------------------
// JSON.stringify turns NaN/Infinity into null, which would hide exactly the kind of
// divergence this harness is meant to catch. Tag them instead.
function num(v) {
  if (typeof v !== 'number') return v === undefined ? null : v;
  if (Number.isFinite(v)) return v;
  if (Number.isNaN(v)) return 'NaN';
  return v > 0 ? 'Infinity' : '-Infinity';
}

// Field order here is the field order in the file. Keep it stable.
function snapshotEntity(e) {
  return {
    id: e.id,
    index: e.index === undefined ? null : String(e.index),
    type: e.type === undefined ? null : e.type,
    label: e.label === undefined ? null : e.label,
    team: num(e.team),
    x: num(e.x),
    y: num(e.y),
    vx: num(e.velocity ? e.velocity.x : undefined),
    vy: num(e.velocity ? e.velocity.y : undefined),
    size: num(e.size),
    facing: num(e.facing),
    health: num(e.health ? e.health.amount : undefined),
    healthMax: num(e.health ? e.health.max : undefined),
    shield: num(e.shield ? e.shield.amount : undefined),
    shieldMax: num(e.shield ? e.shield.max : undefined),
    alpha: num(e.alpha),
    master: e.master && e.master !== e ? e.master.id : e.id,
    dead: e.isDead ? !!e.isDead() : null,
  };
}

function snapshot(tick) {
  const ids = [];
  for (const id of global.entities.keys()) ids.push(id);
  ids.sort((a, b) => a - b);

  const list = new Array(ids.length);
  for (let i = 0; i < ids.length; i++) list[i] = snapshotEntity(global.entities.get(ids[i]));

  return {
    tick,
    time: num(det.clock.ms),
    rngCalls: det.rngCalls,
    nextEntityId: global.entitiesIdLog,
    count: list.length,
    entities: list,
  };
}

class LineWriter {
  constructor(file) {
    fs.mkdirSync(path.dirname(path.resolve(file)), { recursive: true });
    this.fd = fs.openSync(file, 'w');
    this.buf = [];
    this.bytes = 0;
    this.total = 0;
    this.lines = 0;
  }
  write(line) {
    this.buf.push(line);
    this.bytes += line.length + 1;
    this.lines++;
    if (this.bytes >= 1 << 18) this.flush();
  }
  flush() {
    if (!this.buf.length) return;
    const chunk = this.buf.join('\n') + '\n';
    fs.writeSync(this.fd, chunk);
    this.total += Buffer.byteLength(chunk);
    this.buf.length = 0;
    this.bytes = 0;
  }
  close() { this.flush(); fs.closeSync(this.fd); }
}

// ---------------------------------------------------------------------------
// main
// ---------------------------------------------------------------------------
function main() {
  muteGame();
  let manager, gameHandler;
  try {
    ({ manager, gameHandler } = boot());
  } finally {
    unmuteGame();
  }

  const handler = manager.gameHandler;

  // game/index.js:515 arms the game loop on a setInterval. The harness drives the
  // tick body itself so the count is exact, so that one interval has to go. The other
  // three (maintain 1000ms, other 200ms, heal Config.regenerate_tick) stay armed and
  // fire off the virtual clock at their real rates, in their real order.
  if (!handler.harnessGameLoopTimer) {
    throw new Error('gameHandler.harnessGameLoopTimer missing — re-run tools/harness/setup.js');
  }
  clearInterval(handler.harnessGameLoopTimer);

  const cycleSpeed = manager.room.cycleSpeed; // game.js:378 => 1000 / game_speed / 30
  const writer = new LineWriter(args.out);

  const started = process.hrtime.bigint();
  let crashed = null;

  muteGame();
  try {
    for (let tick = 0; tick < args.ticks; tick++) {
      // Advance the clock to this tick's deadline, firing everything due on the way.
      // Computed from the counter rather than accumulated, so it cannot drift.
      det.advanceTo((tick + 1) * cycleSpeed);

      // The body of the interval at game/index.js:519-523, verbatim and in order.
      //
      // Two things from that interval are deliberately not mirrored:
      //   :517  `if (this.checkUsers())` — gates the whole body on at least one connected
      //         socket. The harness never opens one, so honouring it would tick nothing at
      //         all. Consequence: maintainloop's boss spawner (:387) checks it too, so
      //         natural bosses never appear here. See docs/harness.md.
      //   :518  the try/catch, which calls this.stop() and swallows the error. The harness
      //         wants the stack, so it catches at the outer level and reports instead.
      { const P=(n,f)=>{const a=det.rngCalls;f();const b=det.rngCalls;if(b!==a)PROBE[n]=(PROBE[n]||0)+(b-a);};
        P('gameloop',()=>handler.gameloop());
        P('syncedDelaysLoop',()=>global.syncedDelaysLoop());
        P('foodloop',()=>{ if (Config.enable_food) handler.foodloop(); });
        P('roomLoop',()=>manager.roomLoop());
        P('quickloop',()=>manager.gamemodeManager.request('quickloop')); }

      writer.write(JSON.stringify(snapshot(tick)));
    }
  } catch (e) {
    crashed = e;
  } finally {
    unmuteGame();
    writer.close();
  }

  const elapsedNs = Number(process.hrtime.bigint() - started);
  const secs = elapsedNs / 1e9;

  if (crashed) {
    console.error(`\nsimulation threw on tick ${writer.lines}:`);
    console.error(crashed && crashed.stack ? crashed.stack : String(crashed));
  }

  // Let go of everything the game armed. These are virtual, so this is bookkeeping
  // rather than event-loop hygiene — but it makes the pending count meaningful.
  const pendingBefore = det.pendingTimers();
  handler.stop();
  det.clearAllTimers();

  console.log(JSON.stringify({
    seed: args.seed,
    gamemode: args.gamemode,
    ticks: writer.lines,
    entities: global.entities.size,
    rngCalls: det.rngCalls,
    cycleSpeedMs: cycleSpeed,
    virtualMs: det.clock.ms,
    bytes: writer.total,
    seconds: +secs.toFixed(3),
    ticksPerSecond: secs > 0 ? +(writer.lines / secs).toFixed(1) : null,
    virtualTimersPending: pendingBefore,
    out: args.out,
    PROBE_perTickDraws: PROBE,
    PROBE_roomSetupOrderFull: process.argv.includes('--fullsites')
      ? (global.__SITES || []).map((site, i) => i + ' ' + site)
      : undefined,
    PROBE_roomSetupOrder: (() => {
      const seen = new Map();
      const S = global.__SITES || [];
      for (let i = 0; i < S.length; i++) if (!seen.has(S[i])) seen.set(S[i], i);
      return [...seen.entries()].sort((a, b) => a[1] - b[1]).slice(0, 12)
        .map(([site, at]) => site + ' @' + at);
    })(),
    PROBE_roomSetupSites: (() => {
      const by = {};
      for (const x of (global.__SITES || [])) by[x] = (by[x] || 0) + 1;
      return Object.fromEntries(Object.entries(by).sort((a, b) => b[1] - a[1]));
    })(),
  }, null, 2));

  // No process.exit() — if a real handle leaked, node hangs here and we want to know.
  // stdio shows up as TTY/PipeWrap/FileWrap depending on how the process was invoked;
  // anything else is a leak worth shouting about.
  const stdio = new Set(['TTY', 'PipeWrap', 'FileWrap', 'FileHandle', 'Immediate', 'TickObject']);
  const handles = process.getActiveResourcesInfo().filter(h => !stdio.has(h));
  if (handles.length) console.error('active resources at exit:', handles.join(', '));

  process.exitCode = crashed ? 1 : 0;
}

main();
