let { describe, it } = require("node:test");
let assert = require("node:assert/strict");
let { createCommandBus } = require("../commands.js");

function testBus(capture, options = {}) {
    return createCommandBus({
        send: (nodeId, frame) => {
            capture.push({ nodeId, frame: JSON.parse(frame) });
            return true;
        },
        commandTimeoutMs: 30,
        commandRetries: 1,
        ...options
    });
}

describe("command bus", () => {
    it("dispatches per node and collects acks", async() => {
        let capture = [];
        let bus = testBus(capture);
        let promise = bus.dispatch({
            type: "player.resetScore",
            targets: { epl: ["p1"], wa: ["p3"] },
            args: {},
            actor: { source: "cli" }
        });
        assert.equal(capture.length, 2);
        assert.equal(capture[0].frame.type, "command");
        assert.deepEqual(capture[0].frame.data.target, { playerIds: ["p1"] });
        assert.ok(capture[0].frame.data.expiresAt > Date.now());
        let id = capture[0].frame.id;
        assert.equal(capture[1].frame.id, id);
        bus.onAck(id, "epl", { ok: true, result: "reset" });
        bus.onAck(id, "wa", { ok: false, error: "player_left" });
        let summary = await promise;
        assert.equal(summary.ok, false);
        assert.deepEqual(summary.results[0], { nodeId: "epl", ok: true, result: "reset", error: undefined });
        assert.equal(summary.results[1].error, "player_left");
        bus.close();
    });

    it("retries once then fails unreachable", async() => {
        let capture = [];
        let bus = testBus(capture, { commandTimeoutMs: 20 });
        let summary = await bus.dispatch({ type: "server.say", targets: { epl: [] }, args: { message: "hi" } });
        assert.equal(summary.ok, false);
        assert.equal(summary.results[0].error, "node_unreachable");
        assert.equal(capture.length, 2);
        assert.equal(capture[0].frame.id, capture[1].frame.id);
        bus.close();
    });

    it("fails fast when the socket is gone", async() => {
        let bus = createCommandBus({ send: () => false, commandTimeoutMs: 20 });
        let summary = await bus.dispatch({ type: "server.say", targets: { epl: [] } });
        assert.equal(summary.results[0].error, "node_unreachable");
        bus.close();
    });

    it("returns cached results for repeated ids", async() => {
        let capture = [];
        let bus = testBus(capture);
        let first = bus.dispatch({ id: "same", type: "server.say", targets: { epl: [] } });
        bus.onAck("same", "epl", { ok: true, result: "said" });
        assert.equal((await first).ok, true);
        let again = await bus.dispatch({ id: "same", type: "server.say", targets: { epl: [] } });
        assert.equal(again.ok, true);
        assert.equal(capture.length, 1);
        bus.close();
    });

    it("ignores acks for unknown commands and duplicate acks", async() => {
        let capture = [];
        let bus = testBus(capture);
        assert.equal(bus.onAck("nope", "epl", { ok: true }), false);
        let promise = bus.dispatch({ type: "server.say", targets: { epl: [] } });
        let id = capture[0].frame.id;
        bus.onAck(id, "epl", { ok: true, result: "said" });
        assert.equal(bus.onAck(id, "epl", { ok: true, result: "again" }), false);
        assert.equal((await promise).results[0].result, "said");
        bus.close();
    });
});
