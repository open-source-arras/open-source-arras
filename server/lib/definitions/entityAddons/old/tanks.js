const {combineStats, removeUpgrades, makeAuto, makeBird, makeDrive, makeFlank, makeGuard, makeMenu, makeOver, makeRadialAuto, makeSnake, makeGunner, makeWhirlwind, weaponArray, weaponMirror, weaponStack} = require('../../facilitators.js')
const {base, dfltskl, smshskl, statnames} = require('../../constants.js')
const g = require('../../gunvals.js')
const preset = require('../../presets.js')

// Menus
Class.addonMenu_legacy = makeMenu("Legacy Arras", {upgrades: [
    'boomer',
    'commander',
    'deathStar',
    'bulwark',
    'auto4',
    'rifle',
    'septaTrapper',
    'spike',
    'sprayer',
    'spreadshot',
].map(x => x + '_old')});
Class.menu_addons.UPGRADES_TIER_0.push('addonMenu_legacy');

// Tier 3
Class.auto4_old = makeRadialAuto('auto4gun', {isTurret: true, danger: 7, size: 13, x: 6, label: "Gunner-3", count: 3})
Class.boomer_old = {
    PARENT: 'genericTank',
    LABEL: "Boomer",
    UPGRADE_LABEL: "Bent Boomer",
    DANGER: 7,
    STAT_NAMES: statnames.trap,
    BODY: {
        SPEED: 0.8 * base.SPEED,
        FOV: 1.15 * base.FOV,
    },
    GUNS: weaponMirror([
        {
            POSITION: [8, 10, 1, 8, -2, -35, 0]
        },
        {
            POSITION: [2, 10, 1.3, 16, -2, -35, 0],
            PROPERTIES: {
                SHOOT_SETTINGS: combineStats([g.trap, g.setTrap, g.twin, {speed: 1.2}]),
                TYPE: 'boomerang'
            }
        }
    ], {delayIncrement: 0.5})
}
Class.bulwark_old = {
    PARENT: 'genericTank',
    LABEL: "Double Trap Guard",
    DANGER: 7,
    GUNS: weaponMirror([
        {
            POSITION: {
                LENGTH: 20,
                WIDTH: 8,
                Y: 5.5
            },
            PROPERTIES: {
                SHOOT_SETTINGS: combineStats([g.basic, g.flankGuard, g.flankGuard, g.twin]),
                TYPE: 'bullet',
            },
        },
        {
            POSITION: {
                LENGTH: 14,
                WIDTH: 6,
                Y: 6,
                ANGLE: 180
            }
        },
        {
            POSITION: {
                LENGTH: 4,
                WIDTH: 6,
                ASPECT: 1.5,
                X: 13,
                Y: 6,
                ANGLE: 180
            },
            PROPERTIES: {
                SHOOT_SETTINGS: combineStats([g.trap, g.twin]),
                TYPE: 'trap',
                STAT_CALCULATOR: 'trap'
            }
        }
    ], {delayIncrement: 0.5})
}
Class.commander_old = {
    PARENT: 'genericTank',
    LABEL: "Commander",
    UPGRADE_LABEL: "Old Commander",
    DANGER: 7,
    STAT_NAMES: statnames.drone,
    BODY: {
        FOV: 1.15 * base.FOV,
    },
    FACING_TYPE: 'spin',
    GUNS: [
        {
            POSITION: {
                LENGTH: 6,
                WIDTH: 12,
                ASPECT: 1.2,
                X: 8
            },
            PROPERTIES: {
                SHOOT_SETTINGS: combineStats([g.drone, g.commander]),
                TYPE: 'drone',
                AUTOFIRE: true,
                SYNCS_SKILLS: true,
                STAT_CALCULATOR: 'drone',
                MAX_CHILDREN: 6
            },
        },
        ...weaponMirror({
            POSITION: {
                LENGTH: 6,
                WIDTH: 12,
                ASPECT: 1.2,
                X: 8,
                ANGLE: 120
            },
            PROPERTIES: {
                SHOOT_SETTINGS: combineStats([g.drone, g.commander]),
                TYPE: ['drone', {INDEPENDENT: true}],
                AUTOFIRE: true,
                SYNCS_SKILLS: true,
                STAT_CALCULATOR: 'drone',
                MAX_CHILDREN: 6
            },
        })
    ]
}
Class.deathStar_old = {
    PARENT: 'genericTank',
    LABEL: "Death Star",
    UPGRADE_LABEL: "Old Death Star",
    DANGER: 7,
    GUNS: weaponArray([
        {
            POSITION: {
                LENGTH: 16,
                WIDTH: 14
            },
            PROPERTIES: {
                SHOOT_SETTINGS: combineStats([g.basic, g.pounder, g.destroyer, {reload: 2}]),
                TYPE: 'bullet'
            }
        },
        {
            POSITION: {
                LENGTH: 16,
                WIDTH: 14,
                ANGLE: 180,
                DELAY: 0.05
            },
            PROPERTIES: {
                SHOOT_SETTINGS: combineStats([g.basic, g.pounder, g.destroyer, {reload: 2}]),
                TYPE: 'bullet'
            }
        }
    ], 3)
}
Class.rifle_old = {
    PARENT: 'genericTank',
    LABEL: "Rifle",
    UPGRADE_LABEL: "Old Rifle",
    DANGER: 6,
    BODY: {
        FOV: base.FOV * 1.225
    },
    GUNS: [
        {
            POSITION: {
                LENGTH: 25,
                WIDTH: 7
            },
            PROPERTIES: {
                SHOOT_SETTINGS: combineStats([g.basic, g.sniper, g.rifle]),
                TYPE: 'bullet'
            }
        },
        {
            POSITION: {
                LENGTH: 14,
                WIDTH: 9.5
            }
        }
    ],
    UPGRADES_TIER_3: [
        "sniperRifle",
        "ransacker_old",
        "spreadRifle",
    ]
}
Class.septaTrapper_old = makeFlank('trapper', 7, "Septa Trapper", {extraStats: [g.hexaTrapper], delayIncrement: 4/7, danger: 7, noRecoil: true})
Class.septaTrapper_old.UPGRADE_LABEL = "Old Septa Trapper"
Class.sniperRifle = {
    PARENT: 'genericTank',
    LABEL: "Sniper Rifle",
    DANGER: 7,
    BODY: {
        FOV: base.FOV * 1.35
    },
    GUNS: [
        {
            POSITION: {
                LENGTH: 28,
                WIDTH: 7
            },
            PROPERTIES: {
                SHOOT_SETTINGS: combineStats([g.basic, g.sniper, g.assassin, g.rifle]),
                TYPE: 'bullet'
            }
        },
        {
            POSITION: {
                LENGTH: 14,
                WIDTH: 9.5
            }
        }
    ]
}
Class.spike_old = {
    PARENT: 'genericTank',
    LABEL: "Spike",
    UPGRADE_LABEL: "Weird Spike",
    DANGER: 7,
    BODY: {
        DAMAGE: 1.15 * base.DAMAGE,
        FOV: 1.05 * base.FOV,
        DENSITY: 1.5 * base.DENSITY
    },
    IS_SMASHER: true,
    SKILL_CAP: [smshskl, 0, 0, 0, 0, smshskl, smshskl, smshskl, smshskl, smshskl],
    STAT_NAMES: statnames.smasher,
    TURRETS: [
        {
            TYPE: ['triangleHat_spinFast', {COLOR: 'black'}],
            POSITION: {
                SIZE: 20.5
            }
        },
        {
            TYPE: 'triangleHat_weirdSpike',
            POSITION: {
                SIZE: 20.5,
                ANGLE: 180
            }
        }
    ]
}
Class.sprayer_old = {
    PARENT: 'genericTank',
    LABEL: "Sprayer",
    UPGRADE_LABEL: "Old Sprayer",
    DANGER: 7,
    BODY: {
        FOV: base.FOV * 1.25
    },
    GUNS: [
        {
            POSITION: {
                LENGTH: 24,
                WIDTH: 8,
                ASPECT: 1.5,
                DELAY: 0.5
            },
            PROPERTIES: {
                SHOOT_SETTINGS: combineStats([g.basic, g.machineGun, g.lowPower, g.pelleter, { recoil: 1.15 }]),
                TYPE: 'bullet'
            }
        },
        {
            POSITION: {
                LENGTH: 20,
                WIDTH: 8,
                ASPECT: 1.7,
                X: -1
            },
            PROPERTIES: {
                SHOOT_SETTINGS: combineStats([g.basic, g.machineGun, g.gatlingGun]),
                TYPE: 'bullet'
            }
        }
    ]
}
Class.spreadRifle = {
    PARENT: 'genericTank',
    LABEL: "Spread Rifle",
    DANGER: 7,
    BODY: {
        FOV: base.FOV * 1.225
    },
    GUNS: [
        ...weaponMirror([{
            POSITION: {
                LENGTH: 16,
                WIDTH: 3,
                Y: 3.5,
                ANGLE: 2
            },
            PROPERTIES: {
                SHOOT_SETTINGS: combineStats([g.basic, g.sniper, g.rifle, g.crossbow, { recoil: 0.5 }]),
                TYPE: 'bullet'
            }
        },
        {
            POSITION: {
                LENGTH: 14,
                WIDTH: 3,
                Y: 3.75,
                ANGLE: 4,
                DELAY: 0.08
            },
            PROPERTIES: {
                SHOOT_SETTINGS: combineStats([g.basic, g.sniper, g.rifle, g.crossbow, { recoil: 0.5 }]),
                TYPE: 'bullet'
            }
        },
        {
            POSITION: {
                LENGTH: 12,
                WIDTH: 3,
                Y: 4,
                ANGLE: 6,
                DELAY: 0.16
            },
            PROPERTIES: {
                SHOOT_SETTINGS: combineStats([g.basic, g.sniper, g.rifle, g.crossbow, { recoil: 0.5 }]),
                TYPE: 'bullet'
            }
        }]),
        {
            POSITION: {
                LENGTH: 25,
                WIDTH: 7
            },
            PROPERTIES: {
                SHOOT_SETTINGS: combineStats([g.basic, g.sniper, g.rifle]),
                TYPE: 'bullet'
            }
        },
        {
            POSITION: {
                LENGTH: 14,
                WIDTH: 9.5
            }
        }
    ]
}
Class.spreadshot_old = {
    PARENT: 'genericTank',
    LABEL: "Spreadshot",
    UPGRADE_LABEL: "Old Spreadshot",
    DANGER: 7,
    GUNS: [
        ...weaponMirror([{
            POSITION: {
                LENGTH: 13,
                WIDTH: 4,
                Y: 0.8,
                ANGLE: 75,
                DELAY: 5/6
            },
            PROPERTIES: {
                SHOOT_SETTINGS: combineStats([g.basic, g.gunner, g.artillery, g.twin, g.spreadshot]),
                TYPE: 'bullet',
                LABEL: "Spread"
            }
        },
        {
            POSITION: {
                LENGTH: 14.5,
                WIDTH: 4,
                Y: 1,
                ANGLE: 60,
                DELAY: 4/6
            },
            PROPERTIES: {
                SHOOT_SETTINGS: combineStats([g.basic, g.gunner, g.artillery, g.twin, g.spreadshot]),
                TYPE: 'bullet',
                LABEL: "Spread"
            }
        },
        {
            POSITION: {
                LENGTH: 16,
                WIDTH: 4,
                Y: 1.6,
                ANGLE: 45,
                DELAY: 3/6
            },
            PROPERTIES: {
                SHOOT_SETTINGS: combineStats([g.basic, g.gunner, g.artillery, g.twin, g.spreadshot]),
                TYPE: 'bullet',
                LABEL: "Spread"
            }
        },
        {
            POSITION: {
                LENGTH: 17.5,
                WIDTH: 4,
                Y: 2.4,
                ANGLE: 30,
                DELAY: 2/6
            },
            PROPERTIES: {
                SHOOT_SETTINGS: combineStats([g.basic, g.gunner, g.artillery, g.twin, g.spreadshot]),
                TYPE: 'bullet',
                LABEL: "Spread"
            }
        },
        {
            POSITION: {
                LENGTH: 19,
                WIDTH: 4,
                Y: 3,
                ANGLE: 15,
                DELAY: 1/6
            },
            PROPERTIES: {
                SHOOT_SETTINGS: combineStats([g.basic, g.gunner, g.artillery, g.twin, g.spreadshot]),
                TYPE: 'bullet',
                LABEL: "Spread"
            }
        }]),
        {
            POSITION: {
                LENGTH: 13,
                WIDTH: 10,
                ASPECT: 1.3,
                X: 8
            },
            PROPERTIES: {
                SHOOT_SETTINGS: combineStats([g.basic, g.pounder, g.spreadshot, g.spreadshot]),
                TYPE: 'bullet',
                LABEL: "Pounder"
            }
        }
    ]
}

// Tier 4
Class.ransacker_old = makeGuard('rifle_old')
