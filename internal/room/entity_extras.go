package room

import (
	"strconv"

	"arrasgo/internal/entity"
	"arrasgo/internal/vmath"
)

type EntityExtras struct {
	IsMothership     bool
	IsBoss           bool
	IsDominator      bool
	Passive          bool
	UnderControl     bool
	JustHittedAWall  bool
	IsFood           bool
	Incognito        bool
	MinimapColor     string
	LeaderboardColor string
	OriginalName     string
	BotReleased      bool
	LeftoverUpgrades int32
	NexusAlerted     bool
	CannotTeleport   bool
	PortalLaunch     vmath.Vec2
	Zombified        bool
	DontIncreaseFov  bool
}

type EntityExtraTable struct {
	m map[entity.EntityID]*EntityExtras
}

func NewEntityExtraTable() *EntityExtraTable {
	return &EntityExtraTable{m: make(map[entity.EntityID]*EntityExtras)}
}

func (t *EntityExtraTable) Get(id entity.EntityID) EntityExtras {
	if e, ok := t.m[id]; ok {
		return *e
	}
	return EntityExtras{}
}

func (t *EntityExtraTable) GetOrCreate(id entity.EntityID) *EntityExtras {
	e, ok := t.m[id]
	if !ok {
		e = &EntityExtras{}
		t.m[id] = e
	}
	return e
}

func (t *EntityExtraTable) Delete(id entity.EntityID) {
	delete(t.m, id)
}

func paletteColorString(index float64) string {
	if index == 0 {
		return ""
	}
	return strconv.FormatFloat(index, 'f', -1, 64)
}
