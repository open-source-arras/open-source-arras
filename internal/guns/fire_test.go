package guns

import (
	"math"
	"strings"
	"testing"

	"arrasgo/internal/config"
	"arrasgo/internal/defs"
	"arrasgo/internal/entity"
	"arrasgo/internal/jsutil"
	"arrasgo/internal/vmath"
)

// minimalDefs returns a defs.Set with one resolvable definition.
func minimalDefs(tb testing.TB) *defs.Set {
	tb.Helper()
	set, err := defs.LoadReader(strings.NewReader(`{"definitions":{"genericEntity":{"index":0}}}`), jsutil.NewRand(1))
	if err != nil {
		tb.Fatalf("minimalDefs: %v", err)
	}
	return set
}

// fireTestDeps returns the Deps struct for tests.
func fireTestDeps(t *testing.T) Deps {
	t.Helper()
	w := entity.NewWorld(8)
	return Deps{
		World:  w,
		Guns:   NewTable(4),
		Defs:   minimalDefs(t),
		Tuning: &config.Tuning{RunSpeed: 1.5, GameSpeed: 1, SkillCap: 5, GlassHealthFactor: 1},
		Rand:   jsutil.NewRand(1),
	}
}

// TestRecoil verifies the Recoil function with a gun mid-recoil.
func TestRecoil(t *testing.T) {
	d := fireTestDeps(t)
	bodyID := d.World.Spawn()
	body := d.World.Get(bodyID)
	body.RecoilMultiplier = 1.3
	body.SIZE = 20
	body.SizeMultiplier = 1

	gid := d.Guns.insert(Gun{
		Body: bodyID, Master: bodyID, CanShoot: true,
		TrueRecoil: 2.5, Position: 4, Motion: 2, RecoilDir: 0.7,
	})

	Recoil(d, gid)

	g := d.Guns.Get(gid)
	almostEqual(t, "position", g.Position, 5)
	almostEqual(t, "motion", g.Motion, 0.75)
	almostEqual(t, "accelX", d.World.Accel[bodyID.Index].X, -0.6711490193421387)
	almostEqual(t, "accelY", d.World.Accel[bodyID.Index].Y, -0.5653010205510739)
}

// liveTestBody sets up the body a Live() test fires from: its own master
func liveTestBody(d Deps, sk entity.Skill) entity.EntityID {
	id := d.World.Spawn()
	e := d.World.Get(id)
	e.Master = id
	e.Skill = sk
	e.Activation.Active = true
	return id
}

// TestLiveCycleTimerHeld verifies the cycle timer decreases when fire is held.
func TestLiveCycleTimerHeld(t *testing.T) {
	d := fireTestDeps(t)
	sk := entity.Skill{Spd: 1, Rld: 0.6, Dam: 1, Str: 1, Pen: 1, Rst: 0, Ghost: 0, Acl: 1, Mob: 1}
	bodyID := liveTestBody(d, sk)
	body := d.World.Get(bodyID)
	body.Control.Fire = true

	gid := d.Guns.insert(Gun{
		Body: bodyID, Master: bodyID, CanShoot: true,
		Settings:      ShootSettings{Reload: 3, Recoil: 1, Size: 1, Health: 1, Damage: 1, Pen: 1, Speed: 1, MaxSpeed: 1, Range: 1, Density: 1, Resist: 1},
		BulletStats:   BulletStats{UseMaster: true},
		MaxCycleTimer: 1,
	})

	if err := Live(d, gid, jsutil.NewRand(1)); err != nil {
		t.Fatalf("Live: %v", err)
	}
	almostEqual(t, "cycleTimer", d.Guns.Get(gid).CycleTimer, 0.3703703703703704)
}

// TestLiveCycleTimerReleased verifies the cycle timer stays at zero when fire is released.
func TestLiveCycleTimerReleased(t *testing.T) {
	d := fireTestDeps(t)
	sk := entity.Skill{Spd: 1, Rld: 0.6, Dam: 1, Str: 1, Pen: 1, Rst: 0, Ghost: 0, Acl: 1, Mob: 1}
	bodyID := liveTestBody(d, sk)
	body := d.World.Get(bodyID)
	body.Control.Fire = false

	gid := d.Guns.insert(Gun{
		Body: bodyID, Master: bodyID, CanShoot: true,
		Settings:    ShootSettings{Reload: 3, Recoil: 1, Size: 1, Health: 1, Damage: 1, Pen: 1, Speed: 1, MaxSpeed: 1, Range: 1, Density: 1, Resist: 1},
		BulletStats: BulletStats{UseMaster: true},
	})

	if err := Live(d, gid, jsutil.NewRand(1)); err != nil {
		t.Fatalf("Live: %v", err)
	}
	almostEqual(t, "cycleTimer", d.Guns.Get(gid).CycleTimer, 0)
}

// TestLiveAutofireShots pins liveAutofireShots: a very fast reload (0.2s)
func TestLiveAutofireShots(t *testing.T) {
	d := fireTestDeps(t)
	sk := entity.Skill{Spd: 1, Rld: 1, Dam: 1, Str: 1, Pen: 1, Rst: 0, Ghost: 0, Acl: 1, Mob: 1}
	bodyID := liveTestBody(d, sk)
	body := d.World.Get(bodyID)
	body.SIZE = 10
	body.SizeMultiplier = 1.2 // master.size/master.SIZE = 12/10

	gid := d.Guns.insert(Gun{
		Body: bodyID, Master: bodyID, CanShoot: true, Autofire: true,
		Settings:    ShootSettings{Reload: 0.2, Recoil: 1, Size: 1, Health: 1, Damage: 1, Pen: 1, Speed: 1, MaxSpeed: 1, Range: 1, Density: 1, Resist: 1},
		BulletStats: BulletStats{UseMaster: true},
		BulletType:  &defs.Definition{},
	})

	if err := Live(d, gid, jsutil.NewRand(1)); err != nil {
		t.Fatalf("Live: %v", err)
	}
	almostEqual(t, "cycleTimerAfter", d.Guns.Get(gid).CycleTimer, 0.33333333333333304)

	g := d.Guns.Get(gid)
	if got := len(g.BulletChildren); got != 3 {
		t.Fatalf("len(g.BulletChildren) = %d, want 3 (gun.js:454-456's default branch, one push per shot)", got)
	}
	body = d.World.Get(bodyID) // each shot's own World.Spawn may have reallocated the slab
	if got := len(body.BulletChildren); got != 3 {
		t.Fatalf("len(body.BulletChildren) = %d, want 3", got)
	}
}

// TestFireBulletResult verifies lastShot.power and motion after firing.
func TestFireBulletResult(t *testing.T) {
	d := fireTestDeps(t)
	bodyID := d.World.Spawn()
	body := d.World.Get(bodyID)
	body.Master = bodyID
	body.Skill = entity.Skill{Spd: 1, Rld: 1, Dam: 1, Str: 1, Pen: 1, Rst: 0, Ghost: 0, Acl: 1, Mob: 1}
	body.Facing = 0.5
	body.SIZE = 8
	body.SizeMultiplier = 1
	d.World.Vel[bodyID.Index] = vmath.Vec2{X: 3, Y: 4}

	gid := d.Guns.insert(Gun{
		Body: bodyID, Master: bodyID, CanShoot: true,
		Settings:    ShootSettings{Reload: 1, Recoil: 1, Size: 2, Health: 1, Damage: 1, Pen: 1, Speed: 9, MaxSpeed: 1, Range: 1, Density: 1, Resist: 1},
		BulletStats: BulletStats{UseMaster: true},
		TrueRecoil:  0.2,
		Angle:       0.1,
		Direction:   0.05,
		Offset:      1.5,
		Length:      2,
		Width:       1,
		Aspect:      1,
		BulletType:  &defs.Definition{},
	})

	if err := FireBullet(d, gid, jsutil.NewRand(1)); err != nil {
		t.Fatalf("FireBullet: %v", err)
	}
	g := d.Guns.Get(gid)
	almostEqual(t, "lastShotPower", g.LastShot.Power, 3.365372081092811)
	almostEqual(t, "motion", g.Motion, 3.365372081092811)
	almostEqual(t, "recoilDir", g.RecoilDir, 0.6)
}

// TestGetTrackingNaN documents the bug in GetTracking that returns NaN without proper guards.
func TestGetTrackingNaN(t *testing.T) {
	d := fireTestDeps(t)
	g := &Gun{CanShoot: true, BulletStats: BulletStats{UseMaster: true}, Settings: ShootSettings{MaxSpeed: 1, Range: 1}}
	speed, rang := GetTracking(d, g)
	if !math.IsNaN(speed) {
		t.Errorf("GetTracking speed = %v, want NaN (found-bugs.md: missing ?? 1 guard)", speed)
	}
	if !math.IsNaN(rang) {
		t.Errorf("GetTracking range = %v, want NaN (found-bugs.md: missing ?? 1 guard)", rang)
	}
}

// BenchmarkFireBullet measures FireBullet performance with no allocations on the hot path.
func BenchmarkFireBullet(b *testing.B) {
	w := entity.NewWorld(b.N + 8)
	d := Deps{
		World:  w,
		Guns:   NewTable(4),
		Defs:   minimalDefs(b),
		Tuning: &config.Tuning{RunSpeed: 1.5, GameSpeed: 1, SkillCap: 5, GlassHealthFactor: 1},
		Rand:   jsutil.NewRand(1),
	}
	bodyID := w.Spawn()
	body := w.Get(bodyID)
	body.Master = bodyID
	body.SIZE = 10
	body.SizeMultiplier = 1
	body.Skill = entity.Skill{Spd: 1, Rld: 1, Dam: 1, Str: 1, Pen: 1, Rst: 0, Ghost: 0, Acl: 1, Mob: 1}
	body.BulletChildren = make([]entity.EntityID, 0, b.N)

	gid := d.Guns.insert(Gun{
		Body: bodyID, Master: bodyID, CanShoot: true,
		Settings:    ShootSettings{Reload: 1, Recoil: 1, Size: 1, Health: 1, Damage: 1, Pen: 1, Speed: 1, MaxSpeed: 1, Range: 1, Density: 1, Resist: 1},
		BulletStats: BulletStats{UseMaster: true},
		BulletType:  &defs.Definition{},
	})
	g := d.Guns.Get(gid)
	g.BulletChildren = make([]entity.EntityID, 0, b.N)
	rng := jsutil.NewRand(1)

	b.ReportAllocs()
	b.ResetTimer()
	for i := 0; i < b.N; i++ {
		if err := FireBullet(d, gid, rng); err != nil {
			b.Fatalf("FireBullet: %v", err)
		}
	}
}
