let { describe, it, before, after } = require("node:test");
let assert = require("node:assert/strict");
let fs = require("fs");
let os = require("os");
let path = require("path");
let { startControl } = require("../index.js");
let { NodeClient } = require("../../game/nodeClient.js");
let { dispatch } = require("../../game/commands/index.js");

let control = null;
let dataDir = null;

function fakeGame() {
    return {
        webProperties: { id: "test", maxPlayers: 10 },
        region: "T",
        serverhost: "h",
        location: "l",
        gamemode: ["ffa"],
        startedAt: Date.now(),
        arenaClosed: false,
        socketManager: {
            clients: [],
            broadcast(message) {
                this.lastSay = message;
            }
        },
        closeArena() {
            this.restarted = true;
        }
    };
}

function fakeSocket(id, level = 10) {
    return {
        id,
        status: {},
        kicked: null,
        kick(reason) {
            this.kicked = reason;
        },
        player: {
            body: {
                name: "Tester",
                team: 0,
                label: "Tank",
                skill: {
                    score: 100,
                    level,
                    points: 5,
                    reset() {
                        this.score = 0;
                        this.points = 0;
                        this.level = 1;
                    },
                    get levelScore() {
                        return 10;
                    },
                    maintain() {
                        this.level += 1;
                        this.points += 1;
                        return true;
                    }
                },
                upgrades: ["twin"],
                dead: false,
                kill() {
                    this.dead = true;
                },
                isDead() {
                    return this.dead;
                },
                define(set) {
                    if (typeof set === "string") this.label = set;
                    if (set && set.RESET_UPGRADES) this.upgrades = [];
                },
                refreshBodyAttributes() {}
            }
        }
    };
}

async function waitFor(fn, message) {
    for (let i = 0; i < 40; i++) {
        if (fn()) return;
        await new Promise((resolve) => setTimeout(resolve, 50));
    }
    throw new Error("timed out: " + message);
}

describe("node client", () => {
    let game = null;
    let node = null;
    let logs = [];

    before(async() => {
        dataDir = fs.mkdtempSync(path.join(os.tmpdir(), "osa-node-"));
        control = await startControl({
            port: 0,
            bind: "127.0.0.1",
            panelPort: 0,
            dataDir,
            keys: { node: "node-key", bot: "bot-key" },
            pepper: "test-pepper"
        });
        process.env.CONTROL_URL = `ws://127.0.0.1:${control.port}/control`;
        process.env.CONTROL_NODE_KEY = "node-key";
        global.gameManager = fakeGame();
        global.setSyncedTimeout = (fn) => fn();
        game = global.gameManager;
        node = new NodeClient(game);
        node.log = (...args) => logs.push(args.join(" "));
        node.warn = (...args) => logs.push(args.join(" "));
        node.connect();
        await waitFor(() => node.connected, "node hello");
    });

    after(async() => {
        delete process.env.CONTROL_URL;
        delete process.env.CONTROL_NODE_KEY;
        if (node) node.close();
        if (control) await control.close();
        delete global.gameManager;
        delete global.setSyncedTimeout;
        fs.rmSync(dataDir, { recursive: true, force: true });
    });

    it("logs connects, drops, and commands", async() => {
        assert.ok(logs.some((line) => line.includes("Connecting to")), "connect logged");
        assert.ok(logs.some((line) => line.includes("Connected as test")), "hello logged");
        node.ws.terminate();
        await waitFor(() => logs.some((line) => line.includes("Link lost")), "drop logged");
        await waitFor(() => node.connected, "reconnected");
        let summary = await control.bus.dispatch({
            type: "server.restart",
            targets: { test: [] },
            args: {},
            actor: { source: "test" }
        });
        assert.equal(summary.ok, true);
        assert.ok(logs.some((line) => line.includes("server.restart")), "command logged");
    });

    it("logs key rejections without retry storms", async() => {
        process.env.CONTROL_NODE_KEY = "wrong";
        let badLogs = [];
        let bad = new NodeClient(game);
        bad.log = (...args) => badLogs.push(args.join(" "));
        bad.warn = (...args) => badLogs.push(args.join(" "));
        bad.connect();
        await waitFor(() => badLogs.some((line) => line.includes("Key rejected")), "rejection logged");
        assert.ok(!badLogs.some((line) => line.includes("Link lost")), "no drop line for rejects");
        bad.close();
        assert.equal(bad.connected, false);
        process.env.CONTROL_NODE_KEY = "node-key";
    });

    it("registers and heartbeats with a roster", async() => {
        let socket = fakeSocket("s1");
        game.socketManager.clients.push(socket);
        node.heartbeat();
        await waitFor(() => control.registry.snapshot().players.length === 1, "player batch");
        let snap = control.registry.snapshot();
        assert.equal(snap.nodes[0].nodeId, "test");
        assert.equal(snap.players[0].name, "Tester");
        assert.equal(snap.players[0].score, 100);
        assert.equal(snap.players[0].ip, null);
        game.socketManager.clients.length = 0;
    });

    it("exchanges auth codes and resolves keys", async() => {
        await control.perms.upsertUser({ discordId: "4242", type: "beta-tester" });
        let minted = await control.auth.mintCode("4242");
        let redeemed = await node.authCode(minted.code);
        assert.equal(redeemed.ok, true);
        let identity = await node.resolveKey(redeemed.secret);
        assert.equal(identity.rank, 4);
        assert.equal(identity.type, "beta-tester");
        assert.equal(await node.resolveKey("junk"), null);
    });

    it("drops cached identities when the arena cycles", async() => {
        await control.perms.upsertUser({ discordId: "4242", type: "game-admin" });
        let minted = await control.auth.mintCode("4242");
        let redeemed = await node.authCode(minted.code);
        let first = await node.resolveKey(redeemed.secret);
        assert.equal(first.rank, 6);
        // Still warm: a second lookup would not leave the node.
        assert.equal(node.resolveCache.size > 0, true);
        node.refreshPerms();
        assert.equal(node.resolveCache.size, 0);
        let second = await node.resolveKey(redeemed.secret);
        assert.equal(second.rank, 6);
        assert.equal(second.type, "game-admin");
    });

    it("executes bus commands and acks", async() => {
        let summary = await control.bus.dispatch({
            type: "server.restart",
            targets: { test: [] },
            args: {},
            actor: { source: "test" }
        });
        assert.equal(summary.ok, true);
        assert.equal(game.restarted, true);
        let bad = await control.bus.dispatch({
            type: "player.frobnicate",
            targets: { test: [] },
            args: {},
            actor: {}
        });
        assert.equal(bad.results[0].error, "unsupported");
    });

    it("applies pushed banlists", async() => {
        await control.bans.addBan({ ip: "1.2.3.4", reason: "spam", actor: "test" });
        await control.hub.pushBanlist();
        await waitFor(() => node.checkBan("1.2.3.4") !== null, "banlist push");
        assert.equal(node.checkBan("5.6.7.8"), null);
    });
});

describe("node client config", () => {
    let savedUrl = process.env.CONTROL_URL;
    let savedKey = process.env.CONTROL_NODE_KEY;

    before(async() => {
        global.Config = { port: 3000 };
        delete process.env.CONTROL_URL;
        delete process.env.CONTROL_NODE_KEY;
    });

    after(async() => {
        delete global.Config;
        if (savedUrl !== undefined) process.env.CONTROL_URL = savedUrl;
        else delete process.env.CONTROL_URL;
        if (savedKey !== undefined) process.env.CONTROL_NODE_KEY = savedKey;
        else delete process.env.CONTROL_NODE_KEY;
    });

    function client() {
        return new NodeClient({ webProperties: { id: "x", maxPlayers: 1 } });
    }

    it("defaults to loopback control", async() => {
        assert.equal(client().controlUrl(), "ws://127.0.0.1:3000/control");
    });

    it("prefers env over config over default", async() => {
        global.Config.control = { url: "ws://127.0.0.1:4000/control", nodeKey: "config-key" };
        assert.equal(client().controlUrl(), "ws://127.0.0.1:4000/control");
        process.env.CONTROL_URL = "ws://127.0.0.1:4001/control";
        assert.equal(client().controlUrl(), "ws://127.0.0.1:4001/control");
        delete process.env.CONTROL_URL;
    });

    it("upgrades remote ws to wss and resolves keys in order", async() => {
        global.Config.control = { url: "ws://control.local:4000/control", nodeKey: "config-key" };
        assert.equal(client().controlUrl(), "wss://control.local:4000/control");
        assert.equal(client().nodeKey(), "config-key");
        process.env.CONTROL_NODE_KEY = "env-key";
        assert.equal(client().nodeKey(), "env-key");
        delete process.env.CONTROL_NODE_KEY;
        // Placeholder counts as unset, and with an empty data dir there is
        // no file fallback either.
        let empty = fs.mkdtempSync(path.join(os.tmpdir(), "osa-nokey-"));
        process.env.CONTROL_DATA_DIR = empty;
        process.env.CONTROL_NODE_KEY = "ChangeControlNodeKey!";
        global.Config.control = {};
        assert.equal(client().nodeKey(), null);
        delete process.env.CONTROL_NODE_KEY;
        delete process.env.CONTROL_DATA_DIR;
        fs.rmSync(empty, { recursive: true, force: true });
    });
});

describe("temp ban list", () => {
    it("holds temp bans apart from the shared list and expires them", () => {
        let { NodeClient } = require("../../game/nodeClient.js");
        let client = new NodeClient(fakeGame());
        client.setBanlist([]);
        assert.equal(client.checkBan("1.1.1.1"), null);
        client.addTempBan("1.1.1.1", "spam", Date.now() + 60_000);
        assert.ok(client.checkBan("1.1.1.1"));
        assert.equal(client.bans.length, 0);
        client.addTempBan("1.1.1.1", "spam", Date.now() - 1);
        assert.equal(client.checkBan("1.1.1.1"), null);
        client.addTempBan("2.2.2.2", "spam", Infinity);
        assert.ok(client.checkBan("2.2.2.2"));
        client.clearTempBans();
        assert.equal(client.checkBan("2.2.2.2"), null);
    });

    it("matches ipv4-mapped ipv6 on either spelling", () => {
        let { NodeClient } = require("../../game/nodeClient.js");
        let client = new NodeClient(fakeGame());
        client.setBanlist([{ ip: "::ffff:127.0.0.1", reason: "spam", expiresAt: null }]);
        assert.ok(client.checkBan("::ffff:127.0.0.1"));
        assert.ok(client.checkBan("127.0.0.1"));
        assert.equal(client.checkBan("9.9.9.9"), null);
        client.setBanlist([]);
        client.addTempBan("::ffff:1.2.3.4", "spam", Date.now() + 60_000);
        assert.ok(client.checkBan("1.2.3.4"));
        assert.ok(client.checkBan("::FFFF:1.2.3.4"));
    });
});

describe("command dispatcher", () => {
    let game = null;

    before(async() => {
        game = fakeGame();
        global.gameManager = game;
        global.setSyncedTimeout = (fn) => fn();
        global.Config = { spawn_class: "basic" };
    });

    after(async() => {
        delete global.gameManager;
        delete global.setSyncedTimeout;
        delete global.Config;
    });

    it("runs player commands against bodies", async() => {
        let socket = fakeSocket("s1");
        let veteran = fakeSocket("s2", 60);
        game.socketManager.clients.push(socket, veteran);
        let reset = await dispatch(game, { type: "player.resetScore", target: { playerIds: ["s1", "s2", "gone"] }, args: {} });
        assert.equal(reset.ok, true);
        assert.equal(socket.player.body.skill.score, 26263);
        assert.equal(socket.player.body.skill.points > 0, true);
        assert.equal(socket.player.body.skill.level, 45);
        assert.equal(socket.player.body.label, "basic");
        assert.deepEqual(socket.player.body.upgrades, []);
        assert.equal(veteran.player.body.skill.level, 60);
        let kill = await dispatch(game, { type: "player.kill", target: { playerIds: ["s1"] }, args: {} });
        assert.equal(kill.ok, true);
        assert.equal(socket.player.body.dead, true);
        let kick = await dispatch(game, { type: "player.kick", target: { playerIds: ["s1"] }, args: { reason: "out" } });
        assert.equal(kick.ok, true);
        assert.equal(socket.kicked, "out");
        game.socketManager.clients.length = 0;
    });

    it("tempbans through the node client only", async() => {
        let added = [];
        game.nodeClient = { addTempBan: (ip, reason, expiresAt) => added.push({ ip, reason, expiresAt }) };
        let socket = fakeSocket("s9");
        socket.ip = "9.9.9.9";
        game.socketManager.clients.push(socket);
        let banned = await dispatch(game, { type: "player.tempBan", target: { playerIds: ["s9"] }, args: { reason: "spam", durationMs: 600_000 } });
        assert.equal(banned.ok, true);
        assert.equal(added.length, 1);
        assert.equal(added[0].ip, "9.9.9.9");
        assert.ok(added[0].expiresAt > Date.now());
        delete game.nodeClient;
        let noNode = await dispatch(game, { type: "player.tempBan", target: { playerIds: ["s9"] }, args: { durationMs: 1 } });
        assert.equal(noNode.error, "unsupported");
        game.socketManager.clients.length = 0;
    });

    it("broadcasts messages to every player", async() => {
        let said = await dispatch(game, { type: "server.broadcast", target: {}, args: { message: "hello there" } });
        assert.equal(said.ok, true);
        assert.equal(game.socketManager.lastSay, "hello there");
        let empty = await dispatch(game, { type: "server.broadcast", target: {}, args: {} });
        assert.equal(empty.error, "bad_args");
    });

    it("restarts and rejects repeats", async() => {
        let restart = await dispatch(game, { type: "server.restart", target: {}, args: {} });
        assert.equal(restart.ok, true);
        assert.equal(game.restarted, true);
        game.arenaClosed = true;
        let again = await dispatch(game, { type: "server.restart", target: {}, args: {} });
        assert.equal(again.error, "already_restarting");
        game.arenaClosed = false;
        let unknown = await dispatch(game, { type: "nope", target: {}, args: {} });
        assert.equal(unknown.error, "unsupported");
    });
});
