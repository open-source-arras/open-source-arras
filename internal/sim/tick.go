package sim

import (
	"context"
	"fmt"
	"time"

	"arrasgo/internal/entity"
)

// Step advances the room by one cycle: slow loops, gameloop, then four statements.
func (s *Sim) Step() {
	if s.Hooks.Error != nil {
		defer func() {
			if r := recover(); r != nil {
				s.Hooks.Error(fmt.Errorf("tick %d panicked: %v", s.tick, r))
				s.tick++
				s.elapsedMS = float64(s.tick) * s.CycleSpeedMS
			}
		}()
	}
	if !s.started {
		for k, at := range [3]float64{1000, 200, s.regenerateTick()} {
			s.timerSeq++
			s.deadlines[k] = timerSlot{At: at, Seq: s.timerSeq}
		}
		s.started = true
	}
	target := float64(s.tick+1) * s.CycleSpeedMS
	// Clock advances to deadline BEFORE body runs, matching JS harness (run.js).
	s.elapsedMS = target
	s.fireSlowLoops(target)

	s.gameloop()

	if s.Loops.SyncedDelays != nil {
		s.Loops.SyncedDelays()
	}
	if s.Loops.Food != nil {
		s.Loops.Food()
	}
	if s.Loops.Room != nil {
		s.Loops.Room()
	}
	if s.Loops.QuickLoop != nil {
		s.Loops.QuickLoop()
	}

	s.tick++
	s.compact()
}

// Run drives Step off a tick channel until context is cancelled. One goroutine, one ticker.
func (s *Sim) Run(ctx context.Context, tick <-chan time.Time) {
	for {
		select {
		case <-ctx.Done():
			return
		case <-tick:
			s.Step()
		}
	}
}

func (s *Sim) CycleSpeed() time.Duration {
	return time.Duration(s.CycleSpeedMS * float64(time.Millisecond))
}

// fireSlowLoops runs three slower setInterval bodies with fixed period deadlines.
func (s *Sim) fireSlowLoops(target float64) {
	periods := [4]float64{1000, 200, s.regenerateTick(), broadcastPeriod}
	for {
		best := -1
		for k := 0; k < len(s.deadlines); k++ {
			if s.deadlines[k].At > target {
				continue
			}
			if best == -1 || earlier(s.deadlines[k], s.deadlines[best]) {
				best = k
			}
		}
		if best == -1 {
			if s.Loops.Timers != nil {
				s.Loops.Timers(target, ^uint64(0))
			}
			return
		}
		if s.Loops.Timers != nil {
			s.Loops.Timers(s.deadlines[best].At, s.deadlines[best].Seq)
		}
		s.timerSeq++
		s.deadlines[best] = timerSlot{At: s.deadlines[best].At + periods[best], Seq: s.timerSeq}
		switch best {
		case 0:
			if s.Loops.Maintain != nil {
				s.Loops.Maintain()
			}
		case 1:
			if s.Loops.Other != nil {
				s.Loops.Other()
			}
		case 2:
			s.RegenHealthAndShield()
		default:
			if s.Loops.Broadcast != nil {
				s.Loops.Broadcast()
			}
		}
	}
}

func (s *Sim) regenerateTick() float64 {
	if s.Tuning == nil || s.Tuning.RegenerateTick <= 0 {
		return 100
	}
	return float64(s.Tuning.RegenerateTick)
}

// gameloop is game/index.js:206. Two orderings are load-bearing. See docs/found-bugs.md #8.
func (s *Sim) gameloop() {
	s.logs.loops.tally()
	s.logs.master.set()
	s.logs.entities.set()
	s.Grid.Clear()

	ctx := s.sizeContext()

	// Indexed not ranged: Map iterator visits entries inserted during walk.
	for k := 0; k < len(s.order); k++ {
		id := s.order[k]
		e := s.W.Get(id)
		if e == nil {
			continue
		}

		if s.ContemplationOfMortality(id) {
			s.reap(id)
			continue
		}
		e = s.W.Get(id)
		if e == nil {
			continue
		}

		// Creates fresh JS array once per entity. Accounts for most of its GC pressure. See docs/found-bugs.md #3.
		e.CollisionArray = e.CollisionArray[:0]

		if !e.Bond.Valid() {
			s.logs.physics.set()
			s.Physics(id)
			s.logs.physics.mark()
		}

		if e.Activation.Active || s.W.Flag[id.Index].Has(entity.FlagPlayer) {
			s.logs.entities.tally()
			s.logs.life.set()
			if s.Hooks.Life != nil {
				s.Hooks.Life(id)
			}
			s.logs.life.mark()
			s.logs.selfie.set()
			if s.Hooks.TakeSelfie != nil {
				s.Hooks.TakeSelfie(id)
			}
			s.logs.selfie.mark()
			if e = s.W.Get(id); e == nil {
				continue
			}
			s.Friction(id)
			s.ConfinementToTheseEarthlyShackles(id)
		}

		s.W.Size[id.Index] = s.W.ComputeSize(id, ctx)
		s.syncActiveFlag(id, e)
		s.W.UpdateAABB(id)

		s.logs.collide.set()
		box := s.W.Boxes[id.Index]
		for _, otherIdx := range s.Grid.Query(box.MinX, box.MinY, box.MaxX, box.MaxY, s.W.Boxes) {
			otherID := s.idAt(otherIdx)
			if !otherID.Valid() {
				continue
			}
			s.Collide(id, otherID)
		}
		if s.W.Flag[id.Index].Has(entity.FlagInGrid) {
			b := s.W.Boxes[id.Index]
			s.Grid.Insert(id.Index, b.MinX, b.MinY, b.MaxX, b.MaxY)
		}
		s.logs.collide.mark()

		e = s.W.Get(id)
		if e == nil {
			continue
		}
		s.restoreWallEffects(id, e)

		s.logs.activation.set()
		s.ActivationUpdate(id)
		s.logs.activation.mark()

		if s.Hooks.OnTick != nil {
			s.Hooks.OnTick(id)
		}
	}
	s.logs.entities.mark()
	s.logs.master.mark()

	if s.Loops.Views != nil {
		s.Loops.Views(s.elapsedMS)
	}
}

// reap zombifies or destroys when contemplationOfMortality reports 1.
func (s *Sim) reap(id entity.EntityID) {
	e := s.W.Get(id)
	if e == nil {
		return
	}
	x := s.extraOf(id)
	isPlayerish := s.W.Flag[id.Index].Has(entity.FlagPlayer) || s.W.Flag[id.Index].Has(entity.FlagBot)
	if s.Gamemode.Outbreak && x != nil && !x.Zombified && isPlayerish {
		x.Zombified = true
		e.Settings.NoCollisions = true
		s.W.Flag[id.Index] |= entity.FlagNoCollisions
		e.Alpha = 0
		if s.Hooks.TakeSelfie != nil {
			s.Hooks.TakeSelfie(id)
		}
		if s.Hooks.Zombify != nil {
			s.Hooks.Zombify(id)
		}
		return
	}
	s.destroy(id)
}

// restoreWallEffects puts tank SIZE and FOV back when off wall. Tri-state flags needed for JS === false check.
func (s *Sim) restoreWallEffects(id entity.EntityID, e *entity.Entity) {
	x := s.extraOf(id)
	if x == nil {
		return
	}
	empty := len(e.CollisionArray) == 0
	if (x.touchingSizeWall.isFalse() || empty) && e.OriginalSize != 0 {
		e.SIZE = float64(e.OriginalSize)
		e.OriginalSize = 0
	}
	if (x.touchingFovWall.isFalse() || empty) && x.OriginalFov != 0 {
		e.FOV = x.OriginalFov
		x.OriginalFov = 0
	}
}

func (s *Sim) syncActiveFlag(id entity.EntityID, e *entity.Entity) {
	if e.Activation.Active {
		s.W.Flag[id.Index] |= entity.FlagActive
	} else {
		s.W.Flag[id.Index] &^= entity.FlagActive
	}
}

// idAt turns a slab index from the broad phase back into a handle.
func (s *Sim) idAt(idx uint32) entity.EntityID {
	if int(idx) >= len(s.idByIndex) {
		return entity.EntityID{}
	}
	return s.idByIndex[idx]
}

func (s *Sim) compact() {
	out := s.order[:0]
	for _, id := range s.order {
		if s.W.Alive(id) {
			out = append(out, id)
		}
	}
	s.order = out
}

// now is the injectable clock World.Now supplies, not time.Now (see docs/architecture.md).
func (s *Sim) now() int64 {
	if s.W.Now != nil {
		return s.W.Now()
	}
	return int64(s.elapsedMS)
}

func earlier(a, b timerSlot) bool {
	if a.At != b.At {
		return a.At < b.At
	}
	return a.Seq < b.Seq
}

func (s *Sim) NextTimerSeq() uint64 {
	s.timerSeq++
	return s.timerSeq
}

const (
	broadcastSlot   = 3
	broadcastPeriod = 250
)
