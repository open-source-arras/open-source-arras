package guns

import (
	"testing"

	"arrasgo/internal/defs"
)

// TestFlattenParentChain verifies PARENT resolution and BODY sub-key merging.
func TestFlattenParentChain(t *testing.T) {
	grandparent := &defs.Definition{
		Body: defs.Some(defs.BodySpec{Density: defs.Some(5.0)}),
	}
	parent := &defs.Definition{
		Parent: defs.TypeList{{Inline: grandparent}},
		Body:   defs.Some(defs.BodySpec{Health: defs.Some(10.0)}),
	}
	child := &defs.Definition{
		Parent: defs.TypeList{{Inline: parent}},
		Body:   defs.Some(defs.BodySpec{Health: defs.Some(20.0), Damage: defs.Some(3.0)}),
	}

	flat, err := flattenBulletType(nil, defs.TypeList{{Inline: child}})
	if err != nil {
		t.Fatalf("flattenBulletType: %v", err)
	}
	if len(flat.Parent) != 0 {
		t.Errorf("flattened result carries PARENT (%v); the whole point is to be PARENT-free", flat.Parent)
	}
	body, ok := flat.Body.Get()
	if !ok {
		t.Fatalf("flattened BODY absent")
	}
	if v, _ := body.Density.Get(); v != 5 {
		t.Errorf("Density = %v, want 5 (inherited from grandparent, untouched by parent/child)", v)
	}
	if v, _ := body.Health.Get(); v != 20 {
		t.Errorf("Health = %v, want 20 (child's own value overwrites parent's 10)", v)
	}
	if v, _ := body.Damage.Get(); v != 3 {
		t.Errorf("Damage = %v, want 3 (only the child sets it)", v)
	}
}

// TestFlattenArrayFormOverwrites verifies sequential overwriting of TYPE array elements.
func TestFlattenArrayFormOverwrites(t *testing.T) {
	first := &defs.Definition{
		Label: defs.Some("first"),
		Body:  defs.Some(defs.BodySpec{Speed: defs.Some(1.0), Range: defs.Some(2.0)}),
	}
	second := &defs.Definition{
		Label: defs.Some("second"),
		Body:  defs.Some(defs.BodySpec{Speed: defs.Some(9.0)}),
	}

	flat, err := flattenBulletType(nil, defs.TypeList{{Inline: first}, {Inline: second}})
	if err != nil {
		t.Fatalf("flattenBulletType: %v", err)
	}
	if v, _ := flat.Label.Get(); v != "second" {
		t.Errorf("Label = %q, want %q (later array element wins wholesale)", v, "second")
	}
	body, _ := flat.Body.Get()
	if v, _ := body.Speed.Get(); v != 9 {
		t.Errorf("Speed = %v, want 9 (second element overwrites first's)", v)
	}
	if v, _ := body.Range.Get(); v != 2 {
		t.Errorf("Range = %v, want 2 (first element's untouched by second)", v)
	}
}

// TestFlattenColorWholesaleOverwrite verifies COLOR is replaced wholesale, not merged.
func TestFlattenColorWholesaleOverwrite(t *testing.T) {
	parent := &defs.Definition{
		Color: defs.ColorSpec{Kind: defs.ColorObject, Obj: defs.ColorObjectSpec{
			HueShift: defs.Some(0.5),
		}},
	}
	child := &defs.Definition{
		Parent: defs.TypeList{{Inline: parent}},
		Color:  defs.ColorSpec{Kind: defs.ColorString, Str: "red"},
	}

	flat, err := flattenBulletType(nil, defs.TypeList{{Inline: child}})
	if err != nil {
		t.Fatalf("flattenBulletType: %v", err)
	}
	if flat.Color.Kind != defs.ColorString || flat.Color.Str != "red" {
		t.Errorf("Color = %+v, want the child's string form alone -- parent's HUE_SHIFT must not survive", flat.Color)
	}
}

// TestSetBulletTypeLabel verifies label composition: master, gun, bullet.
func TestSetBulletTypeLabel(t *testing.T) {
	bullet := &defs.Definition{Label: defs.Some("Bullet")}
	flat, _, _, err := setBulletType(nil, "Tank", "Gun", false, defs.TypeList{{Inline: bullet}})
	if err != nil {
		t.Fatalf("setBulletType: %v", err)
	}
	got, _ := flat.Label.Get()
	if want := "Tank Gun Bullet"; got != want {
		t.Errorf("Label = %q, want %q", got, want)
	}
}

func TestSetBulletTypeLabelNoGunLabel(t *testing.T) {
	bullet := &defs.Definition{Label: defs.Some("Bullet")}
	flat, _, _, err := setBulletType(nil, "Tank", "", false, defs.TypeList{{Inline: bullet}})
	if err != nil {
		t.Fatalf("setBulletType: %v", err)
	}
	got, _ := flat.Label.Get()
	if want := "Tank Bullet"; got != want {
		t.Errorf("Label = %q, want %q", got, want)
	}
}

// TestSetBulletTypeIndependentChildrenSkipsLabel verifies label is skipped for independent children.
func TestSetBulletTypeIndependentChildrenSkipsLabel(t *testing.T) {
	bullet := &defs.Definition{Label: defs.Some("Bullet")}
	flat, _, _, err := setBulletType(nil, "Tank", "Gun", true, defs.TypeList{{Inline: bullet}})
	if err != nil {
		t.Fatalf("setBulletType: %v", err)
	}
	got, _ := flat.Label.Get()
	if want := "Bullet"; got != want {
		t.Errorf("Label = %q, want %q (independentChildren must skip the prefix)", got, want)
	}
}

// TestSetBulletTypeNoEntityLimitDirectOnly verifies TURRETS is checked without PARENT resolution.
func TestSetBulletTypeNoEntityLimitDirectOnly(t *testing.T) {
	turretParent := &defs.Definition{
		Turrets: defs.Some([]defs.Turret{{}}),
	}
	inheritsOnly := &defs.Definition{
		Parent: defs.TypeList{{Inline: turretParent}},
	}
	flat, _, noLimit, err := setBulletType(nil, "", "", false, defs.TypeList{{Inline: inheritsOnly}})
	if err != nil {
		t.Fatalf("setBulletType: %v", err)
	}
	if noLimit {
		t.Errorf("noEntityLimit = true, want false: TURRETS is only inherited via PARENT, gun.js:155-158 does not recurse")
	}
	if _, ok := flat.Turrets.Get(); !ok {
		t.Errorf("flattened result lost the inherited TURRETS -- flattenBulletType is supposed to be fully PARENT-aware")
	}

	direct := &defs.Definition{Turrets: defs.Some([]defs.Turret{{}})}
	_, _, noLimit2, err := setBulletType(nil, "", "", false, defs.TypeList{{Inline: direct}})
	if err != nil {
		t.Fatalf("setBulletType: %v", err)
	}
	if !noLimit2 {
		t.Errorf("noEntityLimit = false, want true: this TYPE element sets TURRETS directly")
	}
}

// TestSetBulletTypeBodyStats verifies bodyStats snapshot from flattened BODY.
func TestSetBulletTypeBodyStats(t *testing.T) {
	bullet := &defs.Definition{Body: defs.Some(defs.BodySpec{Range: defs.Some(0.9)})}
	_, bodyStats, _, err := setBulletType(nil, "", "", false, defs.TypeList{{Inline: bullet}})
	if err != nil {
		t.Fatalf("setBulletType: %v", err)
	}
	if v, ok := bodyStats.Range.Get(); !ok || v != 0.9 {
		t.Errorf("bodyStats.Range = %v (ok=%v), want 0.9", v, ok)
	}
}
