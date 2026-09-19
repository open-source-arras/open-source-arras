package wire

import (
	"encoding/json"
	"math"
	"os"
	"path/filepath"
	"strconv"
	"testing"
	"time"

	"arrasgo/internal/config"
	"arrasgo/internal/entity"
	"arrasgo/internal/net"
)

type tankTreeProbe struct {
	Seed       int            `json:"seed"`
	Gamemode   string         `json:"gamemode"`
	SpawnClass string         `json:"spawnClass"`
	Steps      []tankTreeStep `json:"steps"`
}

type tankTreeStep struct {
	Name  string          `json:"name"`
	Note  string          `json:"note"`
	Threw string          `json:"threw"`
	Value json.RawMessage `json:"value"`
}

// tankTreeBurst is what one `T` produced: the frame opcodes in order, the mockup
// indexes among them, and the two "already sent" lists afterwards.
type tankTreeBurst struct {
	Opcodes              []string      `json:"opcodes"`
	Mockups              []json.Number `json:"mockups"`
	LastTank             string        `json:"lastTank"`
	Received             []string      `json:"received"`
	ReceivedUpgradePacks []string      `json:"receivedUpgradePacks"`
}

// TestTankTreeMatchesNode replays tools/harness/probe-tanktree.js.
//
// `T` is a burst of a hundred and thirty-eight mockup frames in an order two
// mutually recursive functions decide, filtered by two separate per-socket sets.
// Nothing about that order is guessable, and the client draws the upgrade menu
// from it, so the test compares the whole sequence index by index rather than as
// a set.
func TestTankTreeMatchesNode(t *testing.T) {
	probe := loadTankTreeProbe(t)

	tuning, err := config.Default()
	if err != nil {
		t.Fatal(err)
	}
	tuning.BotCap = 0

	opts := testOptions(uint64(probe.Seed), probe.Gamemode)
	opts.UseDefiner = true
	opts.Tuning = &tuning

	var clockMS float64
	opts.Now = func() float64 { return clockMS }
	opts.WorldNow = func() int64 { return int64(clockMS) }
	g := mustBoot(t, opts)

	ticks := 0
	cycle := float64(g.Sim.CycleSpeed()) / float64(time.Millisecond)
	tick := func() {
		ticks++
		clockMS = math.Max(float64(ticks)*cycle, clockMS)
		g.Sim.Step()
	}
	advance := func(ms float64) { clockMS += ms }

	join := func(name string) (*driven, *net.Socket) {
		t.Helper()
		d, stop := dialAndDrive(t, g)
		t.Cleanup(stop)
		apply := func() {
			t.Helper()
			select {
			case cmd := <-d.cmds:
				g.Sockets.Apply(cmd)
			case <-time.After(5 * time.Second):
				t.Fatalf("no command arrived from %s", name)
			}
		}
		apply()
		d.next(t, net.OpSvWelcome)
		d.send(t, net.S(net.OpClKey), net.S(""))
		apply()
		d.next(t, net.OpSvKeyAccepted)
		d.send(t, net.S(net.OpClSpawn), net.S(""), net.N(1), net.N(0), net.B(false), net.N(0))
		apply()
		d.send(t, net.S(net.OpClSpawn), net.S(name), net.N(0), net.N(0), net.B(false), net.N(0))
		apply()
		advance(20)
		d.apply = apply
		return d, clientNamed(t, g, name)
	}

	askForTree := func(d *driven) tankTreeBurst {
		t.Helper()
		d.drain()
		d.send(t, net.S(net.OpClTankTree))
		d.apply()
		var out tankTreeBurst
		for _, f := range collectFrames(d) {
			op, rest, ok := net.Opcode(f)
			if !ok {
				continue
			}
			out.Opcodes = append(out.Opcodes, op)
			if op == net.OpSvMockup && len(rest) > 0 {
				out.Mockups = append(out.Mockups, json.Number(wireIndexString(rest[0])))
			}
		}
		return out
	}

	d, s := join("Treeman")

	for i := range probe.Steps {
		step := &probe.Steps[i]
		switch step.Name {
		case "the tank before anything is asked for":
			var want struct {
				Index    string   `json:"index"`
				Label    string   `json:"label"`
				LastTank *string  `json:"lastTank"`
				Received []string `json:"received"`
			}
			decodeTankTree(t, step, &want)
			body := g.Room.World.Get(s.Player.Body)
			if body == nil {
				t.Fatal("no body after the join")
			}
			if body.Index != want.Index || body.Label != want.Label {
				t.Fatalf("the tank is %q/%q, Node's is %q/%q -- the tree below is that "+
					"class's", body.Index, body.Label, want.Index, want.Label)
			}
			if s.Status.HasLastTank != (want.LastTank != nil) {
				t.Errorf("lastTank set=%v before the first ask, Node %v",
					s.Status.HasLastTank, want.LastTank != nil)
			}
			if got := len(s.Status.MockupData.ReceivedIndexes); got != len(want.Received) {
				t.Errorf("%d mockups have been sent before the first `T`, Node sent %d",
					got, len(want.Received))
			}

		case "the first T", "a second T with the same tank":
			var want tankTreeBurst
			decodeTankTree(t, step, &want)
			checkBurst(t, step.Name, askForTree(d), &want, s)

		case "T after an upgrade":
			var want struct {
				IndexBefore string        `json:"indexBefore"`
				IndexAfter  string        `json:"indexAfter"`
				Label       string        `json:"label"`
				Burst       tankTreeBurst `json:"burst"`
			}
			decodeTankTree(t, step, &want)
			body := g.Room.World.Get(s.Player.Body)
			if body == nil {
				t.Fatal("no body before the upgrade")
			}
			for n := 0; n < 60 && !anyUpgradeOffered(body); n++ {
				d.send(t, net.S(net.OpClLevelUp))
				d.apply()
			}
			d.send(t, net.S(net.OpClUpgrade), net.N(0), net.N(0))
			d.apply()
			for n := 0; n < 400 && body.Index == want.IndexBefore; n++ {
				tick()
			}
			if body.Index != want.IndexAfter {
				t.Fatalf("after the upgrade the tank is %q, Node's is %q",
					body.Index, want.IndexAfter)
			}
			checkBurst(t, step.Name, askForTree(d), &want.Burst, s)

		case "a fresh client asking for the same tree":
			var want struct {
				Index    string        `json:"index"`
				Received []string      `json:"received"`
				Burst    tankTreeBurst `json:"burst"`
			}
			decodeTankTree(t, step, &want)
			d2, s2 := join("Sapling")
			checkBurst(t, step.Name, askForTree(d2), &want.Burst, s2)

		default:
			t.Fatalf("unhandled probe step %q -- probe-tanktree.js grew a case this test "+
				"does not replay, which would otherwise pass silently", step.Name)
		}
	}
}

func checkBurst(t *testing.T, name string, got tankTreeBurst, want *tankTreeBurst, s *net.Socket) {
	t.Helper()
	if !sameStrings(got.Opcodes, want.Opcodes) {
		if len(got.Opcodes) != len(want.Opcodes) {
			t.Errorf("%s: the burst is %d frames, Node's is %d", name, len(got.Opcodes), len(want.Opcodes))
		} else {
			t.Errorf("%s: the frame opcodes differ", name)
		}
	}
	if len(got.Mockups) != len(want.Mockups) {
		t.Errorf("%s: %d mockups, Node sends %d\n  go[:8]:   %v\n  node[:8]: %v",
			name, len(got.Mockups), len(want.Mockups),
			firstN(got.Mockups, 8), firstN(want.Mockups, 8))
		return
	}
	for i := range got.Mockups {
		if got.Mockups[i] != want.Mockups[i] {
			t.Fatalf("%s: mockup %d of the burst is %s, Node sends %s\n  go:   %v\n  node: %v",
				name, i, got.Mockups[i], want.Mockups[i],
				window(got.Mockups, i), window(want.Mockups, i))
		}
	}
	if want.LastTank != "" && s.Status.LastTank != want.LastTank {
		t.Errorf("%s: lastTank is %q, Node's is %q", name, s.Status.LastTank, want.LastTank)
	}
	if want.Received != nil {
		if got := len(s.Status.MockupData.ReceivedIndexes); got != len(want.Received) {
			t.Errorf("%s: the socket has been sent %d mockups, Node's has %d",
				name, got, len(want.Received))
		}
		for _, ix := range want.Received {
			if _, ok := s.Status.MockupData.ReceivedIndexes[ix]; !ok {
				t.Errorf("%s: Node has sent mockup %s and this has not", name, ix)
				break
			}
		}
	}
	if want.ReceivedUpgradePacks != nil {
		if got := len(s.Status.MockupData.ReceivedUpgradePackIndexes); got != len(want.ReceivedUpgradePacks) {
			t.Errorf("%s: %d upgrade packs marked sent, Node marks %d",
				name, got, len(want.ReceivedUpgradePacks))
		}
	}
}

func wireIndexString(v net.Value) string {
	if v.Kind == net.KindString {
		return v.Str
	}
	return strconv.FormatFloat(v.Num, 'f', -1, 64)
}

func firstN(v []json.Number, n int) []json.Number {
	if len(v) < n {
		return v
	}
	return v[:n]
}

func window(v []json.Number, at int) []json.Number {
	lo, hi := at-3, at+4
	if lo < 0 {
		lo = 0
	}
	if hi > len(v) {
		hi = len(v)
	}
	return v[lo:hi]
}

// anyUpgradeOffered is the menu's own test: at least one upgrade slot the body
// has reached the level for.
func anyUpgradeOffered(e *entity.Entity) bool {
	for i := range e.Upgrades {
		if e.Skill.Level >= e.Upgrades[i].Level {
			return true
		}
	}
	return false
}

func decodeTankTree(t *testing.T, s *tankTreeStep, out any) {
	t.Helper()
	if err := json.Unmarshal(s.Value, out); err != nil {
		t.Fatalf("step %q: %v", s.Name, err)
	}
}

func loadTankTreeProbe(t *testing.T) *tankTreeProbe {
	t.Helper()
	path := filepath.Join("..", "..", "gen", "tanktree-probe-ffa-s1.json")
	raw, err := os.ReadFile(path)
	if err != nil {
		t.Skipf("no tank tree probe (%v); run tools/harness/probe-tanktree.js", err)
	}
	var p tankTreeProbe
	if err := json.Unmarshal(raw, &p); err != nil {
		t.Fatalf("%s: %v", path, err)
	}
	if len(p.Steps) == 0 {
		t.Fatalf("%s: no steps", path)
	}
	return &p
}
