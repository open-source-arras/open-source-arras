package room

import (
	"testing"

	"arrasgo/internal/entity"
)

func findNewID(before map[entity.EntityID]bool, after []entity.EntityID) (entity.EntityID, bool) {
	for _, id := range after {
		if !before[id] {
			return id, true
		}
	}
	return entity.EntityID{}, false
}

func idSet(ids ...entity.EntityID) map[entity.EntityID]bool {
	m := make(map[entity.EntityID]bool, len(ids))
	for _, id := range ids {
		m[id] = true
	}
	return m
}

func dominatorIDs(slots []dominatorSlot) []entity.EntityID {
	ids := make([]entity.EntityID, len(slots))
	for i, s := range slots {
		ids[i] = s.id
	}
	return ids
}

func TestDomination_DeathFallsBackToRoomWithNoKillers(t *testing.T) {
	room := newGamemodeTestRoom(t, 31, "domination")
	mgr := NewGamemodeManager(room)
	if err := mgr.Start(); err != nil {
		t.Fatalf("Start: %v", err)
	}
	dom := mgr.Domination
	if len(dom.slots) == 0 {
		t.Skip("domination's room dump has no Dominators-tagged tile")
	}
	target := dom.slots[0]
	if e := room.World.Get(target.id); e == nil || e.Team != TeamEnemies {
		t.Fatalf("a freshly spawned dominator should be TEAM_ENEMIES-owned, got %+v", e)
	}

	before := idSet(dominatorIDs(dom.slots)...)
	room.World.Kill(target.id)
	if err := dom.Poll(room); err != nil {
		t.Fatalf("Poll: %v", err)
	}
	newID, ok := findNewID(before, dominatorIDs(dom.slots))
	if !ok {
		t.Fatal("no replacement dominator spawned")
	}
	re := room.World.Get(newID)
	if re == nil {
		t.Fatal("replacement dominator id does not resolve")
	}
	if re.Team != TeamRoom {
		t.Errorf("with an empty CollisionArray, the replacement should fall back to TEAM_ROOM, got %d", re.Team)
	}
	before2 := idSet(dominatorIDs(dom.slots)...)
	room.World.Kill(newID)
	if err := dom.Poll(room); err != nil {
		t.Fatalf("second Poll: %v", err)
	}
	newID2, ok := findNewID(before2, dominatorIDs(dom.slots))
	if !ok {
		t.Fatal("no replacement dominator spawned on the second death")
	}
	rce := room.World.Get(newID2)
	if rce == nil || rce.Team != TeamEnemies {
		t.Errorf("a contested (non-TEAM_ENEMIES) dominator dying should always fall back to TEAM_ENEMIES, got %+v", rce)
	}
}
