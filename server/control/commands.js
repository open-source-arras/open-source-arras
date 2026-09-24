// Route action frames to nodes, collect acks, retry once. Record-first
// dedupe lives on the node; timers here are tracked for clean shutdown.
let { wrap, newId } = require("./protocol.js");

function createCommandBus(options) {
    if (!options || typeof options.send !== "function") throw new Error("command bus needs a send function");
    let send = options.send;
    let now = options.now || (() => Date.now());
    let timeoutMs = options.commandTimeoutMs || 5000;
    let retries = options.commandRetries ?? 1;
    let dedupeMs = options.dedupeMs || 10 * 60_000;

    let pending = new Map();
    let results = new Map();
    let timers = new Set();

    function later(ms, fn) {
        let timer = setTimeout(() => {
            timers.delete(timer);
            fn();
        }, ms);
        timers.add(timer);
        return timer;
    }

    function pruneResults() {
        for (let [id, entry] of results) {
            if (now() - entry.ts > dedupeMs) results.delete(id);
        }
        if (results.size > 1000) {
            let oldest = [...results.keys()].slice(0, results.size - 1000);
            for (let id of oldest) results.delete(id);
        }
    }

    // targets: { nodeId: [playerIds] }. Nodes with no live socket fail fast.
    function dispatch({ id = null, type, targets = {}, args = {}, actor = {} }) {
        pruneResults();
        id = id || newId();
        if (results.has(id)) return Promise.resolve(results.get(id).summary);
        let nodeIds = Object.keys(targets);
        if (nodeIds.length === 0) {
            let summary = { id, ok: true, results: [] };
            results.set(id, { ts: now(), summary });
            return Promise.resolve(summary);
        }
        return new Promise((resolve) => {
            let entry = { id, type, targets, args, actor, resolve, collected: [], tries: 0, timer: null };
            pending.set(id, entry);
            entry.collected = nodeIds.map(() => null);
            nodeIds.forEach((nodeId, index) => sendOne(entry, index, nodeId));
            armTimer(entry);
        });
    }

    function frameFor(entry, nodeId) {
        return {
            type: entry.type,
            target: { playerIds: entry.targets[nodeId] || [] },
            args: entry.args,
            actor: entry.actor,
            issuedAt: now(),
            expiresAt: now() + timeoutMs * (retries + 1) + 1000
        };
    }

    function sendOne(entry, index, nodeId) {
        let sent;
        try {
            sent = send(nodeId, wrap("command", frameFor(entry, nodeId), entry.id)) !== false;
        } catch {
            sent = false;
        }
        if (!sent) {
            entry.collected[index] = { nodeId, ok: false, error: "node_unreachable" };
            checkDone(entry);
        }
    }

    function armTimer(entry) {
        entry.timer = later(timeoutMs, () => onTimeout(entry));
    }

    function onTimeout(entry) {
        if (!pending.has(entry.id)) return;
        entry.tries++;
        let waiting = entry.collected.some((result) => result === null);
        if (entry.tries <= retries && waiting) {
            Object.keys(entry.targets).forEach((nodeId, index) => {
                if (entry.collected[index] === null) sendOne(entry, index, nodeId);
            });
            if (entry.collected.some((result) => result === null)) armTimer(entry);
            else finish(entry);
            return;
        }
        Object.keys(entry.targets).forEach((nodeId, index) => {
            if (entry.collected[index] === null) entry.collected[index] = { nodeId, ok: false, error: "node_unreachable" };
        });
        finish(entry);
    }

    function onAck(commandId, nodeId, ack) {
        let entry = pending.get(commandId);
        if (!entry) return false;
        let index = Object.keys(entry.targets).indexOf(nodeId);
        if (index === -1 || entry.collected[index] !== null) return false;
        entry.collected[index] = {
            nodeId,
            ok: !!ack.ok,
            result: ack.result,
            error: ack.ok ? undefined : (ack.error || "failed")
        };
        checkDone(entry);
        return true;
    }

    function checkDone(entry) {
        if (entry.collected.every((result) => result !== null)) finish(entry);
    }

    function finish(entry) {
        if (!pending.has(entry.id)) return;
        pending.delete(entry.id);
        if (entry.timer) {
            clearTimeout(entry.timer);
            timers.delete(entry.timer);
        }
        let summary = { id: entry.id, ok: entry.collected.every((r) => r.ok), results: entry.collected };
        results.set(entry.id, { ts: now(), summary });
        entry.resolve(summary);
    }

    function close() {
        for (let timer of timers) clearTimeout(timer);
        timers.clear();
        for (let entry of pending.values()) {
            entry.collected = entry.collected.map((result, index) => {
                return result || { nodeId: Object.keys(entry.targets)[index], ok: false, error: "shutting_down" };
            });
            finish(entry);
        }
    }

    return { dispatch, onAck, close, pendingCount: () => pending.size };
}

module.exports = { createCommandBus };
