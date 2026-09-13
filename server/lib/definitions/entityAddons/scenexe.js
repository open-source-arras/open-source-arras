const {base} = require("../constants.js");
const {basePolygonDamage, basePolygonHealth, statnames} = require("../constants");
const {combineStats, makeTurret, makeHat, weaponMirror, weaponArray, makeAuto} = require("../facilitators");

// This addon is enabled by default. If you want to enable it, simply make the line below run.
return //console.log("[scenexe.js]: Addon disabled.");

let enableOnSpawn = false; // edit this to toggle spawning as a scenexe tank in the server

let g = {
    // Bases
    basic: { reload: 7.5, recoil: 1.4, shudder: 0.1, damage: 0.75, speed: 3, spray: 15, range: 0.5, health: 1.04 },
    drone: { reload: 25, recoil: 0.25, shudder: 0.1, size: 0.8, speed: 1.25, spray: 0.1, damage: 0.675, health: 0.5 },
    trap: { reload: 25, shudder: 0.25, size: 1.15, damage: 0.7, speed: 5, spray: 0, resist: 3, health: 1.33 },
    swarm: { reload: 18, recoil: 0.25, shudder: 0.05, size: 0.4, damage: 0.75, speed: 4, spray: 5 },
    factory: { reload: 48, shudder: 0.1, size: 0.7, damage: 0.75, speed: 3, spray: 0.1 },
    productionist: { reload: 56, recoil: 0.25, shudder: 0.05, size: 0.7, damage: 0.75, speed: 4, range: 1.5, spray: 5 },

    // Spammers
    desmos: { reload: 1.1, range: 1.2, shudder: 0, spray: 0, damage: 0.75, speed: 0.5 },
    single: { reload: 1.05, speed: 1.05 },
    twin: { recoil: 0.5, shudder: 0.9, health: 0.9, damage: 0.7, spray: 1.2 },
    doubleTwin: { damage: 1.1 },
    tripleTwin: { health: 1.1 },
    hewnDouble: { reload: 1.25, recoil: 1.5, health: 0.9, damage: 0.85, maxSpeed: 0.9 },
    tripleShot: { reload: 1.1, shudder: 0.8, health: 0.9, pen: 0.8, density: 0.8, spray: 0.5 },
    spreadshotMain: { recoil: 0.25, shudder: 0.5, health: 1.1 },
    spreadshot: { reload: 1.5, shudder: 0.25, speed: 0.7, maxSpeed: 0.7, spray: 0.25, health: 0.84 },
    triplet: { reload: 1.2, recoil: 2/3, shudder: 0.9, health: 0.85, damage: 0.85, pen: 0.9, density: 1.1, spray: 0.9, resist: 0.95 },
    turret: { reload: 2, health: 0.8, damage: 0.6, pen: 0.7, density: 0.1 },
    autoTurret: { reload: 0.9, recoil: 0.75, shudder: 0.5, size: 0.8, health: 0.9, damage: 0.6, pen: 1.2, range: 0.8, density: 1.3, resist: 1.25 },
    quint: { reload: 1.5, recoil: 0.667, shudder: 0.9, pen: 0.9, density: 1.1, spray: 0.9, resist: 0.95 },
    machineShot: { reload: 0.3, recoil: 0.8, shudder: 0.4, health: 0.7, damage: 0.7, speed: 4.5, maxSpeed: 5.9, spray: 19 },

    // Snipers
    sniper: { reload: 1.35, shudder: 0.25, damage: 0.8, pen: 1.1, speed: 1.5, maxSpeed: 1.5, density: 1.5, spray: 0.2, resist: 1.15 },
    crossbow: { reload: 2, health: 0.6, damage: 0.6, pen: 0.8 },
    assassin: { reload: 1.65, shudder: 0.25, health: 1.15, pen: 1.1, speed: 1.18, maxSpeed: 1.18, density: 3, resist: 1.3 },
    hunter: { reload: 1.5, recoil: 0.7, size: 0.95, damage: 0.9, speed: 1.1, maxSpeed: 0.8, density: 1.2, resist: 1.15 },
    hunterSecondary: { size: 0.9, health: 2, damage: 0.5, pen: 1.5, density: 1.2, resist: 1.1 },
    predator: { reload: 1.4, size: 0.8, health: 1.5, damage: 0.9, pen: 1.2, speed: 0.9, maxSpeed: 0.9 },
    dual: { reload: 2, shudder: 0.8, health: 1.5, speed: 1.3, maxSpeed: 1.1, resist: 1.25 },
    rifle: { reload: 0.8, recoil: 0.8, shudder: 1.5, health: 0.8, damage: 0.8, pen: 0.9, spray: 2 },
    blunderbuss: { recoil: 0.1, shudder: 0.5, health: 0.4, damage: 0.2, pen: 0.4, spray: 0.5 },
    railgun: { reload: 4.2, damage: 0.81, health: 3.06, resist: 2.3, density: 0.7, speed: 1.375, maxSpeed: 1.375 },
    marksman: { pen: 2, damage: 0.12, health: 25/3, reload: 1.75 },

    // Machine guns
    machineGun: { reload: 0.5, recoil: 0.8, shudder: 1.7, health: 0.7, damage: 0.7, maxSpeed: 0.8, spray: 2.5 },
    minigun: { reload: 1.25, recoil: 0.6, size: 0.8, health: 0.55, damage: 0.45, pen: 1.25, speed: 1.33, density: 1.25, spray: 0.5, resist: 1.1 },
    streamliner: { reload: 1.1, recoil: 0.6, damage: 0.65, speed: 1.24 },
    nailgun: { reload: 0.85, recoil: 2.5, size: 0.8, damage: 0.7, density: 2 },
    pelleter: { reload: 1.25, recoil: 0.25, shudder: 1.5, size: 1.1, damage: 0.35, pen: 1.35, density: 1.5, spray: 1.5, resist: 1.2 },
    gunner: { recoil: 0.25, shudder: 1.5, size: 1.2, health: 1.35, damage: 0.25, pen: 1.25, speed: 0.8, maxSpeed: 0.65, density: 1.5, spray: 1.5, resist: 1.2 },
    machineGunner: { reload: 0.66, recoil: 0.8, shudder: 2, damage: 0.75, speed: 1.2, maxSpeed: 0.8, spray: 2.5 },
    blaster: { recoil: 1.2, shudder: 1.25, size: 1.1, health: 1.5, pen: 0.6, speed: 0.8, maxSpeed: 0.33, range: 0.6, density: 0.5, spray: 1.5, resist: 0.8 },
    focal: { reload: 1.25, recoil: 4/3, shudder: 0.8, health: 0.8, pen: 1.1, speed: 1.25, maxSpeed: 1.25, range: 1.1, density: 1.25, spray: 0.5, resist: 1.1 },
    atomizer: { reload: 0.3, recoil: 0.8, size: 0.5, damage: 0.75, speed: 1.2, maxSpeed: 0.8, spray: 2.25 },
    spam: { reload: 1.1, size: 1.05, damage: 1.1, speed: 0.9, maxSpeed: 0.7, resist: 1.05 },
    gunnerDominator: { reload: 1.1, recoil: 0, shudder: 1.1, size: 0.5, health: 0.5, damage: 0.5, speed: 1.1, density: 0.9, spray: 1.2, resist: 0.8 },

    // Flanks
    flankGuard: { recoil: 1.2, health: 1.02, damage: 0.81, pen: 0.9, maxSpeed: 0.85, density: 1.2 },
    cyclone: { health: 1.3, damage: 1.3, pen: 1.1, speed: 1.5, maxSpeed: 1.15 },
    triAngle: { recoil: 0.9, health: 0.9, speed: 0.8, maxSpeed: 0.8, range: 0.6 },
    triAngleFront: { recoil: 0.2, speed: 1.3, maxSpeed: 1.1, range: 1.5 },
    thruster: { recoil: 1.5, shudder: 2, health: 0.5, damage: 0.5, pen: 0.7, spray: 0.5, resist: 0.7 },

    // Drones
    overseer: { reload: 1.25, size: 0.85, health: 0.7, damage: 0.8, maxSpeed: 0.9, density: 2 },
    overdrive: { reload: 2.5, health: 0.8, damage: 0.8, pen: 0.8, speed: 0.9, maxSpeed: 0.9, range: 0.9, spray: 1.2 },
    commander: { reload: 1.5, health: 0.4, damage: 0.7 },
    baseProtector: { reload: 0.7, size: 1.5, recoil: 0.000001, health: 100, speed: 2.3, maxSpeed: 1.1, range: 0.5, density: 5, resist: 10 },
    battleship: { health: 1.25, damage: 1.15, maxSpeed: 0.85, resist: 1.1 },
    carrier: { reload: 1.5, damage: 0.8, speed: 1.3, maxSpeed: 1.2, range: 1.2 },
    bee: { reload: 1.3, size: 1.4, damage: 1.5, pen: 0.5, speed: 1.5, maxSpeed: 1.5, density: 0.25 },
    sunchip: { reload: 4, size: 1.4, health: 0.5, damage: 0.4, pen: 0.6, density: 0.8 },
    maleficitor: { reload: 0.25, size: 1.05, health: 1.15, damage: 1.15, pen: 1.15, speed: 0.8, maxSpeed: 0.8, density: 1.15 },
    summoner: { reload: 0.3, size: 1.125, health: 0.5, damage: 0.345, pen: 0.4, density: 0.8 },
    minionGun: { recoil: 0, shudder: 2, health: 0.6, damage: 0.4, pen: 1.2, range: 0.75, spray: 2 },
    spawner: { reload: 1.5, maxSpeed: 1.25 },
    bigCheese: { reload: 1.5, size: 1.8, health: 2.5, speed: 1.25 },
    mothership: { reload: 1.25, pen: 1.1, speed: 0.775, maxSpeed: 0.8, range: 15, resist: 1.15 },
    satellite: { size: 0.8, reload: 3, damage: 1.875 },

    // Heavy cannons
    pounder: { reload: 2, recoil: 1.6, damage: 2, speed: 0.85, maxSpeed: 0.8, density: 1.5, resist: 1.15 },
    destroyer: { reload: 2, recoil: 1.8, shudder: 0.5, health: 2, damage: 0.90, pen: 1.2, speed: 0.50, maxSpeed: 0.6, density: 2, resist: 3 },
    annihilator: { reload: 1, recoil: 1.35, damage: 0.86 },
    hive: { reload: 1.5, recoil: 0.8, size: 0.8, health: 0.7, damage: 0.3, maxSpeed: 0.6 },
    artillery: { reload: 1.2, recoil: 0.7, size: 0.9, speed: 1.15, maxSpeed: 1.1, density: 1.5 },
    mortar: { reload: 1.2, health: 1.1, speed: 0.8, maxSpeed: 0.8 },
    shotgun: { reload: 8, recoil: 0.4, size: 1.5, damage: 0.4, pen: 0.8, speed: 1.8, maxSpeed: 0.6, density: 1.2, spray: 1.2 },
    destroyerDominator: { reload: 6.5, recoil: 0, size: 0.975, health: 5, damage: 5, pen: 5, speed: 0.575, maxSpeed: 0.475, spray: 0.5 },

    // Missiles
    launcher: { reload: 1.5, recoil: 1.5, shudder: 0.1, size: 0.72, health: 1.05, damage: 0.925, speed: 0.9, maxSpeed: 1.2, range: 1.1, resist: 1.5 },
    skimmer: { recoil: 0.8, shudder: 0.8, size: 0.9, health: 1.35, damage: 0.8, pen: 2, speed: 0.85, maxSpeed: 0.85, resist: 1.1 },
    snake: { reload: 0.4, shudder: 4, health: 1.5, damage: 0.9, pen: 1.2, speed: 0.1, maxSpeed: 0.35, density: 3, spray: 6, resist: 0.5 },
    snakeskin: { reload: 0.6, shudder: 2, health: 0.5, damage: 0.5, speed: 2, maxSpeed: 0.2, range: 0.4, spray: 5 },
    sidewinder: { reload: 1.5, recoil: 2, health: 1.5, damage: 0.9, speed: 0.15, maxSpeed: 0.5 },
    rocketeer: { reload: 1.4, shudder: 0.9, size: 1.2, health: 1.5, damage: 1.4, pen: 1.4, speed: 0.3, range: 1.2, resist: 1.4 },
    missileTrail: { reload: 0.6, recoil: 0.25, shudder: 2, damage: 0.9, pen: 0.7, speed: 0.4, range: 0.5 },
    rocketeerMissileTrail: { reload: 0.5, recoil: 7, shudder: 1.5, size: 0.8, health: 0.8, damage: 0.7, speed: 0.9, maxSpeed: 0.8, spray: 5 },

    // Traps and blocks
    setTrap: { reload: 1.1, recoil: 2, shudder: 0.1, size: 1.5, health: 2, pen: 1.25, speed: 2.2, maxSpeed: 2.15, range: 1.25, resist: 1.25 },
    construct: { reload: 1.3, size: 0.9, maxSpeed: 1.1 },
    boomerang: { reload: 0.8, health: 0.5, damage: 0.5, speed: 0.75, maxSpeed: 0.75, range: 4/3 },
    nestKeeper: { reload: 3, size: 0.75, health: 1.05, damage: 1.05, pen: 1.1, speed: 0.5, maxSpeed: 0.5, range: 0.5, density: 1.1 },
    hexaTrapper: { reload: 1.3, shudder: 1.25, speed: 0.8, range: 0.5 },
    trapperDominator: { reload: 1.46, recoil: 0, shudder: 0.25, health: 1.25, damage: 1.45, pen: 1.6, speed: 0.5, maxSpeed: 2, range: 1.1, spray: 0.5 },
    megaTrapper: { reload: 2, damage: 2, recoil: 2, size: 1.2 },
    barricade: { reload: 0.75, damage: 0.79, range: 0.5 },
    gamma: { reload: 1.6, damage: 2, speed: 0.2, pen: 1.5 },
    rubble: { reload: 0.9, health: 0.87 },

    // Speed
    fast: { speed: 1.2 },
    veryfast: { speed: 2.5 },
    morespeed: { speed: 1.3, maxSpeed: 1.3 },

    // Misc
    blank: { reload: 1, recoil: 1, shudder: 1, size: 1, health: 1, damage: 1, pen: 1, speed: 1, maxSpeed: 1, range: 1, density: 1, spray: 1, resist: 1 },
    weak: { reload: 2, health: 0.6, damage: 0.6, pen: 0.8, speed: 0.5, maxSpeed: 0.7, range: 0.25, density: 0.3 },
    power: { shudder: 0.6, size: 1.2, pen: 1.25, density: 2, spray: 0.5, resist: 1.5 },
    fake: { size: 0.00001, health: 0.0001, speed: 0, maxSpeed: 0, shudder: 0, spray: 0, recoil: 0, range: 0 },
    op: { reload: 0.5, recoil: 1.3, health: 4, damage: 4, pen: 4, speed: 3, maxSpeed: 2, density: 5, spray: 2 },
    arenaCloser: { reload: 0.80, recoil: 0.25, health: 1000, damage: 1000, pen: 1000, speed: 2.5, maxSpeed: 1.15, range: 1.8, density: 4, spray: 0.25 },
    healer: { damage: -1, speed: 0.5, maxSpeed: 0.5, recoil: 0.5 },
    lowPower: { shudder: 2, health: 0.5, damage: 0.5, pen: 0.7, spray: 0.5, resist: 0.7 },
    halfrange: { range: 0.5 },
    aura: { reload: 0.001, recoil: 0.001, shudder: 0.001, size: 6, speed: 0.001, maxSpeed: 0.001, spray: 0.001 },
    noSpread: { shudder: 0, spray: 0 }
}

const baseScenexe = {
    FOV: base.FOV * 1.6,
    HEALTH: base.HEALTH * 1.05
}

if (enableOnSpawn) {
    Config.spawn_class = ["scenexeBase", "scenexeNode"]
    Config.level_cap_cheat = 45
}

Class.scenexeTrap = {
    LABEL: "Trap",
    TYPE: "trap",
    ACCEPTS_SCORE: false,
    SHAPE: 4,
    MOTION_TYPE: "glide",
    FACING_TYPE: "turnWithSpeed",
    HITS_OWN_TYPE: "push",
    DIE_AT_RANGE: true,
    BODY: {
        HEALTH: 0.5,
        DAMAGE: 3,
        RANGE: 450,
        DENSITY: 2.5,
        RESIST: 2.5,
        SPEED: 0
    }
}
Class.scenexePillbox = {
    PARENT: "scenexeTrap",
    LABEL: "Auto-Trap",
    INDEPENDENT: true,
    DIE_AT_RANGE: true,
    TURRETS: [
        {
            POSITION: [11, 0, 0, 0, 360, 1],
            TYPE: "scenexePillboxTurret"
        }
    ]
}

Class.triangle = {
    PARENT: "food",
    LABEL: "Triangle",
    VALUE: 30,
    SHAPE: 3,
    SIZE: 9,
    COLOR: "gold",
    BODY: {
        DAMAGE: basePolygonDamage,
        DENSITY: 4,
        HEALTH: basePolygonHealth,
        PENETRATION: 2,
        ACCELERATION: 0.0075
    },
    DRAW_HEALTH: true,
    INTANGIBLE: false
}

Class.square = {
    PARENT: "food",
    LABEL: "Square",
    VALUE: 120,
    SHAPE: 4,
    SIZE: 14,
    COLOR: "orange",
    BODY: {
        DAMAGE: basePolygonDamage,
        DENSITY: 6,
        HEALTH: 1.5 * basePolygonHealth,
        RESIST: 1.15,
        PENETRATION: 1.5,
        ACCELERATION: 0.005
    },
    DRAW_HEALTH: true
}

Class.hexagon = {
    PARENT: "food",
    LABEL: "Hexagon",
    VALUE: 500,
    SHAPE: 6,
    SIZE: 32,
    COLOR: "#FCA644",
    BODY: {
        DAMAGE: 2 * basePolygonDamage,
        DENSITY: 8,
        HEALTH: 10 * basePolygonHealth,
        RESIST: 1.3,
        SHIELD: 50 * basePolygonHealth,
        PENETRATION: 1.1,
        ACCELERATION: 0.003
    },
    DRAW_HEALTH: true
}

Class.octagonDeco = makeHat(8, { color: "green" })
Class.hearthDeco = makeHat(0, { color: "red"})

makeHearth = (damageFactor = 1, sizeFactor = 1, opacity = 0.3, auraColor) => {
    let isHeal = damageFactor < 0;
    let auraType = isHeal ? "healAura" : "aura";
    auraColor = auraColor ?? (isHeal ? "green" : "red");
    return {
        PARENT: ["genericTank"],
        INDEPENDENT: true,
        LABEL: "",
        COLOR: "grey",
        GUNS: [
            {
                POSITION: [0, 20, 1, 0, 0, 0, 0],
                PROPERTIES: {
                    SHOOT_SETTINGS: combineStats([g.aura, { size: sizeFactor, damage: damageFactor }]),
                    TYPE: [auraType, { COLOR: auraColor, ALPHA: opacity }],
                    MAX_CHILDREN: 1,
                    AUTOFIRE: true,
                    SYNCS_SKILLS: true
                }
            }
        ],
        TURRETS: isHeal ? [
            {
                POSITION: [6.4 * sizeFactor, 0, 0, 0, 360, 1],
                TYPE: ["octagonDeco", { INDEPENDENT: true }]
            }
        ] : [
            {
                POSITION: [6.4 * sizeFactor, 0, 0, 0, 360, 1],
                TYPE: ["hearthDeco", { INDEPENDENT: true }]
            }
        ]
    };
}
Class.scenexePillboxTurret = makeTurret({
    HAS_NO_RECOIL: true,
    GUNS: [
        {
            POSITION: [22, 11, 1, 0, 0, 0, 0],
            PROPERTIES: {
                SHOOT_SETTINGS: combineStats([g.basic, g.minionGun, g.turret, g.autoTurret, g.power, { density: 0.1, speed: 0.5, range: 1.5 }]),
                TYPE: "bullet",
                WAIT_TO_CYCLE: true
            }
        }
    ]
}, {independent: true, extraStats: []})
Class.scenexeSentryTurret = makeTurret({
    GUNS: [
        {
            POSITION: [22, 10, 1, 0, 0, 0, 0],
            PROPERTIES: {
                SHOOT_SETTINGS: combineStats([g.basic, g.pelleter, g.power, { recoil: 1.15 }, g.turret]),
                TYPE: "bullet"
            }
        }
    ]
}, {label: "Turret", fov: 0.8, extraStats: []})
Class.scenexeTurretTurret = makeTurret({
    GUNS: weaponMirror(
        {
            POSITION: [22, 8, 1, 0, -5.5, 0, 0],
            PROPERTIES: {
                SHOOT_SETTINGS: combineStats([g.basic, g.pelleter, g.power, { recoil: 1.15 }, g.turret]),
                TYPE: "bullet"
            }
        }, {delayIncrement: 0.5})
}, {label: "Turret", fov: 0.8, extraStats: []})
Class.scenexeArtilleryTurret = makeTurret({
    GUNS: [
        {
            POSITION: [22, 14, 1, 0, 0, 0, 0],
            PROPERTIES: {
                SHOOT_SETTINGS: combineStats([g.basic, g.pelleter, g.power, { recoil: 1.15 }, g.turret, g.pounder]),
                TYPE: "bullet"
            }
        }
    ]
}, {label: "Turret", fov: 0.8, extraStats: []})
Class.scenexeTripletTurret = makeTurret({
    GUNS: [
        ...weaponMirror({
            POSITION: [18, 8.5, 1, 0, 5, 0, 0.5],
            PROPERTIES: {
                SHOOT_SETTINGS: combineStats([g.basic, g.twin, g.triplet, g.pelleter, g.power, g.turret]),
                TYPE: "bullet"
            }
        }),
        {
            POSITION: [21, 8.5, 1, 0, 0, 0, 0],
            PROPERTIES: {
                SHOOT_SETTINGS: combineStats([g.basic, g.twin, g.triplet, g.pelleter, g.power, g.turret]),
                TYPE: "bullet"
            }
        }
    ]
}, {label: "Turret", fov: 0.8, extraStats: []})
Class.scenexeHangarTurret = makeTurret({
    GUNS: [
        {
            POSITION: [0, 7, 1.3, 7, 0, 0, 0],
            PROPERTIES: {
                SHOOT_SETTINGS: combineStats([g.drone, { size: 1.5 }]),
                TYPE: "drone",
                AUTOFIRE: true,
                SYNCS_SKILLS: true,
                STAT_CALCULATOR: "drone",
                MAX_CHILDREN: 3,
                WAIT_TO_CYCLE: true
            }
        }
    ]
}, {label: "Drone Turret", fov: 0.8, extraStats: []})
Class.scenexeBattleshipTurret = makeTurret({
    GUNS: [
        {
            POSITION: [0, 7, 1.3, 7, 0, 0, 0],
            PROPERTIES: {
                SHOOT_SETTINGS: combineStats([g.drone, { size: 1.5 }]),
                TYPE: "drone",
                AUTOFIRE: true,
                SYNCS_SKILLS: true,
                STAT_CALCULATOR: "drone",
                MAX_CHILDREN: 2,
                WAIT_TO_CYCLE: true
            }
        }
    ]
}, {label: "Drone Turret", fov: 0.8, extraStats: []})
Class.scenexeHangarTurret.SHAPE = 4;
Class.scenexeBattleshipTurret.SHAPE = 4;

Class.scenexeMinion = {
    PARENT: "minion",
    GUNS: [
        {
            POSITION: [22, 9, 1, 0, 0, 0, 0],
            PROPERTIES: {
                SHOOT_SETTINGS: combineStats([g.basic, g.minionGun]),
                WAIT_TO_CYCLE: true,
                TYPE: "bullet"
            }
        }
    ]
}

Class.scenexeNode = {
    PARENT: "genericTank",
    REROOT_UPGRADE_TREE: ["scenexeNode", "scenexeBase"],
    LABEL: "Node"
}
Class.scenexeBase = {
    PARENT: "genericTank",
    REROOT_UPGRADE_TREE: ["scenexeNode", "scenexeBase"],
    LABEL: "Base",
    BODY: {
        FOV: baseScenexe.FOV,
        HEALTH: baseScenexe.HEALTH
    }
}
/* NODE */
/// MONO
// Tier 0
Class.scenexeMono = {
    PARENT: "scenexeNode",
    LABEL: "Mono",
    GUNS: [
        {
            POSITION: { LENGTH: 21,  WIDTH: 10,  ASPECT: 1 },
            PROPERTIES: {
                SHOOT_SETTINGS: combineStats([g.basic]),
                TYPE: "bullet"
            }
        }
    ]
}

// Tier 1
Class.scenexeDuo = {
    PARENT: "scenexeNode",
    LABEL: "Duo",
    GUNS: weaponMirror({
        POSITION: {
            LENGTH: 20,
            WIDTH: 8,
            Y: 5.5
        },
        PROPERTIES: {
            SHOOT_SETTINGS: combineStats([g.basic, g.twin]),
            TYPE: "bullet"
        }
    }, {delayIncrement: 0.5})
}

Class.scenexeFlank = {
    PARENT: "scenexeNode",
    LABEL: "Flank",
    GUNS: [
        {
            POSITION: { LENGTH: 21, WIDTH: 10, ASPECT: 1 },
            PROPERTIES: {
                SHOOT_SETTINGS: combineStats([g.basic, g.flankGuard]),
                TYPE: "bullet"
            }
        },
        {
            POSITION: { LENGTH: 16, WIDTH: 10, ASPECT: 1, ANGLE: 180 },
            PROPERTIES: {
                SHOOT_SETTINGS: combineStats([g.basic, g.flankGuard]),
                TYPE: "bullet"
            }
        }
    ]
}
Class.scenexeSplit = {
    PARENT: "scenexeNode",
    LABEL: "Split",
    GUNS: [
        ...weaponMirror(
            {
                POSITION: { LENGTH: 15, WIDTH: 5, ANGLE: 40 },
                PROPERTIES: {
                    SHOOT_SETTINGS: combineStats([g.basic, { damage: 0.75, pen: 1.15, recoil: 0.1 }]),
                    TYPE: "bullet"
                }
            }
        ),
        {
            POSITION: { LENGTH: 21,  WIDTH: 10,  ASPECT: 1 },
            PROPERTIES: {
                SHOOT_SETTINGS: combineStats([g.basic, { recoil: 0.9 }]),
                TYPE: "bullet"
            }
        }
    ]
}
Class.scenexeSingle = {
    PARENT: "scenexeNode",
    LABEL: "Single",
    GUNS: [{
        POSITION: { LENGTH: 21.5, WIDTH: 12.5 },
        PROPERTIES: {
            SHOOT_SETTINGS: combineStats([g.basic, g.pounder]),
            TYPE: "bullet"
        }
    }]
}
Class.scenexeSniper = {
    PARENT: "scenexeNode",
    LABEL: "Sniper",
    BODY: {
        FOV: 1.2
    },
    GUNS: [
        {
            POSITION: { LENGTH: 24, WIDTH: 10.5 },
            PROPERTIES: {
                SHOOT_SETTINGS: combineStats([g.basic, g.sniper]),
                TYPE: "bullet"
            }
        }
    ]
}

//Tier 2
Class.scenexeTrio = {
    PARENT: "scenexeNode",
    LABEL: "Trio",
    GUNS: [
        ...weaponMirror({
            POSITION: [18, 8.5, 1, 0, 5, 0, 0.5],
            PROPERTIES: {
                SHOOT_SETTINGS: combineStats([g.basic, g.twin, g.triplet]),
                TYPE: "bullet"
            }
        }),
        {
            POSITION: [21, 8.5, 1, 0, 0, 0, 0],
            PROPERTIES: {
                SHOOT_SETTINGS: combineStats([g.basic, g.twin, g.triplet]),
                TYPE: "bullet"
            }
        }
    ]
}
Class.scenexeGunner = {
    PARENT: "scenexeNode",
    LABEL: "Gunner",
    GUNS: weaponMirror([
        {
            POSITION: [12, 3.5, 1, 0, 7.25, 0, 0.5],
            PROPERTIES: {
                SHOOT_SETTINGS: combineStats([g.basic, g.twin, g.gunner, { speed: 1.2 }]),
                TYPE: "bullet"
            }
        },
        {
            POSITION: [16, 3.5, 1, 0, 3.75, 0, 0],
            PROPERTIES: {
                SHOOT_SETTINGS: combineStats([g.basic, g.twin, g.gunner, { speed: 1.2 }]),
                TYPE: "bullet"
            }
        }
    ], { delayIncrement: 0.25 })
}
Class.scenexeArc = {
    PARENT: "scenexeNode",
    LABEL: "Arc",
    GUNS: [
        ...weaponMirror([{
            POSITION: [21, 10, 1, 0, 0, 45, 0],
            PROPERTIES: {
                SHOOT_SETTINGS: combineStats([g.basic, g.twin, g.tripleShot, { recoil: 0.9 }]),
                TYPE: "bullet"
            }
        },
        {
            POSITION: [21, 10, 1, 0, 0, 90, 0],
            PROPERTIES: {
                SHOOT_SETTINGS: combineStats([g.basic, g.twin, g.tripleShot, { recoil: 0.9 }]),
                TYPE: "bullet"
            }
        }]),
        {
            POSITION: [21, 10, 1, 0, 0, 0, 0],
            PROPERTIES: {
                SHOOT_SETTINGS: combineStats([g.basic, g.twin, g.tripleShot, { recoil: 0.9 }]),
                TYPE: "bullet"
            }
        }
    ]
}
Class.scenexeQuad = {
    PARENT: "scenexeNode",
    LABEL: "Quad",
    GUNS: weaponArray({
        POSITION: { LENGTH: 21, WIDTH: 10, ASPECT: 1 },
        PROPERTIES: {
            SHOOT_SETTINGS: combineStats([g.basic, g.flankGuard]),
            TYPE: "bullet"
        }
    }, 4)
}
Class.scenexeWake = {
    PARENT: "scenexeNode",
    LABEL: "Wake",
    GUNS: [
        {
            POSITION: { LENGTH: 15, WIDTH: 7, ANGLE: 180 }
        },
        {
            POSITION: { LENGTH: 3, WIDTH: 7, ASPECT: 1.7, X: 15, ANGLE: 180 },
            PROPERTIES: {
                SHOOT_SETTINGS: combineStats([g.trap]),
                TYPE: "scenexeTrap",
                STAT_CALCULATOR: "trap"
            }
        },
        {
            POSITION: { LENGTH: 21, WIDTH: 10 },
            PROPERTIES: {
                SHOOT_SETTINGS: combineStats([g.basic, g.flankGuard, g.triAngle, g.triAngleFront, { recoil: 4 }]),
                TYPE: "bullet",
                LABEL: "Front"
            }
        },
        ...weaponMirror({
            POSITION: { LENGTH: 16, WIDTH: 8, ANGLE: 150, DELAY: 0.1, Y: -2 },
            PROPERTIES: {
                SHOOT_SETTINGS: combineStats([g.basic, g.flankGuard, g.triAngle, g.thruster]),
                TYPE: "bullet",
                LABEL: "thruster"
            }
        })
    ]
}
Class.scenexeConglomerate = {
    PARENT: "scenexeNode",
    LABEL: "Conglomerate",
    GUNS: [
        {
            POSITION: { LENGTH: 15, WIDTH: 7, ANGLE: 180 }
        },
        {
            POSITION: { LENGTH: 3, WIDTH: 7, ASPECT: 1.7, X: 15, ANGLE: 180 },
            PROPERTIES: {
                SHOOT_SETTINGS: combineStats([g.trap]),
                TYPE: "scenexeTrap",
                STAT_CALCULATOR: "trap"
            }
        },
        {
            POSITION: {
                LENGTH: 21,
                WIDTH: 10
            },
            PROPERTIES: {
                SHOOT_SETTINGS: combineStats([g.basic, g.flankGuard, g.triAngle, g.triAngleFront, { recoil: 4 }]),
                TYPE: "bullet",
                LABEL: "Front"
            }
        },
        ...weaponMirror({
            POSITION: [9, 7, 1.3, 7, -2, 130, 0],
            PROPERTIES: {
                SHOOT_SETTINGS: combineStats([g.drone]),
                TYPE: "drone",
                AUTOFIRE: true,
                SYNCS_SKILLS: true,
                STAT_CALCULATOR: "drone",
                MAX_CHILDREN: 3,
                WAIT_TO_CYCLE: true
            }
        })
    ]
}
Class.scenexeSpread = {
    PARENT: "scenexeNode",
    LABEL: "Spread",
    GUNS: [
        ...weaponMirror([
            {
                POSITION: { LENGTH: 18, WIDTH: 5, ANGLE: 45, Y: 2, X: -2, DELAY: 3/4 },
                PROPERTIES: {
                    SHOOT_SETTINGS: combineStats([g.basic, { damage: 0.75, pen: 1.15, recoil: 0.1 }, g.spreadshot]),
                    TYPE: "bullet"
                }
            },
            {
                POSITION: { LENGTH: 18, WIDTH: 5, ANGLE: 30, Y: 2, X: -1, DELAY: 2/4 },
                PROPERTIES: {
                    SHOOT_SETTINGS: combineStats([g.basic, { damage: 0.75, pen: 1.15, recoil: 0.1 }, g.spreadshot]),
                    TYPE: "bullet"
                }
            },
            {
                POSITION: { LENGTH: 18, WIDTH: 5, ANGLE: 15, Y: 2, DELAY: 1/4 },
                PROPERTIES: {
                    SHOOT_SETTINGS: combineStats([g.basic, { damage: 0.75, pen: 1.15, recoil: 0.1 }, g.spreadshot]),
                    TYPE: "bullet"
                }
            }
        ]),
        {
            POSITION: { LENGTH: 21,  WIDTH: 10,  ASPECT: 1 },
            PROPERTIES: {
                SHOOT_SETTINGS: combineStats([g.basic, { recoil: 0.9 }, g.spreadshotMain]),
                TYPE: "bullet"
            }
        }
    ]
}
Class.scenexeDestroyer = {
    PARENT: "scenexeNode",
    LABEL: "Destroyer",
    GUNS: [
        {
            POSITION: [21, 14, 1, 0, 0, 0, 0],
            PROPERTIES: {
                SHOOT_SETTINGS: combineStats([g.basic, g.pounder, g.destroyer]),
                TYPE: "bullet"
            }
        }
    ]
}
Class.scenexeCompound = {
    PARENT: "scenexeNode",
    LABEL: "Compound",
    GUNS: [
        {
            POSITION: { LENGTH: 21.5, WIDTH: 12.5 },
            PROPERTIES: {
                SHOOT_SETTINGS: combineStats([g.basic, g.pounder]),
                TYPE: "bullet"
            }
        },
        {
            POSITION: [9, 7, 1.3, 7, 0, 180, 0],
            PROPERTIES: {
                SHOOT_SETTINGS: combineStats([g.drone]),
                TYPE: "drone",
                AUTOFIRE: true,
                SYNCS_SKILLS: true,
                STAT_CALCULATOR: "drone",
                MAX_CHILDREN: 4,
                WAIT_TO_CYCLE: true
            }
        }
    ]
}
Class.scenexeAssassin = {
    PARENT: "genericTank",
    DANGER: 6,
    LABEL: "Assassin",
    BODY: {
        FOV: 1.4
    },
    GUNS: [
        {
            POSITION: [27, 10.5, 1, 0, 0, 0, 0],
            PROPERTIES: {
                SHOOT_SETTINGS: combineStats([g.basic, g.sniper, g.assassin]),
                TYPE: "bullet"
            }
        }
    ]
}
Class.scenexeFactory = {
    PARENT: "scenexeNode",
    LABEL: "Factory",
    STAT_NAMES: statnames.drone,
    GUNS: [
        {
            POSITION: [7.5, 7, 1, 13.5, 0, 0, 0]
        },
        {
            POSITION: [3, 9, 1, 20, 0, 0, 0],
            PROPERTIES: {
                MAX_CHILDREN: 4,
                SHOOT_SETTINGS: combineStats([g.minion, { size: 1.2 }]),
                TYPE: "scenexeMinion",
                STAT_CALCULATOR: "drone",
                AUTOFIRE: true,
                SYNCS_SKILLS: true
            }
        },
        {
            POSITION: [14.5, 9, 1, 0, 0, 0, 0]
        }
    ]
}
Class.scenexeManager = {
    PARENT: "scenexeNode",
    LABEL: "Manager",
    GUNS: [{
        POSITION: { LENGTH: 22.5, WIDTH: 12, ASPECT: 1.5, X: -4 },
        PROPERTIES: {
            SHOOT_SETTINGS: combineStats([g.drone, { damage: 3, reload: 2.45, pen: 5, size: 1.2, health: 1.5 }]),
            TYPE: "drone",
            AUTOFIRE: true,
            SYNCS_SKILLS: true,
            STAT_CALCULATOR: "drone",
            MAX_CHILDREN: 3,
            WAIT_TO_CYCLE: true
        }
    }]
}

//TRAPPER
Class.scenexeTrapper = {
    PARENT: "scenexeNode",
    LABEL: "Trapper",
    STAT_NAMES: statnames.trap,
    GUNS: [
        {
            POSITION: { LENGTH: 15, WIDTH: 7 }
        },
        {
            POSITION: { LENGTH: 3, WIDTH: 7, ASPECT: 1.7, X: 15 },
            PROPERTIES: {
                SHOOT_SETTINGS: combineStats([g.trap]),
                TYPE: "scenexeTrap",
                STAT_CALCULATOR: "trap"
            }
        }
    ]
}

//Tier 1
Class.scenexeGamma = {
    PARENT: "scenexeNode",
    LABEL: "Gamma",
    GUNS: [{
        POSITION: { LENGTH: 15, WIDTH: 9 }
    },
    {
        POSITION: { LENGTH: 5, WIDTH: 9, ASPECT: 1.7, X: 15 },
        PROPERTIES: {
            SHOOT_SETTINGS: combineStats([g.trap, g.gamma]),
            TYPE: "scenexeTrap"
        }
    }]
}
Class.scenexeGuard = {
    PARENT: "scenexeNode",
    LABEL: "Guard",
    STAT_NAMES: statnames.mixed,
    GUNS: [
        {
            POSITION: { LENGTH: 15, WIDTH: 7, ANGLE: 180 }
        },
        {
            POSITION: { LENGTH: 3, WIDTH: 7, ASPECT: 1.7, X: 15, ANGLE: 180 },
            PROPERTIES: {
                SHOOT_SETTINGS: combineStats([g.trap, g.flankGuard]),
                TYPE: "scenexeTrap",
                STAT_CALCULATOR: "trap"
            }
        },
        {
            POSITION: { LENGTH: 21,  WIDTH: 10,  ASPECT: 1 },
            PROPERTIES: {
                SHOOT_SETTINGS: combineStats([g.basic, g.flankGuard]),
                TYPE: "bullet"
            }
        }
    ]
}
Class.scenexeBlockade = {
    PARENT: "scenexeNode",
    LABEL: "Blockade",
    STAT_NAMES: statnames.trap,
    GUNS: [
        {
            POSITION: { LENGTH: 15, WIDTH: 7, ANGLE: 180 }
        },
        {
            POSITION: { LENGTH: 3, WIDTH: 7, ASPECT: 1.7, X: 15, ANGLE: 180 },
            PROPERTIES: {
                SHOOT_SETTINGS: combineStats([g.trap, g.flankGuard]),
                TYPE: "scenexeTrap",
                STAT_CALCULATOR: "trap"
            }
        },
        {
            POSITION: { LENGTH: 15, WIDTH: 7 }
        },
        {
            POSITION: { LENGTH: 3, WIDTH: 7, ASPECT: 1.7, X: 15 },
            PROPERTIES: {
                SHOOT_SETTINGS: combineStats([g.trap, g.flankGuard]),
                TYPE: "scenexeTrap",
                STAT_CALCULATOR: "trap"
            }
        }
    ]
}
Class.scenexeRubble = {
    PARENT: "scenexeNode",
    LABEL: "Rubble",
    STAT_NAMES: statnames.trap,
    GUNS: weaponArray([
        {
            POSITION: { LENGTH: 13.5, WIDTH: 7, ANGLE: 180 }
        },
        {
            POSITION: { LENGTH: 3, WIDTH: 7, ASPECT: 1.7, X: 13.5, ANGLE: 180 },
            PROPERTIES: {
                SHOOT_SETTINGS: combineStats([g.trap, g.flankGuard, g.rubble]),
                TYPE: "scenexeTrap",
                STAT_CALCULATOR: "trap"
            }
        }
    ], 4)
}
Class.scenexeScrap = {
    PARENT: "scenexeNode",
    LABEL: "Scrap",
    STAT_NAMES: statnames.trap,
    GUNS: weaponArray([
        {
            POSITION: { LENGTH: 13.5, WIDTH: 7, ANGLE: 180 }
        },
        {
            POSITION: { LENGTH: 3, WIDTH: 7, ASPECT: 1.7, X: 13.5, ANGLE: 180 },
            PROPERTIES: {
                SHOOT_SETTINGS: combineStats([g.trap, g.flankGuard, g.rubble]),
                TYPE: "scenexeTrap",
                STAT_CALCULATOR: "trap"
            }
        }
    ], 6)
}
Class.scenexeEngineer = {
    PARENT: "scenexeNode",
    LABEL: "Engineer",
    GUNS: [
        {
            POSITION: { LENGTH: 3, WIDTH: 16, X: 17 },
            PROPERTIES: {
                MAX_CHILDREN: 8,
                SHOOT_SETTINGS: combineStats([g.trap, { size: 0.8 }]),
                TYPE: "scenexePillbox",
                NO_LIMITATIONS: true,
                SYNCS_SKILLS: true,
                DESTROY_OLDEST_CHILD: true,
                STAT_CALCULATOR: "block"
            }
        },
        {
            POSITION: { LENGTH: 13, WIDTH: 9 }
        },
        {
            POSITION: { LENGTH: 3, WIDTH: 9, ASPECT: 1.7, X: 13 }
        }
    ]
}

//Tier 2
Class.scenexeBeta = {
    PARENT: "scenexeNode",
    LABEL: "Beta",
    GUNS: [
        {
            POSITION: { LENGTH: 15, WIDTH: 11 }
        },
        {
            POSITION: { LENGTH: 5, WIDTH: 11, ASPECT: 1.7, X: 15 },
            PROPERTIES: {
                SHOOT_SETTINGS: combineStats([g.trap, g.gamma, { speed: 0.91, pen: 0.81, health: 2.45 }]),
                TYPE: "scenexeTrap"
            }
        }
    ]
}
Class.scenexeStockade = {
    PARENT: "scenexeNode",
    LABEL: "Stockade",
    STAT_NAMES: statnames.trap,
    GUNS: weaponArray([
        {
            POSITION: { LENGTH: 15, WIDTH: 7 }
        },
        {
            POSITION: { LENGTH: 3, WIDTH: 7, ASPECT: 1.7, X: 15 },
            PROPERTIES: {
                SHOOT_SETTINGS: combineStats([g.trap, g.flankGuard]),
                TYPE: "scenexeTrap",
                STAT_CALCULATOR: "trap"
            }
        }
    ], 3)
}
Class.scenexeBarricade = {
    PARENT: "scenexeNode",
    LABEL: "Barricade",
    STAT_NAMES: statnames.trap,
    GUNS: [
        {
            POSITION: { LENGTH: 3, WIDTH: 7, ASPECT: 1.7, X: 18, DELAY: 0.5 },
            PROPERTIES: {
                SHOOT_SETTINGS: combineStats([g.trap, g.barricade]),
                TYPE: "scenexeTrap",
                STAT_CALCULATOR: "trap"
            }
        },
        {
            POSITION: { LENGTH: 14, WIDTH: 7 }
        },
        {
            POSITION: { LENGTH: 3, WIDTH: 7, ASPECT: 1.7, X: 14 },
            PROPERTIES: {
                SHOOT_SETTINGS: combineStats([g.trap, g.barricade]),
                TYPE: "scenexeTrap",
                STAT_CALCULATOR: "trap"
            }
        }
    ]
}

//COMMANDER
//Tier 0
Class.scenexeCommander = {
    PARENT: "scenexeNode",
    LABEL: "Commander",
    STAT_NAMES: statnames.drone,
    GUNS: [
        {
            POSITION: [9, 7, 1.3, 7, 0, 0, 0],
            PROPERTIES: {
                SHOOT_SETTINGS: combineStats([g.drone]),
                TYPE: "drone",
                AUTOFIRE: true,
                SYNCS_SKILLS: true,
                STAT_CALCULATOR: "drone",
                MAX_CHILDREN: 3,
                WAIT_TO_CYCLE: true
            }
        }
    ]
}

//Tier 1
Class.scenexeAlloy = {
    PARENT: "scenexeNode",
    LABEL: "Alloy",
    STAT_NAMES: statnames.mixed,
    GUNS: [
        {
            POSITION: { LENGTH: 21,  WIDTH: 10,  ASPECT: 1 },
            PROPERTIES: {
                SHOOT_SETTINGS: combineStats([g.basic, g.flankGuard]),
                TYPE: "bullet"
            }
        },
        {
            POSITION: [9, 7, 1.3, 7, 0, 180, 0],
            PROPERTIES: {
                SHOOT_SETTINGS: combineStats([g.drone, g.flankGuard]),
                TYPE: "drone",
                AUTOFIRE: true,
                SYNCS_SKILLS: true,
                STAT_CALCULATOR: "drone",
                MAX_CHILDREN: 4,
                WAIT_TO_CYCLE: true
            }
        }
    ]
}
Class.scenexeOverseer = {
    PARENT: "scenexeNode",
    LABEL: "Overseer",
    STAT_NAMES: statnames.drone,
    GUNS: [
        {
            POSITION: [9, 7, 1.3, 7, 0, 0, 0],
            PROPERTIES: {
                SHOOT_SETTINGS: combineStats([g.drone]),
                TYPE: "drone",
                AUTOFIRE: true,
                SYNCS_SKILLS: true,
                STAT_CALCULATOR: "drone",
                MAX_CHILDREN: 4,
                WAIT_TO_CYCLE: true
            }
        },
        {
            POSITION: [9, 7, 1.3, 7, 0, 180, 0],
            PROPERTIES: {
                SHOOT_SETTINGS: combineStats([g.drone]),
                TYPE: "drone",
                AUTOFIRE: true,
                SYNCS_SKILLS: true,
                STAT_CALCULATOR: "drone",
                MAX_CHILDREN: 4,
                WAIT_TO_CYCLE: true
            }
        }
    ]
}
Class.scenexeDirector = {
    PARENT: "scenexeNode",
    LABEL: "Director",
    GUNS: [{
        POSITION: { LENGTH: 22.5, WIDTH: 10, ASPECT: 1.5, X: -4 },
        PROPERTIES: {
            SHOOT_SETTINGS: combineStats([g.drone, {damage: 2, reload: 1.15, pen: 2, size: 1.2}]),
            TYPE: "drone",
            AUTOFIRE: true,
            SYNCS_SKILLS: true,
            STAT_CALCULATOR: "drone",
            MAX_CHILDREN: 3,
            WAIT_TO_CYCLE: true
        }
    }]
}
Class.scenexeFusion = {
    PARENT: "scenexeNode",
    LABEL: "Fusion",
    STAT_NAMES: statnames.mixed,
    GUNS: [
        {
            POSITION: [9, 7, 1.3, 7, 0, 180, 0],
            PROPERTIES: {
                SHOOT_SETTINGS: combineStats([g.drone]),
                TYPE: "drone",
                AUTOFIRE: true,
                SYNCS_SKILLS: true,
                STAT_CALCULATOR: "drone",
                MAX_CHILDREN: 4,
                WAIT_TO_CYCLE: true
            }
        },
        {
            POSITION: { LENGTH: 15, WIDTH: 7 }
        },
        {
            POSITION: { LENGTH: 3, WIDTH: 7, ASPECT: 1.7, X: 15 },
            PROPERTIES: {
                SHOOT_SETTINGS: combineStats([g.trap]),
                TYPE: "scenexeTrap",
                STAT_CALCULATOR: "trap"
            }
        }
    ]
}

//Tier 2

Class.scenexeOverlord = {
    PARENT: "scenexeNode",
    LABEL: "Overlord",
    STAT_NAMES: statnames.drone,
    MAX_CHILDREN: 8,
    GUNS: weaponArray({
        POSITION: [9, 7, 1.3, 7, 0, 0, 0],
        PROPERTIES: {
            SHOOT_SETTINGS: combineStats([g.drone]),
            TYPE: "drone",
            AUTOFIRE: true,
            SYNCS_SKILLS: true,
            STAT_CALCULATOR: "drone",
            WAIT_TO_CYCLE: true
        }
    }, 3)
}

//BASE

///WALL
//Tier 0
Class.scenexeWall = {
    PARENT: "scenexeBase",
    LABEL: "Wall",
    SHAPE: 6,
    BODY: {
        HEALTH: 1.75 * baseScenexe.HEALTH,
        SPEED: 0.95 * base.SPEED
    }
}

//Tier 1
Class.scenexeStronghold = {
    PARENT: "scenexeBase",
    LABEL: "Stronghold",
    SHAPE: 6,
    BODY: {
        HEALTH: 2.45 * baseScenexe.HEALTH,
        SPEED: 0.92 * base.SPEED
    },
    TURRETS: [
        {
            POSITION: [9, 0, 0, 0, 360, 1],
            TYPE: ["hexagon", {COLOR: "mirror"}]
        }
    ]
}
Class.scenexeCitadel = {
    PARENT: "scenexeBase",
    LABEL: "Citadel",
    SHAPE: 6,
    BODY: {
        HEALTH: 1.75 * baseScenexe.HEALTH,
        SPEED: 0.95 * base.SPEED
    },
    TURRETS: [
        {
            POSITION: { SIZE: 10, ANGLE: 160, ARC: 360, LAYER: 1 },
            TYPE: ["scenexeSentryTurret", { CONTROLLERS: ["nearestDifferentMaster"], INDEPENDENT: true, COLOR: 16 }]
        }
    ]
}

//Tier 2
Class.scenexePalace = {
    PARENT: "scenexeBase",
    LABEL: "Palace",
    SHAPE: 8.5,
    BODY: {
        HEALTH: 3.75 * baseScenexe.HEALTH,
        SPEED: 0.9 * base.SPEED
    },
    TURRETS: [
        {
            POSITION: [11.5, 0, 0, 0, 360, 1],
            TYPE: ["hexagon", {COLOR: "mirror"}]
        }
    ]
}

//SMASHER
//Tier 0
Class.scenexeSmasherBody = {
    LABEL: "",
    COLOR: "black",
    SHAPE: 6,
    SIZE: 12,
    INDEPENDENT: true
}
Class.scenexeSmasher = {
    PARENT: "scenexeBase",
    LABEL: "Smasher",
    BODY: {
        SPEED: 1.1 * base.SPEED,
        DAMAGE: 1.5 * base.DAMAGE
    },
    TURRETS: [
        {
            POSITION: [25, 0, 0, 0, 360, 0],
            TYPE: "scenexeSmasherBody"
        }
    ]
}

//Tier 1
Class.scenexeSpikeBody = {
    LABEL: "",
    COLOR: "black",
    SHAPE: 4,
    SIZE: 12,
    INDEPENDENT: true
}
Class.scenexeSpike = {
    PARENT: "scenexeBase",
    LABEL: "Spike",
    BODY: {
        SPEED: 1.2 * base.SPEED,
        DAMAGE: 2.5 * base.DAMAGE,
        HEALTH: 0.95 * baseScenexe.HEALTH
    },
    TURRETS: [
        {
            POSITION: [25, 0, 0, 0, 360, 0],
            TYPE: "scenexeSpikeBody"
        }
    ]
}
Class.scenexeFortress = {
    PARENT: "scenexeBase",
    LABEL: "Fortress",
    SHAPE: 6,
    BODY: {
        SPEED: 1.05 * base.SPEED,
        DAMAGE: 1.35 * base.DAMAGE,
        HEALTH: 1.5  * baseScenexe.HEALTH
    },
    TURRETS: [
        {
            POSITION: [25, 0, 0, 0, 360, 0],
            TYPE: "scenexeSmasherBody"
        }
    ]
}
Class.scenexeArmory = {
    PARENT: "scenexeBase",
    LABEL: "Armory",
    BODY: {
        SPEED: 1.1 * base.SPEED,
        DAMAGE: 1.5 * base.DAMAGE
    },
    TURRETS: [
        {
            POSITION: [25, 0, 0, 0, 360, 0],
            TYPE: "scenexeSmasherBody"
        },
        {
            POSITION: { SIZE: 10, ANGLE: 160, ARC: 360, LAYER: 1 },
            TYPE: ["scenexeSentryTurret", { CONTROLLERS: ["nearestDifferentMaster"], INDEPENDENT: true, COLOR: 16 }]
        }
    ]
}

//Tier 2
Class.scenexeForge = {
    PARENT: "scenexeBase",
    LABEL: "Forge",
    BODY: {
        SPEED: 1.175 * base.SPEED,
        DAMAGE: 2.35 * base.DAMAGE,
        HEALTH: 0.95 * baseScenexe.HEALTH
    },
    TURRETS: [
        {
            POSITION: [25, 0, 0, 0, 360, 0],
            TYPE: "scenexeSpikeBody"
        },
        {
            POSITION: [14, 0, 0, 0, 0, 1],
            TYPE: "bonfireGen"
        }
    ]
}
Class.scenexeBrigade = {
    PARENT: "scenexeBase",
    LABEL: "Brigade",
    BODY: {
        SPEED: 1.2 * base.SPEED,
        DAMAGE: 2.2 * base.DAMAGE,
        HEALTH: 0.9 * baseScenexe.HEALTH
    },
    TURRETS: [
        {
            POSITION: [25, 0, 0, 0, 360, 0],
            TYPE: "scenexeSmasherBody"
        },
        {
            POSITION: { SIZE: 10, ANGLE: 160, ARC: 360, LAYER: 1 },
            TYPE: ["scenexeTurretTurret", { CONTROLLERS: ["nearestDifferentMaster"], INDEPENDENT: true, COLOR: 16 }]
        }
    ]
}
Class.scenexeThornBody = {
    LABEL: "",
    COLOR: "black",
    SHAPE: 5,
    SIZE: 12,
    INDEPENDENT: true
}
Class.scenexeThorn = {
    PARENT: "scenexeBase",
    LABEL: "Thorn",
    BODY: {
        SPEED: 1.25 * base.SPEED,
        DAMAGE: 3.35 * base.DAMAGE,
        HEALTH: 0.775 * baseScenexe.HEALTH
    },
    TURRETS: [
        {
            POSITION: [25, 0, 0, 0, 360, 0],
            TYPE: "scenexeThornBody"
        }
    ]
}
Class.scenexeCastle = {
    PARENT: "scenexeBase",
    LABEL: "Castle",
    BODY: {
        SPEED: 0.9 * base.SPEED,
        DAMAGE: 1.75 * base.DAMAGE,
        HEALTH: 1.55 * baseScenexe.HEALTH
    },
    TURRETS: [
        {
            POSITION: [25, 0, 0, 0, 360, 0],
            TYPE: "scenexeSmasherBody"
        },
        {
            POSITION: { SIZE: 10, ANGLE: 160, ARC: 360, LAYER: 2 },
            TYPE: ["scenexeSentryTurret", { CONTROLLERS: ["nearestDifferentMaster"], INDEPENDENT: true, COLOR: 16 }]
        },
        {
            POSITION: [14.5, 0, 0, 0, 360, 1],
            TYPE: ["hexagon", { COLOR: "mirror" }]
        }
    ]
}

//SENTRY
//Tier 0
Class.scenexeSentry = {
    PARENT: "scenexeBase",
    LABEL: "Sentry",
    TURRETS: [
        {
            POSITION: { SIZE: 10, ANGLE: 160, ARC: 360, LAYER: 1 },
            TYPE: ["scenexeSentryTurret", { CONTROLLERS: ["nearestDifferentMaster"], INDEPENDENT: true, COLOR: 16 }]
        }
    ]
}

//Tier 1
Class.scenexeTurret = {
    PARENT: "scenexeBase",
    LABEL: "Turret",
    TURRETS: [
        {
            POSITION: { SIZE: 10, ANGLE: 160, ARC: 360, LAYER: 1 },
            TYPE: ["scenexeTurretTurret", { CONTROLLERS: ["nearestDifferentMaster"], INDEPENDENT: true, COLOR: 16 }]
        }
    ]
}

//Tier 2
Class.scenexeArtillery = {
    PARENT: "scenexeBase",
    LABEL: "Artillery",
    TURRETS: [
        {
            POSITION: { SIZE: 10, ANGLE: 160, ARC: 360, LAYER: 1 },
            TYPE: ["scenexeArtilleryTurret", { CONTROLLERS: ["nearestDifferentMaster"], INDEPENDENT: true, COLOR: 16 }]
        }
    ]
}
Class.scenexeTriplet = {
    PARENT: "scenexeBase",
    LABEL: "Triplet",
    TURRETS: [
        {
            POSITION: { SIZE: 10, ANGLE: 160, ARC: 360, LAYER: 1 },
            TYPE: ["scenexeTripletTurret", { CONTROLLERS: ["nearestDifferentMaster"], INDEPENDENT: true, COLOR: 16 }]
        }
    ]
}

//HEARTH
//Tier 0
Class.hearthGen = makeHearth(1, 1.25);
Class.scenexeHearth = {
    PARENT: "scenexeBase",
    LABEL: "Hearth",
    TURRETS: [
        {
            POSITION: [14, 0, 0, 0, 0, 1],
            TYPE: "hearthGen"
        }
    ]
}

//Tier 1
Class.bonfireGen = makeHearth(1, 1.6);
Class.scenexeBonfire = {
    PARENT: "scenexeBase",
    LABEL: "Bonfire",
    TURRETS: [
        {
            POSITION: [14, 0, 0, 0, 0, 1],
            TYPE: "bonfireGen"
        }
    ]
}
Class.menderGen = makeHearth(-1, 1.6);
Class.scenexeMender = {
    PARENT: "scenexeBase",
    LABEL: "Mender",
    TURRETS: [
        {
            POSITION: [14, 0, 0, 0, 0, 1],
            TYPE: "menderGen"
        }
    ]
}

//Tier 2
Class.flareGen = makeHearth(1, 2);
Class.scenexeFlare = {
    PARENT: "scenexeBase",
    LABEL: "Flare",
    TURRETS: [
        {
            POSITION: [14, 0, 0, 0, 0, 1],
            TYPE: "flareGen"
        }
    ]
}
Class.remedyGen = makeHearth(-1, 2);
Class.scenexeRemedy = {
    PARENT: "scenexeBase",
    LABEL: "Remedy",
    TURRETS: [
        {
            POSITION: [14, 0, 0, 0, 0, 1],
            TYPE: "remedyGen"
        }
    ]
}

//HANGAR
Class.scenexeHangar = {
    PARENT: "scenexeBase",
    LABEL: "Hangar",
    TURRETS: [
        {
            POSITION: [8.5, 0, 0, 0, 0, 1],
            TYPE: "scenexeHangarTurret"
        }
    ]
}
Class.scenexeWarship = {
    PARENT: "scenexeBase",
    LABEL: "Warship",
    TURRETS: [
        {
            POSITION: [8.5, 0, -8, 0, 0, 1],
            TYPE: "scenexeHangarTurret"
        },
        {
            POSITION: [8.5, 0, 8, 0, 0, 1],
            TYPE: "scenexeHangarTurret"
        }
    ]
}
Class.scenexeBattleship = {
    PARENT: "scenexeBase",
    LABEL: "Battleship",
    TURRETS: [
        {
            POSITION: [8.5, 0, 8, -30, 0, 1],
            TYPE: "scenexeHangarTurret"
        },
        {
            POSITION: [8.5, 0, 8, 90, 0, 1],
            TYPE: "scenexeHangarTurret"
        },
        {
            POSITION: [8.5, 0, 8, -150, 0, 1],
            TYPE: "scenexeBattleshipTurret"
        }
    ]
}
Class.scenexeMothership = {
    PARENT: "scenexeBase",
    LABEL: "Mothership",
    TURRETS: weaponArray({
        POSITION: [8.5, 0, 8, 0, 0, 1],
        TYPE: "scenexeBattleshipTurret"
    }, 4)
}

Class.scenexeNode.UPGRADES_TIER_0 = ["scenexeMono", "scenexeTrapper", "scenexeCommander"]
Class.scenexeBase.UPGRADES_TIER_0 = ["scenexeWall", "scenexeSmasher", "scenexeSentry", "scenexeHearth", "scenexeHangar"]

//Gun upgrades

Class.scenexeMono.UPGRADES_TIER_1 = ["scenexeDuo", "scenexeFlank", "scenexeSplit", "scenexeSingle", "scenexeSniper", "scenexeAlloy", "scenexeGuard"]
Class.scenexeCommander.UPGRADES_TIER_1 = ["scenexeAlloy", "scenexeOverseer", "scenexeDirector", "scenexeFusion"]
Class.scenexeTrapper.UPGRADES_TIER_1 = ["scenexeGuard", "scenexeGamma", "scenexeBlockade", "scenexeRubble", "scenexeFusion"]

Class.scenexeDuo.UPGRADES_TIER_2 = ["scenexeTrio", "scenexeGunner", "scenexeArc", "scenexeQuad"]
Class.scenexeSplit.UPGRADES_TIER_2 = ["scenexeSpread", "scenexeTrio", "scenexeGunner", "scenexeArc", "scenexeQuad"]
Class.scenexeFlank.UPGRADES_TIER_2 = ["scenexeWake", "scenexeConglomerate", "scenexeOverlord", "scenexeQuad"]
Class.scenexeSingle.UPGRADES_TIER_2 = ["scenexeDestroyer", "scenexeCompound", "scenexeAssassin"]
Class.scenexeAlloy.UPGRADES_TIER_2 = ["scenexeCompound", "scenexeConglomerate"]
Class.scenexeGuard.UPGRADES_TIER_2 = ["scenexeConglomerate", "scenexeWake"]
Class.scenexeSniper.UPGRADES_TIER_2 = ["scenexeAssassin", "scenexeDestroyer", "scenexeWake"]
Class.scenexeOverseer.UPGRADES_TIER_2 = ["scenexeOverlord", "scenexeFactory"]
Class.scenexeDirector.UPGRADES_TIER_2 = ["scenexeManager", "scenexeCompound"]
Class.scenexeFusion.UPGRADES_TIER_2 = ["scenexeConglomerate"]
Class.scenexeGamma.UPGRADES_TIER_2 = ["scenexeBeta", "scenexeEngineer"]
Class.scenexeBlockade.UPGRADES_TIER_2 = ["scenexeBarricade", "scenexeStockade", "scenexeConglomerate"]
Class.scenexeRubble.UPGRADES_TIER_2 = ["scenexeScrap"]

Class.scenexeTrio.UPGRADES_TIER_3 = []
Class.scenexeGunner.UPGRADES_TIER_3 = []
Class.scenexeArc.UPGRADES_TIER_3 = []
Class.scenexeQuad.UPGRADES_TIER_3 = []
Class.scenexeSpread.UPGRADES_TIER_3 = []
Class.scenexeWake.UPGRADES_TIER_3 = []
Class.scenexeConglomerate.UPGRADES_TIER_3 = []
Class.scenexeOverlord.UPGRADES_TIER_3 = []
Class.scenexeDestroyer.UPGRADES_TIER_3 = []
Class.scenexeCompound.UPGRADES_TIER_3 = []
Class.scenexeAssassin.UPGRADES_TIER_3 = []
Class.scenexeFactory.UPGRADES_TIER_3 = []
Class.scenexeManager.UPGRADES_TIER_3 = []
Class.scenexeBeta.UPGRADES_TIER_3 = []
Class.scenexeEngineer.UPGRADES_TIER_3 = []
Class.scenexeBarricade.UPGRADES_TIER_3 = []
Class.scenexeStockade.UPGRADES_TIER_3 = []
Class.scenexeScrap.UPGRADES_TIER_3 = []

//Body upgrades

Class.scenexeHangar.UPGRADES_TIER_1 = ["scenexeWarship"]
Class.scenexeHearth.UPGRADES_TIER_1 = ["scenexeBonfire", "scenexeMender"]
Class.scenexeWall.UPGRADES_TIER_1 = ["scenexeStronghold", "scenexeFortress", "scenexeCitadel"]
Class.scenexeSmasher.UPGRADES_TIER_1 = ["scenexeSpike", "scenexeFortress", "scenexeArmory"]
Class.scenexeSentry.UPGRADES_TIER_1 = ["scenexeTurret", "scenexeArmory", "scenexeCitadel"]

Class.scenexeWarship.UPGRADES_TIER_2 = ["scenexeBattleship"]
Class.scenexeBonfire.UPGRADES_TIER_2 = ["scenexeFlare"]
Class.scenexeMender.UPGRADES_TIER_2 = ["scenexeRemedy"]
Class.scenexeStronghold.UPGRADES_TIER_2 = ["scenexePalace", "scenexeCastle"]
Class.scenexeFortress.UPGRADES_TIER_2 = ["scenexeCastle", "scenexePalace"]
Class.scenexeCitadel.UPGRADES_TIER_2 = ["scenexeCastle"]
Class.scenexeTurret.UPGRADES_TIER_2 = ["scenexeArtillery", "scenexeTriplet", "scenexeCastle", "scenexeBrigade"]
Class.scenexeSpike.UPGRADES_TIER_2 = ["scenexeThorn", "scenexeForge", "scenexeCastle"]
Class.scenexeArmory.UPGRADES_TIER_2 = ["scenexeCastle", "scenexeBrigade"]

Class.scenexeBattleship.UPGRADES_TIER_3 = ["scenexeMothership"]
Class.scenexeFlare.UPGRADES_TIER_3 = []
Class.scenexeRemedy.UPGRADES_TIER_3 = []
Class.scenexePalace.UPGRADES_TIER_3 = []
Class.scenexeCastle.UPGRADES_TIER_3 = []
Class.scenexeArtillery.UPGRADES_TIER_3 = []
Class.scenexeTriplet.UPGRADES_TIER_3 = []
Class.scenexeBrigade.UPGRADES_TIER_3 = []
Class.scenexeThorn.UPGRADES_TIER_3 = []
Class.scenexeForge.UPGRADES_TIER_3 = []

Class.menu_addons.UPGRADES_TIER_0.push(["scenexeBase", "scenexeNode"])