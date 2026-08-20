const {combineStats, dereference, makeFlank, makeMenu, makeTurret, weaponArray, weaponMirror} = require('../../facilitators.js')
const {base, smshskl, statnames} = require('../../constants.js')
const g = require('../../gunvals.js')
g.droneSizeOffset = {size: 2}
g.trapSizeOffset = {size: 1.5}
g.streamSizeOffset = {size: 0.875}
g.swarmSizeOffset = {size: 1.5}

// LEGAL DISCLAIMER
// - All tank and boss stats were sourced from diepcustom, which is licensed under GNU AGPLv3. (https://github.com/abcxff/diepcustom)
// - This addon DOES NOT use any other code from diepcustom or diep.io.

// Settings
const split_predator = false // Splits Predator into X Hunter (predator with no zoom) and OG Predator (hunter with zoom).
const tenth_birthday = false // Adds extra tanks from the 10th Birthday event.

// Settings (Extra Tanks)
const havre_tanks = false // Adds tanks from havre.io to the class tree.

// Menu/Generics
Class.arrasMenu_diep.UPGRADES_TIER_0.push("tank_diep")
Class.menu_addons.UPGRADES_TIER_0.push("menu_diep")
Class.menu_diep = makeMenu("Diep", {upgrades: ["tank_diep", "id53_diep", "guardian_diep", "defender_diep"]})
Class.diep = {PARENT: 'genericTank', REROOT_UPGRADE_TREE: "tank_diep"}
Class.diepSmasher = {PARENT: "genericSmasher", REROOT_UPGRADE_TREE: "tank_diep"}
if (Config.diep) {Config.spawn_class = "tank_diep"}

// Functions
const makeAuto = (type, name = -1, options = {}) => {

    /*
    - type: what turret (or regular Class) to use as the mounted turret

    Available options:
    - color: turret body color
    - size: turret size
    - x: turret X position
    - y: turret Y position
    - angle: turret offset angle
    - arc: turret FOV arc
    - layer: turret layer
    - total: number of turrets
    - independent: whether the turret ignores parent tank inputs
    - clearProps: whether to clear the parent tank's existing props or not (recommended for -drive tanks)
    - clearTurrets: whether to clear the parent tank's existing turrets or not
    */

    type = ensureIsClass(type);
    let output = dereference(type);
    let autogun = weaponArray({
        POSITION: {
            SIZE: options.size ??= 9,
            ANGLE: options.angle ??= 180,
            X: options.x ??= 0,
            Y: options.y ??= 0,
            ARC: options.arc ??= 360,
            LAYER: options.layer ??= 1
        },
        TYPE: [
            options.type ??= "mountedTurret_diep",
            {
                CONTROLLERS: ["nearestDifferentMaster"],
                INDEPENDENT: options.independent ??= true,
                COLOR: options.color ??= "grey"
            }
        ]
    }, options.total ??= 1);
    if (type.GUNS != null) {
        output.GUNS = type.GUNS;
    }
    if (type.PROPS == null || options.clearProps) {
        output.PROPS = [];
    } else {
        output.PROPS = [...type.PROPS];
    }
    if (type.TURRETS == null || options.clearTurrets) {
        output.TURRETS = [...autogun];
    } else {
        output.TURRETS = [...type.TURRETS, ...autogun];
    }
    if (name == -1) {
        output.LABEL = "Auto " + type.LABEL;
        if (type.UPGRADE_LABEL !== undefined) {
            output.UPGRADE_LABEL = "Auto " + type.LABEL;
        }
    } else {
        output.LABEL = name;
        if (type.UPGRADE_LABEL !== undefined) {
            output.UPGRADE_LABEL = name;
        }
    }
    output.DANGER = type.DANGER + 1;
    return output;
}
const makeRadialAuto = (type, options = {}) => {

    /*
    - type: what turret (or regular Class) to use as the radial auto

    Available options:
    - count: number of turrets
    - isTurret: whether or not the `type` is a turret already (if this option is `false`, the `type` is assumed to
        not be a turret and the faciliator will create a new turret modeled after the `type`)
    - extraStats: extra stats to append to all turret barrels, on top of g.autoTurret
    - turretIdentifier: Class[turretIdentifier] to refer to the turret in other uses if necessary
    - size: turret size
    - x: turret X
    - arc: turret FOV arc
    - angle: turret ring offset angle
    - label: label of the final tank
    - rotation: rotation speed of the final tank
    - danger: danger value of the final tank
    - body: body stats of the final tank
    */

    let count = options.count ?? 3;
    let isTurret = options.isTurret ?? false;
    let turretIdentifier = type;
    let noRecoil = options.noRecoil ?? false;

    if (!isTurret) {
        type = dereference(type);

        let extraStats = options.extraStats ?? [];
        if (!Array.isArray(extraStats)) {
            extraStats = [extraStats];
        }
        turretIdentifier = options.turretIdentifier ?? `auto${type.LABEL}Gun`;

        Class[turretIdentifier] = {
            PARENT: 'diep',
            LABEL: "",
            BODY: {
                FOV: 2,
            },
            CONTROLLERS: ["canRepel", "onlyAcceptInArc", "mapAltToFire", "nearestDifferentMaster"],
            COLOR: "grey",
            GUNS: type.GUNS,
            TURRETS: type.TURRETS,
            PROPS: type.PROPS,
        }

        for (let gun of Class[turretIdentifier].GUNS) {
            if (!gun.PROPERTIES) continue;
            if (!gun.PROPERTIES.SHOOT_SETTINGS) continue;

            gun.PROPERTIES.SHOOT_SETTINGS = combineStats([gun.PROPERTIES.SHOOT_SETTINGS, g.autoTurret, ...extraStats])
        }
    }

    let LABEL = options.label ?? (type.LABEL + "-" + count);
    let HAS_NO_RECOIL = options.noRecoil ?? false;
    let turretSize = options.size ?? 10;
    let turretX = options.x ?? 8;
    let turretArc = options.arc ?? 190;
    let turretAngle = options.angle ?? 0;

    return {
        PARENT: 'diep',
        LABEL,
        HAS_NO_RECOIL,
        FACING_TYPE: ["spin", {speed: options.rotation ?? 0.02}],
        DANGER: options.danger ?? (type.DANGER + 2),
        BODY: options.body ?? undefined,
        TURRETS: weaponArray({
            POSITION: [turretSize, turretX, 0, turretAngle, turretArc, 0],
            TYPE: turretIdentifier
        }, count)
    }
}
const diep2arras = (pos) => { // stolen from woomy
    let borderWidth = 5; // Very specific value
    let scale = 100 / (100 - borderWidth) * 20 / 100;
    let tau = 2 * Math.PI
    let isTrapezoid = pos.isTrapezoid ?? false

    if (pos.aspect) {
        aspect = pos.aspect
    } else if (isTrapezoid && !pos.invertAspect) {
        aspect = 1.75
    } else if (isTrapezoid && pos.invertAspect) {
        aspect = -1.75
    } else {
        aspect = 1
    }

    return {
        LENGTH: (pos.size - borderWidth / 2) * scale,
        WIDTH: (pos.width - borderWidth) * scale,
        ASPECT: aspect ?? 1,
        X: (pos.distance * scale) ?? 0,
        Y: (pos.offset * scale) ?? 0,
        ANGLE: ((pos.angle / tau) * 360) ?? 0,
        DELAY: pos.delay ?? 0
    }
}

// Projectiles
Class.missile_diep = {
    PARENT: "missile",
    GUNS: weaponMirror({
        POSITION: [14, 6, 1, 0, 2, 230, 0],
        PROPERTIES: {
            AUTOFIRE: true,
            SHOOT_SETTINGS: combineStats([g.basic, g.lowPower, {speed: 1.3, maxSpeed: 1.3}]),
            TYPE: [ "bullet", { PERSISTS_AFTER_DEATH: true } ],
            STAT_CALCULATOR: "thruster",
            WAIT_TO_CYCLE: true,
            COLOR: "mirror"
        }
    })
}
Class.spinmissile_diep = {
    PARENT: "missile",
    FACING_TYPE: ["spin", {speed: 0.2}],
    GUNS: weaponArray({
        POSITION: [14, 6, 1, 0, 0, 0, 0.5],
        PROPERTIES: {
            AUTOFIRE: true,
            SHOOT_SETTINGS: combineStats([g.basic, g.lowPower, {reload: 0.6, size: 1.1, shudder: 0.3}]),
            TYPE: ["bullet", { PERSISTS_AFTER_DEATH: true }],
            STAT_CALCULATOR: "thruster",
            WAIT_TO_CYCLE: true,
            COLOR: "mirror"
        }
    }, 2)
}
Class.cycloneMissile_diep = {
    PARENT: "missile",
    FACING_TYPE: ["spin", {speed: 0.2}],
    GUNS: weaponArray({
        POSITION: [14, 6, 1, 0, 0, 0, 0.5],
        PROPERTIES: {
            AUTOFIRE: true,
            SHOOT_SETTINGS: combineStats([g.basic, g.lowPower, {reload: 0.6, size: 1.1, shudder: 0.3}]),
            TYPE: ["bullet", { PERSISTS_AFTER_DEATH: true }],
            STAT_CALCULATOR: "thruster",
            WAIT_TO_CYCLE: true,
            COLOR: "mirror"
        }
    }, 4)
}
Class.rocket_diep = {
    PARENT: "missile",
    GUNS: [
        {
            POSITION: [16.5, 10, 1.5, 0, 0, 180, 3],
            PROPERTIES: {
                AUTOFIRE: true,
                SHOOT_SETTINGS: combineStats([g.basic, g.missileTrail, g.rocketeerMissileTrail]),
                TYPE: ["bullet", { PERSISTS_AFTER_DEATH: true }],
                STAT_CALCULATOR: "thruster",
                COLOR: "mirror"
            },
        },
    ],
}

// Turrets
Class.mountedTurret_diep = makeTurret({
    GUNS: [
        {
            POSITION: diep2arras({
                size: 110,
                width: 50.4
            }),
            PROPERTIES: {
                SHOOT_SETTINGS: combineStats([g.basic, g.pelleter, g.power, { recoil: 1.15 }, g.turret]),
                TYPE: "bullet",
            },
        },
    ],
}, {label: "Mounted Turret", fov: 0.8, extraStats: []})
Class.autoGun_diep = makeTurret({
    GUNS: [
        {
            POSITION: diep2arras({
                size: 110,
                width: 50.4
            }),
            PROPERTIES: {
                SHOOT_SETTINGS: combineStats([g.basic, g.pelleter, g.power, { recoil: 1.15 }, g.turret]),
                TYPE: "bullet",
            },
        },
    ],
}, {canRepel: true, limitFov: true, fov: 3})

// Basic Tank
Class.tank_diep = {
    PARENT: 'diep',
    LABEL: "Tank",
    DANGER: 4,
    GUNS: [
        {
            POSITION: diep2arras({
                angle: 0,
                offset: 0,
                size: 95,
                width: 42,
                delay: 0,
                isTrapezoid: false
            }),
            PROPERTIES: {
                SHOOT_SETTINGS: combineStats([g.basic]),
                TYPE: "bullet",
            }
        }
    ]
}

// Tier 1
Class.flankGuard_diep = {
    PARENT: 'diep',
    LABEL: "Flank Guard",
    GUNS: [
        {
            POSITION: diep2arras({
                angle: 0,
                offset: 0,
                size: 95,
                width: 42,
                delay: 0,
                isTrapezoid: false
            }),
            PROPERTIES: {
                SHOOT_SETTINGS: combineStats([g.basic, g.flankGuard]),
                TYPE: "bullet"
            }
        },
        {
            POSITION: diep2arras({
                angle: Math.PI,
                offset: 0,
                size: 80,
                width: 42,
                delay: 0,
                isTrapezoid: false
            }),
            PROPERTIES: {
                SHOOT_SETTINGS: combineStats([g.basic, g.flankGuard]),
                TYPE: "bullet"
            }
        }
    ]
}
Class.machineGun_diep = {
    PARENT: 'diep',
    LABEL: "Machine Gun",
    GUNS: [
        {
            POSITION: diep2arras({
                angle: 0,
                offset: 0,
                size: 95,
                width: 42,
                delay: 0,
                isTrapezoid: true
            }),
            PROPERTIES: {
                SHOOT_SETTINGS: combineStats([g.basic, g.machineGun]),
                TYPE: "bullet",
            }
        }
    ]
}
Class.sniper_diep = {
    PARENT: 'diep',
    LABEL: "Sniper",
    BODY: {
        FOV: 1.1 * base.FOV
    },
    GUNS: [
        {
            POSITION: diep2arras({
                angle: 0,
                offset: 0,
                size: 110,
                width: 42,
                delay: 0,
                isTrapezoid: false
            }),
            PROPERTIES: {
                SHOOT_SETTINGS: combineStats([g.basic, g.sniper]),
                TYPE: "bullet",
            }
        }
    ]
}
Class.twin_diep = {
    PARENT: 'diep',
    LABEL: "Twin",
    GUNS: weaponMirror({
        POSITION: diep2arras({
            angle: 0,
            offset: -26,
            size: 95,
            width: 42,
            delay: 0,
            isTrapezoid: false
        }),
        PROPERTIES: {
            SHOOT_SETTINGS: combineStats([g.basic, g.twin]),
            TYPE: "bullet"
        }
    }, {delayIncrement: 0.5})
}

// Tier 2
Class.assassin_diep = {
    PARENT: 'diep',
    LABEL: "Assassin",
    DANGER: 6,
    BODY: {
        FOV: 1.2 * base.FOV
    },
    GUNS: [
        {
            POSITION: diep2arras({
                angle: 0,
                offset: 0,
                size: 120,
                width: 42,
                delay: 0,
                isTrapezoid: false
            }),
            PROPERTIES: {
                SHOOT_SETTINGS: combineStats([g.basic, g.sniper, g.assassin]),
                TYPE: "bullet",
            }
        }
    ]
}
Class.auto3_diep = makeRadialAuto("autoGun_diep", {isTurret: true, danger: 6, label: "Auto 3"})
Class.destroyer_diep = {
    PARENT: 'diep',
    LABEL: "Destroyer",
    DANGER: 6,
    GUNS: [
        {
            POSITION: diep2arras({
                angle: 0,
                offset: 0,
                size: 95,
                width: 71.4,
                delay: 0,
                isTrapezoid: false
            }),
            PROPERTIES: {
                SHOOT_SETTINGS: combineStats([g.basic, g.pounder, g.destroyer]),
                TYPE: "bullet",
            }
        }
    ]
}
Class.gunner_diep = {
    PARENT: 'diep',
    LABEL: "Gunner",
    DANGER: 6,
    GUNS: weaponMirror([
        {
            POSITION: diep2arras({
                angle: 0,
                offset: -32,
                size: 65,
                width: 25.2,
                delay: 0.5,
                isTrapezoid: false
            }),
            PROPERTIES: {
                SHOOT_SETTINGS: combineStats([g.basic, g.twin, g.gunner, { speed: 1.2 }]),
                TYPE: "bullet"
            }
        },
        {
            POSITION: diep2arras({
                angle: 0,
                offset: -17,
                size: 85,
                width: 25.2,
                delay: 0,
                isTrapezoid: false
            }),
            PROPERTIES: {
                SHOOT_SETTINGS: combineStats([g.basic, g.twin, g.gunner, { speed: 1.2 }]),
                TYPE: "bullet"
            }
        }
    ], { delayIncrement: 0.25 })
}
Class.hunter_diep = {
    PARENT: 'diep',
    LABEL: "Hunter",
    DANGER: 6,
    BODY: {
        FOV: 1.15 * base.FOV
    },
    GUNS: [
        {
            POSITION: diep2arras({
                angle: 0,
                offset: 0,
                size: 110,
                width: 42,
                delay: 0,
                isTrapezoid: false
            }),
            PROPERTIES: {
                SHOOT_SETTINGS: combineStats([g.basic, g.sniper, g.hunter, g.hunterSecondary]),
                TYPE: "bullet",
            }
        },
        {
            POSITION: diep2arras({
                angle: 0,
                offset: 0,
                size: 95,
                width: 56.7,
                delay: 0.2,
                isTrapezoid: false
            }),
            PROPERTIES: {
                SHOOT_SETTINGS: combineStats([g.basic, g.sniper, g.hunter]),
                TYPE: "bullet",
            }
        }
    ]
}
Class.overseer_diep = {
    PARENT: 'diep',
    LABEL: "Overseer",
    DANGER: 6,
    BODY: {
        FOV: 1.1 * base.FOV
    },
    TOOLTIP: "Use your left mouse button to control the drones",
    GUNS: weaponMirror({
        POSITION: diep2arras({
            angle: 1.5707963267948966,
            offset: 0,
            size: 70,
            width: 42,
            delay: 0,
            isTrapezoid: true
        }),
        PROPERTIES: {
            SHOOT_SETTINGS: combineStats([g.drone, g.overseer, g.droneSizeOffset]),
            TYPE: "drone",
            AUTOFIRE: true,
            SYNCS_SKILLS: true,
            STAT_CALCULATOR: "drone",
            MAX_CHILDREN: 4
        }
    })
}
Class.quadTank_diep = {
    PARENT: 'diep',
    LABEL: "Quad Tank",
    DANGER: 6,
    GUNS: weaponArray({
        POSITION: diep2arras({
            angle: 0,
            offset: 0,
            size: 95,
            width: 42,
            delay: 0,
            isTrapezoid: false
        }),
        PROPERTIES: {
            SHOOT_SETTINGS: combineStats([g.basic, g.flankGuard, g.flankGuard]),
            TYPE: "bullet",
        }
    }, 4)
}
Class.smasher_diep = {
    PARENT: "diepSmasher",
    LABEL: "Smasher",
    DANGER: 6,
    TURRETS: [
        {
            TYPE: ["hexagonHat_spin", {COLOR: "black"}],
            POSITION: {SIZE: 21.5}
        }
    ]
}
Class.trapper_diep = {
    PARENT: 'diep',
    LABEL: "Trapper",
    DANGER: 6,
    BODY: {
        FOV: 1.1 * base.FOV
    },
    STAT_NAMES: statnames.trap,
    GUNS: [
        {
            POSITION: diep2arras({
                angle: 0,
                offset: 0,
                size: 60,
                width: 42,
                delay: 0,
                isTrapezoid: false
            }),
        },
        {
            POSITION: diep2arras({
                angle: 0,
                distance: 60,
                offset: 0,
                size: 20,
                width: 42,
                delay: 0,
                isTrapezoid: true
            }),
            PROPERTIES: {
                SHOOT_SETTINGS: combineStats([g.trap, g.trapSizeOffset]),
                TYPE: "trap",
                STAT_CALCULATOR: "trap"
            }
        }
    ]
}
Class.triAngle_diep = {
    PARENT: 'diep',
    LABEL: "Tri-Angle",
    DANGER: 6,
    GUNS: [
        {
            POSITION: diep2arras({
                angle: 0,
                offset: 0,
                size: 95,
                width: 42,
                delay: 0,
                isTrapezoid: false
            }),
            PROPERTIES: {
                SHOOT_SETTINGS: combineStats([g.basic, g.flankGuard, g.triAngle, g.triAngleFront, { recoil: 4 }]),
                TYPE: "bullet",
                LABEL: "Front"
            }
        },
        ...weaponMirror({
            POSITION: diep2arras({
                angle: 2.6179938779914944,
                offset: 0,
                size: 80,
                width: 42,
                delay: 0.5,
                isTrapezoid: false
            }),
            PROPERTIES: {
                SHOOT_SETTINGS: combineStats([g.basic, g.flankGuard, g.triAngle, g.thruster]),
                TYPE: "bullet",
                LABEL: "thruster"
            }
        })
    ]
}
Class.tripleShot_diep = {
    PARENT: 'diep',
    LABEL: "Triple Shot",
    DANGER: 6,
    GUNS: [
        ...weaponMirror({
            POSITION: diep2arras({
                angle: 0.7853981633974483,
                offset: 0,
                size: 95,
                width: 42,
                delay: 0,
                isTrapezoid: false
            }),
            PROPERTIES: {
                SHOOT_SETTINGS: combineStats([g.basic, g.twin, g.tripleShot]),
                TYPE: "bullet"
            }
        }),
        {
            POSITION: diep2arras({
                angle: 0,
                offset: 0,
                size: 95,
                width: 42,
                delay: 0,
                isTrapezoid: false
            }),
            PROPERTIES: {
                SHOOT_SETTINGS: combineStats([g.basic, g.twin, g.tripleShot]),
                TYPE: "bullet"
            }
        }
    ]
}
Class.twinFlank_diep = makeFlank('twin_diep', 2, "Twin Flank", {extraStats: [g.doubleTwin]})

// Tier 3
Class.annihilator_diep = {
    PARENT: 'diep',
    LABEL: "Annihilator",
    DANGER: 7,
    GUNS: [
        {
            POSITION: diep2arras({
                angle: 0,
                offset: 0,
                size: 95,
                width: 96.6,
                delay: 0,
                isTrapezoid: false
            }),
            PROPERTIES: {
                SHOOT_SETTINGS: combineStats([g.basic, g.pounder, g.destroyer, g.annihilator]),
                TYPE: "bullet",
            }
        }
    ]
}
Class.auto5_diep = makeRadialAuto("autoGun_diep", {isTurret: true, danger: 7, label: "Auto 5", count: 5})
Class.autoGunner_diep = makeAuto("gunner_diep")
Class.autoSmasher_diep = makeAuto({
    PARENT: "diepSmasher",
    LABEL: "Smasher",
    DANGER: 6,
    SKILL_CAP: Array(10).fill(smshskl),
    TURRETS: [
        {
            TYPE: ["hexagonHat_spin", {COLOR: "black"}],
            POSITION: {SIZE: 21.5}
        }
    ]
})
Class.autoTank_diep = makeAuto("tank_diep")
Class.autoTrapper_diep = makeAuto("trapper_diep")
Class.battleship_diep = {
    PARENT: 'diep',
    LABEL: "Battleship",
    DANGER: 7,
    BODY: {
        FOV: 1.1 * base.FOV
    },
    GUNS: weaponArray([
        {
            POSITION: diep2arras({
                angle: 1.5707963267948966,
                offset: -20,
                size: 75,
                width: 29.4,
                delay: 0,
                isTrapezoid: true,
                invertAspect: true
            }),
            PROPERTIES: {
                SHOOT_SETTINGS: combineStats([g.swarm, g.swarmSizeOffset]),
                TYPE: "autoswarm",
                STAT_CALCULATOR: "swarm",
                LABEL: "Autonomous"
            }
        },
        {
            POSITION: diep2arras({
                angle: 4.71238898038469,
                offset: 20,
                size: 75,
                width: 29.4,
                delay: 0,
                isTrapezoid: true,
                invertAspect: true
            }),
            PROPERTIES: {
                SHOOT_SETTINGS: combineStats([g.swarm, g.battleship, g.swarmSizeOffset]),
                TYPE: "swarm",
                STAT_CALCULATOR: "swarm",
                LABEL: "Guided"
            }
        }
    ], 2)
}
Class.booster_diep = {
    PARENT: 'diep',
    LABEL: "Booster",
    DANGER: 7,
    GUNS: [
        {
            POSITION: diep2arras({
                angle: 0,
                offset: 0,
                size: 95,
                width: 42,
                delay: 0,
                isTrapezoid: false
            }),
            PROPERTIES: {
                SHOOT_SETTINGS: combineStats([g.basic, g.flankGuard, g.triAngle, g.triAngleFront, { recoil: 4 }]),
                TYPE: "bullet",
                LABEL: "Front"
            }
        },
        ...weaponMirror([
            {
                POSITION: diep2arras({
                    angle: 3.9269908169872414,
                    offset: 0,
                    size: 70,
                    width: 42,
                    delay: 2/3,
                    isTrapezoid: false
                }),
                PROPERTIES: {
                    SHOOT_SETTINGS: combineStats([g.basic, g.flankGuard, g.triAngle, g.thruster]),
                    TYPE: "bullet",
                    LABEL: "thruster"
                }
            },
            {
                POSITION: diep2arras({
                    angle: 2.6179938779914944,
                    offset: 0,
                    size: 80,
                    width: 42,
                    delay: 1/3,
                    isTrapezoid: false
                }),
                PROPERTIES: {
                    SHOOT_SETTINGS: combineStats([g.basic, g.flankGuard, g.triAngle, g.thruster]),
                    TYPE: "bullet",
                    LABEL: "thruster"
                }
            }
        ])
    ]
}
Class.factory_diep = {
    PARENT: 'diep',
    LABEL: "Factory",
    DANGER: 7,
    BODY: {
        FOV: base.FOV * 1.1
    },
    SHAPE: 4,
    GUNS: [
        {
            POSITION: diep2arras({
                angle: 0,
                offset: 0,
                size: 70,
                width: 42,
                delay: 0,
                isTrapezoid: true
            }),
            PROPERTIES: {
                SHOOT_SETTINGS: combineStats([g.minion, {size: 1.75}]),
                TYPE: "minion",
                MAX_CHILDREN: 6,
                STAT_CALCULATOR: "drone",
                AUTOFIRE: true,
                SYNCS_SKILLS: true
            }
        }
    ]
}
Class.fighter_diep = {
    PARENT: 'diep',
    LABEL: "Fighter",
    DANGER: 7,
    GUNS: [
        {
            POSITION: diep2arras({
                angle: 0,
                offset: 0,
                size: 95,
                width: 42,
                delay: 0,
                isTrapezoid: false
            }),
            PROPERTIES: {
                SHOOT_SETTINGS: combineStats([g.basic, g.flankGuard, g.triAngle, g.triAngleFront, { recoil: 4 }]),
                TYPE: "bullet",
                LABEL: "Front"
            }
        },
        ...weaponMirror([
            {
                POSITION: diep2arras({
                    angle: 1.5707963267948966,
                    offset: 0,
                    size: 80,
                    width: 42,
                    delay: 0,
                    isTrapezoid: false
                }),
                PROPERTIES: {
                    SHOOT_SETTINGS: combineStats([g.basic, g.flankGuard, g.triAngle, g.triAngleFront]),
                    TYPE: "bullet",
                    LABEL: "Side"
                }
            },
            {
                POSITION: diep2arras({
                    angle: 2.6179938779914944,
                    offset: 0,
                    size: 80,
                    width: 42,
                    delay: 0.5,
                    isTrapezoid: false
                }),
                PROPERTIES: {
                    SHOOT_SETTINGS: combineStats([g.basic, g.flankGuard, g.triAngle, g.thruster]),
                    TYPE: "bullet",
                    LABEL: "thruster"
                }
            }
        ])
    ]
}
Class.glider_diep = {
    PARENT: 'diep',
    LABEL: "Glider",
    DANGER: 7,
    BODY: {
        FOV: 1.1 * base.FOV,
    },
    GUNS: [
        {
            POSITION: diep2arras({
                angle: 0,
                offset: 0,
                size: 65.5 * Math.SQRT2,
                width: 36,
                delay: 0,
                isTrapezoid: true,
                invertAspect: true
            }),
        },
        {
            POSITION: diep2arras({
                angle: 0,
                offset: 0,
                size: 80,
                width: 56.7,
                delay: 0,
                isTrapezoid: true,
                invertAspect: true
            }),
            PROPERTIES: {
                SHOOT_SETTINGS: combineStats([g.basic, g.pounder, g.artillery, g.artillery, g.skimmer, {size: 1.25}]),
                TYPE: "missile_diep",
                STAT_CALCULATOR: "sustained"
            }
        }
    ]
}
Class.gunnerTrapper_diep = {
    PARENT: 'diep',
    LABEL: "Gunner Trapper",
    DANGER: 7,
    BODY: {
        FOV: 1.1 * base.FOV
    },
    GUNS: [
        ...weaponMirror({
            POSITION: diep2arras({
                angle: 0,
                offset: -16,
                size: 75,
                width: 21,
                delay: 1/3,
                isTrapezoid: false
            }),
            PROPERTIES: {
                SHOOT_SETTINGS: combineStats([g.basic, g.pelleter, g.power, g.twin, { recoil: 4 }, { recoil: 1.8 }]),
                TYPE: "bullet"
            }
        }, {delayIncrement: 1/3}),
        {
            POSITION: diep2arras({
                angle: Math.PI,
                offset: 0,
                size: 60,
                width: 54.6,
                delay: 0,
                isTrapezoid: false
            }),
        },
        {
            POSITION: diep2arras({
                angle: Math.PI,
                distance: 60,
                offset: 0,
                size: 20,
                width: 54.6,
                delay: 0,
                isTrapezoid: true
            }),
            PROPERTIES: {
                SHOOT_SETTINGS: combineStats([g.trap, g.trapSizeOffset]),
                TYPE: "trap",
                STAT_CALCULATOR: "trap"
            }
        }
    ]
}
Class.hybrid_diep = {
    PARENT: 'diep',
    LABEL: "Hybrid",
    DANGER: 7,
    GUNS: [
        ...Class.destroyer_diep.GUNS,
        {
            POSITION: diep2arras({
                angle: Math.PI,
                offset: 0,
                size: 70,
                width: 42,
                delay: 0,
                isTrapezoid: true
            }),
            PROPERTIES: {
                SHOOT_SETTINGS: combineStats([g.drone, g.weak, g.droneSizeOffset]),
                TYPE: ["drone", {INDEPENDENT: true}],
                AUTOFIRE: true,
                SYNCS_SKILLS: true,
                STAT_CALCULATOR: "drone",
                MAX_CHILDREN: 2
            }
        }
    ]
}
Class.landmine_diep = {
    PARENT: "diepSmasher",
    LABEL: "Landmine",
    DANGER: 7,
    INVISIBLE: [0.06, 0.01],
    TURRETS: [
        {
            TYPE: ["hexagonHat_spin", {COLOR: "black"}],
            POSITION: {
                SIZE: 21.5
            }
        },
        {
            TYPE: ["hexagonHat_spinFaster", {COLOR: "black"}],
            POSITION: {
                SIZE: 21.5,
                ANGLE: 90
            }
        }
    ]
}
Class.manager_diep = {
    PARENT: 'diep',
    LABEL: "Manager",
    DANGER: 7,
    INVISIBLE: [0.08, 0.03],
    GUNS: [
        {
            POSITION: diep2arras({
                angle: 0,
                offset: 0,
                size: 70,
                width: 42,
                delay: 0,
                isTrapezoid: true
            }),
            PROPERTIES: {
                SHOOT_SETTINGS: combineStats([g.drone, g.overseer, g.droneSizeOffset]),
                TYPE: "drone",
                AUTOFIRE: true,
                SYNCS_SKILLS: true,
                STAT_CALCULATOR: "drone",
                MAX_CHILDREN: 8
            }
        }
    ]
}
Class.megaTrapper_diep = {
    PARENT: 'diep',
    LABEL: "Mega Trapper",
    DANGER: 7,
    BODY: {
        FOV: 1.1 * base.FOV
    },
    STAT_NAMES: statnames.trap,
    GUNS: [
        {
            POSITION: diep2arras({
                angle: 0,
                offset: 0,
                size: 60,
                width: 54.6,
                delay: 0,
                isTrapezoid: false
            }),
        },
        {
            POSITION: diep2arras({
                angle: 0,
                distance: 60,
                offset: 0,
                size: 20,
                width: 54.6,
                delay: 0,
                isTrapezoid: true
            }),
            PROPERTIES: {
                SHOOT_SETTINGS: combineStats([g.trap, {reload: 2, damage: 2, recoil: 2, size: 2}]),
                TYPE: "trap",
                STAT_CALCULATOR: "trap"
            }
        }
    ]
}
Class.necromancer_diep = {
    PARENT: 'diep',
    LABEL: "Necromancer",
    DANGER: 7,
    NECRO: [4],
    STAT_NAMES: statnames.necro,
    BODY: {
        FOV: base.FOV * 1.1
    },
    SHAPE: 4,
    MAX_CHILDREN: 14,
    GUNS: weaponMirror({
        POSITION: diep2arras({
            angle: 1.5707963267948966,
            offset: 0,
            size: 70,
            width: 42,
            delay: 0,
            isTrapezoid: true
        }),
        PROPERTIES: {
            SHOOT_SETTINGS: combineStats([g.drone, g.sunchip, {size: 1.75}]),
            TYPE: "sunchip",
            AUTOFIRE: true,
            SYNCS_SKILLS: true,
            STAT_CALCULATOR: "necro",
            WAIT_TO_CYCLE: true,
            DELAY_SPAWN: false
        }
    })
}
Class.octoTank_diep = {
    PARENT: 'diep',
    LABEL: "Octo Tank",
    DANGER: 7,
    GUNS: weaponArray([
        // Must be kept like this to preserve visual layering
        {
            POSITION: diep2arras({
                angle: 0.7853981633974483,
                offset: 0,
                size: 95,
                width: 42,
                delay: 0.5,
                isTrapezoid: false
            }),
            PROPERTIES: {
                SHOOT_SETTINGS: combineStats([g.basic, g.flankGuard, g.flankGuard, g.spam]),
                TYPE: "bullet",
            }
        },
        {
            POSITION: diep2arras({
                angle: 0,
                offset: 0,
                size: 95,
                width: 42,
                delay: 0,
                isTrapezoid: false
            }),
            PROPERTIES: {
                SHOOT_SETTINGS: combineStats([g.basic, g.flankGuard, g.flankGuard, g.spam]),
                TYPE: "bullet",
            }
        }
    ], 4)
}
Class.overlord_diep = {
    PARENT: 'diep',
    LABEL: "Overlord",
    DANGER: 7,
    BODY: {
        FOV: 1.1 * base.FOV
    },
    GUNS: weaponArray({
        POSITION: diep2arras({
            angle: 0,
            offset: 0,
            size: 70,
            width: 42,
            delay: 0,
            isTrapezoid: true
        }),
        PROPERTIES: {
            SHOOT_SETTINGS: combineStats([g.drone, g.overseer, g.droneSizeOffset]),
            TYPE: "drone",
            AUTOFIRE: true,
            SYNCS_SKILLS: true,
            STAT_CALCULATOR: "drone",
            MAX_CHILDREN: 2
        }
    }, 4)
}
Class.overtrapper_diep = {
    PARENT: 'diep',
    LABEL: "Overtrapper",
    DANGER: 7,
    BODY: {
        FOV: 1.1 * base.FOV
    },
    STAT_NAMES: statnames.trap,
    GUNS: [
        {
            POSITION: diep2arras({
                angle: 0,
                offset: 0,
                size: 60,
                width: 42,
                delay: 0,
                isTrapezoid: false
            }),
        },
        {
            POSITION: diep2arras({
                angle: 0,
                distance: 60,
                offset: 0,
                size: 20,
                width: 42,
                delay: 0,
                isTrapezoid: true
            }),
            PROPERTIES: {
                SHOOT_SETTINGS: combineStats([g.trap, g.trapSizeOffset]),
                TYPE: "trap",
                STAT_CALCULATOR: "trap"
            }
        },
        ...weaponMirror({
            POSITION: diep2arras({
                angle: 2.0943951023931953,
                offset: 0,
                size: 70,
                width: 42,
                delay: 0,
                isTrapezoid: true
            }),
            PROPERTIES: {
                SHOOT_SETTINGS: combineStats([g.drone, g.overseer, g.droneSizeOffset]),
                TYPE: "drone",
                AUTOFIRE: true,
                SYNCS_SKILLS: true,
                STAT_CALCULATOR: "drone",
                MAX_CHILDREN: 1
            }
        })
    ]
}
Class.pentaShot_diep = {
    PARENT: 'diep',
    LABEL: "Penta Shot",
    DANGER: 7,
    GUNS: [
        ...weaponMirror([{
            POSITION: diep2arras({
                angle: 0.7853981633974483,
                offset: 0,
                size: 80,
                width: 42,
                delay: 0,
                isTrapezoid: false
            }),
            PROPERTIES: {
                SHOOT_SETTINGS: combineStats([g.basic, g.twin, g.tripleShot]),
                TYPE: "bullet"
            }
        },
        {
            POSITION: diep2arras({
                angle: 0.39269908169872414,
                offset: 0,
                size: 95,
                width: 42,
                delay: 0,
                isTrapezoid: false
            }),
            PROPERTIES: {
                SHOOT_SETTINGS: combineStats([g.basic, g.twin, g.tripleShot]),
                TYPE: "bullet"
            }
        }]),
        {
            POSITION: diep2arras({
                angle: 0,
                offset: 0,
                size: 110,
                width: 42,
                delay: 0,
                isTrapezoid: false
            }),
            PROPERTIES: {
                SHOOT_SETTINGS: combineStats([g.basic, g.twin, g.tripleShot]),
                TYPE: "bullet"
            }
        }
    ]
}
Class.predator_diep = {
    PARENT: 'diep',
    LABEL: "Predator",
    DANGER: 7,
    BODY: {
        FOV: 1.15 * base.FOV
    },
    CONTROLLERS: [["zoom", {distance: 360, dynamic: false}]],
    TOOLTIP: "Use your right mouse button to look further in the direction you're facing",
    GUNS: [
        {
            POSITION: diep2arras({
                angle: 0,
                offset: 0,
                size: 110,
                width: 42,
                delay: 0,
                isTrapezoid: false
            }),
            PROPERTIES: {
                SHOOT_SETTINGS: combineStats([g.basic, g.sniper, g.hunter, g.hunterSecondary, g.hunterSecondary, g.predator]),
                TYPE: "bullet",
            }
        },
        {
            POSITION: diep2arras({
                angle: 0,
                offset: 0,
                size: 95,
                width: 56.7,
                delay: 0.2,
                isTrapezoid: false
            }),
            PROPERTIES: {
                SHOOT_SETTINGS: combineStats([g.basic, g.sniper, g.hunter, g.hunterSecondary, g.predator]),
                TYPE: "bullet",
            }
        },
        {
            POSITION: diep2arras({
                angle: 0,
                offset: 0,
                size: 80,
                width: 71.4,
                delay: 0.4,
                isTrapezoid: false
            }),
            PROPERTIES: {
                SHOOT_SETTINGS: combineStats([g.basic, g.sniper, g.hunter, g.predator]),
                TYPE: "bullet",
            }
        }
    ]
}
Class.predator_old_diep = {
    PARENT: 'diep',
    LABEL: "Predator",
    DANGER: 7,
    BODY: {
        FOV: 1.15 * base.FOV
    },
    CONTROLLERS: [["zoom", {distance: 360, dynamic: false}]],
    TOOLTIP: "Use your right mouse button to look further in the direction you're facing",
    GUNS: [
        {
            POSITION: diep2arras({
                angle: 0,
                offset: 0,
                size: 110,
                width: 42,
                delay: 0,
                isTrapezoid: false
            }),
            PROPERTIES: {
                SHOOT_SETTINGS: combineStats([g.basic, g.sniper, g.hunter, g.hunterSecondary, g.predator]),
                TYPE: "bullet",
            }
        },
        {
            POSITION: diep2arras({
                angle: 0,
                offset: 0,
                size: 95,
                width: 56.7,
                delay: 0.2,
                isTrapezoid: false
            }),
            PROPERTIES: {
                SHOOT_SETTINGS: combineStats([g.basic, g.sniper, g.hunter, g.predator]),
                TYPE: "bullet",
            }
        },
        {
            POSITION: diep2arras({
                angle: 0,
                distance: 15,
                offset: 0,
                size: 50,
                width: 56.7,
                delay: 0,
                isTrapezoid: true,
                invertAspect: true
            })
        }
    ]
}
Class.ranger_diep = {
    PARENT: 'diep',
    LABEL: "Ranger",
    DANGER: 7,
    BODY: {
        FOV: 1.3 * base.FOV
    },
    GUNS: [
        {
            POSITION: diep2arras({
                angle: 0,
                offset: 0,
                size: 120,
                width: 42,
                delay: 0,
                isTrapezoid: false
            }),
            PROPERTIES: {
                SHOOT_SETTINGS: combineStats([g.basic, g.sniper, g.assassin]),
                TYPE: "bullet",
            }
        },
        {
            POSITION: diep2arras({
                angle: 0,
                distance: 15,
                offset: 0,
                size: 50,
                width: 42,
                delay: 0,
                isTrapezoid: true,
                invertAspect: true
            })
        }
    ]
}
Class.rocketeer_diep = {
    PARENT: 'diep',
    LABEL: "Rocketeer",
    DANGER: 7,
    BODY: {
        FOV: 1.1 * base.FOV,
    },
    GUNS: [
        {
            POSITION: diep2arras({
                angle: 0,
                offset: 0,
                size: 65.5 * Math.SQRT2,
                width: 36,
                delay: 0,
                isTrapezoid: true
            }),
        },
        {
            POSITION: diep2arras({
                angle: 0,
                offset: 0,
                size: 80,
                width: 52.5,
                delay: 0,
                isTrapezoid: true,
                invertAspect: true
            }),
            PROPERTIES: {
                SHOOT_SETTINGS: combineStats([g.basic, g.pounder, g.launcher, g.rocketeer, {size: 0.625}]),
                TYPE: "rocket_diep",
                STAT_CALCULATOR: "sustained"
            }
        }
    ]
}
Class.skimmer_diep = {
    PARENT: 'diep',
    LABEL: "Skimmer",
    DANGER: 7,
    BODY: {
        FOV: 1.1 * base.FOV,
    },
    GUNS: [
        {
            POSITION: diep2arras({
                angle: 0,
                offset: 0,
                size: 65.5 * Math.SQRT2,
                width: 36,
                delay: 0,
                isTrapezoid: true
            }),
        },
        {
            POSITION: diep2arras({
                angle: 0,
                offset: 0,
                size: 80,
                width: 71.4,
                delay: 0,
                isTrapezoid: false
            }),
            PROPERTIES: {
                SHOOT_SETTINGS: combineStats([g.basic, g.pounder, g.artillery, g.artillery, g.skimmer, {speed: 0.6, reload: 4/3, shudder: 0.1, size: 1.75}]),
                TYPE: "spinmissile_diep",
                STAT_CALCULATOR: "sustained",
            },
        },
    ],
}
Class.spike_diep = {
    PARENT: "diepSmasher",
    LABEL: "Spike",
    DANGER: 7,
    BODY: {
        SPEED: base.SPEED * 0.9,
        DAMAGE: base.DAMAGE * 1.1
    },
    TURRETS: weaponArray([
        {
            TYPE: ["triangleHat_spin", {COLOR: "black"}],
            POSITION: {SIZE: 18}
        }
    ], 4)
}
Class.sprayer_diep = {
    PARENT: 'diep',
    LABEL: "Sprayer",
    DANGER: 7,
    GUNS: [
        {
            POSITION: diep2arras({
                angle: 0,
                offset: 0,
                size: 110,
                width: 42,
                delay: 0.5,
                isTrapezoid: false
            }),
            PROPERTIES: {
                SHOOT_SETTINGS: combineStats([g.basic, g.machineGun, g.lowPower, g.pelleter, { recoil: 1.15 }]),
                TYPE: "bullet",
            }
        },
        {
            POSITION: diep2arras({
                angle: 0,
                offset: 0,
                size: 95,
                width: 42,
                delay: 0,
                isTrapezoid: true
            }),
            PROPERTIES: {
                SHOOT_SETTINGS: combineStats([g.basic, g.machineGun]),
                TYPE: "bullet",
            }
        }
    ]
}
Class.spreadShot_diep = {
    PARENT: 'diep',
    LABEL: "Spread Shot",
    DANGER: 7,
    GUNS: [
        ...weaponMirror([{
            POSITION: diep2arras({
                angle: 1.3089969389957472,
                offset: 0,
                size: 65,
                width: 29.4,
                delay: 0,
                isTrapezoid: false
            }),
            PROPERTIES: {
                SHOOT_SETTINGS: combineStats([g.basic, g.pelleter, g.artillery, g.twin, g.spreadshot]),
                TYPE: "bullet",
                LABEL: "Spread"
            }
        },
        {
            POSITION: diep2arras({
                angle: 1.0471975511965976,
                offset: 0,
                size: 71,
                width: 29.4,
                delay: 0,
                isTrapezoid: false
            }),
            PROPERTIES: {
                SHOOT_SETTINGS: combineStats([g.basic, g.pelleter, g.artillery, g.twin, g.spreadshot]),
                TYPE: "bullet",
                LABEL: "Spread"
            }
        },
        {
            POSITION: diep2arras({
                angle: 0.7853981633974483,
                offset: 0,
                size: 77,
                width: 29.4,
                delay: 0,
                isTrapezoid: false
            }),
            PROPERTIES: {
                SHOOT_SETTINGS: combineStats([g.basic, g.pelleter, g.artillery, g.twin, g.spreadshot]),
                TYPE: "bullet",
                LABEL: "Spread"
            }
        },
        {
            POSITION: diep2arras({
                angle: 0.5235987755982988,
                offset: 0,
                size: 83,
                width: 29.4,
                delay: 0,
                isTrapezoid: false
            }),
            PROPERTIES: {
                SHOOT_SETTINGS: combineStats([g.basic, g.pelleter, g.artillery, g.twin, g.spreadshot]),
                TYPE: "bullet",
                LABEL: "Spread"
            }
        },
        {
            POSITION: diep2arras({
                angle: 0.2617993877991494,
                offset: 0,
                size: 89,
                width: 29.4,
                delay: 0,
                isTrapezoid: false
            }),
            PROPERTIES: {
                SHOOT_SETTINGS: combineStats([g.basic, g.pelleter, g.artillery, g.twin, g.spreadshot]),
                TYPE: "bullet",
                LABEL: "Spread"
            }
        }]),
        {
            POSITION: diep2arras({
                angle: 0,
                offset: 0,
                size: 95,
                width: 42,
                delay: 0,
                isTrapezoid: false
            }),
            PROPERTIES: {
                SHOOT_SETTINGS: combineStats([g.basic, g.pounder, g.spreadshotMain, g.spreadshot]),
                TYPE: "bullet"
            }
        }
    ]
}
Class.stalker_diep = {
    PARENT: 'diep',
    LABEL: "Stalker",
    DANGER: 7,
    BODY: {
        FOV: 1.2 * base.FOV
    },
    INVISIBLE: [0.08, 0.03],
    GUNS: [
        {
            POSITION: diep2arras({
                angle: 0,
                offset: 0,
                size: 120,
                width: 42,
                delay: 0,
                isTrapezoid: true,
                invertAspect: true
            }),
            PROPERTIES: {
                SHOOT_SETTINGS: combineStats([g.basic, g.sniper, g.assassin]),
                TYPE: "bullet",
            }
        }
    ]
}
Class.streamliner_diep = {
    PARENT: 'diep',
    LABEL: "Streamliner",
    DANGER: 7,
    BODY: {
        FOV: 1.15 * base.FOV
    },
    GUNS: [
        {
            POSITION: diep2arras({
                angle: 0,
                offset: 0,
                size: 110,
                width: 42,
                delay: 0,
                isTrapezoid: false
            }),
            PROPERTIES: {
                SHOOT_SETTINGS: combineStats([g.basic, g.minigun, g.streamliner, g.streamSizeOffset]),
                TYPE: "bullet",
            }
        },
        {
            POSITION: diep2arras({
                angle: 0,
                offset: 0,
                size: 100,
                width: 42,
                delay: 0.2,
                isTrapezoid: false
            }),
            PROPERTIES: {
                SHOOT_SETTINGS: combineStats([g.basic, g.minigun, g.streamliner, g.streamSizeOffset]),
                TYPE: "bullet",
            }
        },
        {
            POSITION: diep2arras({
                angle: 0,
                offset: 0,
                size: 90,
                width: 42,
                delay: 0.4,
                isTrapezoid: false
            }),
            PROPERTIES: {
                SHOOT_SETTINGS: combineStats([g.basic, g.minigun, g.streamliner, g.streamSizeOffset]),
                TYPE: "bullet",
            }
        },
        {
            POSITION: diep2arras({
                angle: 0,
                offset: 0,
                size: 80,
                width: 42,
                delay: 0.6,
                isTrapezoid: false
            }),
            PROPERTIES: {
                SHOOT_SETTINGS: combineStats([g.basic, g.minigun, g.streamliner, g.streamSizeOffset]),
                TYPE: "bullet",
            }
        },
        {
            POSITION: diep2arras({
                angle: 0,
                offset: 0,
                size: 70,
                width: 42,
                delay: 0.8,
                isTrapezoid: false
            }),
            PROPERTIES: {
                SHOOT_SETTINGS: combineStats([g.basic, g.minigun, g.streamliner, g.streamSizeOffset]),
                TYPE: "bullet",
            }
        }
    ]
}
Class.triTapper_diep = {
    PARENT: 'diep',
    LABEL: "Tri-Tapper",
    DANGER: 7,
    BODY: {
        FOV: 1.1 * base.FOV
    },
    STAT_NAMES: statnames.trap,
    GUNS: weaponArray([
        {
            POSITION: diep2arras({
                angle: 0,
                offset: 0,
                size: 60,
                width: 42,
                delay: 0,
                isTrapezoid: false
            }),
        },
        {
            POSITION: diep2arras({
                angle: 0,
                distance: 60,
                offset: 0,
                size: 20,
                width: 42,
                delay: 0,
                isTrapezoid: true
            }),
            PROPERTIES: {
                SHOOT_SETTINGS: combineStats([g.trap, g.flankGuard, g.trapSizeOffset]),
                TYPE: "trap",
                STAT_CALCULATOR: "trap"
            }
        }
    ], 3)
}
Class.tripleTwin_diep = makeFlank('twin_diep', 3, "Triple Twin", {extraStats: [g.spam, g.doubleTwin, g.tripleTwin]})
Class.triplet_diep = {
    PARENT: 'diep',
    LABEL: "Triplet",
    DANGER: 7,
    GUNS: [
        ...weaponMirror({
            POSITION: diep2arras({
                angle: 0,
                offset: -26,
                size: 80,
                width: 42,
                delay: 0.5,
                isTrapezoid: false
            }),
            PROPERTIES: {
                SHOOT_SETTINGS: combineStats([g.basic, g.twin, g.triplet]),
                TYPE: "bullet"
            }
        }),
        {
            POSITION: diep2arras({
                angle: 0,
                offset: 0,
                size: 95,
                width: 42,
                delay: 0,
                isTrapezoid: false
            }),
            PROPERTIES: {
                SHOOT_SETTINGS: combineStats([g.basic, g.twin, g.triplet]),
                TYPE: "bullet"
            }
        }
    ]
}
Class.twinGuard_havre = {
    PARENT: 'diep',
    LABEL: "Twin Guard",
    DANGER: 7,
    GUNS: weaponArray([
        {
            POSITION: diep2arras({
                angle: 1.5707963267948966,
                offset: 0,
                size: 80,
                width: 42,
                delay: 0,
                isTrapezoid: false
            }),
            PROPERTIES: {
                SHOOT_SETTINGS: combineStats([g.basic, g.flankGuard, g.flankGuard, {reload: 2}]),
                TYPE: "bullet"
            }
        },
        ...weaponMirror({
            POSITION: diep2arras({
                angle: 0,
                offset: -26,
                size: 95,
                width: 42,
                delay: 0,
                isTrapezoid: false
            }),
            PROPERTIES: {
                SHOOT_SETTINGS: combineStats([g.basic, g.twin, g.doubleTwin]),
                TYPE: "bullet"
            }
        }, {delayIncrement: 0.5})
    ], 2)
}

// Tier 4
Class.ambusher_diep = {
    PARENT: 'diep',
    LABEL: "Ambusher",
    DANGER: 8,
    INVISIBLE: [0.08, 0.03],
    PROPS: [
        {
            TYPE: ["squareHat", {COLOR: 'grey'}],
            POSITION: {
                SIZE: 5.5,
                LAYER: 1
            }
        }
    ],
    GUNS: [
        {
            POSITION: diep2arras({
                angle: 0,
                offset: 0,
                size: 95,
                width: 96.6,
                delay: 0,
                isTrapezoid: false
            }),
            PROPERTIES: {
                SHOOT_SETTINGS: combineStats([g.basic, g.pounder, g.destroyer, g.annihilator]),
                TYPE: "bullet",
            }
        }
    ]
}
Class.apexPredator_diep = {
    PARENT: 'diep',
    LABEL: "Apex Predator",
    DANGER: 8,
    BODY: {
        FOV: 1.15 * base.FOV
    },
    CONTROLLERS: [["zoom", {distance: 360, dynamic: false}]],
    TOOLTIP: "Use your right mouse button to look further in the direction you're facing",
    GUNS: [
        {
            POSITION: diep2arras({
                angle: 0,
                offset: 0,
                size: 110,
                width: 42,
                delay: 0,
                isTrapezoid: false
            }),
            PROPERTIES: {
                SHOOT_SETTINGS: combineStats([g.basic, g.sniper, g.hunter, g.hunterSecondary, g.hunterSecondary, g.hunterSecondary, g.predator]),
                TYPE: "bullet",
            }
        },
        {
            POSITION: diep2arras({
                angle: 0,
                offset: 0,
                size: 95,
                width: 56.7,
                delay: 0.2,
                isTrapezoid: false
            }),
            PROPERTIES: {
                SHOOT_SETTINGS: combineStats([g.basic, g.sniper, g.hunter, g.hunterSecondary, g.hunterSecondary, g.predator]),
                TYPE: "bullet",
            }
        },
        {
            POSITION: diep2arras({
                angle: 0,
                offset: 0,
                size: 80,
                width: 71.4,
                delay: 0.4,
                isTrapezoid: false
            }),
            PROPERTIES: {
                SHOOT_SETTINGS: combineStats([g.basic, g.sniper, g.hunter, g.hunterSecondary, g.predator]),
                TYPE: "bullet",
            }
        },
        {
            POSITION: diep2arras({
                angle: 0,
                offset: 0,
                size: 65,
                width: 86.1,
                delay: 0.6,
                isTrapezoid: false
            }),
            PROPERTIES: {
                SHOOT_SETTINGS: combineStats([g.basic, g.sniper, g.hunter, g.predator]),
                TYPE: "bullet",
            }
        }
    ]
}
Class.apexPredator_old_diep = {
    PARENT: 'diep',
    LABEL: "Apex Predator",
    DANGER: 8,
    BODY: {
        FOV: 1.15 * base.FOV
    },
    CONTROLLERS: [["zoom", {distance: 360, dynamic: false}]],
    TOOLTIP: "Use your right mouse button to look further in the direction you're facing",
    GUNS: [
        {
            POSITION: diep2arras({
                angle: 0,
                offset: 0,
                size: 110,
                width: 42,
                delay: 0,
                isTrapezoid: false
            }),
            PROPERTIES: {
                SHOOT_SETTINGS: combineStats([g.basic, g.sniper, g.hunter, g.hunterSecondary, g.hunterSecondary, g.predator]),
                TYPE: "bullet",
            }
        },
        {
            POSITION: diep2arras({
                angle: 0,
                offset: 0,
                size: 95,
                width: 56.7,
                delay: 0.2,
                isTrapezoid: false
            }),
            PROPERTIES: {
                SHOOT_SETTINGS: combineStats([g.basic, g.sniper, g.hunter, g.hunterSecondary, g.predator]),
                TYPE: "bullet",
            }
        },
        {
            POSITION: diep2arras({
                angle: 0,
                offset: 0,
                size: 80,
                width: 71.4,
                delay: 0.4,
                isTrapezoid: false
            }),
            PROPERTIES: {
                SHOOT_SETTINGS: combineStats([g.basic, g.sniper, g.hunter, g.predator]),
                TYPE: "bullet",
            }
        },
        {
            POSITION: diep2arras({
                angle: 0,
                distance: 15,
                offset: 0,
                size: 50,
                width: 71.4,
                delay: 0,
                isTrapezoid: true,
                invertAspect: true
            })
        },
        {
            POSITION: diep2arras({
                angle: 0,
                distance: -35,
                offset: 0,
                size: 50,
                width: 71.4,
                delay: 0,
                isTrapezoid: true,
                invertAspect: false
            })
        }
    ]
}
Class.auto6_diep = makeAuto('auto5_diep', "Auto-6")
Class.auto7_diep = makeRadialAuto("autoGun_diep", {isTurret: true, danger: 8, label: "Auto 7", count: 7})
Class.automator_diep = {
    PARENT: 'diep',
    LABEL: "Automator",
    DANGER: 8,
    BODY: {
        FOV: base.FOV * 1.1
    },
    SHAPE: 8,
    GUNS: [
        {
            POSITION: diep2arras({
                angle: 0,
                offset: 0,
                size: 70,
                width: 42,
                delay: 0,
                isTrapezoid: true
            }),
            PROPERTIES: {
                SHOOT_SETTINGS: combineStats([g.minion, {size: 1.75}]),
                TYPE: "minion",
                MAX_CHILDREN: 6,
                STAT_CALCULATOR: "drone",
                AUTOFIRE: true,
                SYNCS_SKILLS: true
            }
        }
    ]
}
//Class.battalion_diep
Class.blender_diep = {
    PARENT: "diepSmasher",
    LABEL: "Blender",
    DANGER: 8,
    BODY: {
        SPEED: base.SPEED * 0.9,
        DAMAGE: base.DAMAGE * 1.1
    },
    SKILL_CAP: {
        RELOAD: smshskl + 3,
        PENETRATION: 0,
        BULLET_HEALTH: 0,
        BULLET_DAMAGE: 0,
        BULLET_SPEED: 0,
        SHIELD_CAPACITY: smshskl + 3,
        BODY_DAMAGE: smshskl + 3,
        MAX_HEALTH: smshskl + 3,
        SHIELD_REGENERATION: smshskl + 3,
        MOVEMENT_SPEED: smshskl + 3
    },
    TURRETS: weaponArray([
        {
            TYPE: ["squareHat_spin", {COLOR: "black"}],
            POSITION: {SIZE: 19}
        }
    ], 3)
}
Class.cyclone_diep = {
    PARENT: 'diep',
    LABEL: "Cyclone",
    DANGER: 8,
    BODY: {
        FOV: 1.1 * base.FOV,
    },
    PROPS: [
        {
            TYPE: ["squareHat", {COLOR: 'grey'}],
            POSITION: {
                SIZE: 5.5,
                LAYER: 1
            }
        }
    ],
    GUNS: [
        {
            POSITION: diep2arras({
                angle: 0,
                offset: 0,
                size: 65.5 * Math.SQRT2,
                width: 36,
                delay: 0,
                isTrapezoid: true
            })
        },
        {
            POSITION: diep2arras({
                angle: 0,
                offset: 0,
                size: 80,
                width: 71.4,
                delay: 0,
                isTrapezoid: false
            }),
            PROPERTIES: {
                SHOOT_SETTINGS: combineStats([g.basic, g.pounder, g.artillery, g.artillery, g.skimmer, {speed: 0.6, reload: 4/3, shudder: 0.1, size: 1.75}]),
                TYPE: 'cycloneMissile_diep',
                STAT_CALCULATOR: 'sustained'
            }
        }
    ]
}
Class.decaTank_diep = {
    PARENT: 'diep',
    LABEL: "Deca Tank",
    DANGER: 8,
    GUNS: weaponArray([
        // Must be kept like this to preserve visual layering
        {
            POSITION: diep2arras({
                angle: Math.PI / 5,
                offset: 0,
                size: 80,
                width: 27.3+(14.7/3*2),
                delay: 0.5,
                isTrapezoid: false
            }),
            PROPERTIES: {
                SHOOT_SETTINGS: combineStats([g.basic, g.flankGuard, g.flankGuard, g.spam]),
                TYPE: "bullet",
            }
        },
        {
            POSITION: diep2arras({
                angle: 0,
                offset: 0,
                size: 80,
                width: 27.3+(14.7/3*2),
                delay: 0,
                isTrapezoid: false
            }),
            PROPERTIES: {
                SHOOT_SETTINGS: combineStats([g.basic, g.flankGuard, g.flankGuard, g.spam]),
                TYPE: "bullet",
            }
        }
    ], 5)
}
Class.defendersSon_diep = makeAuto('triTapper_diep', "Defender's Son")
Class.hitman_diep = {
    PARENT: 'diep',
    LABEL: "Hitman",
    DANGER: 8,
    BODY: {
        FOV: 1.3 * base.FOV
    },
    GUNS: [
        {
            POSITION: diep2arras({
                angle: 0,
                offset: 0,
                size: 130,
                width: 42,
                delay: 0,
                isTrapezoid: false
            }),
            PROPERTIES: {
                SHOOT_SETTINGS: combineStats([g.basic, g.sniper, g.assassin, {damage: 1.1}]),
                TYPE: "bullet",
            }
        },
        {
            POSITION: diep2arras({
                angle: 0,
                distance: 15,
                offset: 0,
                size: 50,
                width: 42,
                delay: 0,
                isTrapezoid: true,
                invertAspect: true
            })
        }
    ]
}
Class.overovertrapper_diep = {
    PARENT: 'diep',
    LABEL: "Overovertrapper",
    DANGER: 8,
    BODY: {
        FOV: 1.1 * base.FOV
    },
    STAT_NAMES: statnames.trap,
    GUNS: [
        {
            POSITION: diep2arras({
                angle: 0,
                offset: 0,
                size: 60,
                width: 42,
                delay: 0,
                isTrapezoid: false
            }),
        },
        {
            POSITION: diep2arras({
                angle: 0,
                distance: 60,
                offset: 0,
                size: 20,
                width: 42,
                delay: 0,
                isTrapezoid: true
            }),
            PROPERTIES: {
                SHOOT_SETTINGS: combineStats([g.trap, g.trapSizeOffset]),
                TYPE: "trap",
                STAT_CALCULATOR: "trap"
            }
        },
        ...weaponMirror({
            POSITION: diep2arras({
                angle: Math.PI/2,
                offset: 0,
                size: 70,
                width: 42,
                delay: 0,
                isTrapezoid: true
            }),
            PROPERTIES: {
                SHOOT_SETTINGS: combineStats([g.drone, g.overseer, g.droneSizeOffset]),
                TYPE: "drone",
                AUTOFIRE: true,
                SYNCS_SKILLS: true,
                STAT_CALCULATOR: "drone",
                MAX_CHILDREN: 2
            }
        }),
        {
            POSITION: diep2arras({
                angle: Math.PI,
                offset: 0,
                size: 70,
                width: 42,
                delay: 0,
                isTrapezoid: true
            }),
            PROPERTIES: {
                SHOOT_SETTINGS: combineStats([g.drone, g.overseer, g.droneSizeOffset]),
                TYPE: ["drone", {INDEPENDENT: true}],
                AUTOFIRE: true,
                SYNCS_SKILLS: true,
                STAT_CALCULATOR: "drone",
                MAX_CHILDREN: 2
            }
        }
    ]
}
Class.resurrector_diep = {
    PARENT: 'diep',
    LABEL: "Resurrector",
    DANGER: 8,
    NECRO: [4],
    STAT_NAMES: statnames.necro,
    BODY: {
        FOV: base.FOV * 1.1
    },
    SHAPE: 8,
    MAX_CHILDREN: 14,
    GUNS: weaponMirror({
        POSITION: diep2arras({
            angle: 1.5707963267948966,
            offset: 0,
            size: 70,
            width: 42,
            delay: 0,
            isTrapezoid: true
        }),
        PROPERTIES: {
            SHOOT_SETTINGS: combineStats([g.drone, g.sunchip, {size: 1.75}]),
            TYPE: "sunchip",
            AUTOFIRE: true,
            SYNCS_SKILLS: true,
            STAT_CALCULATOR: "necro",
            WAIT_TO_CYCLE: true,
            DELAY_SPAWN: false
        }
    })
}
Class.striker_diep = {
    PARENT: 'diep',
    LABEL: "Striker",
    DANGER: 8,
    GUNS: [
        {
            POSITION: diep2arras({
                angle: 0,
                offset: 0,
                size: 95,
                width: 71.4,
                delay: 0,
                isTrapezoid: false
            }),
            PROPERTIES: {
                SHOOT_SETTINGS: combineStats([g.basic, g.pounder, g.destroyer]),
                TYPE: "bullet",
                ALT_FIRE: true
            }
        },
        ...weaponMirror({
            POSITION: diep2arras({
                angle: 2.6179938779914944,
                offset: 0,
                size: 80,
                width: 42,
                delay: 0,
                isTrapezoid: false
            }),
            PROPERTIES: {
                SHOOT_SETTINGS: combineStats([g.basic, g.flankGuard, g.triAngle, g.thruster]),
                TYPE: "bullet",
                LABEL: "thruster"
            }
        })
    ]
}
Class.tenk_diep = {
    PARENT: 'diep',
    LABEL: "Tenk",
    DANGER: 8,
    PROPS: [
        {
            TYPE: ["squareHat", {COLOR: 'grey'}],
            POSITION: {
                SIZE: 5.5,
                LAYER: 1
            }
        }
    ],
    GUNS: Class.tank_diep.GUNS,
    SKILL_CAP: {
        RELOAD: smshskl,
        PENETRATION: smshskl,
        BULLET_HEALTH: smshskl,
        BULLET_DAMAGE: smshskl,
        BULLET_SPEED: smshskl,
        SHIELD_CAPACITY: smshskl,
        BODY_DAMAGE: smshskl,
        MAX_HEALTH: smshskl,
        SHIELD_REGENERATION: smshskl,
        MOVEMENT_SPEED: smshskl
    }
}
Class.tripleFlank_diep = makeFlank('triplet_diep', 2, "Triple Flank", {extraStats: [g.doubleTwin]})

// Special
Class.id53_diep = {
    PARENT: 'diep',
    LABEL: "",
    DANGER: 4
}

// Class Tree
Class.tank_diep.UPGRADES_TIER_1 = ["twin", "sniper", "machineGun", "flankGuard"].map(x => x + "_diep")
    Class.tank_diep.UPGRADES_TIER_2 = ["smasher"].map(x => x + "_diep")
        Class.tank_diep.UPGRADES_TIER_3 = ["autoTank"].map(x => x + "_diep")
        Class.smasher_diep.UPGRADES_TIER_3 = ["landmine", "autoSmasher", "spike"].map(x => x + "_diep")

    Class.twin_diep.UPGRADES_TIER_2 = ["tripleShot", "quadTank", "twinFlank"].map(x => x + "_diep")
        Class.tripleShot_diep.UPGRADES_TIER_3 = ["triplet", "pentaShot", "spreadShot"].map(x => x + "_diep")
        Class.quadTank_diep.UPGRADES_TIER_3 = ["octoTank", "auto5"].map(x => x + "_diep")
        Class.twinFlank_diep.UPGRADES_TIER_3 = ["tripleTwin", "battleship"].map(x => x + "_diep")

    Class.sniper_diep.UPGRADES_TIER_2 = ["assassin", "overseer", "hunter", "trapper"].map(x => x + "_diep")
        Class.assassin_diep.UPGRADES_TIER_3 = ["ranger", "stalker"].map(x => x + "_diep")
        Class.overseer_diep.UPGRADES_TIER_3 = ["overlord", "necromancer", "manager", "overtrapper", "battleship", "factory"].map(x => x + "_diep")
        Class.hunter_diep.UPGRADES_TIER_3 = ["predator", "streamliner"].map(x => x + "_diep")
        Class.trapper_diep.UPGRADES_TIER_3 = ["triTapper", "gunnerTrapper", "overtrapper", "megaTrapper", "autoTrapper"].map(x => x + "_diep")

    Class.machineGun_diep.UPGRADES_TIER_2 = ["destroyer", "gunner"].map(x => x + "_diep")
        Class.machineGun_diep.UPGRADES_TIER_3 = ["sprayer"].map(x => x + "_diep")
        Class.destroyer_diep.UPGRADES_TIER_3 = ["hybrid", "annihilator", "skimmer", "rocketeer", "glider"].map(x => x + "_diep")
        Class.gunner_diep.UPGRADES_TIER_3 = ["autoGunner", "gunnerTrapper", "streamliner"].map(x => x + "_diep")

    Class.flankGuard_diep.UPGRADES_TIER_2 = ["triAngle", "quadTank", "twinFlank", "auto3"].map(x => x + "_diep")
        Class.triAngle_diep.UPGRADES_TIER_3 = ["booster", "fighter"].map(x => x + "_diep")
        //Class.quadTank_diep.UPGRADES_TIER_3
        //Class.twinFlank_diep.UPGRADES_TIER_3
        Class.auto3_diep.UPGRADES_TIER_3 = ["auto5", "autoGunner"].map(x => x + "_diep")

if (split_predator) {
    Class.predator_diep.LABEL = "X Hunter"
    Class.predator_diep.CONTROLLERS.pop()
    Class.predator_diep.TOOLTIP = ""
    Class.hunter_diep.UPGRADES_TIER_3.splice(1, 0, 'predator_old_diep')
}

if (tenth_birthday) {
    Config.level_cap = 60
    Config.level_cap_cheat = 60

    Class.annihilator_diep.UPGRADES_TIER_4 = ['ambusher'].map(x => x + '_diep')
    Class.auto5_diep.UPGRADES_TIER_4 = ['auto6', 'auto7'].map(x => x + '_diep')
    Class.factory_diep.UPGRADES_TIER_4 = ['automator'].map(x => x + '_diep')
    Class.necromancer_diep.UPGRADES_TIER_4 = ['resurrector'].map(x => x + '_diep')
    Class.octoTank_diep.UPGRADES_TIER_4 = ['decaTank'].map(x => x + '_diep')
    Class.overtrapper_diep.UPGRADES_TIER_4 = ['overovertrapper'].map(x => x + '_diep')
    Class.ranger_diep.UPGRADES_TIER_4 = ['hitman'].map(x => x + '_diep')
    Class.skimmer_diep.UPGRADES_TIER_4 = ['cyclone'].map(x => x + '_diep')
    Class.spike_diep.UPGRADES_TIER_4 = ['blender'].map(x => x + '_diep')
    Class.tank_diep.UPGRADES_TIER_4 = ['tenk'].map(x => x + '_diep')
    Class.triAngle_diep.UPGRADES_TIER_4 = ['striker'].map(x => x + '_diep')
    Class.triTapper_diep.UPGRADES_TIER_4 = ['defendersSon'].map(x => x + '_diep')
    Class.triplet_diep.UPGRADES_TIER_4 = ['tripleFlank'].map(x => x + '_diep')
    Class.twinFlank_diep.UPGRADES_TIER_4 = ['tripleFlank'].map(x => x + '_diep')

    if (split_predator) {
        Class.apexPredator_diep.LABEL = "Y Hunter"
        Class.apexPredator_diep.CONTROLLERS.pop()
        Class.apexPredator_diep.TOOLTIP = ""
        Class.predator_diep.UPGRADES_TIER_4.push('apexPredator_old_diep')
        Class.predator_old_diep.UPGRADES_TIER_4 = ['apexPredator_old'].map(x => x + '_diep')
    }
}

if (havre_tanks) {
    Class.quadTank_diep.UPGRADES_TIER_3.splice(1, 0, 'twinGuard_havre')
    Class.twinFlank_diep.UPGRADES_TIER_3.push('twinGuard_havre')
}
