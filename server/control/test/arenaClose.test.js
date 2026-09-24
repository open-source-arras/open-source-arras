let { describe, it, before, after } = require("node:test");
let assert = require("node:assert/strict");
let { gameServer } = require("../../game.js");
let { gameHandler } = require("../../game/index.js");

// Bare gameServer without the constructor: closeArena only touches a
// handful of fields, and booting a real server would bind sockets.
function bareServer(clients = []) {
    let server = Object.create(gameServer.prototype);
    server.arenaClosed = false;
    server.gamemode = "sandbox";
    server.nodeClient = null;
    server.socketManager = {
        clients,
        broadcast() {}
    };
    server.closeCalls = 0;
    server.close = function() {
        this.closeCalls++;
    };
    return server;
}

describe("arena close on an empty room", () => {
    let savedUtil;

    before(() => {
        savedUtil = global.util;
        global.util = {
            saveToLog() {},
            log() {}
        };
    });

    after(() => {
        global.util = savedUtil;
    });

    it("skips the closer sweep when nobody is online", () => {
        let server = bareServer([]);
        server.closeArena();
        assert.equal(server.closeCalls, 1, "close runs immediately");
        assert.equal(server.arenaClosed, true);
    });

    it("ignores a second closeArena while already closing", () => {
        let server = bareServer([]);
        server.closeArena();
        server.closeArena();
        assert.equal(server.closeCalls, 1);
    });

    it("keeps tick callbacks firing with zero clients", async() => {
        let saved = {
            gameManager: global.gameManager,
            Config: global.Config,
            syncedDelaysLoop: global.syncedDelaysLoop
        };
        let ticks = 0;
        let gameTicks = 0;
        global.syncedDelaysLoop = () => {
            ticks++;
        };
        global.Config = { enable_food: false, regenerate_tick: 50 };
        global.gameManager = {
            clients: [],
            arenaClosed: false,
            room: { cycleSpeed: 5 },
            roomLoop() {},
            gamemodeManager: { request() {} },
            gameSpeedCheckHandler: {
                update() {},
                onError(error) {
                    throw error;
                }
            },
            socketManager: { chatLoop() {} }
        };
        let handler = new gameHandler();
        handler.gameloop = () => {
            gameTicks++;
        };
        handler.maintainloop = () => {};
        handler.quickMaintainLoop = () => {};
        handler.regenHealthAndShield = () => {};
        handler.run();
        await new Promise((resolve) => setTimeout(resolve, 40));
        handler.stop();
        await new Promise((resolve) => setTimeout(resolve, 20));
        assert.ok(ticks > 0, "syncedDelaysLoop still runs when the room is empty");
        assert.equal(gameTicks, 0, "physics stays parked while open and empty");
        global.gameManager = saved.gameManager;
        global.Config = saved.Config;
        if (saved.syncedDelaysLoop === undefined) delete global.syncedDelaysLoop;
        else global.syncedDelaysLoop = saved.syncedDelaysLoop;
    });

    it("keeps simulating during an arena close with zero clients", async() => {
        let saved = {
            gameManager: global.gameManager,
            Config: global.Config,
            syncedDelaysLoop: global.syncedDelaysLoop
        };
        let gameTicks = 0;
        global.syncedDelaysLoop = () => {};
        global.Config = { enable_food: false, regenerate_tick: 50 };
        global.gameManager = {
            clients: [],
            arenaClosed: true,
            room: { cycleSpeed: 5 },
            roomLoop() {},
            gamemodeManager: { request() {} },
            gameSpeedCheckHandler: {
                update() {},
                onError(error) {
                    throw error;
                }
            },
            socketManager: { chatLoop() {} }
        };
        let handler = new gameHandler();
        handler.gameloop = () => {
            gameTicks++;
        };
        handler.maintainloop = () => {};
        handler.quickMaintainLoop = () => {};
        handler.regenHealthAndShield = () => {};
        handler.run();
        await new Promise((resolve) => setTimeout(resolve, 40));
        handler.stop();
        await new Promise((resolve) => setTimeout(resolve, 20));
        assert.ok(gameTicks > 0, "gameloop runs so arena closers can finish");
        global.gameManager = saved.gameManager;
        global.Config = saved.Config;
        if (saved.syncedDelaysLoop === undefined) delete global.syncedDelaysLoop;
        else global.syncedDelaysLoop = saved.syncedDelaysLoop;
    });
});
