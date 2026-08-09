const config = {
    graphical: {
        borderChunk: 6,
        barChunk: 5,
        mininumBorderChunk: 0.5,
        deathBlurAmount: 3,
        slowerFOV: false,
        sharpEdges: false,
        curvyTraps: false,
        darkBorders: false,
        fancyAnimations: true,
        interpolation: false,
        lerpAnimations: false,
        lowResolution: false,
        oldUIStyle: false,
        coloredNest: false,
        colors: 'normal',
        pointy: true,
        showGrid: true,
        hexaGrid: true,
        gridDrawSize: 1,
        fontSizeBoost: 1.4,
        fontStrokeRatio: 4.5,
        neon: false,
        coloredHealthbars: false,
        separatedHealthbars: false,
        shakeProperties: {
            CameraShake: {
                shakeStartTime: -1,
                shakeDuration: -1,
                shakeAmount: -1,
                keepShake: false,
            },
            UIShake: {
                shakeStartTime: -1,
                shakeDuration: -1,
                shakeAmount: -1,
                keepShake: false,
            }
        }
    },
    animationSettings: { value: 1, scale: 1, ScaleBar: 20 },
    lag: {
        unresponsive: false,
        memory: 500,
        offset: +location.hash.match(/^(?:#debug_lag_offset=(\d+))?/)[1] || -50,
    },
    game: {
        autoLevelUp: false,
        centeredMinimap: false,
        incognitoMode: false,
    }
};
export { config }

// globals.
function createMessage(con, dur = 10_000, JSONMessage = false) {
    if (JSONMessage) {
        global.messages.push({
            text: "Nah that aint the text",
            faded: 0,
            textJSON: JSON.parse(con),
            time: Date.now(),
            duration: dur,
        });
    } else {
        global.messages.push({
            text: con,
            faded: 0,
            time: Date.now(),
            duration: dur,
        });
    }
};
function resetTarget() {
    global.player.target.x = 0;
    global.player.target.y = 0;
}
import { global } from "./global.js";
global.tips = [
    [
        "Tip: You can view and edit your keybinds in the options menu.",
        `Tip: You can play on mobile by just going to ${window.location.href.substr(0, window.location.href.indexOf('#'))} on your phone!`
    ],
    [
        "Tip: You can have the shield and health bar be separated by going to the options menu.",
        "Tip: If arras is having a low frame rate, you can try enabling low graphics in the options menu.",
        "Tip: You can make traps rounded with the classic trap setting in the options menu.",
        "Tip: You can create your own private server with the template in the link on the options menu.",
        "Tip: You can create your own theme with the custom theme maker in the link on the options menu."
    ],
    [
        "Teaming in FFA or FFA Maze is frowned upon, but when taken to the extremes, you can be punished.",
        "Witch hunting is when you continuously target someone and follow them. This is frowned upon, but when taken to the extremes, you can be punished.",
        "Multiboxing is when you use a script to control multiple tanks at the same time. This is considered CHEATING and will result in a ban."
    ]
];
global.createMessage = (content, duration, JSONMessageMode) => createMessage(content, duration, JSONMessageMode);
global.resetTarget = () => resetTarget();