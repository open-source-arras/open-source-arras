module.exports = {
    mode: "tdm",
    teams: Config.teams ?? Math.floor(Math.random() * 2 + 1) * 2,
    do_not_override_room: true,
    room_setup: ["room_tdm"]
}