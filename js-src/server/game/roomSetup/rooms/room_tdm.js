let teams = require('../../gamemodes/config/tdm.js').teams,
	room = Array(Config.roomHeight).fill(() => Array(Config.roomWidth).fill()).map(x => x()),
	spacing = 0,
locations = [
	[
		[[ 0 + spacing,  0 + spacing], [ 1 + spacing,  0 + spacing], [ 0 + spacing,  1 + spacing]],
		[[ 1 + spacing,  1 + spacing]]
	],[
		[
			[Config.roomHeight - 1 - spacing, Config.roomWidth - 1 - spacing], 
			[Config.roomHeight - 2 - spacing, Config.roomWidth - 1 - spacing], 
			[Config.roomHeight - 1 - spacing, Config.roomWidth - 2 - spacing]
		],
		[[Config.roomHeight - 2 - spacing, Config.roomWidth - 2 - spacing]]
	],[
		[
			[ 0 + spacing, Config.roomWidth - 1 - spacing], 
			[ 1 + spacing, Config.roomWidth - 1 - spacing], 
			[ 0 + spacing, Config.roomWidth - 2 - spacing]
		],
		[[ 1 + spacing, Config.roomWidth - 2 - spacing]]
	],[
		[
			[Config.roomHeight - 1 - spacing,  0 + spacing], 
			[Config.roomHeight - 1 - spacing,  1 + spacing], 
			[Config.roomHeight - 2 - spacing,  0 + spacing]
		],
		[[Config.roomHeight - 2 - spacing,  1 + spacing]]
	],[
		[
			[0 + spacing,  Math.floor(Config.roomWidth / 2) - 1], 
			[1 + spacing,  Math.floor(Config.roomWidth / 2)], 
			[0 + spacing,  Math.floor(Config.roomWidth / 2) + 1]
		],
		[[0 + spacing,  Math.floor(Config.roomWidth / 2)]]
	],[
		[
			[Math.floor(Config.roomHeight / 2) - 1,  Config.roomWidth - 1 - spacing], 
			[Math.floor(Config.roomHeight / 2),		 Config.roomWidth - 2 - spacing], 
			[Math.floor(Config.roomHeight / 2) + 1,  Config.roomWidth - 1 - spacing]
		],
		[[Math.floor(Config.roomHeight / 2),  Config.roomWidth - 1 - spacing]]
	],[
		[
			[Config.roomHeight - 1 - spacing,  Math.floor(Config.roomWidth / 2) - 1], 
			[Config.roomHeight - 2 - spacing,  Math.floor(Config.roomWidth / 2)], 
			[Config.roomHeight - 1 - spacing,  Math.floor(Config.roomWidth / 2) + 1]
		],
		[[Config.roomHeight - 1 - spacing,  Math.floor(Config.roomWidth / 2)]]
	],[
		[
			[Math.floor(Config.roomHeight / 2) - 1,  0 + spacing], 
			[Math.floor(Config.roomHeight / 2),  	 1 + spacing], 
			[Math.floor(Config.roomHeight / 2) + 1,  0 + spacing]
		],
		[[Math.floor(Config.roomHeight / 2),  0 + spacing]]
	]
];

if (teams === 2 && !spacing) {
	let baseprotGap = Math.ceil((Config.roomHeight - 1) / 6);
	for (let y = 0; y < Config.roomHeight; y++) {
		room[y][0] = tileClass.base1;
		room[y][Config.roomWidth - 1] = tileClass.base2;
	}
	for (let i = -2; i <= 2; i++) {
		let y = Math.floor(Config.roomHeight / 2 - baseprotGap * i);
		room[y][0] = tileClass.baseprotected1;
		room[y][Config.roomWidth - 1] = tileClass.baseprotected2;
	}
} else {
	for (let i = 1; i <= teams; i++) {
		let [ spawns, protectors ] = locations[i - 1];
		for (let [y, x] of spawns) room[y][x] = tileClass[`base${i}`];
		for (let [y, x] of protectors) room[y][x] = tileClass[`baseprotected${i}`];
	}
}

module.exports = room;
