import { inspect } from "util";
import { runInNewContext } from "vm";
import { entities, Config, classMap, Class, mockupData, mockupMap } from "../../loaders/global";
import { gameManager } from "../../game";

function isLegalName(str) {
    return str.match(/^[$_\p{ID_Start}][$\p{ID_Continue}]*$/u);
}

function stringify(obj) {
    switch (typeof obj) {
        case "undefined":
        case "string":
        case "boolean":
        case "number":
        case "bigint":
            return inspect(obj);
        case "function":
        {
            const lines = obj.toString()
                .split("\n");
            const space = lines[lines.length - 1].match(/^\s*/d).indices[0][1];
            return lines.map((line, i) => {
                if (i === 0) {
                    return line;
                }
                return line.slice(Math.min(line.match(/^\s*/d).indices[0][1], space));
            }).join("\n");
        }
        case "object":
            if (obj === null) {
                return "null";
            }
            if (Array.isArray(obj)) {
                return obj.length === 0 ? "[]" : `[ ${obj.map((value) => stringify(value)).join(", ")} ]`;
            }
            return `{\n${Object.entries(obj)
                .map(([key, obj]) => {
                    const value = stringify(obj);
                    if (typeof obj === "function" && value.startsWith(obj.name)) {
                        return value;
                    } else {
                        return `${isLegalName(key) ? key : `["${key}"]`}: ${value}`;
                    }
                })
                .join(",\n")
                .split("\n")
                .map((line) => " ".repeat(4) + line)
                .join("\n")}\n}`;
    }
}

class Editor {
    constructor(gameServer) {
        this.gameServer = gameServer;
    }
    connect(ws, req) {
        const queryIndex = req.url.indexOf("?");
        const token = queryIndex >= 0 ? req.url.slice(queryIndex + 1) : "";

        ws.verified = Config.editor && token && this.gameServer.socketManager.permissionsDict[token]?.allowEditor === true;

        ws.on("message", (message) => this.incoming(ws, message));
    }
    async incoming(ws, message) {
        try {
            var request = JSON.parse(message.toString());
        } catch {
            ws.close();
            return;
        }

        const response = {
            id: request.id,
            ok: true
        };

        if (ws.verified) {
            switch (request.type) {
                case "getDefinitions":
                    response.data = `const Class = {};\n\n${
                        Object.entries(Class)
                            .map(([key, obj]) => `Class${isLegalName(key) ? `.${key}` : `["${key}"]`} = ${stringify(obj)};`)
                            .join("\n")
                    }\n\nexport default Class;`;
                    break;
                case "setDefinitions":
                    try {
                        const context = {
                            console,
                            Config,
                            ...(await import("../../lib/definitions/constants")),
                            ...(await import("../../lib/definitions/facilitators")),
                            g: (await import("../../lib/definitions/gunvals")),
                            preset: (await import("../../lib/definitions/presets"))
                        };
                        const code = `${request.data.replaceAll("export default Class", "")}\nClass;`;
                        const definitions = runInNewContext(code, context);

                        delete Array.prototype.remove;
                        gameManager.gameHandler.stop();

                        classMap.clear();

                        for (const [key, value] of Object.entries(definitions)) {
                            Class[key] = value;
                        }

                        let i = 0;
                        for (const key in Class) {
                            if (!Object.prototype.hasOwnProperty.call(Class, key)) {
                                continue;
                            }
                            Class[key].index = i;
                            classMap.set(i++, key);
                        }

                        Array.prototype.remove = function(index) {
                            if (index === this.length - 1) {
                                return this.pop();
                            }
                            const r = this[index];
                            this[index] = this.pop();
                            return r;
                        };

                        try {
                            for (const entity of entities.values()) {
                                if (!["tank", "miniboss", "food"].includes(entity.type)) {
                                    continue;
                                }
                                if (entity.bond) {
                                    continue;
                                }

                                const entityDefs = structuredClone(entity.defs);
                                const entityColor = entity.color.compiled;

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
                        } catch (e) {
                            console.error("Failed to update definitions:", e);
                            response.ok = false;
                        }

                        mockupData = [];
                        mockupMap = {};

                        if (Config.load_all_mockups) {
                            global.loadAllMockups(false);
                        }

                        await new Promise((resolve) => setTimeout(resolve, 1000));

                        try {
                            gameManager.clients.forEach((socket) => {
                                socket.status.mockupData = socket.initMockupList();
                                socket.status.selectedLeaderboard2 = socket.status.selectedLeaderboard;
                                socket.status.selectedLeaderboard = "stop";
                                socket.status.entitySent?.clear();
                                socket.talk("RE");
                                if (Config.load_all_mockups) {
                                    for (let i = 0; i < mockupData.length; i++) {
                                        socket.talk("M", mockupData[i].index, JSON.stringify(mockupData[i]));
                                    }
                                }
                                socket.status.selectedLeaderboard = socket.status.selectedLeaderboard2;
                                delete socket.status.selectedLeaderboard2;
                                socket.talk("CC");
                            });
                        } catch (e) {
                            console.error("Failed to update definitions:", e);
                            response.ok = false;
                        }
                        gameManager.gameHandler.run();
                    } catch (e) {
                        console.error("Definitions parsing error:", e);
                        response.ok = false;
                    }
                    break;
                default:
                    response.ok = false;
                    break;
            }
        } else {
            response.ok = false;
        }

        ws.send(JSON.stringify(response));
    }
}

export default { Editor };
