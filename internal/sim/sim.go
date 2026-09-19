// Package sim is the simulation core: per-entity physics, collision resolution and the tick loop.
package sim

import (
	"math"

	"arrasgo/internal/jsmath"

	"arrasgo/internal/config"
	"arrasgo/internal/entity"
	"arrasgo/internal/jsutil"
	"arrasgo/internal/spatial"
)

type Room struct {
	Width  float64
	Height float64
}

type Gamemode struct {
	Train    bool
	Outbreak bool
	Growth   bool
}

// Hooks are callbacks for code this package may not import.
type Hooks struct {
	WatchAccel            func(id entity.EntityID, dx, dy, x, y float64)
	WatchCollide          func(name string, a, b entity.EntityID)
	Life                  func(id entity.EntityID)
	TakeSelfie            func(id entity.EntityID)
	Destroy               func(id entity.EntityID)
	Tracked               func(id entity.EntityID)
	Zombify               func(id entity.EntityID)
	ViewCheck             func(id entity.EntityID, ratio float64) bool
	Necro                 func(tank, food entity.EntityID) bool
	RefreshBodyAttributes func(id entity.EntityID)
	SpawnAssemblerEffect  func(parent entity.EntityID, velX, velY, size float64)
	ShootOnDeath          func(id entity.EntityID)
	OnDeath               func(d *Death)
	OnDamage              func(id entity.EntityID, inflictors, tools []entity.EntityID)
	OnKill                func(killer, victim entity.EntityID)
	OnTick                func(id entity.EntityID)
	OnCollide             func(a, b entity.EntityID)
	SendToServer          func(id entity.EntityID, destination string)
	Error                 func(err error)
}

type Loops struct {
	SyncedDelays func()
	Food         func()
	Room         func()
	QuickLoop    func()
	Maintain     func()
	Other        func()
	Broadcast    func()
	Timers       func(untilMS float64, untilSeq uint64)
	Views        func(lastCycle float64)
}

type timerSlot struct {
	At  float64
	Seq uint64
}

type Death struct {
	Victim      entity.EntityID
	Killers     []entity.EntityID
	KillTools   []entity.EntityID
	NotJustFood bool
	Jackpot     float64
}

type extra struct {
	Noclip               bool
	IsPortal             bool
	IsDominator          bool
	Zombified            bool
	AlwaysActive         bool
	JustHittedAWall      bool
	WallHitReadyAt       int64
	AssemblerLevel       int32
	DontSendDeathMessage bool
	OriginalFov          float64
	lastSavedFacing      float64
	hasLastSavedFacing   bool
	// touchingSizeWall needs three states: undefined, false, true.
	touchingSizeWall triState
	// touchingFovWall needs three states: undefined, false, true.
	touchingFovWall triState
}

type triState uint8

const (
	triUnset triState = iota
	triFalse
	triTrue
)

func (t triState) isFalse() bool { return t == triFalse }
func (t triState) isTrue() bool  { return t == triTrue }

type Sim struct {
	W    *entity.World
	Grid *spatial.Grid

	Tuning   *config.Tuning
	Gamemode Gamemode
	Room     Room
	Hooks    Hooks
	Loops    Loops

	Rand *jsutil.Rand

	RoomSpeed       float64
	RunSpeed        float64
	GenericTankSIZE float64
	CycleSpeedMS    float64

	order     []entity.EntityID
	extra     []extra
	idByIndex []entity.EntityID

	tick      uint64
	elapsedMS float64

	deadlines [4]timerSlot
	timerSeq  uint64
	started   bool

	logs loggers

	// Reused per tick to avoid allocations.
	inflictors []entity.EntityID
	tools      []entity.EntityID
	killers    []entity.EntityID
	death      Death
}

func New(w *entity.World, g *spatial.Grid) *Sim {
	s := &Sim{
		W:               w,
		Grid:            g,
		RoomSpeed:       1,
		RunSpeed:        1.5,
		GenericTankSIZE: 12,
		CycleSpeedMS:    1000.0 / 1.0 / 30.0,
	}
	s.timerSeq++
	s.deadlines[broadcastSlot] = timerSlot{At: broadcastPeriod, Seq: s.timerSeq}
	return s
}

// Track registers a freshly spawned entity in creation order.
func (s *Sim) Track(id entity.EntityID) {
	if int(id.Index) < len(s.W.Flag) && s.W.Flag[id.Index].Has(entity.FlagUnlisted) {
		return
	}
	s.order = append(s.order, id)
	for int(id.Index) >= len(s.extra) {
		s.extra = append(s.extra, extra{})
		s.idByIndex = append(s.idByIndex, entity.EntityID{})
	}
	s.extra[id.Index] = extra{}
	s.idByIndex[id.Index] = id
	if s.Hooks.Tracked != nil {
		s.Hooks.Tracked(id)
	}
}

func (s *Sim) Tick() uint64 { return s.tick }

func (s *Sim) ElapsedMS() float64 { return s.elapsedMS }

func (s *Sim) Count() int { return len(s.order) }

// Tracked returns the creation-ordered list of entities. Do not retain across Step.
func (s *Sim) Tracked() []entity.EntityID { return s.order }

func (s *Sim) extraOf(id entity.EntityID) *extra {
	if !s.W.Alive(id) || int(id.Index) >= len(s.extra) {
		return nil
	}
	return &s.extra[id.Index]
}

func (s *Sim) SetNoclip(id entity.EntityID, v bool) {
	if e := s.extraOf(id); e != nil {
		e.Noclip = v
	}
}

func (s *Sim) SetPortal(id entity.EntityID, v bool) {
	if e := s.extraOf(id); e != nil {
		e.IsPortal = v
	}
}

func (s *Sim) SetDominator(id entity.EntityID, v bool) {
	if e := s.extraOf(id); e != nil {
		e.IsDominator = v
	}
}

func (s *Sim) SetAlwaysActive(id entity.EntityID, v bool) {
	if e := s.extraOf(id); e != nil {
		e.AlwaysActive = v
	}
}

func (s *Sim) SetAssemblerLevel(id entity.EntityID, v int32) {
	if e := s.extraOf(id); e != nil {
		e.AssemblerLevel = v
	}
}

func (s *Sim) AssemblerLevel(id entity.EntityID) int32 {
	if e := s.extraOf(id); e != nil {
		return e.AssemblerLevel
	}
	return 0
}

func (s *Sim) Zombified(id entity.EntityID) bool {
	if e := s.extraOf(id); e != nil {
		return e.Zombified
	}
	return false
}

func (s *Sim) DontSendDeathMessage(id entity.EntityID) bool {
	if e := s.extraOf(id); e != nil {
		return e.DontSendDeathMessage
	}
	return false
}

func (s *Sim) SetDontSendDeathMessage(id entity.EntityID, v bool) {
	if e := s.extraOf(id); e != nil {
		e.DontSendDeathMessage = v
	}
}

func (s *Sim) JustHitAWall(id entity.EntityID) bool {
	if e := s.extraOf(id); e != nil {
		return e.JustHittedAWall
	}
	return false
}

func (s *Sim) ClearJustHitAWall(id entity.EntityID) {
	if e := s.extraOf(id); e != nil {
		e.JustHittedAWall = false
	}
}

// ConsumeWallHit is a one-shot with 300ms cooldown.
func (s *Sim) ConsumeWallHit(id entity.EntityID) bool {
	x := s.extraOf(id)
	if x == nil {
		return false
	}
	now := s.now()
	if x.WallHitReadyAt != 0 && now >= x.WallHitReadyAt {
		// The timer fired: back to "ready", and it clears the flag on its way out.
		x.WallHitReadyAt = 0
		x.JustHittedAWall = false
	}
	if !x.JustHittedAWall || x.WallHitReadyAt != 0 {
		return false
	}
	x.JustHittedAWall = false
	x.WallHitReadyAt = now + 300
	return true
}

func (s *Sim) sizeContext() entity.SizeContext {
	return entity.SizeContext{
		Tuning:          s.Tuning,
		Growth:          s.Gamemode.Growth,
		GenericTankSIZE: s.GenericTankSIZE,
	}
}

func (s *Sim) size(id entity.EntityID) float64 {
	return float64(s.W.ComputeSize(id, s.sizeContext()))
}

func (s *Sim) realSize(id entity.EntityID) float64 {
	e := s.W.Get(id)
	if e == nil {
		return 0
	}
	return s.size(id) * lazyRealSize(e.Shape)
}

func (s *Sim) mass(id entity.EntityID) float64 {
	e := s.W.Get(id)
	if e == nil {
		return 0
	}
	sz := s.size(id)
	return e.Density * (sz*sz + 1)
}

func (s *Sim) xMotion(i uint32) float64 {
	return (float64(s.W.Vel[i].X) + float64(s.W.Accel[i].X)) / s.RoomSpeed
}

func (s *Sim) yMotion(i uint32) float64 {
	return (float64(s.W.Vel[i].Y) + float64(s.W.Accel[i].Y)) / s.RoomSpeed
}

func (s *Sim) addAccel(i uint32, dx, dy float64) {
	a := s.W.Accel[i].Scrub()
	s.W.Accel[i].X = float64(float64(a.X) + dx)
	s.W.Accel[i].Y = float64(float64(a.Y) + dy)
	if s.Hooks.WatchAccel != nil {
		id, _ := s.W.IDAt(i)
		s.Hooks.WatchAccel(id, dx, dy, float64(s.W.Accel[i].X), float64(s.W.Accel[i].Y))
	}
}

func (s *Sim) addVel(i uint32, dx, dy float64) {
	v := s.W.Vel[i].Scrub()
	s.W.Vel[i].X = float64(float64(v.X) + dx)
	s.W.Vel[i].Y = float64(float64(v.Y) + dy)
}

func (s *Sim) velLength(i uint32) float64 {
	v := s.W.Vel[i].Scrub()
	return jsLength(float64(v.X), float64(v.Y))
}

// lazyRealSizes is the ratio between polygon circumradius and equal-area circle radius for 0-16 sides.
var lazyRealSizes = [17]float64{
	1,
	1,
	1,
	1.555120301556214,
	1.2533141373155001,
	1.1494809261913177,
	1.0996361107912678,
	1.0714806610543792,
	1.0539073652554058,
	1.0421612740922663,
	1.0339048951018632,
	1.0278723321517336,
	1.0233267079464885,
	1.0198142922307971,
	1.0170427991322668,
	1.0148168150758279,
	1.0130015562559769,
}

func lazyRealSize(shape float64) float64 {
	i := math.Floor(math.Abs(shape))
	if math.IsNaN(i) {
		return math.NaN()
	}
	if i < float64(len(lazyRealSizes)) {
		return lazyRealSizes[int(i)]
	}
	circum := 2 * math.Pi / i
	return math.Sqrt(circum * (1 / jsmath.Sin(circum)))
}

func toInt32(f float64) int32 {
	if math.IsNaN(f) || math.IsInf(f, 0) {
		return 0
	}
	return int32(uint32(int64(math.Trunc(f))))
}

func b2f(b bool) float64 {
	if b {
		return 1
	}
	return 0
}
