const {combineStats, LayeredBoss, makeMenu, setTurretProjectileRecoil} = require('../../facilitators.js')
const {base} = require('../../constants.js')
const g = require('../../gunvals.js')
const preset = require('../../presets.js')

// Since this is the first file loaded from groups, we'll also load the important stuff we need for every other file before this so nothing breaks
require('../generics.js')
require('../food.js')
require('../projectiles.js')
require('../tanks.js')
require('../turrets.js')
require('../hats.js')

Class.celestial = {
    PARENT: "miniboss",
    LABEL: "Celestial",
    SKILL: [6, 9, 9, 9, 1, 9, 9, 9, 4, 0],
    VALUE: 1e6,
    SHAPE: 9,
    SIZE: 45,
    CONTROLLERS: [["minion", {turnwiserange: 360}]],
    BODY: {
        FOV: 1,
        HEALTH: 1500,
        SHIELD: 75,
        REGEN: base.REGEN * 0.3,
        SPEED: base.SPEED * 0.5,
        DAMAGE: 12,
    },
    ON: [preset.on.retrograde_self_destruct]
}
Class.rogueCelestial = {
    PARENT: "celestial",
    LABEL: "Rogue Celestial",
    COLOR: "darkGrey",
}

Class.menu_celestials = makeMenu("Celestials", {upgrades: [
    'paladin',
    'freyja',
    'zaphkiel',
    'nyx',
    'theia',
    'atlas',
    'rhea',
    'hyperion',
    'aether',
    'styx',
    'eros',
    'tethys',
    'iapetus',
    'apollo',
    'hera',
    'sif',
    'freyr',
    'tyr',
    'hjordis',
    'vor',
    'alcis',
    'baldr',
    'dellingr',
    'ullr',
    'isis',
    'nephthys',
    'osiris',
    'horus',
    'anubis',
    'khonsu',
    'ptah',
    'julius',
    'genghis',
    'napoleon',
], color: 'lime', boxColor: 'lime', shape: 9.5, tooltip: preset.tooltip.menu_lag})

let paladin = new LayeredBoss(null, "Paladin", "celestial", 9, "purple", "baseTrapTurret", 6.5, 5.5);
paladin.addLayer({gun: {
    POSITION: [3.8, 6, 1.4, 8, 0, null, 0],
    PROPERTIES: {
        SHOOT_SETTINGS: combineStats([g.drone, g.summoner, g.destroyer, {health: 1.4, damage: 1.4, resist: 1.2, density: 1.8, maxSpeed: 1.325}]),
        TYPE: ["exorcistorDrone", {INDEPENDENT: true}],
        AUTOFIRE: true,
        SYNCS_SKILLS: true,
        STAT_CALCULATOR: "drone",
        WAIT_TO_CYCLE: true,
    },
}}, true, null, 16);
paladin.addLayer({turret: {
    POSITION: [10, 7.5, 0, null, 160, 0],
    TYPE: ["swarmerTurret", {GUN_STAT_SCALE: {speed: 1.45, maxSpeed: 0.5, health: 1.3, range: 1.3}}],
}}, true, 6);

let freyja = new LayeredBoss(null, "Freyja", "celestial", 9, "lime", "baseTrapTurret", 6.5, 5.5);
freyja.addLayer({turret: {
    POSITION: [8.5, 9, 0, null, 180, 0],
    TYPE: ["cruiserTurret", {GUN_STAT_SCALE: {health: 1.2, damage: 1.3, speed: 1.1, maxSpeed: 1.1, resist: 1.05}}],
}});
freyja.addLayer({turret: {
    POSITION: [10.6, 7.5, 0, null, 160, 0],
    TYPE: ["auto4gun", {GUN_STAT_SCALE: {health: 1.2, damage: 1.2, speed: 1.15, maxSpeed: 0.9, resist: 1.2}}],
}}, true, 6);

let zaphkiel = new LayeredBoss(null, "Zaphkiel", "celestial", 9, "orange", "baseTrapTurret", 6.5, 5.5);
zaphkiel.addLayer({gun: {
    POSITION: [3.8, 6, 1.4, 8, 0, null, 0],
    PROPERTIES: {
        SHOOT_SETTINGS: combineStats([g.drone, g.summoner, g.destroyer, {health: 1.4, damage: 1.4, resist: 1.2, density: 1.8, maxSpeed: 1.325}]),
        TYPE: ["enchantressDrone", {INDEPENDENT: true}],
        AUTOFIRE: true,
        SYNCS_SKILLS: true,
    },
}}, true, null, 16);
zaphkiel.addLayer({turret: {
    POSITION: [10, 7.5, 0, null, 160, 0],
    TYPE: [setTurretProjectileRecoil("skimmerTurret", 0.65), {COLOR: "grey", INDEPENDENT: true, GUN_STAT_SCALE: {maxSpeed: 0.65}}],
}}, true, 6);

let nyx = new LayeredBoss(null, "Nyx", "celestial", 9, "pink", "baseTrapTurret", 6.5, 5.5);
nyx.addLayer({gun: {
    POSITION: [3.8, 7, -1.4, 8, 0, null, 0],
    PROPERTIES: {
        SHOOT_SETTINGS: combineStats([g.minion, { size: 0.7, maxSpeed: 0.85, damage: 0.8 }]),
        TYPE: ["minion", {INDEPENDENT: true,}],
        AUTOFIRE: true,
        SYNCS_SKILLS: true,
    },
}}, true, null, 16);
nyx.addLayer({turret: {
    POSITION: [10, 7.5, 0, null, 160, 0],
    TYPE: [setTurretProjectileRecoil("rocketeerTurret", 0.5), { INDEPENDENT: true, GUN_STAT_SCALE: {maxSpeed: 0.5} }],
}}, true, 6);

let theia = new LayeredBoss(null, "Theia", "celestial", 9, "gold", "baseTrapTurret", 6.5, 5.5);
theia.addLayer({gun: {
    POSITION: [3.8, 6, 1.4, 8, 0, null, 1],
    PROPERTIES: {
        SHOOT_SETTINGS: combineStats([g.drone, g.summoner, g.destroyer, {health: 1.4, damage: 1.4, resist: 1.2, density: 1.8, maxSpeed: 1.325}]),
        TYPE: ["summonerDrone", {INDEPENDENT: true}],
        AUTOFIRE: true,
        WAIT_TO_CYCLE: true,
        SYNCS_SKILLS: true,
    },
}}, true, null, 35);
theia.addLayer({turret: {
    POSITION: [10, 7.5, 0, null, 160, 0],
    TYPE: ["twisterTurret", {INDEPENDENT: true, COLOR: "grey", GUN_STAT_SCALE: {health: 1.3, damage: 1.1, resist: 1.2, speed: 1.1, maxSpeed: 0.8}}],
}}, true, 6);

let atlas = new LayeredBoss(null, "Atlas", "celestial", 9, "#EDB854", "baseTrapTurret", 6.5, 5.5);
atlas.addLayer({turret: {
    POSITION: [7, 9, 0, null, 180, 0],
    TYPE: "artilleryTurret",
}});
atlas.addLayer({turret: {
    POSITION: [10.5, 8, 0, null, 160, 0],
    TYPE: ["nailgunTurret", {GUN_STAT_SCALE: {speed: 1.1, maxSpeed: 1.1, resist: 1.3}}],
}}, true, 6);

let rhea = new LayeredBoss(null, "Rhea", "celestial", 9, "#D7B070", "baseTrapTurret", 6.5, 5.5);
rhea.addLayer({turret: {
    POSITION: [8.5, 9, 0, null, 180, 0],
    TYPE: "wrenchTurret",
}});
rhea.addLayer({turret: {
    POSITION: [10.5, 8, 0, null, 160, 0],
    TYPE: "crowbarTurret",
}}, true, 6);

let hyperion = new LayeredBoss(null, "Hyperion", "celestial", 9, "#aec996", "baseTrapTurret", 6.5, 5.5);
hyperion.addLayer({turret: {
    POSITION: [8.5, 9, 0, null, 180, 0],
    TYPE: "destroyerTurret",
}});
hyperion.addLayer({turret: {
    POSITION: [10.5, 8, 0, null, 160, 0],
    TYPE: "skimmerTurret", // should be old sidewinder
}}, true, 6);
// color: light - #aec996, dark - #36A5B3, natural - #a0b36e, solarized dark - #399c9e, lyric - #8c3131

let aether = new LayeredBoss(null, "Aether", "celestial", 9, "#dca171", "baseTrapTurret", 6.5, 5.5);
aether.addLayer({turret: {
    POSITION: [8.5, 9, 0, null, 180, 0],
    TYPE: "rifleTurret",
}});
aether.addLayer({turret: {
    POSITION: [10.5, 8, 0, null, 160, 0],
    TYPE: "streamlinerTurret",
}}, true, 6);

let styx = new LayeredBoss(null, "Styx", "celestial", 9, "#EFA5A5", "baseTrapTurret", 6.5, 5.5);
styx.addLayer({turret: {
    POSITION: [8.5, 9, 0, null, 180, 0],
    TYPE: "gunnerTurret",
}});
styx.addLayer({turret: {
    POSITION: [10.5, 8, 0, null, 160, 0],
    TYPE: "hunterTurret",
}}, true, 6);

let eros = new LayeredBoss(null, "Eros", "celestial", 9, "#D1818A", "baseTrapTurret", 6.5, 5.5);
eros.addLayer({turret: {
    POSITION: [8.5, 9, 0, null, 180, 0],
    TYPE: "sprayerTurret",
}});
eros.addLayer({turret: {
    POSITION: [10.5, 8, 0, null, 160, 0],
    TYPE: "singleTurret",
}}, true, 6);

let tethys = new LayeredBoss(null, "Tethys", "celestial", 9, "#E2CF58", "baseTrapTurret", 6.5, 5.5);
tethys.addLayer({turret: {
    POSITION: [7.5, 9, 0, null, 180, 0],
    TYPE: ["bentBuilderTurret", {GUN_STAT_SCALE: {reload: 1.1, health: 0.91}}],
}});
tethys.addLayer({turret: {
    POSITION: [11.5, 8, 0, null, 160, 0],
    TYPE: ["boomerTurret", {COLOR: "grey"}],
}}, true, 6);

let iapetus = new LayeredBoss(null, "Iapetus", "celestial", 9, "#ED95AE", "baseTrapTurret", 6.5, 5.5);
iapetus.addLayer({turret: {
    POSITION: [8.5, 9, 0, null, 180, 0],
    TYPE: "volleyTurret",
}});
iapetus.addLayer({turret: {
    POSITION: [10.5, 8, 0, null, 160, 0],
    TYPE: "rimflakTurret",
}}, true, 6);

let apollo = new LayeredBoss(null, "Apollo", "celestial", 9, "#D4C1A1", "baseTrapTurret", 6.5, 5.5);
apollo.addLayer({turret: {
    POSITION: [8.5, 9, 0, null, 180, 0],
    TYPE: ["blunderbussTurret", {GUN_STAT_SCALE: {reload: 1.1, health: 1.1}}],
}});
apollo.addLayer({turret: {
    POSITION: [11, 9, 0, null, 180, 0],
    TYPE: "heavyTurret", // https://discord.com/channels/1004907608018264094/1051533268861857863/1445496968406368266
}});

let hera = new LayeredBoss(null, "Hera", "celestial", 9, "#A472C3", "baseTrapTurret", 6.5, 5.5);
hera.addLayer({turret: {
    POSITION: [8.5, 9, 0, null, 180, 0],
    TYPE: "barricadeTurret",
}});
hera.addLayer({turret: {
    POSITION: [10.5, 8, 0, null, 160, 0],
    TYPE: "engineerTurret",
}});

let sif = new LayeredBoss(null, "Sif", "celestial", 9, "#C7E071", "baseTrapTurret", 6.5, 5.5);
sif.addLayer({turret: {
    POSITION: [8.5, 9, 0, null, 180, 0],
    TYPE: "warkTurret",
}});
sif.addLayer({turret: {
    POSITION: [10.5, 8, 0, null, 160, 0],
    TYPE: "crossbowTurret",
}});

let freyr = new LayeredBoss(null, "Freyr", "celestial", 9, "#E98D83", "baseTrapTurret", 6.5, 5.5);
freyr.addLayer({gun: {
    POSITION: [3.8, 6, 1.4, 8, 0, null, 0],
    PROPERTIES: {
        SHOOT_SETTINGS: combineStats([g.drone, g.summoner, g.destroyer, {health: 1.4, damage: 1.4, resist: 1.2, density: 1.8, maxSpeed: 1.325}]),
        TYPE: ["enchantressDrone", {INDEPENDENT: true}], // up to devs discussion or just waiting until we see it officially to determine what this'll be
        AUTOFIRE: true,
        SYNCS_SKILLS: true,
    },
}}, true, null, 16);
freyr.addLayer({turret: {
    POSITION: [10.5, 8, 0, null, 160, 0],
    TYPE: "carrierTurret",
}});

let tyr = new LayeredBoss(null, "Tyr", "celestial", 9, "#D78DCA", "baseTrapTurret", 6.5, 5.5);
tyr.addLayer({turret: {
    POSITION: [8.5, 9, 0, null, 180, 0],
    TYPE: "machineGunTurret",
}});
tyr.addLayer({turret: {
    POSITION: [10.5, 8, 0, null, 160, 0],
    TYPE: "musketTurret",
}});

let hjordis = new LayeredBoss(null, "Hjordis", "celestial", 9, "#988AC7", "baseTrapTurret", 6.5, 5.5); // renamed from "Gersemi"
hjordis.addLayer({turret: {
    POSITION: [8.5, 9, 0, null, 180, 0],
    TYPE: "tripleShotTurret",
}});
hjordis.addLayer({turret: {
    POSITION: [10.5, 8, 0, null, 160, 0],
    TYPE: "constructorTurret",
}});

let vor = new LayeredBoss(null, "Vor", "celestial", 9, "#C5D07A", "baseTrapTurret", 6.5, 5.5);
vor.addLayer({turret: {
    POSITION: [7.5, 9, 0, null, 180, 0],
    TYPE: "tripletTurret",
}});
vor.addLayer({turret: {
    POSITION: [10.5, 8, 0, null, 160, 0],
    TYPE: "builderTurret",
}});

let alcis = new LayeredBoss(null, "Alcis", "celestial", 9, "#E99965", "baseTrapTurret", 6.5, 5.5);
alcis.addLayer({turret: {
    POSITION: [8.5, 9, 0, null, 180, 0],
    TYPE: "trapperTurret",
}});
alcis.addLayer({turret: {
    POSITION: [10.5, 8, 0, null, 160, 0],
    TYPE: "spreadshotTurret",
}});

let baldr = new LayeredBoss(null, "Baldr", "celestial", 9, "#EFBC69", "baseTrapTurret", 6.5, 5.5);
baldr.addLayer({turret: {
    POSITION: [8.5, 9, 0, null, 180, 0],
    TYPE: "minigunTurret",
}});
baldr.addLayer({turret: {
    POSITION: [10.5, 8, 0, null, 160, 0],
    TYPE: "rangerTurret",
}});

let dellingr = new LayeredBoss(null, "Dellingr", "celestial", 9, "#BE82D1", "baseTrapTurret", 6.5, 5.5);
dellingr.addLayer({turret: {
    POSITION: [8.5, 9, 0, null, 180, 0],
    TYPE: "sniperTurret",
}});
dellingr.addLayer({turret: {
    POSITION: [10.5, 8, 0, null, 160, 0],
    TYPE: "pentaShotTurret",
}});

let ullr = new LayeredBoss(null, "Ullr", "celestial", 9, "#CB4969", "baseTrapTurret", 6.5, 5.5);
ullr.addLayer({turret: {
    POSITION: [8.5, 9, 0, null, 180, 0],
    TYPE: "ullrLowerTurret",
}}, true, null, 32);
ullr.addLayer({turret: {
    POSITION: [10.5, 8, 0, null, 160, 0],
    TYPE: "dualTurret",
}});

let isis = new LayeredBoss(null, "Isis", "celestial", 9, "#C78795", "baseTrapTurret", 6.5, 5.5);
isis.addLayer({turret: {
    POSITION: [8.5, 9, 0, null, 180, 0],
    TYPE: "isisLowerTurret",
}});
isis.addLayer({turret: {
    POSITION: [10.5, 8, 0, null, 160, 0],
    TYPE: "predatorTurret",
}});

let nephthys = new LayeredBoss(null, "Nephthys", "celestial", 9, "#679DB4", "baseTrapTurret", 6.5, 5.5);
nephthys.addLayer({gun: {
    POSITION: [4.6, 6, 1.4, 8, 0, null, 0],
    PROPERTIES: {
        SHOOT_SETTINGS: combineStats([g.drone, g.summoner, g.destroyer, {health: 1.4, damage: 1.4, resist: 1.2, density: 1.8, maxSpeed: 1.325}]),
        TYPE: ["exorcistorDrone", {INDEPENDENT: true}], // up to devs discussion or just waiting until we see it officially to determine what this'll be
        AUTOFIRE: true,
        SYNCS_SKILLS: true,
    },
}}, true, null, 16);
nephthys.addLayer({turret: {
    POSITION: [10.5, 8, 0, null, 160, 0],
    TYPE: "rangerTurret",
}});

let osiris = new LayeredBoss(null, "Osiris", "celestial", 9, "#A3BF42", "baseTrapTurret", 6.5, 5.5);
osiris.addLayer({turret: {
    POSITION: [8.5, 9, 0, null, 180, 0],
    TYPE: "fieldGunTurret",
}});
osiris.addLayer({turret: {
    POSITION: [10.5, 8, 0, null, 160, 0],
    TYPE: "beekeeperTurret",
}});

let horus = new LayeredBoss(null, "Horus", "celestial", 9, "#8BA867", "baseTrapTurret", 6.5, 5.5);
horus.addLayer({turret: {
    POSITION: [8.5, 9, 0, null, 180, 0],
    TYPE: ["basicTurret", { INDEPENDENT: true, GUN_STAT_SCALE: {health: 1.8, damage: 1.3} }],
}});
horus.addLayer({turret: {
    POSITION: [10.5, 8, 0, null, 160, 0],
    TYPE: ["basicTurret", { INDEPENDENT: true, GUN_STAT_SCALE: {health: 1.8, damage: 1.3} }],
}});

let anubis = new LayeredBoss(null, "Anubis", "celestial", 9, "#D66950", "baseTrapTurret", 6.5, 5.5);
anubis.addLayer({turret: {
    POSITION: [8.5, 9, 0, null, 180, 0],
    TYPE: ["basicTurret", { INDEPENDENT: true, GUN_STAT_SCALE: {health: 1.8, damage: 1.3} }],
}});
anubis.addLayer({turret: {
    POSITION: [10.5, 8, 0, null, 160, 0],
    TYPE: "annihilatorTurret"
}});

let khonsu = new LayeredBoss(null, "Khonsu", "celestial", 9, "#D36F90", "baseTrapTurret", 6.5, 5.5);
khonsu.addLayer({turret: {
    POSITION: [8.5, 9, 0, null, 180, 0],
    TYPE: "sprayerTurret"
}});
khonsu.addLayer({turret: {
    POSITION: [10.5, 8, 0, null, 160, 0],
    TYPE: "mortarTurret"
}});

let ptah = new LayeredBoss(null, "Ptah", "celestial", 9, "#69A1C9", "baseTrapTurret", 6.5, 5.5);
ptah.addLayer({turret: {
    POSITION: [8.5, 9, 0, null, 180, 0],
    TYPE: "ordnanceTurret"
}});
ptah.addLayer({turret: {
    POSITION: [10.5, 8, 0, null, 160, 0],
    TYPE: "focalTurret"
}});

// Rogue Celestials
let julius = new LayeredBoss(null, "Julius", "rogueCelestial", 9, "darkGrey", "baseTrapTurret", 6.5, 5.5); // ??? / Charon
julius.addLayer({turret: {
    POSITION: [8.5, 9, 0, null, 180, 0],
    TYPE: "juliusLowerTurret",
}});
julius.addLayer({turret: {
    POSITION: [10.5, 8, 0, null, 160, 0],
    TYPE: [setTurretProjectileRecoil("launcherTurret", 0.82), {GUN_STAT_SCALE: {health: 1.3, damage: 1.3, maxSpeed: 0.82}}],
}}, true, 6);

let genghis = new LayeredBoss(null, "Genghis", "rogueCelestial", 9, "darkGrey", "baseTrapTurret", 6.5, 5.5); // Tyr
genghis.addLayer({turret: {
    POSITION: [8.5, 9, 0, null, 180, 0],
    TYPE: "genghisLowerTurret",
}});
genghis.addLayer({turret: {
    POSITION: [10.5, 8, 0, null, 160, 0],
    TYPE: ["auto4gun", {GUN_STAT_SCALE: {speed: 1.2, maxSpeed: 0.85, health: 1.15, damage: 1.2, resist: 1.2}}],
}}, true, 6);

let napoleon = new LayeredBoss(null, "Napoleon", "rogueCelestial", 9, "darkGrey", "baseTrapTurret", 6.5, 5.5); // Fiolnir
napoleon.addLayer({turret: {
    POSITION: [8.5, 9, 0, null, 180, 0],
    TYPE: "napoleonLowerTurret",
}});
napoleon.addLayer({turret: {
    POSITION: [10.5, 8, 0, null, 160, 0],
    TYPE: "napoleonUpperTurret",
}}, true, 6);
