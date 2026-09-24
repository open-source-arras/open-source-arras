let { describe, it, before, after } = require("node:test");
let assert = require("node:assert/strict");
let fs = require("fs");
let http = require("http");
let os = require("os");
let path = require("path");
let WebSocket = require("ws");
let protocol = require("../protocol.js");
let { isLoopbackIp } = require("../panel.js");
let { startControl } = require("../index.js");

describe("loopback check", () => {
    it("accepts loopback forms and nothing else", async() => {
        assert.equal(isLoopbackIp("127.0.0.1"), true);
        assert.equal(isLoopbackIp("127.0.0.2"), true);
        assert.equal(isLoopbackIp("::1"), true);
        assert.equal(isLoopbackIp("::ffff:127.0.0.1"), true);
        assert.equal(isLoopbackIp("1.2.3.4"), false);
        assert.equal(isLoopbackIp("::ffff:1.2.3.4"), false);
        assert.equal(isLoopbackIp(""), false);
    });
});

describe("embedded control", () => {
    let dataDir = null;
    let gameServer = null;
    let control = null;
    let port = null;

    before(async() => {
        dataDir = fs.mkdtempSync(path.join(os.tmpdir(), "osa-embedded-"));
        // A stand-in game webserver, control shares it without touching
        // any other path.
        gameServer = http.createServer((req, res) => {
            res.writeHead(404);
            res.end("game");
        });
        gameServer.on("upgrade", (req, socket) => {
            if ((req.url || "").split("?")[0] === "/control") return;
            socket.destroy();
        });
        await new Promise((resolve) => gameServer.listen(0, "127.0.0.1", resolve));
        port = gameServer.address().port;
        control = await startControl({
            server: gameServer,
            panel: false,
            dataDir,
            keys: { node: "node-key", bot: "bot-key" },
            pepper: "test-pepper",
            panelKey: "panel-key"
        });
    });

    after(async() => {
        if (control) await control.close();
        await new Promise((resolve) => gameServer.close(() => resolve()));
        fs.rmSync(dataDir, { recursive: true, force: true });
    });

    it("answers node hellos on the shared server", async() => {
        let ws = new WebSocket(`ws://127.0.0.1:${port}/control`);
        await new Promise((resolve) => ws.on("open", resolve));
        let frames = [];
        ws.on("message", (raw) => frames.push(JSON.parse(raw.toString())));
        ws.send(protocol.wrap("hello", { key: "node-key", kind: "node", nodeId: "emb", info: {} }));
        await new Promise((resolve) => setTimeout(resolve, 100));
        assert.ok(frames.some((f) => f.type === "helloAck"));
        ws.close();
    });

    it("leaves other paths to the game server", async() => {
        let response = await fetch(`http://127.0.0.1:${port}/`);
        assert.equal(response.status, 404);
        assert.equal(await response.text(), "game");
    });

    it("serves the panel handler when mounted like server.js does", async() => {
        // Same shape as the /panel/* forwarding in server/server.js.
        let mounted = http.createServer((req, res) => {
            let pathname = (req.url || "").split("?")[0];
            if (pathname.startsWith("/panel/")) {
                control.panelHandler(req, res);
                return;
            }
            res.writeHead(404);
            res.end("game");
        });
        await new Promise((resolve) => mounted.listen(0, "127.0.0.1", resolve));
        let base = `http://127.0.0.1:${mounted.address().port}`;
        try {
            let created = await fetch(base + "/panel/users", {
                method: "POST",
                headers: { Authorization: "Bearer panel-key", "Content-Type": "application/json" },
                body: JSON.stringify({ discordId: "1", type: "beta-tester" })
            });
            assert.equal(created.status, 200);
            let listed = await fetch(base + "/panel/users", { headers: { Authorization: "Bearer panel-key" } });
            assert.ok((await listed.json()).users.some((u) => u.discordId === "1"));
            let denied = await fetch(base + "/panel/users");
            assert.equal(denied.status, 401);
            let other = await fetch(base + "/game-menu");
            assert.equal(other.status, 404);
        } finally {
            await new Promise((resolve) => mounted.close(() => resolve()));
        }
    });
});
