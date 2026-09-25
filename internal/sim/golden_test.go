package sim

import (
	"encoding/json"
	"math"

	"os"
	"path/filepath"
	"strconv"
	"testing"

	"arrasgo/internal/config"
	"arrasgo/internal/entity"
	"arrasgo/internal/spatial"
	"arrasgo/internal/vmath"
)

// jsNowMS is the timestamp tools/gen-sim-vectors.js passes to runMove.
const jsNowMS = 1234567

// These vectors come from running the real js-src. see tools/gen-sim-vectors.js.
// Comparison is against float64 values to match the original.

// jsNum handles "NaN" and "Infinity" in JSON where needed.
type jsNum float64

func (n *jsNum) UnmarshalJSON(b []byte) error {
	if len(b) > 0 && b[0] == '"' {
		var s string
		if err := json.Unmarshal(b, &s); err != nil {
			return err
		}
		switch s {
		case "NaN":
			*n = jsNum(math.NaN())
		case "Infinity":
			*n = jsNum(math.Inf(1))
		case "-Infinity":
			*n = jsNum(math.Inf(-1))
		default:
			f, err := strconv.ParseFloat(s, 64)
			if err != nil {
				return err
			}
			*n = jsNum(f)
		}
		return nil
	}
	var f float64
	if err := json.Unmarshal(b, &f); err != nil {
		return err
	}
	*n = jsNum(f)
	return nil
}

type simVectors struct {
	RoomSpeed jsNum `json:"roomSpeed"`
	RunSpeed  jsNum `json:"runSpeed"`
	Config    struct {
		RoomBoundForce      jsNum `json:"room_bound_force"`
		DamageMultiplier    jsNum `json:"damage_multiplier"`
		KnockbackMultiplier jsNum `json:"knockback_multiplier"`
		RunSpeed            jsNum `json:"run_speed"`
	} `json:"config"`
	Room struct {
		Width  jsNum `json:"width"`
		Height jsNum `json:"height"`
	} `json:"room"`
	LazyRealSizes []jsNum       `json:"lazyRealSizes"`
	Single        []soloVec     `json:"single"`
	Pairs         []pairVec     `json:"pairs"`
	HarnessSteps  *harnessSteps `json:"harnessSteps"`
}

type soloVec struct {
	Name       string   `json:"name"`
	Note       string   `json:"note"`
	RoundArena bool     `json:"roundArena"`
	Input      bodyVec  `json:"input"`
	After      stateVec `json:"after"`
}

type pairVec struct {
	Name  string `json:"name"`
	Note  string `json:"note"`
	Input struct {
		A bodyVec `json:"a"`
		B bodyVec `json:"b"`
	} `json:"input"`
	After struct {
		A stateVec `json:"a"`
		B stateVec `json:"b"`
	} `json:"after"`
}

type healthVec struct {
	Max    jsNum  `json:"max"`
	Amount jsNum  `json:"amount"`
	Type   string `json:"type"`
	Resist jsNum  `json:"resist"`
	Regen  jsNum  `json:"regen"`
}

type bodyVec struct {
	ID       int    `json:"id"`
	Label    string `json:"label"`
	Type     string `json:"type"`
	Team     int32  `json:"team"`
	Shape    jsNum  `json:"shape"`
	Walltype int32  `json:"walltype"`

	X, Y          jsNum `json:"-"`
	Xv            jsNum `json:"x"`
	Yv            jsNum `json:"y"`
	VX            jsNum `json:"vx"`
	VY            jsNum `json:"vy"`
	AX            jsNum `json:"ax"`
	AY            jsNum `json:"ay"`
	StepRemaining jsNum `json:"stepRemaining"`

	SIZE           jsNum `json:"SIZE"`
	SizeMultiplier jsNum `json:"sizeMultiplier"`
	FOV            jsNum `json:"FOV"`

	Acceleration     jsNum `json:"acceleration"`
	TopSpeed         jsNum `json:"topSpeed"`
	MaxSpeed         jsNum `json:"maxSpeed"`
	Damp             jsNum `json:"damp"`
	Density          jsNum `json:"density"`
	Penetration      jsNum `json:"penetration"`
	Damage           jsNum `json:"damage"`
	Pushability      jsNum `json:"pushability"`
	Knockback        jsNum `json:"knockback"`
	Intangibility    jsNum `json:"intangibility"`
	HeteroMultiplier jsNum `json:"heteroMultiplier"`
	Range            jsNum `json:"range"`
	RANGE            jsNum `json:"RANGE"`
	DamageReceived   jsNum `json:"damageReceived"`
	Alpha            jsNum `json:"alpha"`

	Healer        bool `json:"healer"`
	IsArenaCloser bool `json:"isArenaCloser"`
	AC            bool `json:"ac"`
	Invuln        bool `json:"invuln"`
	Godmode       bool `json:"godmode"`

	IsPlayer    bool `json:"isPlayer"`
	Braindamage bool `json:"braindamage"`

	Facing           jsNum    `json:"facing"`
	ReverseTank      jsNum    `json:"reverseTank"`
	FiringArc        [2]jsNum `json:"firingArc"`
	LastMovementTime jsNum    `json:"lastMovementTime"`
	LastFiredTime    jsNum    `json:"lastFiredTime"`

	MotionType     string `json:"motionType"`
	MotionTypeArgs struct {
		Speed        *jsNum `json:"speed"`
		Damp         *jsNum `json:"damp"`
		TurnVelocity *jsNum `json:"turnVelocity"`
		KeepSpeed    bool   `json:"keepSpeed"`
	} `json:"motionTypeArgs"`
	FacingType     string `json:"facingType"`
	FacingTypeArgs struct {
		Angle      *jsNum `json:"angle"`
		Multiplier *jsNum `json:"multiplier"`
		Smoothness *jsNum `json:"smoothness"`
		Speed      *jsNum `json:"speed"`
	} `json:"facingTypeArgs"`
	Control struct {
		TargetX jsNum `json:"targetX"`
		TargetY jsNum `json:"targetY"`
		GoalX   jsNum `json:"goalX"`
		GoalY   jsNum `json:"goalY"`
		Main    bool  `json:"main"`
		Alt     bool  `json:"alt"`
		Fire    bool  `json:"fire"`
		Power   jsNum `json:"power"`
	} `json:"control"`

	Health healthVec `json:"health"`
	Shield healthVec `json:"shield"`

	Settings struct {
		CanGoOutsideRoom bool    `json:"canGoOutsideRoom"`
		RatioEffects     bool    `json:"ratioEffects"`
		DamageEffects    bool    `json:"damageEffects"`
		MotionEffects    bool    `json:"motionEffects"`
		DamageClass      int32   `json:"damageClass"`
		BuffVsFood       bool    `json:"buffVsFood"`
		NecroTypes       []int32 `json:"necroTypes"`
		HitsOwnType      string  `json:"hitsOwnType"`
		DiesAtRange      bool    `json:"diesAtRange"`
		DiesAtLowSpeed   bool    `json:"diesAtLowSpeed"`
	} `json:"settings"`
}

type stateVec struct {
	X                jsNum `json:"x"`
	Y                jsNum `json:"y"`
	VX               jsNum `json:"vx"`
	VY               jsNum `json:"vy"`
	AX               jsNum `json:"ax"`
	AY               jsNum `json:"ay"`
	StepRemaining    jsNum `json:"stepRemaining"`
	DamageReceived   jsNum `json:"damageReceived"`
	Health           jsNum `json:"health"`
	Shield           jsNum `json:"shield"`
	SIZE             jsNum `json:"SIZE"`
	FOV              jsNum `json:"FOV"`
	Facing           jsNum `json:"facing"`
	VFacing          jsNum `json:"vfacing"`
	MaxSpeed         jsNum `json:"maxSpeed"`
	Damp             jsNum `json:"damp"`
	LastMovementTime jsNum `json:"lastMovementTime"`
	LastFiredTime    jsNum `json:"lastFiredTime"`
	Collisions       int   `json:"collisions"`
	Destroyed        bool  `json:"destroyed"`
	// null in JSON is JS undefined, not false.
	TouchingSizeWall *bool `json:"touchingSizeWall"`
	TouchingFovWall  *bool `json:"touchingFovWall"`

	// Only the mortality scenarios set these.
	Mortality *int   `json:"mortality"`
	Blend     *jsNum `json:"blend"`
	Range     *jsNum `json:"range"`
}

func loadSimVectors(t *testing.T) *simVectors {
	t.Helper()
	path := filepath.Join("..", "..", "gen", "sim-vectors.json")
	raw, err := os.ReadFile(path)
	if err != nil {
		t.Skipf("no golden vectors at %s; run `node tools/gen-sim-vectors.js` (%v)", path, err)
	}
	var v simVectors
	if err := json.Unmarshal(raw, &v); err != nil {
		t.Fatalf("parsing %s: %v", path, err)
	}
	return &v
}

// newGoldenSim builds a Sim configured the way tools/gen-sim-vectors.js configures the
// JS globals.
func newGoldenSim(v *simVectors, roundArena bool) *Sim {
	tuning := &config.Tuning{
		RunSpeed:            float64(v.Config.RunSpeed),
		RoomBoundForce:      float64(v.Config.RoomBoundForce),
		DamageMultiplier:    float64(v.Config.DamageMultiplier),
		KnockbackMultiplier: float64(v.Config.KnockbackMultiplier),
		RoundArena:          roundArena,
		SkillCap:            9,
		GlassHealthFactor:   1,
		LevelCap:            45,
	}
	w := entity.NewWorld(8)
	w.Tuning = tuning
	w.Room = entity.RoomInfo{Width: float64(v.Room.Width), Height: float64(v.Room.Height)}
	w.Now = func() int64 { return 0 }

	s := New(w, spatial.New(7))
	s.Tuning = tuning
	s.Room = Room{Width: float64(v.Room.Width), Height: float64(v.Room.Height)}
	s.RoomSpeed = float64(v.RoomSpeed)
	s.RunSpeed = float64(v.RunSpeed)
	return s
}

// spawnFrom rebuilds one generator body inside the Go world.
func (s *Sim) spawnFrom(b bodyVec) entity.EntityID {
	id := s.W.Spawn()
	s.Track(id)
	e := s.W.Get(id)

	e.Label = b.Label
	e.Type = b.Type
	e.Team = b.Team
	e.Shape = float64(b.Shape)
	e.Walltype = b.Walltype

	i := id.Index
	s.W.Pos[i].X, s.W.Pos[i].Y = float64(b.Xv), float64(b.Yv)
	s.W.Vel[i].X, s.W.Vel[i].Y = float64(b.VX), float64(b.VY)
	s.W.Accel[i].X, s.W.Accel[i].Y = float64(b.AX), float64(b.AY)
	e.StepRemaining = float64(b.StepRemaining)

	e.SIZE = float64(b.SIZE)
	e.SizeMultiplier = float64(b.SizeMultiplier)
	e.FOV = float64(b.FOV)

	e.Acceleration = float64(b.Acceleration)
	e.TopSpeed = float64(b.TopSpeed)
	e.MaxSpeed = float64(b.MaxSpeed)
	e.Damp = float64(b.Damp)
	e.Density = float64(b.Density)
	e.Penetration = float64(b.Penetration)
	e.Damage = float64(b.Damage)
	e.Pushability = float64(b.Pushability)
	e.Knockback = float64(b.Knockback)
	e.Intangibility = float64(b.Intangibility)
	e.HeteroMultiplier = float64(b.HeteroMultiplier)
	e.Range = float64(b.Range)
	e.RANGE = float64(b.RANGE)
	e.DamageReceived = float64(b.DamageReceived)
	e.Alpha = float64(b.Alpha)

	e.Healer = b.Healer
	e.IsArenaCloser = b.IsArenaCloser
	e.AC = b.AC
	e.Invuln = b.Invuln
	e.Godmode = b.Godmode

	e.Health = healthFrom(b.Health)
	e.Shield = healthFrom(b.Shield)

	if b.IsPlayer {
		s.W.Flag[i] |= entity.FlagPlayer
	}
	e.Eastereggs.Braindamage = b.Braindamage
	e.Facing = float64(b.Facing)
	e.ReverseTank = float64(b.ReverseTank)
	e.FiringArc = [2]float64{float64(b.FiringArc[0]), float64(b.FiringArc[1])}
	e.LastMovementTime = int64(b.LastMovementTime)
	e.LastFiredTime = int64(b.LastFiredTime)

	e.MotionType = b.MotionType
	e.MotionTypeArgs.Speed, e.MotionTypeArgs.HasSpeed = opt(b.MotionTypeArgs.Speed)
	e.MotionTypeArgs.Damp, e.MotionTypeArgs.HasDamp = opt(b.MotionTypeArgs.Damp)
	e.MotionTypeArgs.TurnVelocity, e.MotionTypeArgs.HasTurnVelocity = opt(b.MotionTypeArgs.TurnVelocity)
	e.MotionTypeArgs.KeepSpeed = b.MotionTypeArgs.KeepSpeed

	e.FacingType = b.FacingType
	e.FacingTypeArgs.Angle, e.FacingTypeArgs.HasAngle = opt(b.FacingTypeArgs.Angle)
	e.FacingTypeArgs.Multiplier, e.FacingTypeArgs.HasMultiplier = opt(b.FacingTypeArgs.Multiplier)
	e.FacingTypeArgs.Smoothness, e.FacingTypeArgs.HasSmoothness = opt(b.FacingTypeArgs.Smoothness)
	e.FacingTypeArgs.Speed, e.FacingTypeArgs.HasSpeed = opt(b.FacingTypeArgs.Speed)

	e.Control.Target = vmath.Vec2{X: float64(b.Control.TargetX), Y: float64(b.Control.TargetY)}
	e.Control.Goal = vmath.Vec2{X: float64(b.Control.GoalX), Y: float64(b.Control.GoalY)}
	e.Control.Main = b.Control.Main
	e.Control.Alt = b.Control.Alt
	e.Control.Fire = b.Control.Fire
	e.Control.Power = float64(b.Control.Power)

	e.Settings.CanGoOutsideRoom = b.Settings.CanGoOutsideRoom
	e.Settings.RatioEffects = b.Settings.RatioEffects
	e.Settings.DamageEffects = b.Settings.DamageEffects
	e.Settings.MotionEffects = b.Settings.MotionEffects
	e.Settings.DamageClass = b.Settings.DamageClass
	e.Settings.BuffVsFood = b.Settings.BuffVsFood
	e.Settings.NecroTypes = b.Settings.NecroTypes
	e.Settings.HitsOwnType = b.Settings.HitsOwnType
	e.Settings.DiesAtRange = b.Settings.DiesAtRange
	e.Settings.DiesAtLowSpeed = b.Settings.DiesAtLowSpeed

	s.W.Size[i] = s.W.ComputeSize(id, s.sizeContext())
	return id
}

// opt turns a JSON null into the JS "argument absent", which the `?? default` reads in
// runMove and runFace distinguish from a supplied zero.
func opt(p *jsNum) (float64, bool) {
	if p == nil {
		return 0, false
	}
	return float64(*p), true
}

func healthFrom(h healthVec) entity.HealthType {
	mode := entity.HealthStatic
	if h.Type == "dynamic" {
		mode = entity.HealthDynamic
	}
	out := entity.NewHealthType(float64(h.Max), mode, float64(h.Resist))
	out.Amount = float64(h.Amount)
	out.Regen = float64(h.Regen)
	return out
}

// checkState compares one body against the JS result. Everything the JS reads back
// through a Vector getter is compared after Scrub, because that getter is what turns a
// stored NaN into the zero the JS snapshot recorded.
func checkState(t *testing.T, name, which string, s *Sim, id entity.EntityID, want stateVec, destroyed bool) {
	t.Helper()
	e := s.W.Get(id)
	if e == nil {
		if !destroyed {
			t.Errorf("%s/%s: entity is gone but the JS kept it", name, which)
		}
		return
	}
	if destroyed != want.Destroyed {
		t.Errorf("%s/%s: destroyed = %v, JS said %v", name, which, destroyed, want.Destroyed)
	}
	i := id.Index
	p := s.W.Pos[i].Scrub()
	v := s.W.Vel[i].Scrub()
	a := s.W.Accel[i].Scrub()

	eq64(t, name, which, "x", p.X, want.X)
	eq64(t, name, which, "y", p.Y, want.Y)
	eq64(t, name, which, "vx", v.X, want.VX)
	eq64(t, name, which, "vy", v.Y, want.VY)
	eq64(t, name, which, "ax", a.X, want.AX)
	eq64(t, name, which, "ay", a.Y, want.AY)
	eq64(t, name, which, "stepRemaining", e.StepRemaining, want.StepRemaining)
	eq64(t, name, which, "damageReceived", e.DamageReceived, want.DamageReceived)
	eq64(t, name, which, "health", e.Health.Amount, want.Health)
	eq64(t, name, which, "shield", e.Shield.Amount, want.Shield)
	eq64(t, name, which, "SIZE", e.SIZE, want.SIZE)
	eq64(t, name, which, "FOV", e.FOV, want.FOV)
	eq64(t, name, which, "facing", e.Facing, want.Facing)
	eq64(t, name, which, "vfacing", e.VFacing, want.VFacing)
	eq64(t, name, which, "maxSpeed", e.MaxSpeed, want.MaxSpeed)
	eq64(t, name, which, "damp", e.Damp, want.Damp)
	if e.LastMovementTime != int64(want.LastMovementTime) {
		t.Errorf("%s/%s lastMovementTime = %v, JS gave %v",
			name, which, e.LastMovementTime, float64(want.LastMovementTime))
	}
	if e.LastFiredTime != int64(want.LastFiredTime) {
		t.Errorf("%s/%s lastFiredTime = %v, JS gave %v",
			name, which, e.LastFiredTime, float64(want.LastFiredTime))
	}
	if len(e.CollisionArray) != want.Collisions {
		t.Errorf("%s/%s: collisionArray has %d entries, JS had %d",
			name, which, len(e.CollisionArray), want.Collisions)
	}
}

// eq64 compares float64 fields. internal/jsmath reproduces V8's functions exactly.
const maxULPs = 0

func eq64(t *testing.T, name, which, field string, got float64, want jsNum) {
	t.Helper()
	w := float64(want)
	if math.IsNaN(w) && math.IsNaN(got) {
		return
	}
	if got == w {
		return
	}
	if d := ulpDistance(got, w); d <= maxULPs {
		return
	}
	t.Errorf("%s/%s %s = %v, JS gave %v (%d ulps apart)", name, which, field, got, w, ulpDistance(got, w))
}

// ulpDistance counts representable doubles between two finite values of the same sign.
func ulpDistance(a, b float64) int64 {
	if math.IsInf(a, 0) || math.IsInf(b, 0) || math.IsNaN(a) || math.IsNaN(b) {
		return math.MaxInt64
	}
	ia, ib := int64(math.Float64bits(a)), int64(math.Float64bits(b))
	if (ia < 0) != (ib < 0) {
		// Different signs: only equal magnitudes (both zero) are close.
		if a == b {
			return 0
		}
		return math.MaxInt64
	}
	if ia > ib {
		return ia - ib
	}
	return ib - ia
}

// TestLazyRealSizesMatchJS pins the polygon circumradius table, which realSize and
// every maze wall's half-extent are built on.
func TestLazyRealSizesMatchJS(t *testing.T) {
	v := loadSimVectors(t)
	for i, want := range v.LazyRealSizes {
		got := lazyRealSize(float64(i))
		if got != float64(want) {
			t.Errorf("lazyRealSizes[%d] = %v, JS gave %v", i, got, float64(want))
		}
	}
}

// TestSingleBodyStepsMatchJS runs physics, friction and confinement against the real
// Entity.prototype methods.
func TestSingleBodyStepsMatchJS(t *testing.T) {
	v := loadSimVectors(t)
	for _, sc := range v.Single {
		t.Run(sc.Name, func(t *testing.T) {
			s := newGoldenSim(v, sc.RoundArena)
			id := s.spawnFrom(sc.Input)
			switch {
			case has(sc.Name, "physics."):
				s.Physics(id)
			case has(sc.Name, "friction."):
				s.Friction(id)
			case has(sc.Name, "confine"):
				s.ConfinementToTheseEarthlyShackles(id)
			case has(sc.Name, "runMove."):
				// runMove.withMaster spawns a second body for the source.
				if sc.Name == "runMove.withMaster" {
					src := s.spawnFrom(sc.Input)
					s.W.Pos[src.Index] = vmath.Vec2{X: 40, Y: -60}
					s.W.Vel[src.Index] = vmath.Vec2{X: 2, Y: -3}
					s.W.Get(id).Source = src
				}
				s.RunMove(id, jsNowMS)
			case has(sc.Name, "runFace."):
				s.RunFace(id)
			case has(sc.Name, "mortality."):
				got := 0
				if s.ContemplationOfMortality(id) {
					got = 1
				}
				if sc.After.Mortality != nil && got != *sc.After.Mortality {
					t.Errorf("%s: returned %d, JS returned %d", sc.Name, got, *sc.After.Mortality)
				}
				e := s.W.Get(id)
				if sc.After.Blend != nil {
					eq64(t, sc.Name, "body", "blend", e.Blend.Amount, *sc.After.Blend)
				}
				if sc.After.Range != nil {
					eq64(t, sc.Name, "body", "range", e.Range, *sc.After.Range)
				}
			default:
				t.Fatalf("no runner for %q", sc.Name)
			}
			checkState(t, sc.Name, "body", s, id, sc.After, false)
		})
	}
}

// pairRunner returns the resolver for a scenario name.
func pairRunner(name string) func(s *Sim, a, b entity.EntityID) {
	switch {
	case has(name, "simplecollide."):
		return func(s *Sim, a, b entity.EntityID) { s.Simplecollide(a, b) }
	case has(name, "firmcollide.buffered"):
		return func(s *Sim, a, b entity.EntityID) { s.Firmcollide(a, b, 30) }
	case has(name, "firmcollide."):
		return func(s *Sim, a, b entity.EntityID) { s.Firmcollide(a, b, 0) }
	case has(name, "firmcollidehard."):
		return func(s *Sim, a, b entity.EntityID) { s.Firmcollidehard(a, b, 20) }
	case has(name, "reflectcollide."):
		return func(s *Sim, a, b entity.EntityID) { s.Reflectcollide(a, b) }
	case has(name, "advancedcollide.firmPositive"):
		return func(s *Sim, a, b entity.EntityID) { s.Advancedcollide(a, b, false, false, 1.5) }
	case has(name, "advancedcollide.firmNegative"):
		return func(s *Sim, a, b entity.EntityID) { s.Advancedcollide(a, b, false, false, -2) }
	case has(name, "advancedcollide.knockback"):
		return func(s *Sim, a, b entity.EntityID) { s.Advancedcollide(a, b, false, true, 0) }
	case has(name, "advancedcollide.push"), has(name, "advancedcollide.overlapping"):
		return func(s *Sim, a, b entity.EntityID) { s.Advancedcollide(a, b, false, false, 0) }
	case has(name, "advancedcollide."):
		return func(s *Sim, a, b entity.EntityID) { s.Advancedcollide(a, b, true, true, 0) }
	case has(name, "mooncollide."):
		return func(s *Sim, a, b entity.EntityID) { s.Mooncollide(a, b) }
	case has(name, "mazewallcollide."):
		return func(s *Sim, a, b entity.EntityID) { s.Mazewallcollide(a, b) }
	case has(name, "mazewallcustom."):
		return func(s *Sim, a, b entity.EntityID) { s.Mazewallcustomcollide(a, b) }
	}
	return nil
}

func has(s, prefix string) bool { return len(s) >= len(prefix) && s[:len(prefix)] == prefix }

// TestCollisionResolversMatchJS is the main event: every resolver in
// collisionFunctions.js, run on both sides from the same inputs.
func TestCollisionResolversMatchJS(t *testing.T) {
	v := loadSimVectors(t)
	for _, sc := range v.Pairs {
		run := pairRunner(sc.Name)
		if run == nil {
			t.Errorf("no runner for %q — a new scenario needs one here", sc.Name)
			continue
		}
		t.Run(sc.Name, func(t *testing.T) {
			s := newGoldenSim(v, false)
			var destroyedA, destroyedB bool
			a := s.spawnFrom(sc.Input.A)
			b := s.spawnFrom(sc.Input.B)
			s.Hooks.Destroy = func(id entity.EntityID) {
				if id == a {
					destroyedA = true
				}
				if id == b {
					destroyedB = true
				}
				s.W.Destroy(id)
			}
			run(s, a, b)
			checkState(t, sc.Name, "a", s, a, sc.After.A, destroyedA)
			checkState(t, sc.Name, "b", s, b, sc.After.B, destroyedB)
			checkTouching(t, sc.Name, s, a, sc.After.A)
			checkTouching(t, sc.Name, s, b, sc.After.B)
		})
	}
}

// checkTouching compares tri-state wall flags.
func checkTouching(t *testing.T, name string, s *Sim, id entity.EntityID, want stateVec) {
	t.Helper()
	x := s.extraOf(id)
	if x == nil {
		return
	}
	check := func(field string, got triState, w *bool) {
		switch {
		case w == nil:
			if got != triUnset {
				t.Errorf("%s: %s = %v, JS left it undefined", name, field, got)
			}
		case *w:
			if !got.isTrue() {
				t.Errorf("%s: %s = %v, JS said true", name, field, got)
			}
		default:
			if !got.isFalse() {
				t.Errorf("%s: %s = %v, JS said false", name, field, got)
			}
		}
	}
	check("touchingSizeWall", x.touchingSizeWall, want.TouchingSizeWall)
	check("touchingFovWall", x.touchingFovWall, want.TouchingFovWall)
}

type harnessSteps struct {
	Ticks       int             `json:"ticks"`
	Considered  int             `json:"considered"`
	PhysicsOnly int             `json:"physicsOnly"`
	RoomSpeed   jsNum           `json:"roomSpeed"`
	Samples     []harnessSample `json:"samples"`
}

type harnessSample struct {
	Tick   int    `json:"tick"`
	ID     int    `json:"id"`
	Type   string `json:"type"`
	X      jsNum  `json:"x"`
	Y      jsNum  `json:"y"`
	VX     jsNum  `json:"vx"`
	VY     jsNum  `json:"vy"`
	AX     jsNum  `json:"ax"`
	AY     jsNum  `json:"ay"`
	NextX  jsNum  `json:"nextX"`
	NextY  jsNum  `json:"nextY"`
	NextVX jsNum  `json:"nextVX"`
	NextVY jsNum  `json:"nextVY"`
}

// TestPhysicsStepMatchesHarness replays real entity-ticks from a 300-tick harness run.
func TestPhysicsStepMatchesHarness(t *testing.T) {
	v := loadSimVectors(t)
	if v.HarnessSteps == nil || len(v.HarnessSteps.Samples) == 0 {
		t.Skip("no harness samples; run `node tools/harness/setup.js` then `node tools/gen-sim-vectors.js`")
	}
	h := v.HarnessSteps
	for _, s := range h.Samples {
		x, y, vx, vy := PhysicsStep(
			float64(s.X), float64(s.Y),
			float64(s.VX), float64(s.VY),
			float64(s.AX), float64(s.AY),
			float64(h.RoomSpeed))
		near(t, s, "vx", vx, float64(s.NextVX))
		near(t, s, "vy", vy, float64(s.NextVY))
		near(t, s, "x", x, float64(s.NextX))
		near(t, s, "y", y, float64(s.NextY))
	}
	t.Logf("%d samples over %d ticks; %d of %d entity-ticks in that run were physics-only",
		len(h.Samples), h.Ticks, h.PhysicsOnly, h.Considered)
}

func near(t *testing.T, s harnessSample, field string, got, want float64) {
	t.Helper()
	if got == want || ulpDistance(got, want) <= maxULPs {
		return
	}
	t.Errorf("tick %d entity %d (%s) %s = %v, harness had %v (%d ulps apart)",
		s.Tick, s.ID, s.Type, field, got, want, ulpDistance(got, want))
}

// TestHotArrayPrecisionOnRealData measures float64 hot arrays cost on real data.
func TestHotArrayPrecisionOnRealData(t *testing.T) {
	v := loadSimVectors(t)
	if v.HarnessSteps == nil || len(v.HarnessSteps.Samples) == 0 {
		t.Skip("no harness samples")
	}
	s := newGoldenSim(v, false)
	s.RoomSpeed = float64(v.HarnessSteps.RoomSpeed)

	var worstPos, worstVel float64
	for _, hs := range v.HarnessSteps.Samples {
		id := s.W.Spawn()
		s.Track(id)
		i := id.Index
		s.W.Pos[i] = vmath.Vec2{X: float64(hs.X), Y: float64(hs.Y)}
		s.W.Vel[i] = vmath.Vec2{X: float64(hs.VX), Y: float64(hs.VY)}
		s.W.Accel[i] = vmath.Vec2{X: float64(hs.AX), Y: float64(hs.AY)}
		s.Physics(id)

		worstPos = math.Max(worstPos, math.Abs(float64(s.W.Pos[i].X)-float64(hs.NextX)))
		worstPos = math.Max(worstPos, math.Abs(float64(s.W.Pos[i].Y)-float64(hs.NextY)))
		worstVel = math.Max(worstVel, math.Abs(float64(s.W.Vel[i].X)-float64(hs.NextVX)))
		worstVel = math.Max(worstVel, math.Abs(float64(s.W.Vel[i].Y)-float64(hs.NextVY)))
		s.W.Destroy(id)
	}
	t.Logf("float64 hot arrays cost at most %.3g units of position and %.3g of velocity "+
		"per step over %d real samples", worstPos, worstVel, len(v.HarnessSteps.Samples))
	if worstPos > 0.01 {
		t.Errorf("float64 storage lost %.4g units of position, which is more than rounding", worstPos)
	}
}
