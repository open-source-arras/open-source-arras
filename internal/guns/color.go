package guns

import "arrasgo/internal/defs"
import "arrasgo/internal/entity"

// applyColorSpec mirrors color.js:35's interpret method applied to entity.Color.
func applyColorSpec(c *entity.Color, spec defs.ColorSpec) {
	switch spec.Kind {
	case defs.ColorNumber:
		c.InterpretNumber(spec.Num)
	case defs.ColorString:
		c.InterpretString(spec.Str)
	case defs.ColorObject:
		c.InterpretSpec(objectSpecToEntity(spec.Obj))
	}
}

// applyBulletColor is gun.js:428-432 and 439-443.
func applyBulletColor(spec defs.ColorSpec, master entity.Color) entity.Color {
	var c entity.Color
	var touchedBase, touchedHue, touchedSat, touchedBri, touchedInv bool

	switch spec.Kind {
	case defs.ColorNumber:
		c.InterpretNumber(spec.Num)
		touchedBase = true
	case defs.ColorString:
		c.InterpretString(spec.Str)
		touchedBase = true
		if containsSpace(spec.Str) {
			touchedHue, touchedSat, touchedBri, touchedInv = true, true, true, true
		}
	case defs.ColorObject:
		obj := entity.ColorSpec{}
		if spec.Obj.Base.IsSet() {
			obj.Base, obj.HasBase = spec.Obj.Base.String(), true
			touchedBase = true
		}
		if v, ok := spec.Obj.HueShift.Get(); ok {
			obj.HueShift, obj.HasHueShift = v, true
			touchedHue = true
		}
		if v, ok := spec.Obj.SaturationShift.Get(); ok {
			obj.SaturationShift, obj.HasSaturationShift = v, true
			touchedSat = true
		}
		if v, ok := spec.Obj.BrightnessShift.Get(); ok {
			obj.BrightnessShift, obj.HasBrightnessShift = v, true
			touchedBri = true
		}
		if v, ok := spec.Obj.AllowBrightnessInvert.Get(); ok {
			obj.AllowBrightnessInvert, obj.HasAllowBrightnessInvert = v, true
			touchedInv = true
		}
		c.InterpretSpec(obj)
	}

	fallback := entity.ColorSpec{}
	if !touchedBase {
		fallback.Base, fallback.HasBase = master.Base(), true
	}
	if !touchedHue {
		fallback.HueShift, fallback.HasHueShift = master.HueShift(), true
	}
	if !touchedSat {
		fallback.SaturationShift, fallback.HasSaturationShift = master.SaturationShift(), true
	}
	if !touchedBri {
		fallback.BrightnessShift, fallback.HasBrightnessShift = master.BrightnessShift(), true
	}
	if !touchedInv {
		fallback.AllowBrightnessInvert, fallback.HasAllowBrightnessInvert = master.AllowBrightnessInvert(), true
	}
	if fallback.HasBase || fallback.HasHueShift || fallback.HasSaturationShift || fallback.HasBrightnessShift || fallback.HasAllowBrightnessInvert {
		c.InterpretSpec(fallback)
	}
	return c
}

func objectSpecToEntity(obj defs.ColorObjectSpec) entity.ColorSpec {
	spec := entity.ColorSpec{}
	if obj.Base.IsSet() {
		spec.Base, spec.HasBase = obj.Base.String(), true
	}
	if v, ok := obj.HueShift.Get(); ok {
		spec.HueShift, spec.HasHueShift = v, true
	}
	if v, ok := obj.SaturationShift.Get(); ok {
		spec.SaturationShift, spec.HasSaturationShift = v, true
	}
	if v, ok := obj.BrightnessShift.Get(); ok {
		spec.BrightnessShift, spec.HasBrightnessShift = v, true
	}
	if v, ok := obj.AllowBrightnessInvert.Get(); ok {
		spec.AllowBrightnessInvert, spec.HasAllowBrightnessInvert = v, true
	}
	return spec
}

func containsSpace(s string) bool {
	for i := 0; i < len(s); i++ {
		if s[i] == ' ' {
			return true
		}
	}
	return false
}
