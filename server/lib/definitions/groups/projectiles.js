const { combineStats, makeAuto, weaponArray, weaponMirror } = require('../facilitators.js');
const g = require('../gunvals.js');

// Bullets
Class.casing = {
    PARENT: "bullet",
    LABEL: "Shell",
    TYPE: "swarm"
}
Class.developerBullet = {PARENT: "bullet", SHAPE: [[-1, -1], [1, -1], [2, 0], [1, 1], [-1, 1]]}
Class.flare = {
    PARENT: "growBullet",
    LABEL: "Flare",
    SHAPE: 4
}
Class.growBullet = {
    PARENT: "bullet",
    MOTION_TYPE: ['grow', {speed: 0.75}]
}
Class.masterBullet = {
    PARENT: "missile",
    FACING_TYPE: ["spin", {speed: 2}],
    MOTION_TYPE: "motor",
    HAS_NO_RECOIL: false,
    DIE_AT_RANGE: false,
    GUNS: [
        {
            POSITION: [18, 8, 1, 0, 0, 0, 0],
            PROPERTIES: {
                SHOOT_SETTINGS: combineStats([g.basic, g.flankGuard, g.triAngle, g.triAngleFront]),
                TYPE: "bullet",
                LABEL: "Front",
                AUTOFIRE: true,
            },
        },
        {
            POSITION: [13, 8, 1, 0, -1, 140, 0.6],
            PROPERTIES: {
                SHOOT_SETTINGS: combineStats([g.basic, g.flankGuard, g.triAngle, g.thruster]),
                TYPE: "bullet",
                LABEL: "Thruster",
                AUTOFIRE: true,
            },
        },
        {
            POSITION: [13, 8, 1, 0, 1, 220, 0.6],
            PROPERTIES: {
                SHOOT_SETTINGS: combineStats([g.basic, g.flankGuard, g.triAngle, g.thruster]),
                TYPE: "bullet",
                LABEL: "Thruster",
                AUTOFIRE: true,
            },
        },
        {
            POSITION: [16, 8, 1, 0, 0, 150, 0.1],
            PROPERTIES: {
                SHOOT_SETTINGS: combineStats([g.basic, g.flankGuard, g.triAngle, g.thruster]),
                TYPE: "bullet",
                LABEL: "Thruster",
                AUTOFIRE: true,
            },
        },
        {
            POSITION: [16, 8, 1, 0, 0, 210, 0.1],
            PROPERTIES: {
                SHOOT_SETTINGS: combineStats([g.basic, g.flankGuard, g.triAngle, g.thruster]),
                TYPE: "bullet",
                LABEL: "Thruster",
                AUTOFIRE: true,
            },
        },
    ],
}
Class.satelliteBullet = {
    PARENT: "bullet",
    ANGLE: 60,
    CONTROLLERS: [["whirlwind", {useOwnMaster: true}]],
    HAS_NO_RECOIL: true,
    AI: {
        SPEED: 2, 
    },
    GUNS: (() => { 
        let output = []
        for (let i = 0; i < 3; i++) {
            output.push({
                POSITION: {WIDTH: 16, LENGTH: 1, DELAY: 0},
                PROPERTIES: {
                    SHOOT_SETTINGS: combineStats([g.satellite, {reload: 0}]), 
                    TYPE: ["satellite", {ANGLE: i * 120, INDEPENDENT: true}], 
                    MAX_CHILDREN: 1,   
                    AUTOFIRE: true,  
                    SYNCS_SKILLS: false,
                    WAIT_TO_CYCLE: true
                }
            })
        }
        return output
    })()
}
Class.speedBullet = {
    PARENT: "bullet",
    MOTION_TYPE: ['glide', {damp: -0.0125}]
}
Class.spiralBulletSegment = {
    PARENT: 'bullet',
    CLEAR_ON_MASTER_UPGRADE: true
}
Class.spiralBullet = {
    PARENT: 'bullet',
    ON: [
        {
            event: 'tick',
            handler: ({body}) => {
                const numOfSegments = 2;
                const segmentClass = 'spiralBulletSegment';

                body.store.snakeSegments ??= [];

                for (let i = body.store.snakeSegments.length; i < numOfSegments; i++) {
                    let seg = new Entity(body, body);
                    //seg.health = body.health;
                    //seg.shield = body.shield;
                    seg.master = body;
                    seg.source = body;
                    seg.color = body.color;
                    seg.SIZE = body.SIZE;
                    seg.define(segmentClass);
                    body.store.snakeSegments.push(seg);
                }
                body.store.snakeSegments = body.store.snakeSegments.filter((x)=>!x.isDead())
                let previous = body;
                const children = body.store.snakeSegments;
            
                for (const child of children) {
                    const dx = child.x - previous.x;
                    const dy = child.y - previous.y;
                    const distance = Math.hypot(dx, dy) || 1; // /0 possible ig
                    const factor = (child.size + previous.size) * 1 / distance;
        
                    child.x = previous.x + dx * factor;
                    child.y = previous.y + dy * factor;
                    child.velocity.x = 0; // No natural move!
                    child.velocity.y = 0; // No natural move!
                    child.life();
                    previous = child;
                }
            }
        }
    ]
}
Class.pythonBullet = {
    PARENT: 'bullet',
    ON: [
        {
            event: 'tick',
            handler: ({body}) => {
                const numOfSegments = 4;
                const segmentClass = 'spiralBulletSegment';

                body.store.snakeSegments ??= [];

                for (let i = body.store.snakeSegments.length; i < numOfSegments; i++) {
                    let seg = new Entity(body, body);
                    //seg.health = body.health;
                    //seg.shield = body.shield;
                    seg.master = body;
                    seg.source = body;
                    seg.SIZE = body.SIZE;
                    seg.define(segmentClass);
                    body.store.snakeSegments.push(seg);
                }
                body.store.snakeSegments = body.store.snakeSegments.filter((x)=>!x.isDead())
                let previous = body;
                const children = body.store.snakeSegments;
            
                for (const child of children) {
                    const dx = child.x - previous.x;
                    const dy = child.y - previous.y;
                    const distance = Math.hypot(dx, dy) || 1; // /0 possible ig
                    const factor = (child.size + previous.size) * 1 / distance;
        
                    child.x = previous.x + dx * factor;
                    child.y = previous.y + dy * factor;
                    child.velocity.x = 0; // No natural move!
                    child.velocity.y = 0; // No natural move!
                    child.life();
                    previous = child;
                }
            }
        }
    ]
}
Class.undertowBullet = {
    PARENT: 'bullet',
    ON: [
        {
        event: "tick",
        handler: ({ body }) => {
            for (let instance of entities.values()) {
                let diffX = instance.x - body.x,
                    diffY = instance.y - body.y,
                    dist2 = diffX ** 2 + diffY ** 2;
                if (dist2 <= ((body.size / 12)*250) ** 1.9) {
                    if ((instance.team != body.team || (instance.type == "undertowEffect" && instance.master.id == body.master.id)) && instance.type != "wall" && instance.isTurret != true) {
                    if (instance.type == "undertowEffect") {
                        forceMulti = 1
                    }
                    else if (instance.type == "food") {
                        forceMulti = (6 / instance.size)
                    }      
                    else {
                        forceMulti = (2 / instance.size)
                    }
                    instance.velocity.x += util.clamp(body.x - instance.x, -90, 90) * instance.damp * forceMulti;//0.05
                    instance.velocity.y += util.clamp(body.y - instance.y, -90, 90) * instance.damp * forceMulti;//0.05
                        if (instance.type != "undertowEffect" && instance.type != "bullet" && instance.type != "swarm" && instance.type != "drone" && instance.type != "trap" && instance.type != "dominator") {
                                let o = new Entity({x: instance.x, y: instance.y})
                                o.define('undertowEffect')
                                o.team = body.team;
                                o.color = instance.color;
                                o.alpha = 0.3;
                                o.master = body.master;
                        }
                    }
                }
                if (dist2 < body.size ** 3 + instance.size ** 3) {
                    if (instance.master.id == body.master.id) {
                            if (instance.type == "undertowEffect")
                            {
                                instance.kill();
                            }
                        }
                    }
                }
            }
        }
    ],
}
Class.undertowEffect = {
    PARENT: 'genericTank',
    TYPE: "undertowEffect",
    SIZE: 5,
    COLOR: 1,
    HITS_OWN_TYPE: "never",
    GIVE_KILL_MESSAGE: false,
    ACCEPTS_SCORE: false,
    DRAW_HEALTH: false,
    DIE_AT_RANGE: true,
    BODY: {
        HEALTH: 9e99,
        DAMAGE: 0,
        RANGE: 5,
        PUSHABILITY: 0
    }
}
Class.assemblerEffect = {
    PARENT: 'bullet',
    MOTION_TYPE: 'assembler',
    LABEL: '',
    BODY: {
        DAMAGE: 0,
        RANGE: 10
    },
    ALPHA: 0.8
}
Class.cxATMGBullet = {
    PARENT: "bullet",
    SHAPE: Class.cube.SHAPE
}

// Missiles
Class.missile = {
    PARENT: "bullet",
    LABEL: "Missile",
    INDEPENDENT: true,
    BODY: { RANGE: 120 },
    GUNS: [
        {
            POSITION: [14, 6, 1, 0, -2, 130, 0],
            PROPERTIES: {
                AUTOFIRE: true,
                SHOOT_SETTINGS: combineStats([g.basic, g.lowPower, {speed: 1.3, maxSpeed: 1.3}]),
                TYPE: [ "bullet", { PERSISTS_AFTER_DEATH: true } ],
                STAT_CALCULATOR: "thruster",
                WAIT_TO_CYCLE: true,
            }
        },
        {
            POSITION: [14, 6, 1, 0, 2, 230, 0],
            PROPERTIES: {
                AUTOFIRE: true,
                SHOOT_SETTINGS: combineStats([g.basic, g.lowPower, {speed: 1.3, maxSpeed: 1.3}]),
                TYPE: [ "bullet", { PERSISTS_AFTER_DEATH: true } ],
                STAT_CALCULATOR: "thruster",
                WAIT_TO_CYCLE: true,
            }
        }
    ]
}
Class.hypermissile = {
    PARENT: "missile",
    GUNS: [
        {
            POSITION: [14, 6, 1, 0, -2, 150, 0],
            PROPERTIES: {
                AUTOFIRE: true,
                SHOOT_SETTINGS: combineStats([g.basic, {reload: 3}]),
                TYPE: [ "bullet", { PERSISTS_AFTER_DEATH: true } ],
                STAT_CALCULATOR: "thruster",
            },
        },
        {
            POSITION: [14, 6, 1, 0, 2, 210, 0],
            PROPERTIES: {
                AUTOFIRE: true,
                SHOOT_SETTINGS: combineStats([g.basic, {reload: 3}]),
                TYPE: [ "bullet", { PERSISTS_AFTER_DEATH: true } ],
                STAT_CALCULATOR: "thruster",
            },
        },
        {
            POSITION: [14, 6, 1, 0, -2, 90, 0.5],
            PROPERTIES: {
                AUTOFIRE: true,
                SHOOT_SETTINGS: combineStats([g.basic, {reload: 3}]),
                TYPE: [ "bullet", { PERSISTS_AFTER_DEATH: true } ],
            },
        },
        {
            POSITION: [14, 6, 1, 0, 2, 270, 0.5],
            PROPERTIES: {
                AUTOFIRE: true,
                AUTOFIRE: true,
                SHOOT_SETTINGS: combineStats([g.basic, {reload: 3}]),
                TYPE: [ "bullet", { PERSISTS_AFTER_DEATH: true } ],
            },
        },
    ],
}
Class.launcherMissile = {
    PARENT: "missile",
    GUNS: [
        {
            POSITION: [14, 6, 1, 0, 0, 180, 0],
            PROPERTIES: {
                AUTOFIRE: true,
                SHOOT_SETTINGS: combineStats([g.basic, { recoil: 0.5 }, g.lowPower]),
                TYPE: ["bullet", { PERSISTS_AFTER_DEATH: true }],
                STAT_CALCULATOR: "thruster",
            },
        },
    ],
}
Class.spinmissile = {
    PARENT: "missile",
    FACING_TYPE: ["spin", {speed: 0.2}],
    GUNS: weaponArray({
        POSITION: [14, 8, 1, 0, 0, 0, 0.5],
        PROPERTIES: {
            AUTOFIRE: true,
            SHOOT_SETTINGS: combineStats([g.basic, g.lowPower, {reload: 0.6, size: 1.1, shudder: 0.3}]),
            TYPE: ["bullet", { PERSISTS_AFTER_DEATH: true }],
            STAT_CALCULATOR: "thruster",
            WAIT_TO_CYCLE: true,
        },
    }, 2),
}
Class.hyperspinmissile = {
    PARENT: "spinmissile",
    GUNS: weaponArray({
        POSITION: [14, 8, 1, 0, 0, 0, 0],
        PROPERTIES: {
            AUTOFIRE: true,
            SHOOT_SETTINGS: combineStats([g.basic, g.lowPower, {size: 1.1}]),
            TYPE: ["bullet", { PERSISTS_AFTER_DEATH: true }],
            STAT_CALCULATOR: "thruster",
        },
    }, 4),
}
Class.hive = {
    PARENT: "bullet",
    LABEL: "Hive",
    BODY: {
        RANGE: 90,
        FOV: 0.5,
    },
    FACING_TYPE: "turnWithSpeed",
    INDEPENDENT: true,
    CONTROLLERS: ["nearestDifferentMaster", "targetSelf"],
    AI: {
        NO_LEAD: true,
    },
    GUNS: weaponArray({
        POSITION: [7, 9.5, 0.6, 7, 0, 108, 0],
        PROPERTIES: {
            SHOOT_SETTINGS: combineStats([g.swarm, g.hive, g.bee]),
            TYPE: ["bee", { PERSISTS_AFTER_DEATH: true }],
            STAT_CALCULATOR: "swarm",
            AUTOFIRE: true
        },
    }, 5, {delayIncrement: 0.2})
}
Class.protoHive = {
    PARENT: "bullet",
    LABEL: "Proto-Hive",
    BODY: {
        RANGE: 90,
        FOV: 0.5,
    },
    FACING_TYPE: "turnWithSpeed",
    INDEPENDENT: true,
    CONTROLLERS: ["nearestDifferentMaster", "targetSelf"],
    AI: { NO_LEAD: true },
    GUNS: weaponArray({
        POSITION: [7, 9.5, 0.6, 7, 0, 0, 0],
        PROPERTIES: {
            SHOOT_SETTINGS: combineStats([g.swarm, g.hive, g.bee]),
            TYPE: ["bee", { PERSISTS_AFTER_DEATH: true }],
            STAT_CALCULATOR: "swarm",
            AUTOFIRE: true
        },
    }, 3, {delayIncrement: 1/3})
}
Class.hyperHive = {
    PARENT: "bullet",
    LABEL: "Hyper-Hive",
    BODY: {
        RANGE: 90,
        FOV: 0.5,
    },
    FACING_TYPE: "turnWithSpeed",
    INDEPENDENT: true,
    CONTROLLERS: ["nearestDifferentMaster", "targetSelf"],
    AI: { NO_LEAD: true },
    GUNS: weaponArray({
        POSITION: [7, 8, 0.6, 7, 0, 0, 0],
        PROPERTIES: {
            SHOOT_SETTINGS: combineStats([g.swarm, g.hive, g.bee]),
            TYPE: ["bee", { PERSISTS_AFTER_DEATH: true }],
            STAT_CALCULATOR: "swarm",
            AUTOFIRE: true
        },
    }, 7, {delayIncrement: 1/7})
}
Class.snake = {
    PARENT: "missile",
    LABEL: "Snake",
    GUNS: [
        {
            POSITION: [6, 12, 1.4, 8, 0, 180, 0],
            PROPERTIES: {
                AUTOFIRE: true,
                STAT_CALCULATOR: "thruster",
                SHOOT_SETTINGS: combineStats([g.basic, g.sniper, g.hunter, g.hunterSecondary, g.snake, g.snakeskin]),
                TYPE: ["bullet", { PERSISTS_AFTER_DEATH: true }],
            },
        },
        {
            POSITION: [10, 12, 0.8, 8, 0, 180, 0.5],
            PROPERTIES: {
                AUTOFIRE: true,
                NEGATIVE_RECOIL: true,
                STAT_CALCULATOR: "thruster",
                SHOOT_SETTINGS: combineStats([g.basic, g.sniper, g.hunter, g.hunterSecondary, g.snake]),
                TYPE: ["bullet", { PERSISTS_AFTER_DEATH: true }],
            },
        },
    ],
}
Class.rocketeerMissile = {
    PARENT: "missile",
    GUNS: [
        {
            POSITION: [16.5, 10, 1.5, 0, 0, 180, 3],
            PROPERTIES: {
                AUTOFIRE: true,
                SHOOT_SETTINGS: combineStats([g.basic, g.missileTrail, g.rocketeerMissileTrail]),
                TYPE: ["bullet", { PERSISTS_AFTER_DEATH: true }],
                STAT_CALCULATOR: "thruster",
            },
        },
    ],
}
Class.sentinelMissile = {
    PARENT: "bullet",
    LABEL: "Missile",
    INDEPENDENT: true,
    BODY: {
        RANGE: 120,
        DENSITY: 3,
    },
    GUNS: [
        {
            POSITION: [12, 10, 0, 0, 0, 180, 0],
            PROPERTIES: {
                AUTOFIRE: true,
                SHOOT_SETTINGS: combineStats([g.basic, g.pounder, g.destroyer]),
                TYPE: ["bullet", { PERSISTS_AFTER_DEATH: true }],
                STAT_CALCULATOR: "thruster",
            },
        }, {
            POSITION: [14, 6, 1, 0, -2, 130, 0],
            PROPERTIES: {
                AUTOFIRE: true,
                SHOOT_SETTINGS: combineStats([g.basic, g.skimmer]),
                TYPE: ["bullet", { PERSISTS_AFTER_DEATH: true }],
                STAT_CALCULATOR: "thruster",
            },
        }, {
            POSITION: [14, 6, 1, 0, 2, 230, 0],
            PROPERTIES: {
                AUTOFIRE: true,
                SHOOT_SETTINGS: combineStats([g.basic, g.skimmer]),
                TYPE: ["bullet", { PERSISTS_AFTER_DEATH: true }],
                STAT_CALCULATOR: "thruster",
            },
        },
    ],
}
Class.kronosMissile = {
    PARENT: "missile",
    GUNS: [
        {
            POSITION: [4, 6, 1.6, 13, 0, 90, 0.5],
            PROPERTIES: {
                AUTOFIRE: true,
                SHOOT_SETTINGS: combineStats([g.trap, g.lowPower, {reload: 2, speed: 1.3, maxSpeed: 1.3, range: 0.5}]),
                TYPE: [ "trap", { PERSISTS_AFTER_DEATH: true } ],
                STAT_CALCULATOR: "trap",
            },
        }, {
            POSITION: [4, 6, 1.6, 13, 0, -90, 0.5],
            PROPERTIES: {
                AUTOFIRE: true,
                SHOOT_SETTINGS: combineStats([g.trap, g.lowPower, {reload: 2, speed: 1.3, maxSpeed: 1.3, range: 0.5}]),
                TYPE: [ "trap", { PERSISTS_AFTER_DEATH: true } ],
                STAT_CALCULATOR: "trap",
            },
        }, {
            POSITION: [14, 6, 1, 0, -2, 150, 0],
            PROPERTIES: {
                AUTOFIRE: true,
                SHOOT_SETTINGS: combineStats([g.basic, g.lowPower, {speed: 1.3, maxSpeed: 1.3}]),
                TYPE: [ "bullet", { PERSISTS_AFTER_DEATH: true } ],
                STAT_CALCULATOR: "thruster",
            },
        }, {
            POSITION: [14, 6, 1, 0, 2, 210, 0],
            PROPERTIES: {
                AUTOFIRE: true,
                SHOOT_SETTINGS: combineStats([g.basic, g.lowPower, {speed: 1.3, maxSpeed: 1.3}]),
                TYPE: [ "bullet", { PERSISTS_AFTER_DEATH: true } ],
                STAT_CALCULATOR: "thruster",
            },
        }, {
            POSITION: [13, 6, 1, 0, 0, 90, 0],
        }, {
            POSITION: [13, 6, 1, 0, 0, -90, 0],
        },
    ],
}
Class.autoSmasherMissile = {
    PARENT: "missile",
    HITS_OWN_TYPE: "never",
    GUNS: [],
    TURRETS: [
        {
            POSITION: [21.5, 0, 0, 0, 360, 0],
            TYPE: ["hexagonHat_spin", { COLOR: "black" }],
        }, {
            POSITION: [12, 0, 0, 0, 360, 1],
            TYPE: "autoSmasherMissileTurret",
        },
    ],
}

// Healer Projectiles
Class.healerBullet = {
    PARENT: "bullet",
    HITS_OWN_TYPE: "push",
    BODY: {
        PENETRATION: Class.bullet.BODY.PENETRATION,
        SPEED: Class.bullet.BODY.SPEED,
        RANGE: Class.bullet.BODY.RANGE,
        DENSITY: Class.bullet.BODY.DENSITY,
        HEALTH: Class.bullet.BODY.HEALTH,
        DAMAGE: Class.bullet.BODY.DAMAGE + 20,
        PUSHABILITY: Class.bullet.BODY.PENETRATION,
    },
    HEALER: true
}
Class.healerSatellite = {
    PARENT: "satellite",
    HITS_OWN_TYPE: "push",
    BODY: {
        PENETRATION: Class.satellite.BODY.PENETRATION,
        SPEED: Class.satellite.BODY.SPEED,
        RANGE: Class.satellite.BODY.RANGE,
        DENSITY: Class.satellite.BODY.DENSITY,
        HEALTH: Class.satellite.BODY.HEALTH,
        DAMAGE: Class.satellite.BODY.DAMAGE + 20,
        PUSHABILITY: Class.satellite.BODY.PENETRATION,
    },
    HEALER: true,
    TURRETS: [
        {
            POSITION: {
                SIZE: 13,
                LAYER: 1
            },
            TYPE: "healerHat"
        }
    ]
}
Class.healerSanctuaryBullet = {
    PARENT: "healerBullet",
    HITS_OWN_TYPE: "never"
}

// Drones
Class.bigBall = {PARENT: "drone", SHAPE: 8}
Class.sunchip = {
    PARENT: "drone",
    SHAPE: 4,
    NECRO: [4],
    HITS_OWN_TYPE: "hardWithBuffer",
    BODY: {
        FOV: 0.5,
    },
    AI: {
        BLIND: true,
        FARMER: true,
    },
    DRAW_HEALTH: false,
}
Class.eggchip = {PARENT: "sunchip", NECRO: [0], SHAPE: 0}

// Mystical Drones
Class.summonerDrone = {PARENT: "sunchip", NECRO: false}
Class.sorcererDrone = {...Class.summonerDrone, SHAPE: 0}
Class.enchantressDrone = {...Class.summonerDrone, SHAPE: 3}
Class.exorcistorDrone = {...Class.summonerDrone, SHAPE: 5}
Class.shamanDrone = {...Class.summonerDrone, SHAPE: 6}
Class.sangomaDrone = {...Class.summonerDrone, SHAPE: 7}
Class.preacherDrone = {...Class.summonerDrone, SHAPE: 8}
Class.herbalistDrone = {...Class.summonerDrone, SHAPE: 9}

// Minions
Class.genericMinion = {
    PARENT: 'genericTank',
    LABEL: "Minion",
    TYPE: "minion",
    HITS_OWN_TYPE: "hardWithBuffer",
    FACING_TYPE: "smoothToTarget",
    BODY: {
        FOV: 0.5,
        SPEED: 1.8,
        ACCELERATION: 1,
        HEALTH: 5,
        SHIELD: 0,
        DAMAGE: 1.2,
        RESIST: 1,
        PENETRATION: 1,
        DENSITY: 0.4,
    },
    AI: {
        BLIND: true,
    },
    DRAW_HEALTH: false,
    CLEAR_ON_MASTER_UPGRADE: true,
    GIVE_KILL_MESSAGE: false,
    CONTROLLERS: [
        "nearestDifferentMaster",
        "mapAltToFire",
        "minion",
        "canRepel",
        "hangOutNearMaster",
    ]
}
Class.minion = {
    PARENT: 'genericMinion',
    GUNS: [
        {
            POSITION: {
                LENGTH: 17,
                WIDTH: 9,
            },
            PROPERTIES: {
                SHOOT_SETTINGS: combineStats([g.basic, g.minionGun]),
                WAIT_TO_CYCLE: true,
                TYPE: "bullet"
            }
        }
    ]
}
Class.tinyMinion = {
    PARENT: "minion",
    LABEL: "Swarm Minion",
    ACCEPTS_SCORE: false,
    SHAPE: 0,
    MOTION_TYPE: 'swarm',
    CRAVES_ATTENTION: true,
    BODY: {
        ACCELERATION: 3,
        PENETRATION: 1.5,
        HEALTH: 0.35 * 0.5,
        DAMAGE: 2.25,
        RESIST: 1.6,
        RANGE: 300,
        DENSITY: 12,
        PUSHABILITY: 0.5,
        FOV: 1.5,
    },
    AI: {BLIND: true},
    GUNS: [
        {
            POSITION: [17, 9, 1, 0, 0, 0, 0],
            PROPERTIES: {
                SHOOT_SETTINGS: combineStats([g.basic, g.minionGun, g.lowPower]),
                WAIT_TO_CYCLE: true,
                TYPE: "bullet",
            }, 
        },
    ],
    DIE_AT_RANGE: true,
    BUFF_VS_FOOD: true,
}
Class.megaMinion = {
    PARENT: "minion",
    LABEL: "Mega Minion",
    BODY: {
        FOV: 0.5,
        SPEED: 3,
        ACCELERATION: 0.7,
        HEALTH: 5,
        SHIELD: 0,
        DAMAGE: 1.2,
        RESIST: 1,
        PENETRATION: 1,
        DENSITY: 0.4,
    },
    GUNS: [
        {
            POSITION: [17, 13, 1, 0, 0, 0, 0],
            PROPERTIES: {
                SHOOT_SETTINGS: combineStats([g.basic, g.minionGun, g.pounder]),
                WAIT_TO_CYCLE: true,
                TYPE: "bullet",
            },
        },
    ],
}
Class.desmosMinion = {
    PARENT: "minion",
    GUNS: [
        {
            POSITION: {
                LENGTH: 20,
                WIDTH: 8,
                ASPECT: -1.5
            },
            PROPERTIES: {
                SHOOT_SETTINGS: combineStats([g.basic, g.minionGun, g.desmos]),
                TYPE: ["bullet", {CONTROLLERS: ['snake']}]
            }
        },
        ...weaponMirror({
            POSITION: {
                LENGTH: 5,
                WIDTH: 5,
                ASPECT: -4,
                X: -5.25,
                Y: -7,
                ANGLE: 90
            }
        })
    ]
}
Class.wranglerMinion = {
    PARENT: 'minion',
    ON: [
        {
            event: 'tick',
            handler: ({body}) => {
                const numOfSegments = 2;
                const segmentClass = 'genericEntity';

                body.store.snakeSegments ??= [];

                for (let i = body.store.snakeSegments.length; i < numOfSegments; i++) {
                    let seg = new Entity(body, body);
                    //seg.health = body.health;
                    //seg.shield = body.shield;
                    seg.master = body;
                    seg.source = body;
                    seg.SIZE = body.SIZE;
                    seg.define(segmentClass);
                    body.store.snakeSegments.push(seg);
                }
                body.store.snakeSegments = body.store.snakeSegments.filter((x)=>!x.isDead())
                let previous = body;
                const children = body.store.snakeSegments;
            
                for (const child of children) {
                    const dx = child.x - previous.x;
                    const dy = child.y - previous.y;
                    const distance = Math.hypot(dx, dy) || 1; // /0 possible ig
                    const factor = (child.size + previous.size) * 1 / distance;
        
                    child.x = previous.x + dx * factor;
                    child.y = previous.y + dy * factor;
                    child.velocity.x = 0; // No natural move!
                    child.velocity.y = 0; // No natural move!
                    child.life();
                    previous = child;
                }
            }
        }
    ]
}

// Satellites
Class.satellite_old = {
    PARENT: "satellite",
    TURRETS: [
        {
            TYPE: ["circleHat", { COLOR: "grey" }],
            POSITION: { SIZE: 28 }
        }
    ]
}
Class.squareSatellite = { PARENT: "satellite", SHAPE: 4 }

// Traps
Class.satelliteTrap = {
    PARENT: "trap",
    ANGLE: 60,
    CONTROLLERS: ["whirlwind"],
    HAS_NO_RECOIL: true,
    AI: {
        SPEED: 2, 
    },
    GUNS: (() => { 
        let output = []
        for (let i = 0; i < 3; i++) {
            output.push({
                POSITION: {WIDTH: 16, LENGTH: 1, DELAY: 0},
                PROPERTIES: {
                    SHOOT_SETTINGS: combineStats([g.satellite, {reload: 0}]), 
                    TYPE: ["satellite", {ANGLE: i * 120, INDEPENDENT: true}], 
                    MAX_CHILDREN: 1,   
                    AUTOFIRE: true,  
                    SYNCS_SKILLS: false,
                    WAIT_TO_CYCLE: true,
                    ALPHA: 0
                }
            })
        }
        return output
    })()
}
Class.setTrap = {
    PARENT: "trap",
    LABEL: "Set Trap",
    SHAPE: -4,
    MOTION_TYPE: "motor",
    CONTROLLERS: ["goToMasterTarget"],
    BODY: {
        SPEED: 1,
        DENSITY: 5,
    },
}
Class.unsetTrap = {
    PARENT: "trap",
    LABEL: "Set Trap",
    SHAPE: -4,
    MOTION_TYPE: "motor",
    BODY: {
        SPEED: 1,
        DENSITY: 5,
    },
}
Class.assemblent = {
    PARENT: "setTrap",
    LABEL: "Assemblent",
    BODY: {
        SPEED: 0.7,
        ACCEL: 0.75,
        RANGE: 200,
    },
    DIE_AT_RANGE: true,
    TURRETS: [
        {
            TYPE: ["squareHatCurved", { COLOR: "darkGrey" }],
            POSITION: [4, 0, 0, 0, 360, 1]
        }
    ],
    HITS_OWN_TYPE: "assembler"
}
Class.boomerang = {
    PARENT: "trap",
    LABEL: "Boomerang",
    CONTROLLERS: ["boomerang"],
    MOTION_TYPE: "motor",
    HITS_OWN_TYPE: "never",
    SHAPE: -5,
    BODY: {
        SPEED: 1.25,
        RANGE: 120,
    },
}
Class.shotTrapBox = {
    PARENT: 'unsetTrap',
    MOTION_TYPE: "glide",
}
Class.oroborosTrapSegment = {
    PARENT: 'unsetTrap',
    COLOR: 'mirror',
    DIE_AT_RANGE: false,
    CLEAR_ON_MASTER_UPGRADE: true
}
Class.oroborosTrap = {
    PARENT: 'unsetTrap',
    ON: [
        {
            event: 'tick',
            handler: ({ body }) => {
                const numOfSegments = 5;
                const segmentClass = 'oroborosTrapSegment';

                body.store.snakeSegments ??= [];

                for (let i = body.store.snakeSegments.length; i < numOfSegments; i++) {
                    let seg = new Entity(body, body);
                    seg.define(segmentClass);
                    seg.master = body;
                    seg.source = body;
                    seg.SIZE = body.SIZE;
                    seg.skill.raw = body.skill.raw
                    seg.skill = body.skill
                    seg.DAMAGE = body.DAMAGE
                    seg.HEALTH = body.HEALTH
                    seg.PENETRATION = body.PENETRATION
                    seg.refreshBodyAttributes()
                    seg.refreshSkills()

                    body.store.snakeSegments.push(seg);
                }
                body.store.snakeSegments = body.store.snakeSegments.filter((x)=>!x.isDead())
                let previous = body;
                const children = body.store.snakeSegments;
            
                for (const child of children) {
                    const dx = child.x - previous.x;
                    const dy = child.y - previous.y;
                    const distance = Math.hypot(dx, dy) || 1; // /0 possible ig
                    const factor = (child.size + previous.size) * 1 / distance;
        
                    child.x = previous.x + dx * factor;
                    child.y = previous.y + dy * factor;
                    child.velocity.x = 0; // No natural move!
                    child.velocity.y = 0; // No natural move!
                    child.life();
                    previous = child;
                }
            }
        }
    ]
}
Class.beemanTrap = {
    PARENT: 'setTrap',
    SHAPE: 9,
    INDEPENDENT: true,
    GUNS: weaponArray({
        POSITION: {
            LENGTH: 1,
            WIDTH: 10
        },
        PROPERTIES: {
            SHOOT_SETTINGS: combineStats([g.swarm, g.bee]),
            TYPE: "bee",
            SHOOT_ON_DEATH: true,
        }
    }, 60)
}

// Pillboxes
Class.pillbox = {
    PARENT: "setTrap",
    LABEL: "Pillbox",
    INDEPENDENT: true,
    DIE_AT_RANGE: true,
    TURRETS: [
        {
            POSITION: [11, 0, 0, 0, 360, 1],
            TYPE: "pillboxTurret",
        },
    ],
}
Class.legionaryPillbox = {
    PARENT: "unsetTrap",
    LABEL: "Pillbox",
    BODY: {
        SPEED: 1,
        DENSITY: 5,
    },
    DIE_AT_RANGE: true,
    TURRETS: [
        {
            POSITION: [11, 0, 0, 0, 360, 1],
            TYPE: "legionaryTwin",
        },
    ],
}
Class.unsetPillbox = {
    PARENT: "unsetTrap",
    LABEL: "Pillbox",
    INDEPENDENT: true,
    DIE_AT_RANGE: true,
    TURRETS: [
        {
            POSITION: [11, 0, 0, 0, 360, 1],
            TYPE: "pillboxTurret",
        },
    ],
}
Class.medkit = {
    PARENT: "trap",
    LABEL: "Medkit",
    SHAPE: -6,
    MOTION_TYPE: "motor",
    CONTROLLERS: ["goToMasterTarget"],
    INDEPENDENT: true,
    BODY: {
        SPEED: 1,
        DENSITY: 5,
    },
    DIE_AT_RANGE: true,
    TURRETS: [
        {
            TYPE: "medkitTurret",
            POSITION: {
                SIZE: 11,
                ARC: 360,
                LAYER: 1
            }
        }
    ]
};

// Swarms
Class.autoswarm = {
    PARENT: "swarm",
    AI: {
        FARMER: true
    },
    INDEPENDENT: true
}
Class.bee = {
    PARENT: "swarm",
    PERSISTS_AFTER_DEATH: true,
    SHAPE: 4,
    LABEL: "Drone",
    HITS_OWN_TYPE: "hardWithBuffer"
}
Class.baseSwarmTurret_swarm = {
    PARENT: "swarm",
    MOTION_TYPE: ["swarm", { turnVelocity: 10 }],
    AI: { IGNORE_SHAPES: true },
    BODY: {
        ACCELERATION: Class.swarm.BODY.ACCELERATION,
        PENETRATION: Class.swarm.BODY.PENETRATION,
        HEALTH: Class.swarm.BODY.HEALTH,
        DAMAGE: Class.swarm.BODY.DAMAGE,
        SPEED: Class.swarm.BODY.SPEED,
        RESIST: Class.swarm.BODY.RESIST,
        RANGE: 345,
        DENSITY: Class.swarm.BODY.DENSITY,
        PUSHABILITY: Class.swarm.BODY.PUSHABILITY,
        FOV: 1.7,
        KNOCKBACK: 15,
    },
}
Class.homingBullet = {
    PARENT: 'bullet',
    LABEL: "Homing Bullet",
    MOTION_TYPE: 'swarm',
    FACING_TYPE: 'smoothWithMotion',
    CONTROLLERS: ['nearestDifferentMaster', 'mapTargetToGoal']
}
Class.autoHomingBullet = {
    PARENT: 'homingBullet',
    AI: {
        FARMER: true
    },
    INDEPENDENT: true
}
Class.splitterBullet = {
    PARENT: "bullet",
    INDEPENDENT: true,
    GUNS: [
        {
            POSITION: [8, 8, 1, 0, 0, 0, 0],
            PROPERTIES: {
                SHOOT_SETTINGS: combineStats([
                    g.basic,
                    { size: 2.4, range: 0.1 },
                ]),
                TYPE: ["bullet", { PERSISTS_AFTER_DEATH: true }],
                SHOOT_ON_DEATH: true,
            },
        },
        {
            POSITION: [8, 8, 1, 0, 0, 30, 0],
            PROPERTIES: {
                SHOOT_SETTINGS: combineStats([
                    g.basic,
                    { size: 2.4, range: 0.1 },
                ]),
                TYPE: ["bullet", { PERSISTS_AFTER_DEATH: true }],
                SHOOT_ON_DEATH: true,
            },
        },
        {
            POSITION: [8, 8, 1, 0, 0, -30, 0],
            PROPERTIES: {
                SHOOT_SETTINGS: combineStats([
                    g.basic,
                    { size: 2.4, range: 0.1 },
                ]),
                TYPE: ["bullet", { PERSISTS_AFTER_DEATH: true }],
                SHOOT_ON_DEATH: true,
            },
        },
    ],
}
Class.superSplitterBullet = {
    PARENT: "bullet",
    INDEPENDENT: true,
    GUNS: [
        {
            POSITION: [8, 8, 1, 0, 0, 0, 0],
            PROPERTIES: {
                SHOOT_SETTINGS: combineStats([
                    g.basic,
                    { size: 2.4, range: /*0.*/1 },
                    g.weak,
                ]),
                TYPE: ["splitterBullet", { PERSISTS_AFTER_DEATH: true }],
                SHOOT_ON_DEATH: true,
            },
        },
        {
            POSITION: [8, 8, 1, 0, 0, 30, 0],
            PROPERTIES: {
                SHOOT_SETTINGS: combineStats([
                    g.basic,
                    { size: 2.4, range: /*0.*/1 },
                    g.weak,
                ]),
                TYPE: ["splitterBullet", { PERSISTS_AFTER_DEATH: true }],
                SHOOT_ON_DEATH: true,
            },
        },
        {
            POSITION: [8, 8, 1, 0, 0, -30, 0],
            PROPERTIES: {
                SHOOT_SETTINGS: combineStats([
                    g.basic,
                    { size: 2.4, range: /*0.*/1 },
                    g.weak,
                ]),
                TYPE: ["splitterBullet", { PERSISTS_AFTER_DEATH: true }],
                SHOOT_ON_DEATH: true,
            },
        },
    ],
}

// -Drive projectiles
Class.autoDrone = makeAuto('drone', "Auto-Drone", {type: 'droneAutoTurret'});
Class.autoMinion = makeAuto('minion', "Auto-Minion", {type: 'droneAutoTurret'});
Class.autoSunchip = makeAuto('sunchip', "Auto-Drone", {type: 'droneAutoTurret'});
