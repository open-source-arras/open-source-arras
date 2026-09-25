package guns

import (
	"testing"

	"arrasgo/internal/defs"
	"arrasgo/internal/entity"
)

func spawnTestEntity(t *testing.T, d Deps) (entity.EntityID, *entity.Entity) {
	t.Helper()
	id := d.World.Spawn()
	return id, d.World.Get(id)
}

// TestApplyBulletFieldsRejectsParent verifies PARENT is rejected.
func TestApplyBulletFieldsRejectsParent(t *testing.T) {
	d := turretTestDeps(t, 4)
	id, e := spawnTestEntity(t, d)
	def := &defs.Definition{Parent: defs.TypeList{{Inline: &defs.Definition{}}}}

	if err := applyBulletFields(d, e, id, def, false); err == nil {
		t.Errorf("applyBulletFields accepted a definition with PARENT set")
	}
}

// TestApplyBulletFieldsBasicFields verifies plain Opt-gated field assignments.
func TestApplyBulletFieldsBasicFields(t *testing.T) {
	d := turretTestDeps(t, 4)
	id, e := spawnTestEntity(t, d)
	def := &defs.Definition{
		Name:     defs.Some("Bullet"),
		Label:    defs.Some("A Bullet"),
		Angle:    defs.Some(1.5),
		WallType: defs.Some(3.0),
	}

	if err := applyBulletFields(d, e, id, def, false); err != nil {
		t.Fatalf("applyBulletFields: %v", err)
	}
	if e.Name != "Bullet" {
		t.Errorf("Name = %q, want %q", e.Name, "Bullet")
	}
	if e.Label != "A Bullet" {
		t.Errorf("Label = %q, want %q", e.Label, "A Bullet")
	}
	if e.Angle != 1.5 {
		t.Errorf("Angle = %v, want 1.5", e.Angle)
	}
	if e.Walltype != 3 {
		t.Errorf("Walltype = %v, want 3", e.Walltype)
	}
}

// TestApplyBulletFieldsAbsentFieldsUntouched verifies absent fields are not applied.
func TestApplyBulletFieldsAbsentFieldsUntouched(t *testing.T) {
	d := turretTestDeps(t, 4)
	id, e := spawnTestEntity(t, d)
	e.Name = "PreExisting"
	e.Angle = 2.5

	if err := applyBulletFields(d, e, id, &defs.Definition{}, false); err != nil {
		t.Fatalf("applyBulletFields: %v", err)
	}
	if e.Name != "PreExisting" {
		t.Errorf("Name = %q, an empty definition must not touch it", e.Name)
	}
	if e.Angle != 2.5 {
		t.Errorf("Angle = %v, an empty definition must not touch it", e.Angle)
	}
}

// TestApplyBulletFieldsNoCollisionsIsTruthyGated verifies truthy-gating of NO_COLLISIONS.
func TestApplyBulletFieldsNoCollisionsIsTruthyGated(t *testing.T) {
	d := turretTestDeps(t, 4)
	id, e := spawnTestEntity(t, d)

	if err := applyBulletFields(d, e, id, &defs.Definition{NoCollisions: defs.Some(true)}, false); err != nil {
		t.Fatalf("applyBulletFields: %v", err)
	}
	if !e.Settings.NoCollisions {
		t.Errorf("Settings.NoCollisions = false, want true")
	}
	if !d.World.Flag[id.Index].Has(entity.FlagNoCollisions) {
		t.Errorf("World.Flag does not have FlagNoCollisions set")
	}

	if err := applyBulletFields(d, e, id, &defs.Definition{NoCollisions: defs.Some(false)}, false); err != nil {
		t.Fatalf("applyBulletFields (second pass): %v", err)
	}
	if !e.Settings.NoCollisions {
		t.Errorf("Settings.NoCollisions was cleared by an explicit false; the JS check is truthy, not != null")
	}
}

// TestApplyBulletFieldsEntityOnlyFieldsGatedByNoEntityLimit verifies gating of entity-only fields.
func TestApplyBulletFieldsEntityOnlyFieldsGatedByNoEntityLimit(t *testing.T) {
	def := &defs.Definition{
		MaxChildren: defs.Some(5.0),
		MaxBullets:  defs.Some(3.0),
		LevelCap:    defs.Some(10.0),
	}

	d := turretTestDeps(t, 4)
	id, e := spawnTestEntity(t, d)
	if err := applyBulletFields(d, e, id, def, false); err != nil {
		t.Fatalf("applyBulletFields (noEntityLimit=false): %v", err)
	}
	if e.MaxChildren != 0 {
		t.Errorf("MaxChildren = %v, want 0 (noEntityLimit=false must gate it off)", e.MaxChildren)
	}
	if e.HasMaxBullets {
		t.Errorf("HasMaxBullets = true, want false (noEntityLimit=false must gate it off)")
	}
	if e.HasLevelCap {
		t.Errorf("HasLevelCap = true, want false (noEntityLimit=false must gate it off)")
	}

	d2 := turretTestDeps(t, 4)
	id2, e2 := spawnTestEntity(t, d2)
	if err := applyBulletFields(d2, e2, id2, def, true); err != nil {
		t.Fatalf("applyBulletFields (noEntityLimit=true): %v", err)
	}
	if e2.MaxChildren != 5 {
		t.Errorf("MaxChildren = %v, want 5 (noEntityLimit=true)", e2.MaxChildren)
	}
	if !e2.HasMaxBullets || e2.MaxBullets != 3 {
		t.Errorf("MaxBullets = %v (Has=%v), want 3 (Has=true)", e2.MaxBullets, e2.HasMaxBullets)
	}
	if !e2.HasLevelCap || e2.LevelCap != 10 {
		t.Errorf("LevelCap = %v (Has=%v), want 10 (Has=true)", e2.LevelCap, e2.HasLevelCap)
	}
}

// TestApplyBulletFieldsSizeLatchesCoreSize verifies CoreSize latches only the first SIZE.
func TestApplyBulletFieldsSizeLatchesCoreSize(t *testing.T) {
	d := turretTestDeps(t, 4)
	id, e := spawnTestEntity(t, d)
	e.Squiggle = 1

	if err := applyBulletFields(d, e, id, &defs.Definition{Size: defs.Some(10.0)}, false); err != nil {
		t.Fatalf("applyBulletFields (first SIZE): %v", err)
	}
	if e.SIZE != 10 || e.CoreSize != 10 {
		t.Fatalf("after first SIZE: SIZE=%v CoreSize=%v, want both 10", e.SIZE, e.CoreSize)
	}

	if err := applyBulletFields(d, e, id, &defs.Definition{Size: defs.Some(20.0)}, false); err != nil {
		t.Fatalf("applyBulletFields (second SIZE): %v", err)
	}
	if e.SIZE != 20 {
		t.Errorf("SIZE = %v, want 20 (SIZE itself always updates)", e.SIZE)
	}
	if e.CoreSize != 10 {
		t.Errorf("CoreSize = %v, want 10 (CoreSize latches the first SIZE only)", e.CoreSize)
	}
}

// TestApplyBulletFieldsTurretsRefetchesEntity verifies pointer safety after turret spawning.
func TestApplyBulletFieldsTurretsRefetchesEntity(t *testing.T) {
	d := turretTestDeps(t, 1)
	id, e := spawnTestEntity(t, d)
	e.Master = id

	def := &defs.Definition{Turrets: defs.Some([]defs.Turret{{}, {}, {}})}
	if err := applyBulletFields(d, e, id, def, true); err != nil {
		t.Fatalf("applyBulletFields: %v", err)
	}
	live := d.World.Get(id)
	if len(live.Turrets) != 3 {
		t.Fatalf("len(Turrets) = %d, want 3", len(live.Turrets))
	}
}
