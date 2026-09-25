package jsmath

import "math"

var (
	bp  = [2]float64{1.0, 1.5}
	dpH = [2]float64{0.0, 5.84962487220764160156e-01}
	dpL = [2]float64{0.0, 1.35003920212974897128e-08}
)

// Pow is fdlibm's __ieee754_pow. Carries log2(x) as a high-low pair for precision.
func Pow(x, y float64) float64 {
	const (
		zero  = 0.0
		one   = 1.0
		two   = 2.0
		two53 = 9007199254740992.0 // 0x43400000, 0x00000000

		l1 = 5.99999999999994648725e-01 // 0x3FE33333, 0x33333303
		l2 = 4.28571428578550184252e-01 // 0x3FDB6DB6, 0xDB6FABFF
		l3 = 3.33333329818377432918e-01 // 0x3FD55555, 0x518F264D
		l4 = 2.72728123808534006489e-01 // 0x3FD17460, 0xA91D4101
		l5 = 2.30660745775561754067e-01 // 0x3FCD864A, 0x93C9DB65
		l6 = 2.06975017800338417784e-01 // 0x3FCA7E28, 0x4A454EEF

		p1 = 1.66666666666666019037e-01  // 0x3FC55555, 0x5555553E
		p2 = -2.77777777770155933842e-03 // 0xBF66C16C, 0x16BEBD93
		p3 = 6.61375632143793436117e-05  // 0x3F11566A, 0xAF25DE2C
		p4 = -1.65339022054652515390e-06 // 0xBEBBBD41, 0xC5D26BF1
		p5 = 4.13813679705723846039e-08  // 0x3E663769, 0x72BEA4D0

		lg2    = 6.93147180559945286227e-01  // 0x3FE62E42, 0xFEFA39EF
		lg2H   = 6.93147182464599609375e-01  // 0x3FE62E43, 0x00000000
		lg2L   = -1.90465429995776804525e-09 // 0xBE205C61, 0x0CA86C39
		ovt    = 8.0085662595372944372e-17   // -(1024 - log2(overflow + half an ulp))
		cp     = 9.61796693925975554329e-01  // 2/(3*ln2)
		cpH    = 9.61796700954437255859e-01  // cp rounded to float
		cpL    = -7.02846165095275826516e-09 // the tail of cpH
		ivln2  = 1.44269504088896338700e+00  // 1/ln2
		ivln2H = 1.44269502162933349609e+00
		ivln2L = 1.92596299112661746887e-08
	)

	var z, ax, zH, zL, pH, pL float64
	var y1, t1, t2, r, s, t, u, v, w float64
	var i, j, k, yisint, n int32

	hx := int32(hiWord(x))
	lx := loWord(x)
	hy := int32(hiWord(y))
	ly := loWord(y)
	ix := hx & 0x7FFFFFFF
	iy := hy & 0x7FFFFFFF

	if uint32(iy)|ly == 0 { // x**0 is 1 for every x, NaN included
		return one
	}

	if ix > 0x7FF00000 || (ix == 0x7FF00000 && lx != 0) ||
		iy > 0x7FF00000 || (iy == 0x7FF00000 && ly != 0) {
		return x + y // NaN in, NaN out
	}

	// yisint: 0 if y is not an integer, 1 if odd, 2 if even. Only matters for x < 0,
	// where it decides the sign and whether the result exists at all.
	yisint = 0
	if hx < 0 {
		if iy >= 0x43400000 {
			yisint = 2 // too large to be anything but an even integer
		} else if iy >= 0x3FF00000 {
			k = (iy >> 20) - 0x3FF
			if k > 20 {
				j = int32(ly >> uint32(52-k))
				if uint32(j<<uint32(52-k)) == ly {
					yisint = 2 - (j & 1)
				}
			} else if ly == 0 {
				j = iy >> uint32(20-k)
				if j<<uint32(20-k) == iy {
					yisint = 2 - (j & 1)
				}
			}
		}
	}

	if ly == 0 {
		if iy == 0x7FF00000 { // y is +-inf
			if (uint32(ix)-0x3FF00000)|lx == 0 {
				return y - y // (+-1) ** (+-inf) is NaN, per ECMAScript rather than IEEE
			} else if ix >= 0x3FF00000 { // (|x|>1) ** (+-inf) = inf, 0
				if hy >= 0 {
					return y
				}
				return zero
			} else { // (|x|<1) ** (-inf, +inf) = inf, 0
				if hy < 0 {
					return -y
				}
				return zero
			}
		}
		if iy == 0x3FF00000 { // y is +-1
			if hy < 0 {
				return one / x
			}
			return x
		}
		if hy == 0x40000000 { // y is 2
			return x * x
		}
		if hy == 0x3FE00000 { // y is 0.5
			if hx >= 0 {
				return math.Sqrt(x)
			}
		}
	}

	ax = math.Abs(x)
	if lx == 0 { // x is +-0, +-inf or +-1
		if ix == 0x7FF00000 || ix == 0 || ix == 0x3FF00000 {
			z = ax
			if hy < 0 {
				z = one / z
			}
			if hx < 0 {
				if (uint32(ix)-0x3FF00000)|uint32(yisint) == 0 {
					z = math.NaN() // (-1) ** non-integer
				} else if yisint == 1 {
					z = -z // (x<0) ** odd = -(|x| ** odd)
				}
			}
			return z
		}
	}

	n = (hx >> 31) + 1

	if n|yisint == 0 { // a negative base to a non-integer power has no real value
		return math.NaN()
	}

	s = one // sign of the result: -1 only for a negative base to an odd power
	if n|(yisint-1) == 0 {
		s = -one
	}

	if iy > 0x41E00000 { // |y| > 2**31
		if iy > 0x43F00000 { // |y| > 2**64, so this must over- or underflow
			if ix <= 0x3FEFFFFF {
				if hy < 0 {
					return huge * huge
				}
				return tiny * tiny
			}
			if ix >= 0x3FF00000 {
				if hy > 0 {
					return huge * huge
				}
				return tiny * tiny
			}
		}
		// Over- or underflow unless x is very close to one.
		if ix < 0x3FEFFFFF {
			if hy < 0 {
				return s * huge * huge
			}
			return s * tiny * tiny
		}
		if ix > 0x3FF00000 {
			if hy > 0 {
				return s * huge * huge
			}
			return s * tiny * tiny
		}
		// |1-x| is now at most 2**-20, so four terms of the series are enough.
		t = ax - one // t has 20 trailing zeros
		w = (t * t) * (0.5 - t*(0.3333333333333333333333-t*0.25))
		u = ivln2H * t // ivln2H has 21 significant bits
		v = t*ivln2L - w*ivln2
		t1 = u + v
		t1 = setLoWord(t1, 0)
		t2 = v - (t1 - u)
	} else {
		var ss, s2, sH, sL, tH, tL float64
		n = 0
		if ix < 0x00100000 { // subnormal x
			ax *= two53
			n -= 53
			ix = int32(hiWord(ax))
		}
		n += (ix >> 20) - 0x3FF
		j = ix & 0x000FFFFF
		// Fold the mantissa into [sqrt(2)/2, sqrt(2)) around either 1.0 or 1.5,
		// whichever leaves (x-bp)/(x+bp) smaller.
		ix = j | 0x3FF00000
		if j <= 0x3988E {
			k = 0 // |x| < sqrt(3/2)
		} else if j < 0xBB67A {
			k = 1 // |x| < sqrt(3)
		} else {
			k = 0
			n++
			ix -= 0x00100000
		}
		ax = setHiWord(ax, uint32(ix))

		u = ax - bp[k]
		v = one / (ax + bp[k])
		ss = u * v
		sH = ss
		sH = setLoWord(sH, 0)
		tH = zero
		tH = setHiWord(tH, uint32(((ix>>1)|0x20000000)+0x00080000+(k<<18)))
		tL = ax - (tH - bp[k])
		sL = v * ((u - sH*tH) - sH*tL)
		s2 = ss * ss
		r = s2 * s2 * (l1 + s2*(l2+s2*(l3+s2*(l4+s2*(l5+s2*l6)))))
		r += sL * (sH + ss)
		s2 = sH * sH
		tH = 3.0 + s2 + r
		tH = setLoWord(tH, 0)
		tL = r - ((tH - 3.0) - s2)
		u = sH * tH
		v = sL*tH + tL*ss
		pH = u + v
		pH = setLoWord(pH, 0)
		pL = v - (pH - u)
		zH = cpH * pH
		zL = cpL*pH + pL*cp + dpL[k]
		// log2(|x|) = n + dpH[k] + zH + zL, carried as t1 (exact head) plus t2.
		t = float64(n)
		t1 = ((zH + zL) + dpH[k]) + t
		t1 = setLoWord(t1, 0)
		t2 = zL - (((t1 - t) - dpH[k]) - zH)
	}

	// Split y the same way, then form y*log2(|x|) as pH + pL.
	y1 = y
	y1 = setLoWord(y1, 0)
	pL = (y-y1)*t1 + y*t2
	pH = y1 * t1
	z = pL + pH
	j = int32(hiWord(z))
	i = int32(loWord(z))
	if j >= 0x40900000 { // z >= 1024
		if (uint32(j)-0x40900000)|uint32(i) != 0 { // z > 1024
			return s * huge * huge
		}
		if pL+ovt > z-pH {
			return s * huge * huge
		}
	} else if (j & 0x7FFFFFFF) >= 0x4090CC00 { // z <= -1075
		if (uint32(j)-0xC090CC00)|uint32(i) != 0 { // z < -1075
			return s * tiny * tiny
		}
		if pL <= z-pH {
			return s * tiny * tiny
		}
	}

	// 2**(pH+pL), with the integer part peeled off into n.
	i = j & 0x7FFFFFFF
	k = (i >> 20) - 0x3FF
	n = 0
	if i > 0x3FE00000 { // |z| > 0.5, so n = round(z)
		n = j + (0x00100000 >> uint32(k+1))
		k = ((n & 0x7FFFFFFF) >> 20) - 0x3FF
		t = zero
		t = setHiWord(t, uint32(n&^(int32(0x000FFFFF)>>uint32(k))))
		n = ((n & 0x000FFFFF) | 0x00100000) >> uint32(20-k)
		if j < 0 {
			n = -n
		}
		pH -= t
	}
	t = pL + pH
	t = setLoWord(t, 0)
	u = t * lg2H
	v = (pL-(t-pH))*lg2 + t*lg2L
	z = u + v
	w = v - (z - u)
	t = z * z
	t1 = z - t*(p1+t*(p2+t*(p3+t*(p4+t*p5))))
	r = (z * t1) / ((t1 - two) - (w + z*w))
	z = one - (r - z)
	j = int32(hiWord(z))
	j += int32(uint32(n) << 20)
	if (j >> 20) <= 0 {
		z = math.Ldexp(z, int(n)) // subnormal output
	} else {
		z = setHiWord(z, uint32(int32(hiWord(z))+int32(uint32(n)<<20)))
	}
	return s * z
}
