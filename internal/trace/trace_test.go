package trace

import (
	"bytes"
	"encoding/json"
	"math"
	"os"
	"path/filepath"
	"strings"
	"testing"

	"arrasgo/internal/entity"
	"arrasgo/internal/vmath"
)

// TestDecodesTaggedNonFinites checks that non-finite numbers tagged as strings decode correctly.
func TestDecodesTaggedNonFinites(t *testing.T) {
	const line = `{"tick":0,"time":33.3,"rngCalls":7,"nextEntityId":3,"count":1,"entities":[` +
		`{"id":1,"index":"12","type":"tank","label":"Basic","team":-101,` +
		`"x":"NaN","y":"Infinity","vx":"-Infinity","vy":null,` +
		`"size":10,"facing":0,"health":1,"healthMax":1,"shield":0,"shieldMax":0,` +
		`"alpha":1,"master":1,"dead":false}]}`

	var tk Tick
	if err := json.Unmarshal([]byte(line), &tk); err != nil {
		t.Fatalf("decode: %v", err)
	}
	e := tk.Entities[0]

	if !math.IsNaN(e.X.V) || e.X.Null {
		t.Errorf("x: want NaN and not null, got %v (null=%v)", e.X.V, e.X.Null)
	}
	if !math.IsInf(e.Y.V, 1) {
		t.Errorf("y: want +Inf, got %v", e.Y.V)
	}
	if !math.IsInf(e.VX.V, -1) {
		t.Errorf("vx: want -Inf, got %v", e.VX.V)
	}
	if !e.VY.Null {
		t.Errorf("vy: want null, got %v", e.VY.V)
	}
	if e.X.String() != "NaN" || e.Y.String() != "Infinity" ||
		e.VX.String() != "-Infinity" || e.VY.String() != "null" {
		t.Errorf("printed forms wrong: %s %s %s %s", e.X, e.Y, e.VX, e.VY)
	}
}

func TestNumEqual(t *testing.T) {
	num := func(f float64) Num { return Num{V: f} }
	null := Num{V: math.NaN(), Null: true}
	nan := num(math.NaN())

	cases := []struct {
		name string
		a, b Num
		tol  float64
		want bool
	}{
		{"equal numbers", num(1.5), num(1.5), 0, true},
		{"different numbers", num(1.5), num(1.5000001), 0, false},
		{"within tolerance", num(1.5), num(1.5000001), 1e-3, true},
		{"NaN vs NaN", nan, nan, 0, true},
		{"NaN vs NaN under tolerance", nan, nan, 1e-3, true},
		{"NaN vs number", nan, num(0), 0, false},
		{"NaN vs number under tolerance", nan, num(0), 1e9, false},
		{"null vs null", null, null, 0, true},
		{"null vs NaN", null, nan, 0, false},
		{"null vs number", null, num(0), 0, false},
		{"+Inf vs +Inf", num(math.Inf(1)), num(math.Inf(1)), 0, true},
		{"+Inf vs +Inf under tolerance", num(math.Inf(1)), num(math.Inf(1)), 1e-3, true},
		{"+Inf vs -Inf", num(math.Inf(1)), num(math.Inf(-1)), 0, false},
		{"+Inf vs number", num(math.Inf(1)), num(1e308), 1e-3, false},
	}
	for _, c := range cases {
		if got := c.a.Equal(c.b, c.tol); got != c.want {
			t.Errorf("%s: %v.Equal(%v, %v) = %v, want %v", c.name, c.a, c.b, c.tol, got, c.want)
		}
	}
}

func TestLoadReadsJSONL(t *testing.T) {
	dir := t.TempDir()
	p := filepath.Join(dir, "t.jsonl")
	body := `{"tick":0,"time":33,"rngCalls":1,"nextEntityId":2,"count":0,"entities":[]}
{"tick":1,"time":"NaN","rngCalls":2,"nextEntityId":2,"count":0,"entities":[]}

`
	if err := os.WriteFile(p, []byte(body), 0o600); err != nil {
		t.Fatal(err)
	}
	got, err := Load(p)
	if err != nil {
		t.Fatalf("load: %v", err)
	}
	if len(got) != 2 {
		t.Fatalf("want 2 ticks (blank lines skipped), got %d", len(got))
	}
	if !math.IsNaN(got[1].Time.V) {
		t.Errorf("tick 1 time: want NaN, got %v", got[1].Time)
	}
}

func TestRejectsUnknownNumericTag(t *testing.T) {
	var n Num
	if err := json.Unmarshal([]byte(`"NotANumber"`), &n); err == nil {
		t.Error("want an error for an unrecognised tag, got none")
	}
}

func newWorldWith(t *testing.T, n int) (*entity.World, []entity.EntityID) {
	t.Helper()
	w := entity.NewWorld(n + 4)
	ids := make([]entity.EntityID, n)
	for i := range ids {
		ids[i] = w.Spawn()
	}
	return w, ids
}

// TestWriteTickRoundTrips verifies values round-trip through write and read unchanged.
func TestWriteTickRoundTrips(t *testing.T) {
	w, ids := newWorldWith(t, 3)

	e0 := w.Get(ids[0])
	e0.Index, e0.Type, e0.Label = "12", "tank", "Basic"
	e0.Facing = 1.2345678901234567
	e0.Alpha = 0.5
	e0.Health.Amount, e0.Health.Max = 12.5, 100
	e0.Shield.Amount, e0.Shield.Max = 1, 2
	w.Pos[ids[0].Index] = vmath.Vec2{X: -220.5, Y: 3027.25}
	w.Vel[ids[0].Index] = vmath.Vec2{X: 0.125, Y: -0.0625}
	w.Size[ids[0].Index] = 10.5

	// The non-finite cases, which are the reason for the tagged encoding.
	e1 := w.Get(ids[1])
	e1.Index, e1.Type, e1.Label = "0", "wall", "Rock"
	e1.Facing = math.NaN()
	e1.Health.Amount = math.Inf(1)
	e1.Health.Max = math.Inf(-1)
	e1.Alpha = math.NaN()

	// A label that needs escaping, which player names routinely do.
	e2 := w.Get(ids[2])
	e2.Index, e2.Type = "5", "food"
	e2.Label = "he said \"hi\"\n\tand\\left ✈"

	var buf bytes.Buffer
	tw := NewWriter(&buf)
	if err := tw.WriteTick(7, 233.33333333333334, 1038, w); err != nil {
		t.Fatalf("WriteTick: %v", err)
	}
	if err := tw.Flush(); err != nil {
		t.Fatalf("Flush: %v", err)
	}

	var tk Tick
	if err := json.Unmarshal(bytes.TrimSpace(buf.Bytes()), &tk); err != nil {
		t.Fatalf("the writer produced JSON the reader rejects: %v\n%s", err, buf.String())
	}

	if tk.Tick != 7 || tk.RngCalls != 1038 || tk.Count != 3 {
		t.Errorf("header: tick=%d rngCalls=%d count=%d", tk.Tick, tk.RngCalls, tk.Count)
	}
	if tk.Time.V != 233.33333333333334 {
		t.Errorf("time round-tripped to %.17g", tk.Time.V)
	}
	if tk.NextEntityID != 3 {
		t.Errorf("nextEntityId = %d, want 3", tk.NextEntityID)
	}
	if len(tk.Entities) != 3 {
		t.Fatalf("got %d entities", len(tk.Entities))
	}

	g0 := tk.Entities[0]
	if *g0.Index != "12" || *g0.Type != "tank" || *g0.Label != "Basic" {
		t.Errorf("strings: %q %q %q", *g0.Index, *g0.Type, *g0.Label)
	}
	if g0.X.V != -220.5 || g0.Y.V != 3027.25 {
		t.Errorf("position round-tripped to %v, %v", g0.X, g0.Y)
	}
	if g0.VX.V != 0.125 || g0.VY.V != -0.0625 {
		t.Errorf("velocity round-tripped to %v, %v", g0.VX, g0.VY)
	}
	if g0.Size.V != 10.5 {
		t.Errorf("size round-tripped to %v", g0.Size)
	}
	if g0.Facing.V != 1.2345678901234567 {
		t.Errorf("facing lost precision: %.17g", g0.Facing.V)
	}
	if g0.Alpha.V != 0.5 || g0.Health.V != 12.5 || g0.HealthMax.V != 100 {
		t.Errorf("alpha/health: %v %v %v", g0.Alpha, g0.Health, g0.HealthMax)
	}
	if g0.Dead == nil || *g0.Dead {
		t.Errorf("dead = %v, want false for a 12.5-health entity", g0.Dead)
	}
	// Every entity is its own master until something sets one.
	if g0.Master == nil || *g0.Master != g0.ID {
		t.Errorf("master = %v, want its own id %d", g0.Master, g0.ID)
	}

	g1 := tk.Entities[1]
	if !math.IsNaN(g1.Facing.V) || g1.Facing.Null {
		t.Errorf("NaN facing came back as %v", g1.Facing)
	}
	if !math.IsInf(g1.Health.V, 1) || !math.IsInf(g1.HealthMax.V, -1) {
		t.Errorf("infinities came back as %v, %v", g1.Health, g1.HealthMax)
	}
	if !math.IsNaN(g1.Alpha.V) {
		t.Errorf("NaN alpha came back as %v", g1.Alpha)
	}
	// Health of +Inf is not dead because JS checks health.amount <= 0.
	if g1.Dead == nil || *g1.Dead {
		t.Errorf("dead = %v for +Inf health", g1.Dead)
	}

	if got := *tk.Entities[2].Label; got != e2.Label {
		t.Errorf("label escaping broke:\n got %q\nwant %q", got, e2.Label)
	}
}

// TestDeadReflectsHealth checks that zero health entities are marked dead.
func TestDeadReflectsHealth(t *testing.T) {
	w, ids := newWorldWith(t, 1)
	w.Get(ids[0]).Health.Amount = 0

	var buf bytes.Buffer
	tw := NewWriter(&buf)
	if err := tw.WriteTick(0, 0, 0, w); err != nil {
		t.Fatal(err)
	}
	tw.Flush()

	var tk Tick
	if err := json.Unmarshal(bytes.TrimSpace(buf.Bytes()), &tk); err != nil {
		t.Fatal(err)
	}
	if tk.Entities[0].Dead == nil || !*tk.Entities[0].Dead {
		t.Errorf("dead = %v for zero health, want true", tk.Entities[0].Dead)
	}
}

// TestEntitiesAreSortedByWireIDNotSlabOrder verifies entities are sorted by wire ID, not slab order.
func TestEntitiesAreSortedByWireIDNotSlabOrder(t *testing.T) {
	w := entity.NewWorld(8)
	a := w.Spawn() // wire 0
	b := w.Spawn() // wire 1
	c := w.Spawn() // wire 2
	w.Destroy(b)   // frees slab slot 1
	d := w.Spawn() // wire 3, reuses slab slot 1

	if d.Index != b.Index {
		t.Skipf("slot was not reused, so slab order already matches wire order")
	}
	_ = a
	_ = c

	var buf bytes.Buffer
	tw := NewWriter(&buf)
	if err := tw.WriteTick(0, 0, 0, w); err != nil {
		t.Fatal(err)
	}
	tw.Flush()

	var tk Tick
	if err := json.Unmarshal(bytes.TrimSpace(buf.Bytes()), &tk); err != nil {
		t.Fatal(err)
	}
	want := []int{0, 2, 3}
	if len(tk.Entities) != len(want) {
		t.Fatalf("got %d entities, want %d", len(tk.Entities), len(want))
	}
	for i, id := range want {
		if tk.Entities[i].ID != id {
			var got []int
			for _, e := range tk.Entities {
				got = append(got, e.ID)
			}
			t.Fatalf("ids %v, want %v (slab order would be 0,3,2)", got, want)
		}
	}
}

// TestDanglingMasterIsNull checks that destroyed masters serialize as null.
func TestDanglingMasterIsNull(t *testing.T) {
	w, ids := newWorldWith(t, 2)
	w.Get(ids[0]).Master = ids[1]
	w.Destroy(ids[1])

	var buf bytes.Buffer
	tw := NewWriter(&buf)
	if err := tw.WriteTick(0, 0, 0, w); err != nil {
		t.Fatal(err)
	}
	tw.Flush()

	var tk Tick
	if err := json.Unmarshal(bytes.TrimSpace(buf.Bytes()), &tk); err != nil {
		t.Fatal(err)
	}
	if len(tk.Entities) != 1 {
		t.Fatalf("got %d entities, want 1", len(tk.Entities))
	}
	if tk.Entities[0].Master != nil {
		t.Errorf("master = %v, want null for a destroyed master", *tk.Entities[0].Master)
	}
}

func TestMasterResolvesToWireID(t *testing.T) {
	w, ids := newWorldWith(t, 2)
	w.Get(ids[1]).Master = ids[0]

	var buf bytes.Buffer
	tw := NewWriter(&buf)
	if err := tw.WriteTick(0, 0, 0, w); err != nil {
		t.Fatal(err)
	}
	tw.Flush()

	var tk Tick
	if err := json.Unmarshal(bytes.TrimSpace(buf.Bytes()), &tk); err != nil {
		t.Fatal(err)
	}
	if tk.Entities[1].Master == nil || *tk.Entities[1].Master != tk.Entities[0].ID {
		t.Errorf("master = %v, want %d", tk.Entities[1].Master, tk.Entities[0].ID)
	}
}

// TestOneLinePerTick verifies each tick is written as a single JSON line.
func TestOneLinePerTick(t *testing.T) {
	w, _ := newWorldWith(t, 2)
	var buf bytes.Buffer
	tw := NewWriter(&buf)
	for i := 0; i < 5; i++ {
		if err := tw.WriteTick(i, float64(i)*100.0/3.0, uint64(i), w); err != nil {
			t.Fatal(err)
		}
	}
	tw.Flush()

	lines := strings.Split(strings.TrimRight(buf.String(), "\n"), "\n")
	if len(lines) != 5 {
		t.Fatalf("got %d lines, want 5", len(lines))
	}
	for i, l := range lines {
		var tk Tick
		if err := json.Unmarshal([]byte(l), &tk); err != nil {
			t.Fatalf("line %d: %v", i, err)
		}
		if tk.Tick != i {
			t.Errorf("line %d carries tick %d", i, tk.Tick)
		}
	}
}

// TestFloatsRoundTripExactly verifies finite floats round-trip exactly.
func TestFloatsRoundTripExactly(t *testing.T) {
	values := []float64{
		0, -0, 1, -1, 0.1, 1.0 / 3.0, 2.0 / 3.0,
		math.Pi, math.MaxFloat64, math.SmallestNonzeroFloat64,
		1e-7, 1e21, 1e-300, 123456789.123456789,
		33.333333333333336, 233.33333333333334,
	}
	for _, v := range values {
		encoded := string(appendNum(nil, v))
		var n Num
		if err := json.Unmarshal([]byte(encoded), &n); err != nil {
			t.Errorf("%.17g encoded as %s, which does not decode: %v", v, encoded, err)
			continue
		}
		if n.V != v {
			t.Errorf("%.17g round-tripped to %.17g via %s", v, n.V, encoded)
		}
	}
}

func TestWriteTickDoesNotAllocatePerEntity(t *testing.T) {
	w, _ := newWorldWith(t, 64)
	tw := NewWriter(new(bytes.Buffer))
	// Prime the buffers: the first tick legitimately grows them.
	if err := tw.WriteTick(0, 0, 0, w); err != nil {
		t.Fatal(err)
	}

	n := testing.AllocsPerRun(50, func() {
		_ = tw.WriteTick(1, 33.3, 100, w)
	})
	// Steady state should be near zero allocs, allowing a couple for runtime variance.
	if n > 2 {
		t.Errorf("WriteTick allocates %.0f times per call with 64 entities; "+
			"the hot path is meant to reuse its buffers", n)
	}
}
