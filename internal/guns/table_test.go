package guns

import "testing"

// TestTablePointerStability proves growing the table never invalidates *Gun pointers.
func TestTablePointerStability(t *testing.T) {
	tbl := NewTable(1) // deliberately tiny: the first few inserts must grow it
	first := tbl.insert(Gun{Label: "first"})
	firstPtr := tbl.Get(first)
	if firstPtr == nil {
		t.Fatalf("Get(first) = nil right after insert")
	}

	var ids []int
	for i := 0; i < 64; i++ {
		id := tbl.insert(Gun{Label: "filler"})
		ids = append(ids, int(id))
	}

	if got := tbl.Get(first); got != firstPtr {
		t.Fatalf("Get(first) returned a different pointer after growth: %p vs original %p -- table.guns must never reallocate a *Gun out from under a caller", got, firstPtr)
	}
	if firstPtr.Label != "first" {
		t.Fatalf("firstPtr.Label = %q, want %q -- the pointer survived but its memory did not", firstPtr.Label, "first")
	}
	_ = ids
}

// TestTableGetBounds tests Get and Alive boundary conditions.
func TestTableGetBounds(t *testing.T) {
	tbl := NewTable(4)
	if tbl.Get(0) != nil {
		t.Errorf("Get(0) is non-nil; GunID 0 must always be invalid")
	}
	if tbl.Alive(0) {
		t.Errorf("Alive(0) is true; GunID 0 must always be invalid")
	}
	id := tbl.insert(Gun{})
	if tbl.Get(id+100) != nil {
		t.Errorf("Get of an out-of-range id is non-nil")
	}
	if tbl.Alive(id + 100) {
		t.Errorf("Alive of an out-of-range id is true")
	}
}

// TestTableDestroyIsolated proves Destroy marks a slot dead and never reuses it.
func TestTableDestroyIsolated(t *testing.T) {
	tbl := NewTable(4)
	a := tbl.insert(Gun{Label: "a"})
	b := tbl.insert(Gun{Label: "b"})

	tbl.Destroy(a)

	if tbl.Get(a) != nil {
		t.Errorf("Get(a) is non-nil after Destroy(a)")
	}
	if tbl.Alive(a) {
		t.Errorf("Alive(a) is true after Destroy(a)")
	}
	if got := tbl.Get(b); got == nil || got.Label != "b" {
		t.Errorf("Destroy(a) disturbed b: Get(b) = %+v", got)
	}

	c := tbl.insert(Gun{Label: "c"})
	if c == a {
		t.Errorf("insert reused a's freed slot (id %d) -- table.go's doc comment says slots are never recycled", a)
	}
}
