// PERMISSION LEVELS
// - 0 // Player
// - 1 // Arena Conductor
// - 2 // Arena Supervisor
// - 3 // Arena Operator
// - 4 // Beta Tester
// - 5 // Shiny Member
// - 6 // YouTuber
// - 7 // Developer

module.exports = [
    {
        key: process.env.BETA_TESTER,
        operatorLevel: 4,
        class: "menu_betaTester",
        nameColor: "#FFFFFF",
    },
    {
        key: process.env.SHINY,
        operatorLevel: 5,
        class: "menu_shinyMember",
        nameColor: "#FFFFFF",
    },
    {
        key: process.env.YOUTUBER,
        operatorLevel: 6,
        class: "menu_youtuber",
        nameColor: "#FFFFFF",
    },
    {
        key: process.env.DEVELOPER,
        administrator: true,
        operatorLevel: 7,
        class: "menu_special",
        nameColor: "#FFFFFF",
    }
]
