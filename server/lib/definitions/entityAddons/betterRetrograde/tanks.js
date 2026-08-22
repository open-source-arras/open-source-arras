const {combineStats, addUpgrades, removeUpgrades, weaponMirror} = require('../../facilitators.js');
const g = require('../../gunvals.js');

// Remove the below return instruction to enable the addon
return;

// Tier 2 (Level 30)
Class.blaster.GUNS = [
    {
        POSITION: {
            LENGTH: 13,
            WIDTH: 8,
            ASPECT: 1.9,
            X: 4
        },
        PROPERTIES: {
            SHOOT_SETTINGS: combineStats([g.basic, g.machineGun, g.blaster]),
            TYPE: 'bullet'
        }
    }
];
Class.gatlingGun.BODY = Class.machineGun.BODY;
Class.gatlingGun.GUNS = [
    {
        POSITION: {
            LENGTH: 14,
            WIDTH: 9.5,
            ASPECT: 1.25,
            X: 8
        },
        PROPERTIES: {
            SHOOT_SETTINGS: combineStats([g.basic, g.machineGun, g.gatlingGun]),
            TYPE: 'bullet'
        }
    }
];
Class.machineFlank.LABEL = "Double Machine";

// Tier 3 (Level 45)
Class.accurator.BODY = Class.gatlingGun.BODY;
Class.accurator.GUNS = [
    {
        POSITION: {
            LENGTH: 8,
            WIDTH: 8,
            ASPECT: 0.1,
            X: 18
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
            TYPE: 'speedBullet'
        }
    }
];
Class.flamethrower_betterRG = {
    PARENT: 'genericTank',
    LABEL: "Flamethrower",
    DANGER: 7,
    GUNS: [
        {
            POSITION: {
                LENGTH: 3,
                WIDTH: 20,
                ASPECT: 0.95,
                X: 13
            },
            PROPERTIES: {
                SHOOT_SETTINGS: combineStats([g.basic, g.machineGun, g.blaster, g.flamethrower]),
                TYPE: 'growBullet'
            }
        },
        {
            POSITION: {
                LENGTH: 9,
                WIDTH: 12,
                ASPECT: 2,
                X: 4
            }
        }
    ]
};
Class.halfNHalf.GUNS = [
    {
        POSITION: {
            LENGTH: 13,
            WIDTH: 8,
            ASPECT: 1.9,
            X: 4
        },
        PROPERTIES: {
            SHOOT_SETTINGS: combineStats([g.basic, g.machineGun, g.blaster, g.doubleTwin]),
            TYPE: 'bullet'
        }
    },
    {
        POSITION: {
            LENGTH: 14,
            WIDTH: 9.5,
            ASPECT: 1.25,
            X: 8,
            ANGLE: 180
        },
        PROPERTIES: {
            SHOOT_SETTINGS: combineStats([g.basic, g.machineGun, g.gatlingGun, g.doubleTwin]),
            TYPE: 'bullet'
        }
    }
];
Class.machineTriple.LABEL = "Triple Machine";
Class.splasher.GUNS = [
    {
        POSITION: {
            LENGTH: 20,
            WIDTH: 7,
        },
        PROPERTIES: {
            SHOOT_SETTINGS: combineStats([g.basic, g.machineGun, g.lowPower, g.pelleter, { recoil: 1.15 }]),
            TYPE: 'bullet'
        }
    },
    {
        POSITION: {
            LENGTH: 13,
            WIDTH: 8,
            ASPECT: 1.9,
            X: 4
        },
        PROPERTIES: {
            SHOOT_SETTINGS: combineStats([g.basic, g.machineGun, g.blaster]),
            TYPE: 'bullet'
        }
    }
];
Class.triBlaster.GUNS = [
    ...weaponMirror({
        POSITION: {
            LENGTH: 13,
            WIDTH: 8,
            ASPECT: 1.7,
            X: 4,
            Y: 2,
            ANGLE: 15,
            DELAY: 0.5
        },
        PROPERTIES: {
            SHOOT_SETTINGS: combineStats([g.basic, g.machineGun, g.blaster, { recoil: 0.5 }, g.lowPower]),
            TYPE: 'bullet'
        }
    }),
    {
        POSITION: {
            LENGTH: 13,
            WIDTH: 8,
            ASPECT: 1.9,
            X: 6
        },
        PROPERTIES: {
            SHOOT_SETTINGS: combineStats([g.basic, g.machineGun, g.blaster, { recoil: 0.5 }]),
            TYPE: 'bullet'
        }
    }
];

// Class Tree
addUpgrades('blaster', 3, ['flamethrower_betterRG', 'halfNHalf', 'subverter']);

if (Config.retrograde) {
    removeUpgrades('sniper', 2, ['gatlingGun']);

    addUpgrades('flankGuard', 3, ['machineTriple']);
    Class.gatlingGun.UPGRADES_TIER_3.splice(0, 1, 'focal');
    addUpgrades('gunner', 3, ['buttbuttin', 'blower']);
    removeUpgrades('hexaTank', 3, ['tornado_AR']);
    addUpgrades('pounder', 3, ['subverter', 'deathStar']);
    addUpgrades('sprayer', 3, ['splasher']);
};
