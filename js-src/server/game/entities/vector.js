// Basic Vector
class Vector {
    constructor(x, y) {
        this.X = x;
        this.Y = y;
    }
    get x() {
        if (isNaN(this.X)) this.X = 0;
        return this.X;
    }
    get y() {
        if (isNaN(this.Y)) this.Y = 0;
        return this.Y;
    }
    set x(value) {
        this.X = value;
    }
    set y(value) {
        this.Y = value;
    }
    null() {
        this.X = 0;
        this.Y = 0;
    }
    isShorterThan(d) {
        return this.x * this.x + this.y * this.y <= d * d;
    }
    get lengthSquared() {
        return Math.pow(this.x, 2) + Math.pow(this.y, 2);
    }
    get length() {
        return Math.sqrt(Math.pow(this.x, 2) + Math.pow(this.y, 2));
    }
    get direction() {
        return Math.atan2(this.y, this.x);
    }
};
// Gets the nearest
function nearest(array, location, test = () => true) {
    let lowest = Infinity, closest;
    for (const instance of array) {
        let distance = (instance.x - location.x) ** 2 + (instance.y - location.y) ** 2;
        if (distance < lowest && test(instance, distance)) {
            lowest = distance;
            closest = instance;
        }
    }
    return closest;
}

function timeOfImpact(p, v, s) {
    // p = relative position vector to target
    // v = relative velocity vector (target velocity - projectile velocity)
    // s = projectile speed
    
    // Quadratic equation: |p + v*t| = s*t
    // Expanding: (p.x + v.x*t)² + (p.y + v.y*t)² = (s*t)²
    // Results in: (v.x² + v.y² - s²)t² + 2(p.x*v.x + p.y*v.y)t + (p.x² + p.y²) = 0
    
    let a = v.x * v.x + v.y * v.y - s * s;
    let b = 2 * (p.x * v.x + p.y * v.y);
    let c = p.x * p.x + p.y * p.y;
    
    let discriminant = b * b - 4 * a * c;
    
    // No real solution means interception is impossible
    if (discriminant < 0) return 0;
    
    let sqrtDiscriminant = Math.sqrt(discriminant);
    
    // Handle the case where projectile speed equals target speed
    if (Math.abs(a) < 1e-10) {
        // Linear equation: bt + c = 0
        return b !== 0 ? Math.max(0, -c / b) : 0;
    }
    
    // Two potential solutions
    let t1 = (-b + sqrtDiscriminant) / (2 * a);
    let t2 = (-b - sqrtDiscriminant) / (2 * a);
    
    // We want the smallest positive time
    let validTimes = [t1, t2].filter(t => t > 1e-10); // Small epsilon to avoid numerical issues
    
    return validTimes.length > 0 ? Math.min(...validTimes) : 0;
}

module.exports = { Vector, nearest, timeOfImpact };
