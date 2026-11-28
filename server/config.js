export const index = "index.html";
export const host = "localhost:8080";
export const allow_ACAO = false;
export const broadcast_divisor = 1;
export const entity_sleep = true;
export const load_all_mockups = false;
export const verbose_logs = false;
export const visible_list_interval = 250;
export const per_message_deflate = {
    threshold: 1024, // Don't bother compressing messages smaller than this.
    concurrencyLimit: 10, // How many messages can be compressed at once.
    zlibDeflateOptions: {
        level: 3, // 1 (fast) - 9 (small). 3 is plenty for game traffic.
        memLevel: 8 // 1-9. Higher uses more memory per player for slightly smaller packets.
    }
};
export const max_fov = 25000;
export const view_extra_margin = 150;
export const editor = true;
export const servers = [
    {
        host: "localhost:8080",

        id: "la",
        region: "Local",
        location: "Localhost",

        gamemode: ["ffa"],
        player_cap: 80,

        featured: false,
        hidden: false,
        private: false,

        properties: {
            allow_server_travel: true,
            bot_cap: 20,
            daily_tank: {
                tank: "desmos",
                tier: 3,
                ads: true,
                ad_sources: [
                    {
                        file: "example_video_ad.mp4",
                        use_regular_ad_size: true
                    },
                    {
                        file: "example_image_ad.png",
                        use_regular_ad_size: true
                    }
                ]
            }
        }
    },
    {
        host: "localhost:3001",

        id: "lb",
        region: "Local",
        location: "Localhost",

        gamemode: ["tdm"],
        player_cap: 80,

        featured: false,
        hidden: false,
        private: false,

        properties: {
            teams: 2,
            bot_cap: 20
        }
    },
    {
        host: "localhost:3002",

        id: "lc",
        region: "Local",
        location: "Localhost",

        gamemode: ["space", "open_tdm"],
        player_cap: 80,

        featured: false,
        hidden: false,
        private: false,

        properties: {
            round_arena: true,
            teams: 3,
            server_travel_properties: {
                loop_interval: 10000, // how often the portal loop executes in milliseconds
                portals: 1 // amount of portals to spawn
            },
            server_travel: [
                {
                    ip: "localhost:3000", // destination server host
                    portal_properties: {
                        spawn_chance: 3, // chance for a portal to spawn somewhere in the map each loop iteration (higher = lower chances, lower = higher chance)
                        color: "blue"
                    }
                }
            ]
        }
    },
    {
        host: "localhost:3003",

        id: "ld",
        region: "Local",
        location: "Localhost",

        gamemode: ["domination"],
        player_cap: 80,

        featured: false,
        hidden: false,
        private: false,

        properties: {
            teams: 4,
            bot_cap: 20
        }
    },
    {
        host: "localhost:3004",

        id: "le",
        region: "Local",
        location: "Localhost",

        gamemode: ["mothership"],
        player_cap: 80,

        featured: false,
        hidden: false,
        private: false,

        properties: {
            mothership_time_limit: 30000,
            teams: 2,
            bot_cap: 30
        }
    },
    {
        host: "localhost:3101",

        id: "lpa",
        region: "Local",
        location: "Localhost",

        gamemode: ["sandbox"],
        player_cap: 80,

        featured: false,
        hidden: false,
        private: false,

        properties: {
            allow_server_travel: true
        }
    }
];
export const map_tile_width = 420;
export const map_tile_height = 420;
export const spawn_message = true;
export const chat_message_duration = 15000;
export const popup_message_duration = 10000;
export const sanitize_chat_input = true;
export const broadcast_leader_usurped = false;
export const seasonal_events = true;
export const force_fireworks = false;
export const force_spooky_theme = false;
export const force_thanksgiving = false;
export const game_speed = 1;
export const run_speed = 1.5;
export const max_heartbeat_interval = 300000;
export const respawn_delay = 0;
export const instant_respawn = false;
export const afk_key_commands = false;
export const upgrade_delay = 3000;
export const upgrade_delay_reminder = 20000;
export const reverse_tank_cooldown = true;
export const bullet_spawn_offset = 1;
export const damage_multiplier = 1;
export const knockback_multiplier = 1.1;
export const glass_health_factor = 2;
export const room_bound_force = 0.01;
export const soft_max_skill = 0.59;
export const mothership_time_limit = 0;
export function defineLevelSkillPoints(level) {
    if (level < 2) {
        return 0;
    }
    if (level <= 40) {
        return 1;
    }
    if (level <= 45 && level & 1 === 1) {
        return 1;
    }
    return 0;
}
export const level_cap = 45;
export const level_cap_cheat = 45;
export const skill_cap = 9;
export const skill_cap_soft = 0;
export const tier_multiplier = 15;
export const bot_cap = 0;
export const bot_xp_gain = 60;
export const bot_start_level = 45;
export const bot_skill_upgrade_chances = [1, 1, 3, 4, 4, 4, 4, 2, 1, 1];
export const bot_class_upgrade_chances = [1, 5, 20, 37, 37];
export const bot_name_prefix = "[AI] ";
export const spawn_class = "basic";
export const regenerate_tick = 100;
export const enable_food = true;
export const food_cap = 150;
export const food_cap_nest = 15;
export const enemy_cap_nest = 10;
export const food_group_cap = 6;
export const food_types = Array(3).fill().map((_, i, a) => [
    // Chance of spawning in exponents of 4
    4 ** (a.length - i),
    // 4-wide dimension of the 4 shape tiers - regular, beta, alpha, omega
    Array(3).fill().map((_, j, b) => [
        // Chance of spawning in exponents of 5
        5 ** (b.length - j),
        // 6-wide dimension of the 6 shiny modifiers
        Array(6).fill().map((_, k, c) => [
            // Chance of spawning, set to 200mil for regular polygons and exponents of 10 otherwise
            k ? 10 ** (c.length - k - 1) : 200000000,

            // 2-wide dimension of the 2 shape "ranks" - normal, crasher
            // laby_${poly}_${tier}_${shiny}_${rank}
            [
                [24, `laby_${i}_${j}_${k}_0`],
                [1, `laby_${i}_0_${k}_1`] // comment out this line to disable crashers outside nest
            ]
        ])
    ])
]);
export const food_types_nest = Array(2).fill().map((_, i, a) => [
    // Chance of spawning in exponents of 4
    4 ** (a.length - i),
    // 4-wide dimension of the 4 shape tiers - regular, beta, alpha, omega
    Array(3).fill().map((_, j, b) => [
        // Chance of spawning in exponents of 5
        5 ** (b.length - j),
        // 6-wide dimension of the 6 shiny modifiers
        Array(6).fill().map((_, k, c) => [
            // Chance of spawning, set to 200mil for regular polygons and exponents of 10 otherwise
            k ? 10 ** (c.length - k - 1) : 200000000,

            // 2-wide dimension of the 2 shape "ranks" - normal, crasher
            // laby_${poly}_${tier}_${shiny}_${rank}
            [
                [24, `laby_${i + 3}_${j}_${k}_0`],
                [1, `laby_${i + 3}_0_${k}_1`] // comment out this line to disable crashers in nest
            ]
        ])
    ])
]);
export const classic_food = false;
export const classic_food_types = [
    [1, [
        [65, "egg"], [64, "square"], [45, "triangle"], [7, "pentagon"]
    ]],
    [1 / 50000, [
        [625, "gem"], [125, "shinySquare"], [25, "shinyTriangle"], [5, "shinyPentagon"]
    ]],
    [1 / 1000000, [
        [1296, "jewel"], [216, "legendarySquare"], [36, "legendaryTriangle"], [6, "legendaryPentagon"]
    ]]
];
export const classic_food_types_nest = [
    [1, [
        [16, "pentagon"], [4, "betaPentagon"], [1, "alphaPentagon"]
    ]]
];
export const classic_enemy_types_nest = [
    [1, [
        [1, "crasher"]
    ]],
    [1 / 20, [
        [1, "sentryGun"], [1, "sentrySwarm"], [1, "sentryTrap"]
    ]]
];
export const enable_bosses = true;
export const boss_control = false;
export const boss_spawn_cooldown = 260;
export const boss_spawn_delay = 6;
export const boss_types = [
    {
        bosses: ["eliteDestroyer", "eliteGunner", "eliteSprayer", "eliteBattleship", "eliteSpawner"],
        amount: [5, 5, 4, 2, 1], chance: 2, nameType: "a"
    },
    {
        bosses: ["roguePalisade"],
        amount: [4, 1], chance: 1, nameType: "castle",
        message: "A strange trembling..."
    },
    {
        bosses: ["summoner", "eliteSkimmer", "nestKeeper"],
        amount: [2, 2, 1], chance: 1, nameType: "a",
        message: "A strange trembling..."
    }
    /*{
        bosses: ["paladin", "freyja", "zaphkiel", "nyx", "theia"],
        amount: [1], chance: 0.01,
        message: "The world tremors as the celestials are reborn anew!",
    },
    {
        bosses: ["julius", "genghis", "napoleon"],
        amount: [1], chance: 0.1,
        message: "The darkness arrives as the realms are torn apart!",
    }*/
];
export const team_weights = {};
export const brain_damage = false;
export const random_body_colors = false;
export const room_setup = ["default"];
export const mode = "ffa";
export const dev_build = true;
