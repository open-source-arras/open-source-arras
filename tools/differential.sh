#!/usr/bin/env bash
# Runs both servers on the same seed and reports where they part company.
#
#   ./tools/differential.sh [seed] [ticks] [gamemode]
#
# The point of having this as one command is that the interesting comparison is not
# "do the traces match" -- they do not yet -- but "which phase does the draw count
# stop matching in". That is what localises a divergence, and doing it by hand means
# four commands and some arithmetic every time.
#
# Use at least 200 ticks. A short run is actively misleading: the 1000 ms maintain
# interval does not fire until tick 30 and the 200 ms one not until tick 6, so a
# four-tick run agrees perfectly and hides everything they do. See
# docs/verification.md, "What the first end-to-end run found".
set -u

cd "$(dirname "$0")/.." || exit 1
# shellcheck disable=SC1091
. ./goenv.sh 2>/dev/null

SEED="${1:-1}"
TICKS="${2:-200}"
MODE="${3:-ffa}"

GO_OUT="gen/diff-go-${SEED}.jsonl"
JS_OUT="gen/diff-node-${SEED}.jsonl"

mkdir -p gen

echo "=== seed ${SEED}, ${TICKS} ticks, gamemode ${MODE} ==="
echo
echo "--- Go setup phases (draws) ---"
GOTRACE_PROBE=1 go run ./cmd/gotrace --seed "$SEED" --ticks "$TICKS" \
  --gamemode "$MODE" --out "$GO_OUT" --quiet 2>&1 | grep "setup:"

echo
echo "--- Node setup phases (draws) ---"
node tools/harness/probe-run.js --seed "$SEED" --ticks "$TICKS" \
  --gamemode "$MODE" --out "$JS_OUT" 2>/dev/null | sed -n '/PROBE_perTickDraws/,$p'

echo
echo "--- per-tick draw agreement ---"
node -e '
const fs=require("fs");
const rd=f=>fs.readFileSync(f,"utf8").trim().split("\n").map(JSON.parse);
const N=rd(process.argv[1]), G=rd(process.argv[2]);
const n=Math.min(N.length,G.length);
if(!n){console.log("no ticks");process.exit(0);}
const d=i=>[N[i].rngCalls-(i?N[i-1].rngCalls:0), G[i].rngCalls-(i?G[i-1].rngCalls:0)];
let same=0,diff=[];
for(let i=1;i<n;i++){const [a,b]=d(i); if(a===b)same++; else diff.push(i);}
console.log(`ticks with identical per-tick draws: ${same}/${n-1}`);
console.log(`first 10 differing ticks: ${diff.slice(0,10).join(", ")||"none"}`);
console.log(`cumulative delta  tick 0: ${G[0].rngCalls-N[0].rngCalls}   tick ${n-1}: ${G[n-1].rngCalls-N[n-1].rngCalls}`);
console.log(`entities at last tick  node ${N[n-1].entities.length}  go ${G[n-1].entities.length}`);
' "$JS_OUT" "$GO_OUT"

echo
echo "--- entity-state agreement (paired on id, not index) ---"
node -e '
const fs=require("fs");
const NL=String.fromCharCode(10);
const rd=f=>fs.readFileSync(f,"utf8").trim().split(NL).map(JSON.parse);
const N=rd(process.argv[1]), G=rd(process.argv[2]);
const F=["x","y","vx","vy","size","facing","health","healthMax","shield","shieldMax"];
const n=Math.min(N.length,G.length);
for (const t of [0, Math.floor(n/4), Math.floor(n/2), n-1]) {
  const g=new Map(G[t].entities.map(e=>[e.id,e]));
  const diff={}; let paired=0, unpaired=0;
  for(const a of N[t].entities){ const b=g.get(a.id); if(!b){unpaired++;continue;} paired++;
    for(const k of F) if(a[k]!==b[k]) diff[k]=(diff[k]||0)+1; }
  const d=Object.keys(diff).length?JSON.stringify(diff):"none";
  console.log(`tick ${String(t).padStart(4)}  paired ${paired}  unpaired ${unpaired}  differing: ${d}`);
}
' "$JS_OUT" "$GO_OUT"

echo
echo "--- simdiff ---"
go run ./cmd/simdiff "$JS_OUT" "$GO_OUT" 2>&1 | head -25
