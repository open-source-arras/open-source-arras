package wire

import (
	"context"
	"encoding/json"
	stdnet "net"
	"net/http"
	"os"
	"path/filepath"
	"testing"
	"time"

	"github.com/gorilla/websocket"

	"arrasgo/internal/entity"
	"arrasgo/internal/net"
)

// TestUpgradeMatchesNode checks that upgrade behavior matches Node.js.
func TestUpgradeMatchesNode(t *testing.T) {
	probe := loadUpgradeProbe(t)

	opts := testOptions(1, probe.Gamemode)
	opts.UseDefiner = true
	// The upgrade delay needs the virtual clock.
	clock := int64(0)
	opts.WorldNow = func() int64 { return clock }
	g := mustBoot(t, opts)

	d, stop := dialAndDrive(t, g)
	defer stop()

	step := func() {
		t.Helper()
		select {
		case cmd := <-d.cmds:
			g.Sockets.Apply(cmd)
		case <-time.After(5 * time.Second):
			t.Fatal("no command arrived")
		}
	}

	step()
	d.next(t, net.OpSvWelcome)
	d.send(t, net.S(net.OpClKey), net.S(""))
	step()
	d.next(t, net.OpSvKeyAccepted)
	d.send(t, net.S(net.OpClSpawn), net.S(""), net.N(1), net.N(0), net.B(false), net.N(0))
	step()
	d.send(t, net.S(net.OpClSpawn), net.S("Upgrader"), net.N(0), net.N(0), net.B(false), net.N(0))
	step()

	s := g.Sockets.Clients()[0]
	id := s.Player.Body
	body := func() *entity.Entity { return g.Room.World.Get(id) }
	if body() == nil {
		t.Fatal("no body after the spawn")
	}

	want := probe.step(t, "level up to the first upgrade tier")
	for i := 0; i < 200 && float64(body().Skill.Level) < want.Level; i++ {
		d.send(t, net.S(net.OpClLevelUp))
		step()
	}
	if got := float64(body().Skill.Level); got != want.Level {
		t.Fatalf("after the level-up cheat the body is level %v, Node reaches %v", got, want.Level)
	}
	if got := float64(body().Skill.Points); got != want.Points {
		t.Errorf("level %v leaves %v skill points, Node leaves %v", want.Level, got, want.Points)
	}
	if got := body().Skill.Score; got != want.Score {
		t.Errorf("score is %v, Node has %v -- levelScore is what `L` adds", got, want.Score)
	}

	menu := probe.step(t, "the menu the client sees")
	var offered []string
	for i := range body().Upgrades {
		u := &body().Upgrades[i]
		if body().Skill.Level >= u.Level {
			offered = append(offered, g.Players.guis[s].labelFor(i, u))
		}
	}
	if len(offered) != len(menu.Upgrades) {
		t.Fatalf("the menu offers %d rows, Node offers %d:\n got %v\nwant %v",
			len(offered), len(menu.Upgrades), offered, menu.Upgrades)
	}
	for i := range offered {
		if offered[i] != menu.Upgrades[i] {
			t.Errorf("menu row %d is %q, Node has %q", i, offered[i], menu.Upgrades[i])
		}
	}
	if got := g.Room.InBase(id); got != menu.InBase {
		t.Errorf("InBase is %v, Node says %v -- the whole upgrade delay hangs off it", got, menu.InBase)
	}
	if got := float64(g.Room.Tuning.UpgradeDelay); got != menu.UpgradeDelay {
		t.Errorf("upgrade_delay is %v, Node has %v", got, menu.UpgradeDelay)
	}

	tick := func() {
		t.Helper()
		clock += int64(g.Sim.CycleSpeed() / time.Millisecond)
		g.Sim.Step()
	}
	tick()
	d.drain()

	for _, c := range []struct {
		name  string
		index int
		max   int
	}{
		{"one point into atk", 0, 0},
		{"max out hlt", 1, 1},
		{"a stat with no points left", 2, 0},
	} {
		w := probe.step(t, c.name)
		d.send(t, net.S(net.OpClStat), net.N(c.index), net.N(c.max))
		step()
		for i, amount := range w.Amounts {
			slot := guiStatSlots[i]
			if got := float64(body().Skill.Amount(slot)); got != amount {
				t.Errorf("%s: stat %s is %v, Node has %v", c.name, net.StatNames[i], got, amount)
			}
		}
		if got := float64(body().Skill.Points); got != w.Points {
			t.Errorf("%s: %v points left, Node leaves %v", c.name, got, w.Points)
		}
	}

	req := probe.step(t, "an upgrade request outside a base")
	labelBefore := body().Label
	d.drain() // so the popup read below sees this request's popup and not a spawn one
	d.send(t, net.S(net.OpClUpgrade), net.N(0), net.N(0))
	step()

	if got := body().Label; got != req.Label {
		t.Errorf("the body upgraded immediately to %q; Node leaves it as %q until "+
			"the player holds still", got, req.Label)
	}
	pend := body().UpgradePending
	if req.Pending == nil {
		t.Fatal("the probe recorded no pending upgrade; re-run tools/harness/probe-upgrade.js")
	}
	if !pend.Set {
		t.Fatal("no pending upgrade was recorded; the stand-still delay is not wired")
	}
	if float64(pend.Number) != req.Pending.Number {
		t.Errorf("pending number is %v, Node has %v", pend.Number, req.Pending.Number)
	}
	if float64(pend.BranchID) != req.Pending.BranchID {
		t.Errorf("pending branchId is %v, Node has %v", pend.BranchID, req.Pending.BranchID)
	}
	if pend.TankLabel != req.Pending.TankLabel {
		t.Errorf("pending tankLabel is %q, Node has %q", pend.TankLabel, req.Pending.TankLabel)
	}
	if pend.LastIndex != req.Pending.LastIndex {
		t.Errorf("pending lastIndex is %q, Node has %q", pend.LastIndex, req.Pending.LastIndex)
	}
	if len(req.Messages) != 1 {
		t.Fatalf("the probe recorded %d popups, want 1", len(req.Messages))
	}
	popup, err := net.ParseSvPopup(d.next(t, net.OpSvPopup))
	if err != nil {
		t.Fatalf("parsing m: %v", err)
	}
	if got := popup.Text; got != req.Messages[0] {
		t.Errorf("the popup is %q, Node sends %q", got, req.Messages[0])
	}

	menuWhile := probe.step(t, "the menu while an upgrade is pending")
	d.drain()
	tick()
	if got := d.nextUplinkGUI(t); float64(got) != menuWhile.GUIMask {
		t.Errorf("the HUD mask while an upgrade is pending is %#x, Node sends %#x",
			got, int(menuWhile.GUIMask))
	}

	held := probe.step(t, "hold still past the delay")
	deadline := clock + int64(g.Room.Tuning.UpgradeDelay) + 200
	for i := 0; i < 2000 && clock < deadline && body().UpgradePending.Set; i++ {
		tick()
		d.drain()
	}
	if body().UpgradePending.Set {
		t.Fatalf("the upgrade is still pending after %d ms; global.js:216 never resolved it",
			clock)
	}
	if got := body().Label; got != held.Label {
		t.Errorf("the body upgraded to %q, Node upgrades to %q", got, held.Label)
	}
	if got := body().Index; got != held.Index {
		t.Errorf("the body is definition %q, Node has %q", got, held.Index)
	}
	if held.Label == labelBefore {
		t.Fatal("the probe's own body never changed class; the case proves nothing")
	}
}

// TestOutOfRangeUpgradeDoesNotPanic deliberately differs: docs/found-bugs.md #76.
func TestOutOfRangeUpgradeDoesNotPanic(t *testing.T) {
	probe := loadUpgradeProbe(t)
	crash := probe.rawStep(t, "an out-of-range upgrade index while the delay applies")
	if crash.Threw == nil {
		t.Fatal("the probe no longer records a throw; if the source grew a bounds " +
			"check, this port should follow it rather than keep the deviation")
	}

	opts := testOptions(1, probe.Gamemode)
	opts.UseDefiner = true
	clock := int64(0)
	opts.WorldNow = func() int64 { return clock }
	g := mustBoot(t, opts)

	d, stop := dialAndDrive(t, g)
	defer stop()
	step := func() {
		t.Helper()
		select {
		case cmd := <-d.cmds:
			g.Sockets.Apply(cmd)
		case <-time.After(5 * time.Second):
			t.Fatal("no command arrived")
		}
	}

	step()
	d.next(t, net.OpSvWelcome)
	d.send(t, net.S(net.OpClKey), net.S(""))
	step()
	d.next(t, net.OpSvKeyAccepted)
	d.send(t, net.S(net.OpClSpawn), net.S(""), net.N(1), net.N(0), net.B(false), net.N(0))
	step()
	d.send(t, net.S(net.OpClSpawn), net.S("Crasher"), net.N(0), net.N(0), net.B(false), net.N(0))
	step()

	s := g.Sockets.Clients()[0]
	id := s.Player.Body
	if g.Room.World.Get(id) == nil {
		t.Fatal("no body after the spawn")
	}
	if g.Room.InBase(id) {
		t.Fatal("the body spawned in a base, so the delay branch is not reached")
	}

	d.send(t, net.S(net.OpClUpgrade), net.N(999), net.N(0))
	step()

	body := g.Room.World.Get(id)
	if body == nil {
		t.Fatal("the body is gone after an out-of-range upgrade request")
	}
	if body.UpgradePending.Set {
		t.Errorf("an out-of-range index parked a pending upgrade for row %d", body.UpgradePending.Number)
	}
	clock += int64(g.Sim.CycleSpeed() / time.Millisecond)
	g.Sim.Step()
	if g.Room.World.Get(id) == nil {
		t.Error("the room stopped ticking the body after the bad request")
	}
}

// dialAndDrive stands the game up behind a websocket for step-by-step testing.
type driven struct {
	ws     *websocket.Conn
	frames chan []net.Value
	cmds   <-chan net.Command
	apply  func()
}

func dialAndDrive(t *testing.T, g *Game) (*driven, func()) {
	t.Helper()
	ln, err := stdnet.Listen("tcp", "127.0.0.1:0")
	if err != nil {
		t.Fatal(err)
	}
	httpSrv := &http.Server{Handler: g.Handler()}
	go func() { _ = httpSrv.Serve(ln) }()

	ws, _, err := websocket.DefaultDialer.Dial("ws://"+ln.Addr().String(), nil)
	if err != nil {
		t.Fatal(err)
	}
	d := &driven{ws: ws, frames: make(chan []net.Value, 4096), cmds: g.Net.Commands()}
	go func() {
		defer close(d.frames)
		for {
			_, data, err := ws.ReadMessage()
			if err != nil {
				return
			}
			if m := net.Decode(data); m != nil {
				d.frames <- m
			}
		}
	}()
	return d, func() {
		_ = ws.Close()
		ctx, cancel := context.WithTimeout(context.Background(), 5*time.Second)
		defer cancel()
		_ = httpSrv.Shutdown(ctx)
	}
}

func (d *driven) send(t *testing.T, vals ...net.Value) {
	t.Helper()
	if err := d.ws.WriteMessage(websocket.BinaryMessage, frame(t, vals...)); err != nil {
		t.Fatal(err)
	}
}

// drain discards pending frames.
func (d *driven) drain() {
	deadline := time.Now().Add(150 * time.Millisecond)
	for time.Now().Before(deadline) {
		select {
		case <-d.frames:
			deadline = time.Now().Add(50 * time.Millisecond)
		case <-time.After(20 * time.Millisecond):
		}
	}
}

func (d *driven) next(t *testing.T, want string) []net.Value {
	t.Helper()
	deadline := time.After(5 * time.Second)
	for {
		select {
		case m, ok := <-d.frames:
			if !ok {
				t.Fatalf("the connection closed while waiting for %q", want)
			}
			op, rest, ok := net.Opcode(m)
			if !ok {
				continue
			}
			if op == want {
				return rest
			}
		case <-deadline:
			t.Fatalf("no %q frame arrived", want)
		}
	}
}

// nextUplinkGUI reads a full uplink with HUD.
func (d *driven) nextUplinkGUI(t *testing.T) int {
	t.Helper()
	deadline := time.After(5 * time.Second)
	for {
		select {
		case m, ok := <-d.frames:
			if !ok {
				t.Fatal("the connection closed while waiting for an uplink")
			}
			op, rest, ok := net.Opcode(m)
			if !ok || op != net.OpSvUplink || len(rest) == 3 {
				continue
			}
			u, err := net.ParseSvUplink(rest)
			if err != nil {
				t.Fatalf("parsing u: %v", err)
			}
			return u.GUI.Mask()
		case <-deadline:
			t.Fatal("no full uplink arrived")
		}
	}
}

type upgradeProbe struct {
	Gamemode string             `json:"gamemode"`
	Steps    []upgradeProbeStep `json:"steps"`
}

type upgradeProbeStep struct {
	Name  string           `json:"name"`
	Threw *string          `json:"threw"`
	Value upgradeStepValue `json:"value"`
}

type upgradeStepValue struct {
	Level        float64        `json:"level"`
	Points       float64        `json:"points"`
	Score        float64        `json:"score"`
	GUIMask      float64        `json:"guiMask"`
	Upgrades     []string       `json:"upgrades"`
	InBase       bool           `json:"inBase"`
	UpgradeDelay float64        `json:"upgradeDelay"`
	Amounts      []float64      `json:"amounts"`
	Label        string         `json:"label"`
	Index        string         `json:"index"`
	Pending      *pendingRecord `json:"pending"`
	Messages     []string       `json:"messages"`
}

type pendingRecord struct {
	Number    float64 `json:"number"`
	BranchID  float64 `json:"branchId"`
	TankLabel string  `json:"tankLabel"`
	LastIndex string  `json:"lastIndex"`
}

func (p *upgradeProbe) rawStep(t *testing.T, name string) *upgradeProbeStep {
	t.Helper()
	for i := range p.Steps {
		if p.Steps[i].Name == name {
			return &p.Steps[i]
		}
	}
	t.Fatalf("the probe has no step named %q; re-run tools/harness/probe-upgrade.js", name)
	return nil
}

func (p *upgradeProbe) step(t *testing.T, name string) *upgradeStepValue {
	t.Helper()
	for i := range p.Steps {
		if p.Steps[i].Name == name {
			if p.Steps[i].Threw != nil {
				t.Fatalf("the probe's %q step threw: %s", name, *p.Steps[i].Threw)
			}
			return &p.Steps[i].Value
		}
	}
	t.Fatalf("the probe has no step named %q; re-run tools/harness/probe-upgrade.js", name)
	return nil
}

func loadUpgradeProbe(t *testing.T) *upgradeProbe {
	t.Helper()
	path := filepath.Join("..", "..", "gen", "upgrade-probe-ffa-s1.json")
	raw, err := os.ReadFile(path)
	if err != nil {
		t.Fatalf("read %s: %v (run: node tools/harness/probe-upgrade.js --seed 1 "+
			"--gamemode ffa --out %s)", path, err, path)
	}
	var p upgradeProbe
	if err := json.Unmarshal(raw, &p); err != nil {
		t.Fatalf("parsing %s: %v", path, err)
	}
	return &p
}
