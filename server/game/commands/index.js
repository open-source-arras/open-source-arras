// Executes control bus commands against the live game. Every handler is
// pure game logic on implicit globals, and everything entity-touching runs
// deferred on the game tick so a command can never race the physics loop.
function targets(gameManager, playerIds) {
    if (!Array.isArray(playerIds)) return [];
    return gameManager.socketManager.clients.filter((socket) => playerIds.includes(socket.id));
}

function bodies(gameManager, playerIds) {
    let found = [];
    for (let socket of targets(gameManager, playerIds)) {
        if (socket.player && socket.player.body) found.push({ socket, body: socket.player.body });
    }
    return found;
}

// Next tick while the loop runs, immediately when the room is idle.
function onTick(fn) {
    return new Promise((resolve) => {
        let run = () => {
            try {
                resolve(fn());
            } catch {
                resolve({ ok: false, error: "failed" });
            }
        };
        if (global.gameManager.socketManager.clients.length > 0) setSyncedTimeout(run, 0);
        else setImmediate(run);
    });
}

let handlers = {
    "player.resetScore": ({ gameManager, target }) => onTick(() => {
        let found = targets(gameManager, target.playerIds);
        let reset = 0;
        for (let socket of found) {
            let body = socket.player && socket.player.body;
            if (!body || body.isDead()) continue;
            let keep = Math.max(45, body.skill.level || 0);
            // Back to a fresh spawn: spawn tank, no upgrades, level 45
            // (or the player's level if higher), and the exact score of a
            // new level 45. Level holds still once earned, so it survives
            // the zeroed bar below.
            body.define({ RESET_UPGRADES: true, BATCH_UPGRADES: false });
            body.define(socket.permissions?.spawnAs || Config.spawn_class);
            body.skill.reset();
            while (body.skill.level < keep) {
                body.skill.score += body.skill.levelScore;
                body.skill.maintain();
            }
            body.skill.score = 26263;
            body.refreshBodyAttributes();
            reset++;
        }
        return { ok: true, result: `reset ${reset}/${target.playerIds.length}` };
    }),
    "player.kill": ({ gameManager, target }) => onTick(() => {
        let found = bodies(gameManager, target.playerIds);
        for (let { body } of found) body.kill();
        return { ok: true, result: `killed ${found.length}/${target.playerIds.length}` };
    }),
    "player.kick": ({ gameManager, target, args }) => onTick(() => {
        let found = targets(gameManager, target.playerIds);
        for (let socket of found) socket.kick((args && args.reason) || "Kicked.");
        return { ok: true, result: `kicked ${found.length}/${target.playerIds.length}` };
    }),
    "player.tempBan": ({ gameManager, target, args }) => onTick(() => {
        let node = gameManager.nodeClient;
        if (!node || typeof node.addTempBan !== "function") return { ok: false, error: "unsupported" };
        let ips = targets(gameManager, target.playerIds).map((socket) => socket.ip).filter(Boolean);
        if (args && args.ip) ips.push(args.ip);
        ips = [...new Set(ips)];
        if (ips.length === 0) return { ok: false, error: "bad_args" };
        // No duration means until restart, which infinity models exactly:
        // memory dies with the process or the arena, whichever comes first.
        let expiresAt = args && args.durationMs ? Date.now() + args.durationMs : Infinity;
        for (let ip of ips) node.addTempBan(ip, (args && args.reason) || "", expiresAt);
        return { ok: true, result: `tempbanned ${ips.length}` };
    }),
    "server.restart": ({ gameManager }) => onTick(() => {
        if (gameManager.arenaClosed) return { ok: false, error: "already_restarting" };
        gameManager.closeArena();
        return { ok: true, result: "restarting" };
    }),
    "server.broadcast": ({ gameManager, args }) => onTick(() => {
        if (!args || !args.message) return { ok: false, error: "bad_args" };
        gameManager.socketManager.broadcast(args.message);
        return { ok: true, result: "broadcast" };
    })
};

function dispatch(gameManager, command) {
    let handler = handlers[command && command.type];
    if (!handler) return Promise.resolve({ ok: false, error: "unsupported" });
    return handler({ gameManager, target: command.target || {}, args: command.args || {}, actor: command.actor || {} });
}

module.exports = { dispatch, capabilities: Object.keys(handlers) };
