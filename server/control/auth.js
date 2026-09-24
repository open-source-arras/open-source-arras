// $auth codes become per-user secrets. Secrets are HMACs with a
// control-side pepper. Nothing here is logged.
let crypto = require("crypto");
let { mintToken, decodeToken } = require("./token.js");

const CODE_ALPHABET = "ABCDEFGHJKMNPQRSTUVWXYZ23456789";
const CODE_LENGTH = 8;
const MAX_CODE_ATTEMPTS = 10;

function sha256(text) {
    return crypto.createHash("sha256").update(text).digest("hex");
}

function createAuth(store, pepper, options = {}) {
    if (!pepper) throw new Error("auth needs a pepper");
    if (!options.perms) throw new Error("auth needs permissions for identity lookups");
    let perms = options.perms;
    let now = options.now || (() => Date.now());
    let codeTtlMs = options.codeTtlMs || 3 * 60_000;
    let lastUsed = new Map();
    let lastUsedThrottleMs = options.lastUsedThrottleMs || 10 * 60_000;

    function hmacSecret(secret) {
        return crypto.createHmac("sha256", pepper).update(secret).digest("hex");
    }

    function randomCode() {
        let out = "";
        for (let i = 0; i < CODE_LENGTH; i++) {
            out += CODE_ALPHABET[crypto.randomInt(CODE_ALPHABET.length)];
        }
        return out;
    }

    async function pruneCodes(discordId = null) {
        if (discordId) {
            await store.run("DELETE FROM auth_codes WHERE discord_id = ? AND expires_at <= ?", [discordId, now()]);
        } else {
            await store.run("DELETE FROM auth_codes WHERE expires_at <= ?", [now()]);
        }
    }

    async function mintCode(discordId) {
        discordId = discordId.toString();
        await pruneCodes(discordId);
        let code = randomCode();
        let expiresAt = now() + codeTtlMs;
        await store.run("INSERT INTO auth_codes (code_hash, discord_id, expires_at, attempts) VALUES (?, ?, ?, 0)", [sha256(code), discordId, expiresAt]);
        return { ok: true, code, expiresAt };
    }

    async function redeem(code) {
        if (typeof code !== "string") return { ok: false, error: "bad_code" };
        let row = await store.get("SELECT * FROM auth_codes WHERE code_hash = ?", [sha256(code.trim().toUpperCase())]);
        if (!row) return { ok: false, error: "bad_code" };
        let attempts = row.attempts + 1;
        await store.run("UPDATE auth_codes SET attempts = ? WHERE code_hash = ?", [attempts, row.code_hash]);
        if (row.expires_at <= now() || attempts > MAX_CODE_ATTEMPTS) {
            await store.run("DELETE FROM auth_codes WHERE code_hash = ?", [row.code_hash]);
            return { ok: false, error: "bad_code" };
        }
        await store.run("DELETE FROM auth_codes WHERE code_hash = ?", [row.code_hash]);
        let secret = mintToken(row.discord_id);
        await store.run("INSERT INTO secrets (hash, discord_id, created_at, last_used_at) VALUES (?, ?, ?, ?)", [hmacSecret(secret), row.discord_id, now(), now()]);
        return { ok: true, secret, discordId: row.discord_id };
    }

    // Hash the raw secret from the node link. We store only the hash.
    async function resolveSecret(secret) {
        if (typeof secret !== "string" || secret.length === 0) return null;
        let row = await store.get("SELECT * FROM secrets WHERE hash = ?", [hmacSecret(secret)]);
        if (!row) return null;
        // The token names its owner too; distrust a row it disagrees with.
        try {
            if (decodeToken(secret).userId !== row.discord_id) return null;
        } catch {
            return null;
        }
        let identity = await perms.identityFor(row.discord_id);
        if (!identity) return null;
        let last = lastUsed.get(row.hash) || 0;
        if (now() - last > lastUsedThrottleMs) {
            lastUsed.set(row.hash, now());
            await store.run("UPDATE secrets SET last_used_at = ? WHERE hash = ?", [now(), row.hash]);
        }
        return identity;
    }

    // Revoking forgets the secret outright, the row is deleted.
    async function revokeSecret(secret) {
        if (typeof secret !== "string") return false;
        return revokeHash(hmacSecret(secret));
    }

    async function revokeHash(hash) {
        let result = await store.run("DELETE FROM secrets WHERE hash = ?", [hash]);
        return result.changes > 0;
    }

    async function secretsFor(discordId) {
        return store.all("SELECT hash, discord_id, created_at, last_used_at FROM secrets WHERE discord_id = ? ORDER BY created_at DESC", [discordId]);
    }

    async function allSecrets() {
        return store.all("SELECT hash, discord_id, created_at, last_used_at FROM secrets ORDER BY created_at DESC LIMIT 500");
    }

    return { mintCode, redeem, resolveSecret, revokeSecret, revokeHash, secretsFor, allSecrets, pruneCodes, hmacSecret };
}

module.exports = { createAuth };
