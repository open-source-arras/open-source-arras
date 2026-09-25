# js-src configuration and tuning constants

This is a complete extraction of every configuration value and tuning-constant table in
`js-src/server`, produced for writing the Go port's `internal/config` package (see
`docs/architecture.md`). Every claim below cites a `file:line` in `js-src`. Where the
source does not say what a value means, this document says `UNKNOWN:` and states what
was checked, rather than guessing.

`js-src` is read-only source material; nothing in it was created, modified, or deleted
while producing this document.

## Contents

1. [Scope: what this covers and what it doesn't](#1-scope)
2. [How configuration loads at boot](#2-how-configuration-loads-at-boot)
3. [config.js — complete key table](#3-configjs--complete-key-table)
4. [constants.js — complete table](#4-constantsjs--complete-table)
5. [presets.js — complete table](#5-presetsjs--complete-table)
6. [gunvals.js — gun/turret stat-multiplier presets](#6-gunvalsjs--gunturret-stat-multiplier-presets)
7. [Environment variables (.env / dotenv.js)](#7-environment-variables-env--dotenvjs)
8. [Read-once vs. re-read: the standout cases](#8-read-once-vs-re-read-the-standout-cases)
9. [Globals installed by loaders/global.js](#9-globals-installed-by-loadersglobaljs)
10. [TRAPS](#10-traps)
11. [Methodology and data-provenance notes](#11-methodology-and-data-provenance-notes)

---

## 1. Scope

The extraction task named six files. All six were read in full:

- `js-src/server/config.js` (405 lines) — the main config, `module.exports` object.
- `js-src/server/lib/definitions/constants.js` (81 lines) — base tank stats + display names.
- `js-src/server/lib/definitions/gunvals.js` (915 lines) — 104 named gun/turret stat-multiplier presets.
- `js-src/server/lib/definitions/presets.js` (116 lines) — small reusable object fragments for gun/turret/hat definitions.
- `js-src/server/.env` and `js-src/server/lib/dotenv.js` — the env-loading mechanism.
- `js-src/server/loaders/global.js` (725 lines) — everything it installs onto Node's `global`.

**Boundary with `docs/architecture.md`'s `internal/defs` package.** `constants.js`,
`gunvals.js` and `presets.js` all live under `js-src/server/lib/definitions/`, and
`docs/architecture.md:10-11` assigns that whole directory to a *different* planned tool
(`tools/dump-definitions.js`) and Go package (`internal/defs`), calling it "32,004 lines
of declarative data." That figure describes the actual entity/tank/turret/boss
definition tree — `lib/definitions/groups/*.js` (largest: `turrets.js` at 1,831 lines and
`tanks.js` at ~10,700 lines) and `lib/definitions/entityAddons/**`. This document and
`tools/dump-config.js` do **not** touch that tree; it was out of scope for this task and
is `tools/dump-definitions.js`'s job. `constants.js`, `gunvals.js` and `presets.js` are
small, non-`Class`-registering *inputs* to that tree (raw multiplier/stat tables), which
is why the task grouped them with `config.js` instead: they are tuning data, not entity
definitions, and none of the three ever appear as a `Class.xxx` entry.

## 2. How configuration loads at boot

There is no single, static "config object." What ends up in `Config` at any moment
during play is the result of five layers applied in this order, in each server
worker's own process:

1. **`config.js`'s own defaults** — `global.Config = require("../config.js")`
   (`js-src/server/loaders/global.js:5`), the first thing `loaders/loader.js` does
   (`js-src/server/loaders/loader.js:2-3, 30-33`). This runs once per worker thread; see
   §11 on why workers don't share this object.
2. **The selected server's `properties` object**, applied in the `gameServer`
   constructor: `Object.keys(serverProperties).forEach(key => { Config[key] =
   serverProperties[key] })` (`js-src/server/game.js:96-98`). This is the `properties`
   field on each entry of `config.js`'s own `servers` array (`js-src/server/config.js:40-212`,
   documented at `config.js:37`: *"properties - This overrides other settings in this
   file, assuming the selected gamemode doesn't also override it."*). Runs once, at
   worker construction.
3. **The selected gamemode's config file**, merged key-by-key: `for (let key in mode)
   ... Config[key] = mode[key]` (`js-src/server/game.js:282-298`), where `mode` is
   `require('./game/gamemodes/config/${gamemode}.js')`. This is guarded by
   `if (!softStart)` (`game.js:283`) — see §8. This is where keys like `Config.mode`,
   `Config.teams`, `Config.siege`, `Config.retrograde`, `Config.groups` etc. come from;
   **none of them are declared in `config.js` itself.** There are 44 files in
   `js-src/server/game/gamemodes/config/`; they were not individually cataloged here
   (out of the task's file list) but the merge mechanism and several examples are cited
   throughout this document and in §10.
4. **Ad-hoc runtime installs from gamemode script constructors** — e.g.
   `Config.tag_data = {...}` (`js-src/server/game/gamemodes/scripts/tag.js:6`),
   `Config.mothership_data = {...}` (`.../mothership.js:11`), `Config.clan_wars_ft = {...}`
   (`.../clan_wars.js:7`), `Config.OURBREAK_FUNCTIONS = {...}` (`.../outbreak.js:4`, note
   the typo, §10). These attach callback APIs onto the `Config` object as a convenient
   shared bag; they are not tunable values.
5. **Live mutation during play** — an admin chat command can reassign `Config.mode` and
   `Config.teams` while players are connected (`js-src/server/game/addons/chatCommands.js:110-115`);
   `Config.map_tile_width`/`map_tile_height` are exposed as live getter/setters
   (`js-src/server/game.js:472-481`); `Config.daily_tank_INDEX` is recomputed on every
   socket "welcome" (`js-src/server/game/network/sockets.js:2225-2231`); `Config.roomWidth`/
   `Config.roomHeight` are (re)written every time a room is built (`js-src/server/game.js:491-492`).

**Consequence for the Go port:** `Config` in this codebase is a mutable, shared,
extensible bag, not a value object. A literal port would need `internal/config` to be
either (a) an immutable snapshot built once per room from steps 1-3 above, with steps 4-5
modeled as *separate*, explicit, mutable state that happens to have been bolted onto
`Config` in JS — which is almost certainly the right call and matches
`docs/architecture.md`'s "no globals, each becomes an explicit dependency" rule — or (b)
a mutable struct if the admin-mutable behavior (case 5) is a feature you intend to keep.
Decide explicitly; do not assume immutability holds for every field. See §8 for exactly
which fields need this decision.

## 3. config.js — complete key table

`config.js` has **69 top-level keys** (verified with
`Object.keys(require('./js-src/server/config.js')).length`, and independently by reading
the file end-to-end). All 69 appear below, grouped the way `config.js`'s own section
comments group them. Columns:

- **Default** — the literal value in the file.
- **Defined at** — `config.js:line`.
- **Read pattern** — `Boot` (read only during startup/construction; changing it later has
  no effect on the running process), `Live` (read again during play, so a live edit takes
  effect), `Boot→cached` (read once and copied into an instance field; later reads use
  the cached copy, so editing `Config` directly does nothing after boot), or `Mixed`
  (some read sites are boot/definition-load-time, others are live).

**Environment-variable overrides: none.** No key in this table is read from
`process.env` anywhere in `js-src/server`. See §7 for what `.env` actually does.

### Development / client / server basics

| Key | Type | Default | Meaning | Defined at | Read pattern |
|---|---|---|---|---|---|
| `dev_build` | boolean | `false` | Marks the build as unstable in the `/version` API response. | `config.js:3` | Live (read on each `/version` HTTP request, `server.js:130-132`) |
| `main_menu` | string | `'index.html'` | Static file served from `/public` as the main menu. | `config.js:6` | Live (read on each matching static-file request, `server.js:215`) |
| `host` | string | `'localhost:3000'` | Web-server domain; must match the port setting if `host` is `localhost:PORT`. | `config.js:7` | Boot (used constructing the shared server and in the one-time startup routing-table log, `server.js:283,298`) |
| `port` | number | `3000` | Port the web server (HTTP + WS upgrade) listens on. | `config.js:8` | Boot (`server.js:283,304,309`) |
| `visible_list_interval` | number (ms) | `250` | Minimum interval between recomputing which entities a client can see; gates entity activation. | `config.js:11` | Live — read every camera update (`game/network/sockets.js:1563`) |
| `startup_logs` | boolean | `true` | Enables verbose startup logging and the speed-loop warning log. | `config.js:12` | Boot, and again on-demand whenever an operator runs "reload definitions" live (`chatCommands.js` reload handler calls back into `lib/definitions/combined.js`, which re-checks this flag) |
| `load_all_mockups` | boolean | `false` | Pre-builds a `MockupEntity` for every `Class` at startup (and again after a live definitions reload) instead of building them lazily per socket. | `config.js:13` | Live — checked at boot (`server.js:39`), on every "reload definitions" (`chatCommands.js:293`), on every socket welcome (`sockets.js:2220`), and gates several lazy-mockup code paths (`sockets.js:1606,1621,1628`) |
| `editor` | boolean | `true` | Enables the `/ext/editor` WebSocket upgrade route and its admin-token check. | `config.js:14` | Live — checked on every `/api/editor` upgrade (`game/network/editor.js:48`) |

### Servers (`servers` array)

| Key | Type | Default | Meaning | Defined at | Read pattern |
|---|---|---|---|---|---|
| `servers` | array of 7 server-definition objects | see below | One process (or in-process worker) per entry; defines routing, gamemode, and per-server property overrides. | `config.js:40-212` (schema documented in the comment at `config.js:16-38`) | Mixed — walked once at boot to spawn workers (`server.js:310`), and looked up on-demand whenever a player triggers server travel (`game/addons/serverTravel.js:85`) |

Each entry's schema (from the comment block at `config.js:16-38` and the 7 literal
entries at `config.js:41-211`): `share_client_server`, `host`, `port`, `id`, `region`,
`serverhost`, `location`, `gamemode` (array of gamemode names, looked up against
`js-src/server/game/gamemodes/config/<name>.js`), `player_cap`, `featured`, `unlisted`,
`private`, and `properties` — an **open bag whose keys are arbitrary `Config` keys**
(see step 2 in §2). The shipped example entries use `properties` to set `bot_cap`,
`daily_tank`, `teams`, `mothership_time_limit`, `allow_server_travel`,
`server_travel_properties` (`loop_interval`, `portals`), and `server_travel` (an array of
`{ ip, portal_properties: { spawn_chance, color } }`) — none of which exist as top-level
`config.js` keys; they only exist for servers whose `properties` sets them. Only one
server may set `share_client_server: true` — this is enforced at *runtime*, not at
config-load time, by a `process.exit(1)` if a second one tries (`server.js:281-284`), so
a Go port should validate this at config-load time instead of discovering it at runtime.

### Web server

| Key | Type | Default | Meaning | Defined at | Read pattern |
|---|---|---|---|---|---|
| `allow_ACAO` | boolean | `false` | Sets `Access-Control-Allow-Origin` permissively for cross-origin API/asset requests. | `config.js:215` | Live — checked per HTTP request (`server.js:71,95`) |

### Map

| Key | Type | Default | Meaning | Defined at | Read pattern |
|---|---|---|---|---|---|
| `map_tile_width` | number | `420` | Width of one map tile, in world units. | `config.js:218` | Live — exposed as a live getter/setter on `room.tileWidth`/`room.width`/`room.center.x` (`game.js:472,474,480`); **mutable at runtime**, not just a boot default |
| `map_tile_height` | number | `420` | Height of one map tile, in world units. | `config.js:219` | Live — same pattern (`game.js:473,475,481`) |

### Messages

| Key | Type | Default | Meaning | Defined at | Read pattern |
|---|---|---|---|---|---|
| `spawn_message` | string | `"You have spawned! Welcome to the game.\nYou will be invulnerable until you move or shoot."` | Chat message shown on spawn. | `config.js:222-223` | Live — read on every player spawn (`sockets.js:1278`) |
| `token_message` | string | `"Friendly reminder: Please do not repeatedly kill others with an overpowered tank."` | Shown via an admin/key command. | `config.js:224` | Live — event-driven (`game/addons/keyCommands.js:110`) |
| `chat_message_duration` | number (ms) | `15_000` | How long a chat message stays in the chat log. | `config.js:226` | Live — read on every chat message (`sockets.js:670`) |
| `popup_message_duration` | number (ms) | `10_000` | How long a popup-style message stays on screen. | `config.js:227` | Live — read at every popup send site (`sockets.js:28`; `entity.js:150`; `chatCommands.js:221,285`; `basicChatModeration.js:24,47`) |
| `sanitize_chat_input` | boolean | `true` | Strips color/formatting from chat messages after addons interpret them, before they're stored. | `config.js:228` | Live — read on every chat message (`sockets.js:649`) |

### Seasonal

| Key | Type | Default | Meaning | Defined at | Read pattern |
|---|---|---|---|---|---|
| `fireworks` | boolean | `false` | Enables firework entities (normally auto-toggled around July 4 in US-region servers — the auto-toggle logic itself is outside the 6 files read for this task and was not traced). | `config.js:231` | Live — checked at every firework-entity spawn attempt (`lib/definitions/entityAddons/fireworks/fireworks.js:54`) |
| `thanksgiving` | boolean | `false` | Replaces Motherships with Turkeys. | `config.js:232` | Read at Mothership gamemode-script construction and again in its win-condition logic (`game/gamemodes/scripts/mothership.js:3,59`) |
| `spooky_theme` | boolean | `false` | Halloween reskin: walls grow eyes, rocks become pumpkins. | `config.js:233` | Mixed — read at room/tile build time for most gamemodes (boot-once), but maze/siege/labyrinth regenerate their layout live during play and re-check it then (`game/gamemodes/scripts/labyrinth.js:29`, `maze.js:29`, `siege.js:324`; `game/roomSetup/tiles/default.js:43`, `rocks.js:25,33`) |

### Gameplay

| Key | Type | Default | Meaning | Defined at | Read pattern |
|---|---|---|---|---|---|
| `game_speed` | number | `1` | Global tick-rate multiplier. | `config.js:236` | **Boot→cached.** Copied into `this.roomSpeed` in the constructor and again in `start()` (`game.js:127,300`). Nothing reads `Config.game_speed` directly elsewhere — see the trap in §10. |
| `run_speed` | number | `1.5` | Global multiplier for acceleration and max speed. | `config.js:237` | **Mixed — and inconsistently so.** Cached into `this.runSpeed` at `game.js:128,301`, *but also* read directly and live from `Config.run_speed` in hot per-tick physics code (`game/entities/bulletEntity.js:438`, `game/entities/entity.js:1020`, `miscFiles/collisionFunctions.js:334`). See the trap in §10. |
| `max_heartbeat_interval` | number (ms) | `300_000` | How long a socket may be unresponsive before the tank self-destructs. | `config.js:238` | Live — checked continuously (`sockets.js:760,2006,2093`) |
| `respawn_delay` | number (s) | `0` | Wait time to respawn; `0` disables the wait. | `config.js:239` | Live — read at every respawn scheduling (`sockets.js:1255`) |
| `upgrade_delay` | number (ms) | `3_000` | How long a player must stand still (not firing) outside a base to upgrade; `0` disables the requirement. | `config.js:241` | Live — read every tick for every player with a pending upgrade, inside `bringToLife` (`loaders/global.js:210,216`; also `game/entities/entity.js:837,840,871`) |
| `upgrade_delay_reminder` | number (ms) | `20_000` | How often to remind an eligible player to stand still to upgrade. | `config.js:242` | Live — per-tick inside `bringToLife` (`loaders/global.js:219`) |
| `bullet_spawn_offset` | number | `1` | Bullet spawn point along the barrel: `1` = fully outside, `-1` = fully inside, `0` = halfway. | `config.js:244` | Live — read on every shot fired (`game/entities/gun.js:60`) and inside a specific AI controller (`miscFiles/controllers.js:1154-1155,1237-1238`) |
| `damage_multiplier` | number | `1` | Global multiplier applied to every damage calculation. | `config.js:245` | Live — read on every collision (`miscFiles/collisionFunctions.js:254-255`) |
| `knockback_multiplier` | number | `1.1` | Global multiplier applied to every knockback calculation. | `config.js:246` | Live — read on every knockback (`miscFiles/collisionFunctions.js:327`) |
| `glass_health_factor` | number | `2` | Parametrizes the shield/health skill-investment curve (`skills.js:89,91`: `factor * apply(3/factor - 1, x)` for shield, `factor * apply(2/factor - 1, x)` for health). Source comment: *"TODO: Figure out how the math behind this works."* | `config.js:247` | Live — read every time `skill.update()` runs, i.e. on every stat change (`game/entities/skills.js:89,91`) |
| `room_bound_force` | number | `0.01` | Strength of the force confining entities to the map/portals. | `config.js:248` | Live — read every physics tick for entities near a boundary (`game/entities/bulletEntity.js:438-446`, `game/entities/entity.js:1020-1028`, `game/roomSetup/tiles/portal.js:16`) — one of the hottest per-tick config reads in the file |
| `soft_max_skill` | number | `0.59` | Fraction of the real per-stat skill cap applied while `skill.level < skill_cap_soft`. Source comment: *"TODO: Find out what the intention behind the implementation of this configuration is."* Mechanically inert by default — see §10. | `config.js:249` | Live — read inside `Skill.cap()` on every upgrade-availability check (`game/entities/skills.js:146`) |
| `mothership_time_limit` | number (ms) | `0` | Max time a player may control their team's mothership; `0` disables the limit. | `config.js:251` | Live — event-driven, checked whenever mothership control changes (`sockets.js:570-588`) |
| `defineLevelSkillPoints` | function `(level) => number` | see `config.js:254-259` | Skill points awarded for reaching `level`. The only function-valued top-level key; a Go port needs a strategy/formula, not a plain field. Body: `level<2→0; level<=40→1; level<=45 && odd→1; else 0` — see the operator-precedence note in §10. | `config.js:254-259` | Live — invoked on every level-up-score calculation, unless an entity has its own `LSPF` override (`game/entities/skills.js:142`) |
| `level_cap` | number | `45` | Maximum normally-achievable level. | `config.js:261` | Live (`bulletEntity.js:311`, `entity.js:678`, `game/index.js:382`, `miscFiles/mockupEntity.js:296`) |
| `level_cap_cheat` | number | `45` | Maximum level reachable via the level-up key / auto-level-up. | `config.js:262` | Live — event-driven (`entity.js:940`, `sockets.js:509,1103`) |
| `skill_cap` | number | `9` | Per-stat skill point cap. | `config.js:264` | Live — read at every `Skill` construction and every `skill.update()` (`game/entities/skills.js:17,19,31,79`; `lib/definitions/facilitators.js:77`) |
| `skill_cap_soft` | number | `0` | Level below which the soft `soft_max_skill` cap applies. Source comment: *"TODO: Figure out what this does."* Default `0` makes it a no-op (`level < 0` is never true) — see §10. | `config.js:265` | Live — read inside `Skill.cap()` (`game/entities/skills.js:145`) |
| `tier_multiplier` | number | `15` | Level distance between upgrade tiers. | `config.js:266` | Live — read whenever an upgrade tree is built or an upgrade-eligibility check runs, i.e. on every entity spawn/upgrade (`entity.js:353,880`; `sockets.js:698,939`; `loaders/global.js:508,547`; `miscFiles/mockupEntity.js:318,360`) |

### Bots

| Key | Type | Default | Meaning | Defined at | Read pattern |
|---|---|---|---|---|---|
| `bot_cap` | number | `0` | Max bots on the server; `0` disables bots. | `config.js:269` | Live — checked in the bot-spawn gate every relevant tick (`game/index.js:431`) |
| `bot_xp_gain` | number | `60` | XP granted to a bot per relevant tick until it reaches `level_cap`. | `config.js:270` | Live (`game/index.js:383`) |
| `bot_start_level` | number | `45` | Level a bot is created at. | `config.js:271` | Live (`game/index.js:382,459`) |
| `bot_skill_upgrade_chances` | number[10] | `[1,1,3,4,4,4,4,2,1,1]` | Weighted chance a bot upgrades each of the 10 skill stats. | `config.js:272` | Live — event-driven, every bot skill upgrade (`game/index.js:424`) |
| `bot_class_upgrade_chances` | number[5] | `[1,5,20,37,37]` | Weighted chance a bot performs 0-4 class upgrades before stopping. | `config.js:273` | Live — event-driven (`game/index.js:452`) |
| `bot_name_prefix` | string | `"[AI] "` | Prefixed to a bot's randomly chosen name. | `config.js:274` | Live — every bot creation (`game/index.js:444`) |

### Spawn / regen

| Key | Type | Default | Meaning | Defined at | Read pattern |
|---|---|---|---|---|---|
| `spawn_class` | string (definition name) | `'basic'` | The class players and bots spawn as. | `config.js:277` | Mixed — read live at spawn/upgrade sites (`keyCommands.js:109,143`; `game/index.js:446`; `sockets.js:939,1165`) **and** baked into definition object literals at definition-load time (`lib/definitions/entityAddons/generators.js:281`; `lib/definitions/groups/dev.js:16,33,44,54,64`; `lib/definitions/groups/generics.js:130`; `lib/definitions/groups/testing.js:44`) — those captured copies only change if definitions are reloaded (`chatCommands.js` "reload definitions") |
| `regenerate_tick` | number (ms) | `100` | Interval of the entity health-regen loop. | `config.js:280` | **Boot→cached** — passed once to `setInterval(..., Config.regenerate_tick)` when the loop starts (`game/index.js:544`); editing `Config.regenerate_tick` afterward does not change the running interval's period |

### Food

| Key | Type | Default | Meaning | Defined at | Read pattern |
|---|---|---|---|---|---|
| `enable_food` | boolean | `true` | Allows food to spawn. | `config.js:283` | Live — per-tick gate (`game/index.js:521`) |
| `food_cap` | number | `70` | Max regular food at once. | `config.js:284` | Live (`game/index.js:350`) |
| `food_cap_nest` | number | `15` | Max nest food at once. | `config.js:285` | Live (`game/index.js:336`) |
| `enemy_cap_nest` | number | `10` | Max enemy nest food at once. | `config.js:286` | Live (`game/index.js:329`) |
| `food_group_cap` | number | `6` | Foods spawned per random food-group event: `1 + floor(random() * food_group_cap)`. | `config.js:287` | Live (`game/index.js:313`) |
| `food_types` | nested weighted-chance array (see below) | 3×3×6 generated table | Non-nest food spawn table. | `config.js:290-310` | Live — read on every non-nest food spawn (`game/index.js:359`) |
| `food_types_nest` | nested weighted-chance array | 2×3×6 generated table | Nest food spawn table. | `config.js:311-331` | Live (`game/index.js:344`) |

`food_types`/`food_types_nest` are generated, not literal, and the generation logic is
fully documented inline (`config.js:291-309`): outer axis = shape tier (regular/beta/
alpha/omega), weighted `4 ** (tiersLeft)`; middle axis = shiny modifier (6 levels),
weighted `200_000_000` for the plain tier and `10 ** (levelsLeft-1)` otherwise; the leaf
is always `[24, "laby_<i>_<j>_<k>_0"]` (the commented-out `_1` variant, a "crasher" rank,
is present in the source but inactive — `config.js:306,327`). `tools/dump-config.js`
expands both arrays fully into `gen/config.json`'s `config.food_types` /
`config.food_types_nest`; this document describes the shape rather than reproducing
~54 generated leaf entries per table.

### Classic food

| Key | Type | Default | Meaning | Defined at | Read pattern |
|---|---|---|---|---|---|
| `classic_food` | boolean | `false` | Enables the old "Dreadnoughts"-style food set. | `config.js:334` | Mixed — live per-tick spawn gate (`game/index.js:329,339,354`) **and** gates whole class definitions at definition-load time (`lib/definitions/groups/bosses/mysticals.js:277`; `lib/definitions/groups/dev.js:5`) |
| `classic_food_types` | weighted-chance array, 3 tiers | egg/triangle/square/pentagon, gem/shiny-*, jewel/legendary-* (hexagon tier commented out at each level) | `config.js:335-345` | Live (`game/index.js:355`) |
| `classic_food_types_nest` | weighted-chance array | pentagon/betaPentagon/alphaPentagon (presents commented out) | `config.js:346-350` | Live (`game/index.js:340`) |
| `classic_enemy_types_nest` | weighted-chance array | crasher, and (1/20 chance) sentryGun/sentrySwarm/sentryTrap | `config.js:351-358` | Live (`game/index.js:331`) |

### Bosses

| Key | Type | Default | Meaning | Defined at | Read pattern |
|---|---|---|---|---|---|
| `enable_bosses` | boolean | `true` | Allows bosses to spawn. | `config.js:361` | Live — per-tick gate (`game/index.js:387`) |
| `boss_control` | boolean | `false` | Lets players control bosses (dominators, motherships). | `config.js:362` | Live — event-driven (`sockets.js:613`) |
| `boss_spawn_cooldown` | number (s) | `260` | Delay between boss spawns. | `config.js:363` | Live — per-tick timer comparison (`game/index.js:387`) |
| `boss_spawn_delay` | number (s) | `6` | Delay between the spawn announcement and the actual spawn. | `config.js:364` | Live — event-driven (`game/index.js:388,415`, note the `* 30` unit conversion at line 415) |
| `boss_types` | array of 3 `{bosses[], amount[], chance, nameType, message?}` | see `config.js:366-379` (2 more entries commented out at `380-389`) | Weighted boss-wave table. | `config.js:365-390` | Live — read at every boss-spawn selection (`game/index.js:389`) |

### Teams / fun / room setup

| Key | Type | Default | Meaning | Defined at | Read pattern |
|---|---|---|---|---|---|
| `team_weights` | object, `{}` by default | Relative spawn-weight per team ID, used to balance team sizes. | `config.js:395` | Live — read inside `getWeakestTeam()` on every team-assignment (`loaders/global.js:89`) |
| `brain_damage` | boolean | `false` | Enables a camera/tank-shake easter egg for players named "Brain Damage" (disabled by default for epilepsy reasons, per the source comment). | `config.js:398` | Live — checked whenever a name is set (`sockets.js:314`); the per-tick shake effect itself reads a cached per-entity flag, not this Config key directly (`loaders/global.js:369`) |
| `random_body_colors` | boolean | `false` | Random body color instead of team/mode-based color. | `config.js:399` | Live — event-driven, every spawn/color assignment (`game/index.js:453`; `sockets.js:1214,1231,1393`) |
| `room_setup` | string[] | `['room_default']` | Room-layout module name(s), looked up under `game/roomSetup/rooms/`. | `config.js:402` | Boot — merged from gamemode config and consumed once per room build (`game.js:293,488`); see §8 for the soft-restart exception |
| `round_arena` | boolean | `false` | Alternate round/arena boundary-shape behavior. | `config.js:403` | Live — read in the same hot per-tick boundary code as `room_bound_force` (`bulletEntity.js:432`, `entity.js:1014`) and once per socket for UI (`sockets.js:300`) |
| `mode` | string | `'ffa'` | Base gamemode label (`'ffa'`, `'tdm'`, …), also reassignable live. | `config.js:404` | **Live and admin-mutable** — reassigned by a live chat command (`chatCommands.js:110,114`) and read throughout play for team-color/leaderboard/kill-attribution logic (`sockets.js:1135,1182,1231,1393,1407,1744,1752,1831,1846,1968`; `game/index.js:432`; `game/gamemodes/scripts/dominator.js:53`) |

## 4. constants.js — complete table

All 6 top-level keys (verified with `Object.keys(require('./js-src/server/lib/definitions/constants.js'))`).

| Key | Type | Value | Meaning | Defined at |
|---|---|---|---|---|
| `basePolygonDamage` | number | `1` | Base damage dealt by a plain food polygon. | `constants.js:3` |
| `basePolygonHealth` | number | `2` | Base health of a plain food polygon. | `constants.js:4` |
| `dfltskl` | number | `9` | Default `SKILL_CAP` value baked into most tank/turret definitions (matches `config.js`'s own `skill_cap` default, but is a separate, independently-editable literal — see §10). | `constants.js:7` |
| `smshskl` | number | `12` | `SKILL_CAP` used for "smasher"-type tanks (higher than the default). | `constants.js:8` |
| `base` | object, 10 numeric fields | `ACCEL:1.6, SPEED:5.25, HEALTH:20, DAMAGE:3, RESIST:1, PENETRATION:1.05, SHIELD:5.75, REGEN:0.01, FOV:1.02, DENSITY:0.5` | The foundational body-stat baseline every tank's `BODY` block multiplies against (e.g. `lib/definitions/entityAddons/dreadnoughts/dreadv1.js:5-11`: `SPEED: base.SPEED * 0.6`, etc.). | `constants.js:11-22` |
| `statnames` | object of objects, string→string | per-tank-type display-name overrides for the 4 gun-derived stat slots (`BULLET_SPEED`, `BULLET_HEALTH`, `BULLET_PEN`, `BULLET_DAMAGE`) and `RELOAD`, keyed by tank archetype: `desmos`, `flail`, `healer`, `mixed`, `drone`, `necro`, `satellite`, `smasher`, `swarm`, `trap` | UI label text only — e.g. a `drone`-archetype tank shows "Drone Speed" instead of the generic "Bullet Speed" for its reload-derived stat. | `constants.js:25-80` |

All 10 `base` fields and all 10 `statnames` archetypes were read directly from the file;
none are generated or computed.

## 5. presets.js — complete table

All 9 top-level keys (verified with `Object.keys(require('./js-src/server/lib/definitions/presets.js'))`).

| Key | Type | Value | Meaning | Defined at |
|---|---|---|---|---|
| `tooltip.menu_lag` | string | *"WARNING: There are a lot of entities in here and having this menu open may cause noticeable frame drops!"* | UI warning text shown on a heavy menu. | `presets.js:4` |
| `gun` | object | `{}` | Empty placeholder namespace; no gun presets defined here (compare §6, a *different* file). | `presets.js:8` |
| `prop` | object | `{}` | Empty placeholder namespace. | `presets.js:9` |
| `turret.driveHat` | array (1 entry) | a grey `squareHat` at `SIZE:9, LAYER:1` | Reusable turret-hat fragment for "drive"-type tanks. | `presets.js:11-19` |
| `turret.swarmdriveHat` | array (1 entry) | a grey `triangleHat` at `SIZE:8, ANGLE:180, LAYER:1` | Reusable turret-hat fragment for "swarm-drive"-type tanks. | `presets.js:20-29` |
| `hybrid` | object | `{count:1, widthOffset:1, independent:true, cycle:false}` | Default options for the `makeOver`/hybrid-turret facilitator function (in `facilitators.js`, outside this task's scope). | `presets.js:33-35` |
| `makeAuto` | object, 12 named sub-presets | `mega`, `ultra`, `triple`, `tripleMega`, `tripleUltra`, `penta`, `pentaMega`, `pentaUltra`, `hepta`, `heptaMega`, `heptaUltra`, `drive`, `driveMega`, `driveTriple` — each a `{type?, size, x?, angle?, total?, clearTurrets?}` fragment | Layout presets for auto-turret placement (count/spacing/size), consumed by the `makeAuto` facilitator. | `presets.js:38-81` |
| `makeFore.hybrid` | object | `{count:1, heightOffset:-1, independent:true, extraStats:[{size:0.9}]}` | Layout preset for forward-mounted hybrid turrets. | `presets.js:83-85` |
| `makeHat` | object, 4 named sub-presets | `spin` (`rotationSpeed:0.16`), `spinFast` (`0.2`), `spinFaster` (`0.32`), `spinReverse` (`-0.16`) | Named rotation-speed presets for hat decorations. | `presets.js:88-99` |
| `on.retrograde_self_destruct` | object `{event, handler}` | `event: 'define'`; `handler` is a function `({body}) => {...}` | Fires when a definition is applied to a body: if `Config.retrograde` is set and the body is a player with no elevated `socket.permissions`, warns the player and self-destructs the tank after 10s. The only other function value in the 6 files read for this task (besides `config.js`'s `defineLevelSkillPoints`). References `Config.retrograde`, which is **not** a `config.js` key — see §10. | `presets.js:103-114` |

## 6. gunvals.js — gun/turret stat-multiplier presets

`gunvals.js` is not itself a set of independent "config keys" — it is one lookup table of
**104 named presets** (verified: `Object.keys(require('./js-src/server/lib/definitions/gunvals.js')).length === 104`),
each a partial override of the same 13-field schema defined by the first entry, `blank`
(`gunvals.js:3-17`): `reload, recoil, shudder, size, health, damage, pen, speed, maxSpeed,
range, density, spray, resist` — all defaulting to `1` (a pure multiplier identity).

**How presets combine.** `lib/definitions/facilitators.js:17-66` exports
`combineStats(stats)`, which starts from an all-`1` object and multiplies in every field
present in every preset passed to it — e.g.
`combineStats([g.basic, g.flankGuard, g.triAngle, g.triAngleFront])`
(`lib/definitions/groups/projectiles.js:30`) produces a tank's actual `SHOOT_SETTINGS` by
multiplying four named presets together. This mechanism lives in `facilitators.js` and
`lib/definitions/groups/*.js`, both outside this task's file list, but is included here
because it is the only way to explain what a "gunvals preset" *is* for a Go port: **not**
a set of absolute values, but a named multiplier that composes with others by
multiplication, per field, with missing fields treated as `1`.

All 104 presets, with the fields each one overrides (fields not listed default to `1`
via `blank`):

| Name | Defined at (`gunvals.js:`) | Non-default fields |
|---|---|---|
| `blank` | 3 | reload=1, recoil=1, shudder=1, size=1, health=1, damage=1, pen=1, speed=1, maxSpeed=1, range=1, density=1, spray=1, resist=1 |
| `basic` | 18 | reload=10.5, recoil=1.4, shudder=0.1, damage=0.75, speed=4, spray=15 |
| `drone` | 26 | reload=36, recoil=0.25, shudder=0.1, size=0.6, speed=1.5, spray=0.1 |
| `swarm` | 34 | reload=23, recoil=0.25, shudder=0.05, size=0.4, damage=0.75, speed=4, spray=5 |
| `minion` | 43 | reload=48, shudder=0.1, size=0.7, damage=0.75, speed=3, spray=0.1 |
| `trap` | 51 | reload=23, shudder=0.25, size=0.7, damage=0.75, speed=3.25, spray=0, resist=3 |
| `trapSpray` | 60 | reload=23, shudder=0.25, size=0.7, damage=0.75, speed=3.25, resist=3 |
| `single` | 70 | reload=1.05, speed=1.05 |
| `desmos` | 74 | reload=1.1, shudder=0, damage=0.75, speed=0.5, range=1.2, spray=0 |
| `twin` | 82 | recoil=0.5, shudder=0.9, health=0.9, damage=0.7, spray=1.2 |
| `doubleTwin` | 89 | damage=1.1 |
| `tripleTwin` | 92 | health=1.1 |
| `hewnDouble` | 95 | reload=1.25, recoil=1.5, health=0.9, damage=0.85, maxSpeed=0.9 |
| `tripleShot` | 102 | reload=1.1, shudder=0.8, health=0.9, pen=0.8, density=0.8, spray=0.5 |
| `spreadshotMain` | 110 | reload=0.781, recoil=0.25, shudder=0.5, health=0.5, speed=1.923, maxSpeed=2.436 |
| `spreadshot` | 118 | reload=1.5, shudder=0.25, speed=0.7, maxSpeed=0.7, spray=0.25 |
| `triplet` | 125 | reload=1.2, recoil=2/3, shudder=0.9, health=0.85, damage=0.85, pen=0.9, density=1.1, spray=0.9, resist=0.95 |
| `quintuplet` | 136 | reload=1.5, recoil=2/3, shudder=0.9, pen=0.9, density=1.1, spray=0.9, resist=0.95 |
| `turret` | 145 | reload=2, health=0.8, damage=0.6, pen=0.7, density=0.1 |
| `autoTurret` | 152 | reload=0.9, recoil=0.75, shudder=0.5, size=0.8, health=0.9, damage=0.6, pen=1.2, speed=1.1, range=0.8, density=1.3, resist=1.25 |
| `sniper` | 167 | reload=1.35, shudder=0.25, damage=0.8, pen=1.1, speed=1.5, maxSpeed=1.5, density=1.5, spray=0.2, resist=1.15 |
| `crossbow` | 178 | reload=2, health=0.6, damage=0.6, pen=0.8 |
| `assassin` | 184 | reload=1.65, shudder=0.25, health=1.15, pen=1.1, speed=1.18, maxSpeed=1.18, density=3, resist=1.3 |
| `hunter` | 194 | reload=1.5, recoil=0.7, size=0.95, damage=0.9, speed=1.1, maxSpeed=0.8, density=1.2, resist=1.15 |
| `hunterSecondary` | 204 | size=0.9, health=2, damage=0.5, pen=1.5, density=1.2, resist=1.1 |
| `predator` | 212 | reload=1.4, size=0.8, health=1.5, damage=0.9, pen=1.2, speed=0.9, maxSpeed=0.9 |
| `dual` | 221 | reload=2, shudder=0.8, health=1.5, speed=1.3, maxSpeed=1.1, resist=1.25 |
| `rifle` | 229 | reload=0.8, recoil=0.8, shudder=1.5, health=0.8, damage=0.8, pen=0.9, spray=2 |
| `blunderbuss` | 238 | recoil=0.1, shudder=0.5, health=0.4, damage=0.2, pen=0.4, spray=0.5 |
| `railgun` | 246 | reload=4.2, health=3.06, damage=0.81, speed=1.375, maxSpeed=1.375, density=0.7, resist=2.3 |
| `marksman` | 255 | reload=1.75, health=25/3, damage=0.12, pen=2 |
| `machineGun` | 264 | reload=0.5, shudder=1.7, size=0.8, health=0.7, damage=0.7, maxSpeed=0.8, spray=2.5 |
| `diesel` | 273 | reload=0.5, recoil=0.5, size=0.8, range=0.8, spray=2 |
| `minigun` | 280 | reload=1.25, recoil=0.6, size=0.8, health=0.55, damage=0.45, pen=1.25, speed=1.33, density=1.25, spray=0.5, resist=1.1 |
| `streamliner` | 292 | reload=1.1, recoil=0.6, damage=0.65, speed=1.24 |
| `nailgun` | 298 | reload=0.85, recoil=2.5, size=0.8, damage=0.7, density=2 |
| `pelleter` | 305 | reload=1.25, recoil=0.25, shudder=1.5, size=1.1, damage=0.35, pen=1.35, speed=0.9, maxSpeed=0.8, density=1.5, spray=1.5, resist=1.2 |
| `gunner` | 318 | recoil=0.25, shudder=1.5, size=1.2, health=1.35, damage=0.25, pen=1.25, speed=0.8, maxSpeed=0.65, density=1.5, spray=1.5, resist=1.2 |
| `machineGunner` | 331 | reload=2/3, recoil=0.8, shudder=2, damage=0.75, speed=1.2, maxSpeed=0.8, spray=2.5 |
| `blaster` | 340 | recoil=1.2, shudder=1.25, size=1.1, health=1.5, pen=0.6, speed=0.8, maxSpeed=0.33, range=0.6, density=0.5, spray=1.5, resist=0.8 |
| `flamethrower` | 353 | reload=1.75, recoil=4/3, shudder=2, size=0.25, health=10, damage=0.2, pen=4, speed=2, maxSpeed=0, range=3, density=0.25 |
| `gatlingGun` | 366 | reload=1.25, recoil=4/3, shudder=0.8, health=0.8, pen=1.1, speed=1.25, maxSpeed=1.25, range=1.1, density=1.25, spray=0.5, resist=1.1 |
| `atomizer` | 379 | reload=0.3, recoil=0.8, size=0.5, damage=0.75, speed=1.2, maxSpeed=0.8, spray=2.25 |
| `spam` | 388 | reload=1.1, size=1.05, damage=1.1, speed=0.9, maxSpeed=0.7, resist=1.05 |
| `gunnerDominator` | 396 | reload=1.1, recoil=0, shudder=1.1, size=0.5, health=0.5, damage=0.5, speed=1.1, density=0.9, spray=1.2, resist=0.8 |
| `flankGuard` | 410 | recoil=1.2, health=1.02, damage=0.81, pen=0.9, maxSpeed=0.85, density=1.2 |
| `cyclone` | 418 | health=1.3, damage=1.3, pen=1.1, speed=1.5, maxSpeed=1.15 |
| `triAngle` | 425 | recoil=0.9, health=0.9, speed=0.8, maxSpeed=0.8, range=0.6 |
| `triAngleFront` | 432 | recoil=0.2, speed=1.3, maxSpeed=1.1, range=1.5 |
| `thruster` | 438 | recoil=1.5, shudder=2, health=0.5, damage=0.5, pen=0.7, spray=0.5, resist=0.7 |
| `overseer` | 449 | reload=1.25, size=0.85, health=0.7, damage=0.8, maxSpeed=0.9, density=2 |
| `overdrive` | 457 | reload=2.5, health=0.8, damage=0.8, pen=0.8, speed=0.9, maxSpeed=0.9, range=0.9, spray=1.2 |
| `commander` | 467 | reload=1.5, health=0.4, damage=0.7 |
| `baseProtector` | 472 | reload=0.7, recoil=0.000001, size=1.5, health=100, speed=2.3, maxSpeed=1.1, range=0.5, density=5, resist=10 |
| `battleship` | 483 | health=1.25, damage=1.15, maxSpeed=0.85, resist=1.1 |
| `carrier` | 489 | reload=1.5, damage=0.8, speed=1.3, maxSpeed=1.2, range=1.2 |
| `bee` | 496 | reload=1.3, size=1.4, damage=1.5, pen=0.5, speed=1.5, maxSpeed=1.5, density=0.25 |
| `dustStorm` | 505 | reload=1/3, size=1.35, damage=1/3, speed=0.75, maxSpeed=0.75 |
| `sunchip` | 512 | reload=4, size=1.4, health=0.5, damage=0.4, pen=0.6, density=0.8 |
| `maleficitor` | 520 | reload=0.25, size=1.05, health=1.15, damage=1.15, pen=1.15, speed=0.8, maxSpeed=0.8, density=1.15 |
| `summoner` | 530 | reload=0.3, size=1.125, health=0.5, damage=0.345, pen=0.4, density=0.8 |
| `minionGun` | 538 | recoil=0, shudder=2, health=0.4, damage=0.4, pen=1.2, range=0.75, spray=2 |
| `honcho` | 547 | reload=5/3, size=1.5, health=1.5, speed=2/3 |
| `bigCheese` | 553 | size=4/3, speed=2/3 |
| `mothership` | 559 | reload=1.25, pen=1.1, speed=0.775, maxSpeed=0.8, range=15, resist=1.15 |
| `satellite` | 567 | reload=3, size=0.8, damage=1.875 |
| `spawner` | 574 | reload=1.5, maxSpeed=1.25 |
| `productionist` | 578 | reload=7/6, recoil=0.25, shudder=0.5, speed=4/3, range=1.5, spray=50 |
| `pounder` | 588 | reload=2, recoil=1.6, damage=2, speed=0.85, maxSpeed=0.8, density=1.5, resist=1.15 |
| `destroyer` | 597 | reload=2, recoil=1.8, shudder=0.5, health=2, damage=0.9, pen=1.2, speed=0.5, maxSpeed=0.6, density=2, resist=3 |
| `annihilator` | 609 | reload=1, recoil=1.35, damage=0.86 |
| `hive` | 614 | reload=1.5, recoil=0.8, size=0.8, health=0.7, damage=0.3, maxSpeed=0.6 |
| `artillery` | 622 | reload=1.2, recoil=0.7, size=0.9, speed=1.15, maxSpeed=1.1, density=1.5 |
| `mortar` | 630 | reload=1.2, health=1.1, speed=0.8, maxSpeed=0.8 |
| `shotgun` | 636 | reload=8, recoil=0.4, size=1.5, damage=0.4, pen=0.8, speed=1.8, maxSpeed=0.6, density=1.2, spray=1.2 |
| `destroyerDominator` | 647 | reload=6.5, recoil=0, size=0.975, health=5, damage=5, pen=5, speed=0.575, maxSpeed=0.475, spray=0.5 |
| `launcher` | 660 | reload=1.5, recoil=1.5, shudder=0.1, size=0.72, health=1.05, damage=0.925, speed=0.9, maxSpeed=1.2, range=1.1, resist=1.5 |
| `skimmer` | 672 | recoil=0.8, shudder=0.8, size=0.9, health=1.35, damage=0.8, pen=2, speed=0.85, maxSpeed=0.85, resist=1.1 |
| `snake` | 683 | reload=0.4, shudder=4, health=1.5, damage=0.9, pen=1.2, speed=0.1, maxSpeed=0.35, density=3, spray=6, resist=0.5 |
| `snakeskin` | 695 | reload=0.6, shudder=2, health=0.5, damage=0.5, speed=2, maxSpeed=0.2, range=0.4, spray=5 |
| `sidewinder` | 705 | reload=1.5, recoil=2, health=1.5, damage=0.9, speed=0.15, maxSpeed=0.5 |
| `rocketeer` | 713 | reload=1.4, shudder=0.9, size=2, health=1.5, damage=1.4, pen=1.4, speed=0.3, range=1.2, resist=1.4 |
| `missileTrail` | 724 | reload=0.6, recoil=0.25, shudder=2, damage=0.9, pen=0.7, speed=0.4, range=0.5 |
| `rocketeerMissileTrail` | 733 | reload=0.5, recoil=7, shudder=1.5, size=0.8, health=0.8, damage=0.7, speed=0.9, maxSpeed=0.8, spray=5 |
| `pen` | 746 | recoil=0.75, health=1.02, damage=0.81, pen=0.9, maxSpeed=0.85, density=1.2 |
| `megaTrap` | 754 | reload=2, recoil=2, size=1.2, damage=2 |
| `setTrap` | 760 | reload=1.1, recoil=2, shudder=0.1, size=1.5, health=2, pen=1.25, speed=2.2, maxSpeed=2.15, range=1.25, resist=1.25 |
| `construct` | 772 | reload=1.3, size=0.9, maxSpeed=1.1 |
| `boomerang` | 777 | reload=0.8, health=0.5, damage=0.5, speed=0.75, maxSpeed=0.75, range=4/3 |
| `nestKeeper` | 785 | reload=3, size=0.75, health=1.05, damage=1.05, pen=1.1, speed=0.5, maxSpeed=0.5, range=0.5, density=1.1 |
| `hexaTrapper` | 796 | reload=1.3, shudder=1.25, speed=0.8, range=0.5 |
| `trapperDominator` | 802 | reload=1.46, recoil=0, shudder=0.25, health=1.25, damage=1.45, pen=1.6, speed=0.5, maxSpeed=2, range=1.1, spray=0.5 |
| `barricade` | 814 | reload=0.75, damage=0.79, range=0.5 |
| `weak` | 821 | reload=2, health=0.6, damage=0.6, pen=0.8, speed=0.5, maxSpeed=0.7, range=0.25, density=0.3 |
| `power` | 831 | shudder=0.6, size=1.2, pen=1.25, speed=2, maxSpeed=1.7, density=2, spray=0.5, resist=1.5 |
| `fake` | 841 | size=0.00001, health=0.0001, speed=0, maxSpeed=0, shudder=0, spray=0, recoil=0, range=0 |
| `op` | 851 | reload=0.5, recoil=1.3, health=4, damage=4, pen=4, speed=3, maxSpeed=2, density=5, spray=2 |
| `healer` | 862 | damage=-1, speed=0.5, maxSpeed=0.5, recoil=0.5 |
| `lowPower` | 868 | shudder=2, health=0.5, damage=0.5, pen=0.7, spray=0.5, resist=0.7 |
| `aura` | 876 | reload=0.001, recoil=0.001, shudder=0.001, size=6, speed=0.001, maxSpeed=0.001, spray=0.001 |
| `noSpread` | 885 | shudder=0, spray=0 |
| `worstTank` | 891 | reload=15, damage=0.01, health=0.01, pen=0.01 |
| `bigBalls` | 897 | reload=4, damage=4, health=2, speed=0.85, maxSpeed=0.85, size=2.5 |
| `machineShot` | 905 | reload=0.3, recoil=0.8, shudder=0.4, health=0.7, damage=0.7, speed=4.5, maxSpeed=5.9, spray=19 |

Note: several presets use runtime-computed fraction literals rather than decimals —
`2/3` (`triplet`/`quintuplet`/`machineGunner`/`bigCheese` `speed`), `4/3`
(`flamethrower`/`gatlingGun` `recoil`, `boomerang` `range`), `5/3`/`7/6` (`honcho`,
`productionist` `reload`), `1/3` (`dustStorm`), `25/3` (`marksman` `health`). These are
plain `float64`-equivalent constants in Go; there is no precision concern, just don't
hand-round them when transcribing (e.g. `productionist.reload` is exactly `7/6 =
1.1666666666666667`, not `1.17`). `gen/config.json` carries the full-precision computed
value for every field of every preset, generated directly from `gunvals.js` rather than
retyped by hand.

**`negative` values are real, not typos.** `healer.damage = -1` (`gunvals.js:863`) is a
literal negative multiplier — combined multiplicatively with a base `damage`, this is how
the healer tank's "bullets" heal instead of harm. Do not clamp gunvals fields to `>= 0` in
the Go port.

## 7. Environment variables (.env / dotenv.js)

**Zero `config.js` keys are overridable by environment variable.** Nothing in
`js-src/server` reads any `config.js` key from `process.env`. This is worth stating
explicitly because "env overrides a config default" is such a common pattern elsewhere
that it is easy to assume it here — it does not exist in this codebase.

What `.env` actually is: `js-src/server/.env` (`SHINY`, `YOUTUBER`, `BETA_TESTER`,
`DEVELOPER`, `API_KEY` — `.env:1-5`) supplies five shared-secret tokens for a completely
separate subsystem: player permission levels and an inter-server API key. It is loaded
once, in the main process, before any config or game code runs:

1. `server.js:16-19` reads `server/.env` as text and parses it with the server's own
   hand-rolled parser, `lib/dotenv.js`, **not** a standard `dotenv` package (this project
   has no npm dependency for it — `package.json` lists only `ws`).
2. `server.js:21-24` copies every parsed key onto `process.env`.
3. Each worker thread (`serverLoader.js`, spawned via `new Worker(...)` at
   `server.js:238-247`) inherits a copy of `process.env` automatically — Node's default
   `worker_threads` behavior — so the `.env` file is read and parsed exactly **once**,
   by the main process, never per-worker.

**The parser's exact semantics** (`lib/dotenv.js:12-17`), since a Go port reaching for a
standard `.env` library will not reproduce these automatically — see §10 for why this
matters:
- Splits on `/\r?\n/g` (handles both LF and CRLF; the shipped `.env` uses CRLF).
- Skips a line if it has no `=`, or if its *trimmed* form starts with `#` — an inline
  trailing comment (`KEY=value # comment`) is **not** stripped; `# comment` becomes part
  of the value.
- `key` = everything before the first `=`; `value` = everything after it, verbatim (no
  trimming, no quote-stripping, no escape sequences).
- `(key && value) ? [key, value] : null` — **an empty-string value is dropped entirely**,
  indistinguishable from the line not existing. There is no way to set an env var to `""`
  via this file format.

**Consumers, all via `process.env.KEY`, never through `config.js`:**

| Env var | Consumed at | Purpose |
|---|---|---|
| `BETA_TESTER` | `game/permissions.js:11` | Socket "key" unlocking permission level 1 (`menu_betaTester` class). |
| `SHINY` | `game/permissions.js:18` | Permission level 2 (`menu_shinyMember`). |
| `YOUTUBER` | `game/permissions.js:25` | Permission level 2 (`menu_youtuber`). |
| `DEVELOPER` | `game/permissions.js:32` (socket key, permission level 3 / `administrator: true`); also `server.js:135` (query-string token gating the `/api/getAddonAuthors` HTTP endpoint) | Dual-purpose: an in-game admin unlock code *and* a separate HTTP auth token — the same secret value gates two different surfaces. |
| `API_KEY` | `server.js:145`, `game.js:193` (gate on the `/api/sendPlayer` HTTP endpoint, both the shared web server and each per-worker HTTP server check it); `game/network/sockets.js:2026` (sent as a query parameter when *this* server calls another server's `/api/sendPlayer` during server-travel) | Shared secret authenticating server-to-server player handoff. Every server that should be able to send/receive travelling players must have the same `API_KEY`. |

`game/network/sockets.js:8-21` builds a `permissionsDict` keyed by these token strings
once, in the `socketManager` constructor (`require("../permissions.js")` is evaluated
there), filtering `entry.key != null` (`sockets.js:20`) — so a missing/undefined token is
correctly skipped rather than becoming a `"undefined"`-keyed footgun. This lookup is
**read-once per server-worker boot**; changing `.env` requires a full restart.

**Precedence:** there is none to speak of — each of the five keys is independent and
none can override another. If `.env` defines the same key twice, `Object.fromEntries`
(`lib/dotenv.js:12`) keeps the **last** occurrence, standard JS object-literal semantics;
this does not occur in the shipped file.

## 8. Read-once vs. re-read: the standout cases

Every key's read pattern is tagged in its table above. The cross-cutting cases most
likely to bite a Go port that assumes immutability:

- **`game_speed` vs. `run_speed` diverge in how live-mutable they are, and this is not
  obvious from config.js alone.** Both are cached into instance fields at the same two
  call sites (`game.js:127-128,300-301`). But `run_speed` is *also* read directly from
  `Config.run_speed` in hot per-tick physics code (`bulletEntity.js:438`,
  `entity.js:1020`, `collisionFunctions.js:334`), while nothing anywhere reads
  `Config.game_speed` directly outside those two cache-assignment lines. A hypothetical
  live edit to `Config.run_speed` would partially take effect (in the three direct-read
  sites) and partially not (everywhere using the cached `gameManager.runSpeed`, e.g.
  `loaders/global.js:348,352,355,358,365,383,393,404`) — a real, exploitable
  inconsistency in the JS. A Go port should decide once whether `RunSpeed`/`GameSpeed`
  are immutable-after-boot (simplest, and what the *cached* reads already assume) or
  genuinely live (matching the *direct* reads) — it cannot faithfully do both without
  choosing which inconsistency to keep.
- **`regenerate_tick` and `room_setup`/gamemode-derived keys are "boot" only for the
  *first* server start.** `game.js:282` guards the entire gamemode-config merge (which
  installs `mode`, `teams`, `siege`, `tag`, `room_setup`, etc.) with `if (!softStart)`.
  A "soft restart" (`game.js:663`, fired from `onEnd()` at the close of a round) skips
  that merge entirely — so those values persist from the *original* boot across any
  number of round-resets. Only a full process restart re-derives them.
- **`Config.map_tile_width`/`map_tile_height` are the one pair of `config.js` defaults
  that are designed to be mutated live**, via getter/setters on `room` (`game.js:472-481`)
  — this is not incidental, it backs the in-game "resize arena" admin command
  (`chatCommands.js:96-102`).
- **Definitions capture `Config` values at load time, and reload on live "reload
  definitions", not on every read.** Anything baked into a `Class.xxx` object literal at
  module scope (e.g. `Config.spawn_class` in `lib/definitions/groups/generics.js:130`)
  only reflects the *current* `Config` value at the moment `lib/definitions/**` was last
  `require`'d — which is boot, or an admin's live "reload definitions" chat command
  (`chatCommands.js:245-246`, which clears `require.cache` for everything under
  `definitions` and re-requires it). A Go port need not replicate that hot-reload debug
  feature; if it doesn't, everything definitions-captured is simply boot-only.

## 9. Globals installed by loaders/global.js

`loaders/global.js` has no `module.exports`; it works entirely by assigning to Node's
implicit `global` object. There are exactly **63 top-level `global.X = ...`
assignments** (verified: `grep -c "^global\."` against the file, and independently by
reading it end-to-end); nothing else in the file assigns to `global` indirectly, and
nothing in `js-src` mutates any of these 63 through `global[dynamicKey]`. Since
`docs/architecture.md:165-167` already commits to "no globals, each becomes an explicit
field or parameter," this table exists to enumerate exactly what each one is and who
would need it injected.

Consumer counts below come from a whole-word search across `js-src/server/**`,
excluding the definition line itself; "pervasive" means the search returned more files
than are useful to enumerate here.

### Core references and state

| Global | What it is | Installed at | Consumers |
|---|---|---|---|
| `Events` | A Node `EventEmitter` used for cross-module signals (`'chatMessage'`, `'spawn'`). | `global.js:4` | `game/addons/basicChatModeration.js:9`, `chatCommands.js:357-358`, `entity.js:122`, `sockets.js:655`, `lib/definitions/combined.js:110` |
| `Config` | The mutable config bag described in §1-2. | `global.js:5` | Pervasive — 375 references across 53 files |
| `ran` | Seeded RNG helper module (`lib/random.js`). | `global.js:7` | Pervasive — 90 references across 23 files |
| `util` | Shared utility functions (`lib/util.js`). | `global.js:8` | Pervasive — 225 references across 32 files |
| `protocol` | The `fasttalk` binary wire-protocol codec (`lib/fasttalk.js`). | `global.js:9` | `sockets.js:189,2065,2072,2107` |
| `mazeGenerator` | Procedural maze generator module (`miscFiles/mazeGenerator.js`). | `global.js:10` | `game/gamemodes/scripts/labyrinth.js:10-11`, `maze.js:10-11`, `siege.js:311-312` |
| `grid` | A `HashGrid` spatial index, cell size 7 (see `docs/found-bugs.md` #1 for a known defect in `HashGrid` itself). | `global.js:11` | `game/index.js:212,255,258`, `game.js:652`, `keyCommands.js:286,315` |
| `cannotRespawn` | Boolean flag, true while respawning is globally suppressed (e.g. mid-siege). | `global.js:12` | `game/gamemodes/scripts/siege.js:187,191`, `game/index.js:431`, `sockets.js:306`, `game.js:352` |
| `mockupData` | Array of pre-built `MockupEntity` snapshots for the client-side tank preview UI. | `global.js:13` | `chatCommands.js:289,302-303`, `editor.js:138,147`, `sockets.js:1427,1439,1606-1628` |
| `mockupMap` | Index → mockup lookup, `{index: arrayPosition}`. | `global.js:14` | `chatCommands.js:290`, `editor.js:139`, `sockets.js:1427,1439`, `miscFiles/mockups.js:89` |
| `entities` | `Map` of every live entity, keyed by id. | `global.js:15` | Pervasive — 97 references across 29 files |
| `targetableEntities` | `Map` subset of `entities` that AI/targeting logic may pick. | `global.js:16` | `bulletEntity.js:541`, `entity.js:581-582,636,1274,1284` |
| `unspawnableTeam` | Array, initialized empty. | `global.js:17` | **None found anywhere else in `js-src/server`** — see the trap in §10. |
| `walls` | Array of active wall entities (used by maze/labyrinth generation). | `global.js:18` | `labyrinth.js:25,27`, `maze.js:25`, `keyCommands.js:791,798` |
| `entitiesToAvoid` | Array of entities AI pathing should route around. | `global.js:19` | `entity.js:1230,1252`, `subFunctions.js:28-29` |
| `servers` | Runtime array of booted server-instance info (host/port/player count). **Not the same data as `Config.servers`** — see the trap in §10. | `global.js:20` | `sockets.js:178-179,2211-2212`, `game.js:256-260`, `server.js:91,172-173,236-237,263,276,293,297,309-310,333-334` |
| `chats` | Per-entity recent chat-message buffer, `{entityId: {messages:[]}}`. | `global.js:21` | `entity.js:1234-1238`, `sockets.js:103-104,670` |
| `travellingPlayers` | Array of players mid-transfer between servers. | `global.js:22` | `sockets.js:1077,1082`, `game.js:207`, `server.js:159` |
| `fps` | Last-measured server tick rate, string, default `"Unknown"`. | `global.js:23` | Written by `game/debug/speedLoop.js:21`; read by `sockets.js:913,958,975,977,1037` |

### Addon bookkeeping

| Global | What it is | Installed at | Consumers |
|---|---|---|---|
| `loadedAddons` | Array of addon filenames loaded this boot. | `global.js:25` | `game/addons/serverTravel.js:74`, `lib/definitions/combined.js:40,112` |
| `addonAuthorInfos` | Array of parsed `addon*.json` author-info files. | `global.js:26` | `lib/definitions/combined.js:102`, `server.js:140` (served from `/api/getAddonAuthors`, gated by `DEVELOPER`, §7) |

### Team constants and helpers

| Global | What it is | Installed at | Consumers |
|---|---|---|---|
| `TEAM_BLUE` … `TEAM_CYAN` | 8 negative-integer team-ID constants, `-1` through `-8`. | `global.js:27-34` | Widely used across gamemode configs/scripts, `keyCommands.js`, room tiles |
| `TEAM_DREADNOUGHTS` | `-10`. | `global.js:35` | **No direct reference found anywhere else** — see the trap in §10 (its value is implicitly relied on by array-index arithmetic, not by name). |
| `TEAM_ROOM` | `-100`, the "no team" / neutral-room sentinel. | `global.js:36` | `dominator.js:53`, `roomSetup/tiles/default.js:9,34`, `entityAddons/dreadnoughts/dreadv1.js:118`, `entityAddons/fireworks/fireworks.js:47`, `miscFiles/controllers.js:454` |
| `TEAM_ENEMIES` | `-101`, the hostile-NPC team sentinel. | `global.js:37` | `dominator.js:41,44,66,88`, `siege.js:166,169`, `game/index.js:400`, `sockets.js:1143` |
| `getSpawnableArea(team, gameManager)` | Picks a random point in the room's spawnable area for `team`. | `global.js:38-42` | `clan_wars.js:46-47`, `game/index.js:400,436,505`, `sockets.js:1143` |
| `teamNames` | 8-entry array, `"BLUE"`…`"CYAN"`. | `global.js:43-52` | `sockets.js:1862,1883` (also indirectly via `getTeamName`, below) |
| `teamColors` | 8-entry array, `"blue"`…`"cyan"`. | `global.js:53-62` | Only used internally by `getTeamColor` (`global.js:65`) |
| `getTeamName(team)` | `[...teamNames, , "DREADNOUGHT"][-team-1] ?? "NEUTRAL"` — **relies on array-index arithmetic matching the `TEAM_*` constants exactly, not on referencing them.** | `global.js:63` | `assault.js:60,86,119`, `dominator.js:64`, `mothership.js:78,95` |
| `getTeamColor(team, fixMode)` | `[...teamColors, , "aqua"][-team-1] ?? 3`, same index-coupling as above. | `global.js:64-68` | Widely used for entity/player color assignment (30 references, 11 files) |
| `isPlayerTeam(team)` | `team < 0 || team > -11` — true for the 8 named colors plus 2 reserved slots. | `global.js:69` | `dominator.js:47` |
| `getWeakestTeam(gameManager)` | Picks the team with fewest players/bots, weighted by `Config.team_weights`. | `global.js:70-110` | `mothership.js:81`, `game/index.js:432`, `sockets.js:1136` |
| `getRandomTeam()` | `-floor(random()*3000)+1` — a large negative pseudo-team ID for ungrouped enemies. | `global.js:111` | `clan_wars.js:59`, `sockets.js:1206,1212` |

### Class/definition registry

| Global | What it is | Installed at | Consumers |
|---|---|---|---|
| `Class` | The registry every `Class.xxx = {...}` definition writes into; the entity-definition system's root object. | `global.js:113` | Pervasive — 1,743 references across 43 files |
| `tileClass` | Same idea, for room tiles. | `global.js:114` | 63 references across 32 files |
| `classMap` | `Map<ordinal, className>` — see `docs/architecture.md:131-154` on why these ordinals are a wire-format contract. | `global.js:115` | `chatCommands.js:235`, `editor.js:90,100`, `sockets.js:1422`, `lib/definitions/combined.js:47` |
| `definitionsWaiter` | Boolean flag, initialized `false`. | `global.js:116` | **None found anywhere else in `js-src/server`** — same evidence pattern as `unspawnableTeam`/`TEAM_DREADNOUGHTS` (whole-word search, zero hits outside the declaration line). |
| `ensureIsClass(str)` | Resolves a definition name (or passes through an object) against `Class`, throwing if not found. | `global.js:118-127` | 49 references across 15 files |
| `ensureIsManager(str)` | Throws if passed `undefined`; a guard used only inside `global.js` itself (`getSpawnableArea`, `global.js:39`). | `global.js:129-135` | No external callers found |
| `tickIndex` | Monotonically increasing tick counter. | `global.js:137` | Only referenced inside `global.js` (`syncedDelaysLoop`, `setSyncedTimeout`) |
| `tickEvents` | `EventEmitter` used to schedule "in N ticks" callbacks. | `global.js:138` | Same — internal to `global.js` |
| `syncedDelaysLoop()` | Emits the current tick index and increments it. | `global.js:139` | Called from `game/index.js:520` |
| `setSyncedTimeout(callback, ticks, ...args)` | Schedules `callback` to run `ticks` ticks from now. | `global.js:140` | Called from `game/index.js:395` |

### Per-tick entity lifecycle

| Global | What it is | Installed at | Consumers |
|---|---|---|---|
| `bringToLife(my)` | The core per-entity per-tick update: size animation, alpha/invisibility, AI-controller polling, upgrade-pending handling, gun/turret ticking. | `global.js:142-236` | Called as `.life()` from `bulletEntity.js:89`, `entity.js:125`, `turretEntity.js:92` |
| `runMove(my, now)` | Applies one of 6 motion types (`grow`, `glide`, `motor`, `swarm`, `chase`, `drift`, `withMaster`) to acceleration. | `global.js:237-325` | `bulletEntity.js:351`, `entity.js:956` |
| `runFace(my)` | Applies one of ~13 facing types (`spin`, `withTarget`, `bound`, …) to heading. | `global.js:326-406` | `bulletEntity.js:352`, `entity.js:958`, `turretEntity.js:264` |

### Upgrade-tree construction

| Global | What it is | Installed at | Consumers |
|---|---|---|---|
| `defineSplit(defs, branch, set, my, emitEvent)` | Applies one branch of a split-upgrade definition (BODY multipliers, GUNS, TURRETS, PROPS, upgrade-tier bookkeeping). | `global.js:407-524` | `entity.js:574` |
| `handleBatchUpgradeSplit(my)` | Recursively expands all combinations of a "batch upgrade" (pick-N-of-M) into concrete upgrade options. | `global.js:526-571` | `entity.js:576`, `miscFiles/mockupEntity.js:330` |

### Visibility, tiles, and misc

| Global | What it is | Installed at | Consumers |
|---|---|---|---|
| `checkIfInView(boolean, addToNearby, clients, my)` | Tests whether `my` is inside any connected client's view, updating `onRender`/`nearby`. | `global.js:573-584` | `bulletEntity.js:487`, `entity.js:799` |
| `Tile` | Class wrapping a room-tile definition (`NAME`, `IMAGE`, `COLOR`, `DATA`, `INIT`, `TICK`). | `global.js:586-609` | 51 references across 12 files, all `roomSetup/tiles/*.js` |
| `flatten(output, definition)` | Recursively merges a definition's `PARENT` chain into `output`. | `global.js:611-629` | Calls itself recursively (`global.js:616,618`), but **no external entry-point call was found anywhere in `server/`** — see the note in §10. `gun.js:147` only mentions "flatten" in a comment; `sockets.js:1289,1358,1612` is an unrelated same-named method. |
| `convertExportsToClass(exp)` | Copies every key of a plain `module.exports` object onto `Class`, marking each `.Converted = true`. | `global.js:631-638` | `lib/definitions/groups/testing.js:1645` |
| `makeHitbox(wall)` | Computes a diamond-shaped 4-corner hitbox for a wall entity from its `size`/`angle`. | `global.js:640-666` | `labyrinth.js:24`, `maze.js:24`, `siege.js:322`, `roomSetup/tiles/default.js:38` |
| `wallTypes` | Array of 11 `{color, label, alpha, class}` wall-style descriptors. | `global.js:668-680` | `keyCommands.js:350,352` |
| `becomeBulletChildren(socket, player, exit, newgui)` | Transfers control to a surviving "bullet child" when a tank's main body dies (e.g. Necromancer drones). | `global.js:682-716` | `sockets.js:1531` |
| `loadAllMockups(logText)` | Builds a `MockupEntity` for every registered `Class`. | `global.js:718-725` | `chatCommands.js:293`, `editor.js:141`, `game.js:315`, `server.js:39` |

## 10. TRAPS

### Type traps (the two the task specifically asked about)

**`Config.teams` is sometimes a string, never coerced.** A live admin chat command does
`Config.teams = args[1]` where `args[1]` is raw, unparsed chat-command text
(`game/addons/chatCommands.js:115`; the companion `"0"` branch instead sets `Config.teams
= null`, `chatCommands.js:111`). Elsewhere, `Config.teams` is set as a real number from a
server's `properties` (e.g. `config.js:153`, `teams: 2`) or a gamemode config file (e.g.
`game/gamemodes/config/tdm.js:3`, `Config.teams ?? Math.floor(...)`). Consumers rely on
JS's implicit string→number coercion in arithmetic contexts — `Array(Config.teams).fill(0)`
(`game/gamemodes/scripts/tag.js:14,15`), `for (let i = -Config.teams; i < 0; i++)`
(`loaders/global.js:72`) — which silently works in JS but will not in Go. A Go port needs
an explicit parse (and a tri-state: unset/`null`/number) at the point this value is
accepted, not a plain `int` field.

**`Config.groups` is used as both a number and a boolean.** Set to a party size by three
gamemode configs — `game/gamemodes/config/duos.js:2` (`groups: 2`), `squads.js:2`
(`groups: 4`), `trios.js:2` (`groups: 3`) — and consumed numerically at
`game/gamemodes/scripts/groups.js:52` (`new Group(Config.groups || 0)`). But it is *also*
read purely for truthiness, ignoring the magnitude, throughout `sockets.js` (e.g.
`Config.groups || (Config.mode == 'ffa' || ...)` at `sockets.js:1231,1393,1407,1744,1831,
1846,1968`) to decide team-color/leaderboard UI. A Go port needs both an "is this a
groups-based gamemode" bool and a separate "how many per group" int — collapsing to one
field loses information one of the two call sites needs.

### The zero-as-disable convention

Four `config.js` keys use `0` as a sentinel "feature disabled" value rather than a literal
zero duration/count, per their own inline comments: `respawn_delay` (`config.js:239`,
"Set to 0 to disable"), `upgrade_delay` (`config.js:241`, same), `mothership_time_limit`
(`config.js:251`, same), `bot_cap` (`config.js:269`, "Set to 0 to disable bots"). A Go
port representing these as plain `time.Duration`/`int` must preserve the `0 == off`
check at each consumer site (e.g. `sockets.js:570`, `if (Config.mothership_time_limit !=
0)`) rather than treating `0` as a legitimate zero-length delay.

### Config mutability

`Config` is a mutable, shared, ever-growing bag, not a config snapshot — see §2 for the
full five-layer precedence chain. Three specific consequences worth calling out on their
own:

- **Keys referenced in the 6 files read for this task are not always declared in
  `config.js`.** `presets.js:107` reads `Config.retrograde`, which does not exist
  anywhere in `config.js` — it is installed only when the `retrograde` gamemode is
  selected (`game/gamemodes/config/retrograde.js:2`, `retrograde: true`). Grepping
  `config.js` for a key referenced elsewhere in the codebase and finding nothing does not
  mean the key is unused or an error; check `game/gamemodes/config/*.js` too (44 files,
  not individually cataloged in this document — see §1).
- **`Config.servers` and `global.servers` are two unrelated things with a confusable
  name.** `Config.servers` (`config.js:40-212`) is the static, authored list of
  server definitions. `global.servers` (`loaders/global.js:20`) is a separate, empty-at-
  boot array populated at runtime by `server.js` (`server.js:236-237,263,276`) with live
  status info (player counts, `gameManager` handles) for each spawned worker, in the same
  order but never the same objects. `server.js:310` iterates `Config.servers` to decide
  *what* to spawn; `sockets.js:178-179` and others iterate `global.servers` to find an
  *already-running* server. Naming these distinctly in Go (e.g. `Config.Servers` vs.
  `Registry.RunningServers`) avoids reproducing the confusion.
- **`Config.OURBREAK_FUNCTIONS`** (`game/gamemodes/scripts/outbreak.js:4`, read at
  `game/index.js:220`) is a typo for "OUTBREAK" — but it is a *consistent* typo (both the
  write and the only read use the same misspelling), so it is not a functional bug. Do
  not "fix" the spelling when porting unless you update both sites; there is only one
  read site, so this is low-risk either way, but it will look wrong in a code review that
  doesn't know this.

### Dead and inert code that looks live

- **The `scenexe.js` entity addon never runs.** `lib/definitions/entityAddons/scenexe.js:6`
  is a bare top-level `return` (`return //console.log("[scenexe.js]: Addon disabled.");`).
  Addons are loaded via plain `require()` (`lib/definitions/combined.js:107`), so Node's
  module-wrapper function returns immediately at that line, making every line after it —
  including its own local gunvals-style preset table, all its `Class.scenexeXxx`
  definitions, and its two `Config` overrides at lines 143-144
  (`Config.spawn_class = ["scenexeBase","scenexeNode"]`, `Config.level_cap_cheat = 45`) —
  unreachable. The preceding comment (`scenexe.js:5`, *"This addon is enabled by default.
  If you want to enable it, simply make the line below run."*) reads as if it should be
  active; the code says otherwise. If a Go port (or a future JS change) "fixes" this by
  deleting the `return`, `spawn_class`/`level_cap_cheat` would change server-wide and a
  whole extra tank set would register — a behavior change, not a bugfix, per
  `docs/architecture.md` rule 4.
- **`groups/dev.js`'s retrograde daily-tank override is similarly inert, for a plainer
  reason.** `lib/definitions/groups/dev.js:494-499` only runs `Config.daily_tank = {...}`
  if `enable_retrograde_menu` is true, and that local `const` is hardcoded `false` at
  `dev.js:11`. Same effect (a `Config` override that never fires in the shipped source),
  simpler cause.
- **`unspawnableTeam` (`loaders/global.js:17`) and `TEAM_DREADNOUGHTS`
  (`loaders/global.js:35`) have no reader anywhere in `js-src/server`** — checked via a
  whole-word search across every `.js` file under `server/`, both returning zero hits
  outside their own declaration line. Candidates to simply not port, but flagged rather
  than dropped silently in case a consumer exists in a part of the tree outside this
  task's search (client code under `js-src/public` was not searched, since the port
  target is server-only).
- **`statnames` (from `constants.js`) gains a key at runtime that isn't in `constants.js`
  itself.** `lib/definitions/groups/testing.js:87` does `statnames.lancer = {...}`,
  mutating the same shared object every other consumer reads (Node caches `require()`
  results, so `constants.js`'s `statnames` is one object, process-wide). This file is
  loaded unconditionally at boot (it is a plain file in `lib/definitions/groups/`, loaded
  the same way as every other group), so this is not dead code — `constants.js` read in
  isolation is missing one entry that exists at runtime. §4's table lists only what's in
  `constants.js` itself; add `lancer` if replicating runtime state exactly.

### Duplication and precedence gotchas

- **`gunvals.js`'s `blank` identity preset is duplicated verbatim, not referenced.**
  `lib/definitions/facilitators.js:20-34`, inside `combineStats()`, re-declares the same
  13-field all-`1` object that `gunvals.js:3-17` already exports as `blank`, instead of
  starting from `g.blank`. The two currently match exactly (verified by direct
  comparison), but they are two independent literals — editing one does not update the
  other. A Go port should have exactly one source for this identity value.
- **`defineLevelSkillPoints`'s odd-level check relies on an operator-precedence
  coincidence.** `config.js:257`: `if (level <= 45 && level & 1 === 1) return 1;`. Because
  `===` binds tighter than `&` in JS, this parses as `level & (1 === 1)`, i.e. `level &
  true` → `level & 1` — which happens to produce the same truthiness as the clearly-
  intended `(level & 1) === 1` for every integer `level` (verified by evaluating both
  forms for levels 40-46). Not a behavioral bug, but transcribe the *intent* — "is level
  odd" (`level % 2 == 1` in Go) — not the literal parse tree, which relies on a JS-only
  quirk with no Go equivalent.
- **`flatten` is the name of two unrelated things, and the global one looks unreachable.**
  `global.js:611-629`'s `flatten` (definition `PARENT`-chain merging) and
  `socketManager.prototype.flatten` (`sockets.js:1289`, turret-array flattening for the
  wire protocol) share a name but are never the same function — `sockets.js:1358,1612`
  call `this.flatten(...)`, the method, not the global. The global `flatten` calls itself
  recursively (`global.js:616,618`) but has **no external entry-point call anywhere in
  `server/`** (checked with a whole-codebase search for any call passing two arguments to
  a bare `flatten`) — either it is dead code, or it is a utility left exposed as a global
  for addon authors to call directly rather than something the core engine invokes itself;
  the source does not say which. Do not merge these two functions into one Go function by
  name-matching, and do not assume the global one is exercised by anything in the base
  game if you choose not to port it.

### Undocumented formulas (UNKNOWN, per the source's own admission)

Three `config.js` values carry their own `// TODO` comments admitting the author didn't
fully document intent. This document gives the verified mechanical formula for each, and
marks the design *rationale* as `UNKNOWN` rather than inventing one:

- **`glass_health_factor`** (`config.js:247`, *"TODO: Figure out how the math behind
  this works."*). Mechanically: `Skill.update()` sets `this.shi = glass_health_factor *
  apply(3/glass_health_factor - 1, curve(shield_stat))` and `this.hlt =
  glass_health_factor * apply(2/glass_health_factor - 1, curve(health_stat))`
  (`game/entities/skills.js:89,91`; `apply(f,x) = x<0 ? 1/(1-x*f) : f*x+1`, `skills.js:21-22`).
  `UNKNOWN:` why this specific parametrization (as opposed to, say, independent shield
  and health scalars) was chosen, or what game-design property it targets. Checked: the
  entire `skills.js` file, and every other reference to `glass_health_factor` in
  `js-src/server` (there are none besides `config.js:247` and `skills.js:89,91`).
- **`soft_max_skill`** (`config.js:249`, *"TODO: Find out what the intention behind the
  implementation of this configuration is."*). Mechanically:
  `Skill.cap(stat, real=false)` returns `round(caps[stat] * soft_max_skill)` instead of
  `caps[stat]` whenever `!real && this.level < Config.skill_cap_soft`
  (`game/entities/skills.js:145-148`). `UNKNOWN:` the intended design purpose (checked
  every reference to both `soft_max_skill` and `skill_cap_soft` in `js-src/server`: only
  `config.js:249,265` and `skills.js:145-146`). Mechanically inert in the shipped
  config, though — see next entry.
- **`skill_cap_soft`** (`config.js:265`, *"TODO: Figure out what this does."*, default
  `0`). Same `Skill.cap()` formula as above. Because the guard is `this.level <
  Config.skill_cap_soft` and no entity level is ever negative, a default of `0` makes
  this condition always false — **the `soft_max_skill` mechanic is inert in the shipped
  config.** Checked every reference to `skill_cap_soft` in `js-src/server` (only the two
  sites above) to confirm nothing else ever sets it above `0`. `UNKNOWN:` whether this is
  intentional (a half-finished feature deliberately shipped off) or an oversight — the
  source gives no indication either way.

### A parser-semantics trap, not a config-value trap

`lib/dotenv.js`'s custom `.env` parser (detailed in §7) does not trim values, does not
strip quotes, does not support inline comments, and silently drops empty-string values.
A Go port that reaches for a standard `.env`-parsing library (which typically does all
four) for parity with "the .env file" will parse the *same file* into *different values*
than the JS server does, for any `.env` that uses those conventions (the shipped file
happens not to, so this has zero effect today, but is a trap the moment someone edits
`.env` assuming standard semantics).

## 11. Methodology and data-provenance notes

- Every `config.js`, `constants.js`, `gunvals.js` and `presets.js` value in this document
  was cross-checked by directly `require()`-ing the real file (via `tools/dump-config.js`,
  and via ad-hoc `node -e` checks during research) rather than transcribed from a static
  read alone — key counts (69 / 6 / 104 / 9) and every gunvals field value in §6's table
  were generated programmatically from the live file, not typed by hand.
- **`docs/manifest.md:129`** lists `lib/definitions/constants.js` at **1,427 lines**;
  the file on disk is **81 lines** (verified with `wc -l`, a full `cat -n` read, and
  `require()`'s own `Object.keys()` count of 6 top-level keys, all cross-consistent with
  each other and with §4 above). This document's counts for `constants.js` are correct as
  of 2026-09-07; treat `manifest.md`'s figure for this one file as stale rather than
  reconciling this document to match it.
- Each worker-thread server gets its **own** `config.js` module instance. Node's
  `require()` cache is per-thread for `worker_threads`, and every game server is spawned
  as its own worker (`serverLoader.js:4`, `require("./loaders/loader.js")`, which
  `require`s `config.js` fresh at `loaders/global.js:5`). So "read once at boot" in this
  document always means once *per server process/worker*, not once for the whole Node
  process — two servers configured in the same `config.js` `servers` array can end up
  with independently-mutated `Config` objects after their respective `properties`/
  gamemode merges, which is the intended behavior (each is a different server), not a bug.
- Every consumer citation in §9 (globals) and the config tables came from a whole-word,
  whole-codebase search restricted to `js-src/server/**`; `js-src/public/**` (the browser
  client, which has its own separate `config.js`/`global.js` and is explicitly out of
  scope per `docs/architecture.md:12`) was not searched, so a global or key that is
  "unused" per this document is unused on the *server* side only.
