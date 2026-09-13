module.exports = {
    mode: "tdm",
    teams: 2,
    assault: true,
    enable_bosses: false,
    map_tile_width: 400,
    map_tile_height: 400,
    do_not_override_room: false,
    room_setup: ["room_assault_bunker"],
    maze: true,
    maze_type: 10,
    team_weights: {
        [TEAM_BLUE]: 1.1
    }
}