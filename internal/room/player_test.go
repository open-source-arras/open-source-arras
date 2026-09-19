package room

import (
	"encoding/json"
	"strings"
	"testing"

	"arrasgo/internal/config"
	"arrasgo/internal/defs"
	"arrasgo/internal/entity"
	"arrasgo/internal/jsutil"
	"arrasgo/internal/vmath"
)

// newPlayerTestRoom is newSpawnTestRoom with a chosen gamemode, so the tdm and
func newPlayerTestRoom(t *testing.T, seed uint64, gamemodes ...string) *Room {
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
	room, err := NewRoom(RoomConfig{
		Tuning:    &tuning,
		Gamemodes: gamemodes,
		Resolver:  resolver,
		Rand:      rng,
		Now:       func() int64 { return 1_000_000 },
		Comms:     stubComms{clients: 1},
	})
	if err != nil {
		t.Fatalf("NewRoom: %v", err)
	}
	return room
}

// TestBlackoutJSONIsEmptyWhenNothingSetIt is the quirk that decides two bytes on
func TestBlackoutJSONIsEmptyWhenNothingSetIt(t *testing.T) {
	r := newPlayerTestRoom(t, 1, "ffa")
	if r.Flags.HasBlackout || r.Flags.HasBlackoutFog {
		t.Fatalf("ffa set blackout keys: HasBlackout=%v HasBlackoutFog=%v",
			r.Flags.HasBlackout, r.Flags.HasBlackoutFog)
	}
	got, err := r.BlackoutJSON()
	if err != nil {
		t.Fatalf("BlackoutJSON: %v", err)
	}
	if got != "{}" {
		t.Errorf("BlackoutJSON = %q, want %q", got, "{}")
	}
}

// TestBlackoutJSONCarriesOnlyTheKeysThatWereSet: one key present, one absent, is
func TestBlackoutJSONCarriesOnlyTheKeysThatWereSet(t *testing.T) {
	r := newPlayerTestRoom(t, 1, "ffa")
	for _, c := range []struct {
		name          string
		blackout, fog bool
		active        bool
		colour        string
		want          string
	}{
		{"active only", true, false, true, "", `{"active":true}`},
		{"colour only", false, true, false, "#101010", `{"color":"#101010"}`},
		{"both", true, true, true, "#000000", `{"active":true,"color":"#000000"}`},
		{"active false but present", true, false, false, "", `{"active":false}`},
	} {
		t.Run(c.name, func(t *testing.T) {
			r.Flags.HasBlackout, r.Flags.Blackout = c.blackout, c.active
			r.Flags.HasBlackoutFog, r.Flags.BlackoutFog = c.fog, c.colour
			got, err := r.BlackoutJSON()
			if err != nil {
				t.Fatalf("BlackoutJSON: %v", err)
			}
			if got != c.want {
				t.Errorf("BlackoutJSON = %q, want %q", got, c.want)
			}
			var probe map[string]any
			if err := json.Unmarshal([]byte(got), &probe); err != nil {
				t.Errorf("not valid JSON: %v", err)
			}
		})
	}
}

// TestTilesJSONMatchesTheGrid pins the third field of `R`: one entry per tile,
func TestTilesJSONMatchesTheGrid(t *testing.T) {
	r := newPlayerTestRoom(t, 1, "ffa")
	raw, err := r.TilesJSON()
	if err != nil {
		t.Fatalf("TilesJSON: %v", err)
	}
	var rows [][]struct {
		Color             string `json:"color"`
		VisibleOnBlackout bool   `json:"visibleOnBlackout"`
		Image             any    `json:"image"`
	}
	if err := json.Unmarshal([]byte(raw), &rows); err != nil {
		t.Fatalf("TilesJSON is not the [[{...}]] the client parses: %v", err)
	}
	if len(rows) != r.Grid.Height() {
		t.Fatalf("%d rows for a grid %d high", len(rows), r.Grid.Height())
	}
	for y, row := range rows {
		if len(row) != len(r.Grid.Cells[y]) {
			t.Fatalf("row %d has %d cells, the grid has %d", y, len(row), len(r.Grid.Cells[y]))
		}
		for x, cell := range row {
			want := r.Grid.Cells[y][x]
			if cell.Color != want.Color {
				t.Errorf("tile %d,%d colour = %q, want %q", x, y, cell.Color, want.Color)
			}
			if !want.Type.HasImage {
				if b, ok := cell.Image.(bool); !ok || b {
					t.Errorf("tile %d,%d image = %v, want false", x, y, cell.Image)
				}
			}
		}
	}
	if r.Grid.Height() != r.Geometry.YGrid || len(r.Grid.Cells[0]) != r.Geometry.XGrid {
		t.Errorf("grid is %dx%d but geometry says %dx%d",
			len(r.Grid.Cells[0]), r.Grid.Height(), r.Geometry.XGrid, r.Geometry.YGrid)
	}
}

// TestGetSpawnLocationDrawCounts is the reason this function is not just a
func TestGetSpawnLocationDrawCounts(t *testing.T) {
	t.Run("ffa", func(t *testing.T) {
		r := newPlayerTestRoom(t, 1, "ffa")
		before := r.Rand.Calls()
		info := r.GetSpawnLocation(0, false, "")
		if got := r.Rand.Calls() - before; got != 3 {
			t.Errorf("%d draws, want 3 (getSpawnableArea's choose, x, y)", got)
		}
		if info.HasTeam {
			t.Error("an ffa spawn adopted a team")
		}
	})

	t.Run("tdm adopts the weakest team", func(t *testing.T) {
		r := newPlayerTestRoom(t, 1, "tdm")
		if r.Mutable.Mode != "tdm" {
			t.Skipf("gamemode tdm left mode = %q", r.Mutable.Mode)
		}
		before := r.Rand.Calls()
		info := r.GetSpawnLocation(0, false, "")
		if got := r.Rand.Calls() - before; got != 4 {
			t.Errorf("%d draws, want 4 (getWeakestTeam, then choose, x, y)", got)
		}
		if !info.HasTeam {
			t.Error("a tdm spawn with no remembered team did not adopt one")
		}
	})

	t.Run("tdm keeps a remembered team and still draws", func(t *testing.T) {
		r := newPlayerTestRoom(t, 1, "tdm")
		if r.Mutable.Mode != "tdm" {
			t.Skipf("gamemode tdm left mode = %q", r.Mutable.Mode)
		}
		before := r.Rand.Calls()
		info := r.GetSpawnLocation(TeamRed, true, "")
		if got := r.Rand.Calls() - before; got != 4 {
			t.Errorf("%d draws, want 4: getWeakestTeam is called before its result is tested", got)
		}
		if info.Team != TeamRed {
			t.Errorf("team = %d, want the remembered %d -- nothing defeated it", info.Team, TeamRed)
		}
	})

	t.Run("a fixed spawn point takes no draws", func(t *testing.T) {
		r := newPlayerTestRoom(t, 1, "ffa")
		r.SpawnPoint, r.HasSpawnPoint = vmath.Vec2{X: 100, Y: -250}, true
		before := r.Rand.Calls()
		info := r.GetSpawnLocation(0, false, "")
		if got := r.Rand.Calls() - before; got != 0 {
			t.Errorf("%d draws with global.spawnPoint set, want 0", got)
		}
		if info.Loc != r.SpawnPoint {
			t.Errorf("loc = %v, want the fixed %v", info.Loc, r.SpawnPoint)
		}
	})
}

// TestSpawnPlayerBodyBuildsATank walks the body half of spawn(): the flag that
func TestSpawnPlayerBodyBuildsATank(t *testing.T) {
	r := newPlayerTestRoom(t, 1, "ffa")
	info := r.GetSpawnLocation(0, false, "")

	before := r.Rand.Calls()
	id, err := r.SpawnPlayerBody(info, "Tester", false)
	if err != nil {
		t.Fatalf("SpawnPlayerBody: %v", err)
	}
	if got := r.Rand.Calls() - before; got != 1 {
		t.Errorf("%d draws, want 1 (getRandomTeam)", got)
	}

	e := r.World.Get(id)
	if e == nil {
		t.Fatal("the body is not in the world")
	}
	if !r.World.Flag[id.Index].Has(entity.FlagPlayer) {
		t.Error("the body is not flagged a player, so it deactivates like a bullet")
	}
	if !e.IsProtected {
		t.Error("body.protect() did not happen: bots and food will spawn on top of it")
	}
	if e.Name != "Tester" {
		t.Errorf("name = %q, want %q", e.Name, "Tester")
	}
	if !e.Invuln {
		t.Error("a fresh body is not invulnerable")
	}
	if e.Team >= 0 {
		t.Errorf("team = %d, want the negative pseudo-team getRandomTeam returns", e.Team)
	}
	if r.World.Pos[id.Index] != info.Loc {
		t.Errorf("body is at %v, not the chosen spawn %v", r.World.Pos[id.Index], info.Loc)
	}
}

// TestSpawnPlayerBodyIncognito is the one field the uplink reads back out of the
func TestSpawnPlayerBodyIncognito(t *testing.T) {
	r := newPlayerTestRoom(t, 1, "ffa")
	info := r.GetSpawnLocation(0, false, "")
	id, err := r.SpawnPlayerBody(info, "Hidden", true)
	if err != nil {
		t.Fatalf("SpawnPlayerBody: %v", err)
	}
	if !r.Extras.Get(id).Incognito {
		t.Error("the incognito flag did not reach the extras table")
	}
}

// TestTeamModesTakeTheSpawnTeam covers the other arm of the switch: tdm, tag and
func TestTeamModesTakeTheSpawnTeam(t *testing.T) {
	r := newPlayerTestRoom(t, 1, "tdm")
	if r.Mutable.Mode != "tdm" {
		t.Skipf("gamemode tdm left mode = %q", r.Mutable.Mode)
	}
	info := r.GetSpawnLocation(0, false, "")
	before := r.Rand.Calls()
	id, err := r.SpawnPlayerBody(info, "Tester", false)
	if err != nil {
		t.Fatalf("SpawnPlayerBody: %v", err)
	}
	if got := r.Rand.Calls() - before; got != 0 {
		t.Errorf("%d draws in a tdm spawn, want 0: the team came from getSpawnLocation", got)
	}
	e := r.World.Get(id)
	if e.Team != info.Team {
		t.Errorf("team = %d, want the spawn's %d", e.Team, info.Team)
	}
	if want := GetTeamColor(info.Team, false); !strings.Contains(e.Color.Base(), want) {
		t.Errorf("colour base = %q, want the team colour %q", e.Color.Base(), want)
	}
}
