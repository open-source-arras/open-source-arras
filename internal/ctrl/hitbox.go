package ctrl

import (
	"arrasgo/internal/jsmath"
	"arrasgo/internal/vmath"
)

// MakeHitbox is loaders/global.js:640.
// Uses sin(angle) for x and cos(angle) for y, matching the JS bug.
func MakeHitbox(size, angle float64) WallHitbox {
	s := size - 4
	corners := [4]float64{
		jsmath.Atan2(s, s) + angle,
		jsmath.Atan2(0-s, s) + angle,
		jsmath.Atan2(0-s, 0-s) + angle,
		jsmath.Atan2(s, 0-s) + angle,
	}
	distance := jsmath.Length(s, s)

	var pts [4]vmath.Vec2
	for i, a := range corners {
		pts[i] = vmath.Vec2{X: distance * jsmath.Sin(a), Y: distance * jsmath.Cos(a)}
	}
	return WallHitbox{
		HitboxRadius: distance,
		Hitbox: [][2]vmath.Vec2{
			{pts[0], pts[1]},
			{pts[1], pts[2]},
			{pts[2], pts[3]},
			{pts[3], pts[0]},
		},
	}
}
