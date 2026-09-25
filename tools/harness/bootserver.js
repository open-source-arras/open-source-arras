// Boots the real game server in-process, the way run.js does, for the probes.
//
// It is run.js's boot() minus the harness flags, factored out because every probe
// needs the same forty lines: the .env, the loader, the definitions, the rooms,
// then a gameServer constructed on the "loaded via the main server" path -- the
// only boot that stays on this thread and never binds a port.
//
// Call determinism.install() BEFORE requiring this. The game tree reads
// Math.random, the clock and the timers at load, and a shim installed afterwards
// is a shim the game never sees.

'use strict';

const fs = require('fs');
const path = require('path');

// boot returns the manager plus the two things a probe always wants: a tick()
// that drives one game loop at the room's real cycle speed, and the serverRoot
// the fake socket needs for the protocol.
//
// The game loop's own interval is cleared. game/index.js:515 arms it, and a
// probe that left it running would tick on the virtual clock's schedule as well
// as its own -- run.js drops it for the same reason.
function boot(opts = {}) {
  const det = opts.det;
  if (!det) throw new Error('bootserver: pass the determinism api as opts.det');

  const serverRoot = path.join(__dirname, 'js', 'server');
  if (!fs.existsSync(serverRoot)) {
    throw new Error(`patched tree missing at ${serverRoot}\nrun: node tools/harness/setup.js`);
  }

  const dotenv = require(path.join(serverRoot, 'lib', 'dotenv.js'));
  const envFile = path.join(serverRoot, '.env');
  if (fs.existsSync(envFile)) {
    const env = dotenv(fs.readFileSync(envFile).toString());
    for (const k in env) process.env[k] = env[k];
  }

  const realLog = console.log;
  const realWarn = console.warn;
  if (opts.quiet !== false) {
    console.log = () => {};
    console.warn = () => {};
  }

  // loader.js installs Class, Config, entities, ran, definitionCombiner and
  // Entity onto global, which is why none of them are required by name here.
  const GLOBAL = require(path.join(serverRoot, 'loaders', 'loader.js'));
  new definitionCombiner({
    groups: path.join(serverRoot, 'lib', 'definitions', 'groups'),
    addonsFolder: path.join(serverRoot, 'lib', 'definitions', 'entityAddons'),
  }).loadDefinitions();
  GLOBAL.loadRooms(false);

  // Config overrides go here, between the definitions and the gameServer, which
  // is where run.js puts bot_cap and spawn_class -- before the gamemode merge, so
  // a gamemode that spells the same key itself still wins.
  for (const [k, v] of Object.entries(opts.config || {})) Config[k] = v;

  global.onServerLoaded = () => {};
  global.launchedOnMainServer = true;
  global.servers.push({ loadedViaMainServer: true });

  const { gameServer } = require(path.join(serverRoot, 'game.js'));
  const gamemodes = String(opts.gamemode || 'ffa').split(',').map(s => s.trim()).filter(Boolean);
  // maxPlayers is the server-list webProperty the spawn handler tests
  // (sockets.js:230). It defaults to 1 because one client is what a probe
  // usually wants; a probe that connects two must raise it, or the second is
  // kicked mid-handshake and then spawns anyway on a closed socket.
  const manager = new gameServer(
    Config.host, Config.port, gamemodes, 'Harness', 'Local', 'Harness',
    { id: 'harness', maxPlayers: opts.maxPlayers === undefined ? 1 : opts.maxPlayers },
    {}, false, false, false, false);
  global.gameManager = manager;

  console.log = realLog;
  console.warn = realWarn;

  const handler = manager.gameHandler;
  if (!handler.harnessGameLoopTimer) {
    throw new Error('gameHandler.harnessGameLoopTimer missing -- re-run tools/harness/setup.js');
  }
  clearInterval(handler.harnessGameLoopTimer);

  const cycleSpeed = manager.room.cycleSpeed;
  let ticks = 0;
  // The body of the interval at game/index.js:519-523, verbatim and in order --
  // the same five calls run.js makes, for the same reason. gameloop() alone is
  // not a tick: it leaves the food loop, the synced delays, the room loop and
  // the gamemode's quickloop unrun, and a probe built on that diverges from
  // both the real server and the port within a hundred ticks.
  //
  // checkUsers() is not mirrored. run.js skips it because it has no sockets; a
  // probe has one, so it would answer true anyway.
  const tick = () => {
    ticks++;
    // max, not the bare schedule. advance() can push the clock past the next
    // tick's deadline -- spawnClient's 20 ms poll does it routinely -- and
    // advanceTo assigns the target unconditionally, so the plain form walks the
    // clock BACKWARDS. Nothing in a real server does that, and a probe that let
    // it happen recorded a player who died one second before it spawned.
    det.advanceTo(Math.max(ticks * cycleSpeed, det.clock.ms));
    handler.gameloop();
    global.syncedDelaysLoop();
    if (Config.enable_food) handler.foodloop();
    manager.roomLoop();
    manager.gamemodeManager.request('quickloop');
  };

  return {
    manager,
    handler,
    serverRoot,
    cycleSpeed,
    tick,
    ticksRun: () => ticks,
    // advance moves the virtual clock without running a game loop, so a timer
    // firing can be attributed to itself rather than to a tick.
    advance: ms => det.advanceTo(det.clock.ms + ms),
  };
}

module.exports = { boot };
