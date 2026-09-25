package room

import (
	"testing"

	"arrasgo/internal/vmath"
)

const roomsDumpPath = "../../gen/rooms.json"

// TestBuildGrid_RoomDefault pins room_default's real 15x15 grid, straight
func TestBuildGrid_RoomDefault(t *testing.T) {
	grid, geo, err := BuildGridFromPath(roomsDumpPath, []string{"room_default"}, 0, 420, 420)
	if err != nil {
		t.Skipf("gen/rooms.json unavailable (%v)", err)
	}
	if geo.XGrid != 15 || geo.YGrid != 15 {
		t.Fatalf("geometry = %dx%d, want 15x15", geo.XGrid, geo.YGrid)
	}
	wantRow0 := []string{"normal", "normal", "normal", "normal", "normal", "normal", "roid", "roid", "roid", "normal", "normal", "normal", "normal", "normal", "normal"}
	for x, want := range wantRow0 {
		cell := grid.Cells[0][x]
		got := ""
		if cell != nil {
			got = cell.Type.Key
		}
		if got != want {
			t.Errorf("row 0 col %d = %q, want %q", x, got, want)
		}
	}
	wantRow7 := []string{"roid", "roid", "normal", "normal", "normal", "nest", "nest", "nest", "nest", "nest", "normal", "normal", "normal", "roid", "roid"}
	for x, want := range wantRow7 {
		cell := grid.Cells[7][x]
		got := ""
		if cell != nil {
			got = cell.Type.Key
		}
		if got != want {
			t.Errorf("row 7 col %d = %q, want %q", x, got, want)
		}
	}
}

// TestBuildGrid_DominationOverlay pins the three-layer merge domination.js
func TestBuildGrid_DominationOverlay(t *testing.T) {
	grid, geo, err := BuildGridFromPath(roomsDumpPath, []string{"room_default", "room_tdm", "overlay_room_domination"}, 4, 420, 420)
	if err != nil {
		t.Skipf("gen/rooms.json unavailable (%v)", err)
	}
	if geo.XGrid != 15 || geo.YGrid != 15 {
		t.Fatalf("geometry = %dx%d, want 15x15", geo.XGrid, geo.YGrid)
	}

	check := func(row, col int, want string) {
		t.Helper()
		cell := grid.Cells[row][col]
		got := ""
		if cell != nil {
			got = cell.Type.Key
		}
		if got != want {
			t.Errorf("(row=%d,col=%d) = %q, want %q", row, col, got, want)
		}
	}
	check(0, 0, "base1")
	check(7, 3, "dominationTile")
	check(0, 6, "roid")
}

// TestBuildGrid_RoomTdmTeams2 pins room_tdm's special 2-team branch (down the
func TestBuildGrid_RoomTdmTeams2(t *testing.T) {
	grid, _, err := BuildGridFromPath(roomsDumpPath, []string{"room_default", "room_tdm"}, 2, 420, 420)
	if err != nil {
		t.Skipf("gen/rooms.json unavailable (%v)", err)
	}
	wantCol0 := []string{
		"base1", "baseprotected1", "base1", "base1", "baseprotected1",
		"base1", "base1", "baseprotected1", "base1", "base1",
		"baseprotected1", "base1", "base1", "baseprotected1", "base1",
	}
	for row, want := range wantCol0 {
		cell := grid.Cells[row][0]
		got := ""
		if cell != nil {
			got = cell.Type.Key
		}
		if got != want {
			t.Errorf("col 0 row %d = %q, want %q", row, got, want)
		}
	}
	if cell := grid.Cells[0][14]; cell == nil || cell.Type.Key != "base2" {
		t.Errorf("col 14 row 0 = %v, want base2", cell)
	}
}

// TestBuildGrid_UnknownRoomSetup checks a missing room_setup module name
func TestBuildGrid_UnknownRoomSetup(t *testing.T) {
	if _, _, err := BuildGridFromPath(roomsDumpPath, []string{"does_not_exist"}, 0, 420, 420); err == nil {
		t.Error("BuildGridFromPath with an unknown room_setup name returned nil error, want an error")
	}
}

// TestBuildGrid_UnknownTeamsForRoomTdm checks a team count outside the dumped
func TestBuildGrid_UnknownTeamsForRoomTdm(t *testing.T) {
	if _, _, err := BuildGridFromPath(roomsDumpPath, []string{"room_default", "room_tdm"}, 99, 420, 420); err == nil {
		t.Error("BuildGridFromPath with teams=99 (outside 1-8) returned nil error, want an error")
	}
}

// TestGrid_GetAt_ReproducesRowColSwap pins the swapped tileWidth/tileHeight
func TestGrid_GetAt_ReproducesRowColSwap(t *testing.T) {
	grid, _, err := BuildGridFromPath(roomsDumpPath, []string{"room_default"}, 0, 100, 200)
	if err != nil {
		t.Skipf("gen/rooms.json unavailable (%v)", err)
	}
	geo := RoomGeometry{XGrid: 15, YGrid: 15, TileWidth: 100, TileHeight: 200}
	pos := vmath.Vec2{X: -geo.Width()/2 + 50, Y: -geo.Height()/2 + 750} // Y = 750 -> row index floor(750/100)=7 under the bug
	tile, ok := grid.GetAt(geo, pos)
	if !ok || tile == nil {
		t.Fatalf("GetAt(%v) = (%v,%v), want a tile", pos, tile, ok)
	}
	if tile.GridY != 7 {
		t.Errorf("GetAt landed on row %d, want row 7 (Y=750 / tileWidth=100, the buggy pairing)", tile.GridY)
	}
}
