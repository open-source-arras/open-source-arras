package room

import (
	"testing"

	"arrasgo/internal/jsutil"
)

func TestGetTeamName(t *testing.T) {
	cases := []struct {
		team int32
		want string
	}{
		{TeamBlue, "BLUE"}, {TeamCyan, "CYAN"}, {TeamDreadnoughts, "DREADNOUGHT"},
		{TeamRoom, "NEUTRAL"}, {TeamEnemies, "NEUTRAL"}, {-9, "NEUTRAL"},
	}
	for _, c := range cases {
		if got := GetTeamName(c.team); got != c.want {
			t.Errorf("GetTeamName(%d) = %q, want %q", c.team, got, c.want)
		}
	}
}

func TestGetTeamColor(t *testing.T) {
	if got := GetTeamColor(TeamBlue, false); got != "blue" {
		t.Errorf("GetTeamColor(blue,false) = %q, want blue", got)
	}
	if got := GetTeamColor(TeamDreadnoughts, false); got != "aqua" {
		t.Errorf("GetTeamColor(dreadnoughts,false) = %q, want aqua", got)
	}
	if got := GetTeamColor(TeamRoom, false); got != "3" {
		t.Errorf("GetTeamColor(room,false) = %q, want \"3\"", got)
	}
	if got := GetTeamColor(TeamRed, true); got != "red 0 1 0 false" {
		t.Errorf("GetTeamColor(red,true) = %q, want \"red 0 1 0 false\"", got)
	}
}

// Reproduces the js-src bug. See docs/found-bugs.md.
func TestIsPlayerTeam(t *testing.T) {
	for _, team := range []int32{-1, -10, -11, -100, TeamEnemies, 0, 1, 5} {
		if !IsPlayerTeam(team) {
			t.Errorf("IsPlayerTeam(%d) = false, want true (js-src's isPlayerTeam is unconditionally true)", team)
		}
	}
}

func TestTeamsValue(t *testing.T) {
	if u := UnsetTeams(); u.IsSet() {
		t.Error("UnsetTeams().IsSet() = true, want false")
	}
	if n, ok := TeamsNumber(3).Int(); !ok || n != 3 {
		t.Errorf("TeamsNumber(3).Int() = (%d,%v), want (3,true)", n, ok)
	}
	// chatCommands.js:110-115: a raw admin chat argument, uncoerced.
	if n, ok := TeamsRaw("5").Int(); !ok || n != 5 {
		t.Errorf("TeamsRaw(\"5\").Int() = (%d,%v), want (5,true)", n, ok)
	}
	if n, ok := TeamsRaw("").Int(); !ok || n != 0 {
		t.Errorf("TeamsRaw(\"\").Int() = (%d,%v), want (0,true) -- Number(\"\")===0", n, ok)
	}
	if _, ok := TeamsRaw("banana").Int(); ok {
		t.Error("TeamsRaw(\"banana\").Int() ok=true, want false (NaN)")
	}
	if _, ok := UnsetTeams().Int(); ok {
		t.Error("UnsetTeams().Int() ok=true, want false")
	}
}

func TestGetRandomTeam_Range(t *testing.T) {
	rng := jsutil.NewRand(1)
	for i := 0; i < 1000; i++ {
		team := GetRandomTeam(rng)
		if team > 0 || team < -2999 {
			t.Fatalf("GetRandomTeam() = %d, out of the expected [-2999,0] range", team)
		}
	}
}

func TestGetWeakestTeam_PrefersBlueWhenAllZero(t *testing.T) {
	for seed := uint64(1); seed <= 20; seed++ {
		rng := jsutil.NewRand(seed)
		got := GetWeakestTeam(rng, 3, true, nil, nil, TeamCounts{})
		if got != TeamBlue {
			t.Errorf("seed %d: GetWeakestTeam (all zero) = %d, want TeamBlue", seed, got)
		}
	}
}

func TestGetWeakestTeam_PicksTheLowestCount(t *testing.T) {
	rng := jsutil.NewRand(1)
	counts := TeamCounts{TeamBlue: 5, TeamGreen: 1, TeamRed: 5}
	got := GetWeakestTeam(rng, 3, true, nil, nil, counts)
	if got != TeamGreen {
		t.Errorf("GetWeakestTeam = %d, want TeamGreen (the only team with count 1)", got)
	}
}

func TestGetWeakestTeam_SkipsDefeatedTeams(t *testing.T) {
	rng := jsutil.NewRand(1)
	counts := TeamCounts{TeamBlue: 0, TeamGreen: 0}
	defeated := map[int32]bool{TeamBlue: true}
	got := GetWeakestTeam(rng, 2, true, nil, defeated, counts)
	if got != TeamGreen {
		t.Errorf("GetWeakestTeam (blue defeated) = %d, want TeamGreen", got)
	}
}

func TestGetWeakestTeam_NotOkReturnsBlue(t *testing.T) {
	rng := jsutil.NewRand(1)
	if got := GetWeakestTeam(rng, 0, false, nil, nil, nil); got != TeamBlue {
		t.Errorf("GetWeakestTeam(ok=false) = %d, want TeamBlue", got)
	}
}

func TestTeamSpawnKey(t *testing.T) {
	if got := TeamSpawnKey(TeamBlue); got != "-1" {
		t.Errorf("TeamSpawnKey(TeamBlue) = %q, want -1", got)
	}
}
