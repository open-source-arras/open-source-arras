#!/usr/bin/env bash
# Copies generated JSON into the packages that embed it.
#
# go:embed patterns cannot contain "..", so a package can only embed files at or
# below its own directory. The dump tools write to gen/ (canonical, inspectable,
# diffable); this copies each file to where its package can actually embed it.
# The copies are generated artefacts and are gitignored.
#
# Run after any of the dump tools:
#   node tools/dump-config.js && node tools/dump-definitions.js && tools/sync-embeds.sh
#   node tools/dump-mockups.js --out gen/mockups.json && tools/sync-embeds.sh
set -euo pipefail

root="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$root"

sync() {
  local src="$1" dst="$2"
  if [ ! -f "$src" ]; then
    echo "  MISSING $src — run its dump tool first" >&2
    return 1
  fi
  mkdir -p "$(dirname "$dst")"
  cp "$src" "$dst"
  printf '  %-42s -> %s (%s)\n' "$src" "$dst" "$(du -h "$dst" | cut -f1)"
}

echo "syncing generated data into packages:"
rc=0
sync gen/config.json          internal/config/data/config.json           || rc=1
sync gen/definitions.json     internal/defs/data/definitions.json        || rc=1
sync gen/gamemodes.json       internal/room/data/gamemodes.json          || rc=1
sync gen/rooms.json           internal/room/data/rooms.json              || rc=1
sync gen/mockups.json         internal/net/data/mockups.json             || rc=1

exit $rc
