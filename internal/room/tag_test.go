package room

import "testing"

// TestTag_CheckWinRequiresSoleSurvivingTeamAtFive tests tag win condition.
func TestTag_CheckWinRequiresSoleSurvivingTeamAtFive(t *testing.T) {
	room := newGamemodeTestRoom(t, 51, "pandemic")
	tag := newTag(room)
	tag.CanStart = true
	tag.Teams = []int32{4, 0} // team 1 close but not there yet, team 2 empty

	tag.CheckWin()
	if tag.Won {
		t.Fatal("should not win at 4 members")
	}

	tag.Teams[0] = 5
	tag.CheckWin()
	if !tag.Won {
		t.Fatal("should win once the sole surviving team reaches 5")
	}
	if tag.CloseArenaAt == 0 {
		t.Error("CloseArenaAt should be scheduled once won")
	}
}

func TestTag_CheckWinBlockedByAnySecondTeam(t *testing.T) {
	room := newGamemodeTestRoom(t, 52, "pandemic")
	tag := newTag(room)
	tag.CanStart = true
	tag.Teams = []int32{10, 1} // team 1 way ahead, but team 2 still has a member
	tag.CheckWin()
	if tag.Won {
		t.Error("should not win while a second team still has any member")
	}
}

// TestTag_AddBotAndPollDeaths tests bot addition and death polling.
func TestTag_AddBotAndPollDeaths(t *testing.T) {
	room := newGamemodeTestRoom(t, 53, "pandemic")
	tag := newTag(room)
	tag.RedefineTeams()
	if len(tag.Teams) == 0 {
		t.Skip("pandemic produced zero teams")
	}

	id := room.World.Spawn()
	room.World.Get(id).Team = TeamBlue // -1, so botTeam(1-based) = 1
	tag.AddBot(id, TeamBlue)
	if tag.Teams[0] != 1 {
		t.Fatalf("Teams[0] = %d after AddBot, want 1", tag.Teams[0])
	}

	room.World.Destroy(id)
	tag.PollDeaths(room.World)
	if tag.Teams[0] != 0 {
		t.Errorf("Teams[0] = %d after PollDeaths saw the bot die, want 0", tag.Teams[0])
	}
}

func TestTag_ResetAndStop(t *testing.T) {
	room := newGamemodeTestRoom(t, 54, "pandemic")
	tag := newTag(room)
	tag.CanStart = true
	tag.Won = true
	tag.ResetAndStop()
	if tag.CanStart || tag.Won {
		t.Error("ResetAndStop should clear CanStart and Won")
	}
	for _, v := range tag.Teams {
		if v != 0 {
			t.Errorf("ResetAndStop should zero every team count, got %v", tag.Teams)
		}
	}
}
