// Seed math
export function random(x) {
    return x * Math.random();
}

export function randomAngle() {
    return Math.PI * 2 * Math.random();
}

export function randomRange(min, max) {
    return Math.random() * (max - min) + min;
}

export function irandom(i) {
    const max = Math.floor(i);
    return Math.floor(Math.random() * (max + 1)); //Inclusive
}

export function irandomRange(min, max) {
    min = Math.ceil(min);
    max = Math.floor(max);
    return Math.floor(Math.random() * (max - min + 1)) + min; //Inclusive
}

// does not clump the points in the middle
export function pointInUnitCircle() {
    const angle = randomAngle(),
        distance = Math.sqrt(Math.random());
    return {
        x: Math.cos(angle) * distance,
        y: Math.sin(angle) * distance
    };
}

export function gauss(mean = 0, stdev = 1) {
    const u = 1 - Math.random();
    const v = Math.random();
    const z = Math.sqrt(-2.0 * Math.log(u)) * Math.cos(2.0 * Math.PI * v);
    // Transform to the desired mean and standard deviation:
    return z * stdev + mean;
}

export function gaussInverse(min, max, clustering) {
    const range = max - min;
    let output = gauss(0, range / clustering);

    while (output < 0) {
        output += range;
    }
    while (output > range) {
        output -= range;
    }
    return output + min;
}

export function gaussRing(radius, clustering) {
    const r = random(Math.PI * 2);
    const d = gauss(radius, radius * clustering);
    return {
        x: d * Math.cos(r),
        y: d * Math.sin(r)
    };
}

export function chance(prob) {
    return random(1) < prob;
}

export function dice(sides) {
    return random(sides) < 1;
}

export function choose(arr) {
    return arr[irandom(arr.length - 1)];
}

export function chooseN(arr, num) {
    const result = [],
        extendedArr = [];
    while (extendedArr.length < num) {
        extendedArr.push(...shuffle(arr));
    }
    for (var i = 0; i < num; i++) {
        result.push(extendedArr[i]);
    }
    return result;
}

export function shuffle(arr) {
    arr = arr.slice(); //avoid changing the original array
    for (let i = arr.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * i);
        [arr[j], arr[i]] = [arr[i], arr[j]];
    }
    return arr;
}

export function chooseChance(...arg) {
    let totalProb = 0;
    for (const value of arg) {
        totalProb += value;
    }

    let answer = random(totalProb);
    for (let i = 0; i < arg.length; i++) {
        if (answer < arg[i]) {
            return i;
        }
        answer -= arg[i];
    }
}

export const nameLists = {
    names: ["Alice", "Bob", "Carmen", "David", "Edith", "Freddy", "Gustav", "Helga", "Ivan", "Janet", "Kaine", "Lorenzo", "Mary", "Nora", "Olivia", "Peter", "Queen", "Roger", "Suzanne", "Tommy", "Ursula", "Vincent", "Wilhelm", "Xerxes", "Yvonne", "Zachary"],
    nato: ["Alpha", "Bravo", "Charlie", "Delta", "Echo", "Foxtrot", "Golf", "Hotel", "India", "Juliet", "Kilo", "Lima", "Mike", "November", "Oscar", "Papa", "Quebec", "Romeo", "Sierra", "Tango", "Uniform", "Victor", "Whiskey", "X-Ray", "Yankee", "Zulu"],
    a: ["Archimedes", "Akilina", "Anastasios", "Athena", "Alkaios", "Amyntas", "Aniketos", "Artemis", "Anaxagoras", "Apollon"],
    castle: ["Berezhany", "Lutsk", "Dobromyl", "Akkerman", "Palanok", "Zolochiv", "Palanok", "Mangup", "Olseko", "Brody", "Isiaslav", "Kaffa", "Bilhorod"],
    legion: ["Vesta", "Juno", "Orcus", "Janus", "Minerva", "Ceres"]
};

export function chooseBotName() {
    return choose([...nameLists.names, ...nameLists.nato]);
}

export function chooseBossName(code, amount) {
    return code in nameLists ? chooseN(nameLists[code], amount) : [];
}
