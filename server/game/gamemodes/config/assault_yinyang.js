module.exports = {
    mode: "tdm",
    teams: 2,
    assault: true,
    enable_bosses: false,
    map_tile_width: 440,
    map_tile_height: 440,
    do_not_override_room: false,
    room_setup: ["room_assault_yinyang"],
    maze: true,
    maze_type: 20,
    team_weights: {
        [TEAM_BLUE]: 1.1
    }
}