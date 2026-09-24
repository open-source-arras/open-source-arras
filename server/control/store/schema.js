// Shared schema. One dialect: TEXT primary keys (no autoincrement),
// TEXT/INTEGER columns only, JSON in TEXT, ms timestamps, ? placeholders.
const SCHEMA = `
CREATE TABLE IF NOT EXISTS users (
    discord_id TEXT PRIMARY KEY,
    type TEXT DEFAULT 'player',
    flags TEXT,
    class TEXT,
    name_color TEXT,
    spawn_as TEXT,
    revoked INTEGER DEFAULT 0,
    created_at INTEGER,
    updated_at INTEGER
);
CREATE TABLE IF NOT EXISTS secrets (
    hash TEXT PRIMARY KEY,
    discord_id TEXT,
    created_at INTEGER,
    last_used_at INTEGER
);
CREATE TABLE IF NOT EXISTS auth_codes (
    code_hash TEXT PRIMARY KEY,
    discord_id TEXT,
    expires_at INTEGER,
    attempts INTEGER DEFAULT 0
);
CREATE TABLE IF NOT EXISTS bans (
    id TEXT PRIMARY KEY,
    ip TEXT,
    reason TEXT,
    actor TEXT,
    created_at INTEGER,
    expires_at INTEGER
);
CREATE TABLE IF NOT EXISTS kv (
    key TEXT PRIMARY KEY,
    value TEXT
);
`;

async function migrateStore(store) {
    let versionRow = await store.get("SELECT value FROM kv WHERE key = 'schema_version'");
    let version = versionRow ? Number(versionRow.value) : 0;
    if (version < 1) {
        // Display names are no longer stored, drop the column where it exists.
        try {
            await store.run("ALTER TABLE users DROP COLUMN name");
        } catch {
            // Already gone, or an old sqlite without DROP COLUMN. Either way
            // the column stays unread and unwritten from here on.
        }
        await store.run("INSERT INTO kv (key, value) VALUES ('schema_version', '1') ON CONFLICT(key) DO UPDATE SET value = '1'");
        version = 1;
    }
    if (version < 2) {
        // Permission levels became named types, backfill from the old ranks.
        try {
            await store.run("ALTER TABLE users ADD COLUMN type TEXT DEFAULT 'player'");
            await store.run("UPDATE users SET type = CASE level WHEN 2 THEN 'arena-supervisor' WHEN 3 THEN 'arena-operator' WHEN 4 THEN 'beta-tester' WHEN 5 THEN 'game-mod' WHEN 6 THEN 'game-admin' WHEN 7 THEN 'developer' ELSE 'player' END");
            await store.run("ALTER TABLE users DROP COLUMN level");
        } catch {
            // Fresh databases already have the column without the old one.
        }
        await store.run("INSERT INTO kv (key, value) VALUES ('schema_version', '2') ON CONFLICT(key) DO UPDATE SET value = '2'");
        version = 2;
    }
    if (version < 3) {
        // The audit log is gone, take its table with it.
        await store.run("DROP TABLE IF EXISTS audit");
        await store.run("INSERT INTO kv (key, value) VALUES ('schema_version', '3') ON CONFLICT(key) DO UPDATE SET value = '3'");
        version = 3;
    }
    if (version < 4) {
        // Revocation deletes rows outright now, the flag column goes too.
        try {
            await store.run("ALTER TABLE secrets DROP COLUMN revoked");
        } catch {
            // Already gone, or an old sqlite without DROP COLUMN.
        }
        await store.run("INSERT INTO kv (key, value) VALUES ('schema_version', '4') ON CONFLICT(key) DO UPDATE SET value = '4'");
        version = 4;
    }
    if (version < 5) {
        // Permission types moved to types.json, the table is gone.
        await store.run("DROP TABLE IF EXISTS types");
        await store.run("INSERT INTO kv (key, value) VALUES ('schema_version', '5') ON CONFLICT(key) DO UPDATE SET value = '5'");
    }
}

module.exports = { SCHEMA, migrateStore };
