import { global } from "./global.js";

const DURATION = 700;
const PHONE = /Android|webOS|iPhone|iPad|iPod|BlackBerry/i.test(navigator.userAgent);
const settle = (t) => 1 - Math.pow(1 - Math.min(Math.max(t, 0), 1), 5);

class Motion {
    constructor(value) {
        this.from = value;
        this.to = value;
        this.start = -Infinity;
    }
    set(value) {
        if (value === this.to) return;
        this.from = this.value;
        this.to = value;
        this.start = performance.now();
    }
    jump(value) {
        this.from = this.to = value;
        this.start = -Infinity;
    }
    get progress() {
        return settle((performance.now() - this.start) / DURATION);
    }
    get value() {
        return this.from + (this.to - this.from) * this.progress;
    }
    get moving() {
        return performance.now() - this.start < DURATION;
    }
}

class Glide {
    constructor(value) {
        this.value = value;
        this.target = value;
    }
    step(dt) {
        this.value += (this.target - this.value) * (1 - Math.pow(0.7, dt / 50));
        if (Math.abs(this.target - this.value) < 0.01) this.value = this.target;
        return this.value;
    }
    get moving() {
        return this.value !== this.target;
    }
}

const mixCache = new Map();
function channels(color) {
    if (color[0] === "#") {
        let value = parseInt(color.slice(1, 7), 16);
        return [value >> 16 & 255, value >> 8 & 255, value & 255];
    }
    let parts = color.match(/[\d.]+/g);
    return parts ? parts.slice(0, 3).map(Number) : [0, 0, 0];
}
function mix(a, b, t) {
    let key = a + b + t;
    let cached = mixCache.get(key);
    if (cached) return cached;
    let x = channels(a), y = channels(b);
    let result = `rgb(${Math.round(x[0] + (y[0] - x[0]) * t)}, ${Math.round(x[1] + (y[1] - x[1]) * t)}, ${Math.round(x[2] + (y[2] - x[2]) * t)})`;
    if (mixCache.size > 4000) mixCache.clear();
    mixCache.set(key, result);
    return result;
}
function light(color) {
    let c = channels(color);
    return c[0] + c[1] + c[2] > 720;
}
function toHsv(color) {
    let [r, g, b] = channels(color).map((v) => v / 255);
    let max = Math.max(r, g, b), min = Math.min(r, g, b), d = max - min;
    let h = 0;
    if (d) h = max === r ? ((g - b) / d) % 6 : max === g ? (b - r) / d + 2 : (r - g) / d + 4;
    return { h: (h * 60 + 360) % 360, s: max ? d / max : 0, v: max };
}
function toHex(h, s, v) {
    let part = (n) => {
        let k = (n + h / 60) % 6;
        return Math.round((v - v * s * Math.max(0, Math.min(k, 4 - k, 1))) * 255).toString(16).padStart(2, "0");
    };
    return "#" + part(5) + part(3) + part(1);
}
const HUES = ["#ff0000", "#ffff00", "#00ff00", "#00ffff", "#0000ff", "#ff00ff", "#ff0000"];

const OPTION_TIPS = {
    names: "Show player names.",
    chat: "Show chat messages.",
    scores: "Show player scores.",
    health: "Show health bars.",
    grid: "Show the background grid.",
    shield: "Separate the shield bar from the health bar.",
    sharpTraps: "Sharpen the corners of traps.",
    curvyTraps: "Add curvature to the sides of traps.\nMay slightly lower the frame rate.",
    sharpPolygons: "Sharpen the corners of all polygons.\nMay slightly lower the frame rate.",
    skins: "Show tank skins.\nNote: Skins will be in grayscale if the low WebGl driver is selected.",
    border: "Choose the thickness of the borders of entities.",
    upgrades: "Toggle the visibility of the class and skill upgrade menus.",
    leaderboard: "Toggle the visibility of the leaderboard.",
    bars: "Toggle the visibility of the score and level bars.",
    minimap: "Toggle the visibility of the minimap.",
    killbar: "Toggle the visibility of the kill bar, which shows the number of kills, assists, and boss kills.",
    extraInfo: "Show various extra information in the bottom right corner.",
    uiSize: "Configure the size of the user interface.",
    filter: "Select what word filter to use.\nNote: Offensive words, or slurs, are always filtered unless all filters are disabled.",
    camera: "Make the camera follow your tank instead of being fixed at it.",
    fading: "Make dying entities fade out instead of shrinking until disappearing.\nMay slightly lower the frame rate.",
    levelUp: "Automatically level you up to level 45 upon joining the game.",
    incognito: "Hide you from the leaderboard and make your score appear low to other players.",
    reconnect: "Automatically reconnect to the server when the connection is lost.",
    driver: "Select which canvas rendering driver to use.\nMay affect the frame rate.",
    lowResolution: "Lower the game's resolution.\nMay help to improve the frame rate.",
    theme: "Select which theme to use.",
    borderTheme: "Select which border theme to use.",
    remove: "Remove this theme from your list of saved themes.",
    removeDefault: "Remove this theme from your list of saved themes.\nNote: You cannot remove this theme as is it a default theme.",
    save: "Save this theme to your list of saved themes.",
    blend: "Choose how dark the borders of entities are.",
    borderColor: "The border blend color of all entities",
    neon: "Use neon borders, where the border is the entity color and the central color is blended."
};

const SWATCHES = [
    ["blue", "Blue", "Blue team (ID 10)"], ["vlgrey", "Eggs", "Eggs (ID 6)"], ["lgrey", "Walls", "Maze walls, as well as rocks (ID 7)"],
    ["green", "Green", "Green team (ID 11)"], ["gold", "Squares", "Squares (ID 13)"], ["lgreen", "Health Bars", "Health bars, as well as shiny polygons (ID 1)"],
    ["red", "Red", "Red team (ID 12)"], ["orange", "Triangles", "Triangles (ID 2)"], ["teal", "Shield Bars", "Shield bars, as well as legendary polygons (ID 0)"],
    ["magenta", "Purple", "Purple team (ID 15)"], ["purple", "Pentagons", "Pentagons (ID 14)"], ["grey", "Barrels", "Barrels, as well as bar backgrounds (ID 16)"],
    ["yellow", "Neutral", "Neutral team (ID 3)"], ["aqua", "Hexagons", "Hexagons (ID 4)"], ["white", "Background", "Arena background (ID 18)"],
    ["dgrey", "Rogues", "Rogue team (ID 17)"], ["pink", "Crashers", "Crashers (ID 5)"], ["guiblack", "Grid", "The map's grid and edges, as well as the color of your minimap dot (ID 19)\nNote: It's highly recommended for this color to contrast the background color."],
    ["guiwhite", "Text", "Text color, as well as the flash blend color (ID 8)\nNote: It's highly recommended for this color to be a light color and contrast the border color."],
    ["black", "Borders", "The borders of all text, bars, and other UI elements, as well as the color of shells (ID 9)\nNote: It's highly recommended for this color to be a dark color and contrast the text color."]
];

const KEYBINDS = [
    ["KEY_MOUSE_0", "Primary Control", "Key for firing bullets and controlling drones", "This can also be accessed with the left mouse button."],
    ["KEY_MOUSE_2", "Secondary Control", "Key for repelling drones and a few other things", "This can also be accessed with the right mouse button."],
    ["KEY_ABILITY", "Ability", "Key to activate ability"],
    ["KEY_UP", "Move Up", "Key for moving up"],
    ["KEY_LEFT", "Move Left", "Key for moving left"],
    ["KEY_DOWN", "Move Down", "Key for moving down"],
    ["KEY_RIGHT", "Move Right", "Key for moving right"],
    ["KEY_AUTO_FIRE", "Autofire", "Key to toggle autofire"],
    ["KEY_AUTO_SPIN", "Autospin", "Key to toggle autospin"],
    ["KEY_OVERRIDE", "Override", "Key to toggle override"],
    ["KEY_REVERSE_TANK", "Reverse Aim", "Key to toggle reverse aim, where your aim is rotated 180 degrees"],
    ["KEY_REVERSE_MOUSE", "Reverse Control", "Key to toggle reverse control, where the primary and secondary controls are flipped"],
    ["KEY_SPECIAL", "Sandbox", "Key for sandbox actions"],
    ["KEY_PAUSE", "Score Pause", "Key for a score pause"],
    ["KEY_SUICIDE", "Self-Destruct", "Key to self-destruct"],
    ["KEY_UPGRADE_1", "Upgrade #1", "Key to use class upgrade #1"],
    ["KEY_UPGRADE_2", "Upgrade #2", "Key to use class upgrade #2"],
    ["KEY_UPGRADE_3", "Upgrade #3", "Key to use class upgrade #3"],
    ["KEY_UPGRADE_4", "Upgrade #4", "Key to use class upgrade #4"],
    ["KEY_UPGRADE_5", "Upgrade #5", "Key to use class upgrade #5"],
    ["KEY_UPGRADE_6", "Upgrade #6", "Key to use class upgrade #6"],
    ["KEY_UPGRADE_7", "Upgrade #7", "Key to use class upgrade #7"],
    ["KEY_UPGRADE_8", "Upgrade #8", "Key to use class upgrade #8"],
    ["KEY_UPGRADE_9", "Upgrade #9", "Key to use class upgrade #9"],
    ["KEY_SKILL_MAX", "Maximize Upgrade", "Key to maximize a skill upgrade when held"],
    ["KEY_PING", "Debug Info", "Key to display debug info"],
    ["KEY_CLASS_TREE", "Class Tree", "Key to display class tree"],
    ["KEY_SCREENSHOT", "Take Screenshot", "Key to take a screenshot"],
    ["KEY_RECORD", "Record Video", "Key to start or stop a video recording"],
    ["KEY_LEVEL_UP", "Level Up", "Key for instantly leveling up"]
];

const RANKS = ["", "AC", "AS", "AO"];

export function createMenu(hooks) {
    const canvas = document.createElement("canvas");
    canvas.id = "arrasMenu";
    canvas.style.cssText = "position:fixed;left:0;top:0;width:100%;height:100%;z-index:10;pointer-events:none;image-rendering:auto";
    document.body.appendChild(canvas);
    const ctx = canvas.getContext("2d");
    const card = document.querySelector(".startMenu");
    const root = document.getElementById("startMenuWrapper");

    let scale = 1, ratio = 1, width = 1920, height = 1080;
    let pointer = { x: -1e4, y: -1e4, down: false, inside: false };
    let regions = [], hovered = null, pressed = null, shift = 0, clip = null, pageAlpha = 1;
    let windowName = null, closingName = null;
    let pageIndex = { options: 0, osa: 0 };
    let previousPage = null;
    const windowX = new Motion(-510);
    const tabsAway = new Motion(0);
    const tabsReveal = new Motion(-100);
    const frameWidth = new Motion(460);
    const bumpLeft = new Motion(50);
    const bumpRight = new Motion(173.33);
    const bottom = new Motion(0);
    const pageFade = new Motion(1);
    const dropdownOpen = new Motion(0);
    const tip = { cell: null, motion: new Motion(0) };
    const cardShift = new Glide(0);
    const scroll = new Glide(0);
    let introStart = performance.now(), introDone = false;
    let dropdown = null;
    let editingKey = null;
    const chooser = { cell: null, id: null, h: 0, s: 0, v: 0, pending: null, x: new Motion(-175), y: new Motion(0), anchorX: 0, anchorY: 0 };
    let lastFrame = performance.now();
    let lastPlayersRequest = 0;
    let lastSignature = "";
    const fields = new Map();

    function resize() {
        ratio = window.devicePixelRatio || 1;
        width = window.innerWidth;
        height = window.innerHeight;
        scale = Math.max(width / 1920, height / 1080);
        canvas.width = Math.round(width * ratio);
        canvas.height = Math.round(height * ratio);
        lastSignature = "";
    }
    resize();
    window.addEventListener("resize", resize);

    const inGame = () => !!global.gameStart;
    const onMenu = () => !global.gameStart && !global.gameLoading;
    const viewWidth = () => width / scale;
    const viewHeight = () => height / scale;
    const colors = () => hooks.colors();

    function shade(color, state) {
        let c = colors();
        if (state === 2) return mix(color, c.black, 0.3);
        if (state === 1) return light(color) ? mix(color, c.black, 0.153) : mix(color, "#ffffff", 0.145);
        return color;
    }
    function stateOf(id) {
        if (pressed && (pressed.hoverId || pressed.id) === id && hovered === id) return 2;
        if (hovered === id) return 1;
        return 0;
    }
    function region(id, x, y, w, h, act, extra = {}) {
        y -= shift;
        if (clip) {
            let top = Math.max(y, clip[0]), end = Math.min(y + h, clip[1]);
            if (end <= top) return;
            h = end - top;
            y = top;
        }
        if (extra.tip) extra.tip = { ...extra.tip, y: extra.tip.y - shift };
        regions.push({ id, x, y, w, h, act, ...extra });
    }
    function text(str, x, y, size, color, align = "left", outline = size * 0.2, alpha = 1) {
        if (alpha <= 0) return;
        let c = colors();
        ctx.globalAlpha = alpha * pageAlpha;
        ctx.font = `bold ${size}px Ubuntu`;
        ctx.textAlign = align;
        ctx.textBaseline = "middle";
        if (outline) {
            ctx.lineWidth = outline;
            ctx.lineJoin = "round";
            ctx.strokeStyle = c.black;
            ctx.strokeText(str, x, y);
        }
        ctx.fillStyle = color;
        ctx.fillText(str, x, y);
        ctx.globalAlpha = 1;
    }
    function measure(str, size) {
        ctx.font = `bold ${size}px Ubuntu`;
        return ctx.measureText(str).width;
    }
    function box(x, y, w, h, fill, line = 3) {
        let c = colors();
        ctx.globalAlpha = pageAlpha;
        ctx.lineJoin = "round";
        ctx.fillStyle = fill;
        ctx.fillRect(x, y, w, h);
        ctx.lineWidth = line;
        ctx.strokeStyle = c.black;
        ctx.strokeRect(x, y, w, h);
        ctx.globalAlpha = 1;
    }

    function setting(id, invert = false, live = null) {
        return {
            get: () => {
                let el = document.getElementById(id);
                let on = el ? el.checked : localStorage.getItem(id + "Checked") === "true";
                if (!el && localStorage.getItem(id + "Checked") === null && live) on = live.fallback;
                return invert ? !on : on;
            },
            set: (value) => {
                let el = document.getElementById(id);
                let on = invert ? !value : value;
                if (el) {
                    el.checked = on;
                    hooks.save(id);
                } else localStorage.setItem(id + "Checked", on);
                if (live && live.apply) live.apply(on);
                hooks.apply();
            }
        };
    }
    function choice(id, list) {
        return {
            options: () => (typeof list === "function" ? list() : list),
            get: () => document.getElementById(id).value,
            set: (value) => {
                document.getElementById(id).value = value;
                hooks.save(id);
                hooks.apply();
            }
        };
    }
    const check = (label, model, tipText) => ({ kind: "check", label, model, tip: tipText });
    const select = (model, tipText) => ({ kind: "select", model, tip: tipText });

    const borderThickness = {
        get: () => {
            let value = parseFloat(localStorage.getItem("optBorderThickness"));
            return isNaN(value) ? 1 : value;
        },
        set: (t) => {
            localStorage.setItem("optBorderThickness", t);
            hooks.borderThickness(t);
        }
    };
    hooks.borderThickness(borderThickness.get());

    const optionsPage = () => [
        { title: "Game Appearance" },
        [check("Player Names", setting("optRenderNames"), OPTION_TIPS.names), check("Chat Messages", setting("optChatMessages", false, { fallback: true }), OPTION_TIPS.chat)],
        [check("Player Scores", setting("optRenderScores"), OPTION_TIPS.scores), check("Health Bars", setting("optRenderHealth"), OPTION_TIPS.health)],
        [check("Background Grid", setting("optNoGrid", true), OPTION_TIPS.grid), check("Separate Shield Bar", setting("separatedHealthbars"), OPTION_TIPS.shield)],
        [check("Sharp Traps", setting("optPointy"), OPTION_TIPS.sharpTraps), check("Curvy Traps", setting("optCurvyTraps"), OPTION_TIPS.curvyTraps)],
        [check("Sharp Polygons", setting("optSharpEdges"), OPTION_TIPS.sharpPolygons), check("Tank Skins", setting("optTankSkins"), OPTION_TIPS.skins)],
        [{ kind: "slider", label: "Border Thickness", model: borderThickness, tip: OPTION_TIPS.border }],
        { title: "UI Elements" },
        [check("Upgrades", setting("optRenderUpgrades"), OPTION_TIPS.upgrades), check("Leaderboard", setting("optRenderLeaderboard"), OPTION_TIPS.leaderboard)],
        [check("Player Bars", setting("optRenderPlayerBars"), OPTION_TIPS.bars), check("Minimap", setting("optRenderMinimap"), OPTION_TIPS.minimap)],
        [check("Kill Bar", setting("optRenderKillbar"), OPTION_TIPS.killbar), check("Extra Info", setting("optReducedInfo", true), OPTION_TIPS.extraInfo)],
        { title: "Extra" },
        [select(choice("optUiScale", [["auto", "Auto"], ["small", "Small"], ["normal", "Regular"], ["large", "Large"], ["mobile", "Mobile"]]), OPTION_TIPS.uiSize),
            select(choice("optNames", () => Array.from(document.getElementById("optNames").options).map((o) => [o.value, o.textContent])), OPTION_TIPS.filter)],
        [check("Smooth Camera", setting("smoothCamera"), OPTION_TIPS.camera), check("Fading Animation", setting("optFancy"), OPTION_TIPS.fading)],
        [check("Auto-Level Up", setting("autoLevelUp"), OPTION_TIPS.levelUp), check("Incognito Mode", setting("optIncognitoMode"), OPTION_TIPS.incognito)],
        [check("Auto-Reconnect", setting("optAutoReconnect"), OPTION_TIPS.reconnect)],
        { title: "Performance" },
        [select(choice("optCanvas", () => Array.from(document.getElementById("optCanvas").options).map((o) => [o.value, o.textContent])), OPTION_TIPS.driver),
            check("Low Resolution", setting("optLowResolution"), OPTION_TIPS.lowResolution)]
    ];

    const themeModel = {
        border: choice("optBorders", [["normal", "Light"], ["neon", "Dark"], ["dark", "Classic Dark"], ["glass", "Glass"]])
    };
    const themePage = () => {
        let state = hooks.themes.state();
        let removable = state.personal >= 0 || state.custom;
        return [
            { title: "Theme" },
            [{ kind: "field", key: "themeName", width: 202.5, get: () => state.name, set: (v) => hooks.themes.rename(v, state.author), placeholder: "Name", max: 40 },
                { kind: "field", key: "themeAuthor", width: 202.5, get: () => state.author, set: (v) => hooks.themes.rename(state.name, v), placeholder: "Author", max: 40 }],
            [{ kind: "field", key: "themeCode", width: 311.25, get: () => state.code, set: (v) => hooks.themes.importCode(v), placeholder: "Theme Code", max: 400, commit: true },
                { kind: "button", x: 326.25, width: 93.75, label: state.custom ? "Save" : "Remove", enabled: removable, act: () => (state.custom ? hooks.themes.save() : hooks.themes.remove()), tip: state.custom ? OPTION_TIPS.save : removable ? OPTION_TIPS.remove : OPTION_TIPS.removeDefault }],
            [select({ options: () => hooks.themes.list().map((t) => [t.value, t.name]), get: () => state.value, set: (v) => hooks.themes.pick(v) }, OPTION_TIPS.theme),
                select(themeModel.border, OPTION_TIPS.borderTheme)],
            { title: "Colors" },
            ...[0, 1, 2, 3, 4, 5, 6].map((row) => SWATCHES.slice(row * 3, row * 3 + 3).map(([key, label, tipText]) => ({ kind: "swatch", key, label, tip: tipText, get: () => state.colors[key], set: (v) => hooks.themes.color(key, v) }))),
            { title: "Borders" },
            [{ kind: "slider", label: "Blend Ratio", model: { get: () => state.blend, set: (t) => hooks.themes.blend(t) }, tip: OPTION_TIPS.blend },
                null,
                { kind: "swatch", key: "black", label: "Borders", tip: OPTION_TIPS.borderColor, get: () => state.colors.black, set: (v) => hooks.themes.color("black", v) }],
            [check("Neon Borders", { get: () => state.neon, set: (v) => hooks.themes.neon(v) }, OPTION_TIPS.neon)]
        ];
    };

    function keyEntries(table, list = null) {
        let el = document.getElementById(table);
        if (!el) return [];
        let found = [];
        for (let b of el.querySelectorAll("b[data-key]")) {
            let label = b.parentNode.textContent.replace(b.textContent, "").replace(/^[\s-]+/, "").trim().replace(/(^|[\s#.])([a-z])/g, (all, before, letter) => before + letter.toUpperCase());
            found.push({ key: b.dataset.key, element: b, label });
        }
        if (!list) return found;
        return list.map(([key, label, tipText, note]) => {
            let entry = found.find((e) => e.key === key);
            return entry ? { ...entry, label, tipText, note } : null;
        }).filter((e) => e);
    }
    function keyCell(entry, sandbox = false) {
        if (!entry) return null;
        let base = entry.tipText || `${sandbox ? "Sandbox key for" : "Key for"} ${entry.label.toLowerCase()}`;
        return {
            kind: "key",
            label: entry.label,
            element: entry.element,
            tip: () => {
                let current = entry.element.dataset.default || "";
                let line = current && current !== " " ? `${base}, defaulting to ${current === "␣" ? "space" : current === "⇧" ? "left shift" : current}.` : `${base}.`;
                return entry.note ? `${line}\n${entry.note}` : line;
            }
        };
    }
    function pairs(cells) {
        let rows = [];
        for (let i = 0; i < cells.length; i += 2) rows.push([cells[i], cells[i + 1] || null]);
        return rows;
    }
    const keybindsPage = () => [{ title: "Keybinds" }, ...pairs(keyEntries("controlSettings", KEYBINDS).map((e) => keyCell(e)))];

    const secretsOn = () => setting("optSecretOptions").get();
    const secretsPage = () => {
        let rows = [
            { title: "Secret Options" },
            [check("Crosshair Cursor", setting("optCrosshairCursor", false, { apply: () => global.applyCrosshairCursor() }), "Use a crosshair for the cursor."),
                check("Rainbow Team Colors", setting("optRainbowTeamColors", false, { apply: (on) => hooks.rainbow(on) }), "Replace the colors of the teams with colors of the rainbow.")],
            [check("Uncapped Frame Rate", setting("optUncappedFrameRate"), "Attempt to render as many frames as possible, regardless of your monitor FPS."),
                check("Copy Screenshots", setting("optCopyScreenshots"), "Copy screenshots instead of downloading them.")],
            [check("Force 16:9 Aspect Ratio", setting("optForce169AspectRatio"), "Always use a 16:9 aspect ratio to render the game."),
                check("Self Centered Minimap", setting("optCenterMinimap"), "Make yourself always centered on the minimap.")],
            [check("\"Brainrot\" Filter", setting("optBrainrotFilter", false, { apply: () => global.refreshBrainrotOption() }), "Add the option to filter \"brainrot\" words."),
                setting("optFullSecretOptions").get() ? check("Show Localhost", setting("optShowLocalhost", false, { apply: (on) => hooks.localhost(on) }), "Display wss://localhost:5000/ as one of the servers.") : null],
            { title: "Legacy Options" },
            [check("Legacy Themes", setting("optLegacyThemes", false, { apply: () => global.refreshSecretThemes() }), "Display legacy themes in the options menu.\nNote: This is a legacy option and will be removed in a future update.")]
        ];
        return rows;
    };
    const osaOptionsPage = () => {
        let rows = [
            { title: "Game Appearance" },
            [check("Colored Nest", setting("optColoredNest"), "Color the nest in the middle of the map."), check("Hexagonal Grid", setting("optHexaGrid"), "Make the background grid hexagonal.\nMay slightly lower the frame rate.")],
            [check("Colored Health Bars", setting("coloredHealthbars"), "Make the health and shield bar(s) of entities match their body color."), check("Disable Hyperactivity", setting("optPredictive"), "Stop predicting the movement of entities between server updates.")],
            { title: "UI Elements" },
            [check("GUI", setting("optRenderGui"), "Toggle the visibility of the whole in game interface."), check("Centered Minimap", setting("optCenterMinimap"), "Keep the minimap centered on your tank.")],
            [check("Classic UI Style", setting("optOldUiStyle"), "Changes the UI to the classic layout.")]
        ];
        if (PHONE) {
            rows.push(
                { title: "Mobile" },
                [select(choice("optMobile", [["mobile", "Mobile"], ["mobileWithBigJoysticks", "Mobile + Big Joysticks"], ["desktop", "Desktop"]]), "Choose how the game is controlled on a touch screen.")],
                [check("Crosshair", setting("showCrosshair"), "Show a crosshair on touch screens."), check("Joystick", setting("showJoystick"), "Show the joysticks on touch screens.")]
            );
        }
        rows.push(
            { title: "Performance" },
            [check("Interpolation", setting("optInterpolation"), "Smooth the movement of entities between server updates."), check("Smooth Animations", setting("optLerpAnim"), "Smooth the animations of the interface.")],
            [check("Full HD", setting("optFullHD"), "Line the interface up with whole pixels so its edges stay sharp."), check("Optimize Mode", setting("optOptimizeMode"), "Leave out some effects to raise the frame rate.")],
            [check("Slow FOV Animation", setting("optSlowerFOV"), "Change the field of view more slowly."), check("Delta Entities", setting("optDeltaEntities"), "Support delta entity updates from the server.\nTakes effect on next connection.")],
            { title: "Token" },
            [{ kind: "field", key: "token", width: 420, secret: true, get: () => document.getElementById("playerKeyInput").value, set: (v) => {
                document.getElementById("playerKeyInput").value = v; hooks.save("playerKeyInput"); hooks.token(); 
            }, placeholder: "Insert token here", max: 64, tip: "The token for this server. Your browser keeps it." }],
            { title: "Secret Options" },
            [check("Secret Options", setting("optSecretOptions"), "Unlock the secret options tab.\nNote: Some of these options are hidden for a reason. They can cause glitches, and may get removed at any time."),
                check("Full Secret Options", setting("optFullSecretOptions"), "Unlock more of the secret options tab.\nNote: This is not supposed to be public...")]
        );
        return rows;
    };
    const osaControlsPage = () => {
        let gameplay = keyEntries("controlSettings").filter((e) => !KEYBINDS.some(([key]) => key === e.key));
        let rows = [{ title: "Gameplay" }, ...pairs(gameplay.map((e) => keyCell(e)))];
        for (let [table, title] of [["sandboxControlSettings", "Sandbox"], ["sandboxSkillControlSettings", "Sandbox Skill"], ["sandboxAttributeControlSettings", "Sandbox Attribute"]]) {
            let list = keyEntries(table);
            if (list.length) rows.push({ title }, ...pairs(list.map((e) => keyCell(e, true))));
        }
        return rows;
    };
    const addonLines = () => {
        let el = document.getElementById("tabAddons");
        if (!el) return [];
        let lines = [];
        for (let block of el.querySelectorAll(".optionsHeader")) {
            let parts = Array.from(block.children);
            if (!parts.length) lines.push({ title: block.textContent.trim() });
            else {
                lines.push({ title: parts[0].textContent.trim() });
                for (let part of parts.slice(1)) lines.push({ line: part.textContent.trim() });
            }
        }
        return lines;
    };
    const hasAddons = () => addonLines().length > 1;
    const linkLines = () => {
        let el = document.getElementById("tabAbout");
        if (!el) return [];
        let lines = [];
        for (let child of el.children) {
            if (child.classList.contains("optionsHeader")) lines.push({ title: child.textContent.trim() });
            else for (let a of child.querySelectorAll("a")) lines.push({ line: a.textContent.trim(), href: a.href });
        }
        return lines;
    };

    const WINDOWS = {
        options: { width: 460, tabs: () => (secretsOn() ? ["Options", "Theme", "Keybinds", "Secrets"] : ["Options", "Theme", "Keybinds"]), pages: [optionsPage, themePage, keybindsPage, secretsPage] },
        osa: { width: 460, tabs: () => (hasAddons() ? ["Options", "Controls", "Addons"] : ["Options", "Controls"]), pages: [osaOptionsPage, osaControlsPage, () => addonLines()] },
        links: { width: () => Math.min(440, Math.max(220, 40 + Math.max(0, ...linkLines().filter((l) => l.line).map((l) => measure(l.line, 12))))), title: "Links", lines: linkLines },
        players: { width: 360, height: 500, title: "Players" }
    };

    function sideTabs() {
        let c = colors();
        if (onMenu()) {
            return [
                { label: "Options", color: c.green, open: "options" },
                { label: "Links", color: c.orange, open: "links" }
            ];
        }
        if (!inGame()) return [];
        let list = [{ label: "Options", color: c.green, open: "options" }];
        if ((global.permissionLevel || 0) >= 2) list.push({ label: "Players", color: c.green, open: "players" });
        return list;
    }

    function pageOf(name) {
        let win = WINDOWS[name];
        let count = win && win.tabs ? win.tabs().length : 1;
        if ((pageIndex[name] || 0) >= count) pageIndex[name] = 0;
        return pageIndex[name] || 0;
    }
    function frameOf(name, index) {
        let win = WINDOWS[name];
        let w = widthOf(win);
        if (!win.tabs) return { w, left: 50, right: w };
        let n = win.tabs().length;
        let tab = (w - 50 - 20 * (n - 1)) / n;
        let left = 50 + Math.min(index, n - 1) * (tab + 20);
        return { w, left, right: left + tab };
    }
    function placeFrame(name, index, glide) {
        let f = frameOf(name, index);
        for (let [motion, value] of [[frameWidth, f.w], [bumpLeft, f.left], [bumpRight, f.right]]) {
            if (glide) motion.set(value);
            else motion.jump(value);
        }
    }
    function stopEditing() {
        dropdown = null;
        if (editingKey) hooks.keys.cancel();
        editingKey = null;
        closeChooser();
        for (let field of fields.values()) if (document.activeElement === field) field.blur();
    }
    function open(name) {
        if (windowName === name) return;
        stopEditing();
        if (windowName) return swap(name);
        let returning = closingName === name;
        windowName = name;
        closingName = null;
        windowX.set(25);
        tabsAway.set(-165);
        cardShift.target = 350;
        let page = pageOf(name);
        if (!returning) {
            placeFrame(name, page, false);
            pageFade.jump(1);
            previousPage = null;
            scroll.value = scroll.target = 0;
            bottom.jump(contentBottom(name, page));
        }
        if (name === "players") requestPlayers(true);
    }
    function swap(name) {
        previousPage = { name: windowName, index: pageOf(windowName), scroll: scroll.value, other: true };
        windowName = name;
        let page = pageOf(name);
        pageFade.jump(0);
        pageFade.set(1);
        placeFrame(name, page, true);
        bottom.set(contentBottom(name, page));
        scroll.value = scroll.target = 0;
        if (name === "players") requestPlayers(true);
    }
    function close() {
        if (!windowName) return;
        stopEditing();
        closingName = windowName;
        windowName = null;
        windowX.set(-510);
        tabsAway.set(0);
        cardShift.target = 0;
    }
    function switchPage(index) {
        let name = windowName;
        if (!name || pageOf(name) === index) return;
        stopEditing();
        previousPage = { name, index: pageOf(name), scroll: scroll.value };
        pageIndex[name] = index;
        placeFrame(name, index, true);
        pageFade.jump(0);
        pageFade.set(1);
        bottom.set(contentBottom(name, index));
        scroll.value = scroll.target = 0;
    }
    function requestPlayers(force = false) {
        let now = performance.now();
        if (!force && now - lastPlayersRequest < 1000) return;
        lastPlayersRequest = now;
        hooks.requestPlayers();
    }

    function layout(rows) {
        let placed = [], y = 75, first = true, last = 75;
        for (let row of rows) {
            if (row && row.title !== undefined && !Array.isArray(row)) {
                let titleY = first ? 98.75 : last + 34.25;
                placed.push({ title: row.title, y: titleY });
                y = first ? 120 : last + 55;
                first = false;
                continue;
            }
            placed.push({ row, y });
            last = y + 25;
            y += 40;
        }
        return { placed, end: last };
    }
    function wrap(words, size, max) {
        let rows = [], line = "";
        for (let word of words.split(" ")) {
            let attempt = line ? line + " " + word : word;
            if (measure(attempt, size) > max && line) {
                rows.push(line);
                line = word;
            } else line = attempt;
        }
        rows.push(line);
        return rows;
    }
    function linesLayout(lines, w) {
        let placed = [], last = 75, first = true, afterTitle = false;
        for (let entry of lines) {
            if (entry.title !== undefined) {
                let size = measure(entry.title, 17) <= w - 30 ? 17 : 12;
                let rows = wrap(entry.title, size, w - 30);
                let y = first ? 99.5 : last + 32.3;
                placed.push({ ...entry, y, size, rows });
                last = y + (rows.length - 1) * 15;
                first = false;
                afterTitle = true;
            } else {
                let y = afterTitle ? last + 23.95 : last + 19.75;
                placed.push({ ...entry, y });
                last = y;
                afterTitle = false;
            }
        }
        return { placed, end: last + 21.8 };
    }
    function widthOf(win) {
        return typeof win.width === "function" ? win.width() : win.width;
    }
    function contentBottom(name, page) {
        let win = WINDOWS[name];
        if (!win) return 400;
        if (win.height) return 25 + win.height;
        if (win.lines) return linesLayout(win.lines(), widthOf(win)).end;
        if (name === "osa" && page === 2) return linesLayout(addonLines(), widthOf(win)).end;
        return layout(win.pages[page]()).end + 20;
    }

    function drawSideTabs() {
        let tabs = sideTabs();
        if (!tabs.length) return;
        let now = performance.now();
        let menu = onMenu();
        let anyHover = typeof hovered === "string" && hovered.startsWith("side");
        let offset;
        if (menu) {
            if (!introDone) {
                let p = settle((now - introStart) / DURATION);
                offset = -165 * (1 - (0.4 * p + 0.6 * p * p));
                if (p >= 1) introDone = true;
            } else offset = 0;
            offset += tabsAway.value;
        } else {
            let target = windowName ? -165 : anyHover || pointerNearTabs(tabs) ? 0 : -100;
            tabsReveal.set(target);
            offset = tabsReveal.value;
        }
        let c = colors();
        tabs.forEach((tab, i) => {
            let y = 25 + 40 * i;
            if (menu && !introDone) y = 25 + 40 * i * settle((now - introStart) / DURATION);
            let x = offset;
            let id = "side" + i;
            let fill = shade(tab.color, stateOf(id) === 2 ? 1 : stateOf(id));
            box(x, y, 120, 30, fill);
            text(tab.label, x + 49.875, y + 15, 13.5, c.guiwhite, "center", 3.375);
            ctx.strokeStyle = c.black;
            ctx.lineWidth = 6;
            ctx.lineCap = "round";
            ctx.beginPath();
            ctx.moveTo(x + 99.75, y + 3);
            ctx.lineTo(x + 99.75, y + 27);
            ctx.stroke();
            ctx.fillStyle = c.guiwhite;
            ctx.strokeStyle = c.guiwhite;
            ctx.lineWidth = 3;
            ctx.lineJoin = "round";
            ctx.beginPath();
            ctx.moveTo(x + 108.75, y + 10.5);
            ctx.lineTo(x + 113.25, y + 15);
            ctx.lineTo(x + 108.75, y + 19.5);
            ctx.closePath();
            ctx.fill();
            ctx.stroke();
            if (x + 120 > 0) region(id, Math.max(0, x), y, x + 120 - Math.max(0, x), 30, () => open(tab.open), { side: true });
        });
    }
    function pointerNearTabs(tabs) {
        return pointer.inside && pointer.x >= 0 && pointer.x <= 20 && pointer.y >= 25 && pointer.y <= 25 + 40 * tabs.length - 10;
    }

    function drawWindow(dt) {
        let name = windowName || closingName;
        if (!name) return;
        let L = windowX.value;
        if (!windowName && !windowX.moving) {
            closingName = null;
            return;
        }
        if (windowName) placeFrame(name, pageOf(name), true);
        let width = frameWidth.value;
        let c = colors();
        let B = Math.min(bottom.value, viewHeight() - 25);
        let fade = pageFade.progress;
        let swapping = !!(previousPage && previousPage.other && pageFade.moving);
        let outAlpha = swapping && fade < 0.5 ? 1 - 2 * fade : 0;
        let inAlpha = swapping ? Math.max(0, 2 * fade - 1) : 1;
        region("window", L, 75, width, B - 75, null, { solid: true });
        region("windowTop", L + 50, 25, width - 50, 50, null, { solid: true });
        const tabsOf = (wname) => {
            let w = WINDOWS[wname];
            if (!w.tabs) return null;
            let labels = w.tabs();
            let size = (width - 50 - 20 * (labels.length - 1)) / labels.length;
            return { labels, size, page: pageOf(wname) };
        };
        const tabBoxes = (wname, alpha, live) => {
            let t = tabsOf(wname);
            if (!t || alpha <= 0) return;
            pageAlpha = alpha;
            t.labels.forEach((label, i) => box(L + 50 + i * (t.size + 20), 25, t.size, 50, shade(mix(c.grey, "#000000", 0.12), live && i !== t.page ? stateOf("tab" + i) : 0)));
            pageAlpha = 1;
        };
        const tabLabels = (wname, alpha, live) => {
            if (alpha <= 0) return;
            let t = tabsOf(wname);
            if (!t) return text(WINDOWS[wname].title, L + 50 + (width - 50) / 2, 50, 18, c.guiwhite, "center", 3.6, alpha);
            t.labels.forEach((label, i) => {
                let x = L + 50 + i * (t.size + 20);
                text(label, x + t.size / 2, 50, 18, c.guiwhite, "center", 3.6, alpha);
                if (live && i !== t.page) region("tab" + i, x, 25, t.size, 50, () => switchPage(i));
            });
        };
        if (swapping) tabBoxes(previousPage.name, outAlpha, false);
        tabBoxes(name, inAlpha, !swapping);
        let bl = L + bumpLeft.value, br = L + bumpRight.value;
        ctx.beginPath();
        ctx.moveTo(L, 75);
        ctx.lineTo(bl, 75);
        ctx.lineTo(bl, 25);
        ctx.lineTo(br, 25);
        ctx.lineTo(br, 75);
        ctx.lineTo(L + width, 75);
        ctx.lineTo(L + width, B);
        ctx.lineTo(L, B);
        ctx.closePath();
        ctx.fillStyle = c.grey;
        ctx.fill();
        ctx.lineWidth = 3;
        ctx.lineJoin = "round";
        ctx.strokeStyle = c.black;
        ctx.stroke();
        if (swapping) tabLabels(previousPage.name, outAlpha, false);
        tabLabels(name, inAlpha, !swapping);
        box(L, 25, 30, 30, shade(c.red, stateOf("close")));
        ctx.strokeStyle = c.guiwhite;
        ctx.lineWidth = 3;
        ctx.lineCap = "round";
        ctx.beginPath();
        ctx.moveTo(L + 7.5, 32.5);
        ctx.lineTo(L + 22.5, 47.5);
        ctx.moveTo(L + 7.5, 47.5);
        ctx.lineTo(L + 22.5, 32.5);
        ctx.stroke();
        region("close", L, 25, 30, 30, close);

        let clipTop = 90, clipBottom = B - 17.5;
        let end = name === "players" ? 125 + 30 * (Array.isArray(global.playerList) ? global.playerList.length : 0) : bottom.to;
        let maxScroll = Math.max(0, end - B);
        scroll.target = Math.max(0, Math.min(maxScroll, scroll.target));
        scroll.step(dt);
        ctx.save();
        ctx.beginPath();
        ctx.rect(L + 17.75, clipTop, width - 17, clipBottom - clipTop);
        ctx.clip();
        let alpha = previousPage && pageFade.moving ? (fade < 0.5 ? 1 - 2 * fade : 2 * fade - 1) : 1;
        let showing = previousPage && pageFade.moving && fade < 0.5 ? previousPage : { name, index: pageOf(name), scroll: scroll.value };
        ctx.translate(0, -showing.scroll);
        shift = showing.scroll;
        clip = [clipTop, clipBottom];
        pageAlpha = alpha;
        drawPage(showing.name, showing.index, L, alpha, showing === previousPage, clipTop, clipBottom, showing.scroll);
        shift = 0;
        clip = null;
        pageAlpha = 1;
        ctx.restore();
        if (!pageFade.moving) previousPage = null;
        region("scroll", L, 75, width, B - 75, null, { scroll: maxScroll > 0 });
    }

    function drawPage(name, index, L, alpha, stale, clipTop, clipBottom, offset) {
        let win = WINDOWS[name];
        let width = widthOf(win);
        if (name === "players") return drawPlayers(L, alpha, clipTop, clipBottom, offset);
        if (win.lines) return drawLines(win.lines(), L, width, alpha);
        if (name === "osa" && index === 2) return drawLines(addonLines(), L, width, alpha);
        let { placed } = layout(win.pages[index]());
        let c = colors();
        for (let item of placed) {
            if (item.title !== undefined) {
                text(item.title, L + width / 2, item.y, 17, c.guiwhite, "center", 3.45, alpha);
                continue;
            }
            let row = item.row;
            let three = row.length === 3 || row.some((cell) => cell && cell.kind === "swatch");
            row.forEach((cell, i) => {
                if (!cell) return;
                let x = cell.x !== undefined ? L + cell.x + 20 : L + (three ? 20 + 145 * i : i === 0 ? 20 : 237.5);
                drawCell(cell, x, item.y, alpha, stale, clipTop, clipBottom, offset, `${name}${index}:${item.y}:${i}`);
            });
        }
    }

    function drawCell(cell, x, y, alpha, stale, clipTop, clipBottom, offset, id) {
        let c = colors();
        let visible = y + 25 - offset > clipTop && y - offset < clipBottom;
        let interactive = !stale && alpha >= 1 && visible;
        ctx.globalAlpha = alpha;
        let tipWidth = 25;
        switch (cell.kind) {
            case "check": {
                let on = cell.model.get();
                box(x, y, 25, 25, shade(on ? c.green : c.guiwhite, stateOf(id)));
                ctx.globalAlpha = pageAlpha;
                if (on) {
                    ctx.strokeStyle = c.guiwhite;
                    ctx.lineWidth = 3;
                    ctx.lineCap = "round";
                    ctx.lineJoin = "round";
                    ctx.beginPath();
                    ctx.moveTo(x + 5.625, y + 14.375);
                    ctx.lineTo(x + 9.375, y + 18.125);
                    ctx.lineTo(x + 19.375, y + 8.125);
                    ctx.stroke();
                }
                text(cell.label, x + 34.5, y + 12.5, 15, c.guiwhite, "left", 3, alpha);
                tipWidth = 34.5 + measure(cell.label, 15);
                if (interactive) {
                    region(id, x, y, 25, 25, () => cell.model.set(!on));
                    region(id + "label", x + 25, y, tipWidth - 25, 25, () => cell.model.set(!on), { hoverId: id });
                }
                break;
            }
            case "slider": {
                let t = Math.max(0, Math.min(1, cell.model.get()));
                box(x, y + 2.5, 150, 20, c.guiwhite);
                let knob = x + 137.5 * t;
                box(x, y + 2.5, knob - x, 20, mix(c.green, "#ffffff", 0.3));
                box(knob, y, 12.5, 25, shade(c.green, stateOf(id)));
                text(cell.label, x + 159.75, y + 12.5, 15, c.guiwhite, "left", 3, alpha);
                tipWidth = 159.75 + measure(cell.label, 15);
                if (interactive) region(id, x, y, 150, 25, null, { drag: (px) => cell.model.set(Math.max(0, Math.min(1, (px - x - 6.25) / 137.5))) });
                break;
            }
            case "select": {
                let options = cell.model.options();
                let value = cell.model.get();
                let current = options.find((o) => o[0] === value) || options[0] || ["", ""];
                box(x, y, 202.5, 25, c.guiwhite);
                text(current[1], x + 11.8, y + 12.5, 12.5, c.guiwhite, "left", 2.55, alpha);
                ctx.globalAlpha = pageAlpha;
                ctx.fillStyle = c.black;
                ctx.beginPath();
                ctx.moveTo(x + 181.25, y + 9.4);
                ctx.lineTo(x + 193.75, y + 9.4);
                ctx.lineTo(x + 187.5, y + 15.6);
                ctx.closePath();
                ctx.fill();
                tipWidth = 202.5;
                if (interactive) {
                    region(id, x, y, 202.5, 25, () => {
                        closeChooser();
                        if (dropdown && dropdown.id === id) {
                            dropdown = null;
                            return;
                        }
                        dropdown = { id, cell, x, y: y + 25 - offset, options };
                        dropdownOpen.jump(0);
                        dropdownOpen.set(1);
                    });
                }
                break;
            }
            case "swatch": {
                let value = cell.get() || "#000000";
                box(x, y, 25, 25, value);
                text(cell.label, x + 34.5, y + 12.5, 15, c.guiwhite, "left", 3, alpha);
                tipWidth = 34.5 + measure(cell.label, 15);
                if (chooser.id === id && !stale) {
                    chooser.anchorX = Math.min(x, viewWidth() - 160);
                    chooser.anchorY = chooserTop(y - offset);
                }
                if (interactive) region(id, x, y, tipWidth, 25, () => (chooser.id === id ? closeChooser() : openChooser(cell, id, x, y - offset)), { swatch: true });
                break;
            }
            case "key": {
                let editing = editingKey && editingKey.element === cell.element;
                box(x, y, 25, 25, shade(c.guiwhite, editing ? 0 : stateOf(id)));
                if (editing) {
                    ctx.globalAlpha = pageAlpha;
                    ctx.fillStyle = c.black;
                    ctx.fillRect(x + 3.75, y + 3.75, 17.5, 17.5);
                }
                let label = cell.element.innerText.trim();
                text(label, x + 12.5, y + 12.9, 13.8, editing ? c.guiwhite : c.black, "center", 0, alpha);
                text(cell.label, x + 34.5, y + 12.5, 15, c.guiwhite, "left", 3, alpha);
                tipWidth = 34.5 + measure(cell.label, 15);
                if (interactive) {
                    region(id, x, y, tipWidth, 25, () => {
                        editingKey = editing ? null : cell;
                        if (editingKey) hooks.keys.select(cell.element);
                        else hooks.keys.cancel();
                    });
                }
                break;
            }
            case "field": {
                let w = cell.width;
                box(x, y, w, 25, c.guiwhite);
                placeField(cell, x, y, w, alpha, interactive || (visible && !stale));
                tipWidth = w;
                if (interactive) region(id, x, y, w, 25, null, { field: true });
                break;
            }
            case "button": {
                let enabled = cell.enabled;
                let fill = enabled ? shade(c.grey, stateOf(id)) : mix(c.grey, c.black, 0.25);
                box(x, y, cell.width, 25, fill);
                text(cell.label, x + cell.width / 2, y + 12.5, 12.5, enabled ? c.guiwhite : mix(c.guiwhite, c.grey, 0.25), "center", 2.55, alpha);
                tipWidth = cell.width;
                if (interactive) region(id, x, y, cell.width, 25, enabled ? cell.act : null);
                break;
            }
        }
        ctx.globalAlpha = 1;
        if (interactive && cell.tip) region(id + "tip", x, y, tipWidth, 25, null, { tip: { cell, x, y } });
    }

    function placeField(cell, x, y, w, alpha, visible) {
        let field = fields.get(cell.key);
        if (!field) {
            field = document.createElement("input");
            field.type = cell.secret ? "password" : "text";
            field.className = "menuField";
            field.spellcheck = false;
            field.autocomplete = "off";
            field.maxLength = cell.max || 64;
            field.placeholder = cell.placeholder || "";
            field.addEventListener("keydown", (e) => {
                e.stopPropagation();
                if (e.key === "Enter") field.blur();
            });
            field.addEventListener("keyup", (e) => e.stopPropagation());
            field.addEventListener(cell.commit ? "change" : "input", () => field.cell.set(field.value));
            document.body.appendChild(field);
            fields.set(cell.key, field);
        }
        field.cell = cell;
        field.used = true;
        let k = scale;
        let o = cell.box || { dx: 12.5, dy: 2.5, dw: 25, h: 20, font: 12.5, clip: true };
        let top = (y + o.dy - shift) * k;
        if (!visible || alpha <= 0.01) {
            field.style.display = "none";
            return;
        }
        if (document.activeElement !== field) {
            let value = cell.get() || "";
            if (field.value !== value) field.value = value;
        }
        field.style.display = "block";
        field.style.left = `${(x + o.dx) * k}px`;
        field.style.top = `${top}px`;
        field.style.width = `${(w - o.dw) * k}px`;
        field.style.height = `${o.h * k}px`;
        field.style.fontSize = `${o.font * k}px`;
        field.style.opacity = alpha;
        field.style.color = colors().black;
        let rect = { top: 90 * k, bottom: (Math.min(bottom.value, viewHeight() - 25) - 17.5) * k };
        field.style.clipPath = o.clip ? `inset(${Math.max(0, rect.top - top)}px 0 ${Math.max(0, top + o.h * k - rect.bottom)}px 0)` : "none";
    }

    function drawLines(lines, L, w, alpha) {
        let c = colors();
        let { placed } = linesLayout(lines, w);
        for (let entry of placed) {
            if (entry.title !== undefined) {
                entry.rows.forEach((row, i) => text(row, L + w / 2, entry.y + i * 15, entry.size, c.guiwhite, "center", entry.size * 0.2, alpha));
            } else {
                let id = "line:" + entry.line;
                let color = entry.href && hovered === id ? mix(c.guiwhite, c.black, 0.2) : c.guiwhite;
                text(entry.line, L + w / 2, entry.y, 12, color, "center", 2.4, alpha);
                if (entry.href && alpha >= 1) {
                    let lw = measure(entry.line, 12);
                    region(id, L + w / 2 - lw / 2, entry.y - 9, lw, 18, () => window.open(entry.href, "_blank", "noopener"));
                }
            }
        }
    }

    function drawPlayers(L, alpha, clipTop, clipBottom, offset) {
        let c = colors();
        let list = Array.isArray(global.playerList) ? global.playerList : [];
        let mine = global.permissionLevel || 0;
        requestPlayers();
        list.forEach((player, i) => {
            let y = 105 + 30 * i;
            if (y + 15 - offset < clipTop || y - 15 - offset > clipBottom) return;
            if (player.index >= 0) hooks.drawTank(ctx, player.index, player.color, L + 30, y, 22.5, alpha);
            let name = player.name || "(unnamed)";
            ctx.globalAlpha = alpha;
            text(name, L + 47, y, 15, player.name ? c.guiwhite : mix(c.guiwhite, c.grey, 0.35), "left", 3, alpha);
            let tag = RANKS[player.rank] || "";
            let end = L + 47 + measure(name, 15);
            if (tag) {
                ctx.fillStyle = c.black;
                ctx.globalAlpha = alpha;
                ctx.fillRect(end + 9.5, y - 7.5, 15, 15);
                text(tag, end + 17, y + 0.5, 7, c.guiwhite, "center", 0, alpha);
            }
            [["P", "Promote", player.promote, c.green, 0], ["D", "Demote", player.demote, c.red, 1], ["K", "Kick", player.kick, c.orange, 2]].forEach(([letter, word, allowed, color, slot]) => {
                if (!allowed || mine < 2) return;
                let x = L + 273.75 + slot * 24.375;
                let id = `player:${player.id}:${letter}`;
                ctx.globalAlpha = alpha;
                box(x, y - 9, 18, 18, shade(color, stateOf(id)));
                text(letter, x + 9, y + 0.5, 13.5, c.guiwhite, "center", 2.7, alpha);
                if (alpha >= 1) {
                    region(id, x, y - 9, 18, 18, () => hooks.playerAction(player.id, slot));
                    region(id + "tip", x, y - 9, 18, 18, null, { tip: { cell: word, text: word, x, y: y - 9, size: 18 } });
                }
            });
            ctx.globalAlpha = 1;
        });
    }

    const hexCell = {
        kind: "field",
        key: "chooserHex",
        max: 8,
        commit: true,
        box: { dx: 9.9, dy: 1.98, dw: 19.8, h: 15.84, font: 9.9, clip: false },
        get: () => toHex(chooser.h, chooser.s, chooser.v),
        set: (value) => {
            let text = value.trim().replace(/^#?/, "#");
            if (/^#[0-9a-f]{3}$/i.test(text)) text = "#" + text.slice(1).split("").map((d) => d + d).join("");
            if (!/^#[0-9a-f]{6}$/i.test(text)) return;
            Object.assign(chooser, toHsv(text));
            chooser.pending = text.toLowerCase();
            lastSignature = "";
        }
    };
    function chooserTop(swatchTop) {
        let below = swatchTop + 35;
        if (below + 216 <= viewHeight()) return below;
        let above = swatchTop - 226;
        return above >= 0 ? above : Math.max(0, viewHeight() - 216);
    }
    function openChooser(cell, id, x, y) {
        dropdown = null;
        let wasOpen = !!chooser.id;
        applyChooser();
        chooser.cell = cell;
        chooser.id = id;
        Object.assign(chooser, toHsv(cell.get() || "#000000"));
        chooser.anchorX = Math.min(x, viewWidth() - 160);
        chooser.anchorY = chooserTop(y);
        if (wasOpen) chooser.y.set(chooser.anchorY);
        else chooser.y.jump(chooser.anchorY);
        chooser.x.set(chooser.anchorX);
    }
    function closeChooser() {
        if (!chooser.id) return;
        applyChooser();
        chooser.id = null;
        chooser.x.set(-175);
        let field = fields.get("chooserHex");
        if (field && document.activeElement === field) field.blur();
    }
    function applyChooser() {
        if (!chooser.pending || !chooser.cell) return;
        let value = chooser.pending;
        chooser.pending = null;
        chooser.cell.set(value);
    }
    function pickAt(px, py) {
        let X = chooser.x.value, T = chooser.y.value;
        chooser.s = Math.max(0, Math.min(1, (px - X - 10) / 140));
        chooser.v = 1 - Math.max(0, Math.min(1, (py - T - 10) / 140));
        chooser.pending = toHex(chooser.h, chooser.s, chooser.v);
    }
    function hueAt(px) {
        chooser.h = Math.max(0, Math.min(1, (px - chooser.x.value - 10) / 140)) * 360;
        chooser.pending = toHex(chooser.h, chooser.s, chooser.v);
    }
    function drawChooser() {
        let X = chooser.x.value;
        if (!chooser.id && !chooser.x.moving) chooser.cell = null;
        if (!chooser.cell) return;
        if (chooser.id) {
            chooser.x.set(chooser.anchorX);
            if (!chooser.y.moving) chooser.y.jump(chooser.anchorY);
        }
        let T = chooser.y.value;
        let c = colors();
        if (chooser.id) region("chooser", X, T, 160, 216, null, { solid: true });
        box(X, T, 160, 216, mix(c.grey, c.black, 0.5));
        let across = ctx.createLinearGradient(X + 10, 0, X + 150, 0);
        across.addColorStop(0, "#ffffff");
        across.addColorStop(1, toHex(chooser.h, 1, 1));
        ctx.fillStyle = across;
        ctx.fillRect(X + 10, T + 10, 140, 140);
        let down = ctx.createLinearGradient(0, T + 10, 0, T + 150);
        down.addColorStop(0, "rgba(0, 0, 0, 0)");
        down.addColorStop(1, "#000000");
        ctx.fillStyle = down;
        ctx.fillRect(X + 10, T + 10, 140, 140);
        ctx.lineWidth = 3;
        ctx.strokeStyle = c.black;
        ctx.strokeRect(X + 8.5, T + 8.5, 143, 143);
        let mx = X + 10 + chooser.s * 140, my = T + 10 + (1 - chooser.v) * 140;
        ctx.fillStyle = c.black;
        ctx.beginPath();
        ctx.arc(mx, my, 5, 0, Math.PI * 2);
        ctx.fill();
        ctx.fillStyle = toHex(chooser.h, chooser.s, chooser.v);
        ctx.beginPath();
        ctx.arc(mx, my, 4, 0, Math.PI * 2);
        ctx.fill();
        let hues = ctx.createLinearGradient(X + 10, 0, X + 150, 0);
        HUES.forEach((hue, i) => hues.addColorStop(i / 6, hue));
        ctx.fillStyle = hues;
        ctx.fillRect(X + 10, T + 161.2, 140, 16.8);
        ctx.lineWidth = 3;
        ctx.strokeRect(X + 8.5, T + 159.7, 143, 19.8);
        let hx = X + 10 + chooser.h / 360 * 140;
        ctx.lineWidth = 1.5;
        ctx.strokeRect(hx - 3, T + 161.2, 6, 16.8);
        ctx.fillStyle = toHex(chooser.h, 1, 1);
        ctx.fillRect(hx - 3, T + 161.2, 6, 16.8);
        box(X + 8.5, T + 187.7, 143, 19.8, c.guiwhite);
        placeField(hexCell, X + 8.5, T + 187.7, 143, 1, true);
        if (chooser.id) {
            region("chooserSquare", X + 10, T + 10, 140, 140, null, { drag: pickAt });
            region("chooserHue", X + 10, T + 159.7, 140, 19.8, null, { drag: hueAt });
            region("chooserHex", X + 8.5, T + 187.7, 143, 19.8, null, { field: true });
        }
    }

    function drawDropdown() {
        if (!dropdown) return;
        let c = colors();
        let p = dropdownOpen.value;
        let h = dropdown.options.length * 25 * p;
        let x = dropdown.x, y = dropdown.y;
        region("dropdownArea", x, y, 202.5, h, null, { solid: true });
        ctx.save();
        ctx.beginPath();
        ctx.rect(x - 2, y, 206.5, h + 2);
        ctx.clip();
        dropdown.options.forEach(([key, label], i) => {
            let id = "drop" + i;
            let top = y + 25 * i;
            ctx.fillStyle = shade(c.guiwhite, stateOf(id));
            ctx.fillRect(x, top, 202.5, 25);
            if (i) {
                ctx.strokeStyle = c.black;
                ctx.lineWidth = 3;
                ctx.beginPath();
                ctx.moveTo(x, top);
                ctx.lineTo(x + 202.5, top);
                ctx.stroke();
            }
            text(label, x + 11.8, top + 12.5, 12.5, c.guiwhite, "left", 2.55);
            if (top + 25 <= y + h + 0.5) {
                region(id, x, top, 202.5, 25, () => {
                    dropdown.cell.model.set(key);
                    dropdown = null;
                });
            }
        });
        ctx.restore();
        ctx.lineWidth = 3;
        ctx.strokeStyle = c.black;
        ctx.strokeRect(x, y, 202.5, h);
    }

    function drawTip() {
        let hit = regions.slice().reverse().find((r) => r.tip && inside(r));
        let key = hit ? hit.id : null;
        if (key !== tip.key) {
            tip.key = key;
            tip.motion.jump(0);
            if (key) tip.motion.set(1);
        }
        tip.cell = hit ? hit.tip.cell : null;
        tip.place = hit ? hit.tip : null;
        if (!tip.cell || !tip.place || dropdown || chooser.id) return;
        let raw = tip.place.text || (typeof tip.cell.tip === "function" ? tip.cell.tip() : tip.cell.tip);
        if (!raw) return;
        let lines = raw.split("\n");
        let a = tip.motion.value;
        let c = colors();
        let size = tip.place.size || 25;
        let w = Math.max(...lines.map((l) => measure(l, 15)));
        let x = tip.place.x, top = tip.place.y + size + 8;
        ctx.globalAlpha = 0.6 * a;
        ctx.strokeStyle = c.black;
        ctx.fillStyle = c.black;
        ctx.lineWidth = 16;
        ctx.lineJoin = "round";
        let ih = 15 + 17.5 * (lines.length - 1);
        ctx.strokeRect(x + 8, top + 8, w - 0.5, ih);
        ctx.fillRect(x + 8, top + 8, w - 0.5, ih);
        ctx.globalAlpha = 1;
        lines.forEach((line, i) => text(line, x + 7.5, top + 15.75 + 17.5 * i, 15, c.guiwhite, "left", 3, a));
    }

    function inside(r) {
        return pointer.inside && pointer.x >= r.x && pointer.x <= r.x + r.w && pointer.y >= r.y && pointer.y <= r.y + r.h;
    }
    function hitTest() {
        for (let i = regions.length - 1; i >= 0; i--) {
            let r = regions[i];
            if (r.tip || r.scroll !== undefined) continue;
            if (inside(r)) return r;
        }
        return null;
    }

    function signature() {
        return [windowName, closingName, hovered, pressed && pressed.id, pageIndex.options, pageIndex.osa, dropdown && dropdown.id, editingKey && editingKey.label, width, height, sideTabs().length, global.gameStart, global.gameLoading, tip.key, scroll.value.toFixed(2), JSON.stringify(global.playerList || []), hooks.themes.state().code, chooser.id, chooser.h.toFixed(2), chooser.s.toFixed(4), chooser.v.toFixed(4)].join("|");
    }
    function busy() {
        return windowX.moving || tabsAway.moving || tabsReveal.moving || frameWidth.moving || bumpLeft.moving || bumpRight.moving || chooser.x.moving || chooser.y.moving || bottom.moving || pageFade.moving || dropdownOpen.moving || tip.motion.moving || cardShift.moving || scroll.moving || !introDone;
    }

    function frame() {
        requestAnimationFrame(frame);
        let now = performance.now();
        let dt = Math.min(100, now - lastFrame);
        lastFrame = now;
        if (!onMenu() && cardShift.target) cardShift.target = 0;
        if (onMenu() && card) {
            cardShift.step(dt);
            let base = (viewWidth() - 1120) / 2;
            root.style.setProperty("--s", scale);
            root.style.setProperty("--card-x", `${(base + cardShift.value) * scale}px`);
            root.style.setProperty("--card-y", `${80 * scale}px`);
        }
        if (!onMenu() && !inGame() && windowName) close();
        if (windowName === "players" && (global.permissionLevel || 0) < 2) close();
        applyChooser();
        let sig = signature();
        if (!busy() && sig === lastSignature) return;
        lastSignature = sig;
        regions = [];
        for (let field of fields.values()) field.used = false;
        ctx.setTransform(1, 0, 0, 1, 0, 0);
        ctx.clearRect(0, 0, canvas.width, canvas.height);
        ctx.setTransform(scale * ratio, 0, 0, scale * ratio, 0, 0);
        if (onMenu() || inGame()) {
            drawWindow(dt);
            drawChooser();
            drawSideTabs();
            drawDropdown();
            drawTip();
        }
        for (let field of fields.values()) if (!field.used) field.style.display = "none";
        let hit = hitTest();
        let id = hit ? hit.hoverId || hit.id : null;
        if (id !== hovered) {
            hovered = id;
            lastSignature = "";
        }
        catchPointer();
        canvas.style.cursor = hit && (hit.act || hit.drag) ? "pointer" : "";
    }

    function toLocal(e) {
        pointer.x = e.clientX / scale;
        pointer.y = e.clientY / scale;
        pointer.inside = true;
    }
    function catchPointer() {
        let over = regions.some((r) => !r.tip && inside(r));
        canvas.style.pointerEvents = over || pressed || ((dropdown || chooser.id) && inGame()) ? "auto" : "none";
    }
    window.addEventListener("pointermove", (e) => {
        toLocal(e);
        if (pressed && pressed.drag) pressed.drag(pointer.x, pointer.y);
        catchPointer();
        lastSignature = "";
    }, true);
    window.addEventListener("pointerdown", (e) => {
        toLocal(e);
        let hit = hitTest();
        if (dropdown && hit && (hit.hoverId || hit.id) === dropdown.id) {
            dropdown = null;
            e.preventDefault();
            e.stopPropagation();
            lastSignature = "";
            return;
        }
        if (dropdown && (!hit || !String(hit.id).startsWith("drop"))) {
            dropdown = null;
            if (hit && hit.id === "dropdownArea") return;
            if (!hit) return;
        }
        if (chooser.id && !(hit && (String(hit.id).startsWith("chooser") || hit.swatch))) closeChooser();
        if (!hit) {
            canvas.style.pointerEvents = "none";
            if (editingKey) {
                editingKey = null;
                hooks.keys.cancel();
            }
            return;
        }
        if (!hit.field) {
            e.preventDefault();
            for (let field of fields.values()) if (document.activeElement === field) field.blur();
        }
        e.stopPropagation();
        pressed = hit;
        hovered = hit.hoverId || hit.id;
        if (hit.drag) hit.drag(pointer.x, pointer.y);
        lastSignature = "";
    }, true);
    window.addEventListener("pointerup", (e) => {
        toLocal(e);
        let was = pressed;
        pressed = null;
        if (!was) return;
        e.stopPropagation();
        let hit = hitTest();
        if (hit && hit.id === was.id && was.act) was.act();
        lastSignature = "";
    }, true);
    canvas.addEventListener("click", (e) => e.stopPropagation());
    canvas.addEventListener("contextmenu", (e) => e.preventDefault());
    window.addEventListener("wheel", (e) => {
        toLocal(e);
        let area = regions.find((r) => r.scroll && inside(r));
        if (!area || dropdown) return;
        scroll.target += e.deltaY * (e.deltaMode === 1 ? 40 : e.deltaMode === 2 ? 400 : 1) / scale;
        e.stopPropagation();
        lastSignature = "";
    }, { capture: true, passive: true });
    document.addEventListener("mouseleave", () => {
        pointer.inside = false;
        lastSignature = "";
    });
    window.addEventListener("keydown", (e) => {
        if (!editingKey) return;
        e.preventDefault();
        e.stopPropagation();
        hooks.keys.press(e);
        if (!hooks.keys.editing()) editingKey = null;
        lastSignature = "";
    }, true);
    let more = document.getElementById("moreOptions");
    if (more) {
        more.addEventListener("click", () => {
            if (windowName !== "osa") open("osa");
        });
    }

    requestAnimationFrame(frame);
    return {
        isOpen: () => !!windowName,
        close,
        refresh: () => {
            lastSignature = "";
        }
    };
}
