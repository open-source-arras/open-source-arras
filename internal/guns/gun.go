package guns

import (
	"math"

	"arrasgo/internal/config"
	"arrasgo/internal/defs"
	"arrasgo/internal/entity"
	"arrasgo/internal/jsutil"
	"arrasgo/internal/vmath"
)

type BulletStats struct {
	UseMaster bool
	Fixed     entity.Skill
}

type LastShot struct {
	Time  int64
	Power float64
}

type Gun struct {
	ID     entity.GunID
	Body   entity.EntityID
	Master entity.EntityID

	WireID uint32

	Label string

	Identifier    defs.Identifier
	HasIdentifier bool

	Color       entity.Color
	Alpha       float64
	StrokeWidth float64
	Borderless  bool
	DrawFill    bool
	DrawAbove   bool

	Stack bool

	CanShoot    bool
	OnShoot     string
	Autofire    bool
	AltFire     bool
	FixedReload bool
	Calculator  string
	WaitToCycle bool
	DelaySpawn  bool

	BulletStats BulletStats

	Settings ShootSettings

	CountsOwnKids float64

	SyncsSkills         bool
	NegRecoil           bool
	IndependentChildren bool
	IndependentMaster   bool
	NoEntityLimit       bool
	DestroyOldestChild  bool
	SpawnOffset         float64
	ShootOnDeath        bool

	Length    float64
	Width     float64
	Aspect    float64
	Angle     float64
	Direction float64
	Offset    float64
	Layer     int32

	MaxCycleTimer float64
	CycleTimer    float64
	Position      float64
	Motion        float64
	TrueRecoil    float64
	RecoilDir     float64

	LastShot LastShot

	BulletType      *defs.Definition
	BulletBodyStats defs.BodySpec

	ReloadRateFactor    float64
	ChildrenLimitFactor float64

	Children       []entity.EntityID
	BulletChildren []entity.EntityID
}

type ShootSettings struct {
	Reload   float64
	Recoil   float64
	Shudder  float64
	Size     float64
	Health   float64
	Damage   float64
	Pen      float64
	Speed    float64
	MaxSpeed float64
	Range    float64
	Density  float64
	Spray    float64
	Resist   float64
}

func shootSettingsFrom(s defs.ShootSettings) ShootSettings {
	return ShootSettings{
		Reload:   s.Reload.Or(1),
		Recoil:   s.Recoil.Or(1),
		Shudder:  s.Shudder.Or(1),
		Size:     s.Size.Or(1),
		Health:   s.Health.Or(1),
		Damage:   s.Damage.Or(1),
		Pen:      s.Pen.Or(1),
		Speed:    s.Speed.Or(1),
		MaxSpeed: s.MaxSpeed.Or(1),
		Range:    s.Range.Or(1),
		Density:  s.Density.Or(1),
		Spray:    s.Spray.Or(1),
		Resist:   s.Resist.Or(1),
	}
}

type Deps struct {
	World  *entity.World
	Guns   *Table
	Defs   *defs.Set
	Tuning *config.Tuning
	Rand   *jsutil.Rand

	DisableGuns bool

	Growth          bool
	GenericTankSIZE float64

	AttachControllers func(w *entity.World, id entity.EntityID, list []defs.Controller) error

	OnSpawn func(id entity.EntityID)

	BringToLife func(id entity.EntityID)

	TearDownTurret func(id entity.EntityID)
}

func NewGun(d Deps, body entity.EntityID, spec defs.Gun, disableGuns bool) (entity.GunID, error) {
	g := Gun{
		Body:        body,
		Alpha:       1,
		StrokeWidth: 1,
		DrawFill:    true,
		WireID:      d.World.TakeWireID(),
	}
	if e := d.World.Get(body); e != nil {
		g.Master = e.Source
	} else {
		g.Master = body
	}
	g.Color = entity.NewColorSpec(entity.ColorSpec{
		Base: "grey", HasBase: true,
		HueShift: 0, HasHueShift: true,
		SaturationShift: 1, HasSaturationShift: true,
		BrightnessShift: 0, HasBrightnessShift: true,
		AllowBrightnessInvert: false, HasAllowBrightnessInvert: true,
	}, false)
	g.Stack = true
	g.BulletStats.UseMaster = true

	if props, ok := spec.Properties.Get(); ok {
		g.Autofire = props.Autofire.Or(false)
		g.AltFire = props.AltFire.Or(false)
		g.FixedReload = props.FixedReload.Or(false)
		g.Calculator = props.StatCalculator.Or("default")
		g.WaitToCycle = props.WaitToCycle.Or(false)
		g.DelaySpawn = props.DelaySpawn.Or(g.WaitToCycle)

		if ss, ok := props.ShootSettings.Get(); ok {
			g.Settings = shootSettingsFrom(ss)
		}
		g.CountsOwnKids = props.MaxChildren.Or(0)
		g.NoEntityLimit = props.NoLimitations.Or(false)
		g.SyncsSkills = props.SyncsSkills.Or(false)
		g.NegRecoil = props.NegativeRecoil.Or(false)
		g.IndependentChildren = props.IndependentChildren.Or(false)
		g.IndependentMaster = props.IndependentMaster.Or(false)
		g.Borderless = props.Borderless.Or(false)
		g.DrawFill = true
		g.DestroyOldestChild = props.DestroyOldestChild.Or(false)
		if props.Color.Kind != defs.ColorNone {
			applyColorSpec(&g.Color, props.Color)
		}
		g.SpawnOffset = props.SpawnOffset.Or(d.Tuning.BulletSpawnOffset)
		if v, ok := props.Alpha.Get(); ok {
			g.Alpha = v
		}
		if v, ok := props.StrokeWidth.Get(); ok {
			g.StrokeWidth = v
		}
		if v, ok := props.Borderless.Get(); ok {
			g.Borderless = v
		}
		if v, ok := props.DrawFill.Get(); ok {
			g.DrawFill = v
		}
		g.DrawAbove = props.DrawAbove.Or(false)
		if id, ok := props.Identifier.Get(); ok {
			g.Identifier, g.HasIdentifier = id, true
		}
		g.ShootOnDeath = props.ShootOnDeath.Or(false)

		if props.Type != nil && !disableGuns {
			g.CanShoot = true
			g.Label = props.Label.Or("")
			masterLabel := masterLabelOf(d.World, g.Master)
			flat, bodyStats, noLimit, err := setBulletType(d.Defs, masterLabel, g.Label, g.IndependentChildren, props.Type)
			if err != nil {
				return 0, err
			}
			g.BulletType = flat
			g.BulletBodyStats = bodyStats
			g.NoEntityLimit = g.NoEntityLimit || noLimit
		}
	}

	length, width, aspect, x, y, angle, delay, layer := gunPositionDefaults(spec.Position)
	g.Length = length / 10
	g.Width = width / 10
	g.Aspect = aspect
	off := vmath.Vec2{X: float64(x), Y: float64(y)}
	g.Angle = angle * math.Pi / 180
	g.Direction = float64(off.Direction())
	g.Offset = float64(off.Length()) / 10
	delaySpawnNum := 0.0
	if !g.DelaySpawn {
		delaySpawnNum = 1
	}
	g.MaxCycleTimer = delaySpawnNum - delay
	if math.IsNaN(layer) {
		layer = 0 // gun.js:112's `?? 0` safety net, applied regardless of form
	}
	g.Layer = int32(layer)

	if g.CanShoot {
		g.CycleTimer = g.MaxCycleTimer
		g.TrueRecoil = g.Settings.Recoil
		g.RecoilDir = 0
	}

	id := d.Guns.insert(g)
	if e := d.World.Get(body); e != nil {
		e.Guns = append(e.Guns, id)
	}
	return id, nil
}

func masterLabelOf(w *entity.World, master entity.EntityID) string {
	if e := w.Get(master); e != nil {
		return e.Label
	}
	return ""
}

func gunPositionDefaults(pos defs.GunPosition) (length, width, aspect, x, y, angle, delay, layer float64) {
	nan := math.NaN()
	if pos.FromArray {
		return pos.Length.Or(nan), pos.Width.Or(nan), pos.Aspect.Or(nan),
			pos.X.Or(nan), pos.Y.Or(nan), pos.Angle.Or(nan), pos.Delay.Or(nan), pos.Layer.Or(nan)
	}
	return pos.Length.Or(18), pos.Width.Or(8), pos.Aspect.Or(1),
		pos.X.Or(0), pos.Y.Or(0), pos.Angle.Or(0), pos.Delay.Or(0), pos.Layer.Or(0)
}
