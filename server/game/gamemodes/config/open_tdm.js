import { Config } from "../../../loaders/global";

export const mode = "tdm";
export const teams = Config.teams ?? Math.floor(Math.random() * 2 + 1) * 2;
