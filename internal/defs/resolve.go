package defs

import (
	"fmt"
	"math"
	"strings"

	"arrasgo/internal/jsutil"
)

const maxDepth = 64

var SkillOrder = [10]string{
	"RELOAD", "PENETRATION", "BULLET_HEALTH", "BULLET_DAMAGE", "BULLET_SPEED",
	"SHIELD_CAPACITY", "BODY_DAMAGE", "MAX_HEALTH", "SHIELD_REGENERATION", "MOVEMENT_SPEED",
}

// ColorState is color.js's Color.
type ColorState struct {
	Base                  ColorValue
	HueShift              float64
	SaturationShift       float64
	BrightnessShift       float64
	AllowBrightnessInvert bool

	Touched bool
}

func newColorState(base float64) ColorState {
	return ColorState{
		Base:            ColorValue{Num: base, set: true},
		SaturationShift: 1,
	}
}

func (c *ColorState) Interpret(spec ColorSpec) {
	switch spec.Kind {
	case ColorNumber:
		c.Base = ColorValue{Num: spec.Num, set: true}
		c.Touched = true
	case ColorString:
		if !strings.Contains(spec.Str, " ") {
			c.Base = ColorValue{IsString: true, Str: spec.Str, set: true}
			c.Touched = true
			return
		}
		parts := strings.Split(spec.Str, " ")
		c.Base = ColorValue{IsString: true, Str: parts[0], set: true}
		c.HueShift = parseFloatAt(parts, 1)
		c.SaturationShift = parseFloatAt(parts, 2)
		c.BrightnessShift = parseFloatAt(parts, 3)
		c.AllowBrightnessInvert = len(parts) > 4 && parts[4] == "true"
		c.Touched = true
	case ColorObject:
		if spec.Obj.Base.IsSet() {
			c.Base = spec.Obj.Base
		}
		c.HueShift = spec.Obj.HueShift.Or(c.HueShift)
		c.SaturationShift = spec.Obj.SaturationShift.Or(c.SaturationShift)
		c.BrightnessShift = spec.Obj.BrightnessShift.Or(c.BrightnessShift)
		c.AllowBrightnessInvert = spec.Obj.AllowBrightnessInvert.Or(c.AllowBrightnessInvert)
		c.Touched = true
	}
}

func (c ColorState) Compiled() string {
	invert := "false"
	if c.AllowBrightnessInvert {
		invert = "true"
	}
	return c.Base.String() + " " + numberToString(c.HueShift) + " " +
		numberToString(c.SaturationShift) + " " + numberToString(c.BrightnessShift) + " " + invert
}

func parseFloatAt(parts []string, i int) float64 {
	if i >= len(parts) {
		return math.NaN()
	}
	return jsParseFloat(parts[i])
}

func jsParseFloat(s string) float64 {
	s = strings.TrimSpace(s)
	end := 0
	seenDigit, seenDot, seenExp := false, false, false
	for i := 0; i < len(s); i++ {
		ch := s[i]
		switch {
		case ch >= '0' && ch <= '9':
			seenDigit = true
		case (ch == '+' || ch == '-') && (i == 0 || s[i-1] == 'e' || s[i-1] == 'E'):
		case ch == '.' && !seenDot && !seenExp:
			seenDot = true
		case (ch == 'e' || ch == 'E') && seenDigit && !seenExp:
			seenExp = true
		default:
			goto done
		}
		end = i + 1
	}
done:
	if !seenDigit {
		return math.NaN()
	}
	var v float64
	if _, err := fmt.Sscanf(s[:end], "%g", &v); err != nil {
		return math.NaN()
	}
	return v
}

type Glow struct {
	Radius    Opt[float64] // absent is the entity's initial `radius: null`
	Color     ColorState
	Alpha     float64
	Recursion float64
}

type SkillNames struct {
	BodyDamage   string
	MaxHealth    string
	BulletSpeed  string
	BulletHealth string
	BulletPen    string
	BulletDamage string
	Reload       string
	MoveSpeed    string
	ShieldRegen  string
	ShieldCap    string
}

type BodyStats struct {
	Acceleration     Opt[float64]
	Speed            Opt[float64]
	Health           Opt[float64]
	Resist           Opt[float64]
	Shield           Opt[float64]
	Regen            Opt[float64]
	Damage           Opt[float64]
	Penetration      Opt[float64]
	Range            Opt[float64]
	FOV              Opt[float64]
	ShockAbsorb      Opt[float64]
	RecoilMultiplier Opt[float64]
	Density          Opt[float64]
	Stealth          Opt[float64]
	Pushability      Opt[float64]
	Knockback        Opt[float64]
	Hetero           Opt[float64]
}

type Settings struct {
	NoCollisions            Opt[bool]
	DrawHealth              Opt[bool]
	DrawShape               Opt[bool]
	DamageEffects           Opt[bool]
	RatioEffects            Opt[bool]
	MotionEffects           Opt[bool]
	AcceptsScore            Opt[bool]
	GivesKillMessage        Opt[bool]
	CanGoOutsideRoom        Opt[bool]
	HitsOwnType             Opt[string]
	DiesAtLowSpeed          Opt[bool]
	DiesAtRange             Opt[bool]
	Independent             Opt[bool]
	PersistsAfterDeath      Opt[bool]
	ClearOnMasterUpgrade    Opt[bool]
	HealthWithLevel         Opt[bool]
	Obstacle                Opt[bool]
	FullyInvisible          Opt[bool]
	CanSeeInvisible         Opt[bool]
	HasNoRecoil             Opt[bool]
	AttentionCraver         Opt[bool]
	KillMessage             Opt[string]
	BroadcastMessage        Opt[string]
	DefeatMessage           Opt[bool]
	DamageClass             Opt[float64]
	BuffVsFood              Opt[bool]
	Leaderboardable         Opt[bool]
	RenderOnLeaderboard     Opt[bool]
	ReloadToAcceleration    Opt[bool]
	SkillNames              Opt[SkillNames]
	VariesInSize            Opt[bool]
	NoSizeAnimation         Opt[bool]
	ConnectChildrenOnCamera Opt[bool]
	NecroTypes              Opt[[]float64]
	ShakeProperties         Opt[[]ShakeSpec]
	MirrorMasterAngle       Opt[bool]
}

type UpgradeEntry struct {
	Classes     TypeList
	Index       string
	Tier        int
	Branch      int
	BranchLabel Opt[string]
	RedefineAll bool
}

type ResolvedTurret struct {
	Position      TurretPosition
	Type          TypeList
	Resolved      *Resolved
	CollidingBond Opt[bool] // entity.js:481, from TURRETS[].VULNERABLE
}

type ResolvedProp struct {
	Position PropPosition
	Type     TypeList
	Resolved *Resolved
}

type Resolved struct {
	Name string // the definition this was resolved from, for diagnostics

	Index        Opt[string]
	EntityName   Opt[string]
	Label        Opt[string]
	DisplayName  Opt[bool]
	Type         Opt[TypeField]
	WallType     Opt[float64]
	LayerID      Opt[float64]
	Angle        Opt[float64]
	BranchLabel  Opt[string]
	UpgradeColor Opt[string]

	Shape      Opt[float64]
	ShapeData  Opt[ShapeSpec]
	Color      ColorState
	Glow       Opt[Glow]
	Alpha      float64
	AlphaRange [2]float64
	Invisible  [2]float64
	Borderless Opt[bool]
	DrawFill   Opt[bool]

	MotionType       Opt[BehaviourSpec]
	FacingType       Opt[BehaviourSpec]
	Controllers      []Controller
	Steps            []DefineStep
	AISettings       Opt[AISettings]
	IgnoredByAI      Opt[bool]
	AllowedOnMinimap Opt[bool]

	Body          BodyStats
	DangerValue   Opt[float64]
	Intangibility Opt[bool]
	Healer        Opt[bool]
	ImmuneToTiles Opt[bool]
	AutospinBoost Opt[float64]
	Team          Opt[float64]

	Size     Opt[float64]
	CoreSize Opt[float64]
	Squiggle float64

	// Guns is from the resolved def, read only.
	Guns              Opt[[]Gun]
	Turrets           Opt[[]ResolvedTurret]
	Props             []ResolvedProp
	GunStatScale      Opt[StatScale]
	MaxChildren       Opt[float64]
	MaxBullets        Opt[float64]
	ShootOnDeath      Opt[bool]
	SpawnOnDeath      Opt[string]
	Level             Opt[float64]
	LevelCap          Opt[float64]
	SkillCaps         Opt[[10]float64]
	Skills            Opt[[10]float64]
	ExtraSkill        float64
	RecalcSkill       Opt[bool]
	Score             Opt[float64]
	LevelSkillPoints  Opt[Func]
	Upgrades          []UpgradeEntry
	BatchUpgrades     Opt[bool]
	IsArenaCloser     Opt[bool]
	RerootUpgradeTree Opt[string]
	Abilities         Opt[[]string]
	Events            []EventHook
	SyncWithTank      bool
	Settings          Settings
	Funcs             []Func
}

type Resolver struct {
	set           *Set
	rng           *jsutil.Rand
	deferSquiggle bool
}

func (r *Resolver) DeferSquiggle(v bool) { r.deferSquiggle = v }

func (r *Resolver) Set() *Set { return r.set }

func NewResolver(s *Set, rng *jsutil.Rand) (*Resolver, error) {
	if s == nil {
		return nil, fmt.Errorf("defs: nil definition set")
	}
	if rng == nil {
		return nil, fmt.Errorf("defs: a *jsutil.Rand is required (docs/architecture.md, \"Randomness must be injectable\")")
	}
	return &Resolver{set: s, rng: rng}, nil
}

func (r *Resolver) Resolve(name string) (*Resolved, error) {
	d, ok := r.set.Get(name)
	if !ok {
		return nil, fmt.Errorf("defs: definition %q does not exist", name)
	}
	return r.ResolveDefs(TypeList{{Name: name}}, d)
}

func (r *Resolver) ResolveDefs(defs TypeList, primary *Definition) (*Resolved, error) {
	if len(defs) == 0 {
		return nil, fmt.Errorf("defs: empty defs list")
	}
	name := defs[0].Name
	if primary == nil {
		var err error
		primary, name, err = r.set.deref(defs[0], "<defs[0]>")
		if err != nil {
			return nil, err
		}
	}
	res := newResolved(name)
	st := &walkState{}
	if err := r.define(res, primary, name, st); err != nil {
		return nil, err
	}
	for branch := 1; branch < len(defs); branch++ {
		d, bname, err := r.set.deref(defs[branch], name)
		if err != nil {
			return nil, err
		}
		if err := r.defineSplit(res, d, bname, branch, st); err != nil {
			return nil, err
		}
	}
	return res, nil
}

func newResolved(name string) *Resolved {
	return &Resolved{
		Name:       name,
		Color:      newColorState(16),
		Alpha:      1,
		AlphaRange: [2]float64{0, 1},
		Invisible:  [2]float64{0, 0},
		Squiggle:   1,
	}
}

type walkState struct {
	stack []*Definition
	names []string
	depth int
}

func (s *walkState) push(d *Definition, name string) error {
	for i, on := range s.stack {
		if on == d {
			return fmt.Errorf("defs: PARENT cycle: %s -> %s", strings.Join(s.names[i:], " -> "), name)
		}
	}
	if s.depth >= maxDepth {
		return fmt.Errorf("defs: PARENT chain deeper than %d at %s", maxDepth, name)
	}
	s.stack = append(s.stack, d)
	s.names = append(s.names, name)
	s.depth++
	return nil
}

func (s *walkState) pop() {
	s.stack = s.stack[:len(s.stack)-1]
	s.names = s.names[:len(s.names)-1]
	s.depth--
}

func (r *Resolver) define(res *Resolved, set *Definition, name string, st *walkState) error {
	if err := st.push(set, name); err != nil {
		return err
	}
	defer st.pop()
	// Props cleared at every level. defineSplit builds props. See docs/found-bugs.md #11.
	res.Props = nil

	for _, ref := range set.Parent {
		parent, pname, err := r.set.deref(ref, name)
		if err != nil {
			return err
		}
		if err := r.define(res, parent, pname, st); err != nil {
			return err
		}
	}

	if v, ok := set.Layer.Get(); ok {
		res.LayerID = Some(v)
	}
	if v, ok := set.Index.Get(); ok {
		res.Index = Some(numberToString(v))
	}
	if v, ok := set.Name.Get(); ok {
		res.EntityName = Some(v)
	}
	if v, ok := set.Label.Get(); ok {
		res.Label = Some(v)
	}
	if v, ok := set.Angle.Get(); ok {
		res.Angle = Some(v)
	}
	if v, ok := set.DisplayName.Get(); ok {
		res.DisplayName = Some(v)
	}
	if v, ok := set.Type.Get(); ok {
		res.Type = Some(v)
	}
	if v, ok := set.WallType.Get(); ok {
		res.WallType = Some(v)
	}
	if v, ok := set.Shape.Get(); ok {
		if v.IsNumber {
			res.Shape = Some(v.Num)
		} else {
			res.Shape = Some(set.ShapeNum.Or(0))
		}
		res.ShapeData = Some(v)
	}
	if set.Color.Kind != ColorNone {
		res.Color.Interpret(set.Color)
	}
	if colorTruthy(set.UpgradeColor) {
		c := newColorState(-1)
		c.Interpret(set.UpgradeColor)
		res.UpgradeColor = Some(c.Compiled())
	}
	if g, ok := set.Glow.Get(); ok {
		gc := newColorState(-1)
		gc.Interpret(g.Color)
		res.Glow = Some(Glow{
			Radius:    Some(g.Radius.Or(0)),
			Color:     gc,
			Alpha:     g.Alpha.Or(1),
			Recursion: g.Recursion.Or(1),
		})
	}
	if list, ok := set.Controllers.Get(); ok {
		res.addControllers(list)
	}
	if v, ok := set.IgnoredByAI.Get(); ok {
		res.IgnoredByAI = Some(v)
	}
	if v, ok := set.MotionType.Get(); ok {
		res.MotionType = Some(v)
	}
	if v, ok := set.FacingType.Get(); ok {
		res.FacingType = Some(v)
	}
	if v, ok := set.NoCollisions.Get(); ok && v {
		res.Settings.NoCollisions = Some(v)
	}
	setOpt(&res.Settings.DrawHealth, set.DrawHealth)
	setOpt(&res.Settings.DrawShape, set.DrawSelf)
	setOpt(&res.Settings.DamageEffects, set.DamageEffects)
	// RATIO_EFFECTS not RATEFFECTS. See docs/found-bugs.md #14.
	setOpt(&res.Settings.RatioEffects, set.RatioEffects)
	setOpt(&res.Settings.MotionEffects, set.MotionEffects)
	setOpt(&res.Settings.AcceptsScore, set.AcceptsScore)
	setOpt(&res.Settings.GivesKillMessage, set.GiveKillMessage)
	setOpt(&res.Settings.CanGoOutsideRoom, set.CanGoOutsideRoom)
	setOpt(&res.Settings.HitsOwnType, set.HitsOwnType)
	setOpt(&res.Settings.DiesAtLowSpeed, set.DieAtLowSpeed)
	setOpt(&res.Settings.DiesAtRange, set.DieAtRange)
	setOpt(&res.Settings.Independent, set.Independent)
	setOpt(&res.Settings.PersistsAfterDeath, set.PersistsAfterDeath)
	setOpt(&res.Settings.ClearOnMasterUpgrade, set.ClearOnMasterUpgrade)
	setOpt(&res.Settings.HealthWithLevel, set.HealthWithLevel)
	setOpt(&res.Settings.Obstacle, set.Obstacle)
	setOpt(&res.Settings.FullyInvisible, set.FullInvisible)
	setOpt(&res.Settings.CanSeeInvisible, set.CanSeeInvisible)
	setOpt(&res.Settings.HasNoRecoil, set.HasNoRecoil)
	setOpt(&res.Settings.AttentionCraver, set.CravesAttention)
	if v, ok := set.KillMessage.Get(); ok {
		if v == "" {
			v = "Killed"
		}
		res.Settings.KillMessage = Some(v)
	}
	if v, ok := set.AutospinMultiplier.Get(); ok {
		res.AutospinBoost = Some(v)
	}
	if v, ok := set.BroadcastMessage.Get(); ok {
		if v == "" {
			res.Settings.BroadcastMessage = Opt[string]{}
		} else {
			res.Settings.BroadcastMessage = Some(v)
		}
	}
	if v, ok := set.DefeatMessage.Get(); ok && v {
		res.Settings.DefeatMessage = Some(true)
	}
	if v, ok := set.Healer.Get(); ok && v {
		res.Healer = Some(true)
	}
	setOpt(&res.Settings.DamageClass, set.DamageClass)
	setOpt(&res.Settings.BuffVsFood, set.BuffVsFood)
	setOpt(&res.Settings.Leaderboardable, set.CanBeOnLeaderboard)
	setOpt(&res.Settings.RenderOnLeaderboard, set.RenderOnLeaderboard)
	setOpt(&res.Intangibility, set.Intangible)
	setOpt(&res.Settings.ReloadToAcceleration, set.IsSmasher)
	if v, ok := set.StatNames.Get(); ok {
		res.Settings.SkillNames = Some(SkillNames{
			BodyDamage:   v.BodyDamage.Or("Body Damage"),
			MaxHealth:    v.MaxHealth.Or("Max Health"),
			BulletSpeed:  v.BulletSpeed.Or("Bullet Speed"),
			BulletHealth: v.BulletHealth.Or("Bullet Health"),
			BulletPen:    v.BulletPen.Or("Bullet Penetration"),
			BulletDamage: v.BulletDamage.Or("Bullet Damage"),
			Reload:       v.Reload.Or("Reload"),
			MoveSpeed:    v.MoveSpeed.Or("Movement Speed"),
			ShieldRegen:  v.ShieldRegen.Or("Shield Regeneration"),
			ShieldCap:    v.ShieldCap.Or("Shield Capacity"),
		})
	}
	if v, ok := set.AI.Get(); ok {
		res.AISettings = Some(v)
	}
	if v, ok := set.Invisible.Get(); ok {
		res.Invisible = pair(v)
	}
	if v, ok := set.Alpha.Get(); ok {
		if v.IsRange {
			res.Alpha = at(v.Range, 1)
			res.AlphaRange = [2]float64{orZero(at(v.Range, 0), 0), orZero(at(v.Range, 1), 1)}
		} else {
			res.Alpha = v.Num
			res.AlphaRange = [2]float64{0, 1}
		}
	}
	setOpt(&res.DangerValue, set.Danger)
	setOpt(&res.ShootOnDeath, set.ShootOnDeath)
	setOpt(&res.Borderless, set.Borderless)
	setOpt(&res.DrawFill, set.DrawFill)
	if v, ok := set.IsImmuneToTiles.Get(); ok && v {
		res.ImmuneToTiles = Some(true)
	}
	setOpt(&res.Team, set.Team)
	if v, ok := set.VariesInSize.Get(); ok {
		res.Settings.VariesInSize = Some(v)
		res.Steps = append(res.Steps, DefineStep{Kind: StepSquiggle, Varies: v})
		if !r.deferSquiggle {
			if v {
				res.Squiggle = r.rng.RandomRange(0.8, 1.2)
			} else {
				res.Squiggle = 1
			}
		}
	}
	if set.ResetUpgrades.Or(false) || set.ResetStats.Or(false) {
		res.Upgrades = nil
		res.IsArenaCloser = Some(false)
		res.Alpha = 1
		res.Controllers = nil
		res.Steps = append(res.Steps, DefineStep{Kind: StepResetControllers})
	}
	if set.ResetUpgradeMenu.Or(false) {
		res.Upgrades = nil
	}
	if v, ok := set.ArenaCloser.Get(); ok {
		res.IsArenaCloser = Some(v)
	}
	if v, ok := set.BranchLabel.Get(); ok {
		res.BranchLabel = Some(v)
	}
	if v, ok := set.BatchUpgrades.Get(); ok {
		res.BatchUpgrades = Some(v)
	}
	if err := r.addUpgrades(res, set, name, 0); err != nil {
		return err
	}
	if v, ok := set.Size.Get(); ok {
		res.Size = Some(v * res.Squiggle)
		if !res.CoreSize.IsSet() {
			res.CoreSize = res.Size
		}
		res.Steps = append(res.Steps, DefineStep{Kind: StepSize, Raw: v})
	}
	setOpt(&res.Settings.NoSizeAnimation, set.NoSizeAnimation)
	setOpt(&res.Level, set.Level)
	setOpt(&res.LevelCap, set.LevelCap)
	if v, ok := set.SkillCap.Get(); ok {
		caps, err := skillSlots(v, 9, "SKILL_CAP")
		if err != nil {
			return fmt.Errorf("%s: %w", name, err)
		}
		res.SkillCaps = Some(caps)
	}
	if v, ok := set.Skill.Get(); ok {
		skills, err := skillSlots(v, 0, "SKILL")
		if err != nil {
			return fmt.Errorf("%s: %w", name, err)
		}
		res.Skills = Some(skills)
	}
	if v, ok := set.Value.Get(); ok {
		res.Score = Some(math.Max(res.Score.Or(0), v*res.Squiggle))
		res.Steps = append(res.Steps, DefineStep{Kind: StepScore, Raw: v})
	}
	if v, ok := set.AltAbilities.Get(); ok {
		res.Abilities = Some(v)
	}
	if v, ok := set.Guns.Get(); ok {
		res.Guns = Some(v)
		res.Steps = append(res.Steps, DefineStep{Kind: StepGuns, Guns: v})
	}
	if v, ok := set.ConnectChildrenOnCamera.Get(); ok && v {
		res.Settings.ConnectChildrenOnCamera = Some(true)
	}
	if v, ok := set.GunStatScale.Get(); ok {
		res.GunStatScale = Some(v)
	}
	setOpt(&res.MaxChildren, set.MaxChildren)
	setOpt(&res.MaxBullets, set.MaxBullets)
	if f, ok := set.DefineLevelSkill.Get(); ok {
		res.LevelSkillPoints = Some(f)
		res.Funcs = append(res.Funcs, f)
	}
	setOpt(&res.RecalcSkill, set.RecalcSkill)
	if v, ok := set.ExtraSkill.Get(); ok {
		res.ExtraSkill += v
	}
	if v, ok := set.Body.Get(); ok {
		setOpt(&res.Body.Acceleration, v.Acceleration)
		setOpt(&res.Body.Speed, v.Speed)
		setOpt(&res.Body.Health, v.Health)
		setOpt(&res.Body.Resist, v.Resist)
		setOpt(&res.Body.Shield, v.Shield)
		setOpt(&res.Body.Regen, v.Regen)
		setOpt(&res.Body.Damage, v.Damage)
		setOpt(&res.Body.Penetration, v.Penetration)
		setOpt(&res.Body.Range, v.Range)
		setOpt(&res.Body.FOV, v.FOV)
		setOpt(&res.Body.ShockAbsorb, v.ShockAbsorb)
		setOpt(&res.Body.RecoilMultiplier, v.RecoilMultiplier)
		setOpt(&res.Body.Density, v.Density)
		setOpt(&res.Body.Stealth, v.Stealth)
		setOpt(&res.Body.Pushability, v.Pushability)
		setOpt(&res.Body.Knockback, v.Knockback)
		setOpt(&res.Body.Hetero, v.Hetero)
	}
	if v, ok := set.SpawnOnDeath.Get(); ok && v != "" {
		res.SpawnOnDeath = Some(v)
	}
	if set.ResetEvents.Or(false) {
		res.Events = nil
	}
	if v, ok := set.RerootUpgradeTree.Get(); ok && rerootTruthy(v) {
		if v.IsList {
			res.RerootUpgradeTree = Some(joinRoots(v.List))
		} else {
			res.RerootUpgradeTree = Some(v.Str)
		}
	}
	setOpt(&res.AllowedOnMinimap, set.OnMinimap)
	if list, ok := set.Turrets.Get(); ok {
		turrets, err := r.resolveTurrets(list, name, res, st)
		if err != nil {
			return err
		}
		res.Turrets = Some(turrets)
		res.Steps = append(res.Steps, DefineStep{Kind: StepTurrets, Turrets: turrets})
	}
	if hooks, ok := set.On.Get(); ok {
		for _, h := range hooks {
			f, ok := h.Handler.Get()
			if !ok {
				return nil
			}
			res.Events = append(res.Events, h)
			res.Funcs = append(res.Funcs, f)
		}
	}
	if v, ok := set.Shake.Get(); ok {
		res.Settings.ShakeProperties = Some(v)
	}
	if v, ok := set.Necro.Get(); ok {
		switch {
		case v.IsList:
			res.Settings.NecroTypes = Some(v.Shapes)
		case v.Bool:
			res.Settings.NecroTypes = Some([]float64{res.Shape.Or(0)})
		default:
			res.Settings.NecroTypes = Some([]float64{})
		}
	}
	res.SyncWithTank = set.SyncWithTank.Or(false)
	return nil
}

func (r *Resolver) defineSplit(res *Resolved, set *Definition, name string, branch int, st *walkState) error {
	if err := st.push(set, name); err != nil {
		return err
	}
	defer st.pop()

	if v, ok := set.Index.Get(); ok {
		res.Index = Some(res.Index.Or("") + "-" + numberToString(v))
	}
	for _, ref := range set.Parent {
		parent, _, err := r.set.deref(ref, name)
		if err != nil {
			return err
		}
		res.BranchLabel = parent.BranchLabel
	}
	if v, ok := set.Label.Get(); ok && v != "" {
		res.Label = Some(res.Label.Or("") + "-" + v)
	}
	if v, ok := set.MaxChildren.Get(); ok {
		res.MaxChildren = Some(res.MaxChildren.Or(math.NaN()) + v)
	} else {
		res.MaxChildren = Opt[float64]{}
	}
	if v, ok := set.Body.Get(); ok {
		mulOpt(&res.Body.Acceleration, v.Acceleration)
		mulOpt(&res.Body.Speed, v.Speed)
		mulOpt(&res.Body.Health, v.Health)
		mulOpt(&res.Body.Resist, v.Resist)
		mulOpt(&res.Body.Shield, v.Shield)
		mulOpt(&res.Body.Regen, v.Regen)
		mulOpt(&res.Body.Damage, v.Damage)
		mulOpt(&res.Body.Penetration, v.Penetration)
		mulOpt(&res.Body.Range, v.Range)
		mulOpt(&res.Body.FOV, v.FOV)
		mulOpt(&res.Body.ShockAbsorb, v.ShockAbsorb)
		mulOpt(&res.Body.RecoilMultiplier, v.RecoilMultiplier)
		mulOpt(&res.Body.Density, v.Density)
		mulOpt(&res.Body.Stealth, v.Stealth)
		mulOpt(&res.Body.Pushability, v.Pushability)
		mulOpt(&res.Body.Hetero, v.Hetero)
	}
	if v, ok := set.Guns.Get(); ok {
		res.Guns = Some(append(append([]Gun{}, res.Guns.Or(nil)...), v...))
		res.Steps = append(res.Steps, DefineStep{Kind: StepAppendGuns, Guns: v})
	}
	if list, ok := set.Turrets.Get(); ok {
		turrets, err := r.resolveTurrets(list, name, res, st)
		if err != nil {
			return err
		}
		res.Turrets = Some(append(append([]ResolvedTurret{}, res.Turrets.Or(nil)...), turrets...))
		res.Steps = append(res.Steps, DefineStep{Kind: StepAppendTurrets, Turrets: turrets})
	}
	if list, ok := set.Props.Get(); ok {
		for _, p := range list {
			sub, err := r.buildProp(p.Type, name+" prop", st)
			if err != nil {
				return err
			}
			res.Props = append(res.Props, ResolvedProp{Position: p.Position, Type: p.Type, Resolved: sub})
		}
	}
	if v, ok := set.Size.Get(); ok {
		res.Size = Some(res.Size.Or(1) * v * res.Squiggle)
		if !res.CoreSize.IsSet() {
			res.CoreSize = res.Size
		}
		res.Steps = append(res.Steps, DefineStep{Kind: StepSizeMul, Raw: v})
	}
	if list, ok := set.Controllers.Get(); ok {
		res.addControllers(list)
	}
	if v, ok := set.BatchUpgrades.Get(); ok {
		res.BatchUpgrades = Some(v)
	}
	if err := r.addUpgrades(res, set, name, branch); err != nil {
		return err
	}
	if v, ok := set.RerootUpgradeTree.Get(); ok && rerootTruthy(v) {
		if v.IsList {
			res.RerootUpgradeTree = Some(strings.Join(v.List, ",") + joinRoots(v.List))
		} else {
			res.RerootUpgradeTree = Some(v.Str)
		}
	}
	return nil
}

func joinRoots(list []string) string {
	var b strings.Builder
	for _, root := range list {
		b.WriteString(root)
		b.WriteString(`\/`)
	}
	s := b.String()
	return s[:max(0, len(s)-2)]
}

// Defines itself from "genericEntity" before any TYPE lands on it.
// See turretEntity.js:36. Verified by executing both against the real loader.
// Line 53 is read but never written.
func (r *Resolver) resolveTurrets(list []Turret, from string, bond *Resolved, st *walkState) ([]ResolvedTurret, error) {
	out := make([]ResolvedTurret, 0, len(list))
	for _, t := range list {
		sub, err := r.buildTurret(t.Type, from+" turret", bond, st)
		if err != nil {
			return nil, err
		}
		out = append(out, ResolvedTurret{
			Position:      t.Position,
			Type:          t.Type,
			Resolved:      sub,
			CollidingBond: t.Vulnerable,
		})
	}
	return out, nil
}

func (r *Resolver) buildTurret(list TypeList, label string, bond *Resolved, st *walkState) (*Resolved, error) {
	sub := newTurretResolved(label)
	sub.Team = bond.Team // turretEntity.js:53
	if generic, ok := r.set.Get("genericEntity"); ok {
		if err := r.defineTurret(sub, generic, "genericEntity", st); err != nil {
			return nil, err
		}
	}
	sub.Label = Some(bond.Label.Or("undefined") + " " + sub.Label.Or("undefined"))
	for _, ref := range list {
		d, name, err := r.set.deref(ref, label)
		if err != nil {
			return nil, err
		}
		if err := r.defineTurret(sub, d, name, st); err != nil {
			return nil, err
		}
	}
	return sub, nil
}

// Alpha and Squiggle have no turretEntity counterpart at all, nothing in that class
// reads or writes either, so they are left at the Entity defaults rather than at a zero
func newTurretResolved(name string) *Resolved {
	return &Resolved{
		Name:       name,
		Color:      newColorState(16),
		Borderless: Some(false),
		DrawFill:   Some(true),
		Invisible:  [2]float64{0, 0},
		AlphaRange: [2]float64{0, 1},
		Alpha:      1,
		Squiggle:   1,
	}
}

// defineTurret does not handle SKILL, SKILL_CAP, LEVEL, UPGRADES_TIER_*, ON, NECRO, SHAKE, SYNC_WITH_TANK, MOTION_TYPE, TEAM, VARIES_IN_SIZE, or entity settings.
func (r *Resolver) defineTurret(res *Resolved, set *Definition, name string, st *walkState) error {
	if err := st.push(set, name); err != nil {
		return err
	}
	defer st.pop()

	for _, ref := range set.Parent {
		parent, pname, err := r.set.deref(ref, name)
		if err != nil {
			return err
		}
		if err := r.defineTurret(res, parent, pname, st); err != nil {
			return err
		}
	}

	setOpt(&res.LayerID, set.Layer)
	if v, ok := set.Index.Get(); ok {
		res.Index = Some(numberToString(v))
	}
	setOpt(&res.EntityName, set.Name)
	setOpt(&res.Label, set.Label)
	setOpt(&res.Angle, set.Angle)
	setOpt(&res.DisplayName, set.DisplayName)
	setOpt(&res.Type, set.Type)
	setOpt(&res.WallType, set.WallType)
	setOpt(&res.Settings.MirrorMasterAngle, set.MirrorMasterAngle)
	setOpt(&res.Settings.Independent, set.Independent)
	if v, ok := set.Shape.Get(); ok {
		if v.IsNumber {
			res.Shape = Some(v.Num)
		} else {
			res.Shape = Some(set.ShapeNum.Or(0))
		}
		res.ShapeData = Some(v)
	}
	if set.Color.Kind != ColorNone {
		res.Color.Interpret(set.Color)
	}
	if list, ok := set.Controllers.Get(); ok {
		res.addControllers(list)
	}
	setOpt(&res.FacingType, set.FacingType)
	if f, ok := set.DefineLevelSkill.Get(); ok {
		res.LevelSkillPoints = Some(f)
		res.Funcs = append(res.Funcs, f)
	}
	setOpt(&res.RecalcSkill, set.RecalcSkill)
	if v, ok := set.ExtraSkill.Get(); ok {
		res.ExtraSkill += v
	}
	setOpt(&res.MaxChildren, set.MaxChildren)
	setOpt(&res.Settings.HasNoRecoil, set.HasNoRecoil)
	if v, ok := set.AI.Get(); ok {
		res.AISettings = Some(v)
	}
	if v, ok := set.Guns.Get(); ok {
		res.Guns = Some(v)
		res.Steps = append(res.Steps, DefineStep{Kind: StepGuns, Guns: v})
	}
	if v, ok := set.Size.Get(); ok {
		res.Size = Some(v)
	}
	if list, ok := set.Turrets.Get(); ok {
		turrets, err := r.resolveTurrets(list, name, res, st)
		if err != nil {
			return err
		}
		res.Turrets = Some(turrets)
		res.Steps = append(res.Steps, DefineStep{Kind: StepTurrets, Turrets: turrets})
	}
	if v, ok := set.Body.Get(); ok {
		setOpt(&res.Body.Acceleration, v.Acceleration)
		setOpt(&res.Body.Speed, v.Speed)
		setOpt(&res.Body.Health, v.Health)
		setOpt(&res.Body.Resist, v.Resist)
		setOpt(&res.Body.Shield, v.Shield)
		setOpt(&res.Body.Regen, v.Regen)
		setOpt(&res.Body.Damage, v.Damage)
		setOpt(&res.Body.Penetration, v.Penetration)
		setOpt(&res.Body.Range, v.Range)
		setOpt(&res.Body.FOV, v.FOV)
		setOpt(&res.Body.ShockAbsorb, v.ShockAbsorb)
		setOpt(&res.Body.RecoilMultiplier, v.RecoilMultiplier)
		setOpt(&res.Body.Density, v.Density)
		setOpt(&res.Body.Stealth, v.Stealth)
		setOpt(&res.Body.Pushability, v.Pushability)
		setOpt(&res.Body.Knockback, v.Knockback)
		setOpt(&res.Body.Hetero, v.Hetero)
	}
	return nil
}

func (r *Resolver) buildProp(list TypeList, label string, st *walkState) (*Resolved, error) {
	sub := &Resolved{
		Name:       label,
		Color:      newColorState(16), // propEntity.js:5
		Borderless: Some(false),       // propEntity.js:6
		DrawFill:   Some(true),        // propEntity.js:7
		Alpha:      1,
		AlphaRange: [2]float64{0, 1},
		Squiggle:   1,
	}
	sub.Settings.MirrorMasterAngle = Some(true) // propEntity.js:43, unconditional
	for _, ref := range list {
		d, name, err := r.set.deref(ref, label)
		if err != nil {
			return nil, err
		}
		if err := r.defineProp(sub, d, name, st); err != nil {
			return nil, err
		}
	}
	return sub, nil
}

func (r *Resolver) defineProp(res *Resolved, set *Definition, name string, st *walkState) error {
	if err := st.push(set, name); err != nil {
		return err
	}
	defer st.pop()

	for _, ref := range set.Parent {
		parent, pname, err := r.set.deref(ref, name)
		if err != nil {
			return err
		}
		if err := r.defineProp(res, parent, pname, st); err != nil {
			return err
		}
	}
	if v, ok := set.Index.Get(); ok {
		res.Index = Some(numberToString(v))
	}
	if v, ok := set.Shape.Get(); ok {
		if v.IsNumber {
			res.Shape = Some(v.Num)
		} else {
			res.Shape = Some(float64(0))
		}
		res.ShapeData = Some(v)
	}
	if set.Color.Kind != ColorNone {
		res.Color.Interpret(set.Color)
	}
	setOpt(&res.Borderless, set.Borderless)
	setOpt(&res.DrawFill, set.DrawFill)
	if v, ok := set.Guns.Get(); ok {
		res.Guns = Some(v)
	}
	return nil
}

// StepKind says which of define()'s side-effectful blocks a DefineStep is.
type StepKind uint8

const (
	StepControllers StepKind = iota
	// StepResetControllers is the reset() RESET_UPGRADES/RESET_STATS performs
	// (entity.js:322-330).
	StepResetControllers
	StepGuns
	// StepAppendGuns is defineSplit's GUNS, which appends instead of replacing.
	StepAppendGuns
	StepTurrets
	// StepAppendTurrets is defineSplit's TURRETS, which appends.
	StepAppendTurrets
	StepSquiggle
	StepSize
	// StepSizeMul is defineSplit's SIZE, which multiplies rather than replaces.
	StepSizeMul
	StepScore
)

// DefineStep is one of define()'s side-effectful blocks, recorded in the order the
// PARENT walk reached it. Each step represents the path taken to reach this definition.
// Ancestor CONTROLLERS, GUNS and TURRETS are each built in full before being combined.
// The real server builds multiple intermediate turrets and may discard some after resolving.
type DefineStep struct {
	Kind        StepKind
	Controllers []Controller
	Guns        []Gun
	Turrets     []ResolvedTurret

	// Varies is StepSquiggle's VARIES_IN_SIZE value. Raw is StepSize/StepSizeMul's
	// SIZE and StepScore's VALUE before the squiggle is folded in.
	Varies bool
	Raw    float64
}

// (controllers.js:1308) maps to its own class, so matching on the name is the same
func (res *Resolved) addControllers(list []Controller) {
	res.Steps = append(res.Steps, DefineStep{
		Kind:        StepControllers,
		Controllers: append([]Controller(nil), list...),
	})
	add := make([]Controller, 0, len(list))
	add = append(add, list...)
	for old := 0; old < len(res.Controllers); old++ {
		for n := 0; n < len(add); n++ {
			if add[n].Name == res.Controllers[old].Name {
				res.Controllers[old] = add[n]
				add = append(add[:n], add[n+1:]...)
			}
		}
	}
	res.Controllers = append(res.Controllers, add...)
}

// Every level of the chain contributes. Nothing is ever cleared.
func (r *Resolver) addUpgrades(res *Resolved, set *Definition, from string, branch int) error {
	for tier := 0; tier < len(set.Upgrades); tier++ {
		slots, ok := set.Upgrades[tier].Get()
		if !ok {
			continue
		}
		for _, slot := range slots {
			var idx strings.Builder
			for _, ref := range slot.Classes {
				d, _, err := r.set.deref(ref, from)
				if err != nil {
					return err
				}
				if v, ok := d.Index.Get(); ok {
					idx.WriteString(numberToString(v))
				} else {
					// String(undefined) in the JS, and it reaches the client.
					idx.WriteString("undefined")
				}
				idx.WriteString("-")
			}
			s := idx.String()
			res.Upgrades = append(res.Upgrades, UpgradeEntry{
				Classes:     slot.Classes,
				Index:       s[:max(0, len(s)-1)],
				Tier:        tier,
				Branch:      branch,
				BranchLabel: res.BranchLabel,
				RedefineAll: slot.RedefineAll,
			})
		}
	}
	return nil
}

// small helpers

func setOpt[T any](dst *Opt[T], src Opt[T]) {
	if v, ok := src.Get(); ok {
		*dst = Some(v)
	}
}

// If not set, use NaN, since `undefined * x` is NaN in JavaScript.
func mulOpt(dst *Opt[float64], src Opt[float64]) {
	if v, ok := src.Get(); ok {
		*dst = Some(dst.Or(math.NaN()) * v)
	}
}

func colorTruthy(c ColorSpec) bool {
	switch c.Kind {
	case ColorNumber:
		return c.Num != 0
	case ColorString:
		return c.Str != ""
	case ColorObject:
		return true
	}
	return false
}

func rerootTruthy(r RerootSpec) bool {
	if r.IsList {
		return true // a JS array is always truthy, even when empty
	}
	return r.Str != ""
}

func at(list []float64, i int) float64 {
	if i < len(list) {
		return list[i]
	}
	return 0
}

func orZero(v, fallback float64) float64 {
	if v == 0 {
		return fallback
	}
	return v
}

func pair(list []float64) [2]float64 {
	return [2]float64{at(list, 0), at(list, 1)}
}

func skillSlots(s SkillSpec, def float64, field string) ([10]float64, error) {
	var out [10]float64
	if s.IsList {
		if len(s.List) != 10 {
			return out, fmt.Errorf("%s has %d entries, expected 10", field, len(s.List))
		}
		copy(out[:], s.List)
		return out, nil
	}
	return s.Named.Slots(def), nil
}
