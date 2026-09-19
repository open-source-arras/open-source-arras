package ctrl

import (
	"testing"

	"arrasgo/internal/config"
	"arrasgo/internal/entity"
	"arrasgo/internal/vmath"
)

func TestThinkWhirlwind(t *testing.T) {
	w := newWorld(4)
	w.Tuning = &config.Tuning{}

	id, e := spawnAt(w, 0, 0)
	e.SIZE = 10
	e.SizeMultiplier = 1
	e.Skill.Spd = 0
	e.AISettings.SPEED, e.AISettings.HasSPEED = 0, true
	ctx := baseContext(w, id, nil)
	st := newWhirlwind(ctx, Opts{})
	assertClose64(t, "constructDefaults.angle", e.Angle, 0, 1e-9)
	assertClose64(t, "constructDefaults.dist", st.WhirlDist, 35, 1e-9)
	assertClose64(t, "constructDefaults.inverseDist", st.WhirlInverseDist, 100, 1e-9)
	if st.WhirlUseOwnMaster {
		t.Error("constructDefaults: WhirlUseOwnMaster should be false")
	}

	id2, e2 := spawnAt(w, 0, 0)
	e2.SIZE = 10
	e2.SizeMultiplier = 1
	e2.Skill.Spd = 1
	e2.AISettings.SPEED, e2.AISettings.HasSPEED = 5, true
	ctx2 := baseContext(w, id2, nil)
	st2 := newWhirlwind(ctx2, Opts{HasRadiusScalingSpeed: true, RadiusScalingSpeed: 3})
	thinkWhirlwind(&st2, ctx2, Decision{Fire: true, HasFire: true})
	assertClose64(t, "thinkFireGrows.angle", e2.Angle, 0.12217304763960307, 1e-9)
	assertClose64(t, "thinkFireGrows.dist", st2.WhirlDist, 38, 1e-9)
	assertClose64(t, "thinkFireGrows.inverseDist", st2.WhirlInverseDist, 97, 1e-9)

	id3, e3 := spawnAt(w, 0, 0)
	e3.SIZE = 10
	e3.SizeMultiplier = 1
	e3.Skill.Spd = 1
	e3.AISettings.SPEED, e3.AISettings.HasSPEED = 5, true
	ctx3 := baseContext(w, id3, nil)
	st3 := newWhirlwind(ctx3, Opts{HasRadiusScalingSpeed: true, RadiusScalingSpeed: 3})
	thinkWhirlwind(&st3, ctx3, Decision{Alt: true, HasAlt: true})
	assertClose64(t, "thinkAltShrinks.angle", e3.Angle, 0.12217304763960307, 1e-9)
	assertClose64(t, "thinkAltShrinks.dist", st3.WhirlDist, 35, 1e-9)
	assertClose64(t, "thinkAltShrinks.inverseDist", st3.WhirlInverseDist, 100, 1e-9)
}

func orbitTable(useOwnMaster bool, dist, inverseDist float64) (*Table, entity.ControllerID) {
	tbl := &Table{
		kinds:  []Kind{KindWhirlwind},
		states: []State{{WhirlUseOwnMaster: useOwnMaster, WhirlDist: dist, WhirlInverseDist: inverseDist}},
	}
	return tbl, entity.ControllerID(0)
}

func TestThinkOrbit(t *testing.T) {
	w := newWorld(8)
	w.Tuning = &config.Tuning{}

	grandmasterID, grandmaster := spawnAt(w, 200, 200)
	grandmaster.Angle = 90
	gTbl, gWhirl := orbitTable(false, 70, 30)
	grandmaster.Controllers = []entity.ControllerID{gWhirl}
	masterID, master := spawnAt(w, 100, 100)
	master.Master = grandmasterID
	mTbl, mWhirl := orbitTable(false, 50, 20)
	master.Controllers = []entity.ControllerID{mWhirl}
	_ = mTbl
	bodyID, body := spawnAt(w, 0, 0)
	body.Angle = 45
	body.Master = masterID
	ctx := baseContext(w, bodyID, nil)
	st := newOrbit(ctx, Opts{})
	thinkOrbit(gTbl, entity.ControllerID(0), &st, ctx, Decision{})
	assertClose(t, "basic.x", w.Pos[bodyID.Index].X, 190.51013004374184, 1e-3)
	assertClose(t, "basic.y", w.Pos[bodyID.Index].Y, 203.15315210754392, 1e-3)
	assertClose64(t, "basic.facing", body.Facing, 90.78539816339745, 1e-6)

	masterID2, master2 := spawnAt(w, 0, 0)
	master2.Angle = 10
	tbl2, whirl2 := orbitTable(true, 15, 5)
	master2.Controllers = []entity.ControllerID{whirl2}
	bodyID2, body2 := spawnAt(w, 0, 0)
	body2.Angle = 0
	body2.Master = masterID2
	ctx2 := baseContext(w, bodyID2, nil)
	st2 := newOrbit(ctx2, Opts{})
	thinkOrbit(tbl2, entity.ControllerID(0), &st2, ctx2, Decision{})
	assertClose(t, "useOwnMaster.x", w.Pos[bodyID2.Index].X, -8.390715290764524, 1e-3)
	assertClose(t, "useOwnMaster.y", w.Pos[bodyID2.Index].Y, -5.440211108893697, 1e-3)
	assertClose64(t, "useOwnMaster.facing", body2.Facing, 10, 1e-9)

	grandmaster3ID, grandmaster3 := spawnAt(w, 0, 0)
	grandmaster3.Angle = 0
	gTbl3, gWhirl3 := orbitTable(false, 0, 0)
	grandmaster3.Controllers = []entity.ControllerID{gWhirl3}
	master3ID, master3 := spawnAt(w, 0, 0)
	master3.Master = grandmaster3ID
	master3.Controllers = nil
	bodyID3, body3 := spawnAt(w, 0, 0)
	body3.Angle = 0
	body3.Master = master3ID
	ctx3 := baseContext(w, bodyID3, nil)
	st3 := newOrbit(ctx3, Opts{Invert: true})
	thinkOrbit(gTbl3, entity.ControllerID(0), &st3, ctx3, Decision{})
	assertClose(t, "inverted.x", w.Pos[bodyID3.Index].X, 0, 1e-9)
	assertClose(t, "inverted.y", w.Pos[bodyID3.Index].Y, 0, 1e-9)
	assertClose64(t, "inverted.facing", body3.Facing, 0, 1e-9)
}

func snakeBody(w *entity.World, rangeNow, rangeCap float64) (entity.EntityID, *entity.Entity) {
	grandmasterID, grandmaster := spawnAt(w, 0, 0)
	grandmaster.Control.Target = vmath.Vec2{X: 30, Y: 0}
	masterID, master := spawnAt(w, 0, 0)
	master.Master = grandmasterID
	master.Control.Alt = false
	master.Facing = 0

	bodyID, body := spawnAt(w, 0, 0)
	body.Master = masterID
	body.SIZE = 10
	body.SizeMultiplier = 1
	body.RANGE = rangeCap
	body.Range = rangeNow
	w.Vel[bodyID.Index] = vmath.Vec2{X: 1, Y: 0} // velocity.direction=0
	return bodyID, body
}

func TestThinkSnake(t *testing.T) {
	w := newWorld(16)
	w.Tuning = &config.Tuning{BulletSpawnOffset: 0.65}

	bodyID, _ := snakeBody(w, 100, 100)
	ctx := baseContext(w, bodyID, nil)
	st := newSnake(ctx, Opts{})
	assertClose(t, "constructAndOneStep.afterCtor.x", w.Pos[bodyID.Index].X, 6.5, 1e-6)
	assertClose(t, "constructAndOneStep.afterCtor.y", w.Pos[bodyID.Index].Y, 0, 1e-6)
	thinkSnake(&st, ctx, Decision{})
	assertClose(t, "constructAndOneStep.afterStep.x", w.Pos[bodyID.Index].X, 6.5, 1e-6)
	assertClose(t, "constructAndOneStep.afterStep.y", w.Pos[bodyID.Index].Y, 0, 1e-6)

	bodyID2, body2 := snakeBody(w, 80, 100)
	ctx2 := baseContext(w, bodyID2, nil)
	st2 := newSnake(ctx2, Opts{})
	for i := 0; i < 4; i++ {
		body2.Range -= 5
		thinkSnake(&st2, ctx2, Decision{})
	}
	assertClose(t, "severalSteps.x", w.Pos[bodyID2.Index].X, 19.299646222222222, 1e-3)
	assertClose(t, "severalSteps.y", w.Pos[bodyID2.Index].Y, 3.98559231430049, 1e-3)
}

func TestThinkSnakeTillNot(t *testing.T) {
	w := newWorld(16)
	w.Tuning = &config.Tuning{BulletSpawnOffset: 0.65}

	bodyID, _ := snakeBody(w, 90, 100)
	ctx := baseContext(w, bodyID, nil)
	st := newSnakeTillNot(ctx, Opts{})
	// No oroboros sibling attached -> FindKind fails -> stop defaults false, matching
	// the JS's `??= false`.
	thinkSnakeTillNot(&Table{}, entity.ControllerID(0), &st, ctx, Decision{})
	assertClose(t, "stepsWhenFlagFalse.x", w.Pos[bodyID.Index].X, 6.5, 1e-6)
	assertClose(t, "stepsWhenFlagFalse.y", w.Pos[bodyID.Index].Y, 0, 1e-6)

	bodyID2, body2 := snakeBody(w, 90, 100)
	oroTbl := &Table{
		kinds:  []Kind{KindOroboros},
		states: []State{{DontEverDareToDoThatSnakeShitEverAgainYouPieceOfShit: true}},
	}
	body2.Controllers = []entity.ControllerID{entity.ControllerID(0)}
	ctx2 := baseContext(w, bodyID2, nil)
	st2 := newSnakeTillNot(ctx2, Opts{})
	before := w.Pos[bodyID2.Index]
	thinkSnakeTillNot(oroTbl, entity.ControllerID(0), &st2, ctx2, Decision{})
	after := w.Pos[bodyID2.Index]
	assertClose(t, "staysPutWhenFlagTrue.before.x", before.X, 6.5, 1e-6)
	assertClose(t, "staysPutWhenFlagTrue.before.y", before.Y, 0, 1e-6)
	assertClose(t, "staysPutWhenFlagTrue.after.x", after.X, 6.5, 1e-6)
	assertClose(t, "staysPutWhenFlagTrue.after.y", after.Y, 0, 1e-6)
}

func TestThinkOroboros(t *testing.T) {
	w := newWorld(4)
	w.Tuning = &config.Tuning{}

	masterID, master := spawnAt(w, 0, 0)
	master.Control.Target = vmath.Vec2{X: 10, Y: 0}
	bodyID, body := spawnAt(w, 0, 0)
	body.Master = masterID
	body.Skill.Raw[entity.SkillSpd] = 9
	body.Facing = 0
	ctx := baseContext(w, bodyID, nil)
	st := newOroboros(ctx, Opts{HasRange: true, Range: 5, HasSpeed: true, Speed: 0.5})

	tbl := &Table{}
	r1 := thinkOroboros(tbl, entity.ControllerID(0), &st, ctx, Decision{})
	assertVecClose(t, "flyThenCircle.r1.goal", r1.Goal, 10, 0, 1e-9)
	if !r1.HasGoal {
		t.Error("flyThenCircle.r1: expected HasGoal")
	}

	w.Pos[bodyID.Index] = vmath.Vec2{X: 50, Y: 0}
	thinkOroboros(tbl, entity.ControllerID(0), &st, ctx, Decision{})
	assertClose(t, "flyThenCircle.afterCircle.x", w.Pos[bodyID.Index].X, 49.109070257317434, 1e-6)
	assertClose(t, "flyThenCircle.afterCircle.y", w.Pos[bodyID.Index].Y, -0.04161468365471424, 1e-6)
	assertClose64(t, "flyThenCircle.afterCircle.facing", body.Facing, -0.04, 1e-9)
	if !st.DontEverDareToDoThatSnakeShitEverAgainYouPieceOfShit {
		t.Error("flyThenCircle.afterCircle: expected the stop flag set")
	}
}
