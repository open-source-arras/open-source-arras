package wire

import (
	"encoding/json"
	"os"
	"path/filepath"
	"testing"

	"arrasgo/internal/jsutil"
)

type mazeVectors struct {
	Cases []mazeCase `json:"cases"`
}

type mazeCase struct {
	Type    int      `json:"type"`
	Seed    uint64   `json:"seed"`
	Err     *string  `json:"err"`
	Draws   uint64   `json:"draws"`
	Width   *int     `json:"width"`
	Height  *int     `json:"height"`
	Squares [][3]int `json:"squares"` // x, y, size
}

func loadMazeVectors(t *testing.T) mazeVectors {
	t.Helper()
	p := filepath.Join("..", "..", "gen", "maze-vectors.json")
	raw, err := os.ReadFile(p)
	if err != nil {
		t.Skipf("no maze corpus (%v); generate it with: node tools/gen-maze-vectors.js", err)
	}
	var v mazeVectors
	if err := json.Unmarshal(raw, &v); err != nil {
		t.Fatalf("parse: %v", err)
	}
	if len(v.Cases) == 0 {
		t.Fatal("corpus is empty")
	}
	return v
}

func TestAdapterMatchesCorpus(t *testing.T) {
	v := loadMazeVectors(t)

	checked, squares := 0, 0
	for _, c := range v.Cases {
		if c.Err != nil || c.Type == 80 {
			continue
		}

		rng := jsutil.NewRand(c.Seed)
		a := NewMazeAdapter(rng)
		got := a.PlaceMinimal(c.Type)

		if a.Err() != nil {
			t.Errorf("type %d seed %d: adapter failed: %v", c.Type, c.Seed, a.Err())
			continue
		}

		if n := rng.Calls(); n != c.Draws {
			t.Errorf("type %d seed %d: consumed %d draws, JS consumed %d (delta %+d) -- "+
				"a mismatch of exactly one per call usually means the generator was not "+
				"rebuilt for this call, dropping staticRand's draw",
				c.Type, c.Seed, n, c.Draws, int64(n)-int64(c.Draws))
		}

		if c.Width != nil && got.Width != *c.Width {
			t.Errorf("type %d seed %d: width %d, want %d", c.Type, c.Seed, got.Width, *c.Width)
		}
		if c.Height != nil && got.Height != *c.Height {
			t.Errorf("type %d seed %d: height %d, want %d", c.Type, c.Seed, got.Height, *c.Height)
		}

		if len(got.Squares) != len(c.Squares) {
			t.Errorf("type %d seed %d: %d squares, want %d",
				c.Type, c.Seed, len(got.Squares), len(c.Squares))
			continue
		}
		for i, want := range c.Squares {
			g := got.Squares[i]
			if g.X != float64(want[0]) || g.Y != float64(want[1]) || g.Size != float64(want[2]) {
				t.Errorf("type %d seed %d square %d: got (%v,%v,%v), want (%d,%d,%d)",
					c.Type, c.Seed, i, g.X, g.Y, g.Size, want[0], want[1], want[2])
				break
			}
		}

		checked++
		squares += len(got.Squares)
	}

	if checked < 20 || squares < 1000 {
		t.Fatalf("only %d cases and %d squares checked; the corpus is not being read",
			checked, squares)
	}
	t.Logf("%d cases, %d squares, draw counts agree with node exactly", checked, squares)
}

func TestConstructionCostsADraw(t *testing.T) {
	rng := jsutil.NewRand(1)
	a := NewMazeAdapter(rng)

	before := rng.Calls()
	a.PlaceMinimal(0)
	first := rng.Calls() - before
	a.PlaceMinimal(0)
	second := rng.Calls() - before - first

	if first == 0 || second == 0 {
		t.Fatalf("PlaceMinimal drew %d then %d times; it should never draw zero", first, second)
	}
	t.Logf("two calls of type 0 drew %d then %d", first, second)
}
