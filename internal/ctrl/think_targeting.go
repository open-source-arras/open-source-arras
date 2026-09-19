package ctrl

import (
	"math"

	"arrasgo/internal/entity"
	"arrasgo/internal/jsutil"
	"arrasgo/internal/vmath"
)

// TeamRoom is global.TEAM_ROOM (loaders/global.js:36): the sentinel team id for room-owned entities.
const TeamRoom int32 = -100

var ndmValidTypes = map[string]bool{"tank": true, "miniboss": true, "crasher": true}

// wouldHitWallBuggySelfCheck reproduces controllers.js:541 / :685 exactly, bug included. See docs/found-bugs.md.
func wouldHitWallBuggySelfCheck(ctx *Context) bool {
	p := ctx.World.Pos[ctx.Body.Index]
	return wouldHitWall(ctx, p, p, false)
}

func newNearestDifferentMaster(ctx *Context, opts Opts) State {
	return State{
		TargetTick:       int32(ctx.Rand.Irandom(30)),
		LockThroughWalls: opts.LockThroughWalls,
		MapGoal:          opts.MapGoal,
	}
}

// validateNearestDifferentMaster is controllers.js:449-472.
func validateNearestDifferentMaster(ctx *Context, candidateID entity.EntityID, sqrRange, sqrRangeMaster float64) bool {
	e := ctx.World.Get(candidateID)
	body := ctx.World.Get(ctx.Body)
	if e == nil || body == nil {
		return false
	}
	bodyMaster := ctx.World.Get(body.Master)
	if bodyMaster == nil {
		return false
	}
	myGrandmasterID := bodyMaster.Master
	myGrandmaster := ctx.World.Get(myGrandmasterID)
	if myGrandmaster == nil {
		return false
	}
	candMaster := ctx.World.Get(e.Master)
	if candMaster == nil {
		return false
	}
	theirGrandmaster := ctx.World.Get(candMaster.Master)
	if theirGrandmaster == nil {
		return false
	}

	if e.Health.Amount <= 0 {
		return false
	}
	if theirGrandmaster.Team == myGrandmaster.Team || theirGrandmaster.Team == TeamRoom {
		return false
	}
	if theirGrandmaster.IgnoredByAI {
		return false
	}
	if e.Bond.Valid() {
		return false
	}
	if e.Invuln || e.Godmode || theirGrandmaster.Godmode ||
		ctx.isPassive(theirGrandmaster.ID) || ctx.isPassive(myGrandmasterID) {
		return false
	}
	if math.IsNaN(e.DangerValue) {
		return false
	}
	if !(body.AISettings.SeeInvisible || body.IsArenaCloser || e.Alpha > 0.5) {
		return false
	}
	if !ndmValidTypes[e.Type] {
		if (body.AISettings.IGNORE_SHAPES || myGrandmaster.AISettings.IGNORE_SHAPES) && e.Type == "food" {
			return false
		}
	}

	candPos := ctx.World.Pos[candidateID.Index]
	if !body.AISettings.BLIND {
		bp := ctx.World.Pos[ctx.Body.Index]
		dx, dy := float64(candPos.X-bp.X), float64(candPos.Y-bp.Y)
		if dx*dx >= sqrRange || dy*dy >= sqrRange {
			return false
		}
	}
	if !body.AISettings.SKYNET {
		gp := ctx.World.Pos[myGrandmasterID.Index]
		dx, dy := float64(candPos.X-gp.X), float64(candPos.Y-gp.Y)
		if dx*dx >= sqrRangeMaster || dy*dy >= sqrRangeMaster {
			return false
		}
	}
	return true
}

// buildNearestDifferentMasterList is controllers.js:477-514.
func buildNearestDifferentMasterList(ctx *Context, st *State, rangeVal float64) []entity.EntityID {
	body := ctx.World.Get(ctx.Body)
	if body == nil {
		st.TargetLock = entity.EntityID{}
		st.ValidTargets = st.ValidTargets[:0]
		return st.ValidTargets
	}
	sqrRange := rangeVal * rangeVal
	sqrRangeMaster := sqrRange * 4 / 3
	bp := ctx.World.Pos[ctx.Body.Index]

	st.ValidTargets = st.ValidTargets[:0]
	for _, id := range ctx.Candidates {
		if !validateNearestDifferentMaster(ctx, id, sqrRange, sqrRangeMaster) {
			continue
		}
		cp := ctx.World.Pos[id.Index]
		if !st.LockThroughWalls && wouldHitWall(ctx, bp, cp, false) {
			continue
		}
		if !body.AISettings.View360 {
			dir := float64(jsutil.GetDirection(bp, cp))
			if !(math.Abs(jsutil.AngleDifference(dir, body.FiringArc[0])) < body.FiringArc[1]) {
				continue
			}
		}
		st.ValidTargets = append(st.ValidTargets, id)
	}

	if len(st.ValidTargets) == 0 {
		st.TargetLock = entity.EntityID{}
		return st.ValidTargets
	}

	mostDangerous := 0.0
	for _, id := range st.ValidTargets {
		if e := ctx.World.Get(id); e != nil {
			mostDangerous = math.Max(e.DangerValue, mostDangerous)
		}
	}

	keepTarget := false
	n := 0
	for _, id := range st.ValidTargets {
		e := ctx.World.Get(id)
		if e == nil {
			continue
		}
		if body.AISettings.Farm || e.DangerValue == mostDangerous {
			if st.TargetLock.Valid() && id == st.TargetLock {
				keepTarget = true
			}
			st.ValidTargets[n] = id
			n++
		}
	}
	st.ValidTargets = st.ValidTargets[:n]

	if !keepTarget {
		st.TargetLock = entity.EntityID{}
	}
	return st.ValidTargets
}

func containsEntityID(list []entity.EntityID, id entity.EntityID) bool {
	for _, x := range list {
		if x == id {
			return true
		}
	}
	return false
}

func thinkNearestDifferentMaster(t *Table, id entity.ControllerID, st *State, ctx *Context, input Decision) Decision {
	body := ctx.World.Get(ctx.Body)
	if body == nil {
		return Decision{}
	}
	bodyMaster := ctx.World.Get(body.Master)
	autoOverride := bodyMaster != nil && bodyMaster.AutoOverride
	if (input.HasMain && input.Main) || (input.HasAlt && input.Alt) || autoOverride {
		st.TargetLock = entity.EntityID{}
		return Decision{}
	}

	tracking := body.TopSpeed
	rangeVal := body.Fov
	for i := 0; i < jsGunsMapLength && i < len(ctx.Guns); i++ {
		g := ctx.Guns[i]
		if !(g.CanShoot && !body.AISettings.SKYNET) {
			continue
		}
		if g.TrackingSpeed == 0 || g.TrackingRange == 0 {
			continue
		}
		tracking = g.TrackingSpeed
		r := g.TrackingRange
		if r < ctx.size(ctx.Body)*2 {
			r = body.Fov
		}
		rangeVal = math.Min(rangeVal, g.TrackingSpeed*r)
		break
	}
	if math.IsNaN(tracking) || math.IsInf(tracking, 0) {
		tracking = body.TopSpeed + .01
	}
	if math.IsNaN(rangeVal) || math.IsInf(rangeVal, 0) {
		rangeVal = 640 * body.FOV
	}

	if st.TargetLock.Valid() {
		sqrRange := rangeVal * rangeVal
		if !validateNearestDifferentMaster(ctx, st.TargetLock, sqrRange, sqrRange*4/3) || wouldHitWallBuggySelfCheck(ctx) {
			st.TargetLock = entity.EntityID{}
			st.TargetTick = 100
		}
	}

	st.TargetTick++
	if st.TargetTick > 2 {
		st.TargetTick = 0
		st.ValidTargets = buildNearestDifferentMasterList(ctx, st, rangeVal)
		if st.TargetLock.Valid() && !containsEntityID(st.ValidTargets, st.TargetLock) {
			st.TargetLock = entity.EntityID{}
		}
		if !st.TargetLock.Valid() && len(st.ValidTargets) > 0 {
			if len(st.ValidTargets) == 1 {
				st.TargetLock = st.ValidTargets[0]
			} else {
				bp := ctx.World.Pos[ctx.Body.Index]
				if picked, ok := nearestEntity(ctx.World, st.ValidTargets, bp, nil); ok {
					st.TargetLock = picked
				}
			}
			st.TargetTick = -5
		}
	}

	if !st.TargetLock.Valid() {
		return Decision{}
	}
	lp := ctx.World.Pos[st.TargetLock.Index]
	bp := ctx.World.Pos[ctx.Body.Index]
	radial := ctx.World.Vel[st.TargetLock.Index]
	diff := vmath.Vec2{X: lp.X - bp.X, Y: lp.Y - bp.Y}

	if st.TargetTick%2 == 0 {
		st.TargetLead = 0
		if !body.AISettings.CHASE {
			st.TargetLead = timeOfImpact(diff, radial, tracking)
		}
	}
	if math.IsNaN(st.TargetLead) || math.IsInf(st.TargetLead, 0) {
		st.TargetLead = 0
	}

	out := Decision{
		Target:    vmath.Vec2{X: diff.X + float64(st.TargetLead)*radial.X, Y: diff.Y + float64(st.TargetLead)*radial.Y},
		HasTarget: true,
		Fire:      true, HasFire: true,
		Main: true, HasMain: true,
	}
	if st.MapGoal {
		out.Goal, out.HasGoal = lp, true
	}
	return out
}

func newHealTeamMasters(ctx *Context, opts Opts) State {
	return State{TargetTick: int32(ctx.Rand.Irandom(30))}
}

// validateHealTeamMasters is controllers.js:602-616.
func validateHealTeamMasters(t *Table, ctx *Context, candidateID entity.EntityID) bool {
	e := ctx.World.Get(candidateID)
	body := ctx.World.Get(ctx.Body)
	if e == nil || body == nil {
		return false
	}
	bodyMaster := ctx.World.Get(body.Master)
	if bodyMaster == nil {
		return false
	}
	myGrandmaster := ctx.World.Get(bodyMaster.Master)
	if myGrandmaster == nil {
		return false
	}
	candMaster := ctx.World.Get(e.Master)
	if candMaster == nil {
		return false
	}
	theirGrandmaster := ctx.World.Get(candMaster.Master)
	if theirGrandmaster == nil {
		return false
	}

	fear := 0.7
	if fearID, ok := t.FindKind(e.Controllers, KindFleeAtLowHealth); ok {
		fear = t.State(fearID).Fear
	}

	if e.Health.Amount <= 0 {
		return false
	}
	if theirGrandmaster.Team != myGrandmaster.Team {
		return false
	}
	if theirGrandmaster.IgnoredByAI {
		return false
	}
	if e.Bond.Valid() {
		return false
	}
	if e.Type != "tank" {
		return false
	}
	if ctx.isDominator(candidateID) {
		return false
	}
	if e.Health.Amount > e.Health.Max*fear {
		return false
	}
	if e.Invuln || e.Godmode || theirGrandmaster.Godmode ||
		ctx.isPassive(theirGrandmaster.ID) || ctx.isPassive(myGrandmaster.ID) {
		return false
	}
	if math.IsNaN(e.DangerValue) {
		return false
	}
	return true
}

// buildHealTeamMastersList is controllers.js:621-658.
func buildHealTeamMastersList(t *Table, ctx *Context, st *State, rangeVal float64) []entity.EntityID {
	body := ctx.World.Get(ctx.Body)
	if body == nil {
		st.TargetLock = entity.EntityID{}
		st.ValidTargets = st.ValidTargets[:0]
		return st.ValidTargets
	}
	bp := ctx.World.Pos[ctx.Body.Index]

	st.ValidTargets = st.ValidTargets[:0]
	for _, id := range ctx.Candidates {
		if !validateHealTeamMasters(t, ctx, id) {
			continue
		}
		cp := ctx.World.Pos[id.Index]
		if wouldHitWall(ctx, bp, cp, false) {
			continue
		}
		if !body.AISettings.View360 {
			dir := float64(jsutil.GetDirection(bp, cp))
			if !(math.Abs(jsutil.AngleDifference(dir, body.FiringArc[0])) < body.FiringArc[1]) {
				continue
			}
		}
		st.ValidTargets = append(st.ValidTargets, id)
	}

	if len(st.ValidTargets) == 0 {
		st.TargetLock = entity.EntityID{}
		return st.ValidTargets
	}

	mostDangerous := 0.0
	for _, id := range st.ValidTargets {
		if e := ctx.World.Get(id); e != nil {
			mostDangerous = math.Max(e.DangerValue, mostDangerous)
		}
	}

	keepTarget := false
	n := 0
	for _, id := range st.ValidTargets {
		e := ctx.World.Get(id)
		if e == nil {
			continue
		}
		if body.AISettings.Farm || e.DangerValue == mostDangerous {
			if st.TargetLock.Valid() && id == st.TargetLock {
				keepTarget = true
			}
			st.ValidTargets[n] = id
			n++
		}
	}
	st.ValidTargets = st.ValidTargets[:n]

	if !keepTarget {
		st.TargetLock = entity.EntityID{}
	}
	return st.ValidTargets
}

// thinkHealTeamMasters is controllers.js:659-729.
func thinkHealTeamMasters(t *Table, id entity.ControllerID, st *State, ctx *Context, input Decision) Decision {
	body := ctx.World.Get(ctx.Body)
	if body == nil {
		return Decision{}
	}
	bodyMaster := ctx.World.Get(body.Master)
	autoOverride := bodyMaster != nil && bodyMaster.AutoOverride
	if (input.HasMain && input.Main) || (input.HasAlt && input.Alt) || autoOverride {
		st.TargetLock = entity.EntityID{}
		return Decision{}
	}

	tracking := body.TopSpeed
	rangeVal := body.Fov
	for i := 0; i < jsGunsMapLength && i < len(ctx.Guns); i++ {
		g := ctx.Guns[i]
		if !(g.CanShoot && !body.AISettings.SKYNET) {
			continue
		}
		if g.TrackingSpeed == 0 || g.TrackingRange == 0 {
			continue
		}
		tracking = g.TrackingSpeed
		r := g.TrackingRange
		if r < ctx.size(ctx.Body)*2 {
			r = body.Fov
		}
		rangeVal = math.Min(rangeVal, g.TrackingSpeed*r)
		break
	}
	if math.IsNaN(tracking) || math.IsInf(tracking, 0) {
		tracking = body.TopSpeed + .01
	}
	_ = tracking
	if math.IsNaN(rangeVal) || math.IsInf(rangeVal, 0) {
		rangeVal = 340 * body.FOV
	}

	if st.TargetLock.Valid() {
		if !validateHealTeamMasters(t, ctx, st.TargetLock) || wouldHitWallBuggySelfCheck(ctx) {
			st.TargetLock = entity.EntityID{}
			st.TargetTick = 100
		}
	}

	st.TargetTick++
	if st.TargetTick > 2 {
		st.TargetTick = 0
		st.ValidTargets = buildHealTeamMastersList(t, ctx, st, rangeVal)
		if st.TargetLock.Valid() && !containsEntityID(st.ValidTargets, st.TargetLock) {
			st.TargetLock = entity.EntityID{}
		}
		if !st.TargetLock.Valid() && len(st.ValidTargets) > 0 {
			if len(st.ValidTargets) == 1 {
				st.TargetLock = st.ValidTargets[0]
			} else {
				bp := ctx.World.Pos[ctx.Body.Index]
				if picked, ok := nearestEntity(ctx.World, st.ValidTargets, bp, nil); ok {
					st.TargetLock = picked
				}
			}
			st.TargetTick = -5
		}
	}

	if !st.TargetLock.Valid() {
		return Decision{}
	}
	lp := ctx.World.Pos[st.TargetLock.Index]
	bp := ctx.World.Pos[ctx.Body.Index]
	radial := ctx.World.Vel[st.TargetLock.Index]
	diff := vmath.Vec2{X: lp.X - bp.X, Y: lp.Y - bp.Y}

	if st.TargetTick%2 == 0 {
		st.TargetLead = 0
	}
	if math.IsNaN(st.TargetLead) || math.IsInf(st.TargetLead, 0) {
		st.TargetLead = 0
	}

	return Decision{
		Target:    vmath.Vec2{X: diff.X + float64(st.TargetLead)*radial.X, Y: diff.Y + float64(st.TargetLead)*radial.Y},
		HasTarget: true,
		Fire:      true, HasFire: true,
		Main: true, HasMain: true,
	}
}
