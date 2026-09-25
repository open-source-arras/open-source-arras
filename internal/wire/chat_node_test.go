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

type chatProbe struct {
	Seed                int        `json:"seed"`
	Gamemode            string     `json:"gamemode"`
	ChatMessageDuration float64    `json:"chatMessageDuration"`
	SanitizeChatInput   bool       `json:"sanitizeChatInput"`
	CycleSpeed          float64    `json:"cycleSpeed"`
	SettleTicks         int        `json:"settleTicks"`
	Steps               []chatStep `json:"steps"`
}

type chatStep struct {
	Name  string          `json:"name"`
	Note  string          `json:"note"`
	Threw string          `json:"threw"`
	Value json.RawMessage `json:"value"`
}

type chatPair struct {
	Alpha []string `json:"alpha"`
	Bravo []string `json:"bravo"`
}

type chatBodies struct {
	Alpha uint32  `json:"alpha"`
	Bravo uint32  `json:"bravo"`
	Dur   float64 `json:"duration"`
}

// TestChatMatchesNode replays tools/harness/probe-chat.js.
func TestChatMatchesNode(t *testing.T) {
	probe := loadChatProbe(t)

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

	da, sa := join("Alpha")
	db, sb := join("Bravo")

	pa := g.Room.World.Pos[sa.Player.Body.Index]
	g.Room.World.Pos[sb.Player.Body.Index].X = pa.X + 60
	g.Room.World.Pos[sb.Player.Body.Index].Y = pa.Y + 60
	for n := 0; n < probe.SettleTicks; n++ {
		tick()
	}

	chatOf := func(d *driven) []string {
		var out []string
		for _, f := range collectFrames(d) {
			if op, rest, ok := net.Opcode(f); ok && op == net.OpSvChat && len(rest) > 0 {
				out = append(out, rest[0].Str)
			}
		}
		return out
	}
	say := func(d *driven, text string) {
		t.Helper()
		d.send(t, net.S(net.OpClChat), net.S(text))
		d.apply()
	}

	for i := range probe.Steps {
		step := &probe.Steps[i]
		switch step.Name {
		case "the bodies":
			var want chatBodies
			decodeChat(t, step, &want)
			gotA := g.Room.World.Get(sa.Player.Body)
			gotB := g.Room.World.Get(sb.Player.Body)
			if gotA == nil || gotB == nil {
				t.Fatal("one of the two bodies is gone before the first step")
			}
			if gotA.WireID != want.Alpha || gotB.WireID != want.Bravo {
				t.Fatalf("the bodies are %d and %d, Node's are %d and %d -- every "+
					"payload below is keyed on those", gotA.WireID, gotB.WireID,
					want.Alpha, want.Bravo)
			}
			if float64(g.Room.Tuning.ChatMessageDuration) != want.Dur {
				t.Fatalf("chat_message_duration is %d, Node's is %v",
					g.Room.Tuning.ChatMessageDuration, want.Dur)
			}

		case "a quiet room":
			var want chatPair
			decodeChat(t, step, &want)
			da.drain()
			db.drain()
			g.Players.chatLoop()
			checkChat(t, step, "alpha", chatOf(da), want.Alpha)
			checkChat(t, step, "bravo", chatOf(db), want.Bravo)

		case "one message", "both bodies talking", "the section sign":
			var want chatPair
			decodeChat(t, step, &want)
			da.drain()
			db.drain()
			switch step.Name {
			case "one message":
				say(da, "hello everyone")
			case "both bodies talking":
				say(db, "bravo here")
			case "the section sign":
				say(db, "colour § here")
			}
			checkChat(t, step, "alpha", chatOf(da), want.Alpha)
			if want.Bravo != nil {
				checkChat(t, step, "bravo", chatOf(db), want.Bravo)
			}

		case "a second message from the same body":
			var want chatPair
			decodeChat(t, step, &want)
			da.drain()
			say(da, "and again")
			checkChat(t, step, "alpha", chatOf(da), want.Alpha)

		case "characters JSON has to escape":
			var want chatPair
			decodeChat(t, step, &want)
			da.drain()
			say(db, "a \"quote\" and a \\ and <b> & é中\n\ttail")
			checkChat(t, step, "alpha", chatOf(da), want.Alpha)

		case "a muted socket":
			var want []string
			decodeChat(t, step, &want)
			da.drain()
			sa.Status.DisableChat = true
			g.Players.chatLoop()
			got := chatOf(da)
			sa.Status.DisableChat = false
			checkChat(t, step, "alpha", got, want)

		case "after everything has expired":
			var want []string
			decodeChat(t, step, &want)
			advance(probe.ChatMessageDuration + 1)
			da.drain()
			g.Players.chatLoop()
			checkChat(t, step, "alpha", chatOf(da), want)

		case "a message from a body that has none":
			var want []string
			decodeChat(t, step, &want)
			da.drain()
			say(da, "still here")
			checkChat(t, step, "alpha", chatOf(da), want)

		case "chat with no body":
			var want struct {
				HasBody bool     `json:"hasBody"`
				Ghost   []string `json:"ghost"`
				Alpha   []string `json:"alpha"`
			}
			decodeChat(t, step, &want)
			dg, sg := join("Ghost")
			ghost := g.Room.World.Get(sg.Player.Body)
			if ghost == nil {
				t.Fatal("Ghost spawned with no body")
			}
			ghost.Invuln, ghost.Godmode = false, false
			ghost.Health.Amount = -100
			tick()
			if sg.Player.Body.Valid() != want.HasBody {
				t.Fatalf("%s: Ghost hasBody=%v, Node %v",
					step.Name, sg.Player.Body.Valid(), want.HasBody)
			}
			dg.drain()
			da.drain()
			say(dg, "from beyond")
			checkChat(t, step, "ghost", chatOf(dg), want.Ghost)
			checkChat(t, step, "alpha", chatOf(da), want.Alpha)

		default:
			t.Fatalf("unhandled probe step %q -- probe-chat.js grew a case this test "+
				"does not replay, which would otherwise pass silently", step.Name)
		}
	}
}

func checkChat(t *testing.T, step *chatStep, who string, got, want []string) {
	t.Helper()
	if len(got) != len(want) {
		t.Errorf("%s: %s got %d chat frames, Node sent %d\n  go:   %q\n  node: %q",
			step.Name, who, len(got), len(want), got, want)
		return
	}
	for i := range got {
		if got[i] != want[i] {
			t.Errorf("%s: %s payload %d differs\n  go:   %s\n  node: %s",
				step.Name, who, i, got[i], want[i])
		}
	}
}

func decodeChat(t *testing.T, s *chatStep, out any) {
	t.Helper()
	if err := json.Unmarshal(s.Value, out); err != nil {
		t.Fatalf("step %q: %v", s.Name, err)
	}
}

func loadChatProbe(t *testing.T) *chatProbe {
	t.Helper()
	path := filepath.Join("..", "..", "gen", "chat-probe-ffa-s1.json")
	raw, err := os.ReadFile(path)
	if err != nil {
		t.Skipf("no chat probe (%v); run tools/harness/probe-chat.js", err)
	}
	var p chatProbe
	if err := json.Unmarshal(raw, &p); err != nil {
		t.Fatalf("%s: %v", path, err)
	}
	if len(p.Steps) == 0 {
		t.Fatalf("%s: no steps", path)
	}
	return &p
}
