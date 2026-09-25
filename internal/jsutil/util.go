// Package jsutil ports util.js and random.js: utility helpers for the server.
package jsutil

import (
	"encoding/json"
	"fmt"
	"math"

	"arrasgo/internal/jsmath"
	"math/big"
	"strconv"
	"time"

	"arrasgo/internal/vmath"
)

func AddArticle(s string) string {
	article := "a"
	if len(s) > 0 {
		switch s[0] {
		case 'a', 'e', 'i', 'o', 'u', 'A', 'E', 'I', 'O', 'U':
			article = "an"
		}
	}
	return article + " " + s
}

// GetDistance is util.js:10.
func GetDistance(p1, p2 vmath.Vec2) float64 { return p2.Sub(p1).Length() }

func GetDistanceSquared(p1, p2 vmath.Vec2) float64 { return p2.Sub(p1).LengthSquared() }

func GetDirection(p1, p2 vmath.Vec2) float64 { return p2.Sub(p1).Direction() }

func Clamp(value, min, max float64) float64 { return math.Min(math.Max(value, min), max) }

func Lerp(value, target, scale float64) float64 { return value + scale*(target-value) }

func Listify(list []string) string {
	switch len(list) {
	case 0:
		return ""
	case 1:
		return list[0]
	case 2:
		return list[0] + " and " + list[1]
	}
	var out string
	for i, item := range list {
		if i != len(list)-1 {
			out += item + ", "
		} else {
			out += "and " + item
		}
	}
	return out
}

// AngleDifference is util.js:33.
func AngleDifference(a1, a2 float64) float64 {
	return math.Mod(math.Mod(a2-a1, 2*math.Pi)+math.Pi*3, 2*math.Pi) - math.Pi
}

func InterpolateAngle(angle, desired, step float64) float64 {
	return angle + AngleDifference(angle, desired)*step
}

func AverageArray(arr []float64) float64 {
	if len(arr) == 0 {
		return 0
	}
	return SumArray(arr) / float64(len(arr))
}

func SumArray(arr []float64) float64 {
	if len(arr) == 0 {
		return 0
	}
	var sum float64
	for _, v := range arr {
		sum += v
	}
	return sum
}

func SignedSqrt(x float64) float64 { return sign(x) * math.Sqrt(math.Abs(x)) }

func sign(x float64) float64 {
	switch {
	case x > 0:
		return 1
	case x < 0:
		return -1
	default:
		return x
	}
}

func GetJackpot(x float64) float64 {
	if x > 39450 {
		return jsmath.Pow(x-26300, 0.85) + 26300
	}
	return x / 1.5
}

func GetReversedJackpot(x float64) float64 {
	if x > 39450 {
		return jsmath.Pow(x-26300, 1.15) + 26300
	}
	return x * 1.5
}

// Rounder is util.js:55.
func Rounder(val float64, precision int) float64 {
	if math.Abs(val) < 0.00001 {
		val = 0
	}
	if val == 0 || math.IsNaN(val) || math.IsInf(val, 0) {
		return val
	}

	neg := val < 0
	x := new(big.Rat).SetFloat64(math.Abs(val))

	e := decimalExponent(x)
	shift := precision - 1 - e
	scale := pow10Rat(shift)

	scaled := new(big.Rat).Mul(x, scale)
	n := roundHalfUp(scaled)

	result := new(big.Rat).SetFrac(n, big.NewInt(1))
	result.Quo(result, scale)
	f, _ := result.Float64()
	if neg {
		f = -f
	}
	return f
}

func decimalExponent(x *big.Rat) int {
	f, _ := x.Float64()
	e := int(math.Floor(math.Log10(f)))
	for x.Cmp(pow10Rat(e)) < 0 {
		e--
	}
	for x.Cmp(pow10Rat(e+1)) >= 0 {
		e++
	}
	return e
}

func pow10Rat(n int) *big.Rat {
	if n >= 0 {
		return new(big.Rat).SetInt(new(big.Int).Exp(big.NewInt(10), big.NewInt(int64(n)), nil))
	}
	den := new(big.Int).Exp(big.NewInt(10), big.NewInt(int64(-n)), nil)
	return new(big.Rat).SetFrac(big.NewInt(1), den)
}

func roundHalfUp(r *big.Rat) *big.Int {
	num, den := r.Num(), r.Denom()
	q, rem := new(big.Int).QuoRem(num, den, new(big.Int))
	if new(big.Int).Mul(rem, big.NewInt(2)).Cmp(den) >= 0 {
		q.Add(q, big.NewInt(1))
	}
	return q
}

func LoopSmooth(angle, desired, slowness float64) float64 {
	return AngleDifference(angle, desired) / slowness
}

var serverStartTime = time.Now()

// Time is util.js:136.
func Time() int64 { return time.Since(serverStartTime).Milliseconds() }

func Log(text string) {
	fmt.Printf("[%.3f]: %s\n", float64(Time())/1000, text)
}

func Warn(text string) {
	fmt.Printf("[%.3f]: [WARNING]: %s\n", float64(Time())/1000, text)
}

func Error(text string) {
	fmt.Println(text)
}

func SaveToLog(title, description string, color int) {
	hex := strconv.FormatInt(int64(color), 16)
	for len(hex) < 6 {
		hex = "0" + hex
	}
	fmt.Printf("[!]: %s (#%s)\n :: %s\n", title, hex, description)
}

// Remove is util.js:154.
func Remove[T any](arr []T, index int) ([]T, T) {
	last := len(arr) - 1
	if index == last {
		return arr[:last], arr[last]
	}
	removed := arr[index]
	arr[index] = arr[last]
	return arr[:last], removed
}

func IsStringified(str string) any {
	var v any
	if err := json.Unmarshal([]byte(str), &v); err != nil {
		return str
	}
	return v
}
