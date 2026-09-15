const { combineStats, skillSet, addUpgrades, removeUpgrades, makeAuto, makeBattle, makeBird, makeCap, makeFlank, makeFore, makeGuard, makeOver, makeRadialAuto, makeSnake, makeGunner, makeWhirlwind, weaponArray, weaponMirror, weaponStack } = require("../../facilitators.js");
const { base, dfltskl, smshskl, statnames } = require("../../constants.js");
const g = require("../../gunvals.js");
const preset = require("../../presets.js");
let tier4_AR = 3;

// EXTREMELY WIP!!

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
    ]
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
    ]
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
    ]
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
    ]
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
    ]
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
    ]
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
    ], {delayIncrement: 0.5})
};

// Tier 3 (Level 45)
const autoTanksT3 = [
    "artillery",
    "auto3",
    "destroyer",
    "diesel",
    "hexaTank",
    "honcho",
    "hunter",
    "launcher",
    "mech",
    "minigun",
    "pen",
    "rifle",
    //"sprayer",
    "trapGuard",
    "tripleShot",
    "underseer",
    "wark"
];
for (let i = 0; i < autoTanksT3.length; i++) {
    let type = autoTanksT3[i];
    Class[`auto${type.charAt(0).toUpperCase() + type.slice(1)}`] = makeAuto(type);
    Class[`megaAuto${type.charAt(0).toUpperCase() + type.slice(1)}`] = makeAuto(type, `Mega Auto-${Class[type].LABEL}`, preset.makeAuto.mega);
    Class[`tripleAuto${type.charAt(0).toUpperCase() + type.slice(1)}`] = makeAuto(type, `Triple Auto-${Class[type].LABEL}`, preset.makeAuto.triple);

    if (Config.arms_race) {
        addUpgrades(`auto${type.charAt(0).toUpperCase() + type.slice(1)}`, tier4_AR, [...["mega", "triple"].map(x => `${x}Auto${type.charAt(0).toUpperCase() + type.slice(1)}`)]);
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

    let director      = hybridTanksT3[i][1];
    let cruiser       = hybridTanksT3[i][2];
    let spawner       = hybridTanksT3[i][3];
    let honcho        = hybridTanksT3[i][4];
    let overseer      = hybridTanksT3[i][5] ??= `Over${Class[type].LABEL.charAt(0).toLowerCase() + Class[type].LABEL.slice(1)}`;
    let directordrive = hybridTanksT3[i][6] ??= `${director}drive`;

    function typeify(x) {
        return x.charAt(0).toLowerCase() + x.slice(1).replace(/[\s-]+/g, "");
    };
    let typeDirector = typeify(director);
    let typeOverseer = typeify(overseer);
    let typeCruiser = typeify(cruiser);
    let typeSpawner = typeify(spawner);
    let typeHoncho = typeify(honcho);
    let typeDirectordrive = typeify(directordrive);

    if (Class[typeDirector] == undefined) {
        Class[typeDirector] = makeOver(type, director, preset.hybrid);
    }
    Class[typeOverseer] = makeOver(type, overseer);
    Class[typeCruiser] = makeBattle(type, cruiser, preset.hybrid);
    Class[typeSpawner] = makeCap(type, spawner, preset.hybrid);
    Class[typeHoncho] = makeFore(type, honcho, preset.makeFore.hybrid);
    Class[typeDirectordrive] = makeOver(type, directordrive, { ...preset.hybrid, drive: true });

    if (Config.arms_race) {
        addUpgrades(typeDirector, tier4_AR, [typeOverseer, typeCruiser, typeSpawner, typeDirectordrive, typeHoncho]);
    };
};

Class.autoDirectordrive = makeAuto("directordrive", "Auto-Directordrive", preset.makeAuto.drive);
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
    }, 3)
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
            TYPE: ["crowbarTurretTank", {INDEPENDENT: true}],
            POSITION: {
                SIZE: 6,
                X: 19.5,
                ARC: 180,
                LAYER: 1
            }
        },
        {
            TYPE: ["crowbarTurretTank", {INDEPENDENT: true}],
            POSITION: {
                SIZE: 6,
                X: 29.75,
                ARC: 180,
                LAYER: 1
            }
        },
        {
            TYPE: ["crowbarTurretTank", {INDEPENDENT: true}],
            POSITION: {
                SIZE: 6,
                X: 40,
                ARC: 180,
                LAYER: 1
            }
        }
    ]
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
Class.doubleGunner = makeFlank("gunner", 2, "Double Gunner", { extraStats: [g.doubleTwin] });
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
    ]
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
    ], 6, {delayIncrement: 0.5})
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
    ]
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

// Tier 4 (Level 60)
const autoTanksT4 = [
    "auto4",
    "auto5",
    "banshee",
    "bentDouble",
    "bentHybrid",
    "buttbuttin",
    "combo",
    "crowbar",
    "cyclone",
    "deathStar",
    "doubleGunner",
    "dual",
    "hewnDouble",
    "jalopy",
    "mega3",
    "mingler",
    "musket",
    "octoTank",
    "single",
    "sniper3",
    "sprayer",
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
            TYPE: ["crowbarTurretTank", {INDEPENDENT: true}],
            POSITION: {
                SIZE: 6,
                X: 19.5,
                ANGLE: 90,
                ARC: 180,
                LAYER: 1
            }
        },
        {
            TYPE: ["crowbarTurretTank", {INDEPENDENT: true}],
            POSITION: {
                SIZE: 6,
                X: 29.75,
                ANGLE: 90,
                ARC: 180,
                LAYER: 1
            }
        },
        {
            TYPE: ["crowbarTurretTank", {INDEPENDENT: true}],
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
                LENGTH: 20,
                WIDTH: 8,
                Y: 5.5
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
    FACING_TYPE: ["spin", {speed: 0.05}],
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
            TYPE: ["crowbarTurretTank", {INDEPENDENT: true}],
            POSITION: {
                SIZE: 6,
                X: 19.5,
                ARC: 180,
                LAYER: 1
            }
        },
        {
            TYPE: ["crowbarTurretTank", {INDEPENDENT: true}],
            POSITION: {
                SIZE: 6,
                X: 29.75,
                ARC: 180,
                LAYER: 1
            }
        },
        {
            TYPE: ["crowbarTurretTank", {INDEPENDENT: true}],
            POSITION: {
                SIZE: 6,
                X: 40,
                ARC: 180,
                LAYER: 1
            }
        }
    ]
};

// Tier 5 (Level 75)
Class.custodian = makeGuard("single", "Custodian");

// Class Tree
if (Config.arms_race) {
    removeUpgrades("basic", 1, ["desmos"]);

    removeUpgrades("machineGun", 2, ["sprayer"]);
    removeUpgrades("sniper", 2, ["marksman"]);
    removeUpgrades("twin", 2, ["helix"]);

    removeUpgrades("assassin", 3, ["single", "deadeye"]);
    removeUpgrades("builder", 3, ["assembler"]);
    removeUpgrades("flankGuard", 3, ["quadruplex"]);
    removeUpgrades("healer", 3, ["ambulance", "surgeon", "paramedic"]);
    removeUpgrades("hunter", 3, ["xHunter", "nimrod"]);
    removeUpgrades("minigun", 3, ["vulture"]);
    removeUpgrades("overseer", 3, ["overtrapper", "overgunner"]);
    removeUpgrades("rifle", 3, ["revolver"]);
    removeUpgrades("sprayer", 3, Class.sprayer.UPGRADES_TIER_3);
    removeUpgrades("triAngle", 3, ["phoenix", "vulture"]);
    removeUpgrades("tripleShot", 3, ["triplex"]);
    removeUpgrades("director", 3, ["bigCheese"]);
    removeUpgrades("twin", 3, ["bulwark"]);

    addUpgrades("basic", 1, []);
        addUpgrades("basic", 2, []);
            addUpgrades("basic", 3, ["single"]);
                addUpgrades("single", tier4_AR, ["duo", "sharpshooter", "gadgetGun", "ternion", "coordinator", "bruiser", "tricker", "mono", "avian", "custodian", "assistant", "autoSingle"]);

            addUpgrades("healer", 3, [/*"scientist", "nurse", "triHealer", "analyzer", "psychiatrist", "soother"*/]);
                addUpgrades("healer", tier4_AR, [/*"renovater", "physician"*/]);
                addUpgrades("medic", tier4_AR, [/*"intern", "ointment", "injection", "actuary"*/]);
            ////addUpgrades("scientist", tier4_AR, ["surgeon"/*, "professor", "chemist"*/]);
            ////addUpgrades("nurse", tier4_AR, ["paramedic"/*, "therapist", "clinician"*/]);
            ////addUpgrades("triHealer", tier4_AR, ["ambulance"/*, "healer3", "hexaHealer", "chemist"*/]);
            ////addUpgrades("analyzer", tier4_AR, [/*"accountant", "clerk", "guru"*/]);
            ////addUpgrades("psychiatrist", tier4_AR, [/*"therapist", "guru", "actuary"*/]);
            ////addUpgrades("soother", tier4_AR, [/*"doctor", "antidote", "medicare"*/]);

            addUpgrades("smasher", 3, [/*"banger", "drifter"*/]);
                addUpgrades("megaSmasher", tier4_AR, []);
                addUpgrades("spike", tier4_AR, []);
                addUpgrades("autoSmasher", tier4_AR, []);
                addUpgrades("landmine", tier4_AR, []);
                addUpgrades("bonker", tier4_AR, []);
                ///addUpgrades("banger", tier4_AR, []);
                ///addUpgrades("drifter", tier4_AR, []);

        addUpgrades("twin", 2, ["wark"]);
            addUpgrades("twin", 3, []);
                addUpgrades("twin", tier4_AR, ["duo"]);
                addUpgrades("dual", tier4_AR, [/*"threefold", */"doubleDual", "ravisher"/*, "vulture_AR", "nimrod_AR"*/, "autoDual"/*, "bifold", "dyadic"*/]);
                addUpgrades("musket", tier4_AR, ["doubleMusket"/*, "flintlock", "arbalest"*/, "matchlock", "autoMusket"/*, "duelist", "bifold"*/]);

            addUpgrades("doubleTwin", 3, ["doubleFlankTwin", "doubleGunner", "warkwark"]);
                addUpgrades("doubleTwin", tier4_AR, ["doubleDual", "doubleMusket", "overdoubleTwin"]);
                addUpgrades("tripleTwin", tier4_AR, ["quadTwin", "autoTriple", "bentTriple", "hewnTriple", "tripleFlankTwin", "tripleGunner", "warkwarkwark"]);
                addUpgrades("hewnDouble", tier4_AR, ["hewnTriple", "autoHewnDouble", "cleft", "skewnDouble", "hewnFlankDouble", "hewnGunner", "warkwawarkrk"]);
                addUpgrades("autoDouble", tier4_AR, ["megaAutoDouble", "tripleAutoDouble", "autoTriple", "autoHewnDouble", "autoBentDouble", "autoDoubleFlank", "autoDoubleGunner", "autoWarkwark"]);
                addUpgrades("bentDouble", tier4_AR, ["bentTriple", "flexedDouble", "autoBentDouble", "doubleTriplet", "cleft", "doubleSpreadshot", "bentFlankDouble", "bentDoubleGunner", "bentDoubleMinigun", "splitDouble", "waarrkwaarrk"]);
                addUpgrades("doubleFlankTwin", tier4_AR, ["quadTwin", "tripleFlankTwin", "hewnFlankDouble", "autoDoubleFlank", "bentFlankDouble", "doubleFlankGunner", "hipwatch", "scuffler", "warkwawawark"]);
                addUpgrades("doubleGunner", tier4_AR, ["tripleGunner", "hewnGunner", "autoDoubleGunner", "bentDoubleGunner", "doubleFlankGunner", "doubleNailgun", "doubleMachineGunner", "overdoubleGunner", "doubleBattery", "doubleRimfire", "doubleVolley", "doubleEqualizer"]);
                addUpgrades("warkwark", tier4_AR, ["warkwarkwark", "warkwawarkrk", "autoWarkwark", "waarrkwaarrk", "warkwawawark", "doubleEqualizer", "guardrail", "sealer", "setup"]);

            addUpgrades("tripleShot", 3, ["splitShot", "autoTripleShot", "bentGunner", "bentMinigun", "defect", "waarrk"]);
                addUpgrades("tripleShot", tier4_AR, []);
                addUpgrades("pentaShot", tier4_AR, []);
                addUpgrades("spreadshot", tier4_AR, []);
                addUpgrades("bentHybrid", tier4_AR, ["flexedHybrid", "smearer"/*, "splitHybrid"*/, "autoBentHybrid"/*, "spambrid", "junker"*/, "triprid"/*, "bentCatcher"*/]);
                //addUpgrades("bentDouble", tier4_AR);
                addUpgrades("triplet", tier4_AR, []);
                addUpgrades("splitShot", tier4_AR, []);
                addUpgrades("autoTripleShot", tier4_AR, []);
                addUpgrades("bentGunner", tier4_AR, []);
                addUpgrades("bentMinigun", tier4_AR, []);
                addUpgrades("defect", tier4_AR, []);
                addUpgrades("waarrk", tier4_AR, []);

            addUpgrades("gunner", 3, ["buttbuttin", "blower", "rimfire", "volley", "doubleGunner", "bentGunner", "equalizer"]);
                addUpgrades("gunner", tier4_AR, ["dam"]);
                addUpgrades("autoGunner", tier4_AR, []);
                addUpgrades("nailgun", tier4_AR, []);
                addUpgrades("auto4", tier4_AR, []);
                addUpgrades("machineGunner", tier4_AR, []);
                addUpgrades("gunnerTrapper", tier4_AR, []);
                addUpgrades("cyclone", tier4_AR, ["tornado_AR", "dustStorm", "autoCyclone", "tempest_AR", "gale", "whirlwind_AR", "trove"]);
                addUpgrades("overgunner", tier4_AR, []);
                addUpgrades("battery", tier4_AR, []);
                addUpgrades("buttbuttin", tier4_AR, [/*"baton", */"marine", "harpy", "tailer"/*, "fang", "barber"*/, "mercenary", "autoButtbuttin"/*, "armament", "sifter"*/]);
                addUpgrades("blower", tier4_AR, []);
                addUpgrades("rimfire", tier4_AR, []);
                addUpgrades("volley", tier4_AR, []);
                //addUpgrades("doubleGunner", tier4_AR);
                //addUpgrades("bentGunner", tier4_AR, []);
                addUpgrades("equalizer", tier4_AR, []);

            addUpgrades("hexaTank", 3, ["autoHexaTank", "mingler", "combo"]);
                addUpgrades("hexaTank", tier4_AR, ["tripleFlankTwin"]);
                addUpgrades("octoTank", tier4_AR, ["decaTank", "tempest_AR", "gale", "octoTrapper", "demise", "autoOctoTank", "consolidation"]);
                addUpgrades("hexaTrapper", tier4_AR, [...["mega", "auto"].map(x => `${x}HexaTrapper`), "hexaMachine", "octoTrapper", "designer", "cozen", "refuge", "coop", "hexaMech", "hexaTrapGuard", "band"]);
                //addUpgrades("cyclone", tier4_AR);
                addUpgrades("deathStar", tier4_AR, ["demise", "designer", "orbitalStrike", "autoDeathStar", "unity", "sequence"]);
                addUpgrades("autoHexaTank", tier4_AR, ["OctoTank", "Cyclone", "DeathStar", "Mingler", "Combo"].map(x => `auto${x}`));
                addUpgrades("mingler", tier4_AR, ["unity", "alloy", "gale", "cozen", "autoMingler"]);
                addUpgrades("combo", tier4_AR, ["consolidation", "sequence", "trove", "alloy", "autoCombo", "band"]);

            addUpgrades("wark", 3, ["warkwark", "waarrk", "equalizer", "hexaTrapper", "hutch", "cog", "expeller", "bulwark", "coalesce", "autoWark"]);
                addUpgrades("wark", tier4_AR, []);
                //addUpgrades("warkwark", tier4_AR);
                //addUpgrades("waarrk", tier4_AR);
                //addUpgrades("equalizer", tier4_AR);
                //addUpgrades("hexaTrapper", tier4_AR);
                addUpgrades("hutch", tier4_AR, []);
                addUpgrades("cog", tier4_AR, []);
                addUpgrades("expeller", tier4_AR, []);
                addUpgrades("bulwark", tier4_AR, []);
                addUpgrades("coalesce", tier4_AR, []);
                addUpgrades("autoWark", tier4_AR, []);

        addUpgrades("sniper", 2, []);
            addUpgrades("sniper", 3, ["railgun"]);
                addUpgrades("sniper", tier4_AR, ["sharpshooter"]);
                addUpgrades("bushwhacker", tier4_AR, []);
                addUpgrades("railgun", tier4_AR, []);

            addUpgrades("assassin", 3, ["hitman", "sniper3"/*, "enforcer", "courser"*/]);
                addUpgrades("assassin", tier4_AR, [/*"executor", "finger"*/]);
                addUpgrades("ranger", tier4_AR, []);
                addUpgrades("falcon", tier4_AR, []);
                addUpgrades("stalker", tier4_AR, []);
                addUpgrades("autoAssassin", tier4_AR, []);
                //addUpgrades("buttbuttin", tier4_AR);
                addUpgrades("hitman", tier4_AR, []);
                addUpgrades("sniper3", tier4_AR, []);
            ////addUpgrades("enforcer", tier4_AR, []);
            ////addUpgrades("courser", tier4_AR, []);

            addUpgrades("hunter", 3, ["autoHunter"/*, "megaHunter", "prober", "courser"*/]);
                addUpgrades("hunter", tier4_AR, [/*"butcher", "reverberator"*/]);
                addUpgrades("predator", tier4_AR, []);
                addUpgrades("poacher", tier4_AR, []);
                addUpgrades("ordnance", tier4_AR, []);
                addUpgrades("dual", tier4_AR, []);
                addUpgrades("autoHunter", tier4_AR, []);
            ////addUpgrades("megaHunter", tier4_AR, []);
            ////addUpgrades("prober", tier4_AR, []);
                //addUpgrades("courser", tier4_AR);

            addUpgrades("minigun", 3, [/*"taser", "zipper", */"bentMinigun", "autoMinigun"/*, "widget"*/]);
                addUpgrades("minigun", tier4_AR, [/*"tommy", "machgun"*/]);
                addUpgrades("streamliner", tier4_AR, []);
                addUpgrades("nailgun", tier4_AR, []);
                addUpgrades("cropDuster", tier4_AR, []);
                addUpgrades("barricade", tier4_AR, []);
                addUpgrades("subverter", tier4_AR, []);
            ////addUpgrades("taser", tier4_AR, []);
            ////addUpgrades("zipper", tier4_AR, []);
                //addUpgrades("bentMinigun", tier4_AR, []);
                addUpgrades("autoMinigun", tier4_AR, []);
            ////addUpgrades("widget", tier4_AR, []);

            addUpgrades("rifle", 3, ["autoRifle"/*, "enforcer", "courser"*/]);
                addUpgrades("rifle", tier4_AR, ["ransacker"/*, "thunderclap"*/]);
                addUpgrades("musket", tier4_AR, []);
                addUpgrades("crossbow", tier4_AR, []);
                addUpgrades("armsman", tier4_AR, []);
                addUpgrades("autoRifle", tier4_AR, []);
                //addUpgrades("enforcer", tier4_AR);
                //addUpgrades("courser", tier4_AR);

        addUpgrades("machineGun", 2, ["diesel", "machineTrapper"]);
            addUpgrades("machineGun", 3, ["sprayer"]);
                addUpgrades("machineGun", tier4_AR, ["gadgetGun"]);
                addUpgrades("sprayer", tier4_AR, [/*"duster", "frother", */"scatterer"/*, "foamer"*/, "shower", "autoSprayer", "phoenix"]);

            addUpgrades("artillery", 3, [/*"queller", "forger", */"force", "autoArtillery"/*, "foctillery", "discharger"*/]);
                addUpgrades("artillery", tier4_AR, [/*"blare", "erne"*/]);
                addUpgrades("mortar", tier4_AR, []);
                addUpgrades("ordnance", tier4_AR, []);
                addUpgrades("beekeeper", tier4_AR, []);
                addUpgrades("fieldGun", tier4_AR, []);
            ////addUpgrades("queller", tier4_AR, []);
            ////addUpgrades("forger", tier4_AR, []);
                addUpgrades("force", tier4_AR, []);
                addUpgrades("autoArtillery", tier4_AR, []);
            ////addUpgrades("foctillery", tier4_AR, []);
            ////addUpgrades("discharger", tier4_AR, []);

            //addUpgrades("minigun", 3);

            //addUpgrades("gunner", 3);

            addUpgrades("diesel", 3, ["jalopy", "machineGunner"/*, "dieselTrapper"*/, "polluter", "autoDiesel"]);
                addUpgrades("diesel", tier4_AR, [/*"foamer", "gizmo"*/]);
                addUpgrades("jalopy", tier4_AR, [/*"lorry", */"contaminator"/*, "jalopyTrapper"*/, "autoJalopy"/*, "clunker"*/]);
                //addUpgrades("machineGunner", tier4_AR);
            ////addUpgrades("dieselTrapper", tier4_AR, []);
                addUpgrades("polluter", tier4_AR, []);
                addUpgrades("autoDiesel", tier4_AR, []);

            addUpgrades("machineTrapper", 3, [/*"dieselTrapper", */"barricade", "equalizer"/*, "machineGuard", "encircler", "machineMech", "triMachine"*/, "expeller"/*, "autoMachineTrapper", "deviation"*/]);
                addUpgrades("machineTrapper", tier4_AR, [/*"frother", "machineMegaTrapper"*/]);
                //addUpgrades("dieselTrapper", tier4_AR, []);
                //addUpgrades("barricade", tier4_AR);
                //addUpgrades("equalizer", tier4_AR);
            ////addUpgrades("machineGuard", tier4_AR, []);
            ////addUpgrades("encircler", tier4_AR, []);
            ////addUpgrades("machineMech", tier4_AR, []);
            ////addUpgrades("triMachine", tier4_AR, []);
                //addUpgrades("expeller", tier4_AR, []);
            ////addUpgrades("autoMachineTrapper", tier4_AR, []);
            ////addUpgrades("deviation", tier4_AR, []);

        addUpgrades("flankGuard", 2, []);
            addUpgrades("flankGuard", 3);
                addUpgrades("flankGuard", tier4_AR, ["ternion"]);
                //addUpgrades("tripleTwin", tier4_AR);

              //addUpgrades("hexaTank", 3);

            addUpgrades("triAngle", 3, [/*"taser", "cockatiel", */"integrator", "defect"/*, "quadAngle"*/]);
                addUpgrades("triAngle", tier4_AR, ["avian"/*, "raven"*/, "phoenix"/*, "shoebill"*/]);
                addUpgrades("fighter", tier4_AR, []);
                addUpgrades("booster", tier4_AR, []);
                addUpgrades("falcon", tier4_AR, []);
                addUpgrades("bomber", tier4_AR, []);
                addUpgrades("autoTriAngle", tier4_AR, []);
                addUpgrades("surfer", tier4_AR, []);
                addUpgrades("eagle", tier4_AR, []);
            ////addUpgrades("taser", tier4_AR, []);
            ////addUpgrades("cockatiel", tier4_AR, []);
                addUpgrades("integrator", tier4_AR, []);
                addUpgrades("defect", tier4_AR, []);
            ////addUpgrades("quadAngle", tier4_AR, []);

            addUpgrades("auto3", 3, ["sniper3", "crowbar", "autoAuto3", "combo"]);
                addUpgrades("auto5", tier4_AR, [/*"auto7", "mega5", "auto6", "spectre", "sniper5", "pryer", */"autoAuto5"]);
                addUpgrades("mega3", tier4_AR, [/*"ultra3", "queller3", "hurler3", "slinker3", "mega5", "volley4", "spirit", "crank", */"autoMega3", "sequence"]);
                addUpgrades("auto4", tier4_AR, [/*"auto6", "batter4", */"autoAuto4"/*, "wraith", "volley4", "chisel"*/, "trove"]);
                addUpgrades("banshee", tier4_AR, [/*"spectre", "spirit", "wraith", "phantom", */"autoBanshee"/*, "revenant", "bansheedrive", "shade"*/]);
                addUpgrades("sniper3", tier4_AR, [/*"assassin3", "creeper", "sniper5", "phantom", "lever", */"autoSniper3", "alloy"/*, "rifle3", "hunter3"*/]);
                addUpgrades("crowbar", tier4_AR, [/*"pryer", "crank", "chisel", "lever", */"spindle", "autoCrowbar", "dualbar"/*, "spanner"*/, "wrench"]);
                addUpgrades("autoAuto3", tier4_AR, ["Auto5", "Mega3", "Auto4", "Banshee", "Sniper3", "Crowbar", "Combo"].map(x => `auto${x}`));
                //addUpgrades("combo", tier4_AR);

            addUpgrades("trapGuard", 3, ["peashooter"/*, "incarcerator", "mechGuard"*/, "autoTrapGuard"/*, "machineGuard", "triTrapGuard"*/]);
                addUpgrades("trapGuard", tier4_AR, [/*"garrison", "maw", "overtrapGuard", */"custodian"]);
                //addUpgrades("bushwhacker", tier4_AR);
                //addUpgrades("gunnerTrapper", tier4_AR);
                //addUpgrades("bomber", tier4_AR);
                addUpgrades("conqueror", tier4_AR, []);
                //addUpgrades("bulwark", tier4_AR);
                addUpgrades("peashooter", tier4_AR, []);
            ////addUpgrades("incarcerator", tier4_AR, []);
            ////addUpgrades("mechGuard", tier4_AR, []);
                addUpgrades("autoTrapGuard", tier4_AR, []);
            ////addUpgrades("machineGuard", tier4_AR, []);
            ////addUpgrades("triTrapGuard", tier4_AR, []);

              addUpgrades("triTrapper", 3, [/*"triPen", "triMech", "triMachine", "triTrapGuard"*/]);
                addUpgrades("triTrapper", tier4_AR, [/*"triBarricade", "triMegaTrapper", "warkwarkwark"*/]);
                addUpgrades("fortress", tier4_AR, []);
                //addUpgrades("hexaTrapper", tier4_AR);
                addUpgrades("septaTrapper", tier4_AR, []);
                addUpgrades("architect", tier4_AR, []);
            ////addUpgrades("triPen", tier4_AR, []);
            ////addUpgrades("triMech", tier4_AR, []);
                //addUpgrades("triMachine", tier4_AR);
                //addUpgrades("triTrapGuard", tier4_AR);

        addUpgrades("director", 2, ["directordrive", "honcho"/*, "doper"*/]);
            addUpgrades("director", 3, []);
                addUpgrades("director", tier4_AR, ["coordinator"]);
                addUpgrades("manager", tier4_AR, []);

            addUpgrades("overseer", 3, ["captain", "foreman"/*, "dopeseer"*/]);
                addUpgrades("overseer", tier4_AR, [/*"inspector"*/]);
                addUpgrades("overlord", tier4_AR, []);
                addUpgrades("banshee", tier4_AR, []);
                addUpgrades("autoOverseer", tier4_AR, []);
                addUpgrades("overdrive", tier4_AR, []);
                addUpgrades("commander", tier4_AR, []);
                addUpgrades("captain", tier4_AR, []);
                addUpgrades("foreman", tier4_AR, []);
            ////addUpgrades("dopeseer", tier4_AR, []);

            addUpgrades("cruiser", 3, ["productionist", "cruiserdrive"/*, "hangar", "zipper", "baltimore", "mosey"*/]);
                addUpgrades("cruiser", tier4_AR, [/*"superintendent"*/]);
                addUpgrades("carrier", tier4_AR, []);
                addUpgrades("battleship", tier4_AR, []);
                //addUpgrades("fortress", tier4_AR);
                addUpgrades("autoCruiser", tier4_AR, []);
                //addUpgrades("commander", tier4_AR);
                addUpgrades("productionist", tier4_AR, []);
                addUpgrades("cruiserdrive", tier4_AR, []);
            ////addUpgrades("hangar", tier4_AR, []);
                //addUpgrades("zipper", tier4_AR);
            ////addUpgrades("baltimore", tier4_AR, []);
            ////addUpgrades("mosey", tier4_AR, []);

            addUpgrades("underseer", 3, ["autoUnderseer", "underdrive"/*, "pentaseer"*/]);
                addUpgrades("underseer", tier4_AR, [/*"conductor"*/]);
                addUpgrades("necromancer", tier4_AR, []);
                addUpgrades("maleficitor", tier4_AR, []);
                addUpgrades("infestor", tier4_AR, []);
                addUpgrades("autoUnderseer", tier4_AR, []);
                addUpgrades("underdrive", tier4_AR, []);
            ////addUpgrades("pentaseer", tier4_AR, []);

            addUpgrades("spawner", 3, ["megaSpawner", "productionist", "spawnerdrive", "captain"/*, "hangar", "laborer", "foundry", "issuer"*/]);
                addUpgrades("spawner", tier4_AR, [/*"handler"*/]);
                addUpgrades("factory", tier4_AR, []);
                addUpgrades("autoSpawner", tier4_AR, []);
                addUpgrades("megaSpawner", tier4_AR, []);
                //addUpgrades("productionist", tier4_AR);
                addUpgrades("spawnerdrive", tier4_AR, []);
                //addUpgrades("captain", tier4_AR);
                //addUpgrades("hangar", tier4_AR);
            ////addUpgrades("laborer", tier4_AR, []);
            ////addUpgrades("foundry", tier4_AR, []);
            ////addUpgrades("issuer", tier4_AR, []);

            addUpgrades("directordrive", 3, [/*"directorstorm", */"overdrive", "cruiserdrive", "underdrive", "spawnerdrive", "autoDirectordrive", "honchodrive"/*, "doperdrive"*/]);
                addUpgrades("directordrive", tier4_AR, [/*"managerdrive"*/]);
                ////addUpgrades("directorstorm", tier4_AR, []);
                //addUpgrades("overdrive", tier4_AR);
                //addUpgrades("cruiserdrive", tier4_AR);
                //addUpgrades("underdrive", tier4_AR);
                //addUpgrades("spawnerdrive", tier4_AR);
                addUpgrades("autoDirectordrive", tier4_AR, [...["mega", "triple"].map(x => `${x}AutoDirectordrive`)]);
                addUpgrades("honchodrive", tier4_AR, []);
                ////addUpgrades("doperdrive", tier4_AR, []);

            addUpgrades("honcho", 3, ["foreman"/*, "baltimore", "foundry"*/, "bigCheese", "autoHoncho", "honchodrive"/*, "junkie"*/]);
                addUpgrades("honcho", tier4_AR, [/*"minister"*/]);
                //addUpgrades("foreman", tier4_AR);
                //addUpgrades("baltimore", tier4_AR);
                //addUpgrades("foundry", tier4_AR);
                addUpgrades("bigCheese", tier4_AR, []);
                addUpgrades("autoHoncho", tier4_AR, []);
                //addUpgrades("honchodrive", tier4_AR);
            ////addUpgrades("junkie", tier4_AR, []);

        ////addUpgrades("doper", 3, [/*"brisker", "dopeseer", "mosey", "issuer", "junkie", "doperdrive", "autoDoper"*/]);
            ////addUpgrades("doper", tier4_AR, [/*"controller"*/]);
            ////addUpgrades("brisker", tier4_AR, []);
                //addUpgrades("dopeseer", tier4_AR);
                //addUpgrades("mosey", tier4_AR);
                //addUpgrades("issuer", tier4_AR);
                //addUpgrades("junkie", tier4_AR);
                //addUpgrades("doperdrive", tier4_AR);
            ////addUpgrades("autoDoper", tier4_AR, []);

        addUpgrades("pounder", 2, []);
            addUpgrades("pounder", 3, ["subverter"]);
                addUpgrades("pounder", tier4_AR, ["bruiser"]);
                addUpgrades("shotgun", tier4_AR, []);
                //addUpgrades("eagle", tier4_AR);
                //addUpgrades("subverter", tier4_AR);

            addUpgrades("destroyer", 3, [/*"megaTrapper", "queller", */"autoDestroyer"/*, "hurler", "slinker"*/]);
                addUpgrades("destroyer", tier4_AR, [/*"harrier", "toppler"*/]);
                //addUpgrades("conqueror", tier4_AR);
                addUpgrades("annihilator", tier4_AR, []);
                addUpgrades("hybrid", tier4_AR, []);
                addUpgrades("construct", tier4_AR, []);
                //addUpgrades("blower", tier4_AR);
            ////addUpgrades("megaTrapper", tier4_AR, []);
                //addUpgrades("queller", tier4_AR);
                addUpgrades("autoDestroyer", tier4_AR, []);
            ////addUpgrades("hurler", tier4_AR, []);
            ////addUpgrades("slinker", tier4_AR, []);

            addUpgrades("builder", 3, [/*"forger", "stall", */"fashioner"/*, "charger"*/]);
                addUpgrades("builder", tier4_AR, [/*"blockade"*/]);
                //addUpgrades("construct", tier4_AR);
                addUpgrades("autoBuilder", tier4_AR, []);
                addUpgrades("engineer", tier4_AR, []);
                addUpgrades("boomer", tier4_AR, []);
                //addUpgrades("architect", tier4_AR);
                //addUpgrades("conqueror", tier4_AR);
                //addUpgrades("forger", tier4_AR);
            ////addUpgrades("stall", tier4_AR, []);
                addUpgrades("fashioner", tier4_AR, []);
            ////addUpgrades("charger", tier4_AR, []);

            //addUpgrades("artillery", 3, []);

            addUpgrades("launcher", 3, ["rocketeer"/*, "pitcher", "cluster", "projector"*/, "heaver", "autoLauncher"/*, "hurler", "inception"*/]);
                addUpgrades("launcher", tier4_AR, [/*"seriemas", "supplant", "pumper"*/]);
                addUpgrades("skimmer", tier4_AR, []);
                addUpgrades("twister", tier4_AR, []);
                addUpgrades("swarmer", tier4_AR, []);
                addUpgrades("sidewinder", tier4_AR, []);
                //addUpgrades("fieldGun", tier4_AR);
                addUpgrades("rocketeer", tier4_AR, []);
            ////addUpgrades("pitcher", tier4_AR, []);
            ////addUpgrades("cluster", tier4_AR, []);
            ////addUpgrades("projector", tier4_AR, []);
                addUpgrades("heaver", tier4_AR, []);
                addUpgrades("autoLauncher", tier4_AR, []);
            ////addUpgrades("hurler", tier4_AR, []);
            ////addUpgrades("inception", tier4_AR, []);

        addUpgrades("trapper", 2, ["pen", "mech", "machineTrapper", "wark"]);
            addUpgrades("trapper", 3, [/*"megaTrapper"*/]);
                addUpgrades("trapper", tier4_AR, ["tricker"]);
                //addUpgrades("barricade", tier4_AR);
                addUpgrades("overtrapper", tier4_AR, ["battletrapper", "captrapper", "foretrapper"]);
                //addUpgrades("megaTrapper", tier4_AR);

            //addUpgrades("builder", 3);

            //addUpgrades("triTrapper", 3);

            //addUpgrades("trapGuard", 3);

            addUpgrades("pen", 3, [/*"stall", "triPen", "encircler", "incarcerator", "operator", "cockatiel", */"hutch", "interner", "autoPen"]);
                addUpgrades("pen", tier4_AR, [/*"fortifier", "sty"*/]);
                //addUpgrades("stall", tier4_AR, []);
                //addUpgrades("triPen", tier4_AR, []);
                //addUpgrades("encircler", tier4_AR, []);
                //addUpgrades("incarcerator", tier4_AR, []);
            ////addUpgrades("operator", tier4_AR, []);
                //addUpgrades("cockatiel", tier4_AR, []);
                //addUpgrades("hutch", tier4_AR, []);
            ////addUpgrades("interner", tier4_AR, []);
            ////addUpgrades("autoPen", tier4_AR, []);

            addUpgrades("mech", 3, ["engineer"/*, "triMech", "machineMech", "mechGuard", "operator"*/, "cog", "cobbler", "autoMech"]);
                addUpgrades("mech", tier4_AR, [/*"propper", "technician"*/]);
                //addUpgrades("engineer", tier4_AR);
                //addUpgrades("triMech", tier4_AR);
                //addUpgrades("machineMech", tier4_AR);
                //addUpgrades("mechGuard", tier4_AR);
                //addUpgrades("operator", tier4_AR);
                //addUpgrades("cog", tier4_AR);
            ////addUpgrades("cobbler", tier4_AR);
            ////addUpgrades("autoMech", tier4_AR);

            //addUpgrades("machineTrapper", 3);

            //addUpgrades("wark", 3);
};

if (Config.teams == 1) {
    removeUpgrades("directordrive", 3, ["underdrive"]);
};
