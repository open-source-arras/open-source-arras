// IP bans on net.BlockList. Version bumps are one atomic UPDATE.
let net = require("net");
let { newId } = require("./protocol.js");

function createBans(store, options = {}) {
    let now = options.now || (() => Date.now());

    function validIp(ip) {
        if (typeof ip !== "string") return false;
        if (ip.includes("/")) {
            let [base, mask] = ip.split("/");
            if (!net.isIP(base)) return false;
            let bits = Number(mask);
            let max = base.includes(":") ? 128 : 32;
            return Number.isInteger(bits) && bits >= 0 && bits <= max;
        }
        return net.isIP(ip) !== 0;
    }

    async function bumpVersion() {
        await store.run(
            "INSERT INTO kv (key, value) VALUES ('ban_version', '1') " +
            "ON CONFLICT(key) DO UPDATE SET value = CAST(kv.value AS INTEGER) + 1"
        );
        let row = await store.get("SELECT value FROM kv WHERE key = 'ban_version'");
        return Number(row.value);
    }

    async function version() {
        let row = await store.get("SELECT value FROM kv WHERE key = 'ban_version'");
        return row ? Number(row.value) : 0;
    }

    async function addBan({ ip, reason = "", actor = "", expiresAt = null }) {
        if (!validIp(ip)) return { ok: false, error: "bad_ip" };
        let entry = {
            id: newId(),
            ip,
            reason: reason.toString().slice(0, 300),
            actor: actor.toString().slice(0, 100),
            createdAt: now(),
            expiresAt
        };
        await store.run(
            "INSERT INTO bans (id, ip, reason, actor, created_at, expires_at) VALUES (?, ?, ?, ?, ?, ?)",
            [entry.id, entry.ip, entry.reason, entry.actor, entry.createdAt, entry.expiresAt]
        );
        entry.version = await bumpVersion();
        return { ok: true, ban: entry };
    }

    async function removeBan(id) {
        let result = await store.run("DELETE FROM bans WHERE id = ?", [id]);
        if (result.changes === 0) return { ok: false, error: "unknown_ban" };
        return { ok: true, version: await bumpVersion() };
    }

    async function prune() {
        await store.run("DELETE FROM bans WHERE expires_at IS NOT NULL AND expires_at <= ?", [now()]);
    }

    async function listBans() {
        await prune();
        return store.all("SELECT * FROM bans ORDER BY created_at DESC");
    }

    // Matching ban row, or null. Junk input returns null.
    async function checkIp(ip) {
        if (typeof ip !== "string" || ip.length === 0) return null;
        await prune();
        let bans = await store.all("SELECT * FROM bans");
        for (let ban of bans) {
            try {
                let rules = new net.BlockList();
                if (ban.ip.includes("/")) {
                    let [base, mask] = ban.ip.split("/");
                    rules.addSubnet(base, Number(mask));
                } else {
                    rules.addAddress(ban.ip);
                }
                if (rules.check(ip)) return ban;
            } catch {
                continue;
            }
        }
        return null;
    }

    return { addBan, removeBan, listBans, checkIp, version, validIp };
}

module.exports = { createBans };
