const { combineStats, removeUpgrades, weaponArray, weaponMirror, weaponStack, makeAuto, makeBattle, makeBird, makeCap, makeFore, makeGuard, makeGunner, makeOver } = require("../../facilitators.js");
const { base } = require("../../constants.js");
const g = require("../../gunvals.js");
const preset = require("../../presets.js");

// Tier 2 (Level 30)
Class.crossfire = {
    PARENT: "genericTank",
    LABEL: "Crossfire",
    DANGER: 6,
    BODY: Class.sniper.BODY,
    ...preset.placeholder,
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
    UPGRADES_TIER_3: [/*"dispute", "puncturer", "vigilante", "forager", "spitfire", "quickdraw"*/],
    UPGRADES_TIER_4: [/*"brushguard", "hailshot", "sheepfold"*/]
};
Class.fusion = {
    PARENT: "genericTank",
    LABEL: "Fusion",
    DANGER: 6,
    TURRETS: preset.turret.assemblerHat,
    ...preset.placeholder,
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
Class.concussor = {
    PARENT: "genericTank",
    LABEL: "Concussor",
    DANGER: 7,
    TURRETS: preset.turret.assemblerHat,
    ...preset.placeholder,
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
Class.kingfisher = makeBird("fusion", "Kingfisher");
Class.nexus = {
    PARENT: "genericTank",
    LABEL: "Nexus",
    DANGER: 7,
    TURRETS: preset.turret.doubleAssemblerHat,
    ...preset.placeholder,
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
    ...preset.placeholder,
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
Class.slugger = {
    PARENT: "genericTank",
    LABEL: "Slugger",
    DANGER: 7,
    TURRETS: preset.turret.assemblerHat,
    ...preset.placeholder,
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

// Existing Upgrade Management
const enable_missing_tanks = require("../../groups/tanks/armsRace.js");
if (!enable_missing_tanks) return;

if (Config.arms_race) {
    Class.pounder.UPGRADES_TIER_2.push("fusion");
    Class.sniper.UPGRADES_TIER_2.push("crossfire");
};
