module.exports = {
    mode: "tdm",
    teams: 2,
    assault: true,
    enable_bosses: false,
    map_tile_width: 440,
    map_tile_height: 440,
    do_not_override_room: false,
    room_setup: ["room_assault_eye"],
    maze: true,
    maze_type: 18,
    BOT_MOVE: [{
        TEAM: TEAM_GREEN,
        RANGE: 70,
        MOVEMENT: [
            [4.62, 56.14],
            [7.46, 62.44],
            [18.33, 59.60],
            [18.03, 34.27]
        ]
    }, {
        TEAM: TEAM_BLUE,
        RANGE: 20,
        MOVEMENT: [
            [-17.81, -68.63],
            [-18.11, -11.70]
        ]
    }],
    team_weights: {
        [TEAM_BLUE]: 1.1
    }
}