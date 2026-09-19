package net

// Mockup drawing recipes from Node's dump.

import (
	_ "embed"
	"encoding/json"
	"fmt"
	"strconv"
	"strings"

	"arrasgo/internal/jsutil"
)

//go:embed data/mockups.json
var embeddedMockups []byte

type mockupDump struct {
	Count      int               `json:"count"`
	Mockups    []json.RawMessage `json:"mockups"`
	Index      map[string]int    `json:"index"`
	Draws      []int             `json:"draws"`
	TotalDraws int               `json:"totalDraws"`
}

type mockupLinks struct {
	Index          string `json:"index"`
	SendAllMockups bool   `json:"sendAllMockups"`
	Turrets        []struct {
		Index string `json:"index"`
	} `json:"turrets"`
	Upgrades []struct {
		Index string `json:"index"`
	} `json:"upgrades"`
	RerootUpgradeTree string `json:"rerootUpgradeTree"`
}

const rerootSeparator = `\/`

// Mockups is mockupData plus mockupMap. Building consumes randomness.
type Mockups struct {
	json       []string
	links      []mockupLinks
	byIndex    map[string]int
	draws      []int
	built      []bool
	rand       *jsutil.Rand
	totalDraws int
}

func (m *Mockups) TotalBuildDraws() int { return m.totalDraws }

func LoadMockups(rng *jsutil.Rand) (*Mockups, error) {
	var dump mockupDump
	if err := json.Unmarshal(embeddedMockups, &dump); err != nil {
		return nil, fmt.Errorf("net: decoding mockups: %w", err)
	}
	if len(dump.Mockups) == 0 {
		return nil, fmt.Errorf("net: mockup dump is empty")
	}
	if len(dump.Draws) != len(dump.Mockups) {
		return nil, fmt.Errorf("net: mockup dump has %d draw counts for %d mockups; re-run tools/dump-mockups.js",
			len(dump.Draws), len(dump.Mockups))
	}
	m := &Mockups{
		json:       make([]string, len(dump.Mockups)),
		links:      make([]mockupLinks, len(dump.Mockups)),
		byIndex:    make(map[string]int, len(dump.Index)),
		draws:      dump.Draws,
		built:      make([]bool, len(dump.Mockups)),
		rand:       rng,
		totalDraws: dump.TotalDraws,
	}
	for i, raw := range dump.Mockups {
		m.json[i] = string(raw)
		if err := json.Unmarshal(raw, &m.links[i]); err != nil {
			return nil, fmt.Errorf("net: decoding mockup %d: %w", i, err)
		}
	}
	for k, v := range dump.Index {
		if v < 0 || v >= len(m.json) {
			return nil, fmt.Errorf("net: mockup index %q points at position %d of %d", k, v, len(m.json))
		}
		m.byIndex[k] = v
	}
	return m, nil
}

func (m *Mockups) Len() int { return len(m.json) }

// Send is socketManager.sendMockup. Index may be composite like "12-3".
func (m *Mockups) Send(s *Socket, index string) error {
	return m.send(s, index, 0)
}

const maxMockupDepth = 64

func (m *Mockups) send(s *Socket, index string, depth int) error {
	if depth > maxMockupDepth {
		return fmt.Errorf("net: mockup recursion past %d levels at %q", maxMockupDepth, index)
	}
	for _, part := range strings.Split(index, "-") {
		if _, done := s.Status.MockupData.ReceivedIndexes[part]; done {
			continue
		}
		pos, ok := m.byIndex[part]
		if !ok {
			continue
		}
		// Burn randomness as if building. Mockup is already here.
		m.build(pos)

		num, err := strconv.ParseFloat(part, 64)
		if err != nil {
			continue
		}
		msg := (&SvMockup{Index: MockupIndexNum(num), MockupJSON: m.json[pos]}).Append(s.Builder.Buf())
		if err := s.Talk(msg); err != nil {
			return err
		}
		s.Status.MockupData.ReceivedIndexes[part] = struct{}{}

		for _, t := range m.links[pos].Turrets {
			if err := m.send(s, t.Index, depth+1); err != nil {
				return err
			}
		}
		if m.links[pos].SendAllMockups {
			for _, u := range m.links[pos].Upgrades {
				for _, part := range strings.Split(u.Index, "-") {
					if err := m.sendUpgrades(s, part, depth+1); err != nil {
						return err
					}
				}
			}
		}
	}
	return nil
}

func (m *Mockups) build(pos int) {
	if m.built[pos] {
		return
	}
	m.built[pos] = true
	if m.rand == nil {
		return
	}
	for i := 0; i < m.draws[pos]; i++ {
		m.rand.Random(1)
	}
}

func (m *Mockups) BuildAll() {
	for pos := range m.built {
		m.build(pos)
	}
}

func (m *Mockups) SendUpgrades(s *Socket, index string) error {
	return m.sendUpgrades(s, index, 0)
}

func (m *Mockups) sendUpgrades(s *Socket, index string, depth int) error {
	if depth > maxMockupDepth {
		return fmt.Errorf("net: mockup upgrade recursion past %d levels at %q", maxMockupDepth, index)
	}
	for _, part := range strings.Split(index, "-") {
		if _, done := s.Status.MockupData.ReceivedUpgradePackIndexes[part]; done {
			continue
		}
		if err := m.send(s, index, depth+1); err != nil {
			return err
		}
		s.Status.MockupData.ReceivedUpgradePackIndexes[part] = struct{}{}
		pos, ok := m.byIndex[part]
		if !ok {
			continue
		}
		for _, u := range m.links[pos].Upgrades {
			if err := m.sendUpgrades(s, u.Index, depth+1); err != nil {
				return err
			}
		}
	}
	return nil
}

func (m *Mockups) AppendReroots(dst []string, part string) []string {
	pos, ok := m.byIndex[part]
	if !ok {
		return dst
	}
	tree := m.links[pos].RerootUpgradeTree
	if tree == "" {
		return dst
	}
	return append(dst, strings.Split(tree, rerootSeparator)...)
}

func (m *Mockups) SendAll(s *Socket) error {
	for i, raw := range m.json {
		msg := (&SvMockup{Index: MockupIndexStr(m.links[i].Index), MockupJSON: raw}).Append(s.Builder.Buf())
		if err := s.Talk(msg); err != nil {
			return err
		}
	}
	return nil
}
