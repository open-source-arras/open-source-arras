package jsmath

var twom1000 = 9.33263618503218878990e-302

// From fdlibm.
func Exp(x float64) float64 {
	const (
		one        = 1.0
		oThreshold = 7.09782712893383973096e+02  // 0x40862E42, 0xFEFA39EF
		uThreshold = -7.45133219101941108420e+02 // 0xC0874910, 0xD52D3051
		ln2HI      = 6.93147180369123816490e-01  // 0x3FE62E42, 0xFEE00000
		ln2LO      = 1.90821492927058770002e-10  // 0x3DEA39EF, 0x35793C76
		invln2     = 1.44269504088896338700e+00  // 0x3FF71547, 0x652B82FE
		p1         = 1.66666666666666019037e-01  // 0x3FC55555, 0x5555553E
		p2         = -2.77777777770155933842e-03 // 0xBF66C16C, 0x16BEBD93
		p3         = 6.61375632143793436117e-05  // 0x3F11566A, 0xAF25DE2C
		p4         = -1.65339022054652515390e-06 // 0xBEBBBD41, 0xC5D26BF1
		p5         = 4.13813679705723846039e-08  // 0x3E663769, 0x72BEA4D0
		e          = 2.718281828459045           // 0x4005BF0A, 0x8B145769
		two1023    = 8.988465674311579539e307    // 0x1p1023
	)

	var y, hi, lo, c, t, twopk float64
	var k, xsb int32

	hx := hiWord(x)
	xsb = int32((hx >> 31) & 1) // sign bit of x
	hx &= 0x7FFFFFFF

	if hx >= 0x40862E42 { // |x| >= 709.78...
		if hx >= 0x7FF00000 {
			if (hx&0xFFFFF)|loWord(x) != 0 {
				return x + x // NaN
			}
			if xsb == 0 {
				return x // exp(+inf) = inf
			}
			return 0.0 // exp(-inf) = 0
		}
		if x > oThreshold {
			return huge * huge // overflow
		}
		if x < uThreshold {
			return twom1000 * twom1000 // underflow
		}
	}

	if hx > 0x3FD62E42 { // |x| > 0.5*ln2
		if hx < 0x3FF0A2B2 { // and |x| < 1.5*ln2
			// V8 carries an explicit special case for exp(1) here, because the
			// algorithm below gets its last bit wrong. Keeping it is not optional:
			// dropping it puts us one ulp away from Node on exactly that input.
			if x == 1.0 {
				return e
			}
			if xsb == 0 {
				hi = x - ln2HI
				lo = ln2LO
			} else {
				hi = x + ln2HI
				lo = -ln2LO
			}
			k = 1 - xsb - xsb
		} else {
			if xsb == 0 {
				k = int32(invln2*x + 0.5)
			} else {
				k = int32(invln2*x - 0.5)
			}
			t = float64(k)
			hi = x - t*ln2HI // t*ln2HI is exact here
			lo = t * ln2LO
		}
		x = hi - lo
	} else if hx < 0x3E300000 { // |x| < 2**-28
		if huge+x > one {
			return one + x
		}
	} else {
		k = 0
	}

	t = x * x
	if k >= -1021 {
		twopk = insertWords(0x3FF00000+uint32(k)<<20, 0)
	} else {
		twopk = insertWords(0x3FF00000+uint32(k+1000)<<20, 0)
	}
	c = x - t*(p1+t*(p2+t*(p3+t*(p4+t*p5))))
	if k == 0 {
		return one - ((x*c)/(c-2.0) - x)
	}
	y = one - ((lo - (x*c)/(2.0-c)) - hi)
	if k >= -1021 {
		if k == 1024 {
			return y * 2.0 * two1023
		}
		return y * twopk
	}
	return y * twopk * twom1000
}
