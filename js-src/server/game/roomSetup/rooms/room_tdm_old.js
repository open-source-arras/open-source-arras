const {
    normal: ____,
    nest,
    rock,
    roid,
    base1: bas1,
    baseprotected1: bap1,
    base2: bas2,
    baseprotected2: bap2,
    base3: bas3,
    baseprotected3: bap3,
    base4: bas4,
    baseprotected4: bap4
} = tileClass;  

let room_teams = [
    [bas1,bas1,____,____,____,____,roid,roid,roid,____,____,____,____,bas3,bas3],
    [bas1,bap1,____,____,____,____,roid,roid,roid,____,____,____,____,bap3,bas3],
    [____,____,rock,rock,____,____,____,____,____,____,____,rock,rock,____,____],
    [____,____,rock,rock,____,____,____,____,____,____,____,rock,rock,____,____],
    [____,____,____,____,____,____,____,____,____,____,____,____,____,____,____],
    [____,____,____,____,____,nest,nest,nest,nest,nest,____,____,____,____,____],
    [roid,roid,____,____,____,nest,nest,nest,nest,nest,____,____,____,roid,roid],
    [roid,roid,____,____,____,nest,nest,nest,nest,nest,____,____,____,roid,roid],
    [roid,roid,____,____,____,nest,nest,nest,nest,nest,____,____,____,roid,roid],
    [____,____,____,____,____,nest,nest,nest,nest,nest,____,____,____,____,____],
    [____,____,____,____,____,____,____,____,____,____,____,____,____,____,____],
    [____,____,rock,rock,____,____,____,____,____,____,____,rock,rock,____,____],
    [____,____,rock,rock,____,____,____,____,____,____,____,rock,rock,____,____],
    [bas4,bap4,____,____,____,____,roid,roid,roid,____,____,____,____,bap2,bas2],
    [bas4,bas4,____,____,____,____,roid,roid,roid,____,____,____,____,bas2,bas2]
];

module.exports = room_teams;