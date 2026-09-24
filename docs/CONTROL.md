# Control Server

Design and behavior notes for the OSA control plane: run game servers on
separate machines, keep one public server list, and send admin commands from
anywhere (Discord bot, CLI, web panel). The bot does not talk to game nodes.
It talks to control; control answers queries from its live state and forwards
actions to the owning node.

## Locked decisions

- No confirmation flow. A valid command executes immediately. Correctness
  comes from permissions.
- Actions: reset, kill, kick, ban, restart, broadcast.
- Storage: SQLite via better-sqlite3 as default, Postgres through `DATABASE_URL`.
- Web panel is only for users and permissions, not in-game player management.
- Bans bind to IP only in v1.
- Telemetry is what the bot's server line needs: id, mode, player count, uptime
  since the last (re)start. No mspt dashboards.

## Scope

v1:

- Game nodes on separate physical devices, no shared filesystem.
- One place to see every node and every player in near real time.
- Admin commands from Discord, terminal, or browser, with permissions.
- Permissions bound to Discord identities, with an arras-style `$auth` code
  exchange so in-game servers know who you are and what type you hold.
- `npm start` on one machine keeps working as today, zero configuration,
  control included and bound to loopback.
- Addons can register their own admin commands the same way they register tanks.
- Keys, TLS, rate limits, and logs when you split across machines.

Out of scope for v1: save codes (the original arras bot has them, OSA has no
accounts for them), high availability control, remote file deployment.

## Roles

Four roles. In single machine mode they all live in one process tree. In split mode
they are separate processes on separate devices.

| Role | What it is | Talks to |
| --- | --- | --- |
| control | registry, player index, query engine, command bus, permissions DB | everyone below |
| game node | an OSA `gameServer` (one per room), unchanged gameplay | control (outbound WS), players (WS) |
| web host | static client + public list API (`/getServers.json`) | control (reads registry) |
| clients | Discord bot (WS), local permission panel (loopback HTTP) | control |

Players still connect straight to game nodes. Game traffic never passes through
control, so control being busy or far away does not add a millisecond to gameplay.

```
[discord bot]--[ws]--> [control] <--[ws]--[game node A]
                            ^    ^---[ws]--[game node B, other device]
                            |            \--[ws]--[game node C, another device]
                     [panel, loopback only]
                        [web host]
                              |
                         [players' browsers]
```

On one machine control, the panel, and the web host all share the game
process and port (`./run.sh`). Split machines put control on its own port
with the panel on loopback there.

There is deliberately no owner-level remote channel. Game servers talk to
control with node keys, the bot talks with its own key and per-user permission
checks, and permission management happens in the panel, which only binds
loopback. Split setups reach it over `ssh -L`.

### Why a hub

Nodes dial out to control (NAT and firewall friendly). One auth domain, one
state store, one pipeline engine for bot, CLI, and panel. The bot does not
need every node port open, and list commands answer from hub state. Cost is
one hop of latency on admin actions.

## Topology modes

### Mode A: single machine (default, zero config)

`./run.sh` (or `npm start`) boots what it boots today, plus a lightweight
control plane in the same process: globals, definitions, the web host on
`Config.port`, one worker per `Config.servers` entry, and an embedded hub
sharing the webserver. No extra ports, no extra process. `/control`
upgrades go to the hub, `/panel/*` and `/ext/admin` serve the permission
panel, everything else is game traffic as before. Keys are generated into
`server/control/data/dev-keys.json` (gitignored) on first run;
`server/.env` is optional. If control fails to boot for any reason the
game keeps running without it.

Mint `$auth` codes from the panel (open on loopback by default) when the
Discord bot is not running.

One hub per deployment: on one machine that hub is the embedded one, and the
bot talks to it at `ws://127.0.0.1:3000/control` with no key configuration
(it reads the generated dev key itself). Running standalone `:4000` next to it
splits the fleet, nodes stay on `:3000` and anything asking `:4000` sees zero
servers. Only run standalone for split machines.

### Mode B: split machines

- One device runs `npm run control`. Binds a real interface (or stays behind a
  reverse proxy for TLS), keys are real and set in `server/.env`, storage is SQLite
  or `DATABASE_URL` Postgres.
- Each game device gets the repo, `npm install`, then a single-node entry
  (not built yet: `npm run node -- --id la` or `NODE_ID=la`). The node picks
  its entry from `Config.servers` by id, applies its gamemode and properties
  like the local worker, and dials `CONTROL_URL` from `.env`. Its game port
  still serves players directly.
- The web host can run on the control device or anywhere: `getServers.json`
  and `/getTotalPlayers` read the control registry (`server/control/
  serverList.js` maps snapshot rows to the exact menu shape) instead of
  `global.servers`. When control failed to boot, both fall back to the
  local worker state, so the menu never goes blank.
- The bot runs on any device with `CONTROL_URL` and a bot key.

Local workers and remote nodes are the same program. Mode A is just Mode B with
everything on localhost and the main process playing the role of control and web
host. Either way every node finds control through the `control` block in
`server/config.js` (`url`, `nodeKey`, both null by default): exported env wins
(`CONTROL_URL`, `CONTROL_NODE_KEY`), then the config values, then the loopback
default plus `dev-keys.json`. Non-loopback `ws://` upgrades itself to `wss://`.

## Wire protocol

JSON frames over one WS connection per party. Every frame is wrapped:

```json
{ "v": 1, "type": "command", "id": "c_01H...", "ts": 1717000000000, "data": { } }
```

`v` is the protocol version. Control warns and refuses on mismatch, so a half
upgraded fleet fails loudly instead of silently. Node hellos also carry the OSA
package version.

### Node to control

| type | data | notes |
| --- | --- | --- |
| `hello` | `key, nodeId, info {region, serverhost, location, gamemode, player_cap, caps[], host, port, displayName, featured, unlisted, private, hidden}, osaVersion` | first frame, control replies `helloAck` or closes with a reason |
| `helloAck` (inbound) | `nodeId, banlistVersion, serverTime` | |
| `heartbeat` | `players, maxPlayers, gameMode, startedAt, displayName` | every 5s. `startedAt` is when this game server last started, so uptime reads "since last restart", not since machine boot. `displayName` refreshes the public list name, which is still "Unknown" at hello time |
| `event` | `name, payload` | `playerJoin`, `playerLeave`, `playerBatch` (score/level/tank/team deltas, batched per heartbeat) |
| `resolveKey` | `secretHash` | node asks control to resolve a player secret, answered from cache or DB, positive results cached on that node for 5 min or until the arena cycles |
| `authCode` | `code` | player typed `$auth CODE` in game, control validates and issues a secret |
| `commandAck` | `commandId, ok, result, error, tookMs` | always, even on failure |

`caps` is the list of command types the node understands, so control can reject an
unsupported command before it ever leaves the hub, and so addons can register new
commands and have control learn about them at connect time.

### Control to node

| type | data | notes |
| --- | --- | --- |
| `command` | `type, target, args, actor, issuedAt, expiresAt` | see commands below |
| `banlist` | `version, entries[]` | pushed on hello and on every change |
| `revokeKey` | `secretHash` | push a secret revocation immediately instead of waiting for the node's cache TTL |

### Bot to control

| type | data | notes |
| --- | --- | --- |
| `hello` | `key, kind: "bot", discordId?` | bot key is separate from node keys, one socket multiplexes many users |
| `query` | `text, discordId?` | the pipeline string, e.g. `#epl l n~"test" reset`, acting user per query |
| `mintCode` | `discordId` | bot asks control to mint a `$login` code for a user |

Control replies with `queryResult`, `commandResult`, `mintCodeResult`, or
`error`. All query results carry the state timestamp so the bot can say how
fresh the data is.

### Liveness

Heartbeats every 5s. A node is `stale` after 15s (grey in lists, still travelable)
and `down` after 60s (removed from `getServers.json`, in-flight commands fail with
`node_unreachable`). Reconnects use exponential backoff with jitter, 1s to 30s. On
reconnect the node resends its full player roster, which heals the index in one
frame instead of replaying deltas.

## State on control

Live state in process memory, persistent state in SQLite (default) or Postgres
(`DATABASE_URL` starts with `postgres:`). A small `store/` module with two drivers,
`sqlite.js` (better-sqlite3, synchronous, zero setup) and `postgres.js` (pg, lazy
required, clear error if not installed). Everything else talks to the store through
one interface, so no caller knows which driver is active.

Memory: node registry (id, info, caps, versions, lastSeen, status, player count) and
the player index, one row per player `{nodeId, playerId, name, nameKey, team, tank,
level, score, ts}`. `nameKey` is the name lowercased with non-alphanumerics
stripped, computed on the node, so `n~"test"` matches "Test", "TEST!" and "t e s t"
exactly like the arras bot's `~` filter. Rows expire on a leave event, on node down,
or at 90s staleness.

One dialect runs on both drivers, enforced by these rules: every primary key is
TEXT (crypto random ids, no autoincrement anywhere), columns are TEXT or INTEGER
only, JSON lives in TEXT, timestamps are INTEGER milliseconds, placeholders are
always `?` with the Postgres driver rewriting them to `$1..$n` in one tested
function (no `?` allowed inside string literals). Ban version bumps use a single
atomic `UPDATE ... SET version = version + 1` so concurrent bans cannot lose
increments. SQLite runs in WAL mode. The driver pick is better-sqlite3
(`npm install`, prebuilt binaries), not the experimental built-in, because bans
and permissions are the worst place to beta-test storage. `pg` stays optional and
lazy required, only when `DATABASE_URL` starts with `postgres:`.

Schema (same in both drivers):

```sql
users        (discord_id TEXT PRIMARY KEY, type TEXT DEFAULT 'player',
              flags TEXT, class TEXT, name_color TEXT, spawn_as TEXT,
              revoked INT DEFAULT 0, created_at INT, updated_at INT)
secrets      (hash TEXT PRIMARY KEY, discord_id TEXT, created_at INT,
              last_used_at INT)
auth_codes   (code_hash TEXT PRIMARY KEY, discord_id TEXT, expires_at INT,
              attempts INT DEFAULT 0)
bans         (id TEXT PRIMARY KEY, ip TEXT, reason TEXT, actor TEXT,
              created_at INT, expires_at INT NULL)
kv           (key TEXT PRIMARY KEY, value TEXT)
```

Migrations run on boot and are safe to replay: v1 drops stored display names,
v2 backfills `type` from the old `level` ranks and drops that column, v3 drops
the removed audit table, v4 drops the removed secret flag column, v5 drops the
old `types` table (permission types live in `types.json` now).

Display names are deliberately not stored anywhere in control. Users are
identified by Discord id only; live in-game names still appear in query output
because moderating without them is pointless, but nothing ties them to an
identity at rest.

`flags` is a JSON array of Discord permission grants (see the permissions section).
`users.class`, `name_color` and `spawn_as` mirror the per-token cosmetics that
`server/permissions.js` already defines, so a Discord-bound user can carry a menu
class or name color without ever touching `.env`.

## Identity and permissions

The core idea: permissions belong to Discord users, and a player's in-game token is
exchangeable for their Discord identity. Types carry the old 0-7 rank ordering,
so every existing gate in `chatCommands.js`, `keyCommands.js` and `sockets.js`
keeps working unchanged.

### The `$auth` exchange

1. In Discord, a user runs `$login`. The bot asks
   control to mint a code: 8 base32 characters,
   bound to their Discord id, expires in 3 minutes, single use, no per-user
   cap. The panel mints the same way.
2. The user joins any game server and types `$auth CODE` in game chat. `$`
   commands never broadcast, so the code stays private.
3. The node forwards the code to control over the bus. Control validates it,
   mints a per-user secret in the arras token layout (base64 of 24 bytes:
   Discord id, 8 random bytes, far-future expiry, see `server/control/token.js`
   and the research decoder it agrees with), stores only its HMAC, and returns
   `{secret, discordId}`. The node then resolves the secret back into the full
   identity in the same round trip, distrusting any token that names another
   owner than its database row.
4. The node applies the resolved identity (`socket.permissions` and the numeric
   rank as `socket.status.permissionLevel`) and sends the secret down with a
   `key` message. The client keeps it in localStorage and sends it as its key
   in the `"k"` message on every future connect, on any node. Empty `$auth`
   answers `Invalid command format.`, a bad or expired code answers `Invalid
   token.`, success answers `Authentication successful.` plus a console warning.
5. From then on every server in the fleet knows the player's Discord id and type.
   The in-game `$i` command prints `Identity: User 123456789012345678; Access
   Level: 7;` with the numeric rank.

Legacy `.env` tokens keep working: the node checks its local `permissionsDict`
first (owner tokens, zero latency), then asks control to resolve the key as a
per-user secret. While resolving, later packets from that socket are queued
instead of processed, so spawn order stays correct and nothing runs at rank 0
first. The wait lasts up to 1 second and fails closed to rank 0 on timeout,
because spawning first at rank 0 and silently promoting later would apply the
wrong spawn class, name color, sandbox rights, and private-server gate.
Positive resolutions are cached on the node for 5 minutes, negative ones for
30 seconds. The cache is per server (it lives on that node's `NodeClient`) and
is dropped on arena close, on `start()` (so a soft restart after `$restart`
reloads it), on `revokeKey` frames, and on reconnect. A panel edit therefore
lands the next time that arena cycles, without waiting out the 5 minute TTL.
Legacy entries without a `permissionLevel` stay rank 0, and the cosmetic sidecars
(`class`, `nameColor`, `spawnAs`) resolve through the same path whether they
come from `.env` or from a Discord user row. The editor stays local-token only.

Secrets never appear in the DB in the clear, never appear in logs (the old
`sockets.js` key logging is scrubbed), and codes are brute force guarded per
code, per node, and per target Discord id. Never per source ip, because codes
arrive over the node bus and the ip would be the node's.

### Permission types

Two layers, both stored on the `users` row, kept completely separate:

- `type`: in-game power only. A named permission type from
  `server/control/types.json`, read-only at runtime (the panel lists them,
  the user form picks one, nothing edits them). The file holds the ladder
  (player, beta-tester, game-mod, game-admin, developer), each carrying a
  rank so the old numeric ordering survives. In-game command gates compare
  the rank numerically exactly like before, so `chatCommands.js`,
  `keyCommands.js` and `sockets.js` work unchanged. Rank grants nothing
  outside the game, no matter how high.
- `flags`: Discord bot power only. Bare checkboxes, no descriptions:
  `list.players` (read player lists), `action.reset`, `action.kill`,
  `action.broadcast`, `action.kick`, `action.ban`,
  `action.restart` (run that bot action), `perms.restore`,
  `perms.reinstate` (save code admin), and `*` for everything bot-side.
  Control consults nothing but flags when a bot query asks to list or act.

A high rank with empty flags plays as staff in-game and gets `Permission
denied` from every gated bot command. A rank 0 player with `list.players`
reads leaderboards but cannot act. Grants are always explicit, there is no
ladder to inherit bot power from.

Both the bot and control check permissions: the bot checks before even sending
the query (fast feedback, and it can hide commands in help), control checks
again against the key's context before dispatching (the bot might be modified
or replaced by anyone holding its token).

## The pipeline language

Port of the original arras bot command chains, extended with actions at the end.
Same tokenizer (single and double quotes with escapes, backticks), same filter
syntax, same shortcuts (`s` servers, `p` ping, `a` all, `l` player list, `v`
verbose).

A pipeline is: source, then any number of list operations, then one terminal.

```
$ servers id/^[cw]/ ping players- 0 players score- 0:10
$ #epl l n~"test" reset
$ l n=playername v
$ servers players<=3 ping
```

The `$auth` command sits outside the pipeline, it is bot-local in spirit: the
future `$login` mints the code, the game redeems it, and game nodes never touch
anything else.

### Sources

- `servers` (or `s`): every node. Remote and local alike, they are indistinguishable.
- `players` implicit after a server selection: `$ #epl l` lists that server's
  players. No server selected means all servers' players, with a `nodeId` column.
  Player lists require the `list.players` flag, see above.

### Filters, slices, sorts

Identical semantics to the original, evaluated over control's player index. Server
keys: `id, mode, uptime, players`. Player keys: `id, name, team, class, level,
score` (alias `points`). Operators: `=`, `~` (case and punctuation insensitive
contains), `/regex/`, `!=`, `!~`, `!/`, `<=`, `>=`, `<`, `>`, `+` (asc), `-` (desc),
`n`, `n:m`, `#id`.

### Terminals

Views (read only): `players`/`l`, `verbose`/`v` (player team info), `ping`/`p`
(the server line below), `all`/`a` (total count), `servers`/`s`, `uptime`, `modes`,
`help`, `%` (last result).

The bot's server line, exactly the shape asked for:

```
Server #ej - mode w33olds9labyrinth - 1 player - 1h 1m 39.9s
```

Actions (write): reset, kill, kick, ban, restart, broadcast. An action replaces a view as the terminal. The
pipeline resolves its input list to concrete `(nodeId, playerId)` pairs first, then
checks rank and flags, and the command goes out immediately. No confirmation step,
by decision. Results come back as one short line per invocation:
`reset ok: Test (epl, 1 target, 3ms)`.

Player actions require an explicit `l` (or `players`) in the pipeline: `$ #lz ban`
is rejected with `list players first with l`. `reset` and `ban` further resolve to
exactly one target (`pick one player` when the list has more); `kill` and `kick`
may take a whole listed set. Actions are also callable with no pipeline list where
it makes sense: `$ ban 1.2.3.4 spamming` bans an ip directly on every scoped
server (`$ #lz ban 1.2.3.4` stays on that one), and anyone already online from
that address gets kicked with it.

## Commands over the bus

Control to node, the frame the whole thing exists for:

```json
{ "v": 1, "type": "command", "id": "c_01H...", "ts": 1717000000000,
  "data": { "type": "player.resetScore",
    "target": { "playerIds": [77] },
    "args": { "alsoLevel": false },
    "actor": { "source": "discord", "user": "krzesimir", "discordId": "123...", "rank": 7 },
    "issuedAt": 1717000000000, "expiresAt": 1717000060000 } }
```

- Routing: control looks at `target.playerIds`, which are namespaced by node, and
  sends one command per node with only that node's ids.
- At least once, idempotent: control retries once after 5s if the node did not ack.
  Nodes keep a 10 minute LRU of seen command ids and dedupe. `reset` twice is
  harmless by design; handlers are written so a replay is a no-op.
- Expiry: a command whose `expiresAt` passed is dropped, so a retry storm after a
  node reconnect cannot execute minute old orders.
- Nodes re-resolve player ids at execution time, so a player who left a moment ago
  produces a clean `player_left` error instead of hitting whoever took the slot.
- Errors are strings from a fixed set (`player_left`, `unsupported`, `bad_args`,
  `node_unreachable`, `forbidden`) plus a human readable detail, so the bot can
  phrase them.

Node side is a dispatcher in `server/game/commands/index.js` with a handler per
type, written against the existing implicit globals (`sockets`, `entities`, `room`).
No handler does anything dynamic with `args`; each one whitelists its fields.

## Addon extensibility

This is the part that makes it "built in tools for bigger games". The definition
loader already invokes addons with `{ Class, Config, Events }`. Add a fourth key,
`Commands`:

```js
module.exports = ({ Class, Config, Events, Commands }) => {
    Commands.register("player.freeze", ({ player, args }) => {
        player.frozen = args.duration || 30;
        return `frozen ${player.name} for ${player.frozen}s`;
    }, { scope: "player", args: { duration: "number?" } });
};
```

The node lists registered commands in its `caps` on hello. Control knows them
immediately, the bot can run `$ #epl l n~"test" freeze 60` with zero bot changes,
`help` shows them automatically. Same pattern as `Class` registration, so addon
authors learn nothing new. Each registered command declares the `action.*`
flag that gates it bot-side.

## Security

- Keys in split mode: `CONTROL_NODE_KEY` (what nodes present) and `CONTROL_BOT_KEY`,
  both in `server/.env`. Optionally `CONTROL_NODE_KEYS_JSON` mapping
  `{ "epl": "key" }` for per node revocation when one box is compromised. The
  existing `API_KEY` stays exactly where it is, for server travel only.
  `DEVELOPER` stays for the addon authors endpoint. Placeholder values from the
  committed `.env` count as unset, so a fresh checkout generates strong dev keys
  instead of using public ones. Exported environment values win over the file,
  and both entries resolve them through one shared helper, so standalone and
  embedded always agree.
- Key comparison is hash-then-compare everywhere (sha256 both sides, then
  timingSafeEqual on the digests). Never a length-guarded early return.
- Mode A generates dev keys into `server/control/data/` (gitignored). Generated
  keys on a public bind only produce a warning: permission management stays
  loopback-only no matter what, and node keys are strong random either way.
  Placeholder values from the committed `.env` count as unset, so a fresh
  checkout generates instead of using public keys.
- Player secrets are random, 32 chars base64url (fits the client's 64-char key
  limit), stored as HMAC with a control-side pepper. Revoking forgets the row
  outright and pushes the hash to nodes. Auth codes are stored hashed too, single use,
  5 minute expiry, burned after hammering. Brute force is throttled per code,
  per node, and per target Discord id. Never per source ip, because codes
  arrive over the node bus and the ip would be the node's.
- `last_used` writes are throttled to at most one per secret per 10 minutes through
  an in-memory map, so reconnect storms do not hammer the DB.
- Secrets, codes, and keys never appear in logs, and the old `sockets.js` key
  logging is scrubbed.
- Transport: in split mode, TLS at a reverse proxy (Caddy or nginx) in front of
  control and the web host, `wss` from nodes and clients. `nodeClient` upgrades
  a non-loopback `ws://` URL to `wss://` itself rather than sending keys in the
  clear. No homemade crypto.
- Identity of the peer is `remoteAddress` only. Nothing trusts `x-forwarded-for`
  or similar headers unless an explicit `trustedProxies` list is configured.
  IP bans use `net.BlockList`, not a hand-rolled matcher, so mapped and compressed
  IPv6 forms cannot slip through.
- Auth failure handling: bad `hello` key closes the socket with a reason and gets
  rate limited (5 strikes, 1 minute IP block in memory). Node id collisions with a
  different key are rejected; with the same key (reconnect) the old socket is
  evicted, with a log line so partition flaps are visible.
- Rate limits: inbound frames per connection (100/s burst, 20/s sustained), and
  commands per actor (10/minute by default, the frame budget does not cover
  destructive intent).
- Command execution is record-first: the node records the command id before
  running the handler, then executes, stores the result, then acks. A retry with a
  seen id returns the cached result, or `already_in_flight` if the first run never
  finished. Combined with `expiresAt` (checked against control time via the
  `helloAck.serverTime` offset, so clock skew does not silently kill or revive
  commands), a retried `restart` cannot fire twice.
- Entity-touching handlers never mutate game state synchronously from the WS
  message. They queue onto the game tick, so a command cannot race the physics
  loop mid-tick.
- Validation: the pipeline parser is strict (unknown token is a syntax error, never
  a guess), command args are schema checked at control and re-checked at the node.
  No `eval` anywhere. String lengths capped (names 40 chars, regex patterns
  64 chars). Query results are row-capped with a truncation notice.
- Reads are permission checked like writes. Discord identities need the
  `list.players` flag for player lists and the matching `action.*` flag for
  everything else, on both the bot side (fast feedback, hides commands in
  help) and the control side (the bot might be replaced by anyone holding
  its token). Rank plays no part in either check.
- In embedded mode the control WS shares the main http server, so upgrade routing
  is path based (`/control` goes to the hub, everything else stays game traffic).
- Bans: ip based in v1, enforced at spawn alongside the existing local ban
  lists. Nodes normalize both sides (`::ffff:127.0.0.1` matches
  `127.0.0.1`) because Node's BlockList rejects mapped addresses outright.
  Every ban from the bot stays on the issuing nodes only: kicked at once,
  held in node memory, gone on arena close or process restart, never stored
  and never pushed. A duration ends it earlier, no duration means until
  restart. Stored bans still enforce if rows exist (use raw DB access, there
  is no command path creating them right now). A banned ip trying to `$auth`
  or spawn gets nothing but a kick.
- The `restart` action runs the game's own arena close cycle, same as a
  natural arena ending. Closing the arena also clears every temporary ban
  held by its nodes. An empty room skips the arena-closer sweep and tears
  down right away, and tick deferred commands still fire while nobody is
  online so a restart cannot hang waiting for a player join.
- `$auth` codes typed in public game chat must never be broadcast. The in-game
  handler consumes the message without echoing it. `$i` only ever shows your own
  identity, never another player's.

## Discord bot

Built in `bot/` with its own `package.json` (discord.js is a heavy
dependency, the game never installs it; `cd bot && npm install`). Runs
as its own process on any device, connects to Discord's gateway and to control.
Spec and message catalog in `docs/DISCORD-BOT.md`.

- Prefix `$` (configurable), the full pipeline language after it, plus
  `$login` minting the code players redeem with in-game `$auth`.
  In-game chat also uses `$` as its prefix, the two never collide because one runs
  in Discord and the other in game chat.
- Permissions: resolved per Discord id from the control DB, checked in the bot
  before sending (hides what you cannot use in `help`), checked again in control
  before dispatch.
- Rendering: green embeds with `Requested by` footers, button pages for long
  lists, `%` replays the last result through control. Arras-only views
  (`$help`, `$modes`, `$all` rollup) and save codes (`view`, `claim`,
  `discard`, `saves`, `restore`, `reinstate`) render bot-side; save codes live
  in `bot/data/saves.db`, control stores none.
- Presence: player count across nodes as the bot's status line, from `servers
  ping`.

## Web permissions panel

Built. Static files in `public/ext/admin/` (plain HTML, one ES module, one
stylesheet, no build step). In the default embedded setup they are served by
the game webserver itself at `/ext/admin`, and the api lives at `/panel/*` on
the same port. Standalone control (`npm run control`, for split machines)
serves the same files from its own loopback-only listener instead.

There is one panel key, `CONTROL_PANEL_KEY` in `server/.env`, sent as a bearer
header and kept in the tab only. The default is the placeholder
`ChangeControlPanelKey!`, which counts as unset: out of the box the panel just
works on loopback with no login. Set a unique value and restart to put a login
gate in front of it. Wrong guesses get 401 with a `WWW-Authenticate` challenge,
five in a minute blocks the ip for a minute. (503 stays reserved for genuinely
unready control.) Every panel request, page
and api alike, also checks `remoteAddress` against loopback and answers 403
otherwise, so reaching it means sitting at the machine or inside an ssh tunnel
(`ssh -L 3000:127.0.0.1:3000 user@box` on one machine, or the standalone
panel port on a split setup). Do not put the panel behind a proxy
that rewrites the source address. If the panel ever shows its tables without
asking for a key you did not set, the game server is stale: restart it so the
page and the api match.

Scope is strictly user and permission management: user table (Discord id, type,
bare flag checkboxes, no stored names), secret listing, per-user `$auth` code
buttons, and the type table. No in-game player management, that stays in
Discord. The main game port serves nothing but the control WS endpoint.

The users table runs on DataTables 3, pinned to 3.0.2 from CDN with SRI hashes
(search, paging, sorting, escaped rendering). No build step, no framework, MIT
licensed.

## Files

```
server/control/                  hub, store, pipeline, panel, tests (built)
server/game/nodeClient.js          outbound connection, events, heartbeat, link logging (built)
server/game/commands/index.js    dispatcher + core handlers (built)
public/ext/admin/                permissions panel, browser ES modules (built)
bot/                             discord bot, own package.json (built)
docs/CONTROL.md                  this file
docs/DISCORD-BOT.md              bot message catalog and behavior
```

Command actors carry `source: "bot"` for bot queries and mints,
`source: "panel"` for panel mints.

Existing files changed so far: `server/server.js` boots the embedded control
with the game webserver shared (`/control` upgrades to the hub, `/panel/*`
forwarded to the panel handler, `/ext/admin` redirects with trailing slash)
and continues without control if the boot fails; `server/game.js` hooks up the
nodeClient in the constructor plus a `startedAt` stamp updated on every
`start()`; `server/game/network/sockets.js` resolves unknown keys through
control with later packets queued, enforces the pushed banlist at spawn,
announces spawns and closes, and no longer logs key values; `server/game/
addons/chatCommands.js` learns `$auth` and `$i`; `public/client/socketinit.js` stores
issued secrets in localStorage; `eslint.config.mjs` gains a `server/control`
override with Node globals; `server/.env` gains the split mode key
placeholders; `.gitignore` gains `server/control/data/` and `*.db*`;
`package.json` gains `better-sqlite3`, plus `control` and `test:control`
scripts. The `Config.servers` structure itself is untouched. Control never reads
game globals: `startControl` takes an explicit options object. The hub logs
connects, disconnects, queries, mints, actions, and rejections to the console
and appends them to `<dataDir>/control.log` (override with the `logFile` hub
option, silence console with `log: false`).

Left for later: `server/loaders/loader.js` appending a commands registry so
addons receive `Commands`, a standalone single-node entry, and the
implicit global on the `sockets.js` ban file line (missing `let`).

### Panel route table

Loopback only. JSON bodies capped at 1MB with a content-type check. With a
panel key set, every route also needs the bearer header.

| route | notes |
| --- | --- |
| `GET /` | panel page |
| `GET /panel/users` | list users, camelCase |
| `POST /panel/users` | create or update user, type, flags (validated) |
| `GET /panel/types` | list permission types (read only, from types.json) |
| `GET /panel/secrets` | secret hashes with use times, all users unless `?discordId=` filters |
| `POST /panel/auth/code` | mint an `$auth` code for a Discord id |
| `GET /panel/nodes` | node counts and uptime |

## Scripts

```
./run.sh         install if needed, then game + embedded control (mode A)
npm start        same without the install check
npm run control  standalone control (mode B, split machines)
npm run bot      optional discord bot, needs cd bot && npm install first
npm run test:control   control test suite
```

Dependency in the main package: better-sqlite3. `pg` stays optional. The bot
keeps its own `package.json` with discord.js, so the game never installs it.

## Status

Control side, panel, game side, list migration, and the Discord bot are built
and tested. Every worker connects to the embedded hub on boot. Left: remote
single-node entry (`npm run node`).

### Testability

Time-based behavior is injectable through `startControl` options: heartbeat
and sweep periods, stale and down thresholds, command timeout and retry
delays, dedupe window, code TTL, resolve cache TTLs, lockout windows. The
suite runs `npm run test:control` with no extra dependencies.

## Permission flags

- `perms.restore` / `perms.reinstate`: who may edit other users' permissions
  in the panel and gate future bot commands.
