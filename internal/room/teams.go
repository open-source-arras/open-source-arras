package room

import (
	"math"
	"strconv"
	"strings"

	"arrasgo/internal/jsutil"
)

// Team is int32 throughout this package to match entity.Entity.Team.
const (
	TeamBlue         int32 = -1
	TeamGreen        int32 = -2
	TeamRed          int32 = -3
	TeamPurple       int32 = -4
	TeamYellow       int32 = -5
	TeamOrange       int32 = -6
	TeamBrown        int32 = -7
	TeamCyan         int32 = -8
	TeamDreadnoughts int32 = -10
	TeamRoom         int32 = -100
	TeamEnemies      int32 = -101
)

var teamNames = [8]string{"BLUE", "GREEN", "RED", "PURPLE", "YELLOW", "ORANGE", "BROWN", "CYAN"}
var teamColors = [8]string{"blue", "green", "red", "magenta", "mustard", "tangerine", "brown", "cyan"}

// GetTeamName is global.js:63.
func GetTeamName(team int32) string {
	idx := -team - 1
	switch {
	case idx >= 0 && idx < 8:
		return teamNames[idx]
	case idx == 9:
		return "DREADNOUGHT"
	default:
		return "NEUTRAL"
	}
}

func TeamNameAt(i int) string {
	if i < 0 || i >= len(teamNames) {
		return ""
	}
	return teamNames[i]
}

// GetTeamColor is global.js:64-68.
func GetTeamColor(team int32, fixMode bool) string {
	idx := -team - 1
	var color string
	switch {
	case idx >= 0 && idx < 8:
		color = teamColors[idx]
	case idx == 9:
		color = "aqua"
	default:
		color = "3"
	}
	if fixMode {
		color += " 0 1 0 false"
	}
	return color
}

// IsPlayerTeam is global.js:69 with a known bug: see docs/found-bugs.md.
func IsPlayerTeam(team int32) bool { return team < 0 || team > -11 }

func GetRandomTeam(rng *jsutil.Rand) int32 {
	return -int32(math.Floor(rng.Random(3000))) + 1
}

type TeamsValue struct {
	set   bool
	isStr bool
	num   int
	str   string
}

func UnsetTeams() TeamsValue { return TeamsValue{} }

func TeamsNumber(n int) TeamsValue { return TeamsValue{set: true, num: n} }

func TeamsRaw(s string) TeamsValue { return TeamsValue{set: true, isStr: true, str: s} }

func (t TeamsValue) IsSet() bool { return t.set }

// Int is the JS ToNumber coercion.
func (t TeamsValue) Int() (int, bool) {
	if !t.set {
		return 0, false
	}
	if !t.isStr {
		return t.num, true
	}
	trimmed := strings.TrimSpace(t.str)
	if trimmed == "" {
		return 0, true // JS Number("") === 0
	}
	n, err := strconv.Atoi(trimmed)
	if err != nil {
		return 0, false
	}
	return n, true
}

type TeamCounts map[int32]int32

// GetWeakestTeam is global.js:70-110.
func GetWeakestTeam(rng *jsutil.Rand, teamsCount int, ok bool, teamWeights map[int]float64, defeated map[int32]bool, counts TeamCounts) int32 {
	if !ok {
		return TeamBlue
	}

	type weighted struct {
		team   int32
		amount float64
	}
	var all []weighted
	for i := int32(-teamsCount); i < 0; i++ {
		if defeated[i] {
			continue
		}
		weight := 1.0
		if w, has := teamWeights[int(i)]; has {
			weight = w
		}
		all = append(all, weighted{i, float64(counts[i]) / weight})
	}
	if len(all) == 0 {
		return -int32(math.Ceil(rng.Random(1) * float64(teamsCount)))
	}

	lowest := all[0].amount
	for _, w := range all[1:] {
		lowest = math.Min(lowest, w.amount)
	}
	var entries []weighted
	for _, w := range all {
		if w.amount == lowest {
			entries = append(entries, w)
		}
	}

	if len(entries) == len(all) {
		allZero := true
		for _, w := range entries {
			if w.amount != 0 {
				allZero = false
				break
			}
		}
		if allZero {
			for _, w := range entries {
				if w.team == TeamBlue {
					entries = []weighted{w}
					break
				}
			}
		}
	}

	choice := entries[rng.Irandom(float64(len(entries)-1))]
	return choice.team
}

const (
	SpawnPoolDefault           = "" // room.spawnableDefault
	SpawnPoolDominators        = "Dominators"
	SpawnPoolAssaultDominators = "assaultDominators"
	SpawnPoolBossSpawnTile     = "bossSpawnTile"
)

func TeamSpawnKey(team int32) string { return strconv.Itoa(int(team)) }
