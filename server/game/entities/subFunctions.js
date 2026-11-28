import { entitiesToAvoid } from "../../loaders/global";

export class Activation {
    constructor(body) {
        this.body = body;
        this.active = true;
        this.timer = 15;
    }
    update() {
        if (this.body.skipLife) {
            return this.active = false;
        }
        if (this.body.alwaysActive) {
            return this.active = true;
        }
        if (this.body.isDead()) {
            return 0;
        }
        if (this.active) {
            this.body.addToGrid();
            this.timer = 15;
            this.active = this.body.isPlayer || this.body.isBot || global.gameManager.views.some((v) => v.check(this.body, 0.6));
            return;
        }

        this.body.removeFromGrid();
        if (this.body.settings.diesAtRange) {
            this.body.kill();
        }
        if (!(this.timer--)) {
            this.active = true;
        }
    }
    check() {
        return this.active;
    };
}

export function dirtyCheck(p, r) {
    for (let i = 0; i < entitiesToAvoid.length; i++) {
        const e = entitiesToAvoid[i];
        if (Math.abs(p.x - e.x) < r + e.size && Math.abs(p.y - e.y) < r + e.size) {
            return true;
        }
    }
    return false;
};

export function remapTarget(i, ref, self) {
    if (i.target == null || !(i.main || i.alt)) {
        return undefined;
    }
    return {
        x: i.target.x + ref.x - self.x,
        y: i.target.y + ref.y - self.y
    };
};

// We say that the real size of a 0-gon, 1-gon, 2-gon is one, then add the real sizes of triangles, squares, etc...
const realSizesCache = new Map([
    [0, 1],
    [1, 1],
    [2, 1]
]);

for (var i = 3; i < 17; i++) {
    const circum = (2 * Math.PI) / i;
    realSizesCache.set(i, Math.sqrt(circum * (1 / Math.sin(circum))));
}

export function getRealSizeLazy(i) {
    let realSize = realSizesCache.get(i);

    if (realSize === undefined) {
        const circum = (2 * Math.PI) / i;
        realSize = Math.sqrt(circum * (1 / Math.sin(circum)));
        realSizesCache.set(i, realSize);
    }

    return realSize;
}
