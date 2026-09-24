// /control WS endpoint for nodes and admin clients, query pipeline,
// action orchestration, and live feeds.
let crypto = require("crypto");
let fs = require("fs");
let net = require("net");
let { WebSocketServer } = require("ws");
let protocol = require("./protocol.js");
let { parseQuery } = require("./pipeline/parser.js");
let { evaluate, PLAYER_ACTIONS } = require("./pipeline/eval.js");
let format = require("./pipeline/format.js");
let { parseActionArgs } = require("./pipeline/actions.js");

const WS_PATH = "/control";
const COMMAND_TYPES = {
    reset: "player.resetScore",
    kill: "player.kill",
    kick: "player.kick",
    tempBan: "player.tempBan",
    restart: "server.restart",
    broadcast: "server.broadcast"
};

function createHub(deps) {
    let { registry, bus, bans, perms, auth } = deps;
    let options = deps.options || {};
    let keys = deps.keys || {};
    let now = options.now || (() => Date.now());
    let controlStartedAt = options.controlStartedAt || Date.now();
    let helloTimeoutMs = options.helloTimeoutMs || 5000;
    let maxQueryLength = options.maxQueryLength || 2000;
    // Info log only: ids, kinds, outcomes. Keys and secrets stay out.
    // log: false, or a function, in tests. Lines also append to logFile.
    let logStream = null;
    if (options.logFile) {
        try {
            logStream = fs.createWriteStream(options.logFile, { flags: "a" });
            logStream.on("error", () => {
                logStream = null;
            });
        } catch {
            logStream = null;
        }
    }
    function writeLog(line) {
        if (typeof options.log === "function") {
            try {
                options.log(line);
            } catch {
                // Broken sink, drop the line.
            }
        } else if (options.log !== false) {
            console.log(line);
        }
        if (logStream) {
            try {
                logStream.write(new Date().toISOString() + " " + line + "\n");
            } catch {
                logStream = null;
            }
        }
    }
    let log = (...args) => writeLog("[control] " + args.join(" "));

    let wss = new WebSocketServer({ noServer: true, maxPayload: protocol.MAX_FRAME_BYTES });
    let nodeSockets = new Map();
    let lastResults = new Map();
    let ipBlocks = new Map();
    let commandRates = new Map();
    let timers = new Set();
    let upgradeHandler = null;

    function later(ms, fn) {
        let timer = setTimeout(() => {
            timers.delete(timer);
            fn();
        }, ms);
        timers.add(timer);
        return timer;
    }

    function attach(server, path = WS_PATH) {
        upgradeHandler = (req, socket, head) => {
            let pathname = (req.url || "").split("?")[0];
            if (pathname !== path) return;
            if (isBlocked(req)) {
                socket.destroy();
                return;
            }
            wss.handleUpgrade(req, socket, head, (ws) => onConnection(ws, req));
        };
        server.on("upgrade", upgradeHandler);
    }

    function remoteIp(req) {
        return (req.socket && req.socket.remoteAddress) || "unknown";
    }

    function isBlocked(req) {
        let entry = ipBlocks.get(remoteIp(req));
        if (!entry) return false;
        if (now() > entry.until) {
            ipBlocks.delete(remoteIp(req));
            return false;
        }
        return true;
    }

    function strike(req) {
        let ip = remoteIp(req);
        let entry = ipBlocks.get(ip) || { strikes: 0, until: 0 };
        entry.strikes++;
        if (entry.strikes >= 5) {
            entry.until = now() + 60_000;
            entry.strikes = 0;
        }
        ipBlocks.set(ip, entry);
    }

    function send(ws, type, data, id = null) {
        if (ws.readyState !== 1) return false;
        try {
            ws.send(protocol.wrap(type, data, id));
            return true;
        } catch {
            return false;
        }
    }

    function sendToNode(nodeId, frame) {
        let ws = nodeSockets.get(nodeId);
        if (!ws || ws.readyState !== 1) return false;
        try {
            ws.send(frame);
            return true;
        } catch {
            return false;
        }
    }

    // Half-dead sockets throw on close; callers do not care.
    function tryClose(ws, code, reason) {
        try {
            ws.close(code, reason);
        } catch {
            // Already gone, nothing to do.
        }
    }

    function onConnection(ws, req) {
        let conn = {
            authed: false,
            kind: null,
            nodeId: null,
            keyDigest: null,
            discordId: null,
            identity: null,
            bucket: { tokens: 100, last: now() },
            drops: 0,
            codeAttempts: []
        };
        conn.helloTimer = later(helloTimeoutMs, () => {
            if (!conn.authed) {
                tryClose(ws, 4400, "hello timeout");
            }
        });

        ws.on("message", (raw) => onMessage(ws, conn, req, raw));
        ws.on("close", () => onClose(ws, conn));
        ws.on("error", () => {
            // A close event follows on its own.
        });
    }

    function takeToken(conn) {
        let t = now();
        conn.bucket.tokens = Math.min(100, conn.bucket.tokens + (t - conn.bucket.last) / 1000 * 20);
        conn.bucket.last = t;
        if (conn.bucket.tokens < 1) return false;
        conn.bucket.tokens -= 1;
        return true;
    }

    async function onMessage(ws, conn, req, raw) {
        if (!takeToken(conn)) {
            conn.drops++;
            send(ws, "error", { error: "rate_limited" });
            if (conn.drops > 50) {
                tryClose(ws, 4408, "rate limited");
            }
            return;
        }
        let allowed = !conn.authed ? ["hello"] : (conn.kind === "node" ? protocol.NODE_IN : protocol.CLIENT_IN);
        let parsed = protocol.parseFrame(raw, allowed);
        if (!parsed.ok) {
            if (!conn.authed) {
                tryClose(ws, 4400, parsed.error);
            } else {
                send(ws, "error", { error: parsed.error });
            }
            return;
        }
        let { type, id, data } = parsed.frame;
        try {
            if (!conn.authed) {
                if (type === "hello") await onHello(ws, conn, req, data);
                return;
            }
            if (conn.kind === "node") await onNodeFrame(ws, conn, type, id, data);
            else await onClientFrame(ws, conn, type, id, data);
        } catch(err) {
            console.error("control hub error: " + (err && err.message));
            send(ws, "error", { error: "internal" }, id);
        }
    }

    async function onHello(ws, conn, req, data) {
        if (data.kind === "node") {
            let nodeId = (data.nodeId || "").toString();
            if (!/^[A-Za-z0-9_-]{1,32}$/.test(nodeId)) {
                log(`rejected node "${nodeId}": bad node id`);
                tryClose(ws, 4401, "bad node id");
                return;
            }
            let expected = (keys.nodeKeys && keys.nodeKeys[nodeId]) || keys.node;
            if (!protocol.keyOk(data.key, expected)) {
                strike(req);
                log(`rejected node "${nodeId}": bad key`);
                tryClose(ws, 4401, "bad key");
                return;
            }
            let digest = crypto.createHash("sha256").update(data.key).digest("hex");
            let existing = nodeSockets.get(nodeId);
            if (existing && existing !== ws) {
                if (existing.connKeyDigest !== digest) {
                    log(`rejected node "${nodeId}": id taken by another key`);
                    tryClose(ws, 4401, "node id taken");
                    return;
                }
                tryClose(existing, 4400, "replaced");
            }
            conn.authed = true;
            conn.kind = "node";
            conn.nodeId = nodeId;
            conn.keyDigest = digest;
            ws.connKeyDigest = digest;
            clearTimeout(conn.helloTimer);
            timers.delete(conn.helloTimer);
            registry.hello(nodeId, data.info || {}, data.osaVersion || null);
            nodeSockets.set(nodeId, ws);
            let caps = ((data.info && data.info.caps) || []).length;
            log(`node "${nodeId}" connected (osa ${data.osaVersion || "unknown"}, ${caps} caps)`);
            send(ws, "helloAck", { nodeId, serverTime: now(), banlistVersion: await bans.version() });
            await pushBanlist(nodeId);
            return;
        }
        if (data.kind === "bot") {
            if (!protocol.keyOk(data.key, keys.bot)) {
                strike(req);
                log("rejected bot: bad key");
                tryClose(ws, 4401, "bad key");
                return;
            }
            conn.authed = true;
            conn.kind = "bot";
            clearTimeout(conn.helloTimer);
            timers.delete(conn.helloTimer);
            // The bot multiplexes many Discord users over one socket and
            // asserts their ids per query. Control resolves each one.
            conn.discordId = (data.discordId || "").toString() || null;
            conn.identity = await resolveIdentity(conn.discordId);
            log("bot connected");
            send(ws, "helloAck", { serverTime: now() });
            return;
        }
        log(`rejected connection: bad kind "${(data.kind || "").toString().slice(0, 32)}"`);
        tryClose(ws, 4401, "bad kind");
    }

    async function resolveIdentity(discordId) {
        if (!discordId) return { rank: 0, flags: [], discordId: null };
        return (await perms.identityFor(discordId)) || { rank: 0, flags: [], discordId };
    }

    function validHeartbeat(data) {
        return data && typeof data === "object" &&
            (data.players === undefined || (typeof data.players === "number" && data.players >= 0)) &&
            (data.maxPlayers === undefined || typeof data.maxPlayers === "number") &&
            (data.startedAt === undefined || typeof data.startedAt === "number") &&
            (data.gameMode === undefined || Array.isArray(data.gameMode));
    }

    async function onNodeFrame(ws, conn, type, id, data) {
        switch (type) {
            case "heartbeat": {
                if (!validHeartbeat(data)) {
                    log(`node "${conn.nodeId}": bad heartbeat, ignored`);
                    send(ws, "error", { error: "bad_data" }, id);
                    return;
                }
                registry.heartbeat(conn.nodeId, data);
                break;
            }
            case "event": {
                onNodeEvent(conn.nodeId, data);
                break;
            }
            case "resolveKey": {
                // Hash the raw secret here. Store only the hash.
                let identity = await auth.resolveSecret(data.secret);
                send(ws, "resolveKeyResult", { valid: !!identity, identity }, id);
                break;
            }
            case "authCode": {
                let window = conn.codeAttempts.filter((t) => now() - t < 60_000);
                window.push(now());
                conn.codeAttempts = window;
                if (window.length > 5) {
                    send(ws, "authCodeResult", { ok: false, error: "rate_limited" }, id);
                    return;
                }
                let result = await auth.redeem(data.code);
                send(ws, "authCodeResult", result, id);
                break;
            }
            case "commandAck": {
                bus.onAck(data.commandId, conn.nodeId, data);
                break;
            }
            default:
                log(`node "${conn.nodeId}": unexpected frame "${type}"`);
                send(ws, "error", { error: "unexpected_frame" }, id);
        }
    }

    function validPlayer(player) {
        return player && typeof player === "object" &&
            (typeof player.playerId === "string" || typeof player.playerId === "number");
    }

    function onNodeEvent(nodeId, data) {
        if (!data || typeof data !== "object") return;
        if (data.name === "playerJoin" && validPlayer(data.player)) {
            registry.playerJoin(nodeId, data.player);
        } else if (data.name === "playerLeave") {
            registry.playerLeave(nodeId, data.playerId);
        } else if (data.name === "playerBatch" && Array.isArray(data.players)) {
            registry.playerBatch(nodeId, data.players.filter(validPlayer).slice(0, 500));
        }
    }

    function actorKey(kind, discordId) {
        return kind + ":" + (discordId || "owner");
    }

    // One line per client request: who asked what, what came back.
    // Query text capped; no codes or secrets in the log line.
    function shortText(text) {
        text = (text || "").toString().replace(/\s+/g, " ").trim();
        return text.length > 120 ? text.slice(0, 120) + "..." : text;
    }

    async function onClientFrame(ws, conn, type, id, data) {
        if (type === "mintCode") {
            // The discord bot mints $auth codes on behalf of its users. One
            // socket asserts many ids, so the target rides in the frame.
            let target = (data.discordId || conn.discordId || "").toString();
            if (!target) {
                log("mint: missing discordId -> bad_args");
                send(ws, "error", { error: "bad_args", detail: "discordId required" }, id);
                return;
            }
            if (!checkCommandRate(actorKey(conn.kind, target))) {
                log(`mint ${target} -> rate_limited`);
                send(ws, "error", { error: "rate_limited", detail: "too many commands, slow down" }, id);
                return;
            }
            let minted = await auth.mintCode(target);
            if (!minted.ok) {
                log(`mint ${target} -> ${minted.error}`);
                send(ws, "error", { error: minted.error }, id);
                return;
            }
            log(`mint ${target} -> ok`);
            send(ws, "mintCodeResult", minted, id);
            return;
        }
        if (type === "query") {
            // Bot connections assert the acting Discord user per query.
            let identity = conn.identity;
            let key = actorKey(conn.kind, conn.discordId);
            if (data.discordId) {
                identity = await resolveIdentity(data.discordId.toString());
                key = actorKey("bot", data.discordId.toString());
            }
            let who = identity.discordId || conn.kind;
            let outcome = await queryPipeline({
                text: data.text,
                identity,
                source: conn.kind,
                label: who
            });
            if (!outcome.ok) {
                log(`query ${who} "${shortText(data.text)}" -> ${outcome.error}`);
                send(ws, "error", { error: outcome.error, detail: outcome.detail }, id);
                return;
            }
            let result = outcome.result;
            if (result.kind === "action") {
                log(`query ${who} "${shortText(data.text)}" -> action ${result.action}`);
                send(ws, "commandResult", result, id);
            } else {
                log(`query ${who} "${shortText(data.text)}" -> ${result.kind}`);
                send(ws, "queryResult", result, id);
            }
            lastResults.set(key, { ts: now(), result });
            pruneLastResults();
            return;
        }
        send(ws, "error", { error: "unexpected_frame" }, id);
    }

    function pruneLastResults() {
        for (let [key, entry] of lastResults) {
            if (now() - entry.ts > 5 * 60_000) lastResults.delete(key);
        }
        if (lastResults.size > 100) {
            let oldest = [...lastResults.keys()].slice(0, lastResults.size - 100);
            for (let key of oldest) lastResults.delete(key);
        }
    }

    // Per-actor command throttle, separate from the per-connection frame
    // bucket. Ten destructive commands a minute.
    function checkCommandRate(key) {
        let windowMs = options.commandRateWindowMs || 60_000;
        let max = options.commandRateMax || 10;
        let hits = (commandRates.get(key) || []).filter((t) => now() - t < windowMs);
        if (hits.length >= max) return false;
        hits.push(now());
        commandRates.set(key, hits);
        if (commandRates.size > 2000) {
            for (let [other, stamps] of commandRates) {
                let fresh = stamps.filter((t) => now() - t < windowMs);
                if (fresh.length === 0) commandRates.delete(other);
                else commandRates.set(other, fresh);
            }
        }
        return true;
    }

    function needsPlayers(ast) {
        if (ast.input === "players") return true;
        if (ast.ops.some((op) => op.input === "players")) return true;
        if (ast.terminal.kind === "players") return true;
        if (ast.terminal.kind === "verbose") return true;
        if (ast.terminal.kind === "action" && PLAYER_ACTIONS.includes(ast.terminal.action)) return true;
        return false;
    }

    // Shared by WS queries and the REST api. Returns outcomes, no throws.
    async function queryPipeline({ text, identity, source, label }) {
        if (typeof text !== "string" || text.length === 0 || text.length > maxQueryLength) {
            return { ok: false, error: "bad_query" };
        }
        let parsed = parseQuery(text);
        if (!parsed.ok) return { ok: false, error: parsed.error, detail: parsed.detail };
        let ast = parsed.ast;
        if (ast.terminal.kind === "%") {
            let last = lastResults.get(actorKey(source, identity.discordId));
            if (!last) return { ok: false, error: "no_last_result" };
            return { ok: true, result: last.result };
        }
        if (needsPlayers(ast)) {
            let allowed = perms.canList(identity);
            if (!allowed.ok) return { ok: false, error: "forbidden", detail: allowed.reason };
        }
        let evaluated = evaluate(ast, registry.snapshot(), { controlStartedAt, now });
        if (evaluated.ok === false) return evaluated;
        if (evaluated.kind !== "action") {
            return { ok: true, result: renderView(evaluated) };
        }
        let allowed = perms.canRun(identity, evaluated.action);
        if (!allowed.ok) return { ok: false, error: "forbidden", detail: allowed.reason };
        return runAction(text, evaluated, { source, label });
    }

    function stripIp(rows) {
        return rows.map((row) => {
            let copy = { ...row };
            delete copy.ip;
            return copy;
        });
    }

    function renderView(evaluated) {
        switch (evaluated.kind) {
            case "servers": return { kind: "servers", text: format.serversText(evaluated), rows: evaluated.rows };
            case "players":
                return { kind: "players", text: format.playersText({ ...evaluated, rows: stripIp(evaluated.rows) }), rows: stripIp(evaluated.rows) };
            case "ping": return { kind: "ping", text: evaluated.rows.map(format.serverLine).join("\n") || "No servers.", rows: evaluated.rows };
            case "count": return { kind: "count", text: format.countText(evaluated), ...evaluated };
            case "verbose":
                if (evaluated.of === "players") {
                    return { kind: "verbose", text: format.playersText({ ...evaluated, rows: stripIp(evaluated.rows) }), rows: stripIp(evaluated.rows) };
                }
                return { kind: "verbose", text: format.verboseText(evaluated), rows: evaluated.rows };
            case "message": return { kind: "message", text: evaluated.text };
            default: return { kind: "message", text: "Nothing to show." };
        }
    }

    function groupTargets(targets) {
        let grouped = {};
        for (let target of targets) {
            if (!grouped[target.nodeId]) grouped[target.nodeId] = [];
            grouped[target.nodeId].push(target.playerId);
        }
        return grouped;
    }

    // Who is online from a ban pattern right now. CIDR and single addresses
    // both work; mapped forms are normalized the same way the node does.
    function playersOnIp(serverIds, pattern) {
        let rules = new net.BlockList();
        try {
            if (pattern.includes("/")) {
                let [base, mask] = pattern.split("/");
                rules.addSubnet(base, Number(mask));
            } else {
                rules.addAddress(pattern);
            }
        } catch {
            return [];
        }
        let snap = registry.snapshot();
        let hits = [];
        for (let row of snap.players) {
            if (!serverIds.includes(row.nodeId) || !row.ip) continue;
            let text = row.ip.toString().trim().toLowerCase();
            if (text.startsWith("::ffff:")) text = text.slice(7);
            try {
                if (rules.check(text)) hits.push({ nodeId: row.nodeId, playerId: row.playerId, name: row.name, ip: row.ip });
            } catch {
                continue;
            }
        }
        return hits;
    }

    function supportedTargets(grouped) {
        let ok = {};
        let unsupported = [];
        for (let nodeId in grouped) {
            let node = registry.getNode(nodeId);
            if (!node || !nodeSockets.has(nodeId)) {
                unsupported.push({ nodeId, error: "node_unreachable" });
            } else {
                ok[nodeId] = grouped[nodeId];
            }
        }
        return { ok, unsupported };
    }

    async function runAction(text, evaluated, { source, label }) {
        if (!checkCommandRate(source + ":" + label)) {
            return { ok: false, error: "rate_limited", detail: "too many commands, slow down" };
        }
        let parsed = parseActionArgs(evaluated.action, evaluated.args, {
            hasTargets: evaluated.playerTargets.length > 0,
            validIp: (ip) => bans.validIp(ip)
        });
        if (!parsed.ok) return parsed;
        let params = parsed.params;
        let actor = { source, user: label, discordId: null };
        let lines = [];
        let summaries = [];

        async function dispatchTo(type, grouped, args, names, lineTargets = evaluated.playerTargets) {
            let { ok, unsupported } = supportedTargets(grouped);
            for (let entry of unsupported) {
                lines.push(format.actionLine({ action: evaluated.action, name: names[entry.nodeId] || entry.nodeId, nodeId: entry.nodeId, ok: false, error: entry.error }));
                summaries.push({ nodeId: entry.nodeId, ok: false, error: entry.error });
            }
            let nodeIds = Object.keys(ok);
            if (nodeIds.length === 0) return;
            // Nodes that do not know the command fail fast instead of hanging.
            let capable = {};
            for (let nodeId of nodeIds) {
                let node = registry.getNode(nodeId);
                let caps = (node && node.info && node.info.caps) || [];
                if (caps.length === 0 || caps.includes(type)) capable[nodeId] = ok[nodeId];
                else {
                    lines.push(format.actionLine({ action: evaluated.action, name: names[nodeId] || nodeId, nodeId, ok: false, error: "unsupported" }));
                    summaries.push({ nodeId, ok: false, error: "unsupported" });
                }
            }
            if (Object.keys(capable).length === 0) return;
            let summary = await bus.dispatch({ type, targets: capable, args, actor });
            for (let result of summary.results) {
                summaries.push(result);
                let perTarget = lineTargets.filter((t) => t.nodeId === result.nodeId);
                if (perTarget.length === 0) {
                    lines.push(format.actionLine({ action: evaluated.action, name: result.nodeId, nodeId: result.nodeId, ok: result.ok, error: result.error }));
                }
                for (let target of perTarget) {
                    lines.push(format.actionLine({ action: evaluated.action, name: target.name, nodeId: result.nodeId, ok: result.ok, error: result.error }));
                }
            }
        }

        switch (evaluated.action) {
            case "reset":
                if (evaluated.playerTargets.length === 0) return { ok: false, error: "bad_args", detail: "no players in scope" };
                await dispatchTo(COMMAND_TYPES.reset, groupTargets(evaluated.playerTargets), {}, namesByNode(evaluated.playerTargets));
                break;
            case "kill":
                if (evaluated.playerTargets.length === 0) return { ok: false, error: "bad_args", detail: "no players in scope" };
                await dispatchTo(COMMAND_TYPES.kill, groupTargets(evaluated.playerTargets), {}, namesByNode(evaluated.playerTargets));
                break;
            case "kick":
                if (evaluated.playerTargets.length === 0) return { ok: false, error: "bad_args", detail: "no players in scope" };
                await dispatchTo(COMMAND_TYPES.kick, groupTargets(evaluated.playerTargets), { reason: params.reason }, namesByNode(evaluated.playerTargets));
                break;
            case "ban": {
                if (evaluated.playerTargets.length === 0 && !params.ip) {
                    return { ok: false, error: "bad_args", detail: "no players in scope" };
                }
                // Node-local temp ban: memory only, gone on restart.
                // Not in the DB, not pushed to other nodes.
                let targets = evaluated.playerTargets;
                let grouped;
                if (params.ip) {
                    // Every scoped node holds the ip. Also pull whoever is
                    // online from that address so they get kicked now.
                    if (targets.length === 0) targets = playersOnIp(evaluated.serverIds, params.ip);
                    grouped = Object.fromEntries(evaluated.serverIds.map((id) => [id, []]));
                    for (let target of targets) {
                        if (!grouped[target.nodeId]) grouped[target.nodeId] = [];
                        grouped[target.nodeId].push(target.playerId);
                    }
                } else {
                    grouped = groupTargets(targets);
                }
                let args = { reason: params.reason };
                if (params.durationMs != null) args.durationMs = params.durationMs;
                if (params.ip) args.ip = params.ip;
                let before = summaries.length;
                let firstLine = lines.length;
                await dispatchTo(COMMAND_TYPES.tempBan, grouped, args, namesByNode(targets), targets);
                lines.length = firstLine;
                for (let summary of summaries.slice(before)) {
                    let scoped = targets.filter((t) => t.nodeId === summary.nodeId);
                    if (scoped.length === 0) {
                        lines.push(summary.ok ? `tempban ok: ${params.ip || summary.nodeId}`
                            : `tempban failed: ${summary.nodeId} (${summary.error || "failed"})`);
                    }
                    for (let target of scoped) {
                        lines.push(summary.ok ? `tempban ok: ${target.name} (${target.nodeId})`
                            : `tempban failed: ${target.name} (${target.nodeId}, ${summary.error || "failed"})`);
                    }
                }
                if (targets.length > 0) {
                    await dispatchTo(COMMAND_TYPES.kick, groupTargets(targets), { reason: "banned" + (params.reason ? ": " + params.reason : "") }, namesByNode(targets), targets);
                }
                break;
            }
            case "restart":
                if (evaluated.serverIds.length === 0) return { ok: false, error: "bad_args", detail: "no servers in scope" };
                await dispatchTo(COMMAND_TYPES.restart, Object.fromEntries(evaluated.serverIds.map((id) => [id, []])), {}, {});
                break;
            case "broadcast": {
                if (evaluated.serverIds.length === 0) return { ok: false, error: "bad_args", detail: "no servers in scope" };
                await dispatchTo(COMMAND_TYPES.broadcast, Object.fromEntries(evaluated.serverIds.map((id) => [id, []])), { message: params.message }, {});
                break;
            }
            default: return { ok: false, error: "unknown_action", detail: evaluated.action };
        }

        let okCount = summaries.filter((r) => r.ok).length;
        log(`action ${evaluated.action} by ${label}: ${okCount}/${summaries.length} ok`);
        return { ok: true, result: { kind: "action", action: evaluated.action, ok: summaries.every((r) => r.ok), lines, results: summaries } };
    }

    function namesByNode(targets) {
        let names = {};
        for (let target of targets) {
            if (!names[target.nodeId]) names[target.nodeId] = [];
            names[target.nodeId].push(target.name);
        }
        for (let nodeId in names) names[nodeId] = names[nodeId].join(", ");
        return names;
    }

    async function banEntries() {
        return (await bans.listBans()).map((ban) => ({ ip: ban.ip, reason: ban.reason, expiresAt: ban.expires_at }));
    }

    async function pushRevocation(hash) {
        let frame = protocol.wrap("revokeKey", { hash });
        for (let id of nodeSockets.keys()) sendToNode(id, frame);
    }

    async function pushBanlist(nodeId = null) {
        let frame = protocol.wrap("banlist", { version: await bans.version(), entries: await banEntries() });
        if (nodeId) {
            sendToNode(nodeId, frame);
            return;
        }
        for (let id of nodeSockets.keys()) sendToNode(id, frame);
    }

    function onClose(ws, conn) {
        if (conn.helloTimer) {
            clearTimeout(conn.helloTimer);
            timers.delete(conn.helloTimer);
        }
        pruneLastResults();
        if (conn.kind === "node" && conn.nodeId) {
            if (nodeSockets.get(conn.nodeId) === ws) nodeSockets.delete(conn.nodeId);
            registry.removeNode(conn.nodeId);
            if (conn.authed) log(`node "${conn.nodeId}" disconnected`);
        } else if (conn.kind === "bot" && conn.authed) {
            log("bot disconnected");
        }
    }

    function sweep() {
        let changed = registry.sweep();
        for (let nodeId of changed.down) {
            log(`node "${nodeId}" timed out, dropped`);
            let ws = nodeSockets.get(nodeId);
            if (ws) {
                ws.terminate();
                nodeSockets.delete(nodeId);
            }
        }
        auth.pruneCodes().catch(() => {
            // Gone with the next sweep anyway, retry then.
        });
    }

    function close() {
        for (let timer of timers) clearTimeout(timer);
        timers.clear();
        if (logStream) {
            try {
                logStream.end();
            } catch {
                // Already gone, nothing to flush.
            }
            logStream = null;
        }
        for (let ws of nodeSockets.values()) {
            ws.terminate();
        }
        nodeSockets.clear();
        wss.clients.forEach((ws) => {
            ws.terminate();
        });
        bus.close();
        return new Promise((resolve) => wss.close(() => resolve()));
    }

    return {
        attach,
        queryPipeline,
        sendToNode,
        pushBanlist,
        pushRevocation,
        sweep,
        close,
        nodeCount: () => nodeSockets.size
    };
}

module.exports = { createHub, WS_PATH };
