const { combineStats, makeHat, makeMenu } = require('../facilitators.js');
const { base } = require('../constants.js');
const g = require('../gunvals.js');
let dreadnoughts = 'dreadnought_dreadsV2';
if (Config.classic_food) {
    dreadnoughts = 'dreadnought_dreadsV1';
};

// Set the below variable to true to enable the Retrograde menu in Retrograde gamemodes.
// This will replace the Daily Tank if one is set!
const enable_retrograde_menu = false;

// Menus
Class.menu_special = makeMenu("Special Menu", {
    upgrades: [
        Config.spawn_class,
        'menu_gameAdmin',
        'eggGen',
        'menu_specialTanks',
        'menu_bosses',
        'menu_nostalgia',
        'menu_scrapped',
        'menu_memes',
        dreadnoughts,
        'menu_shinyMember',
        'menu_addons'
    ]
});

// Moderation/Testing Menus
Class.menu_gameAdmin = makeMenu("Game Admin Menu", {
    upgrades: [
        Config.spawn_class,
        'menu_gameMod',
        'spectator',
        'guillotine',
        'banHammer',
        //'menu_nostalgia',
        //'menu_scrapped'
    ]
});
Class.menu_gameMod = makeMenu("Game Mod Menu", {
    upgrades: [
        Config.spawn_class,
        'menu_betaTester',
        'spectator',
        'guillotine',
        //'menu_nostalgia',
        //'menu_scrapped'
    ]
});
Class.menu_betaTester = makeMenu("Beta Tester Menu", {
    upgrades: [
        Config.spawn_class,
        //'spectator',
        'menu_tankChanges',
        //'menu_nostalgia',
        //'menu_scrapped'
    ]
});
Class.menu_tankChanges = makeMenu("Tank Changes Menu", {
    upgrades: [
        'menu_betaTester',
        Config.spawn_class,
        'bender',
        'repeater',
        'spiral',
    ]
});

// Special Tanks Menu
Class.menu_specialTanks = makeMenu("Special Tanks Menu", {
    upgrades: [
        'menu_healers',
        'menu_dominators',
        'menu_sanctuaries',
        'arenaCloser',
        'bacteria',
        'literallyAMachineGun',
        'literallyATank',
        //'manager_special',
        'mothership',
        'flagship',
        'turkey',
        'nemesis',
        'arrasPolice'
    ]
});
Class.menu_healers = makeMenu("Healer Menu", {
    upgrades: [
        'healer',
        'medic',
        'ambulance',
        'surgeon',
        'paramedic',
        'physician',
        'doctor',
        'smasher',
        'underseer'
    ],
    guns: [
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
    ],
    turrets: [
        {
            TYPE: 'healerHat',
            POSITION: {
                SIZE: 13,
                LAYER: 1
            }
        }
    ]
});
Class.menu_dominators = makeMenu("Dominator Menu", {
    upgrades: [
        'menu_specialTanks',
        'dominator',
        'destroyerDominator',
        'gunnerDominator',
        'trapperDominator',
        //'destroyerDominator_AR',
        //'gunnerDominator_AR',
        //'trapperDominator_AR',
        'antiTankMachineGun',
        'baseProtector',
        //'baseProtector_diep'
    ]
});
Class.menu_sanctuaries = makeMenu("Sanctuary Tier Menu", {
    upgrades: [
        'menu_specialTanks',
        'sanctuaryTier1',
        'sanctuaryTier2',
        'sanctuaryTier3',
        'sanctuaryTier4',
        'sanctuaryTier5',
        'sanctuaryTier6'
    ]
});

// Bosses Menu
Class.menu_bosses = makeMenu("Bosses Menu", {
    upgrades: [
        'elite',
        'nester',
        'rogue',
        'mystical',
        'terrestrial',
        'celestial',
        'diep',
        'dev'
    ].map(x => `menu_${x}Bosses`)
});
Class.menu_bosses.UPGRADES_TIER_0.push('bob')
Class.menu_eliteBosses = makeMenu("Elite Bosses Menu", {
    color: 'pink',
    upgrades: [
        'eliteDestroyer',
        'eliteGunner',
        'eliteSprayer',
        'eliteBattleship',
        'eliteSpawner',
        'eliteTrapGuard',
        'eliteSpinner',
        'eliteSkimmer',
        'legionaryCrasher',
        'destroyerLegion',
        'gunnerLegion',
        'sprayerLegion',
        'battleshipLegion',
        'spawnerLegion'
    ]
});
Class.menu_nesterBosses = makeMenu("Nester Bosses Menu", {
    color: 'purple',
    upgrades: [
        'nestKeeper',
        'nestWarden',
        'nestGuardian'
    ]
});
Class.menu_rogueBosses = makeMenu("Rogue Bosses Menu", {
    color: 'rogue',
    upgrades: [
        'roguePalisade',
        'rogueArmada'
    ]
});
Class.menu_mysticalBosses = makeMenu("Mystical Bosses Menu", {
    color: 'rainbow',
    upgrades: [
        'sorcerer',
        'summoner',
        'enchantress',
        'exorcistor',
        'shaman',
        'witch'
    ]
});
Class.menu_terrestrialBosses = makeMenu("Terrestrial Bosses Menu", {
    color: 'veryLightGrey',
    upgrades: [
        'ares',
        'gersemi',
        'ezekiel',
        'eris',
        'selene'
    ]
});
Class.menu_celestialBosses = makeMenu("Celestial Bosses Menu", {
    color: 'pureBlack',
    upgrades: [
        'paladin',
        'freyja',
        'zaphkiel',
        'nyx',
        'theia',
        'atlas',
        'rhea',
        'hyperion',
        'aether',
        'styx',
        'eros',
        'tethys',
        'iapetus',
        'apollo',
        'hera',
        'sif',
        'freyr',
        'tyr',
        'hjordis',
        'vor',
        'alcis',
        'baldr',
        'dellingr',
        'ullr',
        'isis',
        'nephthys',
        'osiris',
        'horus',
        'anubis',
        'khonsu',
        'ptah',
        'odin',
        'kronos',
        'amun',
        'julius',
        'genghis',
        'napoleon'
    ]
});
Class.menu_diepBosses = makeMenu("Diep Bosses Menu", {
    color: 'flashBlueRed',
    upgrades: [
        //'defender',
        //'guardian',
        //'fallenBooster',
        //'fallenOverlord'
    ].map(x => x + '_diep')
});
Class.menu_devBosses = makeMenu("Dev Bosses Menu", {
    color: 'lime',
    shape: 4,
    upgrades: [
        'AEMKShipBoss',
        'dogeiscutBoss',
        'tgsBoss',
        'toothlessBoss',
        'zyrafaqBoss',
        'menu_retiredDevBosses'
    ]
});
Class.menu_retiredDevBosses = makeMenu("Retired Dev Bosses Menu", {
    boxLabel: "Retired",
    boxColor: "pureBlack",
    color: "pureBlack",
    shape: 4,
    upgrades: [
        'frostBoss',
        'helenaBoss',
        'taureonBoss',
        'trplnrBoss',
    ]
});

// Nostalgia/Scrapped Menus
Class.menu_nostalgia = makeMenu("Nostalgia Menu", {
    upgrades: [
        'bentBoomer_old',
        'blunderbuss',
        'commander_old',
        'jumpSmasher',
        'master',
        'quadBuilder',
        'rimfire_old',
        'septaTrapper_old',
        'spike_old',
        'spreadshot_old',
        'undertow',
        'whirlwind',
        'whirlwind_old'
    ]
});
Class.menu_scrapped = makeMenu("Scrapped Menu", {
    upgrades: [
        'autoTrapper',
        'cocci',
        'dreadnought_old',
        'flail',
        'mender',
        'oroboros',
        'prodigy',
        'rocket',
        'volute',
        'whirlwind_bent',
        'wrangler',
    ]
});

// Memes/Miscellaneous
Class.menu_memes = makeMenu("Memes", {
    upgrades: [
        'menu_diep',
        'menu_adminTanks',
        'menu_misc',
        'menu_digdig'
    ]
});
Class.menu_diep = makeMenu("Diep Tanks", {
    upgrades: [
        'menu_diep2'
    ]
});
Class.menu_diep2 = makeMenu("Diep2 Menu", {
    upgrades: [
        'blaster',
        'gatlingGun',
        'machineFlank',
        'rifle_old',
        'buttbuttin',
        'blower',
        'quadTwin',
        'tornado_AR',
        'subverter',
        'battery',
        'deathStar',
        'bonker',
        'protector',
        'bulwark_old'
    ]
});
Class.menu_adminTanks = makeMenu("Admin Tanks", {
    upgrades: [
        'developer',
        'cxATMG',
        'damoclone',
        'machineShot',
        'fat456',
        'wifeBeater'
    ]
});
Class.menu_misc = makeMenu("Misc", {
    upgrades: [
        //'theAmalgamation',
        //'theConglomerate',
        //'schoolShooter',
        //'average4tdmScore',
        //'averageL39Hunt',
        'tracker3',
        'meOnMyWayToDoYourMom',
        'meDoingYourMom',
        'rapture',
        'bigBalls',
        'tetraGunner',
        'worstTank',
        //'genericEntity',
        //'quadCyclone',
        'beeman',
        'heptaAutoBasic',
        'alas',
        'riptide',
        'smasher3'
    ]
});
Class.menu_digdig = makeMenu("DigDig", {
    upgrades: [
        'digDigSmile',
        'digDigSmile_kirk',
        'digDigFrown',
        'digDigFrown_kirk'
    ]
});

// Shiny Member Menu
Class.menu_shinyMember = makeMenu("Shiny Member Menu", {
    upgrades: [
        'eggGen',
        'menu_specialTanks',
        'menu_bosses',
        'menu_nostalgia',
        'menu_scrapped',
        'menu_diep',
        dreadnoughts,
        'tracker3',
        'meOnMyWayToDoYourMom',
        'meDoingYourMom',
        'rapture',
        'bigBalls',
        'tetraGunner',
        'worstTank',
        'machineShot'
    ]
});
Class.menu_youtuber = {
    PARENT: 'menu_shinyMember',
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
    ]
};

// Retrograde Menus
Class.menu_retrograde = makeMenu("Retrograde", {
    upgrades: [
        'menu_diep',
        'menu_digdig',
        'menu_celestialBosses',
        'menu_eliteBosses',
        'menu_mysticalBosses',
        'menu_nostalgia',
        'menu_scrapped',
        'menu_miscRetrograde'
    ]
});
Class.menu_miscRetrograde = makeMenu("Misc Retrograde", {
    upgrades: [
        'tracker3',
        'tetraGunner',
        'worstTank'
    ]
});
if (Config.retrograde && enable_retrograde_menu) {
    Config.daily_tank =  {
        tank: 'menu_retrograde',
        tier: 3,
        ads: false
    };
};

// Dynamic Addon Menu
Class.menu_addons = makeMenu("Addons Menu", {
    tooltip: "Content that is (usually) not part of Open Source Arras but was added by someone else.",
    boxColor: 'rainbow',
    upgrades: [
        'menu_testing'
    ]
});
