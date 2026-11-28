// Thanks to Damocles
// https://discord.com/channels/366661839620407297/508125275675164673/1114907447195349074

import { clamp } from "../../../lib/util";
import { entities } from "../../../loaders/global";

export class Train {
    loop() {
        const train_able = [];
        for (const instance of entities.values()) {
            if (instance.isPlayer || instance.isBot) {
                train_able.push(instance);
            }
        }
        const teams = new Set(train_able.map((r) => r.team));
        for (const team of teams) {
            const train = train_able.filter((r) => r.team === team).sort((a, b) => b.skill.score - a.skill.score);

            for (const [i, player] of train.entries()) {
                if (i === 0) {
                    continue;
                }

                player.velocity.x = clamp(train[i - 1].x - player.x, -90, 90) * player.damp * 1.35;
                player.velocity.y = clamp(train[i - 1].y - player.y, -90, 90) * player.damp * 1.35;
            }
        }
    }
}
