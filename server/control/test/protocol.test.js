let { describe, it } = require("node:test");
let assert = require("node:assert/strict");
let protocol = require("../protocol.js");

describe("wrap", () => {
    it("builds a versioned envelope with id and timestamp", () => {
        let frame = JSON.parse(protocol.wrap("heartbeat", { players: 3 }));
        assert.equal(frame.v, 1);
        assert.equal(frame.type, "heartbeat");
        assert.equal(frame.data.players, 3);
        assert.equal(typeof frame.id, "string");
        assert.equal(typeof frame.ts, "number");
    });

    it("keeps a caller supplied id", () => {
        let frame = JSON.parse(protocol.wrap("query", {}, "abc"));
        assert.equal(frame.id, "abc");
    });
});

describe("parseFrame", () => {
    it("accepts a valid frame", () => {
        let raw = protocol.wrap("heartbeat", { players: 1 });
        let result = protocol.parseFrame(raw, protocol.NODE_IN);
        assert.equal(result.ok, true);
        assert.equal(result.frame.type, "heartbeat");
        assert.equal(result.frame.data.players, 1);
    });

    it("rejects bad json, wrong version and unknown types", () => {
        assert.equal(protocol.parseFrame("nope", protocol.NODE_IN).error, "bad_json");
        assert.equal(protocol.parseFrame(JSON.stringify({ v: 2, type: "heartbeat" }), protocol.NODE_IN).error, "bad_version");
        assert.equal(protocol.parseFrame(JSON.stringify({ v: 1, type: "query" }), protocol.NODE_IN).error, "unexpected_frame");
    });

    it("rejects oversized frames and malformed shapes", () => {
        assert.equal(protocol.parseFrame("x".repeat(protocol.MAX_FRAME_BYTES + 1), protocol.NODE_IN).error, "frame_too_large");
        assert.equal(protocol.parseFrame(JSON.stringify([1, 2]), protocol.NODE_IN).error, "bad_frame");
        assert.equal(protocol.parseFrame(JSON.stringify({ v: 1, type: "heartbeat", data: [1] }), protocol.NODE_IN).error, "bad_data");
        assert.equal(protocol.parseFrame(JSON.stringify({ v: 1, type: "heartbeat", id: 5 }), protocol.NODE_IN).error, "bad_id");
    });
});

describe("normalizeName", () => {
    it("lowercases and strips non-alphanumerics", () => {
        assert.equal(protocol.normalizeName("Test!"), "test");
        assert.equal(protocol.normalizeName("t e s t"), "test");
        assert.equal(protocol.normalizeName("Pl4y3r_X"), "pl4y3rx");
        assert.equal(protocol.normalizeName(null), "");
    });
});
