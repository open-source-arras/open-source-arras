package room

import (
	"arrasgo/internal/defs"
	"arrasgo/internal/entity"
)

const outbreakZombieTeam int32 = -45

// Outbreak is outbreak.js.
type Outbreak struct {
	room *Room

	GameActive bool
}

func newOutbreak(r *Room) *Outbreak {
	return &Outbreak{room: r}
}

func (o *Outbreak) Start() { o.GameActive = true }

// Zombify is outbreak.js:10-32 with a dead guard clause: see docs/found-bugs.md.
func (o *Outbreak) Zombify(liveID entity.EntityID, name string) (entity.EntityID, error) {
	ctx := o.room.tileContext()
	if name == "" {
		ctx.World.Destroy(liveID)
		return entity.EntityID{}, nil
	}

	orig := ctx.World.Get(liveID)
	if orig == nil {
		return entity.EntityID{}, nil
	}

	zid, err := spawnAt(ctx, ctx.World.Pos[liveID.Index])
	if err != nil {
		return entity.EntityID{}, err
	}
	if err := defineNamed(ctx, zid, name); err != nil {
		return zid, err
	}
	z := ctx.World.Get(zid)
	if z == nil {
		return zid, nil
	}
	z.AISettings = entity.AISettings{CHASE: true}
	z.FacingType = "manual"
	z.FacingTypeArgs.Angle, z.FacingTypeArgs.HasAngle = orig.Facing, true
	z.Facing = orig.Facing
	z.Color.SetBase("grey")
	z.Skill = orig.Skill
	z.Name = orig.Name
	z.Invuln = true
	z.Godmode = true
	if ctx.Definer != nil {
		ctx.Definer.RefreshBodyAttributes(ctx.World, zid)
		ctx.Definer.RefreshSkills(ctx.World, zid)
	}
	z.Team = outbreakZombieTeam
	ctx.Extras.GetOrCreate(zid).MinimapColor = "green"
	ctx.Extras.GetOrCreate(zid).Zombified = true
	finishSpawn(ctx, zid)

	o.room.schedule(ctx.World.Now()+zombieActivateDelay, timerZombieActivate, zid)
	return zid, nil
}

const zombieActivateDelay = 1000

func (o *Outbreak) activate(ctx *TileContext, id entity.EntityID) error {
	e := ctx.World.Get(id)
	if e == nil {
		return nil
	}
	if ctx.Attach != nil {
		if err := ctx.Attach.AttachControllers(ctx.World, id,
			defs.Controller{Name: "nearestDifferentMaster"},
			defs.Controller{Name: "mapTargetToGoal"},
		); err != nil {
			return err
		}
	}
	e.Godmode = false
	e.Invuln = false
	e.Color.SetBase("green")
	e.FacingType = "looseToTarget"
	return nil
}
