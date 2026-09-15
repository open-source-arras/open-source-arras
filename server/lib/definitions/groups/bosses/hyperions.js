const {combineStats,makeMenu} = require('../../facilitators.js')
const {base} = require('../../constants.js')
const g = require('../../gunvals.js')

Class.hyperion_base = {
    PARENT: "miniboss",
    LABEL: "Hyperion Base",
    COLOR: '#CBC9FF',
    SIZE: 12,
    VALUE: 5e4,
    SKILL: [5, 9, 9, 9, 5, 1, 0, 9, 1, 0],
    BODY: {
        FOV: 1.5,
        SPEED: 0.3 * base.SPEED,
        HEALTH: 4 * base.HEALTH,
        DAMAGE: 2 * base.DAMAGE,
        REGEN: 0.5 * base.REGEN
    },
    FACING_TYPE: 'toTarget'
}

Class.hyperion_mk0_shield_l = {
    COLOR: "#CBC9FF",
    SHAPE: [[-0.375,-1],[-0.375,1],[0.375,0.625],[0.375,-0.625]],
    GUNS: [
        {
            POSITION: {
                LENGTH: 14,
                WIDTH: 5,
                ANGLE: 270,
                DELAY: 0.5
            },
            PROPERTIES: {
                SHOOT_SETTINGS: combineStats([g.basic, g.lowPower, g.noRecoil]),
                TYPE: 'bullet'
            }
        },
        {
            POSITION: {
                LENGTH: 6,
                WIDTH: 12,
                ASPECT: 2/3,
                ANGLE: 180
            }
        }
    ]
}

Class.hyperion_mk0_shield_r = {
    COLOR: "#CBC9FF",
    SHAPE: [[-0.375,-1],[-0.375,1],[0.375,0.625],[0.375,-0.625]],
    GUNS: [
        {
            POSITION: {
                LENGTH: 14,
                WIDTH: 5,
                ANGLE: 90,
                DELAY: 0.5
            },
            PROPERTIES: {
                SHOOT_SETTINGS: combineStats([g.basic, g.lowPower, g.noRecoil]),
                TYPE: 'bullet'
            }
        },
        {
            POSITION: {
                LENGTH: 6,
                WIDTH: 12,
                ASPECT: 2/3,
                ANGLE: 180
            }
        }
    ]
}

Class.hyperion_mk0 = {
    PARENT: 'hyperion_base',
    LABEL: "Hyperion MK0",
    UPGRADE_LABEL: "Hyperion MK0",
    UPGRADE_COLOR: "#CBC9FF",
    FACING_TYPE: 'toTarget',
    BODY: {
        FOV: 15,
        SPEED: 1.6 * base.SPEED,
        HEALTH: 1 * base.HEALTH,
        DAMAGE: 1 * base.DAMAGE,
        REGEN: 0.5 * base.REGEN
    },
    SIZE: 6,
    GUNS: [
        {
            POSITION: {
                LENGTH: 18,
                WIDTH: 8
            },
            PROPERTIES: {
                SHOOT_SETTINGS: combineStats([g.basic, g.lowPower, g.noRecoil]),
                TYPE: 'bullet'
            }
        }
    ],
    TURRETS: [
        {
            POSITION: [30, 15, 0, 90, 0, 1],
            TYPE: "hyperion_mk0_shield_l",
        },
        {
            POSITION: [30, 15, 0, 270, 0, 1],
            TYPE: "hyperion_mk0_shield_r",
        }
    ]
}

Class.hyperion_mkhalf_shield_l = {
    COLOR: "#CBC9FF",
    SHAPE: [[-0.375,-1],[-0.375,1],[0.375,0.625],[0.375,-0.625]],
    GUNS: [
        {
            POSITION: {
                LENGTH: 14,
                WIDTH: 5,
                ANGLE: 270,
                DELAY: 0.5
            },
            PROPERTIES: {
                SHOOT_SETTINGS: combineStats([g.basic, g.lowPower, g.noRecoil]),
                TYPE: 'bullet'
            }
        }, {
            POSITION: {
                LENGTH: 12.5,
                WIDTH: 2.5,
                ANGLE: 90,
                DELAY: 1
            },
            PROPERTIES: {
                SHOOT_SETTINGS: combineStats([g.basic, g.lowPower, g.gunner, g.noRecoil]),
                TYPE: 'bullet'
            }
        }, {
            POSITION: {
                LENGTH: 6,
                WIDTH: 12,
                ASPECT: 2/3,
                ANGLE: 180
            }
        }
    ]
}

Class.hyperion_mkhalf_shield_r = {
    COLOR: "#CBC9FF",
    SHAPE: [[-0.375,-1],[-0.375,1],[0.375,0.625],[0.375,-0.625]],
    GUNS: [
        {
            POSITION: {
                LENGTH: 14,
                WIDTH: 5,
                ANGLE: 90,
                DELAY: 0.5
            },
            PROPERTIES: {
                SHOOT_SETTINGS: combineStats([g.basic, g.lowPower, g.noRecoil]),
                TYPE: 'bullet'
            }
        }, {
            POSITION: {
                LENGTH: 12.5,
                WIDTH: 2.5,
                ANGLE: 270,
                DELAY: 1
            },
            PROPERTIES: {
                SHOOT_SETTINGS: combineStats([g.basic, g.lowPower, g.gunner, g.noRecoil]),
                TYPE: 'bullet'
            }
        }, {
            POSITION: {
                LENGTH: 6,
                WIDTH: 12,
                ASPECT: 2/3,
                ANGLE: 180
            }
        }
    ]
}

Class.frag1prop = {
    COLOR: "#666666"
}

Class.fake_hyperion_body = {
    COLOR: "#CBC9FF"
}

Class.hyperion_mkhalf = {
    PARENT: 'hyperion_base',
    LABEL: "Hyperion MK0.5",
    UPGRADE_LABEL: "Hyperion MK0.5",
    UPGRADE_COLOR: "#CBC9FF",
    FACING_TYPE: 'toTarget',
    BODY: {
        FOV: 5, //test
        SPEED: 1.2 * base.SPEED,
        HEALTH: 2 * base.HEALTH,
        DAMAGE: 1 * base.DAMAGE,
        REGEN: 0.5 * base.REGEN
    },
    SIZE: 9,
    GUNS: [
        {
            POSITION: {
                LENGTH: 18,
                WIDTH: 8
            },
            PROPERTIES: {
                SHOOT_SETTINGS: combineStats([g.basic, g.noRecoil]),
                TYPE: 'frag1bullet'
            }
        }
    ],
    TURRETS: [
        {
            POSITION: [6, 15, 0, 0, 0, 1],
            TYPE: "frag1prop",
        },
        {
            POSITION: [20, 0, 0, 0, 0, 1],
            TYPE: "fake_hyperion_body",
        },
        {
            POSITION: [30, 15, 0, 90, 0, 1],
            TYPE: "hyperion_mkhalf_shield_l",
        },
        {
            POSITION: [30, 15, 0, 270, 0, 1],
            TYPE: "hyperion_mkhalf_shield_r",
        }
    ]
}

Class.hyperion_mk1_shield = {
    COLOR: "#CBC9FF",
    SHAPE: [[-0.375,-1],[-0.375,1],[0.375,0.625],[0.375,-0.625]],
    GUNS: [
        {
            POSITION: {
                LENGTH: 14,
                WIDTH: 5,
                ANGLE: 90,
                DELAY: 0.5
            },
            PROPERTIES: {
                SHOOT_SETTINGS: combineStats([g.basic, g.lowPower, g.noRecoil]),
                TYPE: 'bullet'
            }
        }, {
            POSITION: {
                LENGTH: 14,
                WIDTH: 5,
                ANGLE: 270,
                DELAY: 1
            },
            PROPERTIES: {
                SHOOT_SETTINGS: combineStats([g.basic, g.lowPower, g.noRecoil]),
                TYPE: 'bullet'
            }
        }, {
            POSITION: {
                LENGTH: 6,
                WIDTH: 12,
                ASPECT: 2/3,
                ANGLE: 180
            }
        }
    ]
}

Class.hyperion_mk1 = {
    PARENT: 'hyperion_base',
    LABEL: "Hyperion MK1",
    UPGRADE_LABEL: "Hyperion MK1",
    UPGRADE_COLOR: "#CBC9FF",
    FACING_TYPE: 'toTarget',
    BODY: {
        FOV: 5
    },
    GUNS: [
        {
            POSITION: {
                LENGTH: 20,
                WIDTH: 6
            },
            PROPERTIES: {
                SHOOT_SETTINGS: combineStats([g.basic, g.hunter, g.hunterSecondary, g.noRecoil]),
                TYPE: 'frag1bullet'
            }
        },
        {
            POSITION: {
                LENGTH: 18,
                WIDTH: 8
            },
            PROPERTIES: {
                SHOOT_SETTINGS: combineStats([g.basic, g.hunter, g.noRecoil]),
                TYPE: 'frag1bullet'
            }
        }
    ],
    TURRETS: [
        {
            POSITION: [30, 15, 0, 90, 0, 1],
            TYPE: "hyperion_mk1_shield",
        },
        {
            POSITION: [30, 15, 0, 270, 0, 1],
            TYPE: "hyperion_mk1_shield",
        }
    ]
}

Class.menu_hyperions = makeMenu("Hyperions", {upgrades: [
    'hyperion_mk0',
    'hyperion_mkhalf',
    'hyperion_mk1'
]});