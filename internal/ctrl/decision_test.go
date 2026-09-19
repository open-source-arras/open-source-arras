package ctrl

import (
	"testing"

	"arrasgo/internal/vmath"
)

// TestMerge verifies Merge's per-field rule from loaders/global.js.
func TestMerge(t *testing.T) {
	b := Decision{Target: vmath.Vec2{X: 1, Y: 2}, HasTarget: true}
	Merge(&b, Decision{}, true)
	if b != (Decision{Target: vmath.Vec2{X: 1, Y: 2}, HasTarget: true}) {
		t.Errorf("emptyAHasNoEffect: got %+v", b)
	}

	for _, accepts := range []bool{true, false} {
		b := Decision{}
		a := Decision{
			Target: vmath.Vec2{X: 1, Y: 0}, HasTarget: true,
			Goal: vmath.Vec2{X: 2, Y: 0}, HasGoal: true,
			Fire: true, HasFire: true,
			Main: true, HasMain: true,
			Alt: true, HasAlt: true,
			Power: 0.5, HasPower: true,
		}
		Merge(&b, a, accepts)
		if b != a {
			t.Errorf("fillsEmptyRegardlessOfAcceptsFromTop(accepts=%v): got %+v, want %+v", accepts, b, a)
		}
	}

	b2 := Decision{
		Target: vmath.Vec2{X: 1, Y: 1}, HasTarget: true,
		Goal: vmath.Vec2{X: 2, Y: 2}, HasGoal: true,
		Fire: true, HasFire: true,
		Main: true, HasMain: true,
		Alt: true, HasAlt: true,
		Power: 0.1, HasPower: true,
	}
	want2 := b2
	Merge(&b2, Decision{
		Target: vmath.Vec2{X: 9, Y: 9}, HasTarget: true,
		Goal: vmath.Vec2{X: 9, Y: 9}, HasGoal: true,
		Fire: false, HasFire: true,
		Main: false, HasMain: true,
		Alt: false, HasAlt: true,
		Power: 0.9, HasPower: true,
	}, false)
	if b2 != want2 {
		t.Errorf("nonAcceptingLeavesExistingOpinionAlone: got %+v, want %+v", b2, want2)
	}

	b3 := want2
	a3 := Decision{
		Target: vmath.Vec2{X: 9, Y: 9}, HasTarget: true,
		Goal: vmath.Vec2{X: 9, Y: 9}, HasGoal: true,
		Fire: false, HasFire: true,
		Main: false, HasMain: true,
		Alt: false, HasAlt: true,
		Power: 0.9, HasPower: true,
	}
	Merge(&b3, a3, true)
	if b3 != a3 {
		t.Errorf("acceptingOverwritesEveryField: got %+v, want %+v", b3, a3)
	}

	b4 := Decision{Target: vmath.Vec2{X: 1, Y: 1}, HasTarget: true, Fire: true, HasFire: true}
	Merge(&b4, Decision{Goal: vmath.Vec2{X: 5, Y: 5}, HasGoal: true}, true)
	want4 := Decision{
		Target: vmath.Vec2{X: 1, Y: 1}, HasTarget: true,
		Fire: true, HasFire: true,
		Goal: vmath.Vec2{X: 5, Y: 5}, HasGoal: true,
	}
	if b4 != want4 {
		t.Errorf("mixedOnlyTouchesFieldsAPresents: got %+v, want %+v", b4, want4)
	}
}
