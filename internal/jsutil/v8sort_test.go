package jsutil

import (
	"encoding/json"
	"os"
	"path/filepath"
	"testing"
)

func TestSortRandomComparatorMatchesV8(t *testing.T) {
	path := filepath.Join("..", "..", "gen", "v8sort-vectors.json")
	raw, err := os.ReadFile(path)
	if err != nil {
		t.Fatalf("reading %s: %v (run `node tools/gen-v8sort-vectors.js > gen/v8sort-vectors.json`)", path, err)
	}
	var file struct {
		Seed  uint64 `json:"seed"`
		Cases []struct {
			N      int   `json:"n"`
			Trial  int   `json:"trial"`
			Draws  int   `json:"draws"`
			Result []int `json:"result"`
		} `json:"cases"`
	}
	if err := json.Unmarshal(raw, &file); err != nil {
		t.Fatalf("parsing %s: %v", path, err)
	}
	if len(file.Cases) == 0 {
		t.Fatal("no vectors")
	}

	// One generator for the whole file, exactly as the script had one for the whole
	// run: the draw stream carries across cases, so a case that spends the wrong
	// number of draws also fails every case after it.
	r := NewRand(file.Seed)
	for _, c := range file.Cases {
		arr := make([]int, c.N)
		for i := range arr {
			arr[i] = i
		}
		before := r.Calls()
		r.SortRandomComparator(arr)
		if got := int(r.Calls() - before); got != c.Draws {
			t.Fatalf("n=%d trial=%d: %d draws, want %d", c.N, c.Trial, got, c.Draws)
		}
		for i := range arr {
			if arr[i] != c.Result[i] {
				t.Fatalf("n=%d trial=%d: got %v, want %v", c.N, c.Trial, arr, c.Result)
			}
		}
	}
}
