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

	"arrasgo/internal/net"
)

// TestSpawnMatchesNode checks that player spawn matches Node.js side-by-side.
func TestSpawnMatchesNode(t *testing.T) {
	for _, mode := range []string{"ffa", "tdm", "clan_wars"} {
		mode := mode
		t.Run(mode, func(t *testing.T) { spawnDifferential(t, mode) })
	}
}

func spawnDifferential(t *testing.T, mode string) {
	probe := loadSpawnProbe(t, mode)
	if probe.Gamemode != mode || probe.Seed != 1 {
		t.Fatalf("the probe is for seed %d / %s, not seed 1 / %s",
			probe.Seed, probe.Gamemode, mode)
	}

	opts := testOptions(1, mode)
	opts.UseDefiner = true
	g := mustBoot(t, opts)

	ln, err := stdnet.Listen("tcp", "127.0.0.1:0")
	if err != nil {
		t.Fatal(err)
	}
	httpSrv := &http.Server{Handler: g.Handler()}
	go func() { _ = httpSrv.Serve(ln) }()
	t.Cleanup(func() {
		ctx, cancel := context.WithTimeout(context.Background(), 5*time.Second)
		defer cancel()
		_ = httpSrv.Shutdown(ctx)
	})

	ws, _, err := websocket.DefaultDialer.Dial("ws://"+ln.Addr().String(), nil)
	if err != nil {
		t.Fatal(err)
	}
	defer func() { _ = ws.Close() }()

	cmds := g.Net.Commands()
	step := func(name string) int {
		t.Helper()
		select {
		case cmd := <-cmds:
			before := g.Rand.Calls()
			g.Sockets.Apply(cmd)
			return int(g.Rand.Calls() - before)
		case <-time.After(5 * time.Second):
			t.Fatalf("%s: no command arrived", name)
			return 0
		}
	}

	if got := step("connect"); got != probe.draws("connect") {
		t.Errorf("connect drew %d, Node draws %d", got, probe.draws("connect"))
	}
	expect(t, ws, net.OpSvWelcome)

	send(t, ws, net.S(net.OpClKey), net.S(""))
	if got := step("key"); got != probe.draws("key") {
		t.Errorf("the key exchange drew %d, Node draws %d", got, probe.draws("key"))
	}
	expect(t, ws, net.OpSvKeyAccepted)

	send(t, ws, net.S(net.OpClSpawn), net.S(""), net.N(1), net.N(0), net.B(false), net.N(0))
	if got := step("needsRoom"); got != probe.draws("needsRoom") {
		t.Errorf("the room request drew %d, Node draws %d -- getSpawnLocation is "+
			"spending a different number of randoms, so every later draw in the "+
			"room is out of step", got, probe.draws("needsRoom"))
	}
	expectMsg(t, ws, net.OpSvUplink)
	expectMsg(t, ws, net.OpSvRoomSetup)

	send(t, ws, net.S(net.OpClSpawn), net.S(probe.Name), net.N(0), net.N(0), net.B(false), net.N(0))
	wantSpawn := probe.draws("spawn request") + probe.draws("the 20ms poll fires")
	if got := step("spawn"); got != wantSpawn {
		t.Fatalf("spawning drew %d, Node draws %d across its request and its poll",
			got, wantSpawn)
	}

	clients := g.Sockets.Clients()
	if len(clients) != 1 {
		t.Fatalf("%d clients connected, want 1", len(clients))
	}
	s := clients[0]
	body := g.Room.World.Get(s.Player.Body)
	if body == nil {
		t.Fatal("no body after the spawn")
	}
	want := probe.Body
	if want == nil {
		t.Fatal("the probe recorded no body; re-run tools/harness/probe-spawn.js")
	}

	pos := g.Room.World.Pos[s.Player.Body.Index]
	checkFloat(t, "x", float64(pos.X), want.X)
	checkFloat(t, "y", float64(pos.Y), want.Y)
	checkFloat(t, "team", float64(body.Team), want.Team)

	checkString(t, "label", body.Label, want.Label)
	checkString(t, "index", body.Index, want.Index)
	checkString(t, "name", body.Name, want.Name)
	checkString(t, "color.base", body.Color.Base(), want.ColorBase)
	checkString(t, "rerootUpgradeTree", body.RerootUpgradeTree, want.Reroot)
	checkFloat(t, "SIZE", body.SIZE, want.SIZE)
	checkFloat(t, "health", body.Health.Amount, want.Health)
	checkFloat(t, "health.max", body.Health.Max, want.HealthMax)
	checkFloat(t, "shield", body.Shield.Amount, want.Shield)
	checkFloat(t, "shield.max", body.Shield.Max, want.ShieldMax)
	checkFloat(t, "acceleration", body.Acceleration, want.Acceleration)
	checkFloat(t, "topSpeed", body.TopSpeed, want.TopSpeed)
	checkFloat(t, "skill.points", float64(body.Skill.Points), want.SkillPoints)
	checkFloat(t, "skill.level", float64(body.Skill.Level), want.SkillLevel)
	if !body.Invuln {
		t.Error("the body is not invulnerable; sockets.js:1170 sets it before the colour switch")
	}
	if !body.IsProtected {
		t.Error("body.isProtected is false; entity.js:1230 sets it alongside the list push")
	}

	if len(body.Upgrades) != len(want.Upgrades) {
		t.Fatalf("the body offers %d upgrades, Node offers %d", len(body.Upgrades), len(want.Upgrades))
	}
	for i, u := range body.Upgrades {
		w := want.Upgrades[i]
		if u.Index != w.Index || u.Level != w.Level || u.Branch != w.Branch {
			t.Errorf("upgrade %d is branch %d index %q level %d, Node has branch %d index %q level %d",
				i, u.Branch, u.Index, u.Level, w.Branch, w.Index, w.Level)
		}
		if w.BranchLabel == nil && u.HasBranchLabel {
			t.Errorf("upgrade %d has a branch label; Node's is undefined", i)
		}
	}

	frame := probe.step("one frame with a client watching")
	if frame == nil {
		t.Fatal("the probe recorded no frame; re-run tools/harness/probe-spawn.js")
	}
	g.Sim.Step()

	deadline := time.Now().Add(5 * time.Second)
	var uplink []net.Value
	for uplink == nil && time.Now().Before(deadline) {
		op, m := readMsg(t, ws)
		if op == net.OpSvUplink && len(m) != 3 {
			uplink = m
		}
	}
	if uplink == nil {
		t.Fatal("no full uplink after the first tick")
	}
	u, err := net.ParseSvUplink(uplink)
	if err != nil {
		t.Fatalf("parsing u: %v", err)
	}
	if got := u.GUI.Mask(); float64(got) != frame.GUIMask {
		t.Errorf("the first frame's HUD mask is %#x, Node sends %#x -- a bit either "+
			"way is a field the client is told about that it should not be, or not "+
			"told about that it should", got, int(frame.GUIMask))
	}
	if got := len(uplink) + 1; float64(got) != frame.UplinkLength {
		t.Errorf("the first uplink is %d values, Node sends %v", got, frame.UplinkLength)
	}
}

type spawnProbe struct {
	Seed            int             `json:"seed"`
	Gamemode        string          `json:"gamemode"`
	Name            string          `json:"name"`
	Steps           []spawnStep     `json:"steps"`
	Body            *spawnProbeBody `json:"body"`
	SkippedUpgrades []int32         `json:"skippedUpgrades"`
}

type spawnStep struct {
	Name  string        `json:"name"`
	Draws *int          `json:"draws"`
	Value spawnStepData `json:"value"`
}

type spawnStepData struct {
	GUIMask      float64 `json:"guiMask"`
	UplinkLength float64 `json:"uplinkLength"`
}

type spawnProbeBody struct {
	Label        string             `json:"label"`
	Index        string             `json:"index"`
	Name         string             `json:"name"`
	Team         float64            `json:"team"`
	ColorBase    string             `json:"colorBase"`
	X            float64            `json:"x"`
	Y            float64            `json:"y"`
	Size         float64            `json:"size"`
	SIZE         float64            `json:"SIZE"`
	Health       float64            `json:"health"`
	HealthMax    float64            `json:"healthMax"`
	Shield       float64            `json:"shield"`
	ShieldMax    float64            `json:"shieldMax"`
	Reroot       string             `json:"rerootUpgradeTree"`
	SkillPoints  float64            `json:"skillPoints"`
	SkillLevel   float64            `json:"skillLevel"`
	Acceleration float64            `json:"acceleration"`
	TopSpeed     float64            `json:"topSpeed"`
	Upgrades     []guiVectorUpgrade `json:"upgrades"`
}

func (p *spawnProbe) step(name string) *spawnStepData {
	for i := range p.Steps {
		if p.Steps[i].Name == name {
			return &p.Steps[i].Value
		}
	}
	return nil
}

func (p *spawnProbe) draws(step string) int {
	for _, s := range p.Steps {
		if s.Name == step && s.Draws != nil {
			return *s.Draws
		}
	}
	return -1
}

func loadSpawnProbe(t *testing.T, mode string) *spawnProbe {
	t.Helper()
	path := filepath.Join("..", "..", "gen", "spawn-probe-"+mode+"-s1.json")
	raw, err := os.ReadFile(path)
	if err != nil {
		t.Fatalf("read %s: %v (run: node tools/harness/probe-spawn.js --seed 1 "+
			"--gamemode %s --out %s)", path, err, mode, path)
	}
	var p spawnProbe
	if err := json.Unmarshal(raw, &p); err != nil {
		t.Fatalf("parsing %s: %v", path, err)
	}
	return &p
}

func checkFloat(t *testing.T, name string, got, want float64) {
	t.Helper()
	if got != want {
		t.Errorf("%s is %v, Node has %v", name, got, want)
	}
}

func checkString(t *testing.T, name, got, want string) {
	t.Helper()
	if got != want {
		t.Errorf("%s is %q, Node has %q", name, got, want)
	}
}
