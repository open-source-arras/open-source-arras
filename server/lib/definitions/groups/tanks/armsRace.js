const { combineStats, skillSet, addUpgrades, removeUpgrades, makeAuto, makeBattle, makeBird, makeCap, makeFlank, makeFore, makeGuard, makeOver, makeRadialAuto, makeSnake, makeGunner, makeWhirlwind, weaponArray, weaponMirror, weaponStack } = require("../../facilitators.js");
const { base, dfltskl, smshskl, statnames } = require("../../constants.js");
const g = require("../../gunvals.js");
const preset = require("../../presets.js");

// Set the below variable to true to disable the Level 60 requirement for Tier 4, like arras.io.
const free_tier_4 = true;

// Set the below variable to true to enable tanks that would otherwise be inaccessible in Arms Race.
// This will also enable the Better Arms Race addon if it is present.
const enable_missing_tanks = true;

// Tier 2 (Level 30)
Class.diesel = {
    PARENT: "genericTank",
    LABEL: "Diesel",
    DANGER: 6,
    GUNS: [
        {
            POSITION: {
                LENGTH: 14,
                WIDTH: 12,
                ASPECT: 1.6,
                X: 8
            },
            PROPERTIES: {
                SHOOT_SETTINGS: combineStats([g.basic, g.machineGun, g.diesel]),
                TYPE: "bullet"
            }
        }
    ],
    UPGRADES_TIER_3: ["jalopy", "machineGunner"/*, "dieselTrapper"*/, "polluter", "autoDiesel"],
    UPGRADES_TIER_4: [/*"foamer", "gizmo"*/]
};
Class.directordrive = {
    PARENT: "genericTank",
    LABEL: "Directordrive",
    DANGER: 6,
    STAT_NAMES: statnames.drone,
    BODY: Class.director.BODY,
    TURRETS: preset.turret.driveHat,
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
                TYPE: "autoDrone",
                AUTOFIRE: true,
                SYNCS_SKILLS: true,
                STAT_CALCULATOR: "drone",
                MAX_CHILDREN: 6,
                WAIT_TO_CYCLE: true
            }
        }
    ],
    UPGRADES_TIER_3: [/*"directorstorm", */"overdrive", "cruiserdrive", "underdrive", "spawnerdrive", "autoDirectordrive", "honchodrive"/*, "doperdrive"*/],
    UPGRADES_TIER_4: [/*"managerdrive"*/]
};
Class.honcho = {
    PARENT: "genericTank",
    LABEL: "Honcho",
    DANGER: 6,
    STAT_NAMES: statnames.drone,
    BODY: Class.director.BODY,
    GUNS: [
        {
            POSITION: {
                LENGTH: 11,
                WIDTH: 14,
                ASPECT: 1.3,
                X: 2
            },
            PROPERTIES: {
                SHOOT_SETTINGS: combineStats([g.drone, g.honcho]),
                TYPE: "drone",
                AUTOFIRE: true,
                SYNCS_SKILLS: true,
                STAT_CALCULATOR: "drone",
                MAX_CHILDREN: 3,
                WAIT_TO_CYCLE: true
            }
        }
    ],
    UPGRADES_TIER_3: ["foreman"/*, "baltimore", "foundry"*/, "bigCheese", "autoHoncho", "honchodrive"/*, "junkie"*/],
    UPGRADES_TIER_4: [/*"minister"*/]
};
Class.machineTrapper = {
    PARENT: "genericTank",
    LABEL: "Machine Trapper",
    DANGER: 6,
    STAT_NAMES: statnames.trap,
    GUNS: [
        {
            POSITION: {
                LENGTH: 15,
                WIDTH: 9,
                ASPECT: 1.4
            }
        },
        {
            POSITION: {
                LENGTH: 3,
                WIDTH: 13,
                ASPECT: 1.3,
                X: 15
            },
            PROPERTIES: {
                SHOOT_SETTINGS: combineStats([g.trapSpray, g.machineGun, { size: 2/3, spray: 5 }]),
                TYPE: "trap",
                STAT_CALCULATOR: "trap"
            }
        }
    ],
    UPGRADES_TIER_3: [/*"dieselTrapper", */"barricade", "equalizer"/*, "machineGuard", "encircler", "machineMech", "triMachine"*/, "expeller"/*, "autoMachineTrapper", "deviation"*/],
    UPGRADES_TIER_4: [/*"frother", "machineMegaTrapper"*/]
};
Class.mech = {
    PARENT: "genericTank",
    LABEL: "Mech",
    DANGER: 6,
    STAT_NAMES: statnames.trap,
    GUNS: [
        {
            POSITION: {
                LENGTH: 15,
                WIDTH: 8
            }
        },
        {
            POSITION: {
                LENGTH: 12,
                WIDTH: 11
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
                TYPE: "autoTrap",
                STAT_CALCULATOR: "trap"
            }
        }
    ],
    UPGRADES_TIER_3: ["engineer"/*, "triMech", "machineMech", "mechGuard", "operator"*/, "cog", "cobbler", "autoMech"],
    UPGRADES_TIER_4: [/*"propper", "technician"*/]
};
Class.pen = {
    PARENT: "genericTank",
    LABEL: "Pen",
    DANGER: 6,
    STAT_NAMES: statnames.trap,
    GUNS: [
        {
            POSITION: {
                LENGTH: 20,
                WIDTH: 8
            },
            PROPERTIES: {
                SHOOT_SETTINGS: combineStats([g.basic, g.pen]),
                TYPE: "bullet"
            }
        },
        {
            POSITION: {
                LENGTH: 4,
                WIDTH: 8,
                ASPECT: 1.7,
                X: 13
            },
            PROPERTIES: {
                SHOOT_SETTINGS: combineStats([g.trap]),
                TYPE: "trap",
                STAT_CALCULATOR: "trap"
            }
        }
    ],
    UPGRADES_TIER_3: [/*"stall", "triPen", "encircler", "incarcerator", "operator", "cockatiel", */"hutch", "interner", "autoPen"],
    UPGRADES_TIER_4: [/*"fortifier", "sty"*/]
};
Class.wark = {
    PARENT: "genericTank",
    LABEL: "Wark",
    STAT_NAMES: statnames.trap,
    DANGER: 6,
    GUNS: weaponMirror([
        {
            POSITION: {
                LENGTH: 15,
                WIDTH: 8,
                Y: 5.5,
                ANGLE: 5
            }
        },
        {
            POSITION: {
                LENGTH: 3.25,
                WIDTH: 8,
                ASPECT: 1.7,
                X: 14,
                Y: 5.5,
                ANGLE: 5
            },
            PROPERTIES: {
                SHOOT_SETTINGS: combineStats([g.trap, g.twin]),
                TYPE: "trap",
                STAT_CALCULATOR: "trap"
            }
        }
    ], {delayIncrement: 0.5}),
    UPGRADES_TIER_3: ["warkwark", "waarrk", "equalizer", "hexaTrapper", "hutch", "cog", "expeller", "bulwark", "coalesce", "autoWark"]
};

// Tier 3 (Level 45)
const autoTanksT3 = [
    "artillery",
    "assassin",
    "auto3",
    "builder",
    "cruiser",
    "destroyer",
    "diesel",
    "gunner",
    "hexaTank",
    "honcho",
    "hunter",
    "launcher",
    "mech",
    "minigun",
    "overseer",
    "pen",
    "rifle",
    "spawner",
    //"sprayer",
    "trapGuard",
    "triAngle",
    "tripleShot",
    "underseer",
    "wark"
];
for (let i = 0; i < autoTanksT3.length; i++) {
    let type = autoTanksT3[i];
    if (!Class[`auto${type.charAt(0).toUpperCase() + type.slice(1)}`]) Class[`auto${type.charAt(0).toUpperCase() + type.slice(1)}`] = makeAuto(type);
    Class[`megaAuto${type.charAt(0).toUpperCase() + type.slice(1)}`] = makeAuto(type, `Mega Auto-${Class[type].LABEL}`, preset.makeAuto.mega);
    Class[`tripleAuto${type.charAt(0).toUpperCase() + type.slice(1)}`] = makeAuto(type, `Triple Auto-${Class[type].LABEL}`, preset.makeAuto.triple);

    if (Config.arms_race) {
        Class[`auto${type.charAt(0).toUpperCase() + type.slice(1)}`].UPGRADES_TIER_4 = ["mega", "triple"].map(x => `${x}Auto${type.charAt(0).toUpperCase() + type.slice(1)}`);
    } else {
        Class[`auto${type.charAt(0).toUpperCase() + type.slice(1)}`].UPGRADES_TIER_4 = [];
    };
};

const hybridTanksT3 = [
    // Base Tank    //Director      //Cruiser           //Spawner       //Honcho            //Overseer  //Directordrive
    ["artillery",   "Force",        "Mixer",            "Generator",    "Energizer"],
    ["assassin",    "Hitman",       "Gunman",           "Formulator",   "Contractor"],
    ["builder",     "Fashioner",    "Stylist",          "Experimenter", "Methodist"],
    ["diesel",      "Polluter",     "Depraver",         "Tainter",      "Befouler"],
    ["destroyer",   "Hybrid",       "Synthesis",        "Enactor",      "Crossbreed"],
    ["hunter",      "Poacher",      "Plunderer",        "Maker",        "Nabber"],
    ["launcher",    "Heaver",       "Lobber",           "Duper",        "Emitter"],
    ["mech",        "Cobbler",      "Fuser",            "Automaton",    "Restorer"],
    ["minigun",     "Crop Duster",  "Trimmer",          "Shearer",      "Sweeper"],
    ["pen",         "Interner",     "Kettle",           "Ringer",       "Probationer"],
    ["tripleShot",  "Bent Hybrid",  "Bent Synthesis",   "Hatcher",      "Bent Crossbreed",  "Overshot"],
    ["rifle",       "Armsman",      "Partisan",         "Copier",       "Vendor"],
    ["wark",        "Coalesce",     "Affiliator",       "Converger",    "Commix",           undefined,  "Warkdrive"]
    // The last two are optional and will be filled out automatically so long as the Base Tank and Director are defined.
];
for (let i = 0; i < hybridTanksT3.length; i++) {
    let type = hybridTanksT3[i][0];
    function typeify(x) {
        return x.charAt(0).toLowerCase() + x.slice(1).replace(/[\s-]+/g, "");
    };

    let director      = hybridTanksT3[i][1];
    let cruiser       = hybridTanksT3[i][2];
    let spawner       = hybridTanksT3[i][3];
    let honcho        = hybridTanksT3[i][4];
    let overseer      = hybridTanksT3[i][5] ??= `Over${Class[type].LABEL.charAt(0).toLowerCase() + Class[type].LABEL.slice(1)}`;
    let directordrive = hybridTanksT3[i][6] ??= `${director}drive`;


    let typeDirector = typeify(director);
    let typeOverseer = typeify(overseer);
    let typeCruiser = typeify(cruiser);
    let typeSpawner = typeify(spawner);
    let typeHoncho = typeify(honcho);
    let typeDirectordrive = typeify(directordrive);

    if (!Class[typeDirector]) Class[typeDirector] = makeOver(type, director, preset.hybrid);
    Class[typeOverseer] = makeOver(type, overseer);
    Class[typeCruiser] = makeBattle(type, cruiser, preset.hybrid);
    Class[typeSpawner] = makeCap(type, spawner, preset.hybrid);
    Class[typeHoncho] = makeFore(type, honcho, preset.makeFore.hybrid);
    Class[typeDirectordrive] = makeOver(type, directordrive, { ...preset.hybrid, drive: true });

    if (Config.arms_race) {
        Class[typeDirector].UPGRADES_TIER_4 = [typeOverseer, typeCruiser, typeSpawner, typeDirectordrive, typeHoncho];
    } else {
        Class[typeDirector].UPGRADES_TIER_4 = [];
    };
};

Class.autoAuto3.UPGRADES_TIER_4.push(...["Auto5", "Mega3", "Auto4", "Banshee", "Sniper3", "Crowbar", "Combo"].map(x => `auto${x}`));
Class.autoDirectordrive = makeAuto("directordrive", "Auto-Directordrive", preset.makeAuto.drive);
Class.autoDirectordrive.UPGRADES_TIER_4 = [...["mega", "triple"].map(x => `${x}AutoDirectordrive`)];
Class.autoHexaTank.UPGRADES_TIER_4.push(...["OctoTank", "Cyclone", "DeathStar", "Mingler", "Combo"].map(x => `auto${x}`));
Class.bentGunner = {
    PARENT: "genericTank",
    LABEL: "Bent Gunner",
    DANGER: 7,
    GUNS: weaponMirror([
        {
            POSITION: {
                LENGTH: 10,
                WIDTH: 3.5,
                Y: 8.25,
                ANGLE: 18,
                DELAY: 2/3
            },
            PROPERTIES: {
                SHOOT_SETTINGS: combineStats([g.basic, g.twin, g.gunner, {speed: 1.2}]),
                TYPE: "bullet"
            }
        },
        {
            POSITION: {
                LENGTH: 14,
                WIDTH: 3.5,
                Y: 4.75,
                ANGLE: 18,
                DELAY: 1/3
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
    ], { delayIncrement: 1/6 })
};
Class.bentMinigun = {
    PARENT: "genericTank",
    LABEL: "Bent Minigun",
    DANGER: 7,
    BODY: Class.minigun.BODY,
    GUNS: [
        ...weaponMirror(weaponStack({
            POSITION: {
                LENGTH: 19,
                WIDTH: 8,
                X: -2,
                Y: 2,
                ANGLE: 16,
                DELAY: 0.25
            },
            PROPERTIES: {
                SHOOT_SETTINGS: combineStats([g.basic, g.minigun, g.tripleShot]),
                TYPE: "bullet"
            }
        }, 2, {lengthOffset: 2, delayIncrement: 0.5})),
        ...weaponStack({
            POSITION: {
                LENGTH: 21,
                WIDTH: 8
            },
            PROPERTIES: {
                SHOOT_SETTINGS: combineStats([g.basic, g.minigun, g.tripleShot]),
                TYPE: "bullet"
            }
        }, 3, {lengthOffset: 2, delayIncrement: 1/3})
    ]
};
Class.captain = {
    PARENT: "genericTank",
    LABEL: "Captain",
    DANGER: 7,
    STAT_NAMES: statnames.drone,
    BODY: Class.spawner.BODY,
    GUNS: weaponMirror([
        {
            POSITION: {
                LENGTH: 4.5,
                WIDTH: 10,
                X: 10.5,
                ANGLE: 90
            }
        },
        {
            POSITION: {
                LENGTH: 1,
                WIDTH: 12,
                X: 15,
                ANGLE: 90
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
                WIDTH: 12,
                ANGLE: 90
            }
        }
    ])
};
Class.cog = {
    PARENT: "genericTank",
    LABEL: "Cog",
    STAT_NAMES: statnames.trap,
    DANGER: 7,
    GUNS: weaponMirror([
        {
            POSITION: {
                LENGTH: 15,
                WIDTH: 8,
                Y: 4.45,
                ANGLE: 10
            }
        },
        {
            POSITION: {
                LENGTH: 12,
                WIDTH: 11,
                Y: 4.45,
                ANGLE: 10
            }
        },
        {
            POSITION: {
                LENGTH: 3,
                WIDTH: 8,
                ASPECT: 1.7,
                X: 15,
                Y: 4.45,
                ANGLE: 10
            },
            PROPERTIES: {
                SHOOT_SETTINGS: combineStats([g.trap, g.twin]),
                TYPE: "autoTrap",
                STAT_CALCULATOR: "trap"
            }
        }
    ], {delayIncrement: 0.5})
};
Class.combo = {
    PARENT: "genericTank",
    LABEL: "Combo",
    DANGER: 7,
    GUNS: weaponArray({
        POSITION: {
            LENGTH: 18,
            WIDTH: 8
        },
        PROPERTIES: {
            SHOOT_SETTINGS: combineStats([g.basic, g.flankGuard, g.flankGuard]),
            TYPE: "bullet"
        }
    }, 3),
    TURRETS: weaponArray({
        TYPE: ["autoTankGun", { INDEPENDENT: true }],
        POSITION: {
            SIZE: 11,
            X: 8,
            ANGLE: 180,
            ARC: 190
        }
    }, 3),
    UPGRADES_TIER_4: ["consolidation", "sequence", "trove", "alloy", "autoCombo", "band"]
};
Class.crowbar = {
    PARENT: "genericTank",
    LABEL: "Crowbar",
    DANGER: 7,
    BODY: {
        FOV: 1.25 * base.FOV
    },
    GUNS: [
        {
            POSITION: {
                LENGTH: 40,
                WIDTH: 7
            }
        },
        {
            POSITION: {
                LENGTH: 15,
                WIDTH: 9,
                ASPECT: -2
            }
        }
    ],
    TURRETS: [
        {
            TYPE: "crowbarTurretTank",
            POSITION: {
                SIZE: 6,
                X: 19.5,
                ARC: 180,
                LAYER: 1
            }
        },
        {
            TYPE: "crowbarTurretTank",
            POSITION: {
                SIZE: 6,
                X: 29.75,
                ARC: 180,
                LAYER: 1
            }
        },
        {
            TYPE: "crowbarTurretTank",
            POSITION: {
                SIZE: 6,
                X: 40,
                ARC: 180,
                LAYER: 1
            }
        }
    ],
    UPGRADES_TIER_4: [/*"pryer", "crank", "chisel", "lever", */"spindle", "autoCrowbar", "dualbar"/*, "spanner"*/, "wrench"]
};
Class.cruiserdrive = {
    PARENT: "genericTank",
    LABEL: "Cruiserdrive",
    DANGER: 7,
    FACING_TYPE: "locksFacing",
    STAT_NAMES: statnames.swarm,
    BODY: Class.cruiser.BODY,
    TURRETS: preset.turret.swarmdriveHat,
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
            TYPE: "autoSwarm",
            STAT_CALCULATOR: "swarm"
        }
    }, {delayIncrement: 0.5})
};
Class.defect = makeBird("tripleShot", "Defect");
Class.doubleFlankTwin = makeFlank({
    PARENT: "genericTank",
    DANGER: 6,
    GUNS: [
        {
            POSITION: {
                LENGTH: 20,
                WIDTH: 8,
                ANGLE: 90,
                DELAY: 0.5
            },
            PROPERTIES: {
                SHOOT_SETTINGS: combineStats([g.basic, g.twin]),
                TYPE: "bullet"
            }
        },
        ...weaponMirror({
            POSITION: {
                LENGTH: 20,
                WIDTH: 8,
                Y: 5.5
            },
            PROPERTIES: {
                SHOOT_SETTINGS: combineStats([g.basic, g.twin]),
                TYPE: "bullet"
            }
        }, {delayIncrement: 0.5})
    ]
}, 2, "Double Flank Twin", { extraStats: [g.doubleTwin] });
Class.doubleFlankTwin.UPGRADES_TIER_4 = ["quadTwin", "tripleFlankTwin", "hewnFlankDouble", "autoDoubleFlank", "bentFlankDouble", "doubleFlankGunner", "hipwatch", "scuffler", "warkwawawark"];
Class.doubleGunner = makeFlank("gunner", 2, "Double Gunner", { extraStats: [g.doubleTwin] });
Class.doubleGunner.UPGRADES_TIER_4 = ["tripleGunner", "hewnGunner", "autoDoubleGunner", "bentDoubleGunner", "doubleFlankGunner", "doubleNailgun", "doubleMachineGunner", "overdoubleGunner", "doubleBattery", "doubleRimfire", "doubleVolley", "doubleEqualizer"];
Class.equalizer = {
    PARENT: "genericTank",
    LABEL: "Equalizer",
    STAT_NAMES: statnames.trap,
    DANGER: 7,
    GUNS: weaponMirror([
        {
            POSITION: {
                LENGTH: 12,
                WIDTH: 3.5,
                Y: 7.25
            }
        },
        {
            POSITION: {
                LENGTH: 2,
                WIDTH: 3.5,
                ASPECT: 1.77,
                X: 12,
                Y: 7.25,
                DELAY: 0.5
            },
            PROPERTIES: {
                SHOOT_SETTINGS: combineStats([g.trap, g.twin, g.gunner, {speed: 1.2}]),
                TYPE: "trap",
                STAT_CALCULATOR: "trap"
            }
        },
        {
            POSITION: {
                LENGTH: 16,
                WIDTH: 3.5,
                Y: 3.75
            }
        },
        {
            POSITION: {
                LENGTH: 2,
                WIDTH: 3.5,
                ASPECT: 1.77,
                X: 16,
                Y: 3.75
            },
            PROPERTIES: {
                SHOOT_SETTINGS: combineStats([g.trap, g.twin, g.gunner, {speed: 1.2}]),
                TYPE: "trap",
                STAT_CALCULATOR: "trap"
            }
        }
    ], {delayIncrement: 0.25})
};
Class.expeller = {
    PARENT: "genericTank",
    LABEL: "Expeller",
    STAT_NAMES: statnames.trap,
    DANGER: 7,
    GUNS: weaponMirror([
        {
            POSITION: {
                LENGTH: 15,
                WIDTH: 8,
                ASPECT: 1.4,
                Y: 5.5,
                ANGLE: 5
            }
        },
        {
            POSITION: {
                LENGTH: 3.25,
                WIDTH: 11,
                ASPECT: 1.3,
                X: 14,
                Y: 5.5,
                ANGLE: 5
            },
            PROPERTIES: {
                SHOOT_SETTINGS: combineStats([g.trapSpray, g.machineGun, { size: 2/3, spray: 5 }]),
                TYPE: "trap",
                STAT_CALCULATOR: "trap"
            }
        }
    ], {delayIncrement: 0.5})
};
Class.foreman = {
    PARENT: "genericTank",
    LABEL: "Foreman",
    DANGER: 7,
    STAT_NAMES: statnames.drone,
    BODY: {
        FOV: 1.1 * base.FOV,
        SPEED: 14/15 * base.SPEED
    },
    MAX_CHILDREN: 5,
    GUNS: weaponMirror({
        POSITION: {
            LENGTH: 12,
            WIDTH: 15,
            ASPECT: 1.3,
            X: 2,
            ANGLE: 90
        },
        PROPERTIES: {
            SHOOT_SETTINGS: combineStats([g.drone, g.honcho, { size: 0.95 }]),
            TYPE: "drone",
            AUTOFIRE: true,
            SYNCS_SKILLS: true,
            STAT_CALCULATOR: "drone",
            WAIT_TO_CYCLE: true
        }
    })
};
Class.honchodrive = {
    PARENT: "genericTank",
    LABEL: "Honchodrive",
    DANGER: 7,
    STAT_NAMES: statnames.drone,
    BODY: Class.honcho.BODY,
    TURRETS: preset.turret.driveHat,
    GUNS: [
        {
            POSITION: {
                LENGTH: 11,
                WIDTH: 14,
                ASPECT: 1.3,
                X: 2
            },
            PROPERTIES: {
                SHOOT_SETTINGS: combineStats([g.drone, g.honcho]),
                TYPE: "autoDrone",
                AUTOFIRE: true,
                SYNCS_SKILLS: true,
                STAT_CALCULATOR: "drone",
                MAX_CHILDREN: 3,
                WAIT_TO_CYCLE: true
            }
        }
    ]
};
Class.hutch = {
    PARENT: "genericTank",
    LABEL: "Hutch",
    STAT_NAMES: statnames.trap,
    DANGER: 6,
    GUNS: weaponMirror([
        {
            POSITION: {
                LENGTH: 20.25,
                WIDTH: 8,
                Y: 5.5,
                ANGLE: 5
            },
            PROPERTIES: {
                SHOOT_SETTINGS: combineStats([g.basic, g.pen]),
                TYPE: "bullet"
            }
        },
        {
            POSITION: {
                LENGTH: 3.25,
                WIDTH: 8,
                ASPECT: 1.7,
                X: 14,
                Y: 5.5,
                ANGLE: 5
            },
            PROPERTIES: {
                SHOOT_SETTINGS: combineStats([g.trap, g.twin]),
                TYPE: "trap",
                STAT_CALCULATOR: "trap"
            }
        }
    ], {delayIncrement: 0.5})
};
Class.integrator = makeOver("triAngle", "Integrator", { ...preset.hybrid, renderBehind: true });
Class.iterator = {
    PARENT: "genericTank",
    LABEL: "Iterator",
    DANGER: 7,
    STAT_NAMES: statnames.desmos,
    UPGRADE_TOOLTIP: "[DEV NOTE] This tank does not function as intended yet!",
    GUNS: [
        {
            POSITION: [22, 8, -4/3, 0, 0, 0, 0],
            PROPERTIES: {
                SHOOT_SETTINGS: combineStats([g.basic, g.desmos]),
                TYPE: ["superSplitterBullet", {CONTROLLERS: ["snake"]}] // nerf supersplitter when
            }
        },
        ...weaponMirror([{
            POSITION: [4.625, 10.5, 2.75, 0.375, 7, -91.5, 0]
        },
        {
            POSITION: [4, 9, 3, 1.5, 5, -95, 0]
        },
        {
            POSITION: [3.75, 10, 2.125, -1.5, 5.25, -50, 0]
        }])
    ]
};
Class.jalopy = {
    PARENT: "genericTank",
    LABEL: "Jalopy",
    DANGER: 7,
    GUNS: [
        {
            POSITION: {
                LENGTH: 18,
                WIDTH: 12,
                ASPECT: 1.8,
                X: 6
            },
            PROPERTIES: {
                SHOOT_SETTINGS: combineStats([g.basic, g.machineGun, g.diesel, { reload: 1/3, recoil: 0.5, spray: 5/3 }]),
                TYPE: "bullet"
            }
        }
    ],
    UPGRADES_TIER_4: [/*"lorry", */"contaminator"/*, "jalopyTrapper"*/, "autoJalopy"/*, "clunker"*/]
};
Class.megaSpawner = {
    PARENT: "genericTank",
    LABEL: "Mega-Spawner",
    DANGER: 7,
    STAT_NAMES: statnames.drone,
    BODY: Class.spawner.BODY,
    GUNS: [
        {
            POSITION: {
                LENGTH: 15,
                WIDTH: 13
            }
        },
        {
            POSITION: {
                LENGTH: 11.5,
                WIDTH: 15
            }
        },
        {
            POSITION: {
                LENGTH: 1,
                WIDTH: 15,
                X: 15
            },
            PROPERTIES: {
                MAX_CHILDREN: 4,
                SHOOT_SETTINGS: combineStats([g.minion, g.spawner, {size: 0.8 }]),
                TYPE: "megaMinion",
                STAT_CALCULATOR: "drone",
                AUTOFIRE: true,
                SYNCS_SKILLS: true
            }
        }
    ]
};
Class.megaTrapper = {
    PARENT: "genericTank",
    LABEL: "Mega Trapper",
    DANGER: 7,
    STAT_NAMES: statnames.trap,
    GUNS: [
        {
            POSITION: {
                LENGTH: 14,
                WIDTH: 12
            }
        },
        {
            POSITION: {
                LENGTH: 5,
                WIDTH: 12,
                ASPECT: 1.7,
                X: 13
            },
            PROPERTIES: {
                SHOOT_SETTINGS: combineStats([g.trap, g.megaTrap]),
                TYPE: "trap",
                STAT_CALCULATOR: "trap"
            }
        }
    ]
};
Class.mingler = {
    PARENT: "genericTank",
    LABEL: "Mingler",
    DANGER: 7,
    GUNS: weaponArray([
        {
            POSITION: {
                LENGTH: 15,
                WIDTH: 3.5,
                ANGLE: 30,
                DELAY: 0.25
            },
            PROPERTIES: {
                SHOOT_SETTINGS: combineStats([g.basic, g.twin, g.gunner, g.cyclone]),
                TYPE: "bullet"
            }
        },
        {
            POSITION: {
                LENGTH: 18,
                WIDTH: 8
            },
            PROPERTIES: {
                SHOOT_SETTINGS: combineStats([g.basic, g.flankGuard, g.flankGuard]),
                TYPE: "bullet"
            }
        }
    ], 6, {delayIncrement: 0.5}),
    UPGRADES_TIER_4: ["unity", "alloy", "gale", "cozen", "autoMingler"]
};
Class.peashooter = makeGuard({
    PARENT: "genericTank",
    GUNS: [
        {
            POSITION: {
                LENGTH: 20,
                WIDTH: 8
            },
            PROPERTIES: {
                SHOOT_SETTINGS: combineStats([g.basic, g.flankGuard, g.flankGuard]),
                TYPE: "bullet"
            }
        },
        {
            POSITION: {
                LENGTH: 7.5,
                WIDTH: 7.5,
                ASPECT: 0.6,
                X: 7,
                DELAY: 0.5
            },
            PROPERTIES: {
                SHOOT_SETTINGS: combineStats([g.swarm]),
                TYPE: "swarm",
                STAT_CALCULATOR: "swarm"
            }
        }
    ]
}, "Peashooter");
Class.productionist = {
    PARENT: "genericTank",
    LABEL: "Productionist",
    DANGER: 7,
    STAT_NAMES: statnames.swarm,
    BODY: {
        SPEED: base.SPEED * 12/15,
        FOV: base.FOV * 1.1
    },
    GUNS: weaponMirror([
        {
            POSITION: {
                LENGTH: 14.5,
                WIDTH: 6,
                Y: 5.2
            }
        },
        {
            POSITION: {
                LENGTH: 11,
                WIDTH: 8,
                ASPECT: -1.2,
                Y: 5.2
            }
        },
        {
            POSITION: {
                LENGTH: 1,
                WIDTH: 8,
                X: 14.5,
                Y: 5.2
            },
            PROPERTIES: {
                SHOOT_SETTINGS: combineStats([g.minion, g.productionist]),
                TYPE: "tinyMinion",
                STAT_CALCULATOR: "drone",
                SYNCS_SKILLS: true
            }
        }
    ], {delayIncrement: 0.5})
};
Class.quadAngle = {
    PARENT: "genericTank",
    LABEL: "Quad-Angle",
    DANGER: 7,
    BODY: Class.triAngle.BODY,
    TURRETS: [
        {
            POSITION: {
                SIZE: 9,
                X: 8,
                ANGLE: 45,
                ARC: 190
            },
            TYPE: "autoTankGun",
        },
        {
            POSITION: {
                SIZE: 9,
                X: 8,
                ANGLE: -45,
                ARC: 190
            },
            TYPE: "autoTankGun",
        }
    ],
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
            LABEL: "thruster"
        }
    }),
    UPGRADES_TIER_4: ["scrimmer", /*"aspirer", "fleeter", */"autoQuadAngle"/*, "glider", "conformer", "spoiler", "mandible", "waster"*/]
};
Class.railgun = {
    PARENT: "genericTank",
    LABEL: "Railgun",
    DANGER: 7,
    BODY: {
        SPEED: base.SPEED * 12/15,
        FOV: base.FOV * 1.2625
    },
    GUNS: [
        {
            POSITION: {
                LENGTH: 20,
                WIDTH: 7.95
            }
        },
        {
            POSITION: {
                LENGTH: 24,
                WIDTH: 5
            },
            PROPERTIES: {
                SHOOT_SETTINGS: combineStats([g.basic, g.sniper, g.railgun]),
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
    ],
    UPGRADES_TIER_4: []
};
Class.rimfire = {
    PARENT: "genericTank",
    LABEL: "Rimfire",
    DANGER: 7,
    BODY: {
        FOV: base.FOV * 1.1
    },
    GUNS: [
        ...weaponMirror([{
            POSITION: {
                LENGTH: 12,
                WIDTH: 7,
                Y: 5,
                DELAY: 0.25
            },
            PROPERTIES: {
                SHOOT_SETTINGS: combineStats([g.basic, g.twin, g.gunner, {speed: 1.2, size: 2/3}]),
                TYPE: "bullet"
            }
        },
        {
            POSITION: {
                LENGTH: 18,
                WIDTH: 2,
                X: 2,
                Y: -2.5
            },
            PROPERTIES: {
                SHOOT_SETTINGS: combineStats([g.basic, g.pelleter, g.power, g.twin, { speed: 0.7, maxSpeed: 0.7 }, g.flankGuard, { recoil: 1.8 }]),
                TYPE: "bullet"
            }
        }], {delayIncrement: 0.5}),
        {
            POSITION: {
                LENGTH: 12,
                WIDTH: 10,
                X: 2
            }
        }
    ]
};
Class.rocketeer = {
    PARENT: "genericTank",
    LABEL: "Rocketeer",
    DANGER: 7,
    BODY: Class.launcher.BODY,
    GUNS: [
        {
            POSITION: {
                LENGTH: 19,
                WIDTH: 7.73,
                ASPECT: 1.5
            },
            PROPERTIES: {
                SHOOT_SETTINGS: combineStats([g.basic, g.pounder, g.launcher, g.rocketeer]),
                TYPE: "rocketeerMissile",
                STAT_CALCULATOR: "sustained"
            }
        },
        {
            POSITION: {
                LENGTH: 16,
                WIDTH: 11,
                ASPECT: -1.5
            }
        }
    ]
};
Class.sniper3 = makeRadialAuto("sniper3gun", { isTurret: true, danger: 7, size: 13, label: "Sniper-3", body: { SPEED: 11/15 * base.SPEED, FOV: 1.25 * base.FOV } });
Class.sniper3.UPGRADES_TIER_4 = [/*"assassin3", "creeper", "sniper5", "phantom", "lever", */"autoSniper3", "alloy"/*, "rifle3", "hunter3"*/];
Class.spawnerdrive = {
    PARENT: "genericTank",
    LABEL: "Spawnerdrive",
    DANGER: 7,
    STAT_NAMES: statnames.drone,
    BODY: Class.spawner.BODY,
    TURRETS: preset.turret.driveHat,
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
                TYPE: "autoMinion",
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
    ]
};
Class.splitShot = {
    PARENT: "genericTank",
    LABEL: "Split Shot",
    DANGER: 7,
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
        ...weaponMirror({
            POSITION: {
                LENGTH: 20,
                WIDTH: 3.5,
                Y: 0.5,
                ANGLE: 15,
                DELAY: 1/3
            },
            PROPERTIES: {
                SHOOT_SETTINGS: combineStats([g.basic, g.twin, g.tripleShot, { size: 4/3 }]),
                TYPE: "bullet"
            }
        }, { delayIncrement: 1/3 }),
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
Class.triHealer = makeFlank("healer", 3, "Tri-Healer", { extraStats: [g.flankGuard] });
Class.triHealer.UPGRADES_TIER_4 = ["hexaHealer"];
Class.underdrive = {
    PARENT: "genericTank",
    LABEL: "Underdrive",
    DANGER: 7,
    NECRO: [4],
    STAT_NAMES: statnames.drone,
    SHAPE: 4,
    MAX_CHILDREN: 15,
    TURRETS: preset.turret.driveHat,
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
            TYPE: "autoSunchip",
            AUTOFIRE: true,
            SYNCS_SKILLS: true,
            STAT_CALCULATOR: "necro",
            WAIT_TO_CYCLE: true,
            DELAY_SPAWN: false
        }
    }, 2)
};
Class.volley = {
    PARENT: "genericTank",
    LABEL: "Volley",
    DANGER: 7,
    GUNS: weaponMirror([
        {
            POSITION: {
                LENGTH: 12,
                WIDTH: 5,
                Y: 7.25,
                DELAY: 0.5
            },
            PROPERTIES: {
                SHOOT_SETTINGS: combineStats([g.basic, g.pounder, g.twin, g.gunner, {speed: 1.2}]),
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
                SHOOT_SETTINGS: combineStats([g.basic, g.pounder, g.twin, g.gunner, {speed: 1.2}]),
                TYPE: "bullet"
            }
        }
    ], {delayIncrement: 0.25})
};
Class.waarrk = {
    PARENT: "genericTank",
    LABEL: "Waarrk",
    DANGER: 6,
    STAT_NAMES: statnames.trap,
    GUNS: [
        ...weaponMirror([
            {
                POSITION: {
                    LENGTH: 16,
                    WIDTH: 8,
                    Y: 2,
                    ANGLE: 18
                }
            },
            {
                POSITION: {
                    LENGTH: 3.25,
                    WIDTH: 8,
                    ASPECT: 1.7,
                    X: 15,
                    Y: 2,
                    ANGLE: 18,
                    DELAY: 0.5
                },
                PROPERTIES: {
                    SHOOT_SETTINGS: combineStats([g.trap, g.twin, g.tripleShot]),
                    TYPE: "trap",
                    STAT_CALCULATOR: "trap"
                }
            }
        ]),
        {
            POSITION: {
                LENGTH: 18,
                WIDTH: 8
            }
        },
        {
            POSITION: {
                LENGTH: 3.25,
                WIDTH: 8,
                ASPECT: 1.7,
                X: 17
            },
            PROPERTIES: {
                SHOOT_SETTINGS: combineStats([g.trap, g.twin, g.tripleShot]),
                TYPE: "trap",
                STAT_CALCULATOR: "trap"
            }
        }
    ]
};
Class.warkwark = makeFlank("wark", 2, "Warkwark", { extraStats: [g.doubleTwin] });
Class.warkwark.UPGRADES_TIER_4 = ["warkwarkwark", "warkwawarkrk", "autoWarkwark", "waarrkwaarrk", "warkwawawark", "doubleEqualizer", "guardrail", "sealer", "setup"];

// Tier 4 (Level 60)
const autoTanksT4 = [
    "auto4",
    "auto5",
    "banshee",
    "bentDouble",
    "bentHybrid",
    "bulwark",
    "bushwhacker",
    "buttbuttin",
    "combo",
    "crowbar",
    "cyclone",
    "deathStar",
    "doubleGunner",
    "dual",
    "falcon",
    "fighter",
    "hewnDouble",
    "jalopy",
    "mega3",
    "mingler",
    "musket",
    "octoTank",
    "quadAngle",
    "single",
    "sniper3",
    "sprayer",
    "stalker",
    "streamliner",
    "warkwark"
];
for (let i = 0; i < autoTanksT4.length; i++) {
    let type = autoTanksT4[i];
    Class[`auto${type.charAt(0).toUpperCase() + type.slice(1)}`] = makeAuto(type);
};

const doubleTanksT4 = [
    "battery",
    "dual",
    "equalizer",
    "machineGunner",
    "musket",
    "nailgun",
    "rimfire",
    "triplet",
    "volley"
];
for (let i = 0; i < doubleTanksT4.length; i++) {
    let type = doubleTanksT4[i];
    Class[`double${type.charAt(0).toUpperCase() + type.slice(1)}`] = makeFlank(type, 2, `Double ${Class[type].LABEL}`, { extraStats: [g.doubleTwin] });
};

const hybridTanksT4 = [
    // Base Tank    //Director
    ["buttbuttin",  "Mercenary"],
    ["crowbar",     "Spindle"],
    ["dual",        "Ravisher"],
    ["jalopy",      "Contaminator"],
    ["musket",      "Matchlock"],
    ["pentaShot",   "Flexed Hybrid"],
    ["single",      "Assistant"],
    ["sprayer",     "Shower"],
    ["spreadshot",  "Smearer"],
    ["triplet",     "Triprid"]
];
for (let i = 0; i < hybridTanksT4.length; i++) {
    let type = hybridTanksT4[i][0];

    let director = hybridTanksT4[i][1];

    function typeify(x) {
        return x.charAt(0).toLowerCase() + x.slice(1).replace(/[\s-]+/g, "");
    };
    let typeDirector = typeify(director);

    Class[typeDirector] = makeOver(type, director, preset.hybrid);
};

Class.actuary = {
    PARENT: "genericHealer",
    LABEL: "Actuary",
    BODY: Class.minigun.BODY,
    GUNS: weaponStack([
        {
            POSITION: {
                LENGTH: 18,
                WIDTH: 7,
                ASPECT: -0.4,
                X: 9.5,
            }
        },
        {
            POSITION: {
                LENGTH: 21,
                WIDTH: 8
            },
            PROPERTIES: {
                SHOOT_SETTINGS: combineStats([g.basic, g.healer, g.minigun]),
                TYPE: "healerBullet"
            }
        }
    ], 3, { lengthOffset: 2, delayIncrement: 1/3 })
};
Class.alloy = {
    PARENT: "genericTank",
    LABEL: "Alloy",
    DANGER: 8,
    GUNS: weaponArray([
        {
            POSITION: {
                LENGTH: 7,
                WIDTH: 3.5,
                X: 8,
                ANGLE: 25,
                DELAY: 1/3
            },
            PROPERTIES: {
                SHOOT_SETTINGS: combineStats([g.basic, g.twin, g.gunner, g.cyclone]),
                TYPE: "bullet"
            }
        },
        {
            POSITION: {
                LENGTH: 7,
                WIDTH: 3.5,
                X: 8,
                ANGLE: -25,
                DELAY: 2/3
            },
            PROPERTIES: {
                SHOOT_SETTINGS: combineStats([g.basic, g.twin, g.gunner, g.cyclone]),
                TYPE: "bullet"
            }
        },
        {
            POSITION: {
                LENGTH: 18,
                WIDTH: 8
            },
            PROPERTIES: {
                SHOOT_SETTINGS: combineStats([g.basic, g.flankGuard, g.flankGuard]),
                TYPE: "bullet"
            }
        }
    ], 3),
    TURRETS: weaponArray({
        TYPE: ["sniper3gun", { INDEPENDENT: true }],
        POSITION: {
            SIZE: 13,
            X: 8,
            ANGLE: 180,
            ARC: 190
        }
    }, 3)
};
Class.autoDoubleFlank = makeAuto("doubleFlankTwin", "Auto-Double Flank");
Class.autoHexaTrapper = makeAuto(makeFlank("trapper", 6, "", { extraStats: [g.hexaTrapper], delayIncrement: 0.5, danger: 7 }), "Auto-Hexa-Trapper", preset.makeAuto.triple);
Class.autoTriple = makeAuto("tripleTwin", "Auto-Triple");
Class.avian = makeBird("single", "Avian");
Class.band = makeAuto({
    PARENT: "genericTank",
    DANGER: 7,
    STAT_NAMES: statnames.mixed,
    GUNS: weaponArray([
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
        }
    ], 3),
    TURRETS: weaponArray({
        TYPE: ["autoTankGun", { INDEPENDENT: true }],
        POSITION: {
            SIZE: 11,
            X: 8,
            ANGLE: 180,
            ARC: 190
        }
    }, 3)
}, "Band");
Class.battletrapper = makeBattle({
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
Class.bentDoubleGunner = makeFlank({
    PARENT: "genericTank",
    DANGER: 7,
    GUNS: weaponMirror([
        {
            POSITION: {
                LENGTH: 12,
                WIDTH: 3.5,
                Y: 8.25,
                ANGLE: 18,
                DELAY: 2/3
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
                Y: 4.75,
                ANGLE: 18,
                DELAY: 1/3
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
    ], { delayIncrement: 1/6 })
}, 2, "Bent Double Gunner", { extraStats: [g.doubleTwin] });
Class.bentDoubleMinigun = makeFlank("bentMinigun", 2, "Bent Double Minigun", { extraStats: [g.doubleTwin] });
Class.bentDoubleMinigun.BODY = { ...Class.bentMinigun.BODY, SPEED: base.SPEED * 14/15 };
Class.bentFlankDouble = makeFlank({
    PARENT: "genericTank",
    DANGER: 7,
    GUNS: [
        {
            POSITION: {
                LENGTH: 20,
                WIDTH: 8,
                ANGLE: 90,
                DELAY: 0.5
            },
            PROPERTIES: {
                SHOOT_SETTINGS: combineStats([g.basic, g.twin, g.tripleShot]),
                TYPE: "bullet"
            }
        },
        ...Class.tripleShot.GUNS
    ]
}, 2, "Bent Flank Double", { extraStats: [g.doubleTwin] });
Class.bentTriple = makeFlank("tripleShot", 3, "Bent Triple", { extraStats: [g.spam, g.doubleTwin, g.tripleTwin], danger: 8 });
Class.bruiser = {
    PARENT: "genericTank",
    LABEL: "Bruiser",
    DANGER: 8,
    GUNS: [
        {
            POSITION: {
                LENGTH: 21.5,
                WIDTH: 12
            },
            PROPERTIES: {
                SHOOT_SETTINGS: combineStats([g.basic, g.pounder, g.single]),
                TYPE: "bullet"
            }
        },
        {
            POSITION: {
                LENGTH: 12,
                WIDTH: 12,
                ASPECT: -1.6
            }
        }
    ]
};
Class.captrapper = makeCap({
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
Class.cleft = makeFlank({
    PARENT: "genericTank",
    DANGER: 7,
    GUNS: weaponMirror([
        {
            POSITION: {
                LENGTH: 19,
                WIDTH: 8,
                Y: -5.5,
                ANGLE: -25
            },
            PROPERTIES: {
                SHOOT_SETTINGS: combineStats([g.basic, g.twin, g.twin, g.doubleTwin, g.hewnDouble, { recoil: 1.15 }]),
                TYPE: "bullet"
            }
        },
        {
            POSITION: {
                LENGTH: 20,
                WIDTH: 8,
                Y: 5.5
            },
            PROPERTIES: {
                SHOOT_SETTINGS: combineStats([g.basic, g.twin, g.doubleTwin, g.hewnDouble]),
                TYPE: "bullet"
            }
        }
    ], {delayIncrement: 0.5})
}, 2, "Cleft", { extraStats: [g.doubleTwin] });
Class.cleft_old = {
    PARENT: "genericTank",
    LABEL: "Cleft",
    DANGER: 8,
    GUNS: [
        ...weaponMirror([
            {
                POSITION: {
                    LENGTH: 19,
                    WIDTH: 8,
                    Y: -5.5,
                    ANGLE: 155
                },
                PROPERTIES: {
                    SHOOT_SETTINGS: combineStats([g.basic, g.twin, g.twin, g.tripleShot, g.doubleTwin, g.hewnDouble, { recoil: 1.15 }]),
                    TYPE: "bullet"
                }
            },
            {
                POSITION: {
                    LENGTH: 20,
                    WIDTH: 8,
                    Y: 5.5,
                    ANGLE: 180
                },
                PROPERTIES: {
                    SHOOT_SETTINGS: combineStats([g.basic, g.twin, g.tripleShot, g.doubleTwin, g.hewnDouble]),
                    TYPE: "bullet"
                }
            }
        ], {delayIncrement: 0.5}),
        ...weaponMirror({
            POSITION: {
                LENGTH: 19,
                WIDTH: 8,
                Y: 2,
                ANGLE: 18,
                DELAY: 0.5
            },
            PROPERTIES: {
                SHOOT_SETTINGS: combineStats([g.basic, g.twin, g.tripleShot, g.doubleTwin, g.hewnDouble]),
                TYPE: "bullet"
            }
        }),
        {
            POSITION: {
                LENGTH: 22,
                WIDTH: 8
            },
            PROPERTIES: {
                SHOOT_SETTINGS: combineStats([g.basic, g.twin, g.tripleShot, g.doubleTwin, g.hewnDouble]),
                TYPE: "bullet"
            }
        }
    ]
};
Class.coordinator = {
    PARENT: "genericTank",
    LABEL: "Coordinator",
    STAT_NAMES: statnames.drone,
    BODY: Class.director.BODY,
    GUNS: [
        {
            POSITION: {
                LENGTH: 7,
                WIDTH: 12,
                ASPECT: 1.2,
                X: 8
            },
            PROPERTIES: {
                SHOOT_SETTINGS: combineStats([g.drone, g.single]),
                TYPE: "drone",
                AUTOFIRE: true,
                SYNCS_SKILLS: true,
                STAT_CALCULATOR: "drone",
                MAX_CHILDREN: 6,
                WAIT_TO_CYCLE: true
            }
        },
        {
            POSITION: {
                LENGTH: 12,
                WIDTH: 13.5,
                ASPECT: -1.45
            }
        }
    ]
};
Class.consolidation = {
    PARENT: "genericTank",
    LABEL: "Consolidation",
    DANGER: 8,
    GUNS: weaponArray({
        POSITION: {
            LENGTH: 18,
            WIDTH: 8
        },
        PROPERTIES: {
            SHOOT_SETTINGS: combineStats([g.basic, g.flankGuard, g.flankGuard, g.spam]),
            TYPE: "bullet"
        }
    }, 4),
    TURRETS: weaponArray({
        TYPE: ["autoTankGun", { INDEPENDENT: true }],
        POSITION: {
            SIZE: 11,
            X: 8,
            ANGLE: 45,
            ARC: 190
        }
    }, 4)
};
Class.coop = makeAuto({
    PARENT: "genericTank",
    LABEL: "Pen",
    DANGER: 7,
    STAT_NAMES: statnames.trap,
    GUNS: weaponArray([
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
                ANGLE: 180,
                DELAY: 0.5
            },
            PROPERTIES: {
                SHOOT_SETTINGS: combineStats([g.trap, g.hexaTrapper]),
                TYPE: "trap",
                STAT_CALCULATOR: "trap"
            }
        },
        {
            POSITION: {
                LENGTH: 20,
                WIDTH: 8
            },
            PROPERTIES: {
                SHOOT_SETTINGS: combineStats([g.basic, g.flankGuard]),
                TYPE: "bullet"
            }
        },
        {
            POSITION: {
                LENGTH: 4,
                WIDTH: 8,
                ASPECT: 1.7,
                X: 13
            },
            PROPERTIES: {
                SHOOT_SETTINGS: combineStats([g.trap, g.hexaTrapper]),
                TYPE: "trap",
                STAT_CALCULATOR: "trap"
            }
        }
    ], 3)
}, "Coop");
Class.cozen = makeAuto(makeFlank({
    PARENT: "genericTank",
    STAT_NAMES: statnames.mixed,
    GUNS: [
        {
            POSITION: {
                LENGTH: 5,
                WIDTH: 5,
                X: 8,
                ANGLE: 30
            },
            PROPERTIES: {
                SHOOT_SETTINGS: combineStats([g.basic, g.twin, g.gunner, g.cyclone, { size: 0.65 }]),
                TYPE: "bullet"
            }
        },
        ...Class.trapper.GUNS
    ]
}, 6, "", { extraStats: [g.hexaTrapper], delayIncrement: 0.5, danger: 7 }), "Cozen");
Class.custodian = makeGuard("single", "Custodian");
Class.dam = {
    PARENT: "genericTank",
    LABEL: "Dam",
    STAT_NAMES: statnames.mixed,
    DANGER: 8,
    GUNS: [
        ...weaponMirror([
            {
                POSITION: {
                    LENGTH: 12,
                    WIDTH: 3.5,
                    Y: 7.25,
                    DELAY: 0.5
                },
                PROPERTIES: {
                    SHOOT_SETTINGS: combineStats([g.basic, g.flankGuard, g.flankGuard, g.twin, g.gunner, {speed: 1.2}]),
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
                    SHOOT_SETTINGS: combineStats([g.basic, g.flankGuard, g.flankGuard, g.twin, g.gunner, {speed: 1.2}]),
                    TYPE: "bullet"
                }
            }
        ], {delayIncrement: 0.25}),
        ...weaponMirror([
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
    ]
};
Class.decaTank = {
    PARENT: "genericTank",
    LABEL: "Deca Tank",
    DANGER: 8,
    GUNS: weaponArray([
    // Must be kept like this to preserve visual layering
        {
            POSITION: {
                LENGTH: 18,
                WIDTH: 8,
                ANGLE: 36,
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
    ], 5)
};
Class.demise = {
    PARENT: "genericTank",
    LABEL: "Demise",
    DANGER: 8,
    GUNS: weaponArray([
        {
            POSITION: {
                LENGTH: 20.5,
                WIDTH: 12,
                ANGLE: 45,
                DELAY: 0.5
            },
            PROPERTIES: {
                SHOOT_SETTINGS: combineStats([g.basic, g.pounder, g.flankGuard, g.flankGuard, g.spam]),
                TYPE: "bullet"
            }
        },
        {
            POSITION: {
                LENGTH: 20.5,
                WIDTH: 12
            },
            PROPERTIES: {
                SHOOT_SETTINGS: combineStats([g.basic, g.pounder, g.flankGuard, g.flankGuard, g.spam]),
                TYPE: "bullet"
            }
        }
    ], 4)
};
Class.designer = makeAuto({
    // Must be defined manually to preserve visual layering
    PARENT: "genericTank",
    DANGER: 8,
    FACING_TYPE: ["spin", { speed: 0.02 }],
    BODY: {
        FOV: base.FOV * 1.15,
        SPEED: base.SPEED * 1.125 // 4.7X
    },
    TURRETS: weaponArray([
        {
            TYPE: "architectGun",
            POSITION: {
                SIZE: 12,
                X: 8,
                ANGLE: 180,
                ARC: 190
            }
        },
        {
            TYPE: "architectGun",
            POSITION: {
                SIZE: 12,
                X: 8,
                ARC: 190
            }
        }
    ], 3)
}, "Designer");
Class.doctor = {
    PARENT: "genericHealer",
    LABEL: "Doctor",
    STAT_NAMES: statnames.drone,
    UPGRADE_TOOLTIP: "[DEV NOTE] This tank is a placeholder!",
    GUNS: [
        {
            POSITION: {
                LENGTH: 13,
                WIDTH: 14,
                ASPECT: 1.3,
                X: 2
            }
        }
    ]
};
Class.doubleFlankGunner = {
    PARENT: "genericTank",
    LABEL: "Double Flank Gunner",
    DANGER: 8,
    GUNS: [
        ...weaponArray([
            ...weaponMirror({
                POSITION: {
                    LENGTH: 19,
                    WIDTH: 2,
                    Y: -2.5,
                    ANGLE: 90
                },
                PROPERTIES: {
                    SHOOT_SETTINGS: combineStats([g.basic, g.pelleter, g.power, g.twin, { speed: 0.7, maxSpeed: 0.7 }, g.flankGuard, { recoil: 1.8 }]),
                    TYPE: "bullet"
                }
            }, {delayIncrement: 0.5}),
            {
                POSITION: {
                    LENGTH: 12,
                    WIDTH: 11,
                    ANGLE: 90
                }
            }
        ], 2),
        ...Class.doubleGunner.GUNS
    ]
};
Class.doubleSpreadshot = makeFlank({
    PARENT: "genericTank",
    DANGER: 7,
    GUNS: [
        ...weaponMirror([{
            POSITION: {
                LENGTH: 14.5,
                WIDTH: 4,
                Y: 1,
                ANGLE: 56.5,
                DELAY: 4/5
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
                DELAY: 3/5
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
                DELAY: 2/5
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
                DELAY: 1/5
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
}, 2, "Double Spreadshot", { extraStats: [g.doubleTwin] })
Class.dualbar = {
    PARENT: "genericTank",
    LABEL: "Dualbar",
    DANGER: 8,
    BODY: {
        FOV: 1.25 * base.FOV
    },
    GUNS: weaponArray([
        {
            POSITION: {
                LENGTH: 40,
                WIDTH: 7,
                ANGLE: 90
            }
        },
        {
            POSITION: {
                LENGTH: 15,
                WIDTH: 9,
                ASPECT: -2,
                ANGLE: 90
            }
        }
    ], 2),
    TURRETS: weaponArray([
        {
            TYPE: "crowbarTurretTank",
            POSITION: {
                SIZE: 6,
                X: 19.5,
                ANGLE: 90,
                ARC: 180,
                LAYER: 1
            }
        },
        {
            TYPE: "crowbarTurretTank",
            POSITION: {
                SIZE: 6,
                X: 29.75,
                ANGLE: 90,
                ARC: 180,
                LAYER: 1
            }
        },
        {
            TYPE: "crowbarTurretTank",
            POSITION: {
                SIZE: 6,
                X: 40,
                ANGLE: 90,
                ARC: 180,
                LAYER: 1
            }
        }
    ], 2)
};
Class.duo = {
    PARENT: "genericTank",
    LABEL: "Duo",
    DANGER: 8,
    GUNS: [
        ...weaponMirror({
            POSITION: {
                LENGTH: 21,
                WIDTH: 8,
                Y: 5
            },
            PROPERTIES: {
                SHOOT_SETTINGS: combineStats([g.basic, g.twin, g.single]),
                TYPE: "bullet"
            }
        }, {delayIncrement: 0.5}),
        {
            POSITION: {
                LENGTH: 12,
                WIDTH: 18,
                ASPECT: -1.1
            }
        }
    ]
};
Class.dustStorm = {
    PARENT: "genericTank",
    LABEL: "Dust Storm",
    DANGER: 8,
    GUNS: [
        {
            POSITION: {
                LENGTH: 15,
                WIDTH: 3.5,
                ANGLE: 25
            },
            PROPERTIES: {
                SHOOT_SETTINGS: combineStats([g.basic, g.twin, g.gunner, g.cyclone]),
                TYPE: "bullet"
            }
        },
        {
            POSITION: {
                LENGTH: 14,
                WIDTH: 4.5,
                ANGLE: 51
            },
            PROPERTIES: {
                SHOOT_SETTINGS: combineStats([g.swarm, g.bee, g.dustStorm]),
                TYPE: ["bee", { INDEPENDENT: true }],
                SYNCS_SKILLS: true,
                STAT_CALCULATOR: "drone",
                WAIT_TO_CYCLE: true,
                LABEL: "Secondary"
            }
        },
        {
            POSITION: {
                LENGTH: 15,
                WIDTH: 3.5,
                ANGLE: 77,
                DELAY: 0.5
            },
            PROPERTIES: {
                SHOOT_SETTINGS: combineStats([g.basic, g.twin, g.gunner, g.cyclone]),
                TYPE: "bullet"
            }
        },
        {
            POSITION: {
                LENGTH: 14,
                WIDTH: 4.5,
                ANGLE: 102,
                DELAY: 0.5
            },
            PROPERTIES: {
                SHOOT_SETTINGS: combineStats([g.swarm, g.bee, g.dustStorm]),
                TYPE: ["bee", { INDEPENDENT: true }],
                SYNCS_SKILLS: true,
                STAT_CALCULATOR: "drone",
                WAIT_TO_CYCLE: true,
                LABEL: "Secondary"
            }
        },
        {
            POSITION: {
                LENGTH: 15,
                WIDTH: 3.5,
                ANGLE: 128
            },
            PROPERTIES: {
                SHOOT_SETTINGS: combineStats([g.basic, g.twin, g.gunner, g.cyclone]),
                TYPE: "bullet"
            }
        },
        {
            POSITION: {
                LENGTH: 14,
                WIDTH: 4.5,
                ANGLE: 154
            },
            PROPERTIES: {
                SHOOT_SETTINGS: combineStats([g.swarm, g.bee, g.dustStorm]),
                TYPE: ["bee", { INDEPENDENT: true }],
                SYNCS_SKILLS: true,
                STAT_CALCULATOR: "drone",
                WAIT_TO_CYCLE: true,
                LABEL: "Secondary"
            }
        },
        {
            POSITION: {
                LENGTH: 15,
                WIDTH: 3.5,
                ANGLE: 180,
                DELAY: 0.5
            },
            PROPERTIES: {
                SHOOT_SETTINGS: combineStats([g.basic, g.twin, g.gunner, g.cyclone]),
                TYPE: "bullet"
            }
        },
        {
            POSITION: {
                LENGTH: 14,
                WIDTH: 4.5,
                ANGLE: 205,
                DELAY: 0.5
            },
            PROPERTIES: {
                SHOOT_SETTINGS: combineStats([g.swarm, g.bee, g.dustStorm]),
                TYPE: ["bee", { INDEPENDENT: true }],
                SYNCS_SKILLS: true,
                STAT_CALCULATOR: "drone",
                WAIT_TO_CYCLE: true,
                LABEL: "Secondary"
            }
        },
        {
            POSITION: {
                LENGTH: 15,
                WIDTH: 3.5,
                ANGLE: 231
            },
            PROPERTIES: {
                SHOOT_SETTINGS: combineStats([g.basic, g.twin, g.gunner, g.cyclone]),
                TYPE: "bullet"
            }
        },
        {
            POSITION: {
                LENGTH: 14,
                WIDTH: 4.5,
                ANGLE: 257
            },
            PROPERTIES: {
                SHOOT_SETTINGS: combineStats([g.swarm, g.bee, g.dustStorm]),
                TYPE: ["bee", { INDEPENDENT: true }],
                SYNCS_SKILLS: true,
                STAT_CALCULATOR: "drone",
                WAIT_TO_CYCLE: true,
                LABEL: "Secondary"
            }
        },
        {
            POSITION: {
                LENGTH: 15,
                WIDTH: 3.5,
                ANGLE: 282,
                DELAY: 0.5
            },
            PROPERTIES: {
                SHOOT_SETTINGS: combineStats([g.basic, g.twin, g.gunner, g.cyclone]),
                TYPE: "bullet"
            }
        },
        {
            POSITION: {
                LENGTH: 14,
                WIDTH: 4.5,
                ANGLE: 308,
                DELAY: 0.5
            },
            PROPERTIES: {
                SHOOT_SETTINGS: combineStats([g.swarm, g.bee, g.dustStorm]),
                TYPE: ["bee", { INDEPENDENT: true }],
                SYNCS_SKILLS: true,
                STAT_CALCULATOR: "drone",
                WAIT_TO_CYCLE: true,
                LABEL: "Secondary"
            }
        },
        {
            POSITION: {
                LENGTH: 15,
                WIDTH: 3.5,
                ANGLE: 334
            },
            PROPERTIES: {
                SHOOT_SETTINGS: combineStats([g.basic, g.twin, g.gunner, g.cyclone]),
                TYPE: "bullet"
            }
        },
        {
            POSITION: {
                LENGTH: 14,
                WIDTH: 4.5
            },
            PROPERTIES: {
                SHOOT_SETTINGS: combineStats([g.swarm, g.bee, g.dustStorm]),
                TYPE: ["bee", { INDEPENDENT: true }],
                SYNCS_SKILLS: true,
                STAT_CALCULATOR: "drone",
                WAIT_TO_CYCLE: true,
                LABEL: "Secondary"
            }
        }
    ]
};
Class.flexedDouble = makeFlank("pentaShot", 2, "Flexed Double", { extraStats: [g.doubleTwin] });
Class.foretrapper = makeFore({
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
Class.gadgetGun = {
    PARENT: "genericTank",
    LABEL: "Gadget Gun",
    DANGER: 8,
    GUNS: [
        {
            POSITION: {
                LENGTH: 13,
                WIDTH: 10,
                ASPECT: 1.4,
                X: 8
            },
            PROPERTIES: {
                SHOOT_SETTINGS: combineStats([g.basic, g.machineGun, g.single]),
                TYPE: "bullet"
            }
        },
        {
            POSITION: {
                LENGTH: 12,
                WIDTH: 11.3,
                ASPECT: -1.6
            }
        }
    ]
};
Class.gale = {
    PARENT: "genericTank",
    LABEL: "Gale",
    DANGER: 8,
    GUNS: weaponArray([
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
                ANGLE: 60
            },
            PROPERTIES: {
                SHOOT_SETTINGS: combineStats([g.basic, g.twin, g.gunner, g.cyclone]),
                TYPE: "bullet"
            }
        }
    ], 4)
};
Class.guardrail = makeFlank("hutch", 2, "Guardrail", { extraStats: [g.doubleTwin] });
Class.harpy = makeGunner("falcon", "Harpy", { gunLength: 20, noDeco: true, renderBehind: true });
Class.hewnFlankDouble = {
    PARENT: "genericTank",
    LABEL: "Hewn Flank Double",
    DANGER: 7,
    GUNS: [
        ...weaponMirror({
            POSITION: {
                LENGTH: 20,
                WIDTH: 8,
                ANGLE: 90,
                DELAY: 0.5
            },
            PROPERTIES: {
                SHOOT_SETTINGS: combineStats([g.basic, g.twin, g.doubleTwin, g.hewnDouble]),
                TYPE: "bullet"
            }
        }),
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
Class.hewnGunner = {
    PARENT: "genericTank",
    LABEL: "Hewn Gunner",
    DANGER: 8,
    GUNS: [
        ...weaponMirror([
            {
                POSITION: {
                    LENGTH: 10,
                    WIDTH: 3.5,
                    Y: -8.25,
                    ANGLE: -205,
                    DELAY: 0.75
                },
                PROPERTIES: {
                    SHOOT_SETTINGS: combineStats([g.basic, g.twin, g.gunner, { speed: 1.2 }, g.doubleTwin, g.hewnDouble, { recoil: 1.15 }]),
                    TYPE: "bullet"
                }
            },
            {
                POSITION: {
                    LENGTH: 14,
                    WIDTH: 3.5,
                    Y: -4.75,
                    ANGLE: -205,
                    DELAY: 0.25
                },
                PROPERTIES: {
                    SHOOT_SETTINGS: combineStats([g.basic, g.twin, g.gunner, { speed: 1.2 }, g.doubleTwin, g.hewnDouble, { recoil: 1.15 }]),
                    TYPE: "bullet"
                }
            }
        ]),
        ...weaponArray(weaponMirror([
            {
                POSITION: {
                    LENGTH: 12,
                    WIDTH: 3.5,
                    Y: 7.25,
                    DELAY: 0.5
                },
                PROPERTIES: {
                    SHOOT_SETTINGS: combineStats([g.basic, g.twin, g.gunner, { speed: 1.2 }, g.doubleTwin, g.hewnDouble]),
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
                    SHOOT_SETTINGS: combineStats([g.basic, g.twin, g.gunner, {speed: 1.2}, g.doubleTwin, g.hewnDouble]),
                    TYPE: "bullet"
                }
            }
        ], {delayIncrement: 0.25}), 2)
    ]
};
Class.hewnTriple = {
    PARENT: "genericTank",
    LABEL: "Hewn Triple",
    DANGER: 8,
    GUNS: [
        ...weaponMirror({
            POSITION: {
                LENGTH: 19,
                WIDTH: 8,
                Y: -5.5,
                ANGLE: -25
            },
            PROPERTIES: {
                SHOOT_SETTINGS: combineStats([g.basic, g.twin, g.twin, g.spam, g.doubleTwin, g.tripleTwin, g.hewnDouble, { recoil: 1.15 }]),
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
                SHOOT_SETTINGS: combineStats([g.basic, g.twin, g.spam, g.doubleTwin, g.tripleTwin, g.hewnDouble]),
                TYPE: "bullet"
            }
        }, {delayIncrement: 0.5}), 3)
    ]
};
Class.hexaHealer = makeFlank("healer", 6, "Hexa-Healer", { extraStats: [g.flankGuard] });
Class.hexaHealer = {
    PARENT: "genericHealer",
    LABEL: "Hexa-Healer",
    GUNS: weaponArray([
        {
            POSITION: {
                LENGTH: 11,
                WIDTH: 9,
                ASPECT: -0.4,
                X: 9.5,
                ANGLE: 180,
                DELAY: 0.5
            }
        },
        {
            POSITION: {
                LENGTH: 18,
                WIDTH: 10,
                ANGLE: 180,
                DELAY: 0.5
            },
            PROPERTIES: {
                SHOOT_SETTINGS: combineStats([g.basic, g.healer, g.flankGuard, g.flankGuard]),
                TYPE: "healerBullet"
            }
        },
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
                SHOOT_SETTINGS: combineStats([g.basic, g.healer, g.flankGuard, g.flankGuard]),
                TYPE: "healerBullet"
            }
        }
    ], 3)
};
Class.hexaMachine = makeAuto(makeFlank({
    PARENT: "genericTank",
    STAT_NAMES: statnames.trap,
    GUNS: [
        {
            POSITION: {
                LENGTH: 15,
                WIDTH: 7,
                ASPECT: 1.4
            }
        },
        {
            POSITION: {
                LENGTH: 3,
                WIDTH: 10,
                ASPECT: 1.3,
                X: 15
            },
            PROPERTIES: {
                SHOOT_SETTINGS: combineStats([g.trapSpray, g.machineGun, { spray: 5 }]),
                TYPE: "trap",
                STAT_CALCULATOR: "trap"
            }
        }
    ]
}, 6, "", { extraStats: [g.hexaTrapper], delayIncrement: 0.5, danger: 7 }), "Hexa-Machine");
Class.hexaMech = makeAuto(makeFlank({
    PARENT: "genericTank",
    STAT_NAMES: statnames.trap,
    GUNS: [
        {
            POSITION: {
                LENGTH: 15,
                WIDTH: 8,
                ANGLE: 180,
                DELAY: 0.5
            }
        },
        {
            POSITION: {
                LENGTH: 12,
                WIDTH: 11,
                ANGLE: 180,
                DELAY: 0.5
            }
        },
        {
            POSITION: {
                LENGTH: 3,
                WIDTH: 7,
                ASPECT: 1.7,
                X: 15,
                ANGLE: 180,
                DELAY: 0.5
            },
            PROPERTIES: {
                SHOOT_SETTINGS: combineStats([g.trap]),
                TYPE: "autoTrap",
                STAT_CALCULATOR: "trap"
            }
        },
        {
            POSITION: {
                LENGTH: 15,
                WIDTH: 8
            }
        },
        {
            POSITION: {
                LENGTH: 12,
                WIDTH: 11
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
                TYPE: "autoTrap",
                STAT_CALCULATOR: "trap"
            }
        }
    ]
}, 3, "", { extraStats: [g.hexaTrapper], danger: 7 }), "Hexa-Mech");
Class.hexaTrapGuard = makeAuto({
    PARENT: "genericTank",
    DANGER: 7,
    STAT_NAMES: statnames.mixed,
    HAS_NO_RECOIL: true,
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
}, "Hexa-Trap Guard");
Class.hipwatch = {
    PARENT: "genericTank",
    LABEL: "Hipwatch",
    DANGER: 8,
    GUNS: Class.doubleTwin.GUNS,
    TURRETS: weaponArray({
        TYPE: ["autoTankGun", { INDEPENDENT: true }],
        POSITION: {
            SIZE: 11,
            X: 8,
            ANGLE: 90,
            ARC: 190
        }
    }, 2)
};
Class.injection = {
    PARENT: "genericHealer",
    LABEL: "Injection",
    BODY: Class.hunter.BODY,
    GUNS: [
        {
            POSITION: {
                LENGTH: 15,
                WIDTH: 6,
                ASPECT: -0.4,
                X: 14
            }
        },
        {
            POSITION: {
                LENGTH: 13,
                WIDTH: 7,
                ASPECT: -0.4,
                X: 14
            }
        },
        {
            POSITION: {
                LENGTH: 24,
                WIDTH: 8,
            },
            PROPERTIES: {
                SHOOT_SETTINGS: combineStats([g.basic, g.healer, g.sniper, g.hunter, g.hunterSecondary]),
                TYPE: "healerBullet"
            }
        },
        {
            POSITION: {
                LENGTH: 21,
                WIDTH: 11,
                DELAY: 0.25
            },
            PROPERTIES: {
                SHOOT_SETTINGS: combineStats([g.basic, g.healer, g.sniper, g.hunter]),
                TYPE: "healerBullet"
            }
        }
    ]
};
Class.intern = {
    PARENT: "genericHealer",
    LABEL: "Intern",
    BODY: Class.assassin.BODY,
    GUNS: [
        {
            POSITION: {
                LENGTH: 14,
                WIDTH: 9,
                ASPECT: -0.4,
                X: 14
            }
        },
        {
            POSITION: {
                LENGTH: 25,
                WIDTH: 10
            },
            PROPERTIES: {
                SHOOT_SETTINGS: combineStats([g.basic, g.healer, g.sniper, g.assassin]),
                TYPE: "healerBullet"
            }
        }
    ]
};
Class.marine = makeGunner("ranger", "Marine");
Class.megaAutoDirectordrive = makeAuto("directordrive", "Mega Auto-Directordrive", preset.makeAuto.driveMega);
Class.megaAutoDouble = makeAuto("doubleTwin", "Mega Auto-Double", preset.makeAuto.mega);
Class.megaHexaTrapper = makeAuto(makeFlank("trapper", 6, "", { extraStats: [g.hexaTrapper], delayIncrement: 0.5, danger: 7 }), "Mega Hexa-Trapper", preset.makeAuto.mega);
Class.mono = {
    PARENT: "genericTank",
    LABEL: "Mono",
    DANGER: 8,
    GUNS: [
        {
            POSITION: {
                LENGTH: 21,
                WIDTH: 8
            },
            PROPERTIES: {
                SHOOT_SETTINGS: combineStats([g.basic, g.single, g.single]),
                TYPE: "bullet"
            }
        },
        {
            POSITION: {
                LENGTH: 13.5,
                WIDTH: 12
            }
        },
        {
            POSITION: {
                LENGTH: 3.5,
                WIDTH: 8,
                ASPECT: -1.5,
                X: 13.5
            }
        }
    ]
};
Class.octoTrapper = makeAuto(makeFlank("trapper", 8, "", { extraStats: [g.hexaTrapper], delayIncrement: 0.5, danger: 7 }), "Octo-Trapper");
Class.ointment = {
    PARENT: "genericHealer",
    LABEL: "Ointment",
    BODY: Class.rifle.BODY,
    GUNS: [
        {
            POSITION: {
                LENGTH: 20,
                WIDTH: 13
            }
        },
        {
            POSITION: {
                LENGTH: 11,
                WIDTH: 7,
                ASPECT: -0.4,
                X: 14
            }
        },
        {
            POSITION: {
                LENGTH: 22,
                WIDTH: 8
            },
            PROPERTIES: {
                SHOOT_SETTINGS: combineStats([g.basic, g.healer, g.sniper, g.rifle]),
                TYPE: "healerBullet"
            }
        }
    ]
};
Class.orbitalStrike = {
    PARENT: "genericTank",
    LABEL: "Orbital Strike",
    DANGER: 8,
    GUNS: weaponArray([
        {
            POSITION: {
                LENGTH: 20.5,
                WIDTH: 14,
                ANGLE: 180,
                DELAY: 0.5
            },
            PROPERTIES: {
                SHOOT_SETTINGS: combineStats([g.basic, g.pounder, g.destroyer, g.flankGuard, g.flankGuard]),
                TYPE: "bullet"
            }
        },
        {
            POSITION: {
                LENGTH: 20.5,
                WIDTH: 14
            },
            PROPERTIES: {
                SHOOT_SETTINGS: combineStats([g.basic, g.pounder, g.destroyer, g.flankGuard, g.flankGuard]),
                TYPE: "bullet"
            }
        }
    ], 3)
};
Class.overdoubleGunner = makeOver({
    PARENT: "genericTank",
    DANGER: 7,
    BODY: Class.overgunner.BODY,
    GUNS: weaponArray([
        ...weaponMirror({
            POSITION: {
                LENGTH: 19,
                WIDTH: 2,
                Y: -2.5
            },
            PROPERTIES: {
                SHOOT_SETTINGS: combineStats([g.basic, g.pelleter, g.power, g.twin, { speed: 0.7, maxSpeed: 0.7 }, g.flankGuard, { recoil: 1.8 }, g.doubleTwin]),
                TYPE: "bullet"
            }
        }, {delayIncrement: 0.5}),
        {
            POSITION: {
                LENGTH: 12,
                WIDTH: 11
            }
        }
    ], 2)
}, "Overdouble Gunner", { angle: 90, renderBehind: true });
Class.overdoubleTwin = makeOver("doubleTwin", "Overdouble Twin", { angle: 90, renderBehind: true });
Class.physician = {
    PARENT: "genericSmasher",
    LABEL: "Physician",
    HEALING_TANK: true,
    FACING_TYPE: ["spin", {speed: 0.02}],
    GUNS: weaponArray({
        POSITION: {
            LENGTH: 0,
            WIDTH: 0
        }
    }, 12),
    TURRETS: [
        ...weaponArray({
            TYPE: ["pentagonHat_spin", {COLOR: "black"}],
            POSITION: {SIZE: 20}
        }, 4),
        {
            TYPE: "healerHat",
            POSITION: {
                SIZE: 13,
                LAYER: 1
            }
        }
    ]
};
Class.protector = {
    PARENT: "genericTank",
    LABEL: "Protector",
    DANGER: 8,
    BODY: {
        FOV: 1.25 * base.FOV
    },
    GUNS: [
        {
            POSITION: {
                LENGTH: 18,
                WIDTH: 12
            },
            PROPERTIES: {
                SHOOT_SETTINGS: combineStats([g.basic, g.twin, g.pounder]),
                TYPE: "bullet"
            }
        },
        {
            POSITION: {
                LENGTH: 17,
                WIDTH: 13
            },
            PROPERTIES: {
                SHOOT_SETTINGS: combineStats([g.trap, g.setTrap]),
                TYPE: "setTrap",
                STAT_CALCULATOR: "block"
            }
        },
        {
            POSITION: {
                LENGTH: 7,
                WIDTH: 13,
                ASPECT: -1.3,
                X: 6
            }
        }
    ]
};
Class.quadTwin = makeFlank("twin", 4, "Quad Twin", { extraStats: [g.spam, g.doubleTwin, g.tripleTwin], danger: 8 });
Class.quintuplet = {
    PARENT: "genericTank",
    LABEL: "Quintuplet",
    DANGER: 8,
    GUNS: [
        ...weaponMirror([{
            POSITION: {
                LENGTH: 16,
                WIDTH: 10,
                Y: 5,
                DELAY: 2/3
            },
            PROPERTIES: {
                SHOOT_SETTINGS: combineStats([g.basic, g.twin, g.triplet, g.quintuplet]),
                TYPE: "bullet"
            }
        },
        {
            POSITION: {
                LENGTH: 19,
                WIDTH: 10,
                Y: 3,
                DELAY: 1/3
            },
            PROPERTIES: {
                SHOOT_SETTINGS: combineStats([g.basic, g.twin, g.triplet, g.quintuplet]),
                TYPE: "bullet"
            }
        }]),
        {
            POSITION: {
                LENGTH: 22,
                WIDTH: 10
            },
            PROPERTIES: {
                SHOOT_SETTINGS: combineStats([g.basic, g.twin, g.triplet, g.quintuplet]),
                TYPE: "bullet"
            }
        }
    ]
};
Class.ransacker = makeGuard("rifle", "Ransacker");
Class.refuge = makeAuto({
    PARENT: "genericTank",
    DANGER: 7,
    STAT_NAMES: statnames.mixed,
    BODY: Class.cruiser.BODY,
    GUNS: [
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
                    SHOOT_SETTINGS: combineStats([g.trap, g.hexaTrapper, { range: 0.5, speed: 0.7, maxSpeed: 0.7 }]),
                    TYPE: "trap",
                    STAT_CALCULATOR: "trap"
                }
            }
        ], 6, {delayIncrement: 0.5}),
        ...weaponArray({
            POSITION: {
                LENGTH: 7.75,
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
        }, 3, {delayIncrement: 1/3})
    ]
}, "Refuge");
Class.scatterer = {
    PARENT: "genericTank",
    LABEL: "Scatterer",
    DANGER: 8,
    GUNS: [
        {
            POSITION: {
                LENGTH: 12,
                WIDTH: 10,
                ASPECT: 1.4,
                X: 11
            },
            PROPERTIES: {
                SHOOT_SETTINGS: combineStats([g.basic, g.machineGun]),
                TYPE: "bullet"
            }
        },
        {
            POSITION: {
                LENGTH: 12,
                WIDTH: 10,
                ASPECT: 1.4,
                X: 8,
                DELAY: 0.5
            },
            PROPERTIES: {
                SHOOT_SETTINGS: combineStats([g.basic, g.machineGun]),
                TYPE: "bullet"
            }
        }
    ]
};
Class.scrimmer = {
    PARENT: "genericTank",
    LABEL: "Scrimmer",
    DANGER: 8,
    BODY: Class.triAngle.BODY,
    TURRETS: [
        {
            POSITION: {
                SIZE: 9,
                X: 8,
                Y: -1,
                ANGLE: 90,
                ARC: 170
            },
            TYPE: "autoTankGun",
        },
        {
            POSITION: {
                SIZE: 9,
                X: 8,
                Y: 1,
                ANGLE: -90,
                ARC: 170
            },
            TYPE: "autoTankGun",
        }
    ],
    GUNS: Class.triAngle.GUNS
};
Class.scuffler = makeFlank({
    PARENT: "genericTank",
    DANGER: 7,
    GUNS: [
        {
            POSITION: {
                LENGTH: 16,
                WIDTH: 11,
                ANGLE: 90
            },
            PROPERTIES: {
                SHOOT_SETTINGS: combineStats([g.basic, g.pounder, g.twin]),
                TYPE: "bullet"
            }
        },
        ...weaponMirror({
            POSITION: {
                LENGTH: 20,
                WIDTH: 8,
                Y: 5.5
            },
            PROPERTIES: {
                SHOOT_SETTINGS: combineStats([g.basic, g.twin]),
                TYPE: "bullet"
            }
        }, {delayIncrement: 0.5})
    ]
}, 2, "Scuffler", { extraStats: [g.doubleTwin] });
Class.sealer = makeFlank("cog", 2, "Sealer", { extraStats: [g.doubleTwin] });
Class.sequence = {
    PARENT: "genericTank",
    LABEL: "Sequence",
    DANGER: 8,
    GUNS: weaponArray({
        POSITION: {
            LENGTH: 20.5,
            WIDTH: 12
        },
        PROPERTIES: {
            SHOOT_SETTINGS: combineStats([g.basic, g.pounder, g.flankGuard, g.flankGuard]),
            TYPE: "bullet"
        }
    }, 3),
    TURRETS: weaponArray({
        TYPE: ["megaAutoTankGun", { INDEPENDENT: true }],
        POSITION: {
            SIZE: 14,
            X: 8,
            ANGLE: 180,
            ARC: 190
        }
    }, 3)
};
Class.setup = makeFlank("expeller", 2, "Setup", { extraStats: [g.doubleTwin] });
Class.sharpshooter = {
    PARENT: "genericTank",
    LABEL: "Sharpshooter",
    DANGER: 8,
    BODY: Class.sniper.BODY,
    GUNS: [
        {
            POSITION: {
                LENGTH: 25,
                WIDTH: 8
            },
            PROPERTIES: {
                SHOOT_SETTINGS: combineStats([g.basic, g.sniper, g.single]),
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
Class.skewnDouble = {
    PARENT: "genericTank",
    LABEL: "Skewn Double",
    DANGER: 7,
    GUNS: [
        ...weaponMirror([
            {
                POSITION: {
                    LENGTH: 16,
                    WIDTH: 8,
                    Y: 5.5,
                    ANGLE: 225
                },
                PROPERTIES: {
                    SHOOT_SETTINGS: combineStats([g.basic, g.twin, g.twin, g.doubleTwin, g.hewnDouble, { recoil: 1.15 }]),
                    TYPE: "bullet"
                }
            },
            {
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
            }
        ], {delayIncrement: 0.5}),
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
Class.splitDouble = makeFlank("splitShot", 2, "Split Double", { extraStats: [g.doubleTwin] });
Class.tailer = makeGunner("stalker", "Tailer");
Class.tempest_AR = {
    PARENT: "genericTank",
    LABEL: "Tempest",
    DANGER: 8,
    GUNS: weaponArray([
        {
            POSITION: {
                LENGTH: 6,
                WIDTH: 2.5,
                X: 8
            },
            PROPERTIES: {
                SHOOT_SETTINGS: combineStats([g.basic, g.twin, g.gunner, g.cyclone]),
                TYPE: "bullet"
            }
        },
        {
            POSITION: {
                LENGTH: 6,
                WIDTH: 2.5,
                X: 8,
                ANGLE: 20,
                DELAY: 2/3
            },
            PROPERTIES: {
                SHOOT_SETTINGS: combineStats([g.basic, g.twin, g.gunner, g.cyclone]),
                TYPE: "bullet"
            }
        },
        {
            POSITION: {
                LENGTH: 6,
                WIDTH: 2.5,
                X: 8,
                ANGLE: 40,
                DELAY: 1/3
            },
            PROPERTIES: {
                SHOOT_SETTINGS: combineStats([g.basic, g.twin, g.gunner, g.cyclone]),
                TYPE: "bullet"
            }
        }
    ], 6)
};
Class.ternion = makeFlank("single", 3, "Ternion", { extraStats: [g.flankGuard] });
Class.ternion.BODY = Class.flankGuard.BODY;
Class.tornado_AR = {
    PARENT: "genericTank",
    LABEL: "Tornado",
    DANGER: 8,
    GUNS: weaponArray([
        {
            POSITION: {
                LENGTH: 16,
                WIDTH: 5.5,
                ANGLE: 90,
                DELAY: 0.75
            },
            PROPERTIES: {
                SHOOT_SETTINGS: combineStats([g.basic, g.twin, g.gunner, g.cyclone]),
                TYPE: "bullet"
            }
        },
        {
            POSITION: {
                LENGTH: 16,
                WIDTH: 5.5,
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
                LENGTH: 16,
                WIDTH: 5.5,
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
                LENGTH: 16,
                WIDTH: 5.5
            },
            PROPERTIES: {
                SHOOT_SETTINGS: combineStats([g.basic, g.twin, g.gunner, g.cyclone]),
                TYPE: "bullet"
            }
        }
    ], 3)
};
Class.tricker = {
    PARENT: "genericTank",
    LABEL: "Tricker",
    STAT_NAMES: statnames.trap,
    DANGER: 8,
    GUNS: [
        {
            POSITION: {
                LENGTH: 16,
                WIDTH: 7
            }
        },
        {
            POSITION: {
                LENGTH: 3,
                WIDTH: 7,
                ASPECT: 1.7,
                X: 16
            },
            PROPERTIES: {
                SHOOT_SETTINGS: combineStats([g.trap, g.single]),
                TYPE: "trap",
                STAT_CALCULATOR: "trap"
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
Class.tripleAutoDirectordrive = makeAuto("directordrive", "Triple Auto-Directordrive", preset.makeAuto.driveTriple);
Class.tripleAutoDouble = makeAuto("doubleTwin", "Triple Auto-Double", preset.makeAuto.triple);
Class.tripleFlankTwin = makeFlank({
    PARENT: "genericTank",
    DANGER: 7,
    GUNS: [
        {
            POSITION: {
                LENGTH: 20,
                WIDTH: 8,
                ANGLE: 60,
                DELAY: 0.5
            },
            PROPERTIES: {
                SHOOT_SETTINGS: combineStats([g.basic, g.twin, g.doubleTwin]),
                TYPE: "bullet"
            }
        },
        ...weaponMirror({
            POSITION: {
                LENGTH: 20,
                WIDTH: 8,
                Y: 5.5
            },
            PROPERTIES: {
                SHOOT_SETTINGS: combineStats([g.basic, g.twin, g.doubleTwin]),
                TYPE: "bullet"
            }
        }, {delayIncrement: 0.5})
    ]
}, 3, "Triple Flank Twin", { extraStats: [g.spam, g.doubleTwin, g.tripleTwin] });
Class.tripleGunner = makeFlank("gunner", 3, "Triple Gunner", { extraStats: [g.spam, g.doubleTwin, g.tripleTwin], danger: 8 });
Class.trove = {
    PARENT: "genericTank",
    LABEL: "Trove",
    DANGER: 8,
    GUNS: [
        {
            POSITION: {
                LENGTH: 7,
                WIDTH: 3.5,
                X: 8,
                Y: 1,
                ANGLE: 10,
                DELAY: 0.5
            },
            PROPERTIES: {
                SHOOT_SETTINGS: combineStats([g.basic, g.twin, g.gunner, g.cyclone]),
                TYPE: "bullet"
            }
        },
        {
            POSITION: {
                LENGTH: 7,
                WIDTH: 3.5,
                X: 8,
                Y: -1,
                ANGLE: 80,
                DELAY: 0.75
            },
            PROPERTIES: {
                SHOOT_SETTINGS: combineStats([g.basic, g.twin, g.gunner, g.cyclone]),
                TYPE: "bullet"
            }
        },
        {
            POSITION: {
                LENGTH: 7,
                WIDTH: 3.5,
                X: 8,
                Y: 1,
                ANGLE: 100
            },
            PROPERTIES: {
                SHOOT_SETTINGS: combineStats([g.basic, g.twin, g.gunner, g.cyclone]),
                TYPE: "bullet"
            }
        },
        {
            POSITION: {
                LENGTH: 7,
                WIDTH: 3.5,
                X: 8,
                Y: -1,
                ANGLE: 170,
                DELAY: 0.25
            },
            PROPERTIES: {
                SHOOT_SETTINGS: combineStats([g.basic, g.twin, g.gunner, g.cyclone]),
                TYPE: "bullet"
            }
        },
        {
            POSITION: {
                LENGTH: 7,
                WIDTH: 3.5,
                X: 8,
                Y: 1,
                ANGLE: -170,
                DELAY: 0.75
            },
            PROPERTIES: {
                SHOOT_SETTINGS: combineStats([g.basic, g.twin, g.gunner, g.cyclone]),
                TYPE: "bullet"
            }
        },
        {
            POSITION: {
                LENGTH: 7,
                WIDTH: 3.5,
                X: 8,
                Y: -1,
                ANGLE: -100,
                DELAY: 0.5
            },
            PROPERTIES: {
                SHOOT_SETTINGS: combineStats([g.basic, g.twin, g.gunner, g.cyclone]),
                TYPE: "bullet"
            }
        },
        {
            POSITION: {
                LENGTH: 7,
                WIDTH: 3.5,
                X: 8,
                Y: 1,
                ANGLE: -80,
                DELAY: 0.25
            },
            PROPERTIES: {
                SHOOT_SETTINGS: combineStats([g.basic, g.twin, g.gunner, g.cyclone]),
                TYPE: "bullet"
            }
        },
        {
            POSITION: {
                LENGTH: 7,
                WIDTH: 3.5,
                X: 8,
                Y: -1,
                ANGLE: -10
            },
            PROPERTIES: {
                SHOOT_SETTINGS: combineStats([g.basic, g.twin, g.gunner, g.cyclone]),
                TYPE: "bullet"
            }
        }
    ],
    TURRETS: weaponArray({
        TYPE: ["auto4gun", { INDEPENDENT: true }],
        POSITION: {
            SIZE: 13,
            X: 6,
            ANGLE: 45,
            ARC: 190
        }
    }, 4)
};
Class.unity = {
    PARENT: "genericTank",
    LABEL: "Unity",
    DANGER: 8,
    GUNS: [
        ...weaponArray({
            POSITION: {
                LENGTH: 17,
                WIDTH: 3.5,
                ANGLE: 30,
                DELAY: 0.25
            },
            PROPERTIES: {
                SHOOT_SETTINGS: combineStats([g.basic, g.twin, g.gunner, g.cyclone]),
                TYPE: "bullet"
            }
        }, 6, {delayIncrement: 0.5}),
        ...weaponArray([
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
    ]
};
Class.vulcan = {
    PARENT: "genericTank",
    LABEL: "Vulcan",
    DANGER: 8,
    BODY: {
        FOV: base.FOV * 1.1
    },
    UPGRADE_TOOLTIP: "[DEV NOTE] This tank is a placeholder!",
    GUNS: [
        {
            POSITION: {
                LENGTH: 30,
                WIDTH: 1.5,
                Y: -4.45
            }
        },
        {
            POSITION: {
                LENGTH: 30,
                WIDTH: 1.5,
                Y: 4.45
            }
        },
        {
            POSITION: {
                LENGTH: 30,
                WIDTH: 1.5,
                Y: 2.5
            }
        },
        {
            POSITION: {
                LENGTH: 30,
                WIDTH: 1.5,
                Y: -2.5
            }
        },
        {
            POSITION: {
                LENGTH: 30,
                WIDTH: 1.5
            }
        },
        {
            POSITION: {
                LENGTH: 12,
                WIDTH: 14
            }
        },
        {
            POSITION: {
                LENGTH: 5,
                WIDTH: 14,
                X: 20
            }
        }
    ]
};
Class.waarrkwaarrk = makeFlank("waarrk", 2, "Waarrkwaarrk", { extraStats: [g.doubleTwin] });
Class.warkwarkwark = makeFlank("wark", 3, "Warkwarkwark", { extraStats: [g.spam, g.doubleTwin, g.tripleTwin], danger: 8 });
Class.warkwawarkrk = {
    PARENT: "genericTank",
    LABEL: "Warkwawarkrk",
    STAT_NAMES: statnames.trap,
    DANGER: 8,
    GUNS: [
        ...weaponMirror([
            {
                POSITION: {
                    LENGTH: 15,
                    WIDTH: 8,
                    Y: -5.5,
                    ANGLE: 155
                }
            },
            {
                POSITION: {
                    LENGTH: 3.25,
                    WIDTH: 8,
                    ASPECT: 1.7,
                    X: 14,
                    Y: -5.5,
                    ANGLE: 155
                },
                PROPERTIES: {
                    SHOOT_SETTINGS: combineStats([g.trap, g.twin]),
                    TYPE: "trap",
                    STAT_CALCULATOR: "trap"
                }
            }
        ], { delayIncrement: 0.5 }),
        ...weaponArray(weaponMirror([
            {
                POSITION: {
                    LENGTH: 15,
                    WIDTH: 8,
                    Y: 5.5,
                    ANGLE: 5
                }
            },
            {
                POSITION: {
                    LENGTH: 3.25,
                    WIDTH: 8,
                    ASPECT: 1.7,
                    X: 14,
                    Y: 5.5,
                    ANGLE: 5
                },
                PROPERTIES: {
                    SHOOT_SETTINGS: combineStats([g.trap, g.twin]),
                    TYPE: "trap",
                    STAT_CALCULATOR: "trap"
                }
            }
        ], {delayIncrement: 0.5}), 2)
    ]
};
Class.warkwawawark = {
    PARENT: "genericTank",
    LABEL: "Warkwawawark",
    DANGER: 8,
    STAT_NAMES: statnames.trap,
    GUNS: [
        ...weaponMirror([
            {
                POSITION: {
                    LENGTH: 15,
                    WIDTH: 8,
                    ANGLE: 90
                }
            },
            {
                POSITION: {
                    LENGTH: 3.25,
                    WIDTH: 8,
                    ASPECT: 1.7,
                    X: 14,
                    ANGLE: 90
                },
                PROPERTIES: {
                    SHOOT_SETTINGS: combineStats([g.trap, g.twin, g.doubleTwin]),
                    TYPE: "trap",
                    STAT_CALCULATOR: "trap"
                }
            }
        ]),
        ...Class.warkwark.GUNS
    ]
};
Class.whirlwind_AR = /*makeAuto(*/{
    PARENT: "genericTank",
    LABEL: "Whirlwind",
    DANGER: 8, //7,
    GUNS: weaponArray([
        {
            POSITION: {
                LENGTH: 14,
                WIDTH: 3.5
            }
        },
        {
            POSITION: {
                LENGTH: 2.2,
                WIDTH: 3.5,
                ASPECT: 1.7,
                X: 14
            },
            PROPERTIES: {
                SHOOT_SETTINGS: combineStats([g.trap, g.flankGuard, g.flankGuard, g.cyclone, { size: 1.25 }]),
                TYPE: "trap",
                STAT_CALCULATOR: "trap"
            }
        },
        {
            POSITION: {
                LENGTH: 14,
                WIDTH: 3.5,
                ANGLE: 30
            }
        },
        {
            POSITION: {
                LENGTH: 2.2,
                WIDTH: 3.5,
                ASPECT: 1.7,
                X: 14,
                ANGLE: 30,
                DELAY: 0.5
            },
            PROPERTIES: {
                SHOOT_SETTINGS: combineStats([g.trap, g.flankGuard, g.flankGuard, g.cyclone, { size: 1.25 }]),
                TYPE: "trap",
                STAT_CALCULATOR: "trap"
            }
        },
        {
            POSITION: {
                LENGTH: 14,
                WIDTH: 3.5,
                ANGLE: 60
            }
        },
        {
            POSITION: {
                LENGTH: 2.2,
                WIDTH: 3.5,
                ASPECT: 1.7,
                X: 14,
                ANGLE: 60,
                DELAY: 0.25
            },
            PROPERTIES: {
                SHOOT_SETTINGS: combineStats([g.trap, g.flankGuard, g.flankGuard, g.cyclone, { size: 1.25 }]),
                TYPE: "trap",
                STAT_CALCULATOR: "trap"
            }
        },
        {
            POSITION: {
                LENGTH: 14,
                WIDTH: 3.5,
                ANGLE: 90
            }
        },
        {
            POSITION: {
                LENGTH: 2.2,
                WIDTH: 3.5,
                ASPECT: 1.7,
                X: 14,
                ANGLE: 90,
                DELAY: 0.75
            },
            PROPERTIES: {
                SHOOT_SETTINGS: combineStats([g.trap, g.flankGuard, g.flankGuard, g.cyclone, { size: 1.25 }]),
                TYPE: "trap",
                STAT_CALCULATOR: "trap"
            }
        }
    ], 3)
};//, "Whirlwind");
Class.wrench = {
    PARENT: "genericTank",
    LABEL: "Wrench",
    DANGER: 8,
    BODY: {
        FOV: 1.25 * base.FOV
    },
    GUNS: [
        {
            POSITION: {
                LENGTH: 75,
                WIDTH: 7
            }
        },
        {
            POSITION: {
                LENGTH: 15,
                WIDTH: 9,
                ASPECT: -2
            }
        }
    ],
    TURRETS: [
        {
            TYPE: "crowbarTurretTank",
            POSITION: {
                SIZE: 6,
                X: 54.5,
                ARC: 180,
                LAYER: 1
            }
        },
        {
            TYPE: "crowbarTurretTank",
            POSITION: {
                SIZE: 6,
                X: 64.75,
                ARC: 180,
                LAYER: 1
            }
        },
        {
            TYPE: "crowbarTurretTank",
            POSITION: {
                SIZE: 6,
                X: 75,
                ARC: 180,
                LAYER: 1
            }
        }
    ]
};

// Existing Upgrade Management
if (!Config.arms_race) return;

Class.director.UPGRADES_TIER_2.push("directordrive", "honcho"/*, "doper"*/);
Class.machineGun.UPGRADES_TIER_2.push("diesel", "machineTrapper");
Class.trapper.UPGRADES_TIER_2.push("pen", "mech", "machineTrapper", "wark");
Class.twin.UPGRADES_TIER_2.push("wark");

Class.artillery.UPGRADES_TIER_3.push(/*"queller", "forger", */"force", "autoArtillery"/*, "foctillery", "discharger"*/);
Class.assassin.UPGRADES_TIER_3.push("hitman", "sniper3"/*, "enforcer", "courser"*/);
Class.auto3.UPGRADES_TIER_3.push("sniper3", "crowbar", "autoAuto3", "combo");
Class.builder.UPGRADES_TIER_3.push(/*"forger", "stall", */"fashioner"/*, "charger"*/);
Class.cruiser.UPGRADES_TIER_3.push("productionist", "cruiserdrive"/*, "hangar", "zipper", "baltimore", "mosey"*/);
Class.destroyer.UPGRADES_TIER_3.push(/*"megaTrapper", "queller", */"autoDestroyer"/*, "hurler", "slinker"*/);
removeUpgrades("director", 3, ["bigCheese"]);
Class.doubleTwin.UPGRADES_TIER_3.push("doubleFlankTwin", "doubleGunner", "warkwark");
Class.gunner.UPGRADES_TIER_3.push("buttbuttin", "blower", "rimfire", "volley", "doubleGunner", "bentGunner", "equalizer")
removeUpgrades("healer", 3, ["ambulance", "surgeon", "paramedic"]);
Class.healer.UPGRADES_TIER_3.push(/*"scientist", "nurse", */"triHealer"/*, "analyzer", "psychiatrist", "soother"*/);
Class.hexaTank.UPGRADES_TIER_3.push("autoHexaTank", "mingler", "combo")
Class.hunter.UPGRADES_TIER_3.push("autoHunter"/*, "megaHunter", "prober", "courser"*/);
Class.launcher.UPGRADES_TIER_3.push("rocketeer"/*, "pitcher", "cluster", "projector"*/, "heaver", "autoLauncher"/*, "hurler", "inception"*/);
Class.minigun.UPGRADES_TIER_3.push(/*"taser", "zipper", */"bentMinigun", "autoMinigun"/*, "widget"*/);
Class.overseer.UPGRADES_TIER_3.push("captain", "foreman"/*, "dopeseer"*/);
Class.pounder.UPGRADES_TIER_3.push("subverter");
Class.rifle.UPGRADES_TIER_3.push("autoRifle"/*, "enforcer", "courser"*/);
Class.smasher.UPGRADES_TIER_3.push(/*"banger", "drifter"*/);
Class.sniper.UPGRADES_TIER_3.push("railgun");
Class.spawner.UPGRADES_TIER_3.push("megaSpawner", "productionist", "spawnerdrive", "captain"/*, "hangar", "laborer", "foundry", "issuer"*/);
Class.trapGuard.UPGRADES_TIER_3.push("peashooter"/*, "incarcerator", "mechGuard"*/, "autoTrapGuard"/*, "machineGuard", "triTrapGuard"*/);
Class.triAngle.UPGRADES_TIER_3.push(/*"taser", "cockatiel", */"integrator", "defect", "quadAngle");
Class.triTrapper.UPGRADES_TIER_3.push(/*"triPen", "triMech", "triMachine", "triTrapGuard"*/);
Class.tripleShot.UPGRADES_TIER_3.push("splitShot", "autoTripleShot", "bentGunner", "bentMinigun", "defect", "waarrk");
Class.underseer.UPGRADES_TIER_3.push("autoUnderseer", "underdrive"/*, "pentaseer"*/);

Class.artillery.UPGRADES_TIER_4 = [/*"blare", "erne"*/];
Class.assassin.UPGRADES_TIER_4 = [/*"executor", "finger"*/];
Class.auto4.UPGRADES_TIER_4 = [/*"auto6", "batter4", */"autoAuto4"/*, "wraith", "volley4", "chisel"*/, "trove"];
Class.auto5.UPGRADES_TIER_4 = [/*"auto7", "mega5", "auto6", "spectre", "sniper5", "pryer", */"autoAuto5"];
Class.autoDouble.UPGRADES_TIER_4 = ["megaAutoDouble", "tripleAutoDouble", "autoTriple", "autoHewnDouble", "autoBentDouble", "autoDoubleFlank", "autoDoubleGunner", "autoWarkwark"];
Class.banshee.UPGRADES_TIER_4 = [/*"spectre", "spirit", "wraith", "phantom", */"autoBanshee"/*, "revenant", "bansheedrive", "shade"*/];
Class.bentDouble.UPGRADES_TIER_4 = ["bentTriple", "flexedDouble", "autoBentDouble", "doubleTriplet", "cleft", "doubleSpreadshot", "bentFlankDouble", "bentDoubleGunner", "bentDoubleMinigun", "splitDouble", "waarrkwaarrk"];
Class.bentHybrid.UPGRADES_TIER_4 = ["flexedHybrid", "smearer"/*, "splitHybrid"*/, "autoBentHybrid"/*, "spambrid", "junker"*/, "triprid"/*, "bentCatcher"*/];
Class.builder.UPGRADES_TIER_4 = [/*"blockade"*/];
Class.bushwhacker.UPGRADES_TIER_4 = ["autoBushwhacker"];
Class.buttbuttin.UPGRADES_TIER_4 = [/*"baton", */"marine", "harpy", "tailer"/*, "fang", "barber"*/, "mercenary", "autoButtbuttin"/*, "armament", "sifter"*/];
Class.bulwark.UPGRADES_TIER_4 = ["autoBulwark"];
Class.cruiser.UPGRADES_TIER_4 = [/*"superintendent"*/];
Class.cyclone.UPGRADES_TIER_4 = ["tornado_AR", "dustStorm", "autoCyclone", "tempest_AR", "gale", "whirlwind_AR", "trove"];
Class.deathStar.UPGRADES_TIER_4 = ["demise", "designer", "orbitalStrike", "autoDeathStar", "unity", "sequence"];
Class.destroyer.UPGRADES_TIER_4 = [/*"harrier", "toppler"*/];
Class.director.UPGRADES_TIER_4 = ["coordinator"];
Class.doubleTwin.UPGRADES_TIER_4 = ["doubleDual", "doubleMusket", "overdoubleTwin"];
Class.dual.UPGRADES_TIER_4 = [/*"threefold", */"doubleDual", "ravisher"/*, "vulture_AR", "nimrod_AR"*/, "autoDual"/*, "bifold", "dyadic"*/];
Class.falcon.UPGRADES_TIER_4 = ["autoFalcon"];
Class.fighter.UPGRADES_TIER_4 = [/*"boxer", "brawler", "sparrow", "blitz", */"autoFighter", /*"strider", "griffin", "shocker", "cockatoo", "pug", "mangle", */"scrimmer"];
Class.flankGuard.UPGRADES_TIER_4 = ["ternion"];
Class.gunner.UPGRADES_TIER_4 = ["dam"];
Class.healer.UPGRADES_TIER_4 = [/*"renovater", */"physician"];
Class.hewnDouble.UPGRADES_TIER_4 = ["hewnTriple", "autoHewnDouble", "cleft", "skewnDouble", "hewnFlankDouble", "hewnGunner", "warkwawarkrk"];
Class.hexaTank.UPGRADES_TIER_4 = ["tripleFlankTwin"];
Class.hexaTrapper.UPGRADES_TIER_4 = [...["mega", "auto"].map(x => `${x}HexaTrapper`), "hexaMachine", "octoTrapper", "designer", "cozen", "refuge", "coop", "hexaMech", "hexaTrapGuard", "band"];
Class.hunter.UPGRADES_TIER_4 = [/*"butcher", "reverberator"*/];
Class.launcher.UPGRADES_TIER_4 = [/*"seriemas", "supplant", "pumper"*/];
Class.machineGun.UPGRADES_TIER_4 = ["gadgetGun"];
Class.medic.UPGRADES_TIER_4 = ["intern", "ointment", "injection", "actuary"];
Class.mega3.UPGRADES_TIER_4 = [/*"ultra3", "queller3", "hurler3", "slinker3", "mega5", "volley4", "spirit", "crank", */"autoMega3", "sequence"];
Class.minigun.UPGRADES_TIER_4 = [/*"tommy", "machgun"*/];
Class.musket.UPGRADES_TIER_4 = ["doubleMusket"/*, "flintlock", "arbalest"*/, "matchlock", "autoMusket"/*, "duelist", "bifold"*/];
Class.octoTank.UPGRADES_TIER_4 = ["decaTank", "tempest_AR", "gale", "octoTrapper", "demise", "autoOctoTank", "consolidation"];
Class.overseer.UPGRADES_TIER_4 = [/*"inspector"*/];
Class.overtrapper.UPGRADES_TIER_4 = ["battletrapper", "captrapper", "foretrapper"];
Class.pounder.UPGRADES_TIER_4 = ["bruiser"];
Class.rifle.UPGRADES_TIER_4 = ["ransacker"/*, "thunderclap"*/];
Class.single.UPGRADES_TIER_4 = ["duo", "sharpshooter", "gadgetGun", "ternion", "coordinator", "bruiser", "tricker", "mono", "avian", "custodian", "assistant", "autoSingle"];
Class.sniper.UPGRADES_TIER_4 = ["sharpshooter"];
Class.spawner.UPGRADES_TIER_4 = [/*"handler"*/];
Class.stalker.UPGRADES_TIER_4 = ["autoStalker"];
Class.streamliner.UPGRADES_TIER_4 = ["autoStreamliner"];
Class.trapGuard.UPGRADES_TIER_4 = [/*"garrison", "maw", "overtrapGuard", */"custodian"];
Class.trapper.UPGRADES_TIER_4 = ["megaTrapper"/*, "sawedOff"*/, "tricker"];
Class.triAngle.UPGRADES_TIER_4 = ["avian"/*, "raven"*/, "phoenix"/*, "shoebill"*/];
Class.triTrapper.UPGRADES_TIER_4 = [/*"triBarricade", "triMegaTrapper", "warkwarkwark"*/];
Class.tripleTwin.UPGRADES_TIER_4 = ["quadTwin", "autoTriple", "bentTriple", "hewnTriple", "tripleFlankTwin", "tripleGunner", "warkwarkwark"];
Class.twin.UPGRADES_TIER_4 = ["duo"];
Class.underseer.UPGRADES_TIER_4 = [/*"conductor"*/];

module.exports = enable_missing_tanks;
if (!enable_missing_tanks) {
    removeUpgrades("basic", 1, ["desmos"]);

    removeUpgrades("machineGun", 2, ["sprayer"]);
    removeUpgrades("sniper", 2, ["marksman"]);
    removeUpgrades("twin", 2, ["helix"]);

    removeUpgrades("assassin", 3, ["single", "deadeye"]);
    addUpgrades("basic", 3, ["single"]);
    removeUpgrades("builder", 3, ["assembler"]);
    removeUpgrades("flankGuard", 3, ["quadruplex"]);
    removeUpgrades("hunter", 3, ["xHunter", "nimrod"]);
    addUpgrades("machineGun", 3, ["sprayer"]);
    removeUpgrades("minigun", 3, ["vulture"]);
    removeUpgrades("overseer", 3, ["overtrapper", "overgunner"]);
    removeUpgrades("rifle", 3, ["revolver"]);
    removeUpgrades("sprayer", 3, Class.sprayer.UPGRADES_TIER_3);
    removeUpgrades("triAngle", 3, ["phoenix", "vulture"]);
    removeUpgrades("tripleShot", 3, ["triplex"]);

    Class.sprayer.UPGRADES_TIER_3 = [/*"duster", "frother", */"scatterer"/*, "foamer"*/, "shower", "autoSprayer", "phoenix"];
} else {
    removeUpgrades("trapper", 3, ["barricade"]);
    removeUpgrades("twin", 3, ["bulwark"]);

    removeUpgrades("single", 4, ["custodian"]);

    try {
        require("../../entityAddons/betterArmsRace/tanks.js");
    } catch (error) {
        if (error.code !== "MODULE_NOT_FOUND") {
            throw error;
        }
    }
};

if (Config.teams == 1) {
    removeUpgrades("directordrive", 3, ["underdrive"]);
};

if (!free_tier_4) return;
Object.keys(Class).forEach(type => {
    if (Class[type].UPGRADES_TIER_4) {
        Class[type].UPGRADES_TIER_3 ??= [];
        Class[type].UPGRADES_TIER_3.push(...Class[type].UPGRADES_TIER_4);
        Class[type].UPGRADES_TIER_4 = [];
    }
});
