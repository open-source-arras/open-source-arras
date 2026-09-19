package ctrl

import (
	"arrasgo/internal/jsmath"

	"arrasgo/internal/entity"
	"arrasgo/internal/jsutil"
	"arrasgo/internal/vmath"
)

func newListenToPlayer(ctx *Context, opts Opts) State {
	return State{ListenStatic: opts.Static}
}

func thinkListenToPlayer(st *State, ctx *Context, input Decision) Decision {
	if ctx.Player == nil {
		return Decision{}
	}
	e := ctx.World.Get(ctx.Body)
	if e == nil {
		return Decision{}
	}
	cmd := ctx.Player

	fire := cmd.Autofire || cmd.Lmb
	alt := cmd.Autoalt || cmd.Rmb
	target := cmd.Target

	if cmd.Autospin && !e.Settings.Braindamagemode {
		kk := jsmath.Atan2(float64(e.Control.Target.Y), float64(e.Control.Target.X)) + 0.04
		if e.AutospinBoost != 0 {
			thing := 0.05 * e.AutospinBoost
			if cmd.Lmb {
				thing *= 1.5
			}
			if cmd.Rmb {
				thing *= -1
			}
			kk += thing
		}
		target = vmath.Vec2{X: float64(100 * jsmath.Cos(kk)), Y: float64(100 * jsmath.Sin(kk))}
	}

	if e.Invuln {
		if cmd.Right != 0 || cmd.Left != 0 || cmd.Up != 0 || cmd.Down != 0 || cmd.Lmb {
			e.Invuln = false
		}
	}
	e.AutoOverride = cmd.Override

	out := Decision{
		Target: target, HasTarget: true,
		Fire: fire, HasFire: true,
		Alt: alt, HasAlt: true,
		Main: fire || cmd.Autospin, HasMain: true,
	}
	if !st.ListenStatic {
		p := ctx.World.Pos[ctx.Body.Index]
		out.Goal = vmath.Vec2{X: p.X + float64(cmd.Right-cmd.Left), Y: p.Y + float64(cmd.Down-cmd.Up)}
		out.HasGoal = true
	}
	return out
}

func newWanderAroundMap(ctx *Context, opts Opts) State {
	var spot vmath.Vec2
	if ctx.RandomSpot != nil {
		spot = ctx.RandomSpot(ctx.Rand)
	}
	return State{
		WanderLookAtGoal:        opts.LookAtGoal,
		WanderReplicateMovement: opts.ReplicatePlayerMovement,
		WanderSpot:              spot,
		WanderBossWander:        opts.DiepBossWander,
		WanderEnabled:           true,
		WanderBotMoveEnabled:    true,
	}
}

func thinkWanderAroundMap(st *State, ctx *Context, input Decision) Decision {
	e := ctx.World.Get(ctx.Body)
	if e == nil {
		return Decision{}
	}
	p := ctx.World.Pos[ctx.Body.Index]

	if out, done := botMoveStep(st, ctx, e, p, input); done {
		return out
	}
	if !st.WanderEnabled {
		// Wander disabled, no opinion.
		return Decision{}
	}

	if st.WanderBossWander {
		w := float64(ctx.World.Room.Width)
		h := float64(ctx.World.Room.Height)
		const edge = 15
		points := [4]vmath.Vec2{
			{X: w / edge, Y: h / edge},
			{X: w - w/edge, Y: h / edge},
			{X: w - w/edge, Y: h - h/edge},
			{X: w / edge, Y: h - h/edge},
		}
		st.WanderTick++
		st.WanderGoal = points[st.WanderI]
		distFromPoint := float64(jsutil.GetDistance(p, st.WanderGoal))
		threshold := 100.0 + distFromPoint
		if e.SPEED < 5 {
			threshold += 1000
		}
		if float64(st.WanderTick) >= threshold {
			st.WanderTick = 0
			if int(st.WanderI) >= len(points)-1 {
				st.WanderI = 0
			} else {
				st.WanderI++
			}
			st.WanderGoal = points[st.WanderI]
		}
		out := Decision{Goal: st.WanderGoal, HasGoal: true}
		if st.WanderLookAtGoal {
			out.Target, out.HasTarget = st.WanderGoal, true
		}
		return out
	}

	near := vmath.Vec2{X: p.X - st.WanderSpot.X, Y: p.Y - st.WanderSpot.Y}.IsShorterThan(50)
	if (near || wouldHitWall(ctx, p, st.WanderSpot, true)) && ctx.RandomSpot != nil {
		st.WanderSpot = ctx.RandomSpot(ctx.Rand)
	}

	if input.HasGoal || e.AutoOverride {
		return Decision{}
	}
	goal := st.WanderSpot
	if st.WanderReplicateMovement {
		goal = compressMovement(p, goal)
	}
	out := Decision{Goal: goal, HasGoal: true}
	if st.WanderLookAtGoal && !input.HasTarget {
		out.Target = vmath.Vec2{X: st.WanderSpot.X - p.X, Y: st.WanderSpot.Y - p.Y}
		out.HasTarget = true
	}
	return out
}

// botMoveStep is the Config.BOT_MOVE branch run before wander.
func botMoveStep(st *State, ctx *Context, e *entity.Entity, p vmath.Vec2, input Decision) (Decision, bool) {
	if len(ctx.BotMove) == 0 || !st.WanderBotMoveEnabled {
		return Decision{}, false
	}
	st.WanderEnabled = false
	for _, path := range ctx.BotMove {
		if !path.AnyTeam && e.Team != path.Team {
			continue
		}
		if len(path.Movement) == 0 || (input.HasFire && input.Fire) {
			continue
		}
		if st.WanderMoveArray == 0 {
			st.WanderBotMoveActive = true
			st.WanderArrayLength = int32(len(path.Movement) - 1)
		}
		if int(st.WanderMoveArray) >= len(path.Movement) {
			continue
		}
		step := path.Movement[st.WanderMoveArray]
		loc := vmath.Vec2{X: step[0] * botMoveScale, Y: step[1] * botMoveScale}
		if (vmath.Vec2{X: p.X - loc.X, Y: p.Y - loc.Y}).IsShorterThan(path.Radius()) {
			if st.WanderMoveArray == st.WanderArrayLength {
				st.WanderBotMoveEnabled = false
				st.WanderEnabled = true
			}
			st.WanderMoveArray++
		}
		if input.HasGoal || e.AutoOverride {
			continue
		}
		out := Decision{Goal: compressMovement(p, loc), HasGoal: true}
		if st.WanderLookAtGoal && !input.HasTarget {
			out.Target = vmath.Vec2{X: loc.X - p.X, Y: loc.Y - p.Y}
			out.HasTarget = true
		}
		return out, true
	}
	if !st.WanderBotMoveActive {
		st.WanderBotMoveEnabled = false
		st.WanderEnabled = true
	}
	return Decision{}, false
}

// botMoveScale is the 30 every MOVEMENT pair is multiplied by (controllers.js:983).
const botMoveScale = 30
