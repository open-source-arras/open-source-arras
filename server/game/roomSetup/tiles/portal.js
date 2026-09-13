let launchForce = 7500,
    gravity = 33500,
    minibossPush = 30000,

    portals = [];

tileClass.portal = new Tile({
    COLOR: "black",
    INIT: tile => portals.push(tile),
    TICK: (tile, room) => {
        for (let entity of tile.entities) {
            if (entity.passive || entity.settings.goThruObstacle || entity.facingType === "bound" || entity.cannotTeleport) continue;
            let dx = entity.x - tile.loc.x,
                dy = entity.y - tile.loc.y,
                dist2 = dx ** 2 + dy ** 2,
                force = Config.room_bound_force;

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
            let eventHorizon = Math.min(room.tileWidth, room.tileHeight) / 5;
            if (dist2 > eventHorizon ** 2) {
                force *= gravity / dist2;
                entity.velocity.x -= dx * force;
                entity.velocity.y -= dy * force;
                continue;
            }

            //calc stuff for teleporting and launching them
            force *= launchForce;
            let angle = Math.random() * Math.PI * 2,
                ax = Math.cos(angle),
                ay = Math.sin(angle),
                exitport = ran.choose(portals.filter(p => p !== tile) || room.random());

            //launch that idiot from the outportal
            entity.x = exitport.loc.x;
            entity.y = exitport.loc.y;
            entity.cannotTeleport = true;
            setTimeout(() => {
                entity.velocity.x = ax * force;
                entity.velocity.y = ay * force;
                setTimeout(() => entity.cannotTeleport = false, 200)
            }, 100)
            entity.protect()

            //also don't forget to bring her kids along the ride
            for (let o of entities.values()) {
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
