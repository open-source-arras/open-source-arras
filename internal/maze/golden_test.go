package maze

import (
	"encoding/json"
	"os"
	"path/filepath"
	"testing"

	"arrasgo/internal/jsutil"
)

// Pinned against the real MazeGenerator. Regenerate with: node tools/gen-maze-vectors.js
type mazeVectors struct {
	Cases []mazeCase `json:"cases"`
}

type mazeCase struct {
	Type    int      `json:"type"`
	Seed    uint64   `json:"seed"`
	Err     *string  `json:"err"`
	MS      int      `json:"ms"`
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

func slowCase(c mazeCase) bool { return c.Type == 80 }

func TestPlaceMinimalMatchesJS(t *testing.T) {
	v := loadMazeVectors(t)

	ran, skipped := 0, 0
	for _, c := range v.Cases {
		if slowCase(c) && testing.Short() {
			skipped++
			continue
		}
		name := "type" + itoa(c.Type) + "_seed" + itoa(int(c.Seed))
		t.Run(name, func(t *testing.T) {
			if c.Err != nil {
				t.Skipf("the JS threw (%s); nothing to compare", *c.Err)
			}

			rng := jsutil.NewRand(c.Seed)
			g := NewMazeGenerator(c.Type, rng)
			got, err := g.PlaceMinimal()
			if err != nil {
				t.Fatalf("PlaceMinimal: %v (JS produced %d squares)", err, len(c.Squares))
			}

			if c.Width != nil && got.Width != *c.Width {
				t.Errorf("width = %d, JS gave %d", got.Width, *c.Width)
			}
			if c.Height != nil && got.Height != *c.Height {
				t.Errorf("height = %d, JS gave %d", got.Height, *c.Height)
			}

			if n := rng.Calls(); n != c.Draws {
				t.Errorf("consumed %d random draws, JS consumed %d (delta %+d)",
					n, c.Draws, int64(n)-int64(c.Draws))
			}

			if c.Squares == nil {
				if got.Squares != nil {
					t.Errorf("produced %d squares; JS gave up and returned null",
						len(got.Squares))
				}
				return
			}
			if len(got.Squares) != len(c.Squares) {
				t.Fatalf("%d squares, JS gave %d", len(got.Squares), len(c.Squares))
			}
			for i, want := range c.Squares {
				g := got.Squares[i]
				if g.X != want[0] || g.Y != want[1] || g.Size != want[2] {
					t.Errorf("square %d = (%d,%d,%d), JS gave (%d,%d,%d)",
						i, g.X, g.Y, g.Size, want[0], want[1], want[2])
					if i > 3 {
						t.Fatal("stopping after the first few; the sequences have parted company")
					}
				}
			}
			ran++
		})
	}
	if skipped > 0 {
		t.Logf("skipped %d expensive case(s) under -short", skipped)
	}
}

func TestMazeCorpusIsNotVacuous(t *testing.T) {
	v := loadMazeVectors(t)

	types := map[int]bool{}
	withSquares, totalSquares := 0, 0
	var maxDraws uint64
	for _, c := range v.Cases {
		types[c.Type] = true
		if c.Squares != nil {
			withSquares++
			totalSquares += len(c.Squares)
		}
		if c.Draws > maxDraws {
			maxDraws = c.Draws
		}
	}

	if len(types) < 15 {
		t.Errorf("only %d maze types in the corpus; runTrial dispatches on 18", len(types))
	}
	if withSquares < len(v.Cases)/2 {
		t.Errorf("only %d of %d cases produced squares", withSquares, len(v.Cases))
	}
	if totalSquares < 1000 {
		t.Errorf("%d squares across the whole corpus; too few to be exercising much",
			totalSquares)
	}
	if maxDraws < 1000 {
		t.Errorf("the heaviest case took %d draws; the corpus is not reaching the "+
			"trial loop", maxDraws)
	}
	t.Logf("%d cases, %d types, %d squares, heaviest case %d draws",
		len(v.Cases), len(types), totalSquares, maxDraws)
}

func itoa(n int) string {
	if n == 0 {
		return "0"
	}
	neg := n < 0
	if neg {
		n = -n
	}
	var b [20]byte
	i := len(b)
	for n > 0 {
		i--
		b[i] = byte('0' + n%10)
		n /= 10
	}
	if neg {
		i--
		b[i] = '-'
	}
	return string(b[i:])
}
