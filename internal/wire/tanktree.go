package wire

import (
	"strconv"
	"strings"

	"arrasgo/internal/net"
)

// tankTree is sockets.js:675.
func (p *Players) tankTree(s *net.Socket) {
	e := p.r.World.Get(s.Player.Body)
	if e == nil {
		return
	}
	if s.Status.HasLastTank && s.Status.LastTank == e.Index {
		return
	}
	s.Status.LastTank, s.Status.HasLastTank = e.Index, true
	if p.mockups == nil {
		return
	}
	p.fail(p.mockups.Send(s, e.Index))

	p.treeRoots = p.treeRoots[:0]
	for _, part := range strings.Split(e.Index, "-") {
		p.treeRoots = p.mockups.AppendReroots(p.treeRoots, part)
	}
	seen := p.treeRoots[:0]
	for _, root := range p.treeRoots {
		dup := false
		for _, kept := range seen {
			if kept == root {
				dup = true
				break
			}
		}
		if !dup {
			seen = append(seen, root)
		}
	}
	p.treeRoots = seen

	for _, name := range p.treeRoots {
		index, ok := p.classIndex(name)
		if !ok {
			continue
		}
		p.fail(p.mockups.SendUpgrades(s, index))
	}
}

// classIndex looks up Class[name].index.
func (p *Players) classIndex(name string) (string, bool) {
	if p.lg == nil || p.lg.GunDeps.Defs == nil {
		return "", false
	}
	d, ok := p.lg.GunDeps.Defs.Get(name)
	if !ok {
		return "", false
	}
	ix, ok := d.Index.Get()
	if !ok {
		return "", false
	}
	return strconv.Itoa(int(ix)), true
}
