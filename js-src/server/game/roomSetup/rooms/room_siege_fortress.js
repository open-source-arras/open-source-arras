const {
    normal: ____,
    sbase1: sanc,
    outBorder: X__X,
    stopAI: i__i,
    bossSpawn: boss,
    bossSpawnVoid: spwn
} = tileClass;  

let room_siege_fortress = [
    [ X__X, X__X, X__X, X__X, X__X, X__X, spwn, spwn, X__X, X__X, X__X, X__X, X__X, X__X, ],
    [ X__X, X__X, X__X, X__X, X__X, X__X, X__X, X__X, X__X, X__X, X__X, X__X, X__X, X__X, ],
    [ X__X, X__X, ____, ____, ____, ____, boss, boss, ____, ____, ____, ____, X__X, X__X, ],
    [ X__X, X__X, ____, ____, ____, ____, i__i, i__i, ____, ____, ____, ____, X__X, X__X, ],
    [ X__X, X__X, ____, ____, sanc, ____, ____, ____, ____, sanc, ____, ____, X__X, X__X, ],
    [ X__X, X__X, ____, ____, ____, ____, ____, ____, ____, ____, ____, ____, X__X, X__X, ],
    [ spwn, X__X, boss, i__i, ____, ____, ____, ____, ____, ____, i__i, boss, X__X, spwn, ],
    [ spwn, X__X, boss, i__i, ____, ____, ____, ____, ____, ____, i__i, boss, X__X, spwn, ],
    [ X__X, X__X, ____, ____, ____, ____, ____, ____, ____, ____, ____, ____, X__X, X__X, ],
    [ X__X, X__X, ____, ____, sanc, ____, ____, ____, ____, sanc, ____, ____, X__X, X__X, ],
    [ X__X, X__X, ____, ____, ____, ____, i__i, i__i, ____, ____, ____, ____, X__X, X__X, ],
    [ X__X, X__X, ____, ____, ____, ____, boss, boss, ____, ____, ____, ____, X__X, X__X, ],
    [ X__X, X__X, X__X, X__X, X__X, X__X, X__X, X__X, X__X, X__X, X__X, X__X, X__X, X__X, ],
    [ X__X, X__X, X__X, X__X, X__X, X__X, spwn, spwn, X__X, X__X, X__X, X__X, X__X, X__X, ],
]
module.exports = room_siege_fortress;