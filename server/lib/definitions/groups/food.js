const {makeCrasher, makeLaby, makePolychoron, makePolyhedron, makePresent, makeRarities, makeRelic} = require('../facilitators.js')
const {basePolygonDamage, basePolygonHealth} = require('../constants.js')

// Set the below variable to true to enable the flat 3D shapes from Old Dreadnoughts.
const classic_3D_shapes = false

// Eggs
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
}
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
}
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
}

// Squares
Class.square = {
    PARENT: "food",
    LABEL: "Square",
    VALUE: 30,
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
}

// Triangles
Class.triangle = {
    PARENT: "food",
    LABEL: "Triangle",
    VALUE: 120,
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
}

// Pentagons
Class.pentagon = {
    PARENT: "food",
    LABEL: "Pentagon",
    VALUE: 400,
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
}
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
}
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
}

// Hexagons
Class.hexagon = {
    PARENT: "food",
    LABEL: "Hexagon",
    VALUE: 500,
    SHAPE: 6,
    SIZE: 25,
    COLOR: 'hexagon',
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
}

// Crashers
Class.crasher = {
    TYPE: "crasher",
    LABEL: "Crasher",
    COLOR: 'pink',
    SHAPE: 3,
    SIZE: 5,
    VARIES_IN_SIZE: true,
    CONTROLLERS: ["nearestDifferentMaster", "mapTargetToGoal"],
    AI: {
        NO_LEAD: true,
    },
    BODY: {
        SPEED: 5,
        ACCELERATION: 1.4,
        HEALTH: 0.5,
        DAMAGE: 5,
        PENETRATION: 2,
        PUSHABILITY: 0.5,
        DENSITY: 10,
        RESIST: 2,
    },
    MOTION_TYPE: "motor",
    FACING_TYPE: "smoothWithMotion",
    HITS_OWN_TYPE: "hard",
    HAS_NO_MASTER: true,
    DRAW_HEALTH: true,
}

// Old Dreadnoughts Polygons
Class.hexagon_old = {
    PARENT: "food",
    LABEL: "Hexagon",
    VALUE: 21000,
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
}
Class.septagon = {
    PARENT: "food",
    LABEL: "Septagon",
    VALUE: 28000,
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
}
Class.octagon = {
    PARENT: "food",
    LABEL: "Octagon",
    VALUE: 35000,
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
}
Class.nonagon = {
    PARENT: "food",
    LABEL: "Nonagon",
    VALUE: 42000,
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
    GIVE_KILL_MESSAGE: true,
}

// Rarities
makeRarities([
    'egg',
    'square',
    'triangle',
    'pentagon',
    'betaPentagon',
    'alphaPentagon',
    'hexagon',
    'hexagon_old',
    'septagon',
    'octagon',
    'nonagon'
])

// 3D
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
    })
    tetrahedron_shape = makePolyhedron({
        FACES: [
            [[1, 1, 1], [-1, 1, -1], [1, -1, -1]],
            [[-1, 1, -1], [-1, -1, 1], [1, -1, -1]],
            [[1, 1, 1], [1, -1, -1], [-1, -1, 1]],
            [[1, 1, 1], [-1, -1, 1], [-1, 1, -1]]
        ],
        SCALE: 5,
        VERTEXES_SCALE: 0.1
    })
    octahedron_shape = makePolyhedron({
        FACES: (function () {
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
    })
    dodecahedron_shape = makePolyhedron({
        FACES: (function () {
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
    })
    icosahedron_shape = makePolyhedron({
        FACES: (function () {
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
    })
    tesseract_shape = makePolychoron({
        VERTEXES: [
            [ -1, 1, 1, 1 ],   [ 1, 1, 1, 1 ],
            [ 1, -1, 1, 1 ],   [ -1, -1, 1, 1 ],
            [ -1, 1, -1, 1 ],  [ 1, 1, -1, 1 ],
            [ 1, -1, -1, 1 ],  [ -1, -1, -1, 1 ],
            [ -1, 1, 1, -1 ],  [ 1, 1, 1, -1 ],
            [ 1, -1, 1, -1 ],  [ -1, -1, 1, -1 ],
            [ -1, 1, -1, -1 ], [ 1, 1, -1, -1 ],
            [ 1, -1, -1, -1 ], [ -1, -1, -1, -1 ]
        ],
        FACES: [
            // broken
            [0,1,2,3], [7,6,5,4], [0,1,5,4], [1,2,6,5], [2,3,7,6], [3,0,4,7],
            [8,9,10,11], [15,14,13,12], [8,9,13,12], [9,10,14,13], [10,11,15,14], [11,8,12,15],
            [0,1,9,8],
            [4,5,13,12],
            [1,2,10,9],
            [3,0,8,11],
            [2,3,11,10],
            [7,6,14,15],[5,6,14,13], [4,7,15,12]
        ],
        VERTEXES_SCALE: 0.1,
        SCALE: 6
    })
} else {
    cube_shape = [[0.1,0],[0.6,-0.8660254037844386],[1.1,0],[0.6,0.8660254037844386],[0.1,0],[-0.05,0.08660254037844387],[0.45,0.9526279441628825],[-0.55,0.9526279441628825],[-1.05,0.08660254037844387],[-0.05,0.08660254037844387],[0.1,0],[-0.05,-0.08660254037844387],[-1.05,-0.08660254037844387],[-0.55,-0.9526279441628825],[0.45,-0.9526279441628825],[-0.05,-0.08660254037844387]]
    tetrahedron_shape = "M -0.065 0.037 L -0.934 -0.477 L -0.054 1.047 Z M 0.065 0.037 L 0.054 1.047 L 0.934 -0.477 Z M 0 -0.075 L 0.88 -0.57 L -0.88 -0.57 Z"
    octahedron_shape = "M -0.053 0.053 L -0.947 0.053 L -0.053 0.947 Z M 0.053 0.053 L 0.053 0.947 L 0.947 0.053 Z M 0.053 -0.053 L 0.947 -0.053 L 0.053 -0.947 Z M -0.053 -0.053 L -0.053 -0.947 L -0.947 -0.053 Z"
    dodecahedron_shape = "M -0.341 -0.469 H 0.341 L 0.552 0.179 L 0 0.58 L -0.552 0.179 Z M -0.951 -0.309 L -0.95 0.238 L -0.674 0.149 L -0.458 -0.517 L -0.629 -0.751 Z M -0.588 0.809 L -0.067 0.977 L -0.067 0.687 L -0.633 0.276 L -0.909 0.366 Z M 0.588 0.809 L 0.908 0.366 L 0.633 0.276 L 0.067 0.687 L 0.067 0.977 Z M 0.951 -0.309 L 0.629 -0.751 L 0.458 -0.517 L 0.674 0.149 L 0.95 0.238 Z M 0 -1 L -0.52 -0.83 L -0.35 -0.595 H 0.35 L 0.52 -0.83 Z"
    icosahedron_shape = "M -0.836 0.482 L -0.127 0.639 L -0.617 -0.209 Z M 0.699 -0.333 L 0.913 0.362 L 0.896 -0.447 Z M 0.638 -0.439 L 0.143 -0.972 L 0.836 -0.553 Z M 0.836 0.482 L 0.617 -0.209 L 0.127 0.639 Z M -0.638 -0.439 L -0.143 -0.972 L -0.836 -0.553 Z M -0.699 -0.333 L -0.913 0.362 L -0.896 -0.447 Z M 0 -0.965 L -0.49 -0.43 H 0.49 Z M -0.061 0.772 L -0.77 0.61 L -0.061 1 Z M 0.061 0.772 L 0.77 0.61 L 0.061 1 Z M 0 0.62 L -0.537 -0.31 L 0.537 -0.31 Z"
    tesseract_shape = "M 0.47 -0.375 L 0.71 -0.615 L 0.71 0.615 L 0.47 0.375 Z M -0.375 -0.47 L -0.615 -0.71 L 0.615 -0.71 L 0.375 -0.47 Z M -0.47 0.375 L -0.71 0.615 L -0.71 -0.615 L -0.47 -0.375 Z M 0.375 0.47 L 0.615 0.71 L -0.615 0.71 L -0.375 0.47 Z M 0.35 0.35 L 0.35 -0.35 L -0.35 -0.35 L -0.35 0.35 Z"
}

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
        BRIGHTNESS_SHIFT: -15,
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
}
Class.cube = {
    PARENT: "food",
    LABEL: "Cube",
    NAME: "The Cube",
    VALUE: 2e7,
    SIZE: 10,
    COLOR: 'egg',
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
}
Class.tetrahedron = {
    PARENT: "food",
    LABEL: "Tetrahedron",
    NAME: "The Tetrahedron",
    VALUE: 3e7,
    SIZE: 12,
    COLOR: 'egg',
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
}
Class.octahedron = {
    PARENT: "food",
    LABEL: "Octahedron",
    NAME: "The Octahedron",
    VALUE: 4e7,
    SIZE: 13,
    COLOR: 'egg',
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
}
Class.dodecahedron = {
    PARENT: "food",
    LABEL: "Dodecahedron",
    NAME: "The Dodecahedron",
    VALUE: 5e7,
    SIZE: 18,
    COLOR: 'egg',
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
}
Class.icosahedron = {
    PARENT: "food",
    LABEL: "Icosahedron",
    NAME: "The Icosahedron",
    VALUE: 1e8,
    SIZE: 20,
    COLOR: 'egg',
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
}

// 4D
Class.tesseract = {
    PARENT: "food",
    LABEL: "Tesseract",
    NAME: "The Tesseract",
    VALUE: 42e7,
    SIZE: 25,
    COLOR: 'egg',
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
}

// Presents (todo: make this a self-creating function)
Class.presentRY = makePresent("red", "yellow")
Class.presentRP = makePresent("red", "purple")
Class.presentRW = makePresent("red", "white")
Class.presentGY = makePresent("green", "yellow")
Class.presentGP = makePresent("green", "purple")
Class.presentGW = makePresent("green", "white")
Class.presentBY = makePresent("blue", "yellow")
Class.presentBP = makePresent("blue", "purple")
Class.presentBW = makePresent("blue", "white")

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
            PARENT: 'gem',
            LABEL: name + ' Gem',
            SHAPE: 6,
            COLOR: gemColor
        }
    }

    Class[name + "EggRelic"] = makeRelic("egg", 0.5, gem, 7)
    Class[name + "SquareRelic"] = makeRelic("square", 1, gem)
    Class[name + "TriangleRelic"] = makeRelic("triangle", 1.45, gem)
    Class[name + "PentagonRelic"] = makeRelic("pentagon", -0.6, gem)
    Class[name + "BetaPentagonRelic"] = makeRelic("betaPentagon", -0.6, gem)
    Class[name + "AlphaPentagonRelic"] = makeRelic("alphaPentagon", -0.6, gem)
    Class[name + "HexagonRelic"] = makeRelic("hexagon", -0.4, gem, undefined, 6.25)
    Class[name + "Hexagon_oldRelic"] = makeRelic("hexagon_old", -0.4, gem, undefined, 6.25)
    Class[name + "SeptagonRelic"] = makeRelic("septagon", -0.325, gem, undefined, 5.25)
    Class[name + "OctagonRelic"] = makeRelic("octagon", -0.3, gem, undefined, 4.75)
    Class[name + "NonagonRelic"] = makeRelic("nonagon", -0.25, gem, undefined, 4)
}

// Tiered Food
let polyNames = ['egg', 'square', 'triangle', 'pentagon', 'hexagon'],
    shinyNames = ['', 'shiny', 'legendary', 'shadow', 'rainbow', 'trans'];
for (let tier = 0; tier < 6; tier++) {
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
                polyName === 'Triangle' && tier > 0 ? 2 / 3 : 1
            );

            Class[`laby_${poly}_${tier}_${shiny}_1`] = makeCrasher(
                Class[`laby_${poly}_${tier}_${shiny}_0`]
            );
        }
    }
}
