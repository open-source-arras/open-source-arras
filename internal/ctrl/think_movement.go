package ctrl

import (
	"math"

	"arrasgo/internal/jsmath"

	"arrasgo/internal/entity"
	"arrasgo/internal/jsutil"
	"arrasgo/internal/vmath"
)

func newSiegeAI(ctx *Context, opts Opts) State { return State{SiegeEnabled: true} }

// thinkSiegeAI parks at stopAI tiles.
func thinkSiegeAI(st *State, ctx *Context, input Decision) Decision {
	if ctx.World.Get(ctx.Body) == nil {
		return Decision{}
	}
	if st.SiegeEnabled && ctx.IsStopAIZone != nil {
		p := ctx.World.Pos[ctx.Body.Index]
		if ctx.IsStopAIZone(p) {
			st.SiegeEnabled = false
		}
	}
	if st.SiegeEnabled {
		return Decision{Goal: ctx.RoomCenter, HasGoal: true}
	}
	return Decision{}
}

func newMoveInCircles(ctx *Context, opts Opts) State {
	timer := int32(ctx.Rand.Irandom(5) + 3)
	pathAngle := ctx.Rand.Random(2 * math.Pi)
	var goal vmath.Vec2
	if ctx.World.Get(ctx.Body) != nil {
		p := ctx.World.Pos[ctx.Body.Index]
		goal = vmath.Vec2{X: p.X + float64(10*jsmath.Cos(pathAngle)), Y: p.Y + float64(10*jsmath.Sin(pathAngle))}
	}
	return State{CirclesTimer: timer, CirclesPathAngle: pathAngle, CirclesGoal: goal}
}

// thinkMoveInCircles is controllers.js:150.
func thinkMoveInCircles(st *State, ctx *Context, input Decision) Decision {
	e := ctx.World.Get(ctx.Body)
	if e == nil {
		return Decision{}
	}
	wasZero := st.CirclesTimer == 0
	st.CirclesTimer--
	if wasZero {
		st.CirclesTimer = 5
		p := ctx.World.Pos[ctx.Body.Index]
		st.CirclesGoal = vmath.Vec2{
			X: p.X + float64(10*jsmath.Cos(st.CirclesPathAngle)),
			Y: p.Y + float64(10*jsmath.Sin(st.CirclesPathAngle)),
		}
		v := ctx.World.Vel[ctx.Body.Index]
		velLen := jsmath.Length(float64(v.X), float64(v.Y))
		// "turnWithSpeed turn speed (but condensed over 5 ticks)" from controllers.js:156.
		st.CirclesPathAngle -= (velLen / 90 * math.Pi) / ctx.RunSpeed * 5
	}
	power := 1.0
	if e.ACCELERATION > 0.1 {
		power = 0.2
	}
	return Decision{Goal: st.CirclesGoal, HasGoal: true, Power: float64(power), HasPower: true}
}

func newBoomerang(ctx *Context, opts Opts) State {
	var master entity.EntityID
	var goal vmath.Vec2
	if e := ctx.World.Get(ctx.Body); e != nil {
		master = e.Master
		if m := ctx.World.Get(master); m != nil {
			mp := ctx.World.Pos[master.Index]
			goal = vmath.Vec2{X: 3*m.Control.Target.X + mp.X, Y: 3*m.Control.Target.Y + mp.Y}
		}
	}
	return State{BoomerangMaster: master, BoomerangGoal: goal}
}

func thinkBoomerang(st *State, ctx *Context, input Decision) Decision {
	e := ctx.World.Get(ctx.Body)
	if e == nil {
		return Decision{}
	}
	if e.Range > st.BoomerangR {
		st.BoomerangR = e.Range
	}
	if !st.BoomerangTurnover {
		if st.BoomerangR != 0 && e.Range < st.BoomerangR*0.5 {
			st.BoomerangTurnover = true
		}
		return Decision{Goal: st.BoomerangGoal, HasGoal: true, Power: 1, HasPower: true}
	}
	var goal vmath.Vec2
	if ctx.World.Get(st.BoomerangMaster) != nil {
		goal = ctx.World.Pos[st.BoomerangMaster.Index]
	}
	return Decision{Goal: goal, HasGoal: true, Power: 1, HasPower: true}
}

func newGoToMasterTarget(ctx *Context, opts Opts) State {
	var goal vmath.Vec2
	if e := ctx.World.Get(ctx.Body); e != nil {
		if master := ctx.World.Get(e.Master); master != nil {
			mp := ctx.World.Pos[e.Master.Index]
			reverse := float64(master.ReverseTank)
			goal = vmath.Vec2{X: mp.X + master.Control.Target.X*reverse, Y: mp.Y + master.Control.Target.Y*reverse}
		}
	}
	return State{GoToMasterGoal: goal, GoToMasterCountdown: 5}
}

func thinkGoToMasterTarget(st *State, ctx *Context, input Decision) Decision {
	if st.GoToMasterCountdown == 0 {
		return Decision{}
	}
	if ctx.World.Get(ctx.Body) == nil {
		return Decision{}
	}
	p := ctx.World.Pos[ctx.Body.Index]
	if jsutil.GetDistance(p, st.GoToMasterGoal) < 5 {
		st.GoToMasterCountdown--
	}
	return Decision{Goal: st.GoToMasterGoal, HasGoal: true}
}

func newHangOutNearMaster(ctx *Context, opts Opts) State {
	var goal vmath.Vec2
	if e := ctx.World.Get(ctx.Body); e != nil {
		if ctx.World.Get(e.Source) != nil {
			goal = ctx.World.Pos[e.Source.Index]
		}
	}
	return State{HangGoal: goal}
}

// thinkHangOutNearMaster is controllers.js:837.
func thinkHangOutNearMaster(st *State, ctx *Context, input Decision) Decision {
	e := ctx.World.Get(ctx.Body)
	if e == nil {
		return Decision{}
	}
	if e.Invisible[1] != 0 {
		return Decision{}
	}
	if e.Source == ctx.Body {
		return Decision{}
	}
	if ctx.World.Get(e.Source) == nil {
		return Decision{}
	}

	bodySize := ctx.size(ctx.Body)
	srcSize := ctx.size(e.Source)
	bound1 := hangOutOrbit*0.8 + srcSize + bodySize
	bound2 := hangOutOrbit*1.5 + srcSize + bodySize

	p := ctx.World.Pos[ctx.Body.Index]
	sp := ctx.World.Pos[e.Source.Index]
	dist := float64(jsutil.GetDistance(p, sp)) + math.Pi/8

	goalToReturn := st.HangGoal

	if dist > bound2 || st.HangTimer > 30 {
		st.HangTimer = 0
		dir := float64(jsutil.GetDirection(p, sp)) + math.Pi*ctx.Rand.Random(0.5)
		length := ctx.Rand.RandomRange(bound1, bound2)
		st.HangGoal = vmath.Vec2{
			X: sp.X - float64(length*jsmath.Cos(dir)),
			Y: sp.Y - float64(length*jsmath.Sin(dir)),
		}
	}

	v := ctx.World.Vel[ctx.Body.Index]
	out := Decision{Target: v, HasTarget: true, Goal: goalToReturn, HasGoal: true}
	if dist < bound2 {
		out.Power, out.HasPower = 0.15, true
		if ctx.Rand.Chance(0.3) {
			st.HangTimer++
		}
	}
	return out
}

func newFleeAtLowHealth(ctx *Context, opts Opts) State {
	return State{Fear: jsutil.Clamp(ctx.Rand.Gauss(0.7, 0.15), 0.1, 0.9)}
}

func thinkFleeAtLowHealth(st *State, ctx *Context, input Decision) Decision {
	if !(input.HasFire && input.Fire && input.HasTarget) {
		return Decision{}
	}
	e := ctx.World.Get(ctx.Body)
	if e == nil {
		return Decision{}
	}
	if e.Health.Amount < e.Health.Max*st.Fear {
		p := ctx.World.Pos[ctx.Body.Index]
		return Decision{Goal: vmath.Vec2{X: p.X - input.Target.X, Y: p.Y - input.Target.Y}, HasGoal: true}
	}
	return Decision{}
}

func newMinion(ctx *Context, opts Opts) State {
	return State{MinionTurnwise: 1, MinionTurnwiseRange: opts.TurnwiseRange, HasTurnwiseRange: opts.HasTurnwiseRange}
}

func thinkMinion(st *State, ctx *Context, input Decision) Decision {
	e := ctx.World.Get(ctx.Body)
	if e == nil {
		return Decision{}
	}
	if e.AISettings.ReverseDirection && ctx.Rand.Chance(0.005) {
		st.MinionTurnwise = -1 * st.MinionTurnwise
	}
	if !(input.HasTarget && ((input.HasAlt && input.Alt) || (input.HasMain && input.Main))) {
		return Decision{}
	}
	master := ctx.World.Get(e.Master)
	if master == nil {
		return Decision{}
	}
	masterSize := ctx.size(e.Master)
	bodySize := ctx.size(ctx.Body)
	sizeFactor := math.Sqrt(masterSize / master.SIZE)
	leash := 82 * sizeFactor
	orbit := 140 * sizeFactor
	if st.HasTurnwiseRange {
		orbit = st.MinionTurnwiseRange
	}
	repel := 142 * sizeFactor

	target := input.Target
	tLen := float64(target.Length())
	tDir := float64(target.Direction())
	p := ctx.World.Pos[ctx.Body.Index]

	power := 1.0
	var goal vmath.Vec2

	switch {
	case input.HasAlt && input.Alt:
		switch {
		case tLen < leash:
			goal = vmath.Vec2{X: p.X + target.X, Y: p.Y + target.Y}
		case tLen < repel:
			dir := -st.MinionTurnwise*tDir + math.Pi/5
			goal = vmath.Vec2{X: p.X + float64(jsmath.Cos(dir)), Y: p.Y + float64(jsmath.Sin(dir))}
		default:
			goal = vmath.Vec2{X: p.X - target.X, Y: p.Y - target.Y}
		}
	case input.HasMain && input.Main:
		dir := st.MinionTurnwise*tDir + 0.01
		goal = vmath.Vec2{
			X: p.X + target.X - float64(orbit*jsmath.Cos(dir)),
			Y: p.Y + target.Y - float64(orbit*jsmath.Sin(dir)),
		}
		if math.Abs(tLen-orbit) < bodySize*2 {
			power = 0.7
		}
	default:
		return Decision{}
	}
	return Decision{Goal: goal, HasGoal: true, Power: float64(power), HasPower: true}
}

var avoidTypes = map[string]bool{"bullet": true, "drone": true, "swarm": true, "trap": true, "block": true}

func newAvoid(ctx *Context, opts Opts) State { return State{} }

func thinkAvoid(st *State, ctx *Context, input Decision) Decision {
	e := ctx.World.Get(ctx.Body)
	if e == nil {
		return Decision{}
	}
	master := ctx.World.Get(e.Master)
	if master == nil {
		return Decision{}
	}
	masterID := master.WireID
	bodySize := ctx.size(ctx.Body)
	rangeSq := float64(bodySize * bodySize * 100)

	p := ctx.World.Pos[ctx.Body.Index]
	avoidID, found := nearestEntity(ctx.World, ctx.Candidates, p, func(id entity.EntityID, sqrDist float64) bool {
		test := ctx.World.Get(id)
		if test == nil || !avoidTypes[test.Type] {
			return false
		}
		testMaster := ctx.World.Get(test.Master)
		if testMaster == nil || testMaster.WireID == masterID {
			return false
		}
		return sqrDist < rangeSq
	})
	if !found {
		return Decision{}
	}
	ap := ctx.World.Pos[avoidID.Index]
	v := ctx.World.Vel[ctx.Body.Index]
	av := ctx.World.Vel[avoidID.Index]

	deltX, deltY := float64(v.X-av.X), float64(v.Y-av.Y)
	diffX, diffY := float64(ap.X-p.X), float64(ap.Y-p.Y)
	deltLen := jsmath.Length(deltX, deltY)
	diffLen := jsmath.Length(diffX, diffY)
	comp := (deltX*diffX + deltY*diffY) / deltLen / diffLen
	if comp <= 0 {
		return Decision{}
	}

	var goal vmath.Vec2
	if input.HasGoal {
		gx, gy := float64(input.Goal.X), float64(input.Goal.Y)
		goalDist := math.Sqrt(float64(rangeSq) / (gx*gx + gy*gy))
		goal = vmath.Vec2{X: float64(gx*goalDist - diffX*comp), Y: float64(gy*goalDist - diffY*comp)}
	} else {
		goal = vmath.Vec2{X: float64(-diffX * comp), Y: float64(-diffY * comp)}
	}
	return Decision{Goal: goal, HasGoal: true}
}
