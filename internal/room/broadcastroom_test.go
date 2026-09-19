package room

import (
	"encoding/json"
	"sort"
	"strings"
	"testing"
)

func TestBroadcastRoomFiresOnDominatorDeathNotOnStart(t *testing.T) {
	r := newGamemodeTestRoom(t, 31, "domination")
	cc := &countingComms{}
	r.Comms = cc

	mgr := NewGamemodeManager(r)
	if err := mgr.Start(); err != nil {
		t.Fatalf("Start: %v", err)
	}
	dom := mgr.Domination
	if len(dom.slots) == 0 {
		t.Skip("domination's room dump has no Dominators-tagged tile")
	}
	if cc.rooms != 0 {
		t.Errorf("start() sent %d room refreshes, want 0: dominator.js:84-88 recolours every tile without one", cc.rooms)
	}

	r.World.Kill(dom.slots[0].id)
	if err := dom.Poll(r); err != nil {
		t.Fatalf("Poll: %v", err)
	}
	if cc.rooms != 1 {
		t.Errorf("one dominator death sent %d room refreshes, want exactly 1 (dominator.js:81)", cc.rooms)
	}
}

func TestRefreshTilesJSONOmitsVisibleOnBlackout(t *testing.T) {
	r := newPlayerTestRoom(t, 1, "ffa")

	refresh, err := r.RefreshTilesJSON()
	if err != nil {
		t.Fatalf("RefreshTilesJSON: %v", err)
	}
	setup, err := r.TilesJSON()
	if err != nil {
		t.Fatalf("TilesJSON: %v", err)
	}

	keys := func(payload, what string) []string {
		var rows [][]map[string]json.RawMessage
		if err := json.Unmarshal([]byte(payload), &rows); err != nil {
			t.Fatalf("%s is not a grid of objects: %v", what, err)
		}
		if len(rows) == 0 || len(rows[0]) == 0 {
			t.Fatalf("%s decoded to an empty grid", what)
		}
		var out []string
		for k := range rows[0][0] {
			out = append(out, k)
		}
		sort.Strings(out)
		return out
	}

	got := strings.Join(keys(refresh, "RefreshTilesJSON"), ",")
	if want := "color,image"; got != want {
		t.Errorf("`r` tile keys = %q, want %q", got, want)
	}
	if got := strings.Join(keys(setup, "TilesJSON"), ","); got != "color,image,visibleOnBlackout" {
		t.Errorf("`R` tile keys = %q, want color,image,visibleOnBlackout -- if this changed, the two payloads have drifted apart for a different reason", got)
	}
}
