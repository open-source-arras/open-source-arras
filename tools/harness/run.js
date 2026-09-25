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
    spawnclass: null,
    checkusers: false,
    bosscooldown: null,
    notrace: false,
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
      // --spawnclass overrides Config.spawn_class, the class spawnBots defines every
      // bot from (game/index.js:446). Bots only ever upgrade along their own random
      // path, so several whole subsystems -- SHOOT_ON_DEATH guns, necro guns, the
      // assembler merge -- are unreachable from the stock `basic` in any run length.
      // This is the lever that puts them in a differential.
      case '--spawnclass': out.spawnclass = take(); break;
      // --checkusers makes gameHandler.checkUsers() answer true. It gates exactly one
      // thing the harness can otherwise never reach: maintainloop's boss spawner
      // (game/index.js:387). The harness opens no socket, so clients.length is 0 and
      // no run has ever spawned a natural boss.
      //
      // It overrides the METHOD, not the clients array, so everything that reads
      // clients.length itself -- tag.js:46, sandbox.js:6, the view builders -- carries
      // on seeing an empty room. cmd/gotrace's --checkusers is the same lever with the
      // same limit (room.RoomConfig.ForceCheckUsers).
      case '--checkusers': out.checkusers = true; break;
      // --bosscooldown overrides Config.boss_spawn_cooldown, which is 260 as shipped:
      // the counter ticks once per 1000ms maintain loop, so a boss is 260 seconds --
      // near enough 8,000 ticks -- into a run. Lowering it brings the wave into a
      // differential of a few hundred ticks.
      case '--bosscooldown': out.bosscooldown = Number(take()); break;
      // --notrace runs every tick and serialises none of them, which makes --out
      // pointless and therefore optional. JSON.stringify of ~220 entities per tick is
      // most of this program's wall clock at any useful length, on both sides, so it is
      // the flag to use when the question is how fast the simulation itself runs.
      // cmd/gotrace takes the same one.
      case '--notrace': out.notrace = true; break;
      case '--quiet': out.quiet = true; break;
      case '-h': case '--help':
        console.log('usage: node tools/harness/run.js --seed N --ticks N [--gamemode ffa] ' +
                    '[--bots N] [--spawnclass NAME] [--checkusers] [--bosscooldown N] ' +
                    '[--notrace] [--quiet] --out FILE');
        process.exit(0);
      default:
        console.error(`unknown argument: ${a}`);
        process.exit(2);
    }
  }
  if (!Number.isFinite(out.seed)) { console.error('--seed must be a number'); process.exit(2); }
  if (!Number.isInteger(out.ticks) || out.ticks < 0) { console.error('--ticks must be a non-negative integer'); process.exit(2); }
  if (!out.out && !out.notrace) { console.error('--out is required'); process.exit(2); }
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
  new definitionCombiner({
    groups: path.join(serverRoot, 'lib', 'definitions', 'groups'),
    addonsFolder: path.join(serverRoot, 'lib', 'definitions', 'entityAddons'),
  }).loadDefinitions();
  GLOBAL.loadRooms(false);

  if (Config.load_all_mockups) global.loadAllMockups();

  if (args.bots != null) Config.bot_cap = args.bots;
  // Set before the gamemode merge, exactly as bot_cap is, so a gamemode that spells
  // spawn_class itself still wins -- which is the JS ordering.
  if (args.spawnclass != null) Config.spawn_class = args.spawnclass;
  if (args.bosscooldown != null) Config.boss_spawn_cooldown = args.bosscooldown;

  // server.js:262 defines this; game.js:261 calls it once the room is up.
  global.onServerLoaded = () => {};

  // server.js:266-268 — the "loaded via the main server" path. It is the only boot
  // that stays on this thread and never binds a port, which is exactly what we want.
  global.launchedOnMainServer = true;
  global.servers.push({ loadedViaMainServer: true });

  const { gameServer } = require(path.join(serverRoot, 'game.js'));
  const { gameHandler } = require(path.join(serverRoot, 'game', 'index.js'));

  const gamemodes = args.gamemode.split(',').map(s => s.trim()).filter(Boolean);

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
  // file null means --notrace: count the ticks, keep no bytes, open nothing.
  constructor(file) {
    this.fd = null;
    if (file) {
      fs.mkdirSync(path.dirname(path.resolve(file)), { recursive: true });
      this.fd = fs.openSync(file, 'w');
    }
    this.buf = [];
    this.bytes = 0;
    this.total = 0;
    this.lines = 0;
  }
  write(line) {
    if (this.fd === null) { this.lines++; return; }
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
  close() { if (this.fd === null) return; this.flush(); fs.closeSync(this.fd); }
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

  // game/index.js:14 is `checkUsers = () => global.gameManager.clients.length >= 1`,
  // an instance property rather than a prototype method, so this replaces it outright.
  // See --checkusers for why, and for what it deliberately does not touch.
  if (args.checkusers) handler.checkUsers = () => true;

  // game/index.js:515 arms the game loop on a setInterval. The harness drives the
  // tick body itself so the count is exact, so that one interval has to go. The other
  // three (maintain 1000ms, other 200ms, heal Config.regenerate_tick) stay armed and
  // fire off the virtual clock at their real rates, in their real order.
  if (!handler.harnessGameLoopTimer) {
    throw new Error('gameHandler.harnessGameLoopTimer missing — re-run tools/harness/setup.js');
  }
  clearInterval(handler.harnessGameLoopTimer);

  const cycleSpeed = manager.room.cycleSpeed; // game.js:378 => 1000 / game_speed / 30
  const writer = new LineWriter(args.notrace ? null : args.out);

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
      handler.gameloop();
      global.syncedDelaysLoop();
      if (Config.enable_food) handler.foodloop();
      manager.roomLoop();
      manager.gamemodeManager.request('quickloop');

      writer.write(args.notrace ? '' : JSON.stringify(snapshot(tick)));
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
    // Bosses only ever spawn under --checkusers; reporting the count is how a run
    // says whether it actually reached the spawner rather than merely enabling it.
    bosses: handler.naturallySpawnedBosses.length,
    rngCalls: det.rngCalls,
    cycleSpeedMs: cycleSpeed,
    virtualMs: det.clock.ms,
    bytes: writer.total,
    seconds: +secs.toFixed(3),
    ticksPerSecond: secs > 0 ? +(writer.lines / secs).toFixed(1) : null,
    virtualTimersPending: pendingBefore,
    out: args.out,
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
