const { makeCrasher, makeLaby, makePolychoron, makePolyhedron, makePresent, makeRarities, makeRelic } = require("../facilitators.js");
const { basePolygonDamage, basePolygonHealth } = require("../constants.js");
const preset = require("../presets.js");

// Set the below variable to true to enable the flat 3D shapes from Old Dreadnoughts.
const classic_3D_shapes = false;

// Base Polygons
Class.egg = {
    PARENT: "food",
    LABEL: "Egg",
    VALUE: 5,
    SHAPE: 0,
    SIZE: 4.5,
    COLOR: "veryLightGrey",
    INTANGIBLE: true,
    VISIBLE_ON_BLACKOUT: true,
    BODY: {
        DAMAGE: 0,
        DENSITY: 2,
        HEALTH: 0.5 * basePolygonHealth,
        PENETRATION: 1,
        PUSHABILITY: 0,
        ACCELERATION: 0.015
    },
    DRAW_HEALTH: false
};
Class.square = {
    PARENT: "food",
    LABEL: "Square",
    VALUE: 20,
    SHAPE: 4,
    SIZE: 14,
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
};
Class.triangle = {
    PARENT: "food",
    LABEL: "Triangle",
    VALUE: 100,
    SHAPE: 3,
    SIZE: 10,
    COLOR: "orange",
    BODY: {
        DAMAGE: basePolygonDamage,
        DENSITY: 6,
        HEALTH: 3 * basePolygonHealth,
        RESIST: 1.15,
        PENETRATION: 1.5,
        ACCELERATION: 0.005
    },
    DRAW_HEALTH: true
};
Class.pentagon = {
    PARENT: "food",
    LABEL: "Pentagon",
    VALUE: 500,
    SHAPE: 5,
    SIZE: 21,
    COLOR: "purple",
    BODY: {
        DAMAGE: 1.5 * basePolygonDamage,
        DENSITY: 8,
        HEALTH: 10 * basePolygonHealth,
        RESIST: 1.25,
        PENETRATION: 1.1,
        ACCELERATION: 0.0035
    },
    DRAW_HEALTH: true
};
Class.hexagon = {
    PARENT: "food",
    LABEL: "Hexagon",
    VALUE: 2500,
    SHAPE: 6,
    SIZE: 25,
    COLOR: "aqua",
    BODY: {
        DAMAGE: 3 * basePolygonDamage,
        DENSITY: 8,
        HEALTH: 20 * basePolygonHealth,
        RESIST: 1.3,
        SHIELD: 50 * basePolygonHealth,
        PENETRATION: 1.1,
        ACCELERATION: 0.003
    },
    DRAW_HEALTH: true
};

// Old Dreadnoughts Polygons
Class.crasher = {
    TYPE: "crasher",
    LABEL: "Crasher",
    COLOR: "pink",
    SHAPE: 3,
    SIZE: 5,
    VARIES_IN_SIZE: true,
    CONTROLLERS: ["nearestDifferentMaster", "mapTargetToGoal"],
    AI: {
        NO_LEAD: true
    },
    BODY: {
        SPEED: 5,
        ACCELERATION: 1.4,
        HEALTH: 0.5,
        DAMAGE: 5,
        PENETRATION: 2,
        PUSHABILITY: 0.5,
        DENSITY: 10,
        RESIST: 2
    },
    MOTION_TYPE: "motor",
    FACING_TYPE: "smoothWithMotion",
    HITS_OWN_TYPE: "hard",
    HAS_NO_MASTER: true,
    DRAW_HEALTH: true
};
Class.gem = {
    PARENT: "food",
    LABEL: "Gem",
    VALUE: 2e3,
    SHAPE: 6,
    SIZE: 4.5,
    COLOR: "aqua",
    BODY: {
        DAMAGE: basePolygonDamage / 4,
        DENSITY: 4,
        HEALTH: 10,
        PENETRATION: 2,
        RESIST: 2,
        PUSHABILITY: 0.25,
        ACCELERATION: 0.015
    },
    DRAW_HEALTH: true,
    INTANGIBLE: false,
    GIVE_KILL_MESSAGE: true
};
Class.jewel = {
    PARENT: "food",
    LABEL: "Jewel",
    VALUE: 1e5,
    SHAPE: 6,
    SIZE: 8,
    COLOR: "yellow",
    BODY: {
        DAMAGE: basePolygonDamage / 4,
        DENSITY: 4,
        HEALTH: 50,
        PENETRATION: 2,
        RESIST: 2,
        PUSHABILITY: 0.25,
        ACCELERATION: 0.015
    },
    DRAW_HEALTH: true,
    INTANGIBLE: false,
    GIVE_KILL_MESSAGE: true
};
Class.betaPentagon = {
    PARENT: "food",
    LABEL: "Beta Pentagon",
    VALUE: 2500,
    SHAPE: 5,
    SIZE: 30,
    COLOR: "purple",
    BODY: {
        DAMAGE: 2 * basePolygonDamage,
        DENSITY: 30,
        HEALTH: 75 * basePolygonHealth,
        RESIST: Math.pow(1.25, 2),
        PENETRATION: 1.1,
        SHIELD: 20 * basePolygonHealth,
        ACCELERATION: 0.003
    },
    DRAW_HEALTH: true,
    GIVE_KILL_MESSAGE: true
};
Class.alphaPentagon = {
    PARENT: "food",
    LABEL: "Alpha Pentagon",
    VALUE: 15e3,
    SHAPE: 5,
    SIZE: 58,
    COLOR: "purple",
    BODY: {
        DAMAGE: 2 * basePolygonDamage,
        DENSITY: 80,
        HEALTH: 562.5 * basePolygonHealth,
        RESIST: Math.pow(1.25, 3),
        PENETRATION: 1.1,
        SHIELD: 40 * basePolygonHealth,
        ACCELERATION: 0.0025
    },
    DRAW_HEALTH: true,
    GIVE_KILL_MESSAGE: true
};
Class.hexagon_old = {
    PARENT: "food",
    LABEL: "Hexagon",
    VALUE: 21e3,
    SHAPE: 6,
    SIZE: 70,
    COLOR: "magenta",
    BODY: {
        DAMAGE: 2 * basePolygonDamage,
        DENSITY: 80,
        HEALTH: 600 * basePolygonHealth,
        RESIST: Math.pow(1.25, 3),
        PENETRATION: 1.1,
        SHIELD: 40 * basePolygonHealth,
        ACCELERATION: 0.0025
    },
    DRAW_HEALTH: true,
    GIVE_KILL_MESSAGE: true
};
Class.septagon = {
    PARENT: "food",
    LABEL: "Septagon",
    VALUE: 28e3,
    SHAPE: 7,
    SIZE: 80,
    COLOR: "green",
    BODY: {
        DAMAGE: 2 * basePolygonDamage,
        DENSITY: 80,
        HEALTH: 750 * basePolygonHealth,
        RESIST: Math.pow(1.25, 3),
        PENETRATION: 1.1,
        SHIELD: 50 * basePolygonHealth,
        ACCELERATION: 0.0025
    },
    DRAW_HEALTH: true,
    GIVE_KILL_MESSAGE: true
};
Class.octagon = {
    PARENT: "food",
    LABEL: "Octagon",
    VALUE: 35e3,
    SHAPE: 8,
    SIZE: 90,
    COLOR: "lavender",
    BODY: {
        DAMAGE: 2 * basePolygonDamage,
        DENSITY: 80,
        HEALTH: 900 * basePolygonHealth,
        RESIST: Math.pow(1.25, 3),
        PENETRATION: 1.1,
        SHIELD: 60 * basePolygonHealth,
        ACCELERATION: 0.0025
    },
    DRAW_HEALTH: true,
    GIVE_KILL_MESSAGE: true
};
Class.nonagon = {
    PARENT: "food",
    LABEL: "Nonagon",
    VALUE: 42e3,
    SHAPE: 9,
    SIZE: 100,
    COLOR: "white",
    BODY: {
        DAMAGE: 2 * basePolygonDamage,
        DENSITY: 80,
        HEALTH: 1050 * basePolygonHealth,
        RESIST: Math.pow(1.25, 3),
        PENETRATION: 1.1,
        SHIELD: 70 * basePolygonHealth,
        ACCELERATION: 0.0025
    },
    DRAW_HEALTH: true,
    GIVE_KILL_MESSAGE: true
};

// Rarities
makeRarities([
    "egg",
    "square",
    "triangle",
    "pentagon",
    "betaPentagon",
    "alphaPentagon",
    "hexagon",
    "hexagon_old",
    "septagon",
    "octagon",
    "nonagon"
]);

// 3D/4D
if (!classic_3D_shapes) {
    cube_shape = makePolyhedron({
        VERTEXES: [
            [1, 1, 1],
            [-1, 1, 1],
            [-1, -1, 1],
            [1, -1, 1],
            [1, 1, -1],
            [-1, 1, -1],
            [-1, -1, -1],
            [1, -1, -1]
        ],
        FACES: [
            [0, 1, 2, 3],
            [4, 5, 6, 7],
            [1, 2, 6, 5],
            [0, 3, 7, 4],
            [0, 1, 5, 4],
            [2, 3, 7, 6]
        ],
        SCALE: 7.5,
        VERTEXES_SCALE: 0.1
    });
    tetrahedron_shape = makePolyhedron({
        FACES: [
            [[1, 1, 1], [-1, 1, -1], [1, -1, -1]],
            [[-1, 1, -1], [-1, -1, 1], [1, -1, -1]],
            [[1, 1, 1], [1, -1, -1], [-1, -1, 1]],
            [[1, 1, 1], [-1, -1, 1], [-1, 1, -1]]
        ],
        SCALE: 5,
        VERTEXES_SCALE: 0.1
    });
    octahedron_shape = makePolyhedron({
        FACES: (function() {
            const x = 3 / (2 * Math.sqrt(2));
            const y = 3 / 2;
            return [
                [[-x, 0, x], [-x, 0, -x], [0, y, 0]],
                [[-x, 0, -x], [x, 0, -x], [0, y, 0]],
                [[x, 0, -x], [x, 0, x], [0, y, 0]],
                [[x, 0, x], [-x, 0, x], [0, y, 0]],
                [[x, 0, -x], [-x, 0, -x], [0, -y, 0]],
                [[-x, 0, -x], [-x, 0, x], [0, -y, 0]],
                [[x, 0, x], [x, 0, -x], [0, -y, 0]],
                [[-x, 0, x], [x, 0, x], [0, -y, 0]]
            ];
        })(),
        SCALE: 7.5,
        VERTEXES_SCALE: 0.1
    });
    dodecahedron_shape = makePolyhedron({
        FACES: (function() {
            let phi = (1 + Math.sqrt(5)) / 2,
                x = 1,
                y = 1 / phi,
                z = 2 - phi;

            x *= 1.5;
            y *= 1.5;
            z *= 1.5;

            return [
                [
                    [z, 0, x],
                    [-z, 0, x],
                    [-y, y, y],
                    [0, x, z],
                    [y, y, y]
                ],
                [
                    [-z, 0, x],
                    [z, 0, x],
                    [y, -y, y],
                    [0, -x, z],
                    [-y, -y, y]
                ],
                [
                    [z, 0, -x],
                    [-z, 0, -x],
                    [-y, -y, -y],
                    [0, -x, -z],
                    [y, -y, -y]
                ],
                [
                    [-z, 0, -x],
                    [z, 0, -x],
                    [y, y, -y],
                    [0, x, -z],
                    [-y, y, -y]
                ],
                [
                    [0, x, -z],
                    [0, x, z],
                    [y, y, y],
                    [x, z, 0],
                    [y, y, -y]
                ],
                [
                    [0, x, z],
                    [0, x, -z],
                    [-y, y, -y],
                    [-x, z, 0],
                    [-y, y, y]
                ],
                [
                    [0, -x, -z],
                    [0, -x, z],
                    [-y, -y, y],
                    [-x, -z, 0],
                    [-y, -y, -y]
                ],
                [
                    [0, -x, z],
                    [0, -x, -z],
                    [y, -y, -y],
                    [x, -z, 0],
                    [y, -y, y]
                ],
                [
                    [x, z, 0],
                    [x, -z, 0],
                    [y, -y, y],
                    [z, 0, x],
                    [y, y, y]
                ],
                [
                    [x, -z, 0],
                    [x, z, 0],
                    [y, y, -y],
                    [z, 0, -x],
                    [y, -y, -y]
                ],
                [
                    [-x, z, 0],
                    [-x, -z, 0],
                    [-y, -y, -y],
                    [-z, 0, -x],
                    [-y, y, -y]
                ],
                [
                    [-x, -z, 0],
                    [-x, z, 0],
                    [-y, y, y],
                    [-z, 0, x],
                    [-y, -y, y]
                ]
            ];
        })(),
        SCALE: 6.5,
        VERTEXES_SCALE: 0.1
    });
    icosahedron_shape = makePolyhedron({
        FACES: (function() {
            let phi = (1 + Math.sqrt(5)) / 2, // golden ratio
                x = 1 / 2,
                y = 1 / (2 * phi);
            x *= 3;
            y *= 3;

            return [
                [
                    [0, y, -x],
                    [y, x, 0],
                    [-y, x, 0]
                ],
                [
                    [0, y, x],
                    [-y, x, 0],
                    [y, x, 0]
                ],
                [
                    [0, y, x],
                    [0, -y, x],
                    [-x, 0, y]
                ],
                [
                    [0, y, x],
                    [x, 0, y],
                    [0, -y, x]
                ],
                [
                    [0, y, -x],
                    [0, -y, -x],
                    [x, 0, -y]
                ],
                [
                    [0, y, -x],
                    [-x, 0, -y],
                    [0, -y, -x]
                ],
                [
                    [0, -y, x],
                    [y, -x, 0],
                    [-y, -x, 0]
                ],
                [
                    [0, -y, -x],
                    [-y, -x, 0],
                    [y, -x, 0]
                ],
                [
                    [-y, x, 0],
                    [-x, 0, y],
                    [-x, 0, -y]
                ],
                [
                    [-y, -x, 0],
                    [-x, 0, -y],
                    [-x, 0, y]
                ],
                [
                    [y, x, 0],
                    [x, 0, -y],
                    [x, 0, y]
                ],
                [
                    [y, -x, 0],
                    [x, 0, y],
                    [x, 0, -y]
                ],
                [
                    [0, y, x],
                    [-x, 0, y],
                    [-y, x, 0]
                ],
                [
                    [0, y, x],
                    [y, x, 0],
                    [x, 0, y]
                ],
                [
                    [0, y, -x],
                    [-y, x, 0],
                    [-x, 0, -y]
                ],
                [
                    [0, y, -x],
                    [x, 0, -y],
                    [y, x, 0]
                ],
                [
                    [0, -y, -x],
                    [-x, 0, -y],
                    [-y, -x, 0]
                ],
                [
                    [0, -y, -x],
                    [y, -x, 0],
                    [x, 0, -y]
                ],
                [
                    [0, -y, x],
                    [-y, -x, 0],
                    [-x, 0, y]
                ],
                [
                    [0, -y, x],
                    [x, 0, y],
                    [y, -x, 0]
                ]
            ];
        })(),
        SCALE: 20,
        VERTEXES_SCALE: 0.03
    });
    tesseract_shape = makePolychoron({
        VERTEXES: [
            [-1, 1, 1, 1],   [1, 1, 1, 1],
            [1, -1, 1, 1],   [-1, -1, 1, 1],
            [-1, 1, -1, 1],  [1, 1, -1, 1],
            [1, -1, -1, 1],  [-1, -1, -1, 1],
            [-1, 1, 1, -1],  [1, 1, 1, -1],
            [1, -1, 1, -1],  [-1, -1, 1, -1],
            [-1, 1, -1, -1], [1, 1, -1, -1],
            [1, -1, -1, -1], [-1, -1, -1, -1]
        ],
        FACES: [
            // broken
            [0, 1, 2, 3], [7, 6, 5, 4], [0, 1, 5, 4], [1, 2, 6, 5], [2, 3, 7, 6], [3, 0, 4, 7],
            [8, 9, 10, 11], [15, 14, 13, 12], [8, 9, 13, 12], [9, 10, 14, 13], [10, 11, 15, 14], [11, 8, 12, 15],
            [0, 1, 9, 8],
            [4, 5, 13, 12],
            [1, 2, 10, 9],
            [3, 0, 8, 11],
            [2, 3, 11, 10],
            [7, 6, 14, 15], [5, 6, 14, 13], [4, 7, 15, 12]
        ],
        VERTEXES_SCALE: 0.1,
        SCALE: 6
    });
} else {
    cube_shape = preset.shape.flatCube;
    tetrahedron_shape = preset.shape.flatTetrahedron;
    octahedron_shape = preset.shape.flatOctahedron;
    dodecahedron_shape = preset.shape.flatDodecahedron;
    icosahedron_shape = preset.shape.flatIcosahedron;
    tesseract_shape = preset.shape.flatTesseract;
};

Class.sphere = {
    PARENT: "food",
    LABEL: "Sphere",
    NAME: "The Sphere",
    FACING_TYPE: "noFacing",
    VALUE: 1e7,
    SHAPE: 0,
    SIZE: 9,
    COLOR: {
        BASE: "veryLightGrey",
        BRIGHTNESS_SHIFT: -15
    },
    BODY: {
        DAMAGE: 4,
        DENSITY: 16,
        HEALTH: 30,
        RESIST: 1.25,
        PENETRATION: 15,
        ACCELERATION: 0.002
    },
    DRAW_HEALTH: true,
    GIVE_KILL_MESSAGE: true,
    PROPS: [{
        POSITION: [17, 0, 0, 0, 1],
        TYPE: ["egg", { COLOR: { BRIGHTNESS_SHIFT: -14 }, BORDERLESS: true }]
    }, {
        POSITION: [15, 1, -1, 0, 1],
        TYPE: ["egg", { COLOR: { BRIGHTNESS_SHIFT: -9 }, BORDERLESS: true }]
    }, {
        POSITION: [13, 2, -2, 0, 1],
        TYPE: ["egg", { COLOR: { BRIGHTNESS_SHIFT: -8 }, BORDERLESS: true }]
    }, {
        POSITION: [11, 3, -3, 0, 1],
        TYPE: ["egg", { COLOR: { BRIGHTNESS_SHIFT: -3 }, BORDERLESS: true }]
    }, {
        POSITION: [8, 3.25, -3.25, 0, 1],
        TYPE: ["egg", { COLOR: { BRIGHTNESS_SHIFT: 3 }, BORDERLESS: true }]
    }, {
        POSITION: [6, 3, -3, 0, 1],
        TYPE: ["egg", { COLOR: { BRIGHTNESS_SHIFT: 9 }, BORDERLESS: true }]
    }]
};
Class.cube = {
    PARENT: "food",
    LABEL: "Cube",
    NAME: "The Cube",
    VALUE: 2e7,
    SIZE: 10,
    COLOR: "veryLightGrey",
    SHAPE: cube_shape,
    BODY: {
        DAMAGE: 4.8,
        DENSITY: 20,
        HEALTH: 40,
        RESIST: 1.25,
        PENETRATION: 17.5,
        ACCELERATION: 0.002
    },
    DRAW_HEALTH: true,
    INTANGIBLE: false,
    GIVE_KILL_MESSAGE: true
};
Class.tetrahedron = {
    PARENT: "food",
    LABEL: "Tetrahedron",
    NAME: "The Tetrahedron",
    VALUE: 3e7,
    SIZE: 12,
    COLOR: "veryLightGrey",
    SHAPE: tetrahedron_shape,
    BODY: {
        DAMAGE: 6,
        DENSITY: 23,
        HEALTH: 50,
        RESIST: 1.25,
        PENETRATION: 22.5,
        ACCELERATION: 0.002
    },
    DRAW_HEALTH: true,
    GIVE_KILL_MESSAGE: true
};
Class.octahedron = {
    PARENT: "food",
    LABEL: "Octahedron",
    NAME: "The Octahedron",
    VALUE: 4e7,
    SIZE: 13,
    COLOR: "veryLightGrey",
    SHAPE: octahedron_shape,
    BODY: {
        DAMAGE: 6.5,
        DENSITY: 26,
        HEALTH: 60,
        RESIST: 1.25,
        PENETRATION: 30,
        ACCELERATION: 0.002
    },
    DRAW_HEALTH: true,
    GIVE_KILL_MESSAGE: true
};
Class.dodecahedron = {
    PARENT: "food",
    LABEL: "Dodecahedron",
    NAME: "The Dodecahedron",
    VALUE: 5e7,
    SIZE: 18,
    COLOR: "veryLightGrey",
    SHAPE: dodecahedron_shape,
    BODY: {
        DAMAGE: 7,
        DENSITY: 28,
        HEALTH: 70,
        RESIST: 1.25,
        PENETRATION: 32.5,
        ACCELERATION: 0.002
    },
    DRAW_HEALTH: true,
    GIVE_KILL_MESSAGE: true
};
Class.icosahedron = {
    PARENT: "food",
    LABEL: "Icosahedron",
    NAME: "The Icosahedron",
    VALUE: 1e8,
    SIZE: 20,
    COLOR: "veryLightGrey",
    SHAPE: icosahedron_shape,
    BODY: {
        DAMAGE: 9,
        DENSITY: 30,
        HEALTH: 80,
        RESIST: 1.25,
        PENETRATION: 35,
        ACCELERATION: 0.002
    },
    DRAW_HEALTH: true,
    GIVE_KILL_MESSAGE: true
};
Class.tesseract = {
    PARENT: "food",
    LABEL: "Tesseract",
    NAME: "The Tesseract",
    VALUE: 42e7,
    SIZE: 25,
    COLOR: "veryLightGrey",
    SHAPE: tesseract_shape,
    BODY: {
        DAMAGE: 10,
        DENSITY: 40,
        RESIST: 1.25,
        HEALTH: 200,
        PENETRATION: 50,
        ACCELERATION: 0.003
    },
    DRAW_HEALTH: true,
    GIVE_KILL_MESSAGE: true
};

// Presents (todo: make this a self-creating function)
Class.presentRY = makePresent("red", "yellow");
Class.presentRP = makePresent("red", "purple");
Class.presentRW = makePresent("red", "white");
Class.presentGY = makePresent("green", "yellow");
Class.presentGP = makePresent("green", "purple");
Class.presentGW = makePresent("green", "white");
Class.presentBY = makePresent("blue", "yellow");
Class.presentBP = makePresent("blue", "purple");
Class.presentBW = makePresent("blue", "white");

// Relics
for (let [gemColor, name] of [
    [undefined, ""],
    ["#a913cf", "Power"],
    ["#226ef6", "Space"],
    ["#ff1000", "Reality"],
    ["#ff9000", "Soul"],
    ["#00e00b", "Time"],
    ["#ffd300", "Mind"]
]) {
    let gem;
    if (gemColor) {
        gem = Class[name + "Gem"] = {
            PARENT: "gem",
            LABEL: `${name} Gem`,
            SHAPE: 6,
            COLOR: gemColor
        };
    }

    Class[name + "EggRelic"] = makeRelic("egg", 0.5, gem, 7);
    Class[name + "SquareRelic"] = makeRelic("square", 1, gem);
    Class[name + "TriangleRelic"] = makeRelic("triangle", 1.45, gem);
    Class[name + "PentagonRelic"] = makeRelic("pentagon", -0.6, gem);
    Class[name + "BetaPentagonRelic"] = makeRelic("betaPentagon", -0.6, gem);
    Class[name + "AlphaPentagonRelic"] = makeRelic("alphaPentagon", -0.6, gem);
    Class[name + "HexagonRelic"] = makeRelic("hexagon", -0.4, gem, undefined, 6.25);
    Class[name + "Hexagon_oldRelic"] = makeRelic("hexagon_old", -0.4, gem, undefined, 6.25);
    Class[name + "SeptagonRelic"] = makeRelic("septagon", -0.325, gem, undefined, 5.25);
    Class[name + "OctagonRelic"] = makeRelic("octagon", -0.3, gem, undefined, 4.75);
    Class[name + "NonagonRelic"] = makeRelic("nonagon", -0.25, gem, undefined, 4);
}

// Tiered Food
let polyNames = ["egg", "square", "triangle", "pentagon", "hexagon"],
    shinyNames = ["", "shiny", "legendary", "shadow", "rainbow", "trans"];
for (let tier = 0; tier < 4; tier++) {
    for (let poly in polyNames) {
        let polyName = polyNames[poly];
        polyName = polyName[0].toUpperCase() + polyName.slice(1);

        for (let shiny in shinyNames) {
            let shinyName = shinyNames[shiny];
            let food = shinyName + polyName;
            food = food[0].toLowerCase() + food.slice(1);

            Class[`laby_${poly}_${tier}_${shiny}_0`] = makeLaby(
                Class[food],
                parseInt(poly),
                parseInt(shiny),
                tier,
                polyName === "Triangle" && tier > 0 ? 2 / 3 : 1
            );

            Class[`laby_${poly}_${tier}_${shiny}_1`] = makeCrasher(
                Class[`laby_${poly}_${tier}_${shiny}_0`]
            );
        }
    }
}

const measuredShapes = {
    egg: [67.9936, 0, 0, 4.5],
    shinyEgg: [135.9872, 0, 0, 4.5],
    legendaryEgg: [271.9744, 0, 0, 4.5],
    shadowEgg: [407.9616, 0, 0, 4.5],
    rainbowEgg: [543.9488, 0, 0, 4.5],
    transEgg: [679.936, 0, 0, 4.5],
    square: [46.176, 0, 0.5367, 12.7279],
    shinySquare: [93.8478, 0, 0.5367, 12.7279],
    legendarySquare: [187.6955, 0, 0.5367, 12.7279],
    shadowSquare: [281.5433, 0, 0.5367, 12.7279],
    rainbowSquare: [375.4243, 0, 0.5367, 12.7279],
    transSquare: [469.4339, 0, 0.5367, 12.7279],
    triangle: [254.2964, 0, 1, 9],
    shinyTriangle: [531.1222, 0, 1, 9],
    legendaryTriangle: [1075.3165, 0, 1, 9],
    shadowTriangle: [1624.8118, 0, 1, 9],
    rainbowTriangle: [2177.3342, 0, 1, 9],
    transTriangle: [2732.2544, 0, 1, 9],
    pentagon: [1192.427, 0, 1.4757, 19.0623],
    shinyPentagon: [2324.454, 0, 1.4757, 19.0623],
    legendaryPentagon: [4648.908, 0, 1.4757, 19.0623],
    shadowPentagon: [6973.362, 0, 1.4757, 19.0623],
    rainbowPentagon: [9297.816, 0, 1.4757, 19.0623],
    transPentagon: [11622.27, 0, 1.4757, 19.0623],
    hexagon: [2385.2226, 0, 1.8278, 23.3827],
    shinyHexagon: [4770.4452, 0, 1.8278, 23.3827],
    legendaryHexagon: [9540.8904, 0, 1.8278, 23.3827],
    shadowHexagon: [14311.3356, 0, 1.8278, 23.3827],
    rainbowHexagon: [19081.7808, 0, 1.8278, 23.3827],
    transHexagon: [23852.226, 0, 1.8278, 23.3827],
    betaEgg: [442.8531, 0, 0, 9],
    shinyBetaEgg: [885.7063, 0, 0, 9],
    legendaryBetaEgg: [1771.4126, 0, 0, 9],
    shadowBetaEgg: [2657.1188, 0, 0, 9],
    rainbowBetaEgg: [3545.8656, 0, 0, 9],
    transBetaEgg: [4460.059, 0, 0, 9],
    betaSquare: [240.0597, 0, 0.5035, 18],
    shinyBetaSquare: [474.3218, 0, 0.5035, 18],
    legendaryBetaSquare: [937.661, 0, 0.5035, 18],
    shadowBetaSquare: [1411.3768, 0, 0.5035, 18],
    rainbowBetaSquare: [1887.4897, 0, 0.5035, 18],
    transBetaSquare: [2364.9563, 0, 0.5035, 18],
    betaTriangle: [1242.2743, 0, 0.9985, 12.7279],
    shinyBetaTriangle: [2513.6682, 0, 0.9985, 12.7279],
    legendaryBetaTriangle: [5039.3248, 0, 0.9985, 12.7279],
    shadowBetaTriangle: [7558.9872, 0, 0.9985, 12.7279],
    rainbowBetaTriangle: [10078.6496, 0, 0.9985, 12.7279],
    transBetaTriangle: [12598.312, 0, 0.9985, 12.7279],
    labyBetaPentagon: [5827.1865, 0, 1.482, 23.5623],
    shinyLabyBetaPentagon: [11654.373, 0, 1.482, 23.5623],
    legendaryLabyBetaPentagon: [23308.746, 0, 1.482, 23.5623],
    shadowLabyBetaPentagon: [34963.119, 0, 1.482, 23.5623],
    rainbowLabyBetaPentagon: [46617.492, 0, 1.482, 23.5623],
    transLabyBetaPentagon: [58271.865, 0, 1.482, 23.5623],
    betaHexagon: [11847.885, 0, 2.0618, 27],
    shinyBetaHexagon: [23695.77, 0, 2.0618, 27],
    legendaryBetaHexagon: [47391.54, 0, 2.0618, 27],
    shadowBetaHexagon: [71087.31, 0, 2.0618, 27],
    rainbowBetaHexagon: [94783.08, 0, 2.0618, 27],
    transBetaHexagon: [118478.85, 0, 2.0618, 27],
    alphaEgg: [3401.1118, 0, 0, 18],
    shinyAlphaEgg: [6786.0692, 0, 0, 18],
    legendaryAlphaEgg: [13484.8274, 0, 0, 18],
    shadowAlphaEgg: [20151.7866, 0, 0, 18],
    rainbowAlphaEgg: [27050.5566, 0, 0, 18],
    transAlphaEgg: [33997.2773, 0, 0, 18],
    alphaSquare: [1158.0596, 0, 0.5076, 25.4558],
    shinyAlphaSquare: [2326.6851, 0, 0.5076, 25.4558],
    legendaryAlphaSquare: [4702.4397, 0, 0.5076, 25.4558],
    shadowAlphaSquare: [7078.1487, 0, 0.5076, 25.4558],
    rainbowAlphaSquare: [9437.5316, 0, 0.5076, 25.4558],
    transAlphaSquare: [11796.9145, 0, 0.5076, 25.4558],
    alphaTriangle: [5901.621, 0, 1.1129, 18],
    shinyAlphaTriangle: [11803.242, 0, 1.1129, 18],
    legendaryAlphaTriangle: [23606.484, 0, 1.1129, 18],
    shadowAlphaTriangle: [35409.726, 0, 1.1129, 18],
    rainbowAlphaTriangle: [47212.968, 0, 1.1129, 18],
    transAlphaTriangle: [59016.21, 0, 1.1129, 18],
    labyAlphaPentagon: [30221.4075, 0, 1.5267, 29.1246],
    shinyLabyAlphaPentagon: [60442.815, 0, 1.5267, 29.1246],
    legendaryLabyAlphaPentagon: [120885.63, 0, 1.5267, 29.1246],
    shadowLabyAlphaPentagon: [181328.445, 0, 1.5267, 29.1246],
    rainbowLabyAlphaPentagon: [241771.26, 0, 1.5267, 29.1246],
    transLabyAlphaPentagon: [302214.075, 0, 1.5267, 29.1246],
    alphaHexagon: [58893.2025, 0, 1.8278, 31.1769],
    shinyAlphaHexagon: [117786.405, 0, 1.8278, 31.1769],
    legendaryAlphaHexagon: [235572.81, 0, 1.8278, 31.1769],
    shadowAlphaHexagon: [353359.215, 0, 1.8278, 31.1769],
    rainbowAlphaHexagon: [471145.62, 0, 1.8278, 31.1769],
    transAlphaHexagon: [588932.025, 0, 1.8278, 31.1769],
    omegaEgg: [22448.751, 0, 0, 36],
    shinyOmegaEgg: [45220.2791, 0, 0, 36],
    legendaryOmegaEgg: [89629.4291, 0, 0, 36],
    shadowOmegaEgg: [134099.0297, 0, 0, 36],
    rainbowOmegaEgg: [178691.1648, 0, 0, 36],
    transOmegaEgg: [223363.956, 0, 0, 36],
    omegaSquare: [3680.884, 0, 0.7481, 36],
    shinyOmegaSquare: [7379.9118, 0, 0.7481, 36],
    legendaryOmegaSquare: [14759.8236, 0, 0.7481, 36],
    shadowOmegaSquare: [22139.7354, 0, 0.7481, 36],
    rainbowOmegaSquare: [29519.6472, 0, 0.7481, 36],
    transOmegaSquare: [36899.559, 0, 0.7481, 36],
    omegaTriangle: [26488.344, 0, 1, 36],
    shinyOmegaTriangle: [52976.688, 0, 1, 36],
    legendaryOmegaTriangle: [105953.376, 0, 1, 36],
    shadowOmegaTriangle: [158930.064, 0, 1, 36],
    rainbowOmegaTriangle: [211906.752, 0, 1, 36],
    transOmegaTriangle: [264883.44, 0, 1, 36],
    omegaPentagon: [114291.6, 0, 1.4757, 36],
    shinyOmegaPentagon: [228583.2, 0, 1.4757, 36],
    legendaryOmegaPentagon: [457166.4, 0, 1.4757, 36],
    shadowOmegaPentagon: [685749.6, 0, 1.4757, 36],
    rainbowOmegaPentagon: [914332.8, 0, 1.4757, 36],
    transOmegaPentagon: [1142916, 0, 1.4757, 36],
    omegaHexagon: [235572.81, 0, 1.8278, 36],
    shinyOmegaHexagon: [471145.62, 0, 1.8278, 36],
    legendaryOmegaHexagon: [942291.24, 0, 1.8278, 36],
    shadowOmegaHexagon: [1413436.86, 0, 1.8278, 36],
    rainbowOmegaHexagon: [1884582.48, 0, 1.8278, 36],
    transOmegaHexagon: [2355728.1, 0, 1.8278, 36],
    betaPentagon: [951.7608, 383.3481, 2, 50],
    alphaPentagon: [7663.366, 1043.8033, 2, 80],
    gem: [399.1824, 0, 0.25, 5],
    jewel: [1844.4096, 0, 0.25],
    crasher: [21.1914, 0, 0.68, 5]
};
function applyMeasuredShape(name, row) {
    if (!Class[name] || !row) return;
    Class[name].BODY = Object.assign({}, Class[name].BODY, { HEALTH: row[0] / 2, SHIELD: row[1] / 2, DAMAGE: row[2] });
    if (row[3] != null) Class[name].SIZE = row[3];
}
function labyShapeName(poly, tier, shiny) {
    let base = polyNames[poly][0].toUpperCase() + polyNames[poly].slice(1),
        name = shinyNames[shiny] + (tier === 0 ? "" : base === "Pentagon" && tier < 3 ? "Laby" : "") + ["", "Beta", "Alpha", "Omega"][tier] + base;
    return name[0].toLowerCase() + name.slice(1);
}
for (let name in measuredShapes) applyMeasuredShape(name, measuredShapes[name]);
for (let tier = 0; tier < 4; tier++) {
    for (let poly in polyNames) {
        for (let shiny in shinyNames) {
            let row = measuredShapes[labyShapeName(poly, tier, shiny)];
            applyMeasuredShape(`laby_${poly}_${tier}_${shiny}_0`, row);
            if (row) applyMeasuredShape(`laby_${poly}_${tier}_${shiny}_1`, [row[0], row[1], row[2] * 0.68]);
        }
    }
}
