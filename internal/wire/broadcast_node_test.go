package wire

import (
	"encoding/json"
	"fmt"
	"math"
	"os"
	"path/filepath"
	"testing"
	"time"

	"arrasgo/internal/config"
	"arrasgo/internal/entity"
	"arrasgo/internal/net"
)

// TestBroadcastMatchesNode replays tools/harness/probe-broadcast.js against the port.
func TestBroadcastMatchesNode(t *testing.T) {
	probe := loadBroadcastProbe(t)

	tuning, err := config.Default()
	if err != nil {
		t.Fatal(err)
	}
	tuning.BotCap = probe.Bots

	opts := testOptions(uint64(probe.Seed), probe.Gamemode)
	opts.UseDefiner = true
	opts.Tuning = &tuning
	// Use the simulation's virtual clock, not wall time.
	var g *Game
	opts.WorldNow = func() int64 {
		if g == nil {
			return 0
		}
		return int64(g.Sim.ElapsedMS())
	}
	g = mustBoot(t, opts)

	d, stop := dialAndDrive(t, g)
	defer stop()

	apply := func() {
		t.Helper()
		select {
		case cmd := <-d.cmds:
			g.Sockets.Apply(cmd)
		case <-time.After(5 * time.Second):
			t.Fatal("no command arrived")
		}
	}
	tick := func() { g.Sim.Step() }

	apply()
	d.next(t, net.OpSvWelcome)
	d.send(t, net.S(net.OpClKey), net.S(""))
	apply()
	d.next(t, net.OpSvKeyAccepted)
	d.send(t, net.S(net.OpClSpawn), net.S(""), net.N(1), net.N(0), net.B(false), net.N(0))
	apply()
	d.send(t, net.S(net.OpClSpawn), net.S("Watcher"), net.N(0), net.N(0), net.B(false), net.N(0))
	apply()

	s := g.Sockets.Clients()[0]
	body := g.Room.World.Get(s.Player.Body)
	if body == nil {
		t.Fatal("no body after the spawn")
	}
	if got := float64(body.WireID); got != probe.BodyID {
		t.Errorf("the body's wire id is %v, Node's is %v -- the join already diverged",
			got, probe.BodyID)
	}
	if got := float64(body.Team); got != probe.BodyTeam {
		t.Errorf("the body is on team %v, Node puts it on %v", got, probe.BodyTeam)
	}

	tick()

	for i := range probe.Steps {
		step := &probe.Steps[i]
		t.Run(step.Label, func(t *testing.T) {
			d.drain()
			applyBroadcastStep(t, d, apply, s, step)

			for n := 0; n < probe.TicksPer250; n++ {
				tick()
			}
			frames := collectFrames(d)

			var ops []string
			var last []net.Value
			mockups := 0
			for _, f := range frames {
				op, rest, ok := net.Opcode(f)
				if !ok {
					continue
				}
				switch op {
				case net.OpSvBroadcast:
					ops = append(ops, op)
					last = rest
				case net.OpSvResetMinimap, net.OpSvResetLeaderboard:
					ops = append(ops, op)
				case net.OpSvMockup:
					mockups++
				}
			}

			if !sameStrings(ops, step.Opcodes) {
				t.Errorf("frames in this burst were %v, Node sent %v", ops, step.Opcodes)
			}
			if mockups != step.Mockups {
				t.Errorf("%d mockup frames, Node sends %d", mockups, step.Mockups)
			}
			if got := g.Room.TopPlayerID; got != step.TopPlayerID {
				t.Errorf("topPlayerID is %v, Node has %v", got, step.TopPlayerID)
			}
			if step.Frame == nil {
				if last != nil {
					t.Errorf("a broadcast went out; Node sends none in this burst")
				}
				return
			}
			if last == nil {
				t.Fatalf("no broadcast went out; Node sends one of %d values", len(step.Frame)-1)
			}
			compareFrame(t, last, step.Frame[1:])
		})
	}
}

// applyBroadcastStep does what the probe's before callback does for one step.
func applyBroadcastStep(t *testing.T, d *driven, apply func(), s *net.Socket, step *broadcastStep) {
	t.Helper()
	switch step.Label {
	case "a score":
		for n := 0; n < 20; n++ {
			d.send(t, net.S(net.OpClLevelUp))
			apply()
		}
	case "the default board", "the players board", "the boss board", "back to global":
		s.Status.SelectedLeaderboard = step.SelectedLeaderboard
		s.Status.HasSelectedLeaderboard = true
	case "all teams", "and back":
		s.Status.SeesAllTeams = step.SeesAllTeams
	case "NWB":
		d.send(t, net.S(net.OpClNeedsNewBroadcast))
		apply()
	case "stop":
		s.Status.SelectedLeaderboard = "stop"
		s.Status.HasSelectedLeaderboard = true
	}
}

// collectFrames reads until the socket has been quiet for a moment.
func collectFrames(d *driven) [][]net.Value {
	var out [][]net.Value
	deadline := time.Now().Add(250 * time.Millisecond)
	for time.Now().Before(deadline) {
		select {
		case m, ok := <-d.frames:
			if !ok {
				return out
			}
			out = append(out, m)
			deadline = time.Now().Add(80 * time.Millisecond)
		case <-time.After(20 * time.Millisecond):
		}
	}
	return out
}

// compareFrame checks each value of the broadcast against the expected values.
func compareFrame(t *testing.T, got []net.Value, want []json.RawMessage) {
	t.Helper()
	n := len(got)
	if len(want) < n {
		n = len(want)
	}
	for i := 0; i < n; i++ {
		if !broadcastValueEquals(got[i], want[i]) {
			t.Fatalf("value %d of the broadcast is %s, Node has %s\n  go:   %s\n  node: %s",
				i, showWireValue(got[i]), string(want[i]),
				showWireRange(got, i), showJSONRange(want, i))
		}
	}
	if len(got) != len(want) {
		t.Fatalf("the broadcast is %d values, Node's is %d (they agree up to there)",
			len(got), len(want))
	}
}

func broadcastValueEquals(got net.Value, want json.RawMessage) bool {
	text := string(want)
	switch text {
	case "null":
		return got.Kind == net.KindNumber && math.IsNaN(got.Num)
	case "true":
		return got.Kind == net.KindNumber && got.Num == 1
	case "false":
		return got.Kind == net.KindNumber && got.Num == 0
	}
	var s string
	if err := json.Unmarshal(want, &s); err == nil {
		return got.Kind == net.KindString && got.Str == s
	}
	var f float64
	if err := json.Unmarshal(want, &f); err == nil {
		return got.Kind == net.KindNumber && got.Num == f
	}
	return false
}

func showWireValue(v net.Value) string {
	if v.Kind == net.KindString {
		return fmt.Sprintf("%q", v.Str)
	}
	return fmt.Sprintf("%v", v.Num)
}

func showWireRange(vals []net.Value, at int) string {
	lo, hi := at-4, at+5
	if lo < 0 {
		lo = 0
	}
	if hi > len(vals) {
		hi = len(vals)
	}
	out := ""
	for i := lo; i < hi; i++ {
		if i > lo {
			out += " "
		}
		out += showWireValue(vals[i])
	}
	return out
}

func showJSONRange(vals []json.RawMessage, at int) string {
	lo, hi := at-4, at+5
	if lo < 0 {
		lo = 0
	}
	if hi > len(vals) {
		hi = len(vals)
	}
	out := ""
	for i := lo; i < hi; i++ {
		if i > lo {
			out += " "
		}
		out += string(vals[i])
	}
	return out
}

type broadcastProbe struct {
	Seed        int             `json:"seed"`
	Gamemode    string          `json:"gamemode"`
	Bots        int             `json:"bots"`
	CycleSpeed  float64         `json:"cycleSpeed"`
	TicksPer250 int             `json:"ticksPer250"`
	BodyID      float64         `json:"bodyID"`
	JoinDraws   int             `json:"joinDraws"`
	TickDraws   []int           `json:"tickDraws"`
	BodyTeam    float64         `json:"bodyTeam"`
	Candidates  []broadcastRow  `json:"candidates"`
	Steps       []broadcastStep `json:"steps"`
}

type broadcastRow struct {
	ID    float64 `json:"id"`
	Score float64 `json:"score"`
	Index string  `json:"index"`
	Name  string  `json:"name"`
	Label string  `json:"label"`
	Type  string  `json:"type"`
}

type broadcastStep struct {
	Label               string            `json:"label"`
	Note                string            `json:"note"`
	Opcodes             []string          `json:"opcodes"`
	Mockups             int               `json:"mockups"`
	Broadcasts          int               `json:"broadcasts"`
	Frame               []json.RawMessage `json:"frame"`
	TopPlayerID         float64           `json:"topPlayerID"`
	SelectedLeaderboard string            `json:"selectedLeaderboard"`
	SeesAllTeams        bool              `json:"seesAllTeams"`
	NeedsNewBroadcast   bool              `json:"needsNewBroadcast"`
	ForceNewBroadcast   bool              `json:"forceNewBroadcast"`
	Entities            int               `json:"entities"`
}

func loadBroadcastProbe(t *testing.T) *broadcastProbe {
	t.Helper()
	path := filepath.Join("..", "..", "gen", "broadcast-probe-ffa-s1.json")
	raw, err := os.ReadFile(path)
	if err != nil {
		t.Skipf("no broadcast probe: %v\nrun: node tools/harness/probe-broadcast.js "+
			"--seed 1 --gamemode ffa --bots 8 --out gen/broadcast-probe-ffa-s1.json", err)
	}
	var p broadcastProbe
	if err := json.Unmarshal(raw, &p); err != nil {
		t.Fatalf("parsing %s: %v", path, err)
	}
	if len(p.Steps) == 0 {
		t.Fatal("the probe has no steps")
	}
	return &p
}

// TestBroadcastLeaderboardCandidates checks the room instead of the board rows.
func TestBroadcastLeaderboardCandidates(t *testing.T) {
	probe := loadBroadcastProbe(t)

	tuning, err := config.Default()
	if err != nil {
		t.Fatal(err)
	}
	tuning.BotCap = probe.Bots

	opts := testOptions(uint64(probe.Seed), probe.Gamemode)
	opts.UseDefiner = true
	opts.Tuning = &tuning
	// Use the simulation's virtual clock, not wall time.
	var g *Game
	opts.WorldNow = func() int64 {
		if g == nil {
			return 0
		}
		return int64(g.Sim.ElapsedMS())
	}
	g = mustBoot(t, opts)

	d, stop := dialAndDrive(t, g)
	defer stop()

	apply := func() {
		t.Helper()
		select {
		case cmd := <-d.cmds:
			g.Sockets.Apply(cmd)
		case <-time.After(5 * time.Second):
			t.Fatal("no command arrived")
		}
	}
	apply()
	d.send(t, net.S(net.OpClKey), net.S(""))
	apply()
	d.send(t, net.S(net.OpClSpawn), net.S(""), net.N(1), net.N(0), net.B(false), net.N(0))
	apply()
	d.send(t, net.S(net.OpClSpawn), net.S("Watcher"), net.N(0), net.N(0), net.B(false), net.N(0))
	apply()

	// One settling tick, then one burst per step.
	tick := func() { g.Sim.Step() }
	tick()
	sock := g.Sockets.Clients()[0]
	for i := range probe.Steps {
		applyBroadcastStep(t, d, apply, sock, &probe.Steps[i])
		for n := 0; n < probe.TicksPer250; n++ {
			tick()
		}
	}

	var got []broadcastRow
	g.Room.World.EachLive(func(id entity.EntityID, e *entity.Entity) {
		if e.Settings.Leaderboardable && e.Settings.DrawShape &&
			!g.Room.Extras.Get(id).Incognito &&
			(e.Type == "tank" || e.KillCount.Solo != 0 || e.KillCount.Assists != 0) {
			got = append(got, broadcastRow{
				ID:    float64(e.WireID),
				Score: math.Round(e.Skill.Score),
				Index: e.Index,
				Name:  e.Name,
				Label: e.Label,
				Type:  e.Type,
			})
		}
	})
	sortCandidates(got)

	if len(got) != len(probe.Candidates) {
		t.Fatalf("%d leaderboard candidates, Node has %d:\n go %v\nnode %v",
			len(got), len(probe.Candidates), got, probe.Candidates)
	}
	for i := range got {
		if got[i] != probe.Candidates[i] {
			t.Errorf("candidate %d is %+v, Node has %+v", i, got[i], probe.Candidates[i])
		}
	}
}

// sortCandidates sorts by score descending, then by id ascending.
func sortCandidates(rows []broadcastRow) {
	for i := 1; i < len(rows); i++ {
		for j := i; j > 0; j-- {
			a, b := rows[j-1], rows[j]
			if a.Score > b.Score || (a.Score == b.Score && a.ID <= b.ID) {
				break
			}
			rows[j-1], rows[j] = b, a
		}
	}
}

// TestBroadcastDrawsPerTick compares randomness spent per tick against Node.
func TestBroadcastDrawsPerTick(t *testing.T) {
	probe := loadBroadcastProbe(t)

	tuning, err := config.Default()
	if err != nil {
		t.Fatal(err)
	}
	tuning.BotCap = probe.Bots

	opts := testOptions(uint64(probe.Seed), probe.Gamemode)
	opts.UseDefiner = true
	opts.Tuning = &tuning
	// Use the simulation's virtual clock, not wall time.
	var g *Game
	opts.WorldNow = func() int64 {
		if g == nil {
			return 0
		}
		return int64(g.Sim.ElapsedMS())
	}
	g = mustBoot(t, opts)

	d, stop := dialAndDrive(t, g)
	defer stop()

	apply := func() {
		t.Helper()
		select {
		case cmd := <-d.cmds:
			g.Sockets.Apply(cmd)
		case <-time.After(5 * time.Second):
			t.Fatal("no command arrived")
		}
	}
	apply()
	d.send(t, net.S(net.OpClKey), net.S(""))
	apply()
	d.send(t, net.S(net.OpClSpawn), net.S(""), net.N(1), net.N(0), net.B(false), net.N(0))
	apply()
	d.send(t, net.S(net.OpClSpawn), net.S("Watcher"), net.N(0), net.N(0), net.B(false), net.N(0))
	apply()

	if got := int(g.Rand.Calls()); got != probe.JoinDraws {
		t.Fatalf("the boot and the join spent %d draws, Node spends %d", got, probe.JoinDraws)
	}

	// One settling tick, then one burst per step.
	var draws []int
	record := func() {
		g.Sim.Step()
		draws = append(draws, int(g.Rand.Calls()))
	}
	record()
	sock := g.Sockets.Clients()[0]
	for i := range probe.Steps {
		applyBroadcastStep(t, d, apply, sock, &probe.Steps[i])
		for n := 0; n < probe.TicksPer250; n++ {
			record()
		}
	}

	if len(draws) != len(probe.TickDraws) {
		t.Fatalf("ran %d ticks, the probe ran %d", len(draws), len(probe.TickDraws))
	}
	for i := range draws {
		if draws[i] != probe.TickDraws[i] {
			spentGo, spentNode := draws[i], probe.TickDraws[i]
			if i > 0 {
				spentGo -= draws[i-1]
				spentNode -= probe.TickDraws[i-1]
			} else {
				spentGo -= probe.JoinDraws
				spentNode -= probe.JoinDraws
			}
			t.Fatalf("tick %d spent %d draws, Node spends %d "+
				"(totals %d and %d; every earlier tick agrees)",
				i, spentGo, spentNode, draws[i], probe.TickDraws[i])
		}
	}
}
