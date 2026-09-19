package jsutil

import "testing"

func TestMulberry32MatchesNode(t *testing.T) {
	cases := []struct {
		seed uint32
		want [5]float64
	}{
		{0, [5]float64{
			0.26642920868471265, 0.0003297457005828619, 0.2232720274478197,
			0.1462021479383111, 0.46732782293111086,
		}},
		{1, [5]float64{
			0.6270739405881613, 0.002735721180215478, 0.5274470399599522,
			0.9810509674716741, 0.9683778982143849,
		}},
		{42, [5]float64{
			0.6011037519201636, 0.44829055899754167, 0.8524657934904099,
			0.6697340414393693, 0.17481389874592423,
		}},
		{123456789, [5]float64{
			0.2577907438389957, 0.9707721115555614, 0.7853280142880976,
			0.20616457983851433, 0.30307188746519387,
		}},
		// Seed with the top bit set: this is the case that separates a logical
		// shift from an arithmetic one. A Go port using int32 diverges here.
		{0xdeadbeef, [5]float64{
			0.9413696140982211, 0.26719574979506433, 0.772033357527107,
			0.35816076025366783, 0.47554167779162526,
		}},
	}
	for _, c := range cases {
		m := NewMulberry32(c.seed)
		for i, want := range c.want {
			got := m.Float64()
			if got != want {
				t.Errorf("seed %d draw %d: go %.17f, node %.17f", c.seed, i, got, want)
			}
		}
	}
}

func TestMulberry32IsDeterministic(t *testing.T) {
	a, b := NewMulberry32(12345), NewMulberry32(12345)
	for i := 0; i < 1000; i++ {
		if x, y := a.Uint32(), b.Uint32(); x != y {
			t.Fatalf("draw %d diverged: %d vs %d", i, x, y)
		}
	}
	c := NewMulberry32(12346)
	same := 0
	d := NewMulberry32(12345)
	for i := 0; i < 100; i++ {
		if c.Uint32() == d.Uint32() {
			same++
		}
	}
	if same > 2 {
		t.Errorf("different seeds produced %d/100 identical draws", same)
	}
}

func TestMulberry32InRange(t *testing.T) {
	m := NewMulberry32(7)
	for i := 0; i < 100000; i++ {
		v := m.Float64()
		if v < 0 || v >= 1 {
			t.Fatalf("draw %d out of [0,1): %v", i, v)
		}
	}
}

func BenchmarkMulberry32(b *testing.B) {
	m := NewMulberry32(1)
	b.ReportAllocs()
	for i := 0; i < b.N; i++ {
		_ = m.Uint32()
	}
}
