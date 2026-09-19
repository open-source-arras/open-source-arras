package jsutil

import (
	"encoding/json"
	"math"
	"os"
	"path/filepath"
	"strconv"
	"testing"
)

// Verifies Go RandomAngle against Node.js reference vectors.
func TestRandomAngleBitsMatchNode(t *testing.T) {
	raw, err := os.ReadFile(filepath.Join("..", "..", "gen", "angle-vectors.json"))
	if err != nil {
		t.Skipf("no angle corpus (%v); generate it with: node tools/check-randomangle.js", err)
	}
	var doc struct {
		Cases []struct {
			I       int    `json:"i"`
			X       string `json:"x"`
			Angle   string `json:"angle"`
			Wrapped string `json:"wrapped"`
		} `json:"cases"`
	}
	if err := json.Unmarshal(raw, &doc); err != nil {
		t.Fatalf("parse: %v", err)
	}
	rows := doc.Cases
	if len(rows) < 100 {
		t.Fatalf("only %d cases; the corpus is not being read", len(rows))
	}

	r := NewRand(1)
	drawBad, angleBad := 0, 0
	for _, want := range rows {
		got := r.RandomAngle()

		wantAngle, err := strconv.ParseUint(want.Angle, 16, 64)
		if err != nil {
			t.Fatalf("bad hex %q: %v", want.Angle, err)
		}
		if math.Float64bits(got) != wantAngle {
			angleBad++
			if angleBad <= 3 {
				t.Errorf("draw %d: angle bits %016x, node %016x (%.17g vs %.17g)",
					want.I, math.Float64bits(got), wantAngle,
					got, math.Float64frombits(wantAngle))
			}
		}
	}
	const tau = 2 * math.Pi
	wrapBad := 0
	r2 := NewRand(1)
	for _, want := range rows {
		a := r2.RandomAngle()
		got := math.Mod(math.Mod(a, tau)+tau, tau)
		wb, err := strconv.ParseUint(want.Wrapped, 16, 64)
		if err != nil {
			t.Fatalf("bad hex %q: %v", want.Wrapped, err)
		}
		if math.Float64bits(got) != wb {
			wrapBad++
			if wrapBad <= 3 {
				t.Errorf("draw %d: wrapped bits %016x, node %016x (%.17g vs %.17g)",
					want.I, math.Float64bits(got), wb, got, math.Float64frombits(wb))
			}
		}
	}
	t.Logf("wrap mismatches: %d of %d", wrapBad, len(rows))

	t.Logf("%d angles compared, %d draw mismatches, %d angle mismatches",
		len(rows), drawBad, angleBad)
}
