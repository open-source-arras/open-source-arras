package net

import (
	"arrasgo/internal/entity"
)

type LeaderboardSettings struct {
	PaletteColor bool
	FFAUntagged  bool

	Tag        bool
	Mothership bool

	TagTeams    []int32
	Motherships []entity.EntityID

	TagModeIndex string
	TagModeLabel string
	HPLabel      string

	TeamName  func(i int) string
	TeamColor func(i int) string

	IsBoss           func(entity.EntityID) bool
	Incognito        func(entity.EntityID) bool
	LeaderboardColor func(entity.EntityID) string

	TopPlayerID func(float64)
}

func (s *LeaderboardSettings) isBoss(id entity.EntityID) bool {
	return s.IsBoss != nil && s.IsBoss(id)
}

func (s *LeaderboardSettings) incognito(id entity.EntityID) bool {
	return s.Incognito != nil && s.Incognito(id)
}

func (s *LeaderboardSettings) leaderboardColor(id entity.EntityID) string {
	if s.LeaderboardColor == nil {
		return ""
	}
	return s.LeaderboardColor(id)
}

func (s *LeaderboardSettings) teamName(i int) string {
	if s.TeamName == nil {
		return ""
	}
	return s.TeamName(i)
}

func (s *LeaderboardSettings) teamColor(i int) string {
	if s.TeamColor == nil {
		return ""
	}
	return s.TeamColor(i)
}

func (s *LeaderboardSettings) setTop(id float64) {
	if s.TopPlayerID != nil {
		s.TopPlayerID(id)
	}
}

type LeaderboardKind int

const (
	LeaderboardGlobal LeaderboardKind = iota
	LeaderboardDefault
	LeaderboardPlayers
	LeaderboardBosses
)

func ParseLeaderboardKind(name string) LeaderboardKind {
	switch name {
	case "default":
		return LeaderboardDefault
	case "players":
		return LeaderboardPlayers
	case "bosses":
		return LeaderboardBosses
	}
	return LeaderboardGlobal
}

type LeaderboardBuilder struct {
	MinimapBuilder

	ids    []float64
	picked []entity.EntityID
	order  []int
}

func (b *LeaderboardBuilder) Build(w *entity.World, order []entity.EntityID, kind LeaderboardKind, s *LeaderboardSettings) []DeltaRow {
	b.ids = b.ids[:0]
	b.vals = b.vals[:0]

	if kind == LeaderboardGlobal {
		switch {
		case s.Tag:
			return b.tagRows(s)
		case s.Mothership:
			return b.mothershipRows(w, s)
		}
	}

	b.picked = b.picked[:0]
	for _, id := range order {
		e := w.Get(id)
		if e == nil {
			continue
		}
		var admit bool
		switch kind {
		case LeaderboardBosses:
			admit = (s.isBoss(id) || e.Type == "miniboss") &&
				e.Settings.Leaderboardable && e.Settings.DrawShape
		case LeaderboardPlayers:
			admit = w.Flag[id.Index].Has(entity.FlagPlayer) && !s.incognito(id) &&
				e.Settings.Leaderboardable && e.Settings.DrawShape
		default:
			admit = e.Settings.Leaderboardable && e.Settings.DrawShape && !s.incognito(id) &&
				(e.Type == "tank" || e.KillCount.Solo != 0 || e.KillCount.Assists != 0)
			if kind == LeaderboardDefault && e.Type == "food" {
				admit = false
			}
		}
		if admit {
			b.picked = append(b.picked, id)
		}
	}
	if kind == LeaderboardBosses {
		return b.makeHPList(w, s)
	}
	return b.makeList(w, s)
}

func (b *LeaderboardBuilder) makeList(w *entity.World, s *LeaderboardSettings) []DeltaRow {
	top := -1.0
	for i := 0; i < 10 && len(b.picked) > 0; i++ {
		at, ok := b.highestScore(w)
		if !ok {
			break
		}
		id := b.picked[at]
		b.picked = append(b.picked[:at], b.picked[at+1:]...)
		e := w.Get(id)

		colour := e.Color.Compiled
		switch lb := s.leaderboardColor(id); {
		case lb != "":
			colour = lb + " 0 1 0 false"
		case s.PaletteColor:
			colour = "11 0 1 0 false"
		}
		behind := colour
		if s.leaderboardColor(id) == "" && s.FFAUntagged {
			behind = "12 0 1 0 false"
		}
		nameColour := e.NameColor
		if nameColour == "" {
			nameColour = "#FFFFFF"
		}

		if len(b.ids) == 0 {
			top = float64(e.WireID)
		}
		b.ids = append(b.ids, float64(e.WireID))
		b.vals = append(b.vals,
			N(jsRound(e.Skill.Score)),
			S(e.Index),
			S(e.Name),
			S(behind),
			S(colour),
			S(nameColour),
			S(e.Label),
			B(renderOnLeaderboard(e)))
	}
	s.setTop(top)
	return b.sortedByID(LeaderboardFields)
}

func renderOnLeaderboard(e *entity.Entity) bool {
	if !e.Settings.HasRenderOnLeaderboard {
		return true
	}
	return e.Settings.RenderOnLeaderboard
}

func (b *LeaderboardBuilder) makeHPList(w *entity.World, s *LeaderboardSettings) []DeltaRow {
	top := -1.0
	for i := 0; i < 10 && len(b.picked) > 0; i++ {
		at, ok := b.highestScore(w)
		if !ok {
			break
		}
		id := b.picked[at]
		b.picked = append(b.picked[:at], b.picked[at+1:]...)
		e := w.Get(id)

		name := e.Name
		if name == "" {
			name = e.Label
		}
		if len(b.ids) == 0 {
			top = float64(e.WireID) + 100
		}
		b.ids = append(b.ids, float64(e.WireID)+100)
		b.vals = append(b.vals,
			N(jsRound(e.Health.Amount/e.Health.Max*100)),
			S(e.Index),
			S(name),
			S(e.Color.Compiled),
			S(e.Color.Compiled),
			S("#ffffff"),
			S(s.HPLabel),
			B(false))
	}
	s.setTop(top)
	return b.sortedByID(LeaderboardFields)
}

func (b *LeaderboardBuilder) highestScore(w *entity.World) (int, bool) {
	best, at := 0.0, -1
	for i, id := range b.picked {
		if e := w.Get(id); e != nil && e.Skill.Score > best {
			best, at = e.Skill.Score, i
		}
	}
	return at, at >= 0
}

func (b *LeaderboardBuilder) tagRows(s *LeaderboardSettings) []DeltaRow {
	for i, count := range s.TagTeams {
		colour := s.teamColor(i)
		b.ids = append(b.ids, float64(i))
		b.vals = append(b.vals,
			N(float64(count)),
			S(s.TagModeIndex),
			S(s.teamName(i)),
			S(colour),
			S(colour),
			S("#ffffff"),
			S(s.TagModeLabel),
			B(false))
	}
	return b.rowsFrom(b.ids, LeaderboardFields)
}

func (b *LeaderboardBuilder) mothershipRows(w *entity.World, s *LeaderboardSettings) []DeltaRow {
	for i, id := range s.Motherships {
		e := w.Get(id)
		if e == nil || e.IsDead() {
			continue
		}
		colour := s.teamColor(i)
		b.ids = append(b.ids, float64(e.WireID))
		b.vals = append(b.vals,
			N(jsRound(e.Health.Amount/e.Health.Max*100)),
			S(e.Index),
			S(s.teamName(i)),
			S(colour),
			S(colour),
			S("#ffffff"),
			S(s.HPLabel),
			B(false))
	}
	return b.rowsFrom(b.ids, LeaderboardFields)
}

func (b *LeaderboardBuilder) sortedByID(stride int) []DeltaRow {
	b.rows = b.rows[:0]
	b.order = b.order[:0]
	for i := range b.ids {
		b.order = append(b.order, i)
	}
	for i := 1; i < len(b.order); i++ {
		for j := i; j > 0 && b.ids[b.order[j]] < b.ids[b.order[j-1]]; j-- {
			b.order[j], b.order[j-1] = b.order[j-1], b.order[j]
		}
	}
	for _, i := range b.order {
		b.rows = append(b.rows, DeltaRow{ID: b.ids[i], Data: b.vals[i*stride : (i+1)*stride]})
	}
	return b.rows
}

type MinimapTeams struct{ minimapScratch }

func (b *MinimapTeams) Build(w *entity.World, order []entity.EntityID, team int32, hasTeam bool, s MinimapSettings) []DeltaRow {
	b.ids = b.ids[:0]
	b.vals = b.vals[:0]
	if !hasTeam {
		return b.rowsFrom(b.ids, MinimapTeamFields)
	}
	for _, id := range order {
		e := w.Get(id)
		if e == nil || e.Type != "tank" || e.Team != team || e.Master != id || !e.AllowedOnMinimap {
			continue
		}
		pos := w.Pos[id.Index]
		colour := e.Color.Compiled
		switch override := s.minimapColor(id); {
		case override != "":
			colour = override + " 0 1 0 false"
		case s.FlatTeamColor:
			colour = "10 0 1 0 false"
		}
		b.ids = append(b.ids, float64(e.WireID))
		b.vals = append(b.vals,
			N(QuantiseMinimap(pos.X, s.Width)),
			N(QuantiseMinimap(pos.Y, s.Height)),
			S(colour))
	}
	return b.rowsFrom(b.ids, MinimapTeamFields)
}
