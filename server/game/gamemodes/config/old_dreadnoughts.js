module.exports = {
    classic_food: true,
    level_cap: 1000,
    growth: true,
    defineLevelSkillPoints: level => {
        if (level < 2) return 0;
        if (level <= 40) return 1;
        if (level <= 51 && (level & 1) == 1) return 1;
        if (level % 10 == 1 && level <= 381) return 1;
        return 0;
    },
    defineLevelSize: level => 1 + 0.005725 * Math.max(0, level - 45),
    defineLevelHealth: level => 1 + 0.0091 * Math.min(155, Math.max(0, level - 45)),
    respawn_score_kept: 0.25,
    respawn_score_max: 402171
    //level_cap_cheat: 180,
    //level_cap: 180,
    /*growth: true,
    defineLevelSkillPoints: level => {
        if (level <= 40) return 1;
        if (level <= 45 && (level & 1) == 1) return 1;
        if (level <= 51 && (level % 2) == 1) return 1;
        if (level % 10 == 1) return 1;
        return 0;
    },*/
};