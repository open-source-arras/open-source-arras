import { ease } from "./hud.js";

const CELL = 115;
const TILE = 100;
const INSET = 7.5;
const ZOOM_DEFAULT = 46;
const ZOOM_MIN = 23;
const ZOOM_MAX = 115;
const ZOOM_STEP = 23;
const EASE_TIME = 0.7;
const WHEEL_DIVISOR = 300;
const WHEEL_NOTCH = 100;
const REFERENCE_WIDTH = 1920;
const REFERENCE_HEIGHT = 1080;
const LINE_WIDTH = 3;
const RING_WIDTH = 3;
const OUTLINE_WIDTH = 3;
const BAR_TOP = 80;
const BAR_HEIGHT = 40;
const BAR_RING = 3;
const BAR_CLOSE = -255;
const BAR_FIELD = -200;
const BAR_FIELD_WIDTH = 400;
const BAR_ZOOM_IN = 215;
const BAR_ZOOM_OUT = 270;
const BAR_BUTTON = 40;
const BAR_FONT = 20;
const BAR_PADDING = 20;
const PAN_SPEED = 1200;
const PAN_FAST = 5;
const ICON_MIN_PIXELS = 6;
const LABEL_REACH = 60;
const PAGE_SIZE = 2048;
const ICON_PAGES = 6;
const TREE_LIMIT = 20000;
const NAME_MIP_GAP = 250;
const TILE_STRIDE = 8;
const ICON_STRIDE = 4;
const LABEL_STRIDE = 8;

function easeZoom(zoom, target, seconds) {
    let gap = target - zoom;
    if (gap === 0) return zoom;
    return target - Math.sign(gap) * ease(Math.abs(gap), seconds / EASE_TIME);
}

function clampZoom(zoom) {
    return zoom < ZOOM_MIN ? ZOOM_MIN : zoom > ZOOM_MAX ? ZOOM_MAX : zoom;
}

function screenScale(width, height) {
    return Math.max(width / REFERENCE_WIDTH, height / REFERENCE_HEIGHT);
}

function nameFactor(zoom) {
    let x = (100 * (zoom / CELL) - 64) / 12,
        c = x < 0 ? 0 : x > 1 ? 1 : x;
    return c * c;
}

function iconUnits(names) {
    return 80 - 20 * names;
}

function ceilTenth(x) {
    return Math.ceil(x * 10) / 10;
}

function nameFontSize(perUnit, names) {
    return names > 0 ? ceilTenth(11 * perUnit * names) : 0;
}

function nameStrokeSize(fontSize) {
    return ceilTenth(0.25 * fontSize);
}

function nameMiddle(names) {
    return 95.35 - 5.5 * names;
}

function upgradesOf(mockups, index, out) {
    out.length = 0;
    let mockup = mockups[index];
    if (!mockup || !mockup.upgrades) return out;
    for (let upgrade of mockup.upgrades) {
        let upgradeIndex = parseInt(upgrade.index);
        if (mockups[upgradeIndex]) out.push({ index: upgradeIndex, tier: upgrade.tier ?? 0 });
    }
    return out;
}

function hasUpgrades(mockups, index) {
    let mockup = mockups[index];
    if (!mockup || !mockup.upgrades) return false;
    for (let upgrade of mockup.upgrades) if (mockups[parseInt(upgrade.index)]) return true;
    return false;
}

function treeSize(roots, mockups, limit) {
    let known = new Map(),
        path = new Set();
    let size = index => {
        if (path.has(index)) return 0;
        if (known.has(index)) return known.get(index);
        path.add(index);
        let total = 1;
        for (let upgrade of upgradesOf(mockups, index, [])) {
            total += size(upgrade.index);
            if (total > limit) break;
        }
        path.delete(index);
        known.set(index, total);
        return total;
    };
    let total = 0;
    for (let root of roots) {
        let index = parseInt(root);
        if (mockups[index]) total += size(index);
        if (total > limit) break;
    }
    return total;
}

function buildTreeNodes(roots, mockups) {
    let nodes = [],
        path = new Set(),
        scratch = [],
        once = treeSize(roots, mockups, TREE_LIMIT) > TREE_LIMIT,
        expanded = new Set();
    let grow = (index, parent, sibling, tier) => {
        let id = nodes.length;
        nodes.push({ index, parent, sibling, tier, children: [], lists: false });
        if (once) {
            if (expanded.has(index)) return id;
            expanded.add(index);
        }
        path.add(index);
        let upgrades = upgradesOf(mockups, index, scratch).slice(),
            allEnds = upgrades.length > 0;
        for (let upgrade of upgrades) {
            if (hasUpgrades(mockups, upgrade.index)) {
                allEnds = false;
                break;
            }
        }
        nodes[id].lists = allEnds;
        for (let i = 0; i < upgrades.length; i++) {
            if (path.has(upgrades[i].index)) continue;
            nodes[id].children.push(grow(upgrades[i].index, id, i, upgrades[i].tier));
        }
        path.delete(index);
        return id;
    };
    for (let root of roots) {
        let index = parseInt(root);
        if (mockups[index]) grow(index, -1, 0, 0);
    }
    return nodes;
}

function layoutTree(nodes, keep) {
    let out = { cols: 0, rows: 0, tileNode: [], tileCol: [], tileRow: [], segments: [] };
    if (!nodes.length) return out;
    let maxRow = 0,
        kept = [];
    let segment = (x1, y1, x2, y2) => {
        out.segments.push((x1 + 0.5) * CELL, (y1 + 0.5) * CELL, (x2 + 0.5) * CELL, (y2 + 0.5) * CELL);
    };
    let tile = (node, col, row) => {
        out.tileNode.push(node);
        out.tileCol.push(col);
        out.tileRow.push(row);
        if (row > maxRow) maxRow = row;
    };
    let place = (n, col, row) => {
        tile(n, col, row);
        let node = nodes[n];
        kept.length = 0;
        for (let child of node.children) if (!keep || keep[child]) kept.push(child);
        if (!kept.length) return 1;
        if (node.lists) {
            for (let i = 0; i < kept.length; i++) tile(kept[i], col, row + 2 + i);
            segment(col, row, col, row + 1 + kept.length);
            return 1;
        }
        let children = kept.slice(),
            c = col,
            last = col;
        for (let i = 0; i < children.length; i++) {
            let child = children[i],
                step = nodes[child].tier - node.tier,
                childRow = row + 2 * (step > 1 ? step : 1);
            if (i === 0) segment(col, row, col, childRow);
            else segment(c, row + 1, c, childRow);
            last = c;
            c += place(child, c, childRow);
        }
        if (last > col) segment(col, row + 1, last, row + 1);
        return Math.max(1, c - col);
    };
    let col = 0;
    for (let n = 0; n < nodes.length; n++) {
        if (nodes[n].parent !== -1) continue;
        if (col > 0) col++;
        col += place(n, col, 0);
    }
    out.cols = col;
    out.rows = maxRow + 1;
    return out;
}

function searchTree(nodes, lowerNames, query) {
    let q = query.toLowerCase();
    if (q === "" || !nodes.length) return null;
    let count = nodes.length,
        keep = new Uint8Array(count),
        under = new Uint8Array(count);
    for (let i = 0; i < count; i++) {
        let parent = nodes[i].parent;
        if (parent >= 0 && (under[parent] || keep[parent])) under[i] = 1;
        if (lowerNames[i].includes(q)) keep[i] = 1;
    }
    for (let i = 0; i < count; i++) if (under[i]) keep[i] = 1;
    for (let i = count - 1; i > 0; i--) if (keep[i] && nodes[i].parent >= 0) keep[nodes[i].parent] = 1;
    for (let i = 0; i < count; i++) if (nodes[i].parent === -1) keep[i] = 1;
    return keep;
}

function treeLooks(nodes, mockups) {
    let count = nodes.length,
        names = new Array(count),
        lower = new Array(count),
        colors = new Array(count),
        passed = new Array(count);
    for (let i = 0; i < count; i++) {
        let node = nodes[i],
            mockup = mockups[node.index],
            label = node.parent >= 0 && mockup.upgradeName ? mockup.upgradeName : null,
            name = label ?? mockup.name ?? "";
        names[i] = name;
        lower[i] = (label ?? mockup.name ?? mockup.className ?? "").toLowerCase();
        let own = mockup.upgradeColor || (node.parent >= 0 ? passed[node.parent] : null);
        colors[i] = own;
        passed[i] = mockup.passUpgradeColor ? own : null;
    }
    return { names, lower, colors };
}

function bandOf(rgb, border) {
    return [
        (border[0] * 51 + rgb[0] * 205) >> 8,
        (border[1] * 51 + rgb[1] * 205) >> 8,
        (border[2] * 51 + rgb[2] * 205) >> 8
    ];
}

function visibleColumns(centerX, width, perUnit, cols, out) {
    let half = width / 2 / perUnit,
        c0 = Math.ceil((centerX - half - CELL - LABEL_REACH) / CELL),
        c1 = Math.floor((centerX + half + LABEL_REACH) / CELL);
    out[0] = c0 < 0 ? 0 : c0;
    out[1] = c1 > cols - 1 ? cols - 1 : c1;
}

const VERTEX_TILE = `
attribute vec3 a_shape;
attribute vec2 a_center;
attribute vec3 a_top;
attribute vec3 a_band;
uniform vec4 u_camera;
uniform vec4 u_ring;
varying vec4 v_color;
void main() {
    vec2 w = a_center + a_shape.xy;
    gl_Position = vec4(w.x * u_camera.x + u_camera.z, w.y * u_camera.y + u_camera.w, 0.0, 1.0);
    v_color = a_shape.z < 0.5 ? vec4(a_top, 1.0) : (a_shape.z < 1.5 ? vec4(a_band, 1.0) : u_ring);
}`;

const FRAGMENT_TILE = `
precision mediump float;
varying vec4 v_color;
void main() {
    gl_FragColor = v_color;
}`;

const VERTEX_LINE = `
attribute vec2 a_corner;
attribute vec4 a_segment;
uniform vec4 u_camera;
uniform float u_reach;
varying vec2 v_point;
varying vec4 v_segment;
void main() {
    vec2 d = a_segment.zw - a_segment.xy;
    float l = length(d);
    vec2 direction = l > 0.000001 ? d / l : vec2(1.0, 0.0);
    vec2 normal = vec2(-direction.y, direction.x);
    vec2 w = mix(a_segment.xy - direction * u_reach, a_segment.zw + direction * u_reach, a_corner.x) + normal * (a_corner.y * u_reach);
    v_point = w;
    v_segment = a_segment;
    gl_Position = vec4(w.x * u_camera.x + u_camera.z, w.y * u_camera.y + u_camera.w, 0.0, 1.0);
}`;

const FRAGMENT_LINE = `
#ifdef GL_FRAGMENT_PRECISION_HIGH
precision highp float;
#else
precision mediump float;
#endif
varying vec2 v_point;
varying vec4 v_segment;
uniform vec4 u_color;
uniform float u_pixel;
uniform float u_half;
void main() {
    vec2 pa = v_point - v_segment.xy;
    vec2 ba = v_segment.zw - v_segment.xy;
    float t = clamp(dot(pa, ba) / max(dot(ba, ba), 0.000000001), 0.0, 1.0);
    float d = length(pa - ba * t);
    gl_FragColor = u_color * clamp((u_half - d) * u_pixel + 0.5, 0.0, 1.0);
}`;

const VERTEX_ICON = `
attribute vec2 a_corner;
attribute vec2 a_center;
attribute vec2 a_offset;
uniform vec4 u_camera;
uniform float u_size;
uniform float u_cell;
varying vec2 v_uv;
void main() {
    vec2 w = a_center + a_corner * u_size;
    gl_Position = vec4(w.x * u_camera.x + u_camera.z, w.y * u_camera.y + u_camera.w, 0.0, 1.0);
    v_uv = a_offset + (a_corner + 0.5) * u_cell;
}`;

const VERTEX_LABEL = `
attribute vec2 a_corner;
attribute vec2 a_center;
attribute vec4 a_uv;
attribute vec2 a_size;
uniform vec4 u_camera;
uniform float u_middle;
uniform float u_scale;
uniform vec2 u_view;
uniform float u_snap;
varying vec2 v_uv;
void main() {
    vec2 w = a_center + vec2(0.0, u_middle);
    vec2 ndc = vec2(w.x * u_camera.x + u_camera.z, w.y * u_camera.y + u_camera.w);
    vec2 pixel = (ndc * vec2(0.5, -0.5) + 0.5) * u_view;
    vec2 size = a_size * u_scale;
    vec2 topLeft = pixel - size * 0.5;
    if (u_snap > 0.5) topLeft = floor(topLeft + 0.5);
    vec2 corner = topLeft + (a_corner + 0.5) * size;
    gl_Position = vec4((corner / u_view - 0.5) * vec2(2.0, -2.0), 0.0, 1.0);
    v_uv = a_uv.xy + (a_corner + 0.5) * a_uv.zw;
}`;

const FRAGMENT_IMAGE = `
#ifdef GL_FRAGMENT_PRECISION_HIGH
precision highp float;
#else
precision mediump float;
#endif
uniform sampler2D u_texture;
varying vec2 v_uv;
void main() {
    gl_FragColor = texture2D(u_texture, v_uv);
}`;

function tileMesh() {
    let half = TILE / 2,
        ring = RING_WIDTH / 2,
        split = -half + TILE * 0.6,
        rects = [
            [-half, -half, half, split, 0],
            [-half, split, half, half, 1],
            [-half - ring, -half - ring, half + ring, -half + ring, 2],
            [-half - ring, half - ring, half + ring, half + ring, 2],
            [-half - ring, -half + ring, -half + ring, half - ring, 2],
            [half - ring, -half + ring, half + ring, half - ring, 2]
        ],
        out = [];
    for (let [x0, y0, x1, y1, part] of rects) out.push(x0, y0, part, x1, y0, part, x1, y1, part, x0, y0, part, x1, y1, part, x0, y1, part);
    return new Float32Array(out);
}

class NameAtlas {
    constructor() {
        this.canvas = null;
        this.context = null;
        this.cells = new Map();
        this.queue = [];
        this.next = 0;
        this.x = 0;
        this.y = 0;
        this.rowHeight = 0;
        this.height = 0;
        this.fontSize = 0;
        this.strokeSize = 0;
        this.ink = "";
        this.fill = "";
        this.fontReady = false;
        this.dirtyTop = Infinity;
        this.dirtyBottom = 0;
        this.version = 0;
        this.measure = null;
        this.measured = 0;
        this.measureX = 0;
        this.measureY = 0;
    }
    reset(fontSize, strokeSize, ink, fill, names) {
        this.fontSize = fontSize;
        this.strokeSize = strokeSize;
        this.ink = ink;
        this.fill = fill;
        this.cells.clear();
        this.queue = [...new Set(names)];
        this.next = 0;
        this.x = this.y = this.rowHeight = this.height = 0;
        this.canvas = this.context = this.measure = null;
        this.dirtyTop = Infinity;
        this.dirtyBottom = 0;
        this.version++;
    }
    add(names) {
        let added = false;
        for (let name of names) {
            if (!this.cells.has(name)) {
                this.queue.push(name);
                added = true;
            }
        }
        return added;
    }
    pending() {
        return this.next < this.queue.length;
    }
    font() {
        return `bold ${this.fontSize}px Ubuntu`;
    }
    cellHeight() {
        return Math.ceil(this.fontSize * 1.3 + this.strokeSize + 4);
    }
    build(until) {
        if (!this.fontReady || !this.pending()) return false;
        let height = this.cellHeight();
        if (!this.canvas) {
            if (!this.measure) {
                this.measure = document.createElement("canvas").getContext("2d");
                this.measure.font = this.font();
                this.measured = this.next;
                this.measureX = this.measureY = 0;
            }
            while (this.measured < this.queue.length) {
                let width = Math.ceil(this.measure.measureText(this.queue[this.measured++]).width + this.strokeSize + 4);
                if (this.measureX + width > PAGE_SIZE) {
                    this.measureX = 0;
                    this.measureY += height;
                }
                this.measureX += width;
                if (performance.now() >= until) return false;
            }
            this.measure = null;
            let size = 64;
            while (size < this.measureY + height + 64) size *= 2;
            this.height = Math.min(size, 8192);
            this.canvas = document.createElement("canvas");
            this.canvas.width = PAGE_SIZE;
            this.canvas.height = this.height;
            this.context = this.canvas.getContext("2d", { willReadFrequently: true });
        }
        let context = this.context,
            added = false;
        context.font = this.font();
        context.textAlign = "center";
        context.textBaseline = "middle";
        context.lineJoin = "round";
        context.lineWidth = this.strokeSize;
        context.strokeStyle = this.ink;
        context.fillStyle = this.fill;
        while (this.next < this.queue.length) {
            let name = this.queue[this.next++];
            if (this.cells.has(name)) continue;
            let width = Math.ceil(context.measureText(name).width + this.strokeSize + 4);
            if (this.x + width > PAGE_SIZE) {
                this.x = 0;
                this.y += this.rowHeight;
                this.rowHeight = 0;
            }
            if (this.y + height > this.height) break;
            context.strokeText(name, this.x + width / 2, this.y + height / 2);
            context.fillText(name, this.x + width / 2, this.y + height / 2);
            this.cells.set(name, { u: this.x / PAGE_SIZE, v: this.y / this.height, uw: width / PAGE_SIZE, vh: height / this.height, w: width, h: height });
            if (this.y < this.dirtyTop) this.dirtyTop = this.y;
            if (this.y + height > this.dirtyBottom) this.dirtyBottom = this.y + height;
            this.x += width;
            if (height > this.rowHeight) this.rowHeight = height;
            added = true;
            if (performance.now() >= until) break;
        }
        if (added) this.version++;
        return added;
    }
}

function createClassTree(options) {
    let view = { x: 0, y: 0, zoom: ZOOM_DEFAULT, target: ZOOM_DEFAULT, opened: false, key: "", query: "" },
        nodes = [],
        looks = { names: [], lower: [], colors: [] },
        full = layoutTree([], null),
        shown = full,
        isOpen = false,
        hidden = false,
        lastTime = 0,
        cssWidth = 0,
        cssHeight = 0,
        sizeStale = true,
        sceneStale = true,
        dirty = true,
        drawn = { x: NaN, y: NaN, zoom: NaN, width: 0, height: 0 },
        drag = { active: false, x: 0, y: 0 },
        pan = { x: 0, y: 0, fast: false },
        theme = { black: "", guiwhite: "", white: "", red: "", grey: "", player: "" },
        ink = [0, 0, 0],
        lineColor = [0, 0, 0, 0],
        textColor = "#ffffff",
        dark = false,
        barScale = 0,
        root = null,
        bar = null,
        pieces = null,
        input = null,
        canvas = null,
        plain = null,
        gl = null,
        instancing = null,
        minmax = null,
        ready = false,
        programs = null,
        buffers = null,
        nameTexture = null,
        nameTextureHeight = 0,
        namesMipStale = false,
        namesMipTime = 0,
        wasHidden = false,
        atlas = new NameAtlas(),
        pendingNames = null,
        uniqueIcons = 0,
        icon = { cell: 0, axis: 0, perRow: 0, look: "", pages: [], slots: new Map(), cursor: 0, scratch: null, context: null, version: 0, uploaded: -1 },
        scene = null,
        columns = new Int32Array(2),
        colorProbe = null,
        colorCache = new Map();

    function rgbOf(css) {
        let cached = colorCache.get(css);
        if (cached) return cached;
        if (!colorProbe) {
            let probe = document.createElement("canvas");
            probe.width = probe.height = 1;
            colorProbe = probe.getContext("2d", { willReadFrequently: true });
        }
        colorProbe.clearRect(0, 0, 1, 1);
        colorProbe.fillStyle = "#000000";
        colorProbe.fillStyle = css;
        colorProbe.fillRect(0, 0, 1, 1);
        let data = colorProbe.getImageData(0, 0, 1, 1).data;
        cached = [data[0], data[1], data[2]];
        colorCache.set(css, cached);
        return cached;
    }

    function cssOf(rgb, alpha = 1) {
        return `rgba(${rgb[0]},${rgb[1]},${rgb[2]},${alpha})`;
    }

    function readTheme() {
        let colors = options.theme(),
            player = options.playerColor();
        if (colors.black === theme.black && colors.guiwhite === theme.guiwhite && colors.white === theme.white && colors.red === theme.red && colors.grey === theme.grey && player === theme.player) return false;
        theme.black = colors.black;
        theme.guiwhite = colors.guiwhite;
        theme.white = colors.white;
        theme.red = colors.red;
        theme.grey = colors.grey;
        theme.player = player;
        colorCache.clear();
        ink = rgbOf(colors.black);
        let background = rgbOf(colors.white);
        dark = background[0] * 0.299 + background[1] * 0.587 + background[2] * 0.114 < 128;
        lineColor = dark ? [0xaa / 255, 0xaa / 255, 0xaa / 255, 1] : [ink[0] / 255 * 0.5, ink[1] / 255 * 0.5, ink[2] / 255 * 0.5, 0.5];
        textColor = colors.guiwhite;
        return true;
    }

    function makeRoot() {
        root = document.createElement("div");
        root.style.cssText = "position:absolute;left:0;top:0;width:100%;height:100%;z-index:5;pointer-events:none;overflow:hidden;display:none;user-select:none";
        let style = document.createElement("style");
        style.textContent = "input.class-tree-search::placeholder{color:rgb(182,182,182);opacity:1}input.class-tree-search,input.class-tree-search:focus{background:transparent!important;border:none!important;outline:none!important;box-shadow:none!important}";
        document.head.appendChild(style);
        canvas = document.createElement("canvas");
        canvas.style.cssText = "position:absolute;left:0;top:0;width:100%;height:100%;display:block";
        root.appendChild(canvas);
        bar = document.createElement("div");
        bar.style.cssText = "position:absolute;left:50%;top:0;width:0;height:0";
        root.appendChild(bar);
        let piece = (onPress) => {
            let element = document.createElement("div");
            element.style.position = "absolute";
            element.style.boxSizing = "border-box";
            element.style.pointerEvents = "auto";
            element.addEventListener("mousedown", event => {
                if (event.target === input) return;
                event.preventDefault();
                if (event.button === 0) onPress();
            });
            element.addEventListener("wheel", event => {
                event.preventDefault();
                wheel(event.deltaY, event.deltaMode);
            }, { passive: false });
            bar.appendChild(element);
            return element;
        };
        let glyph = (text) => {
            let svg = document.createElementNS("http://www.w3.org/2000/svg", "svg"),
                shape = document.createElementNS("http://www.w3.org/2000/svg", text ? "text" : "path");
            svg.setAttribute("viewBox", `0 0 ${BAR_BUTTON} ${BAR_HEIGHT}`);
            svg.style.position = "absolute";
            svg.style.overflow = "visible";
            svg.style.pointerEvents = "none";
            if (text) {
                shape.setAttribute("x", BAR_BUTTON / 2);
                shape.setAttribute("y", BAR_HEIGHT / 2);
                shape.setAttribute("text-anchor", "middle");
                shape.setAttribute("dominant-baseline", "central");
                shape.setAttribute("font-family", "Ubuntu");
                shape.setAttribute("font-weight", "bold");
                shape.setAttribute("font-size", BAR_FONT);
                shape.setAttribute("stroke-width", 4);
                shape.setAttribute("stroke-linejoin", "round");
                shape.setAttribute("paint-order", "stroke");
                shape.textContent = text;
            } else {
                shape.setAttribute("d", "M10 10L30 30M30 10L10 30");
                shape.setAttribute("stroke-width", 3);
                shape.setAttribute("stroke-linecap", "round");
                shape.setAttribute("fill", "none");
            }
            svg.appendChild(shape);
            return { svg, shape };
        };
        pieces = {
            close: piece(() => options.close()),
            field: piece(() => input.focus()),
            zoomIn: piece(() => zoomBy(1)),
            zoomOut: piece(() => zoomBy(-1))
        };
        pieces.closeGlyph = glyph(null);
        pieces.close.appendChild(pieces.closeGlyph.svg);
        pieces.zoomInGlyph = glyph("+");
        pieces.zoomIn.appendChild(pieces.zoomInGlyph.svg);
        pieces.zoomOutGlyph = glyph("−");
        pieces.zoomOut.appendChild(pieces.zoomOutGlyph.svg);
        pieces.field.style.cursor = "text";
        input = document.createElement("input");
        input.type = "text";
        input.className = "class-tree-search";
        input.placeholder = "Search";
        input.spellcheck = false;
        input.autocomplete = "off";
        input.setAttribute("autocorrect", "off");
        input.setAttribute("autocapitalize", "off");
        input.style.position = "absolute";
        input.style.boxSizing = "border-box";
        input.style.padding = "0";
        input.style.margin = "0";
        input.style.userSelect = "text";
        input.style.cursor = "text";
        pieces.field.appendChild(input);
        input.addEventListener("input", () => setQuery(input.value));
        input.addEventListener("keydown", event => {
            event.stopPropagation();
            if (event.key === "Escape") {
                event.preventDefault();
                if (input.value !== "") {
                    input.value = "";
                    setQuery("");
                }
                leaveField();
            } else if (event.key === "Enter") {
                event.preventDefault();
                leaveField();
            } else if (event.key === "Tab") event.preventDefault();
        });
        input.addEventListener("keyup", event => {
            event.stopPropagation();
            if (options.keyUp) options.keyUp(event);
        });
        window.addEventListener("resize", () => sizeStale = true);
        window.addEventListener("blur", () => {
            drag.active = false;
            pan.x = pan.y = 0;
        });
        canvas.addEventListener("webglcontextlost", event => {
            event.preventDefault();
            ready = false;
        });
        canvas.addEventListener("webglcontextrestored", () => {
            startGL();
            sceneStale = true;
        });
        options.parent.appendChild(root);
        startGL();
        if (!ready) startPlain();
        if (document.fonts && document.fonts.load) document.fonts.load(`bold ${BAR_FONT}px Ubuntu`).then(() => atlas.fontReady = true, () => atlas.fontReady = true);
        else atlas.fontReady = true;
    }

    function leaveField() {
        input.blur();
        if (options.focusGame) options.focusGame();
    }

    function styleBar(scale) {
        let border = cssOf(ink),
            text = textColor,
            grey = rgbOf(theme.grey),
            band = bandOf(grey, ink),
            split = (BAR_HEIGHT * 0.6 - BAR_RING / 2) * scale;
        let place = (element, left, width) => {
            element.style.left = (left - BAR_RING / 2) * scale + "px";
            element.style.top = (BAR_TOP - BAR_RING / 2) * scale + "px";
            element.style.width = (width + BAR_RING) * scale + "px";
            element.style.height = (BAR_HEIGHT + BAR_RING) * scale + "px";
            element.style.border = `${BAR_RING * scale}px solid ${border}`;
            element.style.borderRadius = BAR_RING / 2 * scale + "px";
        };
        let fit = (svg) => {
            svg.style.left = -(BAR_RING / 2) * scale + "px";
            svg.style.top = -(BAR_RING / 2) * scale + "px";
            svg.style.width = BAR_BUTTON * scale + "px";
            svg.style.height = BAR_HEIGHT * scale + "px";
        };
        place(pieces.close, BAR_CLOSE, BAR_BUTTON);
        place(pieces.field, BAR_FIELD, BAR_FIELD_WIDTH);
        place(pieces.zoomIn, BAR_ZOOM_IN, BAR_BUTTON);
        place(pieces.zoomOut, BAR_ZOOM_OUT, BAR_BUTTON);
        pieces.close.style.background = theme.red;
        pieces.field.style.background = text;
        let buttons = `linear-gradient(${cssOf(grey, 0.6)} ${split}px, ${cssOf(band, 0.6)} ${split}px)`;
        pieces.zoomIn.style.background = buttons;
        pieces.zoomOut.style.background = buttons;
        for (let glyph of [pieces.closeGlyph, pieces.zoomInGlyph, pieces.zoomOutGlyph]) {
            fit(glyph.svg);
            glyph.shape.setAttribute("stroke", glyph === pieces.closeGlyph ? text : border);
            if (glyph !== pieces.closeGlyph) glyph.shape.setAttribute("fill", text);
        }
        input.style.left = (BAR_PADDING - BAR_RING / 2) * scale + "px";
        input.style.top = (4 - BAR_RING / 2) * scale + "px";
        input.style.width = (BAR_FIELD_WIDTH - 2 * BAR_PADDING) * scale + "px";
        input.style.height = 32 * scale + "px";
        input.style.font = `bold ${BAR_FONT * scale}px Ubuntu`;
        input.style.lineHeight = 32 * scale + "px";
        input.style.color = border;
        input.style.caretColor = border;
        root.style.background = dark ? "rgba(33,33,33,0.5)" : cssOf(rgbOf(theme.guiwhite), 0.5);
    }

    function compile(vertex, fragment, first) {
        let shader = (type, source) => {
            let made = gl.createShader(type);
            gl.shaderSource(made, source);
            gl.compileShader(made);
            if (!gl.getShaderParameter(made, gl.COMPILE_STATUS)) {
                console.error("Class tree shader:", gl.getShaderInfoLog(made));
                return null;
            }
            return made;
        };
        let v = shader(gl.VERTEX_SHADER, vertex),
            f = shader(gl.FRAGMENT_SHADER, fragment);
        if (!v || !f) return null;
        let program = gl.createProgram();
        gl.attachShader(program, v);
        gl.attachShader(program, f);
        gl.bindAttribLocation(program, 0, first);
        gl.linkProgram(program);
        if (!gl.getProgramParameter(program, gl.LINK_STATUS)) {
            console.error("Class tree program:", gl.getProgramInfoLog(program));
            return null;
        }
        let found = { program, attributes: {}, uniforms: {} },
            attributeCount = gl.getProgramParameter(program, gl.ACTIVE_ATTRIBUTES),
            uniformCount = gl.getProgramParameter(program, gl.ACTIVE_UNIFORMS);
        for (let i = 0; i < attributeCount; i++) {
            let info = gl.getActiveAttrib(program, i);
            found.attributes[info.name] = gl.getAttribLocation(program, info.name);
        }
        for (let i = 0; i < uniformCount; i++) {
            let info = gl.getActiveUniform(program, i);
            found.uniforms[info.name] = gl.getUniformLocation(program, info.name);
        }
        return found;
    }

    function staticBuffer(data) {
        let buffer = gl.createBuffer();
        gl.bindBuffer(gl.ARRAY_BUFFER, buffer);
        gl.bufferData(gl.ARRAY_BUFFER, data, gl.STATIC_DRAW);
        return buffer;
    }

    function startGL() {
        ready = false;
        gl = gl || canvas.getContext("webgl", { alpha: true, premultipliedAlpha: true, antialias: true, depth: false, stencil: false, preserveDrawingBuffer: false });
        if (!gl) return;
        instancing = gl.getExtension("ANGLE_instanced_arrays");
        if (!instancing) return;
        minmax = gl.getExtension("EXT_blend_minmax");
        programs = {
            tile: compile(VERTEX_TILE, FRAGMENT_TILE, "a_shape"),
            line: compile(VERTEX_LINE, FRAGMENT_LINE, "a_corner"),
            icon: compile(VERTEX_ICON, FRAGMENT_IMAGE, "a_corner"),
            label: compile(VERTEX_LABEL, FRAGMENT_IMAGE, "a_corner")
        };
        if (!programs.tile || !programs.line || !programs.icon || !programs.label) return;
        buffers = {
            tileShape: staticBuffer(tileMesh()),
            lineCorner: staticBuffer(new Float32Array([0, -1, 1, -1, 1, 1, 0, -1, 1, 1, 0, 1])),
            quad: staticBuffer(new Float32Array([-0.5, -0.5, 0.5, -0.5, 0.5, 0.5, -0.5, -0.5, 0.5, 0.5, -0.5, 0.5])),
            tiles: gl.createBuffer(),
            segments: gl.createBuffer(),
            icons: gl.createBuffer(),
            labels: gl.createBuffer()
        };
        nameTexture = gl.createTexture();
        nameTextureHeight = 0;
        if (atlas.canvas) {
            atlas.dirtyTop = 0;
            atlas.dirtyBottom = atlas.canvas.height;
        }
        resetIcons();
        if (scene) scene.labelVersion = -1;
        ready = true;
    }

    function startPlain() {
        if (plain) return;
        console.error("Class tree: WebGL with instancing is not available, drawing without it.");
        let replacement = document.createElement("canvas");
        replacement.style.cssText = canvas.style.cssText;
        root.replaceChild(replacement, canvas);
        canvas = replacement;
        plain = canvas.getContext("2d");
        gl = null;
        sizeStale = true;
    }

    function resetIcons() {
        if (gl) for (let page of icon.pages) gl.deleteTexture(page.texture);
        icon.pages = [];
        icon.slots.clear();
        icon.cursor = 0;
        icon.version++;
    }

    function sizeIcons() {
        let ratio = options.ratio(),
            axis = Math.ceil(61 * screenScale(cssWidth, cssHeight) * ratio),
            fit = Math.floor(PAGE_SIZE / Math.ceil(Math.sqrt(Math.max(1, uniqueIcons) / ICON_PAGES))),
            cell = Math.max(32, Math.min(256, fit, Math.ceil((axis * 1.12 + 6) / 8) * 8));
        if (cell === icon.cell) return;
        icon.cell = cell;
        icon.axis = Math.min(axis, Math.floor((cell - 6) / 1.12));
        icon.perRow = Math.floor(PAGE_SIZE / cell);
        icon.scratch = document.createElement("canvas");
        icon.scratch.width = icon.scratch.height = cell;
        icon.context = icon.scratch.getContext("2d", { willReadFrequently: true });
        resetIcons();
    }

    function newPage() {
        let texture = gl.createTexture();
        gl.bindTexture(gl.TEXTURE_2D, texture);
        gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, PAGE_SIZE, PAGE_SIZE, 0, gl.RGBA, gl.UNSIGNED_BYTE, null);
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR_MIPMAP_LINEAR);
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
        let page = { texture, used: 0, stale: false };
        icon.pages.push(page);
        return page;
    }

    function drawIconInto(context, index, x, y, axis, lineWidth) {
        context.save();
        try {
            options.drawIcon(context, String(index), x, y, axis, lineWidth);
        } catch(error) {
            console.error(error);
        }
        context.restore();
    }

    function buildIcon(index) {
        let page = icon.pages[icon.pages.length - 1];
        if (!page || page.used >= icon.perRow * icon.perRow) page = newPage();
        let slot = page.used++,
            x = (slot % icon.perRow) * icon.cell,
            y = Math.floor(slot / icon.perRow) * icon.cell,
            context = icon.context;
        context.setTransform(1, 0, 0, 1, 0, 0);
        context.clearRect(0, 0, icon.cell, icon.cell);
        drawIconInto(context, index, icon.cell / 2, icon.cell / 2, icon.axis, icon.axis * 2 * OUTLINE_WIDTH / iconUnits(1));
        gl.bindTexture(gl.TEXTURE_2D, page.texture);
        gl.pixelStorei(gl.UNPACK_PREMULTIPLY_ALPHA_WEBGL, true);
        gl.texSubImage2D(gl.TEXTURE_2D, 0, x, y, gl.RGBA, gl.UNSIGNED_BYTE, icon.scratch);
        gl.pixelStorei(gl.UNPACK_PREMULTIPLY_ALPHA_WEBGL, false);
        page.stale = true;
        icon.slots.set(index, { page: icon.pages.length - 1, u: x / PAGE_SIZE, v: y / PAGE_SIZE });
        icon.version++;
    }

    function buildIcons(until) {
        if (!scene || !gl || !icon.cell) return;
        let built = false,
            order = scene.order,
            layout = shown;
        if (scene.count) {
            visibleColumns(view.x, canvas.width, Math.max(1e-6, screenScale(cssWidth, cssHeight) * view.zoom / CELL * options.ratio()), scene.cols, columns);
            for (let i = scene.tileStart[columns[0]]; columns[0] <= columns[1] && i < scene.tileStart[columns[1] + 1]; i++) {
                let index = nodes[layout.tileNode[order[i]]].index;
                if (icon.slots.has(index)) continue;
                buildIcon(index);
                built = true;
                if (performance.now() >= until) break;
            }
        }
        while (icon.cursor < scene.count && performance.now() < until) {
            let index = nodes[layout.tileNode[order[icon.cursor++]]].index;
            if (icon.slots.has(index)) continue;
            buildIcon(index);
            built = true;
        }
        if (built) {
            for (let page of icon.pages) {
                if (!page.stale) continue;
                gl.bindTexture(gl.TEXTURE_2D, page.texture);
                gl.generateMipmap(gl.TEXTURE_2D);
                page.stale = false;
            }
            dirty = true;
        }
    }

    function tileColor(node) {
        let own = looks.colors[node];
        return rgbOf(own ? options.boxColor(own) : options.iconColor(nodes[node].sibling));
    }

    function packScene() {
        let layout = shown,
            count = layout.tileNode.length,
            cols = Math.max(1, layout.cols),
            columnCount = new Int32Array(cols + 1),
            tileStart = new Int32Array(cols + 1),
            order = new Int32Array(count),
            tiles = new Float32Array(count * TILE_STRIDE);
        for (let t = 0; t < count; t++) columnCount[layout.tileCol[t] + 1]++;
        for (let c = 0; c < cols; c++) tileStart[c + 1] = tileStart[c] + columnCount[c + 1];
        let fill = tileStart.slice(0, cols);
        for (let t = 0; t < count; t++) order[fill[layout.tileCol[t]]++] = t;
        for (let i = 0; i < count; i++) {
            let t = order[i],
                node = layout.tileNode[t],
                top = tileColor(node),
                band = bandOf(top, ink),
                o = i * TILE_STRIDE;
            tiles[o] = (layout.tileCol[t] + 0.5) * CELL;
            tiles[o + 1] = (layout.tileRow[t] + 0.5) * CELL;
            tiles[o + 2] = top[0] / 255;
            tiles[o + 3] = top[1] / 255;
            tiles[o + 4] = top[2] / 255;
            tiles[o + 5] = band[0] / 255;
            tiles[o + 6] = band[1] / 255;
            tiles[o + 7] = band[2] / 255;
        }
        scene = {
            count,
            cols,
            tileStart,
            order,
            tiles,
            segments: Float32Array.from(layout.segments),
            segmentCount: Math.floor(layout.segments.length / 4),
            icons: new Float32Array(count * ICON_STRIDE),
            iconStart: [],
            iconVersion: -1,
            labels: new Float32Array(count * LABEL_STRIDE),
            labelVersion: -1
        };
        icon.cursor = 0;
        if (gl && ready) {
            gl.bindBuffer(gl.ARRAY_BUFFER, buffers.tiles);
            gl.bufferData(gl.ARRAY_BUFFER, scene.tiles, gl.STATIC_DRAW);
            gl.bindBuffer(gl.ARRAY_BUFFER, buffers.segments);
            gl.bufferData(gl.ARRAY_BUFFER, scene.segments, gl.STATIC_DRAW);
        }
        dirty = true;
    }

    function packIcons() {
        let layout = shown,
            pages = icon.pages.length,
            cols = scene.cols,
            stride = cols + 1,
            starts = new Int32Array(pages * stride + 1),
            counts = new Int32Array(pages * stride);
        for (let i = 0; i < scene.count; i++) {
            let t = scene.order[i],
                slot = icon.slots.get(nodes[layout.tileNode[t]].index);
            if (slot) counts[slot.page * stride + layout.tileCol[t]]++;
        }
        let running = 0;
        for (let p = 0; p < pages; p++) {
            for (let c = 0; c < cols; c++) {
                starts[p * stride + c] = running;
                running += counts[p * stride + c];
            }
            starts[p * stride + cols] = running;
        }
        let fill = starts.slice(0, pages * stride);
        for (let i = 0; i < scene.count; i++) {
            let t = scene.order[i],
                slot = icon.slots.get(nodes[layout.tileNode[t]].index);
            if (!slot) continue;
            let o = (fill[slot.page * stride + layout.tileCol[t]]++) * ICON_STRIDE;
            scene.icons[o] = scene.tiles[i * TILE_STRIDE];
            scene.icons[o + 1] = scene.tiles[i * TILE_STRIDE + 1];
            scene.icons[o + 2] = slot.u;
            scene.icons[o + 3] = slot.v;
        }
        scene.iconStart = starts;
        scene.iconStride = stride;
        scene.iconPages = pages;
        scene.iconVersion = icon.version;
        gl.bindBuffer(gl.ARRAY_BUFFER, buffers.icons);
        gl.bufferData(gl.ARRAY_BUFFER, scene.icons, gl.DYNAMIC_DRAW);
    }

    function packLabels() {
        let layout = shown;
        for (let i = 0; i < scene.count; i++) {
            let o = i * LABEL_STRIDE,
                cell = atlas.cells.get(looks.names[layout.tileNode[scene.order[i]]]);
            scene.labels[o] = scene.tiles[i * TILE_STRIDE];
            scene.labels[o + 1] = scene.tiles[i * TILE_STRIDE + 1];
            if (cell) {
                scene.labels[o + 2] = cell.u;
                scene.labels[o + 3] = cell.v;
                scene.labels[o + 4] = cell.uw;
                scene.labels[o + 5] = cell.vh;
                scene.labels[o + 6] = cell.w;
                scene.labels[o + 7] = cell.h;
            } else {
                for (let k = 2; k < LABEL_STRIDE; k++) scene.labels[o + k] = 0;
            }
        }
        scene.labelVersion = atlas.version;
        gl.bindBuffer(gl.ARRAY_BUFFER, buffers.labels);
        gl.bufferData(gl.ARRAY_BUFFER, scene.labels, gl.DYNAMIC_DRAW);
    }

    function syncNames() {
        let changed = false;
        if (atlas.canvas && atlas.dirtyBottom > atlas.dirtyTop) {
            gl.bindTexture(gl.TEXTURE_2D, nameTexture);
            if (nameTextureHeight !== atlas.canvas.height) {
                nameTextureHeight = atlas.canvas.height;
                gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, PAGE_SIZE, nameTextureHeight, 0, gl.RGBA, gl.UNSIGNED_BYTE, null);
                gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
                gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
                gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
            }
            let top = atlas.dirtyTop,
                rows = Math.min(atlas.dirtyBottom, nameTextureHeight) - top;
            if (rows > 0) {
                gl.pixelStorei(gl.UNPACK_PREMULTIPLY_ALPHA_WEBGL, true);
                gl.texSubImage2D(gl.TEXTURE_2D, 0, 0, top, gl.RGBA, gl.UNSIGNED_BYTE, atlas.context.getImageData(0, top, PAGE_SIZE, rows));
                gl.pixelStorei(gl.UNPACK_PREMULTIPLY_ALPHA_WEBGL, false);
            }
            gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
            namesMipStale = true;
            atlas.dirtyTop = Infinity;
            atlas.dirtyBottom = 0;
            changed = true;
        }
        if (namesMipStale && (!atlas.pending() || performance.now() - namesMipTime >= NAME_MIP_GAP)) {
            gl.bindTexture(gl.TEXTURE_2D, nameTexture);
            gl.generateMipmap(gl.TEXTURE_2D);
            gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR_MIPMAP_LINEAR);
            namesMipStale = false;
            namesMipTime = performance.now();
            changed = true;
        }
        if (scene && scene.labelVersion !== atlas.version) {
            packLabels();
            changed = true;
        }
        return changed;
    }

    function resetAttributes() {
        for (let i = 0; i < 8; i++) {
            gl.disableVertexAttribArray(i);
            instancing.vertexAttribDivisorANGLE(i, 0);
        }
    }

    function attribute(program, name, buffer, size, stride, offset, divisor) {
        let location = program.attributes[name];
        if (location === undefined || location < 0) return;
        gl.bindBuffer(gl.ARRAY_BUFFER, buffer);
        gl.enableVertexAttribArray(location);
        gl.vertexAttribPointer(location, size, gl.FLOAT, false, stride, offset);
        instancing.vertexAttribDivisorANGLE(location, divisor);
    }

    function camera(program, sx, sy, ox, oy) {
        gl.useProgram(program.program);
        gl.uniform4f(program.uniforms.u_camera, sx, sy, ox, oy);
    }

    function drawGL(frame) {
        gl.viewport(0, 0, frame.width, frame.height);
        gl.clearColor(0, 0, 0, 0);
        gl.clear(gl.COLOR_BUFFER_BIT);
        if (!(frame.perUnit > 0) || !scene) return;
        let a = frame.perUnit,
            sx = 2 * a / frame.width,
            sy = -2 * a / frame.height,
            ox = -view.x * sx,
            oy = -view.y * sy;
        visibleColumns(view.x, frame.width, a, scene.cols, columns);
        let c0 = columns[0],
            c1 = columns[1];
        gl.enable(gl.BLEND);
        if (scene.segmentCount > 0) {
            let line = programs.line;
            camera(line, sx, sy, ox, oy);
            gl.uniform1f(line.uniforms.u_reach, LINE_WIDTH / 2 + 1.5 / a);
            gl.uniform1f(line.uniforms.u_pixel, a);
            gl.uniform1f(line.uniforms.u_half, LINE_WIDTH / 2);
            gl.uniform4f(line.uniforms.u_color, lineColor[0], lineColor[1], lineColor[2], lineColor[3]);
            if (minmax) gl.blendEquation(minmax.MAX_EXT);
            else gl.blendFunc(gl.ONE, gl.ONE_MINUS_SRC_ALPHA);
            resetAttributes();
            attribute(line, "a_corner", buffers.lineCorner, 2, 8, 0, 0);
            attribute(line, "a_segment", buffers.segments, 4, 16, 0, 1);
            instancing.drawArraysInstancedANGLE(gl.TRIANGLES, 0, 6, scene.segmentCount);
            gl.blendEquation(gl.FUNC_ADD);
        }
        gl.blendFunc(gl.ONE, gl.ONE_MINUS_SRC_ALPHA);
        if (c0 > c1) return;
        let t0 = scene.tileStart[c0],
            t1 = scene.tileStart[c1 + 1];
        if (t1 > t0) {
            let tile = programs.tile,
                stride = TILE_STRIDE * 4,
                offset = t0 * stride;
            camera(tile, sx, sy, ox, oy);
            gl.uniform4f(tile.uniforms.u_ring, ink[0] / 255, ink[1] / 255, ink[2] / 255, 1);
            resetAttributes();
            attribute(tile, "a_shape", buffers.tileShape, 3, 12, 0, 0);
            attribute(tile, "a_center", buffers.tiles, 2, stride, offset, 1);
            attribute(tile, "a_top", buffers.tiles, 3, stride, offset + 8, 1);
            attribute(tile, "a_band", buffers.tiles, 3, stride, offset + 20, 1);
            instancing.drawArraysInstancedANGLE(gl.TRIANGLES, 0, 36, t1 - t0);
        }
        if (frame.icon > 0 && scene.iconPages) {
            let program = programs.icon,
                stride = ICON_STRIDE * 4;
            camera(program, sx, sy, ox, oy);
            gl.uniform1f(program.uniforms.u_size, frame.icon * icon.cell / icon.axis);
            gl.uniform1f(program.uniforms.u_cell, icon.cell / PAGE_SIZE);
            gl.uniform1i(program.uniforms.u_texture, 0);
            gl.activeTexture(gl.TEXTURE0);
            for (let p = 0; p < scene.iconPages && p < icon.pages.length; p++) {
                let i0 = scene.iconStart[p * scene.iconStride + c0],
                    i1 = scene.iconStart[p * scene.iconStride + c1 + 1];
                if (i1 <= i0) continue;
                gl.bindTexture(gl.TEXTURE_2D, icon.pages[p].texture);
                resetAttributes();
                attribute(program, "a_corner", buffers.quad, 2, 8, 0, 0);
                attribute(program, "a_center", buffers.icons, 2, stride, i0 * stride, 1);
                attribute(program, "a_offset", buffers.icons, 2, stride, i0 * stride + 8, 1);
                instancing.drawArraysInstancedANGLE(gl.TRIANGLES, 0, 6, i1 - i0);
            }
        }
        if (frame.nameScale > 0 && nameTextureHeight > 0 && t1 > t0) {
            let program = programs.label,
                stride = LABEL_STRIDE * 4,
                offset = t0 * stride;
            camera(program, sx, sy, ox, oy);
            gl.uniform1f(program.uniforms.u_middle, frame.nameMiddle);
            gl.uniform1f(program.uniforms.u_scale, frame.nameScale);
            gl.uniform2f(program.uniforms.u_view, frame.width, frame.height);
            gl.uniform1f(program.uniforms.u_snap, frame.snap ? 1 : 0);
            gl.uniform1i(program.uniforms.u_texture, 0);
            gl.activeTexture(gl.TEXTURE0);
            gl.bindTexture(gl.TEXTURE_2D, nameTexture);
            resetAttributes();
            attribute(program, "a_corner", buffers.quad, 2, 8, 0, 0);
            attribute(program, "a_center", buffers.labels, 2, stride, offset, 1);
            attribute(program, "a_uv", buffers.labels, 4, stride, offset + 8, 1);
            attribute(program, "a_size", buffers.labels, 2, stride, offset + 24, 1);
            instancing.drawArraysInstancedANGLE(gl.TRIANGLES, 0, 6, t1 - t0);
        }
        resetAttributes();
    }

    function drawPlain(frame) {
        let context = plain;
        context.setTransform(1, 0, 0, 1, 0, 0);
        context.clearRect(0, 0, frame.width, frame.height);
        if (!(frame.perUnit > 0) || !scene) return;
        let a = frame.perUnit,
            toX = x => (x - view.x) * a + frame.width / 2,
            toY = y => (y - view.y) * a + frame.height / 2;
        visibleColumns(view.x, frame.width, a, scene.cols, columns);
        context.lineCap = "round";
        context.lineWidth = LINE_WIDTH * a;
        context.strokeStyle = cssOf([lineColor[0] / lineColor[3] * 255, lineColor[1] / lineColor[3] * 255, lineColor[2] / lineColor[3] * 255], lineColor[3]);
        context.beginPath();
        for (let i = 0; i < scene.segments.length; i += 4) {
            context.moveTo(toX(scene.segments[i]), toY(scene.segments[i + 1]));
            context.lineTo(toX(scene.segments[i + 2]), toY(scene.segments[i + 3]));
        }
        context.stroke();
        if (columns[0] > columns[1]) return;
        let t0 = scene.tileStart[columns[0]],
            t1 = scene.tileStart[columns[1] + 1],
            size = TILE * a,
            fontSize = frame.fontSize;
        context.lineWidth = RING_WIDTH * a;
        context.strokeStyle = cssOf(ink);
        for (let i = t0; i < t1; i++) {
            let o = i * TILE_STRIDE,
                x = toX(scene.tiles[o]) - size / 2,
                y = toY(scene.tiles[o + 1]) - size / 2;
            if (y > frame.height || y + size < 0) continue;
            context.fillStyle = cssOf([scene.tiles[o + 2] * 255, scene.tiles[o + 3] * 255, scene.tiles[o + 4] * 255]);
            context.fillRect(x, y, size, size * 0.6);
            context.fillStyle = cssOf([scene.tiles[o + 5] * 255, scene.tiles[o + 6] * 255, scene.tiles[o + 7] * 255]);
            context.fillRect(x, y + size * 0.6, size, size * 0.4);
            context.strokeRect(x, y, size, size);
        }
        for (let i = t0; i < t1; i++) {
            let o = i * TILE_STRIDE,
                x = toX(scene.tiles[o]),
                y = toY(scene.tiles[o + 1]),
                node = shown.tileNode[scene.order[i]];
            if (y - size > frame.height || y + size < 0) continue;
            if (frame.icon > 0) drawIconInto(context, nodes[node].index, x, y, frame.icon * a, 2 * OUTLINE_WIDTH * a);
            if (fontSize > 0) {
                context.font = `bold ${fontSize}px Ubuntu`;
                context.textAlign = "center";
                context.textBaseline = "middle";
                context.lineJoin = "round";
                context.lineWidth = nameStrokeSize(fontSize);
                context.strokeStyle = cssOf(ink);
                context.fillStyle = textColor;
                context.strokeText(looks.names[node], x, y + frame.nameMiddle * a);
                context.fillText(looks.names[node], x, y + frame.nameMiddle * a);
            }
        }
    }

    let frameData = { width: 0, height: 0, perUnit: 0, icon: 0, nameMiddle: 0, nameScale: 0, snap: false, fontSize: 0 };

    function frame() {
        if (!isOpen || !root) return;
        if (hidden !== wasHidden) {
            wasHidden = hidden;
            root.style.display = hidden ? "none" : "block";
            dirty = true;
        }
        if (hidden) return;
        let now = performance.now(),
            seconds = now > lastTime ? (now - lastTime) / 1000 : 0;
        lastTime = now;
        if (sizeStale) {
            sizeStale = false;
            cssWidth = root.clientWidth;
            cssHeight = root.clientHeight;
            let ratio = options.ratio(),
                width = Math.max(1, Math.round(cssWidth * ratio)),
                height = Math.max(1, Math.round(cssHeight * ratio));
            if (canvas.width !== width || canvas.height !== height) {
                canvas.width = width;
                canvas.height = height;
            }
            dirty = true;
            if (gl) sizeIcons();
        }
        if (cssWidth <= 0 || cssHeight <= 0) return;
        let scale = screenScale(cssWidth, cssHeight);
        if (readTheme()) {
            sceneStale = true;
            if (gl) resetIcons();
            barScale = 0;
        }
        if (scale !== barScale) {
            barScale = scale;
            styleBar(scale);
        }
        if (view.zoom !== view.target) view.zoom = easeZoom(view.zoom, view.target, seconds);
        let perUnitCss = scale * view.zoom / CELL;
        if ((pan.x !== 0 || pan.y !== 0) && perUnitCss > 0) {
            let step = PAN_SPEED * scale * (pan.fast ? PAN_FAST : 1) * (seconds < 0.1 ? seconds : 0.1);
            view.x += pan.x * step / perUnitCss;
            view.y += pan.y * step / perUnitCss;
        }
        clampView();
        if (sceneStale) {
            sceneStale = false;
            packScene();
        }
        let share = seconds * 200,
            budget = share < 0.5 ? 0.5 : share > 3 ? 3 : share;
        if (gl && ready) buildIcons(performance.now() + budget);
        let ratio = options.ratio(),
            fontMax = nameFontSize(scale * ZOOM_MAX / CELL, 1),
            atlasFont = fontMax * ratio,
            atlasStroke = nameStrokeSize(fontMax) * ratio,
            inkCss = cssOf(ink);
        if (atlas.fontSize !== atlasFont || atlas.strokeSize !== atlasStroke || atlas.ink !== inkCss || atlas.fill !== textColor) {
            atlas.reset(atlasFont, atlasStroke, inkCss, textColor, pendingNames ? [...pendingNames] : [...atlas.cells.keys(), ...atlas.queue.slice(atlas.next)]);
            pendingNames = null;
        } else if (pendingNames) {
            let missing = false;
            for (let name of pendingNames) {
                if (!atlas.cells.has(name)) {
                    missing = true;
                    break;
                }
            }
            if (missing) atlas.reset(atlasFont, atlasStroke, inkCss, textColor, [...atlas.cells.keys(), ...pendingNames]);
            pendingNames = null;
        }
        let names = nameFactor(view.zoom);
        if (gl && ready && atlas.pending()) atlas.build(performance.now() + budget);
        if (gl && ready) {
            if (syncNames() && names > 0) dirty = true;
            if (scene && scene.iconVersion !== icon.version) {
                packIcons();
                dirty = true;
            }
        }
        let width = canvas.width,
            height = canvas.height;
        if (!dirty && view.x === drawn.x && view.y === drawn.y && view.zoom === drawn.zoom && width === drawn.width && height === drawn.height) return;
        dirty = false;
        drawn.x = view.x;
        drawn.y = view.y;
        drawn.zoom = view.zoom;
        drawn.width = width;
        drawn.height = height;
        let f = frameData,
            units = iconUnits(names);
        f.width = width;
        f.height = height;
        f.perUnit = perUnitCss * ratio;
        f.icon = units * f.perUnit >= ICON_MIN_PIXELS ? units : 0;
        f.fontSize = nameFontSize(perUnitCss, names) * ratio;
        f.nameScale = f.fontSize > 0 && atlas.fontSize > 0 ? f.fontSize / atlas.fontSize : 0;
        f.snap = Math.abs(f.nameScale - 1) < 1e-6;
        f.nameMiddle = INSET + nameMiddle(names) - CELL / 2;
        if (gl && ready) drawGL(f);
        else if (plain) drawPlain(f);
    }

    function clampView() {
        let maxX = shown.cols * CELL,
            maxY = shown.rows * CELL;
        view.x = view.x < 0 ? 0 : view.x > maxX ? maxX : view.x;
        view.y = view.y < 0 ? 0 : view.y > maxY ? maxY : view.y;
    }

    function centerOn(layout) {
        view.x = layout.cols * CELL / 2;
        view.y = layout.rows * CELL / 2;
    }

    function setQuery(query) {
        if (query === view.query) return;
        view.query = query;
        let keep = searchTree(nodes, looks.lower, query);
        shown = keep ? layoutTree(nodes, keep) : full;
        centerOn(shown);
        sceneStale = true;
    }

    function setRoots(roots) {
        let mockups = options.mockups(),
            key = roots.join(",");
        nodes = buildTreeNodes(roots, mockups);
        looks = treeLooks(nodes, mockups);
        full = layoutTree(nodes, null);
        let distinct = new Set();
        for (let node of nodes) distinct.add(node.index);
        uniqueIcons = distinct.size;
        if (gl && cssWidth > 0) sizeIcons();
        if (view.key !== key) {
            view.key = key;
            view.opened = false;
            view.query = "";
        }
        if (!view.opened) {
            view.opened = true;
            centerOn(full);
            view.zoom = 0;
            view.target = ZOOM_DEFAULT;
            lastTime = performance.now();
        }
        let keep = view.query ? searchTree(nodes, looks.lower, view.query) : null;
        shown = keep ? layoutTree(nodes, keep) : full;
        clampView();
        if (input && input.value !== view.query) input.value = view.query;
        pendingNames = new Set();
        for (let name of looks.names) if (name !== "") pendingNames.add(name);
        sceneStale = true;
    }

    function open() {
        if (!root) makeRoot();
        isOpen = true;
        hidden = wasHidden = false;
        lastTime = performance.now();
        sizeStale = true;
        dirty = true;
        root.style.display = "block";
        if (input.value !== view.query) input.value = view.query;
    }

    function close() {
        isOpen = false;
        drag.active = false;
        pan.x = pan.y = 0;
        if (!root) return;
        if (document.activeElement === input) leaveField();
        root.style.display = "none";
    }

    function wheel(deltaY, deltaMode) {
        let delta = deltaMode === 0 ? deltaY : Math.sign(deltaY) * WHEEL_NOTCH;
        view.target = clampZoom(view.target * Math.pow(2, -delta / WHEEL_DIVISOR));
    }

    function zoomBy(direction) {
        view.target = clampZoom(view.target + direction * ZOOM_STEP);
    }

    function localPoint(x, y) {
        let rect = root.getBoundingClientRect();
        drag.localX = rect.width > 0 ? (x - rect.left) * cssWidth / rect.width : 0;
        drag.localY = rect.height > 0 ? (y - rect.top) * cssHeight / rect.height : 0;
    }

    function press(x, y) {
        if (!isOpen) return;
        if (input && document.activeElement === input) leaveField();
        localPoint(x, y);
        drag.active = true;
        drag.x = drag.localX;
        drag.y = drag.localY;
    }

    function move(x, y) {
        if (!drag.active) return false;
        localPoint(x, y);
        let perUnit = screenScale(cssWidth, cssHeight) * view.zoom / CELL;
        if (perUnit > 0) {
            view.x -= (drag.localX - drag.x) / perUnit;
            view.y -= (drag.localY - drag.y) / perUnit;
            clampView();
        }
        drag.x = drag.localX;
        drag.y = drag.localY;
        return true;
    }

    function release() {
        drag.active = false;
    }

    function setPan(axis, direction, fast) {
        pan.fast = fast;
        if (axis === "x") pan.x = direction;
        else pan.y = direction;
    }

    function stopPan(axis, direction, fast) {
        pan.fast = fast;
        if (axis === "x" && pan.x === direction) pan.x = 0;
        if (axis === "y" && pan.y === direction) pan.y = 0;
    }

    return {
        open,
        close,
        frame,
        setRoots,
        wheel,
        zoomBy,
        press,
        move,
        release,
        setPan,
        stopPan,
        setHidden: value => hidden = value,
        isOpen: () => isOpen,
        isTyping: () => !!input && document.activeElement === input
    };
}

export { createClassTree, buildTreeNodes, layoutTree, searchTree, treeLooks, CELL };
