package wire

import (
	"arrasgo/internal/entity"
	"arrasgo/internal/guns"
)

// Destroy is entity.js:1250.
func (l *Lifegiver) Destroy(id entity.EntityID) {
	w := l.Sim.W
	e := w.Get(id)
	if e == nil {
		return
	}

	if e.IsProtected && l.Protected != nil {
		l.Protected.Unprotect(id)
	}
	if l.OnDestroyed != nil {
		l.OnDestroyed(id)
	}

	l.unlinkFromParents(w, id, e)
	if l.OnUnlinked != nil {
		l.OnUnlinked(id)
	}
	l.killDependents(w, id)

	turrets := append(l.turretBuf[:0], e.Turrets...)
	l.turretBuf = turrets
	for _, tid := range turrets {
		l.destroyTurret(w, tid)
	}

	if l.Targetable != nil {
		l.Targetable.Remove(w, id)
	}
	w.Flag[id.Index] |= entity.FlagGhost
	w.Destroy(id)

	if l.Extras != nil {
		l.Extras.Delete(id)
	}
}

// destroyTurret is turretEntity.js:294-328.
func (l *Lifegiver) destroyTurret(w *entity.World, id entity.EntityID) {
	e := w.Get(id)
	if e == nil {
		return
	}
	l.unlinkFromParents(w, id, e)
	l.killDependents(w, id)

	children := append([]entity.EntityID(nil), e.Turrets...)
	for _, tid := range children {
		l.destroyTurret(w, tid)
	}

	guns.DestroyTurret(l.deps(w), id)
	if l.Targetable != nil {
		l.Targetable.Remove(w, id)
	}
	w.Destroy(id)
}

// unlinkFromParents is entity.js:1259-1271.
func (l *Lifegiver) unlinkFromParents(w *entity.World, id entity.EntityID, e *entity.Entity) {
	bulletParent := e.BulletParent
	if !bulletParent.Valid() {
		bulletParent = id
	}
	if bp := w.Get(bulletParent); bp != nil {
		bp.BulletChildren = jsRemoveID(bp.BulletChildren, id)
		if l.GunDeps.Guns != nil {
			for _, gid := range bp.Guns {
				if g := l.GunDeps.Guns.Get(gid); g != nil {
					g.BulletChildren = jsRemoveID(g.BulletChildren, id)
				}
			}
		}
	}

	parent := e.Parent
	if !parent.Valid() {
		parent = id
	}
	if p := w.Get(parent); p != nil {
		p.Children = jsRemoveID(p.Children, id)
	}

	if l.GunDeps.Guns != nil {
		if src := w.Get(e.Source); src != nil {
			for _, gid := range src.Guns {
				g := l.GunDeps.Guns.Get(gid)
				if g == nil || g.CountsOwnKids == 0 || !containsID(g.Children, id) {
					continue
				}
				g.Children = jsRemoveID(g.Children, id)
				break
			}
		}
	}
}

func containsID(list []entity.EntityID, id entity.EntityID) bool {
	for _, x := range list {
		if x == id {
			return true
		}
	}
	return false
}

// killDependents is entity.js:1268-1287.
func (l *Lifegiver) killDependents(w *entity.World, id entity.EntityID) {
	master := w.Get(w.Get(id).Master)
	bacteria := master != nil && master.Label == "Bacteria"

	l.destroyBuf = l.destroyBuf[:0]
	w.EachLive(func(other entity.EntityID, oe *entity.Entity) {
		if w.Flag[other.Index].Has(entity.FlagUnlisted) {
			return
		}
		l.destroyBuf = append(l.destroyBuf, other)
	})

	for _, other := range l.destroyBuf {
		oe := w.Get(other)
		if oe == nil {
			continue
		}
		if oe.Source == id {
			switch {
			case oe.Settings.PersistsAfterDeath:
				oe.Source = other
			case !bacteria:
				w.Kill(other)
				if l.Targetable != nil {
					l.Targetable.Remove(w, other)
				}
			}
		}
		if oe.Parent == id {
			oe.Parent = entity.EntityID{}
		}
		if oe.Master == id && !bacteria {
			w.Kill(other)
			oe.Master = other
			if l.Targetable != nil {
				l.Targetable.Remove(w, other)
			}
		}
	}
}

// Reproduces the JS bug. See docs/found-bugs.md #62.
func jsRemoveID(list []entity.EntityID, id entity.EntityID) []entity.EntityID {
	return entity.JSRemoveID(list, id)
}
