const { combineStats, removeUpgrades, weaponArray, weaponMirror, weaponStack, attachTank, makeAuto, makeRadialAuto, makeBattle, makeBird, makeCap, makeDrive, makeFlank, makeFore, makeGuard, makeGunner, makeOver } = require("../../facilitators.js");
const { base } = require("../../constants.js");
const g = require("../../gunvals.js");
const preset = require("../../presets.js");
const { better_retrograde, label_correction } = require("../../groups/tanks/retrograde.js");
if (!better_retrograde) return;
require("./turrets.js");

// Tier 3 (Level 45)
const autoTanksT3 = [
    "blaster",
    "gatlingGun",
    "machineFlank"
];
for (type of autoTanksT3) {
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

const doubleTanksT3 = [
    "artillery",
    "blaster",
    "diesel",
    "gatlingGun",
    "minigun",
    "sprayer"
];
for (type of doubleTanksT3) {
    const truncatedType = type.replace(/Gun$/, "");
    const truncatedLabel = Class[type].LABEL.replace(/\s+Gun$/, "");

    Class[`double${truncatedType.charAt(0).toUpperCase() + truncatedType.slice(1)}`] = makeFlank(type, 2, `Double ${truncatedLabel}`, { extraStats: [g.doubleTwin] });
    Class[`triple${truncatedType.charAt(0).toUpperCase() + truncatedType.slice(1)}`] = makeFlank(type, 3, `Triple ${truncatedLabel}`, { extraStats: [g.doubleTwin, g.tripleTwin], danger: Class[type].DANGER + 2 });

    Class[`double${truncatedType.charAt(0).toUpperCase() + truncatedType.slice(1)}`].UPGRADES_TIER_4 = ["triple"].map(x => `${x}${truncatedType.charAt(0).toUpperCase() + truncatedType.slice(1)}`);
};

const hybridTanksT3 = [
    // Base Tank    //Director  //Cruiser   //Spawner       //Honcho       //Overseer      //Directordrive
    ["blaster",     "Ripoff",   "Pirate",   "Sweatshop",    "Bootleg"],
    ["gatlingGun",  "Gator",    "Alagarto", "Caiman",       "Crocodile",   "Overgatling"]
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

Class.chainGun = {
    PARENT: "genericTank",
    LABEL: "Chain Gun",
    DANGER: 7,
    BODY: Class.assassin.BODY,
    GUNS: [
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
    ],
    UPGRADES_TIER_4: ["coaxialGun", "gatling3", "central", "doubleChain", "autoChainGun"]
};
Class.flamethrower_RG.LABEL = "Wildfire";
Class.spudger = {
    PARENT: "genericTank",
    LABEL: "Spudger",
    DANGER: 7,
    BODY: Class.gatlingGun.BODY,
    GUNS: [
        {
            POSITION: {
                LENGTH: 15,
                WIDTH: 7.5,
                ASPECT: 1.7,
                X: 4
            },
            PROPERTIES: {
                SHOOT_SETTINGS: combineStats([g.basic, g.machineGun, g.blaster, g.blasterFix, g.gatlingGun]),
                TYPE: "bullet"
            }
        }
    ],
    UPGRADES_TIER_4: ["doubleSpudger", "autoSpudger"]
};

// Tier 4 (Level 60)
const autoTanksT4 = [
    "accurator",
    "chainGun",
    "doubleArtillery",
    "doubleBlaster",
    "doubleDiesel",
    "doubleGatling",
    "doubleMinigun",
    "doubleSprayer",
    "flamethrower_RG",
    "gator",
    "halfNHalf",
    "machineTriple",
    "spudger"
];
for (type of autoTanksT4) {
    Class[`auto${type.charAt(0).toUpperCase() + type.slice(1)}`] = makeAuto(type);
};

const doubleTanksT4 = [
    "accurator",
    "atomizer",
    "chainGun",
    "foamer",
    "focal",
    "redistributor",
    "splasher",
    "spudger"
];
for (type of doubleTanksT4) {
    const truncatedType = type.replace(/Gun$/, "");
    Class[`double${truncatedType.charAt(0).toUpperCase() + truncatedType.slice(1)}`] = makeFlank(type, 2, `Double ${Class[type].LABEL.replace(/\s+Gun$/, "")}`, { extraStats: [g.doubleTwin] });
};

const hybridTanksT4 = [
    // Base Tank    //Director
    ["accurator",   "Accugator"]
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

//Class.ak47 = attachTank("rimfire", "blaster", "AK-47");
Class.assassinator = attachTank("chainGun", "blaster", "Assassinator");

Class.bentHalve = attachTank("gatlingGun", "triBlaster", "Bent Halve");
Class.waterslide = attachTank("gatlingGun", "splasher", "Waterslide");
Class.eviscerator = attachTank("gatlingGun", "flamethrower_RG", "Eviscerator");
Class.sacrificer = attachTank("gatlingGun", "subverter", "Sacrificer");
Class.throwgun = attachTank("gatlingGun", "queller", "Throwgun");
Class.trench = attachTank("gatlingGun", "volley", "Trench");

Class.autoMachineFlank.UPGRADES_TIER_4.push(...["Artillery", "Minigun", "Gunner", "Sprayer", "Blaster", "Gatling", "Diesel"].map(x => `autoDouble${x}`)/*, "hexaMachine*/);
Class.doubleArtillery.UPGRADES_TIER_4.push("autoDoubleArtillery");
Class.doubleBlaster.UPGRADES_TIER_4.push("autoDoubleBlaster", "thirdNTwoThirds");
Class.doubleDiesel.UPGRADES_TIER_4.push("autoDoubleDiesel");
Class.doubleGatling.UPGRADES_TIER_4.push("doubleFocal", "doubleAccurator", "doubleNailgun", "doubleChain", "autoDoubleGatling", "twoThirdsNThird");
Class.doubleGunner.UPGRADES_TIER_4.push("autoDoubleGunner");
Class.doubleMinigun.UPGRADES_TIER_4.push("autoDoubleMinigun");
Class.doubleSprayer.UPGRADES_TIER_4.push("doubleRedistributor", "doubleAtomizer", "doubleFocal", "doubleSplasher"/*, "triFrother"*/, "doubleFoamer", "autoDoubleSprayer");

Class.lawnmower = attachTank("focal", "blaster", "Lawnmower");
Class.gatling3 = makeRadialAuto("gatlingAutoTankGun", { isTurret: true, danger: 8, size: 13, label: "Gatling-3", body: Class.sniper3.BODY });

Class.gator.UPGRADES_TIER_4.push("mizzler", "accugator", "overnailer");

Class.machineQuadruple = makeFlank("machineGun", 4, "Machine Quadruple", { extraStats: [g.doubleTwin, g.tripleTwin], danger: 8 });
Class.pneumonicGun = attachTank("nailgun", "blaster", "Pneumonic Gun");
Class.slicer = attachTank("accurator", "blaster", "Slicer");


Class.thirdNTwoThirds = {
    PARENT: "genericTank",
    LABEL: "Third 'n Two Thirds",
    DANGER: 7,
    HAS_NO_RECOIL: true,
    BODY: Class.gatlingGun.BODY,
    GUNS: [
        ...weaponMirror({
            POSITION: {
                LENGTH: 13,
                WIDTH: 8,
                ASPECT: 1.9,
                X: 4,
                ANGLE: 120
            },
            PROPERTIES: {
                SHOOT_SETTINGS: combineStats([g.basic, g.machineGun, g.blaster, g.blasterFix, g.doubleTwin]),
                TYPE: "bullet"
            }
        }),
        {
            POSITION: {
                LENGTH: 14,
                WIDTH: 9.5,
                ASPECT: 1.25,
                X: 8
            },
            PROPERTIES: {
                SHOOT_SETTINGS: combineStats([g.basic, g.machineGun, g.gatlingGun, g.doubleTwin]),
                TYPE: "bullet"
            }
        }
    ]
};
Class.twoThirdsNThird = {
    PARENT: "genericTank",
    LABEL: "Two Thirds 'n Third",
    DANGER: 7,
    HAS_NO_RECOIL: true,
    BODY: Class.gatlingGun.BODY,
    GUNS: [
        {
            POSITION: {
                LENGTH: 13,
                WIDTH: 8,
                ASPECT: 1.9,
                X: 4
            },
            PROPERTIES: {
                SHOOT_SETTINGS: combineStats([g.basic, g.machineGun, g.blaster, g.blasterFix, g.doubleTwin]),
                TYPE: "bullet"
            }
        },
        ...weaponMirror({
            POSITION: {
                LENGTH: 14,
                WIDTH: 9.5,
                ASPECT: 1.25,
                X: 8,
                ANGLE: 120
            },
            PROPERTIES: {
                SHOOT_SETTINGS: combineStats([g.basic, g.machineGun, g.gatlingGun, g.doubleTwin]),
                TYPE: "bullet"
            }
        })
    ]
};
Class.overmachineFlank = makeOver("machineFlank", "Overmachine Flank", { angle: 90 });
Class.sniper3.UPGRADES_TIER_4.push("gatling3");



Class.winder = {
    PARENT: "genericTank",
    LABEL: "Winder",
    DANGER: 8,
    GUNS: [
        {
            POSITION: {
                LENGTH: 8,
                WIDTH: 8,
                ASPECT: 0.1,
                X: 21
            }
        },
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
                TYPE: "speedBullet"
            }
        }
    ]
};
Class.coaxialGun = makeGunner("chainGun", "Coaxial Gun");

// Existing Upgrade Management
if (label_correction) {
    Class.machineQuadruple.LABEL = "Quad Machine";
    Class.overmachineFlank.LABEL = "Overdouble Machine";
};

if (!better_retrograde) return;

if (Config.retrograde && Config.arms_race) {
    Class.artillery.UPGRADES_TIER_3.push("doubleArtillery");
    Class.assassin.UPGRADES_TIER_3.push("chainGun");
    Class.blaster.UPGRADES_TIER_3.push("queller", "volley", "spudger", "doubleBlaster", "ripoff", "autoBlaster");
    Class.diesel.UPGRADES_TIER_3.push("doubleDiesel");
    Class.gatlingGun.UPGRADES_TIER_3.push("chainGun", "spudger", "doubleGatling", "gator", "autoGatlingGun" /* widget */);
    Class.machineFlank.UPGRADES_TIER_3.push("doubleArtillery", "doubleMinigun", "doubleGunner", "doubleSprayer", "doubleBlaster", "doubleGatling", "doubleDiesel", "triMachine", "autoMachineFlank");
    Class.machineFlank.UPGRADES_TIER_4 = ["overmachineFlank"];
    Class.minigun.UPGRADES_TIER_3.push("doubleMinigun");
    Class.sprayer.UPGRADES_TIER_3.push("doubleSprayer");

    Class.accurator.UPGRADES_TIER_4 = ["winder", "accugator", "autoAccurator", "slicer"];
    Class.chainGun.UPGRADES_TIER_4.push("assassinator");
    //Class.rimfire.UPGRADES_TIER_4 = ["assassinator"];
    Class.triBlaster.UPGRADES_TIER_4 = ["bentHalve"];
    Class.splasher.UPGRADES_TIER_4 = ["waterslide"];
    Class.subverter.UPGRADES_TIER_4 = ["sacrificer"];
    Class.queller.UPGRADES_TIER_4 = ["throwgun"];
    Class.volley.UPGRADES_TIER_4 = ["trench"];
    Class.focal.UPGRADES_TIER_4.push("winder", "lawnmower");
    Class.flamethrower_RG.UPGRADES_TIER_4 = ["autoFlamethrower_RG", "waterslide"];
    Class.halfNHalf.UPGRADES_TIER_4 = ["thirdNTwoThirds", "twoThirdsNThird", "lawnmower", "slicer", "pneumonicGun", "assassinator", "doubleSpudger", "bentHalve", "waterslide", "eviscerator", "sacrificer", "throwgun", "trench", "autoHalfNHalf"];
    Class.machineTriple.UPGRADES_TIER_4 = ["machineQuadruple", "tripleArtillery", "tripleMinigun", "tripleGunner", "tripleSprayer", "tripleBlaster", "tripleGatling", "tripleDiesel"/*, "hexaMachine"*/, "autoMachineTriple"];
    Class.nailgun.UPGRADES_TIER_4.push("pneumonicGun");


    for (let type of Class.focal.UPGRADES_TIER_4) {
        if (type == "central") {
            Class[type].BODY = Class.assassin.BODY;
        } else {
            Class[type].BODY = Class.focal.BODY;
        }
        Class[type].CONTROLLERS = ["zoom"];
    };
};
