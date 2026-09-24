let { describe, it } = require("node:test");
let assert = require("node:assert/strict");
let { mintToken, decodeToken, TOKEN_BYTES } = require("../token.js");

describe("arras token format", () => {
    it("encodes the discord id with full precision", async() => {
        // Larger than 2^53, a Number would silently round this.
        let token = mintToken("823978430294392883");
        assert.equal(Buffer.from(token, "base64").length, TOKEN_BYTES);
        assert.equal(decodeToken(token).userId, "823978430294392883");
    });

    it("carries a far-future expiry and fresh randomness", async() => {
        let first = mintToken("1");
        let second = mintToken("1");
        assert.notEqual(first, second);
        let decoded = decodeToken(first);
        assert.ok(decoded.expiresAt.getFullYear() > 9000);
        assert.equal(decoded.expired, false);
    });

    it("rejects malformed tokens", async() => {
        assert.throws(() => decodeToken("nope"), /too short/);
        assert.throws(() => decodeToken(""), /too short/);
        assert.throws(() => decodeToken(null), /too short/);
    });
});
