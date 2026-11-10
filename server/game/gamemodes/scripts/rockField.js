class RockField {
    start() {
        let field = Config.rock_field;
        if (!field) return;
        let room = global.gameManager.room,
            halfX = room.width / 2,
            halfY = room.height / 2,
            tileW = room.width / field.across,
            tileH = room.height / field.across,
            on = field.tiles.filter(tile => tile[2] >= 1 || Math.random() < tile[2]),
            usual = field.tiles.reduce((sum, tile) => sum + tile[2], 0),
            mean = (field.count[0] + field.count[1]) / 2,
            spread = field.count[1] - field.count[0],
            wanted = Math.round(mean * on.length / Math.max(1, usual)) + (usual === field.tiles.length && spread > 0 ? Math.floor(Math.random() * (spread + 1)) - Math.floor(spread / 2) : 0),
            kinds = this.deal(wanted, field.deal),
            placed = [];
        if (!on.length) return;
        for (let attempt = 0; placed.length < wanted && attempt < wanted * 200; attempt++) {
            let tile = on[Math.floor(Math.random() * on.length)],
                kind = kinds[placed.length],
                size = field.sizes[kind] * (1 - field.variation / 2 + Math.random() * field.variation),
                x = Math.max(-halfX + size, Math.min(halfX - size, -halfX + (tile[0] + Math.random()) * tileW)),
                y = Math.max(-halfY + size, Math.min(halfY - size, -halfY + (tile[1] + Math.random()) * tileH));
            if (placed.some(rock => (rock.x - x) ** 2 + (rock.y - y) ** 2 < (10 + size + rock.size) ** 2)) continue;
            placed.push({ x, y, size });
            let o = new Entity({ x, y });
            o.define(kind);
            o.team = TEAM_ENEMIES;
            o.facing = ran.randomAngle();
            o.SIZE = size;
            o.coreSize = size;
            o.protect();
            o.life();
        }
    }
    deal(count, shares) {
        let order = ["gravel", "stone", "rock"],
            weights = order.map(kind => shares[kind] ?? 0),
            total = weights.reduce((a, b) => a + b, 0),
            exact = weights.map(weight => count * weight / total),
            counts = exact.map(Math.floor),
            byRest = [0, 1, 2].filter(i => weights[i] > 0).sort((a, b) => (exact[b] - counts[b]) - (exact[a] - counts[a]) || a - b),
            out = [];
        for (let left = count - counts[0] - counts[1] - counts[2], i = 0; left > 0; left--, i = (i + 1) % byRest.length) counts[byRest[i]]++;
        for (let i = 0; i < 3; i++) for (let k = 0; k < counts[i]; k++) out.push(order[i]);
        for (let i = out.length - 1; i > 0; i--) {
            let j = Math.floor(Math.random() * (i + 1));
            [out[i], out[j]] = [out[j], out[i]];
        }
        return out;
    }
}

module.exports = { RockField };
