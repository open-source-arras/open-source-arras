package room

// Sandbox resizes the arena when clients join or leave (sandbox.js).
type Sandbox struct {
	room *Room

	xgrid, ygrid int
	lastClients  int

	DoNotChangeArenaSize bool

	Bounds BoundsUpdater
}

type BoundsUpdater interface {
	UpdateBounds(width, height float64)
}

func newSandbox(r *Room) *Sandbox {
	return &Sandbox{room: r}
}

// Redefine reads the grid from the room (sandbox.js:17).
func (s *Sandbox) Redefine() {
	s.xgrid = s.room.Geometry.XGrid
	s.ygrid = s.room.Geometry.YGrid
	s.lastClients = 0
}

func (s *Sandbox) Update() {
	clients := s.room.clientCount()
	switch {
	case s.lastClients < clients:
		s.lastClients = clients
		s.xgrid += 20
		s.ygrid += 20
	case s.lastClients > clients:
		s.lastClients = clients
		s.xgrid -= 20
		s.ygrid -= 20
	}
	if !s.DoNotChangeArenaSize && s.Bounds != nil {
		s.Bounds.UpdateBounds(float64(s.xgrid)*30, float64(s.ygrid)*30)
	}
	// Caller must call Comms.BroadcastRoom after resize under the DoNotChangeArenaSize gate.
}
