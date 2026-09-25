package entity

import (
	"testing"

	"arrasgo/internal/vmath"
)

func TestZeroHandleIsInvalid(t *testing.T) {
	w := NewWorld(4)
	var zero EntityID
	if zero.Valid() {
		t.Error("zero EntityID must not be valid")
	}
	if w.Alive(zero) {
		t.Error("zero handle must not resolve")
	}
	// The important case: a forgotten field must not alias entity 0.
	first := w.Spawn()
	if first.Index != 0 {
		t.Fatalf("expected first spawn at index 0, got %d", first.Index)
	}
	if w.Get(zero) != nil {
		t.Error("zero handle resolved to the entity at index 0")
	}
}

func TestStaleHandleDoesNotResolve(t *testing.T) {
	w := NewWorld(4)
	a := w.Spawn()
	w.Get(a).Label = "first"
	w.Destroy(a)

	if w.Alive(a) {
		t.Error("destroyed handle still reports alive")
	}
	if w.Get(a) != nil {
		t.Error("destroyed handle still resolves")
	}

	// Reusing the slot must not resurrect the old handle.
	b := w.Spawn()
	if b.Index != a.Index {
		t.Fatalf("expected slot reuse: a=%v b=%v", a, b)
	}
	if b.Gen == a.Gen {
		t.Error("generation was not bumped on reuse")
	}
	if w.Get(a) != nil {
		t.Error("old handle resolves after the slot was reused")
	}
	if e := w.Get(b); e == nil || e.Label != "" {
		t.Error("reused slot was not reset")
	}
}

func TestLiveCount(t *testing.T) {
	w := NewWorld(4)
	ids := make([]EntityID, 0, 10)
	for i := 0; i < 10; i++ {
		ids = append(ids, w.Spawn())
	}
	if w.Live() != 10 {
		t.Fatalf("live = %d, want 10", w.Live())
	}
	for i := 0; i < 4; i++ {
		w.Destroy(ids[i])
	}
	if w.Live() != 6 {
		t.Fatalf("live = %d, want 6 after 4 destroys", w.Live())
	}
	// Double destroy must be a no-op, not a double decrement.
	w.Destroy(ids[0])
	if w.Live() != 6 {
		t.Fatalf("live = %d after redundant destroy, want 6", w.Live())
	}
}

func TestDestroyedEntityLeavesGridSkipped(t *testing.T) {
	w := NewWorld(4)
	a := w.Spawn()
	w.Pos[a.Index] = vmath.Vec2{X: 10, Y: 10}
	w.Size[a.Index] = 5
	w.UpdateAABB(a)
	if w.Boxes[a.Index].Skip {
		t.Fatal("live entity should not be skipped")
	}
	w.Destroy(a)
	if !w.Boxes[a.Index].Skip {
		t.Error("destroyed entity must be skipped by the broad phase")
	}
}

func TestUpdateAABBWritesBoxWhenActive(t *testing.T) {
	w := NewWorld(4)
	a := w.Spawn()
	w.Pos[a.Index] = vmath.Vec2{X: 100, Y: 200}
	w.Size[a.Index] = 10
	w.Flag[a.Index] |= FlagActive
	w.UpdateAABB(a)

	b := w.Boxes[a.Index]
	if b.MinX != 90 || b.MaxX != 110 || b.MinY != 190 || b.MaxY != 210 {
		t.Errorf("box = %+v, want 90/110/190/210", b)
	}
	if b.Skip {
		t.Error("an unbonded entity must not be skipped")
	}
	if !w.Flag[a.Index].Has(FlagInGrid) {
		t.Error("active unbonded entity should be in the grid")
	}
}

func TestUpdateAABBLeavesBoxStaleWhenGated(t *testing.T) {
	w := NewWorld(4)
	a := w.Spawn()

	// First pass while active: the box is written.
	w.Pos[a.Index] = vmath.Vec2{X: 100, Y: 200}
	w.Size[a.Index] = 10
	w.Flag[a.Index] |= FlagActive
	w.UpdateAABB(a)

	// Now bond it and move it far away. The JS would not touch the rectangle.
	w.Flag[a.Index] |= FlagBonded
	w.Pos[a.Index] = vmath.Vec2{X: 5000, Y: 5000}
	w.UpdateAABB(a)

	b := w.Boxes[a.Index]
	if b.MinX != 90 || b.MaxX != 110 || b.MinY != 190 || b.MaxY != 210 {
		t.Errorf("box = %+v, want the stale 90/110/190/210", b)
	}
	if !b.Skip {
		t.Error("Skip tracks the bond live and must be set even when the box is stale")
	}
	if w.Flag[a.Index].Has(FlagInGrid) {
		t.Error("bonded entity must be out of the grid")
	}
}

func BenchmarkSpawnDestroy(b *testing.B) {
	w := NewWorld(1024)
	ids := make([]EntityID, 0, 1024)
	b.ReportAllocs()
	b.ResetTimer()
	for i := 0; i < b.N; i++ {
		ids = ids[:0]
		for j := 0; j < 1024; j++ {
			ids = append(ids, w.Spawn())
		}
		for _, id := range ids {
			w.Destroy(id)
		}
	}
}

func TestEachLiveSkipsFreedSlots(t *testing.T) {
	w := NewWorld(8)
	a := w.Spawn()
	b := w.Spawn()
	c := w.Spawn()
	w.Destroy(b)

	// The stale-handle check on its own would not catch this: rebuilding b's handle
	// from the CURRENT generation produces a handle Alive accepts.
	rebuilt := EntityID{Index: b.Index, Gen: w.gens[b.Index]}
	if !w.Alive(rebuilt) {
		t.Fatal("precondition failed: a rebuilt handle to a freed slot should still " +
			"pass Alive — if it no longer does, this test is checking nothing")
	}

	var got []uint32
	w.EachLive(func(id EntityID, e *Entity) {
		got = append(got, e.WireID)
	})

	want := []uint32{w.Get(a).WireID, w.Get(c).WireID}
	if len(got) != len(want) {
		t.Fatalf("visited %d entities %v, want %d %v", len(got), got, len(want), want)
	}
	for i := range got {
		if got[i] != want[i] {
			t.Errorf("visit %d: wire id %d, want %d", i, got[i], want[i])
		}
	}
	if w.Live() != 2 {
		t.Errorf("Live() = %d, want 2", w.Live())
	}
}

// Reusing a freed slot must mark it live again.
func TestEachLiveSeesReusedSlots(t *testing.T) {
	w := NewWorld(4)
	a := w.Spawn()
	w.Destroy(a)
	b := w.Spawn() // takes a's slot back off the free list

	if b.Index != a.Index {
		t.Skipf("slot was not reused (a=%d b=%d); nothing to check here", a.Index, b.Index)
	}

	n := 0
	w.EachLive(func(id EntityID, e *Entity) {
		n++
		if id != b {
			t.Errorf("visited %v, want the respawned handle %v", id, b)
		}
	})
	if n != 1 {
		t.Errorf("visited %d entities, want 1", n)
	}
}

func TestNextWireIDCountsUpAcrossDestroy(t *testing.T) {
	w := NewWorld(4)
	if got := w.NextWireID(); got != 0 {
		t.Fatalf("fresh world NextWireID = %d, want 0", got)
	}
	a := w.Spawn()
	w.Spawn()
	w.Destroy(a)
	// entitiesIdLog never goes backwards, even though the slot is now free.
	if got := w.NextWireID(); got != 2 {
		t.Errorf("NextWireID = %d after 2 spawns and a destroy, want 2", got)
	}
	w.Spawn()
	if got := w.NextWireID(); got != 3 {
		t.Errorf("NextWireID = %d, want 3", got)
	}
}

func TestIDAtRejectsFreedSlots(t *testing.T) {
	w := NewWorld(4)
	a := w.Spawn()
	b := w.Spawn()

	got, ok := w.IDAt(a.Index)
	if !ok || got != a {
		t.Errorf("IDAt(%d) = %v, %v; want %v, true", a.Index, got, ok, a)
	}

	w.Destroy(b)
	if _, ok := w.IDAt(b.Index); ok {
		t.Error("IDAt returned a handle for a freed slot — this is the trap it exists to close")
	}
	if _, ok := w.IDAt(uint32(w.Len() + 10)); ok {
		t.Error("IDAt accepted an out-of-range index")
	}

	// Reusing the slot makes it valid again, with a new handle.
	c := w.Spawn()
	if c.Index == b.Index {
		got, ok := w.IDAt(c.Index)
		if !ok || got != c {
			t.Errorf("after reuse IDAt(%d) = %v, %v; want %v, true", c.Index, got, ok, c)
		}
		if got == b {
			t.Error("IDAt handed back the old handle for a reused slot")
		}
	}
}
