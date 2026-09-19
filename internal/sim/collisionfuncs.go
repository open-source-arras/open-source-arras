package sim

import (
	"math"

	"arrasgo/internal/jsmath"
	"strings"

	"arrasgo/internal/entity"
	"arrasgo/internal/jsutil"
)

// Collision resolvers from js-src/server/miscFiles/collisionFunctions.js.

// jsLength computes the Euclidean distance from the origin.
func jsLength(x, y float64) float64 { return jsmath.Length(x, y) }

// Simplecollide is collisionFunctions.js:1.
func (s *Sim) Simplecollide(myID, nID entity.EntityID) {
	if s.Hooks.WatchCollide != nil {
		s.Hooks.WatchCollide("simplecollide", myID, nID)
	}
	my, n := s.W.Get(myID), s.W.Get(nID)
	if my == nil || n == nil {
		return
	}
	i, j := myID.Index, nID.Index
	mp, np := s.W.Pos[i].Scrub(), s.W.Pos[j].Scrub()

	dx := float64(mp.X) - float64(np.X)
	dy := float64(mp.Y) - float64(np.Y)
	dist := math.Hypot(dx, dy)
	difference := (1 + dist/2) * s.RunSpeed

	pushability1 := my.Pushability
	if my.Intangibility != 0 {
		pushability1 = 1
	}
	pushability2 := n.Pushability
	if n.Intangibility != 0 {
		pushability2 = 1
	}
	factor := pushability1 / (pushability2 + 0.3) * 0.05 / difference
	fx, fy := dx*factor, dy*factor

	s.addAccel(i, fx, fy)
	s.addAccel(j, -fx, -fy)
}

// Firmcollide is collisionFunctions.js:16.
func (s *Sim) Firmcollide(myID, nID entity.EntityID, buffer float64) {
	if s.Hooks.WatchCollide != nil {
		s.Hooks.WatchCollide("firmcollide", myID, nID)
	}
	my, n := s.W.Get(myID), s.W.Get(nID)
	if my == nil || n == nil {
		return
	}
	i, j := myID.Index, nID.Index
	mp, np := s.W.Pos[i].Scrub(), s.W.Pos[j].Scrub()

	mx := float64(mp.X) + s.xMotion(i)
	myy := float64(mp.Y) + s.yMotion(i)
	nx := float64(np.X) + s.xMotion(j)
	ny := float64(np.Y) + s.yMotion(j)
	dx, dy := nx-mx, ny-myy
	distSq := dx*dx + dy*dy
	if distSq == 0 {
		return
	}

	totalSize := s.realSize(myID) + s.realSize(nID)
	bufferLimit := totalSize + buffer
	if buffer > 0 && distSq <= bufferLimit*bufferLimit {
		dist := math.Sqrt(distSq)
		factor := ((my.Acceleration + n.Acceleration) * (bufferLimit - dist)) /
			(buffer * s.RunSpeed * dist)
		accelX, accelY := dx*factor, dy*factor
		s.addAccel(i, -accelX, -accelY)
		s.addAccel(j, accelX, accelY)
	}
	if distSq > totalSize*totalSize {
		return
	}

	dist := math.Sqrt(distSq)
	overlap := totalSize - dist
	iterations := math.Min(20, float64(toInt32(overlap*20)))
	factor := 0.01 * iterations / (dist * s.RunSpeed)
	adjustX, adjustY := dx*factor, dy*factor

	// Speed condition is always true. See docs/found-bugs.md.
	// Velocities stay as float64 until end (spike branch reads them back).
	mv, nv := s.W.Vel[i].Scrub(), s.W.Vel[j].Scrub()
	mvx, mvy := float64(mv.X), float64(mv.Y)
	nvx, nvy := float64(nv.X), float64(nv.Y)
	mySpeed := math.Hypot(mvx, mvy)
	nSpeed := math.Hypot(nvx, nvy)
	if mySpeed <= math.Max(mySpeed, my.TopSpeed) {
		mvx -= adjustX
		mvy -= adjustY
	}
	if nSpeed <= math.Max(nSpeed, n.TopSpeed) {
		nvx += adjustX
		nvy += adjustY
	}

	if strings.Contains(my.Label, "Spike") && strings.Contains(n.Label, "Spike") {
		mvx, mvy, nvx, nvy = spikeBounce(
			float64(mp.X), float64(mp.Y), float64(np.X), float64(np.Y),
			mvx, mvy, nvx, nvy)
	}

	s.W.Vel[i].X, s.W.Vel[i].Y = float64(mvx), float64(mvy)
	s.W.Vel[j].X, s.W.Vel[j].Y = float64(nvx), float64(nvy)
}

// spikeBounce is the tail of firmcollide: two Spikes reflect five times faster.
// Distance can be zero and create NaN. See docs/found-bugs.md.
func spikeBounce(mx, my, nx, ny, mvx, mvy, nvx, nvy float64) (float64, float64, float64, float64) {
	const bounceFactor = 5
	dx, dy := mx-nx, my-ny
	dist := math.Hypot(dx, dy)
	if dist == 0 {
		return mvx, mvy, nvx, nvy
	}
	ux, uy := dx/dist, dy/dist

	dot := mvx*ux + mvy*uy
	dot2 := nvx*(-ux) + nvy*(-uy)

	return (mvx - 2*dot*ux) * bounceFactor,
		(mvy - 2*dot*uy) * bounceFactor,
		(nvx - 2*dot2*(-ux)) * bounceFactor,
		(nvy - 2*dot2*(-uy)) * bounceFactor
}

// Firmcollidehard is collisionFunctions.js:72.
// Config.runSpeed does not exist. Divisions write NaN. See docs/found-bugs.md.
func (s *Sim) Firmcollidehard(myID, nID entity.EntityID, buffer float64) {
	if s.Hooks.WatchCollide != nil {
		s.Hooks.WatchCollide("firmcollidehard", myID, nID)
	}
	my, n := s.W.Get(myID), s.W.Get(nID)
	if my == nil || n == nil {
		return
	}
	i, j := myID.Index, nID.Index

	// Config.runSpeed does not exist, so set it to NaN to match JS behavior.
	configRunSpeed := math.NaN()

	pos := func() (x1, y1, x2, y2 float64) {
		mp, np := s.W.Pos[i].Scrub(), s.W.Pos[j].Scrub()
		return float64(mp.X) + s.xMotion(i), float64(mp.Y) + s.yMotion(i),
			float64(np.X) + s.xMotion(j), float64(np.Y) + s.yMotion(j)
	}
	x1, y1, x2, y2 := pos()
	dist := jsLength(x2-x1, y2-y1)

	s1 := math.Max(s.velLength(i), my.TopSpeed)
	s2 := math.Max(s.velLength(j), n.TopSpeed)

	sizes := s.realSize(myID) + s.realSize(nID)
	if buffer > 0 && dist <= sizes+buffer {
		repel := (my.Acceleration + n.Acceleration) * (sizes + buffer - dist) / buffer / configRunSpeed
		s.addAccel(i, repel*(x1-x2)/dist, repel*(y1-y2)/dist)
		s.addAccel(j, -repel*(x1-x2)/dist, -repel*(y1-y2)/dist)
	}

	strike1, strike2 := false, false
	for cycles := 0; dist <= s.realSize(myID)+s.realSize(nID) && !(strike1 && strike2) && cycles < 150; cycles++ {
		strike1, strike2 = false, false
		if s.velLength(i) <= s1 {
			s.addVel(i, -0.05*(x2-x1)/dist/configRunSpeed, -0.05*(y2-y1)/dist/configRunSpeed)
		} else {
			strike1 = true
		}
		if s.velLength(j) <= s2 {
			s.addVel(j, 0.05*(x2-x1)/dist/configRunSpeed, 0.05*(y2-y1)/dist/configRunSpeed)
		} else {
			strike2 = true
		}
		x1, y1, x2, y2 = pos()
		dist = jsLength(x2-x1, y2-y1)
	}
}

// Reflectcollide is collisionFunctions.js:119.
func (s *Sim) Reflectcollide(wallID, bounceID entity.EntityID) int {
	if s.Hooks.WatchCollide != nil {
		s.Hooks.WatchCollide("reflectcollide", wallID, bounceID)
	}
	if !s.W.Alive(wallID) || !s.W.Alive(bounceID) {
		return 0
	}
	wp := s.W.Pos[wallID.Index].Scrub()
	bp := s.W.Pos[bounceID.Index].Scrub()
	dx := float64(wp.X) - float64(bp.X)
	dy := float64(wp.Y) - float64(bp.Y)
	dist := math.Hypot(dx, dy)
	difference := s.size(wallID) + s.size(bounceID) - dist
	if difference > 0 {
		factor := difference / dist
		s.addAccel(bounceID.Index, -factor*dx, -factor*dy)
		return 1
	}
	return 0
}

// Advancedcollide is collisionFunctions.js:132.
func (s *Sim) Advancedcollide(myID, nID entity.EntityID, doDamage, doInelastic bool, nIsFirmCollide float64) {
	if s.Hooks.WatchCollide != nil {
		s.Hooks.WatchCollide("advancedcollide", myID, nID)
	}
	my, n := s.W.Get(myID), s.W.Get(nID)
	if my == nil || n == nil {
		return
	}
	i, j := myID.Index, nID.Index

	tock := math.Min(my.StepRemaining, n.StepRemaining)
	mySize, nSize := s.size(myID), s.size(nID)
	combinedRadius := nSize + mySize

	motionMeX, motionMeY := s.xMotion(i), s.yMotion(i)
	motionNX, motionNY := s.xMotion(j), s.yMotion(j)

	deltaX := tock * (motionMeX - motionNX)
	deltaY := tock * (motionMeY - motionNY)

	mp, np := s.W.Pos[i].Scrub(), s.W.Pos[j].Scrub()
	myX, myY := float64(mp.X), float64(mp.Y)
	nX, nY := float64(np.X), float64(np.Y)

	diffX, diffY := myX-nX, myY-nY
	diffLen := jsLength(diffX, diffY)
	// Zero separation creates 0/0 NaN, which scrub converts to 0. See docs/found-bugs.md #5.
	dirX := scrub((nX - myX) / diffLen)
	dirY := scrub((nY - myY) / diffLen)
	component := math.Max(0, dirX*deltaX+dirY*deltaY)

	if component < diffLen-combinedRadius {
		return
	}

	goahead := false
	tmin, tmax := 1-tock, 1.0
	deltaLenSq := deltaX*deltaX + deltaY*deltaY
	b := 2*deltaX*diffX + 2*deltaY*diffY
	c := diffX*diffX + diffY*diffY - combinedRadius*combinedRadius
	det := b*b - 4*deltaLenSq*c
	var t float64
	if deltaLenSq == 0 || det < 0 || c < 0 {
		t = 0
		if c < 0 { // already overlapping without moving
			goahead = true
		}
	} else {
		t1 := (-b - math.Sqrt(det)) / (2 * deltaLenSq)
		t2 := (-b + math.Sqrt(det)) / (2 * deltaLenSq)
		switch {
		case t1 < tmin || t1 > tmax:
			if t2 >= tmin && t2 <= tmax {
				t = t2
				goahead = true
			}
		case t2 >= tmin && t2 <= tmax:
			t = math.Min(t1, t2)
			goahead = true
		default:
			t = t1
			goahead = true
		}
	}
	if !goahead {
		return
	}

	my.CollisionArray = append(my.CollisionArray, nID)
	n.CollisionArray = append(n.CollisionArray, myID)

	if t != 0 {
		myX += motionMeX * t
		myY += motionMeY * t
		nX += motionNX * t
		nY += motionNY * t
		my.StepRemaining -= t
		n.StepRemaining -= t
		diffX, diffY = myX-nX, myY-nY
		diffLen = jsLength(diffX, diffY)
		dirX = scrub((nX - myX) / diffLen)
		dirY = scrub((nY - myY) / diffLen)
		component = math.Max(0, dirX*deltaX+dirY*deltaY)
		s.W.Pos[i].X, s.W.Pos[i].Y = float64(myX), float64(myY)
		s.W.Pos[j].X, s.W.Pos[j].Y = float64(nX), float64(nY)
	}

	deltaLen := jsLength(deltaX, deltaY)
	componentNorm := component / deltaLen

	accelerationFactor := 0.001
	if deltaLen != 0 {
		accelerationFactor = (combinedRadius / 4) / (math.Floor(combinedRadius/deltaLen) + 1)
	}
	depthMe := jsutil.Clamp((combinedRadius-diffLen)/(2*mySize), 0, 1)
	depthN := jsutil.Clamp((combinedRadius-diffLen)/(2*nSize), 0, 1)
	combinedDepthUp := depthMe * depthN
	combinedDepthDown := (1 - depthMe) * (1 - depthN)
	penMeSqrt := math.Sqrt(my.Penetration)
	penNSqrt := math.Sqrt(n.Penetration)
	savedRatioMe := my.Health.Ratio()
	savedRatioN := n.Health.Ratio()

	deathFactorMe, deathFactorN := 1.0, 1.0
	if doDamage {
		deathFactorMe, deathFactorN = s.advancedDamage(myID, nID,
			motionMeX, motionMeY, motionNX, motionNY,
			componentNorm, accelerationFactor, depthMe, depthN, penMeSqrt, penNSqrt)
		my, n = s.W.Get(myID), s.W.Get(nID)
		if my == nil || n == nil {
			return
		}
	}

	if n.Healer && n.Team == my.Team && !sameID(n.Master, myID) {
		return
	}
	if my.Healer && n.Team == my.Team && !sameID(my.Master, nID) {
		return
	}

	switch {
	case nIsFirmCollide < 0:
		nIsFirmCollide *= -0.5
		s.addAccel(i, -nIsFirmCollide*component*dirX, -nIsFirmCollide*component*dirY)
		s.addAccel(j, nIsFirmCollide*component*dirX, nIsFirmCollide*component*dirY)

	case nIsFirmCollide > 0:
		s.addAccel(j,
			nIsFirmCollide*(component*dirX+combinedDepthUp),
			nIsFirmCollide*(component*dirY+combinedDepthUp))

	default:
		var knockback float64
		switch {
		case my.Knockback != 0 && n.Knockback != 0:
			knockback = my.Knockback * n.Knockback
		case my.Knockback != 0:
			knockback = my.Knockback
		case n.Knockback != 0:
			knockback = n.Knockback
		default:
			knockback = s.knockbackMultiplier()
		}
		elasticity := 2 - 4*jsmath.Atan(my.Penetration*n.Penetration)/math.Pi
		if doInelastic && my.Settings.MotionEffects && n.Settings.MotionEffects {
			elasticity *= savedRatioMe/penMeSqrt + savedRatioN/penNSqrt
		} else {
			elasticity *= 2
		}
		spring := 2 * math.Sqrt(savedRatioMe*savedRatioN) / s.runSpeedConfig()
		myMass, nMass := s.mass(myID), s.mass(nID)
		elasticImpulse := combinedDepthDown * combinedDepthDown * elasticity * component *
			myMass * nMass / (myMass + nMass)
		springImpulse := knockback * spring * combinedDepthUp
		impulse := -(elasticImpulse + springImpulse) * (1 - my.Intangibility) * (1 - n.Intangibility)
		forceX, forceY := impulse*dirX, impulse*dirY
		modifierMe := knockback * my.Pushability / myMass * deathFactorN
		modifierN := knockback * n.Pushability / nMass * deathFactorMe

		s.addAccel(i, modifierMe*forceX, modifierMe*forceY)
		s.addAccel(j, -modifierN*forceX, -modifierN*forceY)
	}
}

// advancedDamage is collisionFunctions.js:233-297 damage block.
func (s *Sim) advancedDamage(myID, nID entity.EntityID,
	motionMeX, motionMeY, motionNX, motionNY float64,
	componentNorm, accelerationFactor, depthMe, depthN, penMeSqrt, penNSqrt float64,
) (deathFactorMe, deathFactorN float64) {
	deathFactorMe, deathFactorN = 1, 1
	my, n := s.W.Get(myID), s.W.Get(nID)
	if my == nil || n == nil {
		return deathFactorMe, deathFactorN
	}

	speedFactorMe := 1.0
	if my.MaxSpeed != 0 {
		speedFactorMe = jsmath.Pow(jsLength(motionMeX, motionMeY)/my.MaxSpeed, 0.25)
	}
	speedFactorN := 1.0
	if n.MaxSpeed != 0 {
		speedFactorN = jsmath.Pow(jsLength(motionNX, motionNY)/n.MaxSpeed, 0.25)
	}

	bail := false
	if n.Type == "food" && containsShape(my.Settings.NecroTypes, n.Shape) {
		bail = s.necro(myID, nID)
	} else if my.Type == "food" && containsShape(n.Settings.NecroTypes, my.Shape) {
		bail = s.necro(nID, myID)
	}
	if bail {
		return deathFactorMe, deathFactorN
	}
	my, n = s.W.Get(myID), s.W.Get(nID)
	if my == nil || n == nil {
		return deathFactorMe, deathFactorN
	}
	if my.Invuln || n.Invuln {
		return deathFactorMe, deathFactorN
	}

	resistDiff := my.Health.Resist - n.Health.Resist
	sameClass := b2f(my.Settings.DamageClass == n.Settings.DamageClass)
	// DamageType is never assigned, so buff-vs-food never fires. See docs/found-bugs.md.
	buffMe := 1.0
	if my.Settings.BuffVsFood && n.Settings.DamageType == 1 {
		buffMe = 3
	}
	buffN := 1.0
	if n.Settings.BuffVsFood && my.Settings.DamageType == 1 {
		buffN = 3
	}

	dm := s.damageMultiplierConfig()
	damageMe := dm * my.Damage * (1 + resistDiff) *
		(1 + n.HeteroMultiplier*sameClass) * buffMe * my.DamageMultiplier() *
		math.Min(2, math.Max(speedFactorMe, 1)*speedFactorMe)
	damageN := dm * n.Damage * (1 - resistDiff) *
		(1 + my.HeteroMultiplier*sameClass) * buffN * n.DamageMultiplier() *
		math.Min(2, math.Max(speedFactorN, 1)*speedFactorN)

	if my.Settings.RatioEffects {
		damageMe *= math.Min(1, jsmath.Pow(math.Max(my.Health.Ratio(), my.Shield.Ratio()), 1/my.Penetration))
	}
	if n.Settings.RatioEffects {
		damageN *= math.Min(1, jsmath.Pow(math.Max(n.Health.Ratio(), n.Shield.Ratio()), 1/n.Penetration))
	}
	if my.Settings.DamageEffects {
		damageMe *= accelerationFactor *
			(1 + (componentNorm-1)*(1-depthN)/my.Penetration) *
			(1 + penNSqrt*depthN - depthN) / penNSqrt
	}
	if n.Settings.DamageEffects {
		damageN *= accelerationFactor *
			(1 + (componentNorm-1)*(1-depthMe)/n.Penetration) *
			(1 + penMeSqrt*depthMe - depthMe) / penMeSqrt
	}

	// Shield uses capped=true (default). Health probes pass capped=false explicitly.
	toApplyMe, toApplyN := damageMe, damageN
	if n.Shield.Max != 0 {
		toApplyMe -= n.Shield.GetDamage(toApplyMe, true)
	}
	if my.Shield.Max != 0 {
		toApplyN -= my.Shield.GetDamage(toApplyN, true)
	}

	stuff := my.Health.GetDamage(toApplyN, false)
	if stuff > my.Health.Amount {
		deathFactorMe = my.Health.Amount / stuff
	}
	stuff = n.Health.GetDamage(toApplyMe, false)
	if stuff > n.Health.Amount {
		deathFactorN = n.Health.Amount / stuff
	}

	// Positive damage lands across teams, negative is healing (same-team healer only).
	dMy := damageN * deathFactorN
	dN := damageMe * deathFactorMe

	gateMy := false
	if dMy > 0 {
		gateMy = my.Team != n.Team
	} else {
		gateMy = n.Healer && n.Team == my.Team && my.Type == "tank" && !sameID(n.Master, myID)
	}
	gateN := false
	if dN > 0 {
		gateN = my.Team != n.Team
	} else {
		gateN = my.Healer && n.Team == my.Team && n.Type == "tank" && !sameID(my.Master, nID)
	}
	my.DamageReceived += dMy * b2f(gateMy)
	n.DamageReceived += dN * b2f(gateN)

	return deathFactorMe, deathFactorN
}

// necro routes to the hook.
func (s *Sim) necro(host, food entity.EntityID) bool {
	if s.Hooks.Necro == nil {
		return false
	}
	return s.Hooks.Necro(host, food)
}

// Mooncollide is collisionFunctions.js:359.
func (s *Sim) Mooncollide(moonID, bounceID entity.EntityID) {
	if s.Hooks.WatchCollide != nil {
		s.Hooks.WatchCollide("mooncollide", moonID, bounceID)
	}
	moon, bounce := s.W.Get(moonID), s.W.Get(bounceID)
	if moon == nil || bounce == nil {
		return
	}
	i, j := moonID.Index, bounceID.Index
	mp, bp := s.W.Pos[i].Scrub(), s.W.Pos[j].Scrub()
	moonX, moonY := float64(mp.X), float64(mp.Y)
	bx, by := float64(bp.X), float64(bp.Y)

	collisionRadius := jsLength(bx-moonX, by-moonY)
	properCollisionRadius := s.size(moonID) + s.size(bounceID)
	if collisionRadius >= properCollisionRadius {
		return
	}

	var elasticity float64
	switch bounce.Type {
	case "tank":
		elasticity = 0
	case "bullet":
		elasticity = 1
	default:
		elasticity = bounce.Pushability
	}

	angle := jsmath.Atan2(by-moonY, bx-moonX)
	bx = moonX + properCollisionRadius*jsmath.Cos(angle)
	by = moonY + properCollisionRadius*jsmath.Sin(angle)
	s.W.Pos[j].X, s.W.Pos[j].Y = float64(bx), float64(by)

	v := s.W.Vel[j].Scrub()
	vLen := jsLength(float64(v.X), float64(v.Y))
	vDir := jsmath.Atan2(float64(v.Y), float64(v.X))
	tangentVelocity := vLen * jsmath.Sin(angle-vDir)
	perpendicularVelocity := vLen * jsmath.Cos(angle-vDir) * elasticity * -1
	if perpendicularVelocity < 0 {
		return
	}

	newMagnitude := math.Sqrt(tangentVelocity*tangentVelocity + perpendicularVelocity*perpendicularVelocity)
	relativeAngle := jsmath.Atan2(perpendicularVelocity, tangentVelocity)
	s.W.Vel[j].X = float64(newMagnitude * jsmath.Sin(math.Pi-relativeAngle-angle))
	s.W.Vel[j].Y = float64(newMagnitude * jsmath.Cos(math.Pi-relativeAngle-angle))

	if x := s.extraOf(bounceID); x != nil {
		x.JustHittedAWall = true
	}
}

// trueWallSize is collisionFunctions.js:404 and :474.
func (s *Sim) trueWallSize(wallID entity.EntityID) float64 {
	return s.size(wallID)*lazyRealSizes[4]/math.Sqrt2 + 2
}

// Mazewallcollide is collisionFunctions.js:400.
func (s *Sim) Mazewallcollide(wallID, bounceID entity.EntityID) {
	if s.Hooks.WatchCollide != nil {
		s.Hooks.WatchCollide("mazewallcollide", wallID, bounceID)
	}
	wall, bounce := s.W.Get(wallID), s.W.Get(bounceID)
	if wall == nil || bounce == nil {
		return
	}
	if bounce.IsArenaCloser {
		return
	}
	if m := s.W.Get(bounce.Master); m != nil && m.IsArenaCloser {
		return
	}
	if bounce.Team == wall.Team && bounce.Type == "tank" {
		return
	}

	j := bounceID.Index
	bp := s.W.Pos[j].Scrub()
	bx, by := float64(bp.X), float64(bp.Y)
	wp := s.W.Pos[wallID.Index].Scrub()
	wx, wy := float64(wp.X), float64(wp.Y)
	bsize := s.size(bounceID)
	tw := s.trueWallSize(wallID)

	if bx+bsize < wx-tw || bx-bsize > wx+tw || by+bsize < wy-tw || by-bsize > wy+tw {
		return
	}
	if wall.Intangibility != 0 {
		return
	}

	faces, over := wallFaces(bx, by, wx, wy, tw)

	for i := 0; i < 4; i++ {
		if !faces[i] || over[(i+3)%4] || over[(i+1)%4] {
			continue
		}
		s.mazewallcollidekill(bounceID, wallID)
		// Only the appropriate axis is adjusted per face.
		if i%2 == 0 {
			s.W.Pos[j].X = float64(pushX(i, wx, tw, bsize))
			s.W.Vel[j].X = 0
		} else {
			s.W.Pos[j].Y = float64(pushY(i, wy, tw, bsize))
			s.W.Vel[j].Y = 0
		}
		if x := s.extraOf(bounceID); x != nil {
			x.JustHittedAWall = true
		}
		return
	}

	for i := 0; i < 4; i++ {
		if !faces[i] || !faces[(i+1)%4] || !over[i] || !over[(i+1)%4] {
			continue
		}
		cornerX, cornerY := corner(i, wx, wy, tw)
		// Return, not continue: corner miss skips remaining corners.
		if math.Hypot(bx-cornerX, by-cornerY) > bsize {
			return
		}
		s.mazewallcollidekill(bounceID, wallID)
		angle := jsmath.Atan2(by-cornerY, bx-cornerX)
		s.W.Pos[j].X = float64(cornerX + bsize*jsmath.Cos(angle))
		s.W.Pos[j].Y = float64(cornerY + bsize*jsmath.Sin(angle))
		if x := s.extraOf(bounceID); x != nil {
			x.JustHittedAWall = true
		}
		return
	}
}

// mazewallcollidekill is collisionFunctions.js:392.
func (s *Sim) mazewallcollidekill(bounceID, wallID entity.EntityID) {
	b := s.W.Get(bounceID)
	if b == nil {
		return
	}
	switch b.Type {
	case "tank", "miniboss", "food", "crasher":
		b.CollisionArray = append(b.CollisionArray, wallID)
	default:
		s.destroy(bounceID)
	}
}

// Mazewallcustomcollide is collisionFunctions.js:461.
func (s *Sim) Mazewallcustomcollide(wallID, bounceID entity.EntityID) {
	if s.Hooks.WatchCollide != nil {
		s.Hooks.WatchCollide("mazewallcustomcollide", wallID, bounceID)
	}
	wall, bounce := s.W.Get(wallID), s.W.Get(bounceID)
	if wall == nil || bounce == nil {
		return
	}
	if bounce.AC {
		return
	}
	x := s.extraOf(bounceID)
	canResize := bounce.Type == "tank"
	if canResize {
		if bounce.OriginalSize == 0 {
			bounce.OriginalSize = float64(bounce.SIZE)
		}
		if x != nil && x.OriginalFov == 0 {
			x.OriginalFov = bounce.FOV
		}
	}

	j := bounceID.Index
	bp := s.W.Pos[j].Scrub()
	bx, by := float64(bp.X), float64(bp.Y)
	wp := s.W.Pos[wallID.Index].Scrub()
	wx, wy := float64(wp.X), float64(wp.Y)
	tw := s.trueWallSize(wallID)
	bsize := s.size(bounceID)

	colliding := !(bx+bsize < wx-tw || bx-bsize > wx+tw || by+bsize < wy-tw || by-bsize > wy+tw)
	if !colliding {
		s.setTouchingWalls(bounceID, triFalse, triFalse)
		return
	}

	faces, over := wallFaces(bx, by, wx, wy, tw)

	for i := 0; i < 4; i++ {
		if !faces[i] || over[(i+3)%4] || over[(i+1)%4] {
			continue
		}
		bounce.CollisionArray = append(bounce.CollisionArray, wallID)
		switch wall.Walltype {
		case 2:
			if !bounce.Godmode && !bounce.Invuln {
				bounce.Health.Amount -= bounce.Health.Max * 0.2
				if i%2 == 0 {
					s.W.Vel[j].X *= -1
				} else {
					s.W.Vel[j].Y *= -1
				}
			}
		case 3:
			if !bounce.Godmode && !bounce.Invuln && bounce.Health.Amount < bounce.Health.Max {
				bounce.Health.Amount = math.Min(bounce.Health.Amount+bounce.Health.Max*0.2, bounce.Health.Max)
			}
		case 4:
			const bounceFactor = 18.5
			switch i {
			case 0:
				s.addAccel(j, -bounceFactor, 0)
			case 1:
				s.addAccel(j, 0, -bounceFactor)
			case 2:
				s.addAccel(j, bounceFactor, 0)
			default:
				s.addAccel(j, 0, bounceFactor)
			}
		case 5:
			if canResize {
				s.setTouchingWalls(bounceID, triTrue, triUnset)
				bounce.SIZE = float64(bounce.OriginalSize) * 2
			}
		case 6:
			if canResize {
				s.setTouchingWalls(bounceID, triTrue, triUnset)
				if bounce.SIZE > 5 {
					bounce.SIZE = math.Max(bounce.SIZE*0.95, 5)
				}
			}
		case 7:
			if canResize && x != nil {
				s.setTouchingWalls(bounceID, triUnset, triTrue)
				bounce.FOV = x.OriginalFov * 2.5
			}
		case 8:
		}

		// Offset uses pre-switch size, even if cases 5 and 6 changed it.
		if i%2 == 0 {
			s.W.Pos[j].X = float64(pushX(i, wx, tw, bsize))
		} else {
			s.W.Pos[j].Y = float64(pushY(i, wy, tw, bsize))
		}
		// Certain walltypes don't reset velocity.
		if wall.Walltype != 2 && wall.Walltype != 4 && wall.Walltype != 8 {
			if i%2 == 0 {
				s.W.Vel[j].X = 0
			} else {
				s.W.Vel[j].Y = 0
			}
		}
		return
	}

	for i := 0; i < 4; i++ {
		if !faces[i] || !faces[(i+1)%4] || !over[i] || !over[(i+1)%4] {
			continue
		}
		cornerX, cornerY := corner(i, wx, wy, tw)
		if math.Hypot(bx-cornerX, by-cornerY) > bsize {
			continue
		}
		bounce.CollisionArray = append(bounce.CollisionArray, wallID)
		angle := jsmath.Atan2(by-cornerY, bx-cornerX)
		switch wall.Walltype {
		case 2:
			if !bounce.Godmode && !bounce.Invuln {
				bounce.Health.Amount -= bounce.Health.Max * 0.2
			}
		case 3:
			if !bounce.Godmode && !bounce.Invuln && bounce.Health.Amount < bounce.Health.Max {
				bounce.Health.Amount = math.Min(bounce.Health.Amount+bounce.Health.Max*0.2, bounce.Health.Max)
			}
		case 4:
			const bounceFactor = 18.5
			dx, dy := bx-cornerX, by-cornerY
			dist := math.Hypot(dx, dy)
			nx, ny := dx/dist, dy/dist
			a := s.W.Accel[j].Scrub()
			ax, ay := float64(a.X), float64(a.Y)
			dot := ax*nx + ay*ny
			// Adds reflected acceleration to existing, not replacing. Multiplies by ~19.
			s.addAccel(j, (ax-2*dot*nx)*bounceFactor, (ay-2*dot*ny)*bounceFactor)
		case 5:
			if canResize {
				s.setTouchingWalls(bounceID, triTrue, triUnset)
				bounce.SIZE = float64(bounce.OriginalSize) * 2
			}
		case 6:
			if canResize {
				s.setTouchingWalls(bounceID, triTrue, triUnset)
				if bounce.SIZE > 5 {
					bounce.SIZE = math.Max(bounce.SIZE*0.95, 5)
				}
			}
		case 7:
			if canResize && x != nil {
				s.setTouchingWalls(bounceID, triUnset, triTrue)
				bounce.FOV = x.OriginalFov * 2.5
			}
		case 8:
			// Scales both velocity components, but only at the bottom-right corner.
			if i == 2 {
				s.W.Vel[j].X *= 2.5
				s.W.Vel[j].Y *= 2.5
			}
		}
		if wall.Walltype != 8 {
			// Reads size after switch, so resize walls use new SIZE.
			newSize := s.size(bounceID)
			s.W.Pos[j].X = float64(cornerX + newSize*jsmath.Cos(angle))
			s.W.Pos[j].Y = float64(cornerY + newSize*jsmath.Sin(angle))
		}
		return
	}
}

// setTouchingWalls writes the two tri-state flags.
func (s *Sim) setTouchingWalls(id entity.EntityID, size, fov triState) {
	x := s.extraOf(id)
	if x == nil {
		return
	}
	if size != triUnset {
		x.touchingSizeWall = size
		if e := s.W.Get(id); e != nil {
			e.TouchingSizeWall = size == triTrue
		}
	}
	if fov != triUnset {
		x.touchingFovWall = fov
	}
}

// wallFaces is the collisionFaces / extendedOverFaces pair both maze resolvers build.
func wallFaces(bx, by, wx, wy, tw float64) (faces, over [4]bool) {
	faces = [4]bool{bx < wx, by < wy, bx >= wx, by > wy}
	over = [4]bool{bx < wx-tw, by < wy-tw, bx > wx+tw, by > wy+tw}
	return faces, over
}

func pushX(i int, wx, tw, bsize float64) float64 {
	if i == 0 {
		return wx - tw - bsize
	}
	return wx + tw + bsize
}

func pushY(i int, wy, tw, bsize float64) float64 {
	if i == 1 {
		return wy - tw - bsize
	}
	return wy + tw + bsize
}

func corner(i int, wx, wy, tw float64) (float64, float64) {
	switch i {
	case 0:
		return wx - tw, wy - tw
	case 1:
		return wx + tw, wy - tw
	case 2:
		return wx + tw, wy + tw
	default:
		return wx - tw, wy + tw
	}
}

// scrub is vector.js's NaN-to-zero getter.
func scrub(f float64) float64 {
	if math.IsNaN(f) {
		return 0
	}
	return f
}

func sameID(a, b entity.EntityID) bool { return a.Index == b.Index && a.Gen == b.Gen }

// containsShape is settings.necroTypes.includes(shape).
func containsShape(types []int32, shape float64) bool {
	for _, t := range types {
		if float64(t) == shape {
			return true
		}
	}
	return false
}

func (s *Sim) knockbackMultiplier() float64 {
	if s.Tuning == nil {
		return 0
	}
	return s.Tuning.KnockbackMultiplier
}

func (s *Sim) damageMultiplierConfig() float64 {
	if s.Tuning == nil {
		return 0
	}
	return s.Tuning.DamageMultiplier
}

func (s *Sim) runSpeedConfig() float64 {
	if s.Tuning == nil {
		return 1
	}
	return s.Tuning.RunSpeed
}
