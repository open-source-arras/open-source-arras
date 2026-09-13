// An addon is guaranteed to run only after all groups are loaded.
// This is helpful, if your group relies on all other definitions already being loaded.
// Addons that are dependant on other addons should be named something like
// "[PARENT ADDON NAME]-[EXTENSION NAME].js", to make sure that it would run after that addon ran.

const { base } = require("../../constants.js");
const { makeMenu } = require("../../facilitators.js");

// This addon is disabled by default.
// You can also disable addons by not making them end with ".js"
// If you want to enable it, simply make the line below just not run.
return;

let MAX_CHILDREN = 0,
    GUNS = [],
    TURRETS = [],

    alreadySeen = [],
    next = ["basic"],

    // We don't loop infinitely, because that's a bad idea if someone makes a circular upgrade path.
    // Also, RECURSION BAD. RECURSION BAD. RECURSION BAD. RECURSION BAD. RECURSION BAD. RECURSION BAD.
    limit = 1000;
while (next.length && limit--) {
    let current = next;
    next = [];
    for (let i = 0; i < current.length; i++) {

        // Handle string definition references
        let now = ensureIsClass(current[i]);

        // Handles tanks with multiple ways to upgrade to them, like Overgunner.
        if (alreadySeen.includes(now.LABEL)) continue;
        alreadySeen.push(now.LABEL);

        // Add guns, turrets and additional max child count to our current list of stuff for our abomination to have.
        if (now.MAX_CHILDREN) MAX_CHILDREN += now.MAX_CHILDREN;
        if (now.GUNS) GUNS.push(...now.GUNS);
        if (now.TURRETS) TURRETS.push(...now.TURRETS);

        // Add upgrades of current tank to next iteration
        for (let key of Object.keys(now)) if (key.startsWith("UPGRADES_TIER_")) next.push(...now[key]);
    }
}

// This adds the tank to the definitions and to the addons menu
Class.abomination = {
    PARENT: "genericTank",
    LABEL: "The Abomination",
    SKILL_CAP: Array(10).fill(15),
    SIZE: 15,
    BODY: {
        ACCELERATION: base.ACCEL * 0.2,
        SPEED: base.SPEED * 0.5,
        HEALTH: base.HEALTH * 5,
        DAMAGE: base.DAMAGE * 5,
        PENETRATION: base.PENETRATION * 5,
        SHIELD: base.SHIELD * 5,
        REGEN: base.REGEN * 5,
        FOV: base.FOV * 2,
        DENSITY: base.DENSITY * 5,
        PUSHABILITY: 0.1,
        HETERO: 3,
        RECOIL_MULTIPLIER: 0.1
    },
    EXTRA_SKILL: 28,
    MAX_CHILDREN, GUNS, TURRETS
};
Class.exampleAddon = makeMenu("Example Addon")
Class.exampleAddon.UPGRADES_TIER_0 = ["abomination"]
Class.menu_addons.UPGRADES_TIER_0.push("exampleAddon");
