package wire

import (
	"arrasgo/internal/config"
	"arrasgo/internal/ctrl"
	"arrasgo/internal/define"
	"arrasgo/internal/defs"
	"arrasgo/internal/guns"
	"arrasgo/internal/jsutil"
	"arrasgo/internal/room"
)

// NewDefiner returns a room's definer. Gun and controller tables are per-room.
func NewDefiner(set *defs.Set, tuning *config.Tuning, rng *jsutil.Rand, gamemodes []string) (room.Definer, room.ControllerAttacher, DefinerParts, error) {
	flags, err := PeekGamemodeFlags(tuning, gamemodes)
	if err != nil {
		return nil, nil, DefinerParts{}, err
	}
	gunTable, ctrlTable := guns.NewTable(1024), ctrl.NewTable(1024)
	d, err := define.New(define.Config{
		Defs:        set,
		Guns:        gunTable,
		Ctrl:        ctrlTable,
		Tuning:      tuning,
		Rand:        rng,
		Growth:      flags.Growth,
		DisableGuns: flags.DisableGuns,
	})
	if err != nil {
		return nil, nil, DefinerParts{}, err
	}
	return d, d, DefinerParts{
		Guns:                  gunTable,
		Ctrl:                  ctrlTable,
		RefreshBodyAttributes: d.RefreshBodyAttributes,
	}, nil
}
