const { combineStats, skillSet, makeAuto, makeRadialAuto, weaponArray, weaponMirror, weaponStack } = require("../../facilitators.js");
const { base, dfltskl, statnames } = require("../../constants.js");
const { getDistance } = require("../../../util.js");
const g = require("../../gunvals.js");
const preset = require("../../presets.js");

// Special Tanks (Dominators)
Class.dominator = {
    PARENT: "genericTank",
    LABEL: "Dominator",
    UPGRADE_LABEL: "Unknown",
    ON_MINIMAP: false,
    DANGER: 7,
    SKILL: skillSet({
        rld: 1,
        dam: 1,
        pen: 1,
        str: 1,
        spd: 1
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
    UPGRADE_LABEL: "Destroyer",
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
    UPGRADE_LABEL: "Gunner",
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
    UPGRADE_LABEL: "Trapper",
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
    PARENT: "dominator",
    LABEL: "Sanctuary",
    DISPLAY_NAME: false,
    DISPLAY_SCORE: false,
    LEVEL: 45,
    SIZE: 20,
    FACING_TYPE: ["spin", {speed: 0.025}],
    SKILL: skillSet({
        rld: 1.25,
        dam: 1.25,
        str: 1.25
    }),
    BODY: {
        HEALTH: 1280,
        DAMAGE: 5.5,
        SHIELD: base.SHIELD * 1.2
    },
    TURRETS: [
        {
            TYPE: "dominationBody",
            POSITION: {
                SIZE: 22
            }
        }
    ]
};
let sancTiers = [3, 6, 8, 9, 10, 12];
let sancHealerTiers = [2, 3, 4];
for (let tier of sancHealerTiers) {
    Class["sanctuaryHealerTier" + (sancHealerTiers.indexOf(tier) + 1)] = {
        PARENT: "sanctuaryHealer",
        FACING_TYPE: ["spin", {speed: -0.06}],
        GUNS: weaponArray([
            {
                POSITION: {
                    LENGTH: 6,
                    WIDTH: 9,
                    ASPECT: -0.5,
                    X: 12.5
                }
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
                    TYPE: "healerSanctuaryBullet",
                    AUTOFIRE: true
                }
            }
        ], tier)
    }
};
for (let tier of sancTiers) {
    let sancIndex = sancTiers.indexOf(tier)
    Class["sanctuaryTier" + (sancIndex + 1)] = {
        PARENT: "sanctuary",
        TURRETS: [],
        UPGRADE_LABEL: "Tier " + (sancIndex + 1),
        GUNS: weaponArray([
            {
                POSITION: {LENGTH: 12, WIDTH: 4}
            }, {
                POSITION: {LENGTH: 1.5, WIDTH: 4, ASPECT: 1.7, X: 12},
                PROPERTIES: {
                    SHOOT_SETTINGS: combineStats([g.trap, {shudder: 0.15, health: 7, reload: 1.5, speed: 1}]),
                    TYPE: ["trap", {BODY: {PUSHABILITY: 0.5}}],
                    STAT_CALCULATOR: "trap",
                    AUTOFIRE: true
                }
            }
        ], tier)
    }
    Class["sanctuaryTier" + (sancIndex + 1)].TURRETS.push({
        POSITION: { SIZE: 22 },
        TYPE: "dominationBody"
    }, {
        POSITION: { SIZE: 9.3, LAYER: 1 },
        TYPE: "sanctuaryHealerTier" + (sancIndex < 2 ? 1 : sancIndex < 4 ? 2 : sancIndex < 6 ? 3 : 3)
    })
};

// Special Tanks (Motherships)
Class.mothership = {
    PARENT: "genericTank",
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
        DAMAGE: 1.5
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
                WAIT_TO_CYCLE: true
            }
        }, {
            POSITION: [4.3, 3.1, 1.2, 8, 0, 45, 1/32],
            PROPERTIES: {
                MAX_CHILDREN: 2,
                SHOOT_SETTINGS: combineStats([g.drone, g.overseer, g.mothership]),
                TYPE: ["drone", {
                    AI: {skynet: true},
                    INDEPENDENT: true,
                    BODY: {FOV: 2}
                }],
                AUTOFIRE: true,
                SYNCS_SKILLS: true,
                STAT_CALCULATOR: "drone",
                WAIT_TO_CYCLE: true
            }
        }
    ], 8, {delayIncrement: 1/16})
};
Class.flagship = {
    PARENT: "mothership",
    LABEL: "Flagship",
    NAME: "Flagship",
    TURRETS: [
        {
            TYPE: "flagshipTurret",
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
    LABEL: "",
    SIZE: 6.45
};
Class.turkeyEye = {
    COLOR: 18,
    LABEL: "",
    TURRETS: [
        {
            POSITION: [10.75, 1, 0, 0, 360, 1],
            TYPE: "turkeyNose"
        }
    ] 
};
Class.turkeyHead = {
    LABEL: "Turkey",
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
    PARENT: "genericTank",
    LABEL: "Turkey",
    NAME: "Turkey",
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
        DAMAGE: 1.5
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
                WAIT_TO_CYCLE: true
            }
        },
        { 
            POSITION: [20.96, 6.69, 1, 0, 0, 157.5, 0],
            PROPERTIES: {
                SHOOT_SETTINGS: combineStats([g.drone, g.overseer, g.mothership]),
                TYPE: "drone",
                AUTOFIRE: true,
                SYNCS_SKILLS: true,
                STAT_CALCULATOR: "drone",
                WAIT_TO_CYCLE: true
            } 
        },
        {
            POSITION: [18, 4.69, 1, 0, 0, 225, 0],
            PROPERTIES: {
                SHOOT_SETTINGS: combineStats([g.drone, g.overseer, g.mothership]),
                TYPE: "drone",
                AUTOFIRE: true,
                SYNCS_SKILLS: true,
                STAT_CALCULATOR: "drone",
                WAIT_TO_CYCLE: true
            }  
        },
        {
            POSITION: [20.96, 6.69, 1, 0, 0, 202.5, 0],
            PROPERTIES: {
                SHOOT_SETTINGS: combineStats([g.drone, g.overseer, g.mothership]),
                TYPE: "drone",
                AUTOFIRE: true,
                SYNCS_SKILLS: true,
                STAT_CALCULATOR: "drone",
                WAIT_TO_CYCLE: true
            } 
        },
        {
            POSITION: [24.09, 8.69, 1, 0, 0, 180, 0],
            PROPERTIES: {
                SHOOT_SETTINGS: combineStats([g.drone, g.overseer, g.mothership]),
                TYPE: "drone",
                AUTOFIRE: true,
                SYNCS_SKILLS: true,
                STAT_CALCULATOR: "drone",
                WAIT_TO_CYCLE: true
            }
        },
        {
            POSITION: [24.09, 8.69, 1, 0, 0, 180, 0],
            PROPERTIES: {
                SHOOT_SETTINGS: combineStats([g.drone, g.overseer, g.mothership]),
                TYPE: "drone",
                AUTOFIRE: true,
                SYNCS_SKILLS: true,
                STAT_CALCULATOR: "drone",
                WAIT_TO_CYCLE: true
            }
        },
        { 
            POSITION: [4, 5, 1, 10, 0, 105, 0],
            PROPERTIES: {
                SHOOT_SETTINGS: combineStats([g.drone, g.overseer, g.mothership]),
                TYPE: "drone",
                AUTOFIRE: true,
                SYNCS_SKILLS: true,
                STAT_CALCULATOR: "drone",
                WAIT_TO_CYCLE: true
            } 
        },
        {   POSITION: [4, 5, 1, 10, 0, -105, 0],
            PROPERTIES: {
                SHOOT_SETTINGS: combineStats([g.drone, g.overseer, g.mothership]),
                TYPE: "drone",
                AUTOFIRE: true,
                SYNCS_SKILLS: true,
                STAT_CALCULATOR: "drone",
                WAIT_TO_CYCLE: true
            } 
        }
    ],
    TURRETS: [
        {
            POSITION: [10, 8.75, 0, 0, 360, 1],
            TYPE: "turkeyHead"
        }
    ]
};

// Special Tanks (Spectators)
Class.spectator = {
    PARENT: "genericTank",
    LABEL: "Spectator",
    ALPHA: 0,
    CAN_BE_ON_LEADERBOARD: false,
    CAN_GO_OUTSIDE_ROOM: true,
    ACCEPTS_SCORE: false,
    DRAW_HEALTH: false,
    HITS_OWN_TYPE: "never",
    IGNORED_BY_AI: true,
    ARENA_CLOSER: true,
    IS_IMMUNE_TO_TILES: true,
    IS_IMMUNE_TO_PORTALS: true,
    FULL_INVISIBLE: true,
    CAN_SEE_INVISIBLE_ENTITIES: true,
    LAYER: 13,
    BODY: {
        PUSHABILITY: 0,
        SPEED: base.SPEED * 3.5,
        ACCELERATION: base.ACCEL * 1.5,
        FOV: 4,
        DAMAGE: 0,
        HEALTH: 1e100,
        SHIELD: 1e100,
        REGEN: 1e100
    },
    GUNS: [{
        POSITION: [0, 0, 0, 0, 0, 0, 0],
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
            ALT_FIRE: true
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
    TOOLTIP: `Use left click to inspect and right click to teleport. Press ${key("ability")} to kill the selected entity.`,
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
        }),
        ...Class.spectator.GUNS
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
    ],
    ON: [
        {
            event: "fire",
            handler: ({body, masterStore: s}) => {
                const cursor = {x: body.control.target.x + body.x, y: body.control.target.y + body.y}
                let lowest = Infinity, closest;
                for (const instance of entities.values()) {
                    let distance = (instance.x - cursor.x) ** 2 + (instance.y - cursor.y) ** 2;
                    if (distance < lowest) {
                        lowest = distance;
                        closest = instance;
                    }
                }
                if (closest.bond) return;
                let message = [
                    `Selected ${closest.name || (closest.isPlayer ? "an unnamed player" : "a")}${(closest.name || closest.isPlayer) ? "'s" : ""} ${closest.label} (ID #${closest.id}).`,
                    `Score: ${closest.skill.score};`,
                    `Build: ${closest.skill.raw.join("/")};`
                ]
                body.socket.talk("Em", 20_000, JSON.stringify(message));
                s.selectedEntity = closest;
            }
        },
        {
            event: "control",
            handler: ({body}) => {
                const s = body.store;
                if (!s.selectedEntity) return;
                s.selectedEntity.kill();
                body.sendMessage("Killed the selected entity.");
            }
        }
    ]
};
Class.banHammer = {
    PARENT: "spectator",
    LABEL: "Ban Hammer",
    TOOLTIP: `Use left click to inspect and right click to teleport. Press ${key("ability")} to ban the selected player.`,
    GUNS: [
        {POSITION: [30, 7, 1.3, 0, 0, 0, 0]},
        {POSITION: [3, 11, 0.75, 7.5, -36, 90, 0]},
        {POSITION: [3, 11, 0.75, 7.5, 36, -90, 0]},
        {POSITION: [11, 14, 1, 30.5, 0, 0, 0]},
        {POSITION: [13, 10.5, -1.2, 0, 0, 0, 0]},
        ...Class.spectator.GUNS
    ],
    ON: [
        {
            event: "fire",
            handler: ({body, masterStore: s}) => {
                const cursor = {x: body.control.target.x + body.x, y: body.control.target.y + body.y}
                let lowest = Infinity, closest;
                for (const instance of entities.values()) {
                    if (instance === body || !instance.isPlayer) continue;
                    let distance = (instance.x - cursor.x) ** 2 + (instance.y - cursor.y) ** 2;
                    if (distance < lowest) {
                        lowest = distance;
                        closest = instance;
                    }
                }
                if (!closest || closest.bond) return;
                let message = [
                    `Selected ${closest.name || (closest.isPlayer ? "an unnamed player" : "a")}${(closest.name || closest.isPlayer) ? "'s" : ""} ${closest.label} (ID #${closest.id}).`,
                    `Score: ${closest.skill.score};`,
                    `Build: ${closest.skill.raw.join("/")};`
                ]
                body.socket.talk("Em", 20_000, JSON.stringify(message));
                s.selectedEntity = closest;
            }
        },
        {
            event: "control",
            handler: ({body}) => {
                const s = body.store;
                const e = s.selectedEntity
                if (!e || !e.isPlayer || !e.socket) return;
                if (e.socket.status.operatorLevel >= 4) {
                    body.sendMessage("You cannot ban this player!");
                    return;
                }
                global.gameManager.socketManager.ban(e.socket, "Ban Hammer");
                body.sendMessage("Banned the selected player.");
            }
        }
    ]
};

// Special Tanks (Other)
Class.antiTankMachineGun = {
    PARENT: "dominator",
    LABEL: "Anti-Tank Machine Gun",
    UPGRADE_LABEL: "A.T.M.G.",
    CONTROLLERS: [["spin", {onlyWhenIdle: true}], "nearestDifferentMaster"],
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
        SHIELD: base.SHIELD * 1.4
    },
    SKILL_CAP: Array(10).fill(15),
    SKILL: Array(10).fill(15),
    GUNS: [
        {
            POSITION: { LENGTH: 15, WIDTH: 3.0000001192092896, X: -6.556708751634699e-8, Y: 1.5000000596046434, ANGLE: 0 },
            PROPERTIES: {
                SHOOT_SETTINGS: combineStats([g.basic, g.op, {reload: 0.5, health: 100, damage: 100, recoil: 0, spray: 0.1, speed: 2, maxSpeed: 2}]),
                TYPE: "bullet"
            }
        },
        {
            POSITION: { LENGTH: 15, WIDTH: 3.0000001192092896, X: -6.556708770004402e-8, Y: -1.5000000596046434, ANGLE: 0 },
            PROPERTIES: {
                SHOOT_SETTINGS: combineStats([g.basic, g.op, {reload: 0.5, health: 100, damage: 100, recoil: 0, spray: 0.1, speed: 2, maxSpeed: 2}]),
                TYPE: "bullet"
            }
        },
        {
            POSITION: { LENGTH: 17.000000476837158, WIDTH: 3.0000001192092896, X: 0, Y: 0, ANGLE: 0 },
            PROPERTIES: {
                SHOOT_SETTINGS: combineStats([g.basic, g.op, {reload: 0.5, health: 100, damage: 100, recoil: 0, spray: 0.1, speed: 2, maxSpeed: 2}]),
                TYPE: "bullet"
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
    PARENT: "genericTank",
    LABEL: "Arena Closer",
    DISPLAY_NAME: false,
    DANGER: 10,
    SIZE: 34,
    COLOR: "yellow",
    LAYER: 13,
    BODY: {
        REGEN: 1e5,
        HEALTH: 1e6,
        DENSITY: 30,
        DAMAGE: 1e5,
        FOV: 10,
        SPEED: 4
    },
    SKILL: skillSet({rld: 1, dam: 1, pen: 1, str: 1, spd: 1, atk: 1, hlt: 1, shi: 1, rgn: 1, mob: 1}),
    DRAW_HEALTH: false,
    HITS_OWN_TYPE: "never",
    ARENA_CLOSER: true,
    IS_IMMUNE_TO_TILES: true,
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
    PARENT: "genericTank",
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
                TYPE: "bullet",
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
                    TYPE: "bullet",
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
                    TYPE: "bullet",
                    LABEL: "Thruster"
                }
            }
        ])
    ],
    PROPS: [
        {
            TYPE: ["hexagonHat", { COLOR: 21 }],
            POSITION: {
                SIZE: 6,
                Y: 7.45,
                LAYER: 1
            }
        },
        {
            TYPE: ["hexagonHat", { COLOR: 24 }],
            POSITION: {
                SIZE: 6,
                Y: -7.45,
                LAYER: 1
            }
        },
        {
            TYPE: ["squareHat", { COLOR: 22 }],
            POSITION: {
                SIZE: 6.35,
                Y: 2.85,
                LAYER: 1
            }
        },
        {
            TYPE: ["squareHat", { COLOR: 23 }],
            POSITION: {
                SIZE: 6.35,
                Y: -2.85,
                LAYER: 1
            }
        }
    ]
};
Class.baseProtector = {
    PARENT: "genericTank",
    LABEL: "Base",
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
        str: 1
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
        HETERO: 0
    },
    FACING_TYPE: ["spin", {speed: 0.04}],
    TURRETS: [
        {
            POSITION: [25, 0, 0, 0, 360, 0],
            TYPE: "dominationBody"
        },
        ...weaponArray({
            POSITION: [12, 7, 0, 45, 100, 0],
            TYPE: "baseSwarmTurret"
        }, 4)
    ],
    GUNS: weaponArray([
        {
            POSITION: [4.5, 11.5, -1.3, 6, 0, 45, 0]
        },
        {
            POSITION: [4.5, 8.5, -1.5, 7, 0, 45, 0]
        }
    ], 4)
};
Class.baseProtector_diep = {
    PARENT: "genericTank",
    LABEL: "Base",
    STAT_NAMES: statnames.drone,
    ON_MINIMAP: false,
    SIZE: 20,
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
        str: 1
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
        HETERO: 0
    },
    FACING_TYPE: ["spin", {speed: 0.04}],
    ALPHA: 0,
    GUNS: [
        {
            POSITION: {
                LENGTH: 6,
                WIDTH: 12,
                ASPECT: 1.2,
                X: 8
            },
            PROPERTIES: {
                SHOOT_SETTINGS: combineStats([g.drone, g.overseer, { reload: 1/3, size: 2/3 }]),
                TYPE: "drone",
                AUTOFIRE: true,
                SYNCS_SKILLS: true,
                STAT_CALCULATOR: "drone",
                WAIT_TO_CYCLE: true,
                MAX_CHILDREN: 12,
                LABEL: "Protector"
            }
        }
    ]
};
Class.manager_special = {
    PARENT: "spectator",
    LABEL: "Manager",
    DANGER: 7,
    STAT_NAMES: statnames.drone,
    GUNS: [
        {
            POSITION: {
                LENGTH: 6,
                WIDTH: 12,
                ASPECT: 1.2,
                X: 8
            },
            PROPERTIES: {
                SHOOT_SETTINGS: combineStats([g.drone, g.overseer, { reload: 0.05, speed: 2, maxSpeed: 2, damage: 100}]),
                TYPE: ["drone", { ARENA_CLOSER: false }],
                SYNCS_SKILLS: true,
                STAT_CALCULATOR: "drone",
                WAIT_TO_CYCLE: true,
                MAX_CHILDREN: 8
            }
        }
    ]
};

// Admin Tanks
Class.aeolus = {
    PARENT: "genericTank",
    LABEL: "Aeolus",
    ANGLE: 60,
    CONTROLLERS: [["whirlwind", { maxDistance: 1, minDistance: 1 }]],
    HAS_NO_RECOIL: true,
    STAT_NAMES: statnames.whirlwind,
    TURRETS: [
        {
            POSITION: [24, 0, 0, 0, 360, 0],
            TYPE: ["circleHat", { COLOR: "grey" }]
        }
    ],
    AI: {
        SPEED: 2
    },
    GUNS: (() => {
        let output = []
        for (let j = 0; j < 9; j++) {
            for (let i = 3; i < 4; i++) {
                output.push({
                    POSITION: { WIDTH: 4, LENGTH: 1, DELAY: 0, ANGLE: i * 40 },
                    PROPERTIES: {
                        SHOOT_SETTINGS: combineStats([g.satellite, { reload: 14 }]),
                        TYPE: ["satellite", {
                            ANGLE: 45 * i + (j * 40), CAN_GO_OUTSIDE_ROOM: true, CONTROLLERS: [["advancedOrbit", {
                                offset: 1, invertRotation: false, spinMulti: 0.25, invertDistance: false, gradualSpin: 0.5, ovalLengthMulti: 1, ovalWidthMulti: 1, rotation: -45 * i
                            }]]
                        }],
                        MAX_CHILDREN: 1,
                        AUTOFIRE: true,
                        SYNCS_SKILLS: false,
                        WAIT_TO_CYCLE: true
                    }
                })
            }
        }
        for (let j = 0; j < 11; j++) {
            for (let i = 3; i < 4; i++) {
                output.push({
                    POSITION: { WIDTH: 4, LENGTH: 1, DELAY: 0, ANGLE: i * (360/11) },
                    PROPERTIES: {
                        SHOOT_SETTINGS: combineStats([g.satellite, { reload: 14 }]),
                        TYPE: ["satellite", {
                            ANGLE: 45 * i + (j * (360/11)), CAN_GO_OUTSIDE_ROOM: true, CONTROLLERS: [["advancedOrbit", {
                                offset: 5/3, invertRotation: false, spinMulti: -0.25, invertDistance: false, gradualSpin: -0.625, ovalLengthMulti: 1, ovalWidthMulti: 1, rotation: -45 * i
                            }]]
                        }],
                        MAX_CHILDREN: 1,
                        AUTOFIRE: true,
                        SYNCS_SKILLS: false,
                        WAIT_TO_CYCLE: true
                    }
                })
            }
        }
        for (let j = 0; j < 13; j++) {
            for (let i = 3; i < 4; i++) {
                output.push({
                    POSITION: { WIDTH: 4, LENGTH: 1, DELAY: 0, ANGLE: i * (360/13) },
                    PROPERTIES: {
                        SHOOT_SETTINGS: combineStats([g.satellite, { reload: 14 }]),
                        TYPE: ["satellite", {
                            ANGLE: 45 * i + (j * (360/13)), CAN_GO_OUTSIDE_ROOM: true, CONTROLLERS: [["advancedOrbit", {
                                offset: 7/3, invertRotation: false, spinMulti: 0.25, invertDistance: false, gradualSpin: 0.75, ovalLengthMulti: 1, ovalWidthMulti: 1, rotation: -45 * i
                            }]]
                        }],
                        MAX_CHILDREN: 1,
                        AUTOFIRE: true,
                        SYNCS_SKILLS: false,
                        WAIT_TO_CYCLE: true
                    }
                })
            }
        }
        for (let j = 0; j < 15; j++) {
            for (let i = 3; i < 4; i++) {
                output.push({
                    POSITION: { WIDTH: 4, LENGTH: 1, DELAY: 0, ANGLE: i * (360/15) },
                    PROPERTIES: {
                        SHOOT_SETTINGS: combineStats([g.satellite, { reload: 14 }]),
                        TYPE: ["satellite", {
                            ANGLE: 45 * i + (j * (360/15)), CAN_GO_OUTSIDE_ROOM: true, CONTROLLERS: [["advancedOrbit", {
                                offset: 9/3, invertRotation: false, spinMulti: -0.25, invertDistance: false, gradualSpin: -0.875, ovalLengthMulti: 1, ovalWidthMulti: 1, rotation: -45 * i
                            }]]
                        }],
                        MAX_CHILDREN: 1,
                        AUTOFIRE: true,
                        SYNCS_SKILLS: false,
                        WAIT_TO_CYCLE: true
                    }
                })
            }
        }
        for (let j = 0; j < 17; j++) {
            for (let i = 3; i < 4; i++) {
                output.push({
                    POSITION: { WIDTH: 4, LENGTH: 1, DELAY: 0, ANGLE: i * (360/17) },
                    PROPERTIES: {
                        SHOOT_SETTINGS: combineStats([g.satellite, { reload: 14 }]),
                        TYPE: ["satellite", {
                            ANGLE: 45 * i + (j * (360/17)), CAN_GO_OUTSIDE_ROOM: true, CONTROLLERS: [["advancedOrbit", {
                                offset: 11/3, invertRotation: false, spinMulti: 0.25, invertDistance: false, gradualSpin: 1, ovalLengthMulti: 1, ovalWidthMulti: 1, rotation: -45 * i
                            }]]
                        }],
                        MAX_CHILDREN: 1,
                        AUTOFIRE: true,
                        SYNCS_SKILLS: false,
                        WAIT_TO_CYCLE: true
                    }
                })
            }
        }
        for (let j = 0; j < 19; j++) {
            for (let i = 3; i < 4; i++) {
                output.push({
                    POSITION: { WIDTH: 4, LENGTH: 1, DELAY: 0, ANGLE: i * (360/19) },
                    PROPERTIES: {
                        SHOOT_SETTINGS: combineStats([g.satellite, { reload: 14 }]),
                        TYPE: ["satellite", {
                            ANGLE: 45 * i + (j * (360/19)), CAN_GO_OUTSIDE_ROOM: true, CONTROLLERS: [["advancedOrbit", {
                                offset: 13/3, invertRotation: false, spinMulti: -0.25, invertDistance: false, gradualSpin: -1.125, ovalLengthMulti: 1, ovalWidthMulti: 1, rotation: -45 * i
                            }]]
                        }],
                        MAX_CHILDREN: 1,
                        AUTOFIRE: true,
                        SYNCS_SKILLS: false,
                        WAIT_TO_CYCLE: true
                    }
                })
            }
        }
        for (let j = 0; j < 21; j++) {
            for (let i = 3; i < 4; i++) {
                output.push({
                    POSITION: { WIDTH: 4, LENGTH: 1, DELAY: 0, ANGLE: i * (360/21) },
                    PROPERTIES: {
                        SHOOT_SETTINGS: combineStats([g.satellite, { reload: 14 }]),
                        TYPE: ["satellite", {
                            ANGLE: 45 * i + (j * (360/21)), CAN_GO_OUTSIDE_ROOM: true, CONTROLLERS: [["advancedOrbit", {
                                offset: 15/3, invertRotation: false, spinMulti: 0.25, invertDistance: false, gradualSpin: 1.25, ovalLengthMulti: 1, ovalWidthMulti: 1, rotation: -45 * i
                            }]]
                        }],
                        MAX_CHILDREN: 1,
                        AUTOFIRE: true,
                        SYNCS_SKILLS: false,
                        WAIT_TO_CYCLE: true
                    }
                })
            }
        }
        for (let j = 0; j < 23; j++) {
            for (let i = 3; i < 4; i++) {
                output.push({
                    POSITION: { WIDTH: 4, LENGTH: 1, DELAY: 0, ANGLE: i * (360/23) },
                    PROPERTIES: {
                        SHOOT_SETTINGS: combineStats([g.satellite, { reload: 14 }]),
                        TYPE: ["satellite", {
                            ANGLE: 45 * i + (j * (360/23)), CAN_GO_OUTSIDE_ROOM: true, CONTROLLERS: [["advancedOrbit", {
                                offset: 17/3, invertRotation: false, spinMulti: -0.25, invertDistance: false, gradualSpin: -1.375, ovalLengthMulti: 1, ovalWidthMulti: 1, rotation: -45 * i
                            }]]
                        }],
                        MAX_CHILDREN: 1,
                        AUTOFIRE: true,
                        SYNCS_SKILLS: false,
                        WAIT_TO_CYCLE: true
                    }
                })
            }
        }
        for (let j = 0; j < 25; j++) {
            for (let i = 3; i < 4; i++) {
                output.push({
                    POSITION: { WIDTH: 4, LENGTH: 1, DELAY: 0, ANGLE: i * (360/25) },
                    PROPERTIES: {
                        SHOOT_SETTINGS: combineStats([g.satellite, { reload: 14 }]),
                        TYPE: ["satellite", {
                            ANGLE: 45 * i + (j * (360/25)), CAN_GO_OUTSIDE_ROOM: true, CONTROLLERS: [["advancedOrbit", {
                                offset: 19/3, invertRotation: false, spinMulti: 0.25, invertDistance: false, gradualSpin: 1.5, ovalLengthMulti: 1, ovalWidthMulti: 1, rotation: -45 * i
                            }]]
                        }],
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
};
Class.alas = {
    PARENT: "genericTank",
    LABEL: "Alas",
    DANGER: 9,
    STAT_NAMES: statnames.drone,
    BODY: Class.manager.BODY,
    INVISIBLE: [0.08, 0.03],
    GUNS: [
        {
            POSITION: {
                LENGTH: 6,
                WIDTH: 12,
                ASPECT: 1.2,
                X: 8
            },
            PROPERTIES: {
                SHOOT_SETTINGS: combineStats([g.drone, g.overseer, { reload: 0.5, speed: 2, maxSpeed: 2 }]),
                TYPE: "drone",
                AUTOFIRE: true,
                SYNCS_SKILLS: true,
                STAT_CALCULATOR: "drone",
                MAX_CHILDREN: 8,
                WAIT_TO_CYCLE: true
            }
        },
        {
            POSITION: {
                LENGTH: 6,
                WIDTH: 6,
                ASPECT: -1.5,
                X: 8
            }
        },
        {
            POSITION: {
                LENGTH: 8,
                WIDTH: 1.5,
                ASPECT: -4,
                X: 8
            }
        }
    ]
};
Class.average4tdmScore = {
    PARENT: "genericTank",
    LABEL: "Average 4TDM Score",
    DANGER: 7,
    STAT_NAMES: statnames.drone,
    BODY: Class.overlord.BODY,
    MAX_CHILDREN: 8,
    GUNS: [
        ...weaponArray({
            POSITION: {
                LENGTH: 6,
                WIDTH: 12,
                ASPECT: 1.2,
                X: 8
            },
            PROPERTIES: {
                SHOOT_SETTINGS: combineStats([g.drone, g.overseer]),
                TYPE: "drone",
                AUTOFIRE: true,
                SYNCS_SKILLS: true,
                STAT_CALCULATOR: "drone",
                WAIT_TO_CYCLE: true
            }
        }, 4),
        {
            POSITION: {
                LENGTH: 0,
                WIDTH: 20
            },
            PROPERTIES: {
                SHOOT_SETTINGS: combineStats([{reload: 20}]),
                TYPE: "average4tdmScoreOctoTank",
                SYNCS_SKILLS: true,
                STAT_CALCULATOR: "drone",
                WAIT_TO_CYCLE: true,
                MAX_CHILDREN: 8
            }
        },
        {
            POSITION: {
                LENGTH: 0,
                WIDTH: 20
            },
            PROPERTIES: {
                SHOOT_SETTINGS: combineStats([{reload: 20}]),
                TYPE: "average4tdmScoreSpike",
                SYNCS_SKILLS: true,
                STAT_CALCULATOR: "drone",
                WAIT_TO_CYCLE: true,
                MAX_CHILDREN: 1
            }
        },
        {
            POSITION: {
                LENGTH: 0,
                WIDTH: 20
            },
            PROPERTIES: {
                SHOOT_SETTINGS: combineStats([{reload: 20}]),
                TYPE: "average4tdmScoreCyclone",
                SYNCS_SKILLS: true,
                STAT_CALCULATOR: "drone",
                WAIT_TO_CYCLE: true,
                MAX_CHILDREN: 2
            }
        },
        {
            POSITION: {
                LENGTH: 0,
                WIDTH: 20
            },
            PROPERTIES: {
                SHOOT_SETTINGS: combineStats([{reload: 20}]),
                TYPE: "average4tdmScorePentaShot",
                SYNCS_SKILLS: true,
                STAT_CALCULATOR: "drone",
                WAIT_TO_CYCLE: true,
                MAX_CHILDREN: 2
            }
        }
    ]
};
Class.averageL39Hunt = {
    PARENT: "genericTank",
    LABEL: "Average L-39 Hunt",
    NAME: "[L-39] overprot?",
    DANGER: 7,
    STAT_NAMES: statnames.drone,
    BODY: Class.overlord.BODY,
    MAX_CHILDREN: 8,
    GUNS: [
        ...weaponArray({
            POSITION: {
                LENGTH: 6,
                WIDTH: 12,
                ASPECT: 1.2,
                X: 8
            },
            PROPERTIES: {
                SHOOT_SETTINGS: combineStats([g.drone, g.overseer]),
                TYPE: "drone",
                AUTOFIRE: true,
                SYNCS_SKILLS: true,
                STAT_CALCULATOR: "drone",
                WAIT_TO_CYCLE: true
            }
        }, 4),
        {
            POSITION: {
                LENGTH: 0,
                WIDTH: 20
            },
            PROPERTIES: {
                SHOOT_SETTINGS: combineStats([{reload: 20}]),
                TYPE: "averageL39HuntOctoTank",
                SYNCS_SKILLS: true,
                STAT_CALCULATOR: "drone",
                WAIT_TO_CYCLE: true,
                MAX_CHILDREN: 5
            }
        },
        {
            POSITION: {
                LENGTH: 0,
                WIDTH: 20
            },
            PROPERTIES: {
                SHOOT_SETTINGS: combineStats([{reload: 20}]),
                TYPE: "averageL39HuntSidewinder",
                SYNCS_SKILLS: true,
                STAT_CALCULATOR: "drone",
                WAIT_TO_CYCLE: true,
                MAX_CHILDREN: 2
            }
        },
        {
            POSITION: {
                LENGTH: 0,
                WIDTH: 20
            },
            PROPERTIES: {
                SHOOT_SETTINGS: combineStats([{reload: 20}]),
                TYPE: "averageL39HuntMegaSmasher",
                SYNCS_SKILLS: true,
                STAT_CALCULATOR: "drone",
                WAIT_TO_CYCLE: true,
                MAX_CHILDREN: 3
            }
        },
        {
            POSITION: {
                LENGTH: 0,
                WIDTH: 20
            },
            PROPERTIES: {
                SHOOT_SETTINGS: combineStats([{reload: 20}]),
                TYPE: "averageL39HuntSeptaTrapper",
                SYNCS_SKILLS: true,
                STAT_CALCULATOR: "drone",
                WAIT_TO_CYCLE: true,
                MAX_CHILDREN: 3
            }
        },
        {
            POSITION: {
                LENGTH: 0,
                WIDTH: 20
            },
            PROPERTIES: {
                SHOOT_SETTINGS: combineStats([{reload: 20}]),
                TYPE: "averageL39HuntSurfer",
                SYNCS_SKILLS: true,
                STAT_CALCULATOR: "drone",
                WAIT_TO_CYCLE: true,
                MAX_CHILDREN: 6
            }
        }
    ]
};
Class.beeman = {
    PARENT: "genericTank",
    LABEL: "Beeman",
    GUNS: [
        {
            POSITION: {
                LENGTH: 18,
                WIDTH: 8
            },
            PROPERTIES: {
                SHOOT_SETTINGS: combineStats([g.trap, g.setTrap, { reload: 0.5, range: 0.5 }]),
                TYPE: "beemanTrap"
            }
        }
    ]
};
Class.bigBalls = {
    PARENT: "genericTank",
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
            TYPE: "bigBall",
            AUTOFIRE: true,
            SYNCS_SKILLS: true,
            STAT_CALCULATOR: "drone",
            WAIT_TO_CYCLE: true,
            MAX_CHILDREN: 1
        }
    }, 2)
};
Class.cocogoat = { // WIP!!
    PARENT: "genericTank",
    LABEL: "Cocogoat",
    COLOR: "#A2BCD2",
    GUNS: Class.basic.GUNS,
    TURRETS: [
        {
            TYPE: ["cocoHorn1", { MIRROR_MASTER_ANGLE: true }],
            POSITION: {
                SIZE: 20.125,
                X: -1,
                ANGLE: -5,
                LAYER: 1
            }
        },
        {
            TYPE: ["cocoHorn2", { MIRROR_MASTER_ANGLE: true }],
            POSITION: {
                SIZE: 20.125,
                X: -1,
                ANGLE: 5,
                LAYER: 1
            }
        },
        {
            TYPE: ["othercocoHorn1", { MIRROR_MASTER_ANGLE: true }],
            POSITION: {
                SIZE: 20.125,
                X: -1,
                Y: -2, 
                ANGLE: -5,
                LAYER: 1
            }
        },
        {
            TYPE: ["othercocoHorn2", { MIRROR_MASTER_ANGLE: true }],
            POSITION: {
                SIZE: 20.125,
                X: -1,
                Y: 2,
                ANGLE: 5,
                LAYER: 1
            }
        }
    ]
};
Class.cxATMG = {
    PARENT: "dominator",
    LABEL: "CX-ATMG",
    UPGRADE_LABEL: "CX-ATMG",
    COLOR: Class.cube.COLOR,
    SHAPE: preset.shape.flatCube,
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
        SHIELD: base.SHIELD * 1.4
    },
    SKILL_CAP: Array(10).fill(15),
    SKILL: Array(10).fill(15),
    GUNS: [
        {
            POSITION: [15, 2.5, 1, 0, 2, 0, 0.2],
            PROPERTIES: {
                SHOOT_SETTINGS: combineStats([g.basic, {reload: 0.5}]),
                TYPE: "cxATMGBullet"
            }
        },
        {
            POSITION: [15, 2.5, 1, 0, -2, 0, 0.2],
            PROPERTIES: {
                SHOOT_SETTINGS: combineStats([g.basic, {reload: 0.5}]),
                TYPE: "cxATMGBullet"
            }
        },
        {
            POSITION: [1, 2.5, 1, 0, 0, 0, 0],
            PROPERTIES: {
                SHOOT_SETTINGS: combineStats([g.basic, {reload: 0.5}]),
                TYPE: "cxATMGBullet"
            }
        },
        {
            POSITION: [16.5, 3.5, 1, 0, 0, 0, 0],
            PROPERTIES: {
                SHOOT_SETTINGS: combineStats([g.basic, {reload: 0.5}]),
                TYPE: "cxATMGBullet"
            }
        },
        {
            POSITION: [24, 7, -1.3, 0, 0, 90, 0]
        },
        {
            POSITION: [24, 7, -1.3, 0, 0, -90, 0]
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
    PARENT: "genericTank",
    LABEL: "Damoclone",
    COLOR: "trans",
    HAS_NO_RECOIL: true,
    GUNS: weaponArray({
        POSITION: {
            LENGTH: 16,
            WIDTH: 4
        },
        PROPERTIES: {
            SHOOT_SETTINGS: combineStats([g.basic, g.twin, g.gunner, g.cyclone, g.spam]),
            TYPE: "bullet"
        }
    }, 24, {delayIncrement: 1/24})
};
Class.developer = {
    PARENT: "genericTank",
    LABEL: "Developer",
    BODY: {
        SHIELD: 1000,
        REGEN: 10,
        HEALTH: 100,
        DAMAGE: 10,
        DENSITY: 20,
        FOV: 5
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
    HITS_OWN_TYPE: "hardOnlyTanks",
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
        [-1, 0.8]
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
                TYPE: "developerBullet"
            }
        }
    ]
};
Class.fat456 = makeRadialAuto("architectGun", { isTurret: true, danger: 7, size: 12, label: "Fat456", body: { FOV: base.FOV * 1.15, SPEED: base.SPEED * 4 } });
Class.fat456.COLOR = "#654321";
Class.fat456.SIZE = 30;
Class.heptaAutoBasic = makeAuto("basic", "Hepta Auto-Basic", preset.makeAuto.hepta);
Class.literallyAMachineGun = {
    PARENT: "genericTank",
    LABEL: "Literally a Machine Gun",
    UPGRADE_LABEL: "L.a.M.G.",
    DANGER: 7,
    BODY: {
        FOV: base.FOV * 1.2
    },
    TURRETS: [
        {
            TYPE: "lamgSpinnerTurret",
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
                TYPE: "bullet",
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
Class.machineShot = {
    PARENT: "genericTank",
    LABEL: "Machine Shot",
    DANGER: 7,
    BODY: Class.pentaShot.BODY,
    HAS_NO_RECOIL: true,
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
                TYPE: "bullet"
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
                TYPE: "bullet"
            }
        }]),
        {
            POSITION: {
                LENGTH: 22,
                WIDTH: 8
            },
            PROPERTIES: {
                SHOOT_SETTINGS: combineStats([g.machineShot]),
                TYPE: "bullet"
            }
        }
    ]
};
Class.meDoingYourMom = {
    PARENT: "genericTank",
    LABEL: "Me doing your mom",
    UPGRADE_LABEL: "M.D.Y.M.",
    DANGER: 7,
    BODY: {
        FOV: base.FOV * 3.5
    },
    GUNS: [
        {
            POSITION: {
                LENGTH: 128,
                WIDTH: 8
            },
            PROPERTIES: {
                SHOOT_SETTINGS: combineStats([g.basic, g.sniper, g.assassin, { recoil: 0.01, reload: 0.01 }]),
                FIXED_RELOAD: true,
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
Class.meOnMyWayToDoYourMom = {
    PARENT: "genericTank",
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
                TYPE: "bullet"
            }
        }
    ]
};
Class.quadCyclone = {
    PARENT: "genericTank",
    LABEL: "Quad-Cyclone",
    DANGER: 7,
    GUNS: weaponArray({
        POSITION: {
            LENGTH: 20,
            WIDTH: 8
        }
    }, 4),
    TURRETS: weaponArray({
        TYPE: "cycloneTurret",
        POSITION: {
            SIZE: 20,
            X: 25,
            ARC: 0,
            LAYER: 1
        }
    }, 4)
};
Class.rapture = {
    PARENT: "genericTank",
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
                TYPE: "speedBullet"
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
Class.schoolShooter = {
    PARENT: "genericTank",
    LABEL: "School Shooter",
    GUNS: [
        {
            POSITION: {
                LENGTH: 20,
                WIDTH: 1.5,
                X: 50,
                Y: 5
            }
        },
        {
            POSITION: {
                LENGTH: 0,
                WIDTH: 2,
                X: 50,
                Y: 5
            },
            PROPERTIES: {
                SHOOT_SETTINGS: combineStats([g.basic, g.op, {damage: 1e6, reload: 0.3, spray: 0, speed: 2}]),
                TYPE: "developerBullet",
                ALPHA: 0
            }
        }
    ]
};
Class.smasher3 = makeRadialAuto("flailBall", { isTurret: true, danger: 8, label: "Smasher-3" });
Class.tetraGunner = {
    PARENT: "genericTank",
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
                TYPE: "bullet"
            }
        }),
        {
            POSITION: {
                LENGTH: 18,
                WIDTH: 3.5
            },
            PROPERTIES: {
                SHOOT_SETTINGS: combineStats([g.basic, g.twin, g.gunner, { speed: 1.2 }]),
                TYPE: "bullet"
            }
        }
    ], 4)
};
Class.theAmalgamation = makeAuto({
    PARENT: "genericTank",
    DANGER: 12,
    STAT_NAMES: statnames.mixed,
    BODY: {
        FOV: base.FOV * 1.3
    },
    GUNS: [
        {
            POSITION: [6, 12, 1.2, 8, 0, 0, 0],
            PROPERTIES: {
                MAX_CHILDREN: 4,
                SHOOT_SETTINGS: combineStats([g.drone, g.overseer, { reload: 0.5 }]),
                TYPE: ["drone", {
                    AI: { skynet: true },
                    INDEPENDENT: true,
                    BODY: { FOV: 1 }
                }],
                AUTOFIRE: true,
                SYNCS_SKILLS: true,
                STAT_CALCULATOR: "drone"
            }
        },
        ...weaponMirror([
            {
                POSITION: [16, 8, 1, 0, 0, -90, 0.1],
                PROPERTIES: {
                    SHOOT_SETTINGS: combineStats([g.basic, g.flankGuard, g.triAngle, g.thruster]),
                    TYPE: "bullet",
                    LABEL: "thruster"
                }
            },
            {
                POSITION: [7, 7.5, 0.6, 7, 0, -90, 0],
                PROPERTIES: {
                    SHOOT_SETTINGS: combineStats([g.swarm]),
                    TYPE: "autoswarm",
                    STAT_CALCULATOR: "swarm"
                }
            },
            {
                POSITION: [18, 8, 1, 0, 0, -130, 0.1],
                PROPERTIES: {
                    SHOOT_SETTINGS: combineStats([g.basic, g.flankGuard, g.triAngle]),
                    TYPE: "bullet"
                }
            },
            {
                POSITION: [13, 8, 1, 0, 1, -135, 0.6],
                PROPERTIES: {
                    SHOOT_SETTINGS: combineStats([g.basic, g.flankGuard, g.triAngle, g.thruster]),
                    TYPE: "bullet",
                    LABEL: "thruster"
                }
            },
            {
                POSITION: [16, 8, 1, 0, 0, -145, 0.1],
                PROPERTIES: {
                    SHOOT_SETTINGS: combineStats([g.basic, g.flankGuard, g.triAngle, g.thruster]),
                    TYPE: "bullet",
                    LABEL: "thruster"
                }
            },
            {
                POSITION: [13.5, 3, 1, 0, -8.5, -10, 0.6],
                PROPERTIES: {
                    SHOOT_SETTINGS: combineStats([g.basic, g.pelleter, g.artillery, g.twin]),
                    TYPE: "bullet"
                }
            },
            {
                POSITION: [17.3, 3, 1, 0, -7, -7, 0.2],
                PROPERTIES: {
                    SHOOT_SETTINGS: combineStats([g.basic, g.pelleter, g.artillery, g.twin]),
                    TYPE: "bullet"
                }
            }
        ]),
        ...weaponStack({
            POSITION: {
                LENGTH: 21,
                WIDTH: 8
            },
            PROPERTIES: {
                SHOOT_SETTINGS: combineStats([g.basic, g.minigun]),
                TYPE: "bullet"
            }
        }, 3, {lengthOffset: 2, delayIncrement: 1/3}),
        {
            POSITION: [19, 2, 1, 0, -2.5, 0, 0],
            PROPERTIES: {
                SHOOT_SETTINGS: combineStats([g.basic, g.pelleter, g.power, g.twin, { recoil: 4 }, { recoil: 1.8 }]),
                TYPE: "bullet"
            }
        },
        {
            POSITION: [19, 2, 1, 0, 2.5, 0, 0],
            PROPERTIES: {
                SHOOT_SETTINGS: combineStats([g.basic, g.pelleter, g.power, g.twin, { recoil: 4 }, { recoil: 1.8 }]),
                TYPE: "bullet"
            }
        },
        {
            POSITION: [12, 11, 1, 0, 0, 0, 0]
        },
        {
            POSITION: [20.5, 19.5, 1, 0, 0, 180, 0],
            PROPERTIES: {
                SHOOT_SETTINGS: combineStats([g.basic, g.pounder, g.destroyer, g.annihilator]),
                TYPE: "bullet"
            }
        }
    ]
}, "The Amalgamation");
Class.theConglomerate = {
    PARENT: "genericTank",
    LABEL: "The Conglomerate",
    DANGER: 13,
    BODY: {
        SPEED: base.SPEED * 0.85,
        FOV: base.FOV * 1.3
    },
    GUNS: [
        {
            POSITION: [30, 2, 1, 0, 4, 180, 0],
            PROPERTIES: {
                SHOOT_SETTINGS: combineStats([g.basic, g.twin, g.gunner, { speed: 1.2 }]),
                TYPE: "bullet"
            }
        },
        {
            POSITION: [40, 7, 1, 0, 0, 0, 0]
        },
        {
            POSITION: [30, 2, 1, 0, -4, 180, 0.8],
            PROPERTIES: {
                SHOOT_SETTINGS: combineStats([g.basic, g.twin, g.gunner, { speed: 1.2 }]),
                TYPE: "bullet"
            }
        },
        {
            POSITION: [30, 2, 1, 0, 2.25, 180, 0.2],
            PROPERTIES: {
                SHOOT_SETTINGS: combineStats([g.basic, g.twin, g.gunner, { speed: 1.2 }]),
                TYPE: "bullet"
            }
        },
        {
            POSITION: [30, 2, 1, 0, -2.25, 180, 0.6],
            PROPERTIES: {
                SHOOT_SETTINGS: combineStats([g.basic, g.twin, g.gunner, { speed: 1.2 }]),
                TYPE: "bullet"
            }
        },
        {
            POSITION: [30, 2, 1, 0, 0, 180, 0.4],
            PROPERTIES: {
                SHOOT_SETTINGS: combineStats([g.basic, g.twin, g.gunner, { speed: 1.2 }]),
                TYPE: "bullet"
            }
        },
        {
            POSITION: [5, 13, 1, 20, 0, 180, 0]
        },
        ...weaponMirror([
            {
                POSITION: [14, 8, 1, 0, 1, -140, 0.6],
                PROPERTIES: {
                    SHOOT_SETTINGS: combineStats([g.basic, g.flankGuard, g.triAngle, g.thruster]),
                    TYPE: "bullet",
                    LABEL: "thruster"
                }
            },
            {
                POSITION: [16, 8, 1, 0, 0, -150, 0.1],
                PROPERTIES: {
                    SHOOT_SETTINGS: combineStats([g.basic, g.flankGuard, g.triAngle, g.thruster]),
                    TYPE: "bullet",
                    LABEL: "thruster"
                }
            }
        ]),
        {
            POSITION: [20, 20, 1, 0, 0, 180, 0]
        },
        {
            POSITION: [20, 8, 1, 0, 0, 180, 0]
        },
        {
            POSITION: [24, 5, 1, 0, 0, 180, 0],
            PROPERTIES: {
                SHOOT_SETTINGS: combineStats([g.basic, g.sniper, g.assassin, {speed: 2, reload: 2}]), // not sure about damage/penetration/health stats
                TYPE: "bullet"
            }
        },
        {
            POSITION: [20, 16, 1, 0, 0, 180, 0],
            PROPERTIES: {
                SHOOT_SETTINGS: combineStats([g.basic]),
                TYPE: "masterBullet",
                MAX_CHILDREN: 4,
                DESTROY_OLDEST_CHILD: true,
                ALPHA: 0
            }
        },
        ...weaponMirror([
            {
                POSITION: [15, 7, 1, 0, 0, -60, 0]
            },
            {
                POSITION: [2, 7, 1.1, 15, 0, -60, 0],
                PROPERTIES: {
                    SHOOT_SETTINGS: combineStats([g.trap, g.setTrap, g.weak]),
                    TYPE: "setTrap"
                }
            }
        ]),
        {
            POSITION: [16, 16, 1.4, 0, 0, 180, 0],
            PROPERTIES: {
                SHOOT_SETTINGS: combineStats([g.drone, g.honcho, g.bigCheese]),
                TYPE: "drone",
                AUTOFIRE: true,
                SYNCS_SKILLS: true,
                STAT_CALCULATOR: "drone",
                MAX_CHILDREN: 1
            }
        },
        {
            POSITION: [16, 10, 1, 0, 5, 0, 2 / 3],
            PROPERTIES: {
                SHOOT_SETTINGS: combineStats([g.basic, g.twin, g.triplet, g.quintuplet]),
                TYPE: "bullet"
            }
        },
        {
            POSITION: [19, 10, 1, 0, 3, 0, 1 / 3],
            PROPERTIES: {
                SHOOT_SETTINGS: combineStats([g.basic, g.twin, g.triplet, g.quintuplet]),
                TYPE: "bullet"
            }
        },
        {
            POSITION: [16, 10, 1, 0, -5, 0, 2 / 3],
            PROPERTIES: {
                SHOOT_SETTINGS: combineStats([g.basic, g.twin, g.triplet, g.quintuplet]),
                TYPE: "bullet"
            }
        },
        {
            POSITION: [19, 10, 1, 0, -3, 0, 1 / 3],
            PROPERTIES: {
                SHOOT_SETTINGS: combineStats([g.basic, g.twin, g.triplet, g.quintuplet]),
                TYPE: "bullet"
            }
        },
        ...weaponMirror({
            POSITION: [12, 5, 1, 0, -6, 0, 0],
            PROPERTIES: {
                SHOOT_SETTINGS: combineStats([g.basic, g.twin]),
                TYPE: "bullet"
            }
        }, {delayIncrement: 0.5}),
        {
            POSITION: [22, 10, 1, 0, 0, 0, 0],
            PROPERTIES: {
                SHOOT_SETTINGS: combineStats([g.basic, g.twin, g.triplet, g.quintuplet]),
                TYPE: "bullet"
            }
        },
        {
            POSITION: [22, 7, -1.5, 0, 0, 0, 0],
            PROPERTIES: {
                SHOOT_SETTINGS: combineStats([g.basic, g.minigun]),
                TYPE: "bullet"
            }
        },
        {
            POSITION: [20, 7.5, -1.5, 0, 0, 0, 1 / 3],
            PROPERTIES: {
                SHOOT_SETTINGS: combineStats([g.basic, g.minigun, { size: 7 / 7.5 }]),
                TYPE: "bullet"
            }
        },
        {
            POSITION: [18, 8, -1.5, 0, 0, 0, 2 / 3],
            PROPERTIES: {
                SHOOT_SETTINGS: combineStats([g.basic, g.minigun, { size: 7 / 8 }]),
                TYPE: "bullet"
            }
        },
        {
            POSITION: [7, 7.5, 0.6, 7, 0, 0, 0],
            PROPERTIES: {
                SHOOT_SETTINGS: combineStats([g.swarm]),
                TYPE: "swarm",
                STAT_CALCULATOR: "swarm"
            }
        }
    ],
    TURRETS: [
        {
            POSITION: [6, 40, 0, 0, 180, 1],
            TYPE: [
                "crowbarTurretTank",
                { INDEPENDENT: true }
            ]
        },
        {
            POSITION: [6, 30, 0, 0, 180, 1],
            TYPE: [
                "crowbarTurretTank",
                { INDEPENDENT: true }
            ]
        },
        ...weaponMirror({
            POSITION: [13, 8, 0, -90, 190, 0],
            TYPE: ["sniper3gun", {INDEPENDENT: true}]
        }),
        {
            TYPE: ["triangleHat", {COLOR: "grey"}],
            POSITION: { SIZE: 6, LAYER: 1 }
        }
    ]
};
Class.tracker3 = makeRadialAuto("tracker3gun", { isTurret: true, danger: 7, label: "Tracker-3" });
Class.unknownClass = {
    PARENT: "genericTank",
    SHAPE: 0, // custom "wobbly" circle
    SIZE: 1,
    COLOR: "black",
    BODY: {
        FOV: base.FOV * 5
    }
};
Class.wifeBeater = {
    PARENT: "overlord",
    LABEL: "Wife Beater",
    DANGER: 8,
    COLOR: "#FD9100",
    STAT_NAMES: statnames.drone,
    BODY: {
        ACCELERATION: base.ACCEL * 0.75,
        SPEED: base.SPEED * 0.8,
        FOV: base.FOV * 1.1
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
    PARENT: "genericTank",
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
                TYPE: "bullet"
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
                TYPE: "bullet"
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
                TYPE: "bullet"
            }
        }
    ]
};
