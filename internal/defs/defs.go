// Package defs loads the entity definition table and resolves PARENT chains.
package defs

import (
	"bytes"
	"embed"
	"encoding/json"
	"fmt"
	"io"
	"math"
	"os"
	"strconv"

	"arrasgo/internal/jsutil"
)

//go:embed data/definitions.json
var embedded embed.FS

const embeddedPath = "data/definitions.json"

const serverPortalGuns = 60

type Opt[T any] struct {
	val T
	set bool
}

func Some[T any](v T) Opt[T] { return Opt[T]{val: v, set: true} }

func (o Opt[T]) IsSet() bool { return o.set }

func (o Opt[T]) Get() (T, bool) { return o.val, o.set }

func (o Opt[T]) Or(def T) T {
	if o.set {
		return o.val
	}
	return def
}

func (o Opt[T]) Must() T {
	if !o.set {
		panic("defs: Opt.Must on an absent value")
	}
	return o.val
}

func (o *Opt[T]) UnmarshalJSON(b []byte) error {
	if isNull(b) || isUndefined(b) {
		var zero T
		o.val, o.set = zero, false
		return nil
	}
	if f, ok := nonFinite(b); ok {
		// Reproduces the JS bug. See docs/found-bugs.md #61.
		p, isFloat := any(&o.val).(*float64)
		if !isFloat {
			return fmt.Errorf("a non-finite number sentinel reached a field that is not a float64 (%s)", trunc(b))
		}
		*p, o.set = f, true
		return nil
	}
	if err := strictUnmarshal(b, &o.val); err != nil {
		if kind, ok := sentinelKind(b); ok {
			return fmt.Errorf("a %q sentinel reached a field that cannot hold one (%s): %w", kind, trunc(b), err)
		}
		return err
	}
	o.set = true
	return nil
}

func (o Opt[T]) MarshalJSON() ([]byte, error) {
	if !o.set {
		return []byte("null"), nil
	}
	return json.Marshal(o.val)
}

func strictUnmarshal[T any](b []byte, v *T) error {
	if len(b) > 0 && (b[0] == '{' || b[0] == '[') {
		dec := json.NewDecoder(bytes.NewReader(b))
		dec.DisallowUnknownFields()
		return dec.Decode(v)
	}
	return json.Unmarshal(b, v)
}

func isNull(b []byte) bool { return len(b) == 0 || bytes.Equal(b, []byte("null")) }

func isUndefined(b []byte) bool {
	kind, ok := sentinelKind(b)
	return ok && kind == "undefined"
}

func sentinelKind(b []byte) (string, bool) {
	if len(b) == 0 || b[0] != '{' || !bytes.Contains(b, []byte(`"__nonSerialisable"`)) {
		return "", false
	}
	var s struct {
		Kind string `json:"__nonSerialisable"`
	}
	if err := json.Unmarshal(b, &s); err != nil {
		return "", false
	}
	return s.Kind, true
}

func nonFinite(b []byte) (float64, bool) {
	kind, ok := sentinelKind(b)
	if !ok {
		return 0, false
	}
	switch kind {
	case "NaN":
		return math.NaN(), true
	case "Infinity":
		return math.Inf(1), true
	case "-Infinity":
		return math.Inf(-1), true
	}
	return 0, false
}

func trunc(b []byte) string {
	if len(b) > 120 {
		return string(b[:120]) + "..."
	}
	return string(b)
}

type nonSerialisable struct {
	Kind   string `json:"__nonSerialisable"`
	Path   string `json:"path"`
	Name   string `json:"name"`
	Source string `json:"source"`
}

func numberToString(v float64) string {
	if i := int64(v); float64(i) == v {
		return strconv.FormatInt(i, 10)
	}
	return strconv.FormatFloat(v, 'g', -1, 64)
}

type Func struct {
	Path   string
	Name   string
	Source string
}

func (f Func) Call() error {
	return fmt.Errorf("defs: %s is an unported JS function (source at %s); port it by hand", f.Name, f.Path)
}

func (f *Func) UnmarshalJSON(b []byte) error {
	var s nonSerialisable
	if err := json.Unmarshal(b, &s); err != nil {
		return err
	}
	if s.Kind != "function" {
		return fmt.Errorf("expected a function sentinel, got %s", trunc(b))
	}
	f.Path, f.Name, f.Source = s.Path, s.Name, s.Source
	return nil
}

type TypeRef struct {
	Name   string
	Inline *Definition
}

func (t TypeRef) IsInline() bool { return t.Inline != nil }

func (t *TypeRef) UnmarshalJSON(b []byte) error {
	if isNull(b) || isUndefined(b) {
		return nil
	}
	if b[0] == '"' {
		return json.Unmarshal(b, &t.Name)
	}
	if b[0] == '{' {
		var ref struct {
			ClassRef string `json:"__classRef"`
		}
		if err := json.Unmarshal(b, &ref); err == nil && ref.ClassRef != "" {
			t.Name = ref.ClassRef
			return nil
		}
		d := new(Definition)
		if err := strictUnmarshal(b, d); err != nil {
			return err
		}
		t.Inline = d
		return nil
	}
	return fmt.Errorf("bad type reference %s", trunc(b))
}

type TypeList []TypeRef

func (l *TypeList) UnmarshalJSON(b []byte) error {
	if isNull(b) || isUndefined(b) {
		return nil
	}
	if b[0] == '[' {
		var refs []TypeRef
		if err := strictUnmarshal(b, &refs); err != nil {
			return err
		}
		*l = refs
		return nil
	}
	var one TypeRef
	if err := one.UnmarshalJSON(b); err != nil {
		return err
	}
	*l = TypeList{one}
	return nil
}

type ColorKind uint8

const (
	ColorNone ColorKind = iota
	ColorNumber
	ColorString
	ColorObject
)

type ColorSpec struct {
	Kind ColorKind
	Num  float64
	Str  string
	Obj  ColorObjectSpec
}

type ColorObjectSpec struct {
	Base                  ColorValue   `json:"BASE"`
	HueShift              Opt[float64] `json:"HUE_SHIFT"`
	SaturationShift       Opt[float64] `json:"SATURATION_SHIFT"`
	BrightnessShift       Opt[float64] `json:"BRIGHTNESS_SHIFT"`
	AllowBrightnessInvert Opt[bool]    `json:"ALLOW_BRIGHTNESS_INVERT"`
}

func (c *ColorSpec) UnmarshalJSON(b []byte) error {
	if isNull(b) || isUndefined(b) {
		return nil
	}
	switch b[0] {
	case '"':
		c.Kind = ColorString
		return json.Unmarshal(b, &c.Str)
	case '{':
		if err := strictUnmarshal(b, &c.Obj); err != nil {
			return err
		}
		c.Kind = ColorObject
		return nil
	default:
		c.Kind = ColorNumber
		return json.Unmarshal(b, &c.Num)
	}
}

type ColorValue struct {
	IsString bool
	Num      float64
	Str      string
	set      bool
}

func (v ColorValue) IsSet() bool { return v.set }

func (v ColorValue) String() string {
	if !v.set {
		return ""
	}
	if v.IsString {
		return v.Str
	}
	return numberToString(v.Num)
}

func (v *ColorValue) UnmarshalJSON(b []byte) error {
	if isNull(b) || isUndefined(b) {
		return nil
	}
	v.set = true
	if b[0] == '"' {
		v.IsString = true
		return json.Unmarshal(b, &v.Str)
	}
	return json.Unmarshal(b, &v.Num)
}

type ShapeSpec struct {
	IsNumber bool
	IsString bool
	Num      float64
	Str      string
	Polygon  [][]float64
}

func (s *ShapeSpec) UnmarshalJSON(b []byte) error {
	if isNull(b) || isUndefined(b) {
		return nil
	}
	switch b[0] {
	case '"':
		s.IsString = true
		return json.Unmarshal(b, &s.Str)
	case '[':
		return json.Unmarshal(b, &s.Polygon)
	default:
		s.IsNumber = true
		return json.Unmarshal(b, &s.Num)
	}
}

type AlphaSpec struct {
	IsRange bool
	Num     float64
	Range   []float64
}

func (a *AlphaSpec) UnmarshalJSON(b []byte) error {
	if isNull(b) || isUndefined(b) {
		return nil
	}
	if b[0] == '[' {
		a.IsRange = true
		return json.Unmarshal(b, &a.Range)
	}
	return json.Unmarshal(b, &a.Num)
}

type NecroSpec struct {
	IsList bool
	Bool   bool
	Shapes []float64
}

func (n *NecroSpec) UnmarshalJSON(b []byte) error {
	if isNull(b) || isUndefined(b) {
		return nil
	}
	if b[0] == '[' {
		n.IsList = true
		return json.Unmarshal(b, &n.Shapes)
	}
	return json.Unmarshal(b, &n.Bool)
}

type RerootSpec struct {
	IsList bool
	Str    string
	List   []string
}

func (r *RerootSpec) UnmarshalJSON(b []byte) error {
	if isNull(b) || isUndefined(b) {
		return nil
	}
	if b[0] == '[' {
		r.IsList = true
		return json.Unmarshal(b, &r.List)
	}
	return json.Unmarshal(b, &r.Str)
}

type TypeField struct {
	IsList bool
	Str    string
	List   []string
}

func (t *TypeField) UnmarshalJSON(b []byte) error {
	if isNull(b) || isUndefined(b) {
		return nil
	}
	if b[0] == '[' {
		t.IsList = true
		return json.Unmarshal(b, &t.List)
	}
	return json.Unmarshal(b, &t.Str)
}

type BehaviourSpec struct {
	Name string
	Args BehaviourArgs
}

type BehaviourArgs struct {
	Angle        Opt[float64] `json:"angle"`
	Damp         Opt[float64] `json:"damp"`
	Independent  Opt[bool]    `json:"independent"`
	Smoothness   Opt[float64] `json:"smoothness"`
	Speed        Opt[float64] `json:"speed"`
	TurnVelocity Opt[float64] `json:"turnVelocity"`
}

func (s *BehaviourSpec) UnmarshalJSON(b []byte) error {
	if isNull(b) || isUndefined(b) {
		return nil
	}
	if b[0] == '[' {
		var pair []json.RawMessage
		if err := json.Unmarshal(b, &pair); err != nil {
			return err
		}
		if len(pair) > 0 {
			if err := json.Unmarshal(pair[0], &s.Name); err != nil {
				return err
			}
		}
		if len(pair) > 1 && !isNull(pair[1]) {
			return strictUnmarshal(pair[1], &s.Args)
		}
		return nil
	}
	return json.Unmarshal(b, &s.Name)
}

type Controller struct {
	Name string
	Args ControllerArgs
}

type ControllerArgs struct {
	Amplitude               Opt[float64] `json:"amplitude"`
	Distance                Opt[float64] `json:"distance"`
	Independent             Opt[bool]    `json:"independent"`
	Invert                  Opt[bool]    `json:"invert"`
	Leash                   Opt[float64] `json:"leash"`
	LockThroughWalls        Opt[bool]    `json:"lockThroughWalls"`
	LookAtGoal              Opt[bool]    `json:"lookAtGoal"`
	OnlyIfHasAltFireGun     Opt[bool]    `json:"onlyIfHasAltFireGun"`
	OnlyWhenIdle            Opt[bool]    `json:"onlyWhenIdle"`
	Orbit                   Opt[float64] `json:"orbit"`
	Range                   Opt[float64] `json:"range"`
	Repel                   Opt[float64] `json:"repel"`
	ReplicatePlayerMovement Opt[bool]    `json:"replicatePlayerMovement"`
	Speed                   Opt[float64] `json:"speed"`
	Static                  Opt[bool]    `json:"static"`
	Turnwiserange           Opt[float64] `json:"turnwiserange"`
	UseOwnMaster            Opt[bool]    `json:"useOwnMaster"`
	YOffset                 Opt[float64] `json:"yOffset"`
	present                 bool
}

func (a ControllerArgs) Present() bool { return a.present || a.anySet() }

func (a ControllerArgs) anySet() bool {
	return a.Amplitude.IsSet() || a.Distance.IsSet() || a.Independent.IsSet() ||
		a.Invert.IsSet() || a.Leash.IsSet() || a.LockThroughWalls.IsSet() ||
		a.LookAtGoal.IsSet() || a.OnlyIfHasAltFireGun.IsSet() || a.OnlyWhenIdle.IsSet() ||
		a.Orbit.IsSet() || a.Range.IsSet() || a.Repel.IsSet() ||
		a.ReplicatePlayerMovement.IsSet() || a.Speed.IsSet() || a.Static.IsSet() ||
		a.Turnwiserange.IsSet() ||
		a.UseOwnMaster.IsSet() || a.YOffset.IsSet()
}

func (c *Controller) UnmarshalJSON(b []byte) error {
	if isNull(b) || isUndefined(b) {
		return nil
	}
	if b[0] == '[' {
		var pair []json.RawMessage
		if err := json.Unmarshal(b, &pair); err != nil {
			return err
		}
		if len(pair) > 0 {
			if err := json.Unmarshal(pair[0], &c.Name); err != nil {
				return err
			}
		}
		if len(pair) > 1 && !isNull(pair[1]) {
			if err := strictUnmarshal(pair[1], &c.Args); err != nil {
				return err
			}
			c.Args.present = true
		}
		return nil
	}
	return json.Unmarshal(b, &c.Name)
}

type UpgradeSlot struct {
	Classes     TypeList
	RedefineAll bool
}

func (u *UpgradeSlot) UnmarshalJSON(b []byte) error {
	if isNull(b) || isUndefined(b) {
		return nil
	}
	if b[0] != '[' {
		var one TypeRef
		if err := one.UnmarshalJSON(b); err != nil {
			return err
		}
		u.Classes = TypeList{one}
		return nil
	}
	var raw []json.RawMessage
	if err := json.Unmarshal(b, &raw); err != nil {
		return err
	}
	for _, el := range raw {
		if bytes.Equal(el, []byte("true")) {
			u.RedefineAll = true
			continue
		}
		var ref TypeRef
		if err := ref.UnmarshalJSON(el); err != nil {
			return err
		}
		u.Classes = append(u.Classes, ref)
	}
	return nil
}

type SkillSpec struct {
	IsList bool
	List   []float64
	Named  NamedSkills
}

type NamedSkills struct {
	Reload             Opt[float64] `json:"RELOAD"`
	Penetration        Opt[float64] `json:"PENETRATION"`
	BulletHealth       Opt[float64] `json:"BULLET_HEALTH"`
	BulletDamage       Opt[float64] `json:"BULLET_DAMAGE"`
	BulletSpeed        Opt[float64] `json:"BULLET_SPEED"`
	ShieldCapacity     Opt[float64] `json:"SHIELD_CAPACITY"`
	BodyDamage         Opt[float64] `json:"BODY_DAMAGE"`
	MaxHealth          Opt[float64] `json:"MAX_HEALTH"`
	ShieldRegeneration Opt[float64] `json:"SHIELD_REGENERATION"`
	MovementSpeed      Opt[float64] `json:"MOVEMENT_SPEED"`
}

func (n NamedSkills) Slots(def float64) [10]float64 {
	return [10]float64{
		n.Reload.Or(def), n.Penetration.Or(def), n.BulletHealth.Or(def),
		n.BulletDamage.Or(def), n.BulletSpeed.Or(def), n.ShieldCapacity.Or(def),
		n.BodyDamage.Or(def), n.MaxHealth.Or(def), n.ShieldRegeneration.Or(def),
		n.MovementSpeed.Or(def),
	}
}

func (s *SkillSpec) UnmarshalJSON(b []byte) error {
	if isNull(b) || isUndefined(b) {
		return nil
	}
	if b[0] == '[' {
		s.IsList = true
		return json.Unmarshal(b, &s.List)
	}
	return strictUnmarshal(b, &s.Named)
}

type BodySpec struct {
	Accel            Opt[float64] `json:"ACCEL"`
	Acceleration     Opt[float64] `json:"ACCELERATION"`
	Damage           Opt[float64] `json:"DAMAGE"`
	Density          Opt[float64] `json:"DENSITY"`
	FOV              Opt[float64] `json:"FOV"`
	Health           Opt[float64] `json:"HEALTH"`
	Hetero           Opt[float64] `json:"HETERO"`
	Knockback        Opt[float64] `json:"KNOCKBACK"`
	Penetration      Opt[float64] `json:"PENETRATION"`
	Pushability      Opt[float64] `json:"PUSHABILITY"`
	Range            Opt[float64] `json:"RANGE"`
	RecoilMultiplier Opt[float64] `json:"RECOIL_MULTIPLIER"`
	Regen            Opt[float64] `json:"REGEN"`
	Resist           Opt[float64] `json:"RESIST"`
	Shield           Opt[float64] `json:"SHIELD"`
	ShockAbsorb      Opt[float64] `json:"SHOCK_ABSORB"`
	Speed            Opt[float64] `json:"SPEED"`
	Stealth          Opt[float64] `json:"STEALTH"`
}

type AISettings struct {
	Blind        Opt[bool]      `json:"BLIND"`
	Chase        Opt[bool]      `json:"CHASE"`
	Farmer       Opt[bool]      `json:"FARMER"`
	FullView     Opt[bool]      `json:"FULL_VIEW"`
	IgnoreShapes Opt[bool]      `json:"IGNORE_SHAPES"`
	NoLead       Opt[bool]      `json:"NO_LEAD"`
	Skynet       Opt[bool]      `json:"SKYNET"`
	Speed        Opt[float64]   `json:"SPEED"`
	Strafe       Opt[bool]      `json:"STRAFE"`
	ChaseLower   Opt[bool]      `json:"chase"`
	ExtraStats   Opt[[]float64] `json:"extraStats"`
	Independent  Opt[bool]      `json:"independent"`
	SkynetLower  Opt[bool]      `json:"skynet"`
}

type GlowSpec struct {
	Alpha     Opt[float64] `json:"ALPHA"`
	Color     ColorSpec    `json:"COLOR"`
	Radius    Opt[float64] `json:"RADIUS"`
	Recursion Opt[float64] `json:"RECURSION"`
	Strength  Opt[float64] `json:"STRENGTH"`
}

type StatNames struct {
	BodyDamage   Opt[string] `json:"BODY_DAMAGE"`
	MaxHealth    Opt[string] `json:"MAX_HEALTH"`
	BulletSpeed  Opt[string] `json:"BULLET_SPEED"`
	BulletHealth Opt[string] `json:"BULLET_HEALTH"`
	BulletPen    Opt[string] `json:"BULLET_PEN"`
	BulletDamage Opt[string] `json:"BULLET_DAMAGE"`
	Reload       Opt[string] `json:"RELOAD"`
	MoveSpeed    Opt[string] `json:"MOVE_SPEED"`
	ShieldRegen  Opt[string] `json:"SHIELD_REGEN"`
	ShieldCap    Opt[string] `json:"SHIELD_CAP"`
}

type StatScale struct {
	Damage   Opt[float64] `json:"damage"`
	Density  Opt[float64] `json:"density"`
	Health   Opt[float64] `json:"health"`
	MaxSpeed Opt[float64] `json:"maxSpeed"`
	Pen      Opt[float64] `json:"pen"`
	Range    Opt[float64] `json:"range"`
	Recoil   Opt[float64] `json:"recoil"`
	Reload   Opt[float64] `json:"reload"`
	Resist   Opt[float64] `json:"resist"`
	Size     Opt[float64] `json:"size"`
	Speed    Opt[float64] `json:"speed"`
}

type ShootSettings struct {
	Damage   Opt[float64] `json:"damage"`
	Density  Opt[float64] `json:"density"`
	Health   Opt[float64] `json:"health"`
	MaxSpeed Opt[float64] `json:"maxSpeed"`
	Pen      Opt[float64] `json:"pen"`
	Range    Opt[float64] `json:"range"`
	Recoil   Opt[float64] `json:"recoil"`
	Reload   Opt[float64] `json:"reload"`
	Resist   Opt[float64] `json:"resist"`
	Shudder  Opt[float64] `json:"shudder"`
	Size     Opt[float64] `json:"size"`
	Speed    Opt[float64] `json:"speed"`
	Spray    Opt[float64] `json:"spray"`
}

type GunPosition struct {
	FromArray bool         `json:"-"`
	Length    Opt[float64] `json:"LENGTH"`
	Width     Opt[float64] `json:"WIDTH"`
	Aspect    Opt[float64] `json:"ASPECT"`
	X         Opt[float64] `json:"X"`
	Y         Opt[float64] `json:"Y"`
	Angle     Opt[float64] `json:"ANGLE"`
	Delay     Opt[float64] `json:"DELAY"`
	Layer     Opt[float64] `json:"LAYER"`
	Height    Opt[float64] `json:"HEIGHT"`
}

func (p *GunPosition) UnmarshalJSON(b []byte) error {
	if isNull(b) || isUndefined(b) {
		return nil
	}
	if b[0] != '[' {
		type raw GunPosition
		return strictUnmarshal(b, (*raw)(p))
	}
	p.FromArray = true
	var vals []Opt[float64]
	if err := json.Unmarshal(b, &vals); err != nil {
		return err
	}
	slots := []*Opt[float64]{&p.Length, &p.Width, &p.Aspect, &p.X, &p.Y, &p.Angle, &p.Delay, &p.Layer}
	if len(vals) > len(slots) {
		return fmt.Errorf("gun POSITION array has %d entries, gun.js reads %d", len(vals), len(slots))
	}
	for i, v := range vals {
		*slots[i] = v
	}
	return nil
}

type Identifier struct {
	IsString bool
	Num      float64
	Str      string
}

func (i *Identifier) UnmarshalJSON(b []byte) error {
	if isNull(b) || isUndefined(b) {
		return nil
	}
	if b[0] == '"' {
		i.IsString = true
		return json.Unmarshal(b, &i.Str)
	}
	return json.Unmarshal(b, &i.Num)
}

type GunProperties struct {
	Alpha               Opt[float64]       `json:"ALPHA"`
	AltFire             Opt[bool]          `json:"ALT_FIRE"`
	Autofire            Opt[bool]          `json:"AUTOFIRE"`
	Borderless          Opt[bool]          `json:"BORDERLESS"`
	Color               ColorSpec          `json:"COLOR"`
	DelaySpawn          Opt[bool]          `json:"DELAY_SPAWN"`
	DestroyOldestChild  Opt[bool]          `json:"DESTROY_OLDEST_CHILD"`
	DrawAbove           Opt[bool]          `json:"DRAW_ABOVE"`
	DrawFill            Opt[bool]          `json:"DRAW_FILL"`
	FixedReload         Opt[bool]          `json:"FIXED_RELOAD"`
	Identifier          Opt[Identifier]    `json:"IDENTIFIER"`
	IndependentChildren Opt[bool]          `json:"INDEPENDENT_CHILDREN"`
	IndependentMaster   Opt[bool]          `json:"INDEPENDENT_MASTER"`
	Label               Opt[string]        `json:"LABEL"`
	MaxChildren         Opt[float64]       `json:"MAX_CHILDREN"`
	NegativeRecoil      Opt[bool]          `json:"NEGATIVE_RECOIL"`
	NoLimitations       Opt[bool]          `json:"NO_LIMITATIONS"`
	ShootOnDeath        Opt[bool]          `json:"SHOOT_ON_DEATH"`
	ShootSettings       Opt[ShootSettings] `json:"SHOOT_SETTINGS"`
	SpawnOffset         Opt[float64]       `json:"SPAWN_OFFSET"`
	StatCalculator      Opt[string]        `json:"STAT_CALCULATOR"`
	StrokeWidth         Opt[float64]       `json:"STROKE_WIDTH"`
	SyncsSkills         Opt[bool]          `json:"SYNCS_SKILLS"`
	Type                TypeList           `json:"TYPE"`
	WaitToCycle         Opt[bool]          `json:"WAIT_TO_CYCLE"`
}

type Gun struct {
	Position   GunPosition        `json:"POSITION"`
	Properties Opt[GunProperties] `json:"PROPERTIES"`
}

// Reproduces the JS bug. See docs/found-bugs.md #15.
type MountPosition struct {
	FromArray bool         `json:"-"`
	Size      Opt[float64] `json:"SIZE"`
	X         Opt[float64] `json:"X"`
	Y         Opt[float64] `json:"Y"`
	Angle     Opt[float64] `json:"ANGLE"`
	Arc       Opt[float64] `json:"ARC"`
	Layer     Opt[float64] `json:"LAYER"`
	Delay     Opt[float64] `json:"DELAY"`
	Unread    []float64    `json:"-"`
}

func (p *MountPosition) unmarshalMount(b []byte, slots []*Opt[float64]) error {
	if isNull(b) || isUndefined(b) {
		return nil
	}
	if b[0] != '[' {
		type raw MountPosition
		return strictUnmarshal(b, (*raw)(p))
	}
	p.FromArray = true
	var vals []Opt[float64]
	if err := json.Unmarshal(b, &vals); err != nil {
		return err
	}
	for i, v := range vals {
		if i >= len(slots) {
			p.Unread = append(p.Unread, v.Or(0))
			continue
		}
		*slots[i] = v
	}
	return nil
}

type TurretPosition struct{ MountPosition }

func (p *TurretPosition) UnmarshalJSON(b []byte) error {
	return p.unmarshalMount(b, []*Opt[float64]{&p.Size, &p.X, &p.Y, &p.Angle, &p.Arc, &p.Layer})
}

type PropPosition struct{ MountPosition }

func (p *PropPosition) UnmarshalJSON(b []byte) error {
	return p.unmarshalMount(b, []*Opt[float64]{&p.Size, &p.X, &p.Y, &p.Angle, &p.Layer})
}

// Turret is one TURRETS entry.
type Turret struct {
	Position    TurretPosition `json:"POSITION"`
	Type        TypeList       `json:"TYPE"`
	Vulnerable  Opt[bool]      `json:"VULNERABLE"`
	Independent Opt[bool]      `json:"INDEPENDENT"`
}

type Prop struct {
	Position   PropPosition `json:"POSITION"`
	Type       TypeList     `json:"TYPE"`
	Angle      Opt[float64] `json:"ANGLE"`
	ForceAngle Opt[bool]    `json:"FORCE_ANGLE"`
}

type EventHook struct {
	Event   string    `json:"event"`
	Handler Opt[Func] `json:"handler"`
	Once    Opt[bool] `json:"once"`
}

type ShakeSpec struct {
	CameraShake    Opt[ShakeDetail] `json:"CAMERA_SHAKE"`
	GUIShake       Opt[ShakeDetail] `json:"GUI_SHAKE"`
	Push           Opt[bool]        `json:"PUSH"`
	ApplyOnUpgrade Opt[bool]        `json:"APPLY_ON_UPGRADE"`
	ApplyOnShoot   Opt[bool]        `json:"APPLY_ON_SHOOT"`
}

// ShakeDetail is one shake channel.
type ShakeDetail struct {
	Duration  Opt[float64] `json:"DURATION"`
	Amount    Opt[float64] `json:"AMOUNT"`
	KeepShake Opt[bool]    `json:"KEEP_SHAKE"`
}

// FoodSpec is the FOOD block.
type FoodSpec struct {
	Level Opt[float64] `json:"LEVEL"`
}

// Definition

// Definition is one entry of the JS `Class` table, exactly as dumped. Every key in
// the dump has a field here, including the ones nothing reads: decoding rejects
// unknown keys, so a regenerated dump that grows a key fails the load rather than
// quietly dropping gameplay data.
//
// Fields marked "not in this dump" are read by entity.js:176 but have no occurrence
// in gen/definitions.json. They are modelled anyway, so the resolver is a complete
// port rather than a port of the subset today's data happens to exercise.
type Definition struct {
	Index Opt[float64] `json:"index"`

	Parent TypeList `json:"PARENT"`

	Name                    Opt[string]            `json:"NAME"`
	Label                   Opt[string]            `json:"LABEL"`
	DisplayName             Opt[bool]              `json:"DISPLAY_NAME"`
	DisplayScore            Opt[bool]              `json:"DISPLAY_SCORE"`
	Tooltip                 Opt[string]            `json:"TOOLTIP"`
	UpgradeLabel            Opt[string]            `json:"UPGRADE_LABEL"`
	UpgradeTooltip          Opt[string]            `json:"UPGRADE_TOOLTIP"`
	UpgradeColor            ColorSpec              `json:"UPGRADE_COLOR"`
	UpgradeM1               Opt[[]string]          `json:"UPGRADE_M1"`
	BranchLabel             Opt[string]            `json:"BRANCH_LABEL"` // not in this dump
	Type                    Opt[TypeField]         `json:"TYPE"`
	WallType                Opt[float64]           `json:"WALL_TYPE"`
	Layer                   Opt[float64]           `json:"LAYER"`
	Color                   ColorSpec              `json:"COLOR"`
	Shape                   Opt[ShapeSpec]         `json:"SHAPE"`
	ShapeNum                Opt[float64]           `json:"SHAPE_NUM"` // not in this dump
	Size                    Opt[float64]           `json:"SIZE"`
	Glow                    Opt[GlowSpec]          `json:"GLOW"`
	Alpha                   Opt[AlphaSpec]         `json:"ALPHA"`
	Invisible               Opt[[]float64]         `json:"INVISIBLE"`
	Borderless              Opt[bool]              `json:"BORDERLESS"`
	DrawFill                Opt[bool]              `json:"DRAW_FILL"`
	DrawSelf                Opt[bool]              `json:"DRAW_SELF"`
	DrawHealth              Opt[bool]              `json:"DRAW_HEALTH"`
	StrokeWidth             Opt[float64]           `json:"STROKE_WIDTH"`
	Shake                   Opt[[]ShakeSpec]       `json:"SHAKE"`
	Angle                   Opt[float64]           `json:"ANGLE"`
	StatNames               Opt[StatNames]         `json:"STAT_NAMES"`
	MotionType              Opt[BehaviourSpec]     `json:"MOTION_TYPE"`
	FacingType              Opt[BehaviourSpec]     `json:"FACING_TYPE"`
	Controllers             Opt[[]Controller]      `json:"CONTROLLERS"`
	AI                      Opt[AISettings]        `json:"AI"`
	IgnoredByAI             Opt[bool]              `json:"IGNORED_BY_AI"`
	Body                    Opt[BodySpec]          `json:"BODY"`
	Danger                  Opt[float64]           `json:"DANGER"`
	DamageClass             Opt[float64]           `json:"DAMAGE_CLASS"`
	HitsOwnType             Opt[string]            `json:"HITS_OWN_TYPE"`
	Intangible              Opt[bool]              `json:"INTANGIBLE"`
	IsSmasher               Opt[bool]              `json:"IS_SMASHER"`
	Healer                  Opt[bool]              `json:"HEALER"`
	HealingTank             Opt[bool]              `json:"HEALING_TANK"`
	BuffVsFood              Opt[bool]              `json:"BUFF_VS_FOOD"`
	HealthWithLevel         Opt[bool]              `json:"HEALTH_WITH_LEVEL"`
	Necro                   Opt[NecroSpec]         `json:"NECRO"`
	Guns                    Opt[[]Gun]             `json:"GUNS"`
	Turrets                 Opt[[]Turret]          `json:"TURRETS"`
	Props                   Opt[[]Prop]            `json:"PROPS"`
	GunStatScale            Opt[StatScale]         `json:"GUN_STAT_SCALE"`
	MaxChildren             Opt[float64]           `json:"MAX_CHILDREN"`
	MaxBullets              Opt[float64]           `json:"MAX_BULLETS"`
	ShootOnDeath            Opt[bool]              `json:"SHOOT_ON_DEATH"`
	SpawnOnDeath            Opt[string]            `json:"SPAWN_ON_DEATH"` // not in this dump
	ConnectChildrenOnCamera Opt[bool]              `json:"CONNECT_CHILDREN_ON_CAMERA"`
	ResetChildren           Opt[bool]              `json:"RESET_CHILDREN"`
	AltAbilities            Opt[[]string]          `json:"ALT_ABILITIES"` // not in this dump
	TickHandler             Opt[Func]              `json:"TICK_HANDLER"`
	Level                   Opt[float64]           `json:"LEVEL"`
	LevelCap                Opt[float64]           `json:"LEVEL_CAP"`
	Skill                   Opt[SkillSpec]         `json:"SKILL"`
	SkillCap                Opt[SkillSpec]         `json:"SKILL_CAP"`
	ExtraSkill              Opt[float64]           `json:"EXTRA_SKILL"`
	RecalcSkill             Opt[bool]              `json:"RECALC_SKILL"`   // not in this dump
	ResetUpgrades           Opt[bool]              `json:"RESET_UPGRADES"` // not in this dump
	ResetStats              Opt[bool]              `json:"RESET_STATS"`    // not in this dump
	ResetUpgradeMenu        Opt[bool]              `json:"RESET_UPGRADE_MENU"`
	BatchUpgrades           Opt[bool]              `json:"BATCH_UPGRADES"`
	RerootUpgradeTree       Opt[RerootSpec]        `json:"REROOT_UPGRADE_TREE"`
	Value                   Opt[float64]           `json:"VALUE"`
	DefineLevelSkill        Opt[Func]              `json:"defineLevelSkillPoints"`
	Upgrades                [10]Opt[[]UpgradeSlot] `json:"-"`
	AcceptsScore            Opt[bool]              `json:"ACCEPTS_SCORE"`
	ArenaCloser             Opt[bool]              `json:"ARENA_CLOSER"`
	AutospinMultiplier      Opt[float64]           `json:"AUTOSPIN_MULTIPLIER"` // not in this dump
	BroadcastMessage        Opt[string]            `json:"BROADCAST_MESSAGE"`
	CanBeOnLeaderboard      Opt[bool]              `json:"CAN_BE_ON_LEADERBOARD"`
	CanGoOutsideRoom        Opt[bool]              `json:"CAN_GO_OUTSIDE_ROOM"`
	CanSeeInvisible         Opt[bool]              `json:"CAN_SEE_INVISIBLE_ENTITIES"`
	ClearOnMasterUpgrade    Opt[bool]              `json:"CLEAR_ON_MASTER_UPGRADE"`
	CravesAttention         Opt[bool]              `json:"CRAVES_ATTENTION"`
	DamageEffects           Opt[bool]              `json:"DAMAGE_EFFECTS"`
	DefeatMessage           Opt[bool]              `json:"DEFEAT_MESSAGE"` // not in this dump
	DieAtLowSpeed           Opt[bool]              `json:"DIE_AT_LOW_SPEED"`
	DieAtRange              Opt[bool]              `json:"DIE_AT_RANGE"`
	FullInvisible           Opt[bool]              `json:"FULL_INVISIBLE"`
	GiveKillMessage         Opt[bool]              `json:"GIVE_KILL_MESSAGE"`
	HasNoRecoil             Opt[bool]              `json:"HAS_NO_RECOIL"`
	Independent             Opt[bool]              `json:"INDEPENDENT"`
	IsImmuneToTiles         Opt[bool]              `json:"IS_IMMUNE_TO_TILES"`
	KillMessage             Opt[string]            `json:"KILL_MESSAGE"` // not in this dump
	MotionEffects           Opt[bool]              `json:"MOTION_EFFECTS"`
	NoCollisions            Opt[bool]              `json:"NO_COLLISIONS"`
	NoSizeAnimation         Opt[bool]              `json:"NO_SIZE_ANIMATION"`
	Obstacle                Opt[bool]              `json:"OBSTACLE"`
	OnMinimap               Opt[bool]              `json:"ON_MINIMAP"`
	PersistsAfterDeath      Opt[bool]              `json:"PERSISTS_AFTER_DEATH"`
	RatEffects              Opt[bool]              `json:"RATEFFECTS"`
	RatioEffects            Opt[bool]              `json:"RATIO_EFFECTS"` // not in this dump; see docs/found-bugs.md #14
	RenderOnLeaderboard     Opt[bool]              `json:"RENDER_ON_LEADERBOARD"`
	ResetEvents             Opt[bool]              `json:"RESET_EVENTS"`
	SyncWithTank            Opt[bool]              `json:"SYNC_WITH_TANK"`
	Team                    Opt[float64]           `json:"TEAM"`
	VariesInSize            Opt[bool]              `json:"VARIES_IN_SIZE"`

	// Events.
	On Opt[[]EventHook] `json:"ON"`

	AlwaysActive          Opt[bool]     `json:"ALWAYS_ACTIVE"`
	ControlRange          Opt[float64]  `json:"CONTROL_RANGE"`
	Converted             Opt[bool]     `json:"Converted"`
	Food                  Opt[FoodSpec] `json:"FOOD"`
	HasNoMaster           Opt[bool]     `json:"HAS_NO_MASTER"`
	MirrorMasterAngle     Opt[bool]     `json:"MIRROR_MASTER_ANGLE"`
	ReverseTargetWithTank Opt[bool]     `json:"REVERSE_TARGET_WITH_TANK"`
	VisibleOnBlackout     Opt[bool]     `json:"VISIBLE_ON_BLACKOUT"`
}

type definitionFields Definition

type definitionJSON struct {
	definitionFields
	Tier0 Opt[[]UpgradeSlot] `json:"UPGRADES_TIER_0"`
	Tier1 Opt[[]UpgradeSlot] `json:"UPGRADES_TIER_1"`
	Tier2 Opt[[]UpgradeSlot] `json:"UPGRADES_TIER_2"`
	Tier3 Opt[[]UpgradeSlot] `json:"UPGRADES_TIER_3"`
	Tier4 Opt[[]UpgradeSlot] `json:"UPGRADES_TIER_4"`
	Tier5 Opt[[]UpgradeSlot] `json:"UPGRADES_TIER_5"`
	Tier6 Opt[[]UpgradeSlot] `json:"UPGRADES_TIER_6"`
	Tier7 Opt[[]UpgradeSlot] `json:"UPGRADES_TIER_7"`
	Tier8 Opt[[]UpgradeSlot] `json:"UPGRADES_TIER_8"`
	Tier9 Opt[[]UpgradeSlot] `json:"UPGRADES_TIER_9"`
}

func (d *Definition) UnmarshalJSON(b []byte) error {
	if isNull(b) || isUndefined(b) {
		return nil
	}
	var raw definitionJSON
	dec := json.NewDecoder(bytes.NewReader(b))
	dec.DisallowUnknownFields()
	if err := dec.Decode(&raw); err != nil {
		return err
	}
	*d = Definition(raw.definitionFields)
	d.Upgrades = [10]Opt[[]UpgradeSlot]{
		raw.Tier0, raw.Tier1, raw.Tier2, raw.Tier3, raw.Tier4,
		raw.Tier5, raw.Tier6, raw.Tier7, raw.Tier8, raw.Tier9,
	}
	return nil
}

type Set struct {
	byName  map[string]*Definition
	byIndex []*Definition
	names   []string // ordinal -> name, the classMap the JS builds at combined.js:44
}

func (s *Set) Len() int { return len(s.byIndex) }

func (s *Set) Get(name string) (*Definition, bool) {
	d, ok := s.byName[name]
	return d, ok
}

func (s *Set) At(index int) (*Definition, bool) {
	if index < 0 || index >= len(s.byIndex) {
		return nil, false
	}
	return s.byIndex[index], true
}

func (s *Set) NameAt(index int) (string, bool) {
	if index < 0 || index >= len(s.names) {
		return "", false
	}
	return s.names[index], true
}

func (s *Set) Names() []string { return s.names }

// FunctionSite is one place a JS closure survives in the table.
type FunctionSite struct {
	Definition string // the top-level name that owns it
	Func       Func
}

func (s *Set) FunctionSites() []FunctionSite {
	var out []FunctionSite
	for _, name := range s.names {
		collectFuncs(s.byName[name], name, &out)
	}
	return out
}

func collectFuncs(d *Definition, owner string, out *[]FunctionSite) {
	if d == nil {
		return
	}
	if f, ok := d.DefineLevelSkill.Get(); ok {
		*out = append(*out, FunctionSite{owner, f})
	}
	if f, ok := d.TickHandler.Get(); ok {
		*out = append(*out, FunctionSite{owner, f})
	}
	if hooks, ok := d.On.Get(); ok {
		for _, h := range hooks {
			if f, ok := h.Handler.Get(); ok {
				*out = append(*out, FunctionSite{owner, f})
			}
		}
	}
	// Inline definitions nested in gun, turret and prop TYPE lists own handlers too.
	// serverPortal alone hides 60 of them there.
	if guns, ok := d.Guns.Get(); ok {
		for i := range guns {
			if p, ok := guns[i].Properties.Get(); ok {
				collectInline(p.Type, owner, out)
			}
		}
	}
	if turrets, ok := d.Turrets.Get(); ok {
		for i := range turrets {
			collectInline(turrets[i].Type, owner, out)
		}
	}
	if props, ok := d.Props.Get(); ok {
		for i := range props {
			collectInline(props[i].Type, owner, out)
		}
	}
}

func collectInline(list TypeList, owner string, out *[]FunctionSite) {
	for i := range list {
		if list[i].Inline != nil {
			collectFuncs(list[i].Inline, owner, out)
		}
	}
}

// Loading

type document struct {
	definitions map[string]*Definition
	count       int
}

func Load(rng *jsutil.Rand) (*Set, error) {
	raw, err := embedded.ReadFile(embeddedPath)
	if err != nil {
		return nil, fmt.Errorf("defs: opening embedded definitions: %w", err)
	}
	return loadBytes(raw, rng)
}

func LoadPath(path string, rng *jsutil.Rand) (*Set, error) {
	f, err := os.Open(path)
	if err != nil {
		return nil, fmt.Errorf("defs: %w", err)
	}
	defer f.Close()
	return LoadReader(f, rng)
}

func LoadReader(r io.Reader, rng *jsutil.Rand) (*Set, error) {
	raw, err := io.ReadAll(r)
	if err != nil {
		return nil, fmt.Errorf("defs: reading definitions: %w", err)
	}
	return loadBytes(raw, rng)
}

func loadBytes(raw []byte, rng *jsutil.Rand) (*Set, error) {
	if rng == nil {
		return nil, fmt.Errorf("defs: a *jsutil.Rand is required (docs/architecture.md, \"Randomness must be injectable\")")
	}
	doc, err := decodeDocument(raw)
	if err != nil {
		return nil, err
	}
	s, err := newSet(doc)
	if err != nil {
		return nil, err
	}
	if err := s.checkParents(); err != nil {
		return nil, err
	}
	if err := s.rerollServerPortal(rng); err != nil {
		return nil, err
	}
	burnRelicKeyDraws(rng)
	return s, nil
}

const makeRelicCalls = 77

func burnRelicKeyDraws(rng *jsutil.Rand) {
	for i := 0; i < makeRelicCalls; i++ {
		rng.Random(1) // facilitators.js:1337
		rng.Random(1) // facilitators.js:1338
	}
}

func decodeDocument(raw []byte) (document, error) {
	var top struct {
		Definitions json.RawMessage `json:"definitions"`
		Meta        json.RawMessage `json:"meta"`
	}
	if err := json.Unmarshal(raw, &top); err != nil {
		return document{}, fmt.Errorf("defs: parsing document: %w", err)
	}
	if len(top.Definitions) == 0 {
		return document{}, fmt.Errorf("defs: document has no \"definitions\" key")
	}
	var doc document
	if err := json.Unmarshal(top.Definitions, &doc.definitions); err != nil {
		return document{}, fmt.Errorf("defs: parsing definitions: %w", err)
	}
	if len(top.Meta) > 0 {
		var m struct {
			DefinitionCount int `json:"definitionCount"`
		}
		if err := json.Unmarshal(top.Meta, &m); err != nil {
			return document{}, fmt.Errorf("defs: parsing meta: %w", err)
		}
		doc.count = m.DefinitionCount
	}
	return doc, nil
}

func newSet(doc document) (*Set, error) {
	n := len(doc.definitions)
	if doc.count != 0 && doc.count != n {
		return nil, fmt.Errorf("defs: meta says %d definitions, found %d", doc.count, n)
	}
	s := &Set{
		byName:  doc.definitions,
		byIndex: make([]*Definition, n),
		names:   make([]string, n),
	}
	for name, d := range doc.definitions {
		idx, ok := d.Index.Get()
		if !ok {
			return nil, fmt.Errorf("defs: %q has no index; ordinals are a wire contract and cannot be derived", name)
		}
		i := int(idx)
		if float64(i) != idx {
			return nil, fmt.Errorf("defs: %q has a non-integer index %v", name, idx)
		}
		if i < 0 || i >= n {
			return nil, fmt.Errorf("defs: %q has index %d, outside 0..%d", name, i, n-1)
		}
		if s.byIndex[i] != nil {
			return nil, fmt.Errorf("defs: index %d is claimed by both %q and %q", i, s.names[i], name)
		}
		s.byIndex[i] = d
		s.names[i] = name
	}
	return s, nil
}

func (s *Set) checkParents() error {
	const (
		unvisited = iota
		onStack
		done
	)
	state := make(map[*Definition]int, len(s.byName))
	var stack []string

	var walk func(name string, d *Definition) error
	walk = func(name string, d *Definition) error {
		switch state[d] {
		case done:
			return nil
		case onStack:
			return fmt.Errorf("defs: PARENT cycle: %v -> %s", stack, name)
		}
		state[d] = onStack
		stack = append(stack, name)
		for _, ref := range d.Parent {
			next, nextName, err := s.deref(ref, name)
			if err != nil {
				return err
			}
			if err := walk(nextName, next); err != nil {
				return err
			}
		}
		stack = stack[:len(stack)-1]
		state[d] = done
		return nil
	}

	for _, name := range s.names {
		if err := walk(name, s.byName[name]); err != nil {
			return err
		}
	}
	return nil
}

func (s *Set) deref(ref TypeRef, from string) (*Definition, string, error) {
	if ref.Inline != nil {
		return ref.Inline, from + " (inline)", nil
	}
	d, ok := s.byName[ref.Name]
	if !ok {
		return nil, "", fmt.Errorf("defs: %q references definition %q, which does not exist", from, ref.Name)
	}
	return d, ref.Name, nil
}

func (s *Set) rerollServerPortal(rng *jsutil.Rand) error {
	d, ok := s.byName["serverPortal"]
	if !ok {
		return nil // a fixture without it is fine
	}
	guns, ok := d.Guns.Get()
	if !ok {
		return fmt.Errorf("defs: serverPortal has no GUNS")
	}
	found := 0
	for i := range guns {
		p := &guns[i].Position
		if !p.FromArray || p.Length.Or(0) != 2 || p.Width.Or(0) != 8 || p.Aspect.Or(0) != 1 ||
			p.X.Or(0) != -150 || p.Y.Or(-1) != 0 || !p.Delay.IsSet() {
			continue
		}
		if want := 360.0 / serverPortalGuns * float64(found); p.Angle.Or(-1) != want {
			return fmt.Errorf("defs: serverPortal generated gun %d has angle %v, expected %v", found, p.Angle.Or(-1), want)
		}
		p.Delay = Some(spawnDelay(rng))
		found++
	}
	if found != serverPortalGuns {
		return fmt.Errorf("defs: serverPortal has %d generated guns, expected %d", found, serverPortalGuns)
	}
	return nil
}

func spawnDelay(rng *jsutil.Rand) float64 {
	d := rng.Random(252)
	if d < 20 {
		d = rng.Random(4)
	}
	return d
}
