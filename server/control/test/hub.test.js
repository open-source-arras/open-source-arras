let { describe, it, before, after } = require("node:test");
let assert = require("node:assert/strict");
let fs = require("fs");
let os = require("os");
let path = require("path");
let WebSocket = require("ws");
let protocol = require("../protocol.js");
let { startControl } = require("../index.js");

let control = null;
let dataDir = null;
let base = null;

function send(ws, type, data, id = null) {
    ws.send(protocol.wrap(type, data, id));
}

function nextFrame(ws) {
    return new Promise((resolve, reject) => {
        if (ws.frames.length > 0) return resolve(ws.frames.shift());
        let timer = setTimeout(() => reject(new Error("frame timeout")), 3000);
        ws.waiters.push((frame) => {
            clearTimeout(timer);
            resolve(frame);
        });
    });
}

async function connect() {
    let ws = new WebSocket(`ws://127.0.0.1:${control.port}/control`);
    // Persistent queue, back-to-back frames must stay in order.
    ws.frames = [];
    ws.waiters = [];
    ws.on("message", (raw) => {
        let frame = JSON.parse(raw.toString());
        if (ws.waiters.length > 0) ws.waiters.shift()(frame);
        else ws.frames.push(frame);
    });
    await new Promise((resolve, reject) => {
        ws.on("open", resolve);
        ws.on("error", reject);
    });
    return ws;
}

async function helloNode(ws, nodeId = "epl", key = "node-key", caps = ["server.say", "player.kick"]) {
    send(ws, "hello", { key, kind: "node", nodeId, info: { region: "EU", gamemode: ["ffa"], caps }, osaVersion: "test" });
    let ack = await nextFrame(ws);
    assert.equal(ack.type, "helloAck");
    let banlist = await nextFrame(ws);
    assert.equal(banlist.type, "banlist");
    return { ack, banlist };
}

async function helloOwner(ws) {
    send(ws, "hello", { key: "bot-key", kind: "bot", discordId: "owner" });
    let ack = await nextFrame(ws);
    assert.equal(ack.type, "helloAck");
}

async function panelApi(method, route, body = null) {
    let response = await fetch(control.panelUrl + route, {
        method,
        headers: { Authorization: "Bearer panel-key", ...(body ? { "Content-Type": "application/json" } : {}) },
        body: body ? JSON.stringify(body) : null
    });
    return { status: response.status, json: await response.json() };
}

describe("control server", () => {
    before(async() => {
        dataDir = fs.mkdtempSync(path.join(os.tmpdir(), "osa-control-"));
        control = await startControl({
            port: 0,
            bind: "127.0.0.1",
            panelPort: 0,
            dataDir,
            keys: { node: "node-key", bot: "bot-key" },
            pepper: "test-pepper",
            panelKey: "panel-key"
        });
        base = `http://127.0.0.1:${control.port}`;
        await control.perms.upsertUser({ discordId: "owner", type: "developer", flags: ["*"] });
    });

    after(async() => {
        if (control) await control.close();
        fs.rmSync(dataDir, { recursive: true, force: true });
    });

    it("registers nodes and shows them to the owner bot", async() => {
        let node = await connect();
        await helloNode(node);
        send(node, "heartbeat", { players: 2, maxPlayers: 80, gameMode: ["ffa"], startedAt: Date.now() - 1000 });
        send(node, "event", { name: "playerJoin", player: { playerId: "p1", name: "Test", ip: "1.2.3.4", level: 5, score: 10 } });
        await new Promise((resolve) => setTimeout(resolve, 50));
        let owner = await connect();
        await helloOwner(owner);
        send(owner, "query", { text: "servers id=epl", discordId: "owner" });
        let nodes = await nextFrame(owner);
        assert.equal(nodes.type, "queryResult");
        assert.equal(nodes.data.rows.length, 1);
        assert.equal(nodes.data.rows[0].nodeId, "epl");
        send(owner, "query", { text: "#epl l", discordId: "owner" });
        let players = await nextFrame(owner);
        assert.equal(players.type, "queryResult");
        assert.equal(players.data.rows.length, 1);
        assert.equal(players.data.rows[0].ip, undefined);
        node.close();
        owner.close();
    });

    it("answers pipeline queries for bot clients", async() => {
        let node = await connect();
        await helloNode(node, "elb");
        send(node, "heartbeat", { players: 1, maxPlayers: 80, gameMode: ["maze"], startedAt: Date.now() - 3_699_900 });
        await new Promise((resolve) => setTimeout(resolve, 50));
        let admin = await connect();
        await helloOwner(admin);
        send(admin, "query", { text: "servers id=elb ping" });
        let result = await nextFrame(admin);
        assert.equal(result.type, "queryResult");
        assert.match(result.data.text, /Server #elb - mode maze - 1 player/);
        node.close();
        admin.close();
    });

    it("denies player lists without the flag", async() => {
        let bot = await connect();
        send(bot, "hello", { key: "bot-key", kind: "bot", discordId: "nobody" });
        await nextFrame(bot);
        send(bot, "query", { text: "servers id=elb l", discordId: "nobody" });
        let result = await nextFrame(bot);
        assert.equal(result.type, "error");
        assert.equal(result.data.error, "forbidden");
        bot.close();
    });

    it("dispatches restart and collects acks", async() => {
        let node = await connect();
        await helloNode(node, "say1", "node-key", ["server.restart"]);
        let commands = [];
        node.on("message", (raw) => {
            let frame = JSON.parse(raw.toString());
            if (frame.type === "command") {
                commands.push(frame);
                send(node, "commandAck", { commandId: frame.id, ok: true, result: "restarting" });
            }
        });
        let admin = await connect();
        await helloOwner(admin);
        send(admin, "query", { text: "#say1 restart", discordId: "owner" });
        let result = await nextFrame(admin);
        assert.equal(result.type, "commandResult");
        assert.equal(result.data.ok, true);
        assert.match(result.data.lines.join("\n"), /restart ok/);
        assert.equal(commands.length, 1);
        assert.equal(commands[0].data.type, "server.restart");
        node.close();
        admin.close();
    });

    it("broadcasts a message to the scoped server", async() => {
        let node = await connect();
        await helloNode(node, "bc1", "node-key", ["server.broadcast"]);
        let commands = [];
        node.on("message", (raw) => {
            let frame = JSON.parse(raw.toString());
            if (frame.type === "command") {
                commands.push(frame);
                send(node, "commandAck", { commandId: frame.id, ok: true, result: "broadcast" });
            }
        });
        let admin = await connect();
        await helloOwner(admin);
        send(admin, "query", { text: "#bc1 broadcast hello there", discordId: "owner" });
        let result = await nextFrame(admin);
        assert.equal(result.type, "commandResult");
        assert.equal(result.data.ok, true);
        assert.match(result.data.lines.join("\n"), /broadcast ok: bc1/);
        assert.equal(commands.length, 1);
        assert.equal(commands[0].data.type, "server.broadcast");
        assert.equal(commands[0].data.args.message, "hello there");
        send(admin, "query", { text: "#bc1 broadcast", discordId: "owner" });
        let empty = await nextFrame(admin);
        assert.equal(empty.type, "error");
        assert.equal(empty.data.error, "bad_args");
        node.close();
        admin.close();
    });

    it("sends bans to the server without storing them", async() => {
        let node = await connect();
        await helloNode(node, "ban1", "node-key", ["player.tempBan", "player.kick"]);
        let seen = [];
        node.on("message", (raw) => {
            let frame = JSON.parse(raw.toString());
            seen.push(frame);
            if (frame.type === "command") send(node, "commandAck", { commandId: frame.id, ok: true, result: "done" });
        });
        send(node, "event", { name: "playerJoin", player: { playerId: "p9", name: "Spammer", ip: "9.9.9.9" } });
        await new Promise((resolve) => setTimeout(resolve, 50));
        let admin = await connect();
        await helloOwner(admin);
        send(admin, "query", { text: "#ban1 l n~spammer ban spamming" });
        let result = await nextFrame(admin);
        assert.equal(result.type, "commandResult");
        assert.equal(result.data.ok, true);
        assert.match(result.data.lines.join("\n"), /tempban ok: Spammer \(ban1\)/);
        await new Promise((resolve) => setTimeout(resolve, 100));
        let temps = seen.filter((f) => f.type === "command" && f.data.type === "player.tempBan");
        assert.equal(temps.length, 1);
        assert.deepEqual(temps[0].data.target, { playerIds: ["p9"] });
        assert.equal(temps[0].data.args.durationMs, undefined);
        let kicks = seen.filter((f) => f.type === "command" && f.data.type === "player.kick");
        assert.equal(kicks.length, 1);
        let stored = await control.bans.listBans();
        assert.ok(!stored.some((ban) => ban.ip === "9.9.9.9"));
        node.close();
        admin.close();
    });

    it("keeps temporary bans node-local and off the shared list", async() => {
        let node = await connect();
        await helloNode(node, "ban2", "node-key", ["player.tempBan", "player.kick"]);
        let seen = [];
        node.on("message", (raw) => {
            let frame = JSON.parse(raw.toString());
            seen.push(frame);
            if (frame.type === "command") send(node, "commandAck", { commandId: frame.id, ok: true, result: "done" });
        });
        send(node, "event", { name: "playerJoin", player: { playerId: "p9", name: "Spammer", ip: "9.9.9.9" } });
        await new Promise((resolve) => setTimeout(resolve, 50));
        let admin = await connect();
        await helloOwner(admin);
        send(admin, "query", { text: "#ban2 l n~spammer ban spamming 10m" });
        let result = await nextFrame(admin);
        assert.equal(result.type, "commandResult");
        assert.equal(result.data.ok, true);
        assert.match(result.data.lines.join("\n"), /tempban ok: Spammer \(ban2\)/);
        await new Promise((resolve) => setTimeout(resolve, 100));
        let temps = seen.filter((f) => f.type === "command" && f.data.type === "player.tempBan");
        assert.equal(temps.length, 1);
        assert.equal(temps[0].data.args.durationMs, 600_000);
        assert.deepEqual(temps[0].data.target, { playerIds: ["p9"] });
        let pushes = seen.filter((f) => f.type === "banlist" && f.data.entries.some((e) => e.ip === "9.9.9.9"));
        assert.equal(pushes.length, 0);
        let stored = await control.bans.listBans();
        assert.ok(!stored.some((ban) => ban.ip === "9.9.9.9"));
        node.close();
        admin.close();
    });

    it("sends a scoped ip ban only to that server and kicks anyone on it", async() => {
        let scoped = await connect();
        await helloNode(scoped, "ban3", "node-key", ["player.tempBan", "player.kick"]);
        let elsewhere = await connect();
        await helloNode(elsewhere, "ban4", "node-key", ["player.tempBan", "player.kick"]);
        let scopedSeen = [];
        let elsewhereSeen = [];
        scoped.on("message", (raw) => {
            let frame = JSON.parse(raw.toString());
            scopedSeen.push(frame);
            if (frame.type === "command") send(scoped, "commandAck", { commandId: frame.id, ok: true, result: "done" });
        });
        elsewhere.on("message", (raw) => {
            let frame = JSON.parse(raw.toString());
            elsewhereSeen.push(frame);
            if (frame.type === "command") send(elsewhere, "commandAck", { commandId: frame.id, ok: true, result: "done" });
        });
        send(scoped, "event", { name: "playerJoin", player: { playerId: "p3", name: "Lurker", ip: "7.7.7.7" } });
        await new Promise((resolve) => setTimeout(resolve, 50));
        let admin = await connect();
        await helloOwner(admin);
        send(admin, "query", { text: "#ban3 ban 7.7.7.7" });
        let result = await nextFrame(admin);
        assert.equal(result.type, "commandResult");
        assert.equal(result.data.ok, true);
        assert.match(result.data.lines.join("\n"), /tempban ok: Lurker \(ban3\)/);
        await new Promise((resolve) => setTimeout(resolve, 100));
        let temps = scopedSeen.filter((f) => f.type === "command" && f.data.type === "player.tempBan");
        assert.equal(temps.length, 1);
        assert.equal(temps[0].data.args.ip, "7.7.7.7");
        assert.deepEqual(temps[0].data.target, { playerIds: ["p3"] });
        let kicks = scopedSeen.filter((f) => f.type === "command" && f.data.type === "player.kick");
        assert.equal(kicks.length, 1);
        assert.equal(kicks[0].data.target.playerIds.length, 1);
        assert.equal(elsewhereSeen.filter((f) => f.type === "command").length, 0);
        scoped.close();
        elsewhere.close();
        admin.close();
    });

    it("runs the auth code exchange", async() => {
        let minted = await panelApi("POST", "/panel/auth/code", { discordId: "777" });
        assert.equal(minted.json.ok, true);
        await control.perms.upsertUser({ discordId: "777", type: "developer" });
        let node = await connect();
        await helloNode(node, "auth1");
        send(node, "authCode", { code: minted.json.code });
        let redeemed = await nextFrame(node);
        assert.equal(redeemed.type, "authCodeResult");
        assert.equal(redeemed.data.ok, true);
        send(node, "resolveKey", { secret: redeemed.data.secret });
        let resolved = await nextFrame(node);
        assert.equal(resolved.type, "resolveKeyResult");
        assert.equal(resolved.data.valid, true);
        assert.equal(resolved.data.identity.rank, 7);
        node.close();
    });

    it("revokes secrets and pushes revocation", async() => {
        let minted = await panelApi("POST", "/panel/auth/code", { discordId: "888" });
        await control.perms.upsertUser({ discordId: "888", type: "beta-tester" });
        let node = await connect();
        await helloNode(node, "auth2");
        let frames = [];
        node.on("message", (raw) => frames.push(JSON.parse(raw.toString())));
        send(node, "authCode", { code: minted.json.code });
        let redeemed = await nextFrame(node);
        let hash = control.auth.hmacSecret(redeemed.data.secret);
        let revoked = await panelApi("POST", "/panel/auth/revoke", { hash });
        assert.equal(revoked.json.ok, true);
        await new Promise((resolve) => setTimeout(resolve, 100));
        assert.ok(frames.some((f) => f.type === "revokeKey" && f.data.hash === hash));
        assert.equal(await control.auth.resolveSecret(redeemed.data.secret), null);
        node.close();
    });

    it("closes connections with bad keys", async() => {
        let ws = await connect();
        let closed = new Promise((resolve) => ws.on("close", (code) => resolve(code)));
        send(ws, "hello", { key: "wrong", kind: "node", nodeId: "x" });
        assert.equal(await closed, 4401);
    });

    it("mints login codes for the bot", async() => {
        let bot = await connect();
        await helloOwner(bot);
        send(bot, "mintCode", { discordId: "4242" });
        let minted = await nextFrame(bot);
        assert.equal(minted.type, "mintCodeResult");
        assert.equal(minted.data.ok, true);
        assert.match(minted.data.code, /^[A-Z2-9]{8}$/);
        await control.perms.upsertUser({ discordId: "4242", type: "beta-tester" });
        let node = await connect();
        await helloNode(node, "mint1");
        send(node, "authCode", { code: minted.data.code });
        let redeemed = await nextFrame(node);
        assert.equal(redeemed.type, "authCodeResult");
        assert.equal(redeemed.data.ok, true);
        assert.equal(redeemed.data.discordId, "4242");
        node.close();
        bot.close();
    });

    it("serves nothing but control on the main port", async() => {
        let response = await fetch(base + "/");
        assert.equal(response.status, 404);
        let ws = new WebSocket(`ws://127.0.0.1:${control.port}/nope`);
        let closed = new Promise((resolve) => {
            ws.on("close", () => resolve(true));
            ws.on("error", () => resolve(true));
        });
        assert.equal(await closed, true);
    });
});
