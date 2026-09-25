package wire

import (
	"encoding/json"
	"math"
	"os"
	"path/filepath"
	"strconv"
	"testing"

	"arrasgo/internal/config"
	"arrasgo/internal/entity"
	"arrasgo/internal/room"
	"arrasgo/internal/vmath"
)

type clanwarsProbe struct {
	Seed      int             `json:"seed"`
	Gamemode  string          `json:"gamemode"`
	BootDraws uint64          `json:"bootDraws"`
	Bodies    map[string]body `json:"bodies"`
	Steps     []clanwarsStep  `json:"steps"`
}

type body struct {
	ID           int     `json:"id"`
	OriginalName string  `json:"originalName"`
	X            float64 `json:"x"`
	Y            float64 `json:"y"`
	Size         float64 `json:"size"`
}

type clanwarsStep struct {
	Name  string          `json:"name"`
	Note  string          `json:"note"`
	At    uint64          `json:"at"`
	Draws uint64          `json:"draws"`
	Threw string          `json:"threw"`
	Value json.RawMessage `json:"value"`
}

// clanRow is one entry of the roster the probe dumps after every mutation.
type clanRow struct {
	FullClanName string `json:"fullClanName"`
	ClanName     string `json:"clanName"`
	Team         int32  `json:"team"`
	Index        int    `json:"index"`
	Party        []int  `json:"party"`
}

type rosterValue struct {
	Clans []clanRow `json:"clans"`
}

type pointValue struct {
	X float64 `json:"x"`
	Y float64 `json:"y"`
}

type spawnValue struct {
	X     float64 `json:"x"`
	Y     float64 `json:"y"`
	Draws uint64  `json:"draws"`
}

type playerInfoValue struct {
	Team int32   `json:"team"`
	Clan *string `json:"clan"`
}

// Replays tools/harness/probe-clanwars.js against room.ClanWars.
func TestClanWarsMatchesNode(t *testing.T) {
	probe := loadClanWarsProbe(t)

	tuning, err := config.Default()
	if err != nil {
		t.Fatal(err)
	}
	tuning.BotCap = 0

	opts := testOptions(uint64(probe.Seed), probe.Gamemode)
	opts.UseDefiner = true
	opts.Tuning = &tuning
	g := mustBoot(t, opts)

	if got := g.Rand.Calls(); got != probe.BootDraws {
		t.Fatalf("boot drew %d randoms, Node drew %d. Nothing below can be compared "+
			"until the two streams start from the same place.", got, probe.BootDraws)
	}

	cw := g.Room.Gamemodes.ClanWars
	ids := map[int]entity.EntityID{}
	makeBody := func(n int) entity.EntityID {
		b, ok := probe.Bodies[strconv.Itoa(n)]
		if !ok {
			t.Fatalf("probe has no body %d", n)
		}
		id := g.Room.World.Spawn()
		g.Room.World.Pos[id.Index].X = b.X
		g.Room.World.Pos[id.Index].Y = b.Y
		g.Room.World.Size[id.Index] = b.Size
		g.Room.Extras.GetOrCreate(id).OriginalName = b.OriginalName
		ids[n] = id
		return id
	}
	bodyOf := func(n int) entity.EntityID {
		id, ok := ids[n]
		if !ok {
			t.Fatalf("step referred to body %d before it was created", n)
		}
		return id
	}

	for i := range probe.Steps {
		s := &probe.Steps[i]
		if got := g.Rand.Calls(); got != s.At {
			t.Fatalf("step %d (%s): %d draws taken before it, Node had taken %d",
				i, s.Name, got, s.At)
		}
		before := g.Rand.Calls()

		switch s.Name {
		case "an empty roster":

		case "registering a tag with no body":
			cw.Add("[AAA] Alice", entity.EntityID{})
		case "a second tag":
			cw.Add("[BBB] Bob", entity.EntityID{})
		case "a name with no tag":
			cw.Add("Untagged Player", entity.EntityID{})

		case "adding a body to a known clan":
			cw.Add("[AAA] Alice", makeBody(1))
		case "adding a body under a brand new tag":
			cw.Add("[CCC] Carol", makeBody(2))
		case "a second body in the same clan":
			cw.Add("[AAA] Andy", makeBody(3))

		case "getPlayerInfo for a known tag", "getPlayerInfo for an unknown name":
			var want playerInfoValue
			decode(t, s, &want)
			team, clan := cw.GetPlayerInfo(nameFor(s.Name), g.Rand)
			wantClan := ""
			if want.Clan != nil {
				wantClan = *want.Clan
			}
			if team != want.Team || clan != wantClan {
				t.Errorf("step %d (%s): GetPlayerInfo = (%d, %q), Node = (%d, %q)",
					i, s.Name, team, clan, want.Team, wantClan)
			}

		case "getPlayerInfo for an unregistered tag":
			// Call not made. Reproduces Node's TypeError. See docs/found-bugs.md #86.
			if s.Threw == "" {
				t.Fatalf("step %d (%s): the probe records no throw, so the divergence "+
					"this case documents no longer exists -- make the call and compare it",
					i, s.Name)
			}

		case "six spawns beside a clanmate":
			var want []spawnValue
			decode(t, s, &want)
			for k, w := range want {
				at := g.Rand.Calls()
				got := cw.GetSpawn("[AAA] Someone", g.Rand)
				if d := g.Rand.Calls() - at; d != w.Draws {
					t.Errorf("step %d spawn %d: %d draws, Node took %d", i, k, d, w.Draws)
				}
				if !closeEnough(got.X, w.X) || !closeEnough(got.Y, w.Y) {
					t.Errorf("step %d spawn %d: (%.10g, %.10g), Node (%.10g, %.10g)",
						i, k, got.X, got.Y, w.X, w.Y)
				}
			}

		case "a spawn beside the only member of a clan":
			checkPoint(t, i, s, cw.GetSpawn("[CCC] Craig", g.Rand))
		case "a spawn for a clan with nobody in it":
			checkPoint(t, i, s, cw.GetSpawn("[BBB] Barry", g.Rand))
		case "a spawn for an unknown name":
			checkPoint(t, i, s, cw.GetSpawn("Nobody At All", g.Rand))

		case "removing a member":
			cw.Remove("[AAA] Alice", bodyOf(1))
		case "removing a body that is not on the roster":
			cw.Remove("[AAA] Stranger", g.Room.World.Spawn())
		case "removing from a clan that is now empty":
			cw.Remove("[AAA] Andy", bodyOf(3))
			cw.Remove("[AAA] Andy", bodyOf(3))
		case "removing a body whose name has no tag":
			cw.Remove("No Tag Here", g.Room.World.Spawn())

		default:
			t.Fatalf("step %d: unhandled probe step %q -- the probe grew a case this "+
				"test does not replay, which would otherwise pass silently", i, s.Name)
		}

		if d := g.Rand.Calls() - before; d != s.Draws {
			t.Fatalf("step %d (%s): took %d draws, Node took %d", i, s.Name, d, s.Draws)
		}
		checkRoster(t, i, s, cw, ids)
	}
}

// Compares the clan list against the step's dump.
func checkRoster(t *testing.T, i int, s *clanwarsStep, cw *room.ClanWars, ids map[int]entity.EntityID) {
	t.Helper()
	var v rosterValue
	if len(s.Value) == 0 || json.Unmarshal(s.Value, &v) != nil || v.Clans == nil {
		return
	}
	got := cw.Clans()
	if len(got) != len(v.Clans) {
		t.Fatalf("step %d (%s): %d clans, Node has %d", i, s.Name, len(got), len(v.Clans))
	}
	for k, want := range v.Clans {
		g := got[k]
		if g.FullName != want.FullClanName || g.Name != want.ClanName ||
			g.Team != want.Team || g.Index != want.Index {
			t.Errorf("step %d (%s): clan %d = {%q %q team %d index %d}, Node {%q %q team %d index %d}",
				i, s.Name, k, g.FullName, g.Name, g.Team, g.Index,
				want.FullClanName, want.ClanName, want.Team, want.Index)
		}
		if len(g.PartyEntities) != len(want.Party) {
			t.Errorf("step %d (%s): clan %q holds %d members, Node holds %d",
				i, s.Name, want.ClanName, len(g.PartyEntities), len(want.Party))
			continue
		}
		for m, wantID := range want.Party {
			if g.PartyEntities[m] != ids[wantID] {
				t.Errorf("step %d (%s): clan %q member %d is not Node's body %d",
					i, s.Name, want.ClanName, m, wantID)
			}
		}
	}
}

func checkPoint(t *testing.T, i int, s *clanwarsStep, got vmath.Vec2) {
	t.Helper()
	var want pointValue
	decode(t, s, &want)
	if !closeEnough(got.X, want.X) || !closeEnough(got.Y, want.Y) {
		t.Errorf("step %d (%s): (%.10g, %.10g), Node (%.10g, %.10g)",
			i, s.Name, got.X, got.Y, want.X, want.Y)
	}
}

func decode(t *testing.T, s *clanwarsStep, out any) {
	t.Helper()
	if err := json.Unmarshal(s.Value, out); err != nil {
		t.Fatalf("step %q: %v", s.Name, err)
	}
}

// Argument for getPlayerInfo steps.
func nameFor(step string) string {
	if step == "getPlayerInfo for a known tag" {
		return "[AAA] Anyone"
	}
	return "Nobody At All"
}

// Tolerance for floats after JSON round trip.
func closeEnough(a, b float64) bool {
	if a == b {
		return true
	}
	return math.Abs(a-b) <= 1e-9*math.Max(1, math.Max(math.Abs(a), math.Abs(b)))
}

func loadClanWarsProbe(t *testing.T) *clanwarsProbe {
	t.Helper()
	path := filepath.Join("..", "..", "gen", "clanwars-probe-s1.json")
	raw, err := os.ReadFile(path)
	if err != nil {
		t.Skipf("no clan wars probe (%v); run tools/harness/probe-clanwars.js", err)
	}
	var p clanwarsProbe
	if err := json.Unmarshal(raw, &p); err != nil {
		t.Fatalf("%s: %v", path, err)
	}
	if len(p.Steps) == 0 {
		t.Fatalf("%s: no steps", path)
	}
	return &p
}
