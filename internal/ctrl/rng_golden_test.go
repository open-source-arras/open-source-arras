package ctrl

import (
	"encoding/json"
	"fmt"
	"os"
	"path/filepath"
	"testing"

	"arrasgo/internal/config"
	"arrasgo/internal/jsutil"
	"arrasgo/internal/vmath"
)

// Golden test vectors from tools/gen-ctrl-vectors.js. Regenerate after changing that tool or these controllers.

type ctrlCase struct {
	Name   string          `json:"name"`
	Seed   uint64          `json:"seed"`
	Result json.RawMessage `json:"result"`
	Err    *string         `json:"err"`
}

func loadCtrlCases(t *testing.T) []ctrlCase {
	t.Helper()
	p := filepath.Join("..", "..", "gen", "ctrl-vectors.json")
	raw, err := os.ReadFile(p)
	if err != nil {
		t.Fatalf("read %s: %v (run: node tools/gen-ctrl-vectors.js)", p, err)
	}
	var cases []ctrlCase
	if err := json.Unmarshal(raw, &cases); err != nil {
		t.Fatalf("parse vectors: %v", err)
	}
	if len(cases) == 0 {
		t.Fatal("no cases loaded")
	}
	return cases
}

func findCtrlCase(t *testing.T, cases []ctrlCase, name string) ctrlCase {
	t.Helper()
	for _, c := range cases {
		if c.Name == name {
			if c.Err != nil {
				t.Fatalf("case %s: the JS threw %q -- nothing to compare against", name, *c.Err)
			}
			return c
		}
	}
	t.Fatalf("no case named %q in gen/ctrl-vectors.json (run: node tools/gen-ctrl-vectors.js)", name)
	return ctrlCase{}
}

func decodeCtrlResult(t *testing.T, c ctrlCase, v any) {
	t.Helper()
	if err := json.Unmarshal(c.Result, v); err != nil {
		t.Fatalf("case %s: decode result: %v", c.Name, err)
	}
}

type vecJSON struct {
	X float64 `json:"x"`
	Y float64 `json:"y"`
}

func (v vecJSON) vec() vmath.Vec2 { return vmath.Vec2{X: v.X, Y: v.Y} }

// trigTol must be exact due to jsmath's V8 bit-for-bit trig matching.
const trigTol = 0

func TestThinkMoveInCirclesPinned(t *testing.T) {
	cases := loadCtrlCases(t)

	type vector struct {
		Setup struct {
			X              float64 `json:"x"`
			Y              float64 `json:"y"`
			VelocityLength float64 `json:"velocityLength"`
			Acceleration   float64 `json:"acceleration"`
		} `json:"setup"`
		Construct struct {
			DrawsAfter uint64  `json:"drawsAfter"`
			Timer      int32   `json:"timer"`
			PathAngle  float64 `json:"pathAngle"`
			Goal       vecJSON `json:"goal"`
		} `json:"construct"`
		Thinks []struct {
			DrawsBefore uint64  `json:"drawsBefore"`
			DrawsAfter  uint64  `json:"drawsAfter"`
			Timer       int32   `json:"timer"`
			PathAngle   float64 `json:"pathAngle"`
			Goal        vecJSON `json:"goal"`
			Power       float64 `json:"power"`
		} `json:"thinks"`
	}

	for _, name := range []string{"moveInCircles/lowAccel", "moveInCircles/highAccel"} {
		t.Run(name, func(t *testing.T) {
			c := findCtrlCase(t, cases, name)
			var vec vector
			decodeCtrlResult(t, c, &vec)
			if len(vec.Thinks) == 0 {
				t.Fatal("vector carries no think() calls -- nothing exercised")
			}

			w := newWorld(4)
			w.Tuning = &config.Tuning{}
			id, e := spawnAt(w, vec.Setup.X, vec.Setup.Y)
			e.ACCELERATION = vec.Setup.Acceleration
			w.Vel[id.Index] = vmath.Vec2{X: vec.Setup.VelocityLength, Y: 0}
			r := jsutil.NewRand(c.Seed)
			ctx := baseContext(w, id, r)

			st := newMoveInCircles(ctx, Opts{})
			if got := r.Calls(); got != vec.Construct.DrawsAfter {
				t.Fatalf("construct: %d draws, want %d", got, vec.Construct.DrawsAfter)
			}
			if st.CirclesTimer != vec.Construct.Timer {
				t.Errorf("construct: timer = %d, want %d", st.CirclesTimer, vec.Construct.Timer)
			}
			assertClose(t, "construct.pathAngle", st.CirclesPathAngle, vec.Construct.PathAngle, trigTol)
			assertVecClose(t, "construct.goal", st.CirclesGoal, vec.Construct.Goal.X, vec.Construct.Goal.Y, trigTol)

			for i, want := range vec.Thinks {
				if before := r.Calls(); before != want.DrawsBefore {
					t.Fatalf("think %d: %d draws taken before this call, want %d -- an earlier "+
						"call consumed the wrong number", i, before, want.DrawsBefore)
				}
				got := thinkMoveInCircles(&st, ctx, Decision{})
				if after := r.Calls(); after != want.DrawsAfter {
					t.Fatalf("think %d: consumed %d draws, want %d", i, after-want.DrawsBefore, want.DrawsAfter-want.DrawsBefore)
				}
				if st.CirclesTimer != want.Timer {
					t.Errorf("think %d: timer = %d, want %d", i, st.CirclesTimer, want.Timer)
				}
				assertClose(t, fmt.Sprintf("think %d pathAngle", i), st.CirclesPathAngle, want.PathAngle, trigTol)
				if !got.HasGoal {
					t.Errorf("think %d: HasGoal = false, want true", i)
				}
				assertVecClose(t, fmt.Sprintf("think %d goal", i), got.Goal, want.Goal.X, want.Goal.Y, trigTol)
				if !got.HasPower || got.Power != want.Power {
					t.Errorf("think %d: power = %v (has=%v), want %v", i, got.Power, got.HasPower, want.Power)
				}
			}
		})
	}
}

func TestThinkHangOutNearMasterPinned(t *testing.T) {
	cases := loadCtrlCases(t)

	type vector struct {
		Setup struct {
			BodyX      float64 `json:"bodyX"`
			BodyY      float64 `json:"bodyY"`
			BodySize   float64 `json:"bodySize"`
			SourceX    float64 `json:"sourceX"`
			SourceY    float64 `json:"sourceY"`
			SourceSize float64 `json:"sourceSize"`
			VelX       float64 `json:"velX"`
			VelY       float64 `json:"velY"`
		} `json:"setup"`
		Construct struct {
			Goal vecJSON `json:"goal"`
		} `json:"construct"`
		Thinks []struct {
			BodyX       float64 `json:"bodyX"`
			DrawsBefore uint64  `json:"drawsBefore"`
			DrawsAfter  uint64  `json:"drawsAfter"`
			Timer       int32   `json:"timer"`
			Goal        vecJSON `json:"goal"`
			Out         *struct {
				Target vecJSON  `json:"target"`
				Goal   vecJSON  `json:"goal"`
				Power  *float64 `json:"power"`
			} `json:"out"`
		} `json:"thinks"`
	}

	for _, name := range []string{
		"hangOutNearMaster/farAlwaysRerolls",
		"hangOutNearMaster/closeTimerReroll",
		"hangOutNearMaster/transitionFarToClose",
	} {
		t.Run(name, func(t *testing.T) {
			c := findCtrlCase(t, cases, name)
			var vec vector
			decodeCtrlResult(t, c, &vec)
			if len(vec.Thinks) == 0 {
				t.Fatal("vector carries no think() calls -- nothing exercised")
			}

			w := newWorld(8)
			w.Tuning = &config.Tuning{}
			sourceID, source := spawnAt(w, vec.Setup.SourceX, vec.Setup.SourceY)
			source.SIZE, source.SizeMultiplier = vec.Setup.SourceSize, 1
			id, e := spawnAt(w, vec.Setup.BodyX, vec.Setup.BodyY)
			e.Source = sourceID
			e.SIZE, e.SizeMultiplier = vec.Setup.BodySize, 1
			w.Vel[id.Index] = vmath.Vec2{X: vec.Setup.VelX, Y: vec.Setup.VelY}
			r := jsutil.NewRand(c.Seed)
			ctx := baseContext(w, id, r)

			st := newHangOutNearMaster(ctx, Opts{})
			assertVecClose(t, "construct.goal", st.HangGoal, vec.Construct.Goal.X, vec.Construct.Goal.Y, trigTol)

			drawTally := map[uint64]int{}
			for i, want := range vec.Thinks {
				w.Pos[id.Index] = vmath.Vec2{X: want.BodyX, Y: vec.Setup.BodyY}

				if before := r.Calls(); before != want.DrawsBefore {
					t.Fatalf("think %d: %d draws taken before this call, want %d -- an earlier "+
						"call consumed the wrong number", i, before, want.DrawsBefore)
				}
				got := thinkHangOutNearMaster(&st, ctx, Decision{})
				drew := r.Calls() - want.DrawsBefore
				if after := r.Calls(); after != want.DrawsAfter {
					t.Fatalf("think %d: consumed %d draws, want %d", i, drew, want.DrawsAfter-want.DrawsBefore)
				}
				drawTally[drew]++
				if st.HangTimer != want.Timer {
					t.Errorf("think %d: timer = %d, want %d", i, st.HangTimer, want.Timer)
				}
				assertVecClose(t, fmt.Sprintf("think %d internal goal", i), st.HangGoal, want.Goal.X, want.Goal.Y, trigTol)

				if want.Out == nil {
					if got != (Decision{}) {
						t.Errorf("think %d: got %+v, want zero Decision", i, got)
					}
					continue
				}
				if !got.HasTarget || !got.HasGoal {
					t.Errorf("think %d: HasTarget=%v HasGoal=%v, want both true", i, got.HasTarget, got.HasGoal)
				}
				assertVecClose(t, fmt.Sprintf("think %d target", i), got.Target, want.Out.Target.X, want.Out.Target.Y, trigTol)
				assertVecClose(t, fmt.Sprintf("think %d out.goal", i), got.Goal, want.Out.Goal.X, want.Out.Goal.Y, trigTol)
				if want.Out.Power == nil {
					if got.HasPower {
						t.Errorf("think %d: HasPower = true, want false", i)
					}
				} else if !got.HasPower || got.Power != *want.Out.Power {
					t.Errorf("think %d: power = %v (has=%v), want %v", i, got.Power, got.HasPower, *want.Out.Power)
				}
			}
			switch name {
			case "hangOutNearMaster/farAlwaysRerolls":
				if drawTally[2] != len(vec.Thinks) || drawTally[1] != 0 || drawTally[3] != 0 {
					t.Errorf("draw tally = %v, want every one of %d ticks to draw exactly 2 (dist never drops below bound2)", drawTally, len(vec.Thinks))
				}
			case "hangOutNearMaster/closeTimerReroll":
				if drawTally[1] == 0 || drawTally[3] == 0 {
					t.Errorf("draw tally = %v, want both a 1-draw steady tick and a 3-draw (timer>30) reroll", drawTally)
				}
			case "hangOutNearMaster/transitionFarToClose":
				if drawTally[2] == 0 || drawTally[1] == 0 {
					t.Errorf("draw tally = %v, want both a 2-draw (far) tick and a 1-draw (close) tick", drawTally)
				}
			}
		})
	}
}

func TestThinkFleeAtLowHealthPinned(t *testing.T) {
	cases := loadCtrlCases(t)

	type vector struct {
		Setup struct {
			X float64 `json:"x"`
			Y float64 `json:"y"`
		} `json:"setup"`
		Construct struct {
			DrawsAfter uint64  `json:"drawsAfter"`
			Fear       float64 `json:"fear"`
		} `json:"construct"`
		Thinks []struct {
			HealthAmount float64  `json:"healthAmount"`
			HealthMax    float64  `json:"healthMax"`
			Fire         bool     `json:"fire"`
			Target       *vecJSON `json:"target"`
			DrawsBefore  uint64   `json:"drawsBefore"`
			DrawsAfter   uint64   `json:"drawsAfter"`
			Out          *struct {
				Goal vecJSON `json:"goal"`
			} `json:"out"`
		} `json:"thinks"`
	}

	for _, name := range []string{"fleeAtLowHealth/clampedHighFear", "fleeAtLowHealth/interiorFear"} {
		t.Run(name, func(t *testing.T) {
			c := findCtrlCase(t, cases, name)
			var vec vector
			decodeCtrlResult(t, c, &vec)
			if len(vec.Thinks) == 0 {
				t.Fatal("vector carries no think() calls -- nothing exercised")
			}

			w := newWorld(4)
			w.Tuning = &config.Tuning{}
			id, e := spawnAt(w, vec.Setup.X, vec.Setup.Y)
			r := jsutil.NewRand(c.Seed)
			ctx := baseContext(w, id, r)

			st := newFleeAtLowHealth(ctx, Opts{})
			if got := r.Calls(); got != vec.Construct.DrawsAfter {
				t.Fatalf("construct: %d draws, want %d", got, vec.Construct.DrawsAfter)
			}
			if st.Fear != vec.Construct.Fear {
				t.Errorf("construct: fear = %v, want %v", st.Fear, vec.Construct.Fear)
			}

			sawClampedMax, sawFlee, sawNoFlee := st.Fear == 0.9, false, false
			for i, want := range vec.Thinks {
				e.Health.Amount, e.Health.Max = want.HealthAmount, want.HealthMax
				input := Decision{Fire: want.Fire, HasFire: true}
				if want.Target != nil {
					input.Target, input.HasTarget = want.Target.vec(), true
				}

				if before := r.Calls(); before != want.DrawsBefore {
					t.Fatalf("think %d: %d draws taken before this call, want %d", i, before, want.DrawsBefore)
				}
				got := thinkFleeAtLowHealth(&st, ctx, input)
				if after := r.Calls(); after != want.DrawsAfter {
					t.Fatalf("think %d: consumed %d draws, want %d -- think() should never draw for this "+
						"controller", i, after-want.DrawsBefore, want.DrawsAfter-want.DrawsBefore)
				}

				if want.Out == nil {
					sawNoFlee = true
					if got != (Decision{}) {
						t.Errorf("think %d: got %+v, want zero Decision", i, got)
					}
					continue
				}
				sawFlee = true
				wantDecision := Decision{Goal: want.Out.Goal.vec(), HasGoal: true}
				if got != wantDecision {
					t.Errorf("think %d: got %+v, want %+v", i, got, wantDecision)
				}
			}
			if !sawFlee || !sawNoFlee {
				t.Errorf("%s: sawFlee=%v sawNoFlee=%v, want both exercised", name, sawFlee, sawNoFlee)
			}
			switch name {
			case "fleeAtLowHealth/clampedHighFear":
				if !sawClampedMax {
					t.Error("fear did not land on the clamp's upper edge (0.9) -- fixture doesn't exercise the clamp")
				}
			case "fleeAtLowHealth/interiorFear":
				if sawClampedMax || st.Fear <= 0.1 || st.Fear >= 0.9 {
					t.Errorf("fear = %v, want a genuine interior value in (0.1, 0.9) for contrast with clampedHighFear", st.Fear)
				}
			}
		})
	}
}
