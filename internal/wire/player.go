package wire

// Websocket seam between net and room: handles connections, spawning, and views.

import (
	"strconv"

	"arrasgo/internal/ctrl"
	"arrasgo/internal/defs"
	"arrasgo/internal/entity"
	"arrasgo/internal/guns"
	"arrasgo/internal/net"
	"arrasgo/internal/room"
	"arrasgo/internal/sim"
	"arrasgo/internal/vmath"
)

type Players struct {
	g  *Game
	r  *room.Room
	s  *sim.Sim
	lg *Lifegiver

	cache         net.PhotoCache
	cfg           net.ViewConfig
	mockups       *net.Mockups
	input         ctrl.PlayerCommand
	owner         map[entity.EntityID]*net.Socket
	views         []*net.View
	guis          map[*net.Socket]*guiState
	casts         map[*net.Socket]*broadcastState
	teamRows      net.MinimapTeams
	boardRows     net.LeaderboardBuilder
	chats         *net.Chats
	chatIDs       []uint32
	lastBody      map[*net.Socket]*bodySnapshot
	mirroring     int
	bacteriaBuf   []entity.EntityID
	treeRoots     []string
	controlBuf    []entity.EntityID
	tooltipBuf    []int32
	controlTimers []playerTimer
	death         net.SvDeath
	lb            net.LeaderboardSettings
	hpLabel       string
	tagModeIndex  string
	tagModeLabel  string
	daily         dailyTankConfig
	spawnClassOrd int
}

func InstallPlayers(g *Game, r *room.Room, s *sim.Sim, lg *Lifegiver) *Players {
	p := &Players{
		g: g, r: r, s: s, lg: lg,
		owner:         make(map[entity.EntityID]*net.Socket),
		guis:          make(map[*net.Socket]*guiState),
		casts:         make(map[*net.Socket]*broadcastState),
		lastBody:      make(map[*net.Socket]*bodySnapshot),
		spawnClassOrd: -1,
		chats:         net.NewChats(),
		cfg: net.ViewConfig{
			VisibleListInterval: float64(r.Tuning.VisibleListInterval),
			LoadAllMockups:      r.Tuning.LoadAllMockups,
			Persp: net.PerspectiveConfig{
				Groups:           r.Flags.Groups != 0,
				Mode:             r.Mutable.Mode,
				Tag:              r.Flags.Tag,
				RandomBodyColors: r.Tuning.RandomBodyColors,
				TeamColor:        func(team int32) string { return room.GetTeamColor(team, true) },
			},
		},
	}
	if mk, err := net.LoadMockups(g.Rand); err != nil {
		if s.Hooks.Error != nil {
			s.Hooks.Error(err)
		}
	} else {
		p.mockups = mk
	}
	if lg != nil && lg.GunDeps.Defs != nil {
		if d, ok := lg.GunDeps.Defs.Get(r.Tuning.SpawnClass); ok {
			if ix, ok := d.Index.Get(); ok {
				p.spawnClassOrd = int(ix)
			}
		}
		if d, ok := lg.GunDeps.Defs.Get("hp"); ok {
			p.hpLabel, _ = d.Label.Get()
		}
		if d, ok := lg.GunDeps.Defs.Get("tagMode"); ok {
			p.tagModeLabel, _ = d.Label.Get()
			if ix, ok := d.Index.Get(); ok {
				p.tagModeIndex = strconv.Itoa(int(ix))
			}
		}
	}
	p.initLeaderboardSettings()
	p.cache.Src = net.PhotoSource{
		Kind:      p.photoKind,
		Gun:       p.gunPhoto,
		Incognito: func(id entity.EntityID) bool { return r.Extras.Get(id).Incognito },
	}

	g.Sockets.Hooks = net.Hooks{
		Connected:    p.connected,
		Disconnected: p.disconnected,
		NeedsRoom:    p.needsRoom,
		SpawnRequest: p.spawnRequest,
		Target:       p.target,
		Commands:     p.commands,
		Toggled:      p.toggled,
		Upgrade:      p.upgrade,
		Stat:         p.stat,
		LevelUp:      p.levelUp,
		Suicide:      p.suicide,
		TakeControl:  p.takeControl,
		Chat:         p.chat,
		TankTree:     p.tankTree,

		DailyTankAd:      p.dailyTankAd,
		DailyTankAdStart: p.dailyTankAdStart,
	}
	if lg != nil {
		lg.PlayerInput = p.inputFor
		lg.PendingUpgrade = p.resolvePendingUpgrade
	}
	s.Hooks.ViewCheck = p.viewCheck
	s.Hooks.Tracked = p.tracked
	if lg != nil {
		lg.OnDestroyed = p.destroyed
		lg.OnUnlinked = p.unlinked
	}
	s.Hooks.TakeSelfie = func(id entity.EntityID) { p.cache.TakeSelfie(r.World, id) }
	s.Loops.Views = p.Views
	return p
}

func (p *Players) connected(s *net.Socket) {
	s.View = p.newView(s)
	p.views = append(p.views, s.View)
	p.resolveDailyTankIndex()
}

func (p *Players) resolveDailyTankIndex() {
	cfg := p.r.Tuning.DailyTank
	if cfg == nil || p.daily.Configured || p.lg == nil || p.lg.GunDeps.Defs == nil {
		return
	}
	d, ok := p.lg.GunDeps.Defs.Get(cfg.Tank)
	if !ok {
		return
	}
	ix, ok := d.Index.Get()
	if !ok {
		return
	}
	p.daily = dailyTankConfig{
		Configured: true,
		Tier:       cfg.Tier,
		Ads:        cfg.Ads,
		Index:      strconv.Itoa(int(ix)),
	}
}

func (p *Players) viewCheck(id entity.EntityID, _ float64) bool {
	for _, v := range p.views {
		if v.Check(p.r.World, id) {
			return true
		}
	}
	return false
}

func (p *Players) tracked(id entity.EntityID) {
	for _, v := range p.views {
		v.Add(p.r.World, id)
	}
}

func (p *Players) destroyed(id entity.EntityID) {
	for _, v := range p.views {
		v.Remove(id)
	}
}

func (p *Players) unlinked(id entity.EntityID) {
	if s := p.owner[id]; s != nil {
		if e := p.r.World.Get(id); e != nil {
			p.rememberBody(s, id, e)
		}
	}
	p.dropBulletChild(id)
}

func (p *Players) newView(s *net.Socket) *net.View {
	v := &net.View{Socket: s, Cache: &p.cache, Cfg: p.cfg}
	v.SendMockups = p.sendMockups
	v.OnBodyDead = p.bodyDead
	return v
}

func (p *Players) sendMockups(s *net.Socket, wanted []string) error {
	if p.mockups == nil {
		return nil
	}
	for _, index := range wanted {
		if err := p.mockups.Send(s, index); err != nil {
			return err
		}
	}
	body := p.r.World.Get(s.Player.Body)
	if body == nil {
		return nil
	}
	for _, up := range body.Upgrades {
		if body.Skill.Level >= up.Level {
			if err := p.mockups.Send(s, up.Index); err != nil {
				return err
			}
		}
	}
	return nil
}

func (p *Players) disconnected(s *net.Socket) {
	if s.Player.Body.Valid() && p.r.Extras.Get(s.Player.Body).UnderControl {
		p.giveUp(s)
	}
	if s.Player.Body.Valid() {
		delete(p.owner, s.Player.Body)
		if body := p.r.World.Get(s.Player.Body); body != nil {
			body.Health.Amount = -100
		}
		s.Player.Body = entity.EntityID{}
	}
	if snap := p.lastBody[s]; snap != nil {
		p.clearBulletMirror(snap)
	}
	delete(p.lastBody, s)
	delete(p.guis, s)
	delete(p.casts, s)
	for i, v := range p.views {
		if v == s.View {
			p.views = append(p.views[:i], p.views[i+1:]...)
			break
		}
	}
	s.View = nil
}

func (p *Players) needsRoom(s *net.Socket, req net.ClSpawn) {
	p.newPlayer(s)

	tiles, err := p.r.TilesJSON()
	if err != nil {
		p.fail(err)
		return
	}
	blackout, err := p.r.BlackoutJSON()
	if err != nil {
		p.fail(err)
		return
	}
	msg := (&net.SvRoomSetup{
		Width:           p.r.Geometry.Width(),
		Height:          p.r.Geometry.Height(),
		TilesJSON:       tiles,
		ServerStartTime: 0,
		RoomSpeed:       p.r.Tuning.GameSpeed,
		BlackoutJSON:    blackout,
		RoundArena:      p.r.Tuning.RoundArena,
	}).Append(s.Builder.Buf())
	p.fail(s.Talk(msg))
}

func (p *Players) newPlayer(s *net.Socket) {
	info := p.r.GetSpawnLocation(s.RememberedTeam, s.HasRememberedTeam, "")

	s.Camera.X = float64(info.Loc.X)
	s.Camera.Y = float64(info.Loc.Y)
	s.Camera.FOV = 2000
	if s.View != nil {
		p.fail(s.View.GazeUpon(p.r.World, p.frameInput(), true))
	}
	s.RememberedTeam, s.HasRememberedTeam = info.Team, info.HasTeam
	s.Player.Spawn = vmath.Vec2{X: info.Loc.X, Y: info.Loc.Y}
	s.Player.HasSpawn = true
}

func (p *Players) spawnRequest(s *net.Socket, req net.ClSpawn) {
	if p.r.CannotRespawn || p.r.ArenaClosed || !s.Status.ReadyToSpawn {
		return
	}
	s.Status.Deceased = false

	info := p.r.GetSpawnLocation(s.RememberedTeam, s.HasRememberedTeam, req.Name)
	if s.Player.HasSpawn && !p.r.HasSpawnPoint && !p.r.Flags.ClanWars {
		info.Loc = s.Player.Spawn
	}

	body, err := p.r.SpawnPlayerBody(info, req.Name, s.Status.Incognito)
	if err != nil {
		p.fail(err)
		return
	}
	e := p.r.World.Get(body)
	if e == nil {
		return
	}

	if p.r.Attach != nil {
		p.fail(p.r.Attach.AttachControllers(p.r.World, body, ctrlListenToPlayer))
	}
	s.Player.Body = body
	s.Player.Became = true
	s.Player.Team, s.Player.HasTeam = e.Team, true
	s.SpectateEntity = entity.EntityID{}
	s.Status.HasOperator = false
	p.owner[body] = s

	s.Player.TeamColor = p.cfg.Persp.TeamColorFor(e.Team)
	s.Player.Target.X, s.Player.Target.Y = 0, 0
	s.Player.Command = net.PlayerCommand{}
	s.Player.SpawnBegin = p.now()
	s.Camera.X = float64(p.r.World.Pos[body.Index].X)
	s.Camera.Y = float64(p.r.World.Pos[body.Index].Y)
	s.Camera.FOV = 2000
	s.Status.HasSpawned = true

	if p.r.Comms != nil && p.r.Tuning.SpawnMessage != "" {
		for _, line := range splitLines(p.r.Tuning.SpawnMessage) {
			p.r.Comms.SendTo(body, line)
		}
	}

	p.guis[s] = newGUIState()

	p.fail(s.Talk((&net.SvForceCamera{X: s.Camera.X, Y: s.Camera.Y, FOV: s.Camera.FOV}).Append(s.Builder.Buf())))
	s.Status.ReadyToBroadcast = true
}

// Flags determine camera type based on entity properties.
var ctrlListenToPlayer = defs.Controller{Name: "listenToPlayer"}

func (p *Players) photoKind(id entity.EntityID) net.PhotoKind {
	f := p.r.World.Flag[id.Index]
	switch {
	case f.Has(entity.FlagTurret):
		return net.KindTurret
	case f.Has(entity.FlagLimited):
		return net.KindBullet
	default:
		return net.KindEntity
	}
}

func (p *Players) gunPhoto(id entity.GunID) (net.Gun, bool) {
	if p.lg == nil || p.lg.GunDeps.Guns == nil {
		return net.Gun{}, false
	}
	g := p.lg.GunDeps.Guns.Get(id)
	if g == nil {
		return net.Gun{}, false
	}
	info := guns.GetPhotoInfo(g)
	return net.Gun{
		Time:        float64(info.Time),
		Power:       info.Power,
		Color:       info.Color,
		Alpha:       info.Alpha,
		StrokeWidth: info.StrokeWidth,
		Borderless:  info.Borderless,
		DrawFill:    info.DrawFill,
		DrawAbove:   info.DrawAbove,
		Length:      info.Length,
		Width:       info.Width,
		Aspect:      info.Aspect,
		Angle:       info.Angle,
		Direction:   info.Direction,
		Offset:      info.Offset,
		Layer:       float64(info.Layer),
	}, true
}

func (p *Players) target(s *net.Socket, x, y float64) {
	s.Player.Target.X, s.Player.Target.Y = x, y
}

func (p *Players) commands(s *net.Socket, reverseTank net.Value, bits int) {
	_ = reverseTank
	_ = bits
}

func (p *Players) toggled(s *net.Socket, index int, name string, on bool) {
	if !s.Player.Body.Valid() || p.r.Comms == nil {
		return
	}
	state := "disabled"
	if on {
		state = "enabled"
	}
	p.r.Comms.SendTo(s.Player.Body, upperFirst(name)+" "+state+".")
}

func (p *Players) Views(lastCycle float64) {
	clients := p.g.Sockets.Clients()
	if len(clients) == 0 {
		return
	}
	in := p.frameInput()
	in.LastCycle = lastCycle
	for _, s := range clients {
		if !s.Status.ReadyToBroadcast || s.View == nil {
			continue
		}
		in.GUI = net.GUIBlock{}
		p.updateGUI(s)
		p.publishGUI(s, &in.GUI)
		p.fail(s.View.GazeUpon(p.r.World, in, false))
	}
}

func (p *Players) frameInput() net.FrameInput {
	return net.FrameInput{
		LastCycle:   p.s.ElapsedMS(),
		ArenaClosed: p.r.ArenaClosed,
		Entities:    p.s.Tracked(),
	}
}

func (p *Players) inputFor(id entity.EntityID) *ctrl.PlayerCommand {
	s := p.owner[id]
	if s == nil {
		return nil
	}
	c := &p.input
	c.Target = vmath.Vec2{X: s.Player.Target.X, Y: s.Player.Target.Y}
	c.Autofire, c.Lmb = s.Player.Command.Autofire, s.Player.Command.LMB
	c.Autoalt, c.Rmb = s.Player.Command.Autoalt, s.Player.Command.RMB
	c.Spinlock = s.Player.Command.Spinlock
	c.Autospin = s.Player.Command.Autospin
	c.Override = s.Player.Command.Override
	c.Right, c.Left = boolToFloat(s.Player.Command.Right), boolToFloat(s.Player.Command.Left)
	c.Up, c.Down = boolToFloat(s.Player.Command.Up), boolToFloat(s.Player.Command.Down)
	return c
}

func boolToFloat(b bool) float64 {
	if b {
		return 1
	}
	return 0
}

func (p *Players) fail(err error) {
	if err != nil && p.s != nil && p.s.Hooks.Error != nil {
		p.s.Hooks.Error(err)
	}
}

func splitLines(s string) []string {
	out := []string{}
	start := 0
	for i := 0; i < len(s); i++ {
		if s[i] == '\n' {
			out = append(out, s[start:i])
			start = i + 1
		}
	}
	return append(out, s[start:])
}

func upperFirst(s string) string {
	if s == "" {
		return s
	}
	if s[0] >= 'a' && s[0] <= 'z' {
		return string(s[0]-32) + s[1:]
	}
	return s
}
