package guns

import (
	"fmt"
	"math"

	"arrasgo/internal/defs"
	"arrasgo/internal/entity"
	"arrasgo/internal/vmath"
)

// NewProp ports the Prop constructor (propEntity.js:2-47) and registers it under bond.
func NewProp(d Deps, position defs.PropPosition, bond entity.EntityID) (entity.EntityID, error) {
	bondEntity := d.World.Get(bond)
	if bondEntity == nil {
		return entity.EntityID{}, fmt.Errorf("guns: NewProp given a dead bond")
	}

	id := d.World.Spawn()
	d.World.Flag[id.Index] |= entity.FlagUnlisted
	e := d.World.Get(id)

	e.Borderless = false
	e.DrawFill = true
	e.Bond = bond

	size, x, y, angle, layer := propPositionDefaults(position)
	off := vmath.Vec2{X: x, Y: y}
	e.Bound = entity.Bound{
		Size:      size / 20,
		Angle:     angle * math.Pi / 180, // propEntity.js:31, multiply-then-divide
		Direction: off.Direction(),
		Offset:    off.Length() / 10,
		Layer:     int32(layer),
	}
	e.Settings.MirrorMasterAngle = true

	bondEntity = d.World.Get(bond)
	bondEntity.Props = append(bondEntity.Props, id)
	return id, nil
}

// applyPropDefine applies a prop type definition and its PARENT chain.
func applyPropDefine(d Deps, id entity.EntityID, ref defs.TypeRef, depth int) error {
	if depth > flattenMaxDepth {
		return fmt.Errorf("guns: prop TYPE PARENT chain deeper than %d", flattenMaxDepth)
	}
	def, _, err := derefType(d.Defs, ref)
	if err != nil {
		return err
	}
	for _, p := range def.Parent {
		if err := applyPropDefine(d, id, p, depth+1); err != nil {
			return err
		}
	}

	e := d.World.Get(id)
	if e == nil {
		return fmt.Errorf("guns: applyPropDefine on a dead entity")
	}

	if v, ok := def.Index.Get(); ok {
		e.Index = numToString(v)
	}
	if v, ok := def.Shape.Get(); ok {
		if v.IsNumber {
			e.Shape = v.Num
		} else {
			e.Shape = 0
		}
		e.ShapeData = shapeSpecToEntity(v)
	}
	if def.Color.Kind != defs.ColorNone {
		applyColorSpec(&e.Color, def.Color)
	}
	if v, ok := def.Borderless.Get(); ok {
		e.Borderless = v
	}
	if v, ok := def.DrawFill.Get(); ok {
		e.DrawFill = v
	}
	if v, ok := def.Guns.Get(); ok {
		if err := respawnGuns(d, e, id, v); err != nil {
			return err
		}
	}
	return nil
}

// SpawnProps constructs fresh props and applies their type definitions.
func SpawnProps(d Deps, bond entity.EntityID, specs []defs.Prop) error {
	for _, spec := range specs {
		id, err := NewProp(d, spec.Position, bond)
		if err != nil {
			return err
		}
		for _, ref := range spec.Type {
			if err := applyPropDefine(d, id, ref, 0); err != nil {
				return err
			}
		}
		e := d.World.Get(id)
		if v, ok := spec.Angle.Get(); ok {
			e.Angle = v
		}
	}
	return nil
}

// propPositionDefaults applies position defaults.
func propPositionDefaults(p defs.PropPosition) (size, x, y, angle, layer float64) {
	return p.Size.Or(10), p.X.Or(0), p.Y.Or(0), p.Angle.Or(0), p.Layer.Or(0)
}
