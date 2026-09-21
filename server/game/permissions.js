// PERMISSION LEVELS
// - 0 // Player
// - 1 // Arena Conductor
// - 2 // Arena Supervisor
// - 3 // Arena Operator
// - 4 // Beta Tester
// - 5 // Game Mod (old)
// - 6 // Game Admin (old)
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
        class: "banHammer"
    },
    {
        key: process.env.DEVELOPER,
        permissionLevel: 7,
        class: "menu_special",
        nameColor: "#FFFFFF",
        allowEditor: true
    }
]
