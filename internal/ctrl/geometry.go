package ctrl

import (
	"math"

	"arrasgo/internal/jsmath"

	"arrasgo/internal/entity"
	"arrasgo/internal/vmath"
)

var compressMovementOffsets = [8]vmath.Vec2{
	{X: 1, Y: 0}, {X: 1, Y: 1}, {X: 0, Y: 1}, {X: -1, Y: 1},
	{X: -1, Y: 0}, {X: -1, Y: -1}, {X: 0, Y: -1}, {X: 1, Y: -1},
}

func compressMovement(current, goal vmath.Vec2) vmath.Vec2 {
	dx := float64(current.X) - float64(goal.X)
	dy := float64(current.Y) - float64(goal.Y)
	idx := int(math.Round((jsmath.Atan2(dy, dx)/(math.Pi*2))*8+4)) % 8
	offset := compressMovementOffsets[idx]
	return vmath.Vec2{X: current.X + offset.X, Y: current.Y + offset.Y}
}

func cllOnSegment(p0, p1, q0, q1, r0, r1 float64) bool {
	return q0 <= math.Max(p0, r0) && q0 >= math.Min(p0, r0) &&
		q1 <= math.Max(p1, r1) && q1 >= math.Min(p1, r1)
}

func cllOrientation(p0, p1, q0, q1, r0, r1 float64) int {
	v := (q1-p1)*(r0-q0) - (q0-p0)*(r1-q1)
	switch {
	case v == 0:
		return 0
	case v > 0:
		return 1
	default:
		return 2
	}
}

func collisionLineLine(p10, p11, q10, q11, p20, p21, q20, q21 float64) bool {
	o1 := cllOrientation(p10, p11, q10, q11, p20, p21)
	o2 := cllOrientation(p10, p11, q10, q11, q20, q21)
	o3 := cllOrientation(p20, p21, q20, q21, p10, p11)
	o4 := cllOrientation(p20, p21, q20, q21, q10, q11)

	return (o1 == 0 && cllOnSegment(p10, p11, p20, p21, q10, q11)) ||
		(o2 == 0 && cllOnSegment(p10, p11, q20, q21, q10, q11)) ||
		(o3 == 0 && cllOnSegment(p20, p21, p10, p11, q20, q21)) ||
		(o4 == 0 && cllOnSegment(p20, p21, q10, q11, q20, q21)) ||
		(o1 != o2 && o3 != o4)
}

func wouldHitWall(ctx *Context, me, enemy vmath.Vec2, directWallCheck bool) bool {
	if directWallCheck {
		return ctx.justHitAWall(ctx.Body)
	}

	mx, my := float64(me.X), float64(me.Y)
	ex, ey := float64(enemy.X), float64(enemy.Y)
	cx, cy := (mx+ex)/2, (my+ey)/2
	dx, dy := ex-mx, ey-my
	radius := math.Sqrt(dx*dx+dy*dy) / 2

	for i := range ctx.Walls {
		crate := &ctx.Walls[i]
		wx, wy := float64(crate.Pos.X), float64(crate.Pos.Y)
		ddx, ddy := wx-cx, wy-cy
		sqrDist := ddx*ddx + ddy*ddy
		reach := radius + float64(crate.HitboxRadius)
		if sqrDist > reach*reach {
			continue
		}
		for _, edge := range crate.Hitbox {
			if collisionLineLine(
				mx, my,
				ex, ey,
				wx+float64(edge[0].X), wy+float64(edge[0].Y),
				wx+float64(edge[1].X), wy+float64(edge[1].Y),
			) {
				return true
			}
		}
	}
	return false
}

func nearestEntity(w *entity.World, candidates []entity.EntityID, from vmath.Vec2, test func(id entity.EntityID, sqrDist float64) bool) (entity.EntityID, bool) {
	lowest := float64(math.Inf(1))
	var closest entity.EntityID
	found := false
	for _, id := range candidates {
		if w.Get(id) == nil {
			continue
		}
		p := w.Pos[id.Index]
		dx, dy := p.X-from.X, p.Y-from.Y
		dist := dx*dx + dy*dy
		if dist < lowest && (test == nil || test(id, dist)) {
			lowest = dist
			closest = id
			found = true
		}
	}
	return closest, found
}

func timeOfImpact(p, v vmath.Vec2, s float64) float64 {
	px, py := float64(p.X), float64(p.Y)
	vx, vy := float64(v.X), float64(v.Y)

	a := vx*vx + vy*vy - s*s
	b := 2 * (px*vx + py*vy)
	c := px*px + py*py

	discriminant := b*b - 4*a*c
	if discriminant < 0 {
		return 0
	}
	sqrtDiscriminant := math.Sqrt(discriminant)

	if math.Abs(a) < 1e-10 {
		if b != 0 {
			return math.Max(0, -c/b)
		}
		return 0
	}

	t1 := (-b + sqrtDiscriminant) / (2 * a)
	t2 := (-b - sqrtDiscriminant) / (2 * a)

	best := math.Inf(1)
	found := false
	if t1 > 1e-10 {
		best, found = t1, true
	}
	if t2 > 1e-10 && t2 < best {
		best, found = t2, true
	}
	if !found {
		return 0
	}
	return best
}
