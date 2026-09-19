package defs

import (
	"encoding/json"
	"fmt"
	"math"
	"os"
	"path/filepath"
	"sort"
	"strconv"
	"strings"
	"testing"

	"arrasgo/internal/jsmath"
	"arrasgo/internal/jsutil"
)

const (
	minGoldenDefinitions = 2400
	minGoldenFields      = 500000
	minFieldsPerDef      = 18
	wantGoldenFailures   = 1
)

type defsVectorFile struct {
	Seed        uint64       `json:"seed"`
	Definitions int          `json:"definitions"`
	Failures    int          `json:"failures"`
	Fields      int          `json:"fields"`
	DumpLosses  []dumpLoss   `json:"dumpLosses"`
	Vectors     []defsVector `json:"vectors"`
}

type dumpLoss struct {
	Definition string `json:"definition"`
	Path       string `json:"path"`
	Live       string `json:"live"`
	Dumped     string `json:"dumped"`
}

type defsVector struct {
	Name   string                     `json:"name"`
	OK     bool                       `json:"ok"`
	Error  string                     `json:"error"`
	Draws  uint64                     `json:"draws"`
	Fields map[string]json.RawMessage `json:"fields"`
}

type gv struct {
	kind byte // 'n', 's', 'b'
	n    float64
	s    string
	b    bool
}

func (v gv) String() string {
	switch v.kind {
	case 'n':
		return strconv.FormatFloat(v.n, 'g', -1, 64)
	case 's':
		return strconv.Quote(v.s)
	default:
		return strconv.FormatBool(v.b)
	}
}

func (v gv) equal(o gv) bool {
	if v.kind != o.kind {
		return false
	}
	switch v.kind {
	case 'n':
		return math.Float64bits(v.n) == math.Float64bits(o.n)
	case 's':
		return v.s == o.s
	default:
		return v.b == o.b
	}
}

type flat map[string]gv

func (f flat) num(k string, v float64)  { f[k] = gv{kind: 'n', n: v} }
func (f flat) str(k string, v string)   { f[k] = gv{kind: 's', s: v} }
func (f flat) boolean(k string, v bool) { f[k] = gv{kind: 'b', b: v} }

func (f flat) optNum(k string, o Opt[float64]) {
	if v, ok := o.Get(); ok {
		f.num(k, v)
	}
}
func (f flat) optStr(k string, o Opt[string]) {
	if v, ok := o.Get(); ok {
		f.str(k, v)
	}
}
func (f flat) optBool(k string, o Opt[bool]) {
	if v, ok := o.Get(); ok {
		f.boolean(k, v)
	}
}

func decodeField(raw json.RawMessage, wantNumber bool) (gv, error) {
	if len(raw) == 0 {
		return gv{}, fmt.Errorf("empty value")
	}
	switch raw[0] {
	case 't', 'f':
		var b bool
		if err := json.Unmarshal(raw, &b); err != nil {
			return gv{}, err
		}
		return gv{kind: 'b', b: b}, nil
	case '"':
		var s string
		if err := json.Unmarshal(raw, &s); err != nil {
			return gv{}, err
		}
		switch s {
		case "NaN":
			if wantNumber {
				return gv{kind: 'n', n: math.NaN()}, nil
			}
		case "Infinity":
			if wantNumber {
				return gv{kind: 'n', n: math.Inf(1)}, nil
			}
		case "-Infinity":
			if wantNumber {
				return gv{kind: 'n', n: math.Inf(-1)}, nil
			}
		case "-0":
			if wantNumber {
				return gv{kind: 'n', n: math.Copysign(0, -1)}, nil
			}
		}
		return gv{kind: 's', s: s}, nil
	default:
		var n float64
		if err := json.Unmarshal(raw, &n); err != nil {
			return gv{}, err
		}
		return gv{kind: 'n', n: n}, nil
	}
}

var goldenBodyKeys = []string{
	"ACCELERATION", "SPEED", "HEALTH", "RESIST", "SHIELD", "REGEN", "DAMAGE",
	"PENETRATION", "RANGE", "FOV", "SHOCK_ABSORB", "RECOIL_MULTIPLIER", "DENSITY",
	"STEALTH", "PUSHABILITY", "KNOCKBACK", "HETERO",
}

func flattenBody(f flat, p string, b BodyStats) {
	for _, k := range goldenBodyKeys {
		var o Opt[float64]
		switch k {
		case "ACCELERATION":
			o = b.Acceleration
		case "SPEED":
			o = b.Speed
		case "HEALTH":
			o = b.Health
		case "RESIST":
			o = b.Resist
		case "SHIELD":
			o = b.Shield
		case "REGEN":
			o = b.Regen
		case "DAMAGE":
			o = b.Damage
		case "PENETRATION":
			o = b.Penetration
		case "RANGE":
			o = b.Range
		case "FOV":
			o = b.FOV
		case "SHOCK_ABSORB":
			o = b.ShockAbsorb
		case "RECOIL_MULTIPLIER":
			o = b.RecoilMultiplier
		case "DENSITY":
			o = b.Density
		case "STEALTH":
			o = b.Stealth
		case "PUSHABILITY":
			o = b.Pushability
		case "KNOCKBACK":
			o = b.Knockback
		case "HETERO":
			o = b.Hetero
		}
		f.optNum(p+"body."+k, o)
	}
}

func flattenSettings(f flat, p string, s Settings) {
	for k, o := range map[string]Opt[bool]{
		"no_collisions": s.NoCollisions, "drawHealth": s.DrawHealth, "drawShape": s.DrawShape,
		"damageEffects": s.DamageEffects, "ratioEffects": s.RatioEffects,
		"motionEffects": s.MotionEffects, "acceptsScore": s.AcceptsScore,
		"givesKillMessage": s.GivesKillMessage, "canGoOutsideRoom": s.CanGoOutsideRoom,
		"diesAtLowSpeed": s.DiesAtLowSpeed, "diesAtRange": s.DiesAtRange,
		"independent": s.Independent, "persistsAfterDeath": s.PersistsAfterDeath,
		"clearOnMasterUpgrade": s.ClearOnMasterUpgrade, "healthWithLevel": s.HealthWithLevel,
		"obstacle": s.Obstacle, "fullyInvisible": s.FullyInvisible,
		"canSeeInvisible": s.CanSeeInvisible, "hasNoRecoil": s.HasNoRecoil,
		"attentionCraver": s.AttentionCraver, "defeatMessage": s.DefeatMessage,
		"buffVsFood": s.BuffVsFood, "leaderboardable": s.Leaderboardable,
		"renderOnLeaderboard": s.RenderOnLeaderboard, "reloadToAcceleration": s.ReloadToAcceleration,
		"variesInSize": s.VariesInSize, "noSizeAnimation": s.NoSizeAnimation,
		"connectChildrenOnCamera": s.ConnectChildrenOnCamera,
	} {
		f.optBool(p+"settings."+k, o)
	}
	f.optStr(p+"settings.hitsOwnType", s.HitsOwnType)
	f.optStr(p+"settings.killMessage", s.KillMessage)
	f.optStr(p+"settings.broadcastMessage", s.BroadcastMessage)
	f.optNum(p+"settings.damageClass", s.DamageClass)
	f.optBool(p+"settings.mirrorMasterAngle", s.MirrorMasterAngle)
	if n, ok := s.SkillNames.Get(); ok {
		for k, v := range map[string]string{
			"body_damage": n.BodyDamage, "max_health": n.MaxHealth, "bullet_speed": n.BulletSpeed,
			"bullet_health": n.BulletHealth, "bullet_pen": n.BulletPen, "bullet_damage": n.BulletDamage,
			"reload": n.Reload, "move_speed": n.MoveSpeed, "shield_regen": n.ShieldRegen,
			"shield_cap": n.ShieldCap,
		} {
			f.str(p+"settings.skillNames."+k, v)
		}
	}
	if types, ok := s.NecroTypes.Get(); ok {
		f.num(p+"settings.necroTypes.len", float64(len(types)))
		for i, v := range types {
			f.num(fmt.Sprintf("%ssettings.necroTypes.%d", p, i), v)
		}
	}
	if shakes, ok := s.ShakeProperties.Get(); ok {
		flattenShake(f, p, shakes)
	}
}

func flattenShake(f flat, p string, shakes []ShakeSpec) {
	n := 0
	row := func(kind string, d ShakeDetail, s ShakeSpec) {
		q := fmt.Sprintf("%ssettings.shakeProperties.%d.", p, n)
		f.str(q+"type", kind)
		f.optNum(q+"duration", d.Duration)
		f.optNum(q+"amount", d.Amount)
		f.boolean(q+"keepShake", d.KeepShake.Or(false))
		f.boolean(q+"push", s.Push.Or(false))
		f.boolean(q+"applyOn.upgrade", s.ApplyOnUpgrade.Or(false))
		f.boolean(q+"applyOn.shoot", s.ApplyOnShoot.Or(false))
		n++
	}
	for _, s := range shakes {
		if d, ok := s.CameraShake.Get(); ok {
			row("camera", d, s)
		}
		if d, ok := s.GUIShake.Get(); ok {
			row("gui", d, s)
		}
	}
	f.num(p+"settings.shakeProperties.len", float64(n))
}

func typeRefName(ref TypeRef) string {
	if ref.IsInline() {
		return "<inline>"
	}
	return ref.Name
}

func flattenColorSpec(f flat, key string, spec ColorSpec) {
	if spec.Kind == ColorNone {
		return
	}
	c := newColorState(-1)
	c.Interpret(spec)
	f.str(key, c.Compiled())
}

func flattenGun(f flat, p string, g Gun) {
	f.boolean(p+"POSITION.fromArray", g.Position.FromArray)
	pos := g.Position
	f.optNum(p+"POSITION.LENGTH", pos.Length)
	f.optNum(p+"POSITION.WIDTH", pos.Width)
	f.optNum(p+"POSITION.ASPECT", pos.Aspect)
	f.optNum(p+"POSITION.X", pos.X)
	f.optNum(p+"POSITION.Y", pos.Y)
	f.optNum(p+"POSITION.ANGLE", pos.Angle)
	f.optNum(p+"POSITION.DELAY", pos.Delay)
	f.optNum(p+"POSITION.LAYER", pos.Layer)
	if !pos.FromArray {
		f.optNum(p+"POSITION.HEIGHT", pos.Height)
	}
	pr, ok := g.Properties.Get()
	if !ok {
		return
	}
	f.boolean(p+"PROPERTIES.present", true)
	f.optNum(p+"PROPERTIES.ALPHA", pr.Alpha)
	f.optNum(p+"PROPERTIES.MAX_CHILDREN", pr.MaxChildren)
	f.optNum(p+"PROPERTIES.SPAWN_OFFSET", pr.SpawnOffset)
	f.optNum(p+"PROPERTIES.STROKE_WIDTH", pr.StrokeWidth)
	for k, o := range map[string]Opt[bool]{
		"ALT_FIRE": pr.AltFire, "AUTOFIRE": pr.Autofire, "BORDERLESS": pr.Borderless,
		"DELAY_SPAWN": pr.DelaySpawn, "DESTROY_OLDEST_CHILD": pr.DestroyOldestChild,
		"DRAW_ABOVE": pr.DrawAbove, "DRAW_FILL": pr.DrawFill, "FIXED_RELOAD": pr.FixedReload,
		"INDEPENDENT_CHILDREN": pr.IndependentChildren, "INDEPENDENT_MASTER": pr.IndependentMaster,
		"NEGATIVE_RECOIL": pr.NegativeRecoil, "NO_LIMITATIONS": pr.NoLimitations,
		"SHOOT_ON_DEATH": pr.ShootOnDeath, "SYNCS_SKILLS": pr.SyncsSkills,
		"WAIT_TO_CYCLE": pr.WaitToCycle,
	} {
		f.optBool(p+"PROPERTIES."+k, o)
	}
	f.optStr(p+"PROPERTIES.LABEL", pr.Label)
	f.optStr(p+"PROPERTIES.STAT_CALCULATOR", pr.StatCalculator)
	if id, ok := pr.Identifier.Get(); ok {
		f.boolean(p+"PROPERTIES.IDENTIFIER.isString", id.IsString)
		if id.IsString {
			f.str(p+"PROPERTIES.IDENTIFIER", id.Str)
		} else {
			f.num(p+"PROPERTIES.IDENTIFIER", id.Num)
		}
	}
	flattenColorSpec(f, p+"PROPERTIES.COLOR", pr.Color)
	if len(pr.Type) > 0 {
		f.num(p+"PROPERTIES.TYPE.len", float64(len(pr.Type)))
		for i, ref := range pr.Type {
			f.str(fmt.Sprintf("%sPROPERTIES.TYPE.%d", p, i), typeRefName(ref))
		}
	}
	if ss, ok := pr.ShootSettings.Get(); ok {
		f.boolean(p+"PROPERTIES.SHOOT_SETTINGS.present", true)
		for k, o := range map[string]Opt[float64]{
			"damage": ss.Damage, "density": ss.Density, "health": ss.Health,
			"maxSpeed": ss.MaxSpeed, "pen": ss.Pen, "range": ss.Range, "recoil": ss.Recoil,
			"reload": ss.Reload, "resist": ss.Resist, "shudder": ss.Shudder, "size": ss.Size,
			"speed": ss.Speed, "spray": ss.Spray,
		} {
			f.optNum(p+"PROPERTIES.SHOOT_SETTINGS."+k, o)
		}
	}
}

func flattenBound(f flat, p string, pos TurretPosition) {
	x, y := pos.X.Or(0), pos.Y.Or(0)
	f.num(p+"bound.size", pos.Size.Or(10)/20)
	f.num(p+"bound.angle", pos.Angle.Or(0)*math.Pi/180)
	f.num(p+"bound.direction", jsmath.Atan2(y, x))
	f.num(p+"bound.offset", math.Sqrt(jsmath.Pow(x, 2)+jsmath.Pow(y, 2))/10)
	f.num(p+"bound.arc", pos.Arc.Or(360)*math.Pi/180)
	f.num(p+"bound.layer", pos.Layer.Or(0))
}

func flattenResolved(f flat, p string, res *Resolved, isTurret bool) {
	f.optStr(p+"index", res.Index)
	f.optStr(p+"name", res.EntityName)
	f.optStr(p+"label", res.Label)
	f.optBool(p+"displayName", res.DisplayName)
	if t, ok := res.Type.Get(); ok {
		f.boolean(p+"type.isList", t.IsList)
		if t.IsList {
			f.num(p+"type.len", float64(len(t.List)))
			for i, s := range t.List {
				f.str(fmt.Sprintf("%stype.%d", p, i), s)
			}
		} else {
			f.str(p+"type.str", t.Str)
		}
	}
	f.optNum(p+"walltype", res.WallType)
	f.optNum(p+"layerID", res.LayerID)
	f.optNum(p+"angle", res.Angle)
	f.optStr(p+"branchLabel", res.BranchLabel)
	f.optStr(p+"upgradeColor", res.UpgradeColor)

	f.optNum(p+"shape", res.Shape)
	if sd, ok := res.ShapeData.Get(); ok {
		switch {
		case sd.IsNumber:
			f.str(p+"shapeData.kind", "number")
			f.num(p+"shapeData.num", sd.Num)
		case sd.IsString:
			f.str(p+"shapeData.kind", "string")
			f.str(p+"shapeData.str", sd.Str)
		default:
			f.str(p+"shapeData.kind", "polygon")
			f.num(p+"shapeData.len", float64(len(sd.Polygon)))
		}
	}
	f.str(p+"color", res.Color.Compiled())
	if g, ok := res.Glow.Get(); ok {
		f.optNum(p+"glow.radius", g.Radius)
		f.str(p+"glow.color", g.Color.Compiled())
		f.num(p+"glow.alpha", g.Alpha)
		f.num(p+"glow.recursion", g.Recursion)
	}
	if !isTurret {
		f.num(p+"alpha", res.Alpha)
	}
	f.num(p+"alphaRange.0", res.AlphaRange[0])
	f.num(p+"alphaRange.1", res.AlphaRange[1])
	f.num(p+"invisible.0", res.Invisible[0])
	f.num(p+"invisible.1", res.Invisible[1])
	f.optBool(p+"borderless", res.Borderless)
	f.optBool(p+"drawFill", res.DrawFill)

	behaviour := func(key string, o Opt[BehaviourSpec]) {
		b, ok := o.Get()
		if !ok {
			return
		}
		f.str(p+key+".name", b.Name)
		f.optNum(p+key+".args.angle", b.Args.Angle)
		f.optNum(p+key+".args.damp", b.Args.Damp)
		f.optNum(p+key+".args.smoothness", b.Args.Smoothness)
		f.optNum(p+key+".args.speed", b.Args.Speed)
		f.optNum(p+key+".args.turnVelocity", b.Args.TurnVelocity)
		f.optBool(p+key+".args.independent", b.Args.Independent)
	}
	behaviour("motionType", res.MotionType)
	behaviour("facingType", res.FacingType)

	f.num(p+"controllers.len", float64(len(res.Controllers)))
	for i, c := range res.Controllers {
		q := fmt.Sprintf("%scontrollers.%d.", p, i)
		f.str(q+"name", c.Name)
		if !c.Args.Present() {
			continue
		}
		f.boolean(q+"args.present", true)
		for k, o := range map[string]Opt[float64]{
			"amplitude": c.Args.Amplitude, "distance": c.Args.Distance, "leash": c.Args.Leash,
			"orbit": c.Args.Orbit, "range": c.Args.Range, "repel": c.Args.Repel,
			"speed": c.Args.Speed, "turnwiserange": c.Args.Turnwiserange, "yOffset": c.Args.YOffset,
		} {
			f.optNum(q+"args."+k, o)
		}
		for k, o := range map[string]Opt[bool]{
			"independent": c.Args.Independent, "invert": c.Args.Invert,
			"lockThroughWalls": c.Args.LockThroughWalls, "lookAtGoal": c.Args.LookAtGoal,
			"onlyIfHasAltFireGun": c.Args.OnlyIfHasAltFireGun, "onlyWhenIdle": c.Args.OnlyWhenIdle,
			"replicatePlayerMovement": c.Args.ReplicatePlayerMovement, "useOwnMaster": c.Args.UseOwnMaster,
		} {
			f.optBool(q+"args."+k, o)
		}
	}

	if ai, ok := res.AISettings.Get(); ok {
		f.boolean(p+"ai.present", true)
		for k, o := range map[string]Opt[bool]{
			"BLIND": ai.Blind, "CHASE": ai.Chase, "FARMER": ai.Farmer, "FULL_VIEW": ai.FullView,
			"IGNORE_SHAPES": ai.IgnoreShapes, "NO_LEAD": ai.NoLead, "SKYNET": ai.Skynet,
			"STRAFE": ai.Strafe, "chase": ai.ChaseLower, "independent": ai.Independent,
			"skynet": ai.SkynetLower,
		} {
			f.optBool(p+"ai."+k, o)
		}
		f.optNum(p+"ai.SPEED", ai.Speed)
		if extra, ok := ai.ExtraStats.Get(); ok {
			f.num(p+"ai.extraStats.len", float64(len(extra)))
			for i, v := range extra {
				f.num(fmt.Sprintf("%sai.extraStats.%d", p, i), v)
			}
		}
	}
	f.optBool(p+"ignoredByAi", res.IgnoredByAI)
	f.optBool(p+"allowedOnMinimap", res.AllowedOnMinimap)

	flattenBody(f, p, res.Body)

	f.optNum(p+"dangerValue", res.DangerValue)
	f.optBool(p+"intangibility", res.Intangibility)
	f.optBool(p+"healer", res.Healer)
	f.optBool(p+"immuneToTiles", res.ImmuneToTiles)
	f.optNum(p+"autospinBoost", res.AutospinBoost)
	f.optNum(p+"team", res.Team)

	f.optNum(p+"SIZE", res.Size)
	f.optNum(p+"coreSize", res.CoreSize)
	if !isTurret {
		f.num(p+"squiggle", res.Squiggle)
	}

	guns := res.Guns.Or(nil)
	f.num(p+"guns.len", float64(len(guns)))
	for i, g := range guns {
		flattenGun(f, fmt.Sprintf("%sguns.%d.", p, i), g)
	}
	f.num(p+"props.len", float64(len(res.Props)))

	turrets := res.Turrets.Or(nil)
	f.num(p+"turrets.len", float64(len(turrets)))
	for i, t := range turrets {
		q := fmt.Sprintf("%sturrets.%d.", p, i)
		flattenBound(f, q, t.Position)
		f.optBool(q+"collidingBond", t.CollidingBond)
		f.num(q+"defines.len", float64(len(t.Type)+1))
		for j, ref := range t.Type {
			f.str(fmt.Sprintf("%sdefines.%d", q, j), typeRefName(ref))
		}
		f.str(fmt.Sprintf("%sdefines.%d", q, len(t.Type)), "<inline>")
		flattenResolved(f, q+"res.", t.Resolved, true)
	}

	if sc, ok := res.GunStatScale.Get(); ok {
		f.boolean(p+"gunStatScale.present", true)
		for k, o := range map[string]Opt[float64]{
			"damage": sc.Damage, "density": sc.Density, "health": sc.Health,
			"maxSpeed": sc.MaxSpeed, "pen": sc.Pen, "range": sc.Range, "recoil": sc.Recoil,
			"reload": sc.Reload, "resist": sc.Resist, "size": sc.Size, "speed": sc.Speed,
		} {
			f.optNum(p+"gunStatScale."+k, o)
		}
	}
	f.optNum(p+"maxChildren", res.MaxChildren)
	f.optNum(p+"maxBullets", res.MaxBullets)
	f.optBool(p+"shootOnDeath", res.ShootOnDeath)
	f.optStr(p+"spawnOnDeath", res.SpawnOnDeath)

	f.optNum(p+"level", res.Level)
	f.optNum(p+"levelCap", res.LevelCap)
	if caps, ok := res.SkillCaps.Get(); ok {
		for i, v := range caps {
			f.num(fmt.Sprintf("%sskillCaps.%d", p, i), v)
		}
	}
	if skills, ok := res.Skills.Get(); ok {
		for i, v := range skills {
			f.num(fmt.Sprintf("%sskills.%d", p, i), v)
		}
	}
	f.num(p+"extraSkill", res.ExtraSkill)
	f.optNum(p+"score", res.Score)
	f.boolean(p+"lspf", res.LevelSkillPoints.IsSet())

	f.num(p+"upgrades.len", float64(len(res.Upgrades)))
	for i, u := range res.Upgrades {
		q := fmt.Sprintf("%supgrades.%d.", p, i)
		f.str(q+"index", u.Index)
		f.num(q+"tier", float64(u.Tier))
		f.num(q+"branch", float64(u.Branch))
		f.optStr(q+"branchLabel", u.BranchLabel)
		f.boolean(q+"redefineAll", u.RedefineAll)
		f.num(q+"classes.len", float64(len(u.Classes)))
		for j, ref := range u.Classes {
			f.str(fmt.Sprintf("%sclasses.%d", q, j), typeRefName(ref))
		}
	}
	f.optBool(p+"batchUpgrades", res.BatchUpgrades)
	f.optBool(p+"isArenaCloser", res.IsArenaCloser)
	f.optStr(p+"rerootUpgradeTree", res.RerootUpgradeTree)
	if ab, ok := res.Abilities.Get(); ok {
		f.num(p+"abilities.len", float64(len(ab)))
		for i, s := range ab {
			f.str(fmt.Sprintf("%sabilities.%d", p, i), s)
		}
	}

	f.num(p+"events.len", float64(len(res.Events)))
	for i, e := range res.Events {
		q := fmt.Sprintf("%sevents.%d.", p, i)
		f.str(q+"event", e.Event)
		f.boolean(q+"once", e.Once.Or(false))
		f.boolean(q+"hasHandler", e.Handler.IsSet())
	}
	f.num(p+"funcs", float64(len(res.Funcs)))

	if !isTurret {
		f.boolean(p+"syncWithTank", res.SyncWithTank)
	}
	flattenSettings(f, p, res.Settings)
}

func loadDefsVectors(t *testing.T) *defsVectorFile {
	t.Helper()
	p := filepath.Join("..", "..", "gen", "defs-vectors.json")
	raw, err := os.ReadFile(p)
	if err != nil {
		t.Fatalf("read %s: %v (regenerate with `node tools/gen-defs-vectors.js`)", p, err)
	}
	var v defsVectorFile
	if err := json.Unmarshal(raw, &v); err != nil {
		t.Fatalf("parse %s: %v", p, err)
	}
	return &v
}

type goldenMismatch struct {
	def, field, got, want string
}

func collapseIndices(key string) string {
	parts := strings.Split(key, ".")
	for i, p := range parts {
		if p == "" {
			continue
		}
		if _, err := strconv.Atoi(p); err == nil {
			parts[i] = "N"
		}
	}
	return strings.Join(parts, ".")
}

func replaySteps(rng *jsutil.Rand, res *Resolved) {
	squiggle, size, sizeSet, core, coreSet, score, scoreSet := spendSteps(rng, res)
	res.Squiggle = squiggle
	if sizeSet {
		res.Size = Some(size)
	}
	if coreSet {
		res.CoreSize = Some(core)
	}
	if scoreSet {
		res.Score = Some(score)
	}
}

func spendSteps(rng *jsutil.Rand, res *Resolved) (squiggle, size float64, sizeSet bool, core float64, coreSet bool, score float64, scoreSet bool) {
	squiggle = 1
	for _, step := range res.Steps {
		switch step.Kind {
		case StepControllers:
			for _, c := range step.Controllers {
				spendControllerDraws(rng, c.Name)
			}
		case StepTurrets, StepAppendTurrets:
			for _, t := range step.Turrets {
				if t.Resolved != nil {
					spendSteps(rng, t.Resolved)
				}
			}
		case StepSquiggle:
			if step.Varies {
				squiggle = rng.RandomRange(0.8, 1.2)
			} else {
				squiggle = 1
			}
		case StepSize:
			size, sizeSet = step.Raw*squiggle, true
			if !coreSet {
				core, coreSet = size, true
			}
		case StepSizeMul:
			base := 1.0
			if sizeSet {
				base = size
			}
			size, sizeSet = base*step.Raw*squiggle, true
			if !coreSet {
				core, coreSet = size, true
			}
		case StepScore:
			score, scoreSet = math.Max(score, step.Raw*squiggle), true
		}
	}
	return
}

// spendControllerDraws takes out of the stream exactly what an io_ constructor takes.
// tools/gen-defs-vectors.js's controllerConstructorDraws is the other half of this pair and carries the source lines.
// The real constructors live in internal/ctrl, which this package cannot import (it sits two ranks above defs).
//
// io_wanderAroundMap is the fifth drawing controller and is absent from both halves on
// purpose: its draw needs a room, and neither the corpus generator nor internal/ctrl's
// nil Context.RandomSpot has one.
func spendControllerDraws(rng *jsutil.Rand, name string) {
	switch name {
	case "moveInCircles":
		rng.Irandom(5)
		rng.Random(2 * math.Pi)
	case "nearestDifferentMaster", "healTeamMasters":
		rng.Irandom(30)
	case "fleeAtLowHealth":
		rng.Gauss(0.7, 0.15)
	}
}

func TestResolveMatchesNodeForEveryDefinition(t *testing.T) {
	corpus := loadDefsVectors(t)
	set := load(t)

	if corpus.Seed != 1 {
		t.Fatalf("corpus seed is %d; the Go side resolves with jsutil.NewRand(1)", corpus.Seed)
	}
	if len(corpus.Vectors) < minGoldenDefinitions {
		t.Fatalf("corpus has %d definitions, want at least %d — it is too small to prove anything",
			len(corpus.Vectors), minGoldenDefinitions)
	}
	if corpus.Fields < minGoldenFields {
		t.Fatalf("corpus records %d fields, want at least %d", corpus.Fields, minGoldenFields)
	}
	if len(corpus.Vectors) != set.Len() {
		t.Fatalf("corpus has %d definitions, the table has %d — regenerate both",
			len(corpus.Vectors), set.Len())
	}

	var (
		mismatches   []goldenMismatch
		byField      = map[string]int{}
		comparedDefs int
		fieldsSeen   int
		skipped      []string
	)
	note := func(def, field, got, want string) {
		byField[collapseIndices(field)]++
		if len(mismatches) < 40 {
			mismatches = append(mismatches, goldenMismatch{def, field, got, want})
		}
	}

	for _, vec := range corpus.Vectors {
		if !vec.OK {
			// A definition the real JS cannot resolve. Recorded rather than dropped,
			// and named here so it can never be silently skipped.
			skipped = append(skipped, fmt.Sprintf("%s: %s", vec.Name, vec.Error))
			continue
		}
		if len(vec.Fields) < minFieldsPerDef {
			t.Errorf("%s: corpus records only %d fields", vec.Name, len(vec.Fields))
			continue
		}

		rng := jsutil.NewRand(1)
		r, err := NewResolver(set, rng)
		if err != nil {
			t.Fatalf("NewResolver: %v", err)
		}
		r.DeferSquiggle(true)
		res, err := r.Resolve(vec.Name)
		if err != nil {
			t.Errorf("%s: Resolve: %v (node resolved it fine)", vec.Name, err)
			continue
		}
		replaySteps(rng, res)
		if rng.Calls() != vec.Draws {
			note(vec.Name, "<rng draws>", strconv.FormatUint(rng.Calls(), 10), strconv.FormatUint(vec.Draws, 10))
		}

		got := flat{}
		flattenResolved(got, "", res, false)

		for key, raw := range vec.Fields {
			g, haveGo := got[key]
			want, err := decodeField(raw, haveGo && g.kind == 'n')
			if err != nil {
				t.Fatalf("%s: field %s: %v", vec.Name, key, err)
			}
			fieldsSeen++
			if !haveGo {
				note(vec.Name, key, "<absent>", want.String())
				continue
			}
			if !g.equal(want) {
				note(vec.Name, key, g.String(), want.String())
			}
		}
		for key, g := range got {
			if _, ok := vec.Fields[key]; !ok {
				fieldsSeen++
				note(vec.Name, key, g.String(), "<absent>")
			}
		}
		comparedDefs++
	}

	if len(skipped) != wantGoldenFailures {
		t.Errorf("%d definitions were skipped as unresolvable in the JS, want %d:\n  %s",
			len(skipped), wantGoldenFailures, strings.Join(skipped, "\n  "))
	}
	for _, s := range skipped {
		t.Logf("skipped (the real JS throws here too): %s", s)
	}

	if comparedDefs < minGoldenDefinitions {
		t.Fatalf("compared only %d definitions, want at least %d", comparedDefs, minGoldenDefinitions)
	}
	if fieldsSeen < minGoldenFields {
		t.Fatalf("compared only %d fields, want at least %d", fieldsSeen, minGoldenFields)
	}
	t.Logf("compared %d definitions and %d fields against node", comparedDefs, fieldsSeen)

	if len(byField) == 0 {
		return
	}
	total := 0
	for _, n := range byField {
		total += n
	}
	keys := make([]string, 0, len(byField))
	for k := range byField {
		keys = append(keys, k)
	}
	sort.Slice(keys, func(i, j int) bool {
		if byField[keys[i]] != byField[keys[j]] {
			return byField[keys[i]] > byField[keys[j]]
		}
		return keys[i] < keys[j]
	})
	var b strings.Builder
	fmt.Fprintf(&b, "%d fields differ from node, over %d distinct field paths:\n", total, len(keys))
	// Every distinct path, not the top few: with the indices collapsed the path space
	// is the schema's, so this cannot run away, and a rare path is exactly the one a
	// truncated list would hide.
	for _, k := range keys {
		fmt.Fprintf(&b, "  %-56s %d\n", k, byField[k])
	}
	b.WriteString("first mismatches (definition, field, go, node):\n")
	for _, m := range mismatches {
		fmt.Fprintf(&b, "  %-28s %-52s go=%s node=%s\n", m.def, m.field, m.got, m.want)
	}
	t.Error(b.String())
}

// The corpus resolves the live JS table pulled back to what gen/definitions.json can
// express, because two kinds of value do not survive JSON.stringify. That is a defect
// in tools/dump-definitions.js, not in the merge, and it is pinned here so it cannot
// grow quietly while the merge comparison stays green. See docs/found-bugs.md #56.
//
// The third kind used to be NaN, and it was the one that changed gameplay rather than
// a low bit: it now rides across in a sentinel of its own, so wantNaN is zero. See
// docs/found-bugs.md #61.
func TestDumpCannotRepresentSomeDefinitionValues(t *testing.T) {
	corpus := loadDefsVectors(t)
	set := load(t)

	const (
		wantNaN      = 0   // carried as a __nonSerialisable sentinel since found-bug #61
		wantNegZero  = 135 // -0 -> 0
		wantHostPow  = 45  // Math.pow without tools/fdlibm-pow, so host-libm values
		wantTotalMin = 180
	)
	var nan, negZero, hostPow int
	for _, l := range corpus.DumpLosses {
		switch {
		case l.Dumped == "absent":
			nan++
		case l.Live == "-0":
			negZero++
		default:
			hostPow++
		}
	}
	if len(corpus.DumpLosses) < wantTotalMin {
		t.Fatalf("corpus records %d dump losses, want at least %d — regenerate it",
			len(corpus.DumpLosses), wantTotalMin)
	}
	if nan != wantNaN || negZero != wantNegZero || hostPow != wantHostPow {
		t.Errorf("dump losses: %d NaN, %d negative zero, %d host pow; want %d, %d, %d",
			nan, negZero, hostPow, wantNaN, wantNegZero, wantHostPow)
		for i, l := range corpus.DumpLosses {
			if i == 20 {
				t.Logf("... and %d more", len(corpus.DumpLosses)-20)
				break
			}
			t.Logf("  %s %s: live %s, dumped %s", l.Definition, l.Path, l.Live, l.Dumped)
		}
	}

	// The one that changed gameplay rather than a low bit. makeGuard and friends do
	// `output.DANGER = type.DANGER + increment` against a definition whose own DANGER
	// is undefined (it inherits one through PARENT), so 17 definitions carry a NaN
	// DANGER. entity.js:302 guards with `!= null`, which NaN passes, so the real server
	// assigns NaN and the parent's value never shows through. isNaN(e.dangerValue) then
	// makes io_nearestDifferentMaster refuse to target them at all.
	//
	// The dump used to write null there and internal/defs read null as absent, which
	// left the parent's 5 standing and made bots hunt entities the real server ignores.
	d, ok := set.Get("autoTrapper")
	if !ok {
		t.Fatal("autoTrapper is not in this dump")
	}
	v, ok := d.Danger.Get()
	if !ok {
		t.Error("autoTrapper.DANGER is absent from the dump; the JS has NaN there, and " +
			"absent inherits the parent's 5 instead")
	} else if !math.IsNaN(v) {
		t.Errorf("autoTrapper.DANGER = %v, want NaN", v)
	}
	r := resolver(t)
	if got, ok := mustResolve(t, r, "autoTrapper").DangerValue.Get(); !ok || !math.IsNaN(got) {
		t.Errorf("autoTrapper dangerValue = %v (set=%v), want NaN", got, ok)
	}
}
