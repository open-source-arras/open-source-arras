package room

import (
	"regexp"

	"arrasgo/internal/entity"
	"arrasgo/internal/jsutil"
	"arrasgo/internal/vmath"
)

type Clan struct {
	FullName      string
	Name          string
	Team          int32
	Index         int
	PartyEntities []entity.EntityID
}

var clanNameRe = regexp.MustCompile(`\[(.*?)\]`)

func checkName(name string) (full, tag string, ok bool) {
	m := clanNameRe.FindStringSubmatch(name)
	if m == nil {
		return "", "", false
	}
	return m[0], m[1], true
}

// ClanWars is game/gamemodes/scripts/clan_wars.js:5-56.
type ClanWars struct {
	room   *Room
	clans  []*Clan
	index  int
	teamID int32
}

func newClanWars(r *Room) *ClanWars {
	return &ClanWars{room: r, index: -1, teamID: 110}
}

// Add is clan_wars_ft.add (clan_wars.js:11-27).
func (c *ClanWars) Add(name string, body entity.EntityID) {
	full, tag, ok := checkName(name)
	if !ok {
		return
	}
	if c.findByTag(tag) == nil {
		c.clans = append(c.clans, &Clan{FullName: full, Name: tag, Team: c.teamID, Index: c.index})
		c.teamID++
		c.index++
	}
	if body.Valid() {
		if cl := c.findByTag(tag); cl != nil {
			cl.PartyEntities = append(cl.PartyEntities, body)
		}
	}
}

// Remove is clan_wars_ft.remove. See found-bugs.md #84.
func (c *ClanWars) Remove(originalName string, body entity.EntityID) {
	_, tag, ok := checkName(originalName)
	if !ok {
		return
	}
	cl := c.findByTag(tag)
	if cl == nil {
		return
	}
	idx := -1
	for i, id := range cl.PartyEntities {
		if id == body {
			idx = i
			break
		}
	}
	if idx < 0 {
		if n := len(cl.PartyEntities); n > 0 {
			cl.PartyEntities = cl.PartyEntities[:n-1]
		}
		return
	}
	cl.PartyEntities, _ = jsutil.Remove(cl.PartyEntities, idx)
}

func (c *ClanWars) Clans() []*Clan { return c.clans }

func (c *ClanWars) findByTag(tag string) *Clan {
	for _, cl := range c.clans {
		if cl.Name == tag {
			return cl
		}
	}
	return nil
}

func (c *ClanWars) findByName(name string) *Clan {
	_, tag, ok := checkName(name)
	if !ok {
		return nil
	}
	return c.findByTag(tag)
}

const clanSpawnPad = 12 * 2

// GetSpawn is clan_wars_ft.getSpawn (clan_wars.js:35-47).
func (c *ClanWars) GetSpawn(name string, rng *jsutil.Rand) vmath.Vec2 {
	if cl := c.findByName(name); cl != nil {
		i := rng.Irandom(float64(len(cl.PartyEntities) - 1))
		if i >= 0 && i < len(cl.PartyEntities) {
			id := cl.PartyEntities[i]
			if e := c.room.World.Get(id); e != nil {
				pos := c.room.World.Pos[id.Index]
				size := c.room.World.Size[id.Index]
				return vmath.Vec2{
					X: pos.X + (size-clanSpawnPad)*rng.Random(1) - size,
					Y: pos.Y + (size+clanSpawnPad)*rng.Random(1) + size,
				}
			}
		}
	}
	return c.room.Pools.RandomPoint(rng, c.room.Geometry, SpawnPoolDefault)
}

// GetPlayerInfo is clan_wars_ft.getPlayerInfo (clan_wars.js:48-59).
func (c *ClanWars) GetPlayerInfo(name string, rng *jsutil.Rand) (team int32, clan string) {
	if cl := c.findByName(name); cl != nil {
		return cl.Team, cl.FullName
	}
	return GetRandomTeam(rng), ""
}

func (c *ClanWars) Reset() {
	c.clans = nil
	c.index = -1
	c.teamID = 110
}
