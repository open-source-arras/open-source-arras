let { describe, it } = require("node:test");
let assert = require("node:assert/strict");
let text = require("../text.js");

describe("fmtDuration", () => {
    it("matches the arras shapes", () => {
        assert.equal(text.fmtDuration(140800), "2m 20.8s");
        assert.equal(text.fmtDuration(3483300), "58m 3.3s");
    });
    it("handles days through hours and minutes", () => {
        // 1d 21h 47m 9.1s in ms
        assert.equal(text.fmtDuration(164829100), "45h 47m 9.1s");
    });
});

describe("formatRestartDate", () => {
    it("renders day month year at HH:MM", () => {
        let ts = new Date(2026, 8, 21, 9, 58, 0).getTime();
        assert.equal(text.formatRestartDate(ts), "21 September 2026 at 09:58");
    });
});

describe("save codes", () => {
    it("normalizes parens and backticks", () => {
        assert.equal(text.normalizeCode("`(abc:def)`"), "abc:def");
        assert.equal(text.normalizeCode("(abc:def)"), "abc:def");
        assert.equal(text.normalizeCode("  abc:def  "), "abc:def");
        assert.equal(text.normalizeCode(""), null);
    });
    it("accepts observed code shapes", () => {
        let inner = "1df5097afead989b:#cd:e9labyrinth:Pacifier-Byte:1/0/9/9/9/10/12/10/0/0:43661809:17020:14:5:0:3517:14:1789975303:abcdef01";
        assert.equal(text.validCode(inner), true);
        assert.equal(text.validCode("76697f20f2130214:#cd:e9labyrinth:Sword-Atmosphere:1/4/7/8/8/9/9/12/2/0:93612397:24990:100:18:0:4101:100:1786163386:cINkg5RDBlgfpSyS"), true);
    });
    it("rejects garbage", () => {
        assert.equal(text.validCode("hello"), false);
        assert.equal(text.validCode("zzzz:#cd:e:f:g:h:i"), false);
        assert.equal(text.validCode("1df5097afead989b:short"), false);
        assert.equal(text.validCode("(1df5097afead989b:#cd:e:f:g:h:i)"), false);
    });
    it("redacts only the secret tail", () => {
        assert.equal(text.redactCode("aaabbbcccdd0001:#cd:e9:x:secret99"), "(aaabbbcccdd0001:#cd:e9:x:[REDACTED])");
    });
});

describe("paginate", () => {
    it("clamps pages", () => {
        let rows = Array.from({ length: 35 }, (_, i) => i);
        let first = text.paginate(rows, 1, 15);
        assert.equal(first.rows.length, 15);
        assert.equal(first.pageCount, 3);
        assert.equal(text.paginate(rows, 9, 15).page, 3);
        assert.equal(text.paginate(rows, 0, 15).page, 1);
    });
});

describe("errors", () => {
    it("uses the header plus command shape", () => {
        assert.equal(text.errorText("Permission denied", "l"), "### Permission denied\nfor command \"l\"");
    });
    it("maps control errors", () => {
        assert.equal(text.controlErrorToReason("forbidden"), "Permission denied");
        assert.equal(text.controlErrorToReason("unknown_token"), "Invalid command format");
        assert.equal(text.controlErrorToReason("no_last_result"), "No saved result yet");
    });
});

describe("all rollup", () => {
    it("lists dropped servers as offline", () => {
        let rollup = text.buildAllRollup(
            [{ nodeId: "ev", players: 0, uptimeMs: 3483300, startedAt: 1000, status: "online" }],
            new Set(["ev", "aa"]),
            Date.now()
        );
        assert.equal(rollup.total, 2);
        assert.deepEqual(rollup.offline, ["aa"]);
        assert.match(text.allRollupText(rollup), /1\/2 online/);
    });
});

describe("days duration", () => {
    it("counts days past 24h like $all", () => {
        assert.equal(text.fmtDurationDays(90125000), "1d 1h 2m 5.0s");
        assert.equal(text.fmtDurationDays(140800), "2m 20.8s");
    });
    it("renders discord timestamps", () => {
        assert.equal(text.discordTimestamp(1790082118000), "<t:1790082118>");
    });
});

describe("ping lines", () => {
    it("pads every sampled mode to width 20", () => {
        let modes = ["m2", "c", "a1sx17citadel", "ga2b", "w33oldscdreadnoughts", "gom3t",
            "w33olds5forge", "w33olds9labyrinth", "e5nexus", "f", "af", "e0z", "4",
            "gam2ax33yins4yang", "e9labyrinth", "ge7manhuntmf", "e5forge", "ao4", "am2",
            "gamf", "gac", "gm2ax1astronghold", "g1sx17citadel", "e7manhuntmf", "m2c",
            "2d", "e8tartarus", "e5limbo", "go4", "m2ax16bunker", "ae7manhuntmf", "ga4m",
            "m2 ", "f ", "e5tartarus"];
        for (let mode of modes) {
            let padded = text.padMode(mode);
            let width = [...padded].reduce((sum, char) => sum + (char === "\t" ? 4 : 1), 0);
            assert.equal(width, 20, JSON.stringify(mode));
        }
    });
    it("matches sampled lines exactly", () => {
        assert.equal(text.padMode("af"), "\t\t\t\t  af");
        assert.equal(text.padMode("e9labyrinth"), "\t\t e9labyrinth");
        assert.equal(text.padMode("w33olds9labyrinth"), "   w33olds9labyrinth");
        assert.equal(text.padMode("f "), "\t\t\t\t  f ");
        assert.equal(text.serverLink("wa", "https://arras.io"), "[`#wa `](https://arras.io/#wa)");
        assert.equal(text.serverLink("eux", "https://arras.io"), "[`#eux`](https://arras.io/#eux)");
        assert.equal(
            text.pingLine({ nodeId: "ev", gameMode: ["af"], players: 0, uptimeMs: 3390700 }, "https://arras.io"),
            "Server [`#ev `](https://arras.io/#ev) - mode `\t\t\t\t  af` - 0 players - 56m 30.7s"
        );
        assert.equal(
            text.offlineLine("aa", "https://arras.io"),
            "Server [`#aa `](https://arras.io/#aa) - Connection timed out"
        );
    });
});

describe("player lines", () => {
    it("matches the sampled leaderboard", () => {
        assert.equal(
            text.playerLine({ playerId: 3391724, name: "Mr.Hybrid", level: 86, tank: "Top Banana", score: 192532 }),
            "`#3391724`  - Mr.Hybrid  - Level 86 Top Banana, 192532 points"
        );
        assert.equal(
            text.playerLine({ playerId: 3562660, name: "", level: 45, tank: "Builder", score: 26263 }),
            "`#3562660`  -   - Level 45 Builder, 26263 points"
        );
    });
});
describe("restore targets", () => {
    it("finds mentions and bare ids", () => {
        assert.equal(text.parseRestoreTarget(["`(code)`", "<@1206106502197289071>"]).id, "1206106502197289071");
        assert.equal(text.parseRestoreTarget(["`(code)`", "1206106502197289071"]).id, "1206106502197289071");
        assert.equal(text.parseRestoreTarget(["`(code)`"]).id, null);
    });
});
