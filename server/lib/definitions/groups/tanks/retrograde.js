const { combineStats, skillSet, addUpgrades, removeUpgrades, makeAuto, makeBattle, makeBird, makeCap, makeFlank, makeFore, makeGuard, makeOver, makeRadialAuto, makeSnake, makeGunner, makeWhirlwind, weaponArray, weaponMirror, weaponStack } = require("../../facilitators.js");
const { base, dfltskl, smshskl, statnames } = require("../../constants.js");
const g = require("../../gunvals.js");
const preset = require("../../presets.js");

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
    ]
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
    ]
};
Class.machineFlank = makeFlank("machineGun", 2, "Machine Flank", { extraStats: [g.doubleTwin] });
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
    ]
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
    SIZE: Class.genericTank.SIZE * 0.7,
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
    }, 3, {lengthOffset: 2, delayIncrement: 1/3})
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

// Class Tree
addUpgrades("blaster", 3, ["triBlaster", "splasher"]);
addUpgrades("gatlingGun", 3, ["sprayer_RG", "accurator", "halfNHalf"]);
addUpgrades("machineFlank", 3, ["machineTriple", "halfNHalf"]);

addUpgrades("rifle_old", 3, ["sniperRifle", "rifleGuard", "spreadRifle"]);

if (Config.retrograde) {
    addUpgrades("machineGun", 2, ["blaster", "gatlingGun", "machineFlank"]);
    addUpgrades("sniper", 2, ["gatlingGun"]);

    addUpgrades("hexaTank", 3, ["tornado_AR"]);
    addUpgrades("tripleShot", 3, ["triBlaster"]);
};

if (Config.arms_race || Config.retrograde) {
    addUpgrades("assassin", 3, ["buttbuttin"]);
    addUpgrades("destroyer", 3, ["blower"]);
    addUpgrades("gunner", 3, ["battery"]);
    addUpgrades("hexaTank", 3, ["deathStar"]);
    addUpgrades("minigun", 3, ["subverter"]);
    addUpgrades("smasher", 3, ["bonker"]);
};
