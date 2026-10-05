const { combineStats, addUpgrades, removeUpgrades, weaponMirror, weaponStack, makeAuto, makeGuard, makeOver } = require("../../facilitators.js");
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
    UPGRADES_TIER_3: ["vigilante", "spitfire", "quagmire", "autoCrossfire"],
    UPGRADES_TIER_4: ["brushguard"]
};

// Tier 3 (Level 45)
const autoTanksT3 = [
    "crossfire",
    "marksman"
];
for (let i = 0; i < autoTanksT3.length; i++) {
    let type = autoTanksT3[i];
    Class[`auto${type.charAt(0).toUpperCase() + type.slice(1)}`] = makeAuto(type);
    Class[`megaAuto${type.charAt(0).toUpperCase() + type.slice(1)}`] = makeAuto(type, `Mega Auto-${Class[type].LABEL}`, preset.makeAuto.mega);
    Class[`tripleAuto${type.charAt(0).toUpperCase() + type.slice(1)}`] = makeAuto(type, `Triple Auto-${Class[type].LABEL}`, preset.makeAuto.triple);

    if (Config.arms_race) {
        addUpgrades(`auto${type.charAt(0).toUpperCase() + type.slice(1)}`, 4, [...["mega", "triple"].map(x => `${x}Auto${type.charAt(0).toUpperCase() + type.slice(1)}`)]);
    };
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
        }, 3, { lengthOffset: 2, delayIncrement: 1 / 3 })
    ]
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
    ]
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
    ]
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
    [`UPGRADES_TIER_${4}`]: ["autoVigilante"/*, "backlash"*/, "bodyguard"]
};

// Tier 4 (Level 60)
const autoTanksT4 = [
    "piercer",
    "quagmire",
    "spitfire",
    "vigilante"
];
for (let i = 0; i < autoTanksT4.length; i++) {
    let type = autoTanksT4[i];
    Class[`auto${type.charAt(0).toUpperCase() + type.slice(1)}`] = makeAuto(type);
};

const hybridTanksT4 = [
    // Base Tank  //Director
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

Class.brushguard = makeGuard("crossfire", "Brushguard");

// Existing Upgrade Management
const enable_missing_tanks = require("../../groups/tanks/armsRace.js");
if (!enable_missing_tanks) return;

if (Config.arms_race) {
    Class.sniper.UPGRADES_TIER_2.push("crossfire");

    Class.assassin.UPGRADES_TIER_3.push("vigilante");
    Class.marksman.UPGRADES_TIER_3.push("piercer", "quagmire", "autoMarksman");
    Class.minigun.UPGRADES_TIER_3.push("piercer", "spitfire");

    addUpgrades("autoAssassin", 4, ["autoVigilante"]);
    addUpgrades("bushwhacker", 4, ["brushguard"]);
    addUpgrades("hitman", 4, ["bodyguard"]);
};
