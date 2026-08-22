let calculatePoints = wave => 5 + wave * 3;
// Each wave has a certain amount of "points" that it can spend on bosses, calculated above.
// Each boss costs an amount of points.
// It will always buy as many bosses until it has no points or else can't spend them.
// It picks a boss to buy by filtering the list of boss choices by if they are affordable.
// Then it picks a boss at random, with all choices being equally likely.

let oldGroups = {
    elites: [ "eliteDestroyer", "eliteGunner", "eliteSprayer", "eliteBattleship", "eliteSpawner", "sprayerLegion" ],
    deltas: [ "deltaDestroyer", "deltaGunner", "deltaSprayer", "deltaBattleship" ],
    mysticals: [ "summoner", "eliteSkimmer", "nestKeeper", "roguePalisade" ],
    celestials: [ "paladin", "freyja", "zaphkiel", "nyx", "theia" ],
    eternals: [ "legionaryCrasher", "kronos", "odin" ],
};

class Siege {
    constructor() {
        this.room = global.gameManager.room;
        this.waveCodes = [
            ran.chooseN(oldGroups.elites, 1),
            ran.chooseN(oldGroups.elites, 2),
            ran.chooseN(oldGroups.elites, 3),
            ran.chooseN(oldGroups.elites, 4),
            ran.chooseN(oldGroups.elites, 3).concat(ran.chooseN(oldGroups.mysticals, 1)),
            ran.chooseN(oldGroups.elites, 2).concat(ran.chooseN(oldGroups.mysticals, 2)),
            ran.chooseN(oldGroups.elites, 1).concat(ran.chooseN(oldGroups.mysticals, 3)),
            ran.chooseN(oldGroups.mysticals, 4),
            ran.chooseN(oldGroups.elites, 1).concat(ran.chooseN(oldGroups.mysticals, 4)),
            ran.chooseN(oldGroups.elites, 2).concat(ran.chooseN(oldGroups.mysticals, 4)),
            ran.chooseN(oldGroups.elites, 3).concat(ran.chooseN(oldGroups.mysticals, 4)),
            ran.chooseN(oldGroups.elites, 4).concat(ran.chooseN(oldGroups.mysticals, 4)),
            [ oldGroups.celestials[0] ],
            [ oldGroups.celestials[1] ],
            [ oldGroups.celestials[2] ],
            [ oldGroups.celestials[3] ],
            [ oldGroups.celestials[4] ],
            ran.chooseN(oldGroups.elites, 1).concat(ran.chooseN(oldGroups.mysticals, 1)).concat(ran.chooseN(oldGroups.celestials, 1)),
            ran.chooseN(oldGroups.elites, 3).concat(ran.chooseN(oldGroups.mysticals, 1)).concat(ran.chooseN(oldGroups.celestials, 1)),
            ran.chooseN(oldGroups.elites, 3).concat(ran.chooseN(oldGroups.mysticals, 3)).concat(ran.chooseN(oldGroups.celestials, 1)),
            ran.chooseN(oldGroups.elites, 4).concat(ran.chooseN(oldGroups.mysticals, 4)).concat(ran.chooseN(oldGroups.celestials, 1)),
            ran.chooseN(oldGroups.celestials, 2),
            ran.chooseN(oldGroups.elites, 1).concat(ran.chooseN(oldGroups.mysticals, 2)).concat(ran.chooseN(oldGroups.celestials, 2)),
            ran.chooseN(oldGroups.elites, 3).concat(ran.chooseN(oldGroups.mysticals, 3)).concat(ran.chooseN(oldGroups.celestials, 2)),
            ran.chooseN(oldGroups.elites, 4).concat(ran.chooseN(oldGroups.mysticals, 4)).concat(ran.chooseN(oldGroups.celestials, 2)),
            ran.chooseN(oldGroups.celestials, 3),
            ran.chooseN(oldGroups.elites, 3).concat(ran.chooseN(oldGroups.mysticals, 3)).concat(ran.chooseN(oldGroups.celestials, 3)),
            ran.chooseN(oldGroups.elites, 4).concat(ran.chooseN(oldGroups.mysticals, 4)).concat(ran.chooseN(oldGroups.celestials, 3)),
            ran.chooseN(oldGroups.celestials, 4),
            ran.chooseN(oldGroups.elites, 2).concat(ran.chooseN(oldGroups.mysticals, 2)).concat(ran.chooseN(oldGroups.celestials, 4)),
            ran.chooseN(oldGroups.elites, 4).concat(ran.chooseN(oldGroups.mysticals, 4)).concat(ran.chooseN(oldGroups.celestials, 4)),
            ran.chooseN(oldGroups.celestials, 5),
            ran.chooseN(oldGroups.elites, 4).concat(ran.chooseN(oldGroups.mysticals, 4)).concat(ran.chooseN(oldGroups.celestials, 5)),
            ran.chooseN(oldGroups.eternals, 1),
        ];
        this.bossChoices = [
            // [ cost , definition reference ],

            //mysticals
            [  5, "sorcerer"],
            [  5, "summoner"],
            [  5, "enchantress"],
            [  5, "exorcistor"],
            [  5, "shaman"],
            [  5, "witch"],

            //elites
            [  1, "eliteDestroyer"],
            [  1, "eliteGunner"],
            [  1, "eliteSprayer"],
            [  5, "eliteBattleship"],
            [  5, "eliteSpawner"],
            [  5, "eliteTrapGuard"],
            [  5, "eliteSpinner"],
            [  5, "eliteSkimmer"],

            //nesters
            [  4, "nestKeeper"],
            [  4, "nestWarden"],
            [  4, "nestGuardian"],

            //terrestrials
            [ 25, "ares"],
            [ 25, "gersemi"],
            [ 25, "ezekiel"],
            [ 25, "eris"],
            [ 25, "selene"],

            //celestials
            [ 50, "paladin"],
            [ 50, "freyja"],
            [ 50, "zaphkiel"],
            [ 50, "nyx"],
            [ 50, "theia"],
            [ 50, "atlas"],
            [ 50, "hera"],
            [ 50, "horus"],
            [ 50, "anubis"],
            [ 50, "isis"],
            [ 50, "tethys"],
            [ 50, "ullr"],
            [ 50, "dellingr"],
            [ 50, "osiris"],
            [ 50, "alcis"],
            [ 50, "khonsu"],
            [ 50, "hyperion"],
            [ 50, "nephthys"],
            [ 50, "tyr"],
            [ 50, "vor"],
            [ 50, "aether"],
            [ 50, "iapetus"],
            [ 50, "baldr"],
            [ 50, "eros"],
            [ 50, "hjordis"],
            [ 50, "sif"],
            [ 50, "freyr"],
            [ 50, "styx"],
            [ 50, "apollo"],
            [ 50, "ptah"],

            //eternals
            [100, "legionaryCrasherFix"], // fucking mid
            [100, "kronos"],
            [100, "odin"],
            [100, "amun"],
        ];
        this.friendlyBossChoices = ["roguePalisade", "rogueArmada", "julius", "genghis", "napoleon"];
        this.bigFodderChoices = ["sentryGun", "sentrySwarm", "sentryTrap"];
        this.smallFodderChoices = ["crasher"];
        this.sentinelChoices = ["sentinelMinigun", "sentinelLauncher", "sentinelCrossbow"];
        this.defineProperties();
    }
    defineProperties() {
        this.length = Config.use_limited_waves ? this.waveCodes.length : Config.wave_cap;
        this.waves = this.generateWaves();
        this.waveId = -1;
        this.gameActive = false;
        this.timer = 0;
        this.remainingEnemies = 0;
        this.sanctuaryTier = 1;
        this.sanctuaries = [];
        this.leftSanctuaries = 0;
    }
    generateWaves() {
        let waves = [];
        for (let i = 0; i < this.length; i++) {
            let wave = [],
                points = calculatePoints(i),
                choices = this.bossChoices;

            while (points > 0 && choices.length) {
                choices = choices.filter(([ cost ]) => cost <= points);
                let [ cost, boss ] = ran.choose(choices);
                points -= cost;
                wave.push(boss);
            }

            waves.push(Config.use_limited_waves ? this.waveCodes[i] : wave);
        }
        return waves;
    }

    spawnSanctuary(tile, team, type = false, addToSanctuaryList = true) {
        type = type ? type : "sanctuaryTier3";
        let o = new Entity(tile.loc);
        o.team = team;
        this.defineSanctuary(o, type, o.team === TEAM_ENEMIES ? "DESTROYED" : false);
        if (addToSanctuaryList) this.sanctuaries.push(o);
        o.on('dead', () => {
            if (o.team === TEAM_ENEMIES) {
                // Allow the player to spawn so we add it to the spawnable locations.
                this.room.spawnable[TEAM_BLUE].push(tile);
                this.spawnSanctuary(tile, TEAM_BLUE, `sanctuaryTier${this.sanctuaryTier}`);
                tile.color = "blue";
                if (this.leftSanctuaries == 0) global.gameManager.socketManager.broadcast('You can now respawn.');
                this.leftSanctuaries++;
                global.gameManager.socketManager.broadcast('A sanctuary has been restored!');
            } else {
                // Don't allow players to spawn at the destroyed sanctuary so we remove it from spawnable location.
                if (this.gameActive) util.remove(this.room.spawnable[TEAM_BLUE], this.room.spawnable[TEAM_BLUE].indexOf(tile));
                util.remove(this.sanctuaries, this.sanctuaries.indexOf(o));
                let newTeam = TEAM_ENEMIES;
                this.spawnSanctuary(tile, newTeam, "dominator", false);
                tile.color = "yellow";
                this.leftSanctuaries--;
                global.gameManager.socketManager.broadcast('A sanctuary has been destroyed!');
                if (this.leftSanctuaries == 0) {
                    global.cannotRespawn = true;
                    let timeRemaining = 61; // 1 minute
                    global.gameManager.socketManager.broadcast('All of the sanctuaries are destroyed. You cannot respawn.');
                    let loop = setInterval(() => {
                        if (this.leftSanctuaries !== 0) global.cannotRespawn = false, clearInterval(loop);
                        timeRemaining--;
                        if (timeRemaining == 0) {
                            this.playerLose();
                            clearInterval(loop);
                        } else if (
                            timeRemaining % 10 == 0 ||
                            timeRemaining == 5 ||
                            timeRemaining == 3 ||
                            timeRemaining == 2 ||
                            timeRemaining == 1
                        ) {
                            global.gameManager.socketManager.broadcast(
                                `Your team will lose in ${timeRemaining} Secon${timeRemaining == 1 ? "d" : "ds"}.`,
                            );
                        }
                    }, 1000) // 1 Second.
                }
            }
            global.gameManager.socketManager.broadcastRoom();
        });
    }

    defineSanctuary(entity, type, customName = false) {
        entity.define(type);
        entity.color.base = customName && customName === "DESTROYED" ? "grey" : getTeamColor(entity.team);
        entity.skill.score = 111069;
        entity.name = `${customName ? customName : getTeamName(entity.team)} Sanctuary`;
        entity.SIZE = this.room.tileWidth / Config.sanctuary_size ?? 13.5;
        entity.isDominator = true;
        entity.displayName = true;
        entity.nameColor = "#ffffff";
        entity.define({ DANGER: 11 });
    }

    playerWin() {
        if (this.gameActive) {
            this.gameActive = false;
            global.gameManager.socketManager.broadcast('Your team has won the game!');
            setTimeout(() => {global.gameManager.closeArena()}, 1500);
        }
    }
    bossWin() {
        global.gameManager.socketManager.broadcast('Team boss has won the game!');
        setTimeout(() => {global.gameManager.closeArena()}, 1500);
    }
    playerLose() {
        if (this.gameActive) {
            this.gameActive = false;
            global.gameManager.socketManager.broadcast("Your team has lost the game.");
            setTimeout(() => {this.bossWin()}, 3000);
        }
    }

    spawnEnemyWrapper(loc, type) {
        let enemy = new Entity(loc);
        enemy.define(type);
        enemy.team = TEAM_ENEMIES;
        enemy.FOV = 30;
        enemy.refreshSkills();
        enemy.refreshBodyAttributes();
        enemy.isBoss = true;
        if (Config.fortress || Config.citadel) enemy.controllers.push(new ioTypes.siegeAI(enemy, {}, global.gameManager));
        this.remainingEnemies++;
        enemy.on('dead', () => {
            //this enemy has been killed, decrease the remainingEnemies counter
            //if afterwards the counter happens to be 0, announce that the wave has been defeated
            if (!this.gameActive) return;
            if (!--this.remainingEnemies) {
                global.gameManager.socketManager.broadcast(`Wave ${this.waveId + 1} has been defeated!`);
                global.gameManager.socketManager.broadcast(`The next wave will start shortly.`);
            }
        });
        return enemy;
    }

    spawnWave(waveId) {
        //yell at everyone
        global.gameManager.socketManager.broadcast(`Wave ${waveId + 1} has started!`);
        util.log(`Wave ${waveId + 1} has started!`)

        //spawn bosses
        for (let boss of this.waves[waveId]) {
            let spot = ran.choose(global.gameManager.room.spawnable["bossSpawnTile"]).randomInside();

            let enemy = this.spawnEnemyWrapper(spot, boss);
            enemy.define({ DANGER: 25 + enemy.SIZE / 5 });
        }

        if (!Config.use_limited_waves) {
            //spawn fodder enemies
            for (let i = 0; i < this.waveId / 5; i++) {
                this.spawnEnemyWrapper(ran.choose(global.gameManager.room.spawnable["bossSpawnTile"]).randomInside(), ran.choose(this.sentinelChoices));
            }
            for (let i = 0; i < this.waveId / 2; i++) {
                this.spawnEnemyWrapper(ran.choose(global.gameManager.room.spawnable["bossSpawnTile"]).randomInside(), ran.choose(this.smallFodderChoices));
            }
        }

        // Update sanctuary tiers
        let newSancTier = Math.min(Math.floor(this.waveId / 5) + 1, 6);
        if (newSancTier != this.sanctuaryTier) {
            for (let sanc of this.sanctuaries) {
                this.defineSanctuary(sanc, `sanctuaryTier${newSancTier}`);
            }
            global.gameManager.socketManager.broadcast(`The sanctuaries have been upgraded to Tier ${newSancTier}`);
            this.sanctuaryTier = newSancTier;
        }
    }

    // runs once when the server starts
    start(mazeType) {
        this.gameActive = true;
        for (let tile of this.room.spawnable[TEAM_BLUE]) {
            tile.color = tile.bluePrint.COLOR;
            this.leftSanctuaries += 1;
            this.spawnSanctuary(tile, TEAM_BLUE, "sanctuaryTier1");
        }
        // Spawn maze if we want to.
        if (mazeType) {
            let mazeGenerator = new global.mazeGenerator.MazeGenerator(mazeType);
            let { squares, width, height } = mazeGenerator.placeMinimal();
            squares.forEach(element => {
                let wall = new Entity({
                    x: global.gameManager.room.width / width * element.x - global.gameManager.room.width / 2 + global.gameManager.room.width / width / 2 * element.size, 
                    y: global.gameManager.room.height / height * element.y - global.gameManager.room.height / 2 + global.gameManager.room.height / height / 2 * element.size
                })
                wall.define("wall");
                wall.SIZE = global.gameManager.room.width / width / 2 * element.size / lazyRealSizes[4] * Math.SQRT2 - 2;
                wall.life();
                wall.protect();
                makeHitbox(wall);
                walls.push(wall);
                if (Config.spooky_theme) {
                    let eyeSize = 12 * (Math.random() + 0.45);
                    let spookyEye = new Entity({ x: wall.x + (wall.size - eyeSize * 2) * Math.random() - wall.size / 2, y: wall.y + (wall.size - eyeSize * 2) * Math.random() - wall.size / 2 })
                    spookyEye.define("hwEye");
                    spookyEye.define({FACING_TYPE: ["manual", {angle: ran.randomAngle()}]})
                    spookyEye.SIZE = eyeSize;
                    spookyEye.minimapColor = 18;
                }
            });
        }
    }

    reset() {
        this.defineProperties();
    }
    
    redefine(theshit) {
        this.room = theshit.room;
        this.defineProperties();
    }

    // runs every second
    loop() {
        // If the game isnt active, then dont run the rest of the code.
        if (global.gameManager.arenaClosed) this.gameActive = false;
        if (!this.gameActive) return;
        //the timer has ran out? reset timer and spawn the next wave
        if (this.timer <= 0) {
            this.timer = 3; // 5 seconds
            this.waveId++;
            if (this.waves[this.waveId]) {
                this.spawnWave(this.waveId);

            //if there is no next wave then simply let the players win
            } else {
                this.playerWin();
            }

        //if the timer has not ran out and there arent any remaining enemies left, decrease the timer
        } else if (!this.remainingEnemies) {
            this.timer--;
        }
    }
}

module.exports = { Siege };