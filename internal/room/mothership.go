package room

import (
	"math"

	"arrasgo/internal/defs"
	"arrasgo/internal/entity"
	"arrasgo/internal/vmath"
)

// mothershipEntry is `this.motherships`' `[id, team]` pair (mothership.js:69).
type mothershipEntry struct {
	id   entity.EntityID
	team int32
}

// PendingMothershipWin replaces winner()'s 2500ms setTimeout (mothership.js:111).
type PendingMothershipWin struct {
	Team int32
	At   int64
}

// Mothership ports game/gamemodes/scripts/mothership.js.
type Mothership struct {
	room *Room

	choices []string

	motherships       []mothershipEntry
	globalMotherships []entity.EntityID // Config.mothership_data.getData()'s own list
	teamWon           bool
	defeated          map[int32]bool

	Pending *PendingMothershipWin
}

func newMothership(r *Room) *Mothership {
	m := &Mothership{room: r, defeated: make(map[int32]bool)}
	switch {
	case r.Tuning.Thanksgiving:
		m.choices = []string{"turkey"}
	case r.Flags.ArmsRace:
		m.choices = []string{"flagship"}
	default:
		m.choices = []string{"mothership"}
	}
	return m
}

func (m *Mothership) GlobalMotherships() []entity.EntityID { return m.globalMotherships }

func (m *Mothership) DefeatedTeams() map[int32]bool { return m.defeated }

// mothershipSpawnLocs returns 8 fixed spawn candidate locations (mothership.js:27-51).
func mothershipSpawnLocs(w, h float64) [8]vmath.Vec2 {
	return [8]vmath.Vec2{
		{X: w*0.1 - w/2, Y: h*0.1 - h/2},
		{X: w*0.9 - w/2, Y: h*0.9 - h/2},
		{X: w*0.9 - w/2, Y: h*0.1 - h/2},
		{X: w*0.1 - w/2, Y: h*0.9 - h/2},
		{X: w*0.9 - w/2, Y: h*0.5 - h/2},
		{X: w*0.1 - w/2, Y: h*0.5 - h/2},
		{X: w*0.5 - w/2, Y: h*0.9 - h/2},
		{X: w*0.5 - w/2, Y: h*0.1 - h/2},
	}
}

func (m *Mothership) Start() error {
	return m.spawn()
}

// spawn is mothership.js:26-75.
func (m *Mothership) spawn() error {
	ctx := m.room.tileContext()
	teams, ok := m.room.Mutable.Teams.Int()
	if !ok || teams <= 0 {
		return nil
	}
	locs := mothershipSpawnLocs(ctx.Geometry.Width(), ctx.Geometry.Height())
	order := locs[:]
	ctx.Rand.SortRandomComparator(order)

	var name string
	switch {
	case m.room.Tuning.Thanksgiving:
		name = "Turkey"
	case m.room.Flags.ArmsRace:
		name = "Flagship"
	default:
		name = "Mothership"
	}

	for i := 0; i < teams && i < len(order); i++ {
		team := -int32(i) - 1
		id, err := spawnAt(ctx, order[i])
		if err != nil {
			return err
		}
		defName := ctx.Rand.Choose(m.choices)
		if err := defineNamed(ctx, id, defName); err != nil {
			return err
		}
		e := ctx.World.Get(id)
		if e == nil {
			continue
		}
		e.Settings.AcceptsScore = false
		e.Skill.Score = math.Max(e.Skill.Score, 643890*e.Squiggle)
		e.Color.SetBase(GetTeamColor(team, false))
		e.Team = team
		e.Name = name
		ctx.Extras.GetOrCreate(id).IsMothership = true
		if ctx.Attach != nil {
			if err := ctx.Attach.AttachControllers(ctx.World, id,
				defs.Controller{Name: "nearestDifferentMaster"},
				defs.Controller{Name: "mapTargetToGoal"},
			); err != nil {
				return err
			}
		}
		finishSpawn(ctx, id)
		m.motherships = append(m.motherships, mothershipEntry{id, team})
		m.globalMotherships = append(m.globalMotherships, id)
	}
	return nil
}

// death is mothership.js:77-92.
func (m *Mothership) death(team int32) error {
	ctx := m.room.tileContext()
	if ctx.Comms != nil {
		ctx.Comms.Broadcast(GetTeamName(team) + "'s mothership has been killed!")
	}
	if m.room.ArenaClosed {
		return nil
	}
	m.defeated[team] = true

	teamsCount, ok := m.room.Mutable.Teams.Int()
	newTeam := GetWeakestTeam(ctx.Rand, teamsCount, ok, m.room.Tuning.TeamWeights, m.defeated, m.room.liveTeamCounts())

	var toKill []entity.EntityID
	ctx.World.EachLive(func(id entity.EntityID, e *entity.Entity) {
		if e.Team != team {
			return
		}
		if ctx.World.Flag[id.Index].Has(entity.FlagPlayer) && ctx.Comms != nil {
			ctx.Comms.SendTo(id, "Your team has been eliminated.")
		}
		toKill = append(toKill, id)
	})
	_ = newTeam
	for _, id := range toKill {
		if e := ctx.World.Get(id); e != nil {
			e.Godmode = false
		}
		ctx.World.Kill(id)
	}
	return nil
}

// Loop is mothership.js:99-114.
func (m *Mothership) Loop() {
	if m.teamWon {
		return
	}
	if m.Pending != nil && m.room.World.Now() >= m.Pending.At {
		team := m.Pending.Team
		m.Pending = nil
		if m.room.Comms != nil {
			m.room.Comms.Broadcast(GetTeamName(team) + " has won the game!")
		}
	}

	alive := m.motherships[:0]
	for _, ms := range m.motherships {
		e := m.room.World.Get(ms.id)
		if e == nil || e.IsDead() {
			_ = m.death(ms.team)
			continue
		}
		alive = append(alive, ms)
	}
	m.motherships = alive

	if len(m.motherships) == 1 {
		m.teamWon = true
		m.Pending = &PendingMothershipWin{Team: m.motherships[0].team, At: m.room.World.Now() + 2500}
	}
}

// Reset is mothership.js:116-118.
func (m *Mothership) Reset() {
	m.motherships = nil
	m.globalMotherships = nil
	m.teamWon = false
	m.defeated = make(map[int32]bool)
	m.Pending = nil
}
