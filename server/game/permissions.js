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
        permissionLevel: 3,
        class: "menu_shinyMember",
        nameColor: "#FFFFFF"
    },
    {
        key: process.env.YOUTUBER,
        permissionLevel: 3,
        class: "menu_youtuber",
        nameColor: "#FFFFFF"
    },
    {
        key: process.env.BETA_TESTER,
        permissionLevel: 4,
        class: "menu_betaTester",
        nameColor: "#FFFFFF"
    },
    {
        key: process.env.GAME_MOD,
        permissionLevel: 5,
        class: "menu_gameMod",
        nameColor: "#FFFFFF"
    },
    {
        key: process.env.GAME_ADMIN,
        permissionLevel: 6,
        class: "menu_gameAdmin",
        nameColor: "#FFFFFF"
    },
    {
        key: process.env.DEVELOPER,
        permissionLevel: 7,
        class: "menu_special",
        nameColor: "#FFFFFF",
        editorAccess: true
    }
]
