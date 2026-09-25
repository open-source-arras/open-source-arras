#!/usr/bin/env bash
# Regenerates everything in gen/ from js-src, then copies it where the packages embed it.
#
#   ./tools/regen.sh
#
# gen/ is not tracked. The Go packages embed copies of these files, so a fresh clone does
# not compile until this has run once. Needs Node and the js-src tree.
#
# Two files in gen/ are tracked because nothing here produces them: toint32-vectors.json
# and harness-sample.jsonl.
set -euo pipefail

cd "$(dirname "${BASH_SOURCE[0]}")/.."
mkdir -p gen

echo "dumping game data from js-src..."
node tools/dump-config.js
node tools/dump-definitions.js
node tools/dump-gamemodes.js
node tools/dump-rooms.js
node tools/dump-mockups.js --out gen/mockups.json

echo "generating comparison vectors..."
for g in ctrl defs hashgrid leaderboard math maze message protocol rng sim v8sort vector view gui; do
  node "tools/gen-$g-vectors.js"
done
node tools/check-randomangle.js

echo "copying into the packages that embed them..."
./tools/sync-embeds.sh

echo "recording what Node does for the socket paths..."
./tools/verify.sh probes

echo
echo "done. gen/ is rebuilt; go build ./... and go test ./... should now work."
