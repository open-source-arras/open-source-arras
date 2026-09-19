package ctrl

import (
	"testing"

	"arrasgo/internal/config"
	"arrasgo/internal/vmath"
)

// Expected values in this file are real Node output from
// tools/gen-ctrl-vectors.js (see gen/ctrl-vectors.json), captured by driving
// js-src/server/miscFiles/controllers.js's classes directly. They are not derived
// from this Go code. The whole point is that the two agree.

func TestThinkDoNothing(t *testing.T) {
	w := newWorld(4)
	w.Tuning = &config.Tuning{}
	id, _ := spawnAt(w, 12.5, -7)
	ctx := baseContext(w, id, nil)

	got := thinkDoNothing(&State{}, ctx, Decision{})
	want := Decision{
		Goal: vmath.Vec2{X: 12.5, Y: -7}, HasGoal: true,
		Main: false, HasMain: true,
		Alt: false, HasAlt: true,
		Fire: false, HasFire: true,
	}
	if got != want {
		t.Errorf("thinkDoNothing = %+v, want %+v", got, want)
	}
}

func TestThinkAlwaysFire(t *testing.T) {
	got := thinkAlwaysFire(nil, nil, Decision{})
	want := Decision{Fire: true, HasFire: true}
	if got != want {
		t.Errorf("thinkAlwaysFire = %+v, want %+v", got, want)
	}
}

func TestThinkTargetSelf(t *testing.T) {
	got := thinkTargetSelf(nil, nil, Decision{})
	want := Decision{Main: true, HasMain: true, HasTarget: true}
	if got != want {
		t.Errorf("thinkTargetSelf = %+v, want %+v", got, want)
	}
}

func TestThinkMapAltToFire(t *testing.T) {
	cases := []struct {
		name  string
		input Decision
		want  Decision
	}{
		{"altTrue", Decision{Alt: true, HasAlt: true}, Decision{Fire: true, HasFire: true}},
		{"altFalse", Decision{Alt: false, HasAlt: true}, Decision{}},
		{"altUndefined", Decision{}, Decision{}},
	}
	for _, c := range cases {
		t.Run(c.name, func(t *testing.T) {
			if got := thinkMapAltToFire(nil, nil, c.input); got != c.want {
				t.Errorf("thinkMapAltToFire(%+v) = %+v, want %+v", c.input, got, c.want)
			}
		})
	}
}

func TestThinkMapFireToAlt(t *testing.T) {
	fire := Decision{Fire: true, HasFire: true}
	noFire := Decision{Fire: false, HasFire: true}

	if got := thinkMapFireToAlt(&State{}, &Context{}, fire); got != (Decision{}) {
		t.Errorf("fireNoGuns: got %+v, want zero", got)
	}
	st := &State{}
	ctx := &Context{Guns: []GunInfo{{AltFire: false}, {AltFire: true}}}
	if got := thinkMapFireToAlt(st, ctx, fire); got != (Decision{Alt: true, HasAlt: true}) {
		t.Errorf("fireAltFireGun: got %+v", got)
	}
	st2 := &State{OnlyIfHasAltFireGun: true}
	ctx2 := &Context{Guns: []GunInfo{{AltFire: false}}}
	if got := thinkMapFireToAlt(st2, ctx2, fire); got != (Decision{}) {
		t.Errorf("onlyIfHasAltFireGun_none: got %+v, want zero", got)
	}
	ctx3 := &Context{Guns: []GunInfo{{AltFire: true}}}
	if got := thinkMapFireToAlt(&State{}, ctx3, noFire); got != (Decision{}) {
		t.Errorf("noFire: got %+v, want zero", got)
	}
}

func TestThinkOnlyAcceptInArc(t *testing.T) {
	w := newWorld(4)
	w.Tuning = &config.Tuning{}

	id, e := spawnAt(w, 0, 0)
	e.FiringArc = [2]float64{0, 1}
	ctx := baseContext(w, id, nil)
	if got := thinkOnlyAcceptInArc(nil, ctx, Decision{Target: vmath.Vec2{X: 1, Y: 0}, HasTarget: true}); got != (Decision{}) {
		t.Errorf("insideArc: got %+v, want zero", got)
	}

	id2, e2 := spawnAt(w, 0, 0)
	e2.FiringArc = [2]float64{0, 0.1}
	ctx2 := baseContext(w, id2, nil)
	got := thinkOnlyAcceptInArc(nil, ctx2, Decision{Target: vmath.Vec2{X: 0, Y: 1}, HasTarget: true})
	want := Decision{HasFire: true, HasAlt: true, HasMain: true}
	if got != want {
		t.Errorf("outsideArc: got %+v, want %+v", got, want)
	}

	if got := thinkOnlyAcceptInArc(nil, ctx, Decision{}); got != (Decision{}) {
		t.Errorf("noTarget: got %+v, want zero", got)
	}
}

func TestThinkMapTargetToGoal(t *testing.T) {
	w := newWorld(4)
	w.Tuning = &config.Tuning{}

	id, _ := spawnAt(w, 100, 200)
	ctx := baseContext(w, id, nil)
	got := thinkMapTargetToGoal(nil, ctx, Decision{Main: true, HasMain: true, Target: vmath.Vec2{X: 5, Y: -5}, HasTarget: true})
	want := Decision{Goal: vmath.Vec2{X: 105, Y: 195}, HasGoal: true, Power: 1, HasPower: true}
	if got != want {
		t.Errorf("main: got %+v, want %+v", got, want)
	}

	id2, _ := spawnAt(w, 0, 0)
	ctx2 := baseContext(w, id2, nil)
	got2 := thinkMapTargetToGoal(nil, ctx2, Decision{Alt: true, HasAlt: true, Target: vmath.Vec2{X: 3, Y: 4}, HasTarget: true})
	want2 := Decision{Goal: vmath.Vec2{X: 3, Y: 4}, HasGoal: true, Power: 1, HasPower: true}
	if got2 != want2 {
		t.Errorf("altOnly: got %+v, want %+v", got2, want2)
	}

	got3 := thinkMapTargetToGoal(nil, ctx2, Decision{Target: vmath.Vec2{X: 3, Y: 4}, HasTarget: true})
	if got3 != (Decision{}) {
		t.Errorf("neither: got %+v, want zero", got3)
	}
}

func TestThinkCanRepel(t *testing.T) {
	got := thinkCanRepel(nil, nil, Decision{Alt: true, HasAlt: true, Target: vmath.Vec2{X: 7, Y: -2}, HasTarget: true})
	want := Decision{Target: vmath.Vec2{X: -7, Y: 2}, HasTarget: true, Main: true, HasMain: true}
	if got != want {
		t.Errorf("altAndTarget: got %+v, want %+v", got, want)
	}
	if got := thinkCanRepel(nil, nil, Decision{Alt: false, HasAlt: true, Target: vmath.Vec2{X: 7, Y: -2}, HasTarget: true}); got != (Decision{}) {
		t.Errorf("noAlt: got %+v, want zero", got)
	}
}

func TestThinkScaleWithMaster(t *testing.T) {
	w := newWorld(4)
	w.Tuning = &config.Tuning{}

	masterID, master := spawnAt(w, 0, 0)
	master.SIZE = 40
	bodyID, body := spawnAt(w, 0, 0)
	body.SIZE = 20
	body.Master = masterID
	ctx := baseContext(w, bodyID, nil)

	st := &State{}
	thinkScaleWithMaster(st, ctx, Decision{})
	if body.SIZE != 20 {
		t.Errorf("changes: SIZE = %v, want 20", body.SIZE)
	}

	// unchangedSkipsWrite: storedSize starts at 0, master.size is also 0 -> no write.
	master2ID, master2 := spawnAt(w, 0, 0)
	master2.SIZE = 0
	body2ID, body2 := spawnAt(w, 0, 0)
	body2.SIZE = 777
	body2.Master = master2ID
	ctx2 := baseContext(w, body2ID, nil)
	thinkScaleWithMaster(&State{}, ctx2, Decision{})
	if body2.SIZE != 777 {
		t.Errorf("unchangedSkipsWrite: SIZE = %v, want 777 (unchanged)", body2.SIZE)
	}
}
