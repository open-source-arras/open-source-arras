package net

import (
	"testing"
)

// newTestManager builds a Manager with a fake clock and one open socket.
func newTestManager(t testing.TB, queue int) (*Manager, *Socket) {
	t.Helper()
	now := 0.0
	m := NewManager(ManagerConfig{MaxHeartbeatInterval: 5000}, func() float64 { return now })
	c := newLoopbackConn(queue)
	m.Apply(Command{Kind: CmdOpen, Conn: c})
	s := m.Lookup(c)
	if s == nil {
		t.Fatal("CmdOpen did not create a Socket")
	}
	return m, s
}

// sentOps decodes and returns opcodes from the socket's output queue.
func sentOps(t testing.TB, s *Socket) []string {
	t.Helper()
	var ops []string
	for {
		select {
		case f := <-s.Conn.out:
			m := Decode(f.bytes)
			op, _, ok := Opcode(m)
			if !ok {
				t.Fatalf("queued frame has no opcode: %v", m)
			}
			ops = append(ops, op)
			s.Conn.give(f.bytes)
		default:
			return ops
		}
	}
}

func sentFrames(t testing.TB, s *Socket) [][]Value {
	t.Helper()
	var out [][]Value
	for {
		select {
		case f := <-s.Conn.out:
			out = append(out, Decode(f.bytes))
			s.Conn.give(f.bytes)
		default:
			return out
		}
	}
}

// TestConnectSendsWelcome is sockets.js:2235.
func TestConnectSendsWelcome(t *testing.T) {
	_, s := newTestManager(t, 8)
	if ops := sentOps(t, s); len(ops) != 1 || ops[0] != OpSvWelcome {
		t.Fatalf("connect sent %v, want [W]", ops)
	}
	st := s.Status
	if !st.Deceased || !st.NeedsFullMap || !st.NeedsNewBroadcast || !st.ReadyToSpawn {
		t.Fatalf("initial status wrong: %+v", st)
	}
	if st.Verified || st.HasSpawned || st.ReadyToBroadcast || st.ForceNewBroadcast {
		t.Fatalf("initial status wrong: %+v", st)
	}
	if s.Camera.FOV != 2000 {
		t.Fatalf("camera fov %v, want 2000", s.Camera.FOV)
	}
	if s.Phase() != PhaseConnecting {
		t.Fatalf("phase %d, want PhaseConnecting", s.Phase())
	}
}

// TestKeyHandshake is sockets.js:202-222.
func TestKeyHandshake(t *testing.T) {
	m, s := newTestManager(t, 8)
	m.Permissions["good"] = &Permission{Key: "good", Level: 2, NameColor: "#abcdef"}
	sentOps(t, s)

	m.Apply(Command{Kind: CmdKey, Conn: s.Conn, Key: ClKey{HasKey: true, Key: "nope"}})
	if ops := sentOps(t, s); len(ops) != 1 || ops[0] != OpSvKeyAccepted {
		t.Fatalf("bad token got %v, want [w]", ops)
	}
	if s.HasPermissions {
		t.Fatal("an unknown token granted permissions")
	}
	if !s.Status.Verified || s.Phase() != PhaseVerified {
		t.Fatalf("not verified: %+v phase %d", s.Status, s.Phase())
	}

	m.Apply(Command{Kind: CmdKey, Conn: s.Conn, Key: ClKey{}})
	if !s.Closed() {
		t.Fatal("a second k did not kick")
	}
}

func TestKeyGrantsPermissions(t *testing.T) {
	m, s := newTestManager(t, 8)
	m.Permissions["good"] = &Permission{Key: "good", Level: 3, InfiniteLevelUp: true}
	m.Apply(Command{Kind: CmdKey, Conn: s.Conn, Key: ClKey{HasKey: true, Key: "good"}})
	if !s.HasPermissions || s.Permissions.Level != 3 || !s.Permissions.InfiniteLevelUp {
		t.Fatalf("permissions not applied: %+v", s.Permissions)
	}
	if s.Key != "good" {
		t.Fatalf("key %q", s.Key)
	}
}

// TestSpawnGuardOrder pins sockets.js:225-250: alive check comes first.
func TestSpawnGuardOrder(t *testing.T) {
	m, s := newTestManager(t, 8)
	m.Cfg.Private = true
	sentOps(t, s)

	s.Status.Deceased = false
	m.Apply(Command{Kind: CmdSpawn, Conn: s.Conn, Spawn: ClSpawn{Name: "bob", NeedsRoom: 1}})
	if ops := sentOps(t, s); len(ops) != 0 {
		t.Fatalf("the alive guard sent %v, want nothing", ops)
	}
	if !s.Closed() {
		t.Fatal("spawning while alive did not kick")
	}
}

func TestSpawnPrivateServerMessage(t *testing.T) {
	m, s := newTestManager(t, 8)
	m.Cfg.Private = true
	sentOps(t, s)
	m.Apply(Command{Kind: CmdSpawn, Conn: s.Conn, Spawn: ClSpawn{Name: "bob", NeedsRoom: 1}})
	frames := sentFrames(t, s)
	if len(frames) != 1 {
		t.Fatalf("sent %d frames", len(frames))
	}
	op, rest, _ := Opcode(frames[0])
	if op != OpSvScreenMessage || rest[0].Str != "This server is private." {
		t.Fatalf("got %s %v", op, rest)
	}
	if !s.Closed() {
		t.Fatal("private server did not kick")
	}
}

// TestSpawnArenaClosed is sockets.js:259-265.
func TestSpawnArenaClosed(t *testing.T) {
	m, s := newTestManager(t, 8)
	m.Cfg.ArenaClosed = true
	sentOps(t, s)

	m.Apply(Command{Kind: CmdSpawn, Conn: s.Conn, Spawn: ClSpawn{Name: "bob", NeedsRoom: 0}})
	frames := sentFrames(t, s)
	if len(frames) != 1 {
		t.Fatalf("sent %d frames", len(frames))
	}
	op, rest, _ := Opcode(frames[0])
	if op != OpSvPopup || rest[0].Num != 5000 || rest[1].Str != "Arena Closed." {
		t.Fatalf("got %s %v", op, rest)
	}
	if s.Closed() {
		t.Fatal("a non-room spawn request while closed kicked")
	}
}

// TestSpawnStripsBannedCharacters is sockets.js:277.
func TestSpawnStripsBannedCharacters(t *testing.T) {
	m, s := newTestManager(t, 8)
	m.Cfg.BannedCharacters = "§¤"
	var got ClSpawn
	m.Hooks.SpawnRequest = func(_ *Socket, req ClSpawn) { got = req }
	m.Apply(Command{Kind: CmdSpawn, Conn: s.Conn, Spawn: ClSpawn{Name: "b§o¤b", NeedsRoom: 0}})
	if got.Name != "bob" {
		t.Fatalf("name %q, want %q", got.Name, "bob")
	}
}

func TestSpawnRoomRequestGoesToTheHook(t *testing.T) {
	m, s := newTestManager(t, 8)
	var room, spawn int
	m.Hooks.NeedsRoom = func(*Socket, ClSpawn) { room++ }
	m.Hooks.SpawnRequest = func(*Socket, ClSpawn) { spawn++ }
	m.Apply(Command{Kind: CmdSpawn, Conn: s.Conn, Spawn: ClSpawn{Name: "a", NeedsRoom: 1}})
	m.Apply(Command{Kind: CmdSpawn, Conn: s.Conn, Spawn: ClSpawn{Name: "a", NeedsRoom: 0}})
	if room != 1 || spawn != 1 {
		t.Fatalf("room=%d spawn=%d", room, spawn)
	}
}

// TestIncognitoFlagIsSetBothWays is sockets.js:258.
func TestIncognitoFlagIsSetBothWays(t *testing.T) {
	m, s := newTestManager(t, 8)
	m.Hooks.SpawnRequest = func(*Socket, ClSpawn) {}
	m.Apply(Command{Kind: CmdSpawn, Conn: s.Conn, Spawn: ClSpawn{Name: "a", Incognito: 1}})
	if !s.Status.Incognito {
		t.Fatal("incognito not set")
	}
	m.Apply(Command{Kind: CmdSpawn, Conn: s.Conn, Spawn: ClSpawn{Name: "a", Incognito: 0}})
	if s.Status.Incognito {
		t.Fatal("incognito not cleared")
	}
}

// TestSyncBouncesTheClientClock is sockets.js:328.
func TestSyncBouncesTheClientClock(t *testing.T) {
	now := 4321.0
	m := NewManager(ManagerConfig{MaxHeartbeatInterval: 5000}, func() float64 { return now })
	c := newLoopbackConn(8)
	m.Apply(Command{Kind: CmdOpen, Conn: c})
	s := m.Lookup(c)
	sentOps(t, s)

	m.Apply(Command{Kind: CmdSync, Conn: c, Sync: ClSync{Time: 999}})
	frames := sentFrames(t, s)
	op, rest, _ := Opcode(frames[0])
	if op != OpSvSync || rest[0].Num != 999 || rest[1].Num != 4321 {
		t.Fatalf("got %s %v", op, rest)
	}
}

// TestPongIsAStringAndBumpsTheHeartbeat is sockets.js:337.
func TestPongIsAStringAndBumpsTheHeartbeat(t *testing.T) {
	now := 0.0
	m := NewManager(ManagerConfig{MaxHeartbeatInterval: 5000}, func() float64 { return now })
	c := newLoopbackConn(8)
	m.Apply(Command{Kind: CmdOpen, Conn: c})
	s := m.Lookup(c)
	sentOps(t, s)

	now = 7777
	m.Apply(Command{Kind: CmdPing, Conn: c, Ping: ClPing{Payload: 12.34}})
	frames := sentFrames(t, s)
	op, rest, _ := Opcode(frames[0])
	if op != OpSvPong {
		t.Fatalf("op %s", op)
	}
	if rest[0].Kind != KindString || rest[0].Str != "12.3" {
		t.Fatalf("pong payload %+v, want the string \"12.3\"", rest[0])
	}
	if s.Status.LastHeartbeat != 7777 {
		t.Fatalf("lastHeartbeat %v", s.Status.LastHeartbeat)
	}
}

// TestDownlinkClearsReceiving is sockets.js:352-356.
func TestDownlinkClearsReceiving(t *testing.T) {
	now := 5000.0
	m := NewManager(ManagerConfig{MaxHeartbeatInterval: 5000}, func() float64 { return now })
	c := newLoopbackConn(8)
	m.Apply(Command{Kind: CmdOpen, Conn: c})
	s := m.Lookup(c)
	s.Status.Receiving = 4

	m.Apply(Command{Kind: CmdDownlink, Conn: c, Downlink: ClDownlink{Time: 4900}})
	if s.Status.Receiving != 0 {
		t.Fatalf("receiving %d", s.Status.Receiving)
	}
	if s.Camera.Ping != 100 {
		t.Fatalf("ping %v, want 100", s.Camera.Ping)
	}
	if !s.Camera.HasLastDowndate || s.Camera.LastDowndate != 5000 {
		t.Fatalf("lastDowndate %v", s.Camera.LastDowndate)
	}
}

// TestControlBits is sockets.js:391-397.
func TestControlBits(t *testing.T) {
	m, s := newTestManager(t, 8)
	m.Apply(Command{Kind: CmdControl, Conn: s.Conn, Control: ClCommand{TargetX: 5, TargetY: 6, Commands: 0x7f}})
	if s.Player.Command.Up || s.Player.Target.X != 0 {
		t.Fatal("a command with no body was applied")
	}

	s.Player.Body.Index, s.Player.Body.Gen = 0, 1 // any valid handle
	m.Apply(Command{Kind: CmdControl, Conn: s.Conn, Control: ClCommand{
		TargetX: 5, TargetY: 6, Commands: CommandUp | CommandLeft | CommandRMB,
	}})
	pc := s.Player.Command
	if !pc.Up || pc.Down || !pc.Left || pc.Right || pc.LMB || pc.MMB || !pc.RMB {
		t.Fatalf("bits wrong: %+v", pc)
	}
	if s.Player.Target.X != 5 || s.Player.Target.Y != 6 {
		t.Fatalf("target %+v", s.Player.Target)
	}
}

func TestToggleFlipsAndAnnounces(t *testing.T) {
	m, s := newTestManager(t, 8)
	var announced []string
	m.Hooks.Toggled = func(_ *Socket, _ int, name string, on bool) {
		if on {
			announced = append(announced, name+" enabled")
		} else {
			announced = append(announced, name+" disabled")
		}
	}
	m.Apply(Command{Kind: CmdToggle, Conn: s.Conn, Toggle: ClToggle{Index: ToggleAutospin, SendMessage: N(1)}})
	if s.Player.Command.Autospin {
		t.Fatal("a toggle with no body was applied")
	}

	s.Player.Body.Gen = 1
	m.Apply(Command{Kind: CmdToggle, Conn: s.Conn, Toggle: ClToggle{Index: ToggleAutospin, SendMessage: N(1)}})
	if !s.Player.Command.Autospin {
		t.Fatal("autospin not set")
	}
	m.Apply(Command{Kind: CmdToggle, Conn: s.Conn, Toggle: ClToggle{Index: ToggleAutospin, SendMessage: N(0)}})
	if s.Player.Command.Autospin {
		t.Fatal("autospin not cleared")
	}
	if len(announced) != 1 || announced[0] != "autospin enabled" {
		t.Fatalf("announced %v", announced)
	}
}

// TestDailyTankAdStartFallsThroughToNWB pins docs/protocol.md 2.4 #12.
func TestDailyTankAdStartFallsThroughToNWB(t *testing.T) {
	m, s := newTestManager(t, 8)
	m.Cfg.DailyTank = true
	sentOps(t, s)
	if s.Status.ForceNewBroadcast {
		t.Fatal("forceNewBroadcast starts set")
	}
	m.Apply(Command{Kind: CmdDailyTankAdStart, Conn: s.Conn, DailyTankStart: ClDailyTankAdStart{Duration: 15.75}})
	if ops := sentOps(t, s); len(ops) != 1 || ops[0] != OpSvDailyTankAdStart {
		t.Fatalf("sent %v", ops)
	}
	if !s.Status.ForceNewBroadcast {
		t.Fatal("DTAST did not fall through into NWB")
	}
}

func TestDailyTankPacketsNeedTheConfig(t *testing.T) {
	m, s := newTestManager(t, 8)
	m.Cfg.DailyTank = false
	m.Apply(Command{Kind: CmdDailyTankAd, Conn: s.Conn})
	if !s.Closed() {
		t.Fatal("DTA without daily_tank did not kick")
	}
}

// TestUnknownOpcodeDoesNotKick is sockets.js:731.
func TestUnknownOpcodeDoesNotKick(t *testing.T) {
	m, s := newTestManager(t, 8)
	var seen string
	m.Hooks.Unknown = func(_ *Socket, op string) { seen = op }
	m.Apply(Command{Kind: CmdUnknown, Conn: s.Conn, Op: "ZZ"})
	if s.Closed() {
		t.Fatal("an unknown opcode kicked")
	}
	if seen != "ZZ" {
		t.Fatalf("hook saw %q", seen)
	}
}

func TestMalformedPacketKicks(t *testing.T) {
	m, s := newTestManager(t, 8)
	m.Apply(Command{Kind: CmdMalformed, Conn: s.Conn})
	if !s.Closed() {
		t.Fatal("a malformed packet did not kick")
	}
}

// TestWatchdogTerminatesOnRespawnTimeout is sockets.js:2004.
func TestWatchdogTerminatesOnRespawnTimeout(t *testing.T) {
	now := 0.0
	m := NewManager(ManagerConfig{MaxHeartbeatInterval: 5000}, func() float64 { return now })
	c := newLoopbackConn(8)
	m.Apply(Command{Kind: CmdOpen, Conn: c})
	s := m.Lookup(c)
	sentOps(t, s)

	s.Timeout.Start(100)
	now = 4000
	m.Watchdog()
	if s.Closed() {
		t.Fatal("terminated inside the interval")
	}
	now = 6000
	s.Status.LastHeartbeat = 6000
	m.Watchdog()
	if ops := sentOps(t, s); len(ops) != 1 || ops[0] != OpSvKick {
		t.Fatalf("sent %v, want [K]", ops)
	}
	if !s.Closed() {
		t.Fatal("not terminated")
	}
}

// TestTimeoutStartedAtZeroNeverFires pins sockets.js:2092.
func TestTimeoutStartedAtZeroNeverFires(t *testing.T) {
	var tm Timeout
	tm.Start(0)
	if tm.Check(1e9, 5000) {
		t.Fatal("a timeout started at 0 expired")
	}
	tm.Start(1)
	if !tm.Check(1e9, 5000) {
		t.Fatal("a timeout started at 1 did not expire")
	}
}

// TestWatchdogKicksOnLostHeartbeat is sockets.js:2005.
func TestWatchdogKicksOnLostHeartbeat(t *testing.T) {
	now := 0.0
	m := NewManager(ManagerConfig{MaxHeartbeatInterval: 5000}, func() float64 { return now })
	c := newLoopbackConn(8)
	m.Apply(Command{Kind: CmdOpen, Conn: c})
	s := m.Lookup(c)
	sentOps(t, s)

	now = 5001
	m.Watchdog()
	if !s.Closed() {
		t.Fatal("a stale heartbeat did not kick")
	}
	if ops := sentOps(t, s); len(ops) != 0 {
		t.Fatalf("kick sent %v, want nothing", ops)
	}
}

// TestTrafficMonitorNeedsFourStrikes covers docs/found-bugs.md #30.
func TestTrafficMonitorNeedsFourStrikes(t *testing.T) {
	now := 0.0
	m := NewManager(ManagerConfig{MaxHeartbeatInterval: 5000}, func() float64 { return now })
	c := newLoopbackConn(8)
	m.Apply(Command{Kind: CmdOpen, Conn: c})
	s := m.Lookup(c)

	for i := 0; i < 4; i++ {
		s.Status.Requests = 51
		m.Traffic(s)
		if s.Closed() && i < 3 {
			t.Fatalf("kicked after %d strikes", i+1)
		}
	}
	if !s.Closed() {
		t.Fatal("four strikes did not kick")
	}
}

func TestTrafficResetsStrikesOnAQuietInterval(t *testing.T) {
	now := 0.0
	m := NewManager(ManagerConfig{MaxHeartbeatInterval: 5000}, func() float64 { return now })
	c := newLoopbackConn(8)
	m.Apply(Command{Kind: CmdOpen, Conn: c})
	s := m.Lookup(c)
	for i := 0; i < 3; i++ {
		s.Status.Requests = 51
		m.Traffic(s)
	}
	s.Status.Requests = 1
	m.Traffic(s)
	for i := 0; i < 3; i++ {
		s.Status.Requests = 51
		m.Traffic(s)
	}
	if s.Closed() {
		t.Fatal("a quiet interval did not reset the strike count")
	}
}

func TestCloseRemovesTheSocket(t *testing.T) {
	m, s := newTestManager(t, 8)
	var closed int
	m.Hooks.Disconnected = func(*Socket) { closed++ }
	if len(m.Clients()) != 1 {
		t.Fatalf("clients %d", len(m.Clients()))
	}
	m.Apply(Command{Kind: CmdClose, Conn: s.Conn})
	if closed != 1 {
		t.Fatalf("Disconnected fired %d times", closed)
	}
	if len(m.Clients()) != 0 {
		t.Fatalf("clients %d after close", len(m.Clients()))
	}
	if m.Lookup(s.Conn) != nil {
		t.Fatal("Lookup still resolves a closed connection")
	}
	m.Apply(Command{Kind: CmdPing, Conn: s.Conn, Ping: ClPing{Payload: 1}})
	if len(m.Clients()) != 0 {
		t.Fatal("a late frame recreated the socket")
	}
}

func TestKickedSocketStopsTalking(t *testing.T) {
	_, s := newTestManager(t, 8)
	sentOps(t, s)
	s.Kick("test")
	if err := s.Talk(SvWelcome{}.Append(s.Builder.Buf())); err != nil {
		t.Fatal(err)
	}
	if ops := sentOps(t, s); len(ops) != 0 {
		t.Fatalf("a kicked socket sent %v", ops)
	}
}

// TestPhaseFollowsTheStatusFlags checks derived state matches flag sequence.
func TestPhaseFollowsTheStatusFlags(t *testing.T) {
	_, s := newTestManager(t, 8)
	if s.Phase() != PhaseConnecting {
		t.Fatal("not connecting")
	}
	s.Status.Verified = true
	if s.Phase() != PhaseVerified {
		t.Fatal("not verified")
	}
	s.Status.ReadyToBroadcast = true
	if s.Phase() != PhaseInRoom {
		t.Fatal("not in room")
	}
	s.Status.Deceased = false
	if s.Phase() != PhaseAlive {
		t.Fatal("not alive")
	}
}
