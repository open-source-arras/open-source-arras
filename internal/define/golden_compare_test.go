package define

import (
	"fmt"
	"math"
	"sort"
	"strings"
	"testing"

	"arrasgo/internal/config"
	"arrasgo/internal/ctrl"
	"arrasgo/internal/defs"
	"arrasgo/internal/entity"
	"arrasgo/internal/guns"
	"arrasgo/internal/jsutil"
)

// sameValue is an exact comparison including ±0 and NaN distinction.
func sameValue(got, want any) bool {
	switch w := want.(type) {
	case float64:
		g, ok := got.(float64)
		return ok && math.Float64bits(g) == math.Float64bits(w)
	case string:
		g, ok := got.(string)
		return ok && g == w
	case bool:
		g, ok := got.(bool)
		return ok && g == w
	case nil:
		return got == nil
	}
	return false
}

func show(v any) string {
	switch t := v.(type) {
	case float64:
		return fmt.Sprintf("%v", t)
	case string:
		return fmt.Sprintf("%q", t)
	case nil:
		return "<missing>"
	}
	return fmt.Sprintf("%v", v)
}

// mismatch is one disagreement, reported with everything needed to go and look.
type mismatch struct {
	def, key  string
	got, want any
	note      string
}

// upstreamGaps are real disagreements with the JS owned by other packages.
var upstreamGaps = map[string]gap{
	"turrets.N.res.drawFill": {
		"internal/guns: NewTurret does not apply turretEntity.js:14-15's `borderless = false; drawFill = true`, " +
			"which the real turretEntity constructor sets before its define and which turretEntity.js's define never assigns",
		1400},
	"layerID": {
		"internal/entity: Entity.LayerID is int32 and 70 definitions set LAYER: 1e99 as an always-on-top sentinel, " +
			"which overflows to the most negative int32 -- the exact opposite ordering",
		80},
	"lspf": {
		"internal/defs: defineLevelSkillPoints is a JS closure and gen/definitions.json cannot carry a function, so " +
			"Skill.LSPF stays nil; Definer.UnportedFuncs counts it instead",
		5},
}

// corpusBlind are disagreements the corpus cannot show because it records incomplete state.
var corpusBlind = map[string]gap{
	"turrets.N.res.facingType.name": {
		"the corpus captures a turret at the end of its define, before entity.js:482's fixFacing; this port runs " +
			"the whole block, and fixFacing rewrites a Target/Speed facing to \"bound\"",
		4200},
	"angle": {
		"every io_ class is a recorder in the corpus, so no controller constructor's side effects run; " +
			"io_whirlwind's (controllers.js:1087) sets `this.body.angle = 0` over whatever ANGLE just wrote, " +
			"and this port constructs the real controller",
		30},
}

// gap is one explained disagreement: why, and how many definitions it may touch.
type gap struct {
	reason  string
	maxDefs int
}

// knownDefineErrors are definitions this port refuses that the JS accepts.
var knownDefineErrors = map[string]gap{
	`controller "turretWithMotion"`: {
		"internal/ctrl: `turretWithMotion` is registered as an ioType by a definition group " +
			"(lib/definitions/groups/testing.js:635) rather than by miscFiles/controllers.js, so ctrl's " +
			"32 kinds do not include it",
		5},
}

// squiggleDependent are fields the corpus cannot state correctly.
var squiggleDependent = map[string]bool{"SIZE": true, "coreSize": true, "score": true}

func TestDefineMatchesNode(t *testing.T) {
	set, err := defs.Load(jsutil.NewRand(1))
	if err != nil {
		t.Fatalf("loading definitions: %v", err)
	}
	tuning, err := config.Default()
	if err != nil {
		t.Fatalf("loading config: %v", err)
	}

	names := make(map[int32]string, set.Len())
	for _, n := range set.Names() {
		if d, ok := set.Get(n); ok {
			if idx, ok := d.Index.Get(); ok {
				names[int32(idx)] = n
			}
		}
	}
	h := &harness{t: t, set: set, tuning: &tuning, names: names}

	baseline := h.spawnBaseline()

	var (
		definitions   int
		defined       int
		defineErrors  []mismatch
		compared      int
		comparedShape = map[string]int{}
		skipped       = map[string]int{}
		mockGaps      = map[string]int{}
		unchecked     = map[string]int{}
		mismatches    []mismatch
		drawsChecked  int
		expectedFails int
	)

	streamCorpus(t, corpusPath(), func(vec corpusVector) {
		definitions++

		w := entity.NewWorld(64)
		w.Tuning = &tuning
		w.Now = func() int64 { return 0 }
		gunTable := guns.NewTable(64)
		ctrlTable := ctrl.NewTable(16)
		rng := jsutil.NewRand(1)
		d, err := New(Config{
			Defs: set, Guns: gunTable, Ctrl: ctrlTable, Tuning: &tuning, Rand: rng,
			HasSocket: func(entity.EntityID) bool { return true },
		})
		if err != nil {
			t.Fatalf("New: %v", err)
		}

		id := w.Spawn()
		err = d.Define(w, id, vec.Name)

		if !vec.OK {
			// The JS threw. Class.rcs names a controller that is not in ioTypes and
			// entity.js:227 rethrows. This port returns the same refusal as an error.
			expectedFails++
			if err == nil {
				mismatches = append(mismatches, mismatch{def: vec.Name, key: "<define>",
					got: "no error", want: vec.Error, note: "the JS threw here and Go did not"})
			}
			return
		}
		if err != nil {
			defineErrors = append(defineErrors, mismatch{def: vec.Name, key: "<define>", got: err.Error()})
			return
		}
		defined++

		got := flat{}
		h.flattenEntity(w, gunTable, ctrlTable, id, "", got)

		for key, want := range vec.Fields {
			shape := classify(key)
			if hit, _, ok := matchShape(skipReasons, shape); ok {
				skipped[hit]++
				continue
			}
			if squiggleDependent[key] {
				if s, ok := want.(string); ok && s == "NaN" {
					mockGaps[key]++
					continue
				}
			}
			if strings.HasSuffix(key, "extraSkill") {
				if v, ok := want.(float64); ok && v == 0 {
					skipped["extraSkill(zero)"]++
					continue
				}
			}
			if idx, ok := skillSlotIndex(key); ok {
				want = clampToCap(vec.Fields, key, idx, want, tuning.SkillCap)
			}

			g, present := got[key]
			if !present {
				mismatches = append(mismatches, mismatch{def: vec.Name, key: key,
					got: nil, want: want, note: "the Go entity carries no such field"})
				continue
			}
			if !sameValue(g, want) {
				mismatches = append(mismatches, mismatch{def: vec.Name, key: key, got: g, want: want})
				continue
			}
			compared++
			comparedShape[shape]++
		}

		for key, g := range got {
			if _, inCorpus := vec.Fields[key]; inCorpus {
				continue
			}
			shape := classify(key)
			if _, _, ok := matchShape(presentOnly, shape); ok {
				continue
			}
			if _, _, ok := matchShape(skipReasons, shape); ok {
				continue
			}
			if key == "squiggle" {
				mockGaps[key]++
				continue
			}
			want, ok := baseline[key]
			if !ok {
				unchecked[shape]++
				continue
			}
			if !sameValue(g, want) {
				mismatches = append(mismatches, mismatch{def: vec.Name, key: key, got: g, want: want,
					note: "the JS never assigned this field, so it should still hold its spawn value"})
				continue
			}
			compared++
			comparedShape[shape]++
		}

		if !hasWanderAroundMap(vec.Fields) {
			drawsChecked++
			if uint64(vec.Draws) != rng.Calls() {
				mismatches = append(mismatches, mismatch{def: vec.Name, key: "<rng draws>",
					got: float64(rng.Calls()), want: float64(vec.Draws),
					note: "the two sides drew a different number of random values"})
			}
		}
	})

	gapDefs := map[string]map[string]bool{}
	blindDefs := map[string]map[string]bool{}
	var mine []mismatch
	for _, m := range mismatches {
		shape := classify(m.key)
		if hit, _, ok := matchShape(upstreamGaps, shape); ok {
			record(gapDefs, hit, m.def)
			continue
		}
		if hit, _, ok := matchShape(corpusBlind, shape); ok {
			record(blindDefs, hit, m.def)
			continue
		}
		mine = append(mine, m)
	}
	var unexplainedErrors []mismatch
	errorDefs := map[string]map[string]bool{}
	for _, e := range defineErrors {
		text, _ := e.got.(string)
		matched := false
		for needle := range knownDefineErrors {
			if strings.Contains(text, needle) {
				record(errorDefs, needle, e.def)
				matched = true
				break
			}
		}
		if !matched {
			unexplainedErrors = append(unexplainedErrors, e)
		}
	}

	t.Logf("definitions in corpus: %d, defined: %d, JS threw on: %d", definitions, defined, expectedFails)
	t.Logf("field comparisons: %d across %d distinct key shapes", compared, len(comparedShape))
	t.Logf("rng draw counts compared on %d definitions", drawsChecked)

	logCounts(t, "skipped %d field comparisons over %d key shapes an entity.Entity cannot answer", skipped, skipReasons)
	logCounts(t, "skipped %d comparisons over %d keys the corpus cannot state a value for", mockGaps, nil)
	logCounts(t, "%d Go fields over %d shapes had no corpus counterpart and no spawn value to fall back on", unchecked, nil)

	logGaps(t, "real disagreements with the JS, owned by another package", gapDefs, upstreamGaps)
	logGaps(t, "disagreements the corpus cannot show, because it records a state the game never reaches", blindDefs, corpusBlind)
	logGaps(t, "definitions this port refuses that the JS accepts", errorDefs, knownDefineErrors)

	for _, e := range unexplainedErrors {
		t.Errorf("%s: Define returned an error the JS did not: %v", e.def, e.got)
	}

	if len(mine) > 0 {
		byShape := map[string]int{}
		for _, m := range mine {
			byShape[classify(m.key)]++
		}
		t.Errorf("%d field mismatches over %d key shapes", len(mine), len(byShape))
		for _, k := range sortedKeys(byShape) {
			t.Errorf("    %-52s %6d", k, byShape[k])
		}
		shown := map[string]int{}
		for _, m := range mine {
			shape := classify(m.key)
			if shown[shape] >= 4 {
				continue
			}
			shown[shape]++
			note := ""
			if m.note != "" {
				note = "  (" + m.note + ")"
			}
			t.Errorf("  %s: %s = %s, node has %s%s", m.def, m.key, show(m.got), show(m.want), note)
		}
	}

	if definitions < 2400 {
		t.Fatalf("only %d definitions in the corpus; expected all 2,492", definitions)
	}
	if defined < 2400 {
		t.Fatalf("only %d definitions could be defined; the comparison below covers almost nothing", defined)
	}
	if compared < 500000 {
		t.Fatalf("only %d field comparisons; the corpus carries over 700,000 fields, so this is not exercising it", compared)
	}
	if len(comparedShape) < 150 {
		t.Fatalf("only %d distinct key shapes compared; the corpus has 674", len(comparedShape))
	}
	for _, must := range []string{
		"index", "label", "color", "SIZE",
		"body.SPEED", "body.HEALTH", "settings.hitsOwnType", "settings.damageClass",
		"skillCaps.N", "skills.N", "level",
		"guns.len", "guns.N.PROPERTIES.SHOOT_SETTINGS.reload",
		"turrets.len", "turrets.N.bound.size",
		"upgrades.N.index", "upgrades.N.classes.N",
		"controllers.len", "controllers.N.name",
		"motionType.name", "facingType.name", "ai.NO_LEAD",
		"settings.necroTypes.len", "glow.radius", "rerootUpgradeTree", "syncWithTank",
		"turrets.N.res.body.HEALTH", "turrets.N.res.guns.len",
	} {
		if comparedShape[must] == 0 {
			t.Errorf("no definition ever compared %q; that part of define() is unverified", must)
		}
	}
	if drawsChecked < 100 {
		t.Errorf("rng draw counts compared on only %d definitions", drawsChecked)
	}
}

func hasWanderAroundMap(fields map[string]any) bool {
	for k, v := range fields {
		if !strings.HasSuffix(k, ".name") || !strings.Contains(k, "controllers.") {
			continue
		}
		if s, ok := v.(string); ok && s == "wanderAroundMap" {
			return true
		}
	}
	return false
}

func skillSlotIndex(key string) (int, bool) {
	i := strings.LastIndex(key, "skills.")
	if i < 0 || (i > 0 && key[i-1] != '.') {
		return 0, false
	}
	rest := key[i+len("skills."):]
	if strings.Contains(rest, ".") {
		return 0, false
	}
	var n int
	if _, err := fmt.Sscanf(rest, "%d", &n); err != nil {
		return 0, false
	}
	return n, true
}

func clampToCap(fields map[string]any, key string, slot int, want any, defaultCap int) any {
	v, ok := want.(float64)
	if !ok {
		return want
	}
	capValue := float64(defaultCap)
	capKey := strings.TrimSuffix(key, fmt.Sprintf("skills.%d", slot)) + fmt.Sprintf("skillCaps.%d", slot)
	if c, ok := fields[capKey].(float64); ok {
		capValue = c
	}
	if v > capValue {
		return capValue
	}
	return v
}

func (h *harness) spawnBaseline() flat {
	w := entity.NewWorld(4)
	w.Tuning = h.tuning
	w.Now = func() int64 { return 0 }
	id := w.Spawn()
	out := flat{}
	h.flattenEntity(w, guns.NewTable(1), ctrl.NewTable(1), id, "", out)
	return out
}

func logCounts(t *testing.T, header string, counts map[string]int, reasons map[string]string) {
	t.Helper()
	n := 0
	for _, v := range counts {
		n += v
	}
	if n == 0 {
		return
	}
	t.Logf(header+":", n, len(counts))
	for _, k := range sortedKeys(counts) {
		if reasons != nil {
			t.Logf("    %-52s %6d   %s", k, counts[k], reasons[k])
		} else {
			t.Logf("    %-52s %6d", k, counts[k])
		}
	}
}

func sortedKeys(m map[string]int) []string {
	out := make([]string, 0, len(m))
	for k := range m {
		out = append(out, k)
	}
	sort.Strings(out)
	return out
}

func record(m map[string]map[string]bool, key, def string) {
	if m[key] == nil {
		m[key] = map[string]bool{}
	}
	m[key][def] = true
}

// logGaps prints an explained-disagreement table.
func logGaps(t *testing.T, header string, hits map[string]map[string]bool, table map[string]gap) {
	t.Helper()
	for key, g := range table {
		if len(hits[key]) == 0 {
			t.Errorf("the exemption for %q fired on no definition: the gap is closed (%s). "+
				"Delete the entry so the field is guarded by the ordinary comparison again.",
				key, g.reason)
		}
	}
	if len(hits) == 0 {
		return
	}
	t.Logf("%s:", header)
	for _, key := range sortedStrings(hits) {
		g := table[key]
		t.Logf("    %-40s %4d definitions   %s", key, len(hits[key]), g.reason)
		for _, name := range firstN(hits[key], 3) {
			t.Logf("        e.g. %s", name)
		}
		if len(hits[key]) > g.maxDefs {
			t.Errorf("%s now affects %d definitions, over the recorded ceiling of %d: something new regressed into it",
				key, len(hits[key]), g.maxDefs)
		}
	}
}

func sortedStrings(m map[string]map[string]bool) []string {
	out := make([]string, 0, len(m))
	for k := range m {
		out = append(out, k)
	}
	sort.Strings(out)
	return out
}

func firstN(set map[string]bool, n int) []string {
	out := make([]string, 0, len(set))
	for k := range set {
		out = append(out, k)
	}
	sort.Strings(out)
	if len(out) > n {
		out = out[:n]
	}
	return out
}

func TestSkipReasonsAreLive(t *testing.T) {
	seen := map[string]bool{}
	streamCorpus(t, corpusPath(), func(vec corpusVector) {
		for key := range vec.Fields {
			shape := classify(key)
			seen[shape] = true
			// An exemption written without a turret prefix covers the same field
			// under one, so a key seen only inside a turret keeps it alive.
			seen[strings.TrimPrefix(shape, turretPrefix)] = true
		}
	})
	if len(seen) == 0 {
		t.Fatal("no corpus keys seen at all")
	}
	for _, shape := range sortedKeys(countKeys(skipReasons)) {
		if !seen[shape] {
			t.Errorf("skipReasons[%q] matches nothing in the corpus; drop it or fix the key shape", shape)
		}
		if strings.TrimSpace(skipReasons[shape]) == "" {
			t.Errorf("skipReasons[%q] has no reason", shape)
		}
	}
	for _, table := range []struct {
		name string
		m    map[string]gap
	}{{"upstreamGaps", upstreamGaps}, {"corpusBlind", corpusBlind}} {
		for shape, g := range table.m {
			// "<rng draws>" is this test's own key rather than a corpus one.
			if !seen[shape] && !strings.HasPrefix(shape, "<") {
				t.Errorf("%s[%q] matches nothing in the corpus; the shape is wrong or the gap is closed", table.name, shape)
			}
			if strings.TrimSpace(g.reason) == "" {
				t.Errorf("%s[%q] has no reason", table.name, shape)
			}
		}
	}
}

func countKeys(m map[string]string) map[string]int {
	out := make(map[string]int, len(m))
	for k := range m {
		out[k] = 1
	}
	return out
}
