const { combineStats, skillSet, makePolyhedron } = require('../facilitators.js')
const { base, dfltskl, smshskl, statnames } = require('../constants.js')
const g = require('../gunvals.js')

// Set the below variable to true to enable the flat ball from arras.io.
const classic_ball = false;

// Entities
Class.genericEntity = {
    NAME: "",
    LABEL: "Unknown Entity",
    TYPE: "unknown",
    DAMAGE_CLASS: 0,
    DANGER: 0,
    VALUE: 0,
    SHAPE: 0,
    SIZE: 10,
    COLOR: {
        BASE: 16, // ID
        HUE_SHIFT: 0, // Additive, degrees
        SATURATION_SHIFT: 1, // Multiplicative
        BRIGHTNESS_SHIFT: 0, // Additive, ranges from -100 to 100
        ALLOW_BRIGHTNESS_INVERT: false, // Toggles offset invert if exceeding normal color bounds
    },
    INDEPENDENT: false,
    CONTROLLERS: [],
    HAS_NO_MASTER: false,
    MOTION_TYPE: "glide",
    FACING_TYPE: 'toTarget',
    DRAW_HEALTH: false,
    DRAW_SELF: true,
    IS_IMMUNE_TO_TILES: false,
    DAMAGE_EFFECTS: true,
    RATEFFECTS: true,
    MOTION_EFFECTS: true,
    INTANGIBLE: false,
    CAN_GO_OUTSIDE_ROOM: false,
    CAN_SEE_INVISIBLE_ENTITIES: false,
    CONNECT_CHILDREN_ON_CAMERA: false,
    ACCEPTS_SCORE: true,
    GIVE_KILL_MESSAGE: false,
    HITS_OWN_TYPE: "normal",
    DIE_AT_LOW_SPEED: false,
    DIE_AT_RANGE: false,
    CLEAR_ON_MASTER_UPGRADE: false,
    PERSISTS_AFTER_DEATH: false,
    VARIES_IN_SIZE: false,
    HEALTH_WITH_LEVEL: true,
    CAN_BE_ON_LEADERBOARD: true,
    HAS_NO_RECOIL: false,
    SYNC_WITH_TANK: false,
    BUFF_VS_FOOD: false,
    OBSTACLE: false,
    CRAVES_ATTENTION: false,
    NECRO: false,
    UPGRADES_TIER_0: [],
    UPGRADES_TIER_1: [],
    UPGRADES_TIER_2: [],
    UPGRADES_TIER_3: [],
    UPGRADES_TIER_4: [],
    UPGRADES_TIER_5: [],
    UPGRADES_TIER_6: [],
    UPGRADES_TIER_7: [],
    UPGRADES_TIER_8: [],
    UPGRADES_TIER_9: [],
    SKILL: [0, 0, 0, 0, 0, 0, 0, 0, 0, 0],
    LEVEL: 0,
    SKILL_CAP: Array(10).fill(dfltskl),
    GUNS: [],
    MAX_CHILDREN: 0,
    BORDERLESS: false,
    DRAW_FILL: true,
    REROOT_UPGRADE_TREE: null,
    DISPLAY_NAME: true,
    ON: [],
    BODY: {
        ACCELERATION: 1,
        SPEED: 0,
        HEALTH: 1,
        RESIST: 1,
        SHIELD: 0,
        REGEN: 0,
        DAMAGE: 1,
        PENETRATION: 1,
        RANGE: 0,
        FOV: 1,
        SHOCK_ABSORB: 1,
        RECOIL_MULTIPLIER: 1,
        DENSITY: 1,
        STEALTH: 1,
        PUSHABILITY: 1,
        HETERO: 2
    },
    FOOD: {
        LEVEL: -1
    }
};

// Tanks
Class.genericTank = {
    LABEL: "Unknown Class",
    TYPE: "tank",
    DAMAGE_CLASS: 2,
    DANGER: 5,
    SHAPE: 0,
    SIZE: 12,
    MOTION_TYPE: "motor",
    FACING_TYPE: 'toTarget',
    ARENA_CLOSER: false,
    FULL_INVISIBLE: false,
    CAN_SEE_INVISIBLE_ENTITIES: false,
    CONNECT_CHILDREN_ON_CAMERA: false,
    DAMAGE_EFFECTS: false,
    DRAW_HEALTH: true,
    GIVE_KILL_MESSAGE: true,
    HAS_NO_RECOIL: false,
    HITS_OWN_TYPE: "hardOnlyTanks",
    IGNORED_BY_AI: false,
    INVISIBLE: [0, 0],
    IS_IMMUNE_TO_TILES: false,
    MAX_CHILDREN: 0,
    NO_SIZE_ANIMATION: false,
    RENDER_ON_LEADERBOARD: true,
    REROOT_UPGRADE_TREE: Config.spawn_class,
    RESET_EVENTS: true,
    SKILL_CAP: Array(10).fill(dfltskl),
    SYNC_WITH_TANK: false,
    BODY: {
        ACCELERATION: base.ACCEL,
        SPEED: base.SPEED,
        HEALTH: base.HEALTH,
        DAMAGE: base.DAMAGE,
        PENETRATION: base.PENETRATION,
        SHIELD: base.SHIELD,
        REGEN: base.REGEN,
        FOV: base.FOV,
        DENSITY: base.DENSITY,
        PUSHABILITY: 1,
        HETERO: 3,
    },
    GUNS: [],
    TURRETS: [],
    PROPS: [],
    ON: [],
};
Class.genericFlail = {
    PARENT: 'genericTank',
    STAT_NAMES: statnames.flail,
    SYNC_WITH_TANK: true,
    SKILL_CAP: {
        BODY_DAMAGE: dfltskl,
        MAX_HEALTH: dfltskl,
        BULLET_SPEED: 0,
        BULLET_HEALTH: 0,
        PENETRATION: dfltskl,
        BULLET_DAMAGE: dfltskl,
        RELOAD: dfltskl,
        MOVEMENT_SPEED: dfltskl,
        SHIELD_REGENERATION: dfltskl,
        SHIELD_CAPACITY: dfltskl
    },
};
Class.genericHealer = {
    PARENT: 'genericTank',
    HEALING_TANK: true, // Mainly for bots to recognize the tank
    STAT_NAMES: statnames.healer,
    TURRETS: [
        {
            TYPE: "healerHat",
            POSITION: {
                SIZE: 13,
                LAYER: 1
            }
        }
    ]
};
Class.genericSmasher = {
    PARENT: 'genericTank',
    DANGER: 7,
    IS_SMASHER: true,
    SKILL_CAP: {
        RELOAD: smshskl,
        PENETRATION: 0,
        BULLET_HEALTH: 0,
        BULLET_DAMAGE: 0,
        BULLET_SPEED: 0,
        SHIELD_CAPACITY: smshskl,
        BODY_DAMAGE: smshskl,
        MAX_HEALTH: smshskl,
        SHIELD_REGENERATION: smshskl,
        MOVEMENT_SPEED: smshskl
    },
    STAT_NAMES: statnames.smasher,
    BODY: {
        FOV: 1.05 * base.FOV,
        SPEED: 1.125 * base.SPEED,
        DENSITY: 2 * base.DENSITY
    }
};

// Map Objects
Class.flag = {
    LABEL: "Flag",
    SIZE: 20,
    COLOR: 3,
    TURRETS: [
        {
            TYPE: 'flagHat',
            POSITION: {
                SIZE: 20,
                LAYER: 1
            }
        }
    ]
};
Class.food = {
    TYPE: "food",
    DAMAGE_CLASS: 1,
    CONTROLLERS: ["moveInCircles"],
    HITS_OWN_TYPE: "repel",
    MOTION_TYPE: "drift",
    FACING_TYPE: "turnWithSpeed",
    IS_IMMUNE_TO_TILES: false,
    LEVEL_CAP: 1,
    BODY: {
        STEALTH: 30,
        PUSHABILITY: 1,
        REGEN: 0
    },
    DAMAGE_EFFECTS: false,
    RATEFFECTS: false,
    HEALTH_WITH_LEVEL: false,
};
Class.genericObstacle = {
    TYPE: "wall",
    DAMAGE_CLASS: 1,
    FACING_TYPE: "turnWithSpeed",
    CAN_GO_OUTSIDE_ROOM: true,
    BODY: {
        PUSHABILITY: 0,
        HEALTH: 10000,
        SHIELD: 10000,
        REGEN: 1000,
        DAMAGE: 1,
        RESIST: 100,
        STEALTH: 1,
    },
    VALUE: 0,
    COLOR: "lightGray",
    ACCEPTS_SCORE: false,
    VARIES_IN_SIZE: true
};

// Colour each face by its vertex count: a truncated icosahedron (football) has 12 PENTAGONS
// (5 verts → black) and 20 HEXAGONS (6 verts → white). Reading it from the geometry means the
// right faces are always coloured, regardless of face order — no hand-made list to get wrong.
let ballShape = makePolyhedron({
    VERTEXES: [
        [0.742344, 0.28355, -0.350487],
        [0.850651, 0, -0.175244],
        [0.742344, -0.28355, -0.350487],
        [0.5671, -0.175244, -0.634038],
        [0.5671, 0.175244, -0.634038],
        [-0.5671, 0.175244, -0.634038],
        [-0.5671, -0.175244, -0.634038],
        [-0.742344, -0.28355, -0.350487],
        [-0.850651, 0, -0.175244],
        [-0.742344, 0.28355, -0.350487],
        [0.5671, 0.175244, 0.634038],
        [0.5671, -0.175244, 0.634038],
        [0.742344, -0.28355, 0.350487],
        [0.850651, 0, 0.175244],
        [0.742344, 0.28355, 0.350487],
        [-0.742344, 0.28355, 0.350487],
        [-0.850651, 0, 0.175244],
        [-0.742344, -0.28355, 0.350487],
        [-0.5671, -0.175244, 0.634038],
        [-0.5671, 0.175244, 0.634038],
        [0.350487, 0.742344, -0.28355],
        [0.175244, 0.850651, 0],
        [0.350487, 0.742344, 0.28355],
        [0.634038, 0.5671, 0.175244],
        [0.634038, 0.5671, -0.175244],
        [0.634038, -0.5671, -0.175244],
        [0.634038, -0.5671, 0.175244],
        [0.350487, -0.742344, 0.28355],
        [0.175244, -0.850651, 0],
        [0.350487, -0.742344, -0.28355],
        [-0.634038, 0.5671, -0.175244],
        [-0.634038, 0.5671, 0.175244],
        [-0.350487, 0.742344, 0.28355],
        [-0.175244, 0.850651, 0],
        [-0.350487, 0.742344, -0.28355],
        [-0.350487, -0.742344, -0.28355],
        [-0.175244, -0.850651, 0],
        [-0.350487, -0.742344, 0.28355],
        [-0.634038, -0.5671, 0.175244],
        [-0.634038, -0.5671, -0.175244],
        [0.28355, 0.350487, -0.742344],
        [0, 0.175244, -0.850651],
        [-0.28355, 0.350487, -0.742344],
        [-0.175244, 0.634038, -0.5671],
        [0.175244, 0.634038, -0.5671],
        [0.175244, 0.634038, 0.5671],
        [-0.175244, 0.634038, 0.5671],
        [-0.28355, 0.350487, 0.742344],
        [0, 0.175244, 0.850651],
        [0.28355, 0.350487, 0.742344],
        [0.175244, -0.634038, -0.5671],
        [-0.175244, -0.634038, -0.5671],
        [-0.28355, -0.350487, -0.742344],
        [0, -0.175244, -0.850651],
        [0.28355, -0.350487, -0.742344],
        [0.28355, -0.350487, 0.742344],
        [0, -0.175244, 0.850651],
        [-0.28355, -0.350487, 0.742344],
        [-0.175244, -0.634038, 0.5671],
        [0.175244, -0.634038, 0.5671]
    ],
    FACES: [
        [41, 42, 5, 6, 52, 53],
        [44, 20, 21, 33, 34, 43],
        [41, 40, 44, 43, 42],
        [42, 43, 34, 30, 9, 5],
        [32, 31, 30, 34, 33],
        [19, 15, 31, 32, 46, 47],
        [47, 48, 56, 57, 18, 19],
        [48, 49, 10, 11, 55, 56],
        [11, 10, 14, 13, 12],
        [2, 25, 26, 12, 13, 1],
        [1, 0, 4, 3, 2],
        [21, 20, 24, 23, 22],
        [32, 33, 21, 22, 45, 46],
        [46, 45, 49, 48, 47],
        [10, 49, 45, 22, 23, 14],
        [14, 23, 24, 0, 1, 13],
        [44, 40, 4, 0, 24, 20],
        [41, 53, 54, 3, 4, 40],
        [39, 7, 8, 16, 17, 38],
        [9, 30, 31, 15, 16, 8],
        [15, 19, 18, 17, 16],
        [50, 29, 28, 36, 35, 51],
        [53, 52, 51, 50, 54],
        [25, 2, 3, 54, 50, 29],
        [26, 25, 29, 28, 27],
        [6, 5, 9, 8, 7],
        [52, 6, 7, 39, 35, 51],
        [39, 38, 37, 36, 35],
        [58, 57, 56, 55, 59],
        [18, 57, 58, 37, 38, 17],
        [11, 12, 26, 27, 59, 55],
        [28, 27, 59, 58, 37, 36]
    ],
    SCALE: 12,
    VERTEXES_SCALE: 0.1
});
Class.ball = {
    PARENT: 'food',
    LABEL: "Ball",
    VALUE: 2e7,
    SIZE: 30,
    COLOR: 'veryLightGrey',
    SHAPE: ballShape + '/' + ballShape.split("/")[1].split(";").map(face => face.split(",").length === 5 ? "black" : "veryLightGrey").join(","),
    BODY: {
        DAMAGE: 4.8,
        DENSITY: 20,
        HEALTH: 40,
        RESIST: 1.25,
        PENETRATION: 17.5,
        ACCELERATION: 0.002
    },
    DRAW_HEALTH: false,
    INTANGIBLE: false,
    GIVE_KILL_MESSAGE: true
};
if (classic_ball) {
    Class.ball.SHAPE = 0
    Class.ball.COLOR = 'black'
    Class.ball.PROPS = [
        {
            TYPE: 'ballHat',
            POSITION: {
                SIZE: 20,
                LAYER: 1
            }
        }
    ]
};

// Projectiles
Class.bullet = {
    LABEL: "Bullet",
    TYPE: "bullet",
    ACCEPTS_SCORE: false,
    BODY: {
        PENETRATION: 1,
        SPEED: 3.75,
        RANGE: 90,
        DENSITY: 1.25,
        HEALTH: 0.165,
        DAMAGE: 6,
        PUSHABILITY: 0.3,
    },
    FACING_TYPE: "smoothWithMotion",
    CAN_GO_OUTSIDE_ROOM: true,
    HITS_OWN_TYPE: "never",
    DIE_AT_RANGE: true,
};
Class.drone = {
    LABEL: "Drone",
    TYPE: "drone",
    ACCEPTS_SCORE: false,
    DANGER: 2,
    CONTROL_RANGE: 0,
    SHAPE: 3,
    MOTION_TYPE: "chase",
    FACING_TYPE: "smoothToTarget",
    CONTROLLERS: [
        "nearestDifferentMaster",
        "canRepel",
        "mapTargetToGoal",
        "hangOutNearMaster",
    ],
    AI: {
        BLIND: true,
    },
    BODY: {
        PENETRATION: 1.2,
        PUSHABILITY: 0.6,
        ACCELERATION: 0.085,
        HEALTH: 0.3,
        DAMAGE: 3.375,
        SPEED: 3.8,
        RANGE: 200,
        DENSITY: 0.03,
        RESIST: 1.5,
        FOV: 0.5,
    },
    HITS_OWN_TYPE: "droneCollision",
    DRAW_HEALTH: false,
    CLEAR_ON_MASTER_UPGRADE: true,
    BUFF_VS_FOOD: true,
};
Class.satellite = { 
    LABEL: "Satellite",
    TYPE: "satellite",
    ACCEPTS_SCORE: false,
    DANGER: 2,
    SHAPE: 0,
    LAYER: 13,
    CONTROLLERS: ['orbit'],
    FACING_TYPE: "spin",
    BODY: {
        PENETRATION: 1.2,
        PUSHABILITY: 0.6,
        ACCELERATION: 0.75,
        HEALTH: 0.3,
        DAMAGE: 3.375,
        SPEED: 10,
        RANGE: 200,
        DENSITY: 0.03,
        RESIST: 1.5,
        FOV: 0.5,
    },
    DRAW_HEALTH: false,
    CLEAR_ON_MASTER_UPGRADE: true,
    BUFF_VS_FOOD: true,
    MOTION_TYPE: 'motor'
};
Class.swarm = {
    LABEL: "Swarm Drone",
    TYPE: "swarm",
    ACCEPTS_SCORE: false,
    SHAPE: 3,
    MOTION_TYPE: "swarm",
    FACING_TYPE: "smoothWithMotion",
    CONTROLLERS: ["nearestDifferentMaster", "mapTargetToGoal"],
    CRAVES_ATTENTION: true,
    BODY: {
        ACCELERATION: 3,
        PENETRATION: 1.5,
        HEALTH: 0.175,
        DAMAGE: 2.25,
        SPEED: 4.5,
        RESIST: 1.6,
        RANGE: 225,
        DENSITY: 12,
        PUSHABILITY: 0.6,
        FOV: 1.5,
    },
    DIE_AT_RANGE: true,
    BUFF_VS_FOOD: true,
};
Class.trap = {
    LABEL: "Thrown Trap",
    TYPE: "trap",
    ACCEPTS_SCORE: false,
    SHAPE: -3,
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
        SPEED: 0,
    },
};

// Bosses
Class.genericBoss = {
    PARENT: 'genericTank',
    TYPE: "miniboss",
    DANGER: 6,
    SKILL: skillSet({
        rld: 0.7,
        dam: 0.5,
        pen: 0.8,
        str: 0.8,
        spd: 0.2,
        atk: 0.3,
        hlt: 1,
        shi: 0.7,
        rgn: 0.7,
        mob: 0,
    }),
    LEVEL: 45,
    CONTROLLERS: [["nearestDifferentMaster", { lockThroughWalls: true }], "canRepel"],
    FACING_TYPE: ['spin', {speed: 0.02}],
    HITS_OWN_TYPE: "hardOnlyBosses",
    BROADCAST_MESSAGE: "A visitor has left!",
    BODY: { PUSHABILITY: 0.05 }
};
Class.miniboss = {
    PARENT: "genericBoss",
    RENDER_ON_LEADERBOARD: true,
    CONTROLLERS: ["nearestDifferentMaster", ["minion", {turnwiserange: 360}], "canRepel"],
    AI: { NO_LEAD: true },
};

// Aura Components
Class.auraBase = {
    TYPE: "aura",
    ACCEPTS_SCORE: false,
    FACING_TYPE: "smoothWithMotion",
    MOTION_TYPE: "withMaster",
    HITS_OWN_TYPE: "never",
    DAMAGE_EFFECTS: false,
    DIE_AT_RANGE: false,
    ALPHA: 0.3,
    CLEAR_ON_MASTER_UPGRADE: true,
    CAN_GO_OUTSIDE_ROOM: true,
    CONTROLLERS: ["disableOnOverride", "scaleWithMaster"],
    BODY: {
        SHIELD: 1e9,
        REGEN: 1e6,
        HEALTH: 1e9,
        DENSITY: 0,
        SPEED: 0,
        PUSHABILITY: 0,
    }
};
Class.aura = {
    PARENT: "auraBase",
    LABEL: "Aura",
    COLOR: "teal",
    BODY: {
        DAMAGE: 0.4,
    },
};
Class.healAura = {
    PARENT: "auraBase",
    LABEL: "Heal Aura",
    HEALER: true,
    COLOR: "red",
    BODY: {
        DAMAGE: 0.4 / 3,
    },
};
Class.auraSymbol = {
    PARENT: 'genericTank',
    CONTROLLERS: [["spin", {speed: -0.04}]],
    INDEPENDENT: true,
    COLOR: "teal",
    SHAPE: [[-0.598,-0.7796],[-0.3817,-0.9053],[0.9688,-0.1275],[0.97,0.125],[-0.3732,0.9116],[-0.593,0.785]]
};

// Server Travel Portal
Class.portalAura = {
    PARENT: "bullet",
    MOTION_TYPE: "withMaster",
    CLEAR_ON_MASTER_UPGRADE: true,
    ALPHA: 0.4,
    NO_COLLISIONS: true,
    BODY: {
        HEALTH: base.HEALTH * 1000,
        DAMAGE: 0,
        DENSITY: 0,
        SPEED: 0,
        PUSHABILITY: 0,
    },
    DIE_AT_RANGE: false,
    ON: [
        {
            event: 'tick',
            handler: ({ body }) => {
                if (body.growing) {
                    body.SIZE += 1.2;
                    if (body.SIZE > 45) body.growing = false;
                } else {
                    body.SIZE -= 1.2;
                    if (body.SIZE < 32) body.growing = true;
                }
            }
        },
    ],
};
Class.serverPortal = {
    PARENT: 'genericTank',
    LABEL: "Travel Portal",
    UPGRADE_LABEL: "Portal",
    NAME: "Portal",
    COLOR: "#000000",
    BODY: {
        FOV: 2.5,
        DAMAGE: 0,
        HEALTH: 1e100,
        SHIELD: 1e100,
        REGEN: 1e100,
        PUSHABILITY: 0,
        DENSITY: 0,
    },
    FACING_TYPE: "spin",
    HITS_OWN_TYPE: "never",
    ARENA_CLOSER: true,
    IGNORED_BY_AI: true,
    CAN_BE_ON_LEADERBOARD: false,
    GIVE_KILL_MESSAGE: false,
    ACCEPTS_SCORE: false,
    DISPLAY_NAME: true,
    FULL_INVISIBLE: true,
    SIZE: 25,
    GUNS: [],
    ALPHA: 1,
    TURRETS: [
        {
            TYPE: ["circleHat", {COLOR: "#000000"}],
            POSITION: {
                SIZE: 20.1,
                LAYER: 1
            }
        }
    ],
    ON: [
        {
            event: "tick",
            handler: ({ body }) => {
                for (let instance of entities.values()) {
                    let diffX = instance.x - body.x,
                        diffY = instance.y - body.y,
                        dist2 = diffX ** 2 + diffY ** 2;
                    if (dist2 <= ((body.size / 12)*250) ** 1.9) {
                        let forceMulti = (0.2 / instance.size);
                        if (instance.isPlayer && instance.socket) {
                            if (dist2 < body.size ** 2.5 + instance.size ** 2.5) forceMulti = (3 / instance.size);
                            instance.velocity.x += util.clamp(body.x - instance.x, -90, 90) * instance.damp * forceMulti;//0.05
                            instance.velocity.y += util.clamp(body.y - instance.y, -90, 90) * instance.damp * forceMulti;//0.05
                        } else if (
                            !instance.isDominator && 
                            !instance.isArenaCloser && 
                            !instance.godmode && 
                            !instance.invuln && 
                            instance.id != body.id && 
                            instance.type !== "wall" &&
                            instance.team != body.team && 
                            instance.type === "bullet" ||
                            instance.type === "drone" ||
                            instance.type === "trap" ||
                            instance.type === "minion")
                        {
                            forceMulti = (3 / instance.size);
                            instance.velocity.x -= util.clamp(body.x - instance.x, -90, 90) * instance.damp * forceMulti;//0.05
                            instance.velocity.y -= util.clamp(body.y - instance.y, -90, 90) * instance.damp * forceMulti;//0.05
                        }
                    }
                }
            }
        }
    ]
};
for (let i = 0; i < 60; i++) {
    let spawnDelay = Math.random() * 252;
    if (spawnDelay < 20) spawnDelay = Math.random() * 4;
    Class.serverPortal.GUNS.push({
        POSITION: [2, 8, 1, -150, 0, 360 / 60 * i, spawnDelay],
        PROPERTIES: {
            SHOOT_SETTINGS: combineStats([
                g.basic,
                { shudder: 0, speed: 2.7, spray: 0, reload: 0.8, recoil: 0, range: 0.15 },
            ]),
            SYNCS_SKILLS: true,
            AUTOFIRE: true,
            DRAW_FILL: false,
            BORDERLESS: true,
            NO_LIMITATIONS: true,
            TYPE: [
                Class.bullet,
                {
                    NO_COLLISIONS: true,
                    ALPHA: 0,
                    FULL_INVISIBLE: true,
                    ON: [
                        {
                            event: "tick",
                            handler: ({ body }) => {
                                if (body.alpha < 0.9) body.alpha += 0.06; else body.alpha = 0;
                            }
                        }
                    ]
                },
            ],
        },
    });
};
for (let i = 0; i < 2; i++) {
    if (i & 1) i++;
    Class.serverPortal.GUNS.push({
        POSITION: [2, 14, 1, 2.5, 0, 0, i],
        PROPERTIES: {
        SHOOT_SETTINGS: combineStats([g.basic,{damage: 0, speed: 0, maxSpeed: 0, reload: 0.4, recoil: 0, size: 3}]),
            TYPE: "portalAura",
            SYNCS_SKILLS: true,
            AUTOFIRE: true,
            NO_LIMITATIONS: true,
            MAX_CHILDREN: 1,
        },
    });
};

// Technical
Class.bot = {
    FACING_TYPE: 'looseToTarget',
    CONTROLLERS: [
        "nearestDifferentMaster",
        "mapAltToFire",
        "minion",
        "fleeAtLowHealth",
        ["mapFireToAlt", {onlyIfHasAltFireGun: true}],
        ["wanderAroundMap", {replicatePlayerMovement: true, lookAtGoal: true}]
    ],
    AI: {IGNORE_SHAPES: true}
};
Class.hp = { // HP for mothership or your custom gamemodes
    SHAPE: [],
    LABEL: "##% HP"
};
Class.selectionOrb = {
    COLOR: 'white'
};
Class.tagMode = {
    SHAPE: "",
    LABEL: "Players"
};
