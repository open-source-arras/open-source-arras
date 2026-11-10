import { util } from "./util.js";
import { global } from "./global.js";
import { config } from "./config.js";
import { Canvas } from "./canvas.js";
import { color as colors } from "./color.js";
import { gameDraw } from "./gameDraw.js";
import { keybinderHandler } from "./keybindsHandler.js";
import { skinShape } from "./skins.js";
import * as socketStuff from "./socketinit.js";
import { createClassTree } from "./classTree.js";
import { createMenu } from "./arrasMenu.js";
import { slideStep, commas, abbreviate, killFill, killText, skillFillEnd, skillPreview, skillHideDistance, leaderboardPrefix, LeaderboardBoard, SKILL_SEGMENT, SKILL_START, SKILL_TRACK_LEFT } from "./hud.js";

const THEME_PALETTE_KEYS = [
    "teal", "lgreen", "orange", "yellow", "aqua", "pink", "vlgrey", "lgrey",
    "guiwhite", "black", "blue", "green", "red", "gold", "purple", "magenta",
    "grey", "dgrey", "white", "guiblack",
];
const THEME_V1_MAGIC = "\x6a\xba\xda\xb3\xf0";

(async function (util, global, config, Canvas, color, gameDraw, socketStuff, keybinderHandler) {
    let { socketInit, resync, gui, leaderboard, minimap, moveCompensation, lag, getNow } = socketStuff;
    // Get the changelog
    fetch("CHANGELOG.md", { cache: "no-cache" }).then(response => response.text()).then(response => {
        let b = [];
        var c = [];
        for (let d of response.split("\n"))
            0 !== d.length &&
            ((response = d.charAt(0)),
            "#" === response
            ? (b.push(c), (c = [d.slice(1).trim()]))
            : "-" === response
            ? c.push(d.slice(1).trim())
            : (c[c.length - 1] += " " + d.trim()))
        b.push(c);
        for (c = 0; c < b.length; ) {
            if (addChangelog(b[c], 157248e5)) {
                c++;
                continue;
            }
            b = b.slice(c);
            let d = addChangelog([
                "Older Changelogs",
                '<a class="view-older-changelogs" href="javascript:;">Click here to load changelogs more than 6 months old.</a>',
            ]);
            [c] = d.getElementsByClassName("view-older-changelogs");
            c.addEventListener("click", () => {
                d.remove();
                for (let g of b) addChangelog(g);
            });
            break;
        }
    });

    global.clearUpgrades = (clearNow = false) => {
        if (clearNow) gui.upgrades = [];
        else {
            global.pullUpgradeMenu = true;
            let loop = setInterval(() => {
                if (upgradeMenu.get() < (-global.columnCount * 3) * 0.9999) {
                    global.pullUpgradeMenu = false;
                    gui.upgrades = [];
                    clearInterval(loop);
                }
            }, 10)
        }
    }

    // Build the leaderboard object
    const leaderboardBoard = new LeaderboardBoard();
    let leaderboardVersion = -1,
        leaderboardTime = 0,
        leaderboardPrefixes = new Map();
    global.canUpgrade = false;
    global.canSkill = false;
    global.showTree = false;
    global.message = "";
    global.time = 0;
    global.guntime = 0;

    var upgradeSpin = 0,
        lastPing = 0,
        lasttick = 0,
        fovlasttick = 0;

    // Tips setup :D
    let tips = global.tips[Math.floor(Math.random() * global.tips.length)];
    global.tips = tips[Math.floor(Math.random() * tips.length)];

    // Window setup <3
    global.mobile = /Android|webOS|iPhone|iPad|iPod|BlackBerry/i.test(navigator.userAgent);
    global.mobile && document.body.classList.add("mobile");
    !global.mobile && document.body.classList.add("not-mobile");
    if (global.mobile) {
        document.getElementById("tabAppearance").style.height = "84.5%";
        document.getElementById("tabOptions").style.height = "84.5%";
        document.getElementById("tabAbout").style.height = "84.5%";
        document.getElementById("tabAddons").style.height = "84.5%";
    };

    window.onload = async () => {
        // Prepare the server selector
        global.serverMap = {};
        global.servers = [];
        // Set up the socket
        global.loadServerSelector(false, "Loading..."); // The code is at ./serverSelectorHandler.js

        fetch("/getServers.json").then(response => response.json()).then(json => {
            if (localStorage.getItem("optShowLocalhostChecked") === "true") json.unshift({
                id: json.some(server => server.id === "x") ? "localhost" : "x",
                ip: "localhost:5000",
                players: 0,
                maxPlayers: 80,
                featured: false,
                hidden: false,
                private: false,
                region: "Local",
                location: "Localhost",
                gameMode: "Private"
            });
            global.servers = json;
            global.loadServerSelector(json); // The code is at ./serverSelectorHandler.js
        }).catch(error => {
            console.error(error);
        })

        // Retrieve forms
        util.retrieveFromLocalStorage("optName");
        util.retrieveFromLocalStorage("playerKeyInput");
        util.retrieveFromLocalStorage("optSharpEdges");
        util.retrieveFromLocalStorage("optTankSkins");
        util.retrieveFromLocalStorage("optSlowerFOV");
        util.retrieveFromLocalStorage("optPredictive");
        util.retrieveFromLocalStorage("optFancy");
        util.retrieveFromLocalStorage("optLowResolution");
        util.retrieveFromLocalStorage("coloredHealthbars");
        util.retrieveFromLocalStorage("smoothCamera");
        util.retrieveFromLocalStorage("optColors");
        util.retrieveFromLocalStorage("optPointy");
        util.retrieveFromLocalStorage("optCurvyTraps");
        util.retrieveFromLocalStorage("optInterpolation");
        util.retrieveFromLocalStorage("optLerpAnim");
        util.retrieveFromLocalStorage("optOptimizeMode");
        util.retrieveFromLocalStorage("optCenterMinimap");
        util.retrieveFromLocalStorage("optBorders");
        util.retrieveFromLocalStorage("optNoGrid");
        util.retrieveFromLocalStorage("optHexaGrid");
        util.retrieveFromLocalStorage("optColoredNest");
        util.retrieveFromLocalStorage("optRenderKillbar");
        util.retrieveFromLocalStorage("separatedHealthbars");
        util.retrieveFromLocalStorage("autoLevelUp");
        util.retrieveFromLocalStorage("optMobile");
        // GUI
        util.retrieveFromLocalStorage("optRenderGui");
        util.retrieveFromLocalStorage("optRenderLeaderboard");
        util.retrieveFromLocalStorage("optRenderUpgrades");
        util.retrieveFromLocalStorage("optRenderMinimap");
        util.retrieveFromLocalStorage("optRenderNames");
        util.retrieveFromLocalStorage("optRenderHealth");
        util.retrieveFromLocalStorage("optRenderScores");
        util.retrieveFromLocalStorage("optRenderPlayerBars");
        util.retrieveFromLocalStorage("optReducedInfo");
        util.retrieveFromLocalStorage("showCrosshair");
        util.retrieveFromLocalStorage("showJoystick");
        util.retrieveFromLocalStorage("optFullHD");
        util.retrieveFromLocalStorage("optUiScale");
        util.retrieveFromLocalStorage("optNames");
        util.retrieveFromLocalStorage("optCanvas");
        util.retrieveFromLocalStorage("optAllowIngameOptions");
        util.retrieveFromLocalStorage("optOldUiStyle");
        // Game
        util.retrieveFromLocalStorage("optIncognitoMode");
        util.retrieveFromLocalStorage("optDeltaEntities");
        // Default to true
        if (localStorage.getItem("optRenderKillbarChecked") === null) {
            document.getElementById("optRenderKillbar").checked = true;
            util.submitToLocalStorage("optRenderKillbar");
        }
        config.game.rainbowTeamColors = localStorage.getItem("optRainbowTeamColorsChecked") === "true";
        // Default to true
        if (localStorage.getItem("optDeltaEntitiesChecked") === null) {
            document.getElementById("optDeltaEntities").checked = true;
            util.submitToLocalStorage("optDeltaEntities");
        }
        if (localStorage.getItem("optTankSkinsChecked") === null) document.getElementById("optTankSkins").checked = true;
        // Set default theme
        if (document.getElementById("optColors").value === "") {
            document.getElementById("optColors").value = "normal";
        }
        if (document.getElementById("optBorders").value === "") {
            document.getElementById("optBorders").value = "normal";
        }
        // Mobile Selection stuff
        if (document.getElementById("optMobile").value === "") {
            document.getElementById("optMobile").value = "mobile";
        }
        // If we are loaded for the first time then load the default options settings.
        if (!localStorage.getItem("loadedForFirstTime")) {
            document.getElementById("optRenderGui").checked = true;
            document.getElementById("optRenderLeaderboard").checked = true;
            document.getElementById("optRenderUpgrades").checked = true;
            document.getElementById("optRenderMinimap").checked = true;
            document.getElementById("optRenderNames").checked = true;
            document.getElementById("optRenderHealth").checked = true;
            document.getElementById("optRenderScores").checked = true;
            document.getElementById("optRenderPlayerBars").checked = true;
            document.getElementById("optFancy").checked = true;
            document.getElementById("optInterpolation").checked = true;
            document.getElementById("optLerpAnim").checked = true;
            document.getElementById("smoothCamera").checked = true;
            document.getElementById("optFancy").checked = true;
            document.getElementById("autoLevelUp").checked = true;
            document.getElementById("optDeltaEntities").checked = true;
            if (global.mobile) document.getElementById("showCrosshair").checked = true, document.getElementById("showJoystick").checked = true;
            // Dont forget to save it.
            util.submitToLocalStorage("optRenderGui");
            util.submitToLocalStorage("optRenderLeaderboard");
            util.submitToLocalStorage("optRenderUpgrades");
            util.submitToLocalStorage("optRenderMinimap");
            util.submitToLocalStorage("optRenderNames");
            util.submitToLocalStorage("optRenderHealth");
            util.submitToLocalStorage("optRenderScores");
            util.submitToLocalStorage("optRenderPlayerBars");
            util.submitToLocalStorage("showCrosshair");
            util.submitToLocalStorage("showJoystick");
            util.submitToLocalStorage("optInterpolation");
            util.submitToLocalStorage("optLerpAnim");
            util.submitToLocalStorage("smoothCamera");
            util.submitToLocalStorage("optFancy");
            util.submitToLocalStorage("autoLevelUp");
            util.submitToLocalStorage("optDeltaEntities");
            localStorage.setItem("loadedForFirstTime", "true");
            localStorage.setItem("uiScaleSettings", null);
        }
        if (!localStorage.getItem("uiScaleSettings") || document.getElementById("optUiScale").value === "") {
            document.getElementById("optUiScale").value = global.mobile ? "mobile" : "normal";
            util.submitToLocalStorage("optUiScale");
            localStorage.setItem("uiScaleSettings", "true");
        }
        if (!document.getElementById("optNames").value) document.getElementById("optNames").value = "offense";
        if (!document.getElementById("optCanvas").value) document.getElementById("optCanvas").value = "auto";
        loadSettings();
        // Keybinds stuff
        keybinderHandler.initalize("controlSettings", "resetControls", "keybinds"); // Gameplay keys
        keybinderHandler.initalize("sandboxControlSettings", "resetSandboxControls", "sandboxkeybinds"); // Sandbox command keys
        keybinderHandler.initalize("sandboxSkillControlSettings", "resetSandboxSkillControls", "sandboxskillkeybinds"); // Sandbox command keys (Skill)
        keybinderHandler.initalize("sandboxAttributeControlSettings", "resetSandboxAttributeControls", "sandboxattributekeybinds"); // Sandbox command keys (Attribute)

        // Tab menu creater
        global.createTabMenu = (text, type, addDismissButton = false) => {
            let allowedType = [
                "warning",
                "critical",
                "discord",
                "stat",
                "achieve"
            ];
            if (allowedType.includes(type)) {
                let b = document.getElementById("menuTabs");
                b.style.textAlign = "center";
                let d = document.createElement("span");
                d.classList.add("menuTab");
                d.classList.add(type);
                d.appendChild(document.createTextNode(`${text}${addDismissButton ? "\xa0\xa0\xa0" : ""}`));
                if (addDismissButton) {
                    text = document.createElement("text");
                    text.style.textDecoration = "underline";
                    text.href = "javascript:;";
                    text.appendChild(document.createTextNode("Dismiss"));
                    text.addEventListener("click", () => d.remove());
                    d.appendChild(text);
                }
                b.appendChild(d);
                return d;
            } else throw new Error("Invalid menu tab type.");
        };
        try {
            fetch("/version").then(json => json.json()).then(ve => {
                global.version = ve.ver;
                if (ve.dev_build) {
                    global.dev_build = true;
                    global.createTabMenu(`Open Source Arras ${global.version} (dev build)`, "warning", true);
                }
                // Addon info handler
                let keyValue = localStorage.getItem("playerKeyInputValue");
                (async function() {
                    let A_response = await fetch(`/api/getAddonAuthors?token=${keyValue}`);
                    let A_data = await A_response.json().catch(() => false);
                    if (A_data && Array.isArray(A_data)) initalizeAddonAuthors(A_data);
                })();
            });
        } catch { };
        // Warn the users to turn their phones into landscape.
        if (global.mobile && window.innerHeight > 1.1 * window.innerWidth) {
            let tabMenu = global.createTabMenu("Please turn your device to landscape mode.", "warning", true);
            window.addEventListener("orientationchange", () => {
                window.innerHeight > 1.1 * window.innerWidth || tabMenu.remove();
            });
        };

        // Game start stuff
        document.getElementById("startButton").onclick = () => startGame();
        document.onkeydown = (e) => {
            if (!(global.gameStart || e.shiftKey || e.ctrlKey || e.altKey)) {
                keybinderHandler.triggerKey(e);
                let key = e.code;
                if (key === "Enter") {
                    startGame();
                }
            }
        };
        window.addEventListener("resize", resizeEvent);
        // Resizing stuff
        resizeEvent();
        global.menu = createMenu(menuHooks());
    };

    // Tab options
    function tabOptionsMenuSwitcher() {
        let buttonTabs = document.getElementById("optionMenuTabs"),
            tabOptions = [
                document.getElementById("tabAppearance"),
                document.getElementById("tabOptions"),
                document.getElementById("tabControls"),
                document.getElementById("tabAbout"),
                document.getElementById("tabAddons"),
            ];
        for (let g = 1; g < tabOptions.length; g++) tabOptions[g].style.display = "none";
        let e = 0;
        for (let g = 0; g < buttonTabs.children.length; g++)
            buttonTabs.children[g].addEventListener("click", () => {
                e !== g &&
                    (buttonTabs.children[e].classList.remove("active"), // Remove the active class
                        buttonTabs.children[g].classList.add("active"), // Add the clicked active class
                        (tabOptions[e].style.display = "none"), // Dont display the old menu.
                        (tabOptions[g].style.display = "block"), // Display the menu.
                        (e = g))
            });
    }
    function tabControlsMenuSwitcher() {
        let buttonTabs = document.getElementById("controlsMenuTabs"),
            tabOptions = [
                document.getElementById("tabGameplay"),
                document.getElementById("tabSandbox"),
            ];
        for (let g = 1; g < tabOptions.length; g++) tabOptions[g].style.display = "none";
        let e = 0;
        for (let g = 0; g < buttonTabs.children.length; g++)
            buttonTabs.children[g].addEventListener("click", () => {
                e !== g &&
                    (buttonTabs.children[e].classList.remove("active"), // Remove the active class
                        buttonTabs.children[g].classList.add("active"), // Add the clicked active class
                        (tabOptions[e].style.display = "none"), // Dont display the old menu.
                        (tabOptions[g].style.display = "block"), // Display the menu.
                        (e = g))
            });
    }
    function tabSandboxControlsMenuSwitcher() {
        let buttonTabs = document.getElementById("sandboxControlsMenuTabs"),
            tabOptions = [
                document.getElementById("tabSandboxMain"),
                document.getElementById("tabSandboxSkill"),
                document.getElementById("tabSandboxAttribute"),
            ];
        for (let g = 1; g < tabOptions.length; g++) tabOptions[g].style.display = "none";
        let e = 0;
        for (let g = 0; g < buttonTabs.children.length; g++)
            buttonTabs.children[g].addEventListener("click", () => {
                e !== g &&
                    (buttonTabs.children[e].classList.remove("active"), // Remove the active class
                        buttonTabs.children[g].classList.add("active"), // Add the clicked active class
                        (tabOptions[e].style.display = "none"), // Dont display the old menu.
                        (tabOptions[g].style.display = "block"), // Display the menu.
                        (e = g))
            });
    }
    function initalizeAddonAuthors(data) {
        let mainDoc = document.getElementById("tabAddons");
        mainDoc.innerHTML = "";
        for (let doc of document.getElementById("optionMenuTabs").children) {
            if (doc.textContent.toLowerCase() === "addons") doc.style.display = "";
        }

        // OSA info
        let i_div = document.createElement("div");
        i_div.classList.add("optionsHeader");
        i_div.textContent = `Open Source Arras ${global.version}` + `${global.dev_build ? " (dev build)" : ""}`;
        mainDoc.appendChild(i_div);

        // Addon stuff
        for (let e of data) {
            let warnDoc = null;
            if (e["osa-version"].target !== global.version) {
                if (global.version.startsWith("v") && e["osa-version"].minimum.startsWith("v")) {
                    let targetVersion = global.version.split("v")[1];
                    let target = "";
                    targetVersion.split(".").forEach(e => {
                        target += e;
                    })
                    let minimumVersion = e["osa-version"].minimum.split("v")[1];
                    let minimum = "";
                    minimumVersion.split(".").forEach(e => {
                        minimum += e;
                    })
                    if (parseInt(minimum) > parseInt(target)) {
                        warnDoc = document.createElement("ul3");
                        warnDoc.textContent = "This addon may be incompatible with your version!";
                    }
                }
            }
            let divDoc = document.createElement("div");
            divDoc.classList.add("optionsHeader");
            let name = document.createElement("ul");
            let addonVer = document.createElement("ul");
            let versionValue = document.createElement("ul2");
            let author = document.createElement("ul");
            let authorValue = document.createElement("ul2");
            let targetVer = document.createElement("ul");

            name.textContent = e.name;
            addonVer.textContent = "Version: ";
            versionValue.textContent = `${e["addon-version"]}`;
            addonVer.appendChild(versionValue);
            author.textContent = "Author(s): ";
            authorValue.textContent = "";
            for (let i = 0; i < e.authors.length; i++) {
                let auth = e.authors[i];
                authorValue.textContent += `${i !== 0 ? ", " : ""}${auth}`;
            }
            author.appendChild(authorValue);
            targetVer.textContent = `Made for Open Source Arras ${e["osa-version"].target}`;

            divDoc.appendChild(name);
            divDoc.appendChild(author);
            divDoc.appendChild(addonVer);
            if (warnDoc) divDoc.appendChild(warnDoc);
            divDoc.appendChild(targetVer);

            mainDoc.appendChild(divDoc);
        }
    }
    // Custom theme display handler
    function customThemeDisplayHandler() {
        // Custom theme handler
        util.retrieveFromLocalStorage("optCustom");
        let themeValue = document.getElementById("optCustom");
        let customPlate;
        for (let e of document.getElementById("optColors").children) {
            if (e.value === "custom") customPlate = e;
        }
        let {name, author} = getThemeDisplayName(themeValue);
        if (name !== null && author !== null) customPlate.textContent = `Custom - ${name} ${author}`;
        themeValue.addEventListener("input", () => {
            let {name, author} = getThemeDisplayName(themeValue);
            if (name !== null && author !== null) customPlate.textContent = `Custom - ${name} ${author}`; else customPlate.textContent = "Custom - Unable to pull name or author.";
        });
    }

    function snowAndFireworkEffects() {
        let currentDate = new Date(),
        snowAmount = global.mobile
        ? 0
        : Math.max(
            0,
            1 -
                Math.abs(
                currentDate.getTime() -
                    new Date(currentDate.getFullYear() - (6 > currentDate.getMonth() ? 1 : 0), 11, 25)
                ) / 20736e5
            );
        if (snowAmount) {
            let snowCanvas = document.createElement("canvas");
            snowCanvas.style.position = "absolute";
            snowCanvas.style.top = "0";
            document.body.insertBefore(snowCanvas, document.body.firstChild);
            let b = snowCanvas.getContext("2d"),
            snows = [],
            updateSnow = () => {
                snowCanvas.width !== window.innerWidth && (snowCanvas.width = window.innerWidth);
                snowCanvas.height !== window.innerHeight && (snowCanvas.height = window.innerHeight);
                b.clearRect(0, 0, snowCanvas.width, snowCanvas.height);
                b.fillStyle = "#FFFFFF";
                for (let snow of snows) {
                snow.x += 5 / snow.speed + Math.random();
                snow.y += 12.5 / snow.speed + Math.random();
                let fade = 2 * Math.min(0.4, 1 - snow.y / snowCanvas.height);
                0 < fade
                    ? ((b.globalAlpha = fade),
                    b.beginPath(),
                    b.arc(snow.x, snow.y, snow.speed, 0, 2 * Math.PI),
                    b.fill())
                    : (snow.vanished = true);
                }
                0.001 * snowCanvas.width * snowAmount > Math.random() &&
                snows.push({
                    x: snowCanvas.width * (1.5 * Math.random() - 0.5),
                    y: -50 - 100 * Math.random(),
                    speed: 2 + Math.random() * Math.random() * 7,
                });
                if (global.gameStart) snowCanvas.remove();
                else requestAnimationFrame(updateSnow);
            };
            setInterval(() => {
                snows = snows.filter((g) => !g.vanished);
            }, 2e3);
            updateSnow();
        }
        // Firework event for new year
            let Gd = "en-US" === navigator.language && -7 <= global.timezoneLocation && -4 >= global.timezoneLocation,
            Hd = 6 === currentDate.getMonth() && 4 === currentDate.getDate(),
            Id =
            (11 === currentDate.getMonth() && 31 === currentDate.getDate()) ||
            (0 === currentDate.getMonth() && 3 >= currentDate.getDate());
        if (!global.mobile && ((Hd && Gd) || Id)) {
            let fireworkCanvas = document.createElement("canvas");
            fireworkCanvas.style.position = "absolute";
            fireworkCanvas.style.top = "0";
            document.body.insertBefore(fireworkCanvas, document.body.firstChild);
            let b = fireworkCanvas.getContext("2d"),
            d = () => {
                let k =
                "164,14,14 230,80,0 230,119,0 47,127,51 23,78,166 123,31,163".split(
                    " "
                );
                return k[Math.floor(Math.random() * k.length)];
            },
            fireworks = [],
            updateFireworks = () => {
                if (fireworkCanvas.width !== window.innerWidth || fireworkCanvas.height !== window.innerHeight)
                (fireworkCanvas.width = window.innerWidth),
                    (fireworkCanvas.height = window.innerHeight),
                    (fireworks = []),
                    b.clearRect(0, 0, fireworkCanvas.width, fireworkCanvas.height),
                    (b.fillStyle = "rgba(255,255,255,0.01)"),
                    b.fillRect(0, 0, fireworkCanvas.width, fireworkCanvas.height),
                    (b.lineWidth = 2.5),
                    (b.lineCap = "round");
                b.globalCompositeOperation = "destination-out";
                b.fillStyle = "rgba(0,0,0,0.15)";
                b.fillRect(0, 0, fireworkCanvas.width, fireworkCanvas.height);
                b.globalCompositeOperation = "lighter";
                for (var firework of fireworks) {
                    var l = firework.x,
                        t = firework.y;
                    firework.H += 0.2;
                    firework.x += firework.M;
                    firework.y += firework.H;
                    firework.H *= 0.99;
                    firework.M *= 0.99;
                    firework.time--;
                    var f = 0 < firework.time ? (firework.Oa ? 1 : 10 <= firework.time ? 1 : firework.time / 10) : 0;
                    if (0 < f) {
                        b.strokeStyle = `rgba(${firework.color},${f})`;
                        b.beginPath();
                        b.moveTo(l, t);
                        b.lineTo(firework.x, firework.y);
                        b.stroke();
                    } else {
                        if (firework.Oa && !firework.vanished) {
                            l = Math.floor(5 * Math.random()) + 30;
                            t = 0.5 * Math.random() + 3;
                            f = 25 + 5 * Math.random();
                            for (var h = 0; 2 > h; h++) {
                                let p = d();
                                for (let r = 0; r < l; r++) {
                                let v = ((r + Math.random()) / l) * Math.PI * 2,
                                    P = t + 0.5 * Math.random();
                                fireworks.push({
                                    color: p,
                                    x: firework.x,
                                    y: firework.y,
                                    M: Math.cos(v) * P,
                                    H: -0.8 + Math.sin(v) * P,
                                    time: f + 2 * Math.random(),
                                    Oa: false,
                                    vanished: false,
                                });
                                }
                            }
                        }
                        firework.vanished = true;
                    }
                }
                3e-5 * fireworkCanvas.width > Math.random() &&
                ((firework = fireworkCanvas.width * Math.random()),
                (l = fireworkCanvas.height - 10),
                (t = 4 * Math.random() - 2),
                (f = 5 * Math.random() - 15),
                (h = 30 + 10 * Math.random()),
                fireworks.push({
                    color: d(),
                    x: firework,
                    y: l,
                    M: t,
                    H: f,
                    time: h,
                    Oa: true,
                    vanished: false,
                }));
                if (global.gameStart) a.remove();
                else requestAnimationFrame(updateFireworks);
            };
            setInterval(() => {
                fireworks = fireworks.filter((k) => !k.vanished);
            }, 2e3);
            updateFireworks();
        }
    }

    // Important functions
    tabOptionsMenuSwitcher();
    tabControlsMenuSwitcher();
    tabSandboxControlsMenuSwitcher();
    customThemeDisplayHandler();
    snowAndFireworkEffects();

    // Prepare canvas
    function resizeEvent() {
        let scale = window.devicePixelRatio;
        if (config.graphical.lowResolution) {
            scale *= 0.5;
        }
        global.screenWidth = global.vscreenSize = window.innerWidth * scale;
        global.screenHeight = global.vscreenSizey = window.innerHeight * scale;
        c.resize(global.screenWidth, global.screenHeight);
        global.ratio = scale;
        global.screenSize = Math.min(1920, Math.max(window.innerWidth, 1280));
    }

    window.resizeEvent = resizeEvent;
    global.canvas = new Canvas();
    var c = global.canvas.cv;
    var fullScreenWidth = global.screenWidth, fullScreenHeight = global.screenHeight;
    var ctx = [
        document.getElementById("gameCanvas-background").getContext("2d"),
        document.getElementById("gameCanvas-gameplay").getContext("2d"),
        document.getElementById("gameCanvas-gui").getContext("2d"),
    ];
    var c2 = document.createElement("canvas");
    var ctx2 = c2.getContext("2d");
    ctx2.imageSmoothingEnabled = false;

    // Animation things
    function Smoothbar(value, speed, sharpness = 3, lerpValue = 0.025, syncWithfps = false) {
        let time = Date.now();
        let display = value;
        let oldvalue = value;
        return {
            set: (val) => {
                if (value !== val) {
                    oldvalue = display;
                    value = val;
                    time = Date.now();
                }
            },
            get: (round = false) => {
                display = util.lerp(display, value, lerpValue, syncWithfps);
                if (Math.abs(value - display) < 0.1 && round) display = value;
                return display;
            },
            force: (val) => {
                display = value = val;
            },
        };
    };

    function AdvancedSmoothBar(a, b, d = 3) {
        let value = a;
        let speed = b;
        let h = d;
        let time = Date.now();
        let display;
        let S = display = a;
        let set = (a) => {
            value !== a &&
                ((S = get()), (value = a), (time = Date.now()));
        };
        let get = () => {
            let a = (Date.now() - time) / 1e3;
            return (display =
                a >= speed ? value : S + (value - S) * Math.pow(a / speed, 1 / h));
        };
        return {
            set: (a) => set(a),
            get: () => get(),
            force: (val) => {
                display = value = val;
            },
        }
    };

    // Prepare the player
    global.player = global.initPlayer();
    function calculateTarget() {
        if (!global.canvas.mouseMoved) return;
        global.target.x = global.mouse.x - (global.player.screenx / global.screenWidth * global.canvas.width + global.canvas.width / 2);
        global.target.y = global.mouse.y - (global.player.screeny / global.screenHeight * global.canvas.height + global.canvas.height / 2);
        if (global.canvas.reverseDirection) global.reverseTank = -1;
        else global.reverseTank = 1;
        global.target.x *= global.screenWidth / global.canvas.width;
        global.target.y *= global.screenHeight / global.canvas.height;
        return global.target;
    };

    let CalcScreenSize = () => Math.max(global.vscreenSize, (16 / 9) * global.vscreenSizey) / global.player.renderv,
        handleScreenDistance = (alpha, instance, fade = true) => {
            let indexes = instance.index.split("-"),
            m = global.mockups[parseInt(indexes[0])] ?? global.missingno[0];
            switch (fade) {
                case true:
                    GetScreenDistance(instance.render.x - global.player.loc.x, instance.render.y - global.player.loc.y, instance.size) ||
                    (alpha *= GetScreenDistanceF(instance.render.x - global.player.loc.x, instance.size));
                    (alpha *= GetScreenDistanceV(instance.render.y - global.player.loc.y, instance.size));
                    break;
                case false:
                    let size = instance.size;
                    size *= m.position.axis;
                    let realSize = size.toFixed(0);
                    alpha *= GetScreenDistance(instance.render.x - global.player.loc.x, instance.render.y - global.player.loc.y, parseInt(realSize));
                    break;
            }
            return alpha;
        },
        GetScreenDistance = (a, b, d) => {
            d += 6;
            let e = 2 * CalcScreenSize();
            return (
                (a + d) * e > -global.vscreenSize &&
                (a - d) * e < global.vscreenSize &&
                (b + d) * e > -global.vscreenSizey &&
                (b - d) * e < global.vscreenSizey
            );
        },
        GetScreenDistanceF = (a, b) => {
            b += 6;
            let d = 2 * CalcScreenSize();
            return Math.max(
                0,
                Math.min(1, 2 + (-a + global.vscreenSize / d) / b, 2 + (a + global.vscreenSize / d) / b)
            );
        },
        GetScreenDistanceV = (a, b) => {
            b += 6;
            let d = 2 * CalcScreenSize();
            return Math.max(
                0,
                Math.min(1, 2 + (a + global.vscreenSizey / d) / b, 2 + (-a + global.vscreenSizey / d) / b)
            );
        };

    function parseThemeV1(string) {
        const data = atob(string.replace(/\s+/g, "").replace(/-/g, "+").replace(/_/g, "/"));
        if (!data.startsWith(THEME_V1_MAGIC)) return null;
        let off = 5;
        if (data.charCodeAt(off++) !== 1) return null;
        const nameLen = data.charCodeAt(off++);
        const name = data.slice(off, off + nameLen) || "Unknown Theme";
        off += nameLen;
        const authorLen = data.charCodeAt(off++);
        const author = data.slice(off, off + authorLen);
        off += authorLen;
        const tableLen = data.charCodeAt(off++);
        const table = [];
        for (let i = 0; i < tableLen; i++) {
            table.push((data.charCodeAt(off) << 16) | (data.charCodeAt(off + 1) << 8) | data.charCodeAt(off + 2));
            off += 3;
        }
        const specialLen = data.charCodeAt(off++);
        const special = [];
        for (let i = 0; i < specialLen; i++) {
            special.push((data.charCodeAt(off) << 16) | (data.charCodeAt(off + 1) << 8) | data.charCodeAt(off + 2));
            off += 3;
        }
        const border = data.charCodeAt(off++) / 0xff;
        const neon = data.charCodeAt(off) === 1;
        if (!table.length) return null;
        const content = { paletteSize: table.length, border, neon };
        THEME_PALETTE_KEYS.forEach((key, i) => {
            if (i < table.length) content[key] = "#" + (table[i] & 0xffffff).toString(16).padStart(6, "0");
        });
        return { name, author, content };
    }

    function parseTheme(string, logError = true) {
        try {
            const v1 = parseThemeV1(string);
            if (v1) return v1;
        } catch { }
        // Decode from base64
        try {
            var stripped = string.replace(/\s+/g, "");
            2 == stripped.length % 4 ? (stripped += "==") : 3 == stripped.length % 4 && (stripped += "=");
            let data = atob(stripped);
            let name = "Unknown Theme",
                author = "";
            let index = data.indexOf("\x00");
            if (index === -1) return null;
            name = data.slice(0, index) || name;
            data = data.slice(index + 1);
            index = data.indexOf("\x00");
            if (index === -1) return null;
            author = data.slice(0, index) || author;
            data = data.slice(index + 1);
            let border = data.charCodeAt(0) / 0xff;
            data = data.slice(1);
            let paletteSize = Math.floor(data.length / 3);
            if (paletteSize < 2) return null;
            let colorArray = [];
            for (let i = 0; i < paletteSize; i++) {
                let red = data.charCodeAt(i * 3)
                let green = data.charCodeAt(i * 3 + 1)
                let blue = data.charCodeAt(i * 3 + 2)
                let color = (red << 16) | (green << 8) | blue
                colorArray.push("#" + color.toString(16).padStart(6, "0"))
            }
            let content = {
                teal: colorArray[0],
                lgreen: colorArray[1],
                orange: colorArray[2],
                yellow: colorArray[3],
                aqua: colorArray[4],
                pink: colorArray[5],
                vlgrey: colorArray[6],
                lgrey: colorArray[7],
                guiwhite: colorArray[8],
                black: colorArray[9],

                blue: colorArray[10],
                green: colorArray[11],
                red: colorArray[12],
                gold: colorArray[13],
                purple: colorArray[14],
                magenta: colorArray[15],
                grey: colorArray[16],
                dgrey: colorArray[17],
                white: colorArray[18],
                guiblack: colorArray[19],

                paletteSize,
                border,
            }
            return { name, author, content };
        } catch { }
        // Decode from JSON
        try {
            let output = JSON.parse(string);
            if (typeof output !== "object")
                return null;
            let { name = "Unknown Theme", author = "", content } = output;
            for (let colorHex of [
                content.teal,
                content.lgreen,
                content.orange,
                content.yellow,
                content.aqua,
                content.lavender,
                content.pink,
                content.vlgrey,
                content.lgrey,
                content.guiwhite,
                content.black,

                content.blue,
                content.green,
                content.red,
                content.gold,
                content.purple,
                content.magenta,
                content.grey,
                content.dgrey,
                content.white,
                content.guiblack,
            ]) {
                if (!/^#[0-9a-fA-F]{6}$/.test(colorHex)) {
                    if (!content.aqua) { // old themes don't have aqua, so just warn the user
                        alert("Your theme does not an entry for \"aqua\" (the color used by Hexagons). A fallback has been provided.");
                        content.aqua = content.teal;
                    } else if (!content.lavender) { // same for lavender.
                        alert("Your theme does not an entry for \"lavender\" (the color used by the nest). A fallback has been provided.");
                        content.lavender = "#b58efd";
                    } else {
                        if (logError) {
                            throw new Error("Unable to read the theme");
                        } else return {
                            name: "Unknown Theme",
                            author: "?",
                            content: null,
                        }
                    }
                };
            }
            return {
                name: (typeof name === "string" && name) || "Unnamed Theme",
                author: (typeof author === "string" && author) || "",
                content,
            }
        } catch (e) { logError && alert("An error has accoured while reading your theme, it may be corrupted or outdated."); }

        return {
            name: "Unknown Theme",
            author: "?",
            content: null,
        };
    }
    function getThemeDisplayName(doc) {
        if (doc.value !== "") {
            let {name, author, content} = parseTheme(doc.value);
            if (content !== null) {
                let displayName = name;
                let displayAuthor = author === "" ? "" : author === "fan-made" || author === "Fan-made" || author === "Fan-Made" ? "(Fan-Made)" : `(by ${author})`;
                return {
                    name: displayName,
                    author: displayAuthor
                }
            }
        } else return {
            name: null,
            author: null,
        }
    }
    function addChangelog(b, a = null) { // From CX Client (Modified) + decoded;
        let triggerChangelog = ( () => {
            let a = document.getElementById("changelogTabs")
            , b = a.firstElementChild
            , d = document.getElementById("patchNotes")
            , e = {};
            for (let g = 0; g < a.children.length; g++) {
                let k = a.children[g]
                , l = k.dataset.type;
                e[l] = () => {
                    if (k !== b) {
                        var u = b.dataset.type;
                        b.classList.remove("active");
                        k.classList.add("active");
                        d.classList.remove(u);
                        d.classList.add(l);
                        b = k
                    }
                }
                ;
                k.addEventListener("click", e[l])
            }
            return e
        }
        )()
        var sa = document.getElementById("patchNotes");
        var c = b[0];
        if (c) {
            let s = 0;
            c = c.match(/^([A-Za-z ]+[A-Za-z])\s*\[([0-9\-]+)\]\s*(.+)?$/) || [
                c,
                c,
                null,
            ];
            var h = c[1] ? {
                    "Announcement": "announcement",
                    "Balance": "balance",
                    "Balance Update": "balance-update",
                    "Balance Update Details": "balance",
                    "Event": "event",
                    "Event Poll": "poll",
                    "Gamemode": "event",
                    "Gamemode Poll": "poll",
                    "Patch": "patch",
                    "Poll": "poll",
                    "Update": "update",
                } [c[1]] : null,
                d = document.createElement("div");
            h && d.classList.add(h);
            var y = document.createElement("b"),
                f = [c[1]];
            if (c[2]) {
                var e = +new Date(c[2] + "T00:00:00Z") + 252e5;
                if (null != a && e + a < Date.now()) return !1;
                f.push(new Date(e).toLocaleDateString("default", {
                    year: "numeric",
                    month: "long",
                    day: "numeric",
                    timeZone: "UTC"
                }))
            }
            if (c[1]) s = 1;
            c[3] && f.push(c[3]);
            y.innerHTML = f.join(" - ");
            d.appendChild(y);
            let g = document.createElement("ul");
            let l;
            for (let n of b.slice(s)) l = document.createElement("li"), l.innerHTML = n, g.appendChild(l);
            l = g.getElementsByTagName("a");
            for (a = 0; a < l.length; a++) {
                let u = l[a];
                if (!u.href) continue;
                let p = u.href.lastIndexOf("#");
                -1 !== p && (p = u.href.slice(p + 1),
                "options-menu" === p ? h[a].addEventListener("click", r => {
                    r.preventDefault();
                    tc()
                }
                ) : triggerChangelog[p] && h[a].addEventListener("click", r => {
                    r.preventDefault();
                    triggerChangelog[p]()
                }
                ))
            }
            d.appendChild(g)
            a && d.appendChild(document.createElement("hr"));
            sa.appendChild(d)

            return d;
        } else return true
    }

    function loadSettings() {
        config.graphical.fancyAnimations = document.getElementById("optFancy").checked;
        config.graphical.interpolation = document.getElementById("optInterpolation").checked;
        config.graphical.lerpAnimations = document.getElementById("optLerpAnim").checked;
        config.graphical.smoothcamera = document.getElementById("smoothCamera").checked;
        config.graphical.pointy = document.getElementById("optPointy").checked;
        config.graphical.curvyTraps = document.getElementById("optCurvyTraps").checked;
        config.game.autoLevelUp = document.getElementById("autoLevelUp").checked;
        config.game.centeredMinimap = document.getElementById("optCenterMinimap").checked;
        config.lag.unresponsive = document.getElementById("optPredictive").checked;
        config.graphical.sharpEdges = document.getElementById("optSharpEdges").checked;
        config.graphical.renderSkins = document.getElementById("optTankSkins").checked;
        config.graphical.coloredHealthbars = document.getElementById("coloredHealthbars").checked;
        config.graphical.separatedHealthbars = document.getElementById("separatedHealthbars").checked;
        config.graphical.lowResolution = document.getElementById("optLowResolution").checked;
        config.graphical.force169AspectRatio = localStorage.getItem("optForce169AspectRatioChecked") === "true";
        config.graphical.showGrid = !document.getElementById("optNoGrid").checked;
        config.graphical.hexaGrid = document.getElementById("optHexaGrid").checked;
        config.graphical.coloredNest = document.getElementById("optColoredNest").checked;
        config.graphical.slowerFOV = document.getElementById("optSlowerFOV").checked;
        config.graphical.optimizeMode = document.getElementById("optOptimizeMode").checked;
        // GUI
        global.GUIStatus.renderGUI = document.getElementById("optRenderGui").checked;
        global.GUIStatus.renderLeaderboard = document.getElementById("optRenderLeaderboard").checked;
        global.GUIStatus.renderUpgrades = document.getElementById("optRenderUpgrades").checked;
        global.GUIStatus.renderMinimap = document.getElementById("optRenderMinimap").checked;
        global.GUIStatus.renderPlayerNames = document.getElementById("optRenderNames").checked;
        global.GUIStatus.renderPlayerScores = document.getElementById("optRenderScores").checked;
        global.GUIStatus.renderPlayerBars = document.getElementById("optRenderPlayerBars").checked;
        global.GUIStatus.renderPlayerKillbar = document.getElementById("optRenderKillbar").checked;
        global.GUIStatus.renderhealth = document.getElementById("optRenderHealth").checked;
        global.GUIStatus.minimapReducedInfo = document.getElementById("optReducedInfo").checked;
        global.GUIStatus.fullHDMode = document.getElementById("optFullHD").checked;
        global.GUIStatus.renderIngameOptions = document.getElementById("optAllowIngameOptions").checked;
        global.GUIStatus.renderChatMessages = localStorage.getItem("optChatMessagesChecked") !== "false";
        config.game.autoReconnect = localStorage.getItem("optAutoReconnectChecked") === "true";
        global.mobileStatus.enableCrosshair = document.getElementById("showCrosshair").checked;
        global.mobileStatus.showJoysticks = document.getElementById("showJoystick").checked;
        config.graphical.oldUIStyle = document.getElementById("optOldUiStyle").checked;
        // Game
        config.game.incognitoMode = document.getElementById("optIncognitoMode").checked;
        config.game.deltaEntities = document.getElementById("optDeltaEntities").checked;
        switch (document.getElementById("optBorders").value) {
            case "normal":
                config.graphical.darkBorders = config.graphical.neon = false;
                break;
            case "dark":
                config.graphical.darkBorders = true;
                config.graphical.neon = false;
                break;
            case "glass":
                config.graphical.darkBorders = false;
                config.graphical.neon = true;
                break;
            case "neon":
                config.graphical.darkBorders = config.graphical.neon = true;
                break;
        }
        switch (document.getElementById("optMobile").value) {
            case "desktop":
                global.mobile = false;
                break;
            case "mobileWithBigJoysticks":
                global.mobileStatus.useBigJoysticks = true;
                break;
        }
        global.autoScale = false;
        switch (document.getElementById("optUiScale").value) {
            case "auto":
                global.autoScale = true;
                break;
            case "small":
                global.UIscale = 2560;
                break;
            case "normal":
                global.UIscale = 1920;
                break;
            case "large":
                global.UIscale = 1536;
                break;
            case "mobile":
                global.UIscale = 1280;
                break;
        }
        global.refreshSecretThemes();
        util.submitToLocalStorage("optColors");
        let a = document.getElementById("optColors").value;
        color = colors[a === "" ? "normal" : a];
        if (a == "custom") {
            let customTheme = document.getElementById("optCustom").value;
            color = Object.assign({}, colors.normal, parseTheme(customTheme).content);
            util.submitToLocalStorage("optCustom");
        }
        if (color.neon) config.graphical.neon = true;
        gameDraw.color = color;
        gameDraw.colorCache = {};
        global.refreshMonitorColoring(gameDraw);
        themeVersion++;
        if (global.menu) global.menu.refresh();
    }

    function startGame() {
        // Set flag
        if (global.gameLoading) return;
        global.gameLoading = true;
        if (global.mobile) {
            var d = document.body;
            d.requestFullscreen ? d.requestFullscreen()
                : d.msRequestFullscreen ? d.msRequestFullscreen()
                    : d.mozRequestFullScreen ? d.mozRequestFullScreen()
                        : d.webkitRequestFullscreen && d.webkitRequestFullscreen();
        }

        // Save forms and get options
        util.submitToLocalStorage("optFancy");
        util.submitToLocalStorage("optLowResolution");
        util.submitToLocalStorage("smoothCamera");
        util.submitToLocalStorage("optBorders");
        util.submitToLocalStorage("optPointy");
        util.submitToLocalStorage("optCurvyTraps");
        util.submitToLocalStorage("optInterpolation");
        util.submitToLocalStorage("optLerpAnim");
        util.submitToLocalStorage("optOptimizeMode");
        util.submitToLocalStorage("optCenterMinimap");
        util.submitToLocalStorage("autoLevelUp");
        util.submitToLocalStorage("optMobile");
        util.submitToLocalStorage("optPredictive");
        util.submitToLocalStorage("optSharpEdges");
        util.submitToLocalStorage("optSlowerFOV");
        util.submitToLocalStorage("optRenderKillbar");
        util.submitToLocalStorage("coloredHealthbars");
        util.submitToLocalStorage("separatedHealthbars");
        util.submitToLocalStorage("optColoredNest");
        util.submitToLocalStorage("optNoGrid");
        util.submitToLocalStorage("optHexaGrid");
        // GUI
        util.submitToLocalStorage("optRenderGui");
        util.submitToLocalStorage("optRenderLeaderboard");
        util.submitToLocalStorage("optRenderUpgrades");
        util.submitToLocalStorage("optRenderMinimap");
        util.submitToLocalStorage("optRenderNames");
        util.submitToLocalStorage("optRenderHealth");
        util.submitToLocalStorage("optRenderScores");
        util.submitToLocalStorage("optRenderPlayerBars");
        util.submitToLocalStorage("optReducedInfo");
        util.submitToLocalStorage("showCrosshair");
        util.submitToLocalStorage("showJoystick");
        util.submitToLocalStorage("optFullHD");
        util.submitToLocalStorage("optUiScale");
        util.submitToLocalStorage("optNames");
        util.submitToLocalStorage("optCanvas");
        util.submitToLocalStorage("optAllowIngameOptions");
        util.submitToLocalStorage("optOldUiStyle");
        // Game
        util.submitToLocalStorage("optIncognitoMode");
        util.submitToLocalStorage("optDeltaEntities");
        loadSettings();
        // Other more important stuff
        let optName = document.getElementById("optName");
        let playerKeyInput = document.getElementById("playerKeyInput");
        let autolevelUpInput = document.getElementById("autoLevelUp").checked;
        global.autolvlUp = autolevelUpInput;
        // Name and keys
        util.submitToLocalStorage("optName");
        util.submitToLocalStorage("playerKeyInput");
        global.playerName = global.player.name = optName.value;
        global.playerKey = playerKeyInput.value.replace(/(<([^>]+)>)/gi, "").substring(0, 64);
        // Change the screen
        global.screenWidth = window.innerWidth;
        global.screenHeight = window.innerHeight;
        document.getElementById("startMenuWrapper").style.top = "-700px";
        setTimeout(() => {
            document.getElementById("startMenuWrapper").style.display = "none";
        }, 1e3);

        global.gameConnecting = true;
        // Connect to the server.
        global.socket = socketInit();
        // initialize canvas.
        global.canvas.socket = global.socket;
        global.socketMotionCycle = setInterval(() => moveCompensation.iterate(global.socket.cmd.getMotion()), 1e3 / 40);
        if (!global.playerTotalInterval) global.playerTotalInterval = setInterval(() => util.pullTotalPlayers(), 20000);
        if (!global.canvas.initalized) global.canvas.init();
        document.getElementById("gameAreaWrapper").style.display = "block";
        document.getElementById("gameCanvas").focus();
        window.onbeforeunload = () => (global.gameStart && !global.died && !global.disconnected ? true : null);
        // Start client if it didnt start yet
        !global.clientStarted && startClient();
    }
    global.startGame = () => startGame();
    function startClient() {
        animloop(); // Start the client
        global.clientStarted = true; // Set flag
    }

    // Start animation
    window.requestAnimFrame = window.requestAnimationFrame || window.webkitRequestAnimationFrame || window.mozRequestAnimationFrame || window.msRequestAnimationFrame || (callback => setTimeout(callback, 1000 / 60));
    window.cancelAnimFrame = window.cancelAnimationFrame || window.mozCancelAnimationFrame;
    // Drawing states
    const statMenu = Smoothbar(0, 2, 0.1, 0.08, 0.025, true);
    const upgradeMenu = Smoothbar(0, 2, 3, 0.08, 0.025, true);
    const mobileUpgradeGlide = Smoothbar(0, 2, 3, 0.08, 0.025, true);
    let skillMenuShown = 0,
        skillMenuTime = 0;
    const chatInput = Smoothbar(0, 2, 0.1, 0.07, 0.025, true);

    // Define the graph constructor
    function graph() {
        var data = [];
        return (point, x, y, w, h, col) => {
            // Add point and push off old ones
            data.push(point);
            while (data.length > w) {
                data.splice(0, 1);
            }
            // Get scale
            let min = Math.min(...data),
                max = Math.max(...data),
                range = max - min;
            // Draw zero
            if (max > 0 && min < 0) {
                drawBar(x, x + w, y + (h * max) / range, 2, color.guiwhite);
            }
            // Draw points
            ctx[2].beginPath();
            let i = -1;
            for (let p of data) {
                if (!++i) {
                    ctx[2].moveTo(x, y + (h * (max - p)) / range);
                } else {
                    ctx[2].lineTo(x + i, y + (h * (max - p)) / range);
                }
            }
            ctx[2].lineWidth = 1;
            ctx[2].strokeStyle = col;
            ctx[2].stroke();
        };
    }

    // Protected functions
    function interpolate(p1, p2, v1, v2, ts, tt) {
        let k = Math.cos((1 + tt) * Math.PI);
        return 0.5 * (((1 + tt) * v1 + p1) * (k + 1) + (-tt * v2 + p2) * (1 - k));
    }

    function extrapolate(p1, p2, v1, v2, ts, tt) {
        return p2 + (p2 - p1) * tt;
    }

    // Useful thing
    let modulo = function (a, n) {
        return ((a % n) + n) % n;
    };
    function angleDifference(sourceA, targetA) {
        let a = targetA - sourceA;
        return modulo(a + Math.PI, 2 * Math.PI) - Math.PI;
    }

    // Lag compensation functions
    const compensation = () => {
        // Protected vars
        let t = 0,
            tt = 0,
            ts = 0;
        // Methods
        return {
            set: (
                time = global.player.time,
                interval = global.metrics.rendergap
            ) => {
                t = Math.max(getNow() - time - 80, -interval);
                if (t > 150 && t < 1000) {
                    t = 150;
                }
                if (t > 1000) {
                    t = (1000 * 1000 * Math.sin(t / 1000 - 1)) / t + 1000;
                }
                tt = t / interval;
                ts = 30 * config.roomSpeed * t / 1E3;
            },
            predict: (p1, p2, v1, v2) => {
                return t >= 0
                    ? extrapolate(p1, p2, v1, v2, ts, tt)
                    : interpolate(p1, p2, v1, v2, ts, tt);
            },
            predictFacing: (f1, f2) => {
                return f1 + (1 + tt) * angleDifference(f1, f2);
            },
            getPrediction: () => {
                return t;
            },
        };
    };

    // Make graphs
    const timingGraph = graph(),
        lagGraph = graph(),
        gapGraph = graph();

    // The skill bar dividers
    let skas = [];
    for (let i = 1; i <= 256; i++) { //if you want to have more skill levels than 255, then update this
        skas.push((i - 2) * 0.01 + Math.log(4 * (i / 9) + 1) / 1.513);
    }
    const ska = (x) => skas[x];

    function truncateKeybind(key) {
        if (key.startsWith("Alt")) return "⎇";
        if (key.startsWith("Control")) return "⎈";
        if (key.startsWith("Meta")) return "⌘";
        if (key.startsWith("Shift")) return "⇧";
        if (key.endsWith("Backslash")) return "\\";
        if (key.endsWith("Equal")) return "=";

        const map = {
            ArrowDown: "↓",
            ArrowLeft: "←",
            ArrowRight: "→",
            ArrowUp: "↑",
            Backquote: "`",
            Backspace: "⌫",
            BracketLeft: "[",
            BracketRight: "]",
            CapsLock: "⇪",
            Comma: ",",
            Delete: "⌦",
            End: "⇲",
            Enter: "↵",
            Escape: "⎋",
            Home: "⇱",
            Insert: "⎀",
            Minus: "-",
            NumLock: "⇭",
            NumpadAdd: "+",
            NumpadDecimal: ".",
            NumpadDivide: "/",
            NumpadEnter: "⌅",
            NumpadMultiply: "*",
            NumpadSubtract: "-",
            PageDown: "⇟",
            PageUp: "⇞",
            Pause: "⎊",
            Period: ".",
            PrintScreen: "⎙",
            Quote: "'",
            ScrollLock: "⤓",
            Semicolon: ";",
            Slash: "/",
            Space: "␣",
            Tab: "↹",
        };
        return map[key];
    };
    function getKeybind(keybind) {
        const key = global[keybind];

        // Remove undefined keys
        if (key == -1 || key == undefined || key.toLowerCase() === "undefined" || key.toLowerCase() === "unidentified") return null;

        // Truncate common keycodes
        if (key.startsWith("F") && key.length <= 3) return key;
        if (key.startsWith("Key") && key.length === 4) return config.graphical.oldUIStyle ? key[3].toLowerCase() : key[3]
        if (key.startsWith("Digit") && key.length === 6) return key[5];
        if (key.startsWith("Numpad") && key.length === 7) return key[6];

        // Return the raw keycode if it doesn't need to be truncated
        return truncateKeybind(key);
    };

    // Background clearing
    function clearScreen(clearColor, alpha, context) {
        context.fillStyle = clearColor;
        context.globalAlpha = alpha;
        context.fillRect(0, 0, global.screenWidth, global.screenHeight);
        context.globalAlpha = 1;
    }

    // Text functions
    const fontWidth = "bold";
    function measureText(text, fontSize, withHeight = false) {
        fontSize += config.graphical.fontSizeBoost;
        ctx[2].font = fontWidth + " " + fontSize + "px Ubuntu";
        let measurement = ctx[2].measureText(arrayifyText(text).reduce((a, b, i) => (i & 1) ? a : a + b, ""));
        return withHeight ? { width: measurement.width, height: fontSize } : measurement.width;
    }

    // Init stuff
    function arrayifyText(rawText) {
        //we want people to be able to use the section sign in writing too
        // string with double §           txt   col   txt                      txt
        // "...§text§§text§..." => [..., "text", "", "text", ...] => [..., "text§text", ...]
        // this code is balanced on tight threads, holy shit
        let textArrayRaw = rawText.split("§"),
            textArray = [];
        if (!(textArrayRaw.length & 1)) {
            textArrayRaw.unshift("");
        }
        while (textArrayRaw.length) {
            let first = textArrayRaw.shift();
            if (!textArrayRaw.length) {
                textArray.push(first);
            } else if (textArrayRaw[1]) {
                textArray.push(first, textArrayRaw.shift());
            } else {
                textArrayRaw.shift();
                textArray.push(first + "§" + textArrayRaw.shift(), textArrayRaw.shift());
            }
        }
        return textArray;
    }

    function drawText(rawText, x, y, size, defaultFillStyle, align = "left", center = false, fade = 1, stroke = true, context = ctx[2]) {
        let lines = ("" + rawText).split(/\r?\n/);
        if (lines.length > 1) {
            let s = size + config.graphical.fontSizeBoost,
                lineHeight = s + 2 * (s / 5);
            for (let l = 0; l < lines.length; l++) {
                drawText(lines[l], x, y + l * lineHeight, size, defaultFillStyle, align, center, fade, stroke, context);
            }
            return;
        }
        size += config.graphical.fontSizeBoost;
        // Get text dimensions and resize/reset the canvas
        let offset = size / 5,
            ratio = 1,
            textArray = arrayifyText(rawText),
            renderedFullText = textArray.reduce((a, b, i) => (i & 1) ? a : a + b, "");

        if (ratio !== 1) {
            size *= ratio;
        }
        context.font = "bold " + size + "px Ubuntu";

        let Xoffset = offset,
            Yoffset = (size + 2 * offset) / 2,
            alignMultiplier = 0;

        switch (align) {
            //case "left":
            //    //do nothing.
            //    break;
            case "center":
                alignMultiplier = 0.5;
                break;
            case "right":
                alignMultiplier = 1;
        }
        if (alignMultiplier) {
            Xoffset -= context.measureText(renderedFullText).width * alignMultiplier;
        }

        // Draw it
        let strokeRatio = typeof stroke === "number" ? stroke : config.graphical.fontStrokeRatio;
        context.lineWidth = (size + 1) / strokeRatio;
        context.textAlign = "left";
        context.textBaseline = "middle";
        context.strokeStyle = color.black;
        context.fillStyle = defaultFillStyle;
        context.save();
        context.lineCap = "round";
        context.lineJoin = "round";
        if (ratio !== 1) {
            context.scale(1 / ratio, 1 / ratio);
        }

        Xoffset += x * ratio - size / 4; //this extra size-dependant margin is a guess lol // apparently this guess worked out to be a hella good one
        Yoffset += y * ratio - Yoffset * (center ? 1.05 : 1.5);
        if (stroke) {
            context.strokeText(renderedFullText, Xoffset, Yoffset);
        }
        for (let i = 0; i < textArray.length; i++) {
            let str = textArray[i];

            // odd index = this is a color to set the fill style to
            if (i & 1) {

                //reset color to default
                if (str === "reset") {
                    context.fillStyle = defaultFillStyle;
                } else {
                    str = gameDraw.getColor(str) ?? str;
                }
                context.fillStyle = str;

            } else {
                // move forward a bit taking the width of the last piece of text + "kerning" between
                // the last letter of last text and the first letter of current text,
                // making it align perfectly with what we drew with strokeText earlier
                if (i) {
                    Xoffset += context.measureText(textArray[i - 2] + str).width - context.measureText(str).width;
                }
                context.fillText(str, Xoffset, Yoffset);
            }
        }
        context.restore();
    }

    // Gui drawing functions
    function scaleScreenRatio(by, unset) {
        global.screenWidth /= by;
        global.screenHeight /= by;
        ctx[0].scale(by, by);
        ctx[1].scale(by, by);
        ctx[2].scale(by, by);
        if (!unset) ratio *= by;
    };

    function drawGuiRect(x, y, length, height, stroke = false) {
        switch (stroke) {
            case true:
                ctx[2].strokeRect(x, y, length, height);
                break;
            case false:
                ctx[2].fillRect(x, y, length, height);
                break;
        }
    }

    function drawGuiCircle(x, y, radius, stroke = false) {
        ctx[2].beginPath();
        ctx[2].arc(x, y, radius, 0, Math.PI * 2);
        stroke ? ctx[2].stroke() : ctx[2].fill();
    }

    function drawGuiLine(x1, y1, x2, y2) {
        ctx[2].beginPath();
        ctx[2].lineTo(Math.round(x1) + 0.5, Math.round(y1) + 0.5);
        ctx[2].lineTo(Math.round(x2) + 0.5, Math.round(y2) + 0.5);
        ctx[2].closePath();
        ctx[2].stroke();
    }

    function drawBar(x1, x2, y, width, color, context = ctx[2]) {
        context.beginPath();
        context.lineCap = "round";
        context.lineWidth = width;
        if (color) context.strokeStyle = color;
        context.moveTo(x1, y);
        context.lineTo(x2, y);
        context.stroke();
    }


    function drawBarStroke(x1, y, width, color, h2) {
        ctx[2].lineWidth = 2.5;
        ctx[2].strokeStyle = color;
        ctx[2].beginPath();
        ctx[2].moveTo(x1, y);
        ctx[2].lineTo(x1 + width, y);
        ctx[2].arc(x1 + width, y + h2 / 2, h2 / 2, -Math.PI / 2, Math.PI / 2);
        ctx[2].lineTo(x1, y + h2);
        ctx[2].arc(x1, y + h2 / 2, h2 / 2, Math.PI / 2, -Math.PI / 2);
        ctx[2].stroke();
    }

    function drawBarAdvanced(x1, x2, y, width, color, h2) {
        ctx[2].beginPath();
        ctx[2].roundRect(x1 - width / 2, y - width / 2, x2 - x1 + width, h2 + width, [width / 2]);
        ctx[2].fillStyle = color;
        ctx[2].fill();
    }

    function drawButton(x, y, width, height, alpha, type = "rect", text, textSize, color1, color2, color3, clickable = false, clickType, clickableRatio, options = {}) {
        let index = options.index;        

        // If width is set to true, that means we want to calculate it on the text's length.
        if (width == true) width = measureText(text, height);
        // Set the clickable's position
        if (clickable) {
            switch (index) {
                case false:
                    global.clickables[clickType].set((x - width / 2) * clickableRatio, y * clickableRatio, width * clickableRatio, height * clickableRatio);
                    break;
                default:
                    global.clickables[clickType].place(index, (x - width / 2) * clickableRatio, y * clickableRatio, width * clickableRatio, height * clickableRatio);
                    break;
            }
        }
        let hover = false;
        if (clickable) hover = global.clickables[clickType].check({ x: global.mouse.x, y: global.mouse.y });
        // Draw boxes
        ctx[2].globalAlpha = /*0.5 * */alpha;
        ctx[2].fillStyle = color1 ? color1 : color.grey;
        if (type == "rect") drawGuiRect(x - width / 2, y, width, height);
        else if (type == "bar") drawBar(x - width / 2, x + width / 2, y + height / 2, height, color1 ? color1 : color.grey);
        ctx[2].globalAlpha = 0.2 * alpha;
        // Shaders
        if (clickable && (index !== false && hover == index) || hover === true) {
            if (global.clickables.clicked) {
                ctx[2].globalAlpha = 0.2 * alpha;
                ctx[2].fillStyle = color.black;
            } else {
                ctx[2].globalAlpha = 0.15 * alpha;
                ctx[2].fillStyle = color.guiwhite;
            }
            if (type == "rect") drawGuiRect(x - width / 2, y, width, height);
            else if (type == "bar") drawBar(x - width / 2, x + width / 2, y + height / 2, height, false)

        }
        ctx[2].fillStyle = color2 ? color2 : color.black;
        if (type == "rect") drawGuiRect(x - width / 2, y + height * 0.6, width, height * 0.4);
        else if (type == "bar") drawBar(x - width / 1.9, x + width / 1.9, y + height * 0.7, height * 0.6, color2 ? color2 : color.black);
        ctx[2].globalAlpha = 1 * alpha;
        ctx[2].fillStyle = color.guiwhite;
        ctx[2].strokeStyle = color.black;

        // Draw text
        if (text) drawText(text, x, y + height * 0.5, textSize ? textSize : height * 0.6, color.guiwhite, "center", true, 1, options.textOutline ??= true);

        // Draw the borders
        ctx[2].strokeStyle = color3 ? color3 : color.black;
        ctx[2].lineWidth = 3;
        if (type == "rect") drawGuiRect(x - width / 2, y, width, height, true);
        else if (type == "bar") drawBarStroke(x - width / 2, y, width, color3 ? color3 : color.black, height);
    }
    // Entity drawing (this is a function that makes a function)
    const drawEntity = (() => {
        let drawPolyImgs = [],
        drawPoly3D = new Map(),
        drawPoly4D = new Map(),
        cameraFor3dProjection = { x: 0, y: 0, z: -1 },
        cameraFor4dProjection = { x: 0, y: 0, z: 0, w: -1 },
        projectPoint3d = p => {
            if (p.z == 0) return p;
            p.x /= p.z - cameraFor3dProjection.z;
            p.y /= p.z - cameraFor3dProjection.z;
            p.z = 0;
            return p;
        },
        projectPoint4d = p => {
            if (p.w == 0) return projectPoint3d(p);
            p.x /= p.w - cameraFor4dProjection.w;
            p.y /= p.w - cameraFor4dProjection.w;
            p.z /= p.w - cameraFor4dProjection.w;
            p.w = 0;
            return projectPoint3d(p);
        },
        rotatePointXY = (p, angle) => {
            let q = {
                x: 0,
                y: 0,
                z: 0
            };
            const cos = Math.cos(angle);
            const sin = Math.sin(angle);
            q.x = p.x * cos + p.z * sin;
            q.z = -p.x * sin + p.z * cos;
            q.y = p.y * cos - q.z * sin;
            q.z = p.y * sin + q.z * cos;
            return q;
        },
        rotatePointXYZ = (p, angle) => {
            let q = {
                x: 0,
                y: 0,
                z: 0,
                w: 0
            };
            const cos = Math.cos(angle);
            const sin = Math.sin(angle);
            q.x = p.x * cos + p.z * sin;
            q.z = -p.x * sin + p.z * cos;
            q.y = p.y * cos - q.z * sin;
            q.z = p.y * sin + q.z * cos;
            let y = q.y;
            q.y = y * cos - p.w * sin;
            q.w = y * sin + p.w * cos;
            let z = q.z;
            q.z = z * cos - p.w * sin;
            q.w = z * sin + p.w * cos;
            return q;
        },
        distanceBetweenPointsSquared3d = (a, b) => {
            let dx = b.x - a.x,
                dy = b.y - a.y,
                dz = b.z - a.z;
            return dx * dx + dy * dy + dz * dz;
        },
        distanceBetweenPointsSquared4d = (a, b) => {
            let dx = b.x - a.x,
                dy = b.y - a.y,
                dz = b.z - a.z,
                dw = b.w - a.w;
            return dx * dx + dy * dy + dz * dz + dw * dw;
        },
        sortSides3d = (arr, a, b) => {
            let aAvgZ = 0,
                bAvgZ = 0,
                aDist = 0,
                bDist = 0;
            for (let i = 0; i < a.length; ++i) {
                aAvgZ += arr[a[i]].z;
                aDist += distanceBetweenPointsSquared3d(
                    cameraFor3dProjection,
                    arr[a[i]]
                );
            }
            for (let i = 0; i < b.length; ++i) {
                bAvgZ += arr[b[i]].z;
                bDist += distanceBetweenPointsSquared3d(
                    cameraFor3dProjection,
                    arr[b[i]]
                );
            }
            aAvgZ /= a.length;
            bAvgZ /= b.length;
            aDist /= a.length * a.length;
            bDist /= b.length * b.length;
            return (bAvgZ - aAvgZ) * 1e3 + (bDist - aDist);
        },
        sortSides4d = (arr, a, b) => {
            let aAvgW = 0,
                bAvgW = 0,
                aDist = 0,
                bDist = 0;
            for (let i = 0; i < a.length; ++i) {
                aAvgW += arr[a[i]].w;
                aDist += distanceBetweenPointsSquared4d(
                    cameraFor4dProjection,
                    arr[a[i]]
                );
            }
            for (let i = 0; i < b.length; ++i) {
                bAvgW += arr[b[i]].w;
                bDist += distanceBetweenPointsSquared4d(
                    cameraFor4dProjection,
                    arr[b[i]]
                );
            }
            aAvgW /= a.length;
            bAvgW /= b.length;
            aDist /= a.length * a.length;
            bDist /= b.length * b.length;
            return (
                ((bAvgW - aAvgW) * 1e3 + (bDist - aDist)) * 1e3 +
                sortSides3d(arr, a, b)
            );
        },
        DEAIC = (assignedContext, Alpha, shape, glow, gunLength, turretsLength) => { // AKA: Draw entity as image check
            if (global.gameUpdate && config.graphical.fancyAnimations && Alpha < 1 && assignedContext != ctx2) {
                if (config.graphical.optimizeMode) {
                    if (gunLength > 0 || turretsLength > 0 || glow.radius) return true;
                    return false;
                } else if (shape !== 0 || gunLength > 0 || turretsLength > 0 || glow.radius) {
                    return true;
                }
            }
            return false;
        },
        // Draw body function, (AKA: drawPoly)
        drawBody = (context, centerX, centerY, radius, sides, angle = 0, borderless, fill, imageInterpolation, hasGlow = false) => {
            try {
                // Start drawing
                context.beginPath();
                if (sides instanceof Array) {
                    let dx = Math.cos(angle);
                    let dy = Math.sin(angle);
                    for (let [x, y] of sides)
                        context.lineTo(
                            centerX + radius * (x * dx - y * dy),
                            centerY + radius * (y * dx + x * dy)
                        );
                } else {
                    if ("string" === typeof sides) {
                        if (sides.startsWith("image=")) {
                            let img = drawPolyImgs[sides];
                            if (!img) {
                                const defaultDirectory = sides.startsWith("image=/");
                                const clientRootDirectory = sides.startsWith("image=./");
                                const onlineDirectory = sides.startsWith("image=https");
                                img = drawPolyImgs[sides] = new Image();
                                img.src =
                                defaultDirectory ?
                                `img${sides.slice(6)}` :
                                clientRootDirectory || onlineDirectory ?
                                `${onlineDirectory ? sides.slice(6) : sides.slice(7)}` :
                                "img/missingno.png";
                                img.onerror = function() {
                                    this.src = "img/missingno.png";
                                }
                            }

                            context.translate(centerX, centerY);
                            context.rotate(angle);
                            context.imageSmoothingEnabled = imageInterpolation;
                            const imageSize = radius / 0.9;
                            context.drawImage(img, -imageSize, -imageSize, imageSize * 2, imageSize * 2);
                            context.imageSmoothingEnabled = true;
                            context.rotate(-angle);
                            context.translate(-centerX, -centerY);
                            return;
                        }
                        if (sides.startsWith("3d=")) {
                            let polygon3d = drawPoly3D.get(sides);
                            if (!polygon3d) {
                                let dividedParts = sides.slice(3).split("/");
                                let vertexesRaw = dividedParts[0].split(",").map(Number);
                                if (vertexesRaw.length % 3 != 0) throw new Error(`3D Shape cannot be rendered. Vertexes count: ${vertexesRaw.length / 3}`);
                                let vertexes = Array(vertexesRaw.length / 3);
                                for (let i = 0; i < vertexesRaw.length; i += 3) {
                                    vertexes[i / 3] = {
                                        x: vertexesRaw[i],
                                        y: vertexesRaw[i + 1],
                                        z: vertexesRaw[i + 2]
                                    };
                                }
                                let indicesRaw = dividedParts[1].split(";");
                                let indices = [];
                                for (let i = 0; i < indicesRaw.length; ++i) {
                                    indices.push(indicesRaw[i].split(",").map(Number));
                                }
                                // Optional 4th "/" segment: one colour per face (e.g. "pureWhite,pureBlack,...").
                                let faceColors = null;
                                if (dividedParts[3]) {
                                    faceColors = dividedParts[3].split(",").map(tok => {
                                        tok = (tok || "").trim();
                                        if (!tok) return null;
                                        try {
                                            return gameDraw.modifyColor(tok.includes(" ") ? tok : tok + " 0 1 0 false");
                                        } catch (e) { return null; }
                                    });
                                }
                                polygon3d = {
                                    vertexes,
                                    indices,
                                    multiplier: Number(dividedParts[2]),
                                    faceColors
                                };
                                drawPoly3D.set(sides, polygon3d);
                            }
                            const rotated = polygon3d.vertexes
                                .slice()
                                .map(p => rotatePointXY(p, angle));
                            const sortedSides = polygon3d.indices
                                .slice()
                                .sort((a, b) => sortSides3d(rotated, a, b));
                            context.lineWidth /= 2;
                            const size = radius * polygon3d.multiplier;
                            const defaultFill = context.fillStyle;
                            for (const sides of sortedSides) {
                                if (polygon3d.faceColors) {
                                    const fi = polygon3d.indices.indexOf(sides);
                                    const fc = fi >= 0 ? polygon3d.faceColors[fi] : null;
                                    context.fillStyle = fc || defaultFill;
                                }
                                context.beginPath();
                                for (let i = 0; i < sides.length; ++i) {
                                    const a = projectPoint3d(rotated[sides[i]]);
                                    const b = projectPoint3d(
                                        rotated[sides[(i + 1) % sides.length]]
                                    );
                                    context.lineTo(
                                        centerX + a.x * size,
                                        centerY + a.y * size,
                                        centerX + b.x * size,
                                        centerY + b.y * size
                                    );
                                }
                                context.closePath();
                                context.fill();
                                context.stroke();
                            }
                            if (polygon3d.faceColors) context.fillStyle = defaultFill;
                            return;
                        }
                        if (sides.startsWith("4d=")) {
                            let polygon4d = drawPoly4D.get(sides);
                            if (!polygon4d) {
                                let dividedParts = sides.slice(3).split("/");
                                let vertexesRaw = dividedParts[0].split(",").map(Number);
                                if (vertexesRaw.length % 4 != 0) throw new Error(`4D Shape cannot be rendered. Vertexes count: ${vertexesRaw.length / 4}`);
                                let vertexes = Array(vertexesRaw.length / 4);
                                for (let i = 0; i < vertexesRaw.length; i += 4) {
                                    vertexes[i / 4] = {
                                        x: vertexesRaw[i],
                                        y: vertexesRaw[i + 1],
                                        z: vertexesRaw[i + 2],
                                        w: vertexesRaw[i + 3]
                                    };
                                }
                                let indicesRaw = dividedParts[1].split(";");
                                let indices = [];
                                for (let i = 0; i < indicesRaw.length; ++i) {
                                    indices.push(indicesRaw[i].split(",").map(Number));
                                }
                                let faceColors = null;
                                if (dividedParts[3]) {
                                    faceColors = dividedParts[3].split(",").map(tok => {
                                        tok = (tok || "").trim();
                                        if (!tok) return null;
                                        try {
                                            return gameDraw.modifyColor(tok.includes(" ") ? tok : tok + " 0 1 0 false");
                                        } catch (e) { return null; }
                                    });
                                }
                                polygon4d = {
                                    vertexes,
                                    indices,
                                    multiplier: Number(dividedParts[2]),
                                    faceColors
                                };
                                drawPoly4D.set(sides, polygon4d);
                            }
                            const rotated = polygon4d.vertexes
                                .slice()
                                .map(p => rotatePointXYZ(p, angle));
                            const sortedSides = polygon4d.indices
                                .slice()
                                .sort((a, b) => sortSides4d(rotated, a, b));
                            context.lineWidth /= 2;
                            const size = radius * polygon4d.multiplier;
                            const defaultFill = context.fillStyle;
                            for (const sides of sortedSides) {
                                if (polygon4d.faceColors) {
                                    const fi = polygon4d.indices.indexOf(sides);
                                    const fc = fi >= 0 ? polygon4d.faceColors[fi] : null;
                                    context.fillStyle = fc || defaultFill;
                                }
                                context.beginPath();
                                for (let i = 0; i < sides.length; ++i) {
                                    const a = projectPoint4d(rotated[sides[i]]);
                                    const b = projectPoint4d(
                                        rotated[sides[(i + 1) % sides.length]]
                                    );
                                    context.lineTo(
                                        centerX + a.x * size,
                                        centerY + a.y * size,
                                        centerX + b.x * size,
                                        centerY + b.y * size
                                    );
                                }
                                context.closePath();
                                context.fill();
                                context.stroke();
                            }
                            if (polygon4d.faceColors) context.fillStyle = defaultFill;
                            return;
                        }
                        let path = new Path2D(sides);
                        context.save();
                        context.translate(centerX, centerY);
                        context.scale(radius, radius);
                        context.lineWidth /= radius;
                        context.rotate(angle);
                        context.lineWidth *= fill ? 1 : 0.5; // Maintain constant border width
                        if (!borderless) context.stroke(path);
                        if (fill) context.fill(path);
                        context.restore();
                        return;
                    }
                    angle += sides % 2 ? 0 : Math.PI / sides;
                }
                if (!sides) {
                    // Circle
                    let fillcolor = context.fillStyle;
                    let strokecolor = context.strokeStyle;
                    let borderRadius = context.globalAlpha < 1 ? 4 : 2;
                    switch (hasGlow) {
                        case true:
                            context.arc(centerX, centerY, radius, 0, 2 * Math.PI);
                            context.fillStyle = strokecolor;
                            context.lineWidth *= fill ? 1 : 0.5; // Maintain constant border width
                            if (!borderless) context.stroke();
                            break;
                        default:
                            context.arc(centerX, centerY, radius + context.lineWidth / borderRadius, 0, 2 * Math.PI);
                            context.fillStyle = strokecolor;
                            context.lineWidth /= 2; // Maintain constant border width
                            if (!borderless) {
                                switch (context.globalAlpha) {
                                    case 1:
                                        context.fill();
                                        break;
                                    default:
                                        context.stroke();
                                        break;
                                }
                            }
                            break;
                    }
                    context.closePath();
                    context.beginPath();
                    context.fillStyle = fillcolor;
                    context.arc(centerX, centerY, radius * fill, 0, 2 * Math.PI);
                    if (fill) context.fill();
                    context.closePath();
                    return;
                } else if (0 > sides) {
                    // Star
                    if (config.graphical.pointy) context.lineJoin = "miter";
                    sides = -sides;
                    angle += (sides % 1) * Math.PI * 2;
                    sides = Math.floor(sides);
                    let dip = 1 - 6 / (sides ** 2);
                    context.moveTo(centerX + radius * Math.cos(angle), centerY + radius * Math.sin(angle));
                    context.lineWidth *= fill ? 1 : 0.5; // Maintain constant border width
                    for (let i = 0; i < sides; i++) {
                        let htheta = ((i + 0.5) / sides) * 2 * Math.PI + angle,
                            theta = ((i + 1) / sides) * 2 * Math.PI + angle,
                            cx = centerX + radius * dip * Math.cos(htheta),
                            cy = centerY + radius * dip * Math.sin(htheta),
                            px = centerX + radius * Math.cos(theta),
                            py = centerY + radius * Math.sin(theta);
                        if (config.graphical.curvyTraps) {
                            context.quadraticCurveTo(cx, cy, px, py);
                        } else {
                            context.lineTo(cx, cy);
                            context.lineTo(px, py);
                        }
                    }
                } else if (0 < sides) {
                    // Polygon
                    angle += (sides % 1) * Math.PI * 2;
                    sides = Math.floor(sides);
                    context.lineWidth *= fill ? 1 : 0.5; // Maintain constant border width
                    for (let i = 0; i < sides; i++) {
                        let theta = (i / sides) * 2 * Math.PI + angle;
                        context.lineTo(centerX + radius * Math.cos(theta), centerY + radius * Math.sin(theta));
                    }
                }
                context.closePath();
                if (!borderless) context.stroke();
                if (fill) context.fill();
                context.lineJoin = "round";
            } catch (e) { // this actually prevents to panic the client. so we will just call "resizeEvent()".
                resizeEvent();
                console.error(`CanvasRenderingContext2D error: ${e}`);
            }
        },
        // Draw gun function, (AKA: drawTrapezoid)
        drawGun = (context, x, y, length, height, aspect, angle, borderless, fill, alpha, strokeWidth, position) => {
            let h = [];
            h = aspect > 0 ? [height * aspect, height] : [height, -height * aspect];

            // Construct a trapezoid at angle 0
            let points = [],
                sinT = Math.sin(angle),
                cosT = Math.cos(angle);
            points.push([-position, h[1]]);
            points.push([length * 2 - position, h[0]]);
            points.push([length * 2 - position, -h[0]]);
            points.push([-position, -h[1]]);
            context.globalAlpha = alpha;

            // Rotate it to the new angle via vector rotation
            context.beginPath();
            for (let point of points) {
                let newX = point[0] * cosT - point[1] * sinT + x,
                    newY = point[0] * sinT + point[1] * cosT + y;
                context.lineTo(newX, newY);
            }
            context.closePath();
            context.lineWidth *= strokeWidth
            context.lineWidth *= fill ? 1 : 0.5; // Maintain constant border width
            if (!borderless) context.stroke();
            context.lineWidth /= fill ? 1 : 0.5; // Maintain constant border width
            if (fill) context.fill();
            context.globalAlpha = 1;
        };
        // The actual drawEntity function
        return (baseColor, x, y, instance, ratio, alpha = 1, scale = 1, lineWidthMult = 1, rot = 0, turretsObeyRot = false, assignedContext = false, turretInfo = false, render = instance.render, smoothsize = false) => {
            // --- Fast early exit for invisible objects ---
            const fade = turretInfo ? 1 : render.status.getFade();
            if (fade === 0 || alpha === 0) return;

            const alphaFade = fade * alpha;
            if (!global.gameUpdate && alphaFade < 0.5) return;

            // --- Context setup with minimal state changes ---
            let context = assignedContext || ctx[1];
            const indexStr = instance.index;
            const indexes = indexStr.split("-");
            const mockupIndex = +indexes[0];
            const m = global.mockups[mockupIndex] || global.missingno[0];
            const source = turretInfo === false ? instance : turretInfo;
            const hasHighLayer = (m.turrets || []).some(t => t.layer > 0) || (m.props || []).some(p => p.layer > 0);
            const skin = instance.nameplate && !hasHighLayer && skinShape(instance.name);

            // --- Size calculations with cached values ---
            const instSize = instance.size;
            let drawSize = smoothsize ? scale * ratio * smoothsize : scale * ratio * instSize;

            if (global.gameUpdate && fade !== 1) {
                drawSize *= config.graphical.fancyAnimations ?
                    (1 + 0.5 * (1 - fade)) :
                    (1 - 2 * (1 - fade));

                if (drawSize < 0) drawSize = scale * ratio * instSize;
            }

            // --- Early optimization for small or distant objects ---
            if (drawSize < 0.1) return;

            // --- Find upper turrets and props with optimized loop ---
            const turrets = instance.isImage ? source.turrets : [...source.turrets, ...m.props];
            if (m.props) turrets.sort((a, b) => a.layer - b.layer);

            // --- Gun positions with single update ---
            source.guns.update();

            // --- Fancy canvas with reduced state setup ---
            let xx = x, yy = y;
            const useFancyCanvas = DEAIC(assignedContext, alphaFade, m.shape, m.glow, source.guns.length, turrets.length);

            if (useFancyCanvas) {
                context = ctx2;
                context.canvas.width = context.canvas.height = drawSize * m.position.axis + ratio * 20 * m.position.axis;
                xx = context.canvas.width / 2 - (drawSize * m.position.axis * m.position.middle.x * Math.cos(rot)) / 4;
                yy = context.canvas.height / 2 - (drawSize * m.position.axis * m.position.middle.x * Math.sin(rot)) / 4;
                context.translate(0.5, 0.5);
            } else if (alphaFade < 0.5 && !config.graphical.fancyAnimations) {
                return;
            }

            // --- Batch context property settings ---
            const sharp = config.graphical.sharpEdges;
            const minBorder = config.graphical.mininumBorderChunk;
            const borderChunk = config.graphical.borderChunk;
            const initStrokeWidth = lineWidthMult * Math.max(minBorder, ratio * borderChunk);

            context.lineCap = sharp ? "miter" : "round";
            context.lineJoin = sharp ? "miter" : "round";
            context.lineWidth = initStrokeWidth;

            // --- Size ratio cached for body drawing ---
            const sizeRatio = (drawSize / m.size) * m.realSize;

            // --- Draw turrets beneath with cached values ---
            for (let i = 0; i < turrets.length; i++) {
                let t = turrets[i];
                if (t.isProp) t = util.requestEntityImage(t);
                // Cache facing calculation
                if (t.lerpedFacing === undefined) {
                    t.lerpedFacing = t.facing;
                } else {
                    t.lerpedFacing = util.lerpAngle(t.lerpedFacing, t.facing, 0.1, true);
                }
                t.invuln = instance.invuln;
                if (!t.layer) {
                    const ang = t.direction + t.angle + rot;
                    const len = t.offset * drawSize;
                    const facing = t.forceAngle === null || t.forceAngle === undefined ? (t.mirrorMasterAngle || turretsObeyRot) ? rot + t.angle : t.lerpedFacing : t.angle;
                    const cosAng = Math.cos(ang);
                    const sinAng = Math.sin(ang);

                    context.lineWidth = initStrokeWidth * t.strokeWidth;

                    drawEntity(
                        baseColor,
                        xx + len * cosAng,
                        yy + len * sinAng,
                        t,
                        ratio,
                        1,
                        (drawSize / ratio / t.size) * t.sizeFactor,
                        lineWidthMult,
                        facing,
                        turretsObeyRot,
                        context,
                        t,
                        render
                    );
                }
            }

            // --- Gun positions/config with minimal property access ---
            const positions = source.guns.getPositions();
            const gunConfig = source.guns.getConfig();
            const statusColor = render.status.getColor();
            const blend = render.status.getBlend();

            const sourceGuns = source.guns;
            const gunLength = sourceGuns.length;

            for (let drawAbove = 0; drawAbove < 2; ++drawAbove) {
                // Draw guns for current layer
                for (let i = 0; i < gunLength; ++i) {
                    const g = gunConfig[i];

                    // Skip guns not in current drawing pass
                    if ((drawAbove === 0 && g.drawAbove) || (drawAbove === 1 && !g.drawAbove)) {
                        continue;
                    }

                    context.lineWidth = initStrokeWidth;

                    // Cache angle calculations
                    const gAngle = g.angle + rot;
                    const gunAngle = g.direction + gAngle;
                    const cosGunAngle = Math.cos(gunAngle);
                    const sinGunAngle = Math.sin(gunAngle);

                    const gx = g.offset * cosGunAngle;
                    const gy = g.offset * sinGunAngle;

                    // Minimize color calculations
                    let gunColor = g.color == null ? color.grey : gameDraw.modifyColor(g.color, baseColor);
                    const gunAlpha = g.alpha === undefined ? 1 : g.alpha;
                    let mixedColor = gameDraw.mixColors(gunColor, statusColor, blend);
                    global.gameUpdate && instance.invuln !== 0 && 100 > (Date.now() - instance.invuln) % 200 && ((mixedColor = gameDraw.mixColors(gunColor, gameDraw.getColor(6), 0.3)));
                    gameDraw.setColor(context, mixedColor);

                    // Draw gun with precalculated values
                    drawGun(
                        context,
                        xx + drawSize * gx,
                        yy + drawSize * gy,
                        drawSize * g.length / 2,
                        drawSize * g.width / 2,
                        g.aspect,
                        gAngle,
                        g.borderless,
                        g.drawFill,
                        gunAlpha,
                        g.strokeWidth,
                        drawSize * positions[i]
                    );
                }

                // Draw body between gun layers
                if (drawAbove === 0) {
                    context.globalAlpha = !useFancyCanvas && alphaFade < 1 && config.graphical.fancyAnimations ? alphaFade : 1;
                    context.lineWidth = initStrokeWidth * m.strokeWidth;

                    // Precalculate body color
                    let bodyColor = gameDraw.mixColors(
                        gameDraw.modifyColor(instance.color, baseColor),
                        statusColor,
                        blend
                    );
                    global.gameUpdate && instance.invuln !== 0 && 100 > (Date.now() - instance.invuln) % 200 && ((bodyColor = gameDraw.mixColors(gameDraw.modifyColor(instance.color, baseColor), gameDraw.getColor(6), 0.3)));
                    gameDraw.setColor(context, bodyColor);

                    // Optimized glow effect
                    const glow = m.glow;
                    const glowRadius = glow.radius;

                    if (glowRadius > 0) {
                        // Calculate glow color once
                        context.shadowColor = glow.color != null
                            ? gameDraw.modifyColor(glow.color)
                            : gameDraw.mixColors(
                                gameDraw.modifyColor(instance.color),
                                statusColor,
                                0
                            );

                        const glowSize = glowRadius * sizeRatio;
                        context.shadowBlur = glowSize;
                        context.shadowOffsetX = 0;
                        context.shadowOffsetY = 0;
                        context.globalAlpha = glow.alpha;

                        const recursion = glow.recursion;
                        const shape = m.shape;

                        // Draw glow with minimal state changes
                        for (let i = 0; i < recursion; ++i) {
                            drawBody(context, xx, yy, sizeRatio, shape, rot, true, m.drawFill, false, true);
                        }

                        context.globalAlpha = 1;
                    }

                    // Reset shadow properties in bulk
                    if (glowRadius > 0) {
                        context.shadowBlur = 0;
                        context.shadowOffsetX = 0;
                        context.shadowOffsetY = 0;
                    }

                    // Draw the body, then overlay the skin.
                    drawBody(context, xx, yy, sizeRatio, m.shape, rot, instance.isProp ? instance.borderless : m.borderless, instance.isProp ? instance.drawFill : m.drawFill, m.imageInterpolation);
                    if (skin) drawBody(context, xx, yy, 0.9 * (sizeRatio - 3), skin, 0, instance.isProp ? instance.borderless : m.borderless, instance.isProp ? instance.drawFill : m.drawFill, true);
                }
            }

            // --- Draw turrets above with cached trig values ---
            for (let i = 0; i < turrets.length; i++) {
                let t = turrets[i];
                if (t.isProp) t = util.requestEntityImage(t);
                // Cache facing calculation
                if (t.lerpedFacing === undefined) {
                    t.lerpedFacing = t.facing;
                } else {
                    t.lerpedFacing = util.lerpAngle(t.lerpedFacing, t.facing, 0.1, true);
                }
                t.invuln = instance.invuln;
                if (t.layer) {
                    const ang = t.direction + t.angle + rot;
                    const len = t.offset * drawSize;
                    const facing = t.forceAngle === null || t.forceAngle === undefined ? (t.mirrorMasterAngle || turretsObeyRot) ? rot + t.angle : t.lerpedFacing : t.angle;
                    const cosAng = Math.cos(ang);
                    const sinAng = Math.sin(ang);

                    context.lineWidth = initStrokeWidth * t.strokeWidth;

                    drawEntity(
                        baseColor,
                        xx + len * cosAng,
                        yy + len * sinAng,
                        t,
                        ratio,
                        1,
                        (drawSize / ratio / t.size) * t.sizeFactor,
                        lineWidthMult,
                        facing,
                        turretsObeyRot,
                        context,
                        t,
                        render
                    );
                }
            }

            // --- Optimized fancy canvas drawing ---
            if (!assignedContext && context !== ctx[1] && context.canvas.width > 0 && context.canvas.height > 0) {
                ctx[1].save();

                // Apply alpha in one operation
                ctx[1].globalAlpha = alphaFade;
                ctx[1].imageSmoothingEnabled = false;

                // Draw in one operation
                ctx[1].drawImage(context.canvas, x - xx, y - yy);
                ctx[1].restore();
            }

            // --- Minimal context reset ---
            if (sharp) {
                context.lineCap = "round";
                context.lineJoin = "round";
            }
        }
    })();

    function getIconColor(index) {
        const colors = [10, 11, 12, 15, 13, 2, 14, 4, 5, 1, 0, 3];
        return colors[index % colors.length].toString();
    }
    function colorBlend(color1, color2, d = 0.5) {
      if (0 >= d) return color1;
      if (1 <= d) return color2;
      let e = 1 - d;
      color1 = parseInt(color1.slice(1, 7), 16);
      color2 = parseInt(color2.slice(1, 7), 16);
      return (
        "#" +
        (
          (((color1 & 16711680) * e + (color2 & 16711680) * d) & 16711680) |
          (((color1 & 65280) * e + (color2 & 65280) * d) & 65280) |
          (((color1 & 255) * e + (color2 & 255) * d) & 255)
        )
          .toString(16)
          .padStart(6, "0")
      );
    }
    function getOldIconColor(index) {
        let color = gameDraw.getColor((index % 9) + 10);
        9 <= index && (color = colorBlend(color, gameDraw.getColor(((index + Math.floor(index / 9)) % 9) + 10)));
        return color;
    }

    function drawEntityIcon(model, x, y, len, height, lineWidthMult, angle, alpha, colorIndex, upgradeKey, hover = false, extraScale = 1) {
        let picture = (typeof model == "object") ? model : util.getEntityImageFromMockup(model, gui.color),
            position = picture.position,
            scale = (0.6 * len * extraScale) / position.axis,
            entityX = x + 0.5 * len,
            entityY = y + 0.5 * height,
            baseColor = picture.color;

        // Find x and y shift for the entity image
        let xShift = position.middle.x * Math.cos(angle) - position.middle.y * Math.sin(angle),
            yShift = position.middle.x * Math.sin(angle) + position.middle.y * Math.cos(angle);
        entityX -= scale * xShift;
        entityY -= scale * yShift;

        // Draw box
        ctx[2].globalAlpha = alpha;
        ctx[2].fillStyle = picture.upgradeColor != null
            ? gameDraw.modifyColor(picture.upgradeColor)
            : gameDraw.getColor(config.graphical.oldUIStyle ? getOldIconColor(colorIndex) : getIconColor(colorIndex));
        drawGuiRect(x, y, len, height);
        // Shading for hover
        if (hover) {
            if (global.clickables.clicked) {
                ctx[2].globalAlpha = 0.3;
                ctx[2].fillStyle = color.black;
            } else {
                ctx[2].globalAlpha = 0.15;
                ctx[2].fillStyle = color.guiwhite;
            }
            drawGuiRect(x, y, len, global.clickables.clicked ? height * 0.6 : height);
        }
        ctx[2].globalAlpha = (config.graphical.oldUIStyle ? 0.25 : 0.2) * alpha;
        ctx[2].fillStyle = color.black;
        drawGuiRect(x, y + height * 0.6, len, height * 0.4);
        ctx[2].globalAlpha = 1;

        // Draw Tank
        drawEntity(baseColor, entityX, entityY, picture, 1, 1, scale / picture.size, lineWidthMult, angle, true, ctx[2]);

        // Tank name
        drawText(picture.upgradeName ?? picture.name, x + (upgradeKey ? 0.925 * len : len) / 2, y + height * 0.94, height / 10.25, color.guiwhite, "center");

        // Upgrade key
        if (upgradeKey) {
            drawText(`[${upgradeKey}]`, x + len - 4, y + height - 6, height / 8 - (config.graphical.oldUIStyle ? 3 : 5), color.guiwhite, "right");
        }
        ctx[2].strokeStyle = color.black;
        ctx[2].lineWidth = 3 * lineWidthMult;
        drawGuiRect(x, y, len, height, true); // Border
    }

    const HEXAGON = (function() {
        const SQRT3 = Math.sqrt(3);
        let output = []
        for (let i = 0; i < Math.PI * 2; i += Math.PI / 3) {
            // rotated by 90deg
            output.push([Math.sin(i) / SQRT3, Math.cos(i) / SQRT3]);
        }
        return output;
    })();
    // Draw Game functions
    function drawHexagon(x, y, size) {
        ctx[0].moveTo(x + size * HEXAGON[0][0], y + size * HEXAGON[0][1]);
        ctx[0].lineTo(x + size * HEXAGON[0][0], y + size * HEXAGON[0][1]);
        ctx[0].lineTo(x + size * HEXAGON[1][0], y + size * HEXAGON[1][1]);
        ctx[0].lineTo(x + size * HEXAGON[2][0], y + size * HEXAGON[2][1]);
        ctx[0].lineTo(x + size * HEXAGON[3][0], y + size * HEXAGON[3][1]);
        ctx[0].lineTo(x + size * HEXAGON[4][0], y + size * HEXAGON[4][1]);
        ctx[0].lineTo(x + size * HEXAGON[5][0], y + size * HEXAGON[5][1]);
    }
    function drawFloor(px, py, ratio, tick) {
        // Clear the background + draw grid
        clearScreen(color.white, 1, ctx[0]);
        clearScreen(color.guiblack, 0.1, ctx[0]);

        let gameWidth = global.gameWidth = global.player.roomAnim.x.get(tick);
        let gameHeight = global.gameHeight = global.player.roomAnim.y.get(tick);

        //loop through the entire room setup
        ctx[0].globalAlpha = 1;
        ctx[0].fillStyle = color.white;
        // Draw the room
        let roomX = -px + global.screenWidth / 2 - ratio * gameWidth / 2,
            roomY = -py + global.screenHeight / 2 - ratio * gameHeight / 2,
            roomWidth = ratio * gameWidth,
            roomHeight = ratio * gameHeight;
        if (global.advanced.roundArena) {
            ctx[0].save();
            ctx[0].beginPath();
            ctx[0].arc(
                -px + global.screenWidth / 2 - (ratio * gameWidth) * 0,
                -py + global.screenHeight / 2 - (ratio * gameHeight) * 0,
                (ratio * global.gameWidth) / 2,
                0,
                Math.PI * 2
            );
            ctx[0].clip();
        }
        ctx[0].fillRect(roomX, roomY, roomWidth, roomHeight);
        if (global.roomSetup.length) {
            let W = global.roomSetup[0].length,
                H = global.roomSetup.length;

            for (let f = 0; f < H; f++) {
                let e = global.roomSetup[f];
                for (let h = 0; h < W; h++) {
                    let tile = e[h];
                    let top = ratio * h * gameWidth / W - px + global.screenWidth / 2 - ratio * gameWidth / 2,
                        bottom = ratio * f * gameHeight / H - py + global.screenHeight / 2 - ratio * gameHeight / 2,
                        left = ratio * (h + 1) * gameWidth / W - px + global.screenWidth / 2 - ratio * gameWidth / 2,
                        right = ratio * (f + 1) * gameHeight / H - py + global.screenHeight / 2 - ratio * gameHeight / 2;
                    if (tile.image) { // if a tile is a image, then get the image and render it.
                        ctx[0].globalAlpha = 1;
                        if (!tile.renderImage) {
                            tile.renderImage = new Image();
                            tile.renderImage.src = `img/${tile.image}`;
                            tile.renderImage.onerror = () => {
                                console.warn(`Failed to get ${tile.image}, using fallback texture.`)
                                tile.renderImage.src = "img/missingno.png";
                            }
                        };
                        ctx[0].drawImage(tile.renderImage, top, bottom, left - top, right - bottom);
                    }

                    ctx[0].globalAlpha = 0.3;
                    if (tile.color == "none") tile.color = "border";
                    let tileColor = gameDraw.getColor(tile.color, true);
                    // If not default tile color, draw that tile!
                    if (tileColor !== color.white) {
                        ctx[0].fillStyle = tileColor;
                        ctx[0].fillRect(top, bottom, left - top, right - bottom);
                    }
                }
            }
        }
        if (global.advanced.roundArena || config.graphical.hexaGrid) {
            ctx[0].restore();
        }
        let gridsize = 30 * ratio;
        if (config.graphical.showGrid && 2.5 < gridsize) { // Draw grid if the user wants to.
            ctx[0].save();
            ctx[0].lineWidth = config.graphical.gridDrawSize * ratio;
            ctx[0].strokeStyle = color.guiblack;
            ctx[0].globalAlpha = 0.04;
            ctx[0].beginPath();
            gridsize *= config.graphical.gridDrawSize;
            if (config.graphical.hexaGrid) {
                let ygridsize = 2 * gridsize / 1.1525;
                for (let x = (global.screenWidth / 2 - px) % gridsize - gridsize / 2; x < global.screenWidth; x += gridsize) {
                    for (let y = (global.screenHeight / 2 - py) % ygridsize - ygridsize; y < global.screenHeight + ygridsize; y += ygridsize) {
                        drawHexagon(x, y, gridsize);
                    }
                    for (let y = (global.screenHeight / 2 - py) % ygridsize - ygridsize / 2; y < global.screenHeight + ygridsize; y += ygridsize) {
                        drawHexagon(x + gridsize / 2, y, gridsize);
                    }
                }
                ctx[0].stroke();
                gridsize /= 2;
                ctx[0].globalAlpha = 1;
                ctx[0].restore();
            } else {
                for (let x = (global.screenWidth / 2 - px) % gridsize; x < global.screenWidth; x += gridsize) {
                    ctx[0].moveTo(x, 0);
                    ctx[0].lineTo(x, global.screenHeight);
                }
                for (let y = (global.screenHeight / 2 - py) % gridsize; y < global.screenHeight; y += gridsize) {
                    ctx[0].moveTo(0, y);
                    ctx[0].lineTo(global.screenWidth, y);
                }
                ctx[0].stroke();
                ctx[0].globalAlpha = 1;
                ctx[0].restore();
            }
        }
    }

    function drawEntities(px, py, ratio, tick) {
        if (global.advanced.blackout.active) {
            document.getElementById("gameCanvas-background").style.display = "none";
            const offsetX = (global.screenWidth - fullScreenWidth) / 2,
                offsetY = (global.screenHeight - fullScreenHeight) / 2;
            ctx[1].drawImage(ctx[0].canvas, offsetX, offsetY, fullScreenWidth, fullScreenHeight);
            if (global.glCanvas) ctx[1].drawImage(global.glCanvas, offsetX, offsetY, fullScreenWidth, fullScreenHeight);
        } else if (document.getElementById("gameCanvas-background").style.display === "none") document.getElementById("gameCanvas-background").style.display = "block";
        // Draw things
        for (let instance of global.entities) {
            if (!instance.render.draws) {
                continue;
            }
            let motion = compensation();
            let rst = instance.render.status.getFade();
            if (rst === 1) {
                motion.set();
            } else {
                if (config.graphical.lerpAnimations) {
                    instance.x += instance.vx * global.metrics.updatetime / global.metrics.rendertime;
                    instance.y += instance.vy * global.metrics.updatetime / global.metrics.rendertime;
                    instance.facing += instance.vfacing * global.metrics.updatetime / global.metrics.rendertime;
                }
                motion.set(instance.render.lastRender, instance.render.interval);
            }
            let isize = instance.render.size.get(tick);
            let resting = !instance.vx && !instance.vy && !instance.render.lastvx && !instance.render.lastvy;
            instance.render.x = resting ? instance.render.xAnim.get(tick) :
                !config.graphical.interpolation ?
                motion.predict(instance.render.lastx, instance.x, instance.render.lastvx, instance.vx) :
                config.graphical.lerpAnimations ?
                util.lerp(instance.render.x, Math.round(instance.x + instance.vx), 0.1, true) :
                instance.render.xAnim.get(tick, 1 !== rst);

            instance.render.y = resting ? instance.render.yAnim.get(tick) :
                !config.graphical.interpolation ?
                motion.predict(instance.render.lasty, instance.y, instance.render.lastvy, instance.vy) :
                config.graphical.lerpAnimations ?
                util.lerp(instance.render.y, Math.round(instance.y + instance.vy), 0.1, true) :
                instance.render.yAnim.get(tick, 1 !== rst);

            instance.render.f = !config.graphical.interpolation ?
                motion.predictFacing(instance.render.lastf, instance.facing) :
                instance.render.faceAnim.get(tick, 1 !== rst);

            instance.id === gui.playerid &&
                !global.autoSpin &&
                !global.syncingWithTank &&
                !instance.twiggle &&
                !global.died ?
                instance.render.f = Math.atan2(global.target.y * global.reverseTank, global.target.x * global.reverseTank) : 0

            let x = ratio * instance.render.x - px,
                y = ratio * instance.render.y - py,
                baseColor = instance.color;
            if (instance.id === gui.playerid) {
                x = !config.graphical.smoothcamera && !global.player.isScoping && config.graphical.shakeProperties.CameraShake.shakeStartTime == -1 && !global.died ? 0 : x;
                y = !config.graphical.smoothcamera && !global.player.isScoping && config.graphical.shakeProperties.CameraShake.shakeStartTime == -1 && !global.died ? 0 : y;
                global.player.screenx = x;
                global.player.screeny = y;
                global.player.name = instance.name ?? "";
            }
            x += global.screenWidth / 2;
            y += global.screenHeight / 2;
            let alpha = instance.id === gui.playerid ? 1 : instance.alpha;
            alpha = handleScreenDistance(alpha, instance, false);
            drawEntity(baseColor, x, y, instance, ratio, instance.id === gui.playerid ? instance.alpha * alpha : alpha, 1, 1, instance.render.f, false, false, false, instance.render, isize);
        }
        for (let instance of global.entities) {
            let alpha = instance.id === gui.playerid ? 1 : instance.alpha;
            alpha = handleScreenDistance(alpha, instance);
            let x = instance.id === gui.playerid ? global.player.screenx : ratio * instance.render.x - px,
                y = instance.id === gui.playerid ? global.player.screeny : ratio * instance.render.y - py;
            drawHealth(x, y, instance, ratio, gui.visibleEntities ? 1 : alpha, instance.size);
            drawName(x, y, instance, ratio, gui.visibleEntities ? alpha * 0.75 + 0.25 : alpha, instance.size);
            if (global.GUIStatus.renderChatMessages) drawChatMessages(x, false, py, instance, ratio, gui.visibleEntities ? 1 : alpha, instance.size, px, py);
            drawChatInput(x, y, instance, ratio, instance.size);
        }
        if (global.advanced.blackout.active) {
            let entity = global.entities.find((u) => u.id === gui.playerid);
            if (entity) {
                ctx[1].beginPath();
                let x = global.screenWidth / 2 - px + ratio * 0,
                    y = global.screenHeight / 2 - py + ratio * 0,
                    kt = ratio * global.gameWidth,
                    ky = ratio * global.gameHeight,
                    G = global.roomSetup[0].length,
                    L = global.roomSetup.length

                for (let S = 0; S < L; S++) for (let ea = 0; ea < G; ea++) {
                    let Pc = x + ((ea + 0.5) / G) * kt - kt / 2,
                        Qc = y + ((S + 0.5) / L) * ky - ky / 2,
                        tile = global.roomSetup[S][ea];

                    if (tile.visibleOnBlackout) {
                        ctx[1].moveTo(Pc + ((0.5) / G) * kt, Qc);
                        ctx[1].arc(Pc, Qc, ((0.5) / G) * kt, 0, 2 * Math.PI);
                    }
                }
                for (let entity of global.entities) {
                    let x = ratio * entity.render.x - px,
                        y = ratio * entity.render.y - py,
                        indexes = entity.index.split("-"),
                        m = global.mockups[parseInt(indexes[0])] ?? global.missingno[0];

                    x += global.screenWidth / 2;
                    y += global.screenHeight / 2;
                    if (entity.id === gui.playerid || (m.visibleOnBlackout && entity.alpha < 0.1)) {
                        ctx[1].moveTo(x, y);
                        ctx[1].arc(x, y, entity.size * ratio * 4, 0, 2 * Math.PI);
                    }
                    if (entity.id === gui.playerid) {
                        if (!global.died) {
                            ctx[1].moveTo(x, y);
                            let na = Math.atan2(global.target.y * global.reverseTank, global.target.x * global.reverseTank);
                            ctx[1].arc(x, y, entity.size * ratio * 24, na - 0.3, na + 0.3);
                        }
                        for (let gun of m.guns) {
                            let facing = entity.render.f,
                                tx = x + gun.offset * Math.cos(gun.direction + gun.angle + facing) + (gun.length / 2) * Math.cos(gun.angle + facing),
                                ty = y + gun.offset * Math.sin(gun.direction + gun.angle + facing) + (gun.length / 2) * Math.sin(gun.angle + facing);
                            ctx[1].moveTo(tx, ty);
                            let Ia = facing + gun.angle;
                            ctx[1].arc(tx, ty, entity.size * ratio * gun.length * 6, Ia - 0.3, Ia + 0.3);
                        }
                    }
                }
                ctx[1].globalAlpha = 1;
                ctx[1].fillStyle = global.advanced.blackout.color;
                ctx[1].globalCompositeOperation = "destination-in";
                ctx[1].fill();
                ctx[1].globalCompositeOperation = "destination-over";
                ctx[1].fillRect(0, 0, global.screenWidth, global.screenHeight);
                ctx[1].globalCompositeOperation = "source-over";
            } else {
                ctx[1].globalAlpha = 1;
                ctx[1].fillStyle = global.advanced.blackout.color;
                ctx[1].fillRect(0, 0, global.screenWidth, global.screenHeight);
            }
        }
    }

    let lastTreeType = null;
    global.classTree = createClassTree({
        parent: document.getElementById("gameAreaWrapper"),
        mockups: () => global.mockups,
        theme: () => gameDraw.color,
        playerColor: () => gui.color,
        iconColor: index => config.graphical.oldUIStyle ? getOldIconColor(index) : gameDraw.getColor(getIconColor(index)),
        boxColor: upgradeColor => gameDraw.modifyColor(upgradeColor),
        ratio: () => global.ratio,
        drawIcon: (context, index, x, y, size, lineWidth) => {
            let picture = util.getEntityImageFromMockup(index, gui.color),
                position = picture.position,
                scale = size / position.axis,
                angle = -Math.PI / 4;
            x -= scale * (position.middle.x * Math.cos(angle) - position.middle.y * Math.sin(angle));
            y -= scale * (position.middle.x * Math.sin(angle) + position.middle.y * Math.cos(angle));
            drawEntity(picture.color, x, y, picture, 1, 1, scale / picture.size, lineWidth / Math.max(config.graphical.mininumBorderChunk, config.graphical.borderChunk), angle, true, context);
        },
        close: () => global.tankTree("exit"),
        focusGame: () => global.canvas.cv.focus(),
        keyUp: event => {
            if (global.gameStart) global.canvas.keyUp(event);
        }
    });

    function drawUpgradeTree() {
        if (global.died || global.disconnected) return global.tankTree("exit");
        if (lastTreeType !== gui.type) {
            lastTreeType = gui.type;
            global.socket.talk("T");
        }
        if (global.generateTankTree) {
            global.generateTankTree = false;
            let names = [],
                roots = [];
            for (let index of String(gui.type).split("-")) {
                let mockup = global.mockups[parseInt(index)];
                if (!mockup || !mockup.rerootUpgradeTree) continue;
                for (let name of mockup.rerootUpgradeTree.split("\\/")) if (!names.includes(name)) names.push(name);
            }
            for (let name of names) {
                let mockup = global.mockups.find(i => i && i.className === name);
                if (mockup) roots.push(mockup.index);
            }
            if (roots.length) global.classTree.setRoots(roots);
        }
        global.classTree.setHidden((global.menu && global.menu.isOpen()) || global.dailyTankAd.renderUI);
        global.classTree.frame();
    }

    function drawMessages(spacing, alcoveSize) {
        // Draw messages
        let height = 18;
        let x = global.screenWidth / 2;
        let y = spacing + 5;
        if (global.mobile) {
            if (global.canUpgrade) {
                mobileUpgradeGlide.set(0 + (global.canUpgrade || global.upgradeHover));
                y += (alcoveSize / 1.4 /*+ spacing * 2*/) * mobileUpgradeGlide.get();
            }
            y += global.canSkill || global.showSkill ? (alcoveSize / 2.2 /*+ spacing * 2*/) * statMenu.get() : 0;
        }

        // Draw each message
        var Bd = Date.now();
        var yy = config.animationSettings.ScaleBar;
        for (let i = global.messages.length - 1; i >= 0; i--) {
            let msg = global.messages[i],
                txt = msg.text,
                time = Bd - msg.time,
                duration = msg.duration - time,
                text = txt;

            if (0 >= duration) {
                 global.messages.splice(i, 1);
                 continue;
            }

            let K = Math.max(0, Math.min(1, time / 300, duration / 300));
            if (msg.textJSON) { // If a message is like a big ass box then draw this instead.
                let len = 0;
                // Give it a textobj if it doesn't have one
                msg.textJSON.forEach((txt) => {
                    if (len < measureText(txt, height - 4.25, false)) len = measureText(txt, height - 4.25, false)
                })
                ctx[2].globalAlpha = 0.5 * K;
                // Draw the background
                drawBarAdvanced(x - len / 2, x + len / 2, y + yy / 2, height, color.black, 17.5 * (msg.textJSON.length) - 17.5 + 1);
                ctx[2].globalAlpha = K;
                // Draw the text
                msg.textobjs = [];
                msg.textJSON.forEach((txt) => {
                    msg.textobjs[msg.textobjs.length] = function () { }; // For some reason this fixes the text's location i guess.
                    drawText(txt, x - len / 2 + 2, y + 16 + 17.5 * (msg.textobjs.length - 1), height - 4.3, color.guiwhite, "left", false, 1, 5.5);
                })
                y += 23 * K + 17.5 * (3 - 2 * K) * (msg.textJSON.length - 1) * K * K;
            } else {
                // Give it a textobj if it doesn't have one
                if (msg.len == null) msg.len = measureText(text, height - 4.3);
                // Draw the background
                ctx[2].globalAlpha = 0.5 * K;
                drawBar(x - msg.len / 2, x + msg.len / 2, y + yy / 2, height + 2, color.black);
                // Draw the text
                ctx[2].globalAlpha = K;
                drawText(text, x, y + yy / 1.3, height - 4.3, color.guiwhite, "center", false, 1, 5.5);
                y += 23 * (3 - 2 * K) * K * K;
            }
        }
        ctx[2].globalAlpha = 1;
    }

    function drawChatMessages(x, y, py, instance, ratio, alpha, isize) {
        if (!(instance.id === gui.playerid) && instance.alpha < 0.25) return;
        let size = isize * ratio,
            g = Math.max(20, size);

        if (!y) y = instance.id === gui.playerid
            ? global.player.screeny - 1 * global.showChatGlide * g
            : ratio * instance.render.y - py;
        //put chat msg above name
        let fade = instance.render.status.getFade();
        fade *= fade;
        ctx[1].globalAlpha = fade;

        x += global.screenWidth / 2;
        y += global.screenHeight / 2;
        if (instance.id !== gui.playerid && instance.nameplate) y -= 8 * ratio;
        let messages = global.chats[instance.id];
        if (!messages) return;

        const messageSpacing = 25 * 0.04 * g;

        // Draw all the messages
        for (let i = 0; i < messages.length; i++) {
            let chatIndex = messages.length - 1 - i;
            let chat = messages[chatIndex],
                text = chat.text,
                msgLengthHalf = measureText(text, 0.5 * g) / 2,
                barScale = global.GUIStatus.renderPlayerScores ? 2.66 : 2.26,
                textScale = global.GUIStatus.renderPlayerScores ? 2.45 : 2.05,
                valpha = chat.alpha.get();

            if (chat.erased && valpha === 0) {
                util.remove(global.chats[instance.id], chatIndex); // Remove the chat object
                messages.sort((a, b) => a.id - b.id); // Sort the messages or else the order will get messed up
            }
            if (chat.targetY === undefined) {
                chat.targetY = i * messageSpacing;
                chat.currentY = i === 0 ? 0 : (i-1) * messageSpacing;
            }
            chat.targetY = i * messageSpacing;
            const animationSpeed = 10;
            chat.currentY += (chat.targetY - chat.currentY) * animationSpeed / global.metrics.rendertime;
            let slideOffset = chat.currentY;

            // Skip rendering if completely faded out
            if (valpha <= 0) continue;

            ctx[1].globalAlpha = 0.5 * valpha * alpha * alpha * fade;
            drawBar(x - msgLengthHalf, x + msgLengthHalf, y - g * (instance.id === gui.playerid ? 2.26 : barScale) - slideOffset, 0.75 * g, gameDraw.getColorDark(gameDraw.getColor(instance.color.split(" ")[0])), ctx[1]);
            ctx[1].globalAlpha = valpha * alpha * fade;
            config.graphical.fontStrokeRatio *= 1.2;
            drawText(text, x, y - g * (instance.id === gui.playerid ? 2.05 : textScale) - slideOffset, 0.50 * g, color.guiwhite, "center", false, 1, true, ctx[1]);
            config.graphical.fontStrokeRatio /= 1.2;
        }
    }


    function drawHealth(x, y, instance, ratio, alpha, isize) {
        if (!(0.02 > alpha)) {
            let fade = instance.render.status.getFade();
            fade *= fade;
            ctx[1].globalAlpha = fade;

            let size = isize * ratio,
                indexes = instance.index.split("-"),
                m = global.mockups[parseInt(indexes[0])];
            if (!m) m = global.missingno[0];
            let realSize = (size / m.size) * m.realSize;

            if (instance.drawsHealth) {
                let health = instance.render.health.get(),
                    shield = instance.render.shield.get();

                x += global.screenWidth / 2;
                y += global.screenHeight / 2;

                if (health < 0.99 || shield < 0.99 && global.GUIStatus.renderhealth) {
                    let col = config.graphical.coloredHealthbars ? gameDraw.mixColors(gameDraw.modifyColor(instance.color), color.guiwhite, 0.5) : color.lgreen;
                    let yy = y + realSize + 14.3 * ratio;
                    let barWidth = 1 * ratio;
                    let barChunk = (config.graphical.barChunk || 0) * ratio;
                    let seperated = config.graphical.separatedHealthbars;

                    ctx[1].globalAlpha = alpha * alpha * fade;

                    // Background bar
                    drawBar(x - size, x + size, yy, seperated ? barWidth + barChunk * 1.6 : barWidth + barChunk, color.black, ctx[1])

                    // HP bar
                    drawBar(x - size, x - size + 2 * size * health, seperated ? yy + barWidth * 1.45 : yy, barWidth + barChunk * 0.35, col, ctx[1])

                    if (shield || seperated) {
                        if (!seperated) ctx[1].globalAlpha *= 0.7;
                        ctx[1].globalAlpha *= 0.3 + 0.3 * shield;
                        drawBar(x - size, x - size + 2 * size * shield, seperated ? yy - barWidth * 1.45 : yy, barWidth + barChunk * 0.35, config.graphical.coloredHealthbars ? gameDraw.mixColors(col, color.guiblack, 0.25) : color.teal, ctx[1])
                    }
                    if (gui.showhealthtext) drawText(Math.round(instance.healthN) + "/" + Math.round(instance.maxHealthN), x, yy + barWidth * 2 + barWidth * config.graphical.separatedHealthbars * 2 + 10, 12 * ratio, color.guiwhite, "center");
                    ctx[1].globalAlpha = alpha;
                }
            }
        }
    }

    function drawName(x, y, instance, ratio, alpha, isize) {
        if (!(0.02 > alpha)) {
            let fade = instance.render.status.getFade();
            fade *= fade;
            ctx[2].globalAlpha = fade;

            let size = isize * ratio;
            x += global.screenWidth / 2;
            y += global.screenHeight / 2;

            if (instance.id !== gui.playerid && instance.nameplate) {
                var name = instance.name.substring(7, instance.name.length + 1);
                var namecolor = instance.name.substring(0, 7);
                ctx[1].globalAlpha = alpha * alpha * fade;
                let g = Math.max(20, size);
                if (global.GUIStatus.renderPlayerNames) drawText(name, x, y - g * (global.GUIStatus.renderPlayerScores ? 1.9 : 1.45), 0.55 * g, namecolor == "#FFFFFF" ? color.guiwhite : namecolor, "center", false, 1, true, ctx[1]);
                if (global.GUIStatus.renderPlayerScores || typeof instance.score === "string") drawText(typeof instance.score === "string" ? instance.score : util.handleLargeNumber(instance.score, 1), x, y - 1.45 * g, 0.3 * g, namecolor == "#FFFFFF" ? color.guiwhite : namecolor, "center", false, 1, true, ctx[1]);
                ctx[1].globalAlpha = 1;
            }
        }
    }

    function drawHudText(text, x, y, size, fill, align = "center", stroke = size / 4) {
        size += config.graphical.fontSizeBoost;
        ctx[2].font = "bold " + size + "px Ubuntu";
        ctx[2].textAlign = align;
        ctx[2].textBaseline = "middle";
        ctx[2].lineJoin = "round";
        ctx[2].lineWidth = stroke;
        ctx[2].strokeStyle = color.black;
        ctx[2].fillStyle = fill;
        ctx[2].strokeText(text, x, y);
        ctx[2].fillText(text, x, y);
        ctx[2].textAlign = "left";
    }

    function drawSkillBars(spacing, alcoveSize) {
        if (global.mobile) return drawMobileSkillUpgrades(spacing, alcoveSize);
        global.clickables.stat.hide();
        global.clickables.hover.hide();
        let now = performance.now(),
            seconds = skillMenuTime ? (now - skillMenuTime) / 1000 : 0,
            points = gui.points,
            toScreen = global.screenWidth / global.canvas.width,
            mouseX = global.mouse.x * toScreen,
            mouseY = global.mouse.y * toScreen,
            bottom = global.screenHeight - 1080,
            clickableRatio = global.canvas.height / global.screenHeight / global.ratio,
            colors = ["orange", "gold", "teal", "green", "yellow", "red", "lgreen", "blue", "pink", "purple"],
            rows = [],
            widest = 0,
            open = false,
            names;
        skillMenuTime = now;
        try {
            names = gui.getStatNames(global.mockups[parseInt(gui.type.split("-")[0])].statnames);
        } catch (e) {
            names = gui.getStatNames(global.missingno[0].statnames);
        }
        for (let stat = 0; stat < 10; stat++) {
            let skill = gui.skills[9 - stat];
            if (!skill || !skill.softcap) continue;
            let level = Math.min(skill.amount, skill.softcap);
            rows.push({ stat, level, max: skill.softcap, name: names[stat], color: color[colors[stat]] });
            if (skill.softcap > widest) widest = skill.softcap;
            if (level < skill.softcap) open = true;
        }
        let target = (points > 0 && open) || (mouseX < 20 && mouseY >= global.screenHeight - 120) ? 1 : 0;
        if (global.pullSkillBar) target = 0;
        skillMenuShown = slideStep(skillMenuShown, target, seconds);
        global.statBuy = [];
        if (!skillMenuShown || !rows.length) return;
        let left = -(1 - skillMenuShown) * skillHideDistance(widest);
        for (let r = 0; r < rows.length; r++) {
            let row = rows[r],
                y = bottom + 1047.5 - (rows.length - 1 - r) * 19,
                end = left + SKILL_TRACK_LEFT + SKILL_SEGMENT * row.max,
                preview = row.level,
                buyable = points > 0 && row.level < row.max;
            if (buyable && Math.abs(mouseY - y) <= 8 && mouseX >= left + SKILL_TRACK_LEFT && mouseX < end) {
                preview = skillPreview(row.level, Math.floor((mouseX - left - SKILL_TRACK_LEFT) / SKILL_SEGMENT), points, row.max);
            }
            global.statBuy[row.stat] = preview - row.level;
            if (buyable) global.clickables.stat.place(row.stat, (left + SKILL_TRACK_LEFT) * clickableRatio, (y - 8) * clickableRatio, SKILL_SEGMENT * row.max * clickableRatio, 16 * clickableRatio);
            drawBar(left + SKILL_START, end + 11.5, y, 16, color.black);
            drawBar(left + SKILL_START, end - 5.5, y, 11, color.grey);
            if (preview > row.level) drawSkillFill(left, y, preview, row.level + 1, gameDraw.mixColors(row.color, color.white, 153 / 256));
            drawSkillFill(left, y, row.level, 1, row.color);
            let textColor = row.level >= row.max ? row.color : points <= 0 ? color.grey : color.guiwhite,
                plus = Math.max(preview, row.level);
            drawHudText(row.name, left + 33 + SKILL_SEGMENT * row.max / 2, y, 11, textColor);
            drawHudText(`[${getKeybind(`KEY_SKILL_${row.stat + 1}`)}]`, left + 40 + SKILL_SEGMENT * row.max, y, 9, textColor, "right");
            if (plus > 0) drawHudText("+" + plus, left + 48.4 + SKILL_SEGMENT * row.max, y, 11, preview > row.level ? color.guiwhite : row.color, "left");
        }
        if (points > 0) drawHudText("x" + points, left + 41 + SKILL_SEGMENT * widest, bottom + 1027 - (rows.length - 1) * 19, 20, color.guiwhite, "right", 4);
    }

    function drawSkillFill(left, y, level, firstSeparator, fill) {
        let end = left + skillFillEnd(level);
        ctx[2].fillStyle = color.black;
        drawGuiCircle(end, y, 6.75);
        if (level > 0) {
            drawBar(left + SKILL_START, end, y, 11, fill);
        } else {
            ctx[2].fillStyle = fill;
            drawGuiCircle(left + SKILL_START, y, 5.5);
        }
        ctx[2].strokeStyle = color.black;
        ctx[2].lineWidth = 1.25;
        ctx[2].lineCap = "round";
        for (let i = firstSeparator; i < level; i++) {
            let x = left + SKILL_TRACK_LEFT + SKILL_SEGMENT * i;
            ctx[2].beginPath();
            ctx[2].moveTo(x, y - 4.875);
            ctx[2].lineTo(x, y + 4.875);
            ctx[2].stroke();
        }
    }

    function drawSelfInfo(max) {
        if (global.died) return;
        let left = global.screenWidth / 2 - 960,
            bottom = global.screenHeight - 1080,
            score = Math.round(gui.__s.getScore()),
            kills = gui.__s.getKills(),
            name = global.player.name.substring(7, global.player.name.length + 1);
        drawPlayerBar(left + 740, left + 1180, bottom + 1045, 22, gui.__s.getProgress(), color.purple, "Level " + gui.__s.getLevel() + " " + gui.class);
        if (global.GUIStatus.renderPlayerKillbar) {
            drawPlayerBar(left + 788, left + 988, bottom + 1019, 14, score / max, color.green, "Score: " + commas(score));
            drawPlayerBar(left + 1012, left + 1132, bottom + 1019, 14, killFill(kills[0], kills[2], score), color.teal, killText(kills[0], kills[1], kills[2]));
        } else {
            drawPlayerBar(left + 810, left + 1110, bottom + 1019, 14, score / max, color.green, "Score: " + commas(score));
        }
        if (name) drawHudText(name, left + 960, bottom + 985, 32, global.nameColor == "#FFFFFF" ? color.guiwhite : global.nameColor, "center", 6.4);
    }

    function drawPlayerBar(x0, x1, y, height, fill, fillColor, text) {
        drawBar(x0, x1, y, height + 5, color.black);
        drawBar(x0, x1, y, height, color.grey);
        drawBar(x0, x0 + (x1 - x0) * Math.max(0, Math.min(1, fill)), y, height, fillColor);
        drawHudText(text, (x0 + x1) / 2, y, height, color.guiwhite);
    }

    function handleSpeedMonitor() {
        if ((100 * gui.fps) < 100) global.serverStats.lag_color = color.orange; else global.serverStats.lag_color = color.guiwhite;
        if (global.metrics.rendertime < 10) global.metrics.rendertime_color = color.orange; else global.metrics.rendertime_color = color.guiwhite;
        if (global.serverStats.mspt > 28.0) {
            global.serverStats.mspt_color = color.red;
        } else if (global.serverStats.mspt > 20.0) {
            global.serverStats.mspt_color = color.orange;
        } else global.serverStats.mspt_color = color.guiwhite;
    }
    const xc = { cc: 0, dc: 0 };
    function drawMinimapAndDebug(spacing, alcoveSize, GRAPHDATA) {
        // Draw minimap and FPS monitors
        // Minimap stuff starts here
        let len = alcoveSize; // * global.screenWidth;
        let height = (len / global.gameWidth) * global.gameHeight;
        let upgradeColumns = Math.ceil(gui.upgrades.length / 9);
        let x = global.mobile ? spacing : global.screenWidth - spacing - len - 5;
        let y = global.mobile ? spacing : global.screenHeight - height - spacing - 5;
        if (config.graphical.oldUIStyle) {
            x += 5;
            y += 5;
        }
        if (global.GUIStatus.renderMinimap) {
            if (global.mobile) {
                y += global.canUpgrade ? (alcoveSize / 1.5) * mobileUpgradeGlide.get() * upgradeColumns / 1.5 + spacing * + 1.55 + 9 : 0;
                y += global.canSkill || global.showSkill ? statMenu.get() * alcoveSize / 2.6 + spacing / 0.75 : 0;
            }

            // Calculate minimap center if needed
            let centerX = x + len / 2;
            let centerY = y + height / 2;

            ctx[2].globalAlpha = 0.5;
            ctx[2].save();
            ctx[2].fillStyle = gameDraw.mixColors(color.grey, color.white, 0.5);
            global.advanced.roundArena == true ? drawGuiCircle(x + len / 2, y + height / 2, len / 2) : drawGuiRect(x, y, len, height);
            ctx[2].beginPath(); // We will not allow to draw outside of the minimap so we are only allowing minimap entities to draw INSIDE the minimap only
            global.advanced.roundArena == true ? ctx[2].arc(x + len / 2, y + height / 2, len / 2, 0, 2 * Math.PI) : ctx[2].rect(x, y, len, height); // Draw everything inside the minimap
            ctx[2].clip();

            if (global.roomSetup.length) {
                let W = global.roomSetup[0].length,
                    H = global.roomSetup.length,
                    i = 0;

                // Calculate player's position in game world
                let playerWorldX = global.player.cx.animX;
                let playerWorldY = global.player.cy.animY;

                for (let ycell = 0; ycell < H; ycell++) {
                    let j = 0;
                    for (let xcell = 0; xcell < W; xcell++) {
                        let cell = global.roomSetup[ycell][xcell];
                        // Calculate cell world position
                        let cellWorldX = (xcell / W - 0.5) * global.gameWidth;
                        let cellWorldY = (ycell / H - 0.5) * global.gameHeight;

                        // Calculate relative position to player
                        let relX = cellWorldX - playerWorldX;
                        let relY = cellWorldY - playerWorldY;

                        // Convert to minimap coordinates
                        let minimapX = config.game.centeredMinimap ? centerX + (relX / global.gameWidth) * len : x + (j * len) / W;
                        let minimapY = config.game.centeredMinimap ? centerY + (relY / global.gameHeight) * height : y + (i * height) / H;
                        let cellWidth = len / W;
                        let cellHeight = height / H;
                        if (!cell) {
                            ctx[2].fillStyle = gameDraw.getColor("border", true);
                            drawGuiRect(minimapX, minimapY, cellWidth, cellHeight);
                        } else {
                            let color = cell.color;
                            if (color == "none") cell.color = "pureBlack";
                            if (cell.renderImage) {
                                ctx[2].globalAlpha = 1;
                                ctx[2].drawImage(cell.renderImage, minimapX, minimapY, cellWidth, cellHeight);
                            }
                            ctx[2].globalAlpha = 0.5;
                            ctx[2].fillStyle = gameDraw.getColor(color);
                            if (gameDraw.getColor(color) !== color.white) {
                                drawGuiRect(minimapX, minimapY, cellWidth, cellHeight);
                            }
                        };
                        j++;
                    }
                    i++;
                }
            }
            ctx[2].globalAlpha = 1;
            for (let entity of minimap.get()) {
                ctx[2].fillStyle = gameDraw.mixColors(gameDraw.modifyColor(entity.color), color.black, 0.3);
                ctx[2].globalAlpha = entity.alpha;

                // Calculate entity position relative to player
                let relX = entity.x - global.player.cx.animX;
                let relY = entity.y - global.player.cy.animY;

                // Convert to minimap coordinates
                let minimapX = config.game.centeredMinimap ? centerX + (relX / global.gameWidth) * len : x + (entity.x / global.gameWidth + 0.5) * len;
                let minimapY = config.game.centeredMinimap ? centerY + (relY / global.gameHeight) * height : y + (entity.y / global.gameHeight + 0.5) * height;

                switch (entity.type) {
                    case 2:
                        // Draw wall entities
                        let trueSize = (entity.size + 2) / 1.1283791671;
                        let sizeOnMap = (trueSize / global.gameWidth) * len;
                        drawGuiRect(minimapX - sizeOnMap, minimapY - sizeOnMap, sizeOnMap * 2, sizeOnMap * 2);
                        break;
                    case 1:
                        // Draw rock/other entities
                        let entitySize = (entity.size / global.gameWidth) * len;
                        drawGuiCircle(minimapX, minimapY, entitySize);
                        break;
                    case 0:
                        // Draw other players
                        if (entity.id !== gui.playerid) {
                            drawGuiCircle(minimapX, minimapY, !global.mobile ? 2 : 3.5);
                        }
                        break;
                }
            }

            ctx[2].globalAlpha = 1;
            ctx[2].lineWidth = 1;
            ctx[2].strokeStyle = color.guiblack;
            ctx[2].fillStyle = color.guiblack;
            // Draw yourself in the minimap
            drawGuiCircle(config.game.centeredMinimap ? centerX : x + (global.player.cx.animX / global.gameWidth + 0.5) * len, config.game.centeredMinimap ? centerY : y + (global.player.cy.animY / global.gameHeight + 0.5) * height, !global.mobile ? 2 : 3.5, false);
            ctx[2].restore();
            ctx[2].globalAlpha = 1;
            ctx[2].fillStyle = color.black;
            // Draw border of the minimap
            ctx[2].lineWidth = 3;
            global.advanced.roundArena == true ? drawGuiCircle(x + len / 2, y + height / 2, len / 2, true) : drawGuiRect(x, y, len, height, true); // Border
        }
        if (global.mobile || !global.GUIStatus.renderMinimap) {
            x = global.screenWidth - spacing - len;
            y = global.screenHeight - spacing;
        }
        if (global.showDebug) {
            drawGuiRect(x, y - 40, len, 30);
            lagGraph(lag.get(), x, y - 40, len, 30, color.teal);
            gapGraph(global.metrics.rendergap, x, y - 40, len, 30, color.pink);
            timingGraph(GRAPHDATA, x, y - 40, len, 30, color.yellow);
        }
        // Minimap stuff ends here
        // Debug stuff
        if (!global.showDebug) y += 13 * 3;
        // Text
        handleSpeedMonitor();

        if (!global.metrics.latency.length) global.metrics.latency.push(0);
        let ping = global.metrics.latency.reduce((b, a) => b + a, 1) / global.metrics.latency.length - 1;
        let xloc = global.player.renderx / 30;
        let yloc = global.player.rendery / 30;
        let watermarkText = "Open Source Arras";
        let versionLength = (measureText(global.version ?? "v?", 32)) / 2;
        let length = Math.max(measureText(watermarkText, 32)) / 16;
        let gradientTransition = global.showDebug ? 4.1 : 2;
        let watermarkTextPos1 = Math.round(x + len / gradientTransition) + 0.5;
        let watermarkColor = gameDraw.getColor({gradient: true, asset: [{color: `${color.blue}`}, {color: `${color.green}`}]}, ctx[2], watermarkTextPos1 - length, length * 0.085, watermarkTextPos1 + length, 0);
        if (global.showDebug) {
            let getRenderingInfo = (data, isTurret) => {
                isTurret ? global.renderingInfo.turretEntities += data.length : global.renderingInfo.entities += data.length;
                for (let instance of data) {
                    if (instance.name && instance.id !== gui.playerid) global.renderingInfo.entitiesWithName++;
                    if (instance.turrets.length) getRenderingInfo(instance.turrets, true);
                };
            };
            getRenderingInfo(global.entities, false);
            if (!global.tankSpeedHistory) global.tankSpeedHistory = [];
            const HISTORY_LENGTH = 5;
            let rawSpeed = Math.sqrt(global.player.vx * global.player.vx + global.player.vy * global.player.vy) * config.roomSpeed;
            rawSpeed = rawSpeed * 0.765;
            global.tankSpeedHistory.push(rawSpeed);
            if (global.tankSpeedHistory.length > HISTORY_LENGTH) global.tankSpeedHistory.shift();
            let tankSpeed = global.tankSpeedHistory.reduce((sum, val) => sum + val, 0) / global.tankSpeedHistory.length;
            let fmtData = n => n >= 1073741824 ? (n / 1073741824).toFixed(2) + " GB" : n >= 1048576 ? (n / 1048576).toFixed(2) + " MB" : n >= 1024 ? (n / 1024).toFixed(1) + " KB" : n + " B";
            let lastPacketMs = global.metrics.lastPacketTime ? Math.max(0, Date.now() - global.metrics.lastPacketTime) : 0;
            drawText(watermarkText, x + len - versionLength - 4, y - 50 - 12 * 14 - 2, 15, watermarkColor, "right");
            drawText(global.version ?? "v?", x + len, y - 50 - 12 * 14 - 2, 15, color.guiwhite, "right");
            drawText(`§${global.serverStats.lag_color}§ ${(100 * gui.fps).toFixed(2)}% §reset§/ ` + global.serverStats.players + ` player${global.serverStats.players == 1 ? "" : "s"}`, x + len, y - 50 - 11 * 14, 10, color.guiwhite, "right");
            drawText(`Coordinates: (${xloc.toFixed(2)}, ${yloc.toFixed(2)})`, x + len, y - 50 - 10 * 14, 10, color.guiwhite, "right");
            drawText("Speed: " + tankSpeed.toFixed(2) + " gu/s", x + len, y - 50 - 9 * 14, 10, color.guiwhite, "right");
            drawText("Memory: " + global.metrics.rendergap.toFixed(1) + " MiB", x + len, y - 50 - 8 * 14, 10, color.guiwhite, "right");
            drawText(`Rendering: e ${global.renderingInfo.entities} t: ${global.renderingInfo.turretEntities} n: ${global.renderingInfo.entitiesWithName}`, x + len, y - 50 - 7 * 14, 10, color.guiwhite, "right");
            drawText(`WS sent: ${fmtData(global.bandwidth.totalHa)}`, x + len, y - 50 - 6 * 14, 10, color.guiwhite, "right");
            drawText(`WS received: ${fmtData(global.bandwidth.totalFa)}`, x + len, y - 50 - 5 * 14, 10, color.guiwhite, "right");
            drawText("Update Rate: " + global.metrics.updatetime + "Hz", x + len, y - 50 - 4 * 14, 10, color.guiwhite, "right");
            drawText("Prediction: " + Math.round(GRAPHDATA) + "ms", x + len, y - 50 - 3 * 14, 10, color.guiwhite, "right");
            drawText("Last packet: " + lastPacketMs + "ms ago", x + len, y - 50 - 2 * 14, 10, color.guiwhite, "right");
            drawText(`§${global.metrics.rendertime_color}§ ${global.metrics.rendertime} FPS §reset§/` + `§${global.serverStats.mspt_color}§ ${global.serverStats.mspt} mspt : ${global.metrics.mspt.toFixed(1)} gmspt`, x + len, y - 50 - 1 * 14, 10, color.guiwhite, "right");
            drawText(ping.toFixed(1) + " ms  " + global.serverStats.serverGamemodeName + " " + global.locationHash, x + len, y - 50, 10, color.guiwhite, "right");
        } else if (!global.GUIStatus.minimapReducedInfo) {
            drawText(watermarkText, x + len, y - 50 - 3 * 14 - 2, 15, watermarkColor, "right");
            drawText(global.serverStats.players + ` player${global.serverStats.players == 1 ? "" : "s"}`, x + len, y - 50 - 2 * 14, 10, color.guiwhite, "right");
            drawText(`§${global.metrics.rendertime_color}§ ${global.metrics.rendertime} FPS §reset§/` + `§${global.serverStats.mspt_color}§ ${global.serverStats.mspt} mspt`, x + len, y - 50 - 1 * 14, 10, color.guiwhite, "right");
            drawText(ping.toFixed(1) + " ms  " + global.serverStats.serverGamemodeName + " " + global.locationHash, x + len, y - 50, 10, color.guiwhite, "right");
        } else drawText(watermarkText, x + len, y - 22 - 2 * 14 - 2, 15, watermarkColor, "right");
    }

    function updateLeaderboard() {
        let now = performance.now();
        if (leaderboard.version !== leaderboardVersion) {
            leaderboardVersion = leaderboard.version;
            leaderboardBoard.update(leaderboard.latest, now, entry => ({ entry }));
        }
        leaderboardBoard.step(leaderboardTime ? (now - leaderboardTime) / 1000 : 0);
        leaderboardTime = now;
        return leaderboardBoard.fold(now);
    }

    function drawLeaderboard(spacing, alcoveSize, max) {
        let right = global.screenWidth,
            top = 0;
        if (global.mobile) {
            if (global.canUpgrade && 2 * 20 + gui.upgrades.length * (6.5 * 23 + 17) > 1.4 * (right - 260)) {
                top += (alcoveSize / 1.4) * mobileUpgradeGlide.get();
            }
            top += global.canSkill || global.showSkill ? (alcoveSize / 2.2 /*+ spacing * 2*/) * statMenu.get() : 0;
        }
        let titleOffset = leaderboardBoard.titleOffset() * 300;
        if (titleOffset < 300) drawHudText("Leaderboard", right - 130.5 + titleOffset, top + 35.5, 19, color.guiwhite, "center", 20 / 4.5);
        if (leaderboardPrefixes.size > 1000) leaderboardPrefixes.clear();
        for (let row of leaderboardBoard.held) {
            if (row.offset * 300 >= 262) continue;
            let entry = row.entry,
                x = right + row.offset * 300,
                y = top + 60 + 19 * row.rank,
                value = Math.round(row.shown),
                label = (entry.name ? entry.name + " - " : "") + entry.label;
            drawBar(x - 230.5, x - 30.5, y, 16, color.black);
            drawBar(x - 230.5, x - 30.5, y, 11, color.grey);
            drawBar(x - 230.5, x - 230.5 + 200 * Math.min(1, row.shown / max), y, 11, gameDraw.modifyColor(entry.bar, "mirror 0 1 0 false"));
            if (label.includes("#")) {
                label = label.replace("##", value.toString()).replace("#s", value === 1 ? "" : "s");
            } else {
                let number = abbreviate(value),
                    key = entry.name + "\n" + entry.label + "\n" + number.replace(/\d/g, "8"),
                    prefix = leaderboardPrefixes.get(key);
                if (prefix === undefined) {
                    ctx[2].font = "bold " + (11 + config.graphical.fontSizeBoost) + "px Ubuntu";
                    prefix = leaderboardPrefix(entry.name, entry.label, value, text => ctx[2].measureText(text).width);
                    leaderboardPrefixes.set(key, prefix);
                }
                label = prefix + number;
            }
            drawHudText(label, x - 130.5, y, 11, entry.nameColor == "#FFFFFF" ? color.guiwhite : entry.nameColor, "center", 12 / 4.5);
            if (entry.renderEntity) drawLeaderboardIcon(entry, x - 251.5, y);
        }
    }

    function drawLeaderboardIcon(entry, x, y) {
        let picture = util.requestEntityImage(entry.index, entry.color),
            position = picture.position,
            scale = 13.5 / position.axis,
            angle = -Math.PI / 4;
        x -= scale * (position.middle.x * Math.cos(angle) - position.middle.y * Math.sin(angle));
        y -= scale * (position.middle.x * Math.sin(angle) + position.middle.y * Math.cos(angle));
        drawEntity(picture.color, x, y, picture, 1, 1, scale / picture.size, 13.5 * 6 / 80 / Math.max(config.graphical.mininumBorderChunk, config.graphical.borderChunk), angle, true, ctx[2]);
    }

    function drawAvailableUpgrades(spacing, alcoveSize) {
        // Draw upgrade menu
        if (global.menu && global.menu.isOpen()) global.clickables.upgrade.hide();
        global.clickables.dailyTankUpgrade.hide();
        global.clickables.dailyTankAd.hide();
        if (gui.upgrades.length > 0) {
            let internalSpacing = 15;
            let len = alcoveSize / 2;
            let height = len;

            // Animation processing
            global.columnCount = Math.max(global.mobile ? 9 : 3, Math.floor(gui.upgrades.length ** 0.55));
            if (!global.canUpgrade) {
                upgradeMenu.force(-global.columnCount * 3)
                global.canUpgrade = true;
            } else
                if (global.pullUpgradeMenu) {
                    upgradeMenu.set(-global.columnCount * 3);
                } else upgradeMenu.set(0);
            let glide = upgradeMenu.get();

            upgradeSpin = Date.now() * 0.0005;
            upgradeSpin = upgradeSpin - (Math.floor(upgradeSpin / Math.PI / 2) * Math.PI * 2);

            let x = glide * 2 * spacing + spacing + 5;
            let y = spacing - height - 2.8 * internalSpacing + 5;
            let xStart = x;
            let initialX = x;
            let rowWidth = 0;
            let initialY = y;
            let ticker = 0;
            let upgradeNum = 0;
            let colorIndex = 0;
            let clickableRatio = global.canvas.height / global.screenHeight / global.ratio;
            let lastBranch = -1;
            let upgradeHoverIndex = global.clickables.upgrade.check({ x: global.mouse.x, y: global.mouse.y });

            for (let i = 0; i < gui.upgrades.length; i++) {
                let upgrade = gui.upgrades[i];
                let upgradeBranch = upgrade[0];
                let upgradeBranchLabel = upgrade[1] == "undefined" ? "" : upgrade[1];
                let model = upgrade[2];

                // Draw either in the next row or next column
                if (ticker === global.columnCount || upgradeBranch != lastBranch) {
                    x = xStart;
                    y += height + internalSpacing;
                    if (upgradeBranch != lastBranch) {
                        if (upgradeBranchLabel.length > 0) {
                            drawText(" " + upgradeBranchLabel, xStart, y + internalSpacing * 2, internalSpacing * 2.3, color.guiwhite, "left", false);
                            y += 3 * internalSpacing;
                        }
                        y += 1.8 * internalSpacing;
                        colorIndex = 0;
                    }
                    lastBranch = upgradeBranch;
                    ticker = 0;
                } else {
                    x += len + internalSpacing;
                }

                if (y > initialY) initialY = y;
                rowWidth = x;
                !(global.menu && global.menu.isOpen()) && global.clickables.upgrade.place(i, x * clickableRatio, y * clickableRatio, len * clickableRatio, height * clickableRatio);
                let upgradeKey = getKeybind(`KEY_UPGRADE_${upgradeNum + 1}`);

                drawEntityIcon(model, x, y, len, height, 1, upgradeSpin, 0.6, colorIndex++, !global.mobile ? upgradeKey : false, !global.mobile ? upgradeNum == upgradeHoverIndex : false);

                ticker++;
                upgradeNum++;
            }

            // Draw dont upgrade button
            let h = 20,
                textScale = (h - 0.9) - 6,
                msg = "Don't Upgrade",
                m = measureText(msg, textScale),
                buttonX = initialX + (rowWidth + len - initialX) / 2,
                buttonY = initialY + height + internalSpacing - 5;

            drawButton(buttonX, buttonY, m, h, 1, config.graphical.oldUIStyle ? "bar" : "rect", msg, textScale - 3.3, color.vlgrey, false, false, true, "skipUpgrades", clickableRatio, {
                index: 0
            });

            if (gui.dailyTank && gui.dailyTank.tank) {
                let image = util.requestEntityImage(gui.dailyTank.tank, gui.color);
                let hover = global.clickables.dailyTankUpgrade.check({ x: global.mouse.x, y: global.mouse.y });
                image.upgradeColor = "36 0 1 0 false";
                drawEntityIcon(image, xStart, initialY + height + internalSpacing + 50, len, height, 1, upgradeSpin, 0.4, 10, false, hover);
                drawText("Daily Tank!", xStart + 50, initialY + height + internalSpacing + 67, 12, gameDraw.getColor(36), "center");
                global.clickables.dailyTankUpgrade.set(xStart * clickableRatio, (initialY + height + internalSpacing + 50) * clickableRatio, len * clickableRatio, height * clickableRatio);
                gui.dailyTank.ads && drawButton(xStart + 50, initialY + height + internalSpacing + 160, m, h, 1, "rect", "Watch An Ad", textScale - 3.3, color.vlgrey, false, false, true, "dailyTankAd", clickableRatio, {
                    index: false
                });
            }

            // Upgrade tooltip
            if (upgradeHoverIndex > -1 && upgradeHoverIndex < gui.upgrades.length && !global.mobile) {
                let picture = gui.upgrades[upgradeHoverIndex][2];
                if (picture.upgradeTooltip.length > 0) {
                    let boxWidth = measureText(picture.name, alcoveSize / 10),
                        boxX = global.mouse.x * global.screenWidth / global.canvas.width + 2,
                        boxY = global.mouse.y * global.screenHeight / global.canvas.height + 2,
                        boxPadding = 6,
                        splitTooltip = picture.upgradeTooltip.split("\n"),
                        textY = boxY + boxPadding + alcoveSize / 10;

                    // Tooltip box width
                    for (let line of splitTooltip) boxWidth = Math.max(boxWidth, measureText(line, alcoveSize / 15));

                    // Draw tooltip box
                    gameDraw.setColor(ctx[2], color.dgrey);
                    ctx[2].lineWidth /= 1.5;
                    drawGuiRect(boxX, boxY, boxWidth + boxPadding * 3, alcoveSize * (splitTooltip.length + 1) / 10 + boxPadding * 3, false);
                    drawGuiRect(boxX, boxY, boxWidth + boxPadding * 3, alcoveSize * (splitTooltip.length + 1) / 10 + boxPadding * 3, true);
                    ctx[2].lineWidth *= 1.5;
                    drawText(picture.name, boxX + boxPadding * 1.5, textY, alcoveSize / 10, color.guiwhite);

                    for (let t of splitTooltip) {
                        textY += boxPadding + alcoveSize / 15
                        drawText(t, boxX + boxPadding * 1.5, textY, alcoveSize / 15, color.guiwhite);
                    }
                }
            }
        } else {
            global.canUpgrade = false;
            upgradeMenu.force(0);
            global.clickables.upgrade.hide();
            global.clickables.skipUpgrades.hide();
        }
    }

    // MOBILE UI FUNCTIONS
    function drawMobileJoysticks() {
        // Draw the joysticks.
        let radius = Math.min(
            global.mobileStatus.useBigJoysticks ? global.screenWidth * 0.8 : global.screenWidth * 0.6,
            global.mobileStatus.useBigJoysticks ? global.screenHeight * 0.16 : global.screenHeight * 0.12
        );

        ctx[2].globalAlpha = 0.3;
        ctx[2].fillStyle = "#FFFFFF";
        ctx[2].beginPath();
        ctx[2].arc(
            (global.screenWidth * 1) / 6,
            (global.screenHeight * 2) / 3,
            radius,
            0,
            2 * Math.PI
        );
        ctx[2].arc(
            (global.screenWidth * 5) / 6,
            (global.screenHeight * 2) / 3,
            radius,
            0,
            2 * Math.PI
        );
        ctx[2].fill();
        ctx[2].globalAlpha = 0.5;
        ctx[2].fillStyle = "#FFFFFF";
        ctx[2].beginPath();
        if (global.mobileStatus.showJoysticks && global.canvas.movementTouchPos) {
            ctx[2].arc(
                global.canvas.movementTouchPos.x + (global.screenWidth * 1) / 6,
                global.canvas.movementTouchPos.y + (global.screenHeight * 2) / 3,
                radius / 2.5,
                0,
                2 * Math.PI
            );
            ctx[2].arc(
                global.canvas.controlTouchPos.x + (global.screenWidth * 5) / 6,
                global.canvas.controlTouchPos.y + (global.screenHeight * 2) / 3,
                radius / 2.5,
                0,
                2 * Math.PI
            );
        }
        ctx[2].fill();

        // crosshair
        drawCrosshair();
    };

    function drawCrosshair() {
        if (global.mobileStatus.showCrosshair && (global.mobileStatus.enableCrosshair || global.gamepadMode)) {
            const crosshairpos = {
                x: global.screenWidth / 2 + global.player.target.x,
                y: global.screenHeight / 2 + global.player.target.y
            };
            ctx[2].lineWidth = 1;
            ctx[2].globalAlpha = 1;
            gameDraw.setColor(ctx[2], color.black);
            ctx[2].beginPath();
            ctx[2].moveTo(crosshairpos.x, crosshairpos.y - 20);
            ctx[2].lineTo(crosshairpos.x, crosshairpos.y + 20);
            ctx[2].moveTo(crosshairpos.x - 20, crosshairpos.y);
            ctx[2].lineTo(crosshairpos.x + 20, crosshairpos.y);
            ctx[2].closePath();
            ctx[2].stroke();
        }
    }
    //this operator mobile keyboard took me hours like glitches, goofy buttons and settings cant click bug ;-; (Mehmet303j)
    function drawOperatorKeyboard(spacing, alcoveSize) {
    global.clickables.operatorKeys.hide();
    if (!global.hasOperator) return;

    let index = 1;
    let clickableRatio = global.canvas.height / global.screenHeight / global.ratio;
    let upgradeColumns = Math.ceil(gui.upgrades.length / 9);

    let yOffset = 0;
    yOffset += global.canUpgrade ? (alcoveSize / 1.5) * mobileUpgradeGlide.get() * upgradeColumns / 1.5 + spacing * (upgradeColumns + 1.55) + -17.5 : 0;
    yOffset += global.canSkill || global.showSkill ? statMenu.get() * alcoveSize / 2.6 + spacing / 0.75 : 0;

    let baseSize = (alcoveSize - spacing * 2) / 3;
    const toggleSize = baseSize;
    const toggleX = alcoveSize + spacing * 2 + baseSize + spacing;
    const toggleY = yOffset + spacing;

    // Toggle butonu, operatorKeys grubunda ama index 0 sabit (tuşlar 1'den başlıyor, çakışmıyor)
    global.clickables.operatorKeys.place(0, toggleX * clickableRatio, toggleY * clickableRatio, toggleSize * clickableRatio, toggleSize * clickableRatio);

    ctx[2].fillStyle = global.operatorKeyboard.open ? color.guiwhite : color.grey;
    drawGuiRect(toggleX, toggleY, toggleSize, toggleSize);
    ctx[2].globalAlpha = 1;
    drawText("`", toggleX + toggleSize / 2, toggleY + toggleSize / 2, toggleSize * 0.6, color.guiwhite, "center", true);
    ctx[2].strokeStyle = color.black;
    ctx[2].lineWidth = 3;
    drawGuiRect(toggleX, toggleY, toggleSize, toggleSize, true);

    if (!global.operatorKeyboard.open) return;

    const columns = 12;
    const startX = toggleX + toggleSize + spacing;
    const startY = toggleY;
    const keySize = Math.min(38, (global.screenWidth - startX - spacing) / columns - spacing);
    const rowHeight = keySize + spacing;

    for (let row = 0; row < global.operatorKeyboardRows.length; row++) {
        const keys = global.operatorKeyboardRows[row];
        for (let col = 0; col < keys.length; col++) {
            const key = keys[col];
            const x = startX + col * (keySize + spacing);
            const y = startY + row * rowHeight;

            global.clickables.operatorKeys.place(index, x * clickableRatio, y * clickableRatio, keySize * clickableRatio, keySize * clickableRatio);

            const armed = key.prefix && global.operatorKeyboard.prefix === key.prefix;
            const usable = key.code || key.prefix || (global.operatorKeyboard.prefix && key[global.operatorKeyboard.prefix]);
            ctx[2].globalAlpha = usable ? 0.5 : 0.2;
            ctx[2].fillStyle = armed ? color.guiwhite : color.grey;
            drawGuiRect(x, y, keySize, keySize);
            ctx[2].globalAlpha = usable ? 1 : 0.4;
            drawText(key.label, x + keySize / 2, y + keySize / 2, keySize * 0.55, armed ? color.black : color.guiwhite, "center", true);
            ctx[2].strokeStyle = color.black;
            ctx[2].lineWidth = 2;
            drawGuiRect(x, y, keySize, keySize, true);
            index++;
        }
    }
    ctx[2].globalAlpha = 1;
}
    function drawMobileButtons(spacing, alcoveSize) {
        let makeButton = (index, x, y, width, height, text, clickableRatio) => {
            // Set the clickable's position
            global.clickables.mobileButtons.place(index, x * clickableRatio, y * clickableRatio, width * clickableRatio, height * clickableRatio);

            // Draw boxes
            ctx[2].globalAlpha = 0.5;
            ctx[2].fillStyle = color.grey;
            drawGuiRect(x, y, width, height);
            ctx[2].globalAlpha = 0.1;
            ctx[2].fillStyle = color.black;
            drawGuiRect(x, y + height * 0.6, width, height * 0.4);
            ctx[2].globalAlpha = 1;

            // Draw text
            drawText(text, x + width / 2, y + height * 0.5, height * 0.6, color.guiwhite, "center", true);

            // Draw the borders
            ctx[2].strokeStyle = color.black;
            ctx[2].lineWidth = 3;
            drawGuiRect(x, y, width, height, true);
        }

        let makeButtons = (buttons, startX, startY, baseSize, clickableRatio, spacing) => {
            let x = startX, y = startY, index = 0;

            for (let row = 0; row < buttons.length; row++) {
                for (let col = 0; col < buttons[row].length; col++) {
                    makeButton(buttons[row][col][3] ?? index, x, y, baseSize * (buttons[row][col][1] ?? 1), baseSize * (buttons[row][col][2] ?? 1), buttons[row][col][0], clickableRatio);
                    x += baseSize * (buttons[row][col][1] ?? 1) + spacing;
                    index++;
                }

                x = startX;
                y += Math.max(...buttons[row].map(b => baseSize * (b[2] ?? 1))) + spacing;
            }
        }
        if (global.clickables.mobileButtons.active == null) global.clickables.mobileButtons.active = false;
        if (global.clickables.mobileButtons.altFire == null) global.clickables.mobileButtons.altFire = false;

        // Hide the buttons
        global.clickables.mobileButtons.hide();

        // Some animations.
        mobileUpgradeGlide.set(0 + (global.canUpgrade || global.upgradeHover));

        // Some sizing variables
        let clickableRatio = global.canvas.height / global.screenHeight / global.ratio;
        let upgradeColumns = Math.ceil(gui.upgrades.length / 9);
        let yOffset = 0;
        if (global.mobile) {
            yOffset += global.canUpgrade ? (alcoveSize / 1.5 /*+ spacing * 2*/) * mobileUpgradeGlide.get() * upgradeColumns / 1.5 + spacing * (upgradeColumns + 1.55) + -17.5 : 0;
            yOffset += global.canSkill || global.showSkill ? statMenu.get() * alcoveSize / 2.6 + spacing / 0.75 : 0;
        }
        let buttons;
        let baseSize = (alcoveSize - spacing * 2) / 3;

        if (global.mobile) {
            buttons = global.clickables.mobileButtons.active ? [
                [[global.clickables.mobileButtons.active ? "-" : "+"], [`Alt ${global.clickables.mobileButtons.altFire ? "Manual" : "Disabled"}`, 6], [`${!document.fullscreenElement ? "Full" : "Exit Full"} Screen`, 5]],
                [["Autofire", 3.5], ["Reverse", 3.5], ["Self-Destruct", 5]],
                [["Autospin", 3.5], ["Override", 3.5], ["Level Up", 5]],
                [["Action", 3.5], ["Special", 3.5], ["Chat", 5]],
            ] : [
                [[global.clickables.mobileButtons.active ? "-" : "+"]],
            ];
        }
        if (global.clickables.mobileButtons.altFire) buttons.push([["\u2756", 2, 2]]);

        let len = alcoveSize;
        makeButtons(buttons, len + spacing * 2, yOffset + spacing, baseSize, clickableRatio, spacing);
    }

    function drawMobileSkillUpgrades(spacing, alcoveSize) {
        global.canSkill = gui.points > 0 && gui.skills.some(s => s.amount < s.cap) && !global.canUpgrade;
        global.showSkill = !global.canUpgrade && !global.canSkill && global.died;
        statMenu.set(global.canSkill || global.showSkill || global.disconnected ? 1 : 0);
        let n = statMenu.get();
        global.clickables.stat.hide();
        let t = alcoveSize / 2,
            q = alcoveSize / 3,
            x = 2 * n * spacing - spacing,
            statNames,
            clickableRatio = global.canvas.height / global.screenHeight / global.ratio;

            try {
                statNames = gui.getStatNames(global.mockups[parseInt(gui.type.split("-")[0])].statnames);
            } catch (e) {
                statNames = gui.getStatNames(global.missingno[0].statnames);
            }

        if (global.canSkill || global.showSkill) {
            for (let i = 0; i < gui.skills.length; i++) {
                let skill = gui.skills[i],
                    softcap = skill.softcap;

                if (softcap <= 0) continue;

                let amount = skill.amount,
                    skillColor = color[skill.color],
                    cap = skill.cap,
                    name = statNames[9 - i].split(/\s+/),
                    halfNameLength = Math.floor(name.length / 2),
                    [name1, name2] = name.length === 1 ? [name[0], null] : [name.slice(0, halfNameLength).join(" "), name.slice(halfNameLength).join(" ")];

                ctx[2].globalAlpha = 0.5;
                ctx[2].fillStyle = skillColor;
                drawGuiRect(x, spacing, t, 2 * q / 3);

                ctx[2].globalAlpha = 0.1;
                ctx[2].fillStyle = color.black;
                drawGuiRect(x, spacing + q * 2 / 3 * 2 / 3, t, q * 2 / 3 / 3);

                ctx[2].globalAlpha = 1;
                ctx[2].fillStyle = color.guiwhite;
                drawGuiRect(x, spacing + q * 2 / 3, t, q / 3);

                ctx[2].fillStyle = skillColor;
                drawGuiRect(x, spacing + q * 2 / 3, t * amount / softcap, q / 3);

                ctx[2].strokeStyle = color.black;
                ctx[2].lineWidth = 1;
                for (let j = 1; j < cap; j++) {
                    let width = x + j / softcap * t;
                    drawGuiLine(width, spacing + q * 2 / 3, width, spacing + q);
                }

                cap === 0 || !gui.points || softcap !== cap && amount === softcap || global.clickables.stat.place(9 - i, x * clickableRatio, spacing * clickableRatio, t * clickableRatio, q * clickableRatio);

                if (name2) {
                    drawText(name2, x + t / 2, spacing + q * 0.55, q / 5, color.guiwhite, "center");
                    drawText(name1, x + t / 2, spacing + q * 0.3, q / 5, color.guiwhite, "center");
                } else {
                    drawText(name1, x + t / 2, spacing + q * 0.425, q / 5, color.guiwhite, "center");
                }

                if (amount > 0) {
                    drawText(`+${amount}`, x + t / 2, spacing + q * 1.3, q / 4, skillColor, "center");
                }

                ctx[2].strokeStyle = color.black;
                ctx[2].globalAlpha = 1;
                ctx[2].lineWidth = 3;
                drawGuiLine(x, spacing + q * 2 / 3, x + t, spacing + q * 2 / 3);
                drawGuiRect(x, spacing, t, q, true);

                x += n * (t + 14);
            }

            if (gui.points > 1) {
                drawText(`x${gui.points}`, x, spacing + 20, 20, color.guiwhite, "left");
            }
        }
    }; // END OF MOBILE FUNCTIONS

    let ichatInput = 0;
    function drawChatInput(x, y, instance, ratio, isize) {
        if (global.showChat === 0 || !global.canvas.chatBox) return;
        if (instance.id === gui.playerid) {
            let size = isize * ratio,
                g = Math.max(20, size);

            if (!global.showChat) {
                if (ichatInput === 0) chatInput.force(0);
                if (ichatInput >= 200) return;
                ichatInput++;
            } else if (ichatInput) {
                ichatInput = 0;
                chatInput.force(0);
            }
            if (global.died && global.showChat) {
                global.canvas.chatBox.blur();
                global.canvas.cv.focus();
                global.showChat = false;
                if (global.canvas.chatBox.value) global.canvas.chatBox.value = "";
            }

            chatInput.set(1);
            global.showChatGlide = global.showChat ? chatInput.get() : 1 - chatInput.get();
            x += global.screenWidth / 2;
            y += global.screenHeight / 2;
            let boxLengthHalf = (10.49 * g) / 2;
            global.canvas.chatBox.loadedProperly = true;
            // Box drawing
            global.canvas.chatBox.style.color = color.black;
            global.canvas.chatBox.style.backgroundColor = color.guiwhite;
            global.canvas.chatBox.style.borderColor = color.black;
            global.canvas.chatBox.style.borderWidth = 0.1 * g + "px";
            global.canvas.chatBox.style.opacity = global.showChatGlide;
            global.canvas.chatBox.style.width = (boxLengthHalf * 2 + 0.75 * g) / global.screenWidth * 100 + `%`;
            global.canvas.chatBox.style.height = 0.95 * g + "px";
            global.canvas.chatBox.style.left = (x - boxLengthHalf - 0.75 * g / 2) / global.screenWidth * 100 + `%`;
            global.canvas.chatBox.style.top =  (y - g * (2.26) - 0.55 * g) / global.screenWidth * window.innerWidth + "px";
            // Input
            global.canvas.chatInput.style.opacity = global.showChatGlide;
            global.canvas.chatInput.style["font-size"] = 0.5 * g + "px";
            global.canvas.chatInput.style.color = color.black;
            global.canvas.chatInput.style.width = (boxLengthHalf * 2 + 0.35 * g) / global.screenWidth * 100 + `%`;
            global.canvas.chatInput.style.height = 0.95 * g + "px";
            global.canvas.chatInput.style.left = (x - boxLengthHalf - 0.35 * g / 2) / global.screenWidth * 100 + `%`;
            global.canvas.chatInput.style.top =  (y - g * (2.26) - 0.55 * g) / global.screenWidth * window.innerWidth + "px";
            if (global.canvas.chatBox && global.showChatGlide < 0.005 && !global.showChat) chatInput.force(0), global.canvas.chatInput.remove(), global.canvas.chatBox.remove(), global.canvas.chatBox = false;
        }
    }
    let drawAdScreen = () => {
        gameDraw.setColor(ctx[2], "#000");
        ctx[2].globalAlpha = 0.8;
        drawGuiRect(0, 0, global.screenWidth, global.screenHeight);
        let width = global.dailyTankAd.width;
        let height = global.dailyTankAd.height;
        let x = (global.screenWidth - width) / 2;
        let y = (global.screenHeight - height) / 2;
        ctx[2].globalAlpha = 1;
        gameDraw.setColor(ctx[2], "#000");
        drawGuiRect(x, y, width, height);
        gameDraw.setColor(ctx[2], color.grey);
        ctx[2].lineWidth = 3;
        drawGuiRect(x, y, width, height, true);
        if (global.dailyTankAd.readyToRender) {
            ctx[2].imageSmoothingEnabled = true;
            ctx[2].drawImage(global.dailyTankAd.render, x + 1.7, y + 1.7, width - 3.5, height - 3.6);
            ctx[2].imageSmoothingEnabled = false;
            if (global.dailyTankAd.isVideo) {
                if (!global.dailyTankAd.videoBar) {
                    global.dailyTankAd.videoBar = AdvancedSmoothBar(0, 4, 1);
                    global.dailyTankAd.videoBar.set(0);
                }
                const duration = global.dailyTankAd.render.duration;
                global.dailyTankAd.videoBar.set(global.dailyTankAd.render.currentTime);
                gameDraw.setColor(ctx[2], "#eafc47");
                drawGuiRect(x + 1.8, y + height - 22, (Math.min(width, global.dailyTankAd.render.currentTime * width / duration - 4)), 20.2);
            }
            if (global.dailyTankAd.closeable) {
                if (!global.dailyTankAd.closebtnAnim) {
                    global.dailyTankAd.closebtnAnim = AdvancedSmoothBar(0, 0.3, 1);
                    setTimeout(() => {
                        global.dailyTankAd.closebtnAnim.set(1);
                    }, 1000)
                }
                drawButton(x + width - 25, y + 7, 35, 35, global.dailyTankAd.closebtnAnim.get(), "rect", "✕", 24, color.red, color.red, false, true, "dailyTankCloseAd", global.canvas.height / global.screenHeight / global.ratio, {
                    index: false
                });
            }
        } else {
            drawText("Loading...", global.screenWidth / 2, global.screenHeight / 2, 40, "#fff", "center", false, 1, false);
        }
        let wwidth = global.dailyTankAd.width + 2;
        let hheight = 35;
        gameDraw.setColor(ctx[2], "#828282");
        ctx[2].globalAlpha = 0.5;
        drawGuiRect(x - 1.5, y + height + 10, wwidth, hheight);
        ctx[2].globalAlpha = 1;
        drawText("Watch this ad to get your reward!", x + wwidth / 2, y + height + 34, 20, "#fff", "center", false, 1, false);
    }

    let getKills = () => {
        let finalKills = {
            " kills": [Math.round(global.finalKills[0].get()), 1],
            " assists": [Math.round(global.finalKills[1].get()), 0.5],
            " visitors defeated": [Math.round(global.finalKills[2].get()), 3],
            " polygons destroyed": [Math.round(global.finalKills[3].get()), 0.05],
        }, killCountTexts = [];
        let destruction = 0;
        for (let key in finalKills) {
            if (finalKills[key][0]) {
                destruction += finalKills[key][0] * finalKills[key][1];
                killCountTexts.push(finalKills[key][0] + key);
            }
        }
        return (
            (destruction === 0 ? "🌼"
                : destruction < 4 ? "🎯"
                    : destruction < 8 ? "💥"
                        : destruction < 15 ? "💢"
                            : destruction < 25 ? "🔥"
                                : destruction < 50 ? "💣"
                                    : destruction < 75 ? "👺"
                                        : destruction < 100 ? "🌶️" : "💯"
            ) + " " + (!killCountTexts.length ? "A true pacifist" :
                killCountTexts.length == 1 ? killCountTexts.join(" and ") :
                    killCountTexts.slice(0, -1).join(", ") + " and " + killCountTexts[killCountTexts.length - 1])
        );
    };

    let getDeath = () => {
        let txt = "";
        if (global.finalKillers.length) {
            txt = "🔪 Succumbed to";
            for (let e of global.finalKillers) {
                txt += " " + util.addArticle(util.getEntityImageFromMockup(e).name) + " and";
            }
            txt = txt.slice(0, -4);
        } /*else if () { //todo: check for self-destruct
            txt += "💣 Self-destruct completed";
        }*/ else {
            txt += "⛈  Vanished into thin air";
        }
        return txt;
    };

    let getTips = () => {
        let txt = "❓ ";
        if (global.finalKillers.length) {
            txt += "lol you died";
        } else if (!global.autolvlUp) {
            txt += "Enable auto-level up in the options menu to get level 45";
        } else {
            txt += "Kill players and polygons to get more score";
        }
        return txt;
    };

    const gameDrawDead = () => {
        let glide = global.deathAnimation.get();
        let x = global.screenWidth / 2,
            y = Math.min(global.screenHeight / 2 - 60, global.screenHeight - 500) - 800 * (1 - global.lerp(0, 1, glide)),
            len = 140,
            position = global.mockups[parseInt(gui.type.split("-")[0])].position,
            scale = len / position.axis,
            xx = global.screenWidth / 2 - scale * position.middle.x * 0.707,
            yy = y + scale * position.middle.y * Math.SQRT1_2,
            picture = util.getEntityImageFromMockup(gui.type, gui.color),
            baseColor = picture.color,
            name = global.player.name.substring(7, global.player.name.length + 1),
            timestamp = Math.floor(global.deathTimestamp || Date.now());

        clearScreen(color.black, 0.1 + 0.15 * global.lerp(0, 0.5, glide), ctx[2]);
        let ratio = util.getScreenRatio();
        scaleScreenRatio(ratio, true);
        drawEntity(baseColor, (xx - 191 - len / 2 + 0.5) | 0, (yy - -26 + 0.5) | 0, picture, 1.5, 1, (0.5 * scale) / picture.realSize, 1, -Math.PI / 4, true, ctx[2]);
        drawText("Level " + gui.__s.getLevel(), x - 270, y + 100, 12, color.guiwhite, "center");
        drawText(picture.name, x - 270, y + 125, 18, color.guiwhite, "center");
        drawText(new Date(timestamp).toISOString() + "", x, y - 164, 8.125, color.guiwhite, "center");
        drawText(name == "" ? "Your Score: " : name + "'s Score: ", x - 170, y - 50, 23.75, color.guiwhite);
        drawText(util.formatLargeNumber(Math.round(global.finalScore.get())), x - 170, y + 11, 48, color.guiwhite);
        ctx[2].globalAlpha = global.lerp(1, 1.25, glide);
        drawText("⌚ Survived for " + util.timeForHumans(Math.round(global.finalLifetime.get())), x - 170, y + 50, 14, color.guiwhite);
        ctx[2].globalAlpha = global.lerp(1.25, 1.5, glide);
        drawText(getKills(), x - 170, y + 75, 14, color.guiwhite);
        ctx[2].globalAlpha = global.lerp(1.5, 1.75, glide);
        drawText(getTips(), x - 170, y + 100, 14, color.guiwhite);
        ctx[2].globalAlpha = global.lerp(1.75, 2, glide);
        drawText(getDeath(), x - 170, y + 125, 14, color.guiwhite);
        ctx[2].globalAlpha = global.lerp(2, 2.25, glide);
        drawText("📋 The server was " + (100 * gui.fps).toFixed(0) + "%" + " active", x - 170, y + 150, 14, color.guiwhite);
        ctx[2].globalAlpha = global.lerp(3, 3.25, glide);
        if (global.cannotRespawn || global.mobile || global.gamepadMode) drawText(global.cannotRespawn ?
            global.respawnTimeout ?
            "(you may respawn in " + global.respawnTimeout + " second" + `${global.respawnTimeout <= 1 ? "" : "s"}` + ")"
            : "(you cannot respawn)"
            : global.mobile ?
            "(tap to respawn)"
            : global.gamepadMode ?
            "(Press RT or R2 button to respawn)"
            : "",
            x, y + 189, 16, color.guiwhite, "center");
        if (!global.disconnected && !global.cannotRespawn) {
            if (!global.mobile && !global.gamepadMode) {
                drawButton(x - 75, y + 198, 120, 30, global.lerp(3, 3.25, glide), "rect", "Back", 14, false, false, false, true, "exitGame", global.canvas.height / global.screenHeight / global.ratio, {
                    index: 0
                });
                drawButton(x + 75, y + 198, 120, 30, global.lerp(3, 3.25, glide), "rect", "Respawn", 14, false, false, false, true, "deathRespawn", global.canvas.height / global.screenHeight / global.ratio, {
                    index: 0
                });
            } else drawButton(x, y + 198, 120, 30, global.lerp(3, 3.25, glide), "rect", "Back", 18, false, false, false, true, "exitGame", global.canvas.height / global.screenHeight / global.ratio, {
                index: 0
            });
        }
    };

    const applyScreenShake = (type = "camera", returnOption = false) => {
        let properties = type == "gui" ? config.graphical.shakeProperties.UIShake : config.graphical.shakeProperties.CameraShake;
        var cdx = 0;
        var cdy = 0;
        if (properties.shakeStartTime == -1) return;
        var dt = Date.now() - properties.shakeStartTime;
        if (dt > properties.shakeDuration) {
            properties.shakeStartTime = -1;
            properties.shakeDuration = -1;
            properties.shakeAmount = -1;
            return;
        }
        var easingCoef = dt / properties.shakeDuration;
        var easing = Math.pow(easingCoef - 1, 3);
        cdx = easing * (Math.cos(dt * 0.1) + Math.cos(dt * 0.3115)) * Math.random() * properties.shakeAmount;
        cdy = easing * (Math.sin(dt * 0.05) + Math.sin(dt * 0.3115)) * Math.random() * properties.shakeAmount;
        if (properties.keepShake && dt > 100) properties.shakeStartTime = Date.now();
        if (cdx == 0 && cdy == 0) return;
        if (returnOption) return {
            dx: cdx,
            dy: cdy,
        }
        global.player.renderx += cdx;
        global.player.rendery += cdy;
    }
    const drawGameplay = (tick, ratio) => {
        // Prep stuff
        global.metrics.rendertimes++;
        global.GRAPHDATA = 0;
        let tickMotion = lasttick ? tick - lasttick : null;
        lasttick = tick;
        let motion = compensation();
        motion.set();
        global.GRAPHDATA = motion.getPrediction();
        // Move the camera
        // Don't move the camera if you're dead. This helps with jitter issues
        let playerx = global.player.animX.get(tick);
        let playery = global.player.animY.get(tick);
        if (config.graphical.lerpAnimations) {
            global.player.renderx = util.lerp(global.player.renderx, global.player.cx.x, 0.1, true);
            global.player.rendery = util.lerp(global.player.rendery, global.player.cy.y, 0.1, true);
        } else if (config.graphical.smoothcamera && config.graphical.shakeProperties.CameraShake.shakeStartTime == -1) {
            let n = null == tickMotion ? 0 : 0.99 ** tickMotion;
            global.player.renderx = global.player.renderx * n + playerx * (1 - n);
            global.player.rendery = global.player.rendery * n + playery * (1 - n);
        } else if (!config.graphical.interpolation) {
            global.player.renderx = motion.predict(global.player.lastx, global.player.cx.x, global.player.lastvx, global.player.vx),
            global.player.rendery = motion.predict(global.player.lasty, global.player.cy.y, global.player.lastvy, global.player.vy);
        } else {
            global.player.renderx = playerx;
            global.player.rendery = playery;
        }
        if (config.graphical.shakeProperties.CameraShake.shakeStartTime !== -1) applyScreenShake();
        global.player.cx.animX = playerx;
        global.player.cy.animY = playery;
        let px = ratio * global.player.renderx,
            py = ratio * global.player.rendery;

        let spacing = 20;
        //draw the in game stuff
        drawFloor(px, py, ratio, tick);
        drawEntities(px, py, ratio, tick, spacing);
    };

    const drawGUI = (tick, scaleRatio) => {
        scaleScreenRatio(scaleRatio, true);
        let ratio = util.getScreenRatio();
        //draw hud
        let spacing = 20;
        let alcoveSize = 200 / ratio; // drawRatio * global.screenWidth;
        gui.__s.update();
        let max = updateLeaderboard();
        global.canSkill = !!gui.points && !global.showTree && !global.pullSkillBar;
        let shake = false;
        if (config.graphical.shakeProperties.UIShake.shakeStartTime !== -1) shake = applyScreenShake("gui", true);
        if (shake) ctx[2].translate(shake.dx, shake.dy);
       if (global.mobile) { // MOBILE UI
            drawMobileJoysticks();
            drawMobileButtons(spacing, alcoveSize);
            drawOperatorKeyboard(spacing, alcoveSize); // ` button + sandbox keyboard for sandbox etc.
        }
        if (global.gamepadMode) drawCrosshair();
        if (global.GUIStatus.renderGUI) {
            drawMessages(spacing, alcoveSize);
            if (global.GUIStatus.renderUpgrades) drawSkillBars(spacing, alcoveSize);
            if (global.GUIStatus.renderPlayerBars) drawSelfInfo(max);
            drawMinimapAndDebug(spacing, alcoveSize, global.GRAPHDATA, tick);
            if (global.GUIStatus.renderLeaderboard) drawLeaderboard(spacing, alcoveSize, max);
            if (global.GUIStatus.renderUpgrades) drawAvailableUpgrades(spacing, alcoveSize);
        } else if (global.GUIStatus.renderUpgrades) drawAvailableUpgrades(spacing, alcoveSize);
        if (global.showTree) {
            drawUpgradeTree();
        }
        if (shake) ctx[2].translate(-shake.dx, -shake.dy);
        global.metrics.lastrender = getNow();
    }

    const PERSONAL_THEMES_KEY = "personalThemes";
    function loadPersonalThemes() {
        let list = [];
        try { list = JSON.parse(localStorage.getItem(PERSONAL_THEMES_KEY) || "[]"); } catch { }
        return Array.isArray(list) ? list.filter((t) => t && t.content) : [];
    }
    function savePersonalThemes(list) {
        try { localStorage.setItem(PERSONAL_THEMES_KEY, JSON.stringify(list)); } catch { }
    }

    function themeCode(palette, name, author) {
        const bytes = [0x6a, 0xba, 0xda, 0xb3, 0xf0, 1];
        const push = (str) => { bytes.push(str.length); for (const c of str) bytes.push(c.charCodeAt(0)); };
        push(name || "");
        push(author || "");
        bytes.push(THEME_PALETTE_KEYS.length);
        for (const k of THEME_PALETTE_KEYS) {
            const v = parseInt((palette[k] || "#000000").slice(1), 16);
            bytes.push((v >> 16) & 0xff, (v >> 8) & 0xff, v & 0xff);
        }
        const special = [palette.black || "#484848"];
        bytes.push(special.length);
        for (const hex of special) {
            const v = parseInt(hex.slice(1), 16);
            bytes.push((v >> 16) & 0xff, (v >> 8) & 0xff, v & 0xff);
        }
        const blend = typeof palette.border === "number" ? palette.border : 0.65;
        bytes.push(blend >= 1 ? 255 : blend <= 0 ? 0 : Math.floor(blend * 0x100));
        bytes.push(palette.neon ? 1 : 0);
        let bin = "";
        for (const b of bytes) bin += String.fromCharCode(b);
        return btoa(bin).replace(/=+$/, "");
    }


    global.refreshBrainrotOption = () => {
        const select = document.getElementById("optNames");
        if (!select) return;
        const enabled = localStorage.getItem("optBrainrotFilterChecked") === "true";
        const option = select.querySelector('option[value="brainrot"]');
        if (enabled && !option) {
            const created = document.createElement("option");
            created.value = "brainrot";
            created.textContent = 'Filter "Brainrot" Words';
            select.appendChild(created);
        } else if (!enabled && option) {
            if (select.value === "brainrot") select.value = "none";
            option.remove();
        }
    };
    global.refreshBrainrotOption();
    global.refreshSecretThemes = () => {
        const select = document.getElementById("optColors");
        if (!select) return;
        const enabled = localStorage.getItem("optLegacyThemesChecked") === "true";
        for (const option of select.querySelectorAll("option[data-secret-theme]")) {
            option.hidden = option.disabled = !enabled;
        }
        if (!enabled && select.selectedOptions[0]?.hidden) select.value = "normal";
    };
    global.applyCrosshairCursor = () => {
        const enabled = localStorage.getItem("optCrosshairCursorChecked") === "true";
        document.body.classList.toggle("crosshair-cursor", enabled);
    };
    global.applyCrosshairCursor();


    let themeVersion = 0, themeCache = null;
    function themeOptions() {
        let list = [];
        for (let option of document.getElementById("optColors").options) {
            if (option.value === "custom" || option.hidden) continue;
            let match = option.textContent.match(/^(.*?)(?: \(by (.*)\))?$/);
            list.push({ value: option.value, name: match[1], author: match[2] || "" });
        }
        loadPersonalThemes().forEach((theme, i) => list.push({ value: "p" + i, name: theme.name, author: theme.author || "", personal: i }));
        list.push({ value: "custom", name: "Custom", author: "" });
        return list;
    }
    function themeState() {
        if (themeCache && themeCache.version === themeVersion) return themeCache;
        let value = document.getElementById("optColors").value;
        let list = themeOptions();
        let personal = value === "custom" ? parseInt(localStorage.getItem("optPersonalTheme") || "-1", 10) : -1;
        let entry = value === "custom" ? list.find((t) => personal >= 0 && t.personal === personal) : list.find((t) => t.value === value);
        let parsed = value === "custom" ? parseTheme(document.getElementById("optCustom").value, false) : null;
        let palette = gameDraw.color || colors.normal;
        let state = {
            version: themeVersion,
            value: entry ? entry.value : "custom",
            personal: entry && entry.personal !== undefined ? entry.personal : -1,
            custom: value === "custom" && !(entry && entry.personal !== undefined),
            name: entry ? entry.name : parsed && parsed.content ? parsed.name : "Custom",
            author: entry ? entry.author : parsed && parsed.content ? parsed.author : "",
            colors: {},
            blend: typeof palette.border === "number" ? palette.border : 0.6,
            neon: !!palette.neon
        };
        for (let key of THEME_PALETTE_KEYS) state.colors[key] = palette[key];
        state.code = themeCode(palette, state.name, state.author);
        themeCache = state;
        return state;
    }
    function setCustomTheme(code, personal = -1) {
        document.getElementById("optColors").value = "custom";
        document.getElementById("optCustom").value = code;
        localStorage.setItem("optPersonalTheme", personal);
        util.submitToLocalStorage("optColors");
        util.submitToLocalStorage("optCustom");
        loadSettings();
    }
    function editTheme(changes, name, author) {
        let state = themeState();
        let palette = Object.assign({}, state.colors, { border: state.blend, neon: state.neon }, changes);
        setCustomTheme(themeCode(palette, name ?? state.name, author ?? state.author));
    }
    function pickTheme(value) {
        localStorage.setItem("optPersonalTheme", -1);
        document.getElementById("optColors").value = value;
        util.submitToLocalStorage("optColors");
        loadSettings();
    }
    function menuHooks() {
        return {
            colors: () => gameDraw.color || colors.normal,
            save: (id) => util.submitToLocalStorage(id),
            apply: () => loadSettings(),
            borderThickness: (t) => {
                config.graphical.borderChunk = 0.7 + 5.3 * t;
            },
            token: () => document.getElementById("playerKeyInput").dispatchEvent(new Event("input")),
            rainbow: (on) => {
                config.game.rainbowTeamColors = on;
            },
            localhost: (on) => {
                if (!Array.isArray(global.servers) || !global.servers.length) return;
                let list = global.servers.filter((server) => server.ip !== "localhost:5000");
                if (on) {
                    list.unshift({
                        id: list.some((server) => server.id === "x") ? "localhost" : "x",
                        ip: "localhost:5000",
                        players: 0,
                        maxPlayers: 80,
                        featured: false,
                        hidden: false,
                        private: false,
                        region: "Local",
                        location: "Localhost",
                        gameMode: "Private"
                    });
                }
                global.servers = list;
                document.getElementById("serverFilterRegion").innerHTML = "";
                document.getElementById("serverFilterMode").innerHTML = "";
                global.loadServerSelector(list);
            },
            requestPlayers: () => {
                if (global.socket && global.socket.talk) global.socket.talk("pl");
            },
            playerAction: (id, action) => {
                if (global.socket && global.socket.talk) global.socket.talk("pa", id, action);
            },
            drawTank: (context, index, tint, x, y, size, alpha) => {
                let picture = util.requestEntityImage(index, tint),
                    position = picture.position,
                    scale = size / position.axis,
                    angle = -Math.PI / 4;
                x -= scale * (position.middle.x * Math.cos(angle) - position.middle.y * Math.sin(angle));
                y -= scale * (position.middle.x * Math.sin(angle) + position.middle.y * Math.cos(angle));
                drawEntity(picture.color, x, y, picture, 1, alpha, scale / picture.size, size * 6 / 80 / Math.max(config.graphical.mininumBorderChunk, config.graphical.borderChunk), angle, true, context);
            },
            keys: {
                select: (element) => keybinderHandler.select(element),
                press: (event) => keybinderHandler.press(event),
                cancel: () => keybinderHandler.cancel(),
                editing: () => keybinderHandler.editing()
            },
            themes: {
                list: themeOptions,
                state: themeState,
                pick: (value) => {
                    if (value[0] !== "p") return pickTheme(value);
                    let index = parseInt(value.slice(1), 10);
                    let theme = loadPersonalThemes()[index];
                    if (theme) setCustomTheme(themeCode(Object.assign({}, theme.content, { border: theme.border, neon: theme.neon }), theme.name, theme.author), index);
                },
                rename: (name, author) => editTheme({}, name, author),
                importCode: (code) => {
                    let parsed = parseTheme(code.trim(), false);
                    if (parsed && parsed.content) setCustomTheme(code.trim());
                },
                save: () => {
                    let state = themeState();
                    let list = loadPersonalThemes();
                    list.push({ name: state.name, author: state.author, content: Object.assign({}, state.colors), paletteSize: THEME_PALETTE_KEYS.length, border: state.blend, neon: state.neon });
                    savePersonalThemes(list);
                    setCustomTheme(state.code, list.length - 1);
                },
                remove: () => {
                    let state = themeState();
                    if (state.personal < 0) return;
                    let list = loadPersonalThemes();
                    list.splice(state.personal, 1);
                    savePersonalThemes(list);
                    pickTheme("normal");
                },
                color: (key, value) => editTheme({ [key]: value }),
                blend: (value) => editTheme({ border: value }),
                neon: (value) => editTheme({ neon: value })
            }
        };
    }

    function runSecondary() {
        let pingAttempt = setInterval(() => {
            if (global.gameUpdate && !global.disconnected) {
                clearInterval(pingAttempt);
                resizeEvent();
                global.socket.ping(Date.now(), socketStuff.clockDiff - socketStuff.serverStart);
            };
        }, 500);
    }

    let drawConnectingScreen = () => {
        let ratio = util.getScreenRatio();
        scaleScreenRatio(ratio, true);
        clearScreen(color.white, 1, ctx[2]);
        drawText("Connecting...", global.screenWidth / 2, global.screenHeight / 2, 30, color.guiwhite, "center");
        drawText(global.message, global.screenWidth / 2, global.screenHeight / 2 + 30, 15, color.lgreen, "center");
        drawText(global.tips, global.screenWidth / 2, global.screenHeight / 2 + 60, 15, color.guiwhite, "center");
    };

    const drawDisconnectedScreen = () => {
        let ratio = util.getScreenRatio();
        scaleScreenRatio(ratio, true);
        clearScreen(gameDraw.mixColors(color.red, color.guiblack, 0.3), global.gameStart ? 0.25 : 1, ctx[2]);
        drawText("Disconnected", global.screenWidth / 2, global.screenHeight / 2, 30, color.guiwhite, "center");
        if (global.message === "") global.message = "The connection closed due to an error.\nTry reloading and clearing your cache, or joining another server.";
        drawText(new Date(global.disconnectTimestamp || Date.now()).toISOString() + "", global.screenWidth / 2, global.screenHeight / 2 - 224, 8.125, color.guiwhite, "center");
        drawText(global.message, global.screenWidth / 2, global.screenHeight / 2 + 30, 15, color.orange, "center");
        lastPing = 0;
        drawButton(global.screenWidth / 2 - 75, global.screenHeight / 2 + 138, 120, 30, 1, "rect", "Back", 14, false, false, false, true, "exitGame", global.canvas.height / global.screenHeight / global.ratio, {
            index: 0
        });
        drawButton(global.screenWidth / 2 + 75, global.screenHeight / 2 + 138, 120, 30, 1, "rect", "Reconnect", 14, false, false, false, true, "reconnect", global.canvas.height / global.screenHeight / global.ratio, {
            index: 0
        });
        if (config.game.autoReconnect && !global.kicked && !global.reconnectTimer) {
            global.reconnectTimer = setTimeout(() => {
                global.reconnectTimer = null;
                if (global.disconnected && config.game.autoReconnect) global.reconnect();
            }, 3000);
        }
    };

    const drawResyncScreen = () => {
        let ratio = util.getScreenRatio();
        scaleScreenRatio(ratio, true);
        clearScreen(gameDraw.mixColors(color.black, color.guiblack, 0.3), 0.25, ctx[2]);
        drawText("Out of sync!", global.screenWidth / 2, global.screenHeight / 2 - 10, 30, color.red, "center");
        drawText("The client is out of sync, please wait until this screen has disappeared.", global.screenWidth / 2, global.screenHeight / 2 + 40, 15, color.guiwhite, "center");
        drawText("The rendering has paused to prevent interuptions.", global.screenWidth / 2, global.screenHeight / 2 + 90, 15, color.guiwhite, "center");
    };

    const drawErrorScreen = () => {
        let ratio = util.getScreenRatio();
        scaleScreenRatio(ratio, true);
        clearScreen(gameDraw.mixColors(color.black, color.guiblack, 0.3), 0.25, ctx[2]);
        drawText("Client error detected!", global.screenWidth / 2, global.screenHeight / 2, 30, color.red, "center");
        drawText("If this is because of an entity, try to move away from it.", global.screenWidth / 2, global.screenHeight / 2 + 30, 15, color.guiwhite, "center");
        drawText("Check your browser's console logs and report whatever you see to the developers.", global.screenWidth / 2, global.screenHeight / 2 + 60, 15, color.guiwhite, "center");
    };

    let animationFrame =
    (!/Chrome\/8[4-6]\.0\.41([4-7][0-9]|8[0-3])\./.test(navigator.userAgent) &&
      window.requestAnimationFrame) ||
    ((a) => setTimeout(() => a(Date.now()), 1e3 / 60));
    function isUncappedFrameRateEnabled() {
        return localStorage.getItem("optUncappedFrameRateChecked") === "true";
    }
    function animloop(tick) {
        if (document.getElementById("gameAreaWrapper").style.display === "none") {
            setTimeout(() => animloop(performance.now()), 200); // Slow down when tab is hidden
            return;
        }
        if (isUncappedFrameRateEnabled()) setTimeout(() => animloop(performance.now()), 0);
        else animationFrame(animloop);
        if (global.gameStart) {
            // Update fov
            let fovtickMotion = fovlasttick ? tick - fovlasttick : null;
            fovlasttick = tick;
            let renderv = null == fovtickMotion ? 0 : config.graphical.slowerFOV ? 0.98 : 0.99 ** fovtickMotion;
            let renderfov = global.player.animv.get(tick);
            global.player.renderv = global.player.renderv * renderv + renderfov * (1 - renderv);
            // Reset collected rendering info (DEBUG)
            global.renderingInfo.entities = 0;
            global.renderingInfo.turretEntities = 0;
            global.renderingInfo.entitiesWithName = 0;
        }

        // Set the drawing style
        gameDraw.reanimateColors();
        for (let context of ctx) {
            context.lineCap = "round";
            context.lineJoin = "round";
            context.clearRect(0, 0, global.screenWidth, global.screenHeight);
        }
        // Figure out where we're rendering if we don't yet know
        if (isNaN(global.player.renderx) && isNaN(global.player.rendery)) {
            global.player.renderx = global.player.cx.x;
            global.player.rendery = global.player.cy.y;
        }
        // Draw the game
        if (global.gameUpdate && !global.disconnected) {
            global.time = getNow();
            if (isNaN(global.time)) { // If something isnt right, do a resync and pause the rendering.
                global.gameUpdate = false;
                global.pullUpgradeMenu = true;
                global.pullSkillBar = true;
                resizeEvent();
                resync();
            }
            if (global.time - lastPing > 1000) {
                // Get last ping.
                lastPing = global.time;
                // Do rendering speed.
                global.metrics.rendertime = global.metrics.rendertimes - 1;
                global.metrics.rendertimes = 0;
                global.fps = global.metrics.rendertime;
                // Do update rate.
                global.metrics.updatetime = global.updateTimes;
                global.updateTimes = 0;
                // Get the final bandwidth.
                global.bandwidth.finalHa = global.bandwidth.currentHa;
                global.bandwidth.finalFa = global.bandwidth.currentFa;
                global.bandwidth.currentHa = 0;
                global.bandwidth.currentFa = 0;
                if (!global.secondaryLoop) global.secondaryLoop = true, runSecondary();
            }
            global.metrics.lag = global.time - global.player.time;
        }
        if (global.GUIStatus.fullHDMode) ctx[2].translate(0.5, 0.5);

        if (!global.mobile && !global.gamepadMode) calculateTarget();
        fullScreenWidth = global.screenWidth;
        fullScreenHeight = global.screenHeight;
        const force169 = config.graphical.force169AspectRatio;
        const viewHeight = force169 ? Math.min(fullScreenHeight, fullScreenWidth * 9 / 16) : fullScreenHeight,
            viewWidth = force169 ? viewHeight * 16 / 9 : fullScreenWidth,
            viewX = (fullScreenWidth - viewWidth) / 2,
            viewY = (fullScreenHeight - viewHeight) / 2;
        if (force169) {
            ctx[0].globalAlpha = 1;
            ctx[0].fillStyle = color.grey;
            ctx[0].fillRect(0, 0, fullScreenWidth, fullScreenHeight);
            global.screenWidth = global.vscreenSize = viewWidth;
            global.screenHeight = global.vscreenSizey = viewHeight;
            for (const context of [ctx[0], ctx[1]]) {
                context.save();
                context.translate(viewX, viewY);
                context.beginPath();
                context.rect(0, 0, viewWidth, viewHeight);
                context.clip();
            }
        }

        var ratio = config.graphical.screenshotMode ? 2 : util.getRatio();
        let p = performance.now();
        try {
            try {
                drawGameplay(tick, ratio);
            } finally {
                if (force169) {
                    for (const context of [ctx[0], ctx[1]]) context.restore();
                    global.screenWidth = global.vscreenSize = fullScreenWidth;
                    global.screenHeight = global.vscreenSizey = fullScreenHeight;
                }
            }
            drawGUI(tick, util.getScreenRatio());
            if (global.gameConnecting && !global.disconnected) {
                drawConnectingScreen();
            };
            if (global.died) {
                gameDrawDead();
            }
            if (isNaN(global.time)) drawResyncScreen();
            if (global.disconnected) {
                drawDisconnectedScreen();
            }
            if (global.dailyTankAd.renderUI) drawAdScreen();
            if (global.GUIStatus.fullHDMode) ctx[2].translate(-0.5, -0.5);

            //oh no we need to throw an error!
        } catch (e) {

            //hold on....
            drawErrorScreen(); // Draw the error screen.
            if (global.GUIStatus.fullHDMode) ctx[2].translate(-0.5, -0.5);

            //okay, NOW throw the error!
            throw e;
        }
        let t = performance.now();
        global.metrics.mspt = t - p;
    }
})(util, global, config, Canvas, colors, gameDraw, socketStuff, keybinderHandler)
