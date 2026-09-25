package guns

import (
	"math"
	"testing"

	"arrasgo/internal/config"
	"arrasgo/internal/defs"
	"arrasgo/internal/entity"
)

// Tuning must be non-nil or ComputeSize panics.
func testSizeCtx() entity.SizeContext {
	return entity.SizeContext{Tuning: &config.Tuning{}}
}

// Pinned against node scratchpad/pin_gun.js.
const epsilon = 1e-9

func almostEqual(t *testing.T, name string, got, want float64) {
	t.Helper()
	if math.Abs(got-want) > epsilon*math.Max(1, math.Abs(want)) {
		t.Errorf("%s: got %v, want %v (pinned against node pin_gun.js)", name, got, want)
	}
}

// Builds a test entity bypassing Skill.Update to match the Node harness.
func interpretTestWorld(t *testing.T, size, coreSIZE float64, sk entity.Skill) (*entity.World, entity.EntityID) {
	t.Helper()
	w := entity.NewWorld(4)
	id := w.Spawn()
	e := w.Get(id)
	e.SIZE = coreSIZE
	e.SizeMultiplier = size / coreSIZE
	e.Skill = sk
	return w, id
}

func TestInterpretDefault(t *testing.T) {
	sk := entity.Skill{Spd: 1.2, Rld: 0.8, Dam: 1.5, Str: 1.1, Pen: 1.3, Rst: 0.2, Ghost: 0.4, Acl: 1, Mob: 1}
	w, id := interpretTestWorld(t, 15, 10, sk)

	g := &Gun{
		Body: id, Master: id, CanShoot: true, TrueRecoil: 1,
		Settings: ShootSettings{Reload: 2, Recoil: 1, Size: 1, Health: 3, Damage: 4, Pen: 1.5, Speed: 5, MaxSpeed: 6, Range: 7, Density: 8, Resist: 0.5},
		BulletBodyStats: defs.BodySpec{
			Range:       defs.Some(0.9),
			Penetration: defs.Some(1.1),
		},
		BulletStats: BulletStats{UseMaster: true},
	}

	out, ok := g.Interpret(w, testSizeCtx())
	if !ok {
		t.Fatalf("Interpret returned ok=false")
	}
	almostEqual(t, "SPEED", out.Speed, 7.199999999999999)
	almostEqual(t, "HEALTH", out.Health, 3.3000000000000003)
	almostEqual(t, "RESIST", out.Resist, 0.7)
	almostEqual(t, "DAMAGE", out.Damage, 6)
	almostEqual(t, "PENETRATION", out.Penetration, 2.1450000000000005)
	almostEqual(t, "RANGE", out.Range, 5.751086853804244)
	almostEqual(t, "DENSITY", out.Density, 9.013333333333334)
	almostEqual(t, "PUSHABILITY", out.Pushability, 0.7692307692307692)
	almostEqual(t, "HETERO", out.Hetero, 1.8800000000000001)
}

func TestInterpretByCalculator(t *testing.T) {
	sk := entity.Skill{Spd: 1.2, Rld: 0.8, Dam: 1.5, Str: 1.1, Pen: 1.3, Rst: 0.2, Ghost: 0.4, Acl: 1, Mob: 1}

	type want struct {
		speed, health, resist, damage, pen, rang, density, pushability, hetero float64
		reloadRateFactor, trueRecoil                                           float64
		childrenLimitFactor                                                    float64
	}
	cases := map[string]want{
		CalcThruster:          {7.199999999999999, 3.3000000000000003, 0.7, 6, 1.9500000000000002, 6.390096504226938, 11.266666666666667, 0.7692307692307692, 1.8800000000000001, 0.8, 0.9797958971132712, 0},
		CalcSustained:         {7.199999999999999, 3.3000000000000003, 0.7, 6, 1.9500000000000002, 7, 11.266666666666667, 0.7692307692307692, 1.8800000000000001, 0.8, 1, 0},
		CalcSustainedLowSpeed: {7.2, 3.3000000000000003, 0.7, 6, 1.9500000000000002, 7, 11.266666666666667, 0.7692307692307692, 1.8800000000000001, 0.8, 1, 0},
		CalcSwarm:             {7.199999999999999, 1.6923076923076923, 0.7, 6, 1.7249999999999999, 6.390096504226938, 11.266666666666667, 0.7692307692307692, 1.8800000000000001, 0.8, 1, 0},
		CalcTrap:              {7.199999999999999, 3.3000000000000003, 0.7, 6, 1.9500000000000002, 7, 11.266666666666667, 0.8770580193070292, 1.8800000000000001, 0.8, 1, 0},
		CalcBlock:             {7.199999999999999, 3.3000000000000003, 0.7, 6, 1.9500000000000002, 7, 11.266666666666667, 0.8770580193070292, 1.8800000000000001, 0.8, 1, 0},
		CalcFixedReload:       {7.199999999999999, 3.3000000000000003, 0.7, 6, 1.9500000000000002, 6.390096504226938, 11.266666666666667, 0.7692307692307692, 1.8800000000000001, 1, 1, 0},
		CalcNecro:             {7.199999999999999, 3.3000000000000003, 0.7, 6, 1.9500000000000002, 6.390096504226938, 11.266666666666667, 0.7692307692307692, 1.8800000000000001, 1, 1, 0.8},
		CalcDrone:             {7.199999999999999, 3.6480252186754036, 0.7, 9.178235124467014, 1.7249999999999999, 6.390096504226938, 11.266666666666667, 1, 1.8800000000000001, 0.8, 1, 0},
	}

	for calc, wt := range cases {
		t.Run(calc, func(t *testing.T) {
			w, id := interpretTestWorld(t, 12, 10, sk)
			g := &Gun{
				Body: id, Master: id, CanShoot: true, TrueRecoil: 1, Calculator: calc,
				Settings:    ShootSettings{Reload: 2, Recoil: 1, Size: 1, Health: 3, Damage: 4, Pen: 1.5, Speed: 5, MaxSpeed: 6, Range: 7, Density: 8, Resist: 0.5},
				BulletStats: BulletStats{UseMaster: true},
			}
			out, ok := g.Interpret(w, testSizeCtx())
			if !ok {
				t.Fatalf("Interpret returned ok=false")
			}
			almostEqual(t, calc+" SPEED", out.Speed, wt.speed)
			almostEqual(t, calc+" HEALTH", out.Health, wt.health)
			almostEqual(t, calc+" RESIST", out.Resist, wt.resist)
			almostEqual(t, calc+" DAMAGE", out.Damage, wt.damage)
			almostEqual(t, calc+" PENETRATION", out.Penetration, wt.pen)
			almostEqual(t, calc+" RANGE", out.Range, wt.rang)
			almostEqual(t, calc+" DENSITY", out.Density, wt.density)
			almostEqual(t, calc+" PUSHABILITY", out.Pushability, wt.pushability)
			almostEqual(t, calc+" HETERO", out.Hetero, wt.hetero)
			almostEqual(t, calc+" ReloadRateFactor", g.ReloadRateFactor, wt.reloadRateFactor)
			almostEqual(t, calc+" TrueRecoil", g.TrueRecoil, wt.trueRecoil)
			if calc == CalcNecro {
				almostEqual(t, calc+" ChildrenLimitFactor", g.ChildrenLimitFactor, wt.childrenLimitFactor)
			}
		})
	}
}

// Checks that side effects happen before the independentChildren return.
func TestInterpretIndependentChildren(t *testing.T) {
	sk := entity.Skill{Spd: 1, Rld: 1, Dam: 1, Str: 1, Pen: 1, Rst: 0, Ghost: 0, Acl: 1, Mob: 1}
	w, id := interpretTestWorld(t, 12, 10, sk)
	g := &Gun{
		Body: id, Master: id, CanShoot: true, IndependentChildren: true,
		Settings:    ShootSettings{Reload: 2, Recoil: 1, Size: 1, Health: 3, Damage: 4, Pen: 1.5, Speed: 5, MaxSpeed: 6, Range: 7, Density: 8, Resist: 0.5},
		BulletStats: BulletStats{UseMaster: true},
	}
	_, ok := g.Interpret(w, testSizeCtx())
	if ok {
		t.Fatalf("Interpret returned ok=true for an independent-children gun")
	}
	almostEqual(t, "ReloadRateFactor side effect", g.ReloadRateFactor, 1)
}

func TestInterpretCanShootFalse(t *testing.T) {
	w := entity.NewWorld(1)
	id := w.Spawn()
	g := &Gun{Body: id, Master: id, CanShoot: false}
	_, ok := g.Interpret(w, testSizeCtx())
	if ok {
		t.Fatalf("Interpret returned ok=true for a gun that cannot shoot")
	}
}
