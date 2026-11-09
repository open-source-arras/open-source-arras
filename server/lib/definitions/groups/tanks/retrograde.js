const { combineStats, makeFlank, makeGuard, makeGunner, weaponArray, weaponMirror, weaponStack } = require("../../facilitators.js");
const { base } = require("../../constants.js");
const g = require("../../gunvals.js");

// Set the below variable to true to enable OSA-specific fixes and adjustments for Retrograde and certain tank designs.
// This also enables the Arms Race Retrograde addon if it is present.
const better_retrograde = true;

// Set the below variable to true to correct certain LABELs to be closer to Arms Race's conventions.
// This also affects tanks from the Arms Race Retrograde addon if it is present.
const label_correction = true;

// Tier 2 (Level 30)
Class.blaster = {
    PARENT: "genericTank",
    LABEL: "Blaster",
    DANGER: 6,
    GUNS: [
        {
            POSITION: {
                LENGTH: 7.5,
                WIDTH: 12,
                ASPECT: 1.2,
                X: 8
            },
            PROPERTIES: {
                SHOOT_SETTINGS: combineStats([g.basic, g.machineGun, g.blaster]),
                TYPE: "bullet"
            }
        }
    ],
    UPGRADES_TIER_3: ["triBlaster", "splasher"]
};
Class.gatlingGun = {
    PARENT: "genericTank",
    LABEL: "Gatling Gun",
    DANGER: 6,
    BODY: Class.sniper.BODY,
    GUNS: [
        {
            POSITION: {
                LENGTH: 24,
                WIDTH: 10,
                ASPECT: 1.4
            },
            PROPERTIES: {
                SHOOT_SETTINGS: combineStats([g.basic, g.machineGun, g.gatlingGun]),
                TYPE: "bullet"
            }
        }
    ],
    UPGRADES_TIER_3: ["sprayer_RG", "accurator", "halfNHalf"]
};
Class.machineFlank = makeFlank("machineGun", 2, "Machine Flank", { extraStats: [g.doubleTwin] });
Class.machineFlank.UPGRADES_TIER_3 = ["machineTriple", "halfNHalf"];
Class.rifle_old = {
    PARENT: "genericTank",
    LABEL: "Rifle",
    UPGRADE_LABEL: "Old Rifle",
    DANGER: 6,
    BODY: Class.rifle.BODY,
    GUNS: [
        {
            POSITION: {
                LENGTH: 25,
                WIDTH: 7
            },
            PROPERTIES: {
                SHOOT_SETTINGS: combineStats([g.basic, g.sniper, g.rifle]),
                TYPE: "bullet"
            }
        },
        {
            POSITION: {
                LENGTH: 14,
                WIDTH: 9.5
            }
        }
    ],
    UPGRADES_TIER_3: ["sniperRifle", "rifleGuard", "spreadRifle"]
};

// Tier 3 (Level 45)
Class.accurator = {
    PARENT: "genericTank",
    LABEL: "Accurator",
    DANGER: 7,
    BODY: Class.gatlingGun.BODY,
    GUNS: [
        {
            POSITION: {
                LENGTH: 3,
                WIDTH: 0.1,
                ASPECT: -10,
                X: 24
            }
        },
        {
            POSITION: {
                LENGTH: 24,
                WIDTH: 10,
                ASPECT: 1.4
            },
            PROPERTIES: {
                SHOOT_SETTINGS: combineStats([g.basic, g.machineGun, g.gatlingGun]),
                TYPE: "speedBullet"
            }
        }
    ]
};
Class.battery = {
    PARENT: "genericTank",
    LABEL: "Battery",
    DANGER: 7,
    GUNS: [
        ...weaponMirror([{
            POSITION: {
                LENGTH: 12,
                WIDTH: 3.5,
                Y: 7.25,
                DELAY: 0.6
            },
            PROPERTIES: {
                SHOOT_SETTINGS: combineStats([g.basic, g.twin, g.gunner, { speed: 1.2 }]),
                TYPE: "bullet"
            }
        },
        {
            POSITION: {
                LENGTH: 16,
                WIDTH: 3.5,
                Y: 3.75,
                DELAY: 0.2
            },
            PROPERTIES: {
                SHOOT_SETTINGS: combineStats([g.basic, g.twin, g.gunner, { speed: 1.2 }]),
                TYPE: "bullet"
            }
        }], {delayIncrement: 0.2}),
        {
            POSITION: {
                LENGTH: 20,
                WIDTH: 3.5
            },
            PROPERTIES: {
                SHOOT_SETTINGS: combineStats([g.basic, g.twin, g.gunner, { speed: 1.2 }]),
                TYPE: "bullet"
            }
        }
    ]
};
Class.blower = makeGunner("destroyer", "Blower");
Class.bonker = {
    PARENT: "genericSmasher",
    LABEL: "Bonker",
    SIZE: 10,
    BODY: {
        FOV: 1.2 * base.FOV,
        HEALTH: 0.95 * base.HEALTH,
        SPEED: 1.1 * base.SPEED
    },
    TURRETS: Class.smasher.TURRETS
};
Class.buttbuttin = makeGunner("assassin", "Buttbuttin");
Class.deathStar = {
    PARENT: "genericTank",
    LABEL: "Death Star",
    DANGER: 7,
    GUNS: weaponArray([
        {
            POSITION: {
                LENGTH: 20.5,
                WIDTH: 12,
                ANGLE: 180,
                DELAY: 0.5
            },
            PROPERTIES: {
                SHOOT_SETTINGS: combineStats([g.basic, g.pounder, g.flankGuard, g.flankGuard]),
                TYPE: "bullet"
            }
        },
        {
            POSITION: {
                LENGTH: 20.5,
                WIDTH: 12
            },
            PROPERTIES: {
                SHOOT_SETTINGS: combineStats([g.basic, g.pounder, g.flankGuard, g.flankGuard]),
                TYPE: "bullet"
            }
        }
    ], 3)
};
Class.doubleTrapGuard = {
    PARENT: "genericTank",
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
                TYPE: "bullet"
            }
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
                TYPE: "trap",
                STAT_CALCULATOR: "trap"
            }
        }
    ], {delayIncrement: 0.5})
};
Class.halfNHalf = {
    PARENT: "genericTank",
    LABEL: "Half 'n Half",
    DANGER: 7,
    HAS_NO_RECOIL: true,
    BODY: Class.gatlingGun.BODY,
    GUNS: [
        {
            POSITION: {
                LENGTH: 24,
                WIDTH: 10,
                ASPECT: 1.4
            },
            PROPERTIES: {
                SHOOT_SETTINGS: combineStats([g.basic, g.machineGun, g.gatlingGun, g.doubleTwin]),
                TYPE: "bullet"
            }
        },
        {
            POSITION: {
                LENGTH: 12,
                WIDTH: 10,
                ASPECT: 1.4,
                X: 8,
                ANGLE: 180
            },
            PROPERTIES: {
                SHOOT_SETTINGS: combineStats([g.basic, g.machineGun, g.doubleTwin]),
                TYPE: "bullet"
            }
        }
    ]
};
Class.machineTriple = makeFlank("machineGun", 3, "Machine Triple", { extraStats: [g.doubleTwin, g.tripleTwin], danger: 7 });
Class.rifleGuard = makeGuard("rifle_old");
Class.sniperRifle = {
    PARENT: "genericTank",
    LABEL: "Sniper Rifle",
    DANGER: 7,
    BODY: Class.assassin.BODY,
    GUNS: [
        {
            POSITION: {
                LENGTH: 28,
                WIDTH: 7
            },
            PROPERTIES: {
                SHOOT_SETTINGS: combineStats([g.basic, g.sniper, g.assassin, g.rifle]),
                TYPE: "bullet"
            }
        },
        {
            POSITION: {
                LENGTH: 14,
                WIDTH: 9.5
            }
        }
    ]
};
Class.splasher = {
    PARENT: "genericTank",
    LABEL: "Splasher",
    DANGER: 7,
    GUNS: [
        {
            POSITION: {
                LENGTH: 21,
                WIDTH: 7
            },
            PROPERTIES: {
                SHOOT_SETTINGS: combineStats([g.basic, g.machineGun, g.lowPower, g.pelleter, { recoil: 1.15 }]),
                TYPE: "bullet"
            }
        },
        {
            POSITION: {
                LENGTH: 10,
                WIDTH: 10,
                ASPECT: 1.4,
                X: 8
            },
            PROPERTIES: {
                SHOOT_SETTINGS: combineStats([g.basic, g.machineGun, g.blaster]),
                TYPE: "bullet"
            }
        }
    ]
};
Class.sprayer_RG = {
    PARENT: "genericTank",
    LABEL: "Sprayer",
    DANGER: 7,
    BODY: Class.gatlingGun.BODY,
    GUNS: [
        {
            POSITION: {
                LENGTH: 22.5,
                WIDTH: 8.5,
                ASPECT: 1.4,
                DELAY: 0.5
            },
            PROPERTIES: {
                SHOOT_SETTINGS: combineStats([g.basic, g.machineGun, g.lowPower, g.pelleter, { recoil: 1.15 }]),
                TYPE: "bullet"
            }
        },
        {
            POSITION: {
                LENGTH: 12,
                WIDTH: 10,
                ASPECT: 1.4,
                X: 8
            },
            PROPERTIES: {
                SHOOT_SETTINGS: combineStats([g.basic, g.machineGun, g.gatlingGun]),
                TYPE: "bullet"
            }
        }
    ]
};
Class.spreadRifle = {
    PARENT: "genericTank",
    LABEL: "Spread Rifle",
    DANGER: 7,
    BODY: Class.rifle_old.BODY,
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
                TYPE: "bullet"
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
                TYPE: "bullet"
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
                TYPE: "bullet"
            }
        }]),
        {
            POSITION: {
                LENGTH: 25,
                WIDTH: 7
            },
            PROPERTIES: {
                SHOOT_SETTINGS: combineStats([g.basic, g.sniper, g.rifle]),
                TYPE: "bullet"
            }
        },
        {
            POSITION: {
                LENGTH: 14,
                WIDTH: 9.5
            }
        }
    ]
};
Class.subverter = {
    PARENT: "genericTank",
    LABEL: "Subverter",
    DANGER: 7,
    BODY: Class.minigun.BODY,
    GUNS: weaponStack({
        POSITION: {
            LENGTH: 21,
            WIDTH: 14
        },
        PROPERTIES: {
            SHOOT_SETTINGS: combineStats([g.basic, g.pounder, g.minigun]),
            TYPE: "bullet"
        }
    }, 3, {lengthOffset: 2, delayIncrement: 1 / 3})
};
Class.triBlaster = {
    PARENT: "genericTank",
    LABEL: "Tri-Blaster",
    DANGER: 7,
    GUNS: [
        ...weaponMirror({
            POSITION: {
                LENGTH: 5,
                WIDTH: 12,
                ASPECT: 1.2,
                X: 8,
                ANGLE: 25,
                DELAY: 0.5
            },
            PROPERTIES: {
                SHOOT_SETTINGS: combineStats([g.basic, g.machineGun, g.blaster, { recoil: 0.5 }, g.lowPower]),
                TYPE: "bullet"
            }
        }),
        {
            POSITION: {
                LENGTH: 7.5,
                WIDTH: 12,
                ASPECT: 1.2,
                X: 8
            },
            PROPERTIES: {
                SHOOT_SETTINGS: combineStats([g.basic, g.machineGun, g.blaster, { recoil: 0.5 }]),
                TYPE: "bullet"
            }
        }
    ]
};

// Class Tree Modification
if (Config.retrograde) {
    Class.machineGun.UPGRADES_TIER_2.push("blaster", "gatlingGun", "machineFlank");
    Class.sniper.UPGRADES_TIER_2.push("gatlingGun");

    if (!better_retrograde && !Config.arms_race) Class.hexaTank.UPGRADES_TIER_3.push("tornado_AR");
    Class.tripleShot.UPGRADES_TIER_3.push("triBlaster");
};

if (Config.arms_race || Config.retrograde) {
    Class.assassin.UPGRADES_TIER_3.push("buttbuttin");
    Class.destroyer.UPGRADES_TIER_3.push("blower");
    Class.gunner.UPGRADES_TIER_3.push("battery");
    Class.hexaTank.UPGRADES_TIER_3.push("deathStar");
    Class.minigun.UPGRADES_TIER_3.push("subverter");
    Class.smasher.UPGRADES_TIER_3.push("bonker");
};

// OSA Retrograde Fixes
module.exports = { better_retrograde, label_correction };
if (label_correction) {
    Class.machineFlank.LABEL = "Double Machine";
    Class.machineTriple.LABEL = "Triple Machine";
    Class.triBlaster.LABEL = "Bent Blaster";
};
if (better_retrograde) {
    g.blasterFix = { size: 1.25 };
    g.flamethrowerRG = {
        reload: 1.75,
        recoil: 4 / 3,
        shudder: 2,
        size: 0.25,
        health: 10,
        damage: 0.2,
        pen: 4,
        speed: 2,
        maxSpeed: 0,
        range: 3,
        density: 0.25
    };
    Class.accurator.GUNS[0].POSITION = {
        LENGTH: 8,
        WIDTH: 8,
        ASPECT: 0.1,
        X: 18
    };
    Class.accurator.GUNS[1].POSITION = {
        LENGTH: 14,
        WIDTH: 9.5,
        ASPECT: 1.25,
        X: 8
    };
    Class.blaster.GUNS[0].POSITION = {
        LENGTH: 13,
        WIDTH: 8,
        ASPECT: 1.9,
        X: 4
    };
    Class.blaster.GUNS[0].PROPERTIES.SHOOT_SETTINGS = combineStats([g.basic, g.machineGun, g.blaster, g.blasterFix]);
    Class.flamethrower_RG = {
        PARENT: "genericTank",
        LABEL: "Flamethrower",
        DANGER: 7,
        GUNS: [
            {
                POSITION: {
                    LENGTH: 3,
                    WIDTH: 20,
                    ASPECT: 0.95,
                    X: 13
                },
                PROPERTIES: {
                    SHOOT_SETTINGS: combineStats([g.basic, g.machineGun, g.blaster, g.blasterFix, g.flamethrowerRG]),
                    TYPE: "growBullet"
                }
            },
            {
                POSITION: {
                    LENGTH: 9,
                    WIDTH: 12,
                    ASPECT: 2,
                    X: 4
                }
            }
        ]
    };
    Class.gatlingGun.GUNS[0].POSITION = {
        LENGTH: 14,
        WIDTH: 9.5,
        ASPECT: 1.25,
        X: 8
    };
    Class.halfNHalf.GUNS[0].POSITION = {
        LENGTH: 13,
        WIDTH: 8,
        ASPECT: 1.9,
        X: 4
    };
    Class.halfNHalf.GUNS[0].PROPERTIES.SHOOT_SETTINGS = combineStats([g.basic, g.machineGun, g.blaster, g.doubleTwin]);
    Class.halfNHalf.GUNS[1].POSITION = {
        LENGTH: 14,
        WIDTH: 9.5,
        ASPECT: 1.25,
        X: 8,
        ANGLE: 180
    };
    Class.halfNHalf.GUNS[1].PROPERTIES.SHOOT_SETTINGS = combineStats([g.basic, g.machineGun, g.gatlingGun, g.doubleTwin]);
    Class.splasher.GUNS[0].POSITION = {
        LENGTH: 20,
        WIDTH: 7
    };
    Class.splasher.GUNS[1] = Class.blaster.GUNS[0];
    Class.triBlaster.GUNS = [
        ...weaponMirror({
            POSITION: {
                LENGTH: 13,
                WIDTH: 8,
                ASPECT: 1.7,
                X: 4,
                Y: 2,
                ANGLE: 15,
                DELAY: 0.5
            },
            PROPERTIES: {
                SHOOT_SETTINGS: combineStats([g.basic, g.machineGun, g.blaster, g.blasterFix, { recoil: 0.5 }, g.lowPower]),
                TYPE: "bullet"
            }
        }),
        {
            POSITION: {
                LENGTH: 13,
                WIDTH: 8,
                ASPECT: 1.9,
                X: 6
            },
            PROPERTIES: {
                SHOOT_SETTINGS: combineStats([g.basic, g.machineGun, g.blaster, g.blasterFix, { recoil: 0.5 }]),
                TYPE: "bullet"
            }
        }
    ];

    Class.blaster.UPGRADES_TIER_3.push("flamethrower_RG", "halfNHalf", "subverter");
    Class.gatlingGun.UPGRADES_TIER_3.splice(0, 1, "focal");
    Class.gatlingGun.UPGRADES_TIER_3.push("nailgun");

    if (Config.retrograde) {
        Class.flankGuard.UPGRADES_TIER_3.push("machineTriple");
        Class.focal.BODY = Class.gatlingGun.BODY;
        Class.focal.CONTROLLERS = ["zoom"];
        Class.hunter.UPGRADES_TIER_3.push("focal");
        Class.sprayer.UPGRADES_TIER_3.push("splasher");

        if (Config.arms_race) {
            require("./armsRace.js");
        } else {
            Class.pounder.UPGRADES_TIER_3.push("subverter", "deathStar");
        };
    };
};
