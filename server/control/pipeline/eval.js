// Runs a parsed pipeline against a registry snapshot. Pure: no I/O,
// no permission checks (the hub gates those before calling).
let { MAX_ROWS } = require("./parser.js");
let format = require("./format.js");

const PLAYER_ACTIONS = ["reset", "kill", "kick", "ban"];
const SERVER_ACTIONS = ["restart", "broadcast"];
// Destructive player work picks one tank, not a sweep of the list.
const SINGLE_TARGET_ACTIONS = ["reset", "ban"];

function serverValue(row, key) {
    switch (key) {
        case "id": return row.nodeId;
        case "mode": return (row.gameMode || []).join(",").toLowerCase();
        case "uptime": return row.uptimeMs == null ? null : row.uptimeMs / 1000;
        case "players": return row.players;
        default: return null;
    }
}

function playerValue(row, key) {
    switch (key) {
        case "id": return (row.playerId ?? "").toString();
        case "name": return row.name || "";
        case "team": return row.team;
        case "class": return row.tank || "";
        case "level": return row.level;
        case "score": return row.score;
        default: return null;
    }
}

function asText(value) {
    if (value === null || value === undefined) return "";
    return value.toString().toLowerCase();
}

function compare(operator, rowVal, filterVal, nameKey = null) {
    switch (operator) {
        case "=": {
            if (nameKey !== null) return nameKey === filterVal.toLowerCase().replace(/[^a-z0-9]/g, "");
            if (typeof rowVal === "number") return rowVal === Number(filterVal);
            return asText(rowVal) === filterVal.toLowerCase();
        }
        case "~": {
            let hay = (nameKey !== null ? nameKey : asText(rowVal)).replace(/[^a-z0-9]/g, "");
            return hay.includes(filterVal.toLowerCase().replace(/[^a-z0-9]/g, ""));
        }
        case "/": return new RegExp(filterVal).test(asText(rowVal));
        case "!=": return !compare("=", rowVal, filterVal, nameKey);
        case "!~": return !compare("~", rowVal, filterVal, nameKey);
        case "!/": return !compare("/", rowVal, filterVal, nameKey);
        case "<=":
        case ">=":
        case "<":
        case ">": {
            let left = Number(rowVal);
            let right = Number(filterVal);
            if (Number.isNaN(left) || Number.isNaN(right)) return false;
            if (operator === "<=") return left <= right;
            if (operator === ">=") return left >= right;
            if (operator === "<") return left < right;
            return left > right;
        }
        default: return false;
    }
}

function sortRows(rows, key, dir, kind) {
    let value = kind === "servers" ? serverValue : playerValue;
    return [...rows].sort((a, b) => {
        let left = value(a, key);
        let right = value(b, key);
        if (typeof left === "number" && typeof right === "number") return (left - right) * dir;
        left = asText(left);
        right = asText(right);
        if (left < right) return -1 * dir;
        if (left > right) return 1 * dir;
        return 0;
    });
}

function evaluate(ast, snapshot, ctx = {}) {
    let scoped = snapshot.nodes.filter((row) => !ast.scope || row.nodeId === ast.scope);
    let state = {
        servers: scoped,
        serverIds: scoped.map((row) => row.nodeId),
        players: snapshot.players.filter((row) => !ast.scope || row.nodeId === ast.scope),
        input: ast.input
    };

    let terminal = ast.terminal;
    // Pulling players back onto whatever servers survive the ops above.
    function narrowPlayers() {
        state.players = snapshot.players.filter((row) => state.serverIds.includes(row.nodeId));
    }
    let playersTouched = false;

    for (let op of ast.ops) {
        let kind = op.input || state.input || "servers";
        if (op.op === "ping") continue;
        if (kind === "players" && !playersTouched) {
            narrowPlayers();
            playersTouched = true;
        }
        if (kind === "servers" && state.input === "players") {
            state.servers = scoped;
            state.serverIds = scoped.map((row) => row.nodeId);
        }
        if (op.op === "nth" || op.op === "slice") {
            let rows = kind === "players" ? state.players : state.servers;
            if (op.op === "nth") rows = rows[op.n] === undefined ? [] : [rows[op.n]];
            else rows = rows.slice(op.from, Math.max(op.from, op.to));
            if (kind === "players") state.players = rows;
            else {
                state.servers = rows;
                state.serverIds = rows.map((row) => row.nodeId);
            }
            state.input = kind;
            continue;
        }
        if (op.op === "sort") {
            let rows = sortRows(kind === "players" ? state.players : state.servers, op.key, op.dir, kind);
            if (kind === "players") state.players = rows;
            else {
                state.servers = rows;
                state.serverIds = rows.map((row) => row.nodeId);
            }
            state.input = kind;
            continue;
        }
        if (op.op === "filter") {
            if (kind === "players") {
                state.players = state.players.filter((row) => {
                    let nameKey = op.key === "name" ? row.nameKey : null;
                    return compare(op.operator, playerValue(row, op.key), op.value, nameKey);
                });
            } else {
                state.servers = state.servers.filter((row) => compare(op.operator, serverValue(row, op.key), op.value));
                state.serverIds = state.servers.map((row) => row.nodeId);
            }
            state.input = kind;
            continue;
        }
    }

    if (terminal.kind === "players" && !playersTouched) {
        narrowPlayers();
        playersTouched = true;
    }
    if (terminal.kind === "players") state.input = "players";

    switch (terminal.kind) {
        case "servers": {
            let rows = state.servers.slice(0, MAX_ROWS);
            return { kind: "servers", rows, truncated: state.servers.length > rows.length, total: state.servers.length };
        }
        case "players": {
            let rows = state.players.slice(0, MAX_ROWS);
            return { kind: "players", rows, truncated: state.players.length > rows.length, total: state.players.length };
        }
        case "ping":
        case "p": {
            let rows = state.servers.slice(0, MAX_ROWS);
            return { kind: "ping", rows, truncated: state.servers.length > rows.length, total: state.servers.length };
        }
        case "all":
        case "a": {
            let players = state.input === "players"
                ? state.players.length
                : snapshot.players.filter((row) => state.serverIds.includes(row.nodeId)).length;
            return { kind: "count", servers: state.servers.length, players };
        }
        case "verbose":
        case "v": {
            if (state.input === "players") {
                let rows = state.players.slice(0, MAX_ROWS);
                return { kind: "verbose", of: "players", rows, truncated: state.players.length > rows.length, total: state.players.length };
            }
            let rows = state.servers.slice(0, MAX_ROWS);
            return { kind: "verbose", of: "servers", rows, truncated: state.servers.length > rows.length, total: state.servers.length };
        }
        case "uptime": {
            if (ast.scope && state.servers.length > 0) {
                return { kind: "message", text: state.servers.map((row) => format.serverLine(row)).join("\n") };
            }
            if (ctx.controlStartedAt) {
                let now = ctx.now || Date.now;
                return { kind: "message", text: "Control uptime " + format.fmtDuration(now() - ctx.controlStartedAt) + "." };
            }
            return { kind: "message", text: "No servers in scope." };
        }
        case "modes": {
            let seen = [...new Set(snapshot.nodes.flatMap((row) => row.gameMode || []))];
            return { kind: "message", text: format.modesText(seen) };
        }
        case "help": return { kind: "message", text: format.helpText() };
        case "%": return { ok: false, error: "no_last_result" };
        case "action": {
            let playerTargets = [];
            let serverIds = [...state.serverIds];
            let listed = ast.listed;
            if (PLAYER_ACTIONS.includes(terminal.action)) {
                let ipBan = terminal.action === "ban" && terminal.args.length > 0;
                if (!listed && !ipBan) {
                    return { ok: false, error: "bad_args", detail: "list players first with l" };
                }
                if (listed) {
                    if (!playersTouched) narrowPlayers();
                    playerTargets = state.players.map((row) => ({ nodeId: row.nodeId, playerId: row.playerId, name: row.name, ip: row.ip || null }));
                }
            } else if (SERVER_ACTIONS.includes(terminal.action)) {
                if (state.input === "players") {
                    serverIds = [...new Set(state.players.map((row) => row.nodeId))];
                }
            }
            if (SINGLE_TARGET_ACTIONS.includes(terminal.action) && playerTargets.length > 1) {
                return { ok: false, error: "too_many_targets", detail: "pick one player" };
            }
            let total = playerTargets.length + (PLAYER_ACTIONS.includes(terminal.action) ? 0 : serverIds.length);
            if (total > MAX_ROWS) {
                return { ok: false, error: "too_many_targets", detail: total + " targets, narrow it down" };
            }
            return { kind: "action", action: terminal.action, args: terminal.args, playerTargets, serverIds };
        }
        default: return { ok: false, error: "unknown_terminal" };
    }
}

module.exports = { evaluate, PLAYER_ACTIONS, SERVER_ACTIONS, SINGLE_TARGET_ACTIONS };
