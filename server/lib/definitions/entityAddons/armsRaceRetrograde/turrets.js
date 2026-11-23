const { combineStats, makeTurret } = require("../../facilitators.js");
const g = require("../../gunvals.js");

Class.gatlingAutoTankGun = makeTurret({
    GUNS: [
        {
            POSITION: {
                LENGTH: 16,
                WIDTH: 11,
                ASPECT: 1.3,
                X: 8
            },
            PROPERTIES: {
                SHOOT_SETTINGS: combineStats([g.basic, g.flankGuard, g.machineGun, g.gatlingGun, { speed: 0.7, maxSpeed: 0.7 }]),
                TYPE: "bullet"
            }
        },
        {
            POSITION: {
                LENGTH: 12,
                WIDTH: 11.75,
                ASPECT: -1.4
            }
        }
    ]
}, {canRepel: true, limitFov: true, fov: 3});
