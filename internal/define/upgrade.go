package define

import (
	"fmt"

	"arrasgo/internal/entity"
	"arrasgo/internal/guns"
)

// Upgrade applies an upgrade menu row from entity.js:835.
func (d *Definer) Upgrade(w *entity.World, id entity.EntityID, number, branchID int) (bool, error) {
	if w == nil {
		return false, fmt.Errorf("define: nil world")
	}
	e := w.Get(id)
	if e == nil {
		return false, fmt.Errorf("define: upgrade applied to a dead or invalid entity handle")
	}

	for i := 0; i < branchID && i < len(e.SkippedUpgrades); i++ {
		number += int(e.SkippedUpgrades[i])
	}

	if number < 0 || number >= len(e.Upgrades) {
		return false, nil
	}
	row := e.Upgrades[number]
	if float64(e.Skill.Level) < float64(row.Level) {
		return false, nil
	}

	names := make([]string, 0, len(row.Class))
	if row.RedefineAll {
		for _, ord := range row.Class {
			name, ok := d.cfg.Defs.NameAt(int(ord))
			if !ok {
				return false, fmt.Errorf("define: upgrade row %d names unknown class ordinal %d", number, ord)
			}
			names = append(names, name)
		}
	} else {
		spliced, err := d.spliceDefs(e.Defs, int(row.Branch), row.Class)
		if err != nil {
			return false, fmt.Errorf("define: upgrade row %d: %w", number, err)
		}
		names = spliced
	}
	if len(names) == 0 {
		return false, fmt.Errorf("define: upgrade row %d resolves to no classes", number)
	}

	e.Upgrades = e.Upgrades[:0]
	if err := d.DefineSplit(w, id, names); err != nil {
		return false, err
	}
	d.finishUpgrade(w, id)
	return true, nil
}

// UpgradeToDailyTank upgrades to a named tank class from entity.js:877.
func (d *Definer) UpgradeToDailyTank(w *entity.World, id entity.EntityID, tank string) (bool, error) {
	if w == nil {
		return false, fmt.Errorf("define: nil world")
	}
	e := w.Get(id)
	if e == nil {
		return false, fmt.Errorf("define: daily tank applied to a dead or invalid entity handle")
	}
	e.Upgrades = e.Upgrades[:0]
	if err := d.Define(w, id, tank); err != nil {
		return false, err
	}
	d.finishUpgrade(w, id)
	return true, nil
}

// finishUpgrade completes the upgrade from entity.js:918.
func (d *Definer) finishUpgrade(w *entity.World, id entity.EntityID) {
	w.EachLive(func(other entity.EntityID, oe *entity.Entity) {
		if oe.Settings.ClearOnMasterUpgrade && oe.Master == id {
			w.Kill(other)
		}
	})

	if w.Get(id) == nil {
		return
	}
	w.Get(id).Skill.Update(d.cfg.Tuning)
	guns.SyncTurrets(d.gunDeps(w), id)
	d.RefreshBodyAttributes(w, id)
}

// spliceDefs replaces one definition entry with an upgrade row's classes.
func (d *Definer) spliceDefs(current []int32, branch int, classes []int32) ([]string, error) {
	if branch < 0 {
		branch = 0
	}
	merged := make([]int32, 0, len(current)+len(classes))
	if branch >= len(current) {
		merged = append(merged, current...)
		merged = append(merged, classes...)
	} else {
		merged = append(merged, current[:branch]...)
		merged = append(merged, classes...)
		merged = append(merged, current[branch+1:]...)
	}

	names := make([]string, 0, len(merged))
	for _, ord := range merged {
		name, ok := d.cfg.Defs.NameAt(int(ord))
		if !ok {
			return nil, fmt.Errorf("unknown class ordinal %d", ord)
		}
		names = append(names, name)
	}
	return names, nil
}
