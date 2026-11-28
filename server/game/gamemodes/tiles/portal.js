import { choose } from "../../../lib/random";
import { Config, Tile, tileClass } from "../../../loaders/global";
import { entities } from "../../debug/logs";

const launchForce = 7500;
const gravity = 33500;
const minibossPush = 30000;

const portals = [];

tileClass.portal = new Tile({
    COLOR: "black",
    INIT: (tile) => portals.push(tile),
    TICK: (tile, room) => {
        for (const entity of tile.entities) {
            if (entity.passive || entity.settings.goThruObstacle || entity.facingType === "bound" || entity.cannotTeleport) {
                continue;
            }
            const dx = entity.x - tile.loc.x;
            const dy = entity.y - tile.loc.y;
            const dist2 = dx ** 2 + dy ** 2;
            let force = Config.room_bound_force;

            //push away big boys
            if (entity.type === "miniboss" || entity.isMothership) {
                entity.accel.x += minibossPush * dx * force / dist2;
                entity.accel.y += minibossPush * dy * force / dist2;
                continue;
            }

            //kill anything not a tank
            if (entity.type !== "tank") {
                entity.kill();
                continue;
            }

            //that tank is not close enough, suck them in!
            const eventHorizon = Math.min(room.tileWidth, room.tileHeight) / 5;
            if (dist2 > eventHorizon ** 2) {
                force *= gravity / dist2;
                entity.velocity.x -= dx * force;
                entity.velocity.y -= dy * force;
                continue;
            }

            //calc stuff for teleporting and launching them
            force *= launchForce;
            const angle = Math.random() * Math.PI * 2;
            const ax = Math.cos(angle);
            const ay = Math.sin(angle);
            const exitport = choose(portals.filter((p) => p !== tile) || room.random());

            //launch that idiot from the outportal
            entity.x = exitport.loc.x;
            entity.y = exitport.loc.y;
            entity.cannotTeleport = true;
            setTimeout(() => {
                entity.velocity.x = ax * force;
                entity.velocity.y = ay * force;
                setTimeout(() => entity.cannotTeleport = false, 200);
            }, 100);
            entity.protect();

            //also don't forget to bring her kids along the ride
            for (const o of entities.values()) {
                if (o.id !== entity.id && o.master.master.id === entity.id && (o.type === "drone" || o.type === "minion" || o.type === "satellite")) {
                    o.velocity.x += entity.velocity.x;
                    o.velocity.y += entity.velocity.y;
                    o.x = entity.x;
                    o.y = entity.y;
                }
            }
        }
    }
});
