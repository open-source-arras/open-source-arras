package jsmath

import "math"

// From fdlibm.
func Cbrt(x float64) float64 {
	const (
		b1 = 715094163 // (1023 - 1023/3 - 0.03306235651) * 2**20
		b2 = 696219795 // (1023 - 1023/3 - 54/3 - 0.03306235651) * 2**20

		// |1/cbrt(x) - p(x)| < 2**-23.5 over the interval the first estimate lands in.
		p0 = 1.87595182427177009643   // 0x3FFE03E6, 0x0F61E692
		p1 = -1.88497979543377169875  // 0xBFFE28E0, 0x92F02420
		p2 = 1.621429720105354466140  // 0x3FF9F160, 0x4A49D6C2
		p3 = -0.758397934778766047437 // 0xBFE844CB, 0xBEE751D9
		p4 = 0.145996192886612446982  // 0x3FC2B000, 0xD4E4EDD7
	)

	var r, s, t, w float64

	hx := int32(hiWord(x))
	low := loWord(x)
	sign := uint32(hx) & 0x80000000
	hx = int32(uint32(hx) ^ sign)
	if hx >= 0x7FF00000 {
		return x + x // cbrt(NaN or Inf) is itself
	}

	if hx < 0x00100000 { // zero or subnormal
		if hx|int32(low) == 0 {
			return x // cbrt(0) is itself
		}
		t = setHiWord(0, 0x43500000) // t = 2**54
		t *= x
		high := hiWord(t)
		t = insertWords(sign|((high&0x7FFFFFFF)/3+b2), 0)
	} else {
		t = insertWords(sign|(uint32(hx)/3+b1), 0)
	}

	r = (t * t) * (t / x)
	t = t * ((p0 + r*(p1+r*p2)) + ((r*r)*r)*(p3+r*p4))

	// Round t to 23 bits: Newton step needs exact t*t.
	bits := math.Float64bits(t)
	bits = (bits + 0x80000000) & 0xFFFFFFFFC0000000
	t = math.Float64frombits(bits)

	s = t * t             // exact
	r = x / s             // error <= 0.5 ulp
	w = t + t             // exact
	r = (r - t) / (w + r) // r-t is exact, w+r ~= 3*t
	t = t + t*r

	return t
}
