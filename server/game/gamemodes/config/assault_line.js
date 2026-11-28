import { TEAM_BLUE, TEAM_GREEN } from "../../../loaders/global";

export const mode = "tdm";
export const teams = 2;
export const assault = true;
export const enable_bosses = false;
export const map_tile_width = 413;
export const map_tile_height = 412;
export const do_not_override_room = false;
export const room_setup = ["assault_line"];
export const maze = true;
export const maze_type = 17;
export const BOT_MOVE = [{
    TEAM: TEAM_GREEN,
    RANGE: 70,
    MOVEMENT: [
        [-9.53, 93.35],
        [3.59, 91.94],
        [3.35, 57.21]
    ]
}, {
    TEAM: TEAM_BLUE,
    RANGE: 90,
    MOVEMENT: [
        [5.35, -84.12],
        [2.39, -20.39]
    ]
}];
export const team_weights = {
    [TEAM_BLUE]: 1.1
};
