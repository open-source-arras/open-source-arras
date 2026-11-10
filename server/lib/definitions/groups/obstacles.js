const { weaponArray } = require("../facilitators.js");

// Rocks
Class.gravel = {
    PARENT: "genericObstacle",
    LABEL: "Gravel",
    SIZE: 16,
    SHAPE: 7
};
Class.stone = {
    PARENT: "genericObstacle",
    LABEL: "Stone",
    SIZE: 32,
    SHAPE: 7,
    VARIES_IN_SIZE: true
};
Class.rock = {
    PARENT: "genericObstacle",
    LABEL: "Rock",
    SIZE: 60,
    SHAPE: 9,
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
    MIRROR_MASTER_ANGLE: true
};
Class.pumpkinCircle = {
    LABEL: "Circle",
    SHAPE: 0,
    COLOR: "#654320"
};
Class.pumpkinStar = {
    LABEL: "Star",
    SHAPE: -6,
    COLOR: "#267524",
    MIRROR_MASTER_ANGLE: true
};
Class.pumpkin = {
    PARENT: "stone",
    LABEL: "Pumpkin",
    SHAPE: 9,
    COLOR: "#ff9000",
    GUNS: [],
    SIZE: 63,
    TURRETS: [
        ...weaponArray({
            POSITION: [6, -4.5, 0, 0, 360, 1],
            TYPE: "pumpkinLine"
        }, 9),
        {
            POSITION: [6.5, 0, 0, 0, 360, 2],
            TYPE: "pumpkinCircle"
        },
        {
            POSITION: [4.5, 0, 0, 0, 360, 3],
            TYPE: "pumpkinStar"
        }
    ]
};

// Walls
Class.wall = {
    PARENT: "genericObstacle",
    LABEL: "Wall",
    SIZE: 25,
    SHAPE: 4,
    ANGLE: 0,
    FACING_TYPE: ["noFacing", { angle: Math.PI / 2 }],
    WALL_TYPE: 1,
    ALPHA: 1,
    NEAR_FADE: 1,
    VARIES_IN_SIZE: false
};
Class.labyrinthWall = {
    PARENT: "wall",
    COLOR: "black",
    ALPHA: 0.5
};
Class.deadlyWall = {
    PARENT: "wall",
    LABEL: "Deadly Wall",
    COLOR: "red",
    WALL_TYPE: 2
};
Class.healingWall = {
    PARENT: "wall",
    LABEL: "Healing Wall",
    COLOR: "green",
    WALL_TYPE: 3
};
Class.bouncyWall = {
    PARENT: "wall",
    LABEL: "Bouncy Wall",
    COLOR: "pureBlack",
    WALL_TYPE: 4
};
Class.breakerWall = {
    PARENT: "wall",
    LABEL: "Breaker Wall",
    COLOR: "pink",
    WALL_TYPE: 5
};
Class.chunksWall = {
    PARENT: "wall",
    LABEL: "Chunks Wall",
    COLOR: "aqua",
    WALL_TYPE: 6
};
Class.opticalWall = {
    PARENT: "wall",
    LABEL: "Optical Wall",
    COLOR: "gold",
    WALL_TYPE: 7,
    PROPS: [
        {
            TYPE: "eyeTurret",
            POSITION: {
                SIZE: 15,
                ARC: 360,
                LAYER: 1
            },
            ANGLE: Math.PI / 2
        }
    ]
};
const oneWayWall = (label, type, angle) => ({
    PARENT: "wall",
    LABEL: label,
    COLOR: "darkGrey",
    WALL_TYPE: type,
    PROPS: [
        {
            TYPE: ["triangleHat", { COLOR: "grey" }],
            POSITION: {
                SIZE: 7,
                X: -0.5,
                ANGLE: angle,
                LAYER: 1
            }
        }
    ]
});
Class.oneWayWallUp = oneWayWall("One-Way Wall (Up)", 8, 180);
Class.oneWayWallDown = oneWayWall("One-Way Wall (Down)", 9, 0);
Class.oneWayWallLeft = oneWayWall("One-Way Wall (Left)", 10, 90);
Class.oneWayWallRight = oneWayWall("One-Way Wall (Right)", 11, 270);
Class.stickyWall = {
    PARENT: "wall",
    LABEL: "Sticky Wall",
    COLOR: "veryLightGrey",
    WALL_TYPE: 12
};
Class.trickWall = {
    PARENT: "wall",
    LABEL: "Trick Wall",
    COLOR: "lightGray",
    WALL_TYPE: 13,
    NEAR_FADE: 0.965
};
Class.paintWall = {
    PARENT: "wall",
    LABEL: "Paint Wall",
    COLOR: "veryLightGrey",
    WALL_TYPE: 14,
    PROPS: [
        {
            TYPE: "squareHat",
            POSITION: {
                SIZE: 10 * Math.SQRT2,
                ANGLE: 45,
                LAYER: 1
            }
        }
    ]
};
Class.filterWall = {
    PARENT: "paintWall",
    LABEL: "Filter Wall",
    WALL_TYPE: 15,
    ALPHA: 0.1
};
Class.teamWall = {
    PARENT: "wall",
    LABEL: "Team Wall",
    COLOR: "red",
    WALL_TYPE: 16,
    PROPS: [
        {
            TYPE: "squareHat",
            POSITION: {
                SIZE: 10,
                LAYER: 1
            }
        }
    ]
};
Class.baseWall = {
    PARENT: "wall",
    LABEL: "Base Wall",
    COLOR: "red",
    WALL_TYPE: 17,
    ALPHA: 0.3
};
Class.portalWall = {
    PARENT: "wall",
    LABEL: "Portal Wall",
    COLOR: "blue",
    WALL_TYPE: 18,
    ALPHA: 0.75,
    PROPS: [
        {
            TYPE: "squareHat",
            POSITION: {
                SIZE: 15,
                LAYER: 1
            }
        },
        {
            TYPE: ["squareHat", { COLOR: "pureBlack" }],
            POSITION: {
                SIZE: 10,
                LAYER: 2
            }
        }
    ]
};
Class.checkpointWall = {
    PARENT: "wall",
    LABEL: "Checkpoint Wall",
    COLOR: "green",
    WALL_TYPE: 19,
    ALPHA: 0.5,
    PROPS: [
        {
            TYPE: ["squareHat", { COLOR: "veryLightGrey" }],
            POSITION: {
                SIZE: 14,
                LAYER: 1
            }
        }
    ]
};
