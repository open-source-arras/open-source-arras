// Package vmath holds the vector and scalar helpers the simulation runs on.
package vmath

import (
	"math"

	"arrasgo/internal/jsmath"
)

// Vec2 is vector.js.
type Vec2 struct {
	X, Y float64
}

func (v *Vec2) Scrub() Vec2 {
	if math.IsNaN(v.X) {
		v.X = 0
	}
	if math.IsNaN(v.Y) {
		v.Y = 0
	}
	return *v
}

func (v Vec2) scrubbed() Vec2 {
	if math.IsNaN(v.X) {
		v.X = 0
	}
	if math.IsNaN(v.Y) {
		v.Y = 0
	}
	return v
}

func (v *Vec2) Null() { v.X, v.Y = 0, 0 }

func (v Vec2) LengthSquared() float64 {
	s := v.scrubbed()
	return s.X*s.X + s.Y*s.Y
}

func (v Vec2) Length() float64 {
	s := v.scrubbed()
	return math.Sqrt(s.X*s.X + s.Y*s.Y)
}

func (v Vec2) Direction() float64 {
	s := v.scrubbed()
	return jsmath.Atan2(s.Y, s.X)
}

func (v Vec2) IsShorterThan(d float64) bool {
	s := v.scrubbed()
	return s.X*s.X+s.Y*s.Y <= d*d
}

func (v Vec2) Add(o Vec2) Vec2    { return Vec2{v.X + o.X, v.Y + o.Y} }
func (v Vec2) Sub(o Vec2) Vec2    { return Vec2{v.X - o.X, v.Y - o.Y} }
func (v Vec2) Mul(s float64) Vec2 { return Vec2{v.X * s, v.Y * s} }
