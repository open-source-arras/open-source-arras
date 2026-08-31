const { makeMenu } = require('../facilitators.js');

// Tank Menu(s)
if (Config.teams == 1) {
    unavailable_tanks = ['smasher', 'underseer']
} else {
    unavailable_tanks = ['healer']
};
Class.menu_tanks = makeMenu("Tanks", {upgrades: [Config.spawn_class, "menu_unused", "menu_dailyTanks", "menu_mapEntities", "menu_motherships", "menu_fun", "arenaCloser", ...unavailable_tanks]});

Class.menu_unused = makeMenu("Unused", {upgrades: ["1", "2", "3"].map(x => "menu_unused_T" + x), tooltip: "Tanks that were fully created and likely intended to be added, but never were."});
Class.menu_unused_T1 = makeMenu("Unused (Tier 1)", {upgrades: [
    'flail',
    'whirlwind_bent',
], boxLabel: "Tier 1 (Lv.15)"});
Class.menu_unused_T2 = makeMenu("Unused (Tier 2)", {upgrades: [
    'autoTrapper',
    'repeater',
    'spiral',
    "volute",
    'whirlwind_old',
], boxLabel: "Tier 2 (Lv.30)"});
Class.menu_unused_T3 = makeMenu("Unused (Tier 3)", {upgrades: [
    'blunderbuss',
    'cocci',
    'dreadnought_old',
    'mender',
    'oroboros',
    'prodigy',
    'quadBuilder',
    'rimfire_old',
    'rocket',
    'wrangler',
], boxLabel: "Tier 3 (Lv.45)"});

Class.menu_dailyTanks = makeMenu("Daily Tanks", {upgrades: [
    'whirlwind',
    'master',
    'undertow',
    'literallyAMachineGun',
    'literallyATank',
    'rocketeer',
    'jumpSmasher',
    'rapture',
], boxColor: "rainbow", tooltip: "Tanks that were part of arras.io's December 2023 Daily Tanks event, in the order they were first made available.\n" + "The Daily Tank for a server can be added or changed in config."});

Class.menu_mapEntities = makeMenu("Map Entities", {upgrades: ["menu_dominators", "baseProtector", "antiTankMachineGun", "menu_sanctuaries"], props: [{TYPE: "dominationBody", POSITION: {SIZE: 22}}], tooltip: "Tanks that spawn as part of the map layout."});
Class.menu_dominators = makeMenu("Dominators", {upgrades: ["destroyer", "gunner", "trapper"].map(x => x + "Dominator"), props: [{TYPE: "dominationBody", POSITION: {SIZE: 22}}]});
Class.menu_sanctuaries = makeMenu("Sanctuaries", {upgrades: ["1", "2", "3", "4", "5", "6"].map(x => "sanctuaryTier" + x), props: [{TYPE: "dominationBody", POSITION: {SIZE: 22}}, {TYPE: "healerHat", POSITION:  {SIZE: 13, LAYER: 1}}]});

Class.menu_motherships = makeMenu("Motherships", {upgrades: ["mothership", "flagship", "turkey"], shape: 16, tooltip: "Giant Enemy Tanks that you attack the weak points of for massive damage."});
Class.menu_fun = makeMenu("Fun", {upgrades: [
    "alas",
    "arrasPolice",
    //"average4tdmScore",
    //"averageL39Hunt",
    //"beeman",
    "bigBalls",
    "cxATMG",
    "damoclone",
    "fat456",
    "heptaAutoBasic",
    "machineShot",
    "meDoingYourMom",
    "meOnMyWayToDoYourMom",
    "protector",
    //"quadCyclone",
    "riptide",
    //"schoolShooter",
    "smasher3",
    "tetraGunner",
    //"theAmalgamation",
    //"theConglomerate",
    "tracker3",
    "wifeBeater",
    "worstTank",
], tooltip: "Tanks that, let's be honest, aren't used for a good reason.\n" + "DISCLAIMER: Some of the content in here may be in poor taste. Blame the arras.io devs, not us."});
Class.menu2_bosses = makeMenu("Bosses", {upgrades: ["sentries", "eliteBosses", "mysticals", "nesters", "rogues", "rammers", "terrestrials", "celestials", "eternals", "devBosses"].map(x => "menu_" + x), rerootTree: "menu2_bosses"});
