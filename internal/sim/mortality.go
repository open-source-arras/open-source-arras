package sim

import (
	"arrasgo/internal/entity"
	"arrasgo/internal/jsutil"
)

// ContemplationOfMortality is entity.js:1033.
func (s *Sim) ContemplationOfMortality(id entity.EntityID) bool {
	e := s.W.Get(id)
	if e == nil {
		return false
	}

	if e.Invuln || e.Godmode {
		e.DamageReceived = 0
		return false
	}

	if e.DamageReceived > 0 {
		s.inflictors = s.inflictors[:0]
		s.tools = s.tools[:0]
		for _, otherID := range e.CollisionArray {
			other := s.W.Get(otherID)
			if other == nil || other.Type == "wall" || other.Damage == 0 {
				continue
			}
			s.inflictors = append(s.inflictors, other.Master)
			s.tools = append(s.tools, otherID)
		}
		if s.Hooks.OnDamage != nil {
			s.Hooks.OnDamage(id, s.inflictors, s.tools)
			if e = s.W.Get(id); e == nil {
				return false
			}
		}
	}

	if e.Settings.DiesAtRange {
		e.Range -= 1 / s.RoomSpeed
		if e.Range < 0 {
			s.W.Kill(id)
		}
	}
	if e.Settings.DiesAtLowSpeed && len(e.CollisionArray) == 0 &&
		s.velLength(id.Index) < e.TopSpeed/2 {
		e.Health.Amount -= e.Health.GetDamage(1/s.RoomSpeed, true)
	}

	// capped is true at all three of these call sites: healthType.js:17 declares
	// `getDamage(amount, capped = true)` and entity.js passes one argument. Only
	// advancedcollide's two death-factor probes pass false explicitly.
	if e.Shield.Max != 0 && e.DamageReceived != 0 {
		shieldDamage := e.Shield.GetDamage(e.DamageReceived, true)
		e.DamageReceived -= shieldDamage
		e.Shield.Amount -= shieldDamage
	}
	if e.DamageReceived != 0 {
		healthDamage := e.Health.GetDamage(e.DamageReceived, true)
		e.Blend.Amount = 1
		e.Health.Amount -= healthDamage
	}
	e.DamageReceived = 0

	if e.ReadyToDie {
		return true
	}
	if !e.IsDead() {
		return false
	}

	e.ReadyToDie = true
	if s.Hooks.ShootOnDeath != nil {
		s.Hooks.ShootOnDeath(id)
		if e = s.W.Get(id); e == nil {
			return true
		}
	}
	s.awardKills(id, e)
	return true
}

// awardKills distributes score to killers and updates kill counts.
func (s *Sim) awardKills(id entity.EntityID, e *entity.Entity) {
	s.killers = s.killers[:0]
	s.tools = s.tools[:0]
	notJustFood := false
	jackpot := jsutil.GetJackpot(e.Skill.Score) / float64(len(e.CollisionArray))

	for _, toolID := range e.CollisionArray {
		tool := s.W.Get(toolID)
		if tool == nil || tool.Type == "wall" || tool.Damage == 0 {
			continue
		}
		master := s.W.Get(tool.Master)
		if master != nil && master.Settings.AcceptsScore {
			if master.Type == "tank" || master.Type == "miniboss" {
				notJustFood = true
			}
			master.Skill.Score += jackpot
			s.killers = append(s.killers, tool.Master)
		} else if tool.Settings.AcceptsScore {
			tool.Skill.Score += jackpot
		}
		s.tools = append(s.tools, toolID)
	}

	out := s.killers[:0]
	for i, k := range s.killers {
		dup := false
		for j := 0; j < i; j++ {
			if sameID(s.killers[j], k) {
				dup = true
				break
			}
		}
		if !dup {
			out = append(out, k)
		}
	}
	s.killers = out

	if s.Hooks.OnKill != nil {
		for _, k := range s.killers {
			s.Hooks.OnKill(k, id)
		}
		if e = s.W.Get(id); e == nil {
			return
		}
	}

	for _, k := range s.killers {
		killer := s.W.Get(k)
		if killer == nil {
			continue
		}
		switch e.Type {
		case "tank":
			if len(s.killers) > 1 {
				killer.KillCount.Assists++
			} else {
				killer.KillCount.Solo++
			}
		case "food", "crasher":
			killer.KillCount.Polygons++
		case "miniboss":
			killer.KillCount.Bosses++
		}
		e.KillCount.Killers = append(e.KillCount.Killers, killer.Index)
	}

	if s.Hooks.OnDeath != nil {
		s.death = Death{
			Victim:      id,
			Killers:     s.killers,
			KillTools:   s.tools,
			NotJustFood: notJustFood,
			Jackpot:     jackpot,
		}
		s.Hooks.OnDeath(&s.death)
	}
}

// RegenHealthAndShield is gameHandler.regenHealthAndShield (game/index.js:367).
func (s *Sim) RegenHealthAndShield() {
	for _, id := range s.order {
		e := s.W.Get(id)
		if e == nil {
			continue
		}
		if e.Shield.Max != 0 {
			e.Shield.Regenerate(0)
		}
		if e.Health.Amount != 0 {
			boost := 0.0
			if e.Shield.Max != 0 && e.Shield.Max == e.Shield.Amount {
				boost = 1
			}
			e.Health.Regenerate(boost)
		}
	}
}
