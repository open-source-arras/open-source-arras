package jsmath

import "math"

var atanhi = [4]float64{
	4.63647609000806093515e-01, // 0x3FDDAC67, 0x0561BB4F
	7.85398163397448278999e-01, // 0x3FE921FB, 0x54442D18
	9.82793723247329054082e-01, // 0x3FEF730B, 0xD281F69B
	1.57079632679489655800e+00, // 0x3FF921FB, 0x54442D18
}

var atanlo = [4]float64{
	2.26987774529616870924e-17, // 0x3C7A2B7F, 0x222F65E2
	3.06161699786838301793e-17, // 0x3C81A626, 0x33145C07
	1.39033110312309984516e-17, // 0x3C700788, 0x7AF0CBBD
	6.12323399573676603587e-17, // 0x3C91A626, 0x33145C07
}

var aT = [11]float64{
	3.33333333333329318027e-01,  // 0x3FD55555, 0x5555550D
	-1.99999999998764832476e-01, // 0xBFC99999, 0x9998EBC4
	1.42857142725034663711e-01,  // 0x3FC24924, 0x920083FF
	-1.11111104054623557880e-01, // 0xBFBC71C6, 0xFE231671
	9.09088713343650656196e-02,  // 0x3FB745CD, 0xC54C206E
	-7.69187620504482999495e-02, // 0xBFB3B0F2, 0xAF749A6D
	6.66107313738753120669e-02,  // 0x3FB10D66, 0xA0D03D51
	-5.83357013379057348645e-02, // 0xBFADDE2D, 0x52DEFD9A
	4.97687799461593236017e-02,  // 0x3FA97B4B, 0x24760DEB
	-3.65315727442169155270e-02, // 0xBFA2B444, 0x2C6A6C2F
	1.62858201153657823623e-02,  // 0x3F90AD3A, 0xE322DA11
}

// Atan is fdlibm's atan: fold |x| into one of five ranges, evaluate an odd polynomial
// there, then add back the range's atan value from the tables above.
func Atan(x float64) float64 {
	const one = 1.0

	var w, s1, s2, z float64
	var id int32

	hx := int32(hiWord(x))
	ix := hx & 0x7FFFFFFF
	if ix >= 0x44100000 { // |x| >= 2^66, so atan(x) is pi/2 to the last bit
		low := loWord(x)
		if ix > 0x7FF00000 || (ix == 0x7FF00000 && low != 0) {
			return x + x // NaN
		}
		if hx > 0 {
			return atanhi[3] + atanlo[3]
		}
		return -atanhi[3] - atanlo[3]
	}
	if ix < 0x3FDC0000 { // |x| < 0.4375
		if ix < 0x3E400000 { // |x| < 2^-27, where atan(x) rounds to x
			if huge+x > one {
				return x
			}
		}
		id = -1
	} else {
		x = math.Abs(x)
		if ix < 0x3FF30000 { // |x| < 1.1875
			if ix < 0x3FE60000 { // 7/16 <= |x| < 11/16
				id = 0
				x = (2.0*x - one) / (2.0 + x)
			} else { // 11/16 <= |x| < 19/16
				id = 1
				x = (x - one) / (x + one)
			}
		} else {
			if ix < 0x40038000 { // |x| < 2.4375
				id = 2
				x = (x - 1.5) / (one + 1.5*x)
			} else { // 2.4375 <= |x| < 2^66
				id = 3
				x = -1.0 / x
			}
		}
	}
	z = x * x
	w = z * z
	s1 = z * (aT[0] + w*(aT[2]+w*(aT[4]+w*(aT[6]+w*(aT[8]+w*aT[10])))))
	s2 = w * (aT[1] + w*(aT[3]+w*(aT[5]+w*(aT[7]+w*aT[9]))))
	if id < 0 {
		return x - x*(s1+s2)
	}
	z = atanhi[id] - ((x*(s1+s2) - atanlo[id]) - x)
	if hx < 0 {
		return -z
	}
	return z
}

var atan2Tiny = 1.0e-300

var atan2PiLo = 1.2246467991473531772e-16 // 0x3CA1A626, 0x33145C07

func Atan2(y, x float64) float64 {
	const (
		zero = 0.0
		piO4 = 7.8539816339744827900e-01 // 0x3FE921FB, 0x54442D18
		piO2 = 1.5707963267948965580e+00 // 0x3FF921FB, 0x54442D18
		pi   = 3.1415926535897931160e+00 // 0x400921FB, 0x54442D18
	)

	var z float64
	var k, m int32

	hx := int32(hiWord(x))
	lx := loWord(x)
	ix := hx & 0x7FFFFFFF
	hy := int32(hiWord(y))
	ly := loWord(y)
	iy := hy & 0x7FFFFFFF
	if (uint32(ix)|((lx|-lx)>>31)) > 0x7FF00000 ||
		(uint32(iy)|((ly|-ly)>>31)) > 0x7FF00000 {
		return x + y // x or y is NaN
	}
	if (uint32(hx)-0x3FF00000)|lx == 0 {
		return Atan(y) // x == 1.0
	}
	m = ((hy >> 31) & 1) | ((hx >> 30) & 2) // 2*sign(x) + sign(y)

	if iy|int32(ly) == 0 { // y == 0
		switch m {
		case 0, 1:
			return y // atan2(+-0, +anything) = +-0
		case 2:
			return pi + atan2Tiny
		case 3:
			return -pi - atan2Tiny
		}
	}
	if ix|int32(lx) == 0 { // x == 0
		if hy < 0 {
			return -piO2 - atan2Tiny
		}
		return piO2 + atan2Tiny
	}

	if ix == 0x7FF00000 { // x is infinite
		if iy == 0x7FF00000 {
			switch m {
			case 0:
				return piO4 + atan2Tiny
			case 1:
				return -piO4 - atan2Tiny
			case 2:
				return 3.0*piO4 + atan2Tiny
			case 3:
				return -3.0*piO4 - atan2Tiny
			}
		} else {
			switch m {
			case 0:
				return zero
			case 1:
				// atan2(-finite, +inf) is -0. Copysign rather than -zero because Go
				// constants have no signed zero: the constant expression -0.0 folds
				// to +0, and the corpus's sign-combination samples catch it.
				return math.Copysign(0, -1)
			case 2:
				return pi + atan2Tiny
			case 3:
				return -pi - atan2Tiny
			}
		}
	}
	if iy == 0x7FF00000 { // y is infinite
		if hy < 0 {
			return -piO2 - atan2Tiny
		}
		return piO2 + atan2Tiny
	}

	k = (iy - ix) >> 20
	if k > 60 { // |y/x| > 2**60, so the answer is pi/2 either way
		z = piO2 + 0.5*atan2PiLo
		m &= 1
	} else if hx < 0 && k < -60 { // 0 > |y|/x > -2**-60
		z = 0.0
	} else {
		z = Atan(math.Abs(y / x))
	}
	switch m {
	case 0:
		return z
	case 1:
		return -z
	case 2:
		return pi - (z - atan2PiLo)
	default:
		return (z - atan2PiLo) - pi
	}
}
