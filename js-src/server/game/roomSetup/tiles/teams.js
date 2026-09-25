let spawnPermanentBaseProtector = (loc, team) => {
    let o = new Entity(loc);
    o.define('baseProtector');
    o.team = team;
    o.color.base = getTeamColor(team);
    o.on('dead', () => spawnPermanentBaseProtector(loc, team));
},
teamCheck = (tile, team) => {
    for (let i = 0; i < tile.entities.length; i++) {
        let entity = tile.entities[i];
        if (entity.team !== team && !entity.ac && !entity.master.master.ac && !entity.isArenaCloser && !entity.master.master.isArenaCloser && !Config.disable_base_check) {
            entity.kill()
        };
    }
},
teamRoomCheck = (tile, team, room) => {
    if (!room.spawnable[team]) room.spawnable[team] = [];
    room.spawnable[team].push(tile);
};

// Team -1 (blue)
tileClass.base1 = new Tile({
    COLOR: "blue",
    INIT: (tile, room) => teamRoomCheck(tile, TEAM_BLUE, room),
    TICK: tile => teamCheck(tile, TEAM_BLUE)
})
tileClass.baseprotected1 = new Tile({
    COLOR: "blue",
    VISIBLE_FROM_BLACKOUT: true,
    INIT: (tile, room) => {
        teamRoomCheck(tile, TEAM_BLUE, room),
        spawnPermanentBaseProtector(tile.loc, TEAM_BLUE);
    },
    TICK: tile => teamCheck(tile, TEAM_BLUE)
})

// Team -2 (Green)
tileClass.base2 = new Tile({
    COLOR: "green",
    INIT: (tile, room) => teamRoomCheck(tile, TEAM_GREEN, room),
    TICK: tile => teamCheck(tile, TEAM_GREEN)
})
tileClass.baseprotected2 = new Tile({
    COLOR: "green",
    VISIBLE_FROM_BLACKOUT: true,
    INIT: (tile, room) => {
        teamRoomCheck(tile, TEAM_GREEN, room),
        spawnPermanentBaseProtector(tile.loc, TEAM_GREEN);
    },
    TICK: tile => teamCheck(tile, TEAM_GREEN)
})

// Team -3 (Red)
tileClass.base3 = new Tile({
    COLOR: "red",
    INIT: (tile, room) => teamRoomCheck(tile, TEAM_RED, room),
    TICK: tile => teamCheck(tile, TEAM_RED)
})
tileClass.baseprotected3 = new Tile({
    COLOR: "red",
    VISIBLE_FROM_BLACKOUT: true,
    INIT: (tile, room) => {
        teamRoomCheck(tile, TEAM_RED, room),
        spawnPermanentBaseProtector(tile.loc, TEAM_RED);
    },
    TICK: tile => teamCheck(tile, TEAM_RED)
})

// Team -4 (Purple)
tileClass.base4 = new Tile({
    COLOR: "magenta",
    INIT: (tile, room) => teamRoomCheck(tile, TEAM_PURPLE, room),
    TICK: tile => teamCheck(tile, TEAM_PURPLE)
})
tileClass.baseprotected4 = new Tile({
    COLOR: "magenta",
    VISIBLE_FROM_BLACKOUT: true,
    INIT: (tile, room) => {
        teamRoomCheck(tile, TEAM_PURPLE, room),
        spawnPermanentBaseProtector(tile.loc, TEAM_PURPLE);
    },
    TICK: tile => teamCheck(tile, TEAM_PURPLE)
})

// Team -5 (Yellow)
tileClass.base5 = new Tile({
    COLOR: "mustard",
    INIT: (tile, room) => teamRoomCheck(tile, TEAM_YELLOW, room),
    TICK: tile => teamCheck(tile, TEAM_YELLOW)
})
tileClass.baseprotected5 = new Tile({
    COLOR: "mustard",
    VISIBLE_FROM_BLACKOUT: true,
    INIT: (tile, room) => {
        teamRoomCheck(tile, TEAM_YELLOW, room),
        spawnPermanentBaseProtector(tile.loc, TEAM_YELLOW);
    },
    TICK: tile => teamCheck(tile, TEAM_YELLOW)
})

// Team -6 (Orange)
tileClass.base6 = new Tile({
    COLOR: "tangerine",
    INIT: (tile, room) => teamRoomCheck(tile, TEAM_ORANGE, room),
    TICK: tile => teamCheck(tile, TEAM_ORANGE)
})
tileClass.baseprotected6 = new Tile({
    COLOR: "tangerine",
    VISIBLE_FROM_BLACKOUT: true,
    INIT: (tile, room) => {
        teamRoomCheck(tile, TEAM_ORANGE, room),
        spawnPermanentBaseProtector(tile.loc, TEAM_ORANGE);
    },
    TICK: tile => teamCheck(tile, TEAM_ORANGE)
})

// Team -7 (Brown)
tileClass.base7 = new Tile({
    COLOR: "brown",
    INIT: (tile, room) => teamRoomCheck(tile, TEAM_BROWN, room),
    TICK: tile => teamCheck(tile, TEAM_BROWN)
})
tileClass.baseprotected7 = new Tile({
    COLOR: "brown",
    VISIBLE_FROM_BLACKOUT: true,
    INIT: (tile, room) => {
        teamRoomCheck(tile, TEAM_BROWN, room),
        spawnPermanentBaseProtector(tile.loc, TEAM_BROWN);
    },
    TICK: tile => teamCheck(tile, TEAM_BROWN)
})

// Team -8 (Cyan)
tileClass.base8 = new Tile({
    COLOR: "cyan",
    INIT: (tile, room) => teamRoomCheck(tile, TEAM_CYAN, room),
    TICK: tile => teamCheck(tile, TEAM_CYAN)
})
tileClass.baseprotected8 = new Tile({
    COLOR: "cyan",
    VISIBLE_FROM_BLACKOUT: true,
    INIT: (tile, room) => {
        teamRoomCheck(tile, TEAM_CYAN, room),
        spawnPermanentBaseProtector(tile.loc, TEAM_CYAN);
    },
    TICK: tile => teamCheck(tile, TEAM_CYAN)
})
