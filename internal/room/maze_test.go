package room

import (
	"math"
	"testing"
)

// maze.js:5-39 with stubMaze's 2-square layout.
func TestMaze_GenerateSpawnsOneWallPerSquare(t *testing.T) {
	room := newGamemodeTestRoom(t, 81, "maze")
	roomW, roomH := room.Geometry.Width(), room.Geometry.Height()
	wantSize := roomW/2/2*1/lazyRealSize(4)*math.Sqrt2 - 2
	wantPositions := map[[2]float64]bool{
		{-roomW / 4, -roomH / 4}: false,
		{roomW / 4, roomH / 4}:   false,
	}

	maze := newMaze(room)
	if err := maze.Generate(); err != nil {
		t.Fatalf("Generate: %v", err)
	}
	if len(room.Walls) != 2 {
		t.Fatalf("len(Walls) = %d, want 2 (stubMaze's layout)", len(room.Walls))
	}
	for _, wall := range room.Walls {
		e := room.World.Get(wall.ID)
		if e == nil {
			t.Fatalf("tracked wall %v does not resolve", wall.ID)
		}
		if math.Abs(e.SIZE-wantSize) > 1e-9 {
			t.Errorf("wall SIZE = %v, want %v", e.SIZE, wantSize)
		}
		pos := room.World.Pos[wall.ID.Index]
		key := [2]float64{pos.X, pos.Y}
		if _, ok := wantPositions[key]; !ok {
			t.Errorf("wall at unexpected position %v, want one of %v", key, wantPositions)
			continue
		}
		wantPositions[key] = true
	}
	for pos, seen := range wantPositions {
		if !seen {
			t.Errorf("expected a wall at %v, found none", pos)
		}
	}
}

// Type 4 hardcoded in labyrinth.js.
func TestLabyrinth_GenerateAlwaysUsesType4(t *testing.T) {
	room := newGamemodeTestRoom(t, 82, "labyrinth")
	lab := newLabyrinth(room)
	if lab.Type != 4 {
		t.Fatalf("Labyrinth.Type = %d, want 4 regardless of config", lab.Type)
	}
	if err := lab.Generate(); err != nil {
		t.Fatalf("Generate: %v", err)
	}
	if len(room.Walls) != 2 {
		t.Fatalf("len(Walls) = %d, want 2 (stubMaze's layout)", len(room.Walls))
	}
}
