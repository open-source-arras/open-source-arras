tileClass.outBorder = new Tile({
    COLOR: "white",
    TICK: tile => {
        for (let i = 0; i < tile.entities.length; i++) {
            let entity = tile.entities[i];
            if (!entity.isBoss && 
                !entity.master.master.isBoss && 
                !entity.isArenaCloser && 
                (!entity.master.master.isArenaCloser || entity.isArenaCloser === false) &&
                !entity.godmode &&
                entity.type !== "wall"
            ) entity.kill();
        }
    }
});

let addTileToBossSpawnTile = (tile, room) => {
    if (!room.spawnable["bossSpawnTile"]) room.spawnable["bossSpawnTile"] = [];
    room.spawnable["bossSpawnTile"].push(tile);
}
let bossTick = (tile, pushTo, allow) => {
    for (let i = 0; i < tile.entities.length; i++) {
        let entity = tile.entities[i];
        if (!entity.isBoss && 
            !entity.master.master.isBoss && 
            !entity.isArenaCloser && 
            (!entity.master.master.isArenaCloser || entity.isArenaCloser === false) &&
            !entity.godmode &&
            entity.type !== "wall"
        ) entity.kill();
        if (pushTo == "right" && 
            allow == "blitz" && 
            Config.blitz &&
            entity.isBoss && 
            !entity.control.fire
        ) {
            entity.x += 2 / 0.9;
        }
    }
}

tileClass.bossSpawn = new Tile({
    COLOR: "red",
    NAME: "Boss Spawn",
    INIT: (tile, room) => {
        if (!Config.blitz && !Config.fortress && !Config.citadel) addTileToBossSpawnTile(tile, room);
    },
    TICK: (tile, room) => bossTick(tile, "right", "blitz")
});
tileClass.bossSpawnVoid = new Tile({
    COLOR: "white",
    NAME: "Boss Spawn",
    INIT: (tile, room) => {
        if (Config.blitz || Config.fortress || Config.citadel) addTileToBossSpawnTile(tile, room);
    },
    TICK: (tile, room) => bossTick(tile, "right", "blitz")
})

tileClass.sbase1 = new Tile({
    COLOR: "blue",
    NAME: "Sanctuary Tile",
    INIT: (tile, room) => {
        if (!room.spawnable[TEAM_BLUE]) room.spawnable[TEAM_BLUE] = [];
        room.spawnable[TEAM_BLUE].push(tile);
    }
})

tileClass.stopAI = new Tile({
    COLOR: "white",
    NAME: "stopAI",
    TICK: (tile, room) => {
        let pushx = 2;
        let pushy = 2;
        if (Config.blitz) pushx = 1;
        for (let i = 0; i < tile.entities.length; i++) {
            let entity = tile.entities[i];
            if (entity.pushability && entity.isBot) {
                let dirToCenter = Math.atan2(room.height / pushy - entity.y - room.height / 2, room.width / pushx - entity.x - room.width / 2);
                entity.velocity.x = Math.cos(dirToCenter) * 5 * entity.pushability;
                entity.velocity.y = Math.sin(dirToCenter) * 5 * entity.pushability;
                entity.justHittedAWall = true;
            }
        }
    }
})
