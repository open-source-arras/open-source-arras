class HealthType {
    constructor(health, type, resist = 0) {
        this.max = health;
        this.amount = health;
        this.type = type;
        this.resist = resist;
        this.regen = 0;
    }
    set(health, regen = 0) {
        this.amount = this.max ? (this.amount / this.max) * health : health;
        this.max = health;
        this.regen = regen;
    }
    display() {
        return this.amount / this.max;
    }
    getDamage(amount, capped = true) {
        let damageToMax = this.amount - this.max;
        switch (this.type) {
            case "dynamic":
                return Math.max(capped
                    ? Math.min(amount * this.permeability, this.amount)
                    : amount * this.permeability,
                    damageToMax);
            case "static":
                return Math.max(
                    capped ? Math.min(amount, this.amount) : amount,
                    damageToMax);
        }
    }
    regenerate(boost = false) {
        boost /= 2;
        let cons = 5;
        switch (this.type) {
            case "static":
                if (this.amount >= this.max || !this.amount) break;
                this.amount += cons * boost;
                break;
            case "dynamic":
                let r = this.amount / this.max;
                if (r <= 0) {
                    this.amount = 0.0001;
                } else if (r >= 1) {
                    this.amount = this.max;
                } else {
                    // this regen multiplier is this curve: https://www.desmos.com/calculator/ghjggwdp6h
                    let regenMultiplier = Math.exp(Math.pow(Math.sqrt(r / 2) - 0.4, 2) * -50);
                    this.amount += cons * (this.regen * regenMultiplier / 3 + (r * this.max) / 150 + boost);
                }
                break;
        }
        this.amount = util.clamp(this.amount, 0, this.max);
    }
    get permeability() {
        switch (this.type) {
            case "static":
                return 1;
            case "dynamic":
                return this.max ? util.clamp(this.amount / this.max, 0, 1) : 0;
        }
    }
    get ratio() {
        return this.max ? util.clamp(1 - Math.pow(this.amount / this.max - 1, 4), 0, 1) : 0;
    }
}
module.exports = { HealthType };