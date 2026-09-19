package room

import "testing"

func TestGetID_AllocatesDistinctNegativeSlots(t *testing.T) {
	before := len(activeGroups)
	g1 := NewGroup(2)
	g2 := NewGroup(4)
	defer func() { activeGroups = activeGroups[:before] }() // don't leak into other tests

	if g1.TeamID == g2.TeamID {
		t.Fatalf("two groups got the same TeamID %d", g1.TeamID)
	}
	if g1.TeamID >= 0 || g2.TeamID >= 0 {
		t.Errorf("group TeamIDs should be negative (groups.js's getID), got %d, %d", g1.TeamID, g2.TeamID)
	}
	if g1.Size != 2 || g2.Size != 4 {
		t.Errorf("Size not recorded: g1=%d g2=%d", g1.Size, g2.Size)
	}
}

func TestGroup_SetPrivate(t *testing.T) {
	g := &Group{}
	g.SetPrivate(true)
	if !g.Private {
		t.Fatal("SetPrivate(true) should set Private")
	}
	g.SetPrivate(false)
	if g.Private {
		t.Fatal("SetPrivate(false) should clear Private")
	}
}
