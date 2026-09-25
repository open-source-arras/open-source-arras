package wire

import (
	"context"
	"fmt"
	"net/http"
	"strings"
	"time"

	"arrasgo/internal/config"
	"arrasgo/internal/ctrl"
	"arrasgo/internal/defs"
	"arrasgo/internal/entity"
	"arrasgo/internal/guns"
	"arrasgo/internal/jsutil"
	"arrasgo/internal/net"
	"arrasgo/internal/room"
	"arrasgo/internal/sim"
	"arrasgo/internal/spatial"
)

// game.go builds one room, its simulation and transport on the single goroutine.

const (
	GridShift    = 7
	commandBurst = 512
)

type Options struct {
	Tuning     *config.Tuning
	Gamemodes  []string
	Seed       uint64
	Capacity   int
	Definer    room.Definer
	Attach     room.ControllerAttacher
	UseDefiner bool
	Now        func() float64
	WorldNow   func() int64
}

type BootDraws struct {
	AfterDefinitions   uint64
	AfterNewRoom       uint64
	AfterGamemodeStart uint64
}

type Game struct {
	Room    *room.Room
	Sim     *sim.Sim
	Net     *net.Server
	Sockets *net.Manager
	Comms   *Comms
	Maze    *MazeAdapter
	Players *Players
	Rand    *jsutil.Rand
	Draws   BootDraws
}

// Boot initializes the game room, simulation, and network stack.
func Boot(opts Options) (*Game, error) {
	tuning := opts.Tuning
	if tuning == nil {
		t, err := config.Default()
		if err != nil {
			return nil, fmt.Errorf("wire: loading config: %w", err)
		}
		tuning = &t
	}

	start := time.Now()
	now := opts.Now
	if now == nil {
		now = func() float64 { return float64(time.Since(start)) / float64(time.Millisecond) }
	}
	worldNow := opts.WorldNow
	if worldNow == nil {
		worldNow = func() int64 { return int64(time.Since(start) / time.Millisecond) }
	}

	rng := jsutil.NewRand(opts.Seed)

	g := &Game{
		Rand:  rng,
		Comms: &Comms{},
		Maze:  NewMazeAdapter(rng),
		Net:   net.NewServer(net.ServerConfig{}, jsutil.NewRand(opts.Seed^connIDSeedOffset)),
	}

	g.Sockets = net.NewManager(net.ManagerConfig{}, now)
	g.Comms.Srv, g.Comms.Mgr = g.Net, g.Sockets

	set, err := defs.Load(rng)
	if err != nil {
		return nil, fmt.Errorf("wire: loading definitions: %w", err)
	}
	res, err := defs.NewResolver(set, rng)
	if err != nil {
		return nil, fmt.Errorf("wire: building resolver: %w", err)
	}
	g.Draws.AfterDefinitions = rng.Calls()

	definer, attach := opts.Definer, opts.Attach
	var parts DefinerParts
	if definer == nil && opts.UseDefiner {
		definer, attach, parts, err = NewDefiner(set, tuning, rng, opts.Gamemodes)
		if err != nil {
			return nil, fmt.Errorf("wire: building definer: %w", err)
		}
	}

	var s *sim.Sim
	s, lg, err := StartLife(LifeOptions{
		Grid:      spatial.New(GridShift),
		Tuning:    tuning,
		Gamemodes: opts.Gamemodes,
		Rand:      rng,
		Ctrl:      parts.Ctrl,
		Guns:      parts.Guns,
		Defs:      set,

		RefreshBodyAttributes: parts.RefreshBodyAttributes,
		OnError: func(err error) {
			if s != nil && s.Hooks.Error != nil {
				s.Hooks.Error(err)
			}
		},
	})
	if err != nil {
		return nil, err
	}

	r, err := room.NewRoom(room.RoomConfig{
		Tuning:    tuning,
		Gamemodes: opts.Gamemodes,
		Resolver:  res,
		Rand:      rng,
		Now:       worldNow,
		Capacity:  opts.Capacity,
		Definer:   definer,
		Attach:    attach,
		Lifegiver: lg,
		Comms:     g.Comms,
		Maze:      g.Maze,
		OnError: func(err error) {
			if s.Hooks.Error != nil {
				s.Hooks.Error(err)
			}
		},
	})
	if err != nil {
		return nil, fmt.Errorf("wire: building room: %w", err)
	}
	g.Room = r
	g.Comms.Room = r
	g.Draws.AfterNewRoom = rng.Calls()

	g.Sockets.Cfg = net.ManagerConfigFrom(&r.Tuning)
	g.Sockets.Cfg.ArenaClosed = r.ArenaClosed

	gm := r.Gamemodes
	r.ScheduleGamemodeStart()
	g.Draws.AfterGamemodeStart = rng.Calls()

	FinishLife(s, lg, r)
	g.Sim = s

	g.Players = InstallPlayers(g, r, s, lg)

	fail := func(err error) {
		if err != nil && s.Hooks.Error != nil {
			s.Hooks.Error(err)
		}
	}
	if r.Tuning.EnableFood {
		s.Loops.Food = func() { fail(r.FoodLoop()) }
	}
	s.Loops.SyncedDelays = func() { fail(r.SyncedDelays()) }
	s.Loops.Room = func() { fail(r.TickTiles(liveIDs(r.World))) }
	s.Loops.QuickLoop = gm.QuickLoop
	s.Loops.Maintain = func() {
		fail(gm.Loop())
		r.MaintainBots()
		fail(r.MaintainBosses())
	}
	s.Loops.Other = func() {
		fail(r.TopUpBotsAndUpgrade())
		g.Players.chatLoop()
	}
	s.Loops.Broadcast = BroadcastLoop(r, s, rng, g.Sockets, g.Players)
	s.Loops.Timers = func(untilMS float64, untilSeq uint64) {
		fail(r.RunTimers(untilMS, untilSeq))
		g.Players.runControlTimers(untilMS, untilSeq)
	}
	r.NextTimerSeq = s.NextTimerSeq

	return g, nil
}

const connIDSeedOffset = 0x9e3779b97f4a7c15

type DefinerParts struct {
	Guns                  *guns.Table
	Ctrl                  *ctrl.Table
	RefreshBodyAttributes func(w *entity.World, id entity.EntityID)
}

func liveIDs(w *entity.World) []entity.EntityID {
	out := make([]entity.EntityID, 0, w.Live())
	w.EachLive(func(id entity.EntityID, _ *entity.Entity) { out = append(out, id) })
	return out
}

func (g *Game) Handler() http.Handler {
	return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		if host, ok := hostOnly(r.RemoteAddr); ok {
			r2 := *r
			r2.RemoteAddr = host
			r = &r2
		}
		g.Net.ServeHTTP(w, r)
	})
}

func hostOnly(addr string) (string, bool) {
	i := strings.LastIndexByte(addr, ':')
	if i < 0 {
		return "", false
	}
	host := addr[:i]
	if len(host) >= 2 && host[0] == '[' && host[len(host)-1] == ']' {
		host = host[1 : len(host)-1]
	}
	if host == "" {
		return "", false
	}
	return host, true
}

func (g *Game) Run(ctx context.Context) {
	ticker := time.NewTicker(g.Sim.CycleSpeed())
	defer ticker.Stop()

	cmds := g.Net.Commands()
	for {
		select {
		case <-ctx.Done():
			return
		case cmd := <-cmds:
			g.Sockets.Apply(cmd)
		case <-ticker.C:
			for i := 0; i < commandBurst; i++ {
				select {
				case cmd := <-cmds:
					g.Sockets.Apply(cmd)
				default:
					i = commandBurst
				}
			}
			g.Sim.Step()
		}
	}
}

func (g *Game) Shutdown() { g.Net.Shutdown() }
