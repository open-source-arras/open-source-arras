module.exports = {
    // Development
    dev_build: true, // Whether this version is unstable and should be clearly marked as such.

    // Client
    main_menu: 'index.html', // Where the main menu is located (in the /public folder).
    host: 'localhost:3000', // Game server domain. If the host is 'localhost:NUMBER', the NUMBER must be the port setting.
    port: 3000, // Which port to run the web server on.

    // Server
    visible_list_interval: 250, // How often to update the list of the entities that players can see. Has effects of when entities are activated.
    startup_logs: true, // Enable detailed startup logs and log speed loop warnings in the terminal
    load_all_mockups: false, // Set to true if you want every mockup to be loaded when the server starts. May noticeably slow down server startup.
    editor: true, // Enable the editor at '[host]/ext/editor'.

    /* SERVER PROPERTIES INFORMATION - Make sure to change the host, port and id between servers!

        share_client_server - Forces your server to share the same host and port as the client. (by default, 3000)
        - Only one server at a time can have this enabled.
        - This is REQUIRED if your server host doesn't support multi-ports and forces everything through the main server.

        host        - Server host location.
        port        - The port on the server.
        id          - (<host>/#<id>)

        region      - The region tab the server is sorted into on the main menu.
        serverhost  - The host of the server in the server list tooltip.
        location    - The location of the server in the server list tooltip.

        gamemode    - The selected gamemode.
        player_cap  - Not including bots. Set to 0 to disable.

        featured    - Whether the server is featured or not.
        unlisted    - Whether the server shows up in the server list (if its id isn't in the url).
        private     - Whether the server requires a privileged token to join (except through server travel).

        properties  - This overrides other settings in this file, assuming the selected gamemode doesn't also override it.
    */

    servers: [
        {
            share_client_server: false,
            host: 'localhost:4000',
            port: 4000,
            id: 'c',

            region: "Local",
            serverhost: "Local",
            location: "Localhost",
            gamemode: ['tdm'],
            player_cap: 80,

            featured: false,
            unlisted: true,
            private: false,

            properties: {

            }
        },
        {
            share_client_server: false,
            host: 'localhost:5050',
            port: 5050,
            id: 'x',

            region: "Local",
            serverhost: "Local",
            location: "Localhost",
            gamemode: ['arms_race', 'ffa'],
            player_cap: 80,

            featured: false,
            unlisted: false,
            private: true,

            properties: {

            }
        },
        {
            share_client_server: false,
            host: 'localhost:3001',
            port: 3001,
            id: 'la',

            region: "Local",
            serverhost: "Local",
            location: "Localhost",
            gamemode: ['ffa'],
            player_cap: 80,

            featured: false,
            unlisted: false,
            private: false,

            properties: {
                bot_cap: 20,
                daily_tank: {
                    tank: 'whirlwind',
                    tier: 3,
                    ads: false,
                    ad_sources: [
                        {
                            file: 'example_video_ad.mp4',
                            use_regular_ad_size: true
                        },
                        {
                            file: 'example_image_ad.png',
                            use_regular_ad_size: true
                        }
                    ]
                }
            }
        },
        {
            share_client_server: false,
            host: 'localhost:3002',
            port: 3002,
            id: 'lb',

            region: "Local",
            serverhost: "Local",
            location: "Localhost",
            gamemode: ['maze'],
            player_cap: 80,

            featured: false,
            unlisted: false,
            private: false,

            properties: {
                allow_server_travel: true
            }
        },
        {
            share_client_server: false,
            host: 'localhost:3003',
            port: 3003,
            id: 'lc',

            region: "Local",
            serverhost: "Local",
            location: "Localhost",
            gamemode: ['tdm'],
            player_cap: 80,

            featured: false,
            unlisted: false,
            private: false,

            properties: {
                teams: 2,
                bot_cap: 40,
                server_travel_properties: {
                    loop_interval: 10_000, // how often the portal loop executes in seconds
                    portals: 1, // amount of portals to spawn
                },
                server_travel: [
                    {
                        ip: 'localhost:3002', // destination server host, don't add "https://" or any slashes to it
                        portal_properties: {
                            spawn_chance: 3, // chance for a portal to spawn somewhere in the map each loop iteration (higher = lower chances, lower = higher chance)
                            color: 'red', // portal color
                        }
                    }
                ]
            }
        },
        {
            share_client_server: false,
            host: 'localhost:3004',
            port: 3004,
            id: 'ld',

            region: "Local",
            serverhost: "Local",
            location: "Localhost",
            gamemode: ['mothership'],
            player_cap: 80,

            featured: false,
            unlisted: false,
            private: false,

            properties: {
                mothership_time_limit: 30_000,
                teams: 3,
                bot_cap: 30
            }
        },
        {
            share_client_server: false,
            host: 'localhost:3099',
            port: 3099,
            id: 'lz',

            region: "Local",
            serverhost: "Local",
            location: "Localhost",
            gamemode: ['sandbox'],
            player_cap: 80,

            featured: false,
            unlisted: false,
            private: false,

            properties: {

            }
        },
    ],

    // Web Server
    allow_ACAO: false, // Access-Control-Allow-Origin, allows any server/client to access data from the WebServer.

    // Map
    map_tile_width: 420,
    map_tile_height: 420,

    // The message that appears once a player spawns.
    spawn_message: "You have spawned! Welcome to the game.\n"
                 + "You will be invulnerable until you move or shoot.",
    token_message: "Friendly reminder: Please do not repeatedly kill others with an overpowered tank.",

    chat_message_duration: 15_000, // How long a chat message lasts in milliseconds.
    popup_message_duration: 10_000, // How long a popup message lasts in milliseconds.
    sanitize_chat_input: true, // If you don't want your players to color their messages. They get sanitized after addons interpret them, but before they're added to the chat message dictionary.

    // Seasonal
    fireworks: false, // Toggles fireworks (automatic around July 4 in US-region servers)
    thanksgiving: false, // Toggles the seasonal thanksgiving theme (replaces Motherships with Turkeys)
    spooky_theme: false, // Toggles the seasonal halloween theme (adds eyes to walls and replaces rocks to pumpkins)

    // Gameplay
    game_speed: 1, // General game speed.
    run_speed: 1.5, // General multiplier for acceleration and max speeds.
    max_heartbeat_interval: 300_000, // How long (in milliseconds) a socket can be disconnected before their tank self-destructs.
    respawn_delay: 0, // How long (in seconds) you have to wait to respawn. Set to 0 to disable.

    upgrade_delay: 3_000, // How long (in milliseconds) you have to stay still to upgrade outside of a base. Set to 0 to disable.
    upgrade_delay_reminder: 20_000, // How often (in milliseconds) you will be reminded to stay still and not shoot to upgrade outside of a base if you haven't upgraded yet.

    bullet_spawn_offset: 1, // Where the bullet spawns, where 1 is fully outside the barrel and -1 is fully inside the barrel, and 0 is halfway between.
    damage_multiplier: 1, // General damage multiplier everytime damage is dealt.
    knockback_multiplier: 1.1, // General knockback multiplier everytime knockback is applied.
    glass_health_factor: 2, // TODO: Figure out how the math behind this works.
    room_bound_force: 0.01,// How strong the force is that confines entities to the map and portals apply to entities.
    soft_max_skill: 0.59, // TODO: Find out what the intention behind the implementation of this configuration is.

    mothership_time_limit: 0, // How long (in milliseconds) a player can have in control of their team's mothership. Set to 0 to disable.

    // When an entity reaches a level, this function is called and returns how many skill points that entity gets for reaching that level.
    defineLevelSkillPoints: level => {
        if (level < 2) return 0;
        if (level <= 40) return 1;
        if (level <= 45 && level & 1 === 1) return 1;
        return 0;
    },

    level_cap: 45, // Maximum normally achievable level.
    level_cap_cheat: 45, // Maximum level via the level-up key and auto-level-up.

    skill_cap: 9, // Default skill caps.
    skill_cap_soft: 0, // TODO: Figure out what this does.
    tier_multiplier: 15, // Level difference between each upgrade tier.

    // Bots
    bot_cap: 0, // Maximum number of bots that can be on the server. Set to 0 to disable bots.
    bot_xp_gain: 60, // How much XP bots get until they reach level_cap.
    bot_start_level: 45, // How much XP bots will receive when first created.
    bot_skill_upgrade_chances: [1, 1, 3, 4, 4, 4, 4, 2, 1, 1], // The chances of a bot upgrading a specific skill when skill upgrades are available.
    bot_class_upgrade_chances: [1, 5, 20, 37, 37], // The chances of a bot upgrading a specific amount of times before it stops upgrading.
    bot_name_prefix: "[AI] ", // This is prefixed before the bot's randomly chosen name.

    // The class that players and bots spawn as.
    spawn_class: 'basic',

    // How every entity regenerates their health.
    regenerate_tick: 100,

    // Food
    enable_food: true, // Allows food to spawn.
    food_cap: 70, // Maximum number of regular food at any time.
    food_cap_nest: 15, // Maximum number of nest food at any time.
    enemy_cap_nest: 10, // Maximum number of enemy nest food at any time.
    food_group_cap: 6, // Number of foods that random food groups spawn with

    // Tiered Food
    food_types: Array(3).fill().map((_, i, a) => [ // Possible food types outside the nest
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
                    //[1, `laby_${i}_${j}_${k}_1`] // uncomment to enable crashers outside nest
                ]
            ])
        ])
    ]),
    food_types_nest: Array(2).fill().map((_, i, a) => [ // Possible food types in the nest
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
                    //[1, `laby_${i + 3}_${j}_${k}_1`] // uncomment to enable crashers in nest
                ]
            ])
        ])
    ]),

    // Classic Food
    classic_food: false, // Enables classic (Old Dreadnoughts) food types.
    classic_food_types: [ // Possible classic food types outside the nest
        [1, [
            [65, 'egg'], [64, 'triangle'], [45, 'square'], [7, 'pentagon']//, [1, 'hexagon']
        ]],
        [1/50000, [
            [625, 'gem'], [125, 'shinyTriangle'], [25, 'shinySquare'], [5, 'shinyPentagon']//, [1, 'shinyHexagon']
        ]],
        [1/1000000, [
            [1296, 'jewel'], [216, 'legendaryTriangle'], [36, 'legendarySquare'], [6, 'legendaryPentagon']//, [1, 'legendaryHexagon']
        ]]
    ],
    classic_food_types_nest: [ // Possible classic food types in the nest
        [1, [
            [16, 'pentagon'], [4, 'betaPentagon'], [1, 'alphaPentagon']/*, [16, 'presentRY'], [16, 'presentRP'], [16, 'presentRW'], [16, 'presentGY'], [16, 'presentGP'], [16, 'presentGW'], [16, 'presentBY'], [16, 'presentBP'], [16, 'presentBW'],*/
        ]]
    ],
    classic_enemy_types_nest: [ // Possible classic enemy food types in the nest
        [1, [
            [1, 'crasher']
        ]],
        [1/20, [
            [1, 'sentryGun'], [1, 'sentrySwarm'], [1, 'sentryTrap']
        ]]
    ],

    // Bosses
    enable_bosses: true,
    boss_control: false, // Allows players to control bosses like dominators and motherships.
    boss_spawn_cooldown: 260, // The delay (in seconds) between boss spawns.
    boss_spawn_delay: 6, // The delay (in seconds) between the boss spawn being announced and the boss(es) actually spawning.
    boss_types: [
        {
            bosses: ['eliteDestroyer', 'eliteGunner', 'eliteSprayer', 'eliteBattleship', 'eliteSpawner'],
            amount: [5, 5, 4, 2, 1], chance: 2, nameType: 'a',
        },
        {
            bosses: ['roguePalisade'],
            amount: [4, 1], chance: 1, nameType: 'castle',
            message: 'A strange trembling...',
        },
        {
            bosses: ['summoner', 'eliteSkimmer', 'nestKeeper'],
            amount: [2, 2, 1], chance: 1, nameType: 'a',
            message: 'A strange trembling...',
        },
        /*{
            bosses: ['paladin', 'freyja', 'zaphkiel', 'nyx', 'theia'],
            amount: [1], chance: 0.01,
            message: 'The world tremors as the celestials are reborn anew!',
        },
        {
            bosses: ['julius', 'genghis', 'napoleon'],
            amount: [1], chance: 0.1,
            message: 'The darkness arrives as the realms are torn apart!',
        }*/
    ],

    // How many members a team can have in comparison to an unweighed team.
    // Example: We have team A and B. If the weight of A is 2 and B is 1, then the game will try to give A twice as many members as B.
    // Check game/gamemodes/config to see how this works.
    team_weights: {},

    // Fun
    brain_damage: false, // Violently shakes your camera and tank if you name yourself 'Brain Damage'. Disabled by default for epilepsy concerns.
    random_body_colors: false,

    // Room setup (don't change these unless you know what you're doing)
    room_setup: ['room_default'],
    round_arena: false,
    mode: 'ffa',
}
