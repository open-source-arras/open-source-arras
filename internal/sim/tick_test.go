package sim

import (
	"fmt"
	"testing"

	"arrasgo/internal/config"
	"arrasgo/internal/entity"
	"arrasgo/internal/spatial"
	"arrasgo/internal/vmath"
)

func newTestSim(capacity int) *Sim {
	tuning := &config.Tuning{
		RunSpeed:            1.5,
		GameSpeed:           1,
		RoomBoundForce:      0.01,
		DamageMultiplier:    1,
		KnockbackMultiplier: 0.75,
		RegenerateTick:      100,
		SkillCap:            9,
		GlassHealthFactor:   1,
		LevelCap:            45,
	}
	w := entity.NewWorld(capacity)
	w.Tuning = tuning
	w.Room = entity.RoomInfo{Width: 6300, Height: 6300}
	w.Now = func() int64 { return 0 }

	s := New(w, spatial.New(7))
	s.Tuning = tuning
	s.Room = Room{Width: 6300, Height: 6300}
	// ViewCheck stands in for a client watching the whole room.
	s.Hooks.ViewCheck = func(entity.EntityID, float64) bool { return true }
	return s
}

func (s *Sim) spawnAt(x, y, size float64) entity.EntityID {
	id := s.W.Spawn()
	s.Track(id)
	e := s.W.Get(id)
	e.Type = "tank"
	e.SIZE = size
	e.SizeMultiplier = 1
	e.Health = entity.NewHealthType(1e9, entity.HealthStatic, 0)
	e.Density = 1
	e.Penetration = 1
	e.Pushability = 1
	e.MaxSpeed = 10
	e.TopSpeed = 10
	e.Damp = 0.05
	e.Alpha = 1
	s.W.Pos[id.Index] = vmath.Vec2{X: float64(x), Y: float64(y)}
	s.W.Size[id.Index] = s.W.ComputeSize(id, s.sizeContext())
	return id
}

// TestProfilerIsCompiledOut guards docs/found-bugs.md #2.
func TestProfilerIsCompiledOut(t *testing.T) {
	if profiling {
		t.Fatal("profiling is on: the tick loop is paying for instrumentation")
	}
	var l logger
	l.set()
	l.mark()
	l.tally()
	if len(l.logTimes) != 0 || l.tallyCount != 0 || l.trackingStart != 0 {
		t.Errorf("a logger did work with profiling off: %+v", l)
	}
}

// TestSlowLoopsFireOnTheJSSchedule pins the four-loop schedule.
func TestSlowLoopsFireOnTheJSSchedule(t *testing.T) {
	s := newTestSim(4)
	var fired []string
	s.Loops.Maintain = func() { fired = append(fired, "maintain") }
	s.Loops.Other = func() { fired = append(fired, "other") }
	s.Loops.Food = func() { fired = append(fired, "game") }

	got := make([]string, 0, 60)
	for tick := 0; tick < 60; tick++ {
		fired = fired[:0]
		s.Step()
		got = append(got, fmt.Sprint(fired))
	}

	for tick, line := range got {
		var want []string
		if (tick+1)%30 == 0 {
			want = append(want, "maintain")
		}
		if (tick+1)%6 == 0 {
			want = append(want, "other")
		}
		want = append(want, "game") // gameloop's trailing statements, every tick
		if line != fmt.Sprint(want) {
			t.Errorf("tick %d fired %s, want %s", tick, line, fmt.Sprint(want))
		}
	}
}

func TestHealingLoopRunsEveryThirdTick(t *testing.T) {
	s := newTestSim(4)
	id := s.spawnAt(0, 0, 10)
	e := s.W.Get(id)
	e.Health = entity.NewHealthType(100, entity.HealthStatic, 0)
	e.Health.Amount = 50
	// A static pool only regenerates on the boost, and the boost is only non-zero when
	// the shield is full (game/index.js:372).
	e.Shield = entity.NewHealthType(10, entity.HealthDynamic, 0)

	ticks := 0
	for tick := 0; tick < 12; tick++ {
		before := s.W.Get(id).Health.Amount
		s.Step()
		if s.W.Get(id).Health.Amount != before {
			ticks++
			if (tick+1)%3 != 0 {
				t.Errorf("health regenerated on tick %d, which is not a healing tick", tick)
			}
		}
	}
	if ticks == 0 {
		t.Error("health never regenerated in twelve ticks")
	}
}

func TestQueryThenInsertOrdering(t *testing.T) {
	s := newTestSim(8)
	var seen []string
	s.Hooks.OnCollide = func(a, b entity.EntityID) {
		// The dispatcher emits both directions. only record the first.
		if len(seen)%2 == 0 {
			seen = append(seen, fmt.Sprintf("%d-%d", a.Index, b.Index))
		} else {
			seen = append(seen, "")
		}
	}
	for i := 0; i < 3; i++ {
		id := s.spawnAt(0, 0, 10)
		s.W.Get(id).Settings.NoCollisions = true
	}
	s.Step()

	var pairs []string
	for _, p := range seen {
		if p != "" {
			pairs = append(pairs, p)
		}
	}
	want := []string{"1-0", "2-0", "2-1"}
	if fmt.Sprint(pairs) != fmt.Sprint(want) {
		t.Errorf("collision pairs %v, want %v — each entity must only meet earlier ones",
			pairs, want)
	}
}

// TestStaleAABBIsStillQueried pins docs/found-bugs.md #8.
func TestStaleAABBIsStillQueried(t *testing.T) {
	s := newTestSim(8)
	target := s.spawnAt(0, 0, 20)
	s.W.Get(target).Settings.NoCollisions = true

	turret := s.spawnAt(0, 0, 20)
	s.W.Get(turret).Settings.NoCollisions = true

	var hits int
	s.Hooks.OnCollide = func(a, b entity.EntityID) {
		if a == turret && b == target {
			hits++
		}
	}

	s.Step() // both unbonded and overlapping: the turret's box is built at the origin
	if hits == 0 {
		t.Fatal("the two overlapping entities never met")
	}

	s.W.Get(turret).Bond = target
	s.W.Flag[turret.Index] |= entity.FlagBonded
	s.W.Pos[turret.Index] = vmath.Vec2{X: 3000, Y: 3000}

	hits = 0
	s.Step()
	if hits == 0 {
		t.Error("the bonded turret stopped colliding at its ghost rectangle; " +
			"found-bugs.md #8 says the JS keeps querying with the stale box")
	}
	box := s.W.Boxes[turret.Index]
	if box.MinX != -20 || box.MaxX != 20 {
		t.Errorf("the bonded turret's box moved to %v; updateAABB must leave it stale", box)
	}
}

func TestEntitySpawnedDuringTickIsTicked(t *testing.T) {
	s := newTestSim(8)
	first := s.spawnAt(0, 0, 10)

	var born entity.EntityID
	var ticked []entity.EntityID
	s.Hooks.OnTick = func(id entity.EntityID) {
		ticked = append(ticked, id)
		if id == first && !born.Valid() {
			born = s.spawnAt(500, 500, 10)
		}
	}
	s.Step()

	if !born.Valid() {
		t.Fatal("nothing was spawned")
	}
	found := false
	for _, id := range ticked {
		if id == born {
			found = true
		}
	}
	if !found {
		t.Error("an entity spawned mid-tick was not ticked; a JS Map iterator would have visited it")
	}
}

func TestDestroyedEntityIsSkippedAndCompacted(t *testing.T) {
	s := newTestSim(8)
	first := s.spawnAt(0, 0, 10)
	_ = s.spawnAt(1000, 0, 10)
	doomed := s.spawnAt(2000, 0, 10)

	var ticked int
	s.Hooks.OnTick = func(id entity.EntityID) {
		ticked++
		if id == first {
			s.W.Destroy(doomed)
		}
	}
	s.Step()
	if ticked != 2 {
		t.Errorf("%d entities ticked, want 2 — the destroyed one should have been skipped", ticked)
	}
	if s.Count() != 2 {
		t.Errorf("%d entities tracked after the tick, want 2", s.Count())
	}
}

// TestActivationParksForSixteenTicks pins subFunctions.js:15.
func TestActivationParksForSixteenTicks(t *testing.T) {
	s := newTestSim(4)
	id := s.spawnAt(0, 0, 10)
	s.setActive(id, false)
	s.W.Get(id).Activation.Timer = 15

	for i := 1; i <= 20; i++ {
		s.ActivationUpdate(id)
		active := s.W.Get(id).Activation.Active
		if i < 16 && active {
			t.Fatalf("reactivated after %d inactive updates, expected 16", i)
		}
		if i == 16 && !active {
			t.Fatal("still inactive after 16 updates")
		}
		if i >= 16 {
			break
		}
	}
}

func TestActivationFollowsViewCheck(t *testing.T) {
	s := newTestSim(4)
	id := s.spawnAt(0, 0, 10)

	s.Hooks.ViewCheck = func(entity.EntityID, float64) bool { return false }
	s.ActivationUpdate(id)
	if s.W.Get(id).Activation.Active {
		t.Error("an unseen non-player stayed active")
	}
	if s.W.Flag[id.Index].Has(entity.FlagActive) {
		t.Error("FlagActive did not follow Activation.Active")
	}

	player := s.spawnAt(0, 0, 10)
	s.W.Flag[player.Index] |= entity.FlagPlayer
	s.ActivationUpdate(player)
	if !s.W.Get(player).Activation.Active {
		t.Error("a player was parked")
	}
}

// TestRestoreWallEffectsNeedsFalseNotUnset pins the `=== false` at game/index.js:259.
func TestRestoreWallEffectsNeedsFalseNotUnset(t *testing.T) {
	s := newTestSim(4)
	id := s.spawnAt(0, 0, 10)
	e := s.W.Get(id)
	e.SIZE = 20
	e.OriginalSize = 10
	e.CollisionArray = append(e.CollisionArray, id) // non-empty, as a wall hit leaves it

	s.restoreWallEffects(id, e)
	if e.SIZE != 20 {
		t.Errorf("SIZE restored to %v while touchingSizeWall was still unset", e.SIZE)
	}

	s.setTouchingWalls(id, triFalse, triUnset)
	s.restoreWallEffects(id, e)
	if e.SIZE != 10 || e.OriginalSize != 0 {
		t.Errorf("SIZE = %v, OriginalSize = %v after the flag went false; want 10 and 0",
			e.SIZE, e.OriginalSize)
	}
}

// TestDroneCollisionBufferIsInfiniteWhenBothAreStill pins the missing `+ 10` at game/index.js:110.
func TestDroneCollisionBufferIsInfiniteWhenBothAreStill(t *testing.T) {
	s := newTestSim(4)
	a := s.spawnAt(0, 0, 10)
	b := s.spawnAt(12, 0, 10)
	for _, id := range []entity.EntityID{a, b} {
		e := s.W.Get(id)
		e.Team = 5
		e.Settings.HitsOwnType = "droneCollision"
	}
	s.Collide(b, a)

	if !isNaN64(s.W.Accel[a.Index].X) {
		t.Errorf("accel.x = %v, want NaN — the missing `+ 10` divides by zero",
			s.W.Accel[a.Index].X)
	}
}

func isNaN64(f float64) bool { return f != f }

func TestWallDispatchPicksResolverByShape(t *testing.T) {
	s := newTestSim(8)

	round := s.spawnAt(0, 0, 40)
	rw := s.W.Get(round)
	rw.Type = "wall"
	rw.Shape = 0
	rw.Team = -101

	body := s.spawnAt(30, 10, 10)
	s.W.Get(body).Team = 1
	s.Collide(body, round)
	if s.W.Pos[body.Index].X == 30 && s.W.Pos[body.Index].Y == 10 {
		t.Error("a round wall did not move the body; mooncollide should place it on the edge")
	}

	maze := s.spawnAt(500, 0, 30)
	mw := s.W.Get(maze)
	mw.Type = "wall"
	mw.Shape = 4
	mw.Walltype = 1
	mw.Team = -101

	tank := s.spawnAt(475, 3, 10)
	s.W.Get(tank).Team = 1
	s.Collide(tank, maze)
	if s.W.Vel[tank.Index].X != 0 || s.W.Pos[tank.Index].X >= 475 {
		t.Errorf("a maze wall left the tank at x=%v vx=%v; mazewallcollide should push it out",
			s.W.Pos[tank.Index].X, s.W.Vel[tank.Index].X)
	}
}

func TestGhostAndDeadCollideBranchDestroys(t *testing.T) {
	s := newTestSim(8)
	a := s.spawnAt(0, 0, 10)
	b := s.spawnAt(5, 0, 10)
	s.W.Get(b).Health.Amount = 0
	s.W.Flag[b.Index] |= entity.FlagInGrid

	var destroyed entity.EntityID
	s.Hooks.Destroy = func(id entity.EntityID) { destroyed = id; s.W.Destroy(id) }
	s.Collide(a, b)
	if destroyed != b {
		t.Errorf("destroyed %v, want the dead entity %v", destroyed, b)
	}

	c := s.spawnAt(0, 0, 10)
	d := s.spawnAt(5, 0, 10)
	s.W.Get(d).Health.Amount = 0
	s.W.Flag[d.Index] &^= entity.FlagInGrid
	destroyed = entity.EntityID{}
	s.Collide(c, d)
	if destroyed.Valid() {
		t.Error("a dead entity that was not in the grid was destroyed anyway")
	}
}

// TestSettingsDamageTypeIsAlwaysZero pins the read at collisionFunctions.js:254.
func TestSettingsDamageTypeIsAlwaysZero(t *testing.T) {
	s := newTestSim(4)
	id := s.spawnAt(0, 0, 10)
	if s.W.Get(id).Settings.DamageType != 0 {
		t.Error("Settings.DamageType is no longer zero by default; the JS comparison against 1 is dead")
	}
}

// buildCrowd creates overlapping bodies with all phases doing real work.
func buildCrowd(n int) *Sim {
	s := newTestSim(n + 8)
	side := 1
	for side*side < n {
		side++
	}
	for i := 0; i < n; i++ {
		x := float64(i%side) * 15
		y := float64(i/side) * 15
		id := s.spawnAt(x, y, 10)
		e := s.W.Get(id)
		e.Team = int32(i % 2)
		e.Intangibility = 1
		e.Damage = 0
	}
	return s
}

// TestTickLoopDoesNotAllocate asserts the tick path allocates nothing in the steady state.
func TestTickLoopDoesNotAllocate(t *testing.T) {
	s := buildCrowd(2000)
	for i := 0; i < 20; i++ {
		s.Step() // let the collision arrays, grid cells and stamp table reach their size
	}

	pairs := 0
	for _, id := range s.order {
		if e := s.W.Get(id); e != nil {
			pairs += len(e.CollisionArray)
		}
	}
	if pairs < 1000 {
		t.Fatalf("only %d collisions in the last tick; the measurement below would be vacuous", pairs)
	}

	if n := testing.AllocsPerRun(20, s.Step); n != 0 {
		t.Errorf("the tick loop allocates %v times per tick, want 0", n)
	}
	t.Logf("2000 entities, %d collision-array entries on the measured tick", pairs)
}

func BenchmarkTick2000(b *testing.B) {
	s := buildCrowd(2000)
	for i := 0; i < 20; i++ {
		s.Step()
	}
	b.ReportAllocs()
	b.ResetTimer()
	for i := 0; i < b.N; i++ {
		s.Step()
	}
}

func BenchmarkTick200(b *testing.B) {
	s := buildCrowd(200)
	for i := 0; i < 20; i++ {
		s.Step()
	}
	b.ReportAllocs()
	b.ResetTimer()
	for i := 0; i < b.N; i++ {
		s.Step()
	}
}

// TestErrorHookKeepsTheRoomTicking covers log-and-continue on errors, unlike the JS.
func TestErrorHookKeepsTheRoomTicking(t *testing.T) {
	s := newTestSim(4)
	id := s.spawnAt(0, 0, 10)

	var got error
	s.Hooks.Error = func(err error) { got = err }
	s.Hooks.OnTick = func(entity.EntityID) { panic("boom") }
	s.Step()
	if got == nil {
		t.Fatal("a panic in the tick body was not reported")
	}
	if s.Tick() != 1 {
		t.Errorf("tick counter is %d after a panicking tick, want 1", s.Tick())
	}

	s.Hooks.OnTick = nil
	s.Step()
	if s.Tick() != 2 {
		t.Errorf("the room did not tick again after the panic; tick counter is %d", s.Tick())
	}
	if !s.W.Alive(id) {
		t.Error("the entity did not survive the panicking tick")
	}
}

// TestErrorHookUnsetLetsThePanicThrough crashes if Hooks.Error is nil.
func TestErrorHookUnsetLetsThePanicThrough(t *testing.T) {
	s := newTestSim(4)
	s.spawnAt(0, 0, 10)
	s.Hooks.OnTick = func(entity.EntityID) { panic("boom") }

	defer func() {
		if recover() == nil {
			t.Error("the panic was swallowed even though Hooks.Error is nil")
		}
	}()
	s.Step()
}
