package guns

import (
	"testing"

	"arrasgo/internal/defs"
	"arrasgo/internal/entity"
)

// TestNewPropDefaults verifies NewProp sets default fields correctly.
func TestNewPropDefaults(t *testing.T) {
	d := turretTestDeps(t, 4)
	bond := d.World.Spawn()

	id, err := NewProp(d, defs.PropPosition{}, bond)
	if err != nil {
		t.Fatalf("NewProp: %v", err)
	}
	prop := d.World.Get(id)
	if prop.Borderless {
		t.Errorf("Borderless = true, want false")
	}
	if !prop.DrawFill {
		t.Errorf("DrawFill = false, want true")
	}
	if prop.Bond != bond {
		t.Errorf("Bond = %v, want %v", prop.Bond, bond)
	}
	if !prop.Settings.MirrorMasterAngle {
		t.Errorf("Settings.MirrorMasterAngle = false, want true (propEntity.js:43, unconditional)")
	}
	bondEntity := d.World.Get(bond)
	if len(bondEntity.Props) != 1 || bondEntity.Props[0] != id {
		t.Errorf("bond.Props = %v, want [%v]", bondEntity.Props, id)
	}
}

// TestNewPropPositionDefaults verifies SIZE and ARC defaults.
func TestNewPropPositionDefaults(t *testing.T) {
	d := turretTestDeps(t, 4)
	bond := d.World.Spawn()

	id, err := NewProp(d, defs.PropPosition{}, bond)
	if err != nil {
		t.Fatalf("NewProp: %v", err)
	}
	prop := d.World.Get(id)
	if want := 10.0 / 20; prop.Bound.Size != want {
		t.Errorf("Bound.Size = %v, want %v", prop.Bound.Size, want)
	}
	if prop.Bound.Arc != 0 {
		t.Errorf("Bound.Arc = %v, want 0 (PropPosition has no ARC field)", prop.Bound.Arc)
	}
}

// TestSpawnPropsAppliesTypeAndAngle verifies TYPE and ANGLE application order.
func TestSpawnPropsAppliesTypeAndAngle(t *testing.T) {
	d := turretTestDeps(t, 8)
	bond := d.World.Spawn()

	first := &defs.Definition{Borderless: defs.Some(true)}
	second := &defs.Definition{DrawFill: defs.Some(false)}
	specs := []defs.Prop{{
		Type:  defs.TypeList{{Inline: first}, {Inline: second}},
		Angle: defs.Some(1.25),
	}}

	if err := SpawnProps(d, bond, specs); err != nil {
		t.Fatalf("SpawnProps: %v", err)
	}
	bondEntity := d.World.Get(bond)
	if len(bondEntity.Props) != 1 {
		t.Fatalf("len(Props) = %d, want 1", len(bondEntity.Props))
	}
	prop := d.World.Get(bondEntity.Props[0])
	if !prop.Borderless {
		t.Errorf("Borderless = false, want true (first TYPE element)")
	}
	if prop.DrawFill {
		t.Errorf("DrawFill = true, want false (second TYPE element)")
	}
	if prop.Angle != 1.25 {
		t.Errorf("Angle = %v, want 1.25 (PROPS[].ANGLE applied after TYPE)", prop.Angle)
	}
}

// TestSpawnPropsParentChain verifies PARENT recursion applies ancestors first.
func TestSpawnPropsParentChain(t *testing.T) {
	d := turretTestDeps(t, 8)
	bond := d.World.Spawn()

	parent := &defs.Definition{Borderless: defs.Some(true)}
	child := &defs.Definition{
		Parent:   defs.TypeList{{Inline: parent}},
		DrawFill: defs.Some(false),
	}
	specs := []defs.Prop{{Type: defs.TypeList{{Inline: child}}}}

	if err := SpawnProps(d, bond, specs); err != nil {
		t.Fatalf("SpawnProps: %v", err)
	}
	prop := d.World.Get(d.World.Get(bond).Props[0])
	if !prop.Borderless {
		t.Errorf("Borderless = false, want true (inherited from PARENT)")
	}
	if prop.DrawFill {
		t.Errorf("DrawFill = true, want false (child's own field)")
	}
}

// TestSpawnPropsSurvivesSlabGrowth verifies props survive World reallocation.
func TestSpawnPropsSurvivesSlabGrowth(t *testing.T) {
	d := turretTestDeps(t, 1)
	bond := d.World.Spawn()

	const n = 50
	specs := make([]defs.Prop, n)
	if err := SpawnProps(d, bond, specs); err != nil {
		t.Fatalf("SpawnProps: %v", err)
	}
	bondEntity := d.World.Get(bond)
	if len(bondEntity.Props) != n {
		t.Fatalf("len(Props) = %d, want %d", len(bondEntity.Props), n)
	}
	seen := make(map[entity.EntityID]bool, n)
	for i, id := range bondEntity.Props {
		if seen[id] {
			t.Fatalf("prop %d (id %v) duplicates an earlier id", i, id)
		}
		seen[id] = true
		if d.World.Get(id) == nil {
			t.Fatalf("prop %d (id %v) is not alive", i, id)
		}
	}
}
