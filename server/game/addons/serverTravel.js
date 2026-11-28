import { gameManager } from "../../game";
import { choose } from "../../lib/random";
import { Entity } from "../entities/entity";


async function getServer(server) {
    try {
        let data = await fetch(`${server.ip.startsWith("localhost") ? "http" : "https"}://${server.ip}/portalPermission`).then((r) => r.json()).catch(() => false);
        if (!data) {
            return false;
        }
        if (Array.isArray(data)) {
            data = data.find((d) => d && d.ip === server.ip) ?? data[0];
        }
        if (!data) {
            return false;
        }
        const id = data.id ?? server.id ?? null;
        const gameMode = (data.gameMode ?? "Unknown").trim();
        return {
            id,
            name: id ? `${gameMode} (#${id})` : gameMode,
            players: data.players,
            ip: server.ip,
            destination: `${server.ip.startsWith("localhost") ? "http://" : "https://"}${data.ip}`
        };
    } catch (e) {
        console.log(e);
    }
}

// Portal spawner class
const Portal = class {
    constructor(name, players, destination, ip, id = null) {
        this.name = name;
        this.players = players;
        this.destination = destination;
        this.ip = ip;
        this.id = id;
        this.body = null;
    }
    spawn(loc, color = "#FFFFFF", duration) {
        if (loc.data) {
            loc.data.has_portal = true;
        }
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
        const updateInterval = setInterval(async () => {
            const data = await getServer({ip: this.ip, id: this.id});
            if (data) {
                if (data.id) {
                    this.id = data.id;
                }
                this.body.settings.scoreLabel = `${data.players} player${data.players === 1 ? "" : "s"}`;
                this.body.name = data.name;
            }
        }, 5000);
        setTimeout(() => {
            clearInterval(updateInterval);
            this.body.destroy();
            if (loc.data) {
                loc.data.has_portal = false;
            }
        }, duration);
    }
};
export class serverTravelHandler {
    constructor(self, spawnChance, color) {
        this.self = self;
        this.spawnChance = spawnChance;
        this.color = color;
    }
    async spawnRandom() {
        const spawnChance = Math.random() < 1 / this.spawnChance;
        if (spawnChance) {
            const server = await getServer(this.self);
            if (server) {
                let tiles = gameManager.room.portalTiles ? gameManager.room.portalTiles.filter((tile) => tile && !tile.data.has_portal) : [];
                if (!tiles.length) {
                    tiles = false;
                }
                const portal = new Portal(server.name, server.players, server.destination, server.ip, server.id);
                portal.spawn(tiles ? choose(tiles) : gameManager.room.random(), this.color, 60000);
            }
        }
    }
}
