package room

import (
	"fmt"
	"math"

	"arrasgo/internal/config"
	"arrasgo/internal/defs"
	"arrasgo/internal/entity"
	"arrasgo/internal/vmath"
)

func (r *Room) OnEntityDeath(id entity.EntityID) {
	r.Walls = removeWall(r.Walls, id)

	if err := r.respawnPermanentsAt(id); err != nil && r.OnError != nil {
		r.OnError(err)
	}

	for _, boss := range r.NaturallySpawnedBosses {
		if boss == id {
			r.NaturallySpawnedBosses = entity.JSRemoveID(r.NaturallySpawnedBosses, id)
			break
		}
	}

	for i, bot := range r.Bots {
		if bot != id {
			continue
		}
		last := len(r.Bots) - 1
		r.Bots[i] = r.Bots[last]
		r.Bots = r.Bots[:last]
		return
	}
}

func pickFromChanceSet(ctx *TileContext, set []config.WeightNode) (string, error) {
	for {
		if len(set) == 0 {
			return "", fmt.Errorf("room: pickFromChanceSet given an empty set")
		}
		weights := make([]float64, len(set))
		for i, n := range set {
			weights[i] = n.Weight
		}
		idx := ctx.Rand.ChooseChance(weights...)
		if idx < 0 {
			return "", fmt.Errorf("room: pickFromChanceSet: no bucket matched (all weights zero?)")
		}
		node := set[idx]
		if node.Children == nil {
			return node.Name, nil
		}
		set = node.Children
	}
}

func (r *Room) spawnFoodEntity(ctx *TileContext, pos vmath.Vec2, layeredSet []config.WeightNode) (entity.EntityID, error) {
	name, err := pickFromChanceSet(ctx, layeredSet)
	if err != nil {
		return entity.EntityID{}, err
	}
	id, err := spawnAt(ctx, pos)
	if err != nil {
		return entity.EntityID{}, err
	}
	if err := defineNamed(ctx, id, name); err != nil {
		return id, err
	}
	if e := ctx.World.Get(id); e != nil {
		e.Facing = ctx.Rand.RandomAngle()
		e.Team = TeamEnemies
	}
	ctx.Extras.GetOrCreate(id).IsFood = true
	finishSpawn(ctx, id)
	return id, nil
}

func (r *Room) FoodLoop() error {
	if r.ArenaClosed {
		return nil
	}
	ctx := r.tileContext()

	if ctx.Rand.Random(1) >= 0.1 { // 1/10 chance to spawn food at all
		return nil
	}
	totalFoods := 1
	if ctx.Rand.Random(1) < 0.2 { // 1/5 chance to spawn a group
		totalFoods = 1 + int(math.Floor(ctx.Rand.Random(1)*float64(r.Tuning.FoodGroupCap)))
	}

	enemyKey := TeamSpawnKey(TeamEnemies)
	enemyPool := r.Pools.ByKey[enemyKey]
	if ctx.Rand.Random(1) < 1.0/3 && len(enemyPool) > 0 {
		if r.Tuning.ClassicFood && ctx.Rand.Random(1) < 1.0/3 && len(r.EnemyFoods) < r.Tuning.EnemyCapNest {
			pos := ctx.Rand.Choose(enemyPool).RandomInside(ctx.Rand, r.Geometry)
			id, err := r.spawnFoodEntity(ctx, pos, r.Tuning.ClassicEnemyTypesNest)
			if err != nil {
				return err
			}
			r.EnemyFoods = append(r.EnemyFoods, id)
			r.scheduleEvery(r.World.Now()+foodCleanupPeriod, foodCleanupPeriod, timerEnemyFoodCleanup, id)
		}
		if len(r.NestFoods) < r.Tuning.FoodCapNest {
			pos := ctx.Rand.Choose(enemyPool).RandomInside(ctx.Rand, r.Geometry)
			set := r.Tuning.FoodTypesNest
			if r.Tuning.ClassicFood {
				set = r.Tuning.ClassicFoodTypesNest
			}
			for i := 0; i < totalFoods; i++ {
				id, err := r.spawnFoodEntity(ctx, pos, set)
				if err != nil {
					return err
				}
				r.NestFoods = append(r.NestFoods, id)
				r.scheduleEvery(r.World.Now()+foodCleanupPeriod, foodCleanupPeriod, timerNestFoodCleanup, id)
			}
		}
	} else if len(r.Foods) < r.Tuning.FoodCap {
		pos := ctx.Rand.Choose(r.Pools.Default).RandomInside(ctx.Rand, r.Geometry)
		set := r.Tuning.FoodTypes
		if r.Tuning.ClassicFood {
			set = r.Tuning.ClassicFoodTypes
		}
		for i := 0; i < totalFoods; i++ {
			id, err := r.spawnFoodEntity(ctx, pos, set)
			if err != nil {
				return err
			}
			r.Foods = append(r.Foods, id)
			r.scheduleEvery(r.World.Now()+foodCleanupPeriod, foodCleanupPeriod, timerFoodCleanup, id)
		}
	}
	return nil
}

type PendingBossSpawn struct {
	AtTick    int64
	Selection config.BossWave
	Amount    int
}

func (r *Room) checkUsers() bool {
	if r.ForceCheckUsers {
		return true
	}
	return r.clientCount() >= 1
}

func (r *Room) clientCount() int {
	if r.Comms == nil {
		return 0
	}
	return r.Comms.ClientCount()
}

func (r *Room) findBossSpot(ctx *TileContext) vmath.Vec2 {
	key := TeamSpawnKey(TeamEnemies)
	spot := r.Pools.RandomPoint(ctx.Rand, r.Geometry, key)
	for i := 30; i > 0; i-- {
		if !r.Protected.DirtyCheck(r.World, spot, 500) {
			break
		}
		spot = r.Pools.RandomPoint(ctx.Rand, r.Geometry, key)
	}
	return spot
}

func (r *Room) MaintainBosses() error {
	ctx := r.tileContext()

	if !r.checkUsers() || !r.Tuning.EnableBosses || len(r.NaturallySpawnedBosses) != 0 {
		return nil
	}
	old := r.BossTimer
	r.BossTimer++
	if old <= r.Tuning.BossSpawnCooldown {
		return nil
	}
	r.BossTimer = -r.Tuning.BossSpawnDelay - 2

	if len(r.Tuning.BossTypes) == 0 {
		return nil
	}
	waveChances := make([]float64, len(r.Tuning.BossTypes))
	for i, w := range r.Tuning.BossTypes {
		waveChances[i] = w.Chance
	}
	waveIdx := ctx.Rand.ChooseChance(waveChances...)
	if waveIdx < 0 {
		return nil
	}
	selection := r.Tuning.BossTypes[waveIdx]

	amount := 1
	if len(selection.Amount) > 0 {
		amountChances := make([]float64, len(selection.Amount))
		for i, a := range selection.Amount {
			amountChances[i] = float64(a)
		}
		if idx := ctx.Rand.ChooseChance(amountChances...); idx >= 0 {
			amount = idx + 1
		}
	}

	if selection.Message != "" && r.Comms != nil {
		r.Comms.Broadcast(selection.Message)
	}
	if r.Comms != nil {
		if amount > 1 {
			r.Comms.Broadcast("Visitors are coming.")
		} else {
			r.Comms.Broadcast("A visitor is coming.")
		}
	}
	r.PendingBosses = append(r.PendingBosses, &PendingBossSpawn{
		AtTick:    r.syncedTick + int64(r.Tuning.BossSpawnDelay)*30,
		Selection: selection,
		Amount:    amount,
	})
	return nil
}

// Reproduces the JS bug at line 404. See docs/found-bugs.md.
func (r *Room) spawnBossWave(ctx *TileContext, pending *PendingBossSpawn) error {
	names := ctx.Rand.ChooseBossName(pending.Selection.NameType, pending.Amount)
	for i := 0; i < pending.Amount; i++ {
		if len(pending.Selection.Bosses) == 0 {
			return fmt.Errorf("room: pending boss wave has no bosses listed")
		}
		spot := r.findBossSpot(ctx)
		id, err := spawnAt(ctx, spot)
		if err != nil {
			return err
		}
		ctx.Rand.SortRandomComparator(pending.Selection.Bosses)
		bossName := pending.Selection.Bosses[i%len(pending.Selection.Bosses)]
		if err := defineNamed(ctx, id, bossName); err != nil {
			return err
		}
		if e := ctx.World.Get(id); e != nil {
			e.Team = TeamEnemies
			if i < len(names) && names[i] != "" {
				e.Name = names[i]
			}
		}
		ctx.Extras.GetOrCreate(id).IsBoss = true
		finishSpawn(ctx, id)
		r.NaturallySpawnedBosses = append(r.NaturallySpawnedBosses, id)
	}
	if r.Comms != nil {
		verb := "have"
		if len(names) == 1 {
			verb = "has"
		}
		r.Comms.Broadcast(fmt.Sprintf("%s %s arrived!", listify(names), verb))
	}
	return nil
}

func (r *Room) SyncedDelays() error {
	at := r.syncedTick
	r.syncedTick++
	if len(r.PendingBosses) == 0 {
		return nil
	}
	kept := r.PendingBosses[:0]
	var due []*PendingBossSpawn
	for _, wave := range r.PendingBosses {
		if wave.AtTick == at {
			due = append(due, wave)
			continue
		}
		kept = append(kept, wave)
	}
	r.PendingBosses = kept
	ctx := r.tileContext()
	for _, wave := range due {
		if err := r.spawnBossWave(ctx, wave); err != nil {
			return err
		}
	}
	return nil
}

func listify(names []string) string {
	switch len(names) {
	case 0:
		return ""
	case 1:
		return names[0]
	}
	out := names[0]
	for i := 1; i < len(names)-1; i++ {
		out += ", " + names[i]
	}
	out += " and " + names[len(names)-1]
	return out
}

func (r *Room) SpawnBots(loc vmath.Vec2, team int32) (entity.EntityID, error) {
	ctx := r.tileContext()
	botName := r.Tuning.BotNamePrefix + ctx.Rand.ChooseBotName()

	id, err := spawnAt(ctx, loc)
	if err != nil {
		return id, err
	}
	if err := defineNamed(ctx, id, r.Tuning.SpawnClass); err != nil {
		return id, err
	}
	if ctx.Attach != nil {
		if err := ctx.Attach.AttachControllers(ctx.World, id, defs.Controller{Name: "nearestDifferentMaster"}); err != nil {
			return id, err
		}
	}

	if ctx.Definer != nil {
		ctx.Definer.RefreshBodyAttributes(ctx.World, id)
	}

	e := ctx.World.Get(id)
	if e == nil {
		return id, fmt.Errorf("room: SpawnBots: entity vanished mid-spawn")
	}
	e.Name = botName
	e.Invuln = true
	ctx.World.Flag[id.Index] |= entity.FlagBot

	leftover := ctx.Rand.ChooseChance(r.Tuning.BotClassUpgradeChances[:]...)
	if leftover < 0 {
		leftover = 0
	}
	ctx.Extras.GetOrCreate(id).LeftoverUpgrades = int32(leftover)

	var color string
	switch {
	case r.Tuning.RandomBodyColors:
		n := math.Floor(ctx.Rand.Random(20))
		e.Color.SetBaseNumber(n)
		color = paletteColorString(n)
	case team != 0:
		color = GetTeamColor(team, false)
		e.Color.SetBase(color)
	default:
		color = "red"
		e.Color.SetBase(color)
	}
	extras := ctx.Extras.GetOrCreate(id)
	extras.LeaderboardColor = color
	extras.MinimapColor = color

	e.Skill.Reset(&r.Tuning, true)

	r.scheduleEvery(r.World.Now()+100, 100, timerBotLevelling, id)

	if ctx.Definer != nil {
		ctx.Definer.RefreshBodyAttributes(ctx.World, id)
	}
	if team != 0 {
		e.Team = team
	}
	release := r.World.Now() + 3000 + int64(math.Floor(ctx.Rand.Random(7000)))
	r.schedule(release, timerBotRelease, id)
	finishSpawn(ctx, id)

	r.Bots = append(r.Bots, id)
	if r.Tag != nil {
		r.Tag.AddBot(id, team)
	}
	return id, nil
}

var skillUpNames = [10]string{"atk", "hlt", "spd", "str", "pen", "dam", "rld", "mob", "rgn", "shi"}

func (r *Room) MaintainBots() {
	for _, id := range r.Bots {
		e := r.World.Get(id)
		if e == nil {
			continue
		}
		if e.Skill.Level < int32(r.Tuning.LevelCap) && e.Skill.Level >= int32(r.Tuning.BotStartLevel) {
			e.Skill.Score += float64(r.Tuning.BotXPGain)
		}
	}
}

func (r *Room) releaseBot(ctx *TileContext, id entity.EntityID) error {
	e := ctx.World.Get(id)
	if e == nil {
		return nil
	}

	set := ctx.Resolver.Set()
	botDef, ok := set.Get("bot")
	if !ok {
		return fmt.Errorf("room: releaseBot: no `bot` definition to read CONTROLLERS/FACING_TYPE/AI from")
	}

	var own *defs.Definition
	if len(e.Defs) > 0 {
		if d, ok := set.At(int(e.Defs[0])); ok {
			own = d
		}
	}

	list := botDef.Controllers.Or(nil)
	if own != nil {
		if extra, ok := own.Controllers.Get(); ok {
			merged := make([]defs.Controller, 0, len(list)+len(extra))
			merged = append(merged, list...)
			merged = append(merged, extra...)
			list = merged
		}
	}
	if ctx.Attach != nil {
		if err := ctx.Attach.AttachControllers(ctx.World, id, list...); err != nil {
			return err
		}
	}

	if err := applyBotFacingAndAI(ctx, id, botDef, own); err != nil {
		return err
	}

	ctx.Extras.GetOrCreate(id).BotReleased = true

	if ctx.Definer != nil {
		ctx.Definer.RefreshBodyAttributes(ctx.World, id)
	}
	if e = ctx.World.Get(id); e != nil {
		e.Invuln = false
	}
	return nil
}

func (r *Room) OnEntityDefine(w *entity.World, id entity.EntityID) error {
	if r.Extras == nil || !r.Extras.Get(id).BotReleased {
		return nil
	}
	ctx := r.tileContext()
	e := w.Get(id)
	if e == nil {
		return nil
	}

	set := ctx.Resolver.Set()
	botDef, ok := set.Get("bot")
	if !ok {
		return fmt.Errorf("room: OnEntityDefine: no `bot` definition to read FACING_TYPE/AI from")
	}
	var own *defs.Definition
	if len(e.Defs) > 0 {
		if d, ok := set.At(int(e.Defs[0])); ok {
			own = d
		}
	}

	if own != nil && own.HealingTank.Or(false) {
		if ctx.Attach != nil {
			if err := ctx.Attach.AttachControllers(w, id, healingTankControllers...); err != nil {
				return err
			}
		}
		if err := applyBotFacingAndAI(ctx, id, botDef, own); err != nil {
			return err
		}
	}
	return applyBotFacingAndAI(ctx, id, botDef, own)
}

var healingTankControllers = []defs.Controller{
	{Name: "healTeamMasters"},
	{Name: "minion"},
	{Name: "wanderAroundMap", Args: defs.ControllerArgs{
		ReplicatePlayerMovement: defs.Some(true),
		LookAtGoal:              defs.Some(true),
	}},
}

func applyBotFacingAndAI(ctx *TileContext, id entity.EntityID, botDef, own *defs.Definition) error {
	if ctx.Definer == nil {
		return nil
	}
	facing := botDef.FacingType
	if own != nil {
		if _, ok := own.FacingType.Get(); ok {
			facing = own.FacingType
		}
	}
	patch := &defs.Definition{FacingType: facing, AI: botDef.AI}
	return ctx.Definer.DefineInline(ctx.World, id, patch)
}

func (r *Room) TopUpBotsAndUpgrade() error {
	ctx := r.tileContext()
	if r.Tag != nil {
		r.Tag.PollDeaths(r.World)
	}
	for _, id := range r.Bots {
		e := ctx.World.Get(id)
		if e == nil {
			continue
		}
		e.Skill.Maintain(&r.Tuning)
		if idx := ctx.Rand.ChooseChance(r.Tuning.BotSkillUpgradeChances[:]...); idx >= 0 {
			if slot, ok := entity.SkillIndexOf(skillUpNames[idx]); ok {
				if ctx.Definer != nil {
					if _, err := ctx.Definer.SkillUp(ctx.World, id, slot); err != nil {
						return err
					}
				} else {
					e.Skill.Upgrade(&r.Tuning, slot)
				}
			}
		}
		if ctx.Definer != nil {
			ctx.Definer.RefreshSkills(ctx.World, id)
		}
		if e = ctx.World.Get(id); e == nil {
			continue
		}

		if extras := ctx.Extras.Get(id); extras.LeftoverUpgrades != 0 && ctx.Definer != nil {
			number := ctx.Rand.IrandomRange(0, float64(len(e.Upgrades)))
			if _, err := ctx.Definer.Upgrade(ctx.World, id, number, 0); err != nil {
				return err
			}
		}

	}

	if r.ArenaClosed || r.CannotRespawn || len(r.Bots) >= r.Tuning.BotCap {
		return nil
	}
	var team int32
	if teamsCount, ok := r.Mutable.Teams.Int(); ok && (r.Mutable.Mode == "tdm" || r.Mutable.Mode == "tag") {
		team = GetWeakestTeam(ctx.Rand, teamsCount, true, r.Tuning.TeamWeights, nil, r.liveTeamCounts())
	}
	key := SpawnPoolDefault
	if team != 0 {
		key = TeamSpawnKey(team)
	}
	loc := r.Pools.RandomPoint(ctx.Rand, r.Geometry, key)
	for i := 20; i > 0; i-- {
		if !r.Protected.DirtyCheck(r.World, loc, 50) {
			break
		}
		loc = r.Pools.RandomPoint(ctx.Rand, r.Geometry, key)
	}
	_, err := r.SpawnBots(loc, team)
	return err
}

func (r *Room) liveTeamCounts() TeamCounts {
	counts := TeamCounts{}
	r.World.EachLive(func(id entity.EntityID, e *entity.Entity) {
		flags := r.World.Flag[id.Index]
		if !flags.Has(entity.FlagBot) && !flags.Has(entity.FlagPlayer) {
			return
		}
		if e.Team >= 0 {
			return
		}
		counts[e.Team]++
	})
	return counts
}

func (r *Room) respawnPermanentsAt(dead entity.EntityID) error {
	var ctx *TileContext
	for _, slot := range r.Permanents {
		if slot.Live != dead {
			continue
		}
		if ctx == nil {
			ctx = r.tileContext()
		}
		if err := spawnPermanent(ctx, slot); err != nil {
			return err
		}
	}
	return nil
}
