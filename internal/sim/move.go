package sim

import (
	"math"

	"arrasgo/internal/jsmath"

	"arrasgo/internal/entity"
	"arrasgo/internal/jsutil"
)

// RunMove is global.runMove (loaders/global.js:237).
func (s *Sim) RunMove(id entity.EntityID, now int64) {
	e := s.W.Get(id)
	if e == nil {
		return
	}
	i := id.Index
	p := s.W.Pos[i].Scrub()
	v := s.W.Vel[i].Scrub()

	gx := float64(e.Control.Goal.X) - float64(p.X)
	gy := float64(e.Control.Goal.Y) - float64(p.Y)
	gactive := gx != 0 || gy != 0
	var engineX, engineY float64
	a := e.Acceleration / s.RoomSpeed

	if gactive && e.LastMovementTime != 0 {
		e.LastMovementTime = now
	}
	if e.Control.Fire && e.LastFiredTime != 0 {
		e.LastFiredTime = now
	}

	vx, vy := float64(v.X), float64(v.Y)

	switch e.MotionType {
	case "grow":
		speed := 1.0
		if e.MotionTypeArgs.HasSpeed {
			speed = e.MotionTypeArgs.Speed
		}
		e.SIZE += speed

	case "glide":
		e.MaxSpeed = e.TopSpeed
		damp := 0.05
		if e.MotionTypeArgs.HasDamp {
			damp = e.MotionTypeArgs.Damp
		}
		e.Damp = damp

	case "motor":
		e.MaxSpeed = 0
		if e.TopSpeed != 0 {
			e.Damp = a / e.TopSpeed
		}
		if gactive {
			l := jsLength(gx, gy)
			engineX, engineY = a*gx/l, a*gy/l
		}

	case "swarm":
		e.MaxSpeed = e.TopSpeed
		l := jsLength(gx, gy) + 1
		if gactive && l > s.size(id) {
			desiredX := e.TopSpeed * gx / l
			desiredY := e.TopSpeed * gy / l
			turn := e.Range
			if e.MotionTypeArgs.HasTurnVelocity {
				turn = e.MotionTypeArgs.TurnVelocity
			}
			turning := math.Sqrt((e.TopSpeed*math.Max(1, turn) + 1) / a)
			engineX = (desiredX - vx) / math.Max(5, turning)
			engineY = (desiredY - vy) / math.Max(5, turning)
		} else if jsLength(vx, vy) < e.TopSpeed {
			engineX, engineY = vx*a/20, vy*a/20
		}

	case "chase":
		if gactive {
			l := jsLength(gx, gy)
			if l > s.size(id)*2 {
				e.MaxSpeed = e.TopSpeed
				desiredX := e.TopSpeed * gx / l
				desiredY := e.TopSpeed * gy / l
				engineX, engineY = (desiredX-vx)*a, (desiredY-vy)*a
			} else if e.MotionTypeArgs.KeepSpeed {
				if jsLength(vx, vy) < e.TopSpeed {
					engineX, engineY = vx*a/20, vy*a/20
				}
			} else {
				e.MaxSpeed = 0
			}
		} else if e.MotionTypeArgs.KeepSpeed {
			if jsLength(vx, vy) < e.TopSpeed {
				engineX, engineY = vx*a/20, vy*a/20
			}
		} else {
			e.MaxSpeed = 0
		}

	case "drift":
		e.MaxSpeed = 0
		engineX, engineY = gx*a, gy*a

	case "withMaster":
		if s.W.Alive(e.Source) {
			j := e.Source.Index
			s.W.Pos[i] = s.W.Pos[j]
			s.W.Vel[i] = s.W.Vel[j]
		}
	}

	power := float64(e.Control.Power)
	s.addAccel(i, engineX*power, engineY*power)
}

// RunFace is global.runFace (loaders/global.js:326).
func (s *Sim) RunFace(id entity.EntityID) {
	e := s.W.Get(id)
	if e == nil {
		return
	}
	x := s.extraOf(id)
	tx, ty := float64(e.Control.Target.X), float64(e.Control.Target.Y)
	oldFacing := e.Facing
	v := s.W.Vel[id.Index].Scrub()
	vLen := jsLength(float64(v.X), float64(v.Y))
	vDir := jsmath.Atan2(float64(v.Y), float64(v.X))

	smoothness := faceSmoothness(e.FacingTypeArgs)
	spinSpeed := faceSpinSpeed(e.FacingTypeArgs)

	switch e.FacingType {
	case "spin":
		e.Facing += spinSpeed / s.RunSpeed

	case "spinWhenIdle":
		if e.Control.Fire {
			e.Facing = jsmath.Atan2(ty, tx)
		} else {
			e.Facing += spinSpeed / s.RunSpeed
		}

	case "turnWithSpeed":
		mult := 1.0
		if e.FacingTypeArgs.HasMultiplier {
			mult = e.FacingTypeArgs.Multiplier
		}
		e.Facing += vLen / 90 * math.Pi / s.RoomSpeed * mult

	case "withMotion":
		e.Facing = vDir

	case "smoothWithMotion", "looseWithMotion":
		e.Facing += jsutil.LoopSmooth(e.Facing, vDir, smoothness/s.RoomSpeed)

	case "withTarget", "toTarget":
		if e.Eastereggs.Braindamage {
			return
		}
		reverse := 1.0
		if s.W.Flag[id.Index].Has(entity.FlagPlayer) {
			reverse = e.ReverseTank
		}
		e.Facing = jsmath.Atan2(ty*reverse, tx*reverse)

	case "locksFacing":
		if !e.Control.Alt {
			e.Facing = jsmath.Atan2(ty, tx)
		}

	case "looseWithTarget", "looseToTarget", "smoothToTarget":
		e.Facing += jsutil.LoopSmooth(e.Facing, jsmath.Atan2(ty, tx), smoothness/s.RoomSpeed)

	case "noFacing":
		if x == nil || !x.hasLastSavedFacing || x.lastSavedFacing != e.Facing {
			angle := 0.0
			if e.FacingTypeArgs.HasAngle {
				angle = e.FacingTypeArgs.Angle
			}
			e.Facing = angle
		}
		if x != nil {
			x.lastSavedFacing = e.Facing
			x.hasLastSavedFacing = true
		}

	case "bound":
		s.defaultBound(id, e, tx, ty)

	case "spinOnFire":
		if e.Control.Fire {
			old := e.Facing
			e.Facing = old + jsutil.LoopSmooth(old, old+1, smoothness/s.RunSpeed)
		} else {
			s.defaultBound(id, e, tx, ty)
		}

	case "manual":
		angle := 0.0
		if e.FacingTypeArgs.HasAngle {
			angle = e.FacingTypeArgs.Angle
		}
		if angle != e.Facing {
			if e.FacingTypeArgs.HasAngle {
				e.Facing = e.FacingTypeArgs.Angle
			} else {
				e.Facing = math.NaN()
			}
		}
	}

	const tau = 2 * math.Pi
	e.Facing = math.Mod(math.Mod(e.Facing, tau)+tau, tau)
	e.VFacing = jsutil.AngleDifference(oldFacing, e.Facing) * s.RoomSpeed
}

// faceSmoothness returns smoothness value, defaulting to 4.
func faceSmoothness(a entity.FacingArgs) float64 {
	if a.HasSmoothness {
		return a.Smoothness
	}
	return 4
}

func faceSpinSpeed(a entity.FacingArgs) float64 {
	if a.HasSpeed {
		return a.Speed
	}
	return 0.05
}

// defaultBound aims at target or parks on arc's centre (loaders/global.js:330).
func (s *Sim) defaultBound(id entity.EntityID, e *entity.Entity, tx, ty float64) {
	var givenAngle float64
	if e.Control.Main {
		mm := s.masterOfMaster(id)
		if mm != nil && s.W.Flag[mm.ID.Index].Has(entity.FlagPlayer) {
			reverse := mm.ReverseTank
			angle := jsmath.Atan2(ty*reverse, tx*reverse)
			if math.IsNaN(angle) {
				givenAngle = jsmath.Atan2(0, 0)
			} else {
				givenAngle = angle
			}
		} else {
			givenAngle = jsmath.Atan2(ty, tx)
		}
		diff := jsutil.AngleDifference(givenAngle, e.FiringArc[0])
		if math.Abs(diff) >= e.FiringArc[1] {
			givenAngle = e.FiringArc[0]
		}
	} else {
		givenAngle = e.FiringArc[0]
	}
	e.Facing += jsutil.LoopSmooth(e.Facing, givenAngle, faceSmoothness(e.FacingTypeArgs)/s.RunSpeed)
}

// masterOfMaster returns my.master.master.
func (s *Sim) masterOfMaster(id entity.EntityID) *entity.Entity {
	e := s.W.Get(id)
	if e == nil {
		return nil
	}
	m := s.W.Get(e.Master)
	if m == nil {
		return nil
	}
	return s.W.Get(m.Master)
}
