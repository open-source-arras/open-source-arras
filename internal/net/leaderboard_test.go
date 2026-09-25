package net

import (
	"encoding/json"
	"fmt"
	"math"
	"os"
	"path/filepath"
	"testing"

	"arrasgo/internal/entity"
	"arrasgo/internal/vmath"
)

func TestLeaderboardMatchesNode(t *testing.T) {
	v := loadLeaderboardVectors(t)

	for _, c := range v.Cases {
		c := c
		t.Run(c.Name, func(t *testing.T) {
			if c.Threw != "" {
				t.Fatalf("the vector recorded a throw, which no case should: %s", c.Threw)
			}
			w, order, byID := c.world(t, v)
			s := c.settings(v, byID)

			var got []DeltaRow
			switch c.Call {
			case "global", "default", "players", "bosses":
				var b LeaderboardBuilder
				got = b.Build(w, order, c.kind(), &s)
			case "list", "hp":
				var b LeaderboardBuilder
				b.picked = append(b.picked[:0], order...)
				if c.Call == "list" {
					got = b.makeList(w, &s)
				} else {
					got = b.makeHPList(w, &s)
				}
			case "minimapTeams":
				var b MinimapTeams
				team, has := c.team()
				colours := c.minimapColors(byID)
				got = b.Build(w, order, team, has, MinimapSettings{
					Width:         v.RoomWidth,
					Height:        v.RoomHeight,
					FlatTeamColor: c.flatTeamColor(),
					MinimapColor:  func(id entity.EntityID) string { return colours[id] },
				})
			default:
				t.Fatalf("unknown builder %q", c.Call)
			}

			compareRows(t, got, c.Rows)

			if c.TopPlayerID == nil {
				if top.written {
					t.Errorf("topPlayerID was written (%v); Node never writes it here", top.value)
				}
			} else {
				if !top.written {
					t.Errorf("topPlayerID was not written; Node writes %v", *c.TopPlayerID)
				} else if top.value != *c.TopPlayerID {
					t.Errorf("topPlayerID is %v, Node writes %v", top.value, *c.TopPlayerID)
				}
			}
		})
	}
}

var top struct {
	written bool
	value   float64
}

type leaderboardVectors struct {
	RoomWidth         float64           `json:"roomWidth"`
	RoomHeight        float64           `json:"roomHeight"`
	ClassHPLabel      string            `json:"classHPLabel"`
	ClassTagModeLabel string            `json:"classTagModeLabel"`
	ClassTagModeIndex string            `json:"classTagModeIndex"`
	TeamNames         []string          `json:"teamNames"`
	Cases             []leaderboardCase `json:"cases"`
}

type leaderboardCase struct {
	Name        string            `json:"name"`
	Site        string            `json:"site"`
	Note        string            `json:"note"`
	Call        string            `json:"call"`
	Config      leaderboardConfig `json:"config"`
	Args        []json.Number     `json:"args"`
	TagTeams    []int32           `json:"tagTeams"`
	Motherships []uint32          `json:"motherships"`
	Entities    []leaderboardEnt  `json:"entities"`
	Threw       string            `json:"threw"`
	TopPlayerID *float64          `json:"topPlayerID"`
	Rows        []vectorRow       `json:"rows"`
}

type leaderboardConfig struct {
	Mode       string `json:"mode"`
	Tag        bool   `json:"tag"`
	Groups     bool   `json:"groups"`
	Mothership bool   `json:"mothership"`
}

type vectorRow struct {
	ID   float64           `json:"id"`
	Data []json.RawMessage `json:"data"`
}

type leaderboardEnt struct {
	ID                  uint32           `json:"id"`
	Index               string           `json:"index"`
	Name                string           `json:"name"`
	Label               string           `json:"label"`
	Type                string           `json:"type"`
	Team                int32            `json:"team"`
	X                   float64          `json:"x"`
	Y                   float64          `json:"y"`
	Score               float64          `json:"score"`
	Health              float64          `json:"health"`
	HealthMax           float64          `json:"healthMax"`
	Compiled            string           `json:"compiled"`
	LeaderboardColor    *json.RawMessage `json:"leaderboardColor"`
	MinimapColor        *json.RawMessage `json:"minimapColor"`
	NameColor           *string          `json:"nameColor"`
	Incognito           bool             `json:"incognito"`
	IsPlayer            bool             `json:"isPlayer"`
	IsBoss              bool             `json:"isBoss"`
	AllowedOnMinimap    bool             `json:"allowedOnMinimap"`
	Master              *uint32          `json:"master"`
	Solo                int32            `json:"solo"`
	Assists             int32            `json:"assists"`
	Leaderboardable     bool             `json:"leaderboardable"`
	DrawShape           bool             `json:"drawShape"`
	RenderOnLeaderboard *bool            `json:"renderOnLeaderboard"`
}

func loadLeaderboardVectors(t *testing.T) *leaderboardVectors {
	t.Helper()
	path := filepath.Join("..", "..", "gen", "leaderboard-vectors.json")
	raw, err := os.ReadFile(path)
	if err != nil {
		t.Skipf("no leaderboard vectors: %v\nrun: node tools/gen-leaderboard-vectors.js", err)
	}
	var v leaderboardVectors
	if err := json.Unmarshal(raw, &v); err != nil {
		t.Fatalf("parsing %s: %v", path, err)
	}
	if len(v.Cases) == 0 {
		t.Fatal("the vector file has no cases")
	}
	return &v
}

func (c *leaderboardCase) world(t *testing.T, v *leaderboardVectors) (*entity.World, []entity.EntityID, map[uint32]entity.EntityID) {
	t.Helper()
	w := entity.NewWorld(len(c.Entities) + 1)
	w.Room.Width, w.Room.Height = v.RoomWidth, v.RoomHeight

	order := make([]entity.EntityID, 0, len(c.Entities))
	byID := make(map[uint32]entity.EntityID, len(c.Entities))
	for _, spec := range c.Entities {
		id := w.Spawn()
		e := w.Get(id)
		// WireID is set freely by vectors.
		e.WireID = spec.ID
		e.Index = spec.Index
		e.Name = spec.Name
		e.Label = spec.Label
		e.Type = spec.Type
		e.Team = spec.Team
		e.Skill.Score = spec.Score
		e.Health.Amount, e.Health.Max = spec.Health, spec.HealthMax
		e.Color.Compiled = spec.Compiled
		e.NameColor = ""
		if spec.NameColor != nil {
			e.NameColor = *spec.NameColor
		}
		e.AllowedOnMinimap = spec.AllowedOnMinimap
		e.KillCount.Solo, e.KillCount.Assists = spec.Solo, spec.Assists
		e.Settings.Leaderboardable = spec.Leaderboardable
		e.Settings.DrawShape = spec.DrawShape
		if spec.RenderOnLeaderboard != nil {
			e.Settings.HasRenderOnLeaderboard = true
			e.Settings.RenderOnLeaderboard = *spec.RenderOnLeaderboard
		}
		w.Pos[id.Index] = vmath.Vec2{X: spec.X, Y: spec.Y}
		if spec.IsPlayer {
			w.Flag[id.Index] |= entity.FlagPlayer
		}
		byID[spec.ID] = id
		order = append(order, id)
	}
	// Masters are a second pass: a turret can name an entity that comes later.
	for i, spec := range c.Entities {
		if spec.Master != nil {
			m, ok := byID[*spec.Master]
			if !ok {
				t.Fatalf("entity %d names master %d, which is not in the case", spec.ID, *spec.Master)
			}
			w.Get(order[i]).Master = m
		}
	}
	return w, order, byID
}

func (c *leaderboardCase) settings(v *leaderboardVectors, byID map[uint32]entity.EntityID) LeaderboardSettings {
	top.written, top.value = false, 0

	boss := make(map[entity.EntityID]bool)
	incognito := make(map[entity.EntityID]bool)
	colour := make(map[entity.EntityID]string)
	for _, spec := range c.Entities {
		id := byID[spec.ID]
		boss[id] = spec.IsBoss
		incognito[id] = spec.Incognito
		colour[id] = truthyColor(spec.LeaderboardColor)
	}
	motherships := make([]entity.EntityID, 0, len(c.Motherships))
	for _, wireID := range c.Motherships {
		motherships = append(motherships, byID[wireID])
	}

	return LeaderboardSettings{
		PaletteColor: c.Config.Groups || (c.Config.Mode == "ffa" && !c.Config.Tag),
		FFAUntagged:  c.Config.Mode == "ffa" && !c.Config.Tag,
		Tag:          c.Config.Tag,
		Mothership:   c.Config.Mothership,
		TagTeams:     c.TagTeams,
		Motherships:  motherships,
		TagModeIndex: v.ClassTagModeIndex,
		TagModeLabel: v.ClassTagModeLabel,
		HPLabel:      v.ClassHPLabel,
		TeamName: func(i int) string {
			if i < 0 || i >= len(v.TeamNames) {
				return ""
			}
			return v.TeamNames[i]
		},
		// The generator's stand-in for getTeamColor(-i - 1, true).
		TeamColor:        func(i int) string { return fmt.Sprintf("team%d", i+1) },
		IsBoss:           func(id entity.EntityID) bool { return boss[id] },
		Incognito:        func(id entity.EntityID) bool { return incognito[id] },
		LeaderboardColor: func(id entity.EntityID) string { return colour[id] },
		TopPlayerID:      func(f float64) { top.written, top.value = true, f },
	}
}

func (c *leaderboardCase) kind() LeaderboardKind {
	switch c.Call {
	case "default":
		return LeaderboardDefault
	case "players":
		return LeaderboardPlayers
	case "bosses":
		return LeaderboardBosses
	}
	// "list" reached through global.
	return LeaderboardGlobal
}

func (c *leaderboardCase) team() (int32, bool) {
	if len(c.Args) == 0 {
		return 0, false
	}
	n, err := c.Args[0].Int64()
	if err != nil {
		return 0, false
	}
	return int32(n), true
}

func (c *leaderboardCase) flatTeamColor() bool {
	return c.Config.Groups || c.Config.Mode == "ffa" || (c.Config.Mode == "clan" && !c.Config.Tag)
}

func (c *leaderboardCase) minimapColors(byID map[uint32]entity.EntityID) map[entity.EntityID]string {
	out := make(map[entity.EntityID]string, len(c.Entities))
	for _, spec := range c.Entities {
		out[byID[spec.ID]] = truthyColor(spec.MinimapColor)
	}
	return out
}

// truthyColor converts JS undefined, empty string, or zero to empty string.
func truthyColor(raw *json.RawMessage) string {
	if raw == nil {
		return ""
	}
	var s string
	if err := json.Unmarshal(*raw, &s); err == nil {
		return s
	}
	var n float64
	if err := json.Unmarshal(*raw, &n); err == nil {
		if n == 0 {
			return ""
		}
		return trimFloat(n)
	}
	return ""
}

func trimFloat(f float64) string {
	if f == math.Trunc(f) {
		return fmt.Sprintf("%d", int64(f))
	}
	return fmt.Sprintf("%v", f)
}

func compareRows(t *testing.T, got []DeltaRow, want []vectorRow) {
	t.Helper()
	if len(got) != len(want) {
		t.Fatalf("%d rows, Node builds %d:\n got %s\nwant %s",
			len(got), len(want), showRows(got), showVectorRows(want))
	}
	for i := range got {
		if got[i].ID != want[i].ID {
			t.Errorf("row %d id is %v, Node has %v", i, got[i].ID, want[i].ID)
			continue
		}
		if len(got[i].Data) != len(want[i].Data) {
			t.Errorf("row %d has %d fields, Node has %d", i, len(got[i].Data), len(want[i].Data))
			continue
		}
		for j := range got[i].Data {
			if !valueEqualsJSON(got[i].Data[j], want[i].Data[j]) {
				t.Errorf("row %d (id %v) field %d is %s, Node has %s",
					i, got[i].ID, j, showValue(got[i].Data[j]), string(want[i].Data[j]))
			}
		}
	}
}

// valueEqualsJSON compares wire value against JSON. Null stands for NaN.
func valueEqualsJSON(got Value, want json.RawMessage) bool {
	text := string(want)
	if text == "null" {
		return got.Kind == KindNumber && math.IsNaN(got.Num)
	}
	if text == "true" || text == "false" {
		if got.Kind != KindNumber {
			return false
		}
		return (text == "true") == (got.Num == 1)
	}
	var s string
	if err := json.Unmarshal(want, &s); err == nil {
		return got.Kind == KindString && got.Str == s
	}
	var n float64
	if err := json.Unmarshal(want, &n); err == nil {
		return got.Kind == KindNumber && got.Num == n
	}
	return false
}

func showValue(v Value) string {
	if v.Kind == KindString {
		return fmt.Sprintf("%q", v.Str)
	}
	return fmt.Sprintf("%v", v.Num)
}

func showRows(rows []DeltaRow) string {
	out := "["
	for i, r := range rows {
		if i > 0 {
			out += ", "
		}
		out += fmt.Sprintf("%v:", r.ID)
		for _, v := range r.Data {
			out += " " + showValue(v)
		}
	}
	return out + "]"
}

func showVectorRows(rows []vectorRow) string {
	out := "["
	for i, r := range rows {
		if i > 0 {
			out += ", "
		}
		out += fmt.Sprintf("%v:", r.ID)
		for _, v := range r.Data {
			out += " " + string(v)
		}
	}
	return out + "]"
}
