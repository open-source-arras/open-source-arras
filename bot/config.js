// Bot configuration. Edit the values below directly, everything non-secret
// lives here. Only the two secrets come from bot/.env, they fail fast when
// missing instead of throwing a stack.
let fs = require("fs");
let path = require("path");

const defaults = {
    // Default `npm start` runs embedded control on the game port, so the
    // bot points there. Only use the standalone port (:4000) when the game
    // nodes report there too. Bot and nodes must share one control, or
    // every server reads offline.
    controlUrl: "ws://127.0.0.1:3000/control",
    prefix: "$",
    loginHost: "localhost:3000",
    // Blank means follow loginHost, so $p links open your own menu with
    // the server preselected. Set an explicit origin to override.
    serverBase: "",
    inviteUrl: "https://discordapp.com/oauth2/authorize?client_id=1450376875376644116&scope=bot",
    guildUrl: "https://discord.gg/arras",
    dataDir: "./data",
    // Reply-ping the command message. Off by default, the bot posts plain
    // channel messages instead so nobody gets pinged by output.
    replyToCommands: false,
    serversPerPage: 25,
    savesPerPage: 15,
    linesPerPage: 30
};

// Zero-config pairing on one machine: without an explicit key the bot uses
// the generated dev key, the same file the game server reads. Split setups
// set CONTROL_BOT_KEY here to the real key instead.
function devBotKey() {
    try {
        let saved = JSON.parse(fs.readFileSync(path.join(__dirname, "../server/control/data/dev-keys.json"), "utf8"));
        return (saved.bot || "").trim();
    } catch {
        return "";
    }
}

// Local names resolve to http, anything else gets https.
function baseFromHost(host) {
    let plain = (host || "").replace(/^https?:\/\//, "").split("/")[0];
    if (!plain || plain === "localhost" || plain.startsWith("localhost:") || plain.startsWith("127.") || plain === "::1") {
        return `http://${plain || "localhost:3000"}`;
    }
    return `https://${plain}`;
}

// A placeholder counts as unset, the generated dev key wins instead,
// mirroring how game nodes resolve their key.
function botKey(env) {
    let key = (env.CONTROL_BOT_KEY || "").trim();
    if (key && key !== "ChangeControlBotKey!") {
        return key;
    }
    return devBotKey();
}

function loadConfig(env = process.env) {
    return {
        token: (env.DISCORD_TOKEN || "").trim(),
        controlKey: botKey(env),
        controlUrl: defaults.controlUrl,
        prefix: defaults.prefix || "$",
        loginHost: defaults.loginHost,
        serverBase: defaults.serverBase || baseFromHost(defaults.loginHost),
        inviteUrl: defaults.inviteUrl,
        guildUrl: defaults.guildUrl,
        dataDir: defaults.dataDir,
        serversPerPage: defaults.serversPerPage,
        savesPerPage: defaults.savesPerPage,
        linesPerPage: defaults.linesPerPage,
        replyToCommands: !!defaults.replyToCommands
    };
}

function checkConfig(config) {
    if (!config.token) {
        console.error("Missing DISCORD_TOKEN. Copy bot/.env.example to bot/.env and fill it in.");
        process.exit(1);
    }
    if (!config.controlKey) {
        console.error("Missing CONTROL_BOT_KEY. It must match the control server bot key.");
        process.exit(1);
    }
    return config;
}

module.exports = { loadConfig, checkConfig, defaults };
