const {combineStats, weaponArray, weaponMirror} = require("../facilitators.js")


let suffix = "Gen"
// Generators
const shapeGeneratorUpgrades = [
    ["wall", "egg", "gem"],
    ["gravel", "square", ...rarities("square")],
    ["stone", "triangle", ...rarities("triangle")],
    ["rock", "pentagon", ...rarities("pentagon")],
    ["pumpkin", "betaPentagon", ...rarities("betaPentagon")],
    ["gaybabyjail", "alphaPentagon", ...rarities("alphaPentagon")],
    [null, "crasher"],
    [null, "sentrySwarm", "shinySentrySwarm"],
    [null, "sentryGun", "shinySentryGun"],
    [null, "sentryTrap", "shinySentryTrap"]
].map(array => array.map(x => x + suffix))

Class.genBody = {
    PARENT: "spectator",
    BODY: {
        SPEED: 25,
        FOV: 1
    },
    SKILL_CAP: [15, 0, 0, 0, 0, 0, 0, 0, 0, 15],
    LAYER: 1e99,
    ON: [],
    RESET_EVENTS: true
};
Class.genWall = {
    PARENT: "wall",
    SIZE: Class.wall.SIZE * 2
}
Class.genCrasher = {
    TYPE: [],
    PARENT: "crasher",
    ACCEPTS_SCORE: false,
};
for (let def of ["sentryTrap", "sentryGun", "sentrySwarm"]) {
    Class["gen" + def.at(0).toUpperCase() + def.slice(1, def.length)] = {
        TYPE: [],
        PARENT: def,
        ACCEPTS_SCORE: false,
        CONTROLLERS: ["nearestDifferentMaster", "mapTargetToGoal", "hangOutNearMaster"]
    }
}
for (let def of ["shinySentryTrap", "shinySentryGun", "shinySentrySwarm"]) {
    Class["gen" + def.at(0).toUpperCase() + def.slice(1, def.length)] = {
        TYPE: [],
        PARENT: def,
        SIZE: Class.sentry.SIZE / 1.5,
        ACCEPTS_SCORE: false,
        CONTROLLERS: ["nearestDifferentMaster", "mapTargetToGoal", "hangOutNearMaster"]
    }
    Class["genDisplay" + def.at(0).toUpperCase() + def.slice(1, def.length)] = {
        PARENT: def,
        SIZE: Class.sentry.SIZE,
    }
}

Class["gaybabyjail" + suffix + "arrow"] = {
    PARENT: "genericTank",
    SHAPE: "M -1 -0.3 L 1 -0.3 L 1 -0.9 L 2 0 L 1 0.9 L 1 0.3 L -1 0.3 Z",
    INDEPENDENT: true,
}
Class["gaybabyjail" + suffix + "ring"] = {
    PARENT: "genericTank",
    SHAPE: "M0-1A1 1 0 000 1 1 1 0 000-1M0-.7A.7 .7 0 010 .7 .7 .7 0 010-.7",
    INDEPENDENT: true,
}

//EGG GENERATOR
Class[`egg${suffix}`] = makeGenerator("egg");
//SQUARE GENERATORS
Class[`square${suffix}`] = makeGenerator("square")
Class[`shinySquare${suffix}`] = makeGenerator("shinySquare", "square", 1, 2)
Class[`legendarySquare${suffix}`] = makeGenerator("legendarySquare", "square", 1, 4)
Class[`shadowSquare${suffix}`] = makeGenerator("shadowSquare", "square", 1, 6)
Class[`rainbowSquare${suffix}`] = makeGenerator("rainbowSquare", "square", 1, 8)
Class[`transSquare${suffix}`] = makeGenerator("transSquare", "square", 1, 10)

//TRIANGLE GENERATORS
Class[`triangle${suffix}`] = makeGenerator("triangle")
Class[`shinyTriangle${suffix}`] = makeGenerator("shinyTriangle", "triangle", 1, 3)
Class[`legendaryTriangle${suffix}`] = makeGenerator("legendaryTriangle", "triangle", 1, 6)
Class[`shadowTriangle${suffix}`] = makeGenerator("shadowTriangle", "triangle", 1, 9)
Class[`rainbowTriangle${suffix}`] = makeGenerator("rainbowTriangle", "triangle", 1, 12)
Class[`transTriangle${suffix}`] = makeGenerator("transTriangle", "triangle", 1, 15)

//PENTAGON GENERATORS
Class[`pentagon${suffix}`] = makeGenerator("pentagon")
Class[`shinyPentagon${suffix}`] = makeGenerator("shinyPentagon", "pentagon", 1, 4)
Class[`legendaryPentagon${suffix}`] = makeGenerator("legendaryPentagon", "pentagon", 1, 8)
Class[`shadowPentagon${suffix}`] = makeGenerator("shadowPentagon", "pentagon", 1, 12)
Class[`rainbowPentagon${suffix}`] = makeGenerator("rainbowPentagon", "pentagon", 1, 16)
Class[`transPentagon${suffix}`] = makeGenerator("transPentagon", "pentagon", 1, 20)
//beta
Class[`betaPentagon${suffix}`] = makeGenerator("betaPentagon", null, 1, 15)
Class[`shinyBetaPentagon${suffix}`] = makeGenerator("shinyBetaPentagon", "betaPentagon", 1, 20)
Class[`legendaryBetaPentagon${suffix}`] = makeGenerator("legendaryBetaPentagon", "betaPentagon", 1, 25)
Class[`shadowBetaPentagon${suffix}`] = makeGenerator("shadowBetaPentagon", "betaPentagon", 1, 30)
Class[`rainbowBetaPentagon${suffix}`] = makeGenerator("rainbowBetaPentagon", "betaPentagon", 1, 35)
Class[`transBetaPentagon${suffix}`] = makeGenerator("transBetaPentagon", "betaPentagon", 1, 40)
//alpha
Class[`alphaPentagon${suffix}`] = makeGenerator("alphaPentagon", null, 1, 25)
Class[`shinyAlphaPentagon${suffix}`]  = makeGenerator("shinyAlphaPentagon", "alphaPentagon", 1, 31)
Class[`legendaryAlphaPentagon${suffix}`]  = makeGenerator("legendaryAlphaPentagon", "alphaPentagon", 1, 37)
Class[`shadowAlphaPentagon${suffix}`]  = makeGenerator("shadowAlphaPentagon", "alphaPentagon", 1, 43)
Class[`rainbowAlphaPentagon${suffix}`]  = makeGenerator("rainbowAlphaPentagon", "alphaPentagon", 1, 49)
Class[`transAlphaPentagon${suffix}`]  = makeGenerator("transAlphaPentagon", "alphaPentagon", 1, 55)
//MISC GENERATORS

Class[`gem${suffix}`] = makeGenerator("gem", null, 0, 0)
Class[`wall${suffix}`] = makeGenerator("genWall", null, 0, 0, false, 1)
Class[`gravel${suffix}`] = makeGenerator("gravel", null, 0, 0, false)
Class[`stone${suffix}`] = makeGenerator("stone", null, 0, 0, false)
Class[`rock${suffix}`] = makeGenerator("rock", null, 0, 0, false)
Class[`pumpkin${suffix}`] = makeGenerator("pumpkin", null, 0, 0, false)
Class[`gaybabyjail${suffix}`] = {
    PARENT: "genBody",
    LABEL: `Gay Baby Jail Generator`,
    SHAPE: "M 0.9 0.4 L 1.2 0.3 L 1.2 -0.3 L 0.9 -0.4 A 1 1 0 0 0 0 -1 L -0.3 -1.2 L -0.8 -0.9 L -0.8 -0.6 A 1 1 0 0 0 -0.8 0.6 L -0.8 0.9 L -0.3 1.2 L 0 1 A 1 1 0 0 0 0.9 0.4",
    COLOR: "lightGray",
    SIZE: 24,
    UPGRADES_TIER_0: [],
    BODY: {FOV: 1.5},
    PROPS: [
        ...weaponArray({
            POSITION: {SIZE: 6, X: -6, LAYER: 1, ANGLE: 60},
            TYPE: `gaybabyjail${suffix}arrow`
        },3),
        {
            POSITION: {SIZE: 15, LAYER: 1},
            TYPE: `gaybabyjail${suffix}ring`
        },
    ],
    GUNS: [
        ...weaponArray([
            {
                POSITION: {
                    LENGTH: 1,
                    WIDTH: 5.25,
                    X: -105.5,
                },
                PROPERTIES: {
                    SHOOT_SETTINGS: combineStats([{
                        shudder: 0.1,
                        speed: 0,
                        recoil: 0.1,
                        reload: 6,
                        size: Class.genWall.SIZE / 5.5
                    }]),
                    TYPE: ["genWall", {INDEPENDENT: true}],
                    NO_LIMITATIONS: true,
                }
            },
            {
                POSITION: {
                    LENGTH: 4,
                    WIDTH: 5.25,
                    ASPECT: 2,
                    X: -110
                }
            }
        ], 4),
        ...weaponArray(weaponMirror([
            {
                POSITION: {
                    LENGTH: 1,
                    WIDTH: 5.25,
                    X: -105.5,
                    Y: 40,
                },
                PROPERTIES: {
                    SHOOT_SETTINGS: combineStats([{
                        shudder: 0.1,
                        speed: 0,
                        recoil: 0.1,
                        reload: 6,
                        size: Class.genWall.SIZE / 5.5
                    }]),
                    TYPE: ["genWall", {INDEPENDENT: true}],
                    NO_LIMITATIONS: true,
                }
            },
            {
                POSITION: {
                    LENGTH: 4,
                    WIDTH: 5.25,
                    ASPECT: 2,
                    X: -110,
                    Y: 40,
                }
            }
        ]), 4),
        ...weaponArray([
            {
                POSITION: {
                    LENGTH: 1,
                    WIDTH: 5.25,
                    X: -105.5,
                    ANGLE: 45,
                },
                PROPERTIES: {
                    SHOOT_SETTINGS: combineStats([{
                        shudder: 0.1,
                        speed: 0,
                        recoil: 0.1,
                        reload: 6,
                        size: Class.genWall.SIZE / 5.5
                    }]),
                    TYPE: ["genWall", {INDEPENDENT: true}],
                    NO_LIMITATIONS: true,
                }
            },
            {
                POSITION: {
                    LENGTH: 4,
                    WIDTH: 5.25,
                    ASPECT: 2,
                    X: -110,
                    ANGLE: 45
                }
            }
        ], 4),
        ...weaponArray({
            POSITION: {WIDTH: 95, LENGTH: 4, X: 110},
        }, 8)
    ]
};

//HOSTILE POLYGONS GENERATORS
//crasher
Class[`crasher${suffix}`] = makeGenerator("crasher", null, 0, 0, false)
//sentries
Class[`sentrySwarm${suffix}`] = makeGenerator("genSentrySwarm", null, 1, 0, 0, false)
Class[`sentryGun${suffix}`] = makeGenerator("genSentryGun", null, 1, 0, 0, false)
Class[`sentryTrap${suffix}`] = makeGenerator("genSentryTrap", null, 1, 0, 0, false)
//shiny sentries
Class[`shinySentrySwarm${suffix}`] = makeGenerator("genShinySentrySwarm", "genDisplayShinySentrySwarm", 1, 0, 0, false)
Class[`shinySentryGun${suffix}`] = makeGenerator("genShinySentryGun", "genDisplayShinySentryGun", 1, 0, 0, false)
Class[`shinySentryTrap${suffix}`] = makeGenerator("genShinySentryTrap", "genDisplayShinySentryTrap", 1, 0, 0, false)

function rarities(type = "") {
    const rarities = ["shiny", "legendary", "shadow", "rainbow", "trans"];
    return Array(rarities.length).fill().map((v, i) => rarities[i] + (type.at(0).toUpperCase() + type.slice(1, type.length)));
}
function makeGenerator(entity, displayEntity, launchSpeed = 1, extraSize = 0, variesInSize = true, spawnOffset = 0.75) {
    if (!Class[entity]) return {PARENT: "spectator", LABEL: "Error"};
    let found = {entity: {}, displayEntity: {}};
    let toFind = [
        "SHAPE", "LABEL", "COLOR", "SIZE", "VALUE"
    ]
    const findProperties = (type, returnTo, ...properties) => {
        let canContinue = true;
        if (!Class[type]) canContinue = false
        if (canContinue) {
            if (!properties.length) properties = toFind; 
            properties.forEach(k => {
                if (Class[type][k] !== undefined) returnTo[k] = Class[type][k]
                else if (Class[type].PARENT !== undefined) findProperties(Class[type].PARENT, returnTo, k)
                else returnTo[k] = Class.genericTank[k];
            })
        }
    }
    if (!displayEntity) displayEntity = entity;
    findProperties(entity, found.entity);
    findProperties(displayEntity, found.displayEntity);

    const config = {
        PARENT: "genBody",
        LABEL: `${found.entity.LABEL} Generator`,
        SHAPE: found.entity.SHAPE,
        COLOR: { // prevent shifts from affecting us
            BASE: found.entity.COLOR?.BASE ?? found.entity.COLOR, 
            BRIGHTNESS_SHIFT: found.entity.COLOR?.BRIGHTNESS_SHIFT ?? 0, 
            HUE_SHIFT: found.entity.COLOR?.HUE_SHIFT ?? 0
        },
        UPGRADES_TIER_0: [],
        TURRETS: [{
            TYPE: [displayEntity, {FACING_TYPE: "toTarget", INDEPENDENT: true}],
            POSITION: {
                SIZE: Math.sqrt(found.displayEntity.SIZE) * 2,
                LAYER: 1,
                ARC: 0
            }
        }],

        GUNS: [
            {
                POSITION: {
                    LENGTH: 2,
                    WIDTH: 10.5,
                    X: 15
                },
                PROPERTIES: {
                    SHOOT_SETTINGS: combineStats([{
                        shudder: 0.1,
                        speed: launchSpeed,
                        recoil: 0.1,
                        reload: 6,
                        size: (found.entity.SIZE + extraSize) / 13
                    }]),
                    TYPE: [entity, {INDEPENDENT: true, VARIES_IN_SIZE: variesInSize}],
                    NO_LIMITATIONS: true,
                    SPAWN_OFFSET: spawnOffset,
                }
            },
            {
                POSITION: {
                    LENGTH: 11,
                    WIDTH: 10.5,
                    ASPECT: 1.4,
                    X: 4
                }
            }
        ]
    };

    return config;
};
// GENERATOR UPGRADES
function generatorMatrix(matrix, previous, next) {
    const height = matrix.length;
    
    for (let y = 0; y < height; y++) {

        for (let x = 0; x < matrix[y].length; x++) {
            let top = (y + height - 1) % height,
                bottom = (y + height + 1) % height,
                left = (x + matrix[y].length - 1) % matrix[y].length,
                right = (x + matrix[y].length + 1) % matrix[y].length;

                center = matrix[y][x];
            top = matrix[top][x];
            bottom = matrix[bottom][x];
            left = matrix[y][left];
            right = matrix[y][right];

            for (let i = 0; i < height; i++) {
                if (Class[bottom]) break;
                bottom = matrix[(y + height + i + 1) % height][x];
            }
            for (let i = 0; i < height; i++) {
                if (Class[top]) break;
                top = matrix[(y + height - i - 1) % height][x];
            }
            for (let i = 0; i < matrix[y].length; i++) {
                if (Class[left]) break;
                left = matrix[y][(x + matrix[y].length - i - 1) % matrix[y].length];
            }
            for (let i = 0; i < matrix[y].length; i++) {
                if (Class[right]) break;
                right = matrix[y][(x + matrix[y].length + i + 1) % matrix[y].length];
            }
            let gen = Class[center];
            if (!gen) continue;
            gen.UPGRADES_TIER_0 = [
                Config.spawn_class,
                left, right,
                "menu_shinyMember",
                top, bottom,
            ];
        }
    }
}

// SHAPE UPGRADES
generatorMatrix(shapeGeneratorUpgrades);