package guns

import (
	"fmt"
	"math"

	"arrasgo/internal/defs"
	"arrasgo/internal/entity"
)

func applyBulletFields(d Deps, e *entity.Entity, id entity.EntityID, def *defs.Definition, noEntityLimit bool) error {
	if len(def.Parent) != 0 {
		return fmt.Errorf("guns: applyBulletFields given a definition with PARENT set; both real call sites must be pre-flattened")
	}

	if v, ok := def.Layer.Get(); ok {
		e.LayerID = int32(v)
	}
	if v, ok := def.Index.Get(); ok {
		e.Index = numToString(v)
	}
	if v, ok := def.Name.Get(); ok {
		e.Name = v
	}
	if v, ok := def.Label.Get(); ok {
		e.Label = v
	}
	if v, ok := def.Angle.Get(); ok {
		e.Angle = v
	}
	if v, ok := def.DisplayName.Get(); ok {
		e.DisplayName = v
	}
	if v, ok := def.Type.Get(); ok {
		e.Type = typeFieldString(v)
	}
	if v, ok := def.WallType.Get(); ok {
		e.Walltype = int32(v)
	}
	if v, ok := def.Shape.Get(); ok {
		if v.IsNumber {
			e.Shape = v.Num
		} else {
			e.Shape = def.ShapeNum.Or(0)
		}
		e.ShapeData = shapeSpecToEntity(v)
	}
	// COLOR is handled separately in fire.go's applyBulletColor.
	if g, ok := def.Glow.Get(); ok {
		glowColor := entity.NewColorUndefined(false)
		applyColorSpec(&glowColor, g.Color)
		e.Glow = entity.Glow{
			Radius:    g.Radius.Or(0),
			HasRadius: true,
			Color:     glowColor.Compiled,
			Alpha:     g.Alpha.Or(1),
			Recursion: g.Recursion.Or(1),
		}
	}
	// Controllers must run in this field order to read live state.
	if v, ok := def.Controllers.Get(); ok && d.AttachControllers != nil {
		if err := d.AttachControllers(d.World, id, v); err != nil {
			return err
		}
		// Refetch e after constructor calls since they can spawn entities.
		if e = d.World.Get(id); e == nil {
			return nil
		}
	}
	if v, ok := def.IgnoredByAI.Get(); ok {
		e.IgnoredByAI = v
	}
	if v, ok := def.MotionType.Get(); ok {
		e.MotionType = v.Name
		e.MotionTypeArgs = motionArgsFrom(v.Args)
	}
	if v, ok := def.FacingType.Get(); ok {
		e.FacingType = v.Name
		e.FacingTypeArgs = facingArgsFrom(v.Args)
	}
	if v, ok := def.NoCollisions.Get(); ok && v {
		e.Settings.NoCollisions = true
		d.World.Flag[id.Index] |= entity.FlagNoCollisions
	}
	setOptBool(&e.Settings.DrawHealth, def.DrawHealth)
	setOptBool(&e.Settings.DrawShape, def.DrawSelf)
	setOptBool(&e.Settings.DamageEffects, def.DamageEffects)
	setOptBool(&e.Settings.RatioEffects, def.RatioEffects) // real data sets RATEFFECTS, a different key. See docs/found-bugs.md.
	setOptBool(&e.Settings.MotionEffects, def.MotionEffects)
	setOptBool(&e.Settings.AcceptsScore, def.AcceptsScore)
	setOptBool(&e.Settings.GivesKillMessage, def.GiveKillMessage)
	setOptBool(&e.Settings.CanGoOutsideRoom, def.CanGoOutsideRoom)
	setOptString(&e.Settings.HitsOwnType, def.HitsOwnType)
	setOptBool(&e.Settings.DiesAtLowSpeed, def.DieAtLowSpeed)
	setOptBool(&e.Settings.DiesAtRange, def.DieAtRange)
	setOptBool(&e.Settings.Independent, def.Independent)
	setOptBool(&e.Settings.PersistsAfterDeath, def.PersistsAfterDeath)
	setOptBool(&e.Settings.ClearOnMasterUpgrade, def.ClearOnMasterUpgrade)
	setOptBool(&e.Settings.HealthWithLevel, def.HealthWithLevel)
	setOptBool(&e.Settings.Obstacle, def.Obstacle)
	if noEntityLimit {
		setOptBool(&e.Settings.FullyInvisible, def.FullInvisible)
		setOptBool(&e.Settings.CanSeeInvisible, def.CanSeeInvisible)
	}
	setOptBool(&e.Settings.HasNoRecoil, def.HasNoRecoil)
	setOptBool(&e.Settings.AttentionCraver, def.CravesAttention)
	if noEntityLimit {
		if v, ok := def.KillMessage.Get(); ok {
			if v == "" {
				v = "Killed"
			}
			e.Settings.KillMessage = v
		}
		if v, ok := def.AutospinMultiplier.Get(); ok {
			e.AutospinBoost = v
		}
		if v, ok := def.BroadcastMessage.Get(); ok {
			e.Settings.BroadcastMessage = v
		}
		if def.DefeatMessage.Or(false) {
			e.Settings.DefeatMessage = true
		}
	}
	if v, ok := def.Healer.Get(); ok && v {
		e.Healer = true
	}
	if v, ok := def.DamageClass.Get(); ok {
		e.Settings.DamageClass = int32(v)
	}
	setOptBool(&e.Settings.BuffVsFood, def.BuffVsFood)
	if noEntityLimit {
		setOptBool(&e.Settings.Leaderboardable, def.CanBeOnLeaderboard)
		setOptBool(&e.Settings.RenderOnLeaderboard, def.RenderOnLeaderboard)
		if _, ok := def.RenderOnLeaderboard.Get(); ok {
			e.Settings.HasRenderOnLeaderboard = true
		}
	}
	if v, ok := def.Intangible.Get(); ok {
		if v {
			e.Intangibility = 1
		} else {
			e.Intangibility = 0
		}
	}
	setOptBool(&e.Settings.ReloadToAcceleration, def.IsSmasher)
	if noEntityLimit {
		if v, ok := def.StatNames.Get(); ok {
			e.Settings.SkillNames = statNamesOf(v)
			e.Settings.HasSkillNames = true
		}
	}
	if v, ok := def.AI.Get(); ok {
		e.AISettings = aiSettingsFrom(v)
	}
	if v, ok := def.Invisible.Get(); ok {
		e.Invisible = pairOf(v)
	}
	if v, ok := def.Alpha.Get(); ok {
		if v.IsRange {
			e.Alpha = arrAt(v.Range, 1)
			e.AlphaRange = [2]float64{arrOr(v.Range, 0, 0), arrOr(v.Range, 1, 1)}
		} else {
			e.Alpha = v.Num
			e.AlphaRange = [2]float64{0, 1}
		}
	}
	if v, ok := def.Danger.Get(); ok {
		e.DangerValue = v
	}
	if v, ok := def.ShootOnDeath.Get(); ok {
		e.ShootOnDeath = v
	}
	if v, ok := def.Borderless.Get(); ok {
		e.Borderless = v
	}
	if v, ok := def.DrawFill.Get(); ok {
		e.DrawFill = v
	}
	if noEntityLimit {
		if def.IsImmuneToTiles.Or(false) {
			e.ImmuneToTiles = true // truthy-gated: an explicit false never clears
		}
	}
	if v, ok := def.Team.Get(); ok {
		e.Team = int32(v)
	}
	if v, ok := def.VariesInSize.Get(); ok {
		e.Settings.VariesInSize = v
		if v {
			e.Squiggle = d.Rand.RandomRange(0.8, 1.2)
		} else {
			e.Squiggle = 1
		}
	}
	if v, ok := def.ArenaCloser.Get(); ok {
		e.IsArenaCloser, e.AC = v, v
	}
	if noEntityLimit {
		setOptString(&e.BranchLabel, def.BranchLabel)
		setOptBool(&e.BatchUpgrades, def.BatchUpgrades)
	}
	if v, ok := def.Size.Get(); ok {
		e.SIZE = v * e.Squiggle
		if e.CoreSize == 0 {
			e.CoreSize = e.SIZE
		}
	}
	if noEntityLimit {
		setOptBool(&e.Settings.NoSizeAnimation, def.NoSizeAnimation)
	}
	if v, ok := def.Level.Get(); ok && d.Tuning != nil {
		e.Skill.Reset(d.Tuning, true)
		for float64(e.Skill.Level) < v {
			e.Skill.Score += e.Skill.LevelScore()
			e.Skill.Maintain(d.Tuning)
		}
		refreshBulletBodyAttributes(d, e)
	}
	if noEntityLimit {
		if v, ok := def.LevelCap.Get(); ok {
			e.LevelCap, e.HasLevelCap = int32(v), true
		}
	}
	if v, ok := def.SkillCap.Get(); ok && d.Tuning != nil {
		caps, err := skillSlotsOf(v, 9)
		if err != nil {
			return err
		}
		var raw [entity.SkillCount]int32
		for i, f := range caps {
			raw[i] = int32(f)
		}
		e.Skill.SetCaps(d.Tuning, raw)
	}
	if v, ok := def.Skill.Get(); ok && d.Tuning != nil {
		raw, err := skillSlotsOf(v, 0)
		if err != nil {
			return err
		}
		var out [entity.SkillCount]int32
		for i, f := range raw {
			out[i] = int32(f)
		}
		e.Skill.Set(d.Tuning, out)
	}
	if v, ok := def.Value.Get(); ok {
		want := v * e.Squiggle
		if want > e.Skill.Score {
			e.Skill.Score = want
		}
	}
	if v, ok := def.Guns.Get(); ok {
		if err := respawnGuns(d, e, id, v); err != nil {
			return err
		}
	}
	if noEntityLimit {
		if def.ConnectChildrenOnCamera.Or(false) {
			e.Settings.ConnectChildrenOnCamera = true
		}
		if v, ok := def.MaxChildren.Get(); ok {
			e.MaxChildren = int32(v)
		}
		if v, ok := def.MaxBullets.Get(); ok {
			e.MaxBullets, e.HasMaxBullets = int32(v), true
		}
		if v, ok := def.RerootUpgradeTree.Get(); ok && rerootTruthy(v) {
			if v.IsList {
				e.RerootUpgradeTree = joinRoots(v.List)
			} else {
				e.RerootUpgradeTree = v.Str
			}
		}
		setOptBool(&e.AllowedOnMinimap, def.OnMinimap)
		if v, ok := def.Turrets.Get(); ok {
			if err := SpawnTurrets(d, id, v); err != nil {
				return err
			}
			// Refetch e after SpawnTurrets since it can spawn entities.
			e = d.World.Get(id)
			if e == nil {
				return fmt.Errorf("guns: applyBulletFields' own entity died while spawning its TURRETS")
			}
		}
	}
	if v, ok := def.Necro.Get(); ok {
		e.Settings.NecroTypes = necroTypesOf(v, e.Shape)
		e.Settings.NecroDefineGuns = necroDefineGunsOf(d, e, e.Settings.NecroTypes)
	}
	if v, ok := def.ExtraSkill.Get(); ok {
		e.Skill.Points += int32(v)
	}
	if v, ok := def.Body.Get(); ok {
		applyBodySpec(e, v)
		refreshBulletBodyAttributes(d, e)
	}
	return nil
}

func applyBulletBodySkill(d Deps, e *entity.Entity, stats InterpretedStats, skillRaw [entity.SkillCount]int32) {
	e.SPEED = stats.Speed
	e.HEALTH = stats.Health
	e.RESIST = stats.Resist
	e.DAMAGE = stats.Damage
	e.PENETRATION = stats.Penetration
	e.RANGE = stats.Range
	e.DENSITY = stats.Density
	e.PUSHABILITY = stats.Pushability
	e.HeteroMultiplier = stats.Hetero
	if d.Tuning != nil {
		e.Skill.Set(d.Tuning, skillRaw)
	}
	refreshBulletBodyAttributes(d, e)
}

func refreshBulletBodyAttributes(d Deps, e *entity.Entity) {
	level := 0.0
	if d.Tuning != nil {
		level = float64(e.Level(d.Tuning))
	}

	base := e.CoreSize
	if base == 0 {
		base = e.SIZE
	}
	size := base * e.SizeMultiplier * (1 + level/45)
	speedReduce := size / base

	runSpeed := 1.0
	if d.Tuning != nil {
		runSpeed = d.Tuning.RunSpeed
	}
	e.Acceleration = (runSpeed * e.ACCELERATION) / speedReduce
	if e.Settings.ReloadToAcceleration {
		e.Acceleration *= e.Skill.Acl
	}
	e.TopSpeed = (runSpeed * e.SPEED * e.Skill.Mob) / speedReduce
	if e.Settings.ReloadToAcceleration {
		e.TopSpeed /= math.Sqrt(e.Skill.Acl)
	}
	levelBonus := 0.0
	if e.Settings.HealthWithLevel {
		levelBonus = 2 * level
	}
	e.Health.Set((levelBonus+e.HEALTH)*e.Skill.Hlt, 0)
	e.Health.Resist = 1 - 1/math.Max(1, e.RESIST+e.Skill.Brst)
	shieldLevelBonus := 0.0
	regenLevelBonus := 1.0
	if e.Settings.HealthWithLevel {
		shieldLevelBonus = 0.6 * level
		regenLevelBonus = 0.006*level + 1
	}
	e.Shield.Set((shieldLevelBonus+e.SHIELD)*e.Skill.Shi, math.Max(0, regenLevelBonus*e.REGEN*e.Skill.Rgn))
	e.Damage = e.DAMAGE * e.Skill.Atk
	e.Penetration = e.PENETRATION + 1.5*(e.Skill.Brst+0.8*(e.Skill.Atk-1))
	if e.Settings.DiesAtRange || e.Range == 0 {
		e.Range = e.RANGE
	}
	e.Density = (1 + 0.08*level) * e.DENSITY
	e.Stealth = e.STEALTH
	e.Pushability = e.PUSHABILITY
	e.Knockback = e.KNOCKBACK
	e.SizeMultiplier = 1
	e.RecoilMultiplier = e.RECOIL_MULTIPLIER
}
