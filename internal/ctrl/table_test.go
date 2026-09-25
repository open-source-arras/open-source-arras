package ctrl

import (
	"testing"

	"arrasgo/internal/config"
	"arrasgo/internal/entity"
	"arrasgo/internal/vmath"
)

func TestTableAddDedup(t *testing.T) {
	w := newWorld(4)
	w.Tuning = &config.Tuning{}
	id, _ := spawnAt(w, 0, 0)
	ctx := baseContext(w, id, nil)
	tbl := NewTable(8)

	existing := tbl.Add(ctx, nil, []Spec{{Kind: KindDoNothing}})
	if len(existing) != 1 || tbl.Kind(existing[0]) != KindDoNothing {
		t.Fatalf("freshAdd: got %v", existing)
	}

	existing = tbl.Add(ctx, existing, []Spec{{Kind: KindAlwaysFire}})
	if len(existing) != 2 || tbl.Kind(existing[1]) != KindAlwaysFire {
		t.Fatalf("differentKindAppends: got %v", existing)
	}

	// Adding another controller of the same kind as an existing one replaces
	// that slot in place, rather than appending a duplicate. This honors
	// addController's dedup-by-kind contract (entity.js:133-146).
	before := existing[0]
	existing = tbl.Add(ctx, existing, []Spec{{Kind: KindDoNothing}})
	if len(existing) != 2 {
		t.Fatalf("sameKindReplacesInPlace: got %v, want still 2 slots", existing)
	}
	if existing[0] != before {
		t.Errorf("sameKindReplacesInPlace: slot handle changed, got %v, want %v", existing[0], before)
	}
	if tbl.Kind(existing[0]) != KindDoNothing {
		t.Errorf("sameKindReplacesInPlace: Kind = %v, want KindDoNothing", tbl.Kind(existing[0]))
	}
}

// TestTableAddSpliceSkipBug reproduces the splice-without-index-adjustment bug.
func TestTableAddSpliceSkipBug(t *testing.T) {
	w := newWorld(4)
	w.Tuning = &config.Tuning{}
	id, _ := spawnAt(w, 0, 0)
	ctx := baseContext(w, id, nil)
	tbl := NewTable(8)

	existing := tbl.Add(ctx, nil, []Spec{{Kind: KindSpin, Opts: Opts{HasSpeed: true, Speed: 0.1}}})
	if len(existing) != 1 {
		t.Fatalf("setup: got %v", existing)
	}

	existing = tbl.Add(ctx, existing, []Spec{
		{Kind: KindSpin, Opts: Opts{HasSpeed: true, Speed: 0.2}},
		{Kind: KindSpin, Opts: Opts{HasSpeed: true, Speed: 0.3}},
	})

	if len(existing) != 2 {
		t.Fatalf("spliceSkipBug: got %d slots, want 2 (the bug's signature -- a clean dedup would leave exactly 1)", len(existing))
	}
	if tbl.Kind(existing[0]) != KindSpin || tbl.Kind(existing[1]) != KindSpin {
		t.Fatalf("spliceSkipBug: kinds = %v, %v, want both KindSpin", tbl.Kind(existing[0]), tbl.Kind(existing[1]))
	}
	if tbl.State(existing[0]).SpinSpeed != 0.2 {
		t.Errorf("spliceSkipBug: slot 0 speed = %v, want 0.2 (the first new spec, which replaced the original in place)", tbl.State(existing[0]).SpinSpeed)
	}
	if tbl.State(existing[1]).SpinSpeed != 0.3 {
		t.Errorf("spliceSkipBug: slot 1 speed = %v, want 0.3 (the second new spec, which the bug appended instead of matching)", tbl.State(existing[1]).SpinSpeed)
	}
}

func TestTableFindKind(t *testing.T) {
	tbl := &Table{kinds: []Kind{KindWhirlwind, KindOrbit}, states: []State{{WhirlDist: 5}, {}}}
	ids := []entity.ControllerID{0, 1}
	if id, ok := tbl.FindKind(ids, KindOrbit); !ok || id != 1 {
		t.Errorf("found: got (%v,%v), want (1,true)", id, ok)
	}
	if _, ok := tbl.FindKind(ids, KindSnake); ok {
		t.Error("notFound: expected false")
	}
	if _, ok := tbl.FindKind(nil, KindOrbit); ok {
		t.Error("emptyList: expected false")
	}
}

func TestTableKindOutOfRange(t *testing.T) {
	tbl := NewTable(4)
	if got := tbl.Kind(entity.ControllerID(99)); got != KindNone {
		t.Errorf("outOfRange: got %v, want KindNone", got)
	}
}

func TestTableThinkDispatch(t *testing.T) {
	w := newWorld(4)
	w.Tuning = &config.Tuning{}
	id, _ := spawnAt(w, 5, 5)
	ctx := baseContext(w, id, nil)
	tbl := NewTable(4)
	existing := tbl.Add(ctx, nil, []Spec{{Kind: KindAlwaysFire}, {Kind: KindDoNothing}})

	got := tbl.Think(ctx, existing[0], Decision{})
	if got != (Decision{Fire: true, HasFire: true}) {
		t.Errorf("dispatchesToAlwaysFire: got %+v", got)
	}
	got2 := tbl.Think(ctx, existing[1], Decision{})
	want2 := Decision{Goal: vmath.Vec2{X: 5, Y: 5}, HasGoal: true, Main: false, HasMain: true, Alt: false, HasAlt: true, Fire: false, HasFire: true}
	if got2 != want2 {
		t.Errorf("dispatchesToDoNothing: got %+v, want %+v", got2, want2)
	}

	if got3 := tbl.Think(ctx, entity.ControllerID(999), Decision{}); got3 != (Decision{}) {
		t.Errorf("outOfRangeHandle: got %+v, want zero", got3)
	}
}
