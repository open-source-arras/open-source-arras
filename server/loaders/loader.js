import { readdirSync } from "fs";
import { resolve } from "path";
import { Config } from "./global";

const groups = readdirSync(resolve(__dirname, "../game/gamemodes/tiles/")),
    loadRooms = (log = false) => {
        if (Config.verbose_logs && log) {
            console.log("Importing tile definitions...");
        }

        const allOfThem = Promise.all(groups.forEach((filename) => {
            if (Config.verbose_logs && log) {
                console.log(`Loading tile file: ${filename}`);
            }

            return import(`../game/gamemodes/tiles/${filename}`);
        }));

        if (log) {
            allOfThem.then(() => {
                console.log("Successfully imported tile definitions.\n");
            });
        }
    };

const creationDate = new Date();
const creationTime = creationDate.getTime();

export {
    loadRooms,
    creationDate,
    creationTime
};
