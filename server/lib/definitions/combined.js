let fs = require("fs"),
    path = require("path");


class definitionCombiner {
    constructor(data) {
        this.groupLoc = data.groups;
        this.tankAddonLoc = data.addonsFolder;
    }

    loadDefinitions(log = true, includeGameAddons = true, definitionCount = 0, convertedExportsCount = 0, definitionGroupsLoadStart = performance.now()) {
        if (Config.startup_logs && log) console.log(`Loading ${this.calculateGroupsLength(this.groupLoc)} groups...`);

        // Load all the groups
        this.loadGroups(this.groupLoc, log);

        let definitionGroupsLoadEnd = performance.now();
        if (Config.startup_logs && log) console.log("Loaded definitions in " + util.rounder(definitionGroupsLoadEnd - definitionGroupsLoadStart, 3) + " milliseconds. \n");

        // Now we can load the tank addons
        if (Config.startup_logs && log) console.log("Loading group addons...");
        this.loadAddons(this.tankAddonLoc, log);

        // Calculate the length.
        definitionCount = Object.keys(Class).length;
        convertedExportsCount = Object.keys(Class).filter(o => Class[o].Converted == true).length;

        let addonsLoadEnd = performance.now();
        if (Config.startup_logs && log) console.log("Loaded group addons in " + util.rounder(addonsLoadEnd - definitionGroupsLoadEnd, 3) + " milliseconds. \n");

        // Also include the other addons if needed!
        if (Config.startup_logs && log) console.log("Loading game addons...");
        if (includeGameAddons) this.loadAddons(path.join(__dirname, "../../game/addons"), log, "game addon");

        let gameaddonsLoadEnd = performance.now();
        if (Config.startup_logs && log) console.log("Loaded game addons in " + util.rounder(gameaddonsLoadEnd - addonsLoadEnd, 3) + " milliseconds. \n");

        if (Config.startup_logs && log && convertedExportsCount !== 0) console.log(`Converted ${convertedExportsCount} "exports" definitio${convertedExportsCount == 1 ? "n" : "ns"} into "Class" definitio${convertedExportsCount == 1 ? "n" : "ns"}! \n`);

        if (Config.startup_logs && log) console.log(`Combined ${this.calculateGroupsLength(this.groupLoc)} definition groups and ${loadedAddons.length} addons into ${definitionCount} definitions!\n`);

        // Get each class a unique index
        let i = 0;
        for (let key in Class) {
            if (!Class.hasOwnProperty(key)) continue;
            Class[key].index = i;
            classMap.set(i++, key);
        }
    }

    calculateGroupsLength(directory) {
        let total = 0;
        let folder = fs.readdirSync(directory);
        for (let filename of folder) {
            // Create this file it's own filepath
            let filepath = directory + `/${filename}`;
            let isDirectory = fs.statSync(filepath).isDirectory();
            // If we are fooled and it's a folder, restart it's court
            if (isDirectory) {
                let Etotal = this.calculateGroupsLength(filepath);
                if (Etotal !== 0) total += Etotal;
            }
            // Now we don't want any html files in!
            if (!filename.endsWith(".js")) continue;
            total++;
        }
        return total;
    }

    loadGroups(directory, log) {
    // Take the folder
        let folder = fs.readdirSync(directory);
        for (let filename of folder) {
            // Create this file it's own filepath
            let filepath = directory + `/${filename}`;
            let isDirectory = fs.statSync(filepath).isDirectory();
            // If we are fooled and it's a folder, restart it's court
            if (isDirectory) {
                this.loadGroups(filepath, log);
            }
            // Now we don't want any html files in!
            if (!filename.endsWith(".js")) continue;
            if (Config.startup_logs && log) console.log(`Loading group: ${filename}`);
            require(filepath);
        }
    }

    loadAddons(directory, logs = true, overrideLoadTextLog = false) {
    // Take the folder
        let folder = fs.readdirSync(directory);
        // And check every file in it
        for (let filename of folder) {
            // Create this file it's own filepath
            let filepath = directory + `/${filename}`;
            let isDirectory = fs.statSync(filepath).isDirectory();
            // If we are fooled and it's a folder, restart it's court
            if (isDirectory) {
                this.loadAddons(filepath, logs, overrideLoadTextLog);
            }
            // If we found a addon folder with an info, push it. (Can be better descripted)
            if (filename.startsWith("addon") && filename.endsWith(".json")) {
                global.addonAuthorInfos.push(require(filepath));
            };
            // Now we don't want any html files in!
            if (!filename.endsWith(".js")) continue;
            if (Config.startup_logs && logs) console.log(`Loading ${overrideLoadTextLog ? overrideLoadTextLog : "group addon"}: ${filename}`);
            // Compile the addons
            let result = require(filepath);
            if ("function" === typeof result) {
                result({ Class, Config, Events });
            }
            global.loadedAddons.push(filename.slice(0, -3));
        }
    }
};

module.exports = { definitionCombiner };