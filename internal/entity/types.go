package entity

import (
	"math"

	"arrasgo/internal/jsmath"
	"strconv"
	"strings"

	"arrasgo/internal/config"
)

type GunID uint32

type ControllerID uint32

const (
	SkillRld = iota // reload
	SkillPen        // bullet penetration
	SkillStr        // bullet health
	SkillDam        // bullet damage
	SkillSpd        // bullet speed
	SkillShi        // shield capacity
	SkillAtk        // body damage
	SkillHlt        // max health
	SkillRgn        // shield regeneration
	SkillMob        // movement speed
	SkillCount
)

var skillKeys = [SkillCount]string{"rld", "pen", "str", "dam", "spd", "shi", "atk", "hlt", "rgn", "mob"}
var skillTitles = [SkillCount]string{
	"Reload",
	"Bullet Penetration",
	"Bullet Health",
	"Bullet Damage",
	"Bullet Speed",
	"Shield Capacity",
	"Body Damage",
	"Max Health",
	"Shield Regeneration",
	"Movement Speed",
}

func SkillIndexOf(name string) (int, bool) {
	for i, k := range skillKeys {
		if k == name {
			return i, true
		}
	}
	return 0, false
}

type LevelPointsFunc func(level int) int

type Skill struct {
	Raw  [SkillCount]int32
	Caps [SkillCount]int32

	Points       int32
	Score        float64
	Deduction    float64
	Level        int32
	LevelUpScore float64

	LSPF LevelPointsFunc

	Atk, Hlt, Spd, Str, Pen, Dam, Rld, Mob, Rgn, Shi, Rst, Brst, Ghost, Acl float64
}

func NewSkill(cfg *config.Tuning) Skill {
	var s Skill
	for i := range s.Caps {
		s.Caps[i] = int32(cfg.SkillCap)
	}
	s.Update(cfg)
	s.Reset(cfg, true)
	return s
}

func curve(x, skillCap float64) float64 {
	index := x * skillCap
	return jsmath.Log(4*(index/skillCap)+1) / 1.6
}

func apply(f, x float64) float64 {
	if x < 0 {
		return 1 / (1 - x*f)
	}
	return f*x + 1
}

// Update is skills.js:70-95.
func (s *Skill) Update(cfg *config.Tuning) {
	for i := 0; i < SkillCount; i++ {
		if s.Raw[i] > s.Caps[i] {
			s.Points += s.Raw[i] - s.Caps[i]
			s.Raw[i] = s.Caps[i]
		}
	}
	skillCap := float64(cfg.SkillCap)
	var attrib [SkillCount]float64
	for i := 0; i < SkillCount; i++ {
		attrib[i] = curve(float64(s.Raw[i])/skillCap, skillCap)
	}
	ghf := cfg.GlassHealthFactor
	s.Rld = jsmath.Pow(0.5, attrib[SkillRld])
	s.Pen = apply(2.5, attrib[SkillPen])
	s.Str = apply(2, attrib[SkillStr])
	s.Dam = apply(3, attrib[SkillDam])
	s.Spd = 0.5 + apply(1.5, attrib[SkillSpd])
	s.Acl = apply(0.5, attrib[SkillRld])
	s.Rst = 0.5*attrib[SkillStr] + 2.5*attrib[SkillPen]
	s.Ghost = attrib[SkillPen]
	s.Shi = ghf * apply(3/ghf-1, attrib[SkillShi])
	s.Atk = apply(0.021, attrib[SkillAtk])
	s.Hlt = ghf * apply(2/ghf-1, attrib[SkillHlt])
	s.Mob = apply(0.8, attrib[SkillMob])
	s.Rgn = apply(25, attrib[SkillRgn])
	s.Brst = 0.3 * (0.5*attrib[SkillAtk] + 0.5*attrib[SkillHlt] + attrib[SkillRgn])
}

func (s *Skill) Set(cfg *config.Tuning, raw [SkillCount]int32) {
	s.Raw = raw
	s.Update(cfg)
}

func (s *Skill) SetCaps(cfg *config.Tuning, caps [SkillCount]int32) {
	s.Caps = caps
	s.Update(cfg)
}

// Reset is skills.js:60-69.
func (s *Skill) Reset(cfg *config.Tuning, resetLSPF bool) {
	s.Points = 0
	s.Score = 0
	s.Deduction = 0
	s.Level = 0
	s.LevelUpScore = 1
	if resetLSPF {
		s.LSPF = nil
	}
	s.Set(cfg, [SkillCount]int32{})
	s.Maintain(cfg)
}

func (s *Skill) ScoreForLevel() float64 {
	return math.Ceil(jsmath.Pow(float64(s.Level), 3) * 0.3083)
}

func (s *Skill) LevelScore() float64 { return s.LevelUpScore - s.Deduction }

func (s *Skill) Progress() float64 {
	ls := s.LevelScore()
	if ls == 0 {
		return 0
	}
	return (s.Score - s.Deduction) / ls
}

func (s *Skill) LevelPoints() int32 {
	if s.LSPF != nil {
		return int32(s.LSPF(int(s.Level)))
	}
	return int32(config.LevelSkillPoints(int(s.Level)))
}

// Maintain is skills.js:122-131.
func (s *Skill) Maintain(cfg *config.Tuning) bool {
	if s.Score-s.Deduction < s.LevelScore() {
		return false
	}
	s.Deduction = s.LevelUpScore
	s.Level++
	s.LevelUpScore = s.ScoreForLevel()
	s.Points += s.LevelPoints()
	s.Update(cfg)
	return true
}

func (s *Skill) Cap(cfg *config.Tuning, slot int, real bool) int32 {
	if !real && int(s.Level) < cfg.SkillCapSoft {
		return int32(math.Round(float64(s.Caps[slot]) * cfg.SoftMaxSkill))
	}
	return s.Caps[slot]
}

func (s *Skill) Upgrade(cfg *config.Tuning, slot int) bool {
	if s.Points != 0 && s.Raw[slot] < s.Cap(cfg, slot, false) {
		s.Change(cfg, slot, 1)
		s.Points--
		return true
	}
	return false
}

func (s *Skill) Title(slot int) string { return skillTitles[slot] }

func (s *Skill) Amount(slot int) int32 { return s.Raw[slot] }

func (s *Skill) Change(cfg *config.Tuning, slot int, levels int32) {
	s.Raw[slot] += levels
	s.Update(cfg)
}

// HealthMode from entity.js:48-49.
type HealthMode uint8

const (
	HealthStatic HealthMode = iota
	HealthDynamic
)

// HealthType is healthType.js:1.
type HealthType struct {
	Max    float64
	Amount float64
	Mode   HealthMode
	Resist float64
	Regen  float64
}

// NewHealthType is healthType.js:2.
func NewHealthType(health float64, mode HealthMode, resist float64) HealthType {
	return HealthType{Max: health, Amount: health, Mode: mode, Resist: resist}
}

// Set is healthType.js:9-13.
func (h *HealthType) Set(health, regen float64) {
	if h.Max != 0 {
		h.Amount = (h.Amount / h.Max) * health
	} else {
		h.Amount = health
	}
	h.Max = health
	h.Regen = regen
}

func (h *HealthType) Display() float64 { return h.Amount / h.Max }

func (h *HealthType) Permeability() float64 {
	switch h.Mode {
	case HealthStatic:
		return 1
	default:
		if h.Max == 0 {
			return 0
		}
		return clamp(h.Amount/h.Max, 0, 1)
	}
}

func (h *HealthType) Ratio() float64 {
	if h.Max == 0 {
		return 0
	}
	return clamp(1-jsmath.Pow(h.Amount/h.Max-1, 4), 0, 1)
}

// GetDamage is healthType.js:17-30.
func (h *HealthType) GetDamage(amount float64, capped bool) float64 {
	damageToMax := h.Amount - h.Max
	scaled := amount
	if h.Mode == HealthDynamic {
		scaled = amount * h.Permeability()
	}
	if capped {
		scaled = math.Min(scaled, h.Amount)
	}
	return math.Max(scaled, damageToMax)
}

// Regenerate is healthType.js:31-53.
func (h *HealthType) Regenerate(boost float64) {
	boost /= 2
	const cons = 5
	switch h.Mode {
	case HealthStatic:
		if h.Amount >= h.Max || h.Amount == 0 {
			break
		}
		h.Amount += cons * boost
	case HealthDynamic:
		r := h.Amount / h.Max
		switch {
		case r <= 0:
			h.Amount = 0.0001
		case r >= 1:
			h.Amount = h.Max
		default:
			regenMultiplier := jsmath.Exp(jsmath.Pow(math.Sqrt(r/2)-0.4, 2) * -50)
			h.Amount += cons * (h.Regen*regenMultiplier/3 + (r*h.Max)/150 + boost)
		}
	}
	h.Amount = clamp(h.Amount, 0, h.Max)
}

func clamp(v, lo, hi float64) float64 { return math.Min(math.Max(v, lo), hi) }

type Activation struct {
	Active bool
	Timer  int32
}

func NewActivation() Activation { return Activation{Active: true, Timer: 15} }

type AntiNaN struct {
	NansInARow int32
	X, Y       float64
	VX, VY     float64
	AX, AY     float64
}

// NewAntiNaN is antiNaN.js:2-7.
func NewAntiNaN() AntiNaN { return AntiNaN{X: 1, Y: 1} }

// Color is color.js:1.
type Color struct {
	base                  string
	hueShift              float64
	saturationShift       float64
	brightnessShift       float64
	allowBrightnessInvert bool

	IsTile           bool
	TileColorChanged bool
	Compiled         string
}

// ColorSpec carries optional color properties.
type ColorSpec struct {
	Base    string
	HasBase bool

	HueShift    float64
	HasHueShift bool

	SaturationShift    float64
	HasSaturationShift bool

	BrightnessShift    float64
	HasBrightnessShift bool

	AllowBrightnessInvert    bool
	HasAllowBrightnessInvert bool
}

// defaultColor initializes a Color with neutral defaults.
func defaultColor(isTile bool) Color {
	return Color{base: "-1", saturationShift: 1, IsTile: isTile}
}

// NewColorNumber creates a Color from a numeric palette entry.
func NewColorNumber(n float64, isTile bool) Color {
	c := defaultColor(isTile)
	c.InterpretNumber(n)
	return c
}

func NewColorString(s string, isTile bool) Color {
	c := defaultColor(isTile)
	c.InterpretString(s)
	return c
}

func NewColorSpec(spec ColorSpec, isTile bool) Color {
	c := defaultColor(isTile)
	c.InterpretSpec(spec)
	return c
}

// NewColorUndefined creates a Color with defaults.
func NewColorUndefined(isTile bool) Color {
	c := defaultColor(isTile)
	c.Recompile()
	return c
}

func (c *Color) Base() string                { return c.base }
func (c *Color) HueShift() float64           { return c.hueShift }
func (c *Color) SaturationShift() float64    { return c.saturationShift }
func (c *Color) BrightnessShift() float64    { return c.brightnessShift }
func (c *Color) AllowBrightnessInvert() bool { return c.allowBrightnessInvert }

// SetBase sets the base color and recompiles.
func (c *Color) SetBase(base string) { c.base = base; c.Recompile() }

func (c *Color) SetBaseNumber(n float64) { c.SetBase(jsNumberToString(n)) }

func (c *Color) SetHueShift(v float64) { c.hueShift = v; c.Recompile() }

func (c *Color) SetSaturationShift(v float64) { c.saturationShift = v; c.Recompile() }

func (c *Color) SetBrightnessShift(v float64) { c.brightnessShift = v; c.Recompile() }

func (c *Color) SetAllowBrightnessInvert(v bool) { c.allowBrightnessInvert = v; c.Recompile() }

// Reset reverts Color to defaults.

func (c *Color) Reset() {
	c.base = "-1"
	c.hueShift = 0
	c.saturationShift = 1
	c.brightnessShift = 0
	c.allowBrightnessInvert = false
	c.Recompile()
}

// InterpretNumber parses a numeric color value.
func (c *Color) InterpretNumber(n float64) {
	c.base = jsNumberToString(n)
	c.Recompile()
}

// InterpretString parses a color string with optional space-separated modifiers.
func (c *Color) InterpretString(s string) {
	if !strings.Contains(s, " ") {
		c.base = s
		c.Recompile()
		return
	}
	parts := strings.Split(s, " ")
	c.base = parts[0]
	c.hueShift = jsParseFloat(fieldAt(parts, 1))
	c.saturationShift = jsParseFloat(fieldAt(parts, 2))
	c.brightnessShift = jsParseFloat(fieldAt(parts, 3))
	c.allowBrightnessInvert = fieldAt(parts, 4) == "true"
	c.Recompile()
}

// InterpretSpec applies a ColorSpec to the Color.
func (c *Color) InterpretSpec(spec ColorSpec) {
	if spec.HasBase {
		c.base = spec.Base
	}
	if spec.HasHueShift {
		c.hueShift = spec.HueShift
	}
	if spec.HasSaturationShift {
		c.saturationShift = spec.SaturationShift
	}
	if spec.HasBrightnessShift {
		c.brightnessShift = spec.BrightnessShift
	}
	if spec.HasAllowBrightnessInvert {
		c.allowBrightnessInvert = spec.AllowBrightnessInvert
	}
	c.Recompile()
}

// Recompile rebuilds Compiled and returns it.
func (c *Color) Recompile() string {
	old := c.Compiled
	var b strings.Builder
	b.WriteString(c.base)
	b.WriteByte(' ')
	b.WriteString(jsNumberToString(c.hueShift))
	b.WriteByte(' ')
	b.WriteString(jsNumberToString(c.saturationShift))
	b.WriteByte(' ')
	b.WriteString(jsNumberToString(c.brightnessShift))
	b.WriteByte(' ')
	b.WriteString(strconv.FormatBool(c.allowBrightnessInvert))
	c.Compiled = b.String()
	if c.IsTile && c.Compiled != old {
		c.TileColorChanged = true
	}
	return c.Compiled
}

func fieldAt(parts []string, i int) string {
	if i < len(parts) {
		return parts[i]
	}
	return ""
}

func jsParseFloat(s string) float64 {
	s = strings.TrimLeft(s, " \t\n\r\v\f\u00a0\ufeff")

	i := 0
	if i < len(s) && (s[i] == '+' || s[i] == '-') {
		i++
	}
	if strings.HasPrefix(s[i:], "Infinity") {
		if len(s) > 0 && s[0] == '-' {
			return math.Inf(-1)
		}
		return math.Inf(1)
	}

	digits := func() int {
		n := 0
		for i < len(s) && s[i] >= '0' && s[i] <= '9' {
			i++
			n++
		}
		return n
	}

	intDigits := digits()
	fracDigits := 0
	if i < len(s) && s[i] == '.' {
		i++
		fracDigits = digits()
	}
	if intDigits == 0 && fracDigits == 0 {
		return math.NaN()
	}

	end := i
	if i < len(s) && (s[i] == 'e' || s[i] == 'E') {
		j := i + 1
		if j < len(s) && (s[j] == '+' || s[j] == '-') {
			j++
		}
		k := j
		for k < len(s) && s[k] >= '0' && s[k] <= '9' {
			k++
		}
		if k > j {
			end = k
		}
	}

	v, err := strconv.ParseFloat(s[:end], 64)
	if err != nil {
		return math.NaN()
	}
	return v
}

func jsNumberToString(x float64) string {
	switch {
	case math.IsNaN(x):
		return "NaN"
	case math.IsInf(x, 1):
		return "Infinity"
	case math.IsInf(x, -1):
		return "-Infinity"
	case x == 0:
		return "0" // covers -0, which JS also prints as "0"
	case x < 0:
		return "-" + jsNumberToString(-x)
	}

	sci := strconv.FormatFloat(x, 'e', -1, 64)
	mant, expPart, _ := strings.Cut(sci, "e")
	exp10, err := strconv.Atoi(expPart)
	if err != nil {
		return sci
	}
	digits := strings.Replace(mant, ".", "", 1)
	k := len(digits)
	n := exp10 + 1

	switch {
	case k <= n && n <= 21:
		return digits + strings.Repeat("0", n-k)
	case 0 < n && n <= 21:
		return digits[:n] + "." + digits[n:]
	case -6 < n && n <= 0:
		return "0." + strings.Repeat("0", -n) + digits
	}

	var b strings.Builder
	b.WriteString(digits[:1])
	if k > 1 {
		b.WriteByte('.')
		b.WriteString(digits[1:])
	}
	e := n - 1
	if e >= 0 {
		b.WriteString("e+")
	} else {
		b.WriteString("e-")
		e = -e
	}
	b.WriteString(strconv.Itoa(e))
	return b.String()
}

// Blend is entity.js:42-45.
type Blend struct {
	Color  string
	Amount float64
}

// Glow is entity.js:63.
type Glow struct {
	Radius    float64
	HasRadius bool
	Color     string
	Alpha     float64
	Recursion float64
}

// Confinement is entity.js:64.
type Confinement struct {
	XMin, XMax, YMin, YMax float64
}

// KillCount is entity.js:10.
type KillCount struct {
	Solo     int32
	Assists  int32
	Bosses   int32
	Polygons int32
	Killers  []string
}

// Bound is the placement of a turret or prop relative to its bond (entity.js:649).
type Bound struct {
	Size      float64
	Angle     float64
	Direction float64
	Offset    float64
	Arc       float64
	Layer     int32
}

type Upgrade struct {
	Class          []int32
	Level          int32
	Index          string
	Tier           int32
	Branch         int32
	BranchLabel    string
	HasBranchLabel bool
	RedefineAll    bool
}

type UpgradePending struct {
	Set              bool
	Number           int32
	BranchID         int32
	TankLabel        string
	LastReminder     int64
	LastIndex        string
	DailyTankRequest bool
}

type ShapeKind uint8

const (
	ShapeNone ShapeKind = iota
	ShapeNumber
	ShapeString
	ShapePolygon
)

type ShapeData struct {
	Kind    ShapeKind
	Number  float64
	String  string
	Polygon [][2]float64
}

type MotionArgs struct {
	Speed    float64
	HasSpeed bool

	Damp    float64
	HasDamp bool

	TurnVelocity    float64
	HasTurnVelocity bool

	KeepSpeed bool
}

type FacingArgs struct {
	Angle    float64
	HasAngle bool

	Multiplier    float64
	HasMultiplier bool

	Smoothness    float64
	HasSmoothness bool

	Speed    float64
	HasSpeed bool
}

// ShakeInfo is one entry of settings.shakeProperties (entity.js:497-521).
type ShakeInfo struct {
	Type           string // "camera" or "gui"
	Duration       float64
	Amount         float64
	KeepShake      bool
	Push           bool
	ApplyOnUpgrade bool
	ApplyOnShoot   bool
}

type StatNames [SkillCount]string

func DefaultStatNames() StatNames {
	var n StatNames
	n[SkillAtk] = "Body Damage"
	n[SkillHlt] = "Max Health"
	n[SkillSpd] = "Bullet Speed"
	n[SkillStr] = "Bullet Health"
	n[SkillPen] = "Bullet Penetration"
	n[SkillDam] = "Bullet Damage"
	n[SkillRld] = "Reload"
	n[SkillMob] = "Movement Speed"
	n[SkillRgn] = "Shield Regeneration"
	n[SkillShi] = "Shield Capacity"
	return n
}

type NecroGun struct {
	Shape int32
	Gun   GunID
}

type Settings struct {
	NoCollisions            bool
	DrawHealth              bool
	DrawShape               bool
	DamageEffects           bool
	RatioEffects            bool
	MotionEffects           bool
	AcceptsScore            bool
	GivesKillMessage        bool
	CanGoOutsideRoom        bool
	HitsOwnType             string
	DiesAtLowSpeed          bool
	DiesAtRange             bool
	Independent             bool
	PersistsAfterDeath      bool
	ClearOnMasterUpgrade    bool
	HealthWithLevel         bool
	Obstacle                bool
	FullyInvisible          bool
	CanSeeInvisible         bool
	HasNoRecoil             bool
	AttentionCraver         bool
	KillMessage             string
	BroadcastMessage        string
	DefeatMessage           bool
	DamageClass             int32
	BuffVsFood              bool
	Leaderboardable         bool
	RenderOnLeaderboard     bool
	HasRenderOnLeaderboard  bool
	ReloadToAcceleration    bool
	SkillNames              StatNames
	HasSkillNames           bool
	VariesInSize            bool
	NoSizeAnimation         bool
	ConnectChildrenOnCamera bool
	ShakeProperties         []ShakeInfo
	NecroTypes              []int32
	NecroDefineGuns         []NecroGun
	MirrorMasterAngle       bool
	Smoothness              float64
	HasSmoothness           bool
	HasNoReloadDelay        bool
	Destination             string
	ScoreLabel              string
	GoThruObstacle          bool
	Braindamagemode         bool
	DamageType              int32
}
