let { describe, it } = require("node:test");
let assert = require("node:assert/strict");
let { snapshotToList, totalPlayers } = require("../serverList.js");

function row(overrides = {}) {
    return {
        nodeId: "la",
        region: "Local",
        serverhost: "Local",
        location: "Localhost",
        gameMode: ["ffa"],
        players: 3,
        maxPlayers: 80,
        startedAt: 1_000,
        uptimeMs: 5_000,
        status: "online",
        caps: [],
        host: "localhost:3001",
        port: 3001,
        displayName: "FFA",
        featured: false,
        unlisted: false,
        private: false,
        hidden: false,
        ...overrides
    };
}

describe("server list", () => {
    it("maps a registry row to the menu shape", () => {
        let [entry] = snapshotToList({ nodes: [row()], players: [] });
        assert.deepEqual(entry, {
            ip: "localhost:3001",
            port: 3001,
            players: 3,
            maxPlayers: 80,
            id: "la",
            featured: false,
            unlisted: false,
            private: false,
            region: "Local",
            serverhost: "Local",
            location: "Localhost",
            gameMode: "FFA"
        });
    });

    it("joins bare localhost with its port and leaves remote hosts alone", () => {
        let [local] = snapshotToList({ nodes: [row({ host: "localhost", port: 3005 })], players: [] });
        assert.equal(local.ip, "localhost:3005");
        let [remote] = snapshotToList({ nodes: [row({ host: "play.example.com", port: 3001 })], players: [] });
        assert.equal(remote.ip, "play.example.com");
    });

    it("drops hidden servers but keeps unlisted ones for the client", () => {
        let list = snapshotToList({
            nodes: [row({ nodeId: "seen", unlisted: true }), row({ nodeId: "gone", hidden: true })],
            players: []
        });
        assert.deepEqual(list.map((entry) => entry.id), ["seen"]);
    });

    it("defaults missing fields and empty snapshots", () => {
        assert.deepEqual(snapshotToList(null), []);
        assert.deepEqual(snapshotToList({ nodes: [{}], players: [] })[0], {
            ip: "",
            port: 0,
            players: 0,
            maxPlayers: 0,
            id: undefined,
            featured: false,
            unlisted: false,
            private: false,
            region: "",
            serverhost: "",
            location: "",
            gameMode: "Unknown"
        });
    });

    it("totals players across nodes", () => {
        assert.equal(totalPlayers({ nodes: [row({ players: 3 }), row({ players: 7 })], players: [] }), 10);
        assert.equal(totalPlayers(null), 0);
    });
});
