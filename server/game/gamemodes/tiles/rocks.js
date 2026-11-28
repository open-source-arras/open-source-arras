import { Config } from "../../../config";
import { randomAngle } from "../../../lib/random";
import { ensureIsClass, Tile, tileClass } from "../../../loaders/global";
import { Entity } from "../../entities/entity";
import { dirtyCheck } from "../../entities/subFunctions";

const placeRoids = (defs, tile, room, gameManager) => {
    for (let [def, amount] of defs) {
        def = ensureIsClass(def);
        const checkRadius = 10 + def.SIZE;
        for (; amount; amount--) {
            let i = 200;
            let position;
            do {
                position = tile.randomInside();
            } while (i-- && dirtyCheck(position, checkRadius, gameManager));
            const o = new Entity(position);
            o.team = -101;
            o.facing = randomAngle();
            o.define(def);
            o.protect();
            o.life();
        }
    }
};

const spookyMonth = Config.force_spooky_theme ? true : Config.seasonal_events && new Date().getMonth() === 9 ? true : false;

tileClass.rock = new Tile({
    COLOR: "white",
    NAME: "Rock Tile",
    INIT: (tile, room, gameManager) => {
        placeRoids([[spookyMonth ? "pumpkin" : "rock", 0], [spookyMonth ? "pumpkin" : "stone", 1], [spookyMonth ? "pumpkin" : "gravel", 2]], tile, room, gameManager);
        room.spawnableDefault.push(tile);
    }
});
tileClass.roid = new Tile({
    COLOR: "white",
    NAME: "Roid Tile",
    INIT: (tile, room, gameManager) => {
        placeRoids([[spookyMonth ? "pumpkin" : "rock", 1], [spookyMonth ? "pumpkin" : "stone", 1], [spookyMonth ? "pumpkin" : "gravel", 1]], tile, room, gameManager), room.spawnableDefault.push(tile),
        room.spawnableDefault.push(tile);
    }
});
