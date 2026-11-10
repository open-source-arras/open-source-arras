function init() {
    let useOldMenu = false;
    function selectedEntities(player, run) {
        for (const o of entities.values()) {
            if (
                (o !== player.body) != null &&
            util.getDistance(o, {
                x: player.target.x + player.body.x,
                y: player.target.y + player.body.y
            }) <
              o.size * 1
            ) {
                run(o);
            }
        }
    }
    function targetEntities(player, test = () => true) {
        let array = [];
        for (const o of entities.values()) {
            if (
                (o !== player.body) != null &&
            test(o) &&
            util.getDistance(o, {
                x: player.target.x + player.body.x,
                y: player.target.y + player.body.y
            }) <
              o.size * 1
            ) {
                array.push(o);
            }
        };
        return array;
    }
    function target(player) {
        return {
            x: player.body.x + player.target.x,
            y: player.body.y + player.target.y
        };
    }
    function nearest(array, location, test = () => true) {
        let lowest = Infinity, closest;
        for (const instance of array.values()) {
            let distance = (instance.x - location.x) ** 2 + (instance.y - location.y) ** 2;
            if (distance < lowest && test(instance, distance)) {
                lowest = distance;
                closest = instance;
            }
        }
        return closest;
    }
    const colorWheel = [10, 11, 12, 15, 3, 17, 6, 13, 2, 14, 4, 5, 1, 0, 7, 9, 16, 8, 18, 19];
    const menuDead = 15, menuStep = 120, menuArm = 22, wallCell = 60, shapeSizes = 5, shapeLimit = 2500;
    const rockSlice = global.wallTypes.length, rockMin = 30, rockMax = 1500;
    let lastColor = -1, lastDesign = 0, lastWallType = 0;
    Class.keyCommandDot = {
        PARENT: "genericEntity",
        LABEL: "Unknown Entity",
        TYPE: "dot",
        SIZE: 15,
        SHAPE: 0,
        COLOR: "pureWhite",
        ALPHA: 0.3,
        INTANGIBLE: true,
        NO_COLLISIONS: true,
        ACCEPTS_SCORE: false,
        CAN_BE_ON_LEADERBOARD: false,
        HEALTH_WITH_LEVEL: false,
        IS_IMMUNE_TO_TILES: true,
        IS_IMMUNE_TO_PORTALS: true,
        CAN_GO_OUTSIDE_ROOM: true,
        HITS_OWN_TYPE: "never",
        FACING_TYPE: "noFacing",
        IGNORED_BY_AI: true
    };
    function clockwise(dx, dy) {
        return ((Math.atan2(dx, -dy) * 180 / Math.PI) % 360 + 360) % 360;
    }
    function makeDot(at) {
        let o = new Entity(at);
        o.define("keyCommandDot");
        o.team = TEAM_ROOM;
        o.godmode = true;
        return o;
    }
    function everyTick(body, key, hold, step) {
        body.store[key] = hold;
        let run = () => {
            if (body.store[key] !== hold || body.isGhost) {
                if (hold.dot && !hold.dot.isGhost) hold.dot.kill();
                return;
            }
            if (step(hold) === false) return endHold(body, key);
            setSyncedTimeout(run, 0);
        };
        setSyncedTimeout(run, 0);
    }
    function endHold(body, key) {
        let hold = body.store[key];
        if (!hold) return;
        delete body.store[key];
        if (hold.dot && !hold.dot.isGhost) {
            hold.dot.godmode = false;
            hold.dot.kill();
        }
        for (let o of [hold.wall, hold.rock]) if (o && o.hiddenByMenu && !o.isGhost) o.kill();
    }
    function wearerOf(o) {
        while (o.master && o.master !== o && !o.isPlayer && !o.isBot) o = o.master;
        return o;
    }
    function isTankBody(o) {
        return o.isPlayer || o.isBot || o.type === "tank" || o.type === "miniboss";
    }
    function colorable(o) {
        return !o.bond && !o.isGhost && (isTankBody(o) || o.type === "food" || o.type === "crasher" || o.type === "wall");
    }
    function paint(o, slot) {
        let was = o.color.base;
        o.color.base = slot;
        if (o.type === "wall") o.wallColor = slot;
        if (!isTankBody(o)) return;
        o.paintedColor = true;
        for (let e of entities.values()) {
            if (e === o || e.bond || e.isGhost || e.color.base !== was) continue;
            if (wearerOf(e) === o) e.color.base = slot;
        }
    }
    function wearTeam(o, color) {
        o.paintedColor = false;
        if (o.type === "wall") o.wallColor = color;
        if (o.ownColor) o.teamWorn = color;
        else o.color.base = color;
    }
    function designOf(name) {
        let def = typeof name === "string" ? Class[name] : name;
        if (!def) return -1;
        let match = typeof name === "string" && name.match(/^laby_(\d)_(\d)_(\d)_(\d)$/);
        if (match) {
            let [t, s, k, crasher] = match.slice(1).map(Number);
            if (crasher) return s === 0 ? t + 5 * (shapeSizes - 1) + 5 * shapeSizes * k : -1;
            return s < shapeSizes - 1 ? t + 5 * s + 5 * shapeSizes * k : -1;
        }
        let polys = ["egg", "square", "triangle", "pentagon", "hexagon"], shinies = ["", "shiny", "legendary", "shadow", "rainbow", "trans"];
        for (let k = 0; k < shinies.length; k++) {
            let t = polys.findIndex(p => (k ? shinies[k] + p[0].toUpperCase() + p.slice(1) : p) === name);
            if (t >= 0) return t + 5 * shapeSizes * k;
        }
        let parents = Array.isArray(def.PARENT) ? def.PARENT : def.PARENT != null ? [def.PARENT] : [];
        for (let parent of parents) {
            let d = designOf(parent);
            if (d >= 0) return d;
        }
        return -1;
    }
    function designOfEntity(o) {
        for (let def of o.defs ?? []) {
            let d = designOf(def);
            if (d >= 0) return d;
        }
        return -1;
    }
    function classOfDesign(d) {
        let t = d % 5, s = Math.floor(d / 5) % shapeSizes, k = Math.floor(d / (5 * shapeSizes));
        let name = s === shapeSizes - 1 ? `laby_${t}_0_${k}_1` : `laby_${t}_${s}_${k}_0`;
        return Class[name] ? name : null;
    }
    function designAt(hold, at) {
        let dx = at.x - hold.x, dy = hold.y - at.y, r = Math.sqrt(dx * dx + dy * dy);
        if (r < menuDead) return hold.base;
        let ang = ((Math.atan2(dy, dx) * 180 / Math.PI) % 360 + 360) % 360;
        if (Math.abs(ang - Math.round(ang / 60) * 60) > menuArm) return hold.base;
        let arm = Math.round(ang / 60) % 6, k = Math.ceil(r / menuStep);
        let t = hold.base % 5, s = Math.floor(hold.base / 5) % shapeSizes, kind = Math.floor(hold.base / (5 * shapeSizes));
        let mod = (a, n) => ((a % n) + n) % n;
        if (arm === 0) s = mod(s + k, shapeSizes);
        else if (arm === 1) t = mod(t + k, 5);
        else if (arm === 2) kind = mod(kind - k, 6);
        else if (arm === 3) s = mod(s - k, shapeSizes);
        else if (arm === 4) t = mod(t - k, 5);
        else kind = mod(kind + k, 6);
        return t + 5 * s + 5 * shapeSizes * kind;
    }
    function reshape(o, d) {
        let name = classOfDesign(d);
        if (!name) return false;
        let was = (o.coreSize || o.SIZE) * o.sizeMultiplier, team = o.team, facing = o.facing, kept = o.controllers;
        o.controllers = [];
        o.aiSettings = {};
        o.glow = { radius: null, color: new Color(-1).compiled, alpha: 1, recursion: 1 };
        o.define("genericEntity", false);
        o.define(name);
        o.controllers = o.controllers.map(io => kept.find(old => old.constructor === io.constructor) ?? io);
        o.team = team;
        o.facing = facing;
        o.health.amount = o.health.max;
        o.shield.amount = o.shield.max;
        o.sizeMultiplier = 1;
        o.coreSize = was;
        o.sizeGlides = true;
        return true;
    }
    function wallSize(half) {
        return (half - 1.5) * Math.SQRT2 / lazyRealSizes[4];
    }
    function makeWall(at, half, type) {
        let o = new Entity(at);
        o.define((global.wallTypes[type] ?? global.wallTypes[0]).class);
        o.SIZE = wallSize(half);
        o.coreSize = o.SIZE;
        o.team = TEAM_ENEMIES;
        o.isWallSpawn = true;
        o.protect();
        o.life();
        makeHitbox(o);
        walls.push(o);
        o.on("dead", () => util.remove(walls, walls.indexOf(o)));
        return o;
    }
    function wallHalf(o) {
        return o.SIZE * lazyRealSizes[4] / Math.SQRT2 + 1.5;
    }
    function isRock(o) {
        return o.type === "wall" && o.shape !== 4;
    }
    function makeRock(at, radius) {
        let o = new Entity(at);
        o.team = TEAM_ENEMIES;
        o.facing = ran.randomAngle();
        o.define("rock");
        o.SIZE = radius;
        o.coreSize = radius;
        o.isWallSpawn = true;
        o.protect();
        o.life();
        return o;
    }
    function wallAt(at) {
        let found = null;
        for (let o of entities.values()) {
            if (o.type !== "wall" || o.isGhost || o.hiddenByMenu) continue;
            let half = o.size * lazyRealSizes[4] / Math.SQRT2;
            if (isRock(o) ? (at.x - o.x) ** 2 + (at.y - o.y) ** 2 <= o.size ** 2 : Math.abs(at.x - o.x) <= half && Math.abs(at.y - o.y) <= half) found = o;
        }
        return found;
    }
    function retypeWall(o, type) {
        let settings = global.wallTypes[type];
        if (!settings) return;
        for (let tur of o.turrets.values()) tur.destroy();
        o.turrets.clear();
        let size = o.SIZE, team = o.team;
        o.define(settings.class);
        o.SIZE = size;
        o.coreSize = size;
        o.team = team;
        if (o.wallColor != null) o.color.base = o.wallColor;
        makeHitbox(o);
    }
    function hideByMenu(o, hide) {
        o.hiddenByMenu = hide;
        o.intangibility = hide;
        o.alpha = hide ? 0 : 1;
    }
    function menuWallType(hold, type, room) {
        if (type === rockSlice) {
            if (!hold.rock) hold.rock = makeRock({ x: hold.wall.x, y: hold.wall.y }, Math.max(rockMin, wallHalf(hold.wall)));
            else hideByMenu(hold.rock, false);
            hideByMenu(hold.wall, true);
            return;
        }
        if (!hold.wall) {
            let r = hold.rock, n = Math.max(1, Math.round(r.size * 2 / wallCell)), left = -room.width / 2, top = -room.height / 2,
                cx = Math.round((r.x - left) / wallCell - n / 2), cy = Math.round((r.y - top) / wallCell - n / 2);
            hold.wall = makeWall({ x: left + (cx + n / 2) * wallCell, y: top + (cy + n / 2) * wallCell }, n * wallCell / 2, type);
        } else {
            hideByMenu(hold.wall, false);
            retypeWall(hold.wall, type);
        }
        if (hold.rock) hideByMenu(hold.rock, true);
    }
    function makeHelpList(command, showPrefix = true) {
        let name = command.name;
        let keyStr, defaultChar;
        if (command.displayKey) {
            keyStr = command.displayKey;
            defaultChar = command.displayKey;
        } else {
            keyStr = command.keys.map(keys => {
                if (!showPrefix) keys = keys.slice(-1);
                return keys.map(k => {
                    if (typeof k[0] === "number") return k[1];
                    let prefix = k[0].startsWith("-") ? "-" : "";
                    return prefix + key(prefix ? k[0].slice(1) : k[0]);
                }).join("+");
            }).join(" / ");
            defaultChar = showPrefix ? command.keys[0][0][1] : "";
        }
        let description = command.description ?? false;
        let asterisk = permissionLevelValue(command.permissionLevel) > 1 ? "*" : "";
        let text = "";
        if (name.slice(0, 1).toUpperCase() === defaultChar) text = `- [${keyStr}]${name.slice(1)}${asterisk}`;
        else text = `- [${keyStr}] ${name}${asterisk}`;
        if (description) text += ` - ${description}`;
        return text;
    }
    
    // This is your commands does things.
    let permissionLevelNames = ["player", "Arena Conductor", "Arena Supervisor", "Arena Operator", "Shiny Member", "Beta Tester", "Game Mod", "Game Admin", "Developer"];
    let commands = [
        {
            name: "Help",
            description: "Shows this command list",
            keys: [[["KEY_SPECIAL_HELP", "?"]], [["KEY_SPECIAL_HELP_ALT", "F1"]]],
            permissionLevel: 1,
            hidden: true,
            run: ({ socket }) => {
                let lines = [
                    "Help menu:",
                    ...commands
                        .filter(
                            (c) =>
                                socket.status.permissionLevel >= permissionLevelValue(c.permissionLevel) && !c.hidden && !c.attribute && !c.skill
                        )
                        .map(command => makeHelpList(command)),
                    "Warning: Avoid zooming all the way out to prevent lagging the server."
                ];
                if (useOldMenu) {
                    for (let line of lines.reverse()) {
                        socket.talk("m", 15_000, line);
                    }
                } else socket.talk("Em", 15_000, JSON.stringify(lines));
            }
        },
        {
            name: "Preset tank #1",
            keys: [[["KEY_SPECIAL_PRESET_1", "1"]]],
            permissionLevel: 1,
            run: ({ player }) => {
                player.body.define({ RESET_UPGRADES: true, BATCH_UPGRADES: false });
                player.body.define("spectator");
            }
        },
        {
            name: "Special Tank",
            description: "Defines you to your token's tank.",
            keys: [[["KEY_SPECIAL_PRESET_2", "2"]]],
            permissionLevel: 1,
            tokenClass: "banHammer",
            hidden: true,
            run: ({ socket, player }) => {
                player.body.define({ RESET_UPGRADES: true, BATCH_UPGRADES: false });
                if (socket.permissions?.class) {
                    player.body.define(socket.permissions?.class || Config.spawn_class);
                    if (!socket.status.specialTankWarned) {
                        socket.status.specialTankWarned = true;
                        player.body.sendMessage("Friendly reminder: Please do not repeatedly kill others with an overpowered tank.");
                    }
                } else {
                    player.body.define("healer");
                }
            }
        },
        {
            name: "Preset Tank #3",
            keys: [[["KEY_SPECIAL_PRESET_3", "3"]]],
            permissionLevel: 1,
            hidden: true,
            run: ({ socket, player }) => {
                if (socket.permissions?.class) {
                    player.body.define({ RESET_UPGRADES: true, BATCH_UPGRADES: false });
                    player.body.define("healer");
                }
            }
        },
        {
            name: "Basic",
            keys: [[["KEY_SPECIAL_BASIC", "Q"]]],
            permissionLevel: 1,
            run: ({ player }) => {
                player.body.define({ RESET_UPGRADES: true, BATCH_UPGRADES: false });
                player.body.define(Config.spawn_class);
            }
        },
        {
            name: "Teleport",
            keys: [[["KEY_SPECIAL_TELEPORT", "E"]]],
            permissionLevel: 1,
            run: ({ player }) => {
                player.body.x += player.target.x;
                player.body.y += player.target.y;
            }
        },
        {
            name: "Kill",
            keys: [[["KEY_SPECIAL_KILL", "K"]]],
            permissionLevel: 1,
            run: ({ socket, player }) => {
                let killed = 0;
                selectedEntities(player, (o) => {
                    if (o.bond) return;
                    o.kill();
                    killed++;
                });
                if (killed) {
                    socket.talk("m", 5_000, `You have killed ${killed} entit${killed === 1 ? "y" : "ies"}.`);
                } else {
                    socket.talk("m", 3_000, "You haven't killed any entity!");
                }
            }
        },
        {
            name: "Whirlpool",
            //description: "Picks the nearest entity at you're cursor.",
            keys: [[["KEY_SPECIAL_WHIRLPOOL", "W"]]],
            permissionLevel: 1,
            run: ({ player }) => {
                let e = player.body.store.selectedWhirlpool;
                let t = target(player);
                if (!e) e = player.body.store.selectedWhirlpool = nearest(entities, t);
                e.x = t.x;
                e.y = t.y;
            }
        },
        {
            name: "Whirlpool",
            keys: [[["-KEY_SPECIAL_WHIRLPOOL", "W"]]],
            permissionLevel: 1,
            hidden: true,
            run: ({ player }) => {
                delete player.body.store.selectedWhirlpool;
            }
        },
        {
            name: "Drag",
            keys: [[["KEY_SPECIAL_DRAG", "D"]]],
            permissionLevel: 1,
            run({ socket, player }) {
                if (!player.body.store.dragInterval) {
                    let dragged = [];
                    let tx = player.body.x + player.target.x;
                    let ty = player.body.y + player.target.y;
                    for (const e of entities.values()) {
                        if (e.bond) continue;
                        if (
                            !(e.type === "mazeWall" && e.shape === 4) &&
                            (e.x - tx) * (e.x - tx) + (e.y - ty) * (e.y - ty) <
                            e.size * e.size * 1
                        ) {
                            dragged.push({ e, dx: e.x - tx, dy: e.y - ty });
                        }
                    };
                    if (dragged.length === 0) {
                        socket.talk("m", 4_000, "No entity picked up!");
                        return;
                    }
                    let body = player.body;
                    body.store.dragInterval = setInterval(() => {
                        if (body.isGhost) {
                            clearInterval(body.store.dragInterval);
                            delete body.store.dragInterval;
                            return;
                        }
                        let tx = player.body.x + player.target.x;
                        let ty = player.body.y + player.target.y;
                        for (let { e: entity, dx, dy } of dragged) {
                            if (!entity.isGhost) {
                                entity.x = dx + tx;
                                entity.y = dy + ty;
                            } else {
                                clearInterval(body.store.dragInterval);
                                delete body.store.dragInterval;
                            } 
                        }
                    });
                }
            }
        },
        {
            name: "Drag",
            keys: [[["-KEY_SPECIAL_DRAG", "D"]]],
            hidden: true,
            permissionLevel: 1,
            run({ player }) {
                clearInterval(player.body.store.dragInterval);
                delete player.body.store.dragInterval;
            }
        },
        {
            name: "Color",
            keys: [[["KEY_SPECIAL_COLOR", "C"]]],
            permissionLevel: 1,
            run: ({ player }) => {
                if (player.body.store.colorCMD) return;
                player.body.store.colorCMD = {};
                let at = target(player);
                let o = nearest(entities, at, colorable);
                if (!o) return;
                let hold = { o, x: at.x, y: at.y, now: -1, dot: makeDot(at) };
                if (lastColor >= 0) {
                    hold.now = lastColor;
                    paint(o, lastColor);
                }
                everyTick(player.body, "colorCMD", hold, () => {
                    if (hold.o.isGhost) return false;
                    let t = target(player), dx = t.x - hold.x, dy = t.y - hold.y;
                    if (dx * dx + dy * dy < menuDead * menuDead) return;
                    let slot = colorWheel[Math.min(19, Math.floor(clockwise(dx, dy) / 18))];
                    if (slot === hold.now) return;
                    hold.now = lastColor = slot;
                    paint(hold.o, slot);
                });
            }
        },
        {
            name: "Color",
            keys: [[["-KEY_SPECIAL_COLOR", "C"]]],
            permissionLevel: 1,
            hidden: true,
            run: ({ player }) => endHold(player.body, "colorCMD")
        },
        {
            name: "Wall",
            //description: "Spawns wall at your cursor",
            keys: [[["KEY_SPECIAL_WALL", "X"]]],
            permissionLevel: 1,
            run: ({ player, gameManager }) => {
                if (player.body.store.wallCMD) return;
                player.body.store.wallCMD = {};
                let at = target(player);
                let old = wallAt(at);
                if (old) return old.kill();
                if (lastWallType === rockSlice) {
                    let hold = { rock: makeRock(at, rockMin) };
                    everyTick(player.body, "wallCMD", hold, () => {
                        if (hold.rock.isGhost || hold.rock.isDead()) return false;
                        let t = target(player), s = Math.max(rockMin, Math.min(rockMax, Math.hypot(t.x - hold.rock.x, t.y - hold.rock.y)));
                        if (s !== hold.rock.SIZE) hold.rock.SIZE = hold.rock.coreSize = s;
                    });
                    return;
                }
                let left = -gameManager.room.width / 2, top = -gameManager.room.height / 2;
                let cx = Math.floor((at.x - left) / wallCell), cy = Math.floor((at.y - top) / wallCell);
                let hold = { n: 1, wall: makeWall({ x: left + (cx + 0.5) * wallCell, y: top + (cy + 0.5) * wallCell }, wallCell / 2, lastWallType) };
                everyTick(player.body, "wallCMD", hold, () => {
                    if (hold.wall.isGhost || hold.wall.isDead()) return false;
                    let t = target(player);
                    let dx = Math.floor((t.x - left) / wallCell) - cx, dy = Math.floor((t.y - top) / wallCell) - cy;
                    if (Math.abs(dx) !== Math.abs(dy)) return;
                    let n = Math.abs(dx) + 1;
                    if (n === hold.n) return;
                    hold.n = n;
                    hold.wall.x = left + (cx + dx / 2 + 0.5) * wallCell;
                    hold.wall.y = top + (cy + dy / 2 + 0.5) * wallCell;
                    hold.wall.SIZE = hold.wall.coreSize = wallSize(n * wallCell / 2);
                    makeHitbox(hold.wall);
                });
            }
        },
        {
            name: "Type",
            keys: [[["KEY_SPECIAL_WALL_TYPE", "Z"]]],
            permissionLevel: 1,
            run: ({ socket, player, gameManager }) => {
                if (player.body.store.typeCMD) return;
                player.body.store.typeCMD = {};
                let at = target(player);
                let o = nearest(entities, at, e => !e.bond && !e.isGhost && !e.hiddenByMenu && (e.type === "food" || e.type === "crasher" || e.type === "wall"));
                if (!o) return;
                let hold = { o, x: at.x, y: at.y };
                if (o.type === "wall") {
                    hold.walls = true;
                    if (isRock(o)) {
                        hold.rock = o;
                        hold.base = hold.now = rockSlice;
                    } else {
                        hold.wall = o;
                        hold.base = hold.now = Math.max(0, (o.walltype ?? 1) - 1);
                    }
                } else {
                    hold.base = hold.now = designOfEntity(o);
                    if (hold.base < 0) {
                        socket.talk("m", 3_000, "Entity cannot be changed!");
                        return;
                    }
                }
                hold.dot = makeDot(at);
                everyTick(player.body, "typeCMD", hold, () => {
                    let shown = hold.walls ? (hold.now === rockSlice ? hold.rock : hold.wall) : hold.o;
                    if (!shown || shown.isGhost || shown.isDead()) return false;
                    let t = target(player);
                    if (hold.walls) {
                        let dx = t.x - hold.x, dy = t.y - hold.y, slices = rockSlice + 1;
                        let type = dx * dx + dy * dy < menuDead * menuDead ? hold.base : Math.min(slices - 1, Math.floor(clockwise(dx, dy) / (360 / slices)));
                        if (type === hold.now) return;
                        hold.now = lastWallType = type;
                        menuWallType(hold, type, gameManager.room);
                        return;
                    }
                    let d = designAt(hold, t);
                    if (d === hold.now) return;
                    if (reshape(hold.o, d)) hold.now = lastDesign = d;
                });
            }
        },
        {
            name: "Type",
            keys: [[["-KEY_SPECIAL_WALL_TYPE", "Z"]]],
            permissionLevel: 1,
            hidden: true,
            run: ({ player }) => endHold(player.body, "typeCMD")
        },
        {
            name: "Wall",
            keys: [[["-KEY_SPECIAL_WALL", "X"]]],
            permissionLevel: 1,
            hidden: true,
            run({ player }) {
                endHold(player.body, "wallCMD");
            }
        },
        // WIP
        {
            name: "Polygon",
            keys: [[["KEY_SPECIAL_POLYGON", "F"]]],
            permissionLevel: 1,
            run: ({ player }) => {
                let count = 0;
                for (let e of entities.values()) if (e.isFood) count++;
                if (count >= shapeLimit) return;
                let name = classOfDesign(lastDesign) ?? "egg";
                let at = target(player);
                let o = new Entity({ x: at.x + ran.randomRange(-0.5, 0.5), y: at.y + ran.randomRange(-0.5, 0.5) });
                o.define(name);
                o.facing = ran.randomAngle();
                o.team = TEAM_ENEMIES;
                o.isFood = true;
            }
        },
        {
            name: "All keys",
            keys: [[["-KEY_SPECIAL", "`"]]],
            permissionLevel: 1,
            hidden: true,
            run: ({ player }) => {
                for (let key of ["colorCMD", "typeCMD", "wallCMD"]) endHold(player.body, key);
                clearInterval(player.body.store.dragInterval);
                delete player.body.store.dragInterval;
                delete player.body.store.selectedWhirlpool;
            }
        },
        {
            name: "Vanish",
            keys: [[["KEY_SPECIAL_VANISH", "V"]]],
            permissionLevel: 1,
            run: ({ player }) => {
                if (player.body.alpha === 0) {
                    if (player.body.invisible[0] === 0) {
                        player.body.invisible = [0.08, 0.03];
                    } else {
                        player.body.invisible = [0, 0];
                        player.body.alpha = 1;
                    }
                } else if (player.body.alpha === 1) {
                    if (player.body.invisible[0] === 0) {
                        player.body.invisible = [0, 0];
                        player.body.alpha = 0;
                    } else {
                        player.body.invisible = [0, 0];
                        player.body.alpha = 1;
                    }
                } else {
                    player.body.invisible = [0, 0];
                    player.body.alpha = 1;
                }
            }
        },
        {
            name: "Invulnerable",
            keys: [[["KEY_SPECIAL_INVINCIBLE", "I"]]],
            permissionLevel: 1,
            run: ({ socket, player }) => {
                player.body.godmode = !player.body.godmode;
                socket.talk("m", 4_000, `Invulnerability ${player.body.godmode ? "enabled" : "disabled"}.`);
            }
        },
        {
            name: "Team",
            //description: "Changes team at the selected entity.",
            keys: [[["KEY_SPECIAL_TEAM", "T"]]],
            permissionLevel: 1,
            run: ({ player, socket }) => {
                let changedTeamToEntity = false;
                selectedEntities(player, (o) => {
                    if (o.bond) return;
                    let color = getTeamColor(o.team);
                    player.body.team = o.team;
                    
                    if (color < 0) player.body.color.base = color;
                    changedTeamToEntity = {
                        team: o.team
                    };
                });
                if (!changedTeamToEntity) {
                    if (player.body.team == TEAM_BLUE) {
                        player.body.team = TEAM_GREEN;
                        wearTeam(player.body, getTeamColor(TEAM_GREEN));
                    } else if (player.body.team == TEAM_GREEN) {
                        player.body.team = TEAM_RED;
                        wearTeam(player.body, getTeamColor(TEAM_RED));
                    } else if (player.body.team == TEAM_RED) {
                        player.body.team = TEAM_PURPLE;
                        wearTeam(player.body, getTeamColor(TEAM_PURPLE));
                    } else if (player.body.team == TEAM_PURPLE) {
                        player.body.team = TEAM_YELLOW;
                        wearTeam(player.body, getTeamColor(TEAM_YELLOW));
                    } else if (player.body.team == TEAM_YELLOW) {
                        player.body.team = TEAM_ORANGE;
                        wearTeam(player.body, getTeamColor(TEAM_ORANGE));
                    } else if (player.body.team == TEAM_ORANGE) {
                        player.body.team = TEAM_BROWN;
                        wearTeam(player.body, getTeamColor(TEAM_BROWN));
                    } else if (player.body.team == TEAM_BROWN) {
                        player.body.team = TEAM_CYAN;
                        wearTeam(player.body, getTeamColor(TEAM_CYAN));
                    } else {
                        player.body.team = TEAM_BLUE;
                        wearTeam(player.body, getTeamColor(TEAM_BLUE));
                    }
                }
                socket.talk("m", 5_000, `Changed to team ${changedTeamToEntity ? changedTeamToEntity.team : player.body.team}`);
            }
        },
        {
            name: "Invite to team",
            keys: [[["KEY_SPECIAL_TEAM_INVITE", "Y"]]],
            permissionLevel: 1,
            run: ({ player, socket }) => {
                selectedEntities(player, (o) => {
                    o.team = player.body.team;
                    wearTeam(o, getTeamColor(o.team));
                    socket.talk("m", 5_000, "Changed entity to team " + player.body.team);
                });
            }
        },
        {
            name: "Heal",
            keys: [[["KEY_SPECIAL_HEAL", "H"]]],
            permissionLevel: 1,
            run: ({ socket, player }) => {
                let healed = 0;
                selectedEntities(player, (o) => {
                    if (o.bond) return;
                    o.health.amount = o.health.max;
                    o.shield.amount = o.shield.max;
                    healed++;
                });
                if (healed) {
                    socket.talk("m", 5_000, `Healed ${healed} entit${healed === 1 ? "y" : "ies"}!`);
                } else {
                    player.body.health.amount = player.body.health.max;
                    player.body.shield.amount = player.body.shield.max;
                    socket.talk("m", 4_000, "You are now fully healed.");
                }
            }
        },
        {
            name: "Skill",
            keys: [[["KEY_SPECIAL_SKILL", "S"], ["KEY_SPECIAL_HELP", "/"]], [["KEY_SPECIAL_SKILL", "S"], ["KEY_SPECIAL_HELP_ALT", "F1"]]],
            displayKey: "S+?",
            permissionLevel: 1,
            run: ({ socket }) => {
                let lines = [
                    "Help menu:",
                    ...commands
                        .filter(
                            (c) =>
                                socket.status.permissionLevel >= permissionLevelValue(c.permissionLevel) && !c.hidden && c.skill
                        )
                        .map(command => makeHelpList(command, false))
                ];
                if (useOldMenu) {
                    for (let line of lines.reverse()) {
                        socket.talk("m", 15_000, line);
                    }
                } else socket.talk("Em", 15_000, JSON.stringify(lines));
            }
        },
        {
            name: "Reset skills",
            keys: [[["KEY_SPECIAL_SKILL", "S"], ["KEY_SPECIAL_SKILL_RESET", "R"]]],
            skill: true,
            permissionLevel: 1,
            run: ({ player }) => {
                player.body.skill.setCaps(Array(10).fill(9));
                player.body.skill.set(Array(10).fill(0));
                let score = player.body.skill.score;
                player.body.skill.reset();
                player.body.skill.score = score;
                while (player.body.skill.maintain()) { }
                player.body.syncTurrets();
                player.body.refreshBodyAttributes();
                
            }
        },
        {
            name: "Clear skills",
            keys: [[["KEY_SPECIAL_SKILL", "S"], ["KEY_SPECIAL_SKILL_CLEAR", "C"]]],
            skill: true,
            permissionLevel: 1,
            run: ({ player }) => {
                let refundedSkillPoints = player.body.skill.raw.reduce((total, amount) => total + amount, 0);
                player.body.skill.set(Array(10).fill(0));
                player.body.skill.points += refundedSkillPoints;
                player.body.syncTurrets();
                player.body.refreshBodyAttributes();
            }
        },
        {
            name: "Maximize skills",
            keys: [[["KEY_SPECIAL_SKILL", "S"], ["KEY_SPECIAL_SKILL_MAX", "M"]]],
            skill: true,
            permissionLevel: 1,
            run: ({ player }) => {
                player.body.skill.set(player.body.skill.caps);
                player.body.syncTurrets();
                player.body.refreshBodyAttributes();
            }
        },
        {
            name: "Remove skill point",
            keys: [[["KEY_SPECIAL_SKILL", "S"], ["KEY_SPECIAL_SKILL_REMOVE", "D"]]],
            skill: true,
            permissionLevel: 1,
            run: ({ player }) => {
                player.body.skill.points = Math.max(0, player.body.skill.points - 1);
                player.body.syncTurrets();
                player.body.refreshBodyAttributes();
            }
        },
        {
            name: "Add skill point",
            keys: [[["KEY_SPECIAL_SKILL", "S"], ["KEY_SPECIAL_SKILL_ADD", "F"]]],
            skill: true,
            permissionLevel: 1,
            run: ({ player }) => {
                let currentUsedPoints = player.body.skill.raw.reduce((total, v) => total + v, 0);
                let maxSkills = player.body.skill.caps.reduce((total, capAmount) => total + capAmount, 0);
                player.body.skill.points = Math.min(maxSkills - currentUsedPoints, player.body.skill.points + 1);
                player.body.syncTurrets();
                player.body.refreshBodyAttributes();
            }
        },
        {
            name: "Reduce skill cap",
            keys: [[["KEY_SPECIAL_SKILL", "S"], ["KEY_SPECIAL_SKILL_CAP_REMOVE", "G"]]],
            skill: true,
            permissionLevel: 1,
            run: ({ player }) => {
                let newSkillCaps = player.body.skill.caps.map((x) => Math.max(0, x - 1));
                let maxSkillPoints = newSkillCaps.reduce((total, x) => total + x, 0);
                player.body.skill.setCaps(newSkillCaps);
                maxSkillPoints -= player.body.skill.raw.reduce((total, x) => total + x, 0);
                player.body.skill.points = Math.min(player.body.skill.points, maxSkillPoints);
                player.body.syncTurrets();
                player.body.refreshBodyAttributes();
            }
        },
        {
            name: "Increase skill cap",
            keys: [[["KEY_SPECIAL_SKILL", "S"], ["KEY_SPECIAL_SKILL_CAP_ADD", "H"]]],
            skill: true,
            permissionLevel: 1,
            run: ({ player }) => {
                let skills = player.body.skill.caps.map((cap) => cap = Math.min(20, cap + 1));
                player.body.skill.setCaps(skills);
                player.body.syncTurrets();
                player.body.refreshBodyAttributes();
            }
        },
        {
            name: "Get Data",
            keys: [[["KEY_SPECIAL_DATA", "G"]]],
            permissionLevel: 1,
            run: ({ socket, player }) => {
                const t = target(player);
                const e = nearest(entities, t);
                if (e.bond) return;
                let message = [
                    `Selected ${e.name || (e.isPlayer ? "an unnamed player" : "a")}${(e.name || e.isPlayer) ? "'s" : ""} ${e.label} (ID #${e.id}).`,
                    `Score: ${e.skill.score};`,
                    `Build: ${e.skill.raw.join("/")};`
                ];
                socket.talk("Em", 20_000, JSON.stringify(message));
            }
        },
        {
            name: "Infinite level up",
            keys: [[["KEY_SPECIAL_LEVEL_UP", "N"]]],
            permissionLevel: 1,
            run: ({ player }) => {
                player.body.skill.score += player.body.skill.levelScore;
                player.body.skill.maintain();
                player.body.refreshBodyAttributes();
            }
        },
        {
            name: "Police",
            keys: [[["KEY_SPECIAL_POLICE", "P"]]],
            permissionLevel: 1,
            run: ({ player, gameManager }) => {
                player.body.define({ RESET_UPGRADES: true, BATCH_UPGRADES: false });
                player.body.define("arrasPolice");
                player.body.name = "ARRAS POLICE";
                player.body.skill.set(player.body.skill.caps);
                player.body.syncTurrets();
                player.body.refreshBodyAttributes();
                player.body.FOV = 5;
                gameManager.socketManager.broadcast("WOOP WOOP! That's the sound of da police!");
            }
        },
        {
            name: "Blast",
            keys: [[["KEY_SPECIAL_BLAST", "B"]]],
            permissionLevel: 1,
            run: ({ player }) => {
                const range = 255; // 10 ** 2 was 100, but should be radius, not squared
                const force = 45;
                let t = target(player);
                for (let entity of entities.values()) {
                    if (entity.type == "wall" || entity.bond) continue;
                    let dx = entity.x - t.x;
                    let dy = entity.y - t.y;
                    let dist = Math.sqrt(dx * dx + dy * dy);
                    if (dist < range && dist > 0) {
                        // Normalize direction and scale by force, inversely proportional to distance
                        let fx = (dx / dist) * force * (1 - dist / range);
                        let fy = (dy / dist) * force * (1 - dist / range);
                        entity.velocity.x += fx;
                        entity.velocity.y += fy;
                    }
                }
            }
        },
        {
            name: "Attribute",
            keys: [[["KEY_SPECIAL_ATTRIBUTE", "A"], ["KEY_SPECIAL_HELP", "/"]], [["KEY_SPECIAL_ATTRIBUTE", "A"], ["KEY_SPECIAL_HELP_ALT", "F1"]]],
            displayKey: "A+?",
            permissionLevel: 1,
            run: ({ socket }) => {
                let lines = [
                    "Help menu:",
                    ...commands
                        .filter(
                            (c) =>
                                socket.status.permissionLevel >= permissionLevelValue(c.permissionLevel) && !c.hidden && c.attribute
                        )
                        .map(command => makeHelpList(command, false))
                ];
                if (useOldMenu) {
                    for (let line of lines.reverse()) {
                        socket.talk("m", 15_000, line);
                    }
                } else socket.talk("Em", 15_000, JSON.stringify(lines));
            }
        },
        {
            name: "All team minimap",
            keys: [[["KEY_SPECIAL_ATTRIBUTE", "A"], ["KEY_SPECIAL_ATTRIBUTE_MINIMAP_TEAM", "T"]]],
            attribute: true,
            permissionLevel: 1,
            run: ({ socket }) => {
                socket.status.seesAllTeams = !socket.status.seesAllTeams;
                socket.status.needsNewBroadcast = true;
                socket.talk("m", 5_000, `${socket.status.seesAllTeams ? "Enabled" : "Disabled"} Attribute: all team minimap.`);
            }
        },
        {
            name: "Hidden from minimap",
            keys: [[["KEY_SPECIAL_ATTRIBUTE", "A"], ["KEY_SPECIAL_ATTRIBUTE_MINIMAP_HIDE", "M"]]],
            attribute: true,
            permissionLevel: 1,
            run: ({ socket, player }) => {
                player.body.allowedOnMinimap = !player.body.allowedOnMinimap;
                socket.talk("m", 5_000, `${!player.body.allowedOnMinimap ? "Enabled" : "Disabled"} Attribute: hidden from minimap.`);
            }
        },
        {
            name: "Shown on leaderboard",
            keys: [[["KEY_SPECIAL_ATTRIBUTE", "A"], ["KEY_SPECIAL_ATTRIBUTE_LEADERBOARD", "L"]]],
            attribute: true,
            permissionLevel: 1,
            run: ({ player, socket }) => {
                player.body.settings.leaderboardable = !player.body.settings.leaderboardable;
                socket.talk("m", 5_000, `${player.body.settings.leaderboardable ? "Enabled" : "Disabled"} Attribute: shown on leaderboard.`);
            }
        },
        {
            name: "No reload cooldown",
            keys: [[["KEY_SPECIAL_ATTRIBUTE", "A"], ["KEY_SPECIAL_ATTRIBUTE_RELOAD", "C"]]],
            attribute: true,
            permissionLevel: 1,
            run: ({ socket, player }) => {
                player.body.settings.hasNoReloadDelay = !player.body.settings.hasNoReloadDelay;
                socket.talk("m", 5_000, `${player.body.settings.hasNoReloadDelay ? "Enabled" : "Disabled"} Attribute: no reload cooldown.`);
            }
        },
        {
            name: "No recoil",
            keys: [[["KEY_SPECIAL_ATTRIBUTE", "A"], ["KEY_SPECIAL_ATTRIBUTE_RECOIL", "R"]]],
            attribute: true,
            permissionLevel: 1,
            run: ({ socket, player }) => {
                player.body.settings.hasNoRecoil = !player.body.settings.hasNoRecoil;
                socket.talk("m", 5_000, `${player.body.settings.hasNoRecoil ? "Enabled" : "Disabled"} Attribute: no recoil.`);
            }
        },
        {
            name: "No arena boundary force",
            keys: [[["KEY_SPECIAL_ATTRIBUTE", "A"], ["KEY_SPECIAL_ATTRIBUTE_ARENA_EDGE", "O"]]],
            attribute: true,
            permissionLevel: 1,
            run: ({ socket, player }) => {
                player.body.settings.canGoOutsideRoom = !player.body.settings.canGoOutsideRoom;
                socket.talk("m", 5_000, `${player.body.settings.canGoOutsideRoom ? "Enabled" : "Disabled"} Attribute: no arena boundary force.`);
            }
        },
        {
            name: "Pass through walls",
            keys: [[["KEY_SPECIAL_ATTRIBUTE", "A"], ["KEY_SPECIAL_ATTRIBUTE_WALL", "W"]]],
            attribute: true,
            permissionLevel: 1,
            run: ({ socket }) => {
                socket.player.body.ac = !socket.player.body.ac;
                socket.talk("m", 5_000, `${socket.player.body.ac ? "Enabled" : "Disabled"} Attribute: pass through walls.`);
            }
        },
        {
            name: "Accepts score",
            keys: [[["KEY_SPECIAL_ATTRIBUTE", "A"], ["KEY_SPECIAL_ATTRIBUTE_SCORE", "K"]]],
            attribute: true,
            permissionLevel: 1,
            run: ({ socket }) => {
                socket.player.body.settings.acceptsScore = !socket.player.body.settings.acceptsScore;
                socket.talk("m", 5_000, `Accepting score is now ${socket.player.body.settings.acceptsScore ? "enabled" : "disabled"}.`);
            }
        },
        {
            name: "Ban",
            keys: [[["KEY_SPECIAL_BAN", "O"]]],
            permissionLevel: 6,
            run: ({ socket, player }) => {
                const types = 2,
                    typeNames = [["permanent", "permanently"], ["temporary", "temporarily"]];
                function selectPlayer(player) {
                    let found = null;
                    for (const o of entities.values()) {
                        if (
                            o !== player.body &&
                            o.isPlayer &&
                            util.getDistance(o, {
                                x: player.target.x + player.body.x,
                                y: player.target.y + player.body.y
                            }) < o.size * 1
                        ) {
                            found = o;
                        }
                    };
                    return found;
                }
                let selected = selectPlayer(player);
                if (selected && selected.socket) {
                    if (selected.socket.status.permissionLevel >= 5) {
                        socket.talk("m", 5_000, "You cannot ban this player!");
                        return;
                    }
                    let type = player.body.store.banCommandType ?? 0;
                    let name = selected.name ? selected.name.trim() : "unnamed";
                    let typeName = typeNames[type][1];
                    socket.talk("m", 5_000, `${typeName.charAt(0).toUpperCase() + typeName.slice(1)} banned ${name}.`);
                    if (type === 1) {
                        selected.socket.ban("Banned by operator.");
                    } else {
                        selected.socket.permaban("Permanently banned by operator.");
                    }
                } else {
                    player.body.store.banCommandType = (player.body.store.banCommandType ?? -1) + 1;
                    if (player.body.store.banCommandType >= types) player.body.store.banCommandType = 0;
                    socket.talk("m", 5_000, `Switched to ${typeNames[player.body.store.banCommandType][0]} bans.`);
                }
            }
        },
        {
            name: "Zoom-out",
            keys: [[["KEY_SPECIAL_ZOOM_OUT", "-"]]],
            permissionLevel: 1,
            run: ({ player }) => {
                player.body.FOV *= 5 / 4;
            }
        },
        {
            name: "Zoom-in",
            keys: [[["KEY_SPECIAL_ZOOM_IN", "+"]]],
            permissionLevel: 1,
            run: ({ player }) => {
                player.body.FOV *= 4 / 5;
            }
        },
        {
            name: "Clear zoom",
            keys: [[["KEY_SPECIAL_ZOOM_CLEAR", "0"]]],
            permissionLevel: 1,
            run: ({ player }) => {
                player.body.FOV = 1.02;
            }
        },
        {
            name: "Smaller",
            keys: [[["KEY_SPECIAL_SMALLER", ","]]],
            permissionLevel: 1,
            run: ({ player }) => {
                const min = 2;
                if (player.body.SIZE >= (min + 0.5)) {
                    player.body.SIZE *= 4 / 5;
                    player.body.coreSize = player.body.SIZE;
                }
            }
        },
        {
            name: "Bigger",
            keys: [[["KEY_SPECIAL_BIGGER", "."]]],
            permissionLevel: 1,
            run: ({ player }) => {
                const max = 300;
                if (player.body.SIZE <= (max - 0.5)) {
                    player.body.SIZE *= 5 / 4;
                    player.body.coreSize = player.body.SIZE;
                }
            }
        },
        {
            name: "Promote user",
            keys: [[["KEY_SPECIAL_PROMOTE", ";"]]],
            permissionLevel: 2,
            run: ({ player, socket }) => {
                let role = socket.status.permissionLevel;
                if (role < 2) return player.body.sendMessage("You do not have access to this command.");
                selectedEntities(player, (o) => {
                    if (!o.isPlayer || !o.socket || o.socket === socket) return;
                    let target = o.socket.status.permissionLevel;
                    if (target >= 3 || (role === 2 && target !== 0)) return player.body.sendMessage("You do not have sufficient permission to promote this player!");
                    setPermissionLevel(o.socket, target + 1);
                    o.socket.talk("m", 8_000, "You have been promoted to " + permissionLevelNames[target + 1] + "!");
                    player.body.sendMessage("Player promoted to " + permissionLevelNames[target + 1] + "!");
                });
            }
        },
        {
            name: "Demote user",
            keys: [[["KEY_SPECIAL_DEMOTE", "'"]]],
            permissionLevel: 2,
            run: ({ player, socket }) => {
                let role = socket.status.permissionLevel;
                if (role < 2) return player.body.sendMessage("You do not have access to this command.");
                selectedEntities(player, (o) => {
                    if (!o.isPlayer || !o.socket || o.socket === socket) return;
                    let target = o.socket.status.permissionLevel;
                    if (!target || (target > 3 && target >= role) || (role === 2 && target !== 1)) return player.body.sendMessage("You do not have sufficient permission to demote this player!");
                    setPermissionLevel(o.socket, target - 1);
                    o.socket.talk("m", 8_000, "You have been demoted to " + permissionLevelNames[target - 1] + "!");
                    player.body.sendMessage("Player demoted to " + permissionLevelNames[target - 1] + "!");
                });
            }
        },
        {
            name: "Unknown",
            keys: [[["default", "Unknown"]]],
            permissionLevel: 1,
            hidden: true,
            run: ({ socket }) => {
                if (!socket.status.givenOperatorTips) {
                    socket.status.givenOperatorTips = true;
                    socket.talk("m", 10_000, `Press ${key("sandbox")} + ¹ or ${key("sandbox")} + ${key("help")} for help.`);
                }
            }
        }
    ];
    global.runKeyCommand = (socket, codes) => {
        if (!socket?.player?.body) return 1;
        if (!codes.length) codes = ["default"];
        let name = codes.find((code) => code.startsWith("-")) || codes[codes.length - 1];
        let command, length = 0;
        for (const cmd of commands) {
            for (const keys of cmd.keys) {
                if (keys.length > length && keys[keys.length - 1][0] === name && keys.slice(0, -1).every((key) => codes.includes(key[0]))) {
                    command = cmd;
                    length = keys.length;
                }
            }
        }
        if (command && (socket.status.permissionLevel >= permissionLevelValue(command.permissionLevel) || (command.tokenClass && socket.permissions?.class === command.tokenClass))) {
            try {
                command.run({
                    socket,
                    player: socket.player,
                    gameManager: global.gameManager
                });
                socket.player.body.refreshBodyAttributes();
                socket.player.body.minimapColor = "lime";
            } catch(e) {
                console.error(`${command.name.toLowerCase()} key command error`, e);
            }
        }
    };
}


// If you dont want to add the key commands, just uncomment the return line.
// return;
init();
