class Outbreak {
    constructor() {
        this.gameActive = false;
        Config.OURBREAK_FUNCTIONS = {
            zombify: (o) => {
                this.zombify(o);
            }
        }
    }
    zombify(liveEntity) {
        if (!liveEntity.defs) {
            liveEntity.destroy();
            return;
        }
        if (liveEntity.defs[0].BODY || liveEntity.defs[0].DANGER || !liveEntity.defs[0].DANGER === 0) {
            liveEntity.destroy();
            return;
        }
        if (liveEntity.defs[0] == "bot") liveEntity.defs = liveEntity.defs[1];
        let zombieEntity = new Entity({ x: liveEntity.x, y: liveEntity.y });
        zombieEntity.define(liveEntity.defs);
        zombieEntity.define({ AI: { CHASE: true }, FACING_TYPE: ["manual", {angle: liveEntity.facing}] });
        zombieEntity.color.base = "grey";
        zombieEntity.skill = liveEntity.skill;
        zombieEntity.name = liveEntity.name;
        zombieEntity.invuln = true;
        zombieEntity.godmode = true;
        zombieEntity.refreshBodyAttributes();
        zombieEntity.refreshSkills();
        zombieEntity.team = -45;
        zombieEntity.minimapColor = "green";
        zombieEntity.zombified = true;
        setTimeout(() => {
            let Class = ensureIsClass(liveEntity.defs[0]);
            zombieEntity.controllers.push(new ioTypes.nearestDifferentMaster(zombieEntity, {}, global.gameManager), new ioTypes.mapTargetToGoal(zombieEntity, {}, global.gameManager));
            zombieEntity.godmode = false;
            zombieEntity.invuln = false;
            zombieEntity.color.base = "green";
            zombieEntity.define({ FACING_TYPE: Class.FACING_TYPE != null ? Class.FACING_TYPE : "looseToTarget" });
        }, 1000)
    }
    start() { this.gameActive = true; };
}

module.exports = { Outbreak };