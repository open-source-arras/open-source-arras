const {combineStats, makeMenu, weaponArray} = require('../../facilitators.js')
const {base} = require('../../constants.js')
const g = require('../../gunvals.js')

Class.nester = {
    PARENT: "miniboss",
    COLOR: "purple",
    UPGRADE_COLOR: "purple",
    SHAPE: 5,
    SIZE: 50,
    BODY: {
        FOV: 1.3,
        SPEED: base.SPEED * 0.25,
        HEALTH: base.HEALTH * 9,
        SHIELD: base.SHIELD * 1.5,
        REGEN: base.REGEN,
        DAMAGE: base.DAMAGE * 2.5,
    },
    VALUE: 3e5,
}

Class.menu_nesters = makeMenu("Nesters", {upgrades: [
    "nestKeeper",
    "nestWarden",
    "nestGuardian",
    "nestCurator",
    "nestDeacon",
    "nestChampion",
], color: "purple", boxColor: "purple", shape: 5.5})

Class.nestKeeper = {
    PARENT: "nester",
    LABEL: "Nest Keeper",
    MAX_CHILDREN: 15,
    GUNS: weaponArray({
        POSITION: [3.5, 6.65, 1.2, 8, 0, 36, 0],
        PROPERTIES: {
            SHOOT_SETTINGS: combineStats([g.drone, g.nestKeeper]),
            TYPE: "drone",
            AUTOFIRE: true,
            LABEL: "Mega Crasher",
            STAT_CALCULATOR: "drone",
        },
    }, 5),
    TURRETS: [
        ...weaponArray({
            POSITION: [8, 9, 0, 0, 120, 0],
            TYPE: [ "auto4gun", { INDEPENDENT: true, COLOR: "purple" } ],
        }, 5),
        {
            POSITION: [9, 0, 0, 0, 360, 1],
            TYPE: [ "boomerTurret", { INDEPENDENT: true, COLOR: -1 } ],
        },
    ],
}
Class.nestWarden = {
    PARENT: "nester",
    LABEL: "Nest Warden",
    GUNS: weaponArray([
        {
            POSITION: [10.7, 8, 1, 0, 0, 36, 0],
        }, {
            POSITION: [1.5, 8, 1.2, 10.7, 0, 36, 0],
            PROPERTIES: {
                SHOOT_SETTINGS: combineStats([g.trap, { speed: 1.2 }, g.setTrap, g.constructor]),
                TYPE: "unsetTrap",
                STAT_CALCULATOR: "block"
            },
        }
    ], 5),
    TURRETS: [
        {
            POSITION: [9, 0, 0, 0, 360, 1],
            TYPE: [ "barricadeTurret", { INDEPENDENT: true, COLOR: -1 } ],
        },
        ...weaponArray({
            POSITION: [8, 9, 0, 0, 120, 0],
            TYPE: [ "cruiserTurret", { INDEPENDENT: true, COLOR: -1 } ],
        }, 5)
    ],
}
Class.nestGuardian = {
    PARENT: "nester",
    LABEL: "Nest Guardian",
    GUNS: weaponArray({
        POSITION: [5.5, 7, 1, 6, 0, 36, 0],
        PROPERTIES: {
            SHOOT_SETTINGS: combineStats([g.basic, g.pounder, g.pounder, g.destroyer]),
            TYPE: "bullet",
            LABEL: "Devastator",
        },
    }, 5),
    TURRETS: [
        {
            POSITION: [9, 0, 0, 0, 360, 1],
            TYPE: [ "twisterTurret", { INDEPENDENT: true, COLOR: -1 } ],
        },
        ...weaponArray({
            POSITION: [8, 9, 0, 0, 120, 0],
            TYPE: [ "swarmerTurret", { INDEPENDENT: true, COLOR: -1 } ],
        }, 5)
    ],
}

// Nesters (Arms Race)
Class.nester_AR = {
    PARENT: "nester",
    SIZE: 60,
    BODY: {
        HEALTH: base.HEALTH * 18,
    },
    VALUE: 8e5
}
Class.nestCurator = {
    PARENT: "nester_AR",
    LABEL: "Nest Curator",
    MAX_CHILDREN: 15,
    GUNS: weaponArray([{
            POSITION: [ 4.5, 1.5, -1.4, 8, 3.75, 180, 0],
            PROPERTIES: {
                SHOOT_SETTINGS: combineStats([g.swarm]),
                TYPE: "autoswarm",
                AUTOFIRE: true,
                STAT_CALCULATOR: "swarm",
            },
        },
        {
            POSITION: [ 4.5, 1.5, -1.4, 8, -3.75, 180, 0.5],
            PROPERTIES: {
                SHOOT_SETTINGS: combineStats([g.swarm]),
                TYPE: "autoswarm",
                AUTOFIRE: true,
                STAT_CALCULATOR: "swarm",
            },
        },
        {
        POSITION: [3.5, 8.25, 1.2, 8, 0, 36, 0],
        PROPERTIES: {
            SHOOT_SETTINGS: combineStats([g.drone, g.nestKeeper]),
            TYPE: "drone",
            AUTOFIRE: true,
            LABEL: "Mega Crasher",
            STAT_CALCULATOR: "drone",
        },
    }], 5),
    TURRETS: [
        ...weaponArray({
            POSITION: [8, 9, 0, 0, 120, 0],
            TYPE: [ "bigauto4gun", { INDEPENDENT: true, COLOR: -1, GUN_STAT_SCALE: {reload: 0.4, damage: 0.4} } ],
        }, 5),
        {
            POSITION: [10, 0, 0, 0, 360, 1],
            TYPE: [ "ultraBoomerTurret", { INDEPENDENT: true, COLOR: -1 } ],
        },
    ],
}
Class.nestDeacon = {
    PARENT: "nester_AR",
    LABEL: "Nest Deacon",
    GUNS: weaponArray([
        {
            POSITION: [10.7, 8, 1, 0, 0, 36, 0],
        }, {
            POSITION: [1.5, 8, 1.2, 10.7, 0, 36, 0],
            PROPERTIES: {
                SHOOT_SETTINGS: combineStats([g.trap, { speed: 1.2 }, g.setTrap, g.constructor, g.pounder]),
                TYPE: "unsetTrap",
                STAT_CALCULATOR: "block"
            },
        }
    ], 5),
    TURRETS: [
        {
            POSITION: [9, 0, 0, 0, 360, 1],
            TYPE: [ "ultraBarricadeTurret", { INDEPENDENT: true, COLOR: -1 } ],
        },
        ...weaponArray({
            POSITION: [8, 9, 0, 0, 120, 0],
            TYPE: [ "carrierTurret", { INDEPENDENT: true, COLOR: -1 } ],
        }, 5)
    ],
}
Class.nestChampion = {
    PARENT: "nester_AR",
    LABEL: "Nest Champion",
    GUNS: weaponArray({
        POSITION: [5.5, 7, 1, 6, 0, 36, 0],
        PROPERTIES: {
            SHOOT_SETTINGS: combineStats([g.basic, g.pounder, g.pounder, g.destroyer, g.launcher]),
            TYPE: "launcherMissile",
            LABEL: "Ravager",
        },
    }, 5),
    TURRETS: [
        {
            POSITION: [9, 0, 0, 0, 360, 1],
            TYPE: [ "hyperTwisterTurret", { INDEPENDENT: true, COLOR: -1 } ],
        },
        ...weaponArray({
            POSITION: [8, 9, 0, 0, 120, 0],
            TYPE: [ "hyperSwarmerTurret", { INDEPENDENT: true, COLOR: -1 } ],
        }, 5)
    ],
}
