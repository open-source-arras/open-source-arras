package guns

import (
	"fmt"
	"strings"

	"arrasgo/internal/defs"
	"arrasgo/internal/entity"
)

func numToString(v float64) string {
	if i := int64(v); float64(i) == v {
		return fmt.Sprintf("%d", i)
	}
	return fmt.Sprintf("%g", v)
}

func typeFieldString(t defs.TypeField) string {
	if t.IsList {
		return ""
	}
	return t.Str
}

// shapeSpecToEntity is entity.js:203.
func shapeSpecToEntity(v defs.ShapeSpec) entity.ShapeData {
	switch {
	case v.IsNumber:
		return entity.ShapeData{Kind: entity.ShapeNumber, Number: v.Num}
	case v.IsString:
		return entity.ShapeData{Kind: entity.ShapeString, String: v.Str}
	case v.Polygon != nil:
		poly := make([][2]float64, len(v.Polygon))
		for i, p := range v.Polygon {
			poly[i] = [2]float64{arrAt(p, 0), arrAt(p, 1)}
		}
		return entity.ShapeData{Kind: entity.ShapePolygon, Polygon: poly}
	default:
		return entity.ShapeData{}
	}
}

// motionArgsFrom is entity.js:237.
func motionArgsFrom(a defs.BehaviourArgs) entity.MotionArgs {
	var m entity.MotionArgs
	if v, ok := a.Speed.Get(); ok {
		m.Speed, m.HasSpeed = v, true
	}
	if v, ok := a.Damp.Get(); ok {
		m.Damp, m.HasDamp = v, true
	}
	if v, ok := a.TurnVelocity.Get(); ok {
		m.TurnVelocity, m.HasTurnVelocity = v, true
	}
	m.KeepSpeed = false
	return m
}

// facingArgsFrom is entity.js:246.
func facingArgsFrom(a defs.BehaviourArgs) entity.FacingArgs {
	var f entity.FacingArgs
	if v, ok := a.Angle.Get(); ok {
		f.Angle, f.HasAngle = v, true
	}
	if v, ok := a.Smoothness.Get(); ok {
		f.Smoothness, f.HasSmoothness = v, true
	}
	if v, ok := a.Speed.Get(); ok {
		f.Speed, f.HasSpeed = v, true
	}
	return f
}

// aiSettingsFrom is bulletEntity.js:206.
func aiSettingsFrom(a defs.AISettings) entity.AISettings {
	out := entity.AISettings{
		BLIND:         a.Blind.Or(false),
		NO_LEAD:       a.NoLead.Or(false),
		IGNORE_SHAPES: a.IgnoreShapes.Or(false),
		SKYNET:        a.Skynet.Or(false),
		FULL_VIEW:     a.FullView.Or(false),
		CHASE:         a.Chase.Or(false),
		STRAFE:        a.Strafe.Or(false),
		FARMER:        a.Farmer.Or(false),
		Independent:   a.Independent.Or(false),
		Chase:         a.ChaseLower.Or(false),
	}
	if v, ok := a.Speed.Get(); ok {
		out.SPEED, out.HasSPEED = v, true
	}
	return out
}

func arrAt(arr []float64, i int) float64 {
	if i < 0 || i >= len(arr) {
		return 0
	}
	return arr[i]
}

func arrOr(arr []float64, i int, def float64) float64 {
	v := arrAt(arr, i)
	if v == 0 || v != v {
		return def
	}
	return v
}

func pairOf(arr []float64) [2]float64 {
	return [2]float64{arrAt(arr, 0), arrAt(arr, 1)}
}

func setOptBool(dst *bool, src defs.Opt[bool]) {
	if v, ok := src.Get(); ok {
		*dst = v
	}
}

func setOptString(dst *string, src defs.Opt[string]) {
	if v, ok := src.Get(); ok {
		*dst = v
	}
}

// statNamesOf is entity.js:284-295.
func statNamesOf(n defs.StatNames) entity.StatNames {
	var out entity.StatNames
	out[entity.SkillAtk] = n.BodyDamage.Or("Body Damage")
	out[entity.SkillHlt] = n.MaxHealth.Or("Max Health")
	out[entity.SkillSpd] = n.BulletSpeed.Or("Bullet Speed")
	out[entity.SkillStr] = n.BulletHealth.Or("Bullet Health")
	out[entity.SkillPen] = n.BulletPen.Or("Bullet Penetration")
	out[entity.SkillDam] = n.BulletDamage.Or("Bullet Damage")
	out[entity.SkillRld] = n.Reload.Or("Reload")
	out[entity.SkillMob] = n.MoveSpeed.Or("Movement Speed")
	out[entity.SkillRgn] = n.ShieldRegen.Or("Shield Regeneration")
	out[entity.SkillShi] = n.ShieldCap.Or("Shield Capacity")
	return out
}

// rerootTruthy is entity.js:462.
func rerootTruthy(r defs.RerootSpec) bool {
	if r.IsList {
		return true // a JS array is always truthy, even when empty
	}
	return r.Str != ""
}

// joinRoots is entity.js:463-467.
func joinRoots(list []string) string {
	var b strings.Builder
	for _, root := range list {
		b.WriteString(root)
		b.WriteString(`\/`)
	}
	s := b.String()
	if len(s) < 2 {
		return ""
	}
	return s[:len(s)-2]
}

// skillSlotsOf is entity.js:390-410.
func skillSlotsOf(spec defs.SkillSpec, def float64) ([entity.SkillCount]float64, error) {
	if spec.IsList {
		if len(spec.List) != entity.SkillCount {
			return [entity.SkillCount]float64{}, fmt.Errorf("guns: skill array has %d entries, want %d", len(spec.List), entity.SkillCount)
		}
		var out [entity.SkillCount]float64
		copy(out[:], spec.List)
		return out, nil
	}
	return spec.Named.Slots(def), nil
}

func applyBodySpec(e *entity.Entity, v defs.BodySpec) {
	if x, ok := v.Acceleration.Get(); ok {
		e.ACCELERATION = x
	}
	if x, ok := v.Speed.Get(); ok {
		e.SPEED = x
	}
	if x, ok := v.Health.Get(); ok {
		e.HEALTH = x
	}
	if x, ok := v.Resist.Get(); ok {
		e.RESIST = x
	}
	if x, ok := v.Shield.Get(); ok {
		e.SHIELD = x
	}
	if x, ok := v.Regen.Get(); ok {
		e.REGEN = x
	}
	if x, ok := v.Damage.Get(); ok {
		e.DAMAGE = x
	}
	if x, ok := v.Penetration.Get(); ok {
		e.PENETRATION = x
	}
	if x, ok := v.Range.Get(); ok {
		e.RANGE = x
	}
	if x, ok := v.FOV.Get(); ok {
		e.FOV = x
	}
	if x, ok := v.ShockAbsorb.Get(); ok {
		e.SHOCK_ABSORB = x
	}
	if x, ok := v.RecoilMultiplier.Get(); ok {
		e.RECOIL_MULTIPLIER = x
	}
	if x, ok := v.Density.Get(); ok {
		e.DENSITY = x
	}
	if x, ok := v.Stealth.Get(); ok {
		e.STEALTH = x
	}
	if x, ok := v.Pushability.Get(); ok {
		e.PUSHABILITY = x
	}
	if x, ok := v.Knockback.Get(); ok {
		e.KNOCKBACK = x
	}
	if x, ok := v.Hetero.Get(); ok {
		e.HeteroMultiplier = x
	}
}

// respawnGuns is bulletEntity.js:246-255.
func respawnGuns(d Deps, e *entity.Entity, id entity.EntityID, specs []defs.Gun) error {
	for _, old := range e.Guns {
		d.Guns.Destroy(old)
	}
	e.Guns = e.Guns[:0]
	for _, spec := range specs {
		if _, err := NewGun(d, id, spec, d.DisableGuns); err != nil {
			return err
		}
	}
	return nil
}

// necroTypesOf is bulletEntity.js:257.
func necroTypesOf(spec defs.NecroSpec, ownShape float64) []int32 {
	switch {
	case spec.IsList:
		out := make([]int32, len(spec.Shapes))
		for i, s := range spec.Shapes {
			out[i] = int32(s)
		}
		return out
	case spec.Bool:
		return []int32{int32(ownShape)}
	default:
		return nil
	}
}

// necroDefineGunsOf is bulletEntity.js:261-264.
func necroDefineGunsOf(d Deps, e *entity.Entity, necroTypes []int32) []entity.NecroGun {
	if len(necroTypes) == 0 {
		return nil
	}
	out := make([]entity.NecroGun, 0, len(necroTypes))
	for _, shape := range necroTypes {
		out = append(out, entity.NecroGun{Shape: shape, Gun: findNecroGun(d, e, shape)})
	}
	return out
}

// findNecroGun is bulletEntity.js:263.
func findNecroGun(d Deps, e *entity.Entity, shape int32) entity.GunID {
	for _, gid := range e.Guns {
		g := d.Guns.Get(gid)
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
					return gid
				}
			}
		case necro.Bool:
			if bulletShapeNumber(g.BulletType) == shape {
				return gid
			}
		}
	}
	return 0
}

func bulletShapeNumber(d *defs.Definition) int32 {
	if v, ok := d.Shape.Get(); ok && v.IsNumber {
		return int32(v.Num)
	}
	return 0
}
