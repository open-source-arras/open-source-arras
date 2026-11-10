module.exports = {
    level_cap: 1000,
    growth: true,
    defineLevelSkillPoints: level => {
        if (level < 2) return 0;
        if (level <= 40) return 1;
        if (level <= 45 && level & 1 === 1) return 1;
        if (level <= 51 && (level % 2) == 1) return 1;
        if (level % 10 == 1 && level <= 381) return 1;
        return 0;
    },
    defineLevelSize: level => {
        let a = Math.max(44, Math.min(level, 1000) - 1);
        return 1 + (1.4531 + 1.1453 * (a - 44) + 55.329e-6 * 0.3083 * (a * a * a - 85184)) / 100;
    },
    defineLevelHealth: level => 1 + 0.0091 * Math.min(155, Math.max(0, level - 45)),
    respawn_score_kept: 0.25,
    respawn_score_max: 402171
};