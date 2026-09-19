package wire

import (
	"arrasgo/internal/jsutil"
	"arrasgo/internal/maze"
	"arrasgo/internal/room"
)

// RNG must be shared with the room to keep stream in sync with JS.
type MazeAdapter struct {
	rng *jsutil.Rand
	err error
}

func NewMazeAdapter(rng *jsutil.Rand) *MazeAdapter {
	if rng == nil {
		panic("wire: NewMazeAdapter needs a non-nil Rand; see docs/architecture.md")
	}
	return &MazeAdapter{rng: rng}
}

// Fresh generator per call (maze.js:10) to keep RNG in sync.
func (a *MazeAdapter) PlaceMinimal(mazeType int) room.MazeLayout {
	g := maze.NewMazeGenerator(mazeType, a.rng)
	res, err := g.PlaceMinimal()
	if err != nil {
		a.err = err
		return room.MazeLayout{Width: res.Width, Height: res.Height}
	}

	squares := make([]room.MazeSquare, len(res.Squares))
	for i, s := range res.Squares {
		squares[i] = room.MazeSquare{
			X:    float64(s.X),
			Y:    float64(s.Y),
			Size: float64(s.Size),
		}
	}
	return room.MazeLayout{Squares: squares, Width: res.Width, Height: res.Height}
}

func (a *MazeAdapter) Err() error { return a.err }

var _ room.MazeGenerator = (*MazeAdapter)(nil)
