package config

import (
	"embed"
	"encoding/json"
	"fmt"
	"os"
	"reflect"
	"sort"
	"strings"
)

//go:embed data/config.json
var embedded embed.FS

const embeddedPath = "data/config.json"

type dumpFile struct {
	Config json.RawMessage `json:"config"`
}

var excludedKeys = map[string]string{
	"mode":                   "chatCommands.js:110-115 reassigns it live from an admin chat command -- room-mutable state",
	"map_tile_width":         "game.js:472-481 exposes a live getter/setter on room -- mutated after boot, not Tuning",
	"map_tile_height":        "game.js:473-481, same live getter/setter pattern as map_tile_width",
	"defineLevelSkillPoints": "the only function-valued key; ported as the LevelSkillPoints function, not a field",
}

func Default() (Tuning, error) {
	data, err := embedded.ReadFile(embeddedPath)
	if err != nil {
		return Tuning{}, fmt.Errorf("config: embedded %s: %w", embeddedPath, err)
	}
	tuning, err := parse(data)
	if err != nil {
		return Tuning{}, fmt.Errorf("config: embedded %s: %w", embeddedPath, err)
	}
	return tuning, nil
}

func Load(path string) (Tuning, error) {
	data, err := os.ReadFile(path)
	if err != nil {
		return Tuning{}, fmt.Errorf("config: read %s: %w", path, err)
	}
	tuning, err := parse(data)
	if err != nil {
		return Tuning{}, fmt.Errorf("config: %s: %w", path, err)
	}
	return tuning, nil
}

func parse(data []byte) (Tuning, error) {
	var file dumpFile
	if err := json.Unmarshal(data, &file); err != nil {
		return Tuning{}, fmt.Errorf("parse dump: %w", err)
	}

	var tuning Tuning
	if err := json.Unmarshal(file.Config, &tuning); err != nil {
		return Tuning{}, fmt.Errorf("decode config: %w", err)
	}

	var rawKeys map[string]json.RawMessage
	if err := json.Unmarshal(file.Config, &rawKeys); err != nil {
		return Tuning{}, fmt.Errorf("decode config: %w", err)
	}
	if err := checkKnownKeys(rawKeys); err != nil {
		return Tuning{}, err
	}

	return tuning, nil
}

func checkKnownKeys(raw map[string]json.RawMessage) error {
	known := tuningJSONFields()
	var unknown []string
	for key := range raw {
		if known[key] {
			continue
		}
		if _, ok := excludedKeys[key]; ok {
			continue
		}
		unknown = append(unknown, key)
	}
	if len(unknown) == 0 {
		return nil
	}
	sort.Strings(unknown)
	return fmt.Errorf("unrecognised config.js key(s), port or exclude before loading: %s", strings.Join(unknown, ", "))
}

func tuningJSONFields() map[string]bool {
	fields := make(map[string]bool)
	t := reflect.TypeOf(Tuning{})
	for i := 0; i < t.NumField(); i++ {
		name, _, _ := strings.Cut(t.Field(i).Tag.Get("json"), ",")
		if name != "" && name != "-" {
			fields[name] = true
		}
	}
	return fields
}
