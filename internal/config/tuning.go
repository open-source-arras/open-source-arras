// Package config is arras-go's static tuning layer, ported from
// js-src/server/config.js. Per docs/architecture.md ("Config is three things
// wearing one name"), the JS Config object is actually three different
// things sharing one name, and this package is only the first of them: the
// OURBREAK_FUNCTIONS belong to the room and gamemode packages, not here.
// See load.go's excludedKeys for the exact config.js keys this package
// declined to load, and why.
package config

import "encoding/json"

type Tuning struct {
	DevBuild            bool   `json:"dev_build"`
	MainMenu            string `json:"main_menu"`
	Host                string `json:"host"`
	Port                int    `json:"port"`
	VisibleListInterval int    `json:"visible_list_interval"`
	StartupLogs         bool   `json:"startup_logs"`
	LoadAllMockups      bool   `json:"load_all_mockups"`
	Editor              bool   `json:"editor"`

	Servers []ServerDef `json:"servers"`

	AllowACAO bool `json:"allow_ACAO"`

	SpawnMessage         string `json:"spawn_message"`
	TokenMessage         string `json:"token_message"`
	ChatMessageDuration  int    `json:"chat_message_duration"`
	PopupMessageDuration int    `json:"popup_message_duration"`
	SanitizeChatInput    bool   `json:"sanitize_chat_input"`

	Fireworks    bool `json:"fireworks"`
	Thanksgiving bool `json:"thanksgiving"`
	SpookyTheme  bool `json:"spooky_theme"`

	GameSpeed            float64 `json:"game_speed"`
	RunSpeed             float64 `json:"run_speed"`
	MaxHeartbeatInterval int     `json:"max_heartbeat_interval"`
	RespawnDelay         int     `json:"respawn_delay"`
	UpgradeDelay         int     `json:"upgrade_delay"`
	UpgradeDelayReminder int     `json:"upgrade_delay_reminder"`
	BulletSpawnOffset    float64 `json:"bullet_spawn_offset"`
	DamageMultiplier     float64 `json:"damage_multiplier"`
	KnockbackMultiplier  float64 `json:"knockback_multiplier"`
	GlassHealthFactor    float64 `json:"glass_health_factor"`
	RoomBoundForce       float64 `json:"room_bound_force"`
	SoftMaxSkill         float64 `json:"soft_max_skill"`
	MothershipTimeLimit  int     `json:"mothership_time_limit"`

	DailyTank *DailyTank `json:"daily_tank"`

	LevelCap       int `json:"level_cap"`
	LevelCapCheat  int `json:"level_cap_cheat"`
	SkillCap       int `json:"skill_cap"`
	SkillCapSoft   int `json:"skill_cap_soft"`
	TierMultiplier int `json:"tier_multiplier"`

	BotCap                 int         `json:"bot_cap"`
	BotXPGain              int         `json:"bot_xp_gain"`
	BotStartLevel          int         `json:"bot_start_level"`
	BotSkillUpgradeChances [10]float64 `json:"bot_skill_upgrade_chances"`
	BotClassUpgradeChances [5]float64  `json:"bot_class_upgrade_chances"`
	BotNamePrefix          string      `json:"bot_name_prefix"`

	SpawnClass     string `json:"spawn_class"`
	RegenerateTick int    `json:"regenerate_tick"`

	EnableFood    bool         `json:"enable_food"`
	FoodCap       int          `json:"food_cap"`
	FoodCapNest   int          `json:"food_cap_nest"`
	EnemyCapNest  int          `json:"enemy_cap_nest"`
	FoodGroupCap  int          `json:"food_group_cap"`
	FoodTypes     []WeightNode `json:"food_types"`
	FoodTypesNest []WeightNode `json:"food_types_nest"`

	ClassicFood           bool         `json:"classic_food"`
	ClassicFoodTypes      []WeightNode `json:"classic_food_types"`
	ClassicFoodTypesNest  []WeightNode `json:"classic_food_types_nest"`
	ClassicEnemyTypesNest []WeightNode `json:"classic_enemy_types_nest"`

	EnableBosses      bool       `json:"enable_bosses"`
	BossControl       bool       `json:"boss_control"`
	BossSpawnCooldown int        `json:"boss_spawn_cooldown"`
	BossSpawnDelay    int        `json:"boss_spawn_delay"`
	BossTypes         []BossWave `json:"boss_types"`

	TeamWeights      map[int]float64 `json:"team_weights"`
	BrainDamage      bool            `json:"brain_damage"`
	RandomBodyColors bool            `json:"random_body_colors"`
	RoomSetup        []string        `json:"room_setup"`
	RoundArena       bool            `json:"round_arena"`
}

func LevelSkillPoints(level int) int {
	if level < 2 {
		return 0
	}
	if level <= 40 {
		return 1
	}
	if level <= 45 && level%2 == 1 {
		return 1
	}
	return 0
}

type ServerDef struct {
	ShareClientServer bool     `json:"share_client_server"`
	Host              string   `json:"host"`
	Port              int      `json:"port"`
	ID                string   `json:"id"`
	Region            string   `json:"region"`
	Serverhost        string   `json:"serverhost"`
	Location          string   `json:"location"`
	Gamemode          []string `json:"gamemode"`
	PlayerCap         int      `json:"player_cap"`
	Featured          bool     `json:"featured"`
	Unlisted          bool     `json:"unlisted"`
	Private           bool     `json:"private"`

	Properties map[string]json.RawMessage `json:"properties"`
}

type DailyTank struct {
	Tank      string        `json:"tank"`
	Tier      int           `json:"tier"`
	Ads       bool          `json:"ads"`
	AdSources []DailyTankAd `json:"ad_sources"`
}

type DailyTankAd struct {
	File                string  `json:"file"`
	UseRegularAdSize    bool    `json:"use_regular_ad_size"`
	HasUseRegularAdSize bool    `json:"-"`
	ImageWaitTime       float64 `json:"image_wait_time"`
	HasImageWaitTime    bool    `json:"-"`
}

func (a *DailyTankAd) UnmarshalJSON(b []byte) error {
	type plain DailyTankAd
	var raw struct {
		plain
		Use  *bool    `json:"use_regular_ad_size"`
		Wait *float64 `json:"image_wait_time"`
	}
	if err := json.Unmarshal(b, &raw); err != nil {
		return err
	}
	*a = DailyTankAd(raw.plain)
	if raw.Use != nil {
		a.UseRegularAdSize, a.HasUseRegularAdSize = *raw.Use, true
	}
	if raw.Wait != nil {
		a.ImageWaitTime, a.HasImageWaitTime = *raw.Wait, true
	}
	return nil
}

type BossWave struct {
	Bosses   []string `json:"bosses"`
	Amount   []int    `json:"amount"`
	Chance   float64  `json:"chance"`
	NameType string   `json:"nameType"`
	Message  string   `json:"message"` // empty when the JS entry omits it
}

type WeightNode struct {
	Weight   float64
	Name     string
	Children []WeightNode
}

func (n *WeightNode) UnmarshalJSON(data []byte) error {
	var raw []json.RawMessage
	if err := json.Unmarshal(data, &raw); err != nil {
		return err
	}
	if len(raw) != 2 {
		return &json.UnmarshalTypeError{Value: "weight node", Type: nil}
	}
	if err := json.Unmarshal(raw[0], &n.Weight); err != nil {
		return err
	}
	if err := json.Unmarshal(raw[1], &n.Name); err == nil {
		n.Children = nil
		return nil
	}
	n.Name = ""
	return json.Unmarshal(raw[1], &n.Children)
}
