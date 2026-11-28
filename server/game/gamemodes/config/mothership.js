import { Config } from "../../../loaders/global";

export const mode = "tdm";
export const teams = Config.teams ?? (Math.random() * 3 | 0) + 2;
export const mothership = true;
