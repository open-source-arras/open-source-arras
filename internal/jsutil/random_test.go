package jsutil

import (
	"fmt"
	"math"
	"strings"
	"testing"
)

// Tests use a fixed seed for reproducibility.
const testSeed = 1

func TestRandomBounds(t *testing.T) {
	r := NewRand(testSeed)
	for i := 0; i < 5000; i++ {
		if got := r.Random(10); got < 0 || got >= 10 {
			t.Fatalf("Random(10) = %v, want [0,10)", got)
		}
	}
	if got := r.Random(0); got != 0 {
		t.Errorf("Random(0) = %v, want 0", got)
	}
}

func TestRandomAngleBounds(t *testing.T) {
	r := NewRand(testSeed)
	for i := 0; i < 5000; i++ {
		if got := r.RandomAngle(); got < 0 || got >= 2*math.Pi {
			t.Fatalf("RandomAngle() = %v, want [0, 2*Pi)", got)
		}
	}
}

func TestRandomRangeBounds(t *testing.T) {
	r := NewRand(testSeed)
	for i := 0; i < 5000; i++ {
		if got := r.RandomRange(5, 15); got < 5 || got >= 15 {
			t.Fatalf("RandomRange(5,15) = %v, want [5,15)", got)
		}
	}
}

func TestIrandomInclusiveBounds(t *testing.T) {
	r := NewRand(testSeed)
	seenMin, seenMax := false, false
	for i := 0; i < 5000; i++ {
		got := r.Irandom(5)
		if got < 0 || got > 5 {
			t.Fatalf("Irandom(5) = %d, want [0,5]", got)
		}
		if got == 0 {
			seenMin = true
		}
		if got == 5 {
			seenMax = true
		}
	}
	if !seenMin || !seenMax {
		t.Errorf("Irandom(5) over 5000 draws never hit both ends: seenMin=%v seenMax=%v", seenMin, seenMax)
	}
}

func TestIrandomRangeInclusiveBounds(t *testing.T) {
	r := NewRand(testSeed)
	for i := 0; i < 5000; i++ {
		got := r.IrandomRange(3, 7)
		if got < 3 || got > 7 {
			t.Fatalf("IrandomRange(3,7) = %d, want [3,7]", got)
		}
	}
}

func TestPointInUnitCircleStaysInDisk(t *testing.T) {
	r := NewRand(testSeed)
	for i := 0; i < 5000; i++ {
		p := r.PointInUnitCircle()
		if l := p.LengthSquared(); l > 1.0001 {
			t.Fatalf("PointInUnitCircle() length^2 = %v, want <= 1", l)
		}
	}
}

func TestGaussIsFiniteAndRoughlyCentered(t *testing.T) {
	r := NewRand(testSeed)
	const n = 20000
	var sum float64
	for i := 0; i < n; i++ {
		v := r.Gauss(0, 1)
		if math.IsNaN(v) || math.IsInf(v, 0) {
			t.Fatalf("Gauss(0,1) produced %v", v)
		}
		sum += v
	}
	mean := sum / n
	if math.Abs(mean) > 0.2 {
		t.Errorf("Gauss(0,1) sample mean over %d draws = %v, want close to 0", n, mean)
	}
}

func TestGaussInverseStaysInRange(t *testing.T) {
	r := NewRand(testSeed)
	for i := 0; i < 5000; i++ {
		got := r.GaussInverse(10, 20, 3)
		if got < 10 || got > 20 {
			t.Fatalf("GaussInverse(10,20,3) = %v, want [10,20]", got)
		}
	}
}

func TestGaussRingIsFinite(t *testing.T) {
	r := NewRand(testSeed)
	for i := 0; i < 2000; i++ {
		p := r.GaussRing(50, 0.2)
		if math.IsNaN(float64(p.X)) || math.IsNaN(float64(p.Y)) {
			t.Fatalf("GaussRing produced NaN: %+v", p)
		}
	}
}

func TestChanceAndDiceProportions(t *testing.T) {
	r := NewRand(testSeed)
	const n = 20000
	hits := 0
	for i := 0; i < n; i++ {
		if r.Chance(0.3) {
			hits++
		}
	}
	p := float64(hits) / n
	if p < 0.25 || p > 0.35 {
		t.Errorf("Chance(0.3) hit rate over %d trials = %v, want close to 0.3", n, p)
	}

	hits = 0
	for i := 0; i < n; i++ {
		if r.Dice(4) {
			hits++
		}
	}
	p = float64(hits) / n
	if p < 0.20 || p > 0.30 {
		t.Errorf("Dice(4) hit rate over %d trials = %v, want close to 0.25", n, p)
	}
}

func TestChooseReturnsMember(t *testing.T) {
	r := NewRand(testSeed)
	arr := []string{"x", "y", "z"}
	seen := map[string]bool{}
	for i := 0; i < 500; i++ {
		got := r.Choose(arr)
		if got != "x" && got != "y" && got != "z" {
			t.Fatalf("Choose(%v) = %q, not a member", arr, got)
		}
		seen[got] = true
	}
	if len(seen) < 2 {
		t.Errorf("Choose over 500 draws only produced %v, expected more variety", seen)
	}
}

func TestChooseNLengthAndMembership(t *testing.T) {
	r := NewRand(testSeed)
	arr := []int{1, 2, 3, 4, 5}
	got := r.ChooseN(arr, 3)
	if len(got) != 3 {
		t.Fatalf("ChooseN len = %d, want 3", len(got))
	}
	seen := map[int]bool{}
	for _, v := range got {
		found := false
		for _, a := range arr {
			if a == v {
				found = true
			}
		}
		if !found {
			t.Errorf("ChooseN produced %d, not in source arr %v", v, arr)
		}
		if seen[v] {
			t.Errorf("ChooseN(arr, 3) with num <= len(arr) produced a duplicate: %v", got)
		}
		seen[v] = true
	}
}

func TestChooseNCanRepeatWhenNumExceedsLength(t *testing.T) {
	r := NewRand(testSeed)
	arr := []int{1, 2}
	got := r.ChooseN(arr, 5)
	if len(got) != 5 {
		t.Fatalf("ChooseN len = %d, want 5", len(got))
	}
	for _, v := range got {
		if v != 1 && v != 2 {
			t.Errorf("ChooseN produced %d, not in source arr %v", v, arr)
		}
	}
}

// Shuffle is a biased Fisher-Yates variant, ported as-is. See docs/found-bugs.md.
func TestShuffleTwoElementsAlwaysSwaps(t *testing.T) {
	r := NewRand(testSeed)
	for i := 0; i < 200; i++ {
		got := r.Shuffle([]string{"A", "B"})
		if got[0] != "B" || got[1] != "A" {
			t.Fatalf("Shuffle([A,B]) = %v, want [B,A] every time (see docs/found-bugs.md)", got)
		}
	}
}

func TestShuffleIsAPermutation(t *testing.T) {
	r := NewRand(testSeed)
	arr := []int{1, 2, 3, 4, 5, 6}
	got := r.Shuffle(arr)
	if len(got) != len(arr) {
		t.Fatalf("Shuffle len = %d, want %d", len(got), len(arr))
	}
	count := map[int]int{}
	for _, v := range got {
		count[v]++
	}
	for _, v := range arr {
		if count[v] != 1 {
			t.Errorf("Shuffle(%v) = %v is not a permutation (element %d appears %d times)", arr, got, v, count[v])
		}
	}
	if arr[0] != 1 || arr[1] != 2 {
		t.Errorf("Shuffle mutated its input: %v", arr)
	}
}

func TestChooseChance(t *testing.T) {
	r := NewRand(testSeed)
	if got := r.ChooseChance(); got != -1 {
		t.Errorf("ChooseChance() = %d, want -1 (no JS `undefined` in Go; see doc comment)", got)
	}
	if got := r.ChooseChance(0, 0, 0); got != -1 {
		t.Errorf("ChooseChance(0,0,0) = %d, want -1", got)
	}

	for i := 0; i < 500; i++ {
		if got := r.ChooseChance(100, 0); got != 0 {
			t.Fatalf("ChooseChance(100,0) = %d, want 0 every time", got)
		}
	}
}

func TestChooseBotNameIsFromList(t *testing.T) {
	r := NewRand(testSeed)
	name := r.ChooseBotName()
	found := false
	for _, n := range NameLists["bots"] {
		if n == name {
			found = true
		}
	}
	if !found {
		t.Errorf("ChooseBotName() = %q, not in NameLists[\"bots\"]", name)
	}
}

func TestChooseBossNameUnknownCodeIsEmpty(t *testing.T) {
	r := NewRand(testSeed)
	got := r.ChooseBossName("no-such-code", 3)
	if len(got) != 0 {
		t.Errorf("ChooseBossName(unknown) = %v, want empty", got)
	}
}

func TestChooseBossNameKnownCode(t *testing.T) {
	r := NewRand(testSeed)
	got := r.ChooseBossName("legion", 2)
	if len(got) != 2 {
		t.Errorf("ChooseBossName(legion,2) len = %d, want 2", len(got))
	}
}

func sampleSequence(r *Rand) string {
	var sb strings.Builder
	fmt.Fprintf(&sb, "%v|", r.Random(10))
	fmt.Fprintf(&sb, "%v|", r.RandomAngle())
	fmt.Fprintf(&sb, "%v|", r.RandomRange(5, 15))
	fmt.Fprintf(&sb, "%d|", r.Irandom(100))
	fmt.Fprintf(&sb, "%d|", r.IrandomRange(3, 70))
	fmt.Fprintf(&sb, "%v|", r.PointInUnitCircle())
	fmt.Fprintf(&sb, "%v|", r.Gauss(0, 1))
	fmt.Fprintf(&sb, "%v|", r.GaussInverse(10, 20, 3))
	fmt.Fprintf(&sb, "%v|", r.GaussRing(50, 0.2))
	fmt.Fprintf(&sb, "%v|", r.Chance(0.5))
	fmt.Fprintf(&sb, "%v|", r.Dice(4))
	fmt.Fprintf(&sb, "%v|", r.Choose([]string{"a", "b", "c", "d"}))
	fmt.Fprintf(&sb, "%v|", r.ChooseN([]int{1, 2, 3, 4, 5}, 3))
	fmt.Fprintf(&sb, "%v|", r.Shuffle([]int{1, 2, 3, 4, 5, 6}))
	fmt.Fprintf(&sb, "%d|", r.ChooseChance(1, 2, 3))
	fmt.Fprintf(&sb, "%v|", r.ChooseBotName())
	fmt.Fprintf(&sb, "%v", r.ChooseBossName("legion", 2))
	return sb.String()
}

// Same seed produces the same sequence. Different seeds produce different sequences.
func TestRandSeedReproducibility(t *testing.T) {
	a := sampleSequence(NewRand(12345))
	b := sampleSequence(NewRand(12345))
	if a != b {
		t.Fatalf("same seed produced different sequences:\n%s\n%s", a, b)
	}

	c := sampleSequence(NewRand(54321))
	if a == c {
		t.Errorf("different seeds produced the same sequence: %s", a)
	}
}
