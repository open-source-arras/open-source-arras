// Postgres driver over node-postgres. Lazy required. Same method shape
// as the sqlite driver.
let { SCHEMA } = require("./schema.js");

// Rewrite ? placeholders to $1..$n, skipping ? inside string literals.
function rewritePlaceholders(sql) {
    let out = "";
    let index = 0;
    let quote = null;
    for (let i = 0; i < sql.length; i++) {
        let char = sql[i];
        if (quote) {
            out += char;
            if (char === quote && sql[i - 1] !== "\\") quote = null;
        } else if (char === "'" || char === "\"") {
            quote = char;
            out += char;
        } else if (char === "?") {
            index++;
            out += "$" + index;
        } else {
            out += char;
        }
    }
    return out;
}

function openPostgres(databaseUrl) {
    let Pool;
    try {
        Pool = require("pg").Pool;
    } catch {
        throw new Error("Postgres configured but module 'pg' is not installed. Run 'npm install pg' first.");
    }
    let pool = new Pool({ connectionString: databaseUrl });

    // Schema is created once, before first use.
    let ready = (async() => {
        let client = await pool.connect();
        try {
            await client.query(SCHEMA);
        } finally {
            client.release();
        }
    })();

    async function query(sql, params = []) {
        await ready;
        return pool.query(rewritePlaceholders(sql), params);
    }

    return {
        kind: "postgres",
        async get(sql, params = []) {
            let result = await query(sql, params);
            return result.rows[0] || null;
        },
        async all(sql, params = []) {
            let result = await query(sql, params);
            return result.rows;
        },
        async run(sql, params = []) {
            let result = await query(sql, params);
            return { changes: result.rowCount };
        },
        async exec(sql) {
            await query(sql);
        },
        async close() {
            await pool.end();
        }
    };
}

module.exports = { openPostgres, rewritePlaceholders };
