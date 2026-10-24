const { combineStats, addUpgrades, removeUpgrades, weaponArray, weaponMirror, weaponStack, makeAuto, makeBattle, makeBird, makeCap, makeFore, makeGuard, makeGunner, makeOver } = require("../../facilitators.js");
const { base } = require("../../constants.js");
const g = require("../../gunvals.js");
const preset = require("../../presets.js");

// This file is currently empty. Pretend there's Classes here.

// Existing Upgrade Management
const enable_missing_tanks = require("../../groups/tanks/armsRace.js");
if (!enable_missing_tanks) return;

if (Config.arms_race) {

};
