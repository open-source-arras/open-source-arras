let { describe, it } = require("node:test");
let assert = require("node:assert/strict");
let { createRegistry } = require("../registry.js");

function testRegistry() {
    return createRegistry({ now: () => 1_000_000 });
}

describe("registry nodes", () => {
    it("tracks hello and heartbeat", () => {
        let reg = testRegistry();
        reg.hello("epl", { region: "EU", gamemode: ["ffa"], caps: ["player.resetScore"] }, "2.1.2");
        reg.heartbeat("epl", { players: 3, maxPlayers: 80, startedAt: 999_000 });
        let snap = reg.snapshot();
        assert.equal(snap.nodes.length, 1);
        assert.equal(snap.nodes[0].status, "online");
        assert.equal(snap.nodes[0].players, 3);
        assert.equal(snap.nodes[0].uptimeMs, 1000);
        assert.deepEqual(snap.nodes[0].caps, ["player.resetScore"]);
    });

    it("marks stale then drops down nodes with their players", () => {
        let t = 1_000_000;
        let reg = createRegistry({ now: () => t, staleMs: 15_000, downMs: 60_000 });
        reg.hello("epl", {});
        reg.playerJoin("epl", { playerId: "p1", name: "Test" });
        t += 16_000;
        assert.deepEqual(reg.sweep().stale, ["epl"]);
        assert.equal(reg.snapshot().nodes[0].status, "stale");
        t += 60_000;
        assert.deepEqual(reg.sweep().down, ["epl"]);
        assert.equal(reg.snapshot().nodes.length, 0);
        assert.equal(reg.snapshot().players.length, 0);
    });

    it("ignores heartbeats and events for unknown nodes", () => {
        let reg = testRegistry();
        assert.equal(reg.heartbeat("nope", { players: 1 }), null);
        assert.equal(reg.playerJoin("nope", { playerId: "p1" }), null);
        assert.equal(reg.playerBatch("nope", [{ playerId: "p1" }]), 0);
    });

    it("carries public list fields and refreshes the display name", () => {
        let reg = testRegistry();
        reg.hello("la", {
            region: "Local",
            gamemode: ["ffa"],
            host: "localhost:3001",
            port: 3001,
            displayName: "Unknown",
            featured: true,
            unlisted: true,
            private: true,
            hidden: true
        });
        reg.heartbeat("la", { players: 1, displayName: "FFA" });
        let node = reg.snapshot().nodes[0];
        assert.equal(node.host, "localhost:3001");
        assert.equal(node.port, 3001);
        assert.equal(node.displayName, "FFA");
        assert.equal(node.featured, true);
        assert.equal(node.unlisted, true);
        assert.equal(node.private, true);
        assert.equal(node.hidden, true);
    });
});

describe("registry players", () => {
    it("joins, batches, leaves, and normalizes names", () => {
        let reg = testRegistry();
        reg.hello("epl", {});
        reg.playerJoin("epl", { playerId: "p1", name: "TEST!", level: 45, score: 100 });
        reg.playerBatch("epl", [{ playerId: "p2", name: "t e s t" }, { bad: true }]);
        let snap = reg.snapshot();
        assert.equal(snap.players.length, 2);
        assert.equal(snap.players[0].nameKey, "test");
        assert.equal(snap.players[1].nameKey, "test");
        assert.equal(reg.playerLeave("epl", "p1"), true);
        assert.equal(reg.snapshot().players.length, 1);
    });

    it("expires stale rows", () => {
        let t = 1_000_000;
        let reg = createRegistry({ now: () => t, rowTtlMs: 90_000 });
        reg.hello("epl", {});
        reg.playerJoin("epl", { playerId: "p1", name: "Test" });
        t += 91_000;
        reg.sweep();
        assert.equal(reg.snapshot().players.length, 0);
    });
});
