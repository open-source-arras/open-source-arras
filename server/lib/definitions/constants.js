export const basePolygonDamage = 1;
export const basePolygonHealth = 2;
export const dfltskl = 9;
export const smshskl = 12;
export const base = {
    ACCEL: 1.6,
    SPEED: 5.25,
    HEALTH: 20,
    DAMAGE: 3,
    RESIST: 1,
    PENETRATION: 1.05,
    SHIELD: 5.75,
    REGEN: 0.01,
    FOV: 1.02,
    DENSITY: 0.5
};
export const statnames = {
    flail: {
        BULLET_PEN: "Mace Penetration",
        BULLET_DAMAGE: "Mace Damage",
        RELOAD: "Mace Density"
    },
    healer: {
        BULLET_PEN: "Heal Precision",
        BULLET_DAMAGE: "Heal Amount"
    },
    mixed: {
        BULLET_SPEED: "Weapon Speed",
        BULLET_HEALTH: "Weapon Health",
        BULLET_PEN: "Weapon Penetration",
        BULLET_DAMAGE: "Weapon Damage"
    },
    drone: {
        BULLET_SPEED: "Drone Speed",
        BULLET_HEALTH: "Drone Health",
        BULLET_PEN: "Drone Penetration",
        BULLET_DAMAGE: "Drone Damage",
        RELOAD: "Respawn Rate"
    },
    necro: {
        BULLET_SPEED: "Drone Speed",
        BULLET_HEALTH: "Drone Health",
        BULLET_PEN: "Drone Penetration",
        BULLET_DAMAGE: "Drone Damage",
        RELOAD: "Max Drone Count"
    },
    satellite: {
        BULLET_SPEED: "Orbit Speed",
        BULLET_HEALTH: "Satellite Health",
        BULLET_PEN: "Satellite Penetration",
        BULLET_DAMAGE: "Satellite Damage",
        RELOAD: "Respawn Rate"
    },
    smasher: {
        RELOAD: "Engine Acceleration"
    },
    swarm: {
        BULLET_SPEED: "Swarm Speed",
        BULLET_HEALTH: "Swarm Health",
        BULLET_PEN: "Swarm Penetration",
        BULLET_DAMAGE: "Swarm Damage"
    },
    trap: {
        BULLET_SPEED: "Placement Speed",
        BULLET_HEALTH: "Trap Health",
        BULLET_PEN: "Trap Penetration",
        BULLET_DAMAGE: "Trap Damage"
    }
};
