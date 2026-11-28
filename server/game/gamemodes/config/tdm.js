import { Config } from "../../../loaders/global";

export const mode = "tdm";
export const teams = Config.teams ?? Math.floor(Math.random() * 2 + 1) * 2;
export const do_not_override_room = true;
export const room_setup = ["tdm"];
