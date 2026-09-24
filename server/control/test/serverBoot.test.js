let { describe, it, before, after } = require("node:test");
let assert = require("node:assert/strict");
let fs = require("fs");
let os = require("os");
let path = require("path");

// Boots the real server.js with no game workers. The only thing under test
// is the wiring: embedded control boots and its panel handler answers.
describe("server wiring", () => {
    let dataDir = null;

    function callPanel(url, ip = "127.0.0.1") {
        return new Promise((resolve) => {
            let req = {
                url,
                method: "GET",
                headers: {},
                socket: { remoteAddress: ip }
            };
            let res = {
                status: null,
                body: "",
                writeHead(code) {
                    this.status = code;
                },
                end(data) {
                    this.body = data || "";
                    resolve(this);
                }
            };
            global.controlHandle.panelHandler(req, res);
        });
    }

    before(async() => {
        dataDir = fs.mkdtempSync(path.join(os.tmpdir(), "osa-wire-"));
        process.env.CONTROL_DATA_DIR = dataDir;
        delete process.env.CONTROL_PANEL_KEY;
        let Config = require("../../../server/config.js");
        Config.port = 0;
        Config.servers = [];
        Config.startup_logs = false;
        require("../../../server/server.js");
        for (let i = 0; i < 100; i++) {
            if (global.controlHandle) break;
            await new Promise((resolve) => setTimeout(resolve, 100));
        }
        assert.ok(global.controlHandle, "embedded control booted");
    });

    after(async() => {
        delete process.env.CONTROL_DATA_DIR;
        if (global.controlHandle) await global.controlHandle.close();
        global.controlHandle = null;
        fs.rmSync(dataDir, { recursive: true, force: true });
    });

    it("serves panel routes openly by default", async() => {
        let users = await callPanel("/panel/users");
        assert.equal(users.status, 200);
        assert.deepEqual(JSON.parse(users.body), { ok: true, users: [] });
    });

    it("refuses non-loopback panel access", async() => {
        let foreign = await callPanel("/panel/users", "1.2.3.4");
        assert.equal(foreign.status, 403);
    });
});
