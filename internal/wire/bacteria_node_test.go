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

type bacteriaProbe struct {
	Seed        int            `json:"seed"`
	Gamemode    string         `json:"gamemode"`
	SpawnClass  string         `json:"spawnClass"`
	CycleSpeed  float64        `json:"cycleSpeed"`
	TicksToFire int            `json:"ticksToFire"`
	Steps       []bacteriaStep `json:"steps"`
}

type bacteriaStep struct {
	Name  string          `json:"name"`
	Note  string          `json:"note"`
	Ticks int             `json:"ticks"`
	Threw string          `json:"threw"`
	Value json.RawMessage `json:"value"`
}

// entityShot is probe-bacteria.js's `shot()`: one entity's family links by wire
// id, so the tree can be compared without comparing objects.
type entityShot struct {
	ID                      uint32   `json:"id"`
	Label                   string   `json:"label"`
	Index                   string   `json:"index"`
	Master                  *uint32  `json:"master"`
	Parent                  *uint32  `json:"parent"`
	Source                  *uint32  `json:"source"`
	BulletParent            *uint32  `json:"bulletparent"`
	BulletChildren          []uint32 `json:"bulletchildren"`
	IsPlayer                bool     `json:"isPlayer"`
	ConnectChildrenOnCamera bool     `json:"connectChildrenOnCamera"`
	PersistsAfterDeath      bool     `json:"persistsAfterDeath"`
	IsDead                  bool     `json:"isDead"`
}

// TestBacteriaDeathMatchesNode replays probe-bacteria.js: death on a bacteria.
func TestBacteriaDeathMatchesNode(t *testing.T) {
	probe := loadBacteriaProbe(t)

	tuning, err := config.Default()
	if err != nil {
		t.Fatal(err)
	}
	tuning.BotCap = 0
	tuning.SpawnClass = probe.SpawnClass

	opts := testOptions(uint64(probe.Seed), probe.Gamemode)
	opts.UseDefiner = true
	opts.Tuning = &tuning

	var clockMS float64
	opts.Now = func() float64 { return clockMS }
	opts.WorldNow = func() int64 { return int64(clockMS) }
	g := mustBoot(t, opts)

	// seenIDs tracks wire ids of destroyed entities.
	seenIDs := map[entity.EntityID]uint32{}
	remember := func() {
		g.Room.World.EachLive(func(id entity.EntityID, e *entity.Entity) {
			seenIDs[id] = e.WireID
		})
	}

	ticks := 0
	tick := func() {
		remember()
		ticks++
		clockMS = math.Max(float64(ticks)*probe.CycleSpeed, clockMS)
		g.Sim.Step()
		remember()
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

	d, s := join("Germ")
	bodyID := s.Player.Body

	// The clones the body has out just before it is killed, in list order. The
	// step after the death reports on the same four by id, and by then the list
	// they came from belongs to the promoted clone.
	var preDeathKids []entity.EntityID

	kill := func(id entity.EntityID) {
		e := g.Room.World.Get(id)
		if e == nil {
			t.Fatal("nothing to kill")
		}
		e.Invuln, e.Godmode = false, false
		e.Health.Amount = -100
	}

	for i := range probe.Steps {
		step := &probe.Steps[i]
		switch step.Name {
		case "the spawn class":
			var want struct {
				SpawnClass  string  `json:"spawnClass"`
				Label       string  `json:"label"`
				MasterLabel string  `json:"masterLabel"`
				ID          uint32  `json:"id"`
				MaxBullets  float64 `json:"maxBullets"`
			}
			decodeBacteria(t, step, &want)
			e := g.Room.World.Get(bodyID)
			if e == nil {
				t.Fatal("no body after the join")
			}
			if e.Label != want.Label || e.WireID != want.ID {
				t.Fatalf("the body is %q/#%d, Node's is %q/#%d", e.Label, e.WireID, want.Label, want.ID)
			}
			if g.Room.Tuning.SpawnClass != want.SpawnClass {
				t.Fatalf("spawn_class is %q, Node's is %q", g.Room.Tuning.SpawnClass, want.SpawnClass)
			}
			// Hold left mouse to match the probe.
			d.send(t, net.S(net.OpClCommand), net.N(500), net.N(0), net.N(0), net.N(16))
			d.apply()

		case "the family before the death":
			var want struct {
				Body     entityShot   `json:"body"`
				Children []entityShot `json:"children"`
			}
			decodeBacteria(t, step, &want)
			for ticks < step.Ticks {
				tick()
			}
			checkShot(t, step.Name+" / body", g, bodyID, &want.Body, seenIDs)
			body := g.Room.World.Get(bodyID)
			if body == nil {
				t.Fatal("the body died before the probe killed it")
			}
			if len(body.BulletChildren) != len(want.Children) {
				t.Fatalf("%s: the body has %d clones out, Node's has %d -- the branch "+
					"below promotes the last of them, so the list has to match",
					step.Name, len(body.BulletChildren), len(want.Children))
			}
			preDeathKids = append(preDeathKids[:0], body.BulletChildren...)

		case "the frame the body dies on":
			var want struct {
				Opcodes   []string   `json:"opcodes"`
				Reports   int        `json:"reports"`
				Deceased  bool       `json:"deceased"`
				HasBody   bool       `json:"hasBody"`
				NewBodyID uint32     `json:"newBodyID"`
				NewBody   entityShot `json:"newBody"`
				OldBody   entityShot `json:"oldBody"`
			}
			decodeBacteria(t, step, &want)
			d.drain()
			kill(bodyID)
			tick()
			frames := collectFrames(d)
			if n := countOp(frames, net.OpSvDeath); n != want.Reports {
				t.Errorf("%s: %d death reports, Node sends %d -- a Bacteria is not "+
					"supposed to die", step.Name, n, want.Reports)
			}
			if s.Status.Deceased != want.Deceased {
				t.Errorf("%s: deceased=%v, Node %v", step.Name, s.Status.Deceased, want.Deceased)
			}
			if s.Player.Body.Valid() != want.HasBody {
				t.Fatalf("%s: hasBody=%v, Node %v", step.Name, s.Player.Body.Valid(), want.HasBody)
			}
			newBody := g.Room.World.Get(s.Player.Body)
			if newBody == nil {
				t.Fatal("the socket has a body handle that is not in the world")
			}
			if newBody.WireID != want.NewBodyID {
				t.Fatalf("%s: the player is now #%d, Node promotes #%d",
					step.Name, newBody.WireID, want.NewBodyID)
			}
			checkShot(t, step.Name+" / promoted", g, s.Player.Body, &want.NewBody, seenIDs)

		case "what happened to each clone":
			// Nothing runs between this and the step above it, so no ticking here.
			var want []struct {
				ID     uint32   `json:"id"`
				InMap  bool     `json:"inMap"`
				Health *float64 `json:"health"`
				IsDead *bool    `json:"isDead"`
				Range  *float64 `json:"range"`
			}
			decodeBacteria(t, step, &want)
			if len(preDeathKids) != len(want) {
				t.Fatalf("%s: %d clones to account for, Node accounts for %d",
					step.Name, len(preDeathKids), len(want))
			}
			for k, w := range want {
				e := g.Room.World.Get(preDeathKids[k])
				if (e != nil) != w.InMap {
					t.Errorf("%s: #%d inMap=%v, Node %v -- destroy() spares the children "+
						"of a Bacteria, so a missing one died on its own",
						step.Name, w.ID, e != nil, w.InMap)
					continue
				}
				if e == nil {
					continue
				}
				if e.WireID != w.ID {
					t.Errorf("%s: clone %d is #%d, Node's is #%d", step.Name, k, e.WireID, w.ID)
					continue
				}
				if w.Health != nil && e.Health.Amount != *w.Health {
					t.Errorf("%s: #%d health=%v, Node %v", step.Name, w.ID, e.Health.Amount, *w.Health)
				}
				if w.IsDead != nil && e.IsDead() != *w.IsDead {
					t.Errorf("%s: #%d isDead=%v, Node %v", step.Name, w.ID, e.IsDead(), *w.IsDead)
				}
				// The range a bullet has left decides whether it expires.
				// A promoted clone keeps whatever its gun gave it.
				if w.Range != nil && e.Range != *w.Range {
					t.Errorf("%s: #%d range=%v, Node %v", step.Name, w.ID, e.Range, *w.Range)
				}
			}

		case "the siblings":
			var want struct {
				BulletChildren []entityShot `json:"bulletchildren"`
			}
			decodeBacteria(t, step, &want)
			a := g.Room.World.Get(s.Player.Body)
			if a == nil {
				t.Fatal("no body")
			}
			if len(a.BulletChildren) != len(want.BulletChildren) {
				t.Fatalf("%s: the promoted clone keeps %d siblings, Node keeps %d -- "+
					"the source's removal list can never match anything, so none are cut loose",
					step.Name, len(a.BulletChildren), len(want.BulletChildren))
			}
			for k := range want.BulletChildren {
				checkShot(t, step.Name, g, a.BulletChildren[k], &want.BulletChildren[k], seenIDs)
			}

		case "the promoted bullet still plays":
			var want struct {
				StillBody      uint32 `json:"stillBody"`
				Alive          bool   `json:"alive"`
				Moved          bool   `json:"moved"`
				BulletChildren int    `json:"bulletchildren"`
			}
			decodeBacteria(t, step, &want)
			a := g.Room.World.Get(s.Player.Body)
			if a == nil {
				t.Fatal("no body")
			}
			id := s.Player.Body
			p0 := g.Room.World.Pos[id.Index]
			for ticks < step.Ticks {
				tick()
			}
			now := g.Room.World.Get(s.Player.Body)
			if now == nil || now.WireID != want.StillBody {
				t.Fatalf("%s: the player is no longer #%d", step.Name, want.StillBody)
			}
			if alive := !now.IsDead(); alive != want.Alive {
				t.Errorf("%s: alive=%v, Node %v -- a promoted clone that expires like a "+
					"bullet has not had persistsAfterDeath set", step.Name, alive, want.Alive)
			}
			p1 := g.Room.World.Pos[id.Index]
			if moved := p0 != p1; moved != want.Moved {
				t.Errorf("%s: moved=%v, Node %v", step.Name, moved, want.Moved)
			}

		case "a bacteria with no bullets out":
			var want struct {
				ChildrenAtDeath int               `json:"childrenAtDeath"`
				Opcodes         []string          `json:"opcodes"`
				Report          []json.RawMessage `json:"report"`
				Deceased        bool              `json:"deceased"`
				HasBody         bool              `json:"hasBody"`
			}
			decodeBacteria(t, step, &want)
			d2, s2 := join("Sterile")
			b2 := s2.Player.Body
			tick()
			if e := g.Room.World.Get(b2); e == nil {
				t.Fatal("Sterile has no body")
			} else if len(e.BulletChildren) != want.ChildrenAtDeath {
				t.Fatalf("%s: Sterile has %d clones out, Node's has %d",
					step.Name, len(e.BulletChildren), want.ChildrenAtDeath)
			}
			d2.drain()
			kill(b2)
			tick()
			frames := collectFrames(d2)
			var report []net.Value
			for _, f := range frames {
				if op, _, ok := net.Opcode(f); ok && op == net.OpSvDeath && report == nil {
					report = f
				}
			}
			if report == nil {
				t.Fatalf("%s: no death report; a Bacteria with nothing to promote takes "+
					"the ordinary arm", step.Name)
			}
			compareFrame(t, report, want.Report)
			if s2.Status.Deceased != want.Deceased || s2.Player.Body.Valid() != want.HasBody {
				t.Errorf("%s: deceased=%v hasBody=%v, Node %v / %v", step.Name,
					s2.Status.Deceased, s2.Player.Body.Valid(), want.Deceased, want.HasBody)
			}

		default:
			t.Fatalf("unhandled probe step %q -- probe-bacteria.js grew a case this test "+
				"does not replay, which would otherwise pass silently", step.Name)
		}

		if ticks != step.Ticks {
			t.Fatalf("after %q %d ticks have run, Node ran %d", step.Name, ticks, step.Ticks)
		}
	}
}

// checkShot compares one entity's family links against the probe's record of it.
// seen carries the wire ids of entities that have since been destroyed. Without
// it every link into the dead body would read as unset.
func checkShot(t *testing.T, where string, g *Game, id entity.EntityID, want *entityShot, seen map[entity.EntityID]uint32) {
	t.Helper()
	e := g.Room.World.Get(id)
	if e == nil {
		t.Errorf("%s: entity #%d is not in the world", where, want.ID)
		return
	}
	wire := func(other entity.EntityID) *uint32 {
		if oe := g.Room.World.Get(other); oe != nil {
			v := oe.WireID
			return &v
		}
		if v, ok := seen[other]; ok {
			return &v
		}
		return nil
	}
	cmp := func(field string, got *uint32, want *uint32) {
		t.Helper()
		switch {
		case got == nil && want == nil:
		case got == nil || want == nil:
			t.Errorf("%s: #%d.%s is %s, Node has %s", where, want4(want), field, show(got), show(want))
		case *got != *want:
			t.Errorf("%s: #%d.%s is %d, Node has %d", where, e.WireID, field, *got, *want)
		}
	}
	if e.WireID != want.ID {
		t.Errorf("%s: expected #%d, found #%d", where, want.ID, e.WireID)
		return
	}
	if e.Label != want.Label || e.Index != want.Index {
		t.Errorf("%s: #%d is %q/%s, Node has %q/%s", where, e.WireID, e.Label, e.Index, want.Label, want.Index)
	}
	cmp("master", wire(e.Master), want.Master)
	cmp("parent", wire(e.Parent), want.Parent)
	cmp("source", wire(e.Source), want.Source)
	cmp("bulletparent", wire(e.BulletParent), want.BulletParent)
	if got := e.Settings.ConnectChildrenOnCamera; got != want.ConnectChildrenOnCamera {
		t.Errorf("%s: #%d connectChildrenOnCamera=%v, Node %v", where, e.WireID, got, want.ConnectChildrenOnCamera)
	}
	if got := e.Settings.PersistsAfterDeath; got != want.PersistsAfterDeath {
		t.Errorf("%s: #%d persistsAfterDeath=%v, Node %v", where, e.WireID, got, want.PersistsAfterDeath)
	}
	if got := g.Room.World.Flag[id.Index].Has(entity.FlagPlayer); got != want.IsPlayer {
		t.Errorf("%s: #%d isPlayer=%v, Node %v", where, e.WireID, got, want.IsPlayer)
	}
	if len(e.BulletChildren) != len(want.BulletChildren) {
		t.Errorf("%s: #%d has %d clones, Node has %d", where, e.WireID, len(e.BulletChildren), len(want.BulletChildren))
		return
	}
	for i, kid := range e.BulletChildren {
		ke := g.Room.World.Get(kid)
		if ke == nil || ke.WireID != want.BulletChildren[i] {
			t.Errorf("%s: #%d clone %d is not Node's #%d", where, e.WireID, i, want.BulletChildren[i])
		}
	}
}

func show(v *uint32) string {
	if v == nil {
		return "unset"
	}
	return "#" + itoa32(*v)
}

func want4(v *uint32) uint32 {
	if v == nil {
		return 0
	}
	return *v
}

func itoa32(v uint32) string {
	if v == 0 {
		return "0"
	}
	var buf [10]byte
	i := len(buf)
	for v > 0 {
		i--
		buf[i] = byte('0' + v%10)
		v /= 10
	}
	return string(buf[i:])
}

func decodeBacteria(t *testing.T, s *bacteriaStep, out any) {
	t.Helper()
	if err := json.Unmarshal(s.Value, out); err != nil {
		t.Fatalf("step %q: %v", s.Name, err)
	}
}

func loadBacteriaProbe(t *testing.T) *bacteriaProbe {
	t.Helper()
	path := filepath.Join("..", "..", "gen", "bacteria-probe-s1.json")
	raw, err := os.ReadFile(path)
	if err != nil {
		t.Skipf("no bacteria probe (%v); run tools/harness/probe-bacteria.js", err)
	}
	var p bacteriaProbe
	if err := json.Unmarshal(raw, &p); err != nil {
		t.Fatalf("%s: %v", path, err)
	}
	if len(p.Steps) == 0 {
		t.Fatalf("%s: no steps", path)
	}
	return &p
}
