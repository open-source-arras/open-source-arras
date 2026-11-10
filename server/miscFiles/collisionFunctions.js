function simplecollide(my, n) {
    // Cache values to avoid redundant calculations
    const dx = my.x - n.x, dy = my.y - n.y;
    const dist = Math.hypot(dx, dy);
    const factor = 1 / (dist + 2);
    const fx = dx * factor, fy = dy * factor;
    my.accel.x += fx;
    my.accel.y += fy;
    n.accel.x -= fx;
    n.accel.y -= fy;
}

function dronecollide(my, n) {
    const dx = my.x - n.x, dy = my.y - n.y;
    const dist = Math.hypot(dx, dy);
    if (!dist || dist >= my.size + n.size) return;
    const push = 2.15 / dist;
    my.accel.x += dx * push;
    my.accel.y += dy * push;
    n.accel.x -= dx * push;
    n.accel.y -= dy * push;
}

function blockcollide(my, n) {
    let dx = my.x - n.x,
        dy = my.y - n.y,
        reach = my.size + n.size,
        dist = Math.sqrt(dx * dx + dy * dy);
    if (dist >= reach || !reach) return;
    if (dist) {
        dx /= dist;
        dy /= dist;
    } else {
        dx = my.id > n.id ? 1 : -1;
        dy = 0;
    }
    let myPen = 1 + 2.5 * my.skill.ghost,
        nPen = 1 + 2.5 * n.skill.ghost,
        myWeight = Math.pow(myPen, 1.4),
        nWeight = Math.pow(nPen, 1.4),
        weight = myWeight + nWeight,
        spring = 12.8 * Math.sqrt(24 / reach) * (2 / weight) * (reach - dist) / reach,
        closing = (my.velocity.x - n.velocity.x) * dx + (my.velocity.y - n.velocity.y) * dy,
        grip = Math.min(1, 0.6 / Math.sqrt(myPen * nPen)),
        push = 2 * spring + (closing < 0 ? -closing * grip : 0);
    my.accel.x += dx * push * nWeight / weight;
    my.accel.y += dy * push * nWeight / weight;
    n.accel.x -= dx * push * myWeight / weight;
    n.accel.y -= dy * push * myWeight / weight;
    my.blockTouch = n.blockTouch = true;
}

function firmcollide(my, n, buffer = 0) {
    // Cache positions and motions
    const mx = my.x + my.xMotion, myy = my.y + my.yMotion;
    const nx = n.x + n.xMotion, ny = n.y + n.yMotion;
    const dx = nx - mx, dy = ny - myy;
    const distSq = dx * dx + dy * dy;
    if (distSq === 0) return; // Prevent divide-by-zero

    const totalSize = my.realSize + n.realSize;
    const bufferLimit = totalSize + buffer;
    if (buffer > 0 && distSq <= bufferLimit * bufferLimit) {
        const dist = Math.sqrt(distSq);
        const factor = ((my.acceleration + n.acceleration) * (bufferLimit - dist)) /
            (buffer * global.gameManager.runSpeed * dist);
        const accelX = dx * factor, accelY = dy * factor;
        my.accel.x -= accelX;
        my.accel.y -= accelY;
        n.accel.x += accelX;
        n.accel.y += accelY;
    }
    if (distSq > totalSize * totalSize) return;

    const dist = Math.sqrt(distSq);
    const overlap = totalSize - dist;
    const iterations = Math.min(20, (overlap * 20) | 0);
    const factor = 0.01 * iterations / (dist * global.gameManager.runSpeed);
    const adjustX = dx * factor, adjustY = dy * factor;

    const mySpeed = Math.hypot(my.velocity.x, my.velocity.y);
    const nSpeed = Math.hypot(n.velocity.x, n.velocity.y);

    if (mySpeed <= Math.max(mySpeed, my.topSpeed)) {
        my.velocity.x -= adjustX;
        my.velocity.y -= adjustY;
    }
    if (nSpeed <= Math.max(nSpeed, n.topSpeed)) {
        n.velocity.x += adjustX;
        n.velocity.y += adjustY;
    }
    if (my.label.includes("Spike") && n.label.includes("Spike")) { //TODO: Make this a check for some property like "BOUNCY" instead of hardcoding for Spike
        const bounceFactor = 5;
        const dx = my.x - n.x;
        const dy = my.y - n.y;
        const dist = Math.hypot(dx, dy);
        const nx = dx / dist;
        const ny = dy / dist;
        const dot = my.velocity.x * nx + my.velocity.y * ny;
        if (dist === 0) return;
        const dot2 = n.velocity.x * (-nx) + n.velocity.y * (-ny);
        my.velocity.x = (my.velocity.x - 2 * dot * nx) * bounceFactor;
        my.velocity.y = (my.velocity.y - 2 * dot * ny) * bounceFactor;
        n.velocity.x = (n.velocity.x - 2 * dot2 * (-nx)) * bounceFactor;
        n.velocity.y = (n.velocity.y - 2 * dot2 * (-ny)) * bounceFactor;
    }
}

function firmcollidehard(my, n, buffer = 0) {
    let item1 = {
        x: my.x + my.xMotion,
        y: my.y + my.yMotion
    };
    let item2 = {
        x: n.x + n.xMotion,
        y: n.y + n.yMotion
    };
    let dist = util.getDistance(item1, item2);
    let s1 = Math.max(my.velocity.length, my.topSpeed);
    let s2 = Math.max(n.velocity.length, n.topSpeed);
    let strike1, strike2;
    if (buffer > 0 && dist <= my.realSize + n.realSize + buffer) {
        let repel = (my.acceleration + n.acceleration) * (my.realSize + n.realSize + buffer - dist) / buffer / Config.runSpeed;
        my.accel.x += repel * (item1.x - item2.x) / dist;
        my.accel.y += repel * (item1.y - item2.y) / dist;
        n.accel.x -= repel * (item1.x - item2.x) / dist;
        n.accel.y -= repel * (item1.y - item2.y) / dist;
    }
    let cycles = 0; while (dist <= my.realSize + n.realSize && !(strike1 && strike2) && cycles < 150) {
        cycles += 1;
        strike1 = false;
        strike2 = false;
        if (my.velocity.length <= s1) {
            my.velocity.x -= 0.05 * (item2.x - item1.x) / dist / Config.runSpeed;
            my.velocity.y -= 0.05 * (item2.y - item1.y) / dist / Config.runSpeed;
        } else {
            strike1 = true;
        }
        if (n.velocity.length <= s2) {
            n.velocity.x += 0.05 * (item2.x - item1.x) / dist / Config.runSpeed;
            n.velocity.y += 0.05 * (item2.y - item1.y) / dist / Config.runSpeed;
        } else {
            strike2 = true;
        }
        item1 = {
            x: my.x + my.xMotion,
            y: my.y + my.yMotion
        };
        item2 = {
            x: n.x + n.xMotion,
            y: n.y + n.yMotion
        };
        dist = util.getDistance(item1, item2);
    }
}

function reflectcollide(wall, bounce) {
    // Use cached values and avoid repeated Math.sqrt
    const dx = wall.x - bounce.x, dy = wall.y - bounce.y;
    const dist = Math.hypot(dx, dy);
    const difference = wall.size + bounce.size - dist;
    if (difference > 0) {
        const factor = difference / dist;
        bounce.accel.x -= factor * dx;
        bounce.accel.y -= factor * dy;
        return 1;
    }
    return 0;
}

const roundFightChart = {
    boomerang: { trap: 0.352, drone: 0.184, minion: 4.36, bullet: 0.888, missile: 0.258, swarm: 0.436, block: 0.632 },
    trap: { boomerang: 0.0416, swarm: 0.512, block: 0.72 },
    swarm: { trap: 0.28, missile: 0.295, block: 0.114, boomerang: 0.0309, drone: 0.0549, minion: 0.427, bullet: 0.6 },
    drone: { block: 0.196, minion: 0.149, missile: 0.0721, swarm: 0.0726, boomerang: 0.0223 },
    block: { drone: 0.22, missile: 0.929, swarm: 0.183, trap: 0.863, boomerang: 0.0865, minion: 1.1 },
    minion: { drone: 0.259, missile: 0.373, swarm: 1.34, block: 2.17, boomerang: 1.75 },
    missile: { drone: 0.0792, swarm: 0.533, block: 0.654, boomerang: 0.0181, minion: 0.274 },
    bullet: { boomerang: 0.116 }
};

function isShape(e) {
    return e.type === "food" || e.type === "crasher";
}

function isTankBody(e) {
    return (e.type === "tank" || e.type === "miniboss") && (e.RESIST ?? 1) <= 1;
}

function holdContact(round, shape) {
    if (!round.roundKind || !(isShape(shape) || isTankBody(shape)) || round.holdId === shape.id) return;
    let kind = round.roundKind,
        own = round.velocity.length;
    round.holdId = shape.id;
    round.holdSpeed = own;
    round.holdClose = 1;
    if ((kind === "bullet" || kind === "missile" || kind === "drone" || kind === "swarm") && own >= 0.1) {
        let ratio = util.clamp(1 - (shape.velocity.x * round.velocity.x + shape.velocity.y * round.velocity.y) / (own * own), 0.25, 2);
        round.holdClose = Math.pow(ratio, ratio < 1 ? (kind === "missile" ? 1.3 : 1) : (kind === "missile" ? 0.7 : 0.5));
    }
}

function biteSpeedFactor(dealer, receiver, factor) {
    let kind = dealer.roundKind;
    if (!kind) return Math.min(2, Math.max(factor, 1) * factor);
    if (receiver.roundKind) return 1;
    if (kind === "drone" || kind === "swarm") return util.clamp(Math.pow(factor, 3), 0.25, 2);
    if (kind === "bullet") {
        if ((isShape(receiver) || isTankBody(receiver)) && dealer.maxSpeed) factor = Math.pow(dealer.holdSpeed / dealer.maxSpeed, 0.25);
        return util.clamp(factor, 0.25, 1);
    }
    return util.clamp(Math.max(factor, 1) * factor, 1, 2);
}

function biteResist(dealer, receiver, difference) {
    if (dealer.roundKind && isShape(receiver)) return 1;
    if (isShape(dealer) && receiver.roundKind) return 1 - receiver.health.resist;
    if (dealer.roundKind && isTankBody(receiver)) return 1 - receiver.roundResist;
    if (isTankBody(dealer) && receiver.roundKind) return 1 + dealer.roundResist - receiver.health.resist;
    return 1 + difference;
}

function necroMayTake(shape) {
    return !shape.shield.max && !/\b(Shiny|Legendary|Shadow|Rainbow|Trans|Omega)\b/.test(shape.label);
}

function roundOnBody(dealer, receiver) {
    if (dealer.type === "aura" && isTankBody(receiver)) return 1 / 1.8;
    if (dealer.roundKind && isTankBody(receiver)) return dealer.roundKind === "minion" ? 1 / 1.8 : 0.74 / 1.8 * (dealer.holdId === receiver.id ? dealer.holdClose : 1);
    if (isTankBody(dealer) && receiver.roundKind) return (receiver.roundKind === "minion" ? 1.8 : 0.45) * dealer.skill.atkRounds / dealer.skill.atk;
    return 1;
}

function roundFight(dealer, receiver) {
    if (!dealer.roundKind || !receiver.roundKind) return 1;
    return 0.449 * dealer.fightDamage * receiver.fightTaken * (roundFightChart[dealer.roundKind]?.[receiver.roundKind] ?? 1);
}

const ramKinds = {
    egg: [68, 0],
    triangle: [62.83, 0.0273],
    square: [63.76, 0.0132],
    pentagon: [64.67, 0.0405],
    hexagon: [63.79, 0.0539],
    giantBeta: [22.04, 0.0235],
    giantAlpha: [26.1, 0.0235]
};
const ramHits = [0, 0];

function ramKindOf(shape) {
    let sides = typeof shape.shape === "number" ? Math.abs(shape.shape) : 5;
    if (sides === 5 && shape.shield.max > 0) return shape.size > 45 ? ramKinds.giantAlpha : ramKinds.giantBeta;
    if (sides <= 2) return ramKinds.egg;
    return [ramKinds.triangle, ramKinds.square, ramKinds.pentagon][sides - 3] ?? ramKinds.hexagon;
}

function bodyAtk(tank) {
    return 1 + 0.052 * tank.skill.bodyCurve;
}

function bodyResist(tank) {
    return 1 - 1 / Math.max(1, tank.RESIST + 0.15 * tank.skill.healthCurve + 0.25 * tank.skill.bodyCurve);
}

function bodyTake(tank) {
    return 1 / Math.max(1, tank.RESIST + 0.2606 * tank.skill.healthCurve + 0.478 * tank.skill.bodyCurve);
}

function minionBite(my, n) {
    if (my.roundKind === "minion" && isShape(n)) return [my.DAMAGE * 2.95 * my.minionBite, n.DAMAGE * 2.27 * my.minionTake];
    if (n.roundKind === "minion" && isShape(my)) return [my.DAMAGE * 2.27 * n.minionTake, n.DAMAGE * 2.95 * n.minionBite];
    return null;
}

function bodyHit(my, n) {
    if (isTankBody(my) && isTankBody(n)) {
        let smash = 1 + ((my.settings.reloadToAcceleration ? 1 : 0) + (n.settings.reloadToAcceleration ? 1 : 0)) / 3;
        ramHits[0] = Math.max(0, 9.0196 * my.DAMAGE * bodyAtk(my) * (bodyResist(my) + bodyTake(n)) * smash);
        ramHits[1] = Math.max(0, 9.0196 * n.DAMAGE * bodyAtk(n) * (bodyResist(n) + bodyTake(my)) * smash);
        return ramHits;
    }
    let tank = isTankBody(my) ? my : isTankBody(n) ? n : null,
        shape = tank === my ? n : my;
    if (!tank || !isShape(shape)) return null;
    let kind = ramKindOf(shape),
        resist = kind === ramKinds.pentagon ? 0 : shape.health.resist,
        toShape = Math.max(0, kind[0] * (tank.DAMAGE / 3) * bodyAtk(tank) * (1 + bodyResist(tank) - resist) / Math.max(0.05, 1 - resist)),
        toTank = kind[1] * 220 * (shape.label === "Crasher" ? 0.2342 : 1) * bodyTake(tank);
    ramHits[0] = tank === my ? toShape : toTank;
    ramHits[1] = tank === my ? toTank : toShape;
    return ramHits;
}

function tankPairPen(tank) {
    return tank.PENETRATION + (0.57 * tank.skill.bodyCurve + 0.2913 * tank.skill.healthCurve) / (Math.log(5) / 1.6);
}

function teamcollide(my, n) {
    let dx = my.x - n.x,
        dy = my.y - n.y,
        dist = Math.sqrt(dx * dx + dy * dy),
        reach = my.size + n.size,
        small = Math.min(my.size, n.size);
    if (dist >= reach || !small) return;
    if (dist) {
        dx /= dist;
        dy /= dist;
    } else {
        dx = my.id > n.id ? 1 : -1;
        dy = 0;
    }
    let myWeight = my.size * my.size + 1,
        nWeight = n.size * n.size + 1,
        closing = (my.velocity.x - n.velocity.x) * dx + (my.velocity.y - n.velocity.y) * dy,
        push = 1.5 * (reach - dist) / (2 * small) + (closing < 0 ? -closing * 0.35 : 0);
    my.accel.x += dx * push * nWeight / (myWeight + nWeight);
    my.accel.y += dy * push * nWeight / (myWeight + nWeight);
    n.accel.x -= dx * push * myWeight / (myWeight + nWeight);
    n.accel.y -= dy * push * myWeight / (myWeight + nWeight);
}

function roundPush(source, target) {
    if (source.roundKind && isTankBody(target)) return source.roundKind === "bullet" ? 2.24 * 2.25 : 2.24;
    if (isTankBody(source) && target.roundKind) return 4;
    return 1;
}

const shapeKnock = {
    k: 2.239,
    kb: 1.1,
    tankDensity: 2.3,
    healthPow: 0.4126,
    runSpeed: 1.5,
    penBodyDamage: 0.3265,
    penMaxHealth: 0.2913,
    pentagon: { density: 0.8614, push: 0.5296 },
    triangle: { density: 0.81, push: 0.75 },
    square: { density: 0.97, push: 0.35, pen: 0.55 },
    triangleNestPush: [1, 1.28, 1.08, 1, 1, 1],
    nestPush: [1, 0.6681, 0.4531, 0.134, 0.0396, 0.0117],
    nestDensity: [1, 0.95, 1.88, 1.39, 1.39, 1.39],
    hexagonDensity: [0.4494, 0.6474, 0.8486, 1.094, 1.094, 1.094],
    hexagonPush: [0.47, 0.2869, 0.1188, 0.06161, 0.032, 0.0166],
    betaGiant: 5.632,
    alphaGiant: 13.8,
    glide: { plain: 0.88, nested: 0.92, giant: 0.925 },
    roundShapePush: 0.8
};

function classNamesOf(o) {
    let names = [];
    let walk = def => {
        let c = def;
        if (typeof def === "string") {
            names.push(def);
            c = Class[def];
        }
        if (!c) return;
        for (let parent of Array.isArray(c.PARENT) ? c.PARENT : c.PARENT != null ? [c.PARENT] : []) walk(parent);
    };
    for (let def of o.defs ?? []) walk(def);
    return names;
}

function shapeKnockBody(o) {
    if (o.knockBody && o.knockBodyOf === o.index) return o.knockBody;
    let names = classNamesOf(o),
        laby = names.map(name => name.match(/^laby_(\d)_(\d)_(\d)_(\d)$/)).find(Boolean),
        sides = Math.floor(Math.abs(o.shape)),
        nest = laby ? Number(laby[2]) : 0,
        giant = names.includes("alphaPentagon") || ["hexagon_old", "septagon", "octagon", "nonagon"].some(name => names.includes(name)) ? 2 : names.includes("betaPentagon") ? 1 : 0,
        solid = names.some(name => /icosahedron/i.test(name)) ? 30 : names.some(name => /dodecahedron/i.test(name)) ? 28 : names.some(name => /cube|tetrahedron|octahedron/i.test(name)) ? 20 : 0,
        gem = names.includes("gem") || names.includes("jewel"),
        unit = shapeKnock.pentagon.density / 8,
        body = { density: 1, push: 1, glide: shapeKnock.glide.plain, pen: o.PENETRATION ?? 1 };
    if (o.type === "crasher") {
        nest = 0;
        let plain = Class[["egg", "square", "triangle", "pentagon", "hexagon"][laby ? Number(laby[1]) : Math.max(0, Math.min(4, sides - 2))]];
        if (plain && plain.BODY && plain.BODY.PENETRATION != null) body.pen = plain.BODY.PENETRATION;
    }
    if (giant) {
        body.density = giant === 2 ? shapeKnock.alphaGiant : shapeKnock.betaGiant;
        body.glide = shapeKnock.glide.giant;
    } else if (solid) {
        body.density = solid * unit;
        body.push = shapeKnock.pentagon.push;
        body.glide = shapeKnock.glide.nested;
    } else if (gem) {
        body.density = 4 * unit;
        body.push = 0.25;
    } else {
        let level = Math.min(5, nest);
        if (level > 0) body.glide = shapeKnock.glide.nested;
        if (sides >= 6) {
            body.density = shapeKnock.hexagonDensity[level];
            body.push = shapeKnock.hexagonPush[level];
        } else {
            let family = sides === 5 ? shapeKnock.pentagon : sides === 4 ? shapeKnock.square : shapeKnock.triangle;
            body.density = family.density * shapeKnock.nestDensity[level];
            body.push = family.push * shapeKnock.nestPush[level] * (sides === 3 ? shapeKnock.triangleNestPush[level] : 1);
        }
    }
    if (sides === 4 && o.type !== "crasher") body.pen = shapeKnock.square.pen;
    o.knockBody = body;
    o.knockBodyOf = o.index;
    return body;
}

function knockTick(closing, overlap, rA, rB, penA, penB, hA, hB, mA, mB, pushA, pushB) {
    if (!(mA > 0) || !(mB > 0)) return [0, 0];
    let dA = overlap > 0 ? Math.min(1, overlap / Math.max(2 * rA, 1e-6)) : 0,
        dB = overlap > 0 ? Math.min(1, overlap / Math.max(2 * rB, 1e-6)) : 0,
        down = (1 - dA) * (1 - dB),
        up = dA * dB,
        pA = Math.max(0.01, penA),
        pB = Math.max(0.01, penB),
        hAg = Math.pow(util.clamp(hA, 0, 1), shapeKnock.healthPow),
        hBg = Math.pow(util.clamp(hB, 0, 1), shapeKnock.healthPow),
        elasticity = (2 - 4 * Math.atan(pA * pB) / Math.PI) * (hAg / Math.sqrt(pA) + hBg / Math.sqrt(pB)),
        spring = 2 * Math.sqrt(Math.max(0, hA * hB)) / shapeKnock.runSpeed,
        impulse = down * down * elasticity * Math.max(0, closing) * mA * mB / (mA + mB) + shapeKnock.kb * spring * up,
        scale = shapeKnock.k * shapeKnock.kb * impulse,
        dvA = scale * pushA / mA,
        dvB = scale * pushB / mB;
    return [isFinite(dvA) ? dvA : 0, isFinite(dvB) ? dvB : 0];
}

function knockPairOf(my, n) {
    let shape = isShape(my) && !my.intangibility ? my : isShape(n) && !n.intangibility ? n : null;
    if (!shape) return null;
    let other = shape === my ? n : my;
    if (other.intangibility || isShape(other)) return null;
    if (isTankBody(other)) return { shape, other, tank: true };
    if (other.roundKind) return { shape, other, tank: false };
    return null;
}

function shapeKnockMotion(pair, toShape, closing, overlap, deathFactorOf) {
    let { shape, other } = pair,
        body = shapeKnockBody(shape),
        rS = shape.size,
        rO = other.size,
        mS = body.density * (rS * rS + 1),
        hS = shape.health.ratio,
        hO = other.health.ratio;
    if (pair.tank) {
        let pen = other.PENETRATION + (shapeKnock.penBodyDamage * other.skill.bodyCurve + shapeKnock.penMaxHealth * other.skill.healthCurve) / (Math.log(5) / 1.6),
            [dvT, dvS] = knockTick(closing, overlap, rO, rS, pen, body.pen, hO, hS, shapeKnock.tankDensity * (rO * rO + 1), mS, other.pushability, body.push);
        dvT *= Math.min(1, deathFactorOf(shape));
        other.accel.x -= dvT * toShape.x;
        other.accel.y -= dvT * toShape.y;
        shape.accel.x += dvS * toShape.x;
        shape.accel.y += dvS * toShape.y;
        return;
    }
    let first = other.knockSeen !== shape.id,
        depth = first ? overlap : Math.max(0, overlap - 0.5 * closing),
        [dvR, dvS] = knockTick(closing, depth, rO, rS, other.penetration, body.pen, hO, hS, other.mass, mS, other.pushability, body.push * shapeKnock.roundShapePush);
    other.knockSeen = shape.id;
    dvS *= Math.min(1, deathFactorOf(other));
    dvR *= Math.min(1, deathFactorOf(shape));
    shape.accel.x += dvS * toShape.x;
    shape.accel.y += dvS * toShape.y;
    if (other.motionType !== "withMaster" && other.motionType !== "bound") {
        other.accel.x -= dvR * toShape.x;
        other.accel.y -= dvR * toShape.y;
    }
}

function advancedcollide(my, n, doDamage, doInelastic, nIsFirmCollide = false) {
    if ((my.healer && my.roundKind && isShape(n)) || (n.healer && n.roundKind && isShape(my))) return;
    let knockPair = !nIsFirmCollide && doDamage ? knockPairOf(my, n) : null;
    let tock = Math.min(my.stepRemaining, n.stepRemaining),
        combinedRadius = n.size + my.size,
        motion = {
            _me: new Vector(my.xMotion, my.yMotion),
            _n: new Vector(n.xMotion, n.yMotion)
        },
        delta = new Vector(
            tock * (motion._me.x - motion._n.x),
            tock * (motion._me.y - motion._n.y)
        ),
        difference = new Vector(my.x - n.x, my.y - n.y),
        direction = new Vector((n.x - my.x) / difference.length, (n.y - my.y) / difference.length),
        component = Math.max(0, direction.x * delta.x + direction.y * delta.y);

    // radius check
    if (component < difference.length - combinedRadius) return;
    if (knockPair && knockPair.tank && difference.length >= combinedRadius && delta.length <= combinedRadius) return;

    // A more complex check
    let goahead = false,
        tmin = 1 - tock,
        tmax = 1,
        deltaLengthSquared = delta.lengthSquared,
        B = 2 * delta.x * difference.x + 2 * delta.y * difference.y,
        C = difference.lengthSquared - combinedRadius ** 2,
        det = B ** 2 - (4 * deltaLengthSquared * C),
        t;
    if (!deltaLengthSquared || det < 0 || C < 0) { // This shall catch mathematical errors
        t = 0;
        if (C < 0) { // We have already hit without moving
            goahead = true;
        }
    } else {
        let t1 = (-B - Math.sqrt(det)) / (2 * deltaLengthSquared),
            t2 = (-B + Math.sqrt(det)) / (2 * deltaLengthSquared);
        if (t1 < tmin || t1 > tmax) { // 1 is out of range
            if (t2 < tmin || t2 > tmax) { // 2 is out of range;
                t = false;
            } else { // 1 is out of range but 2 isn't
                t = t2;
                goahead = true;
            }
        } else { // 1 is in range
            if (t2 >= tmin && t2 <= tmax) { // They're both in range!
                t = Math.min(t1, t2);
                goahead = true; // That means it passed in and then out again.  Let's use when it's going in
            } else { // Only 1 is in range
                t = t1;
                goahead = true;
            }
        }
    }

    if (!goahead) return;
    /********* PROCEED ********/

    // Add to record
    my.collisionArray.push(n);
    n.collisionArray.push(my);
    if (t && !knockPair) {
    // Step to where the collision occured
        my.x += motion._me.x * t;
        my.y += motion._me.y * t;
        n.x += motion._n.x * t;
        n.y += motion._n.y * t;
        my.stepRemaining -= t;
        n.stepRemaining -= t;
        difference = new Vector(my.x - n.x, my.y - n.y);
        direction = new Vector((n.x - my.x) / difference.length, (n.y - my.y) / difference.length);
        component = Math.max(0, direction.x * delta.x + direction.y * delta.y);
    }

    let componentNorm = component / delta.length;
    let reductionFactor = 1,
        deathFactor = {
            _me: 1,
            _n: 1
        },
        accelerationFactor = (delta.length) ? (
            (combinedRadius / 4) / (Math.floor(combinedRadius / delta.length) + 1)
        ) : (
            0.001
        ),
        depth = {
            _me: util.clamp((combinedRadius - difference.length) / (2 * my.size), 0, 1), //1: I am totally within it
            _n: util.clamp((combinedRadius - difference.length) / (2 * n.size), 0, 1) //1: It is totally within me
        },
        combinedDepth = {
            up: depth._me * depth._n,
            down: (1 - depth._me) * (1 - depth._n)
        },
        pen = {
            _me: {
                sqr: Math.pow(my.penetration, 2),
                sqrt: Math.sqrt(my.penetration)
            },
            _n: {
                sqr: Math.pow(n.penetration, 2),
                sqrt: Math.sqrt(n.penetration)
            }
        },
        savedHealthRatio = {
            _me: my.health.ratio,
            _n: n.health.ratio
        };
    if (doDamage) {
        let speedFactor = { // Avoid NaNs and infinities
            _me: my.maxSpeed ? Math.pow(motion._me.length / my.maxSpeed, 0.25) : 1,
            _n: n.maxSpeed ? Math.pow(motion._n.length / n.maxSpeed, 0.25) : 1
        };
        /********** DO DAMAGE *********/
        holdContact(my, n);
        holdContact(n, my);
        let bail = false;
        if (n.type === "food" && my.settings.necroTypes.includes(n.shape) && necroMayTake(n)) {
            bail = my.necro(n);
        } else if (my.type === "food" && n.settings.necroTypes.includes(my.shape) && necroMayTake(my)) {
            bail = n.necro(my);
        }
        if (!bail && !my.invuln && !n.invuln && !(my.type === "aura" && my.master.invuln) && !(n.type === "aura" && n.master.invuln)) {
            // Calculate base damage
            let fight = !!(my.roundKind && n.roundKind),
                resistDiff = fight ? my.fightResist - n.fightResist : my.health.resist - n.health.resist,
                damage = {
                    _me: Config.damage_multiplier * my.damage * biteResist(my, n, resistDiff) * (fight ? 4 : 1 + n.heteroMultiplier  * (my.settings.damageClass === n.settings.damageClass)) * ((my.settings.buffVsFood && n.settings.damageType === 1) ? 3 : 1) * (n.roundKind ? my.damageMultiplier() : 1) * biteSpeedFactor(my, n, speedFactor._me) * (my.roundKind && isShape(n) ? 3 : 1),
                    _n:  Config.damage_multiplier * n.damage  * biteResist(n, my, -resistDiff) * (fight ? 4 : 1 + my.heteroMultiplier * (my.settings.damageClass === n.settings.damageClass)) * ((n.settings.buffVsFood && my.settings.damageType === 1) ? 3 : 1) * (my.roundKind ? n.damageMultiplier() : 1)  * biteSpeedFactor(n, my, speedFactor._n) * (n.roundKind && isShape(my) ? 3 : 1)
                };
            // Advanced damage calculations
            if (my.settings.ratioEffects) {
                damage._me *= Math.min(1, Math.pow(Math.max(my.health.ratio, my.shield.ratio), 1 / my.penetration));
            }
            if (n.settings.ratioEffects) {
                damage._n *= Math.min(1, Math.pow(Math.max(n.health.ratio, n.shield.ratio), 1 / n.penetration));
            }
            if (my.settings.damageEffects || fight) {
                damage._me *=
                    (my.roundKind && (isShape(n) || isTankBody(n)) && my.speedStat ? 0.25 * my.speedStat : accelerationFactor) *
                    (my.roundKind && !n.roundKind ? 1 : 1 + (componentNorm - 1) * (1 - depth._n) / my.penetration) *
                    (my.roundKind && (isShape(n) || n.roundKind) ? 1 : (1 + pen._n.sqrt * depth._n - depth._n) / pen._n.sqrt);
            }
            if (n.settings.damageEffects || fight) {
                damage._n *=
                    (n.roundKind && (isShape(my) || isTankBody(my)) && n.speedStat ? 0.25 * n.speedStat : accelerationFactor) *
                    (n.roundKind && !my.roundKind ? 1 : 1 + (componentNorm - 1) * (1 - depth._me) / n.penetration) *
                    (n.roundKind && (isShape(my) || my.roundKind) ? 1 : (1 + pen._me.sqrt * depth._me - depth._me) / pen._me.sqrt);
            }
            damage._me *= roundOnBody(my, n) * roundFight(my, n);
            damage._n *= roundOnBody(n, my) * roundFight(n, my);
            let ram = bodyHit(my, n) ?? minionBite(my, n);
            if (ram) {
                damage._me = ram[0];
                damage._n = ram[1];
            }
            // Find out if you'll die in this cycle, and if so how much damage you are able to do to the other target
            let damageToApply = {
                _me: damage._me,
                _n: damage._n
            };
            if (n.shield.max) {
                damageToApply._me -= n.shield.getDamage(damageToApply._me);
            }
            if (my.shield.max) {
                damageToApply._n -= my.shield.getDamage(damageToApply._n);
            }
            let stuff = my.health.getDamage(damageToApply._n, false);
            deathFactor._me = (stuff > my.health.amount) ? my.health.amount / stuff : 1;
            stuff = n.health.getDamage(damageToApply._me, false);
            deathFactor._n = (stuff > n.health.amount) ? n.health.amount / stuff : 1;
            if (deathFactor._me < 1 && deathFactor._n < 1 && my.isPlayer && n.isPlayer) {
                my.spared = n.spared = true;
            }
            if (fight && deathFactor._me < 1 && deathFactor._n < 1 && Math.abs(deathFactor._me - deathFactor._n) < 1e-9) {
                deathFactor._me *= 1 + 1e-9;
                deathFactor._n *= 1 + 1e-9;
            }
            if (ram && isTankBody(my) && isTankBody(n) && deathFactor._me < 1 && deathFactor._n < 1) {
                deathFactor._me *= 1 - 1e-9;
                deathFactor._n *= 1 - 1e-9;
            }
            reductionFactor = Math.min(deathFactor._me, deathFactor._n);
            // Now apply it
            // my.damageReceived += damage._n * deathFactor._n;
            // n.damageReceived += damage._me * deathFactor._me;
            const __my = damage._n * deathFactor._n * (n.holdId === my.id && isShape(my) ? n.holdClose : 1);
            const __n = damage._me * deathFactor._me * (my.holdId === n.id && isShape(n) ? my.holdClose : 1);
            my.damageReceived += __my * Number(__my > 0
                ? my.team != n.team
                : !!n.healer && n.team == my.team && my.type == "tank" && n.master.id != my.id);
            n.damageReceived += __n * Number(__n > 0
                ? my.team != n.team
                : !!my.healer && n.team == my.team && n.type == "tank" && my.master.id != n.id);
        }
    }
    // Exit if healer (healers don't push on collide)
    if (n.healer && n.team == my.team && n.master.id != my.id) return;
    if (my.healer && n.team == my.team && my.master.id != n.id) return;
    /************* DO MOTION ***********/
    if (knockPair && isShape(knockPair.shape)) {
        let length = difference.length || 1,
            fromShape = knockPair.shape === my ? -1 : 1,
            toShape = { x: fromShape * (n.x - my.x) / length, y: fromShape * (n.y - my.y) / length };
        shapeKnockMotion(knockPair, toShape, component, Math.max(0, combinedRadius - difference.length), e => e === my ? deathFactor._me : deathFactor._n);
        return;
    }
    if (nIsFirmCollide < 0) {
        nIsFirmCollide *= -0.5;
        my.accel.x -= nIsFirmCollide * component * direction.x;
        my.accel.y -= nIsFirmCollide * component * direction.y;
        n.accel.x += nIsFirmCollide * component * direction.x;
        n.accel.y += nIsFirmCollide * component * direction.y;
    } else if (nIsFirmCollide > 0) {
        n.accel.x += nIsFirmCollide * (component * direction.x + combinedDepth.up);
        n.accel.y += nIsFirmCollide * (component * direction.y + combinedDepth.up);
    } else {
    // Calculate the impulse of the collision
        let knockback;
        if (my.knockback && n.knockback) {
            knockback = my.knockback * n.knockback;
        } else if (my.knockback) {
            knockback = my.knockback;
        } else if (n.knockback) {
            knockback = n.knockback;
        } else knockback = Config.knockback_multiplier;
        let tankPair = doDamage && isTankBody(my) && isTankBody(n),
            pairPen = tankPair ? { _me: tankPairPen(my), _n: tankPairPen(n) } : null,
            elasticity = 2 - 4 * Math.atan(tankPair ? pairPen._me * pairPen._n : my.penetration * n.penetration) / Math.PI;
        if (tankPair) {
            elasticity *= 1.4 * (doInelastic ? 1 / Math.sqrt(pairPen._me) + 1 / Math.sqrt(pairPen._n) : 2);
        } else if (doInelastic && my.settings.motionEffects && n.settings.motionEffects) {
            elasticity *= savedHealthRatio._me / pen._me.sqrt + savedHealthRatio._n / pen._n.sqrt;
        } else {
            elasticity *= 2;
        }
        let spring = 2 * (tankPair ? 1.4 : Math.sqrt(savedHealthRatio._me * savedHealthRatio._n)) / Config.run_speed,
            elasticImpulse =
                Math.pow(combinedDepth.down, 2) *
            elasticity * component *
            my.mass * n.mass / (my.mass + n.mass),
            springImpulse =
                knockback * spring * combinedDepth.up,
            impulse = -(elasticImpulse + springImpulse) * (1 - my.intangibility) * (1 - n.intangibility),
            force = {
                x: impulse * direction.x,
                y: impulse * direction.y
            },
            modifiers = {
                _me: knockback * my.pushability / my.mass * deathFactor._n * roundPush(n, my),
                _n: knockback * n.pushability / n.mass * deathFactor._me * roundPush(my, n)
            };
        // Apply impulse as force
        my.accel.x += modifiers._me * force.x;
        my.accel.y += modifiers._me * force.y;
        n.accel.x -= modifiers._n * force.x;
        n.accel.y -= modifiers._n * force.y;
    }

}

function mooncollide(moon, bounce) {
    if (bounce.ac || moon.intangibility) return;
    let collisionRadius = util.getDistance(moon, bounce);
    let properCollisionRadius = moon.size + bounce.size;
    // Exit if too far
    if (collisionRadius >= properCollisionRadius) return;
    
    // Get elasticity
    let elasticity = bounce.type == "tank" ? 0 : bounce.type == "bullet" ? 1 : bounce.pushability;

    // Place at edge of the moon
    let angleFromMoonToBounce = Math.atan2(bounce.y - moon.y, bounce.x - moon.x);
    bounce.x = moon.x + properCollisionRadius * Math.cos(angleFromMoonToBounce);
    bounce.y = moon.y + properCollisionRadius * Math.sin(angleFromMoonToBounce);
    
    // Find relative velocity vectors to the moon's surface
    let velocityDirection = bounce.velocity.direction;
    let tangentVelocity = bounce.velocity.length * Math.sin(angleFromMoonToBounce - velocityDirection);
    let perpendicularVelocity = bounce.velocity.length * Math.cos(angleFromMoonToBounce - velocityDirection) * elasticity * -1;

    // Exit if the reflection moves the bounced entity closer to the moon
    if (perpendicularVelocity < 0) return;

    // Get angle and magnitude of new velocity
    let newVelocityMagnitude = Math.sqrt(tangentVelocity ** 2 + perpendicularVelocity ** 2);
    let relativeVelocityAngle = Math.atan2(perpendicularVelocity, tangentVelocity);

    // Assign velocity after rotating to the new angle
    bounce.velocity.x = newVelocityMagnitude * Math.sin(Math.PI - relativeVelocityAngle - angleFromMoonToBounce);
    bounce.velocity.y = newVelocityMagnitude * Math.cos(Math.PI - relativeVelocityAngle - angleFromMoonToBounce);
    // So the bots aint a brain dead npc
    bounce.justHittedAWall = true;
}

function mazewallcollidekill(bounce, wall) {
    if (bounce.type !== "tank" && bounce.type !== "miniboss" && bounce.type !== "food" && bounce.type !== "crasher" && bounce.type !== "satellite") {
        bounce.destroy();
    } else {
        bounce.collisionArray.push(wall);
    }
}

function mazewallcollide(wall, bounce) {
    if (bounce.ac || bounce.god === true || bounce.passive === true || bounce.isArenaCloser || (bounce.isArenaCloser !== false && bounce.master.isArenaCloser)) return;
    if (bounce.store.noWallCollision) return;
    if (bounce.team === wall.team && bounce.type === "tank") return;
    const trueWallSize = wall.size * lazyRealSizes[4] / Math.SQRT2 + 2;
    if (bounce.x + bounce.size < wall.x - trueWallSize ||
        bounce.x - bounce.size > wall.x + trueWallSize ||
        bounce.y + bounce.size < wall.y - trueWallSize ||
        bounce.y - bounce.size > wall.y + trueWallSize) return 0;
    if (wall.intangibility) return 0;

    const collisionFaces = [
        bounce.x < wall.x,
        bounce.y < wall.y,
        bounce.x >= wall.x,
        bounce.y > wall.y
    ];
    const extendedOverFaces = [
        bounce.x < wall.x - trueWallSize,
        bounce.y < wall.y - trueWallSize,
        bounce.x > wall.x + trueWallSize,
        bounce.y > wall.y + trueWallSize
    ];
    const wallPushPositions = [
        { x: wall.x - trueWallSize - bounce.size },
        { y: wall.y - trueWallSize - bounce.size },
        { x: wall.x + trueWallSize + bounce.size },
        { y: wall.y + trueWallSize + bounce.size }
    ];
    for (let i = 0; i < 4; i++) {
        if (!collisionFaces[i] | extendedOverFaces[(i + 3) % 4] | extendedOverFaces[(i + 1) % 4]) continue;
        mazewallcollidekill(bounce, wall);
        for (let axis in wallPushPositions[i]) {
            bounce[axis] = wallPushPositions[i][axis];
            bounce.velocity[axis] = 0;
            bounce.justHittedAWall = true;
            return true;
        }
    }
    const cornerPositions = [
        { x: wall.x - trueWallSize, y: wall.y - trueWallSize },
        { x: wall.x + trueWallSize, y: wall.y - trueWallSize },
        { x: wall.x + trueWallSize, y: wall.y + trueWallSize },
        { x: wall.x - trueWallSize, y: wall.y + trueWallSize }
    ];
    for (let i = 0; i < 4; i++) {
        if (
            !collisionFaces[i] | !collisionFaces[(i + 1) % 4] |
            !extendedOverFaces[i] | !extendedOverFaces[(i + 1) % 4]
        ) continue;
        const cornerX = cornerPositions[i].x;
        const cornerY = cornerPositions[i].y;
        if (Math.hypot(bounce.x - cornerX, bounce.y - cornerY) > bounce.size) return;
        mazewallcollidekill(bounce, wall);
        const angleFromCornerToBounce = Math.atan2(bounce.y - cornerY, bounce.x - cornerX);
        bounce.x = cornerX + bounce.size * Math.cos(angleFromCornerToBounce);
        bounce.y = cornerY + bounce.size * Math.sin(angleFromCornerToBounce);
        bounce.justHittedAWall = true;
        return true;
    }
}
const wallInset = 1.5,
    wallCrush = 0.01,
    oneWayPush = 0.9,
    oneWaySide = 8.5,
    stickRest = 13 * 0.54 / 0.46,
    stickSettle = 0.14,
    portalKeep = 0.8,
    portalDraw = 0.15,
    portalCatch = 6.6,
    portalOut = 1.3,
    stickLaw = {
        din: 8.26, pull: 0.86, cap: 1.04, k: 0.12, rest: 16.5, outKeep: 0.403, outTurn: 0.563, turnSpeed: 2.78, drift: 0.2,
        rp: 0.575, rn: 0.24, rd: 0.219, r0: 10.7, tt: 0.931, tp: 0.713, tn: -0.0225, td: 0.289, t0: 4.24
    },
    colorSlots = {
        teal: 0, legendary: 0, shiny: 1, lime: 1, lightGreen: 1, triangle: 2, orange: 2, neutral: 3, yellow: 3,
        hexagon: 4, aqua: 4, crasher: 5, pink: 5, egg: 6, circle: 6, veryLightGrey: 6, veryLightGray: 6,
        wall: 7, lightGrey: 7, lightGray: 7, pureWhite: 8, black: 9, blue: 10, green: 11, red: 12, square: 13, gold: 13,
        pentagon: 14, purple: 14, magenta: 15, grey: 16, gray: 16, rogue: 17, darkGrey: 17, darkGray: 17, white: 18, pureBlack: 19
    };

function colorSlot(base) {
    if (typeof base === "number") return base;
    if (/^-?\d+$/.test(base)) return parseInt(base, 10);
    return colorSlots[base] ?? base;
}

function paintBody(o, slot) {
    if (colorSlot(o.color.base) === colorSlot(slot)) return;
    let was = o.color.base;
    o.color.base = slot;
    if (o.type !== "tank" && o.type !== "miniboss") return;
    o.paintedColor = true;
    for (let e of entities.values()) {
        if (e === o || e.bond || e.isGhost || e.color.base !== was) continue;
        let wearer = e;
        while (wearer.master && wearer.master !== wearer && !wearer.isPlayer && !wearer.isBot) wearer = wearer.master;
        if (wearer === o) e.color.base = slot;
    }
}

function wallTouchOf(o) {
    return o.wallTouch ?? (o.wallTouch = {
        grow: 0, view: 1, lock: null, lockSeen: false,
        stickAge: 0, stickHit: false, stickActed: false, stickX: 0, stickY: 0, stickVx: 0, stickVy: 0
    });
}

function wallTouchTick(o) {
    let t = o.wallTouch;
    if (!t) return;
    let now = o.wallGrow || 0, gap = t.grow - now;
    if (gap) {
        let step = Math.max(Math.abs(gap) * 0.1, 0.1);
        o.wallGrow = Math.abs(gap) <= step ? t.grow : now + Math.sign(gap) * step;
    }
    o.wallView = t.view;
    t.grow = 0;
    t.view = 1;
    if (!t.lockSeen) t.lock = null;
    t.lockSeen = false;
    if (!t.stickHit) t.stickAge = 0;
    t.stickHit = false;
    t.stickActed = false;
}

function wallHurt(o, share) {
    let dmg = o.health.max * share;
    if (!(dmg > 0)) return;
    let held = Math.min(Math.max(0, o.shield.amount), dmg);
    o.shield.amount -= held;
    o.health.amount -= dmg - held;
}

function wallHeal(o, share) {
    let amount = o.health.max * share,
        give = Math.min(Math.max(0, o.health.max - o.health.amount), amount);
    o.health.amount += give;
    if (amount > give && o.shield.max > 0) o.shield.amount = Math.min(o.shield.max, o.shield.amount + amount - give);
}

function wallThrow(o, nx, ny, speed, tank) {
    let vn = o.velocity.x * nx + o.velocity.y * ny;
    if (vn < 0) {
        o.velocity.x -= nx * vn;
        o.velocity.y -= ny * vn;
    }
    if (!tank) {
        o.velocity.x += nx * speed;
        o.velocity.y += ny * speed;
        return;
    }
    let out = o.velocity.x * nx + o.velocity.y * ny;
    if (out < speed) {
        o.velocity.x += nx * (speed - out);
        o.velocity.y += ny * (speed - out);
    }
}

function stopInto(o, nx, ny, both) {
    let vn = o.velocity.x * nx + o.velocity.y * ny;
    if (both || vn < 0) {
        o.velocity.x -= nx * vn;
        o.velocity.y -= ny * vn;
    }
}

function stickLawTick(wall, half, o, age) {
    let law = stickLaw,
        dx = o.x - wall.x, dy = o.y - wall.y,
        sx = dx < 0 ? -1 : 1, sy = dy < 0 ? -1 : 1,
        ox = dx * sx - half, oy = dy * sy - half,
        r = o.size, v = o.velocity, a = o.accel;
    if (ox > 0 && oy > 0) {
        let dist = Math.hypot(ox, oy);
        if (!(dist < r) || dist < 1e-9) return;
        let ux = sx * ox / dist, uy = sy * oy / dist, tx = -uy, ty = ux,
            bt = v.x * tx + v.y * ty;
        if (bt < 0) {
            tx = -tx;
            ty = -ty;
            bt = -bt;
        }
        let br = v.x * ux + v.y * uy, dc = r - dist, out = Math.max(br, 0), into = Math.min(br, 0),
            radial = law.rp * out + law.rn * into + law.rd * (dc - law.r0),
            round = law.tt * bt + law.tp * out + law.tn * into + law.td * (dc - law.t0) * (bt < law.turnSpeed ? bt / law.turnSpeed : 1);
        v.x = ux * radial + tx * round;
        v.y = uy * radial + ty * round;
        return;
    }
    let onX = ox > oy, nx = onX ? sx : 0, ny = onX ? 0 : sy, d = r - (onX ? ox : oy);
    if (d <= 0) return;
    let bn = v.x * nx + v.y * ny, tvx = v.x - nx * bn, tvy = v.y - ny * bn, an = a.x * nx + a.y * ny;
    if (an < 0 && d > law.din) {
        a.x -= nx * an;
        a.y -= ny * an;
    }
    if (age === 1) bn -= law.pull;
    else if (age === 2 && bn < -law.cap) bn = -law.cap;
    if (age >= 2 && bn > 0) {
        let along = Math.hypot(tvx, tvy);
        if (along > 1e-9) {
            let grow = 1 + law.outTurn * bn * (along < law.turnSpeed ? along / law.turnSpeed : 1) / along;
            tvx *= grow;
            tvy *= grow;
        }
        bn = law.outKeep * bn - (d < law.rest ? law.k * (law.rest - d) : 0);
    }
    if (d > law.rest && an >= 0 && bn < law.drift) bn = law.drift;
    v.x = tvx + nx * bn;
    v.y = tvy + ny * bn;
}

function oneWayOpen(rule, dx, dy, reach, r, o) {
    let along = dx * rule.ax + dy * rule.ay, side = dx * -rule.ay + dy * rule.ax;
    if (Math.abs(side) > reach) return false;
    return along <= reach || (along < reach + r && o.velocity.x * rule.ax + o.velocity.y * rule.ay > 0);
}

function wallPortal(wall, o, t) {
    o.velocity.x *= portalKeep;
    o.velocity.y *= portalKeep;
    o.x += (wall.x - o.x) * portalDraw;
    o.y += (wall.y - o.y) * portalDraw;
    let dx = o.x - wall.x, dy = o.y - wall.y;
    if (dx * dx + dy * dy > portalCatch * portalCatch) return;
    let slot = colorSlot(wall.color.base),
        others = walls.filter(w => w !== wall && !w.isGhost && w.walltype === wall.walltype && colorSlot(w.color.base) === slot);
    t.lockSeen = true;
    if (!others.length) {
        t.lock = wall;
        if (o.socket) o.sendMessage("There is no portal to travel to.");
        return;
    }
    let dest = ran.choose(others), ux = o.velocity.x, uy = o.velocity.y, length = Math.hypot(ux, uy);
    if (!(length > 1e-6)) {
        ux = dx;
        uy = dy;
        length = Math.hypot(ux, uy);
    }
    if (!(length > 1e-6)) {
        ux = 1;
        uy = 0;
        length = 1;
    }
    let out = dest.size * lazyRealSizes[4] / Math.SQRT2 + wallInset + portalOut;
    o.x = dest.x + ux / length * out;
    o.y = dest.y + uy / length * out;
    t.lock = dest;
    if (o.socket) o.sendMessage("You have traveled through a portal!");
}

function roundMeetsWall(wall, o, rule, reach, nx, ny, depth) {
    if (depth <= 0 || rule.round === "pass") return;
    if (rule.round === "stick") {
        let want = Math.min(stickRest, o.size + reach);
        if (depth > want) {
            o.x += nx * (depth - want) * stickSettle;
            o.y += ny * (depth - want) * stickSettle;
        }
        stopInto(o, nx, ny, true);
        return;
    }
    if (rule.round !== "stop" && rule.round !== "bounce") return o.destroy();
    o.x += nx * depth;
    o.y += ny * depth;
    if (rule.round === "stop") return stopInto(o, nx, ny, false);
    let vn = o.velocity.x * nx + o.velocity.y * ny;
    if (vn < 0) {
        o.velocity.x -= 2 * nx * vn;
        o.velocity.y -= 2 * ny * vn;
    }
    let out = o.velocity.x * nx + o.velocity.y * ny;
    if (out < rule.bounce) {
        o.velocity.x += nx * (rule.bounce - out);
        o.velocity.y += ny * (rule.bounce - out);
    }
}

function mazewallcustomcollide(wall, bounce) {
    /* By LA3T */
    if (!bounce || bounce.ac || bounce.passive || bounce.god === true || bounce.store.noWallCollision || wall.intangibility) return;
    let rule = global.wallTypes[(wall.walltype ?? 1) - 1] ?? global.wallTypes[0],
        half = wall.size * lazyRealSizes[4] / Math.SQRT2,
        reach = half + wallInset,
        r = bounce.size,
        dx = bounce.x - wall.x,
        dy = bounce.y - wall.y,
        ox = Math.abs(dx) - reach,
        oy = Math.abs(dy) - reach,
        sx = dx < 0 ? -1 : 1,
        sy = dy < 0 ? -1 : 1,
        nx = 0,
        ny = 0,
        depth;
    if (ox > 0 && oy > 0) {
        let dist = Math.hypot(ox, oy);
        nx = sx * ox / dist;
        ny = sy * oy / dist;
        depth = r - dist;
    } else if (ox > oy) {
        nx = sx;
        depth = r - ox;
    } else {
        ny = sy;
        depth = r - oy;
    }
    if (depth <= -1) return;
    if (!["tank", "miniboss", "food", "crasher", "satellite"].includes(bounce.type)) return roundMeetsWall(wall, bounce, rule, reach, nx, ny, depth);
    let t = wallTouchOf(bounce),
        tank = bounce.type === "tank" || bounce.type === "miniboss",
        spared = bounce.godmode || bounce.invuln || bounce.isInvulnerable,
        inside = ox <= 0 && oy <= 0,
        open = false;
    if (wall === t.lock) t.lockSeen = true;
    switch (rule.body) {
        case "pass":
        case "sticky":
            open = true;
            break;
        case "color":
            open = colorSlot(bounce.color.base) === colorSlot(wall.color.base);
            break;
        case "team":
            open = bounce.team === wall.team;
            break;
        case "oneWay":
            open = oneWayOpen(rule, dx, dy, reach, r, bounce);
            break;
    }
    if (rule.body === "oneWay" && open) {
        if (depth <= 0) return;
        let along = dx * rule.ax + dy * rule.ay,
            side = dx * -rule.ay + dy * rule.ax,
            offCentre = Math.abs(along) < half && Math.abs(side) < half && Math.abs(side) - half > Math.abs(along) - half;
        if (offCentre) {
            bounce.velocity.x += rule.ax * oneWaySide;
            bounce.velocity.y += rule.ay * oneWaySide;
        } else {
            let a = along + r + half, b = half - along + r, most = Math.min(2 * r, 2 * half);
            if (a > 0 && b > 0) {
                let move = oneWayPush * (a < b ? Math.min(a, most) : Math.min(b, most));
                bounce.x += rule.ax * move;
                bounce.y += rule.ay * move;
            }
        }
        stopInto(bounce, -rule.ay, rule.ax, true);
        if (inside && !spared) wallHurt(bounce, wallCrush);
        return;
    }
    if (rule.body === "sticky") {
        if (depth - wallInset <= 0) return;
        if (!tank) {
            let want = Math.min(stickRest, r + half);
            bounce.x += nx * (depth - wallInset - want) * stickSettle;
            bounce.y += ny * (depth - wallInset - want) * stickSettle;
            stopInto(bounce, nx, ny, true);
            return;
        }
        t.stickHit = true;
        if (t.stickActed) return;
        t.stickActed = true;
        let age = t.stickAge + 1;
        if (age > 1 && Math.hypot(bounce.x - t.stickX - t.stickVx, bounce.y - t.stickY - t.stickVy) > 8) age = 1;
        stickLawTick(wall, half, bounce, age);
        t.stickAge = age;
        t.stickX = bounce.x;
        t.stickY = bounce.y;
        t.stickVx = bounce.velocity.x + bounce.accel.x;
        t.stickVy = bounce.velocity.y + bounce.accel.y;
        return;
    }
    if (open) {
        if (rule.portal && inside && wall !== t.lock) wallPortal(wall, bounce, t);
        else if (rule.checkpoint && bounce.socket && bounce.socket.checkpoint !== wall) {
            bounce.socket.checkpoint = wall;
            bounce.sendMessage("Respawn point set.");
        }
        return;
    }
    if (depth > 0) {
        bounce.x += nx * depth;
        bounce.y += ny * depth;
        stopInto(bounce, nx, ny, false);
    }
    if (rule.grow) t.grow += rule.grow;
    if (rule.view) t.view = Math.max(t.view, rule.view);
    if (rule.paint) paintBody(bounce, wall.color.base);
    if (rule.team && bounce.team !== wall.team && (tank || (wall.team !== TEAM_ENEMIES && wall.team !== TEAM_ROOM))) bounce.team = wall.team;
    if (rule.hit && !spared) wallHurt(bounce, rule.hit);
    if (rule.heal) wallHeal(bounce, rule.heal);
    if (rule.bounce) wallThrow(bounce, nx, ny, rule.bounce, tank);
}
module.exports = {
    shapeKnockBody,
    simplecollide,
    dronecollide,
    blockcollide,
    teamcollide,
    isTankBody,
    firmcollide,
    firmcollidehard,
    reflectcollide,
    advancedcollide,
    mooncollide,
    mazewallcollide,
    mazewallcustomcollide,
    wallTouchTick
};
