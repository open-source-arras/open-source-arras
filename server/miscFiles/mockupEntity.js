class MockupEntityGun {
    constructor(info) {
        this.colorUnboxed = {
            base: 16,
            hueShift: 0,
            saturationShift: 1,
            brightnessShift: 0,
            allowBrightnessInvert: false
        };
        this.color = "16 0 1 0 false";
        this.alpha = 1;
        this.strokeWidth = 1;
        this.borderless = false;
        this.drawFill = true;
        this.drawAbove = false;
        if (info.PROPERTIES != null) {
            if (info.PROPERTIES.COLOR != null) {
                if (typeof info.PROPERTIES.COLOR === "number" || typeof info.PROPERTIES.COLOR === "string") {
                    if (!isNaN(info.PROPERTIES.COLOR) && !isNaN(parseFloat(info.PROPERTIES.COLOR)) || /^[a-zA-Z]*$/.test(info.PROPERTIES.COLOR)) {
                        this.colorUnboxed.base = info.PROPERTIES.COLOR; 
                    } 
                } else if (typeof info.PROPERTIES.COLOR === "object") {
                    this.colorUnboxed = {
                        base: info.PROPERTIES.COLOR.BASE ?? 16,
                        hueShift: info.PROPERTIES.COLOR.HUE_SHIFT ?? 0,
                        saturationShift: info.PROPERTIES.COLOR.SATURATION_SHIFT ?? 1,
                        brightnessShift: info.PROPERTIES.COLOR.BRIGHTNESS_SHIFT ?? 0,
                        allowBrightnessInvert: info.PROPERTIES.COLOR.ALLOW_BRIGHTNESS_INVERT ?? false
                    }; 
                }
                this.color = this.colorUnboxed.base + " " + this.colorUnboxed.hueShift + " " + this.colorUnboxed.saturationShift + " " + this.colorUnboxed.brightnessShift + " " + this.colorUnboxed.allowBrightnessInvert;
            }
            if (info.PROPERTIES.ALPHA != null) this.alpha = info.PROPERTIES.ALPHA;
            if (info.PROPERTIES.STROKE_WIDTH != null) this.strokeWidth = info.PROPERTIES.STROKE_WIDTH;
            if (info.PROPERTIES.BORDERLESS != null) this.borderless = info.PROPERTIES.BORDERLESS;
            if (info.PROPERTIES.DRAW_FILL != null) this.drawFill = info.PROPERTIES.DRAW_FILL;
            if (info.PROPERTIES.DRAW_ABOVE) this.drawAbove = info.PROPERTIES.DRAW_ABOVE;
        }
        let position = info.POSITION;
        if (Array.isArray(position)) {
            position = {
                LENGTH: position[0],
                WIDTH: position[1],
                ASPECT: position[2],
                X: position[3],
                Y: position[4],
                ANGLE: position[5],
                DELAY: position[6],
                DRAW_ABOVE: position[7]
            }
        }
        position = {
            LENGTH: position.LENGTH ?? 18,
            WIDTH: position.WIDTH ?? 8,
            ASPECT: position.ASPECT ?? 1,
            X: position.X ?? 0,
            Y: position.Y ?? 0,
            ANGLE: position.ANGLE ?? 0,
            DELAY: position.DELAY ?? 0,
            DRAW_ABOVE: position.DRAW_ABOVE ?? this.drawAbove,
            LAYER: position.LAYER ?? 0
        };
        this.length = position.LENGTH / 10;
        this.width = position.WIDTH / 10;
        this.aspect = position.ASPECT;
        let _off = new Vector(position.X, position.Y);
        this.angle = (position.ANGLE * Math.PI) / 180;
        this.direction = _off.direction;
        this.offset = _off.length / 10;
        this.drawAbove = position.DRAW_ABOVE;
        this.layer = position.LAYER ?? 0;
    }
}

class MockupEntityProp {
    constructor(def, bond) {
        this.guns = [];
        this.colorUnboxed = {
            base: 16,
            hueShift: 0,
            saturationShift: 1,
            brightnessShift: 0,
            allowBrightnessInvert: false
        };
        this.color = "16 0 1 0 false";
        this.borderless = false;
        this.drawFill = true;
        this.strokeWidth = 1;

        // Bind prop
        this.bond = bond;
        this.bond.props.push(this);
        
        let position = def.POSITION;
        // Get my position.
        if (Array.isArray(position)) {
            position = {
                SIZE: position[0],
                X: position[1],
                Y: position[2],
                ANGLE: position[3],
                LAYER: position[4]
            };
        }
        position.SIZE ??= 10;
        position.X ??= 0;
        position.Y ??= 0;
        position.ANGLE ??= 0;
        position.LAYER ??= 0;
        let _off = new Vector(position.X, position.Y);
        this.bound = {
            size: position.SIZE / 20,
            angle: position.ANGLE * Math.PI / 180,
            direction: _off.direction,
            offset: _off.length / 10,
            layer: position.LAYER
        };
        // Initalize.
        this.forceAngle = def.FORCE_ANGLE ?? null;
        this.facing = 0;
        this.x = 0;
        this.y = 0;
        this.size = 1;
        this.realSize = 1;
        this.isProp = true;
        this.settings = {};
        this.settings.mirrorMasterAngle = true;
        this.upgrades = [];
        this.turrets = [];
        this.props = [];
    }
    define(def) {
        let set = ensureIsClass(def);

        if (set.PARENT != null) {
            if (Array.isArray(set.PARENT)) {
                for (let i = 0; i < set.PARENT.length; i++) {
                    this.define(set.PARENT[i], false);
                }
            } else {
                this.define(set.PARENT, false);
            }
        }
        if (set.index != null) this.index = set.index.toString();
        if (set.SHAPE != null) {
            this.shape = typeof set.SHAPE === "number" ? set.SHAPE : (set.SHAPE_NUM ?? 0);
            this.shapeData = set.SHAPE;
        }
        this.imageInterpolation = set.IMAGE_INTERPOLATION != null ? set.IMAGE_INTERPOLATION : "bilinear"
        if (set.COLOR != null) {
            if (typeof set.COLOR === "number" || typeof set.COLOR === "string") {
                if (!isNaN(set.COLOR) && !isNaN(parseFloat(set.COLOR)) || /^[a-zA-Z]*$/.test(set.COLOR)) {
                    this.colorUnboxed.base = set.COLOR; 
                } 
            } else if (typeof set.COLOR === "object") {
                this.colorUnboxed = {
                    base: set.COLOR.BASE ?? 16,
                    hueShift: set.COLOR.HUE_SHIFT ?? 0,
                    saturationShift: set.COLOR.SATURATION_SHIFT ?? 1,
                    brightnessShift: set.COLOR.BRIGHTNESS_SHIFT ?? 0,
                    allowBrightnessInvert: set.COLOR.ALLOW_BRIGHTNESS_INVERT ?? false
                }; 
            }
            this.color = this.colorUnboxed.base + " " + this.colorUnboxed.hueShift + " " + this.colorUnboxed.saturationShift + " " + this.colorUnboxed.brightnessShift + " " + this.colorUnboxed.allowBrightnessInvert;
        }
        if (set.BORDERLESS != null) this.borderless = set.BORDERLESS;
        if (set.DRAW_FILL != null) this.drawFill = set.DRAW_FILL;
        if (set.GUNS != null) {
            let newGuns = [];
            for (let i = 0; i < set.GUNS.length; i++) {
                newGuns.push(new MockupEntityGun(set.GUNS[i]));
            }
            this.guns = newGuns;
        }
    }
}

class MockupEntity {
    constructor() {
    // General stuff
        this.settings = {};
        this.upgrades = [];
        this.colorUnboxed = {
            base: 16,
            hueShift: 0,
            saturationShift: 1,
            brightnessShift: 0,
            allowBrightnessInvert: false
        };
        this.color = "16 0 1 0 false";
        this.glow = { radius: null, color: "16 0 1 0 false", alpha: 1, recursion: 1 };
        this.invisible = [0, 0];
        this.alphaRange = [0, 1];
        this.alpha = 1;
        this.guns = [];
        this.turrets = [];
        this.props = [];
        this.x = 0;
        this.y = 0;

        // Call the set function to make everything set up.
        this.set(Class.genericEntity);
    }
    set(vclass) {
        if (!Array.isArray(vclass)) vclass = [vclass];
        // Define all primary stats
        let set = ensureIsClass(vclass[0]);
        if (set.PARENT != null) {
            if (Array.isArray(set.PARENT)) {
                for (let i = 0; i < set.PARENT.length; i++) {
                    this.set(set.PARENT[i]);
                }
            } else {
                this.set(set.PARENT);
            }
        }
        this.borderless = set.BORDERLESS ?? false;
        this.drawFill = set.DRAW_FILL ?? true;
        if (set.LAYER != null) this.layerID = set.LAYER;
        if (set.index != null) this.index = set.index.toString();
        if (set.NAME != null) this.name = set.NAME;
        if (set.LABEL != null) this.label = set.LABEL;
        if (set.TYPE != null) this.type = set.TYPE;
        if (set.UPGRADE_LABEL != null) this.upgradeLabel = set.UPGRADE_LABEL;
        if (set.UPGRADE_TOOLTIP != null) this.upgradeTooltip = set.UPGRADE_TOOLTIP;
        this.strokeWidth = set.STROKE_WIDTH ?? 1;
        if (set.SHAPE != null) {
            this.shape = typeof set.SHAPE === "number" ? set.SHAPE : (set.SHAPE_NUM ?? 0);
            this.shapeData = set.SHAPE;
        }
        this.imageInterpolation = set.IMAGE_INTERPOLATION ?? "bilinear";
        if (set.COLOR != null) {
            if (typeof set.COLOR === "number" || typeof set.COLOR === "string") {
                this.colorUnboxed.base = set.COLOR; 
            } else if (typeof set.COLOR === "object") {
                this.colorUnboxed = {
                    base: set.COLOR.BASE ?? 16,
                    hueShift: set.COLOR.HUE_SHIFT ?? 0,
                    saturationShift: set.COLOR.SATURATION_SHIFT ?? 1,
                    brightnessShift: set.COLOR.BRIGHTNESS_SHIFT ?? 0,
                    allowBrightnessInvert: set.COLOR.ALLOW_BRIGHTNESS_INVERT ?? false
                }; 
            }
            this.color = this.colorUnboxed.base + " " + this.colorUnboxed.hueShift + " " + this.colorUnboxed.saturationShift + " " + this.colorUnboxed.brightnessShift + " " + this.colorUnboxed.allowBrightnessInvert;
        }
        if (set.UPGRADE_COLOR) this.upgradeColor = set.UPGRADE_COLOR + " 0 1 0 false";
        if (set.GLOW != null) {
            this.glow = {
                radius: set.GLOW.RADIUS ?? 0,
                color: set.GLOW.COLOR + " 0 1 0 false",
                alpha: set.GLOW.ALPHA ?? 1,
                recursion: set.GLOW.RECURSION ?? 1
            };
        }
        this.settings.mirrorMasterAngle = set.MIRROR_MASTER_ANGLE ?? false;
        this.settings.drawHealth = set.DRAW_HEALTH ?? true;
        this.settings.drawShape = set.DRAW_SELF ?? true;
        this.settings.damageEffects = set.DAMAGE_EFFECTS ?? true;
        this.settings.ratioEffects = set.RATIO_EFFECTS ?? true;
        this.settings.motionEffects = set.MOTION_EFFECTS ?? true;
        this.sendAllMockups = set.SEND_ALL_MOCKUPS ?? false;
        if (set.VISIBLE_ON_BLACKOUT) this.visibleOnBlackout = set.VISIBLE_ON_BLACKOUT;
        if (set.REROOT_UPGRADE_TREE) this.rerootUpgradeTree = set.REROOT_UPGRADE_TREE;
        if (Array.isArray(this.rerootUpgradeTree)) {
            let finalRoot = "";
            for (let root of this.rerootUpgradeTree) finalRoot += root + "\\/";
            this.rerootUpgradeTree = finalRoot.substring(0, finalRoot.length - 2);
        }
        if (set.STAT_NAMES != null) {
            this.settings.skillNames = {
                body_damage: set.STAT_NAMES?.BODY_DAMAGE ?? "Body Damage",
                max_health: set.STAT_NAMES?.MAX_HEALTH ?? "Max Health",
                bullet_speed: set.STAT_NAMES?.BULLET_SPEED ?? "Bullet Speed",
                bullet_health: set.STAT_NAMES?.BULLET_HEALTH ?? "Bullet Health",
                bullet_pen: set.STAT_NAMES?.BULLET_PEN ?? "Bullet Penetration",
                bullet_damage: set.STAT_NAMES?.BULLET_DAMAGE ?? "Bullet Damage",
                reload: set.STAT_NAMES?.RELOAD ?? "Reload",
                move_speed: set.STAT_NAMES?.MOVE_SPEED ?? "Movement Speed",
                shield_regen: set.STAT_NAMES?.SHIELD_REGEN ?? "Shield Regeneration",
                shield_cap: set.STAT_NAMES?.SHIELD_CAP ?? "Shield Capacity"
            }; 
        }
        if (set.ALPHA != null) {
            this.alpha = ("number" === typeof set.ALPHA) ? set.ALPHA : set.ALPHA[1];
            this.alphaRange = [
                set.ALPHA[0] || 0,
                set.ALPHA[1] || 1
            ];
        }
        let level = 0;
        if (set.VALUE != null) {
            let score = 0;
            let deduction = 0;
            let levelScore = () => 1.74 * Math.pow(level + 1, 1.79503264) - 0.53 * level
            while (score - deduction >= levelScore()) {
                deduction += levelScore();
                level += 1;
            }
        } else if (set.LEVEL != null) level = set.LEVEL;
        this.size = (set.SIZE ?? 1) * (set.VARIES_IN_SIZE ? ran.randomRange(0.8, 1.2) : 1) * (1 + Math.min(set.LEVEL_CAP ?? Config.level_cap, level) / 45);
        this.realSize = util.rounder(this.size * lazyRealSizes[Math.floor(Math.abs(this.shape))]);
        this.size = util.rounder(this.size);
        if (set.BRANCH_LABEL != null) this.branchLabel = set.BRANCH_LABEL;
        if (set.BATCH_UPGRADES != null) this.batchUpgrades = set.BATCH_UPGRADES;
        for (const prop in set) {
            if (!prop.startsWith("UPGRADES_TIER_")) {
                continue;
            }
            for (let j = 0; j < set[prop].length; j++) {
                let upgrades = set[prop][j];
                let index = "";
                if (!Array.isArray(upgrades)) upgrades = [upgrades];
                let redefineAll = upgrades.includes(true);
                let trueUpgrades = upgrades.slice(0, upgrades.length - redefineAll); // Ignore last element if it's true
                for (let k of trueUpgrades) {
                    let e = ensureIsClass(k);
                    index += e.index + "-";
                }
                let i = parseInt(prop.split("_")[2])
                this.upgrades.push({
                    class: trueUpgrades,
                    level: Config.tier_multiplier * i,
                    index: index.substring(0, index.length - 1),
                    tier: i,
                    branch: 0,
                    branchLabel: this.branchLabel,
                    redefineAll
                });
            }
        }
        // Batch Upgrades
        if (!this.defs) this.defs = [];
        for (let def of vclass) this.defs.push(def);
        if (this.batchUpgrades) handleBatchUpgradeSplit(this); // Batch upgrades
        for (let branch = 1; branch < this.defs.length; branch++) { // Define additional stats for other split upgrades (And fix class tree too)
            set = ensureIsClass(this.defs[branch]);
            if (set.index != null) this.index += "-" + set.index;
            if (set.PARENT != null) {
                if (Array.isArray(set.PARENT)) {
                    for (let i = 0; i < set.PARENT.length; i++) {
                        this.branchLabel = ensureIsClass(set.PARENT[i]).BRANCH_LABEL;
                    }
                } else {
                    this.branchLabel = ensureIsClass(set.PARENT).BRANCH_LABEL;
                }
            }
            if (set.BATCH_UPGRADES != null) this.batchUpgrades = set.BATCH_UPGRADES;
            for (const prop in set) {
                if (!prop.startsWith("UPGRADES_TIER_")) {
                    continue;
                }
                for (let j = 0; j < set[prop].length; j++) {
                    let upgrades = set[prop][j];
                    let index = "";
                    if (!Array.isArray(upgrades)) upgrades = [upgrades];
                    let redefineAll = upgrades.includes(true);
                    let trueUpgrades = upgrades.slice(0, upgrades.length - redefineAll); // Ignore last element if it's true
                    for (let k of trueUpgrades) {
                        let e = ensureIsClass(k);
                        index += e.index + "-";
                    }
                    this.upgrades.push({
                        class: trueUpgrades,
                        level: Config.tier_multiplier * i,
                        index: index.substring(0, index.length - 1),
                        tier: i,
                        branch,
                        branchLabel: this.branchLabel,
                        redefineAll
                    });
                }
            }
            if (set.REROOT_UPGRADE_TREE) this.rerootUpgradeTree = set.REROOT_UPGRADE_TREE;
            if (Array.isArray(this.rerootUpgradeTree)) {
                let finalRoot = "";
                for (let root of this.rerootUpgradeTree) finalRoot += root + "\\/";
                this.rerootUpgradeTree += finalRoot.substring(0, finalRoot.length - 2);
            }
        }
        delete this.defs;
        if (set.GUNS != null) {
            let newGuns = [];
            for (let i = 0; i < set.GUNS.length; i++) {
                newGuns.push(new MockupEntityGun(set.GUNS[i]));
            }
            this.guns = newGuns;
        }
        if (set.TURRETS != null) {
            this.turrets = [];
            for (let i = 0; i < set.TURRETS.length; i++) {
                let def = set.TURRETS[i];
                let o = new MockupEntity();
                if (Array.isArray(def.TYPE)) {
                    for (let j = 0; j < def.TYPE.length; j++) {
                        o.set(def.TYPE[j]);
                    }
                } else {
                    o.set(def.TYPE);
                }
                o.bindToMaster(def.POSITION, this);
            }
        }
        if (set.PROPS != null) {
            this.props = [];
            for (let i = 0; i < set.PROPS.length; i++) {
                let def = set.PROPS[i],
                    type = Array.isArray(def.TYPE) ? def.TYPE : [def.TYPE],
                    o = new MockupEntityProp(def, this);
                for (let j = 0; j < type.length; j++) {
                    o.define(type[j]);
                }
            }
        }
    }
    bindToMaster(position, bond) {
        this.bond = bond;
        this.source = bond;
        this.bond.turrets.push(this);
        this.settings.drawShape = false;
        if (Array.isArray(position)) {
            position = {
                SIZE: position[0],
                X: position[1],
                Y: position[2],
                ANGLE: position[3],
                ARC: position[4],
                LAYER: position[5]
            };
        }
        position.SIZE ??= 10;
        position.X ??= 0;
        position.Y ??= 0;
        position.ANGLE ??= 0;
        position.ARC ??= 360;
        position.LAYER ??= 0;
        let _off = new Vector(position.X, position.Y);
        this.bound = {
            size: position.SIZE / 20,
            angle: position.ANGLE * Math.PI / 180,
            direction: _off.direction,
            offset: _off.length / 10,
            arc: position.ARC * Math.PI / 180,
            layer: position.LAYER
        };
    }
}

module.exports = { MockupEntity };