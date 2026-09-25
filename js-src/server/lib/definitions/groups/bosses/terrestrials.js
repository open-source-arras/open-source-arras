const {combineStats, LayeredBoss, makeMenu, setTurretProjectileRecoil} = require('../../facilitators.js')
const {base} = require('../../constants.js')
const g = require('../../gunvals.js')
const preset = require('../../presets.js')

Class.terrestrial = {
    PARENT: "miniboss",
    LABEL: "Terrestrial",
    SKILL: [6, 9, 9, 9, 1, 9, 9, 9, 4, 0],
    VALUE: 5e5,
    SHAPE: 7,
    SIZE: 35,
    CONTROLLERS: [["minion", {turnwiserange: 360}]],
    BODY: {
        FOV: 1,
        HEALTH: 1000,
        SHIELD: 50,
        REGEN: base.REGEN * 0.3,
        SPEED: base.SPEED * 0.7,
        DAMAGE: 9,
    },
    ON: [preset.on.retrograde_self_destruct]
}

Class.menu_terrestrials = makeMenu("Terrestrials", {upgrades: [
    "ares",
    "gersemi",
    "ezekiel",
    "eris",
    "selene",
], color: "orange", boxColor: "orange", shape: 7.5})

let ares = new LayeredBoss(null, "Ares", "terrestrial", 7, "purple", "terrestrialTrapTurret", 7, 5.5)
ares.addLayer({gun: {
    POSITION: [3.75, 7, 1.2, 8, 0, null, 0],
    PROPERTIES: {
        SHOOT_SETTINGS: combineStats([g.drone, g.summoner, g.destroyer, {health: 1.2, damage: 1.1, resist: 1.1, density: 1.5, maxSpeed: 1.25}]),
        TYPE: ["exorcistorDrone", { INDEPENDENT: true }],
        AUTOFIRE: true,
        SYNCS_SKILLS: true,
        STAT_CALCULATOR: "drone",
        WAIT_TO_CYCLE: true,
    },
}}, false, null, 18)
ares.addLayer({turret: {
    POSITION: [10, 8.5, 0, null, 160, 0],
    TYPE: ["protoSwarmerTurret", { INDEPENDENT: true }],
}}, true, 6.5)

let gersemi = new LayeredBoss(null, "Gersemi", "terrestrial", 7, "lime", "terrestrialTrapTurret", 7, 5.5)
gersemi.addLayer({turret: {
    POSITION: [9, 8, 0, null, 160, 0],
    TYPE: ["swarmTurret", { INDEPENDENT: true, GUN_STAT_SCALE: {health: 1.7, damage: 1.2} }],
}})
gersemi.addLayer({turret: {
    POSITION: [9.5, 7.5, 0, null, 160, 0],
    TYPE: ["basicTurret", { INDEPENDENT: true, GUN_STAT_SCALE: {health: 1.8, damage: 1.3} }],
}}, true, 6.5)

let ezekiel = new LayeredBoss(null, "Ezekiel", "terrestrial", 7, "orange", "terrestrialTrapTurret", 7, 5.5)
ezekiel.addLayer({gun: {
    POSITION: [3.75, 7, 1.2, 8, 0, null, 0],
    PROPERTIES: {
        SHOOT_SETTINGS: combineStats([g.drone, g.summoner, g.destroyer, {health: 1.2, damage: 1.1, resist: 1.1, density: 1.5, maxSpeed: 1.25}]),
        TYPE: ["enchantressDrone", { COLOR: "orange", INDEPENDENT: true }],
        AUTOFIRE: true,
        SYNCS_SKILLS: true,
        STAT_CALCULATOR: "drone",
        WAIT_TO_CYCLE: true,
    },
}}, true, null, 18)
ezekiel.addLayer({turret: {
    POSITION: [10, 7.5, 0, null, 160, 0],
    TYPE: [setTurretProjectileRecoil("skimmerTurret", 0.5), { COLOR: "grey", INDEPENDENT: true, GUN_STAT_SCALE: {maxSpeed: 0.5} }],
}}, true, 6.5)

let eris = new LayeredBoss(null, "Eris", "terrestrial", 7, "pink", "terrestrialTrapTurret", 7, 5.5)
eris.addLayer({gun: {
    POSITION: [3.75, 7, 1.2, 8, 0, null, 0],
    PROPERTIES: {
        SHOOT_SETTINGS: combineStats([g.minion, { size: 0.7, maxSpeed: 0.85, damage: 0.8 }]),
        TYPE: ["minion", { INDEPENDENT: true, COLOR: 'pink' }],
        AUTOFIRE: true,
        SYNCS_SKILLS: true,
        STAT_CALCULATOR: "drone",
        WAIT_TO_CYCLE: true,
    },
}}, false, null, 14)
eris.addLayer({turret: {
    POSITION: [10, 8.5, 0, null, 160, 0],
    TYPE: [setTurretProjectileRecoil("rocketeerTurret", 0.43), { INDEPENDENT: true, GUN_STAT_SCALE: {maxSpeed: 0.43} }],
}}, true, 6.5)

let selene = new LayeredBoss(null, "Selene", "terrestrial", 7, "gold", "terrestrialTrapTurret", 7, 5.5)
selene.addLayer({gun: {
    POSITION: [3.75, 7, 1.2, 8, 0, null, 0],
    PROPERTIES: {
        SHOOT_SETTINGS: combineStats([g.drone, g.summoner, g.destroyer, {health: 1.2, damage: 1.1, resist: 1.1, density: 1.5, maxSpeed: 1.25}]),
        TYPE: ["summonerDrone", { COLOR: "gold", INDEPENDENT: true }],
        AUTOFIRE: true,
        SYNCS_SKILLS: true,
        STAT_CALCULATOR: "drone",
        WAIT_TO_CYCLE: true,
    },
}}, true, null, 18)
selene.addLayer({turret: {
    POSITION: [10, 7.5, 0, null, 160, 0],
    TYPE: ["hyperTwisterTurret", { INDEPENDENT: true }],
}}, true, 6.5)
