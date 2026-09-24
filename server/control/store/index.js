// Pick a driver from the database URL. Empty means SQLite in the data dir,
// a postgres:// URL means Postgres (npm install pg first).
function openStore(options = {}) {
    let databaseUrl = options.databaseUrl || "";
    if (databaseUrl.startsWith("postgres")) {
        return require("./postgres.js").openPostgres(databaseUrl);
    }
    return require("./sqlite.js").openSqlite(options.filename || ":memory:");
}

module.exports = { openStore };
