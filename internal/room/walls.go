package room

import (
	"arrasgo/internal/ctrl"
	"arrasgo/internal/entity"
)

// Wall holds a wall entity's hitbox and ID.
type Wall struct {
	ID entity.EntityID

	Box ctrl.WallHitbox
}

// addWall builds and stores the wall's hitbox.
func addWall(ctx *TileContext, id entity.EntityID) {
	if ctx.Walls == nil {
		return
	}
	e := ctx.World.Get(id)
	if e == nil {
		return
	}
	box := ctrl.MakeHitbox(ctx.World.Size[id.Index], e.Angle)
	box.Pos = ctx.World.Pos[id.Index]
	*ctx.Walls = append(*ctx.Walls, Wall{ID: id, Box: box})
}

// removeWall removes a wall from the list by ID.
func removeWall(list []Wall, id entity.EntityID) []Wall {
	for i, wall := range list {
		if wall.ID != id {
			continue
		}
		last := len(list) - 1
		list[i] = list[last]
		return list[:last]
	}
	return list
}
