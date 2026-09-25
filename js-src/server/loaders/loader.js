// Now lets load the files
const requires = [
    "./global.js", // Now lets get the global virables before loading the next files.
    // Debug / other
    "../miscFiles/collisionFunctions.js", // The actual collision functions that make the game work.
    "../miscFiles/color.js", // Color manager that manages the entities's color.
    "../game/debug/lagLogger.js", // Lag Logger.
    "../game/debug/logs.js", // Logs.
    "../game/entities/subFunctions.js", // This helps keeping the entities work.
    // Controllers
    "../miscFiles/controllers.js", // The AI of the game.
    // Entities
    "../game/entities/vector.js", // Define a vector. Required By Entity.js.
    "../game/entities/skills.js", // Define skills. Required By Entity.js.
    "../game/entities/gun.js", // Define gun to make guns to work. Required By Entity.js.
    "../game/entities/healthType.js", // Define health to make healths work when a entity got hit, or regenerated. Required By Entity.js.
    "../game/entities/antiNaN.js", // This file prevents NaN to entities.
    "../game/entities/turretEntity.js", // The Entity constructer for turrets. Required By Entity.js.
    "../game/entities/propEntity.js", // This file create prop entities, Its actually a turret entity but its decorative only. Required By Entity.js.
    "../game/entities/bulletEntity.js", // The Entity constructor but with heavy limitations.
    "../game/entities/entity.js", // The actual Entity constructor.
    // Definitions
    "../lib/definitions/combined.js", // Get the definitions loader.
    // Room setup
    "../miscFiles/tileEntity.js", // What this does, It creates tiles for the room setup.
    // Mockups
    "../miscFiles/mockups.js", // This file loads the mockups.
];

for (let file of requires) {
    const module = require(file);
    for (let key in module) if (module.hasOwnProperty(key)) global[key] = module[key];
}

// Define room loader
let fs = require('fs'),
	path = require('path'),
	groups = fs.readdirSync(path.resolve(__dirname, '../game/roomSetup/tiles/')),
    loadRooms = (log = false) => {
        // Now we need to define every tile.
        if (Config.startup_logs && log) console.log(`Importing tile definitions...`);
        for (let filename of groups) {
            if (Config.startup_logs && log) console.log(`Loading tile file: ${filename}`);
            require('../game/roomSetup/tiles/' + filename);
        }

        if (log) console.log("Successfully imported tile definitions.\n");
    };

module.exports = {
    loadRooms,
    creationDate: new Date(),
    creationTime: new Date().getTime()
};
