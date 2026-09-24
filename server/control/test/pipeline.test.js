let { describe, it } = require("node:test");
let assert = require("node:assert/strict");
let { parseQuery } = require("../pipeline/parser.js");
let { evaluate } = require("../pipeline/eval.js");
let format = require("../pipeline/format.js");

function snapshot() {
    return {
        ts: 1_000_000,
        nodes: [
            { nodeId: "epl", region: "EU", serverhost: "h", location: "l", gameMode: ["ffa"], players: 2, maxPlayers: 80, startedAt: 1_000, uptimeMs: 999_000, status: "online", caps: [] },
            { nodeId: "elb", region: "EU", serverhost: "h", location: "l", gameMode: ["maze"], players: 0, maxPlayers: 80, startedAt: 2_000, uptimeMs: 998_000, status: "online", caps: [] },
            { nodeId: "wa", region: "US", serverhost: "h", location: "l", gameMode: ["tdm"], players: 5, maxPlayers: 80, startedAt: 3_000, uptimeMs: 997_000, status: "stale", caps: [] }
        ],
        players: [
            { nodeId: "epl", playerId: "p1", name: "Test", nameKey: "test", team: 0, tank: "basic", level: 45, score: 100, ts: 1 },
            { nodeId: "epl", playerId: "p2", name: "t e s t 2", nameKey: "test2", team: 0, tank: "sniper", level: 10, score: 5000, ts: 1 },
            { nodeId: "wa", playerId: "p3", name: "Other", nameKey: "other", team: -1, tank: "basic", level: 30, score: 50, ts: 1 }
        ]
    };
}

function run(text, ctx = {}) {
    let parsed = parseQuery(text);
    assert.equal(parsed.ok, true, text + " -> " + JSON.stringify(parsed));
    return evaluate(parsed.ast, snapshot(), ctx);
}

describe("parser", () => {
    it("parses the documented examples", () => {
        assert.equal(parseQuery("servers id/^[cw]/ ping players- 0 players score- 0:10").ok, true);
        assert.equal(parseQuery("#epl l n~\"test\" reset").ok, true);
        assert.equal(parseQuery("l n=playername v").ok, true);
        assert.equal(parseQuery("servers players<=3 ping").ok, true);
    });

    it("rejects junk with specific errors", () => {
        assert.equal(parseQuery("servers frobnicate").error, "unknown_token");
        assert.equal(parseQuery("servers zzz=1").error, "unknown_key");
        assert.equal(parseQuery("servers name=").error, "unknown_key");
        assert.equal(parseQuery("servers players=").error, "bad_filter");
        assert.equal(parseQuery("servers n\"open").error, "unterminated_quote");
        assert.equal(parseQuery("").error, "empty_query");
        assert.equal(parseQuery("servers all players").error, "after_terminal");
        assert.equal(parseQuery("view abc123").error, "unsupported");
        // Mid-chain ping passes through instead of ending the pipeline.
        assert.equal(parseQuery("servers ping players").ok, true);
    });

    it("handles quotes and backticks", () => {
        let parsed = parseQuery("#epl l n~'a b' kick \"griefing\"");
        assert.equal(parsed.ok, true);
        assert.deepEqual(parsed.ast.terminal.args, ["griefing"]);
    });
});

describe("eval filters", () => {
    it("matches names case and punctuation insensitively", () => {
        let result = run("#epl l n~test");
        assert.equal(result.kind, "players");
        assert.equal(result.rows.length, 2);
        result = run("#epl l n=TEST!");
        assert.equal(result.rows.length, 1);
        result = run("l n!=test");
        assert.equal(result.rows.length, 2);
    });

    it("compares numbers and regexes", () => {
        assert.equal(run("l score>=100").rows.length, 2);
        assert.equal(run("l score<100").rows.length, 1);
        assert.equal(run("servers players<=3").rows.length, 2);
        assert.equal(run("servers id/^[ew]/").rows.length, 3);
        assert.equal(run("servers mode=ffa").rows.length, 1);
        assert.equal(run("servers mode~maze").rows.length, 1);
    });

    it("sorts, slices, and infers the list", () => {
        let result = run("l score- 0");
        assert.equal(result.rows[0].name, "t e s t 2");
        result = run("players- 0");
        assert.equal(result.rows[0].nodeId, "wa");
        result = run("score- 0:2");
        assert.equal(result.kind, "players");
        assert.equal(result.rows.length, 2);
    });

    it("carries server selection into the player list", () => {
        let result = run("servers id/^e/ ping players- 0 players score- 0:10");
        assert.equal(result.kind, "players");
        assert.deepEqual(result.rows.map((r) => r.nodeId), ["epl", "epl"]);
        assert.equal(result.rows[0].name, "t e s t 2");
        // The original chain shape: only wa matches ^[cw], so its roster comes out.
        result = run("servers id/^[cw]/ ping players- 0 players score- 0:10");
        assert.deepEqual(result.rows.map((r) => r.name), ["Other"]);
    });
});

describe("eval terminals", () => {
    it("renders the documented server line", () => {
        let result = run("servers id=epl ping");
        assert.equal(result.kind, "ping");
        assert.equal(format.serversText(result), "Server #epl - mode ffa - 2 players - 16m 39.0s");
    });

    it("counts, lists, and misses empty scopes", () => {
        let result = run("servers");
        assert.equal(result.kind, "servers");
        assert.equal(result.rows.length, 3);
        result = run("a");
        assert.deepEqual([result.servers, result.players], [3, 3]);
        result = run("#nope l");
        assert.equal(result.kind, "players");
        assert.equal(result.rows.length, 0);
        assert.equal(format.playersText(result), "No players.");
    });

    it("resolves action targets", () => {
        let result = run("#epl l n=TEST! reset");
        assert.equal(result.kind, "action");
        assert.equal(result.action, "reset");
        assert.equal(result.playerTargets.length, 1);
        assert.deepEqual(result.serverIds, ["epl"]);
        result = run("#epl restart");
        assert.equal(result.action, "restart");
        assert.deepEqual(result.args, []);
        assert.deepEqual(result.serverIds, ["epl"]);
        result = run("#epl broadcast hello there");
        assert.equal(result.action, "broadcast");
        assert.deepEqual(result.args, ["hello", "there"]);
        assert.deepEqual(result.serverIds, ["epl"]);
    });

    it("gates player actions behind l and a single target", () => {
        // Bare scope + action has no list, so it is rejected.
        let result = run("#epl ban");
        assert.equal(result.ok, false);
        assert.equal(result.error, "bad_args");
        assert.equal(result.detail, "list players first with l");
        result = run("#epl reset");
        assert.equal(result.ok, false);
        assert.equal(result.detail, "list players first with l");
        result = run("#epl kill");
        assert.equal(result.ok, false);
        // Listing without narrowing is fine for kill/kick, not for reset/ban.
        result = run("#epl l kill");
        assert.equal(result.kind, "action");
        assert.equal(result.playerTargets.length, 2);
        result = run("#epl l reset");
        assert.equal(result.ok, false);
        assert.equal(result.error, "too_many_targets");
        assert.equal(result.detail, "pick one player");
        result = run("#epl l ban");
        assert.equal(result.ok, false);
        assert.equal(result.detail, "pick one player");
        result = run("#epl l n~\"test\" ban");
        assert.equal(result.ok, false);
        assert.equal(result.detail, "pick one player");
        result = run("#epl l n=TEST! ban");
        assert.equal(result.kind, "action");
        assert.equal(result.playerTargets.length, 1);
    });

    it("answers uptime, modes, help", () => {
        let result = run("uptime", { controlStartedAt: 1 });
        assert.match(result.text, /Control uptime/);
        result = run("#epl uptime");
        assert.match(result.text, /Server #epl/);
        result = run("modes");
        assert.match(result.text, /ffa/);
        result = run("help");
        assert.match(result.text, /Actions/);
    });
});

describe("format", () => {
    it("formats durations like the bot line", () => {
        assert.equal(format.fmtDuration(3_990), "4.0s");
        assert.equal(format.fmtDuration(65_200), "1m 5.2s");
        assert.equal(format.fmtDuration(3_699_900), "1h 1m 39.9s");
        assert.equal(format.fmtDuration(null), "unknown");
    });
});
