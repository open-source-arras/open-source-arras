let { describe, it, beforeEach } = require("node:test");
let assert = require("node:assert/strict");
let { openStore } = require("../store/index.js");
let { createBans } = require("../bans.js");
let { createPermissions } = require("../permissions.js");
let { createAuth } = require("../auth.js");

describe("bans", () => {
    let store, bans;
    beforeEach(() => {
        store = openStore({ filename: ":memory:" });
        bans = createBans(store);
    });

    it("adds, matches, and removes bans with version bumps", async() => {
        let v0 = await bans.version();
        let added = await bans.addBan({ ip: "1.2.3.4", reason: "spam", actor: "tester" });
        assert.equal(added.ok, true);
        assert.ok((await bans.version()) > v0);
        assert.ok(await bans.checkIp("1.2.3.4"));
        assert.equal(await bans.checkIp("5.6.7.8"), null);
        assert.equal((await bans.removeBan(added.ban.id)).ok, true);
        assert.equal(await bans.checkIp("1.2.3.4"), null);
        await store.close();
    });

    it("matches cidr ranges and rejects junk", async() => {
        assert.equal((await bans.addBan({ ip: "10.0.0.0/24" })).ok, true);
        assert.ok(await bans.checkIp("10.0.0.99"));
        assert.equal(await bans.checkIp("10.0.1.1"), null);
        assert.equal((await bans.addBan({ ip: "not an ip" })).ok, false);
        assert.equal(await bans.checkIp(null), null);
        assert.equal(await bans.checkIp("::1"), null);
        await store.close();
    });

    it("expires temporary bans", async() => {
        let now = Date.now();
        let expiring = createBans(store, { now: () => now });
        await expiring.addBan({ ip: "9.9.9.9", expiresAt: now + 1000 });
        assert.ok(await expiring.checkIp("9.9.9.9"));
        now += 2000;
        assert.equal(await expiring.checkIp("9.9.9.9"), null);
        assert.deepEqual(await expiring.listBans(), []);
        await store.close();
    });
});

describe("permissions", () => {
    let store, perms;
    beforeEach(async() => {
        store = openStore({ filename: ":memory:" });
        perms = createPermissions(store);
    });

    it("loads the types file", async() => {
        let types = await perms.listTypes();
        assert.equal(types.length, 5);
        assert.deepEqual(types[0], { id: "player", name: "Player", rank: 0, class: null, nameColor: null, spawnAs: null });
        assert.ok(types.some((t) => t.id === "developer" && t.rank === 7));
        assert.deepEqual((await perms.listTypes()).length, 5);
        await store.close();
    });

    it("creates users and checks ranks and flags", async() => {
        await perms.upsertUser({ discordId: "123", type: "game-mod", flags: ["list.players", "action.kick", "action.broadcast"] });
        let user = await perms.getUser("123");
        assert.equal(user.type, "game-mod");
        assert.deepEqual(user.flags, ["list.players", "action.kick", "action.broadcast"]);
        let identity = await perms.identityFor("123");
        assert.equal(identity.rank, 5);
        assert.equal(identity.typeName, "Game Mod");
        assert.equal(perms.canRun(identity, "kick").ok, true);
        assert.equal(perms.canRun(identity, "broadcast").ok, true);
        assert.equal(perms.canRun(identity, "restart").ok, false);
        assert.equal(perms.canRun(identity, "restart").reason, "forbidden");
        assert.equal(perms.canList(identity).ok, true);
        await store.close();
    });

    it("grants bot power by flags alone, never by rank", async() => {
        await perms.upsertUser({ discordId: "9", type: "developer", flags: [] });
        let identity = await perms.identityFor("9");
        assert.equal(identity.rank, 7);
        assert.equal(perms.canRun(identity, "ban").reason, "forbidden");
        assert.equal(perms.canList(identity).reason, "forbidden");
        await store.close();
    });

    it("denies unknown actions and revoked users, honors star", async() => {
        await perms.upsertUser({ discordId: "1", type: "player", flags: [] });
        let identity = await perms.identityFor("1");
        assert.equal(perms.canRun(identity, "frobnicate").reason, "unknown_action");
        assert.equal(perms.canRun(identity, "broadcast").reason, "forbidden");
        assert.equal(perms.canList(identity).reason, "forbidden");
        await perms.upsertUser({ discordId: "2", type: "player", flags: ["*"] });
        assert.equal(perms.canRun(await perms.identityFor("2"), "restart").ok, true);
        await perms.setRevoked("2", true);
        assert.equal(await perms.identityFor("2"), null);
        await store.close();
    });

    it("rejects bad user input", async() => {
        assert.equal((await perms.upsertUser({})).error, "bad_args");
        assert.equal((await perms.upsertUser({ discordId: "3", type: "nope" })).error, "bad_args");
        assert.equal((await perms.upsertUser({ discordId: "3", flags: "not json" })).error, "bad_args");
        assert.equal((await perms.upsertUser({ discordId: "4", flags: ["x".repeat(65)] })).error, "bad_args");
        await store.close();
    });
});

describe("auth", () => {
    let store, auth, perms;
    beforeEach(async() => {
        store = openStore({ filename: ":memory:" });
        perms = createPermissions(store);
        auth = createAuth(store, "test-pepper", { perms });
    });

    it("mints, redeems, resolves, and revokes", async() => {
        await perms.upsertUser({ discordId: "123", type: "developer" });
        let minted = await auth.mintCode("123");
        assert.equal(minted.ok, true);
        assert.equal(minted.code.length, 8);
        let redeemed = await auth.redeem(minted.code);
        assert.equal(redeemed.ok, true);
        assert.equal(redeemed.discordId, "123");
        assert.equal(redeemed.secret.length, 32);
        // Single use.
        assert.equal((await auth.redeem(minted.code)).error, "bad_code");
        let identity = await auth.resolveSecret(redeemed.secret);
        assert.equal(identity.rank, 7);
        assert.equal(identity.type, "developer");
        assert.equal(identity.typeName, "Developer");
        assert.equal(identity.discordId, "123");
        assert.equal(await auth.revokeSecret(redeemed.secret), true);
        assert.equal(await auth.resolveSecret(redeemed.secret), null);
        await store.close();
    });

    it("mints codes without a per-user cap", async() => {
        for (let i = 0; i < 5; i++) {
            assert.equal((await auth.mintCode("1")).ok, true);
        }
        await store.close();
    });

    it("expires codes", async() => {
        let t = Date.now();
        let expiring = createAuth(store, "test-pepper", { perms, now: () => t, codeTtlMs: 1000 });
        let minted = await expiring.mintCode("1");
        assert.equal(minted.ok, true);
        t += 2000;
        assert.equal((await expiring.redeem(minted.code)).error, "bad_code");
        await store.close();
    });

    it("rejects unknown secrets and revoked users", async() => {
        assert.equal(await auth.resolveSecret("nope"), null);
        assert.equal(await auth.resolveSecret(null), null);
        let perms = createPermissions(store);
        await perms.upsertUser({ discordId: "9", type: "beta-tester" });
        let redeemed = await auth.redeem((await auth.mintCode("9")).code);
        await perms.setRevoked("9", true);
        assert.equal(await auth.resolveSecret(redeemed.secret), null);
        await store.close();
    });

    it("distrusts tokens naming another owner", async() => {
        await perms.upsertUser({ discordId: "222", type: "player" });
        let foreign = require("../token.js").mintToken("111");
        await store.run(
            "INSERT INTO secrets (hash, discord_id, created_at, last_used_at) VALUES (?, ?, ?, ?)",
            [auth.hmacSecret(foreign), "222", Date.now(), Date.now()]
        );
        assert.equal(await auth.resolveSecret(foreign), null);
        await store.close();
    });
});
