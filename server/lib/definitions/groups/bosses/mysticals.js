const {combineStats, makeMenu, weaponArray, weaponMirror} = require('../../facilitators.js')
const {base} = require('../../constants.js')
const g = require('../../gunvals.js')

const mystical_gun_position = {
    LENGTH: 3.5,
    WIDTH: 8.65,
    ASPECT: 1.2,
    X: 8
}

Class.sorcerer = {
    PARENT: "miniboss",
    LABEL: "Sorcerer",
    DANGER: 7,
    SHAPE: 0,
    COLOR: 'egg',
    UPGRADE_COLOR: 'egg',
    SIZE: 26,
    MAX_CHILDREN: 50,
    VALUE: 2e5,
    BODY: {
        FOV: 0.5,
        SPEED: 0.12 * base.SPEED,
        HEALTH: 6 * base.HEALTH,
        DAMAGE: 2 * base.DAMAGE,
    },
    GUNS: weaponArray({
        POSITION: mystical_gun_position,
        PROPERTIES: {
            SHOOT_SETTINGS: combineStats([g.drone, g.summoner, g.machineGun, g.machineGunner, { damage: 1.8, size: 0.4, spray: 150, speed: 2, shudder: 1.75 }]),
            TYPE: "sorcererDrone",
            AUTOFIRE: true,
            SYNCS_SKILLS: true,
            STAT_CALCULATOR: "drone",
            WAIT_TO_CYCLE: true,
        },
    }, 2)
}
Class.summoner = {
    PARENT: "miniboss",
    LABEL: "Summoner",
    DANGER: 8,
    SHAPE: 4,
    COLOR: 'square',
    UPGRADE_COLOR: 'square',
    SIZE: 26,
    MAX_CHILDREN: 28,
    VALUE: 3e5,
    BODY: {
        FOV: 0.5,
        SPEED: 0.1 * base.SPEED,
        HEALTH: 7 * base.HEALTH,
        DAMAGE: 2.6 * base.DAMAGE,
    },
    GUNS: weaponArray({
        POSITION: mystical_gun_position,
        PROPERTIES: {
            SHOOT_SETTINGS: combineStats([g.drone, g.summoner, { size: 0.8 }]),
            TYPE: "summonerDrone",
            AUTOFIRE: true,
            SYNCS_SKILLS: true,
            STAT_CALCULATOR: "drone",
            WAIT_TO_CYCLE: true,
        },
    }, 4)
}
Class.enchantress = {
    PARENT: "miniboss",
    LABEL: "Enchantress",
    DANGER: 8,
    SHAPE: 3.5,
    COLOR: 'triangle',
    UPGRADE_COLOR: 'triangle',
    SIZE: 26,
    MAX_CHILDREN: 28,
    VALUE: 4e5,
    BODY: {
        FOV: 0.5,
        SPEED: 0.09 * base.SPEED,
        HEALTH: 10 * base.HEALTH,
        DAMAGE: 3 * base.DAMAGE,
    },
    GUNS: weaponArray({
        POSITION: mystical_gun_position,
        PROPERTIES: {
            SHOOT_SETTINGS: combineStats([g.drone, g.summoner, { size: 0.9, damage: 1.1 }]),
            TYPE: "enchantressDrone",
            AUTOFIRE: true,
            SYNCS_SKILLS: true,
            STAT_CALCULATOR: "drone",
            WAIT_TO_CYCLE: true,
        },
    }, 3)
}
Class.exorcistor = {
    PARENT: "miniboss",
    LABEL: "Exorcistor",
    DANGER: 8,
    SHAPE: 5.5,
    COLOR: 'pentagon',
    UPGRADE_COLOR: 'pentagon',
    SIZE: 26,
    MAX_CHILDREN: 20,
    VALUE: 5e5,
    BODY: {
        FOV: 0.5,
        SPEED: 0.08 * base.SPEED,
        HEALTH: 15 * base.HEALTH,
        DAMAGE: 4 * base.DAMAGE,
    },
    GUNS: weaponArray({
        POSITION: mystical_gun_position,
        PROPERTIES: {
            SHOOT_SETTINGS: combineStats([g.drone, g.summoner, g.destroyer, { maxSpeed: 1.2, reload: 5, size: 1.15, damage: 4 }]),
            TYPE: "exorcistorDrone",
            AUTOFIRE: true,
            SYNCS_SKILLS: true,
            STAT_CALCULATOR: "drone",
            WAIT_TO_CYCLE: true,
        },
    }, 5, {delayIncrement: 1/5})
}
Class.shaman = {
    PARENT: "miniboss",
    LABEL: "Shaman",
    DANGER: 8,
    SHAPE: 6,
    COLOR: 'hexagon',
    UPGRADE_COLOR: 'hexagon',
    SIZE: 26,
    MAX_CHILDREN: 20,
    VALUE: 6e5,
    BODY: {
        FOV: 0.5,
        SPEED: 0.07 * base.SPEED,
        HEALTH: 20 * base.HEALTH,
        DAMAGE: 5 * base.DAMAGE,
    },
    GUNS: weaponArray({
        POSITION: mystical_gun_position,
        PROPERTIES: {
            SHOOT_SETTINGS: combineStats([g.drone, g.summoner, g.destroyer, { size: 1.25, maxSpeed: 1.2, damage: 1.1, reload: 3, damage: 4 }]),
            TYPE: "shamanDrone",
            AUTOFIRE: true,
            SYNCS_SKILLS: true,
            STAT_CALCULATOR: "drone",
            WAIT_TO_CYCLE: true,
        },
    }, 6, {delayIncrement: 1/6})
}
Class.sangoma = {
    PARENT: "miniboss",
    LABEL: "Sangoma",
    DANGER: 9,
    SHAPE: 7.5,
    COLOR: "green",
    UPGRADE_COLOR: "green",
    SIZE: 26,
    MAX_CHILDREN: 20,
    VALUE: 7e5,
    BODY: {
        FOV: 0.5,
        SPEED: 0.06 * base.SPEED,
        HEALTH: 25 * base.HEALTH,
        DAMAGE: 6 * base.DAMAGE,
    },
    GUNS: weaponArray({
        POSITION: {
            ...mystical_gun_position,
            WIDTH: 8.15
        },
        PROPERTIES: {
            SHOOT_SETTINGS: combineStats([g.drone, g.summoner, g.destroyer, { size: 1.25, maxSpeed: 1.2, damage: 1.1, reload: 3, damage: 4 }]),
            TYPE: "sangomaDrone",
            AUTOFIRE: true,
            SYNCS_SKILLS: true,
            STAT_CALCULATOR: "drone",
            WAIT_TO_CYCLE: true,
        },
    }, 7, {delayIncrement: 1/7})
}
Class.preacher = {
    PARENT: "miniboss",
    LABEL: "Preacher",
    DANGER: 9,
    SHAPE: 8,
    COLOR: Class.octagon.COLOR,
    UPGRADE_COLOR: Class.octagon.COLOR,
    SIZE: 26,
    MAX_CHILDREN: 16,
    VALUE: 8e5,
    BODY: {
        FOV: 0.5,
        SPEED: 0.05 * base.SPEED,
        HEALTH: 30 * base.HEALTH,
        DAMAGE: 7 * base.DAMAGE,
    },
    GUNS: weaponArray({
        POSITION: {
            ...mystical_gun_position,
            WIDTH: 6.65
        },
        PROPERTIES: {
            SHOOT_SETTINGS: combineStats([g.drone, g.summoner, g.destroyer, g.annihilator, { size: 1.45, maxSpeed: 1.2, damage: 1.1, reload: 3, damage: 4 }]),
            TYPE: "preacherDrone",
            AUTOFIRE: true,
            SYNCS_SKILLS: true,
            STAT_CALCULATOR: "drone",
            WAIT_TO_CYCLE: true,
        },
    }, 8, {delayIncrement: 0.125})
}
Class.herbalist = {
    PARENT: "miniboss",
    LABEL: "Herbalist",
    DANGER: 9,
    SHAPE: 9.5,
    COLOR: "white",
    UPGRADE_COLOR: "white",
    SIZE: 26,
    MAX_CHILDREN: 12,
    VALUE: 9e5,
    BODY: {
        FOV: 0.5,
        SPEED: 0.04 * base.SPEED,
        HEALTH: 35 * base.HEALTH,
        DAMAGE: 8 * base.DAMAGE,
    },
    GUNS: weaponArray({
        POSITION: {
            ...mystical_gun_position,
            WIDTH: 6.15
        },
        PROPERTIES: {
            SHOOT_SETTINGS: combineStats([g.drone, g.summoner, g.destroyer, g.annihilator, { size: 1.7, maxSpeed: 1.2, damage: 1.1, reload: 3, damage: 4 }]),
            TYPE: "herbalistDrone",
            AUTOFIRE: true,
            SYNCS_SKILLS: true,
            STAT_CALCULATOR: "drone",
            WAIT_TO_CYCLE: true,
        },
    }, 9, {delayIncrement: 1/9})
}
Class.witch = {
    PARENT: "miniboss",
    LABEL: "Witch",
    DANGER: 8,
    SHAPE: 3.5,
    COLOR: 'pink',
    UPGRADE_COLOR: 'pink',
    SIZE: 26,
    MAX_CHILDREN: 40,
    VALUE: 2.5e5,
    BODY: {
        FOV: 0.5,
        SPEED: 0.11 * base.SPEED,
        HEALTH: 6.5 * base.HEALTH,
        DAMAGE: 2.3 * base.DAMAGE,
    },
    GUNS: weaponArray(weaponMirror({
        POSITION: {
            ...mystical_gun_position,
            Y: 5.5
        },
        PROPERTIES: {
            SHOOT_SETTINGS: combineStats([g.drone, g.summoner, { size: 0.4 }]),
            TYPE: "enchantressDrone",
            AUTOFIRE: true,
            SYNCS_SKILLS: true,
            STAT_CALCULATOR: "drone",
            WAIT_TO_CYCLE: true,
        },
    }, {delayIncrement: 0.5}), 3)
}

if (Config.classic_food) {
    Class.menu_mysticalBosses.UPGRADES_TIER_0.splice(5, 0, 'sangoma', 'preacher', 'herbalist')
    Class.shaman.COLOR = "magenta"
    Class.shaman.UPGRADE_COLOR = "magenta"
}
