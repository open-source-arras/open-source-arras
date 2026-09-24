// Live state: which nodes exist and who plays on them. Hub owns timers
// and calls sweep().
let { normalizeName } = require("./protocol.js");

function createRegistry(options = {}) {
    let now = options.now || (() => Date.now());
    let staleMs = options.staleMs || 15_000;
    let downMs = options.downMs || 60_000;
    let rowTtlMs = options.rowTtlMs || 90_000;

    let nodes = new Map();
    let players = new Map();

    function playerKey(nodeId, playerId) {
        return nodeId + ":" + playerId;
    }

    function hello(nodeId, info = {}, osaVersion = null) {
        let node = nodes.get(nodeId) || { nodeId };
        node.info = {
            region: info.region || "",
            serverhost: info.serverhost || "",
            location: info.location || "",
            gamemode: Array.isArray(info.gamemode) ? info.gamemode : [],
            playerCap: typeof info.player_cap === "number" ? info.player_cap : 0,
            caps: Array.isArray(info.caps) ? info.caps : [],
            // Public list fields from the node, same shape local or remote.
            host: (info.host || "").toString().slice(0, 128),
            port: typeof info.port === "number" ? info.port : 0,
            displayName: (info.displayName || "Unknown").toString().slice(0, 64),
            featured: !!info.featured,
            unlisted: !!info.unlisted,
            private: !!info.private,
            hidden: !!info.hidden
        };
        node.osaVersion = osaVersion;
        node.lastSeen = now();
        nodes.set(nodeId, node);
        return node;
    }

    function heartbeat(nodeId, data = {}) {
        let node = nodes.get(nodeId);
        if (!node) return null;
        node.players = typeof data.players === "number" ? data.players : (node.players || 0);
        node.maxPlayers = typeof data.maxPlayers === "number" ? data.maxPlayers : (node.maxPlayers || 0);
        if (Array.isArray(data.gameMode)) node.info.gamemode = data.gameMode;
        // The display name is only set once the room starts, so it rides
        // the heartbeat instead of going stale from the early hello.
        if (typeof data.displayName === "string" && data.displayName) {
            node.info.displayName = data.displayName.slice(0, 64);
        }
        if (typeof data.startedAt === "number") node.startedAt = data.startedAt;
        node.lastSeen = now();
        return node;
    }

    function touch(nodeId) {
        let node = nodes.get(nodeId);
        if (node) node.lastSeen = now();
    }

    function statusOf(node) {
        let age = now() - (node.lastSeen || 0);
        if (age > downMs) return "down";
        if (age > staleMs) return "stale";
        return "online";
    }

    function dropNodePlayers(nodeId) {
        for (let key of players.keys()) {
            if (key.startsWith(nodeId + ":")) players.delete(key);
        }
    }

    function removeNode(nodeId) {
        dropNodePlayers(nodeId);
        return nodes.delete(nodeId);
    }

    function playerJoin(nodeId, player = {}) {
        if (!nodes.has(nodeId) || player.playerId === undefined) return null;
        let row = {
            nodeId,
            playerId: player.playerId,
            name: (player.name || "").toString().slice(0, 40),
            nameKey: player.nameKey || normalizeName(player.name),
            team: player.team ?? null,
            tank: player.tank ?? null,
            level: typeof player.level === "number" ? player.level : 0,
            score: typeof player.score === "number" ? player.score : 0,
            // For ip bans. Not included in client list output.
            ip: (player.ip || "").toString().slice(0, 64) || null,
            ts: now()
        };
        players.set(playerKey(nodeId, player.playerId), row);
        return row;
    }

    function playerLeave(nodeId, playerId) {
        return players.delete(playerKey(nodeId, playerId));
    }

    function playerBatch(nodeId, list = []) {
        if (!nodes.has(nodeId)) return 0;
        let count = 0;
        for (let player of list) {
            if (player && player.playerId !== undefined) {
                playerJoin(nodeId, player);
                count++;
            }
        }
        return count;
    }

    // Mark stale nodes, drop down ones with their players.
    function sweep() {
        let changed = { stale: [], down: [] };
        for (let [nodeId, node] of nodes) {
            let status = statusOf(node);
            if (status === "down") {
                removeNode(nodeId);
                changed.down.push(nodeId);
            } else if (status === "stale" && !node.wasStale) {
                node.wasStale = true;
                changed.stale.push(nodeId);
            } else if (status === "online") {
                node.wasStale = false;
            }
        }
        for (let [key, row] of players) {
            if (now() - row.ts > rowTtlMs) players.delete(key);
        }
        return changed;
    }

    function getNode(nodeId) {
        return nodes.get(nodeId) || null;
    }

    function nodeIds() {
        return [...nodes.keys()];
    }

    function snapshot() {
        let ts = now();
        let nodeRows = [];
        for (let node of nodes.values()) {
            let status = statusOf(node);
            if (status === "down") continue;
            nodeRows.push({
                nodeId: node.nodeId,
                region: node.info.region,
                serverhost: node.info.serverhost,
                location: node.info.location,
                gameMode: node.info.gamemode,
                players: node.players || 0,
                maxPlayers: node.maxPlayers || 0,
                startedAt: node.startedAt || null,
                uptimeMs: node.startedAt ? Math.max(0, ts - node.startedAt) : null,
                status,
                caps: node.info.caps,
                host: node.info.host,
                port: node.info.port,
                displayName: node.info.displayName,
                featured: node.info.featured,
                unlisted: node.info.unlisted,
                private: node.info.private,
                hidden: node.info.hidden
            });
        }
        return { ts, nodes: nodeRows, players: [...players.values()] };
    }

    return {
        hello,
        heartbeat,
        touch,
        removeNode,
        playerJoin,
        playerLeave,
        playerBatch,
        sweep,
        getNode,
        nodeIds,
        snapshot
    };
}

module.exports = { createRegistry };
