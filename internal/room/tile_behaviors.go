package room

import (
	"fmt"
	"math"

	"arrasgo/internal/jsmath"

	"arrasgo/internal/defs"
	"arrasgo/internal/entity"
	"arrasgo/internal/vmath"
)

// Tile behaviors ported from js-src roomSetup.

func masterMasterEntity(w *entity.World, id entity.EntityID) *entity.Entity {
	e := w.Get(id)
	if e == nil {
		return nil
	}
	m1 := w.Get(e.Master)
	if m1 == nil {
		return nil
	}
	return w.Get(m1.Master)
}

func refreshSize(ctx *TileContext, id entity.EntityID) {
	ctx.World.Size[id.Index] = ctx.World.ComputeSize(id, entity.SizeContext{
		Tuning: ctx.Tuning,
		Growth: ctx.Flags.Growth,
	})
}

func finishSpawn(ctx *TileContext, id entity.EntityID) {
	refreshSize(ctx, id)
	ctx.World.UpdateAABB(id)
}

func spawnAt(ctx *TileContext, loc vmath.Vec2) (entity.EntityID, error) {
	id := ctx.World.Spawn()
	ctx.World.Pos[id.Index] = loc

	// Define genericEntity before named definition, matching entity.js:72.
	if ctx.Definer != nil {
		if err := ctx.Definer.Define(ctx.World, id, "genericEntity"); err != nil {
			return id, err
		}
	}

	if ctx.OnSpawn != nil {
		ctx.OnSpawn(id)
	}
	return id, nil
}

func defineNamed(ctx *TileContext, id entity.EntityID, name string) error {
	if ctx.Definer == nil {
		return nil // not wired up yet -- see definer.go
	}
	return ctx.Definer.Define(ctx.World, id, name)
}

// PermanentSpawn: the "on('dead', respawn)" adaptation

type PermanentSpawn struct {
	Loc  vmath.Vec2
	Team int32
	Kind string // "wall", "atmg" or "baseProtector"
	Live entity.EntityID
}

func registerPermanent(ctx *TileContext, loc vmath.Vec2, team int32, kind string) error {
	slot := &PermanentSpawn{Loc: loc, Team: team, Kind: kind}
	if ctx.Permanents != nil {
		*ctx.Permanents = append(*ctx.Permanents, slot)
	}
	return spawnPermanent(ctx, slot)
}

func spawnPermanent(ctx *TileContext, slot *PermanentSpawn) error {
	switch slot.Kind {
	case "wall":
		return spawnWall(ctx, slot)
	case "atmg":
		return spawnPermanentATMG(ctx, slot)
	case "baseProtector":
		return spawnPermanentBaseProtector(ctx, slot)
	default:
		return fmt.Errorf("room: unknown PermanentSpawn kind %q", slot.Kind)
	}
}

func spawnPermanentATMG(ctx *TileContext, slot *PermanentSpawn) error {
	id, err := spawnAt(ctx, slot.Loc)
	if err != nil {
		return err
	}
	if err := defineNamed(ctx, id, "antiTankMachineGun"); err != nil {
		return err
	}
	if e := ctx.World.Get(id); e != nil {
		e.FOV = 1.5
		e.FacingType = "spinWhenIdle"
		e.Team = TeamRoom
		e.SIZE = 15
		e.Color.SetBase(GetTeamColor(TeamRed, false))
	}
	if ctx.Attach != nil {
		if err := ctx.Attach.AttachControllers(ctx.World, id, defs.Controller{Name: "nearestDifferentMaster"}); err != nil {
			return err
		}
	}
	finishSpawn(ctx, id)
	slot.Live = id
	return nil
}

func spawnWall(ctx *TileContext, slot *PermanentSpawn) error {
	id, err := spawnAt(ctx, slot.Loc)
	if err != nil {
		return err
	}
	if err := defineNamed(ctx, id, "wall"); err != nil {
		return err
	}
	if e := ctx.World.Get(id); e != nil {
		e.Team = TeamRoom
		e.SIZE = ctx.Geometry.TileWidth/2/lazyRealSize(4)*math.Sqrt2 - 2
	}
	ctx.Protected.Protect(ctx.World, id)
	if ctx.Lifegiver != nil {
		ctx.Lifegiver.BringToLife(ctx.World, id)
	}
	finishSpawn(ctx, id)
	addWall(ctx, id)
	slot.Live = id

	// Reproduces js-src bug: undefined wall variable in spooky_theme. See docs/found-bugs.md.
	if ctx.Tuning.SpookyTheme {
		return fmt.Errorf("room: tileClass.wall's spooky_theme eye spawn references an undefined %q variable (js-src bug, see docs/found-bugs.md)", "wall")
	}
	return nil
}

func normalTileInit(t *TileInstance, ctx *TileContext) error {
	ctx.Pools.RegisterDefault(t)
	return nil
}

func nestTileInit(t *TileInstance, ctx *TileContext) error {
	ctx.Pools.Register(TeamSpawnKey(TeamEnemies), t)
	return nil
}

func wallTileInit(t *TileInstance, ctx *TileContext) error {
	return registerPermanent(ctx, t.Loc(ctx.Geometry), TeamRoom, "wall")
}

func atmgTileInit(t *TileInstance, ctx *TileContext) error {
	return registerPermanent(ctx, t.Loc(ctx.Geometry), TeamRoom, "atmg")
}

func dominationTileInit(t *TileInstance, ctx *TileContext) error {
	ctx.Pools.Register(SpawnPoolDominators, t)
	return nil
}

func assaultDominatorInit(isSanctuary bool) TileHook {
	return func(t *TileInstance, ctx *TileContext) error {
		ctx.Pools.Register(SpawnPoolAssaultDominators, t)
		t.IsSanctuary = isSanctuary
		return nil
	}
}

const (
	nexusLevelGate       = 90
	nexusAlertClearDelay = 50 // nexus.js:10
)

func nexusTileTick(t *TileInstance, ctx *TileContext) error {
	loc := t.Loc(ctx.Geometry)
	now := ctx.World.Now()
	for _, id := range t.Entities() {
		e := ctx.World.Get(id)
		if e == nil || e.Skill.Level >= nexusLevelGate {
			continue
		}
		// Bug #71: throttle suppresses only first message.
		extras := ctx.Extras.GetOrCreate(id)
		if !extras.NexusAlerted && ctx.Comms != nil {
			ctx.Comms.SendTo(id, "You need to be level 90 to enter this room!")
		}
		extras.NexusAlerted = true
		ctx.schedule(now+nexusAlertClearDelay, timerNexusAlertClear, id)

		pos := ctx.World.Pos[id.Index]
		dx := pos.X - loc.X
		dy := pos.Y - loc.Y
		dist2 := dx*dx + dy*dy
		const force = 0.3
		accel := ctx.World.Accel[id.Index]
		accel.X += (3e4 * dx / dist2) * force
		accel.Y += (3e4 * dy / dist2) * force
		ctx.World.Accel[id.Index] = accel
	}
	return nil
}

func nexusPortalTileInit(t *TileInstance, ctx *TileContext) error {
	t.HasPortal = false
	if ctx.NexusPortalTiles != nil {
		*ctx.NexusPortalTiles = append(*ctx.NexusPortalTiles, t)
	}
	return nil
}

const (
	portalLaunchForce  = 7500.0
	portalGravity      = 33500.0
	portalMinibossPush = 30000.0
	portalLaunchDelay  = 100
	portalUnlockDelay  = 200
)

func portalTileInit(t *TileInstance, ctx *TileContext) error {
	if ctx.Portals != nil {
		*ctx.Portals = append(*ctx.Portals, t)
	}
	return nil
}

func portalTileTick(t *TileInstance, ctx *TileContext) error {
	loc := t.Loc(ctx.Geometry)
	now := ctx.World.Now()
	for _, id := range t.Entities() {
		e := ctx.World.Get(id)
		if e == nil {
			continue
		}
		extras := ctx.Extras.Get(id)
		if extras.Passive || e.Settings.GoThruObstacle || e.FacingType == "bound" || extras.CannotTeleport {
			continue
		}

		pos := ctx.World.Pos[id.Index]
		dx := pos.X - loc.X
		dy := pos.Y - loc.Y
		dist2 := dx*dx + dy*dy
		force := ctx.Tuning.RoomBoundForce

		if e.Type == "miniboss" || extras.IsMothership {
			accel := ctx.World.Accel[id.Index]
			accel.X += portalMinibossPush * dx * force / dist2
			accel.Y += portalMinibossPush * dy * force / dist2
			ctx.World.Accel[id.Index] = accel
			continue
		}

		if e.Type != "tank" {
			ctx.World.Kill(id)
			continue
		}

		eventHorizon := math.Min(ctx.Geometry.TileWidth, ctx.Geometry.TileHeight) / 5
		if dist2 > eventHorizon*eventHorizon {
			force *= portalGravity / dist2
			vel := ctx.World.Vel[id.Index]
			vel.X -= dx * force
			vel.Y -= dy * force
			ctx.World.Vel[id.Index] = vel
			continue
		}

		force *= portalLaunchForce
		angle := ctx.Rand.Random(math.Pi * 2)
		ax := jsmath.Cos(angle)
		ay := jsmath.Sin(angle)

		var candidates []*TileInstance
		if ctx.Portals != nil {
			for _, p := range *ctx.Portals {
				if p != t {
					candidates = append(candidates, p)
				}
			}
		}
		// Bug: single portal crashes. See docs/found-bugs.md.
		if len(candidates) == 0 {
			return fmt.Errorf("room: portal teleport with only one portal tile in the room (js-src bug, see docs/found-bugs.md)")
		}
		exitport := ctx.Rand.Choose(candidates)
		exitLoc := exitport.Loc(ctx.Geometry)

		ctx.World.Pos[id.Index] = exitLoc
		extrasPtr := ctx.Extras.GetOrCreate(id)
		extrasPtr.CannotTeleport = true
		// Launch deferred 100ms, unlock 200ms after. See timerPortalLaunch.
		extrasPtr.PortalLaunch = vmath.Vec2{X: ax * force, Y: ay * force}
		ctx.schedule(now+portalLaunchDelay, timerPortalLaunch, id)
		ctx.Protected.Protect(ctx.World, id)

		// Move drones, minions, satellites with their master.
		newVel := ctx.World.Vel[id.Index]
		ctx.World.EachLive(func(oid entity.EntityID, o *entity.Entity) {
			if oid == id {
				return
			}
			if o.Type != "drone" && o.Type != "minion" && o.Type != "satellite" {
				return
			}
			mm := masterMasterEntity(ctx.World, oid)
			if mm == nil || mm.ID != id {
				return
			}
			ov := ctx.World.Vel[oid.Index]
			ov.X += newVel.X
			ov.Y += newVel.Y
			ctx.World.Vel[oid.Index] = ov
			ctx.World.Pos[oid.Index] = exitLoc
		})
	}
	return nil
}

type roidSpec struct {
	Name   string
	Amount int
}

func rockDefs(ctx *TileContext) []roidSpec {
	pick := func(spooky, normal string) string {
		if ctx.Tuning.SpookyTheme {
			return spooky
		}
		return normal
	}
	return []roidSpec{
		{pick("pumpkin", "rock"), 0},
		{pick("pumpkin", "stone"), 1},
		{pick("pumpkin", "gravel"), 2},
	}
}

func roidDefs(ctx *TileContext) []roidSpec {
	pick := func(spooky, normal string) string {
		if ctx.Tuning.SpookyTheme {
			return spooky
		}
		return normal
	}
	return []roidSpec{
		{pick("pumpkin", "rock"), 1},
		{pick("pumpkin", "stone"), 1},
		{pick("pumpkin", "gravel"), 1},
	}
}

func placeRoids(t *TileInstance, ctx *TileContext, specs []roidSpec) error {
	if ctx.Resolver == nil {
		return nil
	}
	for _, spec := range specs {
		// rocks.js bug: uses raw Class.SIZE (undefined) -> NaN checkRadius.
		d, ok := ctx.Resolver.Set().Get(spec.Name)
		if !ok {
			return fmt.Errorf("room: rocks.js placeRoids: definition %q does not exist", spec.Name)
		}
		checkRadius := 10 + d.Size.Or(math.NaN())

		for n := 0; n < spec.Amount; n++ {
			position := t.RandomInside(ctx.Rand, ctx.Geometry)
			for i := 200; i > 0; i-- {
				if !ctx.Protected.DirtyCheck(ctx.World, position, checkRadius) {
					break
				}
				position = t.RandomInside(ctx.Rand, ctx.Geometry)
			}

			id, err := spawnAt(ctx, position)
			if err != nil {
				return err
			}
			if e := ctx.World.Get(id); e != nil {
				e.Team = TeamEnemies
				e.Facing = ctx.Rand.RandomAngle()
			}
			if err := defineNamed(ctx, id, spec.Name); err != nil {
				return err
			}
			ctx.Protected.Protect(ctx.World, id)
			if ctx.Lifegiver != nil {
				ctx.Lifegiver.BringToLife(ctx.World, id)
			}
			finishSpawn(ctx, id)
		}
	}
	return nil
}

func rockTileInit(t *TileInstance, ctx *TileContext) error {
	if err := placeRoids(t, ctx, rockDefs(ctx)); err != nil {
		return err
	}
	ctx.Pools.RegisterDefault(t)
	return nil
}

func roidTileInit(t *TileInstance, ctx *TileContext) error {
	// Bug: roid registered twice in spawn pool. See docs/found-bugs.md.
	if err := placeRoids(t, ctx, roidDefs(ctx)); err != nil {
		return err
	}
	ctx.Pools.RegisterDefault(t)
	ctx.Pools.RegisterDefault(t)
	return nil
}

func siegeKillIntruders(t *TileInstance, ctx *TileContext) {
	for _, id := range t.Entities() {
		e := ctx.World.Get(id)
		if e == nil {
			continue
		}
		mm := masterMasterEntity(ctx.World, id)
		mmIsBoss := mm != nil && ctx.Extras.Get(mm.ID).IsBoss
		mmIsArenaCloser := mm != nil && mm.IsArenaCloser
		if !ctx.Extras.Get(id).IsBoss && !mmIsBoss && !e.IsArenaCloser && !mmIsArenaCloser &&
			!e.Godmode && e.Type != "wall" {
			ctx.World.Kill(id)
		}
	}
}

func outBorderTick(t *TileInstance, ctx *TileContext) error {
	siegeKillIntruders(t, ctx)
	return nil
}

func addTileToBossSpawnTile(t *TileInstance, ctx *TileContext) {
	ctx.Pools.Register(SpawnPoolBossSpawnTile, t)
}

func bossTick(t *TileInstance, ctx *TileContext, pushTo, allow string) error {
	siegeKillIntruders(t, ctx)
	if pushTo != "right" || allow != "blitz" || !ctx.Flags.Blitz {
		return nil
	}
	for _, id := range t.Entities() {
		e := ctx.World.Get(id)
		if e == nil || !ctx.Extras.Get(id).IsBoss || e.Control.Fire {
			continue
		}
		pos := ctx.World.Pos[id.Index]
		pos.X += 2 / 0.9
		ctx.World.Pos[id.Index] = pos
	}
	return nil
}

func bossSpawnInit(t *TileInstance, ctx *TileContext) error {
	if !ctx.Flags.Blitz && !ctx.Flags.Fortress && !ctx.Flags.Citadel {
		addTileToBossSpawnTile(t, ctx)
	}
	return nil
}

func bossSpawnTick(t *TileInstance, ctx *TileContext) error {
	return bossTick(t, ctx, "right", "blitz")
}

func bossSpawnVoidInit(t *TileInstance, ctx *TileContext) error {
	if ctx.Flags.Blitz || ctx.Flags.Fortress || ctx.Flags.Citadel {
		addTileToBossSpawnTile(t, ctx)
	}
	return nil
}

func sbase1Init(t *TileInstance, ctx *TileContext) error {
	ctx.Pools.Register(TeamSpawnKey(TeamBlue), t)
	return nil
}

func stopAITileTick(t *TileInstance, ctx *TileContext) error {
	pushx, pushy := 2.0, 2.0
	if ctx.Flags.Blitz {
		pushx = 1
	}
	height, width := ctx.Geometry.Height(), ctx.Geometry.Width()
	for _, id := range t.Entities() {
		e := ctx.World.Get(id)
		if e == nil || e.Pushability == 0 || !ctx.World.Flag[id.Index].Has(entity.FlagBot) {
			continue
		}
		pos := ctx.World.Pos[id.Index]
		dirToCenter := jsmath.Atan2(height/pushy-pos.Y-height/2, width/pushx-pos.X-width/2)
		vel := vmath.Vec2{
			X: jsmath.Cos(dirToCenter) * 5 * e.Pushability,
			Y: jsmath.Sin(dirToCenter) * 5 * e.Pushability,
		}
		ctx.World.Vel[id.Index] = vel
		ctx.Extras.GetOrCreate(id).JustHittedAWall = true
	}
	return nil
}

func spawnPermanentBaseProtector(ctx *TileContext, slot *PermanentSpawn) error {
	id, err := spawnAt(ctx, slot.Loc)
	if err != nil {
		return err
	}
	if err := defineNamed(ctx, id, "baseProtector"); err != nil {
		return err
	}
	if e := ctx.World.Get(id); e != nil {
		e.Team = slot.Team
		e.Color.SetBase(GetTeamColor(slot.Team, false))
	}
	finishSpawn(ctx, id)
	slot.Live = id
	return nil
}

func teamRoomCheck(t *TileInstance, ctx *TileContext, team int32) {
	ctx.Pools.Register(TeamSpawnKey(team), t)
}

func teamCheck(t *TileInstance, ctx *TileContext, team int32) {
	for _, id := range t.Entities() {
		e := ctx.World.Get(id)
		if e == nil || e.Team == team || e.AC || e.IsArenaCloser || ctx.Flags.DisableBaseCheck {
			continue
		}
		mm := masterMasterEntity(ctx.World, id)
		if mm != nil && (mm.AC || mm.IsArenaCloser) {
			continue
		}
		ctx.World.Kill(id)
	}
}

func teamBaseInit(team int32) TileHook {
	return func(t *TileInstance, ctx *TileContext) error {
		teamRoomCheck(t, ctx, team)
		return nil
	}
}

func teamBaseTick(team int32) TileHook {
	return func(t *TileInstance, ctx *TileContext) error {
		teamCheck(t, ctx, team)
		return nil
	}
}

func teamBaseProtectedInit(team int32) TileHook {
	return func(t *TileInstance, ctx *TileContext) error {
		teamRoomCheck(t, ctx, team)
		return registerPermanent(ctx, t.Loc(ctx.Geometry), team, "baseProtector")
	}
}

func registerTileBehaviors(types map[string]*TileType) {
	must := func(key string) *TileType {
		t, ok := types[key]
		if !ok {
			panic(fmt.Sprintf("room: tile_behaviors.go references unknown tileClass %q -- out of sync with tools/dump-rooms.js", key))
		}
		return t
	}

	must("normal").Init = normalTileInit
	must("nest").Init = nestTileInit
	must("wall").Init = wallTileInit
	must("atmg").Init = atmgTileInit

	must("dominationTile").Init = dominationTileInit

	must("abase2").Init = assaultDominatorInit(false)
	must("sabase2").Init = assaultDominatorInit(true)

	must("nexus").Tick = nexusTileTick
	must("nexus_portal_tile").Init = nexusPortalTileInit

	must("portal").Init = portalTileInit
	must("portal").Tick = portalTileTick

	must("rock").Init = rockTileInit
	must("roid").Init = roidTileInit

	must("outBorder").Tick = outBorderTick
	must("bossSpawn").Init = bossSpawnInit
	must("bossSpawn").Tick = bossSpawnTick
	must("bossSpawnVoid").Init = bossSpawnVoidInit
	must("bossSpawnVoid").Tick = bossSpawnTick
	must("sbase1").Init = sbase1Init
	must("stopAI").Tick = stopAITileTick

	for i := int32(1); i <= 8; i++ {
		team := -i
		must(fmt.Sprintf("base%d", i)).Init = teamBaseInit(team)
		must(fmt.Sprintf("base%d", i)).Tick = teamBaseTick(team)
		must(fmt.Sprintf("baseprotected%d", i)).Init = teamBaseProtectedInit(team)
		must(fmt.Sprintf("baseprotected%d", i)).Tick = teamBaseTick(team)
	}

}
