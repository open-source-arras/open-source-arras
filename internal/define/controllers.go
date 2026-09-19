package define

import (
	"fmt"
	"math"

	"arrasgo/internal/ctrl"
	"arrasgo/internal/defs"
	"arrasgo/internal/entity"
)

// AttachControllers builds the named controllers and merges them onto the entity's list.
// Splicing a controller with a duplicate kind replaces it in place.
func (d *Definer) AttachControllers(w *entity.World, id entity.EntityID, controllers ...defs.Controller) error {
	return d.applyControllers(w, id, controllers)
}

// applyHeadSteps applies RESET_CONTROLLERS, CONTROLLERS, VARIES_IN_SIZE, and SIZE, in that order.
func (d *Definer) applyHeadSteps(w *entity.World, id entity.EntityID, steps []defs.DefineStep) error {
	e := w.Get(id)
	if e == nil {
		return fmt.Errorf("define: steps applied to a dead entity handle")
	}
	squiggle := e.Squiggle
	if squiggle == 0 {
		squiggle = 1
	}
	size, sizeSet := 0.0, false
	core, coreSet := 0.0, false

	for _, step := range steps {
		switch step.Kind {
		case defs.StepResetControllers:
			if e := w.Get(id); e != nil {
				e.Controllers = e.Controllers[:0]
			}
		case defs.StepControllers:
			if err := d.applyControllers(w, id, step.Controllers); err != nil {
				return err
			}
		case defs.StepSquiggle:
			if step.Varies {
				squiggle = d.cfg.Rand.RandomRange(0.8, 1.2)
			} else {
				squiggle = 1
			}
		case defs.StepSize:
			size, sizeSet = step.Raw*squiggle, true
			if !coreSet {
				core, coreSet = size, true
			}
		case defs.StepSizeMul:
			base := 1.0
			if sizeSet {
				base = size
			}
			size, sizeSet = base*step.Raw*squiggle, true
			if !coreSet {
				core, coreSet = size, true
			}
		}
	}

	e = w.Get(id)
	if e == nil {
		return fmt.Errorf("define: steps applied to a dead entity handle")
	}
	e.Squiggle = squiggle
	if sizeSet {
		e.SIZE = size
	}
	if coreSet && e.CoreSize == 0 {
		e.CoreSize = core
	}
	return nil
}

// applyScoreSteps applies VALUE using entity.js:411's max rule.
func (d *Definer) applyScoreSteps(w *entity.World, id entity.EntityID, steps []defs.DefineStep) {
	e := w.Get(id)
	if e == nil {
		return
	}
	for _, step := range steps {
		if step.Kind != defs.StepScore {
			continue
		}
		e.Skill.Score = math.Max(e.Skill.Score, step.Raw*e.Squiggle)
	}
}

func (d *Definer) applyControllers(w *entity.World, id entity.EntityID, list []defs.Controller) error {
	if len(list) == 0 {
		return nil
	}
	if d.cfg.Ctrl == nil {
		return fmt.Errorf("define: %d controllers requested but no controller table is wired in", len(list))
	}
	e := w.Get(id)
	if e == nil {
		return fmt.Errorf("define: controllers applied to a dead entity handle")
	}
	specs := make([]ctrl.Spec, 0, len(list))
	for _, c := range list {
		kind, ok := ctrl.KindByName(c.Name)
		if !ok {
			return fmt.Errorf("define: controller %q was attempted to be gotten but does not exist", c.Name)
		}
		specs = append(specs, ctrl.Spec{Kind: kind, Opts: optsOf(c.Args)})
	}
	ctx := &ctrl.Context{World: w, Body: id, Rand: d.cfg.Rand, RunSpeed: d.cfg.Tuning.RunSpeed,
		RandomSpot: d.cfg.RandomSpot}
	e.Controllers = d.cfg.Ctrl.Add(ctx, e.Controllers, specs)
	return nil
}

// optsOf maps definition arguments to ctrl.Opts, ignoring keys not read by any constructor.
func optsOf(a defs.ControllerArgs) ctrl.Opts {
	var o ctrl.Opts
	if !a.Present() {
		return o
	}
	if v, ok := a.Amplitude.Get(); ok {
		o.Amplitude, o.HasAmplitude = v, true
	}
	if v, ok := a.Distance.Get(); ok {
		o.Distance, o.HasDistance = v, true
	}
	o.Independent = a.Independent.Or(false)
	o.Invert = a.Invert.Or(false)
	o.LockThroughWalls = a.LockThroughWalls.Or(false)
	o.LookAtGoal = a.LookAtGoal.Or(false)
	o.OnlyIfHasAltFireGun = a.OnlyIfHasAltFireGun.Or(false)
	o.OnlyWhenIdle = a.OnlyWhenIdle.Or(false)
	if v, ok := a.Range.Get(); ok {
		o.Range, o.HasRange = v, true
	}
	o.ReplicatePlayerMovement = a.ReplicatePlayerMovement.Or(false)
	if v, ok := a.Speed.Get(); ok {
		o.Speed, o.HasSpeed = v, true
	}
	o.Static = a.Static.Or(false)
	if v, ok := a.Turnwiserange.Get(); ok {
		o.TurnwiseRange, o.HasTurnwiseRange = v, true
	}
	o.UseOwnMaster = a.UseOwnMaster.Or(false)
	if v, ok := a.YOffset.Get(); ok {
		o.YOffset, o.HasYOffset = v, true
	}
	return o
}
