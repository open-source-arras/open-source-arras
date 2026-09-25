package wire

import (
	"context"
	"math"
	stdnet "net"
	"net/http"
	"net/http/httptest"
	"testing"
	"time"

	"github.com/gorilla/websocket"

	"arrasgo/internal/entity"
	"arrasgo/internal/net"
)

func testOptions(seed uint64, modes ...string) Options {
	return Options{
		Seed:      seed,
		Gamemodes: modes,
		Now:       func() float64 { return 0 },
		WorldNow:  func() int64 { return 0 },
	}
}

func mustBoot(t *testing.T, opts Options) *Game {
	t.Helper()
	g, err := Boot(opts)
	if err != nil {
		t.Fatalf("Boot: %v", err)
	}
	t.Cleanup(g.Shutdown)
	return g
}

// TestBootDrawsMatchNode pins boot figures against Node.
func TestBootDrawsMatchNode(t *testing.T) {
	g := mustBoot(t, testOptions(1, "ffa"))

	if got := g.Draws.AfterDefinitions; got != 219 {
		t.Errorf("definition loading drew %d, Node draws 219. Either the boot order "+
			"moved -- something now draws before the definitions do -- or "+
			"internal/defs changed; see docs/verification.md.", got)
	}
	if got := g.Room.World.Live(); got != 120 {
		t.Errorf("tick 0 has %d entities, both servers place 120 "+
			"(24 Rock, 40 Stone, 56 Gravel)", got)
	}

	before := g.Rand.Calls()
	g.Sim.Step()
	if got := g.Rand.Calls() - before; got != 1 {
		t.Errorf("one tick drew %d, Node draws 1", got)
	}
}

// TestBootWiresEveryLoop guards against nil loops desynchronizing the stream.
func TestBootWiresEveryLoop(t *testing.T) {
	g := mustBoot(t, testOptions(1, "ffa"))
	for name, f := range map[string]func(){
		"Food":         g.Sim.Loops.Food,
		"SyncedDelays": g.Sim.Loops.SyncedDelays,
		"Room":         g.Sim.Loops.Room,
		"QuickLoop":    g.Sim.Loops.QuickLoop,
		"Maintain":     g.Sim.Loops.Maintain,
		"Other":        g.Sim.Loops.Other,
		"Broadcast":    g.Sim.Loops.Broadcast,
	} {
		if f == nil {
			t.Errorf("sim.Loops.%s is nil", name)
		}
	}
	if g.Sim.Loops.Timers == nil {
		t.Error("sim.Loops.Timers is nil")
	}
}

// TestUseDefinerFillsBothSeams verifies that Boot fills room's definition seams.
func TestUseDefinerFillsBothSeams(t *testing.T) {
	opts := testOptions(1, "ffa")
	opts.UseDefiner = true
	g, err := Boot(opts)
	if err != nil {
		t.Fatalf("Boot with a definer: %v", err)
	}
	t.Cleanup(g.Shutdown)
	if g.Room.Definer == nil {
		t.Error("room.Definer is still nil")
	}
	if g.Room.Attach == nil {
		t.Error("room.Attach is still nil")
	}
}

// TestServeWebsocketClient is end-to-end: listener, handshake, room command.
func TestServeWebsocketClient(t *testing.T) {
	g := mustBoot(t, testOptions(1, "ffa"))

	ln, err := stdnet.Listen("tcp", "127.0.0.1:0")
	if err != nil {
		t.Fatal(err)
	}
	httpSrv := &http.Server{Handler: g.Handler()}
	go func() { _ = httpSrv.Serve(ln) }()

	drawsBeforeRun := g.Rand.Calls()

	ctx, cancel := context.WithCancel(context.Background())
	roomDone := make(chan struct{})
	go func() { defer close(roomDone); g.Run(ctx) }()

	ws, _, err := websocket.DefaultDialer.Dial("ws://"+ln.Addr().String(), nil)
	if err != nil {
		t.Fatal(err)
	}

	if op := readOp(t, ws); op != net.OpSvWelcome {
		t.Fatalf("first frame is %q, want %q", op, net.OpSvWelcome)
	}

	if err := ws.WriteMessage(websocket.BinaryMessage, frame(t, net.S(net.OpClKey), net.S("hunter2"))); err != nil {
		t.Fatal(err)
	}
	if op := readOp(t, ws); op != net.OpSvKeyAccepted {
		t.Fatalf("answer to `k` is %q, want %q", op, net.OpSvKeyAccepted)
	}

	time.Sleep(250 * time.Millisecond)

	_ = ws.Close()
	shutdownCtx, cancelShutdown := context.WithTimeout(context.Background(), 5*time.Second)
	defer cancelShutdown()
	if err := httpSrv.Shutdown(shutdownCtx); err != nil {
		t.Errorf("http shutdown: %v", err)
	}
	cancel()
	select {
	case <-roomDone:
	case <-time.After(5 * time.Second):
		t.Fatal("the room goroutine did not stop when its context was cancelled")
	}
	g.Shutdown()

	ticks := g.Sim.Tick()
	if ticks == 0 {
		t.Fatal("the room goroutine never ticked while a client was connected")
	}

	if drawn := g.Rand.Calls() - drawsBeforeRun; drawn != ticks {
		t.Errorf("%d draws over %d ticks: a client connection is spending simulation "+
			"randomness", drawn, ticks)
	}
}

// TestHandlerAcceptsBracketedIPv6RemoteAddr covers the Game.Handler IPv6 shim.
func TestHandlerAcceptsBracketedIPv6RemoteAddr(t *testing.T) {
	g := mustBoot(t, testOptions(1, "ffa"))

	req := httptest.NewRequest(http.MethodGet, "/", nil)
	req.RemoteAddr = "[::1]:54321"
	rec := httptest.NewRecorder()
	g.Handler().ServeHTTP(rec, req)

	if rec.Code == http.StatusForbidden {
		t.Fatalf("an IPv6 client was refused before the upgrade (%d)", rec.Code)
	}
}

func TestHostOnly(t *testing.T) {
	for _, c := range []struct {
		in     string
		want   string
		wantOK bool
	}{
		{"127.0.0.1:5678", "127.0.0.1", true},
		{"[::1]:443", "::1", true},
		{"[2001:db8::1]:80", "2001:db8::1", true},
		{"127.0.0.1", "", false},
		{"", "", false},
		{":80", "", false},
	} {
		got, ok := hostOnly(c.in)
		if got != c.want || ok != c.wantOK {
			t.Errorf("hostOnly(%q) = %q, %v; want %q, %v", c.in, got, ok, c.want, c.wantOK)
		}
	}
}

func frame(t *testing.T, values ...net.Value) []byte {
	t.Helper()
	var b net.Builder
	f, err := b.Frame(values)
	if err != nil {
		t.Fatal(err)
	}
	out := make([]byte, len(f))
	copy(out, f)
	return out
}

func readOp(t *testing.T, ws *websocket.Conn) string {
	t.Helper()
	_ = ws.SetReadDeadline(time.Now().Add(5 * time.Second))
	typ, data, err := ws.ReadMessage()
	if err != nil {
		t.Fatal(err)
	}
	if typ != websocket.BinaryMessage {
		t.Fatalf("message type %d, want binary", typ)
	}
	op, _, ok := net.Opcode(net.Decode(data))
	if !ok {
		t.Fatalf("undecodable frame %x", data)
	}
	return op
}

// TestBulletKeepsAnUndefinedFov pins found-bugs.md #69.
func TestBulletKeepsAnUndefinedFov(t *testing.T) {
	g := mustBoot(t, testOptions(1, "ffa"))
	w := g.Sim.W

	bullet := w.Spawn()
	w.Flag[bullet.Index] |= entity.FlagLimited
	ordinary := w.Spawn()
	for _, id := range []entity.EntityID{bullet, ordinary} {
		e := w.Get(id)
		e.FOV = 1.5
		e.SIZE = 4
		e.CoreSize = 4
		if !math.IsNaN(e.Fov) {
			t.Fatalf("a fresh entity should start with an undefined (NaN) fov, got %v", e.Fov)
		}
	}

	g.Sim.Hooks.Life(bullet)
	g.Sim.Hooks.Life(ordinary)

	if got := w.Get(bullet).Fov; !math.IsNaN(got) {
		t.Errorf("bullet fov = %v, want NaN -- bulletEntity.updateBodyInfo is empty", got)
	}
	if got := w.Get(ordinary).Fov; math.IsNaN(got) {
		t.Error("a non-bullet must still get a real fov from entity.js:623")
	}
}
