// Define how guns work
let EventEmitter = require("events"),
    events,
    init = g => events = g.events;
class Gun extends EventEmitter {
    constructor(body, info) {
        super();
        this.id = entitiesIdLog++;
        this.ac = false;
        this.lastShot = { time: 0, power: 0 };
        this.body = body;
        this.master = body.source;
        this.label = "";
        this.identifier = "";
        this.controllers = [];
        this.children = [];
        this.bulletchildren = [];
        // Stored Variables
        this.globalStore = {}
        this.store = {}
        // ----------------
        this.control = {
            target: new Vector(0, 0),
            goal: new Vector(0, 0),
            main: false,
            alt: false,
            fire: false
        };
        this.color = new Color({
            BASE: "grey",
            HUE_SHIFT: 0,
            SATURATION_SHIFT: 1,
            BRIGHTNESS_SHIFT: 0,
            ALLOW_BRIGHTNESS_INVERT: false
        });
        this.alpha = 1;
        this.strokeWidth = 1;
        this.canShoot = false;
        this.wasPressed = false;
        this.emitFireEvent = false;
        this.borderless = false;
        this.drawFill = true;
        this.drawAbove = false;
        if (info.PROPERTIES != null) {
            this.onShoot = info.PROPERTIES.ON_SHOOT == null ? null : info.PROPERTIES.ON_SHOOT;
            this.autofire = info.PROPERTIES.AUTOFIRE == null ? false : info.PROPERTIES.AUTOFIRE;
            this.altFire = info.PROPERTIES.ALT_FIRE == null ? false : info.PROPERTIES.ALT_FIRE;
            this.fixedReload = info.PROPERTIES.FIXED_RELOAD == null ? false : info.PROPERTIES.FIXED_RELOAD;
            this.calculator = info.PROPERTIES.STAT_CALCULATOR == null ? "default" : info.PROPERTIES.STAT_CALCULATOR;
            this.waitToCycle = info.PROPERTIES.WAIT_TO_CYCLE == null ? false : info.PROPERTIES.WAIT_TO_CYCLE;
            this.delaySpawn = info.PROPERTIES.DELAY_SPAWN ?? this.waitToCycle;
            this.bulletStats = (info.PROPERTIES.BULLET_STATS == null || info.PROPERTIES.BULLET_STATS == "master") ? "master" : new Skill(info.PROPERTIES.BULLET_STATS);
            this.settings = info.PROPERTIES.SHOOT_SETTINGS == null ? [] : JSON.parse(JSON.stringify(info.PROPERTIES.SHOOT_SETTINGS));
            this.countsOwnKids = info.PROPERTIES.MAX_CHILDREN == null ? false : info.PROPERTIES.MAX_CHILDREN;
            this.maxBullets = (info.PROPERTIES.MAX_BULLETS == null) ? false : info.PROPERTIES.MAX_BULLETS;
            this.syncsSkills = info.PROPERTIES.SYNCS_SKILLS == null ? false : info.PROPERTIES.SYNCS_SKILLS;
            this.negRecoil = info.PROPERTIES.NEGATIVE_RECOIL == null ? false : info.PROPERTIES.NEGATIVE_RECOIL;
            this.independentChildren = info.PROPERTIES.INDEPENDENT_CHILDREN == null ? false : info.PROPERTIES.INDEPENDENT_CHILDREN;
            this.independentMaster = info.PROPERTIES.INDEPENDENT_MASTER == null ? false : info.PROPERTIES.INDEPENDENT_MASTER;
            this.borderless = info.PROPERTIES.BORDERLESS == null ? false : info.PROPERTIES.BORDERLESS;
            this.drawFill = info.PROPERTIES.DRAW_FILL == null ? true : info.PROPERTIES.drawFill;
            this.spawnOffset = info.PROPERTIES.SPAWN_OFFSET == null ? Config.bullet_spawn_offset : info.PROPERTIES.SPAWN_OFFSET;
            this.destroyOldestChild = info.PROPERTIES.DESTROY_OLDEST_CHILD == null ? false : info.PROPERTIES.DESTROY_OLDEST_CHILD;
            this.shootOnDeath = (info.PROPERTIES.SHOOT_ON_DEATH == null) ? false : info.PROPERTIES.SHOOT_ON_DEATH;
            if (info.PROPERTIES.COLOR != null) {
                this.color.interpret(info.PROPERTIES.COLOR);
            }
            this.noentitylimit = (info.PROPERTIES.NO_LIMITATIONS == null) ? false : info.PROPERTIES.NO_LIMITATIONS;
            if (info.PROPERTIES.ALPHA != null) this.alpha = info.PROPERTIES.ALPHA;
            if (info.PROPERTIES.STROKE_WIDTH != null) this.strokeWidth = info.PROPERTIES.STROKE_WIDTH;
            if (info.PROPERTIES.BORDERLESS != null) this.borderless = info.PROPERTIES.BORDERLESS;
            if (info.PROPERTIES.DRAW_FILL != null) this.drawFill = info.PROPERTIES.DRAW_FILL;
            this.drawAbove = (info.PROPERTIES.DRAW_ABOVE == null) ? false : info.PROPERTIES.DRAW_ABOVE;
            this.stack = (info.PROPERTIES.STACK_GUN == null) ? true : info.PROPERTIES.STACK_GUN;
            this.identifier = info.PROPERTIES.IDENTIFIER ?? null;
            if (info.PROPERTIES.TYPE != null && !Config.disable_guns) {
                this.canShoot = true;
                this.label = info.PROPERTIES.LABEL ?? "";
                this.setBulletType(info.PROPERTIES.TYPE);
            }
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
                LAYER: position[7]
            }
        } else {
            position = {
                LENGTH: position.LENGTH ?? 18,
                WIDTH: position.WIDTH ?? 8,
                ASPECT: position.ASPECT ?? 1,
                X: position.X ?? 0,
                Y: position.Y ?? 0,
                ANGLE: position.ANGLE ?? 0,
                DELAY: position.DELAY ?? 0,
                LAYER: position.LAYER ?? 0
            }
        };
        this.length = position.LENGTH / 10;
        this.width = position.WIDTH / 10;
        this.aspect = position.ASPECT;
        let _off = new Vector(position.X, position.Y);
        this.angle = (position.ANGLE * Math.PI) / 180;
        this.direction = _off.direction;
        this.offset = _off.length / 10;
        this.maxCycleTimer = !this.delaySpawn - position.DELAY;
        this.layer = position.LAYER ?? 0; // Prevent undefined
        this.position = 0;
        this.motion = 0;
        if (this.canShoot) {
            this.cycleTimer = this.maxCycleTimer;
            this.trueRecoil = this.settings.recoil;
            this.recoilDir = 0;
        }
    }
    
    recoil() {
        if (this.motion || this.position) {
            // Simulate recoil
            this.motion -= (0.25 * this.position) / global.gameManager.roomSpeed;
            this.position += this.motion;
            if (this.position < 0) {
                // Bouncing off the back
                this.position = 0;
                this.motion = -this.motion;
            }
            if (this.motion > 0) {
                this.motion *= 0.75;
            }
        }
        if (this.canShoot && !this.body.settings.hasNoRecoil) {
            // Apply recoil to motion
            if (this.motion > 0 || this.body.settings.hasNoReloadDelay) {
                let recoilForce = (-this.position * this.trueRecoil * this.body.recoilMultiplier * 1.08 / this.body.size) / global.gameManager.roomSpeed;
                this.body.accel.x += recoilForce * Math.cos(this.recoilDir);
                this.body.accel.y += recoilForce * Math.sin(this.recoilDir);
            }
        }
    }

    setBulletType(type, clearChildren = false) {
    // Pre-flatten bullet types to save on doing the same define() sequence a million times
        this.bulletType = Array.isArray(type) ? type : [type];
        // Preset BODY because not all definitions have BODY defined when flattened
        let flattenedType = {BODY: {}};
        for (let type of this.bulletType) {
            type = ensureIsClass(type);
            util.flattenDefinition(flattenedType, type);
        }
        for (let e of this.bulletType) {
            let Tonk = ensureIsClass(e);
            if (Tonk.TURRETS || Tonk.ON) this.noentitylimit = true;
        }
        this.bulletType = flattenedType;
        // Set final label to bullet
        if (!this.independentChildren) {
            this.bulletType.LABEL = this.master.label + (this.label ? " " + this.label : "") + " " + this.bulletType.LABEL;
        }
        // Save a copy of the bullet definition for body stat defining
        this.bulletBodyStats = JSON.parse(JSON.stringify(this.bulletType.BODY));
        this.interpret();

        if (!clearChildren) return;
        for (let child of this.children) {
            child.kill();
        }
    }

    getSkillRaw() { 
        if (this.bulletStats === "master") {
            return [
                this.body.skill.raw[0],
                this.body.skill.raw[1],
                this.body.skill.raw[2],
                this.body.skill.raw[3],
                this.body.skill.raw[4],
                0, 0, 0, 0, 0 
            ];
        } 
        return this.bulletStats.raw;
    }

    getLastShot() {
        return this.lastShot;
    }

    shoot() {
    // Find gun's current angle position and length
        let angle1 = this.direction + this.angle + this.body.facing,
            angle2 = this.angle + this.body.facing,
            gunlength = this.length + this.spawnOffset * this.width * this.settings.size / 2,

            //calculate offsets based on lengths and directions
            offset_base_x = this.offset * Math.cos(angle1),
            offset_base_y = this.offset * Math.sin(angle1),
            offset_end_x = gunlength * Math.cos(angle2),
            offset_end_y = gunlength * Math.sin(angle2),

            //finally get the final bullet offset
            offsetFinalX = offset_base_x + offset_end_x,
            offsetFinalY = offset_base_y + offset_end_y,
            skill = this.bulletStats === "master" ? this.body.skill : this.bulletStats;
        
        this.fire(offsetFinalX, offsetFinalY, skill);
    }
    live() {
        this.recoil();

        if (!this.canShoot) return

        // Find the proper skillset for shooting
        let sk = this.bulletStats === "master" ? this.body.skill : this.bulletStats;

        // Decides what to do based on child-counting settings
        let shootPermission = this.checkShootPermission();

        // Dont shoot when invuln/not active
        if (this.body.master.invuln || !this.body.master.activation.check()) {
            shootPermission = false;
        }
        if (this.body.master.maxBullets !== undefined && this.body.master.maxBullets < (this.body.master.bulletchildren.length + 1)) {
            shootPermission = false;
        }
        // Cycle up if we should
        if (shootPermission || !this.waitToCycle) {
            let speed = this.fixedReload ? global.gameManager.roomSpeed : global.gameManager.runSpeed;
            if (this.cycleTimer < 1) {
                this.cycleTimer += 1 / (this.settings.reload * speed * (this.calculator == "necro" || this.calculator == "fixed reload" ? 1 : sk.rld));
            }
        }
        // Only fire ON events once per input
        let currentlyPressed = this.altFire ? this.body.control.alt : this.body.control.fire;
        if (currentlyPressed && !this.wasPressed) {
            this.emitFireEvent = true;
        } else {
            this.emitFireEvent = false;
        }
        this.wasPressed = currentlyPressed;
        // Firing routines
        if (this.autofire || currentlyPressed) {
            if (this.body.settings.hasNoReloadDelay && shootPermission) {
                return (
                    this.shoot(),
                    this.cycleTimer = this.maxCycleTimer
                ) 
            }
            while (shootPermission && this.cycleTimer >= 1) {
                this.shoot();
                this.cycleTimer--;

                // Repeatedly check for shoot permission to prevent ultra low reload guns from exceeding the child limit in 1 tick
                shootPermission = this.checkShootPermission();
            }
            // If we're not shooting, only cycle up to where we'll have the proper firing delay
        } else if (this.cycleTimer > this.maxCycleTimer) {
            this.cycleTimer = this.maxCycleTimer;
        }
    }
    checkShootPermission() {
        let skill = this.bulletStats === "master" ? this.body.skill : this.bulletStats;
        let necroReload = this.calculator === "necro" ? skill.rld : 1;
        let shootPermission = true;

        if (this.countsOwnKids) {
            shootPermission = this.countsOwnKids + this.destroyOldestChild > this.children.length * necroReload;
        } else if (this.body.maxChildren) {
            shootPermission = this.body.maxChildren > this.body.children.length * necroReload;
        };

        if (this.destroyOldestChild && !shootPermission) {
            shootPermission = true;
            this.destroyOldest();
        };

        return shootPermission;
    };
    destroyOldest() {
        let oldestChild,
            oldestTime = Infinity;
        for (let i = 0; i < this.children.length; i++) {
            let child = this.children[i];
            if (child && child.creationTime < oldestTime) {
                oldestTime = child.creationTime;
                oldestChild = child;
            }
        }
        if (oldestChild) oldestChild.kill();
    }
    syncChildren() {
        if (this.syncsSkills) {
            let self = this;
            [...this.children, ...this.bulletchildren].forEach(function(o) {
                o.define({
                    BODY: self.interpret(), 
                    SKILL: self.getSkillRaw()
                });
                o.refreshBodyAttributes();
            });
        }
    }
    fire(gx, gy, sk) {
    // Recoil
        sk = this.bulletStats === "master" ? this.body.skill : this.bulletStats;
        this.lastShot.time = util.time();
        this.lastShot.power = 3 * Math.log(Math.sqrt(sk.spd) + this.trueRecoil + 1) + 1;
        this.motion += this.lastShot.power;
        // Find inaccuracy
        let shudder = 0,
            spread = 0;
        if (this.settings.shudder) {
            do {
                shudder = ran.gauss(0, Math.sqrt(this.settings.shudder));
            } while (Math.abs(shudder) >= this.settings.shudder * 2);
        }
        if (this.settings.spray) {
            do {
                spread = ran.gauss(0, this.settings.spray * this.settings.shudder);
            } while (Math.abs(spread) >= this.settings.spray / 2);
        }
        spread *= Math.PI / 180;
        // Find speed
        let vecLength = (this.negRecoil ? -1 : 1) * this.settings.speed * global.gameManager.runSpeed * sk.spd * (1 + shudder),
            vecAngle = this.angle + this.body.facing + spread,
            s = new Vector(
                vecLength * Math.cos(vecAngle),
                vecLength * Math.sin(vecAngle)
            );
        // Boost it if we should
        if (this.body.velocity.length) {
            let extraBoost = Math.max(0, s.x * this.body.velocity.x + s.y * this.body.velocity.y) /  this.body.velocity.length / s.length;
            if (extraBoost) {
                let len = s.length;
                s.x += (this.body.velocity.length * extraBoost * s.x) / len;
                s.y += (this.body.velocity.length * extraBoost * s.y) / len;
            }
        }
    
        //create an independent entity
        let spawnOffset = {
            x: this.body.x + this.body.size * gx - s.x,
            y: this.body.y + this.body.size * gy - s.y
        }
        if (this.independentMaster) {
            var o = new Entity(spawnOffset);
            o.color.base = undefined;
            this.bulletInitIndependent(o);
            o.parentID = this.body.id;
            o.color.base = o.color.base ?? this.body.master.color.base;
            o.SIZE = (this.body.size * this.width * this.settings.size) / 2;
            o.velocity = s;
            o.facing = o.velocity.direction;
            o.refreshBodyAttributes();
            o.life();
            this.onShootFunction();
            this.recoilDir = this.body.facing + this.angle;
            if (this.emitFireEvent) {
                this.emitFireEvent = false;
                this.master.emit(this.altFire ? "altFire" : "fire", {
                    gun: this,
                    store: this.store,
                    globalStore: this.globalStore,
                    child: o
                });
            }
            return;
        }
        if (this.independentChildren) {
            var o;
            switch (this.noentitylimit) {
                case true:
                    o = new Entity(spawnOffset);
                    break;
                default:
                    o = new bulletEntity(spawnOffset);
                    break;
            }
            this.bulletInitIndependent(o);
            if (this.emitFireEvent) {
                this.emitFireEvent = false;
                this.master.emit(this.altFire ? "altFire" : "fire", {
                    gun: this,
                    store: this.store,
                    globalStore: this.globalStore,
                    child: o,
                    body: this.master
                });
            }
            return;
        }
    
        // Create the bullet
        var o;
        switch (this.noentitylimit) {
            case true:
                o = new Entity(spawnOffset, this.master.master);
                break;
            default:
                o = new bulletEntity(spawnOffset, this.master.master);
                break;
        }
        o.velocity = s;
        this.bulletInit(o);
        o.coreSize = o.SIZE;
        if (this.emitFireEvent) {
            this.emitFireEvent = false;
            this.master.emit(this.altFire ? "altFire" : "fire", {
                body: this.master,
                gun: this,
                child: o,
                masterStore: this.master.store,
                globalMasterStore: this.master.globalStore,
                gunStore: this.store,
                globalGunStore: this.globalStore
            });
        }
        if (this.body.master.settings.shakeProperties && this.master.socket) {
            this.body.master.settings.shakeProperties.forEach(info => {
                if (info.applyOn.shoot) {
                    this.master.socket.talk("SH", JSON.stringify(info));
                }
            }) 
        }
    }
    bulletInitIndependent(o) {
        o.define(this.bulletType);
        o.define({
            BODY: this.interpret(),
            SKILL: this.getSkillRaw()
        }, false);

        // Keep track of it for child counting
        if (this.countsOwnKids) {
            o.parent = this;
            this.children.push(o);
        } else if (this.body.maxChildren) {
            o.parent = this.body;
            this.body.children.push(o);
            this.children.push(o);
        }
        o.coreSize = o.SIZE;
        o.team = this.master.team;
    }
    bulletInit(o) {
    // Define it by its natural properties
        o.color.base = undefined;
        o.color.hueShift = undefined;
        o.color.saturationShift = undefined;
        o.color.brightnessShift = undefined;
        o.color.allowBrightnessInvert = undefined;
        o.define(this.bulletType);
        // Pass the gun attributes
        o.define({
            BODY: this.interpret(),
            SKILL: this.getSkillRaw()
        }, false);
        o.color.base = o.color.base ?? this.body.master.color.base;
        o.color.hueShift = o.color.hueShift ?? this.body.master.color.hueShift;
        o.color.saturationShift = o.color.saturationShift ?? this.body.master.color.saturationShift;
        o.color.brightnessShift = o.color.brightnessShift ?? this.body.master.color.brightnessShift;
        o.color.allowBrightnessInvert = o.color.allowBrightnessInvert ?? this.body.master.color.allowBrightnessInvert;
        o.SIZE = (this.body.size * this.width * this.settings.size) / 2;
        // Keep track of it and give it the function it needs to deutil.log itself upon death
        if (this.countsOwnKids) {
            o.parent = this;
            this.children.push(o);
        } else if (this.body.maxChildren) {
            o.parent = this.body;
            this.body.children.push(o);
            this.children.push(o);
        } else {
            o.bulletparent = this.body;
            this.body.bulletchildren.push(o);
            this.bulletchildren.push(o);
        };
        o.source = this.body;
        o.facing = o.velocity.direction;
        // Set all necroType gun references to parent gun
        for (let shape of o.settings.necroTypes) {
            o.settings.necroDefineGuns[shape] = this;
        }
        o.refreshBodyAttributes();
        o.life();
        this.onShootFunction();
        this.recoilDir = this.body.facing + this.angle;
    }
    onShootHitscan() {
        if (this.body.master.health.amount < 0) return;
        let save = {
            x: this.body.master.x,
            y: this.body.master.y,
            angle: this.body.master.facing + this.angle
        };
        let s = this.body.size * this.width * this.settings2.size;
        let target = {
            x: save.x + this.body.master.control.target.x,
            y: save.y + this.body.master.control.target.y
        };
        let amount = (util.getDistance(target, save) / s) | 0;
        let gun = this;
        let explode = (e) => {
            e.on("dead", () => {
                let o = new Entity(e, gun.body);
                o.accel = {
                    x: 3 * Math.cos(save.angle),
                    y: 3 * Math.sin(save.angle)
                };
                o.color = gun.body.master.master.color;
                o.define(Class.hitScanExplosion);
                // Pass the gun attributes
                o.define({
                    BODY: gun.interpret(gun.settings3),
                    SKILL: gun.getSkillRaw(),
                    SIZE: (gun.body.size * gun.width * gun.settings3.size) / 2,
                    LABEL: gun.master.label + (gun.label ? " " + gun.label + " " : " ") + o.label
                });
                o.refreshBodyAttributes();
                o.life();
                o.source = gun.body;
            });
        };
        let branchAlt = 0;
        let branchLength = 0;
        let branch = (e, a, b = false, g = 0, z = amount) => {
            if (!b) branchAlt++;
            let total = (z / 5) | 0 || 2;
            let dir = (a ? Math.PI / 2 : -Math.PI / 2) + g;
            for (let i = 0; i < total; i++) {
                setTimeout(() => {
                    let ss = s * 1.5;
                    let x = e.x + ss * Math.cos(save.angle + dir) * i;
                    let y = e.y + ss * Math.sin(save.angle + dir) * i;
                    let o = new Entity(
                        {
                            x,
                            y
                        },
                        this.body
                    );
                    o.facing = Math.atan2(target.y - y, target.x - x) + dir;
                    o.color = this.body.master.master.color;
                    o.define(Class.hitScanBullet);
                    // Pass the gun attributes
                    o.define({
                        BODY: this.interpret(this.settings3),
                        SKILL: this.getSkillRaw(),
                        SIZE: (this.body.size * this.width * this.settings2.size) / 2,
                        LABEL:
                            this.master.label +
                            (this.label ? " " + this.label : "") +
                            " " +
                            o.label
                    });
                    o.refreshBodyAttributes();
                    o.life();
                    o.source = this.body;
                    if (i === total - 1) {
                        if (branchLength < 3) {
                            branchLength++;
                            branch(o, a, true, dir + g, total);
                        } else branchLength = 0;
                    }
                }, (500 / amount) * i); 
            }
        };
        const hitScanLevel = +this.onShoot.split("hitScan").pop();
        for (let i = 0; i < amount; i++) {
            setTimeout(() => {
                if (this.body.master.health.amount < 0) return;
                let x = save.x + s * Math.cos(save.angle) * i;
                let y = save.y + s * Math.sin(save.angle) * i;
                let e = new Entity({ x: x, y: y }, this.body);
                e.facing = Math.atan2(target.y - y, target.x - x);
                e.color = this.body.master.master.color;
                e.define(Class.hitScanBullet);
                // Pass the gun attributes
                e.define({
                    BODY: this.interpret(this.settings2),
                    SKILL: this.getSkillRaw(),
                    SIZE: (this.body.size * this.width * this.settings2.size) / 2,
                    LABEL:
                        this.master.label +
                        (this.label ? " " + this.label : "") +
                        " " +
                        e.label
                });
                e.refreshBodyAttributes();
                e.life();
                e.source = this.body;
                switch (hitScanLevel) {
                    case 1:
                        if (i % 5 === 0) branch(e, branchAlt % 2 === 0);
                        break;
                    case 2:// Superlaser
                        if (i === amount - 1) explode(e);
                        break;
                    case 3:// Death Star
                        if (i % 3 === 0) explode(e);
                        break;
                }
            }, 10 * i);
        }
    }
    onShootFunction() {
        switch (this.onShoot) {
            case "hitScan":
            case "hitScan1":
            case "hitScan2":
            case "hitScan3":
                onShootHitscan();
                break;
        }
    }
    getTracking() {
        return {
            speed: global.gameManager.runSpeed * ((this.bulletStats == "master") ? this.body.skill.spd : this.bulletStats.spd) * 
                this.settings.maxSpeed * 
                this.bulletBodyStats.SPEED,
            range:  Math.sqrt((this.bulletStats == "master") ? this.body.skill.spd : this.bulletStats.spd) * 
                this.settings.range * 
                this.bulletBodyStats.RANGE
        };
    }

    getPhotoInfo() {
        if (!this.photoInfo) this.photoInfo = {};
        let p = this.photoInfo;
        p.time = this.lastShot.time;
        p.power = this.lastShot.power;
        p.color = this.color.compiled;
        p.alpha = this.alpha;
        p.strokeWidth = this.strokeWidth;
        p.borderless = this.borderless;
        p.drawFill = this.drawFill;
        p.drawAbove = this.drawAbove;
        p.length = this.length;
        p.width = this.width;
        p.aspect = this.aspect;
        p.angle = this.angle;
        p.direction = this.direction;
        p.offset = this.offset;
        p.layer = this.layer;
        return p;
    }

    interpret() {
    // Skip if unable to shoot or if we shouldn't care about body stats
        if (!this.canShoot) return;

        let sizeFactor = this.master.size / this.master.SIZE;
        let shoot = this.settings;
        let sk = (this.bulletStats == "master") ? this.body.skill : this.bulletStats;
        // Defaults
        let out = {
            SPEED: shoot.maxSpeed * sk.spd,
            HEALTH: shoot.health * sk.str,
            RESIST: shoot.resist + sk.rst,
            DAMAGE: shoot.damage * sk.dam,
            PENETRATION: Math.max(1, shoot.pen * sk.pen),
            RANGE: shoot.range / Math.sqrt(sk.spd),
            DENSITY: (shoot.density * sk.pen * sk.pen) / sizeFactor,
            PUSHABILITY: 1 / sk.pen,
            HETERO: 3 - 2.8 * sk.ghost
        };
        this.reloadRateFactor = sk.rld;
        // Special cases
        switch (this.calculator) {
            case "thruster":
                this.trueRecoil = shoot.recoil * Math.sqrt(sk.rld * sk.spd);
                break;
            case "sustained":
                out.RANGE = shoot.range;
                break;
            case "sustained+lowspeed": // A very special case
                out.RANGE = shoot.range;
                out.SPEED = shoot.maxSpeed + sk.spd;
                break;
            case "swarm":
                out.PENETRATION = Math.max(1, shoot.pen * (0.5 * (sk.pen - 1) + 1));
                out.HEALTH /= shoot.pen * sk.pen;
                break;
            case "trap":
            case "block":
                out.PUSHABILITY = 1 / Math.pow(sk.pen, 0.5);
                out.RANGE = shoot.range;
                break;
            case "fixedReload":
                this.reloadRateFactor = 1;
                break;
            case "necro":
                this.childrenLimitFactor = sk.rld;
                this.reloadRateFactor = 1;
                break;
            case "drone":
                out.PUSHABILITY = 1;
                out.PENETRATION = Math.max(1, shoot.pen * (0.5 * (sk.pen - 1) + 1));
                out.HEALTH = (shoot.health * sk.str + sizeFactor) / Math.pow(sk.pen, 0.8);
                out.DAMAGE = shoot.damage * sk.dam * Math.sqrt(sizeFactor) * Math.sqrt(shoot.pen * sk.pen);
                break;
        }
        if (this.independentChildren) return;
        // Go through and make sure we respect its natural properties
        for (let property in out) {
            if (this.bulletBodyStats[property] == null) {
                continue; 
            }
            out[property] *= this.bulletBodyStats[property];
        }
        return out;
    }
}

module.exports = { Gun }