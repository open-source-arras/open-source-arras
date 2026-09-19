package wire

import (
	"math"

	"arrasgo/internal/entity"
	"arrasgo/internal/net"
)

// bodyDead is sockets.js:1513-1532.
func (p *Players) bodyDead(s *net.Socket) {
	if snap := p.lastBody[s]; snap != nil && snap.id == s.Player.Body && snap.label == bacteriaLabel {
		if p.becomeBulletChildren(s) {
			return
		}
	}
	p.die(s)
}

// die is sockets.js:1519-1527.
func (p *Players) die(s *net.Socket) {
	body := s.Player.Body
	s.Status.Deceased = true

	if p.r.Flags.ClanWars && p.r.Gamemodes != nil {
		p.r.Gamemodes.ClanWars.Remove(p.originalName(s, body), body)
	}

	p.death = p.records(s)
	p.fail(s.Talk(p.death.Append(s.Builder.Buf())))

	delete(p.owner, body)
	s.Player.Body = entity.EntityID{}
	s.Timeout.Start(p.now())
}

// records is sockets.js:1252-1262.
func (p *Players) records(s *net.Socket) net.SvDeath {
	d := net.SvDeath{
		Lifetime:     math.Floor((p.now() - s.Player.SpawnBegin) / 1000),
		RespawnDelay: float64(p.r.Tuning.RespawnDelay),
	}
	if e := p.r.World.Get(s.Player.Body); e != nil {
		d.Score = e.Skill.Score
		d.Solo = float64(e.KillCount.Solo)
		d.Assists = float64(e.KillCount.Assists)
		d.Bosses = float64(e.KillCount.Bosses)
		d.Polygons = float64(e.KillCount.Polygons)
		d.Killers = e.KillCount.Killers
		return d
	}
	if snap := p.lastBody[s]; snap != nil && snap.id == s.Player.Body {
		d.Score = snap.score
		d.Solo = float64(snap.solo)
		d.Assists = float64(snap.assists)
		d.Bosses = float64(snap.bosses)
		d.Polygons = float64(snap.polygons)
		d.Killers = snap.killers
	}
	return d
}

type bodySnapshot struct {
	id                              entity.EntityID
	score                           float64
	solo, assists, bosses, polygons int32
	killers                         []string

	label          string
	bulletChildren []entity.EntityID
	originalName   string
}

func (p *Players) rememberBody(s *net.Socket, id entity.EntityID, e *entity.Entity) {
	snap := p.lastBody[s]
	if snap == nil {
		snap = &bodySnapshot{}
		p.lastBody[s] = snap
	}
	snap.id = id
	snap.score = e.Skill.Score
	snap.solo, snap.assists = e.KillCount.Solo, e.KillCount.Assists
	snap.bosses, snap.polygons = e.KillCount.Bosses, e.KillCount.Polygons
	snap.killers = append(snap.killers[:0], e.KillCount.Killers...)
	snap.label = e.Label
	snap.originalName = p.r.Extras.Get(id).OriginalName
	p.clearBulletMirror(snap)
	if e.Label == bacteriaLabel && len(e.BulletChildren) > 0 {
		snap.bulletChildren = append(snap.bulletChildren, e.BulletChildren...)
		p.mirroring++
	}
}

// originalName is sockets.js:1196.
func (p *Players) originalName(s *net.Socket, body entity.EntityID) string {
	if name := p.r.Extras.Get(body).OriginalName; name != "" {
		return name
	}
	if snap := p.lastBody[s]; snap != nil && snap.id == body {
		return snap.originalName
	}
	return ""
}

func (p *Players) clearBulletMirror(snap *bodySnapshot) {
	if len(snap.bulletChildren) > 0 {
		p.mirroring--
	}
	snap.bulletChildren = snap.bulletChildren[:0]
}

// dropBulletChild removes a destroyed bullet child from the tracked snapshots.
func (p *Players) dropBulletChild(id entity.EntityID) {
	if p.mirroring == 0 {
		return
	}
	for _, snap := range p.lastBody {
		for i, kid := range snap.bulletChildren {
			if kid != id {
				continue
			}
			last := len(snap.bulletChildren) - 1
			snap.bulletChildren[i] = snap.bulletChildren[last]
			snap.bulletChildren = snap.bulletChildren[:last]
			if last == 0 {
				p.mirroring--
			}
			return
		}
	}
}

func (p *Players) now() float64 {
	if p.g == nil || p.g.Sockets == nil || p.g.Sockets.Now == nil {
		return 0
	}
	return p.g.Sockets.Now()
}
