const { combineStats, skillSet, addUpgrades, removeUpgrades, makeAuto, makeBattle, makeBird, makeCap, makeFlank, makeFore, makeGuard, makeOver, makeRadialAuto, makeSnake, makeGunner, makeWhirlwind, weaponArray, weaponMirror, weaponStack } = require("../../facilitators.js");
const { base, dfltskl, smshskl, statnames } = require("../../constants.js");
const g = require("../../gunvals.js");
const preset = require("../../presets.js");

// Tier 1 (Level 15)
Class.whirlwind = makeWhirlwind("genericTank", { label: "Whirlwind", satellites: 6, hat: "hexagonHat_spin", danger: 5 });

// Tier 2 (Level 30)
Class.hurricane = makeWhirlwind("genericTank", { hat: "octagonHat_spin", satellites: 8, label: "Hurricane" });
Class.tornado = makeWhirlwind("genericTank", { hat: "squareHat_spin", hatSize: 10, satellites: 4, satelliteSize: 12, extraStats: [g.pounder], label: "Tornado" });
Class.whirlwind_old = makeWhirlwind("genericTank", { hat: "circleHat", hatSize: 24, hatLayer: 0, satellites: 6, satelliteType: "satellite_old", label: "Whirlwind" });
Class.whirlwind_old.UPGRADE_LABEL = "Old Whirlwind";

// Tier 3 (Level 45)
Class.auto4_old = makeRadialAuto("auto4gun", { isTurret: true, danger: 7, size: 13, x: 6, label: "Gunner-3", count: 3 });
Class.bentBoomer_old = {
    PARENT: "genericTank",
    LABEL: "Boomer",
    UPGRADE_LABEL: "Old Bent Boomer",
    DANGER: 7,
    STAT_NAMES: statnames.trap,
    BODY: {
        SPEED: 0.8 * base.SPEED,
        FOV: 1.15 * base.FOV
    },
    GUNS: weaponMirror([
        {
            POSITION: [8, 10, 1, 8, -2, -35, 0]
        },
        {
            POSITION: [2, 10, 1.3, 16, -2, -35, 0],
            PROPERTIES: {
                SHOOT_SETTINGS: combineStats([g.trap, g.setTrap, g.twin, {speed: 1.2}]),
                TYPE: "boomerang"
            }
        }
    ], {delayIncrement: 0.5})
};
Class.blizzard = makeWhirlwind("genericTank", { dualLayer: true, hat: "pentagonHat_spin", hat2: "pentagonHat_spinReverse", satellites: 5, label: "Blizzard", danger: 7 });
Class.blunderbuss = {
    PARENT: "genericTank",
    LABEL: "Blunderbuss",
    DANGER: 7,
    BODY: {
        FOV: base.FOV * 1.225
    },
    GUNS: [
        ...weaponMirror([{
            POSITION: {
                LENGTH: 13,
                WIDTH: 4,
                Y: 3,
                ANGLE: 9
            },
            PROPERTIES: {
                SHOOT_SETTINGS: combineStats([g.basic, g.sniper, g.rifle, g.blunderbuss]),
                TYPE: "bullet",
                LABEL: "Pellet"
            }
        },
        {
            POSITION: {
                LENGTH: 15,
                WIDTH: 4,
                Y: 2.5,
                ANGLE: 6
            },
            PROPERTIES: {
                SHOOT_SETTINGS: combineStats([g.basic, g.sniper, g.rifle, g.blunderbuss]),
                TYPE: "bullet",
                LABEL: "Pellet"
            }
        },
        {
            POSITION: {
                LENGTH: 16,
                WIDTH: 4,
                Y: 2,
                ANGLE: 3
            },
            PROPERTIES: {
                SHOOT_SETTINGS: combineStats([g.basic, g.sniper, g.rifle, g.blunderbuss]),
                TYPE: "bullet",
                LABEL: "Pellet"
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
                WIDTH: 10.5
            }
        }
    ]
};
Class.commander_old = {
    PARENT: "genericTank",
    LABEL: "Commander",
    UPGRADE_LABEL: "Old Commander",
    DANGER: 7,
    STAT_NAMES: statnames.drone,
    BODY: {
        FOV: 1.15 * base.FOV
    },
    FACING_TYPE: "spin",
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
                TYPE: "drone",
                AUTOFIRE: true,
                SYNCS_SKILLS: true,
                STAT_CALCULATOR: "drone",
                MAX_CHILDREN: 6
            }
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
                TYPE: ["drone", {INDEPENDENT: true}],
                AUTOFIRE: true,
                SYNCS_SKILLS: true,
                STAT_CALCULATOR: "drone",
                MAX_CHILDREN: 6
            }
        })
    ]
};
Class.deathStar_old = {
    PARENT: "genericTank",
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
                TYPE: "bullet"
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
                TYPE: "bullet"
            }
        }
    ], 3)
};
Class.hexaWhirl = makeWhirlwind("hexaTank", { label: "Hexa Whirl" });
Class.maelstrom = makeAuto("whirlwind_old", "Maelstrom");
Class.master = {
    PARENT: "genericTank",
    LABEL: "Master",
    DANGER: 7,
    BODY: {
        HEALTH: base.HEALTH * 0.4,
        SHIELD: base.SHIELD * 0.4,
        DENSITY: base.DENSITY * 0.3
    },
    GUNS: [
        {
            POSITION: {
                LENGTH: 18,
                WIDTH: 16
            },
            PROPERTIES: {
                SHOOT_SETTINGS: combineStats([g.basic]),
                TYPE: "masterBullet",
                MAX_CHILDREN: 4,
                DESTROY_OLDEST_CHILD: true
            }
        },
        ...weaponMirror([
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
        ])
    ]
};
Class.megaTornado = makeWhirlwind("genericTank", { hat: "diamondHat_spin", hatSize: 16, satellites: 2, satelliteSize: 16, extraStats: [g.pounder, g.destroyer], label: "Mega-Tornado", danger: 7 });
Class.monsoon = makeWhirlwind({
    PARENT: "genericTank",
    TURRETS: [
        {
            TYPE: ["hexagonHat_spin", {COLOR: "black"}],
            POSITION: {SIZE: 26}
        }
    ]
}, {hat: "circleHat", hatSize: 24, hatLayer: 0, satellites: 6, satelliteType: "satellite_old", label: "Monsoon", danger: 7});
Class.munition = makeWhirlwind("artillery", { label: "Munition" });
Class.prophet = makeWhirlwind("underseer", { label: "Prophet", satelliteType: "squareSatellite" });
Class.quadBuilder = {
    PARENT: "genericTank",
    LABEL: "Quad Builder",
    DANGER: 7,
    STAT_NAMES: statnames.trap,
    BODY: {
        SPEED: 0.8 * base.SPEED,
        FOV: 1.15 * base.FOV
    },
    GUNS: weaponArray([
        {
            POSITION: {
                LENGTH: 14,
                WIDTH: 6,
                ANGLE: 45
            }
        },
        {
            POSITION: {
                LENGTH: 2,
                WIDTH: 6,
                ASPECT: 1.1,
                X: 14,
                ANGLE: 45
            },
            PROPERTIES: {
                SHOOT_SETTINGS: combineStats([g.trap, g.setTrap, g.weak]),
                TYPE: "setTrap"
            }
        }
    ], 4)
};
Class.rimfire_old = {
    PARENT: "genericTank",
    LABEL: "Rimfire",
    UPGRADE_LABEL: "Old Rimfire",
    DANGER: 7,
    GUNS: weaponMirror([
        {
            POSITION: {
                LENGTH: 12,
                WIDTH: 5,
                Y: 7.25,
                ANGLE: 10,
                DELAY: 0.5
            },
            PROPERTIES: {
                SHOOT_SETTINGS: combineStats([g.basic, g.twin, g.gunner, {speed: 1.2}]),
                TYPE: "bullet"
            }
        },
        {
            POSITION: {
                LENGTH: 16,
                WIDTH: 5,
                Y: 3.75
            },
            PROPERTIES: {
                SHOOT_SETTINGS: combineStats([g.basic, g.twin, g.gunner, {speed: 1.2}]),
                TYPE: "bullet"
            }
        }
    ], {delayIncrement: 0.25})
};
Class.septaTrapper_old = makeFlank("trapper", 7, "Septa Trapper", { extraStats: [g.hexaTrapper], delayIncrement: 4/7, danger: 7, noRecoil: true });
Class.septaTrapper_old.UPGRADE_LABEL = "Old Septa Trapper";
Class.spike_old = {
    PARENT: "genericSmasher",
    LABEL: "Spike",
    UPGRADE_LABEL: "Weird Spike",
    DANGER: 7,
    BODY: {
        DAMAGE: 1.15 * base.DAMAGE,
        DENSITY: 1.5 * base.DENSITY,
        SPEED: base.SPEED
    },
    SKILL_CAP: {
        BODY_DAMAGE: smshskl,
        MAX_HEALTH: smshskl,
        BULLET_SPEED: 0,
        BULLET_HEALTH: 0,
        PENETRATION: 0,
        BULLET_DAMAGE: 0,
        RELOAD: smshskl,
        MOVEMENT_SPEED: smshskl,
        SHIELD_REGENERATION: smshskl,
        SHIELD_CAPACITY: smshskl
    },
    TURRETS: [
        {
            TYPE: ["triangleHat_spinFast", {COLOR: "black"}],
            POSITION: {
                SIZE: 20.5
            }
        },
        {
            TYPE: "triangleHat_weirdSpike",
            POSITION: {
                SIZE: 20.5,
                ANGLE: 180
            }
        }
    ]
};
Class.spreadshot_old = {
    PARENT: "genericTank",
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
                TYPE: "bullet",
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
                TYPE: "bullet",
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
                TYPE: "bullet",
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
                TYPE: "bullet",
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
                TYPE: "bullet",
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
                TYPE: "bullet",
                LABEL: "Pounder"
            }
        }
    ]
};
Class.tempest = makeWhirlwind("genericTank", { dualLayer: true, hat: "triangleHat_spin", hat2: "triangleHat_spinReverse", hat2Size: 4, satellites: 3, satelliteSize: 12, extraStats: [g.pounder], label: "Tempest", danger: 7 });
Class.thunderbolt = makeWhirlwind("genericTank", { hat: "squareHat_spinFast", hatSize: 10, satellites: 4, satelliteSize: 12, satelliteSpeed: 2.5, extraStats: [g.pounder], label: "Thunderbolt", danger: 7 });
Class.tornado_old = makeWhirlwind("genericTank", { hat: "circleHat", hatSize: 30, hatLayer: 0, satellites: 1, satelliteSize: 16, satelliteType: "satellite_old", extraStats: [g.pounder, g.destroyer], label: "Tornado", danger: 7 });
Class.typhoon = makeWhirlwind("genericTank", { hat: "decagonHat_spin", satellites: 10, label: "Typhoon", danger: 7 });
Class.typhoon_old = makeWhirlwind("genericTank", { dualLayer: true, hat: "circleHat", hatSize: 28, hatLayer: 0, hat2: "circleHat", hat2Size: 24, hat2Layer: 0, satellites: 6, satelliteType: "satellite_old", label: "Typhoon" });
Class.vortex = makeWhirlwind("launcher", { label: "Vortex" });
Class.vortex_old = makeWhirlwind("genericTank", { enableHat2: true, hat: "pentagonHat_spin", hatSize: 21.5, hatLayer: 0, hat2: "pentagonHat_spin", hat2Size: 21.5, hat2Layer: 0, satellites: 10, satelliteType: "satellite_old", label: "Vortex" });
Class.whirlGuard = makeWhirlwind("trapGuard", { label: "Whirl Guard" });
Class.whirl3 = makeWhirlwind("auto3", { label: "Whirl-3" });

// Class Tree (Tier 2)
addUpgrades("whirlwind", 2, ["tornado", "hurricane"]);
    addUpgrades("whirlwind", 3, ["hexaWhirl", "munition", "whirl3", "whirlGuard", "prophet", "vortex"]);
    addUpgrades("tornado", 3, ["megaTornado", "tempest", "thunderbolt"]);
    addUpgrades("hurricane", 3, ["typhoon", "blizzard"]);

// Class Tree (Tier 3)
addUpgrades("whirlwind_old", 3, ["monsoon", "maelstrom", "tornado_old", "typhoon_old", "vortex_old"]);

if (Config.teams == 1) {
    removeUpgrades("whirlwind", 3, ["prophet"]);
};
