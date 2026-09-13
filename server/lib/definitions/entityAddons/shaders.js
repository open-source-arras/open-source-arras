function init() {
    const EnableBulletShaders = true; // enable shaders for bullets, drones, etc.

    const rad = 2.4
    const clr = "black"
    const a = 1
    const r = 2.5

    if (EnableBulletShaders) {
        Class.genericEntity.GLOW = {
            RADIUS: rad,
            COLOR: clr,
            ALPHA: a,
            RECURSION: r
        }
    } else {
        Class.genericTank.GLOW = {
            RADIUS: rad,
            COLOR: clr,
            ALPHA: a,
            RECURSION: r
        }
    }

    Class.auraBase.GLOW = {};
}

// uncomment line below to enable (beefy computer required)
//init();
