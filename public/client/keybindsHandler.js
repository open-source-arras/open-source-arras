import { global } from "./global.js";

const keybindsInits = [];
const keybinderHandler = {
    initalize: (control, resetBtn, keybindStorage) => {
        let controls = document.getElementById(control),
            resetButton = document.getElementById(resetBtn),
            selectedElement = null,
            controlsArray = [],
            defaultKeybinds = {},
            keybinds = {};

        function getKeybinds() {
            const kb = localStorage.getItem(keybindStorage);
            keybinds = typeof kb === "string" && kb.startsWith("{") ? JSON.parse(kb) : {};
        }

        function setKeybinds() {
            localStorage.setItem(keybindStorage, JSON.stringify(keybinds));
        }

        function unselectElement() {
            if (window.getSelection) {
                window.getSelection().removeAllRanges();
            }
            selectedElement.element.parentNode.parentNode.classList.remove("editing");
            selectedElement = null;
        }

        function selectElement(element) {
            selectedElement = element;
            selectedElement.element.parentNode.parentNode.classList.add("editing");
            if (selectedElement.code !== -1 && window.getSelection) {
                const selection = window.getSelection();
                selection.removeAllRanges();
                const range = document.createRange();
                range.selectNodeContents(selectedElement.element);
                selection.addRange(range);
            }
        }

        function setKeybind(key, code) {
            selectedElement.element.parentNode.parentNode.classList.remove("editing");
            resetButton.classList.add("active");
            if (code !== selectedElement.code) {
                const otherElement = controlsArray.find((c) => c.code === code);
                if (code !== -1 && otherElement) {
                    otherElement.keyName = selectedElement.keyName;
                    otherElement.element.innerText = selectedElement.keyName;
                    otherElement.code = selectedElement.code;
                    global[otherElement.keyId] = selectedElement.code;
                    keybinds[otherElement.keyId] = [selectedElement.keyName, selectedElement.code];
                }
            }
            selectedElement.keyName = key;
            selectedElement.element.innerText = key;
            selectedElement.code = code;
            global[selectedElement.keyId] = code;
            keybinds[selectedElement.keyId] = [key, code];
            setKeybinds();
        }

        function getElements(kb, storeInDefault) {
            for (const row of controls.rows) {
                for (const cell of row.cells) {
                    const element = cell.querySelector("b[data-key]");
                    if (!element) {
                        continue;
                    }
                    const key = element.dataset.key;
                    if (storeInDefault) {
                        defaultKeybinds[key] = [element.innerText, global[key]];
                    }
                    if (kb[key]) {
                        element.innerText = kb[key][0];
                        global[key] = kb[key][1];
                        resetButton.classList.add("active");
                    }
                    const obj = {
                        element,
                        keyId: key,
                        keyName: element.innerText,
                        code: global[key]
                    };
                    controlsArray.push(obj);
                }
            }
        }
        getKeybinds();
        getElements(keybinds, true);
        document.addEventListener("click", (event) => {
            if (!global.gameStart) {
                if (selectedElement) {
                    unselectElement();
                } else {
                    const element = controlsArray.find(({ element }) => element === event.target);
                    if (element) {
                        selectElement(element);
                    }
                }
            }
        });
        resetButton.addEventListener("click", () => {
            keybinds = {};
            setKeybinds();
            controlsArray = [];
            getElements(defaultKeybinds);
            resetButton.classList.add("spin");
            setTimeout(() => {
                resetButton.classList.remove("active");
                resetButton.classList.remove("spin");
            }, 400);
        });
        keybindsInits.push({triggerKey: (e) => {
            if (!(global.gameStart || e.shiftKey || e.ctrlKey || e.altKey) && selectedElement) {
                if (1 !== e.key.length || 3 === e.location) {
                    if (!("Backspace" !== e.key && "Delete" !== e.key)) {
                        setKeybind("", -1);
                    }
                } else {
                    setKeybind(e.key.toUpperCase(), e.code);
                }
            }
        }});
    },
    triggerKey: (e) => {
        keybindsInits.forEach((o) => o.triggerKey(e));
    }
};

export { keybinderHandler };
