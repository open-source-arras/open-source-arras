package net

import (
	"errors"
	"math"

	"arrasgo/internal/jsmath"

	"arrasgo/internal/entity"
)

var ErrPhotoIndexOutOfRange = errors.New("net: perspective wrote past the record")

type PhotoKind uint8

const (
	KindEntity PhotoKind = iota
	KindBullet
	KindTurret
	KindProp
)

var forceTwiggle = [...]string{
	"autospin", "turnWithSpeed", "spin", "fastspin", "veryfastspin",
	"withMotion", "smoothWithMotion", "looseWithMotion",
}

func isForceTwiggle(facingType string) bool {
	for _, s := range forceTwiggle {
		if s == facingType {
			return true
		}
	}
	return false
}

var lazyRealSizes = func() [17]float64 {
	var t [17]float64
	t[0], t[1], t[2] = 1, 1, 1
	for i := 3; i < 17; i++ {
		c := 2 * math.Pi / float64(i)
		t[i] = math.Sqrt(c * (1 / jsmath.Sin(c)))
	}
	return t
}()

func lazyRealSize(shape float64) float64 {
	i := math.Floor(math.Abs(shape))
	if math.IsNaN(i) {
		return math.NaN()
	}
	if i < 17 {
		return lazyRealSizes[int(i)]
	}
	c := 2 * math.Pi / i
	return math.Sqrt(c * (1 / jsmath.Sin(c)))
}

type PhotoSource struct {
	Kind      func(id entity.EntityID) PhotoKind
	Gun       func(id entity.GunID) (Gun, bool)
	Incognito func(id entity.EntityID) bool
}

func (s *PhotoSource) kindOf(id entity.EntityID) PhotoKind {
	if s.Kind == nil {
		return KindEntity
	}
	return s.Kind(id)
}

func (s *PhotoSource) incognito(id entity.EntityID) bool {
	return s.Incognito != nil && s.Incognito(id)
}

func (s *PhotoSource) guns(dst []Gun, ids []entity.GunID) []Gun {
	dst = dst[:0]
	if s.Gun == nil {
		return dst
	}
	for _, g := range ids {
		if photo, ok := s.Gun(g); ok {
			dst = append(dst, photo)
		}
	}
	return dst
}

func BuildPhoto(w *entity.World, id entity.EntityID, src *PhotoSource, dst *Photo) bool {
	e := w.Get(id)
	if e == nil {
		return false
	}
	kind := src.kindOf(id)
	guns := src.guns(dst.Guns, e.Guns)
	turrets := dst.Turrets[:0]

	pos := w.Pos[id.Index]
	size := float64(w.Size[id.Index])

	switch kind {
	case KindTurret, KindProp:
		*dst = Photo{
			Type:              PhotoTurret,
			Index:             e.Index,
			Size:              size,
			RealSize:          size * lazyRealSize(e.Shape),
			Facing:            e.Facing,
			Angle:             e.Bound.Angle,
			Direction:         e.Bound.Direction,
			Offset:            e.Bound.Offset,
			SizeFactor:        e.Bound.Size,
			MirrorMasterAngle: e.Settings.MirrorMasterAngle,
			Layer:             float64(e.Bound.Layer),
			Color:             e.Color.Compiled,
			Guns:              guns,
		}
		for _, t := range e.Turrets {
			var child Photo
			if BuildPhoto(w, t, src, &child) {
				turrets = append(turrets, child)
			}
		}
		dst.Turrets = turrets
		return true

	case KindBullet:
		*dst = Photo{
			Type:     PhotoBullet,
			ID:       float64(e.WireID),
			Index:    e.Index,
			X:        float64(pos.X),
			Y:        float64(pos.Y),
			VX:       float64(w.Vel[id.Index].X),
			VY:       float64(w.Vel[id.Index].Y),
			Size:     size,
			RealSize: size * lazyRealSize(e.Shape),
			Health:   e.Health.Display(),
			Shield:   0,
			Alpha:    e.Alpha,
			Facing:   e.Facing,
			VFacing:  e.VFacing,
			Layer:    bulletLayer(e),
			Color:    e.Color.Compiled,
			Guns:     guns,
			Turrets:  turrets,
		}
		return true
	}

	score := e.Skill.Score
	if src.incognito(id) {
		if e.Level(w.Tuning) < 56 {
			score = 26263
		}
		if e.Level(w.Tuning) > 56 {
			score = score / 2
		}
	}

	*dst = Photo{
		Type:       photoType(e),
		Invuln:     e.Invuln,
		ID:         float64(e.WireID),
		Index:      e.Index,
		X:          float64(pos.X),
		Y:          float64(pos.Y),
		VX:         float64(w.Vel[id.Index].X),
		VY:         float64(w.Vel[id.Index].Y),
		Size:       size,
		RealSize:   size * lazyRealSize(e.Shape),
		Health:     e.Health.Display(),
		Shield:     e.Shield.Display(),
		Alpha:      e.Alpha,
		Facing:     e.Facing,
		VFacing:    e.VFacing,
		Twiggle:    twiggle(e),
		Layer:      entityLayer(w, e),
		Color:      e.Color.Compiled,
		Borderless: e.Borderless,
		DrawFill:   e.DrawFill,
		Name:       nameColorOr(e.NameColor) + e.Name,
		Score:      scoreValue(e, score),
		Guns:       guns,
	}
	for _, t := range e.Turrets {
		var child Photo
		if BuildPhoto(w, t, src, &child) {
			turrets = append(turrets, child)
		}
	}
	for _, p := range e.Props {
		var child Photo
		if BuildPhoto(w, p, src, &child) {
			turrets = append(turrets, child)
		}
	}
	sortByBoundLayer(turrets)
	dst.Turrets = turrets
	return true
}

func photoType(e *entity.Entity) int {
	t := 0
	if e.Settings.DrawHealth {
		t += PhotoDrawHealth
	}
	if (e.Type == "tank" || e.Type == "miniboss") && e.DisplayName {
		t += PhotoNamed
	}
	return t
}

func twiggle(e *entity.Entity) bool {
	return isForceTwiggle(e.FacingType) ||
		e.Eastereggs.Braindamage ||
		e.Settings.ConnectChildrenOnCamera ||
		(e.FacingType == "locksFacing" && e.Control.Alt) ||
		e.SyncWithTank
}

func entityLayer(w *entity.World, e *entity.Entity) float64 {
	if e.LayerID != 0 {
		return float64(e.LayerID)
	}
	if e.Bond.Valid() {
		return float64(e.Bound.Layer)
	}
	return typeLayer(e.Type)
}

func bulletLayer(e *entity.Entity) float64 {
	if e.LayerID != 0 {
		return float64(e.LayerID)
	}
	return typeLayer(e.Type)
}

func typeLayer(t string) float64 {
	switch t {
	case "wall":
		return 11
	case "food":
		return 10
	case "tank":
		return 5
	case "crasher":
		return 1
	default:
		return 0
	}
}

func nameColorOr(c string) string {
	if c == "" {
		return "#ffffff"
	}
	return c
}

func scoreValue(e *entity.Entity, score float64) ScoreValue {
	if e.Settings.ScoreLabel != "" {
		return ScoreLabel(e.Settings.ScoreLabel)
	}
	return Score(score)
}

func sortByBoundLayer(photos []Photo) {
	for i := 1; i < len(photos); i++ {
		p := photos[i]
		j := i - 1
		for j >= 0 && photos[j].Layer > p.Layer {
			photos[j+1] = photos[j]
			j--
		}
		photos[j+1] = p
	}
}

type photoSlot struct {
	gen   uint32
	has   bool // Whether the entity has a drawable photo.
	photo Photo
	flat  []Value // flattenedPhoto
	valid bool
}

type PhotoCache struct {
	Src   PhotoSource
	slots []photoSlot
}

func (c *PhotoCache) slot(id entity.EntityID) *photoSlot {
	if need := int(id.Index) + 1; need > len(c.slots) {
		if need <= cap(c.slots) {
			c.slots = c.slots[:need]
		} else {
			grown := make([]photoSlot, need, need*2)
			copy(grown, c.slots)
			c.slots = grown
		}
	}
	s := &c.slots[id.Index]
	if s.gen != id.Gen {
		*s = photoSlot{gen: id.Gen, flat: s.flat[:0]}
	}
	return s
}

func (c *PhotoCache) TakeSelfie(w *entity.World, id entity.EntityID) {
	e := w.Get(id)
	if e == nil {
		return
	}
	s := c.slot(id)
	if e.Settings.DrawShape {
		s.valid = false
		s.has = BuildPhoto(w, id, &c.Src, &s.photo)
	} else {
		s.has = false
	}
}

func (c *PhotoCache) Photo(id entity.EntityID) (*Photo, bool) {
	if int(id.Index) >= len(c.slots) {
		return nil, false
	}
	s := &c.slots[id.Index]
	if s.gen != id.Gen || !s.has {
		return nil, false
	}
	return &s.photo, true
}

func (c *PhotoCache) Flattened(id entity.EntityID) ([]Value, bool) {
	s := c.slot(id)
	if !s.has {
		return nil, false
	}
	if !s.valid {
		s.flat = s.photo.Append(s.flat[:0])
		s.valid = true
	}
	return s.flat, true
}

type Viewer struct {
	HasBody         bool
	BodyWireID      uint32
	BodyX, BodyY    float64
	BodyTeam        int32
	CanSeeInvisible bool
	Autospin        bool
	TeamColor       string
}

type Subject struct {
	MasterWireID   uint32
	SourceTeam     int32
	X, Y           float64
	Alpha          float64
	Limited        bool
	FullyInvisible bool
}

func SubjectOf(w *entity.World, id entity.EntityID, limited bool) (Subject, bool) {
	e := w.Get(id)
	if e == nil {
		return Subject{}, false
	}
	s := Subject{
		X:              float64(w.Pos[id.Index].X),
		Y:              float64(w.Pos[id.Index].Y),
		Alpha:          e.Alpha,
		Limited:        limited,
		FullyInvisible: e.Settings.FullyInvisible,
		MasterWireID:   e.WireID,
		SourceTeam:     e.Team,
	}
	if m := w.Get(e.Master); m != nil {
		s.MasterWireID = m.WireID
	}
	if src := w.Get(e.Source); src != nil {
		s.SourceTeam = src.Team
	}
	return s, true
}

type PerspectiveConfig struct {
	Groups           bool
	Mode             string
	Tag              bool
	RandomBodyColors bool
	TeamColor        func(team int32) string // global.getTeamColor
}

func (c *PerspectiveConfig) grouped() bool {
	return c.Groups || (c.Mode == "ffa" || (c.Mode == "clan" && !c.Tag))
}

func (c *PerspectiveConfig) TeamColorFor(team int32) string { return c.teamColorFor(team) }

func (c *PerspectiveConfig) teamColorFor(team int32) string {
	if !c.RandomBodyColors && c.grouped() {
		return "10 0 1 0 false"
	}
	if c.TeamColor == nil {
		return "10 0 1 0 false"
	}
	return c.TeamColor(team)
}

func GetInvisEntityAlpha(v *Viewer, o *Subject, canSeeInvisible bool) float64 {
	if v.BodyWireID == o.MasterWireID {
		if o.Alpha != 0 {
			return o.Alpha*0.75 + 0.25
		}
		return 0.25
	}
	if canSeeInvisible {
		if o.Alpha != 0 {
			return o.Alpha*0.55 + 0.45
		}
		return 0.45
	}
	if !o.FullyInvisible {
		const rng = 300.0
		dist := math.Sqrt((v.BodyX-o.X)*(v.BodyX-o.X) + (v.BodyY-o.Y)*(v.BodyY-o.Y))
		if dist >= rng {
			return o.Alpha
		}
		rangeAlpha := 1 - dist/rng
		if o.Alpha != 0 {
			return o.Alpha + rangeAlpha*0.45
		}
		return rangeAlpha * 0.45
	}
	return o.Alpha
}

func Perspective(cfg *PerspectiveConfig, v *Viewer, o *Subject, cached []Value, dst []Value) ([]Value, error) {
	if !v.HasBody {
		return append(dst, cached...), nil
	}
	if o.Alpha < 1 && !o.Limited && !v.CanSeeInvisible {
		if len(cached) <= PhotoFullAlpha {
			return dst, ErrPhotoIndexOutOfRange
		}
		cached[PhotoFullAlpha] = N(jsRound(255 * GetInvisEntityAlpha(v, o, false)))
	}
	start := len(dst)
	dst = append(dst, cached...)
	rec := dst[start:]

	if v.BodyWireID == o.MasterWireID {
		v.TeamColor = cfg.teamColorFor(v.BodyTeam)
		if v.Autospin {
			if len(rec) <= PhotoFullTwiggle {
				return dst, ErrPhotoIndexOutOfRange
			}
			rec[PhotoFullTwiggle] = N(1)
		}
	}
	if v.CanSeeInvisible {
		alpha := N(jsRound(255 * GetInvisEntityAlpha(v, o, false)))
		i := PhotoFullAlpha
		if o.Limited {
			i = PhotoBulletAlpha
		}
		if len(rec) <= i {
			return dst, ErrPhotoIndexOutOfRange
		}
		rec[i] = alpha
	}
	if v.BodyTeam == o.SourceTeam && cfg.grouped() {
		i := PhotoFullColor
		if o.Limited {
			i = PhotoBulletColor
		}
		if len(rec) <= i {
			return dst, ErrPhotoIndexOutOfRange
		}
		rec[i] = S(v.TeamColor)
	}
	return dst, nil
}

type ViewConfig struct {
	VisibleListInterval float64
	LoadAllMockups      bool
	Persp               PerspectiveConfig
}

type FrameInput struct {
	LastCycle   float64
	ArenaClosed bool
	Entities    []entity.EntityID
	GUI         GUIBlock
}

type View struct {
	Socket *Socket
	Cache  *PhotoCache
	Cfg    ViewConfig

	Viewer Viewer

	// MockupWanted collects mockup definition indexes the frame needs to broadcast.
	MockupWanted []string

	// SendMockups broadcasts the required mockup definitions before the frame update.
	SendMockups func(s *Socket, wanted []string) error

	// OnBodyDead is called when the player's body dies or is destroyed.
	OnBodyDead func(s *Socket)

	nearby            []entity.EntityID
	lastVisibleUpdate float64
	arenaClosed       bool
	seen              map[string]struct{}

	visible []Value
}

// GetNearby returns the list of nearby entities visible to this view.
func (v *View) GetNearby() []entity.EntityID { return v.nearby }

// Add includes an entity in the nearby list if it passes the visibility check and is not already present.
func (v *View) Add(w *entity.World, id entity.EntityID) {
	if int(id.Index) >= len(w.Pos) {
		return
	}
	if !Check(&v.Socket.Camera, float64(w.Pos[id.Index].X), float64(w.Pos[id.Index].Y),
		float64(w.Size[id.Index]), v.arenaClosed) {
		return
	}
	for _, have := range v.nearby {
		if have == id {
			return
		}
	}
	v.nearby = append(v.nearby, id)
}

func (v *View) Remove(id entity.EntityID) {
	for i, have := range v.nearby {
		if have == id {
			v.nearby = append(v.nearby[:i], v.nearby[i+1:]...)
			return
		}
	}
}

func (v *View) Check(w *entity.World, id entity.EntityID) bool {
	if int(id.Index) >= len(w.Pos) {
		return false
	}
	return Check(&v.Socket.Camera, float64(w.Pos[id.Index].X), float64(w.Pos[id.Index].Y),
		float64(w.Size[id.Index]), v.arenaClosed)
}

func Check(cam *Camera, x, y, size float64, arenaClosed bool) bool {
	fov := 1.0
	if arenaClosed {
		fov = 1.6
	}
	return math.Abs(x-cam.X) < cam.FOV*fov+1.5*size+100 &&
		math.Abs(y-cam.Y) < cam.FOV*fov*0.5625+1.5*size+100
}

func (v *View) UpdateCamera(w *entity.World, in FrameInput) float64 {
	s := v.Socket
	cam := &s.Camera
	fovNow := cam.FOV

	if s.Player.Body.Valid() {
		body := w.Get(s.Player.Body)
		if body != nil && !body.IsDead() {
			if photo, ok := v.Cache.Photo(s.Player.Body); ok {
				x, y := photo.X, photo.Y
				if body.HasCameraOverride {
					x, y = body.CameraOverrideX, body.CameraOverrideY
				}
				cam.X, cam.Y = x, y
				cam.VX, cam.VY = photo.VX, photo.VY
				cam.Scoping = body.HasCameraOverride
				fovNow = body.Fov
				s.Player.ViewID = body.WireID
			}
		}
	}
	if !s.Player.Body.Valid() {
		fovNow = 2000
		cam.Scoping = false
		if s.SpectateEntity.Valid() {
			if e := w.Get(s.SpectateEntity); e != nil {
				cam.X = float64(w.Pos[s.SpectateEntity.Index].X)
				cam.Y = float64(w.Pos[s.SpectateEntity.Index].Y)
			}
		}
	}
	d := fovNow - cam.FOV
	cam.FOV += math.Max(d/30, d)

	v.refreshNearby(w, in)
	return fovNow
}

func (v *View) refreshNearby(w *entity.World, in FrameInput) {
	cam := &v.Socket.Camera
	v.arenaClosed = in.ArenaClosed
	if in.LastCycle-v.lastVisibleUpdate <= v.Cfg.VisibleListInterval {
		return
	}
	v.lastVisibleUpdate = in.LastCycle
	v.nearby = v.nearby[:0]
	fovBroad := cam.FOV
	if in.ArenaClosed {
		fovBroad *= 1.6
	}
	xBound := fovBroad + 100
	yBound := fovBroad*0.5625 + 100
	for _, id := range in.Entities {
		if int(id.Index) >= len(w.Pos) {
			continue
		}
		size := float64(w.Size[id.Index])
		x := float64(w.Pos[id.Index].X)
		y := float64(w.Pos[id.Index].Y)
		if math.Abs(x-cam.X) < xBound+1.5*size && math.Abs(y-cam.Y) < yBound+1.5*size {
			v.nearby = append(v.nearby, id)
		}
	}
}

// Visible performs the detailed visibility check against nearby entities and applies perspective transformations.
func (v *View) Visible(w *entity.World, in FrameInput, dst []Value) ([]Value, int, error) {
	cam := &v.Socket.Camera
	const limitDistance = 1.5
	fovDiv := cam.FOV / limitDistance
	fovDivY := fovDiv * (9.0 / 13.0)
	count := 0
	if !v.Cfg.LoadAllMockups {
		v.MockupWanted = v.MockupWanted[:0]
		if v.seen == nil {
			v.seen = make(map[string]struct{})
		}
		clear(v.seen)
	}
	for _, id := range v.nearby {
		// Nearby entities may be stale up to the configured interval. Skip destroyed ones.
		if !w.Alive(id) {
			continue
		}
		photo, ok := v.Cache.Photo(id)
		if !ok {
			continue
		}
		x, y := photo.X, photo.Y
		size := float64(w.Size[id.Index])
		if math.Abs(x-cam.X) >= fovDiv+1.5*size || math.Abs(y-cam.Y) >= fovDivY+1.5*size {
			continue
		}
		if !v.Cfg.LoadAllMockups && photo.Index != "" {
			if _, dup := v.seen[photo.Index]; !dup {
				v.seen[photo.Index] = struct{}{}
				v.MockupWanted = append(v.MockupWanted, photo.Index)
			}
		}
		cached, ok := v.Cache.Flattened(id)
		if !ok {
			continue
		}
		subject, ok := SubjectOf(w, id, photo.Type&PhotoBullet != 0)
		if !ok {
			continue
		}
		var err error
		dst, err = Perspective(&v.Cfg.Persp, &v.Viewer, &subject, cached, dst)
		if err != nil {
			return dst, count, err
		}
		count++
	}
	return dst, count, nil
}

// GazeUpon updates the camera position and broadcasts the frame to the player.
func (v *View) GazeUpon(w *entity.World, in FrameInput, updateCam bool) error {
	s := v.Socket
	s.Camera.LastUpdate = in.LastCycle
	s.Status.Receiving++

	if v.OnBodyDead != nil && s.Player.Body.Valid() {
		if body := w.Get(s.Player.Body); body == nil || body.IsDead() {
			v.OnBodyDead(s)
		}
	}
	v.syncViewer(w)
	fovNow := v.UpdateCamera(w, in)

	vis, count, err := v.Visible(w, in, v.visible[:0])
	if err != nil {
		return err
	}
	v.visible = vis

	if v.SendMockups != nil && !v.Cfg.LoadAllMockups {
		if err := v.SendMockups(s, v.MockupWanted); err != nil {
			return err
		}
	}

	if updateCam {
		return s.Talk((&SvUplinkCamera{X: s.Camera.X, Y: s.Camera.Y}).Append(s.Builder.Buf()))
	}

	head := SvUplink{
		LastCycle: in.LastCycle,
		X:         s.Camera.X, Y: s.Camera.Y,
		FOV: fovNow,
		VX:  s.Camera.VX, VY: s.Camera.VY,
		Scoping: s.Camera.Scoping,
		GUI:     in.GUI,
	}
	msg := head.AppendHead(s.Builder.Buf())
	msg = append(msg, N(count))
	msg = append(msg, vis...)
	// The uplink is a whole snapshot, so the next one supersedes a dropped one.
	// It's the only frame in the protocol that is safe to drop under load.
	return s.TalkDroppable(msg)
}

func (v *View) syncViewer(w *entity.World) {
	s := v.Socket
	body := w.Get(s.Player.Body)
	if body == nil {
		v.Viewer.HasBody = false
		return
	}
	v.Viewer.HasBody = true
	v.Viewer.BodyWireID = body.WireID
	v.Viewer.BodyX = float64(w.Pos[s.Player.Body.Index].X)
	v.Viewer.BodyY = float64(w.Pos[s.Player.Body.Index].Y)
	v.Viewer.BodyTeam = body.Team
	v.Viewer.CanSeeInvisible = body.Settings.CanSeeInvisible
	v.Viewer.Autospin = s.Player.Command.Autospin
	if v.Viewer.TeamColor == "" {
		v.Viewer.TeamColor = s.Player.TeamColor
	}
}
