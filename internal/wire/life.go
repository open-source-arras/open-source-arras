package wire

import (
	"fmt"
	"math"

	"arrasgo/internal/config"
	"arrasgo/internal/ctrl"
	"arrasgo/internal/defs"
	"arrasgo/internal/entity"
	"arrasgo/internal/guns"
	"arrasgo/internal/jsutil"
	"arrasgo/internal/room"
	"arrasgo/internal/sim"
	"arrasgo/internal/spatial"
	"arrasgo/internal/vmath"
)

type Lifegiver struct {
	Sim                   *sim.Sim
	Ctrl                  *ctrl.Table
	GunDeps               guns.Deps
	Rand                  *jsutil.Rand
	Targetable            *room.TargetableSet
	Protected             *room.Protected
	Extras                *room.EntityExtraTable
	turretBuf             []entity.EntityID
	destroyBuf            []entity.EntityID
	Candidates            func() []entity.EntityID
	Walls                 *[]room.Wall
	wallBuf               []ctrl.WallHitbox
	wallTick              uint64
	wallsBuilt            bool
	RandomSpot            func(*jsutil.Rand) vmath.Vec2
	BotMove               []ctrl.BotMovePath
	JustHitAWall          func(entity.EntityID) bool
	OnDestroyed           func(entity.EntityID)
	OnUnlinked            func(entity.EntityID)
	PlayerInput           func(entity.EntityID) *ctrl.PlayerCommand
	PendingUpgrade        func(entity.EntityID) bool
	RefreshBodyAttributes func(w *entity.World, id entity.EntityID)
	OnError               func(error)
	ctx                   ctrl.Context
	gunBuf                []ctrl.GunInfo
	shootOnDeath          []entity.GunID
}

var (
	_ room.Lifegiver = (*Lifegiver)(nil)
	_                = sim.Hooks{Life: (*Lifegiver)(nil).Life}
)

func (l *Lifegiver) BringToLife(w *entity.World, id entity.EntityID) {
	if l.Sim.W == nil {
		l.Sim.W = w
	}
	l.bringToLife(w, id)
}

func (l *Lifegiver) Life(id entity.EntityID) { l.bringToLife(l.Sim.W, id) }

func (l *Lifegiver) bringToLife(w *entity.World, id entity.EntityID) {
	e := w.Get(id)
	if e == nil {
		return
	}

	var now int64
	if w.Now != nil {
		now = w.Now()
	}

	l.sizeAnimation(w, id, e)
	l.invisibility(w, id, e)
	l.runControl(w, id, e)

	l.Sim.RunMove(id, now)
	l.Sim.RunFace(id)
	if !w.Flag[id.Index].Has(entity.FlagLimited) {
		w.UpdateBodyInfo(id, l.sizeContext())
	}

	if l.PendingUpgrade != nil && l.PendingUpgrade(id) {
		return
	}

	for _, gid := range e.Guns {
		if err := guns.Live(l.deps(w), gid, l.GunDeps.Rand); err != nil && l.OnError != nil {
			l.OnError(err)
		}
	}
	turrets := e.Turrets
	for _, tid := range turrets {
		l.bringTurretToLife(w, tid, id)
	}

	if e = w.Get(id); e == nil {
		return
	}
	if e.Skill.Maintain(l.Sim.Tuning) {
		l.refreshBodyAttributes(w, id)
	}
}

func (l *Lifegiver) bringTurretToLife(w *entity.World, id, bond entity.EntityID) {
	e := w.Get(id)
	if e == nil {
		return
	}

	l.sizeAnimation(w, id, e)
	l.invisibility(w, id, e)
	l.runControl(w, id, e)

	guns.MoveTurret(l.deps(w), id, bond) // turretEntity.js:251
	l.Sim.RunFace(id)                    // turretEntity.js:264 is `global.runFace(this)`, same as an entity
	l.updateTurretBodyInfo(w, id, bond)

	if e = w.Get(id); e == nil {
		return
	}
	for _, gid := range e.Guns {
		if err := guns.Live(l.deps(w), gid, l.GunDeps.Rand); err != nil && l.OnError != nil {
			l.OnError(err)
		}
	}
	turrets := e.Turrets
	for _, tid := range turrets {
		l.bringTurretToLife(w, tid, id)
	}

	if e = w.Get(id); e == nil {
		return
	}
	sk := w.SkillRef(id)
	if sk != nil && sk.Maintain(l.Sim.Tuning) {
		guns.RefreshTurretBodyAttributes(l.deps(w), id)
	}
}

func (l *Lifegiver) sizeAnimation(w *entity.World, id entity.EntityID, e *entity.Entity) {
	switch {
	case w.Flag[id.Index].Has(entity.FlagPlayer) && !e.Settings.NoSizeAnimation:
		diff := e.SIZE - e.CoreSize
		if diff != 0 && !math.IsNaN(diff) {
			e.CoreSize += diff / 11
		}

	case e.SIZE != e.CoreSize:
		e.CoreSize = e.SIZE
	}
}

func (l *Lifegiver) invisibility(w *entity.World, id entity.EntityID, e *entity.Entity) {
	velSq := w.Vel[id.Index].Scrub().LengthSquared()
	if e.DamageReceived == 0 && velSq <= 0.1 {
		e.Alpha = math.Max(e.AlphaRange[0], e.Alpha-e.Invisible[1])
	} else {
		e.Alpha = math.Min(e.AlphaRange[1], e.Alpha+e.Invisible[0])
	}
}

func (l *Lifegiver) runControl(w *entity.World, id entity.EntityID, e *entity.Entity) {
	var b ctrl.Decision
	faucetMain := false
	if !e.Settings.Independent && e.Source.Valid() && e.Source != id {
		if src := w.Get(e.Source); src != nil {
			f := src.Control
			b.Fire, b.HasFire = f.Fire, true
			b.Main, b.HasMain = f.Main, true
			b.Alt, b.HasAlt = f.Alt, true
			if f.Main || f.Alt {
				sp, mp := w.Pos[e.Source.Index], w.Pos[id.Index]
				b.Target = vmath.Vec2{X: f.Target.X + sp.X - mp.X, Y: f.Target.Y + sp.Y - mp.Y}
				b.HasTarget = true
			}
			faucetMain = f.Main
		}
	}

	if e.Settings.AttentionCraver && !faucetMain && e.Range != 0 && !math.IsNaN(e.Range) {
		e.Range--
	}

	if l.Ctrl != nil && len(e.Controllers) > 0 {
		l.fillContext(w, id, e)
		for _, cid := range e.Controllers {
			a := l.Ctrl.Think(&l.ctx, cid, b)
			ctrl.Merge(&b, a, l.Ctrl.Kind(cid).AcceptsFromTop())
		}
	}

	if e = w.Get(id); e == nil {
		return
	}
	if b.HasTarget {
		e.Control.Target = b.Target
	}
	if b.HasGoal {
		e.Control.Goal = b.Goal
	} else {
		e.Control.Goal = w.Pos[id.Index]
	}
	e.Control.Fire = b.HasFire && b.Fire
	e.Control.Main = b.HasMain && b.Main
	e.Control.Alt = b.HasAlt && b.Alt
	if b.HasPower {
		e.Control.Power = b.Power
	} else {
		e.Control.Power = 1
	}
}

func (l *Lifegiver) fillContext(w *entity.World, id entity.EntityID, e *entity.Entity) {
	c := &l.ctx
	c.World = w
	c.Body = id
	c.Rand = l.Rand
	c.RandomSpot = l.RandomSpot
	c.BotMove = l.BotMove
	c.JustHitAWall = l.JustHitAWall
	if l.PlayerInput != nil {
		c.Player = l.PlayerInput(id)
	} else {
		c.Player = nil
	}
	c.RefreshBodyAttributes = l.ctxRefreshBodyAttributes
	c.RunSpeed = l.Sim.RunSpeed
	c.Growth = l.Sim.Gamemode.Growth
	c.GenericTankSIZE = l.Sim.GenericTankSIZE
	c.RoomCenter = vmath.Vec2{}
	c.Guns = l.gunSummary(w, e)
	if l.Candidates != nil {
		c.Candidates = l.Candidates()
	}
	c.Walls = l.walls(w)
}

func (l *Lifegiver) walls(w *entity.World) []ctrl.WallHitbox {
	if l.Walls == nil || len(*l.Walls) == 0 {
		return nil
	}
	tick := l.Sim.Tick()
	if l.wallsBuilt && l.wallTick == tick {
		return l.wallBuf
	}
	l.wallTick, l.wallsBuilt = tick, true

	list := *l.Walls
	l.wallBuf = l.wallBuf[:0]
	for i := range list {
		if w.Get(list[i].ID) != nil {
			list[i].Box.Pos = w.Pos[list[i].ID.Index]
		}
		l.wallBuf = append(l.wallBuf, list[i].Box)
	}
	return l.wallBuf
}

func (l *Lifegiver) gunSummary(w *entity.World, e *entity.Entity) []ctrl.GunInfo {
	l.gunBuf = l.gunBuf[:0]
	if l.GunDeps.Guns == nil || len(e.Guns) == 0 {
		return nil
	}
	d := l.deps(w)
	for _, gid := range e.Guns {
		g := l.GunDeps.Guns.Get(gid)
		if g == nil {
			l.gunBuf = append(l.gunBuf, ctrl.GunInfo{})
			continue
		}
		// typo gun.js:233 has, reproduced in both places.
		reloadStat := 1.0
		if g.Calculator != "necro" && g.Calculator != "fixed reload" {
			reloadStat = g.BulletStats.Fixed.Rld
			if g.BulletStats.UseMaster {
				if sk := w.SkillRef(e.ID); sk != nil {
					reloadStat = sk.Rld
				}
			}
		}
		speed, rang := guns.GetTracking(d, g)
		l.gunBuf = append(l.gunBuf, ctrl.GunInfo{
			CanShoot:      g.CanShoot,
			Stack:         g.Stack,
			Cycle:         math.NaN(),
			Reload:        g.Settings.Reload,
			ReloadStat:    reloadStat,
			Angle:         g.Angle,
			AltFire:       g.AltFire,
			TrackingSpeed: speed,
			TrackingRange: rang,
		})
	}
	return l.gunBuf
}

func (l *Lifegiver) ctxRefreshBodyAttributes(id entity.EntityID) {
	l.refreshBodyAttributes(l.Sim.W, id)
}

func (l *Lifegiver) refreshBodyAttributes(w *entity.World, id entity.EntityID) {
	if l.RefreshBodyAttributes == nil {
		return
	}
	l.RefreshBodyAttributes(w, id)
}

func (l *Lifegiver) updateTurretBodyInfo(w *entity.World, id, bond entity.EntityID) {
	e := w.Get(id)
	if e == nil {
		return
	}
	size := w.ComputeSize(bond, l.sizeContext()) * e.Bound.Size
	w.Size[id.Index] = size
	e.Fov = e.FOV * 275 * math.Sqrt(size)
}

func (l *Lifegiver) sizeContext() entity.SizeContext {
	return entity.SizeContext{
		Tuning:          l.Sim.Tuning,
		Growth:          l.Sim.Gamemode.Growth,
		GenericTankSIZE: l.Sim.GenericTankSIZE,
	}
}

func (l *Lifegiver) deps(w *entity.World) guns.Deps {
	d := l.GunDeps
	d.World = w
	d.Growth = l.Sim.Gamemode.Growth
	d.GenericTankSIZE = l.Sim.GenericTankSIZE
	return d
}

// Boot order

type LifeOptions struct {
	// Grid is the broad phase the Sim sweeps.
	Grid *spatial.Grid

	Tuning    *config.Tuning
	Gamemodes []string

	Rand *jsutil.Rand

	Ctrl *ctrl.Table
	Guns *guns.Table
	Defs *defs.Set

	RefreshBodyAttributes func(w *entity.World, id entity.EntityID)

	OnError func(error)
}

func PeekGamemodeFlags(tuning *config.Tuning, gamemodes []string) (room.GamemodeFlags, error) {
	scratchTuning := *tuning
	var mutable room.RoomMutableConfig
	var flags room.GamemodeFlags
	err := room.ApplyGamemodes(&scratchTuning, &mutable, &flags, jsutil.NewRand(0), gamemodes)
	if err != nil {
		return flags, fmt.Errorf("wire: reading gamemode flags: %w", err)
	}
	return flags, nil
}

func StartLife(o LifeOptions) (*sim.Sim, *Lifegiver, error) {
	merged := *o.Tuning
	var mutable room.RoomMutableConfig
	var flags room.GamemodeFlags
	if err := room.ApplyGamemodes(&merged, &mutable, &flags, jsutil.NewRand(0), o.Gamemodes); err != nil {
		return nil, nil, fmt.Errorf("wire: previewing gamemode config for the simulation: %w", err)
	}

	s := sim.New(nil, o.Grid)
	s.Tuning = o.Tuning
	s.Rand = o.Rand
	applySpeeds(s, &merged)

	l := &Lifegiver{
		Sim:  s,
		Ctrl: o.Ctrl,
		GunDeps: guns.Deps{
			Guns:        o.Guns,
			Defs:        o.Defs,
			Tuning:      o.Tuning,
			Rand:        o.Rand,
			DisableGuns: flags.DisableGuns,
		},
		Rand:                  o.Rand,
		RefreshBodyAttributes: o.RefreshBodyAttributes,
		OnError:               o.OnError,
	}
	l.JustHitAWall = s.ConsumeWallHit
	return s, l, nil
}

func FinishLife(s *sim.Sim, l *Lifegiver, r *room.Room) {
	if s.W == nil {
		s.W = r.World
	}
	s.Tuning = &r.Tuning
	l.GunDeps.Tuning = &r.Tuning
	applySpeeds(s, &r.Tuning)
	s.Room = sim.Room{Width: r.Geometry.Width(), Height: r.Geometry.Height()}
	s.Gamemode = sim.Gamemode{
		Train:    r.Flags.Train,
		Outbreak: r.Flags.Outbreak,
		Growth:   r.Flags.Growth,
	}
	s.Hooks.Life = l.Life

	// controllers.js:976's Config.BOT_MOVE.
	l.BotMove = r.Flags.BotMove

	pools, geo := r.Pools, r.Geometry
	l.RandomSpot = func(rng *jsutil.Rand) vmath.Vec2 {
		return pools.RandomPoint(rng, geo, room.SpawnPoolDefault)
	}
	if setter, ok := r.Definer.(interface {
		SetRandomSpot(func(*jsutil.Rand) vmath.Vec2)
	}); ok {
		setter.SetRandomSpot(l.RandomSpot)
	}

	if setter, ok := r.Definer.(interface {
		SetTargetableHook(func(entity.EntityID, bool))
	}); ok {
		world, reg := r.World, r.Targetable
		setter.SetTargetableHook(func(id entity.EntityID, targetable bool) {
			reg.Set(world, id, targetable)
		})
		world.EachLive(func(id entity.EntityID, e *entity.Entity) {
			reg.Set(world, id, !notTargetableType(e.Type))
		})
	}
	l.Candidates = r.Targetable.Candidates
	l.Targetable = r.Targetable
	l.Protected = r.Protected
	l.Extras = r.Extras
	l.Walls = &r.Walls
	s.Hooks.Destroy = l.Destroy

	s.Hooks.RefreshBodyAttributes = l.ctxRefreshBodyAttributes

	if r.Definer != nil {
		definer := r.Definer
		s.Hooks.Necro = func(tank, host entity.EntityID) bool {
			t, h := s.W.Get(tank), s.W.Get(host)
			if t == nil || h == nil {
				return false
			}
			// JS's `undefined`, and `!gun` bails.
			var gid entity.GunID
			ok := false
			for _, n := range t.Settings.NecroDefineGuns {
				if n.Shape == int32(h.Shape) {
					gid, ok = n.Gun, true
					break
				}
			}
			if !ok || gid == 0 {
				return false
			}
			d := l.deps(s.W)
			if !guns.CheckShootPermission(d, gid) {
				return false
			}

			savedFacing, savedSize := h.Facing, h.SIZE
			h.Controllers = h.Controllers[:0]
			if err := definer.Define(s.W, host, "genericEntity"); err != nil {
				if l.OnError != nil {
					l.OnError(err)
				}
				return false
			}
			if err := guns.BulletInitOnto(d, gid, host, s.W.Vel[host.Index]); err != nil {
				if l.OnError != nil {
					l.OnError(err)
				}
				return false
			}
			h = s.W.Get(host)
			t = s.W.Get(tank)
			if h == nil || t == nil {
				return true // the JS returns its bail regardless
			}
			if m := s.W.Get(t.Master); m != nil {
				if mm := s.W.Get(m.Master); mm != nil {
					h.Team = mm.Team
				}
			}
			h.Master = t.Master
			h.Color.SetBase(t.Color.Base())
			h.Facing = savedFacing
			h.SIZE = savedSize
			h.Health.Amount = h.Health.Max
			s.W.Size[host.Index] = s.W.ComputeSize(host, l.sizeContext())
			return true
		}
	}

	if r.Definer != nil {
		definer := r.Definer
		s.Hooks.SpawnAssemblerEffect = func(parent entity.EntityID, velX, velY, size float64) {
			src := s.W.Get(parent)
			if src == nil {
				return
			}
			// entity.World.Spawn already sets.
			id := s.W.Spawn()
			s.W.Pos[id.Index] = s.W.Pos[parent.Index]
			e := s.W.Get(id)
			if e == nil {
				return
			}
			e.Master = parent
			s.Track(id)
			if err := definer.Define(s.W, id, "assemblerEffect"); err != nil {
				if l.OnError != nil {
					l.OnError(err)
				}
				return
			}
			if e = s.W.Get(id); e == nil {
				return
			}
			e.Team = src.Team
			e.Color = src.Color
			e.SIZE = size
			s.W.Vel[id.Index] = vmath.Vec2{X: velX, Y: velY}
			definer.RefreshBodyAttributes(s.W, id)
			l.BringToLife(s.W, id)
		}
	}

	s.Hooks.ShootOnDeath = func(id entity.EntityID) {
		e := s.W.Get(id)
		if e == nil || l.GunDeps.Guns == nil {
			return
		}
		d := l.deps(s.W)
		for _, gid := range append(l.shootOnDeath[:0], e.Guns...) {
			g := l.GunDeps.Guns.Get(gid)
			if g == nil || !g.ShootOnDeath || !s.W.Alive(g.Body) {
				continue
			}
			if err := guns.FireBullet(d, gid, l.GunDeps.Rand); err != nil && l.OnError != nil {
				l.OnError(err)
			}
		}
	}

	// `if (!liveEntity.defs)` branch.
	if ob := r.Gamemodes.Outbreak; ob != nil {
		set := l.GunDeps.Defs
		s.Hooks.Zombify = func(id entity.EntityID) {
			name := ""
			if e := s.W.Get(id); e != nil && len(e.Defs) > 0 && set != nil {
				if n, ok := set.NameAt(int(e.Defs[0])); ok {
					name = n
				}
			}
			if _, err := ob.Zombify(id, name); err != nil && l.OnError != nil {
				l.OnError(err)
			}
		}
	}
	announcer := newDeathAnnouncer(r, s)
	s.Hooks.OnDeath = func(d *sim.Death) {
		announcer.announce(d)
		r.OnEntityDeath(d.Victim)
	}

	l.GunDeps.OnSpawn = s.Track
	if att := r.Attach; att != nil {
		l.GunDeps.AttachControllers = func(w *entity.World, id entity.EntityID, list []defs.Controller) error {
			return att.AttachControllers(w, id, list...)
		}
	}
	// gun.js:465's `o.life()`, made from inside bulletInit itself.
	l.GunDeps.BringToLife = func(id entity.EntityID) { l.BringToLife(l.Sim.W, id) }
	l.GunDeps.TearDownTurret = func(id entity.EntityID) { l.destroyTurret(l.Sim.W, id) }
	if setter, ok := r.Definer.(interface {
		SetTearDownTurret(func(entity.EntityID))
	}); ok {
		setter.SetTearDownTurret(l.GunDeps.TearDownTurret)
	}
	if setter, ok := r.Definer.(interface {
		SetOnSpawn(func(entity.EntityID))
	}); ok {
		setter.SetOnSpawn(s.Track)
	}

	if setter, ok := r.Definer.(interface {
		SetOnDefine(func(*entity.World, entity.EntityID) error)
	}); ok {
		setter.SetOnDefine(r.OnEntityDefine)
	}

	r.World.EachLive(func(id entity.EntityID, _ *entity.Entity) { s.Track(id) })
	r.OnSpawn = s.Track
}

func applySpeeds(s *sim.Sim, t *config.Tuning) {
	if t.GameSpeed > 0 {
		s.RoomSpeed = t.GameSpeed
		s.CycleSpeedMS = 1000.0 / t.GameSpeed / 30.0
	}
	s.RunSpeed = t.RunSpeed
}

func notTargetableType(t string) bool {
	switch t {
	case "bullet", "drone", "swarm", "trap", "wall", "unknown":
		return true
	}
	return false
}
