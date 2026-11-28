import { averageArray, sumArray } from "../../lib/util";

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
        const average = averageArray(this.logTimes);
        const sum = sumArray(this.logTimes);
        this.logTimes = [];
        return { sum: sum, average: average };
    }
    sum() {
        const sum = sumArray(this.logTimes);
        this.logTimes = [];
        return sum;
    }
    tally() {
        this.tallyCount++;
    }
    getTallyCount() {
        const tally = this.tallyCount;
        this.tallyCount = 0;
        return tally;
    }
}

const entities = new Logger();
const update = new Logger();
const collide = new Logger();
const network = new Logger();
const minimap = new Logger();
const misc2 = new Logger();
const misc3 = new Logger();
const physics = new Logger();
const life = new Logger();
const though = new Logger();
const selfie = new Logger();
const master = new Logger();
const activation = new Logger();
const loops = new Logger();
const gamemodeLoop = new Logger();
const lagtesting = new Logger();

export {
    entities,
    update,
    collide,
    network,
    minimap,
    misc2,
    misc3,
    physics,
    life,
    though,
    selfie,
    master,
    activation,
    loops,
    gamemodeLoop,
    lagtesting
};
