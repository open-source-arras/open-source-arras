import { gameManager } from "../../game";
import { warn, error } from "../../lib/util";
import { entities, Config } from "../../loaders/global";
import { loops, activation, collide, minimap, physics, life, though, selfie, network, master } from "./logs";

// This is the checking loop. Runs at 1Hz.
export class speedcheckloop {
    constructor() {
        this.fails = 0;
        this.isRestarting = false;
    }
    update() {
        const activationtime = activation.sum();
        const collidetime = collide.sum();
        const movetime = entities.sum();
        const maptime = minimap.sum();
        const physicstime = physics.sum();
        const lifetime = life.sum();
        const thoughtime = though.sum();
        const selfietime = selfie.sum();
        const playertime = network.record();
        const masterrecord = master.record();
        const sum = masterrecord.average + playertime.average;
        const loopCount = loops.getTallyCount();

        global.fps = (1000 / sum).toFixed(2);
        for (const e of entities.values()) {
            if (e.isPlayer && e.socket) {
                e.socket.talk("svInfo", gameManager.name, (sum).toFixed(1));
            }
        }
        if (sum > 1000 / gameManager.roomSpeed / 30) {
            this.fails++;
            if (Config.verbose_logs) {
                warn(`Last server tick took too long to calculate! Info: [Loops: ${loopCount}, Total Entities: ${entities.size}, Clients: ${gameManager.clients.length} Backlogged: ${(sum * gameManager.roomSpeed * 3).toFixed(3)}%]`);
                warn(`Total activation time: ${activationtime}`);
                warn(`Total collision time: ${collidetime}`);
                warn(`Total cycle time: ${movetime}`);
                warn(`Total player update time: ${playertime.sum}`);
                warn(`Total lb+minimap processing time: ${maptime}`);
                warn(`Total entity physics calculation time: ${physicstime}`);
                warn(`Total entity life+thought cycle time: ${lifetime}`);
                warn(`Total entity thought cycle time: ${thoughtime}`);
                warn(`Total entity selfie-taking time: ${selfietime}`);
                warn(`Total time: ${movetime + playertime.sum + maptime}`);
            }
            if (this.fails > 20 && (sum).toFixed(0) > 300 && !this.isRestarting) {
                this.isRestarting = true;
                error("FAILURE!");
                gameManager.socketManager.broadcast("Server overloaded! Restarting...");
                gameManager.gameHandler.stop();
                setTimeout(() => {
                    gameManager.close();
                }, 900);
                setTimeout(() => {
                    this.isRestarting = false;
                }, 3000);
            }
        } else {
            this.fails = 0;
        }
    }
    onError(error) {
        if (this.isRestarting) {
            return;
        }
        this.isRestarting = true;
        error("FAILURE!");
        gameManager.socketManager.broadcast("Server Error! Restarting...");
        setTimeout(() => {
            gameManager.close();
        }, 900);
        setTimeout(() => {
            this.isRestarting = false;
        }, 3000);
        console.error(error);
    }
}
