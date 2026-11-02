if (!Config.space) return;

const tanks = [];

const findUpgrades = (type) => {
    try {
        if (!tanks.includes(type) && !Array.isArray(type) && Class[type]) tanks.push(type);
        else return;
        for (let i = 0; i <= (Config.level_cap / Config.tier_multiplier); i++) {
            if (Class[type]["UPGRADES_TIER_" + i]) {
                Class[type]["UPGRADES_TIER_" + i].forEach(type => {
                    findUpgrades(type);
                });
            }
        }
    } catch(e) {
        throw new Error(e); 
    }
};

findUpgrades(Config.spawn_class);

tanks.forEach(type => {
    if (!Class[type].TURRETS) Class[type].TURRETS = [];
    Class[type].TURRETS?.push({
        TYPE: "rcs",
        POSITION: {
            SIZE: 6,
            ANGLE: 180,
            LAYER: 1
        }
    });
});
