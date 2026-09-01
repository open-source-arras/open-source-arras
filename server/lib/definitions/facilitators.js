const {statnames, basePolygonDamage, basePolygonHealth, dfltskl, smshskl} = require('./constants.js')
const g = require('./gunvals.js')
let skcnv = {
    atk: 6,
    spd: 4,
    dam: 3,
    shi: 5,
    str: 2,
    mob: 9,
    rld: 0,
    pen: 1,
    rgn: 8,
    hlt: 7,
}

// gun definitions
exports.combineStats = function (stats) {
    try {
        // Build a blank array of the appropiate length
        let data = {
            reload: 1,
            recoil: 1,
            shudder: 1,
            size: 1,
            health: 1,
            damage: 1,
            pen: 1,
            speed: 1,
            maxSpeed: 1,
            range: 1,
            density: 1,
            spray: 1,
            resist: 1
        };

        for (let object = 0; object < stats.length; object++) {
            let gStat = stats[object];
            if (Array.isArray(gStat)) {
                gStat = {
                    reload: gStat[0], recoil: gStat[1], shudder: gStat[2],
                    size: gStat[3], health: gStat[4], damage: gStat[5],
                    pen: gStat[6], speed: gStat[7], maxSpeed: gStat[8],
                    range: gStat[9], density: gStat[10], spray: gStat[11],
                    resist: gStat[12]
                };
            }
            data.reload *= gStat.reload ?? 1;
            data.recoil *= gStat.recoil ?? 1;
            data.shudder *= gStat.shudder ?? 1;
            data.size *= gStat.size ?? 1;
            data.health *= gStat.health ?? 1;
            data.damage *= gStat.damage ?? 1;
            data.pen *= gStat.pen ?? 1;
            data.speed *= gStat.speed ?? 1;
            data.maxSpeed *= gStat.maxSpeed ?? 1;
            data.range *= gStat.range ?? 1;
            data.density *= gStat.density ?? 1;
            data.spray *= gStat.spray ?? 1;
            data.resist *= gStat.resist ?? 1;
        }
        return data;
    } catch (err) {
        console.log(err);
        throw JSON.stringify(stats);
    }
}
exports.setBuild = (build) => {
    let skills = build.split(build.includes("/") ? "/" : "").map((r) => +r);
    if (skills.length !== 10)
        throw new RangeError("Build must be made up of 10 numbers");
    return [6, 4, 3, 5, 2, 9, 0, 1, 8, 7].map((r) => skills[r]);
}
exports.skillSet = (args) => {
    let skills = [0, 0, 0, 0, 0, 0, 0, 0, 0, 0];
    for (let s in args) {
        if (!args.hasOwnProperty(s)) continue;
        skills[skcnv[s]] = Math.round(Config.skill_cap * args[s]);
    }
    return skills;
}

// core functions
exports.dereference = type => {
    type = ensureIsClass(type);

    let output = JSON.parse(JSON.stringify(type));
    if (type.GUNS) {
        for (let i = 0; i < type.GUNS.length; i++) {
            if (output.GUNS[i].PROPERTIES) {
                output.GUNS[i].PROPERTIES.TYPE = type.GUNS[i].PROPERTIES.TYPE;
            }
        }
    }
    if (type.TURRETS) {
        for (let i = 0; i < type.TURRETS.length; i++) {
            output.TURRETS[i].TYPE = type.TURRETS[i].TYPE;
        }
    }
    if (type.PROPS) {
        for (let i = 0; i < type.PROPS.length; i++) {
            output.PROPS[i].TYPE = type.PROPS[i].TYPE;
        }
    }
    for (let key in output) {
        if (key.startsWith('UPGRADES_TIER_')) {
            delete output[key];
        }
    }
    return output;
}

// drone functions
exports.makeOver = (type, name = -1, options = {}) => {
    type = ensureIsClass(type);
    let output = exports.dereference(type);

    let angle = 180 - (options.angle ?? 125)
    let count = options.count ?? 2
    let independent = options.independent ?? false
    let cycle = options.cycle ?? true
    let maxChildren = options.maxDrones ?? 3
    let stats = options.extraStats ?? []
    let droneType = options.drive == true ? 'autoDrone' : 'drone'

    options.renderBehind ??= false

    let driveHat = [
        {
            TYPE: ['squareHat', {COLOR: 'grey'}],
            POSITION: {
                SIZE: 9,
                LAYER: 1
            }
        }
    ];
    let spawners = [];
    let spawnerProperties = {
        SHOOT_SETTINGS: exports.combineStats([g.drone, g.overseer, ...stats]),
        TYPE: [droneType, {INDEPENDENT: independent}],
        AUTOFIRE: true,
        SYNCS_SKILLS: true,
        STAT_CALCULATOR: 'drone',
        WAIT_TO_CYCLE: cycle,
        MAX_CHILDREN: maxChildren,
    }
    if (count % 2 == 1) {
        spawners.push({
            POSITION: {
                LENGTH: options.length ?? 6,
                WIDTH: options.width ?? 11,
                ASPECT: 1.2,
                X: 8,
                ANGLE: 180
            },
            PROPERTIES: spawnerProperties,
        })
    }
    for (let i = 2; i <= (count - count % 2); i += 2) {
        spawners.push(...exports.weaponMirror({
            POSITION: {
                LENGTH: options.length ?? 6,
                WIDTH: options.width ?? 11,
                ASPECT: 1.2,
                X: 8,
                ANGLE: 180 - angle * i / 2
            },
            PROPERTIES: spawnerProperties
        }))
    }
    if (options.renderBehind) {
        output.GUNS = type.GUNS == null ? spawners : spawners.concat(type.GUNS)
    } else {
        output.GUNS = type.GUNS == null ? spawners : type.GUNS.concat(spawners)
    }
    if (options.drive) {
        output.TURRETS = type.TURRETS == null ? driveHat : type.TURRETS.concat(driveHat)
    }
    output.LABEL = name == -1 ? "Over" + type.LABEL.toLowerCase() + (options.drive ? "drive" : "") : name
    if (type.UPGRADE_LABEL !== undefined) {
        output.UPGRADE_LABEL = output.LABEL;
    }
    return output
}
exports.makeBattle = (type, name = -1, options = {}) => {
    type = ensureIsClass(type);
    let output = exports.dereference(type);

    let angle = 180 - (options.angle ?? 125)
    let count = options.count ?? 2
    let independent = options.independent ?? false
    let cycle = options.cycle ?? true
    let maxChildren = options.maxDrones ?? 3
    let stats = options.extraStats ?? []

    options.renderBehind ??= false

    let spawners = [];
    let guidedSpawnerProperties = {
        SHOOT_SETTINGS: exports.combineStats([g.swarm, g.battleship, ...stats]),
        TYPE: ['swarm', {INDEPENDENT: independent}],
        STAT_CALCULATOR: 'swarm',
        LABEL: "Guided"
    }
    let autoSpawnerProperties = {
        SHOOT_SETTINGS: exports.combineStats([g.swarm, ...stats]),
        TYPE: 'autoswarm',
        STAT_CALCULATOR: 'swarm',
        LABEL: "Autonomous"
    }
    if (count % 2 == 1) {
        spawners.push(...exports.weaponMirror({
            POSITION: {
                LENGTH: options.length ?? 9,
                WIDTH: options.width ?? 7.2,
                ASPECT: 0.6,
                X: 5,
                Y: 4,
                ANGLE: 180,
            },
            PROPERTIES: autoSpawnerProperties,
        }, {delayIncrement: 0.5}))
    }
    for (let i = 2; i <= (count - count % 2); i += 2) {
        spawners.push(
            ...exports.weaponMirror({
                POSITION: {
                    LENGTH: options.length ?? 9,
                    WIDTH: options.width ?? 7.2,
                    ASPECT: 0.6,
                    X: 5,
                    Y: 4,
                    ANGLE: 180 - angle * i / 2,
                },
                PROPERTIES: guidedSpawnerProperties,
            }, {delayIncrement: 0.5}),
            ...exports.weaponMirror({
                POSITION: {
                    LENGTH: options.length ?? 9,
                    WIDTH: options.width ?? 7.2,
                    ASPECT: 0.6,
                    X: 5,
                    Y: 4,
                    ANGLE: 180 + angle * i / 2,
                },
                PROPERTIES: autoSpawnerProperties,
            }, {delayIncrement: 0.5})
        )
    }
    if (options.renderBehind) {
        output.GUNS = type.GUNS == null ? spawners : spawners.concat(type.GUNS)
    } else {
        output.GUNS = type.GUNS == null ? spawners : type.GUNS.concat(spawners)
    }
    output.LABEL = name == -1 ? "Battle" + type.LABEL.toLowerCase() : name
    if (type.UPGRADE_LABEL !== undefined) {
        output.UPGRADE_LABEL = output.LABEL;
    }
    return output
}

// gun functions
exports.makeBird = (type, name = -1, options = {}) => {
    type = ensureIsClass(type);
    let output = exports.dereference(type);
    let frontRecoilFactor = options.frontRecoil ?? 1;
    let backRecoilFactor = options.frontRecoil ?? 1;
    let color = options.frontRecoil;
    let dangerIncrement = options.danger ?? 1

    // Thrusters
    let backRecoil = 0.5 * backRecoilFactor;
    let thrusterProperties = {
        SHOOT_SETTINGS: exports.combineStats([g.basic, g.flankGuard, g.triAngle, g.thruster, { recoil: backRecoil }]),
        TYPE: "bullet",
        LABEL: "thruster"
    };
    let shootyBois = [
        ...exports.weaponMirror({
            POSITION: {
                LENGTH: 16,
                WIDTH: 8,
                ANGLE: 153,
                DELAY: 0.1
            },
            PROPERTIES: thrusterProperties
        }),
        {
            POSITION: {
                LENGTH: 18,
                WIDTH: 8,
                ANGLE: 180,
                DELAY: 0.6
            },
            PROPERTIES: thrusterProperties
        }
    ];
    if (options.super) {
        shootyBois.splice(0, 0, ...exports.weaponMirror({
            POSITION: {
                LENGTH: 14,
                WIDTH: 8,
                ANGLE: 130,
                DELAY: 0.6
            },
            PROPERTIES: thrusterProperties
        }))
    }
    // Assign thruster color
    if (color) for (let gun of shootyBois) {
        gun.PROPERTIES.TYPE = [gun.PROPERTIES.TYPE, { COLOR: color }];
    }

    // Modify front barrels
    for (let gun of output.GUNS) {
        if (gun.PROPERTIES) {
            gun.PROPERTIES.ALT_FIRE = true;
            // Nerf front barrels
            if (gun.PROPERTIES.SHOOT_SETTINGS) {
                gun.PROPERTIES.SHOOT_SETTINGS = exports.combineStats([gun.PROPERTIES.SHOOT_SETTINGS, g.flankGuard, g.triAngle, g.triAngleFront, {recoil: frontRecoilFactor}]);
            }
        }
    }
    // Assign misc settings
    if (output.FACING_TYPE == "locksFacing") output.FACING_TYPE = "toTarget";
    output.GUNS = type.GUNS == null ? [...shootyBois] : [...output.GUNS, ...shootyBois];
    output.LABEL = name == -1 ? "Bird " + type.LABEL : name;
    output.DANGER = type.DANGER + dangerIncrement ?? 7
    if (type.UPGRADE_LABEL !== undefined) {
        output.UPGRADE_LABEL = output.LABEL;
    }
    return output;
}
exports.makeFlank = (type, count, name = -1, options = {}) => {
    type = ensureIsClass(type)
    let output = exports.dereference(type)
    let extraStats = options.extraStats ??= []
    for (let gun of output.GUNS) {
        if (gun.PROPERTIES) {
            if (gun.PROPERTIES.SHOOT_SETTINGS) {
                gun.PROPERTIES.SHOOT_SETTINGS = exports.combineStats([gun.PROPERTIES.SHOOT_SETTINGS, ...extraStats])
            }
        }
    }
    output.GUNS = exports.weaponArray(output.GUNS, count ??= 3, {delayIncrement: options.delayIncrement ?? 0, delayOverflow: options.delayOverflow ?? false, startAngle: options.startAngle ?? 0, visualLayering: options.visualLayering ?? false})
    output.LABEL = name == -1 ? type.LABEL : name
    output.DANGER = options.danger ??= 6;
    output.HAS_NO_RECOIL = options.noRecoil ??= false
    return output
}
exports.makeGuard = (type, name = -1, options = {}) => {
    type = ensureIsClass(type)
    let output = exports.dereference(type)
    let dangerIncrement = options.danger ?? 2

    // Rear Trap Launcher
    let trapper = {
        GUNS: [
            {
                POSITION: {
                    LENGTH: 13,
                    WIDTH: 8
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
                    SHOOT_SETTINGS: exports.combineStats([g.trap]),
                    TYPE: 'trap',
                    STAT_CALCULATOR: 'trap'
                }
            }
        ]
    }
    if (options.type) {
        trapper = exports.dereference(options.type)
    }

    // Rotate 180 degrees
    for (let gun of trapper.GUNS) {
        if (gun.POSITION) {
            if (gun.POSITION.ANGLE) {
                gun.POSITION.ANGLE = gun.POSITION.ANGLE + 180
            } else {
                gun.POSITION.ANGLE = 180
            }
        }
    }

    // Add two more if we're making a Tri-Guard
    if (options.triple) {
        trapper.GUNS.push(
            ...exports.weaponArray(trapper.GUNS, 2, {startAngle: 90})
        )
    }

    // Nerf existing barrels
    if (output.GUNS) for (let gun of output.GUNS) {
        if (gun.PROPERTIES) {
            if (gun.PROPERTIES.SHOOT_SETTINGS) {
                gun.PROPERTIES.SHOOT_SETTINGS = exports.combineStats([gun.PROPERTIES.SHOOT_SETTINGS, g.flankGuard, g.flankGuard])
            }
        }
    }

    // Assign misc settings
    output.GUNS = type.GUNS == null ? trapper.GUNS : [...output.GUNS, ...trapper.GUNS]
    output.DANGER = type.DANGER + dangerIncrement
    output.LABEL = name == -1 ? type.LABEL + " Guard" : name
    if (type.UPGRADE_LABEL !== undefined) {
        output.UPGRADE_LABEL = output.LABEL;
    }
    output.STAT_NAMES = statnames.mixed
    return output
}
exports.makeGunner = (type, name = -1, options  = {}) => {
    type = ensureIsClass(type)
    let output = exports.dereference(type)

    // Rear Gunner
    let gunner = [
        ...exports.weaponMirror({
            POSITION: {
                LENGTH: options.gunLength ?? 19,
                WIDTH: 2,
                Y: -2.5,
                ANGLE: 180
            },
            PROPERTIES: {
                SHOOT_SETTINGS: exports.combineStats([g.basic, g.pelleter, g.power, g.twin, {recoil: 4}, {recoil: 1.8}]),
                TYPE: 'bullet',
            },
        }, {delayIncrement: 0.5})
    ]
    if (!options.noDeco) {
        gunner.push({
            POSITION: {
                LENGTH: 12,
                WIDTH: 11,
                ANGLE: 180
            }
        }
    )}

    // Assign misc settings
    if (options.renderBehind) {
        output.GUNS = type.GUNS == null ? gunner : gunner.concat(output.GUNS)
    } else {
        output.GUNS = type.GUNS == null ? gunner : output.GUNS.concat(gunner)
    }
    output.DANGER = type.DANGER + 1
    output.LABEL = name == -1 ? "Gunner " + type.LABEL : name
    if (type.UPGRADE_LABEL !== undefined) {
        output.UPGRADE_LABEL = output.LABEL;
    }
    return output
}

// turret functions
exports.makeAuto = (type, name = -1, options = {}) => {

    /*
    Available options:
    - type: what turret (or regular Class) to use as the mounted turret
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
    let output = exports.dereference(type);
    let autogun = exports.weaponArray({
        POSITION: {
            SIZE: options.size ??= 10,
            ANGLE: options.angle ??= 180,
            X: options.x ??= 0,
            Y: options.y ??= 0,
            ARC: options.arc ??= 360,
            LAYER: options.layer ??= 1
        },
        TYPE: [
            options.type ??= "autoTurret",
            {
                CONTROLLERS: ["nearestDifferentMaster"],
                INDEPENDENT: options.independent ??= true,
                COLOR: options.color ??= "grey"
            }
        ]
    }, options.total ??= 1);
    if (type.GUNS) {
        output.GUNS = type.GUNS;
    }
    if (!type.TURRETS || options.clearTurrets) {
        output.TURRETS = [...autogun];
    } else {
        output.TURRETS = [...type.TURRETS, ...autogun];
    }
    if (!type.PROPS || options.clearProps) {
        output.PROPS = [];
    } else {
        output.PROPS = [...type.PROPS];
    }
    if (name == -1) {
        output.LABEL = "Auto-" + type.LABEL;
        if (type.UPGRADE_LABEL !== undefined) {
            output.UPGRADE_LABEL = "Auto-" + type.LABEL;
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
exports.makeHat = (shape = 0, options = {}) => {
    options.rotationSpeed ??= 0
    if (!options.rotationSpeed == 0) {
        spinProperties = ["spin", {speed: options.rotationSpeed}]
    } else (
        spinProperties = ["toTarget"]
    )
    return {
        LABEL: "",
        FACING_TYPE: spinProperties,
        SHAPE: shape,
        COLOR: options.color ??= "mirror",
        INDEPENDENT: true,
        MIRROR_MASTER_ANGLE: options.mirror_angle ??= false
    }
}
exports.makeWhirlwind = (type, options = {}) => {
    type = ensureIsClass(type);
    let output = exports.dereference(type);
    options.satellites ??= 4
    let hat = [
        {
            POSITION: {SIZE: options.hatSize ??= 8, LAYER: options.hatLayer ??= 1},
            TYPE: [options.hat ??= "squareHat_spin", {COLOR: options.hatColor ??= "grey"}]
        }
    ]
    if (options.dualLayer || options.enableHat2) {
        hat.push(
            {
                POSITION: {SIZE: options.hat2Size ??= 6, ANGLE: 180, LAYER: options.hat2Layer ??= 2},
                TYPE: [options.hat2 ??= "squareHat_spin", {COLOR: options.hat2Color ??= "grey"}]
            }
        )
    }
    let satellites = (() => {
        let output = []
        for (let i = 0; i < options.satellites; i++) { 
            output.push({
                POSITION: {WIDTH: options.satelliteSize ??= 8, LENGTH: 1, DELAY: i * 0.25},
                PROPERTIES: {
                    SHOOT_SETTINGS: exports.combineStats([g.satellite, ...options.extraStats ??= [{}], {recoil: 0}]), 
                    TYPE: [options.satelliteType ??= "satellite", {ANGLE: i * (360 / options.satellites)}], 
                    MAX_CHILDREN: 1,
                    AUTOFIRE: true,
                    SYNCS_SKILLS: false,
                    WAIT_TO_CYCLE: true
                }
            })
        }
        if (options.dualLayer) {
            for (let i = 0; i < options.satellites; i++) { 
                output.push({
                    POSITION: {WIDTH: options.satelliteSize ??= 8, LENGTH: 1, DELAY: i * 0.25},
                    PROPERTIES: {
                        SHOOT_SETTINGS: exports.combineStats([g.satellite, ...options.extraStats ??= [{}], {recoil: 0}]), 
                        TYPE: [options.satelliteType ??= "satellite", {ANGLE: i * (360 / options.satellites), CONTROLLERS: [['orbit', {invert: true}]]}], 
                        MAX_CHILDREN: 1,
                        AUTOFIRE: true,
                        SYNCS_SKILLS: false,
                        WAIT_TO_CYCLE: true
                    }
                })
            }
        }
        return output
    })()
    if (type.GUNS == null) {output.GUNS = [...satellites]} else {output.GUNS = [...type.GUNS, ...satellites]}
    if (type.TURRETS == null) {output.TURRETS = [...hat]} else {output.TURRETS = [...type.TURRETS, ...hat]}
    if (type == Class.genericTank) {output.STAT_NAMES = statnames.satellite} else {output.STAT_NAMES = statnames.mixed}
    output.AI = {SPEED: options.satelliteSpeed ??= 2}
    output.ANGLE = (360 / options.satellites)
    if (type.CONTROLLERS == null) {output.CONTROLLERS = ["whirlwind"]} else {output.CONTROLLERS = [...type.CONTROLLERS, "whirlwind"]}
    output.DANGER = options.danger ??= type.DANGER + 1
    if (options.label == -1) {
        output.LABEL = "Whirl " + type.LABEL;
        if (type.UPGRADE_LABEL !== undefined) {
            output.UPGRADE_LABEL = "Whirl " + type.LABEL;
        }
    } else {
        output.LABEL = options.label;
        if (type.UPGRADE_LABEL !== undefined) {
            output.UPGRADE_LABEL = options.label;
        }
    }
    return output;
}
exports.makeRadialAuto = (type, options = {}) => {

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

    if (!isTurret) {
        type = exports.dereference(type);

        let extraStats = options.extraStats ?? [];
        if (!Array.isArray(extraStats)) {
            extraStats = [extraStats];
        }
        turretIdentifier = options.turretIdentifier ?? `auto${type.LABEL}Gun`;

        Class[turretIdentifier] = {
            PARENT: 'genericTank',
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

            gun.PROPERTIES.SHOOT_SETTINGS = exports.combineStats([gun.PROPERTIES.SHOOT_SETTINGS, g.autoTurret, ...extraStats])
        }
    }

    let LABEL = options.label ?? (type.LABEL + "-" + count);
    let HAS_NO_RECOIL = options.noRecoil ?? false;

    return {
        PARENT: 'genericTank',
        LABEL,
        HAS_NO_RECOIL,
        FACING_TYPE: ["spin", {speed: options.rotation ?? 0.02}],
        DANGER: options.danger ?? (type.DANGER + 2),
        BODY: options.body ?? undefined,
        GUNS: [],
        TURRETS: exports.weaponArray({
            TYPE: turretIdentifier,
            POSITION: {
                SIZE: options.size ?? 11,
                X: options.x ?? 8,
                ANGLE: options.angle ?? 0,
                ARC: options.arc ?? 190,
                LAYER: options.layer ?? 0
            }
        }, count)
    }
}
exports.makeTurret = (type, options = {}) => {

    /*
    - type: what Class to turn into an auto turret
    
    Available options:
    - canRepel: whether or not the auto turret can fire backwards with secondary fire
    - limitFov: whether or not the auto turret should bother to try to limit its FOV arc
    - hasAI: whether or not the auto turret can think and shoot on its own
    - extraStats: array of stats to append onto the shoot settings of all of the turret's guns
    - label: turret label
    - shape: turret body shape
    - color: turret color
    - fov: turret FOV
    - independent: turret independence
    */

    type = exports.dereference(type);

    let CONTROLLERS = [];
    if (options.canRepel) { // default false
        CONTROLLERS.push("canRepel", "mapAltToFire");
    }
    if (options.limitFov) { // default false
        CONTROLLERS.push("onlyAcceptInArc");
    }
    if (options.hasAI ?? true) { // default true
        if (options.forceOverride) {
            CONTROLLERS.push("doNothing");
        } else if (options.ignoreFoods) {
            CONTROLLERS.push(["nearestDifferentMaster", { ignoreFood: true }]);
        } else CONTROLLERS.push("nearestDifferentMaster");
    }

    let GUNS = type.GUNS;
    let extraStats = options.extraStats ?? [g.autoTurret];
    if (!Array.isArray(extraStats)) {
        extraStats = [extraStats];
    }
    for (let gun of GUNS) {
        if (!gun.PROPERTIES) continue;
        if (!gun.PROPERTIES.SHOOT_SETTINGS) continue;

        gun.PROPERTIES.SHOOT_SETTINGS = exports.combineStats([gun.PROPERTIES.SHOOT_SETTINGS, ...extraStats])
    }

    return {
        PARENT: 'genericTank',
        LABEL: options.label ?? "",
        SHAPE: options.shape ?? 0,
        COLOR: options.color ?? "grey",
        BODY: { FOV: options.fov ?? 2 },
        INDEPENDENT: options.independent ?? false,
        CONTROLLERS,
        GUNS,
        AI: options.aiSettings,
        FACING_TYPE: options.facingType ?? null,
        TURRETS: type.TURRETS,
    }
}
exports.makeAura = (damageFactor = 1, sizeFactor = 1, opacity = 0.3, auraColor) => {
    let isHeal = damageFactor < 0;
    let auraType = isHeal ? "healAura" : "aura";
    let symbolType = isHeal ? "healerHat" : "auraSymbol";
    auraColor = auraColor ?? (isHeal ? 12 : 0);
    return {
        PARENT: 'genericTank',
        INDEPENDENT: true,
        LABEL: "",
        COLOR: 17,
        GUNS: [
            {
                POSITION: [0, 20, 1, 0, 0, 0, 0,],
                PROPERTIES: {
                    SHOOT_SETTINGS: exports.combineStats([g.aura, { size: sizeFactor, damage: damageFactor }]),
                    TYPE: [auraType, {COLOR: auraColor, ALPHA: opacity}],
                    MAX_CHILDREN: 1,
                    AUTOFIRE: true,
                    SYNCS_SKILLS: true,
                }, 
            }, 
        ],
        TURRETS: [
            {
                POSITION: [20 - 7.5 * isHeal, 0, 0, 0, 360, 1],
                TYPE: [symbolType, {COLOR: auraColor, INDEPENDENT: true}],
            },
        ]
    };
}

exports.setTurretProjectileRecoil = (type, recoilFactor) => {
    type = exports.dereference(type);

    if (!type.GUNS) return;
    
    // Sets the recoil of each of the turret's guns to the desired value.
    for (let gun of type.GUNS) {
        if (!gun.PROPERTIES) continue;

        // Set gun type to account for recoil factor
        let finalType = gun.PROPERTIES.TYPE;
        if (!Array.isArray(finalType)) {
            finalType = [finalType, {}];
        }
        if (typeof finalType[1] != "object") {
            finalType[1] = {};
        }
        // Set via BODY.RECOIL_FACTOR
        if (!finalType[1].BODY) {
            finalType[1].BODY = {};
        }
        finalType[1].BODY.RECOIL_MULTIPLIER = recoilFactor;

        // Save changes
        gun.PROPERTIES.TYPE = finalType;
    }

    return type;
}

// misc functions
exports.makeMenu = (name = -1, options = {}) => {
    options.color ??= "mirror"

    return {
        PARENT: 'genericTank',
        LABEL: name == -1 ? undefined : name,
        COLOR: options.color == "mirror" ? null : options.color,
        REROOT_UPGRADE_TREE: options.rerootTree,
        UPGRADE_COLOR: options.boxColor,
        UPGRADE_LABEL: options.boxLabel,
        UPGRADE_TOOLTIP: options.tooltip,
        SHAPE: options.shape ??= 0,
        IGNORED_BY_AI: true,
        SKILL_CAP: Array(10).fill(dfltskl),
        RESET_CHILDREN: true,
        GUNS: options.guns ??= [
            {
                POSITION: {
                    LENGTH: 18,
                    WIDTH: 10,
                    ASPECT: -1.4
                },
                PROPERTIES: {
                    SHOOT_SETTINGS: exports.combineStats([g.basic]),
                    TYPE: "bullet"
                }
            }
        ],
        PROPS: options.props ??= [],
        TURRETS: options.turrets ??= [],
        UPGRADES_TIER_0: options.upgrades ??= []
    };
}
exports.weaponArray = (weapons, count, options = {}) => {
    // delayIncrement: how much each side's delay increases by
    // delayOverflow: false to constrain the delay value between [0, 1)
    if (!Array.isArray(weapons)) {
        weapons = [weapons]
    }
    let isTurret = weapons[0].TYPE != undefined;
    let angleKey = isTurret ? 3 : 5;
    let delayKey = 6;
    let layerKey = 7;
    let angleIncrement = options.startAngle ?? 0
    let delayIncrement = options.delayIncrement ?? 0

    let output = [];
    for (let weapon of weapons) {
        for (let i = 0; i < count; i++) {
            let angle = 360 / count * i + angleIncrement;
            let delay = delayIncrement * i;
            let newWeapon = exports.dereference(weapon);

            if (!Array.isArray(newWeapon.POSITION)) {
                angleKey = "ANGLE";
                delayKey = "DELAY";
                layerKey = "LAYER";
            }

            newWeapon.POSITION[angleKey] = (newWeapon.POSITION[angleKey] ?? 0) + angle;
            if (!isTurret) {
                newWeapon.POSITION[delayKey] = (newWeapon.POSITION[delayKey] ?? 0) + delay;
                if (!options.delayOverflow) {
                    newWeapon.POSITION[delayKey] %= 1;
                }
                if (options.visualLayering && !(i % 2 === 0)) {
                    newWeapon.POSITION[layerKey] = (newWeapon.POSITION[layerKey] ?? 0) - 1
                }
            }
            output.push(newWeapon);
        }
    }
    return output;
}
exports.weaponMirror = (weapons, options = {}) => {

    /*
    - weapons: what guns to mirror
    
    Available options:
    - delayIncrement: delay increment for mirrored guns
    - delayOverflow: whether the gun delay can exceed 1 or not, default false
    */

    if (!Array.isArray(weapons)) {
        weapons = [weapons]
    }
    let isTurret = weapons[0].TYPE != undefined;
    let yKey = isTurret ? 2 : 4;
    let angleKey = isTurret ? 3 : 5;
    let delayKey = 6;

    options.delayIncrement ??= 0
    options.delayOverflow ??= false

    let output = [];
    for (let weapon of weapons) {
        let newWeapon = exports.dereference(weapon);

        if (!Array.isArray(newWeapon.POSITION)) {
            yKey = "Y";
            angleKey = "ANGLE";
            delayKey = "DELAY";
        }

        newWeapon.POSITION[yKey] = (newWeapon.POSITION[yKey] ?? 0) * -1;
        newWeapon.POSITION[angleKey] = (newWeapon.POSITION[angleKey] ?? 0) * -1;
        newWeapon.POSITION[delayKey] = (newWeapon.POSITION[delayKey] ?? 0) + options.delayIncrement;
        if (!options.delayOverflow) {
            newWeapon.POSITION[delayKey] %= 1;
        }
        output.push(weapon, newWeapon);

    }
    return output;
}
exports.weaponStack = (weapons, count, options = {}) => {

    /*
    - weapons: what guns to stack
    
    Available options:
    - count: number of guns in the stack
    - lengthOffset: distance between stack gun lengths
    - xPosOffset: distance between stack gun x positions
    - delayIncrement: delay increment between stack guns
    - delayOverflow: whether the gun delay can exceed 1 or not, default false
    */

    if (!Array.isArray(weapons)) {
        weapons = [weapons]
    }
    let isTurret = weapons[0].TYPE != undefined;
    let lengthKey = 0;
    let xPosKey = isTurret ? 1 : 3;
    let delayKey = 6;

    options.lengthOffset ??= 0
    options.xPosOffset ??= 0
    options.delayIncrement ??= 0
    options.delayOverflow ??= false

    let output = [];
    for (let weapon of weapons) {
        for (let i = 0; i < count; i++) {
            let delay = options.delayIncrement * i;
            let newWeapon = exports.dereference(weapon);

            if (!Array.isArray(newWeapon.POSITION)) {
                lengthKey = "LENGTH";
                xPosKey = "X";
                delayKey = "DELAY";
            }

            newWeapon.POSITION[lengthKey] = (newWeapon.POSITION[lengthKey] ?? 0) - (i * options.lengthOffset);
            newWeapon.POSITION[xPosKey] = (newWeapon.POSITION[xPosKey] ?? 0) - (i * options.xPosOffset);
            newWeapon.POSITION[delayKey] = (newWeapon.POSITION[delayKey] ?? 0) + delay;
            if (!options.delayOverflow) {
                newWeapon.POSITION[delayKey] %= 1;
            }
            output.push(newWeapon);
        }
    }
    return output;
}
function rotatePoint(px, py, cx, cy, degrees) {
    const radians = degrees * (Math.PI / 180);

    const x = px - cx;
    const y = py - cy;

    let rotatedX = x * Math.cos(radians) - y * Math.sin(radians);
    let rotatedY = x * Math.sin(radians) + y * Math.cos(radians);
    if (Math.abs(rotatedX) < 0.01) {
        rotatedX = 0
    }
    if (Math.abs(rotatedY) < 0.01) {
        rotatedY = 0
    }
    return {
        x: rotatedX + cx,
        y: rotatedY + cy
    };
}
let pslazyRealSizes = [1, 1, 1];
for (let i = 3; i < 17; i++) {
    // We say that the real size of a 0-gon, 1-gon, 2-gon is one, then push the real sizes of triangles, squares, etc...
    let circum = (2 * Math.PI) / i;
    pslazyRealSizes.push(Math.sqrt(circum * (1 / Math.sin(circum))));
}

exports.makePolygon = (options = {}) => {
    let svgPoints = [];
    let svgPoints2 = [];
    let svgPoints3 = [];
    options.sides ??= 3
    options.size ??= 1
    options.fixSize ??= false
    options.fixSize = options.fixedSize
    options.curvy ??= false
    options.curve ??= 1
    options.hollow ??= false
    options.hollowMultiplier ??= 0.5
    options.rotation ??= 0
    if (options.fixSize === true) {
        if (pslazyRealSizes.length > Math.abs(options.sides)) {
            options.size = pslazyRealSizes[options.sides]
        }
    }
    if (options.curvy === true) {
        for(let i = 0; i < options.sides + 1; i++) {
            svgPoints.push(rotatePoint(options.size, 0, 0, 0, options.rotation+(360/options.sides)*i))
        }
    } else {
        for(let i = 0; i < options.sides; i++) {
            svgPoints.push(rotatePoint(options.size, 0, 0, 0, options.rotation+(360/options.sides)*i))
        }
    }
    if (options.hollow === true) {
        if (options.curvy === true) {
            for(let i = 0; i < options.sides + 1; i++) {
                svgPoints.push(rotatePoint(options.size * options.hollowMultiplier, 0, 0, 0, options.rotation-(360/options.sides)*i))
            }
        } else {
            for(let i = 0; i < options.sides; i++) {
                svgPoints.push(rotatePoint(options.size * options.hollowMultiplier, 0, 0, 0, options.rotation-(360/options.sides)*i))
            }
        }
    }
    if (options.curvy === true) {
        for(let i = 0; i < options.sides + 1; i++) {
            if (i !== 0) {
                svgPoints2.push("A " + options.curve + " " + options.curve + " 0 0 0", svgPoints[i].x);
                svgPoints2.push(svgPoints[i].y);
            } else {
                svgPoints2.push("L", svgPoints[i].x);
                svgPoints2.push(svgPoints[i].y);
            }
        }
    } else {
        for(let i = 0; i < options.sides; i++) {
            svgPoints2.push("L", svgPoints[i].x);
            svgPoints2.push(svgPoints[i].y);
        }
    }
    if (options.hollow === true) {
        if (options.curvy === true) {
            for(let i = 0; i < options.sides + 1; i++) {
                if (i !== 0) {
                    svgPoints3.push("A " + options.curve + " " + options.curve + " 0 0 0", svgPoints[i].x);
                    svgPoints3.push(svgPoints[i+options.sides].y);
                } else {
                    svgPoints3.push("L", svgPoints[i].x);
                    svgPoints3.push(svgPoints[i+options.sides].y);
                }
            }
        } else {
            for(let i = 0; i < options.sides; i++) {
                svgPoints3.push("L", svgPoints[i+options.sides].x);
                svgPoints3.push(svgPoints[i+options.sides].y);
            }
        }
    }
    if (options.hollow === true) {
        return "M " + svgPoints2.toString().replaceAll(",", " ").slice(2) + " Z" +  " M " + svgPoints3.toString().replaceAll(",", " ").slice(2) + " Z"
    } else {
        return "M " + svgPoints2.toString().replaceAll(",", " ").slice(2) + " Z"
    }
}

class LayeredBoss {
    constructor(identifier, NAME, PARENT = "celestial", SHAPE = 9, COLOR = 0, trapTurretType = "baseTrapTurret", trapTurretSize = 6.5, layerScale = 5, noSizeAn = false, BODY, SIZE, VALUE) {
        this.identifier = identifier ?? NAME.charAt(0).toLowerCase() + NAME.slice(1);
        this.layerID = 0;
        Class[this.identifier] = {
            PARENT, SHAPE, NAME, COLOR, BODY, SIZE, VALUE,
            UPGRADE_LABEL: NAME,
            UPGRADE_COLOR: COLOR,
            NO_SIZE_ANIMATION: noSizeAn,
            TURRETS: Array(SHAPE).fill().map((_, i) => ({
                POSITION: [trapTurretSize, 9, 0, 360 / SHAPE * (i + 0.5), 180, 0],
                TYPE: trapTurretType,
            })),
        };
        this.layerScale = layerScale;
        this.shape = SHAPE;
        this.layerSize = 20;
    }

    addLayer({gun, turret}, decreaseSides = true, layerScale, MAX_CHILDREN) {
        this.layerID++;
        this.shape -= decreaseSides ? 2 : 0;
        this.layerSize -= layerScale ?? this.layerScale;
        let layer = {
            PARENT: 'genericTank',
            LABEL: "",
            SHAPE: this.shape,
            COLOR: -1,
            INDEPENDENT: true,
            FACING_TYPE: ["spin", { speed: 0.05 / 1.5 * (this.layerID % 2 ? -1 : 1), }],
            MAX_CHILDREN, 
            GUNS: [],
            TURRETS: [],
        };
        if (gun) {
            for (let i = 0; i < this.shape; i++) {
                layer.GUNS.push({
                    POSITION: gun.POSITION.map(n => n ?? 360 / this.shape * (i + 0.5)),
                    PROPERTIES: gun.PROPERTIES,
                });
            }
        }
        if (turret) {
            for (let i = 0; i < this.shape; i++) {
                layer.TURRETS.push({
                    POSITION: turret.POSITION.map(n => n ?? 360 / this.shape * (i + 0.5)),
                    TYPE: turret.TYPE,
                });
            }
        }

        Class[this.identifier + "Layer" + this.layerID] = layer;
        Class[this.identifier].TURRETS.push({
            POSITION: [this.layerSize, 0, 0, 0, 360, 1],
            TYPE: this.identifier + "Layer" + this.layerID,
        });
    }
}
exports.LayeredBoss = LayeredBoss;

// Food facilitators
exports.makeRelic = (type, scale = 1, gem, SIZE, yBase = 8.25) => {
    // Code by Damocles (https://discord.com/channels/366661839620407297/508125275675164673/1090010998053818488)
    // Albeit heavily modified because the math in the original didn't work LOL
    type = ensureIsClass(type);
    let relicCasing = {
        PARENT: 'genericEntity',
        LABEL: 'Relic Casing',
        LEVEL_CAP: 45,
        COLOR: type.COLOR,
        MIRROR_MASTER_ANGLE: true,
        SHAPE: [[-0.4,-1],[0.4,-0.25],[0.4,0.25],[-0.4,1]].map(r => r.map(s => s * scale))
    }, relicBody = {
        PARENT: 'genericEntity',
        LABEL: 'Relic Mantle',
        LEVEL_CAP: 45,
        COLOR: type.COLOR,
        MIRROR_MASTER_ANGLE: true,
        SHAPE: type.SHAPE
    };
    Class[Math.random().toString(36)] = relicCasing;
    Class[Math.random().toString(36)] = relicBody;
    let width = 6 * scale,
        y = yBase + ((scale % 1) * 5),
        isEgg = type.SHAPE == 0,
        casings = isEgg ? 8 : type.SHAPE,
        fraction = 360 / casings,
        GUNS = [],
        TURRETS = [{ POSITION: [32.5, 0, 0, 0, 0, 0], TYPE: relicBody }],
        PARENT = type,
        additionalAngle = type.SHAPE % 2 === 0 ? 0 : fraction / 2;

    for (let i = 0; i < casings; i++) {
        let angle = i * fraction,
            gunAngle = angle + additionalAngle;
        if (isEgg) {
            GUNS.push({
                POSITION: [4, width, 2.5, 12,  0, gunAngle, 0]
            });
            TURRETS.push({
                POSITION: [8, -15,  0, angle, 0, 1],
                TYPE: relicCasing
            });
        } else {
            GUNS.push({
                POSITION: [4, width, 2.5, 12,  y, gunAngle, 0]
            });
            GUNS.push({
                POSITION: [4, width, 2.5, 12, -y, gunAngle, 0]
            });
            TURRETS.push({
                POSITION: [8, -15,  y, angle, 0, 1],
                TYPE: relicCasing
            });
            TURRETS.push({
                POSITION: [8, -15, -y, angle, 0, 1],
                TYPE: relicCasing
            });
        }
    }

    if (gem) {
        TURRETS.push({
            POSITION: [8, 0, 0, 0, 0, 1],
            TYPE: [gem, { MIRROR_MASTER_ANGLE: true }]
        });
    }

    let out = {
        PARENT,
        LABEL: type.LABEL + ' Relic',
        COLOR: "white", // This is the color of the floor, this makes it look hollow.
        BODY: {
            ACCELERATION: 0.001
        },
        CONTROLLERS: [],
        VALUE: type.VALUE * 100_000,
        GUNS,
        TURRETS
    };

    if (SIZE) {
        out.SIZE = SIZE;
    }

    return out;
}

exports.makeCrasher = type => ({
    PARENT: type,
    COLOR: 'pink',
    TYPE: 'crasher',
    LABEL: 'Crasher ' + type.LABEL,
    CONTROLLERS: ['nearestDifferentMaster', 'mapTargetToGoal'],
    MOTION_TYPE: "motor",
    FACING_TYPE: "smoothWithMotion",
    HITS_OWN_TYPE: "hard",
    HAS_NO_MASTER: true,
    VALUE: type.VALUE * 5,
    BODY: {
        SPEED: 1 + 5 / Math.max(2, (type.PROPS.length ?? 0) + type.SHAPE),
        HEALTH: Math.pow(type.BODY.HEALTH, 2/3),
        DAMAGE: Math.pow(type.BODY.HEALTH, 1/3) * type.BODY.DAMAGE,
        ACCELERATION: 5,
        PUSHABILITY: 0.5,
        DENSITY: 10
    },
    AI: {
        NO_LEAD: true,
    }
});

exports.makeRare = (type, level) => {
    type = ensureIsClass(type);
    return {
        PARENT: "food",
        LABEL: ["Shiny", "Legendary", "Shadow", "Rainbow", "Trans"][level] + " " + type.LABEL,
        VALUE: [100, 500, 2000, 4000, 5000][level] * type.VALUE,
        SHAPE: type.SHAPE,
        SIZE: type.SIZE,
        GLOW:  {
            RADIUS: 2,
            STRENGTH: 25,
            COLOR: ["lime", "teal", "darkGrey", "rainbow", "trans"][level],
            ALPHA: 0.6
        },
        COLOR: ["lime", "teal", "darkGrey", "rainbow", "trans"][level],
        ALPHA: level == 2 ? 0.25 : 1,
        BODY: {
            DAMAGE: [1, 1, 2, 2.5, 2.5][level] * type.BODY.DAMAGE,
            DENSITY: [1, 1, 2, 2.5, 2.5][level] * type.BODY.DENSITY,
            HEALTH: [2, 4, 4, 6, 8][level] * type.BODY.HEALTH,
            PENETRATION: [1.5, 1.5, 2, 2.5, 2.5][level] * type.BODY.PENETRATION,
            ACCELERATION: type.BODY.ACCELERATION
        },
        DRAW_HEALTH: true,
        INTANGIBLE: type.INTANGIBLE,
        GIVE_KILL_MESSAGE: true,
    }
}

const labyTierToHealth = {
    0: 0.25,
    1: 10,
    2: 20,
    3: 150,
    4: 300
};

// not accurate values
const labyRarityToScore = {
    1: 5,
    2: 10,
    3: 40,
    4: 100,
    5: 250
};

const labyRarityToHealth = {
    1: 2,
    2: 4,
    3: 6,
    4: 8,
    5: 10
};

exports.makeLaby = (type, tier, rarity, level, baseScale = 1) => {
    type = ensureIsClass(type);
    let usableSHAPE = Math.max(type.SHAPE, 3),
        downscale = Math.cos(Math.PI / usableSHAPE),
        healthMultiplier = Math.pow(5, level) - (level > 2 ? Math.pow(5, level) / Math.pow(5, level - 2) : 0);
    return {
        PARENT: 'food',
        LABEL: ['', 'Beta ', 'Alpha ', 'Omega ', 'Gamma ', 'Delta '][level] + type.LABEL,
        VALUE: util.getReversedJackpot(
            Math.min(
                5e6,
                (tier == 0
                    ? 30 * (level > 1 ? Math.pow(6, level - 1) : level) + 8
                    : 30 * Math.pow(5, tier + level - 1)) *
                    (labyRarityToScore[rarity] || 1)
            )
        ),
        SHAPE: type.SHAPE,
        SIZE: (type.SIZE * baseScale) / downscale ** level,
        COLOR: type.COLOR,
        ALPHA: type.ALPHA ?? 1,
        BODY: {
            DAMAGE: type.BODY.DAMAGE,
            DENSITY: type.BODY.DENSITY,
            HEALTH:
                (labyTierToHealth[tier] || 1) *
                healthMultiplier *
                (labyRarityToHealth[rarity] || 1),
            PENETRATION: type.BODY.PENETRATION,
            PUSHABILITY: type.BODY.PUSHABILITY / (level + 1) || 0,
            ACCELERATION: type.BODY.ACCELERATION,
            SHIELD: 0,
            REGEN: 0
        },
        INTANGIBLE: type.INTANGIBLE,
        VARIES_IN_SIZE: false,
        DRAW_HEALTH: type.DRAW_HEALTH && tier != 0,
        GIVE_KILL_MESSAGE: type.GIVE_KILL_MESSAGE || level > 1,
        GUNS: type.GUNS ?? [],
        TURRETS: type.TURRETS ?? [],
        PROPS: Array(level).fill().map((_, i) => ({
            POSITION: [
                20 * downscale ** (i + 1),
                0,
                0,
                !(i & 1) ? 180 / usableSHAPE : 0,
                1
            ],
            TYPE: [type, { COLOR: 'mirror' }]
        }))
    };
};
exports.makeRarities = (types = []) => {
    for (type of types) {
        const ct = type.charAt(0).toUpperCase() + type.slice(1);
        const rarities = ["shiny", "legendary", "shadow", "rainbow", "trans"];
        for (let i = 0; i < rarities.length; i++) {
            const pn = `${rarities[i]}${ct}`;
            Class[pn] = exports.makeRare(`${type}`, [i]);
        }
    }
}

// Merry Christmas and happy holidays!
exports.makePresent = (outcolor, wrapcolor) => {
    return {
        PARENT: "food",
        LABEL: "Present",
        VALUE: 6e3,
        SHAPE: 4,
        SIZE: 25,
        COLOR: outcolor,
        BODY: {
            DAMAGE: basePolygonDamage,
            DENSITY: 50,
            HEALTH: 10 * basePolygonHealth,
            RESIST: 3,
            PENETRATION: 1.1,
            ACCELERATION: 0.02
        },
        DRAW_HEALTH: true,
        PROPS: [
            {
                TYPE: ["healerHat", {COLOR: wrapcolor}],
                POSITION: {
                    SIZE: 19.5,
                    LAYER: 1
                }
            }
        ]
    }
}

// Created by DenisC!!!
/**
 * @param {{
 *   VERTEXES?: [number, number, number][],
 *   FACES: number[] | [number, number, number][][],
 *   SCALE?: number,
 *   VERTEXES_SCALE?: number
 * }} info
 * @returns {`3d=${string}`}
 */
exports.makePolyhedron = function (info) {
    let vertexes, faces;

    if (info.VERTEXES) vertexes = info.VERTEXES;

    if (!info.FACES) {
        throw new Error('FACES are not set');
    } else if (!vertexes) {
        vertexes = [];
        faces = [];
        for (const face of info.FACES) {
            const current = [];
            for (const vertex of face) {
                let index = vertexes.findIndex(
                    x => x[0] == vertex[0] && x[1] == vertex[1] && x[2] == vertex[2]
                );
                if (index == -1) {
                    index = vertexes.push(vertex) - 1;
                }
                current.push(index);
            }
            faces.push(current);
        }
    } else {
        faces = info.FACES;
    }

    const vertScale = info.VERTEXES_SCALE || 1;

    if (vertScale != 1) {
        vertexes = vertexes.map(x => [
            x[0] * vertScale,
            x[1] * vertScale,
            x[2] * vertScale
        ]);
    }

    return (
        '3d=' +
        vertexes.flat().join(',') +
        '/' +
        faces.map(i => i.join(',')).join(';') +
        '/' +
        (info.SCALE || 1)
    );
};

/**
 * @param {{
 *   VERTEXES?: [number, number, number, number][],
 *   FACES: number[] | [number, number, number, number][][],
 *   SCALE?: number,
 *   VERTEXES_SCALE?: number
 * }} info
 * @returns {`4d=${string}`}
 */
exports.makePolychoron = function (info) {
    let vertexes, faces;

    if (info.VERTEXES) vertexes = info.VERTEXES;

    if (!info.FACES) {
        throw new Error('FACES are not set');
    } else if (!vertexes) {
        vertexes = [];
        faces = [];
        for (const face of info.FACES) {
            const current = [];
            for (const vertex of face) {
                let index = vertexes.findIndex(
                    x => x[0] == vertex[0] && x[1] == vertex[1] && x[2] == vertex[2] && x[3] == vertex[3]
                );
                if (index == -1) {
                    index = vertexes.push(vertex) - 1;
                }
                current.push(index);
            }
            faces.push(current);
        }
    } else {
        faces = info.FACES;
    }

    const vertScale = info.VERTEXES_SCALE || 1;

    if (vertScale != 1) {
        vertexes = vertexes.map(x => [
            x[0] * vertScale,
            x[1] * vertScale,
            x[2] * vertScale,
            x[3] * vertScale
        ]);
    }

    return (
        '4d=' +
        vertexes.flat().join(',') +
        '/' +
        faces.map(i => i.join(',')).join(';') +
        '/' +
        (info.SCALE || 1)
    );
};

// tgs
exports.addUpgrades = (type, tier, upgrades = [], options = {}) => {
    name = ensureIsClass(type);
    upgradeList = upgrades.map(x => x + (options.suffix ??= ''));
    startValue = options.start ?? -1;

    if (name[`UPGRADES_TIER_${tier}`] == undefined) {
        return name[`UPGRADES_TIER_${tier}`] = upgradeList;
    };
    if (startValue !== -1) {
        return name[`UPGRADES_TIER_${tier}`].splice(startValue, 0, ...upgradeList);
    };
    name[`UPGRADES_TIER_${tier}`].push(...upgradeList);
};
exports.removeUpgrades = (type, tier, upgrades = []) => {
    typeUpgrades = Class[type][`UPGRADES_TIER_${tier}`]
    if (typeUpgrades == undefined) return;
    for (let i = typeUpgrades.length - 1; i >= 0; i--) {
        let string = typeUpgrades[i];
        for (const upgrade of upgrades) if (string === upgrade) {
            typeUpgrades.splice(i, 1)
        }
    }
};

exports.makeSnake = (type, count = 2, name = -1, options = {}) => {
    type = ensureIsClass(type);

    let segment = exports.dereference(type);
    segment.CAN_BE_ON_LEADERBOARD = false;
    segment.CLEAR_ON_MASTER_UPGRADE = true;
    segment.DISPLAY_NAME = false;
    segment.GUNS = options.segmentGuns ??= segment.GUNS
    segment.PROPS = options.segmentProps ??= segment.PROPS
    segment.TURRETS = options.segmentTurrets ??= segment.TURRETS

    let output = exports.dereference(type);
    output.LABEL = name == -1 ? "Snake " + type.LABEL : name;
    output.DANGER = options.danger ??= output.DANGER + 1
    output.ON = [
        {
            event: 'tick',
            handler: ({body}) => {
                const numOfSegments = count;
                const segmentClass = segment;

                body.store.snakeSegments ??= [];
                body.tick ??= 0;
                body.tick++

                if (body.store.snakeSegments.length < numOfSegments) {
                    if (body.tick % 30 == 0) {
                        let seg = new Entity(body, body);
                        seg.master = body;
                        seg.source = body;
                        seg.color = body.color;
                        seg.skill.score = body.skill.score;
                        seg.define(segmentClass);
                        body.store.snakeSegments.push(seg);
                    }
                }
                body.store.snakeSegments = body.store.snakeSegments.filter((x)=>!x.isDead())

                let previous = body;
                const children = body.store.snakeSegments;

                for (const child of children) {
                    const dx = child.x - previous.x;
                    const dy = child.y - previous.y;
                    const distance = Math.hypot(dx, dy) || 1; // /0 possible ig
                    const factor = (child.size + previous.size) * 1 / distance;
        
                    child.x = previous.x + dx * factor;
                    child.y = previous.y + dy * factor;
                    child.velocity.x = 0; // No natural move!
                    child.velocity.y = 0; // No natural move!
                    child.life();
                    previous = child;
                }
            }
        }
    ];
    return output;
}
