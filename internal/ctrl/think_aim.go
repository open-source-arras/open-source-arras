package ctrl

import (
	"math"

	"arrasgo/internal/jsmath"

	"arrasgo/internal/entity"
	"arrasgo/internal/jsutil"
	"arrasgo/internal/vmath"
)

func newStackGuns(ctx *Context, opts Opts) State {
	return State{TimeUntilFire: opts.TimeUntilFire}
}

// thinkStackGuns rotates target into the readiest gun's frame (controllers.js:395-436).
func thinkStackGuns(st *State, ctx *Context, input Decision) Decision {
	if !input.HasTarget {
		return Decision{}
	}
	lowestReadiness := math.Inf(1)
	haveReadiest := false
	var readiestAngle float64
	for i := 0; i < jsGunsMapLength && i < len(ctx.Guns); i++ {
		g := ctx.Guns[i]
		if !g.CanShoot || !g.Stack {
			continue
		}
		readiness := (1 - g.Cycle) / (g.Reload * g.ReloadStat)
		if lowestReadiness > readiness {
			lowestReadiness = readiness
			readiestAngle = g.Angle
			haveReadiest = true
		}
	}
	if !haveReadiest || (st.TimeUntilFire != 0 && st.TimeUntilFire > lowestReadiness) {
		return Decision{}
	}
	tx, ty := float64(input.Target.X), float64(input.Target.Y)
	targetAngle := jsmath.Atan2(ty, tx) - readiestAngle
	targetLength := math.Sqrt(tx*tx + ty*ty)
	return Decision{
		Target: vmath.Vec2{
			X: float64(targetLength * jsmath.Cos(targetAngle)),
			Y: float64(targetLength * jsmath.Sin(targetAngle)),
		},
		HasTarget: true,
	}
}

func newSpin(ctx *Context, opts Opts) State {
	startAngle := 0.0
	if opts.HasStartAngle {
		startAngle = opts.StartAngle
	}
	speed := 0.04
	if opts.HasSpeed {
		speed = opts.Speed
	}
	return State{
		SpinA:            startAngle,
		SpinSpeed:        speed,
		SpinOnlyWhenIdle: opts.OnlyWhenIdle,
		SpinIndependent:  opts.Independent,
	}
}

// thinkSpin free-spins the target unless onlyWhenIdle and input provided (controllers.js:870-893).
func thinkSpin(st *State, ctx *Context, input Decision) Decision {
	if st.SpinOnlyWhenIdle && input.HasTarget {
		st.SpinA = jsmath.Atan2(float64(input.Target.Y), float64(input.Target.X))
		return input
	}
	st.SpinA += st.SpinSpeed
	offset := 0.0
	if st.SpinIndependent {
		if e := ctx.World.Get(ctx.Body); e != nil && e.Bond.Valid() {
			offset = e.Bound.Angle
		}
	}
	a := st.SpinA + offset
	return Decision{
		Target:    vmath.Vec2{X: float64(jsmath.Cos(a)), Y: float64(jsmath.Sin(a))},
		HasTarget: true,
		Main:      true,
		HasMain:   true,
	}
}

func newSpin2(ctx *Context, opts Opts) State {
	speed := 0.04
	if opts.HasSpeed {
		speed = opts.Speed
	}
	reverseOnAlt := true
	if opts.HasReverseOnAlt {
		reverseOnAlt = opts.ReverseOnAlt
	}
	st := State{
		Spin2Speed:           speed,
		Spin2ReverseOnAlt:    reverseOnAlt,
		Spin2ReverseOnTheFly: opts.ReverseOnTheFly,
		Spin2LastAlt:         -1,
	}
	if e := ctx.World.Get(ctx.Body); e != nil {
		master := ctx.World.Get(e.Master)
		alt := master != nil && master.Control.Alt
		reverse := 1.0
		if reverseOnAlt && alt {
			reverse = -1
		}
		e.FacingType = "spin"
		e.FacingTypeArgs = entity.FacingArgs{Speed: speed * reverse, HasSpeed: true}
	}
	return st
}

// thinkSpin2 flips spin direction when alt state changes (controllers.js:894-920).
func thinkSpin2(st *State, ctx *Context, input Decision) Decision {
	if !st.Spin2ReverseOnTheFly || !st.Spin2ReverseOnAlt {
		return Decision{}
	}
	e := ctx.World.Get(ctx.Body)
	if e == nil {
		return Decision{}
	}
	master := ctx.World.Get(e.Master)
	alt := master != nil && master.Control.Alt
	altInt := int8(0)
	if alt {
		altInt = 1
	}
	if st.Spin2LastAlt != altInt {
		reverse := 1.0
		if alt {
			reverse = -1
		}
		e.FacingType = "spin"
		e.FacingTypeArgs = entity.FacingArgs{Speed: st.Spin2Speed * reverse, HasSpeed: true}
		st.Spin2LastAlt = altInt
	}
	return Decision{}
}

func newZoom(ctx *Context, opts Opts) State {
	distance := 275.0
	if opts.HasDistance && opts.Distance != 0 {
		distance = opts.Distance
	}
	return State{ZoomDistance: distance, ZoomDynamic: opts.Dynamic, ZoomPermanent: opts.Permanent}
}

// thinkZoom pulls the camera along aim direction while alt-firing (controllers.js:939-959).
func thinkZoom(st *State, ctx *Context, input Decision) Decision {
	e := ctx.World.Get(ctx.Body)
	if e == nil {
		return Decision{}
	}
	if st.ZoomPermanent || (input.HasAlt && input.Alt && input.HasTarget) {
		if st.ZoomDynamic || !e.HasCameraOverride {
			direction := jsmath.Atan2(float64(input.Target.Y), float64(input.Target.X))
			p := ctx.World.Pos[ctx.Body.Index]
			e.CameraOverrideX = float64(p.X) + st.ZoomDistance*jsmath.Cos(direction)
			e.CameraOverrideY = float64(p.Y) + st.ZoomDistance*jsmath.Sin(direction)
			e.HasCameraOverride = true
		}
	} else {
		e.CameraOverrideX = 0
		e.CameraOverrideY = 0
		e.HasCameraOverride = false
	}
	return Decision{}
}

// formulaSineDefault is io_formulaTarget_sineDefault (controllers.js:1059).
func formulaSineDefault(frame float64) float64 { return jsmath.Sin(frame / 30) }

func newFormulaTarget(ctx *Context, opts Opts) State {
	formula := opts.Formula
	if formula == nil {
		formula = formulaSineDefault
	}
	var origin float64
	if e := ctx.World.Get(ctx.Body); e != nil {
		if opts.MasterAngle {
			if master := ctx.World.Get(e.Master); master != nil {
				origin = master.Facing
			}
		} else {
			origin = e.Facing
		}
	}
	return State{FormulaMasterAngle: opts.MasterAngle, FormulaFn: formula, FormulaOriginAngle: origin}
}

// thinkFormulaTarget advances angle from origin scaled by 1/runSpeed.
func thinkFormulaTarget(st *State, ctx *Context, input Decision) Decision {
	e := ctx.World.Get(ctx.Body)
	if e == nil {
		return Decision{}
	}
	st.FormulaFrame += 1 / ctx.RunSpeed
	angle := st.FormulaOriginAngle + st.FormulaFn(st.FormulaFrame)
	p := ctx.World.Pos[ctx.Body.Index]
	return Decision{
		Goal:    vmath.Vec2{X: p.X + float64(jsmath.Sin(angle)), Y: p.Y + float64(jsmath.Cos(angle))},
		HasGoal: true,
	}
}

func newDisableOnOverride(ctx *Context, opts Opts) State { return State{} }

// thinkDisableOnOverride zeroes DAMAGE while grand-master has autoOverride (controllers.js:1175-1207).
func thinkDisableOnOverride(st *State, ctx *Context, input Decision) Decision {
	e := ctx.World.Get(ctx.Body)
	if e == nil {
		return Decision{}
	}
	if st.DisableInitialAlpha == 0 {
		st.DisableInitialAlpha = e.Alpha
		st.DisableTargetAlpha = st.DisableInitialAlpha
	}

	pacify := false
	if parent := ctx.World.Get(e.Parent); parent != nil {
		if parentMaster := ctx.World.Get(parent.Master); parentMaster != nil {
			if parentMaster.AutoOverride {
				pacify = true
			} else if grand := ctx.World.Get(parentMaster.Master); grand != nil && grand.AutoOverride {
				pacify = true
			}
		}
	}

	switch {
	case pacify && !st.DisableLastPacify:
		st.DisableTargetAlpha = 0
		st.DisableSavedDamage = e.DAMAGE
		e.DAMAGE = 0
		ctx.refreshBodyAttributes(ctx.Body)
	case !pacify && st.DisableLastPacify:
		st.DisableTargetAlpha = st.DisableInitialAlpha
		e.DAMAGE = st.DisableSavedDamage
		ctx.refreshBodyAttributes(ctx.Body)
	}
	st.DisableLastPacify = pacify

	if e.Alpha != st.DisableTargetAlpha {
		e.Alpha += jsutil.Clamp(st.DisableTargetAlpha-e.Alpha, -0.05, 0.05)
	}
	return Decision{}
}
