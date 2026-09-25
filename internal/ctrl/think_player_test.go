package ctrl

import (
	"arrasgo/internal/jsmath"
	"testing"

	"arrasgo/internal/config"
	"arrasgo/internal/entity"
	"arrasgo/internal/jsutil"
	"arrasgo/internal/vmath"
)

// listenToPlayer and wanderAroundMap both depend on hooks (Context.Player,
// Context.RandomSpot) that stand in for real net/room state ctrl cannot import --
// tools/gen-ctrl-vectors.js's duck-typed harness does not cover either (see that
// file's header). These are structural tests against those hooks.

func TestThinkListenToPlayer(t *testing.T) {
	w := newWorld(4)
	w.Tuning = &config.Tuning{}
	id, e := spawnAt(w, 10, 20)
	ctx := baseContext(w, id, nil)
	st := newListenToPlayer(ctx, Opts{})

	if got := thinkListenToPlayer(&st, ctx, Decision{}); got != (Decision{}) {
		t.Errorf("noPlayer: got %+v, want zero", got)
	}

	cmd := &PlayerCommand{Target: vmath.Vec2{X: 1, Y: 0}, Lmb: true, Right: 1}
	ctx.Player = cmd
	got2 := thinkListenToPlayer(&st, ctx, Decision{})
	want2 := Decision{
		Target: vmath.Vec2{X: 1, Y: 0}, HasTarget: true,
		Fire: true, HasFire: true,
		Alt: false, HasAlt: true,
		Main: true, HasMain: true,
		Goal: vmath.Vec2{X: 11, Y: 20}, HasGoal: true,
	}
	if got2 != want2 {
		t.Errorf("basicCommand: got %+v, want %+v", got2, want2)
	}
	if e.AutoOverride != cmd.Override {
		t.Errorf("mirrorsAutoOverride: got %v, want %v", e.AutoOverride, cmd.Override)
	}

	st2 := &State{ListenStatic: true}
	if got3 := thinkListenToPlayer(st2, ctx, Decision{}); got3.HasGoal {
		t.Errorf("static: expected no Goal, got %+v", got3)
	}

	e.Invuln = true
	cmd.Lmb = false
	cmd.Right = 0
	thinkListenToPlayer(&st, ctx, Decision{})
	if !e.Invuln {
		t.Error("invulnStaysWithNoMovementOrLmb: expected Invuln still true")
	}
	cmd.Right = 1
	thinkListenToPlayer(&st, ctx, Decision{})
	if e.Invuln {
		t.Error("invulnClearedByMovement: expected Invuln false")
	}

	id2, e2 := spawnAt(w, 0, 0)
	e2.Control.Target = vmath.Vec2{X: 1, Y: 0}
	ctx2 := baseContext(w, id2, nil)
	ctx2.Player = &PlayerCommand{Autospin: true}
	st3 := &State{}
	got4 := thinkListenToPlayer(st3, ctx2, Decision{})
	kk := jsmath.Atan2(0, 1) + 0.04
	wantTarget := vmath.Vec2{X: 100 * jsmath.Cos(kk), Y: 100 * jsmath.Sin(kk)}
	if got4.Target != wantTarget {
		t.Errorf("autospin: Target = %+v, want %+v", got4.Target, wantTarget)
	}
	if !got4.Main {
		t.Error("autospin: expected Main true even without fire")
	}
}

func TestThinkWanderAroundMap(t *testing.T) {
	w := newWorld(8)
	w.Tuning = &config.Tuning{}
	w.Room = entity.RoomInfo{Width: 3000, Height: 1500}

	// bossWander: points[0] = (3000/15, 1500/15) = (200,100), exactly the spawn
	// point, so distFromPoint starts at 0 and threshold at 100.
	id, e := spawnAt(w, 200, 100)
	e.SPEED = 10 // >=5, so no +1000 threshold bump
	ctx := baseContext(w, id, nil)
	stv := newWanderAroundMap(ctx, Opts{})
	stv.WanderBossWander = true
	st := &stv
	got := thinkWanderAroundMap(st, ctx, Decision{})
	want := Decision{Goal: vmath.Vec2{X: 200, Y: 100}, HasGoal: true}
	if got != want {
		t.Errorf("bossWander.firstTick: got %+v, want %+v", got, want)
	}
	if st.WanderTick != 1 {
		t.Errorf("bossWander.tick: got %d, want 1", st.WanderTick)
	}
	for i := 0; i < 200; i++ {
		thinkWanderAroundMap(st, ctx, Decision{})
	}
	if st.WanderI != 1 {
		t.Errorf("bossWander.wrapsOnceToNextPoint: WanderI = %d, want 1", st.WanderI)
	}

	id2, e2 := spawnAt(w, 0, 0)
	ctx2 := baseContext(w, id2, nil)
	ctx2.RandomSpot = func(r *jsutil.Rand) vmath.Vec2 { return vmath.Vec2{X: 500, Y: 500} }
	st2 := newWanderAroundMap(ctx2, Opts{})
	if st2.WanderSpot != (vmath.Vec2{X: 500, Y: 500}) {
		t.Errorf("construct: WanderSpot = %+v, want (500,500)", st2.WanderSpot)
	}

	got2 := thinkWanderAroundMap(&st2, ctx2, Decision{})
	want2 := Decision{Goal: vmath.Vec2{X: 500, Y: 500}, HasGoal: true}
	if got2 != want2 {
		t.Errorf("headsForSpot: got %+v, want %+v", got2, want2)
	}

	if got3 := thinkWanderAroundMap(&st2, ctx2, Decision{Goal: vmath.Vec2{X: 1, Y: 1}, HasGoal: true}); got3 != (Decision{}) {
		t.Errorf("upstreamGoalDefers: got %+v, want zero", got3)
	}

	e2.AutoOverride = true
	if got4 := thinkWanderAroundMap(&st2, ctx2, Decision{}); got4 != (Decision{}) {
		t.Errorf("autoOverrideDefers: got %+v, want zero", got4)
	}
	e2.AutoOverride = false

	ctx2.RandomSpot = func(r *jsutil.Rand) vmath.Vec2 { return vmath.Vec2{X: 999, Y: 999} }
	w.Pos[id2.Index] = vmath.Vec2{X: 500, Y: 490} // 10 units from (500,500) -> inside the 50-unit reroll radius
	got5 := thinkWanderAroundMap(&st2, ctx2, Decision{})
	want5 := Decision{Goal: vmath.Vec2{X: 999, Y: 999}, HasGoal: true}
	if got5 != want5 {
		t.Errorf("rerollsWhenNear: got %+v, want %+v", got5, want5)
	}

	id3, _ := spawnAt(w, 0, 0)
	ctx3 := baseContext(w, id3, nil)
	ctx3.RandomSpot = func(r *jsutil.Rand) vmath.Vec2 { return vmath.Vec2{X: 100, Y: 0} }
	st3 := newWanderAroundMap(ctx3, Opts{LookAtGoal: true, ReplicatePlayerMovement: true})
	got6 := thinkWanderAroundMap(&st3, ctx3, Decision{})
	if !got6.HasTarget || got6.Target != (vmath.Vec2{X: 100, Y: 0}) {
		t.Errorf("lookAtGoal: Target = %+v, want (100,0) (the raw spot, not compressed)", got6.Target)
	}
	if !got6.HasGoal {
		t.Error("replicateMovement: expected HasGoal")
	}
}
