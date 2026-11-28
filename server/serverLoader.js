import { workerData, parentPort } from "worker_threads";

// Load required game components
import GLOBAL from "./loaders/loader.js";

// Create the game server
import("./game.js").then(({gameServer}) => new gameServer(
    workerData.host,
    workerData.port,
    workerData.gamemode,
    workerData.region,
    workerData.location,
    workerData.webProperties,
    workerData.properties,
    workerData.isFeatured,
    workerData.isHidden,
    workerData.isPrivate,
    parentPort,
    GLOBAL
));
