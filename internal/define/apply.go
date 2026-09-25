package define

import (
	"fmt"

	"arrasgo/internal/defs"
	"arrasgo/internal/entity"
	"arrasgo/internal/guns"
)

const levelLadderLimit = 100000

func (d *Definer) apply(w *entity.World, id entity.EntityID, res *defs.Resolved, seed seeded) error {
	e := w.Get(id)
	if e == nil {
		return fmt.Errorf("define: %s applied to a dead entity handle", res.Name)
	}

	e.Props = e.Props[:0]

	setInt32(&e.LayerID, res.LayerID)
	setString(&e.Index, res.Index)
	setString(&e.Name, res.EntityName)
	setString(&e.Label, res.Label)
	setFloat(&e.Angle, res.Angle)
	setBool(&e.DisplayName, res.DisplayName)
	if v, ok := res.Type.Get(); ok {
		e.Type = typeString(v)
	}
	setInt32(&e.Walltype, res.WallType)

	if v, ok := res.Shape.Get(); ok {
		e.Shape = v
	}
	if v, ok := res.ShapeData.Get(); ok {
		e.ShapeData = shapeDataOf(v)
	}

	if res.Color.Touched {
		copyColor(&e.Color, res.Color)
	}
	setString(&e.UpgradeColor, res.UpgradeColor)
	if g, ok := res.Glow.Get(); ok {
		radius, hasRadius := g.Radius.Get()
		e.Glow = entity.Glow{
			Radius:    radius,
			HasRadius: hasRadius,
			Color:     g.Color.Compiled(),
			Alpha:     g.Alpha,
			Recursion: g.Recursion,
		}
	}

	if err := d.applyHeadSteps(w, id, res.Steps); err != nil {
		return err
	}
	e = w.Get(id)

	setBool(&e.IgnoredByAI, res.IgnoredByAI)
	if v, ok := res.MotionType.Get(); ok {
		e.MotionType = v.Name
		e.MotionTypeArgs = motionArgsOf(v.Args)
	}
	if v, ok := res.FacingType.Get(); ok {
		e.FacingType = v.Name
		e.FacingTypeArgs = facingArgsOf(v.Args)
	}

	applySettings(e, res)

	setFloat(&e.AutospinBoost, res.AutospinBoost)
	if v, ok := res.Healer.Get(); ok {
		e.Healer = v
	}
	if v, ok := res.Intangibility.Get(); ok {
		e.Intangibility = boolToFloat(v)
	}

	if v, ok := res.AISettings.Get(); ok {
		e.AISettings = aiSettingsOf(v)
	}
	if seed.invisible {
		e.Invisible = res.Invisible
	}
	if seed.alpha {
		e.Alpha = res.Alpha
		e.AlphaRange = res.AlphaRange
	}

	setFloat(&e.DangerValue, res.DangerValue)
	setBool(&e.ShootOnDeath, res.ShootOnDeath)
	setBool(&e.Borderless, res.Borderless)
	setBool(&e.DrawFill, res.DrawFill)
	if v, ok := res.ImmuneToTiles.Get(); ok {
		e.ImmuneToTiles = v
	}
	setInt32(&e.Team, res.Team)

	if v, ok := res.Settings.VariesInSize.Get(); ok {
		e.Settings.VariesInSize = v
	}
	if seed.resetUpgradeMenu {
		e.Upgrades = e.Upgrades[:0]
	}
	if v, ok := res.IsArenaCloser.Get(); ok {
		e.IsArenaCloser, e.AC = v, v
	}
	setString(&e.BranchLabel, res.BranchLabel)
	setBool(&e.BatchUpgrades, res.BatchUpgrades)
	d.applyUpgrades(e, res)

	setBool(&e.Settings.NoSizeAnimation, res.Settings.NoSizeAnimation)

	if v, ok := res.Level.Get(); ok {
		if err := d.applyLevel(w, id, v); err != nil {
			return err
		}
		e = w.Get(id)
	}
	if v, ok := res.LevelCap.Get(); ok {
		e.LevelCap, e.HasLevelCap = int32(v), true
	}
	if v, ok := res.SkillCaps.Get(); ok {
		e.Skill.SetCaps(d.cfg.Tuning, skillSlotsOf(v))
	}
	if v, ok := res.Skills.Get(); ok {
		e.Skill.Set(d.cfg.Tuning, skillSlotsOf(v))
	}
	d.applyScoreSteps(w, id, res.Steps)
	e = w.Get(id)

	if err := d.applyBuildSteps(w, id, res, false); err != nil {
		return err
	}
	e = w.Get(id)

	setBool(&e.Settings.ConnectChildrenOnCamera, res.Settings.ConnectChildrenOnCamera)
	setInt32(&e.MaxChildren, res.MaxChildren)
	if v, ok := res.MaxBullets.Get(); ok {
		e.MaxBullets, e.HasMaxBullets = int32(v), true
	}
	if f, ok := res.LevelSkillPoints.Get(); ok {
		d.unported[funcKey(f)]++
	}
	if res.RecalcSkill.Or(false) {
		d.recalcSkill(&e.Skill)
	}
	if res.ExtraSkill != 0 {
		e.Skill.Points += int32(res.ExtraSkill)
	}

	if applyBody(e, res.Body) {
		d.RefreshBodyAttributes(w, id)
		e = w.Get(id)
	}

	for _, hook := range res.Events {
		if f, ok := hook.Handler.Get(); ok {
			d.unported[funcKey(f)]++
		}
	}

	setString(&e.RerootUpgradeTree, res.RerootUpgradeTree)
	setBool(&e.AllowedOnMinimap, res.AllowedOnMinimap)

	if err := d.applyBuildSteps(w, id, res, true); err != nil {
		return err
	}
	e = w.Get(id)

	if v, ok := res.Settings.ShakeProperties.Get(); ok && d.cfg.HasSocket != nil && d.cfg.HasSocket(id) {
		e.Settings.ShakeProperties = shakeInfoOf(v)
	}

	if v, ok := res.Settings.NecroTypes.Get(); ok {
		e.Settings.NecroTypes = necroTypesOf(v)
		e.Settings.NecroDefineGuns = d.necroDefineGuns(e)
	}

	e.SyncWithTank = res.SyncWithTank

	if def, ok := d.cfg.Defs.Get(res.Name); ok {
		if idx, ok := def.Index.Get(); ok {
			e.Defs = append(e.Defs[:0], int32(idx))
		}
	}

	e.HasCameraOverride = false
	e.CameraOverrideX, e.CameraOverrideY = 0, 0

	if d.cfg.SetTargetable != nil {
		d.cfg.SetTargetable(id, Targetable(e))
	}
	return nil
}

func applySettings(e *entity.Entity, res *defs.Resolved) {
	s := &res.Settings
	if v, ok := s.NoCollisions.Get(); ok {
		e.Settings.NoCollisions = v
	}
	setBool(&e.Settings.DrawHealth, s.DrawHealth)
	setBool(&e.Settings.DrawShape, s.DrawShape)
	setBool(&e.Settings.DamageEffects, s.DamageEffects)
	setBool(&e.Settings.RatioEffects, s.RatioEffects)
	setBool(&e.Settings.MotionEffects, s.MotionEffects)
	setBool(&e.Settings.AcceptsScore, s.AcceptsScore)
	setBool(&e.Settings.GivesKillMessage, s.GivesKillMessage)
	setBool(&e.Settings.CanGoOutsideRoom, s.CanGoOutsideRoom)
	setString(&e.Settings.HitsOwnType, s.HitsOwnType)
	setBool(&e.Settings.DiesAtLowSpeed, s.DiesAtLowSpeed)
	setBool(&e.Settings.DiesAtRange, s.DiesAtRange)
	setBool(&e.Settings.Independent, s.Independent)
	setBool(&e.Settings.PersistsAfterDeath, s.PersistsAfterDeath)
	setBool(&e.Settings.ClearOnMasterUpgrade, s.ClearOnMasterUpgrade)
	setBool(&e.Settings.HealthWithLevel, s.HealthWithLevel)
	setBool(&e.Settings.Obstacle, s.Obstacle)
	setBool(&e.Settings.FullyInvisible, s.FullyInvisible)
	setBool(&e.Settings.CanSeeInvisible, s.CanSeeInvisible)
	setBool(&e.Settings.HasNoRecoil, s.HasNoRecoil)
	setBool(&e.Settings.AttentionCraver, s.AttentionCraver)
	setString(&e.Settings.KillMessage, s.KillMessage)
	setString(&e.Settings.BroadcastMessage, s.BroadcastMessage)
	setBool(&e.Settings.DefeatMessage, s.DefeatMessage)
	setInt32(&e.Settings.DamageClass, s.DamageClass)
	setBool(&e.Settings.BuffVsFood, s.BuffVsFood)
	setBool(&e.Settings.Leaderboardable, s.Leaderboardable)
	setBool(&e.Settings.RenderOnLeaderboard, s.RenderOnLeaderboard)
	if _, ok := s.RenderOnLeaderboard.Get(); ok {
		e.Settings.HasRenderOnLeaderboard = true
	}
	setBool(&e.Settings.ReloadToAcceleration, s.ReloadToAcceleration)
	if v, ok := s.SkillNames.Get(); ok {
		e.Settings.SkillNames = statNamesOf(v)
		e.Settings.HasSkillNames = true
	}
}

func applyBody(e *entity.Entity, b defs.BodyStats) bool {
	touched := false
	assign := func(dst *float64, src defs.Opt[float64]) {
		if v, ok := src.Get(); ok {
			*dst = v
			touched = true
		}
	}
	assign(&e.ACCELERATION, b.Acceleration)
	assign(&e.SPEED, b.Speed)
	assign(&e.HEALTH, b.Health)
	assign(&e.RESIST, b.Resist)
	assign(&e.SHIELD, b.Shield)
	assign(&e.REGEN, b.Regen)
	assign(&e.DAMAGE, b.Damage)
	assign(&e.PENETRATION, b.Penetration)
	assign(&e.RANGE, b.Range)
	assign(&e.FOV, b.FOV)
	assign(&e.SHOCK_ABSORB, b.ShockAbsorb)
	assign(&e.RECOIL_MULTIPLIER, b.RecoilMultiplier)
	assign(&e.DENSITY, b.Density)
	assign(&e.STEALTH, b.Stealth)
	assign(&e.PUSHABILITY, b.Pushability)
	assign(&e.KNOCKBACK, b.Knockback)
	assign(&e.HeteroMultiplier, b.Hetero)
	return touched
}

func (d *Definer) applyUpgrades(e *entity.Entity, res *defs.Resolved) {
	for _, u := range res.Upgrades {
		row := entity.Upgrade{
			Level:       int32(d.cfg.Tuning.TierMultiplier * u.Tier),
			Index:       u.Index,
			Tier:        int32(u.Tier),
			Branch:      int32(u.Branch),
			BranchLabel: u.BranchLabel.Or(""),
			// entity.js:334's `!= null`, unset and empty are different things
			// downstream. See entity.Upgrade.
			HasBranchLabel: u.BranchLabel.IsSet(),
			RedefineAll:    u.RedefineAll,
		}
		for _, ref := range u.Classes {
			row.Class = append(row.Class, d.ordinalOf(ref))
		}
		e.Upgrades = append(e.Upgrades, row)
	}
}

func (d *Definer) ordinalOf(ref defs.TypeRef) int32 {
	var def *defs.Definition
	if ref.Inline != nil {
		def = ref.Inline
	} else if found, ok := d.cfg.Defs.Get(ref.Name); ok {
		def = found
	}
	if def == nil {
		return -1
	}
	if v, ok := def.Index.Get(); ok {
		return int32(v)
	}
	return -1
}

func (d *Definer) applyLevel(w *entity.World, id entity.EntityID, level float64) error {
	e := w.Get(id)
	if e == nil {
		return fmt.Errorf("define: applyLevel on a dead entity handle")
	}
	e.Skill.Reset(d.cfg.Tuning, true)
	for i := 0; float64(e.Skill.Level) < level; i++ {
		if i >= levelLadderLimit {
			return fmt.Errorf("define: LEVEL %v did not converge after %d steps", level, levelLadderLimit)
		}
		e.Skill.Score += e.Skill.LevelScore()
		e.Skill.Maintain(d.cfg.Tuning)
	}
	d.RefreshBodyAttributes(w, id)
	return nil
}

func (d *Definer) recalcSkill(s *entity.Skill) {
	score := s.Score
	s.Reset(d.cfg.Tuning, true)
	s.Score = score
	for s.Maintain(d.cfg.Tuning) {
	}
}

func (d *Definer) applyBuildSteps(w *entity.World, id entity.EntityID, res *defs.Resolved, tail bool) error {
	deferred := -1
	if n := len(res.Steps); n > 0 {
		switch res.Steps[n-1].Kind {
		case defs.StepTurrets, defs.StepAppendTurrets:
			deferred = n - 1
		}
	}
	for i, step := range res.Steps {
		if (i == deferred) != tail {
			continue
		}
		var err error
		switch step.Kind {
		case defs.StepGuns:
			err = d.installGuns(w, id, res.Name, step.Guns, true)
		case defs.StepAppendGuns:
			err = d.installGuns(w, id, res.Name, step.Guns, false)
		case defs.StepTurrets:
			err = d.installTurrets(w, id, res.Name, step.Turrets, true)
		case defs.StepAppendTurrets:
			err = d.installTurrets(w, id, res.Name, step.Turrets, false)
		}
		if err != nil {
			return err
		}
	}
	if tail {
		return nil
	}
	return d.applyGuns(w, id, res)
}

func (d *Definer) installGuns(w *entity.World, id entity.EntityID, name string, specs []defs.Gun, replace bool) error {
	if d.cfg.Guns == nil {
		return fmt.Errorf("define: %s has GUNS but no gun table is wired in", name)
	}
	e := w.Get(id)
	if e == nil {
		return fmt.Errorf("define: %s GUNS applied to a dead entity handle", name)
	}
	if replace {
		for _, old := range e.Guns {
			d.cfg.Guns.Destroy(old)
		}
		e.Guns = e.Guns[:0]
	}
	deps := d.gunDeps(w)
	for i, spec := range specs {
		if _, err := guns.NewGun(deps, id, spec, d.cfg.DisableGuns); err != nil {
			return fmt.Errorf("define: %s gun %d: %w", name, i, err)
		}
	}
	return nil
}

func (d *Definer) installTurrets(w *entity.World, id entity.EntityID, name string, list []defs.ResolvedTurret, replace bool) error {
	if d.cfg.Guns == nil {
		return fmt.Errorf("define: %s has TURRETS but no gun table is wired in", name)
	}
	specs := make([]defs.Turret, len(list))
	for i, t := range list {
		specs[i] = defs.Turret{Position: t.Position, Type: t.Type, Vulnerable: t.CollidingBond}
	}
	spawn := guns.SpawnTurrets
	if !replace {
		spawn = guns.AppendTurrets
	}
	if err := spawn(d.gunDeps(w), id, specs); err != nil {
		return fmt.Errorf("define: %s turrets: %w", name, err)
	}
	return nil
}

func (d *Definer) applyGuns(w *entity.World, id entity.EntityID, res *defs.Resolved) error {
	if scale, ok := res.GunStatScale.Get(); ok {
		return d.applyGunStatScale(w, id, scale)
	}
	return nil
}

func (d *Definer) applyGunStatScale(w *entity.World, id entity.EntityID, scale defs.StatScale) error {
	if d.cfg.Guns == nil {
		return nil
	}
	e := w.Get(id)
	if e == nil {
		return fmt.Errorf("define: applyGunStatScale on a dead entity handle")
	}
	sizeCtx := d.sizeContext()
	for _, gid := range e.Guns {
		g := d.cfg.Guns.Get(gid)
		if g == nil {
			continue
		}
		// entity.js:712 skips a gun with no shootSettings. Every Gun here has a
		// ShootSettings value. a gun whose PROPERTIES carried no SHOOT_SETTINGS has
		// the zero one, and combineStats' own `?? 1` would leave it at the scale
		// alone. Multiplying the zero value would silently zero a gun's stats, so
		// the JS's skip is reproduced by leaving an all-zero settings block alone.
		if g.Settings == (guns.ShootSettings{}) {
			continue
		}
		g.Settings.Reload *= scale.Reload.Or(1)
		g.Settings.Recoil *= scale.Recoil.Or(1)
		g.Settings.Size *= scale.Size.Or(1)
		g.Settings.Health *= scale.Health.Or(1)
		g.Settings.Damage *= scale.Damage.Or(1)
		g.Settings.Pen *= scale.Pen.Or(1)
		g.Settings.Speed *= scale.Speed.Or(1)
		g.Settings.MaxSpeed *= scale.MaxSpeed.Or(1)
		g.Settings.Range *= scale.Range.Or(1)
		g.Settings.Density *= scale.Density.Or(1)
		g.Settings.Resist *= scale.Resist.Or(1)
		g.TrueRecoil = g.Settings.Recoil
		g.Interpret(w, sizeCtx)
	}
	return nil
}

func (d *Definer) applyTurrets(w *entity.World, id entity.EntityID, res *defs.Resolved) error {
	list, ok := res.Turrets.Get()
	if !ok {
		return nil
	}
	if d.cfg.Guns == nil {
		return fmt.Errorf("define: %s has TURRETS but no gun table is wired in", res.Name)
	}
	specs := make([]defs.Turret, len(list))
	for i, t := range list {
		specs[i] = defs.Turret{Position: t.Position, Type: t.Type, Vulnerable: t.CollidingBond}
	}
	if err := guns.SpawnTurrets(d.gunDeps(w), id, specs); err != nil {
		return fmt.Errorf("define: %s turrets: %w", res.Name, err)
	}
	return nil
}

func (d *Definer) necroDefineGuns(e *entity.Entity) []entity.NecroGun {
	if d.cfg.Guns == nil || len(e.Settings.NecroTypes) == 0 {
		return nil
	}
	out := make([]entity.NecroGun, 0, len(e.Settings.NecroTypes))
	for _, shape := range e.Settings.NecroTypes {
		gid, _ := d.findNecroGun(e, shape)
		out = append(out, entity.NecroGun{Shape: shape, Gun: gid})
	}
	return out
}

func (d *Definer) findNecroGun(e *entity.Entity, shape int32) (entity.GunID, bool) {
	for _, gid := range e.Guns {
		g := d.cfg.Guns.Get(gid)
		if g == nil || g.BulletType == nil {
			continue
		}
		necro, ok := g.BulletType.Necro.Get()
		if !ok {
			continue
		}
		switch {
		case necro.IsList:
			for _, s := range necro.Shapes {
				if int32(s) == shape {
					return gid, true
				}
			}
		case necro.Bool:
			if v, ok := g.BulletType.Shape.Get(); ok && v.IsNumber && int32(v.Num) == shape {
				return gid, true
			}
		}
	}
	return 0, false
}
