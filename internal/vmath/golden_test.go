package vmath

import (
	"encoding/json"
	"math"
	"os"
	"path/filepath"
	"testing"
)

// Tests NaN-scrubbing: Vector(NaN, 3).length is 3 in Node, not NaN.
type vecVectors struct {
	Cases []vecCase `json:"cases"`
}

type vecCase struct {
	In            xy         `json:"in"`
	LengthSquared jsNum      `json:"lengthSquared"`
	Length        jsNum      `json:"length"`
	Direction     jsNum      `json:"direction"`
	GetX          jsNum      `json:"getX"`
	GetY          jsNum      `json:"getY"`
	ShorterThan   []shorterT `json:"shorterThan"`
	RawBefore     rawXY      `json:"rawBefore"`
	RawAfter      rawXY      `json:"rawAfter"`
	AfterNull     rawXY      `json:"afterNull"`
}

type xy struct {
	X jsNum `json:"x"`
	Y jsNum `json:"y"`
}

type rawXY struct {
	X jsNum `json:"X"`
	Y jsNum `json:"Y"`
}

type shorterT struct {
	D      jsNum `json:"d"`
	Result bool  `json:"result"`
}

// jsNum decodes the {"__num":"nan"} tagging for JSON-uncarriable values.
type jsNum struct{ V float64 }

func (n *jsNum) UnmarshalJSON(b []byte) error {
	var f float64
	if err := json.Unmarshal(b, &f); err == nil {
		n.V = f
		return nil
	}
	var tagged struct {
		Num string `json:"__num"`
	}
	if err := json.Unmarshal(b, &tagged); err != nil {
		return err
	}
	switch tagged.Num {
	case "nan":
		n.V = math.NaN()
	case "inf":
		n.V = math.Inf(1)
	case "-inf":
		n.V = math.Inf(-1)
	case "-0":
		// JSON has no negative zero, so the generator tags it. It matters:
		// atan2(-0, -0) is -Pi where atan2(0, 0) is 0.
		n.V = math.Copysign(0, -1)
	}
	return nil
}

func loadVectors(t *testing.T) vecVectors {
	t.Helper()
	p := filepath.Join("..", "..", "gen", "vector-vectors.json")
	raw, err := os.ReadFile(p)
	if err != nil {
		t.Fatalf("read %s: %v (run: node tools/gen-vector-vectors.js)", p, err)
	}
	var v vecVectors
	if err := json.Unmarshal(raw, &v); err != nil {
		t.Fatalf("parse: %v", err)
	}
	if len(v.Cases) == 0 {
		t.Fatal("no cases loaded")
	}
	return v
}

func (c vecCase) vec() Vec2 {
	return Vec2{X: comp(c.In.X.V), Y: comp(c.In.Y.V)}
}

func (c vecCase) label() string {
	return "(" + fmtF(c.In.X.V) + ", " + fmtF(c.In.Y.V) + ")"
}

func TestDerivedGettersMatchJS(t *testing.T) {
	for _, c := range loadVectors(t).Cases {
		v := c.vec()

		if got, want := v.LengthSquared(), narrow(c.LengthSquared.V); !eq(got, want) {
			t.Errorf("%s lengthSquared: go %.17g, node %.17g", c.label(), got, want)
		}
		if got, want := v.Length(), narrow(c.Length.V); !eq(got, want) {
			t.Errorf("%s length: go %.17g, node %.17g", c.label(), got, want)
		}
		if got, want := v.Direction(), narrow(c.Direction.V); !eq(got, want) {
			t.Errorf("%s direction: go %.17g, node %.17g", c.label(), got, want)
		}
	}
}

// The headline case: a NaN component must contribute 0, not poison the result.
func TestNaNComponentsAreScrubbedOnRead(t *testing.T) {
	cases := loadVectors(t).Cases
	checked := 0
	for _, c := range cases {
		if !math.IsNaN(c.In.X.V) && !math.IsNaN(c.In.Y.V) {
			continue
		}
		checked++
		v := c.vec()
		if got := v.LengthSquared(); math.IsNaN(got) {
			t.Errorf("%s lengthSquared returned NaN; node returns %.17g",
				c.label(), c.LengthSquared.V)
		}
		if got := v.Length(); math.IsNaN(got) {
			t.Errorf("%s length returned NaN; node returns %.17g", c.label(), c.Length.V)
		}
		if got := v.Direction(); math.IsNaN(got) {
			t.Errorf("%s direction returned NaN; node returns %.17g",
				c.label(), c.Direction.V)
		}
	}
	if checked < 5 {
		t.Fatalf("only %d NaN cases in the corpus; it is not exercising the behaviour "+
			"it claims to (regenerate: node tools/gen-vector-vectors.js)", checked)
	}
}

// Infinity is not scrubbed (isNaN(Infinity) is false), so it propagates.
func TestInfinitiesPropagate(t *testing.T) {
	v := Vec2{X: math.Inf(1), Y: 0}
	if got := v.LengthSquared(); !math.IsInf(got, 1) {
		t.Errorf("lengthSquared = %v, want +Inf", got)
	}
	if got := v.Length(); !math.IsInf(got, 1) {
		t.Errorf("length = %v, want +Inf", got)
	}
	if got := v.Direction(); got != 0 {
		t.Errorf("direction = %v, want 0 (atan2(0, +Inf))", got)
	}
}

func TestIsShorterThanMatchesJS(t *testing.T) {
	for _, c := range loadVectors(t).Cases {
		for _, s := range c.ShorterThan {
			got := c.vec().IsShorterThan(comp(s.D.V))
			if got != s.Result {
				t.Errorf("%s isShorterThan(%s): go %v, node %v",
					c.label(), fmtF(s.D.V), got, s.Result)
			}
		}
	}
}

// IsShorterThan uses inclusive comparison (<=), not exclusive (<).
func TestIsShorterThanIsInclusive(t *testing.T) {
	v := Vec2{X: 3, Y: 4}
	if !v.IsShorterThan(5) {
		t.Error("a vector of length 5 must be 'shorter than' 5 — the JS is <=")
	}
	if v.IsShorterThan(4.9999) {
		t.Error("length 5 should not be shorter than 4.9999")
	}
}

// Scrub heals in place, the way the getter's write-back does.
func TestScrubHealsInPlaceLikeTheGetter(t *testing.T) {
	for _, c := range loadVectors(t).Cases {
		v := c.vec()
		v.Scrub()
		wantX, wantY := narrow(c.RawAfter.X.V), narrow(c.RawAfter.Y.V)
		if !eq(v.X, wantX) || !eq(v.Y, wantY) {
			t.Errorf("%s after Scrub: go (%.17g, %.17g), node after reading .length (%.17g, %.17g)",
				c.label(), v.X, v.Y, wantX, wantY)
		}
	}
}

func TestDerivedGettersDoNotHealTheReceiver(t *testing.T) {
	v := Vec2{X: math.NaN(), Y: 3}
	_ = v.Length()
	if !math.IsNaN(v.X) {
		t.Error("Length() healed the receiver; the value receiver cannot write back, " +
			"so if this now passes the contract in the doc comment has changed")
	}
	v.Scrub()
	if v.X != 0 {
		t.Errorf("Scrub left X = %v, want 0", v.X)
	}
}

func TestNullZeroesEvenNaN(t *testing.T) {
	for _, c := range loadVectors(t).Cases {
		v := c.vec()
		v.Null()
		if v.X != 0 || v.Y != 0 {
			t.Errorf("%s after Null: (%v, %v), want (0, 0)", c.label(), v.X, v.Y)
		}
		if !eq(narrow(c.AfterNull.X.V), 0) || !eq(narrow(c.AfterNull.Y.V), 0) {
			t.Errorf("%s: node's null() left (%v, %v) — the corpus disagrees with the port",
				c.label(), c.AfterNull.X.V, c.AfterNull.Y.V)
		}
	}
}

func comp(v float64) float64 { return v }

func narrow(v float64) float64 { return comp(v) }

func eq(a, b float64) bool {
	if math.IsNaN(a) && math.IsNaN(b) {
		return true
	}
	return a == b
}

func fmtF(v float64) string {
	switch {
	case math.IsNaN(v):
		return "NaN"
	case math.IsInf(v, 1):
		return "+Inf"
	case math.IsInf(v, -1):
		return "-Inf"
	}
	b, _ := json.Marshal(v)
	return string(b)
}
