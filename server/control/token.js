// Player token, arras.io layout (see ../arras-research javascript/token):
// base64 of 24 bytes, Discord user id LE uint64, 8 opaque bytes, expiry
// LE int64 microseconds at byte 16. Our secrets do not expire, the DB does.
let crypto = require("crypto");

const TOKEN_BYTES = 24;
const ID_OFFSET = 0;
const EXPIRY_OFFSET = 16;
const NEVER_EXPIRES_MICROS = 253402300799999000n; // 9999-12-31, effectively never

function mintToken(discordId) {
    let raw = Buffer.alloc(TOKEN_BYTES);
    raw.writeBigUInt64LE(BigInt(discordId), ID_OFFSET);
    crypto.randomBytes(8).copy(raw, 8);
    raw.writeBigInt64LE(NEVER_EXPIRES_MICROS, EXPIRY_OFFSET);
    return raw.toString("base64");
}

function decodeToken(token) {
    let raw = Buffer.from((token || "").toString().trim(), "base64");
    if (raw.length < TOKEN_BYTES) throw new Error("token too short");
    let expiresAt = new Date(Number(raw.readBigInt64LE(EXPIRY_OFFSET) / 1000n));
    return {
        userId: raw.readBigUInt64LE(ID_OFFSET).toString(),
        expiresAt,
        expired: expiresAt <= new Date()
    };
}

module.exports = { mintToken, decodeToken, TOKEN_BYTES, NEVER_EXPIRES_MICROS };
