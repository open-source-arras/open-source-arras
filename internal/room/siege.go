package room

import (
	"strconv"

	"arrasgo/internal/defs"
	"arrasgo/internal/entity"
	"arrasgo/internal/jsutil"
	"arrasgo/internal/vmath"
)

type siegeBossChoice struct {
	Cost int
	Name string
}

var siegeOldGroups = struct {
	elites     []string
	mysticals  []string
	celestials []string
	eternals   []string
}{
	elites:     []string{"eliteDestroyer", "eliteGunner", "eliteSprayer", "eliteBattleship", "eliteSpawner", "sprayerLegion"},
	mysticals:  []string{"summoner", "eliteSkimmer", "nestKeeper", "roguePalisade"},
	celestials: []string{"paladin", "freyja", "zaphkiel", "nyx", "theia"},
	eternals:   []string{"legionaryCrasher", "kronos", "odin"},
}

var siegeBossChoices = []siegeBossChoice{
	{5, "sorcerer"}, {5, "summoner"}, {5, "enchantress"}, {5, "exorcistor"}, {5, "shaman"}, {5, "witch"},
	{1, "eliteDestroyer"}, {1, "eliteGunner"}, {1, "eliteSprayer"}, {5, "eliteBattleship"}, {5, "eliteSpawner"}, {5, "eliteTrapGuard"}, {5, "eliteSpinner"}, {5, "eliteSkimmer"},
	{4, "nestKeeper"}, {4, "nestWarden"}, {4, "nestGuardian"},
	{25, "ares"}, {25, "gersemi"}, {25, "ezekiel"}, {25, "eris"}, {25, "selene"},
	{50, "paladin"}, {50, "freyja"}, {50, "zaphkiel"}, {50, "nyx"}, {50, "theia"}, {50, "atlas"}, {50, "hera"}, {50, "horus"}, {50, "anubis"}, {50, "isis"},
	{50, "tethys"}, {50, "ullr"}, {50, "dellingr"}, {50, "osiris"}, {50, "alcis"}, {50, "khonsu"}, {50, "hyperion"}, {50, "nephthys"}, {50, "tyr"}, {50, "vor"},
	{50, "aether"}, {50, "iapetus"}, {50, "baldr"}, {50, "eros"}, {50, "hjordis"}, {50, "sif"}, {50, "freyr"}, {50, "styx"}, {50, "apollo"}, {50, "ptah"},
	{100, "legionaryCrasherFix"}, {100, "kronos"}, {100, "odin"}, {100, "amun"},
}

var (
	siegeSentinelChoices    = []string{"sentinelMinigun", "sentinelLauncher", "sentinelCrossbow"}
	siegeSmallFodderChoices = []string{"crasher"}
)

func calculateSiegePoints(wave int) int { return 5 + wave*3 }

// buildSiegeWaveCodes is siege.js:19-54.
func buildSiegeWaveCodes(rng *jsutil.Rand) [][]string {
	g := siegeOldGroups
	cat := func(parts ...[]string) []string {
		var out []string
		for _, p := range parts {
			out = append(out, p...)
		}
		return out
	}
	return [][]string{
		rng.ChooseN(g.elites, 1),
		rng.ChooseN(g.elites, 2),
		rng.ChooseN(g.elites, 3),
		rng.ChooseN(g.elites, 4),
		cat(rng.ChooseN(g.elites, 3), rng.ChooseN(g.mysticals, 1)),
		cat(rng.ChooseN(g.elites, 2), rng.ChooseN(g.mysticals, 2)),
		cat(rng.ChooseN(g.elites, 1), rng.ChooseN(g.mysticals, 3)),
		rng.ChooseN(g.mysticals, 4),
		cat(rng.ChooseN(g.elites, 1), rng.ChooseN(g.mysticals, 4)),
		cat(rng.ChooseN(g.elites, 2), rng.ChooseN(g.mysticals, 4)),
		cat(rng.ChooseN(g.elites, 3), rng.ChooseN(g.mysticals, 4)),
		cat(rng.ChooseN(g.elites, 4), rng.ChooseN(g.mysticals, 4)),
		{g.celestials[0]},
		{g.celestials[1]},
		{g.celestials[2]},
		{g.celestials[3]},
		{g.celestials[4]},
		cat(rng.ChooseN(g.elites, 1), rng.ChooseN(g.mysticals, 1), rng.ChooseN(g.celestials, 1)),
		cat(rng.ChooseN(g.elites, 3), rng.ChooseN(g.mysticals, 1), rng.ChooseN(g.celestials, 1)),
		cat(rng.ChooseN(g.elites, 3), rng.ChooseN(g.mysticals, 3), rng.ChooseN(g.celestials, 1)),
		cat(rng.ChooseN(g.elites, 4), rng.ChooseN(g.mysticals, 4), rng.ChooseN(g.celestials, 1)),
		rng.ChooseN(g.celestials, 2),
		cat(rng.ChooseN(g.elites, 1), rng.ChooseN(g.mysticals, 2), rng.ChooseN(g.celestials, 2)),
		cat(rng.ChooseN(g.elites, 3), rng.ChooseN(g.mysticals, 3), rng.ChooseN(g.celestials, 2)),
		cat(rng.ChooseN(g.elites, 4), rng.ChooseN(g.mysticals, 4), rng.ChooseN(g.celestials, 2)),
		rng.ChooseN(g.celestials, 3),
		cat(rng.ChooseN(g.elites, 3), rng.ChooseN(g.mysticals, 3), rng.ChooseN(g.celestials, 3)),
		cat(rng.ChooseN(g.elites, 4), rng.ChooseN(g.mysticals, 4), rng.ChooseN(g.celestials, 3)),
		rng.ChooseN(g.celestials, 4),
		cat(rng.ChooseN(g.elites, 2), rng.ChooseN(g.mysticals, 2), rng.ChooseN(g.celestials, 4)),
		cat(rng.ChooseN(g.elites, 4), rng.ChooseN(g.mysticals, 4), rng.ChooseN(g.celestials, 4)),
		rng.ChooseN(g.celestials, 5),
		cat(rng.ChooseN(g.elites, 4), rng.ChooseN(g.mysticals, 4), rng.ChooseN(g.celestials, 5)),
		rng.ChooseN(g.eternals, 1),
	}
}

type siegeSanctuarySlot struct {
	id             entity.EntityID
	tile           *TileInstance
	forTierUpgrade bool
}

type siegeEnemySlot struct {
	id entity.EntityID
}

// Siege ports siege.js: a wave-based point-buy boss spawner defending player sanctuaries.
type Siege struct {
	room *Room

	waveCodes [][]string
	waves     [][]string
	length    int

	waveId           int
	gameActive       bool
	timer            int
	remainingEnemies int
	sanctuaryTier    int
	leftSanctuaries  int

	sanctuaries []siegeSanctuarySlot
	enemies     []siegeEnemySlot

	lockdown          bool
	lockdownRemaining int
	nextLockdownAt    int64
}

func newSiege(r *Room) *Siege {
	s := &Siege{room: r}
	s.waveCodes = buildSiegeWaveCodes(r.Rand)
	s.defineProperties()
	return s
}

// Redefine is siege.js:340.
func (s *Siege) Redefine() { s.defineProperties() }

func (s *Siege) defineProperties() {
	if s.room.Flags.UseLimitedWaves {
		s.length = len(s.waveCodes)
	} else {
		s.length = s.room.Flags.WaveCap
	}
	s.waves = s.generateWaves()
	s.waveId = -1
	s.gameActive = false
	s.timer = 0
	s.remainingEnemies = 0
	s.sanctuaryTier = 1
	s.sanctuaries = nil
	s.leftSanctuaries = 0
	s.lockdown = false
}

// generateWaves is siege.js:143-160.
func (s *Siege) generateWaves() [][]string {
	rng := s.room.Rand
	waves := make([][]string, 0, s.length)
	for i := 0; i < s.length; i++ {
		var wave []string
		points := calculateSiegePoints(i)
		choices := siegeBossChoices
		for points > 0 && len(choices) > 0 {
			filtered := make([]siegeBossChoice, 0, len(choices))
			for _, c := range choices {
				if c.Cost <= points {
					filtered = append(filtered, c)
				}
			}
			choices = filtered
			if len(choices) == 0 {
				break
			}
			pick := rng.Choose(choices)
			points -= pick.Cost
			wave = append(wave, pick.Name)
		}
		if s.room.Flags.UseLimitedWaves {
			if i < len(s.waveCodes) {
				wave = s.waveCodes[i]
			} else {
				wave = nil
			}
		}
		waves = append(waves, wave)
	}
	return waves
}

// siegeSanctuarySizeDivisor returns the divisor for sanctuary size, defaulting to 13.5 if not set.
func siegeSanctuarySizeDivisor(flags *GamemodeFlags) float64 {
	if flags.HasSanctuarySize {
		return float64(flags.SanctuarySize)
	}
	return 13.5
}

// defineSanctuary is siege.js:214-224.
func defineSanctuary(ctx *TileContext, id entity.EntityID, team int32, defType string, customName string) error {
	if err := defineNamed(ctx, id, defType); err != nil {
		return err
	}
	e := ctx.World.Get(id)
	if e == nil {
		return nil
	}
	color := GetTeamColor(team, false)
	name := GetTeamName(team)
	if customName != "" {
		if customName == "DESTROYED" {
			color = "grey"
		}
		name = customName
	}
	e.Color.SetBase(color)
	e.Skill.Score = 111069
	e.Name = name + " Sanctuary"
	e.SIZE = ctx.Geometry.TileWidth / siegeSanctuarySizeDivisor(ctx.Flags)
	ctx.Extras.GetOrCreate(id).IsDominator = true
	e.DisplayName = true
	e.NameColor = "#ffffff"
	e.DangerValue = 11
	return nil
}

// spawnSanctuary is siege.js:162-212.
func (s *Siege) spawnSanctuary(ctx *TileContext, tile *TileInstance, team int32, defType string, addToList bool) error {
	if defType == "" {
		defType = "sanctuaryTier3"
	}
	id, err := spawnAt(ctx, tile.Loc(ctx.Geometry))
	if err != nil {
		return err
	}
	if e := ctx.World.Get(id); e != nil {
		e.Team = team
	}
	customName := ""
	if team == TeamEnemies {
		customName = "DESTROYED"
	}
	if err := defineSanctuary(ctx, id, team, defType, customName); err != nil {
		return err
	}
	finishSpawn(ctx, id)
	s.sanctuaries = append(s.sanctuaries, siegeSanctuarySlot{id: id, tile: tile, forTierUpgrade: addToList})
	return nil
}

func (s *Siege) onSanctuaryDead(ctx *TileContext, slot siegeSanctuarySlot, wasEnemyOwned bool) error {
	if err := s.reactToSanctuaryDeath(ctx, slot, wasEnemyOwned); err != nil {
		return err
	}
	if ctx.Comms != nil {
		ctx.Comms.BroadcastRoom()
	}
	return nil
}

// reactToSanctuaryDeath is siege.js:168-211.
func (s *Siege) reactToSanctuaryDeath(ctx *TileContext, slot siegeSanctuarySlot, wasEnemyOwned bool) error {
	if wasEnemyOwned {
		ctx.Pools.Register(TeamSpawnKey(TeamBlue), slot.tile)
		if err := s.spawnSanctuary(ctx, slot.tile, TeamBlue, "sanctuaryTier"+strconv.Itoa(s.sanctuaryTier), true); err != nil {
			return err
		}
		slot.tile.Color = "blue"
		if s.leftSanctuaries == 0 && ctx.Comms != nil {
			ctx.Comms.Broadcast("You can now respawn.")
		}
		s.leftSanctuaries++
		if ctx.Comms != nil {
			ctx.Comms.Broadcast("A sanctuary has been restored!")
		}
		return nil
	}

	if s.gameActive {
		ctx.Pools.Unregister(TeamSpawnKey(TeamBlue), slot.tile)
	}
	if err := s.spawnSanctuary(ctx, slot.tile, TeamEnemies, "dominator", false); err != nil {
		return err
	}
	slot.tile.Color = "yellow"
	s.leftSanctuaries--
	if ctx.Comms != nil {
		ctx.Comms.Broadcast("A sanctuary has been destroyed!")
	}
	if s.leftSanctuaries == 0 {
		s.room.CannotRespawn = true
		s.lockdown = true
		s.lockdownRemaining = 61
		s.nextLockdownAt = s.room.World.Now() + 1000
		if ctx.Comms != nil {
			ctx.Comms.Broadcast("All of the sanctuaries are destroyed. You cannot respawn.")
		}
	}
	return nil
}

func lockdownBroadcasts(remaining int) bool {
	if remaining%10 == 0 {
		return true
	}
	switch remaining {
	case 5, 3, 2, 1:
		return true
	}
	return false
}

func (s *Siege) pollLockdown() {
	if !s.lockdown {
		return
	}
	if s.leftSanctuaries != 0 {
		s.room.CannotRespawn = false
		s.lockdown = false
		return
	}
	now := s.room.World.Now()
	if now < s.nextLockdownAt {
		return
	}
	s.nextLockdownAt += 1000
	s.lockdownRemaining--
	if s.lockdownRemaining == 0 {
		s.playerLose()
		s.lockdown = false
		return
	}
	if lockdownBroadcasts(s.lockdownRemaining) && s.room.Comms != nil {
		unit := "Seconds"
		if s.lockdownRemaining == 1 {
			unit = "Second"
		}
		s.room.Comms.Broadcast("Your team will lose in " + strconv.Itoa(s.lockdownRemaining) + " " + unit + ".")
	}
}

// playerWin is siege.js:226.
func (s *Siege) playerWin() {
	if !s.gameActive {
		return
	}
	s.gameActive = false
	if s.room.Comms != nil {
		s.room.Comms.Broadcast("Your team has won the game!")
	}
}

// bossWin is siege.js:233.
func (s *Siege) bossWin() {
	if s.room.Comms != nil {
		s.room.Comms.Broadcast("Team boss has won the game!")
	}
}

// playerLose is siege.js:238.
func (s *Siege) playerLose() {
	if !s.gameActive {
		return
	}
	s.gameActive = false
	if s.room.Comms != nil {
		s.room.Comms.Broadcast("Your team has lost the game.")
	}
	s.bossWin()
}

// spawnEnemyWrapper is siege.js:245-265.
func (s *Siege) spawnEnemyWrapper(ctx *TileContext, loc vmath.Vec2, defType string) (entity.EntityID, error) {
	id, err := spawnAt(ctx, loc)
	if err != nil {
		return entity.EntityID{}, err
	}
	if err := defineNamed(ctx, id, defType); err != nil {
		return id, err
	}
	if e := ctx.World.Get(id); e != nil {
		e.Team = TeamEnemies
		e.FOV = 30
	}
	ctx.Extras.GetOrCreate(id).IsBoss = true
	if (ctx.Flags.Fortress || ctx.Flags.Citadel) && ctx.Attach != nil {
		if err := ctx.Attach.AttachControllers(ctx.World, id, defs.Controller{Name: "siegeAI"}); err != nil {
			return id, err
		}
	}
	finishSpawn(ctx, id)
	s.remainingEnemies++
	s.enemies = append(s.enemies, siegeEnemySlot{id: id})
	return id, nil
}

// randomBossSpawnTile is siege.js pattern for boss spawn location.
func (s *Siege) randomBossSpawnTile(ctx *TileContext) vmath.Vec2 {
	pool := ctx.Pools.ByKey[SpawnPoolBossSpawnTile]
	tile := ctx.Rand.Choose(pool)
	return tile.RandomInside(ctx.Rand, ctx.Geometry)
}

// spawnWave is siege.js:267-299.
func (s *Siege) spawnWave(ctx *TileContext, waveID int) error {
	if ctx.Comms != nil {
		ctx.Comms.Broadcast("Wave " + strconv.Itoa(waveID+1) + " has started!")
	}
	for _, boss := range s.waves[waveID] {
		spot := s.randomBossSpawnTile(ctx)
		id, err := s.spawnEnemyWrapper(ctx, spot, boss)
		if err != nil {
			return err
		}
		if e := ctx.World.Get(id); e != nil {
			e.DangerValue = 25 + e.SIZE/5
		}
	}

	if !ctx.Flags.UseLimitedWaves {
		for i := 0; i < waveID/5; i++ {
			if _, err := s.spawnEnemyWrapper(ctx, s.randomBossSpawnTile(ctx), ctx.Rand.Choose(siegeSentinelChoices)); err != nil {
				return err
			}
		}
		for i := 0; i < waveID/2; i++ {
			if _, err := s.spawnEnemyWrapper(ctx, s.randomBossSpawnTile(ctx), ctx.Rand.Choose(siegeSmallFodderChoices)); err != nil {
				return err
			}
		}
	}

	newTier := (waveID/5 + 1)
	if newTier > 6 {
		newTier = 6
	}
	if newTier != s.sanctuaryTier {
		for _, slot := range s.sanctuaries {
			if !slot.forTierUpgrade {
				continue
			}
			if err := defineSanctuary(ctx, slot.id, TeamBlue, "sanctuaryTier"+strconv.Itoa(newTier), ""); err != nil {
				return err
			}
		}
		if ctx.Comms != nil {
			ctx.Comms.Broadcast("The sanctuaries have been upgraded to Tier " + strconv.Itoa(newTier))
		}
		s.sanctuaryTier = newTier
	}
	return nil
}

// Start is siege.js:301-334.
func (s *Siege) Start(mazeType int) error {
	s.gameActive = true
	ctx := s.room.tileContext()
	for _, tile := range ctx.Pools.ByKey[TeamSpawnKey(TeamBlue)] {
		tile.Color = tile.Type.BaseColor
		s.leftSanctuaries++
		if err := s.spawnSanctuary(ctx, tile, TeamBlue, "sanctuaryTier1", true); err != nil {
			return err
		}
	}
	if mazeType != 0 {
		if err := spawnMazeWalls(s.room, mazeType, "wall"); err != nil {
			return err
		}
	}
	return nil
}

func (s *Siege) pollEnemies(ctx *TileContext) {
	live := s.enemies[:0]
	for _, slot := range s.enemies {
		e := ctx.World.Get(slot.id)
		if e != nil && !e.IsDead() {
			live = append(live, slot)
			continue
		}
		if !s.gameActive {
			continue
		}
		s.remainingEnemies--
		if s.remainingEnemies <= 0 {
			s.remainingEnemies = 0
			if ctx.Comms != nil {
				ctx.Comms.Broadcast("Wave " + strconv.Itoa(s.waveId+1) + " has been defeated!")
				ctx.Comms.Broadcast("The next wave will start shortly.")
			}
		}
	}
	s.enemies = live
}

func (s *Siege) pollSanctuaries(ctx *TileContext) error {
	toCheck := s.sanctuaries
	s.sanctuaries = nil
	for _, slot := range toCheck {
		e := ctx.World.Get(slot.id)
		if e != nil && !e.IsDead() {
			s.sanctuaries = append(s.sanctuaries, slot)
			continue
		}
		wasEnemyOwned := e != nil && e.Team == TeamEnemies
		if err := s.onSanctuaryDead(ctx, slot, wasEnemyOwned); err != nil {
			return err
		}
	}
	return nil
}

// Loop is siege.js:346-366.
func (s *Siege) Loop() error {
	ctx := s.room.tileContext()
	if err := s.pollSanctuaries(ctx); err != nil {
		return err
	}
	s.pollEnemies(ctx)
	s.pollLockdown()

	if s.room.ArenaClosed {
		s.gameActive = false
	}
	if !s.gameActive {
		return nil
	}
	if s.timer <= 0 {
		s.timer = 3
		s.waveId++
		if s.waveId < len(s.waves) {
			if err := s.spawnWave(ctx, s.waveId); err != nil {
				return err
			}
		} else {
			s.playerWin()
		}
	} else if s.remainingEnemies == 0 {
		s.timer--
	}
	return nil
}

// Reset is siege.js:336-338.
func (s *Siege) Reset() {
	s.defineProperties()
	s.enemies = nil
}
