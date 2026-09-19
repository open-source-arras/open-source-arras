package ctrl

import (
	"math"

	"arrasgo/internal/jsmath"

	"arrasgo/internal/entity"
	"arrasgo/internal/jsutil"
	"arrasgo/internal/vmath"
)

func newWhirlwind(ctx *Context, opts Opts) State {
	minDistance := 3.5
	if opts.HasMinDistance {
		minDistance = opts.MinDistance
	}
	maxDistance := 10.0
	if opts.HasMaxDistance {
		maxDistance = opts.MaxDistance
	}
	radiusScalingSpeed := 10.0
	if opts.HasRadiusScalingSpeed && opts.RadiusScalingSpeed != 0 {
		radiusScalingSpeed = opts.RadiusScalingSpeed
	}

	var dist, inverseDist float64
	if e := ctx.World.Get(ctx.Body); e != nil {
		e.Angle = 0
		bodySize := ctx.size(ctx.Body)
		if opts.HasInitialDist && opts.InitialDist != 0 {
			dist = opts.InitialDist
		} else {
			dist = minDistance * bodySize
		}
		inverseDist = maxDistance*bodySize - dist + minDistance*bodySize
	}
	return State{
		WhirlMinDistance:        minDistance,
		WhirlMaxDistance:        maxDistance,
		WhirlRadiusScalingSpeed: radiusScalingSpeed,
		WhirlDist:               dist,
		WhirlInverseDist:        inverseDist,
		WhirlUseOwnMaster:       opts.UseOwnMaster,
	}
}

// thinkWhirlwind spins the body's angle and grows/shrinks its orbit radius while
// firing/alt-firing. Returns no Decision. Everything it does is a direct mutation.
//
// `this.body.aiSettings.SPEED` (controllers.js:1096) is read with no `?? default`. An
// entity whose definition never sets AI_SETTINGS.SPEED gets `undefined + number` =
// NaN in the JS, which then poisons Angle on every subsequent tick. Reproduced as-is
// via AISettings.HasSPEED rather than defaulting it to something that wouldn't NaN.
func thinkWhirlwind(st *State, ctx *Context, input Decision) Decision {
	e := ctx.World.Get(ctx.Body)
	if e == nil {
		return Decision{}
	}
	speed := math.NaN()
	if e.AISettings.HasSPEED {
		speed = e.AISettings.SPEED
	}
	e.Angle += (e.Skill.Spd*2 + speed) * math.Pi / 180

	bodySize := ctx.size(ctx.Body)
	trueMax := st.WhirlMaxDistance * bodySize
	trueMin := st.WhirlMinDistance * bodySize

	switch {
	case input.HasFire && input.Fire:
		if st.WhirlDist <= trueMax {
			st.WhirlDist += st.WhirlRadiusScalingSpeed
			st.WhirlInverseDist -= st.WhirlRadiusScalingSpeed
		}
	case input.HasAlt && input.Alt:
		if st.WhirlDist >= trueMin {
			st.WhirlDist -= st.WhirlRadiusScalingSpeed
			st.WhirlInverseDist += st.WhirlRadiusScalingSpeed
		}
	}
	st.WhirlDist = math.Min(trueMax, math.Max(trueMin, st.WhirlDist))
	st.WhirlInverseDist = math.Min(trueMax, math.Max(trueMin, st.WhirlInverseDist))
	return Decision{}
}

func newOrbit(ctx *Context, opts Opts) State {
	return State{OrbitInvert: opts.Invert}
}

func thinkOrbit(t *Table, id entity.ControllerID, st *State, ctx *Context, input Decision) Decision {
	e := ctx.World.Get(ctx.Body)
	if e == nil {
		return Decision{}
	}
	bodyMaster := ctx.World.Get(e.Master)
	if bodyMaster == nil {
		return Decision{}
	}

	useOwnMaster := false
	if whirlID, ok := t.FindKind(bodyMaster.Controllers, KindWhirlwind); ok {
		useOwnMaster = t.State(whirlID).WhirlUseOwnMaster
	}

	masterID := bodyMaster.Master
	if useOwnMaster {
		masterID = e.Master
	}
	master := ctx.World.Get(masterID)
	if master == nil {
		return Decision{}
	}

	var dist float64
	if whirlID, ok := t.FindKind(master.Controllers, KindWhirlwind); ok {
		whirl := t.State(whirlID)
		if st.OrbitInvert {
			dist = whirl.WhirlInverseDist
		} else {
			dist = whirl.WhirlDist
		}
	}

	invertFactor := 1.0
	if st.OrbitInvert {
		invertFactor = -1
	}
	angle := (e.Angle*math.Pi/180 + master.Angle) * invertFactor

	if st.OrbitRealDist > dist {
		st.OrbitRealDist -= math.Min(10, math.Abs(st.OrbitRealDist-dist))
	} else if st.OrbitRealDist < dist {
		st.OrbitRealDist += math.Min(10, math.Abs(dist-st.OrbitRealDist))
	}

	mp := ctx.World.Pos[masterID.Index]
	ctx.World.Pos[ctx.Body.Index] = vmath.Vec2{
		X: mp.X + float64(jsmath.Cos(angle)*st.OrbitRealDist),
		Y: mp.Y + float64(jsmath.Sin(angle)*st.OrbitRealDist),
	}
	e.Facing = angle
	return Decision{}
}

func newSnakeState(ctx *Context, opts Opts) State {
	var st State
	st.SnakeWaveInvert = 1
	if opts.Invert {
		st.SnakeWaveInvert = -1
	}
	st.SnakeWavePeriod = 5
	if opts.HasPeriod {
		st.SnakeWavePeriod = opts.Period
	}
	st.SnakeWaveAmplitude = 150
	if opts.HasAmplitude {
		st.SnakeWaveAmplitude = opts.Amplitude
	}
	if opts.HasYOffset {
		st.SnakeYOffset = opts.YOffset
	}
	angleOpt := 0.0
	if opts.HasAngle {
		angleOpt = opts.Angle
	}

	e := ctx.World.Get(ctx.Body)
	if e == nil {
		return st
	}
	master := ctx.World.Get(e.Master)

	st.SnakeReverseWave = 1
	if master != nil && master.Control.Alt {
		st.SnakeReverseWave = -1
	}

	var masterFacing float64
	if master != nil {
		masterFacing = master.Facing
	}
	st.SnakeWaveAngle = masterFacing + angleOpt

	p := ctx.World.Pos[ctx.Body.Index]
	st.SnakeStartX, st.SnakeStartY = float64(p.X), float64(p.Y)

	v := ctx.World.Vel[ctx.Body.Index]
	dir := float64(v.Direction())
	bodySize := ctx.size(ctx.Body)
	var offset float64
	if ctx.World.Tuning != nil {
		offset = ctx.World.Tuning.BulletSpawnOffset
	}
	ctx.World.Pos[ctx.Body.Index] = vmath.Vec2{
		X: p.X + float64(jsmath.Cos(dir)*bodySize*offset),
		Y: p.Y + float64(jsmath.Sin(dir)*bodySize*offset),
	}

	var grandTX, grandTY float64
	if master != nil {
		if grand := ctx.World.Get(master.Master); grand != nil {
			grandTX, grandTY = float64(grand.Control.Target.X), float64(grand.Control.Target.Y)
		}
	}
	st.SnakeWaveHorizontalScale = jsutil.Clamp(jsmath.Length(grandTX, grandTY)/math.Pi, 45, 75)

	return st
}

func snakeStep(st *State, ctx *Context) {
	e := ctx.World.Get(ctx.Body)
	if e == nil {
		return
	}
	waveX := st.SnakeWaveHorizontalScale * (e.RANGE - e.Range) / st.SnakeWavePeriod
	waveY := st.SnakeWaveAmplitude*jsmath.Sin(waveX/st.SnakeWaveHorizontalScale)*st.SnakeWaveInvert*st.SnakeReverseWave + st.SnakeYOffset
	trueWaveX := jsmath.Cos(st.SnakeWaveAngle)*waveX - jsmath.Sin(st.SnakeWaveAngle)*waveY
	trueWaveY := jsmath.Sin(st.SnakeWaveAngle)*waveX + jsmath.Cos(st.SnakeWaveAngle)*waveY

	p := ctx.World.Pos[ctx.Body.Index]
	newX := jsutil.Lerp(float64(p.X), st.SnakeStartX+trueWaveX, st.SnakeVelocityMagnitude)
	newY := jsutil.Lerp(float64(p.Y), st.SnakeStartY+trueWaveY, st.SnakeVelocityMagnitude)
	ctx.World.Pos[ctx.Body.Index] = vmath.Vec2{X: float64(newX), Y: float64(newY)}

	st.SnakeVelocityMagnitude = math.Min(0.1, st.SnakeVelocityMagnitude+0.01/ctx.RunSpeed)
}

func newSnake(ctx *Context, opts Opts) State { return newSnakeState(ctx, opts) }

func thinkSnake(st *State, ctx *Context, input Decision) Decision {
	snakeStep(st, ctx)
	return Decision{}
}

func newSnakeTillNot(ctx *Context, opts Opts) State { return newSnakeState(ctx, opts) }

func thinkSnakeTillNot(t *Table, id entity.ControllerID, st *State, ctx *Context, input Decision) Decision {
	e := ctx.World.Get(ctx.Body)
	if e == nil {
		return Decision{}
	}
	stop := false
	if oroID, ok := t.FindKind(e.Controllers, KindOroboros); ok {
		stop = t.State(oroID).DontEverDareToDoThatSnakeShitEverAgainYouPieceOfShit
	}
	if !stop {
		snakeStep(st, ctx)
	}
	return Decision{}
}

func newOroboros(ctx *Context, opts Opts) State {
	var st State
	e := ctx.World.Get(ctx.Body)
	if e == nil {
		return st
	}
	master := ctx.World.Get(e.Master)
	if master == nil {
		return st
	}
	mp := ctx.World.Pos[e.Master.Index]
	st.OroMasterX = float64(master.Control.Target.X)
	st.OroMasterY = float64(master.Control.Target.Y)
	st.OroMasterBodyX = float64(mp.X)
	st.OroMasterBodyY = float64(mp.Y)
	st.OroGoal = vmath.Vec2{X: master.Control.Target.X + mp.X, Y: master.Control.Target.Y + mp.Y}

	rangeOpt := 5.0
	if opts.HasRange {
		rangeOpt = opts.Range
	}
	st.OroRange = math.Max(rangeOpt, 0)

	speedOpt := math.Pi / 8
	if opts.HasSpeed {
		speedOpt = opts.Speed
	}
	st.OroSpeed = speedOpt * (float64(e.Skill.Raw[entity.SkillSpd])/9 + 1)

	return st
}

func thinkOroboros(t *Table, id entity.ControllerID, st *State, ctx *Context, input Decision) Decision {
	e := ctx.World.Get(ctx.Body)
	if e == nil {
		return Decision{}
	}
	st.OroX += st.OroSpeed

	p := ctx.World.Pos[ctx.Body.Index]
	distBody := jsmath.Length(st.OroMasterBodyX-float64(p.X), st.OroMasterBodyY-float64(p.Y))
	distMaster := jsmath.Length(st.OroMasterX, st.OroMasterY)

	if distBody > distMaster || st.GonnaGoInFUCKINGCircles {
		st.OroLerpTimer = math.Min(1, st.OroLerpTimer+0.02)
		st.GonnaGoInFUCKINGCircles = true
		st.DontEverDareToDoThatSnakeShitEverAgainYouPieceOfShit = true

		newX := jsutil.Lerp(float64(p.X), st.OroRange*jsmath.Sin(-st.OroX)+float64(st.OroGoal.X), st.OroLerpTimer)
		newY := jsutil.Lerp(float64(p.Y), st.OroRange*jsmath.Cos(-st.OroX)+float64(st.OroGoal.Y), st.OroLerpTimer)
		ctx.World.Pos[ctx.Body.Index] = vmath.Vec2{X: float64(newX), Y: float64(newY)}
		e.Facing = jsutil.Lerp(0, -st.OroX, st.OroLerpTimer)
		return Decision{}
	}
	return Decision{Goal: st.OroGoal, HasGoal: true}
}
