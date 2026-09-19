package ctrl

import (
	"testing"

	"arrasgo/internal/config"
	"arrasgo/internal/entity"
	"arrasgo/internal/vmath"
)

// Structural tests for nearestDifferentMaster and healTeamMasters.

// setupNDMChain builds the minimal chain for validateNearestDifferentMaster tests.
func setupNDMChain(w *entity.World) (bodyID, candidateID entity.EntityID) {
	myGrandmasterID, myGrandmaster := spawnAt(w, 0, 0)
	myGrandmaster.Team = 1
	bodyMasterID, bodyMaster := spawnAt(w, 0, 0)
	bodyMaster.Master = myGrandmasterID
	bodyID, body := spawnAt(w, 0, 0)
	body.Master = bodyMasterID
	body.AISettings.View360 = true // skip the firing-arc check

	theirGrandmasterID, theirGrandmaster := spawnAt(w, 0, 0)
	theirGrandmaster.Team = 2
	candMasterID, candMaster := spawnAt(w, 0, 0)
	candMaster.Master = theirGrandmasterID
	candidateID, cand := spawnAt(w, 0, 0)
	cand.Master = candMasterID
	cand.Health.Amount = 100
	cand.Alpha = 1
	cand.Type = "tank"
	// Fresh entities have NaN dangerValue, validate rejects it.
	cand.DangerValue = 5
	return bodyID, candidateID
}

func TestValidateNearestDifferentMaster(t *testing.T) {
	w := newWorld(16)
	w.Tuning = &config.Tuning{}
	bodyID, candID := setupNDMChain(w)
	ctx := baseContext(w, bodyID, nil)

	if !validateNearestDifferentMaster(ctx, candID, 1e6, 1e6) {
		t.Error("validChain: expected true")
	}

	cand := w.Get(candID)
	theirGrandmaster := w.Get(w.Get(cand.Master).Master)

	theirGrandmaster.Team = 1 // now matches myGrandmaster's team
	if validateNearestDifferentMaster(ctx, candID, 1e6, 1e6) {
		t.Error("sameTeam: expected false")
	}
	theirGrandmaster.Team = 2

	cand.Health.Amount = 0
	if validateNearestDifferentMaster(ctx, candID, 1e6, 1e6) {
		t.Error("dead: expected false")
	}
	cand.Health.Amount = 100

	w.Pos[candID.Index] = vmath.Vec2{X: 100, Y: 100} // co-located passes any range trivially, so move away first
	if validateNearestDifferentMaster(ctx, candID, 1, 1) {
		t.Error("outOfRange: expected false")
	}
	w.Pos[candID.Index] = vmath.Vec2{X: 0, Y: 0}

	cand.Alpha = 0 // invisible, and body has neither SeeInvisible nor IsArenaCloser
	if validateNearestDifferentMaster(ctx, candID, 1e6, 1e6) {
		t.Error("invisibleAndUnseen: expected false")
	}
	cand.Alpha = 1

	cand.Godmode = true
	if validateNearestDifferentMaster(ctx, candID, 1e6, 1e6) {
		t.Error("godmode: expected false")
	}
	cand.Godmode = false
}

func TestThinkNearestDifferentMaster(t *testing.T) {
	w := newWorld(16)
	w.Tuning = &config.Tuning{}
	bodyID, candID := setupNDMChain(w)
	body := w.Get(bodyID)
	body.Fov = 1000 // a real fallback range -- 0 would zero out the distance gate too
	ctx := baseContext(w, bodyID, nil)
	ctx.Candidates = []entity.EntityID{candID}

	st := State{TargetTick: 2} // primed to search on the very next call
	got := thinkNearestDifferentMaster(&Table{}, entity.ControllerID(0), &st, ctx, Decision{})
	if !got.HasTarget || !got.HasFire || !got.Fire || !got.HasMain || !got.Main {
		t.Errorf("locksOntoValidTarget: got %+v", got)
	}
	if st.TargetLock != candID {
		t.Errorf("locksOntoValidTarget: TargetLock = %v, want %v", st.TargetLock, candID)
	}
	if got.Target != (vmath.Vec2{}) {
		t.Errorf("locksOntoValidTarget: Target = %+v, want zero", got.Target)
	}

	st2 := State{TargetLock: candID}
	got2 := thinkNearestDifferentMaster(&Table{}, entity.ControllerID(0), &st2, ctx, Decision{Main: true, HasMain: true})
	if got2 != (Decision{}) || st2.TargetLock.Valid() {
		t.Errorf("upstreamMainClearsLock: got %+v, TargetLock=%v", got2, st2.TargetLock)
	}

	bodyMaster := w.Get(body.Master)
	bodyMaster.AutoOverride = true
	st3 := State{TargetLock: candID}
	got3 := thinkNearestDifferentMaster(&Table{}, entity.ControllerID(0), &st3, ctx, Decision{})
	if got3 != (Decision{}) || st3.TargetLock.Valid() {
		t.Errorf("autoOverrideClearsLock: got %+v, TargetLock=%v", got3, st3.TargetLock)
	}
	bodyMaster.AutoOverride = false

	ctxEmpty := baseContext(w, bodyID, nil)
	st4 := State{TargetTick: 2}
	got4 := thinkNearestDifferentMaster(&Table{}, entity.ControllerID(0), &st4, ctxEmpty, Decision{})
	if got4 != (Decision{}) {
		t.Errorf("noCandidates: got %+v, want zero", got4)
	}
}

// setupHTMChain builds a chain for healTeamMasters tests with same-team grandmasters.
func setupHTMChain(w *entity.World) (bodyID, candidateID entity.EntityID) {
	myGrandmasterID, myGrandmaster := spawnAt(w, 0, 0)
	myGrandmaster.Team = 1
	bodyMasterID, bodyMaster := spawnAt(w, 0, 0)
	bodyMaster.Master = myGrandmasterID
	bodyID, body := spawnAt(w, 0, 0)
	body.Master = bodyMasterID
	body.AISettings.View360 = true

	theirGrandmasterID, theirGrandmaster := spawnAt(w, 0, 0)
	theirGrandmaster.Team = 1
	candMasterID, candMaster := spawnAt(w, 0, 0)
	candMaster.Master = theirGrandmasterID
	candidateID, cand := spawnAt(w, 0, 0)
	cand.Master = candMasterID
	cand.Health.Amount = 10
	cand.Health.Max = 100
	cand.Type = "tank"
	cand.DangerValue = 5
	return bodyID, candidateID
}

func TestValidateHealTeamMasters(t *testing.T) {
	w := newWorld(16)
	w.Tuning = &config.Tuning{}
	bodyID, candID := setupHTMChain(w)
	ctx := baseContext(w, bodyID, nil)
	tbl := &Table{}

	if !validateHealTeamMasters(tbl, ctx, candID) {
		t.Error("validHurtAlly: expected true")
	}

	cand := w.Get(candID)
	cand.Health.Amount = 90 // 90 > 100*0.7 -- not hurt enough
	if validateHealTeamMasters(tbl, ctx, candID) {
		t.Error("notHurtEnough: expected false")
	}
	cand.Health.Amount = 10

	theirGrandmaster := w.Get(w.Get(cand.Master).Master)
	theirGrandmaster.Team = 2 // enemy now, healTeamMasters only heals its own team
	if validateHealTeamMasters(tbl, ctx, candID) {
		t.Error("enemyTeam: expected false")
	}
	theirGrandmaster.Team = 1

	cand.Type = "dominator"
	if validateHealTeamMasters(tbl, ctx, candID) {
		t.Error("notATank: expected false")
	}
	cand.Type = "tank"

	// fleeAtLowHealth sibling overrides the default fear threshold.
	fearTbl := &Table{kinds: []Kind{KindFleeAtLowHealth}, states: []State{{Fear: 0.05}}}
	cand.Controllers = []entity.ControllerID{entity.ControllerID(0)}
	if validateHealTeamMasters(fearTbl, ctx, candID) {
		t.Error("siblingFearOverride: expected false once the sibling's stricter fear applies")
	}
	cand.Controllers = nil
}

func TestThinkHealTeamMasters(t *testing.T) {
	w := newWorld(16)
	w.Tuning = &config.Tuning{}
	bodyID, candID := setupHTMChain(w)
	body := w.Get(bodyID)
	body.Fov = 1000
	ctx := baseContext(w, bodyID, nil)
	ctx.Candidates = []entity.EntityID{candID}

	st := State{TargetTick: 2}
	got := thinkHealTeamMasters(&Table{}, entity.ControllerID(0), &st, ctx, Decision{})
	if !got.HasTarget || !got.HasFire || !got.Fire || !got.HasMain || !got.Main {
		t.Errorf("locksOntoHurtAlly: got %+v", got)
	}
	if st.TargetLock != candID {
		t.Errorf("locksOntoHurtAlly: TargetLock = %v, want %v", st.TargetLock, candID)
	}

	st2 := State{TargetLock: candID}
	got2 := thinkHealTeamMasters(&Table{}, entity.ControllerID(0), &st2, ctx, Decision{Alt: true, HasAlt: true})
	if got2 != (Decision{}) || st2.TargetLock.Valid() {
		t.Errorf("upstreamAltClearsLock: got %+v, TargetLock=%v", got2, st2.TargetLock)
	}
}
