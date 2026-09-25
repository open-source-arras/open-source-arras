package room

import (
	"testing"

	"arrasgo/internal/entity"
)

func TestCheckName(t *testing.T) {
	cases := []struct {
		name     string
		wantFull string
		wantTag  string
		wantOK   bool
	}{
		{"[ABC] Player", "[ABC]", "ABC", true},
		{"Player", "", "", false},
		{"[X]Y[Z]", "[X]", "X", true}, // first bracket only, non-greedy
	}
	for _, c := range cases {
		full, tag, ok := checkName(c.name)
		if ok != c.wantOK || full != c.wantFull || tag != c.wantTag {
			t.Errorf("checkName(%q) = (%q,%q,%v), want (%q,%q,%v)", c.name, full, tag, ok, c.wantFull, c.wantTag, c.wantOK)
		}
	}
}

func TestClanWars_AddAndGetPlayerInfo(t *testing.T) {
	room := newGamemodeTestRoom(t, 101, "clan_wars")
	cw := newClanWars(room)

	cw.Add("[FOO] Alice", entity.EntityID{})
	cw.Add("[FOO] Bob", entity.EntityID{}) // same clan, should not duplicate
	if len(cw.clans) != 1 {
		t.Fatalf("len(clans) = %d, want 1 after two members of the same clan join", len(cw.clans))
	}

	team, clan := cw.GetPlayerInfo("[FOO] Anyone", room.Rand)
	if clan != "[FOO]" {
		t.Errorf("GetPlayerInfo clan = %q, want [FOO]", clan)
	}
	if team != cw.clans[0].Team {
		t.Errorf("GetPlayerInfo team = %d, want the clan's own team %d", team, cw.clans[0].Team)
	}

	_, clan2 := cw.GetPlayerInfo("No Brackets Here", room.Rand)
	if clan2 != "" {
		t.Errorf("an unbracketed name should get no clan, got %q", clan2)
	}
}

func TestClanWars_Reset(t *testing.T) {
	room := newGamemodeTestRoom(t, 102, "clan_wars")
	cw := newClanWars(room)
	cw.Add("[BAR] X", entity.EntityID{})
	cw.Reset()
	if len(cw.clans) != 0 || cw.index != -1 || cw.teamID != 110 {
		t.Errorf("Reset left clans=%v index=%d teamID=%d", cw.clans, cw.index, cw.teamID)
	}
}
