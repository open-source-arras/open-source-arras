package main

import (
	"context"
	"errors"
	"flag"
	"fmt"
	"log"
	"net"
	"net/http"
	"os"
	"os/signal"
	"strings"
	"syscall"
	"time"

	"arrasgo/internal/config"
	"arrasgo/internal/wire"
)

func main() {
	log.SetFlags(0)
	log.SetPrefix("")

	tuning, err := config.Default()
	if err != nil {
		log.Fatalln("server: loading config:", err)
	}

	host := flag.String("host", "", "address to bind (empty binds every interface)")
	port := flag.Int("port", tuning.Port, "TCP port to listen on")
	gamemode := flag.String("gamemode", "ffa", "comma-separated gamemodes, in the order game.js:286 merges them")
	seed := flag.Uint64("seed", 0, "PRNG seed; 0 draws one from the clock and prints it")
	useDefiner := flag.Bool("define", true,
		"apply definitions to spawned entities; --define=false serves positioned, sized, teamed entities with no stats, guns or controllers")
	flag.Parse()

	if *port < 0 || *port > 65535 {
		log.Fatalln("server: --port must be between 0 and 65535")
	}

	if *seed == 0 {
		*seed = uint64(time.Now().UnixNano())
	}

	g, err := wire.Boot(wire.Options{
		Tuning:     &tuning,
		Gamemodes:  splitModes(*gamemode),
		Seed:       *seed,
		UseDefiner: *useDefiner,
	})
	if err != nil {
		log.Fatalln("server:", err)
	}

	var tickErrors int
	g.Sim.Hooks.Error = func(err error) {
		tickErrors++
		if tickErrors <= 10 {
			log.Println("tick error:", err)
		}
		if tickErrors == 10 {
			log.Println("further tick errors suppressed")
		}
	}

	ln, err := net.Listen("tcp", fmt.Sprintf("%s:%d", *host, *port))
	if err != nil {
		log.Fatalln("server: listen:", err)
	}

	httpSrv := &http.Server{Handler: g.Handler()}

	ctx, stop := signal.NotifyContext(context.Background(), os.Interrupt, syscall.SIGTERM)
	defer stop()

	log.Printf("arras-go listening on %s (gamemode %s, seed %d, %d entities, %d rng draws)",
		ln.Addr(), *gamemode, *seed, g.Room.World.Live(), g.Rand.Calls())
	if !*useDefiner {
		log.Println("--define=false: entities get positions, sizes and teams but no " +
			"stats, guns or controllers")
	}

	roomDone := make(chan struct{})
	go func() {
		defer close(roomDone)
		g.Run(ctx) // the room goroutine; it alone touches the World
	}()

	serveErr := make(chan error, 1)
	go func() { serveErr <- httpSrv.Serve(ln) }()

	select {
	case <-ctx.Done():
		log.Println("shutting down")
	case err := <-serveErr:
		if err != nil && !errors.Is(err, http.ErrServerClosed) {
			log.Println("server: serve:", err)
		}
		stop()
	}

	shutdownCtx, cancel := context.WithTimeout(context.Background(), 5*time.Second)
	defer cancel()
	if err := httpSrv.Shutdown(shutdownCtx); err != nil {
		log.Println("server: http shutdown:", err)
	}
	<-roomDone
	g.Shutdown()

	if err := g.Comms.Err(); err != nil {
		log.Println("server: last send failure:", err)
	}
	if err := g.Maze.Err(); err != nil {
		log.Println("server: last maze failure:", err)
	}
	log.Printf("stopped after %d ticks, %d rng draws", g.Sim.Tick(), g.Rand.Calls())
}

func splitModes(csv string) []string {
	var out []string
	for _, part := range strings.Split(csv, ",") {
		if p := strings.TrimSpace(part); p != "" {
			out = append(out, p)
		}
	}
	return out
}
