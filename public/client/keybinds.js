import { global } from "./global.js";

const keybindStorage = "keybinds";
let keybinds = {};

function loadKeybinds() {
    let raw = localStorage.getItem(keybindStorage);
    keybinds = typeof raw === "string" && raw.startsWith("{") ? JSON.parse(raw) : {};
}
loadKeybinds();

export function getKeyName(keyId) {
    if (keybinds[keyId]) return keybinds[keyId][0];
    let code = global[keyId];
    if (!code) return null;
    return codeLabel(code) ?? code;
}

const CODE_LABELS = {
    escape: "Esc",
    tab: "Tab",
    capslock: "Caps Lock",
    space: "Space",
    spacebar: "Space",
    enter: "Enter",
    numpadenter: "Enter",
    return: "Enter",
    backspace: "Backspace",
    delete: "Del",
    insert: "Ins",
    home: "Home",
    end: "End",
    pageup: "Page Up",
    pagedown: "Page Down",
    arrowup: "\u2191",
    arrowdown: "\u2193",
    arrowleft: "\u2190",
    arrowright: "\u2192",
    printscreen: "PrtSc",
    scrolllock: "Scroll Lock",
    pause: "Pause",
    contextmenu: "Menu",
    numlock: "Num Lock",
    shiftleft: "Shift",
    shiftright: "Shift",
    controlleft: "Ctrl",
    controlright: "Ctrl",
    altleft: "Alt",
    altright: "Alt",
    metaleft: "Meta",
    metaright: "Meta",
    backquote: "`",
    minus: "-",
    equal: "=",
    bracketleft: "[",
    bracketright: "]",
    semicolon: ";",
    quote: "'",
    backslash: "\\",
    comma: ",",
    period: ".",
    slash: "/",
    intlbackslash: "\\",
    intlro: "Ro",
    intlyen: "\u00a5",
    numpadmultiply: "Num *",
    numpadadd: "Num +",
    numpadsubtract: "Num -",
    numpaddecimal: "Num .",
    numpaddivide: "Num /",
};

function codeLabel(name) {
    const key = name.toLowerCase();
    if (/^f([1-9]|1\d|2[0-4])$/.test(key)) return key.toUpperCase();
    if (/^digit([0-9])$/.test(key)) return key.slice(5);
    if (/^numpad([0-9])$/.test(key)) return "Num " + key.slice(6);
    if (/^key([a-z])$/.test(key)) return key.slice(3).toUpperCase();
    if (/^lang([a-z0-9]+)$/.test(key)) return key;
    return CODE_LABELS[key] ?? null;
}

export { codeLabel };

const KEY_REF = /\x01([^\x01]+)\x01/g;
const STRAY_MARKER = /\x01/g;

const ACTION_KEYS = {
    sandbox: "KEY_SPECIAL",
    special: "KEY_SPECIAL",
    help: "KEY_SPECIAL_HELP",
    helpalt: "KEY_SPECIAL_HELP_ALT",
    preset1: "KEY_SPECIAL_PRESET_1",
    preset2: "KEY_SPECIAL_PRESET_2",
    preset3: "KEY_SPECIAL_PRESET_3",
    basic: "KEY_SPECIAL_BASIC",
    teleport: "KEY_SPECIAL_TELEPORT",
    kill: "KEY_SPECIAL_KILL",
    whirlpool: "KEY_SPECIAL_WHIRLPOOL",
    drag: "KEY_SPECIAL_DRAG",
    color: "KEY_SPECIAL_COLOR",
    wall: "KEY_SPECIAL_WALL",
    walltype: "KEY_SPECIAL_WALL_TYPE",
    vanish: "KEY_SPECIAL_VANISH",
    invincible: "KEY_SPECIAL_INVINCIBLE",
    team: "KEY_SPECIAL_TEAM",
    teaminvite: "KEY_SPECIAL_TEAM_INVITE",
    heal: "KEY_SPECIAL_HEAL",
    skill: "KEY_SPECIAL_SKILL",
    skillreset: "KEY_SPECIAL_SKILL_RESET",
    skillclear: "KEY_SPECIAL_SKILL_CLEAR",
    skillmax: "KEY_SPECIAL_SKILL_MAX",
    skillremove: "KEY_SPECIAL_SKILL_REMOVE",
    skilladd: "KEY_SPECIAL_SKILL_ADD",
    skillcapremove: "KEY_SPECIAL_SKILL_CAP_REMOVE",
    skillcapadd: "KEY_SPECIAL_SKILL_CAP_ADD",
    maximizestat: "KEY_SKILL_MAX",
    maxstat: "KEY_SKILL_MAX",
    data: "KEY_SPECIAL_DATA",
    levelup: "KEY_SPECIAL_LEVEL_UP",
    police: "KEY_SPECIAL_POLICE",
    blast: "KEY_SPECIAL_BLAST",
    polygon: "KEY_SPECIAL_POLYGON",
    attribute: "KEY_SPECIAL_ATTRIBUTE",
    attribute_minimap_team: "KEY_SPECIAL_ATTRIBUTE_MINIMAP_TEAM",
    attribute_minimap_hide: "KEY_SPECIAL_ATTRIBUTE_MINIMAP_HIDE",
    attribute_leaderboard: "KEY_SPECIAL_ATTRIBUTE_LEADERBOARD",
    attribute_reload: "KEY_SPECIAL_ATTRIBUTE_RELOAD",
    attribute_recoil: "KEY_SPECIAL_ATTRIBUTE_RECOIL",
    attribute_arena_edge: "KEY_SPECIAL_ATTRIBUTE_ARENA_EDGE",
    attribute_wall: "KEY_SPECIAL_ATTRIBUTE_WALL",
    attribute_score: "KEY_SPECIAL_ATTRIBUTE_SCORE",
    ban: "KEY_SPECIAL_BAN",
    zoomout: "KEY_SPECIAL_ZOOM_OUT",
    zoomin: "KEY_SPECIAL_ZOOM_IN",
    zoomclear: "KEY_SPECIAL_ZOOM_CLEAR",
    smaller: "KEY_SPECIAL_SMALLER",
    bigger: "KEY_SPECIAL_BIGGER",
    promote: "KEY_SPECIAL_PROMOTE",
    demote: "KEY_SPECIAL_DEMOTE",
    autofire: "KEY_AUTO_FIRE",
    autoalt: "KEY_AUTO_ALT",
    autospin: "KEY_AUTO_SPIN",
    override: "KEY_OVERRIDE",
    reversetank: "KEY_REVERSE_TANK",
    reversemouse: "KEY_REVERSE_MOUSE",
    screenshot: "KEY_SCREENSHOT",
    classtree: "KEY_CLASS_TREE",
    record: "KEY_RECORD",
    suicide: "KEY_SUICIDE",
    selfdestruct: "KEY_SUICIDE",
    ping: "KEY_PING",
    debuginfo: "KEY_PING",
    debug: "KEY_PING",
    spinlock: "KEY_SPIN_LOCK",
    ability: "KEY_ABILITY",
    useaction: "KEY_ABILITY",
    action: "KEY_ABILITY",
};

function normalizeAction(name) {
    return name.toLowerCase().replace(/[^a-z0-9]/g, "");
}

export function resolveKeyReference(name) {
    const action = ACTION_KEYS[normalizeAction(name)];
    if (action) {
        const bound = getKeyName(action);
        if (bound) return bound;
    }
    const upgrade = normalizeAction(name).match(/^upgrade(1[0-2]|[1-9])$/);
    if (upgrade) {
        const bound = getKeyName(`KEY_UPGRADE_${upgrade[1]}`);
        if (bound) return bound;
    }
    const skill = normalizeAction(name).match(/^skill(10|[1-9])$/);
    if (skill) {
        const bound = getKeyName(`KEY_SKILL_${skill[1]}`);
        if (bound) return bound;
    }
    if (name.startsWith("KEY_")) {
        const bound = getKeyName(name);
        if (bound) return bound;
    }
    return codeLabel(name) ?? name;
}

export function translateServerMessage(raw) {
    if (!raw || raw.indexOf("\x01") === -1) return raw;
    const translated = raw.replace(KEY_REF, (_, name) => resolveKeyReference(name));
    return translated.replace(STRAY_MARKER, "");
}
