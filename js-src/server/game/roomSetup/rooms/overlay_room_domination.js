let room = Array(15).fill(() => Array(15).fill()).map(x => x());

room[7][3] = room[3][7] = room[11][7] = room[7][11] = room[7][7] = tileClass.dominationTile;

let domination_room = room;


module.exports = domination_room;