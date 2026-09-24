# OSA Discord Bot

Optional Discord front-end for Open Source Arras, talking to the control
server (`docs/CONTROL.md`, spec in `docs/DISCORD-BOT.md`). The game and
panel work without it: mint `$auth` codes from `http://127.0.0.1:3000/ext/admin/`.

## Setup

Only needed if you want the bot. The game never installs these deps:

```
cd bot
npm install
cp .env.example .env
```

Put `DISCORD_TOKEN` in `.env`. Leave `CONTROL_BOT_KEY` empty on one machine
(the generated dev key is used automatically). Everything else is edited
directly in `bot/config.js`:

| Key | Where | What it is |
| --- | --- | --- |
| `DISCORD_TOKEN` | `.env` | Bot token from the Discord developer portal. Needs `Guilds`, `GuildMessages`, `MessageContent` (privileged, enable it on the portal), and `DirectMessages` intents |
| `CONTROL_BOT_KEY` | `.env` | Bot key. Leave empty to use the generated dev key on one machine, or match the real key on split setups |
| `controlUrl` | `config.js` | Which control to use. The bot must share the control the game nodes report to, or every server reads `Connection timed out` while nodes happily connect elsewhere. Default `ws://127.0.0.1:3000/control` (the embedded hub). Only point at standalone `:4000` on split setups where nodes report there too |
| `prefix` | `config.js` | Command prefix, default `$` |
| `loginHost` | `config.js` | Host named in `$login` instructions, set your public host here. `$p` server links follow it automatically (http for localhost, https otherwise), unless `serverBase` is set explicitly |
| `serverBase` | `config.js` | Origin for `$p` links and `$l` title URLs. Blank means follow `loginHost` |
| `replyToCommands` | `config.js` | Reply-ping command messages. Off by default, the bot posts plain channel messages |
| `inviteUrl`, `guildUrl` | `config.js` | Links in `$help`, arras defaults until OSA has its own |
| `dataDir` | `config.js` | Save code database and seen server memory, default `./data` |

Then, from this folder:

```
npm start
```

Or from the repo root: `npm run bot` (needs `cd bot && npm install` first).

## Granting access

Rank is in-game power only and unlocks nothing in Discord. Bot power comes
from flags alone, so a fresh user gets `Permission denied` on `$l` and all
actions while `$p`, `$s`, `$a`, and save commands stay public. Grant from
the panel at `http://127.0.0.1:3000/ext/admin/` (loopback; add the bearer
header when `CONTROL_PANEL_KEY` is set). Read-only leaderboards:

```
curl -s http://127.0.0.1:3000/panel/users \
  -H "Content-Type: application/json" \
  -d '{"discordId":"123456789012345678","type":"player","flags":["list.players"]}'
```

Full moderation (lists plus every action):

```
curl -s http://127.0.0.1:3000/panel/users \
  -H "Content-Type: application/json" \
  -d '{"discordId":"123456789012345678","type":"player","flags":["*"]}'
```

Keep the type at `player` unless in-game staff powers are needed too.

## How it works

- One WS connection to control, many Discord users multiplexed over it. Every
  query carries the acting Discord id, control checks permissions again.
- Live data and admin actions (`servers`, `ping`, `all`, `players`, `verbose`,
  `%`, `reset`, `kill`, `kick`, `ban`, `restart`, `broadcast`) run through the
  control pipeline, so filtering and chaining match the game exactly.
- Arras presentation lives here: green embeds with `Requested by` footers,
  `$all` rollups with remembered offline servers, paged `$servers`/`$saves`
  with buttons, `$modes`/`$help` tables, spoiler wrapped `$login` codes.
- Save codes (`view`, `claim`, `discard`, `saves`, `restore`, `reinstate`)
  live in `DATA_DIR/saves.db`, owned by the bot. OSA has no game-side save
  apply yet, so `$restore` validates the claim and records the use. A future
  `player.restore` game command hooks into `commands.js` where marked.
- `$login` codes come from control over the `mintCode` frame and expire in
  3 minutes.

## Tests

Pure formatting, validation, and rollup logic, no token needed:

```
npm test
```

## Troubleshooting

Start order matters: game first, then the bot. The bot reads its config
once at boot, so a config change always needs a bot restart.

- `Control disconnected (..., code 1006), retrying` means nothing answers
  at `controlUrl`. With default `npm start` the hub lives on the game port
  (`ws://127.0.0.1:3000/control`), so start the game before the bot.
- `4401 bad key` means the key mismatches. Copy the real bot key into
  `bot/.env` (or leave the placeholder to use the generated dev key) and
  restart the bot.
- Every server reads `Connection timed out` while nodes connect fine means
  bot and nodes use different controls. Point `controlUrl` at the hub the
  nodes report to and restart the bot.
