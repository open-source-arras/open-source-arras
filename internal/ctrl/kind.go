// Package ctrl ports the 32 io_* AI controllers from js-src/server/miscFiles/controllers.js.
package ctrl

// Kind identifies which of the 32 io_* classes a controller is. It stands in for the
// JS `constructor` identity that addController compares with `===` (entity.js:139).
type Kind uint8

const (
	KindNone Kind = iota
	KindSiegeAI
	KindDoNothing
	KindMoveInCircles
	KindListenToPlayer
	KindMapTargetToGoal
	KindBoomerang
	KindGoToMasterTarget
	KindCanRepel
	KindAlwaysFire
	KindTargetSelf
	KindMapAltToFire
	KindMapFireToAlt
	KindOnlyAcceptInArc
	KindStackGuns
	KindNearestDifferentMaster
	KindHealTeamMasters
	KindAvoid
	KindMinion
	KindHangOutNearMaster
	KindSpin
	KindSpin2
	KindFleeAtLowHealth
	KindZoom
	KindWanderAroundMap
	KindFormulaTarget
	KindWhirlwind
	KindOrbit
	KindSnake
	KindDisableOnOverride
	KindScaleWithMaster
	KindSnakeTillNot
	KindOroboros

	kindCount // sentinel, not a real kind
)

var kindNames = [kindCount]string{
	KindNone:                   "none",
	KindSiegeAI:                "siegeAI",
	KindDoNothing:              "doNothing",
	KindMoveInCircles:          "moveInCircles",
	KindListenToPlayer:         "listenToPlayer",
	KindMapTargetToGoal:        "mapTargetToGoal",
	KindBoomerang:              "boomerang",
	KindGoToMasterTarget:       "goToMasterTarget",
	KindCanRepel:               "canRepel",
	KindAlwaysFire:             "alwaysFire",
	KindTargetSelf:             "targetSelf",
	KindMapAltToFire:           "mapAltToFire",
	KindMapFireToAlt:           "mapFireToAlt",
	KindOnlyAcceptInArc:        "onlyAcceptInArc",
	KindStackGuns:              "stackGuns",
	KindNearestDifferentMaster: "nearestDifferentMaster",
	KindHealTeamMasters:        "healTeamMasters",
	KindAvoid:                  "avoid",
	KindMinion:                 "minion",
	KindHangOutNearMaster:      "hangOutNearMaster",
	KindSpin:                   "spin",
	KindSpin2:                  "spin2",
	KindFleeAtLowHealth:        "fleeAtLowHealth",
	KindZoom:                   "zoom",
	KindWanderAroundMap:        "wanderAroundMap",
	KindFormulaTarget:          "formulaTarget",
	KindWhirlwind:              "whirlwind",
	KindOrbit:                  "orbit",
	KindSnake:                  "snake",
	KindDisableOnOverride:      "disableOnOverride",
	KindScaleWithMaster:        "scaleWithMaster",
	KindSnakeTillNot:           "snakeTillNot",
	KindOroboros:               "oroboros",
}

func (k Kind) String() string {
	if int(k) < len(kindNames) {
		return kindNames[k]
	}
	return "unknown"
}

// KindByName resolves an ioTypes key to a Kind.
func KindByName(name string) (Kind, bool) {
	for k := Kind(1); k < kindCount; k++ {
		if kindNames[k] == name {
			return k, true
		}
	}
	return KindNone, false
}

func (k Kind) acceptsFromTop() bool {
	switch k {
	case KindDoNothing, KindMoveInCircles, KindListenToPlayer, KindHangOutNearMaster:
		return false
	default:
		return true
	}
}

func (k Kind) AcceptsFromTop() bool { return k.acceptsFromTop() }
