package config

import (
	"reflect"
	"strings"
	"testing"
)

// dumpPath is gen/config.json relative to this package.
const dumpPath = "../../gen/config.json"

func TestLoadRepresentativeValues(t *testing.T) {
	tuning, err := Load(dumpPath)
	if err != nil {
		t.Fatalf("Load(%q): %v", dumpPath, err)
	}
	scalars := []struct {
		name string
		got  any
		want any
	}{
		{"DevBuild", tuning.DevBuild, false},
		{"Port", tuning.Port, 3000},
		{"VisibleListInterval", tuning.VisibleListInterval, 250},
		{"ChatMessageDuration", tuning.ChatMessageDuration, 15000},
		{"RunSpeed", tuning.RunSpeed, 1.5},
		{"MaxHeartbeatInterval", tuning.MaxHeartbeatInterval, 300000},
		{"GlassHealthFactor", tuning.GlassHealthFactor, 2.0},
		{"RoomBoundForce", tuning.RoomBoundForce, 0.01},
		{"SoftMaxSkill", tuning.SoftMaxSkill, 0.59},
		{"LevelCap", tuning.LevelCap, 45},
		{"SkillCap", tuning.SkillCap, 9},
		{"SkillCapSoft", tuning.SkillCapSoft, 0},
		{"TierMultiplier", tuning.TierMultiplier, 15},
		{"BotCap", tuning.BotCap, 0},
		{"BotNamePrefix", tuning.BotNamePrefix, "[AI] "},
		{"SpawnClass", tuning.SpawnClass, "basic"},
		{"FoodCap", tuning.FoodCap, 70},
		{"BossSpawnCooldown", tuning.BossSpawnCooldown, 260},
	}
	for _, c := range scalars {
		if c.got != c.want {
			t.Errorf("%s = %#v, want %#v", c.name, c.got, c.want)
		}
	}

	// SkillCapSoft's default of 0 makes SoftMaxSkill inert.
	if tuning.SkillCapSoft != 0 {
		t.Fatalf("SkillCapSoft = %d, want 0 (the documented inert default)", tuning.SkillCapSoft)
	}
	for _, level := range []int{0, 1, 45, 1000} {
		if level < tuning.SkillCapSoft {
			t.Fatalf("level %d < SkillCapSoft(%d): the soft-cap mechanic is no longer inert", level, tuning.SkillCapSoft)
		}
	}

	wantSkillChances := [10]float64{1, 1, 3, 4, 4, 4, 4, 2, 1, 1}
	if tuning.BotSkillUpgradeChances != wantSkillChances {
		t.Errorf("BotSkillUpgradeChances = %v, want %v", tuning.BotSkillUpgradeChances, wantSkillChances)
	}
	wantClassChances := [5]float64{1, 5, 20, 37, 37}
	if tuning.BotClassUpgradeChances != wantClassChances {
		t.Errorf("BotClassUpgradeChances = %v, want %v", tuning.BotClassUpgradeChances, wantClassChances)
	}

	// RoomSetup is config.js:402.
	if want := []string{"room_default"}; len(tuning.RoomSetup) != 1 || tuning.RoomSetup[0] != want[0] {
		t.Errorf("RoomSetup = %v, want %v", tuning.RoomSetup, want)
	}

	if len(tuning.TeamWeights) != 0 {
		t.Errorf("TeamWeights = %v, want empty", tuning.TeamWeights)
	}

	if len(tuning.Servers) != 7 {
		t.Fatalf("len(Servers) = %d, want 7", len(tuning.Servers))
	}
	first := tuning.Servers[0]
	if first.ID != "c" || first.Port != 4000 || first.Host != "localhost:4000" {
		t.Errorf("Servers[0] = %+v, want id=c port=4000 host=localhost:4000", first)
	}

	if len(tuning.BossTypes) != 3 {
		t.Fatalf("len(BossTypes) = %d, want 3", len(tuning.BossTypes))
	}
	wave := tuning.BossTypes[1]
	if len(wave.Bosses) != 1 || wave.Bosses[0] != "roguePalisade" {
		t.Errorf("BossTypes[1].Bosses = %v, want [roguePalisade]", wave.Bosses)
	}
	if len(wave.Amount) != 2 || wave.Amount[0] != 4 || wave.Amount[1] != 1 {
		t.Errorf("BossTypes[1].Amount = %v, want [4 1]", wave.Amount)
	}
	if wave.Message != "A strange trembling..." {
		t.Errorf("BossTypes[1].Message = %q", wave.Message)
	}
	if tuning.BossTypes[0].Message != "" {
		t.Errorf("BossTypes[0].Message = %q, want empty (JS entry omits it)", tuning.BossTypes[0].Message)
	}

	// FoodTypes is config.js:290-310.
	if len(tuning.FoodTypes) != 3 {
		t.Fatalf("len(FoodTypes) = %d, want 3", len(tuning.FoodTypes))
	}
	tier := tuning.FoodTypes[0]
	if tier.Weight != 64 || len(tier.Children) != 3 {
		t.Fatalf("FoodTypes[0] = %+v, want weight=64 with 3 children", tier)
	}
	shiny := tier.Children[0]
	if shiny.Weight != 125 || len(shiny.Children) != 6 {
		t.Fatalf("FoodTypes[0].Children[0] = %+v, want weight=125 with 6 children", shiny)
	}
	crasherWeight := shiny.Children[0]
	if crasherWeight.Weight != 200000000 || len(crasherWeight.Children) != 1 {
		t.Fatalf("FoodTypes[0].Children[0].Children[0] = %+v, want weight=2e8 with 1 child", crasherWeight)
	}
	leaf := crasherWeight.Children[0]
	if leaf.Weight != 24 || leaf.Name != "laby_0_0_0_0" || leaf.Children != nil {
		t.Errorf("FoodTypes[0].Children[0].Children[0].Children[0] = %+v, want weight=24 name=laby_0_0_0_0 leaf", leaf)
	}
}

func TestLoadRejectsUnknownKey(t *testing.T) {
	_, err := parse([]byte(`{"config": {"dev_build": false, "totally_new_key": 1}}`))
	if err == nil {
		t.Fatal("parse: want an error for an unrecognised key, got nil")
	}
	if !strings.Contains(err.Error(), "totally_new_key") {
		t.Errorf("parse error = %q, want it to name totally_new_key", err.Error())
	}
}

func TestLoadAcceptsExcludedKeys(t *testing.T) {
	tuning, err := parse([]byte(`{"config": {
		"dev_build": true,
		"mode": "ffa",
		"map_tile_width": 420,
		"map_tile_height": 420,
		"defineLevelSkillPoints": {"__jsFunction": true, "name": "defineLevelSkillPoints", "source": "..."}
	}}`))
	if err != nil {
		t.Fatalf("parse: %v", err)
	}
	if !tuning.DevBuild {
		t.Errorf("DevBuild = false, want true (excluded keys should not stop real fields from decoding)")
	}
}

func TestLoadMissingFile(t *testing.T) {
	if _, err := Load("does-not-exist.json"); err == nil {
		t.Fatal("Load: want an error for a missing file, got nil")
	}
}

// Ensure embedded config matches gen/config.json. Run tools/sync-embeds.sh if not.
func TestDefaultMatchesTheCanonicalDump(t *testing.T) {
	fromEmbed, err := Default()
	if err != nil {
		t.Fatalf("Default: %v (run tools/sync-embeds.sh)", err)
	}
	fromDisk, err := Load(dumpPath)
	if err != nil {
		t.Skipf("gen/config.json unavailable (%v); nothing to compare against", err)
	}
	if !reflect.DeepEqual(fromEmbed, fromDisk) {
		t.Error("the embedded config differs from gen/config.json — " +
			"run tools/sync-embeds.sh")
	}
}
