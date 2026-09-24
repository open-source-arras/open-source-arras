// npm run control: load server/.env like server/server.js, then boot
// the hub on its own port plus the loopback panel.
let fs = require("fs");
let path = require("path");

let dotenv = require("../lib/dotenv.js");
try {
    let parsed = dotenv(fs.readFileSync(path.join(__dirname, "../.env")).toString());
    for (let key in parsed) {
        if (process.env[key] === undefined) process.env[key] = parsed[key];
    }
} catch {
    console.log("No server/.env found, using process environment only.");
}

let { startControl, resolveKeysFromEnv, resolvePanelKey } = require("./index.js");

function argValue(name) {
    let index = process.argv.indexOf(name);
    return index === -1 ? null : process.argv[index + 1];
}

async function main() {
    let keys = resolveKeysFromEnv();
    if (keys) {
        try {
            if (process.env.CONTROL_NODE_KEYS_JSON) keys.nodeKeys = JSON.parse(process.env.CONTROL_NODE_KEYS_JSON);
        } catch {
            console.warn("Ignoring malformed CONTROL_NODE_KEYS_JSON.");
        }
    }
    let control = await startControl({
        port: Number(argValue("--port") || process.env.CONTROL_PORT || 4000),
        bind: argValue("--bind") || process.env.CONTROL_BIND || "127.0.0.1",
        panelPort: Number(argValue("--panel-port") || process.env.CONTROL_PANEL_PORT || 4001),
        dataDir: argValue("--data") || process.env.CONTROL_DATA_DIR || path.join(__dirname, "data"),
        databaseUrl: process.env.DATABASE_URL || "",
        pepper: process.env.CONTROL_PEPPER || null,
        panelKey: resolvePanelKey(),
        keys
    });
    console.log(`Control server listening on ${control.bind}:${control.port}${control.devKeys ? " (generated dev keys, loopback only)" : ""}`);
    console.log(`Control log at ${path.join(argValue("--data") || process.env.CONTROL_DATA_DIR || path.join(__dirname, "data"), "control.log")}`);
    console.log(`Permission panel on ${control.panelUrl} (loopback only, reach it over ssh -L on split setups)`);
    for (let signal of ["SIGINT", "SIGTERM"]) {
        process.on(signal, async() => {
            await control.close();
            process.exit(0);
        });
    }
}

main().catch((err) => {
    console.error(err.message || err);
    process.exit(1);
});
