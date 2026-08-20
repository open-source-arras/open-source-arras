module.exports = {
    // Base Values
    blank: {
        reload: 1,
        recoil: 1,
        shudder: 1,
        size: 1,
        health: 1,
        damage: 1,
        pen: 1,
        speed: 1,
        maxSpeed: 1,
        range: 1,
        density: 1,
        spray: 1,
        resist: 1
    },
    basic: {
        reload: 10.5,
        recoil: 1.4,
        shudder: 0.1,
        damage: 0.75,
        speed: 4,
        spray: 15
    },
    drone: {
        reload: 36,
        recoil: 0.25,
        shudder: 0.1,
        size: 0.6,
        speed: 1.5,
        spray: 0.1
    },
    swarm: {
        reload: 23,
        recoil: 0.25,
        shudder: 0.05,
        size: 0.4,
        damage: 0.75,
        speed: 4,
        spray: 5
    },
    minion: {
        reload: 48,
        shudder: 0.1,
        size: 0.7,
        damage: 0.75,
        speed: 3,
        spray: 0.1
    },
    trap: {
        reload: 23,
        shudder: 0.25,
        size: 0.7,
        damage: 0.75,
        speed: 3.25,
        resist: 3,
        spray: 0
    },

    // Spammers
    single: {
        reload: 1.05,
        speed: 1.05
    },
    desmos: {
        reload: 1.1,
        range: 1.2,
        shudder: 0,
        spray: 0,
        damage: 0.75,
        speed: 0.5
    },
    twin: {
        recoil: 0.5,
        shudder: 0.9,
        health: 0.9,
        damage: 0.7,
        spray: 1.2
    },
    doubleTwin: {
        damage: 1.1
    },
    tripleTwin: {
        health: 1.1
    },
    hewnDouble: {
        reload: 1.25,
        recoil: 1.5,
        health: 0.9,
        damage: 0.85,
        maxSpeed: 0.9
    },
    tripleShot: {
        reload: 1.1,
        shudder: 0.8,
        health: 0.9,
        pen: 0.8,
        density: 0.8,
        spray: 0.5
    },
    spreadshotMain: {
        reload: 0.781,
        recoil: 0.25,
        shudder: 0.5,
        health: 0.5,
        speed: 1.923,
        maxSpeed: 2.436
    },
    spreadshot: {
        reload: 1.5,
        shudder: 0.25,
        speed: 0.7,
        maxSpeed: 0.7,
        spray: 0.25
    },
    triplet: {
        reload: 1.2,
        recoil: 2/3,
        shudder: 0.9,
        health: 0.85,
        damage: 0.85,
        pen: 0.9,
        density: 1.1,
        spray: 0.9,
        resist: 0.95
    },
    quintuplet: {
        reload: 1.5,
        recoil: 2/3,
        shudder: 0.9,
        pen: 0.9,
        density: 1.1,
        spray: 0.9,
        resist: 0.95
    },
    turret: {
        reload: 2,
        health: 0.8,
        damage: 0.6,
        pen: 0.7,
        density: 0.1
    },
    autoTurret: {
        reload: 0.9,
        recoil: 0.75,
        shudder: 0.5,
        size: 0.8,
        health: 0.9,
        damage: 0.6,
        pen: 1.2,
        speed: 1.1,
        range: 0.8,
        density: 1.3,
        resist: 1.25
    },

    // Snipers
    sniper: {
        reload: 1.35,
        shudder: 0.25,
        damage: 0.8,
        pen: 1.1,
        speed: 1.5,
        maxSpeed: 1.5,
        density: 1.5,
        spray: 0.2,
        resist: 1.15
    },
    crossbow: {
        reload: 2,
        health: 0.6,
        damage: 0.6,
        pen: 0.8
    },
    assassin: {
        reload: 1.65,
        shudder: 0.25,
        health: 1.15,
        pen: 1.1,
        speed: 1.18,
        maxSpeed: 1.18,
        density: 3,
        resist: 1.3
    },
    hunter: {
        reload: 1.5,
        recoil: 0.7,
        size: 0.95,
        damage: 0.9,
        speed: 1.1,
        maxSpeed: 0.8,
        density: 1.2,
        resist: 1.15
    },
    hunterSecondary: {
        size: 0.9,
        health: 2,
        damage: 0.5,
        pen: 1.5,
        density: 1.2,
        resist: 1.1
    },
    predator: {
        reload: 1.4,
        size: 0.8,
        health: 1.5,
        damage: 0.9,
        pen: 1.2,
        speed: 0.9,
        maxSpeed: 0.9
    },
    dual: {
        reload: 2,
        shudder: 0.8,
        health: 1.5,
        speed: 1.3,
        maxSpeed: 1.1,
        resist: 1.25
    },
    rifle: {
        reload: 0.8,
        recoil: 0.8,
        shudder: 1.5,
        health: 0.8,
        damage: 0.8,
        pen: 0.9,
        spray: 2
    },
    blunderbuss: {
        recoil: 0.1,
        shudder: 0.5,
        health: 0.4,
        damage: 0.2,
        pen: 0.4,
        spray: 0.5
    },
    railgun: {
        reload: 4.2,
        damage: 0.81,
        health: 3.06,
        resist: 2.3,
        density: 0.7,
        speed: 1.375,
        maxSpeed: 1.375
    },
    marksman: {
        pen: 2,
        damage: 0.12,
        health: 25/3,
        reload: 1.75

    },

    // Machine guns
    machineGun: {
        reload: 0.5,
        recoil: 0.8,
        shudder: 1.7,
        health: 0.7,
        damage: 0.7,
        maxSpeed: 0.8,
        spray: 2.5
    },
    minigun: {
        reload: 1.25,
        recoil: 0.6,
        size: 0.8,
        health: 0.55,
        damage: 0.45,
        pen: 1.25,
        speed: 1.33,
        density: 1.25,
        spray: 0.5,
        resist: 1.1
    },
    streamliner: {
        reload: 1.1,
        recoil: 0.6,
        damage: 0.65,
        speed: 1.24
    },
    nailgun: {
        reload: 0.85,
        recoil: 2.5,
        size: 0.8,
        damage: 0.7,
        density: 2
    },
    pelleter: {
        reload: 1.25,
        recoil: 0.25,
        shudder: 1.5,
        size: 1.1,
        damage: 0.35,
        pen: 1.35,
        speed: 0.9,
        maxSpeed: 0.8,
        density: 1.5,
        spray: 1.5,
        resist: 1.2
    },
    gunner: {
        recoil: 0.25,
        shudder: 1.5,
        size: 1.2,
        health: 1.35,
        damage: 0.25,
        pen: 1.25,
        speed: 0.8,
        maxSpeed: 0.65,
        density: 1.5,
        spray: 1.5,
        resist: 1.2
    },
    machineGunner: {
        reload: 2/3,
        recoil: 0.8,
        shudder: 2,
        damage: 0.75,
        speed: 1.2,
        maxSpeed: 0.8,
        spray: 2.5
    },
    blaster: {
        recoil: 1.2,
        shudder: 1.25,
        size: 1.1,
        health: 1.5,
        pen: 0.6,
        speed: 0.8,
        maxSpeed: 0.33,
        range: 0.6,
        density: 0.5,
        spray: 1.5,
        resist: 0.8
    },
    flamethrower: {
        reload: 1.75,
        recoil: 4/3,
        shudder: 2,
        size: 0.25,
        health: 10,
        damage: 0.2,
        pen: 4,
        speed: 2,
        maxSpeed: 0,
        range: 3,
        density: 0.25
    },
    gatlingGun: {
        reload: 1.25,
        recoil: 4/3,
        shudder: 0.8,
        health: 0.8,
        pen: 1.1,
        speed: 1.25,
        maxSpeed: 1.25,
        range: 1.1,
        density: 1.25,
        spray: 0.5,
        resist: 1.1
    },
    atomizer: {
        reload: 0.3,
        recoil: 0.8,
        size: 0.5,
        damage: 0.75,
        speed: 1.2,
        maxSpeed: 0.8,
        spray: 2.25
    },
    spam: {
        reload: 1.1,
        size: 1.05,
        damage: 1.1,
        speed: 0.9,
        maxSpeed: 0.7,
        resist: 1.05
    },
    gunnerDominator: {
        reload: 1.1,
        recoil: 0,
        shudder: 1.1,
        size: 0.5,
        health: 0.5,
        damage: 0.5,
        speed: 1.1,
        density: 0.9,
        spray: 1.2,
        resist: 0.8
    },

    // Flanks
    flankGuard: {
        recoil: 1.2,
        health: 1.02,
        damage: 0.81,
        pen: 0.9,
        maxSpeed: 0.85,
        density: 1.2
    },
    cyclone: {
        health: 1.3,
        damage: 1.3,
        pen: 1.1,
        speed: 1.5,
        maxSpeed: 1.15
    },
    triAngle: {
        recoil: 0.9,
        health: 0.9,
        speed: 0.8,
        maxSpeed: 0.8,
        range: 0.6
    },
    triAngleFront: {
        recoil: 0.2,
        speed: 1.3,
        maxSpeed: 1.1,
        range: 1.5
    },
    thruster: {
        recoil: 1.5,
        shudder: 2,
        health: 0.5,
        damage: 0.5,
        pen: 0.7,
        spray: 0.5,
        resist: 0.7
    },

    // Drones
    overseer: {
        reload: 1.25,
        size: 0.85,
        health: 0.7,
        damage: 0.8,
        maxSpeed: 0.9,
        density: 2
    },
    overdrive: {
        reload: 2.5,
        health: 0.8,
        damage: 0.8,
        pen: 0.8,
        speed: 0.9,
        maxSpeed: 0.9,
        range: 0.9,
        spray: 1.2
    },
    commander: {
        reload: 1.5,
        health: 0.4,
        damage: 0.7
    },
    baseProtector: {
        reload: 0.7,
        size: 1.5,
        recoil: 0.000001,
        health: 100,
        speed: 2.3,
        maxSpeed: 1.1,
        range: 0.5,
        density: 5,
        resist: 10
    },
    battleship: {
        health: 1.25,
        damage: 1.15,
        maxSpeed: 0.85,
        resist: 1.1
    },
    carrier: {
        reload: 1.5,
        damage: 0.8,
        speed: 1.3,
        maxSpeed: 1.2,
        range: 1.2
    },
    bee: {
        reload: 1.3,
        size: 1.4,
        damage: 1.5,
        pen: 0.5,
        speed: 1.5,
        maxSpeed: 1.5,
        density: 0.25
    },
    sunchip: {
        reload: 4,
        size: 1.4,
        health: 0.5,
        damage: 0.4,
        pen: 0.6,
        density: 0.8
    },
    maleficitor: {
        reload: 0.25,
        size: 1.05,
        health: 1.15,
        damage: 1.15,
        pen: 1.15,
        speed: 0.8,
        maxSpeed: 0.8,
        density: 1.15
    },
    summoner: {
        reload: 0.3,
        size: 1.125,
        health: 0.5,
        damage: 0.345,
        pen: 0.4,
        density: 0.8
    },
    minionGun: {
        recoil: 0,
        shudder: 2,
        health: 0.4,
        damage: 0.4,
        pen: 1.2,
        range: 0.75,
        spray: 2
    },
    bigCheese: {
        reload: 1.5,
        size: 1.8,
        health: 2.5,
        speed: 1.25
    },
    mothership: {
        reload: 1.25,
        pen: 1.1,
        speed: 0.775,
        maxSpeed: 0.8,
        range: 15,
        resist: 1.15
    },
    satellite: {
        size: 0.8,
        reload: 3,
        damage: 1.875
    },

    // Minions
    spawner: {
        reload: 1.5,
        maxSpeed: 1.25
    },
    productionist: {
        reload: 7/6,
        recoil: 0.25,
        shudder: 0.5,
        speed: 4/3,
        range: 1.5,
        spray: 50
    },

    // Heavy cannons
    pounder: {
        reload: 2,
        recoil: 1.6,
        damage: 2,
        speed: 0.85,
        maxSpeed: 0.8,
        density: 1.5,
        resist: 1.15
    },
    destroyer: {
        reload: 2,
        recoil: 1.8,
        shudder: 0.5,
        health: 2,
        damage: 0.9,
        pen: 1.2,
        speed: 0.5,
        maxSpeed: 0.6,
        density: 2,
        resist: 3
    },
    annihilator: {
        reload: 1,
        recoil: 1.35,
        damage: 0.86
    },
    hive: {
        reload: 1.5,
        recoil: 0.8,
        size: 0.8,
        health: 0.7,
        damage: 0.3,
        maxSpeed: 0.6
    },
    artillery: {
        reload: 1.2,
        recoil: 0.7,
        size: 0.9,
        speed: 1.15,
        maxSpeed: 1.1,
        density: 1.5
    },
    mortar: {
        reload: 1.2,
        health: 1.1,
        speed: 0.8,
        maxSpeed: 0.8
    },
    shotgun: {
        reload: 8,
        recoil: 0.4,
        size: 1.5,
        damage: 0.4,
        pen: 0.8,
        speed: 1.8,
        maxSpeed: 0.6,
        density: 1.2,
        spray: 1.2
    },
    destroyerDominator: {
        reload: 6.5,
        recoil: 0,
        size: 0.975,
        health: 5,
        damage: 5,
        pen: 5,
        speed: 0.575,
        maxSpeed: 0.475,
        spray: 0.5
    },

    // Missiles
    launcher: {
        reload: 1.5,
        recoil: 1.5,
        shudder: 0.1,
        size: 0.72,
        health: 1.05,
        damage: 0.925,
        speed: 0.9,
        maxSpeed: 1.2,
        range: 1.1,
        resist: 1.5
    },
    skimmer: {
        recoil: 0.8,
        shudder: 0.8,
        size: 0.9,
        health: 1.35,
        damage: 0.8,
        pen: 2,
        speed: 0.85,
        maxSpeed: 0.85,
        resist: 1.1
    },
    snake: {
        reload: 0.4,
        shudder: 4,
        health: 1.5,
        damage: 0.9,
        pen: 1.2,
        speed: 0.1,
        maxSpeed: 0.35,
        density: 3,
        spray: 6,
        resist: 0.5
    },
    snakeskin: {
        reload: 0.6,
        shudder: 2,
        health: 0.5,
        damage: 0.5,
        speed: 2,
        maxSpeed: 0.2,
        range: 0.4,
        spray: 5
    },
    sidewinder: {
        reload: 1.5,
        recoil: 2,
        health: 1.5,
        damage: 0.9,
        speed: 0.15,
        maxSpeed: 0.5
    },
    rocketeer: {
        reload: 1.4,
        shudder: 0.9,
        size: 2,
        health: 1.5,
        damage: 1.4,
        pen: 1.4,
        speed: 0.3,
        range: 1.2,
        resist: 1.4
    },
    missileTrail: {
        reload: 0.6,
        recoil: 0.25,
        shudder: 2,
        damage: 0.9,
        pen: 0.7,
        speed: 0.4,
        range: 0.5
    },
    rocketeerMissileTrail: {
        reload: 0.5,
        recoil: 7,
        shudder: 1.5,
        size: 0.8,
        health: 0.8,
        damage: 0.7,
        speed: 0.9,
        maxSpeed: 0.8,
        spray: 5
    },

    // Traps and blocks
    megaTrap: {
        reload: 2,
        damage: 2,
        recoil: 2,
        size: 1.2
    },
    setTrap: {
        reload: 1.1,
        recoil: 2,
        shudder: 0.1,
        size: 1.5,
        health: 2,
        pen: 1.25,
        speed: 2.2,
        maxSpeed: 2.15,
        range: 1.25,
        resist: 1.25
    },
    construct: {
        reload: 1.3,
        size: 0.9,
        maxSpeed: 1.1
    },
    boomerang: {
        reload: 0.8,
        health: 0.5,
        damage: 0.5,
        speed: 0.75,
        maxSpeed: 0.75,
        range: 4/3
    },
    nestKeeper: {
        reload: 3,
        size: 0.75,
        health: 1.05,
        damage: 1.05,
        pen: 1.1,
        speed: 0.5,
        maxSpeed: 0.5,
        range: 0.5,
        density: 1.1
    },
    hexaTrapper: {
        reload: 1.3,
        shudder: 1.25,
        speed: 0.8,
        range: 0.5
    },
    trapperDominator: {
        reload: 1.46,
        recoil: 0,
        shudder: 0.25,
        health: 1.25,
        damage: 1.45,
        pen: 1.6,
        speed: 0.5,
        maxSpeed: 2,
        range: 1.1,
        spray: 0.5
    },
    barricade: {
        reload: 0.75,
        damage: 0.79,
        range: 0.5
    },

    // Misc
    weak: {
        reload: 2,
        health: 0.6,
        damage: 0.6,
        pen: 0.8,
        speed: 0.5,
        maxSpeed: 0.7,
        range: 0.25,
        density: 0.3
    },
    power: {
        shudder: 0.6,
        size: 1.2,
        pen: 1.25,
        speed: 2,
        maxSpeed: 1.7,
        density: 2,
        spray: 0.5,
        resist: 1.5
    },
    fake: {
        size: 0.00001,
        health: 0.0001,
        speed: 0,
        maxSpeed: 0,
        shudder: 0,
        spray: 0,
        recoil: 0,
        range: 0
    },
    op: {
        reload: 0.5,
        recoil: 1.3,
        health: 4,
        damage: 4,
        pen: 4,
        speed: 3,
        maxSpeed: 2,
        density: 5,
        spray: 2
    },
    healer: {
        damage: -1,
        speed: 0.5,
        maxSpeed: 0.5,
        recoil: 0.5
    },
    lowPower: {
        shudder: 2,
        health: 0.5,
        damage: 0.5,
        pen: 0.7,
        spray: 0.5,
        resist: 0.7
    },
    aura: {
        reload: 0.001,
        recoil: 0.001,
        shudder: 0.001,
        size: 6,
        speed: 0.001,
        maxSpeed: 0.001,
        spray: 0.001
    },
    noSpread: {
        shudder: 0,
        spray: 0
    },

    // Shiny menu
    worstTank: {
        reload: 15,
        damage: 0.01,
        health: 0.01,
        pen: 0.01
    },
    bigBalls: {
        reload: 4,
        damage: 4,
        health: 2,
        speed: 0.85,
        maxSpeed: 0.85,
        size: 2.5
    },
    machineShot: {
        reload: 0.3,
        recoil: 0.8,
        shudder: 0.4,
        health: 0.7,
        damage: 0.7,
        speed: 4.5,
        maxSpeed: 5.9,
        spray: 19
    },
};
