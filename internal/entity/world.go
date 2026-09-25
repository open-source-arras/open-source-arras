// Package entity holds entities in a slab.
package entity

import (
	"math"
	"time"

	"arrasgo/internal/config"
	"arrasgo/internal/spatial"
	"arrasgo/internal/vmath"
)

// EntityID is a generational handle into a World.
type EntityID struct {
	Index uint32
	Gen   uint32
}

func (id EntityID) Valid() bool { return id.Gen != 0 }

// Flags are per-entity bits the hot loop reads.
type Flags uint32

const (
	FlagInGrid Flags = 1 << iota
	FlagBonded       // has a bond; excluded from collision candidates
	FlagPlayer
	FlagBot
	FlagGhost
	FlagActive // activation.active
	FlagNoCollisions
	FlagUnlisted
	FlagLimited
	FlagTurret
	FlagLive
)

func (f Flags) Has(b Flags) bool { return f&b != 0 }

// Entity holds definition state.
type Entity struct {
	ID EntityID

	WireID uint32

	Master         EntityID
	Source         EntityID
	Parent         EntityID
	BulletParent   EntityID
	Bond           EntityID
	Children       []EntityID
	BulletChildren []EntityID
	Turrets        []EntityID
	Props          []EntityID

	Label string
	Def   int32
	Defs  []int32
	Index string

	Name              string
	DisplayName       bool
	NameColor         string
	Type              string
	Walltype          int32
	Team              int32
	LayerID           int32
	BranchLabel       string
	RerootUpgradeTree string
	UpgradeColor      string // a compiled Color, not a palette entry

	CreationTimeMS    int64
	LastMovementTime  int64
	LastFiredTime     int64
	ACCELERATION      float64
	SPEED             float64
	HEALTH            float64
	RESIST            float64
	SHIELD            float64
	REGEN             float64
	DAMAGE            float64
	PENETRATION       float64
	RANGE             float64
	FOV               float64
	SHOCK_ABSORB      float64
	RECOIL_MULTIPLIER float64
	DENSITY           float64
	STEALTH           float64
	PUSHABILITY       float64
	KNOCKBACK         float64
	SIZE              float64
	CoreSize          float64
	Squiggle          float64
	Acceleration      float64
	TopSpeed          float64
	Damage            float64
	Penetration       float64
	Range             float64
	Density           float64
	Stealth           float64
	Pushability       float64
	Knockback         float64
	RecoilMultiplier  float64
	SizeMultiplier    float64
	HeteroMultiplier  float64
	Fov               float64

	Skill      Skill
	SkillOwner EntityID
	Health     HealthType
	Shield     HealthType

	Color           Color
	Glow            Glow
	Blend           Blend
	Confinement     Confinement
	Activation      Activation
	AntiNaN         AntiNaN
	KillCount       KillCount
	Settings        Settings
	AISettings      AISettings
	Bound           Bound
	Eastereggs      Eastereggs
	ShapeData       ShapeData
	Control         Control
	FiringArc       [2]float64
	Invisible       [2]float64 // per-tick alpha step: [fade in, fade out]
	AlphaRange      [2]float64
	Upgrades        []Upgrade
	UpgradePending  UpgradePending
	SkippedUpgrades []int32
	Guns            []GunID
	Controllers     []ControllerID

	MotionType     string
	MotionTypeArgs MotionArgs
	FacingType     string
	FacingTypeArgs FacingArgs

	Facing  float64
	VFacing float64
	Angle   float64
	Shape   float64

	MaxSpeed          float64
	Damp              float64
	StepRemaining     float64
	ReverseTank       float64
	DamageReceived    float64
	Alpha             float64
	DangerValue       float64
	AutospinBoost     float64
	Intangibility     float64
	CameraOverrideX   float64
	CameraOverrideY   float64
	HasCameraOverride bool

	LevelCap      int32
	HasLevelCap   bool
	MaxChildren   int32
	MaxBullets    int32
	HasMaxBullets bool

	OnRender            bool
	AutoOverride        bool
	AllowedOnMinimap    bool
	AlwaysShowOnMinimap bool
	Invuln              bool
	Godmode             bool
	ReadyToDie          bool
	IsProtected         bool
	IsArenaCloser       bool
	AC                  bool
	CollidingBond       bool
	SkipLife            bool
	SyncWithTank        bool
	BatchUpgrades       bool
	Borderless          bool
	DrawFill            bool
	Healer              bool
	IgnoredByAI         bool
	ImmuneToTiles       bool
	ShootOnDeath        bool
	CollisionArray      []EntityID

	OriginalSize     float64
	TouchingSizeWall bool
}

type Eastereggs struct {
	Braindamage bool
}

type AISettings struct {
	BLIND         bool
	NO_LEAD       bool
	IGNORE_SHAPES bool
	SKYNET        bool
	FULL_VIEW     bool
	CHASE         bool
	STRAFE        bool
	FARMER        bool
	Independent   bool
	Chase         bool

	SPEED    float64
	HasSPEED bool

	Farm             bool
	ReverseDirection bool
	SeeInvisible     bool
	View360          bool
}

type Control struct {
	Target vmath.Vec2
	Goal   vmath.Vec2
	Main   bool
	Alt    bool
	Fire   bool
	Power  float64
}

type RoomInfo struct {
	Width  float64
	Height float64
}

// World stores entities in parallel arrays.
type World struct {
	entities   []Entity
	gens       []uint32
	free       []uint32
	live       int
	nextWireID uint32
	Room       RoomInfo
	Tuning     *config.Tuning
	Now        func() int64
	Pos        []vmath.Vec2
	Vel        []vmath.Vec2
	Accel      []vmath.Vec2
	Size       []float64
	Flag       []Flags
	Boxes      []spatial.Box
}

func NewWorld(capacity int) *World {
	return &World{
		entities: make([]Entity, 0, capacity),
		gens:     make([]uint32, 0, capacity),
		Pos:      make([]vmath.Vec2, 0, capacity),
		Vel:      make([]vmath.Vec2, 0, capacity),
		Accel:    make([]vmath.Vec2, 0, capacity),
		Size:     make([]float64, 0, capacity),
		Flag:     make([]Flags, 0, capacity),
		Boxes:    make([]spatial.Box, 0, capacity),
	}
}

// Len returns the total slab size.
func (w *World) Len() int { return len(w.entities) }

// Live returns the count of living entities.
func (w *World) Live() int { return w.live }

func (w *World) NextWireID() uint32 { return w.nextWireID }

func (w *World) SkillRef(id EntityID) *Skill {
	for i := 0; i < 16; i++ {
		e := w.Get(id)
		if e == nil {
			return nil
		}
		if !e.SkillOwner.Valid() || e.SkillOwner == id {
			return &e.Skill
		}
		id = e.SkillOwner
	}
	return nil
}

func (w *World) TakeWireID() uint32 {
	id := w.nextWireID
	w.nextWireID++
	return id
}

func (w *World) IDAt(idx uint32) (EntityID, bool) {
	if int(idx) >= len(w.entities) || !w.Flag[idx].Has(FlagLive) {
		return EntityID{}, false
	}
	return EntityID{Index: idx, Gen: w.gens[idx]}, true
}

// EachLive iterates over all living entities.
func (w *World) EachLive(fn func(id EntityID, e *Entity)) {
	for i := range w.entities {
		if !w.Flag[i].Has(FlagLive) {
			continue
		}
		fn(EntityID{Index: uint32(i), Gen: w.gens[i]}, &w.entities[i])
	}
}

// Spawn creates a new entity.
func (w *World) Spawn() EntityID {
	var idx uint32
	if n := len(w.free); n > 0 {
		idx = w.free[n-1]
		w.free = w.free[:n-1]
		w.entities[idx] = Entity{}
		w.Pos[idx] = vmath.Vec2{}
		w.Vel[idx] = vmath.Vec2{}
		w.Accel[idx] = vmath.Vec2{}
		w.Size[idx] = 0
		w.Flag[idx] = 0
		w.Boxes[idx] = spatial.Box{}
	} else {
		idx = uint32(len(w.entities))
		w.entities = append(w.entities, Entity{})
		w.gens = append(w.gens, 0)
		w.Pos = append(w.Pos, vmath.Vec2{})
		w.Vel = append(w.Vel, vmath.Vec2{})
		w.Accel = append(w.Accel, vmath.Vec2{})
		w.Size = append(w.Size, 0)
		w.Flag = append(w.Flag, 0)
		w.Boxes = append(w.Boxes, spatial.Box{})
	}

	w.gens[idx]++
	if w.gens[idx] == 0 { // never hand out the invalid generation
		w.gens[idx] = 1
	}
	w.live++

	w.Flag[idx] |= FlagLive

	id := EntityID{Index: idx, Gen: w.gens[idx]}
	w.initEntity(idx, id)
	return id
}

func (w *World) initEntity(idx uint32, id EntityID) {
	e := &w.entities[idx]
	e.ID = id

	e.WireID = w.nextWireID
	w.nextWireID++

	// entity.js:99-100 assigns team twice. The second wins, but when an entity has
	// no master then master is itself (entity.js:8) and master.team is the id that
	// was just written, so a master-less entity's team is its own id. A caller that
	// passes a master overwrites this.
	e.Team = int32(e.WireID)

	e.Source = id
	e.Parent = id
	e.BulletParent = id
	e.Master = id

	e.Fov = math.NaN()

	e.DangerValue = math.NaN()

	e.Control = Control{}
	e.Activation = NewActivation()
	w.Flag[idx] |= FlagActive // mirrors activation.active, which starts true

	e.Blend = Blend{Color: "#FFFFFF"}
	e.Health = NewHealthType(1, HealthStatic, 0)
	e.Shield = NewHealthType(0, HealthDynamic, 0)
	e.Color = NewColorNumber(16, false)
	e.Glow = Glow{Color: NewColorNumber(-1, false).Compiled, Alpha: 1, Recursion: 1}
	e.Confinement = Confinement{XMax: w.Room.Width, YMax: w.Room.Height}
	e.FiringArc = [2]float64{0, 360}

	e.SIZE = 1
	e.SizeMultiplier = 1
	e.Squiggle = 1
	e.NameColor = "#ffffff"

	e.AllowedOnMinimap = true
	e.StepRemaining = 1
	e.ReverseTank = 1
	e.Damp = 0.05
	e.Alpha = 1
	e.AlphaRange = [2]float64{0, 1}
	e.AntiNaN = NewAntiNaN()

	if w.Tuning != nil {
		e.Skill = NewSkill(w.Tuning)
	}

	now := w.now()
	e.CreationTimeMS = now
	e.LastMovementTime = now
	e.LastFiredTime = now
}

func (w *World) now() int64 {
	if w.Now != nil {
		return w.Now()
	}
	return time.Now().UnixMilli()
}

// Alive checks if an entity ID is valid.
func (w *World) Alive(id EntityID) bool {
	return id.Gen != 0 && int(id.Index) < len(w.gens) && w.gens[id.Index] == id.Gen
}

// Get returns an entity by ID or nil.
func (w *World) Get(id EntityID) *Entity {
	if !w.Alive(id) {
		return nil
	}
	return &w.entities[id.Index]
}

// Destroy removes an entity.
func (w *World) Destroy(id EntityID) {
	if !w.Alive(id) {
		return
	}
	w.gens[id.Index]++
	if w.gens[id.Index] == 0 {
		w.gens[id.Index] = 1
	}
	w.Flag[id.Index] = 0
	w.Boxes[id.Index] = spatial.Box{Skip: true}
	w.free = append(w.free, id.Index)
	w.live--
}

func (w *World) UpdateAABB(id EntityID) {
	if !w.Alive(id) {
		return
	}
	w.AntiNaNUpdate(id)

	i := id.Index
	e := &w.entities[i]
	bonded := w.Flag[i].Has(FlagBonded)
	if !w.Flag[i].Has(FlagActive) || (!e.CollidingBond && bonded) {
		w.Flag[i] &^= FlagInGrid
	} else {
		w.Flag[i] |= FlagInGrid
	}

	// independently of whether the entity was inserted. FlagInGrid and Skip are two
	// separate gates.
	w.Boxes[i].Skip = bonded

	if !w.Flag[i].Has(FlagInGrid) {
		return
	}

	p, s := w.Pos[i], w.Size[i]
	w.Boxes[i].MinX = p.X - s
	w.Boxes[i].MinY = p.Y - s
	w.Boxes[i].MaxX = p.X + s
	w.Boxes[i].MaxY = p.Y + s
}

func (w *World) RemoveFromGrid(id EntityID) {
	if !w.Alive(id) {
		return
	}
	w.Flag[id.Index] &^= FlagInGrid
}

func (w *World) AddToGrid(id EntityID) {
	e := w.Get(id)
	if e == nil {
		return
	}
	if !e.CollidingBond && w.Flag[id.Index].Has(FlagBonded) {
		return
	}
	w.Flag[id.Index] |= FlagInGrid
}

func (w *World) AntiNaNUpdate(id EntityID) {
	if !w.Alive(id) {
		return
	}
	i := id.Index
	e := &w.entities[i]
	a := &e.AntiNaN

	p, v, ac := &w.Pos[i], &w.Vel[i], &w.Accel[i]
	bad := math.IsNaN(p.X) || math.IsNaN(p.Y) ||
		math.IsNaN(v.X) || math.IsNaN(v.Y) ||
		math.IsNaN(ac.X) || math.IsNaN(ac.Y)

	if bad {
		a.NansInARow++
		if a.NansInARow > 50 {
			w.Kill(id)
		}
		p.X, p.Y = a.X, a.Y
		v.X, v.Y = a.VX, a.VY
		ac.X, ac.Y = a.AX, a.AY
		return
	}

	a.X, a.Y = p.X, p.Y
	a.VX, a.VY = v.X, v.Y
	a.AX, a.AY = ac.X, ac.Y
	if a.NansInARow > 0 {
		a.NansInARow--
	}
}

func (w *World) Kill(id EntityID) {
	e := w.Get(id)
	if e == nil {
		return
	}
	e.Invuln = false
	e.Godmode = false
	e.Health.Amount = -100
}

func (e *Entity) IsDead() bool { return e.Health.Amount <= 0 }

func (e *Entity) Level(cfg *config.Tuning) int32 { return e.LevelWith(&e.Skill, cfg) }

func (e *Entity) LevelWith(sk *Skill, cfg *config.Tuning) int32 {
	limit := int32(cfg.LevelCap)
	if e.HasLevelCap {
		limit = e.LevelCap
	}
	if sk.Level < limit {
		return sk.Level
	}
	return limit
}

type SizeContext struct {
	Tuning          *config.Tuning
	Growth          bool
	GenericTankSIZE float64
}

func (w *World) ComputeSize(id EntityID, ctx SizeContext) float64 {
	e := w.Get(id)
	if e == nil {
		return 0
	}
	flags := w.Flag[id.Index]
	if flags.Has(FlagTurret) || (flags.Has(FlagLimited) && e.Bond.Valid()) {
		return w.ComputeSize(e.Bond, ctx) * e.Bound.Size
	}
	if flags.Has(FlagLimited) {
		base := e.CoreSize
		if base == 0 {
			base = e.SIZE
		}
		level := 0.0
		if ctx.Tuning != nil {
			level = float64(e.Level(ctx.Tuning))
		}
		return base * e.SizeMultiplier * (1 + level/45)
	}
	sk := w.SkillRef(id)
	if sk == nil {
		sk = &e.Skill
	}
	level := float64(e.LevelWith(sk, ctx.Tuning))
	if !ctx.Growth {
		level = math.Min(45, level)
	}
	levelMultiplier := 1.0
	if e.Settings.HealthWithLevel {
		levelMultiplier += math.Min(45, level) / 45
	}
	if level > 45 && (w.Flag[id.Index].Has(FlagPlayer) || w.Flag[id.Index].Has(FlagBot)) {
		scoreSince45 := sk.Score - 26263
		// 1.065 is quoted from entity.js:692: wall size is not a true wall.
		const multiplier = 1.065
		wallSize := (w.Room.Width / 32 / 2) * math.Sqrt2 * multiplier
		levelMultiplier += ((scoreSince45 / 3e6) * wallSize) / ctx.GenericTankSIZE / 2
	}
	base := e.CoreSize
	if base == 0 {
		base = e.SIZE
	}
	return base * e.SizeMultiplier * levelMultiplier
}

func (w *World) UpdateBodyInfo(id EntityID, ctx SizeContext) {
	e := w.Get(id)
	if e == nil {
		return
	}
	e.Fov = e.FOV * 275 * math.Sqrt(float64(w.ComputeSize(id, ctx)))
}

func (e *Entity) DamageMultiplier() float64 {
	if e.Type != "swarm" {
		return 1
	}
	return 0.25 + 1.5*clamp(e.Range/(e.RANGE+1), 0, 1)
}
