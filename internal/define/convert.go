package define

import (
	"strconv"

	"arrasgo/internal/defs"
	"arrasgo/internal/entity"
)

// setBool sets dst if src is resolved.
func setBool(dst *bool, src defs.Opt[bool]) {
	if v, ok := src.Get(); ok {
		*dst = v
	}
}

func setString(dst *string, src defs.Opt[string]) {
	if v, ok := src.Get(); ok {
		*dst = v
	}
}

func setFloat(dst *float64, src defs.Opt[float64]) {
	if v, ok := src.Get(); ok {
		*dst = v
	}
}

func setInt32(dst *int32, src defs.Opt[float64]) {
	if v, ok := src.Get(); ok {
		*dst = int32(v)
	}
}

func boolToFloat(b bool) float64 {
	if b {
		return 1
	}
	return 0
}

func typeString(t defs.TypeField) string {
	if t.IsList {
		return ""
	}
	return t.Str
}

func shapeDataOf(v defs.ShapeSpec) entity.ShapeData {
	switch {
	case v.IsNumber:
		return entity.ShapeData{Kind: entity.ShapeNumber, Number: v.Num}
	case v.IsString:
		return entity.ShapeData{Kind: entity.ShapeString, String: v.Str}
	case v.Polygon != nil:
		poly := make([][2]float64, len(v.Polygon))
		for i, p := range v.Polygon {
			var x, y float64
			if len(p) > 0 {
				x = p[0]
			}
			if len(p) > 1 {
				y = p[1]
			}
			poly[i] = [2]float64{x, y}
		}
		return entity.ShapeData{Kind: entity.ShapePolygon, Polygon: poly}
	default:
		return entity.ShapeData{}
	}
}

func copyColor(dst *entity.Color, src defs.ColorState) {
	dst.SetHueShift(src.HueShift)
	dst.SetSaturationShift(src.SaturationShift)
	dst.SetBrightnessShift(src.BrightnessShift)
	dst.SetAllowBrightnessInvert(src.AllowBrightnessInvert)
	dst.SetBase(colorBase(src.Base))
}

func colorBase(v defs.ColorValue) string {
	return v.String()
}

func motionArgsOf(a defs.BehaviourArgs) entity.MotionArgs {
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
	return m
}

func facingArgsOf(a defs.BehaviourArgs) entity.FacingArgs {
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

func aiSettingsOf(a defs.AISettings) entity.AISettings {
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

func statNamesOf(n defs.SkillNames) entity.StatNames {
	var out entity.StatNames
	out[entity.SkillAtk] = n.BodyDamage
	out[entity.SkillHlt] = n.MaxHealth
	out[entity.SkillSpd] = n.BulletSpeed
	out[entity.SkillStr] = n.BulletHealth
	out[entity.SkillPen] = n.BulletPen
	out[entity.SkillDam] = n.BulletDamage
	out[entity.SkillRld] = n.Reload
	out[entity.SkillMob] = n.MoveSpeed
	out[entity.SkillRgn] = n.ShieldRegen
	out[entity.SkillShi] = n.ShieldCap
	return out
}

func shakeInfoOf(list []defs.ShakeSpec) []entity.ShakeInfo {
	var out []entity.ShakeInfo
	for _, s := range list {
		push := func(kind string, det defs.ShakeDetail) {
			out = append(out, entity.ShakeInfo{
				Type:           kind,
				Duration:       det.Duration.Or(0),
				Amount:         det.Amount.Or(0),
				KeepShake:      det.KeepShake.Or(false),
				Push:           s.Push.Or(false),
				ApplyOnUpgrade: s.ApplyOnUpgrade.Or(false),
				ApplyOnShoot:   s.ApplyOnShoot.Or(false),
			})
		}
		if det, ok := s.CameraShake.Get(); ok {
			push("camera", det)
		}
		if det, ok := s.GUIShake.Get(); ok {
			push("gui", det)
		}
	}
	return out
}

func skillSlotsOf(v [10]float64) [entity.SkillCount]int32 {
	var out [entity.SkillCount]int32
	for i := range v {
		out[i] = int32(v[i])
	}
	return out
}

func necroTypesOf(v []float64) []int32 {
	out := make([]int32, len(v))
	for i, s := range v {
		out[i] = int32(s)
	}
	return out
}

func funcKey(f defs.Func) string {
	if f.Path != "" {
		return f.Path
	}
	if f.Name != "" {
		return f.Name
	}
	return "<anonymous JS function>"
}

func numToString(v float64) string {
	if i := int64(v); float64(i) == v {
		return strconv.FormatInt(i, 10)
	}
	return strconv.FormatFloat(v, 'g', -1, 64)
}
