package wire

import (
	"strconv"

	"arrasgo/internal/defs"
	"arrasgo/internal/entity"
	"arrasgo/internal/net"
	"arrasgo/internal/vmath"
)

// Control handling: sockets.js:531-637 and entity.js:155-174.

// playerTimerKind is which of the socket layer's setTimeouts a queued timer is.
type playerTimerKind uint8

const (
	timerMothershipWarn playerTimerKind = iota
	timerMothershipEnd
	timerAdPing
	timerAdWatched
)

// playerTimer is one of the socket layer's setTimeouts.
type playerTimer struct {
	at    int64
	seq   uint64
	kind  playerTimerKind
	s     *net.Socket
	inner int64
}

const mothershipWarning = 10_000

// takeControl is sockets.js:531.
func (p *Players) takeControl(s *net.Socket) {
	if !s.Player.Body.Valid() {
		return
	}
	bodyID := s.Player.Body
	body := p.r.World.Get(bodyID)
	if body == nil {
		return
	}

	p.controlBuf = p.controlBuf[:0]
	for _, id := range p.s.Tracked() {
		x := p.r.Extras.Get(id)
		if x.IsDominator || x.IsMothership || x.IsBoss {
			p.controlBuf = append(p.controlBuf, id)
		}
	}

	if p.r.Extras.Get(bodyID).UnderControl {
		x := p.r.Extras.Get(bodyID)
		what := "special tank"
		switch {
		case x.IsDominator:
			what = "dominator"
		case x.IsMothership:
			what = "mothership"
		case x.IsBoss:
			what = "visitor"
		}
		p.message(bodyID, "You have relinquished control of the "+what+".")
		p.giveUp(s)
		return
	}

	switch {
	case p.r.Flags.Mothership:
		p.takeOver(s, bodyID, controlKindMothership)
	case p.r.Flags.Domination:
		p.takeOver(s, bodyID, controlKindDominator)
	case p.r.Tuning.BossControl:
		p.takeOver(s, bodyID, controlKindBoss)
	}
}

type controlKind uint8

const (
	controlKindMothership controlKind = iota
	controlKindDominator
	controlKindBoss
)

// takeOver is sockets.js:549-631.
func (p *Players) takeOver(s *net.Socket, oldID entity.EntityID, kind controlKind) {
	var (
		noun    string
		teamed  bool // the mothership and dominator branches also require the same team
		static  bool // become(player, true), the dominator's frozen goal
		silence bool // dontSendDeathMessage on the body left behind
	)
	switch kind {
	case controlKindMothership:
		noun, teamed = "mothership", true
	case controlKindDominator:
		noun, teamed, static, silence = "dominator", true, true, true
	case controlKindBoss:
		noun = "visitor"
	}

	old := p.r.World.Get(oldID)
	if old == nil {
		return
	}
	team := old.Team

	target := entity.EntityID{}
	for _, id := range p.controlBuf {
		x := p.r.Extras.Get(id)
		switch kind {
		case controlKindMothership:
			if !x.IsMothership {
				continue
			}
		case controlKindDominator:
			if !x.IsDominator {
				continue
			}
		case controlKindBoss:
			if !x.IsBoss {
				continue
			}
		}
		if x.UnderControl {
			continue
		}
		e := p.r.World.Get(id)
		if e == nil || (teamed && e.Team != team) {
			continue
		}
		target = id
		break
	}
	if !target.Valid() {
		if teamed {
			p.message(oldID, "There are no "+noun+"s available that are on your team or "+
				"not already controlled by a player.")
		} else {
			p.message(oldID, "There are no "+noun+"s available that are not already "+
				"controlled by a player.")
		}
		return
	}

	e := p.r.World.Get(target)
	if e == nil {
		return
	}
	e.Controllers = e.Controllers[:0]
	p.r.Extras.GetOrCreate(target).UnderControl = true
	delete(p.owner, oldID)
	s.Player.Body = target
	s.Player.Became = true
	p.owner[target] = s
	if p.r.Attach != nil {
		ctrl := ctrlListenToPlayer
		if static {
			ctrl = ctrlListenToPlayerStatic
		}
		p.fail(p.r.Attach.AttachControllers(p.r.World, target, ctrl))
	}

	// Known bug: mothership/boss takeover shows death: docs/found-bugs.md.
	if silence {
		p.s.SetDontSendDeathMessage(oldID, true)
	}
	if old = p.r.World.Get(oldID); old != nil {
		old.Invuln, old.Godmode = false, false
		old.Health.Amount = -100
	}

	if e = p.r.World.Get(target); e == nil {
		return
	}
	if !p.r.Extras.Get(target).DontIncreaseFov {
		e.FOV += 0.5
	}
	p.r.Extras.GetOrCreate(target).DontIncreaseFov = true
	e.Skill.Points = 0
	if p.r.Definer != nil {
		p.r.Definer.RefreshBodyAttributes(p.r.World, target)
	}
	if e = p.r.World.Get(target); e != nil {
		if oldName := p.r.World.Get(oldID); oldName != nil {
			e.Name = oldName.Name
		}
	}
	p.message(target, "You are now controlling the "+noun+".")
	p.message(target, "Press F to relinquish control of the "+noun+".")

	if kind == controlKindMothership {
		p.armMothershipLimit(s)
	}
}

// armMothershipLimit is sockets.js:570-590 with a known bug: docs/found-bugs.md.
func (p *Players) armMothershipLimit(s *net.Socket) {
	limit := int64(p.r.Tuning.MothershipTimeLimit)
	if limit == 0 {
		return
	}
	now := p.r.World.Now()
	if limit <= mothershipWarning {
		secs := limit / 1000
		unit := " seconds"
		if secs == 1 {
			unit = " second"
		}
		p.message(s.Player.Body, "You only have "+strconv.FormatInt(secs, 10)+unit+
			" in control of the mothership!")
		p.schedulePlayerTimer(now+limit, timerMothershipEnd, s, 0)
		return
	}
	p.schedulePlayerTimer(now+limit-mothershipWarning, timerMothershipWarn, s, 0)
}

func (p *Players) schedulePlayerTimer(at int64, kind playerTimerKind, s *net.Socket, inner int64) {
	t := playerTimer{at: at, kind: kind, s: s, inner: inner}
	if p.r.NextTimerSeq != nil {
		t.seq = p.r.NextTimerSeq()
	}
	i := len(p.controlTimers)
	for i > 0 && (p.controlTimers[i-1].at > t.at ||
		(p.controlTimers[i-1].at == t.at && p.controlTimers[i-1].seq > t.seq)) {
		i--
	}
	p.controlTimers = append(p.controlTimers, playerTimer{})
	copy(p.controlTimers[i+1:], p.controlTimers[i:])
	p.controlTimers[i] = t
}

func (p *Players) runControlTimers(untilMS float64, untilSeq uint64) {
	until := int64(untilMS)
	for len(p.controlTimers) > 0 {
		t := p.controlTimers[0]
		if t.at > until || (t.at == until && t.seq > untilSeq) {
			return
		}
		p.controlTimers = append(p.controlTimers[:0], p.controlTimers[1:]...)
		switch t.kind {
		case timerAdPing:
			p.schedulePlayerTimer(t.at+t.inner, timerAdWatched, t.s, 0)
		case timerAdWatched:
			// No guard on this one in the source, unlike the two below: a player
			// who died while the ad played is still credited with watching it.
			t.s.Status.DailyTankWatchedAdClient = true
		case timerMothershipWarn:
			// Both mothership callbacks open with a null check for player.body.
			if !t.s.Player.Body.Valid() {
				continue
			}
			p.message(t.s.Player.Body, "You only have 10 seconds left in control of the mothership!")
			p.schedulePlayerTimer(t.at+mothershipWarning, timerMothershipEnd, t.s, 0)
		case timerMothershipEnd:
			if !t.s.Player.Body.Valid() {
				continue
			}
			p.message(t.s.Player.Body, "You have lost control of the mothership.")
			p.giveUp(t.s)
		}
	}
}

// giveUp is entity.js:155-174 with dead code: see docs/found-bugs.md.
func (p *Players) giveUp(s *net.Socket) {
	id := s.Player.Body
	e := p.r.World.Get(id)
	if e == nil {
		return
	}
	e.Controllers = e.Controllers[:0]
	if p.r.Attach != nil {
		if p.r.Extras.Get(id).IsMothership {
			p.fail(p.r.Attach.AttachControllers(p.r.World, id,
				defs.Controller{Name: "nearestDifferentMaster"},
				defs.Controller{Name: "mapTargetToGoal"},
			))
		} else {
			p.fail(p.r.Attach.AttachControllers(p.r.World, id,
				defs.Controller{Name: "nearestDifferentMaster"},
				defs.Controller{Name: "spin", Args: defs.ControllerArgs{OnlyWhenIdle: defs.Some(true)}},
			))
		}
	}
	if e = p.r.World.Get(id); e == nil {
		return
	}
	e.Name = e.Label
	p.r.Extras.GetOrCreate(id).UnderControl = false

	pos := p.r.World.Pos[id.Index]
	fake, err := p.r.SpawnBareEntity(vmath.Vec2{X: pos.X, Y: pos.Y})
	if err != nil {
		p.fail(err)
		return
	}
	x := p.r.Extras.GetOrCreate(fake)
	x.Passive = true
	x.UnderControl = true
	delete(p.owner, id)
	s.Player.Body = fake
	s.Player.Became = false
	p.owner[fake] = s
	if fe := p.r.World.Get(fake); fe != nil {
		fe.Invuln, fe.Godmode = false, false
		fe.Health.Amount = -100
	}
}

var ctrlListenToPlayerStatic = defs.Controller{
	Name: "listenToPlayer",
	Args: defs.ControllerArgs{Static: defs.Some(true)},
}
