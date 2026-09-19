package ctrl

import (
	"testing"

	"arrasgo/internal/config"
	"arrasgo/internal/entity"
	"arrasgo/internal/jsutil"
	"arrasgo/internal/vmath"
)

type job struct {
	body entity.EntityID
	ctrl entity.ControllerID
}

func newBenchFixture() (*Table, *Context, []job) {
	w := entity.NewWorld(64)
	w.Tuning = &config.Tuning{}
	w.Room = entity.RoomInfo{Width: 6300, Height: 6300}
	tbl := NewTable(32)

	spawn := func(x, y float64) (entity.EntityID, *entity.Entity) {
		id := w.Spawn()
		w.Pos[id.Index] = vmath.Vec2{X: x, Y: y}
		e := w.Get(id)
		e.SIZE, e.SizeMultiplier = 10, 1
		return id, e
	}

	theirGrandID, theirGrand := spawn(40, 0)
	theirGrand.Team = 2
	candMasterID, candMaster := spawn(40, 0)
	candMaster.Master = theirGrandID
	candID, cand := spawn(40, 0)
	cand.Master = candMasterID
	cand.Health.Amount = 100
	cand.Alpha = 1
	cand.Type = "tank"

	dangerMasterID, dangerMaster := spawn(5, 0)
	dangerMaster.WireID = 999
	dangerID, danger := spawn(5, 0)
	danger.Type = "bullet"
	danger.Master = dangerMasterID
	w.Vel[dangerID.Index] = vmath.Vec2{X: -1, Y: 0}

	candidates := []entity.EntityID{candID, dangerID}
	guns := []GunInfo{
		{CanShoot: true, Stack: true, Cycle: 0.5, Reload: 1, ReloadStat: 1, Angle: 0.1},
		{CanShoot: true, Stack: true, Cycle: 0.3, Reload: 1, ReloadStat: 1, Angle: -0.1},
	}

	ctx := &Context{
		World: w, Rand: jsutil.NewRand(1), RunSpeed: 1.5,
		Guns: guns, Candidates: candidates,
		RoomCenter: vmath.Vec2{X: 3150, Y: 3150},
	}

	var jobs []job
	add := func(bodyID entity.EntityID, spec Spec) {
		existing := tbl.Add(ctx, nil, []Spec{spec})
		jobs = append(jobs, job{body: bodyID, ctrl: existing[0]})
	}

	simpleID, simpleE := spawn(0, 0)
	simpleE.Master = candMasterID
	add(simpleID, Spec{Kind: KindDoNothing})

	gunsID, _ := spawn(0, 0)
	add(gunsID, Spec{Kind: KindStackGuns})

	spinID, _ := spawn(0, 0)
	add(spinID, Spec{Kind: KindSpin, Opts: Opts{HasSpeed: true, Speed: 0.05}})

	whirlMasterID, whirlMasterE := spawn(0, 0)
	whirlMasterE.AISettings.SPEED, whirlMasterE.AISettings.HasSPEED = 1, true
	whirlExisting := tbl.Add(ctx, nil, []Spec{{Kind: KindWhirlwind}})
	whirlMasterE.Controllers = whirlExisting
	jobs = append(jobs, job{body: whirlMasterID, ctrl: whirlExisting[0]})

	orbitID, orbitE := spawn(0, 0)
	orbitE.Master = whirlMasterID
	add(orbitID, Spec{Kind: KindOrbit})

	snakeID, snakeE := spawn(0, 0)
	snakeMasterID, snakeMasterE := spawn(0, 0)
	snakeGrandID, snakeGrandE := spawn(0, 0)
	snakeGrandE.Control.Target = vmath.Vec2{X: 30, Y: 0}
	snakeMasterE.Master = snakeGrandID
	snakeE.Master = snakeMasterID
	w.Vel[snakeID.Index] = vmath.Vec2{X: 1, Y: 0}
	add(snakeID, Spec{Kind: KindSnake})

	ndmID, ndmE := spawn(0, 0)
	ndmMasterID, ndmMasterE := spawn(0, 0)
	ndmGrandID, ndmGrandE := spawn(0, 0)
	ndmGrandE.Team = 1
	ndmMasterE.Master = ndmGrandID
	ndmE.Master = ndmMasterID
	ndmE.AISettings.View360 = true
	ndmE.Fov = 1000
	add(ndmID, Spec{Kind: KindNearestDifferentMaster})

	avoidID, avoidE := spawn(0, 0)
	avoidE.Master = ndmMasterID // any alive master with a different WireID than danger's
	add(avoidID, Spec{Kind: KindAvoid})

	minionID, minionE := spawn(0, 0)
	minionE.Master = ndmMasterID
	add(minionID, Spec{Kind: KindMinion})

	wanderID, _ := spawn(0, 0)
	wt := newWanderAroundMap(ctx, Opts{})
	wanderExisting := tbl.Add(ctx, nil, []Spec{{Kind: KindWanderAroundMap}})
	*tbl.State(wanderExisting[0]) = wt
	jobs = append(jobs, job{body: wanderID, ctrl: wanderExisting[0]})

	fireID, _ := spawn(0, 0)
	add(fireID, Spec{Kind: KindAlwaysFire})

	return tbl, ctx, jobs
}

func runTick(tbl *Table, ctx *Context, jobs []job) {
	for _, j := range jobs {
		ctx.Body = j.body
		var acc Decision
		out := tbl.Think(ctx, j.ctrl, Decision{})
		Merge(&acc, out, tbl.Kind(j.ctrl).AcceptsFromTop())
	}
}

func BenchmarkThink(b *testing.B) {
	tbl, ctx, jobs := newBenchFixture()
	runTick(tbl, ctx, jobs)
	b.ReportAllocs()
	b.ResetTimer()
	for i := 0; i < b.N; i++ {
		runTick(tbl, ctx, jobs)
	}
}

func TestThinkZeroAllocs(t *testing.T) {
	tbl, ctx, jobs := newBenchFixture()
	runTick(tbl, ctx, jobs)

	allocs := testing.AllocsPerRun(200, func() {
		runTick(tbl, ctx, jobs)
	})
	if allocs != 0 {
		t.Errorf("Think over a %d-controller mix: %v allocs/op, want 0", len(jobs), allocs)
	}
}
