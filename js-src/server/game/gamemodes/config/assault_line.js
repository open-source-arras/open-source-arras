module.exports = {
    mode: "tdm",
    teams: 2,
    assault: true,
    enable_bosses: false,
    map_tile_width: 413,
    map_tile_height: 412,
    do_not_override_room: false,
    room_setup: ["room_assault_line"],
    maze: true,
    maze_type: 17,
    BOT_MOVE: [{
        TEAM: TEAM_GREEN,
        RANGE: 70,
        MOVEMENT: [
            [-9.53, 93.35],
            [3.59, 91.94],
            [3.35, 57.21]
        ]
    }, {
        TEAM: TEAM_BLUE,
        RANGE: 90,
        MOVEMENT: [
            [5.35, -84.12],
            [2.39, -20.39],
        ]
    }],
    team_weights: {
        [TEAM_BLUE]: 1.1
    },
}