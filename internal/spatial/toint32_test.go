package spatial

import (
	"encoding/json"
	"math"
	"os"
	"path/filepath"
	"strconv"
	"testing"
)

// Pinned against JavaScript's ToInt32 semantics for out-of-range values.
type toInt32Vectors struct {
	Rows []struct {
		In      string `json:"in"` // float64 bit pattern, 16 hex digits
		Shr6    int32  `json:"shr6"`
		Shr0    int32  `json:"shr0"`
		ToInt32 int32  `json:"toInt32"`
	} `json:"rows"`
}

func TestToInt32MatchesJS(t *testing.T) {
	p := filepath.Join("..", "..", "gen", "toint32-vectors.json")
	raw, err := os.ReadFile(p)
	if err != nil {
		t.Fatalf("read %s: %v", p, err)
	}
	var v toInt32Vectors
	if err := json.Unmarshal(raw, &v); err != nil {
		t.Fatalf("parse: %v", err)
	}
	if len(v.Rows) < 20 {
		t.Fatalf("only %d cases; not enough to cover the out-of-range behaviour", len(v.Rows))
	}

	naive := 0
	for _, r := range v.Rows {
		u, err := strconv.ParseUint(r.In, 16, 64)
		if err != nil {
			t.Fatalf("bad bit pattern %q: %v", r.In, err)
		}
		f := math.Float64frombits(u)

		if got := toInt32(f); got != r.ToInt32 {
			t.Errorf("toInt32(%v) = %d, JS (v|0) = %d", f, got, r.ToInt32)
		}
		if got := shr(f, 6); got != r.Shr6 {
			t.Errorf("shr(%v, 6) = %d, JS (v>>6) = %d", f, got, r.Shr6)
		}
		if got := shr(f, 0); got != r.Shr0 {
			t.Errorf("shr(%v, 0) = %d, JS (v>>0) = %d", f, got, r.Shr0)
		}

		if int32(f)>>6 != r.Shr6 {
			naive++
		}
	}
	t.Logf("%d of %d cases would be wrong with a plain int32() conversion", naive, len(v.Rows))
	if naive == 0 {
		t.Error("no case in the corpus distinguishes ToInt32 from int32(); " +
			"it is not testing the thing it exists to test")
	}
}

// NaN coordinates must match Node's cell placement, not saturate to -33554432.
func TestNaNAndInfinityMatchNodeCellPlacement(t *testing.T) {
	nan, inf := math.NaN(), math.Inf(1)

	cases := []struct {
		name                   string
		minX, minY, maxX, maxY float64
		wantCells              int
		wantFirstKey           int64
	}{
		{"all NaN", nan, nan, nan, nan, 1, 0},
		{"minX NaN, maxX 300", nan, 0, 300, 300, 25, 0},
		{"all Infinity", inf, inf, inf, inf, 1, 0},
		{"normal 0..300", 0, 0, 300, 300, 25, 0},
		{"negative -300..-100", -300, -300, -100, -100, 16, -327685},
	}

	for _, c := range cases {
		g := New(6)
		g.Insert(0, c.minX, c.minY, c.maxX, c.maxY)

		occupied := 0
		var firstKey int64
		found := false
		for k, cell := range g.cells {
			if len(cell) == 0 {
				continue
			}
			occupied++
			if !found || k < firstKey {
				firstKey = k
				found = true
			}
		}
		if occupied != c.wantCells {
			t.Errorf("%s: occupies %d cells, Node occupies %d",
				c.name, occupied, c.wantCells)
		}
		if found && c.wantCells == 1 && firstKey != c.wantFirstKey {
			t.Errorf("%s: cell key %d, Node used %d", c.name, firstKey, c.wantFirstKey)
		}
	}
}

// NaN comparisons always return false, so strict inequalities reject NaN boxes.
func TestNaNBoxIsNeverACandidate(t *testing.T) {
	nan := math.NaN()
	g := New(6)
	boxes := []Box{{MinX: nan, MinY: nan, MaxX: nan, MaxY: nan}}
	g.Insert(0, nan, nan, nan, nan)
	if got := g.Query(0, 0, 100, 100, boxes); len(got) != 0 {
		t.Errorf("query returned %v; Node returns nothing for a NaN box", got)
	}
}

func TestToInt32IsAllocationFree(t *testing.T) {
	vals := []float64{1, -1, 1e10, math.NaN(), 16000.5, -1e300}
	n := testing.AllocsPerRun(100, func() {
		for _, v := range vals {
			_ = shr(v, 6)
		}
	})
	if n != 0 {
		t.Errorf("shr allocates %.0f times; it runs eight times per entity per tick", n)
	}
}
