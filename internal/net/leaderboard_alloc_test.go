package net

import (
	"testing"

	"arrasgo/internal/entity"
	"arrasgo/internal/vmath"
)

// TestBroadcastBuildersAreAllocationFree verifies builders allocate zero once warm.
func TestBroadcastBuildersAreAllocationFree(t *testing.T) {
	w := entity.NewWorld(64)
	w.Room.Width, w.Room.Height = 8000, 8000

	order := make([]entity.EntityID, 0, 40)
	boss := make(map[entity.EntityID]bool)
	for i := 0; i < 40; i++ {
		id := w.Spawn()
		e := w.Get(id)
		e.WireID = uint32(100 + i)
		e.Index = "782"
		e.Name = "bot"
		e.Label = "Basic"
		e.Type = "tank"
		e.Team = -1
		e.Skill.Score = float64(1000 - i*7)
		e.Health.Amount, e.Health.Max = 50, 100
		e.Color.Compiled = "red 0 1 0 false"
		e.Settings.Leaderboardable = true
		e.Settings.DrawShape = true
		w.Pos[id.Index] = vmath.Vec2{X: float64(i * 10), Y: float64(-i * 10)}
		if i%5 == 0 {
			e.Type = "miniboss"
			boss[id] = true
		}
		order = append(order, id)
	}

	lb := LeaderboardSettings{
		PaletteColor:     true,
		FFAUntagged:      true,
		HPLabel:          "##% HP",
		IsBoss:           func(id entity.EntityID) bool { return boss[id] },
		Incognito:        func(entity.EntityID) bool { return false },
		LeaderboardColor: func(entity.EntityID) string { return "" },
		TopPlayerID:      func(float64) {},
	}
	mm := MinimapSettings{Width: 8000, Height: 8000, FlatTeamColor: true}

	var board LeaderboardBuilder
	var teams MinimapTeams
	kinds := []LeaderboardKind{LeaderboardGlobal, LeaderboardDefault, LeaderboardPlayers, LeaderboardBosses}
	for i := 0; i < 2; i++ {
		for _, k := range kinds {
			board.Build(w, order, k, &lb)
		}
		teams.Build(w, order, -1, true, mm)
	}

	if got := testing.AllocsPerRun(50, func() {
		for _, k := range kinds {
			board.Build(w, order, k, &lb)
		}
	}); got != 0 {
		t.Errorf("building the four boards allocates %v times, want 0", got)
	}
	if got := testing.AllocsPerRun(50, func() {
		teams.Build(w, order, -1, true, mm)
	}); got != 0 {
		t.Errorf("building a team minimap allocates %v times, want 0", got)
	}
}
