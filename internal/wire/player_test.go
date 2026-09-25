package wire

import (
	"context"
	stdnet "net"
	"net/http"
	"testing"
	"time"

	"github.com/gorilla/websocket"

	"arrasgo/internal/entity"
	"arrasgo/internal/net"
)

// TestPlayerReachesTheGame verifies the full join sequence over websocket.
func TestPlayerReachesTheGame(t *testing.T) {
	opts := testOptions(1, "ffa")
	opts.UseDefiner = true
	g := mustBoot(t, opts)

	ln, err := stdnet.Listen("tcp", "127.0.0.1:0")
	if err != nil {
		t.Fatal(err)
	}
	httpSrv := &http.Server{Handler: g.Handler()}
	go func() { _ = httpSrv.Serve(ln) }()

	ctx, cancel := context.WithCancel(context.Background())
	roomDone := make(chan struct{})
	go func() { defer close(roomDone); g.Run(ctx) }()

	ws, _, err := websocket.DefaultDialer.Dial("ws://"+ln.Addr().String(), nil)
	if err != nil {
		t.Fatal(err)
	}
	defer func() {
		_ = ws.Close()
		shutdownCtx, cancelShutdown := context.WithTimeout(context.Background(), 5*time.Second)
		defer cancelShutdown()
		_ = httpSrv.Shutdown(shutdownCtx)
		cancel()
		<-roomDone
		g.Shutdown()
	}()

	expect(t, ws, net.OpSvWelcome)
	send(t, ws, net.S(net.OpClKey), net.S(""))
	expect(t, ws, net.OpSvKeyAccepted)

	send(t, ws, net.S(net.OpClSpawn), net.S(""), net.N(1), net.N(0), net.B(false), net.N(0))

	cam := expectMsg(t, ws, net.OpSvUplink)
	if len(cam) != 3 || cam[0].Num != 1 {
		t.Fatalf("the frame before R is %v, want the camera-only form ([true, x, y])", cam)
	}

	room := expectMsg(t, ws, net.OpSvRoomSetup)
	setup, err := net.ParseSvRoomSetup(room)
	if err != nil {
		t.Fatalf("parsing R: %v", err)
	}
	if setup.Width <= 0 || setup.Height <= 0 {
		t.Errorf("R reports a %vx%v room", setup.Width, setup.Height)
	}
	if setup.TilesJSON == "" || setup.TilesJSON == "[]" {
		t.Errorf("R carries no tile grid: %q", setup.TilesJSON)
	}
	if setup.BlackoutJSON != "{}" {
		t.Errorf("R blackout is %q, want %q on a gamemode that sets neither key",
			setup.BlackoutJSON, "{}")
	}

	send(t, ws, net.S(net.OpClSpawn), net.S("Tester"), net.N(0), net.N(0), net.B(false), net.N(0))

	deadline := time.Now().Add(5 * time.Second)
	sawCamera := false
	for !sawCamera && time.Now().Before(deadline) {
		op, _ := readMsg(t, ws)
		if op == net.OpSvForceCamera {
			sawCamera = true
		}
	}
	if !sawCamera {
		t.Fatal("no `c` after the spawn request: preparePlayer never ran")
	}

	sawMockup := false
	entities := -1
	var first net.GUIBlock
	for entities <= 0 && time.Now().Before(deadline) {
		op, m := readMsg(t, ws)
		switch op {
		case net.OpSvMockup:
			sawMockup = true
		case net.OpSvUplink:
			if len(m) == 3 {
				continue
			}
			u, err := net.ParseSvUplink(m)
			if err != nil {
				t.Fatalf("parsing u: %v", err)
			}
			entities = len(u.Entities)
			first = u.GUI
		}
	}
	if entities <= 0 {
		t.Fatalf("every uplink reported %d entities: the client sees an empty world", entities)
	}
	if !sawMockup {
		t.Error("no `M` reached the client, so every entity would draw as the placeholder")
	}

	if !first.HasClass || first.Class == "" {
		t.Errorf("the first uplink names no class; the HUD would read empty (mask %#x)", first.Mask())
	}
	if !first.HasScore {
		t.Errorf("the first uplink carries no score block (mask %#x)", first.Mask())
	}
	if !first.HasStats {
		t.Errorf("the first uplink carries no stat table, so no upgrade sliders (mask %#x)", first.Mask())
	}
	if !first.HasSkills || len(first.Skills) < 20 {
		t.Errorf("skills hex is %q, want twenty characters", first.Skills)
	}
	if !first.HasLabel || first.Color == "" {
		t.Errorf("the first uplink has no label/colour pair (mask %#x)", first.Mask())
	}
	for i, title := range first.StatTitles {
		if title == "" {
			t.Errorf("stat %d has no title; the slider would be unlabelled", i)
		}
	}
}

// TestInstallPlayersWiresTheSimHooks verifies player hooks are registered.
func TestInstallPlayersWiresTheSimHooks(t *testing.T) {
	g := mustBoot(t, testOptions(1, "ffa"))
	if g.Players == nil {
		t.Fatal("Boot did not install the player hooks")
	}
	if g.Sim.Hooks.TakeSelfie == nil {
		t.Error("sim.Hooks.TakeSelfie is nil; no photo is ever built and every view is empty")
	}
	if g.Sim.Hooks.ViewCheck == nil {
		t.Error("sim.Hooks.ViewCheck is nil; subFunctions.js:20 has no views to ask")
	}
	if g.Sim.Hooks.Tracked == nil {
		t.Error("sim.Hooks.Tracked is nil; entity.js:121's v.add never runs")
	}
	if g.Sim.Loops.Views == nil {
		t.Error("sim.Loops.Views is nil; gameloop's client sweep never runs")
	}
	for name, fn := range map[string]any{
		"Connected":    g.Sockets.Hooks.Connected,
		"Disconnected": g.Sockets.Hooks.Disconnected,
		"NeedsRoom":    g.Sockets.Hooks.NeedsRoom,
		"SpawnRequest": g.Sockets.Hooks.SpawnRequest,
		"Target":       g.Sockets.Hooks.Target,
		"Commands":     g.Sockets.Hooks.Commands,
	} {
		if fn == nil {
			t.Errorf("net.Hooks.%s is nil", name)
		}
	}
}

// TestViewCheckIsFalseWithNobodyWatching verifies headless mode is unaffected.
func TestViewCheckIsFalseWithNobodyWatching(t *testing.T) {
	g := mustBoot(t, testOptions(1, "ffa"))
	for _, id := range g.Sim.Tracked() {
		if g.Sim.Hooks.ViewCheck(id, 0.6) {
			t.Fatalf("entity %v is visible to nobody's view", id)
		}
		break
	}
	g.Sim.Hooks.Tracked(entity.EntityID{})
	g.Players.destroyed(entity.EntityID{})
}

func send(t *testing.T, ws *websocket.Conn, vals ...net.Value) {
	t.Helper()
	if err := ws.WriteMessage(websocket.BinaryMessage, frame(t, vals...)); err != nil {
		t.Fatal(err)
	}
}

func readMsg(t *testing.T, ws *websocket.Conn) (string, []net.Value) {
	t.Helper()
	if err := ws.SetReadDeadline(time.Now().Add(5 * time.Second)); err != nil {
		t.Fatal(err)
	}
	_, data, err := ws.ReadMessage()
	if err != nil {
		t.Fatalf("reading a frame: %v", err)
	}
	m := net.Decode(data)
	if m == nil {
		t.Fatalf("undecodable frame of %d bytes", len(data))
	}
	op, rest, ok := net.Opcode(m)
	if !ok {
		t.Fatalf("frame has no opcode: %v", m)
	}
	return op, rest
}

func expect(t *testing.T, ws *websocket.Conn, want string) {
	t.Helper()
	expectMsg(t, ws, want)
}

func expectMsg(t *testing.T, ws *websocket.Conn, want string) []net.Value {
	t.Helper()
	op, m := readMsg(t, ws)
	if op != want {
		t.Fatalf("frame is %q, want %q", op, want)
	}
	return m
}
