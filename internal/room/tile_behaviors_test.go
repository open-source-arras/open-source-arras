package room

import (
	"testing"

	"arrasgo/internal/entity"
	"arrasgo/internal/vmath"
)

type countingComms struct {
	sent  []string
	rooms int
}

func (c *countingComms) Broadcast(string)                   {}
func (c *countingComms) SendTo(_ entity.EntityID, m string) { c.sent = append(c.sent, m) }
func (c *countingComms) ClientCount() int                   { return 1 }
func (c *countingComms) BroadcastRoom()                     { c.rooms++ }

func liveEntity(t *testing.T, r *Room, kind string, at vmath.Vec2) entity.EntityID {
	t.Helper()
	id := r.World.Spawn()
	e := r.World.Get(id)
	e.Type = kind
	e.Master = id
	e.Health.Amount = 100
	e.Health.Max = 100
	r.World.Pos[id.Index] = at
	return id
}

// Pins found-bugs.md #71.
func TestNexusTile_AlertThrottleOnlySuppressesOneTick(t *testing.T) {
	r, now := newSpawnTestRoom(t, 7)
	comms := &countingComms{}
	r.Comms = comms

	tile := &TileInstance{Type: &TileType{Key: "nexus", Tick: nexusTileTick}}
	id := liveEntity(t, r, "tank", vmath.Vec2{})
	tile.entities = append(tile.entities, id)

	start := *now
	for i, at := range []int64{0, 33, 66, 100, 133} {
		*now = start + at
		if err := r.RunTimers(float64(*now), ^uint64(0)); err != nil {
			t.Fatalf("tick %d: RunTimers: %v", i, err)
		}
		if err := nexusTileTick(tile, r.tileContext()); err != nil {
			t.Fatalf("tick %d: nexusTileTick: %v", i, err)
		}
	}

	if len(comms.sent) != 4 {
		t.Errorf("sent %d messages over 5 ticks, want 4 (only the second tick is suppressed)", len(comms.sent))
	}
	if !r.Extras.GetOrCreate(id).NexusAlerted {
		t.Error("the flag should be up again immediately after the tick that raised it")
	}
}

// TestPortalTile_LaunchIsDeferredAndKidsInheritTheArrivalVelocity pins portal.js:50-55.
func TestPortalTile_LaunchIsDeferredAndKidsInheritTheArrivalVelocity(t *testing.T) {
	r, now := newSpawnTestRoom(t, 7)
	if len(r.Portals) < 2 {
		t.Skip("room_tiles_test has fewer than two portal tiles in this dump")
	}
	tile := r.Portals[0]
	entry := tile.Loc(r.Geometry)

	arrival := vmath.Vec2{X: 1.5, Y: -2.5}
	tank := liveEntity(t, r, "tank", entry)
	r.World.Vel[tank.Index] = arrival
	drone := liveEntity(t, r, "drone", vmath.Vec2{X: 999, Y: 999})
	r.World.Get(drone).Master = tank

	tile.entities = append(tile.entities, tank)
	before := r.PendingTimers()
	if err := portalTileTick(tile, r.tileContext()); err != nil {
		t.Fatalf("portalTileTick: %v", err)
	}

	extras := r.Extras.GetOrCreate(tank)
	if !extras.CannotTeleport {
		t.Error("cannotTeleport should be set the moment the entity is teleported")
	}
	if got := r.World.Pos[tank.Index]; got == entry {
		t.Error("the entity is still standing on the portal it entered")
	}
	if got := r.World.Vel[tank.Index]; got != arrival {
		t.Errorf("velocity = %v right after the teleport, want the arrival velocity %v -- the launch is 100ms away", got, arrival)
	}
	if got := r.World.Vel[drone.Index]; got != arrival {
		t.Errorf("drone velocity = %v, want the parent's arrival velocity %v", got, arrival)
	}
	if got := r.World.Pos[drone.Index]; got != r.World.Pos[tank.Index] {
		t.Errorf("drone position = %v, want its parent's exit %v", got, r.World.Pos[tank.Index])
	}
	if r.PendingTimers() != before+1 {
		t.Fatalf("pending timers = %d, want %d -- the launch should be queued", r.PendingTimers(), before+1)
	}

	*now += portalLaunchDelay - 1
	if err := r.RunTimers(float64(*now), ^uint64(0)); err != nil {
		t.Fatalf("RunTimers before the launch: %v", err)
	}
	if got := r.World.Vel[tank.Index]; got != arrival {
		t.Errorf("velocity = %v at +%dms, want it unchanged until +%dms", got, portalLaunchDelay-1, portalLaunchDelay)
	}

	*now += 1
	if err := r.RunTimers(float64(*now), ^uint64(0)); err != nil {
		t.Fatalf("RunTimers at the launch: %v", err)
	}
	launch := r.World.Vel[tank.Index]
	if launch == arrival {
		t.Fatal("the launch velocity was never applied")
	}
	if launch != extras.PortalLaunch {
		t.Errorf("velocity = %v at the launch, want the stored %v", launch, extras.PortalLaunch)
	}
	if !extras.CannotTeleport {
		t.Error("cannotTeleport should still be set at the launch; it clears 200ms later")
	}

	*now += portalUnlockDelay
	if err := r.RunTimers(float64(*now), ^uint64(0)); err != nil {
		t.Fatalf("RunTimers at the unlock: %v", err)
	}
	if extras.CannotTeleport {
		t.Error("cannotTeleport should be clear 300ms after the teleport")
	}
	if r.World.Vel[tank.Index] != launch {
		t.Error("the unlock should touch nothing but the flag")
	}
}
