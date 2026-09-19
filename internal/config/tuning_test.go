package config

import "testing"

// From config.js:254-259.
func TestLevelSkillPoints(t *testing.T) {
	cases := []struct {
		level int
		want  int
	}{
		{0, 0},
		{1, 0},
		{2, 1},
		{39, 1},
		{40, 1},
		{41, 1},
		{42, 0},
		{43, 1},
		{44, 0},
		{45, 1},
		{46, 0},
		{100, 0},
	}
	for _, c := range cases {
		if got := LevelSkillPoints(c.level); got != c.want {
			t.Errorf("LevelSkillPoints(%d) = %d, want %d", c.level, got, c.want)
		}
	}
}

// Scalar fields copy correctly by value.
func TestTuningValueCopy(t *testing.T) {
	original := Tuning{DevBuild: false, LevelCap: 45, RunSpeed: 1.5}
	copyOfOriginal := original
	copyOfOriginal.DevBuild = true
	copyOfOriginal.LevelCap = 1

	if original.DevBuild != false || original.LevelCap != 45 {
		t.Fatalf("mutating the copy changed the original: %+v", original)
	}
	if copyOfOriginal.RunSpeed != 1.5 {
		t.Fatalf("copy lost an untouched field: %+v", copyOfOriginal)
	}
}
