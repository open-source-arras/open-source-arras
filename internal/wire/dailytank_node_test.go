package wire

import (
	"encoding/json"
	"math"
	"os"
	"path/filepath"
	"testing"
	"time"

	"arrasgo/internal/config"
	"arrasgo/internal/net"
)

type dailyProbe struct {
	Seed       int              `json:"seed"`
	Gamemode   string           `json:"gamemode"`
	DailyTank  config.DailyTank `json:"dailyTank"`
	CycleSpeed float64          `json:"cycleSpeed"`
	Steps      []dailyStep      `json:"steps"`
}

type dailyStep struct {
	Name  string          `json:"name"`
	Note  string          `json:"note"`
	Ticks int             `json:"ticks"`
	Threw string          `json:"threw"`
	Value json.RawMessage `json:"value"`
}

// TestDailyTankMatchesNode replays tools/harness/probe-dailytank.js: the ad wall
// in front of the daily tank, and the upgrade behind it.
//
// The room it boots is the one shipped server-list row that configures a daily
// tank. Without one every DT opcode kicks, which is the state the other six rows
// are in and the state this port is in by default. So this is the only test
// that reaches the handlers at all.
func TestDailyTankMatchesNode(t *testing.T) {
	probe := loadDailyProbe(t)

	tuning, err := config.Default()
	if err != nil {
		t.Fatal(err)
	}
	tuning.BotCap = 0
	daily := probe.DailyTank
	tuning.DailyTank = &daily

	opts := testOptions(uint64(probe.Seed), probe.Gamemode)
	opts.UseDefiner = true
	opts.Tuning = &tuning

	var clockMS float64
	opts.Now = func() float64 { return clockMS }
	opts.WorldNow = func() int64 { return int64(clockMS) }
	g := mustBoot(t, opts)

	ticks := 0
	tick := func() {
		ticks++
		clockMS = math.Max(float64(ticks)*probe.CycleSpeed, clockMS)
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

	d, s := join("Watcher")

	body := func() *entityView {
		e := g.Room.World.Get(s.Player.Body)
		if e == nil {
			t.Fatal("no body")
		}
		return &entityView{
			Index:    e.Index,
			Label:    e.Label,
			Upgrades: len(e.Upgrades),
			Level:    int(e.Skill.Level),
			Points:   int(e.Skill.Points),
		}
	}

	for i := range probe.Steps {
		step := &probe.Steps[i]
		switch step.Name {
		case "the index is resolved on connect":
			var want struct {
				Tank           string  `json:"tank"`
				Tier           int     `json:"tier"`
				Ads            bool    `json:"ads"`
				TierMultiplier int     `json:"tierMultiplier"`
				Index          *string `json:"index"`
				UpgradeDelay   int     `json:"upgradeDelay"`
				BodyLevel      int     `json:"bodyLevel"`
			}
			decodeDaily(t, step, &want)
			if g.Room.Tuning.TierMultiplier != want.TierMultiplier ||
				g.Room.Tuning.UpgradeDelay != want.UpgradeDelay {
				t.Fatalf("%s: tier_multiplier=%d upgrade_delay=%d, Node's %d/%d", step.Name,
					g.Room.Tuning.TierMultiplier, g.Room.Tuning.UpgradeDelay,
					want.TierMultiplier, want.UpgradeDelay)
			}
			if want.Index == nil {
				t.Fatalf("%s: Node resolved no index", step.Name)
			}
			got := g.Players.daily
			if !got.Configured || got.Index != *want.Index ||
				got.Tier != want.Tier || got.Ads != want.Ads {
				t.Errorf("%s: daily tank is %+v, Node has index %q tier %d ads %v",
					step.Name, got, *want.Index, want.Tier, want.Ads)
			}
			if b := body(); b.Level != want.BodyLevel {
				t.Errorf("%s: the body is level %d, Node's is %d", step.Name, b.Level, want.BodyLevel)
			}

		case "an ad request below the tier":
			var want struct {
				Opcodes         []string `json:"opcodes"`
				WatchedAdClient bool     `json:"watchedAdClient"`
			}
			decodeDaily(t, step, &want)
			d.drain()
			d.send(t, net.S(net.OpClDailyTankAd))
			d.apply()
			checkOps(t, step.Name, collectFrames(d), want.Opcodes)
			if s.Status.DailyTankWatchedAdClient != want.WatchedAdClient {
				t.Errorf("%s: watchedAdClient=%v, Node %v", step.Name,
					s.Status.DailyTankWatchedAdClient, want.WatchedAdClient)
			}

		case "level up past the tier":
			var want struct {
				Level  int `json:"level"`
				Points int `json:"points"`
			}
			decodeDaily(t, step, &want)
			for guard := 400; guard > 0; guard-- {
				if b := body(); b.Level >= g.Room.Tuning.TierMultiplier*g.Players.daily.Tier {
					break
				}
				d.send(t, net.S(net.OpClLevelUp))
				d.apply()
			}
			if b := body(); b.Level != want.Level || b.Points != want.Points {
				t.Fatalf("%s: level %d with %d points, Node's is %d with %d",
					step.Name, b.Level, b.Points, want.Level, want.Points)
			}

		case "an upgrade request before the ad", "the upgrade":
			var want struct {
				Said     []string `json:"said"`
				Index    string   `json:"index"`
				Label    string   `json:"label"`
				Upgrades int      `json:"upgrades"`
				Pending  *struct {
					TankLabel string `json:"tankLabel"`
				} `json:"pending"`
			}
			decodeDaily(t, step, &want)
			d.drain()
			d.send(t, net.S(net.OpClUpgrade), net.N(0), net.N(-1))
			d.apply()
			if got := popupsOf(collectFrames(d)); !equalStrings(got, want.Said) {
				t.Errorf("%s: popups %q, Node's %q", step.Name, got, want.Said)
			}
			b := body()
			if b.Index != want.Index || b.Label != want.Label || b.Upgrades != want.Upgrades {
				t.Errorf("%s: the body is %s/%q with %d upgrade rows, Node's is %s/%q with %d",
					step.Name, b.Index, b.Label, b.Upgrades, want.Index, want.Label, want.Upgrades)
			}
			e := g.Room.World.Get(s.Player.Body)
			if pending := e != nil && e.UpgradePending.Set; pending != (want.Pending != nil) {
				t.Errorf("%s: pending=%v, Node %v -- the daily-tank request only parks "+
					"once the ad has been watched", step.Name, pending, want.Pending != nil)
			}

		case "the ad request":
			var want struct {
				Opcodes         []string `json:"opcodes"`
				Payload         *string  `json:"payload"`
				WatchedAdClient bool     `json:"watchedAdClient"`
				WatchedAd       bool     `json:"watchedAd"`
			}
			decodeDaily(t, step, &want)
			d.drain()
			d.send(t, net.S(net.OpClDailyTankAd))
			d.apply()
			frames := collectFrames(d)
			checkOps(t, step.Name, frames, want.Opcodes)
			if want.Payload == nil {
				t.Fatalf("%s: Node sent no payload", step.Name)
			}
			var got string
			for _, f := range frames {
				if op, rest, ok := net.Opcode(f); ok && op == net.OpSvDailyTankAd && len(rest) > 0 {
					got = rest[0].Str
				}
			}
			if got != *want.Payload {
				t.Errorf("%s: payload %q, Node's %q -- the object is built by hand, so the "+
					"key order and which keys are dropped are both part of it",
					step.Name, got, *want.Payload)
			}
			if s.Status.DailyTankWatchedAdClient != want.WatchedAdClient ||
				s.Status.DailyTankWatchedAd != want.WatchedAd {
				t.Errorf("%s: watchedAdClient=%v watchedAd=%v, Node %v/%v", step.Name,
					s.Status.DailyTankWatchedAdClient, s.Status.DailyTankWatchedAd,
					want.WatchedAdClient, want.WatchedAd)
			}

		case "acknowledging before the timer lands", "acknowledging after it lands":
			var want struct {
				Opcodes   []string `json:"opcodes"`
				WatchedAd bool     `json:"watchedAd"`
			}
			decodeDaily(t, step, &want)
			d.drain()
			d.send(t, net.S(net.OpClDailyTankAdDone))
			d.apply()
			checkOps(t, step.Name, collectFrames(d), want.Opcodes)
			if s.Status.DailyTankWatchedAd != want.WatchedAd {
				t.Errorf("%s: watchedAd=%v, Node %v", step.Name, s.Status.DailyTankWatchedAd, want.WatchedAd)
			}

		case "the ad timer lands":
			var want struct {
				IsImage         bool `json:"isImage"`
				WatchedAdClient bool `json:"watchedAdClient"`
				WatchedAd       bool `json:"watchedAd"`
			}
			decodeDaily(t, step, &want)
			for ticks < step.Ticks {
				tick()
			}
			if s.Status.DailyTankWatchedAdClient != want.WatchedAdClient ||
				s.Status.DailyTankWatchedAd != want.WatchedAd {
				t.Errorf("%s: watchedAdClient=%v watchedAd=%v, Node %v/%v -- the two nested "+
					"setTimeouts credit the client, and only a DTAD credits the socket",
					step.Name, s.Status.DailyTankWatchedAdClient, s.Status.DailyTankWatchedAd,
					want.WatchedAdClient, want.WatchedAd)
			}

		case "the ad start acknowledgement":
			var want struct {
				Opcodes               []string `json:"opcodes"`
				ForceNewBroadcast     bool     `json:"forceNewBroadcast"`
				WatchedAdClientBefore bool     `json:"watchedAdClientBefore"`
				WatchedAdClientAfter  bool     `json:"watchedAdClientAfter"`
			}
			decodeDaily(t, step, &want)
			d2, s2 := join("Starter")
			d2.drain()
			d2.send(t, net.S(net.OpClDailyTankAdStart), net.N(4.75))
			d2.apply()
			checkOps(t, step.Name, collectFrames(d2), want.Opcodes)
			if s2.Status.ForceNewBroadcast != want.ForceNewBroadcast {
				t.Errorf("%s: forceNewBroadcast=%v, Node %v -- the case has no break and "+
					"falls into NWB", step.Name, s2.Status.ForceNewBroadcast, want.ForceNewBroadcast)
			}
			if s2.Status.DailyTankWatchedAdClient != want.WatchedAdClientBefore {
				t.Errorf("%s: watchedAdClient=%v before the timers, Node %v", step.Name,
					s2.Status.DailyTankWatchedAdClient, want.WatchedAdClientBefore)
			}
			for ticks < step.Ticks {
				tick()
			}
			if s2.Status.DailyTankWatchedAdClient != want.WatchedAdClientAfter {
				t.Errorf("%s: watchedAdClient=%v after them, Node %v", step.Name,
					s2.Status.DailyTankWatchedAdClient, want.WatchedAdClientAfter)
			}

		default:
			t.Fatalf("unhandled probe step %q -- probe-dailytank.js grew a case this test "+
				"does not replay, which would otherwise pass silently", step.Name)
		}

		if ticks != step.Ticks {
			t.Fatalf("after %q %d ticks have run, Node ran %d", step.Name, ticks, step.Ticks)
		}
	}
}

// entityView is the handful of body fields this probe compares.
type entityView struct {
	Index    string
	Label    string
	Upgrades int
	Level    int
	Points   int
}

func checkOps(t *testing.T, where string, frames [][]net.Value, want []string) {
	t.Helper()
	var got []string
	for _, f := range frames {
		if op, _, ok := net.Opcode(f); ok {
			got = append(got, op)
		}
	}
	if !equalStrings(got, want) {
		t.Errorf("%s: opcodes %q, Node's %q", where, got, want)
	}
}

func decodeDaily(t *testing.T, s *dailyStep, out any) {
	t.Helper()
	if err := json.Unmarshal(s.Value, out); err != nil {
		t.Fatalf("step %q: %v", s.Name, err)
	}
}

func loadDailyProbe(t *testing.T) *dailyProbe {
	t.Helper()
	path := filepath.Join("..", "..", "gen", "dailytank-probe-s1.json")
	raw, err := os.ReadFile(path)
	if err != nil {
		t.Skipf("no daily tank probe (%v); run tools/harness/probe-dailytank.js", err)
	}
	var p dailyProbe
	if err := json.Unmarshal(raw, &p); err != nil {
		t.Fatalf("%s: %v", path, err)
	}
	if len(p.Steps) == 0 {
		t.Fatalf("%s: no steps", path)
	}
	return &p
}
