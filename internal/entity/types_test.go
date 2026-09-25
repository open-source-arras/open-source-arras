package entity

import (
	"math"
	"testing"

	"arrasgo/internal/config"
)

// These values came from Node, not from reading the source.
func testTuning() *config.Tuning {
	return &config.Tuning{
		SkillCap:          9,
		SkillCapSoft:      0,
		SoftMaxSkill:      0.59,
		GlassHealthFactor: 2,
		LevelCap:          45,
		LevelCapCheat:     45,
		TierMultiplier:    15,
	}
}

// near compares against a Node double with tolerance for floating-point differences.
func near(t *testing.T, got, want float64, what string) {
	t.Helper()
	if math.IsNaN(want) {
		if !math.IsNaN(got) {
			t.Errorf("%s = %v, want NaN", what, got)
		}
		return
	}
	if got == want {
		return
	}
	scale := math.Abs(want)
	if scale < 1 {
		scale = 1
	}
	if math.Abs(got-want) > 1e-12*scale {
		t.Errorf("%s = %.17g, want %.17g", what, got, want)
	}
}

// TestHealthTypeGetDamageMatchesNode verifies damage calculation.
func TestHealthTypeGetDamageMatchesNode(t *testing.T) {
	cases := []struct {
		mode   HealthMode
		max    float64
		amount float64
		req    float64
		capped bool
		want   float64
	}{
		{HealthStatic, 100, 100, 1, true, 1},
		{HealthStatic, 100, 100, 1000, true, 100},
		{HealthStatic, 100, 100, 1000, false, 1000},
		{HealthStatic, 100, 50, -5, true, -5},
		{HealthStatic, 100, 99, -5, true, -1},
		{HealthStatic, 100, 150, 1, true, 50},
		{HealthStatic, 100, 150, 0, true, 50},
		{HealthStatic, 100, 150, 0, false, 50},
		{HealthStatic, 0, 0, 10, true, 0},
		{HealthStatic, 10, 3, 7.5, true, 3},
		{HealthDynamic, 100, 100, 10, true, 10},
		{HealthDynamic, 100, 50, 10, true, 5},
		{HealthDynamic, 100, 50, 1000, true, 50},
		{HealthDynamic, 100, 50, 1000, false, 500},
		{HealthDynamic, 100, 0, 10, true, 0},
		{HealthDynamic, 0, 0, 10, true, 0},
		{HealthDynamic, 100, 150, 10, true, 50},
		{HealthDynamic, 100, 150, 0, true, 50},
		{HealthDynamic, 10, 3, 7.5, true, 2.25},
		{HealthDynamic, 10, 3, 7.5, false, 2.25},
	}
	for _, c := range cases {
		h := NewHealthType(c.max, c.mode, 0)
		h.Amount = c.amount
		got := h.GetDamage(c.req, c.capped)
		near(t, got, c.want, "getDamage")
	}
}

// TestHealthTypePermeabilityRatioDisplayMatchNode verifies permeability calculations.
func TestHealthTypePermeabilityRatioDisplayMatchNode(t *testing.T) {
	cases := []struct {
		mode                 HealthMode
		max, amount          float64
		perm, ratio, display float64
	}{
		{mode: HealthStatic, max: 100, amount: 50, perm: 1, ratio: 0.9375, display: 0.5},
		{mode: HealthStatic, max: 0, amount: 0, perm: 1, ratio: 0, display: math.NaN()},
		{mode: HealthDynamic, max: 100, amount: 100, perm: 1, ratio: 1, display: 1},
		{mode: HealthDynamic, max: 100, amount: 50, perm: 0.5, ratio: 0.9375, display: 0.5},
		{mode: HealthDynamic, max: 100, amount: 0, perm: 0, ratio: 0, display: 0},
		{mode: HealthDynamic, max: 0, amount: 0, perm: 0, ratio: 0, display: math.NaN()},
		{mode: HealthDynamic, max: 100, amount: 150, perm: 1, ratio: 0.9375, display: 1.5},
		{mode: HealthDynamic, max: 100, amount: 25, perm: 0.25, ratio: 0.68359375, display: 0.25},
		{mode: HealthStatic, max: 100, amount: 150, perm: 1, ratio: 0.9375, display: 1.5},
	}
	for _, c := range cases {
		h := NewHealthType(c.max, c.mode, 0)
		h.Amount = c.amount
		near(t, h.Permeability(), c.perm, "permeability")
		near(t, h.Ratio(), c.ratio, "ratio")
		near(t, h.Display(), c.display, "display")
	}
}

// TestHealthTypeRegenerateMatchesNode verifies regeneration.
func TestHealthTypeRegenerateMatchesNode(t *testing.T) {
	cases := []struct {
		mode         HealthMode
		max, amount  float64
		regen, boost float64
		wantAfter    float64
	}{
		{mode: HealthStatic, max: 100, amount: 50, regen: 0, boost: 0, wantAfter: 50},
		{mode: HealthStatic, max: 100, amount: 50, regen: 0, boost: 1, wantAfter: 52.5},
		{mode: HealthStatic, max: 100, amount: 0, regen: 0, boost: 1, wantAfter: 0},
		{mode: HealthStatic, max: 100, amount: 100, regen: 0, boost: 1, wantAfter: 100},
		{mode: HealthDynamic, max: 100, amount: 50, regen: 1, boost: 0, wantAfter: 52.677551099521054},
		{mode: HealthDynamic, max: 100, amount: 50, regen: 1, boost: 1, wantAfter: 55.177551099521054},
		{mode: HealthDynamic, max: 100, amount: 0, regen: 1, boost: 0, wantAfter: 0.0001},
		{mode: HealthDynamic, max: 100, amount: 100, regen: 1, boost: 0, wantAfter: 100},
		{mode: HealthDynamic, max: 100, amount: 150, regen: 1, boost: 0, wantAfter: 100},
		{mode: HealthDynamic, max: 100, amount: 1, regen: 1, boost: 0, wantAfter: 1.040700314619657},
		{mode: HealthDynamic, max: 100, amount: 99, regen: 5, boost: 0, wantAfter: 100},
		{mode: HealthDynamic, max: 0, amount: 0, regen: 1, boost: 0, wantAfter: math.NaN()},
	}
	for _, c := range cases {
		h := NewHealthType(c.max, c.mode, 0)
		h.Amount = c.amount
		h.Regen = c.regen
		h.Regenerate(c.boost)
		near(t, h.Amount, c.wantAfter, "regenerate")
	}
}

// TestHealthTypeSetMatchesNode verifies set operations.
func TestHealthTypeSetMatchesNode(t *testing.T) {
	cases := []struct {
		mode                        HealthMode
		max, amount                 float64
		newHealth, newRegen         float64
		wantAmount, wantMax, wantRg float64
	}{
		{HealthStatic, 100, 50, 200, 0, 100, 200, 0},
		{HealthStatic, 0, 0, 50, 3, 50, 50, 3},
		{HealthDynamic, 100, 100, 50, 2, 50, 50, 2},
		{HealthDynamic, 100, 25, 0, 0, 0, 0, 0},
	}
	for _, c := range cases {
		h := NewHealthType(c.max, c.mode, 0)
		h.Amount = c.amount
		h.Set(c.newHealth, c.newRegen)
		near(t, h.Amount, c.wantAmount, "set amount")
		near(t, h.Max, c.wantMax, "set max")
		near(t, h.Regen, c.wantRg, "set regen")
	}
}

// TestHealthTypeConstructorMatchesEntityConstructor verifies constructor.
func TestHealthTypeConstructorMatchesEntityConstructor(t *testing.T) {
	health := NewHealthType(1, HealthStatic, 0)
	shield := NewHealthType(0, HealthDynamic, 0)
	if health.Amount != 1 || health.Max != 1 || health.Mode != HealthStatic {
		t.Errorf("health = %+v, want a full static pool of 1", health)
	}
	if shield.Amount != 0 || shield.Max != 0 || shield.Mode != HealthDynamic {
		t.Errorf("shield = %+v, want an empty dynamic pool", shield)
	}
}

// TestSkillUpdateMatchesNode verifies skill calculation.
func TestSkillUpdateMatchesNode(t *testing.T) {
	cfg := testTuning()
	cases := []struct {
		raw                                                                     [SkillCount]int32
		rld, pen, str, dam, spd, acl, rst, ghost, shi, atk, hlt, mob, rgn, brst float64
	}{
		{
			raw: [SkillCount]int32{0, 0, 0, 0, 0, 0, 0, 0, 0, 0},
			rld: 1, pen: 1, str: 1, dam: 1, spd: 1.5, acl: 1, rst: 0, ghost: 0,
			shi: 2, atk: 1, hlt: 2, mob: 1, rgn: 1, brst: 0,
		},
		{
			raw: [SkillCount]int32{9, 9, 9, 9, 9, 9, 9, 9, 9, 9},
			rld: 0.497959841605081, pen: 3.5147467381782818, str: 3.0117973905426254,
			dam: 4.017696085813938, spd: 3.008848042906969, acl: 1.5029493476356564,
			rst: 3.017696085813938, ghost: 1.0058986952713127, shi: 3.0058986952713127,
			atk: 1.0211238726006975, hlt: 2, mob: 1.8047189562170503,
			rgn: 26.147467381782818, brst: 0.6035392171627876,
		},
		{
			raw: [SkillCount]int32{1, 2, 3, 4, 5, 6, 7, 8, 9, 0},
			rld: 0.8527365574229192, pen: 1.993732447999995, str: 2.0591223254840045,
			dam: 2.915596089122465, spd: 2.596941799359614, acl: 1.1149139937891617,
			rst: 1.2585130293709959, ghost: 0.39749297919999793, shi: 2.812051865081413,
			atk: 1.0185547250259175, hlt: 2, mob: 1, rgn: 26.147467381782818,
			brst: 0.5764609358947775,
		},
		{
			raw: [SkillCount]int32{5, 0, 0, 0, 0, 0, 0, 0, 0, 0},
			rld: 0.6023631696992674, pen: 1, str: 1, dam: 1, spd: 1.5,
			acl: 1.3656472664532044, rst: 0, ghost: 0, shi: 2, atk: 1, hlt: 2,
			mob: 1, rgn: 1, brst: 0,
		},
		{
			raw: [SkillCount]int32{0, 0, 0, 0, 0, 0, 0, 0, 0, 9},
			rld: 1, pen: 1, str: 1, dam: 1, spd: 1.5, acl: 1, rst: 0, ghost: 0,
			shi: 2, atk: 1, hlt: 2, mob: 1.8047189562170503, rgn: 1, brst: 0,
		},
	}
	for _, c := range cases {
		s := NewSkill(cfg)
		s.Set(cfg, c.raw)
		near(t, s.Rld, c.rld, "rld")
		near(t, s.Pen, c.pen, "pen")
		near(t, s.Str, c.str, "str")
		near(t, s.Dam, c.dam, "dam")
		near(t, s.Spd, c.spd, "spd")
		near(t, s.Acl, c.acl, "acl")
		near(t, s.Rst, c.rst, "rst")
		near(t, s.Ghost, c.ghost, "ghost")
		near(t, s.Shi, c.shi, "shi")
		near(t, s.Atk, c.atk, "atk")
		near(t, s.Hlt, c.hlt, "hlt")
		near(t, s.Mob, c.mob, "mob")
		near(t, s.Rgn, c.rgn, "rgn")
		near(t, s.Brst, c.brst, "brst")
	}
}

// TestSkillLoweringCapsRefundsPoints verifies cap lowering refunds.
func TestSkillLoweringCapsRefundsPoints(t *testing.T) {
	cfg := testTuning()
	s := NewSkill(cfg)
	s.Points = 0
	s.Raw = [SkillCount]int32{9, 9, 9, 9, 9, 9, 9, 9, 9, 9}
	s.SetCaps(cfg, [SkillCount]int32{1, 1, 1, 1, 1, 1, 1, 1, 1, 1})

	if s.Points != 80 {
		t.Errorf("points = %d, want 80 refunded", s.Points)
	}
	for i, v := range s.Raw {
		if v != 1 {
			t.Errorf("raw[%d] = %d, want 1", i, v)
		}
	}
}

// TestSkillLevelProgressionMatchesNode verifies level progression.
func TestSkillLevelProgressionMatchesNode(t *testing.T) {
	cfg := testTuning()
	s := NewSkill(cfg)

	if s.Level != 0 || s.Points != 0 || s.LevelUpScore != 1 || s.Deduction != 0 {
		t.Fatalf("fresh skill = level %d points %d levelUpScore %v deduction %v; want 0/0/1/0",
			s.Level, s.Points, s.LevelUpScore, s.Deduction)
	}
	if s.LevelScore() != 1 || s.ScoreForLevel() != 0 {
		t.Fatalf("fresh levelScore %v scoreForLevel %v, want 1 and 0", s.LevelScore(), s.ScoreForLevel())
	}

	want := [][5]float64{
		{1, 0, 1, 1, 1},
		{2, 1, 1, 1, 3},
		{3, 2, 3, 3, 9},
		{4, 3, 9, 9, 20},
		{5, 4, 20, 20, 39},
		{6, 5, 39, 39, 67},
	}
	for i, row := range want {
		s.Score += s.LevelScore()
		s.Maintain(cfg)
		got := [5]float64{float64(s.Level), float64(s.Points), s.Score, s.Deduction, s.LevelUpScore}
		if got != row {
			t.Errorf("step %d = %v, want %v", i, got, row)
		}
	}

	for i := 6; i < 50; i++ {
		s.Score += s.LevelScore()
		s.Maintain(cfg)
	}
	if s.Level != 50 || s.Points != 42 || s.Score != 36272 || s.LevelUpScore != 38538 {
		t.Errorf("after 50 maintains: level %d points %d score %v levelUpScore %v; want 50/42/36272/38538",
			s.Level, s.Points, s.Score, s.LevelUpScore)
	}
}

// TestSkillScoreForLevelMatchesNode verifies scoreForLevel.
func TestSkillScoreForLevelMatchesNode(t *testing.T) {
	s := Skill{}
	for _, c := range []struct {
		level int32
		want  float64
	}{{0, 0}, {1, 1}, {2, 3}, {5, 39}, {10, 309}, {44, 26263}, {45, 28094}, {120, 532743}} {
		s.Level = c.level
		if got := s.ScoreForLevel(); got != c.want {
			t.Errorf("scoreForLevel(%d) = %v, want %v", c.level, got, c.want)
		}
	}
}

// TestSkillUpgradeAndCap verifies upgrade and cap operations.
func TestSkillUpgradeAndCap(t *testing.T) {
	cfg := testTuning()
	s := NewSkill(cfg)

	if got, real := s.Cap(cfg, SkillRld, false), s.Cap(cfg, SkillRld, true); got != 9 || real != 9 {
		t.Errorf("cap = %d (real %d), want 9/9", got, real)
	}

	s.Points = 3
	if !s.Upgrade(cfg, SkillAtk) {
		t.Fatal("upgrade with points available returned false")
	}
	if s.Amount(SkillAtk) != 1 || s.Points != 2 {
		t.Errorf("after upgrade: atk %d points %d, want 1/2", s.Amount(SkillAtk), s.Points)
	}
	s.Points = 0
	if s.Upgrade(cfg, SkillAtk) {
		t.Error("upgrade with no points returned true")
	}
	if s.Amount(SkillAtk) != 1 {
		t.Errorf("failed upgrade still spent a level: atk = %d", s.Amount(SkillAtk))
	}
}

// TestSkillProgress verifies progress calculation.
func TestSkillProgress(t *testing.T) {
	cfg := testTuning()
	s := NewSkill(cfg)
	if got := s.Progress(); got != 0 {
		t.Errorf("fresh progress = %v, want 0", got)
	}
	s.Score = 1
	if got := s.Progress(); got != 1 {
		t.Errorf("progress at score 1 = %v, want 1", got)
	}
}

// TestSkillIndexNamesMatchSkcnv verifies skill names and indices.
func TestSkillIndexNamesMatchSkcnv(t *testing.T) {
	want := []struct {
		name string
		slot int
	}{
		{"rld", 0}, {"pen", 1}, {"str", 2}, {"dam", 3}, {"spd", 4},
		{"shi", 5}, {"atk", 6}, {"hlt", 7}, {"rgn", 8}, {"mob", 9},
	}
	for _, c := range want {
		got, ok := SkillIndexOf(c.name)
		if !ok || got != c.slot {
			t.Errorf("SkillIndexOf(%q) = %d, %v; want %d, true", c.name, got, ok, c.slot)
		}
	}
	if _, ok := SkillIndexOf("nope"); ok {
		t.Error("SkillIndexOf accepted an unknown stat")
	}
	if got := (&Skill{}).Title(SkillShi); got != "Shield Capacity" {
		t.Errorf("Title(shi) = %q", got)
	}
}

// TestColorCompiledMatchesNode verifies color compilation.
func TestColorCompiledMatchesNode(t *testing.T) {
	if got := NewColorNumber(16, false).Compiled; got != "16 0 1 0 false" {
		t.Errorf("Color(16) = %q", got)
	}
	if got := NewColorNumber(-1, false).Compiled; got != "-1 0 1 0 false" {
		t.Errorf("Color(-1) = %q", got)
	}
	if got := NewColorString("lightGray", false).Compiled; got != "lightGray 0 1 0 false" {
		t.Errorf("Color(\"lightGray\") = %q", got)
	}
	if got := NewColorString("teal 0.5 2 -15 true", false).Compiled; got != "teal 0.5 2 -15 true" {
		t.Errorf("split form = %q", got)
	}
	if got := NewColorString("teal 0.5 2 -15 false", false).Compiled; got != "teal 0.5 2 -15 false" {
		t.Errorf("split form = %q", got)
	}
	if got := NewColorString("teal 0 1 0 TRUE", false).Compiled; got != "teal 0 1 0 false" {
		t.Errorf("invert flag is case sensitive: %q", got)
	}
	if got := NewColorString("blue x y z w", false).Compiled; got != "blue NaN NaN NaN false" {
		t.Errorf("garbage split form = %q", got)
	}
	if got := NewColorUndefined(false).Compiled; got != "-1 0 1 0 false" {
		t.Errorf("Color(undefined) = %q", got)
	}
}

// TestColorSpecMatchesNode verifies color spec operations.
func TestColorSpecMatchesNode(t *testing.T) {
	cases := []struct {
		spec ColorSpec
		want string
	}{
		{ColorSpec{Base: "17", HasBase: true, BrightnessShift: 5, HasBrightnessShift: true}, "17 0 1 5 false"},
		{ColorSpec{Base: "veryLightGrey", HasBase: true, BrightnessShift: -15, HasBrightnessShift: true}, "veryLightGrey 0 1 -15 false"},
		{ColorSpec{
			Base: "16", HasBase: true,
			HueShift: 0, HasHueShift: true,
			SaturationShift: 1, HasSaturationShift: true,
			BrightnessShift: 0, HasBrightnessShift: true,
			AllowBrightnessInvert: true, HasAllowBrightnessInvert: true,
		}, "16 0 1 0 true"},
		{ColorSpec{Base: "3", HasBase: true, HueShift: 1, HasHueShift: true}, "3 1 1 0 false"},
	}
	for _, c := range cases {
		if got := NewColorSpec(c.spec, false).Compiled; got != c.want {
			t.Errorf("spec %+v = %q, want %q", c.spec, got, c.want)
		}
	}
}

// TestColorSettersRecompile verifies recompilation on setter calls.
func TestColorSettersRecompile(t *testing.T) {
	c := NewColorNumber(16, false)
	c.SetBase("red")
	if c.Compiled != "red 0 1 0 false" {
		t.Errorf("after SetBase: %q", c.Compiled)
	}
	c.SetHueShift(0.25)
	if c.Compiled != "red 0.25 1 0 false" {
		t.Errorf("after SetHueShift: %q", c.Compiled)
	}
	c.Reset()
	if c.Compiled != "-1 0 1 0 false" {
		t.Errorf("after Reset: %q", c.Compiled)
	}
}

// TestColorTileChangeIsFlagged verifies tile color change flagging.
func TestColorTileChangeIsFlagged(t *testing.T) {
	c := NewColorNumber(16, true)
	if !c.TileColorChanged {
		t.Error("constructing a tile colour should flag a change")
	}
	c.TileColorChanged = false
	c.SetBrightnessShift(0)
	if c.TileColorChanged {
		t.Error("recompiling to the same string should not flag a change")
	}
	c.SetBrightnessShift(5)
	if !c.TileColorChanged {
		t.Error("a real change should flag")
	}

	plain := NewColorNumber(16, false)
	plain.SetBase("red")
	if plain.TileColorChanged {
		t.Error("a non-tile colour must never flag")
	}
}

// TestJSNumberToStringMatchesNode verifies number-to-string conversion.
func TestJSNumberToStringMatchesNode(t *testing.T) {
	cases := []struct {
		in   float64
		want string
	}{
		{0, "0"},
		{math.Copysign(0, -1), "0"},
		{1, "1"},
		{-1, "-1"},
		{16, "16"},
		{-15, "-15"},
		{100, "100"},
		{0.5, "0.5"},
		{0.25, "0.25"},
		{1.5, "1.5"},
		{2, "2"},
		{1e21, "1e+21"},
		{1e-7, "1e-7"},
		{0.000001, "0.000001"},
		{1234567890123456789012, "1.2345678901234568e+21"},
		{math.NaN(), "NaN"},
		{math.Inf(1), "Infinity"},
		{math.Inf(-1), "-Infinity"},
	}
	for _, c := range cases {
		if got := jsNumberToString(c.in); got != c.want {
			t.Errorf("jsNumberToString(%v) = %q, want %q", c.in, got, c.want)
		}
	}
}

// TestJSParseFloatMatchesNode verifies parseFloat conversion.
func TestJSParseFloatMatchesNode(t *testing.T) {
	cases := []struct {
		in   string
		want float64
	}{
		{"0.5", 0.5},
		{"-15", -15},
		{"+2", 2},
		{"2.", 2},
		{".5", 0.5},
		{"1e3", 1000},
		{"1e", 1},
		{"12abc", 12},
		{"abc", math.NaN()},
		{"", math.NaN()},
		{"Infinity", math.Inf(1)},
		{"-Infinity", math.Inf(-1)},
	}
	for _, c := range cases {
		got := jsParseFloat(c.in)
		if math.IsNaN(c.want) {
			if !math.IsNaN(got) {
				t.Errorf("jsParseFloat(%q) = %v, want NaN", c.in, got)
			}
			continue
		}
		if got != c.want {
			t.Errorf("jsParseFloat(%q) = %v, want %v", c.in, got, c.want)
		}
	}
}

// TestActivationStartsActive verifies activation state.
func TestActivationStartsActive(t *testing.T) {
	a := NewActivation()
	if !a.Active || a.Timer != 15 {
		t.Errorf("NewActivation = %+v, want {true 15}", a)
	}
}

// TestAntiNaNSeedIsOneOne verifies antiNaN initialization.
func TestAntiNaNSeedIsOneOne(t *testing.T) {
	a := NewAntiNaN()
	if a.X != 1 || a.Y != 1 || a.VX != 0 || a.VY != 0 || a.AX != 0 || a.AY != 0 || a.NansInARow != 0 {
		t.Errorf("NewAntiNaN = %+v", a)
	}
}

// TestDefaultStatNamesMatchEntityJS verifies stat names.
func TestDefaultStatNamesMatchEntityJS(t *testing.T) {
	n := DefaultStatNames()
	want := map[int]string{
		SkillAtk: "Body Damage",
		SkillHlt: "Max Health",
		SkillSpd: "Bullet Speed",
		SkillStr: "Bullet Health",
		SkillPen: "Bullet Penetration",
		SkillDam: "Bullet Damage",
		SkillRld: "Reload",
		SkillMob: "Movement Speed",
		SkillRgn: "Shield Regeneration",
		SkillShi: "Shield Capacity",
	}
	for slot, s := range want {
		if n[slot] != s {
			t.Errorf("StatNames[%d] = %q, want %q", slot, n[slot], s)
		}
	}
}
