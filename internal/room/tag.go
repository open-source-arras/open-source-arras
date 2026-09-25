package room

import "arrasgo/internal/entity"

// Tag is the tag gamemode (game/gamemodes/scripts/tag.js).
type Tag struct {
	room *Room

	Won      bool
	CanStart bool
	Teams    []int32

	CloseArenaAt int64

	tracked map[entity.EntityID]int32
}

func newTag(r *Room) *Tag {
	return &Tag{room: r, tracked: make(map[entity.EntityID]int32)}
}

func (t *Tag) InitAndStart() { t.CanStart = true }

func (t *Tag) ResetAndStop() {
	t.CanStart = false
	t.Won = false
	t.RedefineTeams()
}

func (t *Tag) Redefine() { t.RedefineTeams() }

func (t *Tag) RedefineTeams() {
	n, ok := t.room.Mutable.Teams.Int()
	if !ok || n < 0 {
		n = 0
	}
	t.Teams = make([]int32, n)
}

func (t *Tag) AddToTeam(team int32) {
	if team < 1 || int(team) > len(t.Teams) {
		return
	}
	t.Teams[team-1]++
	t.CheckWin()
}

func (t *Tag) RemoveFromTeam(team int32) {
	if team < 1 || int(team) > len(t.Teams) {
		return
	}
	t.Teams[team-1]--
	t.CheckWin()
}

func (t *Tag) AddBot(id entity.EntityID, botTeam int32) {
	team := -botTeam
	t.tracked[id] = team
	t.AddToTeam(team)
}

func (t *Tag) PollDeaths(w *entity.World) {
	for id, team := range t.tracked {
		e := w.Get(id)
		if e != nil && !e.IsDead() {
			continue
		}
		delete(t.tracked, id)
		t.RemoveFromTeam(team)
	}
}

func (t *Tag) CheckWin() {
	if t.Won || !t.CanStart || t.room.clientCount() < 1 {
		return
	}
	best := -1
	bestVal := int32(-1)
	for i, v := range t.Teams {
		if v > bestVal {
			best = i
			bestVal = v
		}
	}
	if best < 0 {
		return
	}
	for i, v := range t.Teams {
		if i != best && v != 0 {
			return
		}
	}
	if t.Teams[best] < 5 {
		return
	}
	t.Won = true
	if t.room.Comms != nil {
		t.room.Comms.Broadcast(GetTeamName(-(int32(best) + 1)) + " has won the game!")
	}
	t.CloseArenaAt = t.room.World.Now() + 3000
}
