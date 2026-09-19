package jsmath

import (
	"encoding/json"
	"math"
	"os"
	"path/filepath"
	"strconv"
	"testing"
)

// Test that every sample in gen/math-vectors.json matches Node v24.18.0 bit for bit.

var goldenUnary = map[string]func(float64) float64{
	"sin": Sin, "cos": Cos, "tan": Tan, "atan": Atan,
	"sqrt": Sqrt, "log": Log, "exp": Exp,
	"acos": Acos, "asin": Asin, "cbrt": Cbrt,
}

var goldenBinary = map[string]func(float64, float64) float64{
	"atan2": Atan2, "hypot": Hypot, "pow_fdlibm": Pow,
}

// hostLibm marks functions that use the host C library, not V8's implementation.
var hostLibm = map[string]bool{"pow": true}

func loadVectors(tb testing.TB) mathVectors {
	tb.Helper()
	p := filepath.Join("..", "..", "gen", "math-vectors.json")
	raw, err := os.ReadFile(p)
	if err != nil {
		tb.Fatalf("read %s: %v (run: node tools/gen-math-vectors.js)", p, err)
	}
	var v mathVectors
	if err := json.Unmarshal(raw, &v); err != nil {
		tb.Fatalf("parse %s: %v", p, err)
	}
	return v
}

// sameBits compares bits directly so +0 and -0 are distinct, and NaNs compare equal.
func sameBits(a, b float64) bool {
	if math.IsNaN(a) && math.IsNaN(b) {
		return true
	}
	return math.Float64bits(a) == math.Float64bits(b)
}

func hex(x float64) string {
	return strconv.FormatUint(math.Float64bits(x), 16)
}

func eval(c mathCase, s mathSample) (got float64, ok bool) {
	if c.Arity == 1 {
		fn, ok := goldenUnary[c.Fn]
		if !ok {
			return 0, false
		}
		return fn(f(s.A)), true
	}
	fn, ok := goldenBinary[c.Fn]
	if !ok {
		return 0, false
	}
	return fn(f(s.A), f(s.B)), true
}

func TestGoldenAgainstV8(t *testing.T) {
	v := loadVectors(t)
	seen := map[string]bool{}

	for _, c := range v.Cases {
		seen[c.Fn] = true
		if hostLibm[c.Fn] {
			continue
		}
		_, haveUnary := goldenUnary[c.Fn]
		_, haveBinary := goldenBinary[c.Fn]
		if !haveUnary && !haveBinary {
			t.Errorf("%s: corpus has a function jsmath does not implement", c.Fn)
			continue
		}
		t.Run(c.Fn, func(t *testing.T) {
			differ := 0
			for i, s := range c.Samples {
				got, _ := eval(c, s)
				want := f(s.R)
				if sameBits(got, want) {
					continue
				}
				differ++
				if differ <= 8 {
					args := "a=" + s.A
					if c.Arity == 2 {
						args += " b=" + s.B
					}
					t.Errorf("sample %d: %s: got %s want %s (%v vs %v, %d ulp)",
						i, args, hex(got), s.R, got, want, ulpDiff(got, want))
				}
			}
			if differ != 0 {
				t.Errorf("%s: %d of %d samples differ from V8", c.Fn, differ, len(c.Samples))
			}
		})
	}

	for name := range goldenUnary {
		if !seen[name] {
			t.Errorf("%s is exported but has no samples in the corpus", name)
		}
	}
	for name := range goldenBinary {
		if !seen[name] {
			t.Errorf("%s is exported but has no samples in the corpus", name)
		}
	}
}

// TestPowIsHostLibmWithoutTheFlag verifies that pow matches fdlibm, not the host C library.
func TestPowIsHostLibmWithoutTheFlag(t *testing.T) {
	v := loadVectors(t)
	var host, fdlibm mathCase
	for _, c := range v.Cases {
		switch c.Fn {
		case "pow":
			host = c
		case "pow_fdlibm":
			fdlibm = c
		}
	}
	if host.Fn == "" || fdlibm.Fn == "" {
		t.Fatal("corpus is missing pow or pow_fdlibm; regenerate with tools/gen-math-vectors.js")
	}
	if len(host.Samples) != len(fdlibm.Samples) {
		t.Fatalf("pow and pow_fdlibm cover different sample counts (%d vs %d)",
			len(host.Samples), len(fdlibm.Samples))
	}

	differ, worst := 0, uint64(0)
	for i, s := range host.Samples {
		if s.A != fdlibm.Samples[i].A || s.B != fdlibm.Samples[i].B {
			t.Fatalf("sample %d: pow and pow_fdlibm disagree on the arguments", i)
		}
		if s.R == fdlibm.Samples[i].R {
			continue
		}
		differ++
		if d := ulpDiff(f(s.R), f(fdlibm.Samples[i].R)); d > worst {
			worst = d
		}
	}
	t.Logf("host std::pow (%s) vs V8's own pow: %d of %d samples differ, worst %d ulp",
		v.Platform, differ, len(host.Samples), worst)
	if worst > 1 {
		t.Errorf("host std::pow is %d ulp from V8's own pow; that is further than the "+
			"1 ulp this was measured at, so re-read the finding above", worst)
	}
}

// TestNoAllocations verifies that hot-path functions make no heap allocations.
func TestNoAllocations(t *testing.T) {
	cases := []struct {
		name string
		fn   func()
	}{
		// 1e9 forces the two-over-pi table path, which is the one with the arrays.
		{"Sin", func() { sink = Sin(1.2345) + Sin(1e9) }},
		{"Cos", func() { sink = Cos(1.2345) + Cos(1e9) }},
		{"Tan", func() { sink = Tan(1.2345) + Tan(1e9) }},
		{"Pow", func() { sink = Pow(3.25, 1.7) }},
		{"Atan2", func() { sink = Atan2(3.5, -7.25) }},
		{"Exp", func() { sink = Exp(3.5) }},
		{"Log", func() { sink = Log(3.5) }},
		{"Acos", func() { sink = Acos(0.25) }},
		{"Asin", func() { sink = Asin(0.25) }},
		{"Cbrt", func() { sink = Cbrt(3.5) }},
	}
	for _, c := range cases {
		if n := testing.AllocsPerRun(100, c.fn); n != 0 {
			t.Errorf("%s: %v allocs/op, want 0", c.name, n)
		}
	}
}

var sink float64
