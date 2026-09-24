// Text rendering for query results. The server line format is fixed:
// Server #ej - mode w33olds9labyrinth - 1 player - 1h 1m 39.9s
function fmtDuration(ms) {
    if (ms == null || ms < 0) return "unknown";
    let totalSeconds = ms / 1000;
    let hours = Math.floor(totalSeconds / 3600);
    let minutes = Math.floor((totalSeconds % 3600) / 60);
    let seconds = (totalSeconds % 60).toFixed(1);
    let parts = [];
    if (hours > 0) parts.push(hours + "h");
    if (minutes > 0 || hours > 0) parts.push(minutes + "m");
    parts.push(seconds + "s");
    return parts.join(" ");
}

function modeText(row) {
    return ((row.gameMode || []).join(",") || "unknown").toLowerCase();
}

function serverLine(row) {
    let players = (row.players || 0) + ((row.players || 0) === 1 ? " player" : " players");
    return `Server #${row.nodeId} - mode ${modeText(row)} - ${players} - ${fmtDuration(row.uptimeMs)}`;
}

function serversText(result) {
    let lines = result.rows.map(serverLine);
    if (result.truncated) lines.push(`... and ${result.total - result.rows.length} more`);
    return lines.join("\n") || "No servers.";
}

function pad(text, width) {
    text = text.toString();
    return text.length >= width ? text.slice(0, width) : text + " ".repeat(width - text.length);
}

function playersText(result) {
    if (result.rows.length === 0) return "No players.";
    let showNode = result.rows.some((row, i) => i > 0 && result.rows[i - 1].nodeId !== row.nodeId) || result.rows.length > 1;
    let lines = result.rows.map((row) => {
        let cells = [pad(row.name || "unnamed", 20), pad(row.score || 0, 8), pad("lvl " + (row.level || 0), 8), pad(row.tank || "-", 16)];
        if (showNode) cells.push("#" + row.nodeId);
        return cells.join(" ");
    });
    if (result.truncated) lines.push(`... and ${result.total - result.rows.length} more`);
    return lines.join("\n");
}

function countText(result) {
    let servers = result.servers + (result.servers === 1 ? " server" : " servers");
    let players = result.players + (result.players === 1 ? " player" : " players");
    return `${players} on ${servers}.`;
}

function verboseText(result) {
    if (result.of === "players") return playersText(result);
    let lines = result.rows.map((row) => {
        return serverLine(row) + ` [${row.status}, cap ${row.maxPlayers}]`;
    });
    if (result.truncated) lines.push(`... and ${result.total - result.rows.length} more`);
    return lines.join("\n") || "No servers.";
}

function modesText(seen) {
    let lines = [
        "Mode ids are the gamemode names from Config.servers, lowercased.",
        "Use them with mode=, for example: servers mode=ffa ping."
    ];
    if (seen.length > 0) lines.push("Live right now: " + seen.join(", "));
    return lines.join("\n");
}

function helpText() {
    return [
        "$ servers - list servers",
        "$ #id - scope to one server, for example: #epl l",
        "$ l - player list, $ p - ping lines, $ a - totals, $ v - verbose, $ uptime, $ modes",
        "Filters: n=name, s=score, p=players, m=mode, u=uptime, t=team, c=class, l=level, i=id",
        "  key=value, key~value (contains), key/regex/, key!=value, key<=number, 0, 0:10, key+, key-",
        "Actions: reset kill kick ban restart broadcast",
        "  player actions need $ l first, reset and ban also pick one target, for example: #epl l n~\"test\" reset",
        "$ % - repeat the last result"
    ].join("\n");
}

// One short line per action outcome: reset ok: Test (epl).
function actionLine({ action, name, nodeId, ok, error }) {
    if (ok) return `${action} ok: ${name} (${nodeId})`;
    return `${action} failed: ${name} (${nodeId}, ${error || "failed"})`;
}

module.exports = {
    fmtDuration,
    serverLine,
    serversText,
    playersText,
    countText,
    verboseText,
    modesText,
    helpText,
    actionLine
};
