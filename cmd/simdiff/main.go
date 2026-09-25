// simdiff compares two simulation traces and localises the first divergence.
package main

import (
	"flag"
	"fmt"
	"os"
	"sort"
	"strconv"

	"arrasgo/internal/trace"
)

type diff struct {
	tick  int
	id    int
	field string
	a, b  string
}

func main() {
	tol := flag.Float64("tolerance", 0, "absolute tolerance for float comparison; 0 means exact")
	maxReport := flag.Int("max", 25, "maximum individual differences to print")
	quiet := flag.Bool("quiet", false, "print only the verdict line")
	flag.Parse()

	if flag.NArg() != 2 {
		fmt.Fprintln(os.Stderr, "usage: simdiff [--tolerance f] [--max n] <a.jsonl> <b.jsonl>")
		fmt.Fprintln(os.Stderr, "  a is conventionally the Node harness trace, b the Go trace")
		os.Exit(2)
	}

	a, err := trace.Load(flag.Arg(0))
	if err != nil {
		fmt.Fprintf(os.Stderr, "reading %s: %v\n", flag.Arg(0), err)
		os.Exit(2)
	}
	b, err := trace.Load(flag.Arg(1))
	if err != nil {
		fmt.Fprintf(os.Stderr, "reading %s: %v\n", flag.Arg(1), err)
		os.Exit(2)
	}

	fmt.Printf("%s: %d ticks\n%s: %d ticks\n\n", flag.Arg(0), len(a), flag.Arg(1), len(b))

	n := min(len(a), len(b))
	if len(a) != len(b) {
		fmt.Printf("NOTE trace lengths differ (%d vs %d); comparing the first %d ticks\n\n",
			len(a), len(b), n)
	}

	var diffs []diff
	firstBad := -1
	fieldCounts := map[string]int{}

	for i := 0; i < n; i++ {
		d := compareTick(a[i], b[i], *tol)
		if len(d) == 0 {
			continue
		}
		if firstBad < 0 {
			firstBad = i
		}
		for _, x := range d {
			fieldCounts[x.field]++
		}
		diffs = append(diffs, d...)
		break
	}

	if firstBad < 0 {
		if len(a) == len(b) {
			fmt.Printf("IDENTICAL across all %d ticks\n", n)
			return
		}
		fmt.Printf("IDENTICAL across the %d shared ticks, but trace lengths differ\n", n)
		os.Exit(1)
	}

	fmt.Printf("FIRST DIVERGENCE at tick %d\n\n", firstBad)

	if !*quiet {
		if a[firstBad].RngCalls != b[firstBad].RngCalls {
			fmt.Printf("  rngCalls differ: %d vs %d (delta %+d)\n",
				a[firstBad].RngCalls, b[firstBad].RngCalls,
				b[firstBad].RngCalls-a[firstBad].RngCalls)
			fmt.Println("  A different number of random draws means the divergence is upstream of")
			fmt.Println("  the values below — find what consumed a draw the other side did not.")
			fmt.Println()
		}

		fields := make([]string, 0, len(fieldCounts))
		for f := range fieldCounts {
			fields = append(fields, f)
		}
		sort.Slice(fields, func(i, j int) bool {
			if fieldCounts[fields[i]] != fieldCounts[fields[j]] {
				return fieldCounts[fields[i]] > fieldCounts[fields[j]]
			}
			return fields[i] < fields[j]
		})
		fmt.Println("  differing fields, most affected first:")
		for _, f := range fields {
			fmt.Printf("    %-12s %d\n", f, fieldCounts[f])
		}
		fmt.Println()

		fmt.Printf("  first %d of %d differences:\n", min(*maxReport, len(diffs)), len(diffs))
		for i, d := range diffs {
			if i >= *maxReport {
				fmt.Printf("    ... %d more\n", len(diffs)-*maxReport)
				break
			}
			label := fmt.Sprintf("entity %d", d.id)
			if d.id < 0 {
				label = "tick"
			}
			fmt.Printf("    %-12s %-11s a=%-22s b=%s\n", label, d.field, d.a, d.b)
		}
	}
	os.Exit(1)
}

func compareTick(a, b trace.Tick, tol float64) []diff {
	var out []diff
	add := func(id int, field string, x, y any) {
		out = append(out, diff{a.Tick, id, field, fmt.Sprint(x), fmt.Sprint(y)})
	}

	if a.RngCalls != b.RngCalls {
		add(-1, "rngCalls", a.RngCalls, b.RngCalls)
	}
	if a.NextEntityID != b.NextEntityID {
		add(-1, "nextEntityId", a.NextEntityID, b.NextEntityID)
	}
	if a.Count != b.Count {
		add(-1, "count", a.Count, b.Count)
	}
	if !a.Time.Equal(b.Time, tol) {
		add(-1, "time", a.Time, b.Time)
	}

	i, j := 0, 0
	for i < len(a.Entities) && j < len(b.Entities) {
		ea, eb := a.Entities[i], b.Entities[j]
		switch {
		case ea.ID < eb.ID:
			add(ea.ID, "missing-in-b", describe(ea), "-")
			i++
		case ea.ID > eb.ID:
			add(eb.ID, "missing-in-a", "-", describe(eb))
			j++
		default:
			compareEntity(ea, eb, tol, add)
			i++
			j++
		}
	}
	for ; i < len(a.Entities); i++ {
		add(a.Entities[i].ID, "missing-in-b", describe(a.Entities[i]), "-")
	}
	for ; j < len(b.Entities); j++ {
		add(b.Entities[j].ID, "missing-in-a", "-", describe(b.Entities[j]))
	}
	return out
}

func compareEntity(a, b trace.EntitySnapshot, tol float64, add func(int, string, any, any)) {
	for _, f := range []struct {
		name string
		x, y *string
	}{
		{"index", a.Index, b.Index},
		{"type", a.Type, b.Type},
		{"label", a.Label, b.Label},
	} {
		if !strEq(f.x, f.y) {
			add(a.ID, f.name, showStr(f.x), showStr(f.y))
		}
	}

	for _, f := range []struct {
		name string
		x, y trace.Num
	}{
		{"team", a.Team, b.Team},
		{"x", a.X, b.X}, {"y", a.Y, b.Y},
		{"vx", a.VX, b.VX}, {"vy", a.VY, b.VY},
		{"size", a.Size, b.Size}, {"facing", a.Facing, b.Facing},
		{"health", a.Health, b.Health}, {"healthMax", a.HealthMax, b.HealthMax},
		{"shield", a.Shield, b.Shield}, {"shieldMax", a.ShieldMax, b.ShieldMax},
		{"alpha", a.Alpha, b.Alpha},
	} {
		if !f.x.Equal(f.y, tol) {
			add(a.ID, f.name, f.x, f.y)
		}
	}

	if !intEq(a.Master, b.Master) {
		add(a.ID, "master", showInt(a.Master), showInt(b.Master))
	}
	if !boolEq(a.Dead, b.Dead) {
		add(a.ID, "dead", showBool(a.Dead), showBool(b.Dead))
	}
}

func strEq(a, b *string) bool {
	if a == nil || b == nil {
		return a == nil && b == nil
	}
	return *a == *b
}

func intEq(a, b *int) bool {
	if a == nil || b == nil {
		return a == nil && b == nil
	}
	return *a == *b
}

func boolEq(a, b *bool) bool {
	if a == nil || b == nil {
		return a == nil && b == nil
	}
	return *a == *b
}

func showStr(s *string) string {
	if s == nil {
		return "null"
	}
	return *s
}

func showInt(v *int) string {
	if v == nil {
		return "null"
	}
	return strconv.Itoa(*v)
}

func showBool(v *bool) string {
	if v == nil {
		return "null"
	}
	return strconv.FormatBool(*v)
}

func describe(e trace.EntitySnapshot) string {
	return fmt.Sprintf("%s/%s@%s,%s", showStr(e.Type), showStr(e.Label), e.X, e.Y)
}
