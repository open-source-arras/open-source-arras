package define

import (
	"encoding/json"
	"fmt"
	"io"
	"math"
	"os"
	"path/filepath"
	"strconv"
	"strings"
	"testing"

	"arrasgo/internal/config"
	"arrasgo/internal/ctrl"
	"arrasgo/internal/defs"
	"arrasgo/internal/entity"
	"arrasgo/internal/guns"
)

// ---------------------------------------------------------------------------

type corpusVector struct {
	Name   string         `json:"name"`
	OK     bool           `json:"ok"`
	Error  string         `json:"error"`
	Draws  int            `json:"draws"`
	Fields map[string]any `json:"fields"`
}

func corpusPath() string {
	if p := os.Getenv("ARRAS_DEFS_VECTORS"); p != "" {
		return p
	}
	return filepath.Join("..", "..", "gen", "defs-vectors.json")
}

// streamCorpus walks the vectors array one element at a time. The file is 27 MB and
func streamCorpus(t *testing.T, path string, fn func(corpusVector)) int {
	t.Helper()
	f, err := os.Open(path)
	if err != nil {
		t.Skipf("no golden vectors at %s; run `node tools/gen-defs-vectors.js` (%v)", path, err)
	}
	defer f.Close()

	dec := json.NewDecoder(f)
	if tok, err := dec.Token(); err != nil || tok != json.Delim('{') {
		t.Fatalf("%s: expected a JSON object, got %v (%v)", path, tok, err)
	}
	for dec.More() {
		key, err := dec.Token()
		if err != nil {
			t.Fatalf("%s: %v", path, err)
		}
		if key != "vectors" {
			var skip json.RawMessage
			if err := dec.Decode(&skip); err != nil {
				t.Fatalf("%s: %v", path, err)
			}
			continue
		}
		if tok, err := dec.Token(); err != nil || tok != json.Delim('[') {
			t.Fatalf("%s: vectors is not an array (%v, %v)", path, tok, err)
		}
		n := 0
		for dec.More() {
			var v corpusVector
			if err := dec.Decode(&v); err != nil && err != io.EOF {
				t.Fatalf("%s: decoding vector %d: %v", path, n, err)
			}
			fn(v)
			n++
		}
		return n
	}
	t.Fatalf("%s: no vectors array", path)
	return 0
}

// skipReasons is keyed by the corpus key with every numeric path segment replaced by
var skipReasons = map[string]string{
	"events.len":          "definitionEvents holds JS closures; gen/definitions.json cannot carry a function",
	"events.N.event":      "definitionEvents holds JS closures; gen/definitions.json cannot carry a function",
	"events.N.once":       "definitionEvents holds JS closures; gen/definitions.json cannot carry a function",
	"events.N.hasHandler": "definitionEvents holds JS closures; gen/definitions.json cannot carry a function",
	"funcs":               "a count of unported JS closures; Definer tracks it in UnportedFuncs, not on the entity",

	"type.isList":                 "entity.Entity.Type is a plain string; every array-form TYPE in this dump is empty and every reader does string equality, so it collapses to \"\"",
	"type.len":                    "entity.Entity.Type is a plain string; the array form collapses to \"\"",
	"facingType.args.independent": "entity.FacingArgs has no independent field: runFace (loaders/global.js:326-395) never reads one",

	"ai.present":        "entity.AISettings is a value with no was-assigned flag; the individual ai.* keys are compared",
	"ai.extraStats.len": "AI.extraStats is [] in every definition and read nowhere; entity.AISettings has no field",

	"controllers.N.args.present":                 "ctrl.Table stores constructed State, not the opts object",
	"controllers.N.args.distance":                "ctrl.Table stores constructed State, not the opts object",
	"controllers.N.args.independent":             "ctrl.Table stores constructed State, not the opts object",
	"controllers.N.args.leash":                   "no io_ class reads `leash`; it is inert in the JS too",
	"controllers.N.args.lockThroughWalls":        "ctrl.Table stores constructed State, not the opts object",
	"controllers.N.args.lookAtGoal":              "ctrl.Table stores constructed State, not the opts object",
	"controllers.N.args.onlyIfHasAltFireGun":     "ctrl.Table stores constructed State, not the opts object",
	"controllers.N.args.onlyWhenIdle":            "ctrl.Table stores constructed State, not the opts object",
	"controllers.N.args.orbit":                   "no io_ class reads `orbit`; io_orbit takes only `invert`",
	"controllers.N.args.repel":                   "no io_ class reads `repel`; it is inert in the JS too",
	"controllers.N.args.replicatePlayerMovement": "ctrl.Table stores constructed State, not the opts object",
	"controllers.N.args.speed":                   "ctrl.Table stores constructed State, not the opts object",
	"controllers.N.args.turnwiserange":           "ctrl.Table stores constructed State, not the opts object",
	"controllers.N.args.useOwnMaster":            "ctrl.Table stores constructed State, not the opts object",

	"guns.N.POSITION.fromArray":                "guns.Gun stores the derived placement, not the raw POSITION form",
	"guns.N.POSITION.LENGTH":                   "gun.js:104 stores LENGTH/10; multiplying back is not exact in float64",
	"guns.N.POSITION.WIDTH":                    "gun.js:105 stores WIDTH/10; multiplying back is not exact in float64",
	"guns.N.POSITION.X":                        "gun.js:107 folds X into a direction and an offset",
	"guns.N.POSITION.Y":                        "gun.js:107 folds Y into a direction and an offset",
	"guns.N.POSITION.ANGLE":                    "gun.js:106 stores the angle in radians",
	"guns.N.POSITION.DELAY":                    "gun.js:110 folds DELAY into maxCycleTimer with DELAY_SPAWN",
	"guns.N.POSITION.HEIGHT":                   "HEIGHT is read by nothing in gun.js",
	"guns.N.PROPERTIES.present":                "guns.Gun has no was-PROPERTIES-given flag; the individual keys are compared",
	"guns.N.PROPERTIES.TYPE.len":               "setBulletType flattens the TYPE list into one definition; the names are gone",
	"guns.N.PROPERTIES.TYPE.N":                 "setBulletType flattens the TYPE list into one definition; the names are gone",
	"guns.N.PROPERTIES.LABEL":                  "gun.js:76 only assigns the label inside the TYPE branch, so the raw key and the Gun's label differ for a gun with no TYPE",
	"guns.N.PROPERTIES.NO_LIMITATIONS":         "gun.js:127 ORs this with the bullet type's own, so the Gun's value is not the raw key",
	"guns.N.PROPERTIES.SHOOT_SETTINGS.present": "guns.Gun has no was-given flag; the thirteen values are compared",

	"turrets.N.defines.len": "the TYPE list a turret was defined from is not kept on the turret entity",
	"turrets.N.defines.N":   "the TYPE list a turret was defined from is not kept on the turret entity",
}

// presentOnly are keys whose absence from the corpus says something about the mock
var presentOnly = map[string]string{
	"team":             "entity.js:99-100 sets team from the master; the corpus mock leaves it undefined",
	"allowedOnMinimap": "entity.js:74 sets it true; the corpus mock leaves it undefined",
	"level":            "present only when a LEVEL block ran; skill.level is otherwise the live ladder's, not a merge outcome",
	"score":            "present only when a VALUE block ran; skill.score is otherwise the live ladder's",
	"extraSkill":       "the corpus records internal/defs' ExtraSkill accumulator, whose 0 means \"no EXTRA_SKILL\", not \"the entity has no skill points\"",
}

// classify normalises a corpus key into the shape the exemption tables are written
func classify(key string) string {
	parts := strings.Split(key, ".")
	for i, p := range parts {
		if _, err := strconv.Atoi(p); err == nil {
			parts[i] = "N"
		}
	}
	shape := strings.Join(parts, ".")
	for strings.HasPrefix(shape, turretPrefix+turretPrefix) {
		shape = strings.TrimPrefix(shape, turretPrefix)
	}
	return shape
}

const turretPrefix = "turrets.N.res."

// matchShape looks a shape up first as it is, then with its turret prefix removed. An
func matchShape[T any](m map[string]T, shape string) (string, T, bool) {
	if v, ok := m[shape]; ok {
		return shape, v, true
	}
	if bare := strings.TrimPrefix(shape, turretPrefix); bare != shape {
		if v, ok := m[bare]; ok {
			return bare, v, true
		}
	}
	var zero T
	return "", zero, false
}

// ---------------------------------------------------------------------------

type flat map[string]any

// jsNum tags a float64 the way the generator's num() does, so a NaN, an infinity or a
func jsNum(v float64) any {
	switch {
	case math.IsNaN(v):
		return "NaN"
	case math.IsInf(v, 1):
		return "Infinity"
	case math.IsInf(v, -1):
		return "-Infinity"
	case v == 0 && math.Signbit(v):
		return "-0"
	}
	return v
}

type harness struct {
	t       *testing.T
	set     *defs.Set
	tuning  *config.Tuning
	names   map[int32]string
	skipSet map[string]bool
}

func (h *harness) putNum(out flat, key string, v float64) { out[key] = jsNum(v) }

// flattenEntity mirrors the generator's serialise(), field for field, reading a live
func (h *harness) flattenEntity(w *entity.World, gunTable *guns.Table, ctrlTable *ctrl.Table, id entity.EntityID, prefix string, out flat) {
	e := w.Get(id)
	if e == nil {
		return
	}
	p := func(k string) string { return prefix + k }

	out[p("index")] = e.Index
	out[p("name")] = e.Name
	out[p("label")] = e.Label
	out[p("displayName")] = e.DisplayName
	out[p("type.str")] = e.Type
	h.putNum(out, p("walltype"), float64(e.Walltype))
	h.putNum(out, p("layerID"), float64(e.LayerID))
	h.putNum(out, p("angle"), e.Angle)
	out[p("branchLabel")] = e.BranchLabel
	out[p("upgradeColor")] = e.UpgradeColor

	h.putNum(out, p("shape"), e.Shape)
	switch e.ShapeData.Kind {
	case entity.ShapeNumber:
		out[p("shapeData.kind")] = "number"
		h.putNum(out, p("shapeData.num"), e.ShapeData.Number)
	case entity.ShapeString:
		out[p("shapeData.kind")] = "string"
		out[p("shapeData.str")] = e.ShapeData.String
	case entity.ShapePolygon:
		out[p("shapeData.kind")] = "polygon"
		h.putNum(out, p("shapeData.len"), float64(len(e.ShapeData.Polygon)))
	}
	out[p("color")] = e.Color.Compiled
	if e.Glow.HasRadius {
		h.putNum(out, p("glow.radius"), e.Glow.Radius)
		out[p("glow.color")] = e.Glow.Color
		h.putNum(out, p("glow.alpha"), e.Glow.Alpha)
		h.putNum(out, p("glow.recursion"), e.Glow.Recursion)
	}
	h.putNum(out, p("alpha"), e.Alpha)
	h.putNum(out, p("alphaRange.0"), e.AlphaRange[0])
	h.putNum(out, p("alphaRange.1"), e.AlphaRange[1])
	h.putNum(out, p("invisible.0"), e.Invisible[0])
	h.putNum(out, p("invisible.1"), e.Invisible[1])
	out[p("borderless")] = e.Borderless
	out[p("drawFill")] = e.DrawFill

	if e.MotionType != "" {
		out[p("motionType.name")] = e.MotionType
		if e.MotionTypeArgs.HasSpeed {
			h.putNum(out, p("motionType.args.speed"), e.MotionTypeArgs.Speed)
		}
		if e.MotionTypeArgs.HasDamp {
			h.putNum(out, p("motionType.args.damp"), e.MotionTypeArgs.Damp)
		}
		if e.MotionTypeArgs.HasTurnVelocity {
			h.putNum(out, p("motionType.args.turnVelocity"), e.MotionTypeArgs.TurnVelocity)
		}
	}
	if e.FacingType != "" {
		out[p("facingType.name")] = e.FacingType
		if e.FacingTypeArgs.HasAngle {
			h.putNum(out, p("facingType.args.angle"), e.FacingTypeArgs.Angle)
		}
		if e.FacingTypeArgs.HasSmoothness {
			h.putNum(out, p("facingType.args.smoothness"), e.FacingTypeArgs.Smoothness)
		}
		if e.FacingTypeArgs.HasSpeed {
			h.putNum(out, p("facingType.args.speed"), e.FacingTypeArgs.Speed)
		}
	}

	h.putNum(out, p("controllers.len"), float64(len(e.Controllers)))
	for i, cid := range e.Controllers {
		out[p(fmt.Sprintf("controllers.%d.name", i))] = ctrlTable.Kind(cid).String()
	}

	ai := e.AISettings
	out[p("ai.BLIND")] = ai.BLIND
	out[p("ai.CHASE")] = ai.CHASE
	out[p("ai.FARMER")] = ai.FARMER
	out[p("ai.FULL_VIEW")] = ai.FULL_VIEW
	out[p("ai.IGNORE_SHAPES")] = ai.IGNORE_SHAPES
	out[p("ai.NO_LEAD")] = ai.NO_LEAD
	out[p("ai.SKYNET")] = ai.SKYNET
	out[p("ai.STRAFE")] = ai.STRAFE
	out[p("ai.chase")] = ai.Chase
	out[p("ai.independent")] = ai.Independent
	if ai.HasSPEED {
		h.putNum(out, p("ai.SPEED"), ai.SPEED)
	}
	out[p("ignoredByAi")] = e.IgnoredByAI
	out[p("allowedOnMinimap")] = e.AllowedOnMinimap

	h.putNum(out, p("body.ACCELERATION"), e.ACCELERATION)
	h.putNum(out, p("body.SPEED"), e.SPEED)
	h.putNum(out, p("body.HEALTH"), e.HEALTH)
	h.putNum(out, p("body.RESIST"), e.RESIST)
	h.putNum(out, p("body.SHIELD"), e.SHIELD)
	h.putNum(out, p("body.REGEN"), e.REGEN)
	h.putNum(out, p("body.DAMAGE"), e.DAMAGE)
	h.putNum(out, p("body.PENETRATION"), e.PENETRATION)
	h.putNum(out, p("body.RANGE"), e.RANGE)
	h.putNum(out, p("body.FOV"), e.FOV)
	h.putNum(out, p("body.SHOCK_ABSORB"), e.SHOCK_ABSORB)
	h.putNum(out, p("body.RECOIL_MULTIPLIER"), e.RECOIL_MULTIPLIER)
	h.putNum(out, p("body.DENSITY"), e.DENSITY)
	h.putNum(out, p("body.STEALTH"), e.STEALTH)
	h.putNum(out, p("body.PUSHABILITY"), e.PUSHABILITY)
	h.putNum(out, p("body.KNOCKBACK"), e.KNOCKBACK)
	h.putNum(out, p("body.HETERO"), e.HeteroMultiplier)

	h.putNum(out, p("dangerValue"), e.DangerValue)
	out[p("intangibility")] = e.Intangibility != 0
	out[p("healer")] = e.Healer
	out[p("immuneToTiles")] = e.ImmuneToTiles
	h.putNum(out, p("autospinBoost"), e.AutospinBoost)
	h.putNum(out, p("team"), float64(e.Team))

	h.putNum(out, p("SIZE"), e.SIZE)
	h.putNum(out, p("coreSize"), e.CoreSize)
	h.putNum(out, p("squiggle"), e.Squiggle)

	h.putNum(out, p("guns.len"), float64(len(e.Guns)))
	for i, gid := range e.Guns {
		g := gunTable.Get(gid)
		if g == nil {
			continue
		}
		h.flattenGun(out, fmt.Sprintf("%sguns.%d.", prefix, i), g)
	}
	h.putNum(out, p("props.len"), float64(len(e.Props)))

	h.putNum(out, p("turrets.len"), float64(len(e.Turrets)))
	for i, tid := range e.Turrets {
		te := w.Get(tid)
		if te == nil {
			continue
		}
		tp := fmt.Sprintf("%sturrets.%d.", prefix, i)
		h.putNum(out, tp+"bound.size", te.Bound.Size)
		h.putNum(out, tp+"bound.angle", te.Bound.Angle)
		h.putNum(out, tp+"bound.direction", te.Bound.Direction)
		h.putNum(out, tp+"bound.offset", te.Bound.Offset)
		h.putNum(out, tp+"bound.arc", te.Bound.Arc)
		h.putNum(out, tp+"bound.layer", float64(te.Bound.Layer))
		out[tp+"collidingBond"] = te.CollidingBond
		h.flattenEntity(w, gunTable, ctrlTable, tid, tp+"res.", out)
	}

	h.putNum(out, p("maxChildren"), float64(e.MaxChildren))
	if e.HasMaxBullets {
		h.putNum(out, p("maxBullets"), float64(e.MaxBullets))
	}
	out[p("shootOnDeath")] = e.ShootOnDeath

	h.putNum(out, p("level"), float64(e.Skill.Level))
	if e.HasLevelCap {
		h.putNum(out, p("levelCap"), float64(e.LevelCap))
	}
	for i := 0; i < entity.SkillCount; i++ {
		h.putNum(out, p(fmt.Sprintf("skillCaps.%d", i)), float64(e.Skill.Caps[i]))
		h.putNum(out, p(fmt.Sprintf("skills.%d", i)), float64(e.Skill.Raw[i]))
	}
	h.putNum(out, p("extraSkill"), float64(e.Skill.Points))
	h.putNum(out, p("score"), e.Skill.Score)
	out[p("lspf")] = e.Skill.LSPF != nil

	h.putNum(out, p("upgrades.len"), float64(len(e.Upgrades)))
	for i, u := range e.Upgrades {
		up := fmt.Sprintf("%supgrades.%d.", prefix, i)
		out[up+"index"] = u.Index
		h.putNum(out, up+"tier", float64(u.Tier))
		h.putNum(out, up+"branch", float64(u.Branch))
		out[up+"branchLabel"] = u.BranchLabel
		out[up+"redefineAll"] = u.RedefineAll
		h.putNum(out, up+"classes.len", float64(len(u.Class)))
		for j, ord := range u.Class {
			out[fmt.Sprintf("%sclasses.%d", up, j)] = h.names[ord]
		}
	}
	out[p("batchUpgrades")] = e.BatchUpgrades
	out[p("isArenaCloser")] = e.IsArenaCloser
	out[p("rerootUpgradeTree")] = e.RerootUpgradeTree
	out[p("syncWithTank")] = e.SyncWithTank

	s := &e.Settings
	out[p("settings.no_collisions")] = s.NoCollisions
	out[p("settings.drawHealth")] = s.DrawHealth
	out[p("settings.drawShape")] = s.DrawShape
	out[p("settings.damageEffects")] = s.DamageEffects
	out[p("settings.ratioEffects")] = s.RatioEffects
	out[p("settings.motionEffects")] = s.MotionEffects
	out[p("settings.acceptsScore")] = s.AcceptsScore
	out[p("settings.givesKillMessage")] = s.GivesKillMessage
	out[p("settings.canGoOutsideRoom")] = s.CanGoOutsideRoom
	out[p("settings.diesAtLowSpeed")] = s.DiesAtLowSpeed
	out[p("settings.diesAtRange")] = s.DiesAtRange
	out[p("settings.independent")] = s.Independent
	out[p("settings.persistsAfterDeath")] = s.PersistsAfterDeath
	out[p("settings.clearOnMasterUpgrade")] = s.ClearOnMasterUpgrade
	out[p("settings.healthWithLevel")] = s.HealthWithLevel
	out[p("settings.obstacle")] = s.Obstacle
	out[p("settings.fullyInvisible")] = s.FullyInvisible
	out[p("settings.canSeeInvisible")] = s.CanSeeInvisible
	out[p("settings.hasNoRecoil")] = s.HasNoRecoil
	out[p("settings.attentionCraver")] = s.AttentionCraver
	out[p("settings.defeatMessage")] = s.DefeatMessage
	out[p("settings.buffVsFood")] = s.BuffVsFood
	out[p("settings.leaderboardable")] = s.Leaderboardable
	out[p("settings.renderOnLeaderboard")] = s.RenderOnLeaderboard
	out[p("settings.reloadToAcceleration")] = s.ReloadToAcceleration
	out[p("settings.variesInSize")] = s.VariesInSize
	out[p("settings.noSizeAnimation")] = s.NoSizeAnimation
	out[p("settings.connectChildrenOnCamera")] = s.ConnectChildrenOnCamera
	out[p("settings.hitsOwnType")] = s.HitsOwnType
	out[p("settings.killMessage")] = s.KillMessage
	out[p("settings.broadcastMessage")] = s.BroadcastMessage
	h.putNum(out, p("settings.damageClass"), float64(s.DamageClass))
	out[p("settings.mirrorMasterAngle")] = s.MirrorMasterAngle
	if s.HasSmoothness {
		h.putNum(out, p("settings.smoothness"), s.Smoothness)
	}
	if s.HasSkillNames {
		out[p("settings.skillNames.body_damage")] = s.SkillNames[entity.SkillAtk]
		out[p("settings.skillNames.max_health")] = s.SkillNames[entity.SkillHlt]
		out[p("settings.skillNames.bullet_speed")] = s.SkillNames[entity.SkillSpd]
		out[p("settings.skillNames.bullet_health")] = s.SkillNames[entity.SkillStr]
		out[p("settings.skillNames.bullet_pen")] = s.SkillNames[entity.SkillPen]
		out[p("settings.skillNames.bullet_damage")] = s.SkillNames[entity.SkillDam]
		out[p("settings.skillNames.reload")] = s.SkillNames[entity.SkillRld]
		out[p("settings.skillNames.move_speed")] = s.SkillNames[entity.SkillMob]
		out[p("settings.skillNames.shield_regen")] = s.SkillNames[entity.SkillRgn]
		out[p("settings.skillNames.shield_cap")] = s.SkillNames[entity.SkillShi]
	}
	if s.NecroTypes != nil {
		h.putNum(out, p("settings.necroTypes.len"), float64(len(s.NecroTypes)))
		for i, v := range s.NecroTypes {
			h.putNum(out, p(fmt.Sprintf("settings.necroTypes.%d", i)), float64(v))
		}
	}
	if s.ShakeProperties != nil {
		h.putNum(out, p("settings.shakeProperties.len"), float64(len(s.ShakeProperties)))
		for i, sp := range s.ShakeProperties {
			sk := fmt.Sprintf("%ssettings.shakeProperties.%d.", prefix, i)
			out[sk+"type"] = sp.Type
			h.putNum(out, sk+"duration", sp.Duration)
			h.putNum(out, sk+"amount", sp.Amount)
			out[sk+"keepShake"] = sp.KeepShake
			out[sk+"push"] = sp.Push
			out[sk+"applyOn.upgrade"] = sp.ApplyOnUpgrade
			out[sk+"applyOn.shoot"] = sp.ApplyOnShoot
		}
	}
}

// flattenGun emits the gun fields that map onto a built guns.Gun without a lossy
func (h *harness) flattenGun(out flat, prefix string, g *guns.Gun) {
	h.putNum(out, prefix+"POSITION.ASPECT", g.Aspect)
	h.putNum(out, prefix+"POSITION.LAYER", float64(g.Layer))

	h.putNum(out, prefix+"PROPERTIES.ALPHA", g.Alpha)
	h.putNum(out, prefix+"PROPERTIES.STROKE_WIDTH", g.StrokeWidth)
	h.putNum(out, prefix+"PROPERTIES.SPAWN_OFFSET", g.SpawnOffset)
	h.putNum(out, prefix+"PROPERTIES.MAX_CHILDREN", g.CountsOwnKids)
	out[prefix+"PROPERTIES.AUTOFIRE"] = g.Autofire
	out[prefix+"PROPERTIES.ALT_FIRE"] = g.AltFire
	out[prefix+"PROPERTIES.FIXED_RELOAD"] = g.FixedReload
	out[prefix+"PROPERTIES.WAIT_TO_CYCLE"] = g.WaitToCycle
	out[prefix+"PROPERTIES.DELAY_SPAWN"] = g.DelaySpawn
	out[prefix+"PROPERTIES.SYNCS_SKILLS"] = g.SyncsSkills
	out[prefix+"PROPERTIES.NEGATIVE_RECOIL"] = g.NegRecoil
	out[prefix+"PROPERTIES.INDEPENDENT_CHILDREN"] = g.IndependentChildren
	out[prefix+"PROPERTIES.INDEPENDENT_MASTER"] = g.IndependentMaster
	out[prefix+"PROPERTIES.SHOOT_ON_DEATH"] = g.ShootOnDeath
	out[prefix+"PROPERTIES.DESTROY_OLDEST_CHILD"] = g.DestroyOldestChild
	out[prefix+"PROPERTIES.DRAW_ABOVE"] = g.DrawAbove
	out[prefix+"PROPERTIES.BORDERLESS"] = g.Borderless
	out[prefix+"PROPERTIES.DRAW_FILL"] = g.DrawFill
	out[prefix+"PROPERTIES.STAT_CALCULATOR"] = g.Calculator
	out[prefix+"PROPERTIES.COLOR"] = g.Color.Compiled
	if g.HasIdentifier {
		out[prefix+"PROPERTIES.IDENTIFIER.isString"] = g.Identifier.IsString
		if g.Identifier.IsString {
			out[prefix+"PROPERTIES.IDENTIFIER"] = g.Identifier.Str
		} else {
			h.putNum(out, prefix+"PROPERTIES.IDENTIFIER", g.Identifier.Num)
		}
	}

	ss := prefix + "PROPERTIES.SHOOT_SETTINGS."
	h.putNum(out, ss+"reload", g.Settings.Reload)
	h.putNum(out, ss+"recoil", g.Settings.Recoil)
	h.putNum(out, ss+"shudder", g.Settings.Shudder)
	h.putNum(out, ss+"size", g.Settings.Size)
	h.putNum(out, ss+"health", g.Settings.Health)
	h.putNum(out, ss+"damage", g.Settings.Damage)
	h.putNum(out, ss+"pen", g.Settings.Pen)
	h.putNum(out, ss+"speed", g.Settings.Speed)
	h.putNum(out, ss+"maxSpeed", g.Settings.MaxSpeed)
	h.putNum(out, ss+"range", g.Settings.Range)
	h.putNum(out, ss+"density", g.Settings.Density)
	h.putNum(out, ss+"spray", g.Settings.Spray)
	h.putNum(out, ss+"resist", g.Settings.Resist)
}
