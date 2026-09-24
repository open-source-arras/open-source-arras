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
let panel = null;

async function api(method, route, body = null, key = "panel-key") {
    let headers = { ...(body ? { "Content-Type": "application/json" } : {}) };
    if (key) headers.Authorization = "Bearer " + key;
    let response = await fetch(panel + route, {
        method,
        headers,
        body: body ? JSON.stringify(body) : null
    });
    return { status: response.status, json: await response.json() };
}

describe("permission panel", () => {
    before(async() => {
        dataDir = fs.mkdtempSync(path.join(os.tmpdir(), "osa-panel-"));
        control = await startControl({
            port: 0,
            bind: "127.0.0.1",
            panelPort: 0,
            dataDir,
            keys: { node: "node-key", bot: "bot-key" },
            pepper: "test-pepper",
            panelKey: "panel-key"
        });
        panel = control.panelUrl;
        assert.match(panel, /^http:\/\/127\.0\.0\.1:/);
    });

    after(async() => {
        if (control) await control.close();
        fs.rmSync(dataDir, { recursive: true, force: true });
    });

    it("serves the panel files", async() => {
        let index = await fetch(panel + "/");
        assert.equal(index.status, 200);
        assert.match(index.headers.get("content-type"), /text\/html/);
        assert.match(await index.text(), /Control Permissions/);
        let js = await fetch(panel + "/admin.js");
        assert.equal(js.status, 200);
        assert.match(js.headers.get("content-type"), /javascript/);
        let missing = await fetch(panel + "/nope.js");
        assert.equal(missing.status, 404);
    });

    it("locks the api behind the panel key", async() => {
        let missing = await api("GET", "/panel/users", null, null);
        assert.equal(missing.status, 401);
        let wrong = await api("GET", "/panel/users", null, "nope");
        assert.equal(wrong.status, 401);
        let challenged = await fetch(panel + "/panel/users");
        assert.equal(challenged.headers.get("www-authenticate"), "Bearer");
        let ok = await api("GET", "/panel/users");
        assert.equal(ok.status, 200);
    });

    it("answers malformed input with 400, never 500", async() => {
        let badQuery = await fetch(panel + "/panel/secrets?discordId=%", { headers: { Authorization: "Bearer panel-key" } });
        assert.equal(badQuery.status, 400);
        let badId = await fetch(panel + "/panel/types/%", { method: "DELETE", headers: { Authorization: "Bearer panel-key" } });
        assert.equal(badId.status, 404);
    });

    it("blocks path traversal and non-get methods", async() => {
        let traversal = await fetch(panel + "/..%2f..%2findex.js");
        assert.ok([403, 404].includes(traversal.status));
        let post = await fetch(panel + "/", { method: "POST" });
        assert.equal(post.status, 405);
    });

    it("manages users with validation", async() => {
        let created = await api("POST", "/panel/users", { discordId: "555", type: "game-mod", flags: ["list.players"] });
        assert.equal(created.status, 200);
        assert.equal(created.json.user.type, "game-mod");
        assert.deepEqual(created.json.user.flags, ["list.players"]);
        let bad = await api("POST", "/panel/users", { discordId: "555", type: "nope", flags: [] });
        assert.equal(bad.status, 400);
        let badFlags = await api("POST", "/panel/users", { discordId: "555", flags: ["x".repeat(65)] });
        assert.equal(badFlags.status, 400);
        let missing = await api("POST", "/panel/users", {});
        assert.equal(missing.status, 400);
        let listed = await api("GET", "/panel/users");
        assert.ok(listed.json.users.some((u) => u.discordId === "555"));
    });

    it("lists secrets without ever showing them", async() => {
        let minted = await api("POST", "/panel/auth/code", { discordId: "556" });
        assert.equal(minted.json.ok, true);
        await control.perms.upsertUser({ discordId: "556", type: "beta-tester" });
        let redeemed = await control.auth.redeem(minted.json.code);
        assert.equal(redeemed.ok, true);
        let filtered = await api("GET", "/panel/secrets?discordId=556");
        assert.equal(filtered.json.secrets.length, 1);
        assert.equal(filtered.json.secrets[0].discordId, "556");
        assert.ok(!JSON.stringify(filtered.json).includes(redeemed.secret));
        let all = await api("GET", "/panel/secrets");
        assert.ok(all.json.secrets.length >= 1);
        assert.ok(all.json.secrets.every((s) => s.discordId));
    });

    it("mints codes redeemable over a node link", async() => {
        await control.perms.upsertUser({ discordId: "557", type: "beta-tester" });
        let minted = await api("POST", "/panel/auth/code", { discordId: "557" });
        assert.equal(minted.json.code.length, 8);
        let ws = new WebSocket(`ws://127.0.0.1:${control.port}/control`);
        await new Promise((resolve) => ws.on("open", resolve));
        ws.send(protocol.wrap("hello", { key: "node-key", kind: "node", nodeId: "panel1", info: {} }));
        let frames = [];
        ws.on("message", (raw) => frames.push(JSON.parse(raw.toString())));
        await new Promise((resolve) => setTimeout(resolve, 50));
        ws.send(protocol.wrap("authCode", { code: minted.json.code }));
        await new Promise((resolve) => setTimeout(resolve, 100));
        let result = frames.find((f) => f.type === "authCodeResult");
        assert.equal(result.data.ok, true);
        assert.equal(result.data.discordId, "557");
        ws.close();
    });

    it("lists types without allowing edits", async() => {
        let listed = await api("GET", "/panel/types");
        assert.equal(listed.status, 200);
        assert.equal(listed.json.types.length, 5);
        assert.ok(listed.json.types.some((t) => t.id === "player" && t.rank === 0));
        assert.ok(listed.json.types.some((t) => t.id === "developer" && t.rank === 7));
        let created = await api("POST", "/panel/types", { id: "helper", name: "Helper", rank: 2 });
        assert.equal(created.status, 404);
        let deleted = await api("DELETE", "/panel/types/player");
        assert.equal(deleted.status, 404);
        assert.equal((await api("GET", "/panel/types")).json.types.length, 5);
    });

    it("lists nodes without player rows", async() => {
        control.registry.hello("n1", { region: "T", gamemode: ["ffa"] });
        control.registry.heartbeat("n1", { players: 2, maxPlayers: 10, startedAt: Date.now() - 1000 });
        let listed = await api("GET", "/panel/nodes");
        assert.equal(listed.status, 200);
        assert.equal(listed.json.nodes.length, 1);
        assert.equal(listed.json.nodes[0].nodeId, "n1");
        assert.equal(listed.json.nodes[0].mode, "ffa");
        assert.equal(listed.json.nodes[0].players, 2);
        assert.deepEqual(Object.keys(listed.json.nodes[0]).sort(), ["maxPlayers", "mode", "nodeId", "players", "status", "uptimeMs"]);
    });

    it("works openly without a panel key", async() => {
        let bareDir = fs.mkdtempSync(path.join(os.tmpdir(), "osa-nokey-"));
        let bare = await startControl({
            port: 0,
            bind: "127.0.0.1",
            panelPort: 0,
            dataDir: bareDir,
            keys: { node: "node-key", bot: "bot-key" },
            pepper: "test-pepper"
        });
        try {
            let response = await fetch(bare.panelUrl + "/panel/users");
            assert.equal(response.status, 200);
            let page = await fetch(bare.panelUrl + "/");
            assert.equal(page.status, 200);
        } finally {
            await bare.close();
            fs.rmSync(bareDir, { recursive: true, force: true });
        }
    });
});
