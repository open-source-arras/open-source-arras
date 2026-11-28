import { util } from "./util.js";
import { global } from "./global.js";
import { config } from "./config.js";
import { Canvas } from "./canvas.js";
import { color as colors } from "./color.js";
import { gameDraw } from "./gameDraw.js";
import { keybinderHandler } from "./keybindsHandler.js";
import { skinShape } from "./skins.js";
import { censorChat } from "./chatFilter.js";
import { censorText } from "./dmca.js";
import * as socketStuff from "./socketinit.js";

const THEME_PALETTE_KEYS = [
    "teal", "lgreen", "orange", "yellow", "aqua", "pink", "vlgrey", "lgrey",
    "guiwhite", "black", "blue", "green", "red", "gold", "purple", "magenta",
    "grey", "dgrey", "white", "guiblack"
];
const THEME_V1_MAGIC = "\x6a\xba\xda\xb3\xf0";

const { socketInit, resync, gui, leaderboard, minimap, moveCompensation, lag, getNow } = socketStuff;
// Get the changelog
fetch("CHANGELOG.md", { cache: "no-cache" }).then((response) => response.text()).then((response) => {
    let b = [];
    var c = [];
    for (const d of response.split("\n")) {
        0 !== d.length &&
            ((response = d.charAt(0)),
            "#" === response
                ? (b.push(c), (c = [d.slice(1).trim()]))
                : "-" === response
                    ? c.push(d.slice(1).trim())
                    : (c[c.length - 1] += ` ${d.trim()}`));
    }
    b.push(c);
    for (c = 0; c < b.length;) {
        if (addChangelog(b[c], 157248e5)) {
            c++;
            continue;
        }
        b = b.slice(c);
        const d = addChangelog([
            "Older Changelogs",
            "<a class=\"view-older-changelogs\" href=\"javascript:;\">Click here to load changelogs more than 6 months old.</a>"
        ]);
        [c] = d.getElementsByClassName("view-older-changelogs");
        c.addEventListener("click", () => {
            d.remove();
            for (const g of b) {
                addChangelog(g);
            }
        });
        break;
    }
});

global.clearUpgrades = (clearNow = false) => {
    if (clearNow) {
        gui.upgrades = [];
    } else {
        global.pullUpgradeMenu = true;
        const loop = setInterval(() => {
            if (upgradeMenu.get() < (-global.columnCount * 3) * 0.9999) {
                global.pullUpgradeMenu = false;
                gui.upgrades = [];
                clearInterval(loop);
            }
        }, 10);
    }
};

global.setDmcaMode = (enabled) => {
    config.game.dmcaMode = enabled;
    global.cached = {};
    global.generateTankTree = true;
    for (const upgrade of gui.upgrades) {
        upgrade[2] = util.requestEntityImage(upgrade[2], gui.color);
    }
};

// Build the leaderboard object
const leaderboardEntries = {};
let leaderboardUpdate = 0;
global.canUpgrade = false;
global.canSkill = false;
global.showTree = false;
global.message = "";
global.time = 0;
global.guntime = 0;

var upgradeSpin = 0;
var lastPing = 0;
var lasttick = 0;
var fovlasttick = 0;

// Tips setup :D
const tips = global.tips[Math.floor(Math.random() * global.tips.length)];
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

    fetch("/getServers.json").then((response) => response.json()).then((json) => {
        if (localStorage.getItem("optShowLocalhostChecked") === "true") {
            json.unshift({
                id: json.some((server) => server.id === "x") ? "localhost" : "x",
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
        global.servers = json;
        global.loadServerSelector(json); // The code is at ./serverSelectorHandler.js
    }).catch((error) => {
        console.error(error);
    });

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
    const savedBorderChunk = parseFloat(localStorage.getItem("strokeThicknessValue"));
    if (!isNaN(savedBorderChunk)) {
        config.graphical.borderChunk = savedBorderChunk;
    }
    // Default to true
    if (localStorage.getItem("optDeltaEntitiesChecked") === null) {
        document.getElementById("optDeltaEntities").checked = true;
        util.submitToLocalStorage("optDeltaEntities");
    }
    if (localStorage.getItem("optAutoReconnectChecked") === null) {
        localStorage.setItem("optAutoReconnectChecked", "false");
    }
    if (localStorage.getItem("optChatMessagesChecked") === null) {
        localStorage.setItem("optChatMessagesChecked", "true");
    }
    if (localStorage.getItem("optTankSkinsChecked") === null) {
        document.getElementById("optTankSkins").checked = true;
    }
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
        [
            "optRenderGui",
            "optRenderLeaderboard",
            "optRenderUpgrades",
            "optRenderMinimap",
            "optRenderNames",
            "optRenderHealth",
            "optRenderScores",
            "optRenderPlayerBars",
            "optFancy",
            "optInterpolation",
            "optLerpAnim",
            "optFancy",
            "autoLevelUp",
            "optDeltaEntities",
            "optAllowIngameOptions",
            "optAutoReconnect"
        ].forEach((i) => {
            document.getElementById(i).checked = true;
            util.submitToLocalStorage(i);
        });
        if (global.mobile) {
            ["showCrosshair", "showJoystick"].forEach((i) => {
                document.getElementById(i).checked = true;
                util.submitToLocalStorage(i);
            });
        }
        // Dont forget to save it.
        localStorage.setItem("loadedForFirstTime", "true");
        localStorage.setItem("uiScaleSettings", null);
    }
    if (!localStorage.getItem("uiScaleSettings") || document.getElementById("optUiScale").value === "") {
        document.getElementById("optUiScale").value = global.mobile ? "mobile" : "normal";
        util.submitToLocalStorage("optUiScale");
        localStorage.setItem("uiScaleSettings", "true");
    }
    if (!document.getElementById("optNames").value) {
        document.getElementById("optNames").value = "offense";
    }
    if (!document.getElementById("optCanvas").value) {
        document.getElementById("optCanvas").value = "auto";
    }
    loadSettings();
    // Keybinds stuff
    keybinderHandler.initalize("controlSettings", "resetControls", "keybinds"); // Gameplay keys
    keybinderHandler.initalize("sandboxControlSettings", "resetSandboxControls", "sandboxkeybinds"); // Sandbox command keys
    keybinderHandler.initalize("sandboxSkillControlSettings", "resetSandboxSkillControls", "sandboxskillkeybinds"); // Sandbox command keys (Skill)
    keybinderHandler.initalize("sandboxAttributeControlSettings", "resetSandboxAttributeControls", "sandboxattributekeybinds"); // Sandbox command keys (Attribute)

    // Tab menu creater
    global.createTabMenu = (text, type, addDismissButton = false) => {
        const allowedType = [
            "warning",
            "critical",
            "discord",
            "stat",
            "achieve"
        ];
        if (allowedType.includes(type)) {
            const b = document.getElementById("menuTabs");
            b.style.textAlign = "center";
            const d = document.createElement("span");
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
        } else {
            throw new Error("Invalid menu tab type.");
        }
    };
    try {
        fetch("/version").then((json) => json.json()).then((ve) => {
            global.version = ve.ver;
            if (ve.dev_build) {
                global.dev_build = true;
                global.createTabMenu(`Open Source Arras ${global.version} (dev build)`, "warning", true);
            }
            // Addon info handler
            const keyValue = localStorage.getItem("playerKeyInputValue");
            (async function() {
                const A_response = await fetch(`/api/getAddonAuthors?token=${keyValue}`);
                const A_data = await A_response.json().catch(() => false);
                if (A_data && Array.isArray(A_data)) {
                    initalizeAddonAuthors(A_data);
                }
            })();
        });
    } catch { /* empty */ };
    // Warn the users to turn their phones into landscape.
    if (global.mobile && window.innerHeight > 1.1 * window.innerWidth) {
        const tabMenu = global.createTabMenu("Please turn your device to landscape mode.", "warning", true);
        window.addEventListener("orientationchange", () => {
            window.innerHeight > 1.1 * window.innerWidth || tabMenu.remove();
        });
    };

    // Game start stuff
    document.getElementById("startButton").onclick = () => startGame();
    document.onkeydown = (e) => {
        if (!(global.gameStart || e.shiftKey || e.ctrlKey || e.altKey)) {
            keybinderHandler.triggerKey(e);
            const key = e.code;
            if (key === "Enter") {
                startGame();
            }
        }
    };
    window.addEventListener("resize", resizeEvent);
    // Resizing stuff
    resizeEvent();
};

// Sliding between options menu.
function toggleOptionsMenu() {
    let clicked = false;
    const a = document.getElementById("startMenuSlidingTrigger"); // Trigger ID
    const c = document.getElementById("optionArrow"); // Arrow
    const h = document.getElementById("viewOptionText"); // Text (view options)
    const u = document.getElementsByClassName("sliderHolder")[0]; // Sliding.
    const y = document.getElementsByClassName("slider"); // For animations things.
    const toggle = () => {
        c.style.transform = c.style.webkitTransform = clicked // Rotate the arrow.
            ? "translate(2px, -2px) rotate(45deg)"
            : "rotate(-45deg)";
        h.innerText = clicked ? "close options" : "view options"; // Change the text.
        clicked ? u.classList.add(global.uncappedMenu ? "slided2" : "slided") : u.classList.remove(global.uncappedMenu ? "slided2" : "slided"); // Slide it up.
        y[0].style.opacity = clicked ? 0 : 1; // Fade it away.
        y[2].style.opacity = clicked ? 1 : 0; // same for this.
    };
    a.onclick = () => { // When the button is triggered, This code runs.
        clicked = !clicked;
        global.optionsMenuToggle = clicked;
        toggle();
    };
    return () => {
        clicked || ((clicked = true), toggle());
    };
};

// Tab options
function tabOptionsMenuSwitcher() {
    const buttonTabs = document.getElementById("optionMenuTabs");
    const tabOptions = [
        document.getElementById("tabAppearance"),
        document.getElementById("tabOptions"),
        document.getElementById("tabControls"),
        document.getElementById("tabAbout"),
        document.getElementById("tabAddons")
    ];
    for (let g = 1; g < tabOptions.length; g++) {
        tabOptions[g].style.display = "none";
    }
    let e = 0;
    for (let g = 0; g < buttonTabs.children.length; g++) {
        buttonTabs.children[g].addEventListener("click", () => {
            e !== g &&
                    (buttonTabs.children[e].classList.remove("active"), // Remove the active class
                    buttonTabs.children[g].classList.add("active"), // Add the clicked active class
                    (tabOptions[e].style.display = "none"), // Dont display the old menu.
                    (tabOptions[g].style.display = "block"), // Display the menu.
                    (e = g));
        });
    }
}
function tabControlsMenuSwitcher() {
    const buttonTabs = document.getElementById("controlsMenuTabs");
    const tabOptions = [
        document.getElementById("tabGameplay"),
        document.getElementById("tabSandbox")
    ];
    for (let g = 1; g < tabOptions.length; g++) {
        tabOptions[g].style.display = "none";
    }
    let e = 0;
    for (let g = 0; g < buttonTabs.children.length; g++) {
        buttonTabs.children[g].addEventListener("click", () => {
            e !== g &&
                    (buttonTabs.children[e].classList.remove("active"), // Remove the active class
                    buttonTabs.children[g].classList.add("active"), // Add the clicked active class
                    (tabOptions[e].style.display = "none"), // Dont display the old menu.
                    (tabOptions[g].style.display = "block"), // Display the menu.
                    (e = g));
        });
    }
}
function tabSandboxControlsMenuSwitcher() {
    const buttonTabs = document.getElementById("sandboxControlsMenuTabs");
    const tabOptions = [
        document.getElementById("tabSandboxMain"),
        document.getElementById("tabSandboxSkill"),
        document.getElementById("tabSandboxAttribute")
    ];
    for (let g = 1; g < tabOptions.length; g++) {
        tabOptions[g].style.display = "none";
    }
    let e = 0;
    for (let g = 0; g < buttonTabs.children.length; g++) {
        buttonTabs.children[g].addEventListener("click", () => {
            e !== g &&
                    (buttonTabs.children[e].classList.remove("active"), // Remove the active class
                    buttonTabs.children[g].classList.add("active"), // Add the clicked active class
                    (tabOptions[e].style.display = "none"), // Dont display the old menu.
                    (tabOptions[g].style.display = "block"), // Display the menu.
                    (e = g));
        });
    }
}
function initalizeAddonAuthors(data) {
    const mainDoc = document.getElementById("tabAddons");
    mainDoc.innerHTML = "";
    for (const doc of document.getElementById("optionMenuTabs").children) {
        if (doc.textContent.toLowerCase() === "addons") {
            doc.style.display = "";
        }
    }

    // OSA info
    const i_div = document.createElement("div");
    i_div.classList.add("optionsHeader");
    i_div.textContent = `Open Source Arras ${global.version}` + `${global.dev_build ? " (dev build)" : ""}`;
    mainDoc.appendChild(i_div);

    // Addon stuff
    for (const e of data) {
        let warnDoc = null;
        if (e["osa-version"].target !== global.version) {
            if (global.version.startsWith("v") && e["osa-version"].minimum.startsWith("v")) {
                const targetVersion = global.version.split("v")[1];
                let target = "";
                targetVersion.split(".").forEach((e) => {
                    target += e;
                });
                const minimumVersion = e["osa-version"].minimum.split("v")[1];
                let minimum = "";
                minimumVersion.split(".").forEach((e) => {
                    minimum += e;
                });
                if (parseInt(minimum) > parseInt(target)) {
                    warnDoc = document.createElement("ul3");
                    warnDoc.textContent = "This addon may be incompatible with your version!";
                }
            }
        }
        const divDoc = document.createElement("div");
        divDoc.classList.add("optionsHeader");
        const name = document.createElement("ul");
        const addonVer = document.createElement("ul");
        const versionValue = document.createElement("ul2");
        const author = document.createElement("ul");
        const authorValue = document.createElement("ul2");
        const targetVer = document.createElement("ul");

        name.textContent = e.name;
        addonVer.textContent = "Version: ";
        versionValue.textContent = `${e["addon-version"]}`;
        addonVer.appendChild(versionValue);
        author.textContent = "Author(s): ";
        authorValue.textContent = "";
        for (let i = 0; i < e.authors.length; i++) {
            const auth = e.authors[i];
            authorValue.textContent += `${i !== 0 ? ", " : ""}${auth}`;
        }
        author.appendChild(authorValue);
        targetVer.textContent = `Made for Open Source Arras ${e["osa-version"].target}`;

        divDoc.appendChild(name);
        divDoc.appendChild(author);
        divDoc.appendChild(addonVer);
        if (warnDoc) {
            divDoc.appendChild(warnDoc);
        }
        divDoc.appendChild(targetVer);

        mainDoc.appendChild(divDoc);
    }
}
function menuSettingsHandler() {
    const menu_mainWrapperHeight = window.getComputedStyle(document.getElementsByClassName("mainWrapper")[0]).getPropertyValue("height").toString();
    const menu_mainWrapperHeight_padding = window.getComputedStyle(document.getElementsByClassName("mainWrapper")[0]).getPropertyValue("padding").toString();
    const menu_menuHeight = window.getComputedStyle(document.getElementsByClassName("startMenu")[0]).getPropertyValue("height").toString();
    const menu_addonScrollHeight = window.getComputedStyle(document.getElementById("tabAddons")).getPropertyValue("height").toString();

    // Uncap menu height
    util.retrieveFromLocalStorage("unlimitedMenuHeight");
    const menu_uncapbutton = document.getElementById("unlimitedMenuHeight");
    let menu_uncap_lessHeight = false;
    const menu_uncap_lessHeightReach = 750;

    const menu_uncapClick = () => {
        const setHeight = (doc, x) => doc.style.maxHeight = doc.style.height = x;
        if (menu_uncapbutton.checked) {
            document.getElementById("startMenuSlidingTrigger").style.display = "none";
            // Thanks to Taureon's "Arras.io - Start Menu Modifier" Greasyfork script. (Modified by AE)
            if (menu_uncap_lessHeight) {
                document.getElementById("startMenuSlidingTrigger").style.display = "block";
                document.getElementById("tabOptions").classList.remove("shadowScroll");
                document.getElementById("controlSettingsScollbar").classList.remove("shadowScroll");
                document.getElementById("tabAddons").style.height = "";
                document.getElementById("tabAddons").style.maxHeight = "300px";
                if (global.optionsMenuToggle) {
                    document.getElementsByClassName("sliderHolder")[0].classList.remove("slided");
                    document.getElementsByClassName("sliderHolder")[0].classList.add("slided2");
                } else {
                    document.getElementsByClassName("slider")[2].style.opacity = 0;
                }
            } else {
                document.getElementById("tabOptions").classList.add("shadowScroll");
                document.getElementById("controlSettingsScollbar").classList.add("shadowScroll");
                document.getElementById("tabAddons").style.height = menu_addonScrollHeight;
                document.getElementById("tabAddons").style.maxHeight = "";
                document.getElementsByClassName("sliderHolder")[0].classList.remove("slided");
                document.getElementsByClassName("sliderHolder")[0].classList.remove("slided2");
                document.getElementsByClassName("slider")[2].style.opacity = 1;
                document.getElementsByClassName("slider")[0].style.opacity = 1;
            }
            for (const docs of [".serverSelector", ".slider", ".sliderHolder", ".startMenuHolder", ".startMenuHolder.changelogHolder", ".startMenu", ".mainWrapper", "#startMenuWrapper", "#patchNotes"]) {
                let doc;
                if (docs.startsWith("#")) {
                    doc = document.getElementById(docs.substring(docs.length, 1));
                }
                if (docs.startsWith(".")) {
                    doc = document.getElementsByClassName(docs.substring(docs.length, 1))[0];
                }
                switch (docs) {
                    case ".mainWrapper":
                        doc.style.padding = "0px";
                        setHeight(doc, "calc(100% - 55px)");
                        break;
                    case "#startMenuWrapper":
                        setHeight(doc, "calc(100% - 20px)");
                        break;
                    case ".startMenuHolder":
                        doc = document.getElementsByClassName("startMenuHolder")[1];
                        setHeight(doc, "calc(100% - 20px)");
                        break;
                    case ".startMenu":
                        setHeight(doc, "calc(100%)");
                        break;
                    case ".slider":
                        doc = document.getElementsByClassName("slider")[0];
                        if (menu_uncap_lessHeight) {
                            setHeight(doc, "calc(100% - 30px)");
                        } else {
                            setHeight(doc, "calc(100% - 280px)");
                        }
                        break;
                    case ".sliderHolder":
                        setHeight(doc, "calc(100% - 50px)");
                        break;
                    case ".serverSelector":
                        if (menu_uncap_lessHeight) {
                            setHeight(doc, "calc(100% - 170px)");
                        } else {
                            setHeight(doc, "calc(100% - 180px)");
                        }
                        break;
                    case ".startMenuHolder.changelogHolder":
                        doc = document.getElementsByClassName("changelogHolder")[0];
                        setHeight(doc, "calc(100% - 20px)");
                        break;
                    case "#patchNotes":
                        setHeight(doc, "calc(100% - 39px)");
                        break;
                }
            }
        } else {
            document.getElementById("startMenuSlidingTrigger").style.display = "block";
            if (menu_uncap_lessHeight) {
                document.getElementById("tabOptions").classList.add("shadowScroll");
                document.getElementById("controlSettingsScollbar").classList.add("shadowScroll");
                document.getElementById("tabAddons").style.height = menu_addonScrollHeight;
                document.getElementById("tabAddons").style.maxHeight = "";
            }
            for (const docs of [".serverSelector", ".slider", ".sliderHolder", ".startMenuHolder.changelogHolder", ".startMenu", ".mainWrapper", "#startMenuWrapper", "#patchNotes"]) {
                let doc;
                if (docs.startsWith("#")) {
                    doc = document.getElementById(docs.substring(docs.length, 1));
                }
                if (docs.startsWith(".")) {
                    doc = document.getElementsByClassName(docs.substring(docs.length, 1))[0];
                }
                switch (docs) {
                    case ".mainWrapper":
                        doc.style.padding = menu_mainWrapperHeight_padding;
                        doc.style.height = menu_mainWrapperHeight;
                        break;
                    case ".startMenu":
                        setHeight(doc, menu_menuHeight);
                        break;
                    case ".slider":
                        doc = document.getElementsByClassName("slider")[0];
                        doc.style = "";
                        break;
                    case ".sliderHolder":
                        doc.style = "";
                        doc.classList.remove("slided2");
                        if (global.optionsMenuToggle) {
                            doc.classList.add("slided");
                        }
                        break;
                    case ".serverSelector":
                        doc.style = "";
                        if (global.fixedServerSelectorHeight) {
                            doc.style.height = global.fixedServerSelectorHeight;
                        }
                        break;
                    case "#patchNotes":
                        doc.style = "";
                        break;
                }
            }
        }
        util.submitToLocalStorage("unlimitedMenuHeight");
        global.uncappedMenu = menu_uncapbutton.checked;
    };

    menu_uncapbutton.onclick = () => menu_uncapClick();

    if (menu_uncapbutton.checked) {
        menu_uncapClick();
    }
    setInterval(() => {
        if (menu_uncapbutton.checked) {
            if (window.innerHeight < menu_uncap_lessHeightReach && !menu_uncap_lessHeight) {
                menu_uncap_lessHeight = true;
                menu_uncapClick();
            } else if (window.innerHeight > menu_uncap_lessHeightReach && menu_uncap_lessHeight) {
                menu_uncap_lessHeight = false;
                menu_uncapClick();
            }
        }
    }, 25);
}
// Custom theme display handler
function customThemeDisplayHandler() {
    // Custom theme handler
    util.retrieveFromLocalStorage("optCustom");
    const themeValue = document.getElementById("optCustom");
    let customPlate;
    for (const e of document.getElementById("optColors").children) {
        if (e.value === "custom") {
            customPlate = e;
        }
    }
    const {name, author} = getThemeDisplayName(themeValue);
    if (name !== null && author !== null) {
        customPlate.textContent = `Custom - ${name} ${author}`;
    }
    themeValue.addEventListener("input", () => {
        const {name, author} = getThemeDisplayName(themeValue);
        if (name !== null && author !== null) {
            customPlate.textContent = `Custom - ${name} ${author}`;
        } else {
            customPlate.textContent = "Custom - Unable to pull name or author.";
        }
    });
}

function snowAndFireworkEffects() {
    const currentDate = new Date();
    const snowAmount = global.mobile
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
        const snowCanvas = document.createElement("canvas");
        snowCanvas.style.position = "absolute";
        snowCanvas.style.top = "0";
        document.body.insertBefore(snowCanvas, document.body.firstChild);
        const b = snowCanvas.getContext("2d");
        let snows = [];
        const updateSnow = () => {
            snowCanvas.width !== window.innerWidth && (snowCanvas.width = window.innerWidth);
            snowCanvas.height !== window.innerHeight && (snowCanvas.height = window.innerHeight);
            b.clearRect(0, 0, snowCanvas.width, snowCanvas.height);
            b.fillStyle = "#FFFFFF";
            for (const snow of snows) {
                snow.x += 5 / snow.speed + Math.random();
                snow.y += 12.5 / snow.speed + Math.random();
                const fade = 2 * Math.min(0.4, 1 - snow.y / snowCanvas.height);
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
                    speed: 2 + Math.random() * Math.random() * 7
                });
            if (global.gameStart) {
                snowCanvas.remove();
            } else {
                requestAnimationFrame(updateSnow);
            }
        };
        setInterval(() => {
            snows = snows.filter((g) => !g.vanished);
        }, 2e3);
        updateSnow();
    }
    // Firework event for new year
    const Gd = "en-US" === navigator.language && -7 <= global.timezoneLocation && -4 >= global.timezoneLocation;
    const Hd = 6 === currentDate.getMonth() && 4 === currentDate.getDate();
    const Id =
        (11 === currentDate.getMonth() && 31 === currentDate.getDate()) ||
            (0 === currentDate.getMonth() && 3 >= currentDate.getDate());
    if (!global.mobile && ((Hd && Gd) || Id)) {
        const fireworkCanvas = document.createElement("canvas");
        fireworkCanvas.style.position = "absolute";
        fireworkCanvas.style.top = "0";
        document.body.insertBefore(fireworkCanvas, document.body.firstChild);
        const b = fireworkCanvas.getContext("2d");
        const d = () => {
            const k =
                "164,14,14 230,80,0 230,119,0 47,127,51 23,78,166 123,31,163".split(
                    " "
                );
            return k[Math.floor(Math.random() * k.length)];
        };
        let fireworks = [];
        const updateFireworks = () => {
            if (fireworkCanvas.width !== window.innerWidth || fireworkCanvas.height !== window.innerHeight) {
                (fireworkCanvas.width = window.innerWidth),
                (fireworkCanvas.height = window.innerHeight),
                (fireworks = []),
                b.clearRect(0, 0, fireworkCanvas.width, fireworkCanvas.height),
                (b.fillStyle = "rgba(255,255,255,0.01)"),
                b.fillRect(0, 0, fireworkCanvas.width, fireworkCanvas.height),
                (b.lineWidth = 2.5),
                (b.lineCap = "round");
            }
            b.globalCompositeOperation = "destination-out";
            b.fillStyle = "rgba(0,0,0,0.15)";
            b.fillRect(0, 0, fireworkCanvas.width, fireworkCanvas.height);
            b.globalCompositeOperation = "lighter";
            for (var firework of fireworks) {
                var l = firework.x;
                var t = firework.y;
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
                            const p = d();
                            for (let r = 0; r < l; r++) {
                                const v = ((r + Math.random()) / l) * Math.PI * 2;
                                const P = t + 0.5 * Math.random();
                                fireworks.push({
                                    color: p,
                                    x: firework.x,
                                    y: firework.y,
                                    M: Math.cos(v) * P,
                                    H: -0.8 + Math.sin(v) * P,
                                    time: f + 2 * Math.random(),
                                    Oa: false,
                                    vanished: false
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
                    vanished: false
                }));
            if (global.gameStart) {
                a.remove();
            } else {
                requestAnimationFrame(updateFireworks);
            }
        };
        setInterval(() => {
            fireworks = fireworks.filter((k) => !k.vanished);
        }, 2e3);
        updateFireworks();
    }
}

// Important functions
toggleOptionsMenu();
tabOptionsMenuSwitcher();
tabControlsMenuSwitcher();
tabSandboxControlsMenuSwitcher();
customThemeDisplayHandler();
snowAndFireworkEffects();
menuSettingsHandler();

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
var fullScreenWidth = global.screenWidth; var
    fullScreenHeight = global.screenHeight;
var ctx = [
    document.getElementById("gameCanvas-background").getContext("2d"),
    document.getElementById("gameCanvas-gameplay").getContext("2d"),
    document.getElementById("gameCanvas-gui").getContext("2d")
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
            if (Math.abs(value - display) < 0.1 && round) {
                display = value;
            }
            return display;
        },
        force: (val) => {
            display = value = val;
        }
    };
};

function AdvancedSmoothBar(a, b, d = 3) {
    let value = a;
    const speed = b;
    const h = d;
    let time = Date.now();
    let display;
    let S = display = a;
    const set = (a) => {
        value !== a &&
                ((S = get()), (value = a), (time = Date.now()));
    };
    const get = () => {
        const a = (Date.now() - time) / 1e3;
        return (display =
            a >= speed ? value : S + (value - S) * Math.pow(a / speed, 1 / h));
    };
    return {
        set: (a) => set(a),
        get: () => get(),
        force: (val) => {
            display = value = val;
        }
    };
};

// Prepare the player
global.player = global.initPlayer();
function calculateTarget() {
    if (!global.canvas.mouseMoved) {
        return;
    }
    global.target.x = global.mouse.x - (global.player.screenx / global.screenWidth * global.canvas.width + global.canvas.width / 2);
    global.target.y = global.mouse.y - (global.player.screeny / global.screenHeight * global.canvas.height + global.canvas.height / 2);
    if (global.canvas.reverseDirection) {
        global.reverseTank = -1;
    } else {
        global.reverseTank = 1;
    }
    global.target.x *= global.screenWidth / global.canvas.width;
    global.target.y *= global.screenHeight / global.canvas.height;
    return global.target;
};

const CalcScreenSize = () => Math.max(global.vscreenSize, (16 / 9) * global.vscreenSizey) / global.player.renderv;
const handleScreenDistance = (alpha, instance, fade = true) => {
    const indexes = instance.index.split("-");
    const m = global.mockups[parseInt(indexes[0])] ?? global.missingno[0];
    switch (fade) {
        case true:
            GetScreenDistance(instance.render.x - global.player.loc.x, instance.render.y - global.player.loc.y, instance.size) ||
                    (alpha *= GetScreenDistanceF(instance.render.x - global.player.loc.x, instance.size));
            (alpha *= GetScreenDistanceV(instance.render.y - global.player.loc.y, instance.size));
            break;
        case false:
            let size = instance.size;
            size *= m.position.axis;
            const realSize = size.toFixed(0);
            alpha *= GetScreenDistance(instance.render.x - global.player.loc.x, instance.render.y - global.player.loc.y, parseInt(realSize));
            break;
    }
    return alpha;
};
const GetScreenDistance = (a, b, d) => {
    d += 6;
    const e = 2 * CalcScreenSize();
    return (
        (a + d) * e > -global.vscreenSize &&
                (a - d) * e < global.vscreenSize &&
                (b + d) * e > -global.vscreenSizey &&
                (b - d) * e < global.vscreenSizey
    );
};
const GetScreenDistanceF = (a, b) => {
    b += 6;
    const d = 2 * CalcScreenSize();
    return Math.max(
        0,
        Math.min(1, 2 + (-a + global.vscreenSize / d) / b, 2 + (a + global.vscreenSize / d) / b)
    );
};
const GetScreenDistanceV = (a, b) => {
    b += 6;
    const d = 2 * CalcScreenSize();
    return Math.max(
        0,
        Math.min(1, 2 + (a + global.vscreenSizey / d) / b, 2 + (-a + global.vscreenSizey / d) / b)
    );
};

function parseThemeV1(string) {
    const data = atob(string.replace(/\s+/g, "").replace(/-/g, "+").replace(/_/g, "/"));
    if (!data.startsWith(THEME_V1_MAGIC)) {
        return null;
    }
    let off = 5;
    if (data.charCodeAt(off++) !== 1) {
        return null;
    }
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
    if (!table.length) {
        return null;
    }
    const content = { paletteSize: table.length, border, neon };
    THEME_PALETTE_KEYS.forEach((key, i) => {
        if (i < table.length) {
            content[key] = `#${(table[i] & 0xffffff).toString(16).padStart(6, "0")}`;
        }
    });
    return { name, author, content };
}

function parseTheme(string, logError = true) {
    try {
        const v1 = parseThemeV1(string);
        if (v1) {
            return v1;
        }
    } catch { /* empty */ }
    // Decode from base64
    try {
        var stripped = string.replace(/\s+/g, "");
        2 == stripped.length % 4 ? (stripped += "==") : 3 == stripped.length % 4 && (stripped += "=");
        let data = atob(stripped);
        let name = "Unknown Theme";
        let author = "";
        let index = data.indexOf("\x00");
        if (index === -1) {
            return null;
        }
        name = data.slice(0, index) || name;
        data = data.slice(index + 1);
        index = data.indexOf("\x00");
        if (index === -1) {
            return null;
        }
        author = data.slice(0, index) || author;
        data = data.slice(index + 1);
        const border = data.charCodeAt(0) / 0xff;
        data = data.slice(1);
        const paletteSize = Math.floor(data.length / 3);
        if (paletteSize < 2) {
            return null;
        }
        const colorArray = [];
        for (let i = 0; i < paletteSize; i++) {
            const red = data.charCodeAt(i * 3);
            const green = data.charCodeAt(i * 3 + 1);
            const blue = data.charCodeAt(i * 3 + 2);
            const color = (red << 16) | (green << 8) | blue;
            colorArray.push(`#${color.toString(16).padStart(6, "0")}`);
        }
        const content = {
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
            border
        };
        return { name, author, content };
    } catch { }
    // Decode from JSON
    try {
        const output = JSON.parse(string);
        if (typeof output !== "object") {
            return null;
        }
        const { name = "Unknown Theme", author = "", content } = output;
        for (const colorHex of [
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
            content.guiblack
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
                    } else {
                        return {
                            name: "Unknown Theme",
                            author: "?",
                            content: null
                        };
                    }
                }
            };
        }
        return {
            name: (typeof name === "string" && name) || "Unnamed Theme",
            author: (typeof author === "string" && author) || "",
            content
        };
    } catch (e) {
        logError && alert("An error has accoured while reading your theme, it may be corrupted or outdated.");
    }

    return {
        name: "Unknown Theme",
        author: "?",
        content: null
    };
}
function getThemeDisplayName(doc) {
    if (doc.value !== "") {
        const {name, author, content} = parseTheme(doc.value);
        if (content !== null) {
            const displayName = name;
            const displayAuthor = author === "" ? "" : author === "fan-made" || author === "Fan-made" || author === "Fan-Made" ? "(Fan-Made)" : `(by ${author})`;
            return {
                name: displayName,
                author: displayAuthor
            };
        }
    } else {
        return {
            name: null,
            author: null
        };
    }
}
function addChangelog(b, a = null) { // From CX Client (Modified) + decoded;
    const triggerChangelog = (() => {
        const a = document.getElementById("changelogTabs");
        let b = a.firstElementChild;
        const d = document.getElementById("patchNotes");
        const e = {};
        for (let g = 0; g < a.children.length; g++) {
            const k = a.children[g];
            const l = k.dataset.type;
            e[l] = () => {
                if (k !== b) {
                    var u = b.dataset.type;
                    b.classList.remove("active");
                    k.classList.add("active");
                    d.classList.remove(u);
                    d.classList.add(l);
                    b = k;
                }
            }
            ;
            k.addEventListener("click", e[l]);
        }
        return e;
    }
    )();
    var sa = document.getElementById("patchNotes");
    var c = b[0];
    if (c) {
        let s = 0;
        c = c.match(/^([A-Za-z ]+[A-Za-z])\s*\[([0-9-]+)\]\s*(.+)?$/) || [
            c,
            c,
            null
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
            "Update": "update"
        } [c[1]] : null;
        var d = document.createElement("div");
        h && d.classList.add(h);
        var y = document.createElement("b");
        var f = [c[1]];
        if (c[2]) {
            var e = +new Date(`${c[2]}T00:00:00Z`) + 252e5;
            if (null != a && e + a < Date.now()) {
                return !1;
            }
            f.push(new Date(e).toLocaleDateString("default", {
                year: "numeric",
                month: "long",
                day: "numeric",
                timeZone: "UTC"
            }));
        }
        if (c[1]) {
            s = 1;
        }
        c[3] && f.push(c[3]);
        y.innerHTML = f.join(" - ");
        d.appendChild(y);
        const g = document.createElement("ul");
        let l;
        for (const n of b.slice(s)) {
            l = document.createElement("li"), l.innerHTML = n, g.appendChild(l);
        }
        l = g.getElementsByTagName("a");
        for (a = 0; a < l.length; a++) {
            const u = l[a];
            if (!u.href) {
                continue;
            }
            let p = u.href.lastIndexOf("#");
            -1 !== p && (p = u.href.slice(p + 1),
            "options-menu" === p ? h[a].addEventListener("click", (r) => {
                r.preventDefault();
                tc();
            }
            ) : triggerChangelog[p] && h[a].addEventListener("click", (r) => {
                r.preventDefault();
                triggerChangelog[p]();
            }
            ));
        }
        d.appendChild(g);
        a && d.appendChild(document.createElement("hr"));
        sa.appendChild(d);

        return d;
    } else {
        return true;
    }
}

function loadSettings() {
    config.graphical.fancyAnimations = document.getElementById("optFancy").checked;
    config.graphical.interpolation = document.getElementById("optInterpolation").checked;
    config.graphical.lerpAnimations = document.getElementById("optLerpAnim").checked;
    config.graphical.smoothcamera = document.getElementById("smoothCamera").checked;
    config.graphical.pointy = document.getElementById("optPointy").checked;
    config.graphical.curvyTraps = document.getElementById("optCurvyTraps").checked;
    config.game.autoLevelUp = document.getElementById("autoLevelUp").checked;
    config.game.centeredMinimap = localStorage.getItem("optSelfCenteredMinimapChecked") === "true";
    config.game.dmcaMode = localStorage.getItem("optDmcaModeChecked") === "true";
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
    global.GUIStatus.renderChatMessages = localStorage.getItem("optChatMessagesChecked") !== "false";
    global.GUIStatus.renderPlayerBars = document.getElementById("optRenderPlayerBars").checked;
    global.GUIStatus.renderPlayerKillbar = document.getElementById("optRenderKillbar").checked;
    global.GUIStatus.renderhealth = document.getElementById("optRenderHealth").checked;
    global.GUIStatus.minimapReducedInfo = document.getElementById("optReducedInfo").checked;
    global.GUIStatus.fullHDMode = document.getElementById("optFullHD").checked;
    global.GUIStatus.renderIngameOptions = document.getElementById("optAllowIngameOptions").checked;
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
    const a = document.getElementById("optColors").value;
    colors = colors[a === "" ? "normal" : a];
    if (a == "custom") {
        const customTheme = document.getElementById("optCustom").value;
        colors = parseTheme(customTheme).content;
        util.submitToLocalStorage("optCustom");
    }
    gameDraw.color = colors;
    gameDraw.colorCache = {};
    global.refreshMonitorColoring(gameDraw);
    if (global.themeOverlay) {
        if (a === "custom") {
            global.themeOverlay._ov.colorsSel.value = "custom";
        } else {
            selectTheme(document.getElementById("optColors").selectedOptions[0]?.textContent.replace(/ \(by .*\)$/, ""));
        }
        syncThemeOverlay();
    }
}

function startGame() {
    // Set flag
    if (global.gameLoading) {
        return;
    }
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
    global.optionsCheckboxes = undefined;
    // Other more important stuff
    const optName = document.getElementById("optName");
    const playerKeyInput = document.getElementById("playerKeyInput");
    const autolevelUpInput = document.getElementById("autoLevelUp").checked;
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
    if (!global.playerTotalInterval) {
        global.playerTotalInterval = setInterval(() => util.pullTotalPlayers(), 20000);
    }
    if (!global.canvas.initalized) {
        global.canvas.init();
    }
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
window.requestAnimFrame = window.requestAnimationFrame || window.webkitRequestAnimationFrame || window.mozRequestAnimationFrame || window.msRequestAnimationFrame || ((callback) => setTimeout(callback, 1000 / 60));
window.cancelAnimFrame = window.cancelAnimationFrame || window.mozCancelAnimationFrame;
// Drawing states
const statMenu = Smoothbar(0, 2, 0.1, 0.08, 0.025, true);
const upgradeMenu = Smoothbar(0, 2, 3, 0.08, 0.025, true);
const mobileUpgradeGlide = Smoothbar(0, 2, 3, 0.08, 0.025, true);
const lbGlide = AdvancedSmoothBar(0, 0.3, 1.5);
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
        const min = Math.min(...data);
        const max = Math.max(...data);
        const range = max - min;
        // Draw zero
        if (max > 0 && min < 0) {
            drawBar(x, x + w, y + (h * max) / range, 2, colors.guiwhite);
        }
        // Draw points
        ctx[2].beginPath();
        let i = -1;
        for (const p of data) {
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
    const k = Math.cos((1 + tt) * Math.PI);
    return 0.5 * (((1 + tt) * v1 + p1) * (k + 1) + (-tt * v2 + p2) * (1 - k));
}

function extrapolate(p1, p2, v1, v2, ts, tt) {
    return p2 + (p2 - p1) * tt;
}

// Useful thing
const modulo = function(a, n) {
    return ((a % n) + n) % n;
};
function angleDifference(sourceA, targetA) {
    const a = targetA - sourceA;
    return modulo(a + Math.PI, 2 * Math.PI) - Math.PI;
}

// Lag compensation functions
const compensation = () => {
    // Protected vars
    let t = 0;
    let tt = 0;
    let ts = 0;
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
        }
    };
};

// Make graphs
const timingGraph = graph();
const lagGraph = graph();
const gapGraph = graph();

// The skill bar dividers
const skas = [];
for (let i = 1; i <= 256; i++) { //if you want to have more skill levels than 255, then update this
    skas.push((i - 2) * 0.01 + Math.log(4 * (i / 9) + 1) / 1.513);
}
const ska = (x) => skas[x];

function truncateKeybind(key) {
    if (key.startsWith("Alt")) {
        return "⎇";
    }
    if (key.startsWith("Control")) {
        return "⎈";
    }
    if (key.startsWith("Meta")) {
        return "⌘";
    }
    if (key.startsWith("Shift")) {
        return "⇧";
    }
    if (key.endsWith("Backslash")) {
        return "\\";
    }
    if (key.endsWith("Equal")) {
        return "=";
    }

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
        Tab: "↹"
    };
    return map[key];
};
function getKeybind(keybind) {
    const key = global[keybind];

    // Remove undefined keys
    if (key == -1 || key == undefined || key.toLowerCase() === "undefined" || key.toLowerCase() === "unidentified") {
        return null;
    }

    // Truncate common keycodes
    if (key.startsWith("F") && key.length <= 3) {
        return key;
    }
    if (key.startsWith("Key") && key.length === 4) {
        return config.graphical.oldUIStyle ? key[3].toLowerCase() : key[3];
    }
    if (key.startsWith("Digit") && key.length === 6) {
        return key[5];
    }
    if (key.startsWith("Numpad") && key.length === 7) {
        return key[6];
    }

    // Return the raw keycode if it doesn't need to be truncated
    return truncateKeybind(key);
};

let tiles;
let branches;
let tankTree;
const measureSize = (x, y, colorIndex, { index, tier = 0 }) => {
    tiles.push({ x, y, colorIndex, index });
    const { upgrades } = global.mockups[parseInt(index)];
    const xStart = x;
    let cumulativeWidth = 1;
    let maxHeight = 1;
    const hasUpgrades = [];
    const noUpgrades = [];
    for (let i = 0; i < upgrades.length; i++) {
        const upgrade = upgrades[i];
        if (global.mockups[upgrade.index].upgrades.length) {
            hasUpgrades.push(upgrade);
        } else {
            noUpgrades.push(upgrade);
        }
    }
    for (let i = 0; i < hasUpgrades.length; i++) {
        const upgrade = hasUpgrades[i];
        const spacing = 2 * Math.max(1, upgrade.tier - tier);
        const measure = measureSize(x, y + spacing, upgrade.upgradeColor ?? i, upgrade);
        branches.push([{ x, y: y + Math.sign(i) }, { x, y: y + spacing + 1 }]);
        if (i === hasUpgrades.length - 1 && !noUpgrades.length) {
            branches.push([{ x: xStart, y: y + 1 }, { x, y: y + 1 }]);
        }
        x += measure.width;
        cumulativeWidth += measure.width;
        if (maxHeight < measure.height) {
            maxHeight = measure.height;
        }
    }
    y++;
    for (let i = 0; i < noUpgrades.length; i++) {
        const upgrade = noUpgrades[i];
        const height = 2 + upgrades.length;
        measureSize(x, y + 1 + i + Math.sign(hasUpgrades.length) * 2, upgrade.upgradeColor ?? i, upgrade);
        if (i === noUpgrades.length - 1) {
            if (hasUpgrades.length > 1) {
                cumulativeWidth++;
            }
            branches.push([{ x: xStart, y }, { x, y }]);
            branches.push([{ x, y }, { x, y: y + noUpgrades.length + Math.sign(hasUpgrades.length) * 2 }]);
        }
        if (maxHeight < height) {
            maxHeight = height;
        }
    }
    return {
        width: cumulativeWidth,
        height: 2 + maxHeight
    };
};

function generateTankTree(indexes) {
    tiles = [];
    branches = [];
    tankTree = { width: 0, height: 0 };
    let rightmostSoFar = 0;
    if (!Array.isArray(indexes)) {
        indexes = [indexes];
    }
    for (const index of indexes) {
        rightmostSoFar += 3 + measureSize(rightmostSoFar, 0, 0, { index }).width;
    }
    for (const { x, y } of tiles) {
        tankTree.width = Math.max(tankTree.width, x);
        tankTree.height = Math.max(tankTree.height, y);
    }
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
    ctx[2].font = `${fontWidth} ${fontSize}px Ubuntu`;
    const measurement = ctx[2].measureText(arrayifyText(text).reduce((a, b, i) => (i & 1) ? a : a + b, ""));
    return withHeight ? { width: measurement.width, height: fontSize } : measurement.width;
}

// Init stuff
function arrayifyText(rawText) {
    //we want people to be able to use the section sign in writing too
    // string with double §           txt   col   txt                      txt
    // "...§text§§text§..." => [..., "text", "", "text", ...] => [..., "text§text", ...]
    // this code is balanced on tight threads, holy shit
    const textArrayRaw = rawText.split("§");
    const textArray = [];
    if (!(textArrayRaw.length & 1)) {
        textArrayRaw.unshift("");
    }
    while (textArrayRaw.length) {
        const first = textArrayRaw.shift();
        if (!textArrayRaw.length) {
            textArray.push(first);
        } else if (textArrayRaw[1]) {
            textArray.push(first, textArrayRaw.shift());
        } else {
            textArrayRaw.shift();
            textArray.push(`${first}§${textArrayRaw.shift()}`, textArrayRaw.shift());
        }
    }
    return textArray;
}

function drawText(rawText, x, y, size, defaultFillStyle, align = "left", center = false, fade = 1, stroke = true, context = ctx[2]) {
    const lines = (`${rawText}`).split(/\r?\n/);
    if (lines.length > 1) {
        const s = size + config.graphical.fontSizeBoost;
        const lineHeight = s + 2 * (s / 5);
        for (let l = 0; l < lines.length; l++) {
            drawText(lines[l], x, y + l * lineHeight, size, defaultFillStyle, align, center, fade, stroke, context);
        }
        return;
    }
    size += config.graphical.fontSizeBoost;
    // Get text dimensions and resize/reset the canvas
    const offset = size / 5;
    const ratio = 1;
    const textArray = arrayifyText(rawText);
    const renderedFullText = textArray.reduce((a, b, i) => (i & 1) ? a : a + b, "");

    if (ratio !== 1) {
        size *= ratio;
    }
    context.font = `bold ${size}px Ubuntu`;

    let Xoffset = offset;
    let Yoffset = (size + 2 * offset) / 2;
    let alignMultiplier = 0;

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
    const strokeRatio = typeof stroke === "number" ? stroke : config.graphical.fontStrokeRatio;
    context.lineWidth = (size + 1) / strokeRatio;
    context.textAlign = "left";
    context.textBaseline = "middle";
    context.strokeStyle = colors.black;
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
    if (!unset) {
        ratio *= by;
    }
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
    if (color) {
        context.strokeStyle = color;
    }
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
    const index = options.index;

    // If width is set to true, that means we want to calculate it on the text's length.
    if (width == true) {
        width = measureText(text, height);
    }
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
    if (clickable) {
        hover = global.clickables[clickType].check({ x: global.mouse.x, y: global.mouse.y });
    }
    // Draw boxes
    ctx[2].globalAlpha = /*0.5 * */alpha;
    ctx[2].fillStyle = color1 ? color1 : colors.grey;
    if (type == "rect") {
        drawGuiRect(x - width / 2, y, width, height);
    } else if (type == "bar") {
        drawBar(x - width / 2, x + width / 2, y + height / 2, height, color1 ? color1 : colors.grey);
    }
    ctx[2].globalAlpha = 0.2 * alpha;
    // Shaders
    if (clickable && (index !== false && hover == index) || hover === true) {
        if (global.clickables.clicked) {
            ctx[2].globalAlpha = 0.2 * alpha;
            ctx[2].fillStyle = colors.black;
        } else {
            ctx[2].globalAlpha = 0.15 * alpha;
            ctx[2].fillStyle = colors.guiwhite;
        }
        if (type == "rect") {
            drawGuiRect(x - width / 2, y, width, height);
        } else if (type == "bar") {
            drawBar(x - width / 2, x + width / 2, y + height / 2, height, false);
        }

    }
    ctx[2].fillStyle = color2 ? color2 : colors.black;
    if (type == "rect") {
        drawGuiRect(x - width / 2, y + height * 0.6, width, height * 0.4);
    } else if (type == "bar") {
        drawBar(x - width / 1.9, x + width / 1.9, y + height * 0.7, height * 0.6, color2 ? color2 : colors.black);
    }
    ctx[2].globalAlpha = 1 * alpha;
    ctx[2].fillStyle = colors.guiwhite;
    ctx[2].strokeStyle = colors.black;

    // Draw text
    if (text) {
        drawText(text, x, y + height * 0.5, textSize ? textSize : height * 0.6, colors.guiwhite, "center", true, 1, options.textOutline ??= true);
    }

    // Draw the borders
    ctx[2].strokeStyle = color3 ? color3 : colors.black;
    ctx[2].lineWidth = 3;
    if (type == "rect") {
        drawGuiRect(x - width / 2, y, width, height, true);
    } else if (type == "bar") {
        drawBarStroke(x - width / 2, y, width, color3 ? color3 : colors.black, height);
    }
}
// Entity drawing (this is a function that makes a function)
const drawEntity = (() => {
    const drawPolyImgs = [];
    const drawPoly3D = new Map();
    const drawPoly4D = new Map();
    const cameraFor3dProjection = { x: 0, y: 0, z: -1 };
    const cameraFor4dProjection = { x: 0, y: 0, z: 0, w: -1 };
    const projectPoint3d = (p) => {
        if (p.z == 0) {
            return p;
        }
        p.x /= p.z - cameraFor3dProjection.z;
        p.y /= p.z - cameraFor3dProjection.z;
        p.z = 0;
        return p;
    };
    const projectPoint4d = (p) => {
        if (p.w == 0) {
            return projectPoint3d(p);
        }
        p.x /= p.w - cameraFor4dProjection.w;
        p.y /= p.w - cameraFor4dProjection.w;
        p.z /= p.w - cameraFor4dProjection.w;
        p.w = 0;
        return projectPoint3d(p);
    };
    const rotatePointXY = (p, angle) => {
        const q = {
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
    };
    const rotatePointXYZ = (p, angle) => {
        const q = {
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
        const y = q.y;
        q.y = y * cos - p.w * sin;
        q.w = y * sin + p.w * cos;
        const z = q.z;
        q.z = z * cos - p.w * sin;
        q.w = z * sin + p.w * cos;
        return q;
    };
    const distanceBetweenPointsSquared3d = (a, b) => {
        const dx = b.x - a.x;
        const dy = b.y - a.y;
        const dz = b.z - a.z;
        return dx * dx + dy * dy + dz * dz;
    };
    const distanceBetweenPointsSquared4d = (a, b) => {
        const dx = b.x - a.x;
        const dy = b.y - a.y;
        const dz = b.z - a.z;
        const dw = b.w - a.w;
        return dx * dx + dy * dy + dz * dz + dw * dw;
    };
    const sortSides3d = (arr, a, b) => {
        let aAvgZ = 0;
        let bAvgZ = 0;
        let aDist = 0;
        let bDist = 0;
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
    };
    const sortSides4d = (arr, a, b) => {
        let aAvgW = 0;
        let bAvgW = 0;
        let aDist = 0;
        let bDist = 0;
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
    };
    const DEAIC = (assignedContext, Alpha, shape, glow, gunLength, turretsLength) => { // AKA: Draw entity as image check
        if (global.gameUpdate && config.graphical.fancyAnimations && Alpha < 1 && assignedContext != ctx2) {
            if (config.graphical.optimizeMode) {
                if (gunLength > 0 || turretsLength > 0 || glow.radius) {
                    return true;
                }
                return false;
            } else if (shape !== 0 || gunLength > 0 || turretsLength > 0 || glow.radius) {
                return true;
            }
        }
        return false;
    };
        // Draw body function, (AKA: drawPoly)
    const drawBody = (context, centerX, centerY, radius, sides, angle = 0, borderless, fill, imageInterpolation, hasGlow = false) => {
        try {
            // Start drawing
            context.beginPath();
            if (sides instanceof Array) {
                const dx = Math.cos(angle);
                const dy = Math.sin(angle);
                for (const [x, y] of sides) {
                    context.lineTo(
                        centerX + radius * (x * dx - y * dy),
                        centerY + radius * (y * dx + x * dy)
                    );
                }
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
                            };
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
                            const dividedParts = sides.slice(3).split("/");
                            const vertexesRaw = dividedParts[0].split(",").map(Number);
                            if (vertexesRaw.length % 3 != 0) {
                                throw new Error(`3D Shape cannot be rendered. Vertexes count: ${vertexesRaw.length / 3}`);
                            }
                            const vertexes = Array(vertexesRaw.length / 3);
                            for (let i = 0; i < vertexesRaw.length; i += 3) {
                                vertexes[i / 3] = {
                                    x: vertexesRaw[i],
                                    y: vertexesRaw[i + 1],
                                    z: vertexesRaw[i + 2]
                                };
                            }
                            const indicesRaw = dividedParts[1].split(";");
                            const indices = [];
                            for (let i = 0; i < indicesRaw.length; ++i) {
                                indices.push(indicesRaw[i].split(",").map(Number));
                            }
                            // Optional 4th "/" segment: one colour per face (e.g. "pureWhite,pureBlack,...").
                            let faceColors = null;
                            if (dividedParts[3]) {
                                faceColors = dividedParts[3].split(",").map((tok) => {
                                    tok = (tok || "").trim();
                                    if (!tok) {
                                        return null;
                                    }
                                    try {
                                        return gameDraw.modifyColor(tok.includes(" ") ? tok : `${tok} 0 1 0 false`);
                                    } catch (e) {
                                        return null;
                                    }
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
                            .map((p) => rotatePointXY(p, angle));
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
                        if (polygon3d.faceColors) {
                            context.fillStyle = defaultFill;
                        }
                        return;
                    }
                    if (sides.startsWith("4d=")) {
                        let polygon4d = drawPoly4D.get(sides);
                        if (!polygon4d) {
                            const dividedParts = sides.slice(3).split("/");
                            const vertexesRaw = dividedParts[0].split(",").map(Number);
                            if (vertexesRaw.length % 4 != 0) {
                                throw new Error(`4D Shape cannot be rendered. Vertexes count: ${vertexesRaw.length / 4}`);
                            }
                            const vertexes = Array(vertexesRaw.length / 4);
                            for (let i = 0; i < vertexesRaw.length; i += 4) {
                                vertexes[i / 4] = {
                                    x: vertexesRaw[i],
                                    y: vertexesRaw[i + 1],
                                    z: vertexesRaw[i + 2],
                                    w: vertexesRaw[i + 3]
                                };
                            }
                            const indicesRaw = dividedParts[1].split(";");
                            const indices = [];
                            for (let i = 0; i < indicesRaw.length; ++i) {
                                indices.push(indicesRaw[i].split(",").map(Number));
                            }
                            let faceColors = null;
                            if (dividedParts[3]) {
                                faceColors = dividedParts[3].split(",").map((tok) => {
                                    tok = (tok || "").trim();
                                    if (!tok) {
                                        return null;
                                    }
                                    try {
                                        return gameDraw.modifyColor(tok.includes(" ") ? tok : `${tok} 0 1 0 false`);
                                    } catch (e) {
                                        return null;
                                    }
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
                            .map((p) => rotatePointXYZ(p, angle));
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
                        if (polygon4d.faceColors) {
                            context.fillStyle = defaultFill;
                        }
                        return;
                    }
                    const path = new Path2D(sides);
                    context.save();
                    context.translate(centerX, centerY);
                    context.scale(radius, radius);
                    context.lineWidth /= radius;
                    context.rotate(angle);
                    context.lineWidth *= fill ? 1 : 0.5; // Maintain constant border width
                    if (!borderless) {
                        context.stroke(path);
                    }
                    if (fill) {
                        context.fill(path);
                    }
                    context.restore();
                    return;
                }
                angle += sides % 2 ? 0 : Math.PI / sides;
            }
            if (!sides) {
                // Circle
                const fillcolor = context.fillStyle;
                const strokecolor = context.strokeStyle;
                const borderRadius = context.globalAlpha < 1 ? 4 : 2;
                switch (hasGlow) {
                    case true:
                        context.arc(centerX, centerY, radius, 0, 2 * Math.PI);
                        context.fillStyle = strokecolor;
                        context.lineWidth *= fill ? 1 : 0.5; // Maintain constant border width
                        if (!borderless) {
                            context.stroke();
                        }
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
                if (fill) {
                    context.fill();
                }
                context.closePath();
                return;
            } else if (0 > sides) {
                // Star
                if (config.graphical.pointy) {
                    context.lineJoin = "miter";
                }
                sides = -sides;
                angle += (sides % 1) * Math.PI * 2;
                sides = Math.floor(sides);
                const dip = 1 - 6 / (sides ** 2);
                context.moveTo(centerX + radius * Math.cos(angle), centerY + radius * Math.sin(angle));
                context.lineWidth *= fill ? 1 : 0.5; // Maintain constant border width
                for (let i = 0; i < sides; i++) {
                    const htheta = ((i + 0.5) / sides) * 2 * Math.PI + angle;
                    const theta = ((i + 1) / sides) * 2 * Math.PI + angle;
                    const cx = centerX + radius * dip * Math.cos(htheta);
                    const cy = centerY + radius * dip * Math.sin(htheta);
                    const px = centerX + radius * Math.cos(theta);
                    const py = centerY + radius * Math.sin(theta);
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
                    const theta = (i / sides) * 2 * Math.PI + angle;
                    context.lineTo(centerX + radius * Math.cos(theta), centerY + radius * Math.sin(theta));
                }
            }
            context.closePath();
            if (!borderless) {
                context.stroke();
            }
            if (fill) {
                context.fill();
            }
            context.lineJoin = "round";
        } catch (e) { // this actually prevents to panic the client. so we will just call "resizeEvent()".
            resizeEvent();
            console.error(`CanvasRenderingContext2D error: ${e}`);
        }
    };
        // Draw gun function, (AKA: drawTrapezoid)
    const drawGun = (context, x, y, length, height, aspect, angle, borderless, fill, alpha, strokeWidth, position) => {
        let h = [];
        h = aspect > 0 ? [height * aspect, height] : [height, -height * aspect];

        // Construct a trapezoid at angle 0
        const points = [];
        const sinT = Math.sin(angle);
        const cosT = Math.cos(angle);
        points.push([-position, h[1]]);
        points.push([length * 2 - position, h[0]]);
        points.push([length * 2 - position, -h[0]]);
        points.push([-position, -h[1]]);
        context.globalAlpha = alpha;

        // Rotate it to the new angle via vector rotation
        context.beginPath();
        for (const point of points) {
            const newX = point[0] * cosT - point[1] * sinT + x;
            const newY = point[0] * sinT + point[1] * cosT + y;
            context.lineTo(newX, newY);
        }
        context.closePath();
        context.lineWidth *= strokeWidth;
        context.lineWidth *= fill ? 1 : 0.5; // Maintain constant border width
        if (!borderless) {
            context.stroke();
        }
        context.lineWidth /= fill ? 1 : 0.5; // Maintain constant border width
        if (fill) {
            context.fill();
        }
        context.globalAlpha = 1;
    };
    const drawGunBox = (context, x, y, length, height, aspect, angle, position, pad) => {
        const h = aspect > 0 ? [height * aspect, height] : [height, -height * aspect];
        const cos = Math.cos(angle);
        const sin = Math.sin(angle);
        const points = [[-position, h[1]], [length * 2 - position, h[0]], [length * 2 - position, -h[0]], [-position, -h[1]]]
            .map(([a, b]) => [x + a * cos - b * sin, y + a * sin + b * cos]);
        const xs = points.map((p) => p[0]);
        const ys = points.map((p) => p[1]);
        const left = Math.min(...xs) - pad;
        const top = Math.min(...ys) - pad;
        context.fillRect(left, top, Math.max(...xs) - left + pad, Math.max(...ys) - top + pad);
    };
        // The actual drawEntity function
    return (baseColor, x, y, instance, ratio, alpha = 1, scale = 1, lineWidthMult = 1, rot = 0, turretsObeyRot = false, assignedContext = false, turretInfo = false, render = instance.render, smoothsize = false) => {
        // --- Fast early exit for invisible objects ---
        const fade = turretInfo ? 1 : render.status.getFade();
        if (fade === 0 || alpha === 0) {
            return;
        }

        const alphaFade = fade * alpha;
        if (!global.gameUpdate && alphaFade < 0.5) {
            return;
        }

        // --- Context setup with minimal state changes ---
        let context = assignedContext || ctx[1];
        const indexStr = instance.index;
        const indexes = indexStr.split("-");
        const mockupIndex = +indexes[0];
        const m = global.mockups[mockupIndex] || global.missingno[0];
        const dmcaDesign = config.game.dmcaMode && (m.censor & 2);
        const source = turretInfo === false ? instance : turretInfo;
        const hasHighLayer = (m.turrets || []).some((t) => t.layer > 0) || (m.props || []).some((p) => p.layer > 0);
        const skin = instance.nameplate && !hasHighLayer && skinShape(instance.name);

        // --- Size calculations with cached values ---
        const instSize = instance.size;
        let drawSize = smoothsize ? scale * ratio * smoothsize : scale * ratio * instSize;

        if (global.gameUpdate && fade !== 1) {
            drawSize *= config.graphical.fancyAnimations ?
                (1 + 0.5 * (1 - fade)) :
                (1 - 2 * (1 - fade));

            if (drawSize < 0) {
                drawSize = scale * ratio * instSize;
            }
        }

        // --- Early optimization for small or distant objects ---
        if (drawSize < 0.1) {
            return;
        }

        // --- Find upper turrets and props with optimized loop ---
        const turrets = instance.isImage ? source.turrets : [...source.turrets, ...m.props];
        if (m.props) {
            turrets.sort((a, b) => a.layer - b.layer);
        }

        // --- Gun positions with single update ---
        source.guns.update();

        // --- Fancy canvas with reduced state setup ---
        let xx = x; let
            yy = y;
        const useFancyCanvas = !dmcaDesign && DEAIC(assignedContext, alphaFade, m.shape, m.glow, source.guns.length, turrets.length);

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

        const dmcaZoom = ratio;
        if (dmcaDesign) {
            context.fillStyle = "#000000";
            context.globalAlpha = alphaFade < 1 && config.graphical.fancyAnimations ? alphaFade : 1;
        }

        // --- Draw turrets beneath with cached values ---
        for (let i = 0; i < turrets.length; i++) {
            let t = turrets[i];
            if (t.isProp) {
                t = util.requestEntityImage(t);
            }
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

                if (dmcaDesign) {
                    context.fillStyle = "#000000";
                    drawGunBox(context, xx + drawSize * gx, yy + drawSize * gy, drawSize * g.length / 2, drawSize * g.width / 2, g.aspect, gAngle, drawSize * positions[i], 5 * dmcaZoom);
                    continue;
                }

                // Minimize color calculations
                const gunColor = g.color == null ? colors.grey : gameDraw.modifyColor(g.color, baseColor);
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
            if (drawAbove === 0 && dmcaDesign) {
                const half = sizeRatio + 11 * dmcaZoom;
                context.fillStyle = "#000000";
                context.fillRect(xx - half, yy - half, 2 * half, 2 * half);
            } else if (drawAbove === 0) {
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
                if (skin) {
                    drawBody(context, xx, yy, 0.9 * (drawSize - 3 * ratio), skin, 0, instance.isProp ? instance.borderless : m.borderless, instance.isProp ? instance.drawFill : m.drawFill, true);
                }
            }
        }

        if (dmcaDesign) {
            const textSize = 0.65 * sizeRatio;
            context.save();
            context.font = `bold ${textSize}px Ubuntu`;
            context.textAlign = "center";
            context.textBaseline = "middle";
            context.fillStyle = "#FFFFFF";
            context.fillText("DMCA'd", xx, yy - 0.35 * sizeRatio);
            context.fillText("by Diep", xx, yy + 0.35 * sizeRatio);
            context.restore();
            context.globalAlpha = 1;
        }

        // --- Draw turrets above with cached trig values ---
        for (let i = 0; i < turrets.length; i++) {
            let t = turrets[i];
            if (t.isProp) {
                t = util.requestEntityImage(t);
            }
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
    };
})();

function getIconColor(index) {
    const colors = [10, 11, 12, 15, 13, 2, 14, 4, 5, 1, 0, 3];
    return colors[index % colors.length].toString();
}
function colorBlend(color1, color2, d = 0.5) {
    if (0 >= d) {
        return color1;
    }
    if (1 <= d) {
        return color2;
    }
    const e = 1 - d;
    color1 = parseInt(color1.slice(1, 7), 16);
    color2 = parseInt(color2.slice(1, 7), 16);
    return (
        `#${
            (
                (((color1 & 16711680) * e + (color2 & 16711680) * d) & 16711680) |
          (((color1 & 65280) * e + (color2 & 65280) * d) & 65280) |
          (((color1 & 255) * e + (color2 & 255) * d) & 255)
            )
                .toString(16)
                .padStart(6, "0")}`
    );
}
function getOldIconColor(index) {
    let color = gameDraw.getColor((index % 9) + 10);
    if (9 <= index) {
        color = colorBlend(color, gameDraw.getColor(((index + Math.floor(index / 9)) % 9) + 10));
    }
    return color;
}

function drawEntityIcon(model, x, y, len, height, lineWidthMult, angle, alpha, colorIndex, upgradeKey, hover = false, extraScale = 1) {
    const picture = (typeof model == "object") ? model : util.getEntityImageFromMockup(model, gui.color);
    const position = picture.position;
    const scale = (0.6 * len * extraScale) / position.axis;
    let entityX = x + 0.5 * len;
    let entityY = y + 0.5 * height;
    const baseColor = picture.color;

    // Find x and y shift for the entity image
    const xShift = position.middle.x * Math.cos(angle) - position.middle.y * Math.sin(angle);
    const yShift = position.middle.x * Math.sin(angle) + position.middle.y * Math.cos(angle);
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
            ctx[2].fillStyle = colors.black;
        } else {
            ctx[2].globalAlpha = 0.15;
            ctx[2].fillStyle = colors.guiwhite;
        }
        drawGuiRect(x, y, len, global.clickables.clicked ? height * 0.6 : height);
    }
    ctx[2].globalAlpha = (config.graphical.oldUIStyle ? 0.25 : 0.2) * alpha;
    ctx[2].fillStyle = colors.black;
    drawGuiRect(x, y + height * 0.6, len, height * 0.4);
    ctx[2].globalAlpha = 1;

    // Draw Tank
    drawEntity(baseColor, entityX, entityY, picture, 1, 1, scale / picture.size, lineWidthMult, angle, true, ctx[2]);

    // Tank name
    drawText(picture.upgradeName ?? picture.name, x + (upgradeKey ? 0.925 * len : len) / 2, y + height * 0.94, height / 10.25, colors.guiwhite, "center");

    // Upgrade key
    if (upgradeKey) {
        drawText(`[${upgradeKey}]`, x + len - 4, y + height - 6, height / 8 - (config.graphical.oldUIStyle ? 3 : 5), colors.guiwhite, "right");
    }
    ctx[2].strokeStyle = colors.black;
    ctx[2].lineWidth = 3 * lineWidthMult;
    drawGuiRect(x, y, len, height, true); // Border
}

const HEXAGON = (function() {
    const SQRT3 = Math.sqrt(3);
    const output = [];
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
    clearScreen(colors.white, 1, ctx[0]);
    clearScreen(colors.guiblack, 0.1, ctx[0]);

    const gameWidth = global.gameWidth = global.player.roomAnim.x.get(tick);
    const gameHeight = global.gameHeight = global.player.roomAnim.y.get(tick);

    //loop through the entire room setup
    ctx[0].globalAlpha = 1;
    ctx[0].fillStyle = colors.white;
    // Draw the room
    const roomX = -px + global.screenWidth / 2 - ratio * gameWidth / 2;
    const roomY = -py + global.screenHeight / 2 - ratio * gameHeight / 2;
    const roomWidth = ratio * gameWidth;
    const roomHeight = ratio * gameHeight;
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
        const W = global.roomSetup[0].length;
        const H = global.roomSetup.length;

        for (let f = 0; f < H; f++) {
            const e = global.roomSetup[f];
            for (let h = 0; h < W; h++) {
                const tile = e[h];
                const top = ratio * h * gameWidth / W - px + global.screenWidth / 2 - ratio * gameWidth / 2;
                const bottom = ratio * f * gameHeight / H - py + global.screenHeight / 2 - ratio * gameHeight / 2;
                const left = ratio * (h + 1) * gameWidth / W - px + global.screenWidth / 2 - ratio * gameWidth / 2;
                const right = ratio * (f + 1) * gameHeight / H - py + global.screenHeight / 2 - ratio * gameHeight / 2;
                if (tile.image) { // if a tile is a image, then get the image and render it.
                    ctx[0].globalAlpha = 1;
                    if (!tile.renderImage) {
                        tile.renderImage = new Image();
                        tile.renderImage.src = `img/${tile.image}`;
                        tile.renderImage.onerror = () => {
                            console.warn(`Failed to get ${tile.image}, using fallback texture.`);
                            tile.renderImage.src = "img/missingno.png";
                        };
                    };
                    ctx[0].drawImage(tile.renderImage, top, bottom, left - top, right - bottom);
                }

                ctx[0].globalAlpha = 0.3;
                if (tile.color == "none") {
                    tile.color = "border";
                }
                const tileColor = gameDraw.getColor(tile.color, true);
                // If not default tile color, draw that tile!
                if (tileColor !== colors.white) {
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
        ctx[0].strokeStyle = colors.guiblack;
        ctx[0].globalAlpha = 0.04;
        ctx[0].beginPath();
        gridsize *= config.graphical.gridDrawSize;
        if (config.graphical.hexaGrid) {
            const ygridsize = 2 * gridsize / 1.1525;
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
        const offsetX = (global.screenWidth - fullScreenWidth) / 2;
        const offsetY = (global.screenHeight - fullScreenHeight) / 2;
        ctx[1].drawImage(ctx[0].canvas, offsetX, offsetY, fullScreenWidth, fullScreenHeight);
        if (global.glCanvas) {
            ctx[1].drawImage(global.glCanvas, offsetX, offsetY, fullScreenWidth, fullScreenHeight);
        }
    } else if (document.getElementById("gameCanvas-background").style.display === "none") {
        document.getElementById("gameCanvas-background").style.display = "block";
    }
    // Draw things
    for (const instance of global.entities) {
        if (!instance.render.draws) {
            continue;
        }
        const motion = compensation();
        const rst = instance.render.status.getFade();
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
        const isize = instance.render.size.get(tick, 1 !== rst);
        instance.render.x = !config.graphical.interpolation ?
            motion.predict(instance.render.lastx, instance.x, instance.render.lastvx, instance.vx) :
            config.graphical.lerpAnimations ?
                util.lerp(instance.render.x, Math.round(instance.x + instance.vx), 0.1, true) :
                instance.render.xAnim.get(tick, 1 !== rst);

        instance.render.y = !config.graphical.interpolation ?
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
            instance.render.f = Math.atan2(global.target.y * global.reverseTank, global.target.x * global.reverseTank) : 0;

        let x = ratio * instance.render.x - px;
        let y = ratio * instance.render.y - py;
        const baseColor = instance.color;
        if (instance.id === gui.playerid) {
            const scoped = global.player.isScoping || getNow() < global.player.scopeSettle;
            x = !config.graphical.smoothcamera && !scoped && config.graphical.shakeProperties.CameraShake.shakeStartTime == -1 && !global.died ? 0 : x;
            y = !config.graphical.smoothcamera && !scoped && config.graphical.shakeProperties.CameraShake.shakeStartTime == -1 && !global.died ? 0 : y;
            global.player.screenx = x;
            global.player.screeny = y;
            global.player.name = instance.name ?? "";
        }
        x += global.screenWidth / 2;
        y += global.screenHeight / 2;
        let alpha = instance.id === gui.playerid ? 1 : instance.alpha;
        alpha = handleScreenDistance(alpha, instance, false);
        drawEntity(baseColor, x, y, instance, ratio, instance.alpha * alpha, 1, 1, instance.render.f, false, false, false, instance.render, isize);
    }
    for (const instance of global.entities) {
        let alpha = instance.id === gui.playerid ? 1 : instance.alpha;
        alpha = handleScreenDistance(alpha, instance);
        const x = instance.id === gui.playerid ? global.player.screenx : ratio * instance.render.x - px;
        const y = instance.id === gui.playerid ? global.player.screeny : ratio * instance.render.y - py;
        drawHealth(x, y, instance, ratio, gui.visibleEntities ? 1 : alpha, instance.size);
        drawName(x, y, instance, ratio, gui.visibleEntities ? alpha * 0.75 + 0.25 : alpha, instance.size);
        drawChatMessages(x, false, py, instance, ratio, gui.visibleEntities ? 1 : alpha, instance.size, px, py);
        drawChatInput(x, y, instance, ratio, instance.size);
    }
    if (global.advanced.blackout.active) {
        const entity = global.entities.find((u) => u.id === gui.playerid);
        if (entity) {
            ctx[1].beginPath();
            const x = global.screenWidth / 2 - px + ratio * 0;
            const y = global.screenHeight / 2 - py + ratio * 0;
            const kt = ratio * global.gameWidth;
            const ky = ratio * global.gameHeight;
            const G = global.roomSetup[0].length;
            const L = global.roomSetup.length;

            for (let S = 0; S < L; S++) {
                for (let ea = 0; ea < G; ea++) {
                    const Pc = x + ((ea + 0.5) / G) * kt - kt / 2;
                    const Qc = y + ((S + 0.5) / L) * ky - ky / 2;
                    const tile = global.roomSetup[S][ea];

                    if (tile.visibleOnBlackout) {
                        ctx[1].moveTo(Pc + ((0.5) / G) * kt, Qc);
                        ctx[1].arc(Pc, Qc, ((0.5) / G) * kt, 0, 2 * Math.PI);
                    }
                }
            }
            for (const entity of global.entities) {
                let x = ratio * entity.render.x - px;
                let y = ratio * entity.render.y - py;
                const indexes = entity.index.split("-");
                const m = global.mockups[parseInt(indexes[0])] ?? global.missingno[0];

                x += global.screenWidth / 2;
                y += global.screenHeight / 2;
                if (entity.id === gui.playerid || (m.visibleOnBlackout && entity.alpha < 0.1)) {
                    ctx[1].moveTo(x, y);
                    ctx[1].arc(x, y, entity.size * ratio * 4, 0, 2 * Math.PI);
                }
                if (entity.id === gui.playerid) {
                    if (!global.died) {
                        ctx[1].moveTo(x, y);
                        const na = Math.atan2(global.target.y * global.reverseTank, global.target.x * global.reverseTank);
                        ctx[1].arc(x, y, entity.size * ratio * 24, na - 0.3, na + 0.3);
                    }
                    for (const gun of m.guns) {
                        const facing = entity.render.f;
                        const tx = x + gun.offset * Math.cos(gun.direction + gun.angle + facing) + (gun.length / 2) * Math.cos(gun.angle + facing);
                        const ty = y + gun.offset * Math.sin(gun.direction + gun.angle + facing) + (gun.length / 2) * Math.sin(gun.angle + facing);
                        ctx[1].moveTo(tx, ty);
                        const Ia = facing + gun.angle;
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

global.scrollX = global.scrollY = global.fixedScrollX = global.fixedScrollY = -1;
global.scrollVelocityY = global.scrollVelocityX = 0;
let lastGuiType = null;
const classTreeDrag = {
    isDragging: false,
    startX: 0,
    startY: 0,
    lastX: 0,
    lastY: 0,
    momentum: { x: 0, y: 0 }
};

// Search functionality - OPTIMIZED
let searchResults = [];
let filteredTiles = null;
const searchCache = new Map(); // Cache search results

// Optimize rendering with culling
const SHOW_NAMES_ZOOM_THRESHOLD = 1.5;
const CULL_MARGIN = 200;

const tankNameCache = new Map();
global.searchQuery = "";
function searchTankByName(query) {
    if (!query || query.trim() === "") {
        searchResults = [];
        filteredTiles = null;
        tankNameCache.clear();
        global.searchQuery = ""; // Update global
        return;
    }

    const lowerQuery = query.toLowerCase().trim();
    global.searchQuery = query; // Update global

    // Check cache first
    if (searchCache.has(lowerQuery)) {
        const cached = searchCache.get(lowerQuery);
        searchResults = cached.results;
        filteredTiles = cached.tiles;
        return;
    }

    // Build name cache if empty
    if (tankNameCache.size === 0) {
        for (let i = 0; i < global.mockups.length; i++) {
            const m = global.mockups[i];
            if (m && m.name) {
                tankNameCache.set(i, m.name.toLowerCase());
            }
        }
    }

    // Search using cache
    searchResults = [];
    const matchingIndexes = new Set();

    for (const [index, name] of tankNameCache) {
        if (name.includes(lowerQuery)) {
            searchResults.push(global.mockups[index]);
            matchingIndexes.add(index);
        }
    }

    if (searchResults.length > 0) {
        // FIXED: Find all tiles in the upgrade path to matching tanks
        filteredTiles = [];

        // Helper function to check if a tank leads to any search result
        const leadsToSearchResult = (tankIndex, visited = new Set()) => {
            if (visited.has(tankIndex)) {
                return false;
            }
            visited.add(tankIndex);

            // Check if this tank is in search results
            if (matchingIndexes.has(parseInt(tankIndex))) {
                return true;
            }

            // Check if any of its upgrades lead to search results
            const mockup = global.mockups[parseInt(tankIndex)];
            if (mockup && mockup.upgrades) {
                for (const upgrade of mockup.upgrades) {
                    if (leadsToSearchResult(upgrade.index, visited)) {
                        return true;
                    }
                }
            }
            return false;
        };

        // Include all tiles that either match or lead to matching tanks
        for (const tile of tiles) {
            const tileIndex = parseInt(tile.index);
            if (matchingIndexes.has(tileIndex) || leadsToSearchResult(tile.index)) {
                filteredTiles.push(tile);
            }
        }
    } else {
        // Show only basic if no results found
        filteredTiles = tiles.filter((tile) => {
            const mockup = global.mockups[parseInt(tile.index)];
            return mockup && mockup.className === "basic";
        });
    }

    // Cache the results
    searchCache.set(lowerQuery, {
        results: searchResults,
        tiles: filteredTiles
    });
}
global.searchTankByName = searchTankByName;

function drawUpgradeTree(spacing, alcoveSize) {
    if (lastGuiType != gui.type || global.generateTankTree) {
        try {
            const m = util.requestEntityImage(gui.type);
            const rootName = m.rerootUpgradeTree;
            const rootIndex = [];
            for (const name of rootName) {
                const mockup = global.mockups.find((i) => i && i.className === name);
                const ind = name == undefined || !mockup ? -1 : mockup.index;
                rootIndex.push(ind);
            }
            if (!rootIndex.includes(-1)) {
                generateTankTree(rootIndex);
            }
            lastGuiType = gui.type;
            global.generateTankTree = false;
            // Clear search when tree regenerates
            global.searchQuery = ""; // Use global
            searchResults = [];
            filteredTiles = null;
            searchCache.clear();
        } catch { }
    }

    if (!tankTree) {
        console.log("No class tree rendered yet.");
        return;
    }
    // Draw semi-transparent overlay
    ctx[2].globalAlpha = 0.5;
    ctx[2].fillStyle = colors.guiwhite;
    ctx[2].fillRect(0, 0, global.screenWidth, global.screenHeight);
    ctx[2].globalAlpha = 1;

    // Render the class tree if ready.
    if (global.renderTankTree) {
        const tileSize = alcoveSize / 2;
        const size = tileSize - 4;
        const spaceBetween = 10;
        const screenDivisor = (spaceBetween + tileSize) * 2 * global.treeScale;
        const padding = tileSize / screenDivisor;
        const dividedWidth = global.screenWidth / screenDivisor;
        const dividedHeight = global.screenHeight / screenDivisor;
        const treeFactor = 1 + spaceBetween / tileSize;

        // Apply momentum decay with optimization
        if (!classTreeDrag.isDragging) {
            const friction = 0.92;
            classTreeDrag.momentum.x *= friction;
            classTreeDrag.momentum.y *= friction;

            // Stop momentum if very small
            if (Math.abs(classTreeDrag.momentum.x) < 0.1) {
                classTreeDrag.momentum.x = 0;
            }
            if (Math.abs(classTreeDrag.momentum.y) < 0.1) {
                classTreeDrag.momentum.y = 0;
            }
        }

        // Update scroll position with momentum
        global.scrollVelocityX = classTreeDrag.momentum.x;
        global.scrollVelocityY = classTreeDrag.momentum.y;

        global.fixedScrollX = Math.max(
            dividedWidth - padding,
            Math.min(
                tankTree.width * treeFactor + padding - dividedWidth,
                global.fixedScrollX + global.scrollVelocityX
            )
        );
        global.fixedScrollY = Math.max(
            dividedHeight - padding,
            Math.min(
                tankTree.height * treeFactor + padding - dividedHeight,
                global.fixedScrollY + global.scrollVelocityY
            )
        );
        if (Math.abs(global.targetTreeScale - global.treeScale) > 0.001) {
            global.treeScale += (global.targetTreeScale - global.treeScale) * 0.15;
            if (Math.abs(global.targetTreeScale - global.treeScale) < 0.001) {
                global.treeScale = global.targetTreeScale;
            }
        }
        // Smooth scroll interpolation
        global.scrollX = util.lerp(global.scrollX, global.fixedScrollX, 0.10, true);
        global.scrollY = util.lerp(global.scrollY, global.fixedScrollY, 0.10, true);

        // Determine which tiles to render based on search
        const tilesToRender = filteredTiles || tiles;

        // OPTIMIZED: Pre-calculate values
        const halfWidth = global.screenWidth / 2;
        const halfHeight = global.screenHeight / 2;
        const tileSpacing = tileSize + spaceBetween;
        const scaledSpacing = tileSpacing * global.treeScale;
        const halfSize = 0.5 * size;

        // Draw branches (optimized with culling)
        ctx[2].strokeStyle = colors.black;
        ctx[2].lineWidth = 2 * global.treeScale;
        ctx[2].beginPath();

        for (const [start, end] of branches) {
            const sx = ((start.x - global.scrollX) * tileSpacing + 1 + halfSize) * global.treeScale + halfWidth;
            const sy = ((start.y - global.scrollY) * tileSpacing + 1 + halfSize) * global.treeScale + halfHeight;
            const ex = ((end.x - global.scrollX) * tileSpacing + 1 + halfSize) * global.treeScale + halfWidth;
            const ey = ((end.y - global.scrollY) * tileSpacing + 1 + halfSize) * global.treeScale + halfHeight;

            // Culling check with margin
            if (ex < -CULL_MARGIN || sx > global.screenWidth + CULL_MARGIN ||
                    ey < -CULL_MARGIN || sy > global.screenHeight + CULL_MARGIN) {
                continue;
            }

            ctx[2].moveTo(sx, sy);
            ctx[2].lineTo(ex, ey);
        }
        ctx[2].stroke();

        // Draw tank icons (optimized with culling)
        const angle = -Math.PI / 4;
        const scaledTileSize = tileSize * global.treeScale;

        for (const { x, y, colorIndex, index } of tilesToRender) {
            const ax = (x - global.scrollX) * scaledSpacing + halfWidth;
            const ay = (y - global.scrollY) * scaledSpacing + halfHeight;

            // Culling check with margin
            if (ax < -scaledTileSize - CULL_MARGIN || ax > global.screenWidth + CULL_MARGIN ||
                    ay < -scaledTileSize - CULL_MARGIN || ay > global.screenHeight + CULL_MARGIN) {
                continue;
            }

            drawEntityIcon(index.toString(), ax, ay, scaledTileSize, scaledTileSize, global.treeScale, angle, 1, colorIndex, false, false, 1);
        }
    }


    // Draw UI elements
    drawClassTreeUI(spacing);

    ctx[2].globalAlpha = 1;
}
global.targetTreeScale = 1;
global.classTreeDrag = classTreeDrag;
function drawClassTreeUI(spacing) {
    if (!global.renderTankTree) {
        //drawText("Loading class tree...", global.screenWidth / 2, global.screenHeight / 2, 25, color.guiwhite, "center");
        return;
    }
    const uiY = spacing + 20;
    const buttonSize = 40;
    const buttonSpacing = 10;

    // Draw text for a tip
    drawText("Arrow keys or mouse to navigate the class tree. Shift to navigate faster. Scroll wheel, (+/- keys) or zoom buttons to zoom in/out.", global.screenWidth / 2, spacing + 10, 17, colors.guiwhite, "center");

    // Draw search bar (centered)
    const searchBarWidth = 300;
    const searchBarHeight = 35;
    const searchBarX = global.screenWidth / 2 - searchBarWidth / 2;
    const searchBarY = uiY;

    // Highlight if active
    ctx[2].globalAlpha = global.searchBarActive ? 0.95 : 0.8;
    ctx[2].fillStyle = global.searchBarActive ? colors.vlgrey : colors.white;
    ctx[2].fillRect(searchBarX, searchBarY, searchBarWidth, searchBarHeight);
    ctx[2].strokeStyle = global.searchBarActive ? colors.blue : colors.black;
    ctx[2].lineWidth = global.searchBarActive ? 3 : 2;
    ctx[2].strokeRect(searchBarX, searchBarY, searchBarWidth, searchBarHeight);
    ctx[2].globalAlpha = 1;

    const displayText = global.searchBarActive && !global.searchQuery
        ? "Type to search..."
        : global.searchQuery || "Search";
    const textColor = colors.white;
    const showCursor = global.searchBarActive && Date.now() % 1000 < 500;

    drawText(
        displayText + (showCursor ? "|" : ""),
        searchBarX + 10,
        searchBarY + searchBarHeight / 2,
        14,
        textColor,
        "left",
        true
    );

    // Draw zoom buttons (moved to accommodate search bar position)
    const zoomInX = searchBarX + searchBarWidth + buttonSpacing + 20;
    const zoomOutX = zoomInX + buttonSize + buttonSpacing;

    // Zoom In button
    drawButton(
        zoomInX,
        searchBarY,
        buttonSize,
        searchBarHeight,
        1,
        "rect",
        "+",
        20,
        colors.grey,
        colors.black,
        colors.black,
        true,
        "classTreeZoomIn",
        global.canvas.height / global.screenHeight / global.ratio,
        {
            index: 0
        }
    );

    // Zoom Out button
    drawButton(
        zoomOutX,
        searchBarY,
        buttonSize,
        searchBarHeight,
        1,
        "rect",
        "-",
        20,
        colors.grey,
        colors.black,
        colors.black,
        true,
        "classTreeZoomOut",
        global.canvas.height / global.screenHeight / global.ratio,
        {
            index: 1
        }
    );

    // Draw close button (X) on the left
    const closeButtonSize = 35;
    const closeButtonX = searchBarX - buttonSpacing * 2.6;
    const closeButtonY = uiY;
    // Draw close button
    drawButton(
        closeButtonX,
        closeButtonY,
        closeButtonSize,
        closeButtonSize,
        1,
        "rect",
        "✕",
        32,
        colors.red,
        colors.black,
        colors.black,
        true,
        "classTreeClose",
        global.canvas.height / global.screenHeight / global.ratio,
        {
            index: 0,
            textOutline: false
        }
    );

    // Draw search results info
    const instructionY = searchBarY + searchBarHeight + 5;
    if (global.searchQuery) {
        const resultsText = searchResults.length > 0
            ? `Found ${searchResults.length} tank${searchResults.length !== 1 ? "s" : ""} (showing upgrade paths)`
            : "No tanks found - showing Basic";
        drawText(
            resultsText,
            global.screenWidth / 2,
            instructionY + 10,
            11,
            searchResults.length > 0 ? colors.green : colors.orange,
            "center"
        );
    }
}

function drawMessages(spacing, alcoveSize) {
    // Draw messages
    const height = 18;
    const x = global.screenWidth / 2;
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
        const msg = global.messages[i];
        const txt = msg.text;
        const time = Bd - msg.time;
        const duration = msg.duration - time;
        const text = txt;

        if (0 >= duration) {
            global.messages.splice(i, 1);
            continue;
        }

        const K = Math.max(0, Math.min(1, time / 300, duration / 300));
        if (msg.textJSON) { // If a message is like a big ass box then draw this instead.
            let len = 0;
            // Give it a textobj if it doesn't have one
            msg.textJSON.forEach((txt) => {
                if (len < measureText(txt, height - 4.25, false)) {
                    len = measureText(txt, height - 4.25, false);
                }
            });
            ctx[2].globalAlpha = 0.5 * K;
            // Draw the background
            drawBarAdvanced(x - len / 2, x + len / 2, y + yy / 2, height, colors.black, 17.5 * (msg.textJSON.length) - 17.5 + 1);
            ctx[2].globalAlpha = K;
            // Draw the text
            msg.textobjs = [];
            msg.textJSON.forEach((txt) => {
                msg.textobjs[msg.textobjs.length] = function() { }; // For some reason this fixes the text's location i guess.
                drawText(txt, x - len / 2 + 2, y + 16 + 17.5 * (msg.textobjs.length - 1), height - 4.3, colors.guiwhite, "left", false, 1, 5.5);
            });
            y += 23 * K + 17.5 * (3 - 2 * K) * (msg.textJSON.length - 1) * K * K;
        } else {
            // Give it a textobj if it doesn't have one
            if (msg.len == null) {
                msg.len = measureText(text, height - 4.3);
            }
            // Draw the background
            ctx[2].globalAlpha = 0.5 * K;
            drawBar(x - msg.len / 2, x + msg.len / 2, y + yy / 2, height + 2, colors.black);
            // Draw the text
            ctx[2].globalAlpha = K;
            drawText(text, x, y + yy / 1.3, height - 4.3, colors.guiwhite, "center", false, 1, 5.5);
            y += 23 * (3 - 2 * K) * K * K;
        }
    }
    ctx[2].globalAlpha = 1;
}

function drawChatMessages(x, y, py, instance, ratio, alpha, isize) {
    if (!global.GUIStatus.renderChatMessages) {
        return;
    }
    if (!(instance.id === gui.playerid) && instance.alpha < 0.25) {
        return;
    }
    const size = isize * ratio;
    const g = Math.max(20, size);

    if (!y) {
        y = instance.id === gui.playerid
            ? global.player.screeny - 1 * global.showChatGlide * g
            : ratio * instance.render.y - py;
    }
    //put chat msg above name
    let fade = instance.render.status.getFade();
    fade *= fade;
    ctx[1].globalAlpha = fade;

    x += global.screenWidth / 2;
    y += global.screenHeight / 2;
    if (instance.id !== gui.playerid && instance.nameplate) {
        y -= 8 * ratio;
    }
    const messages = global.chats[instance.id];
    if (!messages) {
        return;
    }

    const messageSpacing = 25 * 0.04 * g;

    // Draw all the messages
    for (let i = 0; i < messages.length; i++) {
        const chatIndex = messages.length - 1 - i;
        const chat = messages[chatIndex];
        const text = censorChat(chat.text, document.getElementById("optNames").value);
        const msgLengthHalf = measureText(text, 0.5 * g) / 2;
        const barScale = global.GUIStatus.renderPlayerScores ? 2.66 : 2.26;
        const textScale = global.GUIStatus.renderPlayerScores ? 2.45 : 2.05;
        const valpha = chat.alpha.get();

        if (chat.erased && valpha === 0) {
            util.remove(global.chats[instance.id], chatIndex); // Remove the chat object
            messages.sort((a, b) => a.id - b.id); // Sort the messages or else the order will get messed up
        }
        if (chat.targetY === undefined) {
            chat.targetY = i * messageSpacing;
            chat.currentY = i === 0 ? 0 : (i - 1) * messageSpacing;
        }
        chat.targetY = i * messageSpacing;
        const animationSpeed = 10;
        chat.currentY += (chat.targetY - chat.currentY) * animationSpeed / global.metrics.rendertime;
        const slideOffset = chat.currentY;

        // Skip rendering if completely faded out
        if (valpha <= 0) {
            continue;
        }

        ctx[1].globalAlpha = 0.5 * valpha * alpha * alpha * fade;
        drawBar(x - msgLengthHalf, x + msgLengthHalf, y - g * (instance.id === gui.playerid ? 2.26 : barScale) - slideOffset, 0.75 * g, gameDraw.getColorDark(gameDraw.getColor(instance.color.split(" ")[0])), ctx[1]);
        ctx[1].globalAlpha = valpha * alpha * fade;
        config.graphical.fontStrokeRatio *= 1.2;
        drawText(text, x, y - g * (instance.id === gui.playerid ? 2.05 : textScale) - slideOffset, 0.50 * g, colors.guiwhite, "center", false, 1, true, ctx[1]);
        config.graphical.fontStrokeRatio /= 1.2;
    }
}


function drawHealth(x, y, instance, ratio, alpha, isize) {
    if (!(0.02 > alpha)) {
        let fade = instance.render.status.getFade();
        fade *= fade;
        ctx[1].globalAlpha = fade;

        const size = isize * ratio;
        const indexes = instance.index.split("-");
        let m = global.mockups[parseInt(indexes[0])];
        if (!m) {
            m = global.missingno[0];
        }
        const realSize = (size / m.size) * m.realSize;

        if (instance.drawsHealth) {
            const health = instance.render.health.get();
            const shield = instance.render.shield.get();

            x += global.screenWidth / 2;
            y += global.screenHeight / 2;

            if (health < 0.99 || shield < 0.99 && global.GUIStatus.renderhealth) {
                const col = config.graphical.coloredHealthbars ? gameDraw.mixColors(gameDraw.modifyColor(instance.color), colors.guiwhite, 0.5) : colors.lgreen;
                const yy = y + realSize + 14.3 * ratio;
                const barWidth = 1 * ratio;
                const barChunk = (config.graphical.barChunk || 0) * ratio;
                const seperated = config.graphical.separatedHealthbars;

                ctx[1].globalAlpha = alpha * alpha * fade;

                // Background bar
                drawBar(x - size, x + size, yy, seperated ? barWidth + barChunk * 1.6 : barWidth + barChunk, colors.black, ctx[1]);

                // HP bar
                drawBar(x - size, x - size + 2 * size * health, seperated ? yy + barWidth * 1.45 : yy, barWidth + barChunk * 0.35, col, ctx[1]);

                if (shield || seperated) {
                    if (!seperated) {
                        ctx[1].globalAlpha *= 0.7;
                    }
                    ctx[1].globalAlpha *= 0.3 + 0.3 * shield;
                    drawBar(x - size, x - size + 2 * size * shield, seperated ? yy - barWidth * 1.45 : yy, barWidth + barChunk * 0.35, config.graphical.coloredHealthbars ? gameDraw.mixColors(col, colors.guiblack, 0.25) : colors.teal, ctx[1]);
                }
                if (gui.showhealthtext) {
                    drawText(`${Math.round(instance.healthN)}/${Math.round(instance.maxHealthN)}`, x, yy + barWidth * 2 + barWidth * config.graphical.separatedHealthbars * 2 + 10, 12 * ratio, colors.guiwhite, "center");
                }
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

        const size = isize * ratio;
        x += global.screenWidth / 2;
        y += global.screenHeight / 2;

        if (instance.id !== gui.playerid && instance.nameplate) {
            var name = instance.name.substring(7, instance.name.length + 1);
            var namecolor = instance.name.substring(0, 7);
            ctx[1].globalAlpha = alpha * alpha * fade;
            const g = Math.max(20, size);
            if (global.GUIStatus.renderPlayerNames) {
                drawText(name, x, y - g * (global.GUIStatus.renderPlayerScores ? 1.9 : 1.45), 0.55 * g, namecolor == "#FFFFFF" ? colors.guiwhite : namecolor, "center", false, 1, true, ctx[1]);
            }
            if (global.GUIStatus.renderPlayerScores || typeof instance.score === "string") {
                drawText(typeof instance.score === "string" ? instance.score : util.handleLargeNumber(instance.score, 1), x, y - 1.45 * g, 0.3 * g, namecolor == "#FFFFFF" ? colors.guiwhite : namecolor, "center", false, 1, true, ctx[1]);
            }
            ctx[1].globalAlpha = 1;
        }
    }
}

function drawSkillBars(spacing, alcoveSize) {
    // Draw skill bars
    if (global.mobile) {
        return drawMobileSkillUpgrades(spacing, alcoveSize);
    }
    statMenu.set(0 + (global.died || global.statHover || (global.canSkill && !gui.skills.every((skill) => skill.cap === skill.amount))));
    global.clickables.stat.hide();

    const vspacing = 5;
    const height = 14;
    const gap = 44.5;
    let len = alcoveSize - 10; // * global.screenWidth; // The 30 is for the value modifiers
    const save = len;
    const x = spacing + 3 + (statMenu.get() - 1) * (height + 50 + len * ska(gui.skills.reduce((largest, skill) => Math.max(largest, skill.cap), 0)));
    let y = global.screenHeight - spacing - 5.5 - height;
    let ticker = 11;
    let namedata;
    try {
        namedata = gui.getStatNames(global.mockups[parseInt(gui.type.split("-")[0])].statnames);
    } catch (e) {
        namedata = gui.getStatNames(global.missingno[0].statnames);
    }
    const clickableRatio = global.canvas.height / global.screenHeight / global.ratio;

    for (let i = 0; i < gui.skills.length; i++) {
        ticker--;
        //information about the bar
        const skill = gui.skills[i];
        const name = namedata[ticker - 1];
        const level = skill.amount;
        const col = colors[skill.color];
        const cap = skill.softcap;
        const maxLevel = skill.cap;

        if (!cap) {
            continue;
        }

        len = save;
        let max = 0;
        const extension = cap > max;
        const blocking = cap < maxLevel;
        if (extension) {
            max = cap;
        }

        //bar fills
        drawBar(x + height / 2, x - height / 2 + len * ska(cap) - 14, y + height / 2, height - 2.8 + config.graphical.barChunk, colors.black);
        drawBar(x + height / 2, x + height / 2 + len * ska(cap) - gap, y + height / 2, height - 3, colors.grey);
        drawBar(x + height / 2, x + height / 2 + len * ska(level) - gap, y + height / 2, height - 5.5 + config.graphical.barChunk, colors.black);
        drawBar(x + height / 2, x + height / 2 + len * ska(level) - gap, y + height / 2, height - 3.5, col);

        // Blocked-off area
        if (blocking) {
            ctx[2].lineWidth = 1;
            ctx[2].strokeStyle = colors.grey;
            for (let j = cap + 1; j < max; j++) {
                drawGuiLine(x + len * ska(j) - gap, y + 1.5, x + len * ska(j) - gap, y - 3 + height);
            }
        }

        // Vertical dividers
        ctx[2].strokeStyle = colors.black;
        ctx[2].lineWidth = 1;
        for (let j = 1; j < level + 1; j++) {
            drawGuiLine(x + len * ska(j) - gap, y + 1.5, x + len * ska(j) - gap, y - 3 + height);
        }

        // Skill name
        len = save * ska(max);
        const textcolor = level == maxLevel ? col : !gui.points || (cap !== maxLevel && level == cap) ? colors.grey : colors.guiwhite;
        drawText(name, Math.round(x + len / 2) - 5.5, y + height / 2, height - 4.1, textcolor, "center", true);

        // Skill key
        drawText(`[${getKeybind(`KEY_SKILL_${ticker}`)}]`, Math.round(x + len - height * 0.25) - 14.5, y + height / 2, height - 6, textcolor, "right", true);
        if (textcolor === colors.guiwhite) {
            // If it's active
            global.clickables.stat.place(ticker - 1, x * clickableRatio, y * clickableRatio, len * clickableRatio, height * clickableRatio);
        }

        // Skill value
        if (level) {
            drawText(`+${level}`, Math.round(x + len + 4) - 5.5, y + height / 2, height - 5, col, "left", true);
        }

        // Move on
        y -= height + vspacing;
    }

    global.clickables.hover.place(0, 0, y * clickableRatio, 0.8 * len * clickableRatio, (global.screenHeight - y) * clickableRatio);
    if (gui.points !== 0) {
        // Draw skillpoints to spend
        drawText(`x${gui.points}`, Math.round(x + len - 2) - 13, Math.round(y + height - 4) + 2, 18.5, colors.guiwhite, "right");
    }
}

function drawSelfInfo(max) {
    if (global.died) {
        return;
    }
    //rendering information
    let width = 440;
    let scorewidth = 70;
    let scorelength = 0;
    let height = 25.5;
    let x = (global.screenWidth - width) / 2;
    let y = global.screenHeight - 22 - height;
    if (config.graphical.oldUIStyle) {
        y += 2.5;
        width -= 90;
        scorewidth -= 37;
        height = 25;
        x = (global.screenWidth - width) / 2;
    }
    ctx[2].lineWidth = 10;
    let extraHeight = config.graphical.oldUIStyle ? 5 : 3;
    drawBar(x, x + width, y + height / 2, height - 3 + config.graphical.barChunk, colors.black);
    drawBar(x, x + width, y + height / 2, height - 3, colors.grey);
    drawBar(x, x + width * gui.__s.getProgress(), y + height / 2, height - 3.5, colors.gold);
    const censorClass = config.game.dmcaMode && typeof gui.type === "string" && (global.mockups[parseInt(gui.type)]?.censor & 1);
    drawText(`Level ${gui.__s.getLevel()} ${censorClass ? censorText(gui.class) : gui.class}`, x + width / 2, config.graphical.oldUIStyle ? y + height / 2 + 8 : y + height / 2 + 9, config.graphical.oldUIStyle ? 20.5 : 21, colors.guiwhite, "center", false, 6);
    height = 17;
    y -= height + 5;
    if (config.graphical.oldUIStyle) {
        y += 2;
        scorewidth = 35;
    }
    if (global.GUIStatus.renderPlayerKillbar) {
        scorelength = -112.2;
        scorewidth = 160;
        if (config.graphical.oldUIStyle) {
            scorelength = -90.2;
            scorewidth = 120;
        }
        drawBar(x + scorewidth - scorelength, x + width - scorewidth - scorelength, y + height / 2, height - extraHeight + config.graphical.barChunk, colors.black);
        drawBar(x + scorewidth - scorelength, x + width - scorewidth - scorelength, y + height / 2, height - extraHeight, colors.grey);
        drawBar(x + scorewidth - scorelength, x - scorelength + width * ((scorewidth / width) + ((width - scorewidth * 2) / width) * Math.min(1, gui.__s.getKills()[0] / 1)), y + height / 2, height - extraHeight - 0.5, (gui.__s.getScore() / gui.__s.getKills()[0] <= 40000) ? colors.teal : colors.purple);
        extraHeight = config.graphical.oldUIStyle ? 5 : 6;
        drawText(`Kills: ${util.formatKills(...gui.__s.getKills())}`, x + width / 2 - scorelength, y + height / 2 + extraHeight, config.graphical.oldUIStyle ? 12 : 13, colors.guiwhite, "center");
        extraHeight = config.graphical.oldUIStyle ? 5 : 3;
        scorelength = 72.5;
        scorewidth = 120;
        if (config.graphical.oldUIStyle) {
            scorelength = 65.5;
            scorewidth = 95;
        }
    }
    drawBar(x + scorewidth - scorelength, x + width - scorewidth - scorelength, y + height / 2, height - extraHeight + config.graphical.barChunk, colors.black);
    drawBar(x + scorewidth - scorelength, x + width - scorewidth - scorelength, y + height / 2, height - extraHeight, colors.grey);
    drawBar(x + scorewidth - scorelength, x - scorelength + width * ((scorewidth / width) + ((width - scorewidth * 2) / width) * (max ? Math.min(1, gui.__s.getScore() / max) : 1)), y + height / 2, height - extraHeight - 0.5, colors.green);
    extraHeight = config.graphical.oldUIStyle ? 6 : 6;
    drawText(`Score: ${util.formatLargeNumber(Math.round(gui.__s.getScore()))}`, x + width / 2 - scorelength, y + height / 2 + extraHeight, config.graphical.oldUIStyle ? 12.5 : 13, colors.guiwhite, "center");
    ctx[2].lineWidth = 4;
    var name = global.player.name.substring(7, global.player.name.length + 1);
    drawText(name, Math.round(x + width / 2) + 1.5, Math.round(y - 10 - 4) - 1, 31, global.nameColor == "#FFFFFF" ? colors.guiwhite : global.nameColor, "center");
}

function handleSpeedMonitor() {
    if ((100 * gui.fps) < 100) {
        global.serverStats.lag_color = colors.orange;
    } else {
        global.serverStats.lag_color = colors.guiwhite;
    }
    if (global.metrics.rendertime < 10) {
        global.metrics.rendertime_color = colors.orange;
    } else {
        global.metrics.rendertime_color = colors.guiwhite;
    }
    if (global.serverStats.mspt > 28.0) {
        global.serverStats.mspt_color = colors.red;
    } else if (global.serverStats.mspt > 20.0) {
        global.serverStats.mspt_color = colors.orange;
    } else {
        global.serverStats.mspt_color = colors.guiwhite;
    }
}
function drawMinimapAndDebug(spacing, alcoveSize, GRAPHDATA) {
    // Draw minimap and FPS monitors
    // Minimap stuff starts here
    const len = alcoveSize; // * global.screenWidth;
    const height = (len / global.gameWidth) * global.gameHeight;
    const upgradeColumns = Math.ceil(gui.upgrades.length / 9);
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
        const centerX = x + len / 2;
        const centerY = y + height / 2;

        ctx[2].globalAlpha = 0.4;
        ctx[2].save();
        ctx[2].fillStyle = colors.white;
        global.advanced.roundArena == true ? drawGuiCircle(x + len / 2, y + height / 2, len / 2) : drawGuiRect(x, y, len, height);
        ctx[2].beginPath(); // We will not allow to draw outside of the minimap so we are only allowing minimap entities to draw INSIDE the minimap only
        global.advanced.roundArena == true ? ctx[2].arc(x + len / 2, y + height / 2, len / 2, 0, 2 * Math.PI) : ctx[2].rect(x, y, len, height); // Draw everything inside the minimap
        ctx[2].clip();

        if (global.roomSetup.length) {
            const W = global.roomSetup[0].length;
            const H = global.roomSetup.length;
            let i = 0;

            // Use the rendered camera, not the unsmoothed position.
            const playerWorldX = global.player.camX;
            const playerWorldY = global.player.camY;

            for (let ycell = 0; ycell < H; ycell++) {
                let j = 0;
                for (let xcell = 0; xcell < W; xcell++) {
                    const cell = global.roomSetup[ycell][xcell];
                    // Calculate cell world position
                    const cellWorldX = (xcell / W - 0.5) * global.gameWidth;
                    const cellWorldY = (ycell / H - 0.5) * global.gameHeight;

                    // Calculate relative position to player
                    const relX = cellWorldX - playerWorldX;
                    const relY = cellWorldY - playerWorldY;

                    // Convert to minimap coordinates
                    const minimapX = config.game.centeredMinimap ? centerX + (relX / global.gameWidth) * len : x + (j * len) / W;
                    const minimapY = config.game.centeredMinimap ? centerY + (relY / global.gameHeight) * height : y + (i * height) / H;
                    const cellWidth = len / W;
                    const cellHeight = height / H;
                    if (!cell) {
                        ctx[2].fillStyle = gameDraw.getColor("border", true);
                        drawGuiRect(minimapX, minimapY, cellWidth, cellHeight);
                    } else {
                        const color = cell.color;
                        if (color == "none") {
                            cell.color = "pureBlack";
                        }
                        if (cell.renderImage) {
                            ctx[2].globalAlpha = 1;
                            ctx[2].drawImage(cell.renderImage, minimapX, minimapY, cellWidth, cellHeight);
                        }
                        ctx[2].globalAlpha = 0.4;
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
        for (const entity of minimap.get()) {
            ctx[2].fillStyle = gameDraw.mixColors(gameDraw.modifyColor(entity.color), colors.black, 0.3);
            ctx[2].globalAlpha = entity.alpha;

            // Calculate entity position relative to player
            const relX = entity.x - global.player.camX;
            const relY = entity.y - global.player.camY;

            // Convert to minimap coordinates
            const minimapX = config.game.centeredMinimap ? centerX + (relX / global.gameWidth) * len : x + (entity.x / global.gameWidth + 0.5) * len;
            const minimapY = config.game.centeredMinimap ? centerY + (relY / global.gameHeight) * height : y + (entity.y / global.gameHeight + 0.5) * height;

            switch (entity.type) {
                case 2:
                // Draw wall entities
                { const trueSize = (entity.size + 2) / 1.1283791671;
                    const sizeOnMap = (trueSize / global.gameWidth) * len;
                    drawGuiRect(minimapX - sizeOnMap, minimapY - sizeOnMap, sizeOnMap * 2, sizeOnMap * 2);
                    break; }
                case 1:
                // Draw rock/other entities
                { const entitySize = (entity.size / global.gameWidth) * len;
                    drawGuiCircle(minimapX, minimapY, entitySize);
                    break; }
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
        ctx[2].strokeStyle = colors.guiblack;
        ctx[2].fillStyle = colors.guiblack;
        // Draw yourself in the minimap
        drawGuiCircle(config.game.centeredMinimap ? centerX : x + (global.player.camX / global.gameWidth + 0.5) * len, config.game.centeredMinimap ? centerY : y + (global.player.camY / global.gameHeight + 0.5) * height, !global.mobile ? 2 : 3.5, false);
        ctx[2].restore();
        ctx[2].globalAlpha = 1;
        ctx[2].fillStyle = colors.black;
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
        lagGraph(lag.get(), x, y - 40, len, 30, colors.teal);
        gapGraph(global.metrics.rendergap, x, y - 40, len, 30, colors.pink);
        timingGraph(GRAPHDATA, x, y - 40, len, 30, colors.yellow);
    }
    // Minimap stuff ends here
    // Debug stuff
    if (!global.showDebug) {
        y += 13 * 3;
    }
    // Text
    handleSpeedMonitor();

    if (!global.metrics.latency.length) {
        global.metrics.latency.push(0);
    }
    const ping = global.metrics.latency.reduce((b, a) => b + a, 1) / global.metrics.latency.length - 1;
    const xloc = global.player.renderx / 30;
    const yloc = global.player.rendery / 30;
    const watermarkText = "Open Source Arras";
    const versionLength = (measureText(global.version ?? "v?", 32)) / 2;
    const length = Math.max(measureText(watermarkText, 32)) / 16;
    const gradientTransition = global.showDebug ? 4.1 : 2;
    const watermarkTextPos1 = Math.round(x + len / gradientTransition) + 0.5;
    const watermarkColor = gameDraw.getColor({gradient: true, asset: [{color: `${colors.blue}`}, {color: `${colors.green}`}]}, ctx[2], watermarkTextPos1 - length, length * 0.085, watermarkTextPos1 + length, 0);
    if (global.showDebug) {
        const getRenderingInfo = (data, isTurret) => {
            isTurret ? global.renderingInfo.turretEntities += data.length : global.renderingInfo.entities += data.length;
            for (const instance of data) {
                if (instance.name && instance.id !== gui.playerid) {
                    global.renderingInfo.entitiesWithName++;
                }
                if (instance.turrets.length) {
                    getRenderingInfo(instance.turrets, true);
                }
            };
        };
        getRenderingInfo(global.entities, false);
        if (!global.tankSpeedHistory) {
            global.tankSpeedHistory = [];
        }
        const HISTORY_LENGTH = 5;
        let rawSpeed = Math.sqrt(global.player.vx * global.player.vx + global.player.vy * global.player.vy) * config.roomSpeed;
        rawSpeed = rawSpeed * 0.765;
        global.tankSpeedHistory.push(rawSpeed);
        if (global.tankSpeedHistory.length > HISTORY_LENGTH) {
            global.tankSpeedHistory.shift();
        }
        const tankSpeed = global.tankSpeedHistory.reduce((sum, val) => sum + val, 0) / global.tankSpeedHistory.length;
        const fmtData = (n) => n >= 1073741824 ? `${(n / 1073741824).toFixed(2)} GB` : n >= 1048576 ? `${(n / 1048576).toFixed(2)} MB` : n >= 1024 ? `${(n / 1024).toFixed(1)} KB` : `${n} B`;
        const lastPacketMs = global.metrics.lastPacketTime ? Math.max(0, Date.now() - global.metrics.lastPacketTime) : 0;
        drawText(watermarkText, x + len - versionLength - 4, y - 50 - 12 * 14 - 2, 15, watermarkColor, "right");
        drawText(global.version ?? "v?", x + len, y - 50 - 12 * 14 - 2, 15, colors.guiwhite, "right");
        drawText(`§${global.serverStats.lag_color}§ ${(100 * gui.fps).toFixed(2)}% §reset§/ ${global.serverStats.players} player${global.serverStats.players == 1 ? "" : "s"}`, x + len, y - 50 - 11 * 14, 10, colors.guiwhite, "right");
        drawText(`Coordinates: (${xloc.toFixed(2)}, ${yloc.toFixed(2)})`, x + len, y - 50 - 10 * 14, 10, colors.guiwhite, "right");
        drawText(`Speed: ${tankSpeed.toFixed(2)} gu/s`, x + len, y - 50 - 9 * 14, 10, colors.guiwhite, "right");
        drawText(`Memory: ${global.metrics.rendergap.toFixed(1)} MiB`, x + len, y - 50 - 8 * 14, 10, colors.guiwhite, "right");
        drawText(`Rendering: e ${global.renderingInfo.entities} t: ${global.renderingInfo.turretEntities} n: ${global.renderingInfo.entitiesWithName}`, x + len, y - 50 - 7 * 14, 10, colors.guiwhite, "right");
        drawText(`WS sent: ${fmtData(global.bandwidth.totalHa)}`, x + len, y - 50 - 6 * 14, 10, colors.guiwhite, "right");
        drawText(`WS received: ${fmtData(global.bandwidth.totalFa)}`, x + len, y - 50 - 5 * 14, 10, colors.guiwhite, "right");
        drawText(`Update Rate: ${global.metrics.updatetime}Hz`, x + len, y - 50 - 4 * 14, 10, colors.guiwhite, "right");
        drawText(`Prediction: ${Math.round(GRAPHDATA)}ms`, x + len, y - 50 - 3 * 14, 10, colors.guiwhite, "right");
        drawText(`Last packet: ${lastPacketMs}ms ago`, x + len, y - 50 - 2 * 14, 10, colors.guiwhite, "right");
        drawText(`§${global.metrics.rendertime_color}§ ${global.metrics.rendertime} FPS §reset§/` + `§${global.serverStats.mspt_color}§ ${global.serverStats.mspt} mspt : ${global.metrics.mspt.toFixed(1)} gmspt`, x + len, y - 50 - 1 * 14, 10, colors.guiwhite, "right");
        drawText(`${ping.toFixed(1)} ms  ${global.serverStats.serverGamemodeName} ${global.locationHash}`, x + len, y - 50, 10, colors.guiwhite, "right");
    } else if (!global.GUIStatus.minimapReducedInfo) {
        drawText(watermarkText, x + len, y - 50 - 3 * 14 - 2, 15, watermarkColor, "right");
        drawText(`${global.serverStats.players} player${global.serverStats.players == 1 ? "" : "s"}`, x + len, y - 50 - 2 * 14, 10, colors.guiwhite, "right");
        drawText(`§${global.metrics.rendertime_color}§ ${global.metrics.rendertime} FPS §reset§/` + `§${global.serverStats.mspt_color}§ ${global.serverStats.mspt} mspt`, x + len, y - 50 - 1 * 14, 10, colors.guiwhite, "right");
        drawText(`${ping.toFixed(1)} ms  ${global.serverStats.serverGamemodeName} ${global.locationHash}`, x + len, y - 50, 10, colors.guiwhite, "right");
    } else {
        drawText(watermarkText, x + len, y - 22 - 2 * 14 - 2, 15, watermarkColor, "right");
    }
}

function drawLeaderboard(spacing, alcoveSize, max) {
    // Draw leaderboard
    const lb = leaderboard.get();
    const vspacing = 4;
    const len = alcoveSize; // * global.screenWidth;
    const height = 14;
    let x = global.screenWidth - spacing - 10;
    let y = spacing + height + 13;
    if (config.graphical.oldUIStyle) {
        x += 10;
        y -= 5;
    }
    lbGlide.set(0 + lb.data.length > 0);
    const glide = lbGlide.get();
    x -= lb.data.length ? len * glide : len * glide;

    // Animation things
    const mobileGlide = mobileUpgradeGlide.get();
    if (global.mobile) {
        if (global.canUpgrade && 2 * 20 + gui.upgrades.length * (6.5 * 23 + 17) > 1.4 * x) {
            y += (alcoveSize / 1.4) * mobileGlide;
        }
        y += global.canSkill || global.showSkill ? (alcoveSize / 2.2 /*+ spacing * 2*/) * statMenu.get() : 0;
    }
    drawText("Leaderboard", Math.round(x + len / 2) + 0.5, Math.round(y - 6) + 0.5, height + 3.5, colors.guiwhite, "center", false, 1, 5.5);
    y += 7;

    for (let i = 0; i < lb.data.length; i++) {
        const entry = lb.data[i];
        let lbEntry = leaderboardEntries[entry.id];
        if (!lbEntry) {
            lbEntry = leaderboardEntries[entry.id] = {
                ...entry,
                leaderboardUpdate,
                animX: Smoothbar(0, 0.30, 1.5, 0.045, true),
                animY: Smoothbar(0, 0.30, 1.5, 0.045, true),
                x: 0,
                y: i,
                targetX: 1,
                targetY: i
            };
        }
        if (lbEntry.y !== i && lbEntry.targetY !== i) {
            lbEntry.targetY = i;
        }

        lbEntry.image = entry.image;
        lbEntry.position = entry.position;
        lbEntry.barColor = entry.barColor;
        lbEntry.label = entry.label;
        lbEntry.score = entry.score;
        lbEntry.nameColor = entry.nameColor;
        lbEntry.visible = true;
        lbEntry.update = leaderboardUpdate;
    }
    for (const id in leaderboardEntries) {
        const entry = leaderboardEntries[id];
        if (entry.update !== leaderboardUpdate && entry.targetX !== 0) {
            entry.targetX = 0;
        }
        if (entry.update === leaderboardUpdate && entry.targetX === 0) {
            entry.targetX = 1;
        }
        if (entry.animX.get() > 0.999) {
            entry.animX.force(0);
            entry.x = entry.targetX;
            if (entry.x === 0) {
                entry.visible = false;
                delete leaderboardEntries[id];
            };
        }
        if (entry.animY.get() > 0.999) {
            entry.animY.force(0);
            entry.y = entry.targetY;
        }
        if (entry.x !== entry.targetX) {
            entry.animX.set(1);
        }
        if (entry.y !== entry.targetY) {
            entry.animY.set(1);
        }

        if (entry.visible) {
            const scale = height / entry.position.axis;
            const fullX = global.screenWidth + 1.5 * height + scale * entry.position.middle.x * Math.SQRT1_2 + 10;
            let entryX = entry.x ? x : fullX;
            if (entry.x !== entry.targetX) {
                entryX = entryX + entry.animX.get() * ((entry.targetX ? x : fullX) - entryX);
            }
            let entryPos = entry.y;
            if (entry.y !== entry.targetY) {
                entryPos = entry.y + entry.animY.get() * (entry.targetY - entry.y);
            }
            const entryY = y + (vspacing + height) * entryPos;

            drawBar(entryX, entryX + len, entryY + height / 2 - .7, height - 3 + config.graphical.barChunk, colors.black);
            drawBar(entryX, entryX + len, entryY + height / 2 - .7, height - 3, colors.grey);
            const shift = Math.min(1, entry.score / max);
            drawBar(entryX, entryX + len * shift, entryY + height / 2 - .7, height - 3.5, gameDraw.modifyColor(entry.barColor, "mirror 0 1 0 false"));

            // Leadboard name + score
            const nameColor = entry.nameColor || "#FFFFFF";
            const overwritelabel = entry.label.includes("#")
                ? entry.label.replace("##", Math.round(entry.score).toString()).replace("#s", 1 === Math.round(entry.score) ? "" : "s")
                : false;
            drawText(overwritelabel ? overwritelabel : `${entry.label}: ${util.handleLargeNumber(Math.round(entry.score))}`, entryX + len / 2, entryY + height / 2, height - 4.5, nameColor == "#FFFFFF" ? colors.guiwhite : nameColor, "center", true);

            // Mini-image
            if (entry.renderEntity) {
                const xx = entryX - 1.5 * height - scale * entry.position.middle.x * Math.SQRT1_2;
                const yy = entryY + 0.5 * height - scale * entry.position.middle.y * Math.SQRT1_2;
                const baseColor = entry.color;
                drawEntity(baseColor, xx, yy, entry.image, 1 / scale, 1, (scale * scale) / entry.image.size, (scale * scale) / entry.image.size / 8.5, -Math.PI / 4, true, ctx[2], false, entry.image.render, false, true);
            }
        }
    }
    leaderboardUpdate++;
}

function drawAvailableUpgrades(spacing, alcoveSize) {
    // Draw upgrade menu
    if (global.optionsMenu_Anim.isOpened) {
        global.clickables.upgrade.hide();
    }
    global.clickables.dailyTankUpgrade.hide();
    global.clickables.dailyTankAd.hide();
    if (gui.upgrades.length > 0) {
        const internalSpacing = 15;
        const len = alcoveSize / 2;
        const height = len;

        // Animation processing
        global.columnCount = Math.max(global.mobile ? 9 : 3, Math.floor(gui.upgrades.length ** 0.55));
        if (!global.canUpgrade) {
            upgradeMenu.force(-global.columnCount * 3);
            global.canUpgrade = true;
        } else
            if (global.pullUpgradeMenu) {
                upgradeMenu.set(-global.columnCount * 3);
            } else {
                upgradeMenu.set(0);
            }
        const glide = upgradeMenu.get();

        upgradeSpin = Date.now() * 0.0005;
        upgradeSpin = upgradeSpin - (Math.floor(upgradeSpin / Math.PI / 2) * Math.PI * 2);

        let x = glide * 2 * spacing + spacing + 5;
        let y = spacing - height - 2.8 * internalSpacing + 5;
        const xStart = x;
        const initialX = x;
        let rowWidth = 0;
        let initialY = y;
        let ticker = 0;
        let upgradeNum = 0;
        let colorIndex = 0;
        const clickableRatio = global.canvas.height / global.screenHeight / global.ratio;
        let lastBranch = -1;
        const upgradeHoverIndex = global.clickables.upgrade.check({ x: global.mouse.x, y: global.mouse.y });

        for (let i = 0; i < gui.upgrades.length; i++) {
            const upgrade = gui.upgrades[i];
            const upgradeBranch = upgrade[0];
            const upgradeBranchLabel = upgrade[1] == "undefined" ? "" : upgrade[1];
            const model = upgrade[2];

            // Draw either in the next row or next column
            if (ticker === global.columnCount || upgradeBranch != lastBranch) {
                x = xStart;
                y += height + internalSpacing;
                if (upgradeBranch != lastBranch) {
                    if (upgradeBranchLabel.length > 0) {
                        drawText(` ${upgradeBranchLabel}`, xStart, y + internalSpacing * 2, internalSpacing * 2.3, colors.guiwhite, "left", false);
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

            if (y > initialY) {
                initialY = y;
            }
            rowWidth = x;
            !global.optionsMenu_Anim.isOpened && global.clickables.upgrade.place(i, x * clickableRatio, y * clickableRatio, len * clickableRatio, height * clickableRatio);
            const upgradeKey = getKeybind(`KEY_UPGRADE_${upgradeNum + 1}`);

            drawEntityIcon(model, x, y, len, height, 1, upgradeSpin, 0.6, colorIndex++, !global.mobile ? upgradeKey : false, !global.mobile ? upgradeNum == upgradeHoverIndex : false);

            ticker++;
            upgradeNum++;
        }

        // Draw dont upgrade button
        const h = 20;
        const textScale = (h - 0.9) - 6;
        const msg = "Don't Upgrade";
        const m = measureText(msg, textScale);
        const buttonX = initialX + (rowWidth + len - initialX) / 2;
        const buttonY = initialY + height + internalSpacing - 5;

        drawButton(buttonX, buttonY, m, h, 1, config.graphical.oldUIStyle ? "bar" : "rect", msg, textScale - 3.3, colors.vlgrey, false, false, true, "skipUpgrades", clickableRatio, {
            index: 0
        });

        if (gui.dailyTank && gui.dailyTank.tank) {
            const image = util.requestEntityImage(gui.dailyTank.tank, gui.color);
            const hover = global.clickables.dailyTankUpgrade.check({ x: global.mouse.x, y: global.mouse.y });
            image.upgradeColor = "36 0 1 0 false";
            drawEntityIcon(image, xStart, initialY + height + internalSpacing + 50, len, height, 1, upgradeSpin, 0.4, 10, false, hover);
            drawText("Daily Tank!", xStart + 50, initialY + height + internalSpacing + 67, 12, gameDraw.getColor(36), "center");
            global.clickables.dailyTankUpgrade.set(xStart * clickableRatio, (initialY + height + internalSpacing + 50) * clickableRatio, len * clickableRatio, height * clickableRatio);
            gui.dailyTank.ads && drawButton(xStart + 50, initialY + height + internalSpacing + 160, m, h, 1, "rect", "Watch An Ad", textScale - 3.3, colors.vlgrey, false, false, true, "dailyTankAd", clickableRatio, {
                index: false
            });
        }

        // Upgrade tooltip
        if (upgradeHoverIndex > -1 && upgradeHoverIndex < gui.upgrades.length && !global.mobile) {
            const picture = gui.upgrades[upgradeHoverIndex][2];
            if (picture.upgradeTooltip.length > 0) {
                let boxWidth = measureText(picture.name, alcoveSize / 10);
                const boxX = global.mouse.x * global.screenWidth / global.canvas.width + 2;
                const boxY = global.mouse.y * global.screenHeight / global.canvas.height + 2;
                const boxPadding = 6;
                const splitTooltip = picture.upgradeTooltip.split("\n");
                let textY = boxY + boxPadding + alcoveSize / 10;

                // Tooltip box width
                for (const line of splitTooltip) {
                    boxWidth = Math.max(boxWidth, measureText(line, alcoveSize / 15));
                }

                // Draw tooltip box
                gameDraw.setColor(ctx[2], colors.dgrey);
                ctx[2].lineWidth /= 1.5;
                drawGuiRect(boxX, boxY, boxWidth + boxPadding * 3, alcoveSize * (splitTooltip.length + 1) / 10 + boxPadding * 3, false);
                drawGuiRect(boxX, boxY, boxWidth + boxPadding * 3, alcoveSize * (splitTooltip.length + 1) / 10 + boxPadding * 3, true);
                ctx[2].lineWidth *= 1.5;
                drawText(picture.name, boxX + boxPadding * 1.5, textY, alcoveSize / 10, colors.guiwhite);

                for (const t of splitTooltip) {
                    textY += boxPadding + alcoveSize / 15;
                    drawText(t, boxX + boxPadding * 1.5, textY, alcoveSize / 15, colors.guiwhite);
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
    const radius = Math.min(
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
        gameDraw.setColor(ctx[2], colors.black);
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
    if (!global.hasOperator) {
        return;
    }

    let index = 1;
    const clickableRatio = global.canvas.height / global.screenHeight / global.ratio;
    const upgradeColumns = Math.ceil(gui.upgrades.length / 9);

    let yOffset = 0;
    yOffset += global.canUpgrade ? (alcoveSize / 1.5) * mobileUpgradeGlide.get() * upgradeColumns / 1.5 + spacing * (upgradeColumns + 1.55) + -17.5 : 0;
    yOffset += global.canSkill || global.showSkill ? statMenu.get() * alcoveSize / 2.6 + spacing / 0.75 : 0;

    const baseSize = (alcoveSize - spacing * 2) / 3;
    const toggleSize = baseSize;
    const toggleX = alcoveSize + spacing * 2 + baseSize + spacing;
    const toggleY = yOffset + spacing;

    // Toggle butonu, operatorKeys grubunda ama index 0 sabit (tuşlar 1'den başlıyor, çakışmıyor)
    global.clickables.operatorKeys.place(0, toggleX * clickableRatio, toggleY * clickableRatio, toggleSize * clickableRatio, toggleSize * clickableRatio);

    ctx[2].fillStyle = global.operatorKeyboard.open ? colors.guiwhite : colors.grey;
    drawGuiRect(toggleX, toggleY, toggleSize, toggleSize);
    ctx[2].globalAlpha = 1;
    drawText("`", toggleX + toggleSize / 2, toggleY + toggleSize / 2, toggleSize * 0.6, colors.guiwhite, "center", true);
    ctx[2].strokeStyle = colors.black;
    ctx[2].lineWidth = 3;
    drawGuiRect(toggleX, toggleY, toggleSize, toggleSize, true);

    if (!global.operatorKeyboard.open) {
        return;
    }

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
            ctx[2].fillStyle = armed ? colors.guiwhite : colors.grey;
            drawGuiRect(x, y, keySize, keySize);
            ctx[2].globalAlpha = usable ? 1 : 0.4;
            drawText(key.label, x + keySize / 2, y + keySize / 2, keySize * 0.55, armed ? colors.black : colors.guiwhite, "center", true);
            ctx[2].strokeStyle = colors.black;
            ctx[2].lineWidth = 2;
            drawGuiRect(x, y, keySize, keySize, true);
            index++;
        }
    }
    ctx[2].globalAlpha = 1;
}
function drawMobileButtons(spacing, alcoveSize) {
    const makeButton = (index, x, y, width, height, text, clickableRatio) => {
        // Set the clickable's position
        global.clickables.mobileButtons.place(index, x * clickableRatio, y * clickableRatio, width * clickableRatio, height * clickableRatio);

        // Draw boxes
        ctx[2].globalAlpha = 0.5;
        ctx[2].fillStyle = colors.grey;
        drawGuiRect(x, y, width, height);
        ctx[2].globalAlpha = 0.1;
        ctx[2].fillStyle = colors.black;
        drawGuiRect(x, y + height * 0.6, width, height * 0.4);
        ctx[2].globalAlpha = 1;

        // Draw text
        drawText(text, x + width / 2, y + height * 0.5, height * 0.6, colors.guiwhite, "center", true);

        // Draw the borders
        ctx[2].strokeStyle = colors.black;
        ctx[2].lineWidth = 3;
        drawGuiRect(x, y, width, height, true);
    };

    const makeButtons = (buttons, startX, startY, baseSize, clickableRatio, spacing) => {
        let x = startX; let y = startY; let
            index = 0;

        for (let row = 0; row < buttons.length; row++) {
            for (let col = 0; col < buttons[row].length; col++) {
                makeButton(buttons[row][col][3] ?? index, x, y, baseSize * (buttons[row][col][1] ?? 1), baseSize * (buttons[row][col][2] ?? 1), buttons[row][col][0], clickableRatio);
                x += baseSize * (buttons[row][col][1] ?? 1) + spacing;
                index++;
            }

            x = startX;
            y += Math.max(...buttons[row].map((b) => baseSize * (b[2] ?? 1))) + spacing;
        }
    };
    if (global.clickables.mobileButtons.active == null) {
        global.clickables.mobileButtons.active = false;
    }
    if (global.clickables.mobileButtons.altFire == null) {
        global.clickables.mobileButtons.altFire = false;
    }

    // Hide the buttons
    global.clickables.mobileButtons.hide();

    // Some animations.
    mobileUpgradeGlide.set(0 + (global.canUpgrade || global.upgradeHover));

    // Some sizing variables
    const clickableRatio = global.canvas.height / global.screenHeight / global.ratio;
    const upgradeColumns = Math.ceil(gui.upgrades.length / 9);
    let yOffset = 0;
    if (global.mobile) {
        yOffset += global.canUpgrade ? (alcoveSize / 1.5 /*+ spacing * 2*/) * mobileUpgradeGlide.get() * upgradeColumns / 1.5 + spacing * (upgradeColumns + 1.55) + -17.5 : 0;
        yOffset += global.canSkill || global.showSkill ? statMenu.get() * alcoveSize / 2.6 + spacing / 0.75 : 0;
    }
    let buttons;
    const baseSize = (alcoveSize - spacing * 2) / 3;

    if (global.mobile) {
        buttons = global.clickables.mobileButtons.active ? [
            [[global.clickables.mobileButtons.active ? "-" : "+"], [`Alt ${global.clickables.mobileButtons.altFire ? "Manual" : "Disabled"}`, 6], [`${!document.fullscreenElement ? "Full" : "Exit Full"} Screen`, 5]],
            [["Autofire", 3.5], ["Reverse", 3.5], ["Self-Destruct", 5]],
            [["Autospin", 3.5], ["Override", 3.5], ["Level Up", 5]],
            [["Action", 3.5], ["Special", 3.5], ["Chat", 5]]
        ] : [
            [[global.clickables.mobileButtons.active ? "-" : "+"]]
        ];
    }
    if (global.clickables.mobileButtons.altFire) {
        buttons.push([["\u2756", 2, 2]]);
    }

    const len = alcoveSize;
    makeButtons(buttons, len + spacing * 2, yOffset + spacing, baseSize, clickableRatio, spacing);
}

function drawMobileSkillUpgrades(spacing, alcoveSize) {
    global.canSkill = gui.points > 0 && gui.skills.some((s) => s.amount < s.cap) && !global.canUpgrade;
    global.showSkill = !global.canUpgrade && !global.canSkill && global.died;
    statMenu.set(global.canSkill || global.showSkill || global.disconnected ? 1 : 0);
    const n = statMenu.get();
    global.clickables.stat.hide();
    const t = alcoveSize / 2;
    const q = alcoveSize / 3;
    let x = 2 * n * spacing - spacing;
    let statNames;
    const clickableRatio = global.canvas.height / global.screenHeight / global.ratio;

    try {
        statNames = gui.getStatNames(global.mockups[parseInt(gui.type.split("-")[0])].statnames);
    } catch (e) {
        statNames = gui.getStatNames(global.missingno[0].statnames);
    }

    if (global.canSkill || global.showSkill) {
        for (let i = 0; i < gui.skills.length; i++) {
            const skill = gui.skills[i];
            const softcap = skill.softcap;

            if (softcap <= 0) {
                continue;
            }

            const amount = skill.amount;
            const skillColor = colors[skill.color];
            const cap = skill.cap;
            const name = statNames[9 - i].split(/\s+/);
            const halfNameLength = Math.floor(name.length / 2);
            const [name1, name2] = name.length === 1 ? [name[0], null] : [name.slice(0, halfNameLength).join(" "), name.slice(halfNameLength).join(" ")];

            ctx[2].globalAlpha = 0.5;
            ctx[2].fillStyle = skillColor;
            drawGuiRect(x, spacing, t, 2 * q / 3);

            ctx[2].globalAlpha = 0.1;
            ctx[2].fillStyle = colors.black;
            drawGuiRect(x, spacing + q * 2 / 3 * 2 / 3, t, q * 2 / 3 / 3);

            ctx[2].globalAlpha = 1;
            ctx[2].fillStyle = colors.guiwhite;
            drawGuiRect(x, spacing + q * 2 / 3, t, q / 3);

            ctx[2].fillStyle = skillColor;
            drawGuiRect(x, spacing + q * 2 / 3, t * amount / softcap, q / 3);

            ctx[2].strokeStyle = colors.black;
            ctx[2].lineWidth = 1;
            for (let j = 1; j < cap; j++) {
                const width = x + j / softcap * t;
                drawGuiLine(width, spacing + q * 2 / 3, width, spacing + q);
            }

            cap === 0 || !gui.points || softcap !== cap && amount === softcap || global.clickables.stat.place(9 - i, x * clickableRatio, spacing * clickableRatio, t * clickableRatio, q * clickableRatio);

            if (name2) {
                drawText(name2, x + t / 2, spacing + q * 0.55, q / 5, colors.guiwhite, "center");
                drawText(name1, x + t / 2, spacing + q * 0.3, q / 5, colors.guiwhite, "center");
            } else {
                drawText(name1, x + t / 2, spacing + q * 0.425, q / 5, colors.guiwhite, "center");
            }

            if (amount > 0) {
                drawText(`+${amount}`, x + t / 2, spacing + q * 1.3, q / 4, skillColor, "center");
            }

            ctx[2].strokeStyle = colors.black;
            ctx[2].globalAlpha = 1;
            ctx[2].lineWidth = 3;
            drawGuiLine(x, spacing + q * 2 / 3, x + t, spacing + q * 2 / 3);
            drawGuiRect(x, spacing, t, q, true);

            x += n * (t + 14);
        }

        if (gui.points > 1) {
            drawText(`x${gui.points}`, x, spacing + 20, 20, colors.guiwhite, "left");
        }
    }
}; // END OF MOBILE FUNCTIONS

let ichatInput = 0;
function drawChatInput(x, y, instance, ratio, isize) {
    if (global.showChat === 0 || !global.canvas.chatBox) {
        return;
    }
    if (instance.id === gui.playerid) {
        const size = isize * ratio;
        const g = Math.max(20, size);

        if (!global.showChat) {
            if (ichatInput === 0) {
                chatInput.force(0);
            }
            if (ichatInput >= 200) {
                return;
            }
            ichatInput++;
        } else if (ichatInput) {
            ichatInput = 0;
            chatInput.force(0);
        }
        if (global.died && global.showChat) {
            global.canvas.chatBox.blur();
            global.canvas.cv.focus();
            global.showChat = false;
            if (global.canvas.chatBox.value) {
                global.canvas.chatBox.value = "";
            }
        }

        chatInput.set(1);
        global.showChatGlide = global.showChat ? chatInput.get() : 1 - chatInput.get();
        x += global.screenWidth / 2;
        y += global.screenHeight / 2;
        const boxLengthHalf = (10.49 * g) / 2;
        global.canvas.chatBox.loadedProperly = true;
        // Box drawing
        global.canvas.chatBox.style.color = colors.black;
        global.canvas.chatBox.style.backgroundColor = colors.guiwhite;
        global.canvas.chatBox.style.borderColor = colors.black;
        global.canvas.chatBox.style.borderWidth = `${0.1 * g}px`;
        global.canvas.chatBox.style.opacity = global.showChatGlide;
        global.canvas.chatBox.style.width = `${(boxLengthHalf * 2 + 0.75 * g) / global.screenWidth * 100}%`;
        global.canvas.chatBox.style.height = `${0.95 * g}px`;
        global.canvas.chatBox.style.left = `${(x - boxLengthHalf - 0.75 * g / 2) / global.screenWidth * 100}%`;
        global.canvas.chatBox.style.top =  `${(y - g * (2.26) - 0.55 * g) / global.screenWidth * window.innerWidth}px`;
        // Input
        global.canvas.chatInput.style.opacity = global.showChatGlide;
        global.canvas.chatInput.style["font-size"] = `${0.5 * g}px`;
        global.canvas.chatInput.style.color = colors.black;
        global.canvas.chatInput.style.width = `${(boxLengthHalf * 2 + 0.35 * g) / global.screenWidth * 100}%`;
        global.canvas.chatInput.style.height = `${0.95 * g}px`;
        global.canvas.chatInput.style.left = `${(x - boxLengthHalf - 0.35 * g / 2) / global.screenWidth * 100}%`;
        global.canvas.chatInput.style.top =  `${(y - g * (2.26) - 0.55 * g) / global.screenWidth * window.innerWidth}px`;
        if (global.canvas.chatBox && global.showChatGlide < 0.005 && !global.showChat) {
            chatInput.force(0), global.canvas.chatInput.remove(), global.canvas.chatBox.remove(), global.canvas.chatBox = false;
        }
    }
}
const drawAdScreen = () => {
    gameDraw.setColor(ctx[2], "#000");
    ctx[2].globalAlpha = 0.8;
    drawGuiRect(0, 0, global.screenWidth, global.screenHeight);
    const width = global.dailyTankAd.width;
    const height = global.dailyTankAd.height;
    const x = (global.screenWidth - width) / 2;
    const y = (global.screenHeight - height) / 2;
    ctx[2].globalAlpha = 1;
    gameDraw.setColor(ctx[2], "#000");
    drawGuiRect(x, y, width, height);
    gameDraw.setColor(ctx[2], colors.grey);
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
                }, 1000);
            }
            drawButton(x + width - 25, y + 7, 35, 35, global.dailyTankAd.closebtnAnim.get(), "rect", "✕", 24, colors.red, colors.red, false, true, "dailyTankCloseAd", global.canvas.height / global.screenHeight / global.ratio, {
                index: false
            });
        }
    } else {
        drawText("Loading...", global.screenWidth / 2, global.screenHeight / 2, 40, "#fff", "center", false, 1, false);
    }
    const wwidth = global.dailyTankAd.width + 2;
    const hheight = 35;
    gameDraw.setColor(ctx[2], "#828282");
    ctx[2].globalAlpha = 0.5;
    drawGuiRect(x - 1.5, y + height + 10, wwidth, hheight);
    ctx[2].globalAlpha = 1;
    drawText("Watch this ad to get your reward!", x + wwidth / 2, y + height + 34, 20, "#fff", "center", false, 1, false);
};

const getKills = () => {
    const finalKills = {
        " kills": [Math.round(global.finalKills[0].get()), 1],
        " assists": [Math.round(global.finalKills[1].get()), 0.5],
        " visitors defeated": [Math.round(global.finalKills[2].get()), 3],
        " polygons destroyed": [Math.round(global.finalKills[3].get()), 0.05]
    };
    const killCountTexts = [];
    let destruction = 0;
    for (const key in finalKills) {
        if (finalKills[key][0]) {
            destruction += finalKills[key][0] * finalKills[key][1];
            killCountTexts.push(finalKills[key][0] + key);
        }
    }
    return (
        `${destruction === 0 ? "🌼"
            : destruction < 4 ? "🎯"
                : destruction < 8 ? "💥"
                    : destruction < 15 ? "💢"
                        : destruction < 25 ? "🔥"
                            : destruction < 50 ? "💣"
                                : destruction < 75 ? "👺"
                                    : destruction < 100 ? "🌶️" : "💯"
        } ${!killCountTexts.length ? "A true pacifist" :
            killCountTexts.length == 1 ? killCountTexts.join(" and ") :
                `${killCountTexts.slice(0, -1).join(", ")} and ${killCountTexts[killCountTexts.length - 1]}`}`
    );
};

const getDeath = () => {
    let txt = "";
    if (global.finalKillers.length) {
        txt = "🔪 Succumbed to";
        for (const e of global.finalKillers) {
            txt += ` ${util.addArticle(util.getEntityImageFromMockup(e).name)} and`;
        }
        txt = txt.slice(0, -4);
    } /*else if () { //todo: check for self-destruct
            txt += "💣 Self-destruct completed";
        }*/ else {
        txt += "⛈  Vanished into thin air";
    }
    return txt;
};

const getTips = () => {
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
    const glide = global.deathAnimation.get();
    const x = global.screenWidth / 2;
    const y = Math.min(global.screenHeight / 2 - 60, global.screenHeight - 500) - 800 * (1 - global.lerp(0, 1, glide));
    const len = 140;
    const position = global.mockups[parseInt(gui.type.split("-")[0])].position;
    const scale = len / position.axis;
    const xx = global.screenWidth / 2 - scale * position.middle.x * 0.707;
    const yy = y + scale * position.middle.y * Math.SQRT1_2;
    const picture = util.getEntityImageFromMockup(gui.type, gui.color);
    const baseColor = picture.color;
    const name = global.player.name.substring(7, global.player.name.length + 1);
    const timestamp = Math.floor(global.deathTimestamp || Date.now());

    clearScreen(colors.black, 0.1 + 0.15 * global.lerp(0, 0.5, glide), ctx[2]);
    const ratio = util.getScreenRatio();
    scaleScreenRatio(ratio, true);
    drawEntity(baseColor, (xx - 191 - len / 2 + 0.5) | 0, (yy - -26 + 0.5) | 0, picture, 1.5, 1, (0.5 * scale) / picture.realSize, 1, -Math.PI / 4, true, ctx[2]);
    drawText(`Level ${gui.__s.getLevel()}`, x - 270, y + 100, 12, colors.guiwhite, "center");
    drawText(picture.name, x - 270, y + 125, 18, colors.guiwhite, "center");
    drawText(`${new Date(timestamp).toISOString()}`, x, y - 164, 8.125, colors.guiwhite, "center");
    drawText(name == "" ? "Your Score: " : `${name}'s Score: `, x - 170, y - 50, 23.75, colors.guiwhite);
    drawText(util.formatLargeNumber(Math.round(global.finalScore.get())), x - 170, y + 11, 48, colors.guiwhite);
    ctx[2].globalAlpha = global.lerp(1, 1.25, glide);
    drawText(`⌚ Survived for ${util.timeForHumans(Math.round(global.finalLifetime.get()))}`, x - 170, y + 50, 14, colors.guiwhite);
    ctx[2].globalAlpha = global.lerp(1.25, 1.5, glide);
    drawText(getKills(), x - 170, y + 75, 14, colors.guiwhite);
    ctx[2].globalAlpha = global.lerp(1.5, 1.75, glide);
    drawText(getTips(), x - 170, y + 100, 14, colors.guiwhite);
    ctx[2].globalAlpha = global.lerp(1.75, 2, glide);
    drawText(getDeath(), x - 170, y + 125, 14, colors.guiwhite);
    ctx[2].globalAlpha = global.lerp(2, 2.25, glide);
    drawText(`📋 The server was ${(100 * gui.fps).toFixed(0)}%` + " active", x - 170, y + 150, 14, colors.guiwhite);
    ctx[2].globalAlpha = global.lerp(3, 3.25, glide);
    if (global.cannotRespawn || global.mobile || global.gamepadMode) {
        drawText(global.cannotRespawn ?
            global.respawnTimeout ?
                `(you may respawn in ${global.respawnTimeout} second` + `${global.respawnTimeout <= 1 ? "" : "s"}` + ")"
                : "(you cannot respawn)"
            : global.mobile ?
                "(tap to respawn)"
                : global.gamepadMode ?
                    "(Press RT or R2 button to respawn)"
                    : "",
        x, y + 189, 16, colors.guiwhite, "center");
    }
    if (!global.disconnected && !global.cannotRespawn) {
        if (!global.mobile && !global.gamepadMode) {
            drawButton(x - 75, y + 198, 120, 30, global.lerp(3, 3.25, glide), "rect", "Back", 14, false, false, false, true, "exitGame", global.canvas.height / global.screenHeight / global.ratio, {
                index: 0
            });
            drawButton(x + 75, y + 198, 120, 30, global.lerp(3, 3.25, glide), "rect", "Respawn", 14, false, false, false, true, "deathRespawn", global.canvas.height / global.screenHeight / global.ratio, {
                index: 0
            });
        } else {
            drawButton(x, y + 198, 120, 30, global.lerp(3, 3.25, glide), "rect", "Back", 18, false, false, false, true, "exitGame", global.canvas.height / global.screenHeight / global.ratio, {
                index: 0
            });
        }
    }
};

const applyScreenShake = (type = "camera", returnOption = false) => {
    const properties = type == "gui" ? config.graphical.shakeProperties.UIShake : config.graphical.shakeProperties.CameraShake;
    var cdx = 0;
    var cdy = 0;
    if (properties.shakeStartTime == -1) {
        return;
    }
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
    if (properties.keepShake && dt > 100) {
        properties.shakeStartTime = Date.now();
    }
    if (cdx == 0 && cdy == 0) {
        return;
    }
    if (returnOption) {
        return {
            dx: cdx,
            dy: cdy
        };
    }
    global.player.renderx += cdx;
    global.player.rendery += cdy;
};
const drawGameplay = (tick, ratio) => {
    // Prep stuff
    global.metrics.rendertimes++;
    global.GRAPHDATA = 0;
    const tickMotion = lasttick ? tick - lasttick : null;
    lasttick = tick;
    const motion = compensation();
    motion.set();
    global.GRAPHDATA = motion.getPrediction();
    // Move the camera
    // Don't move the camera if you're dead. This helps with jitter issues
    const playerx = global.player.animX.get(tick);
    const playery = global.player.animY.get(tick);
    // Scope changes teleport the camera; restart the prediction so the
    // predictor doesn't extrapolate the world from the old position.
    if (global.player.isScoping !== global.player.isAiming) {
        global.player.lastx = global.player.cx.x;
        global.player.lasty = global.player.cy.y;
        global.player.lastvx = global.player.vx;
        global.player.lastvy = global.player.vy;
        global.player.scopeSettle = getNow() + 600;
    }
    global.player.isAiming = global.player.isScoping;
    if (config.graphical.lerpAnimations) {
        global.player.renderx = util.lerp(global.player.renderx, global.player.cx.x, 0.1, true);
        global.player.rendery = util.lerp(global.player.rendery, global.player.cy.y, 0.1, true);
    } else if ((config.graphical.smoothcamera || global.player.isScoping || getNow() < global.player.scopeSettle) && config.graphical.shakeProperties.CameraShake.shakeStartTime == -1) {
        const n = null == tickMotion ? 0 : config.graphical.smoothcamera ? 0.99 ** tickMotion : Math.exp(-tickMotion / 55);
        global.player.renderx = global.player.renderx * n + playerx * (1 - n);
        global.player.rendery = global.player.rendery * n + playery * (1 - n);
    } else if (!config.graphical.interpolation) {
        global.player.renderx = motion.predict(global.player.lastx, global.player.cx.x, global.player.lastvx, global.player.vx),
        global.player.rendery = motion.predict(global.player.lasty, global.player.cy.y, global.player.lastvy, global.player.vy);
    } else {
        global.player.renderx = playerx;
        global.player.rendery = playery;
    }
    if (config.graphical.shakeProperties.CameraShake.shakeStartTime !== -1) {
        applyScreenShake();
    }
    // Use the camera the world is drawn with for the minimap so the two can't desync.
    global.player.cx.animX = global.player.camX = global.player.renderx;
    global.player.cy.animY = global.player.camY = global.player.rendery;
    const px = ratio * global.player.renderx;
    const py = ratio * global.player.rendery;

    const spacing = 20;
    //draw the in game stuff
    drawFloor(px, py, ratio, tick);
    drawEntities(px, py, ratio, tick, spacing);
};

const drawGUI = (tick, scaleRatio) => {
    scaleScreenRatio(scaleRatio, true);
    const ratio = util.getScreenRatio();
    //draw hud
    const spacing = 20;
    const alcoveSize = 200 / ratio; // drawRatio * global.screenWidth;
    gui.__s.update();
    const lb = leaderboard.get();
    const max = lb.max;
    global.canSkill = Boolean(gui.points) && !global.showTree && !global.pullSkillBar;
    let shake = false;
    if (config.graphical.shakeProperties.UIShake.shakeStartTime !== -1) {
        shake = applyScreenShake("gui", true);
    }
    if (shake) {
        ctx[2].translate(shake.dx, shake.dy);
    }
    if (global.mobile) { // MOBILE UI
        drawMobileJoysticks();
        drawMobileButtons(spacing, alcoveSize);
        drawOperatorKeyboard(spacing, alcoveSize); // ` button + sandbox keyboard for sandbox etc.
    }
    if (global.gamepadMode) {
        drawCrosshair();
    }
    if (global.GUIStatus.renderGUI) {
        drawMessages(spacing, alcoveSize);
        if (global.GUIStatus.renderUpgrades) {
            drawSkillBars(spacing, alcoveSize);
        }
        if (global.GUIStatus.renderPlayerBars) {
            drawSelfInfo(max);
        }
        drawMinimapAndDebug(spacing, alcoveSize, global.GRAPHDATA, tick);
        if (global.GUIStatus.renderLeaderboard) {
            drawLeaderboard(spacing, alcoveSize, max);
        }
        if (global.GUIStatus.renderUpgrades) {
            drawAvailableUpgrades(spacing, alcoveSize);
        }
    } else if (global.GUIStatus.renderUpgrades) {
        drawAvailableUpgrades(spacing, alcoveSize);
    }
    if (global.showTree) {
        drawUpgradeTree(spacing, alcoveSize);
    }
    if (shake) {
        ctx[2].translate(-shake.dx, -shake.dy);
    }
    global.metrics.lastrender = getNow();
};

function optionsMenu_drawRoundedRect(x, y, w, h, r) {
    ctx[2].beginPath();
    ctx[2].moveTo(x + r, y);
    ctx[2].lineTo(x + w - r, y);
    ctx[2].quadraticCurveTo(x + w, y, x + w, y + r);
    ctx[2].lineTo(x + w, y + h - r);
    ctx[2].quadraticCurveTo(x + w, y + h, x + w - r, y + h);
    ctx[2].lineTo(x + r, y + h);
    ctx[2].quadraticCurveTo(x, y + h, x, y + h - r);
    ctx[2].lineTo(x, y + r);
    ctx[2].quadraticCurveTo(x, y, x + r, y);
    ctx[2].closePath();
}

function drawToolip(cb) {
    // Draw tooltip

    // Set fade animation
    cb.tooltipService.alpha.set(cb.tooltipService.targetAlpha);

    // And get it
    const anim = cb.tooltipService.alpha.get();

    // And dont forget the ratio
    const clickableRatio = global.canvas.height / global.screenHeight / global.ratio;
    // invisible → skip
    if (anim > 0.001) {
        ctx[2].save();
        ctx[2].globalAlpha = anim;

        const paddingX = 9;
        const paddingY = 6;

        const splitTooltip = cb.tooltipService.text.split("\n");

        let textW = cb.tooltipService.text.length;
        for (const line of splitTooltip) {
            textW = Math.max(textW, measureText(line, 13.5));
        }
        const textH = 16; // font size
        const boxW = textW + paddingX * 2;
        let boxH = 0;
        if (splitTooltip.length === 1) {
            boxH = textH + paddingY * 2.5;
        }
        if (splitTooltip.length !== 1) {
            for (const line of splitTooltip) {
                boxH += textH;
            }
        }
        // convert from screen → canvas
        const tipX = cb.tooltipService.x / clickableRatio;
        const tipY = cb.tooltipService.y / clickableRatio;

        // tooltip sits BELOW checkbox
        const bx = tipX;
        const by = tipY;
        let textY = by;
        // background
        ctx[2].fillStyle = "rgba(30, 30, 30, 0.40)";
        optionsMenu_drawRoundedRect(bx, by, boxW, splitTooltip.length === 1 ? boxH : boxH + 15, 8);
        ctx[2].fill();
        ctx[2].globalAlpha = anim;

        // Text
        for (let i = 0; i < splitTooltip.length; i++) {
            const text = splitTooltip[i];
            const increaseLength = splitTooltip.length === 1 ? 22 : 17.6;
            textY += increaseLength;
            drawText(text, bx + paddingX, splitTooltip.length === 1 ? textY : textY + 3, 13.5, colors.guiwhite);
        }

        ctx[2].restore();
    }
}

function optionsMenu_getPointer(pointer = global.mouse) {
    const canvasWidth = global.canvas.width || global.screenWidth;
    const canvasHeight = global.canvas.height || global.screenHeight;
    return {
        x: pointer.x * (global.screenWidth || canvasWidth) / canvasWidth,
        y: pointer.y * (global.screenHeight || canvasHeight) / canvasHeight
    };
}

function optionsMenu_getUserInterfaceOptions() {
    const doc = document.getElementById("optUiScale");
    if (!doc) {
        return [];
    }
    return Array.from(doc.options).filter((option) => option.value).map((option) => ({
        value: option.value,
        label: option.textContent.replace("UI Scale", "").replace("(", "").replace(")", "").replace(" ", "")
    }));
}
function optionsMenu_getGraphicsOptions() {
    const doc = document.getElementById("optGraphics");
    if (!doc) {
        return [];
    }
    console.log(Array.from(doc.options).filter((option) => option.value).map((option) => ({
        value: option.value,
        label: option.textContent
    })));
    return Array.from(doc.options).filter((option) => option.value).map((option) => ({
        value: option.value,
        label: option.textContent
    }));
}

const THEME_SWATCHES = [
    ["blue", "Blue", "Blue team (ID 10)"],
    ["vlgrey", "Eggs", "Eggs (ID 6)"],
    ["lgrey", "Walls", "Maze walls, as well as rocks (ID 7)"],
    ["green", "Green", "Green team (ID 11)"],
    ["gold", "Squares", "Squares (ID 13)"],
    ["lgreen", "Health Bars", "Health bars, as well as shiny polygons (ID 1)"],
    ["red", "Red", "Red team (ID 12)"],
    ["orange", "Triangles", "Triangles (ID 2)"],
    ["teal", "Shield Bars", "Shield bars, as well as legendary polygons (ID 0)"],
    ["magenta", "Purple", "Purple team (ID 15)"],
    ["purple", "Pentagons", "Pentagons (ID 14)"],
    ["grey", "Barrels", "Barrels, as well as bar backgrounds (ID 16)"],
    ["yellow", "Neutral", "Neutral team (ID 3)"],
    ["aqua", "Hexagons", "Hexagons (ID 4)"],
    ["white", "Background", "Arena background (ID 18)"],
    ["dgrey", "Rogues", "Rogue team (ID 17)"],
    ["pink", "Crashers", "Crashers (ID 5)"],
    ["guiblack", "Grid", "The map's grid and edges, as well as the color of your minimap dot (ID 19)\nNote: It's highly recommended for this color to contrast the background color.\nTip: If you want to remove the background grid, you can do that in the options tab."],
    ["guiwhite", "Text", "Text color, as well as the flash blend color (ID 8)\nNote: It's highly recommended for this color to be a light color and contrast the border color."],
    ["black", "Borders", "The borders of all text, bars, and other UI elements, as well as the color of shells (ID 9)\nNote: It's highly recommended for this color to be a dark color and contrast the text color."]
];

const OV_ROW1 = 41; const OV_ROW2 = 81; const
    OV_ROW3 = 121;
const OV_COLORS_HEAD = 183; const OV_GRID_TOP = 201; const
    OV_GRID_PITCH = 40;
const OV_BORDERS_HEAD = 503; const OV_SLIDER_TOP = 524; const
    OV_NEON_TOP = 561;
const OV_CTRL_H = 28; const OV_SWATCH = 28; const OV_GAP = 13; const OV_COL_PITCH = 145; const
    OV_BADGE = 26;
const OV_INSET_L = 24; const OV_INSET_R = 18; const OV_CODE_GAP = 11; const
    OV_REMOVE_W = 98;
const OV_SLIDER_W = 152; const
    OV_TITLE_TOP = 30;
const THEME_PANEL_H = 608;
const KB_ROW_TOP = 47; const
    KB_ROW_PITCH = 39;
const SECRET_PANEL_H = global.optionsMenu_Anim.tabs[3][1];
const SECRET_SECTION_LAYOUT = {
    secret: { title: "Secret Options", titleY: 30,  rowTop: 45 },
    beta:   { title: "Beta Options",   titleY: 230, rowTop: 245 },
    legacy: { title: "Legacy Options", titleY: 310, rowTop: 325 }
};
const isSecretSection = (section) => section === "secret" || section === "beta" || section === "legacy";

const LEGACY_THEMES = [
    ["bleach", "Bleach", "definitelynot."],
    ["nebula", "Nebula", "Unknown"],
    ["forest", "Forest", "Sterlon"],
    ["pastel", "Pastel", "Damocles"],
    ["descent", "Descent", "Rog456"],
    ["badlands", "Badlands", "Incognious"],
    ["pumpkinSkeleton", "Pumpkin Skeleton", "Road"],
    ["blindness", "Blindness", "Damocles"]
];

let _themeList = null;
function loadThemes() {
    if (!_themeList) {
        _themeList = fetch("themes.json")
            .then((r) => r.json())
            .then((list) => list.concat(LEGACY_THEMES.map(([key, name, author]) => {
                const theme = colors[key];
                return {
                    name,
                    author,
                    content: theme,
                    paletteSize: theme.paletteSize,
                    border: theme.border,
                    neon: theme.neon,
                    legacy: true
                };
            })))
            .catch(() => []);
    }
    return _themeList;
}

const PERSONAL_THEMES_KEY = "personalThemes";
function loadPersonalThemes() {
    let list = [];
    try {
        list = JSON.parse(localStorage.getItem(PERSONAL_THEMES_KEY) || "[]");
    } catch { }
    return Array.isArray(list) ? list.filter((t) => t && t.content) : [];
}
function savePersonalThemes(list) {
    try {
        localStorage.setItem(PERSONAL_THEMES_KEY, JSON.stringify(list));
    } catch { }
}

let _keybindEntries = null;
function updateSecretKeybindRows() {
    const enabled = localStorage.getItem("optSaveSkillUpgradesChecked") === "true";
    document.querySelectorAll("#controlSettings tr[data-secret]").forEach((row) => row.classList.toggle("hidden", !enabled));
    _keybindEntries = null;
}
updateSecretKeybindRows();
function getKeybindEntries() {
    if (_keybindEntries) {
        return _keybindEntries;
    }
    const out = [];
    document.querySelectorAll("#controlSettings tr:not(.hidden)").forEach((tr) => {
        tr.querySelectorAll("td").forEach((td) => {
            const b = td.querySelector("b");
            if (!b) {
                return;
            }
            const label = td.textContent.replace(b.textContent, "").replace(/^[\s-]+/, "").trim()
                .replace(/[a-z]+/g, (wd) => wd.charAt(0).toUpperCase() + wd.slice(1));
            out.push({ el: b, label });
        });
    });
    _keybindEntries = out;
    return out;
}
function keybindsPanelHeight() {
    const rows = Math.max(1, Math.ceil(getKeybindEntries().length / 2));
    return KB_ROW_TOP + (rows - 1) * KB_ROW_PITCH + OV_BADGE + 13;
}

function themeCode(palette, name, author) {
    const bytes = [0x6a, 0xba, 0xda, 0xb3, 0xf0, 1];
    const push = (str) => {
        bytes.push(str.length); for (const c of str) {
            bytes.push(c.charCodeAt(0));
        }
    };
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
    for (const b of bytes) {
        bin += String.fromCharCode(b);
    }
    return btoa(bin).replace(/=+$/, "");
}

const OV_BASE = "position:absolute;box-sizing:border-box;margin:0;border:3px solid #484848;border-radius:0;outline:none;pointer-events:auto";
const OV_STROKE = "color:#fff;-webkit-text-stroke:3px #484848;paint-order:stroke fill";
const OV_INPUT = `${OV_BASE};background:#fff;color:#000;text-align:left;font:14px Ubuntu,sans-serif;padding:0 7px`;
const OV_ARROW = "url(\"data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='12' height='7'%3E%3Cpath d='M0 0l6 7 6-7z' fill='%23484848'/%3E%3C/svg%3E\")";
const OV_SELECT = `${OV_BASE};appearance:none;-webkit-appearance:none;background-color:#fff;background-image:${
    OV_ARROW};background-repeat:no-repeat;background-position:calc(100% - 9px) center;background-size:12px 7px;${
    OV_STROKE};text-align:left;font:bold 14px Ubuntu,sans-serif;padding:0 24px 0 7px;cursor:pointer`;
const OV_BTN = `${OV_BASE};background:#8f8f8f;${OV_STROKE};font:bold 14px Ubuntu,sans-serif;cursor:pointer`;
const OV_COLOR = `${OV_BASE};width:27px;height:27px;padding:0;background:none;cursor:pointer`;

function themeBlend() {
    const c = gameDraw.color;
    if (!c) {
        return 0.65;
    }
    if (typeof c.border !== "number") {
        c.border = 0.65;
    }
    return Math.max(0, Math.min(1, c.border));
}
global.ingameThemeSetBlend = (t) => {
    if (!gameDraw.color) {
        return;
    }
    gameDraw.color.border = Math.max(0, Math.min(1, t));
    gameDraw.colorCache = {};
    markThemeCustom();
    refreshThemeCode();
};
global.ingameThemeToggleNeon = () => {
    const wrap = global.themeOverlay;
    if (!wrap) {
        return;
    }
    const sel = wrap._ov.bordersSel;
    sel.value = sel.value === "neon" ? "normal" : "neon";
    sel.dispatchEvent(new Event("change"));
};

function ensureThemeOverlay() {
    if (global.themeOverlay) {
        return global.themeOverlay;
    }
    const wrap = document.createElement("div");
    wrap.id = "ingameThemeOverlay";
    wrap.style.cssText = "position:fixed;left:0;top:0;width:0;height:0;display:none;z-index:20;pointer-events:none;font-family:Ubuntu,sans-serif";

    const st = document.createElement("style");
    st.textContent =
        "#ingameThemeOverlay input[type=color]::-webkit-color-swatch-wrapper{padding:0}" +
            "#ingameThemeOverlay input[type=color]::-webkit-color-swatch{border:none}" +
            "#ingameThemeOverlay input[type=text]::placeholder{color:#8f8f8f}";
    document.head.appendChild(st);

    const mk = (tag, css, id) => {
        const e = document.createElement(tag);
        e.style.cssText = css;
        if (id) {
            e.id = id;
        }
        wrap.appendChild(e);
        return e;
    };

    const name = mk("input", OV_INPUT, "ovName"); name.type = "text"; name.placeholder = "Theme Name";
    const author = mk("input", OV_INPUT, "ovAuthor"); author.type = "text"; author.placeholder = "Author";
    const code = mk("input", OV_INPUT, "ovCode"); code.type = "text"; code.spellcheck = false; code.autocomplete = "off";
    const remove = mk("button", OV_BTN, "ovRemove"); remove.type = "button"; remove.textContent = "Remove";
    const colorsSel = mk("select", OV_SELECT, "ovColors");
    const bordersSel = mk("select", OV_SELECT, "ovBorders");
    const borderColor = mk("input", OV_COLOR, "ovBorderColor"); borderColor.type = "color";
    const swatches = THEME_SWATCHES.map(([key]) => {
        const inp = mk("input", OV_COLOR);
        inp.type = "color";
        inp.dataset.key = key;
        return inp;
    });
    const hits = THEME_SWATCHES.map(() => mk("div", "position:absolute;pointer-events:auto", null));
    const borderHit = mk("div", "position:absolute;pointer-events:auto", null);
    // Invisible inputs keep the native picker on the swatch; these cover the labels for tooltips.
    wrap._colorHover = -1;
    wrap.tooltipService = {
        text: "",
        targetAlpha: 0,
        alpha: Smoothbar(0, 2, 3, 0.06, 0.025, true),
        x: 0,
        y: 0
    };
    const bindHover = (el, i) => {
        el.addEventListener("mouseenter", () => {
            wrap._colorHover = i;
        });
        el.addEventListener("mouseleave", () => {
            if (wrap._colorHover === i) {
                wrap._colorHover = -1;
            }
        });
    };
    [...swatches, borderColor].forEach((inp, i) => {
        inp.style.opacity = "0";
        bindHover(inp, i);
    });
    [...hits, borderHit].forEach(bindHover);

    wrap._ov = { name, author, code, remove, colorsSel, bordersSel, borderColor, swatches, hits, borderHit };
    document.body.appendChild(wrap);
    global.themeOverlay = wrap;

    for (const [value, label] of [["normal", "Light"], ["dark", "Dark"], ["neon", "Neon"], ["glass", "Glass"]]) {
        const o = document.createElement("option");
        o.value = value;
        o.textContent = label;
        bordersSel.appendChild(o);
    }
    bordersSel.value = config.graphical.neon ? "neon" : config.graphical.darkBorders ? "dark" : "normal";

    loadThemes().then((list) => {
        wrap._themes = Array.isArray(list) ? list : [];
        wrap._personal = loadPersonalThemes();
        rebuildThemeSelect();
        const srcColors = document.getElementById("optColors");
        if (srcColors && srcColors.value === "custom") {
            colorsSel.value = "custom";
            applyCustomTheme();
        } else {
            selectTheme(srcColors?.selectedOptions[0]?.textContent.replace(/ \(by .*\)$/, ""));
            syncThemeOverlay();
        }
    });

    colorsSel.addEventListener("change", () => {
        updateThemeButton();
        if (colorsSel.value === "custom") {
            applyCustomTheme();
            return;
        }
        const theme = selectedTheme();
        if (theme) {
            applyTheme(theme);
        }
    });
    bordersSel.addEventListener("change", () => {
        config.graphical.darkBorders = bordersSel.value === "dark" || bordersSel.value === "neon";
        config.graphical.neon = bordersSel.value === "neon" || bordersSel.value === "glass";
        if (gameDraw.color) {
            gameDraw.color.neon = config.graphical.neon; gameDraw.colorCache = {};
        }
        const src = document.getElementById("optBorders");
        if (src) {
            src.value = bordersSel.value;
        }
        refreshThemeCode();
    });
    borderColor.addEventListener("input", (e) => {
        if (gameDraw.color) {
            gameDraw.color.black = e.target.value; gameDraw.colorCache = {};
        }
        markThemeCustom();
        refreshThemeCode();
    });
    swatches.forEach((inp) => {
        inp.addEventListener("input", () => {
            if (gameDraw.color) {
                gameDraw.color[inp.dataset.key] = inp.value; gameDraw.colorCache = {};
            }
            if (inp.dataset.key === "black") {
                wrap._ov.borderColor.value = inp.value;
            }
            markThemeCustom();
            refreshThemeCode();
        });
    });
    remove.addEventListener("click", () => {
        if (colorsSel.value === "custom") {
            addCustomTheme();
            return;
        }
        const mine = /^p(\d+)$/.exec(colorsSel.value);
        if (mine) {
            wrap._personal.splice(parseInt(mine[1], 10), 1);
            savePersonalThemes(wrap._personal);
            rebuildThemeSelect();
        }
        const list = wrap._themes;
        if (list && list.length) {
            colorsSel.value = "t0";
            applyTheme(list[0]);
        } else {
            const c = colors["normal"];
            gameDraw.color = c; gameDraw.colorCache = {}; global.currentColors = c;
            syncThemeOverlay();
        }
    });
    name.addEventListener("input", () => {
        markThemeCustom(); refreshThemeCode();
    });
    author.addEventListener("input", () => {
        markThemeCustom(); refreshThemeCode();
    });
    code.addEventListener("change", () => {
        const parsed = parseTheme(code.value);
        if (parsed && parsed.content) {
            const c = Object.assign({}, colors["normal"], parsed.content);
            c.border = parsed.content.border;
            c.neon = Boolean(parsed.content.neon);
            gameDraw.color = c;
            gameDraw.colorCache = {};
            global.currentColors = c;
            markThemeCustom();
            syncThemeOverlay(parsed.name, parsed.author);
        }
    });
    return wrap;
}

function rebuildThemeSelect() {
    const wrap = global.themeOverlay;
    if (!wrap) {
        return;
    }
    const o = wrap._ov;
    const previous = o.colorsSel.value;
    o.colorsSel.textContent = "";
    const add = (value, label) => {
        const opt = document.createElement("option");
        opt.value = value;
        opt.textContent = label;
        o.colorsSel.appendChild(opt);
    };
    const legacyEnabled = localStorage.getItem("optLegacyThemesChecked") === "true";
    (wrap._themes || []).forEach((theme, i) => {
        if (!theme.legacy || legacyEnabled) {
            add(`t${i}`, theme.name);
        }
    });
    (wrap._personal || []).forEach((theme, i) => add(`p${i}`, theme.name));
    add("custom", "Custom");
    if (previous && o.colorsSel.querySelector(`option[value="${previous}"]`)) {
        o.colorsSel.value = previous;
    }
    updateThemeButton();
}

function selectedTheme() {
    const wrap = global.themeOverlay;
    if (!wrap) {
        return null;
    }
    const match = /^([tp])(\d+)$/.exec(wrap._ov.colorsSel.value);
    if (!match) {
        return null;
    }
    const list = match[1] === "t" ? wrap._themes : wrap._personal;
    return (list && list[parseInt(match[2], 10)]) || null;
}

function selectTheme(name) {
    const wrap = global.themeOverlay;
    if (!wrap || !wrap._themes) {
        return;
    }
    const index = wrap._themes.findIndex((theme) => theme.name === name);
    wrap._ov.colorsSel.value = index === -1 ? "t0" : `t${index}`;
}

function updateThemeButton() {
    const wrap = global.themeOverlay;
    if (!wrap) {
        return;
    }
    wrap._ov.remove.textContent = wrap._ov.colorsSel.value === "custom" ? "Add" : "Remove";
}

function addCustomTheme() {
    const wrap = global.themeOverlay;
    if (!wrap || !gameDraw.color) {
        return;
    }
    const o = wrap._ov;
    const c = gameDraw.color;
    const content = {};
    THEME_PALETTE_KEYS.forEach((key) => {
        const v = c[key];
        content[key] = typeof v === "string" && /^#[0-9a-fA-F]{6}$/.test(v) ? v : "#000000";
    });
    if (!wrap._personal) {
        wrap._personal = [];
    }
    wrap._personal.push({
        name: o.name.value.trim() || "Custom",
        author: o.author.value.trim(),
        content,
        paletteSize: THEME_PALETTE_KEYS.length,
        border: typeof c.border === "number" ? c.border : 0.6,
        neon: Boolean(c.neon)
    });
    savePersonalThemes(wrap._personal);
    rebuildThemeSelect();
    o.colorsSel.value = `p${wrap._personal.length - 1}`;
    updateThemeButton();
}

function markThemeCustom() {
    const wrap = global.themeOverlay;
    if (wrap && wrap._ov.colorsSel.value !== "custom") {
        wrap._ov.colorsSel.value = "custom";
        updateThemeButton();
    }
}

function applyCustomTheme() {
    const src = document.getElementById("optCustom");
    const code = (src && src.value) || localStorage.getItem("optCustomValue") || "";
    const parsed = code ? parseTheme(code) : null;
    if (parsed && parsed.content) {
        const c = Object.assign({}, colors["normal"], parsed.content);
        c.border = parsed.content.border;
        c.neon = Boolean(parsed.content.neon);
        gameDraw.color = c;
        gameDraw.colorCache = {};
        global.currentColors = c;
        config.graphical.darkBorders = Boolean(parsed.content.neon);
        config.graphical.neon = Boolean(parsed.content.neon);
        const wrap = global.themeOverlay;
        if (wrap) {
            wrap._ov.bordersSel.value = parsed.content.neon ? "neon" : "normal";
        }
        syncThemeOverlay(parsed.name, parsed.author);
    } else {
        syncThemeOverlay();
    }
}

function applyTheme(theme) {
    if (!theme || !theme.content) {
        return;
    }
    const c = Object.assign({}, colors["normal"], theme.content);
    c.paletteSize = theme.paletteSize || THEME_PALETTE_KEYS.length;
    c.border = typeof theme.border === "number" ? theme.border : 0.6;
    c.neon = Boolean(theme.neon);
    gameDraw.color = c;
    gameDraw.colorCache = {};
    global.currentColors = c;
    config.graphical.darkBorders = Boolean(theme.neon);
    config.graphical.neon = Boolean(theme.neon);
    const wrap = global.themeOverlay;
    if (wrap) {
        wrap._ov.bordersSel.value = theme.neon ? "neon" : "normal";
    }
    const src = document.getElementById("optBorders");
    if (src) {
        src.value = theme.neon ? "neon" : "normal";
    }
    syncThemeOverlay(theme.name, theme.author);
}

function refreshThemeCode() {
    const wrap = global.themeOverlay;
    if (!wrap || !gameDraw.color) {
        return;
    }
    const o = wrap._ov;
    const name = o.name.value || "Custom";
    const author = o.author.value || "";
    if (document.activeElement !== o.code) {
        o.code.value = themeCode(gameDraw.color, name, author);
    }
}

function syncThemeOverlay(name, author) {
    const wrap = global.themeOverlay;
    if (!wrap || !gameDraw.color) {
        return;
    }
    const o = wrap._ov;
    const c = gameDraw.color;
    o.swatches.forEach((inp) => {
        const v = c[inp.dataset.key];
        if (typeof v === "string" && /^#/.test(v) && inp.value.toLowerCase() !== v.toLowerCase()) {
            inp.value = v;
        }
    });
    if (typeof c.black === "string" && /^#/.test(c.black)) {
        o.borderColor.value = c.black;
    }
    if (name === undefined) {
        const theme = selectedTheme();
        name = theme ? theme.name : o.name.value;
        author = theme ? theme.author : o.author.value;
    }
    if (document.activeElement !== o.name) {
        o.name.value = name || "";
    }
    if (document.activeElement !== o.author) {
        o.author.value = author || "";
    }
    updateThemeButton();
    refreshThemeCode();
}

function drawThemeTab(PANEL_X, PANEL_Y, PANEL_WIDTH, clickableRatio) {
    const wrap = global.themeOverlay || ensureThemeOverlay();
    const o = wrap._ov;
    if (wrap.style.display !== "block") {
        syncThemeOverlay();
    }
    wrap.style.display = "block";
    const r = clickableRatio;
    const scrollY = global.optionsMenu_Anim.scrollOffsets && global.optionsMenu_Anim.scrollOffsets[1]
        ? global.optionsMenu_Anim.scrollOffsets[1].get() : 0;
    const L = PANEL_X + OV_INSET_L; const W = PANEL_WIDTH - OV_INSET_L - OV_INSET_R; const
        T = PANEL_Y - scrollY;
    const hw = (W - OV_GAP) / 2;
    const put = (el, x, y, w, h) => {
        el.style.left = `${x * r}px`;
        el.style.top = `${y * r}px`;
        el.style.width = `${w * r}px`;
        el.style.height = `${h * r}px`;
        el.style.borderWidth = `${3 * r}px`;
    };
    put(o.name, L, T + OV_ROW1, hw, OV_CTRL_H);
    put(o.author, L + hw + OV_GAP, T + OV_ROW1, hw, OV_CTRL_H);
    put(o.code, L, T + OV_ROW2, W - OV_REMOVE_W - OV_CODE_GAP, OV_CTRL_H);
    put(o.remove, L + W - OV_REMOVE_W, T + OV_ROW2, OV_REMOVE_W, OV_CTRL_H);
    put(o.colorsSel, L, T + OV_ROW3, hw, OV_CTRL_H);
    put(o.bordersSel, L + hw + OV_GAP, T + OV_ROW3, hw, OV_CTRL_H);
    const bcx = L + 2 * OV_COL_PITCH; const
        bcy = T + OV_SLIDER_TOP - 2;
    put(o.borderColor, bcx, bcy, OV_SWATCH, OV_SWATCH);
    put(o.borderHit, bcx + OV_SWATCH, bcy, 9 + measureText("Borders", 13.5), OV_SWATCH);
    o.swatches.forEach((inp, i) => {
        const col = i % 3; const
            row = (i / 3) | 0;
        const x = L + col * OV_COL_PITCH; const
            y = T + OV_GRID_TOP + row * OV_GRID_PITCH;
        put(inp, x, y, OV_SWATCH, OV_SWATCH);
        put(o.hits[i], x + OV_SWATCH, y, 9 + measureText(THEME_SWATCHES[i][1], 13.5), OV_SWATCH);
        ctx[2].fillStyle = inp.value;
        drawGuiRect(x, y, OV_SWATCH, OV_SWATCH);
        ctx[2].strokeStyle = colors.black;
        ctx[2].lineWidth = 3;
        drawGuiRect(x, y, OV_SWATCH, OV_SWATCH, true);
        drawText(THEME_SWATCHES[i][1], x + OV_SWATCH + 9, y + OV_SWATCH / 2 + 1, 13.5, colors.guiwhite, "left", true);
    });
    ctx[2].fillStyle = o.borderColor.value;
    drawGuiRect(bcx, bcy, OV_SWATCH, OV_SWATCH);
    ctx[2].strokeStyle = colors.black;
    ctx[2].lineWidth = 3;
    drawGuiRect(bcx, bcy, OV_SWATCH, OV_SWATCH, true);

    const cx = PANEL_X + PANEL_WIDTH / 2;
    drawText("Colors", cx, T + OV_COLORS_HEAD, 15.5, colors.guiwhite, "center", true);
    drawText("Borders", cx, T + OV_BORDERS_HEAD, 15.5, colors.guiwhite, "center", true);

    const sx = L; const sy = T + OV_SLIDER_TOP; const SW = OV_SLIDER_W; const
        SH = 20;
    const sv = themeBlend();
    ctx[2].fillStyle = colors.guiwhite;
    drawGuiRect(sx, sy + 2.5, SW, SH);
    ctx[2].fillStyle = colors.green;
    ctx[2].globalAlpha *= 0.7;
    drawGuiRect(sx, sy + 2.5, SW * sv, SH);
    ctx[2].globalAlpha /= 0.7;
    ctx[2].strokeStyle = colors.black;
    ctx[2].lineWidth = 3;
    drawGuiRect(sx, sy + 2.5, SW, SH, true);
    const knob = sx + (SW - 12.5) * sv;
    ctx[2].fillStyle = colors.green;
    drawGuiRect(knob, sy, 12.5, SH + 5);
    ctx[2].strokeStyle = colors.black;
    drawGuiRect(knob, sy, 12.5, SH + 5, true);
    const midY = sy + SH / 2 + 2.5;
    drawText("Blend Ratio", sx + SW + 8, midY, 13.5, colors.guiwhite, "left", true);
    drawText("Borders", sx + 2 * OV_COL_PITCH + OV_SWATCH + 9, midY, 13.5, colors.guiwhite, "left", true);

    const nx = L; const
        ny = T + OV_NEON_TOP;
    const on = Boolean(config.graphical.neon);
    ctx[2].lineWidth = 3;
    gameDraw.setColor(ctx[2], on ? colors.green : colors.guiwhite);
    drawGuiRect(nx, ny, OV_SWATCH, OV_SWATCH);
    if (on) {
        ctx[2].strokeStyle = "#FFFFFF";
        ctx[2].lineWidth = 3;
        ctx[2].beginPath();
        ctx[2].moveTo(nx + 5.5, ny + OV_SWATCH / 1.8);
        ctx[2].lineTo(nx + OV_SWATCH / 2 - 3, ny + OV_SWATCH - 7);
        ctx[2].lineTo(nx + OV_SWATCH - 6, ny + 8);
        ctx[2].stroke();
    }
    gameDraw.setColor(ctx[2], colors.black);
    drawGuiRect(nx, ny, OV_SWATCH, OV_SWATCH, true);
    drawText("Neon Borders", nx + OV_SWATCH + 9, ny + OV_SWATCH / 2 + 1, 13.5, colors.guiwhite, "left", true);

    const ts = wrap.tooltipService;
    const hover = wrap._colorHover;
    ts.targetAlpha = hover >= 0 ? 1 : 0;
    if (hover === o.swatches.length) {
        ts.text = "The border blend color of all entities";
        ts.x = bcx * r;
        ts.y = (bcy + OV_SWATCH + 10) * r;
    } else if (hover >= 0) {
        const col = hover % 3; const
            row = (hover / 3) | 0;
        ts.text = THEME_SWATCHES[hover][2];
        ts.x = (L + col * OV_COL_PITCH) * r;
        ts.y = (T + OV_GRID_TOP + row * OV_GRID_PITCH + OV_SWATCH + 10) * r;
    }

    global.ingameKeybindRects = null;
    const cr = r * global.ratio;
    global.ingameThemeSlider = { x: sx * cr, y: sy * cr, w: SW * cr, h: (SH + 5) * cr, track: SW };
    global.ingameThemeNeon = { x: nx * cr, y: ny * cr, w: OV_SWATCH * cr, h: OV_SWATCH * cr };
}

function drawKeybindsTab(PANEL_X, PANEL_Y, PANEL_WIDTH, clickableRatio) {
    if (global.themeOverlay) {
        global.themeOverlay.style.display = "none";
    }
    global.ingameThemeSlider = null;
    global.ingameThemeNeon = null;
    const scrollY = global.optionsMenu_Anim.scrollOffsets && global.optionsMenu_Anim.scrollOffsets[2]
        ? global.optionsMenu_Anim.scrollOffsets[2].get() : 0;
    const L = PANEL_X + 22; const
        W = PANEL_WIDTH - 44;
    const T = PANEL_Y - scrollY;
    const cr = clickableRatio * global.ratio;
    const colW = W / 2;
    const entries = getKeybindEntries();
    const rows = Math.max(1, Math.ceil(entries.length / 2));

    drawText("Keybinds", PANEL_X + PANEL_WIDTH / 2, PANEL_Y + OV_TITLE_TOP, 15.5, colors.guiwhite, "center");

    const rects = [];
    entries.forEach((e, i) => {
        const col = i % 2; const
            row = (i / 2) | 0;
        const x = L + col * colW;
        const y = T + KB_ROW_TOP + row * KB_ROW_PITCH;
        const td = e.el.closest("td");
        ctx[2].lineWidth = 3;
        ctx[2].fillStyle = colors.guiwhite;
        drawGuiRect(x, y, OV_BADGE, OV_BADGE);
        if (td && td.classList.contains("editing")) {
            ctx[2].fillStyle = colors.green;
            drawGuiRect(x, y, OV_BADGE, OV_BADGE);
        }
        ctx[2].strokeStyle = colors.black;
        drawGuiRect(x, y, OV_BADGE, OV_BADGE, true);
        drawText(getKeybind(e.el.dataset.key) || "", x + OV_BADGE / 2, y + OV_BADGE / 2, 12, colors.black, "center", true, 1, false);
        ctx[2].save();
        ctx[2].beginPath();
        ctx[2].rect(x + OV_BADGE + 10, y, colW - OV_BADGE - 18, OV_BADGE);
        ctx[2].clip();
        drawText(e.label, x + OV_BADGE + 13, y + OV_BADGE / 2, 13.5, colors.guiwhite, "left", true);
        ctx[2].restore();
        rects.push({ el: e.el, x: x * cr, y: y * cr, w: colW * cr, h: OV_BADGE * cr });
    });
    global.ingameKeybindRects = rects;
}

global.refreshBrainrotOption = () => {
    const select = document.getElementById("optNames");
    if (!select) {
        return;
    }
    const enabled = localStorage.getItem("optBrainrotFilterChecked") === "true";
    const option = select.querySelector("option[value=\"brainrot\"]");
    if (enabled && !option) {
        const created = document.createElement("option");
        created.value = "brainrot";
        created.textContent = "Filter \"Brainrot\" Words";
        select.appendChild(created);
    } else if (!enabled && option) {
        if (select.value === "brainrot") {
            select.value = "none";
        }
        option.remove();
    }
    const cb = (global.optionsCheckboxes || []).find((cb) => cb.id === "optNames");
    if (!cb) {
        return;
    }
    cb.optionData = Array.from(select.options).map((option) => ({ value: option.value, label: option.textContent }));
    if (cb.optionService) {
        cb.optionService.selected = select.selectedOptions[0]?.textContent || "";
    }
};
global.refreshBrainrotOption();
global.refreshSecretThemes = () => {
    const select = document.getElementById("optColors");
    if (!select) {
        return;
    }
    const enabled = localStorage.getItem("optLegacyThemesChecked") === "true";
    for (const option of select.querySelectorAll("option[data-secret-theme]")) {
        option.hidden = option.disabled = !enabled;
    }
    if (!enabled && select.selectedOptions[0]?.hidden) {
        select.value = "normal";
    }
    rebuildThemeSelect();
};
global.applyCrosshairCursor = () => {
    const enabled = localStorage.getItem("optCrosshairCursorChecked") === "true";
    document.body.classList.toggle("crosshair-cursor", enabled);
};
global.applyCrosshairCursor();

function drawSecretTab(PANEL_X, PANEL_Y, PANEL_WIDTH, clickableRatio, fullUnlocked) {
    if (global.themeOverlay) {
        global.themeOverlay.style.display = "none";
    }
    global.ingameThemeSlider = null;
    global.ingameThemeNeon = null;
    global.ingameKeybindRects = null;
    const BOX_SIZE = 25;
    const LINE_HEIGHT = 40;
    global.clickables.optionsMenu.toggleBoxes.hide();
    global.clickables.optionsMenu.HoverBoxes.hide();
    const secretTooltips = [];
    const fullExtra = fullUnlocked ? 40 : 0;
    for (const [section, layout] of Object.entries(SECRET_SECTION_LAYOUT)) {
        drawText(layout.title, PANEL_X + PANEL_WIDTH / 2, PANEL_Y + layout.titleY + (section === "secret" ? 0 : fullExtra), 15.5, colors.guiwhite, "center");
    }
    for (let i = 0; i < global.optionsCheckboxes.length; i++) {
        const cb = global.optionsCheckboxes[i];
        if (!isSecretSection(cb.section)) {
            continue;
        }
        if (cb.fullSecret && !fullUnlocked) {
            if (cb.tooltipService) {
                cb.tooltipService.targetAlpha = 0;
            }
            continue;
        }
        const layout = SECRET_SECTION_LAYOUT[cb.section];
        const x = cb.column === 0 ? PANEL_X + 20 : PANEL_X + PANEL_WIDTH / 2 + 7.5;
        const y = PANEL_Y + layout.rowTop + (cb.section === "secret" ? 0 : fullExtra) + cb.row * LINE_HEIGHT;
        const hitSize = BOX_SIZE * clickableRatio;
        if (!cb.tooltipService) {
            cb.tooltipService = {
                text: cb.tooltip,
                targetAlpha: 0,
                alpha: Smoothbar(0, 2, 3, 0.06, 0.025, true),
                x: 0,
                y: 0
            };
        }
        cb.tooltipService.x = x * clickableRatio;
        cb.tooltipService.y = (y + BOX_SIZE + 10) * clickableRatio;
        global.clickables.optionsMenu.HoverBoxes.place(i, x * clickableRatio, y * clickableRatio, hitSize + (10.5 + measureText(cb.label, BOX_SIZE) * 0.65 + 1) * clickableRatio, hitSize);
        cb.tooltipService.targetAlpha = global.clickables.optionsMenu.HoverBoxes.check({ x: global.mouse.x, y: global.mouse.y }) === i ? 1 : 0;
        if (!cb.placeholder && cb.lastValue !== cb.value) {
            cb.lastValue = cb.value;
            localStorage.setItem(`${cb.id}Checked`, cb.value ? "true" : "false");
            if (cb.id === "optBrainrotFilter") {
                global.refreshBrainrotOption();
            }
            if (cb.id === "optCrosshairCursor") {
                global.applyCrosshairCursor();
            }
            if (cb.id === "optRainbowTeamColors") {
                config.game.rainbowTeamColors = Boolean(cb.value);
            }
            if (cb.id === "optDmcaMode") {
                global.setDmcaMode(Boolean(cb.value));
            }
            if (cb.id === "optSelfCenteredMinimap") {
                config.game.centeredMinimap = Boolean(cb.value);
            }
            if (cb.id === "optForce169AspectRatio") {
                config.graphical.force169AspectRatio = Boolean(cb.value);
            }
            if (cb.id === "optLegacyThemes") {
                global.refreshSecretThemes();
            }
            if (cb.id === "optSaveSkillUpgrades") {
                updateSecretKeybindRows();
            }
            if (cb.id === "optShowLocalhost") {
                if (cb.value) {
                    global.servers.unshift({
                        id: "x",
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
                } else {
                    global.servers = global.servers.filter((s) => s.id !== "localhost");
                }
                global.loadServerSelector(global.servers);
            }
        }
        const isOn = !cb.placeholder && Boolean(cb.value);
        if (!cb.placeholder) {
            global.clickables.optionsMenu.toggleBoxes.place(i, x * clickableRatio, y * clickableRatio, hitSize, hitSize);
        }
        ctx[2].lineWidth = 3;
        gameDraw.setColor(ctx[2], isOn ? colors.green : colors.guiwhite);
        drawGuiRect(x, y, BOX_SIZE, BOX_SIZE);
        gameDraw.setColor(ctx[2], colors.black);
        drawGuiRect(x, y, BOX_SIZE, BOX_SIZE, true);
        if (isOn) {
            ctx[2].strokeStyle = "#FFFFFF";
            ctx[2].lineWidth = 3;
            ctx[2].beginPath();
            ctx[2].moveTo(x + 5.5, y + BOX_SIZE / 1.8);
            ctx[2].lineTo(x + BOX_SIZE / 2 - 3, y + BOX_SIZE - 7);
            ctx[2].lineTo(x + BOX_SIZE - 6, y + 8);
            ctx[2].stroke();
        }
        drawText(cb.label, x + BOX_SIZE + 10.5, y + BOX_SIZE / 2 + 6, 13.5, colors.guiwhite, "left", false, 1, 5.5);
        secretTooltips.push(cb);
    }
    for (const cb of secretTooltips) {
        drawToolip(cb);
    }
}

function drawOptionsMenu() {
    global.ingameKeybindRects = null;
    global.ingameThemeSlider = null;
    global.ingameThemeNeon = null;

    // Initialize tab offset for sliding animation and menu height animation
    if (!global.optionsMenu_Anim.tabOffset) {
        global.optionsMenu_Anim.tabOffset = Smoothbar(global.optionsMenu_Anim.activeTab || 0, 2, 3, 0.08, 0.025, true);
        global.optionsMenu_Anim.scrollOffsets = [
            Smoothbar(0, 2, 3, 0.05, 0.13, true),
            Smoothbar(0, 2, 3, 0.05, 0.13, true),
            Smoothbar(0, 2, 3, 0.05, 0.13, true),
            Smoothbar(0, 2, 3, 0.05, 0.13, true)
        ];
        global.optionsMenu_Anim.scrollTargets = [0, 0, 0, 0];
    }

    const RENDERX = global.optionsMenu_Anim.switchMenu_button.get();
    const BTN_SIZE = 30;
    const BTN_WIDTH_COLLAPSED = BTN_SIZE / 1.57; // Half width when not hovering
    const BTN_WIDTH_EXPANDED = 119; // Increased from 100 to make it wider
    const BTN_X = config.graphical.oldUIStyle ? -4 : 1;
    const BTN_Y = config.graphical.oldUIStyle ? 19 : 25;
    const clickableRatio = global.canvas ? global.canvas.height / global.screenHeight / global.ratio : 1;
    const animValue = global.optionsMenu_Anim.optionsButtonProgress.get();
    // Check hover state
    const mpos = {
        x: global.mouse.x,
        y: global.mouse.y
    };

    // Update clickable area
    const currentWidth = BTN_WIDTH_COLLAPSED + (BTN_WIDTH_EXPANDED - BTN_WIDTH_COLLAPSED) * animValue;
    if (global.clickables && global.clickables.optionsMenu.switchButton) {
        if (global.optionsMenu_Anim.isOpened) {
            global.clickables.optionsMenu.switchButton.hide();
        } else {
            global.clickables.optionsMenu.switchButton.place(0, BTN_X * clickableRatio - 4, BTN_Y * clickableRatio, currentWidth * clickableRatio + 4, BTN_SIZE * clickableRatio);
        }
    }

    const hover = global.clickables && global.clickables.optionsMenu.switchButton ? global.clickables.optionsMenu.switchButton.check(mpos) === 0 : false;

    // Change value to activate animation
    if (hover) {
        global.optionsMenu_Anim.optionsButtonProgress.set(1);
    } else {
        global.optionsMenu_Anim.optionsButtonProgress.set(0);
    }

    const animatedWidth = BTN_WIDTH_COLLAPSED + (BTN_WIDTH_EXPANDED - BTN_WIDTH_COLLAPSED) * animValue;
    ctx[2].translate(RENDERX, 0);
    ctx[2].save();

    // Draw button background
    ctx[2].lineWidth = 3;
    gameDraw.setColor(ctx[2], colors.green);
    drawGuiRect(BTN_X, BTN_Y, animatedWidth, BTN_SIZE);
    if (hover) {
        gameDraw.setColor(ctx[2], global.clickables.clicked ? "#000" : "#fff");
        ctx[2].globalAlpha = global.clickables.clicked ? 0.15 : 0.2;
        drawGuiRect(BTN_X, BTN_Y, animatedWidth, BTN_SIZE);
        ctx[2].globalAlpha = 1;
    }
    // Draw "Options" text
    if (animValue > 0.1) {
        const textX = BTN_X + BTN_WIDTH_COLLAPSED / 2 + animatedWidth - 105;
        const textY = BTN_Y + BTN_SIZE / 2;
        drawText("Options", textX, textY * 1.13, 12, colors.guiwhite, "left");
    }
    ctx[2].lineWidth = 3;
    gameDraw.setColor(ctx[2], colors.black);
    drawGuiRect(BTN_X, BTN_Y, animatedWidth, BTN_SIZE, true); // Draw stroke(Outline) between the box

    // Draw THICK border

    // Draw separator line between options area and arrow area (when expanded)
    if (animValue > 0.001) {
        const separatorX = BTN_X + animatedWidth - BTN_WIDTH_COLLAPSED - 2;
        ctx[2].strokeStyle = colors.black;
        ctx[2].lineWidth = 6;
        ctx[2].beginPath();
        ctx[2].moveTo(separatorX, BTN_Y + 2);
        ctx[2].lineTo(separatorX, BTN_Y + BTN_SIZE - 2);
        ctx[2].stroke();
    }

    // Draw arrow - slides to the right as button expands - KEEP YOUR ORIGINAL ARROW
    const arrowW = BTN_WIDTH_COLLAPSED * 0.3; // Arrow width (horizontal)
    const arrowH = BTN_SIZE * 0.3; // Arrow height (vertical)

    // Arrow position moves from center of collapsed button to right edge of expanded button
    const arrowBaseX = BTN_X + BTN_WIDTH_COLLAPSED / 2;
    const arrowCenterX = arrowBaseX + animatedWidth - 19;
    const arrowCenterY = BTN_Y + BTN_SIZE / 2;


    const leftX = arrowCenterX - arrowW / 3;
    const tipX = arrowCenterX + arrowW / 2;
    const topY = arrowCenterY - arrowH / 2;
    const botY = arrowCenterY + arrowH / 2;

    ctx[2].fillStyle = "#FFFFFF";
    ctx[2].lineJoin = "round";
    ctx[2].lineCap = "round";
    ctx[2].lineWidth = 3;

    ctx[2].beginPath();
    ctx[2].moveTo(leftX, topY);
    ctx[2].lineTo(tipX, arrowCenterY);
    ctx[2].lineTo(leftX, botY);
    ctx[2].closePath();
    ctx[2].fill();
    ctx[2].strokeStyle = "#FFFFFF";
    ctx[2].stroke();

    ctx[2].restore();
    ctx[2].translate(-RENDERX, -0);

    const mainMenuAnim = global.optionsMenu_Anim.mainMenu.get();
    if (mainMenuAnim < -470) { // fully hidden
        if (global.themeOverlay && global.themeOverlay.style.display !== "none") {
            global.themeOverlay.style.display = "none";
        }
        return;
    }
    const extraLeftX = config.graphical.oldUIStyle ? 5 : 0;
    const extraTopY = config.graphical.oldUIStyle ? 6 : 0;
    const PANEL_WIDTH = 460;
    const PANEL_Y = 75 - extraTopY;
    const MAX_PANEL_HEIGHT = global.screenHeight - PANEL_Y - 25; // 25px bottom margin
    const PANEL_HEIGHT = Math.min(global.optionsMenu_Anim.mainMenuHeight.get(), MAX_PANEL_HEIGHT);

    // slide from off-screen left → visible
    const PANEL_VISIBLE_X = mainMenuAnim;
    const PANEL_HIDDEN_X = PANEL_VISIBLE_X - PANEL_WIDTH - 20;
    const PANEL_X = PANEL_HIDDEN_X + (PANEL_VISIBLE_X - PANEL_HIDDEN_X) - extraLeftX;
    const fullBox = (global.optionsCheckboxes || []).find((cb) => cb.id === "optSuperSecretOptions");
    const fullUnlocked = fullBox ? Boolean(fullBox.value) : localStorage.getItem("optSuperSecretOptionsChecked") === "true";
    const secretPanelH = SECRET_PANEL_H + (fullUnlocked ? 40 : 0);
    const TAB_CONTENT_HEIGHTS = [
        (PANEL_Y + 685 + 1 * 40 + 45) - PANEL_Y,  // perf section: last row baseY + 1 row + padding
        THEME_PANEL_H,
        keybindsPanelHeight(),
        secretPanelH
    ];
    const TAB_CONTENT_MAX_SCROLL = [
        0,
        THEME_PANEL_H,
        keybindsPanelHeight(),
        secretPanelH
    ];
    global.optionsMenu_Anim.tabs[1][1] = THEME_PANEL_H;
    global.optionsMenu_Anim.tabs[2][1] = TAB_CONTENT_HEIGHTS[2];
    global.optionsMenu_Anim.tabs[3][1] = secretPanelH;
    const secretBox = (global.optionsCheckboxes || []).find((cb) => cb.id === "optSecretOptions");
    const secretUnlocked = secretBox ? Boolean(secretBox.value) : localStorage.getItem("optSecretOptionsChecked") === "true";
    global.clickables.optionsMenu.mainMenuIdle.set(PANEL_X * clickableRatio, PANEL_Y * clickableRatio, PANEL_WIDTH * clickableRatio, PANEL_HEIGHT * clickableRatio);
    if (!secretUnlocked && (global.optionsMenu_Anim.activeTab || 0) === 3) {
        global.optionsMenu_Anim.activeTab = 0;
        global.optionsMenu_Anim.tabOffset.set(0);
        global.optionsMenu_Anim.mainMenuHeight.set(global.optionsMenu_Anim.tabs[0][1]);
    }
    const activeTab = global.optionsMenu_Anim.activeTab || 0;
    const scrollOffsetAnim = global.optionsMenu_Anim.scrollOffsets[activeTab];
    const contentH = TAB_CONTENT_HEIGHTS[activeTab];
    const contentM = TAB_CONTENT_MAX_SCROLL[activeTab];
    const maxScroll = Math.max(0, contentH - PANEL_HEIGHT);

    if (global.optionsMenu_Anim.scrollTargets[activeTab] < 0) {
        global.optionsMenu_Anim.scrollTargets[activeTab] = 0;
    }
    if (global.optionsMenu_Anim.scrollTargets[activeTab] > maxScroll) {
        global.optionsMenu_Anim.scrollTargets[activeTab] = maxScroll;
    }

    scrollOffsetAnim.set(global.optionsMenu_Anim.scrollTargets[activeTab]);
    const scrollY = scrollOffsetAnim.get();

    // Store live panel bounds for the wheel handler to read each frame
    global.optionsMenu_Anim._PANEL_X = PANEL_X;        // already defined above
    global.optionsMenu_Anim._panelY = PANEL_Y;
    global.optionsMenu_Anim._panelW = PANEL_WIDTH;
    global.optionsMenu_Anim._panelH = PANEL_HEIGHT;
    if (global.optionsMenu_Anim.isOpened && global.optionsMenu_Anim._wheelHandler === undefined) {
        global.optionsMenu_Anim._wheelHandler = (e) => {
            if (!global.clickables.optionsMenu.mainMenuIdle.check({x: global.mouse.x, y: global.mouse.y})) {
                return;
            }
            const tab = global.optionsMenu_Anim.activeTab || 0;
            global.optionsMenu_Anim.scrollTargets[tab] =
                (global.optionsMenu_Anim.scrollTargets[tab] || 0) + e.deltaY * 0.8;
        };
        window.addEventListener("wheel", global.optionsMenu_Anim._wheelHandler, { passive: true });
    } else if (!global.optionsMenu_Anim.isOpened && global.optionsMenu_Anim._wheelHandler) {
        window.removeEventListener("wheel", global.optionsMenu_Anim._wheelHandler);
        global.optionsMenu_Anim._wheelHandler = undefined;
    }
    ctx[2].save();
    ctx[2].globalAlpha = 1;

    // background
    ctx[2].lineWidth = 3;
    gameDraw.setColor(ctx[2], colors.grey);
    drawGuiRect(PANEL_X, PANEL_Y, PANEL_WIDTH, PANEL_HEIGHT);
    gameDraw.setColor(ctx[2], colors.black);
    drawGuiRect(PANEL_X, PANEL_Y, PANEL_WIDTH, PANEL_HEIGHT, true);

    // Top tabs with interactive functionality
    const TAB_NAMES = secretUnlocked ? global.optionsMenu_Anim.tabs : global.optionsMenu_Anim.tabs.slice(0, 3);
    const TAB_WIDTH = PANEL_WIDTH / (TAB_NAMES.length === 4 ? 5.03 : 3.73);
    const TAB_HEIGHT = 50;
    const TAB_Y = PANEL_Y - TAB_HEIGHT;

    drawText("ingame options is not finished, expect missing features and bugs lol", PANEL_X + PANEL_WIDTH / 2, PANEL_Y - 57, 9.5, colors.guiwhite, "center");

    // Initialize tab clickables
    global.optionsMenu_Anim.tabClickables.hide();

    // Draw tabs backgrounds and place clickables
    for (let tabIndex = 0; tabIndex < TAB_NAMES.length; tabIndex++) {
        const x = PANEL_X + tabIndex * TAB_WIDTH * 1.162;
        const TAB_X = x + 50;
        const tabClickableX = TAB_X * clickableRatio;
        const tabClickableY = TAB_Y * clickableRatio;
        const tabClickableW = TAB_WIDTH * clickableRatio;
        const tabClickableH = TAB_HEIGHT * clickableRatio;

        global.optionsMenu_Anim.tabClickables.place(tabIndex, tabClickableX, tabClickableY, tabClickableW, tabClickableH);

        const tabHover = global.optionsMenu_Anim.tabClickables.check(mpos) === tabIndex;

        // Draw tab background
        ctx[2].lineWidth = 3;
        gameDraw.setColor(ctx[2], gameDraw.mixColors(colors.grey, colors.black, 0.3));
        drawGuiRect(TAB_X, TAB_Y, TAB_WIDTH, TAB_HEIGHT);
        if (tabHover) {
            gameDraw.setColor(ctx[2], global.clickables.clicked ? colors.guiblack : colors.lgrey);
            ctx[2].globalAlpha = global.clickables.clicked ? 0.10 : 1;
            drawGuiRect(TAB_X, TAB_Y, TAB_WIDTH, TAB_HEIGHT);
            ctx[2].globalAlpha = 1;
        }
    }

    // Draw tabs borders
    for (let tabIndex = 0; tabIndex < TAB_NAMES.length; tabIndex++) {
        const x = PANEL_X + tabIndex * TAB_WIDTH * 1.162;
        const TAB_X = x + 50;

        // Draw tab border
        ctx[2].lineWidth = 3;
        gameDraw.setColor(ctx[2], colors.black);
        drawGuiRect(TAB_X, TAB_Y, TAB_WIDTH, TAB_HEIGHT, true);
    }

    // Sliding tab background and border (above borders, below text)
    const currentTab = global.optionsMenu_Anim.tabOffset.get();
    const bgX = PANEL_X + currentTab * TAB_WIDTH * 1.162 + 50;
    gameDraw.setColor(ctx[2], colors.grey);
    drawGuiRect(bgX, TAB_Y, TAB_WIDTH, TAB_HEIGHT + 3); // Extend height to cover bottom border
    // Draw border without bottom
    ctx[2].strokeStyle = colors.black;
    ctx[2].lineWidth = 3;
    ctx[2].beginPath();
    ctx[2].moveTo(bgX, TAB_Y);
    ctx[2].lineTo(bgX + TAB_WIDTH, TAB_Y); // top
    ctx[2].moveTo(bgX, TAB_Y);
    ctx[2].lineTo(bgX, TAB_Y + TAB_HEIGHT); // left
    ctx[2].moveTo(bgX + TAB_WIDTH, TAB_Y);
    ctx[2].lineTo(bgX + TAB_WIDTH, TAB_Y + TAB_HEIGHT); // right
    ctx[2].stroke();

    // Draw tabs labels
    for (let tabIndex = 0; tabIndex < TAB_NAMES.length; tabIndex++) {
        const x = PANEL_X + tabIndex * TAB_WIDTH * 1.162;
        const TAB_X = x + 50;

        // Tab label, centered on the tab
        const cx = TAB_X + TAB_WIDTH / 2;
        const cy = TAB_Y + TAB_HEIGHT - 18;
        drawText(TAB_NAMES[tabIndex][0], cx, cy, TAB_NAMES.length === 4 ? 13.5 : 16, colors.guiwhite, "center");
    }

    // Draw tab content with fade animation
    const fadeOptions = Math.max(0, 1 - Math.abs(0 - currentTab));
    const fadeTheme = Math.max(0, 1 - Math.abs(1 - currentTab));
    const fadeKeybinds = Math.max(0, 1 - Math.abs(2 - currentTab));
    const fadeSecret = Math.max(0, 1 - Math.abs(3 - currentTab));

    ctx[2].save();
    ctx[2].globalAlpha *= fadeOptions;
    ctx[2].beginPath();
    ctx[2].rect(PANEL_X, PANEL_Y + 15, PANEL_WIDTH, PANEL_HEIGHT - 30);
    ctx[2].clip();
    ctx[2].translate(0, -scrollY);
    if (fadeOptions > 0.01) {

        // OPTIONS TAB

        drawText("Game Appearance", PANEL_X + PANEL_WIDTH / 2, PANEL_Y + OV_TITLE_TOP,       15.5, colors.guiwhite, "center");
        drawText("UI Elements",     PANEL_X + PANEL_WIDTH / 2, PANEL_Y + OV_TITLE_TOP + 320, 15.5, colors.guiwhite, "center");
        drawText("Extra",           PANEL_X + PANEL_WIDTH / 2, PANEL_Y + OV_TITLE_TOP + 480, 15.5, colors.guiwhite, "center");
        drawText("Performance",     PANEL_X + PANEL_WIDTH / 2, PANEL_Y + OV_TITLE_TOP + 680, 15.5, colors.guiwhite, "center");

        if (!global.optionsCheckboxes) {
            const legacyOptionNotice = "\nNote: This is a legacy option and will be removed in a future update.";
            global.optionsCheckboxes = [
                // Game Appearance
                { type: "checkbox",   id: "optRenderNames",         label: "Player Names",          column: 0, row: 0, section: "appearance", tooltip: "Show player names." },
                { type: "checkbox",   id: "optRenderScores",        label: "Player Scores",         column: 0, row: 1, section: "appearance", tooltip: "Show player scores." },
                { type: "checkbox",   id: "optNoGrid",              label: "Background Grid",       column: 0, row: 2, section: "appearance", tooltip: "Show the background grid.", reverseCheck: true },
                { type: "checkbox",   id: "optPointy",              label: "Sharp Traps",           column: 0, row: 3, section: "appearance", tooltip: "Sharpen the corners of traps." },
                { type: "checkbox",   id: "optSharpEdges",          label: "Sharp Polygons",        column: 0, row: 4, section: "appearance", tooltip: "Sharpen the corners of all polygons.\n" + "May slightly lower the frame rate." },
                //{ type: "checkbox",   id: "coloredHealthbars",      label: "Colored Health Bars",   column: 0, row: 5, section: "appearance", tooltip: "Make the health and shield bar(s) of entities match their body color." },
                { type: "checkbox",   id: "optSecretOptions",       label: "Secret Options",        column: 0, row: 5, section: "appearance", tooltip: "Unlock the secret options tab.\n" + "Note: Some of these options are hidden for a reason. They can cause glitches, and may get removed at any time." },
                { type: "slidingBar", id: "strokeThickness",        label: "Border Thickness",      column: 0, row: 6, section: "appearance", tooltip: "Choose the thickness of the borders of entities.",
                    maxValue: 6, maxLowestValue: 0.7, listTarget: "graphical", target: "borderChunk",
                    trigger: (mouse, data) => {
                        const pointer = optionsMenu_getPointer();
                        if (data.bounds) {
                            const listFolder = config[data.listTarget];
                            const knobWidth = 12.2;
                            const halfKnob = knobWidth / 2;
                            const adjustedX = data.bounds.x + halfKnob;
                            const adjustedWidth = data.bounds.width - knobWidth;
                            const ratio = Math.max(0, Math.min(1, (pointer.x - adjustedX) / adjustedWidth));
                            const range = data.maxValue - data.maxLowestValue;
                            const value = (ratio * range) + data.maxLowestValue;
                            listFolder[data.target] = value;
                            localStorage.setItem(`${data.id}Value`, value);
                        }
                    }
                },

                { type: "checkbox", id: "optChatMessages",        label: "Chat Messages",         column: 1, row: 0, section: "appearance", tooltip: "Show chat messages." },
                { type: "checkbox", id: "optRenderHealth",        label: "Health Bars",           column: 1, row: 1, section: "appearance", tooltip: "Show health bars." },
                { type: "checkbox", id: "separatedHealthbars",    label: "Separate Shield Bar",   column: 1, row: 2, section: "appearance", tooltip: "Separate the shield bar from the health bar." },
                { type: "checkbox", id: "optCurvyTraps",          label: "Curvy Traps",           column: 1, row: 3, section: "appearance", tooltip: "Add curvature to the sides of traps.\n" + "May slightly lower the frame rate." },
                { type: "checkbox", id: "optTankSkins",           label: "Tank Skins",            column: 1, row: 4, section: "appearance", tooltip: "Show tank skins.\n" + "Note: Skins will be in grayscale if the low WebGl driver is selected." },
                //{ type: "checkbox", id: "optHexaGrid",            label: "Hexagon Grid",          column: 1, row: 5, section: "appearance", tooltip: "Make the background grid hexagonal.\n" + "May slightly lower the frame rate." },
                { type: "checkbox", id: "optSuperSecretOptions",  label: "Super Secret Options",   column: 1, row: 5, section: "appearance", tooltip: "Unlock the super secret options section.\n" + "Note: This is not supposed to be public..." },

                // UI Elements
                { type: "checkbox", id: "optRenderUpgrades",      label: "Upgrades",              column: 0, row: 0, section: "ui", tooltip: "Toggle the visibility of the class and skill upgrade menus." },
                { type: "checkbox", id: "optRenderPlayerBars",    label: "Player Bars",           column: 0, row: 1, section: "ui", tooltip: "Toggle the visibility of the score and level bars." },
                { type: "checkbox", id: "optRenderKillbar",       label: "Kill Bar",              column: 0, row: 2, section: "ui", tooltip: "Toggle the visibility of the kill bar, which shows the number of kills, assists, and boss kills." },
                //{ type: "checkbox", id: "optOldUiStyle",          label: "Classic UI",            column: 0, row: 3, section: "ui", tooltip: "Changes the UI to the classic layout." },

                { type: "checkbox", id: "optRenderLeaderboard",   label: "Leaderboard",           column: 1, row: 0, section: "ui", tooltip: "Toggle the visibility of the leaderboard." },
                { type: "checkbox", id: "optRenderMinimap",       label: "Minimap",               column: 1, row: 1, section: "ui", tooltip: "Toggle the visibility of the minimap." },
                { type: "checkbox", id: "optReducedInfo",         label: "Extra Info",            column: 1, row: 2, section: "ui", tooltip: "Show various extra information in the bottom right corner.", reverseCheck: true },

                // Extra
                { type: "option",    id: "optUiScale",             label: "",                      column: 0, row: 0, section: "extra", tooltip: "Configure the size of the user interface.",
                    optionData: optionsMenu_getUserInterfaceOptions(),
                    width: 202.5,
                    location: "auto",
                    trigger: (data, theChosenOne) => {
                        const doc = document.getElementById(data.id);
                        doc.value = theChosenOne.value;
                        util.submitToLocalStorage(data.id);
                        data.optionService.opened = false;
                        data.optionService.selected = data.label;
                        loadSettings();
                    }
                },
                { type: "option",    id: "optNames",               label: "",                      column: 1, row: 0, section: "extra", tooltip: "Select what word filter to use.\nEach tier includes the tiers above it. Inappropriate is the default.",
                    optionData: Array.from(document.getElementById("optNames").options).map((option) => ({ value: option.value, label: option.textContent })),
                    width: 202.5,
                    location: "auto",
                    trigger: (data, theChosenOne) => {
                        const doc = document.getElementById(data.id);
                        doc.value = theChosenOne.value;
                        util.submitToLocalStorage(data.id);
                        data.optionService.opened = false;
                        data.optionService.selected = data.label;
                    }
                },
                { type: "checkbox",  id: "smoothCamera",           label: "Smooth Camera",         column: 0, row: 1, section: "extra", tooltip: "Make the camera follow your tank instead of being fixed at it." },
                { type: "checkbox",  id: "autoLevelUp",            label: "Auto-Level Up",         column: 0, row: 2, section: "extra", tooltip: "Automatically level you up to level 45 upon joining the game." },
                { type: "checkbox",  id: "optAutoReconnect",       label: "Auto-Reconnect",        column: 0, row: 3, section: "extra", tooltip: "Automatically reconnect after a disconnection." },

                { type: "checkbox",  id: "optFancy",               label: "Fading Animation",      column: 1, row: 1, section: "extra", tooltip: "Make dying entities fade out instead of shrinking until disappearing.\nMay slightly lower the frame rate." },
                { type: "checkbox",  id: "optIncognitoMode",       label: "Incognito Mode",        column: 1, row: 2, section: "extra", tooltip: "Hide you from the leaderboard and make your score appear low to other players." },

                // Performance
                //{ type: "checkbox",  id: "optDeltaEntities",       label: "Delta Entities",        column: 0, row: 0, section: "perf", tooltip: "Support delta entity updates from the server.\nTakes effect on next connection." },
                { type: "option",    id: "optCanvas",              label: "",                      column: 0, row: 0, section: "perf", tooltip: "[WIP] Select which canvas rendering driver to use.\nMay affect the frame rate.",
                    optionData: Array.from(document.getElementById("optCanvas").options).map((option) => ({ value: option.value, label: option.textContent })),
                    width: 202.5,
                    location: "auto",
                    trigger: (data, theChosenOne) => {
                        const doc = document.getElementById(data.id);
                        doc.value = theChosenOne.value;
                        util.submitToLocalStorage(data.id);
                        data.optionService.opened = false;
                        data.optionService.selected = data.label;
                    }
                },
                { type: "checkbox",  id: "optLowResolution",       label: "Low Resolution",         column: 1, row: 0, section: "perf", tooltip: "Lower the game's resolution.\nMay help to improve the frame rate." },

                // Secrets
                { type: "checkbox", id: "optCrosshairCursor",     label: "Crosshair Cursor",        column: 0, row: 0, section: "secret", tooltip: "Use a crosshair for the cursor." },
                { type: "checkbox", id: "optRainbowTeamColors",   label: "Rainbow Team Colors",     column: 1, row: 0, section: "secret", tooltip: "Replace the colors of the teams with colors of the rainbow." },
                { type: "checkbox", id: "optCopyScreenshots",     label: "Copy Screenshots",        column: 0, row: 1, section: "secret", tooltip: "Copy screenshots to the clipboard instead of downloading them." },
                { type: "checkbox", id: "optForce169AspectRatio", label: "Force 16:9 Aspect Ratio", column: 1, row: 1, section: "secret", tooltip: "Always use a 16:9 aspect ratio to render the game." },
                { type: "checkbox", id: "optSelfCenteredMinimap", label: "Self Centered Minimap",   column: 0, row: 2, section: "secret", tooltip: "Make yourself always centered on the minimap." },
                { type: "checkbox", id: "optBrainrotFilter",      label: "\"Brainrot\" Filter",       column: 1, row: 2, section: "secret", tooltip: "Add the option to filter \"brainrot\" words." },
                { type: "checkbox", id: "optShowLocalhost",       label: "Show Localhost",          column: 1, row: 3, section: "secret", fullSecret: true, tooltip: "Display wss://localhost:5000 as one of the servers." },
                { type: "checkbox", id: "optDmcaMode",            label: "DMCA Mode",               column: 0, row: 3, section: "secret", fullSecret: true, tooltip: "Censor the names and designs of all tanks which also appear in diep.io to comply with 3AM Experiences LLC's DMCA notices." },
                { type: "checkbox", id: "optDebugBoxes",          label: "Debug Boxes",             column: 0, row: 4, section: "secret", fullSecret: true, placeholder: true, tooltip: "[WIP] Show debug boxes.\nNote: This option only works when debug assertions are enabled." },

                // Beta
                { type: "checkbox", id: "optSaveSkillUpgrades",   label: "Save Skill Upgrades",     column: 0, row: 0, section: "beta", tooltip: "Add the ability save and load up to 10 sets of skill upgrades." }, // [sic], misspelling exists in arras.io too
                { type: "checkbox", id: "optPlayerListPreview",   label: "Player List",             column: 1, row: 0, section: "beta", placeholder: true, tooltip: "[WIP] Display a list of players you have recently interacted with\nNote: Players reports are not yet fully implemented." }, // [sic], same reason as above

                // Legacy
                { type: "checkbox", id: "opt3DMode",                label: "3D Mode",                  column: 0, row: 0, section: "legacy", placeholder: true, tooltip: `[WIP] Make arras.io 3D.\nMay lower the frame rate.${legacyOptionNotice}` },
                { type: "checkbox", id: "optLegacyThemes",          label: "Legacy Themes",            column: 1, row: 0, section: "legacy", tooltip: `Display legacy themes in the options menu.${legacyOptionNotice}` },
                { type: "checkbox", id: "optUncappedFrameRate",     label: "Uncapped Frame Rate",      column: 0, row: 1, section: "legacy", tooltip: "Attempt to render as many frames as possible, regardless of your monitor FPS.\nNote that this option is unlikely to actually improve game performance, and may cause crashes or significant lag on weaker devices." },
                { type: "checkbox", id: "optUnscaledOldSpawnPanel", label: "Unscaled Old Spawn Panel", column: 1, row: 1, section: "legacy", placeholder: true, tooltip: "[WIP] Scale the original spawn panel to look the same regardless of display size." }
            ];

            for (const cb of global.optionsCheckboxes) {
                if (cb.type === "checkbox") {
                    const doc = document.getElementById(cb.id);
                    if (doc) {
                        cb.value = doc.checked, cb.lastValue = cb.value;
                    } else {
                        cb.value = localStorage.getItem(`${cb.id}Checked`) === "true", cb.lastValue = cb.value;
                    }
                }
            }
        }

        const BOX_SIZE = 25;
        const LINE_HEIGHT = 40;

        for (let i = 0; i < global.optionsCheckboxes.length; i++) {
            const cb = global.optionsCheckboxes[i];
            if (isSecretSection(cb.section)) {
                continue;
            }
            let baseY = PANEL_Y + 45;
            if (cb.section === "ui")    {
                baseY = PANEL_Y + 365;
            }
            if (cb.section === "extra") {
                baseY = PANEL_Y + 525;
            }
            if (cb.section === "perf")  {
                baseY = PANEL_Y + 725;
            }

            const baseXLeft  = PANEL_X + 20;
            const baseXRight = PANEL_X + PANEL_WIDTH / 2 + 7.5;

            const x = (cb.column === 0 ? baseXLeft : baseXRight);
            const y = baseY + cb.row * LINE_HEIGHT;
            const hitX = x * clickableRatio;
            const hitY = y * clickableRatio;
            const hitYCalc = hitY - scrollY * clickableRatio;
            if (!cb.tooltipService) {
                global.optionsCheckboxes[i].tooltipService = {
                    text: cb.tooltip,
                    targetAlpha: 0,
                    alpha: Smoothbar(0, 2, 3, 0.06, 0.025, true),
                    x: 0,
                    y: 0
                };
            }
            if (cb.type === "option") {
                cb.tooltipService.x = hitX;
                cb.tooltipService.y = hitY + 33 - scrollY * clickableRatio;
                cb.tooltipService.targetAlpha = 0;
                if (!cb.optionService) {
                    cb.optionService = {
                        opened: false,
                        smoothbar: Smoothbar(0, 2, 3, 0.07, 0.025, true),
                        selected: "",
                        x: x,
                        y: y,
                        hitX: hitX,
                        hitY: hitY,
                        hitYCalc: hitYCalc
                    };
                }
                if (!cb.optionService.selected) {
                    if (cb.order) {
                        const sorted = [];
                        for (const e of cb.order) {
                            for (const o of cb.optionData) {
                                if (o.value === e) {
                                    sorted.push(o);
                                }
                            }
                        }
                        cb.optionData = sorted;
                    }
                    const doc = document.getElementById(cb.id);
                    const fd = cb.optionData.find((o) => o.value === doc.value);
                    if (fd) {
                        cb.optionService.selected = fd.label;
                    }
                }
                cb.optionService.x = x;
                cb.optionService.y = y - scrollY;
                cb.optionService.hitX = hitX;
                cb.optionService.hitY = hitY;
                cb.optionService.hitYCalc = hitYCalc;
                ctx[2].fillStyle = colors.guiwhite;
                drawGuiRect(x, y, cb.width, 25);
                ctx[2].strokeStyle = colors.black;
                ctx[2].lineWidth = 3;
                drawGuiRect(x, y, cb.width, 25, true);
                drawText(cb.optionService.selected, x + 13, y + 17, 11.5, colors.guiwhite, "left", false, 1, 6.5);
                ctx[2].fillStyle = colors.black;
                const arrowW = 5; // Arrow width (horizontal)
                const arrowH = 30 * 0.3; // Arrow height (vertical)
                const arrowBaseX = x + cb.width + 17;
                const arrowCenterX = arrowBaseX - 19;
                const arrowCenterY = y + 18.4;


                const leftX = arrowCenterX - arrowW;
                const tipX = arrowCenterX + arrowW;
                const topY = arrowCenterY - arrowH;
                const botY = arrowCenterY - 2.9;
                ctx[2].beginPath();
                ctx[2].moveTo(leftX - 14, topY);
                ctx[2].lineTo(tipX - 12, arrowCenterY - 9);
                ctx[2].lineTo(leftX - 8, botY);
                ctx[2].closePath();
                ctx[2].fill();
                global.clickables.optionsMenu.toggleBoxes.place(i, hitX, hitYCalc, cb.width * clickableRatio, 25 * clickableRatio);
                global.clickables.optionsMenu.HoverBoxes.place(i, hitX, hitYCalc, cb.width * clickableRatio, 25 * clickableRatio);
            } else if (cb.type === "slidingBar") {
                cb.tooltipService.x = hitX;
                cb.tooltipService.y = hitY + 35 - scrollY * clickableRatio;
                cb.tooltipService.targetAlpha = 0;
                cb.bounds = {x: x, width: 150};
                const listFolder = config[cb.listTarget];
                const rawStrokeValue = listFolder[cb.target] ?? 0;
                const strokeValue = Math.max(cb.maxLowestValue, Math.min(cb.maxValue, rawStrokeValue));
                const renderRange = cb.maxValue - cb.maxLowestValue;
                const strokeRatio = renderRange > 0 ? (strokeValue - cb.maxLowestValue) / renderRange : 0;
                ctx[2].fillStyle = colors.guiwhite;
                drawGuiRect(x, y + 2.5, 150, 20);
                ctx[2].fillStyle = colors.green;
                ctx[2].globalAlpha = 0.7 * fadeOptions;
                drawGuiRect(x, y + 2.5, 150 * strokeRatio, 20);
                ctx[2].globalAlpha = fadeOptions;
                ctx[2].strokeStyle = colors.black;
                ctx[2].lineWidth = 3;
                drawGuiRect(x, y + 2.5, 150, 20, true);

                const knob = x + 137.5 * strokeRatio;
                ctx[2].fillStyle = colors.green;
                drawGuiRect(knob, y, 12.5, 17 + 8);
                ctx[2].strokeStyle = colors.black;
                drawGuiRect(knob, y, 12.5, 17 + 8, true);

                drawText(cb.label, x + 160, y + 18, 13.5, colors.guiwhite, "left", false, 1, 5.5);

                global.clickables.optionsMenu.HoverBoxes.place(i, hitX, hitYCalc + 2.5, 150 + measureText(cb.label, 25 * clickableRatio) * 0.65, 22 * clickableRatio);
                global.clickables.optionsMenu.toggleBoxes.place(i, hitX, hitYCalc + 2.5, 150 * clickableRatio, 22 * clickableRatio);
            } else if (cb.type === "checkbox") {
                const hitSize = BOX_SIZE * clickableRatio;

                cb.tooltipService.x = hitX;
                cb.tooltipService.y = hitY + hitSize + 10 - scrollY * clickableRatio;
                if (fadeOptions > 0.2 && global.clickables.optionsMenu.optionBoxes.check(mpos) === -1) {
                    if (!cb.placeholder) {
                        global.clickables.optionsMenu.toggleBoxes.place(i, hitX, hitYCalc, hitSize, hitSize);
                    }
                    global.clickables.optionsMenu.HoverBoxes.place(i, hitX, hitYCalc, hitSize + (10.5 + measureText(cb.label, BOX_SIZE) * 0.65 + 1) * clickableRatio, hitSize);
                } else {
                    global.clickables.optionsMenu.toggleBoxes.hide();
                    global.clickables.optionsMenu.HoverBoxes.hide();
                }
                const clickHover = global.clickables.optionsMenu.toggleBoxes.check(mpos);
                const hovered = global.clickables.optionsMenu.HoverBoxes.check(mpos);

                if (hovered !== -1) {
                    global.optionsCheckboxes[hovered].tooltipService.targetAlpha = 1;
                } else {
                    global.optionsCheckboxes[i].tooltipService.targetAlpha = 0;
                }

                if (!cb.placeholder && cb.lastValue !== cb.value) {
                    cb.lastValue = cb.value;
                    loadSettings();
                    if (cb.id === "optLowResolution") {
                        resizeEvent();
                    }
                }

                const isOn = !cb.placeholder && ((cb.reverseCheck && !cb.value) || (!cb.reverseCheck && cb.value));
                ctx[2].lineWidth = 3;
                gameDraw.setColor(ctx[2], isOn ? colors.green : colors.guiwhite);
                drawGuiRect(x, y, BOX_SIZE, BOX_SIZE);
                if (!cb.placeholder && clickHover !== -1 && clickHover === i) {
                    gameDraw.setColor(ctx[2], !isOn ? global.clickables.clicked ? colors.guiblack : colors.black : global.clickables.clicked ? colors.black : colors.guiwhite);
                    ctx[2].globalAlpha = global.clickables.clicked ? 0.25 : 0.2;
                    drawGuiRect(x, y, BOX_SIZE, BOX_SIZE);
                    ctx[2].globalAlpha = 1 * fadeOptions;
                }
                gameDraw.setColor(ctx[2], colors.black);
                drawGuiRect(x, y, BOX_SIZE, BOX_SIZE, true);

                if (isOn) {
                    ctx[2].strokeStyle = "#FFFFFF";
                    ctx[2].lineWidth = 3;
                    ctx[2].beginPath();
                    ctx[2].moveTo(x + 5.5, y + BOX_SIZE / 1.8);
                    ctx[2].lineTo(x + BOX_SIZE / 2 - 3, y + BOX_SIZE - 7);
                    ctx[2].lineTo(x + BOX_SIZE - 6, y + 8);
                    ctx[2].stroke();
                }

                drawText(cb.label, x + BOX_SIZE + 10.5, y + BOX_SIZE / 2 + 6, 13.5, colors.guiwhite, "left", false, 1, 5.5);
            }
        }
    }
    ctx[2].restore();

    for (const cb of global.optionsCheckboxes) {
        if (isSecretSection(cb.section)) {
            continue;
        }
        if (cb.type === "option" && cb.optionService) {
            let above = cb.location === "top";
            let height = 0;
            for (const box of cb.optionData) {
                height += 25;
            }
            const bottomPos = cb.optionService.y + 25 + height;
            if (bottomPos > global.screenHeight && cb.location === "auto") {
                above = true;
            }
            if (cb.optionService.opened) {
                cb.optionService.smoothbar.set(height);
                cb.optionService.visible = true;
            } else if (cb.optionService.visible) {
                cb.optionService.smoothbar.set(0);
            }
            if (cb.optionService.visible) {
                const cbp = cb.optionService;
                const heightCalc = cbp.smoothbar.get();
                if (!cbp.opened && heightCalc < 0.5) {
                    cbp.smoothbar.force(0);
                    cbp.visible = false;
                }
                if (above) { // Above
                    let yy = cbp.y - heightCalc;
                    ctx[2].save();
                    ctx[2].beginPath();
                    ctx[2].rect(cbp.x - 3, cbp.y - cb.optionData.length * 25 - 3, cb.width + 6, cb.optionData.length * 25 + 3);
                    ctx[2].clip();
                    for (let i = 0; i < cb.optionData.length; i++) {
                        const box = cb.optionData[i];
                        const hover = global.clickables.optionsMenu.optionBoxes.check(mpos);
                        ctx[2].fillStyle = colors.guiwhite;
                        drawGuiRect(cbp.x, yy, cb.width, 25);
                        if (hover === i) {
                            ctx[2].fillStyle = colors.black;
                            ctx[2].globalAlpha = global.clickables.clicked ? 0.9 : 0.7;
                            drawGuiRect(cbp.x, yy, cb.width, 25);
                            ctx[2].globalAlpha = 1;
                        }
                        ctx[2].strokeStyle = colors.black;
                        ctx[2].lineWidth = 3;
                        drawGuiRect(cbp.x, yy, cb.width, 25, true);
                        drawText(box.label, cbp.x + 13, yy + 17, 11.5, colors.guiwhite, "left", false, 1, 6.5);
                        if (cbp.opened && cbp.canClick) {
                            global.clickables.optionsMenu.optionBoxes.place(i, cbp.x * clickableRatio, yy * clickableRatio, cb.width * clickableRatio, 25 * clickableRatio);
                        } else {
                            global.clickables.optionsMenu.optionBoxes.hide();
                        }
                        yy += 25;
                    }
                    ctx[2].restore();
                    ctx[2].lineWidth = 3;
                    drawGuiRect(cbp.x, cbp.y, cb.width, 0, true);
                } else { // Bottom
                    let yy = cbp.y + 25;
                    ctx[2].save();
                    ctx[2].beginPath();
                    ctx[2].rect(cbp.x, yy, cb.width, heightCalc);
                    ctx[2].clip();
                    for (let i = 0; i < cb.optionData.length; i++) {
                        const box = cb.optionData[i];
                        const hover = global.clickables.optionsMenu.optionBoxes.check(mpos);
                        ctx[2].fillStyle = colors.guiwhite;
                        drawGuiRect(cbp.x, yy, cb.width, 25);
                        if (hover === i) {
                            ctx[2].fillStyle = colors.black;
                            ctx[2].globalAlpha = global.clickables.clicked ? 0.9 : 0.7;
                            drawGuiRect(cbp.x, yy, cb.width, 25);
                            ctx[2].globalAlpha = 1;
                        }
                        ctx[2].strokeStyle = colors.black;
                        ctx[2].lineWidth = 3;
                        drawGuiRect(cbp.x, yy, cb.width, 25, true);
                        drawText(box.label, cbp.x + 13, yy + 17, 11.5, colors.guiwhite, "left", false, 1, 6.5);
                        if (cbp.opened) {
                            global.clickables.optionsMenu.optionBoxes.place(i, cbp.x * clickableRatio, yy * clickableRatio, cb.width * clickableRatio, 25 * clickableRatio);
                        } else {
                            global.clickables.optionsMenu.optionBoxes.hide();
                        }
                        yy += 25;
                    }
                    ctx[2].restore();
                    ctx[2].lineWidth = 3;
                    drawGuiRect(cbp.x, cbp.y + 25, cb.width, heightCalc, true);
                }
            }
        }
        drawToolip(cb);
    }

    ctx[2].save();
    ctx[2].globalAlpha *= fadeTheme;
    ctx[2].translate(0, -scrollY);
    if (fadeTheme > 0.01 && activeTab === 1) {
        // THEME TAB
        drawText("Theme", PANEL_X + PANEL_WIDTH / 2, PANEL_Y + OV_TITLE_TOP, 15.5, colors.guiwhite, "center");
        drawThemeTab(PANEL_X, PANEL_Y, PANEL_WIDTH, clickableRatio);
    } else if (global.themeOverlay) {
        global.themeOverlay.style.display = "none";
        global.themeOverlay._colorHover = -1;
    }
    ctx[2].restore();

    if (fadeTheme > 0.01 && activeTab === 1 && global.themeOverlay) {
        drawToolip(global.themeOverlay);
    }

    ctx[2].save();
    ctx[2].globalAlpha *= fadeKeybinds;
    ctx[2].translate(0, -scrollY);
    if (fadeKeybinds > 0.01 && activeTab === 2) {
        // KEYBINDS TAB
        drawKeybindsTab(PANEL_X, PANEL_Y, PANEL_WIDTH, clickableRatio);
    }
    ctx[2].restore();

    ctx[2].save();
    ctx[2].globalAlpha *= fadeSecret;
    ctx[2].translate(0, -scrollY);
    if (fadeSecret > 0.01 && activeTab === 3 && secretUnlocked) {
        drawSecretTab(PANEL_X, PANEL_Y, PANEL_WIDTH, clickableRatio, fullUnlocked);
    }
    ctx[2].restore();

    // Close button
    const CLOSE_SIZE = 30;
    const closeX = PANEL_X;
    const closeY = PANEL_Y - CLOSE_SIZE - 20;

    global.clickables.optionsMenu.switchButton.place(
        1,
        closeX * clickableRatio,
        closeY * clickableRatio,
        CLOSE_SIZE * clickableRatio,
        CLOSE_SIZE * clickableRatio
    );

    const cstate = global.clickables.optionsMenu.switchButton.check(mpos);
    ctx[2].save();
    ctx[2].globalAlpha = 1;

    gameDraw.setColor(ctx[2], colors.red);
    ctx[2].lineWidth = 3;
    drawGuiRect(closeX, closeY, CLOSE_SIZE, CLOSE_SIZE);
    if (cstate === 1) {
        gameDraw.setColor(ctx[2], global.clickables.clicked ? "#000" : "#fff");
        ctx[2].globalAlpha = 0.25;
        drawGuiRect(closeX, closeY, CLOSE_SIZE, CLOSE_SIZE);
        ctx[2].globalAlpha = 1;
    }
    gameDraw.setColor(ctx[2], colors.black);
    drawGuiRect(closeX, closeY, CLOSE_SIZE, CLOSE_SIZE, true);

    ctx[2].strokeStyle = "#FFFFFF";
    ctx[2].lineWidth = 4;
    ctx[2].beginPath();
    ctx[2].moveTo(closeX + 8, closeY + 8);
    ctx[2].lineTo(closeX + CLOSE_SIZE - 8, closeY + CLOSE_SIZE - 8);
    ctx[2].moveTo(closeX + CLOSE_SIZE - 8, closeY + 8);
    ctx[2].lineTo(closeX + 8, closeY + CLOSE_SIZE - 8);
    ctx[2].stroke();

    ctx[2].restore();

    ctx[2].restore();
}

function runSecondary() {
    const pingAttempt = setInterval(() => {
        if (global.gameUpdate && !global.disconnected) {
            clearInterval(pingAttempt);
            resizeEvent();
            global.socket.ping(Date.now(), socketStuff.clockDiff - socketStuff.serverStart);
        };
    }, 500);
}

const drawConnectingScreen = () => {
    const ratio = util.getScreenRatio();
    scaleScreenRatio(ratio, true);
    clearScreen(colors.white, 1, ctx[2]);
    drawText("Connecting...", global.screenWidth / 2, global.screenHeight / 2, 30, colors.guiwhite, "center");
    drawText(global.message, global.screenWidth / 2, global.screenHeight / 2 + 30, 15, colors.lgreen, "center");
    drawText(global.tips, global.screenWidth / 2, global.screenHeight / 2 + 60, 15, colors.guiwhite, "center");
};

const drawDisconnectedScreen = () => {
    const ratio = util.getScreenRatio();
    scaleScreenRatio(ratio, true);
    clearScreen(gameDraw.mixColors(colors.red, colors.guiblack, 0.3), global.gameStart ? 0.25 : 1, ctx[2]);
    drawText("Disconnected", global.screenWidth / 2, global.screenHeight / 2, 30, colors.guiwhite, "center");
    if (global.message === "") {
        global.message = "The connection closed due to an error.\nTry reloading and clearing your cache, or joining another server.";
    }
    drawText(`${new Date(global.disconnectTimestamp || Date.now()).toISOString()}`, global.screenWidth / 2, global.screenHeight / 2 - 224, 8.125, colors.guiwhite, "center");
    drawText(global.message, global.screenWidth / 2, global.screenHeight / 2 + 30, 15, colors.orange, "center");
    lastPing = 0;
    drawButton(global.screenWidth / 2 - 75, global.screenHeight / 2 + 138, 120, 30, 1, "rect", "Back", 14, false, false, false, true, "exitGame", global.canvas.height / global.screenHeight / global.ratio, {
        index: 0
    });
    let reconnectLabel = "Reconnect";
    if (global.socket.welcomeReceived && !global.died && localStorage.getItem("optAutoReconnectChecked") === "true") {
        const seconds = Math.max(0, Math.ceil((global.disconnectTimestamp + config.game.autoReconnectDelay - Date.now()) / 1000));
        reconnectLabel = `Reconnect (${seconds})`;
    }
    drawButton(global.screenWidth / 2 + 75, global.screenHeight / 2 + 138, 120, 30, 1, "rect", reconnectLabel, 14, false, false, false, true, "reconnect", global.canvas.height / global.screenHeight / global.ratio, {
        index: 0
    });
};

const drawResyncScreen = () => {
    const ratio = util.getScreenRatio();
    scaleScreenRatio(ratio, true);
    clearScreen(gameDraw.mixColors(colors.black, colors.guiblack, 0.3), 0.25, ctx[2]);
    drawText("Out of sync!", global.screenWidth / 2, global.screenHeight / 2 - 10, 30, colors.red, "center");
    drawText("The client is out of sync, please wait until this screen has disappeared.", global.screenWidth / 2, global.screenHeight / 2 + 40, 15, colors.guiwhite, "center");
    drawText("The rendering has paused to prevent interuptions.", global.screenWidth / 2, global.screenHeight / 2 + 90, 15, colors.guiwhite, "center");
};

const drawErrorScreen = () => {
    const ratio = util.getScreenRatio();
    scaleScreenRatio(ratio, true);
    clearScreen(gameDraw.mixColors(colors.black, colors.guiblack, 0.3), 0.25, ctx[2]);
    drawText("Client error detected!", global.screenWidth / 2, global.screenHeight / 2, 30, colors.red, "center");
    drawText("If this is because of an entity, try to move away from it.", global.screenWidth / 2, global.screenHeight / 2 + 30, 15, colors.guiwhite, "center");
    drawText("Check your browser's console logs and report whatever you see to the developers.", global.screenWidth / 2, global.screenHeight / 2 + 60, 15, colors.guiwhite, "center");
};

const animationFrame =
    (!/Chrome\/8[4-6]\.0\.41([4-7][0-9]|8[0-3])\./.test(navigator.userAgent) &&
      window.requestAnimationFrame) ||
    ((a) => setTimeout(() => a(Date.now()), 1e3 / 60));
function isUncappedFrameRateEnabled() {
    const cb = global.optionsCheckboxes?.find((cb) => cb.id === "optUncappedFrameRate");
    if (cb) {
        return Boolean(cb.value);
    }
    return localStorage.getItem("optUncappedFrameRateChecked") === "true";
}
function animloop(tick) {
    if (document.getElementById("gameAreaWrapper").style.display === "none") {
        setTimeout(() => animloop(performance.now()), 200); // Slow down when tab is hidden
        return;
    }
    if (isUncappedFrameRateEnabled()) {
        setTimeout(() => animloop(performance.now()), 0);
    } else {
        animationFrame(animloop);
    }
    if (global.gameStart) {
        // Update fov
        const fovtickMotion = fovlasttick ? tick - fovlasttick : null;
        fovlasttick = tick;
        const renderv = null == fovtickMotion ? 0 : config.graphical.slowerFOV ? 0.98 : 0.99 ** fovtickMotion;
        const renderfov = global.player.animv.get(tick);
        global.player.renderv = global.player.renderv * renderv + renderfov * (1 - renderv);
        // Reset collected rendering info (DEBUG)
        global.renderingInfo.entities = 0;
        global.renderingInfo.turretEntities = 0;
        global.renderingInfo.entitiesWithName = 0;
    }

    // Set the drawing style
    gameDraw.reanimateColors();
    for (const context of ctx) {
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
            if (!global.secondaryLoop) {
                global.secondaryLoop = true, runSecondary();
            }
        }
        global.metrics.lag = global.time - global.player.time;
    }
    if (global.GUIStatus.fullHDMode) {
        ctx[2].translate(0.5, 0.5);
    }

    if (!global.mobile && !global.gamepadMode) {
        calculateTarget();
    }
    fullScreenWidth = global.screenWidth;
    fullScreenHeight = global.screenHeight;
    const force169 = config.graphical.force169AspectRatio;
    const viewHeight = force169 ? Math.min(fullScreenHeight, fullScreenWidth * 9 / 16) : fullScreenHeight;
    const viewWidth = force169 ? viewHeight * 16 / 9 : fullScreenWidth;
    const viewX = (fullScreenWidth - viewWidth) / 2;
    const viewY = (fullScreenHeight - viewHeight) / 2;
    if (force169) {
        ctx[0].globalAlpha = 1;
        ctx[0].fillStyle = colors.grey;
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
    const p = performance.now();
    try {
        try {
            drawGameplay(tick, ratio);
        } finally {
            if (force169) {
                for (const context of [ctx[0], ctx[1]]) {
                    context.restore();
                }
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
        if (isNaN(global.time)) {
            drawResyncScreen();
        }
        if (global.disconnected) {
            drawDisconnectedScreen();
        }
        if (global.dailyTankAd.renderUI) {
            drawAdScreen();
        }
        if (global.GUIStatus.renderIngameOptions) {
            drawOptionsMenu(tick, 20, util.getScreenRatio());
        } else if (global.themeOverlay && global.themeOverlay.style.display !== "none") {
            global.themeOverlay.style.display = "none";
        }
        if (global.GUIStatus.fullHDMode) {
            ctx[2].translate(-0.5, -0.5);
        }

        //oh no we need to throw an error!
    } catch (e) {

        //hold on....
        drawErrorScreen(); // Draw the error screen.
        if (global.GUIStatus.fullHDMode) {
            ctx[2].translate(-0.5, -0.5);
        }

        //okay, NOW throw the error!
        throw e;
    }
    const t = performance.now();
    global.metrics.mspt = t - p;
}
