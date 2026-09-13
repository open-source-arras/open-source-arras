const {combineStats} = require("../facilitators.js")

// Generators
const shapeGeneratorUpgrades = [
    ["egg", "gem", "gravel", "stone", "rock", "wall"].map(x => x + "Gen"),
    ["square", "shinySquare", "legSquare", "shadowSquare", "rainbowSquare", "transSquare"].map(x => x + "Gen"),
    ["triangle", "shinyTriangle", "legTriangle", "shadowTriangle", "rainbowTriangle", "transTriangle"].map(x => x + "Gen"),
    ["pentagon", "shinyPentagon", "legPentagon", "shadowPentagon", "rainbowPentagon", "transPentagon"].map(x => x + "Gen"),
    ["beta", "shinyBeta", "legBeta", "shadowBeta", "rainbowBeta", "transBeta"].map(x => x + "PentagonGen"),
    ["alpha", "shinyAlpha", "legAlpha", "shadowAlpha", "rainbowAlpha", "transAlpha"].map(x => x + "PentagonGen")
]
const hostileShapeGeneratorUpgrades = [
    ["crasher", "sentrySwarm", "sentryGun", "sentryTrap"].map(x => x + "Gen"),
    ["Crasher", "SentrySwarm", "SentryGun", "SentryTrap"].map(x => "shiny" + x + "Gen"),
    ["legCrasher", "sentinelLauncher", "sentinelCrossbow", "sentinelMinigun"].map(x => x + "Gen")
]
const eliteBossGeneratorUpgrades = [
    ["Destroyer", "Gunner", "Sprayer", "Battleship", "Spawner"].map(x => "elite" + x + "Gen"),
    ["eliteSkimmer", "eliteSpinner", "oldEliteSprayer", "legionaryCrasher", "eliteTrapGuard"].map(x => x + "Gen")
]
const mysticalBossGeneratorUpgrades = [
    ["sorcerer", "summoner", "enchantress", "exorcistor", "shaman"].map(x => x + "Gen")
]
const nesterBossGeneratorUpgrades = [
    ["Keeper", "Warden", "Guardian"].map(x => "nest" + x + "Gen")
]
const rogueBossGeneratorUpgrades = [
    ["Palisade", "Armada"].map(x => "rogue" + x + "Gen")
]

Class.genBody = {
    PARENT: "spectator",
    BODY: {
        SPEED: 25,
        FOV: 1
    },
    SKILL_CAP: [15, 0, 0, 0, 0, 0, 0, 0, 0, 15],
    LAYER: 1e99,
    ON: [],
    RESET_EVENTS: true
};

const makeGenerator = (entity, entityLabel, shortEntityLabel, displayEntity, displayEntitySize, shape, color, entitySize, maxChildren = 100, launchSpeed = 1) => {
    const config = {
        PARENT: "genBody",
        LABEL: `${entityLabel} Generator`,
        UPGRADE_LABEL: `${shortEntityLabel} Gen.`,
        SHAPE: shape,
        COLOR: color,
        MAX_CHILDREN: maxChildren,
        UPGRADES_TIER_0: [],

        TURRETS: [{
            TYPE: [displayEntity, {INDEPENDENT: true}],
            POSITION: {
                SIZE: displayEntitySize,
                LAYER: 1
            }
        }],

        GUNS: [
            {
                POSITION: {
                    LENGTH: 2,
                    WIDTH: 10.5,
                    X: 15
                },
                PROPERTIES: {
                    SHOOT_SETTINGS: combineStats([{
                        shudder: 0.1,
                        speed: launchSpeed,
                        recoil: 0.1,
                        reload: 6,
                        size: entitySize / 13
                    }]),
                    NO_LIMITATIONS: true,
                    SPAWN_OFFSET: 0,
                    TYPE: [entity, { INDEPENDENT: true }]
                }
            },
            {
                POSITION: {
                    LENGTH: 11,
                    WIDTH: 10.5,
                    ASPECT: 1.4,
                    X: 4
                }
            }
        ]
    };

    return config;
};

Class.genCrasher = {
    TYPE: [],
    PARENT: "crasher"
}
Class.genShinyCrasher = {
    PARENT: "genCrasher",
    COLOR: "lime",
    VALUE: 1e3
}
Class.genLegCrasher = {
    PARENT: "genCrasher",
    COLOR: "teal",
    VALUE: 5e3
}
Class.genSentrySwarm = {
    TYPE: [],
    PARENT: ["sentrySwarm"],
    CONTROLLERS: ["nearestDifferentMaster", "mapTargetToGoal", "hangOutNearMaster"]
};
Class.genSentryGun = {
    TYPE: [],
    PARENT: ["sentryGun"],
    CONTROLLERS: ["nearestDifferentMaster", "mapTargetToGoal", "hangOutNearMaster"]
};
Class.genSentryTrap = {
    TYPE: [],
    PARENT: ["sentryTrap"],
    CONTROLLERS: ["nearestDifferentMaster", "mapTargetToGoal", "hangOutNearMaster"]
};
Class.genShinySentrySwarm = {
    TYPE: [],
    PARENT: ["shinySentrySwarm"],
    CONTROLLERS: ["nearestDifferentMaster", "mapTargetToGoal", "hangOutNearMaster"]
};
Class.genShinySentryGun = {
    TYPE: [],
    PARENT: ["shinySentryGun"],
    CONTROLLERS: ["nearestDifferentMaster", "mapTargetToGoal", "hangOutNearMaster"]
};
Class.genShinySentryTrap = {
    TYPE: [],
    PARENT: ["shinySentryTrap"],
    CONTROLLERS: ["nearestDifferentMaster", "mapTargetToGoal", "hangOutNearMaster"]
};
Class.genSentinelLauncher = {
    TYPE: [],
    PARENT: ["sentinelLauncher"],
    CONTROLLERS: ["nearestDifferentMaster", "mapTargetToGoal", "hangOutNearMaster"]
};
Class.genSentinelCrossbow = {
    TYPE: [],
    PARENT: ["sentinelCrossbow"],
    CONTROLLERS: ["nearestDifferentMaster", "mapTargetToGoal", "hangOutNearMaster"]
};
Class.genSentinelMinigun = {
    TYPE: [],
    PARENT: ["sentinelMinigun"],
    CONTROLLERS: ["nearestDifferentMaster", "mapTargetToGoal", "hangOutNearMaster"]
};

//EGG GENERATOR
Class.eggGen = makeGenerator("egg", "Egg", "Egg", "egg", 4.25, 0, "veryLightGrey", Class.egg.SIZE)

//SQUARE GENERATORS
Class.squareGen = makeGenerator("square", "Square", "Square", "square", 6, 4, "gold", Class.square.SIZE)
Class.shinySquareGen = makeGenerator("shinySquare", "Shiny Square", "ShinySqr.", "square", 6, 4, "lime", Class.square.SIZE)
Class.legSquareGen = makeGenerator("legendarySquare", "Legendary Square", "LegSqr.", "square", 6, 4, "teal", Class.square.SIZE)
Class.shadowSquareGen = makeGenerator("shadowSquare", "Shadow Square", "ShdSqr.", "square", 6, 4, "pureBlack", Class.square.SIZE)
Class.rainbowSquareGen = makeGenerator("rainbowSquare", "Rainbow Legendary Square", "RbwSqr.", "square", 6, 4, "rainbow", Class.square.SIZE)
Class.transSquareGen = makeGenerator("transSquare", "Trans Legendary Square", "TransSqr.", "square", 6, 4, 37, Class.square.SIZE)

//TRIANGLE GENERATORS
Class.triangleGen = makeGenerator("triangle", "Triangle", "Triangle", "triangle", 6, 3, "orange", Class.triangle.SIZE)
Class.shinyTriangleGen = makeGenerator("shinyTriangle", "Shiny Triangle", "ShinyTri.", "triangle", 6, 3, "lime", Class.triangle.SIZE)
Class.legTriangleGen = makeGenerator("legendaryTriangle", "Legendary Triangle", "LegTri.", "triangle", 6, 3, "teal", Class.triangle.SIZE)
Class.shadowTriangleGen = makeGenerator("shadowTriangle", "Shadow Triangle", "ShdTri.", "triangle", 6, 3, "pureBlack", Class.triangle.SIZE)
Class.rainbowTriangleGen = makeGenerator("rainbowTriangle", "Rainbow Legendary Triangle", "RbwTri.", "triangle", 6, 3, "rainbow", Class.triangle.SIZE)
Class.transTriangleGen = makeGenerator("transTriangle", "Trans Legendary Triangle", "TransTri.", "triangle", 6, 3, 37, Class.triangle.SIZE)

//PENTAGON GENERATORS
Class.pentagonGen = makeGenerator("pentagon", "Pentagon", "Pentagon", "pentagon", 8, 5, "purple", Class.pentagon.SIZE)
Class.shinyPentagonGen = makeGenerator("shinyPentagon", "Shiny Pentagon", "ShinyPnt.", "pentagon", 8, 5, "lime", Class.pentagon.SIZE)
Class.legPentagonGen = makeGenerator("legendaryPentagon", "Legendary Pentagon", "LegPnt.", "pentagon", 8, 5, "teal", Class.pentagon.SIZE)
Class.shadowPentagonGen = makeGenerator("shadowPentagon", "Shadow Pentagon", "ShdPnt.", "pentagon", 8, 5, "pureBlack", Class.pentagon.SIZE)
Class.rainbowPentagonGen = makeGenerator("rainbowPentagon", "Rainbow Legendary Pentagon", "RbwPnt.", "pentagon", 8, 5, "rainbow", Class.pentagon.SIZE)
Class.transPentagonGen = makeGenerator("transPentagon", "Trans Legendary Pentagon", "TransPnt.", "pentagon", 8, 5, 37, Class.pentagon.SIZE)
//beta
Class.betaPentagonGen = makeGenerator("betaPentagon", "Beta Pentagon", "BetaPnt.", "pentagon", 12, 5, "purple", Class.betaPentagon.SIZE + 15)
Class.shinyBetaPentagonGen = makeGenerator("shinyBetaPentagon", "Shiny Beta Pentagon", "ShinyBPnt.", "pentagon", 12, 5, "lime", Class.betaPentagon.SIZE + 15)
Class.legBetaPentagonGen = makeGenerator("legendaryBetaPentagon", "Legendary Beta Pentagon", "LegBPnt.", "pentagon", 12, 5, "teal", Class.betaPentagon.SIZE + 15)
Class.shadowBetaPentagonGen = makeGenerator("shadowBetaPentagon", "Shadow Beta Pentagon", "ShdBPnt.", "pentagon", 12, 5, "pureBlack", Class.betaPentagon.SIZE + 15)
Class.rainbowBetaPentagonGen = makeGenerator("rainbowBetaPentagon", "Rainbow Legendary Beta Pentagon", "RbwBPnt.", "pentagon", 12, 5, "rainbow", Class.betaPentagon.SIZE + 15)
Class.transBetaPentagonGen = makeGenerator("transBetaPentagon", "Trans Legendary Beta Pentagon", "TransBPnt.", "pentagon", 12, 5, 37, Class.betaPentagon.SIZE + 15)
//alpha
Class.alphaPentagonGen = makeGenerator("alphaPentagon", "Alpha Pentagon", "AlphaPnt.", "pentagon", 15, 5, "purple", Class.alphaPentagon.SIZE + 25)
Class.shinyAlphaPentagonGen = makeGenerator("shinyAlphaPentagon", "Shiny Alpha Pentagon", "ShinyAPnt.", "pentagon", 15, 5, "lime", Class.alphaPentagon.SIZE + 30)
Class.legAlphaPentagonGen = makeGenerator("legendaryAlphaPentagon", "Legendary Alpha Pentagon", "LegAPnt.", "pentagon", 15, 5, "teal", Class.alphaPentagon.SIZE + 40)
Class.shadowAlphaPentagonGen = makeGenerator("shadowAlphaPentagon", "Shadow Alpha Pentagon", "ShdAPnt.", "pentagon", 15, 5, "pureBlack", Class.alphaPentagon.SIZE + 50)
Class.rainbowAlphaPentagonGen = makeGenerator("rainbowAlphaPentagon", "Rainbow Legendary Alpha Pentagon", "RbwAPnt.", "pentagon", 15, 5, "rainbow", Class.alphaPentagon.SIZE + 70)
Class.transAlphaPentagonGen = makeGenerator("transAlphaPentagon", "Trans Legendary Alpha Pentagon", "TransAPnt.", "pentagon", 15, 5, 37, Class.alphaPentagon.SIZE + 90)

//MISC GENERATORS
Class.gemGen = makeGenerator("gem", "Gem", "Gem", "gem", 4.75, 6, "aqua", Class.gem.SIZE, 100, 0)
Class.jewelGen = makeGenerator("jewel", "Jewel", "Jewel", "jewel", 7, 6, "yellow", Class.jewel.SIZE, 100, 0)
Class.wallGen = makeGenerator("wall", "Wall", "Wall", "wall", 15, 4, "grey", Class.wall.SIZE, 100, 0)
Class.gravelGen = makeGenerator("gravel", "Gravel", "Gravel", "gravel", 7, -7, "grey", Class.gravel.SIZE, 100, 0)
Class.stoneGen = makeGenerator("stone", "Stone", "Stone", "stone", 10, -7, "grey", Class.stone.SIZE, 100, 0)
Class.rockGen = makeGenerator("rock", "Rock", "Rock", "rock", 15, -9, "grey", Class.rock.SIZE, 100, 0)
// TODO: add gay baby jail creator/generator/whatever its called


//HOSTILE POLYGONS GENERATORS
//crasher
Class.crasherGen = makeGenerator("crasher", "Crasher", "Crasher", "crasher", 4.75, 3, "pink", Class.crasher.SIZE)
Class.shinyCrasherGen = makeGenerator("genShinyCrasher", "Shiny Crasher", "ShinyCr.", "genShinyCrasher", 4.75, 3, "lime", Class.crasher.SIZE)
Class.legCrasherGen = makeGenerator("genLegCrasher", "Legendary Crasher", "LegCr.", "genLegCrasher", 4.75, 3, "teal", Class.crasher.SIZE)
//sentries
Class.sentrySwarmGen = makeGenerator("genSentrySwarm", "Sentry", "SwarmSen.", "sentrySwarm", 5.75, 3, "pink", Class.sentry.SIZE, 20)
Class.sentryGunGen = makeGenerator("genSentryGun", "Sentry", "GunSen.", "sentryGun", 5.75, 3, "pink", Class.sentry.SIZE, 20)
Class.sentryTrapGen = makeGenerator("genSentryTrap", "Sentry", "TrapSen.", "sentryTrap", 5.75, 3, "pink", Class.sentry.SIZE, 20)
//shiny sentries
Class.shinySentrySwarmGen = makeGenerator("genShinySentrySwarm", "Sentry", "ShinySSen.", "shinySentrySwarm", 5.75, 3, "lime", Class.sentry.SIZE, 20)
Class.shinySentryGunGen = makeGenerator("genShinySentryGun", "Sentry", "ShinyGSen.", "shinySentryGun", 5.75, 3, "lime", Class.sentry.SIZE, 20)
Class.shinySentryTrapGen = makeGenerator("genShinySentryTrap", "Sentry", "ShinyTSen.", "shinySentryTrap", 5.75, 3, "lime", Class.sentry.SIZE, 20)
//sentinels
Class.sentinelLauncherGen = makeGenerator("genSentinelLauncher", "Sentinel", "LnchSnt.", "sentinelLauncher", 11.75, 5, "purple", Class.sentinel.SIZE, 10)
Class.sentinelCrossbowGen = makeGenerator("genSentinelCrossbow", "Sentinel", "CrsSnt.", "sentinelCrossbow", 11.75, 5, "purple", Class.sentinel.SIZE, 10)
Class.sentinelMinigunGen = makeGenerator("genSentinelMinigun", "Sentinel", "MiniSnt.", "sentinelMinigun", 11.75, 5, "purple", Class.sentinel.SIZE, 10)

// BOSSES GENERATORS
//mysticals
Class.sorcererGen = makeGenerator("sorcerer", "Sorcerer", "Sorcerer", "sorcerer", 10, 0, "veryLightGrey", Class.sorcerer.SIZE, 5)
Class.summonerGen = makeGenerator("summoner", "Summoner", "Summoner", "summoner", 10, 4, "gold", Class.summoner.SIZE, 5)
Class.enchantressGen = makeGenerator("enchantress", "Enchantress", "Enchantress", "enchantress", 10, 3.5, "orange", Class.enchantress.SIZE, 5)
Class.exorcistorGen = makeGenerator("exorcistor", "Exorcistor", "Exorcistor", "exorcistor", 10, 5.5, "purple", Class.exorcistor.SIZE, 5)
Class.shamanGen = makeGenerator("shaman", "Shaman", "Shaman", "shaman", 10, 6.5, "hexagon", Class.shaman.SIZE, 5)
//elites
Class.eliteDestroyerGen = makeGenerator("eliteDestroyer", "Elite Crasher", "Elite Crasher", "eliteDestroyer", 10, 3, "pink", Class.elite.SIZE, 5)
Class.eliteGunnerGen = makeGenerator("eliteGunner", "Elite Crasher", "Elite Crasher", "eliteGunner", 10, 3, "pink", Class.elite.SIZE, 5)
Class.eliteSprayerGen = makeGenerator("eliteSprayer", "Elite Crasher", "Elite Crasher", "eliteSprayer", 10, 3, "pink", Class.elite.SIZE, 5)
Class.eliteBattleshipGen = makeGenerator("eliteBattleship", "Elite Crasher", "Elite Crasher", "eliteBattleship", 10, 3, "pink", Class.elite.SIZE, 5)
Class.eliteSpawnerGen = makeGenerator("eliteSpawner", "Elite Crasher", "Elite Crasher", "eliteSpawner", 10, 3, "pink", Class.elite.SIZE, 5)
Class.eliteTrapGuardGen = makeGenerator("eliteTrapGuard", "Elite Crasher", "Elite Crasher", "eliteTrapGuard", 10, 3, "pink", Class.elite.SIZE, 5)
Class.eliteSpinnerGen = makeGenerator("eliteSpinner", "Elite Crasher", "Elite Crasher", "eliteSpinner", 10, 3, "pink", Class.elite.SIZE, 5)
Class.oldEliteSprayerGen = makeGenerator("eliteSprayer_old", "Elite Crasher", "Elite Crasher", "eliteSprayer_old", 10, 3, "pink", Class.elite.SIZE, 5)
Class.eliteSkimmerGen = makeGenerator("eliteSkimmer", "Elite Skimmer", "Elite Skimmer", "eliteSkimmer", 10, 3, "orange", Class.elite.SIZE, 5)
Class.legionaryCrasherGen = makeGenerator("legionaryCrasher", "Legionary Crasher", "Legionary Crasher", "legionaryCrasher", 12, 3, "pink", Class.elite.SIZE, 1)
//nesters
Class.nestKeeperGen = makeGenerator("nestKeeper", "Nest Keeper", "Nest Keeper", "nestKeeper", 10, 5, "purple", Class.nestKeeper.SIZE, 5)
Class.nestWardenGen = makeGenerator("nestWarden", "Nest Warden", "Nest Warden", "nestWarden", 10, 5, "purple", Class.nestWarden.SIZE, 5)
Class.nestGuardianGen = makeGenerator("nestGuardian", "Nest Guardian", "Nest Guardian", "nestGuardian", 10, 5, "purple", Class.nestGuardian.SIZE, 5)
//rogues
Class.roguePalisadeGen = makeGenerator("roguePalisade", "Rogue Palisade", "Rogue Palisade", "roguePalisade", 10, 6, "darkGrey", Class.roguePalisade.SIZE, 5)
Class.rogueArmadaGen = makeGenerator("rogueArmada", "Rogue Armada", "Rogue Armada", "rogueArmada", 10, 7, "darkGrey", Class.rogueArmada.SIZE, 5)

// GENERATOR UPGRADES
/**
 * An identifier that represents a pointer to a `Definition` inside `Class`.
 * @typedef {string} DefinitionReference
 */

/**
 * Assuming a rectangular grid of `DefinitionReference`'s to Generators without upgrades,
 * this function, also assuming the edges are connected (akin to pacman), gives each Generator
 * a "menu" of upgrades, which allows the user to directly "navigate" to a generator's
 * 4 direct neighbors.
 * This function throws an `Error` if the given 2d array is not rectangular.
 * @param {DefinitionReference[][]} matrix 
 * @param {DefinitionReference} previous 
 * @param {DefinitionReference} next 
 */
function generatorMatrix(matrix, previous, next) {
    const height = matrix.length,
        width = matrix[0].length;

    for (let y = 0; y < height; y++) {
        if (matrix[y].length !== width) {
            throw new Error(`The given grid is not rectangular!\nThe row at Y coordinate ${y} has ${matrix[y].length} items instead of the first row which has ${width}!`);
        }

        for (let x = 0; x < width; x++) {
            let top = (y + height - 1) % height,
                bottom = (y + height + 1) % height,
                left = (x + width - 1) % width,
                right = (x + width + 1) % width,

                center = matrix[y][x];
            top = matrix[top][x];
            bottom = matrix[bottom][x];
            left = matrix[y][left];
            right = matrix[y][right];

            let gen = Class[matrix[y][x]];
            if (!gen) {
                throw new Error(`The given grid has an invalid Definition Reference at indexes [${y}][${x}] named "${matrix[y][x]}"`);
            }

            gen.UPGRADES_TIER_0.push(
                Config.spawn_class, top, previous,
                left, center, right,
                "spectator", bottom, next
            );
        }
    }
}

// SHAPE UPGRADES
generatorMatrix(shapeGeneratorUpgrades, "roguePalisadeGen", "crasherGen");

// HOSTILE UPGRADES
generatorMatrix(hostileShapeGeneratorUpgrades, "eggGen", "eliteDestroyerGen");

// ELITE UPGRADES
generatorMatrix(eliteBossGeneratorUpgrades, "sentinelLauncherGen", "sorcererGen");

// MYSTICAL UPGRADES
generatorMatrix(mysticalBossGeneratorUpgrades, "eliteDestroyerGen", "nestKeeperGen");

// NESTER UPGRADES
generatorMatrix(nesterBossGeneratorUpgrades, "sorcererGen", "roguePalisadeGen");

// ROGUE UPGRADES
generatorMatrix(rogueBossGeneratorUpgrades, "nestKeeperGen", "eggGen");
