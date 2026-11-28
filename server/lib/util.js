import { ensureIsClass } from "../loaders/global";

const addArticle = (string) => {
    const article = /^[aeiou]/i.test(string) ? "an" : "a";
    return `${article} ${string}`;
};

const getDistance = (p1, p2) => Math.sqrt(Math.pow(p2.x - p1.x, 2) + Math.pow(p2.y - p1.y, 2));

const getDistanceSquared = (p1, p2) => Math.pow(p2.x - p1.x, 2) + Math.pow(p2.y - p1.y, 2);

const getDirection = (p1, p2) => Math.atan2(p2.y - p1.y, p2.x - p1.x);

const clamp = (value, min, max) => Math.min(Math.max(value, min), max);

const lerp = (value, target, scale) => value + scale * (target - value);

const listify = (list) => {
    if (list.length === 0) {
        return "";
    }
    if (list.length === 1) {
        return list[0];
    }
    if (list.length === 2) {
        return `${list[0]} and ${list[1]}`;
    }

    let output = "";
    for (const [i, item] of list.entries()) {
        if (typeof item !== "string") {
            throw Error(`Item #${i + 1} (${item} of list is not a string.`);
        }
        output += i !== list.length - 1 ? `${item}, ` : `and ${item}`;
    }
    return output;
};

const angleDifference = (a1, a2) => ((a2 - a1) % (2 * Math.PI) + Math.PI * 3) % (2 * Math.PI) - Math.PI;

const interpolateAngle = (angle, desired, step) => angle + angleDifference(angle, desired) * step;

const averageArray = (arr) => {
    if (!arr.length) {
        return 0;
    }
    var sum = arr.reduce((a, b) => {
        return a + b;
    });
    return sum / arr.length;
};

const sumArray = (arr) => {
    if (!arr.length) {
        return 0;
    }
    const sum = arr.reduce((a, b) => a + b);
    return sum;
};

const signedSqrt = (x) => Math.sign(x) * Math.sqrt(Math.abs(x));

const getJackpot = (x) => x > 39450 ? Math.pow(x - 26300, 0.85) + 26300 : x / 1.5;

const getReversedJackpot = (x) => x > 39450 ? Math.pow(x - 26300, 1.15) + 26300 : x * 1.5;

const rounder = (val, precision = 6) => {
    if (Math.abs(val) < 0.00001) {
        val = 0;
    }
    return parseFloat(val.toPrecision(precision));
};



/*let angleDifference = function(a1, a2) {
    let diff1 = a2 - a1;
    while (diff1 >= 2*Math.PI) {
        diff1 -= 2*Math.PI;
    }
    while (diff1 < 0) {
        diff1 += 2*Math.PI;
    }
    let diff2 = a1 - a2;
    while (diff2 >= 2*Math.PI) {
        diff2 -= 2*Math.PI;
    }
    while (diff2 < 0) {
        diff2 += 2*Math.PI;
    }

    if (Math.abs(diff1) <= Math.abs(diff2)) { return diff1; }
    if (Math.abs(diff2) <= Math.abs(diff1)) { return diff2; }
};*/

const loopSmooth = (angle, desired, slowness) => {
    return angleDifference(angle, desired) / slowness;
};

/*let loopClamp = function(angle, min, max) {
    angle = angle % (Math.PI * 2);
    min = min % (Math.PI * 2); if (min < 0) min += Math.PI * 2;
    max = max % (Math.PI * 2); if (max < 0) max += Math.PI * 2;
    let a = (max - min) % (Math.PI * 2); if (a < 0) a += Math.PI * 2;
    if (angle - min > a) return max;
    if (angle - min < 0) return min;
    return angle;
};*/


/*let pointInArc = function(point, givenAngle, allowedDifference) {
    let len = Math.sqrt(point.x * point.x + point.y * point.y);
    let norm = { x: point.x / len, y: point.y / len, };
    let vect = { x: Math.cos(givenAngle), y: Math.sin(givenAngle), };
    let dot = norm.x * vect.x + norm.y * vect.y;
    let a1 = Math.atan2(point.y, point.x);
    let a2 = Math.acos(dot);
    let diff = angleDifference(a1, a2);
};*/

/*let isInArc = function(angle, arc) {
    return loopClamp(angle, arc[0], arc[1]) == angle;
};*/

const deepClone = (obj, hash = new WeakMap()) => {
    let result;
    // Do not try to clone primitives or functions
    if (Object(obj) !== obj || obj instanceof Function) {
        return obj;
    }
    if (hash.has(obj)) {
        return hash.get(obj);
    } // Cyclic reference
    try { // Try to run constructor (without arguments, as we don't know them)
        result = new obj.constructor();
    } catch { // Constructor failed, create object without running the constructor
        result = Object.create(Object.getPrototypeOf(obj));
    }
    // Optional: support for some standard constructors (extend as desired)
    if (obj instanceof Map) {
        Array.from(obj, ([key, val]) => result.set(deepClone(key, hash), deepClone(val, hash)));
    } else if (obj instanceof Set) {
        Array.from(obj, (key) => result.add(deepClone(key, hash)));
    }
    // Register in hash
    hash.set(obj, result);
    // Clone and assign enumerable own properties recursively
    return Object.assign(result, ...Object.keys(obj).map(
        (key) => ({ [key]: deepClone(obj[key], hash) })));
};

const serverStartTime = Date.now();
// Get a better logging function
let lastStamp;
const time = () => {
    let t = Date.now() - serverStartTime;
    if (lastStamp === undefined) {
        lastStamp = t;
    } else if (t < lastStamp) {
        t = lastStamp + 1;
    }
    lastStamp = t;
    return t;
};

// create a custom timestamp format for log statements
const log = (text) => {
    console.log(`[${(time() / 1000).toFixed(3)}]: ${text}`);
};
const saveToLog = (title, description, color) => {
    console.log(`[!]: ${title} (#${color.toString(16).padStart(6, "0")})\n :: ${description}`);
};
const warn = (text) => {
    console.log(`[${(time() / 1000).toFixed(3)}]: [WARNING]: ${text}`);
};
const error = (text) => {
    console.log(text);
};
const remove = (array, index) => {
    // there is more than one object in the container
    if (index === array.length - 1) {
        // special case if the obj is the newest in the container
        return array.pop();
    } else {
        const o = array[index];
        array[index] = array.pop();
        return o;
    }
};
    // convenience
const forcePush = (object, property, ...items) => {
    if (Array.isArray(object[property])) {
        object[property].push(...items);
    } else {
        object[property] = [...items];
    }
};

// Performance savings for define()
const flattenDefinition = (output, definition) => {
    definition = ensureIsClass(definition);

    if (definition.PARENT) {
        if (!Array.isArray(definition.PARENT)) {
            flattenDefinition(output, definition.PARENT);
        } else {
            for (const parent of definition.PARENT) {
                flattenDefinition(output, parent);
            }
        }
    }

    for (const key in definition) {
        // Skip parents
        if (key === "PARENT") {
            continue;
        }
        // Handle body stats (prevent overwriting of undefined stats)
        if (key === "BODY") {
            const body = definition.BODY;
            if (!output.BODY) {
                output.BODY = {};
            }
            for (const stat in body) {
                output.BODY[stat] = body[stat];
            }
            continue;
        }
        // Handle other properties
        output[key] = definition[key];
    }

    return output;
};

const isStringified = (str) => {
    try {
        return JSON.parse(str);
    } catch {
        return str;
    }
};

export {
    addArticle,
    getDistance,
    getDistanceSquared,
    getDirection,
    clamp,
    lerp,
    listify,
    angleDifference,
    interpolateAngle,
    averageArray,
    sumArray,
    signedSqrt,
    getJackpot,
    getReversedJackpot,
    rounder,
    loopSmooth,
    // loopClamp,
    // pointInArc,
    // isInArc,
    deepClone,
    serverStartTime,
    time,
    log,
    saveToLog,
    warn,
    error,
    remove,
    forcePush,
    flattenDefinition,
    isStringified
};
