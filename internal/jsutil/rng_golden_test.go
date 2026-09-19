package jsutil

import (
	"encoding/json"
	"fmt"
	"math"
	"os"
	"path/filepath"
	"testing"

	"arrasgo/internal/vmath"
)

// TestRandMatchesJSRandom verifies random helpers draw values in the same order as JS.
// Regenerate vectors after changing js-src/server/lib/random.js: node tools/gen-rng-vectors.js

type rngVectors struct {
	Seed       uint64    `json:"seed"`
	TotalDraws uint64    `json:"totalDraws"`
	Steps      []rngStep `json:"steps"`
}

type rngStep struct {
	Name        string          `json:"name"`
	Value       json.RawMessage `json:"value"`
	DrawsBefore uint64          `json:"drawsBefore"`
	DrawsAfter  uint64          `json:"drawsAfter"`
	Draws       uint64          `json:"draws"`
	Err         *string         `json:"err"`
}

type scriptStep struct {
	name string
	run  func() any
}

func TestRandMatchesJSRandom(t *testing.T) {
	p := filepath.Join("..", "..", "gen", "rng-vectors.json")
	raw, err := os.ReadFile(p)
	if err != nil {
		t.Fatalf("read %s: %v (run: node tools/gen-rng-vectors.js)", p, err)
	}
	var vec rngVectors
	if err := json.Unmarshal(raw, &vec); err != nil {
		t.Fatalf("parse vectors: %v", err)
	}
	if len(vec.Steps) == 0 {
		t.Fatal("no steps loaded")
	}

	arr := []int{10, 20, 30, 40, 50}
	r := NewRand(vec.Seed)

	var script []scriptStep
	for round := 0; round < 3; round++ {
		script = append(script,
			scriptStep{"random(100)", func() any { return r.Random(100) }},
			scriptStep{"randomAngle()", func() any { return r.RandomAngle() }},
			scriptStep{"randomRange(-5,5)", func() any { return r.RandomRange(-5, 5) }},
			scriptStep{"irandom(10)", func() any { return r.Irandom(10) }},
			scriptStep{"irandomRange(3,9)", func() any { return r.IrandomRange(3, 9) }},
			scriptStep{"chance(0.5)", func() any { return r.Chance(0.5) }},
			scriptStep{"dice(6)", func() any { return r.Dice(6) }},
			scriptStep{"choose(arr)", func() any { return r.Choose(arr) }},
			scriptStep{"gauss(0,1)", func() any { return r.Gauss(0, 1) }},
			scriptStep{"gaussInverse(0,10,3)", func() any { return r.GaussInverse(0, 10, 3) }},
			scriptStep{"gaussRing(5,1)", func() any { return r.GaussRing(5, 1) }},
			scriptStep{"pointInUnitCircle()", func() any { return r.PointInUnitCircle() }},
			scriptStep{"shuffle(arr)", func() any { return r.Shuffle(arr) }},
			scriptStep{"chooseN(arr,3)", func() any { return r.ChooseN(arr, 3) }},
			scriptStep{"chooseChance(1,2,3)", func() any { return r.ChooseChance(1, 2, 3) }},
		)
	}

	if len(script) != len(vec.Steps) {
		t.Fatalf("script has %d steps, vectors have %d — the two have drifted apart; "+
			"keep this list in sync with tools/gen-rng-vectors.js", len(script), len(vec.Steps))
	}

	for i, want := range vec.Steps {
		got := script[i]
		if got.name != want.name() {
			t.Fatalf("step %d: script runs %q where the vectors recorded %q", i, got.name, want.Name)
		}
		if want.Err != nil {
			t.Fatalf("step %d (%s): the JS threw %q, so there is nothing to compare against",
				i, want.Name, *want.Err)
		}
		if before := r.Calls(); before != want.DrawsBefore {
			t.Fatalf("step %d (%s): %d draws taken before this call, JS had taken %d — "+
				"an earlier helper consumed the wrong number",
				i, want.Name, before, want.DrawsBefore)
		}

		value := got.run()

		if after := r.Calls(); after != want.DrawsAfter {
			t.Errorf("step %d (%s): consumed %d draws, JS consumed %d",
				i, want.Name, after-want.DrawsBefore, want.Draws)
			t.FailNow()
		}

		compareRNGValue(t, i, want.Name, want.Value, value)
	}

	if total := r.Calls(); total != vec.TotalDraws {
		t.Errorf("total draws %d, JS took %d", total, vec.TotalDraws)
	}
	if libmSlackUsed == 0 {
		t.Logf("agreed with node exactly on %d calls and %d draws",
			len(vec.Steps), vec.TotalDraws)
	} else {
		t.Logf("agreed with node on %d calls and %d draws; %d point components needed "+
			"the one-ulp libm allowance (see closeEnoughForLibm)",
			len(vec.Steps), vec.TotalDraws, libmSlackUsed)
	}
}

func (s rngStep) name() string { return s.Name }

func compareRNGValue(t *testing.T, i int, name string, raw json.RawMessage, got any) {
	t.Helper()
	fail := func(g, w any) {
		t.Errorf("step %d (%s): go %v, node %v", i, name, g, w)
	}

	switch g := got.(type) {
	case float64:
		want, err := decodeJSNumber(raw)
		if err != nil {
			t.Errorf("step %d (%s): %v", i, name, err)
			return
		}
		if !exactFloatEq(g, want) {
			fail(fmt.Sprintf("%.17g", g), fmt.Sprintf("%.17g", want))
		}

	case int:
		want, err := decodeJSNumber(raw)
		if err != nil {
			t.Errorf("step %d (%s): %v", i, name, err)
			return
		}
		if float64(g) != want {
			fail(g, want)
		}

	case bool:
		var want bool
		if err := json.Unmarshal(raw, &want); err != nil {
			t.Errorf("step %d (%s): decode bool: %v", i, name, err)
			return
		}
		if g != want {
			fail(g, want)
		}

	case vmath.Vec2:
		var want struct {
			X float64 `json:"x"`
			Y float64 `json:"y"`
		}
		if err := json.Unmarshal(raw, &want); err != nil {
			t.Errorf("step %d (%s): decode point: %v", i, name, err)
			return
		}
		if !closeEnoughForLibm(g.X, want.X) || !closeEnoughForLibm(g.Y, want.Y) {
			fail(fmt.Sprintf("(%.17g, %.17g)", g.X, g.Y),
				fmt.Sprintf("(%.17g, %.17g)", want.X, want.Y))
		}
		if g.X != want.X || g.Y != want.Y {
			libmSlackUsed++
		}

	case []int:
		var want []float64
		if err := json.Unmarshal(raw, &want); err != nil {
			t.Errorf("step %d (%s): decode list: %v", i, name, err)
			return
		}
		if len(g) != len(want) {
			fail(g, want)
			return
		}
		for j := range g {
			if float64(g[j]) != want[j] {
				fail(g, want)
				return
			}
		}

	default:
		t.Fatalf("step %d (%s): no comparison for %T", i, name, got)
	}
}

// libmSlackUsed counts point components needing one-ulp libm allowance.
var libmSlackUsed int

// closeEnoughForLibm is exact equality plus one unit in the last place.
func closeEnoughForLibm(got, want float64) bool {
	if exactFloatEq(got, want) {
		return true
	}
	if math.IsNaN(got) || math.IsNaN(want) || math.IsInf(got, 0) || math.IsInf(want, 0) {
		return false
	}
	a, b := int64(math.Float64bits(got)), int64(math.Float64bits(want))
	if (a < 0) != (b < 0) {
		return false
	}
	d := a - b
	if d < 0 {
		d = -d
	}
	return d <= 1
}

// decodeJSNumber reads tagged forms for values JSON cannot carry.
func decodeJSNumber(raw json.RawMessage) (float64, error) {
	var f float64
	if err := json.Unmarshal(raw, &f); err == nil {
		return f, nil
	}
	var tagged struct {
		Num string `json:"__num"`
	}
	if err := json.Unmarshal(raw, &tagged); err != nil {
		return 0, fmt.Errorf("decode number %s: %w", raw, err)
	}
	switch tagged.Num {
	case "nan":
		return math.NaN(), nil
	case "inf":
		return math.Inf(1), nil
	case "-inf":
		return math.Inf(-1), nil
	}
	return 0, fmt.Errorf("unrecognised number encoding %s", raw)
}

// exactFloatEq compares bit-for-bit, with two NaNs counting as agreement.
func exactFloatEq(a, b float64) bool {
	if math.IsNaN(a) && math.IsNaN(b) {
		return true
	}
	return a == b
}
