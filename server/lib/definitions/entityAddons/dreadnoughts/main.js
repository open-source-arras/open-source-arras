import { makeMenu } from "../../facilitators.js";
import { Class } from "../../../../loaders/global.js";

Class.menu_dreads_dVX = makeMenu("Dreadnoughts", {upgrades: ["dreadnought_dreadsV1", "dreadnought_dreadsV2"]});
Class.menu_addons.UPGRADES_TIER_0.push("menu_dreads_dVX");
