const { workerData, parentPort } = require("worker_threads");

// Load required game components
let GLOBAL = require("./loaders/loader.js");
// Create the game server
new (require("./game.js").gameServer)(
    workerData.host,
    workerData.port,
    workerData.gamemode,
    workerData.region,
    workerData.serverHost,
    workerData.location,
    workerData.webProperties,
    workerData.properties,
    workerData.isFeatured,
    workerData.isUnlisted,
    workerData.isPrivate,
    parentPort,
    GLOBAL
);
