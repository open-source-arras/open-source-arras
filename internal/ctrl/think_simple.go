package ctrl

import (
	"math"

	"arrasgo/internal/jsmath"

	"arrasgo/internal/jsutil"
	"arrasgo/internal/vmath"
)

func newDoNothing(ctx *Context, opts Opts) State { return State{} }

func thinkDoNothing(st *State, ctx *Context, input Decision) Decision {
	if ctx.World.Get(ctx.Body) == nil {
		return Decision{}
	}
	p := ctx.World.Pos[ctx.Body.Index]
	return Decision{
		Goal: p, HasGoal: true,
		Main: false, HasMain: true,
		Alt: false, HasAlt: true,
		Fire: false, HasFire: true,
	}
}

func newAlwaysFire(ctx *Context, opts Opts) State { return State{} }

func thinkAlwaysFire(st *State, ctx *Context, input Decision) Decision {
	return Decision{Fire: true, HasFire: true}
}

func newTargetSelf(ctx *Context, opts Opts) State { return State{} }

func thinkTargetSelf(st *State, ctx *Context, input Decision) Decision {
	return Decision{Main: true, HasMain: true, Target: vmath.Vec2{}, HasTarget: true}
}

func newMapAltToFire(ctx *Context, opts Opts) State { return State{} }

func thinkMapAltToFire(st *State, ctx *Context, input Decision) Decision {
	if input.HasAlt && input.Alt {
		return Decision{Fire: true, HasFire: true}
	}
	return Decision{}
}

func newMapFireToAlt(ctx *Context, opts Opts) State {
	return State{OnlyIfHasAltFireGun: opts.OnlyIfHasAltFireGun}
}

func thinkMapFireToAlt(st *State, ctx *Context, input Decision) Decision {
	if !(input.HasFire && input.Fire) {
		return Decision{}
	}
	for _, g := range ctx.Guns {
		if !st.OnlyIfHasAltFireGun || g.AltFire {
			return Decision{Alt: true, HasAlt: true}
		}
	}
	return Decision{}
}

func newOnlyAcceptInArc(ctx *Context, opts Opts) State { return State{} }

func thinkOnlyAcceptInArc(st *State, ctx *Context, input Decision) Decision {
	if !input.HasTarget {
		return Decision{}
	}
	e := ctx.World.Get(ctx.Body)
	if e == nil {
		return Decision{}
	}
	angle := jsmath.Atan2(float64(input.Target.Y), float64(input.Target.X))
	diff := jsutil.AngleDifference(angle, e.FiringArc[0])
	if math.Abs(diff) >= e.FiringArc[1] {
		return Decision{HasFire: true, HasAlt: true, HasMain: true} // all false
	}
	return Decision{}
}

func newMapTargetToGoal(ctx *Context, opts Opts) State { return State{} }

func thinkMapTargetToGoal(st *State, ctx *Context, input Decision) Decision {
	if !((input.HasMain && input.Main) || (input.HasAlt && input.Alt)) {
		return Decision{}
	}
	if ctx.World.Get(ctx.Body) == nil {
		return Decision{}
	}
	p := ctx.World.Pos[ctx.Body.Index]
	return Decision{
		Goal:     vmath.Vec2{X: input.Target.X + p.X, Y: input.Target.Y + p.Y},
		HasGoal:  true,
		Power:    1,
		HasPower: true,
	}
}

func newCanRepel(ctx *Context, opts Opts) State { return State{} }

func thinkCanRepel(st *State, ctx *Context, input Decision) Decision {
	if !(input.HasAlt && input.Alt && input.HasTarget) {
		return Decision{}
	}
	return Decision{
		Target:    vmath.Vec2{X: -input.Target.X, Y: -input.Target.Y},
		HasTarget: true,
		Main:      true,
		HasMain:   true,
	}
}

func newScaleWithMaster(ctx *Context, opts Opts) State {
	return State{ScaleStoredSize: 0}
}

func thinkScaleWithMaster(st *State, ctx *Context, input Decision) Decision {
	e := ctx.World.Get(ctx.Body)
	if e == nil {
		return Decision{}
	}
	if ctx.World.Get(e.Master) == nil {
		return Decision{}
	}
	masterSize := ctx.size(e.Master)
	if masterSize != st.ScaleStoredSize {
		st.ScaleStoredSize = masterSize
		bodySize := ctx.size(ctx.Body)
		e.SIZE = masterSize * bodySize / masterSize
	}
	return Decision{}
}
