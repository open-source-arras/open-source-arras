package jsutil

// Mulberry32 is the PRNG the differential harness runs on.
type Mulberry32 struct {
	state uint32
}

func NewMulberry32(seed uint32) *Mulberry32 {
	return &Mulberry32{state: seed}
}

func (m *Mulberry32) Uint32() uint32 {
	m.state += 0x6D2B79F5
	a := m.state
	t := (a ^ (a >> 15)) * (1 | a)
	t = (t + (t^(t>>7))*(61|t)) ^ t
	return t ^ (t >> 14)
}

func (m *Mulberry32) Float64() float64 {
	return float64(m.Uint32()) / 4294967296.0
}
