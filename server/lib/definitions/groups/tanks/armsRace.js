const { combineStats, removeUpgrades, makeAuto, makeBattle, makeBird, makeCap, makeDrive, makeFlank, makeFore, makeGuard, makeGunner, makeMenu, makeOver, makeRadialAuto, makeStorm, makeVortex, weaponArray, weaponMirror, weaponStack } = require("../../facilitators.js");
const { base, statnames } = require("../../constants.js");
const g = require("../../gunvals.js");
const preset = require("../../presets.js");

// Set the below variable to true to disable the Level 60 requirement for Tier 4, like arras.io.
const free_tier_4 = true;

// Set the below variable to true to enable tanks that would otherwise be inaccessible in Arms Race.
// This will also enable the Better Arms Race addon if it is present.
const enable_missing_tanks = false;

// Placeholder Marker
const placeholder = {
    UPGRADE_COLOR: "black",
    UPGRADE_TOOLTIP: "PLACEHOLDER MOCKUP"
};

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
    UPGRADES_TIER_3: ["jalopy", "machineGunner"/*, "dieselTrapper"*/, "polluter", "autoDiesel", "foamer"],
    UPGRADES_TIER_4: [/*"gizmo"*/]
};
Class.directordrive = makeDrive("director");
Class.directordrive.UPGRADES_TIER_3 = ["directorstorm", "overdrive", "cruiserdrive", "underdrive", "spawnerdrive", "autoDirectordrive", "honchodrive", "doperdrive"];
Class.directordrive.UPGRADES_TIER_4 = ["managerdrive"];
Class.doper = {
    PARENT: "genericTank",
    LABEL: "Doper",
    DANGER: 6,
    STAT_NAMES: statnames.drone,
    BODY: Class.director.BODY,
    GUNS: [
        {
            POSITION: {
                LENGTH: 5,
                WIDTH: 11,
                ASPECT: 1.3,
                X: 8
            },
            PROPERTIES: {
                SHOOT_SETTINGS: combineStats([g.drone, g.doper]),
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
                LENGTH: 6,
                WIDTH: 1,
                ASPECT: -5,
                X: 8
            }
        }
    ],
    UPGRADES_TIER_3: ["brisker", "dopeseer", "mosey", "overdose", "issuer", "junkie", "doperdrive", "autoDoper"],
    UPGRADES_TIER_4: ["controller"]
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
    UPGRADES_TIER_3: ["foreman", "baltimore", "foundry", "bigCheese", "autoHoncho", "honchodrive", "junkie"],
    UPGRADES_TIER_4: ["minister"]
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
                SHOOT_SETTINGS: combineStats([g.trapSpray, g.machineGun, { size: 2 / 3, spray: 5 }]),
                TYPE: "trap",
                STAT_CALCULATOR: "trap"
            }
        }
    ],
    UPGRADES_TIER_3: [/*"dieselTrapper", */"barricade", "equalizer"/*, "machineGuard", "encircler", "machineMech", "triMachine"*/, "expeller"/*, "autoMachineTrapper", "deviation"*/, "frother"],
    UPGRADES_TIER_4: [/*"machineMegaTrapper"*/]
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
    "doper",
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
    "sprayer",
    "trapGuard",
    "triAngle",
    "tripleShot",
    "underseer",
    "wark"
];
for (let i = 0; i < autoTanksT3.length; i++) {
    let type = autoTanksT3[i];
    const alreadyDefined = Class[`auto${type.charAt(0).toUpperCase() + type.slice(1)}`] ? true : false;

    if (!alreadyDefined) Class[`auto${type.charAt(0).toUpperCase() + type.slice(1)}`] = makeAuto(type);
    Class[`megaAuto${type.charAt(0).toUpperCase() + type.slice(1)}`] = makeAuto(type, `Mega Auto-${Class[type].LABEL}`, preset.makeAuto.mega);
    Class[`tripleAuto${type.charAt(0).toUpperCase() + type.slice(1)}`] = makeAuto(type, `Triple Auto-${Class[type].LABEL}`, preset.makeAuto.triple);

    if (Config.arms_race || !alreadyDefined) {
        Class[`auto${type.charAt(0).toUpperCase() + type.slice(1)}`].UPGRADES_TIER_4 = ["mega", "triple"].map(x => `${x}Auto${type.charAt(0).toUpperCase() + type.slice(1)}`);
    } else {
        Class[`auto${type.charAt(0).toUpperCase() + type.slice(1)}`].UPGRADES_TIER_4 = [];
    };
};

const driveTanksT3 = [
    ["cruiser", "swarm"],
    "doper",
    "honcho",
    ["spawner", "minion"],
    ["underseer", "sunchip", "Underdrive"]
];
for (let i = 0; i < driveTanksT3.length; i++) {
    if (!Array.isArray(driveTanksT3[i])) driveTanksT3[i] = [driveTanksT3[i]];
    let type = driveTanksT3[i][0];
    let projectile = driveTanksT3[i][1] ??= "drone";
    let typedrive = driveTanksT3[i][2] ??= `${Class[driveTanksT3[i][0]].LABEL}drive`;

    Class[typedrive.charAt(0).toLowerCase() + typedrive.slice(1).replace(/[\s-]+/g, "")] = makeDrive(type, typedrive, projectile);
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
    ["sprayer",     "Shower",       "Powder",           "Spritz",       "Waterspout",       undefined,  "Slosher"],
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

    const alreadyDefined = Class[typeDirector] ? true : false;

    if (!alreadyDefined) Class[typeDirector] = makeOver(type, director, preset.hybrid);
    Class[typeOverseer] = makeOver(type, overseer);
    Class[typeCruiser] = makeBattle(type, cruiser, preset.hybrid);
    Class[typeSpawner] = makeCap(type, spawner, preset.hybrid);
    Class[typeHoncho] = makeFore(type, honcho, preset.makeFore.hybrid);
    Class[typeDirectordrive] = makeDrive(typeDirector, directordrive);

    if (Config.arms_race || !alreadyDefined) {
        Class[typeDirector].UPGRADES_TIER_4 = [typeOverseer, typeCruiser, typeSpawner, typeDirectordrive, typeHoncho];
    } else {
        Class[typeDirector].UPGRADES_TIER_4 = [];
    };
};

Class.autoAuto3.UPGRADES_TIER_4.push(...["Auto5", "Mega3", "Auto4", "Banshee", "Sniper3", "Crowbar", "Combo"].map(x => `auto${x}`));
Class.autoDirectordrive = makeAuto("directordrive", "Auto-Directordrive", preset.makeAuto.drive);
Class.autoDirectordrive.UPGRADES_TIER_4 = [...["mega", "triple"].map(x => `${x}AutoDirectordrive`), ...["Directorstorm", "Overdrive", "Cruiserdrive", "Underdrive", "Spawnerdrive", "Honchodrive", "Doperdrive"].map(x => `auto${x}`)];
Class.autoDoper.UPGRADES_TIER_4.push(...["Brisker", "Dopeseer", "Mosey", "Overdose", "Issuer", "Junkie", "Doperdrive"].map(x => `auto${x}`));
Class.autoHexaTank.UPGRADES_TIER_4.push(...["OctoTank", "Cyclone", "DeathStar", "Mingler", "Combo"].map(x => `auto${x}`));
Class.autoSprayer.UPGRADES_TIER_4.push(...["Redistributor", "Phoenix", "Atomizer", "Focal"/*, "Frother", "Foamer"*/, "Shower"].map(x => `auto${x}`));
Class.baltimore = {
    PARENT: "genericTank",
    LABEL: "Baltimore",
    DANGER: 7,
    STAT_NAMES: statnames.swarm,
    BODY: Class.cruiser.BODY,
    GUNS: weaponMirror({
        POSITION: {
            LENGTH: 12,
            WIDTH: 8.7,
            ASPECT: 0.75,
            X: 3,
            Y: 4.6
        },
        PROPERTIES: {
            SHOOT_SETTINGS: combineStats([g.swarm, g.honcho]),
            TYPE: "swarm",
            SYNCS_SKILLS: true,
            STAT_CALCULATOR: "swarm"
        }
    }, { delayIncrement: 0.5 }),
    UPGRADES_TIER_4: ["autoBaltimore"]
};
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
                DELAY: 2 / 3
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
                DELAY: 1 / 3
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
    ], { delayIncrement: 1 / 6 })
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
        }, 3, {lengthOffset: 2, delayIncrement: 1 / 3})
    ]
};
Class.brisker = {
    PARENT: "genericTank",
    LABEL: "Brisker",
    DANGER: 7,
    STAT_NAMES: statnames.drone,
    BODY: Class.doper.BODY,
    GUNS: [
        {
            POSITION: {
                LENGTH: 5,
                WIDTH: 11,
                ASPECT: 1.3,
                X: 8
            },
            PROPERTIES: {
                SHOOT_SETTINGS: combineStats([g.drone, g.doper, g.doper]),
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
                LENGTH: 7,
                WIDTH: 0.5,
                ASPECT: -5,
                X: 8
            }
        }
    ],
    UPGRADES_TIER_4: ["adderall", "briskseer", "sailor", "adrenaline", "circulator", "briskerdrive", "addict", "autoBrisker"]
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
    ]),
    UPGRADES_TIER_4: ["autoCaptain"]
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
Class.corvette = {
    PARENT: "genericTank",
    LABEL: "Corvette",
    DANGER: 7,
    GUNS: [
        ...weaponMirror({
            POSITION: {
                LENGTH: 4,
                WIDTH: 8.2,
                ASPECT: 0.5,
                X: 12,
                Y: -4.5,
                ANGLE: 45,
                DELAY: 0.5
            },
            PROPERTIES: {
                SHOOT_SETTINGS: combineStats([g.swarm]),
                TYPE: "swarm",
                STAT_CALCULATOR: "swarm"
            }
        }),
        ...weaponMirror([
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
        ], {delayIncrement: 0.25})
    ],
    UPGRADES_TIER_4: ["autoCorvette", "bracer", "doubleCorvette"]
};
Class.courser = {
    PARENT: "genericTank",
    LABEL: "Courser",
    DANGER: 7,
    BODY: Class.assassin.BODY,
    CONTROLLERS: Class.hunter.CONTROLLERS,
    GUNS: [
        {
            POSITION: {
                LENGTH: 27,
                WIDTH: 8
            },
            PROPERTIES: {
                SHOOT_SETTINGS: combineStats([g.basic, g.sniper, g.assassin, g.hunter, g.hunterSecondary]),
                TYPE: "bullet"
            }
        },
        {
            POSITION: {
                LENGTH: 24,
                WIDTH: 11,
                DELAY: 0.25
            },
            PROPERTIES: {
                SHOOT_SETTINGS: combineStats([g.basic, g.sniper, g.assassin, g.hunter]),
                TYPE: "bullet"
            }
        },
        {
            POSITION: {
                LENGTH: 13,
                WIDTH: 11,
                ASPECT: -1.7
            }
        }
    ]
    //UPGRADES_TIER_4: ["sifter", "hunter3", "autoCourser", "immolater", "scrutiner", "acquirer", "cassowary", "garroter", "lyncher", "dyadic", "megaCourser", "flicher"]
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
Class.cruiserdrive.UPGRADES_TIER_4 = ["carrierdrive", "battledrive", "fortdrive", "autoCruiserdrive", "prescriber", "productiondrive", "helipad", "baltimoredrive", "moseydrive"];
Class.defect = makeBird("tripleShot", "Defect");
Class.directorstorm = makeStorm("director");
Class.directorstorm.UPGRADES_TIER_4 = ["vortex_AR", "overstorm", "spawnerstorm", "autoDirectorstorm", "honchostorm"/*, "downpourer"*/, "doperstorm"];
Class.doperdrive.UPGRADES_TIER_4 = ["briskerdrive", "doperstorm", "dopeseerdrive", "moseydrive", "dosedrive", "issuerdrive", "junkiedrive", "autoDoperdrive"];
Class.dopeseer = {
    PARENT: "genericTank",
    LABEL: "Dopeseer",
    DANGER: 7,
    STAT_NAMES: statnames.drone,
    BODY: Class.overseer.BODY,
    GUNS: weaponMirror([
        {
            POSITION: {
                LENGTH: 6,
                WIDTH: 12,
                ASPECT: 1.2,
                X: 8,
                ANGLE: 90
            },
            PROPERTIES: {
                SHOOT_SETTINGS: combineStats([g.drone, g.overseer, g.doper]),
                TYPE: "drone",
                AUTOFIRE: true,
                SYNCS_SKILLS: true,
                STAT_CALCULATOR: "drone",
                WAIT_TO_CYCLE: true,
                MAX_CHILDREN: 4
            }
        },
        {
            POSITION: {
                LENGTH: 6,
                WIDTH: 1,
                ASPECT: -5,
                X: 9,
                ANGLE: 90
            }
        }
    ]),
    UPGRADES_TIER_4: ["briskseer", /*"dopelord", "shade", */"autoDopeseer", "dopeseerdrive"/*, "adjurer", "mogul", "ganger"*/]
};
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
Class.doubleGunner.UPGRADES_TIER_4 = ["tripleGunner", "hewnGunner", "autoDoubleGunner", "bentDoubleGunner", "doubleFlankGunner", "doubleNailgun", "doubleMachineGunner", "overdoubleGunner", "doubleBattery", "doubleRimfire", "doubleVolley", "doubleEqualizer", "doubleCorvette"];
Class.enforcer = {
    PARENT: "genericTank",
    LABEL: "Enforcer",
    DANGER: 7,
    BODY: Class.assassin.BODY,
    GUNS: [
        {
            POSITION: {
                LENGTH: 23,
                WIDTH: 12
            }
        },
        {
            POSITION: {
                LENGTH: 27,
                WIDTH: 7
            },
            PROPERTIES: {
                SHOOT_SETTINGS: combineStats([g.basic, g.sniper, g.assassin, g.rifle]),
                TYPE: "bullet"
            }
        },
        {
            POSITION: {
                LENGTH: 13,
                WIDTH: 7,
                ASPECT: -2.2
            }
        }
    ]
    //UPGRADES_TIER_4: ["maverick", "examiner", "pique", "slayer", "autoEnforcer", "rifle3", "duelist", "armament", "merganser", "flicher"]
};
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
                SHOOT_SETTINGS: combineStats([g.trapSpray, g.machineGun, { size: 2 / 3, spray: 5 }]),
                TYPE: "trap",
                STAT_CALCULATOR: "trap"
            }
        }
    ], {delayIncrement: 0.5})
};
Class.foamer = {
    PARENT: "genericTank",
    LABEL: "Foamer",
    DANGER: 7,
    GUNS: [
        {
            POSITION: {
                LENGTH: 25,
                WIDTH: 9
            },
            PROPERTIES: {
                SHOOT_SETTINGS: combineStats([g.basic, g.machineGun, g.lowPower, g.pelleter, { recoil: 1.15 }]),
                TYPE: "bullet"
            }
        },
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
    ]
};
Class.foreman = {
    PARENT: "genericTank",
    LABEL: "Foreman",
    DANGER: 7,
    STAT_NAMES: statnames.drone,
    BODY: {
        FOV: 1.1 * base.FOV,
        SPEED: 14 / 15 * base.SPEED
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
    }),
    UPGRADES_TIER_4: ["autoForeman"]
};
Class.foundry = {
    PARENT: "genericTank",
    LABEL: "Foundry",
    DANGER: 7,
    STAT_NAMES: statnames.drone,
    BODY: Class.spawner.BODY,
    GUNS: [
        {
            POSITION: {
                LENGTH: 15,
                WIDTH: 15
            }
        },
        {
            POSITION: {
                LENGTH: 1,
                WIDTH: 17,
                X: 15
            },
            PROPERTIES: {
                SHOOT_SETTINGS: combineStats([g.minion, g.spawner/*, g.overseer*/, g.honcho/*, {size: 1.25, health: 2}*/]),
                TYPE: "minion",
                AUTOFIRE: true,
                SYNCS_SKILLS: true,
                STAT_CALCULATOR: "drone",
                WAIT_TO_CYCLE: true,
                MAX_CHILDREN: 3
            }
        },
        {
            POSITION: {
                LENGTH: 11.5,
                WIDTH: 17
            }
        }
    ],
    UPGRADES_TIER_4: ["autoFoundry"]
};
Class.frother = {
    PARENT: "genericTank",
    LABEL: "Frother",
    DANGER: 7,
    STAT_NAMES: statnames.trap,
    GUNS: [
        {
            POSITION: {
                LENGTH: 18,
                WIDTH: 5,
                ASPECT: 1.4
            }
        },
        {
            POSITION: {
                LENGTH: 3,
                WIDTH: 7,
                ASPECT: 1.3,
                X: 18
            },
            PROPERTIES: {
                SHOOT_SETTINGS: combineStats([g.trap, g.machineGun, g.lowPower, g.pelleter, { recoil: 1.15 }]),
                TYPE: "trap",
                STAT_CALCULATOR: "trap"
            }
        },
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
                SHOOT_SETTINGS: combineStats([g.trap, g.machineGun]),
                TYPE: "trap",
                STAT_CALCULATOR: "trap"
            }
        }
    ]
};
Class.hangar = {
    PARENT: "genericTank",
    LABEL: "Hangar",
    DANGER: 7,
    STAT_NAMES: statnames.drone,
    BODY: Class.cruiser.BODY,
    GUNS: [
        ...weaponMirror({
            POSITION: {
                LENGTH: 8.5,
                WIDTH: 8.2,
                ASPECT: 0.6,
                X: 3,
                Y: 5.5
            },
            PROPERTIES: {
                SHOOT_SETTINGS: combineStats([g.swarm]),
                TYPE: "swarm",
                STAT_CALCULATOR: "swarm"
            }
        }, {delayIncrement: 0.5}),
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
    UPGRADES_TIER_4: ["autoHangar", "airfield", "helipad"]
};
Class.honchodrive.UPGRADES_TIER_4 = ["honchostorm", "foredrive", "baltimoredrive", "foundrydrive", "bigCheesedrive", "autoHonchodrive", "junkiedrive"];
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
Class.issuer = {
    PARENT: "genericTank",
    LABEL: "Issuer",
    DANGER: 7,
    STAT_NAMES: statnames.drone,
    BODY: Class.spawner.BODY,
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
                SHOOT_SETTINGS: combineStats([g.minion, g.spawner, g.doper]),
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
        },
        {
            POSITION: {
                LENGTH: 6,
                WIDTH: 1,
                ASPECT: -5,
                X: 8
            }
        }
    ],
    UPGRADES_TIER_4: ["circulator", "autoIssuer", "issuerdrive"]
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
                SHOOT_SETTINGS: combineStats([g.basic, g.machineGun, g.diesel, g.jalopy]),
                TYPE: "bullet"
            }
        }
    ],
    UPGRADES_TIER_4: [/*"lorry", */"contaminator"/*, "jalopyTrapper"*/, "autoJalopy"/*, "clunker"*/]
};
Class.junkie = {
    PARENT: "genericTank",
    LABEL: "Junkie",
    DANGER: 7,
    STAT_NAMES: statnames.drone,
    BODY: Class.honcho.BODY,
    GUNS: [
        {
            POSITION: {
                LENGTH: 11,
                WIDTH: 14,
                ASPECT: 1.3,
                X: 2
            },
            PROPERTIES: {
                SHOOT_SETTINGS: combineStats([g.drone, g.honcho, g.doper]),
                TYPE: "drone",
                AUTOFIRE: true,
                SYNCS_SKILLS: true,
                STAT_CALCULATOR: "drone",
                MAX_CHILDREN: 3,
                WAIT_TO_CYCLE: true
            }
        },
        {
            POSITION: {
                LENGTH: 6,
                WIDTH: 1,
                ASPECT: -5,
                X: 8
            }
        }
    ],
    UPGRADES_TIER_4: ["addict", "junkiedrive", "autoJunkie"]
};
Class.laborer = {
    PARENT: "genericTank",
    LABEL: "Laborer",
    DANGER: 7,
    STAT_NAMES: statnames.drone,
    BODY: Class.spawner.BODY,
    GUNS: [
        {
            POSITION: {
                LENGTH: 4.5,
                WIDTH: 10,
                ASPECT: 1.2,
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
                TYPE: ["minion", {INVISIBLE: [0.06, 0.03]}],
                AUTOFIRE: true,
                SYNCS_SKILLS: true,
                STAT_CALCULATOR: "drone",
                WAIT_TO_CYCLE: true,
                MAX_CHILDREN: 4
            }
        },
        {
            POSITION: {
                LENGTH: 5.5,
                WIDTH: 11,
                ASPECT: -1.3,
                X: 6
            }
        }
    ],
    UPGRADES_TIER_4: ["autoLaborer"]
};
Class.megaSpawner = {
    PARENT: "genericTank",
    LABEL: "Mega Spawner",
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
                SHOOT_SETTINGS: combineStats([g.minion, g.spawner, { size: 0.8 }]),
                TYPE: "megaMinion",
                STAT_CALCULATOR: "drone",
                AUTOFIRE: true,
                SYNCS_SKILLS: true
            }
        }
    ],
    UPGRADES_TIER_4: ["autoMegaSpawner"]
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
Class.mosey = {
    PARENT: "genericTank",
    LABEL: "Mosey",
    DANGER: 7,
    FACING_TYPE: "locksFacing",
    STAT_NAMES: statnames.swarm,
    BODY: Class.cruiser.BODY,
    GUNS: weaponMirror([
        {
            POSITION: {
                LENGTH: 9,
                WIDTH: 8.2,
                ASPECT: 0.6,
                X: 5,
                Y: 4
            },
            PROPERTIES: {
                SHOOT_SETTINGS: combineStats([g.swarm, g.doper]),
                TYPE: "swarm",
                STAT_CALCULATOR: "swarm"
            }
        },
        {
            POSITION: {
                LENGTH: 7,
                WIDTH: 1,
                ASPECT: -2.5,
                X: 8,
                Y: 4
            }
        }
    ], {delayIncrement: 0.5}),
    UPGRADES_TIER_4: ["sailor", "autoMosey", "moseydrive"]
};
Class.overdose = {
    PARENT: "genericTank",
    LABEL: "Overdose",
    DANGER: 7,
    NECRO: [4],
    SIZE: 11.5,
    STAT_NAMES: statnames.drone,
    SHAPE: 4,
    MAX_CHILDREN: 15,
    BODY: Class.underseer.BODY,
    GUNS: weaponArray([
        {
            POSITION: {
                LENGTH: 6,
                WIDTH: 12,
                ASPECT: 1.2,
                X: 7.4,
                ANGLE: 90
            },
            PROPERTIES: {
                SHOOT_SETTINGS: combineStats([g.drone, g.sunchip, { reload: 0.8 }, g.doper]),
                TYPE: "sunchip",
                AUTOFIRE: true,
                SYNCS_SKILLS: true,
                STAT_CALCULATOR: "necro",
                WAIT_TO_CYCLE: true,
                DELAY_SPAWN: false
            }
        },
        {
            POSITION: {
                LENGTH: 6,
                WIDTH: 1,
                ASPECT: -5,
                X: 8,
                ANGLE: 90
            }
        }
    ], 2),
    UPGRADES_TIER_4: ["autoOverdose", "dosedrive", "adrenaline", "parasite", "virtuoso", "darkmatter", "ethereal", "hastener"]
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
Class.pentaseer = {
    PARENT: "genericTank",
    LABEL: "Pentaseer",
    DANGER: 7,
    NECRO: [5],
    SHAPE: 5,
    SIZE: 11.5,
    STAT_NAMES: statnames.drone,
    BODY: Class.underseer.BODY,
    GUNS: weaponMirror({
        POSITION: {
            LENGTH: 6,
            WIDTH: 11,
            ASPECT: 1.2,
            X: 7.4,
            ANGLE: 36
        },
        PROPERTIES: {
            SHOOT_SETTINGS: combineStats([g.drone, g.sunchip, { reload: 0.8, size: 1.5, health: 2 }]),
            TYPE: "pentachip",
            AUTOFIRE: true,
            SYNCS_SKILLS: true,
            STAT_CALCULATOR: "necro",
            WAIT_TO_CYCLE: true,
            DELAY_SPAWN: false,
            MAX_CHILDREN: 5
        }
    }, { delayIncrement: 0.5 }),
    UPGRADES_TIER_4: ["autoPentaseer"]
};
Class.prober = {
    PARENT: "genericTank",
    LABEL: "Prober",
    DANGER: 7,
    BODY: Class.hunter.BODY,
    CONTROLLERS: Class.hunter.CONTROLLERS,
    GUNS: [
        {
            POSITION: {
                LENGTH: 20,
                WIDTH: 12
            }
        },
        {
            POSITION: {
                LENGTH: 26,
                WIDTH: 5
            },
            PROPERTIES: {
                SHOOT_SETTINGS: combineStats([g.basic, g.sniper, g.rifle, g.hunter, g.hunterSecondary]),
                TYPE: "bullet"
            }
        },
        {
            POSITION: {
                LENGTH: 24,
                WIDTH: 7,
                DELAY: 0.25
            },
            PROPERTIES: {
                SHOOT_SETTINGS: combineStats([g.basic, g.sniper, g.rifle, g.hunter]),
                TYPE: "bullet"
            }
        }
    ]
    //UPGRADES_TIER_4: ["presage", "bifold", "pilfer", "autoProber", "carnage", "megaProber", "flicher"]
};
Class.prodigy = {
    PARENT: "genericTank",
    LABEL: "Prodigy",
    DANGER: 7,
    NECRO: [4],
    SIZE: 10.5,
    STAT_NAMES: statnames.mixed,
    SHAPE: 6,
    BODY: Class.underseer.BODY,
    GUNS: [
        ...weaponArray({
            POSITION: {
                LENGTH: 14,
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
        }, 3, {delayIncrement: 1 / 3}),
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
    ],
    UPGRADES_TIER_4: ["autoProdigy"]
};
Class.productionist = {
    PARENT: "genericTank",
    LABEL: "Productionist",
    DANGER: 7,
    STAT_NAMES: statnames.swarm,
    BODY: {
        SPEED: base.SPEED * 12 / 15,
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
    ], {delayIncrement: 0.5}),
    UPGRADES_TIER_4: ["autoProductionist"]
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
            TYPE: "autoTankGun"
        },
        {
            POSITION: {
                SIZE: 9,
                X: 8,
                ANGLE: -45,
                ARC: 190
            },
            TYPE: "autoTankGun"
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
Class.queller = {
    PARENT: "genericTank",
    LABEL: "Queller",
    DANGER: 7,
    GUNS: [
        ...weaponMirror({
            POSITION: {
                LENGTH: 17,
                WIDTH: 5,
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
                LENGTH: 19,
                WIDTH: 14
            },
            PROPERTIES: {
                SHOOT_SETTINGS: combineStats([g.basic, g.pounder, g.destroyer, g.artillery]),
                TYPE: "bullet",
                LABEL: "Heavy"
            }
        }
    ]
};
Class.railgun = {
    PARENT: "genericTank",
    LABEL: "Railgun",
    DANGER: 7,
    BODY: {
        SPEED: base.SPEED * 12 / 15,
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
                SHOOT_SETTINGS: combineStats([g.basic, g.twin, g.gunner, {speed: 1.2, size: 2 / 3}]),
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
Class.shower.UPGRADES_TIER_4.push("humidifier", "saturater", "mizzler", "suds", "douser", "autoShower");
Class.sniper3 = makeRadialAuto("sniper3gun", { isTurret: true, danger: 7, size: 13, label: "Sniper-3", body: { SPEED: 11 / 15 * base.SPEED, FOV: 1.25 * base.FOV } });
Class.sniper3.UPGRADES_TIER_4 = [/*"assassin3", "creeper", "sniper5", "phantom", "lever", */"autoSniper3", "alloy"/*, "rifle3", "hunter3"*/];
Class.spawnerdrive.UPGRADES_TIER_4 = ["spawnerstorm", "factorydrive", "autoSpawnerdrive", "megaSpawnerdrive", "productiondrive", "captaindrive", "airfield", "labordrive", "foundrydrive", "issuerdrive"];
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
                DELAY: 1 / 3
            },
            PROPERTIES: {
                SHOOT_SETTINGS: combineStats([g.basic, g.twin, g.tripleShot, { size: 4 / 3 }]),
                TYPE: "bullet"
            }
        }, { delayIncrement: 1 / 3 }),
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
Class.triMachine = makeFlank("machineTrapper", 3, "Tri-Machine", { extraStats: [g.flankGuard] });
Class.underdrive.UPGRADES_TIER_4 = ["necrodrive", "hexer", "autoUnderdrive", "infestordrive", "pentadrive"];
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
Class.zipper = {
    PARENT: "genericTank",
    LABEL: "Zipper",
    DANGER: 7,
    BODY: Class.minigun.BODY,
    GUNS: [
        ...weaponMirror({
            POSITION: {
                LENGTH: 9,
                WIDTH: 8.2,
                ASPECT: 0.6,
                X: 5,
                Y: 1.5,
                ANGLE: 22.5,
                DELAY: 0.25
            },
            PROPERTIES: {
                SHOOT_SETTINGS: combineStats([g.swarm]),
                TYPE: "swarm",
                STAT_CALCULATOR: "swarm"
            }
        }, {delayIncrement: 0.5}),
        ...weaponStack({
            POSITION: {
                LENGTH: 21,
                WIDTH: 8
            },
            PROPERTIES: {
                SHOOT_SETTINGS: combineStats([g.basic, g.minigun]),
                TYPE: "bullet"
            }
        }, 3, { lengthOffset: 2, delayIncrement: 1 / 3 })
    ],
    UPGRADES_TIER_4: ["autoZipper"]
};

// Tier 4 (Level 60)
const autoTanksT4 = [
    "atomizer",
    "auto4",
    "auto5",
    "banshee",
    "baltimore",
    "battleship",
    "bentDouble",
    "bentHybrid",
    "bigCheese",
    "brisker",
    "bulwark",
    "bushwhacker",
    "buttbuttin",
    "captain",
    "carrier",
    "combo",
    "commander",
    "corvette",
    "crowbar",
    "cyclone",
    "deathStar",
    "doubleGunner",
    "dopeseer",
    "dual",
    "factory",
    "falcon",
    "focal",
    "foreman",
    "fortress",
    "foundry",
    "fighter",
    "hangar",
    "hewnDouble",
    "infestor",
    "issuer",
    "jalopy",
    "junkie",
    "laborer",
    "maleficitor",
    "manager",
    "mega3",
    "megaSpawner",
    "mingler",
    "mosey",
    "musket",
    "nailgun",
    "necromancer",
    "octoTank",
    "overdose",
    "overgunner",
    "overlord",
    "overtrapper",
    "pentaseer",
    "phoenix",
    "prodigy",
    "productionist",
    "quadAngle",
    "redistributor",
    "shower",
    "single",
    "sniper3",
    "stalker",
    "streamliner",
    "warkwark",
    "zipper"
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

const driveTanksT4 = [
    ["baltimore", "swarm"],
    "banshee",
    ["battleship", "swarm", "Battledrive"],
    "bigCheese",
    "brisker",
    ["captain", "minion"],
    ["carrier", "swarm"],
    ["commander", "drone", "Instructor"],
    ["commander", "swarm", "Prescriber"],
    "dopeseer",
    ["factory", "minion"],
    ["foreman", "drone", "Foredrive"],
    ["fortress", "swarm", "Fortdrive"],
    ["foundry", "minion"],
    ["hangar", "minion", "Airfield"],
    ["hangar", "swarm", "Helipad"],
    ["infestor", "eggchip"],
    ["issuer", "minion"],
    "junkie",
    ["laborer", "minion", "Labordrive"],
    ["maleficitor", "sunchip", "Hexer"],
    "manager",
    ["megaSpawner", "megaMinion"],
    ["mosey", "swarm"],
    ["necromancer", "sunchip", "Necrodrive"],
    ["overdose", "sunchip", "Dosedrive"],
    "overgunner",
    ["overlord", "drone", "Tyrant"],
    "overtrapper",
    ["pentaseer", "pentachip", "Pentadrive"],
    ["productionist", "tinyMinion", "Productiondrive"],
    ["zipper", "swarm", "Colonizer"]
];
for (let i = 0; i < driveTanksT4.length; i++) {
    if (!Array.isArray(driveTanksT4[i])) driveTanksT4[i] = [driveTanksT4[i]];
    let type = driveTanksT4[i][0];
    let projectile = driveTanksT4[i][1] ??= "drone";
    let typedrive = driveTanksT4[i][2] ??= `${Class[driveTanksT4[i][0]].LABEL}drive`;

    Class[typedrive.charAt(0).toLowerCase() + typedrive.slice(1).replace(/[\s-]+/g, "")] = makeDrive(type, typedrive, projectile);
};

const hybridTanksT4 = [
    // Base Tank        //Director
    ["atomizer",        "Saturater"],
    ["buttbuttin",      "Mercenary"],
    ["crowbar",         "Spindle"],
    ["dual",            "Ravisher"],
    ["foamer",          "Douser"],
    ["focal",           "Mizzler"],
    ["frother",         "Suds"],
    ["jalopy",          "Contaminator"],
    ["musket",          "Matchlock"],
    ["pentaShot",       "Flexed Hybrid"],
    ["redistributor",   "Humidifier"],
    ["single",          "Assistant"],
    ["spreadshot",      "Smearer"],
    ["triplet",         "Triprid"]
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
                X: 9.5
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
    ], 3, { lengthOffset: 2, delayIncrement: 1 / 3 })
};
Class.adderall = {
    PARENT: "genericTank",
    LABEL: "Adderall",
    DANGER: 8,
    STAT_NAMES: statnames.drone,
    BODY: Class.brisker.BODY,
    GUNS: [
        {
            POSITION: {
                LENGTH: 5,
                WIDTH: 11,
                ASPECT: 1.3,
                X: 8
            },
            PROPERTIES: {
                SHOOT_SETTINGS: combineStats([g.drone, g.doper, g.doper, g.doper]),
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
                LENGTH: 8,
                WIDTH: 0.25,
                ASPECT: -5,
                X: 8
            }
        }
    ]
};
Class.addict = {
    PARENT: "genericTank",
    LABEL: "Addict",
    DANGER: 8,
    STAT_NAMES: statnames.drone,
    BODY: Class.junkie.BODY,
    GUNS: [
        {
            POSITION: {
                LENGTH: 11,
                WIDTH: 14,
                ASPECT: 1.3,
                X: 2
            },
            PROPERTIES: {
                SHOOT_SETTINGS: combineStats([g.drone, g.honcho, g.doper, g.doper]),
                TYPE: "drone",
                AUTOFIRE: true,
                SYNCS_SKILLS: true,
                STAT_CALCULATOR: "drone",
                MAX_CHILDREN: 3,
                WAIT_TO_CYCLE: true
            }
        },
        {
            POSITION: {
                LENGTH: 7,
                WIDTH: 0.5,
                ASPECT: -5,
                X: 8
            }
        }
    ]
};
Class.adrenaline = {
    PARENT: "genericTank",
    LABEL: "Adrenaline",
    DANGER: 8,
    NECRO: [4],
    SIZE: 11.5,
    STAT_NAMES: statnames.drone,
    SHAPE: 4,
    MAX_CHILDREN: 15,
    BODY: Class.overdose.BODY,
    GUNS: weaponArray([
        {
            POSITION: {
                LENGTH: 6,
                WIDTH: 12,
                ASPECT: 1.2,
                X: 7.4,
                ANGLE: 90
            },
            PROPERTIES: {
                SHOOT_SETTINGS: combineStats([g.drone, g.sunchip, {reload: 0.8}, g.doper, g.doper]),
                TYPE: "sunchip",
                AUTOFIRE: true,
                SYNCS_SKILLS: true,
                STAT_CALCULATOR: "necro",
                WAIT_TO_CYCLE: true,
                DELAY_SPAWN: false
            }
        },
        {
            POSITION: {
                LENGTH: 7,
                WIDTH: 0.5,
                ASPECT: -5,
                X: 8,
                ANGLE: 90
            }
        }
    ], 2)
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
                DELAY: 1 / 3
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
                DELAY: 2 / 3
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
Class.autoCruiserdrive = makeAuto("cruiserdrive", "Auto-Cruiserdrive", preset.makeAuto.swarmdrive);
Class.autoDirectorstorm = makeAuto("directorstorm", "Auto-Directorstorm", preset.makeAuto.storm);
Class.autoDoperdrive = makeAuto("doperdrive", "Auto-Doperdrive", preset.makeAuto.drive);
Class.autoDoubleFlank = makeAuto("doubleFlankTwin", "Auto-Double Flank");
Class.autoHexaTrapper = makeAuto(makeFlank("trapper", 6, "", { extraStats: [g.hexaTrapper], delayIncrement: 0.5, danger: 7 }), "Auto-Hexa-Trapper", preset.makeAuto.triple);
Class.autoHonchodrive = makeAuto("honchodrive", "Auto-Honchodrive", preset.makeAuto.drive);
Class.autoOverdrive = makeAuto("overdrive", "Auto-Overdrive", preset.makeAuto.drive);
Class.autoSpawnerdrive = makeAuto("spawnerdrive", "Auto-Spawnerdrive", preset.makeAuto.drive);
Class.autoTriple = makeAuto("tripleTwin", "Auto-Triple");
Class.autoUnderdrive = makeAuto("underdrive", "Auto-Underdrive", preset.makeAuto.drive);
Class.avian = makeBird("single", "Avian");
Class.battletrapper = makeBattle({
    PARENT: "genericTank",
    LABEL: "Trapper",
    DANGER: 6,
    STAT_NAMES: statnames.mixed,
    BODY: {
        FOV: base.FOV * 1.2,
        SPEED: base.SPEED * 14 / 15
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
                DELAY: 2 / 3
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
                DELAY: 1 / 3
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
    ], { delayIncrement: 1 / 6 })
}, 2, "Bent Double Gunner", { extraStats: [g.doubleTwin] });
Class.bentDoubleMinigun = makeFlank("bentMinigun", 2, "Bent Double Minigun", { extraStats: [g.doubleTwin] });
Class.bentDoubleMinigun.BODY = { ...Class.bentMinigun.BODY, SPEED: base.SPEED * 14 / 15 };
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
Class.bracer = {
    PARENT: "genericTank",
    LABEL: "Bracer",
    DANGER: 8,
    BODY: Class.nailgun.BODY,
    GUNS: [
        ...weaponMirror({
            POSITION: {
                LENGTH: 9,
                WIDTH: 8.2,
                ASPECT: 0.6,
                X: 4,
                Y: 1.5,
                ANGLE: 22.5,
                DELAY: 0.25
            },
            PROPERTIES: {
                SHOOT_SETTINGS: combineStats([g.swarm]),
                TYPE: "swarm",
                STAT_CALCULATOR: "swarm"
            }
        }, {delayIncrement: 0.5}),
        ...weaponMirror({
            POSITION: {
                LENGTH: 19,
                WIDTH: 3,
                Y: -2,
                DELAY: 0.25
            },
            PROPERTIES: {
                SHOOT_SETTINGS: combineStats([g.basic, g.pelleter, g.power, g.twin, g.nailgun, {size: 2 / 3}]),
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
Class.briskseer = {
    PARENT: "genericTank",
    LABEL: "Briskseer",
    DANGER: 8,
    STAT_NAMES: statnames.drone,
    BODY: Class.dopeseer.BODY,
    GUNS: weaponMirror([
        {
            POSITION: {
                LENGTH: 6,
                WIDTH: 12,
                ASPECT: 1.2,
                X: 8,
                ANGLE: 90
            },
            PROPERTIES: {
                SHOOT_SETTINGS: combineStats([g.drone, g.overseer, g.doper, g.doper]),
                TYPE: "drone",
                AUTOFIRE: true,
                SYNCS_SKILLS: true,
                STAT_CALCULATOR: "drone",
                WAIT_TO_CYCLE: true,
                MAX_CHILDREN: 4
            }
        },
        {
            POSITION: {
                LENGTH: 7,
                WIDTH: 0.5,
                ASPECT: -5,
                X: 9,
                ANGLE: 90
            }
        }
    ])
};
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
        SPEED: base.SPEED * 14 / 15
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
Class.central = {
    PARENT: "genericTank",
    LABEL: "Central",
    DANGER: 8,
    BODY: {
        FOV: base.FOV * 1.2
    },
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
                SHOOT_SETTINGS: combineStats([g.basic, g.machineGun, g.gatlingGun, g.central]),
                TYPE: "bullet"
            }
        },
        {
            POSITION: {
                LENGTH: 12,
                WIDTH: 10.25,
                ASPECT: -1.8
            }
        }
    ]
};
Class.circulator = {
    PARENT: "genericTank",
    LABEL: "Circulator",
    DANGER: 8,
    STAT_NAMES: statnames.drone,
    BODY: Class.issuer.BODY,
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
                SHOOT_SETTINGS: combineStats([g.minion, g.spawner, g.doper, g.doper]),
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
        },
        {
            POSITION: {
                LENGTH: 7,
                WIDTH: 0.5,
                ASPECT: -5,
                X: 8
            }
        }
    ]
};
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
Class.conductor = {
    PARENT: "genericTank",
    LABEL: "Conductor",
    DANGER: 8,
    NECRO: [4],
    SIZE: 11.5,
    STAT_NAMES: statnames.drone,
    SHAPE: 4,
    MAX_CHILDREN: 15,
    BODY: Class.underseer.BODY,
    INVISIBLE: Class.manager.INVISIBLE,
    GUNS: weaponArray({
        POSITION: {
            LENGTH: 5,
            WIDTH: 11,
            ASPECT: 1.2,
            X: 7.4,
            ANGLE: 90
        },
        PROPERTIES: {
            SHOOT_SETTINGS: combineStats([g.drone, g.sunchip, { reload: 0.8 }]),
            TYPE: "sunchip",
            AUTOFIRE: true,
            SYNCS_SKILLS: true,
            STAT_CALCULATOR: "necro",
            WAIT_TO_CYCLE: true,
            DELAY_SPAWN: false
        }
    }, 2)
};
Class.conjurer = {
    PARENT: "genericTank",
    LABEL: "Conjurer",
    DANGER: 8,
    NECRO: [4],
    SIZE: 11.5,
    STAT_NAMES: statnames.necro,
    SHAPE: 6,
    MAX_CHILDREN: 15,
    BODY: Class.underseer.BODY,
    ...preset.placeholder,
    GUNS: weaponArray([
        {
            POSITION: {
                LENGTH: 9,
                WIDTH: 8.2,
                ASPECT: 0.6,
                X: 4.4,
                ANGLE: 60
            }
        },
        {
            POSITION: {
                LENGTH: 6,
                WIDTH: 8,
                ASPECT: 1.5,
                X: 7.4
            }
        }
    ], 3)
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
Class.controller = {
    PARENT: "genericTank",
    LABEL: "Controller",
    DANGER: 8,
    STAT_NAMES: statnames.drone,
    BODY: Class.manager.BODY,
    INVISIBLE: Class.manager.INVISIBLE,
    TOOLTIP: preset.tooltip.invisible,
    GUNS: [
        {
            POSITION: {
                LENGTH: 6,
                WIDTH: 12,
                ASPECT: 1.2,
                X: 8
            },
            PROPERTIES: {
                SHOOT_SETTINGS: combineStats([g.drone, g.overseer, { reload: 0.5 }, g.doper]),
                TYPE: "drone",
                AUTOFIRE: true,
                SYNCS_SKILLS: true,
                STAT_CALCULATOR: "drone",
                WAIT_TO_CYCLE: true,
                MAX_CHILDREN: 8
            }
        },
        {
            POSITION: {
                LENGTH: 6,
                WIDTH: 1,
                ASPECT: -5,
                X: 10
            }
        }
    ]
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
Class.darkmatter = {
    PARENT: "genericTank",
    LABEL: "Darkmatter",
    DANGER: 8,
    NECRO: [4],
    SIZE: 11.5,
    STAT_NAMES: statnames.necro,
    SHAPE: 4,
    MAX_CHILDREN: 14,
    BODY: Class.necromancer.BODY,
    GUNS: weaponArray([
        {
            POSITION: {
                LENGTH: 6,
                WIDTH: 12,
                ASPECT: 1.2,
                X: 7.4,
                DELAY: 0.25
            },
            PROPERTIES: {
                SHOOT_SETTINGS: combineStats([g.drone, g.sunchip, g.doper]),
                TYPE: "sunchip",
                AUTOFIRE: true,
                SYNCS_SKILLS: true,
                STAT_CALCULATOR: "necro",
                WAIT_TO_CYCLE: true,
                DELAY_SPAWN: false
            }
        },
        {
            POSITION: {
                LENGTH: 6,
                WIDTH: 1,
                ASPECT: -5,
                X: 8
            }
        }
    ], 4, {delayIncrement: 0.75})
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
    ...preset.placeholder,
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
Class.doperstorm = makeStorm("doper");
Class.doubleCorvette = makeFlank({
    PARENT: "genericTank",
    LABEL: "Corvette",
    DANGER: 7,
    GUNS: [
        {
            POSITION: {
                LENGTH: 9,
                WIDTH: 8.2,
                ASPECT: 0.6,
                X: 5,
                ANGLE: 90,
                DELAY: 0.5
            },
            PROPERTIES: {
                SHOOT_SETTINGS: combineStats([g.swarm]),
                TYPE: "swarm",
                STAT_CALCULATOR: "swarm"
            }
        },
        ...weaponMirror([
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
        ], {delayIncrement: 0.25})
    ],
    UPGRADES_TIER_4: ["autoCorvette", "bracer", "doubleCorvette"]
}, 2, "Double Corvette", { extraStats: [g.doubleTwin] });
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
                DELAY: 4 / 5
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
                DELAY: 3 / 5
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
                DELAY: 2 / 5
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
                DELAY: 1 / 5
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
}, 2, "Double Spreadshot", { extraStats: [g.doubleTwin] });
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
Class.ethereal = {
    PARENT: "genericTank",
    LABEL: "Ethereal",
    DANGER: 8,
    NECRO: [4],
    SIZE: 11.5,
    TOOLTIP: `Press ${key("override")} and wait to turn your drones invisible.`,
    STAT_NAMES: statnames.necro,
    SHAPE: 4,
    MAX_CHILDREN: 20,
    BODY: Class.maleficitor.BODY,
    GUNS: [
        {
            POSITION: {
                LENGTH: 6,
                WIDTH: 12,
                ASPECT: 1.2,
                X: 7.4
            },
            PROPERTIES: {
                SHOOT_SETTINGS: combineStats([g.drone, g.sunchip, g.maleficitor, g.doper]),
                TYPE: ["sunchip", {INVISIBLE: [0.06, 0.03]}],
                AUTOFIRE: true,
                SYNCS_SKILLS: true,
                STAT_CALCULATOR: "necro",
                WAIT_TO_CYCLE: true,
                DELAY_SPAWN: false
            }
        },
        {
            POSITION: {
                LENGTH: 6,
                WIDTH: 1,
                ASPECT: -5,
                X: 8
            }
        }
    ]
};
Class.fenghuang = makeBird("focal", "Fenghuang");
Class.flexedDouble = makeFlank("pentaShot", 2, "Flexed Double", { extraStats: [g.doubleTwin] });
Class.foretrapper = makeFore({
    PARENT: "genericTank",
    LABEL: "Trapper",
    DANGER: 6,
    STAT_NAMES: statnames.mixed,
    BODY: {
        FOV: base.FOV * 1.2,
        SPEED: base.SPEED * 14 / 15
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
Class.handler = {
    PARENT: "genericTank",
    LABEL: "Handler",
    DANGER: 8,
    STAT_NAMES: statnames.drone,
    BODY: Class.spawner.BODY,
    INVISIBLE: Class.manager.INVISIBLE,
    GUNS: [
        {
            POSITION: {
                LENGTH: 4.5,
                WIDTH: 10,
                ASPECT: -1.1,
                X: 10.5
            }
        },
        {
            POSITION: {
                LENGTH: 1,
                WIDTH: 12,
                ASPECT: -1.1,
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
                LENGTH: 3.5,
                WIDTH: 12,
                ASPECT: -1.1,
                X: 8
            }
        }
    ]
};
Class.harpy = makeGunner("falcon", "Harpy", { gunLength: 20, noDeco: true, renderBehind: true });
Class.hastener = {
    PARENT: "genericTank",
    LABEL: "Hastener",
    DANGER: 8,
    NECRO: [5],
    SHAPE: 5,
    SIZE: 11.5,
    STAT_NAMES: statnames.drone,
    BODY: Class.pentaseer.BODY,
    GUNS: weaponMirror([
        {
            POSITION: {
                LENGTH: 6,
                WIDTH: 11,
                ASPECT: 1.2,
                X: 7.4,
                ANGLE: 36
            },
            PROPERTIES: {
                SHOOT_SETTINGS: combineStats([g.drone, g.sunchip, { reload: 0.8, size: 1.5, health: 2 }, g.doper]),
                TYPE: "pentachip",
                AUTOFIRE: true,
                SYNCS_SKILLS: true,
                STAT_CALCULATOR: "necro",
                WAIT_TO_CYCLE: true,
                DELAY_SPAWN: false,
                MAX_CHILDREN: 5
            }
        },
        {
            POSITION: {
                LENGTH: 6,
                WIDTH: 1,
                ASPECT: -5,
                X: 8,
                ANGLE: 36
            }
        }
    ], { delayIncrement: 0.5 })
};
Class.hewnFlankDouble = {
    PARENT: "genericTank",
    LABEL: "Hewn Flank Double",
    DANGER: 8,
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
                Y: -0.2,
                ANGLE: -160
            },
            PROPERTIES: {
                SHOOT_SETTINGS: combineStats([g.basic, g.twin, g.twin, g.spam, g.doubleTwin, g.tripleTwin, g.hewnDouble, { recoil: 1.15 }]),
                TYPE: "bullet"
            }
        }, {delayIncrement: 0.5}),
        ...weaponMirror({
            POSITION: {
                LENGTH: 19,
                WIDTH: 8,
                Y: -5.5,
                ANGLE: -265
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
        }, {delayIncrement: 0.5}), 3),
        // TODO: Figure out what these two are supposed to be.
        {
            POSITION: {
                LENGTH: 1,
                WIDTH: 1,
                X: 8,
                ANGLE: 150
            }
        },
        {
            POSITION: {
                LENGTH: 1,
                WIDTH: 1,
                X: 8,
                ANGLE: -15
            }
        }
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
                    ANGLE: 360 / 7,
                    DELAY: 1 / 3
                }
            },
            {
                POSITION: {
                    LENGTH: 3,
                    WIDTH: 7,
                    ASPECT: 1.7,
                    X: 15,
                    ANGLE: 360 / 7,
                    DELAY: 1 / 3
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
                    ANGLE: 360 / 7 * 2,
                    DELAY: 2 / 3
                }
            },
            {
                POSITION: {
                    LENGTH: 3,
                    WIDTH: 7,
                    ASPECT: 1.7,
                    X: 15,
                    ANGLE: 360 / 7 * 2,
                    DELAY: 2 / 3
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
                    ANGLE: 360 / 7 * 3,
                    DELAY: 1
                }
            },
            {
                POSITION: {
                    LENGTH: 3,
                    WIDTH: 7,
                    ASPECT: 1.7,
                    X: 15,
                    ANGLE: 360 / 7 * 3,
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
Class.honchostorm = makeStorm("honcho");
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
                WIDTH: 8
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
Class.inspector = {
    PARENT: "genericTank",
    LABEL: "Inspector",
    DANGER: 8,
    STAT_NAMES: statnames.drone,
    BODY: Class.overseer.BODY,
    INVISIBLE: Class.manager.INVISIBLE,
    GUNS: weaponMirror({
        POSITION: {
            LENGTH: 5,
            WIDTH: 11,
            ASPECT: 1.3,
            X: 8,
            ANGLE: 90
        },
        PROPERTIES: {
            SHOOT_SETTINGS: combineStats([g.drone, g.overseer, { size: 1 / 0.85 }]),
            TYPE: "drone",
            AUTOFIRE: true,
            SYNCS_SKILLS: true,
            STAT_CALCULATOR: "drone",
            WAIT_TO_CYCLE: true,
            MAX_CHILDREN: 4
        }
    })
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
Class.leader = {
    PARENT: "genericTank",
    LABEL: "Leader",
    DANGER: 8,
    STAT_NAMES: statnames.drone,
    BODY: Class.manager.BODY,
    INVISIBLE: [0, 1],
    TOOLTIP: preset.tooltip.fullInvisible,
    GUNS: [
        {
            POSITION: {
                LENGTH: 7,
                WIDTH: 13,
                ASPECT: 1.3,
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
Class.marine = makeGunner("ranger", "Marine");
Class.megaAutoDirectordrive = makeAuto("directordrive", "Mega Auto-Directordrive", preset.makeAuto.driveMega);
Class.megaAutoDouble = makeAuto("doubleTwin", "Mega Auto-Double", preset.makeAuto.mega);
Class.megaHexaTrapper = makeAuto(makeFlank("trapper", 6, "", { extraStats: [g.hexaTrapper], delayIncrement: 0.5, danger: 7 }), "Mega Hexa-Trapper", preset.makeAuto.mega);
Class.minister = {
    PARENT: "genericTank",
    LABEL: "Minister",
    DANGER: 8,
    STAT_NAMES: statnames.drone,
    BODY: Class.honcho.BODY,
    INVISIBLE: Class.manager.INVISIBLE,
    GUNS: [
        {
            POSITION: {
                LENGTH: 12,
                WIDTH: 15,
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
    ]
};
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
Class.overnailer = makeOver("nailgun", "Overnailer");
Class.overstorm = makeStorm("overseer", "Overstorm");
Class.parasite = {
    PARENT: "genericTank",
    LABEL: "Parasite",
    DANGER: 8,
    NECRO: [0],
    SIZE: 11.5,
    STAT_NAMES: statnames.necro,
    BODY: Class.infestor.BODY,
    GUNS: weaponArray(weaponMirror([
        {
            POSITION: {
                LENGTH: 10,
                WIDTH: 6,
                ASPECT: 1.2,
                X: 3,
                Y: 5,
                ANGLE: 90
            },
            PROPERTIES: {
                SHOOT_SETTINGS: combineStats([g.drone, g.sunchip, {reload: 0.5}, g.doper]),
                TYPE: "eggchip",
                AUTOFIRE: true,
                SYNCS_SKILLS: true,
                STAT_CALCULATOR: "necro",
                WAIT_TO_CYCLE: true,
                DELAY_SPAWN: false,
                MAX_CHILDREN: 10
            }
        },
        {
            POSITION: {
                LENGTH: 6,
                WIDTH: 1,
                ASPECT: -5,
                X: 8,
                Y: 5,
                ANGLE: 90
            }
        }
    ]), 2)
};
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
                DELAY: 2 / 3
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
                DELAY: 1 / 3
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
        }, 3, {delayIncrement: 1 / 3})
    ]
}, "Refuge");
Class.sailor = {
    PARENT: "genericTank",
    LABEL: "Sailor",
    DANGER: 8,
    FACING_TYPE: "locksFacing",
    STAT_NAMES: statnames.swarm,
    BODY: Class.mosey.BODY,
    GUNS: weaponMirror([
        {
            POSITION: {
                LENGTH: 9,
                WIDTH: 8.2,
                ASPECT: 0.6,
                X: 5,
                Y: 4
            },
            PROPERTIES: {
                SHOOT_SETTINGS: combineStats([g.swarm, g.doper, g.doper]),
                TYPE: "swarm",
                STAT_CALCULATOR: "swarm"
            }
        },
        {
            POSITION: {
                LENGTH: 8,
                WIDTH: 0.5,
                ASPECT: -2.5,
                X: 8,
                Y: 4
            }
        }
    ], {delayIncrement: 0.5})
};
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
            TYPE: "autoTankGun"
        },
        {
            POSITION: {
                SIZE: 9,
                X: 8,
                Y: 1,
                ANGLE: -90,
                ARC: 170
            },
            TYPE: "autoTankGun"
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
    DANGER: 8,
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
Class.spawnerstorm = makeStorm("spawner", "Spawnerstorm", "minion");
Class.splitDouble = makeFlank("splitShot", 2, "Split Double", { extraStats: [g.doubleTwin] });
Class.superintendent = {
    PARENT: "genericTank",
    LABEL: "Superintendent",
    DANGER: 8,
    FACING_TYPE: "locksFacing",
    STAT_NAMES: statnames.swarm,
    BODY: Class.cruiser.BODY,
    INVISIBLE: Class.manager.INVISIBLE,
    GUNS: weaponMirror({
        POSITION: {
            LENGTH: 9,
            WIDTH: 8.2,
            ASPECT: 0.6,
            X: 4,
            Y: 4
        },
        PROPERTIES: {
            SHOOT_SETTINGS: combineStats([g.swarm]),
            TYPE: "swarm",
            STAT_CALCULATOR: "swarm"
        }
    }, {delayIncrement: 0.5})
};
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
                DELAY: 2 / 3
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
                DELAY: 1 / 3
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
Class.virtuoso = {
    PARENT: "genericTank",
    LABEL: "Virtuoso",
    DANGER: 8,
    NECRO: [4],
    SIZE: 10.5,
    STAT_NAMES: statnames.mixed,
    SHAPE: 6,
    BODY: Class.underseer.BODY,
    GUNS: [
        ...weaponArray([
            {
                POSITION: {
                    LENGTH: 14,
                    WIDTH: 7,
                    ASPECT: 1.6,
                    ANGLE: 180
                },
                PROPERTIES: {
                    SHOOT_SETTINGS: combineStats([g.drone, g.sunchip, {reload: 0.5, size: 2, damage: 0.95}, g.doper]),
                    TYPE: "sunchip",
                    AUTOFIRE: true,
                    SYNCS_SKILLS: true,
                    STAT_CALCULATOR: "necro",
                    WAIT_TO_CYCLE: true,
                    DELAY_SPAWN: false,
                    MAX_CHILDREN: 2
                }
            },
            {
                POSITION: {
                    LENGTH: 6,
                    WIDTH: 1,
                    ASPECT: -5,
                    X: 8,
                    ANGLE: 60
                }
            }
        ], 3, {delayIncrement: 1 / 3}),
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
Class.vortex_AR = makeVortex("director", "Vortex");
Class.vulcan = {
    PARENT: "genericTank",
    LABEL: "Vulcan",
    DANGER: 8,
    BODY: {
        FOV: base.FOV * 1.1
    },
    ...preset.placeholder,
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
removeUpgrades("twin", 3, ["bulwark"]);

Class.director.UPGRADES_TIER_2.push("directordrive", "honcho", "doper");
Class.machineGun.UPGRADES_TIER_2.push("diesel", "machineTrapper");
Class.trapper.UPGRADES_TIER_2.push("pen", "mech", "machineTrapper", "wark");
Class.twin.UPGRADES_TIER_2.push("wark");

Class.artillery.UPGRADES_TIER_3.push("queller"/*, "forger"*/, "force", "autoArtillery"/*, "foctillery", "discharger"*/);
Class.assassin.UPGRADES_TIER_3.push("hitman", "sniper3", "enforcer", "courser");
Class.auto3.UPGRADES_TIER_3.push("sniper3", "crowbar", "autoAuto3", "combo");
Class.builder.UPGRADES_TIER_3.push(/*"forger", "stall", */"fashioner"/*, "charger"*/);
Class.cruiser.UPGRADES_TIER_3.push("productionist", "cruiserdrive", "hangar", "zipper", "baltimore", "mosey");
Class.destroyer.UPGRADES_TIER_3.push("megaTrapper", "queller", "autoDestroyer"/*, "hurler", "slinker"*/);
removeUpgrades("director", 3, ["bigCheese"]);
Class.doubleTwin.UPGRADES_TIER_3.push("doubleFlankTwin", "doubleGunner", "warkwark");
Class.gunner.UPGRADES_TIER_3.push("buttbuttin", "blower", "rimfire", "volley", "doubleGunner", "bentGunner", "equalizer", "corvette");
removeUpgrades("healer", 3, ["ambulance", "surgeon", "paramedic"]);
Class.healer.UPGRADES_TIER_3.push(/*"scientist", "nurse", */"triHealer"/*, "analyzer", "psychiatrist", "soother"*/);
Class.hexaTank.UPGRADES_TIER_3.push("autoHexaTank", "mingler", "combo");
Class.hunter.UPGRADES_TIER_3.push("autoHunter"/*, "megaHunter"*/, "prober", "courser");
Class.launcher.UPGRADES_TIER_3.push("rocketeer"/*, "pitcher", "cluster", "projector"*/, "heaver", "autoLauncher"/*, "hurler", "inception"*/);
Class.minigun.UPGRADES_TIER_3.push(/*"taser", "zipper", */"bentMinigun", "autoMinigun"/*, "widget"*/);
Class.overseer.UPGRADES_TIER_3.push("captain", "foreman", "dopeseer");
Class.pounder.UPGRADES_TIER_3.push("subverter", "deathStar");
Class.rifle.UPGRADES_TIER_3.push("autoRifle", "enforcer", "prober");
Class.smasher.UPGRADES_TIER_3.push(/*"banger", "drifter"*/);
Class.sniper.UPGRADES_TIER_3.push("railgun");
Class.spawner.UPGRADES_TIER_3.push("megaSpawner", "productionist", "spawnerdrive", "captain", "hangar", "laborer", "foundry", "issuer");
Class.sprayer.UPGRADES_TIER_3.push("frother", "foamer", "shower", "autoSprayer");
Class.trapGuard.UPGRADES_TIER_3.push("peashooter"/*, "incarcerator", "mechGuard"*/, "autoTrapGuard"/*, "machineGuard", "triTrapGuard"*/);
Class.triAngle.UPGRADES_TIER_3.push(/*"taser", "cockatiel", */"integrator", "defect", "quadAngle");
Class.triTrapper.UPGRADES_TIER_3.push(/*"triPen", "triMech", "triMachine", "triTrapGuard"*/);
Class.tripleShot.UPGRADES_TIER_3.push("splitShot", "autoTripleShot", "bentGunner", "bentMinigun", "defect", "waarrk");
Class.underseer.UPGRADES_TIER_3.push("autoUnderseer", "underdrive", "pentaseer", "prodigy", "overdose");

Class.artillery.UPGRADES_TIER_4 = [/*"blare", "erne"*/];
Class.assassin.UPGRADES_TIER_4 = [/*"executor", "finger"*/];
Class.auto4.UPGRADES_TIER_4 = [/*"auto6", "batter4", */"autoAuto4"/*, "wraith", "volley4", "chisel"*/, "trove"];
Class.auto5.UPGRADES_TIER_4 = [/*"auto7", "mega5", "auto6", "spectre", "sniper5", "pryer", */"autoAuto5"];
Class.autoDouble.UPGRADES_TIER_4 = ["megaAutoDouble", "tripleAutoDouble", "autoTriple", "autoHewnDouble", "autoBentDouble", "autoDoubleFlank", "autoDoubleGunner", "autoWarkwark"];
Class.banshee.UPGRADES_TIER_4 = [/*"spectre", "spirit", "wraith", "phantom", */"autoBanshee"/*, "revenant"*/, "bansheedrive"/*, "shade"*/];
Class.battleship.UPGRADES_TIER_4 = ["autoBattleship"];
Class.bentDouble.UPGRADES_TIER_4 = ["bentTriple", "flexedDouble", "autoBentDouble", "doubleTriplet", "cleft", "doubleSpreadshot", "bentFlankDouble", "bentDoubleGunner", "bentDoubleMinigun", "splitDouble", "waarrkwaarrk"];
Class.bentHybrid.UPGRADES_TIER_4 = ["flexedHybrid", "smearer"/*, "splitHybrid"*/, "autoBentHybrid"/*, "spambrid", "junker"*/, "triprid"/*, "bentCatcher"*/];
Class.bigCheese.UPGRADES_TIER_4 = ["autoBigCheese"];
Class.builder.UPGRADES_TIER_4 = [/*"blockade"*/];
Class.bushwhacker.UPGRADES_TIER_4 = ["autoBushwhacker"];
Class.buttbuttin.UPGRADES_TIER_4 = [/*"baton", */"marine", "harpy", "tailer"/*, "fang", "barber"*/, "mercenary", "autoButtbuttin"/*, "armament", "sifter"*/];
Class.bulwark.UPGRADES_TIER_4 = ["autoBulwark"];
Class.carrier.UPGRADES_TIER_4 = ["autoCarrier"];
Class.commander.UPGRADES_TIER_4 = ["autoCommander"];
Class.cruiser.UPGRADES_TIER_4 = ["superintendent"];
Class.cyclone.UPGRADES_TIER_4 = ["tornado_AR", "dustStorm", "autoCyclone", "tempest_AR", "gale", "whirlwind_AR", "trove"];
Class.deadeye.UPGRADES_TIER_4 = [];
Class.deathStar.UPGRADES_TIER_4 = ["demise", "designer", "orbitalStrike", "autoDeathStar", "unity", "sequence"];
Class.destroyer.UPGRADES_TIER_4 = [/*"harrier", "toppler"*/];
Class.director.UPGRADES_TIER_4 = ["coordinator"];
Class.doubleTwin.UPGRADES_TIER_4 = ["doubleDual", "doubleMusket", "overdoubleTwin"];
Class.dual.UPGRADES_TIER_4 = [/*"threefold", */"doubleDual", "ravisher"/*, "vulture_AR", "nimrod_AR"*/, "autoDual"/*, "bifold", "dyadic"*/];
Class.factory.UPGRADES_TIER_4 = ["autoFactory"];
Class.falcon.UPGRADES_TIER_4 = ["autoFalcon"];
Class.fighter.UPGRADES_TIER_4 = [/*"boxer", "brawler", "sparrow", "blitz", */"autoFighter", /*"strider", "griffin", "shocker", "cockatoo", "pug", "mangle", */"scrimmer"];
Class.flankGuard.UPGRADES_TIER_4 = ["ternion"];
Class.focal.UPGRADES_TIER_4 = ["central", "mizzler", "fenghuang", "autoFocal"];
Class.fortress.UPGRADES_TIER_4 = ["autoFortress"];
Class.fork.UPGRADES_TIER_4 = [];
Class.gunner.UPGRADES_TIER_4 = ["dam"];
Class.healer.UPGRADES_TIER_4 = [/*"renovater", */"physician"];
Class.hewnDouble.UPGRADES_TIER_4 = ["hewnTriple", "autoHewnDouble", "cleft", "skewnDouble", "hewnFlankDouble", "hewnGunner", "warkwawarkrk"];
Class.hexaTank.UPGRADES_TIER_4 = ["tripleFlankTwin"];
Class.hexaTrapper.UPGRADES_TIER_4 = [...["mega", "auto"].map(x => `${x}HexaTrapper`), "hexaMachine", "octoTrapper", "designer", "cozen", "refuge", "coop", "hexaMech", "hexaTrapGuard"];
Class.hunter.UPGRADES_TIER_4 = [/*"butcher", "reverberator"*/];
Class.infestor.UPGRADES_TIER_4 = ["autoInfestor"];
Class.launcher.UPGRADES_TIER_4 = [/*"seriemas", "supplant", "pumper"*/];
Class.machineGun.UPGRADES_TIER_4 = ["gadgetGun"];
Class.maleficitor.UPGRADES_TIER_4 = ["autoMaleficitor"];
Class.manager.UPGRADES_TIER_4 = ["leader", "inspector", "superintendent", "conductor", "handler", "minister", "managerdrive", "autoManager", "controller"];
Class.medic.UPGRADES_TIER_4 = ["intern", "ointment", "injection", "actuary"];
Class.mega3.UPGRADES_TIER_4 = [/*"ultra3", "queller3", "hurler3", "slinker3", "mega5", "volley4", "spirit", "crank", */"autoMega3", "sequence"];
Class.minigun.UPGRADES_TIER_4 = [/*"tommy", "machgun"*/];
Class.musket.UPGRADES_TIER_4 = ["doubleMusket"/*, "flintlock", "arbalest"*/, "matchlock", "autoMusket"/*, "duelist", "bifold"*/];
Class.nailgun.UPGRADES_TIER_4 = ["overnailer", "autoNailgun"];
Class.necromancer.UPGRADES_TIER_4 = ["autoNecromancer"];
Class.nimrod.UPGRADES_TIER_4 = [];
Class.octoTank.UPGRADES_TIER_4 = ["decaTank", "tempest_AR", "gale", "octoTrapper", "demise", "autoOctoTank", "consolidation"];
Class.overdrive.UPGRADES_TIER_4 = ["tyrant", "overtrapperdrive", "overgunnerdrive", "bansheedrive", "autoOverdrive", "instructor", "overstorm", "foredrive", "dopeseerdrive"];
Class.overlord.UPGRADES_TIER_4 = ["autoOverlord"];
Class.overseer.UPGRADES_TIER_4 = ["inspector"];
Class.overtrapper.UPGRADES_TIER_4 = ["battletrapper", "captrapper", "foretrapper"];
Class.pounder.UPGRADES_TIER_4 = ["bruiser"];
Class.revolver.UPGRADES_TIER_4 = [];
Class.rifle.UPGRADES_TIER_4 = ["ransacker"/*, "thunderclap"*/];
Class.single.UPGRADES_TIER_4 = ["duo", "sharpshooter", "gadgetGun", "ternion", "coordinator", "bruiser", "tricker", "mono", "avian", "custodian", "assistant", "autoSingle"];
Class.sniper.UPGRADES_TIER_4 = ["sharpshooter"];
Class.spawner.UPGRADES_TIER_4 = ["handler"];
Class.sprayer.UPGRADES_TIER_4 = [/*"stauncher"*/];
Class.stalker.UPGRADES_TIER_4 = ["autoStalker"];
Class.streamliner.UPGRADES_TIER_4 = ["autoStreamliner"];
Class.trapGuard.UPGRADES_TIER_4 = [/*"garrison", "maw", "overtrapGuard", */"custodian"];
Class.trapper.UPGRADES_TIER_4 = ["megaTrapper"/*, "sawedOff"*/, "tricker"];
Class.triAngle.UPGRADES_TIER_4 = ["avian"/*, "raven"*/, "phoenix"/*, "shoebill"*/];
Class.triTrapper.UPGRADES_TIER_4 = [/*"triBarricade", "triMegaTrapper", "warkwarkwark"*/];
Class.tripleTwin.UPGRADES_TIER_4 = ["quadTwin", "autoTriple", "bentTriple", "hewnTriple", "tripleFlankTwin", "tripleGunner", "warkwarkwark"];
Class.twin.UPGRADES_TIER_4 = ["duo"];
Class.underseer.UPGRADES_TIER_4 = ["conductor", "conjurer"];

const better_retrograde = require("../../groups/tanks/retrograde.js");
if (better_retrograde && Config.retrograde) {
    try {
        require("../../entityAddons/armsRaceRetrograde/tanks.js");
    } catch(error) {
        if (error.code !== "MODULE_NOT_FOUND") {
            throw error;
        }
    } 
};

module.exports = enable_missing_tanks;
if (!enable_missing_tanks) {
    removeUpgrades("basic", 1, ["whirlwind"]);

    //removeUpgrades("sniper", 2, ["marksman"]);

    removeUpgrades("assassin", 3, ["single"/*, "deadeye"*/]);
    Class.basic.UPGRADES_TIER_3 = ["single"];
    //removeUpgrades("builder", 3, ["assembler"]);
    //removeUpgrades("hunter", 3, ["xHunter", "nimrod"]);
    //removeUpgrades("minigun", 3, ["vulture"]);
    removeUpgrades("overseer", 3, ["overtrapper", "overgunner"]);
    //removeUpgrades("rifle", 3, ["revolver"]);
    //removeUpgrades("triAngle", 3, ["phoenix", "vulture"]);
} else {
    removeUpgrades("trapper", 3, ["barricade"]);
    removeUpgrades("twin", 3, ["bulwark"]);

    removeUpgrades("single", 4, ["custodian"]);

    try {
        require("../../entityAddons/betterArmsRace/tanks.js");
    } catch(error) {
        if (error.code !== "MODULE_NOT_FOUND") {
            throw error;
        }
    }
};

if (!free_tier_4) return;
Object.keys(Class).forEach(type => {
    if (Class[type].UPGRADES_TIER_4) {
        Class[type].UPGRADES_TIER_3 ??= [];
        Class[type].UPGRADES_TIER_3.push(...Class[type].UPGRADES_TIER_4);
        Class[type].UPGRADES_TIER_4 = [];
    }
});
