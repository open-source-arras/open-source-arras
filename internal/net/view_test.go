package net

import (
	"encoding/json"
	"math"
	"os"
	"path/filepath"
	"testing"

	"arrasgo/internal/config"
	"arrasgo/internal/entity"
)

type viewVectors struct {
	Flatten []struct {
		Name string            `json:"name"`
		Site string            `json:"site"`
		Flat []json.RawMessage `json:"flat"`
	} `json:"flatten"`
	InvisAlpha []struct {
		Name   string `json:"name"`
		Player struct {
			Body *struct {
				ID       uint32  `json:"id"`
				X        float64 `json:"x"`
				Y        float64 `json:"y"`
				Settings struct {
					CanSeeInvisible bool `json:"canSeeInvisible"`
				} `json:"settings"`
			} `json:"body"`
		} `json:"player"`
		Other struct {
			Alpha    float64             `json:"alpha"`
			Limited  bool                `json:"limited"`
			X        float64             `json:"x"`
			Y        float64             `json:"y"`
			Master   struct{ ID uint32 } `json:"master"`
			Settings struct {
				FullyInvisible bool `json:"fullyInvisible"`
			} `json:"settings"`
		} `json:"other"`
		CanSeeInvisible bool    `json:"canSeeInvisible"`
		Alpha           float64 `json:"alpha"`
	} `json:"invisAlpha"`
	PerspectiveLeak []struct {
		Name            string  `json:"name"`
		PristineAlpha   float64 `json:"pristineAlpha"`
		NearViewerAlpha float64 `json:"nearViewerAlpha"`
		SpectatorAlpha  float64 `json:"spectatorAlpha"`
		CacheAlphaAfter float64 `json:"cacheAlphaAfter"`
		Leaked          bool    `json:"leaked"`
	} `json:"perspectiveLeak"`
	FOV []struct {
		Camera struct {
			X, Y, FOV float64
		} `json:"camera"`
		Obj struct {
			X, Y, Size float64
		} `json:"obj"`
		ArenaClosed bool `json:"arenaClosed"`
		Check       bool `json:"check"`
		Broad       bool `json:"broad"`
		Fine        bool `json:"fine"`
	} `json:"fov"`
	EaseFov []struct {
		Fov    float64 `json:"fov"`
		FovNow float64 `json:"fovNow"`
		Result float64 `json:"result"`
	} `json:"easeFov"`
	RealSize []struct {
		Size   float64 `json:"size"`
		Shape  float64 `json:"shape"`
		Result float64 `json:"result"`
	} `json:"realSize"`
}

func loadViewVectors(t testing.TB) viewVectors {
	t.Helper()
	p := filepath.Join("..", "..", "gen", "view-vectors.json")
	raw, err := os.ReadFile(p)
	if err != nil {
		t.Fatalf("read %s: %v (run: node tools/gen-view-vectors.js)", p, err)
	}
	var vv viewVectors
	if err := json.Unmarshal(raw, &vv); err != nil {
		t.Fatalf("parse view vectors: %v", err)
	}
	if len(vv.Flatten) == 0 || len(vv.FOV) == 0 {
		t.Fatal("no view vectors loaded")
	}
	return vv
}

func TestFlattenMatchesNode(t *testing.T) {
	vv := loadViewVectors(t)
	photos := map[string]Photo{
		"full":         vecFull(),
		"full unnamed": func() Photo { p := vecFull(); p.Type = PhotoDrawHealth; return p }(),
		"full with turret": func() Photo {
			p := vecFull()
			p.Turrets = []Photo{vecTurret()}
			return p
		}(),
		"bullet":        vecBullet(),
		"turret":        vecTurret(),
		"turret nested": func() Photo { p := vecTurret(); c := vecTurret(); c.Index = "14"; p.Turrets = []Photo{c}; return p }(),
		"full two guns": func() Photo { p := vecFull(); p.Guns = []Gun{vecGun(), vecGun()}; return p }(),
	}
	for _, c := range vv.Flatten {
		p, ok := photos[c.Name]
		if !ok {
			t.Fatalf("%s: no Go fixture for this vector", c.Name)
		}
		got := (&p).Append(nil)
		if len(got) != len(c.Flat) {
			t.Fatalf("%s (%s): flattened %d elements, Node produced %d", c.Name, c.Site, len(got), len(c.Flat))
		}
		for i := range got {
			if !valueMatchesJSON(got[i], c.Flat[i]) {
				t.Errorf("%s element %d: Go %v, Node %s", c.Name, i, got[i], c.Flat[i])
			}
		}
	}
}

func valueMatchesJSON(v Value, raw json.RawMessage) bool {
	var s string
	if err := json.Unmarshal(raw, &s); err == nil {
		return v.Kind == KindString && v.Str == s
	}
	var b bool
	if err := json.Unmarshal(raw, &b); err == nil {
		want := 0.0
		if b {
			want = 1
		}
		return v.Kind == KindNumber && v.Num == want
	}
	var f float64
	if err := json.Unmarshal(raw, &f); err == nil {
		return v.Kind == KindNumber && v.Num == f
	}
	return false
}

func vecGun() Gun {
	return Gun{
		Time: 4321, Power: 2.5, Color: "16 0 1 0 false", Alpha: 1, StrokeWidth: 3.5,
		Borderless: false, DrawFill: true, DrawAbove: false,
		Length: 20, Width: 12.5, Aspect: 1, Angle: 0, Direction: 0, Offset: 0, Layer: 0,
	}
}

func vecFull() Photo {
	return Photo{
		Type: PhotoDrawHealth | PhotoNamed, Invuln: false, ID: 7, Index: "0",
		X: -1000.5, Y: 2000.25, VX: 0, VY: 0,
		Size: 25, RealSize: 25 * lazyRealSize(4),
		Health: 0.5, Shield: 0.25, Alpha: 1,
		Facing: 3.14159, VFacing: 0, Twiggle: false, Layer: 5,
		Color: "10 0 1 0 false", Borderless: false, DrawFill: true,
		Name: "#ffffffplayer", Score: Score(12345),
		Guns: []Gun{vecGun()},
	}
}

func vecBullet() Photo {
	return Photo{
		Type: PhotoBullet, ID: 4242, Index: "9",
		X: 100.5, Y: -200.25, VX: 3.5, VY: -1.25,
		Size: 8, RealSize: 8 * lazyRealSize(3),
		Health: 1, Shield: 0, Alpha: 1,
		Facing: 0.75, VFacing: 0.01, Layer: 0, Color: "6 0 1 0 false",
	}
}

func vecTurret() Photo {
	return Photo{
		Type: PhotoTurret, Index: "13", Size: 10.5, RealSize: 10.5 * lazyRealSize(6),
		Facing: 1.25, Angle: 0, Direction: 0, Offset: 0, SizeFactor: 12,
		MirrorMasterAngle: false, Layer: 0, Color: "12 0 1 0 false",
	}
}

func TestGetInvisEntityAlphaMatchesNode(t *testing.T) {
	vv := loadViewVectors(t)
	for _, c := range vv.InvisAlpha {
		v := Viewer{
			HasBody:         c.Player.Body != nil,
			BodyWireID:      c.Player.Body.ID,
			BodyX:           c.Player.Body.X,
			BodyY:           c.Player.Body.Y,
			CanSeeInvisible: c.Player.Body.Settings.CanSeeInvisible,
		}
		o := Subject{
			MasterWireID:   c.Other.Master.ID,
			X:              c.Other.X,
			Y:              c.Other.Y,
			Alpha:          c.Other.Alpha,
			Limited:        c.Other.Limited,
			FullyInvisible: c.Other.Settings.FullyInvisible,
		}
		got := GetInvisEntityAlpha(&v, &o, c.CanSeeInvisible)
		if got != c.Alpha {
			t.Errorf("%s: got %v, Node %v", c.Name, got, c.Alpha)
		}
	}
}

func TestPerspectiveLeaksAlphaAcrossViewers(t *testing.T) {
	vv := loadViewVectors(t)
	if len(vv.PerspectiveLeak) == 0 {
		t.Fatal("no leak vectors")
	}
	cfg := PerspectiveConfig{Mode: "tdm", TeamColor: func(int32) string { return "team 0 1 0 false" }}

	viewerXs := []float64{150, 250}
	for i, c := range vv.PerspectiveLeak {
		photo := vecFull()
		photo.Alpha = 0.4
		cache := (&photo).Append(nil)
		if cache[PhotoFullAlpha].Num != c.PristineAlpha {
			t.Fatalf("%s: pristine alpha %v, Node %v", c.Name, cache[PhotoFullAlpha].Num, c.PristineAlpha)
		}

		near := Viewer{HasBody: true, BodyWireID: 1, BodyX: viewerXs[i], BodyY: 0, BodyTeam: -1}
		subj := Subject{MasterWireID: 99, SourceTeam: -2, X: 0, Y: 0, Alpha: 0.4}
		frame, err := Perspective(&cfg, &near, &subj, cache, nil)
		if err != nil {
			t.Fatal(err)
		}
		if frame[PhotoFullAlpha].Num != c.NearViewerAlpha {
			t.Errorf("%s: viewer alpha %v, Node %v", c.Name, frame[PhotoFullAlpha].Num, c.NearViewerAlpha)
		}
		if cache[PhotoFullAlpha].Num != c.CacheAlphaAfter {
			t.Errorf("%s: shared cache alpha %v, Node %v", c.Name, cache[PhotoFullAlpha].Num, c.CacheAlphaAfter)
		}

		spectator := Viewer{HasBody: false}
		frame2, err := Perspective(&cfg, &spectator, &subj, cache, nil)
		if err != nil {
			t.Fatal(err)
		}
		if frame2[PhotoFullAlpha].Num != c.SpectatorAlpha {
			t.Errorf("%s: spectator alpha %v, Node %v", c.Name, frame2[PhotoFullAlpha].Num, c.SpectatorAlpha)
		}
		if c.Leaked && frame2[PhotoFullAlpha].Num == c.PristineAlpha {
			t.Errorf("%s: Node leaked and Go did not", c.Name)
		}
	}
}

func TestPerspectiveAutospinIsLayoutBlind(t *testing.T) {
	cfg := PerspectiveConfig{Mode: "tdm", TeamColor: func(int32) string { return "t" }}
	v := Viewer{HasBody: true, BodyWireID: 1, BodyTeam: -1, Autospin: true}
	photo := vecBullet()
	cache := (&photo).Append(nil)
	beforeLayer := cache[PhotoFullTwiggle]
	subj := Subject{MasterWireID: 1, SourceTeam: -2, Limited: true, Alpha: 1}
	frame, err := Perspective(&cfg, &v, &subj, cache, nil)
	if err != nil {
		t.Fatal(err)
	}
	if frame[PhotoFullTwiggle].Num != 1 {
		t.Fatalf("index 10 not overwritten: %v", frame[PhotoFullTwiggle])
	}
	if beforeLayer.Num == 1 {
		t.Skip("fixture layer is already 1; the overwrite would be invisible")
	}
}

func TestPerspectiveTeamColourPersists(t *testing.T) {
	cfg := PerspectiveConfig{
		Mode: "tdm", TeamColor: func(team int32) string { return "recomputed 0 1 0 false" },
	}
	v := Viewer{HasBody: true, BodyWireID: 1, BodyTeam: -1, TeamColor: "stale 0 1 0 false"}

	own := Subject{MasterWireID: 1, SourceTeam: -9, Alpha: 1}
	full := vecFull()
	cache := full.Append(nil)
	if _, err := Perspective(&cfg, &v, &own, cache, nil); err != nil {
		t.Fatal(err)
	}
	if v.TeamColor != "recomputed 0 1 0 false" {
		t.Fatalf("teamColor not recomputed: %q", v.TeamColor)
	}

	other := Subject{MasterWireID: 42, SourceTeam: -1, Alpha: 1}
	cfg.Groups = true
	full2 := vecFull()
	cache2 := full2.Append(nil)
	frame, err := Perspective(&cfg, &v, &other, cache2, nil)
	if err != nil {
		t.Fatal(err)
	}
	if frame[PhotoFullColor].Str != "recomputed 0 1 0 false" {
		t.Fatalf("colour override used %q", frame[PhotoFullColor].Str)
	}
}

func TestPerspectiveRefusesShortRecord(t *testing.T) {
	cfg := PerspectiveConfig{Mode: "tdm"}
	v := Viewer{HasBody: true, BodyWireID: 1, BodyTeam: -1}
	turret := vecTurret()
	cache := turret.Append(nil)
	if len(cache) > PhotoFullAlpha {
		t.Fatalf("fixture is %d elements; the short-record path needs <= %d", len(cache), PhotoFullAlpha)
	}
	subj := Subject{MasterWireID: 99, SourceTeam: -2, Alpha: 0.5}
	if _, err := Perspective(&cfg, &v, &subj, cache, nil); err != ErrPhotoIndexOutOfRange {
		t.Fatalf("got %v, want ErrPhotoIndexOutOfRange", err)
	}
}

func TestFieldOfViewMatchesNode(t *testing.T) {
	vv := loadViewVectors(t)
	for _, c := range vv.FOV {
		cam := Camera{X: c.Camera.X, Y: c.Camera.Y, FOV: c.Camera.FOV}
		if got := Check(&cam, c.Obj.X, c.Obj.Y, c.Obj.Size, c.ArenaClosed); got != c.Check {
			t.Errorf("Check(fov=%v size=%v at %v,%v closed=%v) = %v, Node %v",
				c.Camera.FOV, c.Obj.Size, c.Obj.X, c.Obj.Y, c.ArenaClosed, got, c.Check)
		}
		if got := broadInView(&cam, c.Obj.X, c.Obj.Y, c.Obj.Size, c.ArenaClosed); got != c.Broad {
			t.Errorf("broad(fov=%v size=%v at %v,%v closed=%v) = %v, Node %v",
				c.Camera.FOV, c.Obj.Size, c.Obj.X, c.Obj.Y, c.ArenaClosed, got, c.Broad)
		}
		if got := fineInView(&cam, c.Obj.X, c.Obj.Y, c.Obj.Size); got != c.Fine {
			t.Errorf("fine(fov=%v size=%v at %v,%v) = %v, Node %v",
				c.Camera.FOV, c.Obj.Size, c.Obj.X, c.Obj.Y, got, c.Fine)
		}
	}
}

func broadInView(cam *Camera, x, y, size float64, arenaClosed bool) bool {
	fovBroad := cam.FOV
	if arenaClosed {
		fovBroad *= 1.6
	}
	xBound := fovBroad + 100
	yBound := fovBroad*0.5625 + 100
	return math.Abs(x-cam.X) < xBound+1.5*size && math.Abs(y-cam.Y) < yBound+1.5*size
}

func fineInView(cam *Camera, x, y, size float64) bool {
	const limitDistance = 1.5
	fovDiv := cam.FOV / limitDistance
	fovDivY := fovDiv * (9.0 / 13.0)
	return math.Abs(x-cam.X) < fovDiv+1.5*size && math.Abs(y-cam.Y) < fovDivY+1.5*size
}

func TestEaseFovMatchesNode(t *testing.T) {
	vv := loadViewVectors(t)
	for _, c := range vv.EaseFov {
		d := c.FovNow - c.Fov
		got := c.Fov + math.Max(d/30, d)
		if got != c.Result {
			t.Errorf("ease(%v -> %v) = %v, Node %v", c.Fov, c.FovNow, got, c.Result)
		}
	}
}

func TestLazyRealSizeMatchesNode(t *testing.T) {
	vv := loadViewVectors(t)
	for _, c := range vv.RealSize {
		got := c.Size * lazyRealSize(c.Shape)
		if math.Float32bits(float32(got)) != math.Float32bits(float32(c.Result)) {
			t.Errorf("realSize(size=%v shape=%v) = %v, Node %v (differ as float32)",
				c.Size, c.Shape, got, c.Result)
			continue
		}
		if got != c.Result {
			ulps := math.Abs(float64(int64(math.Float64bits(got)) - int64(math.Float64bits(c.Result))))
			if ulps > 1 {
				t.Errorf("realSize(size=%v shape=%v) = %v, Node %v (%v ulps apart)",
					c.Size, c.Shape, got, c.Result, ulps)
			}
		}
	}
}

func testWorld(t testing.TB, n int) *entity.World {
	t.Helper()
	w := entity.NewWorld(n)
	w.Room = entity.RoomInfo{Width: 4000, Height: 4000}
	w.Tuning = &config.Tuning{LevelCap: 45, SkillCap: 9}
	w.Now = func() int64 { return 0 }
	return w
}

func spawnVisible(w *entity.World, x, y float64) entity.EntityID {
	id := w.Spawn()
	e := w.Get(id)
	e.Settings.DrawShape = true
	e.Settings.DrawHealth = true
	e.Type = "tank"
	e.Index = "0"
	e.Shape = 4
	e.Alpha = 1
	e.Health = entity.NewHealthType(100, 0, 0)
	e.Shield = entity.NewHealthType(0, 0, 0)
	e.Master = id
	e.Source = id
	w.Pos[id.Index].X = x
	w.Pos[id.Index].Y = y
	w.Size[id.Index] = 25
	return id
}

func TestTakeSelfieInvalidatesFlattened(t *testing.T) {
	w := testWorld(t, 4)
	id := spawnVisible(w, 0, 0)
	cache := &PhotoCache{}
	cache.TakeSelfie(w, id)

	flat, ok := cache.Flattened(id)
	if !ok {
		t.Fatal("no flattened record")
	}
	flat[PhotoFullAlpha] = N(1) // stand in for a perspective write

	cache.TakeSelfie(w, id)
	flat2, _ := cache.Flattened(id)
	if flat2[PhotoFullAlpha].Num != 255 {
		t.Fatalf("stale alpha survived takeSelfie: %v", flat2[PhotoFullAlpha])
	}
}

func TestTakeSelfieSkipsNonDrawShape(t *testing.T) {
	w := testWorld(t, 4)
	id := spawnVisible(w, 0, 0)
	w.Get(id).Settings.DrawShape = false
	cache := &PhotoCache{}
	cache.TakeSelfie(w, id)
	if _, ok := cache.Photo(id); ok {
		t.Fatal("a non-drawShape entity got a photo")
	}
}

func TestPhotoCacheRejectsStaleHandles(t *testing.T) {
	w := testWorld(t, 4)
	id := spawnVisible(w, 0, 0)
	cache := &PhotoCache{}
	cache.TakeSelfie(w, id)
	if _, ok := cache.Photo(id); !ok {
		t.Fatal("no photo")
	}
	// A handle to a destroyed entity still matches the cached generation, the
	// cache shadows the slab, it does not police it. The visible loop's
	// w.Alive check is what stops a corpse being photographed.
	w.Destroy(id)
	reused := spawnVisible(w, 5, 5)
	if reused.Index != id.Index {
		t.Skip("slot was not recycled")
	}
	if _, ok := cache.Photo(reused); ok {
		t.Fatal("recycled slot inherited the old photo")
	}
}

func TestBuildPhotoLayers(t *testing.T) {
	w := testWorld(t, 8)
	src := PhotoSource{}
	for _, tc := range []struct {
		typ  string
		want float64
	}{{"wall", 11}, {"food", 10}, {"tank", 5}, {"crasher", 1}, {"bullet", 0}, {"", 0}} {
		id := spawnVisible(w, 0, 0)
		w.Get(id).Type = tc.typ
		var p Photo
		if !BuildPhoto(w, id, &src, &p) {
			t.Fatal("BuildPhoto failed")
		}
		if p.Layer != tc.want {
			t.Errorf("type %q: layer %v, want %v", tc.typ, p.Layer, tc.want)
		}
	}
	id := spawnVisible(w, 0, 0)
	w.Get(id).Type = "wall"
	w.Get(id).LayerID = 3
	var p Photo
	BuildPhoto(w, id, &src, &p)
	if p.Layer != 3 {
		t.Errorf("layerID ignored: %v", p.Layer)
	}
}

func TestBuildPhotoTypeBits(t *testing.T) {
	w := testWorld(t, 8)
	src := PhotoSource{}
	cases := []struct {
		typ         string
		drawHealth  bool
		displayName bool
		want        int
	}{
		{"tank", false, false, 0},
		{"tank", true, false, PhotoDrawHealth},
		{"tank", true, true, PhotoDrawHealth | PhotoNamed},
		{"miniboss", false, true, PhotoNamed},
		{"food", true, true, PhotoDrawHealth},
	}
	for _, tc := range cases {
		id := spawnVisible(w, 0, 0)
		e := w.Get(id)
		e.Type, e.Settings.DrawHealth, e.DisplayName = tc.typ, tc.drawHealth, tc.displayName
		var p Photo
		BuildPhoto(w, id, &src, &p)
		if p.Type != tc.want {
			t.Errorf("%v: type %d, want %d", tc, p.Type, tc.want)
		}
	}
}

// TestBuildPhotoIncognitoScore is entity.js:737. Both guards are `if`, not
// else-if, so a level of exactly 56 keeps the real score.
func TestBuildPhotoIncognitoScore(t *testing.T) {
	w := testWorld(t, 4)
	id := spawnVisible(w, 0, 0)
	w.Get(id).Skill.Score = 100000
	src := PhotoSource{Incognito: func(entity.EntityID) bool { return true }}
	var p Photo
	BuildPhoto(w, id, &src, &p)
	// A zero-skill entity is level 1, so the < 56 branch fires.
	if p.Score.IsLabel || p.Score.Score != 26263 {
		t.Fatalf("incognito score %v", p.Score)
	}
}

// TestVisibleUsesTheFineBox checks that the per-frame loop applies the fine
// check and not the broad one, the two differ by a factor of three, so an
// entity between them must be a nearby candidate and still not be sent.
func TestVisibleUsesTheFineBox(t *testing.T) {
	w := testWorld(t, 8)
	cache := &PhotoCache{}
	near := spawnVisible(w, 0, 0)
	mid := spawnVisible(w, 1500, 0) // inside the broad box, outside the fine one
	ids := []entity.EntityID{near, mid}
	for _, id := range ids {
		cache.TakeSelfie(w, id)
	}
	v := newTestView(cache)
	in := FrameInput{LastCycle: 1000, Entities: ids}
	v.UpdateCamera(w, in)
	if len(v.GetNearby()) != 2 {
		t.Fatalf("nearby has %d, want both", len(v.GetNearby()))
	}
	_, count, err := v.Visible(w, in, nil)
	if err != nil {
		t.Fatal(err)
	}
	if count != 1 {
		t.Fatalf("sent %d entities, want 1", count)
	}
}

// TestNearbyRefreshIsRateLimited pins Config.visible_list_interval: the
// candidate set is rebuilt on a 250 ms grid, so an entity that arrives between
// rebuilds stays invisible until the next one.
func TestNearbyRefreshIsRateLimited(t *testing.T) {
	w := testWorld(t, 8)
	cache := &PhotoCache{}
	a := spawnVisible(w, 0, 0)
	cache.TakeSelfie(w, a)
	v := newTestView(cache)

	v.UpdateCamera(w, FrameInput{LastCycle: 1000, Entities: []entity.EntityID{a}})
	if len(v.GetNearby()) != 1 {
		t.Fatal("first refresh did not run")
	}
	b := spawnVisible(w, 10, 10)
	cache.TakeSelfie(w, b)
	v.UpdateCamera(w, FrameInput{LastCycle: 1100, Entities: []entity.EntityID{a, b}})
	if len(v.GetNearby()) != 1 {
		t.Fatalf("nearby refreshed inside the interval: %d", len(v.GetNearby()))
	}
	v.UpdateCamera(w, FrameInput{LastCycle: 1400, Entities: []entity.EntityID{a, b}})
	if len(v.GetNearby()) != 2 {
		t.Fatalf("nearby did not refresh after the interval: %d", len(v.GetNearby()))
	}
}

func newTestView(cache *PhotoCache) *View {
	s := &Socket{Camera: Camera{FOV: 2000}, Conn: newLoopbackConn(8)}
	return &View{
		Socket: s,
		Cache:  cache,
		Cfg: ViewConfig{
			VisibleListInterval: 250,
			LoadAllMockups:      true,
			Persp:               PerspectiveConfig{Mode: "tdm"},
		},
	}
}

// TestGazeUponFovTarget pins which fov the frame reports (sockets.js:1653): the
// pre-easing target, not the eased camera value, and the target is only
// replaced inside the branches that replace it in the JS.
func TestGazeUponFovTarget(t *testing.T) {
	w := testWorld(t, 8)
	cache := &PhotoCache{}
	id := spawnVisible(w, 0, 0)
	w.Get(id).Fov = 1234
	cache.TakeSelfie(w, id)

	v := newTestView(cache)
	v.Socket.Player.Body = id
	in := FrameInput{LastCycle: 1000, Entities: []entity.EntityID{id}}

	// A living body with a photo hands over its own fov.
	if got := v.UpdateCamera(w, in); got != 1234 {
		t.Fatalf("fovNow %v, want the body's 1234", got)
	}
	// The camera itself eases toward it rather than snapping, because the
	// target is smaller than the current 2000.
	if v.Socket.Camera.FOV == 1234 {
		t.Fatalf("camera fov snapped to %v instead of easing", v.Socket.Camera.FOV)
	}

	// A living body with no photo leaves both alone: the JS assigns fovNow
	// inside the `else if (player.body.photo)` branch.
	w.Get(id).Settings.DrawShape = false
	cache.TakeSelfie(w, id)
	before := v.Socket.Camera.FOV
	if got := v.UpdateCamera(w, in); got != before {
		t.Fatalf("fovNow %v, want the untouched camera fov %v", got, before)
	}

	// No body at all is a flat 2000 (sockets.js:1547).
	v.Socket.Player.Body = entity.EntityID{}
	if got := v.UpdateCamera(w, in); got != 2000 {
		t.Fatalf("fovNow %v, want 2000", got)
	}
}

// TestGazeUponCameraOnlyForm is gazeUpon(true) from newPlayer
// (sockets.js:1123): three elements, camera only, no gui and no entities.
func TestGazeUponCameraOnlyForm(t *testing.T) {
	w := testWorld(t, 4)
	cache := &PhotoCache{}
	v := newTestView(cache)
	v.Socket.Camera.X, v.Socket.Camera.Y = 100.5, -200.25
	if err := v.GazeUpon(w, FrameInput{LastCycle: 1000}, true); err != nil {
		t.Fatal(err)
	}
	f := <-v.Socket.Conn.out
	m := Decode(f.bytes)
	op, rest, _ := Opcode(m)
	if op != OpSvUplink || len(rest) != 3 {
		t.Fatalf("got %s with %d fields, want u with 3", op, len(rest))
	}
	if rest[0].Num != 1 || rest[1].Num != 100.5 || rest[2].Num != -200.25 {
		t.Fatalf("camera-only payload %v", rest)
	}
}

// TestGazeUponQueuesTheUplinkAsDroppable: the uplink is the only frame the
// backpressure policy allows to be lost, so it must go out on that path.
func TestGazeUponQueuesTheUplinkAsDroppable(t *testing.T) {
	w := testWorld(t, 8)
	cache := &PhotoCache{}
	id := spawnVisible(w, 0, 0)
	cache.TakeSelfie(w, id)
	v := newTestView(cache)
	v.Socket.Conn = newLoopbackConn(1)
	in := FrameInput{LastCycle: 1000, Entities: []entity.EntityID{id}}

	if err := v.GazeUpon(w, in, false); err != nil {
		t.Fatal(err)
	}
	in.LastCycle += 300
	if err := v.GazeUpon(w, in, false); err != nil { // queue is full now
		t.Fatal(err)
	}
	if v.Socket.Conn.Dropped() != 1 {
		t.Fatalf("dropped %d, want 1", v.Socket.Conn.Dropped())
	}
	if v.Socket.Conn.Overflowed() {
		t.Fatal("a dropped uplink marked the connection overflowed")
	}
}
