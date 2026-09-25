package room

// This file ports game/gamemodes/gamemodeManager.js.
type GamemodeManager struct {
	room *Room

	Siege      *Siege
	Assault    *Assault
	Tag        *Tag
	Domination *Domination
	Mothership *Mothership
	Sandbox    *Sandbox
	Train      *Train
	Maze       *Maze
	Labyrinth  *Labyrinth
	Outbreak   *Outbreak
	ClanWars   *ClanWars
	Groups     *GroupHandler
}

// NewGamemodeManager builds every gamemode object for r.
func NewGamemodeManager(r *Room) *GamemodeManager {
	gm := &GamemodeManager{
		room:       r,
		Siege:      newSiege(r),
		Assault:    newAssault(r),
		Tag:        newTag(r),
		Domination: newDomination(),
		Mothership: newMothership(r),
		Sandbox:    newSandbox(r),
		Train:      &Train{},
		Maze:       newMaze(r),
		Labyrinth:  newLabyrinth(r),
		Outbreak:   newOutbreak(r),
		ClanWars:   newClanWars(r),
		Groups:     newGroupHandler(r),
	}
	return gm
}

// Redefine is request-time redefine() (gamemodeManager.js:69-78).
func (gm *GamemodeManager) Redefine() {
	gm.Siege.Redefine()
	gm.Assault.Redefine()
	gm.Tag.Redefine()
	gm.Sandbox.Redefine()
	mazeType := 0
	if gm.room.Flags.HasMazeType {
		mazeType = int(gm.room.Flags.MazeType)
	}
	gm.Maze.Redefine(mazeType)
	gm.Labyrinth.Redefine(4)
}

// Start is request("start").
func (gm *GamemodeManager) Start() error {
	r := gm.room
	if r.Flags.Siege {
		mazeType := 0
		if r.Flags.HasMazeType {
			mazeType = int(r.Flags.MazeType)
		}
		if err := gm.Siege.Start(mazeType); err != nil {
			return err
		}
	}
	if r.Flags.Assault {
		if err := gm.Assault.Start(); err != nil {
			return err
		}
	}
	if r.Flags.Tag {
		gm.Tag.InitAndStart()
	}
	if r.Flags.Domination {
		if err := gm.Domination.Start(r); err != nil {
			return err
		}
	}
	if r.Flags.Mothership {
		if err := gm.Mothership.Start(); err != nil {
			return err
		}
	}
	if r.Flags.Maze && r.Flags.HasMazeType && !r.Flags.Siege {
		if err := gm.Maze.Generate(); err != nil {
			return err
		}
	}
	if r.Flags.Labyrinth {
		if err := gm.Labyrinth.Generate(); err != nil {
			return err
		}
	}
	if r.Flags.Outbreak {
		gm.Outbreak.Start()
	}
	return nil
}

// Loop is request("loop").
func (gm *GamemodeManager) Loop() error {
	r := gm.room
	if r.Flags.Siege {
		if err := gm.Siege.Loop(); err != nil {
			return err
		}
	}
	if r.Flags.Mothership {
		gm.Mothership.Loop()
	}
	if r.Flags.Assault {
		if err := gm.Assault.Poll(); err != nil {
			return err
		}
	}
	if r.Flags.Domination {
		if err := gm.Domination.Poll(r); err != nil {
			return err
		}
	}
	return nil
}

// QuickLoop is request("quickloop").
func (gm *GamemodeManager) QuickLoop() {
	r := gm.room
	if r.Flags.Sandbox {
		gm.Sandbox.Update()
	}
	if r.Flags.Train {
		gm.Train.Loop(r)
	}
}

func (gm *GamemodeManager) Terminate() {
	r := gm.room
	if r.Flags.Siege {
		gm.Siege.Reset()
	}
	if r.Flags.Assault {
		gm.Assault.Reset()
	}
	if r.Flags.Tag {
		gm.Tag.ResetAndStop()
	}
	if r.Flags.Domination {
		gm.Domination.Reset()
	}
	if r.Flags.Mothership {
		gm.Mothership.Reset()
	}
	if r.Flags.ClanWars {
		gm.ClanWars.Reset()
	}
}
