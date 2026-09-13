class antiNaN {
    constructor(me) {
        this.me = me;
        this.nansInARow = 0;
        this.data = { x: 1, y: 1, vx: 0, vy: 0, ax: 0, ay: 0 };
        this.amNaN = me => [me.x, me.y, me.velocity.x, me.velocity.y, me.accel.x, me.accel.y].some(isNaN);
    }
    update() {
        if (this.amNaN(this.me)) {
            this.nansInARow++;
            if (this.nansInARow > 50) {
                console.log(`${this.me.name == "" ? "Unknown Entity" : this.me.name} (${this.me.label}) Has been killed due to NaNs.`);
                this.me.kill();
            }
            this.me.x = this.data.x;
            this.me.y = this.data.y;
            this.me.velocity.x = this.data.vx;
            this.me.velocity.y = this.data.vy;
            this.me.accel.x = this.data.ax;
            this.me.accel.y = this.data.ay;
        } else {
            this.data.x = this.me.x;
            this.data.y = this.me.y;
            this.data.vx = this.me.velocity.x;
            this.data.vy = this.me.velocity.y;
            this.data.ax = this.me.accel.x;
            this.data.ay = this.me.accel.y;
            if (this.nansInARow > 0) this.nansInARow--;
        }
    }
}

module.exports = { antiNaN };