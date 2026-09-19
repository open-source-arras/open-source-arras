package ctrl

import (
	"testing"

	"arrasgo/internal/entity"
	"arrasgo/internal/vmath"
)

// TestTimeOfImpact tests against real Node output from vector.js.
func TestTimeOfImpact(t *testing.T) {
	cases := []struct {
		name       string
		p, v       vmath.Vec2
		s          float64
		want       float64
		wantIsZero bool
	}{
		{"headOn", vmath.Vec2{X: 100, Y: 0}, vmath.Vec2{X: -20, Y: 0}, 30, 2, false},
		{"perpendicular", vmath.Vec2{X: 50, Y: 50}, vmath.Vec2{X: 10, Y: -5}, 20, 5.268937748466109, false},
		{"equalSpeedLinear", vmath.Vec2{X: 100, Y: 0}, vmath.Vec2{X: -30, Y: 0}, 30, 1.6666666666666667, false},
		{"noSolution", vmath.Vec2{X: 100, Y: 0}, vmath.Vec2{X: 30, Y: 0}, 5, 0, true},
		{"receding", vmath.Vec2{X: 100, Y: 0}, vmath.Vec2{X: 30, Y: 0}, 30, 0, true},
	}
	for _, c := range cases {
		got := timeOfImpact(c.p, c.v, c.s)
		if c.wantIsZero {
			if got != 0 {
				t.Errorf("%s: got %v, want 0", c.name, got)
			}
			continue
		}
		if !almostEqual(got, c.want, 1e-9) {
			t.Errorf("%s: got %v, want %v", c.name, got, c.want)
		}
	}
}

// TestCompressMovement verifies the atan2-to-8-direction snap logic from controllers.js.
func TestCompressMovement(t *testing.T) {
	cases := []struct {
		name                string
		current, goal, want vmath.Vec2
	}{
		{"stepsWestTowardOrigin", vmath.Vec2{X: 10, Y: 0}, vmath.Vec2{X: 0, Y: 0}, vmath.Vec2{X: 9, Y: 0}},
		{"stepsEastTowardGoal", vmath.Vec2{X: 0, Y: 0}, vmath.Vec2{X: 10, Y: 0}, vmath.Vec2{X: 1, Y: 0}},
		{"stepsNorthTowardGoal", vmath.Vec2{X: 0, Y: 0}, vmath.Vec2{X: 0, Y: 10}, vmath.Vec2{X: 0, Y: 1}},
		{"stepsSouthwestTowardGoal", vmath.Vec2{X: 0, Y: 0}, vmath.Vec2{X: -10, Y: -10}, vmath.Vec2{X: -1, Y: -1}},
	}
	for _, c := range cases {
		if got := compressMovement(c.current, c.goal); got != c.want {
			t.Errorf("%s: got %+v, want %+v", c.name, got, c.want)
		}
	}
}

func TestCllOrientation(t *testing.T) {
	if got := cllOrientation(0, 0, 1, 1, 2, 2); got != 0 {
		t.Errorf("collinear: got %d, want 0", got)
	}
	if got := cllOrientation(0, 0, 0, 1, 1, 1); got != 1 {
		t.Errorf("clockwise: got %d, want 1", got)
	}
	if got := cllOrientation(0, 0, 1, 0, 1, 1); got != 2 {
		t.Errorf("counterclockwise: got %d, want 2", got)
	}
}

func TestCollisionLineLine(t *testing.T) {
	if !collisionLineLine(0, 0, 10, 10, 0, 10, 10, 0) {
		t.Error("crossing: expected true")
	}
	if collisionLineLine(0, 0, 10, 0, 0, 5, 10, 5) {
		t.Error("parallelDisjoint: expected false")
	}
	if !collisionLineLine(0, 0, 10, 0, 5, 0, 15, 0) {
		t.Error("collinearOverlapping: expected true")
	}
	if collisionLineLine(0, 0, 5, 0, 10, 0, 15, 0) {
		t.Error("collinearDisjoint: expected false")
	}
}

func TestWouldHitWall(t *testing.T) {
	w := newWorld(4)
	id, _ := spawnAt(w, 0, 0)
	ctx := baseContext(w, id, nil)

	ctx.JustHitAWall = func(entity.EntityID) bool { return true }
	if !wouldHitWall(ctx, vmath.Vec2{}, vmath.Vec2{}, true) {
		t.Error("direct: expected true from the sticky hook")
	}
	ctx.JustHitAWall = func(entity.EntityID) bool { return false }
	if wouldHitWall(ctx, vmath.Vec2{}, vmath.Vec2{}, true) {
		t.Error("direct: expected false from the sticky hook")
	}

	ctx.Walls = []WallHitbox{{
		Pos: vmath.Vec2{X: 50, Y: 0}, HitboxRadius: 10,
		Hitbox: [][2]vmath.Vec2{{{X: 0, Y: -10}, {X: 0, Y: 10}}},
	}}
	if !wouldHitWall(ctx, vmath.Vec2{X: 0, Y: 0}, vmath.Vec2{X: 100, Y: 0}, false) {
		t.Error("crossesWall: expected true")
	}

	ctx.Walls[0].Pos = vmath.Vec2{X: 5000, Y: 5000} // out of broad-phase reach
	if wouldHitWall(ctx, vmath.Vec2{X: 0, Y: 0}, vmath.Vec2{X: 100, Y: 0}, false) {
		t.Error("wallOutOfReach: expected false")
	}

	ctx.Walls = nil
	if wouldHitWall(ctx, vmath.Vec2{X: 0, Y: 0}, vmath.Vec2{X: 100, Y: 0}, false) {
		t.Error("noWalls: expected false")
	}
}

func TestNearestEntity(t *testing.T) {
	w := newWorld(8)
	a, _ := spawnAt(w, 10, 0)
	b, _ := spawnAt(w, 5, 0)
	c, _ := spawnAt(w, 2, 0)

	got, ok := nearestEntity(w, []entity.EntityID{a, b, c}, vmath.Vec2{}, nil)
	if !ok || got != c {
		t.Errorf("noFilter: got (%v,%v), want (%v,true)", got, ok, c)
	}

	got2, ok2 := nearestEntity(w, []entity.EntityID{a, b, c}, vmath.Vec2{}, func(id entity.EntityID, sqrDist float64) bool {
		return id != c
	})
	if !ok2 || got2 != b {
		t.Errorf("filterExcludesNearest: got (%v,%v), want (%v,true)", got2, ok2, b)
	}

	stale := entity.EntityID{}
	got3, ok3 := nearestEntity(w, []entity.EntityID{stale, c}, vmath.Vec2{}, nil)
	if !ok3 || got3 != c {
		t.Errorf("skipsStaleHandle: got (%v,%v), want (%v,true)", got3, ok3, c)
	}

	if _, ok4 := nearestEntity(w, nil, vmath.Vec2{}, nil); ok4 {
		t.Error("emptyCandidates: expected not found")
	}
}
