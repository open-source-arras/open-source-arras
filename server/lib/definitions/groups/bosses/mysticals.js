const { combineStats, weaponArray, weaponMirror } = require("../../facilitators.js");
const { base } = require("../../constants.js");
const g = require("../../gunvals.js");

const mystical_gun_position = {
    LENGTH: 3.5,
    WIDTH: 8.65,
    ASPECT: 1.2,
    X: 8
};

Class.sorcerer = {
    PARENT: "miniboss",
    LABEL: "Sorcerer",
    DANGER: 7,
    SHAPE: 0,
    COLOR: "veryLightGrey",
    UPGRADE_COLOR: "veryLightGrey",
    SIZE: 26,
    MAX_CHILDREN: 50,
    VALUE: 2e5,
    BODY: {
        FOV: 0.5,
        SPEED: 0.12 * base.SPEED,
        HEALTH: 6 * base.HEALTH,
        DAMAGE: 2 * base.DAMAGE
    },
    GUNS: weaponArray({
        POSITION: mystical_gun_position,
        PROPERTIES: {
            SHOOT_SETTINGS: combineStats([g.drone, g.summoner, g.machineGun, g.machineGunner, { damage: 1.8, size: 0.4, spray: 150, speed: 2, shudder: 1.75 }]),
            TYPE: "sorcererDrone",
            AUTOFIRE: true,
            SYNCS_SKILLS: true,
            STAT_CALCULATOR: "drone",
            WAIT_TO_CYCLE: true
        }
    }, 2)
};
Class.summoner = {
    PARENT: "miniboss",
    LABEL: "Summoner",
    DANGER: 8,
    SHAPE: 4,
    COLOR: "gold",
    UPGRADE_COLOR: "gold",
    SIZE: 26,
    MAX_CHILDREN: 28,
    VALUE: 3e5,
    BODY: {
        FOV: 0.5,
        SPEED: 0.1 * base.SPEED,
        HEALTH: 7 * base.HEALTH,
        DAMAGE: 2.6 * base.DAMAGE
    },
    GUNS: weaponArray({
        POSITION: mystical_gun_position,
        PROPERTIES: {
            SHOOT_SETTINGS: combineStats([g.drone, g.summoner, { size: 0.8 }]),
            TYPE: "summonerDrone",
            AUTOFIRE: true,
            SYNCS_SKILLS: true,
            STAT_CALCULATOR: "drone",
            WAIT_TO_CYCLE: true
        }
    }, 4)
};
Class.enchantress = {
    PARENT: "miniboss",
    LABEL: "Enchantress",
    DANGER: 8,
    SHAPE: 3.5,
    COLOR: "orange",
    UPGRADE_COLOR: "orange",
    SIZE: 26,
    MAX_CHILDREN: 28,
    VALUE: 4e5,
    BODY: {
        FOV: 0.5,
        SPEED: 0.09 * base.SPEED,
        HEALTH: 10 * base.HEALTH,
        DAMAGE: 3 * base.DAMAGE
    },
    GUNS: weaponArray({
        POSITION: mystical_gun_position,
        PROPERTIES: {
            SHOOT_SETTINGS: combineStats([g.drone, g.summoner, { size: 0.9, damage: 1.1 }]),
            TYPE: "enchantressDrone",
            AUTOFIRE: true,
            SYNCS_SKILLS: true,
            STAT_CALCULATOR: "drone",
            WAIT_TO_CYCLE: true
        }
    }, 3)
};
Class.exorcistor = {
    PARENT: "miniboss",
    LABEL: "Exorcistor",
    DANGER: 8,
    SHAPE: 5.5,
    COLOR: "purple",
    UPGRADE_COLOR: "purple",
    SIZE: 26,
    MAX_CHILDREN: 20,
    VALUE: 5e5,
    BODY: {
        FOV: 0.5,
        SPEED: 0.08 * base.SPEED,
        HEALTH: 15 * base.HEALTH,
        DAMAGE: 4 * base.DAMAGE
    },
    GUNS: weaponArray({
        POSITION: mystical_gun_position,
        PROPERTIES: {
            SHOOT_SETTINGS: combineStats([g.drone, g.summoner, g.destroyer, { maxSpeed: 1.2, reload: 5, size: 1.15, damage: 4 }]),
            TYPE: "exorcistorDrone",
            AUTOFIRE: true,
            SYNCS_SKILLS: true,
            STAT_CALCULATOR: "drone",
            WAIT_TO_CYCLE: true
        }
    }, 5, {delayIncrement: 1 / 5})
};
Class.shaman = {
    PARENT: "miniboss",
    LABEL: "Shaman",
    DANGER: 8,
    SHAPE: 6,
    COLOR: "aqua",
    UPGRADE_COLOR: "aqua",
    SIZE: 26,
    MAX_CHILDREN: 20,
    VALUE: 6e5,
    BODY: {
        FOV: 0.5,
        SPEED: 0.07 * base.SPEED,
        HEALTH: 20 * base.HEALTH,
        DAMAGE: 5 * base.DAMAGE
    },
    GUNS: weaponArray({
        POSITION: mystical_gun_position,
        PROPERTIES: {
            SHOOT_SETTINGS: combineStats([g.drone, g.summoner, g.destroyer, { size: 1.25, maxSpeed: 1.2, damage: 1.1, reload: 3, damage: 4 }]),
            TYPE: "shamanDrone",
            AUTOFIRE: true,
            SYNCS_SKILLS: true,
            STAT_CALCULATOR: "drone",
            WAIT_TO_CYCLE: true
        }
    }, 6, {delayIncrement: 1 / 6})
};

if (Config.classic_food) {
    Class.shaman.COLOR = "magenta";
    Class.shaman.UPGRADE_COLOR = "magenta";
};
