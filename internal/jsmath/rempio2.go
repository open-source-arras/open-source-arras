package jsmath

import "math"

// twoOverPi is 2/pi in 24-bit chunks for high-precision reduction.
var twoOverPi = [66]int32{
	0xA2F983, 0x6E4E44, 0x1529FC, 0x2757D1, 0xF534DD, 0xC0DB62, 0x95993C,
	0x439041, 0xFE5163, 0xABDEBB, 0xC561B7, 0x246E3A, 0x424DD2, 0xE00649,
	0x2EEA09, 0xD1921C, 0xFE1DEB, 0x1CB129, 0xA73EE8, 0x8235F5, 0x2EBB44,
	0x84E99C, 0x7026B4, 0x5F7E41, 0x3991D6, 0x398353, 0x39F49C, 0x845F8B,
	0xBDF928, 0x3B1FF8, 0x97FFDE, 0x05980F, 0xEF2F11, 0x8B5A0A, 0x6D1F6D,
	0x367ECF, 0x27CB09, 0xB74F46, 0x3F669E, 0x5FEA2D, 0x7527BA, 0xC7EBE5,
	0xF17B3D, 0x0739F7, 0x8A5292, 0xEA6BFB, 0x5FB11F, 0x8D5D08, 0x560330,
	0x46FC7B, 0x6BABF0, 0xCFBC20, 0x9AF436, 0x1DA9E3, 0x91615E, 0xE61B08,
	0x659985, 0x5F14A0, 0x68408D, 0xFFD880, 0x4D7327, 0x310606, 0x1556CA,
	0x73A8C9, 0x60E27B, 0xC08C6B,
}

var npio2hw = [32]int32{
	0x3FF921FB, 0x400921FB, 0x4012D97C, 0x401921FB, 0x401F6A7A, 0x4022D97C,
	0x4025FDBB, 0x402921FB, 0x402C463A, 0x402F6A7A, 0x4031475C, 0x4032D97C,
	0x40346B9C, 0x4035FDBB, 0x40378FDB, 0x403921FB, 0x403AB41B, 0x403C463A,
	0x403DD85A, 0x403F6A7A, 0x40407E4C, 0x4041475C, 0x4042106C, 0x4042D97C,
	0x4043A28C, 0x40446B9C, 0x404534AC, 0x4045FDBB, 0x4046C6CB, 0x40478FDB,
	0x404858EB, 0x404921FB,
}

const (
	rpTwo24   = 1.67772160000000000000e+07 // 0x41700000, 0x00000000
	rpInvPio2 = 6.36619772367581382433e-01 // 53 bits of 2/pi;  0x3FE45F30, 0x6DC9C883
	rpPio2_1  = 1.57079632673412561417e+00 // 0x3FF921FB, 0x54400000
	rpPio2_1t = 6.07710050650619224932e-11 // 0x3DD0B461, 0x1A626331
	rpPio2_2  = 6.07710050630396597660e-11 // 0x3DD0B461, 0x1A600000
	rpPio2_2t = 2.02226624879595063154e-21 // 0x3BA3198A, 0x2E037073
	rpPio2_3  = 2.02226624871116645580e-21 // 0x3BA3198A, 0x2E000000
	rpPio2_3t = 8.47842766036889956997e-32 // 0x397B839A, 0x252049C1
)

// ieee754RemPio2 returns n, with x - n*(pi/2) left in y[0]+y[1].
func ieee754RemPio2(x float64, y *[2]float64) int32 {
	const half = 0.5

	var z, w, t, r, fn float64
	var tx [3]float64
	var e0, i, j, nx, n, ix, hx int32

	z = 0
	hx = int32(hiWord(x))
	ix = hx & 0x7FFFFFFF
	if ix <= 0x3FE921FB { // |x| ~<= pi/4, no reduction needed
		y[0] = x
		y[1] = 0
		return 0
	}
	if ix < 0x4002D97C { // |x| < 3pi/4, so n can only be +-1
		if hx > 0 {
			z = x - rpPio2_1
			if ix != 0x3FF921FB { // 33+53 bit pi is good enough
				y[0] = z - rpPio2_1t
				y[1] = (z - y[0]) - rpPio2_1t
			} else { // near pi/2, use 33+33+53 bit pi
				z -= rpPio2_2
				y[0] = z - rpPio2_2t
				y[1] = (z - y[0]) - rpPio2_2t
			}
			return 1
		}
		z = x + rpPio2_1
		if ix != 0x3FF921FB {
			y[0] = z + rpPio2_1t
			y[1] = (z - y[0]) + rpPio2_1t
		} else {
			z += rpPio2_2
			y[0] = z + rpPio2_2t
			y[1] = (z - y[0]) + rpPio2_2t
		}
		return -1
	}
	if ix <= 0x413921FB { // |x| ~<= 2^19*(pi/2), medium size
		t = math.Abs(x)
		n = int32(t*rpInvPio2 + half)
		fn = float64(n)
		r = t - fn*rpPio2_1
		w = fn * rpPio2_1t // 1st round good to 85 bit
		if n < 32 && ix != npio2hw[n-1] {
			y[0] = r - w // quick check no cancellation
		} else {
			var high uint32
			j = ix >> 20
			y[0] = r - w
			high = hiWord(y[0])
			i = j - int32((high>>20)&0x7FF)
			if i > 16 { // 2nd iteration needed, good to 118
				t = r
				w = fn * rpPio2_2
				r = t - w
				w = fn*rpPio2_2t - ((t - r) - w)
				y[0] = r - w
				high = hiWord(y[0])
				i = j - int32((high>>20)&0x7FF)
				if i > 49 { // 3rd iteration needed, 151 bits accurate
					t = r // covers all remaining cases
					w = fn * rpPio2_3
					r = t - w
					w = fn*rpPio2_3t - ((t - r) - w)
					y[0] = r - w
				}
			}
		}
		y[1] = (r - y[0]) - w
		if hx < 0 {
			y[0] = -y[0]
			y[1] = -y[1]
			return -n
		}
		return n
	}
	if ix >= 0x7FF00000 { // x is inf or NaN
		y[0] = x - x
		y[1] = y[0]
		return 0
	}
	z = setLoWord(z, loWord(x))
	e0 = (ix >> 20) - 1046 // e0 = ilogb(z) - 23
	z = setHiWord(z, uint32(ix-int32(uint32(e0)<<20)))
	for i = 0; i < 2; i++ {
		tx[i] = float64(int32(z))
		z = (z - tx[i]) * rpTwo24
	}
	tx[2] = z
	nx = 3
	for tx[nx-1] == 0 { // skip zero term
		nx--
	}
	n = kernelRemPio2(&tx, y, e0, nx)
	if hx < 0 {
		y[0] = -y[0]
		y[1] = -y[1]
		return -n
	}
	return n
}

var pio2Pieces = [8]float64{
	1.57079625129699707031e+00, // 0x3FF921FB, 0x40000000
	7.54978941586159635335e-08, // 0x3E74442D, 0x00000000
	5.39030252995776476554e-15, // 0x3CF84698, 0x80000000
	3.28200341580791294123e-22, // 0x3B78CC51, 0x60000000
	1.27065575308067607349e-29, // 0x39F01B83, 0x80000000
	1.22933308981111328932e-36, // 0x387A2520, 0x40000000
	2.73370053816464559624e-44, // 0x36E38222, 0x80000000
	2.16741683877804819444e-51, // 0x3569F31D, 0x00000000
}

// kernelRemPio2 computes extended-precision reduction with prec=2 for ieee754RemPio2.
func kernelRemPio2(x *[3]float64, y *[2]float64, e0, nx int32) int32 {
	const (
		two24  = 1.67772160000000000000e+07 // 0x41700000, 0x00000000
		twon24 = 5.96046447753906250000e-08 // 0x3E700000, 0x00000000
	)

	var jz, jx, jv, jp, jk, carry, n, i, j, k, m, q0, ih int32
	var iq [20]int32
	var z, fw float64
	var f, fq, q [20]float64

	jk = 4 // init_jk[prec] for prec == 2
	jp = jk

	jx = nx - 1
	jv = (e0 - 3) / 24
	if jv < 0 {
		jv = 0
	}
	q0 = e0 - 24*(jv+1)

	j = jv - jx
	m = jx + jk
	for i = 0; i <= m; i, j = i+1, j+1 {
		if j < 0 {
			f[i] = 0
		} else {
			f[i] = float64(twoOverPi[j])
		}
	}

	for i = 0; i <= jk; i++ {
		fw = 0
		for j = 0; j <= jx; j++ {
			fw += x[j] * f[jx+i-j]
		}
		q[i] = fw
	}

	jz = jk

recompute:
	for i, j, z = 0, jz, q[jz]; j > 0; i, j = i+1, j-1 {
		fw = float64(int32(twon24 * z))
		iq[i] = int32(z - two24*fw)
		z = q[j-1] + fw
	}

	z = math.Ldexp(z, int(q0))
	z -= 8.0 * math.Floor(z*0.125) // trim off integer >= 8
	n = int32(z)
	z -= float64(n)
	ih = 0
	if q0 > 0 { // need iq[jz-1] to determine n
		i = iq[jz-1] >> (24 - uint32(q0))
		n += i
		iq[jz-1] -= i << (24 - uint32(q0))
		ih = iq[jz-1] >> (23 - uint32(q0))
	} else if q0 == 0 {
		ih = iq[jz-1] >> 23
	} else if z >= 0.5 {
		ih = 2
	}

	if ih > 0 { // the fraction is above 1/2, so round up and take the complement
		n++
		carry = 0
		for i = 0; i < jz; i++ {
			j = iq[i]
			if carry == 0 {
				if j != 0 {
					carry = 1
					iq[i] = 0x1000000 - j
				}
			} else {
				iq[i] = 0xFFFFFF - j
			}
		}
		if q0 > 0 { // rare case: chance is 1 in 12
			switch q0 {
			case 1:
				iq[jz-1] &= 0x7FFFFF
			case 2:
				iq[jz-1] &= 0x3FFFFF
			}
		}
		if ih == 2 {
			z = 1.0 - z
			if carry != 0 {
				z -= math.Ldexp(1.0, int(q0))
			}
		}
	}

	if z == 0 {
		j = 0
		for i = jz - 1; i >= jk; i-- {
			j |= iq[i]
		}
		if j == 0 {
			for k = 1; jk >= k && iq[jk-k] == 0; k++ {
				// k = number of extra terms needed
			}
			for i = jz + 1; i <= jz+k; i++ {
				f[jx+i] = float64(twoOverPi[jv+i])
				fw = 0
				for j = 0; j <= jx; j++ {
					fw += x[j] * f[jx+i-j]
				}
				q[i] = fw
			}
			jz += k
			goto recompute
		}
	}

	if z == 0.0 { // chop off trailing zero digits
		jz--
		q0 -= 24
		for iq[jz] == 0 {
			jz--
			q0 -= 24
		}
	} else { // break z into 24-bit pieces if necessary
		z = math.Ldexp(z, int(-q0))
		if z >= two24 {
			fw = float64(int32(twon24 * z))
			iq[jz] = int32(z - two24*fw)
			jz++
			q0 += 24
			iq[jz] = int32(fw)
		} else {
			iq[jz] = int32(z)
		}
	}

	fw = math.Ldexp(1.0, int(q0))
	for i = jz; i >= 0; i-- {
		q[i] = fw * float64(iq[i])
		fw *= twon24
	}

	for i = jz; i >= 0; i-- {
		fw = 0
		for k = 0; k <= jp && k <= jz-i; k++ {
			fw += pio2Pieces[k] * q[i+k]
		}
		fq[jz-i] = fw
	}

	// prec == 2: hand back the sum and its rounding error.
	fw = 0
	for i = jz; i >= 0; i-- {
		fw += fq[i]
	}
	if ih == 0 {
		y[0] = fw
	} else {
		y[0] = -fw
	}
	fw = fq[0] - fw
	for i = 1; i <= jz; i++ {
		fw += fq[i]
	}
	if ih == 0 {
		y[1] = fw
	} else {
		y[1] = -fw
	}

	return n & 7
}
