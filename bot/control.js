// WS client for the control hub. One socket, many Discord users: every
// query and mint asserts the acting Discord id, control resolves perms.
// Reconnects with backoff and jitter, pending calls fail fast on drop.
let WebSocket = require("ws");
let protocol = require("../server/control/protocol.js");

const BACKOFF_MIN = 1000;
const BACKOFF_MAX = 30000;
const CALL_TIMEOUT = 15000;

class ControlClient {
    constructor(url, key, onStatus = null) {
        this.url = url;
        this.key = key;
        this.onStatus = onStatus;
        this.ws = null;
        this.ready = false;
        this.pending = new Map();
        this.backoff = BACKOFF_MIN;
        this.closed = false;
        this.connecting = null;
    }

    status(connected) {
        if (this.onStatus) {
            try {
                this.onStatus(connected);
            } catch {
                // Status display must never break the socket.
            }
        }
    }

    connect() {
        if (this.closed || this.connecting) {
            return this.connecting || Promise.resolve();
        }
        this.connecting = new Promise((resolve) => {
            let ws = new WebSocket(this.url);
            this.ws = ws;
            let settled = false;
            let helloTimer = setTimeout(() => {
                if (!settled) {
                    settled = true;
                    try {
                        ws.terminate();
                    } catch {
                        // Already gone.
                    }
                    this.scheduleReconnect();
                    resolve();
                }
            }, 8000);
            ws.on("open", () => {
                ws.send(protocol.wrap("hello", { key: this.key, kind: "bot" }));
            });
            ws.on("message", (raw) => this.onMessage(raw));
            ws.on("close", (code) => {
                clearTimeout(helloTimer);
                this.ws = null;
                this.ready = false;
                this.failPending("control unreachable");
                // A bad key never heals by retrying, say so once instead of
                // yapping every backoff round.
                if (code === 4401 && !this.authFailed) {
                    this.authFailed = true;
                    console.error("Control rejected the bot key (4401 bad key). Copy the real bot key into bot/.env as CONTROL_BOT_KEY and restart the bot.");
                }
                this.status(false, code);
                if (!settled) {
                    settled = true;
                    resolve();
                }
                this.scheduleReconnect();
            });
            ws.on("error", () => {
                // Close follows on its own, that is where we recover.
            });
            this.helloResolve = () => {
                clearTimeout(helloTimer);
                if (!settled) {
                    settled = true;
                    resolve();
                }
            };
        }).finally(() => {
            this.connecting = null;
        });
        return this.connecting;
    }

    scheduleReconnect() {
        if (this.closed) {
            return;
        }
        let delay = Math.min(this.backoff, BACKOFF_MAX) + Math.random() * 1000;
        this.backoff = Math.min(this.backoff * 2, BACKOFF_MAX);
        setTimeout(() => this.connect(), delay);
    }

    onMessage(raw) {
        let frame;
        try {
            frame = JSON.parse(raw.toString());
        } catch {
            return;
        }
        if (frame.v !== protocol.PROTOCOL_VERSION) {
            return;
        }
        if (frame.type === "helloAck") {
            this.ready = true;
            this.backoff = BACKOFF_MIN;
            this.authFailed = false;
            this.status(true);
            if (this.helloResolve) {
                this.helloResolve();
            }
            return;
        }
        if (frame.id && this.pending.has(frame.id)) {
            let { resolve, reject, timer } = this.pending.get(frame.id);
            this.pending.delete(frame.id);
            clearTimeout(timer);
            if (frame.type === "error") {
                reject(Object.assign(new Error(frame.data.error || "error"), { data: frame.data }));
            } else {
                resolve(frame);
            }
        }
    }

    failPending(reason) {
        for (let entry of this.pending.values()) {
            clearTimeout(entry.timer);
            entry.reject(new Error(reason));
        }
        this.pending.clear();
    }

    call(type, data) {
        if (!this.ws || !this.ready) {
            return Promise.reject(new Error("control unreachable"));
        }
        let id = protocol.newId();
        return new Promise((resolve, reject) => {
            let timer = setTimeout(() => {
                this.pending.delete(id);
                reject(new Error("control timeout"));
            }, CALL_TIMEOUT);
            this.pending.set(id, { resolve, reject, timer });
            try {
                this.ws.send(protocol.wrap(type, data, id));
            } catch {
                this.pending.delete(id);
                clearTimeout(timer);
                reject(new Error("control unreachable"));
            }
        });
    }

    // Resolves to the control result object (queryResult/commandResult data).
    // Rejects with Error("control unreachable"), Error("control timeout"),
    // or the control error enum with .data { error, detail }.
    async query(text, discordId) {
        let frame = await this.call("query", { text, discordId });
        return frame.data;
    }

    async mintCode(discordId) {
        let frame = await this.call("mintCode", { discordId });
        return frame.data;
    }

    async close() {
        this.closed = true;
        this.failPending("closing");
        if (this.ws) {
            try {
                this.ws.close();
            } catch {
                // Already gone.
            }
        }
    }
}

module.exports = { ControlClient };
