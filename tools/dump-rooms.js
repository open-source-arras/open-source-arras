// Dumps js-src's room-setup tile registry and room grids to gen/rooms.json.
//
// js-src/server/loaders/loader.js:36-48 loads every file under
// game/roomSetup/tiles/ by directory scan (fs.readdirSync), and each one assigns
// `tileClass.<key> = new Tile({...})`. game.js:490 then loads a room grid by name
// (`require('./game/roomSetup/rooms/${filename}.js')`), a 2-D array whose cells are
// references into that same tileClass object.
//
// Hand-transcribing the grids (room_halloween.js alone is a 67-row wall maze) would
// be error-prone and unreviewable. Instead this requires the real tile files (so
// tileClass is populated exactly as the server populates it), then requires each
// room file and replaces every cell with the tileClass *key* it points at -- found
// by identity, not by value, since two tiles can share a COLOR or NAME. An empty
// cell (the sparse overlay rooms use `Array(15).fill()`, never assigning most
// entries) dumps as null.
//
// This only captures the STATIC shape of a tile: its key, display name, image,
// color, visibleOnBlackout and data block. INIT/TICK are real per-instance
// closures over live room state (spawning entities, walking the entity list) --
// captured here as source text for cross-reference, never called. Reproducing
// their behaviour is internal/room's job in Go, ported by hand from the same
// source and cited by file:line, not generated.
//
// js-src is READ-ONLY: this script only requires/reads files under it, never
// writes there. Its only write is gen/rooms.json.

const fs = require('fs');
const path = require('path');

const REPO_ROOT = path.resolve(__dirname, '..');
const SERVER_DIR = path.join(REPO_ROOT, 'js-src', 'server');
const TILES_DIR = path.join(SERVER_DIR, 'game', 'roomSetup', 'tiles');
const ROOMS_DIR = path.join(SERVER_DIR, 'game', 'roomSetup', 'rooms');

require(path.join(SERVER_DIR, 'loaders', 'global.js'));

// Mirrors loader.js:38-44 exactly: same directory, same fs.readdirSync order.
const tileFiles = fs.readdirSync(TILES_DIR).filter(f => f.endsWith('.js')).sort();
for (const filename of tileFiles) {
    require(path.join(TILES_DIR, filename));
}

const tileKeys = Object.keys(global.tileClass);
if (tileKeys.length === 0) {
    throw new Error('dump-rooms: tileClass is empty after loading every roomSetup/tiles file');
}

// Reverse lookup: which tileClass key does this object identity belong to. A Map
// keyed by the Tile instance itself, not its name/color, since neither is unique
// (tiles/assault.js's abase2 and sabase2 are both "Green Tile").
const byIdentity = new Map();
for (const key of tileKeys) {
    byIdentity.set(global.tileClass[key], key);
}

const tiles = {};
for (const key of tileKeys) {
    const t = global.tileClass[key];
    tiles[key] = {
        name: t.name ?? null,
        image: t.image ?? null,
        color: typeof t.color === 'undefined' ? null : t.color,
        visibleOnBlackout: !!t.visibleOnBlackout,
        data: t.data,
        // Informational only -- never invoked. The default no-op the Tile
        // constructor installs (global.js:600,604) stringifies as "() => { }",
        // which is how a tile with no real INIT/TICK is told apart from one that
        // has one.
        initSource: t.init.toString(),
        tickSource: t.tick.toString(),
    };
}

function toKeyGrid(filename, grid) {
    if (!Array.isArray(grid)) {
        throw new Error(`dump-rooms: ${filename} does not export an array (got ${typeof grid})`);
    }
    return grid.map(row => row.map(cell => {
        if (cell === undefined || cell === null) return null;
        const key = byIdentity.get(cell);
        if (key === undefined) {
            throw new Error(`dump-rooms: ${filename} has a cell that is not a tile from tileClass (value: ${cell})`);
        }
        return key;
    }));
}

// room_tdm.js is the one room file that is not a plain grid literal: it reads
// Config.roomHeight/roomWidth (set from whichever room loaded before it -- see
// below) and require('../../gamemodes/config/tdm.js').teams, then branches into
// either a hardcoded 2-team column layout or a general 1..8-team corner-slot table
// (room_tdm.js:60-77). That is an algorithm, not data, so it is ported as Go code
// rather than baked into one frozen grid -- but it is deterministic given
// (teams, roomHeight, roomWidth), so this captures one grid per team count for the
// Go port to diff itself against.
const TDM_FILE = 'room_tdm.js';
const TDM_PATH = path.join(ROOMS_DIR, TDM_FILE);
const TDM_CONFIG_PATH = path.join(SERVER_DIR, 'game', 'gamemodes', 'config', 'tdm.js');

// Every other room-setup file is a plain literal, but game.js:486-504's setRoom()
// always loads room_default first for any gamemode that does not set
// `do_not_override_room: false` (see docs/architecture.md port notes on
// do_not_override_room), so Config.roomHeight/roomWidth are 15/15 (room_default's
// own dimensions) by the time a second entry such as room_tdm loads. Set that here
// too, defensively, even though no *other* room file currently reads it.
Config.roomHeight = 15;
Config.roomWidth = 15;

const roomFiles = fs.readdirSync(ROOMS_DIR).filter(f => f.endsWith('.js')).sort();
const rooms = {};
for (const filename of roomFiles) {
    if (filename === TDM_FILE) continue; // handled separately below
    const name = filename.slice(0, -3);
    rooms[name] = toKeyGrid(filename, require(path.join(ROOMS_DIR, filename)));
}

const roomTdmByTeamCount = {};
for (let teams = 1; teams <= 8; teams++) {
    Config.teams = teams;
    delete require.cache[require.resolve(TDM_CONFIG_PATH)];
    delete require.cache[require.resolve(TDM_PATH)];
    const grid = require(TDM_PATH);
    roomTdmByTeamCount[teams] = toKeyGrid(TDM_FILE, grid);
}
delete Config.teams;

const dump = {
    generatedAt: new Date().toISOString(),
    generatedBy: 'tools/dump-rooms.js',
    sourceDirs: {
        tiles: 'js-src/server/game/roomSetup/tiles/',
        rooms: 'js-src/server/game/roomSetup/rooms/',
    },
    note: 'tiles maps a tileClass key to its static shape. rooms maps a room-setup ' +
        'name to its grid, each cell replaced by the tileClass key it referenced (or ' +
        'null for an unset cell), for every room file except room_tdm.js. Row-major: ' +
        'rooms[name][y][x]. roomTdmByTeamCount is room_tdm.js\'s grid for each team ' +
        'count 1..8 with Config.roomHeight=Config.roomWidth=15 (room_default\'s own ' +
        'size), for pinning the hand-ported branching logic instead of trusting one ' +
        'frozen grid.',
    tiles,
    rooms,
    roomTdmByTeamCount,
    counts: {
        tileCount: tileKeys.length,
        roomCount: roomFiles.length,
    },
};

const outDir = path.join(REPO_ROOT, 'gen');
if (!fs.existsSync(outDir)) fs.mkdirSync(outDir, { recursive: true });
const outPath = path.join(outDir, 'rooms.json');
fs.writeFileSync(outPath, JSON.stringify(dump, null, 2) + '\n');

console.log('Wrote ' + path.relative(REPO_ROOT, outPath).replace(/\\/g, '/'));
console.log('tiles: ' + tileKeys.length);
console.log('rooms: ' + roomFiles.length);
for (const name of Object.keys(rooms)) {
    const grid = rooms[name];
    console.log(`  ${name}: ${grid.length}x${grid[0] ? grid[0].length : 0}`);
}
