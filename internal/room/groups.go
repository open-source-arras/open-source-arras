package room

import "math/rand"

// Group ports the data shape from groups.js for a future matchmaking layer.
type Group struct {
	Size    int
	Private bool
	TeamID  int32
}

var activeGroups []*Group

func getID() int32 {
	for i := int32(1); i < 1000; i++ {
		taken := false
		for _, g := range activeGroups {
			if g.TeamID == -i {
				taken = true
				break
			}
		}
		if !taken {
			return -i
		}
	}
	return -rand.Int31()
}

// NewGroup is `new Group(size)` (groups.js:8-14).
func NewGroup(size int) *Group {
	g := &Group{Size: size, TeamID: getID()}
	activeGroups = append(activeGroups, g)
	return g
}

func (g *Group) SetPrivate(private bool) { g.Private = private }

// GroupHandler ports groups.js's GroupHandler. See this file's doc comment
type GroupHandler struct {
	room *Room
}

func newGroupHandler(r *Room) *GroupHandler {
	return &GroupHandler{room: r}
}
