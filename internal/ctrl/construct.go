package ctrl

// Dispatches to per-kind constructors. See entity.js:224.
func construct(ctx *Context, spec Spec) State {
	switch spec.Kind {
	case KindSiegeAI:
		return newSiegeAI(ctx, spec.Opts)
	case KindDoNothing:
		return newDoNothing(ctx, spec.Opts)
	case KindMoveInCircles:
		return newMoveInCircles(ctx, spec.Opts)
	case KindListenToPlayer:
		return newListenToPlayer(ctx, spec.Opts)
	case KindMapTargetToGoal:
		return newMapTargetToGoal(ctx, spec.Opts)
	case KindBoomerang:
		return newBoomerang(ctx, spec.Opts)
	case KindGoToMasterTarget:
		return newGoToMasterTarget(ctx, spec.Opts)
	case KindCanRepel:
		return newCanRepel(ctx, spec.Opts)
	case KindAlwaysFire:
		return newAlwaysFire(ctx, spec.Opts)
	case KindTargetSelf:
		return newTargetSelf(ctx, spec.Opts)
	case KindMapAltToFire:
		return newMapAltToFire(ctx, spec.Opts)
	case KindMapFireToAlt:
		return newMapFireToAlt(ctx, spec.Opts)
	case KindOnlyAcceptInArc:
		return newOnlyAcceptInArc(ctx, spec.Opts)
	case KindStackGuns:
		return newStackGuns(ctx, spec.Opts)
	case KindNearestDifferentMaster:
		return newNearestDifferentMaster(ctx, spec.Opts)
	case KindHealTeamMasters:
		return newHealTeamMasters(ctx, spec.Opts)
	case KindAvoid:
		return newAvoid(ctx, spec.Opts)
	case KindMinion:
		return newMinion(ctx, spec.Opts)
	case KindHangOutNearMaster:
		return newHangOutNearMaster(ctx, spec.Opts)
	case KindSpin:
		return newSpin(ctx, spec.Opts)
	case KindSpin2:
		return newSpin2(ctx, spec.Opts)
	case KindFleeAtLowHealth:
		return newFleeAtLowHealth(ctx, spec.Opts)
	case KindZoom:
		return newZoom(ctx, spec.Opts)
	case KindWanderAroundMap:
		return newWanderAroundMap(ctx, spec.Opts)
	case KindFormulaTarget:
		return newFormulaTarget(ctx, spec.Opts)
	case KindWhirlwind:
		return newWhirlwind(ctx, spec.Opts)
	case KindOrbit:
		return newOrbit(ctx, spec.Opts)
	case KindSnake:
		return newSnake(ctx, spec.Opts)
	case KindDisableOnOverride:
		return newDisableOnOverride(ctx, spec.Opts)
	case KindScaleWithMaster:
		return newScaleWithMaster(ctx, spec.Opts)
	case KindSnakeTillNot:
		return newSnakeTillNot(ctx, spec.Opts)
	case KindOroboros:
		return newOroboros(ctx, spec.Opts)
	default:
		return State{}
	}
}
