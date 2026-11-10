const SLIDE_TIME = 0.7;
const SKILL_SEGMENT = 194 / 9;
const SKILL_START = 30.5;
const SKILL_TRACK_LEFT = 25;
const SKILL_TRACK_RADIUS = 5.5;
const KILL_WORTH = 35000;
const BOSS_KILL_WORTH = 70000;
const LEADERBOARD_CURVE = 0.85;
const LEADERBOARD_PITCH = 19;
const LEADERBOARD_SLIDE = 300;
const LEADERBOARD_BLEND = 250;
const LEADERBOARD_EXIT = 4000;
const LEADERBOARD_LABEL = 204;
const NUMBER_SHAPES = ["8", "88", "888", "8.88k", "88.88k", "888.8k", "8.88m", "88.88m", "888.8m", "8.88b"];

function ease(distance, time) {
    if (distance <= 1) {
        let q = Math.pow(distance, 0.2) - time;
        return q > 0 ? Math.pow(q, 5) : 0;
    }
    let l = Math.log(distance),
        e = l - 5 * time;
    if (e >= 0) return Math.exp(e);
    let q = l / 5 + 1 - time;
    return q > 0 ? Math.pow(q, 5) : 0;
}

function slideStep(shown, target, seconds) {
    let gap = shown - target;
    if (gap === 0) return target;
    return target + Math.sign(gap) * ease(Math.abs(gap), seconds > 0 ? seconds / SLIDE_TIME : 0);
}

function commas(n) {
    let value = Math.trunc(n),
        negative = value < 0,
        text = String(negative ? -value : value);
    for (let i = text.length - 3; i > 0; i -= 3) text = text.slice(0, i) + "," + text.slice(i);
    return negative ? "-" + text : text;
}

function abbreviate(n) {
    if (n < 1000) return String(n);
    if (n >= 1e9) {
        let millions = Math.floor(n / 1e6),
            hundredths = Math.floor((millions % 1000) / 10);
        return `${Math.floor(millions / 1000)}.${hundredths < 10 ? "0" : ""}${hundredths}b`;
    }
    let scaled = n >= 1e6 ? Math.floor(n / 1000) : n,
        unit = n >= 1e6 ? "m" : "k",
        rest = scaled % 1000;
    if (scaled <= 99999) {
        let hundredths = Math.floor(rest / 10);
        return `${Math.floor(scaled / 1000)}.${hundredths < 10 ? "0" : ""}${hundredths}${unit}`;
    }
    return `${Math.floor(scaled / 1000)}.${Math.floor(rest / 100)}${unit}`;
}

function numberShape(n) {
    if (n < 1000) return n < 10 ? 0 : n < 100 ? 1 : 2;
    if (n >= 1e9) return 9;
    if (n < 1e6) return n < 10000 ? 3 : n < 100000 ? 4 : 5;
    return n < 1e7 ? 6 : n < 1e8 ? 7 : 8;
}

function killFill(kills, bossKills, score) {
    if (kills === 0 && bossKills === 0) return 0;
    let fill = (KILL_WORTH * kills + BOSS_KILL_WORTH * bossKills) / score;
    return fill < 1 ? fill : 1;
}

function killText(kills, assists, bossKills) {
    return assists === 0 && bossKills === 0
        ? "Kills: " + commas(kills)
        : "Kills: " + commas(kills) + "/" + commas(assists) + "/" + commas(bossKills);
}

function skillFillEnd(level) {
    let x = SKILL_TRACK_LEFT + SKILL_SEGMENT * level - SKILL_TRACK_RADIUS;
    return x > SKILL_START ? x : SKILL_START;
}

function skillPreview(level, segment, points, max) {
    if (points <= 0 || level >= max) return level;
    let want = segment + 1 > level + 1 ? segment + 1 : level + 1,
        cap = level + points < max ? level + points : max;
    return want < cap ? want : cap;
}

function skillHideDistance(max) {
    return 1.2 * SKILL_SEGMENT * max + 80;
}

function blendValue(old, now, stamp, clock) {
    if (!stamp) return now;
    let age = clock > stamp ? clock - stamp : 0;
    if (age < LEADERBOARD_BLEND) {
        let t = age / LEADERBOARD_BLEND;
        return (1 - t) * old + t * now;
    }
    return now;
}

function fitName(name, room, measure) {
    if (name === "" || measure(name) <= room) return name;
    let characters = Array.from(name),
        low = 1,
        high = characters.length - 1,
        best = 1;
    while (low <= high) {
        let middle = (low + high) >> 1;
        if (measure(characters.slice(0, middle).join("").trimEnd() + "...") <= room) {
            best = middle;
            low = middle + 1;
        } else high = middle - 1;
    }
    let cut = characters.slice(0, best).join("").trimEnd() + "...";
    return measure(cut) < measure(name) ? cut : name;
}

function leaderboardPrefix(name, tank, number, measure) {
    let rest = (name ? " - " : "") + tank + ": ";
    if (!name) return rest;
    let room = LEADERBOARD_LABEL - measure(NUMBER_SHAPES[numberShape(number)]) - measure(rest);
    return fitName(name, room, measure) + rest;
}

class LeaderboardBoard {
    constructor() {
        this.rows = new Map();
        this.held = [];
        this.generation = 0;
    }
    update(list, clock, make) {
        let generation = ++this.generation;
        for (let i = 0; i < list.length; i++) {
            let entry = list[i],
                row = this.rows.get(entry.id);
            if (!row) {
                row = make(entry);
                row.old = 0;
                row.now = entry.score;
                row.stamp = clock || 1;
                row.rank = row.rankTo = i;
                row.offset = 1;
                row.offsetTo = 0;
                row.leaving = false;
                row.leftAt = 0;
                row.shown = 0;
                this.rows.set(entry.id, row);
            } else {
                if (!Object.is(entry.score, row.now)) {
                    row.old = blendValue(row.old, row.now, row.stamp, clock);
                    row.now = entry.score;
                    row.stamp = clock || 1;
                }
                row.entry = entry;
                row.rankTo = i;
                row.offsetTo = 0;
                row.leaving = false;
            }
            row.seen = generation;
        }
        this.held.length = 0;
        for (let [id, row] of this.rows) {
            if (row.seen !== generation) {
                if (!row.leaving) {
                    row.leaving = true;
                    row.leftAt = clock;
                    row.offsetTo = 1;
                } else if (clock - row.leftAt >= LEADERBOARD_EXIT) {
                    this.rows.delete(id);
                    continue;
                }
            }
            this.held.push(row);
        }
    }
    step(seconds) {
        let left = seconds > 0 ? Math.pow(LEADERBOARD_CURVE, 60 * seconds) : 1;
        for (let row of this.held) {
            if (row.rank !== row.rankTo) {
                let gap = (row.rank - row.rankTo) * left;
                row.rank = Math.abs(gap) * LEADERBOARD_PITCH < 0.01 ? row.rankTo : row.rankTo + gap;
            }
            if (row.offset !== row.offsetTo) {
                let gap = (row.offset - row.offsetTo) * left;
                row.offset = Math.abs(gap) * LEADERBOARD_SLIDE < 0.01 ? row.offsetTo : row.offsetTo + gap;
            }
        }
    }
    fold(clock) {
        let max = 1;
        for (let row of this.held) {
            row.shown = blendValue(row.old, row.now, row.stamp, clock);
            if (row.shown > max) max = row.shown;
        }
        return max;
    }
    titleOffset() {
        let offset = 1;
        for (let row of this.held) if (row.offset < offset) offset = row.offset;
        return offset;
    }
}

export {
    ease, slideStep, commas, abbreviate, killFill, killText, skillFillEnd, skillPreview, skillHideDistance, blendValue,
    fitName, leaderboardPrefix, LeaderboardBoard, SKILL_SEGMENT, SKILL_START, SKILL_TRACK_LEFT, SKILL_TRACK_RADIUS,
    LEADERBOARD_PITCH, LEADERBOARD_SLIDE
};
