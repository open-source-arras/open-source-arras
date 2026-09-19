package room

import (
	"testing"

	"arrasgo/internal/entity"
)

func TestEntityExtraTable(t *testing.T) {
	tbl := NewEntityExtraTable()
	id := entity.EntityID{Index: 1, Gen: 1}
	other := entity.EntityID{Index: 2, Gen: 1}

	if got := tbl.Get(id); got != (EntityExtras{}) {
		t.Errorf("Get on an empty table = %+v, want zero value", got)
	}

	tbl.GetOrCreate(id).IsBoss = true
	if !tbl.Get(id).IsBoss {
		t.Error("IsBoss did not stick after GetOrCreate")
	}
	if tbl.Get(other).IsBoss {
		t.Error("a different id's IsBoss leaked true")
	}

	tbl.Delete(id)
	if got := tbl.Get(id); got != (EntityExtras{}) {
		t.Errorf("Get after Delete = %+v, want zero value", got)
	}
}
