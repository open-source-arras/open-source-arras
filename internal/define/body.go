package define

import (
	"math"

	"arrasgo/internal/entity"
)

// RefreshBodyAttributes is entity.js:585-621.
func (d *Definer) RefreshBodyAttributes(w *entity.World, id entity.EntityID) {
	e := w.Get(id)
	if e == nil {
		return
	}
	sizeCtx := d.sizeContext()

	levelCeiling := 45.0
	speedReduceCeiling := 2.0
	if d.cfg.Growth {
		levelCeiling = 120
		speedReduceCeiling = 4
	}
	level := math.Min(levelCeiling, float64(e.Level(d.cfg.Tuning)))

	base := e.CoreSize
	if base == 0 {
		base = e.SIZE
	}
	speedReduce := math.Min(speedReduceCeiling, w.ComputeSize(id, sizeCtx)/base)

	runSpeed := d.cfg.Tuning.RunSpeed

	e.Acceleration = (runSpeed * e.ACCELERATION) / speedReduce
	if e.Settings.ReloadToAcceleration {
		e.Acceleration *= e.Skill.Acl
	}
	e.TopSpeed = (runSpeed * e.SPEED * e.Skill.Mob) / speedReduce
	if e.Settings.ReloadToAcceleration {
		e.TopSpeed /= math.Sqrt(e.Skill.Acl)
	}

	healthLevelBonus := 0.0
	shieldLevelBonus := 0.0
	regenLevelBonus := 0.0
	if e.Settings.HealthWithLevel {
		healthLevelBonus = 2 * level
		shieldLevelBonus = 0.6 * level
		regenLevelBonus = 0.006 * level
	}
	e.Health.Set((healthLevelBonus+e.HEALTH)*e.Skill.Hlt, 0)
	e.Health.Resist = 1 - 1/math.Max(1, e.RESIST+e.Skill.Brst)
	e.Shield.Set(
		(shieldLevelBonus+e.SHIELD)*e.Skill.Shi,
		math.Max(0, (regenLevelBonus+1)*e.REGEN*e.Skill.Rgn),
	)

	e.Damage = e.DAMAGE * e.Skill.Atk
	e.Penetration = e.PENETRATION + 1.5*(e.Skill.Brst+0.8*(e.Skill.Atk-1))

	if e.Settings.DiesAtRange || e.Range == 0 {
		e.Range = e.RANGE
	}
	e.Density = (1 + 0.08*float64(e.Level(d.cfg.Tuning))) * e.DENSITY
	e.Stealth = e.STEALTH
	e.Pushability = e.PUSHABILITY
	e.Knockback = e.KNOCKBACK
	e.SizeMultiplier = 1
	e.RecoilMultiplier = e.RECOIL_MULTIPLIER
}

// UpdateBodyInfo is entity.js:623.
func (d *Definer) UpdateBodyInfo(w *entity.World, id entity.EntityID) {
	w.UpdateBodyInfo(id, d.sizeContext())
}

// SizeContext returns the size context for the definer.
func (d *Definer) SizeContext() entity.SizeContext { return d.sizeContext() }
