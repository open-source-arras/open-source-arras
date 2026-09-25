const {combineStats, dereference, makeAura, makeAuto, makeHat, weaponArray, weaponMirror} = require('../../facilitators.js')
const {base, smshskl} = require('../../constants.js')
const g = require('../../gunvals.js')

// ARMS RACE V2 DREADNOUGHTS BY FROSTBYTE

const eggnoughtBody = {
	SPEED: base.SPEED * 0.75,
	HEALTH: base.HEALTH * 1.75,
	SHIELD: base.SHIELD * 2.5,
	REGEN: base.REGEN * 1.25,
	FOV: base.FOV,
	RESIST: base.RESIST,
	DENSITY: base.DENSITY * 2.5,
	ACCELERATION: base.ACCEL * 0.8,
};
const squarenoughtBody = {
	SPEED: base.SPEED * 0.7,
	HEALTH: base.HEALTH * 2.5,
	SHIELD: base.SHIELD * 2.7,
	REGEN: base.REGEN * 1.4,
	FOV: base.FOV * 0.95,
	RESIST: base.RESIST,
	DENSITY: base.DENSITY * 2.75,
	ACCELERATION: base.ACCEL * 0.65,
};
const trinoughtBody = {
	SPEED: base.SPEED * 0.65,
	HEALTH: base.HEALTH * 3.5,
	SHIELD: base.SHIELD * 2.9,
	REGEN: base.REGEN * 1.5,
	FOV: base.FOV * 0.95,
	RESIST: base.RESIST,
	DENSITY: base.DENSITY * 3,
	ACCELERATION: base.ACCEL * 0.55,
};
const pentanoughtBody = {
	SPEED: base.SPEED * 0.6,
	HEALTH: base.HEALTH * 4.25,
	SHIELD: base.SHIELD * 3.1,
	REGEN: base.REGEN * 1.55,
	FOV: base.FOV * 0.95,
	RESIST: base.RESIST,
	DENSITY: base.DENSITY * 3.25,
	ACCELERATION: base.ACCEL * 0.45,
};
const hexnoughtBody = {
	SPEED: base.SPEED * 0.55,
	HEALTH: base.HEALTH * 5,
	SHIELD: base.SHIELD * 3.3,
	REGEN: base.REGEN * 1.6,
	FOV: base.FOV * 0.95,
	RESIST: base.RESIST,
	DENSITY: base.DENSITY * 3.5,
	ACCELERATION: base.ACCEL * 0.4,
};
const hpBuffBodyStats = [
	{ HEALTH: 1.4, SPEED: 1.25, SHIELD: 1.4,  REGEN: 1.3  },
	{ HEALTH: 1.7, SPEED: 1.1,  SHIELD: 1.65, REGEN: 1.45 },
	{ HEALTH: 1.8, SPEED: 1.17, SHIELD: 1.9,  REGEN: 1.6  },
	{ HEALTH: 1.9, SPEED: 1.17, SHIELD: 2.15, REGEN: 1.7  },
];
const speedBuffBodyStats = [
	{ HEALTH: 0.85, SPEED: 1.4, SHIELD: 0.9,  REGEN: 1   },
	{ HEALTH: 0.8,  SPEED: 1.5, SHIELD: 0.83, REGEN: 0.9 },
	{ HEALTH: 0.75, SPEED: 1.6, SHIELD: 0.75, REGEN: 0.8 },
];
const healerBodyStats = [
	{ HEALTH: 1.1,  SPEED: 1.04, SHIELD: 1.2,  REGEN: 1.15 },
	{ HEALTH: 1,    SPEED: 0.98, SHIELD: 1.28, REGEN: 1.2  },
	{ HEALTH: 0.92, SPEED: 0.94, SHIELD: 1.35, REGEN: 1.25 },
];

function combineBodyStats(...bodies) {
	let output = {
		HEALTH: 1,
		SPEED: 1,
		SHIELD: 1,
		REGEN: 1,
	}
	for (let body of bodies) {
		for (let k in body) {
			output[k] *= body[k];
		}
	}
	return output;
}

// Set the below variable to true to disable the level requirements for upgrading.
const free_upgrades = true

// Set the below variable to true to enable hex dreadnought building.
const buildHexnoughts = true

// Set the below variable to true to enable photosphere with 10-12 auras instead of 6-7.
const useOldPhotosphere = false

// For hexnought merging
const hexnoughtScaleFactor = 0.9

// Generics
Class.genericDreadnought_dreadsV2 = {
	PARENT: 'genericTank',
	SKILL_CAP: Array(10).fill(smshskl),
	REROOT_UPGRADE_TREE: ["dreadWeapon_dreadsV2", "dreadBody_dreadsV2"],
}
Class.genericEggnought = {
	PARENT: "genericDreadnought_dreadsV2",
	BODY: eggnoughtBody,
	SHAPE: 0,
	COLOR: 'egg',
	SIZE: 16,
	DANGER: 8,
}
Class.genericSquarenought = {
	PARENT: "genericDreadnought_dreadsV2",
	BODY: squarenoughtBody,
	SHAPE: 4,
	COLOR: 'square',
	SIZE: 20,
	DANGER: 9,
}
Class.genericTrinought = {
	PARENT: "genericDreadnought_dreadsV2",
	BODY: trinoughtBody,
	SHAPE: 3.5,
	COLOR: 'triangle',
	SIZE: 23,
	DANGER: 10,
}
Class.genericPentanought = {
	PARENT: "genericDreadnought_dreadsV2",
	BODY: pentanoughtBody,
	SHAPE: 5.5,
	COLOR: 'pentagon',
	SIZE: 25,
	DANGER: 11,
}
Class.genericHexnought = {
	PARENT: "genericDreadnought_dreadsV2",
	BODY: hexnoughtBody,
	SHAPE: 6,
	COLOR: 'hexagon',
	SIZE: 26,
	DANGER: 12,
}

// Turrets
Class.byteTurret_dreadsV2 = {
	PARENT: "autoTankGun",
	INDEPENDENT: true,
	GUNS: [
		{
			POSITION: {
				LENGTH: 22,
				WIDTH: 10
			},
			PROPERTIES: {
				SHOOT_SETTINGS: combineStats([g.basic, g.pelleter, g.power, g.turret, {size: 0.9, health: 1.3, speed: 0.85, recoil: 0.8, range: 0.45}]),
				TYPE: "bullet"
			}
		}
	]
}
Class.dropperTurret_dreadsV2 = {
	PARENT: 'genericTank',
	CONTROLLERS: [["spin", {speed: -0.035}]],
	INDEPENDENT: true,
	LABEL: "",
	COLOR: 16,
	GUNS: weaponArray({ 
		POSITION: {
			LENGTH: 16,
			WIDTH: 8,
			ANGLE: 90
		}
	}, 2)
}
Class.gigabyteTurret_dreadsV2 = {
	PARENT: "autoTankGun",
	INDEPENDENT: true,
	GUNS: [
		{
			POSITION: {
				LENGTH: 26,
				WIDTH: 16
			},
			PROPERTIES: {
				SHOOT_SETTINGS: combineStats([g.basic, g.pelleter, g.power, g.turret, g.assassin, g.pounder, g.destroyer, {size: 0.75, health: 1.24, speed: 0.9, recoil: 1.4, range: 0.9}]),
				TYPE: "bullet"
			}
		}
	]
}
Class.kilobyteTurret_dreadsV2 = {
	PARENT: "autoTankGun",
	INDEPENDENT: true,
	GUNS: [
		{
			POSITION: {
				LENGTH: 26,
				WIDTH: 10
			},
			PROPERTIES: {
				SHOOT_SETTINGS: combineStats([g.basic, g.pelleter, g.power, g.turret, g.assassin, {size: 0.9, health: 1.39, speed: 0.63, recoil: 1.25, range: 0.5}]),
				TYPE: "bullet"
			}
		}
	]
}
Class.megabyteTurret_dreadsV2 = {
	PARENT: "autoTankGun",
	INDEPENDENT: true,
	GUNS: [
		{
			POSITION: {
				LENGTH: 26,
				WIDTH: 13
			},
			PROPERTIES: {
				SHOOT_SETTINGS: combineStats([g.basic, g.pelleter, g.power, g.turret, g.assassin, g.pounder, {size: 0.85, health: 1.31, speed: 0.62, recoil: 1.4, range: 0.52}]),
				TYPE: "bullet"
			}
		}
	]
}
Class.showerTurret_dreadsV2 = {
	PARENT: 'genericTank',
	LABEL: "",
	BODY: {
		FOV: 1.5,
	},
	CONTROLLERS: [[ 'spin', {speed: 0.03}]],
	COLOR: 16,
	INDEPENDENT: true,
	MAX_CHILDREN: 4,
	GUNS: [
		{
			POSITION: [6, 12, 1.2, 8, 0, 0, 0],
			PROPERTIES: {
			SHOOT_SETTINGS: combineStats([g.drone, {size: 1.3}]),
			TYPE: ['drone', {INDEPENDENT: true}],
			AUTOFIRE: true,
			SYNCS_SKILLS: true,
			STAT_CALCULATOR: "drone",
			WAIT_TO_CYCLE: true,
			},
		},
	],
}
Class.spamAutoTurret = {
	PARENT: "autoTankGun",
	INDEPENDENT: true,
	GUNS: [
		{
			POSITION: {
				LENGTH: 22,
				WIDTH: 10
			},
			PROPERTIES: {
				SHOOT_SETTINGS: combineStats([g.basic, g.flankGuard, g.flankGuard, g.flankGuard, g.autoTurret, {recoil: 0.125}]),
				TYPE: "bullet"
			}
		}
	]
}

// Projectiles
Class.aggressorMinion_dreadsV2 = {
	PARENT: "minion",
	SHAPE: 3.5,
	COLOR: 'triangle',
	GUNS: weaponArray({
		POSITION: [16, 8.5, 1, 0, 0, 0, 0],
		PROPERTIES: {
			SHOOT_SETTINGS: combineStats([g.basic, g.assassin, g.minionGun, {speed: 1.06, maxSpeed: 1.06, reload: 1.75, health: 1.25}]),
			WAIT_TO_CYCLE: true,
			TYPE: "bullet",
		},
	}, 3),
}
Class.assailantMinion_dreadsV2 = {
	PARENT: "minion",
	SHAPE: 4,
	COLOR: 'square',
	GUNS: weaponArray({
		POSITION: [15, 7.5, 1, 0, 0, 0, 0],
		PROPERTIES: {
			SHOOT_SETTINGS: combineStats([g.basic, g.assassin, g.minionGun, {reload: 1.8, health: 1.1}]),
			WAIT_TO_CYCLE: true,
			TYPE: "bullet",
		},
	}, 4)
}
Class.betadrone = {
	PARENT: "drone",
	PROPS: [
		{
			POSITION: [10, 0, 0, 180, 1],
			TYPE: ["triangle", {COLOR: -1}],
		},
	]
}
Class.gladiatorGenericMinion_dreadsV2 = {
	PARENT: "minion",
	SHAPE: 3.5,
	COLOR: "crasher",
	GUNS: [],
}
Class.gladiatorTritankMinion_dreadsV2 = {
	PARENT: "gladiatorGenericMinion_dreadsV2",
	GUNS: weaponArray({
		POSITION: [15, 8.5, 1, 0, 0, 0, 0],
		PROPERTIES: {
			SHOOT_SETTINGS: combineStats([g.basic, g.assassin, g.minionGun, {speed: 1.06, maxSpeed: 1.06, reload: 1.8, health: 1.3}]),
			WAIT_TO_CYCLE: true,
			TYPE: ["bullet", {COLOR: 5}],
		},
	}, 3),
}
Class.gladiatorTritrapMinion_dreadsV2 = {
	PARENT: "gladiatorGenericMinion_dreadsV2",
	GUNS: weaponArray([
		{
			POSITION: [13, 7, 1, 0, 0, 0, 0],
		}, {
			POSITION: [3, 7, 1.7, 13, 0, 0, 0],
			PROPERTIES: {
				SHOOT_SETTINGS: combineStats([g.trap, g.pounder, g.flankGuard, g.minionGun, {reload: 1.2, speed: 0.8, maxSpeed: 0.8}]),
				TYPE: "trap",
				STAT_CALCULATOR: "trap",
			},
		},
	], 3),
}
Class.gladiatorTriswarmMinion_dreadsV2 = {
	PARENT: "gladiatorGenericMinion_dreadsV2",
	GUNS: weaponArray({
		POSITION: [7, 8.5, -1.5, 7, 0, 0, 0],
		PROPERTIES: {
			SHOOT_SETTINGS: combineStats([g.swarm, g.flankGuard, g.minionGun, {speed: 1.1, maxSpeed: 1.1, reload: 1.6, size: 1.6, range: 1.15}]),
			TYPE: ["swarm", {COLOR: 5}],
			STAT_CALCULATOR: "swarm",
		},
	}, 3),
}
Class.gladiatorAutoMinion_dreadsV2 = makeAuto({
	PARENT: "gladiatorGenericMinion_dreadsV2",
}, "Minion", {size: 12, angle: 0});
Class.gladiatorAuraMinion_dreadsV2 = {
	PARENT: "gladiatorGenericMinion_dreadsV2",
	TURRETS: [
		{
			POSITION: [12, 0, 0, 0, 360, 1],
			TYPE: "gladiatorAuraMinionAura_dreadsV2",
		}
	]
}
Class.gladiatorHealAuraMinion_dreadsV2 = {
	PARENT: "gladiatorGenericMinion_dreadsV2",
	TURRETS: [
		{
			POSITION: [12, 0, 0, 0, 360, 1],
			TYPE: "gladiatorHealAuraMinionAura_dreadsV2",
		}
	]
}
Class.spotterRadar_dreadsV2 = {
	PARENT: 'genericTank',
	CONTROLLERS: [['spin', {speed: 0.02}]],
	INDEPENDENT: true,
	SHAPE: [[0.225, 1], [0.225, -1], [-0.225, -1], [-0.225, 1]],
	COLOR: 17,
	GUNS: [
		{
		POSITION: [4.5, 26, 1, -2.25, 0, 0, 0],
		PROPERTIES: {COLOR: -1}
		}
	]
}
Class.supermissile = {
	PARENT: "bullet",
	LABEL: "Missile",
	INDEPENDENT: true,
	BODY: {
		RANGE: 120,
	},
	GUNS: [
		{
			POSITION: [14, 6, 1, 0, -2, 130, 0],
			PROPERTIES: {
				AUTOFIRE: true,
				SHOOT_SETTINGS: combineStats([g.basic, g.lowPower, {reload: 1.15, speed: 1.3, maxSpeed: 1.3, recoil: 0.75}]),
				TYPE: ["bullet", {PERSISTS_AFTER_DEATH: true}],
				STAT_CALCULATOR: "thruster",
			},
		}, {
			POSITION: [14, 6, 1, 0, 2, 230, 0],
			PROPERTIES: {
				AUTOFIRE: true,
				SHOOT_SETTINGS: combineStats([g.basic, g.lowPower, {reload: 1.15, speed: 1.3, maxSpeed: 1.3, recoil: 0.75}]),
				TYPE: ["bullet", {PERSISTS_AFTER_DEATH: true}],
				STAT_CALCULATOR: "thruster",
			},
		}, {
			POSITION: [14, 6, 1, 0, 0, 0, 0.2],
			PROPERTIES: {
				AUTOFIRE: true,
				SHOOT_SETTINGS: combineStats([g.basic, g.lowPower, g.skimmer, {reload: 1.15, speed: 1.15, maxSpeed: 1.15, recoil: 0.75}]),
				TYPE: ["bullet", {PERSISTS_AFTER_DEATH: true}],
			},
		},
	],
}

// Bodies
Class.colossusBody_dreadsV2 = makeHat([[0.8838834762573242,0.8838834762573242],[0,1.25],[-0.8838834762573242,0.8838834762573242],[-1.25,0],[-0.8838834762573242,-0.8838834762573242],[0,-1.25],[0.8838834762573242,-0.8838834762573242],[1.25,0]], { color: "black" })

// Miscellaneous
Class.hexagonLeviathanTop_dreadsV2 = {
	PARENT: "genericHexnought",
	LABEL: "Leviathan",
	GUNS: weaponArray({
		POSITION: [6, 10, 0.001, 9.5, 0, 0, 0],
		PROPERTIES: {COLOR: 9},
	}, 6),
}
Class.hexagonLeviathanBottom_dreadsV2 = {
	PARENT: "genericHexnought",
	LABEL: "Leviathan",
	GUNS: weaponArray({
		POSITION: [7, 13.5, 0.001, 9.5, 0, 0, 0],
		PROPERTIES: {COLOR: 9},
	}, 6),
}
Class.pentagonLeviathanTop_dreadsV2 = {
	PARENT: "genericPentanought",
	LABEL: "Leviathan",
	GUNS: weaponArray({
		POSITION: [6, 13.5, 0.001, 9, 0, 0, 0],
		PROPERTIES: {COLOR: 9},
	}, 5),
}
Class.pentagonLeviathanBottom_dreadsV2 = {
	PARENT: "genericPentanought",
	LABEL: "Leviathan",
	GUNS: weaponArray({
		POSITION: [7, 17, 0.001, 9, 0, 0, 0],
		PROPERTIES: {COLOR: 9},
	}, 5),
}
Class.titanTop_dreadsV2 = {
	PARENT: "genericTrinought",
	GUNS: weaponArray({
		POSITION: [5, 26, 0.001, 8, 0, 0, 0],
		PROPERTIES: {COLOR: 9},
	}, 3),
}

// Auras
Class.atmosphereAura_dreadsV2 = makeAura(1, 1, 0.25)
Class.coronaAura_dreadsV2 = makeAura(1.15, 0.8, 0.25)
Class.trinoughtBigAura = makeAura(0.7, 1.5)
Class.trinoughtSmallAura = makeAura(0.7, 2.1, 0.25)
Class.pentanoughtBigAura = makeAura(1.2, 1.45)
Class.pentanoughtSmallAura = makeAura(1.2, 1.6, 0.25)
if (useOldPhotosphere) {
	Class.photosphereSmallAura_dreadsV2 = makeAura(1.25, 1.85, 0.15)
	Class.photosphereBigAura_dreadsV2 = makeAura(0.25, 4)
}
Class.gladiatorAuraMinionAura_dreadsV2 = makeAura(1/3, 1.2)

Class.thermosphereAura_dreadsV2 = makeAura(-1, 1.5)
Class.trinoughtBigHealAura = makeAura(-0.7, 1.5)
Class.trinoughtSmallHealAura = makeAura(-0.7, 2.1, 0.15)
Class.pentanoughtBigHealAura = makeAura(-0.8, 1.45)
Class.pentanoughtSmallHealAura = makeAura(-0.8, 1.6, 0.15)
Class.gladiatorHealAuraMinionAura_dreadsV2 = makeAura(-1/3, 1.2)

// gStat turret modifiers
g.triSecondaryAuto = {reload: 1.1, health: 0.83};
g.pentaSecondaryAuto = {reload: 1.1, health: 0.88}
g.triKilobyte = {reload: 1.05, health: 0.9, speed: 0.95, maxSpeed: 0.95};
g.pentaMegabyte = {reload: 1.05, health: 0.95, speed: 0.9, maxSpeed: 0.9};

// T0
Class.dreadnought_dreadsV2 = {
	PARENT: "genericEggnought",
	LABEL: "Dreadnought",
	//UPGRADE_LABEL: "Dreads V2",
	//LEVEL: 90,
	EXTRA_SKILL: 18,
}
Class.dreadWeapon_dreadsV2 = {
	LABEL: "",
	COLOR: 'egg',
	REROOT_UPGRADE_TREE: "dreadWeapon_dreadsV2",
}
Class.dreadBody_dreadsV2 = {
	LABEL: "",
	COLOR: 'egg',
	REROOT_UPGRADE_TREE: "dreadBody_dreadsV2",
}

// T1 Weapons
Class.centaur_dreadsV2 = {
	PARENT: "genericEggnought",
	LABEL: "Centaur",
	GUNS: weaponArray([
		{
			POSITION: {
				LENGTH: 14,
				WIDTH: 7
			}
		},
		{
			POSITION: {
				LENGTH: 3,
				WIDTH: 7,
				ASPECT: 1.5,
				X: 13
			},
			PROPERTIES: {
				SHOOT_SETTINGS: combineStats([g.trap, g.pounder, {health: 1.15, shudder: 0.4, speed: 0.85, range: 0.85}]),
				TYPE: "trap",
				STAT_CALCULATOR: "trap"
			}
		}
	], 2)
}
Class.invader_dreadsV2 = {
	PARENT: "genericEggnought",
	LABEL: "Invader",
	BODY: { 
		FOV: eggnoughtBody.FOV * 1.1,
		SPEED: eggnoughtBody.SPEED * 0.9
	},
	GUNS: weaponArray({
		POSITION: {
			LENGTH: 5,
			WIDTH: 8,
			ASPECT: 1.3,
			X: 8
		},
		PROPERTIES: {
			SHOOT_SETTINGS: combineStats([g.drone, g.overseer, {reload: 0.85, health: 1.08, maxSpeed: 0.95}]),
			TYPE: "drone",
			MAX_CHILDREN: 4,
			AUTOFIRE: true,
			SYNCS_SKILLS: true,
			STAT_CALCULATOR: "drone",
			WAIT_TO_CYCLE: true
		}
	}, 2)
}
Class.pacifier_dreadsV2 = {
	PARENT: "genericEggnought",
	LABEL: "Pacifier",
	GUNS: weaponArray({
		POSITION: {
			LENGTH: 15,
			WIDTH: 7
		},
		PROPERTIES: {
			SHOOT_SETTINGS: combineStats([g.basic, {speed: 0.9, maxSpeed: 0.9, health: 1.15}]),
			TYPE: "bullet"
		}
	}, 2)
}
Class.peacekeeper_dreadsV2 = {
	PARENT: "genericEggnought",
	LABEL: "Peacekeeper",
	GUNS: weaponArray({
		POSITION: {
			LENGTH: 17,
			WIDTH: 9
		},
		PROPERTIES: {
			SHOOT_SETTINGS: combineStats([g.basic, g.pounder, {reload: 0.9, damage: 0.96, range: 0.9}]),
			TYPE: "bullet"
		}
	}, 2)
}
Class.sword_dreadsV2 = {
	PARENT: "genericEggnought",
	LABEL: "Sword",
	BODY: {
		FOV: eggnoughtBody.FOV * 1.2
	},
	GUNS: weaponArray({
		POSITION: {
			LENGTH: 20,
			WIDTH: 7
		},
		PROPERTIES: {
			SHOOT_SETTINGS: combineStats([g.basic, g.sniper, g.assassin, {reload: 1.1, health: 1.2, range: 0.65}]),
			TYPE: "bullet"
		}
	}, 2)
}

// T1 Bodies
Class.atmosphere_dreadsV2 = {
	PARENT: "genericEggnought",
	LABEL: "Atmosphere",
	TURRETS: [
		{
			TYPE: "atmosphereAura_dreadsV2",
			POSITION: {
				SIZE: 11,
				LAYER: 2
			}
		}
	],
	PROPS: [
		{
			TYPE: ["circleHat", { COLOR: "mirror" }],
			POSITION: {
				SIZE: 14.5,
				LAYER: 1
			}
		}
	]
}
Class.byte_dreadsV2 = {
	PARENT: "genericEggnought",
	LABEL: "Byte",
	TURRETS: [
		{
			TYPE: "byteTurret_dreadsV2",
			POSITION: {
				SIZE: 9,
				LAYER: 2
			}
		}
	],
	PROPS: [
		{
			TYPE: ["circleHat", { COLOR: "mirror" }],
			POSITION: {
				SIZE: 15,
				LAYER: 1
			}
		}
	]
}
Class.dropper_dreadsV2 = {
	PARENT: "genericEggnought",
	LABEL: "Dropper",
	GUNS: [
		{
			POSITION: {
				LENGTH: 0,
				WIDTH: 7,
				X: 3
			},
			PROPERTIES: {
				SHOOT_SETTINGS: combineStats([g.trap, {maxSpeed: 1e-3, speed: 1e-3}]),
				TYPE: "trap",
				STAT_CALCULATOR: "trap"
			}
		}
	],
	TURRETS: [
		{
			TYPE: 'dropperTurret_dreadsV2',
			POSITION: {
				SIZE: 9,
				LAYER: 2
			}
		}
	],
	PROPS: [
		{
			TYPE: ["circleHat", { COLOR: "mirror" }],
			POSITION: {
				SIZE: 15,
				LAYER: 1
			}
		}
	]
}
Class.juggernaut_dreadsV2 = {
	PARENT: "genericEggnought",
	LABEL: "Juggernaut",
	BODY: hpBuffBodyStats[0],
	PROPS: [
		{
			TYPE: "circleHat",
			POSITION: {
				SIZE: 14.5,
				LAYER: 1
			}
		},
		{
			TYPE: ["circleHat", { COLOR: "black" }],
			POSITION: {
				SIZE: 24
			}
		}
	]
}
Class.shower_dreadsV2 = {
	PARENT: "genericEggnought",
	LABEL: "Shower",
	BODY: {
		SPEED: 0.93,
		FOV: 1.1
	},
	TURRETS: [
		{
			TYPE: "showerTurret_dreadsV2",
			POSITION: {
				SIZE: 9,
				LAYER: 2
			}
		}
	],
	PROPS: [
		{
			TYPE: ["circleHat", { COLOR: "mirror" }],
			POSITION: {
				SIZE: 15,
				LAYER: 1
			}
		}
	]
}
Class.spotter_dreadsV2 = {
	PARENT: "genericEggnought",
	LABEL: "Spotter",
	BODY: {
		FOV: 1.1
	},
	TURRETS: [
		{
			TYPE: 'egg',
			POSITION: {
				SIZE: 15,
				LAYER: 1
			}
		},
		{
			TYPE: 'egg',
			POSITION: {
				SIZE: 9,
				LAYER: 1
			}
		},
		{
			TYPE: 'spotterRadar_dreadsV2',
			POSITION: {
				SIZE: 13,
				LAYER: 1
			}
		}
	]
}
Class.stomper_dreadsV2 = {
	PARENT: "genericEggnought",
	LABEL: "Stomper",
	SIZE: 1.2,
	BODY: {
		SPEED: 0.9,
		HEALTH: 1.6
	},
	GUNS: weaponArray({
		POSITION: {
			LENGTH: 10,
			WIDTH: 10,
			ASPECT: 0,
			ANGLE: 90
		},
		PROPERTIES: {
			COLOR: "black",
			DRAW_ABOVE: true
		}
	}, 2),
	TURRETS: [
		{
			TYPE: ["circleHat", { COLOR: "mirror" }],
			POSITION: {
				SIZE: 10,
				LAYER: 1
			}
		}
	]
}

// T2 Weapons
Class.assailant_dreadsV2 = {
	PARENT: "genericSquarenought",
	LABEL: "Assailant",
	BODY: { 
		FOV: squarenoughtBody.FOV * 1.1,
		SPEED: squarenoughtBody.SPEED * 0.85,
	},
	GUNS: weaponArray([
		{
			POSITION: {
				LENGTH: 4.5,
				WIDTH: 10,
				X: 10.5
			}
		},
		{
			POSITION: {
				LENGTH: 1.5,
				WIDTH: 11,
				X: 15
			},
			PROPERTIES: {
				MAX_CHILDREN: 4,
				SHOOT_SETTINGS: combineStats([g.minion, {size: 0.9, reload: 1.95, health: 1.3, damage: 0.65, pen: 0.9, speed: 0.8, maxSpeed: 0.8, density: 1.5}]),
				TYPE: "assailantMinion_dreadsV2",
				STAT_CALCULATOR: "drone",
				AUTOFIRE: true,
				SYNCS_SKILLS: true,
				MAX_CHILDREN: 2,
				WAIT_TO_CYCLE: true
			}
		},
		{
			POSITION: {
				LENGTH: 12,
				WIDTH: 11
			}
		}
	], 4)
}
Class.daemon_dreadsV2 = {
	PARENT: "genericSquarenought",
	LABEL: "Daemon",
	GUNS: weaponArray(weaponMirror([
		{
			POSITION: {
				LENGTH: 12,
				WIDTH: 4,
				Y: 4.5
			}
		},
		{
			POSITION: {
				LENGTH: 2,
				WIDTH: 4,
				ASPECT: 1.8,
				X: 11,
				Y: 4.5
			},
			PROPERTIES: {
				SHOOT_SETTINGS: combineStats([g.trap, g.twin, g.pounder, {health: 0.73, speed: 0.7, maxSpeed: 0.7, range: 0.67, shudder: 0.5}]),
				TYPE: "trap",
				STAT_CALCULATOR: "trap"
			}
		}
	], {delayIncrement: 0.5}), 4)
}
Class.enforcer_dreadsV2 = {
	PARENT: "genericSquarenought",
	LABEL: "Enforcer",
	GUNS: weaponArray({
		POSITION: {
			LENGTH: 17,
			WIDTH: 9
		},
		PROPERTIES: {
			SHOOT_SETTINGS: combineStats([g.basic, g.pounder, {reload: 1.25, health: 1.37, range: 0.9}]),
			TYPE: "bullet"
		}
	}, 4)
}
Class.executor_dreadsV2 = {
	PARENT: "genericSquarenought",
	LABEL: "Executor",
	GUNS: weaponArray([
		{
			POSITION: {
				LENGTH: 19.2,
				WIDTH: 9,
				ASPECT: 0.7
			},
			PROPERTIES: {
				SHOOT_SETTINGS: combineStats([g.basic, g.pounder, g.artillery, g.artillery, g.skimmer, {reload: 1.1, health: 1.35, speed: 0.7, maxSpeed: 0.65, range: 1/3}]),
				TYPE: ["missile", {GUN_STAT_SCALE: {recoil: 0.6}}],
				STAT_CALCULATOR: "sustained"
			}
		},
		{
			POSITION: {
				LENGTH: 17,
				WIDTH: 9
			}
		}
	], 4)
}
Class.gladius_dreadsV2 = {
	PARENT: "genericSquarenought",
	LABEL: "Gladius",
	BODY: { 
		FOV: squarenoughtBody.FOV * 1.225
	},
	GUNS: weaponArray([
		{
			POSITION: {
				LENGTH: 17,
				WIDTH: 8
			}
		},
		{
			POSITION: {
				LENGTH: 20,
				WIDTH: 5
			},
			PROPERTIES: {
				SHOOT_SETTINGS: combineStats([g.basic, g.sniper, g.rifle, {speed: 1.05, maxSpeed: 1.05, damage: 1.12, range: 0.65}]),
				TYPE: "bullet"
			}
		}
	], 4)
}
Class.inquisitor_dreadsV2 = {
	PARENT: "genericSquarenought",
	LABEL: "Inquisitor",
	BODY: { 
		FOV: squarenoughtBody.FOV * 1.1,
		SPEED: squarenoughtBody.SPEED * 0.9
	},
	GUNS: weaponArray({
		POSITION: {
			LENGTH: 5,
			WIDTH: 12,
			ASPECT: 1.1,
			X: 8
		},
		PROPERTIES: {
			SHOOT_SETTINGS: combineStats([g.drone, g.overseer, {reload: 0.9, health: 0.8, maxSpeed: 0.9}]),
			TYPE: "drone",
			MAX_CHILDREN: 3,
			AUTOFIRE: true,
			SYNCS_SKILLS: true,
			STAT_CALCULATOR: "drone",
			WAIT_TO_CYCLE: true
		}
	}, 4)
}
Class.mediator_dreadsV2 = {
	PARENT: "genericSquarenought",
	LABEL: "Mediator",
	GUNS: weaponArray(weaponMirror({
		POSITION: {
			LENGTH: 15,
			WIDTH: 7,
			Y: 4.25
		},
		PROPERTIES: {
			SHOOT_SETTINGS: combineStats([g.basic, g.twin, { health: 1.09, range: 0.9 }]),
			TYPE: "bullet"
		}
	}, {delayIncrement: 0.5}), 4)
}
Class.minotaur_dreadsV2 = {
	PARENT: "genericSquarenought",
	LABEL: "Minotaur",
	GUNS: weaponArray([
		{
			POSITION: {
				LENGTH: 13,
				WIDTH: 7
			}
		},
		{
			POSITION: {
				LENGTH: 3.6,
				WIDTH: 7,
				ASPECT: 1.6,
				X: 13
			},
			PROPERTIES: {
				SHOOT_SETTINGS: combineStats([g.trap, g.setTrap, g.pounder, {health: 0.85, shudder: 0.7, range: 0.67}]),
				TYPE: "unsetTrap",
				STAT_CALCULATOR: "block"
			}
		}
	], 4)
}
Class.negotiator_dreadsV2 = {
	PARENT: "genericSquarenought",
	LABEL: "Negotiator",
	GUNS: weaponArray({
		POSITION: {
			LENGTH: 15,
			WIDTH: 6,
			ASPECT: 1.8
		},
		PROPERTIES: {
			SHOOT_SETTINGS: combineStats([g.basic, g.machineGun, {size: 0.85, speed: 0.85, maxSpeed: 0.75, health: 1.23, range: 0.75}]),
			TYPE: "bullet"
		}
	}, 4)
}
Class.sabre_dreadsV2 = {
	PARENT: "genericSquarenought",
	LABEL: "Sabre",
	BODY: {
		FOV: squarenoughtBody.FOV * 1.4,
		SPEED: squarenoughtBody.SPEED * 0.9
	},
	GUNS: weaponArray([
		{
			POSITION: {
				LENGTH: 24,
				WIDTH: 7
			},
			PROPERTIES: {
				SHOOT_SETTINGS: combineStats([g.basic, g.sniper, g.assassin, {reload: 1.23, health: 4/3, speed: 1.1, maxSpeed: 1.1, density: 1.2, range: 0.65}]),
				TYPE: "bullet"
			}
		},
		{
			POSITION: {
				LENGTH: 11,
				WIDTH: 7,
				ASPECT: -2.5,
				X: 1
			}
		}
	], 4)
}
Class.sling_dreadsV2 = {
	PARENT: "genericSquarenought",
	LABEL: "Sling",
	CONTROLLERS: [["zoom", { distance: 300 }]],
	TOOLTIP: "Hold right click to zoom.",
	GUNS: weaponArray([
		{
			POSITION: {
				LENGTH: 20,
				WIDTH: 6
			},
			PROPERTIES: {
				SHOOT_SETTINGS: combineStats([g.basic, g.sniper, g.hunter, g.hunterSecondary, {health: 1.1, speed: 1.05}]),
				TYPE: "bullet"
			}
		},
		{
			POSITION: {
				LENGTH: 17,
				WIDTH: 9,
				DELAY: 0.25
			},
			PROPERTIES: {
				SHOOT_SETTINGS: combineStats([g.basic, g.sniper, g.hunter, {health: 1.1, speed: 1.05}]),
				TYPE: "bullet"
			}
		}
	], 4)
}

// T2 Bodies
Class.automation_dreadsV2 = {
	PARENT: "genericSquarenought",
	LABEL: "Automation",
	TURRETS: weaponArray({
		TYPE: ["spamAutoTurret", {GUN_STAT_SCALE: {reload: 0.9, health: 1.2}}],
		POSITION: {
			SIZE: 3.5,
			X: 9,
			ANGLE: 45,
			ARC: 180,
			LAYER: 2
		}
	}, 4),
	PROPS: [
		{
			TYPE: ["squareHat", { COLOR: "mirror" }],
			POSITION: {
				SIZE: 11,
				LAYER: 1
			}
		}
	]
}
Class.colossus_dreadsV2 = {
	PARENT: "genericSquarenought",
	LABEL: "Colossus",
	BODY: speedBuffBodyStats[0],
	PROPS: [
		{
			TYPE: "colossusBody_dreadsV2",
			POSITION: {
				SIZE: 13,
				LAYER: 1
			}
		},
		{
			TYPE: ["squareHat", { COLOR: "mirror" }],
			POSITION: {
				SIZE: 13,
				LAYER: 1
			}
		},
		{
			TYPE: "colossusBody_dreadsV2",
			POSITION: {
				SIZE: 20.5,
				LAYER: 0
			}
		}
	]
}
Class.corona_dreadsV2 = {
	PARENT: "genericSquarenought",
	LABEL: "Corona",
	TURRETS: [
		{
			TYPE: "coronaAura_dreadsV2",
			POSITION: {
				SIZE: 11,
				LAYER: 2
			}
		}
	],
	PROPS: [
		{
			TYPE: ["squareHat", { COLOR: "mirror" }],
			POSITION: {
				SIZE: 14.5,
				LAYER: 1
			}
		}
	]
}
Class.jumbo_dreadsV2 = {
	PARENT: "genericSquarenought",
	LABEL: "Jumbo",
	BODY: hpBuffBodyStats[1],
	PROPS: [
		{
			TYPE: ["squareHat", { COLOR: "mirror" }],
			POSITION: {
				SIZE: 14.5,
				LAYER: 1
			}
		},
		{
			TYPE: ["squareHat", { COLOR: "black" }],
			POSITION: {
				SIZE: 24
			}
		}
	]
}
Class.kilobyte_dreadsV2 = {
	PARENT: "genericSquarenought",
	LABEL: "Kilobyte",
	TURRETS: [
		{
			TYPE: "kilobyteTurret_dreadsV2",
			POSITION: {
				SIZE: 10,
				ARC: 360,
				LAYER: 2
			}
		}
	],
	PROPS: [
		{
			TYPE: ["squareHat", { COLOR: "mirror" }],
			POSITION: {
				SIZE: 12,
				LAYER: 1
			}
		}
	]
}
Class.thermosphere_dreadsV2 = {
	PARENT: "genericSquarenought",
	LABEL: "Thermosphere",
	BODY: healerBodyStats[0],
	TURRETS: [
		{
			TYPE: "thermosphereAura_dreadsV2",
			POSITION: {
				SIZE: 10,
				ARC: 360,
				LAYER: 2
			}
		}
	],
	PROPS: [
		{
			TYPE: ["squareHat", { COLOR: "mirror" }],
			POSITION: {
				SIZE: 14.5,
				LAYER: 1
			}
		}
	]
}

// T3 Weapons
Class.aggressor_dreadsV2 = {
	PARENT: "genericTrinought",
	LABEL: "Aggressor",
	BODY: { 
		FOV: trinoughtBody.FOV * 1.1,
		SPEED: trinoughtBody.SPEED * 0.85
	},
	GUNS: weaponArray([
		{
			POSITION: {
				LENGTH: 4.5,
				WIDTH: 12,
				X: 10.5
			}
		},
		{
			POSITION: {
				LENGTH: 1.5,
				WIDTH: 13,
				X: 15
			},
			PROPERTIES: {
				SHOOT_SETTINGS: combineStats([g.minion, {size: 0.9, reload: 1.8, health: 1.72, damage: 0.67, pen: 0.9, speed: 0.8, maxSpeed: 0.8, density: 1.6}]),
				TYPE: "aggressorMinion_dreadsV2",
				STAT_CALCULATOR: "drone",
				AUTOFIRE: true,
				SYNCS_SKILLS: true,
				MAX_CHILDREN: 2,
				WAIT_TO_CYCLE: true
			}
		},
		{
			POSITION: {
				LENGTH: 12,
				WIDTH: 13
			}
		}
	], 3)
}
Class.appeaser_dreadsV2 = {
	PARENT: "genericTrinought",
	LABEL: "Appeaser",
	GUNS: weaponArray([
		{
			POSITION: {
				LENGTH: 13,
				WIDTH: 8,
				ASPECT: 1.8
			},
			PROPERTIES: {
				SHOOT_SETTINGS: combineStats([g.basic, g.machineGun, g.twin, g.spam, {size: 0.7, health: 1.03, range: 0.75}]),
				TYPE: "bullet"
			}
		},
		{
			POSITION: {
				LENGTH: 15,
				WIDTH: 7,
				ASPECT: 1.8
			},
			PROPERTIES: {
				SHOOT_SETTINGS: combineStats([g.basic, g.machineGun, g.twin, g.spam, {size: 0.6, health: 1.03, range: 0.75, reload: 1.05}]),
				TYPE: "bullet"
			}
		}
	], 3)
}
Class.atlatl_dreadsV2 = {
	PARENT: "genericTrinought",
	LABEL: "Atlatl",
	CONTROLLERS: [["zoom", { distance: 500 }]],
	TOOLTIP: "Hold right click to zoom.",
	GUNS: weaponArray([
		{
			POSITION: {
				LENGTH: 21,
				WIDTH: 6
			},
			PROPERTIES: {
				SHOOT_SETTINGS: combineStats([g.basic, g.sniper, g.assassin, g.hunter, g.hunterSecondary, {health: 1.1}]),
				TYPE: "bullet"
			}
		},
		{
			POSITION: {
				LENGTH: 18,
				WIDTH: 9,
				DELAY: 0.25
			},
			PROPERTIES: {
				SHOOT_SETTINGS: combineStats([g.basic, g.sniper, g.assassin, g.hunter, {health: 1.1}]),
				TYPE: "bullet"
			}
		},
		{
			POSITION: {
				LENGTH: 5,
				WIDTH: 9,
				ASPECT: -1.6,
				X: 6
			}
		}
	], 3)
}
Class.bayonet_dreadsV2 = {
	PARENT: "genericTrinought",
	LABEL: "Bayonet",
	BODY: {
		FOV: trinoughtBody.FOV * 1.5,
		SPEED: trinoughtBody.SPEED * 0.85
	},
	GUNS: weaponArray([
		{
			POSITION: {
				LENGTH: 28,
				WIDTH: 7
			},
			PROPERTIES: {
				SHOOT_SETTINGS: combineStats([g.basic, g.sniper, g.assassin, g.assassin, {reload: 1.05, health: 0.98, density: 0.45, range: 0.65}]),
				TYPE: "bullet"
			}
		},
		{
			POSITION: {
				LENGTH: 11,
				WIDTH: 7,
				ASPECT: -2.5,
				X: 1
			}
		}
	], 3)
}
Class.beelzebub_dreadsV2 = {
	PARENT: "genericTrinought",
	LABEL: "Beelzebub",
	GUNS: weaponArray([
		{
			POSITION: {
				LENGTH: 14,
				WIDTH: 10
			}
		},
		{
			POSITION: {
				LENGTH: 3.6,
				WIDTH: 10,
				ASPECT: 1.6,
				X: 13
			},
			PROPERTIES: {
				SHOOT_SETTINGS: combineStats([g.trap, g.setTrap, g.pounder, {health: 1.4, speed: 1.16, maxSpeed: 1.16, size: 1.2, shudder: 0.65, range: 0.55}]),
				TYPE: "unsetTrap",
				STAT_CALCULATOR: "block"
			}
		}
	], 3)
}
Class.blade_dreadsV2 = {
	PARENT: "genericTrinought",
	LABEL: "Blade",
	BODY: { 
		FOV: trinoughtBody.FOV * 1.225
	},
	GUNS: weaponArray([
		{
			POSITION: {
				LENGTH: 16,
				WIDTH: 12.5
			}
		},
		...weaponMirror({
			POSITION: {
				LENGTH: 18,
				WIDTH: 5,
				Y: 2.8
			},
			PROPERTIES: {
				SHOOT_SETTINGS: combineStats([g.basic, g.sniper, g.rifle, g.twin, {speed: 1.09, maxSpeed: 1.09, health: 1.09, range: 0.65}]),
				TYPE: "bullet"
			}
		}, {delayIncrement: 0.5})
	], 3)
}
Class.hydra_dreadsV2 = {
	PARENT: "genericTrinought",
	LABEL: "Hydra",
	GUNS: weaponArray([
		...weaponMirror([{
			POSITION: {
				LENGTH: 5,
				WIDTH: 4,
				X: 5,
				Y: 8.5
			}
		},
		{
			POSITION: {
				LENGTH: 2,
				WIDTH: 4,
				ASPECT: 1.8,
				X: 10,
				Y: 8.5
			},
			PROPERTIES: {
				SHOOT_SETTINGS: combineStats([g.trap, g.twin, g.pounder, {shudder: 0.6, health: 0.7, range: 0.85}]),
				TYPE: "trap",
				STAT_CALCULATOR: "trap",
			},
		}]),
		{
			POSITION: {
				LENGTH: 13,
				WIDTH: 5
			}
		},
		{
			POSITION: {
				LENGTH: 2.5,
				WIDTH: 5,
				ASPECT: 1.7,
				X: 12
			},
			PROPERTIES: {
				SHOOT_SETTINGS: combineStats([g.trap, g.setTrap, g.twin, g.pounder, {reload: 1.1, health: 1.02, speed: 0.75, maxSpeed: 0.75, range: 0.65}]),
				TYPE: "unsetTrap",
				STAT_CALCULATOR: "block"
			}
		}
	], 3)
}
Class.infiltrator_dreadsV2 = {
	PARENT: "genericTrinought",
	LABEL: "Infiltrator",
	BODY: { 
		FOV: trinoughtBody.FOV * 1.1,
		SPEED: trinoughtBody.SPEED * 0.9
	},
	GUNS: weaponArray([
		...weaponMirror({
			POSITION: {
				LENGTH: 6,
				WIDTH: 8,
				ASPECT: -0.6,
				X: 5,
				Y: 6
			},
			PROPERTIES: {
				SHOOT_SETTINGS: combineStats([g.drone, g.overseer, g.overseer, {maxSpeed: 0.9, size: 1.5, reload: 1.4}]),
				TYPE: "drone",
				MAX_CHILDREN: 2,
				AUTOFIRE: true,
				SYNCS_SKILLS: true,
				STAT_CALCULATOR: "drone",
				WAIT_TO_CYCLE: true
			}
		}),
		{
			POSITION: {
				LENGTH: 8,
				WIDTH: 8.5,
				ASPECT: -0.6,
				X: 5
			},
			PROPERTIES: {
				SHOOT_SETTINGS: combineStats([g.drone, g.overseer, g.overseer, g.pounder, {damage: 0.85, maxSpeed: 0.9, size: 2, reload: 1.4}]),
				TYPE: "betadrone",
				MAX_CHILDREN: 2,
				AUTOFIRE: true,
				SYNCS_SKILLS: true,
				STAT_CALCULATOR: "drone",
				WAIT_TO_CYCLE: true
			}
		}
	], 3)
}
Class.inhibitor_dreadsV2 = {
	PARENT: "genericTrinought",
	LABEL: "Inhibitor",
	GUNS: weaponArray([
		{
			POSITION: {
				LENGTH: 17,
				WIDTH: 14,
				ASPECT: -0.5
			}
		},
		{
			POSITION: {
				LENGTH: 15,
				WIDTH: 15
			},
			PROPERTIES: {
				SHOOT_SETTINGS: combineStats([g.basic, g.pounder, g.artillery, g.artillery, g.skimmer, {reload: 1.15, health: 4/3, speed: 0.7, maxSpeed: 0.7, range: 0.4}]),
				TYPE: "supermissile",
				STAT_CALCULATOR: "sustained"
			}
		}
	], 3)
}
Class.mitigator_dreadsV2 = {
	PARENT: "genericTrinought",
	LABEL: "Mitigator",
	GUNS: weaponArray(weaponMirror({
		POSITION: {
			LENGTH: 8,
			WIDTH: 8,
			X: 5,
			Y: 5
		},
		PROPERTIES: {
			SHOOT_SETTINGS: combineStats([g.basic, g.twin, {health: 1.15, range: 0.9}]),
			TYPE: "bullet"
		}
	}, {delayIncrement: 0.5}), 3)
}
Class.suppressor_dreadsV2 = {
	PARENT: "genericTrinought",
	LABEL: "Suppressor",
	GUNS: weaponArray({
		POSITION: {
			LENGTH: 17,
			WIDTH: 12
		},
		PROPERTIES: {
			SHOOT_SETTINGS: combineStats([g.basic, g.pounder, g.destroyer, {reload: 1.1, health: 1.19}]),
			TYPE: "bullet"
		}
	}, 3)
}

// T3 Bodies
Class.binary_dreadsV2 = {
	PARENT: "genericTrinought",
	LABEL: "Binary",
	TURRETS: [
		...weaponArray({
			TYPE: ["spamAutoTurret", {GUN_STAT_SCALE: g.triSecondaryAuto}],
			POSITION: {
				SIZE: 3.5,
				X: 10.5,
				ANGLE: 60,
				ARC: 180,
				LAYER: 2
			}
		}, 3),
		{
			TYPE: ["kilobyteTurret_dreadsV2", {GUN_STAT_SCALE: g.triKilobyte}],
			POSITION: {
				SIZE: 10,
				ARC: 360,
				LAYER: 2
			}
		}
	],
	PROPS: [
		{
			TYPE: ["triangleHat", {COLOR: "mirror"}],
			POSITION: {
				SIZE: 13.5,
				ANGLE: 180,
				LAYER: 1
			}
		}
	]
}
Class.chromosphere_dreadsV2 = {
	PARENT: "genericTrinought",
	LABEL: "Chromosphere",
	TURRETS: [
		...weaponArray({
			TYPE: "trinoughtSmallAura",
			POSITION: {
				SIZE: 3.5,
				X: 10.5,
				ANGLE: 60,
				LAYER: 2
			}
		}, 3),
		{
			TYPE: "trinoughtBigAura",
			POSITION: {
				SIZE: 9,
				LAYER: 2
			}
		}
	],
	PROPS: [
		{
			TYPE: ["triangleHat", {COLOR: "mirror"}],
			POSITION: {
				SIZE: 13,
				ANGLE: 180,
				LAYER: 1
			}
		}
	]
}
Class.exosphere_dreadsV2 = {
	PARENT: "genericTrinought",
	LABEL: "Exosphere",
	BODY: healerBodyStats[0],
	TURRETS: [
		...weaponArray({
			TYPE: ["spamAutoTurret", {GUN_STAT_SCALE: g.triSecondaryAuto}],
			POSITION: {
				SIZE: 3.5,
				X: 10.5,
				ANGLE: 60,
				ARC: 180,
				LAYER: 2
			}
		}, 3),
		{
			TYPE: "trinoughtBigHealAura",
			POSITION: {
				SIZE: 9,
				LAYER: 2
			}
		}
	],
	PROPS: [
		{
			TYPE: ["triangleHat", {COLOR: "mirror"}],
			POSITION: {
				SIZE: 13,
				ANGLE: 180,
				LAYER: 1
			}
		}
	]
}
Class.fusion_dreadsV2 = {
	PARENT: "genericTrinought",
	LABEL: "Fusion",
	TURRETS: [
		...weaponArray({
			TYPE: ["spamAutoTurret", {GUN_STAT_SCALE: g.triSecondaryAuto}],
			POSITION: {
				SIZE: 3.5,
				X: 10.5,
				ARC: 60,
				ANGLE: 180,
				LAYER: 2
			}
		}, 3),
		{
			TYPE: "trinoughtBigAura",
			POSITION: {
				SIZE: 9,
				LAYER: 2
			}
		},
	],
	PROPS: [
		{
			TYPE: ["triangleHat", {COLOR: "mirror"}],
			POSITION: {
				SIZE: 13,
				ANGLE: 180,
				LAYER: 1
			}
		}
	]
}
Class.goliath_dreadsV2 = {
	PARENT: "genericTrinought",
	LABEL: "Goliath",
	BODY: hpBuffBodyStats[2],
	PROPS: [
		{
			TYPE: ["triangleHat", {COLOR: "black"}],
			POSITION: {
				SIZE: 14.5,
				ANGLE: 180,
				LAYER: 1
			}
		},
		{
			TYPE: ["triangleHat", {COLOR: "black"}],
			POSITION: {
				SIZE: 24,
				ANGLE: 180
			}
		}
	]
}
Class.hardware_dreadsV2 = {
	PARENT: "genericTrinought",
	LABEL: "Hardware",
	BODY: healerBodyStats[0],
	TURRETS: [
		...weaponArray({
			TYPE: "trinoughtSmallHealAura",
			POSITION: {
				SIZE: 3.5,
				X: 11,
				ANGLE: 60,
				LAYER: 2
			}
		}, 3),
		{
			TYPE: ["kilobyteTurret_dreadsV2", {GUN_STAT_SCALE: g.triKilobyte}],
			POSITION: {
				SIZE: 10,
				LAYER: 2
			}
		}
	],
	PROPS: [
		{
			TYPE: "triangleHat",
			POSITION: {
				SIZE: 13,
				ANGLE: 180,
				LAYER: 1
			}
		}
	]
}
Class.harpy_dreadsV2 = {
	PARENT: "genericTrinought",
	LABEL: "Harpy",
	BODY: combineBodyStats(speedBuffBodyStats[0], healerBodyStats[0]),
	TURRETS: weaponArray({
		TYPE: "trinoughtSmallHealAura",
		POSITION: {
			SIZE: 3.5,
			X: 10.5,
			ANGLE: 60,
			LAYER: 2
		}
	}, 3),
	PROPS: [
		{
			TYPE: "triangleHat",
			POSITION: {
				SIZE: 11,
				ANGLE: 180,
				LAYER: 1
			}
		},
		{
			TYPE: "titanTop_dreadsV2",
			POSITION: {
				SIZE: 20
			}
		}
	]
}

// up to here
Class.mechanism_dreadsV2 = {
	PARENT: "genericTrinought",
	LABEL: "Mechanism",
	TURRETS: weaponArray([
		{
			POSITION: [3.5, 6, 0, 0, 180, 2],
			TYPE: "spamAutoTurret",
		}, {
			POSITION: [3.5, 10, 0, 60, 180, 2],
			TYPE: "spamAutoTurret",
		},
	], 3),
	PROPS: [
		{
			POSITION: [10, 0, 0, 180, 1],
			TYPE: "triangle"
		},
	],
}
Class.megabyte_dreadsV2 = {
	PARENT: "genericTrinought",
	LABEL: "Megabyte",
	TURRETS: [
		{
			POSITION: [12, 0, 0, 0, 360, 2],
			TYPE: "megabyteTurret_dreadsV2",
		},
	],
	PROPS: [
		{
			POSITION: [15, 0, 0, 180, 1],
			TYPE: "triangle"
		},
	]
}
Class.mesosphere_dreadsV2 = {
	PARENT: "genericTrinought",
	LABEL: "Mesosphere",
	BODY: healerBodyStats[1],
	TURRETS: [
		...weaponArray({
			POSITION: [3.5, 10.5, 0, 60, 360, 2],
			TYPE: "trinoughtSmallHealAura",
		}, 3),
		{
			POSITION: [9.5, 0, 0, 0, 360, 2],
			TYPE: "trinoughtBigHealAura",
		},
	],
	PROPS: [
		{
			POSITION: [13, 0, 0, 180, 1],
			TYPE: "triangle"
		},
	]
}
Class.moon_dreadsV2 = {
	PARENT: "genericTrinought",
	LABEL: "Moon",
	BODY: combineBodyStats(hpBuffBodyStats[1], healerBodyStats[0]),
	TURRETS: weaponArray({
		POSITION: [3.5, 10.5, 0, 60, 360, 2],
		TYPE: "trinoughtSmallHealAura",
	}, 3),
	PROPS: [
		{
			POSITION: [24, 0, 0, 180, 0],
			TYPE: ['triangle', {COLOR: 9}]
		}, {
			POSITION: [12, 0, 0, 180, 1],
			TYPE: "triangle"
		}
	],
}
Class.planet_dreadsV2 = {
	PARENT: "genericTrinought",
	LABEL: "Planet",
	BODY: hpBuffBodyStats[1],
	TURRETS: weaponArray({
		POSITION: [3.5, 10.5, 0, 60, 360, 2],
		TYPE: "trinoughtSmallAura",
	}, 3),
	PROPS: [
		{
			POSITION: [24, 0, 0, 180, 0],
			TYPE: ['triangle', {COLOR: 9}]
		}, {
			POSITION: [12, 0, 0, 180, 1],
			TYPE: "triangle"
		}
	],
}
Class.siren_dreadsV2 = {
	PARENT: "genericTrinought",
	LABEL: "Siren",
	BODY: speedBuffBodyStats[0],
	TURRETS: weaponArray({
		POSITION: [3.5, 10.5, 0, 60, 360, 2],
		TYPE: "trinoughtSmallAura",
	}, 3),
	PROPS: [
		{
			POSITION: [12, 0, 0, 180, 1],
			TYPE: "triangle"
		}, {
			POSITION: [20, 0, 0, 0, 0],
			TYPE: "titanTop_dreadsV2"
		},
	],
}
Class.titan_dreadsV2 = {
	PARENT: "genericTrinought",
	LABEL: "Titan",
	BODY: speedBuffBodyStats[1],
	PROPS: [
		{
			POSITION: [11, 0, 0, 0, 1],
			TYPE: "titanTop_dreadsV2"
		}, {
			POSITION: [20, 0, 0, 0, 0],
			TYPE: "titanTop_dreadsV2"
		},
	],
}
Class.trojan_dreadsV2 = {
	PARENT: "genericTrinought",
	LABEL: "Trojan",
	TURRETS: [
		...weaponArray({
			POSITION: [3.5, 11, 0, 60, 360, 2],
			TYPE: "trinoughtSmallAura",
		}, 3),
		{
			POSITION: [10, 0, 0, 0, 360, 2],
			TYPE: ["kilobyteTurret_dreadsV2", {GUN_STAT_SCALE: g.triKilobyte}],
		},
	],
	PROPS: [
		{
			POSITION: [13, 0, 0, 180, 1],
			TYPE: "triangle"
		},
	]
}

// T4 Weapons
Class.arbitrator_dreadsV2 = {
	PARENT: "genericPentanought",
	LABEL: "Arbitrator",
	GUNS: weaponArray([
		{
			POSITION: {
				LENGTH: 13,
				WIDTH: 8,
				ASPECT: 1.8
			},
			PROPERTIES: {
				SHOOT_SETTINGS: combineStats([g.basic, g.machineGun, g.twin, g.triplet, g.spam, g.spam, {size: 0.7,  health: 1.05, range: 0.8, reload: 1}]),
				TYPE: "bullet",
			}
		},
		{
			POSITION: {
				LENGTH: 15,
				WIDTH: 7,
				ASPECT: 1.8
			},
			PROPERTIES: {
				SHOOT_SETTINGS: combineStats([g.basic, g.machineGun, g.twin, g.triplet, g.spam, g.spam, {size: 0.65, health: 1.05, range: 0.8, reload: 1.05}]),
				TYPE: "bullet",
			}
		},
		{
			POSITION: {
				LENGTH: 17,
				WIDTH: 5,
				ASPECT: 1.8
			},
			PROPERTIES: {
				SHOOT_SETTINGS: combineStats([g.basic, g.machineGun, g.twin, g.triplet, g.spam, g.spam, {size: 0.7,  health: 1.05, range: 0.8, reload: 1.1}]),
				TYPE: "bullet",
			}
		}
	], 5)
}
Class.cerberus_dreadsV2 = {
	PARENT: "genericPentanought",
	LABEL: "Cerberus",
	GUNS: weaponArray([
		...weaponMirror([
			{
				POSITION: {
					LENGTH: 12.5,
					WIDTH: 3,
					Y: 3,
					ANGLE: 10
				}
			},
			{
				POSITION: {
					LENGTH: 1.5,
					WIDTH: 3,
					ASPECT: 1.7,
					X: 12,
					Y: 3,
					ANGLE: 10,
					DELAY: 0.5
				},
				PROPERTIES: {
					SHOOT_SETTINGS: combineStats([g.trap, g.twin, g.pounder, {shudder: 0.6, health: 0.55, reload: 1.2, range: 0.67}]),
					TYPE: "trap",
					STAT_CALCULATOR: "trap"
				}
			}
		]),
		{
			POSITION: {
				LENGTH: 15,
				WIDTH: 5.5
			}
		},
		{
			POSITION: {
				LENGTH: 2,
				WIDTH: 5.5,
				ASPECT: 1.7,
				X: 14
			},
			PROPERTIES: {
				SHOOT_SETTINGS: combineStats([g.trap, g.setTrap, g.twin, g.pounder, {reload: 1.15, health: 0.85, speed: 0.75, maxSpeed: 0.75, range: 0.5}]),
				TYPE: "unsetTrap",
				STAT_CALCULATOR: "block"
			}
		}
	], 5)
}
Class.diplomat_dreadsV2 = {
	PARENT: "genericPentanought",
	LABEL: "Diplomat",
	GUNS: weaponArray([
		...weaponMirror({
			POSITION: {
				LENGTH: 13,
				WIDTH: 7,
				Y: 3.25,
				DELAY: 0.5
			},
			PROPERTIES: {
				SHOOT_SETTINGS: combineStats([g.basic, g.twin, g.triplet, {health: 1.15}]),
				TYPE: "bullet"
			}
		}),
		{
			POSITION: {
				LENGTH: 15,
				WIDTH: 7
			},
			PROPERTIES: {
				SHOOT_SETTINGS: combineStats([g.basic, g.twin, g.triplet, {health: 1.15}]),
				TYPE: "bullet"
			}
		}
	], 5)
}
Class.gladiator_dreadsV2 = {
	PARENT: "genericPentanought",
	LABEL: "Gladiator",
	BODY: { 
		FOV: pentanoughtBody.FOV * 1.1,
		SPEED: pentanoughtBody.SPEED * 0.85
	},
	GUNS: weaponArray([
		{
			POSITION: {
				LENGTH: 15,
				WIDTH: 12
			}
		},
		{
			POSITION: {
				LENGTH: 1.5,
				WIDTH: 13,
				X: 15
			},
			PROPERTIES: {
				SHOOT_SETTINGS: combineStats([g.minion, {size: 0.9, reload: 2.1, health: 1.16, damage: 0.62, pen: 0.9, speed: 0.8, maxSpeed: 0.8, density: 1.6}]),
				TYPE: "minion",
				STAT_CALCULATOR: "drone",
				AUTOFIRE: true,
				SYNCS_SKILLS: true,
				MAX_CHILDREN: 2,
				WAIT_TO_CYCLE: true,
			},
		},
		{
			POSITION: {
				LENGTH: 12,
				WIDTH: 13
			}
		}
	], 5)
}
let minionIndex = 0;
for (let gun of Class.gladiator_dreadsV2.GUNS) {
	minionIndex = setGladiatorMinion(gun, minionIndex);
}
Class.javelin_dreadsV2 = {
	PARENT: "genericPentanought",
	LABEL: "Javelin",
	BODY: {
		FOV: pentanoughtBody.FOV * 1.5,
		SPEED: pentanoughtBody.SPEED * 0.85
	},
	GUNS: weaponArray([
		{
			POSITION: {
				LENGTH: 28,
				WIDTH: 7
			},
			PROPERTIES: {
				SHOOT_SETTINGS: combineStats([g.basic, g.sniper, g.assassin, g.assassin, {reload: 1.13, health: 1.1, density: 0.55, range: 0.65}]),
				TYPE: "bullet",
			},
		},
		{
			POSITION: {
				LENGTH: 11,
				WIDTH: 7,
				ASPECT: -2.5,
				X: 1
			}
		}
	], 5)
}
Class.lucifer_dreadsV2 = {
	PARENT: "genericPentanought",
	LABEL: "Lucifer",
	GUNS: weaponArray([
		{
			POSITION: {
				LENGTH: 14,
				WIDTH: 10
			}
		},
		{
			POSITION: {
				LENGTH: 3.6,
				WIDTH: 10,
				ASPECT: 1.6,
				X: 13
			},
			PROPERTIES: {
				SHOOT_SETTINGS: combineStats([g.trap, g.setTrap, g.pounder, {reload: 1.2, speed: 1.15, maxSpeed: 1.15, size: 1.25, health: 1.15, range: 0.37}]),
				TYPE: "unsetTrap",
				STAT_CALCULATOR: "block"
			}
		}
	], 5)
}
Class.raider_dreadsV2 = {
	PARENT: "genericPentanought",
	LABEL: "Raider",
	BODY: { 
		FOV: pentanoughtBody.FOV * 1.1,
		SPEED: pentanoughtBody.SPEED * 0.9
	},
	GUNS: weaponArray([
		...weaponMirror({
			POSITION: {
				LENGTH: 6,
				WIDTH: 8,
				ASPECT: -0.05,
				X: 6,
				Y: 4.275
			},
			PROPERTIES: {
				SHOOT_SETTINGS: combineStats([g.drone, g.overseer, g.overseer, {damage: 0.9, health: 0.63, maxSpeed: 0.9, size: 1.5, reload: 1.5}]),
				TYPE: "drone",
				MAX_CHILDREN: 2,
				AUTOFIRE: true,
				SYNCS_SKILLS: true,
				STAT_CALCULATOR: "drone",
				WAIT_TO_CYCLE: true
			}
		}),
		{
			POSITION: {
				LENGTH: 8,
				WIDTH: 8.5,
				ASPECT: -0.6,
				X: 6
			},
			PROPERTIES: {
				SHOOT_SETTINGS: combineStats([g.drone, g.overseer, g.overseer, g.pounder, {damage: 1.06, maxSpeed: 0.9, size: 2, reload: 1.5}]),
				TYPE: "betadrone",
				MAX_CHILDREN: 1,
				AUTOFIRE: true,
				SYNCS_SKILLS: true,
				STAT_CALCULATOR: "drone",
				WAIT_TO_CYCLE: true
			}
		}
	], 5)
}
Class.rapier_dreadsV2 = {
	PARENT: "genericPentanought",
	LABEL: "Rapier",
	BODY: { 
		FOV: pentanoughtBody.FOV * 1.225
	},
	GUNS: weaponArray([
		{
			POSITION: {
				LENGTH: 16,
				WIDTH: 12.5
			}
		},
		...weaponMirror({
			POSITION: {
				LENGTH: 18,
				WIDTH: 5,
				Y: 2.8
			},
			PROPERTIES: {
				SHOOT_SETTINGS: combineStats([g.basic, g.sniper, g.rifle, g.twin, {speed: 1.13, maxSpeed: 1.13, health: 1.15, range: 0.65}]),
				TYPE: "bullet",
			}
		}, {delayIncrement: 0.5})
	], 5)
}
Class.retardant_dreadsV2 = {
	PARENT: "genericPentanought",
	LABEL: "Retardant",
	GUNS: weaponArray({
		POSITION: {
			LENGTH: 17,
			WIDTH: 12
		},
		PROPERTIES: {
			SHOOT_SETTINGS: combineStats([g.basic, g.pounder, g.destroyer, {reload: 1.1, health: 1.26}]),
			TYPE: "bullet"
		}
	}, 5)
}
Class.tyrant_dreadsV2 = {
	PARENT: "genericPentanought",
	LABEL: "Tyrant",
	GUNS: weaponArray([
		{
		    POSITION: {
		        LENGTH: 17,
		        WIDTH: 11,
		        ASPECT: -0.5
		    }
		},
		{
		    POSITION: {
		        LENGTH: 15,
		        WIDTH: 12
		    },
			PROPERTIES: {
				SHOOT_SETTINGS: combineStats([g.basic, g.pounder, g.artillery, g.artillery, g.skimmer, {reload: 1.18, health: 1.39, speed: 0.7, maxSpeed: 0.7, range: 0.4}]),
				TYPE: "supermissile",
				STAT_CALCULATOR: "sustained"
			}
		}
	], 5)
}
Class.woomera_dreadsV2 = {
	PARENT: "genericPentanought",
	LABEL: "Woomera",
	CONTROLLERS: [["zoom", { distance: 450 }]],
	GUNS: weaponArray([
		{
			POSITION: {
				LENGTH: 25,
				WIDTH: 5.5
			},
			PROPERTIES: {
				SHOOT_SETTINGS: combineStats([g.basic, g.sniper, g.assassin, g.hunter, g.hunterSecondary, g.hunterSecondary, g.predator, {health: 1.1}]),
				TYPE: "bullet"
			}
		},
		{
			POSITION: {
				LENGTH: 22.5,
				WIDTH: 8,
				DELAY: 0.15
			},
			PROPERTIES: {
				SHOOT_SETTINGS: combineStats([g.basic, g.sniper, g.assassin, g.hunter, g.hunterSecondary, g.predator, {health: 1.1}]),
				TYPE: "bullet"
			}
		},
		{
			POSITION: {
				LENGTH: 20,
				WIDTH: 10.5,
				DELAY: 0.3
			},
			PROPERTIES: {
				SHOOT_SETTINGS: combineStats([g.basic, g.sniper, g.assassin, g.hunter, g.predator, {health: 1.1}]),
				TYPE: "bullet"
			}
		},
		{
			POSITION: {
				LENGTH: 2.7,
				WIDTH: 10.5,
				DELAY: -1.3,
				X: 10
			}
		}
	], 5)
}

// T4 Bodies
Class.astronomic_dreadsV2 = {
	PARENT: "genericPentanought",
	LABEL: "Astronomic",
	BODY: hpBuffBodyStats[2],
	TURRETS: weaponArray({
		POSITION: [4, 8.5, 0, 36, 360, 2],
		TYPE: "pentanoughtSmallAura",
	}, 5),
	PROPS: [
		{
			POSITION: [13, 0, 0, 180, 1],
			TYPE: "pentagon",
		}, {
			POSITION: [24, 0, 0, 180, 0],
			TYPE: ["pentagon", {COLOR: 9}],
		},
	],
}
Class.behemoth_dreadsV2 = {
	PARENT: "genericPentanought",
	LABEL: "Behemoth",
	BODY: hpBuffBodyStats[3],
	PROPS: [
		{
			POSITION: [15, 0, 0, 180, 1],
			TYPE: ["pentagon", {COLOR: 9}],
		}, {
			POSITION: [24, 0, 0, 180, 0],
			TYPE: ["pentagon", {COLOR: 9}],
		},
	],
}
Class.cipher_dreadsV2 = {
	PARENT: "genericPentanought",
	LABEL: "Cipher",
	TURRETS: [
		...weaponArray({
			POSITION: [3.25, 9, 0, 36, 180, 2],
			TYPE: ["spamAutoTurret", {GUN_STAT_SCALE: g.pentaSecondaryAuto}],
		}, 5),
		{
			POSITION: [11.5, 0, 0, 0, 360, 2],
			TYPE: ["megabyteTurret_dreadsV2", {GUN_STAT_SCALE: g.pentaMegabyte}],
		},
	],
	PROPS: [
		{
			POSITION: [13, 0, 0, 180, 1],
			TYPE: "pentagon",
		},
	]
}
Class.gigabyte_dreadsV2 = {
	PARENT: "genericPentanought",
	LABEL: "Gigabyte",
	TURRETS: [
		{
			POSITION: [13, 0, 0, 0, 360, 2],
			TYPE: "gigabyteTurret_dreadsV2",
		},
	],
	PROPS: [
		{
			POSITION: [14.5, 0, 0, 180, 1],
			TYPE: "pentagon",
		},
	]
}
Class.grandiose_dreadsV2 = {
	PARENT: "genericPentanought",
	LABEL: "Grandiose",
	BODY: combineBodyStats(hpBuffBodyStats[2], healerBodyStats[1]),
	TURRETS: weaponArray({
		POSITION: [4, 8.5, 0, 36, 360, 2],
		TYPE: "pentanoughtSmallHealAura",
	}, 5),
	PROPS: [
		{
			POSITION: [13, 0, 0, 180, 1],
			TYPE: "pentagon",
		}, {
			POSITION: [24, 0, 0, 180, 0],
			TYPE: ["pentagon", {COLOR: 9}],
		},
	],
}
Class.interstellar_dreadsV2 = {
	PARENT: "genericPentanought",
	LABEL: "Interstellar",
	BODY: healerBodyStats[1],
	TURRETS: [
		...weaponArray({
			POSITION: [3.25, 9, 0, 36, 180, 2],
			TYPE: ["spamAutoTurret", {GUN_STAT_SCALE: g.pentaSecondaryAuto}],
		}, 5),
		{
			POSITION: [9.5, 0, 0, 0, 360, 2],
			TYPE: "pentanoughtBigHealAura",
		},
	],
	PROPS: [
		{
			POSITION: [13, 0, 0, 180, 1],
			TYPE: "pentagon",
		},
	]
}
Class.leviathan_dreadsV2 = {
	PARENT: "genericPentanought",
	LABEL: "Leviathan",
	BODY: speedBuffBodyStats[2],
	PROPS: [
		{
			POSITION: [12, 0, 0, 0, 1],
			TYPE: "pentagonLeviathanTop_dreadsV2"
		}, {
			POSITION: [20, 0, 0, 0, 0],
			TYPE: "pentagonLeviathanBottom_dreadsV2"
		},
	],
}
Class.malware_dreadsV2 = {
	PARENT: "genericPentanought",
	LABEL: "Malware",
	TURRETS: [
		...weaponArray({
			POSITION: [4, 8.5, 0, 36, 360, 2],
			TYPE: "pentanoughtSmallAura",
		}, 5),
		{
			POSITION: [11.5, 0, 0, 0, 360, 2],
			TYPE: ["megabyteTurret_dreadsV2", {GUN_STAT_SCALE: g.pentaMegabyte}],
		},
	],
	PROPS: [
		{
			POSITION: [13, 0, 0, 180, 1],
			TYPE: "pentagon",
		},
	]
}
Class.pegasus_dreadsV2 = {
	PARENT: "genericPentanought",
	LABEL: "Pegasus",
	BODY: combineBodyStats(speedBuffBodyStats[1], healerBodyStats[1]),
	TURRETS: weaponArray({
		POSITION: [4, 8.5, 0, 36, 360, 2],
		TYPE: "pentanoughtSmallHealAura",
	}, 5),
	PROPS: [
		{
			POSITION: [12, 0, 0, 180, 1],
			TYPE: "pentagon"
		}, {
			POSITION: [20, 0, 0, 0, 0],
			TYPE: "pentagonLeviathanBottom_dreadsV2"
		},
	],
}
Class.photosphere_dreadsV2 = {
	PARENT: "genericPentanought",
	LABEL: "Photosphere",
	PROPS: [
		{
			POSITION: [12, 0, 0, 180, 1],
			TYPE: "pentagon",
		},
	],
}
if (useOldPhotosphere) {
Class.photosphere_dreadsV2.TURRETS = [
	...weaponArray([
		{
			POSITION: {
				SIZE: 3.5,
				X: 8.75,
				ANGLE: 36,
				ARC: 360,
				LAYER: 2
			},
			TYPE: "photosphereSmallAura_dreadsV2",
		},
		{
			POSITION: {
				SIZE: 3,
				X: 4,
				ARC: 360,
				LAYER: 2
			},
			TYPE: "photosphereBigAura_dreadsV2",
		}
	], 5)
]
} else {
Class.photosphere_dreadsV2.TURRETS = [
	...weaponArray({
		POSITION: [4, 8.5, 0, 36, 360, 2],
		TYPE: "pentanoughtSmallAura",
	}, 5),
	{
		POSITION: [9, 0, 0, 0, 360, 2],
		TYPE: "pentanoughtBigAura",
	},
]
}
Class.skynet_dreadsV2 = {
	PARENT: "genericPentanought",
	LABEL: "Skynet",
	TURRETS: [
		...weaponArray({
			POSITION: [3.25, 4.5, 0, 0, 180, 2],
			TYPE: ["spamAutoTurret", {GUN_STAT_SCALE: {reload: 1.1, health: 0.93, damage: 0.8}}],
		}, 5),
		...weaponArray({
			POSITION: [3.25, 8, 0, 36, 180, 2],
			TYPE: ["spamAutoTurret", {GUN_STAT_SCALE: {reload: 1.1, health: 0.93, damage: 0.8}}],
		}, 5)
	],
	PROPS: [
		{
			POSITION: [12, 0, 0, 180, 1],
			TYPE: "pentagon",
		}
	]
}
Class.software_dreadsV2 = {
	PARENT: "genericPentanought",
	LABEL: "Software",
	BODY: healerBodyStats[1],
	TURRETS: [
		...weaponArray({
			POSITION: [4, 8.5, 0, 36, 360, 2],
			TYPE: "pentanoughtSmallHealAura",
		}, 5),
		{
			POSITION: [11.5, 0, 0, 0, 360, 2],
			TYPE: ["megabyteTurret_dreadsV2", {GUN_STAT_SCALE: g.pentaMegabyte}],
		},
	],
	PROPS: [
		{
			POSITION: [13, 0, 0, 180, 1],
			TYPE: "pentagon",
		},
	]
}
Class.stratosphere_dreadsV2 = {
	PARENT: "genericPentanought",
	LABEL: "Stratosphere",
	BODY: healerBodyStats[2],
	TURRETS: [
		...weaponArray({
			POSITION: [4, 8.5, 0, 36, 360, 2],
			TYPE: "pentanoughtSmallHealAura",
		}, 5),
		{
			POSITION: [9.5, 0, 0, 0, 360, 2],
			TYPE: "pentanoughtBigHealAura",
		},
	],
	PROPS: [
		{
			POSITION: [13, 0, 0, 180, 1],
			TYPE: "pentagon",
		},
	]
}
Class.supernova_dreadsV2 = {
	PARENT: "genericPentanought",
	LABEL: "Supernova",
	TURRETS: [
		...weaponArray({
			POSITION: [3.25, 9, 0, 36, 180, 2],
			TYPE: ["spamAutoTurret", {GUN_STAT_SCALE: g.pentaSecondaryAuto}],
		}, 5),
		{
			POSITION: [9, 0, 0, 0, 360, 2],
			TYPE: "pentanoughtBigAura",
		},
	],
	PROPS: [
		{
			POSITION: [13, 0, 0, 180, 1],
			TYPE: "pentagon",
		},
	]
}
Class.valrayvn_dreadsV2 = {
	PARENT: "genericPentanought",
	LABEL: "Valrayvn",
	BODY: speedBuffBodyStats[1],
	TURRETS: weaponArray({
		POSITION: [4, 8.5, 0, 36, 360, 2],
		TYPE: "pentanoughtSmallAura",
	}, 5),
	PROPS: [
		{
			POSITION: [12, 0, 0, 180, 1],
			TYPE: "pentagon"
		}, {
			POSITION: [20, 0, 0, 0, 0],
			TYPE: "pentagonLeviathanBottom_dreadsV2"
		},
	],
}

// Account for lower level cap
let tier1 = 6;  //  90
let tier2 = 8;  // 120
let tier3 = 10; // 150
let tier4 = 12; // 180
let tier5 = 16; // 240
if (free_upgrades) {
	tier1 = 0;
	tier2 = 0;
	tier3 = 0;
	tier4 = 0;
	tier5 = 0;
}

// Generate split upgrades buffer upgrades
const firstTier = ["sword", "pacifier", "peacekeeper", "invader", "centaur"]
for (let def of firstTier) {
	let newDef = `${def}2_dreadsV2`
	let originalDef = `${def}_dreadsV2`
	Class[newDef] = dereference(originalDef)
	Class[newDef].BATCH_UPGRADES = true
	
	// Save to upgrades
	util.forcePush(Class.dreadnought_dreadsV2, `UPGRADES_TIER_${tier1}`, [newDef, "dreadBody_dreadsV2"])
	util.forcePush(Class.dreadWeapon_dreadsV2, `UPGRADES_TIER_${tier1}`, originalDef)
}

/*
The above does the following:

Class.dreadnought_dreadsV2[`UPGRADES_TIER_${tier1}`] = [
	["sword2_dreadsV2", "dreadBody_dreadsV2",],
	["pacifier2_dreadsV2", "dreadBody_dreadsV2"],
	["peacekeeper2_dreadsV2", "dreadBody_dreadsV2"],
	["invader2_dreadsV2", "dreadBody_dreadsV2"],
	["centaur2_dreadsV2", "dreadBody_dreadsV2"],
]

Class.dreadWeapon_dreadsV2[`UPGRADES_TIER_${tier1}`] = ["sword", "pacifier", "peacekeeper", "invader", "centaur"].map(x => x + "_dreadsV2")
*/

Class.sword2_dreadsV2[`UPGRADES_TIER_${tier1}`] = ["sword"].map(x => x + "_dreadsV2")
Class.pacifier2_dreadsV2[`UPGRADES_TIER_${tier1}`] = ["pacifier"].map(x => x + "_dreadsV2")
Class.peacekeeper2_dreadsV2[`UPGRADES_TIER_${tier1}`] = ["peacekeeper"].map(x => x + "_dreadsV2")
Class.invader2_dreadsV2[`UPGRADES_TIER_${tier1}`] = ["invader"].map(x => x + "_dreadsV2")
Class.centaur2_dreadsV2[`UPGRADES_TIER_${tier1}`] = ["centaur"].map(x => x + "_dreadsV2")

	Class.sword_dreadsV2[`UPGRADES_TIER_${tier2}`] = ["gladius", "sabre"].map(x => x + "_dreadsV2")
		Class.gladius_dreadsV2[`UPGRADES_TIER_${tier3}`] = ["blade"].map(x => x + "_dreadsV2")
			Class.blade_dreadsV2[`UPGRADES_TIER_${tier4}`] = ["rapier"].map(x => x + "_dreadsV2")
				Class.rapier_dreadsV2[`UPGRADES_TIER_${tier5}`] = []
		Class.sabre_dreadsV2[`UPGRADES_TIER_${tier3}`] = ["bayonet"].map(x => x + "_dreadsV2")
			Class.bayonet_dreadsV2[`UPGRADES_TIER_${tier4}`] = ["javelin"].map(x => x + "_dreadsV2")
				Class.javelin_dreadsV2[`UPGRADES_TIER_${tier5}`] = []

	Class.pacifier_dreadsV2[`UPGRADES_TIER_${tier2}`] = ["mediator", "negotiator"].map(x => x + "_dreadsV2")
		Class.mediator_dreadsV2[`UPGRADES_TIER_${tier3}`] = ["mitigator"].map(x => x + "_dreadsV2")
			Class.mitigator_dreadsV2[`UPGRADES_TIER_${tier4}`] = ["diplomat"].map(x => x + "_dreadsV2")
				Class.diplomat_dreadsV2[`UPGRADES_TIER_${tier5}`] = []
		Class.negotiator_dreadsV2[`UPGRADES_TIER_${tier3}`] = ["appeaser"].map(x => x + "_dreadsV2")
			Class.appeaser_dreadsV2[`UPGRADES_TIER_${tier4}`] = ["arbitrator"].map(x => x + "_dreadsV2")
				Class.arbitrator_dreadsV2[`UPGRADES_TIER_${tier5}`] = []

	Class.peacekeeper_dreadsV2[`UPGRADES_TIER_${tier2}`] = ["enforcer", "executor"].map(x => x + "_dreadsV2")
		Class.enforcer_dreadsV2[`UPGRADES_TIER_${tier3}`] = ["suppressor"].map(x => x + "_dreadsV2")
			Class.suppressor_dreadsV2[`UPGRADES_TIER_${tier4}`] = ["retardant"].map(x => x + "_dreadsV2")
				Class.retardant_dreadsV2[`UPGRADES_TIER_${tier5}`] = []
		Class.executor_dreadsV2[`UPGRADES_TIER_${tier3}`] = ["inhibitor"].map(x => x + "_dreadsV2")
			Class.inhibitor_dreadsV2[`UPGRADES_TIER_${tier4}`] = ["tyrant"].map(x => x + "_dreadsV2")
				Class.tyrant_dreadsV2[`UPGRADES_TIER_${tier5}`] = []

	Class.invader_dreadsV2[`UPGRADES_TIER_${tier2}`] = ["inquisitor", "assailant"].map(x => x + "_dreadsV2")
		Class.inquisitor_dreadsV2[`UPGRADES_TIER_${tier3}`] = ["infiltrator"].map(x => x + "_dreadsV2")
			Class.infiltrator_dreadsV2[`UPGRADES_TIER_${tier4}`] = ["raider"].map(x => x + "_dreadsV2")
				Class.raider_dreadsV2[`UPGRADES_TIER_${tier5}`] = []
		Class.assailant_dreadsV2[`UPGRADES_TIER_${tier3}`] = ["aggressor"].map(x => x + "_dreadsV2")
			Class.aggressor_dreadsV2[`UPGRADES_TIER_${tier4}`] = ["gladiator"].map(x => x + "_dreadsV2")
				Class.gladiator_dreadsV2[`UPGRADES_TIER_${tier5}`] = []

	Class.centaur_dreadsV2[`UPGRADES_TIER_${tier2}`] = ["daemon", "minotaur"].map(x => x + "_dreadsV2")
		Class.daemon_dreadsV2[`UPGRADES_TIER_${tier3}`] = ["hydra"].map(x => x + "_dreadsV2")
			Class.hydra_dreadsV2[`UPGRADES_TIER_${tier4}`] = ["cerberus"].map(x => x + "_dreadsV2")
				Class.cerberus_dreadsV2[`UPGRADES_TIER_${tier5}`] = []
		Class.minotaur_dreadsV2[`UPGRADES_TIER_${tier3}`] = ["beelzebub"].map(x => x + "_dreadsV2")
			Class.beelzebub_dreadsV2[`UPGRADES_TIER_${tier4}`] = ["lucifer"].map(x => x + "_dreadsV2")
				Class.lucifer_dreadsV2[`UPGRADES_TIER_${tier5}`] = []

Class.dreadBody_dreadsV2[`UPGRADES_TIER_${tier1}`] = ["byte", "atmosphere", "juggernaut"].map(x => x + "_dreadsV2")

	Class.byte_dreadsV2[`UPGRADES_TIER_${tier2}`] = ["automation", "kilobyte"].map(x => x + "_dreadsV2")
		Class.automation_dreadsV2[`UPGRADES_TIER_${tier3}`] = ["mechanism", "fusion", "binary", "exosphere"].map(x => x + "_dreadsV2")
			Class.mechanism_dreadsV2[`UPGRADES_TIER_${tier4}`] = ["skynet"].map(x => x + "_dreadsV2")
				Class.skynet_dreadsV2[`UPGRADES_TIER_${tier5}`] = makeHexnoughtBodyV2("skynet_dreadsV2")
			Class.fusion_dreadsV2[`UPGRADES_TIER_${tier4}`] = ["supernova"].map(x => x + "_dreadsV2")
				Class.supernova_dreadsV2[`UPGRADES_TIER_${tier5}`] = makeHexnoughtBodyV2("supernova_dreadsV2")
			Class.binary_dreadsV2[`UPGRADES_TIER_${tier4}`] = ["cipher"].map(x => x + "_dreadsV2")
				Class.cipher_dreadsV2[`UPGRADES_TIER_${tier5}`] = makeHexnoughtBodyV2("cipher_dreadsV2")
			Class.exosphere_dreadsV2[`UPGRADES_TIER_${tier4}`] = ["interstellar"].map(x => x + "_dreadsV2")
				Class.interstellar_dreadsV2[`UPGRADES_TIER_${tier5}`] = makeHexnoughtBodyV2("interstellar_dreadsV2")
		Class.kilobyte_dreadsV2[`UPGRADES_TIER_${tier3}`] = ["megabyte", "binary", "trojan", "hardware"].map(x => x + "_dreadsV2")
			Class.megabyte_dreadsV2[`UPGRADES_TIER_${tier4}`] = ["gigabyte"].map(x => x + "_dreadsV2")
				Class.gigabyte_dreadsV2[`UPGRADES_TIER_${tier5}`] = makeHexnoughtBodyV2("gigabyte_dreadsV2")
			//Class.binary_dreadsV2
			Class.trojan_dreadsV2[`UPGRADES_TIER_${tier4}`] = ["malware"].map(x => x + "_dreadsV2")
				Class.malware_dreadsV2[`UPGRADES_TIER_${tier5}`] = makeHexnoughtBodyV2("malware_dreadsV2")
			Class.hardware_dreadsV2[`UPGRADES_TIER_${tier4}`] = ["software"].map(x => x + "_dreadsV2")
				Class.software_dreadsV2[`UPGRADES_TIER_${tier5}`] = makeHexnoughtBodyV2("software_dreadsV2")

	Class.atmosphere_dreadsV2[`UPGRADES_TIER_${tier2}`] = ["corona", "thermosphere"].map(x => x + "_dreadsV2")
		Class.corona_dreadsV2[`UPGRADES_TIER_${tier3}`] = ["chromosphere", "fusion", "trojan", "planet"].map(x => x + "_dreadsV2")
			Class.chromosphere_dreadsV2[`UPGRADES_TIER_${tier4}`] = ["photosphere"].map(x => x + "_dreadsV2")
				Class.photosphere_dreadsV2[`UPGRADES_TIER_${tier5}`] = makeHexnoughtBodyV2("photosphere_dreadsV2")
			//Class.fusion_dreadsV2
			//Class.trojan_dreadsV2
			Class.planet_dreadsV2[`UPGRADES_TIER_${tier4}`] = ["astronomic"].map(x => x + "_dreadsV2")
				Class.astronomic_dreadsV2[`UPGRADES_TIER_${tier5}`] = makeHexnoughtBodyV2("astronomic_dreadsV2")
		Class.thermosphere_dreadsV2[`UPGRADES_TIER_${tier3}`] = ["mesosphere", "exosphere", "hardware", "moon"].map(x => x + "_dreadsV2")
			Class.mesosphere_dreadsV2[`UPGRADES_TIER_${tier4}`] = ["stratosphere"].map(x => x + "_dreadsV2")
				Class.stratosphere_dreadsV2[`UPGRADES_TIER_${tier5}`] = makeHexnoughtBodyV2("stratosphere_dreadsV2")
			//Class.exosphere_dreadsV2
			//Class.hardware_dreadsV2
			Class.moon_dreadsV2[`UPGRADES_TIER_${tier4}`] = ["grandiose"].map(x => x + "_dreadsV2")
				Class.grandiose_dreadsV2[`UPGRADES_TIER_${tier5}`] = makeHexnoughtBodyV2("grandiose_dreadsV2")

	Class.juggernaut_dreadsV2[`UPGRADES_TIER_${tier2}`] = ["jumbo", "colossus"].map(x => x + "_dreadsV2")
		Class.jumbo_dreadsV2[`UPGRADES_TIER_${tier3}`] = ["goliath", "planet", "moon"].map(x => x + "_dreadsV2")
			Class.goliath_dreadsV2[`UPGRADES_TIER_${tier4}`] = ["behemoth"].map(x => x + "_dreadsV2")
				Class.behemoth_dreadsV2[`UPGRADES_TIER_${tier5}`] = makeHexnoughtBodyV2("behemoth_dreadsV2")
			//Class.planet_dreadsV2
			//Class.moon_dreadsV2
		Class.colossus_dreadsV2[`UPGRADES_TIER_${tier3}`] = ["titan", "siren", "harpy"].map(x => x + "_dreadsV2")
			Class.titan_dreadsV2[`UPGRADES_TIER_${tier4}`] = ["leviathan"].map(x => x + "_dreadsV2")
				Class.leviathan_dreadsV2[`UPGRADES_TIER_${tier5}`] = makeHexnoughtBodyV2("leviathan_dreadsV2")
			Class.siren_dreadsV2[`UPGRADES_TIER_${tier4}`] = ["valrayvn"].map(x => x + "_dreadsV2")
				Class.valrayvn_dreadsV2[`UPGRADES_TIER_${tier5}`] = makeHexnoughtBodyV2("valrayvn_dreadsV2")
			Class.harpy_dreadsV2[`UPGRADES_TIER_${tier4}`] = ["pegasus"].map(x => x + "_dreadsV2")
				Class.pegasus_dreadsV2[`UPGRADES_TIER_${tier5}`] = makeHexnoughtBodyV2("pegasus_dreadsV2")

if (Config.arms_race) {
	//console.log('[dreadv2.js]: Dreadnoughts v2 Arms Race addon enabled. Credit to Frostbyte.')
	//Class.dreadWeapon_dreadsV2

		Class.sword_dreadsV2[`UPGRADES_TIER_${tier2}`].push("sling_dreadsV2")
			Class.sling_dreadsV2[`UPGRADES_TIER_${tier3}`] = ["atlatl"].map(x => x + "_dreadsV2")
				Class.atlatl_dreadsV2[`UPGRADES_TIER_${tier4}`] = ["woomera"].map(x => x + "_dreadsV2")
					Class.woomera_dreadsV2[`UPGRADES_TIER_${tier5}`] = []

	Class.dreadBody_dreadsV2[`UPGRADES_TIER_${tier1}`].splice(1, 0, "shower_dreadsV2")
	Class.dreadBody_dreadsV2[`UPGRADES_TIER_${tier1}`].push("stomper_dreadsV2", "dropper_dreadsV2", "spotter_dreadsV2")

		//Class.atmosphere_dreadsV2

			Class.corona_dreadsV2[`UPGRADES_TIER_${tier3}`].push("siren_dreadsV2")

			Class.thermosphere_dreadsV2[`UPGRADES_TIER_${tier3}`].push("harpy_dreadsV2")
}

const hexDreadNames = {
	Javelin: {
		Javelin: 'Javelin II',
		Rapier: 'Lance',
		Woomera: 'Shikari',
		Trebuchet: 'Ballista',
		Bolt: 'Tomahawk',
		Diplomat: 'Envoy',
		Arbitrator: 'Cutlass',
		Dissolver: 'Hellfire',
		Eroder: 'Partisan',
		Gripper: 'Encircler',
		Retardant: 'Rebel',
		Tyrant: 'Autocrat',
		Anesthesiologist: 'Patriot',
		Helix: 'Stinger',
		Bombardment: 'Downpour',
		Raider: 'Pirate',
		Gladiator: 'Pillager',
		Starlight: 'Hornet',
		Bruiser: 'Felon',
		Incapacitator: 'Stretcher',
		Cerberus: 'Argonaut',
		Lucifer: 'Kitsune',
		Sterilizer: 'Mastermind',
		Hielaman: 'Swordsman', 
		Jackhammer: 'Fissure',
	},
	Rapier: {
		Rapier: 'Rapier II',
		Woomera: 'Cavalier',
		Trebuchet: 'Katana',
		Bolt: 'Claymore',
		Diplomat: 'Emissary',
		Arbitrator: 'Umpire',
		Dissolver: 'Relocator',
		Eroder: 'Debris',
		Gripper: 'Interrogator',
		Retardant: 'Impeder',
		Tyrant: 'Oppressor',
		Anesthesiologist: 'Slumberer',
		Helix: 'Vortex',
		Bombardment: 'Butcher',
		Raider: 'Bandit',
		Gladiator: 'Bruiser',
		Starlight: 'Radiance',
		Bruiser: 'Ringster',
		Incapacitator: 'Swamper',
		Cerberus: 'Cyclops',
		Lucifer: 'Damocles',
		Sterilizer: 'Sanitizer',
		Hielaman: 'Escutcheon', 
		Jackhammer: 'Borer',
	},
	Woomera: {
		Woomera: 'Woomera II',
		Trebuchet: 'Cannonball',
		Bolt: 'Piercer', // Soap
		Diplomat: 'Contractor',
		Arbitrator: 'Spirit',
		Dissolver: 'Venom',
		Eroder: 'Decomposer',
		Gripper: 'Crucifier',
		Retardant: 'Overrunner',
		Tyrant: 'Revolutionary',
		Anesthesiologist: 'Guerilla',
		Helix: 'Cultivator',
		Bombardment: 'Incendiary',
		Raider: 'Dispatcher', // Soap
		Gladiator: 'Pugilist',
		Starlight: 'Starborne',
		Bruiser: 'Soldier',
		Incapacitator: 'Scavenger', // Soap
		Cerberus: 'Poltergeist',
		Lucifer: 'Hunkerer',
		Sterilizer: 'Janitor',
		Hielaman: 'Reinforcer', 
		Jackhammer: 'Pyroclastic',
	},
	Trebuchet: {
		Trebuchet: 'Trebuchet II',
		Bolt: 'Archer',
		Diplomat: 'Sherman',
		Arbitrator: 'Ultimatum',
		Dissolver: 'Grapeshot',
		Eroder: 'Shrapnel',
		Gripper: 'Razer',
		Retardant: 'Mangonel',
		Tyrant: 'Incarcerator', // Zenphia
		Anesthesiologist: 'Evacuator',
		Helix: 'Hurricane',
		Bombardment: 'Surrenderer',
		Raider: 'Capitulator',
		Gladiator: 'Uprising',
		Starlight: 'Magnetar',
		Bruiser: 'Crumpler',
		Incapacitator: 'Pinner',
		Cerberus: 'Phantom', // Umbra
		Lucifer: 'Sisyphus',
		Sterilizer: 'Operation',
		Hielaman: 'Entrencher', 
		Jackhammer: 'Demolitionist',
	},
	Bolt: {
		Bolt: 'Bolt II',
		Diplomat: 'Informant',
		Arbitrator: 'Assaulter',
		Dissolver: 'Sprinter',
		Eroder: 'Discharger', // Soap
		Gripper: 'Lightning',
		Retardant: 'Evicter',
		Tyrant: 'Minister',
		Anesthesiologist: 'Ambusher',
		Helix: 'Ultraviolet',
		Bombardment: 'Dynamo',
		Raider: 'Infector',
		Gladiator: 'Blinder',
		Starlight: 'Neutrino',
		Bruiser: 'Impactor',
		Incapacitator: 'Volt',
		Cerberus: 'Collapse',
		Lucifer: 'Barycenter',
		Sterilizer: 'Greenhouse',
		Hielaman: 'Nebula', 
		Jackhammer: 'Archaeologist',
	},
	Diplomat: {
		Diplomat: 'Diplomat II',
		Arbitrator: 'Moderator',
		Dissolver: 'Impaler', // Soap
		Eroder: 'Vulcan',
		Gripper: 'Politician',
		Retardant: 'Insurgent',
		Tyrant: 'Dictator',
		Anesthesiologist: 'Transporter',
		Helix: 'Signature',
		Bombardment: 'Berserker', // Soap
		Raider: 'Marauder',
		Gladiator: 'Champion',
		Starlight: 'Comet',
		Bruiser: 'Ambassador',
		Incapacitator: 'Erebus', // Yharon
		Cerberus: 'Orion',
		Lucifer: 'Manticore',
		Sterilizer: 'Officer',
		Hielaman: 'Investigator', 
		Jackhammer: 'Devourer', // Soap
	},
	Arbitrator: {
		Arbitrator: 'Arbitrator II',
		Dissolver: 'Bargainer',
		Eroder: 'Stipulator',
		Gripper: 'Adjudicator',
		Retardant: 'Extinguisher',
		Tyrant: 'Shogunate',
		Anesthesiologist: 'Brute',
		Helix: 'Referee',
		Bombardment: 'Jury',
		Raider: 'Buccaneer',
		Gladiator: 'Warrior',
		Starlight: 'Genesis', // Siece
		Bruiser: 'Terminator', // Soap
		Incapacitator: 'Debater',
		Cerberus: 'Gorgon',
		Lucifer: 'Keres',
		Sterilizer: 'Warden',
		Hielaman: 'Crusader', 
		Jackhammer: 'Excavator',
	},
	Dissolver: {
		Dissolver: 'Dissolver II',
		Eroder: 'Current',
		Gripper: 'Patronizer',
		Retardant: 'Corroder',
		Tyrant: 'Throne',
		Anesthesiologist: 'Neurotoxin',
		Helix: 'Solution',
		Bombardment: 'Chlorine',
		Raider: 'Traitor',
		Gladiator: 'Abolitionist',
		Starlight: 'Accretion',
		Bruiser: 'Piranha',
		Incapacitator: 'Sandstorm',
		Cerberus: 'Appalachian',
		Lucifer: 'Styx',
		Sterilizer: 'Peroxide',
		Hielaman: 'Frontier', 
		Jackhammer: 'Fracker',
	},
	Eroder: {
		Eroder: 'Eroder II',
		Gripper: 'Psychologist',
		Retardant: 'Shatterer',
		Tyrant: 'Crackdown',
		Anesthesiologist: 'Torrent',
		Helix: 'Tornado',
		Bombardment: 'Backstabber',
		Raider: 'Militant', // Umbra
		Gladiator: 'Vitrifier',
		Starlight: 'Stardust',
		Bruiser: 'Gasher', // Soap
		Incapacitator: 'Lacerator', // Soap
		Cerberus: 'Inevitability',
		Lucifer: 'Fragment',
		Sterilizer: 'Cynic',
		Hielaman: 'Polisher', 
		Jackhammer: 'Hoser',
	},
	Gripper: {
		Gripper: 'Gripper II',
		Retardant: 'Arrestor',
		Tyrant: 'Tormentor', // Soap
		Anesthesiologist: 'Experimenter',
		Helix: 'Blockader',
		Bombardment: 'Striker',
		Raider: 'Warmongerer', // Umbra
		Gladiator: 'Throwdown',
		Starlight: 'Cryogen',
		Bruiser: 'Knockout',
		Incapacitator: 'Restrainer',
		Cerberus: 'Prometheus',
		Lucifer: 'Mortician',
		Sterilizer: 'Cleanser',
		Hielaman: 'Periscope', 
		Jackhammer: 'Vice',
	},
	Retardant: {
		Retardant: 'Retardant II',
		Tyrant: 'Anarchist',
		Anesthesiologist: 'Buckshot', // Soap
		Helix: 'Magnetron',
		Bombardment: 'Sergeant',
		Raider: 'Freebooter',
		Gladiator: 'Combatant',
		Starlight: 'Apparition',
		Bruiser: 'Executioner', // Soap
		Incapacitator: 'Smotherer',
		Cerberus: 'Gigantes',
		Lucifer: 'Demogorgon',
		Sterilizer: 'Fumigator',
		Hielaman: 'Avalanche', 
		Jackhammer: 'Propagator',
	},
	Tyrant: {
		Tyrant: 'Tyrant II',
		Anesthesiologist: 'Barbarian',
		Helix: 'Nautilus',
		Bombardment: 'Admiral',
		Raider: 'Corsair',
		Gladiator: 'Amazon',
		Starlight: 'Theocrat',
		Bruiser: 'Authoritarian',
		Incapacitator: 'Jailkeeper',
		Cerberus: 'Ouroboros',
		Lucifer: 'Raiju',
		Sterilizer: 'Purifier',
		Hielaman: 'Protectorate', 
		Jackhammer: 'Detailer',
	},
	Anesthesiologist: {
		Anesthesiologist: 'Anesthesiologist II',
		Helix: 'Blizzard',
		Bombardment: 'Nightmare',
		Raider: 'Vaccinator',
		Gladiator: 'Harbinger', // Siece
		Starlight: 'Hypnotizer',
		Bruiser: 'Tactician',
		Incapacitator: 'Psychic', // Soap
		Cerberus: 'Revenant',
		Lucifer: 'Rehabilitator',
		Sterilizer: 'Pestilence',
		Hielaman: 'Heater', 
		Jackhammer: 'Sledgehammer',
	},
	Helix: {
		Helix: 'Helix II',
		Bombardment: 'Derecho',
		Raider: 'Deliverer',
		Gladiator: 'Constrictor',
		Starlight: 'Orbit',
		Bruiser: 'Cobra',
		Incapacitator: 'Windfall',
		Cerberus: 'Viper',
		Lucifer: 'Taipan',
		Sterilizer: 'Networker',
		Hielaman: 'Turbine', 
		Jackhammer: 'Spindler',
	},
	Bombardment: {
		Bombardment: 'Bombardment II',
		Raider: 'Specialist',
		Gladiator: 'Leonidas',
		Starlight: 'Meteor',
		Bruiser: 'Grenadier',
		Incapacitator: 'Shellshocker',
		Cerberus: 'Deluge',
		Lucifer: 'Containment',
		Sterilizer: 'Haven',
		Hielaman: 'Ballistic', 
		Jackhammer: 'Mallet', // Soap
	},
	Raider: {
		Raider: 'Raider II',
		Gladiator: 'Filibuster',
		Starlight: 'Colonizer',
		Bruiser: 'Plunderer', // Umbra
		Incapacitator: 'Blitzkrieg',
		Cerberus: 'Wyvern',
		Lucifer: 'Kraken',
		Sterilizer: 'Splatterer',
		Hielaman: 'Strategist', 
		Jackhammer: 'Extractor',
	},
	Gladiator: {
		Gladiator: 'Gladiator II',
		Starlight: 'Enveloper',
		Bruiser: 'Fistfighter',
		Incapacitator: 'Overloader', // Umbra
		Cerberus: 'Ogre',
		Lucifer: 'Wendigo',
		Sterilizer: 'Garrison', // Umbra
		Hielaman: 'Uziel', // Zenphia
		Jackhammer: 'Warlord',
	},
	Starlight: {
		Starlight: 'Starlight II',
		Bruiser: 'Wanderer',
		Incapacitator: 'Starstruck',
		Cerberus: 'Constellation',
		Lucifer: 'Galaxy',
		Sterilizer: 'Evaporator',
		Hielaman: 'Protostar', 
		Jackhammer: 'Illuminator',
	},
	Bruiser: {
		Bruiser: 'Bruiser II',
		Incapacitator: 'Mauler',
		Cerberus: 'Serpent',
		Lucifer: 'Trident',
		Sterilizer: 'Suture',
		Hielaman: 'Heavyweight', 
		Jackhammer: 'Stapler',
	},
	Incapacitator: {
		Incapacitator: 'Incapacitator II',
		Cerberus: 'Opportunist',
		Lucifer: 'Condemner',
		Sterilizer: 'Poisoner',
		Hielaman: 'Eyrie', 
		Jackhammer: 'Thrasher', // Soap
	},
	Cerberus: {
		Cerberus: 'Cerberus II',
		Lucifer: 'Oni',
		Sterilizer: 'Antibody',
		Hielaman: 'Typhon', 
		Jackhammer: 'Paver',
	},
	Lucifer: {
		Lucifer: 'Lucifer II',
		Sterilizer: 'Lipid',
		Hielaman: 'Insulator', 
		Jackhammer: 'Earthquaker',
	},
	Sterilizer: {
		Sterilizer: 'Sterilizer II',
		Hielaman: 'Homeland', 
		Jackhammer: 'Bulldozer',
	},
	Hielaman: {
		Hielaman: 'Hielaman II', 
		Jackhammer: 'Compactor',
	},
	Jackhammer: {
		Jackhammer: 'Jackhammer II',
	},
};

function setGladiatorMinion(gun, index) {
	if (!gun.PROPERTIES) return index;
	if (!gun.PROPERTIES.TYPE) return index;
	if (!gun.PROPERTIES.TYPE.includes("inion")) return index;
	switch (index) {
		case 0:
			gun.PROPERTIES.TYPE = "gladiatorTritankMinion_dreadsV2";
			break;
		case 1:
			gun.PROPERTIES.TYPE = "gladiatorTritrapMinion_dreadsV2";
			break;
		case 2:
			gun.PROPERTIES.TYPE = "gladiatorTriswarmMinion_dreadsV2";
			break;
		case 3:
			gun.PROPERTIES.TYPE = "gladiatorAutoMinion_dreadsV2";
			break;
		case 4:
			gun.PROPERTIES.TYPE = "gladiatorAuraMinion_dreadsV2";
			break;
		case 5:
			gun.PROPERTIES.TYPE = "gladiatorHealAuraMinion_dreadsV2";
			break;
	}
	return index + 1;
}
function mergeHexnoughtWeaponV2(weapon1, weapon2) {
	weapon1 = ensureIsClass(weapon1);
	weapon2 = ensureIsClass(weapon2);

	let PARENT = "genericHexnought",
		GUNS = [],
		gunsOnOneSide = [],
		weapon2GunsOnOneSide = [],
		TURRETS = [],
		turretsOnOneSide = [],
		weapon2TurretsOnOneSide = [];

	// Label
	let name1 = hexDreadNames[weapon1.LABEL][weapon2.LABEL],
		name2 = hexDreadNames[weapon2.LABEL][weapon1.LABEL],
		weaponName = weapon1.LABEL + weapon2.LABEL,
		orientationId = 0;
	if (name1) {
		weaponName = name1;
	} else if (name2) {
		weaponName = name2,
		orientationId = 1;
	}
	let LABEL = weaponName,
		className = weapon1.LABEL.toLowerCase() + weapon2.LABEL + orientationId + "_dreadsV2";
	
	// Guns ----------------------
	if (weapon1.GUNS) {
		for (let i = 0; i < weapon1.GUNS.length; i += 5) {
			gunsOnOneSide.push(dereference(weapon1.GUNS[i]));
		}
	}
	if (weapon2.GUNS) {
		for (let i = 0; i < weapon2.GUNS.length; i += 5) {
			weapon2GunsOnOneSide.push(dereference(weapon2.GUNS[i]));
		}
	}

	for (let g in weapon2GunsOnOneSide) weapon2GunsOnOneSide[g].POSITION.ANGLE += 60;
	gunsOnOneSide.push(...weapon2GunsOnOneSide)

	// Turrets -------------------
	if (weapon1.TURRETS) {
		for (let i = 0; i < weapon1.TURRETS.length; i += 5) {
			turretsOnOneSide.push(dereference(weapon1.TURRETS[i]));
		}
	}
	if (weapon2.TURRETS) {
		for (let i = 0; i < weapon2.TURRETS.length; i += 5) {
			weapon2TurretsOnOneSide.push(dereference(weapon2.TURRETS[i]));
		}
	}

	for (let t in weapon2TurretsOnOneSide) weapon2TurretsOnOneSide[t].POSITION.ANGLE += 60;
	turretsOnOneSide.push(...weapon2TurretsOnOneSide)

	// Scale to fit size constraints
	for (let g in gunsOnOneSide) {
		gunsOnOneSide[g].POSITION.WIDTH *= hexnoughtScaleFactor ** 2;
		gunsOnOneSide[g].POSITION.Y *= hexnoughtScaleFactor ** 2;
	}

	for (let t in turretsOnOneSide) {
		turretsOnOneSide[t].POSITION.SIZE *= hexnoughtScaleFactor ** 2;
	}

	for (let i = 0; i < 3; i++) {
		for (let g in gunsOnOneSide) {
			let gun = JSON.parse(JSON.stringify(gunsOnOneSide[g]));
			gun.POSITION.ANGLE += 120 * i;
			GUNS.push(gun);
		}
		for (let t in turretsOnOneSide) {
			let turret = JSON.parse(JSON.stringify(turretsOnOneSide[t]));
			turret.POSITION.ANGLE += 120 * i;
			TURRETS.push(turret);
		}
	};

	// Gladiator
	if (weapon1.LABEL == "Gladiator" || weapon2.LABEL == "Gladiator") {
		let droneSpawnerIndex = 0
		for (let g in GUNS) {
			let gun = GUNS[g];
			droneSpawnerIndex = setGladiatorMinion(gun, droneSpawnerIndex);
		}
	}
	
	// Body stat modification
	// Arithmetic mean of body stats
	let bodyStatFactors = {FOV: 2, SPEED: 2, HEALTH: 2, SHIELD: 2, REGEN: 2, RESIST: 2, DENSITY: 2};
	let weapon1Body = weapon1.BODY ?? pentanoughtBody;
	let weapon2Body = weapon2.BODY ?? pentanoughtBody;
	for (let m in bodyStatFactors) {
		bodyStatFactors[m] = (weapon1Body[m] ?? pentanoughtBody[m]) / pentanoughtBody[m];
		bodyStatFactors[m] += (weapon2Body[m] ?? pentanoughtBody[m]) / pentanoughtBody[m];
		bodyStatFactors[m] *= hexnoughtBody[m] / 2;
	}

	// Smash it together
	Class[className] = {
		PARENT, LABEL, GUNS, TURRETS,
		BODY: bodyStatFactors
	};
	return className;
}
function makeHexnoughtBodyV2(body) {
	if (!buildHexnoughts) return [];
	
	body = ensureIsClass(body);

	let PARENT = "genericHexnought",
		BODY = {},
		TURRETS = [],
		PROPS = [],
		LABEL = body.LABEL;

	// Label
	let className = LABEL.toLowerCase() + "Hex_dreadsV2";
	
	// Turrets --------------------
	if (body.TURRETS) {
		let turretRingLoopLength = Math.floor(body.TURRETS.length / 5);

		// Turret adding
		for (let t = 0; t < body.TURRETS.length; t++) {
			let turret = body.TURRETS[t];
			if (turret.POSITION[1]) { // Do whole turret loop at once
				for (let i = 0; i < turretRingLoopLength; i++) {
					for (let j = 0; j < 6; j++) {
						turret = body.TURRETS[t + i * 5 + 1];
						TURRETS.push(
							{
								POSITION: [turret.POSITION[0] * hexnoughtScaleFactor, turret.POSITION[1] * hexnoughtScaleFactor ** 0.5, turret.POSITION[2], turret.POSITION[3] / 6 * 5 + 60 * j, turret.POSITION[4], turret.POSITION[5]],
								TYPE: turret.TYPE,
							}
						)
					}
				}
				t += 5 * turretRingLoopLength - 1;
			} else { // Centered turrets
				TURRETS.push(
					{
						POSITION: [turret.POSITION[0] * hexnoughtScaleFactor ** 0.5, 0, 0, turret.POSITION[3], turret.POSITION[4], turret.POSITION[5]],
						TYPE: turret.TYPE,
					}
				) 
			}
		}
	}
	if (body.PROPS) {
		for (let prop of body.PROPS) {
			prop = dereference(prop);
			let type = prop.TYPE;
			if (typeof type == "string") {
				type = [type];
			}
			type[0] = type[0].replace("pentagon", "hexagon");
			PROPS.push(
				{
					POSITION: [prop.POSITION[0], 0, 0, prop.POSITION[3], prop.POSITION[4]],
					TYPE: type
				}
			);
		}
	}
	
	// Body stat modification
	if (body.BODY) for (let m in body.BODY) BODY[m] = body.BODY[m];

	// Smash it together
	Class[className] = {
		PARENT, BODY, LABEL, TURRETS, PROPS,
	};
	return [className];
}

// Merge hexdreads
const pentanoughtWeapons = [
	"rapier_dreadsV2",
	"javelin_dreadsV2",
	"diplomat_dreadsV2",
	"arbitrator_dreadsV2",
	"retardant_dreadsV2",
	"tyrant_dreadsV2",
	"raider_dreadsV2",
	"gladiator_dreadsV2",
	"cerberus_dreadsV2",
	"lucifer_dreadsV2"
]
if (Config.arms_race) {
	pentanoughtWeapons.splice(2, 0, "woomera_dreadsV2")
}
if(buildHexnoughts) {
	for (let i of pentanoughtWeapons) {
		for (let j of pentanoughtWeapons) {
			Class[i][`UPGRADES_TIER_${tier5}`].push(mergeHexnoughtWeaponV2(i, j));
		}
	}
}
