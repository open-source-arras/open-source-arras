class bulletEntity { // Basically an (Entity) but with heavy limitations to improve performance.
    constructor(position, master) {
        if (!master) master = this;
        this.isGhost = false;
        this.killCount = { solo: 0, assists: 0, bosses: 0, polygons: 0, killers: [] };
        this.creationTime = new Date().getTime();
        this.master = master;
        this.source = this;
        this.limited = true;
        this.onRender = false;
        this.control = {
            target: new Vector(0, 0),
            goal: new Vector(0, 0),
            main: false,
            alt: false,
            fire: false,
            power: 0,
        };
        this.isInGrid = false;
        this.removeFromGrid = () => {
            if (this.isInGrid) {
                this.isInGrid = false;
            } 
        };
        this.addToGrid = () => {
            if (!this.isInGrid) {
                this.isInGrid = true;
            }
        };
        this.activation = new Activation(this);
        this.controllers = [];
        // Initalize
        this.skill = new Skill();
        this.health = new HealthType(1, 'static', 0);
        this.shield = new HealthType(0, 'dynamic');
        this.x = position.x;
        this.y = position.y;
        this.settings = {};
        this.aiSettings = {};
        this.guns = new Map();
        this.children = [];
        this.bulletchildren = [];
        this.glow = { radius: null, color: new Color(-1).compiled, alpha: 1, recursion: 1 };
        this.necro = () => {};
        this.color = new Color(16);
        this.define("genericEntity");
        this.maxSpeed = 0;
        this.facing = 0;
        this.vfacing = 0;
        this.range = 0;
        this.damageReceived = 0;
        this.collisionArray = [];
        this.invuln = false;
        this.alpha = 1;
        this.invisible = [0, 0];
        this.alphaRange = [0, 1];
        this.velocity = new Vector(0, 0);
        this.accel = new Vector(0, 0);
        this.damp = 0.05;
        this.SIZE = 1;
        this.sizeMultiplier = 1;
        this.firingArc = [0, 360];
        // Get a new unique id
        this.id = entitiesIdLog++;
        this.team = this.id;
        this.team = master.team;
        // This is for collisions
        this.minX = 0;
        this.minY = 0;
        this.maxX = 0;
        this.maxY = 0;
        this.collidingBond = false;
        // Optimized AABB calculation and update
        this.updateAABB = (active) => {
            if (!active || (!this.collidingBond && this.bond != null)) {
                this.isInGrid = false;
            } else {
                this.isInGrid = true;
                this.minX = this.x - this.size;
                this.minY = this.y - this.size;
                this.maxX = this.x + this.size;
                this.maxY = this.y + this.size;
            }
        };
        entities.set(this.id, this);
        for (let v of global.gameManager.views) v.add(this);
    }

    life() { bringToLife(this) };

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

    define(defs, emitEvent = true, overwriteindex = true) {
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
        if (set.index != null && overwriteindex) this.index = set.index.toString();
        if (set.NAME != null) this.name = set.NAME;
        if (set.LABEL != null) this.label = set.LABEL;
        if (set.ANGLE != null) this.angle = set.ANGLE;
        if (set.DISPLAY_NAME != null) this.displayName = set.DISPLAY_NAME;
        if (set.TYPE != null) this.type = set.TYPE;
        if (set.WALL_TYPE != null) this.walltype = set.WALL_TYPE;
        if (set.SHAPE != null) {
            this.shape = typeof set.SHAPE === "number" ? set.SHAPE : (set.SHAPE_NUM ?? 0);
            this.shapeData = set.SHAPE;
        }
        if (set.COLOR != null) {
            this.color.interpret(set.COLOR);
        }
        if (set.UPGRADE_COLOR) this.upgradeColor = new Color(set.UPGRADE_COLOR).compiled;
        if (set.GLOW != null) {
            this.glow = {
                radius: set.GLOW.RADIUS ?? 0,
                color: new Color(set.GLOW.COLOR).compiled,
                alpha: set.GLOW.ALPHA ?? 1,
                recursion: set.GLOW.RECURSION ?? 1
            };
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
            } catch (e) {
                console.error(addedSuccess ? `Controller ${set.CONTROLLERS} ran into an error!` : `Controller "${set.CONTROLLERS}" was attempted to be gotten but does not exist!`);
                throw new Error(e);
            }
        }
        if (set.IGNORED_BY_AI != null) this.ignoredByAi = set.IGNORED_BY_AI;
        if (set.MOTION_TYPE != null) {
            this.motionType = set.MOTION_TYPE;
            if (Array.isArray(this.motionType)) {
                this.motionTypeArgs = this.motionType[1];
                this.motionType = this.motionType[0];
            } else {
                this.motionTypeArgs = {};
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
        if (set.NO_COLLISIONS) this.settings.no_collisions = set.NO_COLLISIONS;
        if (set.DRAW_HEALTH != null) this.settings.drawHealth = set.DRAW_HEALTH;
        if (set.DRAW_SELF != null) this.settings.drawShape = set.DRAW_SELF;
        if (set.DAMAGE_EFFECTS != null) this.settings.damageEffects = set.DAMAGE_EFFECTS;
        if (set.RATIO_EFFECTS != null) this.settings.ratioEffects = set.RATIO_EFFECTS;
        if (set.MOTION_EFFECTS != null) this.settings.motionEffects = set.MOTION_EFFECTS;
        if (set.ACCEPTS_SCORE != null) this.settings.acceptsScore = set.ACCEPTS_SCORE;
        if (set.GIVE_KILL_MESSAGE != null) this.settings.givesKillMessage = set.GIVE_KILL_MESSAGE;
        if (set.CAN_GO_OUTSIDE_ROOM != null) this.settings.canGoOutsideRoom = set.CAN_GO_OUTSIDE_ROOM;
        if (set.HITS_OWN_TYPE != null) this.settings.hitsOwnType = set.HITS_OWN_TYPE;
        if (set.DIE_AT_LOW_SPEED != null) this.settings.diesAtLowSpeed = set.DIE_AT_LOW_SPEED;
        if (set.DIE_AT_RANGE != null) this.settings.diesAtRange = set.DIE_AT_RANGE;
        if (set.INDEPENDENT != null) this.settings.independent = set.INDEPENDENT;
        if (set.PERSISTS_AFTER_DEATH != null) this.settings.persistsAfterDeath = set.PERSISTS_AFTER_DEATH;
        if (set.CLEAR_ON_MASTER_UPGRADE != null) this.settings.clearOnMasterUpgrade = set.CLEAR_ON_MASTER_UPGRADE;
        if (set.HEALTH_WITH_LEVEL != null) this.settings.healthWithLevel = set.HEALTH_WITH_LEVEL;
        if (set.OBSTACLE != null) this.settings.obstacle = set.OBSTACLE;
        if (set.HAS_NO_RECOIL != null) this.settings.hasNoRecoil = set.HAS_NO_RECOIL;
        if (set.CRAVES_ATTENTION != null) this.settings.attentionCraver = set.CRAVES_ATTENTION;
        if (set.HEALER) this.healer = true;
        if (set.DAMAGE_CLASS != null) this.settings.damageClass = set.DAMAGE_CLASS;
        if (set.BUFF_VS_FOOD != null) this.settings.buffVsFood = set.BUFF_VS_FOOD;
        if (set.INTANGIBLE != null) this.intangibility = set.INTANGIBLE;
        if (set.IS_SMASHER != null) this.settings.reloadToAcceleration = set.IS_SMASHER;
        if (set.AI != null) this.aiSettings = set.AI;
        if (set.INVISIBLE != null) this.invisible = set.INVISIBLE;
        if (set.ALPHA != null) {
            this.alpha = ("number" === typeof set.ALPHA) ? set.ALPHA : set.ALPHA[1];
            this.alphaRange = [set.ALPHA[0] || 0, set.ALPHA[1] || 1];
        }
        if (set.DANGER != null) this.dangerValue = set.DANGER;
        if (set.SHOOT_ON_DEATH != null) this.shootOnDeath = set.SHOOT_ON_DEATH;
        if (set.BORDERLESS != null) this.borderless = set.BORDERLESS;
        if (set.DRAW_FILL != null) this.drawFill = set.DRAW_FILL;
        if (set.TEAM != null) {
            this.team = set.TEAM;
        }
        if (set.VARIES_IN_SIZE != null) {
            this.settings.variesInSize = set.VARIES_IN_SIZE;
            this.squiggle = this.settings.variesInSize ? ran.randomRange(0.8, 1.2) : 1;
        }
        if (set.ARENA_CLOSER != null) this.isArenaCloser = set.ARENA_CLOSER, this.ac = set.ARENA_CLOSER;
        if (set.SIZE != null) {
            this.SIZE = set.SIZE * this.squiggle;
            if (this.coreSize == null) this.coreSize = this.SIZE;
        }
        if (set.LEVEL != null) {
            this.skill.reset();
            while (this.skill.level < set.LEVEL) {
                this.skill.score += this.skill.levelScore;
                this.skill.maintain();
            }
            this.refreshBodyAttributes();
        }
        if (set.SKILL_CAP != null && set.SKILL_CAP != []) {
            if (set.SKILL_CAP.length != 10) throw "Inappropiate skill cap amount.";
            this.skill.setCaps(set.SKILL_CAP);
        }
        if (set.SKILL != null && set.SKILL != []) {
            if (set.SKILL.length != 10) throw "Inappropiate skill raws.";
            this.skill.set(set.SKILL);
        }
        if (set.VALUE != null) this.skill.score = Math.max(this.skill.score, set.VALUE * this.squiggle);
        if (set.ALT_ABILITIES != null) this.abilities = set.ALT_ABILITIES;
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
        if (set.NECRO != null) {
            this.settings.necroTypes = Array.isArray(set.NECRO) ? set.NECRO : set.NECRO ? [this.shape] : [];

            // Necro function for tanks
            this.settings.necroDefineGuns = {};
            for (let shape of this.settings.necroTypes) {
                // Pick the first gun with the right necroType to use for stats and use its defineBullet function
                this.settings.necroDefineGuns[shape] = Array.from(this.guns.values()).filter((gun) => gun.bulletType.NECRO && (gun.bulletType.NECRO === shape || (gun.bulletType.NECRO === true && gun.bulletType.SHAPE === this.shape) || gun.bulletType.NECRO.includes(shape)))[0];
            }
            
            this.necro = (host) => {
                let gun = this.settings.necroDefineGuns[host.shape];
                if (!gun || !gun.checkShootPermission()) return false;

                let savedFacing = host.facing;
                let savedSize = host.SIZE;
                
                host.controllers = [];
                host.define("genericEntity");
                gun.bulletInit(host);
                host.team = this.master.master.team;
                host.master = this.master;
                host.color.base = this.color.base;
                host.facing = savedFacing;
                host.SIZE = savedSize;
                host.health.amount = host.health.max;
                return true;
            }
        }
        if (set.EXTRA_SKILL != null) this.skill.points += set.EXTRA_SKILL;
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
        if (set.SPAWN_ON_DEATH) this.spawnOnDeath = set.SPAWN_ON_DEATH;
        if (set.TICK_HANDLER) this.tickHandler = set.TICK_HANDLER;
    }

    get level() {
        return Math.min(this.levelCap ?? Config.level_cap, this.skill.level);
    }
    get size() {
        return this.bond == null ? (this.coreSize || this.SIZE) * this.sizeMultiplier * (1 + this.level / 45) : this.bond.size * this.bound.size;
    }
    get mass() {
        return this.density * (this.size ** 2 + 1);
    }
    get realSize() {
        return this.size * lazyRealSizes[Math.floor(Math.abs(this.shape))];
    }
    get xMotion() {
        return (this.velocity.x + this.accel.x) / global.gameManager.roomSpeed;
    }
    get yMotion() {
        return (this.velocity.y + this.accel.y) / global.gameManager.roomSpeed;
    }

    refreshBodyAttributes() {
        let speedReduce = Math.pow(this.size / (this.coreSize || this.SIZE), 1);
        this.acceleration = (1 * global.gameManager.runSpeed * this.ACCELERATION) / speedReduce;
        if (this.settings.reloadToAcceleration) this.acceleration *= this.skill.acl;
        this.topSpeed = (1 * global.gameManager.runSpeed * this.SPEED * this.skill.mob) / speedReduce;
        if (this.settings.reloadToAcceleration) this.topSpeed /= Math.sqrt(this.skill.acl);
        this.health.set(((this.settings.healthWithLevel ? 2 * this.level : 0) + this.HEALTH) * this.skill.hlt * 1);
        this.health.resist = 1 - 1 / Math.max(1, this.RESIST + this.skill.brst);
        this.shield.set(((this.settings.healthWithLevel ? 0.6 * this.level : 0) + this.SHIELD) * this.skill.shi, Math.max(0, ((this.settings.healthWithLevel ? 0.006 * this.level : 0) + 1) * this.REGEN * this.skill.rgn * 1));
        this.damage = 1 * this.DAMAGE * this.skill.atk;
        this.penetration = 1 * (this.PENETRATION + 1.5 * (this.skill.brst + 0.8 * (this.skill.atk - 1)));
        if (this.settings.diesAtRange || !this.range) this.range = 1 * this.RANGE;
        this.density = 1 * (1 + 0.08 * this.level) * this.DENSITY;
        this.stealth = 1 * this.STEALTH;
        this.pushability = 1 * this.PUSHABILITY;
        this.knockback = this.KNOCKBACK ?? false;
        this.sizeMultiplier = 1;
        this.recoilMultiplier = this.RECOIL_MULTIPLIER * 1;
    };

    updateBodyInfo() {};

    move() { global.runMove(this) };
    face() { global.runFace(this) };

    damageMultiplier() {
        switch (this.type) {
            case 'swarm': return 0.25 + 1.5 * util.clamp(this.range / (this.RANGE + 1), 0, 1);
            default: return 1;
        }
    }

    camera() {
        return {
            type: 0x10,
            id: this.id,
            index: this.index,
            x: this.x,
            y: this.y,
            vx: this.velocity.x,
            vy: this.velocity.y,
            size: this.size,
            realSize: this.realSize,
            health: this.health.display(),
            shield: 0,
            alpha: this.alpha,
            facing: this.facing,
            vfacing: this.vfacing,
            layer: this.layerID ? this.layerID : this.type === "wall" ? 11 : this.type === "food" ? 10 : this.type === "tank" ? 5 : this.type === "crasher" ? 1 : 0,
            color: this.color.compiled,
            guns: Array.from(this.guns.values()).map(gun => gun.getPhotoInfo()),
            turrets: [],
        };
    };

    takeSelfie() {
        this.flattenedPhoto = null;
        this.photo = (this.settings.drawShape) ? this.camera() : this.photo = undefined;
    };

    physics() {
        if (this.accel.x == null || this.velocity.x == null) {
            util.error('Void Error!');
            util.error(this.collisionArray);
            util.error(this.label);
            util.error(this);
            this.accel.null();
            this.velocity.null();
        }
        // Apply acceleration
        this.velocity.x += this.accel.x;
        this.velocity.y += this.accel.y;
        // Reset acceleration
        this.accel.null();
        // Apply motion
        this.stepRemaining = 1;
        this.x += this.stepRemaining * this.velocity.x / global.gameManager.roomSpeed;
        this.y += this.stepRemaining * this.velocity.y / global.gameManager.roomSpeed;
    };

    friction() {
        var motion = this.velocity.length,
            excess = motion - this.maxSpeed;
        if (excess > 0 && this.damp) {
            var k = this.damp / global.gameManager.roomSpeed,
                drag = excess / (k + 1),
                finalvelocity = this.maxSpeed + drag;
            this.velocity.x = finalvelocity * this.velocity.x / motion;
            this.velocity.y = finalvelocity * this.velocity.y / motion;
        }
    };

    confinementToTheseEarthlyShackles() {
        if (this.x == null || this.x == null) {
            util.error('Void Error!');
            util.error(this.collisionArray);
            util.error(this.label);
            util.error(this);
            this.accel.null();
            this.velocity.null();
            return 0;
        }
        if (!this.settings.canGoOutsideRoom) {
            if (Config.round_arena) {
                let centerPoint = {
                    x: global.gameManager.room.width - global.gameManager.room.width,
                    y: global.gameManager.room.height - global.gameManager.room.height,
                }, dist = util.getDistance(this, centerPoint);
                if (dist > global.gameManager.room.width - global.gameManager.room.width / 2) {
                    let strength = (dist - global.gameManager.room.width / 2) * Config.room_bound_force / (Config.run_speed * 350);
                    this.x = util.lerp(this.x, centerPoint.x, strength);
                    this.y = util.lerp(this.y, centerPoint.y, strength);
                }
            } else {
                this.accel.x -= Math.min(this.x - this.realSize + global.gameManager.room.width / 2 + 50, 0) * Config.room_bound_force / global.gameManager.roomSpeed;
                this.accel.x -= Math.max(this.x + this.realSize - global.gameManager.room.width / 2 - 50, 0) * Config.room_bound_force / global.gameManager.roomSpeed;
                this.accel.y -= Math.min(this.y - this.realSize + global.gameManager.room.height / 2 + 50, 0) * Config.room_bound_force / global.gameManager.roomSpeed;
                this.accel.y -= Math.max(this.y + this.realSize - global.gameManager.room.height / 2 - 50, 0) * Config.room_bound_force / global.gameManager.roomSpeed;
            }
        }
    };

    contemplationOfMortality() {
        if (this.invuln || this.godmode) {
            this.damageReceived = 0;
            return 0;
        }
        // Life-limiting effects
        if (this.settings.diesAtRange) {
            this.range -= 1 / global.gameManager.roomSpeed;
            if (this.range < 0) this.kill();
        }
        if (this.settings.diesAtLowSpeed && !this.collisionArray.length && this.velocity.length < this.topSpeed / 2) this.health.amount -= this.health.getDamage(1 / global.gameManager.roomSpeed);
        // Shield regen and damage
        if (this.shield.max) {
            if (this.damageReceived) {
                let shieldDamage = this.shield.getDamage(this.damageReceived);
                this.damageReceived -= shieldDamage;
                this.shield.amount -= shieldDamage;
            }
        }
        // Health damage
        if (this.damageReceived) {
            let healthDamage = this.health.getDamage(this.damageReceived);
            this.health.amount -= healthDamage;
        }
        this.damageReceived = 0;
        // Check for death
        if (this.isDead()) {
            for (let gun of this.guns.values()) {
                if (gun.shootOnDeath && gun.body != null) gun.shoot();
            }
            return 1;
        }
        return 0;
    };

    isBeingViewed(addToNearby = true) {
        let boolean = checkIfInView(false, addToNearby, global.gameManager.clients, this);
        return boolean;
    };

    sendMessage(message) { } // Dummy

    kill() {
        this.invuln = false;
        this.health.amount = -100;
    };

    destroy() {
        // Remove this from views
        global.gameManager.views.forEach(v => v.remove(this));
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
                }
            }
            if (instance.parent && instance.parent.id === this.id) {
                instance.parent = null;
            }
            if (instance.master.id === this.id) {
                if (this.master.label !== "Bacteria") {
                    instance.kill();
                    instance.master = instance;
                }
            }
        }
        // Clear all of the gun bullet children
        for (const gun of this.guns.values()) {
            for (const bullet of gun.bulletchildren) {
                if (bullet.isDead()) {
                    bullet.collisionArray.splice(0, bullet.collisionArray.length);
                    bullet.destroy(); // idk if i need to
                }
            }
        }
        this.removeFromGrid();
        this.isGhost = true;
        entities.delete(this.id);
        targetableEntities.delete(this.id);
    }

    isDead() { return this.health.amount <= 0; };
    emit() {} // Placeholder
}

module.exports = { bulletEntity };