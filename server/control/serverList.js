// Public server list from a registry snapshot, shape expected by the
// client menu (getInfo in server/game.js). Hidden dropped, unlisted kept.
function connectIp(row) {
    let host = (row.host || "").toString();
    if (!host) {
        return "";
    }
    if (host === "localhost" && row.port) {
        return `${host}:${row.port}`;
    }
    return host;
}

function snapshotToList(snapshot) {
    let nodes = (snapshot && snapshot.nodes) || [];
    return nodes
        .filter((row) => row && !row.hidden)
        .map((row) => ({
            ip: connectIp(row),
            port: row.port || 0,
            players: row.players || 0,
            maxPlayers: row.maxPlayers || 0,
            id: row.nodeId,
            featured: !!row.featured,
            unlisted: !!row.unlisted,
            private: !!row.private,
            region: row.region || "",
            serverhost: row.serverhost || "",
            location: row.location || "",
            gameMode: row.displayName || "Unknown"
        }));
}

function totalPlayers(snapshot) {
    let nodes = (snapshot && snapshot.nodes) || [];
    return nodes.reduce((sum, row) => sum + ((row && row.players) || 0), 0);
}

module.exports = { snapshotToList, totalPlayers };
