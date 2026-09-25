// Thanks to Damocles
// https://discord.com/channels/366661839620407297/508125275675164673/1114907447195349074

class Train {
    constructor () {}
    loop () {
        let train_able = [];
            for (let instance of entities.values()) if (instance.isPlayer || instance.isBot) train_able.push(instance);
            let teams = new Set(train_able.map(r => r.team));
        for (let team of teams) {
            let train = train_able.filter(r => r.team === team).sort((a, b) => b.skill.score - a.skill.score);

            for (let [i, player] of train.entries()) {
                if (i === 0) continue;

                player.velocity.x = util.clamp(train[i - 1].x - player.x, -90, 90) * player.damp * 1.35;
                player.velocity.y = util.clamp(train[i - 1].y - player.y, -90, 90) * player.damp * 1.35;
            }
        }
    }
}

module.exports = { Train };