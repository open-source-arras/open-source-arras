#!/usr/bin/env bash
# Build and run the whole thing locally: the Go game server, and a web server
# for the JavaScript client that talks to it.
#
#   ./tools/run-local.sh                       ffa on the defaults
#   ./tools/run-local.sh --gamemode nexus       any gamemode name from
#                                               js-src/server/game/gamemodes/config/
#   ./tools/run-local.sh --port 8080 --game-port 8081
#   ./tools/run-local.sh --seed 42              a fixed world instead of a clock-derived one
#
# Then open http://localhost:3000 and press Play. Ctrl-C stops both.
#
# Why two processes: cmd/server is the game endpoint and treats every request as
# a websocket upgrade, exactly as js-src/server/server.js:328 does. The browser
# client is still the JavaScript one under js-src/public, and it needs an
# ordinary web server plus the three small endpoints it calls before it opens a
# socket. cmd/clienthost is that. See its own file comment.
set -euo pipefail

cd "$(dirname "${BASH_SOURCE[0]}")/.."
# shellcheck disable=SC1091
. ./goenv.sh 2>/dev/null || true

PORT=3000
GAME_PORT=3001
GAMEMODE=ffa
SEED=0
HOST=localhost

while [ $# -gt 0 ]; do
  case "$1" in
    --port)      PORT="$2"; shift 2 ;;
    --game-port) GAME_PORT="$2"; shift 2 ;;
    --gamemode)  GAMEMODE="$2"; shift 2 ;;
    --seed)      SEED="$2"; shift 2 ;;
    --host)      HOST="$2"; shift 2 ;;
    -h|--help)
      sed -n '2,/^set /p' "$0" | grep '^#' | sed 's/^# \{0,1\}//'
      exit 0 ;;
    *) echo "run-local: unknown option $1" >&2; exit 2 ;;
  esac
done

mkdir -p gen
echo "building..."
go build -o gen/arras-server.exe ./cmd/server
go build -o gen/arras-clienthost.exe ./cmd/clienthost

# Stop both on Ctrl-C, and stop the client if the server dies first. Without the
# trap the game server outlives the terminal and holds its port.
pids=""
cleanup() {
  trap - INT TERM EXIT
  [ -n "$pids" ] && kill $pids 2>/dev/null || true
  wait $pids 2>/dev/null || true
  echo
  echo "stopped."
}
trap cleanup INT TERM EXIT

./gen/arras-server.exe --host "$HOST" --port "$GAME_PORT" --gamemode "$GAMEMODE" --seed "$SEED" &
pids="$!"
./gen/arras-clienthost.exe --host "$HOST" --port "$PORT" \
  --game "$HOST:$GAME_PORT,mode=$GAMEMODE,cap=80" &
pids="$pids $!"

echo
echo "  play at   http://$HOST:$PORT"
echo "  game at   ws://$HOST:$GAME_PORT   (gamemode $GAMEMODE)"
echo "  Ctrl-C to stop both"
echo
wait
