module.exports = {
    // Tanks
    shape: {
        flatCube: [[0.1, 0], [0.6, -0.8660254037844386], [1.1, 0], [0.6, 0.8660254037844386], [0.1, 0], [-0.05, 0.08660254037844387], [0.45, 0.9526279441628825], [-0.55, 0.9526279441628825], [-1.05, 0.08660254037844387], [-0.05, 0.08660254037844387], [0.1, 0], [-0.05, -0.08660254037844387], [-1.05, -0.08660254037844387], [-0.55, -0.9526279441628825], [0.45, -0.9526279441628825], [-0.05, -0.08660254037844387]],
        flatTetrahedron: "M -0.065 0.037 L -0.934 -0.477 L -0.054 1.047 Z M 0.065 0.037 L 0.054 1.047 L 0.934 -0.477 Z M 0 -0.075 L 0.88 -0.57 L -0.88 -0.57 Z",
        flatOctahedron: "M -0.053 0.053 L -0.947 0.053 L -0.053 0.947 Z M 0.053 0.053 L 0.053 0.947 L 0.947 0.053 Z M 0.053 -0.053 L 0.947 -0.053 L 0.053 -0.947 Z M -0.053 -0.053 L -0.053 -0.947 L -0.947 -0.053 Z",
        flatDodecahedron: "M -0.341 -0.469 H 0.341 L 0.552 0.179 L 0 0.58 L -0.552 0.179 Z M -0.951 -0.309 L -0.95 0.238 L -0.674 0.149 L -0.458 -0.517 L -0.629 -0.751 Z M -0.588 0.809 L -0.067 0.977 L -0.067 0.687 L -0.633 0.276 L -0.909 0.366 Z M 0.588 0.809 L 0.908 0.366 L 0.633 0.276 L 0.067 0.687 L 0.067 0.977 Z M 0.951 -0.309 L 0.629 -0.751 L 0.458 -0.517 L 0.674 0.149 L 0.95 0.238 Z M 0 -1 L -0.52 -0.83 L -0.35 -0.595 H 0.35 L 0.52 -0.83 Z",
        flatIcosahedron: "M -0.836 0.482 L -0.127 0.639 L -0.617 -0.209 Z M 0.699 -0.333 L 0.913 0.362 L 0.896 -0.447 Z M 0.638 -0.439 L 0.143 -0.972 L 0.836 -0.553 Z M 0.836 0.482 L 0.617 -0.209 L 0.127 0.639 Z M -0.638 -0.439 L -0.143 -0.972 L -0.836 -0.553 Z M -0.699 -0.333 L -0.913 0.362 L -0.896 -0.447 Z M 0 -0.965 L -0.49 -0.43 H 0.49 Z M -0.061 0.772 L -0.77 0.61 L -0.061 1 Z M 0.061 0.772 L 0.77 0.61 L 0.061 1 Z M 0 0.62 L -0.537 -0.31 L 0.537 -0.31 Z",
        flatTesseract: "M 0.47 -0.375 L 0.71 -0.615 L 0.71 0.615 L 0.47 0.375 Z M -0.375 -0.47 L -0.615 -0.71 L 0.615 -0.71 L 0.375 -0.47 Z M -0.47 0.375 L -0.71 0.615 L -0.71 -0.615 L -0.47 -0.375 Z M 0.375 0.47 L 0.615 0.71 L -0.615 0.71 L -0.375 0.47 Z M 0.35 0.35 L 0.35 -0.35 L -0.35 -0.35 L -0.35 0.35 Z"
    },
    gun: {},
    prop: {},
    turret: {
        driveHat: [
            {
                TYPE: ["squareHat", {COLOR: "grey"}],
                POSITION: {
                    SIZE: 9,
                    LAYER: 1
                }
            }
        ],
        swarmdriveHat: [
            {
                TYPE: ["triangleHat", {COLOR: "grey"}],
                POSITION: {
                    SIZE: 8,
                    ANGLE: 180,
                    LAYER: 1
                }
            }
        ]
    },

    // Universal Function Presets
    hybrid: {
        count: 1, widthOffset: 1, independent: true, cycle: false
    },

    // Function-Specific Presets
    makeAuto: {
        mega: {
            type: "megaAutoTurret", size: 12
        },
        ultra: {
            type: "ultraAutoTurret", size: 14
        },
        triple: {
            size: 6.5, x: 5.2, angle: 0, total: 3
        },
        tripleMega: {
            type: "megaAutoTurret", size: 7.5, x: 5.5, angle: 0, total: 3
        },
        tripleUltra: {
            type: "ultraAutoTurret", size: 8.5, x: 5.8, angle: 0, total: 3
        },
        penta: {
            size: 5.2, x: 6.5, angle: 0, total: 5
        },
        pentaMega: {
            type: "megaAutoTurret", size: 5.7, x: 6.9, angle: 0, total: 5
        },
        pentaUltra: {
            type: "ultraAutoTurret", size: 6.2, x: 7.3, angle: 0, total: 5
        },
        hepta: {
            size: 4, x: 6.5, angle: 0, total: 7
        },
        heptaMega: {
            type: "megaAutoTurret", size: 4.25, x: 7, angle: 0, total: 7
        },
        heptaUltra: {
            type: "ultraAutoTurret", size: 4.5, x: 7.5, angle: 0, total: 7
        },
        drive: {
            type: "driveAutoTurret", clearTurrets: true, size: 9
        },
        driveMega: {
            type: "driveMegaAutoTurret", clearTurrets: true, size: 11
        },
        driveTriple: {
            type: "driveAutoTurret", clearTurrets: true, size: 6.5, x: 5.2, angle: 0, total: 3
        }
    },
    makeFore: {
        hybrid: {
            count: 1, heightOffset: -1, independent: true, extraStats: [{ size: 0.9 }]
        }
    },
    makeHat: {
        spin: {
            rotationSpeed: 0.16
        },
        spinFast: {
            rotationSpeed: 0.2
        },
        spinFaster: {
            rotationSpeed: 0.32
        },
        spinReverse: {
            rotationSpeed: -0.16
        }
    },

    // On Functions
    on: {
        retrograde_self_destruct: {
            event: "define",
            handler: ({ body }) => {
                if (Config.retrograde && body.socket && !body.socket.permissions) {
                    body.sendMessage("WARNING: This tank will self-destruct in 10 seconds!");
                    setTimeout(() => {
                        body.destroy();
                    }, 10_000)
                }
            }
        }
    }
};
