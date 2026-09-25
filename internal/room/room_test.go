package room

import (
	"testing"

	"arrasgo/internal/config"
	"arrasgo/internal/defs"
	"arrasgo/internal/entity"
	"arrasgo/internal/jsutil"
)

// Integration test that NewRoom constructs World fields correctly.
func TestNewRoom_TileTesting(t *testing.T) {
	tuning, err := config.Load("../../gen/config.json")
	if err != nil {
		t.Skipf("gen/config.json unavailable (%v)", err)
	}
	rng := jsutil.NewRand(42)
	defSet, err := defs.LoadPath("../../gen/definitions.json", rng)
	if err != nil {
		t.Skipf("gen/definitions.json unavailable (%v)", err)
	}
	resolver, err := defs.NewResolver(defSet, rng)
	if err != nil {
		t.Fatalf("NewResolver: %v", err)
	}

	now := int64(1000)
	room, err := NewRoom(RoomConfig{
		Tuning:    &tuning,
		Gamemodes: []string{"tile_testing"},
		Resolver:  resolver,
		Rand:      rng,
		Now:       func() int64 { return now },
	})
	if err != nil {
		t.Fatalf("NewRoom: %v", err)
	}

	if room.World.Tuning != &room.Tuning {
		t.Error("World.Tuning does not point at room.Tuning")
	}
	if got := room.World.Now(); got != now {
		t.Errorf("World.Now() = %d, want %d", got, now)
	}
	if room.World.Room.Width != room.Geometry.Width() || room.World.Room.Height != room.Geometry.Height() {
		t.Errorf("World.Room = %+v, want width=%v height=%v", room.World.Room, room.Geometry.Width(), room.Geometry.Height())
	}

	wantSetup := []string{"room_default", "room_tiles_test"}
	if len(room.Mutable.RoomSetup) != len(wantSetup) {
		t.Fatalf("RoomSetup = %v, want %v", room.Mutable.RoomSetup, wantSetup)
	}
	for i, name := range wantSetup {
		if room.Mutable.RoomSetup[i] != name {
			t.Errorf("RoomSetup[%d] = %q, want %q", i, room.Mutable.RoomSetup[i], name)
		}
	}

	if len(room.Walls) == 0 {
		t.Error("no walls spawned; room_tiles_test has wall tiles in gen/rooms.json")
	}
	if len(room.Permanents) == 0 {
		t.Error("no PermanentSpawn slots registered; expected at least the walls")
	}
	if room.World.Live() == 0 {
		t.Error("World has no live entities after InitAll; expected walls and rocks")
	}
	if room.Protected == nil {
		t.Fatal("Protected is nil")
	}

	zeroSized := 0
	room.World.EachLive(func(id entity.EntityID, e *entity.Entity) {
		if room.World.Size[id.Index] == 0 {
			zeroSized++
		}
	})
	if zeroSized != 0 {
		t.Errorf("%d live entities have World.Size == 0; refreshSize should have run for every tile-spawned entity", zeroSized)
	}
}

func TestNewRoom_RequiresRand(t *testing.T) {
	tuning, err := config.Load("../../gen/config.json")
	if err != nil {
		t.Skipf("gen/config.json unavailable (%v)", err)
	}
	if _, err := NewRoom(RoomConfig{Tuning: &tuning, Now: func() int64 { return 0 }}); err == nil {
		t.Error("NewRoom with a nil Rand returned nil error")
	}
	if _, err := NewRoom(RoomConfig{Tuning: &tuning, Rand: jsutil.NewRand(1)}); err == nil {
		t.Error("NewRoom with a nil Now returned nil error")
	}
	if _, err := NewRoom(RoomConfig{Rand: jsutil.NewRand(1), Now: func() int64 { return 0 }}); err == nil {
		t.Error("NewRoom with a nil Tuning returned nil error")
	}
}
