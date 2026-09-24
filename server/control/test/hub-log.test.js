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
let lines = [];

function send(ws, type, data, id = null) {
    ws.send(protocol.wrap(type, data, id));
}

function nextFrame(ws) {
    return new Promise((resolve, reject) => {
        let timer = setTimeout(() => reject(new Error("frame timeout")), 3000);
        ws.once("message", (raw) => {
            clearTimeout(timer);
            resolve(JSON.parse(raw.toString()));
        });
    });
}

async function connect() {
    let ws = new WebSocket(`ws://127.0.0.1:${control.port}/control`);
    await new Promise((resolve, reject) => {
        ws.on("open", resolve);
        ws.on("error", reject);
    });
    return ws;
}

describe("hub info logs", () => {
    before(async() => {
        dataDir = fs.mkdtempSync(path.join(os.tmpdir(), "osa-log-"));
        control = await startControl({
            port: 0,
            bind: "127.0.0.1",
            panelPort: 0,
            panel: false,
            dataDir,
            keys: { node: "node-key", bot: "bot-key" },
            pepper: "test-pepper",
            hub: { log: (line) => lines.push(line) }
        });
        await control.perms.upsertUser({ discordId: "owner", type: "developer", flags: ["*"] });
    });

    after(async() => {
        if (control) await control.close();
        fs.rmSync(dataDir, { recursive: true, force: true });
    });

    it("logs connects, queries, and disconnects without secrets", async() => {
        let node = await connect();
        send(node, "hello", { key: "node-key", kind: "node", nodeId: "log1", info: {}, osaVersion: "test" });
        assert.equal((await nextFrame(node)).type, "helloAck");
        let bot = await connect();
        send(bot, "hello", { key: "bot-key", kind: "bot", discordId: "owner" });
        assert.equal((await nextFrame(bot)).type, "helloAck");
        send(bot, "query", { text: "servers ping", discordId: "owner" });
        assert.equal((await nextFrame(bot)).type, "queryResult");
        send(bot, "query", { text: "#log1 l", discordId: "nobody" });
        assert.equal((await nextFrame(bot)).type, "error");
        node.close();
        bot.close();
        await new Promise((resolve) => setTimeout(resolve, 100));
        let text = lines.join("\n");
        assert.match(text, /node "log1" connected/);
        assert.match(text, /bot connected/);
        assert.match(text, /query owner "servers ping" -> ping/);
        assert.match(text, /query nobody "#log1 l" -> forbidden/);
        assert.match(text, /node "log1" disconnected/);
        assert.match(text, /bot disconnected/);
        assert.ok(!/node-key|bot-key/.test(text));
    });

    it("persists lines to control.log", async() => {
        let file = path.join(dataDir, "control.log");
        await new Promise((resolve) => setTimeout(resolve, 100));
        let logged = fs.readFileSync(file, "utf8");
        assert.match(logged, /node "log1" connected/);
        assert.match(logged, /bot connected/);
        assert.ok(!/node-key|bot-key/.test(logged));
    });

    it("logs rejected hellos", async() => {
        let ws = await connect();
        let closed = new Promise((resolve) => ws.on("close", (code) => resolve(code)));
        send(ws, "hello", { key: "wrong", kind: "node", nodeId: "x" });
        assert.equal(await closed, 4401);
        assert.ok(lines.some((line) => line.includes("rejected node \"x\"")));
    });
});
