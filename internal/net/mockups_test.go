package net

import (
	"encoding/json"
	"strings"
	"testing"
)

func loadMockups(t *testing.T) *Mockups {
	t.Helper()
	m, err := LoadMockups(nil)
	if err != nil {
		t.Fatalf("LoadMockups: %v", err)
	}
	return m
}

// mockupSocket returns a fresh socket with the welcome frame drained.
func mockupSocket(t *testing.T, queue int) *Socket {
	t.Helper()
	_, s := newTestManager(t, queue)
	s.Conn.drain()
	return s
}

// TestMockupTableLoads checks the mockup table is loaded correctly.
func TestMockupTableLoads(t *testing.T) {
	m := loadMockups(t)
	if got := m.Len(); got != 2492 {
		t.Errorf("mockup table holds %d entries, want 2492 -- re-run "+
			"tools/dump-mockups.js and tools/sync-embeds.sh", got)
	}
	if len(m.byIndex) != m.Len() {
		t.Errorf("%d index keys for %d mockups", len(m.byIndex), m.Len())
	}
	for i := range m.links {
		pos, ok := m.byIndex[m.links[i].Index]
		if !ok {
			t.Fatalf("mockup %d has index %q, which the index map does not carry", i, m.links[i].Index)
		}
		if pos != i {
			t.Fatalf("index %q maps to position %d, but the mockup is at %d", m.links[i].Index, pos, i)
		}
	}
	var probe map[string]any
	if err := json.Unmarshal([]byte(m.json[0]), &probe); err != nil {
		t.Fatalf("mockup 0 is not valid JSON: %v", err)
	}
	for _, key := range []string{"index", "shape", "color", "size", "guns", "turrets", "upgrades"} {
		if _, ok := probe[key]; !ok {
			t.Errorf("mockup 0 has no %q; the client reads it", key)
		}
	}
}

// TestSendMockupDedupsAndRecurses checks that sendMockup deduplicates and recurses.
func TestSendMockupDedupsAndRecurses(t *testing.T) {
	m := loadMockups(t)
	var owner string
	var turrets int
	for i := range m.links {
		if n := len(m.links[i].Turrets); n > 0 && !m.links[i].SendAllMockups {
			owner, turrets = m.links[i].Index, n
			break
		}
	}
	if owner == "" {
		t.Skip("no turreted mockup without sendAllMockups in the table")
	}

	s := mockupSocket(t, 256)
	if err := m.Send(s, owner); err != nil {
		t.Fatalf("Send: %v", err)
	}
	first := s.Conn.drain()
	if first < 1+turrets {
		t.Errorf("sending a mockup with %d turrets produced %d frames, want at least %d",
			turrets, first, 1+turrets)
	}
	if _, ok := s.Status.MockupData.ReceivedIndexes[owner]; !ok {
		t.Errorf("index %q was sent but not recorded as received", owner)
	}
	if err := m.Send(s, owner); err != nil {
		t.Fatalf("second Send: %v", err)
	}
	if again := s.Conn.drain(); again != 0 {
		t.Errorf("re-sending an already-received mockup produced %d more frames", again)
	}
	s2 := mockupSocket(t, 256)
	if err := m.Send(s2, "1-2"); err != nil {
		t.Fatalf("Send composite: %v", err)
	}
	for _, part := range []string{"1", "2"} {
		if _, ok := s2.Status.MockupData.ReceivedIndexes[part]; !ok {
			t.Errorf("composite index \"1-2\" did not send part %q", part)
		}
	}
}

// TestSendMockupSendsTheRightFrame checks the wire format of the mockup frame.
func TestSendMockupSendsTheRightFrame(t *testing.T) {
	m := loadMockups(t)
	s := mockupSocket(t, 8)
	if len(m.links[m.byIndex["0"]].Turrets) != 0 {
		t.Skip("mockup 0 gained turrets; pick another single-frame index")
	}
	if err := m.Send(s, "0"); err != nil {
		t.Fatalf("Send: %v", err)
	}
	f := <-s.Conn.out
	msg := Decode(f.bytes)
	op, rest, ok := Opcode(msg)
	if !ok || op != OpSvMockup {
		t.Fatalf("frame is %q, want %q", op, OpSvMockup)
	}
	got, err := ParseSvMockup(rest)
	if err != nil {
		t.Fatalf("parsing M: %v", err)
	}
	if got.Index.IsString {
		t.Errorf("index went out as the string %q; sendMockup parseInts it", got.Index.Str)
	}
	if got.Index.Num != 0 {
		t.Errorf("index = %v, want 0", got.Index.Num)
	}
	if got.MockupJSON != m.json[m.byIndex["0"]] {
		t.Error("the payload is not the table's own JSON text")
	}
}

// TestSendMockupUnknownIndexIsSilent checks that unknown indexes are handled silently.
func TestSendMockupUnknownIndexIsSilent(t *testing.T) {
	m := loadMockups(t)
	s := mockupSocket(t, 8)
	for _, index := range []string{"999999999", "", "not-a-number"} {
		if err := m.Send(s, index); err != nil {
			t.Errorf("Send(%q): %v", index, err)
		}
	}
	if n := s.Conn.drain(); n != 0 {
		t.Errorf("%d frames went out for indexes nothing matches", n)
	}
}

// TestSendMockupUpgradesKeepsItsOwnSet checks the upgrade walk's deduplication.
func TestSendMockupUpgradesKeepsItsOwnSet(t *testing.T) {
	m := loadMockups(t)

	var withUpgrades string
	for i := range m.links {
		if len(m.links[i].Upgrades) > 0 {
			withUpgrades = m.links[i].Index
			break
		}
	}
	if withUpgrades == "" {
		t.Skip("no mockup in the table has upgrades")
	}

	s := mockupSocket(t, 4096)
	if err := m.SendUpgrades(s, withUpgrades); err != nil {
		t.Fatalf("SendUpgrades: %v", err)
	}
	if _, ok := s.Status.MockupData.ReceivedUpgradePackIndexes[withUpgrades]; !ok {
		t.Error("the upgrade walk did not record the class it started from")
	}
	if _, ok := s.Status.MockupData.ReceivedIndexes[withUpgrades]; !ok {
		t.Error("the upgrade walk did not also send the class's own mockup")
	}
	if n := s.Conn.drain(); n < 2 {
		t.Errorf("an upgrade walk over a class with upgrades sent %d frames", n)
	}
}

// TestMockupJSONIsNotHTMLEscaped checks that JSON is not HTML-escaped.
func TestMockupJSONIsNotHTMLEscaped(t *testing.T) {
	m := loadMockups(t)
	for i, raw := range m.json {
		if strings.Contains(raw, `<`) || strings.Contains(raw, `&`) {
			t.Fatalf("mockup %d (%s) has HTML-escaped text, so something re-encoded the dump",
				i, m.links[i].Index)
		}
	}
}
