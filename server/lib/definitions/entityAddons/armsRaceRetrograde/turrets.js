import { combineStats, makeTurret } from "../../facilitators.js";
import { basic, flankGuard, machineGun, gatlingGun } from "../../gunvals.js";
import { Class } from "../../../../loaders/global.js";

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
                SHOOT_SETTINGS: combineStats([basic, flankGuard, machineGun, gatlingGun, { speed: 0.7, maxSpeed: 0.7 }]),
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
