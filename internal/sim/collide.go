package sim

import (
	"math"

	"arrasgo/internal/entity"
)

var auraCollideTypes = [4]string{"miniboss", "tank", "food", "crasher"}

func isAuraTarget(t string) bool {
	for _, k := range auraCollideTypes {
		if k == t {
			return true
		}
	}
	return false
}

func (s *Sim) Collide(instanceID, otherID entity.EntityID) {
	instance, other := s.W.Get(instanceID), s.W.Get(otherID)
	if instance == nil || other == nil {
		return
	}

	xi, xo := s.extraOf(instanceID), s.extraOf(otherID)
	if (xi != nil && xi.Noclip) || (xo != nil && xo.Noclip) {
		return
	}

	if s.Hooks.OnCollide != nil {
		s.Hooks.OnCollide(instanceID, otherID)
		s.Hooks.OnCollide(otherID, instanceID)
		instance, other = s.W.Get(instanceID), s.W.Get(otherID)
		if instance == nil || other == nil {
			return
		}
		xi, xo = s.extraOf(instanceID), s.extraOf(otherID)
	}

	if instance.Settings.NoCollisions || other.Settings.NoCollisions {
		return
	}
	if mm := s.masterOfMaster(instanceID); mm != nil && mm.Settings.NoCollisions {
		return
	}
	if mm := s.masterOfMaster(otherID); mm != nil && mm.Settings.NoCollisions {
		return
	}

	if s.W.Flag[instanceID.Index].Has(entity.FlagGhost) || instance.IsDead() {
		if s.W.Flag[instanceID.Index].Has(entity.FlagInGrid) {
			s.destroy(instanceID)
		}
		return
	}
	if s.W.Flag[otherID.Index].Has(entity.FlagGhost) || other.IsDead() {
		if s.W.Flag[otherID.Index].Has(entity.FlagInGrid) {
			s.destroy(otherID)
		}
		return
	}

	if (instance.IsArenaCloser && instance.Alpha == 0) || (other.IsArenaCloser && other.Alpha == 0) {
		return
	}

	if instance.Settings.HitsOwnType == "never" && other.Settings.HitsOwnType == "never" &&
		instance.Team == other.Team &&
		instance.Type == "wall" && other.Type == "wall" {
		return
	}

	switch {
	case (xi != nil && xi.IsPortal) || (xo != nil && xo.IsPortal):
		s.collidePortal(instanceID, otherID, xi)

	case instance.Type == "wall" || other.Type == "wall":
		s.collideWall(instanceID, otherID)

	case instance.Team == other.Team &&
		(instance.Settings.HitsOwnType == "pushOnlyTeam" || other.Settings.HitsOwnType == "pushOnlyTeam"):
		s.collidePushOnlyTeam(instanceID, otherID)

	case instance.Team == other.Team &&
		instance.Settings.HitsOwnType == "droneCollision" && other.Settings.HitsOwnType == "droneCollision":
		a := 1 + 10/math.Max(s.velLength(instanceID.Index), s.velLength(otherID.Index))
		s.Firmcollide(instanceID, otherID, a)

	case (instance.Type == "crasher" && other.Type == "food" && instance.Team == other.Team) ||
		(other.Type == "crasher" && instance.Type == "food" && other.Team == instance.Team):
		s.Firmcollide(instanceID, otherID, 0)

	case instance.Team != other.Team ||
		(instance.Team == other.Team && instance.Healer && !sameID(instance.Master, otherID)) ||
		(other.Healer && !sameID(other.Master, instanceID)):
		if instance.Type == "aura" {
			if !isAuraTarget(other.Type) {
				return
			}
		} else if other.Type == "aura" {
			if !isAuraTarget(instance.Type) {
				return
			}
		}
		s.Advancedcollide(instanceID, otherID, true, true, 0)

	case instance.Settings.HitsOwnType == "never" || other.Settings.HitsOwnType == "never":
		// Deliberately empty: the arm exists to stop the next one matching.

	case instance.Settings.HitsOwnType == other.Settings.HitsOwnType:
		s.collideSameType(instanceID, otherID)
	}
}

func (s *Sim) collidePortal(instanceID, otherID entity.EntityID, xi *extra) {
	portalID, bodyID := otherID, instanceID
	if xi != nil && xi.IsPortal {
		portalID, bodyID = instanceID, otherID
	}
	portal, body := s.W.Get(portalID), s.W.Get(bodyID)
	if portal == nil || body == nil {
		return
	}
	if portal.Settings.Destination != "" && s.W.Flag[bodyID.Index].Has(entity.FlagPlayer) {
		if s.Hooks.SendToServer != nil {
			s.Hooks.SendToServer(bodyID, portal.Settings.Destination)
		}
		return
	}
	switch body.Type {
	case "bullet", "drone", "trap", "satellite":
		if !sameID(body.Master, portalID) {
			s.W.Kill(bodyID)
		}
	case "wall", "aura":
	default:
		s.Advancedcollide(portalID, bodyID, false, false, 0)
	}
}

func (s *Sim) collideWall(instanceID, otherID entity.EntityID) {
	instance, other := s.W.Get(instanceID), s.W.Get(otherID)
	if instance == nil || other == nil {
		return
	}
	if instance.Type == "wall" && other.Type == "wall" {
		return
	}
	if instance.Type == "aura" || other.Type == "aura" {
		return
	}
	if instance.Type == "satellite" || other.Type == "satellite" {
		return
	}
	wallID, bodyID := otherID, instanceID
	if instance.Type == "wall" {
		wallID, bodyID = instanceID, otherID
	}
	wall, body := s.W.Get(wallID), s.W.Get(bodyID)
	if wall == nil || body == nil {
		return
	}
	if body.IsArenaCloser {
		return
	}
	if m := s.W.Get(body.Master); m != nil && m.IsArenaCloser {
		return
	}
	if wall.Shape == 4 {
		if wall.Walltype == 1 {
			s.Mazewallcollide(wallID, bodyID)
		} else {
			s.Mazewallcustomcollide(wallID, bodyID)
		}
		return
	}
	s.Mooncollide(wallID, bodyID)
}

func (s *Sim) collidePushOnlyTeam(instanceID, otherID entity.EntityID) {
	instance, other := s.W.Get(instanceID), s.W.Get(otherID)
	if instance == nil || other == nil {
		return
	}
	pusherID, bodyID := otherID, instanceID
	if instance.Settings.HitsOwnType == "pushOnlyTeam" {
		pusherID, bodyID = instanceID, otherID
	}
	body := s.W.Get(bodyID)
	if body == nil {
		return
	}
	if instance.Settings.HitsOwnType == other.Settings.HitsOwnType || body.Settings.HitsOwnType == "never" {
		return
	}
	a := 1 + 10/(math.Max(s.velLength(bodyID.Index), s.velLength(pusherID.Index))+10)
	s.Advancedcollide(pusherID, bodyID, false, false, a)
}

func (s *Sim) collideSameType(instanceID, otherID entity.EntityID) {
	instance, other := s.W.Get(instanceID), s.W.Get(otherID)
	if instance == nil || other == nil {
		return
	}
	switch instance.Settings.HitsOwnType {
	case "assembler":
		if !s.assemblerMerge(instanceID, otherID) {
			return
		}
		s.Advancedcollide(instanceID, otherID, false, false, 0)

	case "push":
		s.Advancedcollide(instanceID, otherID, false, false, 0)

	case "hard":
		s.Firmcollide(instanceID, otherID, 0)

	case "hardWithBuffer":
		s.Firmcollide(instanceID, otherID, 30)

	case "hardOnlyTanks":
		xi, xo := s.extraOf(instanceID), s.extraOf(otherID)
		dominator := (xi != nil && xi.IsDominator) || (xo != nil && xo.IsDominator)
		if instance.Type == "tank" && other.Type == "tank" && !dominator {
			if s.Gamemode.Train {
				s.Firmcollidehard(instanceID, otherID, 20)
			} else {
				s.Firmcollide(instanceID, otherID, 0)
			}
		}

	case "hardOnlyBosses":
		if instance.Type == other.Type && instance.Type == "miniboss" {
			s.Firmcollide(instanceID, otherID, 0)
		}

	case "repel":
		s.Simplecollide(instanceID, otherID)
	}
}

func (s *Sim) assemblerMerge(instanceID, otherID entity.EntityID) bool {
	instance, other := s.W.Get(instanceID), s.W.Get(otherID)
	if instance == nil || other == nil {
		return false
	}
	xi, xo := s.extraOf(instanceID), s.extraOf(otherID)
	if xi == nil || xo == nil {
		return false
	}
	if xi.AssemblerLevel == 0 {
		xi.AssemblerLevel = 1
	}
	if xo.AssemblerLevel == 0 {
		xo.AssemblerLevel = 1
	}

	id1, id2 := otherID, instanceID
	if instance.WireID > other.WireID {
		id1, id2 = instanceID, otherID
	}
	t1, t2 := s.W.Get(id1), s.W.Get(id2)
	x1, x2 := s.extraOf(id1), s.extraOf(id2)

	p1, ok1 := s.parentWireID(id1)
	p2, ok2 := s.parentWireID(id2)
	if x2.AssemblerLevel >= 10 || x1.AssemblerLevel >= 10 ||
		t1.IsDead() || t2.IsDead() ||
		(p1 != p2 && ok1 && ok2) {
		s.Advancedcollide(instanceID, otherID, false, false, 0)
		return false
	}

	better := func(a, b float64) float64 {
		if a > b {
			return a
		}
		return b
	}
	x1.AssemblerLevel = int32(math.Min(float64(x2.AssemblerLevel+x1.AssemblerLevel), 10))
	t1.SIZE = better(t1.SIZE, t2.SIZE) * 1.15
	t1.SPEED = better(t1.SPEED, t2.SPEED) * 0.9
	t1.HEALTH = better(t1.HEALTH, t2.HEALTH) * 1.2
	t1.Health.Amount = t1.Health.Max
	t1.DAMAGE = better(t1.DAMAGE, t2.DAMAGE) * 1.1
	s.W.Kill(id2)
	if s.Hooks.RefreshBodyAttributes != nil {
		s.Hooks.RefreshBodyAttributes(id1)
	}

	if s.Rand != nil {
		for i := 0; i < 10; i++ {
			vx := (s.Rand.Random(1) - 0.5) * 25
			vy := (s.Rand.Random(1) - 0.5) * 15
			if s.Hooks.SpawnAssemblerEffect != nil {
				if t := s.W.Get(id1); t != nil {
					s.Hooks.SpawnAssemblerEffect(id1, vx, vy, t.SIZE/1.5)
				}
			}
		}
	}
	return true
}

func (s *Sim) parentWireID(id entity.EntityID) (uint32, bool) {
	e := s.W.Get(id)
	if e == nil {
		return 0, false
	}
	p := s.W.Get(e.Parent)
	if p == nil {
		return 0, false
	}
	return p.WireID, true
}

func (s *Sim) destroy(id entity.EntityID) {
	if s.Hooks.Destroy != nil {
		s.Hooks.Destroy(id)
		return
	}
	s.W.Destroy(id)
}
