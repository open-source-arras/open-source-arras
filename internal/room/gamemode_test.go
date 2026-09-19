package room

import (
	"testing"

	"arrasgo/internal/config"
	"arrasgo/internal/defs"
	"arrasgo/internal/jsutil"
)

type stubMaze struct{}

func (stubMaze) PlaceMinimal(mazeType int) MazeLayout {
	return MazeLayout{
		Width: 2, Height: 2,
		Squares: []MazeSquare{
			{X: 0, Y: 0, Size: 1},
			{X: 1, Y: 1, Size: 1},
		},
	}
}

func newGamemodeTestRoom(t *testing.T, seed uint64, gamemode string) *Room {
	t.Helper()
	tuning, err := config.Load("../../gen/config.json")
	if err != nil {
		t.Skipf("gen/config.json unavailable (%v)", err)
	}
	rng := jsutil.NewRand(seed)
	defSet, err := defs.LoadPath("../../gen/definitions.json", rng)
	if err != nil {
		t.Skipf("gen/definitions.json unavailable (%v)", err)
	}
	resolver, err := defs.NewResolver(defSet, rng)
	if err != nil {
		t.Fatalf("NewResolver: %v", err)
	}
	now := int64(1_000_000)
	room, err := NewRoom(RoomConfig{
		Tuning:    &tuning,
		Gamemodes: []string{gamemode},
		Resolver:  resolver,
		Rand:      rng,
		Now:       func() int64 { return now },
		Comms:     stubComms{clients: 1},
		Maze:      stubMaze{},
	})
	if err != nil {
		t.Fatalf("NewRoom(%q): %v", gamemode, err)
	}
	return room
}

func TestGamemodeManager_FullLifecycle(t *testing.T) {
	cases := []string{
		"assault_line", "domination", "mothership", "old_siege", "siege_fortress",
		"pandemic", "sandbox", "train_wars", "outbreak", "maze", "labyrinth", "clan_wars", "duos",
	}
	for _, gm := range cases {
		gm := gm
		t.Run(gm, func(t *testing.T) {
			room := newGamemodeTestRoom(t, 42, gm)
			mgr := NewGamemodeManager(room)
			if err := mgr.Start(); err != nil {
				t.Fatalf("Start: %v", err)
			}
			for i := 0; i < 5; i++ {
				if err := mgr.Loop(); err != nil {
					t.Fatalf("Loop iteration %d: %v", i, err)
				}
				mgr.QuickLoop()
			}
			mgr.Terminate()
		})
	}
}
