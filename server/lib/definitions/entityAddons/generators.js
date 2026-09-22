const {combineStats, weaponArray, weaponMirror} = require("../facilitators.js")


let suffix = "Gen"
// Generators
const shapeGeneratorUpgrades = [
    ["egg", "gem", "crasher", "sentryTrap", "sentryGun", "sentrySwarm", "wall"],
    ["square", ...rarities("square"), "gravel"],
    ["triangle", ...rarities("triangle"), "stone"],
    ["pentagon", ...rarities("pentagon"), "rock"],
    ["betaPentagon", ...rarities("betaPentagon"), "pumpkin"],
    ["alphaPentagon", ...rarities("alphaPentagon"), "gaybabyjail"],
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
}
Class.genSentrySwarm = {
    TYPE: [],
    PARENT: "sentrySwarm",
    CONTROLLERS: ["nearestDifferentMaster", "mapTargetToGoal", "hangOutNearMaster"],
};
Class.genSentryGun = {
    TYPE: [],
    PARENT: "sentryGun",
    CONTROLLERS: ["nearestDifferentMaster", "mapTargetToGoal", "hangOutNearMaster"]
};
Class.genSentryTrap = {
    TYPE: [],
    PARENT: "sentryTrap",
    CONTROLLERS: ["nearestDifferentMaster", "mapTargetToGoal", "hangOutNearMaster"]
};
Class.genShinySentrySwarm = {
    TYPE: [],
    PARENT: "shinySentrySwarm",
    CONTROLLERS: ["nearestDifferentMaster", "mapTargetToGoal", "hangOutNearMaster"]
};
Class.genShinySentryGun = {
    TYPE: [],
    PARENT: "shinySentryGun",
    CONTROLLERS: ["nearestDifferentMaster", "mapTargetToGoal", "hangOutNearMaster"]
};
Class.genShinySentryTrap = {
    TYPE: [],
    PARENT: "shinySentryTrap",
    CONTROLLERS: ["nearestDifferentMaster", "mapTargetToGoal", "hangOutNearMaster"]
};
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
Class[`shinyAlphaPentagon${suffix}`]  = makeGenerator("shinyAlphaPentagon", "alphaPentagon", 1, 32)
Class[`legendaryAlphaPentagon${suffix}`]  = makeGenerator("legendaryAlphaPentagon", "alphaPentagon", 1, 39)
Class[`shadowAlphaPentagon${suffix}`]  = makeGenerator("shadowAlphaPentagon", "alphaPentagon", 1, 46)
Class[`rainbowAlphaPentagon${suffix}`]  = makeGenerator("rainbowAlphaPentagon", "alphaPentagon", 1, 53)
Class[`transAlphaPentagon${suffix}`]  = makeGenerator("transAlphaPentagon", "alphaPentagon", 1, 60)
//MISC GENERATORS

Class[`gem${suffix}`] = makeGenerator("gem", null, 0)
Class[`wall${suffix}`] = makeGenerator("genWall", null, 0, 0, false)
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
    TURRETS: [
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
Class[`shinySentrySwarm${suffix}`] = makeGenerator("genShinySentrySwarm", null, 1, 0, 0, false)
Class[`shinySentryGun${suffix}`] = makeGenerator("genShinySentryGun", null, 1, 0, 0, false)
Class[`shinySentryTrap${suffix}`] = makeGenerator("genShinySentryTrap", null, 1, 0, 0, false)


// SHAPE UPGRADES
generatorMatrix(shapeGeneratorUpgrades);

// manual upgrades
["shinySentryTrap", "shinySentryGun", "shinySentrySwarm"].map(x => x + suffix).forEach(x => 
    Class[x].UPGRADES_TIER_0.push(x.at(5).toLowerCase() + x.slice(6, x.length))
);
["sentryTrap", "sentryGun", "sentrySwarm"].map(x => x + suffix).forEach(x => 
    Class[x].UPGRADES_TIER_0.push(`shiny${x.at(0).toUpperCase()}${x.slice(1, x.length)}`)
);

// functions
function generatorMatrix(matrix, previous, next) {
    const height = matrix.length,
        width = matrix[0].length;

    for (let y = 0; y < height; y++) {
        if (matrix[y].length !== width) {
            throw new Error(`The given grid is not rectangular!\nThe row at Y coordinate ${y} has ${matrix[y].length} items instead of the first row which has ${width}!`);
        }

        for (let x = 0; x < width; x++) {
            
            let top = (y + height - 1) % height,
                bottom = (y + height + 1) % height,
                left = (x + width - 1) % width,
                right = (x + width + 1) % width,

                center = matrix[y][x];
            top = matrix[top][x];
            bottom = matrix[bottom][x];
            left = matrix[y][left];
            right = matrix[y][right];

            let gen = Class[matrix[y][x]];
            if (!gen) {
                throw new Error(`The given grid has an invalid Definition Reference at indexes [${y}][${x}] named "${matrix[y][x]}"`);
            }
            gen.UPGRADES_TIER_0 = [
                Config.spawn_class, 
                left, right,
                "menu_shinyMember", 
                top, bottom,
            ];
        }
    }
}
function rarities(type = "") {
    const rarities = ["shiny", "legendary", "shadow", "rainbow", "trans"];
    return Array(rarities.length).fill().map((v, i) => rarities[i] + (type.at(0).toUpperCase() + type.slice(1, type.length)));
}
function makeGenerator(entity, displayEntity, launchSpeed = 1, extraSize = 0, variesInSize = true, spawnOffset = 0.5) {
    if (!Class[type]) return {PARENT: "spectator", LABEL: "Error"};
    let found = {};
    let toFind = [
        "SHAPE", "LABEL", "COLOR", "SIZE", "VALUE"
    ]
    const findProperties = (type, ...properties) => {
        let canContinue = true;
        if (!Class[type]) canContinue = false
        if (canContinue) {
            if (!properties.length) properties = toFind; 
            properties.forEach(k => {
                if (Class[type][k] !== undefined) found[k] = Class[type][k]
                else if (Class[type].PARENT !== undefined) findProperties(Class[type].PARENT, k)
                else found[k] = Class.genericTank[k];
            })
        }
    }
    findProperties(entity);
    if (!displayEntity) displayEntity = entity;

    const config = {
        PARENT: "genBody",
        LABEL: `${found.LABEL} Generator`,
        SHAPE: found.SHAPE,
        COLOR: { // prevent shifts from affecting us
            BASE: found.COLOR?.BASE ?? found.COLOR, 
            BRIGHTNESS_SHIFT: found.COLOR?.BRIGHTNESS_SHIFT ?? 0, 
            HUE_SHIFT: found.COLOR?.HUE_SHIFT ?? 0
        },
        UPGRADES_TIER_0: [],
        TURRETS: [{
            TYPE: [displayEntity, {FACING_TYPE: "toTarget", INDEPENDENT: true}],
            POSITION: {
                SIZE: Math.sqrt(found.SIZE) * 2,
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
                        size: (found.SIZE + extraSize) / 13
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