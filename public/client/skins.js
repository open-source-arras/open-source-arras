import { config } from "./config.js";

let keywords = [];
const cache = new Map();

fetch("/getSkins.json", { cache: "no-store" })
    .then((response) => response.json())
    .then((names) => keywords = names.map((name) => [name, name.toLowerCase()]))
    .catch(() => {});

function findSkinKeyword(rawName) {
    if (!keywords.length) return null;
    const name = (rawName || "").replace(/^#[0-9a-f]{6}/i, "").toLowerCase();
    if (!name) return null;
    if (cache.has(name)) return cache.get(name);
    let best = null;
    let at = -1;
    for (const [skin, keyword] of keywords) {
        const index = name.lastIndexOf(keyword);
        if (index > at) {
            best = skin;
            at = index;
        }
    }
    cache.set(name, best);
    return best;
}

export function skinShape(rawName) {
    if (!config.graphical.renderSkins) return null;
    const name = findSkinKeyword(rawName);
    return name ? `image=/skins/${encodeURIComponent(name)}.png` : null;
}
