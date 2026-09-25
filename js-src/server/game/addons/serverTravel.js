async function getServer(server) {
    try {
        let data = await fetch(`${server.ip.startsWith("localhost") ? "http" : "https"}://${server.ip}/portalPermission`).then(r => r.json()).catch(() => false);
        if (!data) return false;
        data = data[0];
        return {
            name: data.gameMode.trim(),
            players: data.players,
            ip: server.ip,
            destination: `${server.ip.startsWith("localhost") ? "http://" : "https://"}${data.ip}`
        };
    } catch (e) {
        console.log(e);
    }
}

// Portal spawner class
let Portal = class {
    constructor(name, players, destination, ip) {
        this.name = name;
        this.players = players;
        this.destination = destination;
        this.ip = ip;
        this.body = null;
    }
    spawn(loc, color = "#ffffff", duration) {
        if (loc.data) loc.data.has_portal = true;
        this.body = new Entity(loc.data ? loc.randomInside() : loc);
        this.body.define("serverPortal");
        this.body.isPortal = true;
        this.body.color.base = color;
        this.body.godmode = true;
        this.body.team = -101;
        this.body.isPortal = true;
        this.body.name = this.name;
        this.body.settings.scoreLabel = `${this.players} player${this.players === 1 ? "" : "s"}`;
        this.body.settings.destination = this.destination;
        this.body.allowedOnMinimap = true;
        this.body.alwaysShowOnMinimap = true;
        this.body.minimapColor = 19;
        let updateInterval = setInterval(async () => {
            let data = await getServer({ip: this.ip});
            if (data) {
                this.body.settings.scoreLabel = `${data.players} player${data.players === 1 ? "" : "s"}`;
                this.body.name = data.name;
            }
        }, 5000);
        setTimeout(() => {
            clearInterval(updateInterval);
            this.body.destroy();
            if (loc.data) loc.data.has_portal = false;
        }, duration);
    }
}
class serverTravelHandler {
    constructor(self, spawnChance, color) {
        this.self = self;
        this.spawnChance = spawnChance;
        this.color = color;
    }
    async spawnRandom() {
        let spawnChance = Math.random() < 1 / this.spawnChance;
        if (spawnChance) {
            let server = await getServer(this.self);
            if (server) {
                let tiles = global.gameManager.room.portalTiles ? global.gameManager.room.portalTiles.filter(tile => tile && !tile.data.has_portal) : [];
                if (!tiles.length) tiles = false;
                let portal = new Portal(server.name, server.players, server.destination, server.ip);
                portal.spawn(tiles ? ran.choose(tiles) : global.gameManager.room.random(), this.color, 60000);
            }
        }
    }
}
if (loadedAddons.includes("chatCommands")) {
    addChatCommand({
        command: ["join", "j"],
        description: "Connects you to another server",
        level: 3,
        hidden: true,
        run: ({ args, socket }) => {
            if (!args[0]) {
                socket.talk("m", 5_000, "No server specified.");
                return;
            }
            let server = Config.servers.find(
                s => s.id === args[0]
            );
            if (!server) {
                socket.talk("m", 5_000, "Server not found.");
                return;
            }
            global.gameManager.socketManager.sendToServer(socket, `http://${server.host}`);
        }
    })
}

module.exports = { serverTravelHandler }