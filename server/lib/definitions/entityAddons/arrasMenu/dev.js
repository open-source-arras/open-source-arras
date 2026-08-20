const {combineStats, makeHat, makeMenu} = require('../../facilitators.js')
const {base} = require('../../constants.js')
const g = require('../../gunvals.js')

Class.menu_addons.UPGRADES_TIER_0.push('arrasMenu')
Class.arrasMenu = makeMenu("Arras Menus", {upgrades: ['special', 'youtuber', 'retrograde'].map(x => 'arrasMenu_' + x)})

// Set the below variable to true to enable the Retrograde menu in Retrograde gamemodes.
// This will replace the Daily Tank if one is set!
const enable_retrograde_menu = false

// Presets
const healerMenuGuns = [
    {
        POSITION: {
            LENGTH: 18,
            WIDTH: 10,
            ASPECT: -1.4
        },
        PROPERTIES: {
            SHOOT_SETTINGS: combineStats([g.basic]),
            TYPE: ['bullet', {
                TURRETS: [
                    {
                        POSITION: {
                            SIZE: 13,
                            ARC: 360,
                            LAYER: 1
                        },
                        TYPE: 'healerHat'
                    }
                ]
            }],
            NO_LIMITATIONS: true
        }
    }
]
const healerMenuTurrets = [
    {
        TYPE: 'healerHat',
        POSITION: {
            SIZE: 13,
            LAYER: 1
        }
    }
]

let dreadnoughts = 'dreadnought_dreadsV2'
if (Config.classic_food) {
    dreadnoughts = 'dreadnought_dreadsV1'
}

// Menus
Class.arrasMenu_special = makeMenu("Special Menu", {upgrades: [Config.spawn_class, 'arrasMenu_gameAdmin', 'eggGen', 'arrasMenu_specialTanks', 'arrasMenu_bosses', 'arrasMenu_nostalgia', 'arrasMenu_scrapped', 'arrasMenu_memes', dreadnoughts, 'arrasMenu_shinyMember']})
    Class.arrasMenu_gameAdmin = makeMenu("Game Admin Menu", {upgrades: [Config.spawn_class, 'arrasMenu_gameMod', 'spectator', 'guillotine', "banHammer"/*, 'arrasMenu_nostalgia', 'arrasMenu_scrapped'*/]})
        Class.arrasMenu_gameMod = makeMenu("Game Mod Menu", {upgrades: [Config.spawn_class, 'arrasMenu_betaTester', 'spectator', 'guillotine'/*, 'arrasMenu_nostalgia', 'arrasMenu_scrapped'*/]})
            Class.arrasMenu_betaTester = makeMenu("Beta Tester Menu", {upgrades: [Config.spawn_class/*, 'spectator'*/, 'arrasMenu_tankChanges'/*, 'arrasMenu_nostalgia', 'arrasMenu_scrapped'*/]})
                Class.arrasMenu_tankChanges = makeMenu("Tank Changes Menu", {upgrades: ['arrasMenu_betaTester', Config.spawn_class]})
    Class.arrasMenu_specialTanks = makeMenu("Special Tanks Menu", {upgrades: ["arrasMenu_special", "arrasMenu_healers", "arrasMenu_dominators", "arrasMenu_sanctuaries", "arenaCloser", "bacteria", "literallyAMachineGun", "mothership", "flagship", "turkey"/*, "developer"*/, "arrasPolice"]})
        Class.arrasMenu_healers = makeMenu("Healer Menu", {upgrades: ["healer", "medic", "ambulance", "surgeon", "paramedic", "physician", "doctor", "smasher", "underseer"], guns: healerMenuGuns, turrets: healerMenuTurrets})
        Class.arrasMenu_dominators = makeMenu("Dominator Menu", {upgrades: ["arrasMenu_specialTanks", "dominator", "destroyerDominator", "gunnerDominator", "trapperDominator", /*"destroyerDominator_AR", "gunnerDominator_AR", "trapperDominator_AR",*/ "antiTankMachineGun", "baseProtector"]})
        Class.arrasMenu_sanctuaries = makeMenu("Sanctuary Tier Menu", {upgrades: ["arrasMenu_specialTanks", "sanctuaryTier1", "sanctuaryTier2", "sanctuaryTier3", "sanctuaryTier4", "sanctuaryTier5", "sanctuaryTier6"]})
    Class.arrasMenu_bosses = makeMenu("Bosses Menu", {upgrades: ['elite', 'nester', 'rogue', 'mystical', 'terrestrial', 'celestial', 'diep'].map(x => 'arrasMenu_' + x + 'Bosses')})
        Class.arrasMenu_eliteBosses = makeMenu("Elite Bosses Menu", {color: 'pink', upgrades: ['eliteDestroyer', 'eliteGunner', 'eliteSprayer', 'eliteBattleship', 'eliteSpawner', 'eliteTrapGuard', 'eliteSpinner', 'eliteSkimmer', 'legionaryCrasher']})
        Class.arrasMenu_nesterBosses = makeMenu("Nester Bosses Menu", {color: 'purple', upgrades: ['nestKeeper', 'nestWarden', 'nestGuardian']})
        Class.arrasMenu_rogueBosses = makeMenu("Rogue Bosses Menu", {color: 'rogue', upgrades: ['roguePalisade', 'rogueArmada']})
        Class.arrasMenu_mysticalBosses = makeMenu("Mystical Bosses Menu", {color: 'rainbow', upgrades: ['sorcerer', 'summoner', 'enchantress', 'exorcistor']})
        Class.arrasMenu_terrestrialBosses = makeMenu("Terrestrial Bosses Menu", {color: 'veryLightGrey', upgrades: ['ares', 'gersemi', 'ezekiel', 'eris', 'selene']})
        Class.arrasMenu_celestialBosses = makeMenu("Celestial Bosses Menu", {color: 'pureBlack', upgrades: ['paladin', 'freyja', 'zaphkiel', 'nyx', 'theia', 'atlas', 'rhea', 'hyperion', 'aether', 'styx', 'eros', 'tethys', 'iapetus', 'apollo', 'hera', 'sif', 'freyr', 'tyr', 'hjordis', 'vor', 'alcis', 'baldr', 'dellingr', 'ullr', 'isis', 'nephthys', 'osiris', 'horus', 'anubis', 'khonsu', 'ptah', 'odin', 'kronos', 'amun', 'julius', 'genghis', 'napoleon']})
        Class.arrasMenu_diepBosses = makeMenu("Diep Bosses Menu", {color: 'flashBlueRed', upgrades: ['defender_diep', 'guardian_diep'/*, 'fallenBooster_diep', 'fallenOverlord_diep'*/]})
    Class.arrasMenu_nostalgia = makeMenu("Nostalgia Menu", {upgrades: ["spreadshot_old", "boomer_old", "quadBuilder", "quintuplet", "vulcan", "sniper3", "spike_old", "master", "commander_old", "blunderbuss", "rimfire_old", "ransacker"]})
    Class.arrasMenu_scrapped = makeMenu("Scrapped Menu", {upgrades: ["arrasMenu_scrapped2", "rocketeer", "crowbar", "peashooter", "autoTrapper", "megaTrapper", "railgun", "megaSpawner", "dreadnought_old"]})
        Class.arrasMenu_scrapped2 = makeMenu("Scrapped Menu 2", {upgrades: ["arrasMenu_gameMod", "arrasMenu_scrapped", "mender", "infestor", "prodigy", "spawnerdrive", "rimfire", "productionist", "vulture"]})
    Class.arrasMenu_memes = makeMenu("Memes", {upgrades: ["arrasMenu_diep", "arrasMenu_adminTanks", "arrasMenu_misc", "arrasMenu_digdig"]})
        Class.arrasMenu_diep = makeMenu("Diep Tanks", {upgrades: ["arrasMenu_diep2"]})
            Class.arrasMenu_diep2 = makeMenu("Diep2 Menu", {upgrades: ["blaster", "gatlingGun", "doubleMachine", "rifle_old", "buttbuttin", "blower", "quadTwin"/*, "tornado_AR"*/, "subverter", "battery", "deathStar", "bonker", "protector", "bulwark_old"]})
        Class.arrasMenu_adminTanks = makeMenu("Admin Tanks", {upgrades: ["developer", "cxATMG", "damoclone", "machineShot", "fat456", "wifeBeater"]})
        Class.arrasMenu_misc = makeMenu("Misc", {upgrades: [/*"theAmalgamation", "theConglomerate", "schoolShooter", "average4tdmScore", "averageL39Hunt", */"tracker3", "meOnMyWayToDoYourMom", "meDoingYourMom", "rapture", "bigBalls", "tetraGunner", "worstTank"/*, "genericEntity", "quadCyclone", "beeman"*/, "heptaAutoBasic", "alas"]})
        Class.arrasMenu_digdig = makeMenu("DigDig", {upgrades: ["digDigSmile", "digDigSmile_kirk", "digDigFrown", "digDigFrown_kirk"]})
    Class.arrasMenu_shinyMember = makeMenu("Shiny Member Menu", {upgrades: ["eggGen", "arrasMenu_specialTanks", "arrasMenu_bosses", "arrasMenu_nostalgia", "arrasMenu_scrapped", "arrasMenu_diep", dreadnoughts, "tracker3", "meOnMyWayToDoYourMom", "meDoingYourMom", "rapture", "bigBalls", "tetraGunner", "worstTank", "machineShot"]})

// Retrograde
Class.arrasMenu_retrograde = makeMenu("Retrograde", {upgrades: ["arrasMenu_diep", "arrasMenu_digdig", "arrasMenu_celestialBosses", "arrasMenu_eliteBosses", "arrasMenu_mysticalBosses", "arrasMenu_nostalgia", "arrasMenu_scrapped", "arrasMenu_miscRetrograde"]})
Class.arrasMenu_miscRetrograde = makeMenu("Misc Retrograde", {upgrades: ["tracker3", "tetraGunner", "worstTank"]})
if (Config.retrograde && enable_retrograde_menu) {
    Config.daily_tank =  {
        tank: 'arrasMenu_retrograde',
        tier: 3,
        ads: false
    }
}

// YouTuber
Class.arrasMenu_youtuber = {
    PARENT: 'genericTank',
    LABEL: "YouTuber",
    COLOR: '#FF0000',
    BODY: {
        SPEED: 20,
        HEALTH: 1e6,
        DAMAGE: 10,
        SHIELD: 1e4,
        REGEN: 10,
        FOV: base.FOV * 3,
    },
    PROPS: [
        {
            TYPE: ['triangleHat', {COLOR: 'pureWhite'}],
            POSITION: {
                SIZE: 6,
                LAYER: 1,
                ANGLE: 0,
            },
            FORCE_ANGLE: true
        }
    ],
    GUNS: [
        {
            POSITION: {
                LENGTH: 18,
                WIDTH: 8,
                ASPECT: 1
            },
            PROPERTIES: {
                SHOOT_SETTINGS: combineStats([g.basic]),
                TYPE: ['bullet', {COLOR: '#ffffff'}],
            }
        }
    ],
    UPGRADES_TIER_0: Class.arrasMenu_shinyMember.UPGRADES_TIER_0
}
