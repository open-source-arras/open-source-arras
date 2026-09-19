package main

import (
	"math"
	"testing"

	"arrasgo/internal/trace"
)

func TestComparesAlphaMasterDead(t *testing.T) {
	base := func() trace.Tick {
		id, dead := 1, false
		return trace.Tick{
			Tick: 0, Count: 1,
			Entities: []trace.EntitySnapshot{{
				ID: 1, Alpha: trace.Num{V: 1}, Master: &id, Dead: &dead,
			}},
		}
	}

	for _, c := range []struct {
		name  string
		mutot func(*trace.EntitySnapshot)
		field string
	}{
		{"alpha", func(e *trace.EntitySnapshot) { e.Alpha = trace.Num{V: 0} }, "alpha"},
		{"master", func(e *trace.EntitySnapshot) { other := 9; e.Master = &other }, "master"},
		{"dead", func(e *trace.EntitySnapshot) { d := true; e.Dead = &d }, "dead"},
	} {
		a, b := base(), base()
		c.mutot(&b.Entities[0])
		d := compareTick(a, b, 0)
		if len(d) != 1 || d[0].field != c.field {
			t.Errorf("%s: want one %s difference, got %+v", c.name, c.field, d)
		}
	}

	if d := compareTick(base(), base(), 0); len(d) != 0 {
		t.Errorf("identical ticks reported %d differences: %+v", len(d), d)
	}
}

func TestEveryNumericFieldIsCompared(t *testing.T) {
	fields := map[string]func(*trace.EntitySnapshot){
		"team":      func(e *trace.EntitySnapshot) { e.Team = trace.Num{V: 7} },
		"x":         func(e *trace.EntitySnapshot) { e.X = trace.Num{V: 7} },
		"y":         func(e *trace.EntitySnapshot) { e.Y = trace.Num{V: 7} },
		"vx":        func(e *trace.EntitySnapshot) { e.VX = trace.Num{V: 7} },
		"vy":        func(e *trace.EntitySnapshot) { e.VY = trace.Num{V: 7} },
		"size":      func(e *trace.EntitySnapshot) { e.Size = trace.Num{V: 7} },
		"facing":    func(e *trace.EntitySnapshot) { e.Facing = trace.Num{V: 7} },
		"health":    func(e *trace.EntitySnapshot) { e.Health = trace.Num{V: 7} },
		"healthMax": func(e *trace.EntitySnapshot) { e.HealthMax = trace.Num{V: 7} },
		"shield":    func(e *trace.EntitySnapshot) { e.Shield = trace.Num{V: 7} },
		"shieldMax": func(e *trace.EntitySnapshot) { e.ShieldMax = trace.Num{V: 7} },
		"alpha":     func(e *trace.EntitySnapshot) { e.Alpha = trace.Num{V: 7} },
	}
	for name, mutate := range fields {
		a := trace.Tick{Count: 1, Entities: []trace.EntitySnapshot{{ID: 1}}}
		b := trace.Tick{Count: 1, Entities: []trace.EntitySnapshot{{ID: 1}}}
		mutate(&b.Entities[0])
		d := compareTick(a, b, 0)
		if len(d) != 1 || d[0].field != name {
			t.Errorf("changing %s produced %+v, want exactly one %s difference", name, d, name)
		}
	}
}

func TestNullPointerFieldsAreNotEqualToValues(t *testing.T) {
	id := 1
	withMaster := trace.Tick{Count: 1, Entities: []trace.EntitySnapshot{{ID: 1, Master: &id}}}
	without := trace.Tick{Count: 1, Entities: []trace.EntitySnapshot{{ID: 1}}}

	if d := compareTick(withMaster, without, 0); len(d) != 1 || d[0].field != "master" {
		t.Errorf("want one master difference, got %+v", d)
	}
	if d := compareTick(without, without, 0); len(d) != 0 {
		t.Errorf("two nulls should agree, got %+v", d)
	}
}

func TestSpawnAndDestroyMismatches(t *testing.T) {
	two := trace.Tick{Count: 2, Entities: []trace.EntitySnapshot{{ID: 1}, {ID: 2}}}
	one := trace.Tick{Count: 1, Entities: []trace.EntitySnapshot{{ID: 1}}}

	d := compareTick(two, one, 0)
	if len(d) != 2 {
		t.Fatalf("want a count difference and a missing entity, got %+v", d)
	}
	if d[0].field != "count" || d[1].field != "missing-in-b" || d[1].id != 2 {
		t.Errorf("got %+v", d)
	}

	d = compareTick(one, two, 0)
	if len(d) != 2 || d[1].field != "missing-in-a" || d[1].id != 2 {
		t.Errorf("reversed: got %+v", d)
	}
}

func TestEntitiesPairByIDNotPosition(t *testing.T) {
	a := trace.Tick{Count: 3, Entities: []trace.EntitySnapshot{
		{ID: 1, X: trace.Num{V: 10}},
		{ID: 2, X: trace.Num{V: 20}},
		{ID: 3, X: trace.Num{V: 30}},
	}}
	b := trace.Tick{Count: 3, Entities: []trace.EntitySnapshot{
		{ID: 1, X: trace.Num{V: 10}},
		{ID: 3, X: trace.Num{V: 30}},
	}}

	d := compareTick(a, b, 0)
	for _, x := range d {
		if x.field == "x" {
			t.Errorf("paired by position: reported an x difference %+v", x)
		}
	}
	found := false
	for _, x := range d {
		if x.field == "missing-in-b" && x.id == 2 {
			found = true
		}
	}
	if !found {
		t.Errorf("want entity 2 reported missing, got %+v", d)
	}
}

func TestTickLevelFieldsAreCompared(t *testing.T) {
	for _, c := range []struct {
		name   string
		mutate func(*trace.Tick)
	}{
		{"rngCalls", func(t *trace.Tick) { t.RngCalls = 1 }},
		{"nextEntityId", func(t *trace.Tick) { t.NextEntityID = 1 }},
		{"count", func(t *trace.Tick) { t.Count = 1 }},
		{"time", func(t *trace.Tick) { t.Time = trace.Num{V: 1} }},
	} {
		a := trace.Tick{}
		b := trace.Tick{}
		c.mutate(&b)
		d := compareTick(a, b, 0)
		if len(d) != 1 || d[0].field != c.name || d[0].id != -1 {
			t.Errorf("%s: got %+v", c.name, d)
		}
	}
}

// Tolerance must not launder a NaN into agreement with a real number.
func TestToleranceDoesNotHideNaN(t *testing.T) {
	a := trace.Tick{Count: 1, Entities: []trace.EntitySnapshot{{ID: 1, X: trace.Num{V: math.NaN()}}}}
	b := trace.Tick{Count: 1, Entities: []trace.EntitySnapshot{{ID: 1, X: trace.Num{V: 0}}}}
	if d := compareTick(a, b, 1e9); len(d) != 1 || d[0].field != "x" {
		t.Errorf("a huge tolerance swallowed a NaN-vs-number difference: %+v", d)
	}
}
