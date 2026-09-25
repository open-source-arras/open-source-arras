package ctrl

import (
	"testing"

	"arrasgo/internal/config"
	"arrasgo/internal/vmath"
)

// TestThinkStackGuns pins that io_stackGuns does nothing.
//
// That is not a stub: controllers.js:410 loops `i < this.body.guns.length`, and
// entity.js:50 makes `guns` a Map, so the loop never runs, readiestGun is never
// assigned, and think() returns undefined on every call for every entity in the
// game (docs/found-bugs.md #60).
func TestThinkStackGuns(t *testing.T) {
	target := func(x, y float64) Decision { return Decision{Target: vmath.Vec2{X: x, Y: y}, HasTarget: true} }

	ctx := &Context{Guns: []GunInfo{
		{CanShoot: true, Stack: true, Cycle: 0.9, Reload: 1, ReloadStat: 1, Angle: 0.3},
		{CanShoot: true, Stack: true, Cycle: 0.1, Reload: 1, ReloadStat: 1, Angle: -0.2},
	}}
	if got := thinkStackGuns(&State{}, ctx, target(10, 0)); got != (Decision{}) {
		t.Errorf("readyGuns: got %+v, want zero -- the JS loop this ports is dead", got)
	}

	if got := thinkStackGuns(&State{}, &Context{}, Decision{}); got != (Decision{}) {
		t.Errorf("noTarget: got %+v, want zero", got)
	}

	ctx4 := &Context{Guns: []GunInfo{{CanShoot: true, Stack: true, Cycle: 0.5, Reload: 1, ReloadStat: 1}}}
	if got := thinkStackGuns(&State{TimeUntilFire: 100}, ctx4, target(1, 0)); got != (Decision{}) {
		t.Errorf("timeUntilFireBlocks: got %+v, want zero", got)
	}
}

func TestThinkSpin(t *testing.T) {
	got := thinkSpin(&State{SpinSpeed: 0.04}, &Context{}, Decision{})
	assertVecClose(t, "default", got.Target, 0.9992001066609779, 0.03998933418663416, 1e-5)
	if !got.Main {
		t.Error("default: Main should be true")
	}

	got2 := thinkSpin(&State{SpinA: 1, SpinSpeed: 0.1}, &Context{}, Decision{})
	assertVecClose(t, "customSpeedAndStart", got2.Target, 0.4535961214255773, 0.8912073600614354, 1e-5)

	input := Decision{Target: vmath.Vec2{X: 0, Y: 5}, HasTarget: true, Fire: true, HasFire: true}
	st := &State{SpinOnlyWhenIdle: true}
	got3 := thinkSpin(st, &Context{}, input)
	if got3 != input {
		t.Errorf("onlyWhenIdle_withTarget: got %+v, want input echoed back %+v", got3, input)
	}

	w := newWorld(4)
	w.Tuning = &config.Tuning{}
	bondTarget, _ := spawnAt(w, 0, 0)
	id, e := spawnAt(w, 0, 0)
	e.Bond = bondTarget
	e.Bound.Angle = 0.5
	ctx := baseContext(w, id, nil)
	got4 := thinkSpin(&State{SpinA: 0.2, SpinSpeed: 0, SpinIndependent: true}, ctx, Decision{})
	assertVecClose(t, "independentBonded", got4.Target, 0.7648421872844885, 0.644217687237691, 1e-5)
}

func TestThinkSpin2(t *testing.T) {
	w := newWorld(4)
	w.Tuning = &config.Tuning{}

	masterID, master := spawnAt(w, 0, 0)
	master.Control.Alt = false
	id, _ := spawnAt(w, 0, 0)
	w.Get(id).Master = masterID
	ctx := baseContext(w, id, nil)
	newSpin2(ctx, Opts{HasSpeed: true, Speed: 0.1})
	e := w.Get(id)
	if e.FacingType != "spin" || !e.FacingTypeArgs.HasSpeed || e.FacingTypeArgs.Speed != 0.1 {
		t.Errorf("constructNoAlt: FacingType=%q Args=%+v", e.FacingType, e.FacingTypeArgs)
	}

	masterID2, master2 := spawnAt(w, 0, 0)
	master2.Control.Alt = true
	id2, _ := spawnAt(w, 0, 0)
	w.Get(id2).Master = masterID2
	ctx2 := baseContext(w, id2, nil)
	newSpin2(ctx2, Opts{HasSpeed: true, Speed: 0.1})
	e2 := w.Get(id2)
	if e2.FacingTypeArgs.Speed != -0.1 {
		t.Errorf("constructAltReversed: Args=%+v, want speed -0.1", e2.FacingTypeArgs)
	}

	masterID3, master3 := spawnAt(w, 0, 0)
	master3.Control.Alt = false
	id3, _ := spawnAt(w, 0, 0)
	w.Get(id3).Master = masterID3
	ctx3 := baseContext(w, id3, nil)
	st3 := newSpin2(ctx3, Opts{HasSpeed: true, Speed: 0.1, ReverseOnTheFly: true})
	master3.Control.Alt = true
	thinkSpin2(&st3, ctx3, Decision{})
	e3 := w.Get(id3)
	if e3.FacingTypeArgs.Speed != -0.1 {
		t.Errorf("thinkFlipsOnAltChange: Args=%+v, want speed -0.1", e3.FacingTypeArgs)
	}

	masterID4, master4 := spawnAt(w, 0, 0)
	master4.Control.Alt = false
	id4, _ := spawnAt(w, 0, 0)
	w.Get(id4).Master = masterID4
	ctx4 := baseContext(w, id4, nil)
	st4 := newSpin2(ctx4, Opts{HasSpeed: true, Speed: 0.1}) // reverseOnTheFly defaults false
	e4 := w.Get(id4)
	e4.FacingType = "x"
	e4.FacingTypeArgs.Speed = 999
	master4.Control.Alt = true
	thinkSpin2(&st4, ctx4, Decision{})
	if e4.FacingType != "x" || e4.FacingTypeArgs.Speed != 999 {
		t.Errorf("thinkNoOpWithoutReverseOnTheFly: got FacingType=%q Args=%+v, want untouched", e4.FacingType, e4.FacingTypeArgs)
	}
}

func TestThinkZoom(t *testing.T) {
	w := newWorld(8)
	w.Tuning = &config.Tuning{}

	id, e := spawnAt(w, 100, 100)
	e.HasCameraOverride = false
	ctx := baseContext(w, id, nil)
	thinkZoom(&State{ZoomDistance: 50}, ctx, Decision{Alt: true, HasAlt: true, Target: vmath.Vec2{X: 1, Y: 0}, HasTarget: true})
	assertClose64(t, "altWithTarget.X", e.CameraOverrideX, 150, 1e-9)
	assertClose64(t, "altWithTarget.Y", e.CameraOverrideY, 100, 1e-9)

	id2, e2 := spawnAt(w, 0, 0)
	e2.CameraOverrideX, e2.CameraOverrideY, e2.HasCameraOverride = 5, 6, true
	ctx2 := baseContext(w, id2, nil)
	thinkZoom(&State{ZoomDistance: 275}, ctx2, Decision{})
	if e2.HasCameraOverride {
		t.Errorf("notAlt_clears: HasCameraOverride still true")
	}

	id3, e3 := spawnAt(w, 0, 0)
	e3.CameraOverrideX, e3.CameraOverrideY, e3.HasCameraOverride = 999, 999, true
	ctx3 := baseContext(w, id3, nil)
	thinkZoom(&State{ZoomDistance: 10, ZoomDynamic: true}, ctx3, Decision{Alt: true, HasAlt: true, Target: vmath.Vec2{X: 0, Y: 1}, HasTarget: true})
	assertClose64(t, "dynamicRecomputes.X", e3.CameraOverrideX, 6.123233995736766e-16, 1e-9)
	assertClose64(t, "dynamicRecomputes.Y", e3.CameraOverrideY, 10, 1e-9)

	id4, e4 := spawnAt(w, 0, 0)
	e4.HasCameraOverride = false
	ctx4 := baseContext(w, id4, nil)
	thinkZoom(&State{ZoomDistance: 10, ZoomPermanent: true}, ctx4, Decision{Target: vmath.Vec2{X: 0, Y: 3}, HasTarget: true})
	assertClose64(t, "permanentWithTarget.X", e4.CameraOverrideX, 6.123233995736766e-16, 1e-9)
	assertClose64(t, "permanentWithTarget.Y", e4.CameraOverrideY, 10, 1e-9)
}

func TestThinkFormulaTarget(t *testing.T) {
	w := newWorld(4)
	w.Tuning = &config.Tuning{}

	id, e := spawnAt(w, 10, 20)
	e.Facing = 0
	ctx := baseContext(w, id, nil)
	st := newFormulaTarget(ctx, Opts{})
	thinkFormulaTarget(&st, ctx, Decision{})
	got := thinkFormulaTarget(&st, ctx, Decision{})
	assertVecClose(t, "defaultSine_twoFrames", got.Goal, 10.044415197945545, 20.999013158167326, 1e-6)

	masterID, master := spawnAt(w, 0, 0)
	master.Facing = 2
	id2, e2 := spawnAt(w, 0, 0)
	e2.Facing = 1
	e2.Master = masterID
	ctx2 := baseContext(w, id2, nil)
	st2 := newFormulaTarget(ctx2, Opts{MasterAngle: true})
	got2 := thinkFormulaTarget(&st2, ctx2, Decision{})
	assertVecClose(t, "masterAngle", got2.Goal, 0.899826769686042, -0.43624738916855726, 1e-6)
}

func TestThinkDisableOnOverride(t *testing.T) {
	w := newWorld(8)
	w.Tuning = &config.Tuning{}

	grandID, grand := spawnAt(w, 0, 0)
	grand.AutoOverride = false
	parentMasterID, parentMaster := spawnAt(w, 0, 0)
	parentMaster.Master = grandID
	parentMaster.AutoOverride = false
	parentID, parent := spawnAt(w, 0, 0)
	parent.Master = parentMasterID
	id, e := spawnAt(w, 0, 0)
	e.Parent = parentID
	e.Alpha = 1
	e.DAMAGE = 40
	ctx := baseContext(w, id, nil)

	st := State{}
	thinkDisableOnOverride(&st, ctx, Decision{})
	parentMaster.AutoOverride = true
	for i := 0; i < 30; i++ {
		thinkDisableOnOverride(&st, ctx, Decision{})
	}
	assertClose64(t, "pacified.alpha", e.Alpha, 0, 1e-9)
	if e.DAMAGE != 0 {
		t.Errorf("pacified.DAMAGE = %v, want 0", e.DAMAGE)
	}
	parentMaster.AutoOverride = false
	for i := 0; i < 30; i++ {
		thinkDisableOnOverride(&st, ctx, Decision{})
	}
	assertClose64(t, "released.alpha", e.Alpha, 1, 1e-9)
	if e.DAMAGE != 40 {
		t.Errorf("released.DAMAGE = %v, want 40", e.DAMAGE)
	}

	grand2ID, grand2 := spawnAt(w, 0, 0)
	grand2.AutoOverride = true
	parentMaster2ID, parentMaster2 := spawnAt(w, 0, 0)
	parentMaster2.Master = grand2ID
	parentMaster2.AutoOverride = false
	parent2ID, parent2 := spawnAt(w, 0, 0)
	parent2.Master = parentMaster2ID
	id2, e2 := spawnAt(w, 0, 0)
	e2.Parent = parent2ID
	e2.Alpha = 1
	e2.DAMAGE = 10
	ctx2 := baseContext(w, id2, nil)
	st2 := State{}
	for i := 0; i < 30; i++ {
		thinkDisableOnOverride(&st2, ctx2, Decision{})
	}
	assertClose64(t, "grandOverride.alpha", e2.Alpha, 0, 1e-9)
	if e2.DAMAGE != 0 {
		t.Errorf("grandOverride.DAMAGE = %v, want 0", e2.DAMAGE)
	}
}
