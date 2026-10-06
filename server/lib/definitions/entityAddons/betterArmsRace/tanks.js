const { combineStats, addUpgrades, removeUpgrades, weaponMirror, weaponStack, makeAuto, makeBattle, makeBird, makeCap, makeFore, makeGuard, makeGunner, makeOver } = require("../../facilitators.js");
const { base } = require("../../constants.js");
const g = require("../../gunvals.js");
const preset = require("../../presets.js");

// Tier 2 (Level 30)
Class.crossfire = {
    PARENT: "genericTank",
    LABEL: "Crossfire",
    DANGER: 6,
    BODY: Class.sniper.BODY,
    GUNS: [
        {
            POSITION: {
                LENGTH: 8,
                WIDTH: 8,
                ASPECT: 1.5,
                X: 12
            }
        },
        ...weaponMirror({
            POSITION: {
                LENGTH: 8,
                WIDTH: 2,
                ASPECT: -1.35,
                Y: -20,
                ANGLE: 90
            },
            PROPERTIES: {
                SHOOT_SETTINGS: combineStats([g.basic, g.pelleter, g.power, g.twin, { speed: 0.7, maxSpeed: 0.7 }, g.flankGuard]),
                TYPE: "bullet"
            }
        }),
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
    UPGRADES_TIER_3: ["caltrop", "vigilante", "forager", "spitfire", "quickdraw", "quagmire", "ph_crossfireH", "autoCrossfire"],
    UPGRADES_TIER_4: ["brushguard", "hailshot"]
};

// Tier 3 (Level 45)
const autoTanksT3 = [
    "crossfire",
    "marksman"
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
    // Base Tank  //Director       //Cruiser         //Spawner         //Honcho          //Overseer  //Directordrive
    ["crossfire", "ph_crossfireH", "ph_crossfireHC", "ph_crossfireHS", "ph_crossfireHO", undefined,  "ph_crossfireHD"]
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

Class.caltrop = {
    PARENT: "genericTank",
    LABEL: "Caltop",
    DANGER: 7,
    BODY: Class.crossfire.BODY,
    GUNS: [
        {
            POSITION: {
                LENGTH: 8,
                WIDTH: 8,
                ASPECT: 1.5,
                X: 7
            }
        },
        ...weaponMirror({
            POSITION: {
                LENGTH: 8,
                WIDTH: 2,
                ASPECT: -1.35,
                Y: -20,
                ANGLE: 90
            },
            PROPERTIES: {
                SHOOT_SETTINGS: combineStats([g.basic, g.pelleter, g.power, g.twin, { speed: 0.7, maxSpeed: 0.7 }, g.flankGuard]),
                TYPE: "bullet"
            }
        }),
        ...weaponMirror({
            POSITION: {
                LENGTH: 8,
                WIDTH: 2,
                ASPECT: -1.35,
                Y: -15,
                ANGLE: 90,
                DELAY: 0.5
            },
            PROPERTIES: {
                SHOOT_SETTINGS: combineStats([g.basic, g.pelleter, g.power, g.twin, { speed: 0.7, maxSpeed: 0.7 }, g.flankGuard]),
                TYPE: "bullet"
            }
        }),
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
    UPGRADES_TIER_4: ["blade", "desperado", "trailblazer", "ph_spitfire2", "ph_quickdraw2", "ph_quagmire2", "autoCaltrop"]
};
Class.forager = {
    PARENT: "genericTank",
    LABEL: "Forager",
    DANGER: 7,
    BODY: Class.hunter.BODY,
    CONTROLLERS: Class.hunter.CONTROLLERS,
    GUNS: [
        {
            POSITION: {
                LENGTH: 8,
                WIDTH: 11,
                ASPECT: 1.5,
                X: 7
            }
        },
        ...weaponMirror({
            POSITION: {
                LENGTH: 28/3,
                WIDTH: 2,
                ASPECT: -1.35,
                Y: -15,
                ANGLE: 90
            },
            PROPERTIES: {
                SHOOT_SETTINGS: combineStats([g.basic, g.pelleter, g.power, g.twin, { speed: 0.7, maxSpeed: 0.7 }, g.flankGuard]),
                TYPE: "bullet"
            }
        }),
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
    UPGRADES_TIER_4: ["trailblazer", /*"prowler", */"snarer"/*, "grapeshot", "bifurcate*/, "autoForager"/*, "megaForager", "lookout", "vanguard"*/]
};
Class.piercer = {
    PARENT: "genericTank",
    LABEL: "Piercer",
    DANGER: 7,
    BODY: Class.minigun.BODY,
    GUNS: [
        ...weaponStack({
            POSITION: {
                LENGTH: 13,
                WIDTH: 5,
                ASPECT: 2.2,
                X: 7
            }
        }, 3, { xPosOffset: 5 }),
        ...weaponStack({
            POSITION: {
                LENGTH: 21,
                WIDTH: 8
            },
            PROPERTIES: {
                SHOOT_SETTINGS: combineStats([g.basic, g.minigun, g.marksman]),
                TYPE: "bullet",
            }
        }, 3, { lengthOffset: 2, delayIncrement: 1/3 })
    ],
    UPGRADES_TIER_4: ["stiletto", "saxton", "autoPiercer"]
};
Class.quagmire = {
    PARENT: "genericTank",
    LABEL: "Quagmire",
    DANGER: 7,
    BODY: Class.marksman.BODY,
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
                LENGTH: 8,
                WIDTH: 8,
                ASPECT: 1.5,
                X: 12
            }
        },
        ...weaponMirror({
            POSITION: {
                LENGTH: 8,
                WIDTH: 2,
                ASPECT: -1.35,
                Y: -20,
                ANGLE: 90
            },
            PROPERTIES: {
                SHOOT_SETTINGS: combineStats([g.basic, g.pelleter, g.power, g.twin, { speed: 0.7, maxSpeed: 0.7 }, g.flankGuard]),
                TYPE: "bullet"
            }
        }),
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
    UPGRADES_TIER_4: ["ph_quagmire2", "ph_quagmireH", "autoQuagmire"]
};
Class.quickdraw = {
    PARENT: "genericTank",
    LABEL: "Quickdraw",
    DANGER: 7,
    BODY: Class.rifle.BODY,
    GUNS: [
        {
            POSITION: {
                LENGTH: 20,
                WIDTH: 12
            }
        },
        {
            POSITION: {
                LENGTH: 8,
                WIDTH: 8,
                ASPECT: 1.5,
                X: 12
            }
        },
        ...weaponMirror({
            POSITION: {
                LENGTH: 8,
                WIDTH: 2,
                ASPECT: -1.35,
                Y: -20,
                ANGLE: 90
            },
            PROPERTIES: {
                SHOOT_SETTINGS: combineStats([g.basic, g.pelleter, g.power, g.twin, { speed: 0.7, maxSpeed: 0.7 }, g.flankGuard]),
                TYPE: "bullet"
            }
        }),
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
    UPGRADES_TIER_4: ["ph_quickdraw2", "ph_quickdrawH", "autoQuickdraw"]
};
Class.spitfire = {
    PARENT: "genericTank",
    LABEL: "Spitfire",
    DANGER: 7,
    BODY: Class.minigun.BODY,
    GUNS: [
        {
            POSITION: {
                LENGTH: 8,
                WIDTH: 8,
                ASPECT: 1.5,
                X: 7
            }
        },
        ...weaponMirror({
            POSITION: {
                LENGTH: 8,
                WIDTH: 2,
                ASPECT: -1.35,
                Y: -15,
                ANGLE: 90
            },
            PROPERTIES: {
                SHOOT_SETTINGS: combineStats([g.basic, g.pelleter, g.power, g.twin, { speed: 0.7, maxSpeed: 0.7 }, g.flankGuard]),
                TYPE: "bullet"
            }
        }),
        ...weaponStack({
            POSITION: {
                LENGTH: 21,
                WIDTH: 8
            },
            PROPERTIES: {
                SHOOT_SETTINGS: combineStats([g.basic, g.minigun]),
                TYPE: "bullet"
            }
        }, 3, {lengthOffset: 2, delayIncrement: 1/3})
    ],
    UPGRADES_TIER_4: ["ph_spitfire2", "ph_spitfireH", "autoSpitfire"]
};
Class.vigilante = {
    PARENT: "genericTank",
    LABEL: "Vigilante",
    DANGER: 7,
    BODY: Class.assassin.BODY,
    GUNS: [
        {
            POSITION: {
                LENGTH: 8,
                WIDTH: 8,
                ASPECT: 1.5,
                X: 12
            }
        },
        ...weaponMirror({
            POSITION: {
                LENGTH: 8,
                WIDTH: 2,
                ASPECT: -1.35,
                Y: -20,
                ANGLE: 90
            },
            PROPERTIES: {
                SHOOT_SETTINGS: combineStats([g.basic, g.pelleter, g.power, g.twin, { speed: 0.7, maxSpeed: 0.7 }, g.flankGuard]),
                TYPE: "bullet"
            }
        }),
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
    [`UPGRADES_TIER_${4}`]: ["desperado", "longbow", "talon", "crosswind", "autoVigilante", "jaywalker", "backlash", "bodyguard"]
};

Class.ph_crossfireH.LABEL = "";
Class.ph_crossfireH.UPGRADES_TIER_4.push("bodyguard", "snarer", "ph_spitfireH", "ph_quickdrawH", "ph_quagmireH", "autoPh_crossfireH");

// Tier 4 (Level 60)
const autoTanksT4 = [
    "caltrop",
    "forager",
    "piercer",
    "quagmire",
    "quickdraw",
    "spitfire",
    "vigilante",
    "ph_crossfireH"
];
for (let i = 0; i < autoTanksT4.length; i++) {
    let type = autoTanksT4[i];
    Class[`auto${type.charAt(0).toUpperCase() + type.slice(1)}`] = makeAuto(type);
};

const hybridTanksT4 = [
    // Base Tank  //Director
    ["forager",   "Snarer"],
    ["piercer",   "Saxton"],
    ["quagmire",  "ph_quagmireH"],
    ["quickdraw", "ph_quickdrawH"],
    ["spitfire",  "ph_spitfireH"],
    ["vigilante", "Bodyguard"]
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

Class.autoCrossfire.UPGRADES_TIER_4.push(...["Caltrop", "Vigilante", "Forager", "Spitfire", "Quickdraw", "Quagmire", "Ph_crossfireH"].map(x => `auto${x}`))
Class.backlash = makeGunner("vigilante", "Backlash");
Class.blade = {
    PARENT: "genericTank",
    LABEL: "Blade",
    DANGER: 8,
    BODY: Class.caltrop.BODY,
    GUNS: [
        {
            POSITION: {
                LENGTH: 8,
                WIDTH: 8,
                ASPECT: 1.5,
                X: 2
            }
        },
        ...weaponMirror({
            POSITION: {
                LENGTH: 8,
                WIDTH: 2,
                ASPECT: -1.35,
                Y: -20,
                ANGLE: 90
            },
            PROPERTIES: {
                SHOOT_SETTINGS: combineStats([g.basic, g.pelleter, g.power, g.twin, { speed: 0.7, maxSpeed: 0.7 }, g.flankGuard]),
                TYPE: "bullet"
            }
        }),
        ...weaponMirror({
            POSITION: {
                LENGTH: 8,
                WIDTH: 2,
                ASPECT: -1.35,
                Y: -15,
                ANGLE: 90,
                DELAY: 1/3
            },
            PROPERTIES: {
                SHOOT_SETTINGS: combineStats([g.basic, g.pelleter, g.power, g.twin, { speed: 0.7, maxSpeed: 0.7 }, g.flankGuard]),
                TYPE: "bullet"
            }
        }),
        ...weaponMirror({
            POSITION: {
                LENGTH: 8,
                WIDTH: 2,
                ASPECT: -1.35,
                Y: -10,
                ANGLE: 90,
                DELAY: 2/3
            },
            PROPERTIES: {
                SHOOT_SETTINGS: combineStats([g.basic, g.pelleter, g.power, g.twin, { speed: 0.7, maxSpeed: 0.7 }, g.flankGuard]),
                TYPE: "bullet"
            }
        }),
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
    ]
};
Class.brushguard = makeGuard("crossfire", "Brushguard");
Class.crosswind = {
    PARENT: "genericTank",
    LABEL: "Crosswind",
    DANGER: 8,
    BODY: Class.stalker.BODY,
    INVISIBLE: Class.stalker.INVISIBLE,
    TOOLTIP: "Stay still to turn invisible.",
    GUNS: [
        {
            POSITION: {
                LENGTH: 8,
                WIDTH: 8,
                ASPECT: 1.5,
                X: 12
            }
        },
        ...weaponMirror({
            POSITION: {
                LENGTH: 9,
                WIDTH: 2,
                ASPECT: -1.35,
                Y: -20,
                ANGLE: 90
            },
            PROPERTIES: {
                SHOOT_SETTINGS: combineStats([g.basic, g.pelleter, g.power, g.twin, { speed: 0.7, maxSpeed: 0.7 }, g.flankGuard]),
                TYPE: "bullet"
            }
        }),
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
Class.desperado = {
    PARENT: "genericTank",
    LABEL: "Desperado",
    DANGER: 8,
    BODY: Class.vigilante.BODY,
    GUNS: [
        {
            POSITION: {
                LENGTH: 8,
                WIDTH: 8,
                ASPECT: 1.5,
                X: 7
            }
        },
        ...weaponMirror({
            POSITION: {
                LENGTH: 8,
                WIDTH: 2,
                ASPECT: -1.35,
                Y: -20,
                ANGLE: 90
            },
            PROPERTIES: {
                SHOOT_SETTINGS: combineStats([g.basic, g.pelleter, g.power, g.twin, { speed: 0.7, maxSpeed: 0.7 }, g.flankGuard]),
                TYPE: "bullet"
            }
        }),
        ...weaponMirror({
            POSITION: {
                LENGTH: 8,
                WIDTH: 2,
                ASPECT: -1.35,
                Y: -15,
                ANGLE: 90,
                DELAY: 0.5
            },
            PROPERTIES: {
                SHOOT_SETTINGS: combineStats([g.basic, g.pelleter, g.power, g.twin, { speed: 0.7, maxSpeed: 0.7 }, g.flankGuard]),
                TYPE: "bullet"
            }
        }),
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
    ]
};
Class.hailshot = {
    PARENT: "genericTank",
    LABEL: "Hailshot",
    DANGER: 8,
    BODY: Class.railgun.BODY,
    GUNS: [
        {
            POSITION: {
                LENGTH: 8,
                WIDTH: 8,
                ASPECT: 1.5,
                X: 12
            }
        },
        ...weaponMirror({
            POSITION: {
                LENGTH: 8,
                WIDTH: 2,
                ASPECT: -1.35,
                Y: -20,
                ANGLE: 90
            },
            PROPERTIES: {
                SHOOT_SETTINGS: combineStats([g.basic, g.pelleter, g.power, g.twin, { speed: 0.7, maxSpeed: 0.7 }, g.flankGuard]),
                TYPE: "bullet"
            }
        }),
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
Class.handgun = {
    PARENT: "genericTank",
    LABEL: "Handgun",
    DANGER: 8,
    GUNS: [
        {
            POSITION: {
                LENGTH: 15,
                WIDTH: 12
            }
        },
        {
            POSITION: {
                LENGTH: 19,
                WIDTH: 7
            },
            PROPERTIES: {
                SHOOT_SETTINGS: combineStats([g.basic, g.single, g.rifle]),
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
Class.jaywalker = {
    PARENT: "genericTank",
    LABEL: "Jaywalker",
    DANGER: 8,
    GUNS: [
        {
            POSITION: {
                LENGTH: 8,
                WIDTH: 8,
                ASPECT: 1.5,
                X: 7
            }
        },
        ...weaponMirror({
            POSITION: {
                LENGTH: 8,
                WIDTH: 2,
                ASPECT: -1.35,
                Y: -15,
                ANGLE: 90
            },
            PROPERTIES: {
                SHOOT_SETTINGS: combineStats([g.basic, g.pelleter, g.power, g.twin, { speed: 0.7, maxSpeed: 0.7 }, g.flankGuard]),
                TYPE: "bullet"
            }
        }),
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
Class.longbow = {
    PARENT: "genericTank",
    LABEL: "Longbow",
    DANGER: 8,
    BODY: Class.ranger.BODY,
    GUNS: [
        {
            POSITION: {
                LENGTH: 8,
                WIDTH: 8,
                ASPECT: 1.5,
                X: 12
            }
        },
        ...weaponMirror({
            POSITION: {
                LENGTH: 8,
                WIDTH: 2,
                ASPECT: -1.35,
                Y: -20,
                ANGLE: 90
            },
            PROPERTIES: {
                SHOOT_SETTINGS: combineStats([g.basic, g.pelleter, g.power, g.twin, { speed: 0.7, maxSpeed: 0.7 }, g.flankGuard]),
                TYPE: "bullet"
            }
        }),
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
Class.orifice = makeGunner("single", "Orifice");
Class.pistol = {
    PARENT: "genericTank",
    LABEL: "Pistol",
    DANGER: 8,
    GUNS: [
        ...weaponStack({
            POSITION: {
                LENGTH: 13,
                WIDTH: 5,
                ASPECT: 2.2,
                X: 4
            }
        }, 2, { xPosOffset: 5 }),
        {
            POSITION: {
                LENGTH: 19,
                WIDTH: 8
            },
            PROPERTIES: {
                SHOOT_SETTINGS: combineStats([g.basic, g.single, g.marksman]),
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
}
Class.spy = {
    PARENT: "genericTank",
    LABEL: "Spy",
    DANGER: 8,
    INVISIBLE: Class.stalker.INVISIBLE,
    TOOLTIP: "Stay still to turn invisible.",
    GUNS: [
        {
            POSITION: {
                LENGTH: 12.5,
                WIDTH: 8,
                ASPECT: -1.8,
                X: 6.5
            },
            PROPERTIES: {
                SHOOT_SETTINGS: combineStats([g.basic, g.single]),
                TYPE: "bullet"
            }
        }
    ]
};
Class.stiletto = {
    PARENT: "genericTank",
    LABEL: "Stiletto",
    DANGER: 8,
    BODY: Class.streamliner.BODY,
    GUNS: [
        ...weaponStack({
            POSITION: {
                LENGTH: 13,
                WIDTH: 5,
                ASPECT: 2.2,
                X: 11
            }
        }, 3, { xPosOffset: 5 }),
        ...weaponStack({
            POSITION: {
                LENGTH: 25,
                WIDTH: 8
            },
            PROPERTIES: {
                SHOOT_SETTINGS: combineStats([g.basic, g.minigun, g.streamliner, g.marksman]),
                TYPE: "bullet",
            }
        }, 5, { lengthOffset: 2, delayIncrement: 0.2 })
    ]
};
Class.subduer = {
    PARENT: "genericTank",
    LABEL: "Subduer",
    DANGER: 8,
    BODY: {
        FOV: base.FOV * 1.125
    },
    CONTROLLERS: ["zoom"],
    TOOLTIP: "Hold right click to zoom.",
    GUNS: [
        {
            POSITION: {
                LENGTH: 19,
                WIDTH: 8
            },
            PROPERTIES: {
                SHOOT_SETTINGS: combineStats([g.basic, g.single, g.hunter, g.hunterSecondary]),
                TYPE: "bullet"
            }
        },
        {
            POSITION: {
                LENGTH: 16,
                WIDTH: 11,
                DELAY: 0.25
            },
            PROPERTIES: {
                SHOOT_SETTINGS: combineStats([g.basic, g.single, g.hunter]),
                TYPE: "bullet"
            }
        },
        {
            POSITION: {
                LENGTH: 5.5,
                WIDTH: 11,
                ASPECT: -1.3,
                X: 6.5
            }
        }
    ]
};
Class.talon = makeBird("vigilante", "Talon");
Class.trailblazer = {
    PARENT: "genericTank",
    LABEL: "Trailblazer",
    DANGER: 8,
    BODY: Class.forager.BODY,
    CONTROLLERS: Class.forager.CONTROLLERS,
    GUNS: [
        {
            POSITION: {
                LENGTH: 8,
                WIDTH: 11,
                ASPECT: 1.5,
                X: 2
            }
        },
        ...weaponMirror({
            POSITION: {
                LENGTH: 28/3,
                WIDTH: 2,
                ASPECT: -1.35,
                Y: -15,
                ANGLE: 90
            },
            PROPERTIES: {
                SHOOT_SETTINGS: combineStats([g.basic, g.pelleter, g.power, g.twin, { speed: 0.7, maxSpeed: 0.7 }, g.flankGuard]),
                TYPE: "bullet"
            }
        }),
        ...weaponMirror({
            POSITION: {
                LENGTH: 28/3,
                WIDTH: 2,
                ASPECT: -1.35,
                Y: -10,
                ANGLE: 90,
                DELAY: 0.5
            },
            PROPERTIES: {
                SHOOT_SETTINGS: combineStats([g.basic, g.pelleter, g.power, g.twin, { speed: 0.7, maxSpeed: 0.7 }, g.flankGuard]),
                TYPE: "bullet"
            }
        }),
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

Class.autoPh_crossfireH.LABEL = "";
Class.ph_crossfireHC.LABEL = "";
Class.ph_crossfireHD.LABEL = "";
Class.ph_crossfireHO.LABEL = "";
Class.ph_crossfireHS.LABEL = "";
Class.ph_quagmire2 = {
    PARENT: "genericTank",
    LABEL: "",
    DANGER: 8,
    BODY: Class.quagmire.BODY,
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
                LENGTH: 8,
                WIDTH: 8,
                ASPECT: 1.5,
                X: 7
            }
        },
        ...weaponMirror({
            POSITION: {
                LENGTH: 8,
                WIDTH: 2,
                ASPECT: -1.35,
                Y: -20,
                ANGLE: 90
            },
            PROPERTIES: {
                SHOOT_SETTINGS: combineStats([g.basic, g.pelleter, g.power, g.twin, { speed: 0.7, maxSpeed: 0.7 }, g.flankGuard]),
                TYPE: "bullet"
            }
        }),
        ...weaponMirror({
            POSITION: {
                LENGTH: 8,
                WIDTH: 2,
                ASPECT: -1.35,
                Y: -15,
                ANGLE: 90,
                DELAY: 0.5
            },
            PROPERTIES: {
                SHOOT_SETTINGS: combineStats([g.basic, g.pelleter, g.power, g.twin, { speed: 0.7, maxSpeed: 0.7 }, g.flankGuard]),
                TYPE: "bullet"
            }
        }),
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
    ]
};
Class.ph_quagmireH.LABEL = "";
Class.ph_quickdraw2 = {
    PARENT: "genericTank",
    LABEL: "",
    DANGER: 8,
    BODY: Class.quickdraw.BODY,
    GUNS: [
        {
            POSITION: {
                LENGTH: 20,
                WIDTH: 12
            }
        },
        {
            POSITION: {
                LENGTH: 8,
                WIDTH: 8,
                ASPECT: 1.5,
                X: 7
            }
        },
        ...weaponMirror({
            POSITION: {
                LENGTH: 8,
                WIDTH: 2,
                ASPECT: -1.35,
                Y: -20,
                ANGLE: 90
            },
            PROPERTIES: {
                SHOOT_SETTINGS: combineStats([g.basic, g.pelleter, g.power, g.twin, { speed: 0.7, maxSpeed: 0.7 }, g.flankGuard]),
                TYPE: "bullet"
            }
        }),
        ...weaponMirror({
            POSITION: {
                LENGTH: 8,
                WIDTH: 2,
                ASPECT: -1.35,
                Y: -15,
                ANGLE: 90,
                DELAY: 0.5
            },
            PROPERTIES: {
                SHOOT_SETTINGS: combineStats([g.basic, g.pelleter, g.power, g.twin, { speed: 0.7, maxSpeed: 0.7 }, g.flankGuard]),
                TYPE: "bullet"
            }
        }),
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
    ]
};
Class.ph_quickdrawH.LABEL = "";
Class.ph_spitfire2 = {
    PARENT: "genericTank",
    LABEL: "",
    DANGER: 8,
    BODY: Class.spitfire.BODY,
    GUNS: [
        {
            POSITION: {
                LENGTH: 8,
                WIDTH: 8,
                ASPECT: 1.5,
                X: 2
            }
        },
        ...weaponMirror({
            POSITION: {
                LENGTH: 8,
                WIDTH: 2,
                ASPECT: -1.35,
                Y: -15,
                ANGLE: 90
            },
            PROPERTIES: {
                SHOOT_SETTINGS: combineStats([g.basic, g.pelleter, g.power, g.twin, { speed: 0.7, maxSpeed: 0.7 }, g.flankGuard]),
                TYPE: "bullet"
            }
        }),
        ...weaponMirror({
            POSITION: {
                LENGTH: 8,
                WIDTH: 2,
                ASPECT: -1.35,
                Y: -10,
                ANGLE: 90,
                DELAY: 0.5
            },
            PROPERTIES: {
                SHOOT_SETTINGS: combineStats([g.basic, g.pelleter, g.power, g.twin, { speed: 0.7, maxSpeed: 0.7 }, g.flankGuard]),
                TYPE: "bullet"
            }
        }),
        ...weaponStack({
            POSITION: {
                LENGTH: 21,
                WIDTH: 8
            },
            PROPERTIES: {
                SHOOT_SETTINGS: combineStats([g.basic, g.minigun]),
                TYPE: "bullet"
            }
        }, 3, {lengthOffset: 2, delayIncrement: 1/3})
    ]
};
Class.ph_spitfireH.LABEL = "";

// Existing Upgrade Management
const enable_missing_tanks = require("../../groups/tanks/armsRace.js");
if (!enable_missing_tanks) return;

if (Config.arms_race) {
    Class.sniper.UPGRADES_TIER_2.push("crossfire");

    Class.assassin.UPGRADES_TIER_3.push("vigilante");
    Class.hunter.UPGRADES_TIER_3.push("forager");
    Class.marksman.UPGRADES_TIER_3.push("piercer", "quagmire", "autoMarksman");
    Class.minigun.UPGRADES_TIER_3.push("piercer", "spitfire");
    Class.rifle.UPGRADES_TIER_3.push("quickdraw");

    Class.autoAssassin.UPGRADES_TIER_4.push("autoVigilante");
    Class.autoMinigun.UPGRADES_TIER_4.push("autoPiercer", "autoSpitfire");
    Class.buttbuttin.UPGRADES_TIER_4.push("backlash");
    Class.bushwhacker.UPGRADES_TIER_4.push("brushguard");
    Class.cropDuster.UPGRADES_TIER_4.push("saxton", "ph_spitfireH");
    Class.falcon.UPGRADES_TIER_4.push("talon");
    Class.hitman.UPGRADES_TIER_4.push("bodyguard");
    Class.railgun.UPGRADES_TIER_4.push("hailshot");
    Class.single.UPGRADES_TIER_4.push("spy", "pistol", "orifice", "handgun", "subduer", "jaywalker");
    Class.stalker.UPGRADES_TIER_4.push("crosswind");
    Class.streamliner.UPGRADES_TIER_4.push("stiletto");
};
