class Activation {
    constructor(body) {
        this.body = body;
        this.active = true;
        this.timer = 15;
    }
    update() {
        if (this.body.skipLife) { return this.active = false; }
        if (this.body.alwaysActive) { return this.active = true; }
        if (this.body.isDead()) { return 0; }
        switch (this.active) {
            case false:
                this.body.removeFromGrid();
                if (this.body.settings.diesAtRange) this.body.kill();
                if (!(this.timer--)) this.active = true; 
                break;
            case true:
                this.body.addToGrid();
                this.timer = 15;
                this.active = this.body.isPlayer || this.body.isBot || global.gameManager.views.some(v => v.check(this.body, 0.6));
                break;
        }
    }
    check() { return this.active };
}

const dirtyCheck = function (p, r) {
    for (let i = 0; i < entitiesToAvoid.length; i++) {
        let e = entitiesToAvoid[i];
        if (Math.abs(p.x - e.x) < r + e.size && Math.abs(p.y - e.y) < r + e.size) return true;
    }
    return false
};

let remapTarget = (i, ref, self) => {
    if (i.target == null || !(i.main || i.alt)) return undefined;
    return {
        x: i.target.x + ref.x - self.x,
        y: i.target.y + ref.y - self.y,
    };
};

let lazyRealSizes = [1, 1, 1];
for (var i = 3; i < 17; i++) {
    // We say that the real size of a 0-gon, 1-gon, 2-gon is one, then push the real sizes of triangles, squares, etc...
    let circum = (2 * Math.PI) / i;
    lazyRealSizes.push(Math.sqrt(circum * (1 / Math.sin(circum))));
}

lazyRealSizes = new Proxy(lazyRealSizes, {
    get: function(arr, i) {
        if (!(i in arr) && !isNaN(i)) {
            let circum = (2 * Math.PI) / i;
            arr[i] = Math.sqrt(circum * (1 / Math.sin(circum)));
        }
        return arr[i];
    }
});

module.exports = { dirtyCheck, remapTarget, lazyRealSizes, Activation }