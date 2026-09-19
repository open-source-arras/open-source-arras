package net

import (
	"math"

	"arrasgo/internal/entity"
	"arrasgo/internal/jsutil"
)

// MinimapSettings holds configuration for minimap row builders.
type MinimapSettings struct {
	Width, Height float64

	Blackout             bool
	BlackoutMinimapColor string

	FlatTeamColor bool

	IsMothership func(entity.EntityID) bool
	MinimapColor func(entity.EntityID) string
}

func (s MinimapSettings) minimapColor(id entity.EntityID) string {
	if s.MinimapColor == nil {
		return ""
	}
	return s.MinimapColor(id)
}

func (s MinimapSettings) isMothership(id entity.EntityID) bool {
	return s.IsMothership != nil && s.IsMothership(id)
}

type MinimapBuilder struct {
	rows []DeltaRow
	vals []Value
}

func (b *MinimapBuilder) rowsFrom(ids []float64, stride int) []DeltaRow {
	b.rows = b.rows[:0]
	for i, id := range ids {
		b.rows = append(b.rows, DeltaRow{ID: id, Data: b.vals[i*stride : (i+1)*stride]})
	}
	return b.rows
}

type minimapScratch struct {
	MinimapBuilder
	ids []float64
}

// MinimapAll builds the minimap row (sockets.js:1797).
type MinimapAll struct{ minimapScratch }

func (b *MinimapAll) Build(w *entity.World, order []entity.EntityID, s MinimapSettings, rng *jsutil.Rand) []DeltaRow {
	b.ids = b.ids[:0]
	b.vals = b.vals[:0]
	for _, id := range order {
		e := w.Get(id)
		if e == nil || !e.AllowedOnMinimap {
			continue
		}
		mothership := s.isMothership(id)
		if !(e.AlwaysShowOnMinimap ||
			(e.Type == "wall" && e.Alpha > 0.2) ||
			e.Type == "miniboss" || e.Type == "portal" || mothership) {
			continue
		}
		pos := w.Pos[id.Index]
		x, y := pos.X, pos.Y
		if s.Blackout {
			x = math.Floor(rng.Random(s.Width) - s.Width/2)
			y = math.Floor(rng.Random(s.Height) - s.Height/2)
		}
		glyph := 0.0
		if !s.Blackout && (e.Type == "wall" || mothership) {
			glyph = 1
			if e.Shape == 4 {
				glyph = 2
			}
		}
		colour := e.Color.Compiled
		switch override := s.minimapColor(id); {
		case s.Blackout:
			colour = s.BlackoutMinimapColor + " 0 1 0 false"
		case override != "":
			colour = override + " 0 1 0 false"
		}
		b.ids = append(b.ids, float64(e.WireID))
		b.vals = append(b.vals,
			N(glyph),
			N(QuantiseMinimap(x, s.Width)),
			N(QuantiseMinimap(y, s.Height)),
			S(colour),
			N(jsRound(e.SIZE)))
	}
	return b.rowsFrom(b.ids, MinimapFields)
}

// MinimapAllTeams builds the all-teams minimap row (sockets.js:1837).
type MinimapAllTeams struct{ minimapScratch }

func (b *MinimapAllTeams) Build(w *entity.World, order []entity.EntityID, s MinimapSettings) []DeltaRow {
	b.ids = b.ids[:0]
	b.vals = b.vals[:0]
	for _, id := range order {
		e := w.Get(id)
		if e == nil || e.Type != "tank" || e.Master != id {
			continue
		}
		pos := w.Pos[id.Index]
		colour := e.Color.Compiled
		switch override := s.minimapColor(id); {
		case override != "":
			colour = override + " 0 1 0 false"
		case s.FlatTeamColor:
			colour = "12 0 1 0 false"
		}
		b.ids = append(b.ids, float64(e.WireID))
		b.vals = append(b.vals,
			N(QuantiseMinimap(pos.X, s.Width)),
			N(QuantiseMinimap(pos.Y, s.Height)),
			S(colour))
	}
	return b.rowsFrom(b.ids, MinimapTeamFields)
}
