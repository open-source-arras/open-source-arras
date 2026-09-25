package sim

import (
	"math"

	"arrasgo/internal/entity"
	"arrasgo/internal/jsutil"
)

// PhysicsStep is entity.js:971.
func PhysicsStep(x, y, vx, vy, ax, ay, roomSpeed float64) (nx, ny, nvx, nvy float64) {
	vx += ax
	vy += ay
	const stepRemaining = 1
	x += stepRemaining * vx / roomSpeed
	y += stepRemaining * vy / roomSpeed
	return x, y, vx, vy
}

func (s *Sim) Physics(id entity.EntityID) {
	if !s.W.Alive(id) {
		return
	}
	i := id.Index
	p := s.W.Pos[i].Scrub()
	v := s.W.Vel[i].Scrub()
	a := s.W.Accel[i].Scrub()

	x, y, vx, vy := PhysicsStep(
		float64(p.X), float64(p.Y),
		float64(v.X), float64(v.Y),
		float64(a.X), float64(a.Y),
		s.RoomSpeed)

	s.W.Vel[i].X, s.W.Vel[i].Y = float64(vx), float64(vy)
	s.W.Accel[i].Null()
	s.W.Get(id).StepRemaining = 1
	s.W.Pos[i].X, s.W.Pos[i].Y = float64(x), float64(y)
}

// FrictionStep is entity.js:991.
func FrictionStep(vx, vy, maxSpeed, damp, roomSpeed float64) (float64, float64) {
	motion := jsLength(vx, vy)
	excess := motion - maxSpeed
	if excess > 0 && damp != 0 {
		k := damp / roomSpeed
		drag := excess / (k + 1)
		finalVelocity := maxSpeed + drag
		vx = finalVelocity * vx / motion
		vy = finalVelocity * vy / motion
	}
	return vx, vy
}

func (s *Sim) Friction(id entity.EntityID) {
	e := s.W.Get(id)
	if e == nil {
		return
	}
	i := id.Index
	v := s.W.Vel[i].Scrub()
	vx, vy := FrictionStep(float64(v.X), float64(v.Y), e.MaxSpeed, e.Damp, s.RoomSpeed)
	s.W.Vel[i].X, s.W.Vel[i].Y = float64(vx), float64(vy)
}

// ConfinementStep is entity.js:1003 rectangular branch.
func ConfinementStep(x, y, realSize, roomWidth, roomHeight, boundForce, roomSpeed float64) (ax, ay float64) {
	ax -= math.Min(x-realSize+roomWidth/2+50, 0) * boundForce / roomSpeed
	ax -= math.Max(x+realSize-roomWidth/2-50, 0) * boundForce / roomSpeed
	ay -= math.Min(y-realSize+roomHeight/2+50, 0) * boundForce / roomSpeed
	ay -= math.Max(y+realSize-roomHeight/2-50, 0) * boundForce / roomSpeed
	return ax, ay
}

// ConfinementRoundStep is entity.js:1003 round_arena branch.
func ConfinementRoundStep(x, y, roomWidth, boundForce, runSpeed float64) (nx, ny float64) {
	dist := jsLength(x, y)
	if dist > roomWidth-roomWidth/2 {
		strength := (dist - roomWidth/2) * boundForce / (runSpeed * 350)
		x = jsutil.Lerp(x, 0, strength)
		y = jsutil.Lerp(y, 0, strength)
	}
	return x, y
}

func (s *Sim) ConfinementToTheseEarthlyShackles(id entity.EntityID) {
	e := s.W.Get(id)
	if e == nil {
		return
	}
	if e.Settings.CanGoOutsideRoom {
		return
	}
	i := id.Index
	p := s.W.Pos[i].Scrub()

	if s.Tuning != nil && s.Tuning.RoundArena {
		x, y := ConfinementRoundStep(float64(p.X), float64(p.Y), s.Room.Width, s.boundForce(), s.RunSpeed)
		s.W.Pos[i].X, s.W.Pos[i].Y = float64(x), float64(y)
		return
	}
	ax, ay := ConfinementStep(float64(p.X), float64(p.Y), s.realSize(id),
		s.Room.Width, s.Room.Height, s.boundForce(), s.RoomSpeed)
	s.addAccel(i, ax, ay)
}

func (s *Sim) boundForce() float64 {
	if s.Tuning == nil {
		return 0
	}
	return s.Tuning.RoomBoundForce
}

// ActivationUpdate is subFunctions.js:7.
func (s *Sim) ActivationUpdate(id entity.EntityID) {
	e := s.W.Get(id)
	if e == nil {
		return
	}
	if e.SkipLife {
		s.setActive(id, false)
		return
	}
	if x := s.extraOf(id); x != nil && x.AlwaysActive {
		s.setActive(id, true)
		return
	}
	if e.IsDead() {
		return
	}
	if !e.Activation.Active {
		s.W.RemoveFromGrid(id)
		if e.Settings.DiesAtRange {
			s.W.Kill(id)
		}
		timer := e.Activation.Timer
		e.Activation.Timer--
		if timer == 0 {
			s.setActive(id, true)
		}
		return
	}
	s.W.AddToGrid(id)
	e.Activation.Timer = 15
	active := s.W.Flag[id.Index].Has(entity.FlagPlayer) || s.W.Flag[id.Index].Has(entity.FlagBot)
	if !active && s.Hooks.ViewCheck != nil {
		active = s.Hooks.ViewCheck(id, 0.6)
	}
	s.setActive(id, active)
}

func (s *Sim) setActive(id entity.EntityID, v bool) {
	e := s.W.Get(id)
	if e == nil {
		return
	}
	e.Activation.Active = v
	if v {
		s.W.Flag[id.Index] |= entity.FlagActive
	} else {
		s.W.Flag[id.Index] &^= entity.FlagActive
	}
}
