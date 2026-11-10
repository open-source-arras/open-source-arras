let fs = require("fs"),
    path = require("path");


class definitionCombiner {
    constructor(data) {
        this.groupLoc = data.groups;
        this.tankAddonLoc = data.addonsFolder;
    }

    loadDefinitions(log = true, includeGameAddons = true, definitionCount = 0, convertedExportsCount = 0, definitionGroupsLoadStart = performance.now()) {
        if (Config.verbose_logs && log) console.log(`Loading ${this.calculateGroupsLength(this.groupLoc)} groups...`);

        // Load all the groups
        this.loadGroups(this.groupLoc, log);

        let definitionGroupsLoadEnd = performance.now();
        if (Config.verbose_logs && log) console.log("Loaded definitions in " + util.rounder(definitionGroupsLoadEnd - definitionGroupsLoadStart, 3) + " milliseconds. \n");

        // Now we can load the tank addons
        if (Config.verbose_logs && log) console.log("Loading group addons...");
        this.loadAddons(this.tankAddonLoc, log);

        // Calculate the length.
        definitionCount = Object.keys(Class).length;
        convertedExportsCount = Object.keys(Class).filter(o => Class[o].Converted == true).length;

        let addonsLoadEnd = performance.now();
        if (Config.verbose_logs && log) console.log("Loaded group addons in " + util.rounder(addonsLoadEnd - definitionGroupsLoadEnd, 3) + " milliseconds. \n");

        // Also include the other addons if needed!
        if (Config.verbose_logs && log) console.log("Loading game addons...");
        if (includeGameAddons) this.loadAddons(path.join(__dirname, "../../game/addons"), log, "game addon");

        let gameaddonsLoadEnd = performance.now();
        if (Config.verbose_logs && log) console.log("Loaded game addons in " + util.rounder(gameaddonsLoadEnd - addonsLoadEnd, 3) + " milliseconds. \n");

        if (Config.verbose_logs && log && convertedExportsCount !== 0) console.log(`Converted ${convertedExportsCount} "exports" definitio${convertedExportsCount == 1 ? "n" : "ns"} into "Class" definitio${convertedExportsCount == 1 ? "n" : "ns"}! \n`);

        if (Config.verbose_logs && log) console.log(`Combined ${this.calculateGroupsLength(this.groupLoc)} definition groups and ${loadedAddons.length} addons into ${definitionCount} definitions!\n`);

        // Get each class a unique index
        let i = 0;
        for (let key in Class) {
            if (!Class.hasOwnProperty(key)) continue;
            Class[key].index = i;
            classMap.set(i++, key);
        }
        this.rerootUpgradeTrees();
    }

    rerootUpgradeTrees() {
        let definitionOf = type => typeof type === "string" ? Class[type] : type,
            parentsOf = definition => definition.PARENT == null ? [] : Array.isArray(definition.PARENT) ? definition.PARENT : [definition.PARENT],
            rootOf = (type, seen = new Set()) => {
                let definition = definitionOf(type);
                if (!definition || seen.has(definition) || definition === Class.genericTank) return undefined;
                seen.add(definition);
                if (definition.REROOT_UPGRADE_TREE) return definition.REROOT_UPGRADE_TREE;
                let parents = parentsOf(definition);
                for (let i = parents.length - 1; i >= 0; i--) {
                    let root = rootOf(parents[i], seen);
                    if (root !== undefined) return root;
                }
                return undefined;
            },
            upgradesOf = (type, out = [], seen = new Set()) => {
                let definition = definitionOf(type);
                if (!definition || seen.has(definition)) return out;
                seen.add(definition);
                for (let parent of parentsOf(definition)) upgradesOf(parent, out, seen);
                if (definition.RESET_UPGRADE_MENU) out.length = 0;
                for (let key in definition) {
                    if (!key.startsWith("UPGRADES_TIER_") || !Array.isArray(definition[key])) continue;
                    for (let upgrade of definition[key]) {
                        for (let name of Array.isArray(upgrade) ? upgrade : [upgrade]) {
                            if (typeof name === "string" && Class[name]) out.push(name);
                        }
                    }
                }
                return out;
            },
            upgrades = new Map(),
            parentsIn = new Map();
        for (let key in Class) {
            if (!Class.hasOwnProperty(key)) continue;
            let list = upgradesOf(key);
            upgrades.set(key, list);
            for (let name of list) {
                if (!parentsIn.has(name)) parentsIn.set(name, []);
                let parents = parentsIn.get(name);
                if (!parents.includes(key)) parents.push(key);
            }
        }
        let normal = new Set(),
            queue = [].concat(Class.genericTank.REROOT_UPGRADE_TREE ?? []);
        while (queue.length) {
            let key = queue.pop();
            if (normal.has(key) || !upgrades.has(key)) continue;
            normal.add(key);
            for (let name of upgrades.get(key)) queue.push(name);
        }
        let roots = new Map();
        for (let key in Class) {
            if (!Class.hasOwnProperty(key) || rootOf(key) !== undefined) continue;
            if (Class[key].IS_MENU) {
                roots.set(key, key);
                continue;
            }
            if (normal.has(key)) continue;
            let visited = new Set([key]),
                search = [key];
            for (let i = 0; i < search.length; i++) {
                let found = false;
                for (let parent of parentsIn.get(search[i]) ?? []) {
                    if (visited.has(parent)) continue;
                    visited.add(parent);
                    if (normal.has(parent)) {
                        found = true;
                        break;
                    }
                    let root = Class[parent].IS_MENU ? parent : rootOf(parent);
                    if (root !== undefined) {
                        roots.set(key, root);
                        found = true;
                        break;
                    }
                    search.push(parent);
                }
                if (found) break;
            }
        }
        for (let [key, root] of roots) Class[key].REROOT_UPGRADE_TREE = root;
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
            if (Config.verbose_logs && log) console.log(`Loading group: ${filename}`);
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
            if (Config.verbose_logs && logs) console.log(`Loading ${overrideLoadTextLog ? overrideLoadTextLog : "group addon"}: ${filename}`);
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