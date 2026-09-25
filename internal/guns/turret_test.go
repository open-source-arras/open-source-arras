package guns

import (
	"strings"
	"testing"

	"arrasgo/internal/config"
	"arrasgo/internal/defs"
	"arrasgo/internal/entity"
	"arrasgo/internal/jsutil"
)

func turretTestDeps(t *testing.T, capacity int) Deps {
	t.Helper()
	return Deps{
		World:  entity.NewWorld(capacity),
		Guns:   NewTable(4),
		Defs:   minimalDefs(t),
		Tuning: &config.Tuning{RunSpeed: 1.5, GameSpeed: 1, SkillCap: 5, GlassHealthFactor: 1},
		Rand:   jsutil.NewRand(1),
	}
}

// Fresh turret copies bond's skill, team, and prefixes label.
func TestNewTurretBinding(t *testing.T) {
	d := turretTestDeps(t, 8)
	bond := d.World.Spawn()
	bondEntity := d.World.Get(bond)
	bondEntity.Label = "Tank"
	bondEntity.Team = 7
	bondEntity.Skill = entity.Skill{Spd: 1.5}
	master := d.World.Spawn()

	id, err := NewTurret(d, defs.TurretPosition{}, bond, master)
	if err != nil {
		t.Fatalf("NewTurret: %v", err)
	}
	turret := d.World.Get(id)
	if turret.Team != 7 {
		t.Errorf("Team = %d, want 7 (copied from bond)", turret.Team)
	}
	if turret.Skill.Spd != 1.5 {
		t.Errorf("Skill.Spd = %v, want 1.5 (copied from bond)", turret.Skill.Spd)
	}
	if !strings.HasPrefix(turret.Label, "Tank ") {
		t.Errorf("Label = %q, want it prefixed with %q", turret.Label, "Tank ")
	}
	if turret.Source != bond {
		t.Errorf("Source = %v, want bond %v", turret.Source, bond)
	}
	if turret.Master != master {
		t.Errorf("Master = %v, want %v (the caller's own master, not bond -- see NewTurret's own doc comment)", turret.Master, master)
	}
}

// Position defaults to SIZE 10, ARC 360.
func TestNewTurretPositionDefaults(t *testing.T) {
	d := turretTestDeps(t, 4)
	bond := d.World.Spawn()
	master := d.World.Spawn()

	id, err := NewTurret(d, defs.TurretPosition{}, bond, master)
	if err != nil {
		t.Fatalf("NewTurret: %v", err)
	}
	turret := d.World.Get(id)
	if want := 10.0 / 20; turret.Bound.Size != want {
		t.Errorf("Bound.Size = %v, want %v (SIZE 10 default / 20)", turret.Bound.Size, want)
	}
	if want := 360 * degToRad; turret.Bound.Arc != want {
		t.Errorf("Bound.Arc = %v, want %v (ARC 360 default)", turret.Bound.Arc, want)
	}
}

// Later TYPE elements overwrite earlier ones.
func TestSpawnTurretsAppliesTypeInOrder(t *testing.T) {
	d := turretTestDeps(t, 8)
	bond := d.World.Spawn()
	d.World.Get(bond).Master = bond // SpawnTurrets reads bondEntity.Master and must find a valid one

	first := &defs.Definition{Label: defs.Some("first")}
	second := &defs.Definition{Label: defs.Some("second")}
	specs := []defs.Turret{{
		Type: defs.TypeList{{Inline: first}, {Inline: second}},
	}}

	if err := SpawnTurrets(d, bond, specs); err != nil {
		t.Fatalf("SpawnTurrets: %v", err)
	}
	bondEntity := d.World.Get(bond)
	if len(bondEntity.Turrets) != 1 {
		t.Fatalf("len(Turrets) = %d, want 1", len(bondEntity.Turrets))
	}
	turret := d.World.Get(bondEntity.Turrets[0])
	if turret.Label != "second" {
		t.Errorf("Label = %q, want %q (second TYPE element overwrites the first)", turret.Label, "second")
	}
}

// VULNERABLE sets CollidingBond. DangerValue stays zero.
func TestSpawnTurretsVulnerableAndDanger(t *testing.T) {
	d := turretTestDeps(t, 8)
	bond := d.World.Spawn()
	d.World.Get(bond).Master = bond

	withDanger := &defs.Definition{Danger: defs.Some(99.0)}
	specs := []defs.Turret{{
		Vulnerable: defs.Some(true),
		Type:       defs.TypeList{{Inline: withDanger}},
	}}

	if err := SpawnTurrets(d, bond, specs); err != nil {
		t.Fatalf("SpawnTurrets: %v", err)
	}
	bondEntity := d.World.Get(bond)
	turret := d.World.Get(bondEntity.Turrets[0])
	if !turret.CollidingBond {
		t.Errorf("CollidingBond = false, want true (VULNERABLE:true)")
	}
	if turret.DangerValue != 0 {
		t.Errorf("DangerValue = %v, want 0 (unreachable via any TYPE element, see comment)", turret.DangerValue)
	}
}

// Calling SpawnTurrets twice destroys the first batch.
func TestSpawnTurretsReplacesExisting(t *testing.T) {
	d := turretTestDeps(t, 8)
	bond := d.World.Spawn()
	d.World.Get(bond).Master = bond

	if err := SpawnTurrets(d, bond, []defs.Turret{{}}); err != nil {
		t.Fatalf("first SpawnTurrets: %v", err)
	}
	firstBatch := append([]entity.EntityID{}, d.World.Get(bond).Turrets...)
	if len(firstBatch) != 1 {
		t.Fatalf("first batch len = %d, want 1", len(firstBatch))
	}

	if err := SpawnTurrets(d, bond, []defs.Turret{{}, {}}); err != nil {
		t.Fatalf("second SpawnTurrets: %v", err)
	}
	bondEntity := d.World.Get(bond)
	if len(bondEntity.Turrets) != 2 {
		t.Fatalf("second batch len = %d, want 2", len(bondEntity.Turrets))
	}
	for _, id := range bondEntity.Turrets {
		if id == firstBatch[0] {
			t.Errorf("second batch reused the first turret's id %v; it should have been destroyed and left behind", id)
		}
	}
	if d.World.Alive(firstBatch[0]) {
		t.Errorf("first turret %v is still alive after being replaced", firstBatch[0])
	}
}

// SpawnTurrets survives slab reallocation during mass spawning.
func TestSpawnTurretsSurvivesSlabGrowth(t *testing.T) {
	d := turretTestDeps(t, 1) // deliberately tiny
	bond := d.World.Spawn()
	bondEntity := d.World.Get(bond)
	bondEntity.Label = "Tank"
	bondEntity.Team = 3
	bondEntity.Master = bond

	const n = 50
	specs := make([]defs.Turret, n)
	if err := SpawnTurrets(d, bond, specs); err != nil {
		t.Fatalf("SpawnTurrets: %v", err)
	}
	bondEntity = d.World.Get(bond)
	if len(bondEntity.Turrets) != n {
		t.Fatalf("len(Turrets) = %d, want %d", len(bondEntity.Turrets), n)
	}
	for i, id := range bondEntity.Turrets {
		turret := d.World.Get(id)
		if turret == nil {
			t.Fatalf("turret %d (id %v) is not alive", i, id)
		}
		if turret.Team != 3 {
			t.Errorf("turret %d Team = %d, want 3", i, turret.Team)
		}
		if turret.Source != bond {
			t.Errorf("turret %d Source = %v, want bond %v", i, turret.Source, bond)
		}
	}
}

// Killing a turret kills all bound turrets recursively.
func TestDestroyTurretRecursive(t *testing.T) {
	d := turretTestDeps(t, 8)
	bond := d.World.Spawn()
	d.World.Get(bond).Master = bond

	if err := SpawnTurrets(d, bond, []defs.Turret{{}}); err != nil {
		t.Fatalf("SpawnTurrets: %v", err)
	}
	parent := d.World.Get(bond).Turrets[0]
	if err := SpawnTurrets(d, parent, []defs.Turret{{}}); err != nil {
		t.Fatalf("SpawnTurrets on turret: %v", err)
	}
	child := d.World.Get(parent).Turrets[0]

	DestroyTurret(d, parent)

	if d.World.Alive(parent) {
		t.Errorf("parent turret still alive after DestroyTurret")
	}
	if d.World.Alive(child) {
		t.Errorf("child turret still alive after DestroyTurret(parent) -- destroy must recurse")
	}
}
