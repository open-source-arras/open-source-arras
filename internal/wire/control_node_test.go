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

type controlProbe struct {
	Seed       int           `json:"seed"`
	Gamemode   string        `json:"gamemode"`
	TimeLimit  int           `json:"timeLimit"`
	CycleSpeed float64       `json:"cycleSpeed"`
	Steps      []controlStep `json:"steps"`
}

type controlStep struct {
	Name  string          `json:"name"`
	Note  string          `json:"note"`
	Ticks int             `json:"ticks"`
	Threw string          `json:"threw"`
	Value json.RawMessage `json:"value"`
}

// controlShot is probe-control.js's candidate(): one controllable entity as the
// `H` handler sees it.
type controlShot struct {
	ID              uint32   `json:"id"`
	Team            int32    `json:"team"`
	Name            string   `json:"name"`
	Label           string   `json:"label"`
	IsMothership    bool     `json:"isMothership"`
	IsDominator     bool     `json:"isDominator"`
	IsBoss          bool     `json:"isBoss"`
	UnderControl    bool     `json:"underControl"`
	Controllers     []string `json:"controllers"`
	FOV             float64  `json:"fov"`
	DontIncreaseFov bool     `json:"dontIncreaseFov"`
	SkillPoints     int32    `json:"skillPoints"`
}

// TestControlMatchesNode replays probe-control.js on mothership and domination modes.
func TestControlMatchesNode(t *testing.T) {
	for _, mode := range []string{"mothership", "domination"} {
		t.Run(mode, func(t *testing.T) { runControlProbe(t, mode) })
	}
}

func runControlProbe(t *testing.T, mode string) {
	probe := loadControlProbe(t, mode)

	tuning, err := config.Default()
	if err != nil {
		t.Fatal(err)
	}
	tuning.BotCap = 0
	tuning.MothershipTimeLimit = probe.TimeLimit

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

	// The wire id every candidate is recorded by, resolved back to a handle.
	byWire := func(want uint32) entity.EntityID {
		for _, id := range g.Sim.Tracked() {
			if e := g.Room.World.Get(id); e != nil && e.WireID == want {
				return id
			}
		}
		return entity.EntityID{}
	}

	var (
		d      *driven
		s      *net.Socket
		bodyID entity.EntityID
	)

	for i := range probe.Steps {
		step := &probe.Steps[i]
		switch step.Name {
		case "the room and the candidates":
			var want struct {
				Mothership  bool          `json:"mothership"`
				Domination  bool          `json:"domination"`
				BossControl bool          `json:"bossControl"`
				TimeLimit   int           `json:"timeLimit"`
				PlayerTeam  int32         `json:"playerTeam"`
				PlayerBody  uint32        `json:"playerBody"`
				PlayerName  string        `json:"playerName"`
				Forced      []uint32      `json:"forcedOntoPlayerTeam"`
				Candidates  []controlShot `json:"candidates"`
			}
			decodeControl(t, step, &want)
			for ticks < step.Ticks {
				tick()
			}
			if g.Room.Flags.Mothership != want.Mothership ||
				g.Room.Flags.Domination != want.Domination ||
				g.Room.Tuning.BossControl != want.BossControl {
				t.Fatalf("%s: flags mothership=%v domination=%v bossControl=%v, Node %v/%v/%v",
					step.Name, g.Room.Flags.Mothership, g.Room.Flags.Domination,
					g.Room.Tuning.BossControl, want.Mothership, want.Domination, want.BossControl)
			}
			if g.Room.Tuning.MothershipTimeLimit != want.TimeLimit {
				t.Fatalf("%s: mothership_time_limit is %d, Node's is %d",
					step.Name, g.Room.Tuning.MothershipTimeLimit, want.TimeLimit)
			}
			d, s = join("Pilot")
			bodyID = s.Player.Body
			body := g.Room.World.Get(bodyID)
			if body == nil {
				t.Fatal("no body after the join")
			}
			if body.WireID != want.PlayerBody || body.Team != want.PlayerTeam {
				t.Fatalf("%s: the player is #%d on team %d, Node's is #%d on team %d",
					step.Name, body.WireID, body.Team, want.PlayerBody, want.PlayerTeam)
			}
			// The probe puts one dominator on the player's team, the way capturing
			// one does. Same entity, by wire id.
			for _, w := range want.Forced {
				id := byWire(w)
				e := g.Room.World.Get(id)
				if e == nil {
					t.Fatalf("%s: Node re-teamed #%d, which is not in this world", step.Name, w)
				}
				e.Team = body.Team
			}
			checkCandidates(t, step.Name, g, want.Candidates)

		case "H takes control":
			var want struct {
				Said                        []string    `json:"said"`
				Took                        controlShot `json:"took"`
				BodyIsNowCandidate          bool        `json:"bodyIsNowCandidate"`
				OldBodyDead                 bool        `json:"oldBodyDead"`
				OldBodyInMap                bool        `json:"oldBodyInMap"`
				OldBodyDontSendDeathMessage bool        `json:"oldBodyDontSendDeathMessage"`
				Deceased                    bool        `json:"deceased"`
			}
			decodeControl(t, step, &want)
			d.drain()
			d.send(t, net.S(net.OpClControl))
			d.apply()
			took := s.Player.Body
			if got := popupsOf(collectFrames(d)); !equalStrings(got, want.Said) {
				t.Errorf("%s: popups %q, Node's %q", step.Name, got, want.Said)
			}
			checkShotControl(t, step.Name+" / took", g, took, &want.Took)
			if (took != bodyID) != want.BodyIsNowCandidate {
				t.Errorf("%s: bodyIsNowCandidate=%v, Node %v",
					step.Name, took != bodyID, want.BodyIsNowCandidate)
			}
			if got := g.Sim.DontSendDeathMessage(bodyID); got != want.OldBodyDontSendDeathMessage {
				t.Errorf("%s: the tank left behind has dontSendDeathMessage=%v, Node %v -- "+
					"only the dominator branch sets it, so taking a mothership announces "+
					"your death to the room", step.Name, got, want.OldBodyDontSendDeathMessage)
			}
			if old := g.Room.World.Get(bodyID); old == nil || !old.IsDead() {
				t.Errorf("%s: the tank left behind was not killed", step.Name)
			}
			for ticks < step.Ticks {
				tick()
			}
			if inMap := g.Room.World.Get(bodyID) != nil; inMap != want.OldBodyInMap {
				t.Errorf("%s: oldBodyInMap=%v, Node %v", step.Name, inMap, want.OldBodyInMap)
			}
			if s.Status.Deceased != want.Deceased {
				t.Errorf("%s: deceased=%v, Node %v -- the player did not die, they moved",
					step.Name, s.Status.Deceased, want.Deceased)
			}
			bodyID = took

		case "a second player finds nothing to take":
			var want struct {
				Said         []string `json:"said"`
				StillOwnBody bool     `json:"stillOwnBody"`
			}
			decodeControl(t, step, &want)
			d2, s2 := join("Latecomer")
			for _, id := range g.Sim.Tracked() {
				x := g.Room.Extras.Get(id)
				if (x.IsDominator || x.IsMothership || x.IsBoss) && !x.UnderControl {
					g.Room.Extras.GetOrCreate(id).UnderControl = true
				}
			}
			d2.drain()
			d2.send(t, net.S(net.OpClControl))
			d2.apply()
			if got := popupsOf(collectFrames(d2)); !equalStrings(got, want.Said) {
				t.Errorf("%s: popups %q, Node's %q", step.Name, got, want.Said)
			}
			x := g.Room.Extras.Get(s2.Player.Body)
			own := s2.Player.Body.Valid() && !x.IsMothership && !x.IsDominator
			if own != want.StillOwnBody {
				t.Errorf("%s: stillOwnBody=%v, Node %v", step.Name, own, want.StillOwnBody)
			}

		case "the ten second warning":
			var want struct {
				Said           []string `json:"said"`
				StillInControl bool     `json:"stillInControl"`
			}
			decodeControl(t, step, &want)
			d.drain()
			advance(float64(probe.TimeLimit - 10_000))
			for ticks < step.Ticks {
				tick()
			}
			if got := popupsOf(collectFrames(d)); !equalStrings(got, want.Said) {
				t.Errorf("%s: popups %q, Node's %q", step.Name, got, want.Said)
			}
			if got := g.Room.Extras.Get(s.Player.Body).UnderControl; got != want.StillInControl {
				t.Errorf("%s: stillInControl=%v, Node %v", step.Name, got, want.StillInControl)
			}

		case "control runs out", "H hands it back":
			var want struct {
				Said                []string    `json:"said"`
				Ship                controlShot `json:"ship"`
				Dominator           controlShot `json:"dominator"`
				NewBodyIsShip       bool        `json:"newBodyIsShip"`
				NewBodyIsDominator  bool        `json:"newBodyIsDominator"`
				NewBodyLabel        *string     `json:"newBodyLabel"`
				NewBodyPassive      *bool       `json:"newBodyPassive"`
				NewBodyUnderControl *bool       `json:"newBodyUnderControl"`
				NewBodyDead         *bool       `json:"newBodyDead"`
			}
			decodeControl(t, step, &want)
			given := bodyID
			clock := step.Name == "control runs out"
			d.drain()
			if !clock {
				d.send(t, net.S(net.OpClControl))
				d.apply()
			}
			// The throwaway body giveUp hands over, read before the tick that takes it
			// away again. The probe reads it at that point too.
			var said []string
			if !clock {
				said = popupsOf(collectFrames(d))
			}
			fake := s.Player.Body
			fe := g.Room.World.Get(fake)
			if fe == nil {
				t.Fatalf("%s: giveUp handed the player nothing", step.Name)
			}
			throwaway := *fe
			fx := g.Room.Extras.Get(fake)
			for ticks < step.Ticks {
				tick()
			}
			if clock {
				said = popupsOf(collectFrames(d))
			}
			if !equalStrings(said, want.Said) {
				t.Errorf("%s: popups %q, Node's %q", step.Name, said, want.Said)
			}
			handedBack := want.Ship
			if !clock {
				handedBack = want.Dominator
			}
			checkShotControl(t, step.Name+" / handed back", g, given, &handedBack)
			now := fake
			if clock {
				now = s.Player.Body
			}
			isSame := now.Valid() && now == given
			if clock && isSame != want.NewBodyIsShip {
				t.Errorf("%s: newBodyIsShip=%v, Node %v", step.Name, isSame, want.NewBodyIsShip)
			}
			if !clock && isSame != want.NewBodyIsDominator {
				t.Errorf("%s: newBodyIsDominator=%v, Node %v", step.Name, isSame, want.NewBodyIsDominator)
			}
			if want.NewBodyLabel != nil && throwaway.Label != *want.NewBodyLabel {
				t.Errorf("%s: the throwaway body is %q, Node's is %q",
					step.Name, throwaway.Label, *want.NewBodyLabel)
			}
			if want.NewBodyPassive != nil && fx.Passive != *want.NewBodyPassive {
				t.Errorf("%s: throwaway passive=%v, Node %v", step.Name, fx.Passive, *want.NewBodyPassive)
			}
			if want.NewBodyUnderControl != nil && fx.UnderControl != *want.NewBodyUnderControl {
				t.Errorf("%s: throwaway underControl=%v, Node %v",
					step.Name, fx.UnderControl, *want.NewBodyUnderControl)
			}
			if want.NewBodyDead != nil && throwaway.IsDead() != *want.NewBodyDead {
				t.Errorf("%s: throwaway isDead=%v, Node %v", step.Name, throwaway.IsDead(), *want.NewBodyDead)
			}

		default:
			t.Fatalf("unhandled probe step %q -- probe-control.js grew a case this test "+
				"does not replay, which would otherwise pass silently", step.Name)
		}

		if ticks != step.Ticks {
			t.Fatalf("after %q %d ticks have run, Node ran %d", step.Name, ticks, step.Ticks)
		}
	}
}

// checkCandidates compares the whole `ent` list the handler builds, in order.
func checkCandidates(t *testing.T, where string, g *Game, want []controlShot) {
	t.Helper()
	var got []entity.EntityID
	for _, id := range g.Sim.Tracked() {
		x := g.Room.Extras.Get(id)
		if x.IsDominator || x.IsMothership || x.IsBoss {
			got = append(got, id)
		}
	}
	if len(got) != len(want) {
		t.Fatalf("%s: %d controllable entities, Node has %d", where, len(got), len(want))
	}
	for i := range want {
		checkShotControl(t, where, g, got[i], &want[i])
	}
}

// checkShotControl compares one controllable entity against the probe's record.
func checkShotControl(t *testing.T, where string, g *Game, id entity.EntityID, want *controlShot) {
	t.Helper()
	e := g.Room.World.Get(id)
	if e == nil {
		t.Errorf("%s: entity #%d is not in the world", where, want.ID)
		return
	}
	if e.WireID != want.ID {
		t.Errorf("%s: expected #%d, found #%d", where, want.ID, e.WireID)
		return
	}
	x := g.Room.Extras.Get(id)
	if e.Name != want.Name || e.Label != want.Label {
		t.Errorf("%s: #%d is %q/%q, Node has %q/%q",
			where, e.WireID, e.Name, e.Label, want.Name, want.Label)
	}
	if e.Team != want.Team {
		t.Errorf("%s: #%d team=%d, Node %d", where, e.WireID, e.Team, want.Team)
	}
	if x.IsMothership != want.IsMothership || x.IsDominator != want.IsDominator || x.IsBoss != want.IsBoss {
		t.Errorf("%s: #%d mothership/dominator/boss = %v/%v/%v, Node %v/%v/%v", where, e.WireID,
			x.IsMothership, x.IsDominator, x.IsBoss, want.IsMothership, want.IsDominator, want.IsBoss)
	}
	if x.UnderControl != want.UnderControl {
		t.Errorf("%s: #%d underControl=%v, Node %v", where, e.WireID, x.UnderControl, want.UnderControl)
	}
	if x.DontIncreaseFov != want.DontIncreaseFov {
		t.Errorf("%s: #%d dontIncreaseFov=%v, Node %v -- the +0.5 is once per entity, "+
			"not once per takeover", where, e.WireID, x.DontIncreaseFov, want.DontIncreaseFov)
	}
	if e.FOV != want.FOV {
		t.Errorf("%s: #%d FOV=%v, Node %v", where, e.WireID, e.FOV, want.FOV)
	}
	if e.Skill.Points != want.SkillPoints {
		t.Errorf("%s: #%d skill points=%d, Node %d", where, e.WireID, e.Skill.Points, want.SkillPoints)
	}
	if got := controllerNames(g, id); !equalStrings(got, want.Controllers) {
		t.Errorf("%s: #%d controllers %q, Node's %q", where, e.WireID, got, want.Controllers)
	}
}

// controllerNames spells each attached controller the way the probe records it:
// the JS class name, which is "io_" plus the ioTypes key.
func controllerNames(g *Game, id entity.EntityID) []string {
	e := g.Room.World.Get(id)
	if e == nil || g.Players == nil || g.Players.lg == nil || g.Players.lg.Ctrl == nil {
		return nil
	}
	out := make([]string, 0, len(e.Controllers))
	for _, c := range e.Controllers {
		out = append(out, "io_"+g.Players.lg.Ctrl.Kind(c).String())
	}
	return out
}

// popupsOf pulls the text out of every `m` frame, in order.
func popupsOf(frames [][]net.Value) []string {
	var out []string
	for _, f := range frames {
		op, rest, ok := net.Opcode(f)
		if !ok || op != net.OpSvPopup || len(rest) < 2 {
			continue
		}
		out = append(out, rest[1].Str)
	}
	return out
}

func equalStrings(a, b []string) bool {
	if len(a) != len(b) {
		return false
	}
	for i := range a {
		if a[i] != b[i] {
			return false
		}
	}
	return true
}

func decodeControl(t *testing.T, s *controlStep, out any) {
	t.Helper()
	if err := json.Unmarshal(s.Value, out); err != nil {
		t.Fatalf("step %q: %v", s.Name, err)
	}
}

func loadControlProbe(t *testing.T, mode string) *controlProbe {
	t.Helper()
	path := filepath.Join("..", "..", "gen", "control-probe-"+mode+"-s1.json")
	raw, err := os.ReadFile(path)
	if err != nil {
		t.Skipf("no control probe (%v); run tools/harness/probe-control.js", err)
	}
	var p controlProbe
	if err := json.Unmarshal(raw, &p); err != nil {
		t.Fatalf("%s: %v", path, err)
	}
	if len(p.Steps) == 0 {
		t.Fatalf("%s: no steps", path)
	}
	return &p
}
