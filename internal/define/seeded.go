package define

import "arrasgo/internal/defs"

type seeded struct {
	alpha            bool // ALPHA
	invisible        bool // INVISIBLE
	squiggle         bool // VARIES_IN_SIZE
	resetUpgradeMenu bool
}

const seededMaxDepth = 64

func (d *Definer) seededChain(name string) seeded {
	if s, ok := d.chainCache[name]; ok {
		return s
	}
	def, ok := d.cfg.Defs.Get(name)
	if !ok {
		return seeded{}
	}
	var s seeded
	d.walkSeeded(def, &s, 0)
	d.chainCache[name] = s
	return s
}

func (d *Definer) seededInline(def *defs.Definition) seeded {
	var s seeded
	d.walkSeeded(def, &s, 0)
	return s
}

func (d *Definer) walkSeeded(def *defs.Definition, s *seeded, depth int) {
	if def == nil || depth > seededMaxDepth {
		return
	}
	for _, ref := range def.Parent {
		if ref.Inline != nil {
			d.walkSeeded(ref.Inline, s, depth+1)
			continue
		}
		if parent, ok := d.cfg.Defs.Get(ref.Name); ok {
			d.walkSeeded(parent, s, depth+1)
		}
	}
	reset := def.ResetUpgrades.Or(false) || def.ResetStats.Or(false)
	if def.Alpha.IsSet() || reset {
		s.alpha = true
	}
	if reset || def.ResetUpgradeMenu.Or(false) {
		s.resetUpgradeMenu = true
	}
	if def.Invisible.IsSet() {
		s.invisible = true
	}
	if def.VariesInSize.IsSet() {
		s.squiggle = true
	}
}
