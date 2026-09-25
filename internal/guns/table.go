package guns

import "arrasgo/internal/entity"

// Table stores guns by entity.GunID, allocating only pointers.
type Table struct {
	guns  []*Gun
	alive []bool
}

func NewTable(capacity int) *Table {
	return &Table{
		guns:  make([]*Gun, 0, capacity),
		alive: make([]bool, 0, capacity),
	}
}

func (t *Table) Len() int { return len(t.guns) }

func (t *Table) insert(g Gun) entity.GunID {
	id := entity.GunID(len(t.guns) + 1)
	g.ID = id
	t.guns = append(t.guns, &g)
	t.alive = append(t.alive, true)
	return id
}

// Get returns the gun or nil if id is invalid or destroyed.
func (t *Table) Get(id entity.GunID) *Gun {
	if id == 0 || int(id) > len(t.guns) || !t.alive[id-1] {
		return nil
	}
	return t.guns[id-1]
}

func (t *Table) Alive(id entity.GunID) bool {
	return id != 0 && int(id) <= len(t.alive) && t.alive[id-1]
}

// Destroy marks id dead. Slots are never reused.
func (t *Table) Destroy(id entity.GunID) {
	if id == 0 || int(id) > len(t.alive) {
		return
	}
	t.alive[id-1] = false
}
