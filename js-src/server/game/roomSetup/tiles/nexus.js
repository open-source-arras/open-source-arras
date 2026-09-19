tileClass.nexus = new Tile({
    COLOR: "white",
    NAME: "Level 90 tile",
    TICK: (tile) => {
        for (let i = 0; i < tile.entities.length; i++) {
            let entity = tile.entities[i];
            if (entity.skill.level < 90) {
                !entity.nexus_alerted && entity.sendMessage("You need to be level 90 to enter this room!");
                entity.nexus_alerted = true;
                setTimeout(() => entity.nexus_alerted = false, 50);
                let dx = entity.x - tile.loc.x,
                dy = entity.y - tile.loc.y,
                dist2 = dx ** 2 + dy ** 2,
                force = 0.3;
                entity.accel.x += (((3e4 * dx) / dist2) * force);
                entity.accel.y += (((3e4 * dy) / dist2) * force);
            }
        }
    }
})
tileClass.nexus_portal_tile = new Tile({
    COLOR: "white",
    NAME: "Portal tile",
    DATA: {
        has_portal: false,
    },
    INIT: (tile, room) => {
        if (!room.portalTiles) room.portalTiles = [];
        room.portalTiles.push(tile);
    }
})
