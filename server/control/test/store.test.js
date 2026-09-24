let { describe, it } = require("node:test");
let assert = require("node:assert/strict");
let { execFile } = require("node:child_process");
let fs = require("fs");
let os = require("os");
let path = require("path");
let { openStore } = require("../store/index.js");
let { migrateStore } = require("../store/schema.js");
let { rewritePlaceholders } = require("../store/postgres.js");

describe("sqlite store", () => {
    it("runs crud with ? placeholders", async() => {
        let store = openStore({ filename: ":memory:" });
        await store.run("INSERT INTO kv (key, value) VALUES (?, ?)", ["a", "1"]);
        assert.equal((await store.get("SELECT value FROM kv WHERE key = ?", ["a"])).value, "1");
        assert.equal((await store.run("UPDATE kv SET value = ? WHERE key = ?", ["2", "a"])).changes, 1);
        assert.deepEqual(await store.all("SELECT key FROM kv"), [{ key: "a" }]);
        assert.equal(await store.get("SELECT value FROM kv WHERE key = ?", ["missing"]), null);
        await store.close();
    });

    it("creates all tables on open", async() => {
        let store = openStore({ filename: ":memory:" });
        for (let table of ["users", "secrets", "auth_codes", "bans", "kv"]) {
            let row = await store.get("SELECT name FROM sqlite_master WHERE type = 'table' AND name = ?", [table]);
            assert.ok(row, "missing table " + table);
        }
        let types = await store.get("SELECT name FROM sqlite_master WHERE type = 'table' AND name = 'types'");
        assert.equal(types, null);
        let audit = await store.get("SELECT name FROM sqlite_master WHERE type = 'table' AND name = 'audit'");
        assert.equal(audit, null);
        let columns = await store.all("PRAGMA table_info(users)");
        assert.ok(!columns.some((column) => column.name === "name"));
        assert.ok(columns.some((column) => column.name === "type"));
        await store.close();
    });

    it("survives two processes sharing one file", async(t) => {
        if (process.platform === "win32") t.skip("posix locking semantics");
        else {
            let dir = fs.mkdtempSync(path.join(os.tmpdir(), "osa-shared-"));
            let file = path.join(dir, "shared.db");
            let worker = `let s = require(${JSON.stringify(path.join(__dirname, "../store/index.js"))}).openStore({ filename: ${JSON.stringify(file)} });
                (async() => {
                    for (let i = 0; i < 50; i++) {
                        await s.run("INSERT INTO kv (key, value) VALUES (?, ?) ON CONFLICT(key) DO UPDATE SET value = excluded.value", ["w" + process.argv[1], String(i)]);
                    }
                    await s.close();
                })().catch((e) => { console.error(e.message); process.exit(1); });`;
            let run = (n) => new Promise((resolve, reject) => {
                execFile(process.execPath, ["-e", worker, String(n)], { cwd: path.join(__dirname, "../../..") }, (err) => {
                    if (err) reject(err);
                    else resolve();
                });
            });
            await Promise.all([run(1), run(2)]);
            let store = openStore({ filename: file });
            assert.equal((await store.get("SELECT COUNT(*) AS n FROM kv WHERE key LIKE 'w%'")).n, 2);
            await store.close();
            fs.rmSync(dir, { recursive: true, force: true });
        }
    });
    it("migrates old databases to types", async() => {
        let store = openStore({ filename: ":memory:" });
        await store.exec("DROP TABLE users");
        await store.exec("DROP TABLE secrets");
        await store.exec("CREATE TABLE users (discord_id TEXT PRIMARY KEY, name TEXT, level INTEGER, flags TEXT, revoked INTEGER DEFAULT 0, created_at INTEGER, updated_at INTEGER)");
        await store.exec("CREATE TABLE secrets (hash TEXT PRIMARY KEY, discord_id TEXT, created_at INTEGER, last_used_at INTEGER, revoked INTEGER DEFAULT 0)");
        await store.run("INSERT INTO users (discord_id, name, level) VALUES (?, ?, ?)", ["1", "Old", 4]);
        await store.run("INSERT INTO users (discord_id, name, level) VALUES (?, ?, ?)", ["2", "Old", 0]);
        await store.run("INSERT INTO secrets (hash, discord_id, created_at, last_used_at, revoked) VALUES (?, ?, ?, ?, 0)", ["h", "1", 1, 1]);
        await migrateStore(store);
        await migrateStore(store);
        let userColumns = await store.all("PRAGMA table_info(users)");
        assert.ok(!userColumns.some((column) => column.name === "name"));
        assert.ok(!userColumns.some((column) => column.name === "level"));
        assert.ok(userColumns.some((column) => column.name === "type"));
        let secretColumns = await store.all("PRAGMA table_info(secrets)");
        assert.ok(!secretColumns.some((column) => column.name === "revoked"));
        assert.equal((await store.get("SELECT type FROM users WHERE discord_id = ?", ["1"])).type, "beta-tester");
        assert.equal((await store.get("SELECT type FROM users WHERE discord_id = ?", ["2"])).type, "player");
        assert.equal((await store.get("SELECT value FROM kv WHERE key = 'schema_version'")).value, "5");
        let types = await store.get("SELECT name FROM sqlite_master WHERE type = 'table' AND name = 'types'");
        assert.equal(types, null);
        await store.close();
    });
});

describe("postgres driver", () => {
    it("rewrites placeholders outside literals only", () => {
        assert.equal(rewritePlaceholders("SELECT ?"), "SELECT $1");
        assert.equal(rewritePlaceholders("WHERE a = ? AND b = ?"), "WHERE a = $1 AND b = $2");
        assert.equal(rewritePlaceholders("WHERE a = '?' AND b = ?"), "WHERE a = '?' AND b = $1");
        assert.equal(rewritePlaceholders("WHERE a = \"?\" AND b = ?"), "WHERE a = \"?\" AND b = $1");
    });

    it("asks for pg when it is missing", () => {
        assert.throws(() => openStore({ databaseUrl: "postgres://localhost:5432/osa" }), /npm install pg/);
    });

    it("runs the full suite when TEST_POSTGRES_URL is set", async(t) => {
        if (!process.env.TEST_POSTGRES_URL) t.skip("no postgres available");
        else {
            let store = openStore({ databaseUrl: process.env.TEST_POSTGRES_URL });
            await store.run("INSERT INTO kv (key, value) VALUES (?, ?)", ["a", "1"]);
            assert.equal((await store.get("SELECT value FROM kv WHERE key = ?", ["a"])).value, "1");
            await store.run("DELETE FROM kv WHERE key = ?", ["a"]);
            await store.close();
        }
    });
});
