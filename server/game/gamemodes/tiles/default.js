import { randomAngle } from "../../../lib/random";
import { remove } from "../../../lib/util";
import { Config, getTeamColor, makeHitbox, TEAM_ENEMIES, TEAM_RED, TEAM_ROOM, Tile, tileClass, walls } from "../../../loaders/global";
import { ioTypes } from "../../../miscFiles/controllers";
import { Entity } from "../../entities/entity";
import { getRealSizeLazy } from "../../entities/subFunctions";

const spawnPermanentAntiTankMachineGun = (loc, gameManager) => {
    const o = new Entity(loc);
    o.define("antiTankMachineGun");
    o.define({
        BODY: { FOV: 1.5 },
        FACING_TYPE: "spinWhenIdle"
    });
    o.controllers = [new ioTypes.nearestDifferentMaster(o, {}, gameManager)];
    o.team = TEAM_ROOM;
    o.SIZE = 15;
    o.color.base = getTeamColor(TEAM_RED);
    o.on("dead", () => spawnPermanentAntiTankMachineGun(loc, gameManager));
};

tileClass.normal = new Tile({
    COLOR: "white",
    NAME: "Default Tile",
    INIT: (tile, room) => room.spawnableDefault.push(tile)
});
tileClass.nest = new Tile({
    COLOR: "white",
    NAME: "Nest Tile",
    INIT: (tile, room) => {
        if (!room.spawnable[TEAM_ENEMIES]) {
            room.spawnable[TEAM_ENEMIES] = [];
        }
        room.spawnable[TEAM_ENEMIES].push(tile);
    }
});
tileClass.wall = new Tile({
    COLOR: "white",
    NAME: "Wall Tile",
    INIT: (tile, room) => {
        const o = new Entity(tile.loc);
        o.define("wall");
        o.team = TEAM_ROOM;
        o.SIZE = room.tileWidth / 2 / getRealSizeLazy(4) * Math.SQRT2 - 2;
        o.protect();
        o.life();
        makeHitbox(o);
        walls.push(o);
        o.on("dead", () => {
            remove(walls, walls.indexOf(o));
        });
        if ((Config.seasonal_events && new Date().getMonth() === 9) || Config.force_spooky_theme) {
            const eyeSize = 12 * (Math.random() + 0.75);
            const spookyEye = new Entity({ x: o.x + (o.size - eyeSize * 2) * Math.random() - o.size / 2, y: o.y + (o.size - eyeSize * 2) * Math.random() - o.size / 2 });
            spookyEye.define("hwEye");
            spookyEye.define({FACING_TYPE: ["manual", {angle: randomAngle()}]});
            spookyEye.SIZE = eyeSize;
            spookyEye.minimapColor = 18;
        }
    }
});
tileClass.atmg = new Tile({
    COLOR: "white",
    NAME: "ATMG Tile",
    INIT: (tile, _, gameManager) => spawnPermanentAntiTankMachineGun(tile.loc, gameManager)
});
