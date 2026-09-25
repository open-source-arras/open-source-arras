package guns

import (
	"fmt"
	"math"

	"arrasgo/internal/jsmath"

	"arrasgo/internal/entity"
	"arrasgo/internal/jsutil"
	"arrasgo/internal/vmath"
)

func Recoil(d Deps, gid entity.GunID) {
	g := d.Guns.Get(gid)
	if g == nil {
		return
	}
	body := d.World.Get(g.Body)
	if body == nil {
		return
	}
	roomSpeed := 1.0
	if d.Tuning != nil {
		roomSpeed = d.Tuning.GameSpeed
	}

	if g.Motion != 0 || g.Position != 0 {
		g.Motion -= (0.25 * g.Position) / roomSpeed
		g.Position += g.Motion
		if g.Position < 0 {
			g.Position = 0
			g.Motion = -g.Motion
		}
		if g.Motion > 0 {
			g.Motion *= 0.75
		}
	}
	if g.CanShoot && !body.Settings.HasNoRecoil {
		if g.Motion > 0 || body.Settings.HasNoReloadDelay {
			bodySize := d.World.ComputeSize(g.Body, sizeContextFrom(d))
			recoilForce := (-g.Position * g.TrueRecoil * body.RecoilMultiplier * 1.08 / float64(bodySize)) / roomSpeed
			ai := g.Body.Index
			d.World.Accel[ai].X += recoilForce * jsmath.Cos(g.RecoilDir)
			d.World.Accel[ai].Y += recoilForce * jsmath.Sin(g.RecoilDir)
		}
	}
}

func GetSkillRaw(w *entity.World, g *Gun) [entity.SkillCount]int32 {
	if !g.BulletStats.UseMaster {
		return g.BulletStats.Fixed.Raw
	}
	var out [entity.SkillCount]int32
	if sk := w.SkillRef(g.Body); sk != nil {
		copy(out[:5], sk.Raw[:5])
	}
	return out
}

func CheckShootPermission(d Deps, gid entity.GunID) bool {
	g := d.Guns.Get(gid)
	if g == nil {
		return false
	}
	sk := g.skillMultipliers(d.World)
	necroReload := 1.0
	if g.Calculator == CalcNecro {
		necroReload = sk.Rld
	}
	permission := true
	body := d.World.Get(g.Body)
	if g.CountsOwnKids != 0 {
		permission = g.CountsOwnKids+boolToFloat(g.DestroyOldestChild) > float64(len(g.Children))*necroReload
	} else if body != nil && body.MaxChildren != 0 {
		permission = float64(body.MaxChildren) > float64(len(body.Children))*necroReload
	}
	if g.DestroyOldestChild && !permission {
		permission = true
		DestroyOldest(d, gid)
	}
	return permission
}

func DestroyOldest(d Deps, gid entity.GunID) {
	g := d.Guns.Get(gid)
	if g == nil {
		return
	}
	var oldest entity.EntityID
	oldestTime := int64(math.MaxInt64)
	for _, cid := range g.Children {
		c := d.World.Get(cid)
		if c != nil && c.CreationTimeMS < oldestTime {
			oldestTime = c.CreationTimeMS
			oldest = cid
		}
	}
	if oldest.Valid() {
		d.World.Kill(oldest)
	}
}

func SyncChildren(d Deps, gid entity.GunID) {
	g := d.Guns.Get(gid)
	if g == nil || !g.SyncsSkills {
		return
	}
	stats, ok := g.Interpret(d.World, sizeContextFrom(d))
	if !ok {
		return
	}
	skillRaw := GetSkillRaw(d.World, g)
	for _, cid := range g.Children {
		if c := d.World.Get(cid); c != nil {
			applyBulletBodySkill(d, c, stats, skillRaw)
		}
	}
	for _, cid := range g.BulletChildren {
		if c := d.World.Get(cid); c != nil {
			applyBulletBodySkill(d, c, stats, skillRaw)
		}
	}
}

func Shoot(d Deps, gid entity.GunID) (gx, gy float64, ok bool) {
	g := d.Guns.Get(gid)
	if g == nil {
		return 0, 0, false
	}
	body := d.World.Get(g.Body)
	if body == nil {
		return 0, 0, false
	}
	angle1 := g.Direction + g.Angle + body.Facing
	angle2 := g.Angle + body.Facing
	gunlength := g.Length + g.SpawnOffset*g.Width*g.Settings.Size/2
	baseX := g.Offset * jsmath.Cos(angle1)
	baseY := g.Offset * jsmath.Sin(angle1)
	endX := gunlength * jsmath.Cos(angle2)
	endY := gunlength * jsmath.Sin(angle2)
	return baseX + endX, baseY + endY, true
}

func Live(d Deps, gid entity.GunID, rng *jsutil.Rand) error {
	Recoil(d, gid)
	g := d.Guns.Get(gid)
	if g == nil || !g.CanShoot {
		return nil
	}
	body := d.World.Get(g.Body)
	if body == nil {
		return nil
	}
	master := d.World.Get(body.Master)

	sk := g.skillMultipliers(d.World)
	permission := CheckShootPermission(d, gid)
	if master == nil || master.Invuln || !master.Activation.Active {
		permission = false
	}
	if master != nil && master.HasMaxBullets && int(master.MaxBullets) < len(master.BulletChildren)+1 {
		permission = false
	}

	if permission || !g.WaitToCycle {
		speed := d.gameSpeed()
		if !g.FixedReload {
			speed = d.runSpeed()
		}
		if g.CycleTimer < 1 {
			// Bug: gun.js typo "fixed reload" vs CalcFixedReload. See docs/found-bugs.md.
			rateIsFlat := g.Calculator == CalcNecro || g.Calculator == "fixed reload"
			rate := sk.Rld
			if rateIsFlat {
				rate = 1
			}
			g.CycleTimer += 1 / (g.Settings.Reload * speed * rate)
		}
	}

	firing := g.Autofire
	if !firing {
		if g.AltFire {
			firing = body.Control.Alt
		} else {
			firing = body.Control.Fire
		}
	}
	if firing {
		if body.Settings.HasNoReloadDelay && permission {
			if err := FireBullet(d, gid, rng); err != nil {
				return err
			}
			g.CycleTimer = g.MaxCycleTimer
			return nil
		}
		for permission && g.CycleTimer >= 1 {
			if err := FireBullet(d, gid, rng); err != nil {
				return err
			}
			g.CycleTimer--
			permission = CheckShootPermission(d, gid)
		}
	} else if g.CycleTimer > g.MaxCycleTimer {
		g.CycleTimer = g.MaxCycleTimer
	}
	return nil
}

func FireBullet(d Deps, gid entity.GunID, rng *jsutil.Rand) error {
	g := d.Guns.Get(gid)
	if g == nil {
		return nil
	}
	body := d.World.Get(g.Body)
	if body == nil {
		return nil
	}
	sk := g.skillMultipliers(d.World)

	now := d.now()
	g.LastShot.Time = now
	g.LastShot.Power = 3*jsmath.Log(math.Sqrt(sk.Spd)+g.TrueRecoil+1) + 1
	g.Motion += g.LastShot.Power

	shudder, spray := 0.0, 0.0
	if g.Settings.Shudder != 0 {
		for {
			shudder = rng.Gauss(0, math.Sqrt(g.Settings.Shudder))
			if math.Abs(shudder) < g.Settings.Shudder*2 {
				break
			}
		}
	}
	if g.Settings.Spray != 0 {
		for {
			spray = rng.Gauss(0, g.Settings.Spray*g.Settings.Shudder)
			if math.Abs(spray) < g.Settings.Spray/2 {
				break
			}
		}
	}
	// degToRad divides first (gun.js:315), not multiply-then-divide.
	spread := spray * degToRad

	negRecoil := 1.0
	if g.NegRecoil {
		negRecoil = -1
	}
	vecLength := negRecoil * g.Settings.Speed * d.runSpeed() * sk.Spd * (1 + shudder)
	vecAngle := g.Angle + body.Facing + spread
	s := vmath.Vec2{X: vecLength * jsmath.Cos(vecAngle), Y: vecLength * jsmath.Sin(vecAngle)}

	bodyVel := d.World.Vel[g.Body.Index]
	if bodyVel.Length() != 0 {
		extraBoost := math.Max(0, s.X*bodyVel.X+s.Y*bodyVel.Y) / bodyVel.Length() / s.Length()
		if extraBoost != 0 {
			l := s.Length()
			s.X += (bodyVel.Length() * extraBoost * s.X) / l
			s.Y += (bodyVel.Length() * extraBoost * s.Y) / l
		}
	}

	gx, gy, ok := Shoot(d, gid)
	if !ok {
		return nil
	}
	bodyPos := d.World.Pos[g.Body.Index]
	bodySize := d.World.ComputeSize(g.Body, sizeContextFrom(d)) // live getter, as above
	spawnPos := vmath.Vec2{
		X: bodyPos.X + float64(bodySize)*gx - s.X,
		Y: bodyPos.Y + float64(bodySize)*gy - s.Y,
	}

	if g.IndependentMaster || g.IndependentChildren {
		return nil
	}

	return bulletInit(d, gid, spawnPos, s)
}

func bulletInit(d Deps, gid entity.GunID, pos, vel vmath.Vec2) error {
	g := d.Guns.Get(gid)
	if g == nil {
		return nil
	}
	bodyID := g.Body
	body := d.World.Get(bodyID)
	if body == nil {
		return nil
	}
	if g.BulletType == nil {
		return fmt.Errorf("guns: FireBullet on a gun with no BulletType")
	}

	id := d.World.Spawn()
	d.World.Pos[id.Index] = pos
	d.World.Vel[id.Index] = vel
	if !g.NoEntityLimit {
		d.World.Flag[id.Index] |= entity.FlagLimited
	}
	if gm := d.World.Get(g.Master); gm != nil {
		parentID := gm.Master
		if parent := d.World.Get(parentID); parent != nil {
			e := d.World.Get(id)
			e.Master = parentID
			e.Team = parent.Team
		}
	}
	if d.OnSpawn != nil {
		d.OnSpawn(id)
	}

	genericDef, ok := d.Defs.Get("genericEntity")
	if !ok {
		return fmt.Errorf("guns: genericEntity definition missing")
	}
	e := d.World.Get(id)
	if err := applyBulletFields(d, e, id, genericDef, g.NoEntityLimit); err != nil {
		return err
	}
	if e = d.World.Get(id); e == nil {
		return nil
	}
	if !g.NoEntityLimit {
		// bulletEntity overwrites genericEntity's SIZE. Restore bulletEntity defaults.
		e.MaxSpeed = 0
		e.Facing = 0
		e.VFacing = 0
		e.Range = 0
		e.DamageReceived = 0
		e.Invuln = false
		e.Alpha = 1
		e.Invisible = [2]float64{0, 0}
		e.AlphaRange = [2]float64{0, 1}
		e.Damp = 0.05
		e.SIZE = 1
		e.SizeMultiplier = 1
		e.FiringArc = [2]float64{0, 360}
	}
	if err := BulletInitOnto(d, gid, id, vel); err != nil {
		return err
	}
	if e = d.World.Get(id); e != nil {
		e.CoreSize = e.SIZE
	}
	return nil
}

func BulletInitOnto(d Deps, gid entity.GunID, id entity.EntityID, vel vmath.Vec2) error {
	g := d.Guns.Get(gid)
	if g == nil {
		return nil
	}
	if g.BulletType == nil {
		return fmt.Errorf("guns: bulletInit on a gun with no BulletType")
	}
	bodyID := g.Body
	body := d.World.Get(bodyID)
	if body == nil {
		return nil
	}
	var masterColor entity.Color
	if master := d.World.Get(body.Master); master != nil {
		masterColor = master.Color
	}

	e := d.World.Get(id)
	if e == nil {
		return nil
	}
	if err := applyBulletFields(d, e, id, g.BulletType, g.NoEntityLimit); err != nil {
		return err
	}
	e = d.World.Get(id) // ditto for the bullet type's own pass

	stats, _ := g.Interpret(d.World, sizeContextFrom(d))
	skillRaw := GetSkillRaw(d.World, g)
	applyBulletBodySkill(d, e, stats, skillRaw)

	e.Color = applyBulletColor(g.BulletType.Color, masterColor)

	bodySize := d.World.ComputeSize(bodyID, sizeContextFrom(d))
	e.SIZE = (float64(bodySize) * g.Width * g.Settings.Size) / 2

	body = d.World.Get(bodyID)
	if body == nil {
		return fmt.Errorf("guns: FireBullet's own body died while the bullet was being defined")
	}

	switch {
	case g.CountsOwnKids != 0:
		g.Children = append(g.Children, id)
	case body.MaxChildren != 0:
		e.Parent = bodyID
		body.Children = append(body.Children, id)
		g.Children = append(g.Children, id)
	default:
		e.BulletParent = bodyID
		body.BulletChildren = append(body.BulletChildren, id)
		g.BulletChildren = append(g.BulletChildren, id)
	}
	e.Source = bodyID
	e.Facing = vel.Direction()

	for i := range e.Settings.NecroDefineGuns {
		e.Settings.NecroDefineGuns[i].Gun = gid
	}

	refreshBulletBodyAttributes(d, e)
	if d.BringToLife != nil {
		d.BringToLife(id)
	}
	g = d.Guns.Get(gid)
	if g == nil {
		return nil
	}
	if body = d.World.Get(bodyID); body != nil {
		g.RecoilDir = body.Facing + g.Angle
	}
	return nil
}

func GetTracking(d Deps, g *Gun) (speed, rang float64) {
	sk := g.skillMultipliers(d.World)
	speed = d.runSpeed() * sk.Spd * g.Settings.MaxSpeed * bodySpecNumOrNaN(g.BulletBodyStats.Speed)
	rang = math.Sqrt(sk.Spd) * g.Settings.Range * bodySpecNumOrNaN(g.BulletBodyStats.Range)
	return speed, rang
}

type PhotoInfo struct {
	Time                                            int64
	Power                                           float64
	Color                                           string
	Alpha, StrokeWidth                              float64
	Borderless, DrawFill, DrawAbove                 bool
	Length, Width, Aspect, Angle, Direction, Offset float64
	Layer                                           int32
}

func GetPhotoInfo(g *Gun) PhotoInfo {
	return PhotoInfo{
		Time:        g.LastShot.Time,
		Power:       g.LastShot.Power,
		Color:       g.Color.Compiled,
		Alpha:       g.Alpha,
		StrokeWidth: g.StrokeWidth,
		Borderless:  g.Borderless,
		DrawFill:    g.DrawFill,
		DrawAbove:   g.DrawAbove,
		Length:      g.Length,
		Width:       g.Width,
		Aspect:      g.Aspect,
		Angle:       g.Angle,
		Direction:   g.Direction,
		Offset:      g.Offset,
		Layer:       g.Layer,
	}
}

func boolToFloat(b bool) float64 {
	if b {
		return 1
	}
	return 0
}

func bodySpecNumOrNaN(o interface{ Get() (float64, bool) }) float64 {
	if v, ok := o.Get(); ok {
		return v
	}
	return math.NaN()
}

func sizeContextFrom(d Deps) entity.SizeContext {
	return entity.SizeContext{
		Tuning:          d.Tuning,
		Growth:          d.Growth,
		GenericTankSIZE: d.GenericTankSIZE,
	}
}

func (d Deps) now() int64 {
	if d.World != nil && d.World.Now != nil {
		return d.World.Now()
	}
	return 0
}

func (d Deps) runSpeed() float64 {
	if d.Tuning != nil {
		return d.Tuning.RunSpeed
	}
	return 1
}

func (d Deps) gameSpeed() float64 {
	if d.Tuning != nil {
		return d.Tuning.GameSpeed
	}
	return 1
}
