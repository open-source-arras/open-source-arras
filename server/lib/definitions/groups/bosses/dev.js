const {combineStats, makeAura, makeHat, makeMenu, skillSet, weaponArray, weaponMirror} = require('../../facilitators.js')
const {base, smshskl} = require('../../constants.js')
const g = require('../../gunvals.js')

// Taureon
Class.taureonCoreBase = {
    SHAPE: 4,
    COLOR: '#00A2E8'
}
Class.taureonCore = {
    PARENT: 'genericTank',
    LABEL: "Core Turret",
    SHAPE: 4.5,
    COLOR: '#99D9EA',
    CONTROLLERS: ["nearestDifferentMaster", "onlyAcceptInArc"],
    INDEPENDENT: true,
    GUNS: [{
        POSITION: [10, 14, -0.5, 14, 0, 0, 0]
    },{
        POSITION: [21, 15, -1.1, 0, 0, 0, 0],
        PROPERTIES: {
            SHOOT_SETTINGS: combineStats([g.basic, g.sniper, g.destroyer, g.sniper]),
            TYPE: "snake",
            STAT_CALCULATOR: "sustained"
        }
    }],
    TURRETS: [{
        POSITION: [20 * Math.SQRT2, 0, 0, 0, 0, 0],
        TYPE: "taureonCoreBase"
    }]
}
Class.taureonBase = {
    SHAPE: 4.5,
    COLOR: '#161B54',
    MIRROR_MASTER_ANGLE: true
}
let d = 1/4;
Class.taureonStar = {
    SHAPE: [[0,1],[d,d],[1,0],[d,-d],[0,-1],[-d,-d],[-1,0],[-d,d]],
    COLOR: '#3F48CC',
    MIRROR_MASTER_ANGLE: true
}
Class.taureonRailgunTurret = {
    PARENT: 'genericTank',
    COLOR: "grey",
    LABEL: "Railgun Turret",
    CONTROLLERS: ["nearestDifferentMaster", "onlyAcceptInArc"],
    INDEPENDENT: true,
    GUNS: [{
        POSITION: [20, 7, 1, 0, 0, 0, 0]
    },{
        POSITION: [24, 5, 1, 0, 0, 0, 0],
        PROPERTIES: {
            SHOOT_SETTINGS: combineStats([g.basic, g.destroyer, { speed: 5, penetration: 0.8 }]),
            TYPE: "bullet"
        }
    },{
        POSITION: [5, 7.5, -1.6, 8, 0, 0, 0],
    }]
}
Class.taureonThruster = {
    PARENT: 'genericTank',
    COLOR: "grey",
    LABEL: "Thruster",
    CONTROLLERS: ["onlyAcceptInArc"],
    GUNS: [{
        POSITION: [14, 12, 1, 4, 0, 180, 0],
        PROPERTIES: {
            SHOOT_SETTINGS: combineStats([g.basic, g.machineGun, g.machineGun, g.thruster, { range: 0.175, reload: 0.25, recoil: 0.25 }]),
            TYPE: ["bullet", { ALPHA: 0.5 }]
        }
    }, {
        POSITION: [12, 12, 1.4, 4, 0, 180, 0],
        PROPERTIES: {
            SHOOT_SETTINGS: combineStats([g.basic, g.machineGun, g.machineGun, g.thruster, { range: 0.175, reload: 0.25, recoil: 0.25 }]),
            TYPE: ["bullet", { ALPHA: 0.5 }]
        },
    }]
}
Class.taureonMissile = {
    PARENT: "bullet",
    LABEL: "Missile",
    FACING_TYPE: "smoothToTarget",
    CONTROLLERS: ["nearestDifferentMaster"],
    INDEPENDENT: true,
    BODY: {
        ACCELERATION: 10,
        FOV: base.FOV * 2
    },
    TURRETS: [{
        POSITION: [10, 0, 0, 0, 360, 1],
        TYPE: ["genericTank", {COLOR: "grey"}],
    }],
    GUNS: [{
        POSITION: [6, 12, 1.4, 8, 0, 180, 0],
        PROPERTIES: {
            AUTOFIRE: true,
            STAT_CALCULATOR: "thruster",
            SHOOT_SETTINGS: combineStats([g.basic, g.machineGun, { reload: 0.25, range: 0.075 }]),
            TYPE: ["bullet", { PERSISTS_AFTER_DEATH: true, ALPHA: 0.5 }]
        }
    },{
        POSITION: [10, 12, 0.8, 8, 0, 180, 0],
        PROPERTIES: {
            AUTOFIRE: true,
            STAT_CALCULATOR: "thruster",
            SHOOT_SETTINGS: combineStats([g.basic, g.machineGun, { reload: 0.25, range: 0.075 }]),
            TYPE: ["bullet", { PERSISTS_AFTER_DEATH: true, ALPHA: 0.5 }]
        }
    },...Array(32).fill().map((_, i)=>({
        POSITION: [0, (i % 4) + 1, 0, 0, 0, 0, 9999],
        PROPERTIES: {
            SHOOT_SETTINGS: combineStats([g.basic, g.machineGun, g.shotgun, { spray: 1e6, range: 0.5, shudder: 1.5, damage: 1 + (i % 4) }]),
            TYPE: ["bullet", { PERSISTS_AFTER_DEATH: true }],
            SHOOT_ON_DEATH: true
        },
    }))]
}
Class.taureonBoss = {
    PARENT: "miniboss",
    LABEL: "Diamond Marauder",
    NAME: "Taureon",
    COLOR: '#2B339B',
    UPGRADE_COLOR: "spaceGem",
    DANGER: 10,
    SHAPE: 4.5,
    SIZE: 50,
    FACING_TYPE: "smoothToTarget",
    UPGRADE_TOOLTIP: "With a powerful Gatling Gun on the front, Rocket Launchers as wings, movable Thrusters on the back, " +
                    "and equipped with Railgun Turrets, it perfectly excells at terminating those who feel its Wrath.\n" +
                    "An octahedral carbon robot, exclusively designed to eradicate opponents with sheer brutality alone.\n" +
                    '"NOW YOU FACE MY ULTIMATE CREATION."',
    VALUE: 9e6,
    BODY: {
        FOV: 1,
        SPEED: 0.5 * base.SPEED,
        HEALTH: 20 * base.HEALTH,
        DAMAGE: 3 * base.DAMAGE,
    },
    TURRETS: [{
        POSITION: [23.3, 0, 0, 0, 0, 0],
        TYPE: "taureonBase"
    },{
        POSITION: [5, 10, 0, -45, 180, 0],
        TYPE: "taureonRailgunTurret"
    },{
        POSITION: [5, 10, 0, 45, 180, 0],
        TYPE: "taureonRailgunTurret"
    },{
        POSITION: [5, -10, -2, -45, 90, 0],
        TYPE: "taureonThruster"
    },{
        POSITION: [5, -10, 2, 45, 90, 0],
        TYPE: "taureonThruster"
    },{
        POSITION: [25, 0, 0, 0, 0, 1],
        TYPE: "taureonStar"
    },{
        POSITION: [5, 0, 0, 0, 360, 1],
        TYPE: "taureonCore"
    }],
    GUNS: [...Array(6).fill().map((_, i) => ({
        POSITION: [18, 1.75, 1, 0, Math.cos(Math.PI * i / 3) * 2, 0, i / 6],
        PROPERTIES: {
            SHOOT_SETTINGS: combineStats([g.basic, g.twin, { speed: 2, maxSpeed: 2, damage: 0.75, size: 0.8 }]),
            TYPE: "bullet"
        }
    })),{
        POSITION: [4, 5, -0.5, 12, 0, -90, 0]
    },{
        POSITION: [10, 5, -1.2, 5, 0, -90, 0],
        PROPERTIES: {
            SHOOT_SETTINGS: combineStats([g.basic, g.sniper, g.hunter, g.sidewinder, g.destroyer, { shudder: 0.1, reload: 0.6, speed: 5, range: 2 }]),
            TYPE: "taureonMissile",
            STAT_CALCULATOR: "sustained"
        }
    },{
        POSITION: [4, 5, -0.5, 12, 0, 90, 0]
    },{
        POSITION: [10, 5, -1.2, 5, 0, 90, 0],
        PROPERTIES: {
            SHOOT_SETTINGS: combineStats([g.basic, g.sniper, g.hunter, g.sidewinder, g.destroyer, { shudder: 0.1, reload: 0.6, speed: 5, range: 2 }]),
            TYPE: "taureonMissile",
            STAT_CALCULATOR: "sustained"
        }
    },{
        POSITION: [5.5, 5, -1.5, 5, 0, -45, 0]
    },{
        POSITION: [5.5, 5, -1.5, 5, 0, 45, 0]
    },{
        POSITION: [2, 7, 1, 8, 0, 0, 0]
    },{
        POSITION: [2, 7, 1, 14.5, 0, 0, 0]
    }]
}

// TGS
Class.tgsSunchip = {
    PARENT: "drone",
    LABEL: "Omega Sunchip",
    SHAPE: 4,
    HITS_OWN_TYPE: "hard",
    BODY: {
        FOV: 0.5,
    },
    AI: {
        BLIND: true,
        FARMER: true,
    },
    PROPS: [{
        POSITION: [20 * Math.SQRT1_2, 0, 0, 45, 1],
        TYPE: "squareHat"
    },{
        POSITION: [20 * Math.SQRT1_2 ** 2, 0, 0, 0, 1],
        TYPE: "squareHat"
    },{
        POSITION: [20 * Math.SQRT1_2 ** 3, 0, 0, 45, 1],
        TYPE: "squareHat"
    }]
}
Class.tgsEggchip = {
    PARENT: "drone",
    LABEL: "Beta Sunchip",
    SHAPE: 0,
    HITS_OWN_TYPE: "hard",
    BODY: {
        FOV: 0.5,
    },
    AI: {
        BLIND: true,
        FARMER: true,
    },
    PROPS: [
        {
            TYPE: "circleHat",
            POSITION: {
                SIZE: 10,
                LAYER: 1
            }
        }
    ]
}
Class.tgsBoss = {
    PARENT: "miniboss",
    LABEL: "Shiny Omega Thaumaturge",
    NAME: "TGS",
    DANGER: 10,
    SHAPE: 4,
    COLOR: "lime",
    UPGRADE_COLOR: "lime",
    SIZE: 50,
    VALUE: 5e6,
    SKILL: skillSet({
        rld: 1,
        dam: 1,
        pen: 1,
        str: 1,
        spd: 1,
        atk: 1,
        hlt: 1,
        shi: 1,
        rgn: 1,
        mob: 1,
    }),
    BODY: {
        FOV: 0.75,
        SPEED: 0.05 * base.SPEED,
        HEALTH: 15 * base.HEALTH,
        DAMAGE: 5 * base.DAMAGE,
    },
    UPGRADE_TOOLTIP: "Someone has taken their love of Shiny Squares one step too far.",
    GUNS: weaponArray([
        ...weaponMirror({
            POSITION: [2.5, 3, 1.2, 8, 5, 0, 0],
            PROPERTIES: {
                SHOOT_SETTINGS: combineStats([g.drone, g.summoner, g.pounder, { speed: 2.5 }, g.machineGun, { spray: 50, speed: 1.25, shudder: 1.25 }]),
                TYPE: "tgsEggchip",
                MAX_CHILDREN: 8,
                AUTOFIRE: true,
                SYNCS_SKILLS: true,
                STAT_CALCULATOR: "drone",
                WAIT_TO_CYCLE: true,
                NO_LIMITATIONS: true,
            }
        }),
        {
            POSITION: [3.5, 8.65, 1.2, 8, 0, 0, 0],
            PROPERTIES: {
                SHOOT_SETTINGS: combineStats([g.drone, g.summoner, g.destroyer, g.destroyer, { speed: 2.5 }, { maxSpeed: 3 }]),
                TYPE: "tgsSunchip",
                MAX_CHILDREN: 4,
                AUTOFIRE: true,
                SYNCS_SKILLS: true,
                STAT_CALCULATOR: "drone",
                WAIT_TO_CYCLE: true,
                NO_LIMITATIONS: true,
            }
        }
    ], 4),
    TURRETS: [{
        POSITION: [20 * Math.SQRT1_2, 0, 0, 45, 0, 1],
        TYPE: "squareHat"
    },{
        POSITION: [20 * Math.SQRT1_2 ** 2, 0, 0, 0, 0, 1],
        TYPE: "squareHat"
    },{
        POSITION: [20 * Math.SQRT1_2 ** 3, 0, 0, 45, 0, 1],
        TYPE: "squareHat"
    }]
}

// DogeisCut
Class.dogeiscutBody = {
    PARENT: 'genericTank',
    COLOR: "grey",
    SHAPE: [[1,0],[-0.7,0.7],[-0.35,0],[-0.7,-0.7]]
}
Class.dogeiscutTurret = {
    PARENT: 'genericTank',
    COLOR: "grey",
    GUNS: [ {
            POSITION: [ 50, 5, 2.5, 0, 0, 0, 0, ],
            PROPERTIES: {
                SHOOT_SETTINGS: combineStats([g.basic, g.sniper, g.assassin, g.minigun, {reload: 0.1}]),
                TYPE: "bullet",
            },
        }, {
            POSITION: [ 18, 8, -2, 0, 0, 0, 0, ],
        }, 
    ],
    TURRETS: [
        {
            POSITION: [16, 0, 0, 0, 360, 1],
            TYPE: ["genericTank",  { MIRROR_MASTER_ANGLE: true, COLOR: "#f6c6a2"}],
        },
        {
            POSITION: [12, 0, 0, 0, 360, 1],
            TYPE: ["genericTank",  { MIRROR_MASTER_ANGLE: true, COLOR: 'pink'}],
        },
    ]
}
function createDogeiscutMissileTurret(color) {
    return {
        PARENT: 'genericTank',
        COLOR: "grey",
        GUNS: [ {
                POSITION: [ 15, 8, 2.5, 0, 0, 180, 0, ],
                PROPERTIES: {
                    SHOOT_SETTINGS: combineStats([
                        g.basic,
                        g.skimmer,
                        { reload: 0.5 },
                        g.lowPower,
                        { recoil: 1.35 },
                        { speed: 1.3, maxSpeed: 1.3 },
                        { speed: 1.3, maxSpeed: 1.3 },
                        {reload: 0.15, recoil: 1, range: 0.1}]),
                    TYPE: ["bullet", 
                        {
                        PERSISTS_AFTER_DEATH: true,
                        COLOR: color
                        },
                    ],
                    AUTOFIRE: true,
                    STAT_CALCULATOR: "thruster",
                },
            },
        ],
    }
}
function createDogeiscutMissile(color) {
    return {
        PARENT: "bullet",
        LABEL: color + " Missile",
        COLOR: color,
        GUNS: [...Array(11).fill().map((_, i)=>({
            POSITION: [0, 8, 0, 0, 0, ((360) / 11)*i, 9999],
            PROPERTIES: {
                SHOOT_SETTINGS: combineStats([g.basic, g.machineGun, g.shotgun, g.noSpread, { recoil: 0, range: 0.4, damage: 2.5, density: 30 }]),
                TYPE: ["bullet", { PERSISTS_AFTER_DEATH: true, COLOR: color }],
                SHOOT_ON_DEATH: true,
            },
        }))],
        TURRETS: [
            {
                POSITION: [16, 0, 0, 0, 360, 1],
                TYPE: ["dogeiscutMissileTurret_" + color],
            },
            {
                POSITION: [12, 0, 0, 0, 360, 1],
                TYPE: ["genericTank", {COLOR: "grey"}],
            }
        ]
    }
}
Class.dogeiscutMissileTurret_red = createDogeiscutMissileTurret('red')
Class.dogeiscutMissile_red = createDogeiscutMissile('red')
Class.dogeiscutMissileTurret_orange = createDogeiscutMissileTurret('orange')
Class.dogeiscutMissile_orange = createDogeiscutMissile('orange')
Class.dogeiscutMissileTurret_yellow = createDogeiscutMissileTurret('yellow')
Class.dogeiscutMissile_yellow = createDogeiscutMissile('yellow')
Class.dogeiscutMissileTurret_green = createDogeiscutMissileTurret('green')
Class.dogeiscutMissile_green = createDogeiscutMissile('green')
Class.dogeiscutMissileTurret_cyan = createDogeiscutMissileTurret('cyan')
Class.dogeiscutMissile_cyan = createDogeiscutMissile('cyan')
Class.dogeiscutMissileTurret_blue = createDogeiscutMissileTurret('blue')
Class.dogeiscutMissile_blue = createDogeiscutMissile('blue')
Class.dogeiscutMissileTurret_purple = createDogeiscutMissileTurret('purple')
Class.dogeiscutMissile_purple = createDogeiscutMissile('purple')
Class.dogeiscutBomb = {
    PARENT: "trap",
    LABEL: "Bomb",
    SHAPE: 0,
    GUNS: [...Array(32).fill().map((_, i)=>({
        POSITION: [0, 8, 0, 0, 0, ((360) / 32)*i, 9999],
        PROPERTIES: {
            SHOOT_SETTINGS: combineStats([g.basic, g.machineGun, g.shotgun, g.noSpread, { recoil: 0, range: 0.4, damage: 2.5, size: 0.5}]),
            TYPE: ["bullet", { PERSISTS_AFTER_DEATH: true }],
            SHOOT_ON_DEATH: true,
        },
    })),...Array(10).fill().map((_,i)=>({
        POSITION: [12, 3.5, 1, 0, 0, (360/10)*i, (i%3)/3],
        PROPERTIES: {
            SHOOT_SETTINGS: combineStats([
                g.basic,
                g.twin,
                g.gunner,
                g.cyclone,
                {reload: 3}
            ]),
            TYPE: "bullet",
            AUTOFIRE: true,
        },
        }))
    ],
    TURRETS: [
        {
            POSITION: [8, 0, 0, 0, 360, 1],
            TYPE: ["genericTank", {COLOR: "grey"}],
        }
    ]
}
Class.dogeiscutBoss = {
    PARENT: "miniboss",
    LABEL: "DOG",
    NAME: "DogeisCut",
    DANGER: 10,
    FACING_TYPE: "smoothToTarget",
    UPGRADE_TOOLTIP: "Huh? You want a cool and edgy boss tooltip? Too bad!", 
    SYNC_WITH_TANK: true,
    SHAPE: [[1,0],[-0.7,0.7],[-0.35,0],[-0.7,-0.7]],
    COLOR: "yellow",
    UPGRADE_COLOR: "yellow",
    SIZE: 50,
    NO_SIZE_ANIMATION: true,
    VALUE: 5e6,
    BODY: {
        FOV: 0.75,
        SPEED: 0.25 * base.SPEED,
        HEALTH: 14 * base.HEALTH,
        DAMAGE: 4 * base.DAMAGE,
    },
    GUNS: [ {
            POSITION: [ 6, 8, 1.5, 3, 0, 180, 0, ],
            PROPERTIES: {
                SHOOT_SETTINGS: combineStats([g.basic, g.pounder, g.destroyer, g.annihilator, {size: 1, reload: 3, recoil: 5}]),
                TYPE: ["dogeiscutBomb"],
                STAT_CALCULATOR: "sustained",
            }
        }, {
            POSITION: [ 4, 4, 1.5, 3, 0, 180, 0, ],
            PROPERTIES: {
                COLOR: "black"
            }
        }, 
        
        {
            POSITION: [ 1, 2, 1, 4, -8, 68, 0, ],
            PROPERTIES: {
                SHOOT_SETTINGS: combineStats([g.basic, g.sniper, g.hunter, g.sidewinder, {speed: 3, range: 0.8, reload: 4}]),
                TYPE: ["dogeiscutMissile_red"],
                STAT_CALCULATOR: "sustained",
                COLOR: 'red'
            }
        }, {
            POSITION: [ 1, 2, 1, 4, -5.333, 68, 1/7, ],
            PROPERTIES: {
                SHOOT_SETTINGS: combineStats([g.basic, g.sniper, g.hunter, g.sidewinder, {speed: 3, range: 0.8, reload: 4}]),
                TYPE: ["dogeiscutMissile_orange"],
                STAT_CALCULATOR: "sustained",
                COLOR: 'orange'
            }
        }, {
            POSITION: [ 1, 2, 1, 4, -2.666, 68, (1/7)*2, ],
            PROPERTIES: {
                SHOOT_SETTINGS: combineStats([g.basic, g.sniper, g.hunter, g.sidewinder, {speed: 3, range: 0.8, reload: 4}]),
                TYPE: ["dogeiscutMissile_yellow"],
                STAT_CALCULATOR: "sustained",
                COLOR: 'yellow'
            }
        }, {
            POSITION: [ 1, 2, 1, 4, 0, 68, (1/7)*3, ],
            PROPERTIES: {
                SHOOT_SETTINGS: combineStats([g.basic, g.sniper, g.hunter, g.sidewinder, {speed: 3, range: 0.8, reload: 4}]),
                TYPE: ["dogeiscutMissile_green"],
                STAT_CALCULATOR: "sustained",
                COLOR: 'green'
            }
        }, {
            POSITION: [ 1, 2, 1, 4, 2.666, 68, (1/7)*4, ],
            PROPERTIES: {
                SHOOT_SETTINGS: combineStats([g.basic, g.sniper, g.hunter, g.sidewinder, {speed: 3, range: 0.8, reload: 4}]),
                TYPE: ["dogeiscutMissile_cyan"],
                STAT_CALCULATOR: "sustained",
                COLOR: 'cyan'
            }
        }, {
            POSITION: [ 1, 2, 1, 4, 5.333, 68, (1/7)*5, ],
            PROPERTIES: {
                SHOOT_SETTINGS: combineStats([g.basic, g.sniper, g.hunter, g.sidewinder, {speed: 3, range: 0.8, reload: 4}]),
                TYPE: ["dogeiscutMissile_blue"],
                STAT_CALCULATOR: "sustained",
                COLOR: 'blue'
            }
        }, {
        POSITION: [ 1, 2, 1, 4, 8, 68, (1/7)*6, ],
            PROPERTIES: {
                SHOOT_SETTINGS: combineStats([g.basic, g.sniper, g.hunter, g.sidewinder, {speed: 3, range: 0.8, reload: 4}]),
                TYPE: ["dogeiscutMissile_purple"],
                STAT_CALCULATOR: "sustained",
                COLOR: 'purple'
            }
        }, 
        
        
        {
        POSITION: [ 1, 2, 1, 4, 8, -68, 0, ],
            PROPERTIES: {
                SHOOT_SETTINGS: combineStats([g.basic, g.sniper, g.hunter, g.sidewinder, {speed: 3, range: 0.8, reload: 4}]),
                TYPE: ["dogeiscutMissile_red"],
                STAT_CALCULATOR: "sustained",
                COLOR: 'red'
            }
        }, {
            POSITION: [ 1, 2, 1, 4, 5.333, -68, 1/7, ],
            PROPERTIES: {
                SHOOT_SETTINGS: combineStats([g.basic, g.sniper, g.hunter, g.sidewinder, {speed: 3, range: 0.8, reload: 4}]),
                TYPE: ["dogeiscutMissile_orange"],
                STAT_CALCULATOR: "sustained",
                COLOR: 'orange'
            }
        }, {
            POSITION: [ 1, 2, 1, 4, 2.666, -68, (1/7)*2, ],
            PROPERTIES: {
                SHOOT_SETTINGS: combineStats([g.basic, g.sniper, g.hunter, g.sidewinder, {speed: 3, range: 0.8, reload: 4}]),
                TYPE: ["dogeiscutMissile_yellow"],
                STAT_CALCULATOR: "sustained",
                COLOR: 'yellow'
            }
        }, {
            POSITION: [ 1, 2, 1, 4, 0, -68, (1/7)*3, ],
            PROPERTIES: {
                SHOOT_SETTINGS: combineStats([g.basic, g.sniper, g.hunter, g.sidewinder, {speed: 3, range: 0.8, reload: 4}]),
                TYPE: ["dogeiscutMissile_green"],
                STAT_CALCULATOR: "sustained",
                COLOR: 'green'
            }
        }, {
        POSITION: [ 1, 2, 1, 4, -2.666, -68, (1/7)*4, ],
            PROPERTIES: {
                SHOOT_SETTINGS: combineStats([g.basic, g.sniper, g.hunter, g.sidewinder, {speed: 3, range: 0.8, reload: 4}]),
                TYPE: ["dogeiscutMissile_cyan"],
                STAT_CALCULATOR: "sustained",
                COLOR: 'cyan'
            }
        }, {
            POSITION: [ 1, 2, 1, 4, -5.333, -68, (1/7)*5, ],
            PROPERTIES: {
                SHOOT_SETTINGS: combineStats([g.basic, g.sniper, g.hunter, g.sidewinder, {speed: 3, range: 0.8, reload: 4}]),
                TYPE: ["dogeiscutMissile_blue"],
                STAT_CALCULATOR: "sustained",
                COLOR: 'blue'
            }
        }, {
            POSITION: [ 1, 2, 1, 4, -8, -68, (1/7)*6, ],
            PROPERTIES: {
                SHOOT_SETTINGS: combineStats([g.basic, g.sniper, g.hunter, g.sidewinder, {speed: 3, range: 0.8, reload: 4}]),
                TYPE: ["dogeiscutMissile_purple"],
                STAT_CALCULATOR: "sustained",
                COLOR: 'purple'
            }
        },
    ],
    TURRETS: [
        {
            POSITION: [16, 0, 0, 0, 360, 1],
            TYPE: ["dogeiscutBody",  { MIRROR_MASTER_ANGLE: true, COLOR: "#f6c6a2"}],
        },
        {
            POSITION: [12, 0, 0, 0, 360, 1],
            TYPE: ["dogeiscutBody",  { MIRROR_MASTER_ANGLE: true, COLOR: 'pink'}],
        },
        {
            POSITION: [5, 0, 0, 0, 360, 1],
            TYPE: ["dogeiscutTurret",  { INDEPENDENT: true, CONTROLLERS: ["nearestDifferentMaster"], COLOR: "yellow" }],
        },
        {
            POSITION: [1, 10.5, 0, 0, 360, 0],
            TYPE: ["genericTank",  {COLOR: "black"}],
        },
    ]
}

// Trioplane
Class.trplnrBossAuraBulletAura = makeAura(1, 0.8)
Class.trplnrBossAuraBullet = {
    PARENT: 'genericTank',
    LABEL: 'Nest',
    SHAPE: -4,
    PERSISTS_AFTER_DEATH: true,
    BODY: {
        HEALTH: 100,
    },
    SIZE: 25,
    COLOR: '#F49EFF',
    GLOW: {
        STRENGTH: 25,
        COLOR: 'mirror',
        ALPHA: 1
    },
    DRAW_HEALTH: true,
    GUNS: weaponArray({
        POSITION: { ASPECT: -0.35, X: -5 },
        PROPERTIES: {
            COLOR: 'white',
            SHOOT_SETTINGS: combineStats([g.basic, g.pounder, { size: 0.8 }, {reload: 1.6, damage: 1.5}]),
            TYPE: 'autoswarm',
            AUTOFIRE: true,
        },
    }, 4),
    TURRETS: [
        {
            POSITION: {SIZE: 10, LAYER: 1},
            TYPE: "trplnrBossAuraBulletAura"
        }
    ]
}
const trplnrBossDecor = {
    COLOR: '#F49EFF',
    UPGRADE_COLOR: "lavender",
    LABEL: 'Lavender',
    NAME: 'Trioplane',
    SHAPE: 3,
    SIZE: 25,
    VALUE: 5e7,
    DANGER: 10,
    GLOW: {
        RADIUS: 15,
        COLOR: 'mirror',
        ALPHA: 1,
        RECURSION: 5
    },
    PROPS: [{
        POSITION: { SIZE: 25 ** Math.SQRT1_2, ANGLE: 180, LAYER: 1 },
        TYPE: ['triangle', { COLOR: 'black', MIRROR_MASTER_ANGLE: true }]
    }, {
        POSITION: { SIZE: 25 ** Math.SQRT1_2, LAYER: 1 },
        TYPE: ['triangle', { COLOR: -1, MIRROR_MASTER_ANGLE: true }]
    }, {
        POSITION: { SIZE: 25 },
        TYPE: ['triangle', { COLOR: 'black', MIRROR_MASTER_ANGLE: true }]
    }],
}
Class.trplnrBoss = {
    PARENT: "miniboss",
    ...trplnrBossDecor,
    NO_SIZE_ANIMATION: true,
    UPGRADE_TOOLTIP: "\"Heck, even The Guardians are afraid of him, \n" + 
                     "They usually call him the The Light, Victory, Death and Ruler of the Pentagon Race a.k.a Lvndr. \n" +
                     "We don't know where his teleportation powers came from, \n" +
                     "He was secretive of it. \n" +
                     "Though some say there was an old script found at the Neutrality Point \n" +
                     "at the middle of the nest when it still existed, It had some \n" +
                     "sort of drawing of a tank going through walls, and this thing that said '6@D M0|)3 \n" +
                     "Nest Reseachers still haven't been able to decipher it though. \n" +
                     "One day, The Neutrality Point left and on that same day, \n" +
                     "A sentry's child went missing, \n" +
                     "Coincidence? I think not.\"", 
    BODY: {
        HEALTH: 500,
    },
    ON: [
        {
            event: 'fire',
            handler: ({ body, gun }) => {
                if (gun.identifier != 'onHandler') return
                const messages = [
                    'Attack my little swarms!',
                    'Deploying, Attack swarms',
                    'You really think you can defeat me? Heres a little challenge for you.',
                    'This thing is really gonna annoy you HAHA!',
                    'I don\'t know what to say uhhh, die i guess.'
                ]
                global.gameManager.socketManager.broadcast(messages[Math.floor(Math.random() * messages.length)])
                global.gameManager.socketManager.broadcast('Lavender will turn into `BULL3T HELL F0rM`, Run!')
                for (let i = 0; i < 24; i++) {
                    i < 12 ?
                        setTimeout(() => { body.SIZE /= 1.1; body.alpha /= 1.2 }, i * 50)
                        :
                        setTimeout(() => { body.SIZE *= 1.1; body.alpha *= 1.2 }, i * 50)
                }
                setTimeout(() => {
                    let range = 500
                    let whereToGoX = Math.random() > 0.5 ? Math.floor(Math.random() * -range) : Math.floor(Math.random() * range)
                    let whereToGoY = Math.random() > 0.5 ? Math.floor(Math.random() * -range) : Math.floor(Math.random() * range)
                    body.x += whereToGoX
                    body.y += whereToGoY
                }, 12 * 50);
                setTimeout(() => body.define('trplnrBossBulletHellForm'), 24 * 50)
            }
        }
    ],
    GUNS: [
        ...weaponArray({
            POSITION: { WIDTH: 10, X: -5, ASPECT: -0.7, ANGLE: 180 },
            PROPERTIES: {
                COLOR: 'white',
                SHOOT_SETTINGS: combineStats([g.basic, {reload: 100}]),
                TYPE: "trplnrBossAuraBullet",
                INDEPENDENT_CHILDREN: true,
            }
        }, 2),
        {
            POSITION: { WIDTH: 10, X: -5, ASPECT: -0.7, ANGLE: 60 },
            PROPERTIES: {
                COLOR: 'white',
                SHOOT_SETTINGS: combineStats([g.basic, {reload: 100}]),
                TYPE: "trplnrBossAuraBullet",
                INDEPENDENT_CHILDREN: true,
                IDENTIFIER: 'onHandler',
                ALPHA: 0,
            }
        },
        ...weaponArray({
            POSITION: { WIDTH: 5, ASPECT: -0.7, ANGLE: 60 },
            PROPERTIES: {
                COLOR: 'black'
            }
        }, 3),
        ...weaponArray([
            {
                POSITION: { WIDTH: 5, HEIGHT: 5, X: -30, ASPECT: 0, ANGLE: 60 },
                PROPERTIES: {
                    COLOR: 'black'
                }
            }, {
                POSITION: { WIDTH: 5, HEIGHT: 5, X: -25, ASPECT: 0, ANGLE: 60 },
                PROPERTIES: {
                    COLOR: 'white'
                }
            }
        ], 3)
    ]
}
Class.trplnrBossBulletHellFormPentagonsAuraBullet = {
    PARENT: 'bullet',
    PERSISTS_AFTER_DEATH: true,
    TURRETS: [{
        POSITION: {SIZE: 13, LAYER: 1},
        TYPE: "trplnrBossAuraBulletAura"
    }]
} 
Class.trplnrBossBulletHellFormPentagons = {
    PARENT: 'bullet',
    LABEL: 'Pentagon',
    SHAPE: -5,
    PROPS: [{
        POSITION: { SIZE: 40 ** Math.SQRT1_2, ANGLE: 180, LAYER: 1 },
        TYPE: ['pentagon', {COLOR: 'black', MIRROR_MASTER_ANGLE: true}]
    }],
    GUNS: weaponArray({
        POSITION: { WIDTH: 10, HEIGHT: 10, ANGLE: 180, DELAY: 11.5 },
        PROPERTIES: {
            SHOOT_SETTINGS: combineStats([g.basic, g.pounder, {reload: 0.4}]),
            TYPE: 'trplnrBossBulletHellFormPentagonsAuraBullet',
            AUTOFIRE: true,
            COLOR: 'white',
        }
    }, 5)
}
Class.trplnrBossBulletHellForm = {
    PARENT: "miniboss",
    ...trplnrBossDecor,
    LABEL: 'Lavender - Bullet Hell Form',
    BODY: {
        HEALTH: 500,
    },
    ON: [
        {
            event: "fire",
            handler: ({ body, masterStore, gun }) => {
                if (gun.identifier != 'onHandler') return
                masterStore.shotsFired ??= 0
                masterStore.shotsFired++

                for (let i = 0; i < 24; i++) {
                    i < 12 ?
                        setTimeout(() => { body.SIZE /= 1.1; body.alpha /= 1.2 }, i * 50)
                        :
                        setTimeout(() => { body.SIZE *= 1.1; body.alpha *= 1.2 }, i * 50)
                }
                setTimeout(() => {
                    let range = 500
                    let whereToGoX = Math.random() > 0.5 ? Math.floor(Math.random() * -range) : Math.floor(Math.random() * range)
                    let whereToGoY = Math.random() > 0.5 ? Math.floor(Math.random() * -range) : Math.floor(Math.random() * range)
                    body.x += whereToGoX
                    body.y += whereToGoY
                }, 12 * 50)

                if (masterStore.shotsFired > 5) {
                    body.define('trplnrBossVulnerableForm')
                    const messages = [
                        'I\'m a little tired right now',
                        'Ouch my leg!',
                        'i sleep',
                        'Bruh my keyboard isn\'t working',
                        'Omg bruh I chose the wrong form'
                    ]
                    global.gameManager.socketManager.broadcast(messages[Math.floor(Math.random() * messages.length)])
                    global.gameManager.socketManager.broadcast('Lavender is in its `VULN3RABLE F0RM`, Attack!')
                }
            }
        }
    ],
    GUNS: [
        ...weaponArray([
            {
                POSITION: { WIDTH: 15, HEIGHT: 5, ANGLE: 180, ASPECT: 0, X: -25 },
                PROPERTIES: {
                    SHOOT_SETTINGS: combineStats([g.basic, g.pounder, g.destroyer, g.annihilator, { reload: 1 }]),
                    TYPE: 'trplnrBossBulletHellFormPentagonsAuraBullet',
                    COLOR: 'black'
                }
            }, {
                POSITION: { WIDTH: 15, HEIGHT: 5, ANGLE: 180, ASPECT: 0, X: -20 },
                PROPERTIES: {
                    COLOR: 'white'
                }
            }, {
                POSITION: { WIDTH: 10, HEIGHT: 5, ASPECT: 1.5, ANGLE: 180 },
                PROPERTIES: {
                    SHOOT_SETTINGS: combineStats([g.basic, g.pounder, g.destroyer, g.annihilator, { reload: 3 }]),
                    TYPE: 'trplnrBossBulletHellFormPentagons',
                    COLOR: 'white'
                }
            }, {
                POSITION: { WIDTH: 8, HEIGHT: 3, X: -1, ASPECT: 1.5, ANGLE: 180 },
                PROPERTIES: {
                    COLOR: 'pureWhite',
                }
            }, {
                POSITION: { WIDTH: 5, HEIGHT: 10, X: 5, ASPECT: 0.2, ANGLE: 180 },
                PROPERTIES: {
                    COLOR: -1,
                }
            }
        ], 3),
        {
            POSITION: { WIDTH: 0, HEIGHT: 0 },
            PROPERTIES: {
                SHOOT_SETTINGS: combineStats([g.basic, g.pounder, g.destroyer, g.annihilator, { reload: 2 }, g.fake]),
                TYPE: 'bullet',
                IDENTIFIER: 'onHandler',
                ALPHA: 0
            }
        }
    ],
}
Class.trplnrBossVulnerableForm = {
    PARENT: "miniboss",
    ...trplnrBossDecor,
    LABEL: 'Lavender - Vulnerable Form',
    BODY: {
        HEALTH: 500,
        SPEED: 0.1
    },
    ON: [
        {
            event: "tick",
            handler: ({ body }) => {
                body.store.ticks ??= 0
                body.store.ticks++
                const spawnCrashers = body.store.ticks % 3 == 0
                const spawnSentries = body.store.ticks % 60 == 0
                const sentries = ["sentrySwarm", "sentryGun", "sentryTrap"]
                if (spawnCrashers) new Entity(body, body).define("crasher")
                if (spawnSentries) new Entity(body, body).define(sentries[Math.floor(Math.random() * sentries.length)])
            }
        },
        {
            event: "fire",
            handler: ({ body, gun }) => {
                if (gun.identifier != 'onHandler') return
                setTimeout(() => {
                    body.define('trplnrBoss')
                    global.gameManager.socketManager.broadcast('im awake')
                }, 15000)
                setTimeout(() => global.gameManager.socketManager.broadcast('Lavender will activate in 10 seconds and turn into S4nctuary F0rM'), 5000)
            }
        }
    ],
    GUNS: [{
        POSITION: {LENGTH: 0, WIDTH: 0},
        PROPERTIES: {
            SHOOT_SETTINGS: combineStats([g.basic, {reload: 500}]),
            TYPE: 'bullet',
            AUTOFIRE: true,
            IDENTIFIER: 'onHandler',
            ALPHA: 0
        }
    }]
}

// Frostbyte
Class.frostAuraSmall = {
	PARENT: "aura",
	LAYER: 30,
	FACING_TYPE: ["spin", {speed: -0.04}],
    BORDERLESS: true,
	SHAPE: "M 1 0 L 0.715 0.519 L 0.309 0.951 L -0.273 0.84 L -0.809 0.588 L -0.883 0 L -0.809 -0.588 L -0.273 -0.84 L 0.309 -0.951 L 0.715 -0.519 L 1 0",
    TURRETS: [{
        POSITION: [20, 0, 0, 0, 0, 1],
        TYPE: 'frostAuraSmallOutline'
    }]
}
Class.frostAuraSmallOutline = {
    PARENT: "aura",
	MIRROR_MASTER_ANGLE: true,
    DRAW_FILL: false,
	SHAPE: "M 1 0 L 0.715 0.519 L 0.309 0.951 L -0.273 0.84 L -0.809 0.588 L -0.883 0 L -0.809 -0.588 L -0.273 -0.84 L 0.309 -0.951 L 0.715 -0.519 L 1 0" + 
		"L 0.309 0.951 L -0.809 0.588 L -0.809 -0.588 L 0.309 -0.951 L 1 0" + 
		"L 0 0 L 0.309 0.951 M 0 0 L -0.809 0.588 M 0 0 L -0.809 -0.588 M 0 0 L 0.309 -0.951",
}
Class.frostAuraLarge = {
	PARENT: "aura",
	LAYER: 30,
	FACING_TYPE: ["spin", {speed: -0.04}],
	BORDERLESS: true,
	SHAPE: "M 1 0 L 0.988 0.156 L 0.951 0.309 L 0.891 0.454 L 0.809 0.588 L 0.707 0.707 L 0.588 0.809 L 0.454 0.891 L 0.309 0.951 L 0.156 0.988 L 0 1 L -0.156 0.988 L -0.309 0.951 L -0.454 0.891 L -0.588 0.809 L -0.707 0.707 L -0.809 0.588 L -0.891 0.454 L -0.951 0.309 L -0.988 0.156 L -1 0 L -0.988 -0.156 L -0.951 -0.309 L -0.891 -0.454 L -0.809 -0.588 L -0.707 -0.707 L -0.588 -0.809 L -0.454 -0.891 L -0.309 -0.951 L -0.156 -0.988 L 0 -1 L 0.156 -0.988 L 0.309 -0.951 L 0.454 -0.891 L 0.588 -0.809 L 0.707 -0.707 L 0.809 -0.588 L 0.891 -0.454 L 0.951 -0.309 L 0.988 -0.156 L 1 0",
    TURRETS: [{
        POSITION: [20, 0, 0, 0, 0, 1],
        TYPE: 'frostAuraLargeOutline'
    }]
}
Class.frostAuraLargeOutline = {
    PARENT: "aura",
	MIRROR_MASTER_ANGLE: true,
    DRAW_FILL: false,
	SHAPE: "M 1 0 L 0.988 0.156 L 0.951 0.309 L 0.891 0.454 L 0.809 0.588 L 0.707 0.707 L 0.588 0.809 L 0.454 0.891 L 0.309 0.951 L 0.156 0.988 L 0 1 L -0.156 0.988 L -0.309 0.951 L -0.454 0.891 L -0.588 0.809 L -0.707 0.707 L -0.809 0.588 L -0.891 0.454 L -0.951 0.309 L -0.988 0.156 L -1 0 L -0.988 -0.156 L -0.951 -0.309 L -0.891 -0.454 L -0.809 -0.588 L -0.707 -0.707 L -0.588 -0.809 L -0.454 -0.891 L -0.309 -0.951 L -0.156 -0.988 L 0 -1 L 0.156 -0.988 L 0.309 -0.951 L 0.454 -0.891 L 0.588 -0.809 L 0.707 -0.707 L 0.809 -0.588 L 0.891 -0.454 L 0.951 -0.309 L 0.988 -0.156 L 1 0" + 
        "M 0.988 -0.156 L 0.988 0.156 L 0.891 0.454 L 0.707 0.707 L 0.454 0.891 L 0.156 0.988 L -0.156 0.988 L -0.454 0.891 L -0.707 0.707 L -0.891 0.454 L -0.988 0.156 L -0.988 -0.156 L -0.891 -0.454 L -0.707 -0.707 L -0.454 -0.891 L -0.156 -0.988 L 0.156 -0.988 L 0.454 -0.891 L 0.707 -0.707 L 0.891 -0.454 L 0.988 -0.156 L 0.949 0" + 
        "L 0.988 0.156 L 0.891 0.256 L 0.891 0.454 L 0.739 0.537 L 0.707 0.707 L 0.519 0.769 L 0.454 0.891 L 0.293 0.902 L 0.156 0.988 L 0.032 0.927 L -0.156 0.988 L -0.282 0.869 L -0.454 0.891 L -0.571 0.731 L -0.707 0.707 L -0.768 0.558 L -0.891 0.454 L -0.871 0.317 L -0.988 0.156 L -0.914 0 L -0.988 -0.156 L -0.871 -0.317 L -0.891 -0.454 L -0.768 -0.558 L -0.707 -0.707 L -0.571 -0.731 L -0.454 -0.891 L -0.282 -0.869 L -0.156 -0.988 L 0.032 -0.927 L 0.156 -0.988 L 0.293 -0.902 L 0.454 -0.891 L 0.519 -0.769 L 0.707 -0.707 L 0.739 -0.537 L 0.891 -0.454 L 0.891 -0.256 L 0.988 -0.156 L 0.949 0" + 
        "L 0.891 0.256 L 0.739 0.537 L 0.519 0.769 L 0.293 0.902 L 0.032 0.927 L -0.282 0.869 L -0.571 0.731 L -0.768 0.558 L -0.871 0.317 L -0.914 0 L -0.871 -0.317 L -0.768 -0.558 L -0.571 -0.731 L -0.282 -0.869 L 0.032 -0.927 L 0.293 -0.902 L 0.519 -0.769 L 0.739 -0.537 L 0.891 -0.256 L 0.949 0" + 
        "M 0.834 0 L 0.891 0.256 L 0.704 0.291 L 0.739 0.537 L 0.495 0.579 L 0.519 0.769 L 0.258 0.793 L 0.032 0.927 L -0.06 0.759 L -0.282 0.869 L -0.398 0.649 L -0.571 0.731 L -0.674 0.49 L -0.871 0.317 L -0.741 0.178 L -0.914 0 L -0.741 -0.178 L -0.871 -0.317 L -0.674 -0.49 L -0.571 -0.731 L -0.398 -0.649 L -0.282 -0.869 L -0.06 -0.759 L 0.032 -0.927 L 0.258 -0.793 L 0.519 -0.769 L 0.495 -0.579 L 0.739 -0.537 L 0.704 -0.291 L 0.891 -0.256 L 0.834 0" + 
        "L 0.704 0.291 L 0.495 0.579 L 0.258 0.793 L -0.06 0.759 L -0.398 0.649 L -0.674 0.49 L -0.741 0.178 L -0.741 -0.178 L -0.674 -0.49 L -0.398 -0.649 L -0.06 -0.759 L 0.258 -0.793 L 0.495 -0.579 L 0.704 -0.291 L 0.834 0" + 
        "M 0.592 0 L 0.704 0.291 L 0.413 0.3 L 0.495 0.579 L 0.183 0.563 L -0.06 0.759 L -0.158 0.485 L -0.398 0.649 L -0.479 0.348 L -0.741 0.178 L -0.51 0 L -0.741 -0.178 L -0.479 -0.348 L -0.398 -0.649 L -0.158 -0.485 L -0.06 -0.759 L 0.183 -0.563 L 0.495 -0.579 L 0.413 -0.3 L 0.704 -0.291 L 0.592 0" + 
        "L 0.413 0.3 L 0.183 0.563 L -0.158 0.485 L -0.479 0.348 L -0.51 0 L -0.479 -0.348 L -0.158 -0.485 L 0.183 -0.563 L 0.413 -0.3 L 0.592 0" + 
        "M 0.292 0 L 0.413 0.3 L 0.09 0.277 L -0.158 0.485 L -0.236 0.171 L -0.51 0 L -0.236 -0.171 L -0.158 -0.485 L 0.09 -0.277 L 0.413 -0.3 L 0.292 0 L 0.09 0.277" + 
        "L -0.236 0.171 L -0.236 -0.171 L 0.09 -0.277 L 0.292 0 M 0 0 L 0.949 0" + 
        "M 0 0 L 0.293 0.902 M 0 0 L -0.768 0.558 M 0 0 L -0.768 -0.558 M 0 0 L 0.293 -0.902",
}
Class.frostAuraSymbol = {
	PARENT: 'genericTank',
	CONTROLLERS: [["spin", { speed: -0.04 }]],
	INDEPENDENT: true,
    BORDERLESS: true,
	COLOR: 'teal',
	SHAPE: "M 1 0 L 0.797 0.46 L 0.5 0.866 L 0 0.92 L -0.5 0.866 L -0.797 0.46 L -1 0 L -0.797 -0.46 L -0.5 -0.866 L 0 -0.92 L 0.5 -0.866 L 0.797 -0.46 L 1 0 Z",
    TURRETS: [{
        POSITION: [20, 0, 0, 0, 0, 1],
        TYPE: 'frostAuraSymbolOutline'
    }]
}
Class.frostAuraSymbolOutline = {
    PARENT: 'genericTank',
	MIRROR_MASTER_ANGLE: true,
    DRAW_FILL: false,
	SHAPE: "M 1 0 L 0.797 0.46 L 0.5 0.866 L 0 0.92 L -0.5 0.866 L -0.797 0.46 L -1 0 L -0.797 -0.46 L -0.5 -0.866 L 0 -0.92 L 0.5 -0.866 L 0.797 -0.46 L 1 0 Z" +
	    "M 0.52 0.3 L 0.52 -0.3 L 0.797 -0.46 M 0.52 -0.3 L 0 -0.6 L 0 -0.92 M 0 -0.6 L -0.52 -0.3 L -0.797 -0.46 M -0.52 -0.3 L -0.52 0.3 L -0.797 0.46 M -0.52 0.3 L 0 0.6 L 0 0.92 M 0 0.6 L 0.52 0.3 L 0.797 0.46"
}
function addIcosphereAura(damageFactor = 1, sizeFactor = 1, opacity = 0.3, auraSize = "Medium") {
	let auraType = "frostAura" + auraSize;
	return {
		PARENT: 'genericTank',
		INDEPENDENT: true,
		LABEL: "",
		COLOR: 17,
		GUNS: [
			{
				POSITION: [0, 20, 1, 0, 0, 0, 0,],
				PROPERTIES: {
					SHOOT_SETTINGS: combineStats([g.aura, { size: sizeFactor, damage: damageFactor }]),
					TYPE: [auraType, {ALPHA: opacity}],
					MAX_CHILDREN: 1,
					AUTOFIRE: true,
					SYNCS_SKILLS: true,
				}, 
			}, 
		],
		TURRETS: [
			{
				POSITION: [20, 0, 0, 0, 360, 1],
				TYPE: "frostAuraSymbol"
			},
		]
	};
}
Class.frostAuraBlockTop = {
	SHAPE: "M -1.3 -0.15 L -1.3 0.15 L -0.3 0.3 L -0.15 1.3 L 0.15 1.3 L 0.3 0.3 L 1.3 0.15 L 1.3 -0.15 L 0.3 -0.3 L 0.15 -1.3 L -0.15 -1.3 L -0.3 -0.3 Z",
	COLOR: { BASE: 17, BRIGHTNESS_SHIFT: 5 },
	MIRROR_MASTER_ANGLE: true,
}
Class.frostAuraBlockTurret = {
	PARENT: 'genericTank',
    INDEPENDENT: true,
	COLOR: 17,
    CONTROLLERS: ["nearestDifferentMaster"],
	LABEL: "",
	BODY: {
		FOV: 2,
	},
	HAS_NO_RECOIL: true,
	GUNS: [
		{
			POSITION: [18, 15, 1, 0, 0, 0, 0],
			PROPERTIES: {
				SHOOT_SETTINGS: combineStats([g.basic, g.minionGun, g.turret, g.power, g.autoTurret, g.fake]),
				TYPE: "bullet",
				COLOR: {BASE: 17, BRIGHTNESS_SHIFT: -7.5}
			},
		}, {
			POSITION: [23, 11, 1, 0, 0, 0, 0],
			PROPERTIES: {
				SHOOT_SETTINGS: combineStats([g.basic, g.minionGun, g.turret, g.power, g.autoTurret, {density: 0.2}]),
				TYPE: "bullet",
				COLOR: {BASE: -1, BRIGHTNESS_SHIFT: -10, SATURATION_SHIFT: 0.6}
			},
		}, {
			POSITION: [15, 13, 1, 0, 0, 0, 0],
			PROPERTIES: {
				SHOOT_SETTINGS: combineStats([g.basic, g.minionGun, g.turret, g.power, g.autoTurret, g.fake]),
				TYPE: "bullet",
				COLOR: {BASE: 17, BRIGHTNESS_SHIFT: 7.5}
			},
		},
	],
}
Class.frostAuraBlockAura = addIcosphereAura(0.25, 1.6, 0.15, "Small");
Class.frostAuraBlock = {
	PARENT: 'unsetTrap',
	TURRETS: [
		{
			POSITION: [20, 0, 0, 45, 0, 1],
			TYPE: 'frostAuraBlockTop'
		}, {
			POSITION: [11, 0, 0, 0, 360, 1],
			TYPE: 'frostAuraBlockTurret'
		}, {
			POSITION: [10, 0, 0, 0, 360, 1],
			TYPE: 'frostAuraBlockAura'
		}
	]
}
Class.frostBossBigAura = addIcosphereAura(1.5, 1.45, 0.3, "Large");
Class.frostBossAutoTurret = {
	PARENT: "autoTankGun",
	INDEPENDENT: true,
	COLOR: 17,
	GUNS: [
		{
			POSITION: [17, 14, 1, 0, 0, 0, 0],
			PROPERTIES: {
				SHOOT_SETTINGS: combineStats([g.basic, g.autoTurret, {recoil: 0.1}, g.fake]),
				TYPE: "bullet",
				COLOR: {BASE: 17, BRIGHTNESS_SHIFT: -7.5}
			},
		}, {
			POSITION: [22, 10, 1, 0, 0, 0, 0],
			PROPERTIES: {
				SHOOT_SETTINGS: combineStats([g.basic, g.autoTurret, {recoil: 0.1}]),
				TYPE: "bullet",
				COLOR: {BASE: -1, BRIGHTNESS_SHIFT: -10, SATURATION_SHIFT: 0.6}
			},
		}, {
			POSITION: [14, 12, 1, 0, 0, 0, 0],
			PROPERTIES: {
				SHOOT_SETTINGS: combineStats([g.basic, g.autoTurret, {recoil: 0.1}, g.fake]),
				TYPE: "bullet",
				COLOR: {BASE: 17, BRIGHTNESS_SHIFT: 7.5}
			},
		},
	],
	TURRETS: [
		{
			POSITION: [13, 0, 0, 0, 0, 1],
			TYPE: ["egg", {COLOR: -1, BORDERLESS: true}],
		},
	],
}
Class.frostBossBaseDeco = {
	SHAPE: "M -1.1 0 L -0.956 0.292 L -0.669 0.205 L -0.669 -0.205 L -0.956 -0.292 Z" +
		"M -0.55 0.952 L -0.225 0.974 L -0.157 0.682 L -0.512 0.477 L -0.731 0.682 Z" +
		"M -0.55 -0.952 L -0.225 -0.974 L -0.157 -0.682 L -0.512 -0.477 L -0.731 -0.682 Z" +
		"M 0.55 0.952 L 0.225 0.974 L 0.157 0.682 L 0.512 0.477 L 0.731 0.682 Z" +
		"M 0.55 -0.952 L 0.225 -0.974 L 0.157 -0.682 L 0.512 -0.477 L 0.731 -0.682 Z" +
		"M 1.1 0 L 0.956 0.292 L 0.669 0.205 L 0.669 -0.205 L 0.956 -0.292 Z",
	COLOR: { BASE: 17, BRIGHTNESS_SHIFT: 2.5 },
	MIRROR_MASTER_ANGLE: true,
	GUNS: weaponArray([
        {
			POSITION: [1.75, 3, -0.75, 7.5, 0, 0, 0],
			PROPERTIES: { COLOR: { BASE: -1, BRIGHTNESS_SHIFT: 2.5, SATURATION_SHIFT: 0.9 }, DRAW_ABOVE: true },
		}, {
			POSITION: [1, 9, 0, 8.5, 0, 30, 0],
			PROPERTIES: { COLOR: { BASE: -1, BRIGHTNESS_SHIFT: 10, SATURATION_SHIFT: 1.15 } },
		},
    ], 6)
}
Class.frostBossBaseDeco2 = {
	COLOR: {BASE: -1, BRIGHTNESS_SHIFT: 7.5},
	GUNS: weaponArray([
		{
			POSITION: [5, 10, 0.001, 9.5, 0, 0, 0],
			PROPERTIES: {COLOR: {BASE: 9, BRIGHTNESS_SHIFT: 10}},
		}, {
			POSITION: [1.6, 9, 0, 8.4, 0, 0, 0],
			PROPERTIES: {COLOR: {BASE: 9, BRIGHTNESS_SHIFT: 10}, DRAW_ABOVE: true},
		},
	], 6),
}
const trebuchetStats = [g.basic, g.sniper, g.predator, g.predator, g.predator, g.predator, {speed: 0.93, maxSpeed: 0.93, reload: 2, health: 1.7, damage: 1.4, size: 2}];
const hielamanStats = [g.trap, g.setTrap, g.hexaTrapper, {reload: 2.85, health: 3.2, range: 1.2}];
Class.frostBoss = {
    PARENT: 'miniboss',
    LABEL: 'Extrasolar',
    NAME: 'Frostbyte',
    CONTROLLERS: [["minion", {orbit: 260, leash: 190, repel: 270}]],
    FACING_TYPE: 'toTarget',
    SHAPE: 6,
    COLOR: "aqua",
    UPGRADE_COLOR: "aqua",
    SIZE: 31,
    NO_SIZE_ANIMATION: true,
	DANGER: 12,
    VALUE: 888888,
    UPGRADE_TOOLTIP: "\"When the golden rays of sun shine through this world's\n" +
                    "darkened skies and looming clouds, the legend of the warrior\n" +
                    "and his eternal blade will finally come to fruition.\"",
    BODY: {
        SPEED: base.SPEED * 0.6,
        HEALTH: base.HEALTH * 11,
        SHIELD: base.SHIELD * 7,
        REGEN: base.REGEN * 2.5,
        FOV: base.FOV * 1.4,
        RESIST: base.RESIST * 1.2,
        DENSITY: base.DENSITY * 7.5,
    },
    GUNS: [
        ...weaponArray({
            // Speed
            POSITION: [8, 14.5, 0.001, 9.5, 0, 0, 0],
            PROPERTIES: {COLOR: 9},
        }, 6),
        ...weaponArray([
            { // Heavy Snipers
                POSITION: [26.5, 9.5, 1, 0, 0, 0, 0],
                PROPERTIES: {
                    SHOOT_SETTINGS: combineStats(trebuchetStats),
                    TYPE: "bullet",
                    COLOR: { BASE: -1, BRIGHTNESS_SHIFT: -15, SATURATION_SHIFT: 0.6 },
                },
            }, {
                POSITION: [24, 6.65, -1.3, 0, 0, 0, 0],
                PROPERTIES: { 
                    SHOOT_SETTINGS: combineStats([...trebuchetStats, g.fake]),
                    TYPE: "bullet",
                    COLOR: { BASE: -1, BRIGHTNESS_SHIFT: -5, SATURATION_SHIFT: 0.6 }, 
                    BORDERLESS: true
                },
            }, {
                POSITION: [4.25, 9.5, -0.5, 1.425, -8.5, 90, 0],
                PROPERTIES: { COLOR: { BASE: 17, BRIGHTNESS_SHIFT: 2.5 } },
            }, {
                POSITION: [4.25, 9.5, -0.5, 1.425, 8.5, -90, 0],
                PROPERTIES: { COLOR: { BASE: 17, BRIGHTNESS_SHIFT: 2.5 } },
            }, {
                POSITION: [4.25, 6.65, -0.35, 0.67, -8.5, 90, 0],
                PROPERTIES: { COLOR: { BASE: 17, BRIGHTNESS_SHIFT: 7.5 }, BORDERLESS: true },
            }, {
                POSITION: [4.25, 6.65, -0.35, 0.67, 8.5, -90, 0],
                PROPERTIES: { COLOR: { BASE: 17, BRIGHTNESS_SHIFT: 7.5 }, BORDERLESS: true },
            }, {
                POSITION: [19.5, 3.8, -1.4, 0, 0, 0, 0],
                PROPERTIES: { COLOR: { BASE: 17, BRIGHTNESS_SHIFT: 10 } },
            }, {
                POSITION: [4, 11.5, 1, 19.5, 0, 0, 0],
                PROPERTIES: {
                    SHOOT_SETTINGS: combineStats([...trebuchetStats, g.fake]),
                    TYPE: "bullet",
                    COLOR: { BASE: -1, BRIGHTNESS_SHIFT: -5, SATURATION_SHIFT: 0.6 },
                },
            }, {
                POSITION: [2, 12, 1, 20.5, 0, 0, 0],
                PROPERTIES: {
                    SHOOT_SETTINGS: combineStats([...trebuchetStats, g.fake]),
                    TYPE: "bullet",
                    COLOR: { BASE: 17, BRIGHTNESS_SHIFT: 2.5 },
                },
            },
            { // Aura Blocks
                POSITION: [15, 8.5, 1, 0, 0, 60, 0],
                PROPERTIES: {COLOR: {BASE: -1, BRIGHTNESS_SHIFT: -15, SATURATION_SHIFT: 0.6}}
            }, {
                POSITION: [4, 7, -1.6, 9, 0, 60, 0],
                PROPERTIES: {COLOR: {BASE: 17, BRIGHTNESS_SHIFT: 5}}
            }, {
                POSITION: [3, 6, -1.55, 9, 0, 60, 0],
                PROPERTIES: {COLOR: {BASE: 17, BRIGHTNESS_SHIFT: 12.5}, BORDERLESS: true}
            }, {
                POSITION: [15, 5.4, -0.1, 0, 0, 60, 0],
                PROPERTIES: {COLOR: {BASE: -1, BRIGHTNESS_SHIFT: -5, SATURATION_SHIFT: 0.75}}
            }, {
                POSITION: [3, 8.5, 1.6, 15, 0, 60, 0],
                PROPERTIES: {
                    SHOOT_SETTINGS: combineStats(hielamanStats),
                    TYPE: 'frostAuraBlock',
                    STAT_CALCULATOR: "trap",
                    COLOR: {BASE: -1, BRIGHTNESS_SHIFT: -15, SATURATION_SHIFT: 0.6}
                },
            }, {
                POSITION: [2, 6, 1.6, 16, 0, 60, 0],
                PROPERTIES: {
                    SHOOT_SETTINGS: combineStats([...hielamanStats, g.fake]),
                    TYPE: 'bullet',
                    COLOR: {BASE: 17, BRIGHTNESS_SHIFT: 7.5}
                },
            },
        ], 3),
    ],
    TURRETS: [
		...weaponArray({
            POSITION: [2.95, 8.55, 0, 30, 180, 2],
            TYPE: "frostBossAutoTurret",
        }, 6),
		{
			POSITION: [8.55, 0, 0, 0, 360, 2],
			TYPE: "frostBossBigAura",
		},
    ],
    PROPS: [
        {
			POSITION: [12, 0, 0, 180, 1],
			TYPE: ["hexagon", {COLOR: {BASE: -1, BRIGHTNESS_SHIFT: 7.5}}],
		}, {
            POSITION: [12, 0, 0, 0, 1],
			TYPE: "frostBossBaseDeco2"
        }, {
			POSITION: [20, 0, 0, 0, 1],
			TYPE: "frostBossBaseDeco",
		}
    ]
}

// Toothless
Class.toothlessBase = {
    PARENT: 'genericTank',
    LABEL: "Absolute Solver",
    UPGRADE_TOOLTIP: "Easier to assimilate than explain",
    GLOW: {
        RADIUS: 2,
        COLOR: "#8610e6",
        ALPHA: 1,
        RECURSION: 2,
    },
    BODY: {
        SPEED: 0.8 * base.SPEED,
        FOV: 1.5 * base.FOV,
        HEALTH: 6 * base.HEALTH,
        DAMAGE: 2 * base.DAMAGE,
    },
    LEVEL_CAP: 45,
    EXTRA_SKILL: 78, // 120 - 42
    SHAPE: 3,
    VALUE: 30e3,
    SIZE: 24,
    COLOR: "purple",
    SKILL_CAP: Array(10).fill(smshskl + 3),
    defineLevelSkillPoints: (level) => {
        if (level < 2) return 0;
        if (level <= 40) return 1;
        if (level <= 45 && level & (1 == 1)) return 1;
        return 0;
    },
};
Class.toothlessBossDeco = {
    PARENT: 'genericTank',
    SHAPE: "m-.4239.5982c.009-.0756.0238-.1433.0314-.1504.0071-.0063.028-.0104.0457-.0071.0614.0077.0757-.0071.1363-.1361.0307-.0631.0534-.1204.0512-.1286C-.1611.1691-.1824.1279-.2071.0848l-.0449-.0802.0457-.0891c.0249-.0491.0456-.0949.0447-.1035C-.163-.2177-.2684-.4171-.2878-.4295-.2991-.436-.3262-.4389-.347-.437-.3682-.4343-.389-.4382-.3953-.4453-.4065-.4599-.4424-.7358-.4339-.7505c.006-.0104.0435.0147.169.1172l.0786.0639-.0249.0491c-.0133.027-.0236.0568-.021.0664.0033.0204.1304.2162.1451.2247.0061.0035.0507.0062.1004.006s.0978.0045.1082.0105.0385.0453.0632.0885.0494.0805.0554.084c.0147.0085.2479.0207.2671.0133.0096-.0026.0303-.0264.047-.0514l.0301-.0461.0946.0361c.1704.0649.193.0757.1855.0886-.008.0139-.2498.1167-.2768.1173C.5735.1187.5646.1101.5528.0825.5432.0631.5257.0414.5136.0344.4946.0234.2664.0326.2401.0462.2341.0485.2048.0893.1747.1355l-.0543.0841-.0919.0012c-.0511.0005-.0997.0048-.1077.0106-.0083.0044-.0458.0533-.084.1074C-.2408.451-.2454.4691-.2114.5142c.0121.0151.0202.0371.0181.0486-.0032.0155-.1795.1608-.2253.1863C-.4404.7607-.4418.7253-.4239.5982",
    LABEL: "",
    COLOR: "purple",
};
Class.absoluteSolver = {
    PARENT: "toothlessBossDeco",
    FACING_TYPE: ["manual", { angle: 0 }],
    MOTION_TYPE: "withMaster",
    ON: [
        {
            event: "define",
            handler: ({ body }) => {
                body.TIME_UNTIL = 0;
                body.ABSOLUTE_ANGLE = body.master.facing;
                body.SIZE = body.master.size * 2;
            },
        },
        {
            event: "tick",
            handler: ({ body }) => {
                body.TIME_UNTIL++;

                if (body.TIME_UNTIL == 5 || body.TIME_UNTIL == 10) {
                    body.ABSOLUTE_ANGLE += 60;
                }
                if (body.TIME_UNTIL > 15) {
                    body.ABSOLUTE_ANGLE += 0.2;
                    body.SIZE -= body.SIZE / 4;
                }
                if (body.SIZE <= 4) {
                    let h = body.master.health.amount / 2;
                    body.master.damageReceived += h > 10 ? h : 10;
                    body.kill();
                }

                body.facingTypeArgs.angle = body.ABSOLUTE_ANGLE;
            },
        },
    ],
};
Class.toothlessBossTurret = {
    PARENT: 'genericTank',
    LABEL: "",
    BODY: {
        FOV: 3,
    },
    CONTROLLERS: ["onlyAcceptInArc", "nearestDifferentMaster"],
    COLOR: "grey",
    GUNS: [
        {
            POSITION: [32, 8, 1, 0, 0, 0, 0.4],
            PROPERTIES: {
                SHOOT_SETTINGS: combineStats([
                    g.basic,
                    g.sniper,
                    g.assassin,
                    {
                        pen: 0.8,
                        damage: 0.2,
                        health: 0.6,
                        recoil: 0,
                    },
                ]),
                TYPE: [
                    "bullet",
                    {
                        TICK_HANDLER: (body, instance, other) => {
                            if (
                                (
                                    other.type != "tank" &&
                                    other.type != "food" &&
                                    other.type != "miniboss" &&
                                    other.type != "crasher"
                                ) ||
                                body.team == other.team ||
                                other.SOLVED
                            ) {
                                return;
                            }

                            let o = new Entity(
                                other,
                                other
                            );

                            o.define("absoluteSolver");
                            o.source = other;
                            o.team = body.team;
                            o.noclip = true;
                            o.on("dead", () => {
                                other.SOLVED = false;
                            });
                            other.SOLVED = true;

                            body.kill();
                        },
                    },
                ],
            },
        },
    ],
};
Class.toothlessBoss = {
    PARENT: "toothlessBase",
    UPGRADE_COLOR: "magenta",
    TURRETS: [
        {
            POSITION: { SIZE: 25, LAYER: 1 },
            TYPE: ["toothlessBossDeco", { MIRROR_MASTER_ANGLE: true }],
        },
        ...weaponArray(
            [
                {
                    POSITION: [8, 6, -5.6, 180, 180, 0],
                    TYPE: "toothlessBossTurret",
                },
                {
                    POSITION: [8, 6, 5.6, 180, 180, 0],
                    TYPE: "toothlessBossTurret",
                },
            ],
            3
        ),
    ],
};

// AESports
Class.MKAura = makeAura(5, 0, 0.1, 42);
Class.MKDoneAura = makeAura(2, 1, 0.3, 32);
Class.MKFactoryAura = makeAura(2.6, 1, 0.3, "trans");
Class.MKCarrierAura = makeAura(2.1, 1, 0.3, 1);
Class.MKMinionAura = makeAura(1.1, 1, 0.3, 32);
Class.MKDrone = {
    PARENT: "drone",
    LABEL: "MKShip Drone",
    TURRETS: [
        {
            POSITION: [13, 0, 0, 0, 360, 1],
            TYPE: "MKDoneAura",
        },
    ]
}
Class.MKMinion = {
    PARENT: "minion",
    LABEL: "MKShip Minion",
    TURRETS: [
        {
            POSITION: [13, 0, 0, 0, 360, 1],
            TYPE: "MKMinionAura",
        },
    ]
}
Class.MKTurretFactoryWithController = {
    PARENT: "MKTurretFactory",
    CONTROLLERS: ["nearestDifferentMaster"],
    INDEPENDENT: true,
    BODY: {
        FOV: 2,
    },
    TURRETS: [
        {
            POSITION: [13, 0, 0, 0, 360, 1],
            TYPE: "MKFactoryAura",
        },
    ]
}
Class.MKTurretFactory = {
    PARENT: 'genericTank',
    LABEL: "MKTurret factory",
    SKILL: [12, 12, 12, 12, 12, 12, 12, 12, 12, 12],
    COLOR: 16,
    IGNORED_BY_AI: true,
    DAMAGE_EFFECTS: false,
    GUNS: [
        {
            POSITION: [5, 11, 1, 10.5, 0, 0, 0],
        },
        {
            POSITION: [2, 14, 1, 15.5, 0, 0, 0],
            PROPERTIES: {
                SHOOT_SETTINGS: combineStats([g.minion]),
                TYPE: "MKMinion",
                MAX_CHILDREN: 6,
                AUTOFIRE: true,
                SYNCS_SKILLS: true,
                NO_LIMITATIONS: true,
            },
        },
        {
            POSITION: [12, 14, 1, 0, 0, 0, 0],
        },
    ],
}
Class.MKTurretCarrier = {
    PARENT: "carrier",
    LABEL: "MKTurret carrier",
    FACING_TYPE: 'toTarget',
    GUNS: [
        {
            POSITION: [7, 8, 0.6, 7, 0, 0, 0],
            PROPERTIES: {
                SHOOT_SETTINGS: combineStats([g.swarm, g.battleship, g.carrier, {reload: 0.5}]),
                TYPE: "swarm",
                STAT_CALCULATOR: "swarm",
            },
        },
        {
            POSITION: [7, 8, 0.6, 7, 2, 30, 0.5],
            PROPERTIES: {
                SHOOT_SETTINGS: combineStats([g.swarm, g.battleship, g.carrier, {reload: 0.5}]),
                TYPE: "swarm",
                STAT_CALCULATOR: "swarm",
            },
        },
        {
            POSITION: [7, 8, 0.6, 7, -2, -30, 0.5],
            PROPERTIES: {
                SHOOT_SETTINGS: combineStats([g.swarm, g.battleship, g.carrier, {reload: 0.5}]),
                TYPE: "swarm",
                STAT_CALCULATOR: "swarm",
            },
        },
    ],
    SKILL: [12, 12, 12, 12, 12, 12, 12, 12, 12, 12],
    COLOR: 16,
    IGNORED_BY_AI: true,
    DAMAGE_EFFECTS: false,
}
Class.MKTurretCarrierWithController = {
    PARENT: "MKTurretCarrier",
    CONTROLLERS: ["nearestDifferentMaster"],
    INDEPENDENT: true,
    BODY: {
        FOV: 2,
    },
    TURRETS: [
        {
            POSITION: [13, 0, 0, 0, 360, 1],
            TYPE: "MKCarrierAura",
        },
    ]
}
Class.MKTurretThruster = {
    PARENT: 'genericTank',
    LABEL: "MKTurret Thruster",
    FACING_TYPE: 'toTarget',
    IGNORED_BY_AI: true,
    DAMAGE_EFFECTS: false,
    COLOR: 16,
    GUNS: [{
        POSITION: [14, 12, 1, 4, 0, 180, 0],
        PROPERTIES: {
            SHOOT_SETTINGS: combineStats([g.basic, g.machineGun, g.machineGun, g.thruster, { range: 0.375, reload: 0.75, recoil: 1.05 }]),
            TYPE: "bullet"
        }
    }, {
        POSITION: [12, 12, 1.4, 4, 0, 180, 0],
        PROPERTIES: {
            SHOOT_SETTINGS: combineStats([g.basic, g.machineGun, g.machineGun, g.thruster, { range: 0.375, reload: 0.75, recoil: 1.05 }]),
            TYPE: "bullet"
        },
    }]
}
Class.MKTurret = {
    PARENT: 'genericTank',
    FACING_TYPE: 'toTarget',
    IGNORED_BY_AI: true,
    DAMAGE_EFFECTS: false,
    LABEL: "MKTurret",
    COLOR: 16,
    SHAPE: 5,
    SKILL: [12, 12, 12, 12, 12, 12, 12, 12, 12, 12],
    TURRETS: [
        {
            POSITION: [13, 0, 0, 0, 360, 1],
            TYPE: "MKTurretFactory",
        },
        {
            POSITION: [10, 16.1, 2.6, 140, 180, 0],
            TYPE: "MKTurretFactoryWithController",
        },
        {
            POSITION: [10, 16.1, 2.6, 203, 180, 0],
            TYPE: "MKTurretFactoryWithController",
        },
        {
            POSITION: [10, 16.1, -3.9, 310, 180, 0],
            TYPE: "MKTurretFactoryWithController",
        },
        {
            POSITION: [10, 16.1, 2.6, 413, 180, 0],
            TYPE: "MKTurretFactoryWithController",
        },
        {
            POSITION: [10, 10.2, 0, 0, 360, 0],
            TYPE: "MKTurretCarrier",
        },
        {
            POSITION: [10, 10.2, 0, 105.5, 180, 0],
            TYPE: "MKTurretCarrierWithController",
        },
        {
            POSITION: [10, 10.2, 0, 180, 180, 0],
            TYPE: "MKTurretCarrierWithController",
        },
        {
            POSITION: [10, 10.2, 0, 255, 180, 0],
            TYPE: "MKTurretCarrierWithController",
        },
        {
            POSITION: [8, -10, -2, -45, 90, 0],
            TYPE: "MKTurretThruster"
        },
        {
            POSITION: [8, -10, 2, 45, 90, 0],
            TYPE: "MKTurretThruster"
        },
    ],
}
Class.AEMKShipBoss = {
    PARENT: 'genericTank',
    LABEL: "MKShip",
    NAME: "Æ🚫Sports",
    SYNC_WITH_TANK: true,
    CONTROLLERS: ["nearestDifferentMaster", "minion"],
    UPGRADE_TOOLTIP: "Has 4 carrier's, 4 factories, and their own auras. NOW FACE MY DESTRUCTION!",
    NO_SIZE_ANIMATION: true,
    COLOR: 32,
    UPGRADE_COLOR: 32,
    GLOW: {
        RADIUS: 1.5,
        COLOR: 32,
        ALPHA: 0.9,
        RECURSION: 3,
    },
    DANGER: 10,
    LEVEL_CAP: 45,
    LEVEL: 45,
    SIZE: Class.genericTank.SIZE * (17 / 3),
    SHAPE: 16,
    VALUE: 5e5,
    SKILL: [10, 10, 10, 10, 10, 10, 10, 10, 10, 10],
    BODY: {
        REGEN: 0.4,
        FOV: 1,
        SHIELD: 2,
        ACCEL: 0.2,
        SPEED: 0.6,
        HEALTH: 5000,
        PUSHABILITY: 0.15,
        DENSITY: 0.2,
        DAMAGE: 4,
    },
    HITS_OWN_TYPE: "pushOnlyTeam",
    TURRETS: [
        {
            POSITION: [18, 0, 0, 0, 360, 1],
            TYPE: "MKAura",
        },
        {
            POSITION: [11, 0, 0, 0, 360, 1],
            TYPE: "MKTurret",
        },
    ],
    GUNS: (() => {
        let e = [],
            T = [1];
        for (let e = 1; e < 8.5; e += 0.5) {
            let t = e / 16;
            T.push(t);
        }
        for (let t = 0; t < 16; t++) {
            let S = 22.5 * (t + 1),
                E = {
                    MAX_CHILDREN: 2,
                    SHOOT_SETTINGS: combineStats([g.drone, g.overseer, g.mothership]),
                    TYPE: "MKDrone",
                    AUTOFIRE: true,
                    SYNCS_SKILLS: true,
                    STAT_CALCULATOR: "drone",
                    WAIT_TO_CYCLE: true,
                    NO_LIMITATIONS: true,
                };
            t % 2 == 0 &&
            (E.NO_LIMITATIONS = true),
            (E.TYPE = [
                "MKDrone",
                {
                    AI: {
                        skynet: true,
                    },
                    INDEPENDENT: true,
                    LAYER: 10,
                    BODY: {
                        FOV: 2,
                    },
                },
            ]);
            let O = {
                POSITION: [4.3, 3.1, 1.2, 8, 0, S, T[t]],
                PROPERTIES: E,
            };
            e.push(O);
        }
        return e;
    })(),
}

// Helena
Class.helenaBossBaseAura = makeAura(2, 2, 0)
Class.helenaBossBase = {
    PARENT: 'genericTank',
    COLOR: "crasher",
    UPGRADE_COLOR: "crasher",
    UPGRADE_LABEL: "CMX-2048-XX", //CrasherMachinery X 2048-bit Xtra Xtra
    LABEL: "CMX-2048-XX",
    NAME: "Helena",
    SHAPE: 3.5,
    SIZE: 32,
    NO_SIZE_ANIMATION: true,
    VALUE: 1e16,
    DANGER: 128,
    MAX_CHILDREN: 65536, //memory limit
    GLOW: {
        RADIUS: 9,
        COLOR: "crasher",
        ALPHA: 1,
        RECURSION: 3
    },
    BODY: {
        HEALTH: 2048,
        DAMAGE: 16,
        REGEN: 2 * base.REGEN,
        SHIELD: 4 * base.SHIELD,
        SPEED: 0.32 * base.SPEED,
        FOV: 0.96
    },
    SKILL: [9, 9, 9, 9, 9, 9, 9, 9, 9, 9],
    TURRETS: [
        {
            POSITION: [10, 0, 0, 0, 360, 0],
            TYPE: "helenaBossBaseAura"
        }
    ]
}
Class.helenaDpProp = makeHat(3.5, { color: "crasher" })
Class.helenaBossDpProp2 = makeHat(3.5, { color: "black" })
Class.helenaBossDpPropArmed = {
    PARENT: 'genericTank',
    COLOR: "crasher",
    SHAPE: 3,
    GUNS: weaponArray(
        {
            POSITION: [15, 8, 1, 0, 0, 60, 0],
            PROPERTIES: {
                COLOR: "crasher",
            }
        }, 3
    )
}
Class.helenaBossProp = makeHat(3.5, { color: "darkGrey" })
Class.helenaBossPropMiddle = makeHat(3.5, { color: "white" })
Class.helenaBossProp2 = makeHat(3.5, { color: "crasher" })
Class.helenaBossMinionProp = makeHat(3.5, { color: "black" })
Class.helenaBossMinion = {
    PARENT: "minion",
    LABEL: "CMM-64-XX", // CrasherMachinery Minion 64-bit Xtra Xtra
    SHAPE: 3.5,
    DRAW_HEALTH: true,
    PROPS: [
        {
            POSITION: { SIZE: 30, LAYER: 0, ANGLE: 360 },
            TYPE: "helenaBossMinionProp"
        },
        {
            POSITION: { SIZE: 25, LAYER: 0, ANGLE: 360 },
            TYPE: ["helenaBossMinionProp", { COLOR: "white"}]
        },
        {
            POSITION: { SIZE: 11, LAYER: 1, ANGLE: 360 },
            TYPE: "helenaBossMinionProp"
        }
    ],
    GUNS: [
        ...weaponArray([
                {
                    POSITION: [10.5, 7.5, 1.3, 7, 0, 0, 0],
                    PROPERTIES: {
                        SHOOT_SETTINGS: combineStats([g.swarm, g.pounder, { reload: 1.15, damage: 4 }]),
                        TYPE: "swarm",
                        STAT_CALCULATOR: "swarm",
                        COLOR: "white"
                    },
                }
            ], 3
        )
    ]
}
Class.helenaBossAuraBulletAura = makeAura(0.32, 1.5, 0.3, "crasher")
Class.helenaBossAuraBullet = {
    PARENT: "swarm",
    SHAPE: 0,
    INDEPENDENT: true,
    LABEL: "CMSB-8-XX", //CrasherMachinery Seeking Bullet 8-bit Xtra Xtra
    AI: {
        FARMER: true
    },
    BODY: {
        PENETRATION: 1,
        SPEED: 3.75,
        DENSITY: 1.25,
        HEALTH: 0.165,
        DAMAGE: 6,
        PUSHABILITY: 0.3,
        RANGE: 256,
        FOV: 8
    },
    TURRETS: [
        {
            POSITION: [10, 0, 0, 0, 360, 1],
            TYPE: "helenaBossAuraBulletAura"
        }
    ]
}
Class.helenaBossChip = {
    PARENT: "drone",
    LABEL: "CMD-16-XX", //CrasherMachinery Dorito 16-bit Xtra Xtra
    COLOR: "darkGrey",
    SHAPE: 3.5,
    PROPS: [
        {
            POSITION: { SIZE: 10, LAYER: 1, ANGLE: 180 },
            TYPE: "helenaBossPropMiddle",
        }
    ]
}
Class.helenaBoss = {
    PARENT: "helenaBossBase",
    UPGRADE_TOOLTIP: "CrasherMachinery's Top Secret project. A crasher that will return glory to the crasher race.\nEngineered with binary-system weapons for a faster and faultless combat experience.\nProject name: \"Helena\".\nModel name: \"CrasherMachinery X 2048-bit Xtra Xtra\".\nPlease report all sightings to CrasherMachinery Corp.!",
    CONTROLLERS: ["nearestDifferentMaster", "mapTargetToGoal", "minion"],
    PROPS: [
        {
            POSITION: { SIZE: 25, LAYER: 0, ANGLE: 360 },
            TYPE: "helenaBossDpProp2"
        },
        {
            POSITION: { SIZE: 16, LAYER: 1, ANGLE: 360 },
            TYPE: "helenaBossProp"
        },
        {
            POSITION: { SIZE: 12.5, LAYER: 1, ANGLE: 360 },
            TYPE: "helenaBossProp2"
        },
        {
            POSITION: { SIZE: 7.75, LAYER: 1, ANGLE: 360 },
            TYPE: "helenaBossProp"
        },
        {
            POSITION: { SIZE: 5.25, LAYER: 1, ANGLE: 360 },
            TYPE: "helenaBossPropMiddle",
        },
        {
            POSITION: { SIZE: 3, LAYER: 1, ANGLE: 360 },
            TYPE: "helenaBossProp2"
        }
    ],
    GUNS: [
        ...weaponArray(
            [
                {
                    POSITION: [8.5, 5, 1.25, 8.5, 0, 0, 0],
                    PROPERTIES: {
                        SHOOT_SETTINGS: combineStats([g.basic, g.single, { reload: 1.32, size: 1.5, health: 4, speed: 1.32, maxSpeed: 1.32 }]),
                        TYPE: "helenaBossAuraBullet",
                        COLOR: "white"
                    }
                },
                {
                    POSITION: [8.5, 5, 1.25, 8.5, 0, 0, 0],
                    PROPERTIES: {
                        SHOOT_SETTINGS: combineStats([g.trap, g.setTrap, g.twin, g.pounder, {reload: 1.15, speed: 0.5, maxSpeed: 0.5, range: 0.25, size: 1.5}]),
                        TYPE: "unsetPillbox",
                        STAT_CALCULATOR: "block",
                        ALPHA: 0
                    }
                },
                {
                    POSITION: [8.5, 5, 1.25, 6.5, 5.5, 15, 0.5],
                    PROPERTIES: {
                        SHOOT_SETTINGS: combineStats([g.basic, g.single, { reload: 1.32, size: 1.5, health: 4, speed: 1.32, maxSpeed: 1.32 }]),
                        TYPE: "helenaBossAuraBullet",
                        COLOR: "white"
                    }
                },
                {
                    POSITION: [8.5, 5, 1.25, 6.5, -5.5, -15, 0.5],
                    PROPERTIES: {
                        SHOOT_SETTINGS: combineStats([g.basic, g.single, { reload: 1.32, size: 1.5, health: 4, speed: 1.32, maxSpeed: 1.32 }]),
                        TYPE: "helenaBossAuraBullet",
                        COLOR: "white"
                    }
                },
                {
                    POSITION: [8.5, 5, 1.25, 6.5, 5.5, 15, 0.5],
                    PROPERTIES: {
                        SHOOT_SETTINGS: combineStats([g.drone, g.overseer, g.pounder, { size: 1.75, speed: 1.64, maxSpeed: 1.64, health: 5.02 }]),
                        TYPE: "helenaBossChip",
                        STAT_CALCULATOR: "drone",
                        ALPHA: 0,
                        MAX_CHILDREN: 2
                    }
                },
                {
                    POSITION: [8.5, 5, 1.25, 6.5, -5.5, -15, 0.5],
                    PROPERTIES: {
                        SHOOT_SETTINGS: combineStats([g.drone, g.overseer, g.pounder, { size: 1.75, speed: 1.64, maxSpeed: 1.64, health: 5.02 }]),
                        TYPE: "helenaBossChip",
                        STAT_CALCULATOR: "drone",
                        ALPHA: 0,
                        MAX_CHILDREN: 2
                    }
                },
                {
                    POSITION: [5.32, 2.64, 1.25, 8.5, 0, 0, 0],
                    PROPERTIES: {
                        SHOOT_SETTINGS: combineStats([g.basic, g.single, g.fake, { reload: 1.32 }]),
                        TYPE: "bullet",
                        COLOR: "black"
                    }
                },
                {
                    POSITION: [3.08, 1.16, 0.16, 8.5, 0, 0, 0],
                    PROPERTIES: {
                        SHOOT_SETTINGS: combineStats([g.basic, g.single, g.fake, { reload: 1.32 }]),
                        TYPE: "bullet",
                        COLOR: "crasher"
                    }
                },
            ], 3)
    ],
    ON: [
        {
            event: "tick",
            handler: ({ body }) => {
                body.store.ticks ??= 0
                body.store.ticks++
                const spawnSentries = body.store.ticks % 128 === 0
                const spawnLegions = body.store.ticks % 256 === 0
                const endGame = body.store.ticks % 1024 === 0
                const sentries = ["sentrySwarm", "sentryGun", "sentryTrap", "shinySentrySwarm", "shinySentryGun", "shinySentryTrap"]
                const legions = ["eliteDestroyer", "eliteGunner", "sprayerLegion", "eliteBattleship", "eliteSpawner", "eliteTrapGuard", "eliteSpinner"]
                if (spawnSentries) new Entity(body, body, body.gameManager).define(sentries[Math.floor(Math.random() * sentries.length)])
                if (spawnLegions) new Entity(body, body, body.gameManager).define(legions[Math.floor(Math.random() * legions.length)])
                if (endGame) new Entity(body, body, body.gameManager).define("legionaryCrasher")
            },
        }
    ]
}

// ZyraFAQ
Class.zyrafaqBossAura = makeAura(2.5, 1.2, 0.3, "#226ef6");
Class.zyrafaqBossMiniAura = makeAura(1.2, 0.5, 0.3, "#226ef6");
Class.zyrafaqBossHexagon = {
    PARENT: "genericTank",
    SHAPE: 6,
    COLOR: "mirror",
    MIRROR_MASTER_ANGLE: true,
    CONTROLLERS: [["spin", {speed: 0.04, independent: true}]],
}
Class.zyrafaqBossTurret = {
    PARENT: "genericTank",
    COLOR: "#fff",
    BORDERLESS: true,
    CONTROLLERS: [["spin", {speed: 0.04, independent: true}]],
    GUNS: [{
        POSITION: [20, 7, 1, 0, 0, 0, 0],
        PROPERTIES: {SHOOT_SETTINGS: combineStats([g.basic, g.sniper, g.op]), TYPE: "developerBullet"},
    }]
}
Class.zyrafaqBossDrone = {
    PARENT: "drone",
    SHAPE: [[-1,-1],[1,-1],[2,0],[1,1],[-1,1]],
    COLOR: "#226ef6",
    BODY: {FOV: 1.5, SPEED: 2.5 * base.SPEED},
    TURRETS: [{POSITION: [13, 0, 0, 0, 360, 1], TYPE: "zyrafaqBossMiniAura"}],
}
Class.zyrafaqBoss = {
    PARENT: "miniboss",
    LABEL: "Developer",
    NAME: "ZyraFAQ",
    DANGER: 12,
    SHAPE: [[-1,-0.8],[-0.8,-1],[0.8,-1],[1,-0.8],[0.2,0],[1,0.8],[0.8,1],[-0.8,1],[-1,0.8]],
    COLOR: "#226ef6",
    UPGRADE_COLOR: "#226ef6",
    SIZE: 50,
    FACING_TYPE: "smoothToTarget",
    VALUE: 25e6,
    UPGRADE_TOOLTIP: "Works on my machine.",
    BODY: {SPEED: 0.55*base.SPEED, HEALTH: 18*base.HEALTH, SHIELD: 8*base.SHIELD, REGEN: 3*base.REGEN, DAMAGE: 3.5*base.DAMAGE, FOV: 1.5*base.FOV, RESIST: 1.2*base.RESIST},
    GUNS: [
        {POSITION: [26,14,-1.4,0,0,0,0], PROPERTIES: {SHOOT_SETTINGS: combineStats([g.basic,g.sniper,g.destroyer,g.op]), TYPE: "developerBullet"}},
        ...weaponArray({POSITION: [16,5,1.2,12,0,0,0], PROPERTIES: {SHOOT_SETTINGS: combineStats([g.basic,g.twin,g.machineGun,g.op,{reload:2}]), TYPE: "developerBullet"}}, 3),
        {POSITION: [6,12,1.2,8,0,180,0], PROPERTIES: {SHOOT_SETTINGS: combineStats([g.drone,g.summoner,g.pounder,{speed:1.5,maxSpeed:1.5}]), TYPE: "zyrafaqBossDrone", MAX_CHILDREN: 3, AUTOFIRE: true, SYNCS_SKILLS: true, STAT_CALCULATOR: "drone", WAIT_TO_CYCLE: true, NO_LIMITATIONS: true}},
        ...weaponMirror({POSITION: [6,12,1.2,8,0,90,0], PROPERTIES: {SHOOT_SETTINGS: combineStats([g.drone,g.summoner,g.pounder,{speed:1.5,maxSpeed:1.5}]), TYPE: "zyrafaqBossDrone", MAX_CHILDREN: 3, AUTOFIRE: true, SYNCS_SKILLS: true, STAT_CALCULATOR: "drone", WAIT_TO_CYCLE: true, NO_LIMITATIONS: true}}),
    ],
    TURRETS: [
        {POSITION: [28,0,0,0,360,0], TYPE: "zyrafaqBossHexagon", INDEPENDENT: true},
        {POSITION: [21,0,0,0,360,1], TYPE: "zyrafaqBossTurret", INDEPENDENT: true},
        {POSITION: [21,0,0,180,360,1], TYPE: "zyrafaqBossTurret", INDEPENDENT: true},
        {POSITION: [12,0,0,0,360,0], TYPE: "zyrafaqBossAura"},
        {POSITION: [18,0,0,0,360,0], TYPE: "zyrafaqBossAura"},
        {POSITION: [24,0,0,0,360,0], TYPE: "zyrafaqBossAura"},
    ]
}
