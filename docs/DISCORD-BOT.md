# Discord Bot Spec (arras.io replica for OSA)

Spec for the OSA Discord bot: an exact replica of the arras.io bot, written in
NodeJS, running against OSA servers through the control server in
`docs/CONTROL.md`. Lives in `bot/` and is optional; without it, mint `$auth`
codes from the permission panel. Observed arras behavior vs proposed OSA
wording is marked per command. Open items are at the bottom.

## Decisions

- NodeJS bot in `bot/` with its own `package.json` (discord.js stays out of
  the game). discord.js v14 for the gateway, `ws` for the control bus,
  better-sqlite3 for save codes, dotenv for config. `cd bot && npm install`,
  then `npm start` (or `npm run bot` from the repo root).
- The bot talks only to control over WS. Control answers from live state and
  forwards actions to the owning node. Hub, pipeline, and wire protocol are in
  `docs/CONTROL.md`. `$login` codes come over the `mintCode` frame.
- Save codes live in `bot/data/saves.db`, owned by the bot. OSA has no
  game-side save apply yet, so `$restore` validates the claim and records the
  use. A future `player.restore` hooks in where marked in `commands.js`.
  Control stores no save codes.
- Prefix is `$`, with or without a space (`$uptime` and `$ uptime` both work).
- Every reply ends with a `Requested by <name>` footer line.
- Embed color is green on success (`0x8ABC3F`) and red on error (`0xFF0000`
  with a `###` header), matching the live denial payload.
- `$login` codes expire in 3 minutes, enforced control-side (`codeTtlMs`).

## Architecture

```
[discord gateway] <---> [bot/ process] --[ws, bot key]--> [control :4000]
                                                            ^  ^---[ws]---[game node A]
                                                            |         \---[ws]---[game node B, other device]
```

- Bot holds one WS connection to control multiplexed across Discord users.
  Each query carries the acting Discord id, control checks permissions again
  even though the bot already checked.
- Permissions are bound to Discord identities. In-game identity comes from
  the `$login` / `$auth` exchange (bot mints, game redeems).
- Game traffic never passes through the bot or control. Only queries and
  admin actions do.
- Presence line is total player count across nodes (from `a`).

## Global message rules

Observed across all commands, kept here so each command below does not
repeat them.

- Prefix `$`. A space after `$` is optional. `$s`, `$ s`, `$servers` are the
  same command. Same for `$a` / `$all`, `$p` / `$ping`, `$uptime` / `$ uptime`.
- Every reply has a `Requested by <discord name>` footer, on its own line at
  the bottom.
- Errors use a red bar (`0xFF0000`, the live `hsla(0, 100%, 50%, 1)`), not
  green. Shape is a `###` header plus the command line:
  ```
  ### Permission denied
  for command "l"
  ```
  The command word is what the user typed (`l`, not `players`). Success and
  info replies keep the green bar.
- Success replies (`Code claimed successfully!`, `Code reinstated
  successfully!`, modes output) use an embed with a green left color bar.
  Claim success puts the message on separate lines, same for modes.
- `$login` output wraps the code in `||` spoiler markers so the user has to
  click to reveal it.
- `$saves` redacts the full code outside DMs. In a guild channel it shows the
  truncated form plus the line `(run the command in a direct message channel
  to view the full code)`. In a DM it shows the full code.
- Long lists page by the 1024 char field cap (`Page 1`, `Page 2`, not
  inline), with buttons as a second way to flip. `$servers` keeps 25 rows
  per page, `$saves` 15 codes per page.
- Chaining works everywhere: a server selector, then a list op, then a
  terminal. `$a p` means `$all` piped into `ping`. `$#ev p` and `$ #ev p`
  (space after `$` and after `#`) both work. Advanced example: `$p p- 0:5 v`.

Open questions: exact embed titles for errors and small commands, and the
redacted vs full code layout in DMs. Confirm from the live bot before
building.

## `$help`

Title: `Help`. Footer `Requested by <name>`, green bar
`hsla(84, 49.8%, 49.2%, 1)`. Raw payload captured 2026-09-23, keep field
order and inline flags exactly:

- `General Commands` (inline):
  ```
  $ help
  $ modes
  $ uptime
  $ servers

  $ [servers] ping
  $ [servers] all
  $ <server> players
  $ <any> verbose

  $ view <code>
  $ claim <code>
  $ discard <code>
  $ saves [page]
  $ %
  ```
- `Descriptions` (inline):
  ```
  show this message
  show information regarding how mode IDs work
  show the uptime of the bot
  give the list of servers without any information
  this is useful when chained to other commands
  ping all of the given servers, defaulting to all servers
  get the total player count of the given servers
  list the players of the given server
  display either the server performance or
  player team information
  view the status of a save code
  claim a save code such that it could only be used by you
  discard a save code such that it could never be used again
  list the save codes you've already claimed
  return the result of the last command
  this is useful when chained to other commands
  ```
- `Command Chains` (not inline): "You can chain multiple commands together,
  including filter commands, like in "$ ping mode=f 0 players". All filter
  commands requires an input list, such as a list of servers or players, a
  key, and sometimes a value to filter for. Server filter keys: "id",
  "mode", "uptime", "players", "mspt". Players filter keys: "id", "name",
  "team", "class", "level", "score" (or alias "points"). You can also use
  the first letter or first two letters of the key as a shortcut."
  (Grammar quirks preserved: "requires", "mspt" key, neither of which OSA
  control has yet. OSA pipeline today has server keys `id, mode, uptime,
  players` and player keys `id, name, team, class, level, score`.)
- `Filter Commands` (inline):
  ```
  <n>

  <n>:<m>

  <key>=<value>
  <key>~<value>

  <key>/<regex>/
  <key>!=<value>

  <key><=<number>

  <key>+
  <key>-
  #<id>
  ```
  (Rendered with italics in the raw payload: `_<n>_`, `_<key>_`, `#_<id>_`.)
- `Descriptions` (inline): "get the *n*th element from a list, with *n*
  starting at 0. you can always use "0" to get the first element. take the
  elements from a list starting at the *n*th element and stopping before the
  *m*th element. filter for elements where the _key_ is the same as the
  value. filter for elements where the _key_ contains the value, ignoring
  non-alphanumeric characters and letter casing. like "=" and "~", but with
  a regular expression. filter for elements where the _key_ is not the same
  as the value; this also works for "!~" and "!/". filter for elements where
  the _key_ is less than or equal to a number; this also works for ">=",
  "<", and ">". sort the list according to the _key_ in ascending order.
  sort the list according to the _key_ in descending order. filter for
  elements with a given ID, same as "id=_<id>_"."
- `Note` (not inline): "_[argument]_ means an optional argument.
  _<argument>_ means a required argument. You can put single quotes or
  backticks to ignore spaces. You can also use double quotes, which allows
  you to use certain escape codes like in "\\\n\"\t". There are 4 command
  shortcuts, which are "$ s" for servers, "$ p" for ping, "$ a" for all,
  "$ l" for player list, and "$ v" for verbose output." (Says 4, lists 5,
  keep the quirk.)
- `Examples` (not inline): "The commands "$ #wa players name='Player Name'"
  and "$ #wa l n~playername" would both show the score of a player named
  "Player Name" in the #wa server. The command "$ servers id/^[cw]/ ping
  players- 0 players score- 0:10" finds the US server with the most players
  and reads its leaderboard."
- `Invites` (not inline): "[Add the bot](https://discordapp.com/oauth2/
  authorize?client_id=1450376875376644116&scope=bot) or [join the Discord]
  (https://discord.gg/arras)." (arras links, replace with OSA links when
  the bot is built.)

## `$modes`

Returns Mode ID information. Mode IDs are also used in the `$ping` output
and in game, displayed on the bottom right above the minimap.

A mode ID has 3 parts: modifiers, team count, win condition.

### Modifiers

There can be 0 up to 5 modifiers, always in the order listed below.

Values: `g`, `a`, `p`, `o`, `m`

Descriptions:

- `g`: Growth
- `a`: Arms Race
- `p`: Portal
- `o`: Open
- `m`: Maze

### Team count

Required, exactly one of:

Values: `f`, `d`, `s`, `c`, `1`, `2`, `3`, `4`

Descriptions:

- `f`: FFA
- `d`: Duos
- `s`: Squads
- `c`: Clan Wars
- `1, 2, 3, 4`: Number of teams

### Win condition

Optional, defaults to no win condition, cannot repeat.

Values: `d`, `m`, `a`, `s`, `t`, `p`, `b`, `g`, `e`, `c`, `z`

Descriptions:

- `d`: Domination
- `m`: Mothership
- `a`: Assault
- `s`: Siege
- `t`: Tag
- `p`: Pandemic
- `b`: Soccer
- `g`: Grudge Ball
- `e`: Elimination
- `c`: Capture the Flag
- `z`: Sandbox

Green left color bar, same style as claim success.

Raw embed layout (from the live `$modes` payload, 2026-08-21), keep field
order and inline flags exactly:

- Title: `Mode ID Information`
- Footer: `Requested by <name>`
- Color: `hsla(84, 49.8%, 49.2%, 1)`
- Fields:
  - `Modifiers` (not inline): "Mode IDs are used in the $ ping command, as
    well as arras.io itself, displayed on the bottom right above the minimap.
    Mode IDs have 3 parts: modifiers, team count, and win condition. There
    can be anywhere from 0 to up to 5 modifiers, always in the order listed
    below."
  - `Values` (inline): "`g`\n`a`\n`p`\n`o`\n`m`"
  - `Descriptions` (inline): "Growth\nArms Race\nPortal\nOpen\nMaze"
  - `Team Count` (not inline): "The team count is required, and can be any
    one of the below values."
  - `Values` (inline): "`f`\n`d`\n`s`\n`c`\n`1`, `2`, `3`, `4`"
  - `Descriptions` (inline): "FFA\nDuos\nSquads\nClan Wars\nNumber of teams"
  - `Win Condition` (not inline): "The win condition is optional, defaulting
    to no win condition, and cannot repeat."
  - `Values` (inline):
    "`d`\n`m`\n`a`\n`s`\n`t`\n`p`\n`b`\n`g`\n`e`\n`c`\n`z`"
  - `Descriptions` (inline): "Domination\nMothership\nAssault\nSiege\nTag\n
    Pandemic\nSoccer\nGrudge Ball\nElimination\nCapture the Flag\nSandbox"

### OSA mode letters

OSA has no arras-style mode letter system in code. What control reports as
mode today is the gamemode name array from `Config.servers`, lowercased
(`server/control/pipeline/format.js` `modesText`: "Mode ids are the gamemode
names from Config.servers, lowercased. Use them with mode=, for example:
servers mode=ffa ping.").

Names come from `server/game.js` `getName` plus the config files in
`server/game/gamemodes/config/`: `ffa`, `maze`, `tdm`, `open_tdm`,
`mothership`, `sandbox`, `growth`, `arms_race`, `portal` (modifier flag),
`tag`, `domination`, `assault_*`, `siege_*`, `pandemic`, `tag`, `duos`,
`squads`, `trios`, `clan_wars`, `train_wars`, `limbo`, `nexus`, `tartarus`,
`space`, `outbreak`, `retrograde`, `blackout`, `classic`, `diep`, `fast`,
`rock`, `march_madness`, `halloween`, `labyrinth` (commented out), and more.
Default local servers are `la` (ffa), `lb` (maze), `lc` (tdm),
`ld` (mothership), `lz` (sandbox).

So the `$modes` tables above are arras values, not OSA values. Before
building, decide one of:

1. Keep the arras `$modes` text verbatim as documentation (replica first,
   OSA servers just show names like `ffa` or `maze` in `$ping`), or
2. Replace the tables with an OSA mapping (modifiers like growth, arms_race,
   portal, maze; team counts from `duos`/`squads`/`clan_wars`/`teams: N`;
   win conditions like domination, mothership, assault, siege, tag,
   pandemic).

Owner asked to "look at osa code for osa mode letters", so option 2 is
wanted, but the letter mapping does not exist yet and has to be designed.

## `$ping` / `$p`

Title is the known server count, one `Page N` field (not inline) per 1024
chars of lines. Exact line shape from the live output:

```
Server [`#ev `](https://arras.io/#ev) - mode `				  af` - 0 players - 56m 30.7s
Server [`#aa `](https://arras.io/#aa) - Connection timed out
```

Notes:

- The id is a link to the server (`serverBase` in `bot/config.js`, arras
  default). Link text pads short ids to 4 chars (`` `#wa ` ``, `` `#eux` ``).
- Modes sit in backticks, right aligned in a 20 wide field with tabs
  counting 4 (`text.padMode`, verified against every sampled line,
  including arras modes that carry their own trailing space like `m2 `).
  Longer modes are never padded.
- Player count uses singular/plural (`0 players`, `1 player`), then uptime
  since that game server last (re)started (short form, no days).
- Bare `$p` lists every known server. Live ones get ping lines, remembered
  servers that dropped out read `Connection timed out` (arras probes each
  server and tells 502/521 apart, control only knows live vs gone, so every
  offline line uses the timeout shape).
- `$#ev p` selects server `#ev` then pings it. `$ #ev p` (spaces) works the
  same. Scoped and filtered pings show live matches only, no offline lines.
- Sorting and slicing apply: `$p p- 0:5 v` pings, sorts by players
  descending, takes rows 0 to 5, renders verbose.
- `$p` needs no permission (server lines carry no player rows). Player
  lists do, see below.

## `$players` / `$l`

Title is the count plus the scoped server, with the server as the embed
URL. One `Page N` field (not inline) per 1024 chars. Exact shapes:

```
76 players on `#eb` (url https://arras.io/#eb)
`#3391724`  - Mr.Hybrid  - Level 86 Top Banana, 192532 points
`#3562660`  -   - Level 45 Builder, 26263 points
```

Notes:

- Player line: backticked `#id`, two spaces, hyphen, raw name, hyphen,
  `Level <lvl> <tank>, <score> points`. Empty names render as ` -  - `,
  scores are plain integers, nothing is escaped.
- Unscoped `$l` titles `${n} players` with no URL.
- Player lists require the `list.players` flag (or rank 3 and up). Without
  it control answers forbidden and the bot returns the red error:
  ```
  ### Permission denied
  for command "l"
  ```

## `$all` / `$a`

Fleet rollup as an embed: title plus five inline fields. Exact shapes:

```
Title: 228 servers
Total Player Count: 320
Server Status: 182/228 online
Offline Servers: `eux`, `aa`, `ab`, ...
Oldest Server Uptime: 1d 1h 2m 5.0s
Oldest Server Last Restart: <t:1790082118>
```

Notes:

- Offline ids render backticked and comma separated. The field is skipped
  when every known server is online.
- Uptimes count days (`text.fmtDurationDays`, unlike `$p`). The restart is
  a Discord timestamp, seconds precision.
- `$a p` (or `$all ping`) pipes the server list into the ping terminal, one
  server line per row.

## `$servers` / `$s`

Server id list, paginated. Observed output with 68 servers:

```
68 servers
Page 1
Server #wa
Server #wb
Server #wc
Server #wd
Server #we
Server #wf
Server #wi
Server #wj
Server #wn
Server #wu
Server #wv
Server #wz
Server #ca
Server #cb
Server #cc
Server #cd
Server #ce
Server #cf
Server #cn
Server #cu
Server #cv
Server #cz
Server #ea
Server #eb
Server #ec
Server #ed
Page 2
Server #ee
Server #ef
Server #eg
Server #eh
Server #ei
Server #ej
Server #ek
Server #el
Server #em
Server #en
Server #eo
Server #et
Server #eu
Server #eux
Server #ev
Server #ew
Server #ez
Server #aa
Server #ab
Server #acx
Server #adx
Server #aex
Server #ac
Server #ad
Server #ae
Server #af
Page 3
Server #an
Server #au
Server #av
Server #az
Server #oa
Server #ob
Server #oc
Server #od
Server #oe
Server #of
Server #oi
Server #oj
Server #on
Server #ou
Server #ov
Server #oz
```

## `$uptime`

Bot process uptime, not server uptime. Observed:

```
The Discord bot has been up for 2m 20.8s.
Requested by zyrafaq
```

## `$login`

Mints an auth code bound to the Discord user. Observed output:

Title:

```
Login Command
```

Body:

```
$ auth MwBISARcbwsBAAAAAAAAAGgVVOQUXAYA/Fn31qdxwy50UB2Y
Enter the command above into chat after joining a server at arras.io. Don't share the code with other people! The code will expire in 3 minutes.
```

Notes:

- The `$ auth <CODE>` line is wrapped in `||` so Discord hides it until
  clicked. The in-game parser trims the space, so it redeems as `$auth`.
- `$login` only works in DMs. In a guild channel the bot answers the red
  error instead of minting anything:
  ```
  ### For security reasons, the login code can only be received in a direct message channel
  for command "login"
  ```
- Player joins any game server and types `$auth CODE` in game chat. `$`
  commands never broadcast so the code stays private.
- Codes expire in 3 minutes, enforced control-side (`codeTtlMs` default).

## `$claim <code>`

Claims a save code to the Discord user.

Success:

```
Code claimed successfully!
```

- Green left color bar, message on separate lines (same note as modes).

Bad format:

```
Invalid code format
for command "claim"
```

Already claimed (owner: same text whether the code was claimed by someone
else or already claimed by you, green bar):

```
This code has already been claimed by @*𝓼𝓷𝓸𝔀𝓯𝓵𝓪𝓴𝓮~
for command "claim"
```

## `$saves`

Lists codes claimed by the caller. Single code observed:

```
You have 1 claimed code:
(1df5097afead989b:#cd:e9labyrinth:Pacifier-Byte:1/0/9/9/9/10/12/10/0/0:43661809:17020:14:5:0:3517:14:1789975303:[REDACTED])
(run the command in a direct message channel to view the full code)
Requested by sentb0.dll
```

Many codes, paginated. Observed (35 codes, page 1 shown):

```
You have 35 claimed codes:
(4773baf39b2599c2:#el:e9labyrinth:Pacifier-Atmosphere:0/4/6/10/10/10/8/12/0/0:49383623:8366:30:6:0:1392:30:1777862621:[REDACTED]
)
(7dc87caa2ac6f3cd:#cd:e9labyrinth:Warrior-Valrayvn:0/4/7/10/10/10/7/12/0/0:39725547:7670:20:6:0:956:20:1786623449:[REDACTED]
)
(2f1c15b66462719e:#el:e9labyrinth:Warrior-Skynet:0/1/5/12/12/12/6/12/0/0:38984013:5436:8:1:0:1861:8:1776346769:[REDACTED]
)
(2aa50cc6723d927a:#el:e9labyrinth:Sword-Byte:0/3/7/10/10/10/8/12/0/0:35211256:8827:49:16:0:893:49:1777038138:[REDACTED]
)
(66d3b9cbd7a641e8:#eo:e5forge:Arbitrator-Valrayvn:0/1/5/11/11/11/9/12/0/0:34692109:6317:15:4:0:1480:15:1789802800:[REDACTED]
)
(4ad03946cc277409:#cf:e5forge:Cutlass-Pegasus:0/1/5/11/11/11/9/12/0/0:34129182:7532:7:9:0:849:7:1787658442:[REDACTED]
)
(dbfc46f9fcbdd189:#cd:e9labyrinth:Gorgon-Valrayvn:0/4/6/10/10/10/8/12/0/0:29769376:4742:27:1:0:1441:27:1786871561:[REDACTED]
)
(8f3b5d49b0020c74:#el:e9labyrinth:Arbitrator-Valrayvn:0/1/5/11/11/11/9/12/0/0:29654705:5344:16:1:0:1005:16:1789567527:[REDACTED]
)
(c7c119ad2927dc30:#el:e9labyrinth:Warrior-Valrayvn:0/4/6/10/10/10/8/12/0/0:24487981:6690:19:0:0:1753:19:1775829503:[REDACTED]
)
(33b7643b7bb1d75b:#cd:e9labyrinth:Umpire-Valrayvn:0/4/5/11/10/10/8/12/0/0:18850004:3130:12:1:0:890:12:1786707520:[REDACTED]
)
(b697d67a27e11ffa:#el:e9labyrinth:Buccaneer-Skynet:0/1/5/12/12/12/6/12/0/0:18061358:4477:5:0:0:1230:5:1776398946:[REDACTED]
)
(632d68734128ef01:#cd:e9labyrinth:Arbitrator-Valrayvn:0/1/5/11/11/11/9/12/0/0:16245357:3017:4:1:0:1134:4:1789553007:[REDACTED]
)
(b041455aaaabd9ae:#cd:e9labyrinth:Warrior-Pegasus:0/1/5/11/11/11/9/12/0/0:16200818:3763:2:0:0:228:2:1787649902:[REDACTED]
)
(cc709707de715b3b:#cd:e9labyrinth:Peacekeeper-Byte:0/3/7/10/10/10/8/12/0/0:16049977:5511:8:1:0:881:8:1777907776:[REDACTED]
)
(a8f4e1511a53cfb1:#el:e9labyrinth:Warrior-Valrayvn:0/4/7/10/10/10/7/12/0/0:13932361:2000:6:0:0:929:6:1778598011:[REDACTED]
)
(page 1 of 3)
(run the command in a direct message channel to view the full code)
```

Notes:

- Codes render in parens, one per block, in the same order claimed or by
  score, to be confirmed.
- `[REDACTED]` tail is the secret part, only shown in full in DMs.
- Exact sort order and page size still unknown, ask before building.

## `$restore` (chained)

Restores a save code onto a player. Chained off a player list. Observed:

```
$#cd l #13563377 restore `(77e871cd1aeb7b6a:#cd:e9labyrinth:Arbitrator-Valrayvn:0/12/2/6/6/12/10/12/0/0:41700081:4462:12:2:0:1613:12:1788435529:tMyexMqDbt3Jb0vi)` <@1206106502197289071>
```

Notes:

- `#13563377` selects the player by id. The code is wrapped in backticks.
  The trailing `<@id>` (or plain Discord id) picks whose claimed code it is.
- The code has to be claimed by that user first, otherwise the restore is
  rejected (exact rejection text still needed).
- Once used by `$restore`, control marks the code as used.

## `$reinstate <code>`

Marks a used save code as never used so it can be restored again. Observed:

```
$reinstate (76697f20f2130214:#cd:e9labyrinth:Sword-Atmosphere:1/4/7/8/8/9/9/12/2/0:93612397:24990:100:18:0:4101:100:1786163386:cINkg5RDBlgfpSyS)
Code reinstated successfully!
```

## `$view <code>`, `$discard <code>`, `$%`

Known only from `$help` descriptions, no observed message text yet:

- `$view <code>`: "view the status of a save code".
- `$discard <code>`: "discard a save code such that it could never be used
  again".
- `$%`: "return the result of the last command, this is useful when chained
  to other commands". CONTROL.md keeps `%` per user for chaining.

Need from the live bot: exact output of `$view` (valid, used, discarded,
unknown code), exact success and error lines for `$discard`, and what `$%`
replays when there is no last result.

## Permissions

Rank is in-game power, flags are Discord power, and the two never meet.
Permissions live on user rows in the control DB and are enforced
control-side on every query, the bot only renders the denial. A fresh user
has no flags, so `$l` and actions answer the red error while `$p`, `$s`,
`$a`, `$help`, `$modes`, `$uptime`, and save commands stay public. A high
rank with empty flags plays as staff in-game and still gets `Permission
denied` from every gated bot command.

- Player lists need the `list.players` flag.
- Actions need the matching flag: `action.reset`, `action.kill`,
  `action.broadcast`, `action.kick`, `action.ban`,
  `action.restart`. `*` grants everything bot-side.
- Types and their ranks (`player` 0 through `developer` 7) decide in-game
  gates, spawn classes, and cosmetics only.

Granting access is a panel call from the control machine (loopback only,
add `-H "Authorization: Bearer <CONTROL_PANEL_KEY>"` when a panel key is
set). On one machine the panel is on the game port: `http://127.0.0.1:3000`.
Read-only leaderboards:

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

Keep the type at `player` unless the user also needs in-game staff powers;
the type no longer unlocks anything in Discord.

If someone can run gated commands without a grant you remember, inspect
their row, they hold a flag (or `*`) from an earlier grant:

```
curl -s http://127.0.0.1:3000/panel/users | python3 -m json.tool | grep -B1 -A6 '<discord-id>'
curl -s http://127.0.0.1:3000/panel/users \
  -H "Content-Type: application/json" \
  -d '{"discordId":"<discord-id>","type":"player","flags":[]}'
```

## `$reset`, actions, and selectors

`$reset` puts the player back to a fresh spawn without killing them:
spawn class tank (or their permission `spawnAs`), score 26263, level 45 or the
player's level if higher, no tank upgrades, and the default pool of upgrade
points. Chained off a
player list. Observed:

```
$#ea l #18121 reset
Reset score on player #18121 named n3ate successfully!
Requested by stark109
```

So the success shape is `Reset score on player #<id> named <name>`
plus `successfully!`, then the `Requested by` footer.

Selector rules (same as CONTROL.md pipeline filters, plus the arras extras
from `$help`):

- `#18121` selects the player by id.
- `name <text>` or `n <text>` selects by name. First letter or first two
  letters of any key work as a shortcut.
- `=` is exact equal, `~` is case and punctuation insensitive contains
  (`n~"test"` matches "Test", "TEST!" and "t e s t"). `/regex/`, `!=`
  (also `!~`, `!/`), `<=` (also `>=`, `<`, `>`) work the same.
- `n`, `n:m` slice, `+` / `-` sort ascending / descending.
- Shortcuts: `$ s` servers, `$ p` ping, `$ a` all, `$ l` player list,
  `$ v` verbose.
- Quotes: single quotes or backticks ignore spaces, double quotes allow
  escapes like `\n` and `\t`.
- Full pipeline still applies: `$ servers id/^[cw]/ ping players- 0 players
  score- 0:10`, `$ #epl l n~"test" reset`, `$ l n=playername v`,
  `$ servers players<=3 ping`.
- `$help` also lists a server filter key `mspt`, which OSA control does not
  have (telemetry decision: only id, mode, player count, uptime). Decide
  whether to add it or drop it from help.
- Other actions ride the same path: `kill`, `kick`, `ban`,
  `restart`, `broadcast`. No confirmation step, a valid command runs at once.
  Player actions need an explicit `l` first (`$#lz ban` is
  `list players first with l`), and `reset`/`ban` pick exactly one target
  (`pick one player` otherwise). `restore` has the same two gates. Permissions
  come from the control DB flags, rank plays no part (see
  Permissions above).
- Owner note: "kill, ban you gotta figure out yourself." No observed
  text for them yet. Proposed: mirror the reset shape (`<Verb> on player
  #<id> named <name> successfully!`), confirm against the live bot before
  building. Error lines (`player_left`, `unsupported`, `bad_args`,
  `node_unreachable`, `forbidden`) are also unobserved.
- `$broadcast` sends a message to every player on the scoped servers:
  `$#lz broadcast hello players` answers
  `Broadcast to server #lz successfully!` (proposed wording, mirrors
  `$restart`). Needs a message (`#lz broadcast` alone is `bad_args`) and
  rank 2, mirroring the in-game broadcast command.

## Save codes and control DB

Save codes live in the bot store (`bot/data/saves.db`, table `save_codes`
with the code hash, full code, claiming Discord id, used and discarded
flags, claim and use times). Control stores none.

- `$claim` inserts the claim. Double claim answers `This code has already
  been claimed by @user` (same text for your own codes).
- `$restore` checks the claim belongs to the given user, is not discarded
  or used, then marks it used and answers
  `Restored save on player #<id> named <name> successfully!` (proposed
  wording, mirrors `$reset`). Same gates as `$reset`: an explicit `l` on the
  left, and exactly one player in scope.
- `$reinstate` flips it back to never used.
- `$discard` flips the discarded flag, only the claimant may. Answers
  `Code discarded successfully!` (proposed wording).
- `$view` shows the code (redacted outside DMs), claimant, and status.
- `$saves` lists by Discord id, 15 per page with buttons, full codes only
  in DMs.
- `$kill`, `$kick`, `$ban` success lines mirror the reset shape
  (`Killed/Kicked/Banned player #<id> named <name> successfully!`,
  proposed). `$restart` answers
  `Restarted server #<id> successfully!` (proposed). Direct ip `$ban` keeps
  control's `ban ok: <ip>` lines.
- A `$ban` is always temporary and stays on the issuing servers only:
  targets are kicked, their ips are held in node memory, nothing is stored
  or pushed. A duration (`ban spamming 10m`) ends it earlier, no duration
  means until the arena closes or the process restarts, whichever comes
  first. There is no `$unban`, temporary bans lapse on their own.
  Control answers `tempban ok: <name> (<node>)` per target, or
  `tempban ok: <ip>` for direct ip bans.
- The bot only bans selected players. A raw ip (`$ban 1.2.3.4 spamming`)
  answers `No players in scope` without ever sending. Direct ip bans still
  exist on the control bus for the panel: `ban 1.2.3.4 spamming [duration]`.

## Open items

Exact arras wording wins where marked proposed above:

1. Proposed, needs live confirmation: `$kill` / `$kick` / `$ban` /
   `$restart` success lines, `$restore` success line, `$discard` success
   line, `$view` layout, and error lines beyond the observed ones
   (`player_left`, `unsupported`, `bad_args`, `node_unreachable`,
   `forbidden`).
2. Wording still proposed for `$restore` rejections, `$reinstate` errors,
   `$view` / `$discard` text, and empty `$saves`.
3. Open: OSA mode letter mapping. OSA has no letter system, only gamemode
   name arrays. `$modes` still shows the arras tables verbatim. Also
   `mspt` filter key: add it or drop it from help.
4. Approximations to confirm against live arras: offline `$p` lines always
   read `Connection timed out`, `$v` player output keeps the code block
   table (no sample), `$s` keeps the plain id list (no sample), unscoped
   `$l` titles `${n} players` with no URL (no sample), empty `$l` titles
   `0 players` (no sample).
5. OSA invite links to replace the arras `Add the bot` / `join the Discord`
   URLs in `$help`. `serverBase` in `bot/config.js` feeds the server links
   in `$p` titles and `$l` URLs.
