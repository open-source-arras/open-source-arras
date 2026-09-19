package jsutil

import (
	"io"
	"math"
	"os"
	"strings"
	"testing"

	"arrasgo/internal/vmath"
)

func almostEqual(got, want, tol float64) bool { return math.Abs(got-want) <= tol }

func TestAddArticle(t *testing.T) {
	cases := []struct{ in, want string }{
		{"", "a "}, // empty string never matches the vowel regex (verified against Node)
		{"egg", "an egg"},
		{"Egg", "an Egg"}, // case-insensitive test, original casing preserved in the body
		{"bullet", "a bullet"},
		{"Umbrella", "an Umbrella"},
	}
	for _, c := range cases {
		if got := AddArticle(c.in); got != c.want {
			t.Errorf("AddArticle(%q) = %q, want %q", c.in, got, c.want)
		}
	}
}

func TestGetDistanceAndDirection(t *testing.T) {
	p1 := vmath.Vec2{X: 0, Y: 0}
	p2 := vmath.Vec2{X: 3, Y: 4}
	if got := GetDistance(p1, p2); got != 5 {
		t.Errorf("GetDistance = %v, want 5", got)
	}
	if got := GetDistanceSquared(p1, p2); got != 25 {
		t.Errorf("GetDistanceSquared = %v, want 25", got)
	}
	p3 := vmath.Vec2{X: 1, Y: 1}
	if got := GetDirection(p1, p3); !almostEqual(float64(got), 0.7853981633974483, 1e-6) {
		t.Errorf("GetDirection = %v, want ~Pi/4 (verified against Node)", got)
	}
}

func TestClamp(t *testing.T) {
	cases := []struct{ v, lo, hi, want float64 }{
		{5, 0, 10, 5},
		{-5, 0, 10, 0},
		{15, 0, 10, 10},
	}
	for _, c := range cases {
		if got := Clamp(c.v, c.lo, c.hi); got != c.want {
			t.Errorf("Clamp(%v,%v,%v) = %v, want %v", c.v, c.lo, c.hi, got, c.want)
		}
	}
}

func TestLerp(t *testing.T) {
	if got := Lerp(0, 10, 0.5); got != 5 {
		t.Errorf("Lerp(0,10,0.5) = %v, want 5", got)
	}
	if got := Lerp(10, 0, 0.25); got != 7.5 {
		t.Errorf("Lerp(10,0,0.25) = %v, want 7.5", got)
	}
}

func TestListify(t *testing.T) {
	cases := []struct {
		in   []string
		want string
	}{
		{nil, ""},
		{[]string{"a"}, "a"},
		{[]string{"a", "b"}, "a and b"},
		{[]string{"a", "b", "c"}, "a, b, and c"},
		{[]string{"a", "b", "c", "d"}, "a, b, c, and d"},
	}
	for _, c := range cases {
		if got := Listify(c.in); got != c.want {
			t.Errorf("Listify(%v) = %q, want %q", c.in, got, c.want)
		}
	}
}

func TestAngleDifference(t *testing.T) {
	cases := []struct{ a1, a2, want float64 }{
		{0, math.Pi, -3.141592653589793},
		{0, -math.Pi, -3.141592653589793}, // same boundary, resolves the same way
		{-3, 3, -0.28318530717958623},
		{3, -3, 0.28318530717958623},
		{0.1, 6.2, -0.1831853071795848},
	}
	for _, c := range cases {
		if got := AngleDifference(c.a1, c.a2); !almostEqual(got, c.want, 1e-12) {
			t.Errorf("AngleDifference(%v,%v) = %v, want %v", c.a1, c.a2, got, c.want)
		}
	}
}

func TestInterpolateAngleAndLoopSmooth(t *testing.T) {
	got := InterpolateAngle(0, math.Pi/2, 0.5)
	want := 0 + AngleDifference(0, math.Pi/2)*0.5
	if !almostEqual(got, want, 1e-12) {
		t.Errorf("InterpolateAngle = %v, want %v", got, want)
	}
	gotSmooth := LoopSmooth(0, math.Pi/2, 2)
	wantSmooth := AngleDifference(0, math.Pi/2) / 2
	if !almostEqual(gotSmooth, wantSmooth, 1e-12) {
		t.Errorf("LoopSmooth = %v, want %v", gotSmooth, wantSmooth)
	}
}

func TestAverageAndSumArray(t *testing.T) {
	if got := SumArray(nil); got != 0 {
		t.Errorf("SumArray(nil) = %v, want 0", got)
	}
	if got := SumArray([]float64{1, 2, 3}); got != 6 {
		t.Errorf("SumArray = %v, want 6", got)
	}
	if got := AverageArray(nil); got != 0 {
		t.Errorf("AverageArray(nil) = %v, want 0", got)
	}
	if got := AverageArray([]float64{2, 4, 6}); got != 4 {
		t.Errorf("AverageArray = %v, want 4", got)
	}
}

func TestSignedSqrt(t *testing.T) {
	cases := []struct{ in, want float64 }{
		{4, 2},
		{-4, -2},
		{0, 0},
	}
	for _, c := range cases {
		if got := SignedSqrt(c.in); got != c.want {
			t.Errorf("SignedSqrt(%v) = %v, want %v", c.in, got, c.want)
		}
	}
}

// Pinned against Node: util.getJackpot / util.getReversedJackpot.
func TestJackpot(t *testing.T) {
	if got := GetJackpot(39450); got != 26300 {
		t.Errorf("GetJackpot(39450) = %v, want 26300 (boundary is strictly > 39450)", got)
	}
	if got := GetJackpot(0); got != 0 {
		t.Errorf("GetJackpot(0) = %v, want 0", got)
	}
	if got, want := GetJackpot(50000), 31530.414342219963; !almostEqual(got, want, 1e-6) {
		t.Errorf("GetJackpot(50000) = %v, want %v", got, want)
	}
	if got, want := GetReversedJackpot(50000), 133689.19772875952; !almostEqual(got, want, 1e-6) {
		t.Errorf("GetReversedJackpot(50000) = %v, want %v", got, want)
	}
}

func TestRounder(t *testing.T) {
	cases := []struct {
		val       float64
		precision int
		want      float64
	}{
		{0.125, 2, 0.13},
		{-0.125, 2, -0.13},
		{0.375, 2, 0.38},
		{2.5, 1, 3},
		{1.23456789, 6, 1.23457},
		{1.23456789, 3, 1.23},
		{0.000001, 6, 0},
		{-0.000001, 6, 0},
		{0.00002, 6, 0.00002},
		{0.00002, 2, 0.00002},
		{123456789, 3, 123000000},
		{9.995, 3, 9.99},
		{0, 6, 0},
		{math.Copysign(0, -1), 6, 0},
	}
	for _, c := range cases {
		if got := Rounder(c.val, c.precision); got != c.want {
			t.Errorf("Rounder(%v,%d) = %v, want %v", c.val, c.precision, got, c.want)
		}
	}

	// The value check above can't distinguish +0 from -0 (they compare equal).
	// JS's clamp assigns literal `0`, discarding the sign. Verify Go does the same.
	if got := Rounder(math.Copysign(0, -1), 6); math.Signbit(got) {
		t.Errorf("Rounder(-0,6) returned -0, want +0 (the <1e-5 clamp discards sign)")
	}
}

func TestRemove(t *testing.T) {
	arr := []string{"A", "B", "C", "D"}
	rest, removed := Remove(arr, 1)
	if removed != "B" {
		t.Errorf("removed = %q, want B", removed)
	}
	if got := strings.Join(rest, ","); got != "A,D,C" {
		t.Errorf("rest = %q, want A,D,C (last element swapped into the hole)", got)
	}

	arr2 := []string{"A", "B", "C", "D"}
	rest2, removed2 := Remove(arr2, 3) // removing the last element: pure pop, no swap
	if removed2 != "D" {
		t.Errorf("removed2 = %q, want D", removed2)
	}
	if got := strings.Join(rest2, ","); got != "A,B,C" {
		t.Errorf("rest2 = %q, want A,B,C", got)
	}
}

// Pinned against Node: util.isStringified.
func TestIsStringified(t *testing.T) {
	if got := IsStringified("123"); got != 123.0 {
		t.Errorf(`IsStringified("123") = %#v, want float64(123)`, got)
	}
	if got := IsStringified(`"hello"`); got != "hello" {
		t.Errorf(`IsStringified('"hello"') = %#v, want "hello"`, got)
	}
	if got := IsStringified("hello"); got != "hello" {
		t.Errorf(`IsStringified("hello") = %#v, want "hello" (invalid JSON falls back to the input)`, got)
	}
	if got := IsStringified("null"); got != nil {
		t.Errorf(`IsStringified("null") = %#v, want nil`, got)
	}
	if got := IsStringified(""); got != "" {
		t.Errorf(`IsStringified("") = %#v, want ""`, got)
	}
}

func TestSaveToLogHexPadding(t *testing.T) {
	// padStart pads the raw string, so a negative color pads before the sign:
	// "0000-1", not "-00001". Verified against Node (see util.go's doc comment).
	out := captureStdout(t, func() { SaveToLog("Title", "Desc", -1) })
	if !strings.Contains(out, "(#0000-1)") {
		t.Errorf("SaveToLog(-1) output = %q, want it to contain (#0000-1)", out)
	}

	out2 := captureStdout(t, func() { SaveToLog("Title", "Desc", 0) })
	if !strings.Contains(out2, "(#000000)") {
		t.Errorf("SaveToLog(0) output = %q, want it to contain (#000000)", out2)
	}
}

func TestTimeIsMonotonicNonNegative(t *testing.T) {
	a := Time()
	if a < 0 {
		t.Fatalf("Time() = %d, want >= 0", a)
	}
	b := Time()
	if b < a {
		t.Fatalf("Time() went backwards: %d then %d", a, b)
	}
}

func captureStdout(t *testing.T, fn func()) string {
	t.Helper()
	r, w, err := os.Pipe()
	if err != nil {
		t.Fatalf("os.Pipe: %v", err)
	}
	old := os.Stdout
	os.Stdout = w
	fn()
	w.Close()
	os.Stdout = old
	out, err := io.ReadAll(r)
	if err != nil {
		t.Fatalf("read pipe: %v", err)
	}
	return string(out)
}
