package room

import (
	"testing"

	"arrasgo/internal/entity"
)

func TestCalculateSiegePoints(t *testing.T) {
	cases := map[int]int{0: 5, 1: 8, 2: 11, 10: 35}
	for wave, want := range cases {
		if got := calculateSiegePoints(wave); got != want {
			t.Errorf("calculateSiegePoints(%d) = %d, want %d", wave, got, want)
		}
	}
}

func TestBuildSiegeWaveCodes_Shape(t *testing.T) {
	room := newGamemodeTestRoom(t, 5, "siege_fortress")
	codes := buildSiegeWaveCodes(room.Rand)
	if len(codes) != 34 {
		t.Fatalf("len(waveCodes) = %d, want 34 (siege.js:19-54)", len(codes))
	}
	// Entries 12-16 are single celestials, not draws.
	celestials := siegeOldGroups.celestials
	for i, want := range celestials {
		got := codes[12+i]
		if len(got) != 1 || got[0] != want {
			t.Errorf("waveCodes[%d] = %v, want [%s]", 12+i, got, want)
		}
	}
	for i, c := range codes {
		if len(c) == 0 {
			t.Errorf("waveCodes[%d] is empty", i)
		}
	}
}

func TestGenerateWaves_RespectsPointBudget(t *testing.T) {
	room := newGamemodeTestRoom(t, 6, "siege_fortress")
	if room.Flags.UseLimitedWaves {
		t.Fatal("siege_fortress unexpectedly sets use_limited_waves; test assumes the procedural point-buy path")
	}
	costOf := make(map[string]int, len(siegeBossChoices))
	for _, c := range siegeBossChoices {
		costOf[c.Name] = c.Cost
	}
	siege := newSiege(room)
	for i, wave := range siege.waves {
		budget := calculateSiegePoints(i)
		spent := 0
		for _, name := range wave {
			cost, ok := costOf[name]
			if !ok {
				t.Fatalf("wave %d bought unknown boss %q", i, name)
			}
			if cost > budget-spent {
				t.Errorf("wave %d bought %q costing %d with only %d of %d points left", i, name, cost, budget-spent, budget)
			}
			spent += cost
		}
	}
}

// Regression: dominators without addToSanctuaryList still need on('dead') polling.
func TestSiege_SanctuaryCaptureAndRecapture(t *testing.T) {
	room := newGamemodeTestRoom(t, 7, "siege_fortress")
	mgr := NewGamemodeManager(room)
	if err := mgr.Start(); err != nil {
		t.Fatalf("Start: %v", err)
	}
	siege := mgr.Siege
	if len(siege.sanctuaries) == 0 {
		t.Skip("siege_fortress's room dump has no TEAM_BLUE-tagged sbase1 tile; nothing to capture")
	}

	sanctuaryIDs := func(slots []siegeSanctuarySlot) []entity.EntityID {
		ids := make([]entity.EntityID, len(slots))
		for i, s := range slots {
			ids[i] = s.id
		}
		return ids
	}

	first := siege.sanctuaries[0]
	if e := room.World.Get(first.id); e == nil || e.Team != TeamBlue {
		t.Fatalf("freshly spawned sanctuary is not TEAM_BLUE-owned: %+v", e)
	}

	before := idSet(sanctuaryIDs(siege.sanctuaries)...)
	room.World.Kill(first.id)
	if err := siege.Loop(); err != nil {
		t.Fatalf("Loop after killing blue sanctuary: %v", err)
	}
	newID, ok := findNewID(before, sanctuaryIDs(siege.sanctuaries))
	if !ok {
		t.Fatal("no replacement dominator was spawned after the blue sanctuary died")
	}
	re := room.World.Get(newID)
	if re == nil || re.Team != TeamEnemies {
		t.Fatalf("replacement after a blue sanctuary dies should be TEAM_ENEMIES-owned, got %+v", re)
	}

	before2 := idSet(sanctuaryIDs(siege.sanctuaries)...)
	room.World.Kill(newID)
	if err := siege.Loop(); err != nil {
		t.Fatalf("Loop after killing the enemy dominator: %v", err)
	}
	newID2, ok := findNewID(before2, sanctuaryIDs(siege.sanctuaries))
	if !ok {
		t.Fatal("no replacement was spawned after the enemy dominator died")
	}
	rce := room.World.Get(newID2)
	if rce == nil || rce.Team != TeamBlue {
		t.Fatalf("killing the enemy dominator should recapture it for TEAM_BLUE, got %+v", rce)
	}
}

// Wave timer advances with no enemies to stall it.
func TestSiege_WaveProgression(t *testing.T) {
	room := newGamemodeTestRoom(t, 9, "siege_fortress")
	mgr := NewGamemodeManager(room)
	if err := mgr.Start(); err != nil {
		t.Fatalf("Start: %v", err)
	}
	siege := mgr.Siege
	if len(siege.waves) == 0 {
		t.Skip("siege_fortress has a zero-length wave list (wave_cap=0?)")
	}
	startID := siege.waveId
	for i := 0; i < 3; i++ {
		if err := siege.Loop(); err != nil {
			t.Fatalf("Loop iteration %d: %v", i, err)
		}
	}
	if siege.waveId == startID {
		t.Error("waveId never advanced after several Loop calls with no enemies keeping it stalled")
	}
}
