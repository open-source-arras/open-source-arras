import { global } from "./global.js";

let decode = value => value,
    store = new Map(),
    typing = null;

const clean = token => `${token || ""}`.replace(/(<([^>]+)>)/gi, "").substring(0, 64);
const pause = ms => new Promise(resolve => setTimeout(resolve, ms));

async function unpack(pack) {
    let records = [],
        raw = pack.r,
        start = performance.now();
    for (let i = 0; i + 1 < raw.length; i += 2) {
        records.push(raw[i], decode(raw[i + 1]));
        if (performance.now() - start > 8) {
            await pause(0);
            start = performance.now();
        }
    }
    return { v: pack.v, records };
}

async function download(server, token) {
    let headers = token ? { Authorization: `Bearer ${token}` } : {};
    for (let attempt = 0; attempt < 60; attempt++) {
        let response;
        try {
            response = await fetch(`${location.protocol}//${server}/mockupPack`, { headers, cache: "no-cache" });
        } catch {
            return null;
        }
        if (response.status === 503) {
            await pause(1000);
            continue;
        }
        if (!response.ok || !(response.headers.get("Content-Type") || "").includes("application/json")) return null;
        let pack = await response.json().catch(() => null);
        return pack && typeof pack.v === "string" && Array.isArray(pack.r) ? unpack(pack) : null;
    }
    return null;
}

function load(server, token) {
    let key = `${server}\n${token}`,
        entry = store.get(key);
    if (!entry) {
        entry = { value: null, done: false };
        entry.promise = download(server, token).catch(() => null).then(value => {
            entry.value = value;
            entry.done = true;
            if (!value && store.get(key) === entry) store.delete(key);
            return value;
        });
        store.set(key, entry);
    }
    return entry;
}

function prefetchPacks(server = global.serverAdd, token = document.getElementById("playerKeyInput")?.value) {
    if (!server) return [];
    let entries = [load(server, "")];
    token = clean(token);
    if (token) entries.push(load(server, token));
    return entries;
}

async function packsFor(server, token, waitMs) {
    let entries = prefetchPacks(server, token);
    await Promise.race([Promise.all(entries.map(entry => entry.promise)), pause(waitMs)]);
    return entries.filter(entry => entry.done && entry.value).map(entry => entry.value);
}

function applyPack(pack) {
    let records = pack.records;
    for (let i = 0; i + 1 < records.length; i += 2) global.mockups[records[i]] = records[i + 1];
}

async function readPackMessage(buffer) {
    let stream = new Blob([buffer]).stream().pipeThrough(new DecompressionStream("gzip")),
        pack = await new Response(stream).json();
    applyPack(await unpack(pack));
}

function setPackDecoder(fn) {
    decode = fn;
}

let keyInput = document.getElementById("playerKeyInput");
if (keyInput) {
    keyInput.addEventListener("input", () => {
        clearTimeout(typing);
        typing = setTimeout(() => prefetchPacks(), 600);
    });
}

export { prefetchPacks, packsFor, applyPack, readPackMessage, setPackDecoder };
