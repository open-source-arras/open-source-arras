const { combineStats, removeUpgrades, makeAuto, makeBird, makeFlank, makeGuard, makeOver, makeRadialAuto, weaponArray, weaponMirror, weaponStack } = require("../../facilitators.js");
const { base, dfltskl, smshskl, statnames } = require("../../constants.js");
const g = require("../../gunvals.js");
const preset = require("../../presets.js");

// Basic Tank
Class.basic = {
    PARENT: "genericTank",
    LABEL: "Basic",
    DANGER: 4,
    GUNS: [
        {
            POSITION: {
                LENGTH: 18,
                WIDTH: 8
            },
            PROPERTIES: {
                SHOOT_SETTINGS: combineStats([g.basic]),
                TYPE: "bullet"
            }
        }
    ],
    UPGRADES_TIER_1: ["twin", "sniper", "machineGun", "flankGuard", "director", "pounder", "trapper", "desmos"],
    UPGRADES_TIER_2: ["smasher"]
};

// Tier 1 (Level 15)
Class.desmos = {
    PARENT: "genericTank",
    LABEL: "Desmos",
    STAT_NAMES: statnames.desmos,
    GUNS: [
        {
            POSITION: {
                LENGTH: 20,
                WIDTH: 8,
                ASPECT: -1.5
            },
            PROPERTIES: {
                SHOOT_SETTINGS: combineStats([g.basic, g.desmos]),
                TYPE: ["bullet", {CONTROLLERS: ["snake"]}]
            }
        },
        ...weaponMirror({
            POSITION: {
                LENGTH: 5,
                WIDTH: 5,
                ASPECT: -4,
                X: -5.25,
                Y: -7,
                ANGLE: 90
            }
        })
    ],
    UPGRADES_TIER_2: ["helix"]
};
Class.director = {
    PARENT: "genericTank",
    LABEL: "Director",
    STAT_NAMES: statnames.drone,
    BODY: {
        FOV: base.FOV * 1.1
    },
    GUNS: [
        {
            POSITION: {
                LENGTH: 5,
                WIDTH: 11,
                ASPECT: 1.3,
                X: 8
            },
            PROPERTIES: {
                SHOOT_SETTINGS: combineStats([g.drone]),
                TYPE: "drone",
                AUTOFIRE: true,
                SYNCS_SKILLS: true,
                STAT_CALCULATOR: "drone",
                MAX_CHILDREN: 6,
                WAIT_TO_CYCLE: true
            }
        }
    ],
    UPGRADES_TIER_2: ["overseer", "cruiser", "underseer", "spawner"],
    UPGRADES_TIER_3: ["manager", "bigCheese"]
};
Class.flankGuard = makeFlank("basic", 3, "Flank Guard", { extraStats: [g.flankGuard] });
Class.flankGuard.BODY = { SPEED: 1.125 * base.SPEED };
Class.flankGuard.UPGRADES_TIER_2 = ["hexaTank", "triAngle", "auto3", "trapGuard", "triTrapper"];
Class.flankGuard.UPGRADES_TIER_3 = ["tripleTwin", "quadruplex"];
Class.machineGun = {
    PARENT: "genericTank",
    LABEL: "Machine Gun",
    GUNS: [
        {
            POSITION: {
                LENGTH: 12,
                WIDTH: 10,
                ASPECT: 1.4,
                X: 8
            },
            PROPERTIES: {
                SHOOT_SETTINGS: combineStats([g.basic, g.machineGun]),
                TYPE: "bullet"
            }
        }
    ],
    UPGRADES_TIER_2: ["artillery", "minigun", "gunner", "sprayer"]
};
Class.pounder = {
    PARENT: "genericTank",
    LABEL: "Pounder",
    GUNS: [
        {
            POSITION: {
                LENGTH: 20.5,
                WIDTH: 12
            },
            PROPERTIES: {
                SHOOT_SETTINGS: combineStats([g.basic, g.pounder]),
                TYPE: "bullet"
            }
        }
    ],
    UPGRADES_TIER_2: ["destroyer", "builder", "artillery", "launcher"],
    UPGRADES_TIER_3: ["shotgun", "eagle"]
};
Class.sniper = {
    PARENT: "genericTank",
    LABEL: "Sniper",
    BODY: {
        FOV: 1.2 * base.FOV
    },
    GUNS: [
        {
            POSITION: {
                LENGTH: 24,
                WIDTH: 8
            },
            PROPERTIES: {
                SHOOT_SETTINGS: combineStats([g.basic, g.sniper]),
                TYPE: "bullet"
            }
        }
    ],
    UPGRADES_TIER_2: ["assassin", "hunter", "minigun", "rifle"],
    UPGRADES_TIER_3: ["bushwhacker"]
};
Class.trapper = {
    PARENT: "genericTank",
    LABEL: "Trapper",
    STAT_NAMES: statnames.trap,
    GUNS: [
        {
            POSITION: {
                LENGTH: 15,
                WIDTH: 7
            }
        },
        {
            POSITION: {
                LENGTH: 3,
                WIDTH: 7,
                ASPECT: 1.7,
                X: 15
            },
            PROPERTIES: {
                SHOOT_SETTINGS: combineStats([g.trap]),
                TYPE: "trap",
                STAT_CALCULATOR: "trap"
            }
        }
    ],
    UPGRADES_TIER_2: ["builder", "triTrapper", "trapGuard"],
    UPGRADES_TIER_3: ["barricade", "overtrapper"]
};
Class.twin = {
    PARENT: "genericTank",
    LABEL: "Twin",
    GUNS: weaponMirror({
        POSITION: {
            LENGTH: 20,
            WIDTH: 8,
            Y: 5.5
        },
        PROPERTIES: {
            SHOOT_SETTINGS: combineStats([g.basic, g.twin]),
            TYPE: "bullet"
        }
    }, {delayIncrement: 0.5}),
    UPGRADES_TIER_2: ["doubleTwin", "tripleShot", "gunner", "hexaTank", "helix"],
    UPGRADES_TIER_3: ["dual", "bulwark", "musket"]
};

// Tier 2 (Level 30)
Class.artillery = {
    PARENT: "genericTank",
    LABEL: "Artillery",
    DANGER: 6,
    GUNS: [
        ...weaponMirror({
            POSITION: {
                LENGTH: 17,
                WIDTH: 5,
                Y: -5,
                ANGLE: -7,
                DELAY: 0.25
            },
            PROPERTIES: {
                SHOOT_SETTINGS: combineStats([g.basic, g.pelleter, g.artillery]),
                TYPE: "bullet",
                LABEL: "Secondary"
            }
        }, {delayIncrement: 0.5}),
        {
            POSITION: {
                LENGTH: 19,
                WIDTH: 12
            },
            PROPERTIES: {
                SHOOT_SETTINGS: combineStats([g.basic, g.pounder, g.artillery]),
                TYPE: "bullet",
                LABEL: "Heavy"
            }
        }
    ],
    UPGRADES_TIER_3: ["mortar", "ordnance", "beekeeper", "fieldGun"]
};
Class.assassin = {
    PARENT: "genericTank",
    LABEL: "Assassin",
    DANGER: 6,
    BODY: {
        FOV: 1.375 * base.FOV
    },
    GUNS: [
        {
            POSITION: {
                LENGTH: 27,
                WIDTH: 8
            },
            PROPERTIES: {
                SHOOT_SETTINGS: combineStats([g.basic, g.sniper, g.assassin]),
                TYPE: "bullet"
            }
        },
        {
            POSITION: {
                LENGTH: 13,
                WIDTH: 8,
                ASPECT: -2.2
            }
        }
    ],
    UPGRADES_TIER_3: ["ranger", "falcon", "stalker", "autoAssassin", "single", "deadeye"]
};
Class.auto3 = makeRadialAuto("autoTankGun", { isTurret: true, danger: 6, label: "Auto-3" });
Class.auto3.UPGRADES_TIER_3 = ["auto5", "mega3", "auto4", "banshee"];
Class.builder = {
    PARENT: "genericTank",
    LABEL: "Builder",
    DANGER: 6,
    STAT_NAMES: statnames.trap,
    BODY: {
        FOV: 1.15 * base.FOV,
        SPEED: 14/15 * base.SPEED
    },
    GUNS: [
        {
            POSITION: {
                LENGTH: 18,
                WIDTH: 12
            }
        },
        {
            POSITION: {
                LENGTH: 2,
                WIDTH: 12,
                ASPECT: 1.1,
                X: 18
            },
            PROPERTIES: {
                SHOOT_SETTINGS: combineStats([g.trap, g.setTrap]),
                TYPE: "setTrap",
                STAT_CALCULATOR: "block"
            }
        }
    ],
    UPGRADES_TIER_3: ["construct", "autoBuilder", "engineer", "boomer", "assembler", "architect", "conqueror"]
};
Class.cruiser = {
    PARENT: "genericTank",
    LABEL: "Cruiser",
    DANGER: 6,
    FACING_TYPE: "locksFacing",
    STAT_NAMES: statnames.swarm,
    BODY: {
        FOV: 1.2 * base.FOV
    },
    GUNS: weaponMirror({
        POSITION: {
            LENGTH: 9,
            WIDTH: 8.2,
            ASPECT: 0.6,
            X: 5,
            Y: 4
        },
        PROPERTIES: {
            SHOOT_SETTINGS: combineStats([g.swarm]),
            TYPE: "swarm",
            STAT_CALCULATOR: "swarm"
        }
    }, {delayIncrement: 0.5}),
    UPGRADES_TIER_3: ["carrier", "battleship", "fortress", "autoCruiser", "commander"]
};
Class.destroyer = {
    PARENT: "genericTank",
    LABEL: "Destroyer",
    DANGER: 6,
    GUNS: [
        {
            POSITION: {
                LENGTH: 20.5,
                WIDTH: 14
            },
            PROPERTIES: {
                SHOOT_SETTINGS: combineStats([g.basic, g.pounder, g.destroyer]),
                TYPE: "bullet"
            }
        }
    ],
    UPGRADES_TIER_3: ["conqueror", "annihilator", "hybrid", "construct"]
};
Class.doubleTwin = makeFlank("twin", 2, "Double Twin", { extraStats: [g.doubleTwin] });
Class.doubleTwin.UPGRADES_TIER_3 = ["tripleTwin", "hewnDouble", "autoDouble", "bentDouble"];
Class.gunner = {
    PARENT: "genericTank",
    LABEL: "Gunner",
    DANGER: 6,
    GUNS: weaponMirror([
        {
            POSITION: {
                LENGTH: 12,
                WIDTH: 3.5,
                Y: 7.25,
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
                WIDTH: 3.5,
                Y: 3.75
            },
            PROPERTIES: {
                SHOOT_SETTINGS: combineStats([g.basic, g.twin, g.gunner, {speed: 1.2}]),
                TYPE: "bullet"
            }
        }
    ], {delayIncrement: 0.25}),
    UPGRADES_TIER_3: ["autoGunner", "nailgun", "auto4", "machineGunner", "gunnerTrapper", "cyclone", "overgunner"]
};
Class.healer = {
    PARENT: "genericHealer",
    LABEL: "Healer",
    GUNS: [
        {
            POSITION: {
                LENGTH: 11,
                WIDTH: 9,
                ASPECT: -0.4,
                X: 9.5
            }
        },
        {
            POSITION: {
                LENGTH: 18,
                WIDTH: 10
            },
            PROPERTIES: {
                SHOOT_SETTINGS: combineStats([g.basic, g.healer]),
                TYPE: "healerBullet"
            }
        }
    ],
    UPGRADES_TIER_3: ["medic", "ambulance", "surgeon", "paramedic"]
};
Class.helix = {
    PARENT: "genericTank",
    LABEL: "Helix",
    DANGER: 6,
    STAT_NAMES: statnames.desmos,
    GUNS: [
        {
            POSITION: {
                LENGTH: 20,
                WIDTH: 6,
                ASPECT: -1.5,
                Y: -5
            },
            PROPERTIES: {
                SHOOT_SETTINGS: combineStats([g.basic, g.twin, g.desmos]),
                TYPE: ["bullet", {CONTROLLERS: ["snake"]}]
            }
        },
        {
            POSITION: {
                LENGTH: 20,
                WIDTH: 6,
                ASPECT: -1.5,
                Y: 5
            },
            PROPERTIES: {
                SHOOT_SETTINGS: combineStats([g.basic, g.twin, g.desmos]),
                TYPE: ["bullet", {CONTROLLERS: [["snake", {invert: true}]]}]
            }
        },
        {
            POSITION: {
                LENGTH: 16.5,
                WIDTH: 2,
                ASPECT: -9.25
            }
        },
        ...weaponMirror({
            POSITION: {
                LENGTH: 4,
                WIDTH: 5,
                ASPECT: -4,
                X: -9.5,
                Y: -7,
                ANGLE: 90
            }
        })
    ],
    UPGRADES_TIER_3: ["triplex", "quadruplex"]
};
Class.hexaTank = makeFlank("basic", 6, "Hexa Tank", { extraStats: [g.flankGuard, g.flankGuard], delayIncrement: 0.5, danger: 6 });
Class.hexaTank.UPGRADES_TIER_3 = ["octoTank", "cyclone", "hexaTrapper"];
Class.hunter = {
    PARENT: "genericTank",
    LABEL: "Hunter",
    DANGER: 6,
    BODY: {
        FOV: base.FOV * 1.325
    },
    CONTROLLERS: ["zoom"],
    TOOLTIP: "Hold right click to zoom.",
    GUNS: [
        {
            POSITION: {
                LENGTH: 24,
                WIDTH: 8
            },
            PROPERTIES: {
                SHOOT_SETTINGS: combineStats([g.basic, g.sniper, g.hunter, g.hunterSecondary]),
                TYPE: "bullet"
            }
        },
        {
            POSITION: {
                LENGTH: 21,
                WIDTH: 11,
                DELAY: 0.25
            },
            PROPERTIES: {
                SHOOT_SETTINGS: combineStats([g.basic, g.sniper, g.hunter]),
                TYPE: "bullet"
            }
        }
    ],
    UPGRADES_TIER_3: ["predator", "xHunter", "poacher", "ordnance", "dual", "nimrod"]
};
Class.launcher = {
    PARENT: "genericTank",
    LABEL: "Launcher",
    DANGER: 6,
    BODY: {
        FOV: base.FOV * 1.15
    },
    GUNS: [
        {
            POSITION: {
                LENGTH: 19.2,
                WIDTH: 13,
                ASPECT: 0.7
            }
        },
        {
            POSITION: {
                LENGTH: 17,
                WIDTH: 13
            },
            PROPERTIES: {
                SHOOT_SETTINGS: combineStats([g.basic, g.pounder, g.launcher]),
                TYPE: "launcherMissile",
                STAT_CALCULATOR: "sustained"
            }
        }
    ],
    UPGRADES_TIER_3: ["skimmer", "twister", "swarmer", "sidewinder", "fieldGun"]
};
Class.marksman = {
    PARENT: "genericTank",
    LABEL: "Marksman",
    DANGER: 6,
    BODY: {
        FOV: 1.2 * base.FOV
    },
    GUNS: [
        ...weaponStack({
            POSITION: {
                LENGTH: 13,
                WIDTH: 5,
                ASPECT: 2.2,
                X: 10
            }
        }, 3, {xPosOffset: 5}),
        {
            POSITION: {
                LENGTH: 24,
                WIDTH: 8
            },
            PROPERTIES: {
                SHOOT_SETTINGS: combineStats([g.basic, g.sniper, g.marksman]),
                TYPE: "bullet"
            }
        }
    ],
    UPGRADES_TIER_3: ["deadeye", "nimrod", "revolver", "fork"]
};
Class.minigun = {
    PARENT: "genericTank",
    LABEL: "Minigun",
    DANGER: 6,
    BODY: {
        FOV: base.FOV * 1.2
    },
    GUNS: weaponStack({
        POSITION: {
            LENGTH: 21,
            WIDTH: 8
        },
        PROPERTIES: {
            SHOOT_SETTINGS: combineStats([g.basic, g.minigun]),
            TYPE: "bullet"
        }
    }, 3, {lengthOffset: 2, delayIncrement: 1/3}),
    UPGRADES_TIER_3: ["streamliner", "nailgun", "cropDuster", "barricade", "vulture"]
};
Class.overseer = {
    PARENT: "genericTank",
    LABEL: "Overseer",
    DANGER: 6,
    STAT_NAMES: statnames.drone,
    BODY: {
        FOV: 1.1 * base.FOV,
        SPEED: 14/15 * base.SPEED
    },
    GUNS: weaponMirror({
        POSITION: {
            LENGTH: 6,
            WIDTH: 12,
            ASPECT: 1.2,
            X: 8,
            ANGLE: 90
        },
        PROPERTIES: {
            SHOOT_SETTINGS: combineStats([g.drone, g.overseer]),
            TYPE: "drone",
            AUTOFIRE: true,
            SYNCS_SKILLS: true,
            STAT_CALCULATOR: "drone",
            WAIT_TO_CYCLE: true,
            MAX_CHILDREN: 4
        }
    }),
    UPGRADES_TIER_3: ["overlord", "overtrapper", "overgunner", "banshee", "autoOverseer", "overdrive", "commander"]
};
Class.repeater = {
    PARENT: "genericTank",
    LABEL: "Repeater",
    DANGER: 6,
    GUNS: [
        {
            POSITION: {
                LENGTH: 20,
                WIDTH: 8,
                ASPECT: -1.5
            },
            PROPERTIES: {
                SHOOT_SETTINGS: combineStats([g.basic, g.desmos]),
                TYPE: ["splitterBullet", {CONTROLLERS: ["snake"]}]
            }
        },
        ...weaponMirror([
            {
                POSITION: {
                    LENGTH: 5,
                    WIDTH: 5,
                    ASPECT: -3,
                    X: -5.5,
                    Y: -10,
                    ANGLE: 90
                }
            },
            {
                POSITION: {
                    LENGTH: 5,
                    WIDTH: 5,
                    ASPECT: -4,
                    X: -5.25,
                    Y: -5,
                    ANGLE: 82.5
                }
            }
        ])
    ],
    UPGRADES_TIER_3: ["iterator", "duplicator"]
};
Class.rifle = {
    PARENT: "genericTank",
    LABEL: "Rifle",
    DANGER: 6,
    BODY: Class.sniper.BODY,
    GUNS: [
        {
            POSITION: {
                LENGTH: 20,
                WIDTH: 12
            }
        },
        {
            POSITION: {
                LENGTH: 24,
                WIDTH: 7
            },
            PROPERTIES: {
                SHOOT_SETTINGS: combineStats([g.basic, g.sniper, g.rifle]),
                TYPE: "bullet"
            }
        }
    ],
    UPGRADES_TIER_3: ["musket", "crossbow", "armsman", "revolver"]
};
Class.smasher = {
    PARENT: "genericSmasher",
    LABEL: "Smasher",
    DANGER: 6,
    TURRETS: [
        {
            TYPE: ["hexagonHat_spin", {COLOR: "black"}],
            POSITION: {
                SIZE: 21.5
            }
        }
    ],
    UPGRADES_TIER_3: ["megaSmasher", "spike", "autoSmasher", "landmine"]
};
Class.spawner = {
    PARENT: "genericTank",
    LABEL: "Spawner",
    DANGER: 6,
    STAT_NAMES: statnames.drone,
    BODY: Class.director.BODY,
    GUNS: [
        {
            POSITION: {
                LENGTH: 4.5,
                WIDTH: 10,
                X: 10.5
            }
        },
        {
            POSITION: {
                LENGTH: 1,
                WIDTH: 12,
                X: 15
            },
            PROPERTIES: {
                SHOOT_SETTINGS: combineStats([g.minion, g.spawner]),
                TYPE: "minion",
                AUTOFIRE: true,
                SYNCS_SKILLS: true,
                STAT_CALCULATOR: "drone",
                WAIT_TO_CYCLE: true,
                MAX_CHILDREN: 4
            }
        },
        {
            POSITION: {
                LENGTH: 11.5,
                WIDTH: 12
            }
        }
    ],
    UPGRADES_TIER_3: ["factory", "autoSpawner"]
};
Class.spiral = {
    PARENT: "genericTank",
    LABEL: "Spiral",
    DANGER: 6,
    STAT_NAMES: statnames.desmos,
    GUNS: [
        {
            POSITION: {
                LENGTH: 17,
                WIDTH: 12
            }
        },
        {
            POSITION: {
                LENGTH: 20,
                WIDTH: 8,
                ASPECT: -1.5
            },
            PROPERTIES: {
                SHOOT_SETTINGS: combineStats([g.basic, g.desmos, { reload: 5/3 }]),
                TYPE: ["spiralBullet", {CONTROLLERS: ["snake"]}]
            }
        },
        ...weaponMirror({
            POSITION: {
                LENGTH: 6,
                WIDTH: 5,
                ASPECT: -4,
                X: -6.5,
                Y: -5,
                ANGLE: 87.5
            }
        })
    ],
    UPGRADES_TIER_3: ["coil", "python"]
};
Class.sprayer = {
    PARENT: "genericTank",
    LABEL: "Sprayer",
    DANGER: 6,
    GUNS: [
        {
            POSITION: {
                LENGTH: 23,
                WIDTH: 7
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
                SHOOT_SETTINGS: combineStats([g.basic, g.machineGun]),
                TYPE: "bullet"
            }
        }
    ],
    UPGRADES_TIER_3: ["redistributor", "phoenix", "atomizer", "focal"]
};
Class.trapGuard = makeGuard({
    PARENT: "genericTank",
    DANGER: 4,
    GUNS: [
        {
            POSITION: {
                LENGTH: 20,
                WIDTH: 8
            },
            PROPERTIES: {
                SHOOT_SETTINGS: combineStats([g.basic]),
                TYPE: "bullet"
            }
        }
    ]
}, "Trap Guard");
Class.trapGuard.UPGRADES_TIER_3 = ["bushwhacker", "gunnerTrapper", "bomber", "conqueror", "bulwark"];
Class.triAngle = {
    PARENT: "genericTank",
    LABEL: "Tri-Angle",
    DANGER: 6,
    BODY: {
        HEALTH: 0.8 * base.HEALTH,
        SHIELD: 0.8 * base.SHIELD,
        DENSITY: 0.6 * base.DENSITY
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
        })
    ],
    UPGRADES_TIER_3: ["fighter", "booster", "falcon", "bomber", "autoTriAngle", "surfer", "eagle", "phoenix", "vulture"]
};
Class.triTrapper = makeFlank("trapper", 3, "Tri-Trapper", { extraStats: [g.flankGuard] });
Class.triTrapper.UPGRADES_TIER_3 = ["fortress", "hexaTrapper", "septaTrapper", "architect"];
Class.tripleShot = {
    PARENT: "genericTank",
    LABEL: "Triple Shot",
    DANGER: 6,
    GUNS: [
        ...weaponMirror({
            POSITION: {
                LENGTH: 19,
                WIDTH: 8,
                Y: 2,
                ANGLE: 18,
                DELAY: 0.5
            },
            PROPERTIES: {
                SHOOT_SETTINGS: combineStats([g.basic, g.twin, g.tripleShot]),
                TYPE: "bullet"
            }
        }),
        {
            POSITION: {
                LENGTH: 22,
                WIDTH: 8
            },
            PROPERTIES: {
                SHOOT_SETTINGS: combineStats([g.basic, g.twin, g.tripleShot]),
                TYPE: "bullet"
            }
        }
    ],
    UPGRADES_TIER_3: ["pentaShot", "spreadshot", "bentHybrid", "bentDouble", "triplet", "triplex"]
};
Class.underseer = {
    PARENT: "genericTank",
    LABEL: "Underseer",
    DANGER: 6,
    NECRO: [4],
    STAT_NAMES: statnames.drone,
    SHAPE: 4,
    MAX_CHILDREN: 15,
    GUNS: weaponArray({
        POSITION: {
            LENGTH: 6,
            WIDTH: 12,
            ASPECT: 1.2,
            X: 7.4,
            ANGLE: 90
        },
        PROPERTIES: {
            SHOOT_SETTINGS: combineStats([g.drone, g.sunchip, {reload: 0.8}]),
            TYPE: "sunchip",
            AUTOFIRE: true,
            SYNCS_SKILLS: true,
            STAT_CALCULATOR: "necro",
            WAIT_TO_CYCLE: true,
            DELAY_SPAWN: false
        }
    }, 2),
    UPGRADES_TIER_3: ["necromancer", "maleficitor", "infestor"]
};

// Tier 3 (Level 45)
Class.ambulance = {
    PARENT: "genericHealer",
    LABEL: "Ambulance",
    BODY: {
        HEALTH: base.HEALTH * 0.8,
        SHIELD: base.SHIELD * 0.8,
        DENSITY: base.DENSITY * 0.6
    },
    GUNS: [
        {
            POSITION: {
                LENGTH: 11,
                WIDTH: 9,
                ASPECT: -0.4,
                X: 9.5
            }
        },
        {
            POSITION: {
                LENGTH: 18,
                WIDTH: 10
            },
            PROPERTIES: {
                SHOOT_SETTINGS: combineStats([g.basic, g.flankGuard, g.triAngle, g.triAngleFront, { recoil: 4 }, g.healer]),
                TYPE: "healerBullet",
                LABEL: "Front"
            }
        },
        ...weaponMirror({
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
        })
    ]
};
Class.annihilator = {
    PARENT: "genericTank",
    LABEL: "Annihilator",
    DANGER: 7,
    GUNS: [
        {
            POSITION: {
                LENGTH: 20.5,
                WIDTH: 19.5
            },
            PROPERTIES: {
                SHOOT_SETTINGS: combineStats([g.basic, g.pounder, g.destroyer, g.annihilator]),
                TYPE: "bullet"
            }
        }
    ]
};
Class.architect = makeRadialAuto("architectGun", { isTurret: true, danger: 7, size: 12, label: "Architect", body: { FOV: base.FOV * 1.15, SPEED: base.SPEED * 1.125 } });
Class.armsman = makeOver("rifle", "Armsman", preset.hybrid);
Class.assembler = {
    PARENT: "genericTank",
    LABEL: "Assembler",
    DANGER: 7,
    STAT_NAMES: statnames.trap,
    BODY: Class.builder.BODY,
    GUNS: [
        {
            POSITION: {
                LENGTH: 18,
                WIDTH: 12
            }
        },
        {
            POSITION: {
                LENGTH: 2,
                WIDTH: 12,
                ASPECT: 1.1,
                X: 18
            },
            PROPERTIES: {
                SHOOT_SETTINGS: combineStats([g.trap, g.setTrap]),
                TYPE: "assemblent",
                NO_LIMITATIONS: true,
                MAX_CHILDREN: 8,
                STAT_CALCULATOR: "block"
            }
        }
    ],
    TURRETS: [
        {
            TYPE: ["squareHatCurved", { COLOR: "darkGrey" }],
            POSITION: {
                SIZE: 2,
                X: 14,
                LAYER: 1
            }
        }
    ]
};
Class.atomizer = {
    PARENT: "genericTank",
    LABEL: "Atomizer",
    DANGER: 7,
    GUNS: [
        {
            POSITION: {
                LENGTH: 6,
                WIDTH: 7,
                ASPECT: 1.4,
                X: 18
            },
            PROPERTIES: {
                SHOOT_SETTINGS: combineStats([g.basic, g.pelleter, g.lowPower, g.machineGun, { recoil: 1.15 }, g.atomizer]),
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
                SHOOT_SETTINGS: combineStats([g.basic, g.machineGun]),
                TYPE: "bullet"
            }
        }
    ]
};
Class.auto4 = makeRadialAuto("auto4gun", { isTurret: true, danger: 7, size: 13, x: 6, angle: 45, label: "Auto-4", count: 4 });
Class.auto5 = makeRadialAuto("autoTankGun", { isTurret: true, danger: 7, label: "Auto-5", count: 5 });
Class.autoAssassin = makeAuto("assassin");
Class.autoBuilder = makeAuto("builder");
Class.autoCruiser = makeAuto("cruiser");
Class.autoDouble = makeAuto("doubleTwin", "Auto-Double");
Class.autoGunner = makeAuto("gunner");
Class.autoOverseer = makeAuto("overseer");
Class.autoSmasher = makeAuto("smasher", "Auto-Smasher", { type: "autoSmasherTurret", size: 11 });
Class.autoSmasher.SKILL_CAP = Array(10).fill(smshskl);
Class.autoSpawner = makeAuto("spawner");
Class.autoTriAngle = makeAuto("triAngle");
Class.banshee = makeRadialAuto("bansheegun", { isTurret: true, danger: 7, size: 10, arc: 80, label: "Banshee", body: { FOV: base.FOV * 1.1 } });
Class.banshee.GUNS = weaponArray({
    POSITION: {
        LENGTH: 6,
        WIDTH: 11,
        ASPECT: 1.2,
        X: 8,
        ANGLE: 180
    },
    PROPERTIES: {
        SHOOT_SETTINGS: combineStats([g.drone, g.overseer]),
        TYPE: "drone",
        AUTOFIRE: true,
        SYNCS_SKILLS: true,
        STAT_CALCULATOR: "drone",
        WAIT_TO_CYCLE: true,
        MAX_CHILDREN: 2
    }
}, 3);
Class.barricade = {
    PARENT: "genericTank",
    LABEL: "Barricade",
    DANGER: 7,
    STAT_NAMES: statnames.trap,
    BODY: Class.minigun.BODY,
    GUNS: [
        {
            POSITION: {
                LENGTH: 24,
                WIDTH: 8
            }
        },
        ...weaponStack({
            POSITION: {
                LENGTH: 4,
                WIDTH: 8,
                ASPECT: 1.3,
                X: 22
            },
            PROPERTIES: {
                SHOOT_SETTINGS: combineStats([g.trap, g.minigun, g.barricade]),
                TYPE: "trap",
                STAT_CALCULATOR: "trap"
            }
        }, 3, {xPosOffset: 4, delayIncrement: 1/3})
    ]
};
Class.battleship = {
    PARENT: "genericTank",
    LABEL: "Battleship",
    DANGER: 7,
    STAT_NAMES: statnames.swarm,
    FACING_TYPE: "locksFacing",
    BODY: {
        FOV: 1.25 * base.FOV
    },
    GUNS: [
        ...weaponMirror({
            POSITION: {
                LENGTH: 9,
                WIDTH: 8.2,
                ASPECT: 0.6,
                X: 5,
                Y: 4,
                ANGLE: 90
            },
            PROPERTIES: {
                SHOOT_SETTINGS: combineStats([g.swarm, g.battleship]),
                TYPE: "swarm",
                STAT_CALCULATOR: "swarm",
                LABEL: "Guided"
            }
        }, {delayIncrement: 0.5}),
        ...weaponMirror({
            POSITION: {
                LENGTH: 9,
                WIDTH: 8.2,
                ASPECT: 0.6,
                X: 5,
                Y: 4,
                ANGLE: 270
            },
            PROPERTIES: {
                SHOOT_SETTINGS: combineStats([g.swarm]),
                TYPE: "autoswarm",
                STAT_CALCULATOR: "swarm",
                LABEL: "Autonomous"
            }
        }, {delayIncrement: 0.5})
    ]
};
Class.beekeeper = {
    PARENT: "genericTank",
    LABEL: "Beekeeper",
    DANGER: 7,
    GUNS: [
        ...weaponMirror({
            POSITION: {
                LENGTH: 14,
                WIDTH: 5,
                Y: -5,
                ANGLE: -7,
                DELAY: 0.25
            },
            PROPERTIES: {
                SHOOT_SETTINGS: combineStats([g.swarm, g.bee]),
                TYPE: ["bee", { INDEPENDENT: true }],
                SYNCS_SKILLS: true,
                STAT_CALCULATOR: "drone",
                WAIT_TO_CYCLE: true,
                LABEL: "Secondary"
            }
        }, {delayIncrement: 0.5}),
        {
            POSITION: {
                LENGTH: 19,
                WIDTH: 12
            },
            PROPERTIES: {
                SHOOT_SETTINGS: combineStats([g.basic, g.pounder, g.artillery]),
                TYPE: "bullet",
                LABEL: "Heavy"
            }
        }
    ]
};
Class.bender = {
    PARENT: "genericTank",
    LABEL: "Bender",
    DANGER: 7,
    STAT_NAMES: statnames.drone,
    BODY: Class.spawner.BODY,
    GUNS: [
        {
            POSITION: [4.5, 10, 1, 10.5, 0, 0, 0]
        },
        {
            POSITION: [1, 12, 1, 15, 0, 0, 0],
            PROPERTIES: {
                MAX_CHILDREN: 4, // todo: check if this is still 3
                SHOOT_SETTINGS: combineStats([g.minion, g.spawner]),
                TYPE: "desmosMinion",
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
Class.bentDouble = makeFlank("tripleShot", 2, "Bent Double", { extraStats: [g.doubleTwin] });
Class.bentHybrid = makeOver("tripleShot", "Bent Hybrid", preset.hybrid);
Class.bigCheese = {
    PARENT: "genericTank",
    LABEL: "Big Cheese",
    DANGER: 7,
    STAT_NAMES: statnames.drone,
    BODY: Class.director.BODY,
    GUNS: [
        {
            POSITION: {
                LENGTH: 14,
                WIDTH: 17,
                ASPECT: 1.3,
                X: 2
            },
            PROPERTIES: {
                SHOOT_SETTINGS: combineStats([g.drone, g.honcho, g.bigCheese]),
                TYPE: "drone",
                AUTOFIRE: true,
                SYNCS_SKILLS: true,
                STAT_CALCULATOR: "drone",
                MAX_CHILDREN: 1,
                WAIT_TO_CYCLE: true
            }
        }
    ]
};
Class.bomber = {
    PARENT: "genericTank",
    LABEL: "Bomber",
    DANGER: 7,
    BODY: {
        DENSITY: base.DENSITY * 0.6
    },
    GUNS: [
        {
            POSITION: {
                LENGTH: 20,
                WIDTH: 8
            },
            PROPERTIES: {
                SHOOT_SETTINGS: combineStats([g.basic, g.flankGuard, g.triAngle, g.triAngleFront]),
                TYPE: "bullet",
                LABEL: "Front"
            }
        },
        ...weaponMirror({
            POSITION: {
                LENGTH: 18,
                WIDTH: 8,
                ANGLE: 130,
                DELAY: 0.1
            },
            PROPERTIES: {
                SHOOT_SETTINGS: combineStats([g.basic, g.flankGuard, g.triAngle]),
                TYPE: "bullet",
                LABEL: "Wing"
            }
        }),
        {
            POSITION: {
                LENGTH: 13,
                WIDTH: 8,
                ANGLE: 180
            }
        },
        {
            POSITION: {
                LENGTH: 4,
                WIDTH: 8,
                ASPECT: 1.7,
                X: 13,
                ANGLE: 180
            },
            PROPERTIES: {
                SHOOT_SETTINGS: combineStats([g.trap]),
                TYPE: "trap",
                STAT_CALCULATOR: "trap"
            }
        }
    ]
};
Class.boomer = {
    PARENT: "genericTank",
    LABEL: "Boomer",
    DANGER: 7,
    STAT_NAMES: statnames.trap,
    FACING_TYPE: "locksFacing",
    BODY: Class.builder.BODY,
    GUNS: [
        {
            POSITION: {
                LENGTH: 18,
                WIDTH: 10
            }
        },
        {
            POSITION: {
                LENGTH: 13,
                WIDTH: 10,
                ASPECT: -1.9
            }
        },
        {
            POSITION: {
                LENGTH: 2,
                WIDTH: 10,
                ASPECT: 1.3,
                X: 18
            },
            PROPERTIES: {
                SHOOT_SETTINGS: combineStats([g.trap, g.setTrap, g.boomerang]),
                TYPE: "boomerang",
                STAT_CALCULATOR: "block"
            }
        }
    ]
};
Class.booster = {
    PARENT: "genericTank",
    LABEL: "Booster",
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
                WIDTH: 8
            },
            PROPERTIES: {
                SHOOT_SETTINGS: combineStats([g.basic, g.flankGuard, g.triAngle, g.triAngleFront, { recoil: 4 }]),
                TYPE: "bullet",
                LABEL: "Front"
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
Class.bulwark = {
    PARENT: "genericTank",
    LABEL: "Bulwark",
    STAT_NAMES: statnames.mixed,
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
                LENGTH: 15,
                WIDTH: 8,
                Y: 5.5,
                ANGLE: 185
            }
        },
        {
            POSITION: {
                LENGTH: 3.25,
                WIDTH: 8,
                ASPECT: 1.7,
                X: 14,
                Y: 5.5,
                ANGLE: 185
            },
            PROPERTIES: {
                SHOOT_SETTINGS: combineStats([g.trap, g.twin]),
                TYPE: "trap",
                STAT_CALCULATOR: "trap"
            }
        }
    ], {delayIncrement: 0.5})
};
Class.bushwhacker = makeGuard("sniper", "Bushwhacker");
Class.carrier = {
    PARENT: "genericTank",
    LABEL: "Carrier",
    DANGER: 7,
    STAT_NAMES: statnames.swarm,
    FACING_TYPE: "locksFacing",
    BODY: Class.cruiser.BODY,
    GUNS: [
        ...weaponMirror({
            POSITION: {
                LENGTH: 9,
                WIDTH: 8.2,
                ASPECT: 0.6,
                X: 5,
                Y: 2,
                ANGLE: 30,
                DELAY: 0.5
            },
            PROPERTIES: {
                SHOOT_SETTINGS: combineStats([g.swarm, g.battleship, g.carrier]),
                TYPE: "swarm",
                STAT_CALCULATOR: "swarm"
            }
        }),
        {
            POSITION: {
                LENGTH: 9,
                WIDTH: 8.2,
                ASPECT: 0.6,
                X: 5
            },
            PROPERTIES: {
                SHOOT_SETTINGS: combineStats([g.swarm, g.battleship, g.carrier]),
                TYPE: "swarm",
                STAT_CALCULATOR: "swarm"
            }
        }
    ]
};
Class.coil = {
    PARENT: "genericTank",
    LABEL: "Coil",
    DANGER: 7,
    STAT_NAMES: statnames.desmos,
    GUNS: [
        {
            POSITION: {
                LENGTH: 20,
                WIDTH: 6,
                ASPECT: -1.5,
                Y: -5
            },
            PROPERTIES: {
                SHOOT_SETTINGS: combineStats([g.basic, g.twin, g.desmos, { reload: 5/3 }]),
                TYPE: ["spiralBullet", {CONTROLLERS: ["snake"]}]
            }
        },
        {
            POSITION: {
                LENGTH: 20,
                WIDTH: 6,
                ASPECT: -1.5,
                Y: 5
            },
            PROPERTIES: {
                SHOOT_SETTINGS: combineStats([g.basic, g.twin, g.desmos, { reload: 5/3 }]),
                TYPE: ["spiralBullet", {CONTROLLERS: [["snake", {invert: true}]]}]
            }
        },
        ...weaponMirror({
            POSITION: {
                LENGTH: 21,
                WIDTH: 3,
                ASPECT: -1.5,
                Y: 5
            }
        }),
        {
            POSITION: {
                LENGTH: 16.5,
                WIDTH: 2,
                ASPECT: -9.25
            }
        },
        ...weaponMirror({
            POSITION: {
                LENGTH: 4,
                WIDTH: 5,
                ASPECT: -4,
                X: -9.5,
                Y: -7,
                ANGLE: 90
            }
        })
    ]
};
Class.commander = {
    PARENT: "genericTank",
    LABEL: "Commander",
    DANGER: 7,
    STAT_NAMES: statnames.drone,
    BODY: {
        FOV: base.FOV * 1.15,
        SPEED: base.SPEED * 14/15
    },
    GUNS: [
        ...weaponArray({
            POSITION: {
                LENGTH: 6,
                WIDTH: 12,
                ASPECT: 1.2,
                X: 8
            },
            PROPERTIES: {
                SHOOT_SETTINGS: combineStats([g.drone]),
                TYPE: "drone",
                AUTOFIRE: true,
                SYNCS_SKILLS: true,
                MAX_CHILDREN: 2,
                STAT_CALCULATOR: "drone"
            }
        }, 3),
        ...weaponArray({
            POSITION: {
                LENGTH: 9,
                WIDTH: 8.2,
                ASPECT: 0.6,
                X: 5,
                ANGLE: 180
            },
            PROPERTIES: {
                SHOOT_SETTINGS: combineStats([g.swarm, g.commander]),
                TYPE: "swarm",
                STAT_CALCULATOR: "swarm"
            }
        }, 3, {delayIncrement: 1/3})
    ]
};
Class.conqueror = {
    PARENT: "genericTank",
    LABEL: "Conqueror",
    DANGER: 7,
    STAT_NAMES: statnames.mixed,
    BODY: {
        SPEED: 0.8 * base.SPEED
    },
    REVERSE_TARGET_WITH_TANK: true,
    GUNS: [
        {
            POSITION: {
                LENGTH: 20.5,
                WIDTH: 14,
                ANGLE: 180
            },
            PROPERTIES: {
                SHOOT_SETTINGS: combineStats([g.basic, g.pounder, g.destroyer]),
                TYPE: "bullet"
            }
        },
        {
            POSITION: {
                LENGTH: 18,
                WIDTH: 12
            }
        },
        {
            POSITION: {
                LENGTH: 2,
                WIDTH: 12,
                ASPECT: 1.1,
                X: 18
            },
            PROPERTIES: {
                SHOOT_SETTINGS: combineStats([g.trap, g.setTrap]),
                TYPE: "setTrap",
                STAT_CALCULATOR: "block"
            }
        }
    ]
};
Class.construct = { // it's "construct" and not "constructor" because "constructor" breaks things
    PARENT: "genericTank",
    LABEL: "Constructor",
    STAT_NAMES: statnames.trap,
    DANGER: 7,
    BODY: Class.builder.BODY,
    GUNS: [
        {
            POSITION: {
                LENGTH: 18,
                WIDTH: 18
            }
        },
        {
            POSITION: {
                LENGTH: 2,
                WIDTH: 18,
                ASPECT: 1.2,
                X: 18
            },
            PROPERTIES: {
                SHOOT_SETTINGS: combineStats([g.trap, g.setTrap, g.construct]),
                TYPE: "setTrap",
                STAT_CALCULATOR: "block"
            }
        }
    ]
};
Class.cropDuster = makeOver("minigun", "Crop Duster", preset.hybrid);
Class.crossbow = {
    PARENT: "genericTank",
    LABEL: "Crossbow",
    DANGER: 7,
    BODY: Class.rifle.BODY,
    GUNS: [
        ...weaponMirror([{
            POSITION: {
                LENGTH: 13,
                WIDTH: 3,
                Y: 2,
                ANGLE: 35,
                DELAY: 1
            },
            PROPERTIES: {
                SHOOT_SETTINGS: combineStats([g.basic, g.sniper, g.rifle, g.crossbow, { recoil: 0.5 }]),
                TYPE: "bullet"
            }
        },
        {
            POSITION: {
                LENGTH: 15,
                WIDTH: 3,
                Y: 3.5,
                ANGLE: 15,
                DELAY: 2/3
            },
            PROPERTIES: {
                SHOOT_SETTINGS: combineStats([g.basic, g.sniper, g.rifle, g.crossbow, { recoil: 0.5 }]),
                TYPE: "bullet"
            }
        },
        {
            POSITION: {
                LENGTH: 20,
                WIDTH: 4,
                Y: 4,
                DELAY: 1/3
            },
            PROPERTIES: {
                SHOOT_SETTINGS: combineStats([g.basic, g.sniper, g.rifle, g.crossbow, { speed: 0.7, maxSpeed: 0.7 }, { recoil: 0.5 }]),
                TYPE: "bullet"
            }
        }], {delayOverflow: true}),
        {
            POSITION: {
                LENGTH: 24,
                WIDTH: 7
            },
            PROPERTIES: {
                SHOOT_SETTINGS: combineStats([g.basic, g.sniper, g.rifle, g.crossbow, { speed: 0.7, maxSpeed: 0.7 }, { recoil: 0.5 }]),
                TYPE: "bullet"
            }
        }
    ]
};
Class.cyclone = {
    PARENT: "genericTank",
    LABEL: "Cyclone",
    DANGER: 7,
    GUNS: weaponArray([
        {
            POSITION: {
                LENGTH: 15,
                WIDTH: 3.5
            },
            PROPERTIES: {
                SHOOT_SETTINGS: combineStats([g.basic, g.twin, g.gunner, g.cyclone]),
                TYPE: "bullet"
            }
        },
        {
            POSITION: {
                LENGTH: 15,
                WIDTH: 3.5,
                ANGLE: 30,
                DELAY: 0.5
            },
            PROPERTIES: {
                SHOOT_SETTINGS: combineStats([g.basic, g.twin, g.gunner, g.cyclone]),
                TYPE: "bullet"
            }
        },
        {
            POSITION: {
                LENGTH: 15,
                WIDTH: 3.5,
                ANGLE: 60,
                DELAY: 0.25
            },
            PROPERTIES: {
                SHOOT_SETTINGS: combineStats([g.basic, g.twin, g.gunner, g.cyclone]),
                TYPE: "bullet"
            }
        },
        {
            POSITION: {
                LENGTH: 15,
                WIDTH: 3.5,
                ANGLE: 90,
                DELAY: 0.75
            },
            PROPERTIES: {
                SHOOT_SETTINGS: combineStats([g.basic, g.twin, g.gunner, g.cyclone]),
                TYPE: "bullet"
            }
        }
    ], 3)
};
Class.deadeye = {
    PARENT: "genericTank",
    LABEL: "Deadeye",
    DANGER: 7,
    BODY: Class.assassin.BODY,
    GUNS: [
        ...weaponStack({
            POSITION: {
                LENGTH: 13,
                WIDTH: 5,
                ASPECT: 2.2,
                X: 7
            }
        }, 2, {xPosOffset: 5}),
        {
            POSITION: {
                LENGTH: 24,
                WIDTH: 8
            },
            PROPERTIES: {
                SHOOT_SETTINGS: combineStats([g.basic, g.sniper, g.assassin, g.marksman]),
                TYPE: "bullet"
            }
        },
        {
            POSITION: {
                LENGTH: 13,
                WIDTH: 8,
                ASPECT: -2.2
            }
        }
    ]
};
Class.dual = {
    PARENT: "genericTank",
    LABEL: "Dual",
    DANGER: 7,
    BODY: {
        FOV: 1.2 * base.FOV
    },
    CONTROLLERS: [["zoom", {distance: 165}]],
    GUNS: weaponMirror([
        {
            POSITION: {
                LENGTH: 18,
                WIDTH: 7,
                Y: 5.5
            },
            PROPERTIES: {
                SHOOT_SETTINGS: combineStats([g.basic, g.twin, g.dual, g.lowPower]),
                TYPE: "bullet",
                LABEL: "Small"
            }
        },
        {
            POSITION: {
                LENGTH: 16,
                WIDTH: 8.5,
                Y: 5.5,
                DELAY: 0.25
            },
            PROPERTIES: {
                SHOOT_SETTINGS: combineStats([g.basic, g.twin, g.dual]),
                TYPE: "bullet"
            }
        }
    ], {delayIncrement: 0.5})
};
Class.duplicator = {
    PARENT: "genericTank",
    LABEL: "Duplicator",
    DANGER: 7,
    STAT_NAMES: statnames.desmos,
    GUNS: [
        {
            POSITION: [20, 8, -4/3, 0, 0, 20, 0],
            PROPERTIES: {
                SHOOT_SETTINGS: combineStats([g.basic, g.twin, g.desmos]),
                TYPE: ["splitterBullet", {CONTROLLERS: [["snake", {invert: false}]]}]
            }
        },
        {
            POSITION: [20, 8, -4/3, 0, 0, -20, 0],
            PROPERTIES: {
                SHOOT_SETTINGS: combineStats([g.basic, g.twin, g.desmos]),
                TYPE: ["splitterBullet", {CONTROLLERS: [["snake", {invert: true}]]}]
            }
        },
        ...weaponMirror([{
            POSITION: [5.625, 9.5, 2, 0.375-1, -8, 111.5, 0]
        },
        {
            POSITION: [3.75, 10, 2.125, 0, 4.75, -30, 0]
        }]),
        {
            POSITION: [17, 8, 0.65, 0, 0, 0, 0]
        },
        {
            POSITION: [18, 8, 0.25, 0, 0, 0, 0]
        }
    ]
};
Class.eagle = makeBird("pounder", "Eagle");
Class.engineer = {
    PARENT: "genericTank",
    LABEL: "Engineer",
    DANGER: 7,
    STAT_NAMES: statnames.trap,
    BODY: Class.builder.BODY,
    GUNS: [
        {
            POSITION: {
                LENGTH: 5,
                WIDTH: 11,
                X: 10.5
            }
        },
        {
            POSITION: {
                LENGTH: 3,
                WIDTH: 14,
                X: 15.5
            }
        },
        {
            POSITION: {
                LENGTH: 2,
                WIDTH: 14,
                ASPECT: 1.3,
                X: 18
            },
            PROPERTIES: {
                SHOOT_SETTINGS: combineStats([g.trap, g.setTrap]),
                TYPE: "pillbox",
                NO_LIMITATIONS: true,
                SYNCS_SKILLS: true,
                DESTROY_OLDEST_CHILD: true,
                STAT_CALCULATOR: "block",
                MAX_CHILDREN: 6
            }
        },
        {
            POSITION: {
                LENGTH: 12,
                WIDTH: 14
            }
        }
    ]
};
Class.factory = {
    PARENT: "genericTank",
    LABEL: "Factory",
    DANGER: 7,
    STAT_NAMES: statnames.drone,
    BODY: {
        FOV: 1.1 * base.FOV,
        SPEED: 14/15 * base.SPEED
    },
    GUNS: [
        {
            POSITION: {
                LENGTH: 15.5,
                WIDTH: 11
            }
        },
        {
            POSITION: {
                LENGTH: 2,
                WIDTH: 14,
                X: 15.5
            },
            PROPERTIES: {
                SHOOT_SETTINGS: combineStats([g.minion]),
                TYPE: "minion",
                AUTOFIRE: true,
                SYNCS_SKILLS: true,
                STAT_CALCULATOR: "drone",
                WAIT_TO_CYCLE: true,
                MAX_CHILDREN: 6
            }
        },
        {
            POSITION: {
                LENGTH: 12,
                WIDTH: 14
            }
        }
    ]
};
Class.falcon = makeBird("assassin", "Falcon");
Class.fieldGun = {
    PARENT: "genericTank",
    LABEL: "Field Gun",
    DANGER: 7,
    BODY: Class.launcher.BODY,
    GUNS: [
        ...weaponMirror({
            POSITION: {
                LENGTH: 14.5,
                WIDTH: 3,
                Y: -6,
                ANGLE: -7,
                DELAY: 0.25
            },
            PROPERTIES: {
                SHOOT_SETTINGS: combineStats([g.basic, g.pelleter, g.artillery]),
                TYPE: "bullet",
                LABEL: "Secondary"
            }
        }, {delayIncrement: 0.5}),
        {
            POSITION: {
                LENGTH: 19.2,
                WIDTH: 13,
                ASPECT: 0.7
            }
        },
        {
            POSITION: {
                LENGTH: 17,
                WIDTH: 13
            },
            PROPERTIES: {
                SHOOT_SETTINGS: combineStats([g.basic, g.pounder, g.artillery, g.artillery]),
                TYPE: "launcherMissile",
                STAT_CALCULATOR: "sustained"
            }
        }
    ]
};
Class.fighter = {
    PARENT: "genericTank",
    LABEL: "Fighter",
    DANGER: 7,
    BODY: {
        DENSITY: 0.6 * base.DENSITY
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
        ...weaponMirror([
            {
                POSITION: {
                    LENGTH: 16,
                    WIDTH: 8,
                    Y: -1,
                    ANGLE: 90
                },
                PROPERTIES: {
                    SHOOT_SETTINGS: combineStats([g.basic, g.flankGuard, g.triAngle, g.triAngleFront]),
                    TYPE: "bullet",
                    LABEL: "Side"
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
Class.focal = {
    PARENT: "genericTank",
    LABEL: "Focal",
    DANGER: 7,
    GUNS: [
        {
            POSITION: {
                LENGTH: 25,
                WIDTH: 7
            },
            PROPERTIES: {
                SHOOT_SETTINGS: combineStats([g.basic, g.pelleter, g.lowPower, g.machineGun, { recoil: 1.15 }]),
                TYPE: "bullet"
            }
        },
        {
            POSITION: {
                LENGTH: 14,
                WIDTH: 9.5,
                ASPECT: 1.25,
                X: 8
            },
            PROPERTIES: {
                SHOOT_SETTINGS: combineStats([g.basic, g.machineGun, g.gatlingGun]),
                TYPE: "bullet"
            }
        }
    ]
};
Class.fork = {
    PARENT: "genericTank",
    LABEL: "Fork",
    DANGER: 7,
    BODY: Class.marksman.BODY,
    GUNS: [
        ...weaponStack({
            POSITION: {
                LENGTH: 13,
                WIDTH: 5,
                ASPECT: 2.2,
                X: 15
            }
        }, 4, {xPosOffset: 5}),
        {
            POSITION: {
                LENGTH: 29,
                WIDTH: 8
            },
            PROPERTIES: {
                SHOOT_SETTINGS: combineStats([g.basic, g.sniper, g.marksman]),
                TYPE: "splitterBullet"
            }
        }
    ]
};
Class.fortress = {
    PARENT: "genericTank",
    LABEL: "Fortress",
    DANGER: 7,
    STAT_NAMES: statnames.mixed,
    BODY: Class.cruiser.BODY,
    GUNS: [
        ...weaponArray({
            POSITION: {
                LENGTH: 9,
                WIDTH: 8.2,
                ASPECT: 0.6,
                X: 5,
                ANGLE: 180
            },
            PROPERTIES: {
                SHOOT_SETTINGS: combineStats([g.swarm]),
                TYPE: "swarm",
                STAT_CALCULATOR: "swarm"
            }
        }, 3, {delayIncrement: 1/3}),
        ...weaponArray([
            {
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
            }
        ], 3)
    ]
};
Class.gunnerTrapper = {
    PARENT: "genericTank",
    LABEL: "Gunner Trapper",
    DANGER: 7,
    STAT_NAMES: statnames.mixed,
    BODY: {
        FOV: 1.25 * base.FOV
    },
    GUNS: [
        {
            POSITION: {
                LENGTH: 13,
                WIDTH: 11,
                ANGLE: 180
            }
        },
        {
            POSITION: {
                LENGTH: 4,
                WIDTH: 11,
                ASPECT: 1.7,
                X: 13,
                ANGLE: 180
            },
            PROPERTIES: {
                SHOOT_SETTINGS: combineStats([g.trap, { speed: 1.2 }, { recoil: 0.5 }]),
                TYPE: "trap",
                STAT_CALCULATOR: "trap"
            }
        },
        ...weaponMirror({
            POSITION: {
                LENGTH: 19,
                WIDTH: 2,
                Y: -2.5
            },
            PROPERTIES: {
                SHOOT_SETTINGS: combineStats([g.basic, g.pelleter, g.power, g.twin, { recoil: 4 }, { recoil: 1.8 }]),
                TYPE: "bullet"
            }
        }, {delayIncrement: 0.5}),
        {
            POSITION: {
                LENGTH: 12,
                WIDTH: 11
            }
        }
    ]
};
Class.hewnDouble = {
    PARENT: "genericTank",
    LABEL: "Hewn Double",
    DANGER: 7,
    GUNS: [
        ...weaponMirror({
            POSITION: {
                LENGTH: 19,
                WIDTH: 8,
                Y: -5.5,
                ANGLE: 155
            },
            PROPERTIES: {
                SHOOT_SETTINGS: combineStats([g.basic, g.twin, g.twin, g.doubleTwin, g.hewnDouble, { recoil: 1.15 }]),
                TYPE: "bullet"
            }
        }, {delayIncrement: 0.5}),
        ...weaponArray(weaponMirror({
            POSITION: {
                LENGTH: 20,
                WIDTH: 8,
                Y: 5.5
            },
            PROPERTIES: {
                SHOOT_SETTINGS: combineStats([g.basic, g.twin, g.doubleTwin, g.hewnDouble]),
                TYPE: "bullet"
            }
        }, {delayIncrement: 0.5}), 2)
    ]
};
Class.hexaTrapper = makeAuto(makeFlank("trapper", 6, "", { extraStats: [g.hexaTrapper], delayIncrement: 0.5, danger: 6 }), "Hexa-Trapper");
Class.hybrid = makeOver("destroyer", "Hybrid", preset.hybrid);
Class.infestor = {
    PARENT: "genericTank",
    LABEL: "Infestor",
    DANGER: 7,
    NECRO: [0],
    STAT_NAMES: statnames.necro,
    BODY: {
        FOV: base.FOV * 1.125
    },
    GUNS: weaponArray(weaponMirror({
        POSITION: {
            LENGTH: 10,
            WIDTH: 6,
            ASPECT: 1.2,
            X: 3,
            Y: 5,
            ANGLE: 90
        },
        PROPERTIES: {
            SHOOT_SETTINGS: combineStats([g.drone, g.sunchip, {reload: 0.5}]),
            TYPE: "eggchip",
            AUTOFIRE: true,
            SYNCS_SKILLS: true,
            STAT_CALCULATOR: "necro",
            WAIT_TO_CYCLE: true,
            DELAY_SPAWN: false,
            MAX_CHILDREN: 10
        }
    }), 2)
};
Class.landmine = {
    PARENT: "genericSmasher",
    LABEL: "Landmine",
    INVISIBLE: [0.06, 0.01],
    TOOLTIP: "Stay still to turn invisible.",
    TURRETS: [
        {
            TYPE: ["hexagonHat_spin", {COLOR: "black"}],
            POSITION: {
                SIZE: 21.5
            }
        },
        {
            TYPE: ["hexagonHat_spinFaster", {COLOR: "black"}],
            POSITION: {
                SIZE: 21.5,
                ANGLE: 90
            }
        }
    ]
};
Class.machineGunner = {
    PARENT: "genericTank",
    LABEL: "Machine Gunner",
    DANGER: 7,
    GUNS: [
        ...weaponMirror([{
            POSITION: {
                LENGTH: 14,
                WIDTH: 3,
                ASPECT: 4,
                X: -3,
                Y: 5,
                DELAY: 0.6
            },
            PROPERTIES: {
                SHOOT_SETTINGS: combineStats([g.basic, g.twin, g.gunner, g.machineGunner]),
                TYPE: "bullet"
            }
        },
        {
            POSITION: {
                LENGTH: 14,
                WIDTH: 3,
                ASPECT: 4,
                Y: -2.5,
                DELAY: 0.2
            },
            PROPERTIES: {
                SHOOT_SETTINGS: combineStats([g.basic, g.twin, g.gunner, g.machineGunner]),
                TYPE: "bullet"
            }
        }], {delayIncrement: 0.2}),
        {
            POSITION: {
                LENGTH: 14,
                WIDTH: 3,
                ASPECT: 4,
                X: 3
            },
            PROPERTIES: {
                SHOOT_SETTINGS: combineStats([g.basic, g.twin, g.gunner, g.machineGunner]),
                TYPE: "bullet"
            }
        }
    ]
};
Class.manager = {
    PARENT: "genericTank",
    LABEL: "Manager",
    DANGER: 7,
    STAT_NAMES: statnames.drone,
    BODY: {
        FOV: 1.1 * base.FOV,
        SPEED: 14/15 * base.SPEED
    },
    INVISIBLE: [0.08, 0.03],
    TOOLTIP: "Stay still to turn invisible.",
    GUNS: [
        {
            POSITION: {
                LENGTH: 6,
                WIDTH: 12,
                ASPECT: 1.2,
                X: 8
            },
            PROPERTIES: {
                SHOOT_SETTINGS: combineStats([g.drone, g.overseer, { reload: 0.5 }]),
                TYPE: "drone",
                AUTOFIRE: true,
                SYNCS_SKILLS: true,
                STAT_CALCULATOR: "drone",
                WAIT_TO_CYCLE: true,
                MAX_CHILDREN: 8
            }
        }
    ]
};
Class.maleficitor = {
    PARENT: "genericTank",
    LABEL: "Maleficitor",
    DANGER: 7,
    NECRO: [4],
    TOOLTIP: "Press R and wait to turn your drones invisible.",
    STAT_NAMES: statnames.necro,
    SHAPE: 4,
    MAX_CHILDREN: 20,
    GUNS: [
        {
            POSITION: {
                LENGTH: 6,
                WIDTH: 12,
                ASPECT: 1.2,
                X: 7.4
            },
            PROPERTIES: {
                SHOOT_SETTINGS: combineStats([g.drone, g.sunchip, g.maleficitor]),
                TYPE: ["sunchip", {INVISIBLE: [0.06, 0.03]}],
                AUTOFIRE: true,
                SYNCS_SKILLS: true,
                STAT_CALCULATOR: "necro",
                WAIT_TO_CYCLE: true,
                DELAY_SPAWN: false
            }
        }
    ]
};
Class.medic = {
    PARENT: "genericHealer",
    LABEL: "Medic",
    BODY: {
        FOV: base.FOV * 1.2
    },
    GUNS: [
        {
            POSITION: {
                LENGTH: 11,
                WIDTH: 9,
                ASPECT: -0.4,
                X: 14
            }
        },
        {
            POSITION: {
                LENGTH: 22,
                WIDTH: 10
            },
            PROPERTIES: {
                SHOOT_SETTINGS: combineStats([g.basic, g.healer, g.sniper]),
                TYPE: "healerBullet"
            }
        }
    ]
};
Class.mega3 = makeRadialAuto("megaAutoTankGun", { isTurret: true, danger: 7, size: 14, label: "Mega-3", body: { SPEED: 0.95 * base.SPEED } });
Class.megaSmasher = {
    PARENT: "genericSmasher",
    LABEL: "Mega-Smasher",
    BODY: {
        FOV: 1.1 * base.FOV,
        SPEED: 1.2 * base.SPEED,
        DENSITY: 4 * base.DENSITY
    },
    TURRETS: [
        {
            TYPE: ["hexagonHat_spin", {COLOR: "black"}],
            POSITION: { SIZE: 25 }
        }
    ]
};
Class.mortar = {
    PARENT: "genericTank",
    LABEL: "Mortar",
    DANGER: 7,
    GUNS: [
        ...weaponMirror([{
            POSITION: {
                LENGTH: 13,
                WIDTH: 3,
                Y: -8,
                ANGLE: -3.5,
                DELAY: 0.6
            },
            PROPERTIES: {
                SHOOT_SETTINGS: combineStats([g.basic, g.pelleter, g.artillery, g.twin]),
                TYPE: "bullet",
                LABEL: "Secondary"
            }
        },
        {
            POSITION: {
                LENGTH: 17,
                WIDTH: 5,
                Y: -5,
                ANGLE: -3.5,
                DELAY: 0.2
            },
            PROPERTIES: {
                SHOOT_SETTINGS: combineStats([g.basic, g.pelleter, g.artillery, g.twin]),
                TYPE: "bullet",
                LABEL: "Secondary"
            }
        }], {delayIncrement: 0.2}),
        {
            POSITION: {
                LENGTH: 19,
                WIDTH: 12
            },
            PROPERTIES: {
                SHOOT_SETTINGS: combineStats([g.basic, g.pounder, g.artillery]),
                TYPE: "bullet",
                LABEL: "Heavy"
            }
        }
    ]
};
Class.musket = {
    PARENT: "genericTank",
    LABEL: "Musket",
    DANGER: 7,
    BODY: Class.rifle.BODY,
    GUNS: weaponMirror([
        {
            POSITION: {
                LENGTH: 15.5,
                WIDTH: 7,
                Y: 6.15
            }
        },
        {
            POSITION: {
                LENGTH: 18,
                WIDTH: 7,
                Y: 4.15
            },
            PROPERTIES: {
                SHOOT_SETTINGS: combineStats([g.basic, g.sniper, g.rifle, g.twin]),
                TYPE: "bullet"
            }
        }
    ], {delayIncrement: 0.5})
};
Class.nailgun = {
    PARENT: "genericTank",
    LABEL: "Nailgun",
    DANGER: 7,
    BODY: {
        FOV: base.FOV * 1.1,
        SPEED: base.SPEED * 14/15
    },
    GUNS: [
        ...weaponMirror({
            POSITION: {
                LENGTH: 19,
                WIDTH: 3,
                Y: -2,
                DELAY: 0.25
            },
            PROPERTIES: {
                SHOOT_SETTINGS: combineStats([g.basic, g.pelleter, g.power, g.twin, g.nailgun, {size: 2/3}]),
                TYPE: "bullet"
            }
        }, {delayIncrement: 0.5}),
        {
            POSITION: {
                LENGTH: 20,
                WIDTH: 2
            },
            PROPERTIES: {
                SHOOT_SETTINGS: combineStats([g.basic, g.pelleter, g.power, g.twin, g.nailgun]),
                TYPE: "bullet"
            }
        },
        {
            POSITION: {
                LENGTH: 5.5,
                WIDTH: 7,
                ASPECT: -1.8,
                X: 6.5
            }
        }
    ]
};
Class.necromancer = {
    PARENT: "genericTank",
    LABEL: "Necromancer",
    DANGER: 7,
    NECRO: [4],
    STAT_NAMES: statnames.necro,
    SHAPE: 4,
    MAX_CHILDREN: 14,
    GUNS: weaponArray({
        POSITION: {
            LENGTH: 6,
            WIDTH: 12,
            ASPECT: 1.2,
            X: 7.4,
            DELAY: 0.25
        },
        PROPERTIES: {
            SHOOT_SETTINGS: combineStats([g.drone, g.sunchip]),
            TYPE: "sunchip",
            AUTOFIRE: true,
            SYNCS_SKILLS: true,
            STAT_CALCULATOR: "necro",
            WAIT_TO_CYCLE: true,
            DELAY_SPAWN: false
        }
    }, 4, {delayIncrement: 0.75})
};
Class.nimrod = {
    PARENT: "genericTank",
    LABEL: "Nimrod",
    DANGER: 7,
    BODY: {
        FOV: base.FOV * 1.35
    },
    CONTROLLERS: ["zoom"],
    GUNS: [
        {
            POSITION: {
                LENGTH: 13,
                WIDTH: 6.5,
                ASPECT: 2.2
            }
        },
        {
            POSITION: {
                LENGTH: 13,
                WIDTH: 6.4,
                ASPECT: 2.2,
                X: 5
            }
        },
        {
            POSITION: {
                LENGTH: 24,
                WIDTH: 8
            },
            PROPERTIES: {
                SHOOT_SETTINGS: combineStats([g.basic, g.sniper, g.hunter, g.hunterSecondary, g.marksman]),
                TYPE: "bullet"
            }
        },
        {
            POSITION: {
                LENGTH: 21,
                WIDTH: 11,
                DELAY: 0.25
            },
            PROPERTIES: {
                SHOOT_SETTINGS: combineStats([g.basic, g.sniper, g.hunter, g.marksman]),
                TYPE: "bullet"
            }
        }
    ]
};
Class.octoTank = {
    PARENT: "genericTank",
    LABEL: "Octo Tank",
    DANGER: 7,
    GUNS: weaponArray([
    // Must be kept like this to preserve visual layering
        {
            POSITION: {
                LENGTH: 18,
                WIDTH: 8,
                ANGLE: 45,
                DELAY: 0.5
            },
            PROPERTIES: {
                SHOOT_SETTINGS: combineStats([g.basic, g.flankGuard, g.flankGuard, g.spam]),
                TYPE: "bullet"
            }
        },
        {
            POSITION: {
                LENGTH: 18,
                WIDTH: 8
            },
            PROPERTIES: {
                SHOOT_SETTINGS: combineStats([g.basic, g.flankGuard, g.flankGuard, g.spam]),
                TYPE: "bullet"
            }
        }
    ], 4)
};
Class.ordnance = {
    PARENT: "genericTank",
    LABEL: "Ordnance",
    DANGER: 7,
    BODY: {
        FOV: base.FOV * 1.3
    },
    CONTROLLERS: ["zoom"],
    GUNS: [
        ...weaponMirror({
            POSITION: {
                LENGTH: 17,
                WIDTH: 5,
                Y: -4.45,
                ANGLE: -7,
                DELAY: 0.25
            },
            PROPERTIES: {
                SHOOT_SETTINGS: combineStats([g.basic, g.pelleter, g.artillery]),
                TYPE: "bullet",
                LABEL: "Secondary"
            }
        }, {delayIncrement: 0.5}),
        {
            POSITION: {
                LENGTH: 24,
                WIDTH: 8
            },
            PROPERTIES: {
                SHOOT_SETTINGS: combineStats([g.basic, g.sniper, g.hunter, g.hunterSecondary]),
                TYPE: "bullet"
            }
        },
        {
            POSITION: {
                LENGTH: 21,
                WIDTH: 11,
                DELAY: 0.25
            },
            PROPERTIES: {
                SHOOT_SETTINGS: combineStats([g.basic, g.sniper, g.hunter]),
                TYPE: "bullet"
            }
        }
    ]
};
Class.overdrive = {
    PARENT: "genericTank",
    LABEL: "Overdrive",
    DANGER: 7,
    STAT_NAMES: statnames.drone,
    BODY: Class.overseer.BODY,
    TURRETS: preset.turret.driveHat,
    GUNS: weaponMirror({
        POSITION: {
            LENGTH: 6,
            WIDTH: 12,
            ASPECT: 1.2,
            X: 8,
            ANGLE: 90
        },
        PROPERTIES: {
            SHOOT_SETTINGS: combineStats([g.drone, g.overseer]),
            TYPE: "autoDrone",
            AUTOFIRE: true,
            SYNCS_SKILLS: true,
            STAT_CALCULATOR: "drone",
            WAIT_TO_CYCLE: true,
            MAX_CHILDREN: 4
        }
    })
};
Class.overgunner = makeOver({
    PARENT: "genericTank",
    LABEL: "Gunner",
    DANGER: 6,
    BODY: Class.overseer.BODY,
    GUNS: [
        ...weaponMirror({
            POSITION: {
                LENGTH: 19,
                WIDTH: 2,
                Y: -2.5
            },
            PROPERTIES: {
                SHOOT_SETTINGS: combineStats([g.basic, g.pelleter, g.power, g.twin, { speed: 0.7, maxSpeed: 0.7 }, g.flankGuard, { recoil: 1.8 }]),
                TYPE: "bullet"
            }
        }, {delayIncrement: 0.5}),
        {
            POSITION: {
                LENGTH: 12,
                WIDTH: 11
            }
        }
    ]
});
Class.overlord = {
    PARENT: "genericTank",
    LABEL: "Overlord",
    DANGER: 7,
    STAT_NAMES: statnames.drone,
    BODY: {
        FOV: 1.1 * base.FOV,
        SPEED: 13/15 * base.SPEED
    },
    MAX_CHILDREN: 8,
    GUNS: weaponArray({
        POSITION: {
            LENGTH: 6,
            WIDTH: 12,
            ASPECT: 1.2,
            X: 8
        },
        PROPERTIES: {
            SHOOT_SETTINGS: combineStats([g.drone, g.overseer]),
            TYPE: "drone",
            AUTOFIRE: true,
            SYNCS_SKILLS: true,
            STAT_CALCULATOR: "drone",
            WAIT_TO_CYCLE: true
        }
    }, 4)
};
Class.overtrapper = makeOver({
    PARENT: "genericTank",
    LABEL: "Trapper",
    DANGER: 6,
    STAT_NAMES: statnames.mixed,
    BODY: {
        FOV: base.FOV * 1.2,
        SPEED: base.SPEED * 14/15
    },
    GUNS: [
        {
            POSITION: {
                LENGTH: 14,
                WIDTH: 8
            }
        },
        {
            POSITION: {
                LENGTH: 4,
                WIDTH: 8,
                ASPECT: 1.5,
                X: 14
            },
            PROPERTIES: {
                SHOOT_SETTINGS: combineStats([g.trap]),
                TYPE: "trap",
                STAT_CALCULATOR: "trap"
            }
        }
    ]
});
Class.paramedic = {
    PARENT: "genericHealer",
    LABEL: "Paramedic",
    GUNS: [
        ...weaponMirror([{
            POSITION: {
                LENGTH: 11,
                WIDTH: 6,
                ASPECT: -0.4,
                X: 8,
                Y: 2,
                ANGLE: 18
            }
        },
        {
            POSITION: {
                LENGTH: 17,
                WIDTH: 8,
                Y: 2,
                ANGLE: 18,
                DELAY: 0.5
            },
            PROPERTIES: {
                SHOOT_SETTINGS: combineStats([g.basic, g.twin, g.tripleShot, g.healer]),
                TYPE: "healerBullet"
            }
        }]),
        {
            POSITION: {
                LENGTH: 11,
                WIDTH: 9,
                ASPECT: -0.4,
                X: 11
            }
        },
        {
            POSITION: {
                LENGTH: 20,
                WIDTH: 10
            },
            PROPERTIES: {
                SHOOT_SETTINGS: combineStats([g.basic, g.twin, g.tripleShot, g.healer]),
                TYPE: "healerBullet"
            }
        }
    ]
};
Class.pentaShot = {
    PARENT: "genericTank",
    LABEL: "Penta Shot",
    DANGER: 7,
    GUNS: [
        ...weaponMirror([{
            POSITION: {
                LENGTH: 16,
                WIDTH: 8,
                Y: 3,
                ANGLE: 30,
                DELAY: 2/3
            },
            PROPERTIES: {
                SHOOT_SETTINGS: combineStats([g.basic, g.twin, g.tripleShot]),
                TYPE: "bullet"
            }
        },
        {
            POSITION: {
                LENGTH: 19,
                WIDTH: 8,
                Y: 2,
                ANGLE: 15,
                DELAY: 1/3
            },
            PROPERTIES: {
                SHOOT_SETTINGS: combineStats([g.basic, g.twin, g.tripleShot]),
                TYPE: "bullet"
            }
        }]),
        {
            POSITION: {
                LENGTH: 22,
                WIDTH: 8
            },
            PROPERTIES: {
                SHOOT_SETTINGS: combineStats([g.basic, g.twin, g.tripleShot]),
                TYPE: "bullet"
            }
        }
    ]
};
Class.phoenix = makeBird("sprayer", "Phoenix");
Class.poacher = makeOver("hunter", "Poacher", preset.hybrid);
Class.predator = {
    PARENT: "genericTank",
    LABEL: "Predator",
    DANGER: 7,
    BODY: {
        FOV: base.FOV * 1.325,
        SPEED: base.SPEED * 14/15
    },
    CONTROLLERS: [["zoom", {distance: 365}]],
    GUNS: [
        {
            POSITION: {
                LENGTH: 24,
                WIDTH: 8
            },
            PROPERTIES: {
                SHOOT_SETTINGS: combineStats([g.basic, g.sniper, g.hunter, g.hunterSecondary, g.hunterSecondary, g.predator]),
                TYPE: "bullet"
            }
        },
        {
            POSITION: {
                LENGTH: 21,
                WIDTH: 11,
                DELAY: 0.15
            },
            PROPERTIES: {
                SHOOT_SETTINGS: combineStats([g.basic, g.sniper, g.hunter, g.hunterSecondary, g.predator]),
                TYPE: "bullet"
            }
        },
        {
            POSITION: {
                LENGTH: 18,
                WIDTH: 14,
                DELAY: 0.3
            },
            PROPERTIES: {
                SHOOT_SETTINGS: combineStats([g.basic, g.sniper, g.hunter, g.predator]),
                TYPE: "bullet"
            }
        }
    ]
};
Class.python = {
    PARENT: "genericTank",
    LABEL: "Python", //"Super Spiral",
    DANGER: 7,
    STAT_NAMES: statnames.desmos,
    GUNS: [
        {
            POSITION: {
                LENGTH: 22,
                WIDTH: 12
            }
        },
        {
            POSITION: {
                LENGTH: 24,
                WIDTH: 8,
                ASPECT: -1.5
            },
            PROPERTIES: {
                SHOOT_SETTINGS: combineStats([g.basic, g.desmos, { reload: 5/3 }]),
                TYPE: ["pythonBullet", {CONTROLLERS: ["snake"]}]
            }
        },
        ...weaponMirror({
            POSITION: {
                LENGTH: 6,
                WIDTH: 6,
                ASPECT: -4,
                X: -6.75,
                Y: -6,
                ANGLE: 87.5
            }
        })
    ]
};
Class.quadruplex = {
    PARENT: "genericTank",
    LABEL: "Quadruplex",
    DANGER: 7,
    STAT_NAMES: statnames.desmos,
    GUNS: [
        {
            POSITION: {
                LENGTH: 20,
                WIDTH: 8,
                ASPECT: -1.5,
                ANGLE: 45
            },
            PROPERTIES: {
                SHOOT_SETTINGS: combineStats([g.basic, g.desmos, g.twin, { reload: 2 }]),
                TYPE: ["bullet", {CONTROLLERS: [["snake", {invert: true, amplitude: 180, yOffset: 50}]]}]
            }
        },
        {
            POSITION: {
                LENGTH: 20,
                WIDTH: 8,
                ASPECT: -1.5,
                ANGLE: -135
            },
            PROPERTIES: {
                SHOOT_SETTINGS: combineStats([g.basic, g.desmos, g.twin, { reload: 2 }]),
                TYPE: ["bullet", {CONTROLLERS: [["snake", {invert: true, amplitude: 180, yOffset: -50}]]}]
            }
        },
        {
            POSITION: {
                LENGTH: 20,
                WIDTH: 8,
                ASPECT: -1.5,
                ANGLE: -45
            },
            PROPERTIES: {
                SHOOT_SETTINGS: combineStats([g.basic, g.desmos, g.twin, { reload: 2 }]),
                TYPE: ["bullet", {CONTROLLERS: [["snake", {invert: false, amplitude: 180, yOffset: -50}]]}]
            }
        },
        {
            POSITION: {
                LENGTH: 20,
                WIDTH: 8,
                ASPECT: -1.5,
                ANGLE: 135
            },
            PROPERTIES: {
                SHOOT_SETTINGS: combineStats([g.basic, g.desmos, g.twin, { reload: 2 }]),
                TYPE: ["bullet", {CONTROLLERS: [["snake", {invert: false, amplitude: 180, yOffset: 50}]]}]
            }
        },
        ...weaponArray(weaponMirror({
            POSITION: {
                LENGTH: 5,
                WIDTH: 5,
                ASPECT: -4,
                X: -5.25,
                Y: -7,
                ANGLE: 45
            }
        }, {delayIncrement: 0.5}), 4)
    ]
};
Class.ranger = {
    PARENT: "genericTank",
    LABEL: "Ranger",
    DANGER: 7,
    BODY: {
        FOV: 1.5 * base.FOV
    },
    GUNS: [
        {
            POSITION: {
                LENGTH: 32,
                WIDTH: 8
            },
            PROPERTIES: {
                SHOOT_SETTINGS: combineStats([g.basic, g.sniper, g.assassin]),
                TYPE: "bullet"
            }
        },
        {
            POSITION: {
                LENGTH: 13,
                WIDTH: 8,
                ASPECT: -2.2
            }
        }
    ]
};
Class.redistributor = {
    PARENT: "genericTank",
    LABEL: "Redistributor",
    DANGER: 7,
    GUNS: [
        {
            POSITION: {
                LENGTH: 26,
                WIDTH: 7,
                DELAY: 2/3
            },
            PROPERTIES: {
                SHOOT_SETTINGS: combineStats([g.basic, g.pelleter, g.lowPower, g.machineGun, { recoil: 1.15 }]),
                TYPE: "bullet"
            }
        },
        {
            POSITION: {
                LENGTH: 23,
                WIDTH: 10,
                DELAY: 1/3
            },
            PROPERTIES: {
                SHOOT_SETTINGS: combineStats([g.basic, g.pelleter, g.lowPower, g.machineGun, { recoil: 1.15 }]),
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
                SHOOT_SETTINGS: combineStats([g.basic, g.machineGun]),
                TYPE: "bullet"
            }
        }
    ]
};
Class.revolver = {
    PARENT: "genericTank",
    LABEL: "Revolver",
    DANGER: 7,
    BODY: Class.rifle.BODY,
    GUNS: [
        ...weaponStack({
            POSITION: {
                LENGTH: 13,
                WIDTH: 7,
                ASPECT: 2.2,
                X: 5
            }
        }, 2, {xPosOffset: 5}),
        {
            POSITION: {
                LENGTH: 20,
                WIDTH: 12
            }
        },
        {
            POSITION: {
                LENGTH: 24,
                WIDTH: 7
            },
            PROPERTIES: {
                SHOOT_SETTINGS: combineStats([g.basic, g.sniper, g.rifle, g.marksman]),
                TYPE: "bullet"
            }
        }
    ]
};
Class.riptide = {
    PARENT: "genericTank",
    LABEL: "Riptide",
    DANGER: 7,
    GUNS: [
        {
            POSITION: [6.5, 23.5, 0.25, 3, 0, 180, 0]
        },
        {
            POSITION: [18, 16, 0.75, 0, 0, 0, 0],
            PROPERTIES: {
                SHOOT_SETTINGS: combineStats([g.basic, { size: 0.9, reload: 1.2 }]),
                TYPE: "undertowBullet"
            }
        },
        ...weaponMirror({
            POSITION: [17, 16, 0.1, 0.25, 4, 13.5, 0]
        })
    ]
};
Class.septaTrapper = {
    PARENT: "genericTank",
    LABEL: "Septa-Trapper",
    DANGER: 7,
    BODY: {
        SPEED: base.SPEED * 0.8
    },
    STAT_NAMES: statnames.trap,
    HAS_NO_RECOIL: true,
    GUNS: [
        {
            POSITION: {
                LENGTH: 15,
                WIDTH: 7
            }
        },
        {
            POSITION: {
                LENGTH: 3,
                WIDTH: 7,
                ASPECT: 1.7,
                X: 15
            },
            PROPERTIES: {
                SHOOT_SETTINGS: combineStats([g.trap, g.hexaTrapper]),
                TYPE: "trap",
                STAT_CALCULATOR: "trap"
            }
        },
        ...weaponMirror([
            {
                POSITION: {
                    LENGTH: 15,
                    WIDTH: 7,
                    ANGLE: 360/7,
                    DELAY: 1/3
                }
            },
            {
                POSITION: {
                    LENGTH: 3,
                    WIDTH: 7,
                    ASPECT: 1.7,
                    X: 15,
                    ANGLE: 360/7,
                    DELAY: 1/3
                },
                PROPERTIES: {
                    SHOOT_SETTINGS: combineStats([g.trap, g.hexaTrapper]),
                    TYPE: "trap",
                    STAT_CALCULATOR: "trap"
                }
            },
            {
                POSITION: {
                    LENGTH: 15,
                    WIDTH: 7,
                    ANGLE: 360/7 * 2,
                    DELAY: 2/3
                }
            },
            {
                POSITION: {
                    LENGTH: 3,
                    WIDTH: 7,
                    ASPECT: 1.7,
                    X: 15,
                    ANGLE: 360/7 * 2,
                    DELAY: 2/3
                },
                PROPERTIES: {
                    SHOOT_SETTINGS: combineStats([g.trap, g.hexaTrapper]),
                    TYPE: "trap",
                    STAT_CALCULATOR: "trap"
                }
            },
            {
                POSITION: {
                    LENGTH: 15,
                    WIDTH: 7,
                    ANGLE: 360/7 * 3,
                    DELAY: 1
                }
            },
            {
                POSITION: {
                    LENGTH: 3,
                    WIDTH: 7,
                    ASPECT: 1.7,
                    X: 15,
                    ANGLE: 360/7 * 3,
                    DELAY: 1
                },
                PROPERTIES: {
                    SHOOT_SETTINGS: combineStats([g.trap, g.hexaTrapper]),
                    TYPE: "trap",
                    STAT_CALCULATOR: "trap"
                }
            }
        ], {delayOverflow: true})
    ]
};
Class.shotgun = {
    PARENT: "genericTank",
    LABEL: "Shotgun",
    DANGER: 7,
    BODY: {
        FOV: 1.15 * base.FOV
    },
    GUNS: [
        ...weaponMirror([{
            POSITION: {
                LENGTH: 4,
                WIDTH: 3,
                X: 11,
                Y: 3
            },
            PROPERTIES: {
                SHOOT_SETTINGS: combineStats([g.basic, g.machineGun, g.shotgun]),
                TYPE: "bullet"
            }
        },
        {
            POSITION: {
                LENGTH: 1,
                WIDTH: 4,
                X: 12,
                Y: 1
            },
            PROPERTIES: {
                SHOOT_SETTINGS: combineStats([g.basic, g.machineGun, g.shotgun]),
                TYPE: "casing"
            }
        },
        {
            POSITION: {
                LENGTH: 1,
                WIDTH: 3,
                X: 13,
                Y: 1
            },
            PROPERTIES: {
                SHOOT_SETTINGS: combineStats([g.basic, g.machineGun, g.shotgun]),
                TYPE: "bullet"
            }
        },
        {
            POSITION: {
                LENGTH: 1,
                WIDTH: 2,
                X: 13,
                Y: 2
            },
            PROPERTIES: {
                SHOOT_SETTINGS: combineStats([g.basic, g.machineGun, g.shotgun]),
                TYPE: "casing"
            }
        }]),
        {
            POSITION: {
                LENGTH: 4,
                WIDTH: 4,
                X: 13
            },
            PROPERTIES: {
                SHOOT_SETTINGS: combineStats([g.basic, g.machineGun, g.shotgun]),
                TYPE: "casing"
            }
        },
        {
            POSITION: {
                LENGTH: 15,
                WIDTH: 14,
                X: 6
            },
            PROPERTIES: {
                SHOOT_SETTINGS: combineStats([g.basic, g.machineGun, g.shotgun, g.fake]),
                TYPE: "casing"
            }
        },
        {
            POSITION: {
                LENGTH: 8,
                WIDTH: 14,
                ASPECT: -1.3,
                X: 4
            }
        }
    ]
};
Class.sidewinder = {
    PARENT: "genericTank",
    LABEL: "Sidewinder",
    DANGER: 7,
    BODY: {
        SPEED: 0.8 * base.SPEED,
        FOV: 1.3 * base.FOV
    },
    GUNS: [
        {
            POSITION: {
                LENGTH: 10,
                WIDTH: 11,
                ASPECT: -0.5,
                X: 14
            }
        },
        {
            POSITION: {
                LENGTH: 21,
                WIDTH: 12,
                ASPECT: -1.1
            },
            PROPERTIES: {
                SHOOT_SETTINGS: combineStats([g.basic, g.sniper, g.hunter, g.sidewinder]),
                TYPE: "snake",
                STAT_CALCULATOR: "sustained"
            }
        }
    ]
};
Class.single = {
    PARENT: "genericTank",
    LABEL: "Single",
    DANGER: 7,
    GUNS: [
        {
            POSITION: {
                LENGTH: 19,
                WIDTH: 8
            },
            PROPERTIES: {
                SHOOT_SETTINGS: combineStats([g.basic, g.single]),
                TYPE: "bullet"
            }
        },
        {
            POSITION: {
                LENGTH: 5.5,
                WIDTH: 8,
                ASPECT: -1.8,
                X: 6.5
            }
        }
    ]
};
Class.skimmer = {
    PARENT: "genericTank",
    LABEL: "Skimmer",
    DANGER: 7,
    BODY: Class.launcher.BODY,
    GUNS: [
        {
            POSITION: {
                LENGTH: 10,
                WIDTH: 14,
                ASPECT: -0.5,
                X: 9
            }
        },
        {
            POSITION: {
                LENGTH: 17,
                WIDTH: 15
            },
            PROPERTIES: {
                SHOOT_SETTINGS: combineStats([g.basic, g.pounder, g.artillery, g.artillery, g.skimmer]),
                TYPE: "missile",
                STAT_CALCULATOR: "sustained"
            }
        }
    ]
};
Class.spike = {
    PARENT: "genericSmasher",
    LABEL: "Spike",
    DANGER: 7,
    BODY: {
        DAMAGE: base.DAMAGE * 1.1,
        SPEED: base.SPEED
    },
    TURRETS: weaponArray([{
        TYPE: ["triangleHat_spin", {COLOR: "black"}],
        POSITION: {
            SIZE: 18
        }
    }], 4)
};
Class.spreadshot = {
    PARENT: "genericTank",
    LABEL: "Spreadshot",
    DANGER: 7,
    GUNS: [
        ...weaponMirror([{
            POSITION: {
                LENGTH: 13,
                WIDTH: 4,
                Y: 0.8,
                ANGLE: 71.5,
                DELAY: 5/6
            },
            PROPERTIES: {
                SHOOT_SETTINGS: combineStats([g.basic, g.pelleter, g.artillery, g.twin, g.spreadshot]),
                TYPE: "bullet",
                LABEL: "Spread"
            }
        },
        {
            POSITION: {
                LENGTH: 14.5,
                WIDTH: 4,
                Y: 1,
                ANGLE: 56.5,
                DELAY: 4/6
            },
            PROPERTIES: {
                SHOOT_SETTINGS: combineStats([g.basic, g.pelleter, g.artillery, g.twin, g.spreadshot]),
                TYPE: "bullet",
                LABEL: "Spread"
            }
        },
        {
            POSITION: {
                LENGTH: 16,
                WIDTH: 4,
                Y: 1.2,
                ANGLE: 41.5,
                DELAY: 3/6
            },
            PROPERTIES: {
                SHOOT_SETTINGS: combineStats([g.basic, g.pelleter, g.artillery, g.twin, g.spreadshot]),
                TYPE: "bullet",
                LABEL: "Spread"
            }
        },
        {
            POSITION: {
                LENGTH: 17.5,
                WIDTH: 4,
                Y: 1.4,
                ANGLE: 26.5,
                DELAY: 2/6
            },
            PROPERTIES: {
                SHOOT_SETTINGS: combineStats([g.basic, g.pelleter, g.artillery, g.twin, g.spreadshot]),
                TYPE: "bullet",
                LABEL: "Spread"
            }
        },
        {
            POSITION: {
                LENGTH: 19,
                WIDTH: 4,
                Y: 1,
                ANGLE: 15,
                DELAY: 1/6
            },
            PROPERTIES: {
                SHOOT_SETTINGS: combineStats([g.basic, g.pelleter, g.artillery, g.twin, g.spreadshot]),
                TYPE: "bullet",
                LABEL: "Spread"
            }
        }]),
        {
            POSITION: {
                LENGTH: 20,
                WIDTH: 8
            },
            PROPERTIES: {
                SHOOT_SETTINGS: combineStats([g.basic, g.pounder, g.spreadshotMain, g.spreadshot]),
                TYPE: "bullet"
            }
        }
    ]
};
Class.stalker = {
    PARENT: "genericTank",
    LABEL: "Stalker",
    DANGER: 7,
    BODY: Class.assassin.BODY,
    INVISIBLE: [0.08, 0.03],
    TOOLTIP: "Stay still to turn invisible.",
    GUNS: [
        {
            POSITION: {
                LENGTH: 27,
                WIDTH: 8,
                ASPECT: -1.77
            },
            PROPERTIES: {
                SHOOT_SETTINGS: combineStats([g.basic, g.sniper, g.assassin]),
                TYPE: "bullet"
            }
        }
    ]
};
Class.streamliner = {
    PARENT: "genericTank",
    LABEL: "Streamliner",
    DANGER: 7,
    BODY: {
        FOV: base.FOV * 1.3
    },
    GUNS: weaponStack({
        POSITION: {
            LENGTH: 25,
            WIDTH: 8
        },
        PROPERTIES: {
            SHOOT_SETTINGS: combineStats([g.basic, g.minigun, g.streamliner]),
            TYPE: "bullet"
        }
    }, 5, {lengthOffset: 2, delayIncrement: 0.2})
};
Class.surfer = {
    PARENT: "genericTank",
    LABEL: "Surfer",
    BODY: {
        DENSITY: 0.6 * base.DENSITY
    },
    DANGER: 7,
    GUNS: [
        {
            POSITION: {
                LENGTH: 18,
                WIDTH: 8
            },
            PROPERTIES: {
                SHOOT_SETTINGS: combineStats([g.basic, g.flankGuard, g.triAngle, g.triAngleFront]),
                TYPE: "bullet",
                LABEL: "Front"
            }
        },
        ...weaponMirror([{
            POSITION: {
                LENGTH: 7,
                WIDTH: 7.5,
                ASPECT: 0.6,
                X: 7,
                Y: 1,
                ANGLE: -90
            },
            PROPERTIES: {
                SHOOT_SETTINGS: combineStats([g.swarm]),
                TYPE: "autoswarm",
                STAT_CALCULATOR: "swarm"
            }
        }]),
        ...weaponMirror({
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
        })
    ]
};
Class.surgeon = {
    PARENT: "genericHealer",
    LABEL: "Surgeon",
    STAT_NAMES: statnames.trap,
    GUNS: [
        {
            POSITION: {
                LENGTH: 5,
                WIDTH: 10,
                X: 9.5
            }
        },
        {
            POSITION: {
                LENGTH: 3,
                WIDTH: 13,
                X: 14.5
            }
        },
        {
            POSITION: {
                LENGTH: 1.5,
                WIDTH: 13,
                ASPECT: 1.3,
                X: 17
            },
            PROPERTIES: {
                MAX_CHILDREN: 2,
                SHOOT_SETTINGS: combineStats([g.trap, g.setTrap, {speed: 0.9, maxSpeed: 0.9, size: 1.1}]),
                TYPE: "medkit",
                NO_LIMITATIONS: true,
                SYNCS_SKILLS: true,
                STAT_CALCULATOR: "block"
            }
        },
        {
            POSITION: {
                LENGTH: 11,
                WIDTH: 13
            }
        }
    ]
};
Class.swarmer = {
    PARENT: "genericTank",
    LABEL: "Swarmer",
    DANGER: 7,
    BODY: Class.launcher.BODY,
    GUNS: [
        {
            POSITION: {
                LENGTH: 15,
                WIDTH: 13,
                ASPECT: -1.2,
                X: 5
            },
            PROPERTIES: {
                SHOOT_SETTINGS: combineStats([g.basic, g.pounder, g.destroyer, g.hive]),
                TYPE: "hive"
            }
        },
        {
            POSITION: {
                LENGTH: 15,
                WIDTH: 12,
                X: 5
            }
        }
    ]
};
Class.tripleTwin = makeFlank("twin", 3, "Triple Twin", { extraStats: [g.spam, g.doubleTwin, g.tripleTwin], danger: 7 });
Class.triplet = {
    PARENT: "genericTank",
    LABEL: "Triplet",
    DANGER: 7,
    GUNS: [
        ...weaponMirror({
            POSITION: {
                LENGTH: 17.5,
                WIDTH: 8,
                Y: 5.5,
                DELAY: 0.5
            },
            PROPERTIES: {
                SHOOT_SETTINGS: combineStats([g.basic, g.twin, g.triplet]),
                TYPE: "bullet"
            }
        }),
        {
            POSITION: {
                LENGTH: 21,
                WIDTH: 8
            },
            PROPERTIES: {
                SHOOT_SETTINGS: combineStats([g.basic, g.twin, g.triplet]),
                TYPE: "bullet"
            }
        }
    ]
};
Class.triplex = {
    PARENT: "genericTank",
    LABEL: "Triplex",
    DANGER: 7,
    STAT_NAMES: statnames.desmos,
    GUNS: [
        {
            POSITION: {
                LENGTH: 18,
                WIDTH: 7,
                ASPECT: -1.5
            },
            PROPERTIES: {
                SHOOT_SETTINGS: combineStats([g.basic, g.twin, g.tripleShot, {speed: 1.25, maxSpeed: 1.25}]),
                TYPE: "bullet"
            }
        },
        {
            POSITION: {
                LENGTH: 18,
                WIDTH: 7,
                ASPECT: -1.5,
                ANGLE: 45,
                DELAY: 0.5
            },
            PROPERTIES: {
                SHOOT_SETTINGS: combineStats([g.basic, g.twin, g.tripleShot, g.desmos]),
                TYPE: ["bullet", {CONTROLLERS: ["snake"]}]
            }
        },
        {
            POSITION: {
                LENGTH: 18,
                WIDTH: 7,
                ASPECT: -1.5,
                ANGLE: -45,
                DELAY: 0.5
            },
            PROPERTIES: {
                SHOOT_SETTINGS: combineStats([g.basic, g.twin, g.tripleShot, g.desmos]),
                TYPE: ["bullet", {CONTROLLERS: [["snake", {invert: true}]]}]
            }
        },
        ...weaponMirror([{
            POSITION: {
                LENGTH: 5,
                WIDTH: 5,
                ASPECT: -4,
                X: -4.75,
                Y: -5,
                ANGLE: 45
            }
        },
        {
            POSITION: {
                LENGTH: 15.5,
                WIDTH: 3,
                ASPECT: -4,
                ANGLE: 22.5
            }
        }], {delayIncrement: 0.5})
    ]
};
Class.twister = {
    PARENT: "genericTank",
    LABEL: "Twister",
    DANGER: 7,
    BODY: Class.launcher.BODY,
    TOOLTIP: "Hold right click to reverse missile rotation.",
    GUNS: [
        {
            POSITION: {
                LENGTH: 10,
                WIDTH: 13,
                ASPECT: -0.5,
                X: 9
            }
        },
        {
            POSITION: {
                LENGTH: 17,
                WIDTH: 14,
                ASPECT: -1.4
            },
            PROPERTIES: {
                SHOOT_SETTINGS: combineStats([g.basic, g.pounder, g.artillery, g.artillery, g.skimmer, {speed: 0.6, reload: 4/3, shudder: 0.1}]),
                TYPE: "spinmissile",
                STAT_CALCULATOR: "sustained+lowspeed"
            }
        }
    ]
};
Class.vulture = makeBird({
    PARENT: "genericTank",
    DANGER: 6,
    BODY: Class.minigun.BODY,
    GUNS: [
        {
            POSITION: {
                LENGTH: 22,
                WIDTH: 7,
                ASPECT: -1.5
            },
            PROPERTIES: {
                SHOOT_SETTINGS: combineStats([g.basic, g.minigun]),
                TYPE: "bullet"
            }
        },
        {
            POSITION: {
                LENGTH: 20,
                WIDTH: 7.5,
                ASPECT: -1.5,
                DELAY: 1/3
            },
            PROPERTIES: {
                SHOOT_SETTINGS: combineStats([g.basic, g.minigun, {size: 7/7.5}]),
                TYPE: "bullet"
            }
        },
        {
            POSITION: {
                LENGTH: 18,
                WIDTH: 8,
                ASPECT: -1.5,
                DELAY: 2/3
            },
            PROPERTIES: {
                SHOOT_SETTINGS: combineStats([g.basic, g.minigun, {size: 7/8}]),
                TYPE: "bullet"
            }
        }
    ]
}, "Vulture");
Class.xHunter = {
    PARENT: "genericTank",
    LABEL: "X-Hunter",
    DANGER: 7,
    BODY: Class.hunter.BODY,
    CONTROLLERS: [["zoom", {distance: 550}]],
    GUNS: [
        {
            POSITION: {
                LENGTH: 24,
                WIDTH: 8
            },
            PROPERTIES: {
                SHOOT_SETTINGS: combineStats([g.basic, g.sniper, g.hunter, g.hunterSecondary]),
                TYPE: "bullet"
            }
        },
        {
            POSITION: {
                LENGTH: 21,
                WIDTH: 11,
                DELAY: 0.25
            },
            PROPERTIES: {
                SHOOT_SETTINGS: combineStats([g.basic, g.sniper, g.hunter]),
                TYPE: "bullet"
            }
        },
        {
            POSITION: {
                LENGTH: 12.5,
                WIDTH: 11,
                ASPECT: -1.65
            }
        }
    ]
};

// Class Tree Modification
if (Config.teams == 1) {
    removeUpgrades("basic", 2, ["smasher"]);
    removeUpgrades("director", 2, ["underseer"]);

    Class.basic.UPGRADES_TIER_2.push("healer");
};
