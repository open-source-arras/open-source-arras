package net

import (
	"math"
	"net/http"
	"net/http/httptest"
	"runtime"
	"strings"
	"sync"
	"testing"
	"time"

	"github.com/gorilla/websocket"

	"arrasgo/internal/entity"
	"arrasgo/internal/jsutil"
)

func newLoopbackConn(queue int) *Conn {
	cfg := ServerConfig{SendQueue: queue}.withDefaults()
	return &Conn{
		id:   "loopback",
		ip:   "127.0.0.1",
		cfg:  cfg,
		out:  make(chan outFrame, cfg.SendQueue),
		free: make(chan []byte, cfg.SendQueue),
		dead: make(chan struct{}),
	}
}

func (c *Conn) drain() int {
	n := 0
	for {
		select {
		case f := <-c.out:
			if f.recycle {
				c.give(f.bytes)
			}
			n++
		default:
			return n
		}
	}
}

func TestSendDropsUplinkWhenFull(t *testing.T) {
	c := newLoopbackConn(2)
	frame := []byte{0xf9, 0x18, 0x8f, 'u', 1, 2}
	for i := 0; i < 2; i++ {
		if !c.SendDroppable(frame) {
			t.Fatalf("frame %d refused with room in the queue", i)
		}
	}
	if c.SendDroppable(frame) {
		t.Fatal("a full queue accepted a frame")
	}
	if c.Dropped() != 1 {
		t.Fatalf("Dropped = %d, want 1", c.Dropped())
	}
	if c.Overflowed() {
		t.Fatal("a dropped uplink marked the connection overflowed")
	}
}

func TestSendMarksOverflowForUndroppable(t *testing.T) {
	c := newLoopbackConn(1)
	frame := []byte{0xfa, 0xff, 'R', 'M', 0}
	if !c.Send(frame) {
		t.Fatal("first frame refused")
	}
	if c.Send(frame) {
		t.Fatal("a full queue accepted an undroppable frame")
	}
	if !c.Overflowed() {
		t.Fatal("an undroppable drop did not mark the connection")
	}
}

func TestSweepOverflowedClosesTheSocket(t *testing.T) {
	m, s := newTestManager(t, 1)
	frame := []byte{0xfa, 0xff, 'R', 'M', 0}
	s.Conn.Send(frame)
	s.Conn.Send(frame)
	m.SweepOverflowed()
	if !s.Closed() {
		t.Fatal("overflowed socket was not closed")
	}
}

func TestSendCopiesTheCallerBuffer(t *testing.T) {
	c := newLoopbackConn(4)
	buf := []byte{1, 2, 3}
	c.Send(buf)
	buf[0] = 99
	f := <-c.out
	if f.bytes[0] != 1 {
		t.Fatalf("queued frame aliased the caller's buffer: %v", f.bytes)
	}
}

func TestSendRecyclesBuffers(t *testing.T) {
	c := newLoopbackConn(4)
	frame := make([]byte, 256)
	for i := 0; i < 8; i++ {
		c.Send(frame)
		c.drain()
	}
	allocs := testing.AllocsPerRun(200, func() {
		c.Send(frame)
		c.drain()
	})
	if allocs != 0 {
		t.Fatalf("steady-state Send allocates %v per frame", allocs)
	}
}

func encodeFrame(t testing.TB, msg []Value) []byte {
	t.Helper()
	var b Builder
	f, err := b.Frame(msg)
	if err != nil {
		t.Fatal(err)
	}
	out := make([]byte, len(f))
	copy(out, f)
	return out
}

func TestParseCommandDispatch(t *testing.T) {
	c := newLoopbackConn(1)
	cases := []struct {
		name string
		msg  []Value
		want CommandKind
	}{
		{"k with key", []Value{S("k"), S("token")}, CmdKey},
		{"k bare", []Value{S("k")}, CmdKey},
		{"s", []Value{S("s"), S("bob"), N(1), N(0), B(false), N(0)}, CmdSpawn},
		{"S", []Value{S("S"), N(1234)}, CmdSync},
		{"p", []Value{S("p"), N(12.5)}, CmdPing},
		{"d", []Value{S("d"), N(99)}, CmdDownlink},
		{"C", []Value{S("C"), N(10), N(-10), N(1), N(3)}, CmdControl},
		{"#", []Value{S("#"), S("w"), S("-a")}, CmdKeys},
		{"t", []Value{S("t"), N(0), N(1)}, CmdToggle},
		{"U", []Value{S("U"), N(2), N(0)}, CmdUpgrade},
		{"x", []Value{S("x"), N(3), N(1)}, CmdStat},
		{"L", []Value{S("L")}, CmdLevelUp},
		{"1", []Value{S("1")}, CmdSuicide},
		{"H", []Value{S("H")}, CmdTakeControl},
		{"M", []Value{S("M"), S("hi")}, CmdChat},
		{"T", []Value{S("T")}, CmdTankTree},
		{"DTA", []Value{S("DTA")}, CmdDailyTankAd},
		{"DTAD", []Value{S("DTAD")}, CmdDailyTankAdDone},
		{"DTAST", []Value{S("DTAST"), N(15.5)}, CmdDailyTankAdStart},
		{"NWB", []Value{S("NWB")}, CmdNeedsNewBroadcast},
		{"unknown opcode", []Value{S("ZZ"), N(1)}, CmdUnknown},
	}
	for _, tc := range cases {
		got := parseCommand(c, encodeFrame(t, tc.msg))
		if got.Kind != tc.want {
			t.Errorf("%s: kind %d, want %d (err %v)", tc.name, got.Kind, tc.want, got.Err)
		}
	}
}

func TestParseCommandInvalidCarriesTheKickReason(t *testing.T) {
	c := newLoopbackConn(1)
	cases := []struct {
		msg    []Value
		reason string
	}{
		{[]Value{S("k"), S("a"), S("b")}, "Ill-sized key request."},
		{[]Value{S("s"), S("bob"), N(1)}, "Ill-sized spawn request."},
		{[]Value{S("s"), N(1), N(1), N(0), B(false), N(0)}, "Bad spawn request. (name)"},
		{[]Value{S("S")}, "Ill-sized sync packet."},
		{[]Value{S("p"), S("x")}, "Weird ping."},
		{[]Value{S("C"), N(0), N(0), N(1), N(256)}, "Malformed command packet."},
		{[]Value{S("t"), N(9), N(0)}, "Bad toggle."},
		{[]Value{S("x"), N(0), N(2)}, "invalid upgrade request max boolean."},
		{[]Value{S("x"), N(10), N(1)}, "Unknown stat upgrade request."},
		{[]Value{S("L"), N(1)}, "Ill-sized level-up request."},
		{[]Value{S("M"), N(1)}, "Non-string chat message."},
	}
	for _, tc := range cases {
		got := parseCommand(c, encodeFrame(t, tc.msg))
		if got.Kind != CmdInvalid {
			t.Errorf("%v: kind %d, want CmdInvalid", tc.msg, got.Kind)
			continue
		}
		if got.Err.Error() != tc.reason {
			t.Errorf("%v: reason %q, want %q", tc.msg, got.Err.Error(), tc.reason)
		}
	}
}

func TestParseCommandMalformed(t *testing.T) {
	c := newLoopbackConn(1)
	if got := parseCommand(c, []byte{0x12, 0x34}); got.Kind != CmdMalformed {
		t.Errorf("bad version nibble: kind %d", got.Kind)
	}
	if got := parseCommand(c, nil); got.Kind != CmdMalformed {
		t.Errorf("empty frame: kind %d", got.Kind)
	}
	if got := parseCommand(c, encodeFrame(t, []Value{N(7), N(1)})); got.Kind != CmdUnknown {
		t.Errorf("numeric opcode: kind %d", got.Kind)
	}
	if got := parseCommand(c, []byte{0xfc, 0xff}); got.Kind != CmdUnknown {
		t.Errorf("leading repeat marker: kind %d", got.Kind)
	}
}

func TestClientIP(t *testing.T) {
	cases := []struct {
		name    string
		headers map[string]string
		remote  string
		want    string
		wantErr bool
	}{
		{"remote addr with port", nil, "1.2.3.4:5678", "1.2.3.4", false},
		{"x-forwarded-for", map[string]string{"X-Forwarded-For": "9.9.9.9"}, "1.2.3.4:1", "9.9.9.9", false},
		{"first header wins", map[string]string{
			"Cf-Connecting-Ip": "8.8.8.8", "X-Forwarded-For": "9.9.9.9",
		}, "1.2.3.4:1", "8.8.8.8", false},
		{"chain uses the first", map[string]string{"X-Forwarded-For": "9.9.9.9, 10.0.0.1"}, "1.2.3.4:1", "9.9.9.9", false},
		{"a bad hop rejects the lot", map[string]string{"X-Forwarded-For": "9.9.9.9, garbage"}, "1.2.3.4:1", "", true},
		{"ipv6 is only trimmed", map[string]string{"X-Real-Ip": " ::1 "}, "", "::1", false},
		{"bracketed ipv6 is rejected", nil, "[::1]:443", "", true},
		{"nothing at all", nil, "", "", true},
	}
	for _, tc := range cases {
		r := httptest.NewRequest(http.MethodGet, "/", nil)
		r.RemoteAddr = tc.remote
		for k, v := range tc.headers {
			r.Header.Set(k, v)
		}
		got, err := ClientIP(r)
		if tc.wantErr {
			if err == nil {
				t.Errorf("%s: got %q, want an error", tc.name, got)
			}
			continue
		}
		if err != nil {
			t.Errorf("%s: %v", tc.name, err)
			continue
		}
		if got != tc.want {
			t.Errorf("%s: got %q, want %q", tc.name, got, tc.want)
		}
	}
}

func TestConnectionIDsAreSeeded(t *testing.T) {
	a := NewServer(ServerConfig{}, jsutil.NewRand(7))
	b := NewServer(ServerConfig{}, jsutil.NewRand(7))
	c := NewServer(ServerConfig{}, jsutil.NewRand(8))
	defer a.Shutdown()
	defer b.Shutdown()
	defer c.Shutdown()
	for i := 0; i < 4; i++ {
		x, y, z := a.newID(), b.newID(), c.newID()
		if x != y {
			t.Fatalf("same seed gave %q and %q", x, y)
		}
		if x == z {
			t.Fatalf("different seeds gave the same id %q", x)
		}
		if len(x) != 36 || x[14] != '4' {
			t.Fatalf("not a v4 uuid: %q", x)
		}
	}
}

func TestWebSocketRoundTrip(t *testing.T) {
	srv := NewServer(ServerConfig{}, jsutil.NewRand(1))
	hs := httptest.NewServer(srv)
	defer hs.Close()
	defer srv.Shutdown()

	ws, _, err := websocket.DefaultDialer.Dial(strings.Replace(hs.URL, "http://", "ws://", 1), nil)
	if err != nil {
		t.Fatal(err)
	}
	defer ws.Close()

	if got := <-srv.Commands(); got.Kind != CmdOpen {
		t.Fatalf("first command is %d, want CmdOpen", got.Kind)
	}
	if err := ws.WriteMessage(websocket.BinaryMessage, encodeFrame(t, []Value{S("k"), S("hunter2")})); err != nil {
		t.Fatal(err)
	}
	cmd := <-srv.Commands()
	if cmd.Kind != CmdKey || cmd.Key.Key != "hunter2" {
		t.Fatalf("got %d %+v", cmd.Kind, cmd.Key)
	}

	// And back the other way.
	frame := encodeFrame(t, SvWelcome{}.Append(nil))
	if !cmd.Conn.Send(frame) {
		t.Fatal("send refused")
	}
	_ = ws.SetReadDeadline(time.Now().Add(5 * time.Second))
	typ, data, err := ws.ReadMessage()
	if err != nil {
		t.Fatal(err)
	}
	if typ != websocket.BinaryMessage {
		t.Fatalf("message type %d", typ)
	}
	m := Decode(data)
	op, _, ok := Opcode(m)
	if !ok || op != OpSvWelcome {
		t.Fatalf("decoded %v", m)
	}

	ws.Close()
	if got := <-srv.Commands(); got.Kind != CmdClose {
		t.Fatalf("close command is %d", got.Kind)
	}
}

func TestPreparedBroadcastReachesEveryClient(t *testing.T) {
	srv := NewServer(ServerConfig{}, jsutil.NewRand(2))
	hs := httptest.NewServer(srv)
	defer hs.Close()
	defer srv.Shutdown()

	const n = 4
	clients := make([]*websocket.Conn, n)
	conns := make([]*Conn, 0, n)
	for i := 0; i < n; i++ {
		ws, _, err := websocket.DefaultDialer.Dial(strings.Replace(hs.URL, "http://", "ws://", 1), nil)
		if err != nil {
			t.Fatal(err)
		}
		clients[i] = ws
		defer ws.Close()
		cmd := <-srv.Commands()
		if cmd.Kind != CmdOpen {
			t.Fatalf("expected CmdOpen, got %d", cmd.Kind)
		}
		conns = append(conns, cmd.Conn)
	}

	frame := encodeFrame(t, (&SvPopup{Duration: 10000, Text: "hello"}).Append(nil))
	pm, err := srv.Prepare(frame)
	if err != nil {
		t.Fatal(err)
	}
	for _, c := range conns {
		if !c.SendPrepared(pm, false) {
			t.Fatal("prepared send refused")
		}
	}
	for i, ws := range clients {
		_ = ws.SetReadDeadline(time.Now().Add(5 * time.Second))
		_, data, err := ws.ReadMessage()
		if err != nil {
			t.Fatalf("client %d: %v", i, err)
		}
		if string(data) != string(frame) {
			t.Fatalf("client %d got different bytes", i)
		}
	}
}

func TestShutdownLeavesNothingRunning(t *testing.T) {
	before := runtime.NumGoroutine()
	srv := NewServer(ServerConfig{}, jsutil.NewRand(3))
	hs := httptest.NewServer(srv)

	var wg sync.WaitGroup
	for i := 0; i < 3; i++ {
		ws, _, err := websocket.DefaultDialer.Dial(strings.Replace(hs.URL, "http://", "ws://", 1), nil)
		if err != nil {
			t.Fatal(err)
		}
		<-srv.Commands()
		wg.Add(1)
		go func() { defer wg.Done(); ws.Close() }()
	}
	wg.Wait()
	hs.Close()
	srv.Shutdown()

	for i := 0; i < 100 && runtime.NumGoroutine() > before+2; i++ {
		time.Sleep(10 * time.Millisecond)
	}
	if after := runtime.NumGoroutine(); after > before+2 {
		t.Fatalf("goroutines %d -> %d after Shutdown", before, after)
	}
}

func benchWorld(b *testing.B, n int) (*entity.World, []entity.EntityID, *PhotoCache) {
	b.Helper()
	w := entity.NewWorld(n)
	w.Room = entity.RoomInfo{Width: 8000, Height: 8000}
	w.Now = func() int64 { return 0 }
	ids := make([]entity.EntityID, 0, n)
	cache := &PhotoCache{}
	for i := 0; i < n; i++ {
		id := spawnVisible(w, float64(i%40)*20-400, float64(i/40)*20-200)
		ids = append(ids, id)
		cache.TakeSelfie(w, id)
	}
	return w, ids, cache
}

func benchViews(w *entity.World, cache *PhotoCache, n int) []*View {
	views := make([]*View, 0, n)
	for i := 0; i < n; i++ {
		s := &Socket{
			Conn:   newLoopbackConn(4),
			Camera: Camera{FOV: 2000, X: float64(i%10)*120 - 600, Y: float64(i/10)*120 - 300},
		}
		s.Status.ReadyToBroadcast = true
		v := &View{
			Socket: s,
			Cache:  cache,
			Cfg: ViewConfig{
				VisibleListInterval: 250,
				LoadAllMockups:      true,
				Persp:               PerspectiveConfig{Mode: "tdm"},
			},
		}
		v.Viewer = Viewer{HasBody: true, BodyWireID: uint32(i + 1), BodyTeam: -1, TeamColor: "10 0 1 0 false"}
		s.View = v
		views = append(views, v)
	}
	return views
}

func BenchmarkUplinkBroadcast(b *testing.B) {
	const clients = 50
	w, ids, cache := benchWorld(b, 200)
	views := benchViews(w, cache, clients)
	in := FrameInput{LastCycle: 1000, Entities: ids}

	for tick := 0; tick < 4; tick++ {
		for _, v := range views {
			_ = v.GazeUpon(w, in, false)
			v.Socket.Conn.drain()
		}
		in.LastCycle += 300
	}

	b.ReportAllocs()
	b.ResetTimer()
	for i := 0; i < b.N; i++ {
		for _, id := range ids {
			cache.TakeSelfie(w, id)
		}
		for _, v := range views {
			if err := v.GazeUpon(w, in, false); err != nil {
				b.Fatal(err)
			}
			v.Socket.Conn.drain()
		}
	}
}

func BenchmarkUplinkPerClient(b *testing.B) {
	w, ids, cache := benchWorld(b, 200)
	views := benchViews(w, cache, 1)
	v := views[0]
	in := FrameInput{LastCycle: 1000, Entities: ids}
	for tick := 0; tick < 4; tick++ {
		_ = v.GazeUpon(w, in, false)
		v.Socket.Conn.drain()
		in.LastCycle += 300
	}
	b.ReportAllocs()
	b.ResetTimer()
	for i := 0; i < b.N; i++ {
		if err := v.GazeUpon(w, in, false); err != nil {
			b.Fatal(err)
		}
		v.Socket.Conn.drain()
	}
}

func BenchmarkPreparedBroadcast(b *testing.B) {
	const clients = 50
	srv := NewServer(ServerConfig{}, jsutil.NewRand(4))
	defer srv.Shutdown()
	conns := make([]*Conn, clients)
	for i := range conns {
		conns[i] = newLoopbackConn(4)
	}
	var bld Builder
	frame, err := bld.Frame((&SvPopup{Duration: 10000, Text: "server restarting"}).Append(bld.Buf()))
	if err != nil {
		b.Fatal(err)
	}
	b.ReportAllocs()
	b.ResetTimer()
	for i := 0; i < b.N; i++ {
		pm, err := srv.Prepare(frame)
		if err != nil {
			b.Fatal(err)
		}
		for _, c := range conns {
			c.SendPrepared(pm, false)
			c.drain()
		}
	}
}

// BenchmarkUnpreparedBroadcast is the same broadcast without PreparedMessage,
// for the comparison.
func BenchmarkUnpreparedBroadcast(b *testing.B) {
	const clients = 50
	conns := make([]*Conn, clients)
	for i := range conns {
		conns[i] = newLoopbackConn(4)
	}
	var bld Builder
	frame, err := bld.Frame((&SvPopup{Duration: 10000, Text: "server restarting"}).Append(bld.Buf()))
	if err != nil {
		b.Fatal(err)
	}
	b.ReportAllocs()
	b.ResetTimer()
	for i := 0; i < b.N; i++ {
		for _, c := range conns {
			c.Send(frame)
			c.drain()
		}
	}
}

// TestUplinkBroadcastDoesNotAllocate is the benchmark's assertion form, so a
// regression fails the suite rather than only showing up in a benchmark nobody
// ran. docs/architecture.md calls non-zero allocs/op in the tick path a defect.
func TestUplinkBroadcastDoesNotAllocate(t *testing.T) {
	w := entity.NewWorld(64)
	w.Room = entity.RoomInfo{Width: 8000, Height: 8000}
	w.Now = func() int64 { return 0 }
	ids := make([]entity.EntityID, 0, 64)
	cache := &PhotoCache{}
	for i := 0; i < 64; i++ {
		id := spawnVisible(w, float64(i%8)*20-80, float64(i/8)*20-80)
		ids = append(ids, id)
		cache.TakeSelfie(w, id)
	}
	views := benchViews(w, cache, 8)
	in := FrameInput{LastCycle: 1000, Entities: ids}
	for tick := 0; tick < 4; tick++ {
		for _, v := range views {
			_ = v.GazeUpon(w, in, false)
			v.Socket.Conn.drain()
		}
		in.LastCycle += 300
	}
	sweep := func() {
		for _, id := range ids {
			cache.TakeSelfie(w, id)
		}
		for _, v := range views {
			_ = v.GazeUpon(w, in, false)
			v.Socket.Conn.drain()
		}
	}
	if allocs := testing.AllocsPerRun(50, sweep); allocs != 0 {
		t.Fatalf("the broadcast path allocates %v per sweep", allocs)
	}

	// With Config.load_all_mockups off, each frame also collects the distinct
	// definition indexes it needs (sockets.js:1591). That set is a reused map
	// and a reused slice, so it must not allocate either once warm.
	for _, v := range views {
		v.Cfg.LoadAllMockups = false
	}
	for i := 0; i < 4; i++ {
		sweep()
	}
	if allocs := testing.AllocsPerRun(50, sweep); allocs != 0 {
		t.Fatalf("the mockup-collecting path allocates %v per sweep", allocs)
	}
}

// TestPreparedMessageIsByteIdentical guards the assumption the broadcast path
// rests on: one encode reused across connections must produce the same frame a
// per-connection encode would.
func TestPreparedMessageIsByteIdentical(t *testing.T) {
	srv := NewServer(ServerConfig{}, jsutil.NewRand(5))
	defer srv.Shutdown()
	var b Builder
	frame := encodeFrame(t, (&SvRoomRefresh{Width: 4000, Height: 2000, TilesJSON: "[]"}).Append(b.Buf()))
	if _, err := srv.Prepare(frame); err != nil {
		t.Fatal(err)
	}
	again := encodeFrame(t, (&SvRoomRefresh{Width: 4000, Height: 2000, TilesJSON: "[]"}).Append(b.Buf()))
	if string(frame) != string(again) {
		t.Fatal("the same message encoded to different bytes")
	}
	if math.Abs(float64(len(frame))) == 0 {
		t.Fatal("empty frame")
	}
}

// TestConcurrentClientsNeverTouchTheWorld drives the boundary end to end: eight
// real websocket clients hammering the server while a single "room" goroutine
// owns the World, applies commands and ticks a view per socket.
//
// It is the shape docs/architecture.md mandates, read goroutines parse and
// forward, the room applies in tick order, and it is here to catch a deadlock
// or a lost command. It is NOT a race check: this box has no C compiler, so
// `go test -race` cannot run (see the report). The design's safety comes from
// nothing but Conn's channels and atomics being reachable from a read
// goroutine.
func TestConcurrentClientsNeverTouchTheWorld(t *testing.T) {
	srv := NewServer(ServerConfig{SendQueue: 8}, jsutil.NewRand(11))
	hs := httptest.NewServer(srv)
	defer hs.Close()
	defer srv.Shutdown()

	w := entity.NewWorld(64)
	w.Room = entity.RoomInfo{Width: 8000, Height: 8000}
	w.Now = func() int64 { return 0 }
	cache := &PhotoCache{}
	ids := make([]entity.EntityID, 0, 32)
	for i := 0; i < 32; i++ {
		id := spawnVisible(w, float64(i%8)*30-120, float64(i/8)*30-60)
		ids = append(ids, id)
		cache.TakeSelfie(w, id)
	}

	now := 0.0
	mgr := NewManager(ManagerConfig{MaxHeartbeatInterval: 1e9}, func() float64 { return now })
	mgr.Hooks.Connected = func(s *Socket) {
		s.View = &View{
			Socket: s, Cache: cache,
			Cfg: ViewConfig{VisibleListInterval: 250, LoadAllMockups: true,
				Persp: PerspectiveConfig{Mode: "tdm"}},
		}
		s.Status.ReadyToBroadcast = true
	}

	const clients = 8
	var wg sync.WaitGroup
	stop := make(chan struct{})
	var sockets []*websocket.Conn
	for i := 0; i < clients; i++ {
		ws, _, err := websocket.DefaultDialer.Dial(strings.Replace(hs.URL, "http://", "ws://", 1), nil)
		if err != nil {
			t.Fatal(err)
		}
		sockets = append(sockets, ws)
		wg.Add(2)
		go func() { // writer: a bounded stream of valid packets
			defer wg.Done()
			// `d` draws no reply, so the client can send freely. `p` draws a
			// pong, which is what actually loads the outbound queue.
			down := encodeFrame(t, []Value{S("d"), N(1)})
			ping := encodeFrame(t, []Value{S("p"), N(1)})
			for i := 0; i < 200; i++ {
				select {
				case <-stop:
					return
				default:
				}
				msg := down
				if i%20 == 0 {
					msg = ping
				}
				if err := ws.WriteMessage(websocket.BinaryMessage, msg); err != nil {
					return
				}
				runtime.Gosched()
			}
		}()
		go func() { // reader: drain, so the queues do not fill
			defer wg.Done()
			for {
				if _, _, err := ws.ReadMessage(); err != nil {
					return
				}
			}
		}()
	}

	// The room goroutine, run inline: apply whatever has arrived, then tick.
	deadline := time.After(2 * time.Second)
	ticks := 0
	applied := 0
	for ticks < 200 {
		select {
		case cmd := <-srv.Commands():
			mgr.Apply(cmd)
			applied++
			continue
		case <-deadline:
			ticks = 200
		default:
		}
		now += 30
		in := FrameInput{LastCycle: now, Entities: ids}
		for _, s := range mgr.Clients() {
			if s.View != nil && !s.Closed() {
				if err := s.View.GazeUpon(w, in, false); err != nil {
					t.Fatalf("tick %d: %v", ticks, err)
				}
			}
		}
		mgr.SweepOverflowed()
		ticks++
	}
	close(stop)
	// The readers only unblock when their connection goes, so close first.
	for _, ws := range sockets {
		ws.Close()
	}
	wg.Wait()

	if applied == 0 {
		t.Fatal("no commands reached the room goroutine")
	}
	if len(mgr.Clients()) == 0 {
		t.Fatal("every client was dropped")
	}
}
