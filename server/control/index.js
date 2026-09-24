// Assemble the control server. Configuration arrives as options only.
let crypto = require("crypto");
let fs = require("fs");
let http = require("http");
let path = require("path");
let { openStore } = require("./store/index.js");
let { migrateStore } = require("./store/schema.js");
let { createRegistry } = require("./registry.js");
let { createBans } = require("./bans.js");
let { createPermissions } = require("./permissions.js");
let { createAuth } = require("./auth.js");
let { createCommandBus } = require("./commands.js");
let { createHub, WS_PATH } = require("./hub.js");
let { createPanel } = require("./panel.js");

function isLoopback(bind) {
    return bind === "localhost" || bind === "127.0.0.1" || bind === "::1" ||
        bind.startsWith("127.") || bind.startsWith("::ffff:127.");
}

function randomKey() {
    return crypto.randomBytes(24).toString("base64url");
}

function loadPepper(dataDir, provided) {
    if (provided) return provided;
    let file = path.join(dataDir, ".pepper");
    try {
        let saved = fs.readFileSync(file, "utf8").trim();
        if (saved) return saved;
    } catch { /* first run, generate below */ }
    // Exclusive create: two processes booting at once must end up with one
    // pepper, or secrets stop resolving on one side.
    try {
        let pepper = randomKey();
        fs.writeFileSync(file, pepper + "\n", { mode: 0o600, flag: "wx" });
        return pepper;
    } catch {
        let saved = fs.readFileSync(file, "utf8").trim();
        if (saved) return saved;
        throw new Error("cannot read or create " + file);
    }
}

function loadKeys(dataDir, provided) {
    if (provided && provided.node && provided.bot) {
        return { keys: provided, devKeys: false };
    }
    let file = path.join(dataDir, "dev-keys.json");
    try {
        let saved = JSON.parse(fs.readFileSync(file, "utf8"));
        if (saved.node && saved.bot) return { keys: saved, devKeys: true };
    } catch { /* first run, generate below */ }
    try {
        let keys = { node: randomKey(), bot: randomKey() };
        fs.writeFileSync(file, JSON.stringify(keys, null, 4) + "\n", { mode: 0o600, flag: "wx" });
        return { keys, devKeys: true };
    } catch {
        let saved = JSON.parse(fs.readFileSync(file, "utf8"));
        if (saved.node && saved.bot) return { keys: saved, devKeys: true };
        throw new Error("cannot read or create " + file);
    }
}

// Shared by both entries so standalone and embedded agree. Placeholder
// values from the committed server/.env count as unset, mixed pairs throw.
function resolveKeysFromEnv(env = process.env) {
    let node = env.CONTROL_NODE_KEY;
    let bot = env.CONTROL_BOT_KEY;
    if (node === "ChangeControlNodeKey!") node = null;
    if (bot === "ChangeControlBotKey!") bot = null;
    if ((node && !bot) || (!node && bot)) {
        throw new Error("set both CONTROL_NODE_KEY and CONTROL_BOT_KEY, or neither for generated dev keys");
    }
    return node && bot ? { node, bot } : null;
}

async function startControl(options = {}) {
    let port = options.port ?? 4000;
    let bind = options.bind || "127.0.0.1";
    let dataDir = options.dataDir || path.join(__dirname, "data");
    fs.mkdirSync(dataDir, { recursive: true });

    let { keys, devKeys } = loadKeys(dataDir, options.keys);
    // Permission management stays loopback-only no matter what, so generated
    // keys on a public bind only deserve a warning, not a refusal.
    if (devKeys && options.server == null && !isLoopback(bind)) {
        console.warn("Control is using generated dev keys on a non-loopback bind. Set real CONTROL_NODE_KEY and CONTROL_BOT_KEY values.");
    }
    let pepper = loadPepper(dataDir, options.pepper);
    let now = options.now || (() => Date.now());
    let controlStartedAt = Date.now();

    let store = openStore({ databaseUrl: options.databaseUrl || "", filename: path.join(dataDir, "osa.db") });
    await migrateStore(store);
    let registry = createRegistry({ now, staleMs: options.staleMs, downMs: options.downMs, rowTtlMs: options.rowTtlMs });
    let bans = createBans(store, { now });
    let perms = createPermissions(store, { now });
    let auth = createAuth(store, pepper, { now, codeTtlMs: options.codeTtlMs, perms });

    let hub = null;
    let bus = createCommandBus({
        send: (nodeId, frame) => (hub ? hub.sendToNode(nodeId, frame) : false),
        now,
        commandTimeoutMs: options.commandTimeoutMs,
        commandRetries: options.commandRetries,
        dedupeMs: options.dedupeMs
    });
    hub = createHub({
        registry, bus, bans, perms, auth, keys,
        options: { now, controlStartedAt, logFile: path.join(dataDir, "control.log"), ...options.hub }
    });

    let server = options.server || null;
    if (server) {
        // Embedded in the game webserver, it owns every path but /control.
        hub.attach(server);
    } else {
        server = http.createServer((req, res) => {
            res.writeHead(404);
            res.end("Not found");
        });
        hub.attach(server);
        server.on("upgrade", (req, socket) => {
            if ((req.url || "").split("?")[0] !== WS_PATH) socket.destroy();
        });
    }

    // The standalone panel is a separate listener that only ever binds
    // loopback. No keys, reaching it means sitting at the machine or an ssh
    // tunnel. Embedded setups serve the panel from the game webserver
    // instead, where panel.js enforces loopback per request.
    let panelPort = options.panelPort ?? 4001;
    let staticDir = options.staticDir || path.join(__dirname, "../../public/ext/admin");
    let panel = createPanel({ registry, perms, auth, hub, staticDir, panelKey: options.panelKey || null });
    let panelServer = null;
    let panelAddress = null;
    if (options.panel !== false) {
        panelServer = http.createServer((req, res) => panel.handler(req, res));
    }

    let sweepTimer = setInterval(() => hub.sweep(), options.sweepMs || 5000);

    let address = null;
    try {
        if (!options.server) {
            await new Promise((resolve, reject) => {
                server.on("error", reject);
                server.listen(port, bind, () => resolve());
            });
            address = server.address();
        }
        if (panelServer) {
            await new Promise((resolve, reject) => {
                panelServer.on("error", reject);
                panelServer.listen(panelPort, "127.0.0.1", () => resolve());
            });
            panelAddress = panelServer.address();
        }
    } catch(err) {
        // Close a half-booted listener so it does not squat the port.
        clearInterval(sweepTimer);
        await hub.close().catch(() => {});
        if (address) await new Promise((resolve) => server.close(() => resolve()));
        if (panelAddress) await new Promise((resolve) => panelServer.close(() => resolve()));
        await store.close().catch(() => {});
        throw err;
    }

    async function close() {
        clearInterval(sweepTimer);
        await hub.close();
        if (!options.server) await new Promise((resolve) => server.close(() => resolve()));
        if (panelServer) await new Promise((resolve) => panelServer.close(() => resolve()));
        await store.close();
    }

    return {
        close,
        port: address ? address.port : null,
        bind,
        devKeys,
        controlStartedAt,
        url: address ? `http://${bind}:${address.port}` : null,
        panelPort: panelAddress ? panelAddress.port : null,
        panelUrl: panelAddress ? `http://127.0.0.1:${panelAddress.port}` : null,
        panelHandler: (req, res) => panel.handler(req, res),
        registry,
        bans,
        perms,
        auth,
        bus,
        hub
    };
}

// The panel password. Placeholder counts as unset, there is no default
// that works: set a unique value or the panel api stays offline.
function resolvePanelKey(env = process.env) {
    let key = env.CONTROL_PANEL_KEY;
    if (!key || key === "ChangeControlPanelKey!") return null;
    return key;
}

module.exports = { startControl, resolveKeysFromEnv, resolvePanelKey };
