package ctrl

import "arrasgo/internal/vmath"

// Decision is the output of a controller's Think method, with tri-state fields where HasX indicates presence.
type Decision struct {
	Target    vmath.Vec2
	HasTarget bool
	Goal      vmath.Vec2
	HasGoal   bool
	Fire      bool
	HasFire   bool
	Main      bool
	HasMain   bool
	Alt       bool
	HasAlt    bool
	Power     float64
	HasPower  bool
}

// Merge combines controller output into the running decision. Merge is loaders/global.js:184-191.
func Merge(b *Decision, a Decision, acceptsFromTop bool) {
	if a.HasTarget && (!b.HasTarget || acceptsFromTop) {
		b.Target, b.HasTarget = a.Target, true
	}
	if a.HasGoal && (!b.HasGoal || acceptsFromTop) {
		b.Goal, b.HasGoal = a.Goal, true
	}
	if a.HasFire && (!b.HasFire || acceptsFromTop) {
		b.Fire, b.HasFire = a.Fire, true
	}
	if a.HasMain && (!b.HasMain || acceptsFromTop) {
		b.Main, b.HasMain = a.Main, true
	}
	if a.HasAlt && (!b.HasAlt || acceptsFromTop) {
		b.Alt, b.HasAlt = a.Alt, true
	}
	if a.HasPower && (!b.HasPower || acceptsFromTop) {
		b.Power, b.HasPower = a.Power, true
	}
}
