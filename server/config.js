module.exports = {
    /** PUBLIC **/

    // Where the main menu is located (in the /public folder).
    index: "index.html",

    // Web server domain.
    host: "localhost:8080",

    // (TO BE REMOVED) Which port to run the web server on.
    port: 8080,


    /** SERVER **/

    // How often to send entity/camera updates, in ticks. 1 = every tick.
    broadcast_divisor: 1,

    // Whether still, inert bodies (walls etc.) can skip per-tick work.
    entity_sleep: true,

    // Load every mockup when the server starts instead of only when they are needed.
    // Useful for debugging, but may noticeably slow down server startup.
    load_all_mockups: false,

    // Enable detailed startup logs and log speed loop warnings in the terminal.
    verbose_logs: false,

    // How often to update the list of the entities that players can see. Has effects of when entities are activated.
    visible_list_interval: 250,

    // Compress websocket messages, saves a lot of bandwidth on big packets.
    // Replace the object with "false" to disable.
    per_message_deflate: {
        threshold: 1024, // Don't bother compressing messages smaller than this.
        concurrencyLimit: 10, // How many messages can be compressed at once.
        zlibDeflateOptions: {
            level: 3, // 1 (fast) - 9 (small). 3 is plenty for game traffic.
            memLevel: 8 // 1-9. Higher uses more memory per player for slightly smaller packets.
        }
    },

    // Hard cap for camera FOV sent to clients.
    max_fov: 25000,

    // Extra margin beyond the visible viewport.
    view_extra_margin: 150,

    // Enable the editor at '[host]/ext/editor'.
    editor: true,

    /** SERVER PROPERTIES INFORMATION - Make sure to change the host, port and id between servers!

        share_client_server - Forces your server to share the same host and port as the client.
        - Only one server at a time can have this enabled.
        - This is REQUIRED if your server host doesn't support multi-ports and forces everything through the main server.

        host        - Server host location.
        port        - The port on the server.
        id          - (<host>/#<id>)

        region      - The region tab the server is sorted into on the main menu.
        location    - The location of the server in the server list tooltip.
        gamemode    - The selected gamemode.
        player_cap  - Not including bots. Set to 0 to disable.

        featured    - Whether the server is featured or not.
        hidden      - Whether the server shows up in the server list (if its id isn't in the url).
        private     - Whether the server requires a privileged token to join (except through server travel).

        properties  - This overrides other settings in this file, assuming the selected gamemode doesn't also override it.
    
    **/

    servers: [
        {
            share_client_server: true,
            host: "localhost:3000", // ignored since we're starting from client server
            port: 3000, // ignored since we're starting from client server
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
            port: 3001,
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
            port: 3002,
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
                    loop_interval: 10_000, // how often the portal loop executes in milliseconds
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
            port: 3003,
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
            port: 3004,
            id: "le",

            region: "Local",
            location: "Localhost",
            gamemode: ["mothership"],
            player_cap: 80,

            featured: false,
            hidden: false,
            private: false,

            properties: {
                mothership_time_limit: 30_000,
                teams: 2,
                bot_cap: 30
            }
        },
        {
            host: "localhost:3101",
            port: 3101,
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
    ],

    /** WEB SERVER **/

    // Access-Control-Allow-Origin, allows any server/client to access data from the web server.
    allow_ACAO: false,


    /** CHAT/POPUPS **/

    // How wide/tall the map tiles are.
    map_tile_width: 420,
    map_tile_height: 420,

    // Whether to send the popup message(s) that appear on spawn.
    spawn_message: true,

    // How long a chat message lasts in milliseconds.
    chat_message_duration: 15_000,

    // How long a popup message lasts in milliseconds.
    popup_message_duration: 10_000,

    // If you don't want your players to color their messages.
    // They get sanitized after mods interpret them, but before they're added to the chat message dictionary.
    sanitize_chat_input: true,

    // Broadcasts "The leader has been usurped by..." when the leader dies.
    broadcast_leader_usurped: false,


    /** SEASONAL **/

    // Enable seasonal events at specific times of the year.
    seasonal_events: true,

    // Forcefully enable certain seasonal events outside of their designated time.
    force_fireworks: false,
    force_spooky_theme: false,
    force_thanksgiving: false,


    /** GAMEPLAY **/

    // Game speed multiplier.
    game_speed: 1,

    // Multiplier for acceleration and max speeds.
    run_speed: 1.5,

    // How long (in milliseconds) a socket can be disconnected before their tank self-destructs.
    max_heartbeat_interval: 300_000,

    // How long (in seconds) you have to wait to respawn. Set to 0 to disable.
    respawn_delay: 0,

    // Allow players to respawn instantly via Enter key, bypassing the respawn delay timer.
    instant_respawn: false,

    // Allow AFK players to use key commands.
    afk_key_commands: false,

    // How long (in milliseconds) you have to stay still to upgrade outside of a base. Set to 0 to disable.
    upgrade_delay: 3_000,

    // How often (in milliseconds) you will be reminded to stay still and not shoot to upgrade outside of a base if you haven't upgraded yet.
    upgrade_delay_reminder: 20_000,

    // Enable the "Please slow down!" cooldown when spamming Reverse Tank.
    reverse_tank_cooldown: true,

    // Where the bullet spawns relative to the barrel.
    // 1 is fully outside the barrel and -1 is fully inside the barrel. 0 is halfway between.
    bullet_spawn_offset: 1,

    // Overall damage multiplier everytime damage is dealt.
    damage_multiplier: 1,

    // Overall knockback multiplier everytime knockback is applied.
    knockback_multiplier: 1.1,

    // TODO: Figure out how the math behind this works.
    glass_health_factor: 2,

    // How strong the force is that confines entities to the map and portals apply to entities.
    room_bound_force: 0.01,

    // TODO: Find out what the intention behind the implementation of this configuration is.
    soft_max_skill: 0.59,

    // How long (in milliseconds) a player can have in control of their team's mothership.
    // Set to 0 to disable.
    mothership_time_limit: 0,

    // When an entity reaches a level, this function is called and returns how many skill points that entity gets for reaching that level.
    defineLevelSkillPoints: level => {
        if (level < 2) return 0;
        if (level <= 40) return 1;
        if (level <= 45 && level & 1 === 1) return 1;
        return 0;
    },

    // Maximum normally achievable level.
    level_cap: 45,

    // Maximum level via the level-up key and auto-level-up.
    level_cap_cheat: 45,

    // Default skill caps.
    skill_cap: 9,

    // TODO: Figure out what this does.
    skill_cap_soft: 0,

    // Level difference between each upgrade tier.
    tier_multiplier: 15,

    /** BOTS **/

    // Maximum number of bots that can be on the server. Set to 0 to disable bots.
    bot_cap: 0,

    // How much XP bots get until they reach level_cap.
    bot_xp_gain: 60,

    // How much XP bots will receive when first created.
    bot_start_level: 45,

    // The chances of a bot upgrading a specific skill when skill upgrades are available.
    bot_skill_upgrade_chances: [1, 1, 3, 4, 4, 4, 4, 2, 1, 1],

    // The chances of a bot upgrading a specific amount of times before it stops upgrading.
    bot_class_upgrade_chances: [1, 5, 20, 37, 37],

    // This is prefixed before the bot's randomly chosen name.
    bot_name_prefix: "[AI] ",

    // The class that players and bots spawn as.
    spawn_class: "basic",

    // How every entity regenerates their health.
    regenerate_tick: 100,

    /** FOOD **/

    // Allows food to spawn.
    enable_food: true,

    // Maximum number of regular food at any time.
    food_cap: 150,

    // Maximum number of nest food at any time.
    food_cap_nest: 15,

    // Maximum number of enemy nest food at any time.
    enemy_cap_nest: 10,

    // Number of foods that random food groups spawn with
    food_group_cap: 6,

    // These functions manage the possible food types inside and outside the nest.
    food_types: Array(3).fill().map((_, i, a) => [
    // Chance of spawning in exponents of 4
        4 ** (a.length - i),
        // 4-wide dimension of the 4 shape tiers - regular, beta, alpha, omega
        Array(3).fill().map((_, j, b) => [
            // Chance of spawning in exponents of 5
            5 ** (b.length - j),
            // 6-wide dimension of the 6 shiny modifiers
            Array(6).fill().map((_, k, c) => [
                // Chance of spawning, set to 200mil for regular polygons and exponents of 10 otherwise
                k ? 10 ** (c.length - k - 1) : 200_000_000,

                // 2-wide dimension of the 2 shape "ranks" - normal, crasher
                // laby_${poly}_${tier}_${shiny}_${rank}
                [
                    [24, `laby_${i}_${j}_${k}_0`],
                    [1, `laby_${i}_0_${k}_1`] // comment out this line to disable crashers outside nest
                ]
            ])
        ])
    ]),
    food_types_nest: Array(2).fill().map((_, i, a) => [
    // Chance of spawning in exponents of 4
        4 ** (a.length - i),
        // 4-wide dimension of the 4 shape tiers - regular, beta, alpha, omega
        Array(3).fill().map((_, j, b) => [
            // Chance of spawning in exponents of 5
            5 ** (b.length - j),
            // 6-wide dimension of the 6 shiny modifiers
            Array(6).fill().map((_, k, c) => [
                // Chance of spawning, set to 200mil for regular polygons and exponents of 10 otherwise
                k ? 10 ** (c.length - k - 1) : 200_000_000,

                // 2-wide dimension of the 2 shape "ranks" - normal, crasher
                // laby_${poly}_${tier}_${shiny}_${rank}
                [
                    [24, `laby_${i + 3}_${j}_${k}_0`],
                    [1, `laby_${i + 3}_0_${k}_1`] // comment out this line to disable crashers in nest
                ]
            ])
        ])
    ]),

    // Enables classic (Old Dreadnoughts) food types.
    classic_food: false,

    // These functions manage the possible classic food types inside and outside the nest.
    classic_food_types: [
        [1, [
            [65, "egg"], [64, "square"], [45, "triangle"], [7, "pentagon"]
        ]],
        [1 / 50000, [
            [625, "gem"], [125, "shinySquare"], [25, "shinyTriangle"], [5, "shinyPentagon"]
        ]],
        [1 / 1000000, [
            [1296, "jewel"], [216, "legendarySquare"], [36, "legendaryTriangle"], [6, "legendaryPentagon"]
        ]]
    ],
    classic_food_types_nest: [
        [1, [
            [16, "pentagon"], [4, "betaPentagon"], [1, "alphaPentagon"]
        ]]
    ],
    classic_enemy_types_nest: [
        [1, [
            [1, "crasher"]
        ]],
        [1 / 20, [
            [1, "sentryGun"], [1, "sentrySwarm"], [1, "sentryTrap"]
        ]]
    ],

    /** BOSSES **/

    // Allow bosses to spawn.
    enable_bosses: true,

    // Allow players to control bosses like dominators and motherships.
    boss_control: false,

    // The delay (in seconds) between boss spawns.
    boss_spawn_cooldown: 260,

    // The delay (in seconds) between the boss spawn being announced and the boss(es) actually spawning.
    boss_spawn_delay: 6,

    // Bosses that may spawn, how many, and what chance they have of spawning.
    boss_types: [
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
    ],

    // How many members a team can have in comparison to an unweighed team.
    // Example: We have team A and B. If the weight of A is 2 and B is 1, then the game will try to give A twice as many members as B.
    // Check game/gamemodes/config to see how this works.
    team_weights: {},


    /** FUN **/

    // Violently shakes your camera and tank if you name yourself 'Brain Damage'.
    // Disabled by default for epilepsy concerns.
    brain_damage: false,

    // Gives all players and bots random colours.
    random_body_colors: false,

    /** MISC **/

    // Room setup (don't change these unless you know what you're doing)
    room_setup: ["default"],
    mode: "ffa",

    // Development build marker.
    dev_build: true
};
