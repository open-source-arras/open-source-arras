package maze

import (
	"reflect"
	"strconv"
	"testing"

	"arrasgo/internal/jsutil"
)

var mazeDims = map[int][2]int{
	0:  {32, 32},
	1:  {32, 32},
	2:  {32, 32},
	4:  {32, 32},
	8:  {32, 32},
	9:  {34, 34},
	10: {32, 24},
	11: {28, 28},
	12: {26, 26},
	13: {32, 32},
	14: {32, 32},
	15: {51, 33},
	16: {30, 22},
	17: {22, 30},
	18: {30, 24},
	19: {35, 35},
	20: {32, 32},
	80: {128, 128},
}

// gridFromRows transposes from row-major to column-major [x][y] shape.
func gridFromRows(rows [][]cellState) [][]cellState {
	height := len(rows)
	width := 0
	if height > 0 {
		width = len(rows[0])
	}
	out := newGrid(width, height)
	for y, row := range rows {
		for x, c := range row {
			out[x][y] = c
		}
	}
	return out
}

// TestIsClosedPinnedAgainstNode pins isClosed against real node output.
func TestIsClosedPinnedAgainstNode(t *testing.T) {
	cases := []struct {
		name       string
		mapString  string
		wantClosed bool
	}{
		{
			name: "isolated_pocket",
			mapString: `
@@@@@
@@@@@
@@-@@
@@@@@
@@@@@
`,
			wantClosed: true,
		},
		{
			name: "corridor_to_border",
			mapString: `
@@@@@
@@-@@
@@-@@
@@-@@
@@-@@
`,
			wantClosed: false,
		},
		{
			name: "mixed_one_bad_pocket",
			mapString: `
@@-@@@@
@@-@@-@
@@-@@-@
@@-@@-@
@@-@@@@
`,
			wantClosed: true,
		},
		{
			name: "all_open",
			mapString: `
-----
-----
-----
-----
-----
`,
			wantClosed: false,
		},
		{
			name: "hard_wall_has_no_open_cells",
			mapString: `
@@@@@
@@@@@
@@#@@
@@@@@
@@@@@
`,
			wantClosed: false,
		},
		{
			name:       "single_row_isolated",
			mapString:  `@@@-@@@`,
			wantClosed: false,
		},
		{
			name:       "single_row_open_end",
			mapString:  `-@@@@@@`,
			wantClosed: false,
		},
	}
	for _, c := range cases {
		t.Run(c.name, func(t *testing.T) {
			g := NewMazeGenerator(0, jsutil.NewRand(1))
			g.clear(c.mapString)
			if got := g.isClosed(); got != c.wantClosed {
				t.Errorf("isClosed() = %v, want %v", got, c.wantClosed)
			}
		})
	}
}

// TestMazeZoneIntoSquaresPinnedAgainstNode pins intoSquares against real node output.
func TestMazeZoneIntoSquaresPinnedAgainstNode(t *testing.T) {
	const F, T, H = cellEmpty, cellWall, cellHardWall

	cases := []struct {
		name       string
		rows       [][]cellState
		offX, offY int
		want       []Square
	}{
		{
			name: "solid_2x2",
			rows: [][]cellState{
				{T, T},
				{T, T},
			},
			want: []Square{{X: 0, Y: 0, Size: 2}},
		},
		{
			name: "l_tromino",
			rows: [][]cellState{
				{T, T},
				{T, F},
			},
			want: []Square{{X: 0, Y: 0, Size: 1}, {X: 0, Y: 1, Size: 1}, {X: 1, Y: 0, Size: 1}},
		},
		{
			name: "ring_3x3",
			rows: [][]cellState{
				{T, T, T},
				{T, F, T},
				{T, T, T},
			},
			want: []Square{
				{X: 0, Y: 1, Size: 1}, {X: 0, Y: 2, Size: 1}, {X: 1, Y: 0, Size: 1}, {X: 1, Y: 2, Size: 1},
				{X: 2, Y: 0, Size: 1}, {X: 2, Y: 1, Size: 1}, {X: 2, Y: 2, Size: 1}, {X: 0, Y: 0, Size: 1},
			},
		},
		{
			name: "solid_4x4",
			rows: [][]cellState{
				{T, T, T, T},
				{T, T, T, T},
				{T, T, T, T},
				{T, T, T, T},
			},
			want: []Square{{X: 0, Y: 0, Size: 4}},
		},
		{
			name: "offset_propagation",
			rows: [][]cellState{
				{T, T},
				{T, T},
			},
			offX: 10, offY: -3,
			want: []Square{{X: 10, Y: -3, Size: 2}},
		},
		{
			name: "hard_wall_is_still_filled",
			rows: [][]cellState{
				{H, T},
				{T, H},
			},
			want: []Square{{X: 0, Y: 0, Size: 2}},
		},
		{
			name: "plus_pentomino",
			rows: [][]cellState{
				{F, T, F},
				{T, T, T},
				{F, T, F},
			},
			want: []Square{
				{X: 0, Y: 1, Size: 1}, {X: 1, Y: 0, Size: 1}, {X: 1, Y: 2, Size: 1},
				{X: 2, Y: 1, Size: 1}, {X: 1, Y: 1, Size: 1},
			},
		},
		{
			name: "single_cell",
			rows: [][]cellState{{T}},
			want: []Square{{X: 0, Y: 0, Size: 1}},
		},
		{
			name: "empty_zone",
			rows: [][]cellState{
				{F, F},
				{F, F},
			},
			want: []Square{},
		},
		{
			name: "solid_3x2",
			rows: [][]cellState{
				{T, T},
				{T, T},
				{T, T},
			},
			want: []Square{{X: 0, Y: 0, Size: 2}, {X: 0, Y: 2, Size: 1}, {X: 1, Y: 2, Size: 1}},
		},
	}

	for _, c := range cases {
		t.Run(c.name, func(t *testing.T) {
			z := newMazeZone(gridFromRows(c.rows))
			z.offX, z.offY = c.offX, c.offY
			got := z.intoSquares()
			if !reflect.DeepEqual(got, c.want) {
				t.Errorf("intoSquares() = %+v, want %+v", got, c.want)
			}
		})
	}
}

// TestPlaceMinimalStructuralInvariants checks dimensions, bounds, overlap, and wall density.
func TestPlaceMinimalStructuralInvariants(t *testing.T) {
	for mazeType, dims := range mazeDims {
		wantW, wantH := dims[0], dims[1]
		for seed := uint64(1); seed <= 4; seed++ {
			t.Run(seedCaseName(mazeType, seed), func(t *testing.T) {
				g := NewMazeGenerator(mazeType, jsutil.NewRand(seed))
				result, err := g.PlaceMinimal()
				if err != nil {
					t.Fatalf("PlaceMinimal() error = %v", err)
				}
				if result.Width != wantW || result.Height != wantH {
					t.Fatalf("dimensions = %dx%d, want %dx%d", result.Width, result.Height, wantW, wantH)
				}
				checkSquaresWellFormed(t, result, mazeType)
			})
		}
	}
}

func checkSquaresWellFormed(t *testing.T, result Result, mazeType int) {
	t.Helper()
	if len(result.Squares) == 0 {
		t.Fatalf("type %d: no squares at all", mazeType)
	}
	covered := newBoolGrid(result.Width, result.Height)
	totalArea := 0
	for _, sq := range result.Squares {
		if sq.Size < 1 {
			t.Fatalf("type %d: square %+v has non-positive size", mazeType, sq)
		}
		if sq.X < 0 || sq.Y < 0 || sq.X+sq.Size > result.Width || sq.Y+sq.Size > result.Height {
			t.Fatalf("type %d: square %+v out of bounds for %dx%d", mazeType, sq, result.Width, result.Height)
		}
		for dx := 0; dx < sq.Size; dx++ {
			for dy := 0; dy < sq.Size; dy++ {
				x, y := sq.X+dx, sq.Y+dy
				if covered[x][y] {
					t.Fatalf("type %d: cell (%d,%d) covered by more than one square", mazeType, x, y)
				}
				covered[x][y] = true
			}
		}
		totalArea += sq.Size * sq.Size
	}
	cellCount := result.Width * result.Height
	density := float64(totalArea) / float64(cellCount)
	if density <= 0.01 || density >= 0.99 {
		t.Fatalf("type %d: wall density %.4f (%d/%d cells) outside a sensible range", mazeType, density, totalArea, cellCount)
	}
}

func seedCaseName(mazeType int, seed uint64) string {
	return "type" + strconv.Itoa(mazeType) + "_seed" + strconv.FormatUint(seed, 10)
}

// TestSameSeedSameMaze checks that identical seeds produce identical results.
func TestSameSeedSameMaze(t *testing.T) {
	for mazeType := range mazeDims {
		t.Run("type"+strconv.Itoa(mazeType), func(t *testing.T) {
			g1 := NewMazeGenerator(mazeType, jsutil.NewRand(42))
			r1, err := g1.PlaceMinimal()
			if err != nil {
				t.Fatalf("first PlaceMinimal() error = %v", err)
			}
			g2 := NewMazeGenerator(mazeType, jsutil.NewRand(42))
			r2, err := g2.PlaceMinimal()
			if err != nil {
				t.Fatalf("second PlaceMinimal() error = %v", err)
			}
			if !reflect.DeepEqual(r1, r2) {
				t.Fatalf("same seed produced different results:\n%+v\n%+v", r1, r2)
			}
		})
	}
}

// TestDifferentSeedsDifferentMaze checks that distinct seeds change the output.
func TestDifferentSeedsDifferentMaze(t *testing.T) {
	const mazeType = 0 // runNormal: 275 erode calls, plenty of room to differ
	var results []Result
	for seed := uint64(1); seed <= 5; seed++ {
		g := NewMazeGenerator(mazeType, jsutil.NewRand(seed))
		r, err := g.PlaceMinimal()
		if err != nil {
			t.Fatalf("seed %d: PlaceMinimal() error = %v", seed, err)
		}
		results = append(results, r)
	}
	for i := 1; i < len(results); i++ {
		if !reflect.DeepEqual(results[0], results[i]) {
			return // found a difference, as expected
		}
	}
	t.Fatalf("5 different seeds all produced identical results for type %d", mazeType)
}

// TestRunLineIsDeterministicRegardlessOfSeed checks runLine output is independent of seed.
func TestRunLineIsDeterministicRegardlessOfSeed(t *testing.T) {
	const mazeType = 17
	g1 := NewMazeGenerator(mazeType, jsutil.NewRand(1))
	r1, err := g1.PlaceMinimal()
	if err != nil {
		t.Fatalf("seed 1: PlaceMinimal() error = %v", err)
	}
	g2 := NewMazeGenerator(mazeType, jsutil.NewRand(999))
	r2, err := g2.PlaceMinimal()
	if err != nil {
		t.Fatalf("seed 999: PlaceMinimal() error = %v", err)
	}
	if !reflect.DeepEqual(r1, r2) {
		t.Fatalf("runLine differed across seeds, but it has no erode call:\n%+v\n%+v", r1, r2)
	}
}

// TestInvalidMazeTypeFails checks invalid mazeType returns an error.
func TestInvalidMazeTypeFails(t *testing.T) {
	g := NewMazeGenerator(9999, jsutil.NewRand(1))
	result, err := g.PlaceMinimal()
	if err == nil {
		t.Fatalf("PlaceMinimal() with an invalid type = %+v, nil error; want an error", result)
	}
}

// TestErodeSym4RequiresSquareMaze checks the square maze guard.
func TestErodeSym4RequiresSquareMaze(t *testing.T) {
	g := NewMazeGenerator(0, jsutil.NewRand(1))
	g.clear(`
--
--
--
`) // 2 wide, 3 tall: not square
	if err := g.erodeSym4(constraintNone, constraintNone); err == nil {
		t.Fatal("erodeSym4() on a non-square maze returned nil error, want an error")
	}
}

// TestConstraintOK checks the corner/side pass conditions.
func TestConstraintOK(t *testing.T) {
	cases := []struct {
		name        string
		c           erosionConstraint
		left, right bool
		want        bool
	}{
		{"none_both_false", constraintNone, false, false, true},
		{"none_both_true", constraintNone, true, true, true},
		{"either_both_false", constraintEither, false, false, false},
		{"either_left_only", constraintEither, true, false, true},
		{"either_right_only", constraintEither, false, true, true},
		{"either_both_true", constraintEither, true, true, true},
		{"exact_0_matches", erosionConstraint(0), false, false, true},
		{"exact_0_rejects_one", erosionConstraint(0), true, false, false},
		{"exact_1_matches_left", erosionConstraint(1), true, false, true},
		{"exact_1_matches_right", erosionConstraint(1), false, true, true},
		{"exact_1_rejects_zero", erosionConstraint(1), false, false, false},
		{"exact_1_rejects_two", erosionConstraint(1), true, true, false},
		{"exact_2_matches", erosionConstraint(2), true, true, true},
		{"exact_2_rejects_one", erosionConstraint(2), true, false, false},
	}
	for _, c := range cases {
		t.Run(c.name, func(t *testing.T) {
			if got := constraintOK(c.c, c.left, c.right); got != c.want {
				t.Errorf("constraintOK(%v, %v, %v) = %v, want %v", c.c, c.left, c.right, got, c.want)
			}
		})
	}
}

// TestErosionNeighborCoordsStayInBounds checks bounds safety for erosion neighbors.
func TestErosionNeighborCoordsStayInBounds(t *testing.T) {
	const w, h = 10, 10
	inBounds := func(t *testing.T, label string, x, y int) {
		t.Helper()
		if x < 0 || x >= w || y < 0 || y >= h {
			t.Errorf("%s = (%d,%d), out of bounds for %dx%d", label, x, y, w, h)
		}
	}
	cases := []struct {
		name            string
		x, y, direction int
	}{
		{"left_edge_forces_dir0", 0, 5, 0},
		{"top_edge_forces_dir1", 5, 0, 1},
		{"right_edge_forces_dir2", w - 1, 5, 2},
		{"bottom_edge_forces_dir3", 5, h - 1, 3},
		{"interior_dir0", 5, 5, 0},
		{"interior_dir1", 5, 5, 1},
		{"interior_dir2", 5, 5, 2},
		{"interior_dir3", 5, 5, 3},
	}
	for _, c := range cases {
		t.Run(c.name, func(t *testing.T) {
			lx, ly := cornerLeft(c.x, c.y, c.direction)
			inBounds(t, "cornerLeft", lx, ly)
			rx, ry := cornerRight(c.x, c.y, c.direction)
			inBounds(t, "cornerRight", rx, ry)
			slx, sly := sideLeft(c.x, c.y, c.direction)
			inBounds(t, "sideLeft", slx, sly)
			srx, sry := sideRight(c.x, c.y, c.direction)
			inBounds(t, "sideRight", srx, sry)
		})
	}
}
