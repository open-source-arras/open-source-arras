package wire

import (
	"arrasgo/internal/entity"
	"arrasgo/internal/net"
)

// Ports sockets.js:1528.
const bacteriaLabel = "Bacteria"

// Ports loaders/global.js:682. See docs/found-bugs.md #90.
func (p *Players) becomeBulletChildren(s *net.Socket) bool {
	w := p.r.World
	snap := p.lastBody[s]
	if snap == nil || snap.id != s.Player.Body || len(snap.bulletChildren) == 0 {
		return false
	}
	aID := snap.bulletChildren[len(snap.bulletChildren)-1]
	a := w.Get(aID)
	if a == nil {
		return false
	}

	a.Parent, a.Source, a.BulletParent = aID, aID, aID
	a.Settings.ConnectChildrenOnCamera = true
	a.Settings.PersistsAfterDeath = true

	aMaster := a.Master
	p.bacteriaBuf = p.bacteriaBuf[:0]
	for _, kid := range snap.bulletChildren {
		if kid == aID {
			continue
		}
		ke := w.Get(kid)
		if ke == nil || ke.Master != aMaster {
			continue
		}
		p.bacteriaBuf = append(p.bacteriaBuf, kid)
	}
	a = w.Get(aID)
	a.BulletChildren = append(a.BulletChildren[:0], p.bacteriaBuf...)
	for _, kid := range a.BulletChildren {
		if ke := w.Get(kid); ke != nil {
			ke.Source, ke.BulletParent, ke.Parent = aID, aID, aID
		}
	}

	a.Controllers = a.Controllers[:0]
	delete(p.owner, snap.id)
	s.Player.Body = aID
	s.Player.Became = true
	if p.r.Attach != nil {
		p.fail(p.r.Attach.AttachControllers(w, aID, ctrlListenToPlayer))
	}
	w.Flag[aID.Index] |= entity.FlagPlayer
	p.owner[aID] = s
	p.guis[s] = newGUIState()
	if p.r.Definer != nil {
		p.r.Definer.RefreshBodyAttributes(w, aID)
	}
	p.clearBulletMirror(snap)
	return true
}
