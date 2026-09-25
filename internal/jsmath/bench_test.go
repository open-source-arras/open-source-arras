package jsmath

import (
	"math"
	"testing"
)

// benchAngles uses the distribution from tools/gen-math-vectors.js.
var benchAngles = func() []float64 {
	out := make([]float64, 256)
	for i := range out {
		switch {
		case i%20 < 8:
			out[i] = float64(i)*0.0246 - 3.1
		case i%20 < 14:
			out[i] = float64(i)*0.77 - 100
		case i%20 < 17:
			out[i] = float64(i)*7919.0 - 1e6
		default:
			out[i] = float64(i)*3.7e7 - 5e9
		}
	}
	return out
}()

var benchSmall = func() []float64 {
	out := make([]float64, 256)
	for i := range out {
		out[i] = float64(i)*0.0246 - 3.1
	}
	return out
}()

var benchMedium = func() []float64 {
	out := make([]float64, 256)
	for i := range out {
		out[i] = float64(i)*7919.0 - 1e6
	}
	return out
}()

var benchHuge = func() []float64 {
	out := make([]float64, 256)
	for i := range out {
		out[i] = float64(i)*3.7e7 - 5e9
	}
	return out
}()

var benchPositive = func() []float64 {
	out := make([]float64, 0, 256)
	for i := 0; i < 256; i++ {
		out = append(out, 0.001+float64(i)*62.5)
	}
	return out
}()

func benchUnary(b *testing.B, xs []float64, fn func(float64) float64) {
	b.ReportAllocs()
	var acc float64
	for i := 0; b.Loop(); i++ {
		acc += fn(xs[i&255])
	}
	sink = acc
}

func BenchmarkSin(b *testing.B)    { benchUnary(b, benchAngles, Sin) }
func BenchmarkSinStd(b *testing.B) { benchUnary(b, benchAngles, math.Sin) }
func BenchmarkCos(b *testing.B)    { benchUnary(b, benchAngles, Cos) }
func BenchmarkCosStd(b *testing.B) { benchUnary(b, benchAngles, math.Cos) }
func BenchmarkTan(b *testing.B)    { benchUnary(b, benchAngles, Tan) }
func BenchmarkTanStd(b *testing.B) { benchUnary(b, benchAngles, math.Tan) }

func BenchmarkSinSmall(b *testing.B)     { benchUnary(b, benchSmall, Sin) }
func BenchmarkSinSmallStd(b *testing.B)  { benchUnary(b, benchSmall, math.Sin) }
func BenchmarkSinMedium(b *testing.B)    { benchUnary(b, benchMedium, Sin) }
func BenchmarkSinMediumStd(b *testing.B) { benchUnary(b, benchMedium, math.Sin) }
func BenchmarkSinHuge(b *testing.B)      { benchUnary(b, benchHuge, Sin) }
func BenchmarkSinHugeStd(b *testing.B)   { benchUnary(b, benchHuge, math.Sin) }

func BenchmarkAtan(b *testing.B)    { benchUnary(b, benchAngles, Atan) }
func BenchmarkAtanStd(b *testing.B) { benchUnary(b, benchAngles, math.Atan) }
func BenchmarkLog(b *testing.B)     { benchUnary(b, benchPositive, Log) }
func BenchmarkLogStd(b *testing.B)  { benchUnary(b, benchPositive, math.Log) }
func BenchmarkExp(b *testing.B) {
	benchUnary(b, benchAngles, func(x float64) float64 { return Exp(x / 1e9) })
}
func BenchmarkExpStd(b *testing.B) {
	benchUnary(b, benchAngles, func(x float64) float64 { return math.Exp(x / 1e9) })
}
func BenchmarkCbrt(b *testing.B)    { benchUnary(b, benchPositive, Cbrt) }
func BenchmarkCbrtStd(b *testing.B) { benchUnary(b, benchPositive, math.Cbrt) }
func BenchmarkAcos(b *testing.B) {
	benchUnary(b, benchAngles, func(x float64) float64 { return Acos(x / 5e9) })
}
func BenchmarkAcosStd(b *testing.B) {
	benchUnary(b, benchAngles, func(x float64) float64 { return math.Acos(x / 5e9) })
}

func BenchmarkAtan2(b *testing.B) {
	b.ReportAllocs()
	var acc float64
	for i := 0; b.Loop(); i++ {
		acc += Atan2(benchAngles[i&255], benchPositive[i&255])
	}
	sink = acc
}

func BenchmarkAtan2Std(b *testing.B) {
	b.ReportAllocs()
	var acc float64
	for i := 0; b.Loop(); i++ {
		acc += math.Atan2(benchAngles[i&255], benchPositive[i&255])
	}
	sink = acc
}

// pow's exponents are the ones the size and damage curves actually use.
var benchExponents = [10]float64{2, 0.5, 1.5, 3, 0.25, 1.0 / 3.0, -1, -0.5, 0.7, 1.7}

func BenchmarkPow(b *testing.B) {
	b.ReportAllocs()
	var acc float64
	for i := 0; b.Loop(); i++ {
		acc += Pow(benchPositive[i&255], benchExponents[i%10])
	}
	sink = acc
}

func BenchmarkPowStd(b *testing.B) {
	b.ReportAllocs()
	var acc float64
	for i := 0; b.Loop(); i++ {
		acc += math.Pow(benchPositive[i&255], benchExponents[i%10])
	}
	sink = acc
}
