package arch

import (
	"go/parser"
	"go/token"
	"os"
	"path/filepath"
	"sort"
	"strconv"
	"strings"
	"testing"
)

// rank is the layering from docs/architecture.md.
var rank = map[string]int{
	"jsmath":  0,
	"spatial": 0,
	"config":  0,
	"arch":    0,

	"vmath": 1,

	"jsutil": 2,

	"defs": 3,
	"maze": 3,

	"entity": 4,

	"trace": 5,
	"sim":   5,
	"guns":  5,
	"ctrl":  5,

	"define": 6,

	"room": 7,
	"net":  7,

	"wire": 8,
}

const modulePrefix = "arrasgo/internal/"

func TestPackageLayering(t *testing.T) {
	imports := scanImports(t)

	if len(imports) < 12 {
		t.Fatalf("only found %d packages under internal/; the scan is not working",
			len(imports))
	}

	checked := 0
	for pkg, deps := range imports {
		myRank, ok := rank[pkg]
		if !ok {
			t.Errorf("internal/%s is not in the layering table in this file. "+
				"Add it, and add it to docs/architecture.md's edge list too — a new "+
				"package that nothing places is a package that can quietly invert the "+
				"dependency graph.", pkg)
			continue
		}
		for _, dep := range deps {
			depRank, ok := rank[dep]
			if !ok {
				t.Errorf("internal/%s imports internal/%s, which is not in the "+
					"layering table", pkg, dep)
				continue
			}
			checked++
			if depRank >= myRank {
				where := "above"
				if depRank == myRank {
					where = "at the same level as"
				}
				t.Errorf("internal/%s (rank %d) imports internal/%s (rank %d) — that is "+
					"%s it. docs/architecture.md says dependencies point downward only; "+
					"either the import is wrong or the table is.",
					pkg, myRank, dep, depRank, where)
			}
		}
	}

	if checked < 10 {
		t.Errorf("only %d internal import edges checked; the scan is missing files", checked)
	}
	t.Logf("%d packages, %d internal import edges, all pointing downward",
		len(imports), checked)
}

// TestDocumentedEdgesExist verifies documented edges are in the code.
func TestDocumentedEdgesExist(t *testing.T) {
	imports := scanImports(t)

	for _, c := range []struct{ pkg, dep string }{
		{"vmath", "jsmath"},
		{"jsutil", "vmath"},
		{"defs", "jsutil"},
		{"entity", "spatial"},
		{"entity", "config"},
		{"trace", "entity"},
		{"sim", "entity"},
		{"wire", "room"},
		{"wire", "maze"},
	} {
		found := false
		for _, d := range imports[c.pkg] {
			if d == c.dep {
				found = true
			}
		}
		if !found {
			t.Errorf("docs/architecture.md says internal/%s imports internal/%s, "+
				"but it does not", c.pkg, c.dep)
		}
	}

	for _, c := range []struct{ pkg, dep string }{
		{"net", "room"},
		{"room", "net"},
		{"room", "sim"},
		{"net", "sim"},
	} {
		for _, d := range imports[c.pkg] {
			if d == c.dep {
				t.Errorf("internal/%s now imports internal/%s. docs/architecture.md "+
					"says these are decoupled through interfaces and wired only in "+
					"cmd/; update the doc if the design has genuinely changed.",
					c.pkg, c.dep)
			}
		}
	}
}

// scanImports returns internal packages imported by each internal package.
func scanImports(t *testing.T) map[string][]string {
	t.Helper()

	root := filepath.Join("..", "..", "internal")
	entries, err := os.ReadDir(root)
	if err != nil {
		t.Fatalf("read %s: %v", root, err)
	}

	out := map[string][]string{}
	fset := token.NewFileSet()

	for _, e := range entries {
		if !e.IsDir() {
			continue
		}
		pkg := e.Name()
		files, err := filepath.Glob(filepath.Join(root, pkg, "*.go"))
		if err != nil {
			t.Fatal(err)
		}
		seen := map[string]bool{}
		for _, f := range files {
			if strings.HasSuffix(f, "_test.go") {
				continue
			}
			parsed, err := parser.ParseFile(fset, f, nil, parser.ImportsOnly)
			if err != nil {
				t.Fatalf("parse %s: %v", f, err)
			}
			for _, imp := range parsed.Imports {
				path, err := strconv.Unquote(imp.Path.Value)
				if err != nil {
					continue
				}
				if !strings.HasPrefix(path, modulePrefix) {
					continue
				}
				dep := strings.TrimPrefix(path, modulePrefix)
				if dep != pkg {
					seen[dep] = true
				}
			}
		}
		deps := make([]string, 0, len(seen))
		for d := range seen {
			deps = append(deps, d)
		}
		sort.Strings(deps)
		out[pkg] = deps
	}
	return out
}
