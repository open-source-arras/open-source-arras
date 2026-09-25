package room

import "testing"

// TestOutbreak_ZombifyDoesNotGuardOnABodyBearingClass verifies zombies spawn even with a BODY-bearing class.
func TestOutbreak_ZombifyDoesNotGuardOnABodyBearingClass(t *testing.T) {
	room := newGamemodeTestRoom(t, 91, "outbreak")
	ob := newOutbreak(room)

	src := room.World.Spawn()
	zid, err := ob.Zombify(src, "rock")
	if err != nil {
		t.Fatalf("Zombify(rock): %v", err)
	}
	if !zid.Valid() {
		t.Error("a BODY-bearing class should still be zombified; the JS guard reads a string")
	}
	if !room.World.Alive(src) {
		t.Error("zombify never destroys the source on this path (outbreak.js:20 onwards)")
	}
}

func TestOutbreak_ZombifyEmptyNameDestroysAndReturnsNothing(t *testing.T) {
	room := newGamemodeTestRoom(t, 92, "outbreak")
	ob := newOutbreak(room)
	src := room.World.Spawn()
	zid, err := ob.Zombify(src, "")
	if err != nil {
		t.Fatalf("Zombify(\"\"): %v", err)
	}
	if zid.Valid() {
		t.Error("an empty name should never produce a zombie")
	}
	if room.World.Alive(src) {
		t.Error("!liveEntity.defs (empty name here) should destroy the source (outbreak.js:12-14)")
	}
}

// TestOutbreak_ZombieActivatesOnItsOwnDeadline verifies zombies activate after the 1000ms delay.
func TestOutbreak_ZombieActivatesOnItsOwnDeadline(t *testing.T) {
	room := newGamemodeTestRoom(t, 93, "outbreak")
	now := int64(1_000_000)
	room.World.Now = func() int64 { return now }
	ob := newOutbreak(room)

	src := room.World.Spawn()
	room.World.Get(src).Name = "Prey"
	zid, err := ob.Zombify(src, "bot")
	if err != nil {
		t.Fatalf("Zombify(bot): %v", err)
	}
	if !zid.Valid() {
		t.Fatal("zombifying should spawn a zombie")
	}
	z := room.World.Get(zid)
	if !z.Invuln || !z.Godmode {
		t.Fatal("a freshly spawned zombie should start Invuln and Godmode")
	}
	if room.PendingTimers() != 1 {
		t.Fatalf("pending timers = %d, want the one activation timer", room.PendingTimers())
	}

	if err := room.RunTimers(float64(now+zombieActivateDelay-1), ^uint64(0)); err != nil {
		t.Fatalf("RunTimers (before deadline): %v", err)
	}
	if !room.World.Get(zid).Invuln {
		t.Fatal("Invuln cleared before the 1000ms activation deadline")
	}

	if err := room.RunTimers(float64(now+zombieActivateDelay), ^uint64(0)); err != nil {
		t.Fatalf("RunTimers (at deadline): %v", err)
	}
	z = room.World.Get(zid)
	if z.Invuln || z.Godmode {
		t.Error("Invuln/Godmode should clear once the activation deadline elapses")
	}
	if z.FacingType != "looseToTarget" {
		t.Errorf("FacingType = %q, want looseToTarget (outbreak.js:39)", z.FacingType)
	}
	if !room.Extras.Get(zid).Zombified {
		t.Error("Zombified extras flag should stay set")
	}
	if room.PendingTimers() != 0 {
		t.Errorf("pending timers = %d, want 0 -- a setTimeout fires once", room.PendingTimers())
	}
}
