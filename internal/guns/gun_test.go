package guns

import (
	"math"
	"testing"

	"arrasgo/internal/config"
	"arrasgo/internal/defs"
	"arrasgo/internal/entity"
)

// gunTestDeps returns a Deps with a non-nil Tuning to avoid panics in NewGun.
func gunTestDeps(t *testing.T) Deps {
	t.Helper()
	return Deps{
		World:  entity.NewWorld(4),
		Guns:   NewTable(4),
		Defs:   minimalDefs(t),
		Tuning: &config.Tuning{},
	}
}

func TestNewGunNoType(t *testing.T) {
	d := gunTestDeps(t)
	body := d.World.Spawn()

	gid, err := NewGun(d, body, defs.Gun{}, false)
	if err != nil {
		t.Fatalf("NewGun: %v", err)
	}
	g := d.Guns.Get(gid)
	if g.CanShoot {
		t.Errorf("CanShoot = true, want false (no PROPERTIES at all)")
	}
	if g.BulletType != nil {
		t.Errorf("BulletType = %+v, want nil", g.BulletType)
	}
}

func TestNewGunWithType(t *testing.T) {
	d := gunTestDeps(t)
	body := d.World.Spawn()
	bullet := &defs.Definition{Label: defs.Some("Bullet")}
	spec := defs.Gun{Properties: defs.Some(defs.GunProperties{
		Type: defs.TypeList{{Inline: bullet}},
	})}

	gid, err := NewGun(d, body, spec, false)
	if err != nil {
		t.Fatalf("NewGun: %v", err)
	}
	g := d.Guns.Get(gid)
	if !g.CanShoot {
		t.Errorf("CanShoot = false, want true")
	}
	if g.BulletType == nil {
		t.Fatalf("BulletType = nil, want a resolved definition")
	}
	if len(g.BulletType.Parent) != 0 {
		t.Errorf("BulletType still carries PARENT; setBulletType must flatten it away")
	}
}

func TestNewGunDisableGuns(t *testing.T) {
	d := gunTestDeps(t)
	body := d.World.Spawn()
	bullet := &defs.Definition{Label: defs.Some("Bullet")}
	spec := defs.Gun{Properties: defs.Some(defs.GunProperties{
		Type: defs.TypeList{{Inline: bullet}},
	})}

	gid, err := NewGun(d, body, spec, true)
	if err != nil {
		t.Fatalf("NewGun: %v", err)
	}
	g := d.Guns.Get(gid)
	if g.CanShoot {
		t.Errorf("CanShoot = true, want false (disableGuns)")
	}
	if g.BulletType != nil {
		t.Errorf("BulletType = %+v, want nil (setBulletType must not even run)", g.BulletType)
	}
}

func TestNewGunColorDefault(t *testing.T) {
	d := gunTestDeps(t)
	body := d.World.Spawn()

	gid, err := NewGun(d, body, defs.Gun{}, false)
	if err != nil {
		t.Fatalf("NewGun: %v", err)
	}
	g := d.Guns.Get(gid)
	if got := g.Color.Base(); got != "grey" {
		t.Errorf("Color.Base() = %q, want %q", got, "grey")
	}
	if got := g.Color.HueShift(); got != 0 {
		t.Errorf("Color.HueShift() = %v, want 0", got)
	}
	if got := g.Color.SaturationShift(); got != 1 {
		t.Errorf("Color.SaturationShift() = %v, want 1", got)
	}
	if got := g.Color.BrightnessShift(); got != 0 {
		t.Errorf("Color.BrightnessShift() = %v, want 0", got)
	}
	if got := g.Color.AllowBrightnessInvert(); got != false {
		t.Errorf("Color.AllowBrightnessInvert() = %v, want false", got)
	}
}

func TestNewGunPositionArrayGaps(t *testing.T) {
	d := gunTestDeps(t)
	body := d.World.Spawn()
	spec := defs.Gun{Position: defs.GunPosition{FromArray: true}}

	gid, err := NewGun(d, body, spec, false)
	if err != nil {
		t.Fatalf("NewGun: %v", err)
	}
	g := d.Guns.Get(gid)
	if !math.IsNaN(g.Length) {
		t.Errorf("Length = %v, want NaN (array form, LENGTH slot absent)", g.Length)
	}
	if !math.IsNaN(g.Angle) {
		t.Errorf("Angle = %v, want NaN", g.Angle)
	}
	if g.Layer != 0 {
		t.Errorf("Layer = %v, want 0 (gun.js:112's own `?? 0`, applies regardless of form)", g.Layer)
	}
}

func TestNewGunPositionObjectDefaults(t *testing.T) {
	d := gunTestDeps(t)
	body := d.World.Spawn()
	spec := defs.Gun{Position: defs.GunPosition{}} // FromArray false: object form

	gid, err := NewGun(d, body, spec, false)
	if err != nil {
		t.Fatalf("NewGun: %v", err)
	}
	g := d.Guns.Get(gid)
	if g.Length != 1.8 {
		t.Errorf("Length = %v, want 1.8 (LENGTH 18 default / 10)", g.Length)
	}
	if g.Width != 0.8 {
		t.Errorf("Width = %v, want 0.8 (WIDTH 8 default / 10)", g.Width)
	}
	if g.Aspect != 1 {
		t.Errorf("Aspect = %v, want 1", g.Aspect)
	}
	if g.Angle != 0 {
		t.Errorf("Angle = %v, want 0", g.Angle)
	}
	if g.Layer != 0 {
		t.Errorf("Layer = %v, want 0", g.Layer)
	}
}

// Reproduces the JS bug. See docs/found-bugs.md.
func TestNewGunDrawFillAlwaysTrue(t *testing.T) {
	d := gunTestDeps(t)
	body := d.World.Spawn()
	spec := defs.Gun{Properties: defs.Some(defs.GunProperties{})}

	gid, err := NewGun(d, body, spec, false)
	if err != nil {
		t.Fatalf("NewGun: %v", err)
	}
	g := d.Guns.Get(gid)
	if !g.DrawFill {
		t.Errorf("DrawFill = false, want true")
	}
}

func TestNewGunRegistersOnBody(t *testing.T) {
	d := gunTestDeps(t)
	body := d.World.Spawn()

	gid, err := NewGun(d, body, defs.Gun{}, false)
	if err != nil {
		t.Fatalf("NewGun: %v", err)
	}
	bodyEntity := d.World.Get(body)
	if len(bodyEntity.Guns) != 1 || bodyEntity.Guns[0] != gid {
		t.Errorf("body.Guns = %v, want [%v]", bodyEntity.Guns, gid)
	}
}
