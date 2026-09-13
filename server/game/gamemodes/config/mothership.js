module.exports = {
    mode: "tdm",
    teams: Config.teams ?? (Math.random() * 3 | 0) + 2,
    mothership: true
}