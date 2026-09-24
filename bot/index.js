// Discord entry: gateway intents, prefix dispatch, button pages, presence.
// Path is pinned to this folder, plain config() only looks in the working
// directory and misses bot/.env when run as npm run bot from the root.
try {
    require("dotenv").config({ path: require("path").join(__dirname, ".env") });
} catch {
    // dotenv is optional, plain environment works the same.
}
let crypto = require("crypto");
let { Client, GatewayIntentBits, Partials, ActionRowBuilder, ButtonBuilder, ButtonStyle, ActivityType } = require("discord.js");
let { loadConfig, checkConfig } = require("./config.js");
let { ControlClient } = require("./control.js");
let { openSaves, openSeen } = require("./store.js");
let { handleCommand } = require("./commands.js");

const PAGER_TTL = 5 * 60_000;

let config = checkConfig(loadConfig());
let bootTime = Date.now();
let saves = openSaves(config.dataDir);
let seen = openSeen(config.dataDir);
let pagers = new Map();

let control = new ControlClient(config.controlUrl, config.controlKey, (connected, code) => {
    if (connected) {
        console.log(`Control connected (${config.controlUrl}).`);
    } else {
        console.log(`Control disconnected (${config.controlUrl}, code ${code}), retrying.`);
    }
});

let client = new Client({
    intents: [
        GatewayIntentBits.Guilds,
        GatewayIntentBits.GuildMessages,
        GatewayIntentBits.MessageContent,
        GatewayIntentBits.DirectMessages
    ],
    partials: [Partials.Channel]
});

function pagerRow(key, page, pageCount) {
    return new ActionRowBuilder().addComponents(
        new ButtonBuilder()
            .setCustomId(`pages:${key}:${page - 1}`)
            .setLabel("Previous")
            .setStyle(ButtonStyle.Secondary)
            .setDisabled(page <= 1),
        new ButtonBuilder()
            .setCustomId(`pages:${key}:${page + 1}`)
            .setLabel("Next")
            .setStyle(ButtonStyle.Secondary)
            .setDisabled(page >= pageCount)
    );
}

function sweepPagers() {
    for (let [key, pager] of pagers) {
        if (Date.now() > pager.expires) {
            pagers.delete(key);
        }
    }
    if (pagers.size > 500) {
        let oldest = [...pagers.keys()].slice(0, pagers.size - 500);
        for (let key of oldest) {
            pagers.delete(key);
        }
    }
}

async function presence() {
    try {
        let data = await control.query("servers ping", null);
        let players = (data.rows || []).reduce((sum, row) => sum + (row.players || 0), 0);
        client.user.setActivity(`${players} player${players === 1 ? "" : "s"} online`, { type: ActivityType.Watching });
    } catch {
        // Presence is best effort, the next tick retries.
    }
}

client.on("messageCreate", async(message) => {
    try {
        if (message.author.bot || !message.content.startsWith(config.prefix)) {
            return;
        }
        let raw = message.content.slice(config.prefix.length).trim();
        if (!raw) {
            return;
        }
        let isDM = !message.guild;
        let outcome = await handleCommand({
            raw,
            authorId: message.author.id,
            authorName: message.author.username,
            isDM,
            control,
            saves,
            seen,
            config,
            bootTime
        });
        if (!outcome) {
            return;
        }
        let payload = { embeds: outcome.embeds };
        if (outcome.pager && outcome.pager.pages.length > 1) {
            sweepPagers();
            let key = crypto.randomBytes(8).toString("hex");
            pagers.set(key, { pages: outcome.pager.pages, expires: Date.now() + PAGER_TTL });
            payload.components = [pagerRow(key, 1, outcome.pager.pages.length)];
        }
        if (config.replyToCommands) {
            await message.reply(payload);
        } else {
            await message.channel.send(payload);
        }
    } catch(err) {
        console.error("message handling failed: " + (err && err.message));
    }
});

client.on("interactionCreate", async(interaction) => {
    try {
        if (!interaction.isButton()) {
            return;
        }
        let parts = (interaction.customId || "").split(":");
        if (parts.length !== 3 || parts[0] !== "pages") {
            return;
        }
        let pager = pagers.get(parts[1]);
        if (!pager) {
            await interaction.reply({ content: "These pages expired, run the command again.", ephemeral: true });
            return;
        }
        let page = Math.min(Math.max(1, Number(parts[2]) || 1), pager.pages.length);
        await interaction.update({ embeds: pager.pages[page - 1], components: [pagerRow(parts[1], page, pager.pages.length)] });
    } catch(err) {
        console.error("button handling failed: " + (err && err.message));
    }
});

client.once("clientReady", () => {
    console.log(`Logged in as ${client.user.tag}.`);
    presence();
    setInterval(presence, 60_000);
});

async function shutdown() {
    try {
        await control.close();
    } catch {
        // Already down.
    }
    try {
        saves.close();
    } catch {
        // Already closed.
    }
    try {
        seen.close();
    } catch {
        // Already closed.
    }
    client.destroy();
    process.exit(0);
}

for (let signal of ["SIGINT", "SIGTERM"]) {
    process.on(signal, shutdown);
}

control.connect().then(() => {
    client.login(config.token).catch((err) => {
        console.error("Discord login failed: " + (err && err.message));
        process.exit(1);
    });
});
