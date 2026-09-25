class Logger {
    constructor() {
        this.logTimes = [];
        this.trackingStart = performance.now();
        this.tallyCount = 0;
    }
    set() {
        this.trackingStart = performance.now();
    }
    mark() {
        this.logTimes.push(performance.now() - this.trackingStart);
    }
    record() {
        let average = util.averageArray(this.logTimes);
        let sum = util.sumArray(this.logTimes);
        this.logTimes = [];
        return { sum: sum, average: average };
    }
    sum() {
        let sum = util.sumArray(this.logTimes);
        this.logTimes = [];
        return sum;
    }
    tally() {
        this.tallyCount++;
    }
    getTallyCount() {
        let tally = this.tallyCount;
        this.tallyCount = 0;
        return tally;
    }
}

let logs = {
    entities: new Logger(),
    update: new Logger(),
    collide: new Logger(),
    network: new Logger(),
    minimap: new Logger(),
    misc2: new Logger(),
    misc3: new Logger(),
    physics: new Logger(),
    life: new Logger(),
    though: new Logger(),
    selfie: new Logger(),
    master: new Logger(),
    activation: new Logger(),
    loops: new Logger(),
    gamemodeLoop: new Logger(),
    lagtesting: new Logger(),
};

module.exports = { logs };