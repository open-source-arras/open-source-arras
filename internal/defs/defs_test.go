package defs

import (
	"encoding/json"
	"path/filepath"
	"strings"
	"testing"

	"arrasgo/internal/jsutil"
)

const (
	wantDefinitions = 2492
	wantFunctions   = 100
	wantParentRefs  = 2398
)

func load(t testing.TB) *Set {
	t.Helper()
	s, err := Load(jsutil.NewRand(1))
	if err != nil {
		t.Fatalf("Load: %v", err)
	}
	return s
}

func TestLoadCount(t *testing.T) {
	s := load(t)
	if s.Len() != wantDefinitions {
		t.Fatalf("loaded %d definitions, want %d", s.Len(), wantDefinitions)
	}
	if got := len(s.Names()); got != wantDefinitions {
		t.Fatalf("%d names, want %d", got, wantDefinitions)
	}
}

func TestOrdinalsAreVerbatimAndComplete(t *testing.T) {
	s := load(t)
	seen := make(map[int]string, s.Len())
	for i := 0; i < s.Len(); i++ {
		name, ok := s.NameAt(i)
		if !ok || name == "" {
			t.Fatalf("no definition at ordinal %d", i)
		}
		if prev, dup := seen[i]; dup {
			t.Fatalf("ordinal %d claimed twice: %s and %s", i, prev, name)
		}
		seen[i] = name
		d, ok := s.Get(name)
		if !ok {
			t.Fatalf("NameAt(%d) = %q, which Get does not know", i, name)
		}
		if got := d.Index.Must(); got != float64(i) {
			t.Fatalf("%s has index %v but sits at ordinal %d", name, got, i)
		}
	}
	if _, ok := s.At(s.Len()); ok {
		t.Fatal("At returned a definition past the end")
	}
}

func TestKnownOrdinals(t *testing.T) {
	s := load(t)
	for name, want := range map[string]int{
		"genericEntity":  0,
		"genericTank":    1,
		"serverPortal":   21,
		"sphere":         95,
		"basic":          782,
		"twin":           791,
		"paladin":        1508,
		"julius":         1601,
		"toothlessBase":  1661,
		"genSentrySwarm": 2414,
	} {
		d, ok := s.Get(name)
		if !ok {
			t.Fatalf("%s missing", name)
		}
		if got := int(d.Index.Must()); got != want {
			t.Errorf("%s index = %d, want %d", name, got, want)
		}
		if n, _ := s.NameAt(want); n != name {
			t.Errorf("NameAt(%d) = %q, want %q", want, n, name)
		}
	}
}

func TestMissingIndexIsAnError(t *testing.T) {
	_, err := LoadReader(strings.NewReader(`{"definitions":{"a":{"LABEL":"A"}}}`), jsutil.NewRand(1))
	if err == nil || !strings.Contains(err.Error(), "no index") {
		t.Fatalf("want a missing-index error, got %v", err)
	}
}

func TestOutOfRangeIndexIsAnError(t *testing.T) {
	_, err := LoadReader(strings.NewReader(`{"definitions":{"a":{"index":7}}}`), jsutil.NewRand(1))
	if err == nil || !strings.Contains(err.Error(), "outside") {
		t.Fatalf("want an out-of-range error, got %v", err)
	}
}

func TestDuplicateIndexIsAnError(t *testing.T) {
	_, err := LoadReader(strings.NewReader(`{"definitions":{"a":{"index":0},"b":{"index":0}}}`), jsutil.NewRand(1))
	if err == nil || !strings.Contains(err.Error(), "claimed by both") {
		t.Fatalf("want a duplicate-ordinal error, got %v", err)
	}
}

func TestParentCycleIsAnError(t *testing.T) {
	const doc = `{"definitions":{
		"a":{"index":0,"PARENT":"b"},
		"b":{"index":1,"PARENT":"c"},
		"c":{"index":2,"PARENT":"a"}}}`
	_, err := LoadReader(strings.NewReader(doc), jsutil.NewRand(1))
	if err == nil || !strings.Contains(err.Error(), "cycle") {
		t.Fatalf("want a cycle error, got %v", err)
	}
}

func TestSelfParentIsAnError(t *testing.T) {
	const doc = `{"definitions":{"a":{"index":0,"PARENT":"a"}}}`
	_, err := LoadReader(strings.NewReader(doc), jsutil.NewRand(1))
	if err == nil || !strings.Contains(err.Error(), "cycle") {
		t.Fatalf("want a cycle error, got %v", err)
	}
}

func TestUnknownParentIsAnError(t *testing.T) {
	const doc = `{"definitions":{"a":{"index":0,"PARENT":"nope"}}}`
	_, err := LoadReader(strings.NewReader(doc), jsutil.NewRand(1))
	if err == nil || !strings.Contains(err.Error(), "does not exist") {
		t.Fatalf("want a missing-parent error, got %v", err)
	}
}

func TestUnknownKeyIsAnError(t *testing.T) {
	const doc = `{"definitions":{"a":{"index":0,"WHAT_IS_THIS":3}}}`
	_, err := LoadReader(strings.NewReader(doc), jsutil.NewRand(1))
	if err == nil || !strings.Contains(err.Error(), "WHAT_IS_THIS") {
		t.Fatalf("want an unknown-key error, got %v", err)
	}
}

func TestNilRandIsAnError(t *testing.T) {
	if _, err := Load(nil); err == nil {
		t.Fatal("Load with a nil Rand should fail")
	}
}

func TestLoadPathMatchesEmbedded(t *testing.T) {
	embeddedSet := load(t)
	fromDisk, err := LoadPath(filepath.Join("data", "definitions.json"), jsutil.NewRand(1))
	if err != nil {
		t.Fatalf("LoadPath: %v", err)
	}
	if fromDisk.Len() != embeddedSet.Len() {
		t.Fatalf("path loader saw %d definitions, embed saw %d", fromDisk.Len(), embeddedSet.Len())
	}
	for i := 0; i < fromDisk.Len(); i++ {
		a, _ := fromDisk.NameAt(i)
		b, _ := embeddedSet.NameAt(i)
		if a != b {
			t.Fatalf("ordinal %d: path loader says %q, embed says %q", i, a, b)
		}
	}
}

func TestUndefinedSentinelReadsAsAbsent(t *testing.T) {
	s := load(t)
	d, ok := s.Get("paladin")
	if !ok {
		t.Fatal("paladin missing")
	}
	if d.Body.IsSet() {
		t.Error("paladin BODY should be absent")
	}
	if d.Size.IsSet() {
		t.Error("paladin SIZE should be absent")
	}
	if d.Value.IsSet() {
		t.Error("paladin VALUE should be absent")
	}
	// And an absent Opt hands back the caller's default, never a silent zero.
	if got := d.Size.Or(-1); got != -1 {
		t.Errorf("absent SIZE.Or(-1) = %v", got)
	}
}

func TestNullReadsAsAbsent(t *testing.T) {
	s := load(t)
	d, ok := s.Get("genericEntity")
	if !ok {
		t.Fatal("genericEntity missing")
	}
	if v, ok := d.RerootUpgradeTree.Get(); ok {
		t.Errorf("genericEntity REROOT_UPGRADE_TREE is null in the dump, got %+v", v)
	}
}

func TestFunctionSentinels(t *testing.T) {
	s := load(t)
	sites := s.FunctionSites()
	if len(sites) != wantFunctions {
		t.Fatalf("found %d function sentinels, want %d", len(sites), wantFunctions)
	}
	byDef := map[string]int{}
	for _, site := range sites {
		byDef[site.Definition]++
		if site.Func.Source == "" {
			t.Errorf("%s: function sentinel with no source text", site.Definition)
		}
		if site.Func.Path == "" {
			t.Errorf("%s: function sentinel with no path", site.Definition)
		}
	}
	for name, want := range map[string]int{
		"serverPortal":   61,
		"onTest":         5,
		"absoluteSolver": 2,
		"toothlessBase":  1,
		"portalAura":     1,
	} {
		if byDef[name] != want {
			t.Errorf("%s carries %d functions, want %d", name, byDef[name], want)
		}
	}

	d, _ := s.Get("toothlessBase")
	f := d.DefineLevelSkill.Must()
	if f.Name != "defineLevelSkillPoints" {
		t.Errorf("name = %q", f.Name)
	}
	if !strings.Contains(f.Source, "if (level < 2) return 0;") {
		t.Errorf("source does not look like the original: %q", f.Source)
	}
	err := f.Call()
	if err == nil {
		t.Fatal("calling an unported function must fail")
	}
	if !strings.Contains(err.Error(), f.Path) {
		t.Errorf("the error should name the JS source, got %v", err)
	}
}

func TestServerPortalSpawnDelaysAreRerolled(t *testing.T) {
	const frozenFirst = 107.26172131866359

	s := load(t)
	d, _ := s.Get("serverPortal")
	guns := d.Guns.Must()
	if len(guns) != 62 {
		t.Fatalf("serverPortal has %d guns, want 62", len(guns))
	}
	var delays []float64
	for i := 0; i < 60; i++ {
		p := guns[i].Position
		if !p.FromArray {
			t.Fatalf("gun %d POSITION is not the array form", i)
		}
		if want := 360.0 / 60 * float64(i); p.Angle.Must() != want {
			t.Fatalf("gun %d angle = %v, want %v", i, p.Angle.Must(), want)
		}
		delay := p.Delay.Must()
		if delay < 0 || delay >= 252 {
			t.Fatalf("gun %d delay %v is outside [0, 252)", i, delay)
		}
		if delay == frozenFirst {
			t.Fatalf("gun %d still carries the frozen dump value", i)
		}
		delays = append(delays, delay)
	}
	if got := guns[60].Position.Delay.Must(); got != 0 {
		t.Errorf("gun 60 delay = %v, want the literal 0", got)
	}
	if got := guns[61].Position.Delay.Must(); got != 2 {
		t.Errorf("gun 61 delay = %v, want the literal 2", got)
	}

	again, err := Load(jsutil.NewRand(1))
	if err != nil {
		t.Fatal(err)
	}
	d2, _ := again.Get("serverPortal")
	for i, g := range d2.Guns.Must()[:60] {
		if got := g.Position.Delay.Must(); got != delays[i] {
			t.Fatalf("gun %d: seed 1 gave %v then %v", i, delays[i], got)
		}
	}

	other, err := Load(jsutil.NewRand(2))
	if err != nil {
		t.Fatal(err)
	}
	d3, _ := other.Get("serverPortal")
	same := 0
	for i, g := range d3.Guns.Must()[:60] {
		if g.Position.Delay.Must() == delays[i] {
			same++
		}
	}
	if same == 60 {
		t.Fatal("a different seed produced identical spawn delays")
	}
}

func TestServerPortalShapeCheck(t *testing.T) {
	const doc = `{"definitions":{"serverPortal":{"index":0,"GUNS":[
		{"POSITION":[2,8,1,-150,0,0,5]}]}}}`
	_, err := LoadReader(strings.NewReader(doc), jsutil.NewRand(1))
	if err == nil || !strings.Contains(err.Error(), "generated guns") {
		t.Fatalf("want a generated-gun count error, got %v", err)
	}
}

func TestParentReferenceCount(t *testing.T) {
	s := load(t)
	refs := 0
	for _, name := range s.Names() {
		d, _ := s.Get(name)
		refs += len(d.Parent)
	}
	if refs != wantParentRefs {
		t.Errorf("counted %d PARENT references, want %d", refs, wantParentRefs)
	}
}

func TestParentShapes(t *testing.T) {
	s := load(t)
	cases := map[string][]string{
		"basic":          {"genericTank"}, // plain string
		"genSentrySwarm": {"sentrySwarm"}, // single-element array
	}
	for name, want := range cases {
		d, ok := s.Get(name)
		if !ok {
			t.Fatalf("%s missing", name)
		}
		if len(d.Parent) != len(want) {
			t.Fatalf("%s has %d parents, want %d", name, len(d.Parent), len(want))
		}
		for i, w := range want {
			if d.Parent[i].Name != w {
				t.Errorf("%s parent %d = %q, want %q", name, i, d.Parent[i].Name, w)
			}
		}
	}
	for _, name := range s.Names() {
		d, _ := s.Get(name)
		for _, p := range d.Parent {
			if p.Name == "" && p.Inline == nil {
				t.Fatalf("%s has an empty PARENT reference", name)
			}
			if p.Name != "" {
				if _, ok := s.Get(p.Name); !ok {
					t.Fatalf("%s references unknown parent %q", name, p.Name)
				}
			}
		}
	}
}

func TestBasicRawFields(t *testing.T) {
	s := load(t)
	d, _ := s.Get("basic")
	if got := d.Label.Must(); got != "Basic" {
		t.Errorf("LABEL = %q", got)
	}
	if got := d.Danger.Must(); got != 4 {
		t.Errorf("DANGER = %v", got)
	}
	guns := d.Guns.Must()
	if len(guns) != 1 {
		t.Fatalf("%d guns, want 1", len(guns))
	}
	pos := guns[0].Position
	if pos.FromArray {
		t.Error("basic's gun POSITION is written as an object")
	}
	if pos.Length.Must() != 18 || pos.Width.Must() != 8 {
		t.Errorf("POSITION = %+v", pos)
	}
	if pos.Y.IsSet() {
		t.Error("POSITION.Y is absent in the source and must stay absent, not become 0")
	}
	ss := guns[0].Properties.Must().ShootSettings.Must()
	for _, c := range []struct {
		name string
		got  float64
		want float64
	}{
		{"reload", ss.Reload.Must(), 10.5},
		{"recoil", ss.Recoil.Must(), 1.4},
		{"shudder", ss.Shudder.Must(), 0.1},
		{"size", ss.Size.Must(), 1},
		{"health", ss.Health.Must(), 1},
		{"damage", ss.Damage.Must(), 0.75},
		{"pen", ss.Pen.Must(), 1},
		{"speed", ss.Speed.Must(), 4},
		{"maxSpeed", ss.MaxSpeed.Must(), 1},
		{"range", ss.Range.Must(), 1},
		{"density", ss.Density.Must(), 1},
		{"spray", ss.Spray.Must(), 15},
		{"resist", ss.Resist.Must(), 1},
	} {
		if c.got != c.want {
			t.Errorf("SHOOT_SETTINGS.%s = %v, want %v", c.name, c.got, c.want)
		}
	}
	types := guns[0].Properties.Must().Type
	if len(types) != 1 || types[0].Name != "bullet" {
		t.Errorf("TYPE = %+v", types)
	}
	tier1 := d.Upgrades[1].Must()
	if len(tier1) != 8 || tier1[0].Classes[0].Name != "twin" {
		t.Errorf("UPGRADES_TIER_1 = %+v", tier1)
	}
	tier2 := d.Upgrades[2].Must()
	if len(tier2) != 1 || tier2[0].Classes[0].Name != "smasher" {
		t.Errorf("UPGRADES_TIER_2 = %+v, want just smasher (Config.teams was off at dump time)", tier2)
	}
}

func TestPositionArrayLayouts(t *testing.T) {
	s := load(t)

	sp, _ := s.Get("serverPortal")
	g := sp.Guns.Must()[0].Position
	if g.Length.Must() != 2 || g.Width.Must() != 8 || g.Aspect.Must() != 1 ||
		g.X.Must() != -150 || g.Y.Must() != 0 || g.Angle.Must() != 0 {
		t.Errorf("gun POSITION array mapped wrong: %+v", g)
	}

	pal, _ := s.Get("paladin")
	tp := pal.Turrets.Must()[0].Position
	if tp.Size.Must() != 6.5 || tp.X.Must() != 9 || tp.Y.Must() != 0 ||
		tp.Angle.Must() != 20 || tp.Arc.Must() != 180 || tp.Layer.Must() != 0 {
		t.Errorf("turret POSITION array mapped wrong: %+v", tp)
	}

	sph, _ := s.Get("sphere")
	pp := sph.Props.Must()[0].Position
	if pp.Size.Must() != 17 || pp.X.Must() != 0 || pp.Y.Must() != 0 ||
		pp.Angle.Must() != 0 || pp.Layer.Must() != 1 {
		t.Errorf("prop POSITION array mapped wrong: %+v", pp)
	}
	if pp.Arc.IsSet() {
		t.Error("a prop POSITION array has no ARC slot")
	}

	pk, _ := s.Get("pumpkin")
	extra := pk.Props.Must()[0].Position
	if extra.Layer.Must() != 360 {
		t.Errorf("pumpkin prop LAYER = %v, want the misread 360", extra.Layer.Must())
	}
	if len(extra.Unread) != 1 || extra.Unread[0] != 1 {
		t.Errorf("the dropped slot should be preserved, got %v", extra.Unread)
	}
}

func TestColorSpecShapes(t *testing.T) {
	s := load(t)
	ge, _ := s.Get("genericEntity")
	if ge.Color.Kind != ColorObject {
		t.Fatalf("genericEntity COLOR kind = %v", ge.Color.Kind)
	}
	if got := ge.Color.Obj.Base.Num; got != 16 {
		t.Errorf("BASE = %v", got)
	}
	if got := ge.Color.Obj.SaturationShift.Must(); got != 1 {
		t.Errorf("SATURATION_SHIFT = %v", got)
	}

	sp, _ := s.Get("sphere")
	if sp.Color.Kind != ColorObject {
		t.Errorf("sphere COLOR kind = %v", sp.Color.Kind)
	}
	pal, _ := s.Get("paladin")
	if pal.Color.Kind != ColorString || pal.Color.Str != "purple" {
		t.Errorf("paladin COLOR = %v %q", pal.Color.Kind, pal.Color.Str)
	}
}

func TestOptRoundTrips(t *testing.T) {
	var o Opt[float64]
	if o.IsSet() {
		t.Fatal("the zero Opt is set")
	}
	if err := json.Unmarshal([]byte(`{"__nonSerialisable":"undefined","path":"x"}`), &o); err != nil {
		t.Fatal(err)
	}
	if o.IsSet() {
		t.Fatal("the undefined sentinel should read as absent")
	}
	if err := json.Unmarshal([]byte(`null`), &o); err != nil {
		t.Fatal(err)
	}
	if o.IsSet() {
		t.Fatal("null should read as absent")
	}
	if err := json.Unmarshal([]byte(`0`), &o); err != nil {
		t.Fatal(err)
	}
	if v, ok := o.Get(); !ok || v != 0 {
		t.Fatalf("an explicit 0 must be present: %v %v", v, ok)
	}
	var n Opt[float64]
	err := json.Unmarshal([]byte(`{"__nonSerialisable":"function","path":"p","name":"n","source":"()=>{}"}`), &n)
	if err == nil || !strings.Contains(err.Error(), "function") {
		t.Fatalf("want a loud function-sentinel error, got %v", err)
	}
}

func BenchmarkLoad(b *testing.B) {
	rng := jsutil.NewRand(1)
	b.ReportAllocs()
	for b.Loop() {
		if _, err := Load(rng); err != nil {
			b.Fatal(err)
		}
	}
}
