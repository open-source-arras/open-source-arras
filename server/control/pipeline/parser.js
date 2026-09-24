// Tokens into a pipeline AST: { scope, input, ops, terminal }. Terminals
// end the pipeline; anything after an action word is raw args.
let { lex } = require("./lexer.js");

const SERVER_KEYS = ["id", "mode", "uptime", "players"];
const PLAYER_KEYS = ["id", "name", "team", "class", "level", "score"];
const PLAYER_ALIASES = { points: "score" };
const VIEW_TERMINALS = ["players", "l", "verbose", "v", "all", "a", "uptime", "modes", "help", "%"];
const ACTIONS = ["reset", "kill", "kick", "ban", "restart", "broadcast"];
const SAVE_COMMANDS = ["view", "claim", "discard", "saves"];
const MAX_ROWS = 200;

// First letter or two resolves a key, exact names win, ties are errors.
function resolveKey(kind, raw) {
    let names = kind === "servers" ? SERVER_KEYS : PLAYER_KEYS;
    let lower = raw.toLowerCase();
    if (PLAYER_ALIASES[lower]) return PLAYER_ALIASES[lower];
    if (names.includes(lower)) return lower;
    let hits = names.filter((name) => name.startsWith(lower));
    if (kind === "players") {
        for (let alias in PLAYER_ALIASES) {
            if (alias.startsWith(lower)) hits.push(PLAYER_ALIASES[alias]);
        }
    }
    hits = [...new Set(hits)];
    if (hits.length === 1) return hits[0];
    if (hits.length > 1) return { ambiguous: hits };
    return null;
}

// With no list picked yet the key picks it: players-only keys mean players,
// everything else (including id, which both lists have) means servers.
function resolveEither(raw) {
    let lower = raw.toLowerCase();
    if (PLAYER_ALIASES[lower]) return { key: PLAYER_ALIASES[lower], kind: "players" };
    let inServers = SERVER_KEYS.includes(lower);
    let inPlayers = PLAYER_KEYS.includes(lower);
    if (inServers && inPlayers) return { key: lower, kind: "servers" };
    if (inServers) return { key: lower, kind: "servers" };
    if (inPlayers) return { key: lower, kind: "players" };
    let serverHits = SERVER_KEYS.filter((name) => name.startsWith(lower));
    let playerHits = PLAYER_KEYS.filter((name) => name.startsWith(lower));
    if (serverHits.length + playerHits.length === 1) {
        return serverHits.length === 1
            ? { key: serverHits[0], kind: "servers" }
            : { key: playerHits[0], kind: "players" };
    }
    if (serverHits.length + playerHits.length > 1) {
        return { ambiguous: [...serverHits.map((k) => "servers." + k), ...playerHits.map((k) => "players." + k)] };
    }
    return null;
}

function parseKeyOp(token, input) {
    let match = token.match(/^([A-Za-z]+)(!=|!~|!\/|<=|>=|=|~|\/|<|>)([\s\S]*)$/);
    if (!match) return null;
    let key;
    let kind = input;
    if (input) {
        key = resolveKey(input, match[1]);
    } else {
        let either = resolveEither(match[1]);
        if (either && either.ambiguous) return { error: "ambiguous_key", detail: match[1], candidates: either.ambiguous };
        if (!either) return { error: "unknown_key", detail: match[1] };
        key = either.key;
        kind = either.kind;
    }
    if (key && key.ambiguous) return { error: "ambiguous_key", detail: match[1], candidates: key.ambiguous };
    if (!key) return { error: "unknown_key", detail: match[1] };
    let op = match[2];
    let value = match[3];
    if (op === "/" || op === "!/") {
        if (!value.endsWith("/") || value.length < 2) return { error: "bad_filter", detail: token };
        value = value.slice(0, -1);
        if (value.length > 64) return { error: "bad_filter", detail: token };
        try {
            // eslint-disable-next-line no-unused-vars
            let check = new RegExp(value);
        } catch {
            return { error: "bad_filter", detail: token };
        }
    }
    if (value.length === 0) return { error: "bad_filter", detail: token };
    return { op: "filter", key, operator: op, value, input: kind };
}

function parse(tokens) {
    let ast = { scope: null, input: null, ops: [], terminal: null, listed: false };
    let i = 0;

    // A leading #id scopes the whole pipeline to one server.
    if (tokens[0].startsWith("#")) {
        ast.scope = tokens[0].slice(1);
        if (!ast.scope) return { ok: false, error: "bad_scope" };
        i = 1;
        if (i >= tokens.length) {
            ast.input = "servers";
            ast.terminal = { kind: "servers" };
            return { ok: true, ast };
        }
    }

    for (; i < tokens.length; i++) {
        let token = tokens[i];
        let lower = token.toLowerCase();

        if (ast.terminal) return { ok: false, error: "after_terminal", detail: token };
        if (SAVE_COMMANDS.includes(lower)) return { ok: false, error: "unsupported", detail: lower };

        if (lower === "servers" || lower === "s") {
            ast.input = "servers";
            continue;
        }
        if (lower === "players" || lower === "l") {
            ast.listed = true;
            if (ast.input === "players" && !ast.terminal) {
                ast.terminal = { kind: "players" };
                continue;
            }
            ast.input = "players";
            continue;
        }
        if (lower === "ping" || lower === "p") {
            // At the end it is a terminal, mid-chain it annotates and passes through.
            if (i === tokens.length - 1) ast.terminal = { kind: "ping" };
            else ast.ops.push({ op: "ping" });
            continue;
        }
        if (VIEW_TERMINALS.includes(lower)) {
            ast.terminal = { kind: lower === "l" ? "players" : lower };
            continue;
        }
        if (ACTIONS.includes(lower)) {
            ast.terminal = { kind: "action", action: lower, args: tokens.slice(i + 1) };
            break;
        }
        if (/^\d+$/.test(token)) {
            ast.ops.push({ op: "nth", n: Number(token) });
            continue;
        }
        let slice = token.match(/^(\d+):(\d+)$/);
        if (slice) {
            ast.ops.push({ op: "slice", from: Number(slice[1]), to: Number(slice[2]) });
            continue;
        }
        if (/^[+-][A-Za-z]+$/.test(token) || /^[A-Za-z]+[+-]$/.test(token)) {
            let prefix = token[0] === "+" || token[0] === "-";
            let raw = prefix ? token.slice(1) : token.slice(0, -1);
            let dir = (prefix ? token[0] : token[token.length - 1]) === "+" ? 1 : -1;
            let key;
            let kind = ast.input;
            if (ast.input) {
                key = resolveKey(ast.input, raw);
            } else {
                let either = resolveEither(raw);
                if (either && either.ambiguous) return { ok: false, error: "ambiguous_key", detail: token, candidates: either.ambiguous };
                if (!either) return { ok: false, error: "unknown_key", detail: token };
                key = either.key;
                kind = either.kind;
            }
            if (key && key.ambiguous) return { ok: false, error: "ambiguous_key", detail: token, candidates: key.ambiguous };
            if (!key) return { ok: false, error: "unknown_key", detail: token };
            if (!ast.input) ast.input = kind;
            ast.ops.push({ op: "sort", key, dir, input: kind });
            continue;
        }
        if (token.startsWith("#")) {
            ast.ops.push({ op: "filter", key: "id", operator: "=", value: token.slice(1), input: ast.input || null });
            continue;
        }
        let filter = parseKeyOp(token, ast.input);
        if (filter) {
            if (filter.error) return { ok: false, ...filter };
            if (!ast.input) ast.input = filter.input;
            ast.ops.push(filter);
            continue;
        }
        return { ok: false, error: "unknown_token", detail: token };
    }

    if (!ast.terminal) {
        // Bare list walk with no terminal reads the leaderboard.
        ast.terminal = { kind: ast.input === "servers" ? "servers" : "players" };
    }
    return { ok: true, ast };
}

function parseQuery(text) {
    let lexed = lex(text);
    if (!lexed.ok) return lexed;
    return parse(lexed.tokens);
}

module.exports = {
    parseQuery,
    lex,
    SERVER_KEYS,
    PLAYER_KEYS,
    ACTIONS,
    MAX_ROWS,
    resolveKey
};
