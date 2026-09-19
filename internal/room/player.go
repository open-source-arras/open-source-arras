package room

import (
	"bytes"
	"encoding/json"
	"fmt"
	"strings"

	"arrasgo/internal/entity"
	"arrasgo/internal/vmath"
)

// PlayerSpawnInfo holds spawn location and team assignment.
type PlayerSpawnInfo struct {
	Team    int32
	HasTeam bool
	Clan    string
	Loc     vmath.Vec2
}

func (r *Room) GetSpawnLocation(remembered int32, hasRemembered bool, name string) PlayerSpawnInfo {
	info := PlayerSpawnInfo{Team: remembered, HasTeam: hasRemembered}

	if r.Flags.ClanWars && name != "" && r.Gamemodes != nil {
		cw := r.Gamemodes.ClanWars
		cw.Add(name, entity.EntityID{})
		team, clan := cw.GetPlayerInfo(name, r.Rand)
		return PlayerSpawnInfo{
			Team:    team,
			HasTeam: true,
			Clan:    clan,
			Loc:     cw.GetSpawn(name, r.Rand),
		}
	}

	if r.Mutable.Mode == "tdm" || r.Flags.Tag {
		teamsCount, ok := r.Mutable.Teams.Int()
		team := GetWeakestTeam(r.Rand, teamsCount, ok, r.Tuning.TeamWeights, r.defeatedTeams(), r.liveTeamCounts())
		if !info.HasTeam || (info.Team != team && r.isDefeated(info.Team)) {
			info.Team, info.HasTeam = team, true
		}
	}

	if r.HasSpawnPoint {
		info.Loc = r.SpawnPoint
		return info
	}
	key := SpawnPoolDefault
	if info.HasTeam {
		key = TeamSpawnKey(info.Team)
	}
	info.Loc = r.Pools.RandomPoint(r.Rand, r.Geometry, key)
	return info
}

func (r *Room) defeatedTeams() map[int32]bool {
	if r.Gamemodes == nil || r.Gamemodes.Mothership == nil {
		return nil
	}
	return r.Gamemodes.Mothership.DefeatedTeams()
}

func (r *Room) isDefeated(team int32) bool {
	d := r.defeatedTeams()
	return d != nil && d[team]
}

func (r *Room) SpawnPlayerBody(info PlayerSpawnInfo, name string, incognito bool) (entity.EntityID, error) {
	ctx := r.tileContext()

	id, err := spawnAt(ctx, info.Loc)
	if err != nil {
		return id, err
	}
	r.Protected.Protect(r.World, id)
	r.World.Flag[id.Index] |= entity.FlagPlayer
	if err := defineNamed(ctx, id, r.Tuning.SpawnClass); err != nil {
		return id, err
	}

	e := r.World.Get(id)
	if e == nil {
		return id, fmt.Errorf("room: SpawnPlayerBody: entity vanished mid-spawn")
	}
	e.Name = name
	r.Extras.GetOrCreate(id).Incognito = incognito
	e.Invuln = true

	switch {
	case r.Mutable.Mode == "tdm", r.Flags.Tag, r.Flags.ClanWars:
		e.Team = info.Team
		if r.Flags.ClanWars {
			r.Extras.GetOrCreate(id).OriginalName = name
			e.Color.SetBase(GetTeamColor(TeamRed, false))
			if r.Gamemodes != nil {
				r.Gamemodes.ClanWars.Add(name, id)
			}
		} else {
			e.Color.SetBase(GetTeamColor(info.Team, false))
		}
	default:
		team := GetRandomTeam(r.Rand)
		e.Team = team
		if r.Tuning.RandomBodyColors {
			e.Color.SetBaseNumber(float64(r.Rand.Choose(playerBodyColors[:])))
		} else {
			e.Color.SetBase(GetTeamColor(TeamRed, false))
		}
	}

	if ctx.Definer != nil {
		ctx.Definer.RefreshBodyAttributes(r.World, id)
	}
	e.Skill.Reset(&r.Tuning, true)
	if ctx.Definer != nil {
		ctx.Definer.RefreshBodyAttributes(r.World, id)
	}
	finishSpawn(ctx, id)
	return id, nil
}

// SpawnBareEntity spawns an entity with minimal initialization.
func (r *Room) SpawnBareEntity(loc vmath.Vec2) (entity.EntityID, error) {
	ctx := r.tileContext()
	id, err := spawnAt(ctx, loc)
	if err != nil {
		return id, err
	}
	finishSpawn(ctx, id)
	return id, nil
}

var playerBodyColors = [18]float64{0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15, 16, 17}

// TilesJSON is sockets.js:287-293.
func (r *Room) TilesJSON() (string, error) {
	type wireTile struct {
		Color             string `json:"color"`
		VisibleOnBlackout bool   `json:"visibleOnBlackout"`
		Image             any    `json:"image"`
	}
	if r.Grid == nil {
		return "[]", nil
	}
	rows := make([][]wireTile, len(r.Grid.Cells))
	for y, row := range r.Grid.Cells {
		rows[y] = make([]wireTile, len(row))
		for x, t := range row {
			cell := wireTile{Image: false}
			if t != nil {
				cell.Color = t.Color
				cell.VisibleOnBlackout = t.Type.VisibleOnBlackout
				if t.Type.HasImage {
					cell.Image = t.Type.Image
				}
			}
			rows[y][x] = cell
		}
	}
	return jsonValue(rows)
}

// RefreshTilesJSON is sockets.js:36-42.
func (r *Room) RefreshTilesJSON() (string, error) {
	type wireTile struct {
		Color string `json:"color"`
		Image any    `json:"image"`
	}
	if r.Grid == nil {
		return "[]", nil
	}
	rows := make([][]wireTile, len(r.Grid.Cells))
	for y, row := range r.Grid.Cells {
		rows[y] = make([]wireTile, len(row))
		for x, t := range row {
			cell := wireTile{Image: false}
			if t != nil {
				cell.Color = t.Color
				if t.Type.HasImage {
					cell.Image = t.Type.Image
				}
			}
			rows[y][x] = cell
		}
	}
	return jsonValue(rows)
}

// BlackoutJSON is sockets.js:296-299.
func (r *Room) BlackoutJSON() (string, error) {
	var b strings.Builder
	b.WriteByte('{')
	if r.Flags.HasBlackout {
		b.WriteString(`"active":`)
		if r.Flags.Blackout {
			b.WriteString("true")
		} else {
			b.WriteString("false")
		}
	}
	if r.Flags.HasBlackoutFog {
		if r.Flags.HasBlackout {
			b.WriteByte(',')
		}
		colour, err := jsonString(r.Flags.BlackoutFog)
		if err != nil {
			return "", err
		}
		b.WriteString(`"color":`)
		b.WriteString(colour)
	}
	b.WriteByte('}')
	return b.String(), nil
}

// jsonValue like JSON.stringify does not escape <, >, or &.
func jsonString(s string) (string, error) { return jsonValue(s) }

func jsonValue(v any) (string, error) {
	var buf bytes.Buffer
	enc := json.NewEncoder(&buf)
	enc.SetEscapeHTML(false)
	if err := enc.Encode(v); err != nil {
		return "", err
	}
	// Encode appends a newline, but JSON.stringify does not.
	return strings.TrimSuffix(buf.String(), "\n"), nil
}

// InBase is entity.js:802-810.
func (r *Room) InBase(id entity.EntityID) bool {
	e := r.World.Get(id)
	if e == nil || r.Grid == nil {
		return false
	}
	teamTiles := r.Pools.ByKey[TeamSpawnKey(e.Team)]
	if len(teamTiles) == 0 {
		return false
	}
	tile, ok := r.Grid.GetAt(r.Geometry, r.World.Pos[id.Index])
	if !ok || tile == nil {
		return false
	}
	for _, t := range teamTiles {
		if t == tile {
			return true
		}
	}
	return false
}
