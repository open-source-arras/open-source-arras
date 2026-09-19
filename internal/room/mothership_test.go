package room

import "testing"

// TestMothership_SpawnsOnePerTeamAtDistinctCorners tests mothership spawning.
func TestMothership_SpawnsOnePerTeamAtDistinctCorners(t *testing.T) {
	room := newGamemodeTestRoom(t, 41, "mothership")
	mgr := NewGamemodeManager(room)
	if err := mgr.Start(); err != nil {
		t.Fatalf("Start: %v", err)
	}
	ms := mgr.Mothership
	teams, ok := room.Mutable.Teams.Int()
	if !ok || teams <= 0 {
		t.Fatalf("mothership gamemode produced no usable team count: %v", room.Mutable.Teams)
	}
	if len(ms.motherships) != teams {
		t.Fatalf("len(motherships) = %d, want %d (Config.teams)", len(ms.motherships), teams)
	}

	seen := map[[2]float64]bool{}
	for _, entry := range ms.motherships {
		e := room.World.Get(entry.id)
		if e == nil {
			t.Fatal("a tracked mothership id does not resolve")
		}
		if e.Settings.AcceptsScore {
			t.Error("mothership.js:47 sets ACCEPTS_SCORE:false")
		}
		extras := room.Extras.Get(entry.id)
		if !extras.IsMothership {
			t.Error("spawned mothership missing IsMothership extras flag")
		}
		pos := room.World.Pos[entry.id.Index]
		key := [2]float64{pos.X, pos.Y}
		if seen[key] {
			t.Errorf("two motherships share position %v", key)
		}
		seen[key] = true
	}
}

// TestMothership_LoopDeclaresSoleSurvivor tests win detection after mothership death.
func TestMothership_LoopDeclaresSoleSurvivor(t *testing.T) {
	room := newGamemodeTestRoom(t, 43, "mothership")
	mgr := NewGamemodeManager(room)
	if err := mgr.Start(); err != nil {
		t.Fatalf("Start: %v", err)
	}
	ms := mgr.Mothership
	if len(ms.motherships) < 2 {
		t.Skip("need at least 2 teams to prove a sole survivor is detected")
	}
	for _, entry := range ms.motherships[:len(ms.motherships)-1] {
		room.World.Kill(entry.id)
	}
	survivor := ms.motherships[len(ms.motherships)-1].team
	ms.Loop()
	if ms.Pending == nil {
		t.Fatal("Loop did not schedule a win after every other mothership died")
	}
	if ms.Pending.Team != survivor {
		t.Errorf("Pending.Team = %d, want the survivor's team %d", ms.Pending.Team, survivor)
	}
	if !ms.teamWon {
		t.Error("teamWon should be set once a sole survivor remains")
	}
}
