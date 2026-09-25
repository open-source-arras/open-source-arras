// gotrace compares Go and Node server traces tick-by-tick.
package main

import (
	"flag"
	"fmt"
	"os"
	"runtime"
	"sort"
	"strconv"
	"strings"
	"time"

	"arrasgo/internal/config"
	"arrasgo/internal/ctrl"
	"arrasgo/internal/define"
	"arrasgo/internal/defs"
	"arrasgo/internal/entity"
	"arrasgo/internal/guns"
	"arrasgo/internal/jsutil"
	"arrasgo/internal/room"
	"arrasgo/internal/sim"
	"arrasgo/internal/spatial"
	"arrasgo/internal/trace"
	"arrasgo/internal/wire"
)

func main() {
	seed := flag.Uint64("seed", 1, "PRNG seed; the Node harness takes the same one")
	ticks := flag.Int("ticks", 600, "how many gameloop() steps to run")
	bots := flag.Int("bots", 0, "bots to spawn (see the note in docs/harness.md — a run without them proves very little)")
	out := flag.String("out", "", "output file; required")
	gamemode := flag.String("gamemode", "ffa", "comma-separated gamemodes; the Node harness takes the same list")
	spawnClass := flag.String("spawnclass", "", "override Config.spawn_class, the class every bot spawns as; the Node harness takes the same flag")
	checkUsers := flag.Bool("checkusers", false, "answer gameHandler.checkUsers() true with no client connected, which is the only way a run reaches the boss spawner; the Node harness takes the same flag")
	bossCooldown := flag.Int("bosscooldown", -1, "override Config.boss_spawn_cooldown (260 as shipped, which is ~8,000 ticks); the Node harness takes the same flag")
	noTrace := flag.Bool("notrace", false, "run the simulation but write no trace, which makes --out optional. Serialising the trace is most of the wall clock on both sides at any useful length, so this is the flag to use when the question is how fast the simulation itself runs")
	quiet := flag.Bool("quiet", false, "suppress the summary")
	flag.Parse()

	if *out == "" && !*noTrace {
		fmt.Fprintln(os.Stderr, "usage: gotrace --seed N --ticks N [--bots N] --out FILE")
		os.Exit(2)
	}
	if *ticks < 0 {
		fmt.Fprintln(os.Stderr, "--ticks must not be negative")
		os.Exit(2)
	}

	opts := options{
		Seed:         *seed,
		Ticks:        *ticks,
		Bots:         *bots,
		Gamemode:     *gamemode,
		SpawnClass:   *spawnClass,
		CheckUsers:   *checkUsers,
		BossCooldown: *bossCooldown,
		NoTrace:      *noTrace,
		Out:          *out,
		Quiet:        *quiet,
	}
	if err := run(opts); err != nil {
		fmt.Fprintln(os.Stderr, "gotrace:", err)
		os.Exit(1)
	}
}

type options struct {
	Seed         uint64
	Ticks        int
	Bots         int
	Gamemode     string
	SpawnClass   string
	CheckUsers   bool
	BossCooldown int
	NoTrace      bool
	Out          string
	Quiet        bool
}

func run(opts options) error {
	seed, ticks, out, quiet := opts.Seed, opts.Ticks, opts.Out, opts.Quiet
	var f *os.File
	if !opts.NoTrace {
		var err error
		f, err = os.Create(out)
		if err != nil {
			return err
		}
		defer f.Close()
	}

	rng := jsutil.NewRand(seed)
	gamemodes := splitModes(opts.Gamemode)
	w, s, err := buildWorld(rng, gamemodes, opts)
	if err != nil {
		return err
	}
	started := time.Now()

	var tw *trace.Writer
	if !opts.NoTrace {
		tw = trace.NewWriter(f)
	}

	var errCount int
	s.Hooks.Error = func(e error) {
		errCount++
		if errCount <= 5 {
			fmt.Fprintf(os.Stderr, "tick error: %v\n", e)
		}
	}

	sitesTick := -1
	if v := os.Getenv("GOTRACE_SITES"); v != "" {
		if n, err := strconv.Atoi(v); err == nil {
			sitesTick = n
		}
	}
	tally := map[string]int{}
	ordered := os.Getenv("GOTRACE_ORDER") != ""
	var seq []string
	var stacks []string
	deep := os.Getenv("GOTRACE_DEEP") != ""

	botsTick := -1
	if v := os.Getenv("GOTRACE_BOTS"); v != "" {
		if n, err := strconv.Atoi(v); err == nil {
			botsTick = n
		}
	}

	if v := os.Getenv("GOTRACE_ACCEL"); v != "" {
		if n, err := strconv.Atoi(v); err == nil {
			want := uint32(n)
			s.Hooks.WatchAccel = func(id entity.EntityID, dx, dy, x, y float64) {
				e := w.Get(id)
				if e == nil || e.WireID != want {
					return
				}
				fmt.Fprintln(os.Stderr, fmt.Sprintf("GOACCEL id=%d d=%.20e,%.20e -> %.20e,%.20e",
					e.WireID, dx, dy, x, y))
			}
		}
	}

	if v := os.Getenv("GOTRACE_COLLIDE"); v != "" {
		if n, err := strconv.Atoi(v); err == nil {
			want := uint32(n)
			s.Hooks.WatchCollide = func(name string, a, b entity.EntityID) {
				ea, eb := w.Get(a), w.Get(b)
				if ea == nil || eb == nil || (ea.WireID != want && eb.WireID != want) {
					return
				}
				fmt.Fprintln(os.Stderr, fmt.Sprintf(
					"GOCOLLIDE %s my=%d(%s) n=%d(%s) myXY=%v,%v nXY=%v,%v",
					name, ea.WireID, ea.Label, eb.WireID, eb.Label,
					w.Pos[a.Index].X, w.Pos[a.Index].Y, w.Pos[b.Index].X, w.Pos[b.Index].Y))
			}
		}
	}

	wallsProbe := os.Getenv("GOTRACE_WALLS") != ""

	entWireID := -1
	if v := os.Getenv("GOTRACE_ENT"); v != "" {
		if n, err := strconv.Atoi(v); err == nil {
			entWireID = n
		}
	}

	for i := 0; i < ticks; i++ {
		if i == sitesTick {
			rng.WatchDraws(func(pcs []uintptr) {
				if ordered {
					seq = append(seq, drawSite(pcs))
					if deep {
						stacks = append(stacks, deepSite(pcs))
					}
					return
				}
				tally[drawSite(pcs)]++
			})
		}
		s.Step()
		if i == sitesTick {
			rng.WatchDraws(nil)
			if ordered {
				for k, site := range seq {
					fmt.Fprintln(os.Stderr, "GODRAW", i, k, site)
				}
				for k, st := range stacks {
					fmt.Fprintln(os.Stderr, "GOSTACK", i, k, st)
				}
			} else {
				reportSites(i, tally)
			}
		}
		if tw != nil {
			if err := tw.WriteTick(i, s.ElapsedMS(), rng.Calls(), w); err != nil {
				return fmt.Errorf("writing tick %d: %w", i, err)
			}
		}
		if botsTick >= 0 && i >= botsTick {
			reportBots(i, w, s)
		}
		if entWireID >= 0 {
			reportEnt(i, entWireID, w)
		}
		if wallsProbe {
			reportWalls(i, w)
		}
	}
	if tw != nil {
		if err := tw.Flush(); err != nil {
			return err
		}
	}

	if os.Getenv("GOTRACE_HOOKS") != "" {
		for _, k := range []string{"zombify", "shootOnDeath", "shootOnDeath-armed",
			"necro", "necro-converted", "assemblerMerge", "assemblerEffect"} {
			fmt.Fprintln(os.Stderr, "GOHOOK", k, hookCounts[k])
		}
	}
	if !quiet {
		dest := out
		if opts.NoTrace {
			dest = "(no trace)"
		}
		fmt.Printf("seed %d, %d ticks, %d entities, %d rng draws -> %s\n",
			seed, ticks, w.Live(), rng.Calls(), dest)
		if secs := time.Since(started).Seconds(); secs > 0 {
			fmt.Printf("%.3f seconds, %.1f ticks/sec\n", secs, float64(ticks)/secs)
		}
		if errCount > 0 {
			fmt.Println(errCount, "tick errors")
		}
		if opts.CheckUsers && roomForProbe != nil {
			fmt.Println(len(roomForProbe.NaturallySpawnedBosses), "natural bosses alive")
		}
		if w.Live() == 0 {
			fmt.Println("NOTE the world is empty — buildWorld is still a stub, see the " +
				"package comment. A diff against Node will diverge at tick 0.")
		}
	}
	return nil
}

// buildWorld boots a room for the differential harness.
func buildWorld(rng *jsutil.Rand, gamemodes []string, opts options) (*entity.World, *sim.Sim, error) {
	cfg, err := config.Default()
	if err != nil {
		return nil, nil, fmt.Errorf("loading config: %w", err)
	}
	if opts.Bots > 0 {
		cfg.BotCap = opts.Bots
	}
	if opts.BossCooldown >= 0 {
		cfg.BossSpawnCooldown = opts.BossCooldown
	}
	if opts.SpawnClass != "" {
		cfg.SpawnClass = opts.SpawnClass
	}

	mark := func(n string) {
		if os.Getenv("GOTRACE_PROBE") != "" {
			fmt.Fprintln(os.Stderr, "PROBE setup:"+n, rng.Calls())
		}
	}
	mark("start")
	set, err := defs.Load(rng)
	if err != nil {
		return nil, nil, fmt.Errorf("loading definitions: %w", err)
	}
	res, err := defs.NewResolver(set, rng)
	if err != nil {
		return nil, nil, fmt.Errorf("building resolver: %w", err)
	}

	mark("afterDefinitions")

	var setupSeq []string
	if os.Getenv("GOTRACE_SETUPSITES") != "" {
		deepSetup := os.Getenv("GOTRACE_SETUPSITES") == "deep"
		rng.WatchDraws(func(pcs []uintptr) {
			if deepSetup {
				setupSeq = append(setupSeq, deepSite(pcs))
				return
			}
			setupSeq = append(setupSeq, drawSite(pcs))
		})
		defer func() {
			rng.WatchDraws(nil)
			for k, site := range setupSeq {
				fmt.Fprintln(os.Stderr, "GOSETUP", k, site)
			}
		}()
	}

	gunTable := guns.NewTable(256)
	ctrlTable := ctrl.NewTable(256)
	ctrlTableForProbe = ctrlTable
	gunTableForProbe = gunTable

	gmFlags, err := wire.PeekGamemodeFlags(&cfg, gamemodes)
	if err != nil {
		return nil, nil, err
	}
	definer, err := define.New(define.Config{
		Defs:        set,
		Guns:        gunTable,
		Ctrl:        ctrlTable,
		Tuning:      &cfg,
		Rand:        rng,
		Growth:      gmFlags.Growth,
		DisableGuns: gmFlags.DisableGuns,
	})
	if err != nil {
		return nil, nil, fmt.Errorf("building definer: %w", err)
	}

	s, lg, err := wire.StartLife(wire.LifeOptions{
		Grid:                  spatial.New(wire.GridShift),
		Tuning:                &cfg,
		Gamemodes:             gamemodes,
		Rand:                  rng,
		Ctrl:                  ctrlTable,
		Guns:                  gunTable,
		Defs:                  set,
		RefreshBodyAttributes: definer.RefreshBodyAttributes,
	})
	if err != nil {
		return nil, nil, fmt.Errorf("starting life: %w", err)
	}

	r, err := room.NewRoom(room.RoomConfig{
		Tuning:          &cfg,
		Gamemodes:       gamemodes,
		Resolver:        res,
		Rand:            rng,
		Now:             func() int64 { return int64(s.ElapsedMS()) },
		Capacity:        4096,
		Maze:            wire.NewMazeAdapter(rng),
		Definer:         definer,
		Attach:          definer,
		Lifegiver:       lg,
		ForceCheckUsers: opts.CheckUsers,
		OnError: func(err error) {
			if s.Hooks.Error != nil {
				s.Hooks.Error(err)
			}
		},
	})
	if err != nil {
		return nil, nil, fmt.Errorf("building room: %w", err)
	}

	roomForProbe = r

	if os.Getenv("GOTRACE_POOLS") != "" {
		pool := r.Pools.Default
		fmt.Fprintln(os.Stderr, fmt.Sprintf("POOL room w=%v h=%v tw=%v th=%v xg=%d yg=%d", r.Geometry.Width(), r.Geometry.Height(), r.Geometry.TileWidth, r.Geometry.TileHeight, r.Geometry.XGrid, r.Geometry.YGrid))
		fmt.Fprintln(os.Stderr, "POOL spawnableDefault n="+strconv.Itoa(len(pool)))
		for i, t := range pool {
			fmt.Fprintln(os.Stderr, "POOL "+strconv.Itoa(i)+" x="+strconv.Itoa(t.GridX)+
				" y="+strconv.Itoa(t.GridY)+" name="+t.Type.DisplayName)
		}
	}

	mark("afterNewRoom")

	gm := r.Gamemodes
	r.ScheduleGamemodeStart()

	mark("afterGamemodeStart")

	wire.FinishLife(s, lg, r)
	if os.Getenv("GOTRACE_HOOKS") != "" {
		countHooks(s, hookCounts)
	}
	gunDepsForProbe = lg.GunDeps
	gunDepsForProbe.World = r.World
	gunDepsProbeIsInit = true
	worldForProbe = r.World
	w := r.World

	fail := func(err error) {
		if err != nil && s.Hooks.Error != nil {
			s.Hooks.Error(err)
		}
	}
	probe := func(name string, f func()) func() {
		if os.Getenv("GOTRACE_PROBE") == "" {
			return f
		}
		return func() {
			a := rng.Calls()
			f()
			if b := rng.Calls(); b != a {
				fmt.Fprintln(os.Stderr, "PROBE", name, "+", b-a)
			}
		}
	}
	if r.Tuning.EnableFood {
		s.Loops.Food = probe("food", func() { fail(r.FoodLoop()) })
	}
	s.Loops.SyncedDelays = probe("synced", func() { fail(r.SyncedDelays()) })
	s.Loops.Room = probe("room", func() { fail(r.TickTiles(liveIDs(w))) })
	s.Loops.QuickLoop = probe("quickloop", gm.QuickLoop)

	s.Loops.Maintain = probe("maintain", func() {
		fail(gm.Loop())
		r.MaintainBots()
		fail(r.MaintainBosses())
	})

	s.Loops.Other = probe("other", func() { fail(r.TopUpBotsAndUpgrade()) })

	s.Loops.Broadcast = probe("broadcast", wire.BroadcastLoop(r, s, rng, nil, nil))

	s.Loops.Timers = func(untilMS float64, untilSeq uint64) { fail(r.RunTimers(untilMS, untilSeq)) }
	r.NextTimerSeq = s.NextTimerSeq

	return w, s, nil
}

func liveIDs(w *entity.World) []entity.EntityID {
	out := make([]entity.EntityID, 0, w.Live())
	w.EachLive(func(id entity.EntityID, _ *entity.Entity) { out = append(out, id) })
	return out
}

// splitModes mirrors run.js:167, including the empty-entry filter.
func splitModes(csv string) []string {
	var out []string
	for _, part := range strings.Split(csv, ",") {
		if p := strings.TrimSpace(part); p != "" {
			out = append(out, p)
		}
	}
	return out
}

const (
	// The harness's default room dimensions.
	roomWidth  = 32000
	roomHeight = 32000
)

// drawSite names the first frame outside internal/jsutil for one draw's stack --
// the line that actually asked for randomness, rather than the helper that served
// it. It mirrors what tools/harness/probe-drawsites.js does with a JS stack.
func drawSite(pcs []uintptr) string {
	frames := runtime.CallersFrames(pcs)
	for {
		fr, more := frames.Next()
		if fr.File == "" {
			break
		}
		// runtime reports slash-separated paths on every platform.
		if !strings.Contains(fr.File, "internal/jsutil") {
			short := fr.File
			if i := strings.LastIndex(short, "arrasgo"); i >= 0 {
				short = short[i+len("arrasgo")+1:]
			}
			return fmt.Sprintf("%s:%d %s", short, fr.Line, shortFunc(fr.Function))
		}
		if !more {
			break
		}
	}
	return "unknown"
}

func shortFunc(name string) string {
	if i := strings.LastIndex(name, "/"); i >= 0 {
		name = name[i+1:]
	}
	return name
}

func reportSites(tick int, tally map[string]int) {
	total := 0
	sites := make([]string, 0, len(tally))
	for k, n := range tally {
		total += n
		sites = append(sites, k)
	}
	sort.Slice(sites, func(a, b int) bool {
		if tally[sites[a]] != tally[sites[b]] {
			return tally[sites[a]] > tally[sites[b]]
		}
		return sites[a] < sites[b]
	})
	fmt.Fprintf(os.Stderr, "tick %d  draws %d\n", tick, total)
	for _, s := range sites {
		fmt.Fprintf(os.Stderr, "   %4d  %s\n", tally[s], s)
	}
}

// reportBots is the Go half of probe-drawsites.js's --dumpbots.
func reportBots(tick int, w *entity.World, s *sim.Sim) {
	w.EachLive(func(id entity.EntityID, e *entity.Entity) {
		if !w.Flag[id.Index].Has(entity.FlagBot) {
			return
		}
		levels := make([]int32, 0, len(e.Upgrades))
		for _, u := range e.Upgrades {
			levels = append(levels, u.Level)
		}
		fmt.Fprintln(os.Stderr, "BOT tick=", tick, "id=", e.WireID, "label="+e.Label,
			"lvl=", e.Skill.Level, "score=", e.Skill.Score,
			"hwl=", e.Settings.HealthWithLevel, "core=", e.CoreSize, "SIZE=", e.SIZE,
			"sizeMul=", e.SizeMultiplier, "hpmax=", e.Health.Max, "shmax=", e.Shield.Max,
			"ups=", len(e.Upgrades), "guns=", len(e.Guns), "ctrls=", len(e.Controllers),
			"facing=", e.Facing, "facingType="+e.FacingType,
			"target=", e.Control.Target, "goal=", e.Control.Goal,
			"main=", e.Control.Main, "fire=", e.Control.Fire, "alt=", e.Control.Alt,
			"fov=", e.Fov, "FOV=", e.FOV, "topSpeed=", e.TopSpeed, "alpha=", e.Alpha,
			"team=", e.Team, "danger=", e.DangerValue, "ctrl=", ctrlStates(e), "track=", gunTracking(e))
	})
}

// ctrlTableForProbe is set by buildWorld so reportBots can read controller state.
var (
	ctrlTableForProbe *ctrl.Table
	worldForProbe     *entity.World
	roomForProbe      *room.Room
	// hookCounts is GOTRACE_HOOKS' tally, alongside the other probe state in this
	// diagnostic binary. See countHooks.
	hookCounts = hookTally{}
)

// lastWallCount is reportWalls' previous answer. The probe prints only when the list
// changes, the way the JS side does.
var lastWallCount = -1

// reportWalls dumps global.walls whenever its length changes, to line up against
// `node tools/harness/probe-drawsites.js --walls`. GOTRACE_WALLS=1 turns it on.
func reportWalls(tick int, w *entity.World) {
	if roomForProbe == nil || len(roomForProbe.Walls) == lastWallCount {
		return
	}
	lastWallCount = len(roomForProbe.Walls)
	fmt.Fprintln(os.Stderr, "WALLS tick="+strconv.Itoa(tick)+" n="+strconv.Itoa(lastWallCount))
	for _, wall := range roomForProbe.Walls {
		e := w.Get(wall.ID)
		if e == nil {
			continue
		}
		pos := w.Pos[wall.ID.Index]
		edges := make([]string, 0, 4)
		for _, edge := range wall.Box.Hitbox {
			edges = append(edges, fmt.Sprintf("%.6f,%.6f|%.6f,%.6f",
				edge[0].X, edge[0].Y, edge[1].X, edge[1].Y))
		}
		fmt.Fprintln(os.Stderr, fmt.Sprintf(
			"WALL id=%d x=%v y=%v size=%v SIZE=%v coreSize=%v angle=%v r=%v hb=%s",
			e.WireID, pos.X, pos.Y, w.Size[wall.ID.Index], e.SIZE, e.CoreSize,
			e.Angle, wall.Box.HitboxRadius, strings.Join(edges, " ")))
	}
}

func ctrlStates(e *entity.Entity) string {
	if ctrlTableForProbe == nil {
		return "(no table)"
	}
	out := ""
	for _, cid := range e.Controllers {
		st := ctrlTableForProbe.State(cid)
		if st == nil {
			continue
		}
		lock := "nil"
		if st.TargetLock.Valid() && worldForProbe != nil {
			if le := worldForProbe.Get(st.TargetLock); le != nil {
				lock = fmt.Sprintf("%d(%s/%s)", le.WireID, le.Type, le.Label)
			}
		}
		out += fmt.Sprintf("{%v tick=%d lead=%v lock=%s} ",
			ctrlTableForProbe.Kind(cid), st.TargetTick, st.TargetLead, lock)
	}
	return out
}

func reportEnt(tick, wireID int, w *entity.World) {
	w.EachLive(func(id entity.EntityID, e *entity.Entity) {
		if int(e.WireID) != wireID {
			return
		}
		p, v := w.Pos[id.Index], w.Vel[id.Index]
		fmt.Fprintln(os.Stderr, "ENT tick=", tick, "id=", e.WireID, "label="+e.Label,
			"active=", e.Activation.Active, "timer=", e.Activation.Timer,
			"x=", p.X, "y=", p.Y, "vx=", v.X, "vy=", v.Y,
			"inGrid=", w.Flag[id.Index].Has(entity.FlagInGrid), "box=", w.Boxes[id.Index],
			"range=", e.Range, "diesAtRange=", e.Settings.DiesAtRange, "hp=", e.Health.Amount,
			"dals=", e.Settings.DiesAtLowSpeed, "topSpeed=", e.TopSpeed, "vlen=", v.Length(), "coll=", len(e.CollisionArray), "dmgRecv=", e.DamageReceived,
			"size=", w.Size[id.Index],
			"facing=", e.Facing, "target=", e.Control.Target, "goal=", e.Control.Goal,
			"fire=", e.Control.Fire, "main=", e.Control.Main, "arc=", e.FiringArc,
			"power=", e.Control.Power, "accel=", w.Accel[id.Index],
			"ctrl=", ctrlStates(e), circleStates(e))
	})
}

// circleStates prints the io_moveInCircles half of each controller's state, which
// ctrlStates leaves out because it is aimed at targeting bugs.
func circleStates(e *entity.Entity) string {
	if ctrlTableForProbe == nil {
		return "(no table)"
	}
	out := ""
	for _, cid := range e.Controllers {
		st := ctrlTableForProbe.State(cid)
		if st == nil {
			continue
		}
		out += fmt.Sprintf("{%v timer=%d pathAngle=%v goal=%v spinA=%v idle=%v} ",
			ctrlTableForProbe.Kind(cid), st.CirclesTimer, st.CirclesPathAngle, st.CirclesGoal,
			st.SpinA, st.SpinOnlyWhenIdle)
	}
	return out
}

// gunTableForProbe mirrors ctrlTableForProbe for guns.
var (
	gunTableForProbe   *guns.Table
	gunDepsForProbe    guns.Deps
	gunDepsProbeIsInit bool
)

func gunTracking(e *entity.Entity) string {
	if !gunDepsProbeIsInit {
		return "(no deps)"
	}
	out := ""
	for _, gid := range e.Guns {
		g := gunTableForProbe.Get(gid)
		if g == nil {
			continue
		}
		speed, rang := guns.GetTracking(gunDepsForProbe, g)
		out += fmt.Sprintf("{canShoot=%v speed=%v range=%v} ", g.CanShoot, speed, rang)
	}
	return out
}

// deepSite is drawSite with the next few frames kept, for when the immediate caller
// is a shared helper and the question is who called it.
func deepSite(pcs []uintptr) string {
	frames := runtime.CallersFrames(pcs)
	var out []string
	for len(out) < 6 {
		fr, more := frames.Next()
		if fr.File == "" {
			break
		}
		if !strings.Contains(fr.File, "internal/jsutil") {
			out = append(out, fmt.Sprintf("%s:%d", shortFunc(fr.Function), fr.Line))
		}
		if !more {
			break
		}
	}
	return strings.Join(out, " <- ")
}

// hookTally is the GOTRACE_HOOKS counter map.
type hookTally map[string]int

// countHooks wraps the five hooks whose bodies internal/wire fills in late, so a run
// can report whether they were reached at all. Each wrapper calls through, so this
// changes nothing about the simulation.
func countHooks(s *sim.Sim, n hookTally) {
	if f := s.Hooks.Zombify; f != nil {
		s.Hooks.Zombify = func(id entity.EntityID) { n["zombify"]++; f(id) }
	}
	if f := s.Hooks.ShootOnDeath; f != nil {
		// The hook is called on every death, so the invocation count is just the
		// death count. What matters is how many of those deaths had a gun with the
		// flag set. That is the count a differential actually exercises.
		s.Hooks.ShootOnDeath = func(id entity.EntityID) {
			n["shootOnDeath"]++
			if e := s.W.Get(id); e != nil && gunTableForProbe != nil {
				for _, gid := range e.Guns {
					if g := gunTableForProbe.Get(gid); g != nil && g.ShootOnDeath {
						n["shootOnDeath-armed"]++
					}
				}
			}
			f(id)
		}
	}
	if f := s.Hooks.Necro; f != nil {
		s.Hooks.Necro = func(tank, food entity.EntityID) bool {
			n["necro"]++
			ok := f(tank, food)
			if ok {
				n["necro-converted"]++
			}
			return ok
		}
	}
	if f := s.Hooks.RefreshBodyAttributes; f != nil {
		s.Hooks.RefreshBodyAttributes = func(id entity.EntityID) { n["assemblerMerge"]++; f(id) }
	}
	if f := s.Hooks.SpawnAssemblerEffect; f != nil {
		s.Hooks.SpawnAssemblerEffect = func(p entity.EntityID, vx, vy, size float64) {
			n["assemblerEffect"]++
			f(p, vx, vy, size)
		}
	}
}
