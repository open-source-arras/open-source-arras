// Outbound link from a game server to the control hub. The game never
// depends on it: every failure degrades to standalone play, and every
// reconnect re-sends the full roster to heal control in one frame.
let crypto = require("crypto");
let fs = require("fs");
let net = require("net");
let path = require("path");
let WebSocket = require("ws");

let KEY_TIMEOUT_MS = 4000;
let HEARTBEAT_MS = 5000;

function devKeysFile() {
    if (process.env.CONTROL_DATA_DIR) return path.join(process.env.CONTROL_DATA_DIR, "dev-keys.json");
    return path.join(__dirname, "../control/data/dev-keys.json");
}

function backoff(attempt) {
    let wait = Math.min(1000 * 2 ** attempt, 30_000);
    return wait / 2 + Math.random() * (wait / 2);
}

// Node's BlockList rejects IPv4-mapped IPv6 outright, and localhost players
// arrive exactly in that form (::ffff:127.0.0.1). Normalize both sides so a
// ban on either spelling matches either spelling.
function normalizeIp(ip) {
    let text = (ip || "").toString().trim().toLowerCase();
    if (text.startsWith("::ffff:")) text = text.slice("::ffff:".length);
    return text;
}

class NodeClient {
    constructor(gameManager) {
        this.gameManager = gameManager;
        this.nodeId = gameManager.webProperties.id;
        this.ws = null;
        this.connected = false;
        this.attempt = 0;
        this.timers = [];
        this.pending = new Map();
        this.resolveCache = new Map();
        this.seenCommands = new Map();
        this.bans = [];
        this.blocklist = new net.BlockList();
        this.clockOffset = 0;
        this.closed = false;
        this.keyWarned = false;
        this.lastCloseCode = null;
        this.banCount = -1;
    }

    log(message) {
        console.log("[control] " + message);
    }

    warn(message) {
        console.warn("[control] " + message);
    }

    controlUrl() {
        // Exported env wins, then server/config.js, then loopback default.
        let url = process.env.CONTROL_URL || (Config.control || {}).url || `ws://127.0.0.1:${Config.port}/control`;
        try {
            let parsed = new URL(url);
            let host = parsed.hostname.toLowerCase();
            let loopback = host === "localhost" || host === "127.0.0.1" || host === "::1" ||
                host.startsWith("127.") || host.startsWith("::ffff:127.");
            if (!loopback && parsed.protocol === "ws:") {
                parsed.protocol = "wss:";
                return parsed.toString();
            }
        } catch { /* keep the url as is, connect will fail loudly */ }
        return url;
    }

    nodeKey() {
        let key = process.env.CONTROL_NODE_KEY || (Config.control || {}).nodeKey;
        if (key && key !== "ChangeControlNodeKey!") return key;
        try {
            let saved = JSON.parse(fs.readFileSync(devKeysFile(), "utf8"));
            if (saved.node) return saved.node;
        } catch { /* control has not generated keys yet, retry on reconnect */ }
        return null;
    }

    later(ms, fn) {
        let timer = setTimeout(() => {
            this.timers = this.timers.filter((t) => t !== timer);
            if (!this.closed) fn();
        }, ms);
        this.timers.push(timer);
        return timer;
    }

    // Everything the public server list needs, so control can serve
    // getServers.json for local and remote nodes alike.
    listInfo() {
        let game = this.gameManager;
        return {
            host: game.host || "",
            port: typeof game.port === "number" ? game.port : 0,
            displayName: game.name || "Unknown",
            featured: !!game.featured,
            unlisted: !!game.unlisted,
            private: !!game.private,
            hidden: !!((game.serverProperties || {}).hidden)
        };
    }

    connect() {
        if (this.closed) return;
        let key = this.nodeKey();
        if (!key) {
            if (!this.keyWarned) {
                this.keyWarned = true;
                this.warn("No node key yet, retrying. Set CONTROL_NODE_KEY or let control generate dev keys.");
            }
            this.later(5000, () => this.connect());
            return;
        }
        this.log((this.attempt > 0 ? "Reconnecting to " : "Connecting to ") + this.controlUrl());
        let ws = new WebSocket(this.controlUrl());
        this.ws = ws;
        ws.on("open", () => {
            this.attempt = 0;
            ws.send(JSON.stringify({
                v: 1,
                type: "hello",
                id: crypto.randomUUID(),
                ts: Date.now(),
                data: {
                    key,
                    kind: "node",
                    nodeId: this.nodeId,
                    info: {
                        region: this.gameManager.region,
                        serverhost: this.gameManager.serverhost,
                        location: this.gameManager.location,
                        gamemode: this.gameManager.gamemode,
                        player_cap: this.gameManager.webProperties.maxPlayers,
                        caps: this.capabilities(),
                        ...this.listInfo()
                    },
                    osaVersion: this.osaVersion()
                }
            }));
        });
        ws.on("message", (raw) => this.onFrame(raw));
        ws.on("close", (code) => this.onClose(code));
        ws.on("error", () => { /* close follows on its own */ });
    }

    onClose(code) {
        if (this.closed) return;
        this.connected = false;
        this.ws = null;
        for (let [id, entry] of this.pending) {
            clearTimeout(entry.timer);
            entry.reject(new Error("control link lost"));
            this.pending.delete(id);
        }
        let wait = backoff(this.attempt);
        if (code === 4401) {
            if (this.lastCloseCode !== 4401) {
                this.warn("Key rejected by control. Fix the node key, retrying anyway.");
            }
        } else {
            this.warn(`Link lost, retrying in ${Math.round(wait / 1000)}s.`);
        }
        this.lastCloseCode = code;
        this.attempt++;
        this.later(wait, () => this.connect());
    }

    close() {
        this.closed = true;
        for (let timer of this.timers) clearTimeout(timer);
        this.timers = [];
        for (let [id, entry] of this.pending) {
            clearTimeout(entry.timer);
            entry.reject(new Error("control link closed"));
            this.pending.delete(id);
        }
        if (this.ws) {
            try {
                this.ws.terminate();
            } catch {
                // Already gone, nothing to do.
            }
            this.ws = null;
        }
    }

    capabilities() {
        try {
            return require("./commands/index.js").capabilities;
        } catch {
            return [];
        }
    }

    osaVersion() {
        try {
            return require("../../package.json").version;
        } catch {
            return "unknown";
        }
    }

    send(type, data, id = null) {
        if (!this.ws || this.ws.readyState !== 1) return false;
        try {
            this.ws.send(JSON.stringify({
                v: 1,
                type,
                id: id || crypto.randomUUID(),
                ts: Date.now(),
                data: data || {}
            }));
            return true;
        } catch {
            return false;
        }
    }

    // Request a correlated reply (resolveKeyResult, authCodeResult).
    request(type, data, timeoutMs = KEY_TIMEOUT_MS) {
        return new Promise((resolve, reject) => {
            let id = crypto.randomUUID();
            let timer = setTimeout(() => {
                this.pending.delete(id);
                reject(new Error("control timeout"));
            }, timeoutMs);
            this.pending.set(id, { resolve, reject, timer });
            if (!this.send(type, data, id)) {
                clearTimeout(timer);
                this.pending.delete(id);
                reject(new Error("control offline"));
            }
        });
    }

    resolveKey(secret) {
        let cached = this.resolveCache.get(secret);
        if (cached && Date.now() - cached.ts < (cached.identity ? 5 * 60_000 : 30_000)) {
            return Promise.resolve(cached.identity);
        }
        return this.request("resolveKey", { secret }).then(
            (data) => {
                let identity = data && data.valid ? data.identity : null;
                this.resolveCache.set(secret, { identity, ts: Date.now() });
                if (this.resolveCache.size > 500) {
                    let oldest = [...this.resolveCache.keys()].slice(0, this.resolveCache.size - 500);
                    for (let key of oldest) this.resolveCache.delete(key);
                }
                return identity;
            },
            () => null
        );
    }

    // Player identities are cached per server for the arena's lifetime.
    // Server start and arena close drop them so the next join re-reads
    // control, which is how a panel edit lands after $restart.
    refreshPerms() {
        this.resolveCache.clear();
    }

    authCode(code) {
        return this.request("authCode", { code }, 10_000).then(
            (data) => data || { ok: false, error: "bad_response" },
            () => ({ ok: false, error: "offline" })
        );
    }

    onFrame(raw) {
        let frame;
        try {
            frame = JSON.parse(raw.toString());
        } catch {
            return;
        }
        if (!frame || frame.v !== 1) return;
        switch (frame.type) {
            case "helloAck": {
                this.connected = true;
                this.clockOffset = (frame.data.serverTime || Date.now()) - Date.now();
                this.refreshPerms();
                this.lastCloseCode = null;
                this.log("Connected as " + this.nodeId + ".");
                if (this.heartbeatTimer) {
                    clearInterval(this.heartbeatTimer);
                    this.timers = this.timers.filter((t) => t !== this.heartbeatTimer);
                }
                this.heartbeat();
                this.heartbeatTimer = setInterval(() => {
                    if (!this.closed) this.heartbeat();
                }, HEARTBEAT_MS);
                this.timers.push(this.heartbeatTimer);
                break;
            }
            case "resolveKeyResult":
            case "authCodeResult": {
                let entry = this.pending.get(frame.id);
                if (entry) {
                    clearTimeout(entry.timer);
                    this.pending.delete(frame.id);
                    entry.resolve(frame.data);
                }
                break;
            }
            case "command": {
                this.onCommand(frame);
                break;
            }
            case "banlist": {
                this.setBanlist(frame.data.entries || []);
                break;
            }
            case "revokeKey": {
                // Hashes cannot be matched to cached secrets without the
                // pepper, so any revocation clears the whole cache.
                this.refreshPerms();
                break;
            }
            case "error": break;
        }
    }

    heartbeat() {
        if (!this.connected) return;
        let clients = this.gameManager.socketManager.clients;
        this.send("heartbeat", {
            players: clients.length,
            maxPlayers: this.gameManager.webProperties.maxPlayers,
            gameMode: this.gameManager.gamemode,
            startedAt: this.gameManager.startedAt,
            displayName: this.gameManager.name || "Unknown"
        });
        this.send("event", { name: "playerBatch", players: this.roster() });
    }

    roster() {
        let rows = [];
        for (let socket of this.gameManager.socketManager.clients) {
            let body = socket.player && socket.player.body;
            if (!body) continue;
            rows.push({
                playerId: socket.id,
                name: (body.name || "").toString().slice(0, 40),
                team: body.team ?? null,
                tank: body.label ?? null,
                level: typeof body.skill.level === "number" ? body.skill.level : 0,
                score: typeof body.skill.score === "number" ? body.skill.score : 0,
                ip: socket.ip || null
            });
        }
        return rows;
    }

    playerJoin(socket) {
        if (!this.connected) return;
        let body = socket.player && socket.player.body;
        if (!body) return;
        this.send("event", {
            name: "playerJoin",
            player: {
                playerId: socket.id,
                name: (body.name || "").toString().slice(0, 40),
                team: body.team ?? null,
                tank: body.label ?? null,
                level: typeof body.skill.level === "number" ? body.skill.level : 0,
                score: typeof body.skill.score === "number" ? body.skill.score : 0,
                ip: socket.ip || null
            }
        });
    }

    playerLeave(playerId) {
        if (!this.connected) return;
        this.send("event", { name: "playerLeave", playerId });
    }

    setBanlist(entries) {
        let now = Date.now();
        this.bans = (entries || [])
            .filter((entry) => entry && entry.ip && (!entry.expiresAt || entry.expiresAt > now))
            .map((entry) => ({ ...entry, ip: normalizeIp(entry.ip) }))
            .filter((entry) => entry.ip);
        if (this.bans.length !== this.banCount) {
            this.banCount = this.bans.length;
            this.log(`Ban list updated (${this.bans.length} entries).`);
        }
        this.blocklist = new net.BlockList();
        for (let ban of this.bans) {
            try {
                if (ban.ip.includes("/")) {
                    let [base, mask] = ban.ip.split("/");
                    this.blocklist.addSubnet(base, Number(mask));
                } else {
                    this.blocklist.addAddress(ban.ip);
                }
            } catch { /* skip malformed entries */ }
        }
    }

    // Temporary bans live only on this node: set by player.tempBan, never
    // synced, never pushed. The shared banlist owns permanent bans and must
    // never wipe these, so they ride a separate list.
    addTempBan(ip, reason, expiresAt) {
        ip = normalizeIp(ip);
        if (!ip) return;
        if (!this.tempBans) this.tempBans = [];
        this.tempBans = this.tempBans.filter((ban) => ban.expiresAt > Date.now() && ban.ip !== ip);
        this.tempBans.push({ ip, reason: reason || "", expiresAt });
    }

    clearTempBans() {
        this.tempBans = [];
    }

    checkBan(ip) {
        ip = normalizeIp(ip);
        if (!ip) return null;
        this.bans = this.bans.filter((ban) => !ban.expiresAt || ban.expiresAt > Date.now());
        if (this.tempBans) {
            this.tempBans = this.tempBans.filter((ban) => ban.expiresAt > Date.now());
            let temp = this.tempBans.find((ban) => ban.ip === ip);
            if (temp) return temp;
        }
        try {
            if (!this.blocklist.check(ip)) return null;
        } catch {
            return null;
        }
        return this.bans.find((ban) => {
            try {
                let rules = new net.BlockList();
                if (ban.ip.includes("/")) {
                    let [base, mask] = ban.ip.split("/");
                    rules.addSubnet(base, Number(mask));
                } else {
                    rules.addAddress(ban.ip);
                }
                return rules.check(ip);
            } catch {
                return false;
            }
        }) || null;
    }

    onCommand(frame) {
        let data = frame.data || {};
        // Record-first: a retried id is never executed twice.
        if (this.seenCommands.has(frame.id)) {
            this.send("commandAck", { commandId: frame.id, ok: false, error: "duplicate" });
            return;
        }
        this.seenCommands.set(frame.id, Date.now());
        if (this.seenCommands.size > 1000) {
            let oldest = [...this.seenCommands.keys()].slice(0, this.seenCommands.size - 1000);
            for (let id of oldest) this.seenCommands.delete(id);
        }
        // Commands that already expired in flight are dropped, not run late.
        if (data.expiresAt && Date.now() + this.clockOffset > data.expiresAt) {
            this.send("commandAck", { commandId: frame.id, ok: false, error: "expired" });
            return;
        }
        let dispatch;
        try {
            dispatch = require("./commands/index.js").dispatch;
        } catch {
            this.send("commandAck", { commandId: frame.id, ok: false, error: "unsupported" });
            return;
        }
        dispatch(this.gameManager, data).then(
            (result) => {
                let who = (data.actor && (data.actor.user || data.actor.source)) || "unknown";
                this.log(`Command ${data.type} from ${who}: ${result.ok ? result.result || "ok" : result.error}`);
                this.send("commandAck", { commandId: frame.id, ok: result.ok, result: result.result, error: result.error });
            },
            () => {
                this.warn(`Command ${data.type} failed.`);
                this.send("commandAck", { commandId: frame.id, ok: false, error: "failed" });
            }
        );
    }
}

module.exports = { NodeClient };
