module.exports = {
    // Tooltips
    tooltip: {
        menu_lag: "WARNING: There are a lot of entities in here and having this menu open may cause noticeable frame drops!"
    },

    // Tanks
    gun: {},
    prop: {},
    turret: {
        driveHat: [
            {
                TYPE: ['squareHat', {COLOR: 'grey'}],
                POSITION: {
                    SIZE: 9,
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
            type: 'megaAutoTurret', size: 12
        },
        ultra: {
            type: 'ultraAutoTurret', size: 14
        },
        triple: {
            size: 6.5, x: 5.2, angle: 0, total: 3
        },
        tripleMega: {
            type: 'megaAutoTurret', size: 7.5, x: 5.5, angle: 0, total: 3
        },
        tripleUltra: {
            type: 'ultraAutoTurret', size: 8.5, x: 5.8, angle: 0, total: 3
        },
        penta: {
            size: 5.2, x: 6.5, angle: 0, total: 5
        },
        pentaMega: {
            type: 'megaAutoTurret', size: 5.7, x: 6.9, angle: 0, total: 5
        },
        pentaUltra: {
            type: 'ultraAutoTurret', size: 6.2, x: 7.3, angle: 0, total: 5
        },
        hepta: {
            size: 4, x: 6.5, angle: 0, total: 7
        },
        heptaMega: {
            type: 'megaAutoTurret', size: 4.25, x: 7, angle: 0, total: 7
        },
        heptaUltra: {
            type: 'ultraAutoTurret', size: 4.5, x: 7.5, angle: 0, total: 7
        },
        drive: {
            type: 'driveAutoTurret', clearTurrets: true, size: 9
        },
        driveMega: {
            type: 'driveMegaAutoTurret', clearTurrets: true, size: 11
        },
        driveTriple: {
            type: 'driveAutoTurret', clearTurrets: true, size: 6.5, x: 5.2, angle: 0, total: 3
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
            event: 'define',
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
