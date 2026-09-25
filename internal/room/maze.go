package room

import (
	"math"

	"arrasgo/internal/entity"
	"arrasgo/internal/vmath"
)

// Maze ports game/gamemodes/scripts/maze.js.
type Maze struct {
	room *Room
	Type int
}

func newMaze(r *Room) *Maze {
	t := 0
	if r.Flags.HasMazeType {
		t = int(r.Flags.MazeType)
	}
	return &Maze{room: r, Type: t}
}

// Redefine is maze.js's redefine(type) (gamemodeManager.js:73).
func (m *Maze) Redefine(mazeType int) { m.Type = mazeType }

// Generate is maze.js's generate(), called once from GamemodeManager.Start.
func (m *Maze) Generate() error {
	return spawnMazeWalls(m.room, m.Type, "wall")
}

func destroyExistingWalls(ctx *TileContext) {
	w := ctx.World
	var walls []entity.EntityID
	w.EachLive(func(id entity.EntityID, e *entity.Entity) {
		if e.Type == "wall" {
			walls = append(walls, id)
		}
	})
	destroyer, ok := ctx.Lifegiver.(interface{ Destroy(entity.EntityID) })
	for _, id := range walls {
		if ok {
			destroyer.Destroy(id)
			continue
		}
		w.Kill(id)
	}
}

// spawnMazeWalls spawns maze walls from a generated layout.
func spawnMazeWalls(r *Room, mazeType int, wallDefName string) error {
	destroyExistingWalls(r.tileContext())

	if r.Maze == nil {
		return nil // MazeGenerator not wired up yet -- see definer.go
	}
	layout := r.Maze.PlaceMinimal(mazeType)
	if layout.Width == 0 || layout.Height == 0 {
		return nil // an empty layout spawns nothing, same as a 0-length squares array in the JS
	}

	ctx := r.tileContext()
	roomW, roomH := r.Geometry.Width(), r.Geometry.Height()
	fw, fh := float64(layout.Width), float64(layout.Height)

	for _, sq := range layout.Squares {
		loc := vmath.Vec2{
			X: roomW/fw*sq.X - roomW/2 + roomW/fw/2*sq.Size,
			Y: roomH/fh*sq.Y - roomH/2 + roomH/fh/2*sq.Size,
		}
		id, err := spawnAt(ctx, loc)
		if err != nil {
			return err
		}
		if err := defineNamed(ctx, id, wallDefName); err != nil {
			return err
		}
		if e := ctx.World.Get(id); e != nil {
			e.SIZE = roomW/fw/2*sq.Size/lazyRealSize(4)*math.Sqrt2 - 2
		}
		ctx.Protected.Protect(ctx.World, id)
		if ctx.Lifegiver != nil {
			ctx.Lifegiver.BringToLife(ctx.World, id)
		}
		finishSpawn(ctx, id)
		addWall(ctx, id)

		if err := maybeSpawnSpookyEye(r, ctx, id); err != nil {
			return err
		}
	}
	return nil
}

// maybeSpawnSpookyEye spawns a decorative eye on a wall if spooky theme is enabled.
func maybeSpawnSpookyEye(r *Room, ctx *TileContext, wallID entity.EntityID) error {
	if !ctx.Tuning.SpookyTheme {
		return nil
	}
	wall := ctx.World.Get(wallID)
	if wall == nil {
		return nil
	}
	eyeSize := 12 * (ctx.Rand.Random(1) + 0.45)
	wallPos := ctx.World.Pos[wallID.Index]
	loc := vmath.Vec2{
		X: wallPos.X + (wall.SIZE-eyeSize*2)*ctx.Rand.Random(1) - wall.SIZE/2,
		Y: wallPos.Y + (wall.SIZE-eyeSize*2)*ctx.Rand.Random(1) - wall.SIZE/2,
	}
	eyeID, err := spawnAt(ctx, loc)
	if err != nil {
		return err
	}
	if err := defineNamed(ctx, eyeID, "hwEye"); err != nil {
		return err
	}
	if eye := ctx.World.Get(eyeID); eye != nil {
		eye.SIZE = eyeSize
	}
	r.schedule(ctx.World.Now()+1000, timerSpookyEyeFacing, eyeID)
	ctx.Extras.GetOrCreate(eyeID).MinimapColor = "18"
	finishSpawn(ctx, eyeID)
	return nil
}
