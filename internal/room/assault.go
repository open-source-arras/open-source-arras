package room

import (
	"strconv"

	"arrasgo/internal/defs"
	"arrasgo/internal/entity"
)

// assaultSlot is one tracked assault dominator/sanctuary tile.
type assaultSlot struct {
	id           entity.EntityID
	tile         *TileInstance
	originalType string
}

// Assault ports game/gamemodes/scripts/assault.js.
type Assault struct {
	room    *Room
	choices []string

	gameActive     bool
	minuteTimer    int
	secondTimer    int
	timerPaused    bool
	leftDominators int

	nextMinuteAt int64
	nextSecondAt int64
	timerArmed   bool // false until Start seeds the two deadlines above

	slots []assaultSlot
}

func newAssault(r *Room) *Assault {
	a := &Assault{room: r, choices: []string{"destroyerDominator", "gunnerDominator", "trapperDominator"}}
	a.defineProperties()
	return a
}

func (a *Assault) Redefine() { a.defineProperties() }

func (a *Assault) defineProperties() {
	a.gameActive = false
	a.minuteTimer = 12
	a.secondTimer = 60
	a.timerPaused = false
	a.leftDominators = 0
	a.timerArmed = false
}

func (a *Assault) spawnDominator(ctx *TileContext, tile *TileInstance, team int32, defType, originalType string, saveCurrentType bool) error {
	if saveCurrentType {
		originalType = defType
	}
	id, err := spawnAt(ctx, tile.Loc(ctx.Geometry))
	if err != nil {
		return err
	}
	if err := defineNamed(ctx, id, defType); err != nil {
		return err
	}
	if e := ctx.World.Get(id); e != nil {
		e.Team = team
		e.Color.SetBase(GetTeamColor(team, false))
		e.Skill.Score = 111069
		e.Name = "Dominator"
		e.SIZE = ctx.Geometry.TileWidth / 19
		e.CoreSize = e.SIZE // Set core size to entity size, matching dominator.go.
		e.DisplayName = false
	}
	ctx.Extras.GetOrCreate(id).IsDominator = true
	if !tile.IsSanctuary && ctx.Attach != nil {
		if err := ctx.Attach.AttachControllers(ctx.World, id,
			defs.Controller{Name: "nearestDifferentMaster"},
			defs.Controller{Name: "spin", Args: defs.ControllerArgs{OnlyWhenIdle: defs.Some(true)}},
		); err != nil {
			return err
		}
	}
	finishSpawn(ctx, id)

	a.slots = append(a.slots, assaultSlot{id: id, tile: tile, originalType: originalType})
	return nil
}

// win is assault.js's win(team) (assault.js:57-62).
func (a *Assault) win(team int32) {
	if ctx := a.room; ctx.Comms != nil {
		ctx.Comms.Broadcast(GetTeamName(team) + " HAS WON THE GAME!")
	}
	a.gameActive = false
}

func (a *Assault) Start() error {
	a.gameActive = true
	ctx := a.room.tileContext()
	for _, tile := range ctx.Pools.ByKey[SpawnPoolAssaultDominators] {
		a.leftDominators++
		tile.Color = tile.Type.BaseColor
		if tile.IsSanctuary {
			ctx.Pools.Register(TeamSpawnKey(TeamGreen), tile)
			if err := a.spawnDominator(ctx, tile, TeamGreen, "sanctuaryTier3", "", false); err != nil {
				return err
			}
			continue
		}
		defType := ctx.Rand.Choose(a.choices)
		if err := a.spawnDominator(ctx, tile, TeamGreen, defType, "", true); err != nil {
			return err
		}
	}
	now := a.room.World.Now()
	a.nextMinuteAt = now + 60000
	a.nextSecondAt = now + 1000
	a.timerArmed = true
	return nil
}

func assaultSecondBroadcasts(secondTimer int) bool {
	if secondTimer%10 == 0 {
		return true
	}
	switch secondTimer {
	case 14, 13, 12, 11, 9, 8, 7, 6, 5, 4, 3, 2, 1:
		return true
	}
	return false
}

func (a *Assault) Poll() error {
	ctx := a.room.tileContext()

	// toCheck is a snapshot: respawn appends while iterating.
	toCheck := a.slots
	a.slots = nil
	for _, slot := range toCheck {
		e := ctx.World.Get(slot.id)
		if e != nil && !e.IsDead() {
			a.slots = append(a.slots, slot)
			continue
		}
		if err := a.onDead(ctx, e, slot); err != nil {
			return err
		}
	}

	if !a.timerArmed {
		return nil
	}
	now := a.room.World.Now()

	if now >= a.nextMinuteAt {
		a.nextMinuteAt += 60000
		if a.gameActive && !a.timerPaused && a.minuteTimer != 0 {
			a.minuteTimer--
			if ctx.Comms != nil {
				unit := "minutes"
				if a.minuteTimer == 0 {
					unit = "minute"
				}
				ctx.Comms.Broadcast(strconv.Itoa(a.minuteTimer+1) + " " + unit + " until " + GetTeamName(TeamGreen) + " wins!")
			}
		}
	}

	if now >= a.nextSecondAt {
		a.nextSecondAt += 1000
		if a.gameActive && !a.timerPaused && a.minuteTimer == 0 {
			a.secondTimer--
			if a.secondTimer == 0 {
				a.win(TeamGreen)
			} else if assaultSecondBroadcasts(a.secondTimer) && ctx.Comms != nil {
				unit := "seconds"
				if a.secondTimer == 1 {
					unit = "second"
				}
				ctx.Comms.Broadcast(strconv.Itoa(a.secondTimer) + " " + unit + " left until " + GetTeamName(TeamGreen) + " wins!")
			}
		}
	}
	return nil
}

func (a *Assault) onDead(ctx *TileContext, dead *entity.Entity, slot assaultSlot) error {
	if !a.gameActive || a.room.ArenaClosed {
		return nil
	}
	if err := a.reactToDeath(ctx, dead, slot); err != nil {
		return err
	}
	// Broadcast room state.
	if ctx.Comms != nil {
		ctx.Comms.BroadcastRoom()
	}
	return nil
}

func (a *Assault) reactToDeath(ctx *TileContext, dead *entity.Entity, slot assaultSlot) error {
	wasBlue := dead != nil && dead.Team == TeamBlue
	noun := "Dominator"
	if slot.tile.IsSanctuary {
		noun = "Sanctuary"
	}
	if wasBlue {
		defType := slot.originalType
		if slot.tile.IsSanctuary {
			defType = "sanctuaryTier3"
		}
		if err := a.spawnDominator(ctx, slot.tile, TeamGreen, defType, slot.originalType, false); err != nil {
			return err
		}
		slot.tile.Color = "green"
		a.leftDominators++
		if ctx.Comms != nil {
			ctx.Comms.Broadcast("A GREEN " + noun + " has been repaired!")
		}
		if a.leftDominators == 3 && a.timerPaused {
			a.timerPaused = false
		}
		return nil
	}

	if err := a.spawnDominator(ctx, slot.tile, TeamBlue, "dominator", slot.originalType, false); err != nil {
		return err
	}
	slot.tile.Color = "blue"
	a.leftDominators--
	if ctx.Comms != nil {
		ctx.Comms.Broadcast("A GREEN " + noun + " has been destroyed!")
	}
	if a.leftDominators == 2 {
		if ctx.Comms != nil {
			ctx.Comms.Broadcast("Green bases are down.")
		}
		a.timerPaused = true
		a.minuteTimer = 8
		a.secondTimer = 60
	}
	if a.leftDominators == 0 {
		a.win(TeamBlue)
	}
	return nil
}

func (a *Assault) Reset() {
	a.defineProperties()
	a.slots = nil
}
