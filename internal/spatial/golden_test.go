package spatial

import (
	"encoding/json"
	"os"
	"path/filepath"
	"slices"
	"testing"
)

// These vectors come from running the real JS HashGrid.
type hgVectors struct {
	Scenarios []hgScenario `json:"scenarios"`
}

type hgScenario struct {
	Name     string     `json:"name"`
	Shift    uint       `json:"shift"`
	Note     string     `json:"note"`
	Entities []hgEntity `json:"entities"`
	Queries  [][4]int   `json:"queries"`
	Results  [][]int    `json:"results"`
}

type hgEntity struct {
	ID   int  `json:"id"`
	MinX int  `json:"minX"`
	MinY int  `json:"minY"`
	MaxX int  `json:"maxX"`
	MaxY int  `json:"maxY"`
	Bond bool `json:"bond"`
}

func TestQueryMatchesJSHashGrid(t *testing.T) {
	p := filepath.Join("..", "..", "gen", "hashgrid-vectors.json")
	raw, err := os.ReadFile(p)
	if err != nil {
		t.Fatalf("read %s: %v (run: node tools/gen-hashgrid-vectors.js)", p, err)
	}
	var vec hgVectors
	if err := json.Unmarshal(raw, &vec); err != nil {
		t.Fatalf("parse vectors: %v", err)
	}
	if len(vec.Scenarios) == 0 {
		t.Fatal("no scenarios loaded")
	}

	totalQueries, totalHits := 0, 0

	for _, s := range vec.Scenarios {
		t.Run(s.Name, func(t *testing.T) {
			// Entity ids are 0..N-1 and double as slab indices.
			boxes := make([]Box, len(s.Entities))
			for _, e := range s.Entities {
				if e.ID < 0 || e.ID >= len(boxes) {
					t.Fatalf("entity id %d outside 0..%d", e.ID, len(boxes)-1)
				}
				boxes[e.ID] = Box{
					MinX: float64(e.MinX), MinY: float64(e.MinY),
					MaxX: float64(e.MaxX), MaxY: float64(e.MaxY),
					Skip: e.Bond,
				}
			}

			g := New(s.Shift)
			// The JS inserts every entity, bonded ones included, they occupy
			// cells and are filtered at query time, not at insert.
			for _, e := range s.Entities {
				g.Insert(uint32(e.ID), boxes[e.ID].MinX, boxes[e.ID].MinY, boxes[e.ID].MaxX, boxes[e.ID].MaxY)
			}

			for i, q := range s.Queries {
				got := g.Query(float64(q[0]), float64(q[1]), float64(q[2]), float64(q[3]), boxes)
				ids := make([]int, len(got))
				for j, idx := range got {
					ids[j] = int(idx)
				}
				slices.Sort(ids)

				want := s.Results[i]
				if want == nil {
					want = []int{}
				}
				if !slices.Equal(ids, want) {
					t.Errorf("query %d %v:\n  go   %v\n  node %v\n  (%s)", i, q, ids, want, s.Note)
				}
				totalQueries++
				totalHits += len(want)
			}
		})
	}
	t.Logf("agreed with node on %d queries, %d total hits", totalQueries, totalHits)
}
