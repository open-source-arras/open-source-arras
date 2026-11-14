const { combineStats, removeUpgrades, addUpgrades, weaponArray, weaponStack, weaponMirror, makeAuto, makeDrive, makeBattle, makeBird, makeCap, makeFore, makeGuard, makeTurret, makeGunner, makeOver, makeRadialAuto } = require("../../facilitators.js");
const { base } = require("../../constants.js");
const g = require("../../gunvals.js");
const preset = require("../../presets.js");

// Function & Preset Definitions
const makeMarksman = (baseTank, newTank, count, offset, width, shouldFork) => {
    const tank = typeof baseTank === "string"
        ? Class[baseTank]
        : baseTank;
    const guns = Array.isArray(tank)
        ? tank
        : tank?.GUNS ?? [];

    return {
        PARENT: "genericTank",
        LABEL: newTank,
        DANGER: 7,
        BODY: tank?.BODY ?? Class.marksman.BODY,
        GUNS: [
            ...weaponStack({
                POSITION: {
                    LENGTH: 13,
                    WIDTH: width ??= 5,
                    ASPECT: 2.2,
                    X: offset ??= -3
                }
            }, count ??= 3, { xPosOffset: -5 }),
            ...guns.map(gun => {
                if (gun.PROPERTIES?.SHOOT_SETTINGS) {
                    return {
                        ...gun,
                        PROPERTIES: {
                            ...gun.PROPERTIES,
                            ...(shouldFork ? { TYPE: "splitterBullet" } : {}),
                            SHOOT_SETTINGS: combineStats([
                                gun.PROPERTIES.SHOOT_SETTINGS,
                                ...(gun.marksman ? [gun.marksman] : [])
                            ])
                        }
                    };
                }
                return gun;
            })
        ]
    };
};
Class.marksmanAutoTankGun = makeTurret({
    GUNS: [
        ...weaponStack({
            POSITION: {
                LENGTH: 13,
                WIDTH: 5,
                ASPECT: 2.2,
                X: 7
            }
        }, 2, { xPosOffset: 5 }),
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
}, {canRepel: true, limitFov: true, fov: 3});

// Tier 2 (Level 30)

Class.crossfire = {
    PARENT: "genericTank",
    LABEL: "Crossfire",
    DANGER: 6,
    BODY: Class.sniper.BODY,
    ...preset.meth,
    GUNS: [
        {
            POSITION: {
                LENGTH: 17,
                WIDTH: 1.4,
                ASPECT: -9,
                X: -20,
                ANGLE: 180
            }
        },
        {
            POSITION: {
                LENGTH: 8,
                WIDTH: 2,
                ASPECT: -1.7,
                Y: -20,
                ANGLE: 90
            }
        },
        {
            POSITION: {
                LENGTH: 8,
                WIDTH: 2,
                ASPECT: -1.7,
                Y: 20,
                ANGLE: 270
            }
        },
        {
            POSITION: {
                LENGTH: 24,
                WIDTH: 8
            }
        }
    ],
    UPGRADES_TIER_3: [/*"dispute", "puncturer", "vigilante", "forager", "spitfire", "quickdraw",*/ "autoCrossfire", "foldman"],
    UPGRADES_TIER_4: [/*"brushguard", "hailshot", "sheepfold"*/]
};

Class.fusion = {
    PARENT: "genericTank",
    LABEL: "Fusion",
    DANGER: 6,
    TURRETS: preset.turret.assemblerHat,
    ...preset.meth,
    GUNS: [
        {
            POSITION: {
                LENGTH: 20.5,
                WIDTH: 12
            }
        },
        {
            POSITION: {
                LENGTH: 2,
                WIDTH: 12,
                X: 13
            }
        }
    ],
    UPGRADES_TIER_3: ["slugger", "nexus", "concussor", "assembler", "payload"],
    UPGRADES_TIER_4: ["kingfisher"/*, "saboteur", "scattergun"*/]
};

// Tier 3 (Level 45)
Class.autoMarksman = makeAuto("marksman");

Class.concussor = {
    PARENT: "genericTank",
    LABEL: "Concussor",
    DANGER: 7,
    TURRETS: preset.turret.assemblerHat,
    ...preset.meth,
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
            }
        },
        {
            POSITION: {
                LENGTH: 2,
                WIDTH: 12,
                X: 13
            }
        }
    ],
    UPGRADES_TIER_4: [/*"tremor", "aether", "blacksmith", "superorganism", "megaton", "caliber", "warforge", "flak", "siegecraft", "parabola", "autoConcussor"*/]
};
Class.drugs = makeBird('marksman', "Drugs");

Class.nexus = {
    PARENT: "genericTank",
    LABEL: "Nexus",
    DANGER: 7,
    TURRETS: preset.turret.doubleAssemblerHat,
    ...preset.meth,
    GUNS: [
        {
            POSITION: {
                LENGTH: 20.5,
                WIDTH: 12
            }
        },
        {
            POSITION: {
                LENGTH: 4,
                WIDTH: 12,
                X: 12
            }
        }
    ],
    UPGRADES_TIER_4: [/*"rasengan", "proliferator", "aether", "disintegrator", "bricklayer"*/]
};
Class.payload = {
    PARENT: "genericTank",
    LABEL: "Payload",
    DANGER: 7,
    TURRETS: preset.turret.assemblerHat,
    ...preset.meth,
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
            }
        },
        {
            POSITION: {
                LENGTH: 2,
                WIDTH: 13,
                X: 13
            }
        }
    ],
    UPGRADES_TIER_4: [/*"proliferator", "swooper", "maelstrom", "hornet", "ouroboros", "caliber", "skybreaker", "amplifier", "behemoth", "tossup", "autoPayload", "injector", "primordial", "boulder"*/]
};
Class.piercer = makeMarksman('minigun', "Piercer");

Class.slugger = {
    PARENT: "genericTank",
    LABEL: "Slugger",
    DANGER: 7,
    TURRETS: preset.turret.assemblerHat,
    ...preset.meth,
    GUNS: [
        {
            POSITION: {
                LENGTH: 20.5,
                WIDTH: 14
            }
        },
        {
            POSITION: {
                LENGTH: 2,
                WIDTH: 14,
                X: 13
            }
        }
    ],
    UPGRADES_TIER_4: [/*"dominion", "disintegrator", "organizer", "connector", "doomsday", "chimera", "piledriver", "poltergeist", "megaton", "autoSlugger", "boulder"*/]
};


// Tier 4 (Level 60)
const hybridTanksT3 = [
//  Base Tank      Director   Cruiser     Spawner      Honcho      Overseer     Directordrive
    ["crossfire", "Foldman", "Encaser",  "Multishot", "Huntsman", "Overcross", "Folddrive"],
	["fusion",    "Merge",   "Cocktail", "Puncher",   "Hurter",    undefined,   undefined],
	["marksman",  "Beadle",  "DRM",      "Verminter", "Subduer",   undefined,   undefined]
    // The last two are optional and will be filled out automatically so long as the Base Tank and Director are defined.                 
];
for (let i = 0; i < hybridTanksT3.length; i++) {
    let type = hybridTanksT3[i][0];
    let director = hybridTanksT3[i][1];
    let cruiser = hybridTanksT3[i][2];
    let spawner = hybridTanksT3[i][3];
    let honcho = hybridTanksT3[i][4];

    let overseer = hybridTanksT3[i][5] ??=
        `Over${Class[type].LABEL.charAt(0).toLowerCase() + Class[type].LABEL.slice(1)}`;

    let directordrive = hybridTanksT3[i][6] ??= `${director}drive`;

    function typeify(x) {
        return x.charAt(0).toLowerCase() + x.slice(1).replace(/[\s-]+/g, "");
    }

    let typeDirector = typeify(director);
    let typeOverseer = typeify(overseer);
    let typeCruiser = typeify(cruiser);
    let typeSpawner = typeify(spawner);
    let typeHoncho = typeify(honcho);
    let typeDirectordrive = typeify(directordrive);

    const alreadyDefined = Class[typeDirector] ? true : false;

    if (!alreadyDefined) {
        Class[typeDirector] = makeOver(type, director, preset.hybrid);
    }

    Class[typeOverseer] = makeOver(type, overseer);
    Class[typeCruiser] = makeBattle(type, cruiser, preset.hybrid);
    Class[typeSpawner] = makeCap(type, spawner, preset.hybrid);
    Class[typeHoncho] = makeFore(type, honcho, preset.makeFore.hybrid);
    Class[typeDirectordrive] = makeDrive(typeDirector, directordrive);

    if (Config.arms_race || !alreadyDefined) {
        Class[typeDirector].UPGRADES_TIER_4 = [
            typeOverseer,
            typeCruiser,
            typeSpawner,
            typeDirectordrive,
            typeHoncho
        ];
    } else {
        Class[typeDirector].UPGRADES_TIER_4 = [];
    }
}
// Tier 3 (Level 45)
const autoTanksT3 = [
    "marksman",
	"crossfire",
	"fusion"
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
Class.asbestos = makeBird('marksman', "Asbestos", {super: true});
Class.assassinator = makeMarksman('nailgun', "Assassiantor", 2);
Class.autoBeadle = makeAuto('beadle');
Class.autoDeadeye = makeAuto('deadeye');
Class.autoDrugs = makeAuto('drugs');
Class.autoFork = makeAuto('fork');
Class.autoNimrod = makeAuto('nimrod');
Class.autoPiercer = makeAuto('piercer');
Class.autoRevolver = makeAuto('revolver');
Class.bentPiercer = makeMarksman('bentMinigun', "Bent Piercer");
Class.bowman = makeOver("deadeye", "Bowman", preset.hybrid);
Class.cannon = makeMarksman('crossbow', "Cannon", 2, undefined, 9.5);
Class.chopsticks = makeMarksman({
	PARENT: "genericTank",
    DANGER: 8,
    BODY: {
        FOV: base.FOV * 1.2
    },
    GUNS: weaponStack({
        POSITION: {
            LENGTH: 27,
            WIDTH: 8
        },
        PROPERTIES: {
            SHOOT_SETTINGS: combineStats([g.basic, g.minigun]),
            TYPE: "bullet"
        }
    }, 3, { lengthOffset: 2, delayIncrement: 1 / 3 }),
}, "Chopsticks", 4, undefined, undefined, true);
Class.deadass = makeGunner('deadeye', "Deadass");
Class.dictator = makeMarksman('enforcer', "Dictator", undefined, undefined, 6.5);
Class.dishwasher = makeOver("fork", "Dishwasher", preset.hybrid);
Class.dummy = makeMarksman('prober', "Dummy", undefined, undefined, 6.5);
Class.electromagneticGun = makeMarksman('railgun', "Electromagnetic Gun", 2);
Class.executioner = makeGuard('marksman', "Executioner");
Class.feeder = makeMarksman('courser', "Feeder", undefined, undefined, 6.5);
Class.fentanyl = makeBird('marksman', "Fentanyl", {fighter: true})
Class.focuser = makeMarksman({
	BODY: {FOV: 1.5 * base.FOV}, 
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
    ]
}, "Focuser", 2, 2);
Class.fool = makeMarksman('dual', "Fool", 2, undefined, 10.5);
Class.guerrila = makeMarksman('subverter', "Guerrila", undefined, undefined, 9);
Class.hypocrite = makeOver("nimrod", "Hypocrite", preset.hybrid);
Class.idiot = makeMarksman('predator', "Idiot", 2, undefined, 7.5);
Class.joke = makeMarksman('scoper', "Joke");
Class.kingfisher = makeBird("fusion", "Kingfisher");
Class.knife = makeMarksman('assassin', "Knife", 4, undefined, undefined, true);
Class.mach = makeOver("revolver", "Mach", preset.hybrid);
Class.marijuana = makeBird('nimrod', "Marijuana");
Class.marksman3 = makeRadialAuto("marksmanAutoTankGun", { isTurret: true, danger: 7, label: "Marksman-3" });
Class.megaNimrod = makeMarksman('megaHunter', "Mega Nimrod");
Class.meth = makeBird('revolver', "Meth");
Class.musketeer = makeMarksman('musket', "Musketeer", 2, undefined, 10.5);
Class.nicotine = makeBird('marksman', "Nicotine", {bomber: true});
Class.penetrator = makeMarksman('streamliner', "Penetrator");
Class.prong = makeMarksman({
	PARENT: "genericTank",
    LABEL: "Hunter",
    DANGER: 8,
    BODY: {
        FOV: base.FOV * 1.325
    },
    CONTROLLERS: ["zoom"],
    GUNS: [
        {
            POSITION: {
                LENGTH: 27,
                WIDTH: 8
            },
            PROPERTIES: {
                SHOOT_SETTINGS: combineStats([g.basic, g.sniper, g.hunter, g.hunterSecondary]),
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
                SHOOT_SETTINGS: combineStats([g.basic, g.sniper, g.hunter]),
                TYPE: "bullet"
            }
        }
    ],
}, "Prong", 4, undefined, 6.5, true);
Class.pullerDown = makeMarksman('zipper', "Puller Down"); // TODO: MAKE CRUISER TURRETS NOT HAVE MARKSMAN STATS
Class.quail = makeBird('deadeye', "Quail");
Class.robin = makeBird(makeMarksman({
	PARENT: "genericTank",
    DANGER: 8,
    BODY: Class.marksman.BODY,
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
                DELAY: 1 / 3
            },
            PROPERTIES: {
                SHOOT_SETTINGS: combineStats([g.basic, g.minigun, {size: 7 / 7.5}]),
                TYPE: "bullet"
            }
        },
        {
            POSITION: {
                LENGTH: 18,
                WIDTH: 8,
                ASPECT: -1.5,
                DELAY: 2 / 3
            },
            PROPERTIES: {
                SHOOT_SETTINGS: combineStats([g.basic, g.minigun, {size: 7 / 8}]),
                TYPE: "bullet"
            }
        }
    ]
	
	
	
}, "Robin"), "Robin");
Class.sexton = makeOver("piercer", "Sexton", preset.hybrid);
Class.slaughterer = makeBird('fork', "Slaughterer");
Class.spatula = makeMarksman({
	PARENT: "genericTank",
    DANGER: 8,
    BODY: Class.sniper.BODY,
    GUNS: [
        {
            POSITION: {
                LENGTH: 24,
                WIDTH: 12
            }
        },
        {
            POSITION: {
                LENGTH: 28,
                WIDTH: 7
            },
            PROPERTIES: {
                SHOOT_SETTINGS: combineStats([g.basic, g.sniper, g.rifle]),
                TYPE: "bullet"
            }
        }
    ],
}, "Spatula", 4, undefined, 6.5, true);
Class.spoon = {
    PARENT: "genericTank",
    LABEL: "Spoon",
    DANGER: 8,
    BODY: Class.marksman.BODY,
    GUNS: [
        ...weaponStack({
            POSITION: {
                LENGTH: 13,
                WIDTH: 5,
                ASPECT: 2.2,
                X: 0
            }
        }, 5, { xPosOffset: -5 }),
        {
            POSITION: {
                LENGTH: 34,
                WIDTH: 8
            },
            PROPERTIES: {
                SHOOT_SETTINGS: combineStats([g.basic, g.sniper, g.marksman]),
                TYPE: "superSplitterBullet"
            }
        }
    ]
};
Class.spyware = makeMarksman('stalker', "Spyware", 2, undefined, 6.5);
Class.stupid = makeMarksman('ordnance', "Stupid", 2, undefined, 9);
Class.tile = makeMarksman('widget', "Tile");
Class.trafficCone = makeMarksman('barricade', "Traffic Cone");
Class.weed = makeBird('marksman', "Weed", {surfer: true});

// Existing Upgrade Management
const enable_missing_tanks = require("../../groups/tanks/armsRace.js");
if (!enable_missing_tanks) return;

if (Config.arms_race) {
	
    Class.pounder.UPGRADES_TIER_2.push("fusion");
    Class.sniper.UPGRADES_TIER_2.push("marksman", "crossfire");
	
	Class.autoMarksman.UPGRADES_TIER_4.push("autoDeadeye", "autoNimrod", "autoRevolver", "autoFork", "autoPiercer", "autoBeadle", "autoDrugs")
    Class.beadle.UPGRADES_TIER_4.push("bowman", "hypocrite", "mach", "dishwasher", "sexton", "autoBeadle");
    Class.deadeye.UPGRADES_TIER_4 = ["focuser", "quail", "spyware", "autoDeadeye", "deadass", "bowman", "marksman3", "dictator", "feeder", "knife"]
    Class.drugs.UPGRADES_TIER_4 = ["quail", "marijuana", "meth", "robin", "slaughterer", "asbestos", "autoDrugs", "fentanyl", "weed", "nicotine"]
    Class.fork.UPGRADES_TIER_4 = ["knife", "prong", "spatula", "chopsticks", "dishwasher", "spoon", "slaughterer", "autoFork"]
    Class.marksman.UPGRADES_TIER_3.push("piercer", "autoMarksman", "beadle", "drugs");
    Class.marksman.UPGRADES_TIER_4 = ["executioner", "electromagneticGun"]
    Class.nimrod.UPGRADES_TIER_4 = ["idiot", "hypocrite", "stupid", "fool", "autoNimrod", "megaNimrod", "dummy", "feeder", "joke", "marijuana", "prong"]
    Class.piercer.UPGRADES_TIER_4 = ["penetrator", "assassinator", "sexton", "trafficCone", "guerrila", "robin", "pullerDown", "bentPiercer", "autoPiercer", "tile", "chopsticks"]
    Class.revolver.UPGRADES_TIER_4 = ["musketeer", "cannon", "mach", "autoRevolver", "dictator", "dummy", "meth", "spatula"]
};
