package guns

import (
	"fmt"
	"math"

	"arrasgo/internal/jsmath"
	"strings"

	"arrasgo/internal/config"
	"arrasgo/internal/defs"
	"arrasgo/internal/entity"
	"arrasgo/internal/vmath"
)

const degToRad = math.Pi / 180

func NewTurret(d Deps, position defs.TurretPosition, bond, master entity.EntityID) (entity.EntityID, error) {
	if !master.Valid() {
		return entity.EntityID{}, fmt.Errorf("guns: NewTurret given an invalid master")
	}
	bondEntity := d.World.Get(bond)
	if bondEntity == nil {
		return entity.EntityID{}, fmt.Errorf("guns: NewTurret given a dead bond")
	}
	bondSkill, bondLabel, bondTeam := bondEntity.Skill, bondEntity.Label, bondEntity.Team

	id := d.World.Spawn()
	d.World.Flag[id.Index] |= entity.FlagUnlisted | entity.FlagTurret
	e := d.World.Get(id)
	e.Master = master

	generic, ok := d.Defs.Get("genericEntity")
	if !ok {
		return entity.EntityID{}, fmt.Errorf("guns: genericEntity definition missing")
	}
	if err := applyTurretDefine(d, id, defs.TypeRef{Inline: generic}, 0); err != nil {
		return entity.EntityID{}, err
	}
	e = d.World.Get(id)

	e.Bond = bond
	e.Source = bond
	e.SkillOwner = bond
	e.Skill = bondSkill
	e.Label = bondLabel + " " + e.Label
	e.Team = bondTeam

	length, x, y, angle, arc, layer := turretPositionDefaults(position)
	off := vmath.Vec2{X: x, Y: y}
	e.Bound = entity.Bound{
		Size:      length / 20,
		Angle:     angle * math.Pi / 180, // turretEntity.js:80, multiply-then-divide
		Direction: off.Direction(),
		Offset:    off.Length() / 10,
		Arc:       arc * math.Pi / 180, // turretEntity.js:83
		Layer:     int32(layer),
	}
	return id, nil
}

func applyTurretDefine(d Deps, id entity.EntityID, ref defs.TypeRef, depth int) error {
	if depth > flattenMaxDepth {
		return fmt.Errorf("guns: turret TYPE PARENT chain deeper than %d", flattenMaxDepth)
	}
	def, _, err := derefType(d.Defs, ref)
	if err != nil {
		return err
	}
	for _, p := range def.Parent {
		if err := applyTurretDefine(d, id, p, depth+1); err != nil {
			return err
		}
	}

	e := d.World.Get(id)
	if e == nil {
		return fmt.Errorf("guns: applyTurretDefine on a dead entity")
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
	if v, ok := def.MirrorMasterAngle.Get(); ok {
		e.Settings.MirrorMasterAngle = v
	}
	if v, ok := def.Independent.Get(); ok {
		e.Settings.Independent = v
	}
	if v, ok := def.Shape.Get(); ok {
		if v.IsNumber {
			e.Shape = v.Num
		} else {
			e.Shape = 0 // Default to 0 when not a number.
		}
		e.ShapeData = shapeSpecToEntity(v)
	}
	if def.Color.Kind != defs.ColorNone {
		applyColorSpec(&e.Color, def.Color)
	}
	if v, ok := def.Controllers.Get(); ok && d.AttachControllers != nil {
		if err := d.AttachControllers(d.World, id, v); err != nil {
			return err
		}
		e = d.World.Get(id) // building controllers can reallocate the slab
		if e == nil {
			return fmt.Errorf("guns: turret died while its controllers were being built")
		}
	}
	if v, ok := def.FacingType.Get(); ok {
		e.FacingType = v.Name
		e.FacingTypeArgs = facingArgsFrom(v.Args)
	}
	if v, ok := def.RecalcSkill.Get(); ok && v && d.Tuning != nil {
		if sk := d.World.SkillRef(id); sk != nil {
			recalcSkill(d.Tuning, sk)
		}
	}
	if v, ok := def.ExtraSkill.Get(); ok {
		if sk := d.World.SkillRef(id); sk != nil {
			sk.Points += int32(v)
		}
	}
	e = d.World.Get(id)
	if v, ok := def.MaxChildren.Get(); ok {
		e.MaxChildren = int32(v)
	}
	if v, ok := def.HasNoRecoil.Get(); ok {
		e.Settings.HasNoRecoil = v
	}
	if v, ok := def.AI.Get(); ok {
		e.AISettings = aiSettingsFrom(v)
	}
	if v, ok := def.Guns.Get(); ok {
		if err := respawnGuns(d, e, id, v); err != nil {
			return err
		}
	}
	if v, ok := def.Size.Get(); ok {
		e.SIZE = v // turretEntity.js:189 -- no squiggle multiply, no coreSize latch, unlike bullets/entity.js
	}
	if v, ok := def.Turrets.Get(); ok {
		if err := SpawnTurrets(d, id, v); err != nil {
			return err
		}
		e = d.World.Get(id)
		if e == nil {
			return fmt.Errorf("guns: applyTurretDefine's own entity died while spawning its TURRETS")
		}
	}
	if v, ok := def.Body.Get(); ok {
		applyBodySpec(e, v)
		refreshTurretBodyAttributes(d, e)
	}
	return nil
}

func recalcSkill(cfg *config.Tuning, s *entity.Skill) {
	score := s.Score
	s.Reset(cfg, true)
	s.Score = score
	for s.Maintain(cfg) {
	}
}

func SpawnTurrets(d Deps, bond entity.EntityID, specs []defs.Turret) error {
	return spawnTurrets(d, bond, specs, true)
}

func AppendTurrets(d Deps, bond entity.EntityID, specs []defs.Turret) error {
	return spawnTurrets(d, bond, specs, false)
}

func spawnTurrets(d Deps, bond entity.EntityID, specs []defs.Turret, replace bool) error {
	bondEntity := d.World.Get(bond)
	if bondEntity == nil {
		return fmt.Errorf("guns: SpawnTurrets given a dead bond")
	}
	if replace {
		old := append([]entity.EntityID(nil), bondEntity.Turrets...)
		for _, tid := range old {
			if d.TearDownTurret != nil {
				d.TearDownTurret(tid)
				continue
			}
			DestroyTurret(d, tid)
		}
		if bondEntity = d.World.Get(bond); bondEntity == nil {
			return fmt.Errorf("guns: SpawnTurrets lost its bond while replacing turrets")
		}
		bondEntity.Turrets = bondEntity.Turrets[:0]
	}
	master := bondEntity.Master

	for _, spec := range specs {
		id, err := NewTurret(d, spec.Position, bond, master)
		if err != nil {
			return err
		}
		for _, ref := range spec.Type {
			if err := applyTurretDefine(d, id, ref, 0); err != nil {
				return err
			}
		}
		t := d.World.Get(id)
		// Bug: turret DANGER field unreachable. See docs/found-bugs.md.
		t.DangerValue = 0
		t.CollidingBond = spec.Vulnerable.Or(false)
		bondNow := d.World.Get(bond)
		fixFacing(t, bondNow)
		bondNow.Turrets = append(bondNow.Turrets, id)
	}
	return nil
}

func DestroyTurret(d Deps, id entity.EntityID) {
	e := d.World.Get(id)
	if e == nil {
		return
	}
	for _, child := range e.Turrets {
		DestroyTurret(d, child)
	}
	d.World.Destroy(id)
}

func fixFacing(t *entity.Entity, bond *entity.Entity) {
	t.Facing = bond.Facing + t.Bound.Angle
	if strings.Contains(t.FacingType, "Target") || strings.Contains(t.FacingType, "Speed") {
		t.FacingType = "bound"
		smoothness := 4.0
		if t.Settings.HasSmoothness {
			smoothness = t.Settings.Smoothness
		}
		t.FacingTypeArgs = entity.FacingArgs{Smoothness: smoothness, HasSmoothness: true}
	}
}

func refreshTurretBodyAttributes(d Deps, e *entity.Entity) {
	sk := &e.Skill
	if e.SkillOwner.Valid() {
		if shared := d.World.SkillRef(e.ID); shared != nil {
			sk = shared
		}
	}
	level := 0.0
	if d.Tuning != nil {
		level = float64(e.LevelWith(sk, d.Tuning))
	}
	e.Damage = e.DAMAGE * sk.Atk
	e.Penetration = e.PENETRATION + 1.5*(sk.Brst+0.8*(sk.Atk-1))
	e.Density = (1 + 0.08*level) * e.DENSITY
	e.Stealth = e.STEALTH
	e.Pushability = e.PUSHABILITY
	e.Knockback = e.KNOCKBACK
	e.SizeMultiplier = 1
	e.RecoilMultiplier = e.RECOIL_MULTIPLIER
}

func RefreshTurretBodyAttributes(d Deps, id entity.EntityID) {
	if e := d.World.Get(id); e != nil {
		refreshTurretBodyAttributes(d, e)
	}
}

func MoveTurret(d Deps, id, bond entity.EntityID) {
	w := d.World
	t := w.Get(id)
	b := w.Get(bond)
	if t == nil || b == nil {
		return
	}
	bi, ti := bond.Index, id.Index
	bp := w.Pos[bi]
	bs := w.ComputeSize(bond, sizeContextFrom(d))
	angle := t.Bound.Direction + t.Bound.Angle + b.Facing
	w.Pos[ti].X = bp.X + float64(bs)*t.Bound.Offset*jsmath.Cos(angle)
	w.Pos[ti].Y = bp.Y + float64(bs)*t.Bound.Offset*jsmath.Sin(angle)
	w.Vel[bi].X += t.Bound.Size * w.Accel[ti].X
	w.Vel[bi].Y += t.Bound.Size * w.Accel[ti].Y
	w.Vel[ti] = w.Vel[bi]
	t.FiringArc = [2]float64{b.Facing + t.Bound.Angle, t.Bound.Arc / 2}
	w.Accel[ti].Null()
}

func SyncTurrets(d Deps, id entity.EntityID) {
	e := d.World.Get(id)
	if e == nil {
		return
	}
	for _, gid := range e.Guns {
		SyncChildren(d, gid)
	}
	for _, tid := range e.Turrets {
		t := d.World.Get(tid)
		if t == nil {
			continue
		}
		t.Skill = e.Skill
		refreshTurretBodyAttributes(d, t)
		SyncTurrets(d, tid)
	}
}

func turretPositionDefaults(p defs.TurretPosition) (size, x, y, angle, arc, layer float64) {
	return p.Size.Or(10), p.X.Or(0), p.Y.Or(0), p.Angle.Or(0), p.Arc.Or(360), p.Layer.Or(0)
}
