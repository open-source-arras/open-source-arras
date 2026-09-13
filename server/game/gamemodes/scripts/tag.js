class Tag {
    constructor() {
        this.won = false;
        this.canStart = false;
        this.teams = null;
        Config.tag_data = {
            getData: () => this.teams,
            initAndStart: () => {
                this.canStart = true;
            },
            resetAndStop: () => {
                this.canStart = false;
                this.won = false;
                this.teams = Array(Config.teams).fill(0);
            },
            redefineTeams: () => {
                this.teams = Array(Config.teams).fill(0); 
            },
            addToTeam: (team) => {
                this.teams[team - 1]++;
                this.checkWin();
            },
            removeFromTeam: (team) => {
                this.teams[team - 1]--;
                this.checkWin();
            },
            addPlayer: entity => {
                let team = -entity.team;
                Config.tag_data.addToTeam(team);
                entity.on("dead", ({ killers }) => {
                    Config.tag_data.removeFromTeam(team);
                    let players = killers.filter(entity => entity.isPlayer || entity.isBot);
                    if (players.length) entity.socket.rememberedTeam = players[0].team;
                });
            },
            addBot: entity => {
                let team = -entity.team;
                Config.tag_data.addToTeam(team);
                entity.on("dead", ({ killers }) => {
                    Config.tag_data.removeFromTeam(team);
                    let killer = killers.filter(entity => entity.isPlayer || entity.isBot);
                    if (killer.length) global.nextTagBotTeam = killer[0].team;
                });
            }
        }
    }
    checkWin() {
        if (this.won || !this.canStart || !global.gameManager.clients.length) return;
        let bestTeam = -1;
        for (let i = 0; i < this.teams.length; i++) {
            if (this.teams[i] > (this.teams[bestTeam] || -1)) {
                bestTeam = i;
            }
        }
        if (!this.teams.every((team, i) => i === bestTeam || team === 0) || this.teams[bestTeam] < 5) return;
        this.won = true;
        global.gameManager.socketManager.broadcast(
            `${
                ["BLUE", "GREEN", "RED", "PURPLE", "YELLOW", "ORANGE", "BROWN", "CYAN"][
                    bestTeam
                ]
            } has won the game!`
        );
        setTimeout(() => {
            global.gameManager.closeArena();
        }, 3e3);
    }
    redefine(theshit) {
        Config.tag_data.redefineTeams();
    }
}

module.exports = { Tag };