package wire

import (
	"testing"

	"arrasgo/internal/entity"
	"arrasgo/internal/room"
	"arrasgo/internal/sim"
)

func TestDestroyForgetsExtras(t *testing.T) {
	w := entity.NewWorld(8)
	tbl := room.NewEntityExtraTable()
	l := &Lifegiver{Sim: &sim.Sim{W: w}, Extras: tbl}

	id := w.Spawn()
	e := w.Get(id)
	e.Master = id
	tbl.GetOrCreate(id).IsFood = true
	if !tbl.Get(id).IsFood {
		t.Fatal("the row did not stick before the destroy")
	}

	other := w.Spawn()
	oe := w.Get(other)
	oe.Master = other
	tbl.GetOrCreate(other).IsBoss = true

	l.Destroy(id)

	if got := tbl.Get(id); got != (room.EntityExtras{}) {
		t.Errorf("after Destroy the row is %+v, want it gone", got)
	}
	if !tbl.Get(other).IsBoss {
		t.Error("destroying one entity cleared a different entity's row")
	}
}

// TestDestroyIsSafeWithNoExtrasTable covers the builds the field's comment calls
// out: internal/sim on its own has no room, so Lifegiver.Extras is nil there and
// destroy() must not care.
func TestDestroyIsSafeWithNoExtrasTable(t *testing.T) {
	w := entity.NewWorld(4)
	l := &Lifegiver{Sim: &sim.Sim{W: w}}
	id := w.Spawn()
	w.Get(id).Master = id
	l.Destroy(id) // must not panic
}
