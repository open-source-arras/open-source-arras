import { log, saveToLog, time, warn } from "./lib/util.js";
import { addonAuthorInfos, loadAllMockups, servers, travellingPlayers } from "./loaders/global.js";
import { DefinitionCombiner } from "./lib/definitions/combined.js";

// Log startup messages
console.log("Starting up...");
console.log("Importing modules...\n");

import { join } from "path";
import { readFileSync, readdirSync, existsSync, lstatSync, createReadStream } from "fs";
import { createServer } from "http";
import { version } from "../package.json";

import { Worker } from "worker_threads";

// Increase the stack trace limit for better debugging
Error.stackTraceLimit = Infinity;

// Load environment variables from .env using a custom dotenv loader
import dotenv from "./lib/dotenv.js";
const envContent = readFileSync(join(__dirname, "./.env")).toString();
const environment = dotenv(envContent);

// Set each environment variable in process.env
for (const key in environment) {
    process.env[key] = environment[key];
}

// Load all necessary modules and files via the loader
import { loadRooms, creationDate, creationTime } from "./loaders/loader.js";
import { GameServer } from "./game.js";
import { Config } from "./config.js";
import { WebSocketServer } from "ws";

// Load definitions and tile definitions
new DefinitionCombiner(
    {
        groups: join(__dirname, "./lib/definitions/groups"),
        addonsFolder: join(__dirname, "./lib/definitions/entityAddons")
    }
).loadDefinitions();
loadRooms(true);

// Optionally load all mockups if enabled in configuration
if (Config.load_all_mockups) {
    loadAllMockups();
}

// Log loader information including creation date and time
console.log("Successfully loaded all files.");
console.log(`Created on date ${creationDate} at timestamp ${creationTime}`);

// Define the public directory for static files
const publicRoot = join(__dirname, "../public/");
const mimeSet = {
    js: "application/javascript",
    json: "application/json",
    css: "text/css",
    html: "text/html",
    md: "text/markdown",
    png: "image/png",
    svg: "image/svg+xml"
};

const wsServer = WebSocketServer;

const formatUptime = (ms) => {
    const seconds = Math.floor(ms / 1000);
    const d = Math.floor(seconds / 86400);
    const h = Math.floor((seconds % 86400) / 3600);
    const m = Math.floor((seconds % 3600) / 60);
    const s = seconds % 60;
    return [d > 0 && `${d}d`, (h > 0 || d > 0) && `${h}h`, (m > 0 || h > 0 || d > 0) && `${m}m`, `${s}s`].filter(Boolean).join(" ");
};

// Log a warning if Access-Control-Allow-Origin is enabled
if (Config.allow_ACAO) {
    warn("Access-Control-Allow-Origin is enabled, which allows any server/client to access data from the web server.");
}

// Show a warning about default API key
if (process.env.API_KEY === "ChangeAPIKeyNow!") {
    warn("You are using the default API key, which lets anyone submit server-travel players to this server. Set a unique API_KEY in server/.env.");
}

// Create an HTTP server to handle both API and static file requests
const server = createServer((req, res) => {
    const query = {};
    let pathname = req.url.split("?")[0];
    // Decode percent-escapes (skin filenames contain spaces / non-ASCII).
    try {
        pathname = decodeURIComponent(pathname);
    } catch { /* keep raw path */ }
    if (req.url.includes("?")) {
        req.url.split("?")[1].split("&").map((i) => {
            const key = i.split("=")[0];
            const value = i.split("=")[1];
            query[key] = value;
        });
    }
    let readString = ""; // Response content for API endpoints
    let ok = true; // Flag to indicate whether we use default API response
    const serversIP = [];
    const clientHeaders = [
        "/ext/custom-shape",
        "/ext/editor"
    ];
    let selectedHeader = null;

    // Set CORS headers if enabled in the configuration or allow only the children servers.
    for (const server of servers) {
        if (server.ip !== Config.host && server.ip) {
            const http = server.ip.startsWith("localhost") ? `http://${server.ip}` : `https://${server.ip}`;
            serversIP.push(http);
        }
    };
    if (Config.allow_ACAO || serversIP.includes(req.headers.origin)) {
        res.setHeader("Access-Control-Allow-Origin", "*");
        res.setHeader("Access-Control-Allow-Headers", "Content-Type, Authorization");
        res.setHeader("Access-Control-Allow-Methods", "GET, POST, PUT, DELETE, OPTIONS");
    }
    for (let i = 0; i < clientHeaders.length; i++) {
        if (clientHeaders[i] == req.url) {
            selectedHeader = clientHeaders[i];
        }
    }
    // Handle specific API endpoints based on the request URL
    switch (pathname) {
        case "/getServers.json": {
            // Serve a list of active servers
            readString = JSON.stringify(servers.filter((s) => s).map((server) => ({
                ip: server.ip,
                players: server.players,
                maxPlayers: server.maxPlayers,
                id: server.id,
                featured: server.featured,
                hidden: server.hidden,
                private: server.private,
                region: server.region,
                location: server.location,
                gameMode: server.gameMode,
                uptime: formatUptime(time())
            })));
        } break;
        case "/getSkins.json": {
            readString = JSON.stringify(readdirSync(join(publicRoot, "img/skins"))
                .filter((file) => file.endsWith(".png"))
                .map((file) => file.slice(0, -4))
                .sort());
        } break;
        case "/getTotalPlayers": {
            let countPlayers = 0;
            servers.forEach((s) => {
                countPlayers += s.players;
            });
            readString = JSON.stringify(countPlayers);
        } break;
        case "/version": {
            readString = JSON.stringify({ver: `${version}${Config.dev_build ? "-dev" : ""}`});
        } break;

        case "/api/getAddonAuthors": {
            if (!query.token || query.token !== process.env.DEVELOPER) {
                res.writeHead(403);
                res.end("Forbidden");
                return;
            }
            readString = JSON.stringify(addonAuthorInfos);
        } break;

        case "/api/sendPlayer": {
            ok = false;
            if (query.api_key !== process.env.API_KEY) {
                res.writeHead(403);
                res.end("Access Denied");
                return;
            }
            let body = "";
            req.on("data", (c) => body += c);
            req.on("end", () => {
                try {
                    const json = JSON.parse(body);

                    if (json) {
                        const { id, name, definition, score, level, skillcap, skill, points, killCount } = json;
                        travellingPlayers.push({ id, name, definition, score, level, skillcap, skill, points, killCount });
                        res.writeHead(200);
                        res.end("OK");
                    } else {
                        res.writeHead(400);
                        res.end("Invalid JSON body");
                    }
                } catch {
                    res.writeHead(400);
                    res.end("Invalid JSON body");
                    return;
                }
            });
        } break;
        case "/portalPermission": {
            ok = false;
            const sserver = [];
            if (Config.allow_server_travel && global.launchedOnMainServer) {
                for (let i = 0; i < servers.length; i++) {
                    const server = servers[i];
                    if (server.gameManager) {
                        sserver.push(server);
                    }
                }
                res.writeHead(200);
                res.end(JSON.stringify(sserver.map((server) => ({
                    ip: server.ip,
                    id: server.id,
                    players: server.players,
                    gameMode: server.gameMode
                }))));
            } else {
                res.writeHead(404);
                res.end("Denied.");
            }
        } break;
        case "/isOnline": {
            readString = "true";
        } break;
        case selectedHeader: {
            // For all other routes, serve static files from the public directory
            ok = false;
            let fileToGet = join(publicRoot, req.url);

            // If the requested file doesn't exist or isn't a file, default to the INDEX_HTML file
            if (!existsSync(fileToGet) || !lstatSync(fileToGet).isFile()) {
                fileToGet = join(publicRoot, `${selectedHeader}/index.html`);
            }

            // Determine the file's MIME type based on its extension and serve the file stream
            const extension = fileToGet.split(".").pop();
            res.writeHead(200, { "Content-Type": mimeSet[extension] || "text/html" });
            createReadStream(fileToGet).pipe(res);
        } break;

        default: {
            // For all other routes, serve static files from the public directory
            ok = false;
            let fileToGet = join(publicRoot, pathname);
            let httpCode = 200;

            // If the requested file doesn't exist or isn't a file, default to the index file
            if (!fileToGet.startsWith(publicRoot) || !existsSync(fileToGet) || !lstatSync(fileToGet).isFile()) {
                httpCode = 404;
                fileToGet = join(publicRoot, Config.index);
            }

            // Determine the file's MIME type based on its extension and serve the file stream
            const extension = fileToGet.split(".").pop();
            res.writeHead(httpCode, { "Content-Type": mimeSet[extension] || "text/html" });
            createReadStream(fileToGet).pipe(res);
        } break;
    }

    // If an API endpoint was handled, send the JSON response
    if (ok) {
        res.writeHead(200);
        res.end(readString);
    }
});

// Loads a game server
function loadGameServer(host, gamemode, region, location, webProperties, properties, isFeatured, isHidden, isPrivate) {
    // Determine the new server index and initialize an empty object in the global servers array
    if (host !== Config.host) {
        const index = servers.length;
        servers.push({});

        // Create a new worker thread to load the game server asynchronously
        const worker = new Worker("./server/serverLoader.js", {
            workerData: {
                host,
                gamemode,
                region,
                location,
                webProperties,
                properties,
                isFeatured,
                isHidden,
                isPrivate,
                index
            }
        });

        // Listen for messages from the worker to update the server's status
        worker.on("message", (message) => {
            const flag = message.shift();
            switch (flag) {
                case false:
                    // Initial load: store server details
                    servers[index] = message.shift();
                    break;
                case true:
                    // Update: change the server's player count
                    servers[index].players = message.shift();
                    break;
                case "doneLoading":
                    // Once loading is complete, trigger the server loaded callback
                    onServerLoaded();
                    break;
            }
        });
    } else {
        servers.push({ loadedViaMainServer: true });
        setTimeout(() => { // Space it a little out.
            if (global.launchedOnMainServer) {
                console.warn("Only one server can be loaded via through the main server!\nProcess terminated.");
                process.exit(1);
            }
            global.launchedOnMainServer = true;
            new GameServer(Config.host, gamemode, region, location, webProperties, properties, isFeatured, isHidden, isPrivate, false);
        }, 10);
    }
}

// Server Loaded Callback
let loadedServers = 0;
const webPort = parseInt(Config.host.split(":")[1]);
function onServerLoaded() {
    loadedServers++;
    // Once all servers are loaded, log the status and routing table
    if (loadedServers >= servers.length) {
        saveToLog("Servers up", "All servers booted up.", 0x37F554);
        if (Config.verbose_logs) {
            log("Dumping endpoint -> gamemode/region routing table");
            for (const game of servers) {
                console.log(`> ${Config.host}/#${game.id} -> ${game.region} | ${game.location} - ${game.gameMode}`);
            }
            console.log("\n");
        }
        const serverStartEndTime = performance.now();
        console.log(`Server loaded in ${util.rounder(serverStartEndTime, 4)} milliseconds.`);
        console.log(`[WS] Listening on port ${webPort}`);
    }
};

export default {onServerLoaded};

// Start the HTTP Server & Load Game Servers
server.listen(webPort, () => {
    Config.servers.forEach((server) => {
    // Load all of the servers.
        loadGameServer(
            server.host,
            server.gamemode,
            server.region,
            server.location,
            { id: server.id, maxPlayers: server.player_cap },
            server.properties,
            server.featured,
            server.hidden,
            server.private
        );
    });
});

// Upgrade HTTP connections to WebSocket connections if applicable
server.on("upgrade", (req, socket, head) => {
    wsServer.handleUpgrade(req, socket, head, (ws) => {
        if (global.launchedOnMainServer) {
            for (let i = 0; i < servers.length; i++) {
                const server = servers[i];
                if (server.gameManager) {
                    server.gameManager.socketManager.connect(ws, req);
                }
            }
        } else {
            ws.close();
        }
    });
});

// Set up a loop to periodically call Bun's garbage collector if available
const bunLoop = setInterval(() => {
    try {
        Bun.gc(true);
    } catch {
        // If Bun.gc fails, clear the interval
        clearInterval(bunLoop);
    }
}, 1000);

// Log that the web server has been initialized if logging is enabled
if (Config.verbose_logs) {
    console.log("Web Server initialized.");
}
