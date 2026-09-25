package net

// Websocket transport from js-src/server/server.js and sockets.js.

import (
	"errors"
	"net"
	"net/http"
	"strings"
	"sync"
	"sync/atomic"
	"time"

	"github.com/gorilla/websocket"

	"arrasgo/internal/jsutil"
)

// Command type tag.
type CommandKind uint8

const (
	CmdOpen CommandKind = iota
	CmdClose
	CmdMalformed
	CmdUnknown
	CmdInvalid

	CmdKey
	CmdSpawn
	CmdSync
	CmdPing
	CmdDownlink
	CmdControl
	CmdKeys
	CmdToggle
	CmdUpgrade
	CmdStat
	CmdLevelUp
	CmdSuicide
	CmdTakeControl
	CmdChat
	CmdTankTree
	CmdDailyTankAd
	CmdDailyTankAdDone
	CmdDailyTankAdStart
	CmdNeedsNewBroadcast
)

// Decoded client frame or lifecycle event.
type Command struct {
	Kind CommandKind
	Conn *Conn
	Op   string // Opcode.
	Err  error

	Key            ClKey
	Spawn          ClSpawn
	Sync           ClSync
	Ping           ClPing
	Downlink       ClDownlink
	Control        ClCommand
	Keys           ClKeys
	Toggle         ClToggle
	Upgrade        ClUpgrade
	Stat           ClStat
	Chat           ClChat
	DailyTankStart ClDailyTankAdStart
}

type ServerConfig struct {
	SendQueue        int           // Default 256.
	SendBlock        time.Duration // Default 50ms.
	ReadBufferSize   int           // Default 1024.
	WriteBufferSize  int           // Default 4096.
	MaxMessageSize   int64         // Default 8192.
	WriteTimeout     time.Duration // Default 10s.
	HandshakeTimeout time.Duration // Default 10s.
	CommandQueue     int           // Default 256.
	CheckOrigin      func(*http.Request) bool
}

func (c ServerConfig) withDefaults() ServerConfig {
	if c.SendQueue <= 0 {
		c.SendQueue = 256
	}
	if c.SendBlock <= 0 {
		c.SendBlock = 50 * time.Millisecond
	}
	if c.ReadBufferSize <= 0 {
		c.ReadBufferSize = 1024
	}
	if c.WriteBufferSize <= 0 {
		c.WriteBufferSize = 4096
	}
	if c.MaxMessageSize <= 0 {
		c.MaxMessageSize = 8192
	}
	if c.WriteTimeout <= 0 {
		c.WriteTimeout = 10 * time.Second
	}
	if c.HandshakeTimeout <= 0 {
		c.HandshakeTimeout = 10 * time.Second
	}
	if c.CommandQueue <= 0 {
		c.CommandQueue = 256
	}
	return c
}

var (
	ErrMissingIP = errors.New("net: missing IP")
	ErrInvalidIP = errors.New("net: invalid IP")
)

// Server upgrades HTTP and streams Commands on one shared channel.
type Server struct {
	cfg       ServerConfig
	upgrader  websocket.Upgrader
	cmds      chan Command
	rngMu     sync.Mutex
	rng       *jsutil.Rand // crypto.randomUUID() from sockets.js:2054.
	closeOnce sync.Once
	done      chan struct{}
	wg        sync.WaitGroup
}

func NewServer(cfg ServerConfig, rng *jsutil.Rand) *Server {
	cfg = cfg.withDefaults()
	s := &Server{
		cfg:  cfg,
		cmds: make(chan Command, cfg.CommandQueue),
		rng:  rng,
		done: make(chan struct{}),
	}
	s.upgrader = websocket.Upgrader{
		HandshakeTimeout: cfg.HandshakeTimeout,
		ReadBufferSize:   cfg.ReadBufferSize,
		WriteBufferSize:  cfg.WriteBufferSize,
		CheckOrigin:      cfg.CheckOrigin,
	}
	if s.upgrader.CheckOrigin == nil {
		s.upgrader.CheckOrigin = func(*http.Request) bool { return true }
	}
	return s
}

func (s *Server) Commands() <-chan Command { return s.cmds }

func (s *Server) Prepare(frame []byte) (*websocket.PreparedMessage, error) {
	return websocket.NewPreparedMessage(websocket.BinaryMessage, frame)
}

func (s *Server) ServeHTTP(w http.ResponseWriter, r *http.Request) {
	select {
	case <-s.done:
		http.Error(w, "shutting down", http.StatusServiceUnavailable)
		return
	default:
	}
	ip, err := ClientIP(r)
	if err != nil {
		http.Error(w, "bad ip", http.StatusForbidden)
		return
	}
	ws, err := s.upgrader.Upgrade(w, r, nil)
	if err != nil {
		return
	}
	s.adopt(ws, ip)
}

func (s *Server) Adopt(ws *websocket.Conn, ip string) *Conn { return s.adopt(ws, ip) }

func (s *Server) adopt(ws *websocket.Conn, ip string) *Conn {
	c := &Conn{
		ws:   ws,
		id:   s.newID(),
		ip:   ip,
		cfg:  s.cfg,
		out:  make(chan outFrame, s.cfg.SendQueue),
		free: make(chan []byte, s.cfg.SendQueue),
		srv:  s,
		dead: make(chan struct{}),
	}
	ws.SetReadLimit(s.cfg.MaxMessageSize)
	s.emit(Command{Kind: CmdOpen, Conn: c})
	s.wg.Add(2)
	go func() { defer s.wg.Done(); c.writeLoop() }()
	go func() { defer s.wg.Done(); c.readLoop() }()
	return c
}

func (s *Server) newID() string {
	var b [16]byte
	s.rngMu.Lock()
	for i := 0; i < 16; i += 4 {
		v := uint32(s.rng.Random(4294967296))
		b[i] = byte(v)
		b[i+1] = byte(v >> 8)
		b[i+2] = byte(v >> 16)
		b[i+3] = byte(v >> 24)
	}
	s.rngMu.Unlock()
	b[6] = (b[6] & 0x0f) | 0x40 // version 4
	b[8] = (b[8] & 0x3f) | 0x80 // variant 1
	const hexDigits = "0123456789abcdef"
	out := make([]byte, 36)
	j := 0
	for i := 0; i < 16; i++ {
		if i == 4 || i == 6 || i == 8 || i == 10 {
			out[j] = '-'
			j++
		}
		out[j] = hexDigits[b[i]>>4]
		out[j+1] = hexDigits[b[i]&0x0f]
		j += 2
	}
	return string(out)
}

// Pass command to room, drop if room stopped reading.
func (s *Server) emit(cmd Command) {
	select {
	case s.cmds <- cmd:
	case <-s.done:
	}
}

// Stop accepting and wait for connections to finish.
func (s *Server) Shutdown() {
	s.closeOnce.Do(func() { close(s.done) })
	s.wg.Wait()
}

// One queued write: exactly one of bytes and prepared is set.
type outFrame struct {
	bytes     []byte
	prepared  *websocket.PreparedMessage
	recycle   bool // Return bytes to free list.
	terminate bool // Close connection after frame lands.
}

// Websocket connection transport, safe to call from room goroutine.
type Conn struct {
	ws        *websocket.Conn
	id        string
	ip        string
	cfg       ServerConfig
	srv       *Server
	out       chan outFrame
	free      chan []byte
	closeOnce sync.Once
	dead      chan struct{}
	dropped   atomic.Uint64
	sent      atomic.Uint64
	overflow  atomic.Bool
}

func (c *Conn) ID() string { return c.id }
func (c *Conn) IP() string { return c.ip }

// Frames refused: queue stayed full (Dropped) or handed to writer (Sent).
func (c *Conn) Dropped() uint64 { return c.dropped.Load() }
func (c *Conn) Sent() uint64    { return c.sent.Load() }

// Undroppable frame was refused Connection is desynchronised.
func (c *Conn) Overflowed() bool { return c.overflow.Load() }

// Queue one frame without blocks to avoid stalling room goroutine.
func (c *Conn) Send(frame []byte) bool { return c.enqueue(frame, false, false) }

// Queue droppable frame (next one supersedes it).
func (c *Conn) SendDroppable(frame []byte) bool { return c.enqueue(frame, true, false) }

// Queue prepared frame (encoded once for many connections).
func (c *Conn) SendPrepared(pm *websocket.PreparedMessage, droppable bool) bool {
	select {
	case <-c.dead:
		return false
	default:
	}
	select {
	case c.out <- outFrame{prepared: pm}:
		c.sent.Add(1)
		return true
	default:
		c.dropped.Add(1)
		if !droppable {
			c.overflow.Store(true)
		}
		return false
	}
}

// Send frame then terminate (socket.lastWords from sockets.js:2068).
func (c *Conn) LastWords(frame []byte) bool { return c.enqueue(frame, false, true) }

func (c *Conn) enqueue(frame []byte, droppable, terminate bool) bool {
	select {
	case <-c.dead:
		return false
	default:
	}
	buf := c.take(len(frame))
	buf = append(buf, frame...)
	f := outFrame{bytes: buf, recycle: true, terminate: terminate}
	select {
	case c.out <- f:
		c.sent.Add(1)
		return true
	default:
	}
	if droppable {
		c.give(buf)
		c.dropped.Add(1)
		return false
	}
	// Undroppable frames wait briefly until connection dies or queue drains.
	timer := time.NewTimer(c.cfg.SendBlock)
	defer timer.Stop()
	select {
	case c.out <- f:
		c.sent.Add(1)
		return true
	case <-c.dead:
	case <-timer.C:
	}
	c.give(buf)
	c.dropped.Add(1)
	c.overflow.Store(true)
	return false
}

// Write-buffer free list: zero allocations at steady state.
func (c *Conn) take(n int) []byte {
	select {
	case b := <-c.free:
		if cap(b) >= n {
			return b[:0]
		}
		return make([]byte, 0, n)
	default:
		return make([]byte, 0, n)
	}
}

func (c *Conn) give(b []byte) {
	select {
	case c.free <- b[:0]:
	default:
	}
}

// Safe to call multiple times and from any goroutine.
func (c *Conn) Close() {
	c.closeOnce.Do(func() {
		close(c.dead)
		if c.ws != nil {
			_ = c.ws.Close()
		}
	})
}

func (c *Conn) writeLoop() {
	defer c.Close()
	for {
		select {
		case <-c.dead:
			return
		case <-c.srv.done:
			return
		case f := <-c.out:
			_ = c.ws.SetWriteDeadline(time.Now().Add(c.cfg.WriteTimeout))
			var err error
			if f.prepared != nil {
				err = c.ws.WritePreparedMessage(f.prepared)
			} else {
				err = c.ws.WriteMessage(websocket.BinaryMessage, f.bytes)
			}
			if f.recycle {
				c.give(f.bytes)
			}
			if err != nil || f.terminate {
				return
			}
		}
	}
}

func (c *Conn) readLoop() {
	var closeErr error
	defer func() {
		c.Close()
		c.srv.emit(Command{Kind: CmdClose, Conn: c, Err: closeErr})
	}()
	for {
		msgType, data, err := c.ws.ReadMessage()
		if err != nil {
			if !websocket.IsCloseError(err, websocket.CloseNormalClosure, websocket.CloseGoingAway) {
				closeErr = err
			}
			return
		}
		if msgType != websocket.BinaryMessage {
			c.srv.emit(Command{Kind: CmdMalformed, Conn: c})
			continue
		}
		c.srv.emit(parseCommand(c, data))
		select {
		case <-c.dead:
			return
		default:
		}
	}
}

// Decode half of socketManager.incoming from sockets.js:189.
func parseCommand(c *Conn, data []byte) Command {
	m := Decode(data)
	if m == nil {
		return Command{Kind: CmdMalformed, Conn: c}
	}
	op, rest, ok := Opcode(m)
	if !ok {
		return Command{Kind: CmdUnknown, Conn: c}
	}
	cmd := Command{Conn: c, Op: op}
	var err error
	switch op {
	case OpClKey:
		cmd.Kind = CmdKey
		cmd.Key, err = ParseClKey(rest)
	case OpClSpawn:
		cmd.Kind = CmdSpawn
		cmd.Spawn, err = ParseClSpawn(rest)
	case OpClSync:
		cmd.Kind = CmdSync
		cmd.Sync, err = ParseClSync(rest)
	case OpClPing:
		cmd.Kind = CmdPing
		cmd.Ping, err = ParseClPing(rest)
	case OpClDownlink:
		cmd.Kind = CmdDownlink
		cmd.Downlink, err = ParseClDownlink(rest)
	case OpClCommand:
		cmd.Kind = CmdControl
		cmd.Control, err = ParseClCommand(rest)
	case OpClKeys:
		cmd.Kind = CmdKeys
		cmd.Keys, err = ParseClKeys(rest)
	case OpClToggle:
		cmd.Kind = CmdToggle
		cmd.Toggle, err = ParseClToggle(rest)
	case OpClUpgrade:
		cmd.Kind = CmdUpgrade
		cmd.Upgrade, err = ParseClUpgrade(rest)
	case OpClStat:
		cmd.Kind = CmdStat
		cmd.Stat, err = ParseClStat(rest)
	case OpClLevelUp:
		cmd.Kind = CmdLevelUp
		_, err = ParseClLevelUp(rest)
	case OpClSuicide:
		cmd.Kind = CmdSuicide
	case OpClControl:
		cmd.Kind = CmdTakeControl
	case OpClChat:
		cmd.Kind = CmdChat
		cmd.Chat, err = ParseClChat(rest)
	case OpClTankTree:
		cmd.Kind = CmdTankTree
	case OpClDailyTankAd:
		cmd.Kind = CmdDailyTankAd
	case OpClDailyTankAdDone:
		cmd.Kind = CmdDailyTankAdDone
	case OpClDailyTankAdStart:
		cmd.Kind = CmdDailyTankAdStart
		cmd.DailyTankStart, err = ParseClDailyTankAdStart(rest)
	case OpClNeedsNewBroadcast:
		cmd.Kind = CmdNeedsNewBroadcast
	default:
		cmd.Kind = CmdUnknown
	}
	if err != nil {
		return Command{Kind: CmdInvalid, Conn: c, Op: op, Err: err}
	}
	return cmd
}

// List from sockets.js:2166-2167 where first header present wins.
var proxyHeaders = [...]string{
	"Fastly-Client-Ip",
	"Cf-Connecting-Ip",
	"X-Forwarded-For",
	"Z-Forwarded-For",
	"Forwarded",
	"X-Real-Ip",
}

// From sockets.js:2165-2186.
func ClientIP(r *http.Request) (string, error) {
	store := ""
	for _, h := range proxyHeaders {
		if v := r.Header.Get(h); v != "" {
			store = v
			break
		}
	}
	if store == "" {
		store = r.RemoteAddr
	}
	if store == "" {
		return "", ErrMissingIP
	}
	ips := strings.Split(store, ",")
	for i, raw := range ips {
		if isIPv6(strings.TrimSpace(raw)) {
			ips[i] = strings.TrimSpace(raw)
		} else {
			ips[i] = strings.TrimSpace(strings.Split(raw, ":")[0])
		}
		if net.ParseIP(ips[i]) == nil {
			return "", ErrInvalidIP
		}
	}
	return ips[0], nil
}

// Valid IP that is not IPv4.
func isIPv6(s string) bool {
	ip := net.ParseIP(s)
	return ip != nil && ip.To4() == nil
}
