package guns

import (
	"fmt"

	"arrasgo/internal/defs"
)

// flattenBulletType recursively merges parent definitions into a single flattened type.
func flattenBulletType(dset *defs.Set, list defs.TypeList) (*defs.Definition, error) {
	out := &defs.Definition{}
	for _, ref := range list {
		node, name, err := derefType(dset, ref)
		if err != nil {
			return nil, err
		}
		if err := flattenInto(dset, out, node, name, 0); err != nil {
			return nil, err
		}
	}
	return out, nil
}

const flattenMaxDepth = 64

// Recurse PARENT ancestors first, then copy fields.
func flattenInto(dset *defs.Set, out, def *defs.Definition, name string, depth int) error {
	if depth > flattenMaxDepth {
		return fmt.Errorf("guns: bullet TYPE PARENT chain deeper than %d at %s", flattenMaxDepth, name)
	}
	for _, ref := range def.Parent {
		parent, pname, err := derefType(dset, ref)
		if err != nil {
			return err
		}
		if err := flattenInto(dset, out, parent, pname, depth+1); err != nil {
			return err
		}
	}

	// BODY merges sub-key by sub-key, overwrite only.
	if v, ok := def.Body.Get(); ok {
		cur, _ := out.Body.Get()
		mergeBodySubKeys(&cur, v)
		out.Body = defs.Some(cur)
	}

	// Everything else replaces wholesale when present.
	flattenOpt(&out.Index, def.Index)
	flattenOpt(&out.Name, def.Name)
	flattenOpt(&out.Label, def.Label)
	flattenOpt(&out.Angle, def.Angle)
	flattenOpt(&out.DisplayName, def.DisplayName)
	flattenOpt(&out.Type, def.Type)
	flattenOpt(&out.WallType, def.WallType)
	flattenOpt(&out.Layer, def.Layer)
	if def.Color.Kind != defs.ColorNone {
		out.Color = def.Color
	}
	flattenOpt(&out.Shape, def.Shape)
	flattenOpt(&out.ShapeNum, def.ShapeNum)
	flattenOpt(&out.Controllers, def.Controllers)
	flattenOpt(&out.IgnoredByAI, def.IgnoredByAI)
	flattenOpt(&out.MotionType, def.MotionType)
	flattenOpt(&out.FacingType, def.FacingType)
	flattenOpt(&out.NoCollisions, def.NoCollisions)
	flattenOpt(&out.DrawHealth, def.DrawHealth)
	flattenOpt(&out.DrawSelf, def.DrawSelf)
	flattenOpt(&out.DamageEffects, def.DamageEffects)
	flattenOpt(&out.RatioEffects, def.RatioEffects)
	flattenOpt(&out.MotionEffects, def.MotionEffects)
	flattenOpt(&out.AcceptsScore, def.AcceptsScore)
	flattenOpt(&out.GiveKillMessage, def.GiveKillMessage)
	flattenOpt(&out.CanGoOutsideRoom, def.CanGoOutsideRoom)
	flattenOpt(&out.HitsOwnType, def.HitsOwnType)
	flattenOpt(&out.DieAtLowSpeed, def.DieAtLowSpeed)
	flattenOpt(&out.DieAtRange, def.DieAtRange)
	flattenOpt(&out.Independent, def.Independent)
	flattenOpt(&out.PersistsAfterDeath, def.PersistsAfterDeath)
	flattenOpt(&out.ClearOnMasterUpgrade, def.ClearOnMasterUpgrade)
	flattenOpt(&out.HealthWithLevel, def.HealthWithLevel)
	flattenOpt(&out.Obstacle, def.Obstacle)
	flattenOpt(&out.HasNoRecoil, def.HasNoRecoil)
	flattenOpt(&out.CravesAttention, def.CravesAttention)
	flattenOpt(&out.Healer, def.Healer)
	flattenOpt(&out.DamageClass, def.DamageClass)
	flattenOpt(&out.BuffVsFood, def.BuffVsFood)
	flattenOpt(&out.Intangible, def.Intangible)
	flattenOpt(&out.IsSmasher, def.IsSmasher)
	flattenOpt(&out.AI, def.AI)
	flattenOpt(&out.Invisible, def.Invisible)
	flattenOpt(&out.Alpha, def.Alpha)
	flattenOpt(&out.Danger, def.Danger)
	flattenOpt(&out.ShootOnDeath, def.ShootOnDeath)
	flattenOpt(&out.Borderless, def.Borderless)
	flattenOpt(&out.DrawFill, def.DrawFill)
	flattenOpt(&out.Team, def.Team)
	flattenOpt(&out.VariesInSize, def.VariesInSize)
	flattenOpt(&out.ArenaCloser, def.ArenaCloser)
	flattenOpt(&out.Size, def.Size)
	flattenOpt(&out.Glow, def.Glow)
	flattenOpt(&out.MaxChildren, def.MaxChildren)
	flattenOpt(&out.MaxBullets, def.MaxBullets)
	flattenOpt(&out.LevelCap, def.LevelCap)
	flattenOpt(&out.FullInvisible, def.FullInvisible)
	flattenOpt(&out.CanSeeInvisible, def.CanSeeInvisible)
	flattenOpt(&out.KillMessage, def.KillMessage)
	flattenOpt(&out.AutospinMultiplier, def.AutospinMultiplier)
	flattenOpt(&out.BroadcastMessage, def.BroadcastMessage)
	flattenOpt(&out.DefeatMessage, def.DefeatMessage)
	flattenOpt(&out.CanBeOnLeaderboard, def.CanBeOnLeaderboard)
	flattenOpt(&out.RenderOnLeaderboard, def.RenderOnLeaderboard)
	flattenOpt(&out.StatNames, def.StatNames)
	flattenOpt(&out.IsImmuneToTiles, def.IsImmuneToTiles)
	flattenOpt(&out.BranchLabel, def.BranchLabel)
	flattenOpt(&out.BatchUpgrades, def.BatchUpgrades)
	flattenOpt(&out.NoSizeAnimation, def.NoSizeAnimation)
	flattenOpt(&out.ConnectChildrenOnCamera, def.ConnectChildrenOnCamera)
	flattenOpt(&out.RerootUpgradeTree, def.RerootUpgradeTree)
	flattenOpt(&out.OnMinimap, def.OnMinimap)
	flattenOpt(&out.Level, def.Level)
	flattenOpt(&out.SkillCap, def.SkillCap)
	flattenOpt(&out.Skill, def.Skill)
	flattenOpt(&out.Value, def.Value)
	flattenOpt(&out.AltAbilities, def.AltAbilities)
	flattenOpt(&out.Guns, def.Guns)
	flattenOpt(&out.Turrets, def.Turrets)
	flattenOpt(&out.Necro, def.Necro)
	flattenOpt(&out.ExtraSkill, def.ExtraSkill)
	flattenOpt(&out.SpawnOnDeath, def.SpawnOnDeath)
	flattenOpt(&out.TickHandler, def.TickHandler)
	flattenOpt(&out.On, def.On)
	return nil
}

// Merge sub-keys with overwrite, not multiply.
func mergeBodySubKeys(dst *defs.BodySpec, src defs.BodySpec) {
	flattenOpt(&dst.Accel, src.Accel)
	flattenOpt(&dst.Acceleration, src.Acceleration)
	flattenOpt(&dst.Damage, src.Damage)
	flattenOpt(&dst.Density, src.Density)
	flattenOpt(&dst.FOV, src.FOV)
	flattenOpt(&dst.Health, src.Health)
	flattenOpt(&dst.Hetero, src.Hetero)
	flattenOpt(&dst.Knockback, src.Knockback)
	flattenOpt(&dst.Penetration, src.Penetration)
	flattenOpt(&dst.Pushability, src.Pushability)
	flattenOpt(&dst.Range, src.Range)
	flattenOpt(&dst.RecoilMultiplier, src.RecoilMultiplier)
	flattenOpt(&dst.Regen, src.Regen)
	flattenOpt(&dst.Resist, src.Resist)
	flattenOpt(&dst.Shield, src.Shield)
	flattenOpt(&dst.ShockAbsorb, src.ShockAbsorb)
	flattenOpt(&dst.Speed, src.Speed)
	flattenOpt(&dst.Stealth, src.Stealth)
}

// Copy src onto dst only when src is set.
func flattenOpt[T any](dst *defs.Opt[T], src defs.Opt[T]) {
	if v, ok := src.Get(); ok {
		*dst = defs.Some(v)
	}
}

// setBulletType is gun.js:146-172.
func setBulletType(dset *defs.Set, masterLabel, gunLabel string, independentChildren bool, typeList defs.TypeList) (flat *defs.Definition, bodyStats defs.BodySpec, noEntityLimit bool, err error) {
	flat, err = flattenBulletType(dset, typeList)
	if err != nil {
		return nil, defs.BodySpec{}, false, err
	}
	for _, ref := range typeList {
		node, _, derefErr := derefType(dset, ref)
		if derefErr != nil {
			return nil, defs.BodySpec{}, false, derefErr
		}
		if _, ok := node.Turrets.Get(); ok {
			noEntityLimit = true
		}
		if _, ok := node.On.Get(); ok {
			noEntityLimit = true
		}
	}
	if !independentChildren {
		combined := masterLabel
		if gunLabel != "" {
			combined += " " + gunLabel
		}
		combined += " " + flat.Label.Or("")
		flat.Label = defs.Some(combined)
	}
	bodyStats = flat.Body.Or(defs.BodySpec{})
	return flat, bodyStats, noEntityLimit, nil
}

// derefType is ensureIsClass (loaders/global.js:118).
func derefType(dset *defs.Set, ref defs.TypeRef) (*defs.Definition, string, error) {
	if ref.IsInline() {
		return ref.Inline, "<inline>", nil
	}
	d, ok := dset.Get(ref.Name)
	if !ok {
		return nil, "", fmt.Errorf("guns: bullet TYPE %q does not exist", ref.Name)
	}
	return d, ref.Name, nil
}
