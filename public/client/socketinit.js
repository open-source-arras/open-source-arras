import { global } from "./global.js";
import { util } from "./util.js";
import { config } from "./config.js";
import { protocol } from "./protocol.js";
window.fakeLagMS = 0;
var sync = [];
var clockDiff = 0;
var serverStart = 0;
let levelscore = 0;
let deduction = 0;
let level = 1;
let kills = [0, 0, 0];
let sscore = util.AdvancedSmoothBar(0, 2);
let getNow = () => {
    return Date.now() - clockDiff - serverStart;
},
startSettings = {
    allowtostartgame: true,
    neededtoresync: false,
},
gui = {
    getStatNames: data => {
        return [
            data?.body_damage ?? 'Body Damage',
            data?.max_health ?? 'Max Health',
            data?.bullet_speed ?? 'Bullet Speed',
            data?.bullet_health ?? 'Bullet Health',
            data?.bullet_pen ?? 'Bullet Penetration',
            data?.bullet_damage ?? 'Bullet Damage',
            data?.reload ?? 'Reload',
            data?.move_speed ?? 'Movement Speed',
            data?.shield_regen ?? 'Shield Regeneration',
            data?.shield_cap ?? 'Shield Capacity',
        ]
    },
    skills: [
        { amount: 0, color: 'purple', cap: 1, softcap: 1 },
        { amount: 0, color: 'pink'  , cap: 1, softcap: 1 },
        { amount: 0, color: 'blue'  , cap: 1, softcap: 1 },
        { amount: 0, color: 'lgreen', cap: 1, softcap: 1 },
        { amount: 0, color: 'red'   , cap: 1, softcap: 1 },
        { amount: 0, color: 'yellow', cap: 1, softcap: 1 },
        { amount: 0, color: 'green' , cap: 1, softcap: 1 },
        { amount: 0, color: 'teal'  , cap: 1, softcap: 1 },
        { amount: 0, color: 'gold'  , cap: 1, softcap: 1 },
        { amount: 0, color: 'orange', cap: 1, softcap: 1 }
    ],
    points: 0,
    upgrades: [],
    playerid: -1,
    __s: {
        setScore: d => {
            d ? (sscore.set(d), deduction > sscore.get() && (deduction = level = 0)) : (levelscore = 3, deduction = level = 0, sscore = util.AdvancedSmoothBar(0, 2))
        },
        setKills: (solo, assists, bosses) => {
            kills = [solo, assists, bosses];
        },
        update: () => {
            levelscore = Math.ceil(Math.pow(level, 3) * 0.3083);
            levelscore = levelscore - deduction;
            if (sscore.get() >= deduction + levelscore) deduction += levelscore, level++;
            else if (sscore.get() < deduction) {
                var d = level - 1;
                deduction = Math.ceil(Math.pow(level, 3) * 0.3083);
                deduction -= levelscore - deduction * d;
                level--
            }
        },
        getProgress: () => levelscore ? Math.min(1, Math.max(0, (sscore.get() - deduction) / levelscore)) : 0,
        getScore: () => sscore.get(),
        getLevel: () => level,
        getKills: () => kills
    },
    type: 0,
    root: "",
    class: "",
    visibleEntities: false,
    dailyTank: {tank: null, ads: false},
    fps: 0,
    color: 0,
    accel: 0,
    topspeed: 1,
};
let xx = 0,
    yy = 0,
    _vx = 0,
    _vy = 0;
var moveCompensation = {
    reset: () => {
        xx = 0;
        yy = 0;
    },
    get: () => {
        if (config.lag.unresponsive) {
            return {
                x: 0,
                y: 0,
            };
        }
        return {
            x: xx,
            y: yy,
        };
    },
    iterate: (g) => {
        if (global.died || global.gameStart) return 0;
        // Add motion
        let damp = gui.accel / gui.topSpeed,
            len = Math.sqrt(g.x * g.x + g.y * g.y);
        _vx += gui.accel * g.x / len;
        _vy += gui.accel * g.y / len;
        // Dampen motion
        let motion = Math.sqrt(_vx * _vx + _vy * _vy);
        if (motion > 0 && damp) {
            let finalvelocity = motion / (damp / config.roomSpeed + 1);
            _vx = finalvelocity * _vx / motion;
            _vy = finalvelocity * _vy / motion;
        }
        xx += _vx;
        yy += _vy;
    },
};
const Integrate = class {
    constructor(dataLength) {
        this.dataLength = dataLength;
        this.elements = {};
    }
    reset() {
        this.elements = {};
    }
    update(delta, index = 0) {
        let deletedLength = delta[index++]
        for (let i = 0; i < deletedLength; i++) delete this.elements[delta[index++]]
        let updatedLength = delta[index++]
        for (let i = 0; i < updatedLength; i++) {
            let id = delta[index++]
            let data = delta.slice(index, index + this.dataLength)
            index += this.dataLength
            this.elements[id] = data
        }
        return index
    }
    entries() {
        return Object.entries(this.elements).map(([id, data]) => ({
            id: +id,
            data
        }))
    }
}
const Minimap = class {
    constructor(speed = 250) {
        this.speed = speed
        this.map = {};
        this.lastUpdate = Date.now();
    }
    update(elements) {
        this.lastUpdate = Date.now()
        for (let [key, value] of Object.entries(this.map))
            if (value.now) {
                value.old = value.now
                value.now = null
            } else {
                delete this.map[key]
            }
        for (let element of elements)
            if (this.map[element.id]) {
                this.map[element.id].now = element
            } else {
                this.map[element.id] = {
                    old: null,
                    now: element
                }
            }
    }
    get() {
        let state = Math.min(1, (Date.now() - this.lastUpdate) / this.speed)
        let stateOld = 1 - state
        return Object.values(this.map).map(({ old, now }) => {
            if (!now) return {
                type: old.type,
                id: old.id,
                x: old.x,
                y: old.y,
                color: old.color,
                size: old.size,
                alpha: stateOld,
                width: old.width,
                height: old.height
            }
            if (!old) return {
                type: now.type,
                id: now.id,
                x: now.x,
                y: now.y,
                color: now.color,
                size: now.size,
                alpha: state,
                width: now.width,
                height: now.height
            }
            return {
                type: now.type,
                id: now.id,
                x: state * now.x + stateOld * old.x,
                y: state * now.y + stateOld * old.y,
                color: now.color,
                size: state * now.size + stateOld * old.size,
                alpha: 1,
                width: state * now.width + stateOld * old.width,
                height: state * now.height + stateOld * old.height
            }
        })
    }
}
// Build the leaderboard object
const Entry = class {
    constructor(to) {
        this.score = util.Smoothbar(0, 10, 3, .03);
        this.isNew = true;
        this.update(to);
    }
    update(to) {
        this.name = to.name;
        this.bar = to.bar;
        if (typeof to.bar === "string" && to.bar.includes(", ")) this.bar = +to.bar.split(", ")[0];
        this.color = to.color;
        this.index = to.index;
        if (this.isNew) {
            this.isNew = false;
            this.score.force(to.score);
        } else this.score.set(to.score);
        this.old = false;
        this.nameColor = to.nameColor;
        this.id = to.id;
        this.label = to.label;
        this.renderEntity = to.renderEntity;
    }
    publish() {
        let indexes = this.index.split("-"),
            ref = global.mockups[parseInt(indexes[0])];
            if (!ref) ref = global.missingno[0];

        return {
            id: this.id,
            color: this.color,
            image: util.requestEntityImage(this.index, this.color),
            position: ref.position,
            barColor: this.bar,
            label: this.name ? this.name + " - " + this.label : this.label,
            score: this.score.get(),
            nameColor: this.nameColor,
            renderEntity: this.renderEntity,
        };
    }
};
const Leaderboard = class {
    constructor() {
        this.entries = {};
    }
    get() {
        let out = [];
        let max = 1;
        for (let value of Object.values(this.entries)) {
            let data = value.publish();
            out.push(data);
            if (data.score > max) max = data.score;
        }
        out.sort((a, b) => b.score - a.score);
        return {
            data: out,
            max
        };
    }
    update(elements) {
        elements.sort((a, b) => b.score - a.score);
        for (let value of Object.values(this.entries)) value.old = true;
        for (let element of elements)
            if (this.entries[element.id]) this.entries[element.id].update(element);
            else this.entries[element.id] = new Entry(element);
        for (let [id, value] of Object.entries(this.entries))
            if (value.old) delete this.entries[id];
    }
};
let minimapAllInt = new Integrate(5),
    minimapTeamInt = new Integrate(3),
    leaderboardInt = new Integrate(8),
    leaderboard = new Leaderboard(),
    minimap = new Minimap(200);
let lags = [];
var lag = {
    get: () => lags.length ? lags.reduce((a, b) => a + b) / lags.length : 0,
    add: l => {
        lags.push(l);
        if (lags.length > config.lag.memory) {
            lags.splice(0, 1);
        }
    }
};
// Inital setup stuff
window.WebSocket = window.WebSocket || window.MozWebSocket;
// Make a data crawler
let crawlIndex = 0,
    crawlData = [];
const get = {
    next: () => {
        if (crawlIndex >= crawlData.length) {
            console.log(crawlData);
            throw new Error('Trying to crawl past the end of the provided data!');
        } else {
            return crawlData[crawlIndex++];
        }
    },
    set: (data) => {
        crawlData = data;
        crawlIndex = 0;
    },
    all: () => crawlData.slice(crawlIndex),
    take: amount => {
        crawlIndex += amount;
        if (crawlIndex > crawlData.length) {
            console.error(crawlData);
            throw new Error("Trying to crawl past the end of the provided data!");
        }
    }
};
function physics(g) {
    g.isUpdated = true;
    if (g.motion || g.position) {
        const targetFrameTime = 33.33;
        const actualFrameTime = global.metrics.rendergap || targetFrameTime;
        const dt = actualFrameTime / targetFrameTime;
        const baseDecay = 0.2;
        g.motion -= (baseDecay * g.position) * dt;
        g.position += g.motion * dt;
        if (g.position < 0) {
            g.position = 0;
            g.motion = -g.motion;
        }
        if (g.motion > 0) {
            g.motion *= Math.pow(0.5, dt);
        }
    }
}
// Some status manager constructors
const GunContainer = n => {
    let a = [];
    for (let i = 0; i < n; i++) {
        a.push({
            motion: 0,
            position: 0,
            isUpdated: true,
            configLoaded: false,
            color: "",
            borderless: false,
            drawFill: true,
            drawAbove: false,
            length: 0,
            width: 0,
            aspect: 0,
            angle: 0,
            direction: 0,
            offset: 0,
            layer: 0,
        });
    }
    return {
        getPositions: () => a.map(g => {
            return g.position;
        }),
        getConfig: () => a.map(g => {
            return {
                color: g.color,
                borderless: g.borderless,
                alpha: g.alpha,
                strokeWidth: g.strokeWidth,
                drawFill: g.drawFill,
                drawAbove: g.drawAbove,
                length: g.length,
                width: g.width,
                aspect: g.aspect,
                angle: g.angle,
                direction: g.direction,
                offset: g.offset,
            };
        }),
        setConfig: (ind, c) => {
            let g = a[ind];
            if (!g.configLoaded) {
                g.configLoaded = true;
                g.color = c.color;
                g.borderless = c.borderless;
                g.alpha = c.alpha;
                g.strokeWidth = c.strokeWidth;
                g.drawFill = c.drawFill;
                g.drawAbove = c.drawAbove;
                g.length = c.length;
                g.width = c.width;
                g.aspect = c.aspect;
                g.angle = c.angle;
                g.direction = c.direction;
                g.offset = c.offset;
                g.layer = c.layer;

                // Sort the gun layers by changing the array itself
                a.sort((a, b) => a.layer - b.layer);
            }
        },
        update: () => {
            for (let instance of a) {
                physics(instance);
            }
        },
        fire: (i, power) => {
            if (a[i].isUpdated) a[i].motion += Math.sqrt(power) / 20;
            a[i].isUpdated = false;
        },
        length: a.length,
    };
};
function Status() {
    let statState = 'normal',
        statTime = getNow();
    return {
        set: val => {
            if (val !== statState || statState === 'injured') {
                if (statState !== 'dying') statTime = getNow();
                statState = val;
            }
        },
        getState: () => statState,
        getFade: () => {
            return (statState === 'dying' || statState === 'killed') ? 1 - Math.min(1, (getNow() - statTime) / 300) : 1;
        },
        getColor: () => {
            return '#FFFFFF';
        },
        getBlend: () => {
            let o = (statState === 'normal' || statState === 'dying') ? 0 : 1 - Math.min(1, (getNow() - statTime) / 80);
            if (getNow() - statTime > 500 && statState === 'injured') {
                statState = 'normal';
            }
            return o;
        }
    };
}
// Make a converter
const process = (z = {}) => {
    let isNew = z.facing == null; // For whatever reason arguments.length is uglified poorly...
    // Figure out what kind of data we're looking at
    let type = get.next();
    // Handle it appropiately
    if (type & 0x01) { // issa turret
        z.facing = get.next();
        z.layer = get.next();
        z.index = get.next();
        z.color = get.next();
        z.size = get.next();
        z.realSize = get.next();
        z.sizeFactor = get.next();
        z.angle = get.next();
        z.direction = get.next();
        z.offset = get.next();
        z.mirrorMasterAngle = get.next();
    } else { // issa something real
        z.interval = global.metrics.rendergap;
        z.id = get.next();
        // Determine if this is an new entity or if we already know about it
        let i = global.entities.findIndex(x => x.id === z.id);
        if (i !== -1) {
            // remove it if needed (this way we'll only be left with the dead/unused entities)
            z = global.entities.splice(i, 1)[0];
        }
        // Change the use of the variable
        isNew = i === -1;
        // If it's not new, save the memory data
        if (!isNew) {
            z.render.lastx = z.x;
            z.render.lasty = z.y;
            z.render.lastvx = z.vx;
            z.render.lastvy = z.vy;
            z.render.lastf = z.facing;
            z.render.lastRender = global.player.time;
        }
        // Either way, keep pulling information
        // For limited entities only by only pulling their limited information.
        if (type & 0x10) {
            z.index = get.next();
            z.x = get.next();
            z.y = get.next();
            z.vx = get.next();
            z.vy = get.next();
            z.size = get.next();
            let oldFacing = z.facing;
            z.facing = get.next();
            z.vfacing = isNew ? z.facing : z.facing - oldFacing;
            z.vfacing = get.next();
            z.layer = get.next();
            z.color = get.next();
        } else { // Else pull all information.
            z.index = get.next();
            z.x = get.next();
            z.y = get.next();
            z.vx = get.next();
            z.vy = get.next();
            z.size = get.next();
            let oldFacing = z.facing;
            z.facing = get.next();
            z.vfacing = isNew ? z.facing : z.facing - oldFacing;
            z.vfacing = get.next();
            z.twiggle = get.next();
            z.layer = get.next();
            z.color = get.next();
            z.borderless = get.next();
            z.drawFill = get.next();
        }
        let invuln = type & 0x10 ? 0 : get.next();
        z.invuln = invuln ? z.invuln || Date.now() : 0;
        // Update health, flagging as injured if needed
        if (isNew) {
            z.health = get.next() / 65535;
            z.shield = get.next() / 65535;
        } else {
            let hh = z.health,
                ss = z.shield;
            z.health = get.next() / 65535;
            z.shield = get.next() / 65535;
            // Update stuff
            if (z.health < hh || z.shield < ss) {
                z.render.status.set('injured');
            } else if (z.render.status.getFade() !== 1) {
                // If it turns out that we thought it was dead and it wasn't
                z.render.status.set('normal');
            }
        }
        z.alpha = get.next() / 255;
        z.drawsHealth = !!(type & 0x02); // force to boolean
        // Nameplates
        if (type & 0x04) { // has a nameplate
            z.name = get.next();
            z.score = get.next();
        }
        z.nameplate = type & 0x04;
        // If it's new, give it rendering information
        if (isNew) {
            z.render = {
                draws: true,
                expandsWithDeath: z.drawsHealth,
                lastRender: global.player.time,
                x: z.x,
                y: z.y,
                lastx: z.x - global.metrics.rendergap * config.roomSpeed * (1000 / 40) * z.vx,
                lasty: z.y - global.metrics.rendergap * config.roomSpeed * (1000 / 40) * z.vy,
                lastvx: z.vx,
                lastvy: z.vy,
                lastf: z.facing,
                f: z.facing,
                h: z.health,
                s: z.shield,
                interval: global.metrics.rendergap,
                slip: 0,
                status: Status(),
                size: new util.animBar(),
                health: util.AdvancedSmoothBar(z.health, 0.06, 1),
                shield: util.AdvancedSmoothBar(z.shield, 0.06, 1),
                xAnim: new util.animBar(),
                yAnim: new util.animBar(),
                faceAnim: new util.animBar(true),
            };
        }
        if (invuln) {
            z.render.status.set('invuln');
        } else if (z.render.status.getState() === 'invuln') {
            z.render.status.set('normal');
        }
        // Update the rendering healthbars and size
        z.render.health.set(z.health);
        z.render.shield.set(z.shield);
        z.render.size.add(z.size);
        z.render.xAnim.add(z.x);
        z.render.yAnim.add(z.y);
        z.render.faceAnim.add(z.facing);
        // Figure out if the class changed (and if so, refresh the guns and turrets)
        if (!isNew && z.oldIndex !== z.index) isNew = true;
        z.oldIndex = z.index;
    }
    // If it needs to have a gun container made, make one
    let gunnumb = get.next();
    if (isNew) {
        z.guns = GunContainer(gunnumb);
    } else if (gunnumb !== z.guns.length) {
        throw new Error('Mismatch between data gun number and remembered gun number!');
    }
    // Decide if guns need to be fired one by one
    for (let i = 0; i < gunnumb; i++) {
        let time = get.next(),
            power = get.next(),
            color = get.next(),
            alpha = get.next(),
            strokeWidth = get.next(),
            borderless = get.next(),
            drawFill = get.next(),
            drawAbove = get.next(),
            length = get.next(),
            width = get.next(),
            aspect = get.next(),
            angle = get.next(),
            direction = get.next(),
            offset = get.next(),
            layer = get.next();
        z.guns.setConfig(i, {color, alpha, strokeWidth, borderless, drawFill, drawAbove, length, width, aspect, angle, direction, offset, layer}); // Load gun config into container
        if (time > global.player.lastUpdate - global.metrics.rendergap) z.guns.fire(i, power); // Shoot it
    }
    // Update turrets
    let turnumb = get.next();
    if (isNew || z.turrets.length !== turnumb) {
        z.turrets = [];
        for (let i = 0; i < turnumb; i++) {
            z.turrets.push(process());
        }
    } else {
        if (z.turrets.length !== turnumb) {
            throw new Error('Mismatch between data turret number and remembered turret number!');
        }
        for (let tur of z.turrets) {
            tur = process(tur);
        }
    }
    // Return our monsterous creation
    return z;
};
// This is what we use to figure out what the hell the server is telling us to look at
const convert = {
    begin: data => get.set(data),
    // Make a data convertor
    data: () => {
        // Set up the output thingy+
        let output = [];
        // Get the number of entities and work through them
        for (let i = 0, len = get.next(); i < len; i++) {
            output.push(process());
        }
        // Handle the dead/leftover entities
        for (let e of global.entities) {
            // Kill them
            e.render.status.set(e.health === 1 ? 'dying' : 'killed');
            // And only push them if they're not entirely dead and still visible
            if (e.render.status.getFade() !== 0 && util.isInView(e.render.x - global.player.renderx, e.render.y - global.player.rendery, e.size, true)) {
                output.push(e);
            } else {
                if (global.chats[e.id]) {
                    for (let o of global.chats[e.id]) {
                        util.remove(global.chats[e.id], global.chats[e.id].indexOf(o)); // Remove it properly
                    };
                    delete global.chats[e.id]; // Now we can delete it entirely
                };
                if (e.render.textobjs != null) {
                    for (let o of e.render.textobjs) {
                        o.remove();
                    }
                }
            }
        }
        // Save the new entities list
        global.entities = output;
        global.entities.sort((a, b) => {
            let sort = a.layer - b.layer;
            if (!sort) sort = b.id - a.id;
            if (!sort) throw new Error('tha fuq is up now');
            return sort;
        });
    },
    // Define our gui convertor
    gui: () => {
        let index = get.next(),
            // Translate the encoded index
            indices = {
                dailyTank: index & 0x1000,
                visibleName: index & 0x0800,
                class: index & 0x0400,
                root: index & 0x0200,
                topspeed: index & 0x0100,
                accel: index & 0x0080,
                skills: index & 0x0040,
                statsdata: index & 0x0020,
                upgrades: index & 0x0010,
                points: index & 0x0008,
                score: index & 0x0004,
                label: index & 0x0002,
                fps: index & 0x0001,
            };
        // Operate only on the values provided
        if (indices.fps) {
            gui.fps = get.next();
        }
        if (indices.label) {
            gui.type = get.next();
            gui.color = get.next();
            gui.playerid = get.next();
        }
        if (indices.score) {
            let score = JSON.parse(get.next());
            gui.__s.setScore(score[0]);
            gui.__s.setKills(score[1], score[2], score[3]);
        }
        if (indices.points) {
            gui.points = get.next();
        }
        if (indices.upgrades) {
            gui.upgrades = [];
            for (let i = 0, len = get.next(); i < len; i++) {
                gui.upgrades.push(get.next().split("_"));
                gui.upgrades[i][2] = util.requestEntityImage(gui.upgrades[i][2], gui.color);
            }
        }
        if (indices.statsdata) {
            for (let i = 9; i >= 0; i--) {
                gui.skills[i].name = get.next();
                gui.skills[i].cap = get.next();
                gui.skills[i].softcap = get.next();
            }
        }
        if (indices.skills) {
            let skk = get.next();
            gui.skills[0].amount = parseInt(skk.slice( 0,  2), 16);
            gui.skills[1].amount = parseInt(skk.slice( 2,  4), 16);
            gui.skills[2].amount = parseInt(skk.slice( 4,  6), 16);
            gui.skills[3].amount = parseInt(skk.slice( 6,  8), 16);
            gui.skills[4].amount = parseInt(skk.slice( 8, 10), 16);
            gui.skills[5].amount = parseInt(skk.slice(10, 12), 16);
            gui.skills[6].amount = parseInt(skk.slice(12, 14), 16);
            gui.skills[7].amount = parseInt(skk.slice(14, 16), 16);
            gui.skills[8].amount = parseInt(skk.slice(16, 18), 16);
            gui.skills[9].amount = parseInt(skk.slice(18, 20), 16);
        }
        if (indices.accel) {
            gui.accel = get.next();
        }
        if (indices.topspeed) {
            gui.topspeed = get.next();
        }
        if (indices.root) {
            gui.root = get.next();
        }
        if (indices.class) {
            gui.class = get.next();
        }
        if (indices.visibleName) {
            gui.visibleEntities = get.next();
        }
        if (indices.dailyTank) {
            let dailyTank = JSON.parse(get.next());
            if (!dailyTank[0]) gui.dailyTank = {tank: null, ads: false};
            else {
                gui.dailyTank.tank = dailyTank[0];
                gui.dailyTank.ads = dailyTank[1];
            }
        }
    },
    broadcast: () => {
        let all = get.all();
        let by = minimapAllInt.update(all);
        by = minimapTeamInt.update(all, by);
        by = leaderboardInt.update(all, by);
        get.take(by);
        let map = [];
        for (let {
            id,
            data
        } of minimapAllInt.entries()) {
            map.push({
                id,
                type: data[0],
                x: (data[1] * global.gameWidth) / 255,
                y: (data[2] * global.gameHeight) / 255,
                color: data[3],
                size: data[4]
            });
        }
        for (let {
            id,
            data
        } of minimapTeamInt.entries()) {
            map.push({
                id,
                type: 0,
                x: (data[0] * global.gameWidth) / 255,
                y: (data[1] * global.gameHeight) / 255,
                color: data[2],
                size: 0
            });
        }
        minimap.update(map);
        let entries = [];
        for (let {
            id,
            data
        } of leaderboardInt.entries()) {
            entries.push({
                id,
                score: data[0],
                index: data[1],
                name: data[2],
                color: data[3],
                bar: data[4],
                nameColor: data[5],
                label: data[6],
                renderEntity: data[7],
            })
        }
        leaderboard.update(entries);
    }
};

const protocols = {
    "http:": "ws://",
    "https:": "wss://"
};
let incoming = async function(message, socket) {
    await new Promise(Resolve => setTimeout(Resolve, window.fakeLagMS));
    // Make sure it looks legit.
    global.bandwidth.currentFa += message.data.byteLength;
    let m = protocol.decode(message.data);
    if (m === -1) {
        throw new Error('Malformed packet.');
    }
    // Decide how to interpret it
    switch (m.shift()) {
        case 'W': {
            if (m[0]) {
                global.message = '';
                socket.talk('k', global.playerKey);
                // define a pinging function
                socket.ping = (payload) => {
                    socket.talk('p', payload);
                };
                socket.commandCycle = setInterval(() => {
                    if (socket.cmd.check()) socket.cmd.talk();
                });
            }
        }; break;


            case 'w': { // welcome to the game
                if (m[0]) { // Ask to get the room data first
                    socket.talk('s', "", 1, 0, false, 0);
                }
            }; break;
            case 'R': { // room setup
                global.gameWidth = m[0];
                global.gameHeight = m[1];
                global.player.roomAnim.x.add(m[0]);
                global.player.roomAnim.y.add(m[1]);
                global.roomSetup = JSON.parse(m[2]);
                serverStart = JSON.parse(m[3]);
                global.serverStart = serverStart;
                config.roomSpeed = m[4];
                let blackoutData = JSON.parse(m[5]);
                global.advanced.blackout.active = blackoutData.active;
                global.advanced.blackout.color = blackoutData.color;
                global.advanced.roundArena = m[6];
                // Start syncing
                socket.talk('S', getNow());
            } break;
            case "r": {
                global.gameWidth = m[0];
                global.gameHeight = m[1];
                global.player.roomAnim.x.add(m[0]);
                global.player.roomAnim.y.add(m[1]);
                global.roomSetup = JSON.parse(m[2]);
            } break;
            case "temporaryban": {
                global.message = "You have been temporarily banned from the game. You will be able to rejoin after a server restart.";
            } break;
            case "permanentban": {
                global.message = "You have been banned from the game.";
            } break;
            case "svInfo": {
                // For debugging.
                global.serverStats.serverGamemodeName = m[0];
                global.serverStats.mspt = m[1];
                if (global.showDebug) console.log(`mspt: ${global.serverStats.mspt} total entities on screen: ${global.entities.length} Player X: ${(global.player.renderx).toFixed(1)} Player Y: ${(global.player.rendery).toFixed(1)}`);
            } break;
            case "gSvInfo": {
                global.serverStats.players = m[1];
            } break;
            case 'c': { // force camera move
                global.player.renderx = global.player.cx.x = m[0];
                global.player.rendery = global.player.cy.y = m[1];
                global.player.renderv = global.player.view = m[2];
                global.player.animX.add(m[0]);
                global.player.animY.add(m[1]);
            } break;
            case 'S': { // clock syncing
                let clientTime = m[0],
                    serverTime = m[1],
                    laten = (getNow() - clientTime) / 2,
                    delta = getNow() - laten - serverTime;
                // Add the datapoint to the syncing data
                sync.push({
                    delta: delta,
                    latency: laten,
                });
                // Do it again a couple times
                if (sync.length < 10) {
                    // Erase entities if resync is needed.
                    if (startSettings.neededtoresync) global.entities = [];
                    // Wait a bit just to space things out
                    setTimeout(() => socket.talk('S', getNow()), 10);
                } else {
                    // Calculate the clock error
                    sync.sort((e, f) => e.latency - f.latency);
                    let median = sync[Math.floor(sync.length / 2)].latency;
                    let sd = 0,
                        sum = 0,
                        valid = 0;
                    for (let e of sync) {
                        sd += Math.pow(e.latency - median, 2);
                    }
                    sd = Math.sqrt(sd / sync.length);
                    for (let e of sync) {
                        if (Math.abs(e.latency - median) < sd) {
                            sum += e.delta;
                            valid++;
                        }
                    }
                    clockDiff = Math.round(sum / valid);
                    if (startSettings.neededtoresync) {
                        startSettings.neededtoresync = false;
                        startSettings.allowtostartgame = true;
                        global.pullSkillBar = false;
                        global.pullUpgradeMenu = false;
                        socket.talk("NWB"); // Ask for new broadcast.
                    }
                    global.metrics.rendertimes = 1;
                    util.pullTotalPlayers();
                    global.gameUpdate = true;
                    // Now we can ask for spawn.
                    socket.talk('s', global.playerName, 0, 1 * config.game.autoLevelUp, global.bodyID ? global.bodyID : false, 1 * config.game.incognitoMode);
                    global.bodyID = undefined;
                }
            } break;
        case 'm': { // message
            global.createMessage(m[1], m[0]);
        } break;
        case "Em": {
            global.createMessage(m[1], m[0], true);
        } break;
        case 'RE': {
            global.mockups = [];
            global.entities = [];
        } break;
        case 'CC': {
            global.cached = {};
        } break;
        case 'M': {
            if (!m[1]) return;
            global.mockups[m[0]] = JSON.parse(m[1]);
        } break;
        case 'u': { // uplink
            // Pull the camera info
            if (m[0] == true) { // Update camera only if we want to.
                let camx = m[1],
                    camy = m[2];
                global.player.cx.x = camx;
                global.player.cy.y = camy;
                global.player.loc = { x: camx, y: camy };
                global.player.animX.add(m[1]);
                global.player.animY.add(m[2]);
                return;
            }
            let camtime = m[0],
                camx = m[1],
                camy = m[2],
                camfov = m[3],
                camvx = m[4],
                camvy = m[5],
                camscoping = m[6],
                // We'll have to do protocol decoding on the remaining data
                theshit = m.slice(7);
                // More stuff
                let defaultFov = 2000;
            if (!global.gameStart && startSettings.allowtostartgame) {
                // Start the game
                global.gameStart = true;
                global.gameConnecting = false;
            };
            // Process the data
            if (camtime > global.player.lastUpdate) { // Don't accept out-of-date information.
                if (startSettings.neededtoresync) return; // Do not update anything when the client is out of sync.
                // Time shenanigans
                lag.add(getNow() - camtime);
                global.player.time = camtime + lag.get();
                global.metrics.rendergap = camtime - global.player.lastUpdate;
                if (global.metrics.rendergap <= 0) {
                    console.log('yo some bullshit is up wtf');
                }
                global.player.lastUpdate = camtime;
                // Convert the gui and entities
                convert.begin(theshit);
                convert.gui();
                convert.data();
                // Save old physics values
                global.player.lastx = global.player.cx.x;
                global.player.lasty = global.player.cy.y;
                global.player.lastvx = global.player.vx;
                global.player.lastvy = global.player.vy;
                global.player.cx.x = camx;
                global.player.cy.y = camy;
                global.player.loc = { x: camx, y: camy };
                global.player.vx = global.died ? 0 : camvx;
                global.player.vy = global.died ? 0 : camvy;
                // For centered camera
                global.player.isScoping = camscoping;
                moveCompensation.reset();
                // Animation stuff
                global.player.animX.add(m[1]);
                global.player.animY.add(m[2]);
                // Fov stuff
                global.player.view = camfov;
                global.player.animv.add(global.player.view);
                if (isNaN(global.player.renderv) || global.player.renderv === 0) {
                    global.player.renderv = defaultFov;
                }
                // Metrics
                global.metrics.lastlag = global.metrics.lag;
                global.metrics.lastuplink = getNow();
            } else {
                console.log("Old data! Last given time: " + global.player.time + "; offered packet timestamp: " + camtime + ".");
            }
            // Send the downlink and the target
            socket.talk('d', Math.max(global.player.lastUpdate, camtime));
            socket.cmd.talk();
            global.updateTimes++; // metrics
        } break;
        case "b": {
            if (startSettings.neededtoresync) return;
            convert.begin(m);
            convert.broadcast();
        } break;
        case 'p': { // ping
            setTimeout(() => {
                try {
                    global.socket.ping(Date.now() - clockDiff - serverStart);
                } catch (e) { };
            }, 50);
            16 <= global.metrics.latency.length && global.metrics.latency.shift();
            let c = Date.now() - clockDiff - serverStart - m[0];
            0 < c && global.metrics.latency.push(c);
        } break;
        case 'F': { // to pay respects
            global.deathAnimation = util.AdvancedSmoothBar(0, 4, 1);
            global.deathAnimation.set(4);
            global.finalScore = util.AdvancedSmoothBar(0, 1.5);
            global.finalScore.set(m[0]);
            global.finalLifetime = util.AdvancedSmoothBar(0, 3);
            global.finalLifetime.set(m[1]);
            global.finalKills = [util.AdvancedSmoothBar(0, 4), util.AdvancedSmoothBar(0, 5.5), util.AdvancedSmoothBar(0, 2.5), util.AdvancedSmoothBar(0, 6)];
            global.respawnTimeout = m[2];
            if (global.respawnTimeout > 0) {
                global.cannotRespawn = true;
                setTimeout(() => {
                    let respawnTimeoutloop = setInterval(() => {
                        if (global.respawnTimeout <= 1) {
                            global.cannotRespawn = false;
                            global.respawnTimeout = false;
                            clearInterval(respawnTimeoutloop);
                        } else {
                            global.respawnTimeout--;
                        }
                    }, 1000); // One second.
                }, 3000)
            }
            global.finalKills[0].set(m[3]);
            global.finalKills[1].set(m[4]);
            global.finalKills[2].set(m[5]);
            global.finalKills[3].set(m[6]);
            global.finalKillers = [];
            for (let i = 0; i < m[7]; i++) {
                global.finalKillers.push(m[8 + i]);
            }
            global.canvas.reverseDirection = false;
            global.died = true;
            global.autoSpin = false;
            global.syncingWithTank = false;
            global.clickables.mobileButtons.active = false;
        } break;
        case 'I': { // sync with the tank
            if (m[0]) {
                global.syncingWithTank = true;
            } else {
                global.syncingWithTank = false;
            }
        } break;
        case 'DTA': {
            let data = JSON.parse(m[0]);
            if (data.waitTime == "isVideo") {
                let renderDoc = document.createElement("video");
                renderDoc.onloadeddata = function() {
                    renderDoc.muted = false;
                    renderDoc.volume = 1;
                    global.dailyTankAd.isVideo = true;
                    global.dailyTankAd.render = renderDoc;
                    global.dailyTankAd.orginWidth = global.dailyTankAd.width;
                    global.dailyTankAd.orginHeight = global.dailyTankAd.height;
                    if (!data.normalAdSize) {
                        global.dailyTankAd.width = this.videoWidth;
                        global.dailyTankAd.height = this.videoHeight;
                    }
                    socket.talk("DTAST", renderDoc.duration);
                };
                renderDoc.onerror = () => {
                    global.dailyTankAd.renderUI = false;
                    global.createMessage("Failed to load the ad!");
                }
                renderDoc.src = `./img/ads/${data.src}`;
            } else {
                let renderDoc = new Image();
                renderDoc.onload = () => {
                    global.dailyTankAd.render = renderDoc;
                    global.dailyTankAd.orginWidth = global.dailyTankAd.width;
                    global.dailyTankAd.orginHeight = global.dailyTankAd.height;
                    if (!data.normalAdSize) {
                        global.dailyTankAd.width = renderDoc.width;
                        global.dailyTankAd.height = renderDoc.height;
                    }
                    global.dailyTankAd.readyToRender = true;
                    setTimeout(() => {
                        global.dailyTankAd.closeable = true;
                    }, `${data.waitTime}000`);
                }
                renderDoc.onerror = () => {
                    global.dailyTankAd.renderUI = false;
                    global.createMessage("Failed to load the ad!");
                }
                renderDoc.src = `./img/ads/${data.src}`;
            }
            global.dailyTankAd.renderUI = true;
        } break;
        case 'DTAD': {
            if (global.dailyTankAd.requestInterval) clearInterval(global.dailyTankAd.requestInterval)
            global.dailyTankAd.exit();
        } break;
        case 'DTAST': {
            global.dailyTankAd.render.onended = () => {
                global.dailyTankAd.requestInterval = setInterval(() => {
                    socket.talk("DTAD");
                }, 2000)
                socket.talk("DTAD");
            }
            global.dailyTankAd.render.play();
            global.dailyTankAd.readyToRender = true;
        } break;
        case 'SH': {
            let data = JSON.parse(m[0]);
            if (data.type == "camera") { // If the server wants to shake our camera...
                let set = config.graphical.shakeProperties.CameraShake; // Quick define
                if (data.push) {
                    set.shakeDuration += data.duration; // add duration
                    set.shakeAmount += data.amount; // Add amount the shake
                    setTimeout(() => {
                        set.shakeDuration -= data.duration;
                        set.shakeAmount -= data.amount;
                    }, 500);
                } else {
                    set.shakeDuration = data.duration; // Duration
                    set.shakeAmount = data.amount; // Amount the shake
                }
                set.keepShake = data.keepShake; // Keep the shake so it never ends
                // Now trigger it!
                set.shakeStartTime = Date.now();
            }
            if (data.type == "gui") { // If the server wants to shake our GUI...
                let set = config.graphical.shakeProperties.UIShake; // Quick define
                if (data.push) {
                    set.shakeDuration += data.duration; // add duration
                    set.shakeAmount += data.amount; // Add amount the shake
                    setTimeout(() => {
                        set.shakeDuration -= data.duration;
                        set.shakeAmount -= data.amount;
                    }, 500);
                } else {
                    set.shakeDuration = data.duration; // Duration
                    set.shakeAmount = data.amount; // Amount the shake
                }
                set.keepShake = data.keepShake; // Keep the shake so it never ends
                // Now trigger it!
                set.shakeStartTime = Date.now();
            }
        } break;
        case "t": {
            // Close the socket
            socket.onclose = () => { };
            socket.close();
            global.dailyTankAd.exit();
            socket.open = false;
            clearInterval(socket.commandCycle);
            global.gameStart = false;

            // Reset the player
            global.player = global.initPlayer();

            // Setup
            global.gameLoading = true;
            global.serverAdd = m[0];
            global.bodyID = m[1];
            if (global.serverMap[global.serverAdd]) global.serverMap[global.serverAdd].onclick();

            // Update the location hash
            let server = global.servers.find(s => s.ip === m[0]);
            if (server) location.hash = "#" + server.id;
            global.locationHash = location.hash;

            // Reconnect server
            global.reconnect();
        } break;
        case 'T': {
            global.generateTankTree = true;
            global.renderTankTree = true;
        } break;

        case 'K': { // kicked
            // Put your code while being kicked from the server.
        } break;
        case 'z': { // name color
            global.nameColor = m[0];
        } break;
        case 'RM': { // Reset minimap teams if needed
            minimapTeamInt.reset();
            minimapAllInt.elements = {};
        } break;
        case 'RL': { // Reset leaderboard if needed
            leaderboardInt.reset();
        } break;
        case 'message': {
            global.message = m[0];
        } break;
        case 'AS': { // Activating smooth camera if needed.
            config.graphical.smoothcamera2 = config.graphical.smoothcamera;
            config.graphical.smoothcamera = true;
        } break;
        case 'DS': { // Deactivate smooth camera if needed.
            if (!config.graphical.smoothcamera2) config.graphical.smoothcamera = false;
            delete config.graphical.smoothcamera2;
        } break;
        case 'CHAT_MESSAGE_ENTITY': {
            if (!global.chats) global.chats = {};
            for (let data of JSON.parse(m[0])) {
                if (!global.chats[data.id]) global.chats[data.id] = [];
                for (let e of data.messages) {
                    const alreadyExists = global.chats[data.id].find(msg => msg.id === e.id);
                    if (!alreadyExists) {
                        let alpha = util.AdvancedSmoothBar(0, 0.3, 1.5);
                        global.chats[data.id].push({
                            text: e.text,
                            id: e.id,
                            alpha: alpha
                        })
                        alpha.set(1);
                    }
                }
                for (let i = 0; i < global.chats[data.id].length; i++) {
                    let e = global.chats[data.id][i];
                    const existing = data.messages.find(o => o.id === e.id);
                    if (!existing && !e.erased) {
                        e.erased = true;
                        e.alpha.set(0);
                    };
                }
            }
        } break;
    };
}
const socketInit = () => {
    window.resizeEvent();
    let socket = new WebSocket(protocols[location.protocol] + global.serverAdd);
    // Set up our socket
    socket.binaryType = 'arraybuffer';
    socket.open = false;
    // Handle commands
    let flag = false;
    let commands = [
        false, // up
        false, // down
        false, // left
        false, // right
        false, // lmb
        false, // mmb
        false, // rmb
        false,
    ];
    socket.cmd = {
        set: (index, value) => {
            if (commands[index] !== value) {
                commands[index] = value;
                flag = true;
            }
        },
        talk: () => {
            flag = false;
            let o = 0;
            for (let i = 0; i < 8; i++) {
                if (commands[i]) o += Math.pow(2, i);
            }
            let ratio = util.getRatio();
            socket.talk('C', Math.round(global.target.x / ratio), Math.round(global.target.y / ratio), global.reverseTank, o);
        },
        check: () => flag,
        getMotion: () => ({
            x: commands[3] - commands[2],
            y: commands[1] - commands[0],
        }),
        reactNow: () => {
            flag = true;
            return flag;
        }
    };
    // Learn how to talk
    socket.talk = async (...message) => {
        await new Promise(Resolve => setTimeout(Resolve, window.fakeLagMS));
        // Make sure the socket is open before we do anything
        if (!socket.open) return 1;
        message = protocol.encode(message)
        socket.send(message);
        global.bandwidth.currentHa += message.byteLength;
    };
    // Websocket functions for when stuff happens
    // This is for when the socket first opens
    socket.onopen = function socketOpen() {
        socket.open = true;
        // define a pinging function
        socket.ping = payload => socket.talk('p', payload);
    };

    // Handle incoming messages
    socket.onmessage = (msg) => incoming(msg, socket);

    // Handle closing
    socket.onclose = () => {
        if (!global.gameLoading) return;
        clearInterval(socket.commandCycle);
        clearInterval(global.socketMotionCycle);
        if (global.dailyTankAd.render) global.dailyTankAd.exit();
        socket.open = false;
        global.disconnected = true;
    };
    // Notify about errors
    socket.onerror = error => {
        clearInterval(socket.commandCycle);
        clearInterval(global.socketMotionCycle);
        global.message = 'Socket error. Maybe another server will work.';
    };
    // Gift it to the rest of the world
    return socket;
};

const resync = () => {
    let socket = global.socket;
    startSettings.neededtoresync = true;
    startSettings.allowtostartgame = false;
    sync = [];
    clockDiff = 0;
    serverStart = 0;
    minimapAllInt.elements = {};
    minimapTeamInt.elements = {};
    leaderboardInt.elements = {};
    leaderboard.entries = {};
    minimap.map = {};
    socket.talk('S', Date.now() - clockDiff - serverStart);
};

global.resetSocket = () => {
    sync = [];
    clockDiff = 0;
    serverStart = 0;
    sscore.set(0);
    gui.points = 0,
    gui.playerid = -1,
    gui.class = "";
    gui.root = "";
    minimap.map = {};
    minimapAllInt.elements = {};
    minimapTeamInt.elements = {};
    leaderboard.entries = {};
    leaderboardInt.reset();
    global.socket = [];
};

global.reconnectSocket = () => {
    sync = [];
    clockDiff = 0;
    serverStart = 0;
    sscore.set(0);
    gui.points = 0,
    gui.playerid = -1,
    gui.class = "";
    gui.root = "";
    gui.upgrades = [];
    minimap.map = {};
    minimapAllInt.elements = {};
    minimapTeamInt.elements = {};
    leaderboard.entries = {};
    leaderboardInt.reset();
    global.socket = [];
    global.socket = socketInit();
}

export { socketInit, resync, gui, leaderboard, minimap, moveCompensation, lag, getNow, clockDiff, serverStart }
