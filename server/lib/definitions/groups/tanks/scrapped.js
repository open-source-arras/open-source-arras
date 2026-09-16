const { combineStats, makeAuto, makeSnake, weaponArray, weaponMirror } = require("../../facilitators.js");
const { base, dfltskl, statnames } = require("../../constants.js");
const g = require("../../gunvals.js");

// Tier 1 (Level 15)
Class.flail = {
    PARENT: "genericFlail",
    LABEL: "Flail",
    TURRETS: [{
        TYPE: ["flailBolt3", {
            INDEPENDENT: true
        }],
        POSITION: {
            SIZE: 6,
            X: 10,
            ARC: 190
        }
    }],
    UPGRADES_TIER_2: ["doubleFlail", "mace", "flangle"]
};
Class.whirlwind_bent = {
    PARENT: "genericTank",
    LABEL: "Whirlwind",
    UPGRADE_LABEL: "Bent Whirlwind",
    GUNS: weaponMirror([
        {
            POSITION: {
                LENGTH: 15,
                WIDTH: 8,
                Y: 4.5,
                ANGLE: 15
            },
            PROPERTIES: {
                SHOOT_SETTINGS: combineStats([g.basic, g.twin, { reload: 5/3 }]),
                TYPE: "satelliteBullet",
                INDEPENDENT_MASTER: true
            }
        },
        {
            POSITION: {
                LENGTH: 16,
                WIDTH: 4,
                ASPECT: -1.5,
                Y: 4.5,
                ANGLE: 15
            }
        }
    ], {delayIncrement: 0.5}),
    UPGRADES_TIER_2: ["maelstrom", "hurricane", "monsoon", "typhoon", "tempest"].map(x => `${x}_bent`)
};

// Tier 2 (Level 30)
Class.autoTrapper = makeAuto("trapper");
Class.doubleFlail = {
    PARENT: "genericFlail",
    LABEL: "Double Flail",
    DANGER: 6,
    TURRETS: weaponArray(Class.flail.TURRETS, 2),
    UPGRADES_TIER_3: ["tripleFlail"]
};
Class.flangle = {
    PARENT: "genericFlail",
    LABEL: "Flangle",
    DANGER: 6,
    STAT_NAMES: statnames.mixed,
    GUNS: weaponMirror({
        POSITION: {
            LENGTH: 16,
            WIDTH: 8,
            ANGLE: 150,
            DELAY: 0.1
        },
        PROPERTIES: {
            SHOOT_SETTINGS: combineStats([g.basic, g.flankGuard, g.triAngle, g.thruster]),
            TYPE: "bullet",
            LABEL: "Thruster"
        }
    }),
    TURRETS: Class.flail.TURRETS,
    SKILL_CAP: Array(10).fill(dfltskl),
    UPGRADES_TIER_3: ["flooster", "flace"]
};
Class.hurricane_bent = {
    PARENT: "genericTank",
    LABEL: "Hurricane",
    DANGER: 6,
    GUNS: weaponArray([{
        POSITION: {
            LENGTH: 15,
            WIDTH: 8,
            ANGLE: 45
        },
        PROPERTIES: {
            SHOOT_SETTINGS: combineStats([g.basic, g.twin, g.flankGuard, {reload: 5/3}]),
            TYPE: "satelliteBullet",
            INDEPENDENT_MASTER: true
        }
    },
    {
        POSITION: {
            LENGTH: 16,
            WIDTH: 4,
            ASPECT: -1.5,
            ANGLE: 45
        }
    }], 4)
};
Class.mace = {
    PARENT: "genericFlail",
    LABEL: "Mace",
    DANGER: 6,
    TURRETS: [{
        POSITION: [6, 10, 0, 0, 190, 0],
        TYPE: ["maceBolt3", {
            INDEPENDENT: true
        }]
    }],
    UPGRADES_TIER_3: ["bigMama", "itHurtsDontTouchIt", "flace"]
};
Class.maelstrom_bent = {
    PARENT: "genericTank",
    LABEL: "Maelstrom",
    DANGER: 6,
    GUNS: [
        ...weaponMirror([{
            POSITION: {
                LENGTH: 15,
                WIDTH: 8,
                ANGLE: 45,
                DELAY: 0.5
            },
            PROPERTIES: {
                SHOOT_SETTINGS: combineStats([g.basic, g.twin, g.tripleShot, {reload: 5/3}]),
                TYPE: "satelliteBullet",
                INDEPENDENT_MASTER: true
            }
        },
        {
            POSITION: {
                LENGTH: 16,
                WIDTH: 4,
                ASPECT: -1.5,
                ANGLE: 45
            }
        }]),
        {
            POSITION: {
                LENGTH: 17,
                WIDTH: 8
            },
            PROPERTIES: {
                SHOOT_SETTINGS: combineStats([g.basic, g.twin, g.tripleShot]),
                TYPE: "satelliteBullet",
                INDEPENDENT_MASTER: true
            }
        },
        {
            POSITION: {
                LENGTH: 18,
                WIDTH: 4,
                ASPECT: -1.5
            }
        }
    ]
};
Class.monsoon_bent = {
    PARENT: "genericTank",
    LABEL: "Monsoon",
    DANGER: 6,
    STAT_NAMES: statnames.trap,
    GUNS: weaponMirror([
        {
            POSITION: {
                LENGTH: 15,
                WIDTH: 8,
                Y: 2,
                ANGLE: 30
            }
        },
        {
            POSITION: {
                LENGTH: 2,
                WIDTH: 8,
                ASPECT: 1.25,
                X: 14,
                Y: 2,
                ANGLE: 30
            },
            PROPERTIES: {
                SHOOT_SETTINGS: combineStats([g.trap, {reload: 5/3}]),
                TYPE: "satelliteTrap",
                STAT_CALCULATOR: "trap",
                INDEPENDENT_MASTER: true
            }
        },
        {
            POSITION: {
                LENGTH: 17,
                WIDTH: 4,
                ASPECT: -1.5,
                Y: 2,
                ANGLE: 30
            }
        }
    ], {delayIncrement: 0.5})
};
Class.tempest_bent = {
    PARENT: "genericTank",
    LABEL: "Tempest",
    DANGER: 6,
    GUNS: [
        {
            POSITION: {
                LENGTH: 5,
                WIDTH: 12,
                ASPECT: 1.2,
                X: 8
            },
            PROPERTIES: {
                SHOOT_SETTINGS: combineStats([g.basic, g.machineGun, {reload: 5/3}]), // guess, if it turns out to use satelliteDrones i'll change it
                TYPE: "satelliteBullet",
                INDEPENDENT_MASTER: true
            }
        },
        {
            POSITION: {
                LENGTH: 16,
                WIDTH: 6,
                ASPECT: -2
            }
        }
    ]
};
Class.typhoon_bent = {
    PARENT: "genericTank",
    LABEL: "Typhoon",
    DANGER: 6,
    GUNS: [
        {
            POSITION: {
                LENGTH: 15,
                WIDTH: 12
            },
            PROPERTIES: {
                SHOOT_SETTINGS: combineStats([g.basic, g.pounder, {reload: 5/3}]),
                TYPE: "satelliteBullet",
                INDEPENDENT_MASTER: true
            }
        },
        {
            POSITION: {
                LENGTH: 16,
                WIDTH: 8,
                ASPECT: -1.5
            }
        }
    ]
};
Class.undertow = {
    PARENT: "genericTank",
    LABEL: "Undertow",
    DANGER: 6,
    GUNS: [
        {
            POSITION: [14, 12, 0.8, 0, 0, 0, 0],
            PROPERTIES: {
                SHOOT_SETTINGS: combineStats([g.basic, { size: 0.8, reload: 1.2 }]),
                TYPE: "undertowBullet"
            }
        },
        ...weaponMirror({
            POSITION: [11.25, 8, 0.15, 4.25, 4, 13.5, 0]
        })
    ]
};
Class.volute = {
    PARENT: "genericTank",
    LABEL: "Volute",
    DANGER: 6,
    STAT_NAMES: statnames.desmos,
    GUNS: [
        {
            POSITION: {
                LENGTH: 20,
                WIDTH: 11,
                ASPECT: -1.2
            },
            PROPERTIES: {
                SHOOT_SETTINGS: combineStats([g.basic, g.pounder, g.desmos]),
                TYPE: ["bullet", {CONTROLLERS: ["snake"]}]
            }
        },
        ...weaponMirror({
            POSITION: {
                LENGTH: 6.25,
                WIDTH: 5,
                ASPECT: -4,
                X: -6.5,
                Y: -7,
                ANGLE: 90
            }
        })
    ],
    UPGRADES_TIER_3: ["sidewinder"]
};

// Tier 3 (Level 45)
Class.bigMama = {
    PARENT: "genericFlail",
    LABEL: "BIG MAMA",
    DANGER: 7,
    TURRETS: [{
        POSITION: [6, 10, 0, 0, 190, 0],
        TYPE: ["mamaBolt3", {
            INDEPENDENT: true
        }]
    }]
};
Class.cocci = makeSnake("smasher", 5, "Cocci");
Class.dreadnought_old = {
    PARENT: "genericTank",
    LABEL: "Dreadnought",
    UPGRADE_LABEL: "Bad Dreadnought",
    DANGER: 7,
    FACING_TYPE: "locksFacing",
    STAT_NAMES: statnames.swarm,
    BODY: Class.cruiser.BODY,
    TURRETS: [
        {
            TYPE: ["circleHat", {COLOR: "grey"}],
            POSITION: {
                SIZE: 19.5,
                X: -4.5
            }
        }
    ],
    GUNS: [
        {
            POSITION: {
                LENGTH: 15,
                WIDTH: 7
            }
        },
        {
            POSITION: {
                LENGTH: 5,
                WIDTH: 15,
                X: 15
            },
            PROPERTIES: {
                SHOOT_SETTINGS: combineStats([g.swarm, { reload: 0.5, damage: 2, size: 0.5 }]),
                TYPE: "swarm",
                STAT_CALCULATOR: "swarm"
            }
        },
        {
            POSITION: {
                LENGTH: 7,
                WIDTH: 2,
                ASPECT: 4,
                X: -1,
                Y: 2.5,
                ANGLE: 180
            }
        },
        {
            POSITION: {
                LENGTH: 7,
                WIDTH: 2,
                ASPECT: 4,
                X: -1,
                Y: -2.5,
                ANGLE: 180
            }
        },
        {
            POSITION: {
                LENGTH: 7,
                WIDTH: 2,
                ASPECT: 4,
                X: -1,
                Y: 2.5,
                ANGLE: 180
            }
        },
        {
            POSITION: {
                LENGTH: 7,
                WIDTH: 2,
                ASPECT: 4,
                X: -1,
                Y: -2.5,
                ANGLE: 180
            }
        },
        {
            POSITION: {
                LENGTH: 7,
                WIDTH: 2,
                ASPECT: 4,
                X: 0.5,
                ANGLE: 180
            }
        },
        {
            POSITION: {
                LENGTH: 7,
                WIDTH: 2,
                ASPECT: 4,
                X: -1,
                Y: 2.5,
                ANGLE: 220
            }
        },
        {
            POSITION: {
                LENGTH: 7,
                WIDTH: 2,
                ASPECT: 4,
                X: -1,
                Y: 2.5,
                ANGLE: 220
            }
        },
        {
            POSITION: {
                LENGTH: 7,
                WIDTH: 2,
                ASPECT: 4,
                X: -1,
                Y: 2.5,
                ANGLE: 220
            }
        },
        {
            POSITION: {
                LENGTH: 7,
                WIDTH: 2,
                ASPECT: 4,
                X: -1,
                Y: -2.5,
                ANGLE: -220
            }
        },
        {
            POSITION: {
                LENGTH: 7,
                WIDTH: 2,
                ASPECT: 4,
                X: -1,
                Y: -2.5,
                ANGLE: -220
            }
        },
        {
            POSITION: {
                LENGTH: 7,
                WIDTH: 2,
                ASPECT: 4,
                X: -1,
                Y: -2.5,
                ANGLE: -200
            }
        },
        {
            POSITION: [1, 3, 1, 3, 0, 180, 0], // temporary propeller
            PROPERTIES: {
                SHOOT_SETTINGS: combineStats([g.basic, g.twin, g.gunner, g.machineGun, g.thruster, [0.1, 3, 1, 1, 1, 1, 1, 1, 1, 0.075, 1, 2, 1]]),
                TYPE: "bullet"
            }
        }
    ]
};
Class.flace = {
    PARENT: "genericFlail",
    LABEL: "Flace",
    DANGER: 7,
    STAT_NAMES: statnames.mixed,
    GUNS: weaponMirror({
        POSITION: {
            LENGTH: 16,
            WIDTH: 8,
            ANGLE: 150,
            DELAY: 0.1
        },
        PROPERTIES: {
            SHOOT_SETTINGS: combineStats([g.basic, g.flankGuard, g.triAngle, g.thruster]),
            TYPE: "bullet",
            LABEL: "Thruster"
        }
    }),
    TURRETS: Class.mace.TURRETS,
    SKILL_CAP: Array(10).fill(dfltskl)
};
Class.flooster = {
    PARENT: "genericFlail",
    LABEL: "Flooster",
    DANGER: 7,
    STAT_NAMES: statnames.mixed,
    GUNS: weaponMirror([
        {
            POSITION: {
                LENGTH: 14,
                WIDTH: 8,
                ANGLE: 135,
                DELAY: 0.6
            },
            PROPERTIES: {
                SHOOT_SETTINGS: combineStats([g.basic, g.flankGuard, g.triAngle, g.thruster]),
                TYPE: "bullet",
                LABEL: "Thruster"
            }
        },
        {
            POSITION: {
                LENGTH: 16,
                WIDTH: 8,
                ANGLE: 150,
                DELAY: 0.1
            },
            PROPERTIES: {
                SHOOT_SETTINGS: combineStats([g.basic, g.flankGuard, g.triAngle, g.thruster]),
                TYPE: "bullet",
                LABEL: "Thruster"
            }
        }
    ]),
    TURRETS: Class.flail.TURRETS,
    SKILL_CAP: Array(10).fill(dfltskl)
};
Class.itHurtsDontTouchIt = {
    PARENT: "genericFlail",
    LABEL: "It hurts dont touch it",
    DANGER: 7,
    TURRETS: [{
        POSITION: [6, 10, 0, 0, 190, 0],
        TYPE: ["ihdtiBolt3", {
            INDEPENDENT: true
        }]
    }]
};
Class.jumpSmasher = {
    PARENT: "genericSmasher",
    LABEL: "Jump Smasher",
    DANGER: 7,
    BODY: {
        DENSITY: 1 * base.DENSITY,
        HEALTH: 1 * base.HEALTH * 1.4,
        SHIELD: 1 * base.SHIELD * 1.4
    },
    TURRETS: [
        {
            POSITION: [21.5, 0, 0, 0, 360, 0],
            TYPE: ["hexagonHat_spin", {COLOR: "black"}]
        }
    ],
    GUNS: [
        {
            POSITION: {
                LENGTH: 2,
                WIDTH: 2,
                ANGLE: 180
            },
            PROPERTIES: {
                SHOOT_SETTINGS: combineStats([g.basic, { reload: 11, recoil: 9.75 }/*, { reload: 12.5, recoil: 8.2875 }*/]),
                TYPE: ["bullet", { ALPHA: 0 }]
            }
        }
    ]
};
Class.mender = {
    PARENT: "genericTank",
    LABEL: "Mender",
    DANGER: 7,
    TOOLTIP: "Right click to heal yourself (use sparingly, has a long cooldown once used!)",
    GUNS: [
        ...weaponMirror({
            POSITION: {
                LENGTH: 14,
                WIDTH: 6,
                Y: -4,
                ANGLE: -7,
                DELAY: 0.25
            },
            PROPERTIES: {
                SHOOT_SETTINGS: combineStats([g.basic, g.gunner, g.artillery]),
                TYPE: "bullet",
                LABEL: "Secondary"
            }
        }, {delayIncrement: 0.5}),
        {
            POSITION: {
                LENGTH: 19,
                WIDTH: 9.5
            },
            PROPERTIES: {
                SHOOT_SETTINGS: combineStats([g.basic, g.pounder, g.artillery]),
                TYPE: "bullet",
                LABEL: "Heavy"
            }
        },
        {
            POSITION: {
                LENGTH: 15,
                WIDTH: 10,
                ANGLE: 180
            }
        },
        {
            POSITION: {
                LENGTH: 5,
                WIDTH: 20,
                X: 15,
                ANGLE: 180 // todo: work out delay/cooldown + make healer bullet work
            },
            PROPERTIES: {
                SHOOT_SETTINGS: combineStats([
                    g.basic,
                    g.pounder,
                    g.destroyer,
                    //[2, 0, 1, 1, 1, -1, 1, 1, 1, 0.1, 1, 1, 1],
                    { speed: -4, maxSpeed: -4 },
                    g.healer
                ]),
                TYPE: "healerBullet",
                ALT_FIRE: true
            }
        }
    ],
    TURRETS: [
        {
            TYPE: ["triangleHat", {COLOR: "grey"}],
            POSITION: { SIZE: 7, LAYER: 1 }
        }
    ]
};
Class.oroboros = {
    PARENT: "genericTank",
    LABEL: "Oroboros",
    DANGER: 7,
    STAT_NAMES: statnames.desmos,
    BODY: Class.builder.BODY,
    GUNS: [
        {
            POSITION: {
                LENGTH: 16.5,
                WIDTH: 12
            }
        },
        {
            POSITION: {
                LENGTH: 3.5,
                WIDTH: 12,
                ASPECT: 1.1,
                X: 16.5
            },
            PROPERTIES: {
                SHOOT_SETTINGS: combineStats([g.trap, g.setTrap]),
                TYPE: ["oroborosTrap", {CONTROLLERS: [["oroboros", {range: 75, speed: Math.PI / 32}], "snakeTillNot"]}],
                STAT_CALCULATOR: "block",
                DESTROY_OLDEST_CHILD: true,
                MAX_CHILDREN: 4
            }
        },
        ...weaponMirror({
            POSITION: {
                LENGTH: 4.5,
                WIDTH: 6,
                ASPECT: -4,
                X: -7.5,
                Y: -7,
                ANGLE: 90
            }
        })
    ]
};
Class.prodigy = {
    PARENT: "genericTank",
    LABEL: "Prodigy",
    DANGER: 7,
    STAT_NAMES: {
        ...statnames.mixed,
        RELOAD: "Reload / Max Drone Count"
    },
    SHAPE: 6,
    GUNS: [
        ...weaponArray({
            POSITION: {
                LENGTH: 13,
                WIDTH: 7,
                ASPECT: 1.6,
                ANGLE: 180
            },
            PROPERTIES: {
                SHOOT_SETTINGS: combineStats([g.drone, g.sunchip, {reload: 0.5, size: 2, damage: 0.95}]),
                TYPE: "sunchip",
                AUTOFIRE: true,
                SYNCS_SKILLS: true,
                STAT_CALCULATOR: "necro",
                WAIT_TO_CYCLE: true,
                DELAY_SPAWN: false,
                MAX_CHILDREN: 2
            }
        }, 3, {delayIncrement: 1/3}),
        ...weaponArray([{
            POSITION: {
                LENGTH: 14,
                WIDTH: 9
            }
        },
        {
            POSITION: {
                LENGTH: 4,
                WIDTH: 9,
                ASPECT: 1.5,
                X: 14
            },
            PROPERTIES: {
                SHOOT_SETTINGS: combineStats([g.trap, { range: 0.5, speed: 0.7, maxSpeed: 0.7 }]),
                TYPE: "trap",
                STAT_CALCULATOR: "trap"
            }
        }], 3)
    ]
};
Class.rocket = makeSnake({
    PARENT: "genericTank",
    DANGER: 6,
    BODY: {
        HEALTH: base.HEALTH * 0.4,
        SHIELD: base.SHIELD * 0.4,
        DENSITY: base.DENSITY * 0.3
    },
    GUNS: [
        {
            POSITION: {
                LENGTH: 18,
                WIDTH: 8
            },
            PROPERTIES: {
                SHOOT_SETTINGS: combineStats([g.basic, g.flankGuard, g.triAngle, g.triAngleFront, { recoil: 4 }]),
                TYPE: "bullet",
                LABEL: "Front"
            }
        },
        ...weaponMirror({
            POSITION: {
                LENGTH: 14,
                WIDTH: 8,
                ANGLE: 135,
                DELAY: 0.1
            },
            PROPERTIES: {
                SHOOT_SETTINGS: combineStats([g.basic, g.flankGuard, g.triAngle, g.thruster]),
                TYPE: "bullet",
                LABEL: "Thruster"
            }
        })
    ]
}, 2, "Rocket", {segmentGuns: weaponMirror({
    POSITION: {
        LENGTH: 14,
        WIDTH: 8,
        ANGLE: 135,
        DELAY: 0.1
    },
    PROPERTIES: {
        SHOOT_SETTINGS: combineStats([g.basic, g.flankGuard, g.triAngle, g.thruster]),
        TYPE: "bullet",
        LABEL: "Thruster"
    }
})});
Class.tripleFlail = {
    PARENT: "genericFlail",
    LABEL: "Triple Flail",
    DANGER: 7,
    TURRETS: weaponArray(Class.flail.TURRETS, 3)
};
Class.wrangler = {
    PARENT: "genericTank",
    LABEL: "Wrangler", //"Ranch",
    DANGER: 7,
    STAT_NAMES: statnames.drone,
    BODY: Class.spawner.BODY,
    UPGRADE_TOOLTIP: "[DEV NOTE] This tank does not function as intended yet!",
    GUNS: [
        {
            POSITION: [4.5, 10, 1, 10.5, 0, 0, 0]
        },
        {
            POSITION: [1, 12, 1, 15, 0, 0, 0],
            PROPERTIES: {
                MAX_CHILDREN: 3,
                SHOOT_SETTINGS: combineStats([g.minion, g.spawner]),
                TYPE: "wranglerMinion",
                STAT_CALCULATOR: "drone",
                AUTOFIRE: true,
                SYNCS_SKILLS: true
            }
        },
        {
            POSITION: [11.5, 12, 1, 0, 0, 0, 0]
        },
        ...weaponMirror({
            POSITION: [5, 7.5, 2.5, 1, -4.5, 95, 0]
        })
    ]
};
