// Package spatial is the broad-phase collision index.
package spatial

import "math"

// Cell coordinates wrap at |x|=32768. See docs/found-bugs.md.
const stride = 1 << 16

// Box is one entity's AABB.
type Box struct {
	MinX, MinY, MaxX, MaxY float64
	Skip                   bool
}

type Grid struct {
	shift   uint
	cells   map[int64][]uint32
	touched []int64
	out     []uint32
	stamp   []uint32
	epoch   uint32
}

func New(shift uint) *Grid {
	return &Grid{
		shift: shift,
		cells: make(map[int64][]uint32),
	}
}

// shr reproduces JavaScript's >> operator.
func shr(f float64, n uint) int32 { return toInt32(f) >> n }

func toInt32(f float64) int32 {
	if f >= math.MinInt32 && f <= math.MaxInt32 {
		return int32(f)
	}
	if math.IsNaN(f) || math.IsInf(f, 0) {
		return 0
	}
	m := math.Mod(math.Trunc(f), 1<<32)
	if m < 0 {
		m += 1 << 32
	}
	return int32(uint32(m))
}

func key(x, y int32) int64 { return int64(x) + int64(y)*stride }

func (g *Grid) Insert(idx uint32, minX, minY, maxX, maxY float64) {
	endX, endY := shr(maxX, g.shift), shr(maxY, g.shift)
	for x := shr(minX, g.shift); x <= endX; x++ {
		for y := shr(minY, g.shift); y <= endY; y++ {
			k := key(x, y)
			cell := g.cells[k]
			if len(cell) == 0 {
				g.touched = append(g.touched, k)
			}
			g.cells[k] = append(cell, idx)
		}
	}
}

func (g *Grid) Query(minX, minY, maxX, maxY float64, boxes []Box) []uint32 {
	g.out = g.out[:0]
	g.epoch++
	if g.epoch == 0 {
		for i := range g.stamp {
			g.stamp[i] = 0
		}
		g.epoch = 1
	}

	endX, endY := shr(maxX, g.shift), shr(maxY, g.shift)
	for x := shr(minX, g.shift); x <= endX; x++ {
		for y := shr(minY, g.shift); y <= endY; y++ {
			for _, idx := range g.cells[key(x, y)] {
				if int(idx) >= len(boxes) {
					continue
				}
				b := &boxes[idx]
				if b.Skip {
					continue
				}
				if b.MinX < maxX && b.MaxX > minX && b.MinY < maxY && b.MaxY > minY {
					if int(idx) >= len(g.stamp) {
						g.growStamp(int(idx) + 1)
					}
					if g.stamp[idx] != g.epoch {
						g.stamp[idx] = g.epoch
						g.out = append(g.out, idx)
					}
				}
			}
		}
	}
	return g.out
}

func (g *Grid) growStamp(n int) {
	for len(g.stamp) < n {
		g.stamp = append(g.stamp, 0)
	}
}

func (g *Grid) Clear() {
	for _, k := range g.touched {
		g.cells[k] = g.cells[k][:0]
	}
	g.touched = g.touched[:0]
}
