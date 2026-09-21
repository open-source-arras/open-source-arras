// PERMISSION LEVELS
// - 0 // Player
// - 1 // Arena Conductor
// - 2 // Arena Supervisor
// - 3 // Arena Operator
// - 4 // Beta Tester
// - 5 // Game Mod
// - 6 // Game Admin
// - 7 // Developer

module.exports = [
    {
        key: process.env.SHINY,
        class: "menu_shinyMember"
    },
    {
        key: process.env.YOUTUBER,
        class: "menu_youtuber"
    },
    {
        key: process.env.BETA_TESTER,
        permissionLevel: 4,
        class: "menu_betaTester"
    },
    {
        key: process.env.GAME_MOD,
        permissionLevel: 5,
        class: "menu_gameMod"
    },
    {
        key: process.env.GAME_MOD_ALT,
        class: "banHammer",
        spawnAs: "basic"
    },
    {
        key: process.env.GAME_ADMIN,
        permissionLevel: 6,
        class: "menu_gameAdmin"
    },
    {
        key: process.env.DEVELOPER,
        permissionLevel: 7,
        class: "menu_special",
        nameColor: "#FFFFFF",
        allowEditor: true
    }
]
