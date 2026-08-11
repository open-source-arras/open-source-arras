import { util } from "./util.js";

const missingno = {
    index: -1,
    name: "MissingNo.",
    x: 0,
    y: 0,
    color: "mirror 0 1 0 true",
    strokeWidth: 1,
    upgradeColor: null,
    glow: {
        radius: null,
        color: null,
        alpha: 1,
        recursion: 1
    },
    borderless: false,
    drawFill: true,
    shape: "image=/missingno.png",
    imageInterpolation: "bilinear",
    size: 12,
    realSize: 12,
    facing: 0,
    position: {
        axis: 2,
        middle: {
            x: 0,
            y: 0
        }
    },
    statnames: {
        body_damage: "???",
        max_health: "???",
        bullet_speed: "???",
        bullet_health: "???",
        bullet_pen: "???",
        bullet_damage: "???",
        reload: "???",
        move_speed: "???",
        shield_regen: "???",
        shield_cap: "???"
    },
    rerootUpgradeTree: "basic", // todo: find a way to make this automatically change to Config.spawn_class without bricking everything
    className: "MissingNo.",
    upgrades: [],
    guns: [],
    turrets: [],
    props: []
};
function Clickable() {
    let region = {
        x: 0,
        y: 0,
        w: 0,
        h: 0,
    };
    let active = false;
    return {
        set: (x, y, w, h) => {
            region.x = x * global.ratio;
            region.y = y * global.ratio;
            region.w = w * global.ratio;
            region.h = h * global.ratio;
            active = true;
        },
        check: target => {
            let dx = Math.round(target.x - region.x);
            let dy = Math.round(target.y - region.y);
            return active && dx >= 0 && dy >= 0 && dx <= region.w && dy <= region.h;
        },
        hide: () => {
            active = false;
        },
    };
}
let Region = (size) => {
    // Define the region
    let data = [];
    for (let i = 0; i < size; i++) {
        data.push(Clickable());
    }
    // Return the region methods
    return {
        place: (index, ...a) => {
            if (index >= data.length) {
                console.log(index);
                console.log(data);
                throw new Error('Trying to reference a clickable outside a region!');
            }
            data[index].set(...a);
        },
        hide: () => {
            for (let region of data) region.hide();
        },
        check: x => data.findIndex(r => r.check(x))
    };
};

let gameDraw;

const global = {
    // Keys and other mathematical constants.
    KEY_AUTO_FIRE: 'KeyE',
    KEY_AUTO_ALT: 'KeyX',
    KEY_AUTO_SPIN: 'KeyC',
    KEY_SPIN_LOCK: 'KeyG',
    KEY_OVERRIDE: 'KeyR',
    KEY_LEVEL_UP: 'KeyN',
    KEY_ABILITY: 'KeyF',
    //KEY_PAUSE: 'KeyG',
    KEY_REVERSE_TANK: 'KeyV',
    KEY_REVERSE_MOUSE: 'KeyB',
    KEY_SCREENSHOT: 'KeyQ',
    KEY_SKILL_MAX: 'KeyM',
    KEY_CLASS_TREE: 'KeyT',
    KEY_RECORD: 'KeyZ',
    KEY_PING: 'KeyL',

    KEY_UP: 'KeyW',
    KEY_LEFT: 'KeyA',
    KEY_DOWN: 'KeyS',
    KEY_RIGHT: 'KeyD',

    KEY_UPGRADE_1: 'KeyY',
    KEY_UPGRADE_2: 'KeyU',
    KEY_UPGRADE_3: 'KeyI',
    KEY_UPGRADE_4: 'KeyH',
    KEY_UPGRADE_5: 'KeyJ',
    KEY_UPGRADE_6: 'KeyK',

    KEY_SKILL_1: 'Digit1',
    KEY_SKILL_2: 'Digit2',
    KEY_SKILL_3: 'Digit3',
    KEY_SKILL_4: 'Digit4',
    KEY_SKILL_5: 'Digit5',
    KEY_SKILL_6: 'Digit6',
    KEY_SKILL_7: 'Digit7',
    KEY_SKILL_8: 'Digit8',
    KEY_SKILL_9: 'Digit9',
    KEY_SKILL_0: 'Digit0',

    KEY_MOUSE_0: 'Space',
    KEY_MOUSE_2: 'ShiftLeft',

    KEY_SUICIDE: 'KeyO',

    KEY_SPECIAL: 'Backquote',
    KEY_SPECIAL_HELP: 'Slash',
    KEY_SPECIAL_HELP_ALT: 'F1',

    KEY_SPECIAL_PRESET_1: 'Digit1',
    KEY_SPECIAL_PRESET_2: 'Digit2',
    KEY_SPECIAL_PRESET_3: 'Digit3',
    KEY_SPECIAL_BASIC: 'KeyQ',

    KEY_SPECIAL_TELEPORT: 'KeyE',
    KEY_SPECIAL_KILL: 'KeyK',
    KEY_SPECIAL_WHIRLPOOL: 'KeyW',
    KEY_SPECIAL_DRAG: 'KeyD',
    KEY_SPECIAL_COLOR: 'KeyC',

    KEY_SPECIAL_WALL: 'KeyX',
    KEY_SPECIAL_WALL_TYPE: 'KeyZ',

    KEY_SPECIAL_VANISH: 'KeyV',
    KEY_SPECIAL_INVINCIBLE: 'KeyI',

    KEY_SPECIAL_TEAM: 'KeyT',
    KEY_SPECIAL_TEAM_INVITE: 'KeyY',

    KEY_SPECIAL_HEAL: 'KeyH',

    KEY_SPECIAL_SKILL: 'KeyS',
    KEY_SPECIAL_SKILL_RESET: 'KeyR',
    KEY_SPECIAL_SKILL_CLEAR: 'KeyC',
    KEY_SPECIAL_SKILL_MAX: 'KeyM',
    KEY_SPECIAL_SKILL_REMOVE: 'KeyD',
    KEY_SPECIAL_SKILL_ADD: 'KeyF',
    KEY_SPECIAL_SKILL_CAP_REMOVE: 'KeyG',
    KEY_SPECIAL_SKILL_CAP_ADD: 'KeyH',

    KEY_SPECIAL_DATA: 'KeyG',
    KEY_SPECIAL_LEVEL_UP: 'KeyN',
    KEY_SPECIAL_POLICE: 'KeyP',
    KEY_SPECIAL_BLAST: 'KeyB',

    KEY_SPECIAL_ATTRIBUTE: 'KeyA',
    KEY_SPECIAL_ATTRIBUTE_MINIMAP_TEAM: 'KeyT',
    KEY_SPECIAL_ATTRIBUTE_MINIMAP_HIDE: 'KeyM',
    KEY_SPECIAL_ATTRIBUTE_LEADERBOARD: 'KeyL',
    KEY_SPECIAL_ATTRIBUTE_RELOAD: 'KeyC',
    KEY_SPECIAL_ATTRIBUTE_RECOIL: 'KeyR',
    KEY_SPECIAL_ATTRIBUTE_ARENA_EDGE: 'KeyO',
    KEY_SPECIAL_ATTRIBUTE_WALL: 'KeyW',
    KEY_SPECIAL_ATTRIBUTE_SCORE: 'KeyK',

    KEY_SPECIAL_BAN: 'KeyO',

    KEY_SPECIAL_ZOOM_OUT: 'Minus',
    KEY_SPECIAL_ZOOM_IN: 'Equal',
    KEY_SPECIAL_ZOOM_CLEAR: 'Digit0',

    KEY_SPECIAL_SMALLER: 'Comma',
    KEY_SPECIAL_BIGGER: 'Period',

    KEY_SPECIAL_PROMOTE: 'Semicolon',
    KEY_SPECIAL_DEMOTE: 'Quote',

    KEY_ABILITIES: ['KEY_SPECIAL_ATTRIBUTE', 'KEY_SPECIAL_SKILL'],

    showTree: false,
    scrollX: 0,
    realScrollX: 0,

    // Canvas
    screenWidth: window.innerWidth,
    screenHeight: window.innerHeight,
    gameWidth: 0,
    gameHeight: 0,
    xoffset: -0,
    yoffset: -0,
    gameLoading: false,
    gameStart: false,
    gameConnecting: false,
    gameUpdate: false,
    disconnected: false,
    autoSpin: false,
    syncingWithTank: false,
    respawnTimeout: false,
    showDebug: false,
    died: false,
    kicked: false,
    continuity: false,
    glCanvas: null,
    showChat: 0,
    generateTankTree: false,
    specialPressed: false,
    specialKeysPressed: [],
    backgroundColor: '#f2fbff',
    lineColor: '#000000',
    nameColor: "#FFFFFF",
    message: "",
    player: {},
    messages: [],
    mockups: [],
    missingno: [missingno],
    roomSetup: [],
    entities: [],
    cached: {},
    updateTimes: 0,
    pullUpgradeMenu: false,
    pullSkillBar: false,
    clickables: {
        stat: Region(10),
        upgrade: Region(100),
        clicked: false,
        hover: Region(1),
        skipUpgrades: Region(1),
        mobileButtons: Region(20),
        exitGame: Region(1),
        deathRespawn: Region(1),
        reconnect: Region(1),
        classTreeZoomOut: Region(2),
        classTreeZoomIn: Region(2),
        classTreeClose: Region(1),
        // Daily tanks buttons
        dailyTankUpgrade: Clickable(),
        dailyTankAd: Clickable(),
        dailyTankCloseAd: Clickable(),
        optionsMenu: {
            switchButton: Region(2),
            toggleBoxes: Region(100),
            HoverBoxes: Region(100),
            optionBoxes: Region(50),
            mainMenuIdle: Clickable(),
        }
    },
    dailyTankAd: {
        render: undefined,
        closeable: false,
        renderUI: false,
        readyToRender: false,
        isVideo: false,
        width: 1204,
        height: 670,
        exit: () => {
            try {
                global.dailyTankAd.render.pause();
            } catch { };
            global.dailyTankAd.renderUI = false;
            global.dailyTankAd.readyToRender = false;
            global.dailyTankAd.closeable = false;
            global.dailyTankAd.videoBar = undefined;
            global.dailyTankAd.closebtnAnim = undefined;
            global.dailyTankAd.width = global.dailyTankAd.orginWidth;
            global.dailyTankAd.height = global.dailyTankAd.orginHeight;
            global.dailyTankAd.render = undefined;
        }
    },
    statHover: false,
    upgradeHover: false,
    statMaxing: false,
    metrics: {
        latency: [],
        lag: 0,
        rendertime: 0,
        rendertimes: 1,
        rendertime_color: "not found",
        updatetime: 0,
        lastlag: 0,
        lastrender: 0,
        rendergap: 0,
        lastuplink: 0,
        mspt: 0,
    },
    advanced: {
        arenaShape: 'rect',
        roundArena: false,
        blackout: {
            active: false,
            color: "#000000"
        },
    },
    bandwidth: {
        currentHa: 0,
        currentFa: 0,
        finalHa: 0,
        finalFa: 0,
    },
    mobileStatus: {
        enableCrosshair: false,
        showCrosshair: false,
        useBigJoysticks: false,
        showJoysticks: false,
    },
    GUIStatus: {
        renderGUI: false,
        renderLeaderboard: false,
        renderUpgrades: false,
        renderMinimap: false,
        renderhealth: false,
        renderPlayerNames: false,
        renderPlayerScores: false,
        renderPlayerBars: false,
        renderPlayerKillbar: false,
        renderIngameOptions: false,
        minimapReducedInfo: false,
        fullHDMode: false,
    },
    serverStats: {
        players: "?",
        mspt: "?",
        mspt_color: "not found",
        lag_color: "not found",
        serverGamemodeName: "Unknown",
    },
    renderingInfo: {
        entities: 0,
        turretEntities: 0,
        entitiesWithName: 0,
    },
    lerp: (v, z, x) => {
        v = (x - v) / (z - v);
        return 0 >= v ? 0 : 1 <= v ? 1 : v * v * (3 - 2 * v);
    },
    refreshMonitorColoring: (e) => {
        gameDraw = e;
        global.serverStats.mspt_color = gameDraw.color.white;
        global.serverStats.lag_color = gameDraw.color.white;
        global.metrics.rendertime_color = gameDraw.color.white;
    },
    mouse: { x: 0, y: 0 },
    target: { x: 0, y: 0 },
    reverseTank: 1,
    fps: 60,
    serverStart: 0,
    screenSize: Math.min(1920, Math.max(window.innerWidth, 1280)),
    vscreenSize: 1920,
    vscreenSizey: 1080,
    timezoneLocation: new Date().getTimezoneOffset() / -60,
    ratio: window.devicePixelRatio,
    mockupLoading: { then: cb => cb() },
    treeScale: 1,
    chats: {},
    initPlayer: () => {
        global.optionsMenu_Anim = {
            switchMenu_button: util.Smoothbar(0, 2, 3, 0.08, 0.025, true),
            optionsButtonProgress: util.Smoothbar(0, 2, 0.1, 0.08, 0.025, true),
            mainMenu: util.Smoothbar(-500, 2, 3, 0.08, 0.025, true),
            mainMenuHeight: util.Smoothbar(770, 2, 3, 0.08, 0.025, true),
            isOpened: false,
            tabClickables: Region(10),  // Pre-initialize for up to 10 tabs
            themeClickables: Region(100),
            activeTab: 0, // 0=Options, 1=Theme, 2=Keybinds, 3=Secret
            tabs: [["Options", 770], ["Theme", 610], ["Keybinds", 730]],
            tabSlideAnim: util.Smoothbar(0, 0.3, 1.5, 0.03, 0.025, true),
            sliderMoving: false,
            currentOptionMenu: false
        };
        let list = {
            // Set up the player
            id: -1,
            x: global.screenWidth / 2,
            y: global.screenHeight / 2,
            vx: 0,
            vy: 0,
            lastvx: 0,
            lastvy: 0,
            cx: {
                x: 0,
                animX: 0,
            },
            cy: {
                y: 0,
                animY: 0,
            },
            renderx: 0,
            rendery: 0,
            lastx: global.player.x,
            lasty: global.player.y,
            isScoping: false,
            screenx: 0,
            screeny: 0,
            renderv: 2000,
            animv: new util.animBar(),
            slip: 0,
            view: 1,
            target: global.canvas.target,
            animX: new util.animBar(),
            animY: new util.animBar(),
            roomAnim: {
                x: new util.animBar(),
                y: new util.animBar(),
            },
            name: "",
            lastUpdate: 0,
            time: 0,
            screenWidth: global.screenWidth,
            screenHeight: global.screenHeight,
            nameColor: "#ffffff",
        }
        list.animv.add(list.renderv);
        return list;
    },
    tankTree: (type) => {
        if (type === "open") {
            if (global.died) return;
            global.showTree = true;
            global.pullUpgradeMenu = true;
            global.pullSkillBar = true;
            global.socket.talk('T');
        } else if (type === "exit") {
            global.showTree = false;
            global.renderTankTree = false;
            global.pullUpgradeMenu = false;
            global.pullSkillBar = false;
            global.targetTreeScale = global.treeScale = 1;
            global.scrollX = global.scrollY = global.fixedScrollX = global.fixedScrollY = -1;
            global.scrollVelocityY = global.scrollVelocityX = 0;
            global.classTreeDrag.isDragging = false;
            global.classTreeDrag.momentum = { x: 0, y: 0 };
            global.searchQuery = '';
            global.searchBarActive = false;
            global.canvas.tankTreeProps.enabled = false;
        }
    },
    exit: () => { // When exiting and going back to the menu, reset things.
        document.getElementById("gameAreaWrapper").style.display = "none";
        document.getElementById("startMenuWrapper").style.display = "block";
        clearInterval(global.socket.commandCycle);
        clearInterval(global.socketMotionCycle);
        global.socket.open = false;
        global.socket && global.socket.close();
        global.gameLoading = false;
        global.gameStart = false;
        global.gameUpdate = false;
        global.died = false;
        global.disconnected = false;
        global.entities = [];
        global.roomSetup = [];
        global.messages = [];
        global.metrics.latency = [];
        global.chats = {};
        global.metrics.rendertime = 0;
        global.metrics.rendertimes = 1;
        global.time = 0;
        global.metrics.lag = 0;
        global.secondaryLoop = false;
        global.gameWidth = 0;
        global.gameHeight = 0;
        global.canvas.mouseMoved = false;
        global.mockups = [];
        global.mobile && document.exitFullscreen();
        global.resetTarget();
        global.resetSocket();
        global.clearUpgrades(true);
        global.player = global.initPlayer();
        setTimeout(() => {
            document.getElementById("startMenuWrapper").style.top = "0px";
        }, 10);
    },
    reconnect: () => {
        global.player = global.initPlayer();
        global.gameLoading = false;
        global.gameStart = false;
        global.gameUpdate = false;
        global.died = false;
        global.disconnected = false;
        global.gameConnecting = true;
        global.message = "";
        global.entities = [];
        global.roomSetup = [];
        global.messages = [];
        global.metrics.latency = [];
        global.chats = {};
        global.metrics.rendertime = 0;
        global.metrics.rendertimes = 1;
        global.time = 0;
        global.metrics.lag = 0;
        global.secondaryLoop = false;
        global.mockups = [];
        global.canvas.mouseMoved = false;
        clearInterval(global.socketMotionCycle);
        global.resetTarget();
        global.clearUpgrades(true);
        global.resetSocket();
        global.startGame();
    }
};
export { global };
