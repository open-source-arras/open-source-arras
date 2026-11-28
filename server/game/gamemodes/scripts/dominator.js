import { gameManager } from "../../../game";
import { choose } from "../../../lib/random";
import { TEAM_ENEMIES, getTeamName, key, getTeamColor, TEAM_ROOM, Config, isPlayerTeam } from "../../../loaders/global";
import { ioTypes } from "../../../miscFiles/controllers";
import { Entity } from "../../entities/entity";

export class Domination {
    constructor() {
        this.dominatorTypes = ["destroyerDominator", "gunnerDominator", "trapperDominator"];
        this.defineProperties();
    }
    defineProperties() {
        this.teamcounts = {};
        this.won = false;
        this.gameActive = false;
        this.neededToWin = 4;
    }
    spawnDominators(tile, team, color, type = false, colorAsString = false) {
        type = type ? type : choose(this.dominatorTypes);
        const o = new Entity(tile.loc);
        o.define(type);
        o.team = team;
        o.color.base = color;
        o.skill.score = 111069;
        o.name = "Dominator";
        o.SIZE = gameManager.room.tileWidth / 15;
        o.permanentSize = o.SIZE;
        o.isDominator = true;
        o.controllers = [new ioTypes.nearestDifferentMaster(o, {}, gameManager), new ioTypes.spin(o, { onlyWhenIdle: true })];

        tile.color = colorAsString ? `${color}` : color;

        if (!this.teamcounts[team]) {
            this.teamcounts[team] = 0;
        }
        this.teamcounts[team]++;

        o.on("dead", () => {

            this.teamcounts[team]--;
            if (!this.teamcounts[team]) {
                delete this.teamcounts[team];
            }

            let newTeam = TEAM_ENEMIES;
            let newColor = getTeamColor(newTeam);

            if (team === TEAM_ENEMIES) {
                const killers = [];
                for (const instance of o.collisionArray) {
                    if (isPlayerTeam(instance.team) && team !== instance.team) {
                        killers.push(instance);
                    }
                }

                let killer = choose(killers);
                killer = killer ? killer.master.master : { team: TEAM_ROOM, color: Config.mode === "tdm" ? 3 : 12 };

                newTeam = killer.team;
                newColor = getTeamColor(newTeam);

                for (const player of global.gameManager.socketManager.players) {
                    if (player.body && player.body.team === newTeam) {
                        player.body.sendMessage(`Press ${key("ability")} to take control of the dominator.`);
                    }
                }

                const teamName = newTeam > 0 ? killer.name : getTeamName(newTeam);
                global.gameManager.socketManager.broadcast(`A dominator is now controlled by ${teamName}!`);
                if (newTeam !== TEAM_ENEMIES && this.teamcounts[newTeam] >= this.neededToWin && !this.gameWon) {
                    this.gameWon = true;
                    setTimeout(() => {
                        global.gameManager.socketManager.broadcast(`${teamName} has won the game!`);
                    }, 1500);
                    setTimeout(() => {
                        global.gameManager.closeArena();
                    }, 4500);
                }

            } else {
                global.gameManager.socketManager.broadcast("A dominator is being contested!");
            }

            this.spawnDominators(tile, newTeam, newColor, type, true);
            global.gameManager.socketManager.broadcastRoomUpdate(tile.gridLoc.x, tile.gridLoc.y, tile.color);
        });
    }
    start() {
        this.gameActive = true;
        for (const tile of global.gameManager.room.spawnable["Dominators"]) {
            this.spawnDominators(tile, TEAM_ENEMIES, tile.bluePrint.COLOR);
        }
    }
    reset() {
        this.gameActive = false;
        this.defineProperties();
    }
}
