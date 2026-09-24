// Discord-bound users: a type from types.json plus flags. Rank is
// in-game power only. Flags are Discord bot power only.
const fs = require("fs");
const path = require("path");
const BOT_ACTIONS = ["reset", "kill", "broadcast", "kick", "ban", "restart"];
const DEFAULT_TYPE = "player";
const TYPES_FILE = path.join(__dirname, "types.json");

// Static list, loaded once. Tests can pass options.types instead of a file.
function loadTypes(options = {}) {
    if (Array.isArray(options.types)) return options.types.map(shapeJsonType);
    let rows = JSON.parse(fs.readFileSync(options.typesFile || TYPES_FILE, "utf8"));
    if (!Array.isArray(rows)) throw new Error("types file must be a JSON array");
    return rows.map(shapeJsonType).sort((a, b) => a.rank - b.rank);
}

function shapeJsonType(row) {
    if (!row || typeof row.id !== "string" || !row.name) throw new Error("bad type entry");
    return {
        id: row.id,
        name: String(row.name),
        rank: Number(row.rank) || 0,
        class: row.class || null,
        nameColor: row.nameColor || null,
        spawnAs: row.spawnAs || null
    };
}

function parseFlags(flags) {
    if (Array.isArray(flags)) return flags.map(String);
    if (typeof flags === "string" && flags.length > 0) {
        try {
            let parsed = JSON.parse(flags);
            return Array.isArray(parsed) ? parsed.map(String) : [];
        } catch {
            return [];
        }
    }
    return [];
}

function createPermissions(store, options = {}) {
    let now = options.now || (() => Date.now());
    let types = loadTypes(options);
    let typesById = new Map(types.map((type) => [type.id, type]));

    function shape(row) {
        if (!row) return null;
        return {
            discordId: row.discord_id,
            type: row.type || DEFAULT_TYPE,
            flags: parseFlags(row.flags),
            class: row.class,
            nameColor: row.name_color,
            spawnAs: row.spawn_as,
            revoked: !!row.revoked,
            createdAt: row.created_at,
            updatedAt: row.updated_at
        };
    }

    async function getType(id) {
        return typesById.get(id) || null;
    }

    async function listTypes() {
        return [...types];
    }

    async function getUser(discordId) {
        return shape(await store.get("SELECT * FROM users WHERE discord_id = ?", [discordId]));
    }

    async function upsertUser({ discordId, type = DEFAULT_TYPE, flags = [], class: cls = null, nameColor = null, spawnAs = null }) {
        discordId = (discordId || "").toString();
        if (!discordId) return { ok: false, error: "bad_args", detail: "discordId required" };
        type = (type || DEFAULT_TYPE).toString().toLowerCase();
        if (!await getType(type)) return { ok: false, error: "bad_args", detail: "unknown type: " + type };
        if (!Array.isArray(flags) && typeof flags !== "string") {
            return { ok: false, error: "bad_args", detail: "flags must be an array" };
        }
        if (typeof flags === "string" && flags.trim() !== "") {
            try {
                if (!Array.isArray(JSON.parse(flags))) throw new Error();
            } catch {
                return { ok: false, error: "bad_args", detail: "flags must be an array" };
            }
        }
        let cleanFlags = parseFlags(flags);
        if (cleanFlags.length > 20 || cleanFlags.some((flag) => flag.length === 0 || flag.length > 64)) {
            return { ok: false, error: "bad_args", detail: "flags must be 1-64 chars, at most 20" };
        }
        let row = {
            discord_id: discordId,
            type,
            flags: JSON.stringify(cleanFlags),
            class: cls,
            name_color: nameColor,
            spawn_as: spawnAs,
            updated_at: now()
        };
        let existing = await store.get("SELECT discord_id FROM users WHERE discord_id = ?", [discordId]);
        if (existing) {
            await store.run(
                "UPDATE users SET type = ?, flags = ?, class = ?, name_color = ?, spawn_as = ?, updated_at = ? WHERE discord_id = ?",
                [row.type, row.flags, row.class, row.name_color, row.spawn_as, row.updated_at, discordId]
            );
        } else {
            await store.run(
                "INSERT INTO users (discord_id, type, flags, class, name_color, spawn_as, revoked, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, 0, ?, ?)",
                [discordId, row.type, row.flags, row.class, row.name_color, row.spawn_as, now(), row.updated_at]
            );
        }
        return { ok: true, user: await getUser(discordId) };
    }

    async function setRevoked(discordId, revoked) {
        let result = await store.run("UPDATE users SET revoked = ?, updated_at = ? WHERE discord_id = ?", [revoked ? 1 : 0, now(), discordId]);
        return result.changes > 0;
    }

    async function listUsers() {
        let rows = await store.all("SELECT * FROM users ORDER BY updated_at DESC");
        return rows.map(shape);
    }

    // Full identity for a discord id, rank resolved from the type list.
    // Unknown types fall back to rank 0 instead of locking the user out.
    async function identityFor(discordId) {
        let user = await getUser(discordId);
        if (!user || user.revoked) return null;
        let type = await getType(user.type);
        return {
            discordId: user.discordId,
            type: user.type,
            typeName: type ? type.name : user.type,
            rank: type ? type.rank : 0,
            flags: user.flags,
            class: user.class || (type && type.class),
            nameColor: user.nameColor || (type && type.nameColor),
            spawnAs: user.spawnAs || (type && type.spawnAs)
        };
    }

    function hasFlag(identity, flag) {
        let flags = identity.flags || [];
        return flags.includes("*") || flags.includes(flag);
    }

    // Flags only. Rank is for in-game, not here. Unknown actions deny.
    function canRun(identity, action) {
        if (!identity || identity.revoked) return { ok: false, reason: "revoked" };
        if (hasFlag(identity, "*") || hasFlag(identity, "action." + action)) return { ok: true };
        if (!BOT_ACTIONS.includes(action)) return { ok: false, reason: "unknown_action" };
        return { ok: false, reason: "forbidden" };
    }

    function canList(identity) {
        if (!identity || identity.revoked) return { ok: false, reason: "revoked" };
        if (hasFlag(identity, "*") || hasFlag(identity, "list.players")) return { ok: true };
        return { ok: false, reason: "forbidden" };
    }

    return {
        getUser,
        getType,
        listTypes,
        upsertUser,
        setRevoked,
        listUsers,
        identityFor,
        canRun,
        canList,
        hasFlag
    };
}

module.exports = { createPermissions, BOT_ACTIONS, DEFAULT_TYPE };
