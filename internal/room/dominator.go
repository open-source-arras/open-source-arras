package room

import (
	"arrasgo/internal/defs"
	"arrasgo/internal/entity"
)

type dominatorSlot struct {
	id      entity.EntityID
	tile    *TileInstance
	team    int32
	defType string
}

// Domination is the dominator gamemode (game/gamemodes/scripts/dominator.js).
type Domination struct {
	dominatorTypes []string

	teamcounts map[int32]int32
	gameActive bool
	gameWon    bool

	slots []dominatorSlot
}

func newDomination() *Domination {
	return &Domination{
		dominatorTypes: []string{"destroyerDominator", "gunnerDominator", "trapperDominator"},
		teamcounts:     make(map[int32]int32),
	}
}

func (d *Domination) spawnDominators(ctx *TileContext, tile *TileInstance, team int32, color, defType string, colorAsString bool) error {
	if defType == "" {
		defType = ctx.Rand.Choose(d.dominatorTypes)
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
		e.Color.SetBase(color)
		e.Skill.Score = 111069
		e.Name = "Dominator"
		e.SIZE = ctx.Geometry.TileWidth / 15
		e.CoreSize = e.SIZE
	}
	ctx.Extras.GetOrCreate(id).IsDominator = true
	if ctx.Attach != nil {
		if err := ctx.Attach.AttachControllers(ctx.World, id,
			defs.Controller{Name: "nearestDifferentMaster"},
			defs.Controller{Name: "spin", Args: defs.ControllerArgs{OnlyWhenIdle: defs.Some(true)}},
		); err != nil {
			return err
		}
	}
	finishSpawn(ctx, id)

	tile.Color = color
	d.teamcounts[team]++

	d.slots = append(d.slots, dominatorSlot{id: id, tile: tile, team: team, defType: defType})
	return nil
}

func (d *Domination) Start(r *Room) error {
	d.gameActive = true
	ctx := r.tileContext()
	for _, tile := range ctx.Pools.ByKey[SpawnPoolDominators] {
		if err := d.spawnDominators(ctx, tile, TeamEnemies, tile.Color, "", false); err != nil {
			return err
		}
	}
	return nil
}

func (d *Domination) Poll(r *Room) error {
	ctx := r.tileContext()
	toCheck := d.slots
	d.slots = nil
	for _, slot := range toCheck {
		e := ctx.World.Get(slot.id)
		if e != nil && !e.IsDead() {
			d.slots = append(d.slots, slot)
			continue
		}
		if err := d.onDead(ctx, e, slot); err != nil {
			return err
		}
	}
	return nil
}

func (d *Domination) onDead(ctx *TileContext, dead *entity.Entity, slot dominatorSlot) error {
	d.teamcounts[slot.team]--
	if d.teamcounts[slot.team] <= 0 {
		delete(d.teamcounts, slot.team)
	}

	newTeam := TeamEnemies
	if slot.team == TeamEnemies {
		var killerName string
		var killerTeam = TeamRoom
		if dead != nil {
			var killers []entity.EntityID
			for _, cid := range dead.CollisionArray {
				ce := ctx.World.Get(cid)
				if ce != nil && IsPlayerTeam(ce.Team) && slot.team != ce.Team {
					killers = append(killers, cid)
				}
			}
			if len(killers) > 0 {
				chosen := ctx.Rand.Choose(killers)
				if mm := masterMasterEntity(ctx.World, chosen); mm != nil {
					killerTeam = mm.Team
					killerName = mm.Name
				}
			}
		}
		newTeam = killerTeam
		teamName := GetTeamName(newTeam)
		if newTeam > 0 {
			teamName = killerName
		}
		if ctx.Comms != nil {
			ctx.Comms.Broadcast("A dominator is now controlled by " + teamName + "!")
		}
		if newTeam != TeamEnemies && d.teamcounts[newTeam] >= 4 && !d.gameWon {
			d.gameWon = true
			if ctx.Comms != nil {
				ctx.Comms.Broadcast(teamName + " has won the game!")
			}
		}
	} else if ctx.Comms != nil {
		ctx.Comms.Broadcast("A dominator is being contested!")
	}

	newColor := GetTeamColor(newTeam, false)
	if err := d.spawnDominators(ctx, slot.tile, newTeam, newColor, slot.defType, true); err != nil {
		return err
	}
	if ctx.Comms != nil {
		ctx.Comms.BroadcastRoom()
	}
	return nil
}

func (d *Domination) Reset() {
	d.gameActive = false
	d.teamcounts = make(map[int32]int32)
	d.slots = nil
}
