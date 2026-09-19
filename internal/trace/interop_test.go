package trace

import (
	"encoding/json"
	"os"
	"path/filepath"
	"reflect"
	"sort"
	"strings"
	"testing"
)

const sampleTrace = "harness-sample.jsonl"

func samplePath() string { return filepath.Join("..", "..", "gen", sampleTrace) }

func TestReadsRealHarnessOutput(t *testing.T) {
	ticks, err := Load(samplePath())
	if err != nil {
		t.Fatalf("the Go reader cannot parse real harness output: %v", err)
	}
	if len(ticks) != 3 {
		t.Fatalf("got %d ticks, want 3", len(ticks))
	}

	first := ticks[0]
	if first.Tick != 0 {
		t.Errorf("first tick = %d", first.Tick)
	}
	for i, tk := range ticks {
		if tk.Count != len(tk.Entities) {
			t.Errorf("tick %d: count %d but %d entities", i, tk.Count, len(tk.Entities))
		}
		if len(tk.Entities) == 0 {
			t.Errorf("tick %d has no entities; the fixture proves nothing", i)
		}
	}

	for i, tk := range ticks {
		for j := 1; j < len(tk.Entities); j++ {
			if tk.Entities[j-1].ID >= tk.Entities[j].ID {
				t.Errorf("tick %d: ids not ascending at %d (%d then %d)",
					i, j, tk.Entities[j-1].ID, tk.Entities[j].ID)
			}
		}
	}

	e := first.Entities[0]
	if e.Index == nil || *e.Index == "" {
		t.Error("index did not decode; it is a string on the wire (entity.js:194)")
	}
	if e.Type == nil || *e.Type == "" {
		t.Error("type did not decode")
	}
	if e.HealthMax.Null || e.HealthMax.V == 0 {
		t.Errorf("healthMax = %v; a wall should have a real pool", e.HealthMax)
	}
	if e.Dead == nil {
		t.Error("dead did not decode")
	}
}

func TestSchemaCoversEveryFieldNodeEmits(t *testing.T) {
	raw, err := os.ReadFile(samplePath())
	if err != nil {
		t.Fatal(err)
	}
	line := strings.SplitN(strings.TrimSpace(string(raw)), "\n", 2)[0]

	var loose map[string]json.RawMessage
	if err := json.Unmarshal([]byte(line), &loose); err != nil {
		t.Fatal(err)
	}

	tickFields := jsonTagsOf(reflect.TypeOf(Tick{}))
	for k := range loose {
		if !tickFields[k] {
			t.Errorf("run.js emits tick field %q that trace.Tick does not decode — "+
				"cmd/simdiff is silently not comparing it", k)
		}
	}
	for k := range tickFields {
		if _, ok := loose[k]; !ok {
			t.Errorf("trace.Tick declares %q but run.js does not emit it", k)
		}
	}

	var entities []map[string]json.RawMessage
	if err := json.Unmarshal(loose["entities"], &entities); err != nil {
		t.Fatal(err)
	}
	if len(entities) == 0 {
		t.Fatal("no entities in the sample")
	}
	entFields := jsonTagsOf(reflect.TypeOf(EntitySnapshot{}))
	for k := range entities[0] {
		if !entFields[k] {
			t.Errorf("run.js emits entity field %q that trace.EntitySnapshot does not "+
				"decode — cmd/simdiff is silently not comparing it", k)
		}
	}
	for k := range entFields {
		if _, ok := entities[0][k]; !ok {
			t.Errorf("trace.EntitySnapshot declares %q but run.js does not emit it", k)
		}
	}

	var names []string
	for k := range entFields {
		names = append(names, k)
	}
	sort.Strings(names)
	t.Logf("%d entity fields compared: %s", len(names), strings.Join(names, " "))
}

func jsonTagsOf(t reflect.Type) map[string]bool {
	out := map[string]bool{}
	for i := 0; i < t.NumField(); i++ {
		tag := t.Field(i).Tag.Get("json")
		if tag == "" || tag == "-" {
			continue
		}
		out[strings.SplitN(tag, ",", 2)[0]] = true
	}
	return out
}

func TestWriterEmitsTheSameFieldSetAsNode(t *testing.T) {
	raw, err := os.ReadFile(samplePath())
	if err != nil {
		t.Fatal(err)
	}
	nodeLine := strings.SplitN(strings.TrimSpace(string(raw)), "\n", 2)[0]

	var nodeTick, goTick map[string]json.RawMessage
	if err := json.Unmarshal([]byte(nodeLine), &nodeTick); err != nil {
		t.Fatal(err)
	}

	w, _ := newWorldWith(t, 2)
	var buf strings.Builder
	tw := NewWriter(&buf)
	if err := tw.WriteTick(0, 33.333333333333336, 1038, w); err != nil {
		t.Fatal(err)
	}
	tw.Flush()
	if err := json.Unmarshal([]byte(strings.TrimSpace(buf.String())), &goTick); err != nil {
		t.Fatal(err)
	}

	compareKeys(t, "tick", nodeTick, goTick)

	var nodeEnts, goEnts []map[string]json.RawMessage
	json.Unmarshal(nodeTick["entities"], &nodeEnts)
	json.Unmarshal(goTick["entities"], &goEnts)
	if len(nodeEnts) == 0 || len(goEnts) == 0 {
		t.Fatal("need entities on both sides")
	}
	compareKeys(t, "entity", nodeEnts[0], goEnts[0])
}

func compareKeys(t *testing.T, what string, node, goSide map[string]json.RawMessage) {
	t.Helper()
	for k := range node {
		if _, ok := goSide[k]; !ok {
			t.Errorf("%s: node emits %q, the Go writer does not", what, k)
		}
	}
	for k := range goSide {
		if _, ok := node[k]; !ok {
			t.Errorf("%s: the Go writer emits %q, node does not", what, k)
		}
	}
}
