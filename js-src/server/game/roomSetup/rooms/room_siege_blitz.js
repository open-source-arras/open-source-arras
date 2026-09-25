const {
    normal: ____,
    sbase1: sanc,
    outBorder: X__X,
    bossSpawn: boss,
    bossSpawnVoid: spwn
} = tileClass;  

let room_siege_blitz = [
    [ X__X, X__X, X__X, X__X, X__X, X__X, X__X, X__X, X__X, X__X, X__X, X__X, X__X, X__X, X__X, X__X, ],
    [ X__X, ____, ____, ____, ____, ____, boss, ____, ____, ____, ____, ____, ____, ____, ____, X__X, ],
    [ X__X, ____, spwn, spwn, spwn, spwn, boss, ____, ____, ____, ____, ____, ____, ____, ____, X__X, ],
    [ X__X, ____, spwn, spwn, spwn, spwn, boss, ____, ____, ____, ____, sanc, ____, ____, ____, X__X, ],
    [ X__X, ____, spwn, spwn, spwn, spwn, boss, ____, ____, ____, ____, ____, ____, ____, ____, X__X, ],
    [ X__X, ____, spwn, spwn, spwn, spwn, boss, ____, ____, ____, ____, ____, ____, ____, ____, X__X, ],
    [ X__X, ____, spwn, spwn, spwn, spwn, boss, ____, ____, ____, ____, sanc, ____, ____, ____, X__X, ],
    [ X__X, ____, spwn, spwn, spwn, spwn, boss, ____, ____, ____, ____, ____, ____, ____, ____, X__X, ],
    [ X__X, ____, spwn, spwn, spwn, spwn, boss, ____, ____, ____, ____, ____, ____, ____, ____, X__X, ],
    [ X__X, ____, spwn, spwn, spwn, spwn, boss, ____, ____, ____, ____, sanc, ____, ____, ____, X__X, ],
    [ X__X, ____, spwn, spwn, spwn, spwn, boss, ____, ____, ____, ____, ____, ____, ____, ____, X__X, ],
    [ X__X, ____, spwn, spwn, spwn, spwn, boss, ____, ____, ____, ____, ____, ____, ____, ____, X__X, ],
    [ X__X, ____, spwn, spwn, spwn, spwn, boss, ____, ____, ____, ____, sanc, ____, ____, ____, X__X, ],
    [ X__X, ____, spwn, spwn, spwn, spwn, boss, ____, ____, ____, ____, ____, ____, ____, ____, X__X, ],
    [ X__X, ____, ____, ____, ____, ____, boss, ____, ____, ____, ____, ____, ____, ____, ____, X__X, ],
    [ X__X, X__X, X__X, X__X, X__X, X__X, X__X, X__X, X__X, X__X, X__X, X__X, X__X, X__X, X__X, X__X, ],
]
module.exports = room_siege_blitz;