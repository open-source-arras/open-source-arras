import { global } from "./global.js";
import { util } from "./util.js";
import { config } from "./config.js";
import * as socketStuff from "./socketinit.js";
import { AdvancedRecorder } from "./recorder.js";
let { gui } = socketStuff;

class Canvas {
    constructor() {
        this.directionLock = false;
        this.target = global.target;
        this.socket = global.socket;
        this.directions = [];
        this.chatListener = function(id, event) {
            if (!["Enter", "Escape"].includes(event.code)) return;
            this[id].blur();
            this.cv.focus();
            global.showChat = false;
            setTimeout(() => {
                if (!this.chatBox.loadedProperly) this.chatBox.remove(), this.chatInput.remove(), this.chatBox = false;
            }, 50)
            if (!this[id].value) return;
            if (event.code === "Enter") this.socket.talk('M', this[id].value);
            this[id].value = "";
        }

        this.cv = document.getElementById('gameCanvas');
        this.cvb = document.getElementById('gameCanvas-background');
        this.cvg = document.getElementById('gameCanvas-gameplay');
        this.cvu = document.getElementById('gameCanvas-gui');
        this.cv.resize = (width, height) => {
            this.cv.width = this.cvb.width = this.cvg.width = this.cvu.width = this.width = width;
            this.cv.height = this.cvb.height = this.cvg.height = this.cvu.height = this.height = height;
        };
        this.cv.resize(innerWidth, innerHeight);
        this.reverseDirection = false;
        this.inverseMouse = false;
        this.spinLock = false;
        this.mouseMoved = false;
        this.treeScrollSpeed = 0.5;
        this.treeScrollSpeedMultiplier = 1;
        this.initalized = false;
        this.tankTreeProps = {
            searchQuery: '',
            enabled: false,
        }
        global.canvas = this;
    }
    init() {
        global.mobile && optMobile.value == "mobile" || optMobile.value == "mobileWithBigJoysticks" ? ( // Mobile
            this.mobilecv = this.cv,
            this.controlTouch = null,
            this.movementTouch = null,
            this.movementTouchPos = { x: 0, y: 0 },
            this.controlTouchPos = { x: 0, y: 0 },
            this.mobilecv.addEventListener("touchstart", (event) => {if (global.gameStart || global.disconnected) this.touchStart(event)}),
            this.mobilecv.addEventListener("touchmove", (event) => {if (global.gameStart) this.touchMove(event)}),
            this.mobilecv.addEventListener("touchend", (event) => {if (global.gameStart) this.touchEnd(event)}),
            this.mobilecv.addEventListener("touchcancel", (event) => {if (global.gameStart) this.touchEnd(event)})
        ) : ( // PC
            this.cv.addEventListener("mousemove", (event) => {if (global.gameStart || global.disconnected) this.mouseMove(event)}),
            this.cv.addEventListener("mousedown", (event) => {if (global.gameStart || global.disconnected) this.mouseDown(event)}),
            this.cv.addEventListener("mouseup", (event) => {if (global.gameStart || global.disconnected) this.mouseUp(event)}),
            this.cv.addEventListener("keypress", (event) => {if (global.gameStart) this.keyPress(event)}),
            this.cv.addEventListener("wheel", (event) => {if (global.gameStart) this.wheel(event)})
        );
        this.cv.addEventListener("keydown", (event) => {if (global.gameStart) this.keyDown(event)});
        this.cv.addEventListener("keyup", (event) => {if (global.gameStart) this.keyUp(event)});
        window.addEventListener("gamepadconnected", (e) => {
            global.createMessage("Controller detected! Initalizing Gamepad mode...");
            this.runGamepad();
        });
        window.addEventListener("gamepaddisconnected", (e) => {
            global.createMessage("Controller disconnected! Gamepad mode terminated.");
            this.stopGamepad();
        });
        this.initalized = true;
    }

    wheel(event) {
        if (!global.died && global.showTree) {
            if (event.deltaY > 1) {
                global.targetTreeScale = Math.max(global.targetTreeScale / 1.2, 0.5);
            } else {
                global.targetTreeScale = Math.min(global.targetTreeScale * 1.2, 8);
            }
        }
    }
    keyPress(event) {
        switch (event.code) {
            case "Minus":
                if (!global.died && global.showTree) global.targetTreeScale = Math.max(global.targetTreeScale / 1.2, 0.5);
                break;
            case "Equal":
                if (!global.died && global.showTree) global.targetTreeScale = Math.min(global.targetTreeScale * 1.2, 8);
                break;
        }
    }
    spawnChatInput() {
        if (!this.chatBox) {
            this.chatBox = document.createElement("div");
            this.chatBox.id = "chatBox";
            this.chatBox.style.zIndex = 10;
            document.getElementById("gameAreaWrapper").appendChild(this.chatBox);
            // Input
            this.chatInput = document.createElement("input");
            this.chatInput.id = "chatInput";
            this.chatInput.style.zIndex = 11;
            this.chatInput.addEventListener('keydown', event => this.chatListener("chatInput", event));
            document.getElementById("gameAreaWrapper").appendChild(this.chatInput);
        }
        this.chatInput.focus();
        global.showChat = true;
    }

    respawn() {
        if (global.died && !global.cannotRespawn) {
            this.socket.talk('s', global.playerName, 0, 1 * config.game.autoLevelUp, false, 1 * config.game.incognitoMode);
            global.died = false;
        }
    }

    keyDown(event) {
        if (global.dailyTankAd.renderUI) return;
        if (global.specialPressed) {
            event.preventDefault();
            let pressed = false;
            let attributed = false;
            let attributeKey = false;
            for (let i = 0; i < global.KEY_ABILITIES.length; i++) {
                let obj = global.KEY_ABILITIES[i];
                if (global.specialKeysPressed.length && global.specialKeysPressed[0] === obj) attributed = obj;
            }
            if (!event.repeat) {
                for (let obj in global) {
                    let wrongKey = false;
                    const thing = global[obj];
                    if (typeof thing === "string") {
                        if (attributed) {
                            if (!pressed && (obj === "KEY_SPECIAL_HELP" || obj === "KEY_SPECIAL_HELP_ALT" || obj.startsWith(attributed)) && thing === event.code) {
                                global.specialKeysPressed.push(obj);
                                pressed = true;
                            }
                        } else if (!pressed && obj.startsWith("KEY_SPECIAL_") && thing === event.code) {
                            for (let i = 0; i < global.KEY_ABILITIES.length; i++) {
                                let obj2 = global.KEY_ABILITIES[i];
                                if (obj.startsWith(obj2)) {
                                    if (obj !== obj2) wrongKey = true;
                                }
                            }
                            if (!wrongKey) {
                                global.specialKeysPressed.push(obj);
                                pressed = true; // Dont allow any other keys
                            }
                        }
                    }
                }
            }
            this.socket.talk("#", ...global.specialKeysPressed);
            return;
        }

        // Handle search input when tree is open and search bar is active
        if (global.showTree && global.searchBarActive) {
            if (event.key.length === 1 && !event.ctrlKey && !event.altKey && !event.metaKey) {
                event.preventDefault();
                this.tankTreeProps.searchQuery += event.key;
                global.searchTankByName(this.tankTreeProps.searchQuery);
                return;
            } else if (event.code === "Backspace") {
                event.preventDefault();
                this.tankTreeProps.searchQuery = this.tankTreeProps.searchQuery.slice(0, -1);
                global.searchTankByName(this.tankTreeProps.searchQuery);
                return;
            } else if (event.code === "Escape") {
                event.preventDefault();
                this.tankTreeProps.searchQuery = '';
                global.searchTankByName('');
                global.searchBarActive = false;
                return;
            } else if (event.code === "Enter") {
                event.preventDefault();
                global.searchBarActive = false;
                return;
            }
        }

        switch (event.code) {
            case "ShiftLeft":
            case "ShiftRight":
                if (global.showTree) this.treeScrollSpeedMultiplier = 5;
                else this.socket.cmd.set(6, true);
                break;

            case "Enter":
                // Enter to respawn
                if (global.died && !global.cannotRespawn) {
                    this.respawn();
                    global.died = false;
                    break;
                }

                // or to talk instead
                if (global.gameStart && !global.died && !global.disconnected) {
                    this.spawnChatInput();
                    break;
                }
                break;

            case "ArrowUp":
                if (!global.died && global.showTree) return (global.classTreeDrag.isDragging = true, global.classTreeDrag.momentum.y = -this.treeScrollSpeed * this.treeScrollSpeedMultiplier);
            case global.KEY_UP:
                this.socket.cmd.set(0, true);
                break;
            case "ArrowDown":
                if (!global.died && global.showTree) return (global.classTreeDrag.isDragging = true, global.classTreeDrag.momentum.y = +this.treeScrollSpeed * this.treeScrollSpeedMultiplier);
            case global.KEY_DOWN:
                this.socket.cmd.set(1, true);
                break;
            case "ArrowLeft":
                if (!global.died && global.showTree) return (global.classTreeDrag.isDragging = true, global.classTreeDrag.momentum.x = -this.treeScrollSpeed * this.treeScrollSpeedMultiplier);
            case global.KEY_LEFT:
                this.socket.cmd.set(2, true);
                break;
            case "ArrowRight":
                if (!global.died && global.showTree) return (global.classTreeDrag.isDragging = true, global.classTreeDrag.momentum.x = +this.treeScrollSpeed * this.treeScrollSpeedMultiplier);
            case global.KEY_RIGHT:
                this.socket.cmd.set(3, true);
                break;
            case global.KEY_MOUSE_0:
                this.socket.cmd.set(4, true);
                break;
            case global.KEY_MOUSE_1:
                this.socket.cmd.set(5, true);
                break;
            case global.KEY_MOUSE_2:
                this.socket.cmd.set(6, true);
                break;
            case global.KEY_LEVEL_UP:
                this.socket.talk('L');
                break;
            case global.KEY_ABILITY:
                this.socket.talk('H');
                break;
            case global.KEY_SKILL_MAX:
                global.statMaxing = true;
                break;
            case global.KEY_SUICIDE:
                this.socket.talk('1');
                break;
        }
        if (!event.repeat) {
            switch (event.code) {
                case global.KEY_SPECIAL:
                    this.socket.talk("#");
                    global.specialPressed = true;
                    global.specialKeysPressed = [];
                    break;
                case global.KEY_AUTO_SPIN:
                    global.autoSpin = !global.autoSpin;
                    this.socket.talk("t", 0, true);
                    break;
                case global.KEY_AUTO_FIRE:
                    this.socket.talk("t", 1, true);
                    break;
                case global.KEY_OVERRIDE:
                    this.socket.talk("t", 2, true);
                    break;
                case global.KEY_AUTO_ALT:
                    this.socket.talk("t", 3, true);
                    break;
                case global.KEY_SPIN_LOCK:
                    this.spinLock = !this.spinLock;
                    global.createMessage(this.spinLock ? "Spinlock enabled." : "Spinlock disabled.");
                    break;
                case global.KEY_REVERSE_MOUSE:
                    this.inverseMouse = !this.inverseMouse;
                    global.createMessage(this.inverseMouse ? "Reverse mouse enabled." : "Reverse mouse disabled.");
                    break;
                case global.KEY_REVERSE_TANK:
                    this.reverseDirection = !this.reverseDirection;
                    global.createMessage(this.reverseDirection ? "Reverse tank enabled." : "Reverse tank disabled.");
                    break;
                case global.KEY_PING:
                    global.showDebug = !global.showDebug;
                    break;
                case global.KEY_CLASS_TREE:
                    this.tankTreeProps.enabled = !this.tankTreeProps.enabled;
                    global.tankTree(this.tankTreeProps.enabled ? "open" : "exit");
                    break;
                case global.KEY_RECORD:
                    this.record();
                    break;
                case global.KEY_SCREENSHOT:
                    this.screenshot();
                    break;
            }
            if (global.canSkill) {
                let skill = [
                    global.KEY_SKILL_1,
                    global.KEY_SKILL_2,
                    global.KEY_SKILL_3,
                    global.KEY_SKILL_4,
                    global.KEY_SKILL_5,
                    global.KEY_SKILL_6,
                    global.KEY_SKILL_7,
                    global.KEY_SKILL_8,
                    global.KEY_SKILL_9,
                    global.KEY_SKILL_10
                ].indexOf(event.code);
                if (skill >= 0) this.socket.talk('x', skill, 1 * global.statMaxing);
            }
            const upgradeMap = {
                [global.KEY_UPGRADE_1]: 0,
                [global.KEY_UPGRADE_2]: 1,
                [global.KEY_UPGRADE_3]: 2,
                [global.KEY_UPGRADE_4]: 3,
                [global.KEY_UPGRADE_5]: 4,
                [global.KEY_UPGRADE_6]: 5,
                [global.KEY_UPGRADE_7]: 6,
                [global.KEY_UPGRADE_8]: 7,
                [global.KEY_UPGRADE_9]: 8
            }
            if (global.canUpgrade) {
                const i = upgradeMap[event.code];
                if (i !== undefined) this.socket.talk('U', i, parseInt(gui.upgrades[i][0]));
            }
        }
    }
    keyUp(event) {
        if (global.dailyTankAd.renderUI) return;
        switch (event.code) {
            case global.KEY_SPECIAL:
                global.specialPressed = false;
                global.specialKeysPressed = [];
                break;
            case "ShiftLeft":
            case "ShiftRight":
                if (global.showTree) this.treeScrollSpeedMultiplier = 1;
                else this.socket.cmd.set(6, false);
                break;
            case "ArrowUp":
                global.classTreeDrag.momentum.y = 0;
                global.classTreeDrag.isDragging = false;
            case global.KEY_UP:
                this.socket.cmd.set(0, false);
                break;
            case "ArrowDown":
                global.classTreeDrag.momentum.y = 0;
                global.classTreeDrag.isDragging = false;
            case global.KEY_DOWN:
                this.socket.cmd.set(1, false);
                break;
            case "ArrowLeft":
                global.classTreeDrag.momentum.x = 0;
                global.classTreeDrag.isDragging = false;
            case global.KEY_LEFT:
                this.socket.cmd.set(2, false);
                break;
            case "ArrowRight":
                global.classTreeDrag.momentum.x = 0;
                global.classTreeDrag.isDragging = false;
            case global.KEY_RIGHT:
                this.socket.cmd.set(3, false);
                break;
            case global.KEY_MOUSE_0:
                this.socket.cmd.set(4, false);
                break;
            case global.KEY_MOUSE_1:
                this.socket.cmd.set(5, false);
                break;
            case global.KEY_MOUSE_2:
                this.socket.cmd.set(6, false);
                break;
            case global.KEY_SKILL_MAX:
                global.statMaxing = false;
                break;
        }
        if (global.specialPressed) {
            let arrayCopy = global.specialKeysPressed.slice();
            let code = null;
            let pressed = false;
            let attributed = false;
            for (let i = 0; i < global.KEY_ABILITIES.length; i++) {
                let obj = global.KEY_ABILITIES[i];
                if (global.specialKeysPressed.length && global.specialKeysPressed[0] === obj) {
                    attributed = obj;
                }
            }
            for (let obj in global) {
                let wrongKey = false;
                const thing = global[obj];
                if (typeof thing === "string") {
                    if (attributed) {
                        if (!pressed && (obj === "KEY_SPECIAL_HELP" || obj === "KEY_SPECIAL_HELP_ALT" || obj.startsWith(attributed)) && thing === event.code) {
                            code = obj;
                            pressed = true;
                        }
                    } else if (!pressed && obj.startsWith("KEY_SPECIAL_") && thing === event.code) {
                        for (let i = 0; i < global.KEY_ABILITIES.length; i++) {
                            let obj2 = global.KEY_ABILITIES[i];
                            if (obj.startsWith(obj2)) wrongKey = true;
                        }
                        if (!wrongKey) {
                            code = obj;
                            pressed = true;
                        }
                    }
                }
            }
            let i = global.specialKeysPressed.indexOf(code);
            if (i >= 0) {
                global.specialKeysPressed.splice(i, 1);
                arrayCopy[i] = `-${code}`;
            }
            else arrayCopy.push(`-${code}`);
            this.socket.talk("#", ...arrayCopy);
        }
    }
    mouseDown(mouse) {
        let primaryFire = 4,
            secondaryFire = 6;
        if (this.inverseMouse) [primaryFire, secondaryFire] = [secondaryFire, primaryFire];
        global.clickables.clicked = true;
        switch (mouse.button) {
            case 0:
                let mpos = {
                    x: mouse.clientX * global.ratio,
                    y: mouse.clientY * global.ratio,
                };
                if (global.showTree) {
                    // Start dragging if not clicking UI elements
                    global.classTreeDrag.isDragging = true;
                    global.classTreeDrag.startX = global.classTreeDrag.lastX = mouse.clientX;
                    global.classTreeDrag.startY = global.classTreeDrag.lastY = mouse.clientY;
                    global.classTreeDrag.momentum = { x: 0, y: 0 };
                    break;
                }
                let statIndex = global.clickables.stat.check(mpos);
                let upgradeCheck = global.clickables.upgrade.check(mpos);
                let optionsMenu_toggleBox = global.clickables.optionsMenu.toggleBoxes.check(mpos);
                if (optionsMenu_toggleBox !== -1) {
                    let box = global.optionsCheckboxes[optionsMenu_toggleBox];
                    if (box.type === "slidingBar") {
                        box.trigger?.(mpos, box);
                        global.optionsMenu_Anim.sliderMoving = box;
                    } else if (box.type === "option") {
                        if (global.optionsMenu_Anim.currentOptionMenu && global.optionsMenu_Anim.currentOptionMenu !== box) {
                            global.optionsMenu_Anim.currentOptionMenu.optionService.opened = false;
                            global.optionsMenu_Anim.currentOptionMenu.optionService.canClick = false;
                            global.optionsMenu_Anim.currentOptionMenu = false;
                        }
                        box.optionService.opened = !box.optionService.opened;
                        if (box.optionService.opened) global.optionsMenu_Anim.currentOptionMenu = box, box.optionService.canClick = false;
                    }
                    break;
                }
                if (global.optionsCheckboxes) {
                    for (let box of global.optionsCheckboxes) {
                        if (box.type === "option" && box.optionService.opened && global.optionsCheckboxes[optionsMenu_toggleBox] !== box && global.clickables.optionsMenu.optionBoxes.check(mpos) === -1) {
                            box.optionService.opened = false;
                            global.optionsMenu_Anim.currentOptionMenu.optionService.canClick = false;
                            global.optionsMenu_Anim.currentOptionMenu = false;
                        }
                    }
                }
                if (statIndex !== -1) {
                    this.socket.talk('x', statIndex, 0);
                } else if (
                    !global.dailyTankAd.renderUI &&
                    global.clickables.optionsMenu.toggleBoxes.check(mpos) == -1 && 
                    global.clickables.optionsMenu.switchButton.check(mpos) == -1 &&
                    global.optionsMenu_Anim.tabClickables.check(mpos) == -1 &&
                    global.clickables.skipUpgrades.check(mpos) == -1 && 
                    global.clickables.dailyTankUpgrade.check(mpos) == false &&
                    global.clickables.dailyTankAd.check(mpos) === false &&
                    global.clickables.optionsMenu.mainMenuIdle.check(mpos) === false &&
                    upgradeCheck == -1 && 
                    !global.died
                ) this.socket.cmd.set(primaryFire, true);
                break;
            case 1:
                this.socket.cmd.set(5, true);
                break;
            case 2:
                this.socket.cmd.set(secondaryFire, true);
                break;
        }
    }
   mouseUp(mouse) {
        let primaryFire = 4,
            secondaryFire = 6;
        if (this.inverseMouse) [primaryFire, secondaryFire] = [secondaryFire, primaryFire];
        global.clickables.clicked = false;
        switch (mouse.button) {
            case 0:
                global.optionsMenu_Anim.sliderMoving = false;
                if (global.optionsMenu_Anim.currentOptionMenu) {
                    global.optionsMenu_Anim.currentOptionMenu.optionService.canClickSwitch = true;
                };
                let mpos = {
                    x: mouse.clientX * global.ratio,
                    y: mouse.clientY * global.ratio,
                };
                let upgradeIndex = global.clickables.upgrade.check(mpos);
                let dailyTankUpgrade = global.clickables.dailyTankUpgrade.check(mpos);
                let dailyTankAd = global.clickables.dailyTankAd.check(mpos);
                let dailyTankCloseAd = global.clickables.dailyTankCloseAd.check(mpos);
                let respawnCheck = global.clickables.deathRespawn.check(mpos);
                let exitGame = global.clickables.exitGame.check(mpos);
                let reconnectCheck = global.clickables.reconnect.check(mpos);
                let optionsMenu_Switch = global.clickables.optionsMenu.switchButton.check(mpos);
                let optionsMenu_toggleBox = global.clickables.optionsMenu.toggleBoxes.check(mpos);
                let optionsMenu_clickOption = global.clickables.optionsMenu.optionBoxes.check(mpos);
                let optionsMenu_tabClick = global.optionsMenu_Anim.tabClickables ? global.optionsMenu_Anim.tabClickables.check(mpos) : -1;
                // Options menu clickables
                if (optionsMenu_Switch === 0) {
                    global.optionsMenu_Anim.switchMenu_button.set(-40);
                    global.optionsMenu_Anim.mainMenu.set(25);
                    global.optionsMenu_Anim.isOpened = true;
                    break;
                }
                if (optionsMenu_Switch === 1) {
                    global.optionsMenu_Anim.switchMenu_button.set(0);
                    global.optionsMenu_Anim.mainMenu.set(-500);
                    global.optionsMenu_Anim.isOpened = false;
                    if (global.optionsMenu_Anim.scrollTargets) global.optionsMenu_Anim.scrollTargets = [0, 0, 0];
                    if (global.optionsMenu_Anim._wheelHandler) {
                        window.removeEventListener("wheel", global.optionsMenu_Anim._wheelHandler);
                        global.optionsMenu_Anim._wheelHandler = undefined;
                    }
                    break;
                }
                if (optionsMenu_tabClick !== -1) {
                    global.optionsMenu_Anim.activeTab = optionsMenu_tabClick;
                    global.optionsMenu_Anim.tabOffset.set(optionsMenu_tabClick);
                    global.optionsMenu_Anim.mainMenuHeight.set(global.optionsMenu_Anim.tabs[optionsMenu_tabClick][1]);
                    if (global.optionsMenu_Anim.scrollTargets) global.optionsMenu_Anim.scrollTargets[optionsMenu_tabClick] = 0;
                    break;
                }
                if (optionsMenu_toggleBox !== -1) {
                    let box = global.optionsCheckboxes[optionsMenu_toggleBox];
                    if (box.type === "checkbox") {
                        let doc = document.getElementById(box.id);
                        box.value = !box.value;
                        if (doc) doc.checked = box.value;
                        if (doc) util.submitToLocalStorage(box.id);
                    }
                    break;
                }
                if (optionsMenu_clickOption !== -1 && global.optionsMenu_Anim.currentOptionMenu) {
                    global.optionsMenu_Anim.currentOptionMenu.trigger?.(global.optionsMenu_Anim.currentOptionMenu, global.optionsMenu_Anim.currentOptionMenu.optionData[optionsMenu_clickOption]);
                    break;
                }
                // Stop dragging class tree
                if (global.classTreeDrag.isDragging) {
                    global.classTreeDrag.isDragging = false;
                }
                if (global.clickables.classTreeClose.check(mpos) === 0) {
                    global.tankTree("exit");
                    break;
                }
                
                // Check zoom buttons
                if (global.clickables.classTreeZoomIn.check(mpos) === 0) {
                    global.targetTreeScale = Math.min(global.targetTreeScale * 1.2, 8);
                    break;
                }
                if (global.clickables.classTreeZoomOut.check(mpos) === 1) {
                    global.targetTreeScale = Math.max(global.targetTreeScale / 1.2, 0.5);
                    break;
                }
                
                // Check search bar click
                const searchBarWidth = 300;
                const searchBarHeight = 35;
                const searchBarX = global.screenWidth / 2 / global.ratio - searchBarWidth / 2;
                const searchBarY = 30;
                
                if (mpos.x / global.ratio >= searchBarX && 
                    mpos.x / global.ratio <= searchBarX + searchBarWidth &&
                    mpos.y / global.ratio >= searchBarY && 
                    mpos.y / global.ratio <= searchBarY + searchBarHeight) {
                    global.searchBarActive = true;
                    break;
                } else {
                    global.searchBarActive = false;
                }
                if (respawnCheck !== -1 && !global.disconnected) {
                    this.respawn();
                } else
                if (reconnectCheck !== -1) {
                    if (global.disconnected) global.reconnect();
                } else
                if (exitGame !== -1) {
                    if (global.disconnected || (global.died && !global.cannotRespawn)) global.exit();
                } else 
                if (upgradeIndex !== -1 && upgradeIndex < gui.upgrades.length && !global.dailyTankAd.renderUI) this.socket.talk('U', upgradeIndex, parseInt(gui.upgrades[upgradeIndex][0]));
                else if (dailyTankUpgrade == true && !global.dailyTankAd.renderUI) {
                    this.socket.talk('U', JSON.stringify([{isDailyUpgrade: true, tank: gui.dailyTank.tank}]), "null");
                } else if (dailyTankAd == true) {
                    this.socket.talk("DTA"); // Request to get an ad
                } else if (dailyTankCloseAd == true && global.dailyTankAd.renderUI) {
                    this.socket.talk("DTAD");
                } else if (global.clickables.skipUpgrades.check(mpos) !== -1) {
                    global.clearUpgrades();
                } else this.socket.cmd.set(primaryFire, false);
                break;
            case 1:
                this.socket.cmd.set(5, false);
                break;
            case 2:
                this.socket.cmd.set(secondaryFire, false);
                break;
        }
    }
    mouseMove(mouse) {
        // Handle class tree dragging with smooth momentum
        if (global.showTree && global.classTreeDrag.isDragging) {
            const dx = (mouse.clientX - global.classTreeDrag.lastX) / global.treeScale;
            const dy = (mouse.clientY - global.classTreeDrag.lastY) / global.treeScale;
            
            // Smooth momentum update
            global.classTreeDrag.momentum.x = -dx * 0.01;
            global.classTreeDrag.momentum.y = -dy * 0.01;

            global.classTreeDrag.lastX = mouse.clientX;
            global.classTreeDrag.lastY = mouse.clientY;
            return;
        }
        global.statHover =
            global.clickables.hover.check({
                x: mouse.clientX * global.ratio,
                y: mouse.clientY * global.ratio,
            }) === 0;
        if (this.spinLock) return;
        global.mouse.x = mouse.clientX * global.ratio;
        global.mouse.y = mouse.clientY * global.ratio;
        if (global.optionsMenu_Anim.sliderMoving) {
            global.optionsMenu_Anim.sliderMoving.trigger({}, global.optionsMenu_Anim.sliderMoving);
        }
        if (global.optionsMenu_Anim.currentOptionMenu && global.optionsMenu_Anim.currentOptionMenu.optionService.canClickSwitch) {
            global.optionsMenu_Anim.currentOptionMenu.optionService.canClick = true;
            global.optionsMenu_Anim.currentOptionMenu.optionService.canClickSwitch = false;
        };
        if (global.gameStart) {
            this.mouseMoved = true;
            global.socket.cmd.reactNow();
        }
    }
    record() {
        let AdvancedCanvasCapturer = () => {
            let canvas = this.cvb.cloneNode();
            let ctx = canvas.getContext("2d");
            let toMerge = [];
            let stop = false;
            return {
                init: () => {
                    let glCanvas = global.glCanvas || null;
                    // Merge all layers, including WebGL2 if present
                    toMerge = glCanvas
                    ? [this.cvb, glCanvas, this.cvg, this.cvu]
                    : [this.cvb, this.cvg, this.cvu];
                    ctx.canvas.width = this.cv.width;
                    ctx.canvas.height = this.cv.height;
                },
                start: () => {
                    stop = false; // Reset flag
                    ctx.canvas.width = this.cv.width; // Set Width
                    ctx.canvas.height = this.cv.height; // Set Height
                    const anim = () => {
                        if (stop) return;
                        if (ctx.canvas.width !== this.cv.width || ctx.canvas.height !== this.cv.height) {
                            global.createMessage("Recorder stopped due to resize change. Saving file...", 5_000);
                            this.videoRecorder.stop();
                            this.videoRecorderCanvas.stop();
                            setTimeout(() => this.videoRecorder.download(), 200);
                        }
                        ctx.fillRect(0, 0, this.cv.width, this.cv.height);
                        toMerge.forEach(layer => {
                            if (layer) ctx.drawImage(layer, 0, 0);
                        });
                        requestAnimationFrame(anim);
                    };
                    anim();
                },
                stop: () => { stop = true; },
                getCanvas: () => canvas
            }
        }
        if (this.cv.captureStream && window.MediaRecorder) {
            if (this.videoRecorder) {
                switch (this.videoRecorder.state) {
                    case "inactive":
                        global.createMessage("Recorder Started!", 2_000);
                        this.videoRecorderCanvas.start();
                        this.videoRecorder.start();
                        break;
                    case "recording":
                        global.createMessage("Recorder Stopped! Saving file...", 5_000);
                        this.videoRecorder.stop();
                        this.videoRecorderCanvas.stop();
                        setTimeout(() => this.videoRecorder.download(), 200);
                }
            } else {
                this.videoRecorderCanvas = AdvancedCanvasCapturer();
                this.videoRecorderCanvas.init();
                this.videoRecorderCanvas.start();
                this.videoRecorder = new AdvancedRecorder(this.videoRecorderCanvas.getCanvas(), 60);
                global.createMessage("Recorder Started!", 2_000);
                this.videoRecorder.start();
            }
        }
    }
    screenshot() {
        let AdvancedCanvasCapturer = () => {
            let canvas = this.cvb.cloneNode();
            let ctx = canvas.getContext("2d");
            let toMerge = [];
            return {
                init: () => {
                    let glCanvas = global.glCanvas || null;
                    // Merge all layers, including WebGL2 if present
                    toMerge = glCanvas
                    ? [this.cvb, glCanvas, this.cvg, this.cvu]
                    : [this.cvb, this.cvg, this.cvu];
                    ctx.canvas.width = this.cv.width;
                    ctx.canvas.height = this.cv.height;
                },
                capture: () => {
                    ctx.canvas.width = this.cv.width; // Set Width
                    ctx.canvas.height = this.cv.height; // Set Height
                    ctx.fillStyle = "#ffffff"
                    ctx.fillRect(0, 0, this.cv.width, this.cv.height);
                    toMerge.forEach(layer => {
                        if (layer) ctx.drawImage(layer, 0, 0);
                    });
                    
                },
                getCanvas: () => canvas
            }
        }
        if (this.screenshotCanvas) {
            this.screenshotCanvas.capture();
        } else {
            this.screenshotCanvas = AdvancedCanvasCapturer();
            this.screenshotCanvas.init();
            this.screenshotCanvas.capture();
        }
        let cv = this.screenshotCanvas.getCanvas();
        var x = cv.toDataURL(),
            k = atob(x.split(",")[1]);
        x = x.split(",")[0].split(":")[1].split(";")[0];
        let p = new Uint8Array(k.length);
        for (let a = 0; a < k.length; a++) p[a] = k.charCodeAt(a);
        let q = URL.createObjectURL(new Blob([p], {type: x})),
        w = document.createElement("a");
        w.style.display = "none";
        w.setAttribute("download", "osa-screenshot.png");
        w.setAttribute("href", q);
        document.body.appendChild(w);
        setTimeout(() => {
            URL.revokeObjectURL(q);
            document.body.removeChild(w);
        }, 100);
        w.click();
        global.createMessage("Saving screenshot...", 3_000);
    }

    // Touchscreen Controls
    touchStart(e) {
        e.preventDefault();
        if (global.died && !global.cannotRespawn) {
            this.respawn();
            global.resetTarget();
        } else {
            for (let touch of e.changedTouches) {
                let mpos = {
                    x: touch.clientX * global.ratio,
                    y: touch.clientY * global.ratio,
                };
                let id = touch.identifier;
                let buttonIndex = global.clickables.mobileButtons.check(mpos);
                if (buttonIndex !== -1) {
                    switch (buttonIndex) {
                        case 0:
                            global.clickables.mobileButtons.active = !global.clickables.mobileButtons.active;
                            break;
                        case 1:
                            if (global.clickables.mobileButtons.active) {
                                global.clickables.mobileButtons.altFire =
                                    !global.clickables.mobileButtons.altFire;
                                if (!global.clickables.mobileButtons.altFire)
                                    this.socket.cmd.set(6, false);
                            } else if (global.isInverted)
                                (global.isInverted = false), this.socket.cmd.set(6, false);
                            else (global.isInverted = true), this.socket.cmd.set(6, true);
                            break;
                        case 2:
                            if (!document.fullscreenElement) {
                                var d = document.body;
                                d.requestFullscreen
                                    ? d.requestFullscreen()
                                    : d.msRequestFullscreen
                                        ? d.msRequestFullscreen()
                                        : d.mozRequestFullScreen
                                            ? d.mozRequestFullScreen()
                                            : d.webkitRequestFullscreen && d.webkitRequestFullscreen();
                            } else {
                                document.exitFullscreen();
                            }
                            break;
                        case 3:
                            this.socket.talk("t", 1, true);
                            break;
                        case 4:
                            this.reverseDirection = !this.reverseDirection;
                            global.createMessage(this.reverseDirection ? "Reverse tank enabled." : "Reverse tank disabled.");
                            break;
                        case 5:
                            this.socket.talk("1");
                            break;
                        case 6:
                            global.autoSpin = !global.autoSpin;
                            this.socket.talk("t", 0, true);
                            break;
                        case 7:
                            this.socket.talk("t", 2, true);
                            break;
                        case 8:
                            this.socket.talk("L");
                            break;
                        case 9:
                            this.socket.talk("H");
                            break;
                        case 10:
                            this.socket.talk("#", "KEY_SPECIAL_PRESET_2");
                            break;
                        case 11:
                            if (global.gameStart && !global.died && !global.disconnected) {
                                this.spawnChatInput();
                                break;
                            }
                            break;
                        default:
                            throw new Error("Unknown button index.");
                    }
                } else {
                    let statIndex = global.clickables.stat.check(mpos);
                    let exitGame = global.clickables.exitGame.check(mpos);
                    let reconnectCheck = global.clickables.reconnect.check(mpos);
                    if (reconnectCheck !== -1) {
                        if (global.disconnected) global.reconnect();
                    } else if (exitGame !== -1) {
                        if (global.disconnected || global.died) global.exit();
                    } else if (statIndex !== -1) this.socket.talk("x", statIndex, 0);
                    else if (global.clickables.skipUpgrades.check(mpos) !== -1)
                        global.clearUpgrades();
                    else {
                        let upgradeIndex = global.clickables.upgrade.check(mpos);
                        if (upgradeIndex !== -1)
                            this.socket.talk("U", upgradeIndex, parseInt(gui.upgrades[upgradeIndex][0]));
                        else {
                            let onLeft = mpos.x < this.cv.width / 2;
                            if (this.movementTouch === null && onLeft) {
                                this.movementTouch = id;
                            } else if (this.controlTouch === null && !onLeft) {
                                this.controlTouch = id;
                                this.socket.cmd.set(4, true);
                            }
                        }
                    }
                }
            }
            this.touchMove(e);
        }
    }
    touchMove(e) {
        e.preventDefault();
        for (let touch of e.changedTouches) {
            let mpos = {
                x: touch.clientX * global.ratio,
                y: touch.clientY * global.ratio,
            };
            let id = touch.identifier;

            if (this.movementTouch === id) {
                let ratio = global.canvas.height / global.screenHeight / global.ratio;
                let radius = Math.min(
                    global.screenWidth * 0.6,
                    global.screenHeight * 0.12
                );
                let cx = (mpos.x - (this.cv.width * 1) / 6) / ratio / 2;
                let cy = (mpos.y - (this.cv.height * 2) / 3) / ratio / 2;
                let touchX = cx;
                let touchY = cy;
                let r = Math.sqrt(cx ** 2 + cy ** 2);
                let angle = Math.atan2(cy, cx);
                if (r > radius) {
                    touchX = Math.cos(angle) * radius;
                    touchY = Math.sin(angle) * radius;
                }
                this.movementTouchPos = { x: touchX, y: touchY };
                let x = mpos.x - (this.cv.width * 1) / 6;
                let y = mpos.y - (this.cv.height * 2) / 3;
                let norm = Math.sqrt(x * x + y * y);
                x /= norm;
                y /= norm;
                let amount = 0.38268323650898;
                if (y < -amount !== this.movementTop)
                    this.socket.cmd.set(0, (this.movementTop = y < -amount));
                if (y > amount !== this.movementBottom)
                    this.socket.cmd.set(1, (this.movementBottom = y > amount));
                if (x < -amount !== this.movementLeft)
                    this.socket.cmd.set(2, (this.movementLeft = x < -amount));
                if (x > amount !== this.movementRight)
                    this.socket.cmd.set(3, (this.movementRight = x > amount));
            } else if (this.controlTouch === id) {
                global.mobileStatus.showCrosshair = true;
                let ratio = global.canvas.height / global.screenHeight / global.ratio;
                let radius = Math.min(
                    global.mobileStatus.useBigJoysticks ? global.screenWidth * 0.8 : global.screenWidth * 0.6,
                    global.mobileStatus.useBigJoysticks ? global.screenHeight * 0.16 : global.screenHeight * 0.12
                );
                let cx = (mpos.x - (this.cv.width * 5) / 6) / ratio / 2;
                let cy = (mpos.y - (this.cv.height * 2) / 3) / ratio / 2;
                let touchX = cx;
                let touchY = cy;
                let r = Math.sqrt(cx ** 2 + cy ** 2);
                let angle = Math.atan2(cy, cx);
                if (r > radius) {
                    touchX = Math.cos(angle) * radius;
                    touchY = Math.sin(angle) * radius;
                }
                this.controlTouchPos = { x: touchX, y: touchY };
                radius = Math.min(
                    global.screenWidth * 0.12 / ratio,
                    global.screenHeight * 0.24 / ratio
                )
                if (!this.spinLock) {
                    if (cx < -radius) cx = -radius;
                    else if (cx > radius) cx = radius;
                    if (cy < -radius) cy = -radius;
                    else if (cy > radius) cy = radius;
                    this.target.x = ((cx / radius) * global.screenWidth) / 2;
                    this.target.y = ((cy / radius) * global.screenHeight) / 2;
                }
            }
        }
        global.mouse = this.target;
    }
    touchEnd(e) {
        e.preventDefault();
        for (let touch of e.changedTouches) {
            let id = touch.identifier;
      
            if (this.movementTouch === id) {
                this.movementTouch = null;
                this.movementTouchPos = { x: 0, y: 0 };
                if (this.movementTop) this.socket.cmd.set(0, (this.movementTop = false));
                if (this.movementBottom) this.socket.cmd.set(1, (this.movementBottom = false));
                if (this.movementLeft) this.socket.cmd.set(2, (this.movementLeft = false));
                if (this.movementRight) this.socket.cmd.set(3, (this.movementRight = false));
            } else if (this.controlTouch === id) {
                this.controlTouch = null;
                this.controlTouchPos = { x: 0, y: 0 };
                this.socket.cmd.set(4, false);
                global.mobileStatus.showCrosshair = false;
            }
        }
    }

    // Controller Controls
    runGamepad() {
        let sendHelp = () => {
            let helpLines = [
                "Control help menu:",
                "Options button = Help Menu",
                "RT / R2 = Fire",
                "LT / L2 = Alt Fire",
                "Left Joystick: Move Body",
                "Right Joystick: Move Face",
                "A / X = Autofire",
                "B / O = Autospin",
                "X / ■ = Override",
                "Y / ▲ = Take Control",
            ];
            global.createMessage(JSON.stringify(helpLines), 15_000, true);
        }
        let gamepadControls = {
            A: 0,
            B: 0,
            X: 0,
            Y: 0,
            help: 0,
        }
        global.gamepadMode = true;
        global.player.target = this.target;
        this.gamepadInterval = setInterval(() => {
            let gamepads = navigator.getGamepads().find((x) => x !== null)
            if (gamepads) {
                this.gamepad = gamepads;
            } else this.gamepad = undefined;
            if (this.gamepad) {
                let angle = (p) => (p < this.gamepad.axes.length ? this.gamepad.axes[p] : 0);
                let target = this.gamepad.axes.slice(0, 2).map((x) => Math.round(x))
                var h = angle(2);
                angle = angle(3);
                if (0.01 < h * h + angle * angle) {
                    let p = 0.6 * Math.max(global.screenWidth, global.screenHeight);
                    this.target.x = (h * p);
                    this.target.y = (angle * p);
                    global.mobileStatus.showCrosshair = true;
                } else global.mobileStatus.showCrosshair = false;
                /*for (let i = 0; i < this.gamepad.buttons.length; i++) { // If you want to add a button, uncomment this and get the array number.
                    let info = this.gamepad.buttons[i];
                    if (info.pressed) {
                        let debugLine = [
                            "(DEBUG)",
                            `Array number: ${i}`,
                        ];
                        global.createMessage(JSON.stringify(debugLine), 5_000, true);
                    }
                }*/
                // Button presses
                if (this.gamepad.buttons[0].pressed) {
                    gamepadControls.A++
                } else {
                    gamepadControls.A = 0;
                }
                if (this.gamepad.buttons[1].pressed) {
                    gamepadControls.B++
                } else {
                    gamepadControls.B = 0;
                }
                if (this.gamepad.buttons[2].pressed) {
                    gamepadControls.X++
                } else {
                    gamepadControls.X = 0;
                }
                if (this.gamepad.buttons[3].pressed) {
                    gamepadControls.Y++
                } else {
                    gamepadControls.Y = 0;
                }
                if (this.gamepad.buttons[9].pressed) {
                    gamepadControls.help++
                } else {
                    gamepadControls.help = 0;
                }
                if (gamepadControls.A === 1) {
                    this.socket.talk("t", 1, true);
                }
            
                if (gamepadControls.B === 1) {
                    global.autoSpin = !global.autoSpin;
                    this.socket.talk("t", 0, true);
                }
            
                if (gamepadControls.X === 1) {
                    this.socket.talk("t", 2, true);
                }
            
                if (gamepadControls.Y === 1) {
                    this.socket.talk('H');
                }

                if (gamepadControls.help === 1) {
                    sendHelp();
                }
                // Shoot
                if (this.gamepad.buttons[7].pressed) {
                    if (global.died && !global.cannotRespawn) {
                        this.socket.talk('s', global.playerName, 0, 1 * config.game.autoLevelUp);
                        global.died = false;
                    } else {
                        this.socket.cmd.set(4, true);
                    }
                } else {
                    this.socket.cmd.set(4, false);
                }
                // Alt shoot
                if (this.gamepad.buttons[6].pressed) {
                    this.socket.cmd.set(6, true);
                } else {
                    this.socket.cmd.set(6, false);
                }
                // Move body
                let cx = 0;
                let cy = 0;
                let ex = target[0];
                let ey = target[1];
                if (ex > cx) {
                    this.socket.cmd.set(2, false);
                    this.socket.cmd.set(3, true);
                } else if (ex < cx) {
                    this.socket.cmd.set(2, true);
                    this.socket.cmd.set(3, false);
                } else {
                    this.socket.cmd.set(2, false);
                    this.socket.cmd.set(3, false);
                }
                
                if (ey > cy) {
                    this.socket.cmd.set(0, false);
                    this.socket.cmd.set(1, true);
                } else if (ey < cy) {
                    this.socket.cmd.set(0, true);
                    this.socket.cmd.set(1, false);
                } else {
                    this.socket.cmd.set(0, false);
                    this.socket.cmd.set(1, false);
                }
            }
        }, 10)
        global.createMessage("Gamepad mode initalized and ready to use.");
        sendHelp();
    }
    stopGamepad() {
        clearInterval(this.gamepadInterval);
        this.gamepad = undefined;
        global.gamepadMode = false;
        this.socket.cmd.set(0, false);
        this.socket.cmd.set(1, false);
        this.socket.cmd.set(2, false);
        this.socket.cmd.set(3, false);
        this.socket.cmd.set(4, false);
        this.socket.cmd.set(6, false);
    }
}
export { Canvas }
