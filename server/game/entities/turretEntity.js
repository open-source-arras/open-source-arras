let EventEmitter = require("events");
class turretEntity extends EventEmitter {
    constructor(position, bond, master) {
        super();
        if (!master) {
            throw new Error("Undefined master detected, check your code if anything broke lol");
        }
        // Inheritance
        this.master = master;
        this.source = this;
        this.parent = this;
        this.bulletparent = this;
        this.color = new Color(16);
        this.borderless = false;
        this.drawFill = true;
        this.invisible = [0, 0];
        this.alphaRange = [0, 1];
        this.id = entitiesIdLog++;
        this.control = {
            target: new Vector(0, 0),
            goal: new Vector(0, 0),
            main: false,
            alt: false,
            fire: false,
            power: 0
        };
        // Initalize.
        this.guns = new Map();
        this.turrets = new Map();
        this.autoOverride = false;
        this.controllers = [];
        this.settings = {};
        this.aiSettings = {};
        this.eastereggs = {};
        this.skill = new Skill();
        this.define("genericEntity");
        this.facing = 0;
        this.x = 0;
        this.y = 0;
        this.firingArc = [0, 360];
        this.upgrades = [];
        this.children = [];
        this.bulletchildren = [];
        this.accel = new Vector(0, 0);
        this.velocity = new Vector(0, 0);
        // Bind turret
        this.bond = bond;
        this.source = bond;
        this.bond.turrets.set(this.id, this);
        this.skill = this.bond.skill;
        this.label = this.bond.label + " " + this.label;
        this.team = this.id;
        this.team = bond.team;
        // Fake activation stuff
        this.activation = {
            check: () => {
                return this.bond.activation.check()
            }   
        }
        // Get my position.
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
    fixFacing() {
        this.facing = this.bond.facing + this.bound.angle;
        if (this.facingType.includes("Target") || this.facingType.includes("Speed")) {
            this.facingType = "bound", this.facingTypeArgs = {}, 
            this.facingTypeArgs = {smoothness: this.settings.smoothness ?? 4}; 
        } 
    }
    life() {
        bringToLife(this); 
    }

    addController(newIO) {
        if (!Array.isArray(newIO)) newIO = [newIO];
        for (let oldId = 0; oldId < this.controllers.length; oldId++) {
            for (let newId = 0; newId < newIO.length; newId++) {
                let oldIO = this.controllers[oldId];
                let io = newIO[newId];
                if (io.constructor === oldIO.constructor) {
                    this.controllers[oldId] = io;
                    newIO.splice(newId, 1);
                }
            }
        }
        this.controllers = this.controllers.concat(newIO);
    }

    define(defs) {
        if (!Array.isArray(defs)) defs = [defs];

        // Define all primary stats
        let set = ensureIsClass(defs[0]);
        this.store = {};
        for (let gun of this.guns.values()) gun.store = {};
        if (set.PARENT != null) {
            if (Array.isArray(set.PARENT)) {
                for (let i = 0; i < set.PARENT.length; i++) {
                    this.define(set.PARENT[i], false);
                }
            } else {
                this.define(set.PARENT, false);
            }
        }
        if (set.LAYER != null) this.layerID = set.LAYER;
        if (set.index != null) this.index = set.index.toString();
        if (set.NAME != null) this.name = set.NAME;
        if (set.LABEL != null) this.label = set.LABEL;
        if (set.ANGLE != null) this.angle = set.ANGLE;
        if (set.DISPLAY_NAME != null) this.displayName = set.DISPLAY_NAME;
        if (set.TYPE != null) this.type = set.TYPE;
        if (set.WALL_TYPE != null) this.walltype = set.WALL_TYPE;
        if (set.MIRROR_MASTER_ANGLE != null) this.settings.mirrorMasterAngle = set.MIRROR_MASTER_ANGLE;
        if (set.INDEPENDENT != null) this.settings.independent = set.INDEPENDENT;
        if (set.SMOOTHNESS != null) this.settings.smoothness = set.SMOOTHNESS;
        if (set.SHAPE != null) {
            this.shape = typeof set.SHAPE === "number" ? set.SHAPE : (set.SHAPE_NUM ?? 0);
            this.shapeData = set.SHAPE;
        }
        if (set.COLOR != null) {
            this.color.interpret(set.COLOR);
        }
        if (set.CONTROLLERS != null) {
            let addedSuccess = false;
            try {
                let toAdd = [];
                for (let i = 0; i < set.CONTROLLERS.length; i++) {
                    let io = set.CONTROLLERS[i];
                    if ("string" == typeof io) io = [io];
                    toAdd.push(new ioTypes[io[0]](this, io[1], global.gameManager));
                    addedSuccess = true;
                }
                this.addController(toAdd);
            } catch(e) {
                console.error(addedSuccess ? `Controller ${set.CONTROLLERS} ran into an error!` : `Controller "${set.CONTROLLERS}" was attempted to be gotten but does not exist!`);
                throw new Error(e);
            }
        }
        if (set.FACING_TYPE != null) {
            this.facingType = set.FACING_TYPE;
            if (Array.isArray(this.facingType)) {
                this.facingTypeArgs = this.facingType[1];
                this.facingType = this.facingType[0];
            } else {
                this.facingTypeArgs = {};
            }
        };
        if ("function" === typeof set.defineLevelSkillPoints) this.skill.LSPF = set.defineLevelSkillPoints;
        if (set.RECALC_SKILL != null) {
            let score = this.skill.score;
            this.skill.reset();
            this.skill.score = score;
            while (this.skill.maintain()) { }
        }
        if (set.EXTRA_SKILL != null) this.skill.points += set.EXTRA_SKILL;
        if (set.MAX_CHILDREN != null) this.maxChildren = set.MAX_CHILDREN;
        if (set.HAS_NO_RECOIL != null) this.settings.hasNoRecoil = set.HAS_NO_RECOIL;
        if (set.AI != null) this.aiSettings = set.AI;
        if (set.GUNS != null) {
            this.guns.clear();
            let newGuns = [];
            for (let i = 0; i < set.GUNS.length; i++) {
                newGuns.push(new Gun(this, set.GUNS[i]));
            }
            for (let guns of newGuns) {
                this.guns.set(guns.id, guns);
            }
        }
        if (set.SIZE != null) this.SIZE = set.SIZE;
        if (set.TURRETS != null) {
            for (let turret of this.turrets.values()) turret.destroy();
            this.turrets.clear();
            for (let i = 0; i < set.TURRETS.length; i++) {
                let def = set.TURRETS[i],
                    o = new turretEntity(def.POSITION, this, this.master),
                    turretDanger = false,
                    type = Array.isArray(def.TYPE) ? def.TYPE : [def.TYPE];
                for (let j = 0; j < type.length; j++) {
                    o.define(type[j]);
                    if (type.TURRET_DANGER) turretDanger = true;
                }
                if (!turretDanger) o.define({ DANGER: 0 });
                o.collidingBond = def.VULNERABLE;
                o.fixFacing();
            }
        }
        if (set.BODY != null) {
            if (set.BODY.ACCELERATION != null) this.ACCELERATION = set.BODY.ACCELERATION;
            if (set.BODY.SPEED != null) this.SPEED = set.BODY.SPEED;
            if (set.BODY.HEALTH != null) this.HEALTH = set.BODY.HEALTH;
            if (set.BODY.RESIST != null) this.RESIST = set.BODY.RESIST;
            if (set.BODY.SHIELD != null) this.SHIELD = set.BODY.SHIELD;
            if (set.BODY.REGEN != null) this.REGEN = set.BODY.REGEN;
            if (set.BODY.DAMAGE != null) this.DAMAGE = set.BODY.DAMAGE;
            if (set.BODY.PENETRATION != null) this.PENETRATION = set.BODY.PENETRATION;
            if (set.BODY.RANGE != null) this.RANGE = set.BODY.RANGE;
            if (set.BODY.FOV != null) this.FOV = set.BODY.FOV;
            if (set.BODY.SHOCK_ABSORB != null) this.SHOCK_ABSORB = set.BODY.SHOCK_ABSORB;
            if (set.BODY.RECOIL_MULTIPLIER != null) this.RECOIL_MULTIPLIER = set.BODY.RECOIL_MULTIPLIER;
            if (set.BODY.DENSITY != null) this.DENSITY = set.BODY.DENSITY;
            if (set.BODY.STEALTH != null) this.STEALTH = set.BODY.STEALTH;
            if (set.BODY.PUSHABILITY != null) this.PUSHABILITY = set.BODY.PUSHABILITY;
            if (set.BODY.KNOCKBACK != null) this.KNOCKBACK = set.BODY.KNOCKBACK;
            if (set.BODY.HETERO != null) this.heteroMultiplier = set.BODY.HETERO;
            this.refreshBodyAttributes();
        }
    };
    
    get size() {
        return this.bond.size * this.bound.size;
    };
    get realSize() {
        return this.size * lazyRealSizes[Math.floor(Math.abs(this.shape))];
    };

    updateBodyInfo() { 
        this.fov = 1 * this.FOV * 275 * Math.sqrt(this.size); 
    }

    refreshBodyAttributes() {
        this.damage = 1 * this.DAMAGE * this.skill.atk;
        this.penetration = 1 * (this.PENETRATION + 1.5 * (this.skill.brst + 0.8 * (this.skill.atk - 1)));
        this.density = 1 * (1 + 0.08 * this.level) * this.DENSITY;
        this.stealth = 1 * this.STEALTH;
        this.pushability = 1 * this.PUSHABILITY;
        this.knockback = this.KNOCKBACK ?? false;
        this.sizeMultiplier = 1;
        this.recoilMultiplier = this.RECOIL_MULTIPLIER * 1;
    };

    move() {
        let bound = this.bound,
            ref = this.bond;
        this.x = ref.x + ref.size * bound.offset * Math.cos(bound.direction + bound.angle + ref.facing);
        this.y = ref.y + ref.size * bound.offset * Math.sin(bound.direction + bound.angle + ref.facing);
        ref.velocity.x += bound.size * this.accel.x;
        ref.velocity.y += bound.size * this.accel.y;
        this.velocity = ref.velocity;
        this.firingArc = [ref.facing + bound.angle, bound.arc / 2];
        this.accel.null();
        this.blend = ref.blend;
    };

    face() {
        global.runFace(this) 
    };
    
    syncTurrets() {
        for (let gun of this.guns.values()) gun.syncChildren();
        for (let turret of this.turrets.values()) {
            turret.skill = this.skill;
            turret.refreshBodyAttributes();
            turret.syncTurrets();
        }
    };

    camera() {
        if (!this.cameraInfo) this.cameraInfo = { guns: [], turrets: [] };
        const info = this.cameraInfo;
        info.type = 0x01;
        info.index = this.index;
        info.size = this.size;
        info.realSize = this.realSize;
        info.facing = this.facing;
        info.angle = this.bound.angle;
        info.direction = this.bound.direction;
        info.offset = this.bound.offset;
        info.sizeFactor = this.bound.size;
        info.mirrorMasterAngle = this.settings.mirrorMasterAngle ?? false;
        info.layer = this.bound.layer;
        info.color = this.color.compiled;
        info.guns.length = 0;
        for (const gun of this.guns.values()) info.guns.push(gun.getPhotoInfo());
        info.turrets.length = 0;
        for (const turret of this.turrets.values()) info.turrets.push(turret.camera());
        return info;
    };

    destroy() {
    // Remove from bullet lists if needed
        if (this.bulletparent != null) {
            util.remove(this.bulletparent.bulletchildren, this.bulletparent.bulletchildren.indexOf(this)); // the only reason this exists is for bacteria.
            for (let gun of this.bulletparent.guns.values()) {
                util.remove(gun.bulletchildren, gun.bulletchildren.indexOf(this));
            }
        }
        // Remove from parent lists if needed
        if (this.parent != null) util.remove(this.parent.children, this.parent.children.indexOf(this));
        // Kill all of its children
        for (const instance of entities.values()) {
            if (instance.source.id === this.id) {
                if (instance.settings.persistsAfterDeath) {
                    instance.source = instance;
                } else if (this.master.label !== "Bacteria") {
                    instance.kill();
                    targetableEntities.delete(instance.id);
                }
            }
            if (instance.parent && instance.parent.id === this.id) {
                instance.parent = null;
            }
            if (instance.master.id === this.id) {
                if (this.master.label !== "Bacteria") {
                    instance.kill();
                    instance.master = instance;
                    targetableEntities.delete(instance.id);
                }
            }
        };
        // Remove everything bound to it
        for (const turret of this.turrets.values()) {
            turret.destroy();
        }
    }
}

module.exports = { turretEntity };
