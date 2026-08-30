const {combineStats, makeMenu, weaponArray} = require('../../facilitators.js')
const {base} = require('../../constants.js')
const g = require('../../gunvals.js')

Class.elite = {
    PARENT: "miniboss",
    LABEL: "Elite Crasher",
    COLOR: 'pink',
    SHAPE: 3,
    SIZE: 27,
    VALUE: 15e4,
    SKILL: [5, 9, 9, 9, 5, 1, 0, 9, 1, 0],
    BODY: {
        FOV: 1.25,
        SPEED: 0.15 * base.SPEED,
        HEALTH: 9 * base.HEALTH,
        DAMAGE: 4.5 * base.DAMAGE,
        REGEN: 0.5 * base.REGEN,
    },
}

// Dev Menus
Class.menu_elites = makeMenu("Elites", {upgrades: [
    "eliteDestroyer",
    "eliteGunner",
    "eliteSprayer",
    "eliteBattleship",
    "eliteSpawner",
    "eliteTrapGuard",
    "eliteSpinner",
    "eliteSkimmer",
    "menu_legions",
    "menu_deltas",
], color: 'pink', boxColor: 'pink', shape: 3.5})

Class.menu_legions = makeMenu("Crasher Legions", {upgrades: [
    "destroyerLegion",
    "gunnerLegion",
    "sprayerLegion",
    "battleshipLegion",
    "spawnerLegion",
    "legionaryCrasher",
], color: 'pink', boxColor: 'pink', boxLabel: "Legions", shape: 3.5})

Class.menu_deltas = makeMenu("Delta Crashers", {upgrades: [
    "deltaDestroyer",
    "deltaGunner",
    "deltaSprayer",
    "deltaBattleship",
], color: 'pink', boxColor: 'pink', boxLabel: "Deltas", shape: 3.5})

// Elite Crashers
Class.eliteDestroyer = {
    PARENT: 'elite',
    UPGRADE_LABEL: "Elite Destroyer",
    UPGRADE_COLOR: 'pink',
    GUNS: weaponArray({
        POSITION: [5, 16, 1, 6, 0, 60, 0],
        PROPERTIES: {
            SHOOT_SETTINGS: combineStats([g.basic, g.pounder, g.pounder, g.destroyer]),
            TYPE: "bullet",
            LABEL: "Devastator",
        },
    }, 3),
    TURRETS: [
        ...weaponArray({
            POSITION: [11, 0, 0, 60, 360, 0],
            TYPE: "crasherSpawner",
        }, 3),
        {
            POSITION: [11, 0, 0, 0, 360, 1],
            TYPE: [ "bigauto4gun", { INDEPENDENT: true, COLOR: -1 } ],
        },
    ],
}
Class.eliteGunner = {
    PARENT: 'elite',
    UPGRADE_LABEL: "Elite Gunner",
    UPGRADE_COLOR: 'pink',
    FACING_TYPE: 'toTarget',
    AI: { NO_LEAD: false },
    GUNS: [
        {
            POSITION: [14, 16, 1, 0, 0, 180, 0],
        }, {
            POSITION: [4, 16, 1.5, 14, 0, 180, 0],
            PROPERTIES: {
                SHOOT_SETTINGS: combineStats([g.trap, g.setTrap, g.pounder, {speed: 1.5, range: 0.3}]),
                TYPE: "unsetPillbox",
                NO_LIMITATIONS: true,
                STAT_CALCULATOR: "trap",
            },
        }, {
            POSITION: [6, 14, -2, 2, 0, 60, 0],
        }, {
            POSITION: [6, 14, -2, 2, 0, 300, 0],
        },
    ],
    TURRETS: [
        {
            POSITION: [14, 8, 0, 60, 180, 0],
            TYPE: "auto4gun",
        }, {
            POSITION: [14, 8, 0, 300, 180, 0],
            TYPE: "auto4gun",
        },
    ],
}
Class.eliteSprayer = {
    PARENT: 'elite',
    UPGRADE_LABEL: "Elite Sprayer",
    UPGRADE_COLOR: 'pink',
    SKILL: [3, 5, 5, 5, 3, 1, 0, 9, 1, 0],
    AI: { NO_LEAD: false },
    HAS_NO_RECOIL: true,
    TURRETS: [
        {
            POSITION: [6, 0, 0, 0, 360, 1],
            TYPE: ["machineTripleTurret", { INDEPENDENT: true }],
        },
        ...weaponArray([
            {
                POSITION: [9, 6, -5, 60, 130, 0],
                TYPE: ["sprayer", { COLOR: "grey", GUN_STAT_SCALE: {damage: 0.9, resist: 0.95} }],
            }, {
                POSITION: [9, 6, 5, 60, 130, 0],
                TYPE: ["sprayer", { COLOR: "grey", GUN_STAT_SCALE: {damage: 0.9, resist: 0.95} }],
            }, 
        ], 3)
    ],
}
Class.eliteSprayer_old = {
    PARENT: 'elite',
    UPGRADE_LABEL: "Old Elite Sprayer",
    UPGRADE_COLOR: 'pink',
    AI: { NO_LEAD: false },
    TURRETS: weaponArray({
        POSITION: [14, 6, 0, 60, 190, 0],
        TYPE: [ "sprayer", { COLOR: -1 } ],
    }, 3)
}
Class.eliteBattleship = {
    PARENT: 'elite',
    UPGRADE_LABEL: "Elite Battleship",
    UPGRADE_COLOR: 'pink',
    GUNS: weaponArray([
        {
            POSITION: [4, 6, 0.6, 7, -8, 60, 0],
            PROPERTIES: {
                SHOOT_SETTINGS: combineStats([g.swarm, g.battleship, {speed: 0.95, maxSpeed: 0.95, health: 1.1, resist: 1.05}]),
                TYPE: "autoswarm",
                STAT_CALCULATOR: "swarm",
            },
        }, {
            POSITION: [4, 6, 0.6, 7, 0, 60, 0.5],
            PROPERTIES: {
                SHOOT_SETTINGS: combineStats([g.swarm, g.battleship, {speed: 0.95, maxSpeed: 0.95, health: 1.1, resist: 1.05}]),
                TYPE: "autoswarm",
                STAT_CALCULATOR: "swarm",
            },
        }, {
            POSITION: [4, 6, 0.6, 7, 8, 60, 0],
            PROPERTIES: {
                SHOOT_SETTINGS: combineStats([g.swarm, g.battleship, {speed: 0.95, maxSpeed: 0.95, health: 1.1, resist: 1.05}]),
                TYPE: "autoswarm",
                STAT_CALCULATOR: "swarm",
            },
        }, 
    ], 3),
    TURRETS: weaponArray({
        POSITION: [5, 7, 0, 0, 360, 1],
        TYPE: [ "autoTankGun", { INDEPENDENT: true, COLOR: -1 } ],
    }, 3)
}
Class.eliteSpawner = {
    PARENT: 'elite',
    UPGRADE_LABEL: "Elite Spawner",
    UPGRADE_COLOR: 'pink',
    MAX_CHILDREN: 9,
    AI: { STRAFE: false },
    SKILL_CAP: Array(10).fill(15),
    SKILL: [15, 8, 8, 8, 5, 1, 0, 9, 1, 0],
    GUNS: [
        {
            POSITION: [11, 16, 1, 0, 0, 60, 0],
        }, {
            POSITION: [11, 16, 1, 0, 0, 180, 0],
        }, {
            POSITION: [11, 16, 1, 0, 0, 300, 0],
        }, {
            POSITION: [2, 18, 1, 11, 0, 60, 0],
            PROPERTIES: {
                SHOOT_SETTINGS: combineStats([g.drone, {reload: 2, size: 0.5, speed: 0.6, maxSpeed: 0.6, heath: 1.35}]),
                TYPE: "sentrySwarmMinion",
                NO_LIMITATIONS: true,
                SYNCS_SKILLS: true,
                AUTOFIRE: true,
                STAT_CALCULATOR: "drone",
            },
        }, {
            POSITION: [2, 18, 1, 11, 0, 180, 0],
            PROPERTIES: {
                SHOOT_SETTINGS: combineStats([g.drone, {reload: 2, size: 0.5, speed: 0.6, maxSpeed: 0.6, heath: 1.35}]),
                TYPE: "sentryTrapMinion",
                NO_LIMITATIONS: true,
                SYNCS_SKILLS: true,
                AUTOFIRE: true,
                STAT_CALCULATOR: "drone",
            },
        }, {
            POSITION: [2, 18, 1, 11, 0, 300, 0],
            PROPERTIES: {
                SHOOT_SETTINGS: combineStats([g.drone, {reload: 2, size: 0.5, speed: 0.6, maxSpeed: 0.6, heath: 1.35}]),
                TYPE: "sentryGunMinion",
                NO_LIMITATIONS: true,
                SYNCS_SKILLS: true,
                AUTOFIRE: true,
                STAT_CALCULATOR: "drone",
            },
        },
    ],
    TURRETS: [
        {
            POSITION: [11, 0, 0, 0, 360, 1],
            TYPE: ["auto4gun", { INDEPENDENT: false, COLOR: -1 }],
        },
    ],
}
Class.eliteTrapGuard = {
    PARENT: 'elite',
    UPGRADE_LABEL: "Elite Trap Guard",
    UPGRADE_COLOR: 'pink',
    AI: { STRAFE: false },
    GUNS: weaponArray([
        {
            POSITION: [10.5, 6, 1, 0, 0, 60, 0],
        }, {
            POSITION: [3, 6, 1.7, 10.5, 0, 60, 0],
            PROPERTIES: {
                SHOOT_SETTINGS: combineStats([g.trap, {speed: 1.1, maxSpeed: 1.1, reload: 1.5, damage: 1.6}]),
                TYPE: "trap",
                STAT_CALCULATOR: "trap",
            },
        },
    ], 3),
    TURRETS: [
        {
            POSITION: [9.5, 0, 0, 0, 360, 1],
            TYPE: "triTrapGuardTurret",
        },
        ...weaponArray([
            {
                POSITION: [5, 8, -7, 60, 160, 0],
                TYPE: ["autoTurret", { INDEPENDENT: false, GUN_STAT_SCALE: {health: 1.1} }],
            }, {
                POSITION: [5, 8, 7, 60, 160, 0],
                TYPE: ["autoTurret", { INDEPENDENT: false, GUN_STAT_SCALE: {health: 1.1} }],
            },
        ], 3)
    ],
}
Class.eliteSpinner = {
    PARENT: 'elite',
    UPGRADE_LABEL: "Elite Spinner",
    UPGRADE_COLOR: 'pink',
    AI: { STRAFE: false },
    FACING_TYPE: ["spin", {speed: 0.08}],
    GUNS: weaponArray([
        {
            POSITION: [9.5, 2, 1, -1.5, 11.5, 10, 2/3],
            PROPERTIES: {
                SHOOT_SETTINGS: combineStats([g.basic, g.twin, g.gunner, { speed: 1.5, maxSpeed: 1.25 }]),
                TYPE: "bullet",
            },
        }, {
            POSITION: [9.5, 2, 1, 3.5, 6.5, 10, 1/3],
            PROPERTIES: {
                SHOOT_SETTINGS: combineStats([g.basic, g.twin, g.gunner, { speed: 1.5, maxSpeed: 1.25 }]),
                TYPE: "bullet",
            },
        }, {
            POSITION: [9.5, 2, 1, 8.5, 1.5, 10, 0],
            PROPERTIES: {
                SHOOT_SETTINGS: combineStats([g.basic, g.twin, g.gunner, { speed: 1.5, maxSpeed: 1.25 }]),
                TYPE: "bullet",
            },
        }, {
            POSITION: [2, 20, 0.75, 8, 0, 60, 0],
        },
    ], 3),
    TURRETS: [
        {
            POSITION: [9.5, 0, 0, 0, 360, 1],
            TYPE: ["eliteSpinnerCyclone", {COLOR: -1}],
        },
    ],
}

// Deltas (moving to Arms Race addon later)
Class.delta = {
    PARENT: 'elite',
    LABEL: "Delta Crasher",
    COLOR: 'pink',
    UPGRADE_COLOR: 'pink',
    SIZE: 34,
    VALUE: 5e5,
    BODY: {
        FOV: 1.25,
        SPEED: 0.15 * base.SPEED,
        HEALTH: 14 * base.HEALTH,
        DAMAGE: 3 * base.DAMAGE,
        REGEN: 0.5 * base.REGEN,
    },
}
Class.deltaDestroyer = {
    PARENT: "delta",
    UPGRADE_LABEL: "Delta Destroyer",
    GUNS: [
        ...weaponArray({
            POSITION: [ 7, 10.5, -1.4, 6, 0, 60, 0],
            PROPERTIES: {
                SHOOT_SETTINGS: combineStats([g.basic, g.pounder, g.pounder, g.destroyer, g.launcher, g.fake, {damage: 1.1, speed: 1.05}]),
                TYPE: "launcherMissile",
                LABEL: "Devastator",
                NO_LIMITATIONS: true,
                AUTOFIRE: true
            },
        }, 3),
        ...weaponArray({
            POSITION: [5, 16, 1, 6, 0, 60, 0],
            PROPERTIES: {
                SHOOT_SETTINGS: combineStats([g.basic, g.pounder, g.pounder, g.destroyer, g.launcher, {damage: 1.1, speed: 1.05}]),
                TYPE: "launcherMissile",
                LABEL: "Devastator",
                NO_LIMITATIONS: true,
            },
        }, 3),
    ],
    TURRETS: [
        ...weaponArray({
            POSITION: [11, 0, 0, 60, 360, 0],
            TYPE: ["crasherSpawner", {GUN_STAT_SCALE: {health: 1.1, damage: 1.2, size: 1.1}}],
        }, 3),
        {
            POSITION: [11, 0, 0, 0, 360, 1],
            TYPE: [ "bigauto4gun", { INDEPENDENT: true, COLOR: -1, GUN_STAT_SCALE: {health: 1.2, damage: 1.1} } ],
        },
    ],
}
Class.deltaGunner = {
    PARENT: "delta",
    UPGRADE_LABEL: "Delta Gunner",
    FACING_TYPE: 'toTarget',
    AI: { NO_LEAD: false },
    GUNS: [
        {
            POSITION: [14, 16, 1, 0, 0, 180, 0],
        }, {
            POSITION: [14, 6, 1, 0, 0, 180, 0],
        }, {
            POSITION: [4, 16, 1.5, 14, 0, 180, 0],
            PROPERTIES: {
                SHOOT_SETTINGS: combineStats([g.trap, g.setTrap, g.pounder, {speed: 1.5, range: 0.3, size: 0.6}]),
                TYPE: "legionaryPillbox",
                STAT_CALCULATOR: "trap",
                NO_LIMITATIONS: true,
            },
        }, {
            POSITION: [6, 14, -2, 2, 0, 60, 0],
        }, {
            POSITION: [6, 14, -2, 2, 0, 300, 0],
        }, {
            POSITION: [6, 14, -2, 2, 0, 180, 0],
        },
    ],
    TURRETS: [
        {
            POSITION: [14, 8, 0, 60, 180, 0],
            TYPE: ["bigauto4gun", {GUN_STAT_SCALE: {damage:1.05}}],
        }, {
            POSITION: [14, 8, 0, 300, 180, 0],
            TYPE: ["bigauto4gun", {GUN_STAT_SCALE: {damage:1.05}}],
        },
    ],
}
Class.deltaSprayer = {
    PARENT: "delta",
    UPGRADE_LABEL: "Delta Sprayer",
    SKILL: [3, 5, 5, 5, 3, 1, 0, 9, 1, 0],
    AI: { NO_LEAD: false },
    HAS_NO_RECOIL: true,
    TURRETS: [
        {
            POSITION: [6, 0, 0, 0, 360, 1],
            TYPE: ["gadgetGunTripleTurret", { INDEPENDENT: true }],
        },
        ...weaponArray([
            {
                POSITION: [7.75, 6, 8, 60, 130, 0],
                TYPE: ["sprayer", { COLOR: "grey" }],
            },{
                POSITION: [7.75, 6, -8, 60, 130, 0],
                TYPE: ["sprayer", { COLOR: "grey" }],
            }, {
                POSITION: [9, 6, 0, 60, 130, 0],
                TYPE: ["scatterer", { COLOR: "grey" }],
            },
        ], 3)
    ],
}
Class.deltaBattleship = {
    PARENT: "delta",
    UPGRADE_LABEL: "Delta Battleship",
    GUNS: weaponArray([
        {
            POSITION: [4, 6, 0.6, 7, 3.5, 60, 1/4],
            PROPERTIES: {
                SHOOT_SETTINGS: combineStats([g.swarm, g.battleship, {speed: 0.95, maxSpeed: 0.95, health: 1.1, resist: 1.05}]),
                TYPE: "autoswarm",
                STAT_CALCULATOR: "swarm",
            },
        }, {
            POSITION: [4, 6, 0.6, 7, -3.5, 60, 2/4],
            PROPERTIES: {
                SHOOT_SETTINGS: combineStats([g.swarm, g.battleship, {speed: 0.95, maxSpeed: 0.95, health: 1.1, resist: 1.05}]),
                TYPE: "autoswarm",
                STAT_CALCULATOR: "swarm",
            },
        }, {
            POSITION: [4, 6, 0.6, 7, -10, 60, 3/4],
            PROPERTIES: {
                SHOOT_SETTINGS: combineStats([g.swarm, g.battleship, {speed: 0.95, maxSpeed: 0.95, health: 1.1, resist: 1.05}]),
                TYPE: "autoswarm",
                STAT_CALCULATOR: "swarm",
            },
        }, {
            POSITION: [4, 6, 0.6, 7, 10, 60, 0],
            PROPERTIES: {
                SHOOT_SETTINGS: combineStats([g.swarm, g.battleship, {speed: 0.95, maxSpeed: 0.95, health: 1.1, resist: 1.05}]),
                TYPE: "autoswarm",
                STAT_CALCULATOR: "swarm",
            },
        }
    ], 3),
    TURRETS: weaponArray({
        POSITION: [5, 7, 0, 0, 360, 1],
        TYPE: [ "bigAutoTankGun", { INDEPENDENT: true, COLOR: -1 } ],
    }, 3)
}

// Legions
Class.destroyerLegion = {
    PARENT: 'elite',
    UPGRADE_LABEL: "Destroyer Legion",
    DISPLAY_NAME: false,
    UPGRADE_COLOR: 'pink',
    AI: { NO_LEAD: false },
    SIZE: 30,
    BODY: {
        HEALTH: 8 * base.HEALTH,
    },
    GUNS: weaponArray({
        POSITION: [5, 16, 1, 6, 0, 60, 0],
        PROPERTIES: {
            SHOOT_SETTINGS: combineStats([g.basic, g.pounder, g.pounder, g.destroyer, {health: 1.1}]),
            TYPE: "bullet",
            LABEL: "Devastator",
        },
    }, 3),
    TURRETS: [
        ...weaponArray({
            POSITION: [11, 0, 0, 60, 360, 0],
            TYPE: ["crasherSpawner", {GUN_STAT_SCALE: {health: 1.1}}],
        }, 3),
        {
            POSITION: [11, 0, 0, 0, 360, 1],
            TYPE: [ "bigauto4gun", { GUN_STAT_SCALE: {health: 1.1}, INDEPENDENT: true, COLOR: -1 } ],
        },
    ],
}
Class.gunnerLegion = {
    PARENT: 'elite',
    UPGRADE_LABEL: "Gunner Legion",
    DISPLAY_NAME: false,
    UPGRADE_COLOR: 'pink',
    FACING_TYPE: 'toTarget',
    AI: { NO_LEAD: false },
    SIZE: 30,
    BODY: {
        HEALTH: 8 * base.HEALTH,
    },
    GUNS: [
        {
            POSITION: [14, 16, 1, 0, 0, 180, 0],
        }, {
            POSITION: [4, 16, 1.5, 14, 0, 180, 0],
            PROPERTIES: {
                SHOOT_SETTINGS: combineStats([g.trap, g.setTrap, g.pounder, {health: 1.1, speed: 1.5, range: 0.3}]),
                TYPE: "unsetPillbox",
                STAT_CALCULATOR: "trap",
            },
        }, {
            POSITION: [6, 14, -2, 2, 0, 60, 0],
        }, {
            POSITION: [6, 14, -2, 2, 0, 300, 0],
        },
    ],
    TURRETS: [
        {
            POSITION: [14, 8, 0, 60, 180, 0],
            TYPE: ["auto4gun", {GUN_STAT_SCALE: {health: 1.15}}],
        }, {
            POSITION: [14, 8, 0, 300, 180, 0],
            TYPE: ["auto4gun", {GUN_STAT_SCALE: {health: 1.15}}],
        },
    ],
}
Class.sprayerLegion = {
    PARENT: 'elite',
    UPGRADE_LABEL: "Sprayer Legion",
    DISPLAY_NAME: false,
    UPGRADE_COLOR: 'pink',
    AI: { NO_LEAD: false },
    SIZE: 30,
    SKILL: [0, 9, 3, 9, 2, 9, 9, 9, 9, 0],
    HAS_NO_RECOIL: true,
    BODY: {
        HEALTH: 8 * base.HEALTH,
    },
    TURRETS: weaponArray({
        POSITION: [14, 6, 0, 60, 190, 0],
        TYPE: ["machineGun", {GUN_STAT_SCALE: {health: 1.1, damage: 1.2, speed: 1.2, resist: 1.05}, COLOR: -1}],
    }, 3)
}
Class.battleshipLegion = {
    PARENT: 'elite',
    UPGRADE_LABEL: "Battleship Legion",
    DISPLAY_NAME: false,
    UPGRADE_COLOR: 'pink',
    AI: { NO_LEAD: false },
    SIZE: 30,
    BODY: {
        HEALTH: 8 * base.HEALTH,
    },
    GUNS: weaponArray([
        {
            POSITION: [4, 6, 0.6, 7, -8, 60, 0],
            PROPERTIES: {
                SHOOT_SETTINGS: combineStats([g.swarm, g.battleship, {speed: 1.05, maxSpeed: 1.05, health: 1.2, resist: 1.1}]),
                TYPE: "autoswarm",
                STAT_CALCULATOR: "swarm",
            },
        }, {
            POSITION: [4, 6, 0.6, 7, 0, 60, 0.5],
            PROPERTIES: {
                SHOOT_SETTINGS: combineStats([g.swarm, g.battleship, {speed: 1.05, maxSpeed: 1.05, health: 1.2, resist: 1.1}]),
                TYPE: "autoswarm",
                STAT_CALCULATOR: "swarm",
            },
        }, {
            POSITION: [4, 6, 0.6, 7, 8, 60, 0],
            PROPERTIES: {
                SHOOT_SETTINGS: combineStats([g.swarm, g.battleship, {speed: 1.05, maxSpeed: 1.05, health: 1.2, resist: 1.1}]),
                TYPE: "autoswarm",
                STAT_CALCULATOR: "swarm",
            },
        }, 
    ], 3),
    TURRETS: weaponArray({
        POSITION: [5, 7, 0, 0, 360, 1],
        TYPE: [ "autoTankGun", { GUN_STAT_SCALE: {health: 1.1}, INDEPENDENT: true, COLOR: -1 } ],
    }, 3)
}
Class.spawnerLegion = {
    PARENT: 'elite',
    UPGRADE_LABEL: "Spawner Legion",
    DISPLAY_NAME: false,
    UPGRADE_COLOR: 'pink',
    AI: { NO_LEAD: false },
    SIZE: 30,
    BODY: {
        HEALTH: 8 * base.HEALTH,
    },
    GUNS: [
        {
            POSITION: [11, 16, 1, 0, 0, 60, 0],
        }, {
            POSITION: [11, 16, 1, 0, 0, 180, 0],
        }, {
            POSITION: [11, 16, 1, 0, 0, 300, 0],
        }, {
            POSITION: [2, 18, 1, 11, 0, 60, 0],
            PROPERTIES: {
                SHOOT_SETTINGS: combineStats([g.drone, {reload: 2, size: 0.5, speed: 0.65, maxSpeed: 0.65, heath: 1.5}]),
                TYPE: "sentrySwarmMinion",
                SYNCS_SKILLS: true,
                AUTOFIRE: true,
                STAT_CALCULATOR: "drone",
            },
        }, {
            POSITION: [2, 18, 1, 11, 0, 180, 0],
            PROPERTIES: {
                SHOOT_SETTINGS: combineStats([g.drone, {reload: 2, size: 0.5, speed: 0.65, maxSpeed: 0.65, heath: 1.5}]),
                TYPE: "sentryTrapMinion",
                SYNCS_SKILLS: true,
                AUTOFIRE: true,
                STAT_CALCULATOR: "drone",
            },
        }, {
            POSITION: [2, 18, 1, 11, 0, 300, 0],
            PROPERTIES: {
                SHOOT_SETTINGS: combineStats([g.drone, {reload: 2, size: 0.5, speed: 0.65, maxSpeed: 0.65, heath: 1.5}]),
                TYPE: "sentryGunMinion",
                SYNCS_SKILLS: true,
                AUTOFIRE: true,
                STAT_CALCULATOR: "drone",
            },
        },
    ],
    TURRETS: [
        {
            POSITION: [11, 0, 0, 0, 360, 1],
            TYPE: ["auto4gun", { GUN_STAT_SCALE: {health: 1.15}, INDEPENDENT: false, COLOR: -1 }],
        },
    ],
}

// Legionary Crasher
Class.legionaryCrasherTop = {
    PARENT: 'elite',
    AI: { STRAFE: false, NO_LEAD: false },
    CONTROLLERS: [ ["spin", { independent: true, speed: -0.005 }] ],
    INDEPENDENT: true,
    DISPLAY_NAME: false,
    GUNS: weaponArray([
        {
            POSITION: [4, 9.5, 0.7, 7, 5, 60, 0],
            PROPERTIES: {
                SHOOT_SETTINGS: combineStats([g.swarm, g.pounder, { speed: 2, maxSpeed: 1.7, size: 0.6, range: 2.8}]),
                TYPE: [ "swarm", { INDEPENDENT: true } ],
                STAT_CALCULATOR: "swarm",
                AUTOFIRE: true,
                
            },
        }, {
            POSITION: [4, 9.5, 0.7, 7, -5, 60, 0.5],
            PROPERTIES: {
                SHOOT_SETTINGS: combineStats([g.swarm, g.pounder, { speed: 2, maxSpeed: 1.7, size: 0.6, range: 2.8}]),
                TYPE: [ "swarm", { INDEPENDENT: true } ],
                STAT_CALCULATOR: "swarm",
                AUTOFIRE: true,
            },
        },
    ], 3),
    TURRETS: weaponArray({
        POSITION: [9.5, 10, 0, 0, 190, 0],
        TYPE: ["auto4gun", {GUN_STAT_SCALE: {damage: 1.4, health: 1.1, speed: 1.2, maxSpeed: 1.2, resist: 1.1, range: 1.3}}],
    }, 3),
}
Class.legionaryCrasherSpawner = {
    PARENT: 'genericTank',
    SHAPE: "",
    INDEPENDENT: true,
    GUNS: [{
        POSITION: [0, 10, 0, 0, 0, 0, 10],
        PROPERTIES: {
            TYPE: 'destroyerLegion',
            SHOOT_SETTINGS: combineStats([{reload: 0.1}]),
            NO_LIMITATIONS: true,
            INDEPENDENT_CHILDREN: true,
            MAX_CHILDREN: 3,
            IDENTIFIER: 1,
            AUTOFIRE: true,
        }
    }],
    ON: [{
        event: "fire",
        handler: ({ gun }) => {
            gun.setBulletType(["destroyerLegion", "gunnerLegion", "sprayerLegion", "battleshipLegion", "spawnerLegion"][gun.identifier++ % 5]);
        }
    }],
}
Class.legionaryCrasher = {
    PARENT: 'elite',
    LABEL: "Legionary Crasher",
    UPGRADE_COLOR: 'pink',
    AI: { STRAFE: false, NO_LEAD: false },
    HAS_NO_RECOIL: true,
    VALUE: 5e6,
    SIZE: 75,
    BODY: {
        FOV: 1.5,
        SPEED: 0.1 * base.SPEED,
        HEALTH: 2000,
        DAMAGE: 5 * base.DAMAGE,
    },
    GUNS: [
        ...weaponArray([
            {
                POSITION: [14.5, 13, 1, 0, 0, 0, 0],
            }, {
                POSITION: [3, 13, 1.7, 14.5, 0, 0, 0],
                PROPERTIES: {
                    SHOOT_SETTINGS: combineStats([g.trap, g.setTrap, g.pounder, { reload: 2, speed: 2, size: 0.65, maxSpeed: 2, range: 0.65 }]),
                    TYPE: "legionaryPillbox",
                    NO_LIMITATIONS: true,
                    STAT_CALCULATOR: "trap",
                },
            },
        ], 3),
        ...weaponArray({
            POSITION: [5, 12, 1.6, -11, 0, 0, 0],
        }, 3),
    ],
    TURRETS: [
        {
            POSITION: [12, 0, 0, 0, 360, 1],
            TYPE: "legionaryCrasherTop",
        },
        ...weaponArray({
            POSITION: [14, 8, 0, 60, 180, 0],
            TYPE: [ "sprayer", { GUN_STAT_SCALE: {speed: 1.3, health: 1.5, damage: 1.4, resist: 1.2}, COLOR: -1 } ],
        }, 3),
        {
            POSITION: [12, 0, 0, 0, 0, 0],
            TYPE: 'legionaryCrasherSpawner'
        }
    ],
}
Class.legionaryCrasherSpawnerFix = {
    PARENT: 'genericTank',
    SHAPE: "",
    INDEPENDENT: true,
    GUNS: [{
        POSITION: [0, 10, 0, 0, 0, 0, 10],
        PROPERTIES: {
            TYPE: 'destroyerLegion',
            SHOOT_SETTINGS: combineStats([{reload: 0.1, size: 0.75}]),
            NO_LIMITATIONS: true,
            INDEPENDENT_CHILDREN: false,
            MAX_CHILDREN: 3,
            IDENTIFIER: 1,
            AUTOFIRE: true,
        }
    }],
    ON: [{
        event: "fire",
        handler: ({ gun }) => {
            gun.setBulletType(["destroyerLegion", "gunnerLegion", "sprayerLegion", "battleshipLegion", "spawnerLegion"][gun.identifier++ % 5]);
        }
    }],
}
Class.legionaryCrasherFix = {
    PARENT: 'elite',
    LABEL: "Legionary Crasher",
    UPGRADE_COLOR: 'pink',
    AI: { STRAFE: false, NO_LEAD: false },
    HAS_NO_RECOIL: true,
    VALUE: 5e6,
    SIZE: 75,
    BODY: {
        FOV: 1.5,
        SPEED: 0.1 * base.SPEED,
        HEALTH: 2000,
        DAMAGE: 5 * base.DAMAGE,
    },
    GUNS: [
        ...weaponArray([
            {
                POSITION: [14.5, 13, 1, 0, 0, 0, 0],
            }, {
                POSITION: [3, 13, 1.7, 14.5, 0, 0, 0],
                PROPERTIES: {
                    SHOOT_SETTINGS: combineStats([g.trap, g.setTrap, g.pounder, { reload: 2, speed: 2, size: 0.65, maxSpeed: 2, range: 0.65 }]),
                    TYPE: "legionaryPillbox",
                    NO_LIMITATIONS: true,
                    STAT_CALCULATOR: "trap",
                },
            },
        ], 3),
        ...weaponArray({
            POSITION: [5, 12, 1.6, -11, 0, 0, 0],
        }, 3),
    ],
    TURRETS: [
        {
            POSITION: [12, 0, 0, 0, 360, 1],
            TYPE: "legionaryCrasherTop",
        },
        ...weaponArray({
            POSITION: [14, 8, 0, 60, 180, 0],
            TYPE: [ "sprayer", { GUN_STAT_SCALE: {speed: 1.3, health: 1.5, damage: 1.4, resist: 1.2}, COLOR: -1 } ],
        }, 3),
        {
            POSITION: [12, 0, 0, 0, 0, 0],
            TYPE: 'legionaryCrasherSpawnerFix'
        }
    ],
}

// Miscellaneous Elites
Class.eliteSkimmer = {
    PARENT: 'elite',
    LABEL: "Elite Skimmer",
    COLOR: 'triangle',
    UPGRADE_COLOR: 'triangle',
    TURRETS: weaponArray({
        TYPE: "hyperSkimmerTurret",
        POSITION: {
            SIZE: 15,
            X: 5,
            ANGLE: 60,
            ARC: 170
        }
    }, 3)
}
