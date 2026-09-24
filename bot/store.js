// Bot-local save code store. Same conventions as control (TEXT keys, INTEGER
// timestamps, WAL), but its own file: OSA has no game-side saves yet, so the
// bot owns claims until a player.restore command exists to apply them.
let fs = require("fs");
let path = require("path");
let Database = require("better-sqlite3");

function openSaves(dataDir) {
    fs.mkdirSync(dataDir, { recursive: true });
    let db = new Database(path.join(dataDir, "saves.db"));
    db.pragma("journal_mode = WAL");
    db.exec(`
    CREATE TABLE IF NOT EXISTS save_codes (
        code_hash TEXT PRIMARY KEY,
        code TEXT,
        discord_id TEXT,
        used INTEGER DEFAULT 0,
        discarded INTEGER DEFAULT 0,
        claimed_at INTEGER,
        used_at INTEGER
    );
    CREATE INDEX IF NOT EXISTS idx_save_codes_user ON save_codes (discord_id, claimed_at);
    `);
    let getStmt = db.prepare("SELECT * FROM save_codes WHERE code_hash = ?");
    let listStmt = db.prepare("SELECT * FROM save_codes WHERE discord_id = ? ORDER BY claimed_at ASC");
    let claimStmt = db.prepare("INSERT INTO save_codes (code_hash, code, discord_id, used, discarded, claimed_at, used_at) VALUES (?, ?, ?, 0, 0, ?, NULL)");
    let usedStmt = db.prepare("UPDATE save_codes SET used = 1, used_at = ? WHERE code_hash = ?");
    let unusedStmt = db.prepare("UPDATE save_codes SET used = 0, used_at = NULL WHERE code_hash = ?");
    let discardStmt = db.prepare("UPDATE save_codes SET discarded = 1 WHERE code_hash = ?");
    return {
        get: (hash) => getStmt.get(hash) || null,
        listByUser: (discordId) => listStmt.all(discordId),
        claim: (hash, code, discordId, now) => claimStmt.run(hash, code, discordId, now),
        markUsed: (hash, now) => usedStmt.run(hash, now),
        markUnused: (hash) => unusedStmt.run(hash),
        discard: (hash) => discardStmt.run(hash),
        close: () => db.close()
    };
}

// Every node id control ever reported, so $all keeps listing dropped
// servers as offline instead of forgetting them on restart.
function openSeen(dataDir) {
    fs.mkdirSync(dataDir, { recursive: true });
    let db = new Database(path.join(dataDir, "seen.db"));
    db.pragma("journal_mode = WAL");
    db.exec("CREATE TABLE IF NOT EXISTS seen_nodes (node_id TEXT PRIMARY KEY, last_seen INTEGER)");
    let allStmt = db.prepare("SELECT node_id FROM seen_nodes");
    let touchStmt = db.prepare("INSERT INTO seen_nodes (node_id, last_seen) VALUES (?, ?) ON CONFLICT(node_id) DO UPDATE SET last_seen = ?");
    return {
        ids: () => new Set(allStmt.all().map((row) => row.node_id)),
        touch: (ids, now) => {
            let batch = db.transaction((list) => {
                for (let id of list) {
                    touchStmt.run(id, now, now);
                }
            });
            batch([...ids]);
        },
        close: () => db.close()
    };
}

module.exports = { openSaves, openSeen };
