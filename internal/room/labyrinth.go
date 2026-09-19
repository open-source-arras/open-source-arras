package room

// Labyrinth is labyrinth.js:1.
type Labyrinth struct {
	room *Room
	Type int
}

func newLabyrinth(r *Room) *Labyrinth {
	return &Labyrinth{room: r, Type: 4}
}

// Redefine is labyrinth.js:41.
func (l *Labyrinth) Redefine(mazeType int) { l.Type = mazeType }

// Generate is labyrinth.js:5.
func (l *Labyrinth) Generate() error {
	return spawnMazeWalls(l.room, l.Type, "labyrinthWall")
}
