// Local operator panel: static files plus the permission api. Caller
// binds this to loopback only.
let fs = require("fs");
let path = require("path");
let { keyOk } = require("./protocol.js");

const MAX_BODY_BYTES = 1024 * 1024;
const MIME = {
    html: "text/html",
    js: "application/javascript",
    css: "text/css",
    json: "application/json",
    png: "image/png",
    svg: "image/svg+xml",
    ico: "image/x-icon"
};

// Bad input becomes a 400 downstream instead of a hung 500.
function safeDecode(text) {
    try {
        return { ok: true, value: decodeURIComponent(text) };
    } catch {
        return { ok: false, value: text };
    }
}

function createPanel(deps) {
    let { registry, perms, auth, hub, staticDir, panelKey } = deps;
    let strikes = new Map();
    function json(res, code, body, extraHeaders = {}) {
        res.writeHead(code, { "Content-Type": "application/json", ...extraHeaders });
        res.end(JSON.stringify(body));
    }

    function readBody(req) {
        return new Promise((resolve) => {
            let bytes = 0;
            let chunks = [];
            req.on("data", (chunk) => {
                bytes += chunk.length;
                if (bytes <= MAX_BODY_BYTES) chunks.push(chunk);
            });
            req.on("end", () => {
                if (bytes > MAX_BODY_BYTES) return resolve({ ok: false, error: "body_too_large" });
                let text = Buffer.concat(chunks).toString();
                if (!text) return resolve({ ok: true, body: {} });
                try {
                    resolve({ ok: true, body: JSON.parse(text) });
                } catch {
                    resolve({ ok: false, error: "bad_json" });
                }
            });
            req.on("error", () => resolve({ ok: false, error: "bad_body" }));
        });
    }

    function serveStatic(req, res, pathname) {
        let file = pathname === "/" ? "index.html" : pathname.slice(1);
        let filePath = path.join(staticDir, file);
        if (!filePath.startsWith(staticDir + path.sep)) {
            res.writeHead(403);
            res.end("Forbidden");
            return;
        }
        fs.readFile(filePath, (err, data) => {
            if (err) {
                res.writeHead(404);
                res.end("Not found");
                return;
            }
            let extension = file.split(".").pop();
            res.writeHead(200, { "Content-Type": MIME[extension] || "application/octet-stream" });
            res.end(data);
        });
    }

    function bearer(req) {
        let header = req.headers.authorization || "";
        return header.startsWith("Bearer ") ? header.slice(7) : "";
    }

    function isBlocked(req) {
        let entry = strikes.get(clientIp(req));
        if (!entry) return false;
        if (Date.now() > entry.until) {
            strikes.delete(clientIp(req));
            return false;
        }
        return true;
    }

    function strike(req) {
        let ip = clientIp(req);
        let entry = strikes.get(ip) || { count: 0, until: 0 };
        entry.count++;
        if (entry.count >= 5) {
            entry.until = Date.now() + 60_000;
            entry.count = 0;
        }
        strikes.set(ip, entry);
    }

    function clientIp(req) {
        return (req.socket && req.socket.remoteAddress) || "unknown";
    }

    function camelSecrets(rows) {
        return rows.map((row) => ({
            hash: row.hash,
            discordId: row.discord_id,
            createdAt: row.created_at,
            lastUsedAt: row.last_used_at
        }));
    }

    async function handler(req, res) {
        // Loopback only: remoteAddress, not proxy headers.
        if (!isLoopbackIp((req.socket && req.socket.remoteAddress) || "")) {
            res.writeHead(403);
            res.end("Forbidden");
            return;
        }
        let pathname = (req.url || "").split("?")[0];
        if (pathname.startsWith("/panel/")) {
            // No key configured means open on loopback. A unique key, once
            // set, gates everything behind it.
            if (panelKey && (isBlocked(req) || !keyOk(bearer(req), panelKey))) {
                strike(req);
                json(res, 401, { ok: false, error: "unauthorized" }, { "WWW-Authenticate": "Bearer" });
                return;
            }
        }
        let query = {};
        if (req.url.includes("?")) {
            for (let part of req.url.split("?")[1].split("&")) {
                let [key, value] = part.split("=");
                let decodedKey = safeDecode(key);
                let decodedValue = safeDecode(value || "");
                if (!decodedKey.ok || !decodedValue.ok) {
                    json(res, 400, { ok: false, error: "bad_query" });
                    return;
                }
                query[decodedKey.value] = decodedValue.value;
            }
        }
        if (!pathname.startsWith("/panel/")) {
            if (req.method !== "GET") {
                res.writeHead(405);
                res.end("Method not allowed");
                return;
            }
            serveStatic(req, res, pathname);
            return;
        }

        let body = {};
        if (req.method === "POST" || req.method === "PUT") {
            let contentType = req.headers["content-type"] || "";
            if (contentType && !contentType.includes("application/json")) {
                json(res, 415, { ok: false, error: "json_only" });
                return;
            }
            let parsed = await readBody(req);
            if (!parsed.ok) {
                json(res, 400, parsed);
                return;
            }
            body = parsed.body;
        }

        try {
            if (req.method === "GET" && pathname === "/panel/users") {
                json(res, 200, { ok: true, users: await perms.listUsers() });
            } else if (req.method === "POST" && pathname === "/panel/users") {
                let outcome = await perms.upsertUser(body);
                if (!outcome.ok) {
                    json(res, 400, outcome);
                    return;
                }
                json(res, 200, outcome);
            } else if (req.method === "GET" && pathname === "/panel/types") {
                json(res, 200, { ok: true, types: await perms.listTypes() });
            } else if (req.method === "GET" && pathname === "/panel/secrets") {
                let rows = query.discordId ? await auth.secretsFor(query.discordId) : await auth.allSecrets();
                json(res, 200, { ok: true, secrets: camelSecrets(rows) });
            } else if (req.method === "POST" && pathname === "/panel/auth/code") {
                if (!body.discordId) {
                    json(res, 400, { ok: false, error: "bad_args", detail: "discordId required" });
                    return;
                }
                json(res, 200, await auth.mintCode(body.discordId.toString()));
            } else if (req.method === "POST" && pathname === "/panel/auth/revoke") {
                if (!body.hash) {
                    json(res, 400, { ok: false, error: "bad_args", detail: "hash required" });
                    return;
                }
                let revoked = await auth.revokeHash(body.hash);
                if (revoked) await hub.pushRevocation(body.hash);
                json(res, 200, { ok: revoked });
            } else if (req.method === "GET" && pathname === "/panel/nodes") {
                // Node list for the panel: counts and uptime only.
                let nodes = registry.snapshot().nodes.map((node) => ({
                    nodeId: node.nodeId,
                    mode: (node.gameMode || []).join(",").toLowerCase() || "unknown",
                    players: node.players,
                    maxPlayers: node.maxPlayers,
                    uptimeMs: node.uptimeMs,
                    status: node.status
                }));
                json(res, 200, { ok: true, nodes });
            } else {
                json(res, 404, { ok: false, error: "not_found" });
            }
        } catch {
            json(res, 500, { ok: false, error: "internal" });
        }
    }

    return { handler };
}

// Loopback only: 127/8, ::1, and their mapped forms. Anything else,
// including any proxy header, is not local.
function isLoopbackIp(ip) {
    return ip === "::1" || ip === "127.0.0.1" ||
        ip.startsWith("127.") || ip.startsWith("::ffff:127.");
}

module.exports = { createPanel, isLoopbackIp };
