package room

import (
	"math"

	"arrasgo/internal/jsmath"

	"arrasgo/internal/entity"
	"arrasgo/internal/vmath"
)

// lazyRealSize is subFunctions.js:43-58, evaluated directly (not memoised).
func lazyRealSize(n float64) float64 {
	if n < 3 {
		return 1
	}
	circum := 2 * math.Pi / n
	return math.Sqrt(circum * (1 / jsmath.Sin(circum)))
}

// Protected tracks entities to avoid in DirtyCheck.
type Protected struct {
	ids []entity.EntityID
}

func (p *Protected) Protect(w *entity.World, id entity.EntityID) {
	p.ids = append(p.ids, id)
	if e := w.Get(id); e != nil {
		e.IsProtected = true
	}
}

func (p *Protected) Unprotect(id entity.EntityID) {
	for i, existing := range p.ids {
		if existing == id {
			p.ids[i] = p.ids[len(p.ids)-1]
			p.ids = p.ids[:len(p.ids)-1]
			return
		}
	}
}

func (p *Protected) DirtyCheck(w *entity.World, pos vmath.Vec2, r float64) bool {
	for _, id := range p.ids {
		if w.Get(id) == nil {
			continue
		}
		ep := w.Pos[id.Index]
		es := w.Size[id.Index]
		if abs64(pos.X-ep.X) < r+es && abs64(pos.Y-ep.Y) < r+es {
			return true
		}
	}
	return false
}

func abs64(f float64) float64 {
	if f < 0 {
		return -f
	}
	return f
}
