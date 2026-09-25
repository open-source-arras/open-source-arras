package define

import (
	"math"
	"testing"

	"arrasgo/internal/config"
	"arrasgo/internal/ctrl"
	"arrasgo/internal/defs"
	"arrasgo/internal/entity"
	"arrasgo/internal/guns"
	"arrasgo/internal/jsutil"
)

// These tests cover what the shipped definitions cannot structurally reach.
type fixture struct {
	t     *testing.T
	d     *Definer
	w     *entity.World
	guns  *guns.Table
	ctrl  *ctrl.Table
	rng   *jsutil.Rand
	tuner config.Tuning
}

func newFixture(t *testing.T, growth bool) *fixture {
	t.Helper()
	set, err := defs.Load(jsutil.NewRand(1))
	if err != nil {
		t.Fatalf("loading definitions: %v", err)
	}
	tuning, err := config.Default()
	if err != nil {
		t.Fatalf("loading config: %v", err)
	}
	f := &fixture{
		t:     t,
		w:     entity.NewWorld(64),
		guns:  guns.NewTable(64),
		ctrl:  ctrl.NewTable(16),
		rng:   jsutil.NewRand(1),
		tuner: tuning,
	}
	f.w.Tuning = &f.tuner
	f.w.Now = func() int64 { return 0 }
	d, err := New(Config{
		Defs: set, Guns: f.guns, Ctrl: f.ctrl, Tuning: &f.tuner, Rand: f.rng,
		Growth: growth,
	})
	if err != nil {
		t.Fatalf("New: %v", err)
	}
	f.d = d
	return f
}

func (f *fixture) define(name string) entity.EntityID {
	f.t.Helper()
	id := f.w.Spawn()
	if err := f.d.Define(f.w, id, name); err != nil {
		f.t.Fatalf("Define(%q): %v", name, err)
	}
	return id
}

// TestGunStatScaleFoldsIntoEveryGun exercises entity.js:426.
func TestGunStatScaleFoldsIntoEveryGun(t *testing.T) {
	f := newFixture(t, false)

	base := f.define("basic")
	e := f.w.Get(base)
	if len(e.Guns) == 0 {
		t.Fatalf("basic has no guns; the fixture is not exercising anything")
	}
	before := make([]guns.ShootSettings, len(e.Guns))
	for i, gid := range e.Guns {
		before[i] = f.guns.Get(gid).Settings
	}

	scaled := f.w.Spawn()
	err := f.d.DefineInline(f.w, scaled, &defs.Definition{
		Parent: defs.TypeList{{Name: "basic"}},
		GunStatScale: defs.Some(defs.StatScale{
			Damage: defs.Some(2.0),
			Reload: defs.Some(0.5),
			Speed:  defs.Some(1.25),
		}),
	})
	if err != nil {
		t.Fatalf("DefineInline: %v", err)
	}
	se := f.w.Get(scaled)
	if len(se.Guns) != len(before) {
		t.Fatalf("gun count changed: got %d, want %d", len(se.Guns), len(before))
	}

	for i, gid := range se.Guns {
		g := f.guns.Get(gid)
		if want := before[i].Damage * 2; g.Settings.Damage != want {
			t.Errorf("gun %d damage: got %v, want %v", i, g.Settings.Damage, want)
		}
		if want := before[i].Reload * 0.5; g.Settings.Reload != want {
			t.Errorf("gun %d reload: got %v, want %v", i, g.Settings.Reload, want)
		}
		if want := before[i].Speed * 1.25; g.Settings.Speed != want {
			t.Errorf("gun %d speed: got %v, want %v", i, g.Settings.Speed, want)
		}
		if g.Settings.Health != before[i].Health {
			t.Errorf("gun %d health moved without being scaled: got %v, want %v",
				i, g.Settings.Health, before[i].Health)
		}
		if g.TrueRecoil != g.Settings.Recoil {
			t.Errorf("gun %d trueRecoil: got %v, want the scaled recoil %v",
				i, g.TrueRecoil, g.Settings.Recoil)
		}
	}
}

// TestGunStatScaleIsFalsyGated pins the if (set.GUN_STAT_SCALE) truthiness test.
func TestGunStatScaleIsFalsyGated(t *testing.T) {
	f := newFixture(t, false)

	base := f.define("basic")
	want := f.guns.Get(f.w.Get(base).Guns[0]).Settings

	id := f.w.Spawn()
	if err := f.d.DefineInline(f.w, id, &defs.Definition{
		Parent:       defs.TypeList{{Name: "basic"}},
		GunStatScale: defs.Some(defs.StatScale{}),
	}); err != nil {
		t.Fatalf("DefineInline: %v", err)
	}
	got := f.guns.Get(f.w.Get(id).Guns[0]).Settings
	if got != want {
		t.Errorf("an empty GUN_STAT_SCALE changed the gun: got %+v, want %+v", got, want)
	}
}

// TestRefreshBodyAttributesGrowthCeilings pins entity.js:586's ceilings.
func TestRefreshBodyAttributesGrowthCeilings(t *testing.T) {
	for _, tc := range []struct {
		growth       bool
		levelCeiling int32
	}{{false, 45}, {true, 120}} {
		f := newFixture(t, tc.growth)
		id := f.define("basic")
		e := f.w.Get(id)
		e.LevelCap, e.HasLevelCap = 1000, true
		e.Settings.HealthWithLevel = true
		e.HEALTH = 100

		atCeiling := f.healthAtLevel(id, tc.levelCeiling)
		beyond := f.healthAtLevel(id, tc.levelCeiling+30)
		if atCeiling != beyond {
			t.Errorf("growth=%v: health kept growing past the level ceiling of %d: %v then %v",
				tc.growth, tc.levelCeiling, atCeiling, beyond)
		}
		below := f.healthAtLevel(id, tc.levelCeiling-10)
		if below >= atCeiling {
			t.Errorf("growth=%v: health did not grow below the ceiling: %v at %d, %v at %d",
				tc.growth, below, tc.levelCeiling-10, atCeiling, tc.levelCeiling)
		}
	}
}

func (f *fixture) climbTo(id entity.EntityID, level int32) *entity.Entity {
	f.t.Helper()
	e := f.w.Get(id)
	e.Skill.Reset(&f.tuner, true)
	for i := 0; e.Skill.Level < level; i++ {
		if i > 10000 {
			f.t.Fatalf("skill did not reach level %d", level)
		}
		e.Skill.Score += e.Skill.LevelScore()
		e.Skill.Maintain(&f.tuner)
	}
	f.d.RefreshBodyAttributes(f.w, id)
	return e
}

func (f *fixture) healthAtLevel(id entity.EntityID, level int32) float64 {
	f.t.Helper()
	return f.climbTo(id, level).Health.Max
}

// TestRefreshBodyAttributesResetsSizeMultiplier pins entity.js:619.
func TestRefreshBodyAttributesResetsSizeMultiplier(t *testing.T) {
	f := newFixture(t, false)
	id := f.define("basic")
	e := f.w.Get(id)
	e.SizeMultiplier = 7
	f.d.RefreshBodyAttributes(f.w, id)
	if e.SizeMultiplier != 1 {
		t.Errorf("SizeMultiplier: got %v, want 1", e.SizeMultiplier)
	}
}

// TestRefreshBodyAttributesDensityUsesUncappedLevel pins entity.js:615.
func TestRefreshBodyAttributesDensityUsesUncappedLevel(t *testing.T) {
	f := newFixture(t, false)
	id := f.define("basic")
	e := f.w.Get(id)
	e.LevelCap, e.HasLevelCap = 1000, true
	e.DENSITY = 1

	d1 := f.climbTo(id, 45).Density
	d2 := f.climbTo(id, 60).Density
	if d2 <= d1 {
		t.Errorf("density stopped growing at the refreshBodyAttributes level ceiling of 45: %v at 45, %v at 60", d1, d2)
	}
	if want := 1 + 0.08*60; math.Abs(d2-want) > 1e-12 {
		t.Errorf("density at level 60: got %v, want %v", d2, want)
	}
}

// TestAttachControllersDedupesByKind covers room.ControllerAttacher.
func TestAttachControllersDedupesByKind(t *testing.T) {
	f := newFixture(t, false)
	id := f.w.Spawn()

	if err := f.d.AttachControllers(f.w, id,
		defs.Controller{Name: "doNothing"},
		defs.Controller{Name: "mapAltToFire"},
	); err != nil {
		t.Fatalf("AttachControllers: %v", err)
	}
	if got := len(f.w.Get(id).Controllers); got != 2 {
		t.Fatalf("after the first attach: got %d controllers, want 2", got)
	}
	first := f.w.Get(id).Controllers[0]

	if err := f.d.AttachControllers(f.w, id, defs.Controller{Name: "doNothing"}); err != nil {
		t.Fatalf("AttachControllers (second): %v", err)
	}
	e := f.w.Get(id)
	if got := len(e.Controllers); got != 2 {
		t.Errorf("a duplicate kind was appended: got %d controllers, want 2", got)
	}
	if e.Controllers[0] != first {
		t.Errorf("slot 0's ControllerID moved: got %v, want %v", e.Controllers[0], first)
	}
	if f.ctrl.Kind(e.Controllers[0]) != f.ctrl.Kind(first) {
		t.Errorf("slot 0 changed kind")
	}
}

// TestAttachControllersSpliceBug pins docs/found-bugs.md #34.
func TestAttachControllersSpliceBug(t *testing.T) {
	f := newFixture(t, false)
	id := f.w.Spawn()

	if err := f.d.AttachControllers(f.w, id, defs.Controller{Name: "doNothing"}); err != nil {
		t.Fatalf("AttachControllers: %v", err)
	}
	if err := f.d.AttachControllers(f.w, id,
		defs.Controller{Name: "doNothing"},
		defs.Controller{Name: "doNothing"},
	); err != nil {
		t.Fatalf("AttachControllers (pair): %v", err)
	}
	e := f.w.Get(id)
	if got := len(e.Controllers); got != 2 {
		t.Errorf("got %d controllers, want 2 -- the dedup is meant to leak exactly one "+
			"duplicate here (found-bugs #34), no more and no fewer", got)
	}
	for i, cid := range e.Controllers {
		if f.ctrl.Kind(cid) != f.ctrl.Kind(e.Controllers[0]) {
			t.Errorf("controller %d changed kind; both should be doNothing", i)
		}
	}
}

// TestAttachControllersRejectsUnknownName pins entity.js:224.
func TestAttachControllersRejectsUnknownName(t *testing.T) {
	f := newFixture(t, false)
	id := f.w.Spawn()
	err := f.d.AttachControllers(f.w, id, defs.Controller{Name: "notAController"})
	if err == nil {
		t.Fatalf("an unknown controller name was accepted")
	}
	if len(f.w.Get(id).Controllers) != 0 {
		t.Errorf("a failed attach left controllers behind: %v", f.w.Get(id).Controllers)
	}
}

// TestRedefineReplacesGunsAndTurrets covers what an upgrade does.
func TestRedefineReplacesGunsAndTurrets(t *testing.T) {
	f := newFixture(t, false)
	id := f.define("basic")
	basicGuns := len(f.w.Get(id).Guns)

	if err := f.d.Define(f.w, id, "twin"); err != nil {
		t.Fatalf("redefine to twin: %v", err)
	}
	twinGuns := len(f.w.Get(id).Guns)
	if basicGuns != 1 {
		t.Fatalf("basic has %d guns, expected 1; the assertion below would prove nothing", basicGuns)
	}
	if twinGuns != 2 {
		t.Errorf("twin after basic: got %d guns, want 2 (basic's gun was not replaced)", twinGuns)
	}

	withTurrets := f.w.Spawn()
	if err := f.d.Define(f.w, withTurrets, "auto3"); err != nil {
		t.Fatalf("define auto3: %v", err)
	}
	if len(f.w.Get(withTurrets).Turrets) == 0 {
		t.Fatalf("auto3 mounted no turrets; the fixture is not exercising anything")
	}
	if err := f.d.Define(f.w, withTurrets, "twin"); err != nil {
		t.Fatalf("redefine to twin: %v", err)
	}
	if got := len(f.w.Get(withTurrets).Turrets); got != 0 {
		t.Errorf("redefining to a turretless definition left %d turrets mounted", got)
	}
}

// TestDefineRejectsDeadHandles is the guard every entry point shares.
func TestDefineRejectsDeadHandles(t *testing.T) {
	f := newFixture(t, false)
	id := f.w.Spawn()
	f.w.Destroy(id)

	if err := f.d.Define(f.w, id, "basic"); err == nil {
		t.Errorf("Define accepted a destroyed handle")
	}
	if err := f.d.DefineInline(f.w, id, &defs.Definition{}); err == nil {
		t.Errorf("DefineInline accepted a destroyed handle")
	}
	if err := f.d.DefineSplit(f.w, id, []string{"basic"}); err == nil {
		t.Errorf("DefineSplit accepted a destroyed handle")
	}
	if err := f.d.AttachControllers(f.w, id, defs.Controller{Name: "doNothing"}); err == nil {
		t.Errorf("AttachControllers accepted a destroyed handle")
	}
}

// TestTargetableExcludesSixTypes is entity.js:578-582.
func TestTargetableExcludesSixTypes(t *testing.T) {
	for _, ty := range []string{"bullet", "drone", "swarm", "trap", "wall", "unknown"} {
		if Targetable(&entity.Entity{Type: ty}) {
			t.Errorf("%q should not be targetable", ty)
		}
	}
	for _, ty := range []string{"tank", "food", "crasher", "miniboss", "", "aura"} {
		if !Targetable(&entity.Entity{Type: ty}) {
			t.Errorf("%q should be targetable", ty)
		}
	}
}

// TestNecroDefineGunsKeepsShapesWithNoGun pins found-bugs.md #70.
func TestNecroDefineGunsKeepsShapesWithNoGun(t *testing.T) {
	f := newFixture(t, false)

	tank := f.define("necromancer")
	e := f.w.Get(tank)
	if len(e.Settings.NecroTypes) != 1 || e.Settings.NecroTypes[0] != 4 {
		t.Fatalf("necroTypes = %v, want [4]", e.Settings.NecroTypes)
	}
	if len(e.Settings.NecroDefineGuns) != 1 {
		t.Fatalf("necroDefineGuns = %v, want one entry per necroType", e.Settings.NecroDefineGuns)
	}
	if e.Settings.NecroDefineGuns[0].Gun == 0 {
		t.Error("the caster's own filter should have matched one of its sunchip guns")
	}

	drone := f.define("sunchip")
	d := f.w.Get(drone)
	if len(d.Guns) != 0 {
		t.Fatalf("sunchip has %d guns; this test assumes none", len(d.Guns))
	}
	if len(d.Settings.NecroDefineGuns) != len(d.Settings.NecroTypes) {
		t.Fatalf("necroDefineGuns = %v, want one entry per necroType %v",
			d.Settings.NecroDefineGuns, d.Settings.NecroTypes)
	}
	for _, n := range d.Settings.NecroDefineGuns {
		if n.Gun != 0 {
			t.Errorf("shape %d resolved to gun %d; a gunless drone can match nothing", n.Shape, n.Gun)
		}
	}
}
