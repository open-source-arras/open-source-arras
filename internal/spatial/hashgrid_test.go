package spatial

import "testing"

func TestShrMatchesJS(t *testing.T) {
	cases := []struct {
		in   float64
		n    uint
		want int32
	}{
		{0, 6, 0},
		{63, 6, 0},
		{64, 6, 1},
		{127.9, 6, 1},
		{-1, 6, -1}, // int32(-1) >> 6 == -1
		{-64, 6, -1},
		{-65, 6, -2},
		{-0.5, 6, 0}, // truncates toward zero first, so int32(-0.5) == 0
		{1 << 20, 6, 1 << 14},
	}
	for _, c := range cases {
		if got := shr(c.in, c.n); got != c.want {
			t.Errorf("shr(%v, %d) = %d, want %d", c.in, c.n, got, c.want)
		}
	}
}

func TestQueryDedupsAcrossCells(t *testing.T) {
	g := New(6) // 64-unit cells
	boxes := []Box{{MinX: 0, MinY: 0, MaxX: 500, MaxY: 500}}
	g.Insert(0, 0, 0, 500, 500)

	got := g.Query(0, 0, 500, 500, boxes)
	if len(got) != 1 || got[0] != 0 {
		t.Fatalf("expected entity 0 exactly once, got %v", got)
	}
}

func TestQueryOverlapIsStrict(t *testing.T) {
	g := New(6)
	boxes := []Box{{MinX: 100, MinY: 100, MaxX: 200, MaxY: 200}}
	g.Insert(0, 100, 100, 200, 200)

	// Edge-touching only: hashgrid.js:41 uses strict <, not a hit.
	if got := g.Query(0, 100, 100, 200, boxes); len(got) != 0 {
		t.Errorf("edge contact should not collide, got %v", got)
	}
	// One unit of real overlap is a hit.
	if got := g.Query(0, 100, 101, 200, boxes); len(got) != 1 {
		t.Errorf("overlap should collide, got %v", got)
	}
}

func TestSkipExcludesBondedEntities(t *testing.T) {
	g := New(6)
	boxes := []Box{
		{MinX: 0, MinY: 0, MaxX: 50, MaxY: 50, Skip: true},
		{MinX: 0, MinY: 0, MaxX: 50, MaxY: 50},
	}
	g.Insert(0, 0, 0, 50, 50)
	g.Insert(1, 0, 0, 50, 50)

	got := g.Query(0, 0, 50, 50, boxes)
	if len(got) != 1 || got[0] != 1 {
		t.Fatalf("bonded entity 0 should be skipped, got %v", got)
	}
}

func TestClearFullyEmptiesAcrossTicks(t *testing.T) {
	g := New(6)
	boxes := []Box{{MinX: 0, MinY: 0, MaxX: 50, MaxY: 50}}

	for tick := 0; tick < 5; tick++ {
		g.Clear()
		g.Insert(0, 0, 0, 50, 50)
		got := g.Query(0, 0, 50, 50, boxes)
		if len(got) != 1 {
			t.Fatalf("tick %d: expected 1 candidate, got %d (%v)", tick, len(got), got)
		}
	}
}

func TestEpochWraparound(t *testing.T) {
	g := New(6)
	boxes := []Box{{MinX: 0, MinY: 0, MaxX: 50, MaxY: 50}}
	g.Insert(0, 0, 0, 50, 50)

	g.epoch = ^uint32(0) - 1
	for i := 0; i < 4; i++ {
		if got := g.Query(0, 0, 50, 50, boxes); len(got) != 1 {
			t.Fatalf("iteration %d across epoch wrap: got %v", i, got)
		}
	}
}

func BenchmarkInsertQuery(b *testing.B) {
	const n = 2000
	g := New(6)
	boxes := make([]Box, n)
	for i := range boxes {
		x := float64((i * 37) % 4000)
		y := float64((i * 71) % 4000)
		boxes[i] = Box{MinX: x, MinY: y, MaxX: x + 20, MaxY: y + 20}
	}

	b.ReportAllocs()
	b.ResetTimer()
	for i := 0; i < b.N; i++ {
		g.Clear()
		for j := range boxes {
			bx := &boxes[j]
			g.Insert(uint32(j), bx.MinX, bx.MinY, bx.MaxX, bx.MaxY)
		}
		for j := range boxes {
			bx := &boxes[j]
			g.Query(bx.MinX, bx.MinY, bx.MaxX, bx.MaxY, boxes)
		}
	}
}
