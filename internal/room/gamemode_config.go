package room

// This file merges gamemode configs into room settings.

import (
	"encoding/json"
	"fmt"
	"math"
	"reflect"
	"strings"

	"arrasgo/internal/config"
	"arrasgo/internal/ctrl"
	"arrasgo/internal/jsutil"
)

type GamemodeFlags struct {
	ArmsRace             bool   `json:"arms_race"`
	Assault              bool   `json:"assault"`
	Blackout             bool   `json:"blackout"`
	HasBlackout          bool   `json:"-"`
	BlackoutFog          string `json:"blackout_fog"` // a CSS color, e.g. "#000000"
	HasBlackoutFog       bool   `json:"-"`
	BlackoutMinimapColor string `json:"blackout_minimap_color"` // a CSS color, e.g. "#484848"
	Blitz                bool   `json:"blitz"`
	Citadel              bool   `json:"citadel"`
	ClanWars             bool   `json:"clan_wars"`
	Diep                 bool   `json:"diep"`
	DisableBaseCheck     bool   `json:"disable_base_check"`
	DisableGuns          bool   `json:"disable_guns"`
	Domination           bool   `json:"domination"`
	Fortress             bool   `json:"fortress"`
	Groups               int    `json:"groups"` // players per group (2, 3 or 4); 0 = not a groups mode
	Growth               bool   `json:"growth"`
	Labyrinth            bool   `json:"labyrinth"`
	MarchMadness         bool   `json:"march_madness"`
	Maze                 bool   `json:"maze"`
	MazeType             int32  `json:"maze_type"`
	HasMazeType          bool   `json:"-"`
	Mothership           bool   `json:"mothership"`
	AllowServerTravel    bool   `json:"allow_server_travel"`
	Outbreak             bool   `json:"outbreak"`
	Retrograde           bool   `json:"retrograde"`
	Sandbox              bool   `json:"sandbox"`
	SanctuarySize        int    `json:"sanctuary_size"`
	HasSanctuarySize     bool   `json:"-"`
	Siege                bool   `json:"siege"`
	SpacePhysics         bool   `json:"space_physics"`
	Tag                  bool   `json:"tag"`
	Train                bool   `json:"train"`
	UseLimitedWaves      bool   `json:"use_limited_waves"`
	WaveCap              int    `json:"wave_cap"`

	BotMove []BotMoveZone `json:"BOT_MOVE"`

	LevelSkillPoints func(level int) int `json:"-"`
}

// BotMoveZone is a patrol path for bots.
type BotMoveZone = ctrl.BotMovePath

// RoomMutableConfig holds room-mutable state from gamemodes.
type RoomMutableConfig struct {
	Mode string

	Teams TeamsValue

	RoomSetup []string

	TileWidth  float64
	TileHeight float64
}

const (
	DefaultMapTileWidth  = 420.0
	DefaultMapTileHeight = 420.0
	DefaultMode          = "ffa"
)

type gamemodeSentinelProbe struct {
	JSFunction       bool   `json:"__jsFunction"`
	NonDeterministic bool   `json:"__nonDeterministic"`
	Note             string `json:"note"`
}

// peekSentinel detects sentinel values in gamemode data.
func peekSentinel(raw json.RawMessage) gamemodeSentinelProbe {
	var p gamemodeSentinelProbe
	_ = json.Unmarshal(raw, &p) // decode failure just means "not an object"; both flags stay false
	return p
}

// mothershipOrTagTeams is a hand-ported teams formula.
func mothershipOrTagTeams(rng *jsutil.Rand) int {
	return int(rng.Random(3)) + 2
}

// tdmTeams is a hand-ported teams formula.
func tdmTeams(rng *jsutil.Rand) int {
	return int(math.Floor(rng.Random(2)+1)) * 2
}

var teamsFormulas = map[string]func(rng *jsutil.Rand) int{
	"mothership": mothershipOrTagTeams,
	"tag":        mothershipOrTagTeams,
	"tdm":        tdmTeams,
	"open_tdm":   tdmTeams,
}

// tileTestingSpawnMessage is a hand-ported spawn message.
func tileTestingSpawnMessage(rng *jsutil.Rand) string {
	return rng.Choose([]string{"test", "testing", "haha test"})
}

var levelSkillPointsFormulas = map[string]func(level int) int{
	"growth": growthLevelSkillPoints,
}

// growthLevelSkillPoints is a hand-ported skill points formula.
func growthLevelSkillPoints(level int) int {
	if level < 2 {
		return 0
	}
	if level <= 40 {
		return 1
	}
	if level <= 45 && level%2 == 1 {
		return 1
	}
	if level <= 51 && level%2 == 1 {
		return 1
	}
	if level%10 == 1 {
		return 1
	}
	return 0
}

// jsonFieldSet collects JSON tag names from a struct type.
func jsonFieldSet(t reflect.Type) map[string]bool {
	set := make(map[string]bool, t.NumField())
	for i := 0; i < t.NumField(); i++ {
		tag := t.Field(i).Tag.Get("json")
		if tag == "" || tag == "-" {
			continue
		}
		name, _, _ := strings.Cut(tag, ",")
		if name != "" {
			set[name] = true
		}
	}
	return set
}

// ApplyGamemodes applies gamemode configs to room settings.
func ApplyGamemodes(tuning *config.Tuning, mutable *RoomMutableConfig, flags *GamemodeFlags, rng *jsutil.Rand, names []string) error {
	dump, err := loadGamemodeDump()
	if err != nil {
		return err
	}
	return applyGamemodesDump(dump, tuning, mutable, flags, rng, names)
}

// ApplyGamemodesFromPath applies gamemodes from a file for testing.
func ApplyGamemodesFromPath(dumpPath string, tuning *config.Tuning, mutable *RoomMutableConfig, flags *GamemodeFlags, rng *jsutil.Rand, names []string) error {
	dump, err := loadGamemodeDumpPath(dumpPath)
	if err != nil {
		return err
	}
	return applyGamemodesDump(dump, tuning, mutable, flags, rng, names)
}

// applyGamemodesDump applies gamemode settings from a dump.
func applyGamemodesDump(dump gamemodeDumpFile, tuning *config.Tuning, mutable *RoomMutableConfig, flags *GamemodeFlags, rng *jsutil.Rand, names []string) error {
	if mutable.RoomSetup == nil {
		mutable.RoomSetup = append([]string(nil), tuning.RoomSetup...)
	}
	if mutable.Mode == "" {
		mutable.Mode = DefaultMode
	}
	if mutable.TileWidth == 0 {
		mutable.TileWidth = DefaultMapTileWidth
	}
	if mutable.TileHeight == 0 {
		mutable.TileHeight = DefaultMapTileHeight
	}

	tuningKeys := jsonFieldSet(reflect.TypeOf(*tuning))
	flagsKeys := jsonFieldSet(reflect.TypeOf(*flags))

	overrideRoom := true

	for _, name := range names {
		raw, ok := dump.Gamemodes[name]
		if !ok {
			return fmt.Errorf("room: gamemode config %q not found in dump", name)
		}
		work := make(map[string]json.RawMessage, len(raw))
		for k, v := range raw {
			work[k] = v
		}

		if v, ok := work["do_not_override_room"]; ok {
			if err := json.Unmarshal(v, &overrideRoom); err != nil {
				return fmt.Errorf("room: gamemode %q do_not_override_room: %w", name, err)
			}
			delete(work, "do_not_override_room")
		}
		if v, ok := work["room_setup"]; ok {
			var list []string
			if err := json.Unmarshal(v, &list); err != nil {
				return fmt.Errorf("room: gamemode %q room_setup: %w", name, err)
			}
			if !overrideRoom {
				mutable.RoomSetup = list
			} else {
				mutable.RoomSetup = append(mutable.RoomSetup, list...)
			}
			delete(work, "room_setup")
		}
		if v, ok := work["mode"]; ok {
			if err := json.Unmarshal(v, &mutable.Mode); err != nil {
				return fmt.Errorf("room: gamemode %q mode: %w", name, err)
			}
			delete(work, "mode")
		}
		if v, ok := work["map_tile_width"]; ok {
			if err := json.Unmarshal(v, &mutable.TileWidth); err != nil {
				return fmt.Errorf("room: gamemode %q map_tile_width: %w", name, err)
			}
			delete(work, "map_tile_width")
		}
		if v, ok := work["map_tile_height"]; ok {
			if err := json.Unmarshal(v, &mutable.TileHeight); err != nil {
				return fmt.Errorf("room: gamemode %q map_tile_height: %w", name, err)
			}
			delete(work, "map_tile_height")
		}
		if v, ok := work["teams"]; ok {
			probe := peekSentinel(v)
			if probe.NonDeterministic {
				formula, known := teamsFormulas[name]
				if !known {
					return fmt.Errorf("room: gamemode %q has a non-deterministic teams field with no hand-ported formula", name)
				}
				mutable.Teams = TeamsNumber(formula(rng))
			} else {
				var n int
				if err := json.Unmarshal(v, &n); err != nil {
					return fmt.Errorf("room: gamemode %q teams: %w", name, err)
				}
				mutable.Teams = TeamsNumber(n)
			}
			delete(work, "teams")
		}
		if v, ok := work["defineLevelSkillPoints"]; ok {
			probe := peekSentinel(v)
			if !probe.JSFunction {
				return fmt.Errorf("room: gamemode %q defineLevelSkillPoints was not dumped as a function sentinel", name)
			}
			formula, known := levelSkillPointsFormulas[name]
			if !known {
				return fmt.Errorf("room: gamemode %q sets defineLevelSkillPoints with no hand-ported formula", name)
			}
			flags.LevelSkillPoints = formula
			delete(work, "defineLevelSkillPoints")
		}
		if v, ok := work["spawn_message"]; ok {
			probe := peekSentinel(v)
			if probe.NonDeterministic {
				if name != "tile_testing" {
					return fmt.Errorf("room: gamemode %q has a non-deterministic spawn_message field with no hand-ported formula", name)
				}
				tuning.SpawnMessage = tileTestingSpawnMessage(rng)
			} else {
				if err := json.Unmarshal(v, &tuning.SpawnMessage); err != nil {
					return fmt.Errorf("room: gamemode %q spawn_message: %w", name, err)
				}
			}
			delete(work, "spawn_message")
		}
		if _, ok := work["maze_type"]; ok {
			flags.HasMazeType = true
		}
		if _, ok := work["sanctuary_size"]; ok {
			flags.HasSanctuarySize = true
		}
		if _, ok := work["blackout"]; ok {
			flags.HasBlackout = true
		}
		if _, ok := work["blackout_fog"]; ok {
			flags.HasBlackoutFog = true
		}

		for key, val := range work {
			if !tuningKeys[key] && !flagsKeys[key] {
				probe := peekSentinel(val)
				if probe.JSFunction || probe.NonDeterministic {
					return fmt.Errorf("room: gamemode %q has an unhandled sentinel field %q (%s)", name, key, probe.Note)
				}
				return fmt.Errorf("room: gamemode %q has unrecognized key %q (not a Tuning or GamemodeFlags field)", name, key)
			}
		}
		blob, err := json.Marshal(work)
		if err != nil {
			return fmt.Errorf("room: gamemode %q: re-marshaling remaining keys: %w", name, err)
		}
		if err := json.Unmarshal(blob, tuning); err != nil {
			return fmt.Errorf("room: gamemode %q: applying Tuning overrides: %w", name, err)
		}
		if err := json.Unmarshal(blob, flags); err != nil {
			return fmt.Errorf("room: gamemode %q: applying GamemodeFlags overrides: %w", name, err)
		}
	}
	return nil
}
