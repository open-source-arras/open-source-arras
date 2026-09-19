// Global Variables (These must come before we import from the modules folder.)
let EventEmitter = require("events");
const HashGrid = require("../lib/hashgrid.js");
global.Events = new EventEmitter();
global.Config = require("../config.js");

global.ran = require("../lib/random.js");
global.util = require("../lib/util.js");
global.protocol = require("../lib/fasttalk.js");
global.mazeGenerator = require("../miscFiles/mazeGenerator.js");
global.grid = new HashGrid(7);
global.viewGrid = new HashGrid(10, false);
global.cannotRespawn = false;
global.mockupData = [];
global.mockupMap = {};
global.entities = new Map();
global.targetableEntities = new Map();
global.unspawnableTeam = [];
global.walls = [];
global.entitiesToAvoid = [];
global.servers = [];
global.chats = {};
global.travellingPlayers = [];
global.fps = "Unknown";

global.key = (name) => `\x01${name}\x01`;

global.loadedAddons = [];
global.addonAuthorInfos = [];
global.TEAM_BLUE = -1;
global.TEAM_GREEN = -2;
global.TEAM_RED = -3;
global.TEAM_PURPLE = -4;
global.TEAM_YELLOW = -5;
global.TEAM_ORANGE = -6;
global.TEAM_BROWN = -7;
global.TEAM_CYAN = -8;
global.TEAM_DREADNOUGHTS = -10;
global.TEAM_ROOM = -100;
global.TEAM_ENEMIES = -101;
global.getSpawnableArea = (team, gameManager) => {
    gameManager = ensureIsManager(gameManager);
    let room = gameManager.room;
    let spawnables = (team in room.spawnable && room.spawnable[team].length) ? room.spawnable[team] : room.spawnableDefault;
    let loc;
    let attempts = 20;
    do {
        loc = ran.choose(spawnables).randomInside();
    } while (attempts-- && dirtyCheck(loc, 0));
    return loc;
}
global.teamNames = [
    "BLUE",
    "GREEN",
    "RED",
    "PURPLE",
    "YELLOW",
    "ORANGE",
    "BROWN",
    "CYAN"
]
global.teamColors = [
    "blue",
    "green",
    "red",
    "magenta",
    "mustard",
    "tangerine",
    "brown",
    "cyan"
]
global.getTeamName = team => [...global.teamNames, , "DREADNOUGHT"][-team - 1] ?? "NEUTRAL";
global.getTeamColor = (team, fixMode = false) => {
    let color = ([...global.teamColors, , "aqua"][-team - 1] ?? 3);
    if (fixMode) color = color + " 0 1 0 false";
    return color;
}
global.isPlayerTeam = team => team < 0 || team > -11;
global.getWeakestTeam = () => {
    let teamCounts = {};
    for (let i = -Config.teams; i < 0; i++) {
        if (global.defeatedTeams.includes(i)) continue;
        teamCounts[i] = 0;
    }

    // Tell us how many players and bots there are.
    for (let o of global.entities.values()) {
        if ((o.isBot || o.isPlayer) && o.team in teamCounts && o.team < 0 && isPlayerTeam(o.team)) {
            if (!(o.team in teamCounts)) {
                teamCounts[o.team] = 0;
            }
            teamCounts[o.team]++;
        }
    }

    // Convert the `teamCounts` into an array and at the same time calculate with the team_weights.
    teamCounts = Object.entries(teamCounts).map(([teamId, amount]) => {
        let weight = teamId in Config.team_weights ? Config.team_weights[teamId] : 1;
        return [teamId, amount / weight];
    });

    // Filter the strongest team out and leave the weakest team or teams that has the same player/bots amount in the array.
    let lowestTeamCount = Math.min(...teamCounts.map(x => x[1])),
        entries = teamCounts.filter(a => a[1] == lowestTeamCount);

    // If there are no entites that are in teams list, spawn on the blue team first.
    let checkIfEmpty = 0;
    for (let team of entries) {
        if (team[1] === 0) checkIfEmpty++;
        if (checkIfEmpty === teamCounts.length) {
            for (let team of entries) {
                if (team[0] == "-1") {
                    entries = [team];
                }
            }
        };
    }
    return parseInt(!entries.length ? -Math.ceil(Math.random() * Config.teams) : ran.choose(entries)[0]);
};
global.getRandomTeam = () => -Math.floor(Math.random() * 3000) + 1;

global.Class = {};
global.tileClass = {};
global.classMap = new Map();
global.definitionsWaiter = false;

global.ensureIsClass = str => {
    if ("object" == typeof str) {
        return str;
    }
    if (str in Class) {
        return Class[str];
    };

    throw Error(`Definition "${str}" was attempted to be gotten but does not exist!`);
}

global.ensureIsManager = str => {
    if ("undefined" == typeof str) {
        console.error("No game manager detected! Please check your code.");
        throw new Error("No game manager detected!");
    }
    return str;
}

global.tickIndex = 0;
global.tickEvents = new EventEmitter();
global.syncedDelaysLoop = () => tickEvents.emit(tickIndex++);
global.setSyncedTimeout = (callback, ticks = 0, ...args) => tickEvents.once(tickIndex + Math.round(ticks), () => callback(...args));

global.bringToLife = (() => {
    return my => {
        let now = Date.now();
        // Size animation
        if (my.permanentSize) {
            my.coreSize = my.permanentSize;
        } else if (my.isPlayer && !my.settings.noSizeAnimation) {
            const diff = my.SIZE - my.coreSize;
            if (diff) my.coreSize += diff / 11;
        } else if (my.SIZE !== my.coreSize) {
            my.coreSize = my.SIZE;
        }

        // Invisibility/Alpha
        const velSq = my.velocity.x * my.velocity.x + my.velocity.y * my.velocity.y;
        if (!my.damageReceived && velSq <= 0.1) {
            my.alpha = Math.max(my.alphaRange[0], my.alpha - my.invisible[1]);
        } else {
            my.alpha = Math.min(my.alphaRange[1], my.alpha + my.invisible[0]);
        }

        // Control logic
        const faucet = (my.settings.independent || my.source == null || my.source === my) ? {} : my.source.control;
        let b = {
            target: remapTarget(faucet, my.source, my),
            goal: undefined,
            fire: faucet.fire,
            main: faucet.main,
            alt: faucet.alt,
            power: undefined
        };

        // Attention craver
        if (my.settings.attentionCraver && !faucet.main && my.range) {
            my.range--;
        }

        // Controllers
        logs.though.set();
        for (let i = 0, len = my.controllers.length; i < len; i++) {
            const AI = my.controllers[i];
            const a = AI.think(b);
            if (a) {
                if (a.target != null && (b.target == null || AI.acceptsFromTop)) b.target = a.target;
                if (a.goal != null && (b.goal == null || AI.acceptsFromTop)) b.goal = a.goal;
                if (a.fire != null && (b.fire == null || AI.acceptsFromTop)) b.fire = a.fire;
                if (a.main != null && (b.main == null || AI.acceptsFromTop)) b.main = a.main;
                if (a.alt != null && (b.alt == null || AI.acceptsFromTop)) b.alt = a.alt;
                if (a.power != null && (b.power == null || AI.acceptsFromTop)) b.power = a.power;
            }
        }
        logs.though.mark();

        my.control.target = b.target == null ? my.control.target : b.target;
        my.control.goal = b.goal || { x: my.x, y: my.y };
        my.control.fire = b.fire ?? false;
        my.control.main = b.main ?? false;
        my.control.alt = b.alt ?? false;
        my.control.power = b.power == null ? 1 : b.power;

        // React
        my.move(now);
        my.face();
        my.updateBodyInfo();

        // Handle upgrade pending
        if (my.isPlayer && my.upgradePending) {
            let lastAction = Math.max(my.lastMovementTime, my.lastFiredTime);
            let waitSec = Math.ceil(Config.upgrade_delay / 1000);
            if (my.index !== my.upgradePending.lastIndex) {
                my.upgradePending = undefined;
                my.sendMessage("Upgrade cancelled.");
                return;
            }
            if (my.inBase() || now - lastAction >= Config.upgrade_delay) {
                my.upgrade(my.upgradePending.number, my.upgradePending.branch, true, my.upgradePending.dailyTankRequest);
                my.upgradePending = undefined;
            } else if (!my.inBase() && now - (my.upgradePending.lastReminder ?? 0) >= Config.upgrade_delay_reminder) {
                my.upgradePending.lastReminder = now;
                my.sendMessage(`You must stay still for ${waitSec} seconds without firing to upgrade.`);
            }
        }

        // Guns and turrets
        if (my.guns) {
            for (let gun of my.guns.values()) gun.live();
        }
        if (my.turrets) {
            for (let turret of my.turrets.values()) turret.life();
        }

        // Refresh body attributes if needed
        if (my.skill.maintain()) my.refreshBodyAttributes();
    }
})();
global.runMove = (() => {
    return (my, now = Date.now()) => {
        let g = { x: my.control.goal.x - my.x, y: my.control.goal.y - my.y },
            gactive = (g.x !== 0 || g.y !== 0),
            engine = { x: 0, y: 0 },
            a = my.acceleration / global.gameManager.roomSpeed;
        if (gactive && my.lastMovementTime) my.lastMovementTime = now;
        if (my.control.fire && my.lastFiredTime) my.lastFiredTime = now;
        switch (my.motionType) {
            case "grow":
                my.SIZE += my.motionTypeArgs.speed ?? 1;
                break;
            case "glide":
                my.maxSpeed = my.topSpeed;
                my.damp = my.motionTypeArgs.damp ?? 0.05;
                break;
            case "motor":
                my.maxSpeed = 0;
                if (my.topSpeed) {
                    my.damp = a / my.topSpeed;
                }
                if (gactive) {
                    let len = Math.sqrt(g.x * g.x + g.y * g.y);
                    engine = { x: a * g.x / len, y: a * g.y / len };
                }
                break;
            case "swarm":
                my.maxSpeed = my.topSpeed;
                let l = util.getDistance({ x: 0, y: 0 }, g) + 1;
                if (gactive && l > my.size) {
                    let desiredxspeed = my.topSpeed * g.x / l,
                        desiredyspeed = my.topSpeed * g.y / l,
                        turning = Math.sqrt((my.topSpeed * Math.max(1, my.motionTypeArgs.turnVelocity ?? my.range) + 1) / a);
                    engine = {
                        x: (desiredxspeed - my.velocity.x) / Math.max(5, turning),
                        y: (desiredyspeed - my.velocity.y) / Math.max(5, turning)
                    };
                } else {
                    if (my.velocity.length < my.topSpeed) {
                        engine = {
                            x: my.velocity.x * a / 20,
                            y: my.velocity.y * a / 20
                        };
                    }
                }
                break;
            case "chase":
                if (gactive) {
                    let l = util.getDistance({ x: 0, y: 0 }, g);
                    if (l > my.size * 2) {
                        my.maxSpeed = my.topSpeed;
                        let desiredxspeed = my.topSpeed * g.x / l,
                            desiredyspeed = my.topSpeed * g.y / l;
                        engine = {
                            x: (desiredxspeed - my.velocity.x) * a,
                            y: (desiredyspeed - my.velocity.y) * a
                        };
                    } else if (my.motionTypeArgs.keepSpeed) {
                        if (my.velocity.length < my.topSpeed) {
                            engine = {
                                x: my.velocity.x * a / 20,
                                y: my.velocity.y * a / 20
                            };
                        }
                    } else my.maxSpeed = 0;
                } else if (my.motionTypeArgs.keepSpeed) {
                    if (my.velocity.length < my.topSpeed) {
                        engine = {
                            x: my.velocity.x * a / 20,
                            y: my.velocity.y * a / 20
                        };
                    }
                } else my.maxSpeed = 0;
                break;
            case "drift":
                my.maxSpeed = 0;
                engine = { x: g.x * a, y: g.y * a };
                break;
            case "withMaster":
                my.x = my.source.x;
                my.y = my.source.y;
                my.velocity.x = my.source.velocity.x;
                my.velocity.y = my.source.velocity.y;
                break;
        }
        my.accel.x += engine.x * my.control.power;
        my.accel.y += engine.y * my.control.power;
    }
})()
global.runFace = (() => {
    return (my) => {
        let t = my.control.target,
            oldFacing = my.facing;
        let defaultBound = () => {
            let givenangle;
            if (my.control.main) {
                if (my.master.master.isPlayer) {
                    let reverse = my.master.master.reverseTargetWithTank ? 1 : my.master.master.reverseTank;
                    let angleValue = Math.atan2(t.y * reverse, t.x * reverse);
                    if (isNaN(angleValue)) givenangle = Math.atan2(0, 0);
                    else givenangle = angleValue;
                } else {
                    givenangle = Math.atan2(t.y, t.x);
                }
                let diff = util.angleDifference(givenangle, my.firingArc[0]);
                if (Math.abs(diff) >= my.firingArc[1]) {
                    givenangle = my.firingArc[0];
                }
            } else {
                givenangle = my.firingArc[0];
            }
            my.facing += util.loopSmooth(my.facing, givenangle, (my.facingTypeArgs.smoothness ?? 4) / global.gameManager.runSpeed);
        }
        switch (my.facingType) {
            case "spin":
                my.facing += (my.facingTypeArgs.speed ?? 0.05) / global.gameManager.runSpeed;
                break;
            case "spinWhenIdle":
                if (t && my.control.fire) my.facing = Math.atan2(t.y, t.x); else my.facing += (my.facingTypeArgs.speed ?? 0.05) / global.gameManager.runSpeed;
                break;
            case "turnWithSpeed":
                my.facing += my.velocity.length / 90 * Math.PI / global.gameManager.roomSpeed * (my.facingTypeArgs.multiplier ?? 1);
                break;
            case "withMotion":
                my.facing = my.velocity.direction;
                break;
            case "smoothWithMotion":
            case "looseWithMotion":
                my.facing += util.loopSmooth(my.facing, my.velocity.direction, (my.facingTypeArgs.smoothness ?? 4) / global.gameManager.roomSpeed);
                break;
            case "withTarget":
            case "toTarget":
                if (my.eastereggs.braindamage) return;
                if (my.isPlayer) {
                    let reverse = my.reverseTargetWithTank ? 1 : my.reverseTank;
                    my.facing = Math.atan2(t.y * reverse, t.x * reverse);
                } else {
                    my.facing = Math.atan2(t.y, t.x);
                }
                break;
            case "locksFacing":
                if (!my.control.alt) my.facing = Math.atan2(t.y, t.x);
                break;
            case "looseWithTarget":
            case "looseToTarget":
            case "smoothToTarget":
                my.facing += util.loopSmooth(my.facing, Math.atan2(t.y, t.x), (my.facingTypeArgs.smoothness ?? 4) / global.gameManager.roomSpeed);
                break;
            case "noFacing":
                if (my.lastSavedFacing !== my.facing) my.facing = my.facingTypeArgs.angle ?? 0;
                my.lastSavedFacing = my.facing;
                break;
            case "bound":
                defaultBound();
                break;
            case "spinOnFire":
                if (t && my.control.fire) my.facing += util.loopSmooth(my.facing, my.facing += 1, (my.facingTypeArgs.smoothness ?? 4) / global.gameManager.runSpeed); else defaultBound();
                break;
            case "manual":
                if ((my.facingTypeArgs.angle ?? 0) !== my.facing) my.facing = my.facingTypeArgs.angle;
                break;
        }
        // Loop
        const TAU = 2 * Math.PI
        my.facing = (my.facing % TAU + TAU) % TAU;
        my.vfacing = util.angleDifference(oldFacing, my.facing) * global.gameManager.roomSpeed;
    }
})();
global.defineSplit = (() => {
    return (defs, branch, set, my, emitEvent) => {
        set = ensureIsClass(defs[branch]);

        if (set.index != null) my.index += "-" + set.index;
        if (set.PARENT != null) {
            if (Array.isArray(set.PARENT)) {
                for (let i = 0; i < set.PARENT.length; i++) {
                    my.branchLabel = ensureIsClass(set.PARENT[i]).BRANCH_LABEL;
                }
            } else {
                my.branchLabel = ensureIsClass(set.PARENT).BRANCH_LABEL;
            }
        }
        if (set.LABEL != null && set.LABEL.length > 0) my.label = my.label + "-" + set.LABEL;
        if (set.MAX_CHILDREN != null) my.maxChildren += set.MAX_CHILDREN;
        else my.maxChildren = null; // For bullet and drone combos so all parts remain functional
        if (set.BODY != null) {
            if (set.BODY.ACCELERATION != null) my.ACCELERATION *= set.BODY.ACCELERATION;
            if (set.BODY.SPEED != null) my.SPEED *= set.BODY.SPEED;
            if (set.BODY.HEALTH != null) my.HEALTH *= set.BODY.HEALTH;
            if (set.BODY.RESIST != null) my.RESIST *= set.BODY.RESIST;
            if (set.BODY.SHIELD != null) my.SHIELD *= set.BODY.SHIELD;
            if (set.BODY.REGEN != null) my.REGEN *= set.BODY.REGEN;
            if (set.BODY.DAMAGE != null) my.DAMAGE *= set.BODY.DAMAGE;
            if (set.BODY.PENETRATION != null) my.PENETRATION *= set.BODY.PENETRATION;
            if (set.BODY.RANGE != null) my.RANGE *= set.BODY.RANGE;
            if (set.BODY.FOV != null) my.FOV *= set.BODY.FOV;
            if (set.BODY.SHOCK_ABSORB != null) my.SHOCK_ABSORB *= set.BODY.SHOCK_ABSORB;
            if (set.BODY.RECOIL_MULTIPLIER != null) my.RECOIL_MULTIPLIER *= set.BODY.RECOIL_MULTIPLIER;
            if (set.BODY.DENSITY != null) my.DENSITY *= set.BODY.DENSITY;
            if (set.BODY.STEALTH != null) my.STEALTH *= set.BODY.STEALTH;
            if (set.BODY.PUSHABILITY != null) my.PUSHABILITY *= set.BODY.PUSHABILITY;
            if (set.BODY.HETERO != null) my.heteroMultiplier *= set.BODY.HETERO;
            my.refreshBodyAttributes();
        }
        if (set.GUNS != null) {
            let newGuns = [];
            for (let i = 0; i < set.GUNS.length; i++) {
                newGuns.push(new Gun(my, set.GUNS[i]));
            }
            for (let guns of newGuns) {
                my.guns.set(guns.id, guns);
            }
            my.gunsArrayed.push(...newGuns);
        }
        if (set.TURRETS != null) {
            for (let i = 0; i < set.TURRETS.length; i++) {
                let def = set.TURRETS[i],
                    o = new turretEntity(def.POSITION, my, my.master),
                    turretDanger = false,
                    type = Array.isArray(def.TYPE) ? def.TYPE : [def.TYPE];
                for (let j = 0; j < type.length; j++) {
                    o.define(type[j]);
                    if (type.TURRET_DANGER) turretDanger = true;
                }
                if (!turretDanger) o.define({ DANGER: 0 });
                o.fixFacing();
            }
        }
        if (set.PROPS != null) {
            for (let i = 0; i < set.PROPS.length; i++) {
                let def = set.PROPS[i],
                    o = new Prop(def.POSITION, my.master, true),
                    type = Array.isArray(def.TYPE) ? def.TYPE : [def.TYPE];
                for (let j = 0; j < type.length; j++) {
                    o.define(type[j]);
                }
            }
        }
        if (set.SIZE != null) {
            my.SIZE *= set.SIZE * my.squiggle;
            if (my.coreSize == null) my.coreSize = my.SIZE;
        }
        if (set.CONTROLLERS != null) {
            let toAdd = [];
            for (let i = 0; i < set.CONTROLLERS.length; i++) {
                let io = set.CONTROLLERS[i];
                if ("string" == typeof io) io = [io];
                toAdd.push(new ioTypes[io[0]](my, io[1]));
            }
            my.addController(toAdd);
        }
        if (set.BATCH_UPGRADES != null) my.batchUpgrades = set.BATCH_UPGRADES;
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
                my.upgrades.push({
                    class: trueUpgrades,
                    level: Config.tier_multiplier * i,
                    index: index.substring(0, index.length - 1),
                    tier: i,
                    branch,
                    branchLabel: my.branchLabel,
                    redefineAll
                });
            }
        }
        if (set.REROOT_UPGRADE_TREE) my.rerootUpgradeTree = set.REROOT_UPGRADE_TREE;
        if (Array.isArray(my.rerootUpgradeTree)) {
            let finalRoot = "";
            for (let root of my.rerootUpgradeTree) finalRoot += root + "\\/";
            my.rerootUpgradeTree += finalRoot.substring(0, finalRoot.length - 2);
        }
    }
})();

global.handleBatchUpgradeSplit = (() => {
    function chooseUpgradeFromBranch(remaining, my) {
        if (remaining > 0) { // If there's more to select
            let branchUgrades = my.tempUpgrades[my.defs.length - remaining];
            for (let i = 0; i < branchUgrades.length; i++) { // Pick all possible options and continue selecting
                my.selection[my.defs.length - remaining] = branchUgrades[i];
                chooseUpgradeFromBranch(remaining - 1, my);
            }
            if (branchUgrades.length == 0) // For when the branch has no upgrades
            {
                chooseUpgradeFromBranch(remaining - 1, my); 
            }
        } else { // If there's nothing more to select
            let upgradeClass = [],
                upgradeTier = 0,
                upgradeIndex = "";
            for (let u of my.selection) {
                upgradeClass.push(u.class);
                upgradeIndex += u.index + "-";
                upgradeTier = Math.max(upgradeTier, u.tier);
            }
            my.upgrades.push({
                class: upgradeClass,
                level: Config.tier_multiplier * upgradeTier,
                index: upgradeIndex.substring(0, upgradeIndex.length - 1),
                tier: upgradeTier,
                branch: 0,
                branchLabel: "",
                redefineAll: true
            });
        }
    }
    return (my) => {
        my.tempUpgrades = [];
        let numBranches = my.defs.length;
        for (let i = 0; i < numBranches; i++) { // Create a 2d array for the upgrades (1st index is branch index)
            my.tempUpgrades.push([]);
        }
        for (let upgrade of my.upgrades) {
            let upgradeBranch = upgrade.branch;
            my.tempUpgrades[upgradeBranch].push(upgrade);
        }

        my.upgrades = [];
        my.selection = JSON.parse(JSON.stringify(my.defs));
        chooseUpgradeFromBranch(numBranches, my); // Recursively build upgrade options
    }
})();

global.checkIfInView = (() => {
    return (boolean, addToNearby, clients, my) => {
        for (let socket of clients) {
            boolean = my.gameManager.views.some(v => v.check(my));
        
            if (boolean) {
                if (!socket.nearby.includes(my) && addToNearby) my.onRender = true, socket.nearby.push(my);
            } else my.onRender = false;
        }
        return boolean;
    }
})();

global.Tile = class Tile {
    constructor(args) {
        this.args = args;
        this.name = args.NAME;
        this.image = args.IMAGE;
        if ("object" !== typeof this.args) {
            throw new Error("First argument has to be an object!");
        }
        this.visibleOnBlackout = args.VISIBLE_FROM_BLACKOUT ?? false;
        this.color = args.COLOR;
        this.data = args.DATA || {};
        if ("object" !== typeof this.data) {
            throw new Error("'data' property must be an object!");
        }
        this.init = args.INIT || (() => { });
        if ("function" !== typeof this.init) {
            throw new Error("'init' property must be a function!");
        }
        this.tick = args.TICK || (() => { });
        if ("function" !== typeof this.tick) {
            throw new Error("'tick' property must be a function!");
        }
    }
}

global.flatten = (output, definition) => {
    definition = ensureIsClass(definition);

    if (definition.PARENT) {
        if (!Array.isArray(definition.PARENT)) {
            flatten(output, definition.PARENT);
        } else {
            for (let parent of definition.PARENT) {
                flatten(output, parent);
            } 
        }
    }

    for (let key in definition) {
        if (key !== "PARENT") {
            output[key] = definition[key];
        }
    }

    return output;
};

global.convertExportsToClass = (exp) => {
    if ("object" === typeof Class) {
        for (const [key, definition] of Object.entries(exp)) {
            Class[key] = definition;
            Class[key].Converted = true;
        }
    }
};

global.makeHitbox = wall => {
    const z = wall.size - 4;
    //calculate the relative corners
    let relativeCorners = [
            Math.atan2(z, z) + wall.angle,
            Math.atan2(0 - z, z) + wall.angle,
            Math.atan2(0 - z, 0 - z) + wall.angle,
            Math.atan2(z, 0 - z) + wall.angle
        ],
        distance = Math.sqrt(z ** 2 + z ** 2);

    //convert 4 corners into 4 lines
    for (let i = 0; i < 4; i++) {
        relativeCorners[i] = {
            x: distance * Math.sin(relativeCorners[i]),
            y: distance * Math.cos(relativeCorners[i])
        };
    }

    wall.hitbox = [
        [relativeCorners[0], relativeCorners[1]],
        [relativeCorners[1], relativeCorners[2]],
        [relativeCorners[2], relativeCorners[3]],
        [relativeCorners[3], relativeCorners[0]]
    ];
    wall.hitboxRadius = distance;
}

global.wallTypes = [
    { color: 16, label: "Wall",    alpha: 1, class: "wall" },
    { color: 12, label: "deadly",  alpha: 1, class: "deadlyWall" },
    { color: 11, label: "heal",    alpha: 1, class: "healingWall" },
    { color: 19, label: "bouncy",  alpha: 1, class: "bouncyWall" },
    { color: 5,  label: "breaker", alpha: 1, class: "breakerWall" },
    { color: 0,  label: "chunks",  alpha: 1, class: "chunksWall" },
    { color: 13, label: "optical", alpha: 1, class: "opticalWall" },
    { color: 17, label: "!up",     alpha: 1, class: "oneWayWallUp" },
    { color: 17, label: "!down",   alpha: 1, class: "oneWayWallDown" },
    { color: 17, label: "!left",   alpha: 1, class: "oneWayWallLeft" },
    { color: 17, label: "!right",  alpha: 1, class: "oneWayWallRight" }
];

global.becomeBulletChildren = (socket, player, exit, newgui) => {
    let a = player.body.bulletchildren[player.body.bulletchildren.length - 1]
    if (a !== undefined && a !== null) {
        a.parent = a;
        a.source = a;
        a.bulletparent = a;
        a.settings.connectChildrenOnCamera = true;
        a.settings.persistsAfterDeath = true;

        let newchildren = player.body.bulletchildren,
            removedchildren = player.body.bulletchildren;

        newchildren = newchildren.filter((e) => e.id !== a.id && e !== null && e.master === a.master);
        removedchildren = newchildren.filter((e) => e.master !== a.master);
        a.bulletchildren = newchildren;
        removedchildren.forEach((e) => {
            e.master = e;
            e.destroy();
        })
        a.bulletchildren.forEach((e) => {
            e.source = a;
            e.bulletparent = a;
            e.parent = a;
        })

        let become = a;
        become.controllers = [];
        player.body = become;
        player.body.become(socket.player);
        player.body.isPlayer = true;
        player.body.socket = socket;
        player.gui = newgui(player);
        player.body.refreshBodyAttributes();
    } else exit();
}

global.loadAllMockups = (logText = true) => {
    let mockupsLoadStartTime = performance.now();
    if (logText) console.log("Started Loading All Mockups...");
    for (let k in Class) buildMockup(k, false);
    let mockupsLoadEndTime = performance.now();
    if (logText) console.log(`Loaded ${mockupData.length} MockupEntities.`);
    if (logText) console.log(`Mockups generated in ${util.rounder(mockupsLoadEndTime - mockupsLoadStartTime, 3)} milliseconds.\n`);
}
