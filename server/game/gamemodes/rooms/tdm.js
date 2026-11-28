import { Config, tileClass } from "../../../loaders/global";

const room = Array(Config.roomHeight).fill(() => Array(Config.roomWidth).fill()).map((x) => x());
const spacing = 0;
const locations = [
    [
        [[0 + spacing,  0 + spacing], [1 + spacing,  0 + spacing], [0 + spacing,  1 + spacing]],
        [[1 + spacing,  1 + spacing]]
    ], [
        [
            [Config.roomHeight - 1 - spacing, Config.roomWidth - 1 - spacing],
            [Config.roomHeight - 2 - spacing, Config.roomWidth - 1 - spacing],
            [Config.roomHeight - 1 - spacing, Config.roomWidth - 2 - spacing]
        ],
        [[Config.roomHeight - 2 - spacing, Config.roomWidth - 2 - spacing]]
    ], [
        [
            [0 + spacing, Config.roomWidth - 1 - spacing],
            [1 + spacing, Config.roomWidth - 1 - spacing],
            [0 + spacing, Config.roomWidth - 2 - spacing]
        ],
        [[1 + spacing, Config.roomWidth - 2 - spacing]]
    ], [
        [
            [Config.roomHeight - 1 - spacing,  0 + spacing],
            [Config.roomHeight - 1 - spacing,  1 + spacing],
            [Config.roomHeight - 2 - spacing,  0 + spacing]
        ],
        [[Config.roomHeight - 2 - spacing,  1 + spacing]]
    ], [
        [
            [0 + spacing,  Math.floor(Config.roomWidth / 2) - 1],
            [1 + spacing,  Math.floor(Config.roomWidth / 2)],
            [0 + spacing,  Math.floor(Config.roomWidth / 2) + 1]
        ],
        [[0 + spacing,  Math.floor(Config.roomWidth / 2)]]
    ], [
        [
            [Math.floor(Config.roomHeight / 2) - 1,  Config.roomWidth - 1 - spacing],
            [Math.floor(Config.roomHeight / 2),		 Config.roomWidth - 2 - spacing],
            [Math.floor(Config.roomHeight / 2) + 1,  Config.roomWidth - 1 - spacing]
        ],
        [[Math.floor(Config.roomHeight / 2),  Config.roomWidth - 1 - spacing]]
    ], [
        [
            [Config.roomHeight - 1 - spacing,  Math.floor(Config.roomWidth / 2) - 1],
            [Config.roomHeight - 2 - spacing,  Math.floor(Config.roomWidth / 2)],
            [Config.roomHeight - 1 - spacing,  Math.floor(Config.roomWidth / 2) + 1]
        ],
        [[Config.roomHeight - 1 - spacing,  Math.floor(Config.roomWidth / 2)]]
    ], [
        [
            [Math.floor(Config.roomHeight / 2) - 1,  0 + spacing],
            [Math.floor(Config.roomHeight / 2),  	 1 + spacing],
            [Math.floor(Config.roomHeight / 2) + 1,  0 + spacing]
        ],
        [[Math.floor(Config.roomHeight / 2),  0 + spacing]]
    ]
];

if (Config.teams === 2 && !spacing) {
    const baseprotGap = Math.ceil((Config.roomHeight - 1) / 6);
    for (let y = 0; y < Config.roomHeight; y++) {
        room[y][0] = tileClass.base1;
        room[y][Config.roomWidth - 1] = tileClass.base2;
    }
    for (let i = -2; i <= 2; i++) {
        const y = Math.floor(Config.roomHeight / 2 - baseprotGap * i);
        room[y][0] = tileClass.baseprotected1;
        room[y][Config.roomWidth - 1] = tileClass.baseprotected2;
    }
} else {
    for (let i = 1; i <= Config.teams; i++) {
        const [spawns, protectors] = locations[i - 1];
        for (const [y, x] of spawns) {
            room[y][x] = tileClass[`base${i}`];
        }
        for (const [y, x] of protectors) {
            room[y][x] = tileClass[`baseprotected${i}`];
        }
    }
}

export default room;
