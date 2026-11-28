import { config } from "./config.js";
import { util } from "./util.js";
import { gui } from "./socketinit.js";

const staticStringColorNameMap = new Map([
    [0, "teal"],
    ["teal", "teal"],
    [1, "lgreen"],
    ["lime", "lgreen"],
    ["lightGreen", "lgreen"],
    [2, "orange"],
    ["orange", "orange"],
    [3, "yellow"],
    ["yellow", "yellow"],
    ["lavender", "lavender"],
    [4, "aqua"],
    ["aqua", "aqua"],
    [5, "pink"],
    ["pink", "pink"],
    [6, "vlgrey"],
    ["veryLightGrey", "vlgrey"],
    [7, "lgrey"],
    ["lightGrey", "lgrey"],
    [8, "guiwhite"],
    ["pureWhite", "guiwhite"],
    [9, "black"],
    ["black", "black"],
    [10, "blue"],
    ["blue", "blue"],
    [11, "green"],
    ["green", "green"],
    [12, "red"],
    ["red", "red"],
    [13, "gold"],
    ["gold", "gold"],
    [14, "purple"],
    ["purple", "purple"],
    [15, "magenta"],
    ["magenta", "magenta"],
    [16, "grey"],
    ["grey", "grey"],
    [17, "dgrey"],
    ["darkGrey", "dgrey"],
    [18, "white"],
    ["white", "white"],
    [19, "guiblack"],
    ["pureBlack", "guiblack"],
    [25, "mustard"],
    ["mustard", "mustard"],
    [26, "tangerine"],
    ["tangerine", "tangerine"],
    [27, "brown"],
    ["brown", "brown"],
    [28, "cyan"],
    ["cyan", "cyan"]
]);

const animatedColorNameMap = new Map([
    ["flashBlueRed", "blue_red"],
    ["flashBlueGrey", "blue_grey"],
    ["flashGreyBlue", "grey_blue"],
    ["flashRedGrey", "red_grey"],
    ["flashGreyRed", "grey_red"],
    ["rainbow", "rainbow"],
    ["trans", "trans"],
    ["aeBoss_magenta", "magenta"]
]);

const mixCache = new Map();
const intCache = new Map();
const gameDraw = {
    color: null,
    // Color functions
    /** https://gist.github.com/jedfoster/7939513 **/
    decimal2hex: (d) => {
        return d.toString(16);
    }, // convert a decimal value to hex
    hex2decimal: (h) => {
        return parseInt(h, 16);
    }, // convert a hex value to decimal
    mixColors: (hex1, hex2, mix = 0.5) => {
        let c1 = intCache.get(hex1);
        if (c1 === undefined) {
            c1 = parseInt(hex1.slice(1), 16);
            intCache.set(hex1, c1);
        }
        let c2 = intCache.get(hex2);
        if (c2 === undefined) {
            c2 = parseInt(hex2.slice(1), 16);
            intCache.set(hex2, c2);
        }
        const key = c1 * (1 << 29) + c2 * (1 << 5) + Math.round(mix * 31);
        if (mixCache.has(key)) {
            return mixCache.get(key);
        }
        const r1 = (c1 >> 16) & 0xFF;
        const g1 = (c1 >> 8) & 0xFF;
        const b1 = c1 & 0xFF;
        const result = ((1 << 24) | (((r1 + (((c2 >> 16) & 0xFF) - r1) * mix) | 0) << 16) | (((g1 + (((c2 >> 8) & 0xFF) - g1) * mix) | 0) << 8) | ((b1 + ((c2 & 0xFF) - b1) * mix) | 0));
        const hex = `#${(result & 0xFFFFFF).toString(16).padStart(6, "0")}`;
        mixCache.set(key, hex);
        return hex;
    },

    hslToRgb: (h, s, l) => {
        let r;
        let g;
        let b;
        if (s === 0) {
            r = g = b = l; // achromatic
        } else {
            const q = l < 0.5 ? l * (1 + s) : l + s - l * s;
            const p = 2 * l - q;
            r = gameDraw.hueToRgb(p, q, h + 1 / 3);
            g = gameDraw.hueToRgb(p, q, h);
            b = gameDraw.hueToRgb(p, q, h - 1 / 3);
        }
        return `#${
            Math.round(r * 255).toString(16).padStart(2, "0")
        }${Math.round(g * 255).toString(16).padStart(2, "0")
        }${Math.round(b * 255).toString(16).padStart(2, "0")}`;
    },
    rgbToHsl: (rgb) => {
        const r = parseInt(rgb.substring(1, 3), 16) / 255;
        const g = parseInt(rgb.substring(3, 5), 16) / 255;
        const b = parseInt(rgb.substring(5, 7), 16) / 255;
        let h;
        let s;

        const cmax = Math.max(r, g, b);
        const cmin = Math.min(r, g, b);
        const deltaC = cmax - cmin;

        // Brightness
        const l = (cmax + cmin) / 2;

        // Hue
        switch (true) {
            case deltaC == 0:
                h = 0;
                break;
            case cmax == r:
                h = 1 / 6 * (((g - b) / deltaC) % 6);
                break;
            case cmax == g:
                h = 1 / 6 * ((b - r) / deltaC + 2);
                break;
            case cmax == b:
                h = 1 / 6 * ((r - g) / deltaC + 4);
                break;
        }
        // Saturation
        if (deltaC == 0) {
            s = 0;
        } else {
            s = deltaC / (1 - Math.abs(2 * l - 1));
        }

        return [h, s, l];
    },
    hueToRgb: (p, q, t) => {
        if (t < 0) {
            t += 1;
        }
        if (t > 1) {
            t -= 1;
        }
        if (t < 0.166) {
            return p + (q - p) * 6 * t;
        }
        if (t < 0.5) {
            return q;
        }
        if (t < 0.666) {
            return p + (q - p) * (2 / 3 - t) * 6;
        }
        return p;
    },
    clamp: (n, lower, upper) => {
        return Math.min(upper, Math.max(lower, n));
    },

    colorCache: {},
    teamColors: [10, 11, 12, 15, 25, 26, 27, 28, "blue", "green", "red", "magenta", "mustard", "tangerine", "brown", "cyan"],
    getRainbowTeamColor: (colorNumber) => {
        const index = gameDraw.teamColors.indexOf(util.isNumeric(colorNumber) ? parseInt(colorNumber) : colorNumber);
        if (index < 0) {
            return gameDraw.animatedColor.rainbow;
        }
        return gameDraw.animatedColor.rainbowTeams[index % (gameDraw.teamColors.length / 2)];
    },
    modifyColor: (color, base = "16 0 1 0 false") => {
        // Split into array
        const colorDetails = color.split(" ");
        const baseDetails = base.split(" ");

        // Color mirroring
        if (colorDetails[0] === "-1" || colorDetails[0] === "mirror") {
            colorDetails[0] = baseDetails[0];
        }
        if (colorDetails[0] === "-1" || colorDetails[0] === "mirror") {
            colorDetails[0] = gui.color.split(" ")[0];
        }

        // Exit if calculated already
        const colorId = colorDetails.join(" ");
        if (config.game.rainbowTeamColors && gameDraw.teamColors.includes(util.isNumeric(colorDetails[0]) ? parseInt(colorDetails[0]) : colorDetails[0])) {
            return gameDraw.getRainbowTeamColor(colorDetails[0]);
        }
        const cachedColor = gameDraw.colorCache[colorId];
        if (cachedColor != undefined) {
            return cachedColor;
        }

        // Get HSL values
        const baseColor = gameDraw.rgbToHsl(gameDraw.getColor(colorDetails[0]) ?? colorDetails[0]);

        // Get color config
        const hueShift = parseFloat(colorDetails[1]) / 360;
        const saturationShift = parseFloat(colorDetails[2]);
        const brightnessShift = parseFloat(colorDetails[3]) / 100;
        const allowBrightnessInvert = colorDetails[4] == "true";

        // Apply config
        const finalHue = (baseColor[0] + hueShift) % 1;
        const finalSaturation = gameDraw.clamp(baseColor[1] * saturationShift, 0, 1);
        let finalBrightness = baseColor[2] + brightnessShift;

        if (allowBrightnessInvert && (finalBrightness > 1 || finalBrightness < 0)) {
            finalBrightness -= brightnessShift * 2;
        }
        finalBrightness = gameDraw.clamp(finalBrightness, 0, 1);

        // Gaming.
        const finalColor = gameDraw.hslToRgb(finalHue, finalSaturation, finalBrightness);
        if (!gameDraw.animatedColors[colorDetails[0]]) {
            gameDraw.colorCache[colorId] = finalColor;
        }
        return finalColor;
    },

    getRainbow: (a, b, c = 0.5) => {
        if (0 >= c) {
            return a;
        }
        if (1 <= c) {
            return b;
        }
        const f = 1 - c;
        a = parseInt(a.slice(1, 7), 16);
        b = parseInt(b.slice(1, 7), 16);
        return (
            `#${
                (
                    (((a & 16711680) * f + (b & 16711680) * c) & 16711680) |
                (((a & 65280) * f + (b & 65280) * c) & 65280) |
                (((a & 255) * f + (b & 255) * c) & 255)
                )
                    .toString(16)
                    .padStart(6, "0")}`
        );
    },
    animatedColor: {
        blue_red: "",
        blue_grey: "",
        grey_blue: "",
        red_grey: "",
        grey_red: "",
        rainbow: "",
        rainbowTeams: [],
        trans: "",
        magenta: ""
    },
    reanimateColors: () => {
        const now = Date.now();

        const five_bars = Math.floor((now % 2000) / 400);
        // const three_bars = Math.floor((now % 2000) * 3 / 2000);
        const blinker = 150 > now % 300;

        const lesbian_magenta = "#a50062";
        const lesbian_oredange = "#d62900";
        const lesbian_white = "#FFFFFF";
        const lesbian_useSecondSet = five_bars < 2;

        const gay_transition = (now / 6000) % 1;
        const rainbow_transition = (now / 6000) % 1;

        const ratio = (Math.sin(now / 2000 * Math.PI)) / 2 + 0.5;
        const light_purple = { h: 258 / 360, s: 1, l: 0.84 };
        const purple = { h: 265 / 360, s: 0.69, l: 0.47 };

        const trans_pink = "#f7a8b8";
        const trans_blue = "#55cdfc";
        const trans_white = "#FFFFFF";

        gameDraw.animatedColor.lesbian = gameDraw.getRainbow(lesbian_useSecondSet ? lesbian_oredange : lesbian_white, lesbian_useSecondSet ? lesbian_white : lesbian_magenta, (lesbian_useSecondSet ? five_bars : five_bars - 3) / 2);
        gameDraw.animatedColor.gay = gameDraw.hslToRgb(gay_transition, 0.75, 0.5);
        gameDraw.animatedColor.rainbow = gameDraw.hslToRgb(rainbow_transition, 0.75, 0.5);
        const teamCount = gameDraw.teamColors.length / 2;
        gameDraw.animatedColor.rainbowTeams = Array.from({ length: teamCount }, (_, i) =>
            gameDraw.hslToRgb((rainbow_transition + i / teamCount) % 1, 0.75, 0.5)
        );
        gameDraw.animatedColor.trans = gameDraw.mixColors(trans_white, 2000 > now % 4000 ? trans_blue : trans_pink, Math.max(Math.min(5 * Math.sin(now % 2000 / 2000 * Math.PI) - 2, 1), 0));
        gameDraw.animatedColor.magenta = gameDraw.hslToRgb(
            light_purple.h + (purple.h - light_purple.h) * ratio,
            light_purple.s + (purple.s - light_purple.s) * ratio,
            light_purple.l + (purple.l - light_purple.l) * ratio
        );
        gameDraw.animatedColor.blue_red = blinker ? gameDraw.color.blue : gameDraw.color.red;
        gameDraw.animatedColor.blue_grey = blinker ? gameDraw.color.blue : gameDraw.color.grey;
        gameDraw.animatedColor.grey_blue = blinker ? gameDraw.color.grey : gameDraw.color.blue;
        gameDraw.animatedColor.red_grey = blinker ? gameDraw.color.red : gameDraw.color.grey;
        gameDraw.animatedColor.grey_red = blinker ? gameDraw.color.grey : gameDraw.color.red;
    },
    animatedColors: {
        flashBlueRed: true,
        flashBlueGrey: true,
        flashGreyBlue: true,
        flashRedGrey: true,
        flashGreyRed: true,
        rainbow: true,
        trans: true,
        trueTrans: true,

        // bi
        bi: true,

        // magenta
        42: true,
        animatedMagenta: true,
        aeBoss_magenta: true
    },
    getColor: (colorNumber, ctx, x1, y1, x2, y2) => {
        if (colorNumber == undefined || colorNumber == null) {
            return gameDraw.color.black;
        }
        if (colorNumber[0] == "#") {
            return colorNumber;
        }
        if (util.isNumeric(colorNumber)) {
            colorNumber = parseInt(colorNumber);
        }
        if (config.game.rainbowTeamColors && gameDraw.teamColors.includes(colorNumber)) {
            return gameDraw.getRainbowTeamColor(colorNumber);
        }
        // Gradient color
        if (colorNumber.gradient && ctx) {
            try {
                // Scale all coordinates proportionally
                const gx1 = (x1 ?? 0);
                const gy1 = (y1 ?? 0);
                const gx2 = (x2 ?? 0);
                const gy2 = (y2 ?? 0);

                const gradient = ctx.createLinearGradient(gx1, gy1, gx2, gy2);

                // Color stops remain at same percentages
                for (let i = 0; i < colorNumber.asset.length; i++) {
                    gradient.addColorStop(i, gameDraw.getColor(colorNumber.asset[i].color));
                }
                return gradient;
            } catch {
                return gameDraw.color.black;
            }
        }
        if (colorNumber === "border") {
            return gameDraw.mixColors(gameDraw.color.white, gameDraw.color.guiblack, 1 / 3);
        }

        const animatedColorKey = animatedColorNameMap.get(colorNumber);
        if (animatedColorKey) {
            return gameDraw.animatedColor[animatedColorKey];
        }

        const staticColorName = staticStringColorNameMap.get(colorNumber);
        if (staticColorName) {
            return gameDraw.color[staticColorName];
        }

        return "#000000";
    },
    getColorDark: (givenColor) => {
        const dark = config.graphical.neon ? gameDraw.color.white : gameDraw.color.black;
        if (config.graphical.darkBorders) {
            return dark;
        }
        // Ensure givenColor is a valid hex string
        if (typeof givenColor !== "string" || !givenColor.startsWith("#") || givenColor.length !== 7) {
            // Try to resolve it using getColor
            givenColor = gameDraw.getColor(givenColor);
            // If still not valid, fallback to black
            if (typeof givenColor !== "string" || !givenColor.startsWith("#") || givenColor.length !== 7) {
                return "#000000";
            }
        }
        return gameDraw.mixColors(givenColor, dark, gameDraw.color.border);
    },
    getBorderColor: (givenColor) => {
        // Defensive: ensure givenColor is a valid hex string
        if (typeof givenColor !== "string" || !givenColor.startsWith("#") || givenColor.length !== 7) {
            givenColor = gameDraw.getColor(givenColor);
            if (typeof givenColor !== "string" || !givenColor.startsWith("#") || givenColor.length !== 7) {
                return "#000000";
            }
        }
        return gameDraw.getColorDark(givenColor);
    },
    setColor: (context, givenColor) => {
        if (config.graphical.neon) {
            context.fillStyle = gameDraw.getColorDark(givenColor);
            context.strokeStyle = givenColor;
        } else {
            context.fillStyle = givenColor;
            context.strokeStyle = gameDraw.getColorDark(givenColor);
        }
    }
};

export { gameDraw };
