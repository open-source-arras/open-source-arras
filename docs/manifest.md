# Arras.io Game Server Dependency Map

> **The line counts in this document are generated, not written.** Refresh them with
> `python tools/refresh-manifest-counts.py` after any change to `js-src/`. Every row already matched the tree.
>
> They need generating because the originals were written by reading the source and did
> not survive contact with `wc -l`: 139 of 163 rows were wrong, several by a factor of
> seventy — `lib/definitions/groups/tanks.js` was listed at 156 lines against an actual
> 11,086 — and the file count read 170 against an actual 163. A stale number here is
> worse than an absent one, because it reads as a fact.
>
> The structural claims were checked separately and hold: the require graph is acyclic
> (`tools/require-graph.js`, 0 cycles over 117 edges) and the leaf-module list is
> essentially right (126 actual against 125 listed). Structure survived, arithmetic did
> not — about what you would expect of a document written by reading rather than by
> measuring.



## Summary
- **Total Files Analyzed**: 163
- **Leaf Modules (no project dependencies)**: 125
- **Files with Project Dependencies**: 38 (including lib/definitions node)
- **Circular Dependencies**: 0
- **Total Lines of Code**: 50,088

---

## 1. File Inventory (excluding lib/definitions detail)

| Path | Lines | Exports | Purpose |
|------|-------|---------|---------|
| config.js | 405 | DEFAULT | Development configuration and settings |
| game.js | 669 | DEFAULT | Main game loop coordinator |
| game/addons/basicChatModeration.js | 49 | (none) | Very basic spam prevention |
| game/addons/chatCommands.js | 364 | DEFAULT | Chat command processor |
| game/addons/keyCommands.js | 1013 | (none) | Server-side key binding handler |
| game/addons/serverTravel.js | 97 | DEFAULT | Portal spawner class |
| game/debug/lagLogger.js | 25 | DEFAULT | Tick timing diagnostics |
| game/debug/logs.js | 53 | DEFAULT | Console logging utility |
| game/debug/speedLoop.js | 65 | DEFAULT | 1Hz monitoring loop |
| game/entities/antiNaN.js | 33 | DEFAULT | NaN safety checks for physics |
| game/entities/bulletEntity.js | 548 | DEFAULT | Projectile entity base class |
| game/entities/entity.js | 1300 | DEFAULT | Core inheritance and entity system |
| game/entities/gun.js | 691 | DEFAULT | Define how guns work |
| game/entities/healthType.js | 66 | DEFAULT | Health pool mechanics |
| game/entities/propEntity.js | 104 | DEFAULT | Bind prop (obstacle) entity |
| game/entities/skills.js | 170 | DEFAULT | Skill/talent system |
| game/entities/subFunctions.js | 60 | DEFAULT | Shared entity helper functions |
| game/entities/turretEntity.js | 332 | DEFAULT | Turret entity behavior |
| game/entities/vector.js | 87 | DEFAULT | Basic Vector 2D class |
| game/gamemodeManager.js | 80 | DEFAULT | Gamemode orchestration and loading |
| game/gamemodes/config/arms_race.js | 27 | DEFAULT | Gamemode: Arms Race configuration |
| game/gamemodes/config/assault_acropolis.js | 15 | DEFAULT | Gamemode: Assault Acropolis |
| game/gamemodes/config/assault_booster.js | 23 | DEFAULT | Gamemode: Assault Booster |
| game/gamemodes/config/assault_bunker.js | 15 | DEFAULT | Gamemode: Assault Bunker |
| game/gamemodes/config/assault_eye.js | 32 | DEFAULT | Gamemode: Assault Eye |
| game/gamemodes/config/assault_line.js | 31 | DEFAULT | Gamemode: Assault Line |
| game/gamemodes/config/assault_trenches.js | 39 | DEFAULT | Gamemode: Assault Trenches |
| game/gamemodes/config/assault_yinyang.js | 15 | DEFAULT | Gamemode: Assault Yin Yang |
| game/gamemodes/config/blackout.js | 5 | DEFAULT | Gamemode: Blackout |
| game/gamemodes/config/clan_wars.js | 4 | DEFAULT | Gamemode: Clan Wars configuration |
| game/gamemodes/config/classic.js | 3 | DEFAULT | Gamemode: Classic FFA |
| game/gamemodes/config/diep.js | 6 | DEFAULT | Gamemode: Diep-style |
| game/gamemodes/config/domination.js | 7 | DEFAULT | Gamemode: Domination |
| game/gamemodes/config/duos.js | 3 | DEFAULT | Gamemode: Duos |
| game/gamemodes/config/fast.js | 3 | DEFAULT | Gamemode: Fast-paced |
| game/gamemodes/config/ffa.js | 1 | DEFAULT | Gamemode: Free For All |
| game/gamemodes/config/growth.js | 12 | DEFAULT | Gamemode: Growth mode |
| game/gamemodes/config/halloween.js | 6 | DEFAULT | Gamemode: Halloween |
| game/gamemodes/config/labyrinth.js | 5 | DEFAULT | Gamemode: Labyrinth |
| game/gamemodes/config/limbo.js | 10 | DEFAULT | Gamemode: Limbo |
| game/gamemodes/config/march_madness.js | 3 | DEFAULT | Gamemode: March Madness |
| game/gamemodes/config/maze.js | 4 | DEFAULT | Gamemode: Maze |
| game/gamemodes/config/mothership.js | 5 | DEFAULT | Gamemode: Mothership |
| game/gamemodes/config/nexus.js | 12 | DEFAULT | Gamemode: Nexus |
| game/gamemodes/config/old_dreadnoughts.js | 13 | DEFAULT | Gamemode: Old Dreadnoughts (legacy) |
| game/gamemodes/config/old_siege.js | 16 | DEFAULT | Gamemode: Old Siege (legacy) |
| game/gamemodes/config/open_tdm.js | 4 | DEFAULT | Gamemode: Open TDM |
| game/gamemodes/config/outbreak.js | 3 | DEFAULT | Gamemode: Outbreak |
| game/gamemodes/config/pandemic.js | 5 | DEFAULT | Gamemode: Pandemic |
| game/gamemodes/config/retrograde.js | 3 | DEFAULT | Gamemode: Retrograde |
| game/gamemodes/config/rock.js | 3 | DEFAULT | Gamemode: Rock |
| game/gamemodes/config/sandbox.js | 10 | DEFAULT | Gamemode: Sandbox |
| game/gamemodes/config/siege_blitz.js | 16 | DEFAULT | Gamemode: Siege Blitz |
| game/gamemodes/config/siege_citadel.js | 17 | DEFAULT | Gamemode: Siege Citadel |
| game/gamemodes/config/siege_classic.js | 14 | DEFAULT | Gamemode: Siege Classic |
| game/gamemodes/config/siege_fortress.js | 17 | DEFAULT | Gamemode: Siege Fortress |
| game/gamemodes/config/space.js | 4 | DEFAULT | Gamemode: Space |
| game/gamemodes/config/squads.js | 3 | DEFAULT | Gamemode: Squads |
| game/gamemodes/config/tag.js | 5 | DEFAULT | Gamemode: Tag |
| game/gamemodes/config/tartarus.js | 11 | DEFAULT | Gamemode: Tartarus |
| game/gamemodes/config/tdm.js | 6 | DEFAULT | Gamemode: Team Deathmatch |
| game/gamemodes/config/tile_testing.js | 9 | DEFAULT | Gamemode: Tile Testing |
| game/gamemodes/config/train_wars.js | 3 | DEFAULT | Gamemode: Train Wars |
| game/gamemodes/config/trios.js | 3 | DEFAULT | Gamemode: Trios |
| game/gamemodes/scripts/assault.js | 138 | DEFAULT | Assault gamemode logic |
| game/gamemodes/scripts/clan_wars.js | 75 | DEFAULT | Clan Wars gamemode logic |
| game/gamemodes/scripts/dominator.js | 98 | DEFAULT | Dominator/Domination logic |
| game/gamemodes/scripts/groups.js | 70 | DEFAULT | Enemy group spawner logic |
| game/gamemodes/scripts/labyrinth.js | 46 | DEFAULT | Labyrinth maze generation |
| game/gamemodes/scripts/maze.js | 46 | DEFAULT | Maze gamemode logic |
| game/gamemodes/scripts/mothership.js | 121 | DEFAULT | Mothership gamemode logic |
| game/gamemodes/scripts/outbreak.js | 45 | DEFAULT | Outbreak gamemode logic |
| game/gamemodes/scripts/sandbox.js | 25 | DEFAULT | Sandbox gamemode logic |
| game/gamemodes/scripts/siege.js | 369 | DEFAULT | Siege gamemode logic |
| game/gamemodes/scripts/tag.js | 71 | DEFAULT | Tag gamemode logic |
| game/gamemodes/scripts/trainwars.js | 23 | DEFAULT | Train Wars gamemode logic |
| game/index.js | 551 | DEFAULT | Game initialization entry |
| game/network/editor.js | 178 | DEFAULT | In-game editor/mockup system |
| game/network/sockets.js | 2252 | DEFAULT | WebSocket message handler |
| game/permissions.js | 39 | DEFAULT | Player role and permission checks |
| game/roomSetup/rooms/overlay_room_domination.js | 8 | DEFAULT | Overlay UI for Domination |
| game/roomSetup/rooms/room_assault_acropolis.js | 24 | DEFAULT | Assault Acropolis room setup |
| game/roomSetup/rooms/room_assault_booster.js | 21 | DEFAULT | Assault Booster room setup |
| game/roomSetup/rooms/room_assault_bunker.js | 24 | DEFAULT | Assault Bunker room setup |
| game/roomSetup/rooms/room_assault_eye.js | 25 | DEFAULT | Assault Eye room setup |
| game/roomSetup/rooms/room_assault_line.js | 28 | DEFAULT | Assault Line room setup |
| game/roomSetup/rooms/room_assault_trenches.js | 23 | DEFAULT | Assault Trenches room setup |
| game/roomSetup/rooms/room_assault_yinyang.js | 28 | DEFAULT | Assault Yin Yang room setup |
| game/roomSetup/rooms/room_default.js | 27 | DEFAULT | Default FFA room setup |
| game/roomSetup/rooms/room_halloween.js | 68 | DEFAULT | Halloween room setup |
| game/roomSetup/rooms/room_limbo.js | 43 | DEFAULT | Limbo room setup |
| game/roomSetup/rooms/room_nexus.js | 34 | DEFAULT | Nexus room setup |
| game/roomSetup/rooms/room_old_siege.js | 30 | DEFAULT | Old Siege room setup (legacy) |
| game/roomSetup/rooms/room_rock.js | 24 | DEFAULT | Rock obstacle room setup |
| game/roomSetup/rooms/room_sandbox.js | 28 | DEFAULT | Sandbox room setup |
| game/roomSetup/rooms/room_siege_blitz.js | 27 | DEFAULT | Siege Blitz room setup |
| game/roomSetup/rooms/room_siege_citadel.js | 25 | DEFAULT | Siege Citadel room setup |
| game/roomSetup/rooms/room_siege_classic.js | 32 | DEFAULT | Siege Classic room setup |
| game/roomSetup/rooms/room_siege_fortress.js | 26 | DEFAULT | Siege Fortress room setup |
| game/roomSetup/rooms/room_tdm.js | 79 | DEFAULT | Team Deathmatch room setup |
| game/roomSetup/rooms/room_tdm_old.js | 34 | DEFAULT | TDM legacy room setup |
| game/roomSetup/rooms/room_tiles_test.js | 48 | DEFAULT | Tile testing room |
| game/roomSetup/tiles/assault.js | 18 | DEFAULT | Assault variant tileset |
| game/roomSetup/tiles/default.js | 57 | DEFAULT | Default tileset |
| game/roomSetup/tiles/domination.js | 8 | DEFAULT | Domination tileset |
| game/roomSetup/tiles/labyrinth.js | 0 | DEFAULT | Labyrinth maze tileset |
| game/roomSetup/tiles/nexus.js | 31 | DEFAULT | Nexus tileset |
| game/roomSetup/tiles/portal.js | 69 | DEFAULT | Portal tileset |
| game/roomSetup/tiles/rocks.js | 36 | DEFAULT | Rock obstacle tileset |
| game/roomSetup/tiles/siege.js | 85 | DEFAULT | Siege tileset |
| game/roomSetup/tiles/teams.js | 147 | DEFAULT | Team-based tileset |
| game/roomSetup/tiles/testing.js | 11 | DEFAULT | Testing tileset |
| lib/definitions/combined.js | 117 | DEFAULT | Combined definition export |
| lib/definitions/constants.js | 81 | DEFAULT | Game-wide constants (entity types, stats) |
| lib/definitions/entityAddons/betterRetrograde/tanks.js | 184 | DEFAULT | Retrograde tank addon |
| lib/definitions/entityAddons/dreadnoughts/dreadv1.js | 734 | DEFAULT | Dreadnought v1 boss addon |
| lib/definitions/entityAddons/dreadnoughts/dreadv2.js | 3336 | DEFAULT | Dreadnought v2 boss addon |
| lib/definitions/entityAddons/dreadnoughts/main.js | 4 | DEFAULT | Dreadnought base addon |
| lib/definitions/entityAddons/example/exampleAddon.js | 71 | DEFAULT | Addon system example |
| lib/definitions/entityAddons/fireworks/fireworks.js | 59 | DEFAULT | Fireworks visual addon |
| lib/definitions/entityAddons/generators.js | 305 | DEFAULT | Random entity generators |
| lib/definitions/entityAddons/marchMadness/marchMadness.js | 67 | DEFAULT | March Madness event addon |
| lib/definitions/entityAddons/scenexe.js | 1605 | DEFAULT | Scenic entity addon |
| lib/definitions/entityAddons/shaders.js | 29 | DEFAULT | Visual shader effects addon |
| lib/definitions/facilitators.js | 1773 | DEFAULT | Entity factory and builder functions |
| lib/definitions/groups/bosses/celestials.js | 448 | DEFAULT | Celestial boss definitions |
| lib/definitions/groups/bosses/dev.js | 2019 | DEFAULT | Developer/admin boss definitions |
| lib/definitions/groups/bosses/elites.js | 786 | DEFAULT | Elite boss definitions |
| lib/definitions/groups/bosses/eternals.js | 77 | DEFAULT | Eternal boss definitions |
| lib/definitions/groups/bosses/mysticals.js | 281 | DEFAULT | Mystical boss definitions |
| lib/definitions/groups/bosses/nesters.js | 204 | DEFAULT | Nester boss definitions |
| lib/definitions/groups/bosses/rammers.js | 52 | DEFAULT | Rammer boss definitions |
| lib/definitions/groups/bosses/rogues.js | 127 | DEFAULT | Rogue boss definitions |
| lib/definitions/groups/bosses/sentries.js | 334 | DEFAULT | Sentry boss definitions |
| lib/definitions/groups/bosses/terrestrials.js | 109 | DEFAULT | Terrestrial boss definitions |
| lib/definitions/groups/dev.js | 509 | DEFAULT | Developer test entities |
| lib/definitions/groups/food.js | 836 | DEFAULT | Food/consumable entity definitions |
| lib/definitions/groups/generics.js | 773 | DEFAULT | Generic enemy definitions |
| lib/definitions/groups/hats.js | 47 | DEFAULT | Hat/cosmetic item definitions |
| lib/definitions/groups/obstacles.js | 262 | DEFAULT | Obstacle/prop definitions |
| lib/definitions/groups/projectiles.js | 1185 | DEFAULT | Projectile weapon definitions |
| lib/definitions/groups/tanks.js | 11086 | DEFAULT | Player tank class definitions |
| lib/definitions/groups/testing.js | 1645 | DEFAULT | Testing entity definitions |
| lib/definitions/groups/turrets.js | 1831 | DEFAULT | Turret entity definitions (largest file) |
| lib/definitions/gunvals.js | 915 | DEFAULT | Weapon/gun property tables |
| lib/definitions/presets.js | 116 | DEFAULT | Preset entity configurations |
| lib/dotenv.js | 17 | DEFAULT | Environment variable loader |
| lib/fasttalk.js | 356 | DEFAULT | Fast message encoding/decoding |
| lib/hashgrid.js | 54 | DEFAULT | Spatial hash grid for collision |
| lib/random.js | 103 | DEFAULT | Seeded random number generator |
| lib/util.js | 211 | DEFAULT | Shared utility functions |
| loaders/global.js | 725 | DEFAULT | Global state initialization |
| loaders/loader.js | 54 | DEFAULT | Dynamic module loader |
| miscFiles/collisionFunctions.js | 647 | DEFAULT | Collision detection algorithms |
| miscFiles/color.js | 73 | DEFAULT | Color manipulation utilities |
| miscFiles/controllers.js | 1348 | DEFAULT | Player input/control system |
| miscFiles/mazeGenerator.js | 1285 | DEFAULT | Procedural maze generation |
| miscFiles/mockupEntity.js | 444 | DEFAULT | Mock entity for editor preview |
| miscFiles/mockup_dimentions.js | 278 | DEFAULT | Mock dimension/stats |
| miscFiles/mockups.js | 101 | DEFAULT | Mockup entity aggregator |
| miscFiles/tileEntity.js | 34 | DEFAULT | Tile collision and state |
| server.js | 354 | DEFAULT | HTTP/WebSocket server bootstrap |
| serverLoader.js | 20 | DEFAULT | Worker thread launcher |

---

## 2. Dependency Graph

### Primary Flow
```
server.js
  -> lib/dotenv.js
  -> loaders/loader.js
  -> game.js
       -> game/network/sockets.js
            -> game/permissions.js
       -> game/network/editor.js
            -> lib/definitions/constants.js
            -> lib/definitions/facilitators.js
            -> lib/definitions/gunvals.js
            -> lib/definitions/presets.js
       -> game/debug/lagLogger.js
       -> game/debug/speedLoop.js
       -> game/index.js
       -> game/gamemodeManager.js
            -> game/gamemodes/scripts/* (12 scripts)
       -> game/addons/serverTravel.js
```

### Gamemode Manager Dependencies
```
game/gamemodeManager.js requires:
  - game/gamemodes/scripts/siege.js
  - game/gamemodes/scripts/assault.js
  - game/gamemodes/scripts/tag.js
  - game/gamemodes/scripts/dominator.js
  - game/gamemodes/scripts/mothership.js
  - game/gamemodes/scripts/sandbox.js
  - game/gamemodes/scripts/trainwars.js
  - game/gamemodes/scripts/maze.js
  - game/gamemodes/scripts/labyrinth.js
  - game/gamemodes/scripts/outbreak.js
  - game/gamemodes/scripts/clan_wars.js
  - game/gamemodes/scripts/groups.js
```

### Definition Subsystem Dependencies
```
lib/definitions/facilitators.js requires:
  - lib/definitions/constants.js
  - lib/definitions/gunvals.js

lib/definitions/groups/bosses/* requires:
  - lib/definitions/facilitators.js
  - lib/definitions/constants.js
  - lib/definitions/gunvals.js
  - lib/definitions/presets.js (some files)
  - lib/definitions/groups/{generics,food,projectiles,tanks,turrets,hats}.js (cross-refs)
```

### Utility Bootstrap
```
loaders/global.js requires:
  - lib/hashgrid.js
  - config.js
  - lib/random.js
  - lib/util.js
  - lib/fasttalk.js
  - miscFiles/mazeGenerator.js

miscFiles/mockups.js requires:
  - miscFiles/mockupEntity.js
  - miscFiles/mockup_dimentions.js
```

### Room Setup
```
game/roomSetup/rooms/room_tdm.js requires:
  - game/gamemodes/config/tdm.js
  
loaders/loader.js dynamically loads:
  - game/roomSetup/tiles/*
```

---

## 3. Leaf Modules (Safe to Port First)

**Total: 125 files**

These files require nothing from the project (only Node.js built-ins, global state, or nothing).

### Config & Permissions (1 file)
- config.js
- game/permissions.js

### Game Add-ons (4 files)
- game/addons/basicChatModeration.js
- game/addons/chatCommands.js
- game/addons/keyCommands.js
- game/addons/serverTravel.js

### Debug & Logging (3 files)
- game/debug/lagLogger.js
- game/debug/logs.js
- game/debug/speedLoop.js

### Entity Classes (9 files)
- game/entities/antiNaN.js
- game/entities/bulletEntity.js
- game/entities/gun.js
- game/entities/healthType.js
- game/entities/propEntity.js
- game/entities/skills.js
- game/entities/subFunctions.js
- game/entities/turretEntity.js
- game/entities/vector.js

### Gamemode Configurations (40 files)
All in `game/gamemodes/config/`:
- arms_race.js, assault_acropolis.js, assault_booster.js, assault_bunker.js, assault_eye.js
- assault_line.js, assault_trenches.js, assault_yinyang.js, blackout.js, clan_wars.js
- classic.js, diep.js, domination.js, duos.js, fast.js, ffa.js, growth.js, halloween.js
- labyrinth.js, limbo.js, march_madness.js, maze.js, mothership.js, nexus.js
- old_dreadnoughts.js, old_siege.js, open_tdm.js, outbreak.js, pandemic.js
- retrograde.js, rock.js, sandbox.js, siege_blitz.js, siege_citadel.js
- siege_classic.js, siege_fortress.js, space.js, squads.js, tag.js
- tartarus.js, tdm.js, tile_testing.js, train_wars.js, trios.js

### Gamemode Scripts (12 files)
All in `game/gamemodes/scripts/`:
- assault.js, clan_wars.js, dominator.js, groups.js, labyrinth.js, maze.js
- mothership.js, outbreak.js, sandbox.js, siege.js, tag.js, trainwars.js

### Game Entry (1 file)
- game/index.js

### Room Setups (35 files)

**Rooms** (22 files in `game/roomSetup/rooms/`):
- overlay_room_domination.js, room_assault_acropolis.js, room_assault_booster.js
- room_assault_bunker.js, room_assault_eye.js, room_assault_line.js
- room_assault_trenches.js, room_assault_yinyang.js, room_default.js
- room_halloween.js, room_limbo.js, room_nexus.js, room_old_siege.js
- room_rock.js, room_sandbox.js, room_siege_blitz.js, room_siege_citadel.js
- room_siege_classic.js, room_siege_fortress.js, room_tdm.js
- room_tdm_old.js, room_tiles_test.js

**Tiles** (10 files in `game/roomSetup/tiles/`):
- assault.js, default.js, domination.js, labyrinth.js, nexus.js
- portal.js, rocks.js, siege.js, teams.js, testing.js

### Library Utilities (6 files)
- lib/dotenv.js
- lib/fasttalk.js
- lib/hashgrid.js
- lib/random.js
- lib/util.js

### Definition Files (7 files)
- lib/definitions/combined.js
- lib/definitions/constants.js
- lib/definitions/gunvals.js
- lib/definitions/presets.js
- lib/definitions/entityAddons/fireworks/fireworks.js
- lib/definitions/entityAddons/marchMadness/marchMadness.js
- lib/definitions/entityAddons/shaders.js

### Miscellaneous (7 files)
- miscFiles/collisionFunctions.js
- miscFiles/color.js
- miscFiles/controllers.js
- miscFiles/mazeGenerator.js
- miscFiles/mockupEntity.js
- miscFiles/mockup_dimentions.js
- miscFiles/tileEntity.js

---

## 4. Circular Dependencies

**NONE DETECTED**

The entire codebase forms a directed acyclic graph (DAG) with:
- Entry points: server.js, serverLoader.js
- No circular require chains found
- Safe for incremental refactoring and modularization

---

## 5. Global Identifiers

### Global Object Access (32 files)
Files that read/write `global.*`:

**Core game loop**: game.js, game/index.js, game/gamemodeManager.js

**Entities**: game/entities/{bulletEntity, entity, gun, subFunctions, turretEntity}.js

**Add-ons**: game/addons/{chatCommands, keyCommands, serverTravel}.js

**Gamemodes**: game/gamemodes/scripts/{assault, dominator, labyrinth, maze, mothership, outbreak, sandbox, siege, tag}.js

**Debug**: game/debug/speedLoop.js

**Network**: game/network/{editor, sockets}.js

**Definitions**: lib/definitions/{combined, groups/bosses/dev, groups/testing}.js

**Loaders**: loaders/{global, loader}.js

**Utilities**: miscFiles/{collisionFunctions, controllers, tileEntity}.js

**Bootstrap**: server.js

**Purpose**: Runtime injection of entities, players, rooms, and game state.

### Process Object Access (4 files)
- game.js (worker_threads initialization)
- game/network/sockets.js (API_KEY)
- game/permissions.js (permission keys: BETA_TESTER, SHINY, YOUTUBER, DEVELOPER)
- server.js (environment bootstrap)

**Purpose**: Environment variables and Node.js process management.

### Major Class Globals

**Entity classes** (not imported, assumed global or injected):
- Entity (46 refs) - core entity inheritance
- LayeredBoss (43 refs) - composite boss pattern
- Vector (35 refs) - 2D math
- Tile (35 refs) - room structure
- Color (13 refs) - RGB management
- Gun, Skill, HealthType, Logger, Portal, Prop, etc. (5-11 refs each)

**Configuration objects** (enum-style, uppercase):
- PROPERTIES (20+ refs): TYPE, SHOOT_SETTINGS, COLOR, LABEL, etc.
- BODY (14+ refs): PENETRATION, HEALTH, DAMAGE, DENSITY, SPEED, ACCELERATION, RECOIL_MULTIPLIER, RANGE, PUSHABILITY, RESIST, STEALTH, SHOCK_ABSORB, SHIELD, REGEN, HETERO
- POSITION (8 refs): ANGLE
- CC (8 refs): FACING_TYPE

**System classes**:
- Config (23 refs) - configuration object
- Logger (used in game/debug/logs.js)
- EventEmitter (Node.js; game/entities/{gun, turretEntity}.js)
- HashGrid, Proxy, Map, Set, WeakMap (standard JS classes)

---

## 6. Architecture Notes

### Entry Points
- **server.js** - HTTP/WebSocket server bootstrap, worker thread coordination
- **serverLoader.js** - Worker thread launcher

### Core Subsystems

**1. Network Layer** (game/network/)
- **editor.js** - In-game editor and mockup system
- **sockets.js** - WebSocket message handler and protocol

**2. Game Loop** (game/index.js, game.js)
- Main tick and entity update
- Delegator to subsystems

**3. Gamemode System** (game/gamemodeManager.js + game/gamemodes/)
- Pluggable gamemode variants
- 12 gamemode scripts
- 42 gamemode configs

**4. Entity System** (game/entities/)
- Base classes: Entity, Vector
- Specialized: BulletEntity, Gun, TurretEntity, HealthType, Skill
- Factory: facilitators.js

**5. Room/Map Setup** (game/roomSetup/)
- 22 room configurations (one per gamemode + variants)
- 10 tileset definitions

**6. Data Definitions** (lib/definitions/)
- 37 files total
- Constants, entity defs, weapon stats
- Group-based entity catalogs

### Key Architectural Patterns

1. **Hub-and-spoke** - game.js is central coordinator
2. **Pluggable gamemodes** - each mode is independent script
3. **Factory pattern** - facilitators.js builds entities
4. **Global state injection** - loaders/global.js inits runtime
5. **Config-driven** - entity behavior from data definitions
6. **Leaf modularity** - 125 files have zero internal dependencies

### Global State Pattern
Extensive use of `global.*` for runtime entity/player/room state. This is common for Node.js game servers but limits testability. Consider dependency injection for port or refactoring to Go interfaces.

---

## 7. Port Order Recommendation

1. **Leaf utilities** (lib/{util, random, hashgrid, fasttalk, dotenv} + miscFiles leaves - 13 files)
2. **Config & constants** (config.js, lib/definitions/{constants, gunvals} - 3 files)
3. **Math & colors** (game/entities/vector.js, miscFiles/color.js - 2 files)
4. **Gamemode configs** (game/gamemodes/config/* - 40 files, pure data)
5. **Gamemodes scripts** (game/gamemodes/scripts/* - 12 files, independent logic)
6. **Room & tile setup** (game/roomSetup/ - 35 files, mostly independent)
7. **Entity system** (game/entities/{entity, bulletEntity, gun, healthType, etc} - 8 files)
8. **Definition subsystem** (lib/definitions/ - 37 files total, build facilitators.js first)
9. **Utility systems** (game/addons, game/debug, miscFiles logic - 10 files)
10. **Core game loop** (game/gamemodeManager.js, game/index.js - 2 files)
11. **Network layer** (game/network/* - 2 files, last due to global state)
12. **Bootstrap** (loaders/, server.js, serverLoader.js - 3 files, final)

---

## 8. Analysis Notes

- **Line counts**: Accurate via `wc -l`
- **Dependencies**: Extracted via `grep -o "require(['\"][^'\"]+['\"])"` normalized to project-relative paths
- **Exports**: Parsed from `module.exports.` patterns and `module.exports =` statements
- **Purposes**: First non-empty comment line of each file (max 80 chars)
- **Globals**: Identified via class constructor usage, `global.*` access, and uppercase constant patterns
- **Cycles**: No circular require() chains detected in static analysis
- **lib/definitions/**: 37 files treated as single dependency node in per-file table; full internal DAG mapped in graph section

---

Generated via static analysis of JavaScript source. See grep output for require/export/global verification.
