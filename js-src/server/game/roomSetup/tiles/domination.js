tileClass.dominationTile = new Tile({
    COLOR: "yellow",
    NAME: "Domination Tile",
    INIT: (tile, room) => {
        if (!room.spawnable["Dominators"]) room.spawnable["Dominators"] = [];
        room.spawnable["Dominators"].push(tile);
    },
});
