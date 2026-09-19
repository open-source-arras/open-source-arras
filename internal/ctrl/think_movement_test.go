package ctrl

import (
	"math"

	"arrasgo/internal/jsmath"
	"testing"

	"arrasgo/internal/config"
	"arrasgo/internal/entity"
	"arrasgo/internal/jsutil"
	"arrasgo/internal/vmath"
)

func TestThinkSiegeAI(t *testing.T) {
	w := newWorld(4)
	w.Tuning = &config.Tuning{}
	id, _ := spawnAt(w, 0, 0)
	ctx := baseContext(w, id, nil)
	ctx.RoomCenter = vmath.Vec2{X: 100, Y: 200}
	st := newSiegeAI(ctx, Opts{})

	want := Decision{Goal: vmath.Vec2{X: 100, Y: 200}, HasGoal: true}
	if got := thinkSiegeAI(&st, ctx, Decision{}); got != want {
		t.Errorf("headsToCenter: got %+v, want %+v", got, want)
	}
	ctx.IsStopAIZone = func(vmath.Vec2) bool { return true }
	if got := thinkSiegeAI(&st, ctx, Decision{}); got != (Decision{}) {
		t.Errorf("disablesOnEntry: got %+v, want zero", got)
	}
	if st.SiegeEnabled {
		t.Error("expected SiegeEnabled cleared after entering the stop zone")
	}
	if got := thinkSiegeAI(&st, ctx, Decision{}); got != (Decision{}) {
		t.Errorf("staysParked: got %+v, want zero", got)
	}
}

func TestThinkMoveInCircles(t *testing.T) {
	w := newWorld(4)
	w.Tuning = &config.Tuning{}

	id, e := spawnAt(w, 10, 20)
	e.ACCELERATION = 0
	ctx := baseContext(w, id, jsutil.NewRand(1))
	st := newMoveInCircles(ctx, Opts{})
	if st.CirclesTimer < 3 || st.CirclesTimer > 7 {
		t.Errorf("constructTimerRange: got %d, want in [3,7]", st.CirclesTimer)
	}
	got := thinkMoveInCircles(&st, ctx, Decision{})
	if !got.HasGoal || got.Power != 1 || !got.HasPower {
		t.Errorf("lowAcceleration: got %+v, want Power=1", got)
	}

	id2, e2 := spawnAt(w, 0, 0)
	e2.ACCELERATION = 5
	ctx2 := baseContext(w, id2, jsutil.NewRand(1))
	st2 := newMoveInCircles(ctx2, Opts{})
	got2 := thinkMoveInCircles(&st2, ctx2, Decision{})
	if !got2.HasGoal || got2.Power != 0.2 || !got2.HasPower {
		t.Errorf("highAcceleration: got %+v, want Power=0.2", got2)
	}
	st3 := State{CirclesTimer: 0}
	thinkMoveInCircles(&st3, ctx2, Decision{})
	if st3.CirclesTimer != 5 {
		t.Errorf("resetsToFiveOnZero: CirclesTimer = %d, want 5", st3.CirclesTimer)
	}
}

func TestThinkBoomerang(t *testing.T) {
	w := newWorld(4)
	w.Tuning = &config.Tuning{}

	masterID, master := spawnAt(w, 50, 50)
	master.Control.Target = vmath.Vec2{X: 2, Y: 0}
	id, e := spawnAt(w, 0, 0)
	e.Master = masterID
	e.Range = 0
	ctx := baseContext(w, id, nil)
	st := newBoomerang(ctx, Opts{})
	got := thinkBoomerang(&st, ctx, Decision{})
	want := Decision{Goal: vmath.Vec2{X: 56, Y: 50}, HasGoal: true, Power: 1, HasPower: true}
	if got != want {
		t.Errorf("beforeTurnover: got %+v, want %+v", got, want)
	}

	master2ID, master2 := spawnAt(w, 70, 80)
	master2.Control.Target = vmath.Vec2{X: 2, Y: 0}
	id2, e2 := spawnAt(w, 0, 0)
	e2.Master = master2ID
	e2.Range = 10
	ctx2 := baseContext(w, id2, nil)
	st2 := newBoomerang(ctx2, Opts{})
	thinkBoomerang(&st2, ctx2, Decision{})
	e2.Range = 4
	thinkBoomerang(&st2, ctx2, Decision{})
	w.Pos[master2ID.Index] = vmath.Vec2{X: 99, Y: 88}
	got2 := thinkBoomerang(&st2, ctx2, Decision{})
	want2 := Decision{Goal: vmath.Vec2{X: 99, Y: 88}, HasGoal: true, Power: 1, HasPower: true}
	if got2 != want2 {
		t.Errorf("afterTurnover: got %+v, want %+v", got2, want2)
	}
}

func TestThinkGoToMasterTarget(t *testing.T) {
	w := newWorld(4)
	w.Tuning = &config.Tuning{}

	masterID, master := spawnAt(w, 0, 0)
	master.Control.Target = vmath.Vec2{X: 30, Y: 40}
	master.ReverseTank = 1
	id, _ := spawnAt(w, 500, 500)
	w.Get(id).Master = masterID
	ctx := baseContext(w, id, nil)
	st := newGoToMasterTarget(ctx, Opts{})
	got := thinkGoToMasterTarget(&st, ctx, Decision{})
	want := Decision{Goal: vmath.Vec2{X: 30, Y: 40}, HasGoal: true}
	if got != want {
		t.Errorf("farFromGoal: got %+v, want %+v", got, want)
	}

	master2ID, master2 := spawnAt(w, 0, 0)
	master2.Control.Target = vmath.Vec2{X: 0, Y: 0}
	master2.ReverseTank = 1
	id2, _ := spawnAt(w, 0, 0)
	w.Get(id2).Master = master2ID
	ctx2 := baseContext(w, id2, nil)
	st2 := newGoToMasterTarget(ctx2, Opts{})
	for i := 0; i < 5; i++ {
		thinkGoToMasterTarget(&st2, ctx2, Decision{})
	}
	if got2 := thinkGoToMasterTarget(&st2, ctx2, Decision{}); got2 != (Decision{}) {
		t.Errorf("reachedGoal_countsDown: got %+v, want zero once the countdown is exhausted", got2)
	}
}

func TestThinkHangOutNearMaster(t *testing.T) {
	w := newWorld(8)
	w.Tuning = &config.Tuning{}

	id, _ := spawnAt(w, 0, 0)
	ctx := baseContext(w, id, jsutil.NewRand(1))
	st := newHangOutNearMaster(ctx, Opts{})
	if got := thinkHangOutNearMaster(&st, ctx, Decision{}); got != (Decision{}) {
		t.Errorf("noSource: got %+v, want zero", got)
	}

	id2, e2 := spawnAt(w, 0, 0)
	e2.Source = id2
	ctx2 := baseContext(w, id2, jsutil.NewRand(1))
	st2 := newHangOutNearMaster(ctx2, Opts{})
	if got := thinkHangOutNearMaster(&st2, ctx2, Decision{}); got != (Decision{}) {
		t.Errorf("sourceIsSelf: got %+v, want zero", got)
	}

	sourceID, _ := spawnAt(w, 0, 0)
	id3, e3 := spawnAt(w, 0, 0)
	e3.Source = sourceID
	e3.Invisible[1] = 0.1
	ctx3 := baseContext(w, id3, jsutil.NewRand(1))
	st3 := newHangOutNearMaster(ctx3, Opts{})
	if got := thinkHangOutNearMaster(&st3, ctx3, Decision{}); got != (Decision{}) {
		t.Errorf("fadingOut: got %+v, want zero", got)
	}

	source2ID, source2 := spawnAt(w, 0, 0)
	source2.SIZE, source2.SizeMultiplier = 1, 1
	id4, e4 := spawnAt(w, 5, 0)
	e4.Source = source2ID
	e4.SIZE, e4.SizeMultiplier = 1, 1
	w.Vel[id4.Index] = vmath.Vec2{X: 3, Y: 4}
	ctx4 := baseContext(w, id4, jsutil.NewRand(1))
	st4 := newHangOutNearMaster(ctx4, Opts{})
	got4 := thinkHangOutNearMaster(&st4, ctx4, Decision{})
	if !got4.HasTarget || got4.Target != (vmath.Vec2{X: 3, Y: 4}) {
		t.Errorf("closeRange.target: got %+v, want velocity (3,4)", got4)
	}
	if !got4.HasGoal || got4.Goal != (vmath.Vec2{X: 0, Y: 0}) {
		t.Errorf("closeRange.goal: got %+v, want source position (0,0)", got4)
	}
	if got4.Power != 0.15 || !got4.HasPower {
		t.Errorf("closeRange.power: got %+v, want Power=0.15", got4)
	}
}

func TestThinkFleeAtLowHealth(t *testing.T) {
	w := newWorld(4)
	w.Tuning = &config.Tuning{}

	id, e := spawnAt(w, 10, 10)
	e.Health.Amount, e.Health.Max = 5, 100
	ctx := baseContext(w, id, jsutil.NewRand(1))
	st := newFleeAtLowHealth(ctx, Opts{})
	if st.Fear < 0.1 || st.Fear > 0.9 {
		t.Errorf("constructFearRange: got %v, want in [0.1,0.9]", st.Fear)
	}

	if got := thinkFleeAtLowHealth(&st, ctx, Decision{}); got != (Decision{}) {
		t.Errorf("notFiring: got %+v, want zero", got)
	}

	st2 := State{Fear: 0.5}
	e.Health.Amount = 60 // 60 is not below 100*0.5
	input := Decision{Fire: true, HasFire: true, Target: vmath.Vec2{X: 1, Y: 0}, HasTarget: true}
	if got := thinkFleeAtLowHealth(&st2, ctx, input); got != (Decision{}) {
		t.Errorf("healthyEnough: got %+v, want zero", got)
	}

	e.Health.Amount = 10 // 10 < 100*0.5
	got3 := thinkFleeAtLowHealth(&st2, ctx, input)
	want3 := Decision{Goal: vmath.Vec2{X: 9, Y: 10}, HasGoal: true}
	if got3 != want3 {
		t.Errorf("lowHealthFlees: got %+v, want %+v", got3, want3)
	}
}

func TestThinkMinion(t *testing.T) {
	w := newWorld(8)
	w.Tuning = &config.Tuning{}

	masterID, master := spawnAt(w, 0, 0)
	master.SIZE, master.SizeMultiplier = 10, 1
	id, e := spawnAt(w, 0, 0)
	e.Master = masterID
	e.SIZE, e.SizeMultiplier = 10, 1
	ctx := baseContext(w, id, jsutil.NewRand(1))
	st := newMinion(ctx, Opts{})
	if got := thinkMinion(&st, ctx, Decision{}); got != (Decision{}) {
		t.Errorf("noInput: got %+v, want zero", got)
	}

	got2 := thinkMinion(&st, ctx, Decision{Alt: true, HasAlt: true, HasTarget: true, Target: vmath.Vec2{X: 5, Y: 0}})
	want2 := Decision{Goal: vmath.Vec2{X: 5, Y: 0}, HasGoal: true, Power: 1, HasPower: true}
	if got2 != want2 {
		t.Errorf("altWithinLeash: got %+v, want %+v", got2, want2)
	}

	got3 := thinkMinion(&st, ctx, Decision{Alt: true, HasAlt: true, HasTarget: true, Target: vmath.Vec2{X: 100, Y: 0}})
	want3Goal := vmath.Vec2{X: jsmath.Cos(math.Pi / 5), Y: jsmath.Sin(math.Pi / 5)}
	want3 := Decision{Goal: want3Goal, HasGoal: true, Power: 1, HasPower: true}
	if got3 != want3 {
		t.Errorf("altBetweenLeashAndRepel: got %+v, want %+v", got3, want3)
	}

	got4 := thinkMinion(&st, ctx, Decision{Alt: true, HasAlt: true, HasTarget: true, Target: vmath.Vec2{X: 200, Y: 0}})
	want4 := Decision{Goal: vmath.Vec2{X: -200, Y: 0}, HasGoal: true, Power: 1, HasPower: true}
	if got4 != want4 {
		t.Errorf("altBeyondRepel: got %+v, want %+v", got4, want4)
	}

	got5 := thinkMinion(&st, ctx, Decision{Main: true, HasMain: true, HasTarget: true, Target: vmath.Vec2{X: 200, Y: 0}})
	want5Goal := vmath.Vec2{X: 200 - 140*jsmath.Cos(0.01), Y: -140 * jsmath.Sin(0.01)}
	want5 := Decision{Goal: want5Goal, HasGoal: true, Power: 1, HasPower: true}
	if got5 != want5 {
		t.Errorf("mainOrbit: got %+v, want %+v", got5, want5)
	}

	got6 := thinkMinion(&st, ctx, Decision{Main: true, HasMain: true, HasTarget: true, Target: vmath.Vec2{X: 140, Y: 0}})
	want6Goal := vmath.Vec2{X: 140 - 140*jsmath.Cos(0.01), Y: -140 * jsmath.Sin(0.01)}
	want6 := Decision{Goal: want6Goal, HasGoal: true, Power: 0.7, HasPower: true}
	if got6 != want6 {
		t.Errorf("mainNearOrbitSlows: got %+v, want %+v", got6, want6)
	}
}

func TestThinkAvoid(t *testing.T) {
	w := newWorld(8)
	w.Tuning = &config.Tuning{}

	bodyMasterID, bodyMaster := spawnAt(w, 0, 0)
	bodyMaster.WireID = 1
	id, e := spawnAt(w, 0, 0)
	e.Master = bodyMasterID
	e.SIZE, e.SizeMultiplier = 1, 1
	w.Vel[id.Index] = vmath.Vec2{X: 1, Y: 0}
	ctx := baseContext(w, id, nil)
	if got := thinkAvoid(&State{}, ctx, Decision{}); got != (Decision{}) {
		t.Errorf("noCandidates: got %+v, want zero", got)
	}
	idNoMaster, eNoMaster := spawnAt(w, 0, 0)
	eNoMaster.SIZE, eNoMaster.SizeMultiplier = 1, 1
	ctxNoMaster := baseContext(w, idNoMaster, nil)
	ctxNoMaster.Candidates = []entity.EntityID{id}
	if got := thinkAvoid(&State{}, ctxNoMaster, Decision{}); got != (Decision{}) {
		t.Errorf("noMaster: got %+v, want zero", got)
	}
	sameTeamMasterID, sameTeamMaster := spawnAt(w, 0, 0)
	sameTeamMaster.WireID = 1
	sameBulletID, sameBullet := spawnAt(w, 5, 0)
	sameBullet.Type = "bullet"
	sameBullet.Master = sameTeamMasterID
	w.Vel[sameBulletID.Index] = vmath.Vec2{X: -1, Y: 0}
	ctx.Candidates = []entity.EntityID{sameBulletID}
	if got := thinkAvoid(&State{}, ctx, Decision{}); got != (Decision{}) {
		t.Errorf("sameTeamExempt: got %+v, want zero", got)
	}
	enemyMasterID, enemyMaster := spawnAt(w, 0, 0)
	enemyMaster.WireID = 2
	enemyBulletID, enemyBullet := spawnAt(w, 5, 0)
	enemyBullet.Type = "bullet"
	enemyBullet.Master = enemyMasterID
	w.Vel[enemyBulletID.Index] = vmath.Vec2{X: -1, Y: 0}
	ctx.Candidates = []entity.EntityID{enemyBulletID}
	got := thinkAvoid(&State{}, ctx, Decision{})
	want := Decision{Goal: vmath.Vec2{X: -5, Y: 0}, HasGoal: true}
	if got != want {
		t.Errorf("closingEnemySteersAway: got %+v, want %+v", got, want)
	}
	got2 := thinkAvoid(&State{}, ctx, Decision{Goal: vmath.Vec2{X: 10, Y: 0}, HasGoal: true})
	want2 := Decision{Goal: vmath.Vec2{X: 5, Y: 0}, HasGoal: true}
	if got2 != want2 {
		t.Errorf("withUpstreamGoal: got %+v, want %+v", got2, want2)
	}
}
