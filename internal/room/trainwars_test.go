package room

import (
	"testing"

	"arrasgo/internal/entity"
	"arrasgo/internal/vmath"
)

// Reproduces trainwars.js:16-17: velocity set toward leader, clamped +/-90, scaled by damp*1.35.
func TestTrain_FollowerChasesLeaderClamped(t *testing.T) {
	room := newGamemodeTestRoom(t, 71, "train_wars")

	leader := room.World.Spawn()
	room.World.Pos[leader.Index] = vmath.Vec2{X: 0, Y: 0}
	le := room.World.Get(leader)
	le.Team = TeamBlue
	le.Skill.Score = 100
	room.World.Flag[leader.Index] |= entity.FlagPlayer

	follower := room.World.Spawn()
	room.World.Pos[follower.Index] = vmath.Vec2{X: 500, Y: -500}
	fe := room.World.Get(follower)
	fe.Team = TeamBlue
	fe.Skill.Score = 10
	fe.Damp = 0.5
	room.World.Flag[follower.Index] |= entity.FlagBot

	train := &Train{}
	train.Loop(room)

	wantX := clampf(0-500, -90, 90) * 0.5 * 1.35
	wantY := clampf(0-(-500), -90, 90) * 0.5 * 1.35
	got := room.World.Vel[follower.Index]
	if got.X != wantX || got.Y != wantY {
		t.Errorf("follower velocity = (%v,%v), want (%v,%v)", got.X, got.Y, wantX, wantY)
	}
	if v := room.World.Vel[leader.Index]; v.X != 0 || v.Y != 0 {
		t.Errorf("leader velocity should be untouched by Loop, got %v", v)
	}
}

func TestClampf(t *testing.T) {
	cases := []struct{ v, lo, hi, want float64 }{
		{5, -90, 90, 5}, {200, -90, 90, 90}, {-200, -90, 90, -90},
	}
	for _, c := range cases {
		if got := clampf(c.v, c.lo, c.hi); got != c.want {
			t.Errorf("clampf(%v,%v,%v) = %v, want %v", c.v, c.lo, c.hi, got, c.want)
		}
	}
}
