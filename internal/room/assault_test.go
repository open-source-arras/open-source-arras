package room

import (
	"testing"

	"arrasgo/internal/entity"
)

// Dominators flip teams on death. Ported from assault.js:20-46.
func TestAssault_DominatorDeathFlipsTeam(t *testing.T) {
	room := newGamemodeTestRoom(t, 21, "assault_line")
	mgr := NewGamemodeManager(room)
	if err := mgr.Start(); err != nil {
		t.Fatalf("Start: %v", err)
	}
	assault := mgr.Assault
	if len(assault.slots) == 0 {
		t.Skip("assault_line's room dump has no assaultDominators-tagged tile")
	}
	beforeCount := assault.leftDominators

	target := assault.slots[0]
	e := room.World.Get(target.id)
	if e == nil {
		t.Fatal("freshly spawned dominator does not resolve")
	}
	wasGreen := e.Team == TeamGreen

	existed := make(map[entity.EntityID]bool, len(assault.slots))
	for _, s := range assault.slots {
		existed[s.id] = true
	}

	room.World.Kill(target.id)
	if err := assault.Poll(); err != nil {
		t.Fatalf("Poll: %v", err)
	}

	var replacement *entity.Entity
	for _, s := range assault.slots {
		if existed[s.id] {
			continue
		}
		replacement = room.World.Get(s.id)
		break
	}
	if replacement == nil {
		t.Fatal("no new dominator slot appeared after the tracked one died")
	}

	if wasGreen {
		if replacement.Team != TeamBlue {
			t.Errorf("a dead GREEN dominator should respawn BLUE, got team %d", replacement.Team)
		}
		if assault.leftDominators != beforeCount-1 {
			t.Errorf("leftDominators = %d, want %d after a GREEN loss", assault.leftDominators, beforeCount-1)
		}
	} else {
		if replacement.Team != TeamGreen {
			t.Errorf("a dead BLUE dominator should respawn GREEN, got team %d", replacement.Team)
		}
		if assault.leftDominators != beforeCount+1 {
			t.Errorf("leftDominators = %d, want %d after a BLUE loss", assault.leftDominators, beforeCount+1)
		}
	}
}

func TestAssaultSecondBroadcasts(t *testing.T) {
	broadcast := map[int]bool{
		60: true, 50: true, 40: true, 30: true, 20: true, 10: true,
		15: false, 14: true, 9: true, 1: true, 16: false,
	}
	for secs, want := range broadcast {
		if got := assaultSecondBroadcasts(secs); got != want {
			t.Errorf("assaultSecondBroadcasts(%d) = %v, want %v", secs, got, want)
		}
	}
}
