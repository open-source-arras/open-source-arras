function init() {
    let useOldMenu = false;
    function selectedEntities(player, run) {
        for (const o of entities.values()) {
          if (
            (o !== player.body) != null &&
            util.getDistance(o, {
                x: player.target.x + player.body.x,
                y: player.target.y + player.body.y,
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
                y: player.target.y + player.body.y,
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
            y: player.body.y + player.target.y,
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
    function makeHelpList(command) {
        let name = command.name;
        let key = command.displayKey ? command.displayKey : command.keys.map((keys) => keys.map((key) => key[1]).join("+")).join(" / ");
        let description = command.description ?? false;
        let asterisk = command.level > 1 ? "*" : "";
        let text = ``;
        if (name.slice(0, 1).toUpperCase() === key) text = `- [${key}]${name.slice(1)}${asterisk}`;
        else text = `- [${key}] ${name}${asterisk}`;
        if (description) text += ` - ${description}`
        return text;
    }
    
    // This is your commands does things.
    let commands = [
        {
            name: "Help",
            description: "Shows this command list",
            keys: [[["KEY_SPECIAL_HELP", "?"]], [["KEY_SPECIAL_HELP_ALT", "F1"]]],
            level: 1,
            operatorAccess: true,
            run: ({ socket, level, operator }) => {
                let lines = [
                    "Help menu:",
                    ...commands
                    .filter(
                        (c) =>
                        (level >= c.level || (operator && c.operatorAccess)) && !c.hidden && !c.attribute && !c.skill
                    )
                    .map(command => makeHelpList(command)),
                    "Warning: Avoid zooming all the way out to prevent lagging the server.",
                ];
                if (useOldMenu) {
                    for (let line of lines.reverse()) {
                        socket.talk("m", 15_000, line);
                    }
                } else socket.talk("Em", 15_000, JSON.stringify(lines));
            },
        },
        {
            name: "Preset tank #1",
            keys: [[["KEY_SPECIAL_PRESET_1", "1"]]],
            level: 1,
            operatorAccess: true,
            run: ({ player }) => {
                player.body.define({ RESET_UPGRADES: true, BATCH_UPGRADES: false });
                player.body.define("spectator");
            }
        },
        {
            name: "Special Tank",
            description: "Defines you to your token's tank.",
            keys: [[["KEY_SPECIAL_PRESET_2", "2"]]],
            level: 1,
            operatorAccess: true,
            hidden: true,
            run: ({ socket, player }) => {
                if (socket.permissions?.class) {
                    player.body.define({ RESET_UPGRADES: true, BATCH_UPGRADES: false });
                    player.body.define(socket.permissions?.class || Config.spawn_class);
                    let msg = Config.token_message.split("\n");
                    if (!socket.status.specialTankWarned) {
                        socket.status.specialTankWarned = true;
                        for (let i = 0; i < msg.length; i++) {
                            player.body.sendMessage(msg[i]);
                        }
                    }
                } else {
                    player.body.define({ RESET_UPGRADES: true, BATCH_UPGRADES: false });
                    player.body.define("healer");
                }
            },
        },
        {
            name: "Preset Tank #2",
            description: "Defines you as healer",
            keys: [[["KEY_SPECIAL_PRESET_3", "3"]]],
            level: 1,
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
            level: 1,
            operatorAccess: true,
            run: ({ player }) => {
                player.body.define({ RESET_UPGRADES: true, BATCH_UPGRADES: false });
                player.body.define(Config.spawn_class);
            }
        },
        {
            name: "Teleport",
            keys: [[["KEY_SPECIAL_TELEPORT", "E"]]],
            level: 1,
            operatorAccess: true,
            run: ({ player }) => {
                player.body.x += player.target.x;
                player.body.y += player.target.y;
            }
        },
        {
            name: "Kill",
            keys: [[["KEY_SPECIAL_KILL", "K"]]],
            level: 1,
            operatorAccess: true,
            run: ({ socket, player }) => {
                let killed = 0;
                selectedEntities(player, (o) => {
                    if (o.bond) return;
                    o.kill();
                    killed++;
                });
                if (killed) {
                    socket.talk( "m", 5_000, `You have killed ${killed} entit${killed === 1 ? "y" : "ies"}.`);
                } else {
                    socket.talk("m", 3_000, "You haven't killed any entity!");
                }
            },
        },
        {
            name: "Whirlpool",
            //description: "Picks the nearest entity at you're cursor.",
            keys: [[["KEY_SPECIAL_WHIRLPOOL", "W"]]],
            level: 1,
            operatorAccess: true,
            run: ({ player }) => {
                let e = player.body.store.selectedWhirlpool;
                let t = target(player);
                if (!e) e = player.body.store.selectedWhirlpool = nearest(entities, t);
                e.x = t.x;
                e.y = t.y;
            },
        },
        {
            name: "Whirlpool",
            keys: [[["-KEY_SPECIAL_WHIRLPOOL", "W"]]],
            level: 1,
            hidden: true,
            run: ({ player }) => {
                delete player.body.store.selectedWhirlpool;
            }
        },
        {
            name: "Drag",
            keys: [[["KEY_SPECIAL_DRAG", "D"]]],
            level: 1,
            operatorAccess: true,
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
                        for (let { e: entity, dx, dy } of dragged)
                        if (!entity.isGhost) {
                            entity.x = dx + tx;
                            entity.y = dy + ty;
                        } else {
                            clearInterval(body.store.dragInterval);
                            delete body.store.dragInterval;
                        }
                    });
                }
            },
        },
        {
            name: "Drag",
            keys: [[["-KEY_SPECIAL_DRAG", "D"]]],
            hidden: true,
            level: 1,
            operatorAccess: true,
            run({ player }) {
              clearInterval(player.body.store.dragInterval);
              delete player.body.store.dragInterval;
            },
        },
        {
            name: "Color",
            keys: [[["KEY_SPECIAL_COLOR", "C"]]],
            level: 1,
            operatorAccess: true,
            run: ({ player }) => {
                let target = targetEntities(player);
                if (target.length) {
                    let o = target[0];
                    if (o.color.base > 42) {
                        o.color.base = 1;
                    }
                    o.color.base += 1;
                }
            }
        },
        {
            name: "Wall",
            //description: "Spawns wall at your cursor",
            keys: [[["KEY_SPECIAL_WALL", "X"]]],
            level: 1,
            operatorAccess: true,
            run: ({ socket, player, gameManager }) => {
                let pos = {};
                let dwall = player.body.store.wallCMD;
                if (!dwall) {
                    const targetPos = {
                        x: player.body.x + player.target.x,
                        y: player.body.y + player.target.y
                    };
                    const gridCell = gameManager.room.wallGrid.getGrid(targetPos);
                    if (!gridCell) {
                        return socket.talk("m", 3_000, "No valid grid.");
                    }
                    pos = { x: gridCell.x, y: gridCell.y };
                    let checkWall = targetEntities(player, o => o.type === "wall");
                    if (!checkWall.length) {
                        let o = new Entity(pos);
                        o.define("wall");
                        o.SIZE = gameManager.room.wallGrid.width / gameManager.room.wallGrid.xgrid / 2 / lazyRealSizes[4] * Math.SQRT2 - 2;
                        o.team = -101;
                        o.isWallSpawn = true;
                        let pt = target(player);
                        player.body.store.wallCMD = {
                            wall: o,
                            target: pt,
                            position: pos,
                            size: gameManager.room.wallGrid.width / gameManager.room.wallGrid.xgrid / 2,
                        };
                    } else {
                        for (let wall of checkWall) {
                            wall.destroy();
                        }
                    }
                } else {
                    const targetPos = {
                        x: player.body.x + player.target.x,
                        y: player.body.y + player.target.y
                    };
                    const gridCell = gameManager.room.wallGrid.getGrid(targetPos);
                    if (!gridCell) {
                        return socket.talk("m", 3_000, "No valid grid.");
                    }
                    const pos = { x: gridCell.x, y: gridCell.y };
                    const gridSize = gameManager.room.wallGrid.width / gameManager.room.wallGrid.xgrid / 2;
                    const xDiff = Math.abs(player.body.store.wallCMD.position.x - pos.x) / gridSize;
                    const yDiff = Math.abs(player.body.store.wallCMD.position.y - pos.y) / gridSize;
                    const isValidPlacement = Math.abs(xDiff - yDiff) <= 0.5;
                    if (isValidPlacement) {
                        const scaleFactor = Math.floor((Math.abs(player.body.store.wallCMD.position.x - pos.x) / gridSize / 2) + 1.5);
                        const newWallSize = Math.max(
                            player.body.store.wallCMD.size * scaleFactor,
                            player.body.store.wallCMD.size
                        );
                        player.body.store.wallCMD.wall.SIZE = (newWallSize / lazyRealSizes[4]) * Math.SQRT2 - 2;
                        const xOffset = newWallSize - player.body.store.wallCMD.size;
                        player.body.store.wallCMD.wall.x = player.body.store.wallCMD.position.x + 
                            (player.body.store.wallCMD.position.x > pos.x ? -xOffset : xOffset);
                        const yOffset = newWallSize - player.body.store.wallCMD.size;
                        player.body.store.wallCMD.wall.y = player.body.store.wallCMD.position.y +
                            (player.body.store.wallCMD.position.y > pos.y ? -yOffset : yOffset);
                    }
                }
            }
        },
        {
            name: "Wall Type", 
            keys: [[["KEY_SPECIAL_WALL_TYPE", "Z"]]],
            level: 1,
            operatorAccess: true,
            run: ({ player }) => {
                let walling = targetEntities(player, o => o.type === "wall");
                if (walling.length) {
                    let o = walling[0];
                    for (let tur of o.turrets.values()) tur.destroy();
                    o.turrets.clear();
                    if (o.walltype === global.wallTypes.length) o.walltype = 0;
                    o.walltype = o.walltype + 1;
                    let wallsettings = global.wallTypes[o.walltype - 1];
                    let newWalltype = o.walltype;
                    let wallSize = o.SIZE;
                    o.define(Class[wallsettings.class]);
                    o.walltype = newWalltype;
                    o.SIZE = wallSize;
                    o.coreSize = o.SIZE;
                    o.color.base = wallsettings.color; 
                    o.label = wallsettings.label;
                    o.alpha = wallsettings.alpha;
                }
            }
        },
        {
            name: "Wall",
            keys: [[["-KEY_SPECIAL_WALL", "X"]]],
            level: 1,
            hidden: true,
            operatorAccess: true,
            run({ player }) {
                delete player.body.store.wallCMD;
            },
        },
        {
            name: "Vanish",
            keys: [[["KEY_SPECIAL_VANISH", "V"]]],
            level: 1,
            operatorAccess: true,
            run: ({ player }) => {
                if (player.body.alpha === 0) {
                    if (player.body.invisible[0] === 0) {
                        player.body.invisible = [0.08, 0.03]
                    } else {
                        player.body.invisible = [0, 0]
                        player.body.alpha = 1
                    }
                } else if (player.body.alpha === 1) {
                    if (player.body.invisible[0] === 0) {
                        player.body.invisible = [0, 0]
                        player.body.alpha = 0
                    } else {
                        player.body.invisible = [0, 0]
                        player.body.alpha = 1
                    }
                } else {
                    player.body.invisible = [0, 0]
                    player.body.alpha = 1
                }
            }
        },
        {
            name: "Invulnerable",
            keys: [[["KEY_SPECIAL_INVINCIBLE", "I"]]],
            level: 1,
            operatorAccess: true,
            run: ({ socket, player }) => {
                player.body.godmode = !player.body.godmode;
                socket.talk("m", 4_000, `Invulnerability ${player.body.godmode ? "enabled" : "disabled"}.`);
            }
        },
        {
            name: "Team",
            //description: "Changes team at the selected entity.",
            keys: [[["KEY_SPECIAL_TEAM", "T"]]],
            level: 1,
            operatorAccess: true,
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
                        player.body.color.base = getTeamColor(TEAM_GREEN);
                    } else if (player.body.team == TEAM_GREEN) {
                        player.body.team = TEAM_RED;
                        player.body.color.base = getTeamColor(TEAM_RED);
                    } else if (player.body.team == TEAM_RED) {
                        player.body.team = TEAM_PURPLE;
                        player.body.color.base = getTeamColor(TEAM_PURPLE);
                    } else if (player.body.team == TEAM_PURPLE) {
                        player.body.team = TEAM_YELLOW;
                        player.body.color.base = getTeamColor(TEAM_YELLOW);
                    } else if (player.body.team == TEAM_YELLOW) {
                        player.body.team = TEAM_ORANGE;
                        player.body.color.base = getTeamColor(TEAM_ORANGE);
                    } else if (player.body.team == TEAM_ORANGE) {
                        player.body.team = TEAM_BROWN;
                        player.body.color.base = getTeamColor(TEAM_BROWN);
                    } else if (player.body.team == TEAM_BROWN) {
                        player.body.team = TEAM_CYAN;
                        player.body.color.base = getTeamColor(TEAM_CYAN);
                    } else {
                        player.body.team = TEAM_BLUE;
                        player.body.color.base = getTeamColor(TEAM_BLUE);
                    }
                }
                socket.talk("m", 5_000, `Changed to team ${changedTeamToEntity ? changedTeamToEntity.team : player.body.team}`);
            },
        },
        {
            name: "Invite to team",
            keys: [[["KEY_SPECIAL_TEAM_INVITE", "Y"]]],
            level: 1,
            operatorAccess: true,
            run: ({ player, socket }) => {
                selectedEntities(player, (o) => {
                    o.team = player.body.team;
                    let color = getTeamColor(o.team);
                    o.color.base = color;
                    socket.talk("m", 5_000, "Changed entity to team " + player.body.team);
                })
            }
        },
        {
            name: "Heal",
            keys: [[["KEY_SPECIAL_HEAL", "H"]]],
            level: 1,
            operatorAccess: true,
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
        /*{
            name: "Stronger",
            keys: [[[83, "S"]]],
            level: 1,
            operatorAccess: true,
            run: ({ player, socket }) => {
                let skills = Array(10).fill(15);
                player.body.skill.setCaps(skills);
                player.body.skill.set(skills);
                player.body.FOV = 2;
                player.body.settings.canGoOutsideRoom = true;
                player.body.syncTurrets();
                player.body.refreshBodyAttributes();
                socket.talk("m", 4_000, "Maxed all stats!");
            }
        },*/
        {
            name: "Skill",
            keys: [[["KEY_SPECIAL_SKILL", "S"], ["KEY_SPECIAL_HELP", "/"]], [["KEY_SPECIAL_SKILL", "S"], ["KEY_SPECIAL_HELP_ALT", "F1"]]],
            displayKey: "S+?",
            level: 1,
            operatorAccess: true,
            run: ({ socket, level, operator }) => {
                let lines = [
                    "Help menu:",
                    ...commands
                    .filter(
                        (c) =>
                        (level >= c.level || (operator && c.operatorAccess)) && !c.hidden && c.skill
                    )
                    .map(command => makeHelpList(command, false))
                ];
                if (useOldMenu) {
                    for (let line of lines.reverse()) {
                        socket.talk("m", 15_000, line);
                    }
                } else socket.talk("Em", 15_000, JSON.stringify(lines));
            },
        },
        {
            name: "Reset skills",
            keys: [[["KEY_SPECIAL_SKILL", "S"], ["KEY_SPECIAL_SKILL_RESET", "R"]]],
            skill: true,
            level: 1,
            operatorAccess: true,
            run: ({ player }) => {
                player.body.skill.setCaps(Array(10).fill(9));
                player.body.skill.set(Array(10).fill(0));
                let score = player.body.skill.score;
                player.body.skill.reset();
                player.body.skill.score = score;
                while (player.body.skill.maintain()) { }
                player.body.syncTurrets();
                player.body.refreshBodyAttributes();
                
            },
        },
        {
            name: "Clear skills",
            keys: [[["KEY_SPECIAL_SKILL", "S"], ["KEY_SPECIAL_SKILL_CLEAR", "C"]]],
            skill: true,
            level: 1,
            operatorAccess: true,
            run: ({ player }) => {
                let refundedSkillPoints = player.body.skill.raw.reduce((total, amount)=> total + amount, 0);
                player.body.skill.set(Array(10).fill(0));
                player.body.skill.points += refundedSkillPoints;
                player.body.syncTurrets();
                player.body.refreshBodyAttributes();
            },
        },
        {
            name: "Maximize skills",
            keys: [[["KEY_SPECIAL_SKILL", "S"], ["KEY_SPECIAL_SKILL_MAX", "M"]]],
            skill: true,
            level: 1,
            operatorAccess: true,
            run: ({ player }) => {
                player.body.skill.set(player.body.skill.caps);
                player.body.syncTurrets();
                player.body.refreshBodyAttributes();
            },
        },
        {
            name: "Remove skill point",
            keys: [[["KEY_SPECIAL_SKILL", "S"], ["KEY_SPECIAL_SKILL_REMOVE", "D"]]],
            skill: true,
            level: 1,
            operatorAccess: true,
            run: ({ player }) => {
                player.body.skill.points = Math.max(0, player.body.skill.points - 1);
                player.body.syncTurrets();
                player.body.refreshBodyAttributes();
            },
        },
        {
            name: "Add skill point",
            keys: [[["KEY_SPECIAL_SKILL", "S"], ["KEY_SPECIAL_SKILL_ADD", "F"]]],
            skill: true,
            level: 1,
            operatorAccess: true,
            run: ({ player }) => {
                let currentUsedPoints = player.body.skill.raw.reduce((total, v)=> total+v, 0);
                let maxSkills = player.body.skill.caps.reduce((total, capAmount) => total + capAmount, 0);
                player.body.skill.points = Math.min(maxSkills - currentUsedPoints, player.body.skill.points + 1);
                player.body.syncTurrets();
                player.body.refreshBodyAttributes();
            },
        },
        {
            name: "Reduce skill cap",
            keys: [[["KEY_SPECIAL_SKILL", "S"], ["KEY_SPECIAL_SKILL_CAP_REMOVE", "G"]]],
            skill: true,
            level: 1,
            operatorAccess: true,
            run: ({ player }) => {
                let newSkillCaps = player.body.skill.caps.map((x)=> Math.max(0, x - 1));
                let maxSkillPoints = newSkillCaps.reduce((total, x) => total + x, 0);
                player.body.skill.setCaps(newSkillCaps);
                maxSkillPoints -= player.body.skill.raw.reduce((total, x) => total + x, 0);
                player.body.skill.points = Math.min(player.body.skill.points, maxSkillPoints);
                player.body.syncTurrets();
                player.body.refreshBodyAttributes();
            },
        },
        {
            name: "Increase skill cap",
            keys: [[["KEY_SPECIAL_SKILL", "S"], ["KEY_SPECIAL_SKILL_CAP_ADD", "H"]]],
            skill: true,
            level: 1,
            operatorAccess: true,
            run: ({ player }) => {
                let skills = player.body.skill.caps.map((cap)=> cap = Math.min(20, cap + 1));
                player.body.skill.setCaps(skills);
                player.body.syncTurrets();
                player.body.refreshBodyAttributes();
            },
        },
        {
            name: "Get Data",
            keys: [[["KEY_SPECIAL_DATA", "G"]]],
            level: 1,
            run: ({ socket, player }) => {
                selectedEntities(player, (o) => {
                    if (o.bond) return;
                    let message = [
                        `Selected ${o.name || (o.isPlayer ? "an unnamed player" : "a")}${(o.name || o.isPlayer) ? "'s" : ""} ${o.label} (ID #${o.id}).`,
                        `Score: ${o.skill.score};`,
                        `Build: ${o.skill.raw.join("/")};`
                    ]
                    socket.talk("Em", 20_000, JSON.stringify(message));
                });
            }
        },
        {
            name: "Infinite level up",
            keys: [[["KEY_SPECIAL_LEVEL_UP", "N"]]],
            level: 1,
            operatorAccess: true,
            run: ({ player }) => {
                player.body.skill.score += player.body.skill.levelScore;
                player.body.skill.maintain();
                player.body.refreshBodyAttributes();
            }
        },
        {
            name: "Police",
            keys: [[["KEY_SPECIAL_POLICE", "P"]]],
            level: 1,
            run: ({ player, gameManager }) => {
                player.body.define({ RESET_UPGRADES: true, BATCH_UPGRADES: false });
                player.body.define('arrasPolice');
                player.body.name = "ARRAS POLICE";
                player.body.skill.set(player.body.skill.caps);
                player.body.syncTurrets();
                player.body.refreshBodyAttributes();
                player.body.FOV = 10000;
                gameManager.socketManager.broadcast("WOOP WOOP! That's the sound of da police!");
            }
        },
        {
            name: "Blast",
            keys: [[["KEY_SPECIAL_BLAST", "B"]]],
            level: 1,
            operatorAccess: true,
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
            level: 1,
            operatorAccess: true,
            run: ({ socket, level, operator }) => {
                let lines = [
                    "Help menu:",
                    ...commands
                    .filter(
                        (c) =>
                        (level >= c.level || (operator && c.operatorAccess)) && !c.hidden && c.attribute
                    )
                    .map(command => makeHelpList(command, false))
                ];
                if (useOldMenu) {
                    for (let line of lines.reverse()) {
                        socket.talk("m", 15_000, line);
                    }
                } else socket.talk("Em", 15_000, JSON.stringify(lines));
            },
        },
        {
            name: "All team minimap",
            keys: [[["KEY_SPECIAL_ATTRIBUTE", "A"], ["KEY_SPECIAL_ATTRIBUTE_MINIMAP_TEAM", "T"]]],
            attribute: true,
            level: 1,
            operatorAccess: true,
            run: ({ socket }) => {
                socket.status.seesAllTeams = !socket.status.seesAllTeams;
                socket.status.needsNewBroadcast = true;
                socket.talk("m", 5_000, `${socket.status.seesAllTeams ? "Enabled" : "Disabled"} Attribute: all team minimap.`);
            },
        },
        {
            name: "Hidden from minimap",
            keys: [[["KEY_SPECIAL_ATTRIBUTE", "A"], ["KEY_SPECIAL_ATTRIBUTE_MINIMAP_HIDE", "M"]]],
            attribute: true,
            level: 1,
            operatorAccess: true,
            run: ({ socket, player }) => {
                player.body.allowedOnMinimap = !player.body.allowedOnMinimap;
                socket.talk("m", 5_000, `${!player.body.allowedOnMinimap ? "Enabled" : "Disabled"} Attribute: hidden from minimap.`);
            }
        },
        {
            name: "Shown on leaderboard",
            keys: [[["KEY_SPECIAL_ATTRIBUTE", "A"], ["KEY_SPECIAL_ATTRIBUTE_LEADERBOARD", "L"]]],
            attribute: true,
            level: 1,
            operatorAccess: true,
            run: ({ player, socket }) => {
                player.body.settings.leaderboardable = !player.body.settings.leaderboardable;
                socket.talk("m", 5_000, `${player.body.settings.leaderboardable ? "Enabled" : "Disabled"} Attribute: shown on leaderboard.`);
            }
        },
        {
            name: "No reload cooldown",
            keys: [[["KEY_SPECIAL_ATTRIBUTE", "A"], ["KEY_SPECIAL_ATTRIBUTE_RELOAD", "C"]]],
            attribute: true,
            level: 1,
            operatorAccess: true,
            run: ({ socket, player }) => {
                player.body.settings.hasNoReloadDelay = !player.body.settings.hasNoReloadDelay;
                socket.talk("m", 5_000, `${player.body.settings.hasNoReloadDelay ? "Enabled" : "Disabled"} Attribute: no reload cooldown.`);
            }
        },
        {
            name: "No recoil",
            keys: [[["KEY_SPECIAL_ATTRIBUTE", "A"], ["KEY_SPECIAL_ATTRIBUTE_RECOIL", "R"]]],
            attribute: true,
            level: 1,
            operatorAccess: true,
            run: ({ socket, player }) => {
                player.body.settings.hasNoRecoil = !player.body.settings.hasNoRecoil;
                socket.talk("m", 5_000, `${player.body.settings.hasNoRecoil ? "Enabled" : "Disabled"} Attribute: no recoil.`);
            }
        },
        {
            name: "No arena boundary force",
            keys: [[["KEY_SPECIAL_ATTRIBUTE", "A"], ["KEY_SPECIAL_ATTRIBUTE_ARENA_EDGE", "O"]]],
            attribute: true,
            level: 1,
            operatorAccess: true,
            run: ({ socket, player }) => {
                player.body.settings.canGoOutsideRoom = !player.body.settings.canGoOutsideRoom;
                socket.talk("m", 5_000, `${player.body.settings.canGoOutsideRoom ? "Enabled" : "Disabled"} Attribute: no arena boundary force.`);
            }
        },
        {
            name: "Pass through walls",
            keys: [[["KEY_SPECIAL_ATTRIBUTE", "A"], ["KEY_SPECIAL_ATTRIBUTE_WALL", "W"]]],
            attribute: true,
            level: 1,
            operatorAccess: true,
            run: ({ socket }) => {
              socket.player.body.ac = !socket.player.body.ac;
              socket.talk("m", 5_000, `${socket.player.body.ac ? "Enabled" : "Disabled"} Attribute: pass through walls.`);
            },
        },
        {
            name: "Accepts score",
            keys: [[["KEY_SPECIAL_ATTRIBUTE", "A"], ["KEY_SPECIAL_ATTRIBUTE_SCORE", "K"]]],
            attribute: true,
            level: 1,
            operatorAccess: true,
            run: ({ socket }) => {
                socket.player.body.settings.acceptsScore = !socket.player.body.settings.acceptsScore;
                socket.talk("m", 5_000, `Accepting score is now ${socket.player.body.settings.acceptsScore ? "enabled" : "disabled"}.`);
            }
        },
        {
            name: "Ban",
            keys: [[["KEY_SPECIAL_BAN", "O"]]],
            level: 2,
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
                                y: player.target.y + player.body.y,
                            }) < o.size * 1
                        ) {
                            found = o;
                        }
                    };
                    return found;
                }
                let selected = selectPlayer(player);
                if (selected && selected.socket) {
                    const perms = selected.socket.permissions || {};
                    if (perms && perms.level > 2) {
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
            level: 1,
            operatorAccess: true,
            run: ({ player }) => {
                player.body.FOV *= 5 / 4;
            }
        },
        {
            name: "Zoom-in",
            keys: [[["KEY_SPECIAL_ZOOM_IN", "+"]]],
            level: 1,
            operatorAccess: true,
            run: ({ player }) => {
                player.body.FOV *= 4 / 5;
            }
        },
        {
            name: "Clear zoom",
            keys: [[["KEY_SPECIAL_ZOOM_CLEAR", "0"]]],
            level: 1,
            operatorAccess: true,
            run: ({ player }) => {
                player.body.FOV = 1.02;
            }
        },
        {
            name: "Smaller",
            keys: [[["KEY_SPECIAL_SMALLER", ","]]],
            level: 1,
            operatorAccess: true,
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
            level: 1,
            operatorAccess: true,
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
            level: 1,
            operatorAccess: true,
            run: ({ player }) => {
                selectedEntities(player, (o) => {
                    if (o.isPlayer && o.socket) {
                        if (o.hasOperator) {
                            if (o.socket.permissions && o.socket.permissions.level > 1) {
                                player.body.sendMessage("You do not have sufficient permission to promote this player!");
                            } else {
                                o.hasOperator = false;
                                o.socket.talk("m", 8_000, "You are no longer an operator.");
                                player.body.sendMessage(
                                    "Operator access removed to " + `${o.name === "" ? "A unnamed Player" : o.name}` + "."
                                );
                            }
                            return 1;
                        }
                        o.hasOperator = true;
                        o.socket.status.hasOperator = true;
                        o.socket.talk("m", 8_000, "You are now an operator.");
                        player.body.sendMessage("Operator access given to " + `${o.name === "" ? "A unnamed Player" : o.name}` + ".");
                    }
                });
            },
        },
        {
            name: "Demote user",
            keys: [[["KEY_SPECIAL_DEMOTE", "'"]]],
            level: 1,
            operatorAccess: true,
            run: ({ player }) => {
                selectedEntities(player, (o) => {
                    if (o.isPlayer && o.socket) {
                        if (o.hasOperator) {
                            if (o.socket.permissions && o.socket.permissions.level > 1) {
                                player.body.sendMessage("You do not have sufficient permission to demote this player!");
                            } else {
                                o.hasOperator = false;
                                o.socket.talk("m", 8_000, "You are no longer an operator.");
                                player.body.sendMessage(
                                    "Operator access removed to " + `${o.name === "" ? "A unnamed Player" : o.name}` + "."
                                );
                            }
                            return 1;
                        }
                        o.hasOperator = true;
                        o.socket.status.hasOperator = true;
                        o.socket.talk("m", 8_000, "You are now an operator.");
                        player.body.sendMessage("Operator access given to " + `${o.name === "" ? "A unnamed Player" : o.name}` + ".");
                    }
                });
            },
        },
        {
            name: "Unknown",
            keys: [[["default", "Unknown"]]],
            level: 1,
            operatorAccess: true,
            hidden: true,
            run: ({ socket }) => {
                if (!socket.status.givenOperatorTips) {
                    socket.status.givenOperatorTips = true;
                    socket.talk("m", 10_000, "Press ` + ¹ or ` + / for help.");
                }
            }
        },
    ];
    global.runKeyCommand = (socket, codes) => {
        if (!socket?.player?.body) return 1;
      
        let permsLevel = socket.permissions?.level;
        if (!permsLevel) permsLevel = 0;
        if (!codes.length) codes = ["default"];
        let command = commands.find((command) =>
          command.keys.some((keys) =>
            keys.every((key, index) => key[0] === codes[index])
          )
        );
        if (command && (permsLevel >= command.level || (command.operatorAccess && socket.player.body.hasOperator))) {
          try {
            command.run({
              socket,
              player: socket.player,
              level: permsLevel,
              operator: socket.player.body.hasOperator,
              gameManager: global.gameManager,
            });
            socket.player.body.refreshBodyAttributes();
            socket.player.body.minimapColor = "lime";
          } catch (e) {
            console.error(`${command.name.toLowerCase()} key command error`, e);
          }
        }
    };
}


// If you dont want to add the key commands, just uncomment the return line.
// return;
init();
