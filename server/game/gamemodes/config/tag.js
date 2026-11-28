import { Config } from "../../../loaders/global";

export const mode = "tag";
export const teams = Config.teams ?? Math.floor(Math.random() * 3) + 2;
export const tag = true;
