const {deepClone, error} = require("../../../util.js");

const maxTier = 3;
const settings = {suffix: "_space", labelSuffix: ""};
const upgradeTreeStart = Config.spawn_class.replace(settings.suffix, "");
const debug_mode = false;
const tanks = [];

const findUpgrades = (tank) => {
    try {
        if (!tanks.includes(tank) && !Array.isArray(tank) && Class[tank]) tanks.push(tank);
        else return;
        for (let i = 0; i <= maxTier; i++) {
            if (Class[tank]["UPGRADES_TIER_" + i]) {
                Class[tank]["UPGRADES_TIER_" + i].forEach(t => {
                    findUpgrades(t);
                })
            }
        }
    } catch (e) {if (debug_mode) error(e)}
}
findUpgrades(upgradeTreeStart);

tanks.forEach(tank => {
    // make the turret so we can attach it
    let found = {};
    const findProperties = (tank, ...properties) => {
        try {
            let toFind = [
                "LABEL", "UPGRADE_LABEL",
                "NAME", "TURRETS", 
            ]
            if (!properties.length) properties = toFind;
            for (let k of properties) {
                if (Class[tank][k] !== undefined) found[k] = Class[tank][k];
                else if (Class[tank].PARENT !== undefined) findProperties(Class[tank].PARENT, k);
                else found[k] = Class.genericTank[k]
            }
        } catch (e) {if (debug_mode) error(e)}
    }
    findProperties(tank);
    Class[tank + settings.suffix] = deepClone(Class[tank]);
    Class[tank + settings.suffix].TURRETS ??= [...(found.TURRETS ?? [])];
    Class[tank + settings.suffix].TURRETS.push({
        POSITION: {LAYER: 1, SIZE: 6, ANGLE: 180},
        TYPE: "rcs"
    })
    if (found.LABEL) Class[tank + settings.suffix].LABEL = found.LABEL + settings.labelSuffix;
    if (found.UPGRADE_LABEL) Class[tank + settings.suffix].UPGRADE_LABEL = found.UPGRADE_LABEL + settings.labelSuffix;
    if (found.NAME) Class[tank + settings.suffix].NAME = found.NAME + settings.labelSuffix;
})
tanks.forEach(tank => {
    let newTank = Class[tank + settings.suffix];
    for (let k in newTank) {
        if (k.startsWith("UPGRADES_TIER_")) {
            if (parseInt(k.at(-1)) > maxTier) newTank[k] = [];
            for (let i = 0; i < newTank[k].length; i++) {
                if (Array.isArray(newTank[k][i])) {
                    if (!newTank[k][i].every(def => Class[def + settings.suffix])) continue;
                    for (let def of newTank[k][i]) {
                        newTank[k][i][newTank[k][i].indexOf(def)] += settings.suffix;  
                    }
                    continue;
                }
                if (!Class[newTank[k][i] + settings.suffix]) {
                    newTank[k].splice(i, 1);
                    i--;
                    continue;
                }
                newTank[k][i] += settings.suffix;
            }
        }
    }
})
Class.menu_addons.UPGRADES_TIER_0.push(upgradeTreeStart + settings.suffix)