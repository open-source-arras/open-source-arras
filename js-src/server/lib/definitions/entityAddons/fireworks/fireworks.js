const fireworkShapes = [0, 3, 4, "M 0 -1 L 0.3 -0.4 L 1 -0.4 L 0.6 0.3 L 0.8 1 L 0 0.6 L -0.8 1 L -0.6 0.2 L -1 -0.4 L -0.4 -0.4 Z"]
const fireworkColors = [["blue", "red"], ["red", "orange"], ["blue", "cyan"], ["purple", "pink"], ["lime", "green"]]
const fireworkCountMin = 6
const fireworkCountMax = 22
const fireworkSpeed = 7
const fireworkRange = 25

Class.firework = {
    PARENT: "bullet",
    LABEL: "Firework",
    SIZE: 5,
    BODY: {
        HEALTH: 10,
        DAMAGE: 10
    }
}

let fireworkShapesClasses = [];
for (let i = 0; i < fireworkShapes.length; i++) {
    let name = `firework${i + 1}`;
    Class[name] = {
        PARENT: "firework",
        SHAPE: fireworkShapes[i],
    };
    fireworkShapesClasses.push(name);
}

function spawnFireworks(position) {
    let definition = fireworkShapesClasses[Math.floor(Math.random() * fireworkShapesClasses.length)];
    let colors = fireworkColors[Math.floor(Math.random() * fireworkColors.length)];
    let count = Math.floor(fireworkCountMin / colors.length) * colors.length + Math.floor(Math.random() * ((fireworkCountMax - fireworkCountMin) / colors.length)) * colors.length;

    let facing = Math.PI * 2 / count;

    for (let i = 0; i < count; i++) {
        let e = new Entity(position);
        e.isFirework = true;
        e.define(definition);
        if (e.colorUnboxed) {
            e.colorUnboxed.base = colors[i % colors.length];
        	e.compressColor();
        } else e.color.interpret(colors[i % colors.length]);
        e.facing = facing * i;
        e.accel.x = Math.cos(facing * i) * fireworkSpeed;
        e.accel.y = Math.sin(facing * i) * fireworkSpeed;
        e.range = fireworkRange;
        e.team = TEAM_ROOM;
    }
}

module.exports = ({ Events }) => {
    Events.on("spawn", body => {
        body.on("dead", () => {
            if (Config.fireworks && !body.isFirework) {
                spawnFireworks({x: body.x, y: body.y});
            }
        })
    })
}
