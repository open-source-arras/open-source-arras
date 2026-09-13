class LagLogger {
    constructor() {
        this.startTime = 0;
        this.endTime = 0;
        this.totalTime = 0;
        this.history = [];
    }
    set() {
        this.startTime = new Date().getTime();
    }
    mark() {
        this.endTime = new Date().getTime();
        this.totalTime = this.endTime - this.startTime;
        this.history.push({
            at: new Date(),
            time: this.totalTime
        });
        if (this.history.length > 10) this.history.shift();
    }
    get sum() {
        return this.history;
    }
}

module.exports = { LagLogger };