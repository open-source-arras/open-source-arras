// SQLite driver over better-sqlite3, synchronous.
let { SCHEMA } = require("./schema.js");

function openSqlite(filename) {
    let Database = require("better-sqlite3");
    let db = new Database(filename || ":memory:");
    // Standalone and embedded can share one file: wait on locks instead
    // of throwing busy on the first contention.
    db.pragma("busy_timeout = 5000");
    db.pragma("journal_mode = WAL");
    db.exec(SCHEMA);

    return {
        kind: "sqlite",
        get(sql, params = []) {
            return db.prepare(sql).get(...params) || null;
        },
        all(sql, params = []) {
            return db.prepare(sql).all(...params);
        },
        run(sql, params = []) {
            return { changes: db.prepare(sql).run(...params).changes };
        },
        exec(sql) {
            db.exec(sql);
        },
        close() {
            db.close();
        }
    };
}

module.exports = { openSqlite };
