package room

import (
	"reflect"
	"testing"

	"arrasgo/internal/config"
	"arrasgo/internal/jsutil"
)

// gamemodesDumpPath is gen/gamemodes.json relative to this package.
const gamemodesDumpPath = "../../gen/gamemodes.json"

func freshTuning(t *testing.T) *config.Tuning {
	t.Helper()
	tuning, err := config.Load("../../gen/config.json")
	if err != nil {
		t.Skipf("gen/config.json unavailable (%v); nothing to apply gamemode overrides onto", err)
	}
	return &tuning
}

func applyOne(t *testing.T, name string) (*config.Tuning, RoomMutableConfig, GamemodeFlags) {
	t.Helper()
	tuning := freshTuning(t)
	var mutable RoomMutableConfig
	var flags GamemodeFlags
	rng := jsutil.NewRand(1)
	if err := ApplyGamemodesFromPath(gamemodesDumpPath, tuning, &mutable, &flags, rng, []string{name}); err != nil {
		t.Fatalf("ApplyGamemodesFromPath(%q): %v", name, err)
	}
	return tuning, mutable, flags
}

func TestApplyGamemodes_AssaultBooster(t *testing.T) {
	tuning, mutable, flags := applyOne(t, "assault_booster")

	if mutable.Mode != "tdm" {
		t.Errorf("Mode = %q, want tdm", mutable.Mode)
	}
	if n, ok := mutable.Teams.Int(); !ok || n != 2 {
		t.Errorf("Teams = (%d,%v), want (2,true)", n, ok)
	}
	// room_setup is replaced wholesale, not appended.
	if len(mutable.RoomSetup) != 1 || mutable.RoomSetup[0] != "room_assault_booster" {
		t.Errorf("RoomSetup = %v, want [room_assault_booster]", mutable.RoomSetup)
	}
	if mutable.TileWidth != 440 || mutable.TileHeight != 440 {
		t.Errorf("TileWidth/Height = %v/%v, want 440/440", mutable.TileWidth, mutable.TileHeight)
	}

	if !flags.Assault {
		t.Error("Flags.Assault = false, want true")
	}
	if !flags.Maze || !flags.HasMazeType || flags.MazeType != 15 {
		t.Errorf("Maze/MazeType = %v/%v/%v, want true/true/15", flags.Maze, flags.HasMazeType, flags.MazeType)
	}
	if len(flags.BotMove) != 1 {
		t.Fatalf("len(BotMove) = %d, want 1", len(flags.BotMove))
	}
	bm := flags.BotMove[0]
	if bm.Team != TeamBlue || bm.Range != 20 {
		t.Errorf("BotMove[0] = %+v, want Team=%d Range=20", bm, TeamBlue)
	}
	wantMovement := [][2]float64{{107.43, 0.46}, {76.66, 0.46}}
	if len(bm.Movement) != len(wantMovement) {
		t.Fatalf("len(BotMove[0].Movement) = %d, want %d", len(bm.Movement), len(wantMovement))
	}
	for i, pt := range wantMovement {
		if bm.Movement[i] != pt {
			t.Errorf("BotMove[0].Movement[%d] = %v, want %v", i, bm.Movement[i], pt)
		}
	}

	if !tuning.EnableBosses {
		// assault_booster sets enable_bosses: false
	} else {
		t.Error("Tuning.EnableBosses = true, want false (assault_booster.js sets it false)")
	}
	if got := tuning.TeamWeights[int(TeamBlue)]; got != 1.1 {
		t.Errorf("Tuning.TeamWeights[TeamBlue] = %v, want 1.1", got)
	}
}

func TestApplyGamemodes_Tdm(t *testing.T) {
	for seed := uint64(1); seed <= 50; seed++ {
		tuning := freshTuning(t)
		var mutable RoomMutableConfig
		var flags GamemodeFlags
		rng := jsutil.NewRand(seed)
		if err := ApplyGamemodesFromPath(gamemodesDumpPath, tuning, &mutable, &flags, rng, []string{"tdm"}); err != nil {
			t.Fatalf("seed %d: %v", seed, err)
		}
		if mutable.Mode != "tdm" {
			t.Errorf("seed %d: Mode = %q, want tdm", seed, mutable.Mode)
		}
		n, ok := mutable.Teams.Int()
		if !ok || (n != 2 && n != 4) {
			t.Errorf("seed %d: Teams = (%d,%v), want 2 or 4", seed, n, ok)
		}
		// room_tdm is appended after the caller-seeded default.
		if len(mutable.RoomSetup) != 2 || mutable.RoomSetup[0] != "room_default" || mutable.RoomSetup[1] != "room_tdm" {
			t.Errorf("seed %d: RoomSetup = %v, want [room_default room_tdm]", seed, mutable.RoomSetup)
		}
	}
}

func TestApplyGamemodes_TileTesting(t *testing.T) {
	seen := map[string]bool{}
	for seed := uint64(1); seed <= 50; seed++ {
		tuning := freshTuning(t)
		var mutable RoomMutableConfig
		var flags GamemodeFlags
		rng := jsutil.NewRand(seed)
		if err := ApplyGamemodesFromPath(gamemodesDumpPath, tuning, &mutable, &flags, rng, []string{"tile_testing"}); err != nil {
			t.Fatalf("seed %d: %v", seed, err)
		}
		if n, ok := mutable.Teams.Int(); !ok || n != 1 {
			t.Errorf("seed %d: Teams = (%d,%v), want (1,true)", seed, n, ok)
		}
		if len(mutable.RoomSetup) != 2 || mutable.RoomSetup[1] != "room_tiles_test" {
			t.Errorf("seed %d: RoomSetup = %v, want [room_default room_tiles_test]", seed, mutable.RoomSetup)
		}
		switch tuning.SpawnMessage {
		case "test", "testing", "haha test":
			seen[tuning.SpawnMessage] = true
		default:
			t.Errorf("seed %d: SpawnMessage = %q, not one of the three tile_testing.js draws from", seed, tuning.SpawnMessage)
		}
	}
	if len(seen) < 2 {
		t.Errorf("only saw %d distinct spawn_message draws across 50 seeds (%v); rng.Choose may not be wired correctly", len(seen), seen)
	}
}

func TestApplyGamemodes_Growth(t *testing.T) {
	tuning, _, flags := applyOne(t, "growth")

	if !flags.Growth {
		t.Error("Flags.Growth = false, want true")
	}
	if tuning.LevelCap != 1000 {
		t.Errorf("Tuning.LevelCap = %d, want 1000", tuning.LevelCap)
	}
	if flags.LevelSkillPoints == nil {
		t.Fatal("Flags.LevelSkillPoints = nil, want the hand-ported growth formula")
	}
	cases := []struct {
		level int
		want  int
	}{
		{0, 0}, {1, 0}, {2, 1}, {40, 1}, {41, 1}, {42, 0}, {45, 1},
		{46, 0}, {47, 1}, {49, 1}, {51, 1}, {52, 0}, {60, 0}, {61, 1}, {71, 1},
	}
	for _, c := range cases {
		if got := flags.LevelSkillPoints(c.level); got != c.want {
			t.Errorf("LevelSkillPoints(%d) = %d, want %d", c.level, got, c.want)
		}
	}
}

func TestApplyGamemodes_Duos(t *testing.T) {
	_, mutable, flags := applyOne(t, "duos")
	if flags.Groups != 2 {
		t.Errorf("Flags.Groups = %d, want 2", flags.Groups)
	}
	// duos.js sets no mode, so config.js default stands.
	if mutable.Mode != DefaultMode {
		t.Errorf("Mode = %q, want %q (duos.js sets no mode, so config.js's default stands)",
			mutable.Mode, DefaultMode)
	}
	// caller's seeded default survives untouched.
	if len(mutable.RoomSetup) != 1 || mutable.RoomSetup[0] != "room_default" {
		t.Errorf("RoomSetup = %v, want [room_default]", mutable.RoomSetup)
	}
}

func TestApplyGamemodes_EmptyConfig(t *testing.T) {
	tuning := freshTuning(t)
	before := *tuning
	var mutable RoomMutableConfig
	var flags GamemodeFlags
	rng := jsutil.NewRand(1)
	if err := ApplyGamemodesFromPath(gamemodesDumpPath, tuning, &mutable, &flags, rng, []string{"ffa"}); err != nil {
		t.Fatalf("ApplyGamemodesFromPath(ffa): %v", err)
	}
	if !reflect.DeepEqual(*tuning, before) {
		t.Error("ffa.js (an empty {}) changed Tuning; want no-op")
	}
	if !reflect.DeepEqual(flags, GamemodeFlags{}) {
		t.Errorf("ffa.js changed Flags = %+v; want zero value", flags)
	}
	if len(mutable.RoomSetup) != 1 || mutable.RoomSetup[0] != "room_default" {
		t.Errorf("RoomSetup = %v, want [room_default]", mutable.RoomSetup)
	}
}

func TestApplyGamemodes_MultiGamemode(t *testing.T) {
	tuning := freshTuning(t)
	var mutable RoomMutableConfig
	var flags GamemodeFlags
	rng := jsutil.NewRand(1)
	if err := ApplyGamemodesFromPath(gamemodesDumpPath, tuning, &mutable, &flags, rng, []string{"arms_race", "ffa"}); err != nil {
		t.Fatalf("ApplyGamemodesFromPath(arms_race,ffa): %v", err)
	}
	if !flags.ArmsRace {
		t.Error("Flags.ArmsRace = false, want true")
	}
	if len(mutable.RoomSetup) != 1 || mutable.RoomSetup[0] != "room_default" {
		t.Errorf("RoomSetup = %v, want [room_default]", mutable.RoomSetup)
	}
	if len(tuning.ClassicEnemyTypesNest) == 0 {
		t.Error("Tuning.ClassicEnemyTypesNest is empty, want arms_race.js's override")
	}
}

func TestApplyGamemodes_UnknownGamemode(t *testing.T) {
	tuning := freshTuning(t)
	var mutable RoomMutableConfig
	var flags GamemodeFlags
	rng := jsutil.NewRand(1)
	if err := ApplyGamemodesFromPath(gamemodesDumpPath, tuning, &mutable, &flags, rng, []string{"does_not_exist"}); err == nil {
		t.Error("ApplyGamemodesFromPath with an unknown gamemode name returned nil error, want an error")
	}
}

func TestApplyGamemodes_EveryFileParses(t *testing.T) {
	dump, err := loadGamemodeDumpPath(gamemodesDumpPath)
	if err != nil {
		t.Skipf("gen/gamemodes.json unavailable (%v)", err)
	}
	for name := range dump.Gamemodes {
		name := name
		t.Run(name, func(t *testing.T) {
			tuning := freshTuning(t)
			var mutable RoomMutableConfig
			var flags GamemodeFlags
			rng := jsutil.NewRand(7)
			if err := ApplyGamemodesFromPath(gamemodesDumpPath, tuning, &mutable, &flags, rng, []string{name}); err != nil {
				t.Errorf("applying %q: %v", name, err)
			}
		})
	}
}
