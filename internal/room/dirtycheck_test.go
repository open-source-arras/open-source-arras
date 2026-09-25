package room

import (
	"testing"

	"arrasgo/internal/entity"
	"arrasgo/internal/vmath"
)

func TestLazyRealSize(t *testing.T) {
	for _, n := range []float64{0, 1, 2} {
		if got := lazyRealSize(n); got != 1 {
			t.Errorf("lazyRealSize(%v) = %v, want 1", n, got)
		}
	}
	// n=4: circum = pi/2. sqrt(circum / sin(circum)) = sqrt(pi/2) since sin(pi/2)=1.
	got := lazyRealSize(4)
	want := 1.2533141373155003
	if diff := got - want; diff > 1e-9 || diff < -1e-9 {
		t.Errorf("lazyRealSize(4) = %v, want %v", got, want)
	}
}

func TestProtected_ProtectUnprotectDirtyCheck(t *testing.T) {
	w := entity.NewWorld(8)
	id := w.Spawn()
	w.Pos[id.Index] = vmath.Vec2{X: 0, Y: 0}
	w.Size[id.Index] = 10

	var p Protected
	p.Protect(w, id)

	if !p.DirtyCheck(w, vmath.Vec2{X: 5, Y: 5}, 10) {
		t.Error("DirtyCheck near a protected entity = false, want true")
	}
	if p.DirtyCheck(w, vmath.Vec2{X: 1000, Y: 1000}, 10) {
		t.Error("DirtyCheck far from every protected entity = true, want false")
	}

	p.Unprotect(id)
	if p.DirtyCheck(w, vmath.Vec2{X: 5, Y: 5}, 10) {
		t.Error("DirtyCheck after Unprotect = true, want false")
	}
}

func TestProtected_DirtyCheck_SkipsDeadEntities(t *testing.T) {
	w := entity.NewWorld(8)
	id := w.Spawn()
	w.Pos[id.Index] = vmath.Vec2{X: 0, Y: 0}
	w.Size[id.Index] = 10
	var p Protected
	p.Protect(w, id)
	w.Destroy(id)
	if p.DirtyCheck(w, vmath.Vec2{X: 0, Y: 0}, 10) {
		t.Error("DirtyCheck against a destroyed entity = true, want false")
	}
}
