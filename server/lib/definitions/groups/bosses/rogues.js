const {combineStats, makeMenu, weaponArray} = require("../../facilitators.js")
const {base} = require("../../constants.js")
const g = require("../../gunvals.js")

Class.menu_rogues = makeMenu("Rogues", {upgrades: [
    "roguePalisade",
    "rogueArmada",
    "julius",
    "genghis",
    "napoleon"
], color: "darkGrey", boxColor: "darkGrey", shape: 6})

Class.roguePalisade = {
    PARENT: "miniboss",
    LABEL: "Rogue Palisade",
    COLOR: "darkGrey",
    UPGRADE_COLOR: "darkGrey",
    SHAPE: 6,
    SIZE: 30,
    VALUE: 5e5,
    SKILL: [2, 6, 6, 6, 2, 0, 0, 9, 0, 0],
    CONTROLLERS: ["nearestDifferentMaster", "onlyAcceptInArc"],
    BODY: {
        FOV: 1.4,
        SPEED: 0.05 * base.SPEED,
        HEALTH: 16 * base.HEALTH,
        SHIELD: 3 * base.SHIELD,
        DAMAGE: 3 * base.DAMAGE
    },
    GUNS: weaponArray({
        POSITION: [4, 6, -1.6, 8, 0, 0, 0], 
        PROPERTIES: {
            SHOOT_SETTINGS: combineStats([g.minion, g.pounder, { reload: 2, damage: 0.7, density: 0.6 }]),
            TYPE: ["minion", {INDEPENDENT: true}],
            STAT_CALCULATOR: "drone",
            AUTOFIRE: true,
            MAX_CHILDREN: 3,
            SYNCS_SKILLS: true,
            WAIT_TO_CYCLE: true
        }
    }, 6),
    TURRETS: weaponArray({
        POSITION: [5, 10, 0, 30, 110, 0],
        TYPE: ["baseTrapTurret", {GUN_STAT_SCALE: {health: 0.7, damage: 0.8}}]
    }, 6)
}
Class.rogueArmada = {
    PARENT: "miniboss",
    LABEL: "Rogue Armada",
    COLOR: "darkGrey",
    UPGRADE_COLOR: "darkGrey",
    SHAPE: 7,
    SIZE: 28,
    VALUE: 5e5,
    SKILL: [2, 6, 6, 6, 2, 0, 0, 9, 0, 0],
    BODY: {
        FOV: 1.3,
        SPEED: base.SPEED * 0.1,
        HEALTH: base.HEALTH * 16,
        SHIELD: base.SHIELD * 3,
        REGEN: base.REGEN,
        DAMAGE: base.DAMAGE * 3
    },
    GUNS: weaponArray([
        {
            POSITION: [8, 2, 1, 0, -2, 360 / 14, 0],
            PROPERTIES: {
                SHOOT_SETTINGS: combineStats([g.basic, g.machineGun, g.shotgun, g.pounder, {reload: 2, damage: 1.5, health: 1.5, resist: 1.25}]),
                TYPE: "casing"
            }
        }, {
            POSITION: [8, 2, 1, 0, -1.5, 360 / 14, 0],
            PROPERTIES: {
                SHOOT_SETTINGS: combineStats([g.basic, g.machineGun, g.shotgun, g.pounder, {reload: 2, damage: 1.5, health: 1.5, resist: 1.25}]),
                TYPE: "casing"
            }
        }, {
            POSITION: [8, 2, 1, 0, -1, 360 / 14, 0],
            PROPERTIES: {
                SHOOT_SETTINGS: combineStats([g.basic, g.machineGun, g.shotgun, g.pounder, {reload: 2, damage: 1.5, health: 1.5, resist: 1.25}]),
                TYPE: "bullet"
            }
        }, {
            POSITION: [8, 3, 1, 0, 0.5, 360 / 14, 0],
            PROPERTIES: {
                SHOOT_SETTINGS: combineStats([g.basic, g.machineGun, g.shotgun, g.pounder, {reload: 2, damage: 1.5, health: 1.5, resist: 1.25}]),
                TYPE: "bullet"
            }
        }, {
            POSITION: [8, 3, 1, 0, 0, 360 / 14, 0],
            PROPERTIES: {
                SHOOT_SETTINGS: combineStats([g.basic, g.machineGun, g.shotgun, g.pounder, {reload: 2, damage: 1.5, health: 1.5, resist: 1.25}]),
                TYPE: "bullet"
            }
        }, {
            POSITION: [8, 3, 1, 0, 0.5, 360 / 14, 0],
            PROPERTIES: {
                SHOOT_SETTINGS: combineStats([g.basic, g.machineGun, g.shotgun, g.pounder, {reload: 2, damage: 1.5, health: 1.5, resist: 1.25}]),
                TYPE: "bullet"
            }
        }, {
            POSITION: [8, 4, 1, 0, 1, 360 / 14, 0],
            PROPERTIES: {
                SHOOT_SETTINGS: combineStats([g.basic, g.machineGun, g.shotgun, g.pounder, {reload: 2, damage: 1.5, health: 1.5, resist: 1.25}]),
                TYPE: "bullet"
            }
        }, {
            POSITION: [8, 4, 1, 0, 1.5, 360 / 14, 0],
            PROPERTIES: {
                SHOOT_SETTINGS: combineStats([g.basic, g.machineGun, g.shotgun, g.pounder, {reload: 2, damage: 1.5, health: 1.5, resist: 1.25}]),
                TYPE: "casing"
            }
        }, {
            POSITION: [8.5, 6, 1, 4, 0, 360 / 14, 0],
            PROPERTIES: {
                SHOOT_SETTINGS: combineStats([g.basic, g.machineGun, g.shotgun, g.pounder, {reload: 2}, g.fake]),
                TYPE: "casing"
            }
        }, {
            POSITION: [7, 6, -1.6, 4, 0, 360 / 14, 0]
        }
    ], 7),
    TURRETS: weaponArray({
        POSITION: [5, 10, 0, 0, 110, 0],
        TYPE: "shottrapTurret"
    }, 7)
}
