#!/bin/sh
# The standing differential corpus: every run this port claims to be verified against.
#
#   ./tools/verify.sh [sweep|long|boss|all]
#
# Each set runs Node and Go on the same seed, compares with cmd/simdiff, and appends one
# verdict line per pair to gen/verify/<set>.txt. Traces are deleted as they are compared
# -- a 1,500-tick pair is tens of megabytes and the verdict is the only part worth
# keeping.
#
# Runs are sequential on purpose. Two `go run` builds and two Node processes at once turn
# a laptop into a heater for no wall-clock gain worth having, and the machine this was
# written on is usually on battery.
#
# Which set to reach for:
#
#   sweep  every gamemode config at 150 ticks, at SEED (default 1). Catches anything a
#          gamemode's own setup does differently. Cheap; run it after any change to
#          internal/room, and at a second seed when the change is broad.
#   long   ten runs at 1,500 ticks, including the --spawnclass ones that are the only
#          way to reach SHOOT_ON_DEATH, necro guns and the assembler, and tile_testing,
#          whose portal tiles do not fire until tick 1260.
#   boss   eight pairs at 900 ticks with --checkusers, the only way a harness run
#          reaches the boss spawner at all. See docs/harness.md.
#   probes regenerates the artefacts that pin what no headless run reaches: what a
#          player joining draws (probe-spawn.js, one per branch of getSpawnLocation),
#          what upgrading and spending stat points does (probe-upgrade.js), what the
#          250 ms broadcast sends (probe-broadcast.js), what a death sends
#          (probe-death.js), the exact chat payloads (probe-chat.js), the clan roster
#          (probe-clanwars.js), what the `T` tank tree pushes (probe-tanktree.js), the
#          Bacteria death branch that promotes a clone instead of killing anyone
#          (probe-bacteria.js), the dominator/mothership takeover and everything that
#          ends it (probe-control.js, one run per branch), the daily-tank ad wall and
#          the upgrade behind it (probe-dailytank.js), and what the HUD sends
#          (gen-gui-vectors.js and
#          gen-leaderboard-vectors.js). All are read by tests in internal/wire and
#          internal/net, so this is the set to run after touching js-src or the
#          harness -- then `go test ./internal/wire/ ./internal/net/`.
set -u

cd "$(dirname "$0")/.." || exit 1
# shellcheck disable=SC1091
. ./goenv.sh 2>/dev/null

S="gen/verify"
mkdir -p "$S"

# run <tag> <out-file> <extra harness args...>
run_pair() {
  tag=$1
  out=$2
  shift 2
  node tools/harness/run.js "$@" --out "$S/js-$tag.jsonl" > "$S/js-$tag.log" 2>&1
  jsrc=$?
  go run ./cmd/gotrace "$@" --out "$S/go-$tag.jsonl" > "$S/go-$tag.log" 2>&1
  gorc=$?
  if [ $jsrc -ne 0 ]; then echo "$tag: JS-FAILED (see $S/js-$tag.log)" >> "$out"; return; fi
  if [ $gorc -ne 0 ]; then echo "$tag: GO-FAILED (see $S/go-$tag.log)" >> "$out"; return; fi
  # simdiff's own exit status, which the old pipeline threw away. 0 is identical and 1 is
  # a real difference -- but the status alone cannot be trusted past that, because `go
  # run` reports its own 1 for simdiff's 2 and for a build failure alike. So a verdict
  # line is what decides: simdiff always prints IDENTICAL or FIRST DIVERGENCE when it
  # reached one, and neither when it died on the way. "They differ" and "it never ran"
  # are different results and do not share a line. The full report stays in the log.
  go run ./cmd/simdiff "$S/js-$tag.jsonl" "$S/go-$tag.jsonl" > "$S/diff-$tag.log" 2>&1
  simrc=$?
  verdict=$(tail -n +3 "$S/diff-$tag.log" | head -8 | tr '\n' ' ')
  if [ $simrc -eq 0 ]; then
    echo "$tag: OK $verdict" >> "$out"
  elif [ $simrc -eq 1 ] && grep -q -E 'IDENTICAL|FIRST DIVERGENCE' "$S/diff-$tag.log"; then
    echo "$tag: DIFF $verdict" >> "$out"
  else
    # Keep the traces: the tooling broke, so the inputs are the evidence.
    echo "$tag: SIMDIFF-FAILED (see $S/diff-$tag.log)" >> "$out"
    return
  fi
  rm -f "$S/js-$tag.jsonl" "$S/go-$tag.jsonl"
}

# check_set turns what a result file records into an exit status; the targets below end on
# it, so $? reports the run rather than whatever the last cat printed. A set passes only if
# it ran to the end AND compared something: a file that is missing, empty, cut short or
# holds no pairs fails, because a run that reached no verdict is not a passing run.
check_set() {
  file=$1
  trailer=$2
  if [ ! -s "$file" ]; then
    echo "verify: $file is missing or empty" >&2
    return 1
  fi
  if ! grep -q "^$trailer$" "$file"; then
    echo "verify: $file has no '$trailer' line -- the run did not finish" >&2
    return 1
  fi
  pairs=$(grep -c ': ' "$file" 2>/dev/null || true)
  if [ "${pairs:-0}" -eq 0 ]; then
    echo "verify: $file recorded no pairs" >&2
    return 1
  fi
  bad=$(grep -c -E 'JS-FAILED|GO-FAILED|SIMDIFF-FAILED|DIFF ' "$file" 2>/dev/null || true)
  [ "${bad:-0}" -eq 0 ]
}

# SEED picks the sweep's seed (default 1) and names its result file, so a second and
# third pass can sit beside the first rather than overwrite it. Seed 1 is the one the
# defects in docs/verification.md were found against; another seed reaches a different
# spawn layout, a different upgrade path per bot and a different food stream, which is
# how a gamemode-specific bug that seed 1 happens to miss shows up.
do_sweep() {
  seed="${SEED:-1}"
  out="$S/sweep-s$seed.txt"
  : > "$out"
  for gm in $(ls js-src/server/game/gamemodes/config/ | sed 's/\.js$//'); do
    run_pair "$gm-s$seed" "$out" --seed "$seed" --ticks "${TICKS:-150}" --bots 8 --gamemode "$gm"
  done
  echo "SWEEP DONE" >> "$out"
  cat "$out"
  check_set "$out" "SWEEP DONE"
}

do_long() {
  out="$S/long.txt"
  : > "$out"
  # The last three specs use --spawnclass, which overrides Config.spawn_class so every
  # bot spawns as that tank: bots only upgrade along their own random path, so those
  # subsystems are unreachable from the stock `basic` at any length.
  for spec in "ffa 1 -" "ffa 2 -" "ffa 3 -" "outbreak 1 -" "nexus 1 -" \
              "siege_classic 1 -" "tile_testing 1 -" \
              "ffa 1 beeman" "ffa 1 necromancer" "ffa 1 assembler"; do
    gm=$(echo "$spec" | cut -d' ' -f1)
    seed=$(echo "$spec" | cut -d' ' -f2)
    cls=$(echo "$spec" | cut -d' ' -f3)
    if [ "$cls" = "-" ]; then
      run_pair "$gm-s$seed" "$out" --seed "$seed" --ticks "${TICKS:-1500}" --bots 8 --gamemode "$gm"
    else
      run_pair "$gm-s$seed-$cls" "$out" --seed "$seed" --ticks "${TICKS:-1500}" --bots 8 \
               --gamemode "$gm" --spawnclass "$cls"
    fi
  done
  echo "LONG DONE" >> "$out"
  cat "$out"
  check_set "$out" "LONG DONE"
}

do_boss() {
  out="$S/boss.txt"
  : > "$out"
  for spec in "ffa 1" "ffa 2" "ffa 3" "tdm 1" "open_tdm 1" "maze 1" "nexus 1" "tile_testing 1"; do
    gm=$(echo "$spec" | cut -d' ' -f1)
    seed=$(echo "$spec" | cut -d' ' -f2)
    run_pair "$gm-s$seed-boss" "$out" --seed "$seed" --ticks "${TICKS:-900}" --bots 8 \
             --gamemode "$gm" --checkusers --bosscooldown 3
  done
  echo "BOSS DONE" >> "$out"
  cat "$out"
  check_set "$out" "BOSS DONE"
}

# The probes are not differentials -- they are Node's answer, written down. The Go side
# reads these files back in internal/wire's tests, so regenerating them is how a change
# in js-src reaches the assertions.
probes_body() {
  for gm in ffa tdm clan_wars; do
    printf 'spawn probe %s: ' "$gm"
    if node tools/harness/probe-spawn.js --seed 1 --gamemode "$gm"          --out "gen/spawn-probe-$gm-s1.json" > "$S/probe-$gm.log" 2>&1; then
      echo "ok"
    else
      echo "FAILED (see $S/probe-$gm.log)"
    fi
  done
  printf 'upgrade probe ffa: '
  if node tools/harness/probe-upgrade.js --seed 1 --gamemode ffa        --out gen/upgrade-probe-ffa-s1.json > "$S/probe-upgrade.log" 2>&1; then
    echo "ok"
  else
    echo "FAILED (see $S/probe-upgrade.log)"
  fi
  printf 'broadcast probe ffa: '
  if node tools/harness/probe-broadcast.js --seed 1 --gamemode ffa --bots 8 --out gen/broadcast-probe-ffa-s1.json > "$S/probe-broadcast.log" 2>&1; then
    echo "ok"
  else
    echo "FAILED (see $S/probe-broadcast.log)"
  fi
  printf 'death probe ffa: '
  if node tools/harness/probe-death.js --seed 1 --gamemode ffa --out gen/death-probe-ffa-s1.json > "$S/probe-death.log" 2>&1; then
    echo "ok"
  else
    echo "FAILED (see $S/probe-death.log)"
  fi
  printf 'chat probe ffa: '
  if node tools/harness/probe-chat.js --seed 1 --gamemode ffa --out gen/chat-probe-ffa-s1.json > "$S/probe-chat.log" 2>&1; then
    echo "ok"
  else
    echo "FAILED (see $S/probe-chat.log)"
  fi
  printf 'clan wars probe: '
  if node tools/harness/probe-clanwars.js --seed 1 --out gen/clanwars-probe-s1.json > "$S/probe-clanwars.log" 2>&1; then
    echo "ok"
  else
    echo "FAILED (see $S/probe-clanwars.log)"
  fi
  printf 'tank tree probe ffa: '
  if node tools/harness/probe-tanktree.js --seed 1 --gamemode ffa --out gen/tanktree-probe-ffa-s1.json > "$S/probe-tanktree.log" 2>&1; then
    echo "ok"
  else
    echo "FAILED (see $S/probe-tanktree.log)"
  fi
  printf 'bacteria probe: '
  if node tools/harness/probe-bacteria.js --seed 1 --out gen/bacteria-probe-s1.json > "$S/probe-bacteria.log" 2>&1; then
    echo "ok"
  else
    echo "FAILED (see $S/probe-bacteria.log)"
  fi
  printf 'control probe mothership: '
  if node tools/harness/probe-control.js --seed 1 --gamemode mothership --out gen/control-probe-mothership-s1.json > "$S/control-probe-mothership.log" 2>&1; then
    echo "ok"
  else
    echo "FAILED (see $S/control-probe-mothership.log)"
  fi
  printf 'control probe domination: '
  if node tools/harness/probe-control.js --seed 1 --gamemode domination --out gen/control-probe-domination-s1.json > "$S/control-probe-domination.log" 2>&1; then
    echo "ok"
  else
    echo "FAILED (see $S/control-probe-domination.log)"
  fi
  printf 'daily tank probe: '
  if node tools/harness/probe-dailytank.js --seed 1 --out gen/dailytank-probe-s1.json > "$S/daily-tank-probe.log" 2>&1; then
    echo "ok"
  else
    echo "FAILED (see $S/daily-tank-probe.log)"
  fi
  printf 'gui vectors: '
  if node tools/gen-gui-vectors.js > "$S/gui-vectors.log" 2>&1; then
    tail -1 "$S/gui-vectors.log"
  else
    echo "FAILED (see $S/gui-vectors.log)"
  fi
  printf 'leaderboard vectors: '
  if node tools/gen-leaderboard-vectors.js > "$S/leaderboard-vectors.log" 2>&1; then
    tail -1 "$S/leaderboard-vectors.log"
  else
    echo "FAILED (see $S/leaderboard-vectors.log)"
  fi
  echo "PROBES DONE"
}

# do_probes runs that and turns a generator failure into a non-zero status. The probes are
# not a differential and produce no verdict, so a clean run still exits 0.
do_probes() {
  probes_body 2>&1 | tee "$S/probes.txt"
  if ! grep -q '^PROBES DONE$' "$S/probes.txt"; then
    echo "verify: the probe set did not run to the end" >&2
    return 1
  fi
  bad=$(grep -c 'FAILED' "$S/probes.txt" 2>/dev/null || true)
  [ "${bad:-0}" -eq 0 ]
}

case "${1:-all}" in
  sweep)  do_sweep ;;
  long)   do_long ;;
  boss)   do_boss ;;
  probes) do_probes ;;
  all)
    # Every target runs even when an earlier one failed, and the status is the worst of
    # them, so a caller can trust $? rather than reading the files.
    rc=0
    do_probes || rc=1
    do_sweep  || rc=1
    do_long   || rc=1
    do_boss   || rc=1
    exit $rc
    ;;
  *)      echo "usage: $0 [sweep|long|boss|probes|all]" >&2; exit 2 ;;
esac
