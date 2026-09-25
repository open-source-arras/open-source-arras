package jsmath

import "math"

// kernelSin evaluates sin(x+y) for |x| <= pi/4.
func kernelSin(x, y float64, iy int32) float64 {
	const (
		half = 0.5
		s1   = -1.66666666666666324348e-01 // 0xBFC55555, 0x55555549
		s2   = 8.33333333332248946124e-03  // 0x3F811111, 0x1110F8A6
		s3   = -1.98412698298579493134e-04 // 0xBF2A01A0, 0x19C161D5
		s4   = 2.75573137070700676789e-06  // 0x3EC71DE3, 0x57B1FE7D
		s5   = -2.50507602534068634195e-08 // 0xBE5AE5E6, 0x8A2B9CEB
		s6   = 1.58969099521155010221e-10  // 0x3DE5D93A, 0x5ACFD57C
	)

	ix := int32(hiWord(x)) & 0x7FFFFFFF
	if ix < 0x3E400000 { // |x| < 2**-27, where sin(x) rounds to x
		if int32(x) == 0 {
			return x
		}
	}
	z := x * x
	v := z * x
	r := s2 + z*(s3+z*(s4+z*(s5+z*s6)))
	if iy == 0 {
		return x + v*(s1+z*r)
	}
	return x - ((z*(half*y-v*r) - y) - v*s1)
}

// kernelCos evaluates cos(x+y) for |x| <= pi/4.
func kernelCos(x, y float64) float64 {
	const (
		one = 1.0
		c1  = 4.16666666666666019037e-02  // 0x3FA55555, 0x5555554C
		c2  = -1.38888888888741095749e-03 // 0xBF56C16C, 0x16C15177
		c3  = 2.48015872894767294178e-05  // 0x3EFA01A0, 0x19CB1590
		c4  = -2.75573143513906633035e-07 // 0xBE927E4F, 0x809C52AD
		c5  = 2.08757232129817482790e-09  // 0x3E21EE9E, 0xBDB4B1C4
		c6  = -1.13596475577881948265e-11 // 0xBDA8FAE9, 0xBE8838D4
	)

	ix := int32(hiWord(x)) & 0x7FFFFFFF
	if ix < 0x3E400000 { // |x| < 2**-27, where cos(x) rounds to 1
		if int32(x) == 0 {
			return one
		}
	}
	z := x * x
	r := z * (c1 + z*(c2+z*(c3+z*(c4+z*(c5+z*c6)))))
	if ix < 0x3FD33333 { // |x| < 0.3
		return one - (0.5*z - (z*r - x*y))
	}
	var qx float64
	if ix > 0x3FE90000 { // |x| > 0.78125
		qx = 0.28125
	} else {
		qx = insertWords(uint32(ix-0x00200000), 0) // |x|/4, low bits dropped
	}
	iz := 0.5*z - qx
	a := one - qx
	return a - (iz - (z*r - x*y))
}

// tanCoef is FDLIBM's tan polynomial coefficients.
var tanCoef = [16]float64{
	3.33333333333334091986e-01,  // 3FD55555, 55555563
	1.33333333333201242699e-01,  // 3FC11111, 1110FE7A
	5.39682539762260521377e-02,  // 3FABA1BA, 1BB341FE
	2.18694882948595424599e-02,  // 3F9664F4, 8406D637
	8.86323982359930005737e-03,  // 3F8226E3, E96E8493
	3.59207910759131235356e-03,  // 3F6D6D22, C9560328
	1.45620945432529025516e-03,  // 3F57DBC8, FEE08315
	5.88041240820264096874e-04,  // 3F4344D8, F2F26501
	2.46463134818469906812e-04,  // 3F3026F7, 1A8D1068
	7.81794442939557092300e-05,  // 3F147E88, A03792A6
	7.14072491382608190305e-05,  // 3F12B80F, 32F0A7E9
	-1.85586374855275456654e-05, // BEF375CB, DB605373
	2.59073051863633712884e-05,  // 3EFB2A70, 74BF7AD4
	1.00000000000000000000e+00,  // one
	7.85398163397448278999e-01,  // pi/4
	3.06161699786838301793e-17,  // the tail of pi/4
}

// kernelTan evaluates tan(x+y) for |x| <= pi/4.
func kernelTan(x, y float64, iy int32) float64 {
	one, pio4, pio4lo := tanCoef[13], tanCoef[14], tanCoef[15]

	var z, r, v, w, s float64

	hx := int32(hiWord(x))
	ix := hx & 0x7FFFFFFF
	if ix < 0x3E300000 { // |x| < 2**-28
		if int32(x) == 0 {
			low := loWord(x)
			if (uint32(ix)|low)|uint32(iy+1) == 0 {
				return one / math.Abs(x)
			}
			if iy == 1 {
				return x
			}
			// -1/(x+y), computed so the reciprocal of a tiny number stays accurate.
			var a, tt float64
			z = x + y
			w = z
			z = setLoWord(z, 0)
			v = y - (z - x)
			a = -one / w
			tt = a
			tt = setLoWord(tt, 0)
			s = one + tt*z
			return tt + a*(s+tt*v)
		}
	}
	if ix >= 0x3FE59428 { // |x| >= 0.6744: work with pi/4 - x instead
		if hx < 0 {
			x = -x
			y = -y
		}
		z = pio4 - x
		w = pio4lo - y
		x = z + w
		y = 0.0
	}
	z = x * x
	w = z * z
	r = tanCoef[1] + w*(tanCoef[3]+w*(tanCoef[5]+w*(tanCoef[7]+w*(tanCoef[9]+w*tanCoef[11]))))
	v = z * (tanCoef[2] + w*(tanCoef[4]+w*(tanCoef[6]+w*(tanCoef[8]+w*(tanCoef[10]+w*tanCoef[12])))))
	s = z * x
	r = y + z*(s*(r+v)+y)
	r += tanCoef[0] * s
	w = x + r
	if ix >= 0x3FE59428 {
		v = float64(iy)
		return float64(1-((hx>>30)&2)) * (v - 2.0*(x-(w*w/(w+v)-r)))
	}
	if iy == 1 {
		return w
	}
	// -1/(x+r) again, accurately rather than in one division.
	var a, tt float64
	z = w
	z = setLoWord(z, 0)
	v = r - (z - x) // z+v = r+x
	a = -1.0 / w
	tt = a
	tt = setLoWord(tt, 0)
	s = 1.0 + tt*z
	return tt + a*(s+tt*v)
}

func Sin(x float64) float64 {
	ix := int32(hiWord(x)) & 0x7FFFFFFF
	if ix <= 0x3FE921FB { // |x| ~< pi/4
		return kernelSin(x, 0.0, 0)
	}
	if ix >= 0x7FF00000 { // sin(Inf or NaN) is NaN
		return x - x
	}
	var y [2]float64
	n := ieee754RemPio2(x, &y)
	switch n & 3 {
	case 0:
		return kernelSin(y[0], y[1], 1)
	case 1:
		return kernelCos(y[0], y[1])
	case 2:
		return -kernelSin(y[0], y[1], 1)
	default:
		return -kernelCos(y[0], y[1])
	}
}

func Cos(x float64) float64 {
	ix := int32(hiWord(x)) & 0x7FFFFFFF
	if ix <= 0x3FE921FB {
		return kernelCos(x, 0.0)
	}
	if ix >= 0x7FF00000 { // cos(Inf or NaN) is NaN
		return x - x
	}
	var y [2]float64
	n := ieee754RemPio2(x, &y)
	switch n & 3 {
	case 0:
		return kernelCos(y[0], y[1])
	case 1:
		return -kernelSin(y[0], y[1], 1)
	case 2:
		return -kernelCos(y[0], y[1])
	default:
		return kernelSin(y[0], y[1], 1)
	}
}

func Tan(x float64) float64 {
	ix := int32(hiWord(x)) & 0x7FFFFFFF
	if ix <= 0x3FE921FB {
		return kernelTan(x, 0.0, 1)
	}
	if ix >= 0x7FF00000 { // tan(Inf or NaN) is NaN
		return x - x
	}
	var y [2]float64
	n := ieee754RemPio2(x, &y)
	// 1 for even n, -1 for odd: an odd multiple of pi/2 turns tan into -1/tan.
	return kernelTan(y[0], y[1], 1-((n&1)<<1))
}
