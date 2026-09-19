package ctrl

import (
	"encoding/json"
	"testing"

	"arrasgo/internal/config"
	"arrasgo/internal/jsutil"
	"arrasgo/internal/vmath"
)

// TestBotMovePathUnmarshal tests unmarshalling BotMovePath from JSON.
func TestBotMovePathUnmarshal(t *testing.T) {
	var got []BotMovePath
	raw := `[{"TEAM":-1,"RANGE":20,"MOVEMENT":[[-17.81,-68.63],[-18.11,-11.7]]},
	         {"TEAM":"any","MOVEMENT":[[1,2]]},
	         {"TEAM":-2,"RANGE":0,"MOVEMENT":[[3,4]]}]`
	if err := json.Unmarshal([]byte(raw), &got); err != nil {
		t.Fatalf("Unmarshal: %v", err)
	}
	if len(got) != 3 {
		t.Fatalf("got %d entries, want 3", len(got))
	}
	if got[0].Team != -1 || got[0].AnyTeam || got[0].Radius() != 20 {
		t.Errorf("entry 0 = %+v, want team -1, radius 20", got[0])
	}
	if got[0].Movement[0] != [2]float64{-17.81, -68.63} {
		t.Errorf("entry 0 first waypoint = %v", got[0].Movement[0])
	}
	if !got[1].AnyTeam || got[1].Radius() != 50 {
		t.Errorf("entry 1 = %+v, want AnyTeam with the 50 default", got[1])
	}
	if got[2].Radius() != 0 {
		t.Errorf("entry 2 radius = %v, want 0 -- `RANGE ?? 50` does not replace a 0", got[2].Radius())
	}
}

// TestBotMoveWalksItsWaypoints tests following a waypoint path.
func TestBotMoveWalksItsWaypoints(t *testing.T) {
	w := newWorld(4)
	w.Tuning = &config.Tuning{}
	id, e := spawnAt(w, 0, 0)
	e.Team = -1

	ctx := baseContext(w, id, nil)
	ctx.RandomSpot = func(*jsutil.Rand) vmath.Vec2 { return vmath.Vec2{X: -5000, Y: -5000} }
	ctx.BotMove = []BotMovePath{{
		Team:     -1,
		Range:    50,
		HasRange: true,
		Movement: [][2]float64{{10, 0}, {20, 0}},
	}}
	st := newWanderAroundMap(ctx, Opts{LookAtGoal: true})

	got := thinkWanderAroundMap(&st, ctx, Decision{})
	if !got.HasGoal || got.Goal != (vmath.Vec2{X: 1, Y: 0}) {
		t.Errorf("firstTick goal = %+v, want (1,0)", got.Goal)
	}
	if !got.HasTarget || got.Target != (vmath.Vec2{X: 300, Y: 0}) {
		t.Errorf("firstTick target = %+v, want (300,0)", got.Target)
	}
	if st.WanderMoveArray != 0 || !st.WanderBotMoveActive {
		t.Errorf("firstTick: moveArray=%d active=%v, want 0/true", st.WanderMoveArray, st.WanderBotMoveActive)
	}

	w.Pos[id.Index] = vmath.Vec2{X: 280, Y: 0}
	got = thinkWanderAroundMap(&st, ctx, Decision{})
	if got.Target != (vmath.Vec2{X: 20, Y: 0}) {
		t.Errorf("atWaypoint0 target = %+v, want (20,0) -- still waypoint 0", got.Target)
	}
	if st.WanderMoveArray != 1 {
		t.Fatalf("atWaypoint0: moveArray = %d, want 1", st.WanderMoveArray)
	}
	got = thinkWanderAroundMap(&st, ctx, Decision{})
	if got.Target != (vmath.Vec2{X: 320, Y: 0}) {
		t.Errorf("waypoint1 target = %+v, want (320,0)", got.Target)
	}

	w.Pos[id.Index] = vmath.Vec2{X: 590, Y: 0}
	thinkWanderAroundMap(&st, ctx, Decision{})
	if st.WanderBotMoveEnabled || !st.WanderEnabled {
		t.Errorf("lastWaypoint: botMoveEnabled=%v enabled=%v, want false/true",
			st.WanderBotMoveEnabled, st.WanderEnabled)
	}
	if st.WanderMoveArray != 2 {
		t.Errorf("lastWaypoint: moveArray = %d, want 2 (one past the end)", st.WanderMoveArray)
	}

	// And from then on it is an ordinary wanderer, heading for RandomSpot's answer.
	got = thinkWanderAroundMap(&st, ctx, Decision{})
	if !got.HasTarget || got.Target != (vmath.Vec2{X: -5590, Y: -5000}) {
		t.Errorf("afterRoute target = %+v, want the wander spot's offset", got.Target)
	}
}

// TestBotMoveIgnoresOtherTeams tests non-matching team entries.
func TestBotMoveIgnoresOtherTeams(t *testing.T) {
	w := newWorld(4)
	w.Tuning = &config.Tuning{}
	id, e := spawnAt(w, 0, 0)
	e.Team = -3

	ctx := baseContext(w, id, nil)
	ctx.RandomSpot = func(*jsutil.Rand) vmath.Vec2 { return vmath.Vec2{X: 100, Y: 0} }
	ctx.BotMove = []BotMovePath{{Team: -1, Movement: [][2]float64{{10, 0}}}}
	st := newWanderAroundMap(ctx, Opts{LookAtGoal: true})

	got := thinkWanderAroundMap(&st, ctx, Decision{})
	if !got.HasTarget || got.Target != (vmath.Vec2{X: 100, Y: 0}) {
		t.Errorf("target = %+v, want the wander spot (100,0)", got.Target)
	}
	if st.WanderBotMoveEnabled || !st.WanderEnabled {
		t.Errorf("botMoveEnabled=%v enabled=%v, want false/true",
			st.WanderBotMoveEnabled, st.WanderEnabled)
	}
}

// TestBotMoveDefersToAnUpstreamGoal tests deference to upstream goals.
func TestBotMoveDefersToAnUpstreamGoal(t *testing.T) {
	w := newWorld(4)
	w.Tuning = &config.Tuning{}
	id, e := spawnAt(w, 0, 0)
	e.Team = -1

	ctx := baseContext(w, id, nil)
	ctx.RandomSpot = func(*jsutil.Rand) vmath.Vec2 { return vmath.Vec2{X: 100, Y: 0} }
	ctx.BotMove = []BotMovePath{{Team: -1, Movement: [][2]float64{{10, 0}}}}
	st := newWanderAroundMap(ctx, Opts{LookAtGoal: true})

	upstream := Decision{Goal: vmath.Vec2{X: 7, Y: 7}, HasGoal: true}
	if got := thinkWanderAroundMap(&st, ctx, upstream); got != (Decision{}) {
		t.Errorf("got %+v, want zero -- the wander body is gated on this.enabled", got)
	}
	if st.WanderEnabled {
		t.Error("enabled stayed true; the matched entry should have left it false")
	}
}
