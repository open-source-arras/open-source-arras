const {
    normal: ____,
    sbase1: sanc,
    wall: WALL,
    outBorder: X__X,
    atmg: atmg,
    bossSpawn: boss
} = tileClass;  

let room_siege_classic = [
    [X__X, X__X, X__X, X__X, X__X, X__X, X__X, WALL, WALL, WALL, WALL, WALL, X__X, X__X, X__X, X__X, X__X, X__X, X__X],
    [X__X, atmg, X__X, X__X, X__X, X__X, X__X, WALL, X__X, X__X, X__X, WALL, X__X, X__X, X__X, X__X, X__X, atmg, X__X],
    [X__X, X__X, X__X, X__X, X__X, X__X, X__X, WALL, boss, boss, boss, WALL, X__X, X__X, X__X, X__X, X__X, X__X, X__X],
    [X__X, X__X, X__X, X__X, WALL, WALL, WALL, WALL, boss, boss, boss, WALL, WALL, WALL, WALL, X__X, X__X, X__X, X__X],
    [X__X, X__X, X__X, WALL, WALL, ____, ____, WALL, ____, ____, ____, WALL, ____, ____, WALL, WALL, X__X, X__X, X__X],
    [X__X, X__X, X__X, WALL, ____, ____, ____, ____, ____, ____, ____, ____, ____, ____, ____, WALL, X__X, X__X, X__X],
    [X__X, X__X, X__X, WALL, ____, ____, sanc, ____, ____, sanc, ____, ____, sanc, ____, ____, WALL, X__X, X__X, X__X],
    [WALL, WALL, WALL, WALL, WALL, ____, ____, ____, ____, ____, ____, ____, ____, ____, WALL, WALL, WALL, WALL, WALL],
    [WALL, X__X, boss, boss, ____, ____, ____, ____, ____, ____, ____, ____, ____, ____, ____, boss, boss, X__X, WALL],
    [WALL, X__X, boss, boss, ____, ____, sanc, ____, ____, ____, ____, ____, sanc, ____, ____, boss, boss, X__X, WALL],
    [WALL, X__X, boss, boss, ____, ____, ____, ____, ____, ____, ____, ____, ____, ____, ____, boss, boss, X__X, WALL],
    [WALL, WALL, WALL, WALL, WALL, ____, ____, ____, ____, ____, ____, ____, ____, ____, WALL, WALL, WALL, WALL, WALL],
    [X__X, X__X, X__X, WALL, ____, ____, sanc, ____, ____, sanc, ____, ____, sanc, ____, ____, WALL, X__X, X__X, X__X],
    [X__X, X__X, X__X, WALL, ____, ____, ____, ____, ____, ____, ____, ____, ____, ____, ____, WALL, X__X, X__X, X__X],
    [X__X, X__X, X__X, WALL, WALL, ____, ____, WALL, ____, ____, ____, WALL, ____, ____, WALL, WALL, X__X, X__X, X__X],
    [X__X, X__X, X__X, X__X, WALL, WALL, WALL, WALL, boss, boss, boss, WALL, WALL, WALL, WALL, X__X, X__X, X__X, X__X],
    [X__X, X__X, X__X, X__X, X__X, X__X, X__X, WALL, boss, boss, boss, WALL, X__X, X__X, X__X, X__X, X__X, X__X, X__X],
    [X__X, atmg, X__X, X__X, X__X, X__X, X__X, WALL, X__X, X__X, X__X, WALL, X__X, X__X, X__X, X__X, X__X, atmg, X__X],
    [X__X, X__X, X__X, X__X, X__X, X__X, X__X, WALL, WALL, WALL, WALL, WALL, X__X, X__X, X__X, X__X, X__X, X__X, X__X]
];

module.exports = room_siege_classic;