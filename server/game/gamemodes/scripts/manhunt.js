class Manhunt {
    constructor() {
        this.leader = null;
        this.tick = 0;
    }
    loop() {
        if (++this.tick % 8) return;
        let top = null, topScore = -Infinity, second = -Infinity;
        for (let o of entities.values()) {
            if (!(o.isPlayer || o.isBot) || o.isDead() || o.isGhost || o.isBoss || o.type === "miniboss") continue;
            let score = o.skill.score;
            if (score > topScore) {
                second = topScore;
                topScore = score;
                top = o;
            } else if (score > second) second = score;
        }
        let leader = topScore > second ? top : null;
        if (leader !== this.leader) {
            if (this.leader && !this.leader.isGhost) this.crown(this.leader, false);
            this.leader = leader;
            if (leader) this.crown(leader, true);
        }
        if (leader) {
            let caps = leader.skill.caps.reduce((a, b) => a + b, 0),
                invested = leader.skill.raw.reduce((a, b) => a + b, 0);
            if (leader.skill.points < caps - invested) leader.skill.points = caps - invested;
        }
    }
    crown(o, on) {
        if (on) {
            o.manhuntWorn = o.color.base;
            o.color.base = "green";
            o.manhuntGreen = true;
        } else {
            if (o.manhuntGreen) o.color.base = o.manhuntWorn;
            o.manhuntGreen = false;
        }
    }
}

module.exports = { Manhunt };
