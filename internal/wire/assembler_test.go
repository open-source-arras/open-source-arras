package wire

import (
	"math"
	"testing"

	"arrasgo/internal/entity"
	"arrasgo/internal/jsutil"
	"arrasgo/internal/vmath"
)

var nodeAssemblerEffects = [10][2]float64{
	{11.993206694023684, -2.8987160325050354},
	{-0.39486446185037494, 4.769016187638044},
	{0.23570923367515206, -2.2879220929462463},
	{-10.65606145421043, 3.9959470101166517},
	{12.420660984935239, 4.875337276607752},
	{-1.0016281623393297, 6.687662790063769},
	{9.765576029894873, 7.040155283175409},
	{3.1915132014546543, -3.767614880343899},
	{-0.6664290209300816, -2.924322778126225},
	{6.810475868405774, 5.477623151382431},
}

// TestAssemblerMergeMatchesNode checks assembler merge against Node behavior.
func TestAssemblerMergeMatchesNode(t *testing.T) {
	opts := testOptions(1, "ffa")
	opts.UseDefiner = true
	g := mustBoot(t, opts)
	w := g.Sim.W

	parent := w.Spawn()
	g.Sim.Track(parent)

	trap := func(x, y float64) entity.EntityID {
		t.Helper()
		id := w.Spawn()
		g.Sim.Track(id)
		for _, name := range []string{"genericEntity", "assemblent"} {
			if err := g.Room.Definer.Define(w, id, name); err != nil {
				t.Fatalf("defining %s: %v", name, err)
			}
		}
		e := w.Get(id)
		e.Team = -1
		e.Parent = parent
		e.Health.Amount = e.Health.Max
		w.Pos[id.Index] = vmath.Vec2{X: x, Y: y}
		return id
	}

	a := trap(0, 0)
	b := trap(2, 0)
	if w.Get(a).WireID >= w.Get(b).WireID {
		t.Fatalf("wire ids %d, %d: this test assumes the second trap is the higher",
			w.Get(a).WireID, w.Get(b).WireID)
	}
	if got := w.Get(a).SIZE; got != 10 {
		t.Fatalf("assemblent SIZE = %v, want 10 (Node's, before any merge)", got)
	}

	before := len(g.Sim.Tracked())
	*g.Rand = *jsutil.NewRand(12345)

	g.Sim.Collide(a, b)

	if got := g.Rand.Calls(); got != 20 {
		t.Errorf("merge took %d draws, want 20 (two per effect entity)", got)
	}

	surv := w.Get(b)
	for _, c := range []struct {
		name string
		got  float64
		want float64
	}{
		{"SIZE", surv.SIZE, 11.5},
		{"SPEED", surv.SPEED, 0.63},
		{"HEALTH", surv.HEALTH, 0.6},
		{"DAMAGE", surv.DAMAGE, 3.3000000000000003},
		{"health.Max", surv.Health.Max, 1.2},
		{"health.Amount", surv.Health.Amount, 1.2},
	} {
		if c.got != c.want {
			t.Errorf("survivor %s = %v, want %v", c.name, c.got, c.want)
		}
	}
	if lvl := g.Sim.AssemblerLevel(b); lvl != 2 {
		t.Errorf("survivor assemblerLevel = %d, want 2", lvl)
	}
	if surv.IsDead() {
		t.Error("the survivor is dead")
	}

	dead := w.Get(a)
	if !dead.IsDead() {
		t.Error("the absorbed trap is not dead")
	}
	if got := dead.Health.Amount; got != -100 {
		t.Errorf("absorbed trap health = %v, want -100 (kill())", got)
	}
	if lvl := g.Sim.AssemblerLevel(a); lvl != 1 {
		t.Errorf("absorbed trap assemblerLevel = %d, want 1", lvl)
	}

	tracked := g.Sim.Tracked()
	if len(tracked)-before != 10 {
		t.Fatalf("%d entities were spawned, want 10", len(tracked)-before)
	}
	effects := tracked[before:]
	for i, id := range effects {
		e := w.Get(id)
		want := nodeAssemblerEffects[i]
		v := w.Vel[id.Index]
		if v.X != want[0] || v.Y != want[1] {
			t.Errorf("effect %d velocity = (%v, %v), want Node's (%v, %v)", i, v.X, v.Y, want[0], want[1])
		}
		if math.Abs(e.SIZE-11.5/1.5) > 1e-12 {
			t.Errorf("effect %d SIZE = %v, want the survivor's SIZE/1.5", i, e.SIZE)
		}
		if e.Team != -1 {
			t.Errorf("effect %d team = %d, want the survivor's -1", i, e.Team)
		}
	}
}
