package guns

import (
	"math"

	"arrasgo/internal/jsmath"

	"arrasgo/internal/entity"
)

const (
	CalcThruster          = "thruster"
	CalcSustained         = "sustained"
	CalcSustainedLowSpeed = "sustained+lowspeed"
	CalcSwarm             = "swarm"
	CalcTrap              = "trap"
	CalcBlock             = "block"
	CalcFixedReload       = "fixedReload"
	CalcNecro             = "necro"
	CalcDrone             = "drone"
)

// InterpretedStats corresponds to gun.js:625-688's interpret() result.
type InterpretedStats struct {
	Speed       float64
	Health      float64
	Resist      float64
	Damage      float64
	Penetration float64
	Range       float64
	Density     float64
	Pushability float64
	Hetero      float64
}

// Interpret corresponds to gun.js:625-688. Updates ReloadRateFactor and ChildrenLimitFactor as side effects, even when false.
func (g *Gun) Interpret(w *entity.World, sizeCtx entity.SizeContext) (InterpretedStats, bool) {
	if !g.CanShoot {
		return InterpretedStats{}, false
	}

	var sizeFactor float64
	if master := w.Get(g.Master); master != nil {
		sizeFactor = float64(w.ComputeSize(g.Master, sizeCtx)) / master.SIZE
	}

	sk := g.skillMultipliers(w)
	shoot := g.Settings

	out := InterpretedStats{
		Speed:       shoot.MaxSpeed * sk.Spd,
		Health:      shoot.Health * sk.Str,
		Resist:      shoot.Resist + sk.Rst,
		Damage:      shoot.Damage * sk.Dam,
		Penetration: math.Max(1, shoot.Pen*sk.Pen),
		Range:       shoot.Range / math.Sqrt(sk.Spd),
		Density:     (shoot.Density * sk.Pen * sk.Pen) / sizeFactor,
		Pushability: 1 / sk.Pen,
		Hetero:      3 - 2.8*sk.Ghost,
	}
	g.ReloadRateFactor = sk.Rld

	switch g.Calculator {
	case CalcThruster:
		g.TrueRecoil = shoot.Recoil * math.Sqrt(sk.Rld*sk.Spd)
	case CalcSustained:
		out.Range = shoot.Range
	case CalcSustainedLowSpeed:
		out.Range = shoot.Range
		out.Speed = shoot.MaxSpeed + sk.Spd
	case CalcSwarm:
		out.Penetration = math.Max(1, shoot.Pen*(0.5*(sk.Pen-1)+1))
		out.Health /= shoot.Pen * sk.Pen
	case CalcTrap, CalcBlock:
		out.Pushability = 1 / jsmath.Pow(sk.Pen, 0.5)
		out.Range = shoot.Range
	case CalcFixedReload:
		g.ReloadRateFactor = 1
	case CalcNecro:
		g.ChildrenLimitFactor = sk.Rld
		g.ReloadRateFactor = 1
	case CalcDrone:
		out.Pushability = 1
		out.Penetration = math.Max(1, shoot.Pen*(0.5*(sk.Pen-1)+1))
		out.Health = (shoot.Health*sk.Str + sizeFactor) / jsmath.Pow(sk.Pen, 0.8)
		out.Damage = shoot.Damage * sk.Dam * math.Sqrt(sizeFactor) * math.Sqrt(shoot.Pen*sk.Pen)
	}

	if g.IndependentChildren {
		return InterpretedStats{}, false
	}

	out.Speed *= g.BulletBodyStats.Speed.Or(1)
	out.Health *= g.BulletBodyStats.Health.Or(1)
	out.Resist *= g.BulletBodyStats.Resist.Or(1)
	out.Damage *= g.BulletBodyStats.Damage.Or(1)
	out.Penetration *= g.BulletBodyStats.Penetration.Or(1)
	out.Range *= g.BulletBodyStats.Range.Or(1)
	out.Density *= g.BulletBodyStats.Density.Or(1)
	out.Pushability *= g.BulletBodyStats.Pushability.Or(1)
	out.Hetero *= g.BulletBodyStats.Hetero.Or(1)
	return out, true
}

// skillMultipliers reads Body's skill when UseMaster is set, not Master's.
func (g *Gun) skillMultipliers(w *entity.World) entity.Skill {
	if !g.BulletStats.UseMaster {
		return g.BulletStats.Fixed
	}
	// SkillRef not body.Skill: turrets read the tank's skill via SkillOwner.
	if sk := w.SkillRef(g.Body); sk != nil {
		return *sk
	}
	return entity.Skill{}
}
