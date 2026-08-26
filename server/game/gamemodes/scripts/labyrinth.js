class Labyrinth {
    constructor(gameManager, type) {
        this.type = 4;
    }
    generate() {
        // Spawn maze
        for (let o of entities.values()) {
            if (o.type === "wall") o.destroy();
        }
        let mazeGenerator = new global.mazeGenerator.MazeGenerator(this.type);
        let { squares, width, height } = mazeGenerator.placeMinimal();
        for (let instance of entities) {
            if (instance.type == "wall") instance.kill();
        }
        squares.forEach(element => {
            let wall = new Entity({
                x: global.gameManager.room.width / width * element.x - global.gameManager.room.width / 2 + global.gameManager.room.width / width / 2 * element.size, 
                y: global.gameManager.room.height / height * element.y - global.gameManager.room.height / 2 + global.gameManager.room.height / height / 2 * element.size
            })
            wall.define("labyrinthWall");
            wall.SIZE = global.gameManager.room.width / width / 2 * element.size / lazyRealSizes[4] * Math.SQRT2 - 2;
            wall.protect();
            wall.life();
            makeHitbox(wall);
            walls.push(wall);
            wall.on("dead", () => {
                util.remove(walls, walls.indexOf(wall));
            })
            if (Config.spooky_theme) {
                let eyeSize = 12 * (Math.random() + 0.45);
                let spookyEye = new Entity({ x: wall.x + (wall.size - eyeSize * 2) * Math.random() - wall.size / 2, y: wall.y + (wall.size - eyeSize * 2) * Math.random() - wall.size / 2 })
                spookyEye.define("hwEye");
                setTimeout(() => {
                    spookyEye.define({FACING_TYPE: ["manual", {angle: ran.randomAngle()}]})
                }, 1000)
                spookyEye.SIZE = eyeSize;
                spookyEye.minimapColor = 18;
            }
        });
    }
    redefine(type) {
        this.type = type;
    }
}

module.exports = { Labyrinth };