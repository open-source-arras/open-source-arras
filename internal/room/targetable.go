package room

import "arrasgo/internal/entity"

// TargetableSet is loaders/global.js:16.
// Map in JS = ordered slice here to preserve iteration order.
type TargetableSet struct {
	order      []targetableEntry
	at         map[uint32]int
	candidates []entity.EntityID
}

type targetableEntry struct {
	ID   entity.EntityID
	Wire uint32
}

func NewTargetableSet() *TargetableSet {
	return &TargetableSet{at: map[uint32]int{}}
}

func (t *TargetableSet) Set(w *entity.World, id entity.EntityID, targetable bool) {
	e := w.Get(id)
	if e == nil {
		return
	}
	if !targetable {
		t.remove(e.WireID)
		return
	}
	if _, ok := t.at[e.WireID]; ok {
		return
	}
	t.at[e.WireID] = len(t.order)
	t.order = append(t.order, targetableEntry{ID: id, Wire: e.WireID})
}

func (t *TargetableSet) Remove(w *entity.World, id entity.EntityID) {
	if e := w.Get(id); e != nil {
		t.remove(e.WireID)
	}
}

func (t *TargetableSet) remove(wire uint32) {
	i, ok := t.at[wire]
	if !ok {
		return
	}
	delete(t.at, wire)
	t.order = append(t.order[:i], t.order[i+1:]...)
	for j := i; j < len(t.order); j++ {
		t.at[t.order[j].Wire] = j
	}
	t.candidates = t.candidates[:0]
}

func (t *TargetableSet) Candidates() []entity.EntityID {
	if len(t.candidates) != len(t.order) {
		t.candidates = t.candidates[:0]
		for _, ent := range t.order {
			t.candidates = append(t.candidates, ent.ID)
		}
	}
	return t.candidates
}

func (t *TargetableSet) Len() int { return len(t.order) }

func (t *TargetableSet) Compact(w *entity.World) {
	live := t.order[:0]
	for _, ent := range t.order {
		if w.Get(ent.ID) != nil {
			live = append(live, ent)
		}
	}
	if len(live) == len(t.order) {
		return
	}
	t.order = live
	clear(t.at)
	for i, ent := range t.order {
		t.at[ent.Wire] = i
	}
	t.candidates = t.candidates[:0]
}
