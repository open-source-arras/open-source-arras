const { combineStats, skillSet, addUpgrades, removeUpgrades, makeAuto, makeBattle, makeBird, makeCap, makeFlank, makeFore, makeGuard, makeOver, makeRadialAuto, makeSnake, makeGunner, makeWhirlwind, weaponArray, weaponMirror, weaponStack } = require('../facilitators.js');
const { base, dfltskl, smshskl, statnames } = require('../constants.js');
const g = require('../gunvals.js');
const preset = require('../presets.js');
let tier4_AR = 3;

// Basic Tank
Class.basic = {
    PARENT: 'genericTank',
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
                TYPE: 'bullet'
            }
        }
    ]
};

// Tier 1 (Level 15)
Class.desmos = {
    PARENT: 'genericTank',
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
                TYPE: ['bullet', {CONTROLLERS: ['snake']}]
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
    ]
};
Class.director = {
    PARENT: 'genericTank',
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
                TYPE: 'drone',
                AUTOFIRE: true,
                SYNCS_SKILLS: true,
                STAT_CALCULATOR: 'drone',
                MAX_CHILDREN: 6,
                WAIT_TO_CYCLE: true
            }
        }
    ]
};
Class.flail = {
    PARENT: 'genericFlail',
    LABEL: "Flail",
    TURRETS: [{
        TYPE: ['flailBolt3', {
            INDEPENDENT: true
        }],
        POSITION: {
            SIZE: 6,
            X: 10,
            ARC: 190
        }
    }]
};
Class.flankGuard = makeFlank('basic', 3, "Flank Guard", { extraStats: [g.flankGuard] });
Class.flankGuard.BODY = { SPEED: 1.125 * base.SPEED };
Class.machineGun = {
    PARENT: 'genericTank',
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
                TYPE: 'bullet'
            }
        }
    ]
};
Class.pounder = {
    PARENT: 'genericTank',
    LABEL: "Pounder",
    GUNS: [
        {
            POSITION: {
                LENGTH: 20.5,
                WIDTH: 12
            },
            PROPERTIES: {
                SHOOT_SETTINGS: combineStats([g.basic, g.pounder]),
                TYPE: 'bullet'
            }
        }
    ]
};
Class.sniper = {
    PARENT: 'genericTank',
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
                TYPE: 'bullet'
            }
        }
    ]
};
Class.trapper = {
    PARENT: 'genericTank',
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
                TYPE: 'trap',
                STAT_CALCULATOR: 'trap'
            }
        }
    ]
};
Class.twin = {
    PARENT: 'genericTank',
    LABEL: "Twin",
    GUNS: weaponMirror({
        POSITION: {
            LENGTH: 20,
            WIDTH: 8,
            Y: 5.5
        },
        PROPERTIES: {
            SHOOT_SETTINGS: combineStats([g.basic, g.twin]),
            TYPE: 'bullet'
        }
    }, {delayIncrement: 0.5})
};
Class.whirlwind = makeWhirlwind('genericTank', { label: "Whirlwind", satellites: 6, hat: 'hexagonHat_spin', danger: 5 });
Class.whirlwind_bent = {
    PARENT: 'genericTank',
    LABEL: "Whirlwind",
    UPGRADE_LABEL: "Bent Whirlwind",
    GUNS: weaponMirror([
        {
            POSITION: {
                LENGTH: 15,
                WIDTH: 8,
                Y: 4.5,
                ANGLE: 15
            },
            PROPERTIES: {
                SHOOT_SETTINGS: combineStats([g.basic, g.twin, {reload: 5/3}]),
                TYPE: 'satelliteBullet',
                INDEPENDENT_MASTER: true,
            }
        },
        {
            POSITION: {
                LENGTH: 16,
                WIDTH: 4,
                ASPECT: -1.5,
                Y: 4.5,
                ANGLE: 15
            }
        }
    ], {delayIncrement: 0.5}),
    UPGRADES_TIER_2: [
        'maelstrom',
        'hurricane',
        'monsoon',
        'typhoon',
        'tempest',
    ].map(x => x + '_bent')
};

// Tier 2 (Level 30)
const autoTanksT2 = ['trapper'];
for (let i = 0; i < autoTanksT2.length; i++) {
    let type = autoTanksT2[i];
    Class[`auto${type.charAt(0).toUpperCase() + type.slice(1)}`] = makeAuto(type);
    Class[`megaAuto${type.charAt(0).toUpperCase() + type.slice(1)}`] = makeAuto(type, `Mega Auto-${Class[type].LABEL}`, preset.makeAuto.mega);
    Class[`tripleAuto${type.charAt(0).toUpperCase() + type.slice(1)}`] = makeAuto(type, `Triple Auto-${Class[type].LABEL}`, preset.makeAuto.triple);

    Class[`ultraAuto${type.charAt(0).toUpperCase() + type.slice(1)}`] = makeAuto(type, `Ultra Auto-${Class[type].LABEL}`, preset.makeAuto.ultra);
    Class[`tripleMegaAuto${type.charAt(0).toUpperCase() + type.slice(1)}`] = makeAuto(type, `Triple Mega Auto-${Class[type].LABEL}`, preset.makeAuto.tripleMega);
    Class[`pentaAuto${type.charAt(0).toUpperCase() + type.slice(1)}`] = makeAuto(type, `Penta Auto-${Class[type].LABEL}`, preset.makeAuto.penta);

    addUpgrades(`auto${type.charAt(0).toUpperCase() + type.slice(1)}`, 3, [...['mega', 'triple'].map(x => `${x}Auto${type.charAt(0).toUpperCase() + type.slice(1)}`)]);
    if (Config.arms_race) {
        addUpgrades(`megaAuto${type.charAt(0).toUpperCase() + type.slice(1)}`, tier4_AR, [...['ultra', 'tripleMega'].map(x => `${x}Auto${type.charAt(0).toUpperCase() + type.slice(1)}`)]);
        addUpgrades(`tripleAuto${type.charAt(0).toUpperCase() + type.slice(1)}`, tier4_AR, [...['tripleMega', 'penta'].map(x => `${x}Auto${type.charAt(0).toUpperCase() + type.slice(1)}`)]);
    };
};

Class.artillery = {
    PARENT: 'genericTank',
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
                TYPE: 'bullet',
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
                TYPE: 'bullet',
                LABEL: "Heavy"
            }
        }
    ]
};
Class.assassin = {
    PARENT: 'genericTank',
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
                TYPE: 'bullet'
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
Class.auto3 = makeRadialAuto('autoTankGun', { isTurret: true, danger: 6, label: "Auto-3" });
Class.blaster = {
    PARENT: 'genericTank',
    LABEL: "Blaster",
    DANGER: 6,
    GUNS: [
        {
            POSITION: {
                LENGTH: 7.5,
                WIDTH: 12,
                ASPECT: 1.2,
                X: 8
            },
            PROPERTIES: {
                SHOOT_SETTINGS: combineStats([g.basic, g.machineGun, g.blaster]),
                TYPE: 'bullet'
            }
        }
    ]
};
Class.builder = {
    PARENT: 'genericTank',
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
            },
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
                TYPE: 'setTrap',
                STAT_CALCULATOR: 'block'
            }
        }
    ]
};
Class.cruiser = {
    PARENT: 'genericTank',
    LABEL: "Cruiser",
    DANGER: 6,
    FACING_TYPE: 'locksFacing',
    STAT_NAMES: statnames.swarm,
    BODY: {
        FOV: 1.2 * base.FOV,
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
            TYPE: 'swarm',
            STAT_CALCULATOR: 'swarm'
        }
    }, {delayIncrement: 0.5})
};
Class.destroyer = {
    PARENT: 'genericTank',
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
                TYPE: 'bullet'
            }
        }
    ]
};
Class.diesel = {
    PARENT: 'genericTank',
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
                TYPE: 'bullet'
            }
        }
    ]
};
Class.directordrive = {
    PARENT: 'genericTank',
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
                TYPE: 'autoDrone',
                AUTOFIRE: true,
                SYNCS_SKILLS: true,
                STAT_CALCULATOR: 'drone',
                MAX_CHILDREN: 6,
                WAIT_TO_CYCLE: true
            }
        }
    ]
};
Class.doubleFlail = {
    PARENT: 'genericFlail',
    LABEL: "Double Flail",
    DANGER: 6,
    TURRETS: weaponArray(Class.flail.TURRETS, 2)
};
Class.doubleTwin = makeFlank('twin', 2, "Double Twin", { extraStats: [g.doubleTwin] });
Class.flangle = {
    PARENT: 'genericFlail',
    LABEL: "Flangle",
    DANGER: 6,
    STAT_NAMES: statnames.mixed,
    GUNS: weaponMirror({
        POSITION: {
            LENGTH: 16,
            WIDTH: 8,
            ANGLE: 150,
            DELAY: 0.1
        },
        PROPERTIES: {
            SHOOT_SETTINGS: combineStats([g.basic, g.flankGuard, g.triAngle, g.thruster]),
            TYPE: 'bullet',
            LABEL: "Thruster"
        }
    }),
    TURRETS: Class.flail.TURRETS,
    SKILL_CAP: [dfltskl, dfltskl, dfltskl, dfltskl, dfltskl, dfltskl, dfltskl, dfltskl, dfltskl, dfltskl]
};
Class.gatlingGun = {
    PARENT: 'genericTank',
    LABEL: "Gatling Gun",
    DANGER: 6,
    BODY: Class.sniper.BODY,
    GUNS: [
        {
            POSITION: {
                LENGTH: 24,
                WIDTH: 10,
                ASPECT: 1.4
            },
            PROPERTIES: {
                SHOOT_SETTINGS: combineStats([g.basic, g.machineGun, g.gatlingGun]),
                TYPE: 'bullet'
            }
        }
    ]
};
Class.gunner = {
    PARENT: 'genericTank',
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
                TYPE: 'bullet'
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
                TYPE: 'bullet'
            }
        }
    ], {delayIncrement: 0.25})
};
Class.healer = {
    PARENT: 'genericHealer',
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
                TYPE: 'healerBullet'
            }
        }
    ]
};
Class.helix = {
    PARENT: 'genericTank',
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
                TYPE: ['bullet', {CONTROLLERS: ['snake']}]
            },
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
                TYPE: ['bullet', {CONTROLLERS: [['snake', {invert: true}]]}]
            },
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
    ]
};
Class.hexaTank = makeFlank('basic', 6, "Hexa Tank", { extraStats: [g.flankGuard, g.flankGuard], delayIncrement: 0.5, danger: 6 });
Class.honcho = {
    PARENT: 'genericTank',
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
                TYPE: 'drone',
                AUTOFIRE: true,
                SYNCS_SKILLS: true,
                STAT_CALCULATOR: 'drone',
                MAX_CHILDREN: 3,
                WAIT_TO_CYCLE: true
            }
        }
    ]
};
Class.hunter = {
    PARENT: 'genericTank',
    LABEL: "Hunter",
    DANGER: 6,
    BODY: {
        FOV: base.FOV * 1.325
    },
    CONTROLLERS: ['zoom'],
    TOOLTIP: "Hold right click to zoom.",
    GUNS: [
        {
            POSITION: {
                LENGTH: 24,
                WIDTH: 8
            },
            PROPERTIES: {
                SHOOT_SETTINGS: combineStats([g.basic, g.sniper, g.hunter, g.hunterSecondary]),
                TYPE: 'bullet'
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
                TYPE: 'bullet'
            }
        }
    ]
};
Class.hurricane = makeWhirlwind('genericTank', { hat: 'octagonHat_spin', satellites: 8, label: "Hurricane" });
Class.hurricane_bent = {
    PARENT: 'genericTank',
    LABEL: "Hurricane",
    DANGER: 6,
    GUNS: weaponArray([{
        POSITION: {
            LENGTH: 15,
            WIDTH: 8,
            ANGLE: 45
        },
        PROPERTIES: {
            SHOOT_SETTINGS: combineStats([g.basic, g.twin, g.flankGuard, {reload: 5/3}]),
            TYPE: 'satelliteBullet',
            INDEPENDENT_MASTER: true,
        }
    },
    {
        POSITION: {
            LENGTH: 16,
            WIDTH: 4,
            ASPECT: -1.5,
            ANGLE: 45
        }
    }], 4)
};
Class.launcher = {
    PARENT: 'genericTank',
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
                TYPE: 'launcherMissile',
                STAT_CALCULATOR: 'sustained'
            }
        }
    ]
};
Class.mace = {
    PARENT: 'genericFlail',
    LABEL: "Mace",
    DANGER: 6,
    TURRETS: [{
        POSITION: [6, 10, 0, 0, 190, 0],
        TYPE: ["maceBolt3", {
            INDEPENDENT: true
        }]
    }]
};
Class.machineFlank = makeFlank('machineGun', 2, "Machine Flank", { extraStats: [g.doubleTwin] });
Class.machineTrapper = {
    PARENT: 'genericTank',
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
                TYPE: 'trap',
                STAT_CALCULATOR: 'trap'
            }
        }
    ]
};
Class.maelstrom_bent = {
    PARENT: 'genericTank',
    LABEL: "Maelstrom",
    DANGER: 6,
    GUNS: [
        ...weaponMirror([{
            POSITION: {
                LENGTH: 15,
                WIDTH: 8,
                ANGLE: 45,
                DELAY: 0.5
            },
            PROPERTIES: {
                SHOOT_SETTINGS: combineStats([g.basic, g.twin, g.tripleShot, {reload: 5/3}]),
                TYPE: 'satelliteBullet',
                INDEPENDENT_MASTER: true,
            }
        },
        {
            POSITION: {
                LENGTH: 16,
                WIDTH: 4,
                ASPECT: -1.5,
                ANGLE: 45
            }
        }]),
        {
            POSITION: {
                LENGTH: 17,
                WIDTH: 8,
            },
            PROPERTIES: {
                SHOOT_SETTINGS: combineStats([g.basic, g.twin, g.tripleShot]),
                TYPE: 'satelliteBullet',
                INDEPENDENT_MASTER: true,
            }
        },
        {
            POSITION: {
                LENGTH: 18,
                WIDTH: 4,
                ASPECT: -1.5
            }
        }
    ]
};
Class.marksman = {
    PARENT: 'genericTank',
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
                TYPE: 'bullet'
            }
        }
    ]
}
Class.mech = {
    PARENT: 'genericTank',
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
                TYPE: 'autoTrap',
                STAT_CALCULATOR: 'trap'
            }
        }
    ]
};
Class.minigun = {
    PARENT: 'genericTank',
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
            TYPE: 'bullet'
        }
    }, 3, {lengthOffset: 2, delayIncrement: 1/3})
};
Class.monsoon_bent = {
    PARENT: 'genericTank',
    LABEL: "Monsoon",
    DANGER: 6,
    STAT_NAMES: statnames.trap,
    GUNS: weaponMirror([
        {
            POSITION: {
                LENGTH: 15,
                WIDTH: 8,
                Y: 2,
                ANGLE: 30
            }
        },
        {
            POSITION: {
                LENGTH: 2,
                WIDTH: 8,
                ASPECT: 1.25,
                X: 14,
                Y: 2,
                ANGLE: 30
            },
            PROPERTIES: {
                SHOOT_SETTINGS: combineStats([g.trap, {reload: 5/3}]),
                TYPE: "satelliteTrap",
                STAT_CALCULATOR: 'trap',
                INDEPENDENT_MASTER: true
            }
        },
        {
            POSITION: {
                LENGTH: 17,
                WIDTH: 4,
                ASPECT: -1.5,
                Y: 2,
                ANGLE: 30
            }
        }
    ], {delayIncrement: 0.5})
};
Class.overseer = {
    PARENT: 'genericTank',
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
            TYPE: 'drone',
            AUTOFIRE: true,
            SYNCS_SKILLS: true,
            STAT_CALCULATOR: 'drone',
            WAIT_TO_CYCLE: true,
            MAX_CHILDREN: 4
        }
    })
};
Class.pen = {
    PARENT: 'genericTank',
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
                SHOOT_SETTINGS: combineStats([g.basic, g.flankGuard]),
                TYPE: 'bullet'
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
                TYPE: 'trap',
                STAT_CALCULATOR: 'trap'
            }
        }
    ]
};
Class.repeater = {
    PARENT: 'genericTank',
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
                TYPE: ['splitterBullet', {CONTROLLERS: ['snake']}]
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
    ]
};
Class.rifle = {
    PARENT: 'genericTank',
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
                TYPE: 'bullet'
            }
        }
    ]
};
Class.rifle_old = {
    PARENT: 'genericTank',
    LABEL: "Rifle",
    UPGRADE_LABEL: "Old Rifle",
    DANGER: 6,
    BODY: Class.rifle.BODY,
    GUNS: [
        {
            POSITION: {
                LENGTH: 25,
                WIDTH: 7
            },
            PROPERTIES: {
                SHOOT_SETTINGS: combineStats([g.basic, g.sniper, g.rifle]),
                TYPE: 'bullet'
            }
        },
        {
            POSITION: {
                LENGTH: 14,
                WIDTH: 9.5
            }
        }
    ],
    UPGRADES_TIER_3: [
        "sniperRifle",
        "ransacker_old",
        "spreadRifle",
    ]
};
Class.smasher = {
    PARENT: 'genericSmasher',
    LABEL: "Smasher",
    DANGER: 6,
    TURRETS: [
        {
            TYPE: ['hexagonHat_spin', {COLOR: 'black'}],
            POSITION: {
                SIZE: 21.5
            }
        }
    ]
};
Class.spawner = {
    PARENT: 'genericTank',
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
                TYPE: 'minion',
                AUTOFIRE: true,
                SYNCS_SKILLS: true,
                STAT_CALCULATOR: 'drone',
                WAIT_TO_CYCLE: true,
                MAX_CHILDREN: 4
            },
        },
        {
            POSITION: {
                LENGTH: 11.5,
                WIDTH: 12
            }
        }
    ]
};
Class.spiral = {
    PARENT: 'genericTank',
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
                SHOOT_SETTINGS: combineStats([g.basic, g.desmos]),
                TYPE: ['spiralBullet', {CONTROLLERS: ['snake']}]
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
    ]
};
Class.sprayer = {
    PARENT: 'genericTank',
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
                TYPE: 'bullet'
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
                TYPE: 'bullet'
            }
        }
    ]
};
Class.tempest_bent = {
    PARENT: 'genericTank',
    LABEL: "Tempest",
    DANGER: 6,
    GUNS: [
        {
            POSITION: {
                LENGTH: 5,
                WIDTH: 12,
                ASPECT: 1.2,
                X: 8
            },
            PROPERTIES: {
                SHOOT_SETTINGS: combineStats([g.basic, g.machineGun, {reload: 5/3}]), // guess, if it turns out to use satelliteDrones i'll change it
                TYPE: 'satelliteBullet',
                INDEPENDENT_MASTER: true,
            }
        },
        {
            POSITION: {
                LENGTH: 16,
                WIDTH: 6,
                ASPECT: -2
            }
        }
    ]
};
Class.tornado = makeWhirlwind('genericTank', { hat: 'squareHat_spin', hatSize: 10, satellites: 4, satelliteSize: 12, extraStats: [g.pounder], label: "Tornado" });
Class.trapGuard = makeGuard({
    PARENT: 'genericTank',
    DANGER: 4,
    GUNS: [
        {
            POSITION: {
                LENGTH: 20,
                WIDTH: 8
            },
            PROPERTIES: {
                SHOOT_SETTINGS: combineStats([g.basic]),
                TYPE: 'bullet'
            }
        }
    ]
}, "Trap Guard");
Class.triAngle = {
    PARENT: 'genericTank',
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
                TYPE: 'bullet',
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
                TYPE: 'bullet',
                LABEL: "Thruster"
            }
        })
    ]
};
Class.triTrapper = makeFlank('trapper', 3, "Tri-Trapper", { extraStats: [g.flankGuard] });
Class.tripleShot = {
    PARENT: 'genericTank',
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
                TYPE: 'bullet'
            }
        }),
        {
            POSITION: {
                LENGTH: 22,
                WIDTH: 8
            },
            PROPERTIES: {
                SHOOT_SETTINGS: combineStats([g.basic, g.twin, g.tripleShot]),
                TYPE: 'bullet'
            }
        }
    ]
};
Class.typhoon_bent = {
    PARENT: 'genericTank',
    LABEL: "Typhoon",
    DANGER: 6,
    GUNS: [
        {
            POSITION: {
                LENGTH: 15,
                WIDTH: 12,
            },
            PROPERTIES: {
                SHOOT_SETTINGS: combineStats([g.basic, g.pounder, {reload: 5/3}]),
                TYPE: 'satelliteBullet',
                INDEPENDENT_MASTER: true,
            }
        },
        {
            POSITION: {
                LENGTH: 16,
                WIDTH: 8,
                ASPECT: -1.5
            }
        }
    ]
};
Class.underseer = {
    PARENT: 'genericTank',
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
            TYPE: 'sunchip',
            AUTOFIRE: true,
            SYNCS_SKILLS: true,
            STAT_CALCULATOR: 'necro',
            WAIT_TO_CYCLE: true,
            DELAY_SPAWN: false
        }
    }, 2)
};
Class.undertow = {
    PARENT: 'genericTank',
    LABEL: "Undertow",
    DANGER: 6,
    GUNS: [
        {
           POSITION: [14, 12, 0.8, 0, 0, 0, 0],
            PROPERTIES: {
                SHOOT_SETTINGS: combineStats([g.basic, { size: 0.8, reload: 1.2 }]),
                TYPE: 'undertowBullet'
            }
        },
        ...weaponMirror({
            POSITION: [11.25, 8, 0.15, 4.25, 4, 13.5, 0]
        })
    ]
};
Class.volute = {
    PARENT: 'genericTank',
    LABEL: "Volute",
    DANGER: 6,
    STAT_NAMES: statnames.desmos,
    GUNS: [
        {
            POSITION: {
                LENGTH: 20,
                WIDTH: 11,
                ASPECT: -1.2
            },
            PROPERTIES: {
                SHOOT_SETTINGS: combineStats([g.basic, g.pounder, g.desmos]),
                TYPE: ['bullet', {CONTROLLERS: ['snake']}]
            }
        },
        ...weaponMirror({
            POSITION: {
                LENGTH: 6.25,
                WIDTH: 5,
                ASPECT: -4,
                X: -6.5,
                Y: -7,
                ANGLE: 90
            }
        })
    ]
};
Class.wark = {
    PARENT: 'genericTank',
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
                TYPE: 'trap',
                STAT_CALCULATOR: 'trap'
            }
        }
    ], {delayIncrement: 0.5})
};
Class.whirlwind_old = makeWhirlwind('genericTank', { hat: 'circleHat', hatSize: 24, hatLayer: 0, satellites: 6, satelliteType: 'satellite_old', label: "Whirlwind" });
Class.whirlwind_old.UPGRADE_LABEL = "Old Whirlwind";
Class.whirlwind_old.UPGRADES_TIER_3 = ['monsoon', 'maelstrom', 'tornado_old', 'typhoon_old', 'vortex_old'];

// Tier 3 (Level 45)
const autoTanksT3 = [
    'artillery',
    'assassin',
    'auto3',
    'builder',
    'cruiser',
    'destroyer',
    'diesel',
    'gunner',
    'hexaTank',
    'honcho',
    'hunter',
    'launcher',
    'mech',
    'minigun',
    'overseer',
    'pen',
    'rifle',
    'spawner',
    //'sprayer',
    'trapGuard',
    'triAngle',
    'tripleShot',
    'underseer',
    'wark'
];
for (let i = 0; i < autoTanksT3.length; i++) {
    let type = autoTanksT3[i];
    Class[`auto${type.charAt(0).toUpperCase() + type.slice(1)}`] = makeAuto(type);
    Class[`megaAuto${type.charAt(0).toUpperCase() + type.slice(1)}`] = makeAuto(type, `Mega Auto-${Class[type].LABEL}`, preset.makeAuto.mega);
    Class[`tripleAuto${type.charAt(0).toUpperCase() + type.slice(1)}`] = makeAuto(type, `Triple Auto-${Class[type].LABEL}`, preset.makeAuto.triple);

    if (Config.arms_race) {
        addUpgrades(`auto${type.charAt(0).toUpperCase() + type.slice(1)}`, tier4_AR, [...['mega', 'triple'].map(x => `${x}Auto${type.charAt(0).toUpperCase() + type.slice(1)}`)]);
    };
};

const hybridTanksT3 = [
    // Base Tank    //Director      //Cruiser           //Spawner       //Honcho            //Overseer  //Directordrive
    ['artillery',   "Force",        "Mixer",            "Generator",    "Energizer"         ],
    ['assassin',    "Hitman",       "Gunman",           "Formulator",   "Contractor"        ],
    ['builder',     "Fashioner",    "Stylist",          "Experimenter", "Methodist"         ],
    ['diesel',      "Polluter",     "Depraver",         "Tainter",      "Befouler"          ],
    ['destroyer',   "Hybrid",       "Synthesis",        "Enactor",      "Crossbreed"        ],
    ['hunter',      "Poacher",      "Plunderer",        "Maker",        "Nabber"            ],
    ['launcher',    "Heaver",       "Lobber",           "Duper",        "Emitter"           ],
    ['mech',        "Cobbler",      "Fuser",            "Automaton",    "Restorer"          ],
    ['minigun',     "Crop Duster",  "Trimmer",          "Shearer",      "Sweeper"           ],
    ['pen',         "Interner",     "Kettle",           "Ringer",       "Probationer"       ],
    ['tripleShot',  "Bent Hybrid",  "Bent Synthesis",   "Hatcher",      "Bent Crossbreed",  "Overshot"  ],
    ['rifle',       "Armsman",      "Partisan",         "Copier",       "Vendor"            ],
    ['wark',        "Coalesce",     "Affiliator",       "Converger",    "Commix",           undefined,  "Warkdrive"],
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
        return x.charAt(0).toLowerCase() + x.slice(1).replace(/[\s-]+/g, '');
    };
    let typeDirector = typeify(director);
    let typeOverseer = typeify(overseer);
    let typeCruiser = typeify(cruiser);
    let typeSpawner = typeify(spawner);
    let typeHoncho = typeify(honcho);
    let typeDirectordrive = typeify(directordrive);

    Class[typeDirector] = makeOver(type, director, preset.hybrid);
    Class[typeOverseer] = makeOver(type, overseer);
    Class[typeCruiser] = makeBattle(type, cruiser, preset.hybrid);
    Class[typeSpawner] = makeCap(type, spawner, preset.hybrid);
    Class[typeHoncho] = makeFore(type, honcho, preset.makeFore.hybrid);
    Class[typeDirectordrive] = makeOver(type, directordrive, { ...preset.hybrid, drive: true });

    if (Config.arms_race) {
        addUpgrades(typeDirector, tier4_AR, [typeOverseer, typeCruiser, typeSpawner, typeDirectordrive, typeHoncho]);
    };
};

Class.accurator = {
    PARENT: 'genericTank',
    LABEL: "Accurator",
    DANGER: 7,
    BODY: Class.gatlingGun.BODY,
    GUNS: [
        {
            POSITION: {
                LENGTH: 3,
                WIDTH: 0.1,
                ASPECT: -10,
                X: 24
            }
        },
        {
            POSITION: {
                LENGTH: 24,
                WIDTH: 10,
                ASPECT: 1.4
            },
            PROPERTIES: {
                SHOOT_SETTINGS: combineStats([g.basic, g.machineGun, g.gatlingGun]),
                TYPE: 'speedBullet'
            }
        }
    ]
};
Class.ambulance = {
    PARENT: 'genericHealer',
    LABEL: "Ambulance",
    BODY: {
        HEALTH: base.HEALTH * 0.8,
        SHIELD: base.SHIELD * 0.8,
        DENSITY: base.DENSITY * 0.6,
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
                TYPE: 'healerBullet',
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
                TYPE: 'bullet',
                LABEL: "Thruster"
            }
        })
    ]
};
Class.annihilator = {
    PARENT: 'genericTank',
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
                TYPE: 'bullet'
            }
        }
    ]
};
Class.architect = makeRadialAuto('architectGun', { isTurret: true, danger: 7, size: 12, label: "Architect", body: { FOV: base.FOV * 1.15, SPEED: base.SPEED * 1.125 } });
Class.assembler = {
    PARENT: 'genericTank',
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
                TYPE: 'assemblent',
                NO_LIMITATIONS: true,
                MAX_CHILDREN: 8,
                STAT_CALCULATOR: 'block',
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
    PARENT: 'genericTank',
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
                TYPE: 'bullet'
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
                TYPE: 'bullet'
            }
        }
    ]
};
Class.auto4 = makeRadialAuto('auto4gun', { isTurret: true, danger: 7, size: 13, x: 6, angle: 45, label: "Auto-4", count: 4 });
Class.auto4_old = makeRadialAuto('auto4gun', { isTurret: true, danger: 7, size: 13, x: 6, label: "Gunner-3", count: 3 });
Class.auto5 = makeRadialAuto('autoTankGun', { isTurret: true, danger: 7, label: "Auto-5", count: 5 });
Class.autoDirectordrive = makeAuto('directordrive', "Auto-Directordrive", preset.makeAuto.drive);
Class.autoDouble = makeAuto('doubleTwin', "Auto-Double");
Class.autoSmasher = makeAuto('smasher', "Auto-Smasher", { type: 'autoSmasherTurret', size: 11 });
Class.autoSmasher.SKILL_CAP = Array(10).fill(smshskl);
Class.banshee = makeRadialAuto('bansheegun', { isTurret: true, danger: 7, size: 10, arc: 80, label: "Banshee", body: { FOV: base.FOV * 1.1 } });
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
        TYPE: 'drone',
        AUTOFIRE: true,
        SYNCS_SKILLS: true,
        STAT_CALCULATOR: 'drone',
        WAIT_TO_CYCLE: true,
        MAX_CHILDREN: 2,
    },
}, 3);
Class.barricade = {
    PARENT: 'genericTank',
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
                TYPE: 'trap',
                STAT_CALCULATOR: 'trap'
            }
        }, 3, {xPosOffset: 4, delayIncrement: 1/3})
    ]
};
Class.battery = {
    PARENT: 'genericTank',
    LABEL: "Battery",
    DANGER: 7,
    GUNS: [
        ...weaponMirror([{
            POSITION: {
                LENGTH: 12,
                WIDTH: 3.5,
                Y: 7.25,
                DELAY: 0.6
            },
            PROPERTIES: {
                SHOOT_SETTINGS: combineStats([g.basic, g.twin, g.gunner, { speed: 1.2 }]),
                TYPE: 'bullet'
            }
        },
        {
            POSITION: {
                LENGTH: 16,
                WIDTH: 3.5,
                Y: 3.75,
                DELAY: 0.2
            },
            PROPERTIES: {
                SHOOT_SETTINGS: combineStats([g.basic, g.twin, g.gunner, { speed: 1.2 }]),
                TYPE: 'bullet'
            }
        }], {delayIncrement: 0.2}),
        {
            POSITION: {
                LENGTH: 20,
                WIDTH: 3.5
            },
            PROPERTIES: {
                SHOOT_SETTINGS: combineStats([g.basic, g.twin, g.gunner, { speed: 1.2 }]),
                TYPE: 'bullet'
            }
        }
    ]
};
Class.battleship = {
    PARENT: 'genericTank',
    LABEL: "Battleship",
    DANGER: 7,
    STAT_NAMES: statnames.swarm,
    FACING_TYPE: 'locksFacing',
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
                TYPE: 'swarm',
                STAT_CALCULATOR: 'swarm',
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
                TYPE: 'autoswarm',
                STAT_CALCULATOR: 'swarm',
                LABEL: "Autonomous"
            }
        }, {delayIncrement: 0.5})
    ]
};
Class.beekeeper = {
    PARENT: 'genericTank',
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
                TYPE: ['bee', { INDEPENDENT: true }],
                SYNCS_SKILLS: true,
                STAT_CALCULATOR: 'drone',
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
                TYPE: 'bullet',
                LABEL: "Heavy"
            }
        }
    ]
};
Class.bender = {
    PARENT: 'genericTank',
    LABEL: "Bender",
    DANGER: 7,
    STAT_NAMES: statnames.drone,
    BODY: Class.spawner.BODY,
    GUNS: [
        {
            POSITION: [4.5, 10, 1, 10.5, 0, 0, 0],
        },
        {
            POSITION: [1, 12, 1, 15, 0, 0, 0],
            PROPERTIES: {
                MAX_CHILDREN: 4, // todo: check if this is still 3
                SHOOT_SETTINGS: combineStats([g.minion, g.spawner]),
                TYPE: 'desmosMinion',
                STAT_CALCULATOR: 'drone',
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
Class.bentDouble = makeFlank('tripleShot', 2, "Bent Double", { extraStats: [g.doubleTwin] });
Class.bigCheese = {
    PARENT: 'genericTank',
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
                TYPE: 'drone',
                AUTOFIRE: true,
                SYNCS_SKILLS: true,
                STAT_CALCULATOR: 'drone',
                MAX_CHILDREN: 1,
                WAIT_TO_CYCLE: true
            }
        }
    ]
};
Class.bigMama = {
    PARENT: 'genericFlail',
    LABEL: "BIG MAMA",
    DANGER: 7,
    TURRETS: [{
        POSITION: [6, 10, 0, 0, 190, 0],
        TYPE: ["mamaBolt3", {
            INDEPENDENT: true
        }]
    }]
};
Class.blizzard = makeWhirlwind('genericTank', { dualLayer: true, hat: "pentagonHat_spin", hat2: "pentagonHat_spinReverse", satellites: 5, label: "Blizzard", danger: 7 });
Class.blower = makeGunner('destroyer', "Blower");
Class.blunderbuss = {
    PARENT: 'genericTank',
    LABEL: "Blunderbuss",
    DANGER: 7,
    BODY: {
        FOV: base.FOV * 1.225
    },
    GUNS: [
        ...weaponMirror([{
            POSITION: {
                LENGTH: 13,
                WIDTH: 4,
                Y: 3,
                ANGLE: 9,
            },
            PROPERTIES: {
                SHOOT_SETTINGS: combineStats([g.basic, g.sniper, g.rifle, g.blunderbuss]),
                TYPE: 'bullet',
                LABEL: "Pellet"
            }
        },
        {
            POSITION: {
                LENGTH: 15,
                WIDTH: 4,
                Y: 2.5,
                ANGLE: 6,
            },
            PROPERTIES: {
                SHOOT_SETTINGS: combineStats([g.basic, g.sniper, g.rifle, g.blunderbuss]),
                TYPE: 'bullet',
                LABEL: "Pellet"
            }
        },
        {
            POSITION: {
                LENGTH: 16,
                WIDTH: 4,
                Y: 2,
                ANGLE: 3,
            },
            PROPERTIES: {
                SHOOT_SETTINGS: combineStats([g.basic, g.sniper, g.rifle, g.blunderbuss]),
                TYPE: 'bullet',
                LABEL: "Pellet"
            }
        }]),
        {
            POSITION: {
                LENGTH: 25,
                WIDTH: 7
            },
            PROPERTIES: {
                SHOOT_SETTINGS: combineStats([g.basic, g.sniper, g.rifle]),
                TYPE: 'bullet'
            }
        },
        {
            POSITION: {
                LENGTH: 14,
                WIDTH: 10.5
            }
        }
    ]
};
Class.bomber = {
    PARENT: 'genericTank',
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
                TYPE: 'bullet',
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
                TYPE: 'bullet',
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
                TYPE: 'trap',
                STAT_CALCULATOR: 'trap'
            }
        }
    ]
};
Class.bonker = {
    PARENT: 'genericSmasher',
    LABEL: "Bonker",
    SIZE: Class.genericTank.SIZE * 0.7,
    BODY: {
        FOV: 1.2 * base.FOV,
        HEALTH: 0.95 * base.HEALTH,
        SPEED: 1.1 * base.SPEED,
    },
    TURRETS: Class.smasher.TURRETS
};
Class.boomer = {
    PARENT: 'genericTank',
    LABEL: "Boomer",
    DANGER: 7,
    STAT_NAMES: statnames.trap,
    FACING_TYPE: 'locksFacing',
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
                TYPE: 'boomerang',
                STAT_CALCULATOR: 'block'
            }
        }
    ]
};
Class.bentBoomer_old = {
    PARENT: 'genericTank',
    LABEL: "Boomer",
    UPGRADE_LABEL: "Old Bent Boomer",
    DANGER: 7,
    STAT_NAMES: statnames.trap,
    BODY: {
        SPEED: 0.8 * base.SPEED,
        FOV: 1.15 * base.FOV,
    },
    GUNS: weaponMirror([
        {
            POSITION: [8, 10, 1, 8, -2, -35, 0]
        },
        {
            POSITION: [2, 10, 1.3, 16, -2, -35, 0],
            PROPERTIES: {
                SHOOT_SETTINGS: combineStats([g.trap, g.setTrap, g.twin, {speed: 1.2}]),
                TYPE: 'boomerang'
            }
        }
    ], {delayIncrement: 0.5})
};
Class.booster = {
    PARENT: 'genericTank',
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
                TYPE: 'bullet',
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
                    TYPE: 'bullet',
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
                    TYPE: 'bullet',
                    LABEL: "Thruster"
                }
            }
        ])
    ]
};
Class.bulwark = {
    PARENT: 'genericTank',
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
                TYPE: 'bullet',
            },
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
                TYPE: 'trap',
                STAT_CALCULATOR: 'trap'
            }
        }
    ], {delayIncrement: 0.5})
};
Class.bulwark_old = {
    PARENT: 'genericTank',
    LABEL: "Double Trap Guard",
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
                TYPE: 'bullet',
            },
        },
        {
            POSITION: {
                LENGTH: 14,
                WIDTH: 6,
                Y: 6,
                ANGLE: 180
            }
        },
        {
            POSITION: {
                LENGTH: 4,
                WIDTH: 6,
                ASPECT: 1.5,
                X: 13,
                Y: 6,
                ANGLE: 180
            },
            PROPERTIES: {
                SHOOT_SETTINGS: combineStats([g.trap, g.twin]),
                TYPE: 'trap',
                STAT_CALCULATOR: 'trap'
            }
        }
    ], {delayIncrement: 0.5})
};
Class.bushwhacker = makeGuard('sniper', "Bushwhacker");
Class.buttbuttin = makeGunner('assassin', "Buttbuttin");
Class.captain = {
    PARENT: 'genericTank',
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
                TYPE: 'minion',
                AUTOFIRE: true,
                SYNCS_SKILLS: true,
                STAT_CALCULATOR: 'drone',
                WAIT_TO_CYCLE: true,
                MAX_CHILDREN: 4
            },
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
Class.carrier = {
    PARENT: 'genericTank',
    LABEL: "Carrier",
    DANGER: 7,
    STAT_NAMES: statnames.swarm,
    FACING_TYPE: 'locksFacing',
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
                TYPE: 'swarm',
                STAT_CALCULATOR: 'swarm'
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
                TYPE: 'swarm',
                STAT_CALCULATOR: 'swarm'
            }
        }
    ]
};
Class.cocci = makeSnake('smasher', 5, "Cocci");
Class.coil = {
    PARENT: 'genericTank',
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
                SHOOT_SETTINGS: combineStats([g.basic, g.twin, g.desmos]),
                TYPE: ['spiralBullet', {CONTROLLERS: ['snake']}]
            },
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
                TYPE: ['spiralBullet', {CONTROLLERS: [['snake', {invert: true}]]}]
            },
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
Class.combo = {
    PARENT: 'genericTank',
    LABEL: "Combo",
    DANGER: 7,
    GUNS: weaponArray({
        POSITION: {
            LENGTH: 18,
            WIDTH: 8
        },
        PROPERTIES: {
            SHOOT_SETTINGS: combineStats([g.basic, g.flankGuard, g.flankGuard]),
            TYPE: 'bullet'
        }
    }, 3),
    TURRETS: weaponArray({
        TYPE: ['autoTankGun', { INDEPENDENT: true }],
        POSITION: {
            SIZE: 11,
            X: 8,
            ANGLE: 180,
            ARC: 190
        }
    }, 3)
};
Class.commander = {
    PARENT: 'genericTank',
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
                TYPE: 'drone',
                AUTOFIRE: true,
                SYNCS_SKILLS: true,
                MAX_CHILDREN: 2,
                STAT_CALCULATOR: 'drone'
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
                TYPE: 'swarm',
                STAT_CALCULATOR: 'swarm'
            }
        }, 3, {delayIncrement: 1/3})
    ]
};
Class.commander_old = {
    PARENT: 'genericTank',
    LABEL: "Commander",
    UPGRADE_LABEL: "Old Commander",
    DANGER: 7,
    STAT_NAMES: statnames.drone,
    BODY: {
        FOV: 1.15 * base.FOV,
    },
    FACING_TYPE: 'spin',
    GUNS: [
        {
            POSITION: {
                LENGTH: 6,
                WIDTH: 12,
                ASPECT: 1.2,
                X: 8
            },
            PROPERTIES: {
                SHOOT_SETTINGS: combineStats([g.drone, g.commander]),
                TYPE: 'drone',
                AUTOFIRE: true,
                SYNCS_SKILLS: true,
                STAT_CALCULATOR: 'drone',
                MAX_CHILDREN: 6
            },
        },
        ...weaponMirror({
            POSITION: {
                LENGTH: 6,
                WIDTH: 12,
                ASPECT: 1.2,
                X: 8,
                ANGLE: 120
            },
            PROPERTIES: {
                SHOOT_SETTINGS: combineStats([g.drone, g.commander]),
                TYPE: ['drone', {INDEPENDENT: true}],
                AUTOFIRE: true,
                SYNCS_SKILLS: true,
                STAT_CALCULATOR: 'drone',
                MAX_CHILDREN: 6
            },
        })
    ]
};
Class.conqueror = {
    PARENT: 'genericTank',
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
                TYPE: 'bullet'
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
                TYPE: 'setTrap',
                STAT_CALCULATOR: 'block'
            }
        }
    ]
};
Class.construct = { // it's "construct" and not "constructor" because "constructor" breaks things
    PARENT: 'genericTank',
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
                TYPE: 'setTrap',
                STAT_CALCULATOR: 'block'
            }
        }
    ]
};
Class.crowbar = {
    PARENT: 'genericTank',
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
Class.crossbow = {
    PARENT: 'genericTank',
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
                TYPE: 'bullet'
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
                TYPE: 'bullet'
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
                TYPE: 'bullet'
            }
        }], {delayOverflow: true}),
        {
            POSITION: {
                LENGTH: 24,
                WIDTH: 7
            },
            PROPERTIES: {
                SHOOT_SETTINGS: combineStats([g.basic, g.sniper, g.rifle, g.crossbow, { speed: 0.7, maxSpeed: 0.7 }, { recoil: 0.5 }]),
                TYPE: 'bullet'
            }
        }
    ]
};
Class.cruiserdrive = {
    PARENT: 'genericTank',
    LABEL: "Cruiserdrive",
    DANGER: 7,
    FACING_TYPE: 'locksFacing',
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
            TYPE: 'autoSwarm',
            STAT_CALCULATOR: 'swarm'
        }
    }, {delayIncrement: 0.5})
};
Class.cyclone = {
    PARENT: 'genericTank',
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
                TYPE: 'bullet'
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
                TYPE: 'bullet'
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
                TYPE: 'bullet'
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
                TYPE: 'bullet'
            }
        }
    ], 3)
};
Class.deadeye = {
    PARENT: 'genericTank',
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
                TYPE: 'bullet'
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
Class.deathStar = {
    PARENT: 'genericTank',
    LABEL: "Death Star",
    DANGER: 7,
    GUNS: weaponArray([
        {
            POSITION: {
                LENGTH: 20.5,
                WIDTH: 12,
                ANGLE: 180,
                DELAY: 0.5
            },
            PROPERTIES: {
                SHOOT_SETTINGS: combineStats([g.basic, g.pounder, g.flankGuard, g.flankGuard]),
                TYPE: 'bullet'
            }
        },
        {
            POSITION: {
                LENGTH: 20.5,
                WIDTH: 12
            },
            PROPERTIES: {
                SHOOT_SETTINGS: combineStats([g.basic, g.pounder, g.flankGuard, g.flankGuard]),
                TYPE: 'bullet'
            }
        }
    ], 3)
};
Class.deathStar_old = {
    PARENT: 'genericTank',
    LABEL: "Death Star",
    UPGRADE_LABEL: "Old Death Star",
    DANGER: 7,
    GUNS: weaponArray([
        {
            POSITION: {
                LENGTH: 16,
                WIDTH: 14
            },
            PROPERTIES: {
                SHOOT_SETTINGS: combineStats([g.basic, g.pounder, g.destroyer, {reload: 2}]),
                TYPE: 'bullet'
            }
        },
        {
            POSITION: {
                LENGTH: 16,
                WIDTH: 14,
                ANGLE: 180,
                DELAY: 0.05
            },
            PROPERTIES: {
                SHOOT_SETTINGS: combineStats([g.basic, g.pounder, g.destroyer, {reload: 2}]),
                TYPE: 'bullet'
            }
        }
    ], 3)
};
Class.defect = makeBird('tripleShot', "Defect");
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
Class.doubleFlankTwin = makeFlank({
    PARENT: 'genericTank',
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
                SHOOT_SETTINGS: combineStats([g.basic, g.twin, g.doubleTwin]),
                TYPE: 'bullet'
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
                TYPE: 'bullet'
            }
        }, {delayIncrement: 0.5})
    ]
}, 2, "Double Flank Twin", { extraStats: [g.doubleTwin] });
Class.doubleGunner = makeFlank('gunner', 2, "Double Gunner", { extraStats: [g.doubleTwin] });
Class.dreadnought_old = {
    PARENT: 'genericTank',
    LABEL: "Dreadnought",
    UPGRADE_LABEL: "Bad Dreadnought",
    DANGER: 7,
    FACING_TYPE: 'locksFacing',
    STAT_NAMES: statnames.swarm,
    BODY: Class.cruiser.BODY,
    TURRETS: [
        {
            TYPE: ['circleHat', {COLOR: 'grey'}],
            POSITION: {
                SIZE: 19.5,
                X: -4.5,
            }
        }
    ],
    GUNS: [
        {
            POSITION: {
                LENGTH: 15,
                WIDTH: 7
            }
        },
        {
            POSITION: {
                LENGTH: 5,
                WIDTH: 15,
                X: 15
            },
            PROPERTIES: {
                SHOOT_SETTINGS: combineStats([g.swarm, { reload: 0.5, damage: 2, size: 0.5 }]),
                TYPE: 'swarm',
                STAT_CALCULATOR: 'swarm'
            }
        },
        {
            POSITION: {
                LENGTH: 7,
                WIDTH: 2,
                ASPECT: 4,
                X: -1,
                Y: 2.5,
                ANGLE: 180
            }
        },
        {
            POSITION: {
                LENGTH: 7,
                WIDTH: 2,
                ASPECT: 4,
                X: -1,
                Y: -2.5,
                ANGLE: 180
            }
        },
        {
            POSITION: {
                LENGTH: 7,
                WIDTH: 2,
                ASPECT: 4,
                X: -1,
                Y: 2.5,
                ANGLE: 180
            }
        },
        {
            POSITION: {
                LENGTH: 7,
                WIDTH: 2,
                ASPECT: 4,
                X: -1,
                Y: -2.5,
                ANGLE: 180
            }
        },
        {
            POSITION: {
                LENGTH: 7,
                WIDTH: 2,
                ASPECT: 4,
                X: 0.5,
                ANGLE: 180
            }
        },
        {
            POSITION: {
                LENGTH: 7,
                WIDTH: 2,
                ASPECT: 4,
                X: -1,
                Y: 2.5,
                ANGLE: 220
            }
        },
        {
            POSITION: {
                LENGTH: 7,
                WIDTH: 2,
                ASPECT: 4,
                X: -1,
                Y: 2.5,
                ANGLE: 220
            }
        },
        {
            POSITION: {
                LENGTH: 7,
                WIDTH: 2,
                ASPECT: 4,
                X: -1,
                Y: 2.5,
                ANGLE: 220
            }
        },
        {
            POSITION: {
                LENGTH: 7,
                WIDTH: 2,
                ASPECT: 4,
                X: -1,
                Y: -2.5,
                ANGLE: -220
            }
        },
        {
            POSITION: {
                LENGTH: 7,
                WIDTH: 2,
                ASPECT: 4,
                X: -1,
                Y: -2.5,
                ANGLE: -220
            }
        },
        {
            POSITION: {
                LENGTH: 7,
                WIDTH: 2,
                ASPECT: 4,
                X: -1,
                Y: -2.5,
                ANGLE: -200
            }
        },
        {
            POSITION: [1, 3, 1, 3, 0, 180, 0], // temporary propeller
            PROPERTIES: {
                SHOOT_SETTINGS: combineStats([g.basic, g.twin, g.gunner, g.machineGun, g.thruster, [0.1, 3, 1, 1, 1, 1, 1, 1, 1, 0.075, 1, 2, 1]]),
                TYPE: 'bullet'
            }
        }
    ]
};
Class.dual = {
    PARENT: 'genericTank',
    LABEL: "Dual",
    DANGER: 7,
    BODY: {
        FOV: 1.2 * base.FOV
    },
    CONTROLLERS: [['zoom', {distance: 165}]],
    GUNS: weaponMirror([
        {
            POSITION: {
                LENGTH: 18,
                WIDTH: 7,
                Y: 5.5
            },
            PROPERTIES: {
                SHOOT_SETTINGS: combineStats([g.basic, g.twin, g.dual, g.lowPower]),
                TYPE: 'bullet',
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
                TYPE: 'bullet'
            }
        }
    ], {delayIncrement: 0.5})
};
Class.duplicator = {
    PARENT: 'genericTank',
    LABEL: "Duplicator",
    DANGER: 7,
    STAT_NAMES: statnames.desmos,
    GUNS: [
        {
            POSITION: [20, 8, -4/3, 0, 0, 20, 0],
            PROPERTIES: {
                SHOOT_SETTINGS: combineStats([g.basic, g.twin, g.desmos]),
                TYPE: ['splitterBullet', {CONTROLLERS: [['snake', {invert: false}]]}]
            }
        },
        {
            POSITION: [20, 8, -4/3, 0, 0, -20, 0],
            PROPERTIES: {
                SHOOT_SETTINGS: combineStats([g.basic, g.twin, g.desmos]),
                TYPE: ['splitterBullet', {CONTROLLERS: [['snake', {invert: true}]]}]
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
        },
    ]
};
Class.eagle = makeBird('pounder', "Eagle");
Class.engineer = {
    PARENT: 'genericTank',
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
                TYPE: 'pillbox',
                NO_LIMITATIONS: true,
                SYNCS_SKILLS: true,
                DESTROY_OLDEST_CHILD: true,
                STAT_CALCULATOR: 'block',
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
    PARENT: 'genericTank',
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
                TYPE: 'minion',
                AUTOFIRE: true,
                SYNCS_SKILLS: true,
                STAT_CALCULATOR: 'drone',
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
Class.falcon = makeBird('assassin', "Falcon");
Class.fieldGun = {
    PARENT: 'genericTank',
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
                TYPE: 'bullet',
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
                TYPE: 'launcherMissile',
                STAT_CALCULATOR: 'sustained'
            }
        }
    ]
};
Class.fighter = {
    PARENT: 'genericTank',
    LABEL: "Fighter",
    DANGER: 7,
    BODY: {
        DENSITY: 0.6 * base.DENSITY,
    },
    GUNS: [
        {
            POSITION: {
                LENGTH: 18,
                WIDTH: 8
            },
            PROPERTIES: {
                SHOOT_SETTINGS: combineStats([g.basic, g.flankGuard, g.triAngle, g.triAngleFront, { recoil: 4 }]),
                TYPE: 'bullet',
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
                    TYPE: 'bullet',
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
                    TYPE: 'bullet',
                    LABEL: "Thruster"
                }
            }
        ]),
    ]
};
Class.flace = {
    PARENT: 'genericFlail',
    LABEL: "Flace",
    DANGER: 7,
    STAT_NAMES: statnames.mixed,
    GUNS: weaponMirror({
        POSITION: {
            LENGTH: 16,
            WIDTH: 8,
            ANGLE: 150,
            DELAY: 0.1
        },
        PROPERTIES: {
            SHOOT_SETTINGS: combineStats([g.basic, g.flankGuard, g.triAngle, g.thruster]),
            TYPE: 'bullet',
            LABEL: "Thruster"
        }
    }),
    TURRETS: Class.mace.TURRETS,
    SKILL_CAP: [dfltskl, dfltskl, dfltskl, dfltskl, dfltskl, dfltskl, dfltskl, dfltskl, dfltskl, dfltskl],
};
Class.flooster = {
    PARENT: 'genericFlail',
    LABEL: "Flooster",
    DANGER: 7,
    STAT_NAMES: statnames.mixed,
    GUNS: weaponMirror([
        {
            POSITION: {
                LENGTH: 14,
                WIDTH: 8,
                ANGLE: 135,
                DELAY: 0.6
            },
            PROPERTIES: {
                SHOOT_SETTINGS: combineStats([g.basic, g.flankGuard, g.triAngle, g.thruster]),
                TYPE: 'bullet',
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
                TYPE: 'bullet',
                LABEL: "Thruster"
            }
        }
    ]),
    TURRETS: Class.flail.TURRETS,
    SKILL_CAP: [dfltskl, dfltskl, dfltskl, dfltskl, dfltskl, dfltskl, dfltskl, dfltskl, dfltskl, dfltskl],
};
Class.focal = {
    PARENT: 'genericTank',
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
                TYPE: 'bullet'
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
                TYPE: 'bullet'
            }
        }
    ]
};
Class.foreman = {
    PARENT: 'genericTank',
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
            TYPE: 'drone',
            AUTOFIRE: true,
            SYNCS_SKILLS: true,
            STAT_CALCULATOR: 'drone',
            WAIT_TO_CYCLE: true
        }
    })
};
Class.fork = {
    PARENT: 'genericTank',
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
                TYPE: 'splitterBullet'
            }
        }
    ]
};
Class.fortress = {
    PARENT: 'genericTank',
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
                TYPE: 'swarm',
                STAT_CALCULATOR: 'swarm'
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
                    TYPE: 'trap',
                    STAT_CALCULATOR: 'trap'
                }
            }
        ], 3)
    ],
};
Class.gunnerTrapper = {
    PARENT: 'genericTank',
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
                TYPE: 'trap',
                STAT_CALCULATOR: 'trap'
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
                TYPE: 'bullet',
            },
        }, {delayIncrement: 0.5}),
        {
            POSITION: {
                LENGTH: 12,
                WIDTH: 11
            }
        }
    ]
};
Class.halfNHalf = {
    PARENT: 'genericTank',
    LABEL: "Half 'n Half",
    DANGER: 7,
    HAS_NO_RECOIL: true,
    BODY: Class.gatlingGun.BODY,
    GUNS: [
        {
            POSITION: {
                LENGTH: 24,
                WIDTH: 10,
                ASPECT: 1.4
            },
            PROPERTIES: {
                SHOOT_SETTINGS: combineStats([g.basic, g.machineGun, g.gatlingGun, g.doubleTwin]),
                TYPE: 'bullet'
            }
        },
        {
            POSITION: {
                LENGTH: 12,
                WIDTH: 10,
                ASPECT: 1.4,
                X: 8,
                ANGLE: 180
            },
            PROPERTIES: {
                SHOOT_SETTINGS: combineStats([g.basic, g.machineGun, g.doubleTwin]),
                TYPE: 'bullet'
            }
        }
    ]
};
Class.hewnDouble = {
    PARENT: 'genericTank',
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
                TYPE: 'bullet'
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
                TYPE: 'bullet'
            }
        }, {delayIncrement: 0.5}), 2)
    ]
};
Class.hexaTrapper = makeAuto(makeFlank('trapper', 6, "", { extraStats: [g.hexaTrapper], delayIncrement: 0.5, danger: 6 }), "Hexa-Trapper");
Class.hexaWhirl = makeWhirlwind('hexaTank', { label: "Hexa Whirl" });
Class.honchodrive = {
    PARENT: 'genericTank',
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
                TYPE: 'autoDrone',
                AUTOFIRE: true,
                SYNCS_SKILLS: true,
                STAT_CALCULATOR: 'drone',
                MAX_CHILDREN: 3,
                WAIT_TO_CYCLE: true
            }
        }
    ]
};
Class.infestor = {
    PARENT: 'genericTank',
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
            TYPE: 'eggchip',
            AUTOFIRE: true,
            SYNCS_SKILLS: true,
            STAT_CALCULATOR: 'necro',
            WAIT_TO_CYCLE: true,
            DELAY_SPAWN: false,
            MAX_CHILDREN: 10
        }
    }), 2)
};
Class.integrator = makeOver('triAngle', "Integrator", { ...preset.hybrid, renderBehind: true });
Class.itHurtsDontTouchIt = {
    PARENT: 'genericFlail',
    LABEL: "It hurts dont touch it",
    DANGER: 7,
    TURRETS: [{
        POSITION: [6, 10, 0, 0, 190, 0],
        TYPE: ["ihdtiBolt3", {
            INDEPENDENT: true
        }]
    }]
};
Class.iterator = {
    PARENT: 'genericTank',
    LABEL: "Iterator",
    DANGER: 7,
    STAT_NAMES: statnames.desmos,
    UPGRADE_TOOLTIP: "[DEV NOTE] This tank does not function as intended yet!",
    GUNS: [
        {
            POSITION: [22, 8, -4/3, 0, 0, 0, 0],
            PROPERTIES: {
                SHOOT_SETTINGS: combineStats([g.basic, g.desmos]),
                TYPE: ['superSplitterBullet', {CONTROLLERS: ['snake']}] // nerf supersplitter when
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
    PARENT: 'genericTank',
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
                TYPE: 'bullet'
            }
        }
    ]
};
Class.jumpSmasher = {
    PARENT: 'genericSmasher',
    LABEL: "Jump Smasher",
    DANGER: 7,
    BODY: {
        DENSITY: 1 * base.DENSITY,
        HEALTH: 1 * base.HEALTH * 1.4,
        SHIELD: 1 * base.SHIELD * 1.4
    },
    TURRETS: [
        {
            POSITION: [21.5, 0, 0, 0, 360, 0],
            TYPE: ['hexagonHat_spin', {COLOR: 'black'}]
        }
    ],
    GUNS: [
        {
            POSITION: {
                LENGTH: 2,
                WIDTH: 2,
                ANGLE: 180
            },
            PROPERTIES: {
                SHOOT_SETTINGS: combineStats([g.basic, { reload: 11, recoil: 9.75 }/*, { reload: 12.5, recoil: 8.2875 }*/]),
                TYPE: ['bullet', { ALPHA: 0 }]
            }
        }
    ]
};
Class.landmine = {
    PARENT: 'genericSmasher',
    LABEL: "Landmine",
    INVISIBLE: [0.06, 0.01],
    TOOLTIP: "Stay still to turn invisible.",
    TURRETS: [
        {
            TYPE: ['hexagonHat_spin', {COLOR: 'black'}],
            POSITION: {
                SIZE: 21.5
            }
        },
        {
            TYPE: ['hexagonHat_spinFaster', {COLOR: 'black'}],
            POSITION: {
                SIZE: 21.5,
                ANGLE: 90
            }
        }
    ]
};
Class.literallyAMachineGun = {
    PARENT: 'genericTank',
    LABEL: "Literally a Machine Gun",
    UPGRADE_LABEL: "L.a.M.G.",
    DANGER: 7,
    BODY: {
        FOV: base.FOV * 1.2
    },
    TURRETS: [
        {
            TYPE: 'lamgSpinnerTurret',
            POSITION: {
                SIZE: 10,
                X: 14,
                LAYER: 1
            }
        }
    ],
    GUNS: [
        {
            POSITION: {
                LENGTH: 10,
                WIDTH: 2,
                DELAY: 2
            },
            PROPERTIES: {
                SHOOT_SETTINGS: combineStats([{spray: 0, recoil: 0, shudder: 0, reload: 2, speed: 5, maxSpeed: 5}]),
                TYPE: 'bullet',
                FIXED_RELOAD: true
            }
        },
        {
            POSITION: {
                LENGTH: 22,
                WIDTH: 8
            }
        }
    ]
};
Class.machineGunner = {
    PARENT: 'genericTank',
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
                TYPE: 'bullet'
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
                TYPE: 'bullet'
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
                TYPE: 'bullet'
            }
        }
    ]
};
Class.machineTriple = makeFlank('machineGun', 3, "Machine Triple", { extraStats: [g.doubleTwin, g.tripleTwin], danger: 7 });
Class.maelstrom = makeAuto('whirlwind_old', "Maelstrom");
Class.manager = {
    PARENT: 'genericTank',
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
                TYPE: 'drone',
                AUTOFIRE: true,
                SYNCS_SKILLS: true,
                STAT_CALCULATOR: 'drone',
                WAIT_TO_CYCLE: true,
                MAX_CHILDREN: 8
            }
        }
    ]
};
Class.maleficitor = {
    PARENT: 'genericTank',
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
                TYPE: ['sunchip', {INVISIBLE: [0.06, 0.03]}],
                AUTOFIRE: true,
                SYNCS_SKILLS: true,
                STAT_CALCULATOR: 'necro',
                WAIT_TO_CYCLE: true,
                DELAY_SPAWN: false,
            },
        },
    ],
};
Class.master = {
    PARENT: 'genericTank',
    LABEL: "Master",
    DANGER: 7,
    BODY: {
        HEALTH: base.HEALTH * 0.4,
        SHIELD: base.SHIELD * 0.4,
        DENSITY: base.DENSITY * 0.3,
    },
    GUNS: [
        {
            POSITION: {
                LENGTH: 18,
                WIDTH: 16
            },
            PROPERTIES: {
                SHOOT_SETTINGS: combineStats([g.basic]),
                TYPE: 'masterBullet',
                MAX_CHILDREN: 4,
                DESTROY_OLDEST_CHILD: true
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
                    TYPE: 'bullet',
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
                    TYPE: 'bullet',
                    LABEL: "Thruster"
                }
            }
        ])
    ]
};
Class.medic = {
    PARENT: 'genericHealer',
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
                TYPE: 'healerBullet'
            }
        }
    ]
};
Class.mega3 = makeRadialAuto('megaAutoTankGun', { isTurret: true, danger: 7, size: 14, label: "Mega-3", body: { SPEED: 0.95 * base.SPEED } });
Class.megaSmasher = {
    PARENT: 'genericSmasher',
    LABEL: "Mega-Smasher",
    BODY: {
        FOV: 1.1 * base.FOV,
        SPEED: 1.2 * base.SPEED,
        DENSITY: 4 * base.DENSITY
    },
    TURRETS: [
        {
            TYPE: ['hexagonHat_spin', {COLOR: 'black'}],
            POSITION: { SIZE: 25 }
        }
    ]
};
Class.megaSpawner = {
    PARENT: 'genericTank',
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
Class.megaTornado = makeWhirlwind('genericTank', { hat: "diamondHat_spin", hatSize: 16, satellites: 2, satelliteSize: 16, extraStats: [g.pounder, g.destroyer], label: "Mega-Tornado", danger: 7 });
Class.megaTrapper = {
    PARENT: 'genericTank',
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
Class.mender = {
    PARENT: 'genericTank',
    LABEL: "Mender",
    DANGER: 7,
    TOOLTIP: "Right click to heal yourself (use sparingly, has a long cooldown once used!)",
    GUNS: [
        ...weaponMirror({
            POSITION: {
                LENGTH: 14,
                WIDTH: 6,
                Y: -4,
                ANGLE: -7,
                DELAY: 0.25
            },
            PROPERTIES: {
                SHOOT_SETTINGS: combineStats([g.basic, g.gunner, g.artillery]),
                TYPE: 'bullet',
                LABEL: "Secondary"
            }
        }, {delayIncrement: 0.5}),
        {
            POSITION: {
                LENGTH: 19,
                WIDTH: 9.5
            },
            PROPERTIES: {
                SHOOT_SETTINGS: combineStats([g.basic, g.pounder, g.artillery]),
                TYPE: 'bullet',
                LABEL: "Heavy"
            }
        },
        {
            POSITION: {
                LENGTH: 15,
                WIDTH: 10,
                ANGLE: 180
            }
        },
        {
            POSITION: {
                LENGTH: 5,
                WIDTH: 20,
                X: 15,
                ANGLE: 180 // todo: work out delay/cooldown + make healer bullet work
            },
            PROPERTIES: {
                SHOOT_SETTINGS: combineStats([
                g.basic,
                    g.pounder,
                    g.destroyer,
                    //[2, 0, 1, 1, 1, -1, 1, 1, 1, 0.1, 1, 1, 1],
                    { speed: -4, maxSpeed: -4 },
                    g.healer
                ]),
                TYPE: 'healerBullet',
                ALT_FIRE: true
            }
        }
    ],
    TURRETS: [
        {
            TYPE: ["triangleHat", {COLOR: 'grey'}],
            POSITION: { SIZE: 7, LAYER: 1 }
        }
    ]
};
Class.mingler = {
    PARENT: 'genericTank',
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
                TYPE: 'bullet'
            }
        },
        {
            POSITION: {
                LENGTH: 18,
                WIDTH: 8
            },
            PROPERTIES: {
                SHOOT_SETTINGS: combineStats([g.basic, g.flankGuard, g.flankGuard]),
                TYPE: 'bullet'
            }
        }
    ], 6, {delayIncrement: 0.5})
};
Class.monsoon = makeWhirlwind({
    PARENT: 'genericTank',
    TURRETS: [
        {
            TYPE: ['hexagonHat_spin', {COLOR: 'black'}],
            POSITION: {SIZE: 26}
        }
    ]
}, {hat: 'circleHat', hatSize: 24, hatLayer: 0, satellites: 6, satelliteType: "satellite_old", label: "Monsoon", danger: 7});
Class.mortar = {
    PARENT: 'genericTank',
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
                TYPE: 'bullet',
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
                TYPE: 'bullet',
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
                TYPE: 'bullet',
                LABEL: "Heavy"
            }
        }
    ]
};
Class.munition = makeWhirlwind('artillery', { label: "Munition" });
Class.musket = {
    PARENT: 'genericTank',
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
                TYPE: 'bullet'
            }
        }
    ], {delayIncrement: 0.5})
};
Class.nailgun = {
    PARENT: 'genericTank',
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
                TYPE: 'bullet'
            }
        }, {delayIncrement: 0.5}),
        {
            POSITION: {
                LENGTH: 20,
                WIDTH: 2
            },
            PROPERTIES: {
                SHOOT_SETTINGS: combineStats([g.basic, g.pelleter, g.power, g.twin, g.nailgun]),
                TYPE: 'bullet'
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
    PARENT: 'genericTank',
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
            TYPE: 'sunchip',
            AUTOFIRE: true,
            SYNCS_SKILLS: true,
            STAT_CALCULATOR: 'necro',
            WAIT_TO_CYCLE: true,
            DELAY_SPAWN: false
        }
    }, 4, {delayIncrement: 0.75})
};
Class.nimrod = {
    PARENT: 'genericTank',
    LABEL: "Nimrod",
    DANGER: 7,
    BODY: {
        FOV: base.FOV * 1.35
    },
    CONTROLLERS: ['zoom'],
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
                TYPE: 'bullet'
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
                TYPE: 'bullet'
            }
        }
    ]
};
Class.octoTank = {
    PARENT: 'genericTank',
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
                TYPE: 'bullet'
            }
        },
        {
            POSITION: {
                LENGTH: 18,
                WIDTH: 8
            },
            PROPERTIES: {
                SHOOT_SETTINGS: combineStats([g.basic, g.flankGuard, g.flankGuard, g.spam]),
                TYPE: 'bullet'
            }
        }
    ], 4)
};
Class.ordnance = {
    PARENT: 'genericTank',
    LABEL: "Ordnance",
    DANGER: 7,
    BODY: {
        FOV: base.FOV * 1.3
    },
    CONTROLLERS: ['zoom'],
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
                TYPE: 'bullet',
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
                TYPE: 'bullet'
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
                TYPE: 'bullet'
            }
        }
    ]
};
Class.oroboros = {
    PARENT: 'genericTank',
    LABEL: "Oroboros",
    DANGER: 7,
    STAT_NAMES: statnames.desmos,
    BODY: Class.builder.BODY,
    GUNS: [
        {
            POSITION: {
                LENGTH: 16.5,
                WIDTH: 12
            },
        },
        {
            POSITION: {
                LENGTH: 3.5,
                WIDTH: 12,
                ASPECT: 1.1,
                X: 16.5
            },
            PROPERTIES: {
                SHOOT_SETTINGS: combineStats([g.trap, g.setTrap]),
                TYPE: ['oroborosTrap', {CONTROLLERS: [['oroboros', {range: 75, speed: Math.PI / 32}], 'snakeTillNot']}],
                STAT_CALCULATOR: 'block',
                DESTROY_OLDEST_CHILD: true,
                MAX_CHILDREN: 4
            }
        },
        ...weaponMirror({
            POSITION: {
                LENGTH: 4.5,
                WIDTH: 6,
                ASPECT: -4,
                X: -7.5,
                Y: -7,
                ANGLE: 90
            }
        })
    ]
};
Class.overdrive = {
    PARENT: 'genericTank',
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
            TYPE: 'autoDrone',
            AUTOFIRE: true,
            SYNCS_SKILLS: true,
            STAT_CALCULATOR: 'drone',
            WAIT_TO_CYCLE: true,
            MAX_CHILDREN: 4
        }
    })
};
Class.overgunner = makeOver({
    PARENT: 'genericTank',
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
                TYPE: 'bullet'
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
    PARENT: 'genericTank',
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
            TYPE: 'drone',
            AUTOFIRE: true,
            SYNCS_SKILLS: true,
            STAT_CALCULATOR: 'drone',
            WAIT_TO_CYCLE: true
        }
    }, 4)
};
Class.overtrapper = makeOver({
    PARENT: 'genericTank',
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
                TYPE: 'trap',
                STAT_CALCULATOR: 'trap'
            }
        }
    ]
});
Class.paramedic = {
    PARENT: 'genericHealer',
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
                TYPE: 'healerBullet',
            },
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
                TYPE: 'healerBullet'
            }
        }
    ]
};
Class.peashooter = makeGuard({
    PARENT: 'genericTank',
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
Class.pentaShot = {
    PARENT: 'genericTank',
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
                TYPE: 'bullet'
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
                TYPE: 'bullet'
            }
        }]),
        {
            POSITION: {
                LENGTH: 22,
                WIDTH: 8
            },
            PROPERTIES: {
                SHOOT_SETTINGS: combineStats([g.basic, g.twin, g.tripleShot]),
                TYPE: 'bullet'
            }
        }
    ]
};
Class.phoenix = makeBird('sprayer', "Phoenix");
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
Class.predator = {
    PARENT: 'genericTank',
    LABEL: "Predator",
    DANGER: 7,
    BODY: {
        FOV: base.FOV * 1.325,
        SPEED: base.SPEED * 14/15
    },
    CONTROLLERS: [['zoom', {distance: 365}]],
    GUNS: [
        {
            POSITION: {
                LENGTH: 24,
                WIDTH: 8
            },
            PROPERTIES: {
                SHOOT_SETTINGS: combineStats([g.basic, g.sniper, g.hunter, g.hunterSecondary, g.hunterSecondary, g.predator]),
                TYPE: 'bullet'
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
                TYPE: 'bullet'
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
                TYPE: 'bullet'
            }
        }
    ]
};
Class.prodigy = {
    PARENT: 'genericTank',
    LABEL: "Prodigy",
    DANGER: 7,
    STAT_NAMES: {
        ...statnames.mixed,
        RELOAD: "Reload / Max Drone Count"
    },
    SHAPE: 6,
    GUNS: [
        ...weaponArray({
            POSITION: {
                LENGTH: 13,
                WIDTH: 7,
                ASPECT: 1.6,
                ANGLE: 180
            },
            PROPERTIES: {
                SHOOT_SETTINGS: combineStats([g.drone, g.sunchip, {reload: 0.5, size: 2, damage: 0.95}]),
                TYPE: 'sunchip',
                AUTOFIRE: true,
                SYNCS_SKILLS: true,
                STAT_CALCULATOR: 'necro',
                WAIT_TO_CYCLE: true,
                DELAY_SPAWN: false,
                MAX_CHILDREN: 2
            },
        }, 3, {delayIncrement: 1/3}),
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
                TYPE: 'trap',
                STAT_CALCULATOR: 'trap'
            }
        }], 3)
    ],
};
Class.productionist = {
    PARENT: 'genericTank',
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
Class.prophet = makeWhirlwind('underseer', { label: "Prophet", satelliteType: 'squareSatellite' });
Class.python = {
    PARENT: 'genericTank',
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
                SHOOT_SETTINGS: combineStats([g.basic, g.desmos]),
                TYPE: ['pythonBullet', {CONTROLLERS: ['snake']}]
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
Class.quadBuilder = {
    PARENT: 'genericTank',
    LABEL: "Quad Builder",
    DANGER: 7,
    STAT_NAMES: statnames.trap,
    BODY: {
        SPEED: 0.8 * base.SPEED,
        FOV: 1.15 * base.FOV
    },
    GUNS: weaponArray([
        {
            POSITION: {
                LENGTH: 14,
                WIDTH: 6,
                ANGLE: 45
            }
        },
        {
            POSITION: {
                LENGTH: 2,
                WIDTH: 6,
                ASPECT: 1.1,
                X: 14,
                ANGLE: 45
            },
            PROPERTIES: {
                SHOOT_SETTINGS: combineStats([g.trap, g.setTrap, g.weak]),
                TYPE: 'setTrap'
            }
        }
    ], 4)
};
Class.quadruplex = {
    PARENT: 'genericTank',
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
                TYPE: ['bullet', {CONTROLLERS: [['snake', {invert: true, amplitude: 180, yOffset: 50}]]}]
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
                TYPE: ['bullet', {CONTROLLERS: [['snake', {invert: true, amplitude: 180, yOffset: -50}]]}]
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
                TYPE: ['bullet', {CONTROLLERS: [['snake', {invert: false, amplitude: 180, yOffset: -50}]]}]
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
                TYPE: ['bullet', {CONTROLLERS: [['snake', {invert: false, amplitude: 180, yOffset: 50}]]}]
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
Class.railgun = {
    PARENT: 'genericTank',
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
                TYPE: "bullet",
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
Class.ranger = {
    PARENT: 'genericTank',
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
                TYPE: 'bullet'
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
    PARENT: 'genericTank',
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
                TYPE: 'bullet'
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
                TYPE: 'bullet'
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
                TYPE: 'bullet'
            }
        }
    ]
};
Class.revolver = {
    PARENT: 'genericTank',
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
                TYPE: 'bullet'
            }
        }
    ]
};
Class.rimfire = {
    PARENT: 'genericTank',
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
                TYPE: 'bullet'
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
                TYPE: 'bullet'
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
Class.rimfire_old = {
    PARENT: 'genericTank',
    LABEL: "Rimfire",
    UPGRADE_LABEL: "Old Rimfire",
    DANGER: 7,
    GUNS: weaponMirror([
        {
            POSITION: {
                LENGTH: 12,
                WIDTH: 5,
                Y: 7.25,
                ANGLE: 10,
                DELAY: 0.5
            },
            PROPERTIES: {
                SHOOT_SETTINGS: combineStats([g.basic, g.twin, g.gunner, {speed: 1.2}]),
                TYPE: 'bullet'
            }
        },
        {
            POSITION: {
                LENGTH: 16,
                WIDTH: 5,
                Y: 3.75
            },
            PROPERTIES: {
                SHOOT_SETTINGS: combineStats([g.basic, g.twin, g.gunner, {speed: 1.2}]),
                TYPE: 'bullet'
            }
        }
    ], {delayIncrement: 0.25})
};
Class.riptide = {
    PARENT: 'genericTank',
    LABEL: "Riptide",
    DANGER: 7,
    GUNS: [
        {
            POSITION: [6.5, 23.5, 0.25, 3, 0, 180, 0],
        },
        {
            POSITION: [18, 16, 0.75, 0, 0, 0, 0],
            PROPERTIES: {
                SHOOT_SETTINGS: combineStats([g.basic, { size: 0.9, reload: 1.2 }]),
                TYPE: 'undertowBullet'
            }
        },
        ...weaponMirror({
            POSITION: [17, 16, 0.1, 0.25, 4, 13.5, 0]
        })
    ]
};
Class.rocket = makeSnake({
    PARENT: 'genericTank',
    DANGER: 6,
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
                TYPE: 'bullet',
                LABEL: "Front"
            }
        },
        ...weaponMirror({
            POSITION: {
                LENGTH: 14,
                WIDTH: 8,
                ANGLE: 135,
                DELAY: 0.1
            },
            PROPERTIES: {
                SHOOT_SETTINGS: combineStats([g.basic, g.flankGuard, g.triAngle, g.thruster]),
                TYPE: 'bullet',
                LABEL: "Thruster"
            }
        })
    ]
}, 2, "Rocket", {segmentGuns: weaponMirror({
    POSITION: {
        LENGTH: 14,
        WIDTH: 8,
        ANGLE: 135,
        DELAY: 0.1
    },
    PROPERTIES: {
        SHOOT_SETTINGS: combineStats([g.basic, g.flankGuard, g.triAngle, g.thruster]),
        TYPE: 'bullet',
        LABEL: "Thruster"
    }
})});
Class.rocketeer = {
    PARENT: 'genericTank',
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
                TYPE: 'rocketeerMissile',
                STAT_CALCULATOR: 'sustained',
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
Class.septaTrapper = {
    PARENT: 'genericTank',
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
                TYPE: 'trap',
                STAT_CALCULATOR: 'trap'
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
                    TYPE: 'trap',
                    STAT_CALCULATOR: 'trap'
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
                    TYPE: 'trap',
                    STAT_CALCULATOR: 'trap'
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
                    TYPE: 'trap',
                    STAT_CALCULATOR: 'trap'
                }
            }
        ], {delayOverflow: true})
    ]
};
Class.septaTrapper_old = makeFlank('trapper', 7, "Septa Trapper", { extraStats: [g.hexaTrapper], delayIncrement: 4/7, danger: 7, noRecoil: true });
Class.septaTrapper_old.UPGRADE_LABEL = "Old Septa Trapper";
Class.shotgun = {
    PARENT: 'genericTank',
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
                TYPE: 'bullet'
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
                TYPE: 'casing'
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
                TYPE: 'bullet'
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
                TYPE: 'casing'
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
                TYPE: 'casing'
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
                TYPE: 'casing'
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
    PARENT: 'genericTank',
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
                TYPE: 'snake',
                STAT_CALCULATOR: 'sustained'
            }
        }
    ]
};
Class.single = {
    PARENT: 'genericTank',
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
                TYPE: 'bullet'
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
    PARENT: 'genericTank',
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
                TYPE: 'missile',
                STAT_CALCULATOR: 'sustained',
            },
        },
    ],
};
Class.sniper3 = makeRadialAuto('sniper3gun', { isTurret: true, danger: 7, size: 13, label: "Sniper-3", body: { SPEED: 11/15 * base.SPEED, FOV: 1.25 * base.FOV } });
Class.sniperRifle = {
    PARENT: 'genericTank',
    LABEL: "Sniper Rifle",
    DANGER: 7,
    BODY: Class.assassin.BODY,
    GUNS: [
        {
            POSITION: {
                LENGTH: 28,
                WIDTH: 7
            },
            PROPERTIES: {
                SHOOT_SETTINGS: combineStats([g.basic, g.sniper, g.assassin, g.rifle]),
                TYPE: 'bullet'
            }
        },
        {
            POSITION: {
                LENGTH: 14,
                WIDTH: 9.5
            }
        }
    ]
};
Class.spawnerdrive = {
    PARENT: 'genericTank',
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
                TYPE: 'autoMinion',
                AUTOFIRE: true,
                SYNCS_SKILLS: true,
                STAT_CALCULATOR: 'drone',
                WAIT_TO_CYCLE: true,
                MAX_CHILDREN: 4
            },
        },
        {
            POSITION: {
                LENGTH: 11.5,
                WIDTH: 12
            }
        }
    ]
};
Class.spike = {
    PARENT: 'genericSmasher',
    LABEL: "Spike",
    DANGER: 7,
    BODY: {
        DAMAGE: base.DAMAGE * 1.1,
        SPEED: base.SPEED
    },
    TURRETS: weaponArray([{
        TYPE: ['triangleHat_spin', {COLOR: 'black'}],
        POSITION: {SIZE: 18}
    }], 4)
};
Class.spike_old = {
    PARENT: 'genericTank',
    LABEL: "Spike",
    UPGRADE_LABEL: "Weird Spike",
    DANGER: 7,
    BODY: {
        DAMAGE: 1.15 * base.DAMAGE,
        FOV: 1.05 * base.FOV,
        DENSITY: 1.5 * base.DENSITY
    },
    IS_SMASHER: true,
    SKILL_CAP: [smshskl, 0, 0, 0, 0, smshskl, smshskl, smshskl, smshskl, smshskl],
    STAT_NAMES: statnames.smasher,
    TURRETS: [
        {
            TYPE: ['triangleHat_spinFast', {COLOR: 'black'}],
            POSITION: {
                SIZE: 20.5
            }
        },
        {
            TYPE: 'triangleHat_weirdSpike',
            POSITION: {
                SIZE: 20.5,
                ANGLE: 180
            }
        }
    ]
};
Class.splasher = {
    PARENT: 'genericTank',
    LABEL: "Splasher",
    DANGER: 7,
    GUNS: [
        {
            POSITION: {
                LENGTH: 21,
                WIDTH: 7,
            },
            PROPERTIES: {
                SHOOT_SETTINGS: combineStats([g.basic, g.machineGun, g.lowPower, g.pelleter, { recoil: 1.15 }]),
                TYPE: 'bullet'
            }
        },
        {
            POSITION: {
                LENGTH: 10,
                WIDTH: 10,
                ASPECT: 1.4,
                X: 8
            },
            PROPERTIES: {
                SHOOT_SETTINGS: combineStats([g.basic, g.machineGun, g.blaster]),
                TYPE: 'bullet'
            }
        }
    ]
};
Class.sprayer_RG = {
    PARENT: 'genericTank',
    LABEL: "Sprayer",
    DANGER: 7,
    BODY: Class.gatlingGun.BODY,
    GUNS: [
        {
            POSITION: {
                LENGTH: 22.5,
                WIDTH: 8.5,
                ASPECT: 1.4,
                DELAY: 0.5
            },
            PROPERTIES: {
                SHOOT_SETTINGS: combineStats([g.basic, g.machineGun, g.lowPower, g.pelleter, { recoil: 1.15 }]),
                TYPE: 'bullet'
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
                SHOOT_SETTINGS: combineStats([g.basic, g.machineGun, g.gatlingGun]),
                TYPE: 'bullet'
            }
        }
    ]
};
Class.spreadRifle = {
    PARENT: 'genericTank',
    LABEL: "Spread Rifle",
    DANGER: 7,
    BODY: Class.rifle_old.BODY,
    GUNS: [
        ...weaponMirror([{
            POSITION: {
                LENGTH: 16,
                WIDTH: 3,
                Y: 3.5,
                ANGLE: 2
            },
            PROPERTIES: {
                SHOOT_SETTINGS: combineStats([g.basic, g.sniper, g.rifle, g.crossbow, { recoil: 0.5 }]),
                TYPE: 'bullet'
            }
        },
        {
            POSITION: {
                LENGTH: 14,
                WIDTH: 3,
                Y: 3.75,
                ANGLE: 4,
                DELAY: 0.08
            },
            PROPERTIES: {
                SHOOT_SETTINGS: combineStats([g.basic, g.sniper, g.rifle, g.crossbow, { recoil: 0.5 }]),
                TYPE: 'bullet'
            }
        },
        {
            POSITION: {
                LENGTH: 12,
                WIDTH: 3,
                Y: 4,
                ANGLE: 6,
                DELAY: 0.16
            },
            PROPERTIES: {
                SHOOT_SETTINGS: combineStats([g.basic, g.sniper, g.rifle, g.crossbow, { recoil: 0.5 }]),
                TYPE: 'bullet'
            }
        }]),
        {
            POSITION: {
                LENGTH: 25,
                WIDTH: 7
            },
            PROPERTIES: {
                SHOOT_SETTINGS: combineStats([g.basic, g.sniper, g.rifle]),
                TYPE: 'bullet'
            }
        },
        {
            POSITION: {
                LENGTH: 14,
                WIDTH: 9.5
            }
        }
    ]
};
Class.spreadshot = {
    PARENT: 'genericTank',
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
                TYPE: 'bullet',
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
                TYPE: 'bullet',
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
                TYPE: 'bullet',
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
                TYPE: 'bullet',
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
                TYPE: 'bullet',
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
                TYPE: 'bullet'
            }
        }
    ]
};
Class.spreadshot_old = {
    PARENT: 'genericTank',
    LABEL: "Spreadshot",
    UPGRADE_LABEL: "Old Spreadshot",
    DANGER: 7,
    GUNS: [
        ...weaponMirror([{
            POSITION: {
                LENGTH: 13,
                WIDTH: 4,
                Y: 0.8,
                ANGLE: 75,
                DELAY: 5/6
            },
            PROPERTIES: {
                SHOOT_SETTINGS: combineStats([g.basic, g.gunner, g.artillery, g.twin, g.spreadshot]),
                TYPE: 'bullet',
                LABEL: "Spread"
            }
        },
        {
            POSITION: {
                LENGTH: 14.5,
                WIDTH: 4,
                Y: 1,
                ANGLE: 60,
                DELAY: 4/6
            },
            PROPERTIES: {
                SHOOT_SETTINGS: combineStats([g.basic, g.gunner, g.artillery, g.twin, g.spreadshot]),
                TYPE: 'bullet',
                LABEL: "Spread"
            }
        },
        {
            POSITION: {
                LENGTH: 16,
                WIDTH: 4,
                Y: 1.6,
                ANGLE: 45,
                DELAY: 3/6
            },
            PROPERTIES: {
                SHOOT_SETTINGS: combineStats([g.basic, g.gunner, g.artillery, g.twin, g.spreadshot]),
                TYPE: 'bullet',
                LABEL: "Spread"
            }
        },
        {
            POSITION: {
                LENGTH: 17.5,
                WIDTH: 4,
                Y: 2.4,
                ANGLE: 30,
                DELAY: 2/6
            },
            PROPERTIES: {
                SHOOT_SETTINGS: combineStats([g.basic, g.gunner, g.artillery, g.twin, g.spreadshot]),
                TYPE: 'bullet',
                LABEL: "Spread"
            }
        },
        {
            POSITION: {
                LENGTH: 19,
                WIDTH: 4,
                Y: 3,
                ANGLE: 15,
                DELAY: 1/6
            },
            PROPERTIES: {
                SHOOT_SETTINGS: combineStats([g.basic, g.gunner, g.artillery, g.twin, g.spreadshot]),
                TYPE: 'bullet',
                LABEL: "Spread"
            }
        }]),
        {
            POSITION: {
                LENGTH: 13,
                WIDTH: 10,
                ASPECT: 1.3,
                X: 8
            },
            PROPERTIES: {
                SHOOT_SETTINGS: combineStats([g.basic, g.pounder, g.spreadshot, g.spreadshot]),
                TYPE: 'bullet',
                LABEL: "Pounder"
            }
        }
    ]
};
Class.stalker = {
    PARENT: 'genericTank',
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
                TYPE: 'bullet'
            }
        }
    ]
};
Class.streamliner = {
    PARENT: 'genericTank',
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
            TYPE: 'bullet'
        }
    }, 5, {lengthOffset: 2, delayIncrement: 0.2})
};
Class.subverter = {
    PARENT: 'genericTank',
    LABEL: "Subverter",
    DANGER: 7,
    BODY: Class.minigun.BODY,
    GUNS: weaponStack({
        POSITION: {
            LENGTH: 21,
            WIDTH: 14
        },
        PROPERTIES: {
            SHOOT_SETTINGS: combineStats([g.basic, g.pounder, g.minigun]),
            TYPE: 'bullet'
        }
    }, 3, {lengthOffset: 2, delayIncrement: 1/3})
};
Class.surfer = {
    PARENT: 'genericTank',
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
                TYPE: 'bullet',
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
                TYPE: 'autoswarm',
                STAT_CALCULATOR: 'swarm'
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
                TYPE: 'bullet',
                LABEL: "Thruster"
            }
        })
    ]
};
Class.surgeon = {
    PARENT: 'genericHealer',
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
                TYPE: 'medkit',
                NO_LIMITATIONS: true,
                SYNCS_SKILLS: true,
                STAT_CALCULATOR: 'block'
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
    PARENT: 'genericTank',
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
                TYPE: 'hive'
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
Class.tempest = makeWhirlwind('genericTank', { dualLayer: true, hat: "triangleHat_spin", hat2: "triangleHat_spinReverse", hat2Size: 4, satellites: 3, satelliteSize: 12, extraStats: [g.pounder], label: "Tempest", danger: 7 });
Class.thunderbolt = makeWhirlwind('genericTank', { hat: "squareHat_spinFast", hatSize: 10, satellites: 4, satelliteSize: 12, satelliteSpeed: 2.5, extraStats: [g.pounder], label: "Thunderbolt", danger: 7 });
Class.tornado_old = makeWhirlwind('genericTank', { hat: 'circleHat', hatSize: 30, hatLayer: 0, satellites: 1, satelliteSize: 16, satelliteType: "satellite_old", extraStats: [g.pounder, g.destroyer], label: "Tornado", danger: 7 });
Class.triBlaster = {
    PARENT: 'genericTank',
    LABEL: "Tri-Blaster",
    DANGER: 7,
    GUNS: [
        ...weaponMirror({
            POSITION: {
                LENGTH: 5,
                WIDTH: 12,
                ASPECT: 1.2,
                X: 8,
                ANGLE: 25,
                DELAY: 0.5
            },
            PROPERTIES: {
                SHOOT_SETTINGS: combineStats([g.basic, g.machineGun, g.blaster, { recoil: 0.5 }, g.lowPower]),
                TYPE: 'bullet'
            }
        }),
        {
            POSITION: {
                LENGTH: 7.5,
                WIDTH: 12,
                ASPECT: 1.2,
                X: 8
            },
            PROPERTIES: {
                SHOOT_SETTINGS: combineStats([g.basic, g.machineGun, g.blaster, { recoil: 0.5 }]),
                TYPE: 'bullet'
            }
        }
    ]
};
Class.tripleFlail = {
    PARENT: 'genericFlail',
    LABEL: "Triple Flail",
    DANGER: 7,
    TURRETS: weaponArray(Class.flail.TURRETS, 3)
};
Class.tripleTwin = makeFlank('twin', 3, "Triple Twin", { extraStats: [g.spam, g.doubleTwin, g.tripleTwin], danger: 7 });
Class.triplet = {
    PARENT: 'genericTank',
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
                TYPE: 'bullet'
            }
        }),
        {
            POSITION: {
                LENGTH: 21,
                WIDTH: 8
            },
            PROPERTIES: {
                SHOOT_SETTINGS: combineStats([g.basic, g.twin, g.triplet]),
                TYPE: 'bullet'
            }
        }
    ]
};
Class.triplex = {
    PARENT: 'genericTank',
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
                TYPE: 'bullet',
            },
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
                TYPE: ['bullet', {CONTROLLERS: ['snake']}]
            },
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
                TYPE: ['bullet', {CONTROLLERS: [['snake', {invert: true}]]}]
            },
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
        }], {delayIncrement: 0.5}),
    ]
};
Class.twister = {
    PARENT: 'genericTank',
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
                TYPE: 'spinmissile',
                STAT_CALCULATOR: 'sustained+lowspeed'
            }
        }
    ]
};
Class.typhoon = makeWhirlwind('genericTank', { hat: "decagonHat_spin", satellites: 10, label: "Typhoon", danger: 7 });
Class.typhoon_old = makeWhirlwind('genericTank', { dualLayer: true, hat: 'circleHat', hatSize: 28, hatLayer: 0, hat2: 'circleHat', hat2Size: 24, hat2Layer: 0, satellites: 6, satelliteType: "satellite_old", label: "Typhoon" });
Class.underdrive = {
    PARENT: 'genericTank',
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
            TYPE: 'autoSunchip',
            AUTOFIRE: true,
            SYNCS_SKILLS: true,
            STAT_CALCULATOR: 'necro',
            WAIT_TO_CYCLE: true,
            DELAY_SPAWN: false
        }
    }, 2)
};
Class.vortex = makeWhirlwind('launcher', { label: "Vortex" });
Class.vortex_old = makeWhirlwind('genericTank', { enableHat2: true, hat: "pentagonHat_spin", hatSize: 21.5, hatLayer: 0, hat2: "pentagonHat_spin", hat2Size: 21.5, hat2Layer: 0, satellites: 10, satelliteType: "satellite_old", label: "Vortex" });
Class.vulture = makeBird({
    PARENT: 'genericTank',
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
                TYPE: 'bullet'
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
                TYPE: 'bullet'
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
                TYPE: 'bullet'
            }
        }
    ]
}, "Vulture");
Class.warkwark = makeFlank('wark', 2, "Warkwark", { extraStats: [g.doubleTwin] });
Class.whirlGuard = makeWhirlwind('trapGuard', { label: "Whirl Guard" });
Class.whirl3 = makeWhirlwind("auto3", { label: "Whirl-3" });
Class.wrangler = {
    PARENT: 'genericTank',
    LABEL: "Wrangler", //"Ranch",
    DANGER: 7,
    STAT_NAMES: statnames.drone,
    BODY: Class.spawner.BODY,
    UPGRADE_TOOLTIP: "[DEV NOTE] This tank does not function as intended yet!",
    GUNS: [
        {
            POSITION: [4.5, 10, 1, 10.5, 0, 0, 0]
        },
        {
            POSITION: [1, 12, 1, 15, 0, 0, 0],
            PROPERTIES: {
                MAX_CHILDREN: 3,
                SHOOT_SETTINGS: combineStats([g.minion, g.spawner]),
                TYPE: 'wranglerMinion',
                STAT_CALCULATOR: 'drone',
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
Class.xHunter = {
    PARENT: 'genericTank',
    LABEL: "X-Hunter",
    DANGER: 7,
    BODY: Class.hunter.BODY,
    CONTROLLERS: [['zoom', {distance: 550}]],
    GUNS: [
        {
            POSITION: {
                LENGTH: 24,
                WIDTH: 8
            },
            PROPERTIES: {
                SHOOT_SETTINGS: combineStats([g.basic, g.sniper, g.hunter, g.hunterSecondary]),
                TYPE: 'bullet'
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
                TYPE: 'bullet'
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

// Tier 4 (Level 60)
const autoTanksT4 = [
    'auto4',
    'auto5',
    'banshee',
    'bentDouble',
    'bentHybrid',
    'buttbuttin',
    'combo',
    'crowbar',
    'cyclone',
    'deathStar',
    'doubleGunner',
    'dual',
    'hewnDouble',
    'jalopy',
    'mega3',
    'mingler',
    'musket',
    'octoTank',
    'sniper3',
    'sprayer',
    'warkwark'
];
for (let i = 0; i < autoTanksT4.length; i++) {
    let type = autoTanksT4[i];
    Class[`auto${type.charAt(0).toUpperCase() + type.slice(1)}`] = makeAuto(type);
};

const doubleTanksT4 = [
    'battery',
    'dual',
    'machineGunner',
    'musket',
    'nailgun',
    'rimfire',
    'triplet'
];
for (let i = 0; i < doubleTanksT4.length; i++) {
    let type = doubleTanksT4[i];
    Class[`double${type.charAt(0).toUpperCase() + type.slice(1)}`] = makeFlank(type, 2, `Double ${Class[type].LABEL}`, { extraStats: [g.doubleTwin] });
};

const hybridTanksT4 = [
    // Base Tank    //Director
    ['buttbuttin',  "Mercenary"],
    ['crowbar',     "Spindle"],
    ['dual',        "Ravisher"],
    ['jalopy',      "Contaminator"],
    ['musket',      "Matchlock"],
    ['pentaShot',   "Flexed Hybrid"],
    ['sprayer',     "Shower"],
    ['spreadshot',  "Smearer"],
    ['triplet',     "Triprid"],
];
for (let i = 0; i < hybridTanksT4.length; i++) {
    let type = hybridTanksT4[i][0];

    let director = hybridTanksT4[i][1];

    function typeify(x) {
        return x.charAt(0).toLowerCase() + x.slice(1).replace(/[\s-]+/g, '');
    };
    let typeDirector = typeify(director);

    Class[typeDirector] = makeOver(type, director, preset.hybrid);
};

Class.alloy = {
    PARENT: 'genericTank',
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
                TYPE: 'bullet'
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
                TYPE: 'bullet'
            }
        },
        {
            POSITION: {
                LENGTH: 18,
                WIDTH: 8
            },
            PROPERTIES: {
                SHOOT_SETTINGS: combineStats([g.basic, g.flankGuard, g.flankGuard]),
                TYPE: 'bullet'
            }
        }
    ], 3),
    TURRETS: weaponArray({
        TYPE: ['sniper3gun', { INDEPENDENT: true }],
        POSITION: {
            SIZE: 13,
            X: 8,
            ANGLE: 180,
            ARC: 190
        }
    }, 3)
};
Class.autoDoubleFlank = makeAuto('doubleFlankTwin', "Auto-Double Flank");
Class.autoHexaTrapper = makeAuto(makeFlank('trapper', 6, "", { extraStats: [g.hexaTrapper], delayIncrement: 0.5, danger: 7 }), "Auto-Hexa-Trapper", preset.makeAuto.triple);
Class.autoTriple = makeAuto('tripleTwin', "Auto-Triple");
Class.band = makeAuto({
    PARENT: 'genericTank',
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
                TYPE: 'trap',
                STAT_CALCULATOR: 'trap'
            }
        }
    ], 3),
    TURRETS: weaponArray({
        TYPE: ['autoTankGun', { INDEPENDENT: true }],
        POSITION: {
            SIZE: 11,
            X: 8,
            ANGLE: 180,
            ARC: 190
        }
    }, 3)
}, "Band");
Class.battletrapper = makeBattle({
    PARENT: 'genericTank',
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
                TYPE: 'trap',
                STAT_CALCULATOR: 'trap'
            }
        }
    ]
});
Class.bentTriple = makeFlank('tripleShot', 3, "Bent Triple", { extraStats: [g.spam, g.doubleTwin, g.tripleTwin], danger: 8 });
Class.captrapper = makeCap({
    PARENT: 'genericTank',
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
                TYPE: 'trap',
                STAT_CALCULATOR: 'trap'
            }
        }
    ]
});
Class.cleft = makeFlank({
    PARENT: 'genericTank',
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
                TYPE: 'bullet'
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
                TYPE: 'bullet'
            }
        }
    ], {delayIncrement: 0.5})
}, 2, "Cleft", { extraStats: [g.doubleTwin] });
Class.cleft_old = {
    PARENT: 'genericTank',
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
                    TYPE: 'bullet'
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
                    TYPE: 'bullet'
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
                TYPE: 'bullet'
            }
        }),
        {
            POSITION: {
                LENGTH: 22,
                WIDTH: 8
            },
            PROPERTIES: {
                SHOOT_SETTINGS: combineStats([g.basic, g.twin, g.tripleShot, g.doubleTwin, g.hewnDouble]),
                TYPE: 'bullet'
            }
        }
    ]
};
Class.consolidation = {
    PARENT: 'genericTank',
    LABEL: "Consolidation",
    DANGER: 8,
    GUNS: weaponArray({
        POSITION: {
            LENGTH: 18,
            WIDTH: 8
        },
        PROPERTIES: {
            SHOOT_SETTINGS: combineStats([g.basic, g.flankGuard, g.flankGuard, g.spam]),
            TYPE: 'bullet'
        }
    }, 4),
    TURRETS: weaponArray({
        TYPE: ['autoTankGun', { INDEPENDENT: true }],
        POSITION: {
            SIZE: 11,
            X: 8,
            ANGLE: 45,
            ARC: 190
        }
    }, 4)
};
Class.coop = makeAuto({
    PARENT: 'genericTank',
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
                TYPE: 'trap',
                STAT_CALCULATOR: 'trap'
            }
        },
        {
            POSITION: {
                LENGTH: 20,
                WIDTH: 8
            },
            PROPERTIES: {
                SHOOT_SETTINGS: combineStats([g.basic, g.flankGuard]),
                TYPE: 'bullet'
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
                TYPE: 'trap',
                STAT_CALCULATOR: 'trap'
            }
        }
    ], 3)
}, "Coop");
Class.cozen = makeAuto(makeFlank({
    PARENT: 'genericTank',
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
                TYPE: 'bullet'
            }
        },
        ...Class.trapper.GUNS
    ]
}, 6, "", { extraStats: [g.hexaTrapper], delayIncrement: 0.5, danger: 7 }), "Cozen");
Class.dam = {
    PARENT: 'genericTank',
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
                    TYPE: 'bullet'
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
                    TYPE: 'bullet'
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
                    TYPE: 'trap',
                    STAT_CALCULATOR: 'trap'
                }
            }
        ], {delayIncrement: 0.5})
    ]
};
Class.decaTank = {
    PARENT: 'genericTank',
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
                TYPE: 'bullet'
            }
        },
        {
            POSITION: {
                LENGTH: 18,
                WIDTH: 8
            },
            PROPERTIES: {
                SHOOT_SETTINGS: combineStats([g.basic, g.flankGuard, g.flankGuard, g.spam]),
                TYPE: 'bullet'
            }
        }
    ], 5)
};
Class.demise = {
    PARENT: 'genericTank',
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
                TYPE: 'bullet'
            }
        },
        {
            POSITION: {
                LENGTH: 20.5,
                WIDTH: 12
            },
            PROPERTIES: {
                SHOOT_SETTINGS: combineStats([g.basic, g.pounder, g.flankGuard, g.flankGuard, g.spam]),
                TYPE: 'bullet'
            }
        }
    ], 4)
};
Class.designer = makeAuto({
    // Must be defined manually to preserve visual layering
    PARENT: 'genericTank',
    DANGER: 8,
    FACING_TYPE: ['spin', { speed: 0.02 }],
    BODY: {
        FOV: base.FOV * 1.15,
        SPEED: base.SPEED * 1.125 // 4.7X
    },
    TURRETS: weaponArray([
        {
            TYPE: 'architectGun',
            POSITION: {
                SIZE: 12,
                X: 8,
                ANGLE: 180,
                ARC: 190
            }
        },
        {
            TYPE: 'architectGun',
            POSITION: {
                SIZE: 12,
                X: 8,
                ARC: 190
            }
        }
    ], 3)
}, "Designer");
Class.dualbar = {
    PARENT: 'genericTank',
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
Class.dustStorm = {
    PARENT: 'genericTank',
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
                TYPE: 'bullet'
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
                TYPE: ['bee', { INDEPENDENT: true }],
                SYNCS_SKILLS: true,
                STAT_CALCULATOR: 'drone',
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
                TYPE: 'bullet'
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
                TYPE: ['bee', { INDEPENDENT: true }],
                SYNCS_SKILLS: true,
                STAT_CALCULATOR: 'drone',
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
                TYPE: 'bullet'
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
                TYPE: ['bee', { INDEPENDENT: true }],
                SYNCS_SKILLS: true,
                STAT_CALCULATOR: 'drone',
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
                TYPE: 'bullet'
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
                TYPE: ['bee', { INDEPENDENT: true }],
                SYNCS_SKILLS: true,
                STAT_CALCULATOR: 'drone',
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
                TYPE: 'bullet'
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
                TYPE: ['bee', { INDEPENDENT: true }],
                SYNCS_SKILLS: true,
                STAT_CALCULATOR: 'drone',
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
                TYPE: 'bullet'
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
                TYPE: ['bee', { INDEPENDENT: true }],
                SYNCS_SKILLS: true,
                STAT_CALCULATOR: 'drone',
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
                TYPE: 'bullet'
            }
        },
        {
            POSITION: {
                LENGTH: 14,
                WIDTH: 4.5
            },
            PROPERTIES: {
                SHOOT_SETTINGS: combineStats([g.swarm, g.bee, g.dustStorm]),
                TYPE: ['bee', { INDEPENDENT: true }],
                SYNCS_SKILLS: true,
                STAT_CALCULATOR: 'drone',
                WAIT_TO_CYCLE: true,
                LABEL: "Secondary"
            }
        }
    ]
};
Class.flexedDouble = makeFlank('pentaShot', 2, "Flexed Double", { extraStats: [g.doubleTwin] });
Class.foretrapper = makeFore({
    PARENT: 'genericTank',
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
                TYPE: 'trap',
                STAT_CALCULATOR: 'trap'
            }
        }
    ]
});
Class.gale = {
    PARENT: 'genericTank',
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
                TYPE: 'bullet'
            }
        },
        {
            POSITION: {
                LENGTH: 18,
                WIDTH: 8
            },
            PROPERTIES: {
                SHOOT_SETTINGS: combineStats([g.basic, g.flankGuard, g.flankGuard, g.spam]),
                TYPE: 'bullet'
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
                TYPE: 'bullet'
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
                TYPE: 'bullet'
            }
        },
    ], 4)
};
Class.harpy = makeGunner('falcon', "Harpy", { gunLength: 20, noDeco: true, renderBehind: true });
Class.hewnFlankDouble = {
    PARENT: 'genericTank',
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
                TYPE: 'bullet'
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
                TYPE: 'bullet'
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
                TYPE: 'bullet'
            }
        }, {delayIncrement: 0.5}), 2)
    ]
};
Class.hewnTriple = {
    PARENT: 'genericTank',
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
                TYPE: 'bullet'
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
                TYPE: 'bullet'
            }
        }, {delayIncrement: 0.5}), 3)
    ]
};
Class.hexaMachine = makeAuto(makeFlank({
    PARENT: 'genericTank',
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
                TYPE: 'trap',
                STAT_CALCULATOR: 'trap'
            }
        }
    ]
}, 6, "", { extraStats: [g.hexaTrapper], delayIncrement: 0.5, danger: 7 }), "Hexa-Machine");
Class.hexaMech = makeAuto(makeFlank({
    PARENT: 'genericTank',
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
                TYPE: 'autoTrap',
                STAT_CALCULATOR: 'trap'
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
                TYPE: 'autoTrap',
                STAT_CALCULATOR: 'trap'
            }
        }
    ]
}, 3, "", { extraStats: [g.hexaTrapper], danger: 7 }), "Hexa-Mech");
Class.hexaTrapGuard = makeAuto({
    PARENT: 'genericTank',
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
                TYPE: 'bullet'
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
                    TYPE: 'trap',
                    STAT_CALCULATOR: 'trap'
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
                    TYPE: 'trap',
                    STAT_CALCULATOR: 'trap'
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
                    TYPE: 'trap',
                    STAT_CALCULATOR: 'trap'
                }
            }
        ], {delayOverflow: true})
    ]
}, "Hexa-Trap Guard");
Class.marine = makeGunner('ranger', "Marine");
Class.megaAutoDirectordrive = makeAuto('directordrive', "Mega Auto-Directordrive", preset.makeAuto.driveMega);
Class.megaAutoDouble = makeAuto('doubleTwin', "Mega Auto-Double", preset.makeAuto.mega);
Class.megaHexaTrapper = makeAuto(makeFlank('trapper', 6, "", { extraStats: [g.hexaTrapper], delayIncrement: 0.5, danger: 7 }), "Mega Hexa-Trapper", preset.makeAuto.mega);
Class.octoTrapper = makeAuto(makeFlank('trapper', 8, "", { extraStats: [g.hexaTrapper], delayIncrement: 0.5, danger: 7 }), "Octo-Trapper");
Class.orbitalStrike = {
    PARENT: 'genericTank',
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
                TYPE: 'bullet'
            }
        },
        {
            POSITION: {
                LENGTH: 20.5,
                WIDTH: 14
            },
            PROPERTIES: {
                SHOOT_SETTINGS: combineStats([g.basic, g.pounder, g.destroyer, g.flankGuard, g.flankGuard]),
                TYPE: 'bullet'
            }
        }
    ], 3)
};
Class.overdoubleTwin = makeOver('doubleTwin', "Overdouble Twin", { angle: 90, renderBehind: true });
Class.protector = {
    PARENT: 'genericTank',
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
                TYPE: 'bullet'
            }
        },
        {
            POSITION: {
                LENGTH: 17,
                WIDTH: 13
            },
            PROPERTIES: {
                SHOOT_SETTINGS: combineStats([g.trap, g.setTrap]),
                TYPE: 'setTrap',
                STAT_CALCULATOR: 'block'
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
Class.quadTwin = makeFlank('twin', 4, "Quad Twin", { extraStats: [g.spam, g.doubleTwin, g.tripleTwin], danger: 8 });
Class.quintuplet = {
    PARENT: 'genericTank',
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
Class.ransacker = makeGuard('rifle', "Ransacker");
Class.ransacker_old = makeGuard('rifle_old');
Class.refuge = makeAuto({
    PARENT: 'genericTank',
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
                    TYPE: 'trap',
                    STAT_CALCULATOR: 'trap'
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
                TYPE: 'swarm',
                STAT_CALCULATOR: 'swarm'
            }
        }, 3, {delayIncrement: 1/3})
    ],
}, "Refuge");
Class.scatterer = {
    PARENT: 'genericTank',
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
Class.sequence = {
    PARENT: 'genericTank',
    LABEL: "Sequence",
    DANGER: 8,
    GUNS: weaponArray({
        POSITION: {
            LENGTH: 20.5,
            WIDTH: 12
        },
        PROPERTIES: {
            SHOOT_SETTINGS: combineStats([g.basic, g.pounder, g.flankGuard, g.flankGuard]),
            TYPE: 'bullet'
        }
    }, 3),
    TURRETS: weaponArray({
        TYPE: ['megaAutoTankGun', { INDEPENDENT: true }],
        POSITION: {
            SIZE: 14,
            X: 8,
            ANGLE: 180,
            ARC: 190
        }
    }, 3)
};
Class.skewnDouble = {
    PARENT: 'genericTank',
    LABEL: "Skewn Double",
    DANGER: 7,
    GUNS: [
        ...weaponMirror([
            {
                POSITION: {
                    LENGTH: 16,
                    WIDTH: 8,
                    Y: 5.5,
                    ANGLE: 225,
                },
                PROPERTIES: {
                    SHOOT_SETTINGS: combineStats([g.basic, g.twin, g.twin, g.doubleTwin, g.hewnDouble, { recoil: 1.15 }]),
                    TYPE: 'bullet'
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
                    TYPE: 'bullet'
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
                TYPE: 'bullet'
            }
        }, {delayIncrement: 0.5}), 2)
    ]
};
Class.tailer = makeGunner('stalker', "Tailer");
Class.tempest_AR = {
    PARENT: 'genericTank',
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
                TYPE: 'bullet'
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
                TYPE: 'bullet'
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
                TYPE: 'bullet'
            }
        }
    ], 6)
};
Class.tornado_AR = {
    PARENT: 'genericTank',
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
Class.tripleAutoDirectordrive = makeAuto('directordrive', "Triple Auto-Directordrive", preset.makeAuto.driveTriple);
Class.tripleAutoDouble = makeAuto('doubleTwin', "Triple Auto-Double", preset.makeAuto.triple);
Class.tripleFlankTwin = makeFlank({
    PARENT: 'genericTank',
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
                TYPE: 'bullet'
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
                TYPE: 'bullet'
            }
        }, {delayIncrement: 0.5})
    ]
}, 3, "Triple Flank Twin", { extraStats: [g.spam, g.doubleTwin, g.tripleTwin] });
Class.tripleGunner = makeFlank('gunner', 3, "Triple Gunner", { extraStats: [g.spam, g.doubleTwin, g.tripleTwin], danger: 8 });
Class.trove = {
    PARENT: 'genericTank',
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
                TYPE: 'bullet'
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
                TYPE: 'bullet'
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
                TYPE: 'bullet'
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
                TYPE: 'bullet'
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
                TYPE: 'bullet'
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
                TYPE: 'bullet'
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
                TYPE: 'bullet'
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
                TYPE: 'bullet'
            }
        }
    ],
    TURRETS: weaponArray({
        TYPE: ['auto4gun', { INDEPENDENT: true }],
        POSITION: {
            SIZE: 13,
            X: 6,
            ANGLE: 45,
            ARC: 190
        }
    }, 4)
};
Class.unity = {
    PARENT: 'genericTank',
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
                TYPE: 'bullet'
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
                    TYPE: 'bullet'
                }
            },
            {
                POSITION: {
                    LENGTH: 20.5,
                    WIDTH: 12
                },
                PROPERTIES: {
                    SHOOT_SETTINGS: combineStats([g.basic, g.pounder, g.flankGuard, g.flankGuard]),
                    TYPE: 'bullet'
                }
            }
        ], 3)
    ]
};
Class.vulcan = {
    PARENT: 'genericTank',
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
Class.warkwarkwark = makeFlank('wark', 3, "Warkwarkwark", { extraStats: [g.spam, g.doubleTwin, g.tripleTwin], danger: 8 });
Class.whirlwind_AR = /*makeAuto(*/{
    PARENT: 'genericTank',
    LABEL: "Whirlwind",
    DANGER: 8, //7,
    GUNS: weaponArray([
        {
            POSITION: {
                LENGTH: 14,
                WIDTH: 3.5,
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
                TYPE: 'trap',
                STAT_CALCULATOR: 'trap'
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
                TYPE: 'trap',
                STAT_CALCULATOR: 'trap'
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
                TYPE: 'trap',
                STAT_CALCULATOR: 'trap'
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
                TYPE: 'trap',
                STAT_CALCULATOR: 'trap'
            }
        }
    ], 3)
};//, "Whirlwind");
Class.wrench = {
    PARENT: 'genericTank',
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

// Special Tanks (Dominators)
Class.dominator = {
    PARENT: 'genericTank',
    LABEL: "Dominator",
    UPGRADE_LABEL: 'Unknown',
    ON_MINIMAP: false,
    DANGER: 7,
    SKILL: skillSet({
        rld: 1,
        dam: 1,
        pen: 1,
        str: 1,
        spd: 1,
    }),
    LEVEL: 45,
    LEVEL_CAP: 45,
    SIZE: 50,
    SYNC_WITH_TANK: true,
    BODY: {
        RESIST: 100,
        SPEED: 1.32,
        ACCELERATION: 0.8,
        HEALTH: 590,
        DAMAGE: 6,
        PENETRATION: 0.25,
        FOV: 0.5,
        PUSHABILITY: 0,
        HETERO: 0,
        SHIELD: base.SHIELD * 1.4
    },
    CONTROLLERS: ["nearestDifferentMaster", ["spin", { onlyWhenIdle: true }]],
    AI: { IGNORE_SHAPES: true },
    DISPLAY_NAME: true,
    TURRETS: [
        {
            POSITION: [22, 0, 0, 0, 360, 0],
            TYPE: "dominationBody"
        }
    ],
    CAN_BE_ON_LEADERBOARD: false,
    GIVE_KILL_MESSAGE: false,
    ACCEPTS_SCORE: false,
    HITS_OWN_TYPE: "pushOnlyTeam"
};
Class.destroyerDominator = {
    PARENT: "dominator",
    UPGRADE_LABEL: 'Destroyer',
    GUNS: [
        {
            POSITION: [15.25, 6.75, 1, 0, 0, 0, 0],
            PROPERTIES: {
                SHOOT_SETTINGS: combineStats([g.basic, g.destroyerDominator]),
                TYPE: "bullet"
            }
        },
        {
            POSITION: [5, 6.75, -1.6, 6.75, 0, 0, 0]
        }
    ]
};
Class.gunnerDominator = {
    PARENT: "dominator",
    UPGRADE_LABEL: 'Gunner',
    GUNS: [
        {
            POSITION: [14.25, 3, 1, 0, -2, 0, 0.5],
            PROPERTIES: {
                SHOOT_SETTINGS: combineStats([g.basic, g.gunnerDominator]),
                TYPE: "bullet"
            }
        },
        {
            POSITION: [14.25, 3, 1, 0, 2, 0, 0.5],
            PROPERTIES: {
                SHOOT_SETTINGS: combineStats([g.basic, g.gunnerDominator]),
                TYPE: "bullet"
            }
        },
        {
            POSITION: [15.85, 3, 1, 0, 0, 0, 0],
            PROPERTIES: {
                SHOOT_SETTINGS: combineStats([g.basic, g.gunnerDominator]),
                TYPE: "bullet"
            }
        },
        {
            POSITION: [5, 8.5, -1.6, 6.25, 0, 0, 0]
        }
    ]
};
Class.trapperDominator = {
    PARENT: "dominator",
    UPGRADE_LABEL: 'Trapper',
    FACING_TYPE: ["spin", {speed: 0.02}],
    GUNS: weaponArray([
        {
            POSITION: [4, 3.75, 1, 8, 0, 0, 0]
        },
        {
            POSITION: [1.25, 3.75, 1.7, 12, 0, 0, 0],
            PROPERTIES: {
                SHOOT_SETTINGS: combineStats([g.trap, g.trapperDominator]),
                TYPE: "trap",
                STAT_CALCULATOR: "trap",
                AUTOFIRE: true
            }
        }
    ], 8)
};

// Special Tanks (Sanctuaries)
Class.sanctuary = {
    PARENT: 'dominator',
    LABEL: "Sanctuary",
    DISPLAY_NAME: false,
    DISPLAY_SCORE: false,
    LEVEL: 45,
    SIZE: 20,
    FACING_TYPE: ['spin', {speed: 0.025}],
    SKILL: skillSet({
        rld: 1.25,
        dam: 1.25,
        str: 1.25,
    }),
    BODY: {
        HEALTH: 1280,
        DAMAGE: 5.5,
        SHIELD: base.SHIELD * 1.2
    },
    TURRETS: [
        {
            TYPE: 'dominationBody',
            POSITION: {
                SIZE: 22
            }
        }
    ]
};
let sancTiers = [3, 6, 8, 9, 10, 12];
let sancHealerTiers = [2, 3, 4];
for (let tier of sancHealerTiers) {
    Class['sanctuaryHealerTier' + (sancHealerTiers.indexOf(tier) + 1)] = {
        PARENT: 'sanctuaryHealer',
        FACING_TYPE: ['spin', {speed: -0.06}],
        GUNS: weaponArray([
            {
                POSITION: {
                    LENGTH: 6,
                    WIDTH: 9,
                    ASPECT: -0.5,
                    X: 12.5
                },
            },
            {
                POSITION: {
                    LENGTH: 5.5,
                    WIDTH: 10,
                    X: 10
                },
                PROPERTIES: {
                    SHOOT_SETTINGS: combineStats([g.basic, { range: 0.5, reload: 1.1, speed: 0.80 }, g.healer]),
                    SPAWN_OFFSET: 0,
                    TYPE: 'healerSanctuaryBullet',
                    AUTOFIRE: true,
                }
            }
        ], tier)
    }
};
for (let tier of sancTiers) {
    let sancIndex = sancTiers.indexOf(tier)
    Class['sanctuaryTier' + (sancIndex + 1)] = {
        PARENT: 'sanctuary',
        TURRETS: [],
        UPGRADE_LABEL: 'Tier ' + (sancIndex + 1),
        GUNS: weaponArray([
            {
                POSITION: {LENGTH: 12, WIDTH: 4}
            }, {
                POSITION: {LENGTH: 1.5, WIDTH: 4, ASPECT: 1.7, X: 12},
                PROPERTIES: {
                    SHOOT_SETTINGS: combineStats([g.trap, {shudder: 0.15, health: 7, reload: 1.5, speed: 1}]),
                    TYPE: ["trap", {BODY: {PUSHABILITY: 0.5}}],
                    STAT_CALCULATOR: "trap",
                    AUTOFIRE: true,
                },
            }
        ], tier)
    }
    Class['sanctuaryTier' + (sancIndex + 1)].TURRETS.push({
        POSITION: { SIZE: 22 },
        TYPE: 'dominationBody',
    }, {
        POSITION: { SIZE: 9.3, LAYER: 1 },
        TYPE: 'sanctuaryHealerTier' + (sancIndex < 2 ? 1 : sancIndex < 4 ? 2 : sancIndex < 6 ? 3 : 3),
    })
};

// Special Tanks (Motherships)
Class.mothership = {
    PARENT: 'genericTank',
    LABEL: "Mothership",
    NAME: "Mothership",
    DANGER: 10,
    SIZE: Class.genericTank.SIZE * (12 / 3),
    SHAPE: 16,
    STAT_NAMES: statnames.drone,
    VALUE: 5e5,
    SKILL: [9, 9, 9, 9, 9, 9, 9, 9, 9, 9],
    BODY: {
        REGEN: 0.5,
        FOV: 1,
        SHIELD: 0,
        ACCEL: 0.2,
        SPEED: 0.3,
        HEALTH: 4000,
        PUSHABILITY: 0.15,
        DENSITY: 0.2,
        DAMAGE: 1.5,
    },
    HITS_OWN_TYPE: "pushOnlyTeam",
    GUNS: 
    weaponArray([
        {
            POSITION: [4.3, 3.1, 1.2, 8, 0, 22.5, 0],
            PROPERTIES: {
                MAX_CHILDREN: 2,
                SHOOT_SETTINGS: combineStats([g.drone, g.overseer, g.mothership]),
                TYPE: "drone",
                AUTOFIRE: true,
                SYNCS_SKILLS: true,
                STAT_CALCULATOR: "drone",
                WAIT_TO_CYCLE: true,
            }
        }, {
            POSITION: [4.3, 3.1, 1.2, 8, 0, 45, 1/32],
            PROPERTIES: {
                MAX_CHILDREN: 2,
                SHOOT_SETTINGS: combineStats([g.drone, g.overseer, g.mothership]),
                TYPE: ["drone", {
                        AI: {skynet: true},
                        INDEPENDENT: true,
                        BODY: {FOV: 2},
                    }],
                AUTOFIRE: true,
                SYNCS_SKILLS: true,
                STAT_CALCULATOR: "drone",
                WAIT_TO_CYCLE: true,
            }
        }
    ], 8, {delayIncrement: 1/16})
};
Class.flagship = {
    PARENT: 'mothership',
    LABEL: "Flagship",
    NAME: "Flagship",
    TURRETS: [
        {
            TYPE: 'flagshipTurret',
            POSITION: {
                SIZE: 10,
                ANGLE: 45,
                LAYER: 1
            }
        }
    ]
};
Class.turkeyNose = {
    COLOR: 19,
    LABEL: '',
    SIZE: 6.45,
};
Class.turkeyEye = {
    COLOR: 18,
    LABEL: '',
    TURRETS: [
        {
            POSITION: [10.75, 1, 0, 0, 360, 1],
            TYPE: "turkeyNose"
        }
    ] 
};
Class.turkeyHead = {
    LABEL: 'Turkey',
    SIZE: 26.9,
    GUNS: [
        {
            POSITION: [19.8, 8.1, -1.75, 5.5, 0, 0, 0]
        }
    ],
    SHAPE: 0,
    TURRETS: [
        {
            POSITION: [6.5, 7, -5, 0, 360, 1],
            TYPE: "turkeyEye"
        },
        {
            POSITION: [6.5, 7, 5, 0, 360, 1],
            TYPE: "turkeyEye"
        }
    ]
};
Class.turkey = {
    PARENT: 'genericTank',
    LABEL: 'Turkey',
    NAME: 'Turkey',
    SIZE: 50,
    MAX_CHILDREN: 16,
    SHAPE: 16,
    BODY: {
        SPEED: base.SPEED * 0.2,
        FOV: 1.5,
        SHIELD: 0,
        ACCEL: 0.2,
        SPEED: 0.3,
        HEALTH: 2000,
        PUSHABILITY: 0.15,
        DENSITY: 0.2,
        DAMAGE: 1.5,
    },
    GUNS: [
        {
            POSITION: [18, 4.69, 1, 0, 0, 135, 0],
            PROPERTIES: {
                SHOOT_SETTINGS: combineStats([g.drone, g.overseer, g.mothership]),
                TYPE: "drone",
                AUTOFIRE: true,
                SYNCS_SKILLS: true,
                STAT_CALCULATOR: "drone",
            },
        },
        { 
            POSITION: [20.96, 6.69, 1, 0, 0, 157.5, 0],
            PROPERTIES: {
                SHOOT_SETTINGS: combineStats([g.drone, g.overseer, g.mothership]),
                TYPE: "drone",
                AUTOFIRE: true,
                SYNCS_SKILLS: true,
                STAT_CALCULATOR: "drone",
            }, 
        },
        {
            POSITION: [18, 4.69, 1, 0, 0, 225, 0],
            PROPERTIES: {
                SHOOT_SETTINGS: combineStats([g.drone, g.overseer, g.mothership]),
                TYPE: "drone",
                AUTOFIRE: true,
                SYNCS_SKILLS: true,
                STAT_CALCULATOR: "drone",
            },  
        },
        {
            POSITION: [20.96, 6.69, 1, 0, 0, 202.5, 0],
            PROPERTIES: {
                SHOOT_SETTINGS: combineStats([g.drone, g.overseer, g.mothership]),
                TYPE: "drone",
                AUTOFIRE: true,
                SYNCS_SKILLS: true,
                STAT_CALCULATOR: "drone",
            }, 
        },
        {
        POSITION: [24.09, 8.69, 1, 0, 0, 180, 0],
            PROPERTIES: {
                SHOOT_SETTINGS: combineStats([g.drone, g.overseer, g.mothership]),
                TYPE: "drone",
                AUTOFIRE: true,
                SYNCS_SKILLS: true,
                STAT_CALCULATOR: "drone",
            },
        },
        {
            POSITION: [ 24.09, 8.69, 1, 0, 0, 180, 0 ],
            PROPERTIES: {
                SHOOT_SETTINGS: combineStats([g.drone, g.overseer, g.mothership]),
                TYPE: "drone",
                AUTOFIRE: true,
                SYNCS_SKILLS: true,
                STAT_CALCULATOR: "drone",
            },
        },
        { 
            POSITION: [ 4, 5, 1, 10, 0, 105, 0 ],
            PROPERTIES: {
                SHOOT_SETTINGS: combineStats([g.drone, g.overseer, g.mothership]),
                TYPE: "drone",
                AUTOFIRE: true,
                SYNCS_SKILLS: true,
                STAT_CALCULATOR: "drone",
            }, 
        },
        {   POSITION: [ 4, 5, 1, 10, 0, -105, 0 ],
            PROPERTIES: {
                SHOOT_SETTINGS: combineStats([g.drone, g.overseer, g.mothership]),
                TYPE: "drone",
                AUTOFIRE: true,
                SYNCS_SKILLS: true,
                STAT_CALCULATOR: "drone",
            }, 
        }
    ],
    TURRETS: [
        {
            POSITION: [10, 8.75, 0, 0, 360, 1],
            TYPE: "turkeyHead"
        }
    ],
};

// Special Tanks (Spectators)
Class.spectator = {
    PARENT: 'genericTank',
    LABEL: "Spectator",
    ALPHA: 0,
    CAN_BE_ON_LEADERBOARD: false,
    ACCEPTS_SCORE: false,
    DRAW_HEALTH: false,
    HITS_OWN_TYPE: "never",
    IGNORED_BY_AI: true,
    ARENA_CLOSER: true,
    IS_IMMUNE_TO_TILES: true,
    FULL_INVISIBLE: true,
    CAN_SEE_INVISIBLE_ENTITIES: true,
    BODY: {
        PUSHABILITY: 0,
        SPEED: 5,
        FOV: 2.5,
        DAMAGE: 0,
        HEALTH: 1e100,
        SHIELD: 1e100,
        REGEN: 1e100,
    },
    GUNS: [{
        POSITION: [0,0,0,0,0,0,0],
        PROPERTIES: {
            SHOOT_SETTINGS: combineStats([g.basic, {reload: 0.2}, g.fake]),
            TYPE: "bullet",
            ALPHA: 0
        }
    }, {
        POSITION: [0, 0, 0, 0, 0, 0, 0],
        PROPERTIES: {
            SHOOT_SETTINGS: combineStats([g.basic, { reload: 0.25 }, g.fake]),
            TYPE: "bullet",
            ALPHA: 0,
            ALT_FIRE: true,
        }
    }],
    ON: [{
        event: "altFire",
        handler: ({ body }) => {
            body.x = body.x + body.control.target.x
            body.y = body.y + body.control.target.y
        }
    }]
};
Class.guillotine = {
    PARENT: "spectator",
    LABEL: "Guillotine",
    CAN_GO_OUTSIDE_ROOM: true,
    TOOLTIP: "Use left click to inspect and right click to teleport. Press F to kill the selected entity.",
    GUNS: [
        {
            POSITION: {
                LENGTH: 8,
                WIDTH: 12,
                X: 31
            }
        },
        {
            POSITION: {
                LENGTH: 10,
                WIDTH: 10,
                ASPECT: 1.6,
                X: -5,
                Y: -8,
                ANGLE: 90
            }
        },
        ...weaponMirror({
            POSITION: {
                LENGTH: 40,
                WIDTH: 2,
                Y: 7
            }
        })
    ],
    TURRETS: [
        {
            POSITION: {
                SIZE: 2,
                X: 35,
                LAYER: 1
            },
            TYPE: ["circleHat", {COLOR: "grey"}]
        }
    ]
};
Class.banHammer = {
    PARENT: 'genericTank',
    LABEL: "Ban Hammer",
    ALPHA: 0,
    CAN_BE_ON_LEADERBOARD: false,
    CAN_GO_OUTSIDE_ROOM: true,
    ACCEPTS_SCORE: false,
    DRAW_HEALTH: false,
    HITS_OWN_TYPE: "never",
    IGNORED_BY_AI: true,
    ARENA_CLOSER: true,
    IS_IMMUNE_TO_TILES: true,
    CAN_SEE_INVISIBLE_ENTITIES: true,
    TOOLTIP: "Use left click to inspect and right click to teleport. Press F to ban the selected player.",
    BODY: {
        PUSHABILITY: 0,
        SPEED: 5,
        FOV: 2.5,
        DAMAGE: 0,
        HEALTH: 1e100,
        SHIELD: 1e100,
        REGEN: 1e100,
    },
    GUNS: [
        {POSITION: [30, 7, 1.3, 0, 0, 0, 0]},
        {POSITION: [3, 11, 0.75, 7.5, -36, 90, 0]},
        {POSITION: [3, 11, 0.75, 7.5, 36, -90, 0]},
        {POSITION: [11, 14, 1, 30.5, 0, 0, 0]},
        {POSITION: [13, 10.5, -1.2, 0, 0, 0, 0]},
        /*{
            POSITION: [0,0,0,0,0,0,0],
            PROPERTIES: {
                SHOOT_SETTINGS: combineStats([g.basic, {reload: 0.25}, g.fake]),
                TYPE: "bullet",
                ALPHA: 0
            }
        },*/
        {
            POSITION: [0, 0, 0, 0, 0, 0, 0],
            PROPERTIES: {
                SHOOT_SETTINGS: combineStats([g.basic, {reload: 0.2}, g.fake]),
                TYPE: "bullet",
                ALPHA: 0,
                ALT_FIRE: true
            }
        }
    ],
    ON: [{
        event: "altFire",
        handler: ({ body }) => {
            body.x = body.x + body.control.target.x
            body.y = body.y + body.control.target.y
        }
    }]
};

// Special Tanks (Other)
Class.antiTankMachineGun = {
    PARENT: "dominator",
    LABEL: "Anti-Tank Machine Gun",
    UPGRADE_LABEL: "A.T.M.G.",
    CONTROLLERS: [['spin', {onlyWhenIdle: true}], 'nearestDifferentMaster'],
    LEVEL: 45,
    SIZE: 32,
    BODY: {
        RESIST: 100,
        SPEED: 1.32,
        ACCELERATION: 0.8,
        HEALTH: 1e99,
        DAMAGE: 6,
        PENETRATION: 0.25,
        FOV: 1.35,
        PUSHABILITY: 0,
        HETERO: 0,
        SHIELD: base.SHIELD * 1.4,
    },
    SKILL_CAP: Array(10).fill(15),
    SKILL: Array(10).fill(15),
    GUNS: [
        {
            POSITION: { LENGTH: 15, WIDTH: 3.0000001192092896, X: -6.556708751634699e-8, Y: 1.5000000596046434, ANGLE: 0 },
            PROPERTIES: {
                SHOOT_SETTINGS: combineStats([g.basic, g.op, {reload: 0.5, health: 100, damage: 100, recoil: 0, spray: 0.1, speed: 2, maxSpeed: 2}]),
                TYPE: "bullet",
            }
        },
        {
            POSITION: { LENGTH: 15, WIDTH: 3.0000001192092896, X: -6.556708770004402e-8, Y: -1.5000000596046434, ANGLE: 0 },
            PROPERTIES: {
                SHOOT_SETTINGS: combineStats([g.basic, g.op, {reload: 0.5, health: 100, damage: 100, recoil: 0, spray: 0.1, speed: 2, maxSpeed: 2}]),
                TYPE: "bullet",
            }
        },
        {
            POSITION: { LENGTH: 17.000000476837158, WIDTH: 3.0000001192092896, X: 0, Y: 0, ANGLE: 0 },
            PROPERTIES: {
                SHOOT_SETTINGS: combineStats([g.basic, g.op, {reload: 0.5, health: 100, damage: 100, recoil: 0, spray: 0.1, speed: 2, maxSpeed: 2}]),
                TYPE: "bullet",
            }
        },
        {
            POSITION: { LENGTH: 10, WIDTH: 8.00000011920929, ASPECT: -1.2000000476837158, X: 9.999999999999998, Y: -6.123234262925839e-16, ANGLE: 90.00000250447816 }
        },
        {
            POSITION: { LENGTH: 10, WIDTH: 8.00000011920929, ASPECT: -1.2000000476837158, X: 9.999999999999998, Y: -6.123233601181349e-16, ANGLE: -90.00000250447816 }
        },
        {
            POSITION: { LENGTH: 5, WIDTH: 6.000000238418579, ASPECT: -1.600000023841858, X: 7.5, Y: -4.592425496802574e-16, ANGLE: 0 }
        }
    ],
    TURRETS: [{
        POSITION: [20, 0, 25, 0, 180, 1],
        TYPE: ["antiTankMachineGunArm"]
    }, {
        POSITION: [20, 0, -25, 0, 180, 1],
        TYPE: ["antiTankMachineGunArm"]
    }, {
        POSITION: [25, 0, 0, 0, 360, 0],
        TYPE: ["dominationBody"]
    }]
};
Class.arenaCloser = {
    PARENT: 'genericTank',
    LABEL: "Arena Closer",
    DISPLAY_NAME: false,
    DANGER: 10,
    SIZE: 34,
    COLOR: "yellow",
    UPGRADE_COLOR: "yellow",
    LAYER: 13,
    BODY: {
        REGEN: 1e5,
        HEALTH: 1e6,
        DENSITY: 30,
        DAMAGE: 1e5,
        FOV: 10,
        SPEED: 4,
    },
    SKILL: skillSet({rld: 1, dam: 1, pen: 1, str: 1, spd: 1, atk: 1, hlt: 1, shi: 1, rgn: 1, mob: 1}),
    DRAW_HEALTH: false,
    HITS_OWN_TYPE: "never",
    ARENA_CLOSER: true,
    IS_IMMUNE_TO_TILES: true,
    UPGRADE_TOOLTIP: "Hackerman",
    GUNS: [
        {
            POSITION: {
                LENGTH: 14,
                WIDTH: 10
            },
            PROPERTIES: {
                SHOOT_SETTINGS: combineStats([g.basic, {reload: 0.8, recoil: 0.25, health: 1e3, damage: 1e3, pen: 1e3, speed: 3, maxSpeed: 1, range: 1.8, density: 4, spray: 0.25}]),
                TYPE: ["bullet", {LAYER: 12}]
            }
        }
    ]
};
Class.arrasPolice = {
    PARENT: 'genericTank',
    LABEL: "ARRAS POLICE",
    SIZE: 60,
    COLOR: 16,
    UPGRADE_COLOR: 20,
    UPGRADE_TOOLTIP: "WOOP WOOP! That's the sound of da police!",
    BODY: Class.booster.BODY,
    GUNS: [
        {
            POSITION: {
                LENGTH: 18,
                WIDTH: 8
            },
            PROPERTIES: {
                SHOOT_SETTINGS: combineStats([g.basic, g.flankGuard, g.triAngle, g.triAngleFront, { recoil: 4 }]),
                TYPE: 'bullet',
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
                    SHOOT_SETTINGS: combineStats([g.basic, g.flankGuard, g.triAngle, g.thruster, { recoil: 4 }]),
                    TYPE: 'bullet',
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
                    SHOOT_SETTINGS: combineStats([g.basic, g.flankGuard, g.triAngle, g.thruster, { recoil: 4 }]),
                    TYPE: 'bullet',
                    LABEL: "Thruster"
                }
            }
        ])
    ],
    PROPS: [
        {
            TYPE: ['hexagonHat', {COLOR: 21}],
            POSITION: {
                SIZE: 6,
                Y: 7.45,
                LAYER: 1
            }
        },
        {
            TYPE: ['hexagonHat', {COLOR: 24}],
            POSITION: {
                SIZE: 6,
                Y: -7.45,
                LAYER: 1
            }
        },
        {
            TYPE: ['squareHat', {COLOR: 22}],
            POSITION: {
                SIZE: 6.35,
                Y: 2.85,
                LAYER: 1
            }
        },
        {
            TYPE: ['squareHat', {COLOR: 23}],
            POSITION: {
                SIZE: 6.35,
                Y: -2.85,
                LAYER: 1
            }
        }
    ]
};
Class.baseProtector = {
    PARENT: 'genericTank',
    LABEL: "Base",
    UPGRADE_LABEL: "Base Protector",
    ON_MINIMAP: false,
    SIZE: 64,
    DAMAGE_CLASS: 0,
    ACCEPTS_SCORE: false,
    CAN_BE_ON_LEADERBOARD: false,
    IGNORED_BY_AI: true,
    HITS_OWN_TYPE: "pushOnlyTeam",
    SKILL: skillSet({
        rld: 1,
        dam: 1,
        pen: 1,
        spd: 1,
        str: 1,
    }),
    BODY: {
        SPEED: 0,
        HEALTH: 1e4,
        DAMAGE: 10,
        PENETRATION: 0.25,
        SHIELD: 1e3,
        REGEN: 100,
        FOV: 1,
        PUSHABILITY: 0,
        RESIST: 10000,
        HETERO: 0,
    },
    FACING_TYPE: ['spin', {speed: 0.04}],
    TURRETS: [
        {
            POSITION: [25, 0, 0, 0, 360, 0],
            TYPE: "dominationBody",
        },
        ...weaponArray({
            POSITION: [12, 7, 0, 45, 100, 0],
            TYPE: "baseSwarmTurret",
        }, 4)
    ],
    GUNS: weaponArray([
        {
            POSITION: [4.5, 11.5, -1.3, 6, 0, 45, 0],
        },
        {
            POSITION: [4.5, 8.5, -1.5, 7, 0, 45, 0],
        },
    ], 4)
};

// Admin Tanks
Class.alas = {
    PARENT: 'genericTank',
    LABEL: "Alas",
    DANGER: 9,
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
                SHOOT_SETTINGS: combineStats([g.drone, {speed: 5}]),
                TYPE: 'drone',
                AUTOFIRE: true,
                SYNCS_SKILLS: true,
                STAT_CALCULATOR: 'drone',
                MAX_CHILDREN: 6,
                WAIT_TO_CYCLE: true
            }
        },
        {
            POSITION: {
                LENGTH: 9,
                WIDTH: 0.125,
                ASPECT: -5,
                X: 8
            }
        }
    ]
};
Class.beeman = {
    PARENT: 'genericTank',
    LABEL: "Beeman",
    GUNS: [
        {
            POSITION: {
                LENGTH: 18,
                WIDTH: 8
            },
            PROPERTIES: {
                SHOOT_SETTINGS: combineStats([g.trap, g.setTrap, {range: 0.5}]),
                TYPE: 'beemanTrap'
            }
        }
    ]
};
Class.bigBalls = {
    PARENT: 'genericTank',
    LABEL: "BIG Balls",
    DANGER: 7,
    STAT_NAMES: statnames.drone,
    BODY: Class.overseer.BODY,
    GUNS: weaponArray({
        POSITION: {
            LENGTH: 14,
            WIDTH: 14,
            ASPECT: 1.5,
            ANGLE: 90
        },
        PROPERTIES: {
            SHOOT_SETTINGS: combineStats([g.drone, g.overseer, g.bigBalls]),
            TYPE: 'bigBall',
            AUTOFIRE: true,
            SYNCS_SKILLS: true,
            STAT_CALCULATOR: 'drone',
            WAIT_TO_CYCLE: true,
            MAX_CHILDREN: 1
        }
    }, 2)
};
Class.cxATMG = {
    PARENT: "dominator",
    LABEL: "CX-ATMG",
    UPGRADE_LABEL: "CX-ATMG",
    SHAPE: Class.cube.SHAPE,
    SIZE: 12,
    BODY: {
        RESIST: 2,
        SPEED: 2.32,
        ACCELERATION: 0.8,
        HEALTH: 200,
        DAMAGE: 6,
        PENETRATION: 0.25,
        FOV: 1.35,
        PUSHABILITY: 0,
        HETERO: 0,
        SHIELD: base.SHIELD * 1.4,
    },
    SKILL_CAP: Array(10).fill(15),
    SKILL: Array(10).fill(15),
    GUNS: [
        {
            POSITION: [15, 2.5, 1, 0, 2, 0, 0.2],
            PROPERTIES: {
                SHOOT_SETTINGS: combineStats([g.basic, {reload: 0.5}]),
                TYPE: "cxATMGBullet",
            }
        },
        {
            POSITION: [15, 2.5, 1, 0, -2, 0, 0.2],
            PROPERTIES: {
                SHOOT_SETTINGS: combineStats([g.basic, {reload: 0.5}]),
                TYPE: "cxATMGBullet",
            }
        },
        {
            POSITION: [1, 2.5, 1, 0, 0, 0, 0],
            PROPERTIES: {
                SHOOT_SETTINGS: combineStats([g.basic, {reload: 0.5}]),
                TYPE: "cxATMGBullet",
            }
        },
        {
            POSITION: [16.5, 3.5, 1, 0, 0, 0, 0],
            PROPERTIES: {
                SHOOT_SETTINGS: combineStats([g.basic, {reload: 0.5}]),
                TYPE: "cxATMGBullet",
            }
        },
        {
            POSITION: [24, 7, -1.3, 0, 0, 90, 0],
        },
        {
            POSITION: [24, 7, -1.3, 0, 0, -90, 0],
        },
        {
            POSITION: [5.5, 6.5, -1.8, 6.5, 0, 0, 0]
        }
    ],
    TURRETS: [{
        POSITION: [20, 0, 25, 0, 180, 1],
        TYPE: ["cxATMGArm"]
    }, {
        POSITION: [20, 0, -25, 0, 180, 1],
        TYPE: ["cxATMGArm"]
    }, {
        POSITION: [26, 0, 0, 0, 360, 0],
        TYPE: ["dominationBody"]
    }]
};
Class.damoclone = {
    PARENT: 'genericTank',
    LABEL: "Damoclone",
    COLOR: 'trans',
    HAS_NO_RECOIL: true,
    GUNS: weaponArray({
        POSITION: {
            LENGTH: 16,
            WIDTH: 4
        },
        PROPERTIES: {
            SHOOT_SETTINGS: combineStats([g.basic, g.twin, g.gunner, g.cyclone, g.spam]),
            TYPE: 'bullet'
        }
    }, 24, {delayIncrement: 1/24})
};
Class.developer = {
    PARENT: 'genericTank',
    LABEL: "Developer",
    BODY: {
        SHIELD: 1000,
        REGEN: 10,
        HEALTH: 100,
        DAMAGE: 10,
        DENSITY: 20,
        FOV: 2,
    },
    //COLOR: "mirror", // todo: make sure mirror colour doesnt grey out your leaderboard
    SKILL_CAP: Array(10).fill(dfltskl),
    IGNORED_BY_AI: true,
    RESET_CHILDREN: true,
    ACCEPTS_SCORE: true,
    CAN_BE_ON_LEADERBOARD: true,
    CAN_GO_OUTSIDE_ROOM: false,
    IS_IMMUNE_TO_TILES: false,
    DRAW_HEALTH: true,
    ARENA_CLOSER: true,
    INVISIBLE: [0, 0],
    ALPHA: [0, 1],
    HITS_OWN_TYPE: 'hardOnlyTanks',
    NECRO: false,
    SHAPE: [
        [-1, -0.8],
        [-0.8, -1],
        [0.8, -1],
        [1, -0.8],
        [0.2, 0],
        [1, 0.8],
        [0.8, 1],
        [-0.8, 1],
        [-1, 0.8],
    ],
    GUNS: [
        {
            POSITION: {
                LENGTH: 18,
                WIDTH: 10,
                ASPECT: -1.4
            },
            PROPERTIES: {
                SHOOT_SETTINGS: combineStats([g.basic, g.op]),
                TYPE: 'developerBullet'
            }
        }
    ]
};
Class.fat456 = makeRadialAuto('architectGun', { isTurret: true, danger: 7, size: 12, label: "Fat456", body: { FOV: base.FOV * 1.15, SPEED: base.SPEED * 4 } });
Class.fat456.COLOR = 'brown';
Class.fat456.SIZE = 30;
Class.heptaAutoBasic = makeAuto('basic', "Hepta Auto-Basic", preset.makeAuto.hepta);
Class.machineShot = {
    PARENT: 'genericTank',
    LABEL: "Machine Shot",
    DANGER: 7,
    BODY: Class.pentaShot.BODY,
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
                SHOOT_SETTINGS: combineStats([g.machineShot]),
                TYPE: 'bullet'
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
                SHOOT_SETTINGS: combineStats([g.machineShot]),
                TYPE: 'bullet'
            }
        }]),
        {
            POSITION: {
                LENGTH: 22,
                WIDTH: 8
            },
            PROPERTIES: {
                SHOOT_SETTINGS: combineStats([g.machineShot]),
                TYPE: 'bullet'
            }
        }
    ]
};
Class.meDoingYourMom = {
    PARENT: 'genericTank',
    LABEL: "Me doing your mom",
    UPGRADE_LABEL: "M.D.Y.M.",
    DANGER: 7,
    BODY: Class.ranger.BODY,
    GUNS: [
        {
            POSITION: {
                LENGTH: 128,
                WIDTH: 8
            },
            PROPERTIES: {
                SHOOT_SETTINGS: combineStats([g.basic, g.sniper, g.assassin, { recoil: 0.01, reload: 0.01 }]),
                FIXED_RELOAD: true,
                TYPE: 'bullet'
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
Class.meOnMyWayToDoYourMom = {
    PARENT: 'genericTank',
    LABEL: "Me on my way to do your mom",
    UPGRADE_LABEL: "MOMWTDYM",
    DANGER: 7,
    GUNS: [
        {
            POSITION: {
                LENGTH: 20.5,
                WIDTH: 19.5
            },
            PROPERTIES: {
                SHOOT_SETTINGS: combineStats([g.basic, g.pounder, g.destroyer, g.annihilator, { reload: 0.01, recoil: 10, spray: 1 }]),
                TYPE: 'bullet'
            }
        }
    ]
};
Class.rapture = {
    PARENT: 'genericTank',
    LABEL: "Rapture",
    DANGER: 7,
    GUNS: [
        {
            POSITION: {
                LENGTH: 22.5,
                WIDTH: 19.5
            },
            PROPERTIES: {
                SHOOT_SETTINGS: combineStats([g.basic, g.pounder, g.destroyer, g.annihilator]),
                TYPE: 'speedBullet'
            }
        },
        {
            POSITION: {
                LENGTH: 16,
                WIDTH: 12.78,
                ASPECT: -1.5,
                X: 3
            }
        },
        {
            POSITION: {
                LENGTH: 4,
                WIDTH: 13,
                X: 18.5
            }
        }
    ]
};
Class.smasher3 = makeRadialAuto('flailBall', { isTurret: true, danger: 8, label: "Smasher-3" });
Class.tetraGunner = {
    PARENT: 'genericTank',
    LABEL: "Tetra Gunner",
    DANGER: 7,
    GUNS: weaponArray([
        ...weaponMirror({
            POSITION: {
                LENGTH: 14,
                WIDTH: 4.5,
                Y: 3,
                DELAY: 0.5
            },
            PROPERTIES: {
                SHOOT_SETTINGS: combineStats([g.basic, g.twin, g.gunner, { speed: 1.2, size: 0.75 }]),
                TYPE: 'bullet'
            }
        }),
        {
            POSITION: {
                LENGTH: 18,
                WIDTH: 3.5
            },
            PROPERTIES: {
                SHOOT_SETTINGS: combineStats([g.basic, g.twin, g.gunner, { speed: 1.2 }]),
                TYPE: 'bullet'
            }
        },
    ], 4)
};
Class.tracker3 = makeRadialAuto('tracker3gun', { isTurret: true, danger: 7, label: "Tracker-3" });
Class.tracker3.SKILL_CAP = [0, 0, 0, 0, 0, smshskl, smshskl, smshskl, smshskl, smshskl];
Class.wifeBeater = {
    PARENT: "overlord",
    LABEL: 'Wife Beater',
    DANGER: 8,
    STAT_NAMES: statnames.drone,
    BODY: {
        ACCELERATION: base.ACCEL * 0.75,
        SPEED: base.SPEED * 0.8,
        FOV: base.FOV * 1.1,
    },
    MAX_CHILDREN: 16,
    GUNS: weaponArray({
        POSITION: [6, 12, 1.2, 8, 0, 0, 0],
        PROPERTIES: {
            SHOOT_SETTINGS: combineStats([g.drone, g.overseer, g.op]),
            TYPE: "drone",
            AUTOFIRE: true,
            SYNCS_SKILLS: true,
            STAT_CALCULATOR: "drone",
            WAIT_TO_CYCLE: true
        }
    }, 4)
};
Class.worstTank = {
    PARENT: 'genericTank',
    LABEL: "Worst Tank",
    DANGER: 7,
    BODY: Class.machineGunner.BODY,
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
                SHOOT_SETTINGS: combineStats([g.basic, g.worstTank]),
                TYPE: 'bullet'
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
                SHOOT_SETTINGS: combineStats([g.basic, g.worstTank]),
                TYPE: 'bullet'
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
                SHOOT_SETTINGS: combineStats([g.basic, g.worstTank]),
                TYPE: 'bullet'
            }
        }
    ]
};

// Class Tree
addUpgrades('basic', 1, ['twin', 'sniper', 'machineGun', 'flankGuard', 'director', 'pounder', 'trapper', 'desmos']);
    addUpgrades('basic', 2, ['smasher']);
        addUpgrades('smasher', 3, ['megaSmasher', 'spike', 'autoSmasher', 'landmine']);
        addUpgrades('healer', 3, ['medic', 'ambulance', 'surgeon', 'paramedic']);

    addUpgrades('twin', 2, ['doubleTwin', 'tripleShot', 'gunner', 'hexaTank', 'helix']);
        addUpgrades('twin', 3, ['dual', 'bulwark', 'musket']);
        addUpgrades('doubleTwin', 3, ['tripleTwin', 'hewnDouble', 'autoDouble', 'bentDouble']);
        addUpgrades('tripleShot', 3, ['pentaShot', 'spreadshot', 'bentHybrid', 'bentDouble', 'triplet', 'triplex']);
        addUpgrades('gunner', 3, ['autoGunner', 'nailgun', 'auto4', 'machineGunner', 'gunnerTrapper', 'cyclone', 'overgunner']);
        addUpgrades('hexaTank', 3, ['octoTank', 'cyclone', 'hexaTrapper']);
        addUpgrades('helix', 3, ['triplex', 'quadruplex']);

    addUpgrades('sniper', 2, ['assassin', 'hunter', 'minigun', 'rifle', 'marksman']);
        addUpgrades('sniper', 3, ['bushwhacker']);
        addUpgrades('assassin', 3, ['ranger', 'falcon', 'stalker', 'autoAssassin', 'single', 'deadeye']);
        addUpgrades('hunter', 3, ['predator', 'xHunter', 'poacher', 'ordnance', 'dual', 'nimrod']);
        addUpgrades('minigun', 3, ['streamliner', 'nailgun', 'cropDuster', 'barricade', 'vulture']);
        addUpgrades('rifle', 3, ['musket', 'crossbow', 'armsman', 'revolver']);
        addUpgrades('marksman', 3, ['deadeye', 'nimrod', 'revolver', 'fork']);
        addUpgrades('gatlingGun', 3, ['sprayer_RG', 'accurator', 'halfNHalf']);

    addUpgrades('machineGun', 2, ['artillery', 'minigun', 'gunner', 'sprayer']);
        addUpgrades('artillery', 3, ['mortar', 'ordnance', 'beekeeper', 'fieldGun']);
        //addUpgrades('minigun', 3, []);
        //addUpgrades('gunner', 3, []);
        addUpgrades('sprayer', 3, ['redistributor', 'phoenix', 'atomizer', 'focal']);
        addUpgrades('blaster', 3, ['triBlaster', 'splasher']);
        //addUpgrades('gatlingGun', 3, []);
        addUpgrades('machineFlank', 3, ['machineTriple', 'halfNHalf']);

    addUpgrades('flankGuard', 2, ['hexaTank', 'triAngle', 'auto3', 'trapGuard', 'triTrapper']);
        addUpgrades('flankGuard', 3, ['tripleTwin', 'quadruplex']);
        //addUpgrades('hexaTank', 3, []);
        addUpgrades('triAngle', 3, ['fighter', 'booster', 'falcon', 'bomber', 'autoTriAngle', 'surfer', 'eagle', 'phoenix', 'vulture']);
        addUpgrades('auto3', 3, ['auto5', 'mega3', 'auto4', 'banshee']);
        addUpgrades('trapGuard', 3, ['bushwhacker', 'gunnerTrapper', 'bomber', 'conqueror', 'bulwark']);
        addUpgrades('triTrapper', 3, ['fortress', 'hexaTrapper', 'septaTrapper', 'architect']);

    addUpgrades('director', 2, ['overseer', 'cruiser', 'underseer', 'spawner']);
        addUpgrades('director', 3, ['manager', 'bigCheese']);
        addUpgrades('overseer', 3, ['overlord', 'overtrapper', 'overgunner', 'banshee', 'autoOverseer', 'overdrive', 'commander']);
        addUpgrades('cruiser', 3, ['carrier', 'battleship', 'fortress', 'autoCruiser', 'commander']);
        addUpgrades('underseer', 3, ['necromancer', 'maleficitor', 'infestor']);
        addUpgrades('spawner', 3, ['factory', 'autoSpawner']);

    addUpgrades('pounder', 2, ['destroyer', 'builder', 'artillery', 'launcher']);
        addUpgrades('pounder', 3, ['shotgun', 'eagle']);
        addUpgrades('destroyer', 3, ['conqueror', 'annihilator', 'hybrid', 'construct']);
        addUpgrades('builder', 3, ['construct', 'autoBuilder', 'engineer', 'boomer', 'assembler', 'architect', 'conqueror']);
        //addUpgrades('artillery', 3, []);
        addUpgrades('launcher', 3, ['skimmer', 'twister', 'swarmer', 'sidewinder', 'fieldGun']);

    addUpgrades('trapper', 2, ['builder', 'triTrapper', 'trapGuard']);
        addUpgrades('trapper', 3, ['barricade', 'overtrapper']);
        //addUpgrades('builder', 3, []);
        //addUpgrades('triTrapper', 3, []);
        //addUpgrades('trapGuard', 3, []);
        addUpgrades('autoTrapper', 3, ['autoBuilder', 'hexaTrapper', 'autoTrapGuard']);

    addUpgrades('desmos', 2, ['helix']);
        addUpgrades('volute', 3, ['sidewinder']);
        //addUpgrades('helix', 3, []);
        addUpgrades('spiral', 3, ['coil', 'python']);
        addUpgrades('undertow', 3, []);
        addUpgrades('repeater', 3, ['iterator', 'duplicator']);

    addUpgrades('flail', 2, ['doubleFlail', 'mace', 'flangle']);
        addUpgrades('doubleFlail', 3, ['tripleFlail']);
        addUpgrades('mace', 3, ['bigMama', 'itHurtsDontTouchIt', 'flace']);
        addUpgrades('flangle', 3, ['flooster', 'flace']);

    addUpgrades('whirlwind', 2, ['tornado', 'hurricane']);
        addUpgrades('whirlwind', 3, ['hexaWhirl', 'munition', 'whirl3', 'whirlGuard', 'prophet', 'vortex']);
        addUpgrades('tornado', 3, ['megaTornado', 'tempest', 'thunderbolt']);
        addUpgrades('hurricane', 3, ['typhoon', 'blizzard']);

if (Config.retrograde) {
    addUpgrades('machineGun', 2, ['blaster', 'gatlingGun', 'machineFlank']);
    addUpgrades('sniper', 2, ['gatlingGun']);

    addUpgrades('hexaTank', 3, ['tornado_AR']);
    addUpgrades('tripleShot', 3, ['triBlaster']);
};

if (Config.arms_race || Config.retrograde) {
    addUpgrades('assassin', 3, ['buttbuttin']);
    addUpgrades('destroyer', 3, ['blower']);
    addUpgrades('gunner', 3, ['battery']);
    addUpgrades('hexaTank', 3, ['deathStar']);
    addUpgrades('minigun', 3, ['subverter']);
    addUpgrades('smasher', 3, ['bonker']);
};

if (Config.arms_race) {
    removeUpgrades('basic', 1, ['desmos']);

    removeUpgrades('machineGun', 2, ['sprayer']);
    removeUpgrades('sniper', 2, ['marksman']);
    removeUpgrades('twin', 2, ['helix']);

    removeUpgrades('assassin', 3, ['single', 'deadeye']);
    removeUpgrades('builder', 3, ['assembler']);
    removeUpgrades('flankGuard', 3, ['quadruplex']);
    removeUpgrades('healer', 3, ['ambulance', 'surgeon', 'paramedic']);
    removeUpgrades('hunter', 3, ['xHunter', 'nimrod']);
    removeUpgrades('minigun', 3, ['vulture']);
    removeUpgrades('overseer', 3, ['overtrapper', 'overgunner']);
    removeUpgrades('rifle', 3, ['revolver']);
    removeUpgrades('sprayer', 3, Class.sprayer.UPGRADES_TIER_3);
    removeUpgrades('triAngle', 3, ['phoenix', 'vulture']);
    removeUpgrades('tripleShot', 3, ['triplex']);
    removeUpgrades('director', 3, ['bigCheese']);
    removeUpgrades('twin', 3, ['bulwark']);

    addUpgrades('basic', 1, []);
        addUpgrades('basic', 2, []);
            addUpgrades('basic', 3, ['single']);

            addUpgrades('healer', 3, [/*'scientist', 'nurse', 'triHealer', 'analyzer', 'psychiatrist', 'soother'*/]);
                addUpgrades('healer', tier4_AR, [/*'renovater', 'physician'*/]);
                addUpgrades('medic', tier4_AR, [/*'intern', 'ointment', 'injection', 'actuary'*/]);
            ////addUpgrades('scientist', tier4_AR, ['surgeon'/*, 'professor', 'chemist'*/]);
            ////addUpgrades('nurse', tier4_AR, ['paramedic'/*, 'therapist', 'clinician'*/]);
            ////addUpgrades('triHealer', tier4_AR, ['ambulance'/*, 'healer3', 'hexaHealer', 'chemist'*/]);
            ////addUpgrades('analyzer', tier4_AR, [/*'accountant', 'clerk', 'guru'*/]);
            ////addUpgrades('psychiatrist', tier4_AR, [/*'therapist', 'guru', 'actuary'*/]);
            ////addUpgrades('soother', tier4_AR, [/*'doctor', 'antidote', 'medicare'*/]);

            addUpgrades('smasher', 3, [/*'banger', 'drifter'*/]);
                addUpgrades('megaSmasher', tier4_AR, []);
                addUpgrades('spike', tier4_AR, []);
                addUpgrades('autoSmasher', tier4_AR, []);
                addUpgrades('landmine', tier4_AR, []);
                addUpgrades('bonker', tier4_AR, []);
            ///addUpgrades('banger', tier4_AR, []);
            ///addUpgrades('drifter', tier4_AR, []);

        addUpgrades('twin', 2, ['wark']);
            addUpgrades('twin', 3, []);
                addUpgrades('twin', tier4_AR, [/*'duo'*/]);
                addUpgrades('dual', tier4_AR, [/*'threefold', */'doubleDual', 'ravisher'/*, 'vulture_AR', 'nimrod_AR'*/, 'autoDual'/*, 'bifold', 'dyadic'*/]);
                addUpgrades('musket', tier4_AR, ['doubleMusket'/*, 'flintlock', 'arbalest'*/, 'matchlock', 'autoMusket'/*, 'duelist', 'bifold'*/]);

            addUpgrades('doubleTwin', 3, ['doubleFlankTwin', 'doubleGunner', 'warkwark']);
                addUpgrades('doubleTwin', tier4_AR, ['doubleDual', 'doubleMusket', 'overdoubleTwin']);
                addUpgrades('tripleTwin', tier4_AR, ['quadTwin', 'autoTriple', 'bentTriple', 'hewnTriple', 'tripleFlankTwin', 'tripleGunner', 'warkwarkwark']);
                addUpgrades('hewnDouble', tier4_AR, ['hewnTriple', 'autoHewnDouble', 'cleft', 'skewnDouble', 'hewnFlankDouble'/*, 'hewnGunner', 'warkwawarkrk'*/]);
                addUpgrades('autoDouble', tier4_AR, ['megaAutoDouble', 'tripleAutoDouble', 'autoTriple', 'autoHewnDouble', 'autoBentDouble', 'autoDoubleFlank', 'autoDoubleGunner', 'autoWarkwark']);
                addUpgrades('bentDouble', tier4_AR, ['bentTriple', 'flexedDouble', 'autoBentDouble', 'doubleTriplet', 'cleft'/*, 'doubleSpreadshot', 'bentFlankDouble', 'bentDoubleGunner', 'bentDoubleMinigun', 'splitDouble', 'waarrkwaarrk'*/]);
                addUpgrades('doubleFlankTwin', tier4_AR, ['quadTwin', 'tripleFlankTwin', 'hewnFlankDouble', 'autoDoubleFlank'/*, 'bentFlankDouble', 'doubleFlankGunner', 'hipwatch', 'scuffler', 'warkwawawark'*/]);
                addUpgrades('doubleGunner', tier4_AR, ['tripleGunner'/*, 'hewnGunner'*/, 'autoDoubleGunner'/*, 'bentDoubleGunner', 'doubleFlankGunner'*/, 'doubleNailgun', 'doubleMachineGunner'/*, 'overdoubleGunner*/, 'doubleBattery', 'doubleRimfire'/*, 'doubleVolley', 'doubleEqualizer'*/]);
                addUpgrades('warkwark', tier4_AR, ['warkwarkwark'/*, 'warkwawarkrk'*/, 'autoWarkwark'/*, 'waarrkwaarrk', 'warkwawawark', 'doubleEqualizer', 'guardrail', 'sealer', 'setup'*/]);

            addUpgrades('tripleShot', 3, [/*'splitShot', */'autoTripleShot'/*, 'bentGunner', 'bentMinigun'*/, 'defect'/*, 'waarrk'*/]);
                addUpgrades('tripleShot', tier4_AR, []);
                addUpgrades('pentaShot', tier4_AR, []);
                addUpgrades('spreadshot', tier4_AR, []);
                addUpgrades('bentHybrid', tier4_AR, ['flexedHybrid', 'smearer'/*, 'splitHybrid'*/, 'autoBentHybrid'/*, 'spambrid', 'junker'*/, 'triprid'/*, 'bentCatcher'*/]);
                //addUpgrades('bentDouble', tier4_AR);
                addUpgrades('triplet', tier4_AR, []);
            ////addUpgrades('splitShot', tier4_AR, []);
                addUpgrades('autoTripleShot', tier4_AR, []);
            ////addUpgrades('bentGunner', tier4_AR, []);
            ////addUpgrades('bentMinigun', tier4_AR, []);
                addUpgrades('defect', tier4_AR, []);
            ////addUpgrades('waarrk', tier4_AR, []);

            addUpgrades('gunner', 3, ['buttbuttin', 'blower', 'rimfire'/*, 'volley'*/, 'doubleGunner'/*, 'bentGunner', 'equalizer'*/]);
                addUpgrades('gunner', tier4_AR, ['dam']);
                addUpgrades('autoGunner', tier4_AR, []);
                addUpgrades('nailgun', tier4_AR, []);
                addUpgrades('auto4', tier4_AR, []);
                addUpgrades('machineGunner', tier4_AR, []);
                addUpgrades('gunnerTrapper', tier4_AR, []);
                addUpgrades('cyclone', tier4_AR, ['tornado_AR', 'dustStorm', 'autoCyclone', 'tempest_AR', 'gale', 'whirlwind_AR', 'trove']);
                addUpgrades('overgunner', tier4_AR, []);
                addUpgrades('battery', tier4_AR, []);
                addUpgrades('buttbuttin', tier4_AR, [/*'baton', */'marine', 'harpy', 'tailer'/*, 'fang', 'barber'*/, 'mercenary', 'autoButtbuttin'/*, 'armament', 'sifter'*/]);
                addUpgrades('blower', tier4_AR, []);
                addUpgrades('rimfire', tier4_AR, []);
            ////addUpgrades('volley', tier4_AR, []);
                //addUpgrades('doubleGunner', tier4_AR);
            ////addUpgrades('bentGunner', tier4_AR, []);
            ////addUpgrades('equalizer', tier4_AR, []);

            addUpgrades('hexaTank', 3, ['autoHexaTank', 'mingler', 'combo']);
                addUpgrades('hexaTank', tier4_AR, ['tripleFlankTwin']);
                addUpgrades('octoTank', tier4_AR, ['decaTank', 'tempest_AR', 'gale', 'octoTrapper', 'demise', 'autoOctoTank', 'consolidation']);
                addUpgrades('hexaTrapper', tier4_AR, [...['mega', 'auto'].map(x => `${x}HexaTrapper`), 'hexaMachine', 'octoTrapper', 'designer', 'cozen', 'refuge', 'coop', 'hexaMech', 'hexaTrapGuard', 'band']);
                //addUpgrades('cyclone', tier4_AR);
                addUpgrades('deathStar', tier4_AR, ['demise', 'designer', 'orbitalStrike', 'autoDeathStar', 'unity', 'sequence']);
                addUpgrades('autoHexaTank', tier4_AR, ['OctoTank', 'Cyclone', 'DeathStar', 'Mingler', 'Combo'].map(x => `auto${x}`));
                addUpgrades('mingler', tier4_AR, ['unity', 'alloy', 'gale', 'cozen', 'autoMingler']);
                addUpgrades('combo', tier4_AR, ['consolidation', 'sequence', 'trove', 'alloy', 'autoCombo', 'band']);

            addUpgrades('wark', 3, ['warkwark'/*, 'waarrk', 'equalizer'*/, 'hexaTrapper'/*, 'hutch', 'cog', 'expeller'*/, 'bulwark', 'coalesce', 'autoWark']);
                addUpgrades('wark', tier4_AR, []);
                //addUpgrades('warkwark', tier4_AR);
                //addUpgrades('waarrk', tier4_AR);
                //addUpgrades('equalizer', tier4_AR);
                //addUpgrades('hexaTrapper', tier4_AR);
            ////addUpgrades('hutch', tier4_AR, []);
            ////addUpgrades('cog', tier4_AR, []);
            ////addUpgrades('expeller', tier4_AR, []);
                addUpgrades('bulwark', tier4_AR, []);
                addUpgrades('coalesce', tier4_AR, []);
                addUpgrades('autoWark', tier4_AR, []);

        addUpgrades('sniper', 2, []);
            addUpgrades('sniper', 3, ['railgun']);
                addUpgrades('sniper', tier4_AR, [/*'sharpshooter'*/]);
                addUpgrades('bushwhacker', tier4_AR, []);
                addUpgrades('railgun', tier4_AR, []);

            addUpgrades('assassin', 3, ['hitman', 'sniper3'/*, 'enforcer', 'courser'*/]);
                addUpgrades('assassin', tier4_AR, [/*'executor', 'finger'*/]);
                addUpgrades('ranger', tier4_AR, []);
                addUpgrades('falcon', tier4_AR, []);
                addUpgrades('stalker', tier4_AR, []);
                addUpgrades('autoAssassin', tier4_AR, []);
                //addUpgrades('buttbuttin', tier4_AR);
                addUpgrades('hitman', tier4_AR, []);
                addUpgrades('sniper3', tier4_AR, []);
            ////addUpgrades('enforcer', tier4_AR, []);
            ////addUpgrades('courser', tier4_AR, []);

            addUpgrades('hunter', 3, ['autoHunter'/*, 'megaHunter', 'prober', 'courser'*/]);
                addUpgrades('hunter', tier4_AR, [/*'butcher', 'reverberator'*/]);
                addUpgrades('predator', tier4_AR, []);
                addUpgrades('poacher', tier4_AR, []);
                addUpgrades('ordnance', tier4_AR, []);
                addUpgrades('dual', tier4_AR, []);
                addUpgrades('autoHunter', tier4_AR, []);
            ////addUpgrades('megaHunter', tier4_AR, []);
            ////addUpgrades('prober', tier4_AR, []);
                //addUpgrades('courser', tier4_AR);

            addUpgrades('minigun', 3, [/*'taser', 'zipper', 'bentMinigun', */'autoMinigun'/*, 'widget'*/]);
                addUpgrades('minigun', tier4_AR, [/*'tommy', 'machgun'*/]);
                addUpgrades('streamliner', tier4_AR, []);
                addUpgrades('nailgun', tier4_AR, []);
                addUpgrades('cropDuster', tier4_AR, []);
                addUpgrades('barricade', tier4_AR, []);
                addUpgrades('subverter', tier4_AR, []);
            ////addUpgrades('taser', tier4_AR, []);
            ////addUpgrades('zipper', tier4_AR, []);
            ////addUpgrades('bentMinigun', tier4_AR, []);
                addUpgrades('autoMinigun', tier4_AR, []);
            ////addUpgrades('widget', tier4_AR, []);

            addUpgrades('rifle', 3, ['autoRifle'/*, 'enforcer', 'courser'*/]);
                addUpgrades('rifle', tier4_AR, ['ransacker'/*, 'thunderclap'*/]);
                addUpgrades('musket', tier4_AR, []);
                addUpgrades('crossbow', tier4_AR, []);
                addUpgrades('armsman', tier4_AR, []);
                addUpgrades('autoRifle', tier4_AR, []);
                //addUpgrades('enforcer', tier4_AR);
                //addUpgrades('courser', tier4_AR);

        addUpgrades('machineGun', 2, ['diesel', 'machineTrapper']);
            addUpgrades('machineGun', 3, ['sprayer']);
                addUpgrades('machineGun', tier4_AR, [/*'gadgetGun'*/]);
                addUpgrades('sprayer', tier4_AR, [/*'duster', 'frother', */'scatterer'/*, 'foamer'*/, 'shower', 'autoSprayer', 'phoenix']);

            addUpgrades('artillery', 3, [/*'queller', 'forger', */'force', 'autoArtillery'/*, 'foctillery', 'discharger'*/]);
                addUpgrades('artillery', tier4_AR, [/*'blare', 'erne'*/]);
                addUpgrades('mortar', tier4_AR, []);
                addUpgrades('ordnance', tier4_AR, []);
                addUpgrades('beekeeper', tier4_AR, []);
                addUpgrades('fieldGun', tier4_AR, []);
            ////addUpgrades('queller', tier4_AR, []);
            ////addUpgrades('forger', tier4_AR, []);
                addUpgrades('force', tier4_AR, []);
                addUpgrades('autoArtillery', tier4_AR, []);
            ////addUpgrades('foctillery', tier4_AR, []);
            ////addUpgrades('discharger', tier4_AR, []);

            //addUpgrades('minigun', 3);

            //addUpgrades('gunner', 3);

            addUpgrades('diesel', 3, ['jalopy', 'machineGunner'/*, 'dieselTrapper'*/, 'polluter', 'autoDiesel']);
                addUpgrades('diesel', tier4_AR, [/*'foamer', 'gizmo'*/]);
                addUpgrades('jalopy', tier4_AR, [/*'lorry', */'contaminator'/*, 'jalopyTrapper'*/, 'autoJalopy'/*, 'clunker'*/]);
                //addUpgrades('machineGunner', tier4_AR);
            ////addUpgrades('dieselTrapper', tier4_AR, []);
                addUpgrades('polluter', tier4_AR, []);
                addUpgrades('autoDiesel', tier4_AR, []);

            addUpgrades('machineTrapper', 3, [/*'dieselTrapper', */'barricade'/*, 'equalizer', 'machineGuard', 'encircler', 'machineMech', 'triMachine', 'expeller', 'autoMachineTrapper', 'deviation'*/]);
                addUpgrades('machineTrapper', tier4_AR, [/*'frother', 'machineMegaTrapper'*/]);
                //addUpgrades('dieselTrapper', tier4_AR, []);
                //addUpgrades('barricade', tier4_AR);
                //addUpgrades('equalizer', tier4_AR);
            ////addUpgrades('machineGuard', tier4_AR, []);
            ////addUpgrades('encircler', tier4_AR, []);
            ////addUpgrades('machineMech', tier4_AR, []);
            ////addUpgrades('triMachine', tier4_AR, []);
            ////addUpgrades('expeller', tier4_AR, []);
            ////addUpgrades('autoMachineTrapper', tier4_AR, []);
            ////addUpgrades('deviation', tier4_AR, []);

        addUpgrades('flankGuard', 2, []);
            addUpgrades('flankGuard', 3);
                addUpgrades('flankGuard', tier4_AR, [/*'ternion'*/]);
                //addUpgrades('tripleTwin', tier4_AR);

            //addUpgrades('hexaTank', 3);

            addUpgrades('triAngle', 3, [/*'taser', 'cockatiel', */'integrator', 'defect'/*, 'quadAngle'*/]);
                addUpgrades('triAngle', tier4_AR, [/*'avian', 'raven', */'phoenix'/*, 'shoebill'*/]);
                addUpgrades('fighter', tier4_AR, []);
                addUpgrades('booster', tier4_AR, []);
                addUpgrades('falcon', tier4_AR, []);
                addUpgrades('bomber', tier4_AR, []);
                addUpgrades('autoTriAngle', tier4_AR, []);
                addUpgrades('surfer', tier4_AR, []);
                addUpgrades('eagle', tier4_AR, []);
            ////addUpgrades('taser', tier4_AR, []);
            ////addUpgrades('cockatiel', tier4_AR, []);
                addUpgrades('integrator', tier4_AR, []);
                addUpgrades('defect', tier4_AR, []);
            ////addUpgrades('quadAngle', tier4_AR, []);

            addUpgrades('auto3', 3, ['sniper3', 'crowbar', 'autoAuto3', 'combo']);
                addUpgrades('auto5', tier4_AR, [/*'auto7', 'mega5', 'auto6', 'spectre', 'sniper5', 'pryer', */'autoAuto5']);
                addUpgrades('mega3', tier4_AR, [/*'ultra3', 'queller3', 'hurler3', 'slinker3', 'mega5', 'volley4', 'spirit', 'crank', */'autoMega3', 'sequence']);
                addUpgrades('auto4', tier4_AR, [/*'auto6', 'batter4', */'autoAuto4'/*, 'wraith', 'volley4', 'chisel'*/, 'trove']);
                addUpgrades('banshee', tier4_AR, [/*'spectre', 'spirit', 'wraith', 'phantom', */'autoBanshee'/*, 'revenant', 'bansheedrive', 'shade'*/]);
                addUpgrades('sniper3', tier4_AR, [/*'assassin3', 'creeper', 'sniper5', 'phantom', 'lever', */'autoSniper3', 'alloy'/*, 'rifle3', 'hunter3'*/]);
                addUpgrades('crowbar', tier4_AR, [/*'pryer', 'crank', 'chisel', 'lever', */'spindle', 'autoCrowbar', 'dualbar'/*, 'spanner'*/, 'wrench']);
                addUpgrades('autoAuto3', tier4_AR, ['Auto5', 'Mega3', 'Auto4', 'Banshee', 'Sniper3', 'Crowbar', 'Combo'].map(x => `auto${x}`));
                //addUpgrades('combo', tier4_AR);

            addUpgrades('trapGuard', 3, ['peashooter'/*, 'incarcerator', 'mechGuard'*/, 'autoTrapGuard'/*, 'machineGuard', 'triTrapGuard'*/]);
                addUpgrades('trapGuard', tier4_AR, [/*'garrison', 'maw', 'overtrapGuard', 'custodian'*/]);
                //addUpgrades('bushwhacker', tier4_AR);
                //addUpgrades('gunnerTrapper', tier4_AR);
                //addUpgrades('bomber', tier4_AR);
                addUpgrades('conqueror', tier4_AR, []);
                //addUpgrades('bulwark', tier4_AR);
                addUpgrades('peashooter', tier4_AR, []);
            ////addUpgrades('incarcerator', tier4_AR, []);
            ////addUpgrades('mechGuard', tier4_AR, []);
                addUpgrades('autoTrapGuard', tier4_AR, []);
            ////addUpgrades('machineGuard', tier4_AR, []);
            ////addUpgrades('triTrapGuard', tier4_AR, []);

            addUpgrades('triTrapper', 3, [/*'triPen', 'triMech', 'triMachine', 'triTrapGuard'*/]);
                addUpgrades('triTrapper', tier4_AR, [/*'triBarricade', 'triMegaTrapper', 'warkwarkwark'*/]);
                addUpgrades('fortress', tier4_AR, []);
                //addUpgrades('hexaTrapper', tier4_AR);
                addUpgrades('septaTrapper', tier4_AR, []);
                addUpgrades('architect', tier4_AR, []);
            ////addUpgrades('triPen', tier4_AR, []);
            ////addUpgrades('triMech', tier4_AR, []);
                //addUpgrades('triMachine', tier4_AR);
                //addUpgrades('triTrapGuard', tier4_AR);

        addUpgrades('director', 2, ['directordrive', 'honcho'/*, 'doper'*/]);
            addUpgrades('director', 3, []);
                addUpgrades('director', tier4_AR, [/*'coordinator'*/]);
                addUpgrades('manager', tier4_AR, []);

            addUpgrades('overseer', 3, ['captain', 'foreman'/*, 'dopeseer'*/]);
                addUpgrades('overseer', tier4_AR, [/*'inspector'*/]);
                addUpgrades('overlord', tier4_AR, []);
                addUpgrades('banshee', tier4_AR, []);
                addUpgrades('autoOverseer', tier4_AR, []);
                addUpgrades('overdrive', tier4_AR, []);
                addUpgrades('commander', tier4_AR, []);
                addUpgrades('captain', tier4_AR, []);
                addUpgrades('foreman', tier4_AR, []);
            ////addUpgrades('dopeseer', tier4_AR, []);

            addUpgrades('cruiser', 3, ['productionist', 'cruiserdrive'/*, 'hangar', 'zipper', 'baltimore', 'mosey'*/]);
                addUpgrades('cruiser', tier4_AR, [/*'superintendent'*/]);
                addUpgrades('carrier', tier4_AR, []);
                addUpgrades('battleship', tier4_AR, []);
                //addUpgrades('fortress', tier4_AR);
                addUpgrades('autoCruiser', tier4_AR, []);
                //addUpgrades('commander', tier4_AR);
                addUpgrades('productionist', tier4_AR, []);
                addUpgrades('cruiserdrive', tier4_AR, []);
            ////addUpgrades('hangar', tier4_AR, []);
                //addUpgrades('zipper', tier4_AR);
            ////addUpgrades('baltimore', tier4_AR, []);
            ////addUpgrades('mosey', tier4_AR, []);

            addUpgrades('underseer', 3, ['autoUnderseer', 'underdrive'/*, 'pentaseer'*/]);
                addUpgrades('underseer', tier4_AR, [/*'conductor'*/]);
                addUpgrades('necromancer', tier4_AR, []);
                addUpgrades('maleficitor', tier4_AR, []);
                addUpgrades('infestor', tier4_AR, []);
                addUpgrades('autoUnderseer', tier4_AR, []);
                addUpgrades('underdrive', tier4_AR, []);
            ////addUpgrades('pentaseer', tier4_AR, []);

            addUpgrades('spawner', 3, ['megaSpawner', 'productionist', 'spawnerdrive', 'captain'/*, 'hangar', 'laborer', 'foundry', 'issuer'*/]);
                addUpgrades('spawner', tier4_AR, [/*'handler'*/]);
                addUpgrades('factory', tier4_AR, []);
                addUpgrades('autoSpawner', tier4_AR, []);
                addUpgrades('megaSpawner', tier4_AR, []);
                //addUpgrades('productionist', tier4_AR);
                addUpgrades('spawnerdrive', tier4_AR, []);
                //addUpgrades('captain', tier4_AR);
                //addUpgrades('hangar', tier4_AR);
            ////addUpgrades('laborer', tier4_AR, []);
            ////addUpgrades('foundry', tier4_AR, []);
            ////addUpgrades('issuer', tier4_AR, []);

            addUpgrades('directordrive', 3, [/*'directorstorm', */'overdrive', 'cruiserdrive', 'underdrive', 'spawnerdrive', 'autoDirectordrive', 'honchodrive'/*, 'doperdrive'*/]);
                addUpgrades('directordrive', tier4_AR, [/*'managerdrive'*/]);
            ////addUpgrades('directorstorm', tier4_AR, []);
                //addUpgrades('overdrive', tier4_AR);
                //addUpgrades('cruiserdrive', tier4_AR);
                //addUpgrades('underdrive', tier4_AR);
                //addUpgrades('spawnerdrive', tier4_AR);
                addUpgrades('autoDirectordrive', tier4_AR, [...['mega', 'triple'].map(x => `${x}AutoDirectordrive`)]);
                addUpgrades('honchodrive', tier4_AR, []);
            ////addUpgrades('doperdrive', tier4_AR, []);

            addUpgrades('honcho', 3, ['foreman'/*, 'baltimore', 'foundry'*/, 'bigCheese', 'autoHoncho', 'honchodrive'/*, 'junkie'*/]);
                addUpgrades('honcho', tier4_AR, [/*'minister'*/]);
                //addUpgrades('foreman', tier4_AR);
                //addUpgrades('baltimore', tier4_AR);
                //addUpgrades('foundry', tier4_AR);
                addUpgrades('bigCheese', tier4_AR, []);
                addUpgrades('autoHoncho', tier4_AR, []);
                //addUpgrades('honchodrive', tier4_AR);
            ////addUpgrades('junkie', tier4_AR, []);

        ////addUpgrades('doper', 3, [/*'brisker', 'dopeseer', 'mosey', 'issuer', 'junkie', 'doperdrive', 'autoDoper'*/]);
            ////addUpgrades('doper', tier4_AR, [/*'controller'*/]);
            ////addUpgrades('brisker', tier4_AR, []);
                //addUpgrades('dopeseer', tier4_AR);
                //addUpgrades('mosey', tier4_AR);
                //addUpgrades('issuer', tier4_AR);
                //addUpgrades('junkie', tier4_AR);
                //addUpgrades('doperdrive', tier4_AR);
            ////addUpgrades('autoDoper', tier4_AR, []);

        addUpgrades('pounder', 2, []);
            addUpgrades('pounder', 3, ['subverter']);
                addUpgrades('pounder', tier4_AR, [/*'bruiser'*/]);
                addUpgrades('shotgun', tier4_AR, []);
                //addUpgrades('eagle', tier4_AR);
                //addUpgrades('subverter', tier4_AR);

            addUpgrades('destroyer', 3, [/*'megaTrapper', 'queller', */'autoDestroyer'/*, 'hurler', 'slinker'*/]);
                addUpgrades('destroyer', tier4_AR, [/*'harrier', 'toppler'*/]);
                //addUpgrades('conqueror', tier4_AR);
                addUpgrades('annihilator', tier4_AR, []);
                addUpgrades('hybrid', tier4_AR, []);
                addUpgrades('construct', tier4_AR, []);
                //addUpgrades('blower', tier4_AR);
            ////addUpgrades('megaTrapper', tier4_AR, []);
                //addUpgrades('queller', tier4_AR);
                addUpgrades('autoDestroyer', tier4_AR, []);
            ////addUpgrades('hurler', tier4_AR, []);
            ////addUpgrades('slinker', tier4_AR, []);

            addUpgrades('builder', 3, [/*'forger', 'stall', */'fashioner'/*, 'charger'*/]);
                addUpgrades('builder', tier4_AR, [/*'blockade'*/]);
                //addUpgrades('construct', tier4_AR);
                addUpgrades('autoBuilder', tier4_AR, []);
                addUpgrades('engineer', tier4_AR, []);
                addUpgrades('boomer', tier4_AR, []);
                //addUpgrades('architect', tier4_AR);
                //addUpgrades('conqueror', tier4_AR);
                //addUpgrades('forger', tier4_AR);
            ////addUpgrades('stall', tier4_AR, []);
                addUpgrades('fashioner', tier4_AR, []);
            ////addUpgrades('charger', tier4_AR, []);

            //addUpgrades('artillery', 3, []);

            addUpgrades('launcher', 3, ['rocketeer'/*, 'pitcher', 'cluster', 'projector'*/, 'heaver', 'autoLauncher'/*, 'hurler', 'inception'*/]);
                addUpgrades('launcher', tier4_AR, [/*'seriemas', 'supplant', 'pumper'*/]);
                addUpgrades('skimmer', tier4_AR, []);
                addUpgrades('twister', tier4_AR, []);
                addUpgrades('swarmer', tier4_AR, []);
                addUpgrades('sidewinder', tier4_AR, []);
                //addUpgrades('fieldGun', tier4_AR);
                addUpgrades('rocketeer', tier4_AR, []);
            ////addUpgrades('pitcher', tier4_AR, []);
            ////addUpgrades('cluster', tier4_AR, []);
            ////addUpgrades('projector', tier4_AR, []);
                addUpgrades('heaver', tier4_AR, []);
                addUpgrades('autoLauncher', tier4_AR, []);
            ////addUpgrades('hurler', tier4_AR, []);
            ////addUpgrades('inception', tier4_AR, []);

        addUpgrades('trapper', 2, ['pen', 'mech', 'machineTrapper', 'wark']);
            addUpgrades('trapper', 3, [/*'megaTrapper'*/]);
                addUpgrades('trapper', tier4_AR, [/*'tricker'*/]);
                //addUpgrades('barricade', tier4_AR);
                addUpgrades('overtrapper', tier4_AR, ['battletrapper', 'captrapper', 'foretrapper']);
                //addUpgrades('megaTrapper', tier4_AR);

            //addUpgrades('builder', 3);

            //addUpgrades('triTrapper', 3);

            //addUpgrades('trapGuard', 3);

            addUpgrades('pen', 3, [/*'stall', 'triPen', 'encircler', 'incarcerator', 'operator', 'cockatiel', 'hutch', */'interner', 'autoPen']);
                addUpgrades('pen', tier4_AR, [/*'fortifier', 'sty'*/]);
                //addUpgrades('stall', tier4_AR, []);
                //addUpgrades('triPen', tier4_AR, []);
                //addUpgrades('encircler', tier4_AR, []);
                //addUpgrades('incarcerator', tier4_AR, []);
            ////addUpgrades('operator', tier4_AR, []);
                //addUpgrades('cockatiel', tier4_AR, []);
                //addUpgrades('hutch', tier4_AR, []);
            ////addUpgrades('interner', tier4_AR, []);
            ////addUpgrades('autoPen', tier4_AR, []);

            addUpgrades('mech', 3, ['engineer'/*, 'triMech', 'machineMech', 'mechGuard', 'operator', 'cog'*/, 'cobbler', 'autoMech']);
                addUpgrades('mech', tier4_AR, [/*'propper', 'technician'*/]);
                //addUpgrades('engineer', tier4_AR);
                //addUpgrades('triMech', tier4_AR);
                //addUpgrades('machineMech', tier4_AR);
                //addUpgrades('mechGuard', tier4_AR);
                //addUpgrades('operator', tier4_AR);
                //addUpgrades('cog', tier4_AR);
            ////addUpgrades('cobbler', tier4_AR);
            ////addUpgrades('autoMech', tier4_AR);

            //addUpgrades('machineTrapper', 3);

            //addUpgrades('wark', 3);

            addUpgrades('autoTrapper', 3, [/*'autoPen', 'autoMech', 'autoMachineTrapper', */'autoWark']);
                addUpgrades('megaAutoTrapper', tier4_AR, ['AutoBuilder', 'HexaTrapper', 'AutoTrapGuard'/*, 'AutoPen', 'AutoMech', 'AutoMachineTrapper'*/, 'AutoWark'].map(x => `mega${x}`));
                addUpgrades('tripleAutoTrapper', tier4_AR, ['tripleAutoBuilder', 'autoHexaTrapper', 'tripleAutoTrapGuard'/*, 'tripleAutoPen', 'tripleAutoMech', 'tripleAutoMachineTrapper'*/, 'tripleAutoWark']);
                //addUpgrades('autoBuilder', tier4_AR);
                //addUpgrades('hexaTrapper', tier4_AR);
                //addUpgrades('autoTrapGuard', tier4_AR);
                //addUpgrades('autoPen', tier4_AR);
                //addUpgrades('autoMech', tier4_AR);
                //addUpgrades('autoMachineTrapper', tier4_AR);
                //addUpgrades('autoWark', tier4_AR);
};

if (Config.teams == 1) {
    addUpgrades('basic', 2, ['healer']);
    removeUpgrades('basic', 2, ['smasher']);
    removeUpgrades('director', 2, ['underseer']);

    removeUpgrades('directordrive', 3, ['underdrive']);
    removeUpgrades('whirlwind', 3, ['prophet']);
};
