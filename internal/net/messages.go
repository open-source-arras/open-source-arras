package net

import (
	"errors"
	"math"
	"math/big"
	"strconv"
	"strings"
	"unicode/utf8"
)

type Builder struct {
	enc Encoder
	buf []Value
}

func (b *Builder) Buf() []Value { return b.buf[:0] }

func (b *Builder) Frame(msg []Value) ([]byte, error) {
	b.buf = msg
	return b.enc.Encode(msg)
}

func (b *Builder) Grow(n int) {
	if cap(b.buf) < n {
		b.buf = make([]Value, 0, n)
	}
}

// Opcode extracts the message type from a decoded frame (sockets.js:201).
// ok is false for empty frames or frames with no string opcode.
func Opcode(m []Value) (op string, rest []Value, ok bool) {
	if len(m) == 0 || m[0].Kind != KindString {
		return "", m, false
	}
	return m[0].Str, m[1:], true
}

type KickError struct{ Reason string }

func (e *KickError) Error() string { return e.Reason }

func kick(reason string) error { return &KickError{Reason: reason} }

var ErrShortFrame = errors.New("net: frame ended mid-message")

func jsRound(x float64) float64 {
	if math.IsNaN(x) || math.IsInf(x, 0) {
		return x
	}
	f := math.Floor(x)
	if x-f >= 0.5 {
		f++
	}
	return f
}

// clamp is util.clamp (util.js:16): min(max(v, lo), hi).
func clamp(v, lo, hi float64) float64 { return math.Min(math.Max(v, lo), hi) }

// jsNumberString converts a float to its string representation.
func jsNumberString(f float64) string {
	switch {
	case math.IsNaN(f):
		return "NaN"
	case math.IsInf(f, 1):
		return "Infinity"
	case math.IsInf(f, -1):
		return "-Infinity"
	case f == 0:
		return "0" // covers -0, which JS also prints as "0"
	}
	a := math.Abs(f)
	if a >= 1e-6 && a < 1e21 {
		return strconv.FormatFloat(f, 'f', -1, 64)
	}
	s := strconv.FormatFloat(f, 'e', -1, 64)
	if i := strings.IndexByte(s, 'e'); i >= 0 {
		mant, exp := s[:i], s[i+1:]
		sign := ""
		if exp[0] == '+' || exp[0] == '-' {
			sign, exp = string(exp[0]), exp[1:]
		}
		exp = strings.TrimLeft(exp, "0")
		if exp == "" {
			exp = "0"
		}
		s = mant + "e" + sign + exp
	}
	return s
}

func jsToFixed1(x float64) string {
	switch {
	case math.IsNaN(x):
		return "NaN"
	case math.IsInf(x, 1):
		return "Infinity"
	case math.IsInf(x, -1):
		return "-Infinity"
	case math.Abs(x) >= 1e21:
		return jsNumberString(x)
	}
	sign := ""
	if x < 0 {
		sign, x = "-", -x
	}
	r := new(big.Rat).SetFloat64(x)
	r.Mul(r, big.NewRat(10, 1))
	n := new(big.Int).Quo(r.Num(), r.Denom()) // x >= 0, so truncation is floor
	rem := new(big.Rat).Sub(r, new(big.Rat).SetInt(n))
	if rem.Cmp(big.NewRat(1, 2)) >= 0 {
		n.Add(n, big.NewInt(1))
	}
	d := n.String()
	if len(d) < 2 {
		d = "0" + d
	}
	return sign + d[:len(d)-1] + "." + d[len(d)-1:]
}

func jsonNumber(f float64) string {
	if math.IsNaN(f) || math.IsInf(f, 0) {
		return "null"
	}
	return jsNumberString(f)
}

// jsTrim removes whitespace characters as JavaScript's String.prototype.trim does.
func jsTrim(s string) string {
	return strings.TrimFunc(s, func(r rune) bool {
		switch r {
		case '\t', '\v', '\f', ' ', '\u00a0', '\ufeff',
			'\n', '\r', '\u2028', '\u2029',
			'\u1680', '\u202f', '\u205f', '\u3000':
			return true
		}
		return r >= '\u2000' && r <= '\u200a'
	})
}

func valueString(v Value) string {
	if v.Kind == KindString {
		return v.Str
	}
	return jsNumberString(v.Num)
}

// codec (fasttalk.js:281), so only "" and 0/NaN are falsy here.
func truthy(v Value) bool {
	if v.Kind == KindString {
		return v.Str != ""
	}
	return v.Num != 0 && !math.IsNaN(v.Num)
}

func strictEqual(a, b Value) bool {
	if a.Kind != b.Kind {
		return false
	}
	if a.Kind == KindString {
		return a.Str == b.Str
	}
	return a.Num == b.Num // false for NaN, true for +0 vs -0
}

func nameTokens(name string) int {
	n := 1
	for _, r := range name {
		if r < 0x80 && uriUnescaped(byte(r)) {
			n++
		} else {
			n += utf8.RuneLen(r)
		}
	}
	return n
}

func uriUnescaped(c byte) bool {
	switch {
	case c >= 'A' && c <= 'Z', c >= 'a' && c <= 'z', c >= '0' && c <= '9':
		return true
	}
	return strings.IndexByte("-_.!~*'();/?:@&=+$,#", c) >= 0
}

// delta carries (sockets.js:1812). The client multiplies back by 255, not 256
// (socketinit.js:773), a permanent 0.39% scale bias that must be preserved.
func QuantiseMinimap(v, roomDimension float64) float64 {
	return clamp(math.Floor((256*v)/roomDimension), -128, 127)
}

// SkillsHex is getstuff (sockets.js:890): the 20-character skills string, two
// forward atk..shi order the stat lists use everywhere else (sockets.js:836),
// (socketinit.js:722-733) and the statsdata triples are read backward
// (socketinit.js:716), which is the double reversal that makes the two agree.
func SkillsHex(amount [10]float64) string {
	var b strings.Builder
	b.Grow(20)
	for i := 9; i >= 0; i-- {
		h := strconv.FormatInt(int64(amount[i]), 16)
		if len(h) < 2 {
			b.WriteByte('0')
		}
		b.WriteString(h)
	}
	return b.String()
}

var StatNames = [10]string{"atk", "hlt", "spd", "str", "pen", "dam", "rld", "mob", "rgn", "shi"}

type MockupIndex struct {
	IsString bool
	Str      string
	Num      float64
}

func MockupIndexNum(n float64) MockupIndex { return MockupIndex{Num: n} }
func MockupIndexStr(s string) MockupIndex  { return MockupIndex{IsString: true, Str: s} }

func (m MockupIndex) value() Value {
	if m.IsString {
		return S(m.Str)
	}
	return N(m.Num)
}

func valueToMockupIndex(v Value) MockupIndex {
	if v.Kind == KindString {
		return MockupIndexStr(v.Str)
	}
	return MockupIndexNum(v.Num)
}

// ScoreValue is the nameplate score of a full entity record, entity.js:766,
// tree, serverTravel.js:36 and :44, both template literals of the form
type ScoreValue struct {
	IsLabel bool
	Label   string
	Score   float64
}

func Score(n float64) ScoreValue     { return ScoreValue{Score: n} }
func ScoreLabel(s string) ScoreValue { return ScoreValue{IsLabel: true, Label: s} }

func (s ScoreValue) value() Value {
	if s.IsLabel {
		return S(s.Label)
	}
	return N(s.Score)
}

func valueToScore(v Value) ScoreValue {
	if v.Kind == KindString {
		return ScoreLabel(v.Str)
	}
	return Score(v.Num)
}

// false, which arrives as the number 0 (fasttalk.js:281). Only the spawn
// packet's transferbodyID does this, socketinit.js:938 sends
// `global.bodyID ? global.bodyID : false`, and sockets.js:273 only type-checks
type OptString struct {
	Present bool
	Value   string
}

func SomeString(s string) OptString { return OptString{Present: true, Value: s} }

func (o OptString) value() Value {
	if o.Present {
		return S(o.Value)
	}
	return B(false)
}

const (
	OpSvWelcome          = "W"
	OpSvKeyAccepted      = "w"
	OpSvRoomSetup        = "R"
	OpSvRoomRefresh      = "r"
	OpSvForceCamera      = "c"
	OpSvUplink           = "u"
	OpSvBroadcast        = "b"
	OpSvResetMinimap     = "RM"
	OpSvResetLeaderboard = "RL"
	OpSvMockup           = "M"
	OpSvDeath            = "F"
	OpSvPopup            = "m"
	OpSvPopupLines       = "Em"
	OpSvScreenMessage    = "message"
	OpSvSync             = "S"
	OpSvPong             = "p"
	OpSvTankTree         = "T"
	OpSvNameColor        = "z"
	OpSvTransfer         = "t"
	OpSvKick             = "K"
	OpSvTemporaryBan     = "temporaryban"
	OpSvPermanentBan     = "permanentban"
	OpSvChat             = "CHAT_MESSAGE_ENTITY"
	OpSvDailyTankAd      = "DTA"
	OpSvDailyTankAdDone  = "DTAD"
	OpSvDailyTankAdStart = "DTAST"
	OpSvResetEntities    = "RE"
	OpSvClearCache       = "CC"
	OpSvScreenShake      = "SH"
	OpSvServerInfo       = "svInfo"
)

const (
	OpSvGlobalServerInfo     = "gSvInfo"
	OpSvSyncWithTank         = "I"
	OpSvActivateSmoothCamera = "AS"
	OpSvDeactivateSmoothCam  = "DS"
)

const (
	OpClKey               = "k"
	OpClSpawn             = "s"
	OpClSync              = "S"
	OpClPing              = "p"
	OpClDownlink          = "d"
	OpClCommand           = "C"
	OpClKeys              = "#"
	OpClToggle            = "t"
	OpClUpgrade           = "U"
	OpClStat              = "x"
	OpClLevelUp           = "L"
	OpClSuicide           = "1"
	OpClControl           = "H"
	OpClChat              = "M"
	OpClTankTree          = "T"
	OpClDailyTankAd       = "DTA"
	OpClDailyTankAdDone   = "DTAD"
	OpClDailyTankAdStart  = "DTAST"
	OpClNeedsNewBroadcast = "NWB"
)

type cursor struct {
	m []Value
	i int
}

func (c *cursor) next() (Value, error) {
	if c.i >= len(c.m) {
		return Value{}, ErrShortFrame
	}
	v := c.m[c.i]
	c.i++
	return v, nil
}

func (c *cursor) num() (float64, error) {
	v, err := c.next()
	if err != nil {
		return 0, err
	}
	return v.Num, nil
}

func (c *cursor) str() (string, error) {
	v, err := c.next()
	if err != nil {
		return "", err
	}
	return valueString(v), nil
}

func (c *cursor) boolean() (bool, error) {
	v, err := c.next()
	if err != nil {
		return false, err
	}
	return v.Num != 0, nil
}

type Gun struct {
	Time        float64
	Power       float64
	Color       string
	Alpha       float64
	StrokeWidth float64
	Borderless  bool
	DrawFill    bool
	DrawAbove   bool
	Length      float64
	Width       float64
	Aspect      float64
	Angle       float64
	Direction   float64
	Offset      float64
	Layer       float64
}

const GunFields = 15

func (g *Gun) Append(dst []Value) []Value {
	return append(dst,
		N(g.Time), N(g.Power), S(g.Color), N(g.Alpha), N(g.StrokeWidth),
		B(g.Borderless), B(g.DrawFill), B(g.DrawAbove),
		N(g.Length), N(g.Width), N(g.Aspect),
		N(g.Angle), N(g.Direction), N(g.Offset), N(g.Layer))
}

func parseGun(c *cursor) (Gun, error) {
	var g Gun
	var err error
	if g.Time, err = c.num(); err != nil {
		return g, err
	}
	if g.Power, err = c.num(); err != nil {
		return g, err
	}
	if g.Color, err = c.str(); err != nil {
		return g, err
	}
	if g.Alpha, err = c.num(); err != nil {
		return g, err
	}
	if g.StrokeWidth, err = c.num(); err != nil {
		return g, err
	}
	if g.Borderless, err = c.boolean(); err != nil {
		return g, err
	}
	if g.DrawFill, err = c.boolean(); err != nil {
		return g, err
	}
	if g.DrawAbove, err = c.boolean(); err != nil {
		return g, err
	}
	if g.Length, err = c.num(); err != nil {
		return g, err
	}
	if g.Width, err = c.num(); err != nil {
		return g, err
	}
	if g.Aspect, err = c.num(); err != nil {
		return g, err
	}
	if g.Angle, err = c.num(); err != nil {
		return g, err
	}
	if g.Direction, err = c.num(); err != nil {
		return g, err
	}
	if g.Offset, err = c.num(); err != nil {
		return g, err
	}
	g.Layer, err = c.num()
	return g, err
}

// 0x02 and 0x04 (entity.js:724-725), Bullet is exactly 0x10
// (bulletEntity.js:361), Turret and Prop are exactly 0x01 (turretEntity.js:276,
// propEntity.js:80).
const (
	PhotoTurret     = 0x01
	PhotoDrawHealth = 0x02
	PhotoNamed      = 0x04
	PhotoBullet     = 0x10
)

// Overwrite offsets used by perspective (sockets.js:1385) once a record is
// sockets.js:1396: the autospin override writes offset 10 unconditionally, and
const (
	PhotoFullTwiggle = 10
	PhotoFullColor   = 12
	PhotoFullAlpha   = 18
	PhotoBulletColor = 11
	PhotoBulletAlpha = 14
)

// quantisation (sockets.js:1318-1320). ceil for health and round for shield is
type Photo struct {
	Type int

	Index string
	Color string
	Size  float64
	Layer float64

	Facing            float64
	RealSize          float64
	SizeFactor        float64
	Angle             float64
	Direction         float64
	Offset            float64
	MirrorMasterAngle bool

	ID      float64
	X, Y    float64
	VX, VY  float64
	VFacing float64
	Health  float64
	Shield  float64
	Alpha   float64

	Twiggle    bool
	Borderless bool
	DrawFill   bool
	Invuln     bool

	Name  string
	Score ScoreValue

	Guns    []Gun
	Turrets []Photo
}

// Append ports flatten (sockets.js:1289). The comment there claims the first
// the client reads it first (socketinit.js:450).
func (p *Photo) Append(dst []Value) []Value {
	dst = append(dst, N(p.Type))
	switch {
	case p.Type&PhotoTurret != 0:
		dst = append(dst,
			N(p.Facing), N(p.Layer), S(p.Index), S(p.Color),
			N(p.Size), N(p.RealSize), N(p.SizeFactor),
			N(p.Angle), N(p.Direction), N(p.Offset), B(p.MirrorMasterAngle))
	case p.Type&PhotoBullet != 0:
		dst = append(dst,
			N(p.ID), S(p.Index), N(p.X), N(p.Y), N(p.VX), N(p.VY),
			N(p.Size), N(p.Facing), N(p.VFacing), N(p.Layer), S(p.Color),
			N(math.Ceil(65535*p.Health)), N(jsRound(65535*p.Shield)), N(jsRound(255*p.Alpha)))
	default:
		dst = append(dst,
			N(p.ID), S(p.Index), N(p.X), N(p.Y), N(p.VX), N(p.VY),
			N(p.Size), N(p.Facing), N(p.VFacing), B(p.Twiggle), N(p.Layer), S(p.Color),
			B(p.Borderless), B(p.DrawFill), B(p.Invuln),
			N(math.Ceil(65535*p.Health)), N(jsRound(65535*p.Shield)), N(jsRound(255*p.Alpha)))
		if p.Type&PhotoNamed != 0 {
			dst = append(dst, S(p.Name), p.Score.value())
		}
	}

	dst = append(dst, N(len(p.Guns)))
	for i := range p.Guns {
		dst = p.Guns[i].Append(dst)
	}
	dst = append(dst, N(len(p.Turrets)))
	for i := range p.Turrets {
		dst = p.Turrets[i].Append(dst)
	}
	return dst
}

// client's process() (socketinit.js:447), not flatten(), including where the
func ParsePhoto(m []Value) (Photo, int, error) {
	c := cursor{m: m}
	p, err := parsePhoto(&c)
	return p, c.i, err
}

func parsePhoto(c *cursor) (Photo, error) {
	var p Photo
	t, err := c.num()
	if err != nil {
		return p, err
	}
	p.Type = int(t)

	if p.Type&PhotoTurret != 0 {
		if p.Facing, err = c.num(); err != nil {
			return p, err
		}
		if p.Layer, err = c.num(); err != nil {
			return p, err
		}
		if p.Index, err = c.str(); err != nil {
			return p, err
		}
		if p.Color, err = c.str(); err != nil {
			return p, err
		}
		if p.Size, err = c.num(); err != nil {
			return p, err
		}
		if p.RealSize, err = c.num(); err != nil {
			return p, err
		}
		if p.SizeFactor, err = c.num(); err != nil {
			return p, err
		}
		if p.Angle, err = c.num(); err != nil {
			return p, err
		}
		if p.Direction, err = c.num(); err != nil {
			return p, err
		}
		if p.Offset, err = c.num(); err != nil {
			return p, err
		}
		if p.MirrorMasterAngle, err = c.boolean(); err != nil {
			return p, err
		}
	} else {
		if p.ID, err = c.num(); err != nil {
			return p, err
		}
		if p.Index, err = c.str(); err != nil {
			return p, err
		}
		if p.X, err = c.num(); err != nil {
			return p, err
		}
		if p.Y, err = c.num(); err != nil {
			return p, err
		}
		if p.VX, err = c.num(); err != nil {
			return p, err
		}
		if p.VY, err = c.num(); err != nil {
			return p, err
		}
		if p.Size, err = c.num(); err != nil {
			return p, err
		}
		if p.Facing, err = c.num(); err != nil {
			return p, err
		}
		if p.VFacing, err = c.num(); err != nil {
			return p, err
		}
		if p.Type&PhotoBullet == 0 {
			if p.Twiggle, err = c.boolean(); err != nil {
				return p, err
			}
		}
		if p.Layer, err = c.num(); err != nil {
			return p, err
		}
		if p.Color, err = c.str(); err != nil {
			return p, err
		}
		if p.Type&PhotoBullet == 0 {
			if p.Borderless, err = c.boolean(); err != nil {
				return p, err
			}
			if p.DrawFill, err = c.boolean(); err != nil {
				return p, err
			}
			if p.Invuln, err = c.boolean(); err != nil {
				return p, err
			}
		}
		var h, s, a float64
		if h, err = c.num(); err != nil {
			return p, err
		}
		if s, err = c.num(); err != nil {
			return p, err
		}
		if a, err = c.num(); err != nil {
			return p, err
		}
		p.Health, p.Shield, p.Alpha = h/65535, s/65535, a/255
		if p.Type&PhotoNamed != 0 {
			if p.Name, err = c.str(); err != nil {
				return p, err
			}
			var sc Value
			if sc, err = c.next(); err != nil {
				return p, err
			}
			p.Score = valueToScore(sc)
		}
	}

	guns, err := c.num()
	if err != nil {
		return p, err
	}
	if n := int(guns); n > 0 {
		p.Guns = make([]Gun, 0, n)
		for k := 0; k < n; k++ {
			g, err := parseGun(c)
			if err != nil {
				return p, err
			}
			p.Guns = append(p.Guns, g)
		}
	}

	turrets, err := c.num()
	if err != nil {
		return p, err
	}
	if n := int(turrets); n > 0 {
		p.Turrets = make([]Photo, 0, n)
		for k := 0; k < n; k++ {
			t, err := parsePhoto(c)
			if err != nil {
				return p, err
			}
			p.Turrets = append(p.Turrets, t)
		}
	}
	return p, nil
}

// GUI block bits, accumulated into element 0 with += (sockets.js:974) and
// decoded at socketinit.js:676-688. Payloads follow in ascending bit order, and
const (
	GUIFPS         = 0x0001
	GUILabel       = 0x0002
	GUIScore       = 0x0004
	GUIPoints      = 0x0008
	GUIUpgrades    = 0x0010
	GUIStats       = 0x0020
	GUISkills      = 0x0040
	GUIAccel       = 0x0080
	GUITopSpeed    = 0x0100
	GUIRoot        = 0x0200
	GUIClass       = 0x0400
	GUIVisibleName = 0x0800
	GUIDailyTank   = 0x1000
)

// GUIBlock is publish()'s output (sockets.js:956). Each Has flag is that
// is both flagged and non-null (sockets.js:824), so an absent field is absent
type GUIBlock struct {
	HasFPS bool
	FPS    float64

	HasLabel bool
	Label    string // b.index, a string (entity.js:196)
	Color    string // o.color, else gui.master.teamColor (sockets.js:982)
	BodyID   float64

	HasScore  bool
	ScoreJSON string

	HasPoints bool
	Points    float64

	// Upgrades are "branch_branchLabel_index" strings (sockets.js:925),
	HasUpgrades bool
	Upgrades    []string

	HasStats     bool
	StatTitles   [10]string
	StatCaps     [10]float64
	StatSoftCaps [10]float64

	HasSkills bool
	Skills    string // SkillsHex output, 20 hex characters

	HasAccel bool
	Accel    float64

	HasTopSpeed bool
	TopSpeed    float64

	HasRoot bool
	Root    string

	HasClass bool
	Class    string

	// VisibleName is pre-converted to 0/1 at sockets.js:953, because a floppy
	// throws on a boolean (sockets.js:811).
	HasVisibleName bool
	VisibleName    float64

	// JSON.stringify([false]) (sockets.js:942-943). Left as the JSON text
	HasDailyTank  bool
	DailyTankJSON string
}

func (g *GUIBlock) Mask() int {
	mask := 0
	for _, b := range [...]struct {
		on  bool
		bit int
	}{
		{g.HasFPS, GUIFPS}, {g.HasLabel, GUILabel}, {g.HasScore, GUIScore},
		{g.HasPoints, GUIPoints}, {g.HasUpgrades, GUIUpgrades}, {g.HasStats, GUIStats},
		{g.HasSkills, GUISkills}, {g.HasAccel, GUIAccel}, {g.HasTopSpeed, GUITopSpeed},
		{g.HasRoot, GUIRoot}, {g.HasClass, GUIClass}, {g.HasVisibleName, GUIVisibleName},
		{g.HasDailyTank, GUIDailyTank},
	} {
		if b.on {
			mask += b.bit
		}
	}
	return mask
}

func (g *GUIBlock) Append(dst []Value) []Value {
	dst = append(dst, N(g.Mask()))
	if g.HasFPS {
		// o.fps || 1 turns a genuine zero into one (sockets.js:977).
		f := g.FPS
		if f == 0 || math.IsNaN(f) {
			f = 1
		}
		dst = append(dst, N(f))
	}
	if g.HasLabel {
		dst = append(dst, S(g.Label), S(g.Color), N(g.BodyID))
	}
	if g.HasScore {
		dst = append(dst, S(g.ScoreJSON))
	}
	if g.HasPoints {
		dst = append(dst, N(g.Points))
	}
	if g.HasUpgrades {
		dst = append(dst, N(len(g.Upgrades)))
		for _, u := range g.Upgrades {
			dst = append(dst, S(u))
		}
	}
	if g.HasStats {
		for i := 0; i < 10; i++ {
			dst = append(dst, S(g.StatTitles[i]), N(g.StatCaps[i]), N(g.StatSoftCaps[i]))
		}
	}
	if g.HasSkills {
		dst = append(dst, S(g.Skills))
	}
	if g.HasAccel {
		dst = append(dst, N(g.Accel))
	}
	if g.HasTopSpeed {
		dst = append(dst, N(g.TopSpeed))
	}
	if g.HasRoot {
		dst = append(dst, S(g.Root))
	}
	if g.HasClass {
		dst = append(dst, S(g.Class))
	}
	if g.HasVisibleName {
		dst = append(dst, N(g.VisibleName))
	}
	if g.HasDailyTank {
		dst = append(dst, S(g.DailyTankJSON))
	}
	return dst
}

func GUIScoreJSON(score, solo, assists, bosses float64) string {
	var b strings.Builder
	b.WriteByte('[')
	for i, f := range [4]float64{score, solo, assists, bosses} {
		if i > 0 {
			b.WriteByte(',')
		}
		b.WriteString(jsonNumber(f))
	}
	b.WriteByte(']')
	return b.String()
}

func parseGUIBlock(c *cursor) (GUIBlock, error) {
	var g GUIBlock
	mask, err := c.num()
	if err != nil {
		return g, err
	}
	bits := int(mask)

	if bits&GUIFPS != 0 {
		g.HasFPS = true
		if g.FPS, err = c.num(); err != nil {
			return g, err
		}
	}
	if bits&GUILabel != 0 {
		g.HasLabel = true
		if g.Label, err = c.str(); err != nil {
			return g, err
		}
		if g.Color, err = c.str(); err != nil {
			return g, err
		}
		if g.BodyID, err = c.num(); err != nil {
			return g, err
		}
	}
	if bits&GUIScore != 0 {
		g.HasScore = true
		if g.ScoreJSON, err = c.str(); err != nil {
			return g, err
		}
	}
	if bits&GUIPoints != 0 {
		g.HasPoints = true
		if g.Points, err = c.num(); err != nil {
			return g, err
		}
	}
	if bits&GUIUpgrades != 0 {
		g.HasUpgrades = true
		n, err := c.num()
		if err != nil {
			return g, err
		}
		g.Upgrades = make([]string, 0, int(n))
		for i := 0; i < int(n); i++ {
			u, err := c.str()
			if err != nil {
				return g, err
			}
			g.Upgrades = append(g.Upgrades, u)
		}
	}
	if bits&GUIStats != 0 {
		g.HasStats = true
		for i := 0; i < 10; i++ {
			if g.StatTitles[i], err = c.str(); err != nil {
				return g, err
			}
			if g.StatCaps[i], err = c.num(); err != nil {
				return g, err
			}
			if g.StatSoftCaps[i], err = c.num(); err != nil {
				return g, err
			}
		}
	}
	if bits&GUISkills != 0 {
		g.HasSkills = true
		if g.Skills, err = c.str(); err != nil {
			return g, err
		}
	}
	if bits&GUIAccel != 0 {
		g.HasAccel = true
		if g.Accel, err = c.num(); err != nil {
			return g, err
		}
	}
	if bits&GUITopSpeed != 0 {
		g.HasTopSpeed = true
		if g.TopSpeed, err = c.num(); err != nil {
			return g, err
		}
	}
	if bits&GUIRoot != 0 {
		g.HasRoot = true
		if g.Root, err = c.str(); err != nil {
			return g, err
		}
	}
	if bits&GUIClass != 0 {
		g.HasClass = true
		if g.Class, err = c.str(); err != nil {
			return g, err
		}
	}
	if bits&GUIVisibleName != 0 {
		g.HasVisibleName = true
		if g.VisibleName, err = c.num(); err != nil {
			return g, err
		}
	}
	if bits&GUIDailyTank != 0 {
		g.HasDailyTank = true
		if g.DailyTankJSON, err = c.str(); err != nil {
			return g, err
		}
	}
	return g, nil
}

// Fields in a row. The leaderboard rows carry 8 (sockets.js:1748).
type DeltaRow struct {
	ID   float64
	Data []Value
}

type deltaSpan struct{ start, end int }

type deltaSnapshot struct {
	ids   []float64
	spans []deltaSpan
	vals  []Value
}

func (s *deltaSnapshot) reset() {
	s.ids = s.ids[:0]
	s.spans = s.spans[:0]
	s.vals = s.vals[:0]
}

func (s *deltaSnapshot) load(rows []DeltaRow) {
	s.reset()
	for _, r := range rows {
		start := len(s.vals)
		s.vals = append(s.vals, r.Data...)
		s.ids = append(s.ids, r.ID)
		s.spans = append(s.spans, deltaSpan{start, len(s.vals)})
	}
}

func (s *deltaSnapshot) row(i int) []Value { return s.vals[s.spans[i].start:s.spans[i].end] }

// Delta computes incremental updates for sorted lists (sockets.js:1668).
// Both old and new lists must be sorted ascending by ID.
type Delta struct {
	DataLength int

	prev deltaSnapshot
	cur  deltaSnapshot

	deletes    []Value
	updates    []Value
	updatesLen int
}

func NewDelta(dataLength int) *Delta { return &Delta{DataLength: dataLength} }

func (d *Delta) Seed(rows []DeltaRow) { d.prev.load(rows) }

// JS returns at sockets.js:1726.
func (d *Delta) Update(rows []DeltaRow) {
	d.cur.load(rows)
	d.deletes = d.deletes[:0]
	d.updates = d.updates[:0]
	d.updatesLen = 0

	old, now := &d.prev, &d.cur
	oldIndex, nowIndex := 0, 0
	for oldIndex < len(old.ids) && nowIndex < len(now.ids) {
		switch {
		case old.ids[oldIndex] == now.ids[nowIndex]:
			if d.changed(old.row(oldIndex), now.row(nowIndex)) {
				d.updates = append(d.updates, N(now.ids[nowIndex]))
				d.updates = append(d.updates, now.row(nowIndex)...)
				d.updatesLen++
			}
			oldIndex++
			nowIndex++
		case old.ids[oldIndex] < now.ids[nowIndex]:
			d.deletes = append(d.deletes, N(old.ids[oldIndex]))
			oldIndex++
		default:
			d.updates = append(d.updates, N(now.ids[nowIndex]))
			d.updates = append(d.updates, now.row(nowIndex)...)
			d.updatesLen++
			nowIndex++
		}
	}
	for ; oldIndex < len(old.ids); oldIndex++ {
		d.deletes = append(d.deletes, N(old.ids[oldIndex]))
	}
	for ; nowIndex < len(now.ids); nowIndex++ {
		d.updates = append(d.updates, N(now.ids[nowIndex]))
		d.updates = append(d.updates, now.row(nowIndex)...)
		d.updatesLen++
	}

	d.prev, d.cur = d.cur, d.prev // the old snapshot becomes next call's scratch
}

// changed checks if any field in the first DataLength positions differs.
func (d *Delta) changed(old, now []Value) bool {
	for i := 0; i < d.DataLength; i++ {
		oldOK, nowOK := i < len(old), i < len(now)
		if !oldOK && !nowOK {
			continue // undefined !== undefined is false
		}
		if oldOK != nowOK || !strictEqual(old[i], now[i]) {
			return true
		}
	}
	return false
}

// AppendUpdate writes the incremental form (sockets.js:1724):
func (d *Delta) AppendUpdate(dst []Value) []Value {
	dst = append(dst, N(len(d.deletes)))
	dst = append(dst, d.deletes...)
	dst = append(dst, N(d.updatesLen))
	return append(dst, d.updates...)
}

// AppendReset writes the full form (sockets.js:1723, :1725): no deletes, then
func (d *Delta) AppendReset(dst []Value) []Value {
	dst = append(dst, N(0), N(len(d.prev.ids)))
	for i := range d.prev.ids {
		dst = append(dst, N(d.prev.ids[i]))
		dst = append(dst, d.prev.row(i)...)
	}
	return dst
}

// SvWelcome is `W`, sent once the socket is accepted (sockets.js:2235). The
// client answers with `k` (socketinit.js:831).
type SvWelcome struct{}

func (SvWelcome) Append(dst []Value) []Value { return append(dst, S(OpSvWelcome), B(true)) }

func ParseSvWelcome(m []Value) (SvWelcome, error) { return SvWelcome{}, nil }

// SvKeyAccepted is `w`, the answer to a `k` (sockets.js:205). The client then
// asks for the room with `s` (socketinit.js:845).
type SvKeyAccepted struct{}

func (SvKeyAccepted) Append(dst []Value) []Value { return append(dst, S(OpSvKeyAccepted), B(true)) }

func ParseSvKeyAccepted(m []Value) (SvKeyAccepted, error) { return SvKeyAccepted{}, nil }

// SvRoomSetup is `R`, the full room state (sockets.js:283).
// [[{color, visibleOnBlackout, image}, ...], ...] (sockets.js:287) and the
// blackout object is {active, color} (sockets.js:296).
type SvRoomSetup struct {
	Width, Height   float64
	TilesJSON       string
	ServerStartTime float64
	RoomSpeed       float64
	BlackoutJSON    string
	RoundArena      bool
}

func (r *SvRoomSetup) Append(dst []Value) []Value {
	return append(dst, S(OpSvRoomSetup), N(r.Width), N(r.Height), S(r.TilesJSON),
		S(jsonNumber(r.ServerStartTime)), N(r.RoomSpeed), S(r.BlackoutJSON), B(r.RoundArena))
}

func ParseSvRoomSetup(m []Value) (SvRoomSetup, error) {
	var r SvRoomSetup
	c := cursor{m: m}
	var err error
	if r.Width, err = c.num(); err != nil {
		return r, err
	}
	if r.Height, err = c.num(); err != nil {
		return r, err
	}
	if r.TilesJSON, err = c.str(); err != nil {
		return r, err
	}
	start, err := c.str()
	if err != nil {
		return r, err
	}
	if r.ServerStartTime, err = strconv.ParseFloat(strings.TrimSpace(start), 64); err != nil {
		return r, err
	}
	if r.RoomSpeed, err = c.num(); err != nil {
		return r, err
	}
	if r.BlackoutJSON, err = c.str(); err != nil {
		return r, err
	}
	r.RoundArena, err = c.boolean()
	return r, err
}

// SvRoomRefresh is `r`, broadcast when the map changes (sockets.js:33). Its
// (socketinit.js:853, :869).
type SvRoomRefresh struct {
	Width, Height float64
	TilesJSON     string
}

func (r *SvRoomRefresh) Append(dst []Value) []Value {
	return append(dst, S(OpSvRoomRefresh), N(r.Width), N(r.Height), S(r.TilesJSON))
}

func ParseSvRoomRefresh(m []Value) (SvRoomRefresh, error) {
	var r SvRoomRefresh
	c := cursor{m: m}
	var err error
	if r.Width, err = c.num(); err != nil {
		return r, err
	}
	if r.Height, err = c.num(); err != nil {
		return r, err
	}
	r.TilesJSON, err = c.str()
	return r, err
}

// SvForceCamera is `c`, which snaps the client camera (sockets.js:1284). FOV is
type SvForceCamera struct {
	X, Y, FOV float64
}

func (f *SvForceCamera) Append(dst []Value) []Value {
	return append(dst, S(OpSvForceCamera), N(f.X), N(f.Y), N(f.FOV))
}

func ParseSvForceCamera(m []Value) (SvForceCamera, error) {
	var f SvForceCamera
	c := cursor{m: m}
	var err error
	if f.X, err = c.num(); err != nil {
		return f, err
	}
	if f.Y, err = c.num(); err != nil {
		return f, err
	}
	f.FOV, err = c.num()
	return f, err
}

// SvUplinkCamera is the camera-only form of `u` (sockets.js:1636), sent only
// from gazeUpon(true), i.e. from newPlayer (sockets.js:1123).
// (socketinit.js:961) against a slot the full form fills with lastCycle
// (sockets.js:1648). The literal true and the number 1 both encode as nibble
// is Date.now() minus the moment util.js loaded (util.js:134-138), sampled once
// per gameloop tick (game/index.js:278). The gameloop is a setInterval started
type SvUplinkCamera struct {
	X, Y float64
}

func (u *SvUplinkCamera) Append(dst []Value) []Value {
	return append(dst, S(OpSvUplink), B(true), N(u.X), N(u.Y))
}

func ParseSvUplinkCamera(m []Value) (SvUplinkCamera, error) {
	var u SvUplinkCamera
	c := cursor{m: m}
	if _, err := c.next(); err != nil { // the true flag
		return u, err
	}
	var err error
	if u.X, err = c.num(); err != nil {
		return u, err
	}
	u.Y, err = c.num()
	return u, err
}

type SvUplink struct {
	LastCycle float64
	X, Y      float64
	FOV       float64
	VX, VY    float64
	Scoping   bool
	GUI       GUIBlock
	Entities  []Photo
}

// entity (sockets.js:1611) and concatenates those. A caller doing the same
func (u *SvUplink) AppendHead(dst []Value) []Value {
	dst = append(dst, S(OpSvUplink), N(u.LastCycle), N(u.X), N(u.Y),
		N(u.FOV), N(u.VX), N(u.VY), B(u.Scoping))
	return u.GUI.Append(dst)
}

func (u *SvUplink) Append(dst []Value) []Value {
	dst = u.AppendHead(dst)
	dst = append(dst, N(len(u.Entities)))
	for i := range u.Entities {
		dst = u.Entities[i].Append(dst)
	}
	return dst
}

func ParseSvUplink(m []Value) (SvUplink, error) {
	var u SvUplink
	c := cursor{m: m}
	var err error
	if u.LastCycle, err = c.num(); err != nil {
		return u, err
	}
	if u.X, err = c.num(); err != nil {
		return u, err
	}
	if u.Y, err = c.num(); err != nil {
		return u, err
	}
	if u.FOV, err = c.num(); err != nil {
		return u, err
	}
	if u.VX, err = c.num(); err != nil {
		return u, err
	}
	if u.VY, err = c.num(); err != nil {
		return u, err
	}
	if u.Scoping, err = c.boolean(); err != nil {
		return u, err
	}
	if u.GUI, err = parseGUIBlock(&c); err != nil {
		return u, err
	}
	count, err := c.num()
	if err != nil {
		return u, err
	}
	if n := int(count); n > 0 {
		u.Entities = make([]Photo, 0, n)
		for i := 0; i < n; i++ {
			p, err := parsePhoto(&c)
			if err != nil {
				return u, err
			}
			u.Entities = append(u.Entities, p)
		}
	}
	return u, nil
}

type SvBroadcast struct {
	Minimap     *Delta
	Team        *Delta
	Leaderboard *Delta
	Reset       bool
}

func (b *SvBroadcast) Append(dst []Value) []Value {
	dst = append(dst, S(OpSvBroadcast))
	appendBlock := func(dst []Value, d *Delta) []Value {
		if d == nil {
			return append(dst, N(0), N(0))
		}
		if b.Reset {
			return d.AppendReset(dst)
		}
		return d.AppendUpdate(dst)
	}
	dst = appendBlock(dst, b.Minimap)
	dst = appendBlock(dst, b.Team)
	return appendBlock(dst, b.Leaderboard)
}

// SvBroadcastRows is the decoded form of `b` (sockets.js:1981). It is the three
type SvBroadcastRows struct {
	MinimapDeletes     []float64
	MinimapUpdates     []DeltaRow
	TeamDeletes        []float64
	TeamUpdates        []DeltaRow
	LeaderboardDeletes []float64
	LeaderboardUpdates []DeltaRow
}

// Field counts per block (sockets.js:1797, :1822, :1852 and socketinit.js:284).
const (
	MinimapFields     = 5
	MinimapTeamFields = 3
	LeaderboardFields = 8
)

func ParseSvBroadcast(m []Value) (SvBroadcastRows, error) {
	var b SvBroadcastRows
	c := cursor{m: m}
	var err error
	if b.MinimapDeletes, b.MinimapUpdates, err = parseDeltaBlock(&c, MinimapFields); err != nil {
		return b, err
	}
	if b.TeamDeletes, b.TeamUpdates, err = parseDeltaBlock(&c, MinimapTeamFields); err != nil {
		return b, err
	}
	b.LeaderboardDeletes, b.LeaderboardUpdates, err = parseDeltaBlock(&c, LeaderboardFields)
	return b, err
}

// parseDeltaBlock is Integrate.update (socketinit.js:131). fields is how many
func parseDeltaBlock(c *cursor, fields int) ([]float64, []DeltaRow, error) {
	nDel, err := c.num()
	if err != nil {
		return nil, nil, err
	}
	var deletes []float64
	if n := int(nDel); n > 0 {
		deletes = make([]float64, 0, n)
		for i := 0; i < n; i++ {
			id, err := c.num()
			if err != nil {
				return nil, nil, err
			}
			deletes = append(deletes, id)
		}
	}
	nUpd, err := c.num()
	if err != nil {
		return nil, nil, err
	}
	var updates []DeltaRow
	if n := int(nUpd); n > 0 {
		updates = make([]DeltaRow, 0, n)
		for i := 0; i < n; i++ {
			id, err := c.num()
			if err != nil {
				return nil, nil, err
			}
			if c.i+fields > len(c.m) {
				return nil, nil, ErrShortFrame
			}
			row := make([]Value, fields)
			copy(row, c.m[c.i:c.i+fields])
			c.i += fields
			updates = append(updates, DeltaRow{ID: id, Data: row})
		}
	}
	return deletes, updates, nil
}

// SvResetMinimap is `RM` (sockets.js:1980, :1997). No payload.
type SvResetMinimap struct{}

func (SvResetMinimap) Append(dst []Value) []Value { return append(dst, S(OpSvResetMinimap)) }

func ParseSvResetMinimap(m []Value) (SvResetMinimap, error) { return SvResetMinimap{}, nil }

// SvResetLeaderboard is `RL` (sockets.js:1998). No payload.
type SvResetLeaderboard struct{}

func (SvResetLeaderboard) Append(dst []Value) []Value { return append(dst, S(OpSvResetLeaderboard)) }

func ParseSvResetLeaderboard(m []Value) (SvResetLeaderboard, error) {
	return SvResetLeaderboard{}, nil
}

// SvMockup is `M`, one tank definition's render data (sockets.js:1444 and
// frame if field 1 is falsy (socketinit.js:956).
type SvMockup struct {
	Index      MockupIndex
	MockupJSON string
}

func (m *SvMockup) Append(dst []Value) []Value {
	return append(dst, S(OpSvMockup), m.Index.value(), S(m.MockupJSON))
}

func ParseSvMockup(m []Value) (SvMockup, error) {
	var out SvMockup
	c := cursor{m: m}
	v, err := c.next()
	if err != nil {
		return out, err
	}
	out.Index = valueToMockupIndex(v)
	out.MockupJSON, err = c.str()
	return out, err
}

// SvDeath is `F` (sockets.js:1523), whose payload is player.records()
// (sockets.js:1252). Killers are entity indices, already strings
// (entity.js:1138, :196).
type SvDeath struct {
	Score        float64
	Lifetime     float64 // whole seconds, Math.floor
	RespawnDelay float64
	Solo         float64
	Assists      float64
	Bosses       float64
	Polygons     float64
	Killers      []string
}

func (d *SvDeath) Append(dst []Value) []Value {
	dst = append(dst, S(OpSvDeath), N(d.Score), N(d.Lifetime), N(d.RespawnDelay),
		N(d.Solo), N(d.Assists), N(d.Bosses), N(d.Polygons), N(len(d.Killers)))
	for _, k := range d.Killers {
		dst = append(dst, S(k))
	}
	return dst
}

func ParseSvDeath(m []Value) (SvDeath, error) {
	var d SvDeath
	c := cursor{m: m}
	var err error
	if d.Score, err = c.num(); err != nil {
		return d, err
	}
	if d.Lifetime, err = c.num(); err != nil {
		return d, err
	}
	if d.RespawnDelay, err = c.num(); err != nil {
		return d, err
	}
	if d.Solo, err = c.num(); err != nil {
		return d, err
	}
	if d.Assists, err = c.num(); err != nil {
		return d, err
	}
	if d.Bosses, err = c.num(); err != nil {
		return d, err
	}
	if d.Polygons, err = c.num(); err != nil {
		return d, err
	}
	n, err := c.num()
	if err != nil {
		return d, err
	}
	if k := int(n); k > 0 {
		d.Killers = make([]string, 0, k)
		for i := 0; i < k; i++ {
			s, err := c.str()
			if err != nil {
				return d, err
			}
			d.Killers = append(d.Killers, s)
		}
	}
	return d, nil
}

// SvPopup is `m`, a transient on-screen message (sockets.js:28, :264,
// entity.js:151 and most addon sites). The client swaps the order:
// createMessage(m[1], m[0]) (socketinit.js:943).
type SvPopup struct {
	Duration float64
	Text     string
}

func (p *SvPopup) Append(dst []Value) []Value {
	return append(dst, S(OpSvPopup), N(p.Duration), S(p.Text))
}

func ParseSvPopup(m []Value) (SvPopup, error) {
	var p SvPopup
	c := cursor{m: m}
	var err error
	if p.Duration, err = c.num(); err != nil {
		return p, err
	}
	p.Text, err = c.str()
	return p, err
}

// SvPopupLines is `Em`, the multi-line popup (chatCommands.js:26, :39, :89,
// :207, keyCommands.js:86, :532, :646, :720). Same shape as `m` but the text is
type SvPopupLines struct {
	Duration  float64
	LinesJSON string
}

func (p *SvPopupLines) Append(dst []Value) []Value {
	return append(dst, S(OpSvPopupLines), N(p.Duration), S(p.LinesJSON))
}

func ParseSvPopupLines(m []Value) (SvPopupLines, error) {
	var p SvPopupLines
	c := cursor{m: m}
	var err error
	if p.Duration, err = c.num(); err != nil {
		return p, err
	}
	p.LinesJSON, err = c.str()
	return p, err
}

type SvScreenMessage struct{ Text string }

func (s *SvScreenMessage) Append(dst []Value) []Value {
	return append(dst, S(OpSvScreenMessage), S(s.Text))
}

func ParseSvScreenMessage(m []Value) (SvScreenMessage, error) {
	var s SvScreenMessage
	c := cursor{m: m}
	var err error
	s.Text, err = c.str()
	return s, err
}

// SvSync is `S`, the clock-sync bounce (sockets.js:328): the client's own
type SvSync struct {
	ClientTime float64
	ServerTime float64
}

func (s *SvSync) Append(dst []Value) []Value {
	return append(dst, S(OpSvSync), N(s.ClientTime), N(s.ServerTime))
}

func ParseSvSync(m []Value) (SvSync, error) {
	var s SvSync
	c := cursor{m: m}
	var err error
	if s.ClientTime, err = c.num(); err != nil {
		return s, err
	}
	s.ServerTime, err = c.num()
	return s, err
}

// SvPong is `p` (sockets.js:337). The payload is ping.toFixed(1), a string, so
// relies on coercion (socketinit.js:1047). ping is whatever the client sent, so
type SvPong struct{ Ping float64 }

func (p *SvPong) Append(dst []Value) []Value {
	return append(dst, S(OpSvPong), S(jsToFixed1(p.Ping)))
}

func ParseSvPong(m []Value) (SvPong, error) {
	var p SvPong
	c := cursor{m: m}
	s, err := c.str()
	if err != nil {
		return p, err
	}
	p.Ping, err = strconv.ParseFloat(strings.TrimSpace(s), 64)
	return p, err
}

// pushed (sockets.js:694). No payload.
type SvTankTree struct{}

func (SvTankTree) Append(dst []Value) []Value { return append(dst, S(OpSvTankTree)) }

func ParseSvTankTree(m []Value) (SvTankTree, error) { return SvTankTree{}, nil }

// SvNameColor is `z` (sockets.js:1170), an HTML colour like "#ff0000".
type SvNameColor struct{ Color string }

func (z *SvNameColor) Append(dst []Value) []Value {
	return append(dst, S(OpSvNameColor), S(z.Color))
}

func ParseSvNameColor(m []Value) (SvNameColor, error) {
	var z SvNameColor
	c := cursor{m: m}
	var err error
	z.Color, err = c.str()
	return z, err
}

// SvTransfer is `t`, the instruction to reconnect elsewhere (sockets.js:2041).
// sockets.js:2025.
type SvTransfer struct {
	Host string
	ID   string
}

func (t *SvTransfer) Append(dst []Value) []Value {
	return append(dst, S(OpSvTransfer), S(t.Host), S(t.ID))
}

func ParseSvTransfer(m []Value) (SvTransfer, error) {
	var t SvTransfer
	c := cursor{m: m}
	var err error
	if t.Host, err = c.str(); err != nil {
		return t, err
	}
	t.ID, err = c.str()
	return t, err
}

// SvKick is `K`, sent through lastWords (sockets.js:53, :79, :2005), which
// terminates the socket immediately after the send (sockets.js:2070). No
// payload. The client's handler is empty (socketinit.js:1221).
type SvKick struct{}

func (SvKick) Append(dst []Value) []Value { return append(dst, S(OpSvKick)) }

func ParseSvKick(m []Value) (SvKick, error) { return SvKick{}, nil }

// SvTemporaryBan is `temporaryban` (sockets.js:236). No payload.
type SvTemporaryBan struct{}

func (SvTemporaryBan) Append(dst []Value) []Value { return append(dst, S(OpSvTemporaryBan)) }

func ParseSvTemporaryBan(m []Value) (SvTemporaryBan, error) { return SvTemporaryBan{}, nil }

// SvPermanentBan is `permanentban` (sockets.js:244, :2197). No payload.
type SvPermanentBan struct{}

func (SvPermanentBan) Append(dst []Value) []Value { return append(dst, S(OpSvPermanentBan)) }

func ParseSvPermanentBan(m []Value) (SvPermanentBan, error) { return SvPermanentBan{}, nil }

// SvChat is `CHAT_MESSAGE_ENTITY` (sockets.js:123, :124), one JSON array of
type SvChat struct{ EntitiesJSON string }

func (s *SvChat) Append(dst []Value) []Value {
	return append(dst, S(OpSvChat), S(s.EntitiesJSON))
}

func ParseSvChat(m []Value) (SvChat, error) {
	var s SvChat
	c := cursor{m: m}
	var err error
	s.EntitiesJSON, err = c.str()
	return s, err
}

// SvDailyTankAd is `DTA` (sockets.js:701): JSON {src, normalAdSize, waitTime},
type SvDailyTankAd struct{ AdJSON string }

func (a *SvDailyTankAd) Append(dst []Value) []Value {
	return append(dst, S(OpSvDailyTankAd), S(a.AdJSON))
}

func ParseSvDailyTankAd(m []Value) (SvDailyTankAd, error) {
	var a SvDailyTankAd
	c := cursor{m: m}
	var err error
	a.AdJSON, err = c.str()
	return a, err
}

// SvDailyTankAdDone is `DTAD` (sockets.js:715). No payload.
type SvDailyTankAdDone struct{}

func (SvDailyTankAdDone) Append(dst []Value) []Value { return append(dst, S(OpSvDailyTankAdDone)) }

func ParseSvDailyTankAdDone(m []Value) (SvDailyTankAdDone, error) { return SvDailyTankAdDone{}, nil }

// SvDailyTankAdStart is `DTAST` (sockets.js:721). No payload.
type SvDailyTankAdStart struct{}

func (SvDailyTankAdStart) Append(dst []Value) []Value { return append(dst, S(OpSvDailyTankAdStart)) }

func ParseSvDailyTankAdStart(m []Value) (SvDailyTankAdStart, error) {
	return SvDailyTankAdStart{}, nil
}

// SvResetEntities is `RE` (chatCommands.js:301, editor.js:150), which clears
type SvResetEntities struct{}

func (SvResetEntities) Append(dst []Value) []Value { return append(dst, S(OpSvResetEntities)) }

func ParseSvResetEntities(m []Value) (SvResetEntities, error) { return SvResetEntities{}, nil }

// SvClearCache is `CC` (chatCommands.js:307, editor.js:156). No payload.
type SvClearCache struct{}

func (SvClearCache) Append(dst []Value) []Value { return append(dst, S(OpSvClearCache)) }

func ParseSvClearCache(m []Value) (SvClearCache, error) { return SvClearCache{}, nil }

// SvScreenShake is `SH` (entity.js:524, :907, gun.js:403): one JSON object
// entity.js:497.
type SvScreenShake struct{ ShakeJSON string }

func (s *SvScreenShake) Append(dst []Value) []Value {
	return append(dst, S(OpSvScreenShake), S(s.ShakeJSON))
}

func ParseSvScreenShake(m []Value) (SvScreenShake, error) {
	var s SvScreenShake
	c := cursor{m: m}
	var err error
	s.ShakeJSON, err = c.str()
	return s, err
}

// SvServerInfo is `svInfo`, the debug stats line (speedLoop.js:24). MSPT
type SvServerInfo struct {
	Gamemode string
	MSPT     float64
}

func (s *SvServerInfo) Append(dst []Value) []Value {
	return append(dst, S(OpSvServerInfo), S(s.Gamemode), S(jsToFixed1(s.MSPT)))
}

func ParseSvServerInfo(m []Value) (SvServerInfo, error) {
	var s SvServerInfo
	c := cursor{m: m}
	var err error
	if s.Gamemode, err = c.str(); err != nil {
		return s, err
	}
	mspt, err := c.str()
	if err != nil {
		return s, err
	}
	s.MSPT, err = strconv.ParseFloat(strings.TrimSpace(mspt), 64)
	return s, err
}

// SvGlobalServerInfo is `gSvInfo` (socketinit.js:883). The client reads only
type SvGlobalServerInfo struct{ Players float64 }

func ParseSvGlobalServerInfo(m []Value) (SvGlobalServerInfo, error) {
	var s SvGlobalServerInfo
	if len(m) < 2 {
		return s, ErrShortFrame
	}
	s.Players = m[1].Num
	return s, nil
}

// SvSyncWithTank is `I` (socketinit.js:1087), which toggles the client's
type SvSyncWithTank struct{ Syncing bool }

func ParseSvSyncWithTank(m []Value) (SvSyncWithTank, error) {
	var s SvSyncWithTank
	if len(m) < 1 {
		return s, ErrShortFrame
	}
	s.Syncing = truthy(m[0])
	return s, nil
}

// SvActivateSmoothCamera is `AS` (socketinit.js:1237). No payload.
type SvActivateSmoothCamera struct{}

func ParseSvActivateSmoothCamera(m []Value) (SvActivateSmoothCamera, error) {
	return SvActivateSmoothCamera{}, nil
}

// SvDeactivateSmoothCamera is `DS` (socketinit.js:1241). No payload.
type SvDeactivateSmoothCamera struct{}

func ParseSvDeactivateSmoothCamera(m []Value) (SvDeactivateSmoothCamera, error) {
	return SvDeactivateSmoothCamera{}, nil
}

// ClKey is `k`, the permission key (sockets.js:202). Zero or one element. The
// "Duplicate player spawn attempt." (sockets.js:204).
type ClKey struct {
	HasKey bool
	Key    string
}

func (k *ClKey) Append(dst []Value) []Value {
	dst = append(dst, S(OpClKey))
	if k.HasKey {
		dst = append(dst, S(k.Key))
	}
	return dst
}

func ParseClKey(m []Value) (ClKey, error) {
	var k ClKey
	if len(m) > 1 {
		return k, kick("Ill-sized key request.")
	}
	if len(m) == 1 {
		k.HasKey = true
		k.Key = jsTrim(valueString(m[0]))
	}
	return k, nil
}

type ClSpawn struct {
	Name           string
	NeedsRoom      float64
	AutoLevelUp    float64
	TransferBodyID OptString
	Incognito      float64
}

func (s *ClSpawn) Append(dst []Value) []Value {
	return append(dst, S(OpClSpawn), S(s.Name), N(s.NeedsRoom), N(s.AutoLevelUp),
		s.TransferBodyID.value(), N(s.Incognito))
}

func ParseClSpawn(m []Value) (ClSpawn, error) {
	var s ClSpawn
	if len(m) < 4 {
		return s, kick("Ill-sized spawn request.")
	}
	if m[0].Kind != KindString {
		return s, kick("Bad spawn request. (name)")
	}
	s.Name = m[0].Str
	if nameTokens(s.Name) > 48 {
		return s, kick("Shorten your name!")
	}
	if m[1].Kind != KindNumber {
		return s, kick("Bad spawn request. (needsRoom)")
	}
	if m[2].Kind != KindNumber {
		return s, kick("Bad spawn request. (autoLVLup)")
	}
	if len(m) < 5 || m[4].Kind != KindNumber {
		return s, kick("Bad spawn request. (incognito)")
	}
	s.NeedsRoom, s.AutoLevelUp, s.Incognito = m[1].Num, m[2].Num, m[4].Num

	if truthy(m[3]) {
		if m[3].Kind != KindString {
			return s, kick("Bad body transfer. (transferbodyID)")
		}
		// replace() takes the first occurrence only (sockets.js:274).
		s.TransferBodyID = SomeString(strings.Replace(m[3].Str, s.Name, "", 1))
	}
	return s, nil
}

type ClSync struct{ Time float64 }

func (s *ClSync) Append(dst []Value) []Value { return append(dst, S(OpClSync), N(s.Time)) }

func ParseClSync(m []Value) (ClSync, error) {
	var s ClSync
	if len(m) != 1 {
		return s, kick("Ill-sized sync packet.")
	}
	if m[0].Kind != KindNumber {
		return s, kick("Weird sync packet.")
	}
	s.Time = m[0].Num
	return s, nil
}

// ClPing is `p` (socketinit.js:834, :1331). The server bounces it back as
type ClPing struct{ Payload float64 }

func (p *ClPing) Append(dst []Value) []Value { return append(dst, S(OpClPing), N(p.Payload)) }

func ParseClPing(m []Value) (ClPing, error) {
	var p ClPing
	if len(m) != 1 {
		return p, kick("Ill-sized ping.")
	}
	if m[0].Kind != KindNumber {
		return p, kick("Weird ping.")
	}
	p.Payload = m[0].Num
	return p, nil
}

// ClDownlink is `d` (socketinit.js:1031), the acknowledgement that clears
type ClDownlink struct{ Time float64 }

func (d *ClDownlink) Append(dst []Value) []Value { return append(dst, S(OpClDownlink), N(d.Time)) }

func ParseClDownlink(m []Value) (ClDownlink, error) {
	var d ClDownlink
	if len(m) != 1 {
		return d, kick("Ill-sized downlink.")
	}
	if m[0].Kind != KindNumber {
		return d, kick("Bad downlink.")
	}
	d.Time = m[0].Num
	return d, nil
}

// Command bits, from socketinit.js:1300 and sockets.js:391. Bit 7 is unused.
const (
	CommandUp    = 1 << 0
	CommandDown  = 1 << 1
	CommandLeft  = 1 << 2
	CommandRight = 1 << 3
	CommandLMB   = 1 << 4
	CommandMMB   = 1 << 5
	CommandRMB   = 1 << 6
)

// ClCommand is `C`, the movement and mouse packet (socketinit.js:1305).
type ClCommand struct {
	TargetX, TargetY float64
	ReverseTank      Value
	Commands         float64
}

func (c *ClCommand) Append(dst []Value) []Value {
	return append(dst, S(OpClCommand), N(c.TargetX), N(c.TargetY), c.ReverseTank, N(c.Commands))
}

func ParseClCommand(m []Value) (ClCommand, error) {
	var c ClCommand
	if len(m) != 4 {
		return c, kick("Ill-sized command packet.")
	}
	if m[0].Kind != KindNumber || m[1].Kind != KindNumber || m[3].Kind != KindNumber {
		return c, kick("Weird downlink.")
	}
	if m[3].Num > 255 {
		return c, kick("Malformed command packet.")
	}
	c.TargetX, c.TargetY, c.ReverseTank, c.Commands = m[0].Num, m[1].Num, m[2], m[3].Num
	return c, nil
}

// ClKeys is `#`, the key state (canvas.js:159, :255, :417, :837). A release is
// the key name prefixed with "-" (canvas.js:414). The handler validates
// nothing. It wraps runKeyCommand in try/catch (sockets.js:401), and an empty
// list is treated as ["default"] downstream (keyCommands.js:986).
type ClKeys struct{ Keys []string }

func (k *ClKeys) Append(dst []Value) []Value {
	dst = append(dst, S(OpClKeys))
	for _, s := range k.Keys {
		dst = append(dst, S(s))
	}
	return dst
}

func ParseClKeys(m []Value) (ClKeys, error) {
	var k ClKeys
	if len(m) == 0 {
		return k, nil
	}
	k.Keys = make([]string, 0, len(m))
	for _, v := range m {
		k.Keys = append(k.Keys, valueString(v))
	}
	return k, nil
}

// Toggle indices, from the list at sockets.js:422.
const (
	ToggleAutospin = 0
	ToggleAutofire = 1
	ToggleOverride = 2
	ToggleAutoalt  = 3
)

// ClToggle is `t` (canvas.js:261, :814, :1052). Index must land in the
type ClToggle struct {
	Index       float64
	SendMessage Value // not type-checked by the handler (sockets.js:420)
}

func (t *ClToggle) Append(dst []Value) []Value {
	return append(dst, S(OpClToggle), N(t.Index), t.SendMessage)
}

func ParseClToggle(m []Value) (ClToggle, error) {
	var t ClToggle
	if len(m) != 2 {
		return t, kick("Ill-sized toggle.")
	}
	if m[0].Kind != KindNumber {
		return t, kick("Weird toggle.")
	}
	if m[0].Num != math.Trunc(m[0].Num) || m[0].Num < 0 || m[0].Num > 3 {
		return t, kick("Bad toggle.")
	}
	t.Index, t.SendMessage = m[0].Num, m[1]
	return t, nil
}

// ClUpgrade is `U` (canvas.js:326, :598, :600, :862). The pair (0, -1) is the
// daily-tank request and skips every other check (sockets.js:450).
type ClUpgrade struct {
	Upgrade   float64
	BranchID  float64
	DailyTank bool
}

func (u *ClUpgrade) Append(dst []Value) []Value {
	if u.DailyTank {
		return append(dst, S(OpClUpgrade), N(0), N(-1))
	}
	return append(dst, S(OpClUpgrade), N(u.Upgrade), N(u.BranchID))
}

func ParseClUpgrade(m []Value) (ClUpgrade, error) {
	var u ClUpgrade
	if len(m) != 2 {
		return u, kick("Ill-sized upgrade request.")
	}
	if m[0].Kind == KindNumber && m[0].Num == 0 && m[1].Kind == KindNumber && m[1].Num == -1 {
		return ClUpgrade{Upgrade: 0, BranchID: -1, DailyTank: true}, nil
	}
	if m[0].Kind != KindNumber || m[0].Num < 0 ||
		m[1].Kind != KindNumber || math.IsNaN(m[1].Num) || math.IsInf(m[1].Num, 0) || m[1].Num < 0 {
		return u, kick("Bad upgrade request.")
	}
	u.Upgrade, u.BranchID = m[0].Num, m[1].Num
	return u, nil
}

// ClStat is `x`, a skill point spend (canvas.js:311, :468, :856). Max must be
// checks the index last, after both type checks (sockets.js:488).
type ClStat struct {
	Index float64
	Max   float64
}

func (s *ClStat) Append(dst []Value) []Value {
	return append(dst, S(OpClStat), N(s.Index), N(s.Max))
}

func ParseClStat(m []Value) (ClStat, error) {
	var s ClStat
	if len(m) != 2 {
		return s, kick("Ill-sized skill request.")
	}
	if m[0].Kind != KindNumber {
		return s, kick("Weird stat upgrade request number.")
	}
	if m[1].Kind != KindNumber {
		return s, kick("Weird stat upgrade request max boolean.")
	}
	if m[1].Num != 0 && m[1].Num != 1 {
		return s, kick("invalid upgrade request max boolean.")
	}
	if m[0].Num != math.Trunc(m[0].Num) || m[0].Num < 0 || m[0].Num > 9 {
		return s, kick("Unknown stat upgrade request.")
	}
	s.Index, s.Max = m[0].Num, m[1].Num
	return s, nil
}

// ClLevelUp is `L`, the level-up cheat (canvas.js:240, :831). No payload, and
type ClLevelUp struct{}

func (ClLevelUp) Append(dst []Value) []Value { return append(dst, S(OpClLevelUp)) }

func ParseClLevelUp(m []Value) (ClLevelUp, error) {
	if len(m) != 0 {
		return ClLevelUp{}, kick("Ill-sized level-up request.")
	}
	return ClLevelUp{}, nil
}

// ClSuicide is `1`, the self-destruct (canvas.js:249, :821). No payload, no
type ClSuicide struct{}

func (ClSuicide) Append(dst []Value) []Value { return append(dst, S(OpClSuicide)) }

func ParseClSuicide(m []Value) (ClSuicide, error) { return ClSuicide{}, nil }

// mothership or boss (canvas.js:243, :834, :1065). No payload, no validation.
type ClControl struct{}

func (ClControl) Append(dst []Value) []Value { return append(dst, S(OpClControl)) }

func ParseClControl(m []Value) (ClControl, error) { return ClControl{}, nil }

// ClChat is `M`, a chat message (canvas.js:23). Must be a string or the socket
// is kicked. The § doubling at sockets.js:651 is a Config-gated sanitiser and
type ClChat struct{ Text string }

func (c *ClChat) Append(dst []Value) []Value { return append(dst, S(OpClChat), S(c.Text)) }

func ParseClChat(m []Value) (ClChat, error) {
	var c ClChat
	if len(m) == 0 || m[0].Kind != KindString {
		return c, kick("Non-string chat message.")
	}
	c.Text = m[0].Str
	return c, nil
}

// ClTankTree is `T`, the request for the tank tree's mockups (global.js:451).
type ClTankTree struct{}

func (ClTankTree) Append(dst []Value) []Value { return append(dst, S(OpClTankTree)) }

func ParseClTankTree(m []Value) (ClTankTree, error) { return ClTankTree{}, nil }

// ClDailyTankAd is `DTA`, the request for an ad (canvas.js:602). No payload.
// The caller kicks when Config.daily_tank is unset (sockets.js:697).
type ClDailyTankAd struct{}

func (ClDailyTankAd) Append(dst []Value) []Value { return append(dst, S(OpClDailyTankAd)) }

func ParseClDailyTankAd(m []Value) (ClDailyTankAd, error) { return ClDailyTankAd{}, nil }

// ClDailyTankAdDone is `DTAD` (canvas.js:604, socketinit.js:1146, :1148). No
type ClDailyTankAdDone struct{}

func (ClDailyTankAdDone) Append(dst []Value) []Value { return append(dst, S(OpClDailyTankAdDone)) }

func ParseClDailyTankAdDone(m []Value) (ClDailyTankAdDone, error) { return ClDailyTankAdDone{}, nil }

// ClDailyTankAdStart is `DTAST` (socketinit.js:1109), the video's duration.
type ClDailyTankAdStart struct{ Duration float64 }

func (d *ClDailyTankAdStart) Append(dst []Value) []Value {
	return append(dst, S(OpClDailyTankAdStart), N(d.Duration))
}

func ParseClDailyTankAdStart(m []Value) (ClDailyTankAdStart, error) {
	var d ClDailyTankAdStart
	if len(m) == 0 {
		return d, ErrShortFrame
	}
	d.Duration = m[0].Num
	return d, nil
}

func (d *ClDailyTankAdStart) DurationSeconds() string {
	s := jsNumberString(d.Duration)
	if i := strings.IndexByte(s, '.'); i >= 0 {
		return s[:i]
	}
	return s
}

// ClNeedsNewBroadcast is `NWB` (socketinit.js:932), which asks for a full
type ClNeedsNewBroadcast struct{}

func (ClNeedsNewBroadcast) Append(dst []Value) []Value {
	return append(dst, S(OpClNeedsNewBroadcast))
}

func ParseClNeedsNewBroadcast(m []Value) (ClNeedsNewBroadcast, error) {
	return ClNeedsNewBroadcast{}, nil
}
