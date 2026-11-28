import { Config } from "../config";
import { gameManager } from "../game";
import { time, warn, log } from "../lib/util";
import { classMap, setPermissionLevel, mockupData, getTeamColor, entities, permissionLevelValue, loadAllMockups, Class, mockupMap } from "../loaders/global";

const prefix = "$";

function formatCommandArguments(argumentSpec) {
    if (!argumentSpec?.length) {
        return "";
    }
    const alternatives = argumentSpec.map((argument) => Array.isArray(argument) ? argument.map((parameter) => `<${parameter}>`).join(" ") : argument);
    return alternatives.length === 1 ? alternatives[0] : `<${alternatives.join("|")}>`;
}

const commands = [
    {
        command: ["help"],
        permissionLevel: 0,
        run: ({ socket }) => {
            const lines = [
                "Help menu:",
                ...commands.filter((c) => socket.status.permissionLevel >= permissionLevelValue(c.permissionLevel) && !c.hidden).map((c) => {
                    const usage = c.arguments ? ` ${formatCommandArguments(c.arguments)}` : c.usage ? ` ${c.usage}` : "";
                    let text = `- ${prefix} ${c.command.join(` or ${prefix} `)}${usage}`;
                    if (c.description) {
                        text += ` - ${c.description}`;
                    }
                    return text;
                })
            ];
            socket.talk("Em", 15_000, JSON.stringify(lines));
        }
    },
    {
        command: ["leaderboard", "b"],
        description: "Select the leaderboard to display",
        permissionLevel: 0,
        run: ({ socket, args }) => {
            const leaderboards = [
                "default",
                "players",
                "bosses",
                "global"
            ];
            const sendAvailableLeaderboardMessage = () => {
                const lines = [
                    "Available leaderboards:",
                    ...leaderboards.map((lb) => `- ${lb}`)
                ];
                socket.talk("Em", 10_000, JSON.stringify(lines));
            };

            const choice = args[0];

            if (!choice) {
                sendAvailableLeaderboardMessage();
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
        command: ["channel", "chat", "c"],
        description: "Select the channel your messages are sent to",
        permissionLevel: 0,
        run: ({ socket, args }) => {
            const channels = ["global", "team"];
            const choice = args[0];

            if (channels.includes(choice)) {
                socket.status.selectedChannel = choice;
                socket.talk("m", 3_000, `You have switched to ${choice} chat.`);
            } else {
                socket.talk("m", 3_000, "Invalid chat.");
            }
        }
    },
    {
        command: ["afk", "a"],
        description: "Toggle AFK protection in your base",
        permissionLevel: 0,
        run: ({ socket }) => {
            if (socket.status.isAFK) {
                socket.status.isAFK = false;
                socket.talk("m", 5_000, "You are no longer AFK!");
                return;
            }
            const body = socket.player.body;
            if (!body.inBase()) {
                socket.talk("m", 5_000, "You must be inside your base to use this command!");
                return;
            }
            socket.status.isAFK = true;
            if (socket.player.command) {
                for (const key of ["up", "down", "left", "right", "lmb", "mmb", "rmb", "autofire", "autoalt", "override"]) {
                    socket.player.command[key] = false;
                }
            }
            socket.talk("m", 5_000, "You are now AFK!");
        }
    },
    {
        command: ["status", "s"],
        description: "Check when exactly the arena will be guaranteed to close",
        permissionLevel: 0,
        run: ({ socket }) => {
            const uptime = Math.floor(time() / 1000);
            const d = Math.floor(uptime / 86400);
            const h = Math.floor((uptime % 86400) / 3600);
            const m = Math.floor((uptime % 3600) / 60);
            const s = uptime % 60;
            const parts = [];
            if (d > 0) {
                parts.push(`${d}d`);
            }
            if (h > 0) {
                parts.push(`${h}h`);
            }
            if (m > 0) {
                parts.push(`${m}m`);
            }
            if (s > 0 || parts.length === 0) {
                parts.push(`${s}s`);
            }
            const lines = [
                `The arena has been open for ${parts.join(" ")} and can remain open for at most PLACEHOLDER.`, // TODO: Add a maximum amount of time a server can be open for.
                "Note that the arena may close sooner if it's inactive or if a minigame is won."
            ];
            socket.talk("Em", 15_000, JSON.stringify(lines));
        }
    },
    {
        command: ["report"],
        description: "Report the last 10 minutes of chat messages",
        permissionLevel: 0,
        run: ({ socket }) => {
            socket.talk("m", 15_000, "Placeholder command!!!");
        }
    },
    {
        command: ["clan"],
        permissionLevel: 0,
        hidden: true,
        run: ({ socket, args }) => {
            if (!Config.clan_wars) {
                socket.talk("m", 5_000, "This command is not available in this game mode!");
                return;
            }
            if (!args[0]) {
                socket.talk("m", 5_000, "Invalid clan tag.");
                return;
            }
            const input = args.join(" ").replace(/[[\]]/g, "").trim();
            if (!input) {
                socket.talk("m", 5_000, "Invalid clan tag.");
                return;
            }
            const name = socket.player.body.name;
            const match = name.match(/\[(.+?)\]/);
            const newName = match
                ? name.replace(/\[(.+?)\]/, `[${input}]`)
                : name ? `[${input}] ${name}` : `[${input}]`;
            if (newName.length > 24) {
                socket.talk("m", 5_000, "This clan tag will make your name too long!");
                return;
            }
            socket.player.body.name = newName;
            if (socket.player.body.originalName !== undefined) {
                socket.player.body.originalName = newName;
            }
        }
    },
    {
        command: ["chaos"],
        description: "Promote all players to Arena Conductor.",
        permissionLevel: 4,
        hidden: true,
        run: ({ socket, gameManager }) => {
            const clients = gameManager.socketManager.clients;
            let count = 0;
            for (const client of clients) {
                if (client.status?.permissionLevel === 0) {
                    setPermissionLevel(client, 1);
                    client.talk("m", 8_000, "You have been promoted to Arena Conductor!");
                    count++;
                }
            }
            socket.talk("m", 5_000, count ? `Promoted ${count} player${count === 1 ? "" : "s"} to Arena Conductor!` : "No players to promote.");
        }
    },
    {
        command: ["order"],
        description: "Demote all Arena Conductors to player.",
        permissionLevel: 4,
        hidden: true,
        run: ({ gameManager }) => {
            const clients = gameManager.socketManager.clients;
            for (const client of clients) {
                if (client.status?.permissionLevel === 1) {
                    setPermissionLevel(client, 0);
                    client.talk("m", 8_000, "You have been demoted to player!");
                }
            }
        }
    },
    {
        command: ["id"],
        description: "Show your player id.",
        permissionLevel: 0,
        hidden: true,
        run: ({ socket }) => {
            socket.talk("m", 15_000, `Your ID is ${socket.id}.`);
        }
    },
    {
        command: ["arena"],
        description: "Manage the arena",
        hidden: true,
        permissionLevel: 3,
        subcommands: [
            {
                command: "size",
                arguments: ["dynamic", ["width", "height"]],
                description: "Set the size of the arena, or scale it with the number of players"
            },
            {
                command: "team",
                arguments: [["team"]],
                description: "Set the number of teams, from 0 (FFA) to 4 (4TDM)"
            },
            {
                command: "spawnpoint",
                arguments: ["clear", "set", ["x", "y"]],
                description: "Set a location where all players spawn by default"
            },
            {
                command: "close",
                description: "Close the arena"
            },
            {
                command: "discoverable",
                arguments: ["true", "false"],
                description: "Choose whether this server can be displayed in the Sandbox Nexus"
            }
        ],
        run: ({ socket, args, gameManager, command }) => {
            const sendAvailableArenaMessage = () => {
                const lines = [
                    "Help menu:",
                    ...command.subcommands.map((subcommand) => {
                        const argumentsText = subcommand.arguments ? ` ${formatCommandArguments(subcommand.arguments)}` : "";
                        return `- ${prefix} arena ${subcommand.command}${argumentsText} - ${subcommand.description}`;
                    })
                ];
                socket.talk("Em", 10_000, JSON.stringify(lines));
            };
            if (!args[0]) {
                sendAvailableArenaMessage();
            } else {
                switch (args[0]) {
                    case "size":
                        if (args[1] === "dynamic") {
                            if (!Config.sandbox) {
                                return socket.talk("m", 3_000, "This command is only available on sandbox.");
                            }
                            gameManager.room.settings.sandbox.do_not_change_arena_size = false;
                        } else {
                            if (!args[1] || !args[2]) {
                                return socket.talk("m", 3_000, "Invalid arguments.");
                            }
                            if (args[1] % 2 === 0 && args[2] % 2 === 0) {
                                if (Config.sandbox) {
                                    gameManager.room.settings.sandbox.do_not_change_arena_size = true;
                                }
                                gameManager.updateBounds(args[1] * 30, args[2] * 30);
                            } else {
                                socket.talk("m", 3000, "Arena size must be even.");
                            }
                        }
                        break;
                    case "team":
                        if (!args[1]) {
                            return socket.talk("m", 3_000, "Invalid argument.");
                        }
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
                        switch (args[1]) {
                            case "set":
                                global.spawnPoint = {
                                    x: socket.player.body.x,
                                    y: socket.player.body.y
                                };
                                socket.talk("m", 4_000, "Spawnpoint set.");
                                break;
                            case "clear":
                                global.spawnPoint = undefined;
                                socket.talk("m", 4_000, "Spawnpoint removed.");
                                break;
                            default:
                                if (!args[2]) {
                                    return socket.talk("m", 3_000, "Invalid arguments.");
                                }
                                global.spawnPoint = {
                                    x: parseInt(args[1] * 30),
                                    y: parseInt(args[2] * 30)
                                };
                                socket.talk("m", 4_000, "Spawnpoint set.");
                        }
                        break;
                    case "discoverable": // WIP
                        if (args[1] !== "true" && args[1] !== "false") {
                            return socket.talk("m", 3_000, "Invalid arguments.");
                        }
                        socket.talk("This is WIP lol.");
                        break;
                    case "close":
                        warn(`${socket.player.body.name === "" ? `An unnamed player (ip: ${socket.ip})` : socket.player.body.name} has closed the arena.`);
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
        permissionLevel: 4,
        hidden: true,
        run: ({ args, socket, gameManager }) => {
            if (!args[0]) {
                socket.talk("m", 5_000, "No message specified.");
            } else {
                gameManager.socketManager.broadcast(args.join(" "));
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
        description: "Change your team.",
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
        command: ["join", "j"],
        description: "Connects you to another server",
        permissionLevel: 8,
        hidden: true,
        run: ({ args, socket }) => {
            if (!args[0]) {
                socket.talk("m", 5_000, "No server specified.");
                return;
            }
            const server = Config.servers.find(
                (s) => s.id === args[0]
            );
            if (!server) {
                socket.talk("m", 5_000, "Server not found.");
                return;
            }
            gameManager.socketManager.sendToServer(socket, `http://${server.host}`);
        }
    },
    {
        command: ["nexus", "n"],
        permissionLevel: 0,
        hidden: true,
        run: ({ socket }) => {
            if (!Config.sandbox) {
                socket.talk("m", 5_000, "You can only use this command in Sandbox.");
                return;
            }

            const nexusServer = Config.servers.find((s) => s.gamemode && s.gamemode.includes("sandbox_nexus"));
            if (!nexusServer) {
                socket.talk("m", 5_000, "Unable to find Sandbox Nexus.");
                return;
            }

            gameManager.socketManager.sendToServer(socket, `http://${nexusServer.host}`);
        }
    },
    {
        command: ["audit"],
        usage: "[time]",
        description: "View recent operator commands",
        permissionLevel: 1,
        run: ({ socket }) => {
            socket.talk("m", 15_000, "[WIP] Audit log for last 30 seconds: [WIP]");
        }
    },
    {
        command: ["developer", "dev", "d"],
        description: "Developer commands, go troll some players or just take a look for yourself.",
        permissionLevel: 8,
        run: ({ socket, args, gameManager }) => {
            const sendAvailableDevCommandsMessage = () => {
                const lines = [
                    "Help menu:",
                    `- ${prefix} developer define <entity> - Change your tank.`,
                    `- ${prefix} developer reload - Reloads definitions for this server.`
                ];
                socket.talk("Em", 10_000, JSON.stringify(lines));
            };
            const command = args[0];
            if (command === "define" || command === "d") {
                if (!args[1]) {
                    socket.talk("m", 5_000, "No entity specified.");
                } else {
                    socket.player.body.define({ RESET_UPGRADES: true, BATCH_UPGRADES: false });
                    socket.player.body.define(args[1]);
                }
            } else if (command === "reload" || command === "reloaddefs" || command === "redefs" || command === "r") {
                if (!global.reloadDefinitionsInfo) {
                    global.reloadDefinitionsInfo = {
                        lastReloadTime: 1
                    };
                }
                // Rate limiter for anti-lag
                const time = performance.now();
                const sinceLastReload = time - global.reloadDefinitionsInfo.lastReloadTime;
                if (sinceLastReload < 5000) {
                    socket.talk("m", Config.popup_message_duration, `Wait ${Math.floor((5000 - sinceLastReload) / 100) / 10} seconds and try again.`);
                    return;
                }
                global.reloadDefinitionsInfo.lastReloadTime = time;

                // Remove function so all for(let x in arr) loops work
                delete Array.prototype.remove;

                // Before we purge the class, we are going to stop the game interval first
                gameManager.gameHandler.stop();

                // Now we can purge Class
                Class = {};
                classMap.clear();

                // Log it.
                warn("Reloading all definitions");

                // Purge all cache entries of every file in definitions
                for (const file in require.cache) {
                    if (!file.includes("definitions") || file.includes(__filename)) {
                        continue;
                    }
                    delete require.cache[file];
                }

                // Load all definitions
                gameManager.reloadDefinitions();

                // Put the removal function back
                Array.prototype.remove = function(index) {
                    if (index === this.length - 1) {
                        return this.pop();
                    }
                    const r = this[index];
                    this[index] = this.pop();
                    return r;
                };

                // Redefine all tanks and bosses
                for (const entity of entities.values()) {
                    // If it's a valid type, and it's not a turret
                    if (!["tank", "miniboss", "food"].includes(entity.type)) {
                        continue;
                    }
                    if (entity.bond) {
                        continue;
                    }

                    const entityDefs = structuredClone(entity.defs);
                    // Save color to put it back later
                    const entityColor = entity.color.compiled;

                    // Redefine all properties and update values to match
                    entity.upgrades = [];
                    entity.define(entityDefs);
                    for (const instance of entities.values()) {
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
                if (Config.load_all_mockups) {
                    loadAllMockups(false);
                }

                setTimeout(() => { // Let it sit for a second.
                    // Erase cached mockups for each connected clients.
                    gameManager.clients.forEach((socket) => {
                        socket.status.mockupData = socket.initMockupList();
                        socket.status.selectedLeaderboard2 = socket.status.selectedLeaderboard;
                        socket.status.selectedLeaderboard = "stop";
                        socket.status.entitySent?.clear();
                        socket.talk("RE"); // Also reset the entities in the client so it can refresh.
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
                    log("[INFO]: Successfully reloaded all definitions");
                    gameManager.gameHandler.run();
                }, 1000);
            } else {
                sendAvailableDevCommandsMessage();
            }
        }
    }
];

function runCommand(socket, message) {
    if (!socket?.player?.body) {
        return;
    }
    const args = message.slice(prefix.length).trimStart().split(/\s+/);
    const name = args.shift();
    const command = commands.find((c) => c.command.includes(name));
    if (!command) {
        socket.talk("m", 5_000, "Unknown command.");
        return;
    }
    if (socket.status.permissionLevel < permissionLevelValue(command.permissionLevel)) {
        socket.talk("m", 5_000, "You do not have access to this command.");
        return;
    }
    try {
        command.run({ socket, message, args, gameManager, command });
    } catch (e) {
        console.error(`Error while running ${name}`);
        console.error(e);
        socket.talk("m", 5_000, "An error occurred while running this command.");
    }
}

export function handleChatCommand(socket, message) {
    if ("string" !== typeof message || !message.startsWith(prefix)) {
        return false;
    }
    runCommand(socket, message);
    return true;
}
