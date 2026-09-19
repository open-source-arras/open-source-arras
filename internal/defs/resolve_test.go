package defs

import (
	"fmt"
	"math"
	"strings"
	"testing"

	"arrasgo/internal/jsutil"
)

// Expected values come from running the real JS against a mock this object.
func resolver(t testing.TB) *Resolver {
	t.Helper()
	r, err := NewResolver(load(t), jsutil.NewRand(1))
	if err != nil {
		t.Fatal(err)
	}
	return r
}

func mustResolve(t *testing.T, r *Resolver, name string) *Resolved {
	t.Helper()
	res, err := r.Resolve(name)
	if err != nil {
		t.Fatalf("Resolve(%q): %v", name, err)
	}
	return res
}

func eqf(t *testing.T, what string, got Opt[float64], want float64) {
	t.Helper()
	v, ok := got.Get()
	if !ok {
		t.Errorf("%s is absent, want %v", what, want)
		return
	}
	if v != want {
		t.Errorf("%s = %v, want %v", what, v, want)
	}
}

func eqs(t *testing.T, what string, got Opt[string], want string) {
	t.Helper()
	v, ok := got.Get()
	if !ok {
		t.Errorf("%s is absent, want %q", what, want)
		return
	}
	if v != want {
		t.Errorf("%s = %q, want %q", what, v, want)
	}
}

func eqb(t *testing.T, what string, got Opt[bool], want bool) {
	t.Helper()
	v, ok := got.Get()
	if !ok {
		t.Errorf("%s is absent, want %v", what, want)
		return
	}
	if v != want {
		t.Errorf("%s = %v, want %v", what, v, want)
	}
}

func absent[T any](t *testing.T, what string, got Opt[T]) {
	t.Helper()
	if v, ok := got.Get(); ok {
		t.Errorf("%s = %v, want absent", what, v)
	}
}

func checkBody(t *testing.T, b BodyStats, want map[string]float64) {
	t.Helper()
	fields := map[string]Opt[float64]{
		"ACCELERATION": b.Acceleration, "SPEED": b.Speed, "HEALTH": b.Health,
		"RESIST": b.Resist, "SHIELD": b.Shield, "REGEN": b.Regen, "DAMAGE": b.Damage,
		"PENETRATION": b.Penetration, "RANGE": b.Range, "FOV": b.FOV,
		"SHOCK_ABSORB": b.ShockAbsorb, "RECOIL_MULTIPLIER": b.RecoilMultiplier,
		"DENSITY": b.Density, "STEALTH": b.Stealth, "PUSHABILITY": b.Pushability,
		"KNOCKBACK": b.Knockback, "HETERO": b.Hetero,
	}
	for name, opt := range fields {
		w, expected := want[name]
		v, set := opt.Get()
		switch {
		case expected && !set:
			t.Errorf("BODY.%s is absent, want %v", name, w)
		case expected && v != w:
			t.Errorf("BODY.%s = %v, want %v", name, v, w)
		case !expected && set:
			t.Errorf("BODY.%s = %v, want absent", name, v)
		}
	}
}

func controllerNames(res *Resolved) []string {
	out := make([]string, 0, len(res.Controllers))
	for _, c := range res.Controllers {
		out = append(out, c.Name)
	}
	return out
}

func upgradeIndices(res *Resolved) []string {
	out := make([]string, 0, len(res.Upgrades))
	for _, u := range res.Upgrades {
		out = append(out, u.Index)
	}
	return out
}

func eqStrings(t *testing.T, what string, got, want []string) {
	t.Helper()
	if len(got) != len(want) {
		t.Errorf("%s = %v, want %v", what, got, want)
		return
	}
	for i := range got {
		if got[i] != want[i] {
			t.Errorf("%s = %v, want %v", what, got, want)
			return
		}
	}
}

// TestResolveBasic resolves basic -> genericTank, one gun, upgrades.
func TestResolveBasic(t *testing.T) {
	r := resolver(t)
	res := mustResolve(t, r, "basic")

	eqs(t, "index", res.Index, "782")
	eqs(t, "label", res.Label, "Basic")
	if got := res.Type.Must().Str; got != "tank" {
		t.Errorf("type = %q, want tank", got)
	}
	eqf(t, "shape", res.Shape, 0)
	eqf(t, "SIZE", res.Size, 12)
	eqf(t, "coreSize", res.CoreSize, 12)
	if res.Squiggle != 1 {
		t.Errorf("squiggle = %v, want 1", res.Squiggle)
	}
	if got := res.Color.Compiled(); got != "16 0 1 0 false" {
		t.Errorf("color = %q, want the untouched constructor default", got)
	}
	eqf(t, "dangerValue", res.DangerValue, 4)
	if got := res.MotionType.Must().Name; got != "motor" {
		t.Errorf("motionType = %q", got)
	}
	if got := res.FacingType.Must().Name; got != "toTarget" {
		t.Errorf("facingType = %q", got)
	}
	if res.Alpha != 1 || res.AlphaRange != [2]float64{0, 1} {
		t.Errorf("alpha = %v %v", res.Alpha, res.AlphaRange)
	}
	if res.Invisible != [2]float64{0, 0} {
		t.Errorf("invisible = %v", res.Invisible)
	}
	eqf(t, "maxChildren", res.MaxChildren, 0)
	eqb(t, "ignoredByAi", res.IgnoredByAI, false)
	eqs(t, "rerootUpgradeTree", res.RerootUpgradeTree, "basic")
	eqb(t, "isArenaCloser", res.IsArenaCloser, false)
	if res.SyncWithTank {
		t.Error("syncWithTank should be false")
	}
	absent(t, "score", res.Score)
	absent(t, "upgradeColor", res.UpgradeColor)
	absent(t, "glow", res.Glow)

	checkBody(t, res.Body, map[string]float64{
		"ACCELERATION": 1.6, "SPEED": 5.25, "HEALTH": 20, "SHIELD": 5.75,
		"REGEN": 0.01, "DAMAGE": 3, "PENETRATION": 1.05, "FOV": 1.02,
		"DENSITY": 0.5, "PUSHABILITY": 1, "HETERO": 3,
	})

	if got := res.SkillCaps.Must(); got != [10]float64{9, 9, 9, 9, 9, 9, 9, 9, 9, 9} {
		t.Errorf("skillCaps = %v", got)
	}
	absent(t, "skills", res.Skills)

	s := res.Settings
	eqb(t, "settings.drawHealth", s.DrawHealth, true)
	eqb(t, "settings.damageEffects", s.DamageEffects, false)
	eqb(t, "settings.acceptsScore", s.AcceptsScore, true)
	eqb(t, "settings.givesKillMessage", s.GivesKillMessage, true)
	eqb(t, "settings.canGoOutsideRoom", s.CanGoOutsideRoom, false)
	eqs(t, "settings.hitsOwnType", s.HitsOwnType, "hardOnlyTanks")
	eqb(t, "settings.fullyInvisible", s.FullyInvisible, false)
	eqb(t, "settings.canSeeInvisible", s.CanSeeInvisible, false)
	eqb(t, "settings.hasNoRecoil", s.HasNoRecoil, false)
	eqf(t, "settings.damageClass", s.DamageClass, 2)
	eqb(t, "settings.leaderboardable", s.Leaderboardable, true)
	eqb(t, "settings.renderOnLeaderboard", s.RenderOnLeaderboard, true)
	eqb(t, "settings.noSizeAnimation", s.NoSizeAnimation, false)
	if got, ok := s.NecroTypes.Get(); !ok || len(got) != 0 {
		t.Errorf("settings.necroTypes = %v, want empty", got)
	}
	absent(t, "settings.drawShape", s.DrawShape)
	absent(t, "settings.motionEffects", s.MotionEffects)
	absent(t, "settings.ratioEffects", s.RatioEffects)
	absent(t, "settings.variesInSize", s.VariesInSize)

	if len(res.Controllers) != 0 {
		t.Errorf("controllers = %v, want none", controllerNames(res))
	}
	if len(res.Events) != 0 {
		t.Errorf("events = %v, want none", res.Events)
	}

	eqStrings(t, "upgrade indices", upgradeIndices(res),
		[]string{"791", "789", "787", "786", "784", "788", "790", "783", "835"})
	for i, u := range res.Upgrades {
		wantTier := 1
		if i == 8 {
			wantTier = 2
		}
		if u.Tier != wantTier {
			t.Errorf("upgrade %d tier = %d, want %d", i, u.Tier, wantTier)
		}
		if u.Branch != 0 || u.RedefineAll {
			t.Errorf("upgrade %d = %+v", i, u)
		}
	}

	guns := res.Guns.Must()
	if len(guns) != 1 {
		t.Fatalf("%d guns, want 1", len(guns))
	}
	if guns[0].Position.Length.Must() != 18 || guns[0].Position.Width.Must() != 8 {
		t.Errorf("gun POSITION = %+v", guns[0].Position)
	}
	if got := guns[0].Properties.Must().Type[0].Name; got != "bullet" {
		t.Errorf("gun TYPE = %q", got)
	}
	if _, ok := res.Turrets.Get(); !ok {
		t.Error("genericTank sets TURRETS: [], so the resolved list should be present and empty")
	} else if len(res.Turrets.Must()) != 0 {
		t.Errorf("%d turrets, want 0", len(res.Turrets.Must()))
	}
}

// TestResolveTwin resolves twin to genericTank and replaces GUNS.
func TestResolveTwin(t *testing.T) {
	r := resolver(t)
	res := mustResolve(t, r, "twin")

	eqs(t, "index", res.Index, "791")
	eqs(t, "label", res.Label, "Twin")
	eqf(t, "dangerValue", res.DangerValue, 5)
	eqf(t, "SIZE", res.Size, 12)

	guns := res.Guns.Must()
	if len(guns) != 2 {
		t.Fatalf("%d guns, want 2 — GUNS replaces, it does not append", len(guns))
	}
	a, b := guns[0].Position, guns[1].Position
	if a.Length.Must() != 20 || a.Width.Must() != 8 || a.Y.Must() != 5.5 {
		t.Errorf("gun 0 POSITION = %+v", a)
	}
	if a.Angle.IsSet() || a.Delay.IsSet() {
		t.Error("only the mirrored clone gets ANGLE and DELAY")
	}
	if b.Y.Must() != -5.5 || b.Angle.Must() != 0 || b.Delay.Must() != 0.5 {
		t.Errorf("gun 1 POSITION = %+v", b)
	}

	ss := guns[0].Properties.Must().ShootSettings.Must()
	for _, c := range []struct {
		name      string
		got, want float64
	}{
		{"reload", ss.Reload.Must(), 10.5},
		{"recoil", ss.Recoil.Must(), 0.7},
		{"shudder", ss.Shudder.Must(), 0.09000000000000001},
		{"health", ss.Health.Must(), 0.9},
		{"damage", ss.Damage.Must(), 0.5249999999999999},
		{"spray", ss.Spray.Must(), 18},
	} {
		if c.got != c.want {
			t.Errorf("SHOOT_SETTINGS.%s = %v, want %v", c.name, c.got, c.want)
		}
	}

	eqStrings(t, "upgrade indices", upgradeIndices(res),
		[]string{"810", "844", "813", "816", "815", "1055", "1029", "1103"})
	for i, u := range res.Upgrades {
		want := 2
		if i >= 5 {
			want = 3
		}
		if u.Tier != want {
			t.Errorf("upgrade %d tier = %d, want %d", i, u.Tier, want)
		}
	}
}

// TestResolveGenSentrySwarm tests four-level chain and VARIES_IN_SIZE.
func TestResolveGenSentrySwarm(t *testing.T) {
	r := resolver(t)
	res := mustResolve(t, r, "genSentrySwarm")

	eqs(t, "index", res.Index, "2414")
	eqs(t, "label", res.Label, "Sentry")
	if ty := res.Type.Must(); !ty.IsList || len(ty.List) != 0 {
		t.Errorf("type = %+v, want the empty array form", ty)
	}
	eqf(t, "shape", res.Shape, 3)
	if got := res.Color.Compiled(); got != "pink 0 1 0 false" {
		t.Errorf("color = %q", got)
	}
	eqs(t, "upgradeColor", res.UpgradeColor, "pink 0 1 0 false")
	eqf(t, "dangerValue", res.DangerValue, 3)
	if got := res.FacingType.Must().Name; got != "smoothToTarget" {
		t.Errorf("facingType = %q", got)
	}
	eqb(t, "AI.NO_LEAD", res.AISettings.Must().NoLead, true)
	eqs(t, "settings.hitsOwnType", res.Settings.HitsOwnType, "hard")
	eqb(t, "settings.variesInSize", res.Settings.VariesInSize, true)

	if res.Squiggle < 0.8 || res.Squiggle >= 1.2 {
		t.Fatalf("squiggle = %v, outside [0.8, 1.2)", res.Squiggle)
	}
	eqf(t, "SIZE", res.Size, 10*res.Squiggle)
	eqf(t, "coreSize", res.CoreSize, 12)
	eqf(t, "score", res.Score, 1500*res.Squiggle)

	checkBody(t, res.Body, map[string]float64{
		"ACCELERATION": 0.75, "SPEED": 2.625, "HEALTH": 6, "SHIELD": 5.75,
		"REGEN": 0.01, "DAMAGE": 3, "PENETRATION": 1.05, "FOV": 0.5,
		"DENSITY": 0.5, "PUSHABILITY": 1, "HETERO": 3,
	})
	if got := res.Skills.Must(); got != [10]float64{5, 7, 1, 7, 9, 0, 5, 0, 6, 0} {
		t.Errorf("skills = %v", got)
	}
	eqStrings(t, "controllers", controllerNames(res),
		[]string{"nearestDifferentMaster", "mapTargetToGoal", "hangOutNearMaster"})

	guns := res.Guns.Must()
	if len(guns) != 1 {
		t.Fatalf("%d guns, want 1", len(guns))
	}
	p := guns[0].Position
	if !p.FromArray || p.Length.Must() != 7 || p.Width.Must() != 14 || p.Aspect.Must() != 0.6 ||
		p.X.Must() != 7 || p.Y.Must() != 0 || p.Angle.Must() != 180 || p.Delay.Must() != 0 {
		t.Errorf("gun POSITION = %+v", p)
	}
	if got := guns[0].Properties.Must().Type[0].Name; got != "swarm" {
		t.Errorf("gun TYPE = %q", got)
	}
}

// TestResolveToothlessBase tests defineLevelSkillPoints closure.
func TestResolveToothlessBase(t *testing.T) {
	r := resolver(t)
	res := mustResolve(t, r, "toothlessBase")

	eqs(t, "index", res.Index, "1661")
	eqs(t, "label", res.Label, "Absolute Solver")
	eqf(t, "shape", res.Shape, 3)
	eqf(t, "SIZE", res.Size, 24)
	eqf(t, "coreSize", res.CoreSize, 12)
	if got := res.Color.Compiled(); got != "purple 0 1 0 false" {
		t.Errorf("color = %q", got)
	}
	eqf(t, "levelCap", res.LevelCap, 45)
	eqf(t, "score", res.Score, 30000)

	g := res.Glow.Must()
	eqf(t, "glow.radius", g.Radius, 2)
	if got := g.Color.Compiled(); got != "#8610e6 0 1 0 false" {
		t.Errorf("glow.color = %q", got)
	}
	if g.Alpha != 1 || g.Recursion != 2 {
		t.Errorf("glow = %+v", g)
	}

	checkBody(t, res.Body, map[string]float64{
		"ACCELERATION": 1.6, "SPEED": 4.2, "HEALTH": 120, "SHIELD": 5.75,
		"REGEN": 0.01, "DAMAGE": 6, "PENETRATION": 1.05, "FOV": 1.53,
		"DENSITY": 0.5, "PUSHABILITY": 1, "HETERO": 3,
	})
	if got := res.SkillCaps.Must(); got != [10]float64{15, 15, 15, 15, 15, 15, 15, 15, 15, 15} {
		t.Errorf("skillCaps = %v", got)
	}

	f := res.LevelSkillPoints.Must()
	if f.Name != "defineLevelSkillPoints" {
		t.Errorf("LSPF name = %q", f.Name)
	}
	if len(res.Funcs) != 1 {
		t.Errorf("resolution pulled in %d unported functions, want 1", len(res.Funcs))
	}
	if err := f.Call(); err == nil {
		t.Error("an unported function must not be silently callable")
	}
}

// TestResolveJuliusDeepChain tests six-level chain.
func TestResolveJuliusDeepChain(t *testing.T) {
	r := resolver(t)
	res := mustResolve(t, r, "julius")

	eqs(t, "index", res.Index, "1601")
	eqs(t, "label", res.Label, "Rogue Celestial")
	eqs(t, "name", res.EntityName, "Julius")
	if got := res.Type.Must().Str; got != "miniboss" {
		t.Errorf("type = %q", got)
	}
	eqf(t, "shape", res.Shape, 9)
	eqf(t, "SIZE", res.Size, 45)
	eqf(t, "coreSize", res.CoreSize, 12)
	if got := res.Color.Compiled(); got != "darkGrey 0 1 0 false" {
		t.Errorf("color = %q", got)
	}
	eqs(t, "upgradeColor", res.UpgradeColor, "darkGrey 0 1 0 false")
	eqf(t, "dangerValue", res.DangerValue, 6)
	eqf(t, "level", res.Level, 45)

	fa := res.FacingType.Must()
	if fa.Name != "spin" {
		t.Errorf("facingType = %q", fa.Name)
	}
	if got := fa.Args.Speed.Must(); got != 0.02 {
		t.Errorf("facingType args speed = %v", got)
	}

	eqs(t, "settings.broadcastMessage", res.Settings.BroadcastMessage, "A visitor has left!")
	eqs(t, "settings.hitsOwnType", res.Settings.HitsOwnType, "hardOnlyBosses")
	eqb(t, "AI.NO_LEAD", res.AISettings.Must().NoLead, true)

	checkBody(t, res.Body, map[string]float64{
		"ACCELERATION": 1.6, "SPEED": 2.625, "HEALTH": 1500, "SHIELD": 75,
		"REGEN": 0.003, "DAMAGE": 12, "PENETRATION": 1.05, "FOV": 1,
		"DENSITY": 0.5, "PUSHABILITY": 0.05, "HETERO": 3,
	})
	if got := res.Skills.Must(); got != [10]float64{6, 9, 9, 9, 1, 9, 9, 9, 4, 0} {
		t.Errorf("skills = %v", got)
	}
	eqf(t, "score", res.Score, 1000000)

	eqStrings(t, "controllers", controllerNames(res),
		[]string{"nearestDifferentMaster", "canRepel", "minion"})
	if got := res.Controllers[2].Args.Turnwiserange.Must(); got != 360 {
		t.Errorf("minion turnwiserange = %v, want 360", got)
	}
	if res.Controllers[0].Args.Present() {
		t.Error("nearestDifferentMaster was written as a bare name, so it has no args object")
	}

	if len(res.Events) != 1 || res.Events[0].Event != "define" {
		t.Errorf("events = %+v, want one 'define' hook", res.Events)
	}
	if len(res.Funcs) != 1 {
		t.Errorf("%d unported functions, want 1", len(res.Funcs))
	}

	if len(res.Turrets.Must()) != 11 {
		t.Errorf("%d turrets, want 11", len(res.Turrets.Must()))
	}
}

// TestResolvePaladinTurrets tests turret resolution as resolved chains.
func TestResolvePaladinTurrets(t *testing.T) {
	r := resolver(t)
	res := mustResolve(t, r, "paladin")

	eqs(t, "index", res.Index, "1508")
	eqs(t, "label", res.Label, "Celestial")
	eqf(t, "shape", res.Shape, 9)
	eqf(t, "SIZE", res.Size, 45)
	if got := res.Color.Compiled(); got != "purple 0 1 0 false" {
		t.Errorf("color = %q", got)
	}

	turrets := res.Turrets.Must()
	if len(turrets) != 11 {
		t.Fatalf("%d turrets, want 11", len(turrets))
	}
	for i := 0; i < 9; i++ {
		p := turrets[i].Position
		if p.Size.Must() != 6.5 {
			t.Errorf("turret %d size = %v, want 6.5", i, p.Size.Must())
		}
		if want := 360.0 / 9 * (float64(i) + 0.5); p.Angle.Must() != want {
			t.Errorf("turret %d angle = %v, want %v", i, p.Angle.Must(), want)
		}
		if turrets[i].Type[0].Name != "baseTrapTurret" {
			t.Errorf("turret %d type = %q", i, turrets[i].Type[0].Name)
		}
	}
	if got := turrets[9].Position.Size.Must(); got != 14.5 {
		t.Errorf("layer 1 size = %v, want 14.5 (20 - the constructor's 5.5)", got)
	}
	if turrets[9].Type[0].Name != "paladinLayer1" {
		t.Errorf("turret 9 type = %q", turrets[9].Type[0].Name)
	}
	if got := turrets[10].Position.Size.Must(); got != 8.5 {
		t.Errorf("layer 2 size = %v, want 8.5 (14.5 - the explicit 6)", got)
	}
	if turrets[10].Type[0].Name != "paladinLayer2" {
		t.Errorf("turret 10 type = %q", turrets[10].Type[0].Name)
	}

	t0 := turrets[0].Resolved
	eqf(t, "turret 0 shape", t0.Shape, 0)
	eqf(t, "turret 0 SIZE", t0.Size, 12)
	if got := t0.Color.Compiled(); got != "grey 0 1 0 false" {
		t.Errorf("turret 0 color = %q", got)
	}
	if len(t0.Guns.Must()) != 2 {
		t.Errorf("turret 0 has %d guns, want 2", len(t0.Guns.Must()))
	}
	eqf(t, "turret 9 shape", turrets[9].Resolved.Shape, 7)
	if got := len(turrets[9].Resolved.Guns.Must()); got != 7 {
		t.Errorf("turret 9 has %d guns, want 7", got)
	}
	eqf(t, "turret 10 shape", turrets[10].Resolved.Shape, 5)

	// Turrets never get dangerValue. See found-bugs.md #13 and #42.
	for i, tu := range turrets {
		absent(t, fmt.Sprintf("turret %d dangerValue", i), tu.Resolved.DangerValue)
	}

	// turretEntity.js differs: starts from genericEntity, prefixes label, never reads settings keys.
	eqs(t, "turret 0 name", t0.EntityName, "")
	eqf(t, "turret 0 BODY.HETERO", t0.Body.Hetero, 3)
	absent(t, "turret 0 coreSize", t0.CoreSize)
	absent(t, "turret 0 score", t0.Score)
	absent(t, "turret 0 skillCaps", t0.SkillCaps)
	absent(t, "turret 0 settings.hitsOwnType", t0.Settings.HitsOwnType)
	absent(t, "turret 0 motionType", t0.MotionType)
	if t0.SyncWithTank {
		t.Error("turretEntity's define never assigns syncWithTank")
	}
	absent(t, "turret 0 settings.mirrorMasterAngle", t0.Settings.MirrorMasterAngle)
}

// TestTurretsUseTurretEntitysOwnDefine tests turretEntity's distinct define.
func TestTurretsUseTurretEntitysOwnDefine(t *testing.T) {
	r := resolver(t)

	res := mustResolve(t, r, "flagship")
	eqs(t, "flagship label", res.Label, "Flagship")
	eqs(t, "turret label", res.Turrets.Must()[0].Resolved.Label, "Flagship Unknown Entity")

	res = mustResolve(t, r, "genericHealer")
	turret := res.Turrets.Must()[0].Resolved
	eqb(t, "settings.mirrorMasterAngle", turret.Settings.MirrorMasterAngle, false)
	eqb(t, "settings.independent", turret.Settings.Independent, true)
}

// TestResolveServerPortal tests re-rolled spawn delays and ON handlers.
func TestResolveServerPortal(t *testing.T) {
	r := resolver(t)
	res := mustResolve(t, r, "serverPortal")

	eqs(t, "index", res.Index, "21")
	eqs(t, "label", res.Label, "Travel Portal")
	eqf(t, "SIZE", res.Size, 25)
	if got := res.Color.Compiled(); got != "#000000 0 1 0 false" {
		t.Errorf("color = %q", got)
	}
	checkBody(t, res.Body, map[string]float64{
		"ACCELERATION": 1.6, "SPEED": 5.25, "HEALTH": 1e100, "SHIELD": 1e100,
		"REGEN": 1e100, "DAMAGE": 0, "PENETRATION": 1.05, "FOV": 2.5,
		"DENSITY": 0, "PUSHABILITY": 0, "HETERO": 3,
	})
	if len(res.Guns.Must()) != 62 {
		t.Fatalf("%d guns, want 62", len(res.Guns.Must()))
	}
	if len(res.Turrets.Must()) != 1 {
		t.Errorf("%d turrets, want 1", len(res.Turrets.Must()))
	}
	if len(res.Events) != 1 || res.Events[0].Event != "tick" {
		t.Errorf("events = %+v, want one tick hook", res.Events)
	}
	if len(res.Funcs) != 1 {
		t.Errorf("%d unported functions on the resolution, want 1", len(res.Funcs))
	}
	for i, g := range res.Guns.Must()[:60] {
		d := g.Position.Delay.Must()
		if d < 0 || d >= 252 {
			t.Fatalf("gun %d spawn delay %v outside [0, 252)", i, d)
		}
	}
}

// TestPropsAreDroppedByThePrimaryChain tests found-bugs.md #11.
func TestPropsAreDroppedByThePrimaryChain(t *testing.T) {
	r := resolver(t)
	d, _ := r.set.Get("sphere")
	if len(d.Props.Must()) == 0 {
		t.Fatal("sphere's definition should carry PROPS entries")
	}
	res := mustResolve(t, r, "sphere")
	if len(res.Props) != 0 {
		t.Errorf("%d props resolved, want 0 — the JS drops them too", len(res.Props))
	}
	eqs(t, "index", res.Index, "95")
	eqs(t, "label", res.Label, "Sphere")
	eqs(t, "name", res.EntityName, "The Sphere")
	eqf(t, "SIZE", res.Size, 9)
	eqf(t, "score", res.Score, 10000000)
	if got := res.Color.Compiled(); got != "veryLightGrey 0 1 -15 false" {
		t.Errorf("color = %q", got)
	}
	eqStrings(t, "controllers", controllerNames(res), []string{"moveInCircles"})
}

// TestSyncWithTankIsNotInherited tests found-bugs.md #12.
func TestSyncWithTankIsNotInherited(t *testing.T) {
	r := resolver(t)
	parent, ok := r.set.Get("genericFlail")
	if !ok {
		t.Skip("genericFlail is not in this dump")
	}
	if !parent.SyncWithTank.Or(false) {
		t.Fatalf("genericFlail should set SYNC_WITH_TANK true")
	}
	child, _ := r.set.Get("flail")
	if child.SyncWithTank.IsSet() {
		t.Fatal("flail should not set SYNC_WITH_TANK of its own")
	}
	if res := mustResolve(t, r, "flail"); res.SyncWithTank {
		t.Error("the inherited true should have been overwritten with false")
	}
	if res := mustResolve(t, r, "genericFlail"); !res.SyncWithTank {
		t.Error("genericFlail itself should keep true")
	}
}

// TestDefineSplitRules tests multiply, append, concatenate, and add rules.
func TestDefineSplitRules(t *testing.T) {
	r := resolver(t)
	res, err := r.ResolveDefs(TypeList{{Name: "basic"}, {Name: "twin"}}, nil)
	if err != nil {
		t.Fatal(err)
	}
	eqs(t, "index", res.Index, "782-791")
	eqs(t, "label", res.Label, "Basic-Twin")
	if got := len(res.Guns.Must()); got != 3 {
		t.Errorf("%d guns, want 3 (branches append)", got)
	}
	eqf(t, "BODY.SPEED", res.Body.Speed, 5.25)
	eqf(t, "SIZE", res.Size, 12)
	absent(t, "maxChildren", res.MaxChildren)
}

// TestDefineSplitMultiplies tests the multiply-and-append rules.
func TestDefineSplitMultiplies(t *testing.T) {
	const doc = `{"definitions":{
		"base":  {"index":0,"LABEL":"Base","SIZE":10,"MAX_CHILDREN":3,
		          "BODY":{"SPEED":4,"HEALTH":20},
		          "GUNS":[{"POSITION":[1,2,3,4,5,6,7]}]},
		"branch":{"index":1,"LABEL":"Branch","SIZE":2,"MAX_CHILDREN":5,
		          "BODY":{"SPEED":0.5},
		          "GUNS":[{"POSITION":[8,9,1,2,3,4,5]}]}}}`
	s, err := LoadReader(strings.NewReader(doc), jsutil.NewRand(1))
	if err != nil {
		t.Fatal(err)
	}
	r, err := NewResolver(s, jsutil.NewRand(1))
	if err != nil {
		t.Fatal(err)
	}
	res, err := r.ResolveDefs(TypeList{{Name: "base"}, {Name: "branch"}}, nil)
	if err != nil {
		t.Fatal(err)
	}
	eqs(t, "index", res.Index, "0-1")
	eqs(t, "label", res.Label, "Base-Branch")
	eqf(t, "SIZE", res.Size, 20)
	eqf(t, "coreSize", res.CoreSize, 10)
	eqf(t, "BODY.SPEED", res.Body.Speed, 2)
	eqf(t, "BODY.HEALTH", res.Body.Health, 20)
	eqf(t, "maxChildren", res.MaxChildren, 8)
	if got := len(res.Guns.Must()); got != 2 {
		t.Errorf("%d guns, want 2", got)
	}

	base, _ := s.Get("base")
	base.Parent = TypeList{{Name: "branch"}}
	primary, err := r.Resolve("base")
	if err != nil {
		t.Fatal(err)
	}
	eqs(t, "primary label", primary.Label, "Base")
	eqf(t, "primary SIZE", primary.Size, 10)
	eqf(t, "primary coreSize", primary.CoreSize, 2)
	eqf(t, "primary BODY.SPEED", primary.Body.Speed, 4)
	eqf(t, "primary maxChildren", primary.MaxChildren, 3)
	if got := len(primary.Guns.Must()); got != 1 {
		t.Errorf("%d guns down the primary chain, want 1 — GUNS replaces", got)
	}
}

// TestResolveEveryDefinition verifies every definition resolves.
func TestResolveEveryDefinition(t *testing.T) {
	r := resolver(t)
	for _, name := range r.set.Names() {
		res, err := r.Resolve(name)
		if err != nil {
			t.Fatalf("Resolve(%q): %v", name, err)
		}
		if res.Index.Must() == "" {
			t.Fatalf("%s resolved without an index", name)
		}
	}
}

// TestResolverDetectsCycles tests cycle detection in inline definitions.
func TestResolverDetectsCycles(t *testing.T) {
	const doc = `{"definitions":{"a":{"index":0},"b":{"index":1}}}`
	s, err := LoadReader(strings.NewReader(doc), jsutil.NewRand(1))
	if err != nil {
		t.Fatal(err)
	}
	a, _ := s.Get("a")
	b, _ := s.Get("b")
	a.Parent = TypeList{{Inline: b}}
	b.Parent = TypeList{{Inline: a}}

	r, err := NewResolver(s, jsutil.NewRand(1))
	if err != nil {
		t.Fatal(err)
	}
	if _, err := r.Resolve("a"); err == nil || !strings.Contains(err.Error(), "cycle") {
		t.Fatalf("want a cycle error, got %v", err)
	}
}

func TestColorInterpretMergesPerChannel(t *testing.T) {
	c := newColorState(16)
	c.Interpret(ColorSpec{Kind: ColorObject, Obj: ColorObjectSpec{
		Base:            ColorValue{Num: 3, set: true},
		BrightnessShift: Some(-10.0),
	}})
	if got := c.Compiled(); got != "3 0 1 -10 false" {
		t.Fatalf("compiled = %q", got)
	}
	c.Interpret(ColorSpec{Kind: ColorObject, Obj: ColorObjectSpec{HueShift: Some(0.5)}})
	if got := c.Compiled(); got != "3 0.5 1 -10 false" {
		t.Fatalf("compiled = %q, per-channel merge lost a channel", got)
	}
	c.Interpret(ColorSpec{Kind: ColorNumber, Num: 7})
	if got := c.Compiled(); got != "7 0.5 1 -10 false" {
		t.Fatalf("compiled = %q", got)
	}
	c.Interpret(ColorSpec{Kind: ColorString, Str: "pink"})
	if got := c.Compiled(); got != "pink 0.5 1 -10 false" {
		t.Fatalf("compiled = %q", got)
	}
	c.Interpret(ColorSpec{Kind: ColorString, Str: "blue 1 2 3 true"})
	if got := c.Compiled(); got != "blue 1 2 3 true" {
		t.Fatalf("compiled = %q", got)
	}
}

func TestJSParseFloat(t *testing.T) {
	for _, c := range []struct {
		in   string
		want float64
	}{
		{"1.5", 1.5}, {"-2", -2}, {"3abc", 3}, {"1e3", 1000}, {".5", 0.5},
	} {
		if got := jsParseFloat(c.in); got != c.want {
			t.Errorf("jsParseFloat(%q) = %v, want %v", c.in, got, c.want)
		}
	}
	if !math.IsNaN(jsParseFloat("abc")) {
		t.Error("jsParseFloat should give NaN for a non-number, like JS")
	}
}

func BenchmarkResolveAll(b *testing.B) {
	r := resolver(b)
	names := r.set.Names()
	b.ReportAllocs()
	for b.Loop() {
		for _, name := range names {
			if _, err := r.Resolve(name); err != nil {
				b.Fatal(err)
			}
		}
	}
}

func BenchmarkResolveBasic(b *testing.B) {
	r := resolver(b)
	b.ReportAllocs()
	for b.Loop() {
		if _, err := r.Resolve("basic"); err != nil {
			b.Fatal(err)
		}
	}
}
