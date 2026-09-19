// This is the checking loop. Runs at 1Hz.
class speedcheckloop {
    constructor() {
        this.fails = 0;
        this.isRestarting = false;
    }
    update() {
        let activationtime = logs.activation.sum(),
            collidetime = logs.collide.sum(),
            movetime = logs.entities.sum(),
            maptime = logs.minimap.sum(),
            physicstime = logs.physics.sum(),
            lifetime = logs.life.sum(),
            thoughtime = logs.though.sum(),
            selfietime = logs.selfie.sum();
        let playertime = logs.network.record();
        let masterrecord = logs.master.record();
        let sum = masterrecord.average + playertime.average;
        let loops = logs.loops.getTallyCount();

        global.fps = (1000/sum).toFixed(2);
        for (let e of entities.values()) {
            if (e.isPlayer && e.socket) {
                e.socket.talk("svInfo", global.gameManager.name, (sum).toFixed(1));
            }
        }
        if (sum > 1000 / global.gameManager.roomSpeed / 30) {
            this.fails++;
            if (Config.startup_logs) {
                util.warn(`Last server tick took too long to calculate! Info: [Loops: ${loops}, Total Entities: ${entities.size}, Clients: ${global.gameManager.clients.length} Backlogged: ${(sum * global.gameManager.roomSpeed * 3).toFixed(3)}%]`)
                util.warn('Total activation time: ' + activationtime);
                util.warn('Total collision time: ' + collidetime);
                util.warn('Total cycle time: ' + movetime);
                util.warn('Total player update time: ' + playertime.sum);
                util.warn('Total lb+minimap processing time: ' + maptime);
                util.warn('Total entity physics calculation time: ' + physicstime);
                util.warn('Total entity life+thought cycle time: ' + lifetime);
                util.warn('Total entity thought cycle time: ' + thoughtime);
                util.warn('Total entity selfie-taking time: ' + selfietime);
                util.warn('Total time: ' + (movetime + playertime.sum + maptime));
            }
            if (this.fails > 20 && (sum).toFixed(0) > 300 && !this.isRestarting) {
                this.isRestarting = true;
                util.error("FAILURE!");
                global.gameManager.socketManager.broadcast("Server overloaded! Restarting...");
                global.gameManager.gameHandler.stop();
                setTimeout(() => {global.gameManager.close()}, 900);
                setTimeout(() => {this.isRestarting = false}, 3000);
            }
        } else {
            this.fails = 0;
        }
    }
    onError(error) {
        if (this.isRestarting) return;
        this.isRestarting = true;
        util.error("FAILURE!");
        global.gameManager.socketManager.broadcast("Server Error! Restarting...");
        setTimeout(() => {global.gameManager.close()}, 900);
        setTimeout(() => {this.isRestarting = false}, 3000);
        console.error(error);
    }
}

module.exports = { speedcheckloop };