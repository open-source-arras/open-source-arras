package define

import (
	"fmt"

	"arrasgo/internal/config"
	"arrasgo/internal/ctrl"
	"arrasgo/internal/defs"
	"arrasgo/internal/entity"
	"arrasgo/internal/guns"
	"arrasgo/internal/jsutil"
	"arrasgo/internal/vmath"
)

type Config struct {
	Defs           *defs.Set
	Guns           *guns.Table
	Ctrl           *ctrl.Table
	Tuning         *config.Tuning
	Rand           *jsutil.Rand
	Growth         bool
	DisableGuns    bool
	RandomSpot     func(*jsutil.Rand) vmath.Vec2
	TearDownTurret func(id entity.EntityID)
	OnSpawn        func(id entity.EntityID)
	OnDefine       func(w *entity.World, id entity.EntityID) error
	SetTargetable  func(id entity.EntityID, targetable bool)
	HasSocket      func(id entity.EntityID) bool
}

type Definer struct {
	cfg             Config
	resolver        *defs.Resolver
	genericTankSIZE float64
	chainCache      map[string]seeded
	unported        map[string]int
}

func New(cfg Config) (*Definer, error) {
	if cfg.Defs == nil {
		return nil, fmt.Errorf("define: a *defs.Set is required")
	}
	if cfg.Tuning == nil {
		return nil, fmt.Errorf("define: a *config.Tuning is required (Skill's curve divides by skill_cap)")
	}
	if cfg.Rand == nil {
		return nil, fmt.Errorf("define: a *jsutil.Rand is required (docs/architecture.md, \"Randomness must be injectable\")")
	}
	r, err := defs.NewResolver(cfg.Defs, cfg.Rand)
	if err != nil {
		return nil, err
	}
	r.DeferSquiggle(true)
	d := &Definer{
		cfg:             cfg,
		resolver:        r,
		genericTankSIZE: 12,
		chainCache:      make(map[string]seeded),
		unported:        make(map[string]int),
	}
	if gt, ok := cfg.Defs.Get("genericTank"); ok {
		if v, ok := gt.Size.Get(); ok {
			d.genericTankSIZE = v
		}
	}
	return d, nil
}

func (d *Definer) Define(w *entity.World, id entity.EntityID, name string) error {
	if w == nil {
		return fmt.Errorf("define: nil world")
	}
	if w.Get(id) == nil {
		return fmt.Errorf("define: %q applied to a dead or invalid entity handle", name)
	}
	res, err := d.resolver.Resolve(name)
	if err != nil {
		return err
	}
	if err := d.apply(w, id, res, d.seededChain(name)); err != nil {
		return err
	}
	return d.emitDefine(w, id)
}

func (d *Definer) DefineInline(w *entity.World, id entity.EntityID, def *defs.Definition) error {
	if w == nil {
		return fmt.Errorf("define: nil world")
	}
	if def == nil {
		return fmt.Errorf("define: nil inline definition")
	}
	if w.Get(id) == nil {
		return fmt.Errorf("define: inline definition applied to a dead or invalid entity handle")
	}
	res, err := d.resolver.ResolveDefs(defs.TypeList{{Inline: def}}, def)
	if err != nil {
		return err
	}
	return d.apply(w, id, res, d.seededInline(def))
}

func (d *Definer) DefineSplit(w *entity.World, id entity.EntityID, names []string) error {
	if w == nil {
		return fmt.Errorf("define: nil world")
	}
	if len(names) == 0 {
		return fmt.Errorf("define: empty definition list")
	}
	if w.Get(id) == nil {
		return fmt.Errorf("define: %v applied to a dead or invalid entity handle", names)
	}
	list := make(defs.TypeList, len(names))
	for i, n := range names {
		list[i] = defs.TypeRef{Name: n}
	}
	res, err := d.resolver.ResolveDefs(list, nil)
	if err != nil {
		return err
	}
	if err := d.apply(w, id, res, d.seededChain(names[0])); err != nil {
		return err
	}
	return d.emitDefine(w, id)
}

func (d *Definer) emitDefine(w *entity.World, id entity.EntityID) error {
	if d.cfg.OnDefine == nil {
		return nil
	}
	if w.Get(id) == nil {
		return nil
	}
	return d.cfg.OnDefine(w, id)
}

func (d *Definer) UnportedFuncs() map[string]int { return d.unported }

func (d *Definer) sizeContext() entity.SizeContext {
	return entity.SizeContext{
		Tuning:          d.cfg.Tuning,
		Growth:          d.cfg.Growth,
		GenericTankSIZE: d.genericTankSIZE,
	}
}

func (d *Definer) gunDeps(w *entity.World) guns.Deps {
	return guns.Deps{
		World:             w,
		Guns:              d.cfg.Guns,
		Defs:              d.cfg.Defs,
		Tuning:            d.cfg.Tuning,
		Rand:              d.cfg.Rand,
		DisableGuns:       d.cfg.DisableGuns,
		Growth:            d.cfg.Growth,
		GenericTankSIZE:   d.genericTankSIZE,
		AttachControllers: d.applyControllers,
		OnSpawn:           d.cfg.OnSpawn,
		TearDownTurret:    d.cfg.TearDownTurret,
	}
}

var notTargetable = [...]string{"bullet", "drone", "swarm", "trap", "wall", "unknown"}

func Targetable(e *entity.Entity) bool {
	for _, t := range notTargetable {
		if e.Type == t {
			return false
		}
	}
	return true
}

func (d *Definer) SetRandomSpot(f func(*jsutil.Rand) vmath.Vec2) { d.cfg.RandomSpot = f }

func (d *Definer) SetTargetableHook(f func(id entity.EntityID, targetable bool)) {
	d.cfg.SetTargetable = f
}

func (d *Definer) SetOnSpawn(f func(id entity.EntityID)) { d.cfg.OnSpawn = f }

func (d *Definer) SetTearDownTurret(f func(id entity.EntityID)) { d.cfg.TearDownTurret = f }

func (d *Definer) SetOnDefine(f func(w *entity.World, id entity.EntityID) error) { d.cfg.OnDefine = f }
