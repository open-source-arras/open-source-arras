const {combineStats, LayeredBoss, makeAura, makeAuto, makeMenu, makePolyhedron, makeRadialAuto, makeTurret, weaponArray, weaponMirror, weaponStack} = require('../../facilitators.js')
const {base, basePolygonDamage, basePolygonHealth, dfltskl, statnames} = require('../../constants.js')
const g = require('../../gunvals.js')

Class.menu_testing = makeMenu("Testing", {upgrades: [
    'upgradeMenuStressTest',
    'flag',
    'ball',
    'rainbowTesseract',
    'tagger',
    'roaringLancer',
    "gunLayerTest",
    "diamondShape",
    "miscTest",
    "mmaTest",
    "vulnturrettest",
    "onTest",
    "alphaGunTest",
    "strokeWidthTest",
    "testLayeredBoss",
    "tooltipTank",
    "turretLayerTesting",
    "bulletSpawnTest",
    "propTest",
    "weaponArrayTest",
    "radialAutoTest",
    "imageShapeTest",
    "screenShakeTest",
    "turretStatScaleTest",
    "auraBasic",
    "auraHealer",
    "ghoster",
    "gunBenchmark",
    "switcheroo",
    "armyOfOne",
    ["developer", "developer"],
    "vanquisher",
    "syncWithTankTest",
    "airblast",
    "anglemancer",
    "backwardsExports",
], tooltip: "A large selection of tanks that use many of the features of Open Source Arras.\n" + "WARNING: There are a lot of entities in here and having this menu open may cause noticeable frame drops!"})

const stressTestUpgrades = Array(100).fill(Config.spawn_class)
Class.upgradeMenuStressTest = makeMenu("Upgrade Menu Stress Test", {upgrades: stressTestUpgrades, tooltip: `This menu currently has ${stressTestUpgrades.length} upgrades.`, boxLabel: "UMSS"})

const tessFaceColors = Array.from({ length: 20 }, (_, i) =>
    ["red", "orange", "yellow", "green", "blue", "purple"][i % 6]
);
Class.rainbowTesseract = {
    PARENT: 'tesseract',
    LABEL: "Rainbow Tesseract",
    NAME: "Rainbow Tesseract",
    SHAPE: Class.tesseract.SHAPE + "/" + tessFaceColors.join(","),
};

// Tagger
Class.tagBullet = {
    PARENT: "bullet",
    ON: [
        {
            event: "collide",
            handler: ({ instance, other }) => {
                if (other.team != instance.team) {
                    other.team = instance.team;
                    other.color = instance.color;
                }
            }
        }
    ]
}
Class.tagger = {
    PARENT: 'genericTank',
    LABEL: "Tagger",
    GUNS: [
        {
            POSITION: {},
            PROPERTIES: {
                SHOOT_SETTINGS: combineStats([g.basic]),
                TYPE: 'tagBullet'
            }
        }
    ]
}

// Lancer
statnames.lancer = {
    BULLET_SPEED: "Lance Range",
    BULLET_HEALTH: "Lance Longevity",
    BULLET_PEN: "Lance Sharpness",
    BULLET_DAMAGE: "Lance Damage",
    RELOAD: "Recharge Time"
}

Class.roaringParent = {
    HITS_OWN_TYPE: 'never',
    DISPLAY_NAME: false,
    IGNORED_BY_AI: true,
    ACCEPTS_SCORE: false,
    CAN_BE_ON_LEADERBOARD: false,
    IS_IMMUNE_TO_TILES: false,
    DRAW_HEALTH: false,
    ARENA_CLOSER: true,
    CAN_GO_OUTSIDE_ROOM: true,
    INTANGIBLE: true,
    BORDERLESS: true,
    LAYER: -1,
    BODY: {
        SHIELD: 1e9,
        REGEN: 1e6,
        HEALTH: 1e9,
        DENSITY: 0,
        SPEED: 0,
        PUSHABILITY: 0,
        DAMAGE: 0
    },
    ON: [
        {
            event: 'tick',
            handler: ({body}) => {
                body.ticking ??= 0
                body.ticking++

                let k = body.master.facing
                Object.defineProperty(body, 'facing', {
                    get:()=>{return k}, set:()=>{}
                })

                body.alpha -= 0.1
                if (body.alpha <= 0) {
                    body.kill()
                }
            }
        }
    ]
}
Class.roaringHat = {
    PARENT: 'circleHat',
    COLOR: '#000000',
    BORDERLESS: true
}
Class.roaringHat2 = {
    PARENT: 'circleHat',
    COLOR: '#ffffff',
    BORDERLESS: true
}
Class.roaringLancer = {
    PARENT: 'genericTank',
    LABEL: "Roaring Lancer",
    COLOR: '#000000',
    BORDERLESS: true,
    STAT_NAMES: statnames.lancer,
    TOOLTIP: "Click to charge in the direction you're facing.",
    ON: [
        {
            event: 'fire',
            handler: ({body, gun}) => {
                switch (gun.identifier) {
                    case 'charge':
                        function afterImage(){
                            o = new Entity({x: body.x, y: body.y})
                            o.master = body

                            o.define(body.defs[0])
                            o.define('roaringParent')

                            o.team = body.team
                            o.SIZE = body.size
                            o.color.base = body.color.base
                            o.master = body
                        }

                        let interval = setInterval(afterImage, 100)
                        setTimeout(() => clearInterval(interval), 1_000)
                    break;
                };
            }
        }
    ],
    TURRETS: [
        {
            TYPE: 'roaringHat2',
            POSITION: {
                SIZE: 23.5,
                LAYER: 1
            }
        },
        {
            TYPE: 'roaringHat',
            POSITION: {
                SIZE: 20,
                LAYER: 1
            }
        }
    ],
    GUNS: [
        ...weaponStack({
            POSITION: {
                LENGTH: 8,
                WIDTH: 4,
                ASPECT: 1.4,
                X: 8.5
            },
            PROPERTIES: {
                AUTOFIRE: true,
                SHOOT_SETTINGS: combineStats([{reload: 6, recoil: 0, health: 0.5, damage: 2, pen: 1.6, speed: 2/3, range: 0.08, spray: 180}]),
                TYPE: ['bullet', {
                    ALPHA: 0,
                    LABEL: 'Lance'
                }]
            }
        }, 2, {xPosOffset: 1.5}),
        {
            POSITION: {
                LENGTH: 30,
                WIDTH: 0.377,
                ASPECT: -55
            },
            PROPERTIES: {
                COLOR: '#ffffff',
                BORDERLESS: true
            }
        },
        {
            POSITION: {
                LENGTH: 25,
                WIDTH: 0.3,
                ASPECT: -55
            },
            PROPERTIES: {
                COLOR: '#000000',
                BORDERLESS: true
            }
        },
        {
            POSITION: {
                LENGTH: 2,
                WIDTH: 2,
                ANGLE: 180
            },
            PROPERTIES: {
                SHOOT_SETTINGS: combineStats([g.basic, { reload: 11, recoil: 9.75 * 2 }]),
                TYPE: ['bullet', {ALPHA: 0}],
                IDENTIFIER: 'charge'
            }
        }
    ]
}

Class.gunLayerTest = {
    PARENT: 'genericTank',
    LABEL: "Gun Layer Test",
    GUNS: [
        {
            POSITION: {
                LENGTH: 18,
                WIDTH: 8
            },
            PROPERTIES: {
                SHOOT_SETTINGS: combineStats([g.basic]),
                TYPE: 'bullet'
            }
        },
        {
            POSITION: {
                LENGTH: 18,
                WIDTH: 8,
                Y: -3,
                LAYER: -1
            },
            PROPERTIES: {
                SHOOT_SETTINGS: combineStats([g.basic]),
                TYPE: 'bullet'
            }
        },
        {
            POSITION: {
                LENGTH: 18,
                WIDTH: 8,
                Y: 3,
                LAYER: -3
            },
            PROPERTIES: {
                SHOOT_SETTINGS: combineStats([g.basic]),
                TYPE: 'bullet'
            }
        }
    ]
}

// flail?
ntf_tailConnector = [{
    POSITION: {
        LENGTH: 38,
        WIDTH: 7
    },
    PROPERTIES: {
        COLOR: "darkGrey"
    }
}]
Class.ntf_spike = {
    COLOR: "darkGrey",
    SHAPE: [[-1,-0.5],[1,0],[-1,0.5]]
}
Class.ntf_tailBolt0 = {
    PARENT: 'genericTank',
    COLOR: "grey",
    SHAPE: [[-1,-0.5],[1,-0.5],[1,0.5],[-1,0.5]],
    INDEPENDENT: true,
    HITS_OWN_TYPE: 'hard',
    GUNS: [
        { 
            POSITION: {WIDTH: 10, LENGTH: 10},
            PROPERTIES: {
                SHOOT_SETTINGS: combineStats([g.basic, {
                    range: 0.1,
                    speed: 0,
                    maxSpeed: 0,
                    recoil: 0,
                    reload: 0.1,
                    damage: 4,
                    size: 2,
                    health: 1,
                }]),
                TYPE: ["bullet", {
                    ALPHA: 0,
                    COLOR: 'teal',
                    ON: [{
                        event: 'tick',
                        handler: ({body}) => {
                            body.DAMAGE -= 1;
                            body.SIZE -= 0.6;
                            if (body.SIZE < 1) body.kill();
                        }
                    }],
                }], 
                AUTOFIRE: true,
                BORDERLESS: true,
                DRAW_FILL: false,
            }
        }
    ],
    PROPS: [
        {
            TYPE: "ntf_spike",
            POSITION: {
                SIZE: 16,
                X: 16
            }
        }
    ]
}
Class.ntf_tailBolt1 = {
    PARENT: 'genericTank',
    COLOR: "grey",
    SHAPE: [[-1,-0.5],[1,-0.5],[1,0.5],[-1,0.5]],
    INDEPENDENT: true,
    GUNS: ntf_tailConnector,
    TURRETS: [
        {
            TYPE: "ntf_tailBolt0",
            POSITION: {
                SIZE: 20,
                X: 36,
                ANGLE: 360,
                ARC: 360,
                LAYER: 1
            }
        }
    ]
}
Class.ntf_tailBolt2 = {
    PARENT: 'genericTank',
    COLOR: "grey",
    SHAPE: [[-1,-0.5],[1,-0.5],[1,0.5],[-1,0.5]],
    INDEPENDENT: true,
    GUNS: ntf_tailConnector,
    TURRETS: [
        {
            TYPE: "ntf_tailBolt1",
            POSITION: {
                SIZE: 20,
                X: 36,
                ANGLE: 360,
                ARC: 360,
                LAYER: 1
            }
        }
    ],
}
Class.ntf_tailBolt3 = {
    PARENT: 'genericTank',
    COLOR: "grey",
    SHAPE: [[-1,-0.5],[1,-0.5],[1,0.5],[-1,0.5]],
    GUNS: ntf_tailConnector,
    TURRETS: [
        {
            TYPE: "ntf_tailBolt2",
            POSITION: {
                SIZE: 20,
                X: 36,
                ANGLE: 360,
                ARC: 360,
                LAYER: 1
            }
        }
    ]
}
Class.ntf_ear = {
    PARENT: "triangleHat",
    COLOR: "mirror"
}
Class.ntf_tailWhite = {
    COLOR: "pureWhite",
    SHAPE: [[0,-0.5],[-0.25,-0],[0,0.5],[-1,0]],
}
Class.ntf_tail = {
    COLOR: "mirror",
    SHAPE: [[0,-0.5],[1,0],[0,0.5],[-1,0]],
    PROPS: [
        {
            TYPE: "ntf_tailWhite",
            POSITION: {
                SIZE: 20,
                ANGLE: 180,
                LAYER: 1
            }
        }
    ]
}
Class.ntf = {
    PARENT: 'genericTank',
    LABEL: "???",
    NAME: "Nine",
    UPGRADE_LABEL: "???",
    UPGRADE_TOOLTIP: "You've been hacked by-",
    COLOR: "#f9bd4e", //"#fbbf4f", //"#d69f45",
    UPGRADE_COLOR: "#f9bd4e",
    GUNS: [
        {
            POSITION: {
                LENGTH: 18,
                WIDTH: 8
            },
            PROPERTIES: {
                SHOOT_SETTINGS: combineStats([g.basic]),
                TYPE: ['bullet', {COLOR: 'teal'}],
                COLOR: '#c7c7cf'
            }
        },
        {
            POSITION: {
                LENGTH: 12,
                WIDTH: 8,
                ASPECT: -1.75
            }
        }
    ],
    TURRETS: [
        ...weaponMirror([
            {
                TYPE: ["ntf_tailBolt3", {INDEPENDENT: true}],
                POSITION: {
                    SIZE: 7.5,
                    X: 6.5,
                    ANGLE: 167.5,
                    ARC: 190
                }
            },
            {
                TYPE: ["ntf_tailBolt3", {INDEPENDENT: true}],
                POSITION: {
                    SIZE: 7.5,
                    X: 9.5,
                    ANGLE: 171.25,
                    ARC: 190
                }
            },
            {
                TYPE: ["ntf_tailBolt3", {INDEPENDENT: true}],
                POSITION: {
                    SIZE: 7.5,
                    X: 11,
                    ANGLE: 175,
                    ARC: 190
                }
            }
        ]),
        {
            TYPE: ["ntf_tailBolt3", {INDEPENDENT: true}],
            POSITION: {
                SIZE: 7.5,
                X: 12,
                ANGLE: 180,
                ARC: 190
            }
        },
        ...weaponMirror({
            TYPE: "ntf_tail",
            POSITION: {
                SIZE: 18,
                X: 16,
                ANGLE: 195,
                ARC: 190
            }
        })
    ],
    PROPS: weaponMirror([
        {
            TYPE: ["circleHat", {COLOR: "lightGrey"}],
            POSITION: {
                SIZE: 4,
                X: 12,
                LAYER: 1
            }
        },
        {
            TYPE: ["circleHat", {COLOR: "lime"}],
            POSITION: {
                SIZE: 3,
                X: 12,
                LAYER: 1
            }
        },
        {
            TYPE: ["circleHat", {COLOR: "mirror"}],
            POSITION: {
                SIZE: 20,
                LAYER: 1
            }
        },
        {
            TYPE: "ntf_ear",
            POSITION: {
                SIZE: 6,
                X: 12.5,
                ANGLE: 135,
                LAYER: 1
            }
        },
        {
            TYPE: ["triangleHat", {COLOR: "brown"}],
            POSITION: {
                SIZE: 3,
                X: 15,
                ANGLE: 135,
                LAYER: 1
            }
        },
        {
            TYPE: ["triangleHat", {COLOR: "pureWhite"}],
            POSITION: {
                SIZE: 3,
                X: 34/3,
                ANGLE: 135,
                LAYER: 1
            }
        },
        {
            TYPE: ["circleHat", {COLOR: "black"}],
            POSITION: {
                SIZE: 12,
                LAYER: 1
            }
        },
        {
            TYPE: ["circleHat", {COLOR: "teal"}],
            POSITION: {
                SIZE: 9,
                LAYER: 1
            }
        },
        {
            TYPE: ["circleHat", {COLOR: "black"}],
            POSITION: {
                SIZE: 7,
                LAYER: 1
            }
        }
    ])
}

// to be sorted later
Class.bacteria = {
    PARENT: 'genericTank',
    LABEL: 'Bacteria',
    MAX_BULLETS: 32,
    CONNECT_CHILDREN_ON_CAMERA: true,
    GUNS: [
        {
            POSITION: {
                LENGTH: 5,
                WIDTH: 32
            },
            PROPERTIES: {
                SHOOT_SETTINGS: combineStats([g.basic, {reload: 2, recoil: 0.25, shudder: 0.1, size: 0.62, speed: 2}]),
                TYPE: "bacteriaClone",
                NO_LIMITATIONS: true,
                WAIT_TO_CYCLE: true,
            }
        }
    ]
}
Class.bacteriaClone = {
    PARENT: 'genericTank',
    LABEL: 'Bacteria',
    FACING_TYPE: 'smoothToTarget',
    CONTROLLERS: ['mapTargetToGoal'],
    BODY: {
        SPEED: base.SPEED * 0.5
    },
    CONNECT_CHILDREN_ON_CAMERA: true,
    CLEAR_ON_MASTER_UPGRADE: false,
    GUNS: [
        {
            POSITION: {
                LENGTH: 5,
                WIDTH: 32
            }
        }
    ],
    //GUNS: Class.bacteria.GUNS // server stress test mode
}
class io_turretWithMotion extends IO {
    constructor(b, opts = {}) {
        super(b)
    }
    think(input) {
        return {
            target: this.body.master.velocity,
            main: true,
        };
    }
}
ioTypes.turretWithMotion = io_turretWithMotion
Class.latDeco1 = {
    PARENT: 'genericTank',
    LABEL: "Tank Deco",
    FACING_TYPE: ["turnWithSpeed"],
    COLOR: "#5C533F",
    SHAPE: "M -1 -2 C -1 -2 -1 -3 0 -3 C 1 -3 1 -2 1 -2 V 2 C 1 2 1 3 0 3 C -1 3 -1 2 -1 2 V -2",
    MIRROR_MASTER_ANGLE: true,
}
Class.latDeco2 = {
    PARENT: 'genericTank',
    LABEL: "Tank Deco",
    FACING_TYPE: ["turnWithSpeed"],
    COLOR: "#5C533F",
    SHAPE: "M -2 0 H 2 L 0 1 L -2 0",
    MIRROR_MASTER_ANGLE: true,
}
Class.latDeco3 = {
    PARENT: 'genericTank',
    LABEL: "Tank Deco",
    FACING_TYPE: ["turnWithSpeed"],
    COLOR: "#3F3B2D",
    SHAPE: "M -10 -1 L 10 -1 L 10 1 L -10 1 L -10 -1",
    MIRROR_MASTER_ANGLE: true,
}
Class.latRight = {
    PARENT: 'genericTank',
    LABEL: "Tank Side",
    FACING_TYPE: ["turnWithSpeed"],
    COLOR: "#96794E",
    SHAPE: "M -6 0 H 5 V 1 C 5 2 4 2 4 2 H -5 C -6 2 -6 1 -6 1 V 0",
    MIRROR_MASTER_ANGLE: true,
    TURRETS: [
        {
            POSITION: [4.8, 31, 10, 0, 0, 1],
            TYPE: "latDeco1",
        },
        {
            POSITION: [4.8, 24, 10, 0, 0, 1],
            TYPE: "latDeco1",
        },
        {
            POSITION: [4.8, 17, 10, 0, 0, 1],
            TYPE: "latDeco1",
        },
        {
            POSITION: [4.8, -42, 10, 0, 0, 1],
            TYPE: "latDeco1",
        },
        {
            POSITION: [4.8, -35, 10, 0, 0, 1],
            TYPE: "latDeco1",
        },
        {
            POSITION: [4.8, -28, 10, 0, 0, 1],
            TYPE: "latDeco1",
        },
        {
            POSITION: [18, -5, 0, 0, 0, 1],
            TYPE: "latDeco2",
        },
    ]
}
Class.latLeft = {
    PARENT: 'genericTank',
    LABEL: "Tank Side",
    FACING_TYPE: ["turnWithSpeed"],
    COLOR: "#96794E",
    SHAPE: "M -5 0 H 6 V 1 C 6 2 5 2 5 2 H -4 C -5 2 -5 1 -5 1 V 0",
    MIRROR_MASTER_ANGLE: true,
    TURRETS: [
        {
            POSITION: [4.8, -31, 10, 0, 0, 1],
            TYPE: "latDeco1",
        },
        {
            POSITION: [4.8, -24, 10, 0, 0, 1],
            TYPE: "latDeco1",
        },
        {
            POSITION: [4.8, -17, 10, 0, 0, 1],
            TYPE: "latDeco1",
        },
        {
            POSITION: [4.8, 42, 10, 0, 0, 1],
            TYPE: "latDeco1",
        },
        {
            POSITION: [4.8, 35, 10, 0, 0, 1],
            TYPE: "latDeco1",
        },
        {
            POSITION: [4.8, 28, 10, 0, 0, 1],
            TYPE: "latDeco1",
        },
        {
            POSITION: [18, 5, 0, 0, 0, 1],
            TYPE: "latDeco2",
        },
    ]
}
Class.latBase = {
    PARENT: 'genericTank',
    LABEL: "Tank Base",
    CONTROLLERS: ["turretWithMotion"],
    COLOR: "#96794E",
    SHAPE: [
        [1.1, 1],
        [1.4, 0],
        [1.1, -1],
        [-1.1, -1],
        [-0.8, 0],
        [-1.1, 1]
    ],
    GUNS: [
        {
            POSITION: [16, 5.5, 1, 1, 6.5, 0, 0]
        },
        {
            POSITION: [14.5, 5.5, 1, 1, 6.5, 0, 0]
        },
        {
            POSITION: [13, 5.5, 1, 1, 6.5, 0, 0]
        },
        {
            POSITION: [16, 5.5, 1, 1, -6.5, 0, 0]
        },
        {
            POSITION: [14.5, 5.5, 1, 1, -6.5, 0, 0]
        },
        {
            POSITION: [13, 5.5, 1, 1, -6.5, 0, 0]
        },
        {
            POSITION: [13, 5.5, 1, 1, 6.5, 180, 0]
        },
        {
            POSITION: [11.5, 5.5, 1, 1, 6.5, 180, 0]
        },
        {
            POSITION: [10, 5.5, 1, 1, 6.5, 180, 0]
        },
        {
            POSITION: [8.5, 5.5, 1, 1, 6.5, 180, 0]
        },
        {
            POSITION: [13, 5.5, 1, 1, -6.5, 180, 0]
        },
        {
            POSITION: [11.5, 5.5, 1, 1, -6.5, 180, 0]
        },
        {
            POSITION: [10, 5.5, 1, 1, -6.5, 180, 0]
        },
        {
            POSITION: [8.5, 5.5, 1, 1, -6.5, 180, 0]
        },
    ],
    TURRETS: [
        {
            POSITION: [5.3, 0, -10, 0, 0, 1],
            TYPE: "latLeft",
        },
        {
            POSITION: [5.3, 0, -10, 180, 0, 1],
            TYPE: "latRight",
        },
        {
            POSITION: [2, 0, -1.4, 90, 0, 1],
            TYPE: "latDeco3",
        },
    ]
}
Class.literallyATank = {
    PARENT: 'genericTank',
    LABEL: "Literally A Tank",
    DANGER: 6,
    BODY: {
        HEALTH: base.HEALTH * 1.2,
    },
    SHAPE: "M -1 -1 H 0 C 1 -1 1 0 1 0 C 1 0 1 1 0 1 H -1 V -1",
    GUNS: [
        {
            POSITION: [30, 8, 1, 0, 0, 0, 0]
        },
        {
            POSITION: [4, 8, -1.4, 8, 0, 0, 0]
        },
        {
            POSITION: [12, 8, 1.3, 30, 0, 0, 0],
            PROPERTIES: {
                SHOOT_SETTINGS: combineStats([g.basic, { reload: 3, damage: 1.2, shudder: 0.5 }]),
                TYPE: "developerBullet"
            }
        },
        {
            POSITION: [2, 11, 1, 34, 0, 0, 0]
        }
    ],
    TURRETS: [
        {
            POSITION: [15, 0, 0, 0, 360, 1],
            TYPE: [ "circleHat", { COLOR: "#5C533F" } ],
        },
        {
            POSITION: [10, 0, 0, 0, 360, 1],
            TYPE: [ "circleHat", { COLOR: "#736245" } ],
        },
        {
            POSITION: [35, 0, 0, 0, 360, 0],
            TYPE: [ "latBase", { COLOR: "#96794E" } ],
        },
    ]
}

// airblast testing
Class.airblastBullet = {PARENT: "bullet", ALPHA: 0.5, BODY: {KNOCKBACK: 30}}
Class.airblast = {
    PARENT: 'genericTank',
    LABEL: "Airblast",
    GUNS: [
        {
            POSITION: {
                LENGTH: 12,
                WIDTH: 10,
                ASPECT: 1.4,
                X: 8
            },
            PROPERTIES: {
                SHOOT_SETTINGS: combineStats([g.basic, g.machineGun]),
                TYPE: "airblastBullet"
            }
        },
        {
            POSITION: {
                LENGTH: 14,
                WIDTH: 8,
                ASPECT: 1.4,
                X: 8
            }
        }
    ]
}
Class.trichip = {
    PARENT: "sunchip",
    NECRO: [3],
    SHAPE: 3
}
Class.anglemancer = {
    PARENT: 'genericTank',
    LABEL: "Anglemancer",
    DANGER: 7,
    NECRO: true,
    STAT_NAMES: statnames.drone,
    BODY: {
        SPEED: base.SPEED * 0.9,
        FOV: base.FOV * 1.1,
    },
    SHAPE: 3,
    MAX_CHILDREN: 12,
    GUNS: weaponArray({
        POSITION: [5, 11, 1.3, 7, 0, 180, 0],
        PROPERTIES: {
            SHOOT_SETTINGS: combineStats([g.drone, g.sunchip, { reload: 0.8 }]),
            TYPE: "trichip",
            AUTOFIRE: true,
            SYNCS_SKILLS: true,
            STAT_CALCULATOR: "necro",
            WAIT_TO_CYCLE: true,
            DELAY_SPAWN: false,
        }
    }, 3)
}
Class.cycloneM1 = {
    PARENT: 'genericTank',
    LABEL: "",
    DANGER: 6,
    GUNS: weaponArray([
        {
            POSITION: {
                LENGTH: 15,
                WIDTH: 3.5
            },
            PROPERTIES: {
                SHOOT_SETTINGS: combineStats([g.basic, g.twin, g.gunner, g.cyclone]),
                TYPE: "bullet"
            }
        },
        {
            POSITION: {
                LENGTH: 15,
                WIDTH: 3.5,
                ANGLE: 40,
                DELAY: 1/3
            },
            PROPERTIES: {
                SHOOT_SETTINGS: combineStats([g.basic, g.twin, g.gunner, g.cyclone]),
                TYPE: "bullet"
            }
        },
        {
            POSITION: {
                LENGTH: 15,
                WIDTH: 3.5,
                ANGLE: 80,
                DELAY: 2/3
            },
            PROPERTIES: {
                SHOOT_SETTINGS: combineStats([g.basic, g.twin, g.gunner, g.cyclone]),
                TYPE: "bullet"
            }
        }
    ], 3)
}
Class.gunnerCruiser = {
    PARENT: 'genericTank',
    LABEL: "Gunner Cruiser",
    DANGER: 7,
    GUNS: [
        ...weaponMirror([
            {
                POSITION: {
                    LENGTH: 9,
                    WIDTH: 8.2,
                    ASPECT: 0.6,
                    X: 3,
                    Y: 1.5,
                    ANGLE: 22.5
                },
                PROPERTIES: {
                    SHOOT_SETTINGS: combineStats([g.swarm]),
                    TYPE: "swarm",
                    STAT_CALCULATOR: "swarm",
                },
            },
            {
                POSITION: {
                    LENGTH: 19,
                    WIDTH: 2,
                    Y: -2.5
                },
                PROPERTIES: {
                    SHOOT_SETTINGS: combineStats([g.basic, g.pelleter, g.power, g.twin, { speed: 0.7, maxSpeed: 0.7 }, g.flankGuard, { recoil: 1.8 }]),
                    TYPE: "bullet"
                }
            }
        ], {delayIncrement: 0.5}),
        {
            POSITION: {
                LENGTH: 12,
                WIDTH: 11
            }
        }
    ]
}

// Testing tanks
Class.diamondShape = {
    PARENT: "basic",
    LABEL: "Rotated Body",
    SHAPE: 4.5
}
Class.miscTestHelper2 = {
    PARENT: 'genericTank',
    LABEL: "Turret Reload 3",
    MIRROR_MASTER_ANGLE: true,
    COLOR: -1,
    GUNS: [
        {
            POSITION: [18, 8, 1, 0, 0, 0, 0],
            PROPERTIES: {
                SHOOT_SETTINGS: combineStats([g.basic, g.noSpread]),
                TYPE: "bullet",
                COLOR: -1,
            },
        },
    ],
}
Class.miscTestHelper = {
    PARENT: 'genericTank',
    LABEL: "Turret Reload 2",
    //MIRROR_MASTER_ANGLE: true,
    COLOR: {
        BASE: -1,
        BRIGHTNESS_SHIFT: 15,
    },
    GUNS: [
        {
            POSITION: [18, 8, 1, 0, 0, 0, 0],
            PROPERTIES: {
                SHOOT_SETTINGS: combineStats([g.basic, g.noSpread]),
                TYPE: "bullet",
                COLOR: -1,
            },
        },
    ],
    TURRETS: [
        {
          POSITION: [20, 0, 20, 30, 0, 1],
          TYPE: "miscTestHelper2",
        }
    ]
}
Class.miscTest = {
    PARENT: 'genericTank',
    LABEL: "Turret Reload",
    COLOR: "teal",
    GUNS: [
        {
            POSITION: [18, 8, 1, 0, 0, 0, 0],
            PROPERTIES: {
                SHOOT_SETTINGS: combineStats([g.basic, g.noSpread]),
                TYPE: "bullet",
            },
        },
    ],
    TURRETS: [
        {
            POSITION: [20, 0, 20, 30, 0, 1],
            TYPE: "miscTestHelper",
        }
    ]
}
Class.mmaTest2 = {
    PARENT: 'genericTank',
    MIRROR_MASTER_ANGLE: true,
    COLOR: "grey",
    GUNS: [{
            POSITION: [40, 4, 1, -20, 0, 0, 0],
        }],
}
Class.mmaTest1 = {
    PARENT: 'genericTank',
    COLOR: -1,
    TURRETS: [
        {
            POSITION: [10, 0, 0, 0, 360, 1],
            TYPE: "mmaTest2",
        }
    ]
}
Class.mmaTest = {
    PARENT: 'genericTank',
    LABEL: "Mirror Master Angle",
    TURRETS: [
        {
            POSITION: [10, 0, 0, 0, 360, 1],
            TYPE: "mmaTest2",
        },
        {
            POSITION: [20, 0, 20, 0, 360, 1],
            TYPE: "mmaTest1",
        },
    ]
}
Class.vulnturrettest_turret = {
    PARENT: 'genericTank',
    COLOR: "grey",
    HITS_OWN_TYPE: 'hard',
    LABEL: 'Shield',
    COLOR: 'teal',
}
Class.vulnturrettest = {
    PARENT: 'genericTank',
    LABEL: "Vulnerable Turrets",
    TOOLTIP: "[DEV NOTE] Vulnerable turrets are still being worked on and may not function as intended!",
    BODY: {
        FOV: 2,
    },
    DANGER: 6,
    GUNS: [{
        POSITION: {},
        PROPERTIES: {
            SHOOT_SETTINGS: combineStats([g.basic]),
            TYPE: 'bullet'
        }
    }],
    TURRETS: weaponArray({
        POSITION: {SIZE: 20, X: 40},
        TYPE: "vulnturrettest_turret",
        VULNERABLE: true
    }, 10)
}
Class.turretLayerTesting = {
    PARENT: 'genericTank',
    LABEL: 'Turret Layer Testing',
    TURRETS: [
        {
            POSITION: [20, 10, 10, 0, 0, 2],
            TYPE: ["basic", {COLOR: "lightGrey", MIRROR_MASTER_ANGLE: true}]
        },
        {
            POSITION: [20, 15, 5, 0, 0, 2],
            TYPE: ["basic", {COLOR: "grey", MIRROR_MASTER_ANGLE: true}]
        },
        {
            POSITION: [20, 10, -5, 0, 0, 1],
            TYPE: ["basic", {COLOR: "darkGrey", MIRROR_MASTER_ANGLE: true}]
        },
        {
            POSITION: [20, -10, -5, 0, 0, -2],
            TYPE: ["basic", {COLOR: "darkGrey", MIRROR_MASTER_ANGLE: true}]
        },
        {
            POSITION: [20, -10, 5, 0, 0, -1],
            TYPE: ["basic", {COLOR: "grey", MIRROR_MASTER_ANGLE: true}]
        },
    ]
}
Class.alphaGunTest = {
    PARENT: "basic",
    LABEL: "Translucent Guns",
    GUNS: [{
        POSITION: {},
        PROPERTIES: {
            SHOOT_SETTINGS: combineStats([g.basic]),
            TYPE: 'bullet',
            ALPHA: 0.5
        }
    }]
}
Class.radialAutoTest = makeRadialAuto("gunner", {
    count: 5,
    isTurret: false,
    extraStats: {spray: 4, speed: 1.4, maxSpeed: 1.4, recoil: 0.2},
    turretIdentifier: "radialAutoTestTurret",
    size: 8,
    x: 10,
    arc: 220,
    angle: 36,
    label: "Radial Auto Test",
    rotation: 0.04,
    danger: 10,
})
Class.imageShapeTest = {
    PARENT: 'genericTank',
    LABEL: "Image Shape Test",
    SHAPE: 'image=/round.png',
    GUNS: Class.basic.GUNS
}
Class.screenShakeTest = {
    PARENT: 'genericTank',
    LABEL: "Screen Shake Test",
    COLOR: 36,
    SHAKE: [
        {
            CAMERA_SHAKE: {
                DURATION: 2000,
                AMOUNT: 15,
            },
            GUI_SHAKE: {
                DURATION: 1000,
                AMOUNT: 10,
            },
            APPLY_ON_UPGRADE: true,
        },
        {
            CAMERA_SHAKE: {
                DURATION: 800,
                AMOUNT: 10,
            },
            GUI_SHAKE: {
                DURATION: 600,
                AMOUNT: 6,
            },
            PUSH: true,
            APPLY_ON_SHOOT: true,   
        },
    ],
    GUNS: Class.basic.GUNS
}
Class.strokeWidthTest = {
    PARENT: "basic",
    LABEL: "Stroke Width Test",
    STROKE_WIDTH: 2,
    GUNS: [{
        POSITION: {},
        PROPERTIES: {
            SHOOT_SETTINGS: combineStats([g.basic]),
            TYPE: 'bullet',
            STROKE_WIDTH: 0.5
        }
    }]
}
Class.onTest = {
    PARENT: 'genericTank',
    LABEL: "ON property test",
    TOOLTIP: "Refer to Class.onTest in dev/tanks.js to know more.",
    ON: [{
        event: "fire",
        handler: ({ body, gun }) => {
            switch (gun.identifier) {
                case 'mainGun':
                    body.sendMessage(`I fired my main gun.`)
                    break;
                case 'secondaryGun':
                    body.sendMessage('I fired my secondary gun.')
                    break;
            }
        }
    }, {
        event: "altFire",
        handler: ({ body, gun }) => {
            body.sendMessage(`I fired my alt gun.`)
        }
    }, {
        event: "death",
        handler: ({ body, killers, killTools }) => {
            const killedOrDied = killers.length === 0 ? 'died.' : 'got killed.'
            body.sendMessage(`I ${killedOrDied}`)
        }
    }, {
        event: "collide",
        handler: ({ body, instance, other }) => {
            instance.sendMessage(`I collided with ${other.label}.`)
            body.destroy()
            other.SIZE = other.SIZE * Math.SQRT2
        }
    }, {
        event: "damage",
        handler: ({ body, damageInflictor, damageTool }) => { 
            body.sendMessage(`I got hurt.`)
        }
    }],
    GUNS: [{
        POSITION: {},
        PROPERTIES: {
            SHOOT_SETTINGS: combineStats([g.basic]),
            TYPE: 'bullet',
            IDENTIFIER: 'mainGun'
        }
    }, {
        POSITION: { ANGLE: 90 },
        PROPERTIES: {
            SHOOT_SETTINGS: combineStats([g.basic]),
            TYPE: 'bullet',
            ALT_FIRE: true
        }
    }, {
        POSITION: { ANGLE: 180, DELAY: 0.5 },
        PROPERTIES: {
            SHOOT_SETTINGS: combineStats([g.basic]),
            TYPE: 'bullet',
            IDENTIFIER: 'secondaryGun'
        }
    }]
}
Class.turretStatScaleTest = {
    PARENT: 'genericTank',
    LABEL: 'Turret Stat Test',
    TURRETS: Array(5).fill().map((_, i) => ({
        POSITION: [15, 0, -40 + 20 * i, 0, 360, 1],
        TYPE: ['autoTankGun', {GUN_STAT_SCALE: {speed: 1 + i / 5, maxSpeed: 1 + i / 5, reload: 1 + i / 5, recoil: 0}}]
    }))
}
Class.auraBasicGen = makeAura();
Class.auraBasic = {
    PARENT: 'genericTank',
    LABEL: "Aura Basic",
    TURRETS: [
        {
            POSITION: [14, 0, 0, 0, 0, 1],
            TYPE: "auraBasicGen"
        }
    ],
    GUNS: Class.basic.GUNS
}
Class.auraHealerGen = makeAura(-1);
Class.auraHealer = {
    PARENT: 'genericTank',
    LABEL: "Aura Healer",
    TURRETS: [
        {
            POSITION: [14, 0, 0, 0, 0, 1],
            TYPE: "auraHealerGen"
        }
    ],
    GUNS: Class.healer.GUNS
}
Class.ghoster_ghosted = {
    PARENT: 'genericTank',
    TOOLTIP: 'You are now invisible, roam around and find your next target. You will be visible again in 5 seconds',
    LABEL: 'Ghoster',
    BODY: {
        SPEED: 20,
        ACCELERATION: 10,
        FOV: base.FOV + 1,
    },
    GUNS: [{
        POSITION: { WIDTH: 20, LENGTH: 20 },
    }],
    ALPHA: 0.6,
}
Class.ghoster = {
    PARENT: 'genericTank',
    LABEL: 'Ghoster',
    TOOLTIP: 'Shooting will turn you invisible for 5 seconds',
    BODY: {
        SPEED: base.SPEED,
        ACCELERATION: base.ACCEL,
    },
    ON: [
        {
            event: 'fire',
            handler: ({ body }) => {
                body.define("ghoster_ghosted")
                setTimeout(() => {
                    body.SPEED = 1e-99
                    body.ACCEL = 1e-99
                    body.FOV *= 2
                    body.alpha = 1
                }, 2000)
                setTimeout(() => {
                    body.SPEED = base.SPEED
                    body.define("ghoster")
                }, 2500)
            }
        }
    ],
    GUNS: [{
        POSITION: {WIDTH: 20, LENGTH: 20},
        PROPERTIES: {
            TYPE: 'bullet',
            SHOOT_SETTINGS: combineStats([g.basic, g.pounder, g.destroyer, g.annihilator]),
        }
    }],
    ALPHA: 1,
}
Class.switcheroo = {
    PARENT: "basic",
    LABEL: 'Switcheroo',
    UPGRADES_TIER_0: [],
    RESET_UPGRADE_MENU: true,
    ON: [
        {
            event: "fire",
            handler: ({ body, globalMasterStore: store, gun }) => {
                if (gun.identifier !== 'switcherooGun') return
                store.switcheroo_i ??= 0;
                store.switcheroo_i++;
                store.switcheroo_i %= 6;
                body.define(Class.basic.UPGRADES_TIER_1[store.switcheroo_i]);
                setTimeout(() => body.define("switcheroo"), 6000);
            }
        }
    ],
    GUNS: [{
        POSITION: {},
        PROPERTIES: {
            SHOOT_SETTINGS: combineStats([g.basic]),
            TYPE: 'bullet',
            IDENTIFIER: 'switcherooGun'
        }
    }]
}
Class.vanquisher = {
    PARENT: 'genericTank',
    DANGER: 8,
    LABEL: "Vanquisher",
    STAT_NAMES: statnames.mixed,
    CONTROLLERS: ['stackGuns'],
    BODY: {
        SPEED: 0.8 * base.SPEED,
    },
    //destroyer
    GUNS: [{
        POSITION: [21, 14, 1, 0, 0, 180, 0],
        PROPERTIES: {
            SHOOT_SETTINGS: combineStats([g.basic, g.pounder, g.destroyer]),
            TYPE: "bullet"
        }

    //builder
    },{
        POSITION: [18, 12, 1, 0, 0, 0, 0],
    },{
        POSITION: [2, 12, 1.1, 18, 0, 0, 0],
        PROPERTIES: {
            SHOOT_SETTINGS: combineStats([g.trap, g.setTrap]),
            TYPE: "setTrap",
            STAT_CALCULATOR: "block"
        }

    //launcher
    },{
        POSITION: [10, 9, 1, 9, 0, 90, 0],
    },{
        POSITION: [17, 13, 1, 0, 0, 90, 0],
        PROPERTIES: { SHOOT_SETTINGS: combineStats([g.basic, g.pounder, g.artillery, g.artillery]), TYPE: "launcherMissile", STAT_CALCULATOR: "sustained" }

    //shotgun
    },{
        POSITION: [4, 3, 1, 11, -3, 270, 0],
        PROPERTIES: { SHOOT_SETTINGS: combineStats([g.basic, g.machineGun, g.shotgun]), TYPE: "bullet" }
    },{
        POSITION: [4, 3, 1, 11, 3, 270, 0],
        PROPERTIES: { SHOOT_SETTINGS: combineStats([g.basic, g.machineGun, g.shotgun]), TYPE: "bullet" }
    },{
        POSITION: [4, 4, 1, 13, 0, 270, 0],
        PROPERTIES: { SHOOT_SETTINGS: combineStats([g.basic, g.machineGun, g.shotgun]), TYPE: "casing" }
    },{
        POSITION: [1, 4, 1, 12, -1, 270, 0],
        PROPERTIES: { SHOOT_SETTINGS: combineStats([g.basic, g.machineGun, g.shotgun]), TYPE: "casing" }
    },{
        POSITION: [1, 4, 1, 11, 1, 270, 0],
        PROPERTIES: { SHOOT_SETTINGS: combineStats([g.basic, g.machineGun, g.shotgun]), TYPE: "casing" }
    },{
        POSITION: [1, 3, 1, 13, -1, 270, 0],
        PROPERTIES: { SHOOT_SETTINGS: combineStats([g.basic, g.machineGun, g.shotgun]), TYPE: "bullet" }
    },{
        POSITION: [1, 3, 1, 13, 1, 270, 0],
        PROPERTIES: { SHOOT_SETTINGS: combineStats([g.basic, g.machineGun, g.shotgun]), TYPE: "bullet" }
    },{
        POSITION: [1, 2, 1, 13, 2, 270, 0],
        PROPERTIES: { SHOOT_SETTINGS: combineStats([g.basic, g.machineGun, g.shotgun]), TYPE: "casing" }
    }, {
        POSITION: [1, 2, 1, 13, -2, 270, 0],
        PROPERTIES: { SHOOT_SETTINGS: combineStats([g.basic, g.machineGun, g.shotgun]), TYPE: "casing" }
    }, {
        POSITION: [15, 14, 1, 6, 0, 270, 0],
        PROPERTIES: { SHOOT_SETTINGS: combineStats([g.basic, g.machineGun, g.shotgun, g.fake]), TYPE: "casing" }
    }, {
        POSITION: [8, 14, -1.3, 4, 0, 270, 0]
    }]
}
Class.armyOfOneBullet = {
    PARENT: "bullet",
    LABEL: "Unstoppable",
    TURRETS: [
        {
            POSITION: [18.5, 0, 0, 0, 360, 0],
            TYPE: ["triangleHat_spin", { COLOR: "mirror" }]
        },
        {
            POSITION: [18.5, 0, 0, 180, 360, 0],
            TYPE: ["triangleHat_spin", { COLOR: "mirror" }]
        }
    ]
}
Class.armyOfOne = {
    PARENT: 'genericTank',
    LABEL: "Army Of One",
    DANGER: 9,
    SKILL_CAP: [31, 31, 31, 31, 31, 31, 31, 31, 31, 31],
    BODY: {
        SPEED: 0.5 * base.SPEED,
        FOV: 1.8 * base.FOV,
    },
    GUNS: [
        {
            POSITION: [21, 19, 1, 0, 0, 0, 0],
            PROPERTIES: {
                SHOOT_SETTINGS: combineStats([g.basic, g.pounder, g.destroyer, g.destroyer, g.destroyer, g.destroyer, g.sniper, g.sniper, g.sniper, g.sniper, g.sniper, g.sniper, g.sniper, { reload: 0.5 }, { reload: 0.5 }, { reload: 0.5 }, { reload: 0.5 }]),
                TYPE: "armyOfOneBullet",
            },
        },{
            POSITION: [21, 11, 1, 0, 0, 0, 0],
            PROPERTIES: {
                SHOOT_SETTINGS: combineStats([g.basic, g.pounder, g.destroyer, g.destroyer, g.destroyer, g.destroyer, g.sniper, g.sniper, g.sniper, g.sniper, g.sniper, g.sniper, g.sniper, { reload: 0.5 }, { reload: 0.5 }, { reload: 0.5 }, { reload: 0.5 }, g.fake]),
                TYPE: "bullet",
            },
        }
    ],
}
Class.tooltipTank = {
    PARENT: 'genericTank',
    LABEL: "Tooltips",
    UPGRADE_TOOLTIP: "Allan please add details"
}
Class.bulletSpawnTest = {
    PARENT: 'genericTank',
    LABEL: "Bullet Spawn Position",
    GUNS: [
        {
            POSITION: [20, 10, 1, 0, -5, 0, 0],
            PROPERTIES: {
                SHOOT_SETTINGS: combineStats([g.basic, {speed: 0, maxSpeed: 0, shudder: 0, spray: 0, recoil: 0}]),
                TYPE: ['bullet', {BORDERLESS: true}],
                BORDERLESS: true,
            }
        }, {
            POSITION: [50, 10, 1, 0, 5, 0, 0],
            PROPERTIES: {
                SHOOT_SETTINGS: combineStats([g.basic, {speed: 0, maxSpeed: 0, shudder: 0, spray: 0, recoil: 0}]),
                TYPE: ['bullet', {BORDERLESS: true}],
                BORDERLESS: true,
            }
        }
    ]
}
Class.propTestProp = {
    PARENT: 'genericTank',
    SHAPE: 6,
    COLOR: 0,
    GUNS: [
        {
            POSITION: [20, 10, 1, 0, 0, 45, 0],
            PROPERTIES: {COLOR: 13},
        }, {
            POSITION: [20, 10, 1, 0, 0, -45, 0],
            PROPERTIES: {COLOR: 13},
        }
    ]
}
Class.propTest = {
    PARENT: 'genericTank',
    LABEL: 'Deco Prop Test',
    GUNS: Class.basic.GUNS,
    PROPS: [
        {
            POSITION: [10, 0, 0, 0, 1],
            TYPE: 'propTestProp'
        }
    ]
}
Class.weaponArrayTest = {
    PARENT: 'genericTank',
    LABEL: 'Weapon Array Test',
    GUNS: weaponArray([
        {
            POSITION: [20, 8, 1, 0, 0, 25, 0],
            PROPERTIES: {
                SHOOT_SETTINGS: combineStats([g.basic, {reload: 2}]),
                TYPE: 'bullet'
            }
        }, {
            POSITION: [17, 8, 1, 0, 0, 25, 0.1],
            PROPERTIES: {
                SHOOT_SETTINGS: combineStats([g.basic, {reload: 2}]),
                TYPE: 'bullet'
            }
        }
    ], 5, {delayIncrement: 0.4, delayOverflow: true}),
    TURRETS: weaponArray(
        {
            POSITION: [7, 10, 0, -11, 180, 0],
            TYPE: 'autoTankGun'
        }
    , 5),
}
Class.gunBenchmark = {
    PARENT: 'genericTank',
    LABEL: "Gun Benchmark",
    GUNS: weaponArray({
        POSITION: [60, 0.2, 0, 0, 0, 0, 0],
        PROPERTIES: {
            SHOOT_SETTINGS: combineStats([g.basic, {size: 0, reload: 0.15, range: 0.05}]),
            TYPE: ["bullet", {DRAW_SELF: false}]
        }
    }, 720)
}
Class.syncWithTankTest = {
    PARENT: 'genericTank',
    LABEL: "Sync With Tank Test",
    SHAPE: 6,
    SYNC_WITH_TANK: true,
    FACING_TYPE: ["smoothToTarget", { smoothness: 30 }],
    GUNS: Class.basic.GUNS
}
exports.backwardsExports = {
    PARENT: 'genericTank',
    LABEL: "Basic `Exports` exported tank",
    BODY: Class.basic.BODY,
    GUNS: Class.basic.GUNS,
}
let testLayeredBoss = new LayeredBoss("testLayeredBoss", "Test Layered Boss", "terrestrial", 7, 3, "terrestrialTrapTurret", 5, 7, true, {SPEED: 10});
testLayeredBoss.addLayer({gun: {
    POSITION: [3.6, 7, -1.4, 8, 0, null, 0],
    PROPERTIES: {
        SHOOT_SETTINGS: combineStats([g.minion, { size: 0.5 }]),
        TYPE: ["minion", {INDEPENDENT: true}],
        AUTOFIRE: true,
        SYNCS_SKILLS: true,
    },
}}, true, null, 16)
testLayeredBoss.addLayer({turret: {
    POSITION: [10, 7.5, 0, null, 160, 0],
    TYPE: "crowbarTurret",
}}, true)

// DigDig (WIP)
Class.genericDigDig = {
    PARENT: "genericSmasher",
    LABEL: "Digger",
    COLOR: "grey",
    SIZE: Class.genericTank.SIZE * 3,
    TURRETS: [
        {
            TYPE: "digDigHat",
            POSITION: { SIZE: 27 }
        }
    ]
}
Class.digDigSmile = {
    PARENT: "genericDigDig",
    PROPS: []
}
Class.digDigSmile_kirk = {
    PARENT: "genericDigDig",
    PROPS: []
}
Class.digDigFrown = {
    PARENT: "genericDigDig",
    PROPS: []
}
Class.digDigFrown_kirk = {
    PARENT: "genericDigDig",
    PROPS: []
}

global.convertExportsToClass(exports);