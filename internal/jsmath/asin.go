package jsmath

import "math"

const (
	asPS0 = 1.66666666666666657415e-01  // 0x3FC55555, 0x55555555
	asPS1 = -3.25565818622400915405e-01 // 0xBFD4D612, 0x03EB6F7D
	asPS2 = 2.01212532134862925881e-01  // 0x3FC9C155, 0x0E884455
	asPS3 = -4.00555345006794114027e-02 // 0xBFA48228, 0xB5688F3B
	asPS4 = 7.91534994289814532176e-04  // 0x3F49EFE0, 0x7501B288
	asPS5 = 3.47933107596021167570e-05  // 0x3F023DE1, 0x0DFDF709
	asQS1 = -2.40339491173441421878e+00 // 0xC0033A27, 0x1C8A2D4B
	asQS2 = 2.02094576023350569471e+00  // 0x40002AE5, 0x9C598AC8
	asQS3 = -6.88283971605453293030e-01 // 0xBFE6066C, 0x1B8D0159
	asQS4 = 7.70381505559019352791e-02  // 0x3FB3B8C5, 0xB12E9282

	asPio2Hi = 1.57079632679489655800e+00 // 0x3FF921FB, 0x54442D18
	asPio2Lo = 6.12323399573676603587e-17 // 0x3C91A626, 0x33145C07
	asPio4Hi = 7.85398163397448278999e-01 // 0x3FE921FB, 0x54442D18
	asPi     = 3.14159265358979311600e+00 // 0x400921FB, 0x54442D18
)

func asinR(t float64) float64 {
	p := t * (asPS0 + t*(asPS1+t*(asPS2+t*(asPS3+t*(asPS4+t*asPS5)))))
	q := 1.0 + t*(asQS1+t*(asQS2+t*(asQS3+t*asQS4)))
	return p / q
}

func Asin(x float64) float64 {
	const one = 1.0

	var t, w, c, r, s float64

	hx := int32(hiWord(x))
	ix := hx & 0x7FFFFFFF
	if ix >= 0x3FF00000 { // |x| >= 1
		lx := loWord(x)
		if (uint32(ix)-0x3FF00000)|lx == 0 { // |x| == 1
			return x*asPio2Hi + x*asPio2Lo
		}
		return math.NaN()
	} else if ix < 0x3FE00000 { // |x| < 0.5
		if ix < 0x3E400000 { // |x| < 2**-27, where asin(x) rounds to x
			if huge+x > one {
				return x
			}
		} else {
			t = x * x
		}
		w = asinR(t)
		return x + x*w
	}
	// 0.5 <= |x| < 1: asin(x) = pi/2 - 2*asin(sqrt((1-|x|)/2)).
	w = one - math.Abs(x)
	t = w * 0.5
	p := t * (asPS0 + t*(asPS1+t*(asPS2+t*(asPS3+t*(asPS4+t*asPS5)))))
	q := one + t*(asQS1+t*(asQS2+t*(asQS3+t*asQS4)))
	s = math.Sqrt(t)
	if ix >= 0x3FEF3333 { // |x| > 0.975, where the cancellation is harmless
		w = p / q
		t = asPio2Hi - (2.0*(s+s*w) - asPio2Lo)
	} else {
		// Split sqrt(t) into an exactly-representable head and the correction c, so
		// pi/4 - 2*w stays exact and the subtraction does not lose the answer.
		w = s
		w = setLoWord(w, 0)
		c = (t - w*w) / (s + w)
		r = p / q
		p = 2.0*s*r - (asPio2Lo - 2.0*c)
		q = asPio4Hi - 2.0*w
		t = asPio4Hi - (p - q)
	}
	if hx > 0 {
		return t
	}
	return -t
}

func Acos(x float64) float64 {
	const one = 1.0

	var z, r, w, s, c, df float64

	hx := int32(hiWord(x))
	ix := hx & 0x7FFFFFFF
	if ix >= 0x3FF00000 { // |x| >= 1
		lx := loWord(x)
		if (uint32(ix)-0x3FF00000)|lx == 0 { // |x| == 1
			if hx > 0 {
				return 0.0
			}
			return asPi + 2.0*asPio2Lo
		}
		return math.NaN() // acos of |x| > 1
	}
	if ix < 0x3FE00000 { // |x| < 0.5
		if ix <= 0x3C600000 { // |x| < 2**-57, where acos(x) rounds to pi/2
			return asPio2Hi + asPio2Lo
		}
		z = x * x
		r = asinR(z)
		return asPio2Hi - (x - (asPio2Lo - x*r))
	} else if hx < 0 { // x < -0.5
		z = (one + x) * 0.5
		r = asinR(z)
		s = math.Sqrt(z)
		w = r*s - asPio2Lo
		return asPi - 2.0*(s+w)
	}
	// x > 0.5. Same trick as asin: df is sqrt(z) with its low half cleared, so
	// df*df is exact and c carries what that dropped.
	z = (one - x) * 0.5
	s = math.Sqrt(z)
	df = s
	df = setLoWord(df, 0)
	c = (z - df*df) / (s + df)
	r = asinR(z)
	w = r*s + c
	return 2.0 * (df + w)
}
