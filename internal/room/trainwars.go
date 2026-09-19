package room

import (
	"arrasgo/internal/entity"
	"arrasgo/internal/vmath"
)

// Train reproduces trainwars.js game mode.
type Train struct{}

// clampf is util.clamp from loaders/global.js.
func clampf(v, lo, hi float64) float64 {
	if v < lo {
		return lo
	}
	if v > hi {
		return hi
	}
	return v
}

// Loop is trainwars.js's loop(), called from GamemodeManager.QuickLoop.
func (t *Train) Loop(r *Room) {
	type ranked struct {
		id    entity.EntityID
		score float64
	}
	byTeam := make(map[int32][]ranked)
	r.World.EachLive(func(id entity.EntityID, e *entity.Entity) {
		flags := r.World.Flag[id.Index]
		if !flags.Has(entity.FlagPlayer) && !flags.Has(entity.FlagBot) {
			return
		}
		byTeam[e.Team] = append(byTeam[e.Team], ranked{id, e.Skill.Score})
	})

	for _, train := range byTeam {
		for i := 1; i < len(train); i++ {
			for j := i; j > 0 && train[j].score > train[j-1].score; j-- {
				train[j], train[j-1] = train[j-1], train[j]
			}
		}
		for i := 1; i < len(train); i++ {
			leader := r.World.Pos[train[i-1].id.Index]
			pos := r.World.Pos[train[i].id.Index]
			e := r.World.Get(train[i].id)
			if e == nil {
				continue
			}
			r.World.Vel[train[i].id.Index] = vmath.Vec2{
				X: clampf(leader.X-pos.X, -90, 90) * e.Damp * 1.35,
				Y: clampf(leader.Y-pos.Y, -90, 90) * e.Damp * 1.35,
			}
		}
	}
}
