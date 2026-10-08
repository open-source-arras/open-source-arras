// PERMISSION LEVELS
// - 0 // Player
// - 1 // Arena Conductor
// - 2 // Arena Supervisor
// - 3 // Arena Operator
// - 4 // Shiny Member / YouTuber
// - 5 // Beta Tester
// - 6 // Game Mod (old)
// - 7 // Game Admin (old)
// - 8 // Developer

module.exports = [
    /* TOKEN PERMISSIONS INFORMATION

        keys            - The ID for the token that goes in `.env`. (Format: "process.env.[TOKEN_NAME]")
        permissionLevel - Used to determine what commands you have access to.

        class           - The class that `+2 sets you to.
        nameColor       - The color of your ingame name.
        spawnAs         - The class you spawn as.

    */
    {
        key: process.env.SHINY,
        permissionLevel: 4,
        class: "menu_shinyMember"
    },
    {
        key: process.env.YOUTUBER,
        permissionLevel: 4,
        class: "menu_youtuber"
    },
    {
        key: process.env.BETA_TESTER,
        permissionLevel: 5,
        class: "menu_betaTester"
    },
    {
        key: process.env.GAME_MOD,
        class: "banHammer"
    },
    {
        key: process.env.DEVELOPER,
        permissionLevel: 8,
        class: "menu_special",
        nameColor: "#FFFFFF",
        allowEditor: true
    }
]
