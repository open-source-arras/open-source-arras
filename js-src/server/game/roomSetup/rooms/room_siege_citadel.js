const {
    normal: ____,
    sbase1: sanc,
    outBorder: X__X,
    stopAI: i__i,
    bossSpawn: boss,
    bossSpawnVoid: spwn
} = tileClass;  

let room_siege_fortress = [
    [ spwn, spwn, X__X, X__X, X__X, X__X, X__X, X__X, X__X, X__X, X__X, spwn, spwn, ],
    [ spwn, ____, ____, ____, ____, ____, ____, ____, ____, ____, ____, ____, spwn, ],
    [ X__X, ____, boss, boss, ____, ____, ____, ____, ____, boss, boss, ____, X__X, ],
    [ X__X, ____, boss, i__i, ____, ____, ____, ____, ____, i__i, boss, ____, X__X, ],
    [ X__X, ____, ____, ____, ____, ____, sanc, ____, ____, ____, ____, ____, X__X, ],
    [ X__X, ____, ____, ____, ____, ____, ____, ____, ____, ____, ____, ____, X__X, ],
    [ X__X, ____, ____, ____, sanc, ____, ____, ____, sanc, ____, ____, ____, X__X, ],
    [ X__X, ____, ____, ____, ____, ____, ____, ____, ____, ____, ____, ____, X__X, ],
    [ X__X, ____, ____, ____, ____, ____, sanc, ____, ____, ____, ____, ____, X__X, ],
    [ X__X, ____, boss, i__i, ____, ____, ____, ____, ____, i__i, boss, ____, X__X, ],
    [ X__X, ____, boss, boss, ____, ____, ____, ____, ____, boss, boss, ____, X__X, ],
    [ spwn, ____, ____, ____, ____, ____, ____, ____, ____, ____, ____, ____, spwn, ],
    [ spwn, spwn, X__X, X__X, X__X, X__X, X__X, X__X, X__X, X__X, X__X, spwn, spwn, ],
]
module.exports = room_siege_fortress;