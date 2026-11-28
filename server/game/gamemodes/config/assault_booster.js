import { TEAM_BLUE } from "../../../loaders/global";

export const mode = "tdm";
export const teams = 2;
export const assault = true;
export const enable_bosses = false;
export const map_tile_width = 440;
export const map_tile_height = 440;
export const do_not_override_room = false;
export const room_setup = ["assault_booster"];
export const maze = true;
export const maze_type = 15;
export const BOT_MOVE = [{
    TEAM: TEAM_BLUE,
    RANGE: 20,
    MOVEMENT: [
        [107.43, 0.46],
        [76.66, 0.46]
    ]
}];
export const team_weights = {
    [TEAM_BLUE]: 1.1
};
