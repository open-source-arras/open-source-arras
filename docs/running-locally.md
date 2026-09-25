# Running it locally

## On a fresh clone, first

```sh
./tools/regen.sh
```

`gen/` is not tracked. It holds the game data dumped out of `js-src` (every tank
definition, the room layouts, the mockups) and the vectors recording what Node returns
for a given input, which is what the tests compare against. The Go packages embed copies
of it, so `go build ./...` does not compile until this has run once. It needs Node.

## Then

```sh
./tools/run-local.sh
```

then open <http://localhost:3000>, type a name, press Play. Ctrl-C stops both
processes.

```sh
./tools/run-local.sh --gamemode nexus     # any name from js-src/server/game/gamemodes/config/
./tools/run-local.sh --gamemode tdm,maze  # comma-separated, merged in game.js:286's order
./tools/run-local.sh --seed 42            # a fixed world; 0 (the default) draws one from the clock
./tools/run-local.sh --port 8080 --game-port 8081
```

## Two processes, and why

`cmd/server` is the game endpoint and nothing else. Every request to it is a
websocket upgrade attempt, exactly as `js-src/server/server.js:328` treats them;
it serves no files and answers no ordinary GET. That is deliberate and it matches
the Node original, where the same process only ever gets upgrade traffic.

The browser client is still the JavaScript one in `js-src/public`. On the Node
side it is served by `server.js` itself, which is also the process that runs the
game — so one port does both. Here there is no such process, so `cmd/clienthost`
is it: a static file server for `js-src/public` plus the three endpoints the
client calls before it opens a socket.

| | port | serves |
|---|---|---|
| `cmd/clienthost` | 3000 | `js-src/public`, `/getServers.json`, `/version`, `/getTotalPlayers` |
| `cmd/server` | 3001 | the websocket |

The client learns where the game is from `/getServers.json`
(`js-src/public/client/app.js:95`). Each row's `ip` becomes the websocket address
(`serverSelectorHandler.js:65`), and the bare name `localhost` — and only that
exact string — gets `:port` appended, which is why `--game` carries the port in
the address. Adding a second `--game` puts a second row in the menu, so one
client host can front several game servers:

```sh
go run ./cmd/server --port 3001 --gamemode ffa &
go run ./cmd/server --port 3002 --gamemode nexus &
go run ./cmd/clienthost --port 3000 \
  --game localhost:3001,id=a,mode=ffa \
  --game localhost:3002,id=b,mode=nexus
```

`http://localhost:3000/#b` then opens straight onto the second one.

Player counts in the menu are always zero. The client host is not connected to
any game server and has no way to ask; the Node original knows because the game
runs in a worker thread beside it. The number is decorative.

## What a connected client gets

The player path was wired after the simulation was already verified — see
`internal/wire/player.go` for the map of which `net.Hooks` are filled in. What
works today:

- the handshake, the room payload, the spawn, and the camera;
- one frame per tick per client, with every entity in view, drawn from the real
  mockups (`internal/net/mockups.go`);
- movement, aiming and firing;
- the two spawn popups, and the autospin/autofire confirmations;
- the HUD (`internal/wire/gui.go`): score, kills, level bar, skill points, the
  class name, the ten stat sliders with their caps, and the upgrade menu;
- spending stat points, taking an upgrade, levelling, and self-destruct
  (`internal/wire/upgrade.go`) — including the three-second stand-still an
  upgrade outside a base makes you wait out.

What is not wired yet, and what you will notice:

| missing | what you see |
|---|---|
| the leaderboard and minimap (`b`, `RM`, `RL`) | an empty minimap box and an empty leaderboard |
| the death report (`F`) | dying leaves the screen where it was instead of showing the score card |
| chat, the tank tree, taking over a dominator | those keys do nothing |

The HUD is a change feed rather than a snapshot: the first frame after a spawn
carries all of it and later frames carry only what moved, so a dropped first
frame is a client with a permanently blank HUD. That is the JS's design
(`sockets.js:780`, the "floppy") and the reason `gui.go` reproduces its
three-state null/flagged/clean logic exactly rather than diffing structs.

Each of those has its message type built and pinned in `internal/net` already;
what is missing is the room-side answer. See `docs/verification.md`.

## Mockups

The client cannot draw anything until it has the *mockup* for that class — the
recipe holding shape, colour, guns, turrets and the measured bounding circle.
Without one it draws `global.missingno`, a magenta-and-black checkerboard, for
every entity on screen.

`internal/net/data/mockups.json` is Node's own output, dumped by
`tools/dump-mockups.js` and embedded the same way the definitions and room
layouts are. It is regenerated with:

```sh
node tools/dump-mockups.js --out gen/mockups.json && ./tools/sync-embeds.sh
```

The builder is a second, parallel implementation of `define()` under
`js-src/server/miscFiles/`, sharing no code with `entity.js` and resolving
several fields differently. Taking Node's answer is both shorter and more exact
than porting Welzl's minimum enclosing circle and a JSON encoder that has to drop
undefined keys — and nothing the simulation computes depends on a mockup. See
that tool's own comment for what the dump does and does not preserve; the one
thing it moves is *when* the mockup build spends its randomness, which is the
same trade the real server's own `load_all_mockups: true` makes.

## Serving the client some other way

Anything that serves `js-src/public` will do, as long as it also answers
`GET /getServers.json` with a non-empty array. The Play button stays disabled
until that array arrives (`serverSelectorHandler.js:17`), and `global.serverAdd`
— the websocket address — is assigned only from a row in it.

Running the Node host instead is possible but is not the same deployment: it
needs `npm install` in `js-src` for `ws`, and booting it starts seven *Node* game
servers of its own on ports 4000, 5050, 3001, 3002, 3003, 3004 and 3099
(`js-src/server/config.js:40`), which will fight the Go server for a port.
