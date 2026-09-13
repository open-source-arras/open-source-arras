module.exports = {
    mode: "tdm",
    teams: 2,
    assault: true,
    enable_bosses: false,
    map_tile_width: 440,
    map_tile_height: 440,
    do_not_override_room: false,
    room_setup: ["room_assault_trenches"],
    maze: true,
    maze_type: 16,
    BOT_MOVE: [{
        TEAM: TEAM_GREEN,
        RANGE: 70,
        MOVEMENT: [
            [76.72, 54.80],
            [69.62, 58.57],
            [67.33, 62.54],
            [32.85, 62.04],
            [33.55, 40.62],
            [39.52, 38.86],
            [39.52, 25.52]
        ]
    }, {
        TEAM: TEAM_BLUE,
        RANGE: 20,
        MOVEMENT: [
            [12.09, -53.01],
            [0, -33.10],
            [-33.07, -30.56],
            [-40.41, -22.86],
            [-38.66, 3.48],
            [-22.50, 3.48]
        ]
    }],
    team_weights: {
        [TEAM_BLUE]: 1.1
    }
}