const { combineStats, makeAuto, weaponArray, weaponMirror } = require('../facilitators.js');
const g = require('../gunvals.js');
const {base, statnames} = require('../constants.js')

Class.frag1bullet = {
    PARENT: "bullet",
    GUNS: [
        {
            POSITION: {
                LENGTH: 8,
                WIDTH: 4,
                DELAY: 5
            },
            PROPERTIES: {
                SHOOT_SETTINGS: combineStats([g.basic, g.gunner]),
                TYPE: 'bullet',
                PERSISTS_AFTER_DEATH: true,
                SHOOT_ON_DEATH: true
            }
        }
    ]
}