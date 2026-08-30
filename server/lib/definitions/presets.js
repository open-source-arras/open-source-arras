module.exports = {
	// Tooltips
	tooltip: {
		menu_lag: "WARNING: There are a lot of entities in here and having this menu open may cause noticeable frame drops!"
	},

	// Tanks
	gun: {},
	prop: {},
	turret: {
		driveHat: [
			{
	            TYPE: ['squareHat', {COLOR: 'grey'}],
	            POSITION: {
	                SIZE: 9,
	                LAYER: 1
	            }
	        }
	    ]
	},

	// Regular Functions
	makeAuto: {
		mega: {
			type: 'megaAutoTurret', size: 12
		},
		ultra: {
			type: 'ultraAutoTurret', size: 14
		},
		triple: {
			size: 6.5, x: 5.2, angle: 0, total: 3
		},
		penta: {
			size: 5.2, x: 6.5, angle: 0, total: 5
		},
		hepta: {
			size: 4, x: 6.5, angle: 0, total: 7
		}
	},
	makeDrive: {
		minion: {
			projectileType: 'minion'
		},
		sunchip: {
			projectileType: 'sunchip'
		},
		swarm: {
			projectileType: 'swarm', hatType: 'triangleHat', hatSize: 8, hatAngle: 180
		}
	},
	makeOver: {
		hybrid: {
			count: 1, independent: true, cycle: false
		}
	},

	// On Functions
	on: {
		retrograde_self_destruct: {
			event: 'define',
			handler: ({ body }) => {
				if (Config.retrograde && body.socket && !body.socket.permissions) {
					body.sendMessage("WARNING: This tank will self-destruct in 10 seconds!");
					setTimeout(() => {
						body.destroy();
					}, 10_000)
				}
			}
		}
	}
};
