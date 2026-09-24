// Validates action terminal args into command params. Pure, no I/O.
// Duration tokens look like 30s, 10m, 2h, 7d, or perm for permanent.
function parseDuration(token) {
    if (token === null || token === undefined) return { ok: true, ms: null };
    let lower = token.toString().toLowerCase();
    if (lower === "perm" || lower === "permanent" || lower === "forever" || lower === "0") {
        return { ok: true, ms: null };
    }
    let match = lower.match(/^(\d+)(s|m|h|d)$/);
    if (!match) return { ok: false };
    let multipliers = { s: 1000, m: 60_000, h: 3_600_000, d: 86_400_000 };
    return { ok: true, ms: Number(match[1]) * multipliers[match[2]] };
}

function splitReasonDuration(args) {
    let rest = [...args];
    let durationMs = null;
    if (rest.length > 0) {
        let parsed = parseDuration(rest[rest.length - 1]);
        if (parsed.ok) {
            durationMs = parsed.ms;
            rest.pop();
        }
    }
    return { reason: rest.join(" ").slice(0, 200), durationMs };
}

function parseActionArgs(action, args, context = {}) {
    args = args || [];
    switch (action) {
        case "reset":
        case "kill":
        case "restart": {
            if (args.length > 0) return { ok: false, error: "bad_args", detail: action + " takes no arguments" };
            return { ok: true, params: {} };
        }
        case "kick": {
            return { ok: true, params: { reason: args.join(" ").slice(0, 200) } };
        }
        case "broadcast": {
            let message = args.join(" ").slice(0, 200);
            if (!message) return { ok: false, error: "bad_args", detail: "broadcast needs a message" };
            return { ok: true, params: { message } };
        }
        case "ban": {
            if (context.hasTargets) {
                let { reason, durationMs } = splitReasonDuration(args);
                return { ok: true, params: { reason, durationMs } };
            }
            if (args.length === 0) return { ok: false, error: "bad_args", detail: "ban needs an ip or a player list" };
            if (!context.validIp || !context.validIp(args[0])) {
                return { ok: false, error: "bad_args", detail: "not an ip: " + args[0] };
            }
            let { reason, durationMs } = splitReasonDuration(args.slice(1));
            return { ok: true, params: { ip: args[0], reason, durationMs } };
        }
        default: return { ok: false, error: "unknown_action", detail: action };
    }
}

module.exports = { parseActionArgs, parseDuration };
