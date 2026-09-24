// Command dispatch. Thin Discord adapter over control: live queries and
// admin actions go through the hub (which enforces perms), arras-specific
// presentation (embeds, rollups, pagination, save codes) lives here.
let { parseQuery, lex } = require("../server/control/pipeline/parser.js");
let embeds = require("./embeds.js");
let text = require("./text.js");

const KNOWN = ["help", "modes", "uptime", "servers", "s", "ping", "p", "all", "a",
    "players", "l", "verbose", "v", "view", "claim", "discard", "saves", "%",
    "login", "restore", "reinstate", "reset", "kill", "kick", "ban", "restart", "broadcast"];
const PLAYER_ACTIONS = ["reset", "kill", "kick", "ban"];
const ACTION_VERBS = {
    reset: "Reset score on player",
    kill: "Killed player",
    kick: "Kicked player",
    ban: "Banned player"
};

function single(embed) {
    return { embeds: [embed], pager: null };
}

function denied(requestedBy, command) {
    return single(embeds.errorEmbed(requestedBy, "Permission denied", command));
}

function unreachable(requestedBy, command) {
    return single(embeds.errorEmbed(requestedBy, "Control unreachable", command));
}

// The word for the for command "x" footer: the terminal the user ran.
function commandName(tokens) {
    for (let i = tokens.length - 1; i >= 0; i--) {
        let lower = tokens[i].toLowerCase();
        if (KNOWN.includes(lower)) {
            return lower;
        }
    }
    return (tokens[0] || "command").toLowerCase();
}

async function controlQuery(control, body, authorId) {
    try {
        return { ok: true, data: await control.query(body, authorId) };
    } catch(err) {
        return { ok: false, error: err.message, detail: err.data && err.data.detail };
    }
}

function queryFailed(requestedBy, command, result) {
    if (result.error === "control unreachable" || result.error === "control timeout") {
        return unreachable(requestedBy, command);
    }
    return single(embeds.errorEmbed(requestedBy, text.controlErrorToReason(result.error, result.detail), command));
}

// Resolve the player rows a pipeline points at, so actions can name ids.
// Appends a player terminal when the text does not end in one already.
async function resolvePlayers(control, leftText, authorId) {
    let probe = leftText;
    if (!/\b(players|l|verbose|v)\s*$/i.test(probe)) {
        probe = probe + " l";
    }
    let result = await controlQuery(control, probe, authorId);
    if (!result.ok || (result.data.kind !== "players" && result.data.kind !== "verbose")) {
        return result;
    }
    return { ok: true, rows: result.data.rows || [] };
}

function actionSuccessLine(action, row) {
    if (action === "restart") {
        return `Restarted server #${row.nodeId} successfully!`;
    }
    let verb = ACTION_VERBS[action] || action;
    if (action === "reset") {
        return `${verb} #${row.playerId} named ${row.name} successfully!`;
    }
    return `${verb} #${row.playerId} named ${row.name} successfully!`;
}

function serverLineRows(rows) {
    return rows.map((row) => {
        let players = (row.players || 0) + ((row.players || 0) === 1 ? " player" : " players");
        let mode = ((row.gameMode || []).join(",") || "unknown").toLowerCase();
        return `Server #${row.nodeId} - mode ${mode} - ${players} - ${text.fmtDuration(row.uptimeMs)}`;
    });
}

async function handleCommand(input) {
    let { raw, authorId, authorName, isDM, control, saves, seen, config, bootTime } = input;
    let lexed = lex(raw);
    if (!lexed.ok) {
        return single(embeds.errorEmbed(authorName, "Invalid command format", "command"));
    }
    let tokens = lexed.tokens;
    if (tokens.length === 0) {
        return null;
    }
    let first = tokens[0].toLowerCase();
    let now = Date.now;

    if (first === "help") {
        return single(embeds.helpEmbed(authorName, config.inviteUrl, config.guildUrl));
    }
    if (first === "modes") {
        return single(embeds.modesEmbed(authorName));
    }
    if (first === "uptime") {
        let embed = embeds.base(authorName)
            .setDescription(`The Discord bot has been up for ${text.fmtDuration(now() - bootTime)}.`);
        return single(embed);
    }
    if (first === "login") {
        if (!isDM) {
            return single(embeds.errorEmbed(authorName, "For security reasons, the login code can only be received in a direct message channel", "login"));
        }
        let minted;
        try {
            minted = await control.mintCode(authorId);
        } catch(err) {
            if (err.message === "control unreachable" || err.message === "control timeout") {
                return unreachable(authorName, "login");
            }
            if (err.message === "too_many_codes") {
                return single(embeds.errorEmbed(authorName, "Too many active codes, redeem one first", "login"));
            }
            return single(embeds.errorEmbed(authorName, text.controlErrorToReason(err.message, err.data && err.data.detail), "login"));
        }
        return single(embeds.loginEmbed(authorName, minted.code, config.loginHost));
    }
    if (first === "claim") {
        let inner = text.normalizeCode(tokens.slice(1).join(" "));
        if (!inner || !text.validCode(inner)) {
            return single(embeds.errorEmbed(authorName, "Invalid code format", "claim"));
        }
        let hash = text.codeHash(inner);
        let existing = saves.get(hash);
        if (existing) {
            return single(embeds.errorEmbed(authorName, `This code has already been claimed by <@${existing.discord_id}>`, "claim"));
        }
        saves.claim(hash, inner, authorId, now());
        let embed = embeds.base(authorName).setDescription("Code claimed successfully!");
        return single(embed);
    }
    if (first === "saves") {
        let rows = saves.listByUser(authorId);
        let n = rows.length;
        let header = n === 1 ? "You have 1 claimed code:" : `You have ${n} claimed codes:`;
        if (n === 0) {
            return single(embeds.base(authorName).setDescription(header));
        }
        let wanted = tokens[1] ? Number(tokens[1]) : 1;
        let page = text.paginate(rows, Number.isInteger(wanted) ? wanted : 1, config.savesPerPage);
        let lines = [header];
        for (let row of page.rows) {
            lines.push(isDM ? text.fullCode(row.code) : text.redactCode(row.code));
        }
        if (!isDM) {
            lines.push("(run the command in a direct message channel to view the full code)");
        }
        if (page.pageCount > 1) {
            lines.push(`(page ${page.page} of ${page.pageCount})`);
        }
        let pages = [];
        if (page.pageCount > 1) {
            for (let p = 1; p <= page.pageCount; p++) {
                let slice = text.paginate(rows, p, config.savesPerPage);
                let desc = [header];
                for (let row of slice.rows) {
                    desc.push(isDM ? text.fullCode(row.code) : text.redactCode(row.code));
                }
                if (!isDM) {
                    desc.push("(run the command in a direct message channel to view the full code)");
                }
                desc.push(`(page ${p} of ${page.pageCount})`);
                pages.push([embeds.base(authorName).setDescription(desc.join("\n"))]);
            }
            return { embeds: pages[page.page - 1], pager: { pages } };
        }
        return single(embeds.base(authorName).setDescription(lines.join("\n")));
    }
    if (first === "view") {
        let inner = text.normalizeCode(tokens.slice(1).join(" "));
        if (!inner || !text.validCode(inner)) {
            return single(embeds.errorEmbed(authorName, "Invalid code format", "view"));
        }
        let row = saves.get(text.codeHash(inner));
        if (!row) {
            return single(embeds.errorEmbed(authorName, "Unknown save code", "view"));
        }
        let status = row.discarded ? "Discarded" : (row.used ? "Used" : "Available");
        let embed = embeds.base(authorName).setDescription(
            `${isDM ? text.fullCode(row.code) : text.redactCode(row.code)}\nClaimed by <@${row.discord_id}>\nStatus: ${status}`
        );
        return single(embed);
    }
    if (first === "discard" || first === "reinstate") {
        let inner = text.normalizeCode(tokens.slice(1).join(" "));
        if (!inner || !text.validCode(inner)) {
            return single(embeds.errorEmbed(authorName, "Invalid code format", first));
        }
        let row = saves.get(text.codeHash(inner));
        if (!row) {
            return single(embeds.errorEmbed(authorName, "Unknown save code", first));
        }
        if (row.discord_id !== authorId) {
            return denied(authorName, first);
        }
        if (first === "discard") {
            saves.discard(row.code_hash);
            return single(embeds.base(authorName).setDescription("Code discarded successfully!"));
        }
        if (!row.used) {
            return single(embeds.errorEmbed(authorName, "Code is not used", "reinstate"));
        }
        saves.markUnused(row.code_hash);
        return single(embeds.base(authorName).setDescription("Code reinstated successfully!"));
    }
    let restoreIndex = tokens.findIndex((token) => token.toLowerCase() === "restore");
    if (restoreIndex !== -1) {
        let left = tokens.slice(0, restoreIndex);
        let right = tokens.slice(restoreIndex + 1);
        if (left.length === 0) {
            return single(embeds.errorEmbed(authorName, "Invalid command format", "restore"));
        }
        // Same gate as ban/reset: you list with l, then pick one.
        if (!/\b(players|l)\b/i.test(left.join(" "))) {
            return single(embeds.errorEmbed(authorName, "List players first with l", "restore"));
        }
        let target = text.parseRestoreTarget(right);
        let targetId = target.id || authorId;
        let codeTokens = target.index === -1 ? right : right.filter((_, i) => i !== target.index);
        let inner = text.normalizeCode(codeTokens.join(" "));
        if (!inner || !text.validCode(inner)) {
            return single(embeds.errorEmbed(authorName, "Invalid code format", "restore"));
        }
        let resolved = await resolvePlayers(control, left.join(" "), authorId);
        if (!resolved.ok) {
            return queryFailed(authorName, "restore", resolved);
        }
        if (resolved.rows.length === 0) {
            return single(embeds.errorEmbed(authorName, "No players in scope", "restore"));
        }
        if (resolved.rows.length > 1) {
            return single(embeds.errorEmbed(authorName, "Too many players in scope, pick one with #id", "restore"));
        }
        let row = saves.get(text.codeHash(inner));
        if (!row) {
            return single(embeds.errorEmbed(authorName, "Unknown save code", "restore"));
        }
        if (row.discord_id !== targetId) {
            return single(embeds.errorEmbed(authorName, `Code is not claimed by <@${targetId}>`, "restore"));
        }
        if (row.discarded) {
            return single(embeds.errorEmbed(authorName, "This code has been discarded", "restore"));
        }
        if (row.used) {
            return single(embeds.errorEmbed(authorName, "This code has already been used", "restore"));
        }
        // OSA has no game-side save apply yet, so restore records the use.
        // A future player.restore command hooks in right here.
        saves.markUsed(row.code_hash, now());
        let player = resolved.rows[0];
        let embed = embeds.base(authorName)
            .setDescription(`Restored save on player #${player.playerId} named ${player.name} successfully!`);
        return single(embed);
    }

    // Everything else runs through control: views, pipelines, actions, %.
    let parsed = parseQuery(raw);
    if (!parsed.ok) {
        return single(embeds.errorEmbed(authorName, "Invalid command format", commandName(tokens)));
    }
    let terminal = parsed.ast.terminal;
    let name = commandName(tokens);

    if (terminal.kind === "action") {
        return handleAction(input, tokens, terminal, name);
    }
    if (terminal.kind === "help") {
        return single(embeds.helpEmbed(authorName, config.inviteUrl, config.guildUrl));
    }
    if (terminal.kind === "modes") {
        return single(embeds.modesEmbed(authorName));
    }
    if (terminal.kind === "uptime") {
        let embed = embeds.base(authorName)
            .setDescription(`The Discord bot has been up for ${text.fmtDuration(now() - bootTime)}.`);
        return single(embed);
    }
    if (terminal.kind === "all" || terminal.kind === "a") {
        let count = await controlQuery(control, raw, authorId);
        if (!count.ok) {
            return queryFailed(authorName, name, count);
        }
        let pingText = /\b(all|a)\s*$/i.test(raw) ? raw.replace(/\b(all|a)\s*$/i, "ping") : raw + " ping";
        if (!/\bping\b/i.test(pingText)) {
            pingText = "servers ping";
        }
        let pinged = await controlQuery(control, pingText, authorId);
        let rows = pinged.ok ? (pinged.data.rows || []) : [];
        touchSeen(seen, rows);
        let rollup = text.buildAllRollup(rows, seen.ids(), now());
        // Prefer live counts from the count terminal when it answered.
        if (count.data.kind === "count") {
            rollup.players = count.data.players;
            rollup.total = Math.max(rollup.total, count.data.servers + rollup.offline.length);
        }
        let embed = embeds.base(authorName).setTitle(`${rollup.total} servers`);
        embed.addFields(
            { name: "Total Player Count", value: `${rollup.players}`, inline: true },
            { name: "Server Status", value: `${rollup.online}/${rollup.total} online`, inline: true }
        );
        if (rollup.offline.length > 0) {
            embed.addFields({
                name: "Offline Servers",
                value: rollup.offline.map((id) => `\`${id}\``).join(", "),
                inline: true
            });
        }
        if (rollup.oldestMs != null) {
            embed.addFields({
                name: "Oldest Server Uptime",
                value: text.fmtDurationDays(rollup.oldestMs),
                inline: true
            });
        }
        if (rollup.oldestStartedAt != null) {
            embed.addFields({
                name: "Oldest Server Last Restart",
                value: text.discordTimestamp(rollup.oldestStartedAt),
                inline: true
            });
        }
        return single(embed);
    }
    let result = await controlQuery(control, raw, authorId);
    if (!result.ok) {
        return queryFailed(authorName, name, result);
    }
    return renderView(input, result.data, parsed.ast.scope || null);
}

function touchSeen(seen, rows) {
    try {
        seen.touch(rows.map((row) => row.nodeId), Date.now());
    } catch {
        // Seen memory is best effort, never fail a command for it.
    }
}

function renderView(input, data, scope) {
    let { authorName, seen, config } = input;
    if (data.kind === "servers") {
        touchSeen(seen, data.rows || []);
        let rows = data.rows || [];
        let total = data.total == null ? rows.length : data.total;
        let lines = rows.map((row) => `Server #${row.nodeId}`);
        let header = `${total} server${total === 1 ? "" : "s"}`;
        return pagedList(authorName, header, "Page", lines, config.serversPerPage);
    }
    if (data.kind === "ping") {
        touchSeen(seen, data.rows || []);
        let rows = data.rows || [];
        let live = new Set(rows.map((row) => row.nodeId));
        let lines = rows.map((row) => text.pingLine(row, config.serverBase));
        // Bare ping lists every known server, dropped ones read timed out.
        // Filtered or scoped pings only show what matched.
        let bare = scope == null && /^\s*(servers|s|ping|p)?\s*$/i.test(barePingText(input.raw));
        if (bare) {
            for (let id of [...seen.ids()].sort()) {
                if (!live.has(id)) {
                    lines.push(text.offlineLine(id, config.serverBase));
                }
            }
        }
        if (lines.length === 0) {
            return single(embeds.base(authorName).setTitle("0 servers"));
        }
        let total = bare ? lines.length : rows.length;
        return pagedPing(authorName, `${total} servers`, lines);
    }
    if (data.kind === "players") {
        let rows = data.rows || [];
        let total = data.total == null ? rows.length : data.total;
        if (rows.length === 0) {
            let empty = embeds.base(authorName);
            empty.setTitle(scope ? `0 players on \`#${scope}\`` : "0 players");
            return single(empty);
        }
        let lines = rows.map((row) => text.playerLine(row));
        let title = scope ? `${total} players on \`#${scope}\`` : `${total} players`;
        return pagedPing(authorName, title, lines, scope ? `${config.serverBase}/#${scope}` : null);
    }
    if (data.kind === "verbose") {
        if (data.of === "players") {
            return single(embeds.base(authorName).setDescription("```" + (data.text || "") + "```"));
        }
        touchSeen(seen, data.rows || []);
        let lines = (data.rows || []).map((row) => {
            return serverLineRows([row])[0] + ` [${row.status}, cap ${row.maxPlayers}]`;
        });
        if (lines.length === 0) {
            return single(embeds.base(authorName).setDescription("No servers."));
        }
        return pagedChunks(authorName, lines);
    }
    if (data.kind === "count") {
        return single(embeds.base(authorName).setDescription(data.text || ""));
    }
    if (data.kind === "message") {
        return single(embeds.base(authorName).setDescription(data.text || "Nothing to show."));
    }
    if (data.kind === "action") {
        return single(embeds.base(authorName).setDescription((data.lines || []).join("\n") || "Done."));
    }
    return single(embeds.base(authorName).setDescription("Nothing to show."));
}

function pagedList(authorName, header, pageWord, lines, perPage) {
    let page = text.paginate(lines, 1, perPage);
    if (page.pageCount === 1) {
        let desc = [header];
        if (lines.length > 1 || pageWord !== "Page") {
            desc.push(`${pageWord} 1`);
        }
        return single(embeds.base(authorName).setDescription(desc.concat(lines).join("\n") || header));
    }
    let pages = [];
    for (let p = 1; p <= page.pageCount; p++) {
        let slice = text.paginate(lines, p, perPage);
        pages.push([embeds.base(authorName).setDescription([header, `${pageWord} ${p}`].concat(slice.rows).join("\n"))]);
    }
    return { embeds: pages[0], pager: { pages } };
}

function barePingText(raw) {
    return (raw || "").replace(/^#\S+\s*/, "");
}

// Title plus Page fields, chunked to the 1024 char field cap. Buttons flip
// pages when there is more than one.
function pagedPing(authorName, title, lines, url = null) {
    let chunks = text.chunkLines(lines, 1000);
    let pages = chunks.map((chunk, i) => {
        let embed = embeds.base(authorName).setTitle(title);
        if (url) {
            embed.setURL(url);
        }
        embed.addFields({ name: `Page ${i + 1}`, value: chunk.join("\n"), inline: false });
        return [embed];
    });
    if (pages.length === 1) {
        return { embeds: pages[0], pager: null };
    }
    return { embeds: pages[0], pager: { pages } };
}

function pagedChunks(authorName, lines) {
    let chunks = text.chunkLines(lines);
    if (chunks.length === 1) {
        return single(embeds.base(authorName).setDescription(chunks[0].join("\n")));
    }
    let pages = chunks.map((chunk) => [embeds.base(authorName).setDescription(chunk.join("\n"))]);
    return { embeds: pages[0], pager: { pages } };
}

async function handleAction(input, tokens, terminal, name) {
    let { authorId, authorName, control } = input;
    let action = terminal.action;
    if (action === "ban") {
        // Bans always select a player first, raw ips are not accepted here.
        // (Direct ip bans still exist on the control bus for the panel.)
        let actionAt = tokens.findIndex((token) => token.toLowerCase() === action);
        if (actionAt <= 0) {
            return single(embeds.errorEmbed(authorName, "No players in scope", name));
        }
    }
    if (action === "restart" || action === "broadcast") {
        let result = await controlQuery(control, tokens.join(" "), authorId);
        if (!result.ok) {
            return queryFailed(authorName, name, result);
        }
        let verb = action === "restart" ? "Restarted server" : "Broadcast to server";
        let summaries = result.data.results || [];
        let lines = summaries.map((summary) => {
            if (summary.ok) {
                return `${verb} #${summary.nodeId} successfully!`;
            }
            return `${action} failed: ${summary.nodeId} (${summary.error || "failed"})`;
        });
        return single(embeds.base(authorName).setDescription(lines.join("\n") || "Done."));
    }
    if (!PLAYER_ACTIONS.includes(action)) {
        let result = await controlQuery(control, tokens.join(" "), authorId);
        if (!result.ok) {
            return queryFailed(authorName, name, result);
        }
        return single(embeds.base(authorName).setDescription((result.data.lines || []).join("\n") || "Done."));
    }
    // Player action: resolve rows first so results can name ids arras-style.
    let actionAt = tokens.findIndex((token) => token.toLowerCase() === action);
    let leftText = tokens.slice(0, actionAt).join(" ");
    let targets = [];
    if (leftText.trim()) {
        let resolved = await resolvePlayers(control, leftText, authorId);
        if (!resolved.ok) {
            return queryFailed(authorName, name, resolved);
        }
        targets = resolved.rows;
    }
    let result = await controlQuery(control, tokens.join(" "), authorId);
    if (!result.ok) {
        return queryFailed(authorName, name, result);
    }
    let summaries = result.data.results || [];
    let byNode = new Map(summaries.map((summary) => [summary.nodeId, summary]));
    let lines = [];
    // Direct ip bans keep control's own line, there is no player to name.
    for (let line of result.data.lines || []) {
        if (/^ban ok: /.test(line)) {
            lines.push(line);
        }
    }
    if (targets.length > 0) {
        for (let target of targets) {
            let summary = byNode.get(target.nodeId);
            if (summary && summary.ok) {
                lines.push(actionSuccessLine(action, { playerId: target.playerId, name: target.name }));
            } else {
                lines.push(`${action} failed: ${target.name} (${target.nodeId}, ${(summary && summary.error) || "failed"})`);
            }
        }
    } else {
        for (let line of result.data.lines || []) {
            if (!/^ban ok: /.test(line)) {
                lines.push(line);
            }
        }
    }
    return single(embeds.base(authorName).setDescription(lines.join("\n") || "Done."));
}

module.exports = { handleCommand, commandName };
