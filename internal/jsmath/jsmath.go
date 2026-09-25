// Package jsmath reproduces V8's Math.* results from fdlibm. See docs/verification.md.
package jsmath

import "math"

func Sqrt(x float64) float64 { return math.Sqrt(x) }

func Hypot(x, y float64) float64 { return math.Hypot(x, y) }

func Length(x, y float64) float64 { return math.Sqrt(x*x + y*y) }

func hiWord(x float64) uint32 { return uint32(math.Float64bits(x) >> 32) }

func loWord(x float64) uint32 { return uint32(math.Float64bits(x)) }

func setHiWord(x float64, v uint32) float64 {
	return math.Float64frombits(math.Float64bits(x)&0x00000000FFFFFFFF | uint64(v)<<32)
}

func setLoWord(x float64, v uint32) float64 {
	return math.Float64frombits(math.Float64bits(x)&0xFFFFFFFF00000000 | uint64(v))
}

// insertWords is fdlibm's INSERT_WORDS: build a double from its two halves.
func insertWords(hi, lo uint32) float64 {
	return math.Float64frombits(uint64(hi)<<32 | uint64(lo))
}

var (
	huge = 1.0e300
	tiny = 1.0e-300
)
