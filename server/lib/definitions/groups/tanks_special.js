const {combineStats, skillSet, weaponArray} = require('../facilitators.js')
const {base, statnames} = require('../constants.js')
const g = require('../gunvals.js')

// Base Protector
Class.baseProtector = {
    PARENT: 'genericTank',
    LABEL: "Base",
    UPGRADE_LABEL: "Base Protector",
    ON_MINIMAP: false,
    SIZE: 64,
    DAMAGE_CLASS: 0,
    ACCEPTS_SCORE: false,
    CAN_BE_ON_LEADERBOARD: false,
    IGNORED_BY_AI: true,
    HITS_OWN_TYPE: "pushOnlyTeam",
    SKILL: skillSet({
        rld: 1,
        dam: 1,
        pen: 1,
        spd: 1,
        str: 1,
    }),
    BODY: {
        SPEED: 0,
        HEALTH: 1e4,
        DAMAGE: 10,
        PENETRATION: 0.25,
        SHIELD: 1e3,
        REGEN: 100,
        FOV: 1,
        PUSHABILITY: 0,
        RESIST: 10000,
        HETERO: 0,
    },
    FACING_TYPE: ['spin', {speed: 0.04}],
    TURRETS: [
        {
            POSITION: [25, 0, 0, 0, 360, 0],
            TYPE: "dominationBody",
        },
        ...weaponArray({
            POSITION: [12, 7, 0, 45, 100, 0],
            TYPE: "baseSwarmTurret",
        }, 4)
    ],
    GUNS: weaponArray([
        {
            POSITION: [4.5, 11.5, -1.3, 6, 0, 45, 0],
        },
        {
            POSITION: [4.5, 8.5, -1.5, 7, 0, 45, 0],
        },
    ], 4)
}

// Dominators
Class.dominator = {
    PARENT: 'genericTank',
    LABEL: "Dominator",
    UPGRADE_LABEL: 'Unknown',
    ON_MINIMAP: false,
    DANGER: 7,
    SKILL: skillSet({
        rld: 1,
        dam: 1,
        pen: 1,
        str: 1,
        spd: 1,
    }),
    LEVEL: 45,
    LEVEL_CAP: 45,
    SIZE: 50,
    SYNC_WITH_TANK: true,
    BODY: {
        RESIST: 100,
        SPEED: 1.32,
        ACCELERATION: 0.8,
        HEALTH: 590,
        DAMAGE: 6,
        PENETRATION: 0.25,
        FOV: 0.5,
        PUSHABILITY: 0,
        HETERO: 0,
        SHIELD: base.SHIELD * 1.4
    },
    CONTROLLERS: ["nearestDifferentMaster", ["spin", { onlyWhenIdle: true }]],
    AI: { IGNORE_SHAPES: true },
    DISPLAY_NAME: true,
    TURRETS: [
        {
            POSITION: [22, 0, 0, 0, 360, 0],
            TYPE: "dominationBody"
        }
    ],
    CAN_BE_ON_LEADERBOARD: false,
    GIVE_KILL_MESSAGE: false,
    ACCEPTS_SCORE: false,
    HITS_OWN_TYPE: "pushOnlyTeam"
}
Class.destroyerDominator = {
    PARENT: "dominator",
    UPGRADE_LABEL: 'Destroyer',
    GUNS: [
        {
            POSITION: [15.25, 6.75, 1, 0, 0, 0, 0],
            PROPERTIES: {
                SHOOT_SETTINGS: combineStats([g.basic, g.destroyerDominator]),
                TYPE: "bullet"
            }
        },
        {
            POSITION: [5, 6.75, -1.6, 6.75, 0, 0, 0]
        }
    ]
}
Class.gunnerDominator = {
    PARENT: "dominator",
    UPGRADE_LABEL: 'Gunner',
    GUNS: [
        {
            POSITION: [14.25, 3, 1, 0, -2, 0, 0.5],
            PROPERTIES: {
                SHOOT_SETTINGS: combineStats([g.basic, g.gunnerDominator]),
                TYPE: "bullet"
            }
        },
        {
            POSITION: [14.25, 3, 1, 0, 2, 0, 0.5],
            PROPERTIES: {
                SHOOT_SETTINGS: combineStats([g.basic, g.gunnerDominator]),
                TYPE: "bullet"
            }
        },
        {
            POSITION: [15.85, 3, 1, 0, 0, 0, 0],
            PROPERTIES: {
                SHOOT_SETTINGS: combineStats([g.basic, g.gunnerDominator]),
                TYPE: "bullet"
            }
        },
        {
            POSITION: [5, 8.5, -1.6, 6.25, 0, 0, 0]
        }
    ]
}
Class.trapperDominator = {
    PARENT: "dominator",
    UPGRADE_LABEL: 'Trapper',
    FACING_TYPE: ["spin", {speed: 0.02}],
    GUNS: weaponArray([
        {
            POSITION: [4, 3.75, 1, 8, 0, 0, 0]
        },
        {
            POSITION: [1.25, 3.75, 1.7, 12, 0, 0, 0],
            PROPERTIES: {
                SHOOT_SETTINGS: combineStats([g.trap, g.trapperDominator]),
                TYPE: "trap",
                STAT_CALCULATOR: "trap",
                AUTOFIRE: true
            }
        }
    ], 8)
}

// Sanctuaries
Class.sanctuary = {
    PARENT: 'dominator',
    LABEL: "Sanctuary",
    DISPLAY_NAME: false,
    DISPLAY_SCORE: false,
    LEVEL: 45,
    SIZE: 20,
    FACING_TYPE: ['spin', {speed: 0.025}],
    SKILL: skillSet({
        rld: 1.25,
        dam: 1.25,
        str: 1.25,
    }),
    BODY: {
        HEALTH: 1280,
        DAMAGE: 5.5,
        SHIELD: base.SHIELD * 1.2
    },
    TURRETS: [
        {
            TYPE: 'dominationBody',
            POSITION: {
                SIZE: 22
            }
        }
    ]
}
let sancTiers =       [3, 6, 8, 9, 10, 12]
let sancHealerTiers = [2, 3, 4]
for (let tier of sancHealerTiers) {
    Class['sanctuaryHealerTier' + (sancHealerTiers.indexOf(tier) + 1)] = {
        PARENT: 'sanctuaryHealer',
        FACING_TYPE: ['spin', {speed: -0.06}],
        GUNS: weaponArray([
            {
                POSITION: {
                    LENGTH: 6,
                    WIDTH: 9,
                    ASPECT: -0.5,
                    X: 12.5
                },
            },
            {
                POSITION: {
                    LENGTH: 5.5,
                    WIDTH: 10,
                    X: 10
                },
                PROPERTIES: {
                    SHOOT_SETTINGS: combineStats([g.basic, { range: 0.5, reload: 1.1, speed: 0.80 }, g.healer]),
                    SPAWN_OFFSET: 0,
                    TYPE: 'healerSanctuaryBullet',
                    AUTOFIRE: true,
                }
            }
        ], tier)
    }
}
for (let tier of sancTiers) {
    let sancIndex = sancTiers.indexOf(tier)
    Class['sanctuaryTier' + (sancIndex + 1)] = {
        PARENT: 'sanctuary',
        TURRETS: [],
        UPGRADE_LABEL: 'Tier ' + (sancIndex + 1),
        GUNS: weaponArray([
            {
                POSITION: {LENGTH: 12, WIDTH: 4}
            }, {
                POSITION: {LENGTH: 1.5, WIDTH: 4, ASPECT: 1.7, X: 12},
                PROPERTIES: {
                    SHOOT_SETTINGS: combineStats([g.trap, {shudder: 0.15, health: 7, reload: 1.5, speed: 1}]),
                    TYPE: ["trap", {BODY: {PUSHABILITY: 0.5}}],
                    STAT_CALCULATOR: "trap",
                    AUTOFIRE: true,
                },
            }
        ], tier)
    }
    Class['sanctuaryTier' + (sancIndex + 1)].TURRETS.push({
        POSITION: { SIZE: 22 },
        TYPE: 'dominationBody',
    }, {
        POSITION: { SIZE: 9.3, LAYER: 1 },
        TYPE: 'sanctuaryHealerTier' + (sancIndex < 2 ? 1 : sancIndex < 4 ? 2 : sancIndex < 6 ? 3 : 3),
    })
}

// Mothership
Class.mothership = {
    PARENT: 'genericTank',
    LABEL: "Mothership",
    NAME: "Mothership",
    DANGER: 10,
    SIZE: Class.genericTank.SIZE * (12 / 3),
    SHAPE: 16,
    STAT_NAMES: statnames.drone,
    VALUE: 5e5,
    SKILL: [9, 9, 9, 9, 9, 9, 9, 9, 9, 9],
    BODY: {
        REGEN: 0.5,
        FOV: 1,
        SHIELD: 0,
        ACCEL: 0.2,
        SPEED: 0.3,
        HEALTH: 4000,
        PUSHABILITY: 0.15,
        DENSITY: 0.2,
        DAMAGE: 1.5,
    },
    HITS_OWN_TYPE: "pushOnlyTeam",
    GUNS: 
    weaponArray([
        {
            POSITION: [4.3, 3.1, 1.2, 8, 0, 22.5, 0],
            PROPERTIES: {
                MAX_CHILDREN: 2,
                SHOOT_SETTINGS: combineStats([g.drone, g.overseer, g.mothership]),
                TYPE: "drone",
                AUTOFIRE: true,
                SYNCS_SKILLS: true,
                STAT_CALCULATOR: "drone",
                WAIT_TO_CYCLE: true,
            }
        }, {
            POSITION: [4.3, 3.1, 1.2, 8, 0, 45, 1/32],
            PROPERTIES: {
                MAX_CHILDREN: 2,
                SHOOT_SETTINGS: combineStats([g.drone, g.overseer, g.mothership]),
                TYPE: ["drone", {
                        AI: {skynet: true},
                        INDEPENDENT: true,
                        BODY: {FOV: 2},
                    }],
                AUTOFIRE: true,
                SYNCS_SKILLS: true,
                STAT_CALCULATOR: "drone",
                WAIT_TO_CYCLE: true,
            }
        }
    ], 8, {delayIncrement: 1/16})
}
Class.flagship = {
    PARENT: 'mothership',
    LABEL: "Flagship",
    NAME: "Flagship",
    TURRETS: [
        {
            TYPE: 'flagshipTurret',
            POSITION: {
                SIZE: 10,
                ANGLE: 45,
                LAYER: 1
            }
        }
    ]
}
Class.turkeynose = {
    COLOR: 19,
    LABEL: '',
    SIZE: 6.45,
}
Class.turkeyeye = {
    COLOR: 18,
    LABEL: '',
    TURRETS: [
        {
            POSITION: [10.75, 1, 0, 0, 360, 1],
            TYPE: "turkeynose"
        }
    ] 
}
Class.turkeyhead = {
    LABEL: 'Turkey',
    SIZE: 26.9,
    GUNS: [
        {
            POSITION: [19.8, 8.1, -1.75, 5.5, 0, 0, 0]
        }
    ],
    SHAPE: 0,
    TURRETS: [
        {
            POSITION: [6.5, 7, -5, 0, 360, 1],
            TYPE: "turkeyeye"
        },
        {
            POSITION: [6.5, 7, 5, 0, 360, 1],
            TYPE: "turkeyeye"
        }
    ]
}
Class.turkey = {
    PARENT: 'genericTank',
    LABEL: 'Turkey',
    NAME: 'Turkey',
    SIZE: 50,
    MAX_CHILDREN: 16,
    SHAPE: 16,
    BODY: {
        SPEED: base.SPEED * 0.2,
        FOV: 1.5,
        SHIELD: 0,
        ACCEL: 0.2,
        SPEED: 0.3,
        HEALTH: 2000,
        PUSHABILITY: 0.15,
        DENSITY: 0.2,
        DAMAGE: 1.5,
    },
    GUNS: [
        {
            POSITION: [18, 4.69, 1, 0, 0, 135, 0],
            PROPERTIES: {
                SHOOT_SETTINGS: combineStats([g.drone, g.overseer, g.mothership]),
                TYPE: "drone",
                AUTOFIRE: true,
                SYNCS_SKILLS: true,
                STAT_CALCULATOR: "drone",
            },
        },
        { 
            POSITION: [20.96, 6.69, 1, 0, 0, 157.5, 0],
            PROPERTIES: {
                SHOOT_SETTINGS: combineStats([g.drone, g.overseer, g.mothership]),
                TYPE: "drone",
                AUTOFIRE: true,
                SYNCS_SKILLS: true,
                STAT_CALCULATOR: "drone",
            }, 
        },
        {
            POSITION: [18, 4.69, 1, 0, 0, 225, 0],
            PROPERTIES: {
                SHOOT_SETTINGS: combineStats([g.drone, g.overseer, g.mothership]),
                TYPE: "drone",
                AUTOFIRE: true,
                SYNCS_SKILLS: true,
                STAT_CALCULATOR: "drone",
            },  
        },
        {
            POSITION: [20.96, 6.69, 1, 0, 0, 202.5, 0],
            PROPERTIES: {
                SHOOT_SETTINGS: combineStats([g.drone, g.overseer, g.mothership]),
                TYPE: "drone",
                AUTOFIRE: true,
                SYNCS_SKILLS: true,
                STAT_CALCULATOR: "drone",
            }, 
        },
        {
        POSITION: [24.09, 8.69, 1, 0, 0, 180, 0],
            PROPERTIES: {
                SHOOT_SETTINGS: combineStats([g.drone, g.overseer, g.mothership]),
                TYPE: "drone",
                AUTOFIRE: true,
                SYNCS_SKILLS: true,
                STAT_CALCULATOR: "drone",
            },
        },
        {
            POSITION: [ 24.09, 8.69, 1, 0, 0, 180, 0 ],
            PROPERTIES: {
                SHOOT_SETTINGS: combineStats([g.drone, g.overseer, g.mothership]),
                TYPE: "drone",
                AUTOFIRE: true,
                SYNCS_SKILLS: true,
                STAT_CALCULATOR: "drone",
            },
        },
        { 
            POSITION: [ 4, 5, 1, 10, 0, 105, 0 ],
            PROPERTIES: {
                SHOOT_SETTINGS: combineStats([g.drone, g.overseer, g.mothership]),
                TYPE: "drone",
                AUTOFIRE: true,
                SYNCS_SKILLS: true,
                STAT_CALCULATOR: "drone",
            }, 
        },
        {   POSITION: [ 4, 5, 1, 10, 0, -105, 0 ],
            PROPERTIES: {
                SHOOT_SETTINGS: combineStats([g.drone, g.overseer, g.mothership]),
                TYPE: "drone",
                AUTOFIRE: true,
                SYNCS_SKILLS: true,
                STAT_CALCULATOR: "drone",
            }, 
        }
    ],
    TURRETS: [
        {
            POSITION: [10, 8.75, 0, 0, 360, 1],
            TYPE: "turkeyhead"
        }
    ],
}

// ATMG
Class.antiTankMachineGun = {
    PARENT: "dominator",
    LABEL: "Anti-Tank Machine Gun",
    UPGRADE_LABEL: "A.T.M.G.",
    CONTROLLERS: [['spin', {onlyWhenIdle: true}], 'nearestDifferentMaster'],
    LEVEL: 45,
    SIZE: 32,
    BODY: {
        RESIST: 100,
        SPEED: 1.32,
        ACCELERATION: 0.8,
        HEALTH: 1e99,
        DAMAGE: 6,
        PENETRATION: 0.25,
        FOV: 1.35,
        PUSHABILITY: 0,
        HETERO: 0,
        SHIELD: base.SHIELD * 1.4,
    },
    SKILL_CAP: Array(10).fill(15),
    SKILL: Array(10).fill(15),
    GUNS: [
        {
            POSITION: { LENGTH: 15, WIDTH: 3.0000001192092896, X: -6.556708751634699e-8, Y: 1.5000000596046434, ANGLE: 0 },
            PROPERTIES: {
                SHOOT_SETTINGS: combineStats([g.basic, g.op, {reload: 0.5, health: 100, damage: 100, recoil: 0, spray: 0.1, speed: 2, maxSpeed: 2}]),
                TYPE: "bullet",
            }
        },
        {
            POSITION: { LENGTH: 15, WIDTH: 3.0000001192092896, X: -6.556708770004402e-8, Y: -1.5000000596046434, ANGLE: 0 },
            PROPERTIES: {
                SHOOT_SETTINGS: combineStats([g.basic, g.op, {reload: 0.5, health: 100, damage: 100, recoil: 0, spray: 0.1, speed: 2, maxSpeed: 2}]),
                TYPE: "bullet",
            }
        },
        {
            POSITION: { LENGTH: 17.000000476837158, WIDTH: 3.0000001192092896, X: 0, Y: 0, ANGLE: 0 },
            PROPERTIES: {
                SHOOT_SETTINGS: combineStats([g.basic, g.op, {reload: 0.5, health: 100, damage: 100, recoil: 0, spray: 0.1, speed: 2, maxSpeed: 2}]),
                TYPE: "bullet",
            }
        },
        {
            POSITION: { LENGTH: 10, WIDTH: 8.00000011920929, ASPECT: -1.2000000476837158, X: 9.999999999999998, Y: -6.123234262925839e-16, ANGLE: 90.00000250447816 }
        },
        {
            POSITION: { LENGTH: 10, WIDTH: 8.00000011920929, ASPECT: -1.2000000476837158, X: 9.999999999999998, Y: -6.123233601181349e-16, ANGLE: -90.00000250447816 }
        },
        {
            POSITION: { LENGTH: 5, WIDTH: 6.000000238418579, ASPECT: -1.600000023841858, X: 7.5, Y: -4.592425496802574e-16, ANGLE: 0 }
        }
    ],
    TURRETS: [{
        POSITION: [20, 0, 25, 0, 180, 1],
        TYPE: ["antiTankMachineGunArm"]
    }, {
        POSITION: [20, 0, -25, 0, 180, 1],
        TYPE: ["antiTankMachineGunArm"]
    }, {
        POSITION: [25, 0, 0, 0, 360, 0],
        TYPE: ["dominationBody"]
    }]
}
Class.cxATMGBullet = {PARENT: "bullet", SHAPE: Class.cube.SHAPE}
Class.cxATMGArm = {
    PARENT: 'genericTank',
    COLOR: "white",
    SHAPE: Class.cube.SHAPE,
    SKILL_CAP: Array(10).fill(15),
    SKILL: Array(10).fill(15),
    GUNS: [
        {
            POSITION: [15, 2.5, 1, 0, 2, 0, 0.2],
            PROPERTIES: {
                SHOOT_SETTINGS: combineStats([g.basic, {reload: 0.5}]),
                TYPE: "cxATMGBullet",
            }
        },
        {
            POSITION: [15, 2.5, 1, 0, -2, 0, 0.2],
            PROPERTIES: {
                SHOOT_SETTINGS: combineStats([g.basic, {reload: 0.5}]),
                TYPE: "cxATMGBullet",
            }
        },
        {
            POSITION: [1, 2.5, 1, 0, 0, 0, 0],
            PROPERTIES: {
                SHOOT_SETTINGS: combineStats([g.basic, {reload: 0.5}]),
                TYPE: "cxATMGBullet",
            }
        },
        {
            POSITION: [16.5, 3.5, 1, 0, 0, 0, 0],
            PROPERTIES: {
                SHOOT_SETTINGS: combineStats([g.basic, {reload: 0.5}]),
                TYPE: "cxATMGBullet",
            }
        },
        {
            POSITION: [5.5, 6.5, -1.8, 6.5, 0, 0, 0]
        }
    ],
}
Class.cxATMG = {
    PARENT: "dominator",
    LABEL: "CX-ATMG",
    UPGRADE_LABEL: "CX-ATMG",
    SHAPE: Class.cube.SHAPE,
    SIZE: 12,
    BODY: {
        RESIST: 2,
        SPEED: 2.32,
        ACCELERATION: 0.8,
        HEALTH: 200,
        DAMAGE: 6,
        PENETRATION: 0.25,
        FOV: 1.35,
        PUSHABILITY: 0,
        HETERO: 0,
        SHIELD: base.SHIELD * 1.4,
    },
    SKILL_CAP: Array(10).fill(15),
    SKILL: Array(10).fill(15),
    GUNS: [
        {
            POSITION: [15, 2.5, 1, 0, 2, 0, 0.2],
            PROPERTIES: {
                SHOOT_SETTINGS: combineStats([g.basic, {reload: 0.5}]),
                TYPE: "cxATMGBullet",
            }
        },
        {
            POSITION: [15, 2.5, 1, 0, -2, 0, 0.2],
            PROPERTIES: {
                SHOOT_SETTINGS: combineStats([g.basic, {reload: 0.5}]),
                TYPE: "cxATMGBullet",
            }
        },
        {
            POSITION: [1, 2.5, 1, 0, 0, 0, 0],
            PROPERTIES: {
                SHOOT_SETTINGS: combineStats([g.basic, {reload: 0.5}]),
                TYPE: "cxATMGBullet",
            }
        },
        {
            POSITION: [16.5, 3.5, 1, 0, 0, 0, 0],
            PROPERTIES: {
                SHOOT_SETTINGS: combineStats([g.basic, {reload: 0.5}]),
                TYPE: "cxATMGBullet",
            }
        },
        {
            POSITION: [24, 7, -1.3, 0, 0, 90, 0],
        },
        {
            POSITION: [24, 7, -1.3, 0, 0, -90, 0],
        },
        {
            POSITION: [5.5, 6.5, -1.8, 6.5, 0, 0, 0]
        }
    ],
    TURRETS: [{
        POSITION: [20, 0, 25, 0, 180, 1],
        TYPE: ["cxATMGArm"]
    }, {
        POSITION: [20, 0, -25, 0, 180, 1],
        TYPE: ["cxATMGArm"]
    }, {
        POSITION: [26, 0, 0, 0, 360, 0],
        TYPE: ["dominationBody"]
    }]
}

// Arena Closer
Class.arenaCloser = {
    PARENT: 'genericTank',
    LABEL: "Arena Closer",
    DISPLAY_NAME: false,
    DANGER: 10,
    SIZE: 34,
    COLOR: "yellow",
    UPGRADE_COLOR: "yellow",
    LAYER: 13,
    BODY: {
        REGEN: 1e5,
        HEALTH: 1e6,
        DENSITY: 30,
        DAMAGE: 1e5,
        FOV: 10,
        SPEED: 4,
    },
    SKILL: skillSet({rld: 1, dam: 1, pen: 1, str: 1, spd: 1, atk: 1, hlt: 1, shi: 1, rgn: 1, mob: 1}),
    DRAW_HEALTH: false,
    HITS_OWN_TYPE: "never",
    ARENA_CLOSER: true,
    IS_IMMUNE_TO_TILES: true,
    UPGRADE_TOOLTIP: "Hackerman",
    GUNS: [
        {
            POSITION: {
                LENGTH: 14,
                WIDTH: 10
            },
            PROPERTIES: {
                SHOOT_SETTINGS: combineStats([g.basic, {reload: 0.8, recoil: 0.25, health: 1e3, damage: 1e3, pen: 1e3, speed: 3, maxSpeed: 1, range: 1.8, density: 4, spray: 0.25}]),
                TYPE: ["bullet", {LAYER: 12}]
            }
        }
    ]
}

// ARRAS POLICE
Class.arrasPolice = {
    PARENT: 'genericTank',
    LABEL: "ARRAS POLICE",
    SIZE: 60,
    COLOR: 16,
    UPGRADE_COLOR: 20,
    UPGRADE_TOOLTIP: "WOOP WOOP! That's the sound of da police!",
    BODY: Class.booster.BODY,
    GUNS: Class.booster.GUNS,
    PROPS: [
        {
            TYPE: ['hexagonHat', {COLOR: 21}],
            POSITION: {
                SIZE: 6,
                Y: 7.45,
                LAYER: 1
            }
        },
        {
            TYPE: ['hexagonHat', {COLOR: 24}],
            POSITION: {
                SIZE: 6,
                Y: -7.45,
                LAYER: 1
            }
        },
        {
            TYPE: ['squareHat', {COLOR: 22}],
            POSITION: {
                SIZE: 6.35,
                Y: 2.85,
                LAYER: 1
            }
        },
        {
            TYPE: ['squareHat', {COLOR: 23}],
            POSITION: {
                SIZE: 6.35,
                Y: -2.85,
                LAYER: 1
            }
        }
    ]
}
