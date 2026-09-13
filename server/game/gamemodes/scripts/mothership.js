class Mothership {
    constructor() {
        if (Config.thanksgiving) {
            this.choices = ["turkey"];
        } else if (Config.arms_race) {
            this.choices = ["flagship"];
        } else {
            this.choices = ["mothership"];
        }
        this.defineProperties();
        Config.mothership_data = {
            getData: () => this.globalMotherships
        }
    };
    defineProperties() {
        this.motherships = [];
        this.globalMotherships = [];
        this.teamWon = false;
        global.defeatedTeams = [];
    };

    start() {
        this.spawn();
    }

    spawn() {
        let locs = [{
            x: global.gameManager.room.width * 0.1 - global.gameManager.room.width / 2,
            y: global.gameManager.room.height * 0.1 - global.gameManager.room.height / 2
        }, {
            x: global.gameManager.room.width * 0.9 - global.gameManager.room.width / 2,
            y: global.gameManager.room.height * 0.9 - global.gameManager.room.height / 2
        }, {
            x: global.gameManager.room.width * 0.9 - global.gameManager.room.width / 2,
            y: global.gameManager.room.height * 0.1 - global.gameManager.room.height / 2
        }, {
            x: global.gameManager.room.width * 0.1 - global.gameManager.room.width / 2,
            y: global.gameManager.room.height * 0.9 - global.gameManager.room.height / 2
        }, {
            x: global.gameManager.room.width * 0.9 - global.gameManager.room.width / 2,
            y: global.gameManager.room.height * 0.5 - global.gameManager.room.height / 2
        }, {
            x: global.gameManager.room.width * 0.1 - global.gameManager.room.width / 2,
            y: global.gameManager.room.height * 0.5 - global.gameManager.room.height / 2
        }, {
            x: global.gameManager.room.width * 0.5 - global.gameManager.room.width / 2,
            y: global.gameManager.room.height * 0.9 - global.gameManager.room.height / 2
        }, {
            x: global.gameManager.room.width * 0.5 - global.gameManager.room.width / 2,
            y: global.gameManager.room.height * 0.1 - global.gameManager.room.height / 2
        }].sort(() => 0.5 - Math.random());
        for (let i = 0; i < Config.teams; i++) {
            let o = new Entity(locs[i]),
                team = -i - 1;
            o.define(ran.choose(this.choices));
            o.define({ ACCEPTS_SCORE: false, VALUE: 643890 });
            o.color.base = getTeamColor(team);
            o.team = team;
            if (Config.thanksgiving) {
                o.name = "Turkey";
            } else if (Config.arms_race) {
                o.name = "Flagship";
            } else {
                o.name = "Mothership";
            }
            o.isMothership = true;
            o.controllers.push(new ioTypes.nearestDifferentMaster(o, {}, global.gameManager), new ioTypes.mapTargetToGoal(o));
            o.refreshBodyAttributes();
            this.motherships.push([o.id, team]);
            this.globalMotherships.push(o);
            o.on("dead", () => {
                this.death(o, team);
            })
        }
    };

    death(entity, team) {
        global.gameManager.socketManager.broadcast(getTeamName(team) + "'s mothership has been killed!");
        if (global.gameManager.arenaClosed) return;
        global.defeatedTeams.push(team);
        let newTeam = getWeakestTeam(global.gameManager);
        for (let e of entities.values()) {
            if (e.team == team && e.isPlayer) {
                e.sendMessage("Your team has been eliminated.");
                e.socket.rememberedTeam = newTeam;
            }
            if (e.team == team) {
                e.godmode = false;
                e.kill();
            }
        }
    };

    winner(teamId) {
        global.gameManager.socketManager.broadcast(getTeamName(teamId) + " has won the game!");
        setTimeout(() => {
            global.gameManager.closeArena() 
        }, 3000);
    };

    loop() {
        if (this.teamWon) return;
        let aliveNow = this.motherships.map(([id, data]) => {
            const entity = entities.get(id);
            return [id, data, entity];
        });
        aliveNow = aliveNow.filter(entry => {
            if (!entry[2] || entry[2].isDead()) return false;
            return true;
        });
        if (aliveNow.length === 1) {
            this.teamWon = true;
            setTimeout(() => {
                this.winner(aliveNow[0][1]) 
            }, 2500);
        }
        this.motherships = aliveNow;
    };

    reset() {
        this.defineProperties();
    };
}

module.exports = { Mothership };