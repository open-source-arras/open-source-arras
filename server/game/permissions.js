// PERMISSION LEVELS
// - level: 0 // Player
// - level: 1 // Arena Conductor // basic stuff
// - level: 2 // Arena Supervisor // level 1 + advanced stuff
// - level: 3 // Arena Operator // level 2 + everything else

// todo: be more specific here

module.exports = [
    {
        key: process.env.BETA_TESTER,
        level: 1,
        class: "menu_betaTester",
        nameColor: "#ffffff",
        note: "note here"
    },
    {
        key: process.env.SHINY,
        level: 2,
        class: "menu_shinyMember",
        nameColor: "#ffffff",
        note: "note here"
    },
    {
        key: process.env.YOUTUBER,
        level: 2,
        class: "menu_youtuber",
        nameColor: "#ffffff",
        note: "note here"
    },
    {
        key: process.env.SPECIAL,
        administrator: true,
        level: 3,
        class: "menu_special",
        nameColor: "#ffffff",
        note: "note here"
    },
    {
        key: process.env.DEVELOPER,
        administrator: true,
        level: 3,
        class: "developer",
        nameColor: "#ffffff",
        note: "note here"
    },
]
