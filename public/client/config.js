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
        `Tip: You can play on mobile by just going to ${window.location.host} on your phone!`,

        "Tip: You can have the shield and health bar be separated by going to the options menu.",
        `Tip: If ${window.location.host} is having a low frame rate, you can try reducing your graphics level in the options menu.`,
        //"Tip: You can edit or create your own theme in the options menu.",
        `Tip: If you're new to the game, you can press T to see all of ${window.location.host}'s 100+ classes in the class tree.`,
        "Tip: Tired of being targeted constantly when you're the leader? Try enabling incognito mode in the options menu.",

        "You can sometimes see sneak peeks of content before it's released in our Discord and Reddit community!",
        "Want to connect with other members of the community? Join our public Discord server!"
    ]
];
global.createMessage = (content, duration, JSONMessageMode) => createMessage(content, duration, JSONMessageMode);
global.resetTarget = () => resetTarget();