module.exports = {
    mode: "tdm",
    teams: 2,
    assault: true,
    enable_bosses: false,
    map_tile_width: 440,
    map_tile_height: 440,
    do_not_override_room: false,
    room_setup: ["room_assault_booster"],
    maze: true,
    maze_type: 15,
    BOT_MOVE: [{
        TEAM: TEAM_BLUE,
        RANGE: 20,
        MOVEMENT: [
            [107.43, 0.46],
            [76.66, 0.46]
        ]
    }],
    team_weights: {
        [TEAM_BLUE]: 1.1
    }
}