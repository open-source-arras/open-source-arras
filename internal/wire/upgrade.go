package wire

import (
	"math"
	"strconv"

	"arrasgo/internal/entity"
	"arrasgo/internal/net"
)

var statSlots = guiStatSlots

func (p *Players) upgrade(s *net.Socket, req net.ClUpgrade) {
	if !s.Player.Body.Valid() {
		return
	}
	p.bodyUpgrade(s, s.Player.Body, int(req.Upgrade), int(req.BranchID), false, req.DailyTank)
}

func (p *Players) bodyUpgrade(s *net.Socket, id entity.EntityID, number, branchID int, skipDelay, dailyTank bool) {
	e := p.r.World.Get(id)
	if e == nil {
		return
	}

	isPlayer := p.r.World.Flag[id.Index].Has(entity.FlagPlayer)
	if !skipDelay && isPlayer && s != nil && s.Permissions == nil && p.r.Tuning.UpgradeDelay != 0 {
		now := p.worldNow()
		lastAction := e.LastMovementTime
		if e.LastFiredTime > lastAction {
			lastAction = e.LastFiredTime
		}
		if !p.r.InBase(id) && now-lastAction < int64(p.r.Tuning.UpgradeDelay) {
			var (
				label string
				ok    bool
			)
			if dailyTank {
				// Daily-tank list is false until ad is watched. See entity.js:845-849.
				if cfg := p.r.Tuning.DailyTank; cfg != nil &&
					(s != nil && s.Status.DailyTankWatchedAd || !cfg.Ads) {
					label, ok = p.dailyTankLabel(cfg.Tank)
				}
			} else {
				label, ok = p.pendingTankLabel(e, number)
				if !ok {
					// Out-of-range index throws TypeError in JS. See docs/found-bugs.md #76.
					return
				}
			}
			if ok {
				pend := &e.UpgradePending
				pend.Set = true
				pend.Number = int32(number)
				pend.BranchID = int32(branchID)
				pend.TankLabel = label
				pend.LastReminder = now
				pend.LastIndex = e.Index
				pend.DailyTankRequest = dailyTank
				p.message(id, "Upgrading to "+label+"... Stay still for "+
					strconv.Itoa(p.delaySeconds())+" seconds without firing to upgrade.")
				return
			}
		}
	}

	if p.r.Definer == nil {
		return
	}
	var (
		upgraded bool
		err      error
	)
	switch cfg := p.r.Tuning.DailyTank; {
	case dailyTank && cfg != nil && cfg.Tank != "":
		hasWatchedAd := s != nil && s.Status.DailyTankWatchedAd
		if !cfg.Ads {
			hasWatchedAd = true
		}
		if int(e.Skill.Level) >= p.r.Tuning.TierMultiplier*cfg.Tier {
			if !hasWatchedAd {
				p.message(id, "You must watch an ad before you can upgrade.")
				return
			}
			upgraded, err = p.r.Definer.UpgradeToDailyTank(p.r.World, id, cfg.Tank)
		}
	default:
		upgraded, err = p.r.Definer.Upgrade(p.r.World, id, number, branchID)
	}
	if err != nil {
		p.fail(err)
		return
	}
	if !upgraded {
		return
	}
	p.announceUpgrade(id)
}

// announceUpgrade reads label after define. See docs/found-bugs.md #77.
func (p *Players) announceUpgrade(id entity.EntityID) {
	e := p.r.World.Get(id)
	if e == nil {
		return
	}
	p.message(id, "You have upgraded to "+e.Label+".")
	if p.lg == nil || p.lg.GunDeps.Defs == nil {
		return
	}
	for _, ord := range append(p.tooltipBuf[:0], e.Defs...) {
		d, ok := p.lg.GunDeps.Defs.At(int(ord))
		if !ok || d == nil {
			continue
		}
		if tip, ok := d.Tooltip.Get(); ok && tip != "" {
			p.message(id, tip)
		}
	}
	p.tooltipBuf = p.tooltipBuf[:0]
}

func (p *Players) dailyTankLabel(tank string) (string, bool) {
	if p.lg == nil || p.lg.GunDeps.Defs == nil {
		return "Unknown", true
	}
	d, ok := p.lg.GunDeps.Defs.Get(tank)
	if !ok {
		return "Unknown", true
	}
	if v, ok := d.Label.Get(); ok && v != "" {
		return v, true
	}
	return "Unknown", true
}

// pendingTankLabel uses the raw number, not skipped-upgrade offset. See docs/found-bugs.md #77.
func (p *Players) pendingTankLabel(e *entity.Entity, number int) (string, bool) {
	if number < 0 || number >= len(e.Upgrades) {
		return "", false
	}
	label := "Unknown"
	if p.lg == nil || p.lg.GunDeps.Defs == nil {
		return label, true
	}
	for _, ord := range e.Upgrades[number].Class {
		d, ok := p.lg.GunDeps.Defs.At(int(ord))
		if !ok || d == nil {
			continue
		}
		if v, ok := d.Label.Get(); ok && v != "" {
			return v, true
		}
	}
	return label, true
}

func (p *Players) delaySeconds() int {
	return int(math.Ceil(float64(p.r.Tuning.UpgradeDelay) / 1000))
}

// resolvePendingUpgrade runs after move/face/updateBodyInfo. Returns whether caller should stop.
func (p *Players) resolvePendingUpgrade(id entity.EntityID) bool {
	e := p.r.World.Get(id)
	if e == nil || !e.UpgradePending.Set {
		return false
	}
	if !p.r.World.Flag[id.Index].Has(entity.FlagPlayer) {
		return false
	}
	now := p.worldNow()
	lastAction := e.LastMovementTime
	if e.LastFiredTime > lastAction {
		lastAction = e.LastFiredTime
	}

	// Body redefined while upgrade was waiting. Row no longer means same thing.
	if e.Index != e.UpgradePending.LastIndex {
		e.UpgradePending = entity.UpgradePending{}
		p.message(id, "Upgrade cancelled.")
		return true
	}

	inBase := p.r.InBase(id)
	if inBase || now-lastAction >= int64(p.r.Tuning.UpgradeDelay) {
		// Branch field is never written (entity.js:865). Passing 0 matches JS undefined. See docs/found-bugs.md #75.
		number := int(e.UpgradePending.Number)
		daily := e.UpgradePending.DailyTankRequest
		e.UpgradePending = entity.UpgradePending{}
		p.bodyUpgrade(p.owner[id], id, number, 0, true, daily)
		return false
	}
	if !inBase && now-e.UpgradePending.LastReminder >= int64(p.r.Tuning.UpgradeDelayReminder) {
		e.UpgradePending.LastReminder = now
		p.message(id, "You must stay still for "+strconv.Itoa(p.delaySeconds())+
			" seconds without firing to upgrade.")
	}
	return false
}

// stat is do/while loop. Always spends one point, 256 is JS guard against cap.
func (p *Players) stat(s *net.Socket, req net.ClStat) {
	if !s.Player.Body.Valid() || p.r.Definer == nil {
		return
	}
	index := int(req.Index)
	if index < 0 || index >= len(statSlots) {
		return
	}
	slot := statSlots[index]
	id := s.Player.Body
	limit := 256
	for {
		if _, err := p.r.Definer.SkillUp(p.r.World, id, slot); err != nil {
			p.fail(err)
			return
		}
		e := p.r.World.Get(id)
		if e == nil {
			return
		}
		// limit-- is post-decrement. Test sees value before subtraction.
		limit--
		if limit < 0 || req.Max == 0 || e.Skill.Points == 0 ||
			e.Skill.Amount(slot) >= e.Skill.Cap(&p.r.Tuning, slot, false) {
			return
		}
	}
}

// levelUp adds skill.levelScore once to reach next level (not a loop).
func (p *Players) levelUp(s *net.Socket) {
	if !s.Player.Body.Valid() {
		return
	}
	e := p.r.World.Get(s.Player.Body)
	if e == nil || p.r.Extras.Get(s.Player.Body).UnderControl {
		return
	}
	if int(e.Skill.Level) >= p.r.Tuning.LevelCapCheat &&
		!(s.Permissions != nil && s.Permissions.InfiniteLevelUp) {
		return
	}
	e.Skill.Score += e.Skill.LevelScore()
	e.Skill.Maintain(&p.r.Tuning)
	if p.r.Definer != nil {
		p.r.Definer.RefreshBodyAttributes(p.r.World, s.Player.Body)
	}
}

// suicide requires invuln. Only works during spawn protection.
func (p *Players) suicide(s *net.Socket) {
	if !s.Player.Body.Valid() {
		return
	}
	id := s.Player.Body
	e := p.r.World.Get(id)
	if e == nil || p.r.Extras.Get(id).UnderControl || !e.Invuln {
		return
	}
	wire := e.WireID
	for _, other := range p.s.Tracked() {
		oe := p.r.World.Get(other)
		if oe == nil || !oe.Settings.ClearOnMasterUpgrade {
			continue
		}
		if m := p.r.World.Get(oe.Master); m != nil && m.WireID == wire {
			oe.Health.Amount = -100
		}
	}
	p.message(id, "You have self-destructed.")
	if p.lg != nil {
		p.lg.Destroy(id)
	}
}

func (p *Players) message(id entity.EntityID, text string) {
	if p.r.Comms != nil {
		p.r.Comms.SendTo(id, text)
	}
}

// worldNow is the world clock that upgrade delay measures against.
func (p *Players) worldNow() int64 {
	if p.r.World.Now == nil {
		return 0
	}
	return p.r.World.Now()
}
