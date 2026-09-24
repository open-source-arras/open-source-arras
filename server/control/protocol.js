// Frame envelope and validation for the control bus.
// Every WS message is JSON: { v, type, id, ts, data }.
let crypto = require("crypto");

const PROTOCOL_VERSION = 1;
const MAX_FRAME_BYTES = 256 * 1024;
const MAX_TYPE_LENGTH = 64;

// Frames a game node may send after hello.
const NODE_IN = ["hello", "heartbeat", "event", "resolveKey", "authCode", "commandAck"];
// Frames control may send to a game node.
const NODE_OUT = ["helloAck", "command", "banlist", "revokeKey", "resolveKeyResult", "authCodeResult", "error"];
// Frames the discord bot may send after hello.
const CLIENT_IN = ["hello", "query", "mintCode"];
// Frames control may send to the bot.
const CLIENT_OUT = ["helloAck", "queryResult", "commandResult", "mintCodeResult", "error"];

// Compare fixed-length digests so neither length nor prefix leaks.
function keyOk(provided, expected) {
    if (typeof provided !== "string" || typeof expected !== "string" || !expected) return false;
    let a = crypto.createHash("sha256").update(provided).digest();
    let b = crypto.createHash("sha256").update(expected).digest();
    return crypto.timingSafeEqual(a, b);
}

// Build an outbound frame string.
function wrap(type, data = {}, id = null) {
    return JSON.stringify({
        v: PROTOCOL_VERSION,
        type,
        id: id || crypto.randomUUID(),
        ts: Date.now(),
        data
    });
}

// Parse and validate an inbound frame. allowed is the frame list for this peer.
function parseFrame(raw, allowed) {
    if (typeof raw !== "string" && !Buffer.isBuffer(raw)) {
        return { ok: false, error: "bad_frame" };
    }
    let text = raw.toString();
    if (text.length > MAX_FRAME_BYTES) {
        return { ok: false, error: "frame_too_large" };
    }
    let frame;
    try {
        frame = JSON.parse(text);
    } catch {
        return { ok: false, error: "bad_json" };
    }
    if (!frame || typeof frame !== "object" || Array.isArray(frame)) {
        return { ok: false, error: "bad_frame" };
    }
    if (frame.v !== PROTOCOL_VERSION) {
        return { ok: false, error: "bad_version" };
    }
    if (typeof frame.type !== "string" || frame.type.length === 0 || frame.type.length > MAX_TYPE_LENGTH) {
        return { ok: false, error: "bad_type" };
    }
    if (!allowed.includes(frame.type)) {
        return { ok: false, error: "unexpected_frame" };
    }
    if (frame.id !== undefined && typeof frame.id !== "string") {
        return { ok: false, error: "bad_id" };
    }
    if (frame.data !== undefined && (typeof frame.data !== "object" || frame.data === null || Array.isArray(frame.data))) {
        return { ok: false, error: "bad_data" };
    }
    return {
        ok: true,
        frame: {
            type: frame.type,
            id: frame.id || null,
            ts: typeof frame.ts === "number" ? frame.ts : Date.now(),
            data: frame.data || {}
        }
    };
}

// Player names match case-insensitively with punctuation ignored,
// so n~"test" finds Test, TEST! and t e s t alike.
function normalizeName(name) {
    return (name || "").toString().toLowerCase().replace(/[^a-z0-9]/g, "");
}

function newId() {
    return crypto.randomUUID();
}

module.exports = {
    PROTOCOL_VERSION,
    MAX_FRAME_BYTES,
    NODE_IN,
    NODE_OUT,
    CLIENT_IN,
    CLIENT_OUT,
    wrap,
    parseFrame,
    keyOk,
    normalizeName,
    newId
};
