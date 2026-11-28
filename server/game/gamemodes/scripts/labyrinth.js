import { randomAngle } from "../../../lib/random";
import { remove } from "../../../lib/util";
import { Config, entities, getRealSizeLazy, makeHitbox, walls } from "../../../loaders/global";
import { Entity } from "../../entities/entity";

export class Labyrinth {
    constructor(gameManager) {
        this.gameManager = gameManager;
        this.type = 4;
    }
    generate() {
    // Spawn maze
        for (const o of entities.values()) {
            if (o.type === "wall") {
                o.destroy();
            }
        }
        const MazeGenerator = new global.MazeGenerator.MazeGenerator(this.type);
        const { squares, width, height } = MazeGenerator.placeMinimal();
        for (const instance of entities) {
            if (instance.type == "wall") {
                instance.kill();
            }
        }
        squares.forEach((element) => {
            const wall = new Entity({
                x: this.gameManager.room.width / width * element.x - this.gameManager.room.width / 2 + this.gameManager.room.width / width / 2 * element.size,
                y: this.gameManager.room.height / height * element.y - this.gameManager.room.height / 2 + this.gameManager.room.height / height / 2 * element.size
            });
            wall.define("labyrinthWall");
            wall.SIZE = this.gameManager.room.width / width / 2 * element.size / getRealSizeLazy(4) * Math.SQRT2 - 2;
            wall.protect();
            wall.life();
            makeHitbox(wall);
            walls.push(wall);
            wall.on("dead", () => {
                remove(walls, walls.indexOf(wall));
            });
            if ((Config.seasonal_events && new Date().getMonth() === 9) || Config.force_spooky_theme) {
                const eyeSize = 12 * (Math.random() + 0.45);
                const spookyEye = new Entity({ x: wall.x + (wall.size - eyeSize * 2) * Math.random() - wall.size / 2, y: wall.y + (wall.size - eyeSize * 2) * Math.random() - wall.size / 2 });
                spookyEye.define("hwEye");
                setTimeout(() => {
                    spookyEye.define({FACING_TYPE: ["manual", {angle: randomAngle()}]});
                }, 1000);
                spookyEye.SIZE = eyeSize;
                spookyEye.minimapColor = 18;
            }
        });
    }
    redefine(type) {
        this.type = type;
    }
}
