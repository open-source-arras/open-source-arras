package ctrl

import (
	"testing"

	"arrasgo/internal/entity"
	"arrasgo/internal/jsutil"
	"arrasgo/internal/vmath"
)

func almostEqual(got, want, tol float64) bool {
	d := got - want
	if d < 0 {
		d = -d
	}
	return d <= tol
}

func assertClose(t *testing.T, label string, got float64, want float64, tol float64) {
	t.Helper()
	if !almostEqual(float64(got), want, tol) {
		t.Errorf("%s = %v, want %v", label, got, want)
	}
}

func assertClose64(t *testing.T, label string, got, want, tol float64) {
	t.Helper()
	if !almostEqual(got, want, tol) {
		t.Errorf("%s = %v, want %v", label, got, want)
	}
}

func assertVecClose(t *testing.T, label string, got vmath.Vec2, wantX, wantY float64, tol float64) {
	t.Helper()
	assertClose(t, label+".X", got.X, wantX, tol)
	assertClose(t, label+".Y", got.Y, wantY, tol)
}

func newWorld(capacity int) *entity.World {
	return entity.NewWorld(capacity)
}

func spawnAt(w *entity.World, x, y float64) (entity.EntityID, *entity.Entity) {
	id := w.Spawn()
	w.Pos[id.Index] = vmath.Vec2{X: x, Y: y}
	return id, w.Get(id)
}

func baseContext(w *entity.World, body entity.EntityID, r *jsutil.Rand) *Context {
	return &Context{World: w, Body: body, Rand: r, RunSpeed: 1.5}
}
