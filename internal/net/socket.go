package net

import (
	"strings"

	"arrasgo/internal/config"
	"arrasgo/internal/entity"
	"arrasgo/internal/vmath"
)

type Clock func() float64

type Permission struct {
	Key             string
	Level           int
	Class           string
	NameColor       string
	Administrator   bool
	InfiniteLevelUp bool
	AllowSpam       bool
}

type Status struct {
	Verified          bool
	Receiving         int
	Deceased          bool
	Requests          int
	HasSpawned        bool
	NeedsFullMap      bool
	NeedsNewBroadcast bool
	ForceNewBroadcast bool

	SelectedLeaderboard    string
	HasSelectedLeaderboard bool

	SeesAllTeams bool

	DailyTankWatchedAd       bool
	DailyTankWatchedAdClient bool

	ReadyToSpawn     bool
	HasOperator      bool
	ReadyToBroadcast bool
	LastHeartbeat    float64

	Incognito   bool
	Transferred bool
	DisableChat bool
	LastTank    string
	HasLastTank bool

	MockupData MockupList
}

type MockupList struct {
	ReceivedIndexes            map[string]struct{}
	ReceivedUpgradePackIndexes map[string]struct{}
}

func newMockupList() MockupList {
	return MockupList{
		ReceivedIndexes:            make(map[string]struct{}),
		ReceivedUpgradePackIndexes: make(map[string]struct{}),
	}
}

type Camera struct {
	X, Y   float64
	VX, VY float64

	LastUpdate      float64
	LastDowndate    float64
	HasLastDowndate bool

	Scoping bool
	FOV     float64
	Ping    float64
}

type Phase uint8

const (
	PhaseConnecting Phase = iota
	PhaseVerified
	PhaseInRoom
	// PhaseAlive: a body exists.
	PhaseAlive
)

func (s *Socket) Phase() Phase {
	switch {
	case !s.Status.Verified:
		return PhaseConnecting
	case !s.Status.ReadyToBroadcast:
		return PhaseVerified
	case s.Status.Deceased:
		return PhaseInRoom
	default:
		return PhaseAlive
	}
}

type Timeout struct {
	timer   float64
	running bool
}

func (t *Timeout) Start(now float64) { t.timer, t.running = now, true }
func (t *Timeout) Stop()             { t.running = false; t.timer = 0 }

func (t *Timeout) Check(now float64, maxInterval float64) bool {
	return t.running && t.timer != 0 && now-t.timer > maxInterval
}

type Player struct {
	Body      entity.EntityID
	ViewID    uint32
	Team      int32
	HasTeam   bool
	TeamColor string
	Target    struct{ X, Y float64 }
	Command   PlayerCommand

	SpawnBegin float64

	Spawn    vmath.Vec2
	HasSpawn bool

	Became bool
}

type PlayerCommand struct {
	Up, Down, Left, Right bool
	LMB, MMB, RMB         bool
	Autofire              bool
	Autospin              bool
	Override              bool
	Autoalt               bool
	Spinlock              bool
}

var toggleNames = [4]string{"autospin", "autofire", "override", "autoalt"}

func (p *PlayerCommand) toggle(i int) bool {
	switch i {
	case ToggleAutospin:
		p.Autospin = !p.Autospin
		return p.Autospin
	case ToggleAutofire:
		p.Autofire = !p.Autofire
		return p.Autofire
	case ToggleOverride:
		p.Override = !p.Override
		return p.Override
	default:
		p.Autoalt = !p.Autoalt
		return p.Autoalt
	}
}

type Socket struct {
	Conn *Conn

	Status Status
	Camera Camera
	Player Player
	View   *View

	Permissions    *Permission
	HasPermissions bool
	Key            string

	RememberedTeam    int32
	HasRememberedTeam bool
	SpectateEntity    entity.EntityID
	ConnectedTo       string

	Timeout Timeout

	Builder Builder

	trafficStrikes int

	closed bool
}

func (s *Socket) Talk(msg []Value) error {
	if s.closed {
		return nil
	}
	frame, err := s.Builder.Frame(msg)
	if err != nil {
		return err
	}
	s.Conn.Send(frame)
	return nil
}

func (s *Socket) TalkDroppable(msg []Value) error {
	if s.closed {
		return nil
	}
	frame, err := s.Builder.Frame(msg)
	if err != nil {
		return err
	}
	s.Conn.SendDroppable(frame)
	return nil
}

func (s *Socket) LastWords(msg []Value) error {
	if s.closed {
		return nil
	}
	frame, err := s.Builder.Frame(msg)
	if err != nil {
		return err
	}
	s.closed = true
	s.Conn.LastWords(frame)
	return nil
}

func (s *Socket) Kick(reason string) {
	if s.closed {
		return
	}
	s.closed = true
	s.Conn.Close()
}

func (s *Socket) Closed() bool { return s.closed }

// Hooks

type Hooks struct {
	Connected    func(s *Socket)
	Disconnected func(s *Socket)

	Verified func(s *Socket, key string, perm *Permission)

	NeedsRoom    func(s *Socket, req ClSpawn)
	SpawnRequest func(s *Socket, req ClSpawn)

	Target   func(s *Socket, x, y float64)
	Commands func(s *Socket, reverseTank Value, bits int)

	KeyCommand func(s *Socket, keys []string)

	Toggled func(s *Socket, index int, name string, on bool)

	Upgrade     func(s *Socket, req ClUpgrade)
	Stat        func(s *Socket, req ClStat)
	LevelUp     func(s *Socket)
	Suicide     func(s *Socket)
	TakeControl func(s *Socket)

	Chat     func(s *Socket, text string)
	TankTree func(s *Socket)

	DailyTankAd      func(s *Socket)
	DailyTankAdStart func(s *Socket, seconds string)

	Unknown func(s *Socket, op string)
}

// Manager

type ManagerConfig struct {
	MaxHeartbeatInterval float64
	PopupMessageDuration float64
	BannedCharacters     string
	Private              bool
	DailyTank            bool
	Hidden               bool
	ArenaClosed          bool
	MaxPlayers           int
}

func ManagerConfigFrom(t *config.Tuning) ManagerConfig {
	return ManagerConfig{
		MaxHeartbeatInterval: float64(t.MaxHeartbeatInterval),
		PopupMessageDuration: float64(t.PopupMessageDuration),
		DailyTank:            t.DailyTank != nil,
	}
}

type Manager struct {
	Cfg   ManagerConfig
	Hooks Hooks
	Now   Clock

	Permissions map[string]*Permission

	clients []*Socket
	byConn  map[*Conn]*Socket
	scratch []*Socket
}

func NewManager(cfg ManagerConfig, now Clock) *Manager {
	return &Manager{
		Cfg:         cfg,
		Now:         now,
		Permissions: make(map[string]*Permission),
		byConn:      make(map[*Conn]*Socket),
	}
}

func (m *Manager) Clients() []*Socket { return m.clients }

func (m *Manager) Lookup(c *Conn) *Socket { return m.byConn[c] }

func (m *Manager) Apply(cmd Command) {
	if cmd.Kind == CmdOpen {
		m.open(cmd.Conn)
		return
	}
	s := m.byConn[cmd.Conn]
	if s == nil {
		return // a frame that raced the close
	}
	if cmd.Kind == CmdClose {
		m.close(s)
		return
	}
	if s.closed {
		return
	}
	// check testable. See Traffic.
	s.Status.Requests++

	switch cmd.Kind {
	case CmdMalformed:
		s.Kick("Malformed packet.")
	case CmdInvalid:
		s.Kick(cmd.Err.Error())
	case CmdUnknown:
		if m.Hooks.Unknown != nil {
			m.Hooks.Unknown(s, cmd.Op)
		}
	case CmdKey:
		m.handleKey(s, cmd.Key)
	case CmdSpawn:
		m.handleSpawn(s, cmd.Spawn)
	case CmdSync:
		_ = s.Talk((&SvSync{ClientTime: cmd.Sync.Time, ServerTime: m.Now()}).Append(s.Builder.Buf()))
	case CmdPing:
		_ = s.Talk((&SvPong{Ping: cmd.Ping.Payload}).Append(s.Builder.Buf()))
		s.Status.LastHeartbeat = m.Now()
	case CmdDownlink:
		s.Status.Receiving = 0
		s.Camera.Ping = m.Now() - cmd.Downlink.Time
		s.Camera.LastDowndate = m.Now()
		s.Camera.HasLastDowndate = true
	case CmdControl:
		m.handleControl(s, cmd.Control)
	case CmdKeys:
		if m.Hooks.KeyCommand != nil {
			m.Hooks.KeyCommand(s, cmd.Keys.Keys)
		}
	case CmdToggle:
		m.handleToggle(s, cmd.Toggle)
	case CmdUpgrade:
		if cmd.Upgrade.DailyTank && !m.Cfg.DailyTank {
			s.Kick("Bad daily tank upgrade request (there is no daily tanks set up)")
			return
		}
		if m.Hooks.Upgrade != nil {
			m.Hooks.Upgrade(s, cmd.Upgrade)
		}
	case CmdStat:
		if m.Hooks.Stat != nil {
			m.Hooks.Stat(s, cmd.Stat)
		}
	case CmdLevelUp:
		if m.Hooks.LevelUp != nil {
			m.Hooks.LevelUp(s)
		}
	case CmdSuicide:
		if m.Hooks.Suicide != nil {
			m.Hooks.Suicide(s)
		}
	case CmdTakeControl:
		if m.Hooks.TakeControl != nil {
			m.Hooks.TakeControl(s)
		}
	case CmdChat:
		if m.Hooks.Chat != nil {
			m.Hooks.Chat(s, cmd.Chat.Text)
		}
	case CmdTankTree:
		if m.Hooks.TankTree != nil {
			m.Hooks.TankTree(s)
		}
		_ = s.Talk(SvTankTree{}.Append(s.Builder.Buf()))
	case CmdDailyTankAd:
		if !m.Cfg.DailyTank {
			s.Kick("Bad daily tank ad request")
			return
		}
		if m.Hooks.DailyTankAd != nil {
			m.Hooks.DailyTankAd(s)
		}
	case CmdDailyTankAdDone:
		if !m.Cfg.DailyTank {
			s.Kick("Bad daily tank ad request")
			return
		}
		if s.Status.DailyTankWatchedAdClient {
			s.Status.DailyTankWatchedAd = true
			_ = s.Talk(SvDailyTankAdDone{}.Append(s.Builder.Buf()))
		}
	case CmdDailyTankAdStart:
		m.handleDailyTankAdStart(s, cmd.DailyTankStart)
	case CmdNeedsNewBroadcast:
		s.Status.ForceNewBroadcast = true
	}
}

func (m *Manager) open(c *Conn) {
	if _, dup := m.byConn[c]; dup {
		return
	}
	s := &Socket{
		Conn:           c,
		SpectateEntity: entity.EntityID{},
		Camera:         Camera{FOV: 2000, LastUpdate: m.Now()},
		Status: Status{
			Deceased:          true,
			NeedsFullMap:      true,
			NeedsNewBroadcast: true,
			ReadyToSpawn:      true,
			LastHeartbeat:     m.Now(),
			MockupData:        newMockupList(),
		},
	}
	m.clients = append(m.clients, s)
	m.byConn[c] = s
	if m.Hooks.Connected != nil {
		m.Hooks.Connected(s)
	}
	_ = s.Talk(SvWelcome{}.Append(s.Builder.Buf()))
}

func (m *Manager) close(s *Socket) {
	if m.Hooks.Disconnected != nil {
		m.Hooks.Disconnected(s)
	}
	delete(m.byConn, s.Conn)
	for i, c := range m.clients {
		if c == s {
			m.clients = append(m.clients[:i], m.clients[i+1:]...)
			break
		}
	}
	s.closed = true
	s.Conn.Close()
}

func (m *Manager) handleKey(s *Socket, k ClKey) {
	if s.Status.Verified {
		s.Kick("Duplicate player spawn attempt.")
		return
	}
	_ = s.Talk(SvKeyAccepted{}.Append(s.Builder.Buf()))
	if k.HasKey {
		s.Permissions = m.Permissions[k.Key]
		s.HasPermissions = s.Permissions != nil
		s.Key = k.Key
	}
	s.Status.Verified = true
	if m.Hooks.Verified != nil {
		m.Hooks.Verified(s, s.Key, s.Permissions)
	}
}

func (m *Manager) handleSpawn(s *Socket, req ClSpawn) {
	if !s.Status.Deceased {
		s.Kick("Trying to spawn while already alive.")
		return
	}
	if m.Cfg.Private && !s.HasPermissions {
		_ = s.Talk((&SvScreenMessage{Text: "This server is private."}).Append(s.Builder.Buf()))
		s.Kick("Tried to join private server without valid token.")
		return
	}
	if !(m.Cfg.MaxPlayers == 0) && len(m.clients) > m.Cfg.MaxPlayers {
		_ = s.Talk((&SvScreenMessage{Text: "This server is full, please rejoin later."}).Append(s.Builder.Buf()))
		s.Kick("Server full.")
		return
	}
	s.Status.Incognito = req.Incognito != 0
	if m.Cfg.ArenaClosed {
		if req.NeedsRoom != 0 {
			_ = s.Talk((&SvScreenMessage{Text: "Arena closed. Try again in a few seconds."}).Append(s.Builder.Buf()))
			s.Kick("Bad spawn while arena closed.")
		} else {
			_ = s.Talk((&SvPopup{Duration: 5000, Text: "Arena Closed."}).Append(s.Builder.Buf()))
		}
		return
	}
	name := stripBanned(req.Name, m.Cfg.BannedCharacters)
	req.Name = name
	if req.NeedsRoom != 0 {
		if m.Cfg.Hidden {
			s.Kick("")
			return
		}
		if m.Hooks.NeedsRoom != nil {
			m.Hooks.NeedsRoom(s, req)
		}
		return
	}
	if m.Hooks.SpawnRequest != nil {
		m.Hooks.SpawnRequest(s, req)
	}
}

func stripBanned(name, banned string) string {
	if banned == "" {
		return name
	}
	return strings.Map(func(r rune) rune {
		if strings.ContainsRune(banned, r) {
			return -1
		}
		return r
	}, name)
}

func (m *Manager) handleControl(s *Socket, c ClCommand) {
	if !s.Player.Body.Valid() {
		return
	}
	if m.Hooks.Target != nil {
		m.Hooks.Target(s, c.TargetX, c.TargetY)
	} else {
		s.Player.Target.X, s.Player.Target.Y = c.TargetX, c.TargetY
	}
	bits := int(c.Commands)
	s.Player.Command.Up = bits&CommandUp != 0
	s.Player.Command.Down = bits&CommandDown != 0
	s.Player.Command.Left = bits&CommandLeft != 0
	s.Player.Command.Right = bits&CommandRight != 0
	s.Player.Command.LMB = bits&CommandLMB != 0
	s.Player.Command.MMB = bits&CommandMMB != 0
	s.Player.Command.RMB = bits&CommandRMB != 0
	if m.Hooks.Commands != nil {
		m.Hooks.Commands(s, c.ReverseTank, bits)
	}
}

func (m *Manager) handleToggle(s *Socket, t ClToggle) {
	if !s.Player.Body.Valid() {
		return
	}
	i := int(t.Index)
	on := s.Player.Command.toggle(i)
	if truthy(t.SendMessage) && m.Hooks.Toggled != nil {
		m.Hooks.Toggled(s, i, toggleNames[i], on)
	}
}

func (m *Manager) handleDailyTankAdStart(s *Socket, d ClDailyTankAdStart) {
	if !m.Cfg.DailyTank {
		s.Kick("Bad daily tank ad request")
		return
	}
	_ = s.Talk(SvDailyTankAdStart{}.Append(s.Builder.Buf()))
	if m.Hooks.DailyTankAdStart != nil {
		m.Hooks.DailyTankAdStart(s, d.DurationSeconds())
	}
	s.Status.ForceNewBroadcast = true // the fall-through
}

//	The body never executes.
//
// See docs/found-bugs.md #30.
func (m *Manager) Traffic(s *Socket) {
	if m.Now()-s.Status.LastHeartbeat > m.Cfg.MaxHeartbeatInterval {
		s.Kick("Heartbeat lost.")
		return
	}
	if s.Status.Requests > 50 {
		s.trafficStrikes++
	} else {
		s.trafficStrikes = 0
	}
	if s.trafficStrikes > 3 {
		s.Kick("Socket traffic volume violation!")
		return
	}
	s.Status.Requests = 0
}

func (m *Manager) Watchdog() {
	now := m.Now()
	for _, s := range m.snapshot() {
		if s.Timeout.Check(now, m.Cfg.MaxHeartbeatInterval) {
			_ = s.LastWords(SvKick{}.Append(s.Builder.Buf()))
			continue
		}
		if now-s.Status.LastHeartbeat > m.Cfg.MaxHeartbeatInterval {
			s.Kick("Lost heartbeat.")
		}
	}
}

func (m *Manager) snapshot() []*Socket {
	m.scratch = append(m.scratch[:0], m.clients...)
	return m.scratch
}

func (m *Manager) Broadcast(srv *Server, text string) error {
	var b Builder
	msg := (&SvPopup{Duration: m.Cfg.PopupMessageDuration, Text: text}).Append(b.Buf())
	frame, err := b.Frame(msg)
	if err != nil {
		return err
	}
	pm, err := srv.Prepare(frame)
	if err != nil {
		return err
	}
	for _, s := range m.clients {
		if !s.closed {
			s.Conn.SendPrepared(pm, false)
		}
	}
	return nil
}

func (m *Manager) BroadcastRoom(srv *Server, width, height float64, tilesJSON string) error {
	var b Builder
	msg := (&SvRoomRefresh{Width: width, Height: height, TilesJSON: tilesJSON}).Append(b.Buf())
	frame, err := b.Frame(msg)
	if err != nil {
		return err
	}
	pm, err := srv.Prepare(frame)
	if err != nil {
		return err
	}
	for _, s := range m.clients {
		if !s.closed {
			s.Conn.SendPrepared(pm, false)
		}
	}
	return nil
}

func (m *Manager) SweepOverflowed() {
	for _, s := range m.snapshot() {
		if !s.closed && s.Conn.Overflowed() {
			s.Kick("Send queue overflow.")
		}
	}
}
