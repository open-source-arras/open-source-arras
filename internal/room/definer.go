package room

import (
	"arrasgo/internal/defs"
	"arrasgo/internal/entity"
)

// Definer is entity.js:176.
type Definer interface {
	Define(w *entity.World, id entity.EntityID, name string) error
	DefineInline(w *entity.World, id entity.EntityID, def *defs.Definition) error
	RefreshBodyAttributes(w *entity.World, id entity.EntityID)
	SkillUp(w *entity.World, id entity.EntityID, slot int) (bool, error)
	RefreshSkills(w *entity.World, id entity.EntityID)
	Upgrade(w *entity.World, id entity.EntityID, number, branchID int) (bool, error)
	UpgradeToDailyTank(w *entity.World, id entity.EntityID, tank string) (bool, error)
}

// ControllerAttacher attaches controllers to entities.
type ControllerAttacher interface {
	AttachControllers(w *entity.World, id entity.EntityID, controllers ...defs.Controller) error
}

// Lifegiver is entity.js:125.
type Lifegiver interface {
	BringToLife(w *entity.World, id entity.EntityID)
}

type Comms interface {
	Broadcast(message string)
	BroadcastRoom()
	SendTo(id entity.EntityID, message string)
	ClientCount() int
}

type MazeSquare struct {
	X, Y, Size float64
}

type MazeLayout struct {
	Squares       []MazeSquare
	Width, Height int
}

type MazeGenerator interface {
	PlaceMinimal(mazeType int) MazeLayout
}
