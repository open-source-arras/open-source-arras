// Prints what the delayed "allow them to move" re-define in spawnBots actually
// installs on a bot (game/index.js:468-500), read out of the real loaded
// definitions rather than guessed at from the source text.
//
//   node tools/harness/probe-bot.js
'use strict';

require('../fdlibm-pow');
const fs = require('fs');
const path = require('path');

require('./determinism.js').install({ seed: 1 });

const serverRoot = path.join(__dirname, 'js', 'server');
const dotenv = require(path.join(serverRoot, 'lib', 'dotenv.js'));
const envFile = path.join(serverRoot, '.env');
if (fs.existsSync(envFile)) {
  const env = dotenv(fs.readFileSync(envFile).toString());
  for (const k in env) process.env[k] = env[k];
}

const realLog = console.log; console.log = () => {};
const GLOBAL = require(path.join(serverRoot, 'loaders', 'loader.js'));
new definitionCombiner({
  groups: path.join(serverRoot, 'lib', 'definitions', 'groups'),
  addonsFolder: path.join(serverRoot, 'lib', 'definitions', 'entityAddons'),
}).loadDefinitions();
GLOBAL.loadRooms(false);
console.log = realLog;

const out = {};
out.spawnClass = Config.spawn_class;
out.botStartLevel = Config.bot_start_level;

const bot = Class.bot;
out.classBot = bot
  ? { CONTROLLERS: bot.CONTROLLERS, FACING_TYPE: bot.FACING_TYPE, AI: bot.AI }
  : null;

const CC = Class[Config.spawn_class];
out.spawnClassDef = CC
  ? {
      CONTROLLERS: CC.CONTROLLERS,
      FACING_TYPE: CC.FACING_TYPE,
      AI: CC.AI,
      HEALING_TANK: CC.HEALING_TANK,
      GUNS: CC.GUNS ? CC.GUNS.length : 0,
    }
  : null;

// The merged list the setTimeout body computes.
if (bot) {
  out.merged = CC && CC.CONTROLLERS
    ? [...bot.CONTROLLERS, ...CC.CONTROLLERS]
    : bot.CONTROLLERS;
  out.mergedFacing = CC && CC.FACING_TYPE ? CC.FACING_TYPE : bot.FACING_TYPE;
}

// The upgrade menu a fresh bot has, which is what quickMaintainLoop indexes into.
const Entity = require(require('path').join(serverRoot, 'game', 'entities', 'entity.js')).Entity
  || require(require('path').join(serverRoot, 'game', 'entities', 'entity.js'));
try {
  const o = new (Entity.Entity || Entity)({ x: 0, y: 0 });
  o.define(Config.spawn_class);
  o.define({ CONTROLLERS: ["nearestDifferentMaster"] }, false, false, false);
  out.freshBotUpgrades = {
    length: o.upgrades.length,
    rows: o.upgrades.map((u, i) => ({ i, level: u.level, tier: u.tier, branch: u.branch,
      index: u.index, redefineAll: u.redefineAll,
      classes: (u.class || []).map(c => (typeof c === 'string' ? c : (c && c.LABEL) || '?')) })),
  };
} catch (e) { out.freshBotUpgrades = 'ERR: ' + e.message; }
console.log(JSON.stringify(out, null, 1));
