const { combineStats, makeCrasher, makeLaby, makeMenu, makeRare } = require("../../facilitators.js");
const pack = require("./istrong.json");

for (let name in pack.classes) Class[name] = pack.classes[name];

function parentOf(type) {
    let p = Array.isArray(type.PARENT) ? type.PARENT[0] : type.PARENT;
    return typeof p === "string" ? Class[p] : p;
}
function find(type, key) {
    for (let c = type; c; c = parentOf(c)) if (c[key] !== undefined) return c[key];
    return Class.genericTank[key];
}
function build(recipe, name) {
    if (recipe.cls) {
        if (Class[recipe.cls]) return recipe.cls;
        return recipe.or ? build(recipe.or, name) : null;
    }
    let made;
    if (recipe.laby) {
        let [food, poly, shiny, level] = recipe.laby;
        if (!Class[food]) return null;
        made = makeLaby(Class[food], poly, shiny, level, poly === 2 ? 2 / 3 : 1);
    } else if (recipe.rare) {
        let base = build(recipe.rare, name + "_base");
        if (!base) return null;
        made = makeRare(Class[base], recipe.level);
    } else if (recipe.crasher) {
        let base = build(recipe.crasher, name + "_base");
        if (!base) return null;
        made = base === "crasher" ? { PARENT: "crasher" } : makeCrasher(Class[base]);
    } else return null;
    Class[name] = made;
    return name;
}
function generator(name) {
    let type = Class[name], size = find(type, "SIZE"), color = find(type, "COLOR");
    return {
        PARENT: "genBody",
        LABEL: `${type.LABEL} Generator`,
        SHAPE: find(type, "SHAPE"),
        COLOR: { BASE: color?.BASE ?? color, BRIGHTNESS_SHIFT: color?.BRIGHTNESS_SHIFT ?? 0, HUE_SHIFT: color?.HUE_SHIFT ?? 0 },
        UPGRADES_TIER_0: [],
        TURRETS: [{
            TYPE: [name, { FACING_TYPE: "toTarget", INDEPENDENT: true }],
            POSITION: { SIZE: Math.sqrt(size) * 2, LAYER: 1, ARC: 0 }
        }],
        GUNS: [
            {
                POSITION: { LENGTH: 2, WIDTH: 10.5, X: 15 },
                PROPERTIES: {
                    SHOOT_SETTINGS: combineStats([{ shudder: 0.1, speed: 1, recoil: 0.1, reload: 6, size: size / 13 }]),
                    TYPE: [name, { INDEPENDENT: true, VARIES_IN_SIZE: false }],
                    NO_LIMITATIONS: true,
                    SPAWN_OFFSET: 0.75
                }
            },
            { POSITION: { LENGTH: 11, WIDTH: 10.5, ASPECT: 1.4, X: 4 } }
        ]
    };
}
for (let shape of pack.shapes) {
    let base = build(shape.recipe, shape.name + "_look");
    if (!base) continue;
    Class[shape.name] = { PARENT: base, LABEL: shape.label, VALUE: shape.value, HEALTH_WITH_LEVEL: false, BODY: shape.body };
    if (shape.size) Class[shape.name].SIZE = shape.size;
    Class[shape.name + "Generator"] = generator(shape.name);
}

for (let name in pack.menus) {
    Class[name] = makeMenu(pack.menus[name].label, { rerootTree: name, boxColor: pack.menus[name].color });
    Class[name].PASS_UPGRADE_COLOR = true;
}
for (let name in pack.menus) Class[name].UPGRADES_TIER_0 = pack.menus[name].items.filter(item => Class[item]);
Class.menu_special.UPGRADES_TIER_0.push("istrong_menu_developer");

function isTank(type) {
    for (let c = type; c; c = parentOf(c)) if (c === Class.genericTank) return true;
    return false;
}
let bulletRange = 0;
for (let c = Class.bullet; c && !bulletRange; c = parentOf(c)) bulletRange = c.BODY?.RANGE ?? 0;
for (let name in pack.classes) {
    for (let gun of pack.classes[name].GUNS ?? []) {
        let p = gun.PROPERTIES;
        if (!p || !p.INDEPENDENT_CHILDREN || !p.SHOOT_SETTINGS?.range) continue;
        let type = Array.isArray(p.TYPE) ? p.TYPE : [p.TYPE];
        let base = typeof type[0] === "string" ? Class[type[0]] : type[0];
        if (!isTank(base) || find(base, "DIE_AT_RANGE")) continue;
        p.TYPE = [...type, { DIE_AT_RANGE: true, BODY: { RANGE: p.SHOOT_SETTINGS.range * bulletRange } }];
    }
}

function labelOf(name) {
    return typeof name === "string" && Class[name] ? find(Class[name], "LABEL") : undefined;
}
let armsRaceBasic = Class.istrong_ed4bd83ab2d30363;
if (armsRaceBasic) {
    let root = Class.istrong_armsRaceBasic = { ...armsRaceBasic, REROOT_UPGRADE_TREE: "istrong_armsRaceBasic" };
    for (let key in armsRaceBasic) {
        if (key.startsWith("UPGRADES_TIER_")) root[key] = armsRaceBasic[key].filter(name => labelOf(name) !== "Healer");
    }
    let seen = new Set(), queue = ["istrong_armsRaceBasic"];
    while (queue.length) {
        let name = queue.pop();
        if (seen.has(name) || !Class[name]) continue;
        seen.add(name);
        for (let key in Class[name]) {
            if (key.startsWith("UPGRADES_TIER_")) for (let next of Class[name][key]) if (typeof next === "string") queue.push(next);
        }
    }
    for (let name of seen) if (Class[name].REROOT_UPGRADE_TREE === "istrong_ed4bd83ab2d30363") Class[name].REROOT_UPGRADE_TREE = "istrong_armsRaceBasic";
}
