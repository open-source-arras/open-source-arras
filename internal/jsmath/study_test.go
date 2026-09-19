package jsmath

import (
	"math"
	"sort"
	"strconv"
	"testing"
)

// Corpus schema: arguments and results as raw float64 bits.
type mathVectors struct {
	Node     string     `json:"node"`
	Platform string     `json:"platform"`
	Cases    []mathCase `json:"cases"`
}

type mathCase struct {
	Fn      string       `json:"fn"`
	Arity   int          `json:"arity"`
	Samples []mathSample `json:"samples"`
}

type mathSample struct {
	A string `json:"a"`
	B string `json:"b"`
	R string `json:"r"`
}

func f(hexs string) float64 {
	u, err := strconv.ParseUint(hexs, 16, 64)
	if err != nil {
		panic(err)
	}
	return math.Float64frombits(u)
}

// ulpDiff counts representable float64s between a and b.
func ulpDiff(a, b float64) uint64 {
	if math.IsNaN(a) || math.IsNaN(b) {
		if math.IsNaN(a) && math.IsNaN(b) {
			return 0
		}
		return ^uint64(0)
	}
	if a == b {
		return 0
	}
	ia, ib := math.Float64bits(a), math.Float64bits(b)
	flip := func(u uint64) uint64 {
		if u&(1<<63) != 0 {
			return ^u
		}
		return u | (1 << 63)
	}
	x, y := flip(ia), flip(ib)
	if x > y {
		return x - y
	}
	return y - x
}

// Measurement: compares Go and jsmath against a test corpus.
func TestSurveyGoAgainstV8(t *testing.T) {
	v := loadVectors(t)

	stdUnary := map[string]func(float64) float64{
		"sin": math.Sin, "cos": math.Cos, "tan": math.Tan, "atan": math.Atan,
		"sqrt": math.Sqrt, "log": math.Log, "exp": math.Exp,
		"acos": math.Acos, "asin": math.Asin, "cbrt": math.Cbrt,
	}
	stdBinary := map[string]func(float64, float64) float64{
		"atan2": math.Atan2, "hypot": math.Hypot, "pow": math.Pow, "pow_fdlibm": math.Pow,
	}

	type row struct {
		fn                 string
		n                  int
		stdDiffer          int
		stdMaxUlp          uint64
		jsDiffer           int
		jsMaxUlp           uint64
		worstA, worstB     float64
		worstGo, worstNode float64
	}
	var rows []row

	for _, c := range v.Cases {
		r := row{fn: c.Fn, n: len(c.Samples)}
		for _, s := range c.Samples {
			a := f(s.A)
			want := f(s.R)

			var std float64
			if c.Arity == 1 {
				std = stdUnary[c.Fn](a)
			} else {
				std = stdBinary[c.Fn](a, f(s.B))
			}
			if d := ulpDiff(std, want); d != 0 {
				r.stdDiffer++
				if d > r.stdMaxUlp {
					r.stdMaxUlp = d
					r.worstA, r.worstGo, r.worstNode = a, std, want
					if c.Arity == 2 {
						r.worstB = f(s.B)
					}
				}
			}

			if got, ok := eval(c, s); ok {
				if d := ulpDiff(got, want); d != 0 {
					r.jsDiffer++
					if d > r.jsMaxUlp {
						r.jsMaxUlp = d
					}
				}
			} else {
				r.jsDiffer = -1 // not implemented here; see hostLibm
			}
		}
		rows = append(rows, r)
	}

	sort.Slice(rows, func(i, j int) bool { return rows[i].stdDiffer > rows[j].stdDiffer })

	t.Logf("node %s on %s", v.Node, v.Platform)
	t.Logf("%-11s %8s | %8s %8s %10s | %8s %8s %10s  %s",
		"fn", "samples",
		"go bad", "go %", "go ulp",
		"jsmath", "jsmath %", "jsmath ulp", "go's worst case")
	// All ones when one operand is NaN.
	ulps := func(n uint64) string {
		if n == ^uint64(0) {
			return "NaN vs num"
		}
		return strconv.FormatUint(n, 10)
	}

	for _, r := range rows {
		worst := ""
		if r.stdDiffer > 0 {
			worst = "f(" + strconv.FormatFloat(r.worstA, 'g', 17, 64)
			if r.worstB != 0 {
				worst += ", " + strconv.FormatFloat(r.worstB, 'g', 17, 64)
			}
			worst += ") go=" + strconv.FormatFloat(r.worstGo, 'g', 17, 64) +
				" node=" + strconv.FormatFloat(r.worstNode, 'g', 17, 64)
		}
		js, jsPct, jsUlp := strconv.Itoa(r.jsDiffer),
			strconv.FormatFloat(100*float64(r.jsDiffer)/float64(r.n), 'f', 2, 64)+"%",
			ulps(r.jsMaxUlp)
		if r.jsDiffer < 0 {
			js, jsPct, jsUlp = "-", "-", "-"
		}
		t.Logf("%-11s %8d | %8d %7.2f%% %10s | %8s %8s %10s  %s",
			r.fn, r.n,
			r.stdDiffer, 100*float64(r.stdDiffer)/float64(r.n), ulps(r.stdMaxUlp),
			js, jsPct, jsUlp, worst)
	}
}
