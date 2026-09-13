class Sandbox {
    constructor() {
        this.clients = gameManager.clients;
    }
    update() {
        if (this.length < this.clients.length) {
            this.length = this.clients.length;
            this.xgrid += 20;
            this.ygrid += 20;
        } else if (this.length > this.clients.length) {
            this.length = this.clients.length;
            this.xgrid -= 20;
            this.ygrid -= 20;
        }
        if (!global.gameManager.room.settings.sandbox.do_not_change_arena_size) global.gameManager.updateBounds(this.xgrid * 30, this.ygrid * 30)
    }
    redefine(theshit) {
        this.clients = theshit.clients;
        this.xgrid = theshit.room.xgrid;
        this.ygrid = theshit.room.ygrid;
        this.length = 0;
    }
}

module.exports = { Sandbox };