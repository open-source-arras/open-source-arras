package entity

import (
	"math"
	"reflect"
	"testing"

	"arrasgo/internal/vmath"
)

func newTestWorld(n int) *World {
	w := NewWorld(n)
	w.Tuning = testTuning()
	w.Room = RoomInfo{Width: 10000, Height: 10000}
	w.Now = func() int64 { return 1_700_000_000_000 }
	return w
}

// TestGraphFieldsAreHandles verifies entity graph fields are handles, not pointers.
func TestGraphFieldsAreHandles(t *testing.T) {
	et := reflect.TypeOf(Entity{})
	idType := reflect.TypeOf(EntityID{})
	sliceOfID := reflect.SliceOf(idType)

	for _, name := range []string{"Master", "Source", "Parent", "BulletParent", "Bond"} {
		f, ok := et.FieldByName(name)
		if !ok {
			t.Fatalf("Entity has no %s", name)
		}
		if f.Type != idType {
			t.Errorf("%s is %v, want EntityID", name, f.Type)
		}
	}
	for _, name := range []string{"Children", "BulletChildren", "Turrets", "Props", "CollisionArray"} {
		f, ok := et.FieldByName(name)
		if !ok {
			t.Fatalf("Entity has no %s", name)
		}
		if f.Type != sliceOfID {
			t.Errorf("%s is %v, want []EntityID", name, f.Type)
		}
	}
	entPtr := reflect.PointerTo(et)
	for i := 0; i < et.NumField(); i++ {
		f := et.Field(i)
		if f.Type == entPtr || f.Type == reflect.SliceOf(entPtr) {
			t.Errorf("field %s holds *Entity", f.Name)
		}
	}
}

func TestSelfReferentialGraphResolves(t *testing.T) {
	w := newTestWorld(4)
	id := w.Spawn()
	e := w.Get(id)
	if e.Source != id || e.Parent != id || e.BulletParent != id || e.Master != id {
		t.Errorf("a fresh entity should own itself: %+v", e.ID)
	}
	if w.Get(e.Source) != e {
		t.Error("self-reference did not resolve back to the same entity")
	}
	w.Destroy(id)
	if w.Get(id) != nil {
		t.Error("destroyed entity still resolves")
	}
}

// TestSpawnAppliesConstructorDefaults verifies spawn applies all constructor defaults.
func TestSpawnAppliesConstructorDefaults(t *testing.T) {
	w := newTestWorld(4)
	id := w.Spawn()
	e := w.Get(id)

	if e.SIZE != 1 || e.SizeMultiplier != 1 || e.Squiggle != 1 {
		t.Errorf("size fields = %v/%v/%v, want 1/1/1", e.SIZE, e.SizeMultiplier, e.Squiggle)
	}
	if e.Alpha != 1 || e.AlphaRange != [2]float64{0, 1} {
		t.Errorf("alpha = %v range %v, want 1 and [0 1]", e.Alpha, e.AlphaRange)
	}
	if e.Damp != 0.05 {
		t.Errorf("damp = %v, want 0.05", e.Damp)
	}
	if e.StepRemaining != 1 || e.ReverseTank != 1 {
		t.Errorf("stepRemaining %v reverseTank %v, want 1/1", e.StepRemaining, e.ReverseTank)
	}
	if e.FiringArc != [2]float64{0, 360} {
		t.Errorf("firingArc = %v, want [0 360]", e.FiringArc)
	}
	if e.NameColor != "#ffffff" || e.Blend.Color != "#FFFFFF" {
		t.Errorf("nameColor %q blend %q", e.NameColor, e.Blend.Color)
	}
	if !e.AllowedOnMinimap || e.AlwaysShowOnMinimap {
		t.Error("minimap defaults: allowed should be true, alwaysShow false")
	}
	if e.Health.Amount != 1 || e.Health.Mode != HealthStatic {
		t.Errorf("health = %+v, want a full static pool of 1", e.Health)
	}
	if e.Shield.Max != 0 || e.Shield.Mode != HealthDynamic {
		t.Errorf("shield = %+v, want an empty dynamic pool", e.Shield)
	}
	if e.Color.Compiled != "16 0 1 0 false" {
		t.Errorf("colour = %q, want the palette-16 default", e.Color.Compiled)
	}
	if e.Glow.Color != "-1 0 1 0 false" || e.Glow.Alpha != 1 || e.Glow.Recursion != 1 || e.Glow.HasRadius {
		t.Errorf("glow = %+v, want colour -1, alpha 1, recursion 1 and a null radius", e.Glow)
	}
	if e.Confinement != (Confinement{XMax: 10000, YMax: 10000}) {
		t.Errorf("confinement = %+v, want the room box", e.Confinement)
	}
	if !e.Activation.Active || e.Activation.Timer != 15 {
		t.Errorf("activation = %+v", e.Activation)
	}
	if e.AntiNaN.X != 1 || e.AntiNaN.Y != 1 {
		t.Errorf("antiNaN seed = %v,%v, want 1,1", e.AntiNaN.X, e.AntiNaN.Y)
	}
	if e.CreationTimeMS != 1_700_000_000_000 || e.LastFiredTime != e.CreationTimeMS ||
		e.LastMovementTime != e.CreationTimeMS {
		t.Errorf("timestamps = %d/%d/%d", e.CreationTimeMS, e.LastMovementTime, e.LastFiredTime)
	}
	for i, c := range e.Skill.Caps {
		if c != 9 {
			t.Fatalf("skill cap[%d] = %d, want 9", i, c)
		}
	}
	if e.Skill.Spd != 1.5 {
		t.Errorf("skill.spd = %v, want the 1.5 a zeroed skill gives", e.Skill.Spd)
	}
	if !w.Flag[id.Index].Has(FlagActive) {
		t.Error("FlagActive should mirror activation.active")
	}
	if w.Flag[id.Index].Has(FlagInGrid) {
		t.Error("isInGrid starts false (entity.js:26)")
	}
}

// TestSpawnWithoutTuningLeavesSkillZeroed verifies skill stays zeroed without Tuning.
func TestSpawnWithoutTuningLeavesSkillZeroed(t *testing.T) {
	w := NewWorld(2)
	e := w.Get(w.Spawn())
	if e.Skill.Caps != [SkillCount]int32{} {
		t.Errorf("skill caps = %v, want zeroed without Tuning", e.Skill.Caps)
	}
	if e.SIZE != 1 {
		t.Errorf("the rest of the defaults should still apply: SIZE = %v", e.SIZE)
	}
}

// TestWireIDIsMonotonicAcrossSlotReuse verifies wire IDs never reuse values.
func TestWireIDIsMonotonicAcrossSlotReuse(t *testing.T) {
	w := newTestWorld(4)
	a := w.Spawn()
	b := w.Spawn()
	if w.Get(a).WireID != 0 || w.Get(b).WireID != 1 {
		t.Fatalf("wire ids = %d,%d; want 0,1", w.Get(a).WireID, w.Get(b).WireID)
	}
	w.Destroy(a)
	c := w.Spawn()
	if c.Index != a.Index {
		t.Fatalf("expected slot reuse, got index %d", c.Index)
	}
	if got := w.Get(c).WireID; got != 2 {
		t.Errorf("recycled slot got wire id %d, want 2", got)
	}
}

// TestTeamDefaultsToOwnWireID verifies team defaults to the entity's own wire ID.
func TestTeamDefaultsToOwnWireID(t *testing.T) {
	w := newTestWorld(4)
	w.Spawn()
	b := w.Spawn()
	if got := w.Get(b).Team; got != 1 {
		t.Errorf("team = %d, want the entity's own wire id 1", got)
	}
}

// TestUpdateAABBGridGate verifies the grid gate on activation and colliding bonds.
func TestUpdateAABBGridGate(t *testing.T) {
	cases := []struct {
		name          string
		active        bool
		bonded        bool
		collidingBond bool
		wantInGrid    bool
	}{
		{"plain active entity", true, false, false, true},
		{"inactive", false, false, false, false},
		{"bonded", true, true, false, false},
		{"bonded but colliding", true, true, true, true},
		{"inactive and colliding-bonded", false, true, true, false},
	}
	for _, c := range cases {
		t.Run(c.name, func(t *testing.T) {
			w := newTestWorld(4)
			id := w.Spawn()
			e := w.Get(id)
			e.CollidingBond = c.collidingBond
			if !c.active {
				w.Flag[id.Index] &^= FlagActive
			}
			if c.bonded {
				w.Flag[id.Index] |= FlagBonded
			}
			w.UpdateAABB(id)

			if got := w.Flag[id.Index].Has(FlagInGrid); got != c.wantInGrid {
				t.Errorf("FlagInGrid = %v, want %v", got, c.wantInGrid)
			}
			if got := w.Boxes[id.Index].Skip; got != c.bonded {
				t.Errorf("Box.Skip = %v, want %v (bonded)", got, c.bonded)
			}
		})
	}
}

func TestUpdateAABBBoxFollowsPositionAndSize(t *testing.T) {
	w := newTestWorld(4)
	id := w.Spawn()
	w.Pos[id.Index] = vmath.Vec2{X: -30, Y: 12}
	w.Size[id.Index] = 4
	w.UpdateAABB(id)

	b := w.Boxes[id.Index]
	if b.MinX != -34 || b.MaxX != -26 || b.MinY != 8 || b.MaxY != 16 {
		t.Errorf("box = %+v, want -34/-26/8/16", b)
	}
}

func TestAddAndRemoveFromGrid(t *testing.T) {
	w := newTestWorld(4)
	id := w.Spawn()

	w.AddToGrid(id)
	if !w.Flag[id.Index].Has(FlagInGrid) {
		t.Error("AddToGrid did not set FlagInGrid")
	}
	w.RemoveFromGrid(id)
	if w.Flag[id.Index].Has(FlagInGrid) {
		t.Error("RemoveFromGrid did not clear FlagInGrid")
	}

	w.Flag[id.Index] |= FlagBonded
	w.AddToGrid(id)
	if w.Flag[id.Index].Has(FlagInGrid) {
		t.Error("a bonded entity joined the grid")
	}
	w.Get(id).CollidingBond = true
	w.AddToGrid(id)
	if !w.Flag[id.Index].Has(FlagInGrid) {
		t.Error("a colliding-bond entity should still join the grid")
	}
}

// TestAntiNaNRollsBackAndCounts verifies antiNaN tracks and rolls back bad values.
func TestAntiNaNRollsBackAndCounts(t *testing.T) {
	w := newTestWorld(4)
	id := w.Spawn()
	i := id.Index

	w.Pos[i] = vmath.Vec2{X: 40, Y: 50}
	w.Vel[i] = vmath.Vec2{X: 1, Y: 2}
	w.AntiNaNUpdate(id) // snapshot a good tick

	nan := math.NaN()
	w.Pos[i] = vmath.Vec2{X: nan, Y: 50}
	w.AntiNaNUpdate(id)

	if w.Pos[i].X != 40 || w.Pos[i].Y != 50 || w.Vel[i].X != 1 || w.Vel[i].Y != 2 {
		t.Errorf("not rolled back: pos %+v vel %+v", w.Pos[i], w.Vel[i])
	}
	if w.Get(id).AntiNaN.NansInARow != 1 {
		t.Errorf("strike count = %d, want 1", w.Get(id).AntiNaN.NansInARow)
	}
	w.AntiNaNUpdate(id)
	if w.Get(id).AntiNaN.NansInARow != 0 {
		t.Errorf("a clean tick should decrement: %d", w.Get(id).AntiNaN.NansInARow)
	}
}

func TestAntiNaNKillsAfterFiftyOneStrikes(t *testing.T) {
	w := newTestWorld(4)
	id := w.Spawn()
	w.Get(id).Health.Set(100, 0)

	nan := math.NaN()
	for n := 0; n < 50; n++ {
		w.Accel[id.Index] = vmath.Vec2{X: nan}
		w.AntiNaNUpdate(id)
	}
	if w.Get(id).IsDead() {
		t.Fatalf("killed at %d strikes; the JS waits for the count to exceed 50",
			w.Get(id).AntiNaN.NansInARow)
	}
	w.Accel[id.Index] = vmath.Vec2{X: nan}
	w.AntiNaNUpdate(id)
	if !w.Get(id).IsDead() {
		t.Error("51 strikes in a row should kill the entity")
	}
}

func testSizeContext(w *World, growth bool) SizeContext {
	return SizeContext{Tuning: w.Tuning, Growth: growth, GenericTankSIZE: 12}
}

// TestComputeSizeBaseAndCoreSize verifies size computation uses base and CoreSize.
func TestComputeSizeBaseAndCoreSize(t *testing.T) {
	w := newTestWorld(4)
	id := w.Spawn()
	e := w.Get(id)
	e.SIZE = 20
	e.SizeMultiplier = 2

	if got := w.ComputeSize(id, testSizeContext(w, false)); got != 40 {
		t.Errorf("size = %v, want 40", got)
	}
	e.CoreSize = 5
	if got := w.ComputeSize(id, testSizeContext(w, false)); got != 10 {
		t.Errorf("CoreSize should win over SIZE: %v, want 10", got)
	}
	e.CoreSize = 0
	if got := w.ComputeSize(id, testSizeContext(w, false)); got != 40 {
		t.Errorf("a zero CoreSize should fall back to SIZE: %v", got)
	}
}

// TestComputeSizeHealthWithLevel verifies health-with-level growth computation.
func TestComputeSizeHealthWithLevel(t *testing.T) {
	w := newTestWorld(4)
	id := w.Spawn()
	e := w.Get(id)
	e.SIZE = 10
	e.Settings.HealthWithLevel = true

	e.Skill.Level = 0
	if got := w.ComputeSize(id, testSizeContext(w, false)); got != 10 {
		t.Errorf("at level 0: %v, want 10", got)
	}
	e.Skill.Level = 45
	if got := w.ComputeSize(id, testSizeContext(w, false)); got != 20 {
		t.Errorf("at level 45: %v, want 20", got)
	}
	e.Skill.Level = 120
	if got := w.ComputeSize(id, testSizeContext(w, false)); got != 20 {
		t.Errorf("past the level cap: %v, want 20", got)
	}
	e.LevelCap, e.HasLevelCap = 22, true
	want := 10 * (1 + 22.0/45.0)
	if got := w.ComputeSize(id, testSizeContext(w, false)); got != want {
		t.Errorf("with LEVEL_CAP 22: %v, want %v", got, want)
	}
}

// TestComputeSizePastFortyFiveNeedsPlayerOrBot verifies growth past level 45 needs player/bot.
func TestComputeSizePastFortyFiveNeedsPlayerOrBot(t *testing.T) {
	w := newTestWorld(4)
	w.Room = RoomInfo{Width: 32000}
	id := w.Spawn()
	e := w.Get(id)
	e.SIZE = 10
	e.LevelCap, e.HasLevelCap = 120, true
	e.Skill.Level = 60
	e.Skill.Score = 26263 + 3e6

	ctx := testSizeContext(w, true)
	if got := w.ComputeSize(id, ctx); got != 10 {
		t.Errorf("a non-player past 45 should not grow: %v, want 10", got)
	}

	w.Flag[id.Index] |= FlagPlayer
	wallSize := (32000.0 / 32 / 2) * math.Sqrt2 * 1.065
	want := 10 * (1 + (wallSize / 12 / 2))
	if got := w.ComputeSize(id, ctx); got != want {
		t.Errorf("player past 45: %v, want %v", got, want)
	}
	if got := w.ComputeSize(id, testSizeContext(w, false)); got != 10 {
		t.Errorf("without Config.growth the past-45 term must not fire: %v", got)
	}
}

func TestLevelIsCappedBothWays(t *testing.T) {
	w := newTestWorld(4)
	e := w.Get(w.Spawn())
	e.Skill.Level = 60

	if got := e.Level(w.Tuning); got != 45 {
		t.Errorf("level = %d, want Config.level_cap 45", got)
	}
	e.LevelCap, e.HasLevelCap = 10, true
	if got := e.Level(w.Tuning); got != 10 {
		t.Errorf("level = %d, want the entity's own cap 10", got)
	}
	e.Skill.Level = 3
	if got := e.Level(w.Tuning); got != 3 {
		t.Errorf("level = %d, want the raw skill level 3", got)
	}
}

// TestUpdateBodyInfoUsesComputedSize verifies fov scales with computed size.
func TestUpdateBodyInfoUsesComputedSize(t *testing.T) {
	w := newTestWorld(4)
	id := w.Spawn()
	e := w.Get(id)
	e.SIZE = 16
	e.FOV = 2

	w.UpdateBodyInfo(id, testSizeContext(w, false))
	if e.Fov != 2*275*4 {
		t.Errorf("fov = %v, want %v", e.Fov, 2*275*4.0)
	}
}

func TestKillAndIsDead(t *testing.T) {
	w := newTestWorld(4)
	id := w.Spawn()
	e := w.Get(id)
	e.Health.Set(100, 0)
	e.Invuln = true
	e.Godmode = true

	if e.IsDead() {
		t.Fatal("a full entity is not dead")
	}
	w.Kill(id)
	if e.Invuln || e.Godmode {
		t.Error("kill clears invulnerability first (entity.js:1245-1246)")
	}
	if e.Health.Amount != -100 || !e.IsDead() {
		t.Errorf("health = %v after kill, want -100", e.Health.Amount)
	}
}

// TestDamageMultiplier verifies only swarms have damage scaling.
func TestDamageMultiplier(t *testing.T) {
	e := Entity{Type: "tank", Range: 0, RANGE: 100}
	if got := e.DamageMultiplier(); got != 1 {
		t.Errorf("tank multiplier = %v, want 1", got)
	}

	e.Type = "swarm"
	if got := e.DamageMultiplier(); got != 0.25 {
		t.Errorf("spent swarm = %v, want 0.25", got)
	}
	e.Range = 101
	if got := e.DamageMultiplier(); got != 1.75 {
		t.Errorf("fresh swarm = %v, want 1.75", got)
	}
	e.Range = 50.5
	if got := e.DamageMultiplier(); got != 1 {
		t.Errorf("half-spent swarm = %v, want 1", got)
	}
}

// TestShapeDataCarriesAllThreeArms verifies ShapeData carries all three forms.
func TestShapeDataCarriesAllThreeArms(t *testing.T) {
	for _, sd := range []ShapeData{
		{Kind: ShapeNumber, Number: 5},
		{Kind: ShapeString, String: "3d=0.1,0.1,0.1"},
		{Kind: ShapePolygon, Polygon: [][2]float64{{-0.2, -0.5}, {0.2, 0.5}}},
		{Kind: ShapeNone},
	} {
		e := Entity{ShapeData: sd}
		if e.ShapeData.Kind != sd.Kind {
			t.Errorf("kind did not round-trip: %+v", e.ShapeData)
		}
	}
}
