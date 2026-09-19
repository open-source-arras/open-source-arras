package room

import (
	"sort"

	"arrasgo/internal/entity"
)

type timerKind uint8

const (
	timerBotRelease timerKind = iota + 1
	timerBotLevelling
	timerFoodCleanup
	timerNestFoodCleanup
	timerEnemyFoodCleanup
	timerGamemodeStart
	timerSpookyEyeFacing
	timerZombieActivate
	timerNexusAlertClear
	timerPortalLaunch
	timerPortalUnlock
)

const foodCleanupPeriod = 1500

type roomTimer struct {
	At    int64
	Every int64
	Seq   uint64
	Kind  timerKind
	ID    entity.EntityID
}

func (r *Room) schedule(at int64, kind timerKind, id entity.EntityID) {
	r.scheduleEvery(at, 0, kind, id)
}

func (r *Room) scheduleEvery(at, every int64, kind timerKind, id entity.EntityID) {
	r.pushTimer(roomTimer{At: at, Every: every, Seq: r.nextTimerSeq(), Kind: kind, ID: id})
}

func less(a, b roomTimer) bool {
	if a.At != b.At {
		return a.At < b.At
	}
	return a.Seq < b.Seq
}

func (r *Room) nextTimerSeq() uint64 {
	if r.NextTimerSeq != nil {
		return r.NextTimerSeq()
	}
	r.timerSeq++
	return r.timerSeq
}

func (r *Room) ScheduleGamemodeStart() {
	r.schedule(r.World.Now()+gamemodeStartDelay, timerGamemodeStart, entity.EntityID{})
}

const gamemodeStartDelay = 200

func (r *Room) RunTimers(untilMS float64, untilSeq uint64) error {
	until := roomTimer{At: int64(untilMS), Seq: untilSeq}
	ctx := r.tileContext()
	for len(r.timers) > 0 && !less(until, r.timers[0]) {
		t := r.timers[0]
		r.timers = append(r.timers[:0], r.timers[1:]...)

		e := r.World.Get(t.ID)
		switch t.Kind {
		case timerGamemodeStart:
			r.Gamemodes.Redefine()
			if err := r.Gamemodes.Start(); err != nil {
				return err
			}
			continue
		case timerFoodCleanup, timerNestFoodCleanup, timerEnemyFoodCleanup:
			if e != nil && !e.IsDead() {
				t.At += t.Every
				t.Seq = r.nextTimerSeq()
				r.pushTimer(t)
				continue
			}
			switch t.Kind {
			case timerFoodCleanup:
				r.Foods = entity.JSRemoveID(r.Foods, t.ID)
			case timerNestFoodCleanup:
				r.NestFoods = entity.JSRemoveID(r.NestFoods, t.ID)
			case timerEnemyFoodCleanup:
				r.EnemyFoods = entity.JSRemoveID(r.EnemyFoods, t.ID)
			}
			continue
		}
		if e == nil || e.IsDead() {
			continue
		}
		repeat := false
		switch t.Kind {
		case timerBotRelease:
			if err := r.releaseBot(ctx, t.ID); err != nil {
				return err
			}
		case timerSpookyEyeFacing:
			e.FacingType = "manual"
			e.Facing = ctx.Rand.RandomAngle()
		case timerZombieActivate:
			if err := r.Gamemodes.Outbreak.activate(ctx, t.ID); err != nil {
				return err
			}
		case timerNexusAlertClear:
			ctx.Extras.GetOrCreate(t.ID).NexusAlerted = false
		case timerPortalLaunch:
			r.World.Vel[t.ID.Index] = ctx.Extras.GetOrCreate(t.ID).PortalLaunch
			r.schedule(t.At+portalUnlockDelay, timerPortalUnlock, t.ID)
		case timerPortalUnlock:
			ctx.Extras.GetOrCreate(t.ID).CannotTeleport = false
		case timerBotLevelling:
			if e.Skill.Level < int32(r.Tuning.BotStartLevel) {
				e.Skill.Score += e.Skill.LevelScore()
				e.Skill.Maintain(&r.Tuning)
				repeat = true
			}
		}
		if repeat && t.Every > 0 {
			t.At += t.Every
			t.Seq = r.nextTimerSeq()
			r.pushTimer(t)
		}
	}
	return nil
}

func (r *Room) pushTimer(t roomTimer) {
	r.timers = append(r.timers, t)
	if n := len(r.timers); n > 1 && less(r.timers[n-1], r.timers[n-2]) {
		sort.Slice(r.timers, func(i, j int) bool { return less(r.timers[i], r.timers[j]) })
	}
}

func (r *Room) PendingTimers() int { return len(r.timers) }
