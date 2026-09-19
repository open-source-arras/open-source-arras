package wire

import (
	"encoding/json"
	"math"
	"os"
	"path/filepath"
	"testing"
	"time"

	"arrasgo/internal/config"
	"arrasgo/internal/entity"
	"arrasgo/internal/net"
)

type deathProbe struct {
	Seed         int         `json:"seed"`
	Gamemode     string      `json:"gamemode"`
	RespawnDelay float64     `json:"respawnDelay"`
	CycleSpeed   float64     `json:"cycleSpeed"`
	SpawnedAt    float64     `json:"spawnedAt"`
	Steps        []deathStep `json:"steps"`
}

type deathStep struct {
	Name  string          `json:"name"`
	Note  string          `json:"note"`
	Draws int             `json:"draws"`
	Time  float64         `json:"time"`
	Ticks int             `json:"ticks"`
	Threw string          `json:"threw"`
	Value json.RawMessage `json:"value"`
}

type deathInputs struct {
	Score        float64  `json:"score"`
	Level        float64  `json:"level"`
	Solo         float64  `json:"solo"`
	Assists      float64  `json:"assists"`
	Bosses       float64  `json:"bosses"`
	Polygons     float64  `json:"polygons"`
	Killers      []string `json:"killers"`
	RespawnDelay float64  `json:"respawnDelay"`
	Deceased     bool     `json:"deceased"`
	HasSpawned   bool     `json:"hasSpawned"`
}

type deathFrameStep struct {
	Opcodes          []string          `json:"opcodes"`
	Report           []json.RawMessage `json:"report"`
	Messages         []string          `json:"messages"`
	UplinkLength     int               `json:"uplinkLength"`
	Deceased         bool              `json:"deceased"`
	HasBody          bool              `json:"hasBody"`
	HasSpawned       bool              `json:"hasSpawned"`
	ReadyToBroadcast bool              `json:"readyToBroadcast"`
	Killers          []string          `json:"killers"`
	Reports          int               `json:"reports"`
	NewBodyID        *float64          `json:"newBodyID"`
}

func TestDeathMatchesNode(t *testing.T) {
	probe := loadDeathProbe(t)

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
	tick := func() {
		ticks++
		clockMS = math.Max(float64(ticks)*probe.CycleSpeed, clockMS)
		g.Sim.Step()
	}
	advance := func(ms float64) { clockMS += ms }

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
	spawn := func(name string) {
		t.Helper()
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
	}
	spawn("Doomed")

	s := g.Sockets.Clients()[0]
	if !s.Player.Body.Valid() {
		t.Fatal("no body after the spawn")
	}
	if clockMS != probe.SpawnedAt {
		t.Fatalf("the clock is at %v after the join, Node's is at %v", clockMS, probe.SpawnedAt)
	}
	for n := 0; n < 12; n++ {
		d.send(t, net.S(net.OpClLevelUp))
		apply()
	}
	body := g.Room.World.Get(s.Player.Body)
	if body == nil {
		t.Fatal("the body vanished during the level-ups")
	}
	body.KillCount.Solo = 3
	body.KillCount.Assists = 2
	body.KillCount.Bosses = 1
	body.KillCount.Polygons = 7

	for n := 0; n < 60; n++ {
		tick()
	}
	kill := func(e *entity.Entity) {
		e.Invuln = false
		e.Godmode = false
		e.Health.Amount = -100
	}

	var second *net.Socket
	var body2 *entity.Entity

	for i := range probe.Steps {
		step := &probe.Steps[i]
		switch step.Name {
		case "what the report will be made of":
			var want deathInputs
			decodeDeath(t, step, &want)
			checkInputs(t, step, want, body, s, probe.RespawnDelay)

		case "the frame the death arrives on":
			var want deathFrameStep
			decodeDeath(t, step, &want)
			d.drain()
			kill(body)
			tick()
			frames := collectFrames(d)
			checkDeathFrames(t, step, &want, frames)
			if s.Status.Deceased != want.Deceased ||
				s.Player.Body.Valid() != want.HasBody ||
				s.Status.HasSpawned != want.HasSpawned ||
				s.Status.ReadyToBroadcast != want.ReadyToBroadcast {
				t.Errorf("%s: socket is deceased=%v hasBody=%v hasSpawned=%v ready=%v, "+
					"Node leaves it deceased=%v hasBody=%v hasSpawned=%v ready=%v",
					step.Name, s.Status.Deceased, s.Player.Body.Valid(),
					s.Status.HasSpawned, s.Status.ReadyToBroadcast,
					want.Deceased, want.HasBody, want.HasSpawned, want.ReadyToBroadcast)
			}

		case "the next tick sends nothing else":
			var want deathFrameStep
			decodeDeath(t, step, &want)
			d.drain()
			tick()
			frames := collectFrames(d)
			ops := opcodesOf(frames)
			if !sameStrings(ops, want.Opcodes) {
				t.Errorf("%s: frames were %v, Node sent %v", step.Name, ops, want.Opcodes)
			}
			if n := countOp(frames, net.OpSvDeath); n != want.Reports {
				t.Errorf("%s: %d death reports, Node sends %d", step.Name, n, want.Reports)
			}

		case "respawning":
			var want deathFrameStep
			decodeDeath(t, step, &want)
			d.send(t, net.S(net.OpClSpawn), net.S("Doomed"), net.N(0), net.N(0), net.B(false), net.N(0))
			apply()
			advance(20)
			if s.Player.Body.Valid() != want.HasBody {
				t.Fatalf("%s: hasBody=%v, Node %v", step.Name, s.Player.Body.Valid(), want.HasBody)
			}
			if s.Status.Deceased != want.Deceased {
				t.Errorf("%s: deceased=%v after the respawn, Node %v",
					step.Name, s.Status.Deceased, want.Deceased)
			}
			body = g.Room.World.Get(s.Player.Body)
			if body == nil {
				t.Fatal("respawned with no body in the world")
			}
			if want.NewBodyID != nil {
				if got := float64(body.WireID); got != *want.NewBodyID {
					t.Errorf("%s: the new body's wire id is %v, Node's is %v",
						step.Name, got, *want.NewBodyID)
				}
			}
			if body.Skill.Score != 0 {
				t.Errorf("%s: the new body starts on %v, Node starts it on 0",
					step.Name, body.Skill.Score)
			}

		case "a death with killers":
			var want deathFrameStep
			decodeDeath(t, step, &want)
			d2, stop2 := dialAndDrive(t, g)
			defer stop2()
			apply2 := func() {
				t.Helper()
				select {
				case cmd := <-d2.cmds:
					g.Sockets.Apply(cmd)
				case <-time.After(5 * time.Second):
					t.Fatal("no command arrived from the second client")
				}
			}
			apply2()
			d2.next(t, net.OpSvWelcome)
			d2.send(t, net.S(net.OpClKey), net.S(""))
			apply2()
			d2.next(t, net.OpSvKeyAccepted)
			d2.send(t, net.S(net.OpClSpawn), net.S(""), net.N(1), net.N(0), net.B(false), net.N(0))
			apply2()
			d2.send(t, net.S(net.OpClSpawn), net.S("Blamed"), net.N(0), net.N(0), net.B(false), net.N(0))
			apply2()
			advance(20)

			second = clientNamed(t, g, "Blamed")
			body2 = g.Room.World.Get(second.Player.Body)
			if body2 == nil {
				t.Fatal("the second client spawned with no body")
			}
			for n := 0; n < 3; n++ {
				tick()
			}
			body2.KillCount.Killers = append(body2.KillCount.Killers, "782", "791", "782")
			d2.drain()
			kill(body2)
			tick()
			frames := collectFrames(d2)
			checkDeathFrames(t, step, &want, frames)

		default:
			t.Fatalf("unhandled probe step %q -- probe-death.js grew a case this test "+
				"does not replay, which would otherwise pass silently", step.Name)
		}

		if got := math.Floor(clockMS); got != math.Floor(step.Time) {
			t.Fatalf("after %q the clock is at %v, Node's is at %v -- everything after "+
				"this compares two different moments", step.Name, clockMS, step.Time)
		}
		if ticks != step.Ticks {
			t.Fatalf("after %q %d ticks have run, Node ran %d", step.Name, ticks, step.Ticks)
		}
	}
	_ = second
}

func checkInputs(t *testing.T, step *deathStep, want deathInputs, body *entity.Entity, s *net.Socket, respawnDelay float64) {
	t.Helper()
	got := deathInputs{
		Score:        body.Skill.Score,
		Level:        float64(body.Skill.Level),
		Solo:         float64(body.KillCount.Solo),
		Assists:      float64(body.KillCount.Assists),
		Bosses:       float64(body.KillCount.Bosses),
		Polygons:     float64(body.KillCount.Polygons),
		RespawnDelay: respawnDelay,
		Deceased:     s.Status.Deceased,
		HasSpawned:   s.Status.HasSpawned,
	}
	if got.Score != want.Score || got.Level != want.Level {
		t.Errorf("%s: the body is on score %v level %v, Node's is on %v / %v -- the "+
			"report cannot match if what it is built from does not",
			step.Name, got.Score, got.Level, want.Score, want.Level)
	}
	if got.Solo != want.Solo || got.Assists != want.Assists ||
		got.Bosses != want.Bosses || got.Polygons != want.Polygons {
		t.Errorf("%s: kill counts are %v/%v/%v/%v, Node's are %v/%v/%v/%v",
			step.Name, got.Solo, got.Assists, got.Bosses, got.Polygons,
			want.Solo, want.Assists, want.Bosses, want.Polygons)
	}
	if len(body.KillCount.Killers) != len(want.Killers) {
		t.Errorf("%s: %d killers, Node has %d", step.Name, len(body.KillCount.Killers), len(want.Killers))
	}
	if got.RespawnDelay != want.RespawnDelay {
		t.Errorf("%s: respawn delay %v, Node %v", step.Name, got.RespawnDelay, want.RespawnDelay)
	}
	if got.Deceased != want.Deceased || got.HasSpawned != want.HasSpawned {
		t.Errorf("%s: deceased=%v hasSpawned=%v, Node %v / %v",
			step.Name, got.Deceased, got.HasSpawned, want.Deceased, want.HasSpawned)
	}
}

func checkDeathFrames(t *testing.T, step *deathStep, want *deathFrameStep, frames [][]net.Value) {
	t.Helper()
	ops := opcodesOf(frames)
	if !sameStrings(ops, want.Opcodes) {
		t.Errorf("%s: frames were %v, Node sent %v", step.Name, ops, want.Opcodes)
	}

	var report []net.Value
	var messages []string
	uplink := 0
	for _, f := range frames {
		op, rest, ok := net.Opcode(f)
		if !ok {
			continue
		}
		switch op {
		case net.OpSvDeath:
			if report == nil {
				report = f
			}
		case net.OpSvPopup:
			if len(rest) >= 2 && rest[1].Kind == net.KindString {
				messages = append(messages, rest[1].Str)
			}
		case net.OpSvUplink:
			if uplink == 0 {
				uplink = len(f)
			}
		}
	}

	if want.Report != nil {
		if report == nil {
			t.Errorf("%s: no death report, Node sent %d values", step.Name, len(want.Report))
		} else {
			compareFrame(t, report, want.Report)
		}
	}
	if want.Messages != nil && !sameStrings(messages, want.Messages) {
		t.Errorf("%s: popups were %q, Node sent %q", step.Name, messages, want.Messages)
	}
	if want.UplinkLength != 0 && uplink != want.UplinkLength {
		t.Errorf("%s: the uplink is %d values long, Node's is %d",
			step.Name, uplink, want.UplinkLength)
	}
}

func opcodesOf(frames [][]net.Value) []string {
	var out []string
	for _, f := range frames {
		if op, _, ok := net.Opcode(f); ok {
			out = append(out, op)
		}
	}
	return out
}

func countOp(frames [][]net.Value, want string) int {
	n := 0
	for _, f := range frames {
		if op, _, ok := net.Opcode(f); ok && op == want {
			n++
		}
	}
	return n
}

func clientNamed(t *testing.T, g *Game, name string) *net.Socket {
	t.Helper()
	for _, s := range g.Sockets.Clients() {
		if e := g.Room.World.Get(s.Player.Body); e != nil && e.Name == name {
			return s
		}
	}
	t.Fatalf("no connected client is driving a body called %q", name)
	return nil
}

func decodeDeath(t *testing.T, s *deathStep, out any) {
	t.Helper()
	if err := json.Unmarshal(s.Value, out); err != nil {
		t.Fatalf("step %q: %v", s.Name, err)
	}
}

func loadDeathProbe(t *testing.T) *deathProbe {
	t.Helper()
	path := filepath.Join("..", "..", "gen", "death-probe-ffa-s1.json")
	raw, err := os.ReadFile(path)
	if err != nil {
		t.Skipf("no death probe (%v); run tools/harness/probe-death.js", err)
	}
	var p deathProbe
	if err := json.Unmarshal(raw, &p); err != nil {
		t.Fatalf("%s: %v", path, err)
	}
	if len(p.Steps) == 0 {
		t.Fatalf("%s: no steps", path)
	}
	return &p
}
