// Pure text helpers for the bot: durations, save code handling, pagination,
// error phrasing. No discord.js, no network, so node --test covers it.
let crypto = require("crypto");

// The green bar from the live arras embeds: hsla(84, 49.8%, 49.2%, 1).
const GREEN = 0x8ABC3F;
// Error embeds are red: hsla(0, 100%, 50%, 1).
const RED = 0xFF0000;

function fmtDuration(ms) {
    if (ms == null || ms < 0) {
        return "unknown";
    }
    let totalSeconds = ms / 1000;
    let hours = Math.floor(totalSeconds / 3600);
    let minutes = Math.floor((totalSeconds % 3600) / 60);
    let seconds = (totalSeconds % 60).toFixed(1);
    let parts = [];
    if (hours > 0) {
        parts.push(hours + "h");
    }
    if (minutes > 0 || hours > 0) {
        parts.push(minutes + "m");
    }
    parts.push(seconds + "s");
    return parts.join(" ");
}

// "21 September 2026 at 09:58", the $all oldest restart shape.
function formatRestartDate(ts) {
    let date = new Date(ts);
    let day = new Intl.DateTimeFormat("en-GB", { day: "numeric" }).format(date);
    let month = new Intl.DateTimeFormat("en-GB", { month: "long" }).format(date);
    let year = new Intl.DateTimeFormat("en-GB", { year: "numeric" }).format(date);
    let time = new Intl.DateTimeFormat("en-GB", { hour: "2-digit", minute: "2-digit", hour12: false }).format(date);
    return `${day} ${month} ${year} at ${time}`;
}

// Strip backticks and one surrounding paren pair, the way $restore and
// $reinstate inputs arrive. Returns the inner code or null when empty.
function normalizeCode(raw) {
    if (typeof raw !== "string") {
        return null;
    }
    let text = raw.trim().replace(/`/g, "").trim();
    if (text.startsWith("(") && text.endsWith(")") && text.length >= 2) {
        text = text.slice(1, -1).trim();
    }
    return text || null;
}

// First segment is 16 hex chars, then colon segments of code alphabet.
// Format check only, ownership is checked in the store.
function validCode(inner) {
    if (typeof inner !== "string" || inner.length > 512) {
        return false;
    }
    if (!/^[0-9a-f]{16}:/i.test(inner)) {
        return false;
    }
    let segments = inner.split(":");
    if (segments.length < 6) {
        return false;
    }
    return segments.every((seg) => seg.length > 0 && /^[A-Za-z0-9_#.\-/+=]+$/.test(seg));
}

function codeHash(inner) {
    return crypto.createHash("sha256").update(inner).digest("hex");
}

// The secret tail never leaves DMs. Everything after the last colon goes.
function redactCode(inner) {
    let index = inner.lastIndexOf(":");
    if (index === -1) {
        return "(invalid)";
    }
    return `(${inner.slice(0, index + 1)}[REDACTED])`;
}

function fullCode(inner) {
    return `(${inner})`;
}

// 1-based pages for display, clamped so buttons can never fall off.
function paginate(rows, page, perPage) {
    let pageCount = Math.max(1, Math.ceil(rows.length / perPage));
    let current = Math.min(Math.max(1, page || 1), pageCount);
    return {
        rows: rows.slice((current - 1) * perPage, current * perPage),
        page: current,
        pageCount
    };
}

// Split long line lists into description-sized chunks (4096 max, stay low).
function chunkLines(lines, maxChars = 3500) {
    let chunks = [];
    let current = [];
    let length = 0;
    for (let line of lines) {
        if (length + line.length + 1 > maxChars && current.length > 0) {
            chunks.push(current);
            current = [];
            length = 0;
        }
        current.push(line);
        length += line.length + 1;
    }
    if (current.length > 0) {
        chunks.push(current);
    }
    return chunks.length > 0 ? chunks : [[]];
}

// Every error is two lines: a ### header, then for command "name".
function errorText(reason, command) {
    return `### ${reason}\nfor command "${command}"`;
}

// Control error enum to arras phrasing. Command is the terminal word so the
// footer names what the user actually ran (reset, claim, % and the like).
function controlErrorToReason(error, detail) {
    switch (error) {
        case "forbidden":
            return "Permission denied";
        case "rate_limited":
            return "Rate limited, slow down";
        case "no_last_result":
            return "No saved result yet";
        case "too_many_targets":
            return detail || "Too many targets, narrow it down";
        case "bad_args":
            return detail || "Invalid command format";
        case "node_unreachable":
            return "Server is offline";
        case "unsupported":
            return "Unsupported command";
        case "bad_query":
        case "empty_query":
        case "unterminated_quote":
        case "bad_scope":
        case "after_terminal":
        case "unknown_token":
        case "unknown_key":
        case "ambiguous_key":
        case "bad_filter":
        case "unknown_terminal":
        case "unknown_action":
            return "Invalid command format";
        default:
            return detail || "Command failed";
    }
}

// Roll up ping rows into the $all shape. seenIds is the bot's memory of
// every node id ever reported, so servers that dropped out still list as
// offline instead of vanishing silently.
function buildAllRollup(rows, seenIds, now) {
    let live = new Set(rows.map((row) => row.nodeId));
    let known = new Set([...seenIds, ...live]);
    let players = rows.reduce((sum, row) => sum + (row.players || 0), 0);
    let online = rows.filter((row) => row.status !== "stale").length;
    let offline = [...known].filter((id) => !live.has(id) || rows.some((row) => row.nodeId === id && row.status === "stale"));
    let oldest = null;
    for (let row of rows) {
        if (row.uptimeMs != null && (!oldest || row.uptimeMs > oldest.uptimeMs)) {
            oldest = row;
        }
    }
    return {
        total: known.size,
        players,
        online,
        offline: offline.sort(),
        oldestMs: oldest ? oldest.uptimeMs : null,
        oldestStartedAt: oldest && oldest.startedAt ? oldest.startedAt : null,
        at: now
    };
}

function allRollupText(rollup) {
    let lines = [];
    lines.push(`${rollup.total} server${rollup.total === 1 ? "" : "s"}`);
    lines.push("Total Player Count");
    lines.push(`${rollup.players}`);
    lines.push("Server Status");
    lines.push(`${rollup.online}/${rollup.total} online`);
    if (rollup.offline.length > 0) {
        lines.push("Offline Servers");
        lines.push(rollup.offline.join(", "));
    }
    if (rollup.oldestMs != null) {
        lines.push("Oldest Server Uptime");
        lines.push(fmtDuration(rollup.oldestMs));
    }
    if (rollup.oldestStartedAt != null) {
        lines.push("Oldest Server Last Restart");
        lines.push(formatRestartDate(rollup.oldestStartedAt));
    }
    return lines.join("\n");
}

// $all uptimes count days: 1d 1h 2m 5.0s. Below a day it reads like the
// short form.
function fmtDurationDays(ms) {
    if (ms == null || ms < 0) {
        return "unknown";
    }
    let days = Math.floor(ms / 86_400_000);
    if (days === 0) {
        return fmtDuration(ms);
    }
    let rest = fmtDuration(ms - days * 86_400_000);
    return `${days}d ${rest}`;
}

// Discord timestamp for the oldest restart line: <t:1790082118>.
function discordTimestamp(ts) {
    return `<t:${Math.floor(ts / 1000)}>`;
}

// Right align a mode id in a 20 wide field, tabs counting 4. Verified
// against every line of the live $p output, including modes that carry
// their own trailing space ("m2 ", "f ").
function padMode(mode) {
    mode = (mode || "").toString();
    let fill = 20 - mode.length;
    if (fill <= 0) {
        return mode;
    }
    let tabs = Math.floor(fill / 4);
    return "\t".repeat(tabs) + " ".repeat(fill - tabs * 4) + mode;
}

// Link text pads short ids to 4 chars: `#wa `, `#eux`.
function serverLink(nodeId, base) {
    let label = (`#${nodeId}`).padEnd(4, " ");
    return `[${"`" + label + "`"}](${base}/#${nodeId})`;
}

function pingLine(row, base) {
    let mode = ((row.gameMode || []).join(",") || "unknown").toLowerCase();
    let players = (row.players || 0) + ((row.players || 0) === 1 ? " player" : " players");
    return `Server ${serverLink(row.nodeId, base)} - mode \`${padMode(mode)}\` - ${players} - ${fmtDuration(row.uptimeMs)}`;
}

function offlineLine(nodeId, base) {
    // Arras distinguishes timeouts from 502/521 by probing each server.
    // Control only knows live vs gone, so every dropped server reads timed
    // out, the most common shape in the sample.
    return `Server ${serverLink(nodeId, base)} - Connection timed out`;
}

function playerLine(row) {
    let name = row.name || "";
    let tank = row.tank || "-";
    return `\`#${row.playerId}\`  - ${name}  - Level ${row.level || 0} ${tank}, ${row.score || 0} points`;
}
function parseRestoreTarget(tokens) {
    for (let i = tokens.length - 1; i >= 0; i--) {
        let mention = tokens[i].match(/^<@!?(\d+)>$/);
        if (mention) {
            return { id: mention[1], index: i };
        }
        if (/^\d{15,25}$/.test(tokens[i])) {
            return { id: tokens[i], index: i };
        }
    }
    return { id: null, index: -1 };
}

module.exports = {
    GREEN,
    RED,
    fmtDuration,
    fmtDurationDays,
    discordTimestamp,
    padMode,
    serverLink,
    pingLine,
    offlineLine,
    playerLine,
    formatRestartDate,
    normalizeCode,
    validCode,
    codeHash,
    redactCode,
    fullCode,
    paginate,
    chunkLines,
    errorText,
    controlErrorToReason,
    buildAllRollup,
    allRollupText,
    parseRestoreTarget
};
