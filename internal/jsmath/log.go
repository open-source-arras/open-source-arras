package jsmath

import "math"

// Log is fdlibm's __ieee754_log.
func Log(x float64) float64 {
	const (
		ln2Hi = 6.93147180369123816490e-01 // 3fe62e42 fee00000
		ln2Lo = 1.90821492927058770002e-10 // 3dea39ef 35793c76
		two54 = 1.80143985094819840000e+16 // 43500000 00000000
		lg1   = 6.666666666666735130e-01   // 3FE55555 55555593
		lg2   = 3.999999999940941908e-01   // 3FD99999 9997FA04
		lg3   = 2.857142874366239149e-01   // 3FD24924 94229359
		lg4   = 2.222219843214978396e-01   // 3FCC71C5 1D8E78AF
		lg5   = 1.818357216161805012e-01   // 3FC74664 96CB03DE
		lg6   = 1.531383769920937332e-01   // 3FC39A09 D078C69F
		lg7   = 1.479819860511658591e-01   // 3FC2F112 DF3E5244
	)

	var hfsq, f, s, z, r, w, t1, t2, dk float64
	var k, hx, i, j int32

	hx = int32(hiWord(x))
	lx := loWord(x)

	k = 0
	if hx < 0x00100000 { // x < 2**-1022
		if (hx&0x7FFFFFFF)|int32(lx) == 0 {
			return math.Inf(-1) // log(+-0) = -inf
		}
		if hx < 0 {
			return math.NaN() // log of a negative is NaN
		}
		k -= 54
		x *= two54 // subnormal, scale it up
		hx = int32(hiWord(x))
	}
	if hx >= 0x7FF00000 {
		return x + x
	}
	k += (hx >> 20) - 1023
	hx &= 0x000FFFFF
	i = (hx + 0x95F64) & 0x100000
	x = setHiWord(x, uint32(hx|(i^0x3FF00000))) // normalize x or x/2
	k += i >> 20
	f = x - 1.0
	if (0x000FFFFF & (2 + hx)) < 3 { // -2**-20 <= f < 2**-20
		if f == 0 {
			if k == 0 {
				return 0
			}
			dk = float64(k)
			return dk*ln2Hi + dk*ln2Lo
		}
		r = f * f * (0.5 - 0.33333333333333333*f)
		if k == 0 {
			return f - r
		}
		dk = float64(k)
		return dk*ln2Hi - ((r - dk*ln2Lo) - f)
	}
	s = f / (2.0 + f)
	dk = float64(k)
	z = s * s
	i = hx - 0x6147A
	w = z * z
	j = 0x6B851 - hx
	t1 = w * (lg2 + w*(lg4+w*lg6))
	t2 = z * (lg1 + w*(lg3+w*(lg5+w*lg7)))
	i |= j
	r = t2 + t1
	if i > 0 {
		hfsq = 0.5 * f * f
		if k == 0 {
			return f - (hfsq - s*(hfsq+r))
		}
		return dk*ln2Hi - ((hfsq - (s*(hfsq+r) + dk*ln2Lo)) - f)
	}
	if k == 0 {
		return f - s*(f-r)
	}
	return dk*ln2Hi - ((s*(f-r) - dk*ln2Lo) - f)
}
