const prefix = "$";

/** COMMANDS **/
let commands = [
    {
        command: ["help"],
        description: "Show this help menu.",
        permissionLevel: 0,
        run: ({ socket }) => {
            let useOldMenu = false;
            let lines = [
                "Help menu:",
                ...commands.filter((c) => socket.status.permissionLevel >= permissionLevelValue(c.permissionLevel) && !c.hidden).map((c) => {
                    let cmdData = [c.command];
                    let commandText = cmdData.map((e) => e.map((name) => name).join(` or ${prefix} `)).join(" ")
                    let description = c.description ?? false;
                    let text = `- ${prefix} ${commandText}`;
                    if (description) text += ` - ${description}`;
                    return text;
                })
            ];
            if (useOldMenu) {
                for (let line of lines.reverse()) {
                    socket.talk("m", 15_000, line);
                }
            } else socket.talk("Em", 15_000, JSON.stringify(lines));
        }
    },
    {
        command: ["leaderboard", "b"],
        description: "Select the leaderboard to display.",
        permissionLevel: 0,
        run: ({ socket, args }) => {
            let sendAvailableLeaderboardMessage = () => {
                let lines = [
                    "Available leaderboards:",
                    ...leaderboards.map(lb => `- ${lb}`)
                ];
                socket.talk("Em", 10_000, JSON.stringify(lines));
            };

            const leaderboards = [
                "default",
                "players",
                "bosses",
                "global"
            ];
            const choice = args[0];

            if (!choice) {
                sendAvailableLeaderboardMessage(socket);
                return;
            }

            if (leaderboards.includes(choice)) {
                socket.status.selectedLeaderboard = choice;
                socket.status.forceNewBroadcast = true;
                socket.talk("m", 4_000, "Leaderboard changed.");
            } else {
                socket.talk("m", 4_000, "Unknown leaderboard.");
            }
        }
    },
    {
        command: ["toggle", "t"],
        description: "Enable or disable chat",
        permissionLevel: 0,
        run: ({ socket }) => {
            socket.status.disablechat = !socket.status.disablechat;
            socket.talk("m", 3_000, `In-game chat ${socket.status.disablechat ? "disabled" : "enabled"}.`);
        }
    },
    {
        command: ["auth"],
        hidden: true,
        permissionLevel: 0,
        run: ({ socket, args, gameManager }) => {
            let code = ((args[0] || "").trim() || "");
            if (!code) {
                socket.talk("m", 4_000, "Invalid command format.");
                return;
            }
            let nodeClient = gameManager.nodeClient;
            if (!nodeClient || !nodeClient.connected) {
                socket.talk("m", 4_000, "Invalid token.");
                return;
            }
            nodeClient.authCode(code).then((result) => {
                if (!result || !result.ok) {
                    socket.talk("m", 4_000, "Invalid token.");
                    return null;
                }
                return nodeClient.resolveKey(result.secret).then((identity) => ({ result, identity }));
            }).then((linked) => {
                if (!linked) return;
                if (global.gameManager.socketManager.clients.indexOf(socket) === -1) return;
                let identity = linked.identity || {
                    discordId: linked.result.discordId,
                    type: "player",
                    typeName: "Player",
                    rank: 0,
                    flags: [],
                    class: null,
                    nameColor: null,
                    spawnAs: null
                };
                gameManager.socketManager.applyControlIdentityNow(socket, identity);
                socket.talk("key", linked.result.secret);
                socket.talk("Em", 8_000, JSON.stringify([
                    "Authentication successful.",
                    "Warning: Do not install any userscript or paste anything into the browser console, as they can cause your account to be stolen."
                ]));
            }).catch(() => {
                socket.talk("m", 4_000, "Invalid token.");
            });
        }
    },
    {
        command: ["i"],
        description: "Show your linked Discord identity.",
        permissionLevel: 0,
        run: ({ socket }) => {
            if (!socket.discordId) {
                socket.talk("m", 4_000, "No linked account. Use $auth CODE.");
                return;
            }
            socket.talk("m", 8_000, `Identity: User ${socket.discordId}; Access Level: ${socket.status.permissionLevel || 0};`);
        }
    },
    {
        command: ["id"],
        description: "Show your player id.",
        permissionLevel: 0,
        hidden: true,
        run: ({ socket }) => {
            socket.talk("m", 4_000, `${socket.id}`);
        }
    },
    {
        command: ["arena"],
        description: "Manage the arena",
        hidden: true,
        permissionLevel: 3,
        run: ({ socket, args, gameManager }) => {
            let sendAvailableArenaMessage = () => {
                let lines = [
                    "Help menu:",
                    `- ${prefix} arena size dynamic - Make the size of the arena dynamic, depending on the number of players`,
                    `- ${prefix} arena size <width> <height> - Set the size of the arena`,
                    `- ${prefix} arena team <team> - Set the number of teams, from 0 (FFA) to 4 (4TDM)`,
                    `- ${prefix} arena spawnpoint [x] [y] - Set a location where all players spawn by default`,
                    `- ${prefix} arena close - Close the arena`
                ];
                if (!Config.sandbox) lines.splice(1, 1)
                socket.talk("Em", 10_000, JSON.stringify(lines));
            }
            if (!args[0]) sendAvailableArenaMessage(); else {
                switch (args[0]) {
                    case "size":
                        if (args[1] === "dynamic") {
                            if (!Config.sandbox) return socket.talk("m", 3_000, "This command is only available on sandbox.");
                            gameManager.room.settings.sandbox.do_not_change_arena_size = false;
                        } else {
                            if (!args[1] || !args[2]) return socket.talk("m", 3_000, "Invalid arguments.");
                            if (args[1] % 2 === 0 && args[2] % 2 === 0) {
                                if (Config.sandbox) gameManager.room.settings.sandbox.do_not_change_arena_size = true;
                                gameManager.updateBounds(args[1] * 30, args[2] * 30);
                            } else {
                                socket.talk("m", 3000, "Arena size must be even.");
                            }
                        }
                        break;
                    case "team":
                        if (!args[1]) return socket.talk("m", 3_000, "Invalid argument.");
                        if (args[1] === "0") {
                            Config.mode = "ffa";
                            Config.teams = null;
                            socket.rememberedTeam = undefined;
                        } else {
                            Config.mode = "tdm";
                            Config.teams = args[1];
                            socket.rememberedTeam = undefined;
                        }
                        break;
                    case "spawnpoint":
                        if (!args[1]) {
                            global.spawnPoint = undefined;
                            socket.talk("m", 4_000, "Spawnpoint removed.");
                        } else if (!args[2]) {
                            return socket.talk("m", 3_000, "Invalid arguments.");
                        } else {
                            global.spawnPoint = {
                                x: parseInt(args[1] * 30),
                                y: parseInt(args[2] * 30)
                            };
                            socket.talk("m", 4_000, "Spawnpoint set.");
                        }
                        break;
                    case "close":
                        util.warn(`${socket.player.body.name === "" ? `An unnamed player (ip: ${socket.ip})` : socket.player.body.name} has closed the arena.`);
                        gameManager.closeArena();
                        break;
                    default:
                        socket.talk("m", 4_000, "Unknown subcommand.");
                }
            }
        }
    },
    {
        command: ["broadcast"],
        description: "Broadcast a message to all players.",
        permissionLevel: 2,
        hidden: true,
        run: ({ args, socket }) => {
            if (!args[0]) {
                socket.talk("m", 5_000, "No message specified.");
            } else {
                gameManager.socketManager.broadcast(args.join(" "));
            }
        }
    },
    {
        command: ["define"],
        description: "Change your tank.",
        permissionLevel: 7,
        hidden: true,
        run: ({ args, socket }) => {
            if (!args[0]) {
                socket.talk("m", 5_000, "No entity specified.");
            } else {
                socket.player.body.define({RESET_UPGRADES: true, BATCH_UPGRADES: false});
                socket.player.body.define(args[0]);
                socket.talk("m", 5_000, `Changed to ${socket.player.body.label}`);
            }
        }
    },
    {
        command: ["level"],
        description: "Change your level.",
        permissionLevel: 2,
        hidden: true,
        run: ({ args, socket }) => {
            if (!args[0]) {
                socket.talk("m", 5_000, "No level specified.");
            } else {
                socket.player.body.define({ LEVEL: args[0] });
                socket.talk("m", 5_000, `Changed to level ${socket.player.body.level}`);
            }
        }
    },
    {
        command: ["team"],
        description: "Change your team.", // player teams are -1 through -8, dreads are -10, room is -100 and enemies is -101
        permissionLevel: 2,
        hidden: true,
        run: ({ args, socket }) => {
            if (!args[0]) {
                socket.talk("m", 5_000, "No team specified.");
            } else {
                socket.player.body.define({ COLOR: getTeamColor(args[0]), TEAM: args[0] });
                socket.talk("m", 5_000, `Changed to team ${socket.player.body.team}`);
            }
        }
    },
    {
        command: ["developer", "dev", "d"],
        description: "Developer commands, go troll some players or just take a look for yourself.",
        permissionLevel: 7,
        run: ({ socket, args, gameManager }) => {
            let sendAvailableDevCommandsMessage = () => {
                let lines = [
                    "Help menu:",
                    "- $ (developer / dev) reloaddefs - reloads definitions."
                ];
                socket.talk("Em", 10_000, JSON.stringify(lines));
            }
            let command = args[0];
            if (command === "reloaddefs" || command === "redefs" || command === "r") {
                /* IMPORT FROM (defsReloadCommand.js) */
                if (!global.reloadDefinitionsInfo) {
                    global.reloadDefinitionsInfo = {
                        lastReloadTime: 1
                    };
                }
                // Rate limiter for anti-lag
                let time = performance.now();
                let sinceLastReload = time - global.reloadDefinitionsInfo.lastReloadTime;
                if (sinceLastReload < 5000) {
                    socket.talk("m", Config.popup_message_duration, `Wait ${Math.floor((5000 - sinceLastReload) / 100) / 10} seconds and try again.`);
                    return;
                }
                // Set the timeout timer ---
                lastReloadTime = time;

                // Remove function so all for(let x in arr) loops work
                delete Array.prototype.remove;

                // Before we purge the class, we are going to stop the game interval first
                gameManager.gameHandler.stop();

                // Now we can purge Class
                Class = {};
                classMap.clear();

                // Log it.
                util.warn("Reloading all definitions");

                // Purge all cache entries of every file in definitions
                for (let file in require.cache) {
                    if (!file.includes("definitions") || file.includes(__filename)) continue;
                    delete require.cache[file];
                }

                // Load all definitions
                gameManager.reloadDefinitions();

                // Put the removal function back
                Array.prototype.remove = function(index) {
                    if (index === this.length - 1) return this.pop();
                    let r = this[index];
                    this[index] = this.pop();
                    return r;
                };

                // Redefine all tanks and bosses
                for (let entity of entities.values()) {
                    // If it's a valid type, and it's not a turret
                    if (!["tank", "miniboss", "food"].includes(entity.type)) continue;
                    if (entity.bond) continue;

                    let entityDefs = JSON.parse(JSON.stringify(entity.defs));
                    // Save color to put it back later
                    let entityColor = entity.color.compiled;

                    // Redefine all properties and update values to match
                    entity.upgrades = [];
                    entity.define(entityDefs);
                    for (let instance of entities.values()) {
                        if (
                            instance.settings.clearOnMasterUpgrade &&
                            instance.master.id === entity.id
                        ) {
                            instance.kill();
                        }
                    }
                    entity.skill.update();
                    entity.syncTurrets();
                    entity.refreshBodyAttributes();
                    entity.color.interpret(entityColor);
                }

                // Tell the command sender
                socket.talk("m", Config.popup_message_duration, "Successfully reloaded all definitions.");


                // Erase mockups so it can rebuild.
                mockupData = [];
                mockupMap = {};
                
                // Load all mockups if enabled in configuration
                if (Config.load_all_mockups) global.loadAllMockups(false);

                setTimeout(() => { // Let it sit for a second.
                    // Erase cached mockups for each connected clients.
                    gameManager.clients.forEach(socket => {
                        socket.status.mockupData = socket.initMockupList();
                        socket.status.selectedLeaderboard2 = socket.status.selectedLeaderboard;
                        socket.status.selectedLeaderboard = "stop";
                        socket.status.entitySent?.clear();
                        socket.talk("RE"); // Also reset the global.entities in the client so it can refresh.
                        if (Config.load_all_mockups) {
                            for (let i = 0; i < mockupData.length; i++) {
                                socket.talk("M", mockupData[i].index, JSON.stringify(mockupData[i]));
                            } 
                        }
                        socket.status.selectedLeaderboard = socket.status.selectedLeaderboard2;
                        delete socket.status.selectedLeaderboard2;
                        socket.talk("CC"); // Clear cache
                    });
                    // Log it again.
                    util.log("[INFO]: Successfully reloaded all definitions");
                    gameManager.gameHandler.run();
                }, 1000)
            } else sendAvailableDevCommandsMessage();
        }
    }
]

/** COMMANDS RUN FUNCTION **/
function runCommand(socket, message, gameManager) {
    if (!message.startsWith(prefix) || !socket?.player?.body) return;

    let args = message.slice(prefix.length).trimStart().split(/\s+/);
    let commandName = args.shift();
    let command = commands.find((command) => command.command.includes(commandName));
    if (command) {
        if (socket.status.permissionLevel >= permissionLevelValue(command.permissionLevel)) {
            try {
                command.run({ socket, message, args, gameManager: gameManager });
            } catch(e) {
                console.error("Error while running ", commandName);
                console.error(e);
                socket.talk("m", 5_000, "An error occurred while running this command.");
            }
        } else socket.talk("m", 5_000, "You do not have access to this command.");
    } else socket.talk("m", 5_000, "Unknown command.");

    return true;
}
global.addChatCommand = function(command) {
    if (!command.command || !command.run) {
        throw new Error("Invalid command format. A command must have at least a 'command' and a 'run' property.");
    }
    if (!Array.isArray(command.command)) {
        throw new Error("Invalid command format. The 'command' property must be an array of strings.");
    }
    if (commands.find(c => c.command.some(cmd => command.command.includes(cmd)))) {
        throw new Error("A command with this name already exists.");
    }
    commands.push(command);
}


/** CHAT MESSAGE EVENT **/
module.exports = ({ Events }) => {
    Events.on("chatMessage", ({ socket, message, preventDefault, gameManager }) => {
        if (message.startsWith(prefix)) {
            preventDefault();
            runCommand(socket, message, gameManager);
        }
    });
};