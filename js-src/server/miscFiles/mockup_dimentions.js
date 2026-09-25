function getDimensionsForTurrets(Dentity) { // This is specialy made for turrets, the current dimensions handler does not like turrets
    let endPoints;
    function getFurthestFrom(x, y) {
        let furthestDistance = 0,
            furthestPoint = [x, y],
            furthestIndex = 0;
        for (let i = 0; i < endPoints.length; i++) {
            let point = endPoints[i];
            let distance = (point[0] - x) ** 2 + (point[1] - y) ** 2;
            if (distance > furthestDistance) {
                furthestDistance = distance;
                furthestPoint = point;
                furthestIndex = i;
            }
        }
        endPoints.splice(furthestIndex, 1);
        return [util.rounder(furthestPoint[0]), util.rounder(furthestPoint[1])];
    }

    function checkIfSamePoint(p1, p2) {
        return p1[0] == p2[0] && p1[1] == p2[1];
    }

    function checkIfOnLine(endpoint1, endpoint2, checkPoint) {
        let xDiff = endpoint2[0] - endpoint1[0],
            yDiff = endpoint2[1] - endpoint1[1];
        
        // Endpoints on the same vertical line
        if (xDiff == 0) {
            return (checkPoint[0] == endpoint1[0]);
        }

        let slope = yDiff / xDiff,
            xLengthToCheck = checkPoint[0] - endpoint1[0],
            predictedY = endpoint1[1] + xLengthToCheck * slope;
        // Check point is on the line with a small margin
        return Math.abs(checkPoint[1] - predictedY) <= 1e-5;
    }

    function getDimensions(entity) {
        // Begin processing from the main body
        endPoints = [];
        sizeEntity(entity);

        // Convert to useful info
        endPoints.sort((a, b) => (b[0] ** 2 + b[1] ** 2 - a[0] ** 2 - a[1] ** 2));
        let point1 = getFurthestFrom(0, 0),
            point2 = getFurthestFrom(...point1);
        
        // Repeat selecting the second point until at least one of the first two points is off the centerline
        while ((point1[0] == 0 && point2[0] == 0 || point1[1] == 0 && point2[1] == 0) && entity.shape != 4) {
            point2 = getFurthestFrom(...point1);
        }

        let avgX = (point1[0] + point2[0]) / 2,
            avgY = (point1[1] + point2[1]) / 2,
            point3 = getFurthestFrom(avgX, avgY);
        
        // Repeat selecting the third point until it's actually different from the other points, and it's not collinear with them
        while (checkIfSamePoint(point3, point1) || checkIfSamePoint(point3, point2) || checkIfOnLine(point1, point2, point3)) {
            point3 = getFurthestFrom(avgX, avgY);
        }
        
        let {x, y, r} = constructCircumcirle(point1, point2, point3);

        return {
            axis: r * 2,
            middle: {x, y},
        };
    }

    // Find circumcircle and circumcenter
    function constructCircumcirle(point1, point2, point3) {
        // util.rounder to avoid floating point nonsense
        let x1 = util.rounder(point1[0]);
        let y1 = util.rounder(point1[1]);
        let x2 = util.rounder(point2[0]);
        let y2 = util.rounder(point2[1]);
        let x3 = util.rounder(point3[0]);
        let y3 = util.rounder(point3[1]);

        // Invalid math protection
        if (x3 == x1 || x3 == x2) {
            x3 += 1e-5;
        }
        
        let numer1 = x3 ** 2 + y3 ** 2 - x1 ** 2 - y1 ** 2;
        let numer2 = x2 ** 2 + y2 ** 2 - x1 ** 2 - y1 ** 2;
        let factorX1 = 2 * x2 - 2 * x1;
        let factorX2 = 2 * x3 - 2 * x1;
        let factorY1 = 2 * y1 - 2 * y2;
        let factorY2 = 2 * y1 - 2 * y3;
        let y = (numer1 * factorX1 - numer2 * factorX2) / (factorY1 * factorX2 - factorY2 * factorX1);
        let x = ((y - y3) ** 2 - (y - y1) ** 2 - x1 ** 2 + x3 ** 2) / factorX2;
        let r = Math.sqrt(Math.pow(x - x1, 2) + Math.pow(y - y1, 2));

        return {x, y, r};
    }

    const sidesMax = 16;
    function sizeEntity(entity, x = 0, y = 0, angle = 0, scale = 1) {    
        // Process body as a polygon with [sidesMax] sides if it has at least that many or less than three sides
        if (entity.shape < 3 || entity.shape >= sidesMax) {
            for (let i = 0; i < sidesMax; i++) {
                let theta = Math.PI * 2 / sidesMax * i;
                endPoints.push([x + Math.cos(theta) * scale, y + Math.sin(theta) * scale]);
            }
        } else {
            // Process body as true size and shape otherwise
            let angleOffset = (entity.shape % 1) * 2 * Math.PI;
            let numSides = Math.floor(entity.shape);
            for (let i = 0; i < numSides; i++) {
                let theta = 2 * Math.PI / numSides * i + angleOffset;
                endPoints.push([x + Math.cos(theta) * scale * lazyRealSizes[numSides], y + Math.sin(theta) * scale * lazyRealSizes[numSides]]);
            }
        }
        
        // Process guns
        for (let g of entity.guns) {
            // Construct a trapezoid at angle 0
            let widths = g.aspect > 0 ? [g.width * g.aspect / 2, g.width / 2] : [g.width / 2, -g.width * g.aspect / 2],
                points = [],
                sinT = Math.sin(g.angle + angle),
                cosT = Math.cos(g.angle + angle);
            points.push([0, widths[1]]);
            points.push([g.length, widths[0]]);
            points.push([g.length, -widths[0]]);
            points.push([0, -widths[1]]);
        
            for (let point of points) {
                // Rotate it to the new angle via vector rotation
                let newX = point[0] * cosT - point[1] * sinT,
                    newY = point[0] * sinT + point[1] * cosT;
                // Translate it to the right position
                newX += g.offset * Math.cos(g.direction + g.angle + angle);
                newY += g.offset * Math.sin(g.direction + g.angle + angle);
                // Save coords
                endPoints.push([x + newX * scale, y + newY * scale]);
            }
        }

        // Process turrets and props
        let turretsAndProps = entity.turrets.concat(entity.props);
        for (let t of turretsAndProps) {
            let trueAngle = angle + t.bound.angle,
                xShift = t.bound.offset * Math.cos(t.bound.direction + trueAngle),
                yShift = t.bound.offset * Math.sin(t.bound.direction + trueAngle);
            sizeEntity(t, x + xShift * scale, y + yShift * scale, trueAngle, t.bound.size * scale);
        }
    }
    return getDimensions(Dentity);
}

function getDimensionsNormal(Dentity) {
    // Minimum enclosing circle via Welzl's algorithm
    function welzlMEC(P, R) {
        if (P.length === 0 || R.length === 3) {
            if (R.length === 0) return { x: 0, y: 0, r: 0 };
            if (R.length === 1) return { x: R[0][0], y: R[0][1], r: 0 };
            if (R.length === 2) {
                let cx = (R[0][0] + R[1][0]) / 2, cy = (R[0][1] + R[1][1]) / 2;
                return { x: cx, y: cy, r: Math.hypot(R[0][0] - R[1][0], R[0][1] - R[1][1]) / 2 };
            }
            return constructCircumcirle(R[0], R[1], R[2]);
        }
        let p = P[P.length - 1];
        let d = welzlMEC(P.slice(0, -1), R);
        if (Math.hypot(p[0] - d.x, p[1] - d.y) <= d.r + 1e-10) return d;
        return welzlMEC(P.slice(0, -1), [...R, p]);
    }

    function getDimensions(entity) {
        endPoints = [];
        sizeEntity(entity);

        // Shuffle for expected O(n) performance
        for (let i = endPoints.length - 1; i > 0; i--) {
            let j = Math.floor(Math.random() * (i + 1));
            [endPoints[i], endPoints[j]] = [endPoints[j], endPoints[i]];
        }

        let { x, y, r } = welzlMEC(endPoints, []);
        return {
            axis: r * 2,
            middle: { x, y },
        };
    }

    // Find circumcircle and circumcenter
    function constructCircumcirle(point1, point2, point3) {
        // util.rounder to avoid floating point nonsense
        let x1 = util.rounder(point1[0]);
        let y1 = util.rounder(point1[1]);
        let x2 = util.rounder(point2[0]);
        let y2 = util.rounder(point2[1]);
        let x3 = util.rounder(point3[0]);
        let y3 = util.rounder(point3[1]);

        // Invalid math protection
        if (x3 == x1 || x3 == x2) {
            x3 += 1e-5;
        }
        
        let numer1 = x3 ** 2 + y3 ** 2 - x1 ** 2 - y1 ** 2;
        let numer2 = x2 ** 2 + y2 ** 2 - x1 ** 2 - y1 ** 2;
        let factorX1 = 2 * x2 - 2 * x1;
        let factorX2 = 2 * x3 - 2 * x1;
        let factorY1 = 2 * y1 - 2 * y2;
        let factorY2 = 2 * y1 - 2 * y3;
        let y = (numer1 * factorX1 - numer2 * factorX2) / (factorY1 * factorX2 - factorY2 * factorX1);
        let x = ((y - y3) ** 2 - (y - y1) ** 2 - x1 ** 2 + x3 ** 2) / factorX2;
        let r = Math.sqrt(Math.pow(x - x1, 2) + Math.pow(y - y1, 2));

        return {x, y, r};
    }

    const sidesMax = 16;
    function sizeEntity(entity, x = 0, y = 0, angle = 0, scale = 1) {    
        // Process body as a polygon with [sidesMax] sides if it has at least that many or less than three sides
        if (entity.shape < 3 || entity.shape >= sidesMax) {
            for (let i = 0; i < sidesMax; i++) {
                let theta = Math.PI * 2 / sidesMax * i;
                endPoints.push([x + Math.cos(theta) * scale, y + Math.sin(theta) * scale]);
            }
        } else {
            // Process body as true size and shape otherwise
            let angleOffset = (entity.shape % 1) * 2 * Math.PI;
            let numSides = Math.floor(entity.shape);
            for (let i = 0; i < numSides; i++) {
                let theta = 2 * Math.PI / numSides * i + angleOffset;
                endPoints.push([x + Math.cos(theta) * scale * lazyRealSizes[numSides], y + Math.sin(theta) * scale * lazyRealSizes[numSides]]);
            }
        }
        
        // Process guns
        for (let g of entity.guns) {
            // Construct a trapezoid at angle 0
            let widths = g.aspect > 0 ? [g.width * g.aspect / 2, g.width / 2] : [g.width / 2, -g.width * g.aspect / 2],
                points = [],
                sinT = Math.sin(g.angle + angle),
                cosT = Math.cos(g.angle + angle);
            points.push([0, widths[1]]);
            points.push([g.length, widths[0]]);
            points.push([g.length, -widths[0]]);
            points.push([0, -widths[1]]);
        
            for (let point of points) {
                // Rotate it to the new angle via vector rotation
                let newX = point[0] * cosT - point[1] * sinT,
                    newY = point[0] * sinT + point[1] * cosT;
                // Translate it to the right position
                newX += g.offset * Math.cos(g.direction + g.angle + angle);
                newY += g.offset * Math.sin(g.direction + g.angle + angle);
                // Save coords
                endPoints.push([x + newX * scale, y + newY * scale]);
            }
        }

        // Process turrets and props
        let turretsAndProps = entity.turrets.concat(entity.props);
        for (let t of turretsAndProps) {
            let trueAngle = angle + t.bound.angle,
                xShift = t.bound.offset * Math.cos(t.bound.direction + trueAngle),
                yShift = t.bound.offset * Math.sin(t.bound.direction + trueAngle);
            sizeEntity(t, x + xShift * scale, y + yShift * scale, trueAngle, t.bound.size * scale);
        }
    }

    return getDimensions(Dentity);
}

function getDimensions(entity) {
    let turretsAndProps = entity.turrets.concat(entity.props);
    if (turretsAndProps.length !== 0) return getDimensionsForTurrets(entity);
    return getDimensionsNormal(entity);
}

module.exports = { getDimensions };