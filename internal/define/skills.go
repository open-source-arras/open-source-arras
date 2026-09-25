package define

import (
	"fmt"

	"arrasgo/internal/entity"
	"arrasgo/internal/guns"
)

// SkillUp is entity.js:819.
func (d *Definer) SkillUp(w *entity.World, id entity.EntityID, slot int) (bool, error) {
	if w == nil {
		return false, fmt.Errorf("define: nil world")
	}
	e := w.Get(id)
	if e == nil {
		return false, fmt.Errorf("define: skillUp on a dead or invalid entity handle")
	}
	if !e.Skill.Upgrade(d.cfg.Tuning, slot) {
		return false, nil
	}
	d.RefreshBodyAttributes(w, id)
	d.syncSkillsToGuns(w, id)
	return true, nil
}

// RefreshSkills is entity.js:833.
func (d *Definer) RefreshSkills(w *entity.World, id entity.EntityID) {
	if w == nil {
		return
	}
	e := w.Get(id)
	if e == nil {
		return
	}
	e.Skill.Update(d.cfg.Tuning)
	d.syncSkillsToGuns(w, id)
}

// syncSkillsToGuns is entity.js:828-831.
func (d *Definer) syncSkillsToGuns(w *entity.World, id entity.EntityID) {
	e := w.Get(id)
	if e == nil {
		return
	}
	deps := d.gunDeps(w)
	for _, gid := range e.Guns {
		guns.SyncChildren(deps, gid)
	}
	if e = w.Get(id); e == nil {
		return
	}
	for _, tid := range e.Turrets {
		guns.SyncTurrets(deps, tid)
	}
}
