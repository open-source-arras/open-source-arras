package ctrl

import (
	"arrasgo/internal/entity"
	"arrasgo/internal/jsutil"
	"arrasgo/internal/vmath"
)

type PlayerCommand struct {
	Target                vmath.Vec2
	Autofire, Lmb         bool
	Autoalt, Rmb          bool
	Spinlock              bool
	Autospin              bool
	Override              bool
	Right, Left, Up, Down float64 // command.right/left/up/down: JS adds these, not just true/false
}

type GunInfo struct {
	CanShoot      bool
	Stack         bool
	Cycle         float64
	Reload        float64
	ReloadStat    float64
	Angle         float64
	AltFire       bool
	TrackingSpeed float64
	TrackingRange float64
}

// jsGunsMapLength is 0 because guns.length is undefined in JS. See docs/found-bugs.md #60.
const jsGunsMapLength = 0

type WallHitbox struct {
	Pos          vmath.Vec2
	HitboxRadius float64
	Hitbox       [][2]vmath.Vec2
}

// Context is everything a controller's Think needs.
type Context struct {
	World        *entity.World
	Body         entity.EntityID
	Rand         *jsutil.Rand
	Player       *PlayerCommand
	Guns         []GunInfo
	Walls        []WallHitbox
	Candidates   []entity.EntityID
	RandomSpot   func(*jsutil.Rand) vmath.Vec2
	BotMove      []BotMovePath
	RoomCenter   vmath.Vec2
	IsStopAIZone func(vmath.Vec2) bool
	IsDominator  func(entity.EntityID) bool
	IsPassive    func(entity.EntityID) bool
	// JustHitAWall is a CONSUMING read. Wire to sim.Sim.ConsumeWallHit.
	JustHitAWall          func(entity.EntityID) bool
	RefreshBodyAttributes func(entity.EntityID)
	Growth                bool
	GenericTankSIZE       float64
	// RunSpeed zero is a wiring bug. It turns formulaTarget frame steps into +Inf.
	RunSpeed float64
}

func (c *Context) size(id entity.EntityID) float64 {
	return float64(c.World.ComputeSize(id, entity.SizeContext{
		Tuning:          c.World.Tuning,
		Growth:          c.Growth,
		GenericTankSIZE: c.GenericTankSIZE,
	}))
}

func (c *Context) gunInfo(i int) GunInfo {
	if i < 0 || i >= len(c.Guns) {
		return GunInfo{}
	}
	return c.Guns[i]
}

func (c *Context) isDominator(id entity.EntityID) bool {
	if c.IsDominator == nil {
		return false
	}
	return c.IsDominator(id)
}

func (c *Context) isPassive(id entity.EntityID) bool {
	if c.IsPassive == nil {
		return false
	}
	return c.IsPassive(id)
}

func (c *Context) justHitAWall(id entity.EntityID) bool {
	if c.JustHitAWall == nil {
		return false
	}
	return c.JustHitAWall(id)
}

func (c *Context) refreshBodyAttributes(id entity.EntityID) {
	if c.RefreshBodyAttributes != nil {
		c.RefreshBodyAttributes(id)
	}
}
