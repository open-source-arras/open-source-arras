package ctrl

import "arrasgo/internal/entity"

// Table is the room-owned controller table.
type Table struct {
	kinds  []Kind
	states []State
}

func NewTable(capacity int) *Table {
	return &Table{
		kinds:  make([]Kind, 0, capacity),
		states: make([]State, 0, capacity),
	}
}

func (t *Table) Len() int { return len(t.kinds) }

func (t *Table) Kind(id entity.ControllerID) Kind {
	if int(id) >= len(t.kinds) {
		return KindNone
	}
	return t.kinds[id]
}

func (t *Table) State(id entity.ControllerID) *State {
	return &t.states[id]
}

func (t *Table) FindKind(ids []entity.ControllerID, kind Kind) (entity.ControllerID, bool) {
	for _, id := range ids {
		if t.Kind(id) == kind {
			return id, true
		}
	}
	return 0, false
}

func (t *Table) alloc(ctx *Context, spec Spec) entity.ControllerID {
	id := entity.ControllerID(len(t.kinds))
	t.kinds = append(t.kinds, spec.Kind)
	t.states = append(t.states, construct(ctx, spec))
	return id
}

func (t *Table) replace(ctx *Context, id entity.ControllerID, spec Spec) {
	t.kinds[id] = spec.Kind
	t.states[id] = construct(ctx, spec)
}

func (t *Table) Add(ctx *Context, existing []entity.ControllerID, specs []Spec) []entity.ControllerID {
	newIO := append([]Spec(nil), specs...)
	for oldID := 0; oldID < len(existing); oldID++ {
		for newID := 0; newID < len(newIO); newID++ {
			if newIO[newID].Kind == t.Kind(existing[oldID]) {
				t.replace(ctx, existing[oldID], newIO[newID])
				newIO = append(newIO[:newID], newIO[newID+1:]...)
			}
		}
	}
	for _, spec := range newIO {
		existing = append(existing, t.alloc(ctx, spec))
	}
	return existing
}

func (t *Table) Think(ctx *Context, id entity.ControllerID, input Decision) Decision {
	if int(id) >= len(t.kinds) {
		return Decision{}
	}
	st := &t.states[id]
	switch t.kinds[id] {
	case KindSiegeAI:
		return thinkSiegeAI(st, ctx, input)
	case KindDoNothing:
		return thinkDoNothing(st, ctx, input)
	case KindMoveInCircles:
		return thinkMoveInCircles(st, ctx, input)
	case KindListenToPlayer:
		return thinkListenToPlayer(st, ctx, input)
	case KindMapTargetToGoal:
		return thinkMapTargetToGoal(st, ctx, input)
	case KindBoomerang:
		return thinkBoomerang(st, ctx, input)
	case KindGoToMasterTarget:
		return thinkGoToMasterTarget(st, ctx, input)
	case KindCanRepel:
		return thinkCanRepel(st, ctx, input)
	case KindAlwaysFire:
		return thinkAlwaysFire(st, ctx, input)
	case KindTargetSelf:
		return thinkTargetSelf(st, ctx, input)
	case KindMapAltToFire:
		return thinkMapAltToFire(st, ctx, input)
	case KindMapFireToAlt:
		return thinkMapFireToAlt(st, ctx, input)
	case KindOnlyAcceptInArc:
		return thinkOnlyAcceptInArc(st, ctx, input)
	case KindStackGuns:
		return thinkStackGuns(st, ctx, input)
	case KindNearestDifferentMaster:
		return thinkNearestDifferentMaster(t, id, st, ctx, input)
	case KindHealTeamMasters:
		return thinkHealTeamMasters(t, id, st, ctx, input)
	case KindAvoid:
		return thinkAvoid(st, ctx, input)
	case KindMinion:
		return thinkMinion(st, ctx, input)
	case KindHangOutNearMaster:
		return thinkHangOutNearMaster(st, ctx, input)
	case KindSpin:
		return thinkSpin(st, ctx, input)
	case KindSpin2:
		return thinkSpin2(st, ctx, input)
	case KindFleeAtLowHealth:
		return thinkFleeAtLowHealth(st, ctx, input)
	case KindZoom:
		return thinkZoom(st, ctx, input)
	case KindWanderAroundMap:
		return thinkWanderAroundMap(st, ctx, input)
	case KindFormulaTarget:
		return thinkFormulaTarget(st, ctx, input)
	case KindWhirlwind:
		return thinkWhirlwind(st, ctx, input)
	case KindOrbit:
		return thinkOrbit(t, id, st, ctx, input)
	case KindSnake:
		return thinkSnake(st, ctx, input)
	case KindDisableOnOverride:
		return thinkDisableOnOverride(st, ctx, input)
	case KindScaleWithMaster:
		return thinkScaleWithMaster(st, ctx, input)
	case KindSnakeTillNot:
		return thinkSnakeTillNot(t, id, st, ctx, input)
	case KindOroboros:
		return thinkOroboros(t, id, st, ctx, input)
	default:
		return Decision{}
	}
}
