const { weaponArray } = require('../facilitators.js');

// Rocks
Class.gravel = {
    PARENT: "genericObstacle",
    LABEL: "Gravel",
    SIZE: 16,
    SHAPE: -7
};
Class.stone = {
    PARENT: "genericObstacle",
    LABEL: "Stone",
    SIZE: 32,
    SHAPE: -7,
    VARIES_IN_SIZE: true
};
Class.rock = {
    PARENT: "genericObstacle",
    LABEL: "Rock",
    SIZE: 60,
    SHAPE: -9,
    VARIES_IN_SIZE: true
};
Class.moon = {
    PARENT: "genericObstacle",
    LABEL: "Moon",
    SIZE: 60
};
Class.pumpkinLine = {
    LABEL: "Line",
    SHAPE: -1,
    COLOR: "#ff9000",
};
Class.pumpkinCircle = {
    LABEL: "Circle",
    SHAPE: 0,
    COLOR: "#654320",
};
Class.pumpkinStar = {
    LABEL: "Star",
    SHAPE: -6,
    COLOR: "#267524"
};
Class.pumpkin = {
    PARENT: "stone",
    LABEL: "Pumpkin",
    SHAPE: 9,
    COLOR: "#ff9000",
    GUNS: [],
    SIZE: 63,
    PROPS: [
        ...weaponArray({
            POSITION: [6, -4.5, 0, 0, 360, 1],
            TYPE: "pumpkinLine",
        }, 9),
        {
            POSITION: [6.5, 0, 0, 0, 360, 2],
            TYPE: "pumpkinCircle",
        },
        {
            POSITION: [4.5, 0, 0, 0, 360, 3],
            TYPE: "pumpkinStar",
        },
    ],
};

// Walls
Class.wall = {
    PARENT: 'genericObstacle',
    LABEL: "Wall",
    SIZE: 25,
    SHAPE: 4,
    ANGLE: 0,
    FACING_TYPE: ['noFacing', { angle: Math.PI / 2 }],
    WALL_TYPE: 1,
    VARIES_IN_SIZE: false
};
Class.labyrinthWall = {
    PARENT: 'wall',
    COLOR: 'black',
    ALPHA: 0.5
};
Class.deadlyWall = {
    PARENT: 'wall',
    LABEL: "Deadly Wall",
    COLOR: 'red'
};
Class.healingWall = {
    PARENT: 'wall',
    LABEL: "Healing Wall",
    COLOR: 'green'
};
Class.bouncyWall = {
    PARENT: 'wall',
    LABEL: "Bouncy Wall",
    COLOR: 'pureBlack'
};
Class.breakerWall = {
    PARENT: 'wall',
    LABEL: "Breaker Wall",
    COLOR: 'pink'
};
Class.chunksWall = {
    PARENT: 'wall',
    LABEL: "Chunks Wall",
    COLOR: 'aqua'
};
Class.opticalWall = {
    PARENT: 'wall',
    LABEL: "Optical Wall",
    COLOR: 'gold',
    PROPS: [
        {
            TYPE: 'eyeTurret',
            POSITION: {
                SIZE: 14,
                ARC: 360,
                LAYER: 1
            },
            ANGLE: Math.PI / 2
        }
    ]
};
Class.oneWayWallUp = {
    PARENT: 'wall',
    LABEL: "One-Way Wall (Up)",
    PROPS: [
        {
            TYPE: 'triangleHat',
            POSITION: {
                SIZE: 7,
                X: -0.5,
                ANGLE: 270,
                LAYER: 1
            }
        }
    ]
};
Class.oneWayWallDown = {
    PARENT: 'wall',
    LABEL: "One-Way Wall (Down)",
    PROPS: [
        {
            TYPE: 'triangleHat',
            POSITION: {
                SIZE: 7,
                X: -0.5,
                ANGLE: 90,
                LAYER: 1
            }
        }
    ]
};
Class.oneWayWallLeft = {
    PARENT: 'wall',
    LABEL: "One-Way Wall (Left)",
    PROPS: [
        {
            TYPE: 'triangleHat',
            POSITION: {
                SIZE: 7,
                X: -0.5,
                ANGLE: 180,
                LAYER: 1
            }
        }
    ]
};
Class.oneWayWallRight = {
    PARENT: 'wall',
    LABEL: "One-Way Wall (Right)",
    PROPS: [
        {
            TYPE: 'triangleHat',
            POSITION: {
                SIZE: 7,
                X: -0.5,
                LAYER: 1
            }
        }
    ]
};
Class.stickyWall = {
    PARENT: 'wall',
    LABEL: "Sticky Wall",
    COLOR: 'veryLightGrey'
};
Class.trickWall = {
    PARENT: 'wall',
    LABEL: "Trick Wall",
    COLOR: 'aqua'
};
Class.paintWall = {
    PARENT: 'wall',
    LABEL: "Paint Wall",
    COLOR: 'veryLightGrey',
    PROPS: [
        {
            TYPE: 'squareHat',
            POSITION: {
                SIZE: 10 * Math.SQRT2,
                ANGLE: 45,
                LAYER: 1
            }
        }
    ]
};
Class.filterWall = {
    PARENT: 'wall',
    LABEL: "Filter Wall",
    COLOR: 'veryLightGrey',
    PROPS: [
        {
            TYPE: 'squareHat',
            POSITION: {
                SIZE: 10 * Math.SQRT2,
                ANGLE: 45,
                LAYER: 1
            }
        }
    ]
};
Class.teamWall = {
    PARENT: "wall",
    LABEL: "Team Wall",
    PROPS: [
        {
            TYPE: "squareHat",
            POSITION: {
                SIZE: 15,
                LAYER: 1
            },
            ANGLE: Math.PI / 2
        }
    ],
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
};
Class.baseWall = {
    PARENT: 'wall',
    LABEL: "Base Wall",
    COLOR: 'red'
};
Class.portalWall = {
    PARENT: 'wall',
    LABEL: "Portal Wall",
    COLOR: 'blue'
};
Class.checkpointWall = {
    PARENT: 'wall',
    LABEL: "Checkpoint Wall",
    COLOR: 'green'
};
