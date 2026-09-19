package net

import (
	"encoding/hex"
	"encoding/json"
	"math"
	"os"
	"path/filepath"
	"sort"
	"strings"
	"testing"
)

// Message vectors are produced by tools/gen-message-vectors.js.
type msgVectorFile struct {
	Cases   []msgVectorCase   `json:"cases"`
	JSON    map[string]string `json:"json"`
	Helpers msgHelpers        `json:"helpers"`
}

type msgVectorCase struct {
	Name  string  `json:"name"`
	Site  string  `json:"site"`
	Bytes *string `json:"bytes"`
	Note  string  `json:"note"`
	Value string  `json:"value"`
}

type msgHelpers struct {
	ToFixed1 []struct {
		In  json.RawMessage `json:"in"`
		Out string          `json:"out"`
	} `json:"toFixed1"`
	NumberToString []struct {
		In  json.RawMessage `json:"in"`
		Out string          `json:"out"`
	} `json:"numberToString"`
	DTASTDuration []struct {
		In  json.RawMessage `json:"in"`
		Out string          `json:"out"`
	} `json:"dtastDuration"`
	NameTokens []struct {
		In  string `json:"in"`
		Out int    `json:"out"`
	} `json:"nameTokens"`
	Trim []struct {
		In  string `json:"in"`
		Out string `json:"out"`
	} `json:"trim"`
	SkillsHex []struct {
		In  [10]float64 `json:"in"`
		Out string      `json:"out"`
	} `json:"skillsHex"`
	MinimapQuantise []struct {
		In  [2]float64 `json:"in"`
		Out float64    `json:"out"`
	} `json:"minimapQuantise"`
	Quantise []struct {
		In     float64 `json:"in"`
		Health float64 `json:"health"`
		Shield float64 `json:"shield"`
		Alpha  float64 `json:"alpha"`
	} `json:"quantise"`
}

func loadMessageVectors(t testing.TB) msgVectorFile {
	t.Helper()
	p := filepath.Join("..", "..", "gen", "message-vectors.json")
	raw, err := os.ReadFile(p)
	if err != nil {
		t.Fatalf("read %s: %v (run: node tools/gen-message-vectors.js)", p, err)
	}
	var vf msgVectorFile
	if err := json.Unmarshal(raw, &vf); err != nil {
		t.Fatalf("parse vectors: %v", err)
	}
	if len(vf.Cases) == 0 {
		t.Fatal("no message vectors loaded")
	}
	return vf
}

func fixtureGun() Gun {
	return Gun{
		Time: 4321, Power: 2.5,
		Color: "16 0 1 0 false",
		Alpha: 1, StrokeWidth: 3.5,
		Borderless: false, DrawFill: true, DrawAbove: false,
		Length: 20, Width: 12.5, Aspect: 1,
		Angle: 0, Direction: 0, Offset: 0, Layer: 0,
	}
}

func fixtureTurret() Photo {
	return Photo{
		Type: PhotoTurret, Index: "13",
		Size: 10.5, RealSize: 9.75, Facing: 1.25,
		Angle: 0, Direction: 0, Offset: 0, SizeFactor: 12,
		MirrorMasterAngle: false, Layer: 0, Color: "12 0 1 0 false",
	}
}

func fixtureBullet() Photo {
	return Photo{
		Type: PhotoBullet, ID: 4242, Index: "9",
		X: 100.5, Y: -200.25, VX: 3.5, VY: -1.25,
		Size: 8, RealSize: 8,
		Health: 1, Shield: 0, Alpha: 1,
		Facing: 0.75, VFacing: 0.01,
		Layer: 0, Color: "6 0 1 0 false",
	}
}

func fixtureFull() Photo {
	return Photo{
		Type: PhotoDrawHealth | PhotoNamed, Invuln: false,
		ID: 7, Index: "0",
		X: -1000.5, Y: 2000.25, VX: 0, VY: 0,
		Size: 25, RealSize: 25,
		Health: 0.5, Shield: 0.25, Alpha: 1,
		Facing: 3.14159, VFacing: 0,
		Twiggle: false, Layer: 5, Color: "10 0 1 0 false",
		Borderless: false, DrawFill: true,
		Name: "#ffffffplayer", Score: Score(12345),
	}
}

func fixtureStats(g *GUIBlock) {
	g.HasStats = true
	titles := [10]string{"ATK", "HLT", "SPD", "STR", "PEN", "DAM", "RLD", "MOB", "RGN", "SHI"}
	for i := range titles {
		g.StatTitles[i] = titles[i]
		g.StatCaps[i] = 9
		g.StatSoftCaps[i] = 7
	}
}

// fixtureUplink is the head the generator uses for its full u frames.
func fixtureUplink(gui GUIBlock, entities ...Photo) SvUplink {
	return SvUplink{
		LastCycle: 98765, X: 100.5, Y: -200.25, FOV: 2000, VX: 1.5, VY: -0.5,
		Scoping: false, GUI: gui, Entities: entities,
	}
}

func lbRow(id, score float64, render bool) DeltaRow {
	name := "player" + jsNumberString(id)
	return DeltaRow{ID: id, Data: []Value{
		N(score), S("0"), S(name), S("11 0 1 0 false"), S("11 0 1 0 false"),
		S("#FFFFFF"), S("Basic"), B(render),
	}}
}

// deltaSeq applies a sequence of row sets, as the generator's deltaCase does.
func deltaSeq(dataLength int, seq ...[]DeltaRow) *Delta {
	d := NewDelta(dataLength)
	for _, rows := range seq {
		d.Update(rows)
	}
	return d
}

func mmRows() []DeltaRow {
	return []DeltaRow{
		{ID: 1, Data: []Value{N(0), N(-12), N(34), S("16 0 1 0 false"), N(25)}},
		{ID: 2, Data: []Value{N(2), N(127), N(-128), S("17 0 1 0 false"), N(100)}},
	}
}

func teamRows() []DeltaRow {
	return []DeltaRow{{ID: 5, Data: []Value{N(10), N(-10), S("10 0 1 0 false")}}}
}

type appender interface{ Append(dst []Value) []Value }

func build(a appender) func(*Builder) []Value {
	return func(b *Builder) []Value { return a.Append(b.Buf()) }
}

func raw(fn func(dst []Value) []Value) func(*Builder) []Value {
	return func(b *Builder) []Value { return fn(b.Buf()) }
}

func messageBuilders() map[string]func(*Builder) []Value {
	m := map[string]func(*Builder) []Value{}

	m["W"] = build(SvWelcome{})
	m["w"] = build(SvKeyAccepted{})
	m["RM"] = build(SvResetMinimap{})
	m["RL"] = build(SvResetLeaderboard{})
	m["T"] = build(SvTankTree{})
	m["K"] = build(SvKick{})
	m["temporaryban"] = build(SvTemporaryBan{})
	m["permanentban"] = build(SvPermanentBan{})
	m["DTAD"] = build(SvDailyTankAdDone{})
	m["DTAST"] = build(SvDailyTankAdStart{})
	m["RE"] = build(SvResetEntities{})
	m["CC"] = build(SvClearCache{})

	m["message"] = build(&SvScreenMessage{Text: "This server is private."})
	m["message full"] = build(&SvScreenMessage{Text: "This server is full, please rejoin later."})
	m["m popup"] = build(&SvPopup{Duration: 10000, Text: "hello world"})
	m["m arena closed"] = build(&SvPopup{Duration: 5000, Text: "Arena Closed."})
	m["m empty text"] = build(&SvPopup{Duration: 10000, Text: ""})
	m["m unicode text"] = build(&SvPopup{Duration: 10000, Text: "héllo 世界"})
	m["Em"] = build(&SvPopupLines{Duration: 15000, LinesJSON: `["line one","line two"]`})
	m["z name colour"] = build(&SvNameColor{Color: "#ff0000"})
	m["t transfer"] = build(&SvTransfer{Host: "example.com:3000", ID: "00ff12ab"})
	m["S clock bounce"] = build(&SvSync{ClientTime: 1234567.5, ServerTime: 98765})
	m["p pong"] = build(&SvPong{Ping: 12.34})
	m["p pong integral"] = build(&SvPong{Ping: 0})
	m["svInfo"] = build(&SvServerInfo{Gamemode: "ffa", MSPT: 3.456})
	m["svInfo slow"] = build(&SvServerInfo{Gamemode: "tag", MSPT: 33.333})
	for _, v := range []float64{0, 0.25, -0.25, 0.35, 0.05, 12.34, 1234.5678, 255.55, 1e20, -7.5} {
		ping := v
		m["p pong "+jsNumberString(v)] = build(&SvPong{Ping: ping})
	}

	m["c force camera"] = build(&SvForceCamera{X: 0, Y: 0, FOV: 2000})
	m["c force camera fractional"] = build(&SvForceCamera{X: -1234.5, Y: 6789.25, FOV: 2000})

	tiles := `[[{"color":16,"visibleOnBlackout":true,"image":false},` +
		`{"color":17,"visibleOnBlackout":false,"image":false}],` +
		`[{"color":16,"visibleOnBlackout":true,"image":"grass.png"},` +
		`{"color":0,"visibleOnBlackout":false,"image":false}]]`
	m["R room setup"] = build(&SvRoomSetup{
		Width: 4000, Height: 2000, TilesJSON: tiles,
		ServerStartTime: 1788000000000, RoomSpeed: 1,
		BlackoutJSON: `{"active":false,"color":0}`, RoundArena: false,
	})
	refreshTiles := `[[{"color":16,"image":false},{"color":17,"image":false}],` +
		`[{"color":16,"image":"grass.png"},{"color":0,"image":false}]]`
	m["r room refresh"] = build(&SvRoomRefresh{Width: 4000, Height: 2000, TilesJSON: refreshTiles})

	m["F death report"] = build(&SvDeath{
		Score: 12345, Lifetime: 67, RespawnDelay: 0,
		Solo: 3, Assists: 1, Bosses: 0, Polygons: 42,
		Killers: []string{"5", "7-12"},
	})
	m["F death no killers"] = build(&SvDeath{})

	m["CHAT_MESSAGE_ENTITY"] = build(&SvChat{
		EntitiesJSON: `[{"id":12,"messages":[{"text":"hi","id":0},{"text":"yo","id":1}]}]`})
	m["CHAT_MESSAGE_ENTITY muted"] = build(&SvChat{EntitiesJSON: `[{"id":12,"messages":[]}]`})

	m["DTA image ad"] = build(&SvDailyTankAd{
		AdJSON: `{"src":"ad.png","normalAdSize":true,"waitTime":3}`})
	m["DTA video ad"] = build(&SvDailyTankAd{
		AdJSON: `{"src":"ad.mp4","normalAdSize":false,"waitTime":"isVideo"}`})

	m["SH camera shake"] = build(&SvScreenShake{ShakeJSON: `{"type":"camera","duration":10,` +
		`"amount":5.5,"keepShake":false,"push":false,"applyOn":{"upgrade":true,"shoot":false}}`})
	m["SH gui shake"] = build(&SvScreenShake{ShakeJSON: `{"type":"gui","duration":30,` +
		`"amount":2,"keepShake":true,"push":true,"applyOn":{"upgrade":false,"shoot":true}}`})

	m["M numeric index"] = build(&SvMockup{
		Index: MockupIndexNum(12), MockupJSON: `{"index":"12","name":"Basic"}`})
	m["M string index"] = build(&SvMockup{
		Index: MockupIndexStr("12"), MockupJSON: `{"index":"12","name":"Basic"}`})
	m["M large numeric index"] = build(&SvMockup{Index: MockupIndexNum(700), MockupJSON: "{}"})

	m["cs k with key"] = build(&ClKey{HasKey: true, Key: "sometoken"})
	m["cs k no key"] = build(&ClKey{})
	m["cs s room request"] = build(&ClSpawn{Name: "", NeedsRoom: 1, AutoLevelUp: 0, Incognito: 0})
	m["cs s spawn"] = build(&ClSpawn{Name: "player", NeedsRoom: 0, AutoLevelUp: 1, Incognito: 0})
	m["cs s spawn transfer"] = build(&ClSpawn{
		Name: "player", NeedsRoom: 0, AutoLevelUp: 0,
		TransferBodyID: SomeString("00ff12ab"), Incognito: 1})
	m["cs S sync"] = build(&ClSync{Time: 1788000000000})
	m["cs p ping"] = build(&ClPing{Payload: 1234.5})
	m["cs d downlink"] = build(&ClDownlink{Time: 98765})
	m["cs C command"] = build(&ClCommand{TargetX: 100, TargetY: -250, ReverseTank: N(1), Commands: 0b00010011})
	m["cs C reverse"] = build(&ClCommand{TargetX: 0, TargetY: 0, ReverseTank: N(-1), Commands: 255})
	m["cs hash keys"] = build(&ClKeys{Keys: []string{"KeyW", "-KeyA"}})
	m["cs hash empty"] = build(&ClKeys{})
	m["cs t toggle"] = build(&ClToggle{Index: 0, SendMessage: N(1)})
	m["cs U upgrade"] = build(&ClUpgrade{Upgrade: 3, BranchID: 1})
	m["cs U daily tank"] = build(&ClUpgrade{DailyTank: true})
	m["cs x stat"] = build(&ClStat{Index: 4, Max: 0})
	m["cs x stat max"] = build(&ClStat{Index: 9, Max: 1})
	m["cs L"] = build(ClLevelUp{})
	m["cs 1"] = build(ClSuicide{})
	m["cs H"] = build(ClControl{})
	m["cs M chat"] = build(&ClChat{Text: "hello everyone"})
	m["cs T"] = build(ClTankTree{})
	m["cs DTA"] = build(ClDailyTankAd{})
	m["cs DTAD"] = build(ClDailyTankAdDone{})
	m["cs DTAST"] = build(&ClDailyTankAdStart{Duration: 15.5})
	m["cs NWB"] = build(ClNeedsNewBroadcast{})

	photoCase := func(p Photo) func(*Builder) []Value {
		return raw(func(dst []Value) []Value { return p.Append(append(dst, S(OpSvUplink))) })
	}
	m["flatten turret"] = photoCase(fixtureTurret())
	turretWithGun := fixtureTurret()
	turretWithGun.Guns = []Gun{fixtureGun()}
	m["flatten turret with gun"] = photoCase(turretWithGun)
	m["flatten bullet"] = photoCase(fixtureBullet())
	bulletRounding := fixtureBullet()
	bulletRounding.Health, bulletRounding.Shield, bulletRounding.Alpha = 1e-9, 1e-9, 0.5
	m["flatten bullet health rounding"] = photoCase(bulletRounding)
	m["flatten full"] = photoCase(fixtureFull())
	noNameplate := fixtureFull()
	noNameplate.Type = PhotoDrawHealth
	m["flatten full no nameplate"] = photoCase(noNameplate)
	labelled := fixtureFull()
	labelled.Score = ScoreLabel("3 players")
	m["flatten full scoreLabel"] = photoCase(labelled)
	withGuns := fixtureFull()
	g2 := fixtureGun()
	g2.Power, g2.Time = 0, 0
	withGuns.Guns = []Gun{fixtureGun(), g2}
	m["flatten full with guns"] = photoCase(withGuns)
	nested := fixtureFull()
	inner := fixtureTurret()
	inner.Turrets = []Photo{fixtureTurret()}
	nested.Turrets = []Photo{turretWithGun, inner}
	m["flatten nested turrets"] = photoCase(nested)

	guiCase := func(g GUIBlock) func(*Builder) []Value {
		return raw(func(dst []Value) []Value { return g.Append(append(dst, S(OpSvUplink))) })
	}
	m["gui empty"] = guiCase(GUIBlock{})
	m["gui fps only"] = guiCase(GUIBlock{HasFPS: true, FPS: 0.75})
	m["gui fps zero"] = guiCase(GUIBlock{HasFPS: true, FPS: 0})
	m["gui label"] = guiCase(GUIBlock{HasLabel: true, Label: "0", Color: "11 0 1 0 false", BodyID: 7})
	m["gui label no colour"] = guiCase(GUIBlock{HasLabel: true, Label: "0", Color: "10 0 1 0 false", BodyID: 7})
	m["gui score"] = guiCase(GUIBlock{HasScore: true, ScoreJSON: GUIScoreJSON(1000, 2, 1, 0)})
	m["gui score fractional"] = guiCase(GUIBlock{HasScore: true, ScoreJSON: GUIScoreJSON(1234.5, 0, 0, 0)})
	m["gui upgrades"] = guiCase(GUIBlock{HasUpgrades: true, Upgrades: []string{"0_Basic_1", "1_Wing_2"}})
	m["gui upgrades empty"] = guiCase(GUIBlock{HasUpgrades: true})
	statsOnly := GUIBlock{}
	fixtureStats(&statsOnly)
	m["gui statsdata"] = guiCase(statsOnly)
	m["gui skills"] = guiCase(GUIBlock{HasSkills: true, Skills: "000102030405060708ff"})
	m["gui dailyTank"] = guiCase(GUIBlock{HasDailyTank: true, DailyTankJSON: `["12",true]`})
	m["gui points"] = guiCase(GUIBlock{HasPoints: true, Points: 12})
	m["gui accel"] = guiCase(GUIBlock{HasAccel: true, Accel: 1.5})
	m["gui topspeed"] = guiCase(GUIBlock{HasTopSpeed: true, TopSpeed: 12.25})
	m["gui root"] = guiCase(GUIBlock{HasRoot: true, Root: "basic"})
	m["gui class"] = guiCase(GUIBlock{HasClass: true, Class: "Basic"})
	m["gui visibleName"] = guiCase(GUIBlock{HasVisibleName: true, VisibleName: 1})
	everything := GUIBlock{
		HasFPS: true, FPS: 1,
		HasLabel: true, Label: "0", Color: "11 0 1 0 false", BodyID: 7,
		HasScore: true, ScoreJSON: GUIScoreJSON(1000, 2, 1, 0),
		HasPoints: true, Points: 5,
		HasUpgrades: true, Upgrades: []string{"0_Basic_1"},
		HasSkills: true, Skills: "000102030405060708ff",
		HasAccel: true, Accel: 1.5,
		HasTopSpeed: true, TopSpeed: 12.25,
		HasRoot: true, Root: "basic",
		HasClass: true, Class: "Basic",
		HasVisibleName: true, VisibleName: 1,
		HasDailyTank: true, DailyTankJSON: `["12",false]`,
	}
	fixtureStats(&everything)
	m["gui everything"] = guiCase(everything)

	m["u camera only"] = build(&SvUplinkCamera{X: 1234.5, Y: -6789.25})
	empty := fixtureUplink(GUIBlock{})
	m["u full empty world"] = build(&empty)
	one := fixtureUplink(GUIBlock{HasFPS: true, FPS: 1}, fixtureFull())
	m["u full one entity"] = build(&one)
	third := fixtureFull()
	third.ID, third.Type = 8, 0
	three := SvUplink{LastCycle: 98765, FOV: 2000, Scoping: true,
		Entities: []Photo{fixtureFull(), fixtureBullet(), third}}
	m["u full three entities"] = build(&three)
	lastCycleOne := SvUplink{LastCycle: 1, X: 100.5, Y: -200.25, FOV: 2000}
	m["u lastCycle of one"] = build(&lastCycleOne)
	portal := fixtureFull()
	portal.Score, portal.Name = ScoreLabel("3 players"), "#ffffffPortal"
	scoreLabelFrame := SvUplink{LastCycle: 98765, FOV: 2000, Entities: []Photo{portal}}
	m["u full scoreLabel entity"] = build(&scoreLabelFrame)
	bulletWithGun := fixtureBullet()
	bulletWithGun.Guns = []Gun{fixtureGun()}
	fullWithTurret := fixtureFull()
	fullWithTurret.Turrets = []Photo{turretWithGun}
	mixed := SvUplink{LastCycle: 5, X: -1.5, Y: 2.5, FOV: 1500.25, Scoping: true,
		GUI: GUIBlock{HasFPS: true, FPS: 0.5}, Entities: []Photo{fullWithTurret, bulletWithGun}}
	m["u full mixed layouts"] = build(&mixed)

	deltaCase := func(d *Delta, reset bool) func(*Builder) []Value {
		return raw(func(dst []Value) []Value {
			dst = append(dst, S(OpSvBroadcast))
			if reset {
				return d.AppendReset(dst)
			}
			return d.AppendUpdate(dst)
		})
	}
	mmCreate := func() *Delta { return deltaSeq(5, mmRows()) }
	mmUpdated := mmRows()
	mmUpdated[0].Data[1] = N(-11)
	mmUpdate := func() *Delta { return deltaSeq(5, mmRows(), mmUpdated) }
	delRows := []DeltaRow{
		{ID: 1, Data: []Value{N(0), N(-12), N(34), S("c"), N(25)}},
		{ID: 2, Data: []Value{N(2), N(1), N(2), S("c"), N(100)}},
	}
	mmDelete := func() *Delta { return deltaSeq(5, delRows, delRows[1:]) }
	teams := func() *Delta { return deltaSeq(3, teamRows()) }
	lbCreate := func() *Delta { return deltaSeq(7, []DeltaRow{lbRow(1, 5000, true), lbRow(2, 1200, false)}) }
	lbUpdate := func() *Delta {
		return deltaSeq(7,
			[]DeltaRow{lbRow(1, 5000, true), lbRow(2, 1200, false)},
			[]DeltaRow{lbRow(1, 4000, true), lbRow(2, 1200, false)})
	}
	lbAdd := func() *Delta {
		return deltaSeq(7,
			[]DeltaRow{lbRow(2, 1200, false)},
			[]DeltaRow{lbRow(1, 5000, true), lbRow(2, 1200, false)})
	}
	lbField7 := func() *Delta {
		return deltaSeq(7, []DeltaRow{lbRow(1, 5000, true)}, []DeltaRow{lbRow(1, 5000, false)})
	}
	for name, mk := range map[string]func() *Delta{
		"delta minimap create":              mmCreate,
		"delta minimap update one":          mmUpdate,
		"delta minimap delete":              mmDelete,
		"delta teams":                       teams,
		"delta leaderboard create":          lbCreate,
		"delta leaderboard update":          lbUpdate,
		"delta leaderboard create then add": lbAdd,
	} {
		make := mk
		m[name] = deltaCase(make(), false)
		m[name+" reset"] = deltaCase(make(), true)
	}
	m["delta leaderboard field7 only"] = deltaCase(lbField7(), false)

	bMinimap := deltaSeq(5, mmRows()[:1])
	bTeam := deltaSeq(3, teamRows())
	bLeaderboard := deltaSeq(7, []DeltaRow{lbRow(1, 5000, true)})
	resetFrame := SvBroadcast{Minimap: bMinimap, Team: bTeam, Leaderboard: bLeaderboard, Reset: true}
	m["b reset frame"] = build(&resetFrame)
	updateFrame := SvBroadcast{Minimap: bMinimap, Team: bTeam, Leaderboard: bLeaderboard}
	m["b update frame"] = build(&updateFrame)
	noTeam := SvBroadcast{Minimap: bMinimap, Leaderboard: bLeaderboard}
	m["b no team"] = build(&noTeam)

	return m
}

var skipBytes = map[string]string{
	"gSvInfo": "decode-only: no server talk() site (protocol.md 2.5)",
	"I":       "decode-only",
	"AS":      "decode-only",
	"DS":      "decode-only",
}

func TestMessageBytesMatchNode(t *testing.T) {
	vf := loadMessageVectors(t)
	builders := messageBuilders()
	var b Builder
	checked := 0

	for _, c := range vf.Cases {
		if c.Bytes == nil {
			continue
		}
		fn, ok := builders[c.Name]
		if !ok {
			continue // reported by TestMessageVectorCoverage
		}
		got, err := b.Frame(fn(&b))
		if err != nil {
			t.Errorf("%s (%s): encode: %v", c.Name, c.Site, err)
			continue
		}
		if hex.EncodeToString(got) != *c.Bytes {
			t.Errorf("%s (%s): bytes differ\n  go   %x\n  node %s\n  note %s",
				c.Name, c.Site, got, *c.Bytes, c.Note)
			continue
		}
		checked++
	}
	t.Logf("byte-exact against node on %d message vectors", checked)
}

func TestMessageVectorCoverage(t *testing.T) {
	vf := loadMessageVectors(t)
	builders := messageBuilders()
	var missing []string
	for _, c := range vf.Cases {
		if c.Bytes == nil {
			continue
		}
		if _, ok := builders[c.Name]; ok {
			continue
		}
		if _, ok := skipBytes[c.Name]; ok {
			continue
		}
		missing = append(missing, c.Name)
	}
	sort.Strings(missing)
	if len(missing) != 0 {
		t.Errorf("%d vectors have no Go builder: %v", len(missing), missing)
	}
	for name := range builders {
		found := false
		for _, c := range vf.Cases {
			if c.Name == name {
				found = true
				break
			}
		}
		if !found {
			t.Errorf("builder %q has no vector; did the generator's name change?", name)
		}
	}
}

func TestParseRoundTripsNodeFrames(t *testing.T) {
	lossy := map[string]bool{}
	for _, n := range []string{
		"flatten turret", "flatten turret with gun", "flatten bullet",
		"flatten bullet health rounding", "flatten full", "flatten full no nameplate",
		"flatten full scoreLabel", "flatten full with guns", "flatten nested turrets",
		"u full one entity", "u full three entities", "u full scoreLabel entity",
		"u full mixed layouts",
	} {
		lossy[n] = true
	}

	parsers := map[string]func([]Value) (appender, error){
		"W":            func(m []Value) (appender, error) { v, e := ParseSvWelcome(m); return v, e },
		"w":            func(m []Value) (appender, error) { v, e := ParseSvKeyAccepted(m); return v, e },
		"RM":           func(m []Value) (appender, error) { v, e := ParseSvResetMinimap(m); return v, e },
		"RL":           func(m []Value) (appender, error) { v, e := ParseSvResetLeaderboard(m); return v, e },
		"T":            func(m []Value) (appender, error) { v, e := ParseSvTankTree(m); return v, e },
		"K":            func(m []Value) (appender, error) { v, e := ParseSvKick(m); return v, e },
		"temporaryban": func(m []Value) (appender, error) { v, e := ParseSvTemporaryBan(m); return v, e },
		"permanentban": func(m []Value) (appender, error) { v, e := ParseSvPermanentBan(m); return v, e },
		"DTAD":         func(m []Value) (appender, error) { v, e := ParseSvDailyTankAdDone(m); return v, e },
		"DTAST":        func(m []Value) (appender, error) { v, e := ParseSvDailyTankAdStart(m); return v, e },
		"RE":           func(m []Value) (appender, error) { v, e := ParseSvResetEntities(m); return v, e },
		"CC":           func(m []Value) (appender, error) { v, e := ParseSvClearCache(m); return v, e },
		"message":      func(m []Value) (appender, error) { v, e := ParseSvScreenMessage(m); return &v, e },
		"m":            func(m []Value) (appender, error) { v, e := ParseSvPopup(m); return &v, e },
		"Em":           func(m []Value) (appender, error) { v, e := ParseSvPopupLines(m); return &v, e },
		"z":            func(m []Value) (appender, error) { v, e := ParseSvNameColor(m); return &v, e },
		"t":            func(m []Value) (appender, error) { v, e := ParseSvTransfer(m); return &v, e },
		"S":            func(m []Value) (appender, error) { v, e := ParseSvSync(m); return &v, e },
		"p":            func(m []Value) (appender, error) { v, e := ParseSvPong(m); return &v, e },
		"svInfo":       func(m []Value) (appender, error) { v, e := ParseSvServerInfo(m); return &v, e },
		"c":            func(m []Value) (appender, error) { v, e := ParseSvForceCamera(m); return &v, e },
		"R":            func(m []Value) (appender, error) { v, e := ParseSvRoomSetup(m); return &v, e },
		"r":            func(m []Value) (appender, error) { v, e := ParseSvRoomRefresh(m); return &v, e },
		"F":            func(m []Value) (appender, error) { v, e := ParseSvDeath(m); return &v, e },
		"CHAT_MESSAGE_ENTITY": func(m []Value) (appender, error) {
			v, e := ParseSvChat(m)
			return &v, e
		},
		"DTA": func(m []Value) (appender, error) { v, e := ParseSvDailyTankAd(m); return &v, e },
		"SH":  func(m []Value) (appender, error) { v, e := ParseSvScreenShake(m); return &v, e },
		"M":   func(m []Value) (appender, error) { v, e := ParseSvMockup(m); return &v, e },
	}

	var b Builder
	checked := 0
	for _, c := range vf(t).Cases {
		if c.Bytes == nil || lossy[c.Name] || skipBytes[c.Name] != "" ||
			strings.HasPrefix(c.Name, "cs ") {
			continue
		}
		want, err := hex.DecodeString(*c.Bytes)
		if err != nil {
			t.Fatalf("%s: bad hex: %v", c.Name, err)
		}
		decoded := Decode(want)
		if decoded == nil {
			t.Errorf("%s: Decode returned nil for a frame node produced", c.Name)
			continue
		}
		op, rest, ok := Opcode(decoded)
		if !ok {
			t.Errorf("%s: no opcode in %v", c.Name, decoded)
			continue
		}
		parse, ok := parsers[op]
		if !ok {
			continue // the u/b/client frames are covered by their own tests
		}
		msg, err := parse(rest)
		if err != nil {
			t.Errorf("%s: parse %s: %v", c.Name, op, err)
			continue
		}
		got, err := b.Frame(msg.Append(b.Buf()))
		if err != nil {
			t.Errorf("%s: re-encode: %v", c.Name, err)
			continue
		}
		if hex.EncodeToString(got) != *c.Bytes {
			t.Errorf("%s: re-encode differs\n  go   %x\n  node %s", c.Name, got, *c.Bytes)
			continue
		}
		checked++
	}
	t.Logf("parse and re-emit reproduced %d node frames", checked)
}

func vf(t testing.TB) msgVectorFile { return loadMessageVectors(t) }

func TestParseUplinkRoundTrip(t *testing.T) {
	var b Builder
	turret := fixtureTurret()
	turret.Guns = []Gun{fixtureGun()}
	full := fixtureFull()
	full.Turrets = []Photo{turret}
	full.Guns = []Gun{fixtureGun()}
	full.Health, full.Shield, full.Alpha = 1, 0, 1
	bullet := fixtureBullet()

	in := SvUplink{
		LastCycle: 98765, X: 100.5, Y: -200.25, FOV: 2000, VX: 1.5, VY: -0.5, Scoping: true,
		GUI: GUIBlock{
			HasFPS: true, FPS: 0.5,
			HasLabel: true, Label: "0-3", Color: "11 0 1 0 false", BodyID: 7,
			HasScore: true, ScoreJSON: GUIScoreJSON(1000, 2, 1, 0),
			HasUpgrades: true, Upgrades: []string{"0_Basic_1"},
			HasSkills: true, Skills: "000102030405060708ff",
		},
		Entities: []Photo{full, bullet},
	}
	wire, err := b.Frame(in.Append(b.Buf()))
	if err != nil {
		t.Fatal(err)
	}
	want := hex.EncodeToString(wire)

	_, rest, _ := Opcode(Decode(wire))
	out, err := ParseSvUplink(rest)
	if err != nil {
		t.Fatal(err)
	}
	if len(out.Entities) != 2 {
		t.Fatalf("entities: got %d want 2", len(out.Entities))
	}
	if out.Entities[0].Turrets[0].Guns[0].Color != "16 0 1 0 false" {
		t.Errorf("nested turret gun colour lost: %+v", out.Entities[0].Turrets[0].Guns[0])
	}
	if out.Entities[0].Score.IsLabel || out.Entities[0].Score.Score != 12345 {
		t.Errorf("score union lost: %+v", out.Entities[0].Score)
	}
	if out.Entities[1].Type&PhotoBullet == 0 {
		t.Errorf("bullet layout lost: type %d", out.Entities[1].Type)
	}
	got, err := b.Frame(out.Append(b.Buf()))
	if err != nil {
		t.Fatal(err)
	}
	if hex.EncodeToString(got) != want {
		t.Errorf("uplink round trip differs\n  in  %s\n  out %x", want, got)
	}
}

func TestParseBroadcast(t *testing.T) {
	var b Builder
	mm := deltaSeq(5, mmRows())
	team := deltaSeq(3, teamRows())
	lb := deltaSeq(7, []DeltaRow{lbRow(1, 5000, true), lbRow(2, 1200, false)})
	frame := SvBroadcast{Minimap: mm, Team: team, Leaderboard: lb, Reset: true}
	wire, err := b.Frame(frame.Append(b.Buf()))
	if err != nil {
		t.Fatal(err)
	}
	_, rest, _ := Opcode(Decode(wire))
	rows, err := ParseSvBroadcast(rest)
	if err != nil {
		t.Fatal(err)
	}
	if len(rows.MinimapUpdates) != 2 || len(rows.TeamUpdates) != 1 || len(rows.LeaderboardUpdates) != 2 {
		t.Fatalf("row counts: %d %d %d", len(rows.MinimapUpdates), len(rows.TeamUpdates),
			len(rows.LeaderboardUpdates))
	}
	if got := len(rows.LeaderboardUpdates[0].Data); got != 8 {
		t.Errorf("leaderboard row carries %d fields, want 8", got)
	}
	if v := rows.LeaderboardUpdates[0].Data[7]; v.Num != 1 {
		t.Errorf("renderOnLeaderboard did not survive: %+v", v)
	}
}

func TestLeaderboardDataLengthIsSeven(t *testing.T) {
	d := NewDelta(7)
	d.Update([]DeltaRow{lbRow(1, 5000, true)})
	d.Update([]DeltaRow{lbRow(1, 5000, false)})
	got := d.AppendUpdate(nil)
	if len(got) != 2 || got[0].Num != 0 || got[1].Num != 0 {
		t.Errorf("field 7 alone produced an update: %+v", got)
	}

	d8 := NewDelta(8)
	d8.Update([]DeltaRow{lbRow(1, 5000, true)})
	d8.Update([]DeltaRow{lbRow(1, 5000, false)})
	if got := d8.AppendUpdate(nil); len(got) == 2 {
		t.Error("dataLength 8 should have emitted the row")
	}

	if got := d.AppendReset(nil); len(got) != 2+1+8 {
		t.Errorf("reset carried %d elements, want 11", len(got))
	}
}

func TestClientValidationKickReasons(t *testing.T) {
	cases := []struct {
		name   string
		parse  func([]Value) error
		in     []Value
		reason string // "" means accept
	}{
		{"k too long", func(m []Value) error { _, e := ParseClKey(m); return e },
			[]Value{S("a"), S("b")}, "Ill-sized key request."},
		{"k empty", func(m []Value) error { _, e := ParseClKey(m); return e }, nil, ""},
		{"s short", func(m []Value) error { _, e := ParseClSpawn(m); return e },
			[]Value{S("n"), N(0), N(1)}, "Ill-sized spawn request."},
		{"s non-string name", func(m []Value) error { _, e := ParseClSpawn(m); return e },
			[]Value{N(1), N(0), N(0), B(false), N(0)}, "Bad spawn request. (name)"},
		{"s missing incognito", func(m []Value) error { _, e := ParseClSpawn(m); return e },
			[]Value{S("n"), N(0), N(0), B(false)}, "Bad spawn request. (incognito)"},
		{"s bad transfer", func(m []Value) error { _, e := ParseClSpawn(m); return e },
			[]Value{S("n"), N(0), N(0), N(7), N(0)}, "Bad body transfer. (transferbodyID)"},
		{"s false transfer is fine", func(m []Value) error { _, e := ParseClSpawn(m); return e },
			[]Value{S("n"), N(0), N(0), B(false), N(0)}, ""},
		{"S wrong arity", func(m []Value) error { _, e := ParseClSync(m); return e },
			[]Value{N(1), N(2)}, "Ill-sized sync packet."},
		{"S non-number", func(m []Value) error { _, e := ParseClSync(m); return e },
			[]Value{S("1")}, "Weird sync packet."},
		{"p wrong arity", func(m []Value) error { _, e := ParseClPing(m); return e },
			nil, "Ill-sized ping."},
		{"d non-number", func(m []Value) error { _, e := ParseClDownlink(m); return e },
			[]Value{S("x")}, "Bad downlink."},
		{"C wrong arity", func(m []Value) error { _, e := ParseClCommand(m); return e },
			[]Value{N(0), N(0), N(1)}, "Ill-sized command packet."},
		{"C non-number target", func(m []Value) error { _, e := ParseClCommand(m); return e },
			[]Value{S("0"), N(0), N(1), N(0)}, "Weird downlink."},
		{"C commands too big", func(m []Value) error { _, e := ParseClCommand(m); return e },
			[]Value{N(0), N(0), N(1), N(256)}, "Malformed command packet."},
		{"C string reverseTank passes", func(m []Value) error { _, e := ParseClCommand(m); return e },
			[]Value{N(0), N(0), S("-1"), N(0)}, ""},
		{"t wrong arity", func(m []Value) error { _, e := ParseClToggle(m); return e },
			[]Value{N(0)}, "Ill-sized toggle."},
		{"t out of range", func(m []Value) error { _, e := ParseClToggle(m); return e },
			[]Value{N(4), N(0)}, "Bad toggle."},
		{"t fractional", func(m []Value) error { _, e := ParseClToggle(m); return e },
			[]Value{N(1.5), N(0)}, "Bad toggle."},
		{"U daily tank", func(m []Value) error { _, e := ParseClUpgrade(m); return e },
			[]Value{N(0), N(-1)}, ""},
		{"U negative branch", func(m []Value) error { _, e := ParseClUpgrade(m); return e },
			[]Value{N(1), N(-1)}, "Bad upgrade request."},
		{"U NaN branch", func(m []Value) error { _, e := ParseClUpgrade(m); return e },
			[]Value{N(1), N(math.NaN())}, "Bad upgrade request."},
		{"x bad max", func(m []Value) error { _, e := ParseClStat(m); return e },
			[]Value{N(0), N(2)}, "invalid upgrade request max boolean."},
		{"x unknown stat", func(m []Value) error { _, e := ParseClStat(m); return e },
			[]Value{N(10), N(0)}, "Unknown stat upgrade request."},
		{"x non-number max checked before stat", func(m []Value) error { _, e := ParseClStat(m); return e },
			[]Value{N(10), S("0")}, "Weird stat upgrade request max boolean."},
		{"L with payload", func(m []Value) error { _, e := ParseClLevelUp(m); return e },
			[]Value{N(0)}, "Ill-sized level-up request."},
		{"M non-string", func(m []Value) error { _, e := ParseClChat(m); return e },
			[]Value{N(5)}, "Non-string chat message."},
	}

	for _, c := range cases {
		err := c.parse(c.in)
		if c.reason == "" {
			if err != nil {
				t.Errorf("%s: unexpected %v", c.name, err)
			}
			continue
		}
		var ke *KickError
		if err == nil {
			t.Errorf("%s: expected kick %q, got nil", c.name, c.reason)
			continue
		}
		ke, ok := err.(*KickError)
		if !ok || ke.Reason != c.reason {
			t.Errorf("%s: got %q, want kick %q", c.name, err, c.reason)
		}
	}
}

func TestSpawnNameStripsTransferPrefix(t *testing.T) {
	got, err := ParseClSpawn([]Value{S("bob"), N(0), N(0), S("bobdeadbeef"), N(0)})
	if err != nil {
		t.Fatal(err)
	}
	if !got.TransferBodyID.Present || got.TransferBodyID.Value != "deadbeef" {
		t.Errorf("transferbodyID: %+v", got.TransferBodyID)
	}
}

func TestDTASTDurationIsTextNotArithmetic(t *testing.T) {
	vecs := vf(t).Helpers.DTASTDuration
	if len(vecs) == 0 {
		t.Fatal("no dtastDuration vectors")
	}
	for _, c := range vecs {
		in := numberFromJSON(t, c.In)
		d := ClDailyTankAdStart{Duration: in}
		if got := d.DurationSeconds(); got != c.Out {
			t.Errorf("String(%v).split(\".\")[0]: go %q, node %q", in, got, c.Out)
		}
	}
}

func numberFromJSON(t testing.TB, raw json.RawMessage) float64 {
	t.Helper()
	var tagged struct {
		Num *string `json:"__num"`
	}
	if err := json.Unmarshal(raw, &tagged); err == nil && tagged.Num != nil {
		switch *tagged.Num {
		case "nan":
			return math.NaN()
		case "inf":
			return math.Inf(1)
		case "-inf":
			return math.Inf(-1)
		case "-0":
			return math.Copysign(0, -1)
		}
	}
	var f float64
	if err := json.Unmarshal(raw, &f); err != nil {
		t.Fatalf("cannot read number %s: %v", string(raw), err)
	}
	return f
}

func TestJSToFixed1MatchesNode(t *testing.T) {
	for _, c := range vf(t).Helpers.ToFixed1 {
		in := numberFromJSON(t, c.In)
		if got := jsToFixed1(in); got != c.Out {
			t.Errorf("(%v).toFixed(1): go %q, node %q", in, got, c.Out)
		}
	}
}

func TestJSNumberStringMatchesNode(t *testing.T) {
	for _, c := range vf(t).Helpers.NumberToString {
		in := numberFromJSON(t, c.In)
		if got := jsNumberString(in); got != c.Out {
			t.Errorf("String(%v): go %q, node %q", in, got, c.Out)
		}
	}
}

func TestNameTokensMatchesNode(t *testing.T) {
	for _, c := range vf(t).Helpers.NameTokens {
		if got := nameTokens(c.In); got != c.Out {
			t.Errorf("nameTokens(%q): go %d, node %d", c.In, got, c.Out)
		}
	}
	if nameTokens(mustRepeat("x", 47)) > 48 {
		t.Error("47 ASCII characters must pass")
	}
	if nameTokens(mustRepeat("x", 48)) <= 48 {
		t.Error("48 ASCII characters must be kicked")
	}
}

func mustRepeat(s string, n int) string {
	out := make([]byte, 0, len(s)*n)
	for i := 0; i < n; i++ {
		out = append(out, s...)
	}
	return string(out)
}

func TestJSTrimMatchesNode(t *testing.T) {
	for _, c := range vf(t).Helpers.Trim {
		if got := jsTrim(c.In); got != c.Out {
			t.Errorf("%q.trim(): go %q, node %q", c.In, got, c.Out)
		}
	}
}

func TestSkillsHexMatchesNode(t *testing.T) {
	for _, c := range vf(t).Helpers.SkillsHex {
		if got := SkillsHex(c.In); got != c.Out {
			t.Errorf("SkillsHex(%v): go %q, node %q", c.In, got, c.Out)
		}
	}
	for _, c := range vf(t).Cases {
		if c.Name == "getstuff hex string" {
			want := c.Value
			got := SkillsHex([10]float64{1, 2, 3, 4, 5, 6, 7, 8, 9, 255})
			if got != want {
				t.Errorf("getstuff: go %q, node %q", got, want)
			}
		}
	}
}

func TestQuantisationMatchesNode(t *testing.T) {
	h := vf(t).Helpers
	for _, c := range h.MinimapQuantise {
		if got := QuantiseMinimap(c.In[0], c.In[1]); got != c.Out {
			t.Errorf("QuantiseMinimap(%v, %v): go %v, node %v", c.In[0], c.In[1], got, c.Out)
		}
	}
	for _, c := range h.Quantise {
		if got := math.Ceil(65535 * c.In); got != c.Health {
			t.Errorf("health ceil(65535*%v): go %v, node %v", c.In, got, c.Health)
		}
		if got := jsRound(65535 * c.In); got != c.Shield {
			t.Errorf("shield round(65535*%v): go %v, node %v", c.In, got, c.Shield)
		}
		if got := jsRound(255 * c.In); got != c.Alpha {
			t.Errorf("alpha round(255*%v): go %v, node %v", c.In, got, c.Alpha)
		}
	}
}

func TestJSRoundTiesTowardPositiveInfinity(t *testing.T) {
	for _, c := range []struct{ in, want float64 }{
		{0.5, 1}, {-0.5, 0}, {1.5, 2}, {-1.5, -1}, {2.5, 3}, {-2.5, -2},
	} {
		if got := jsRound(c.in); got != c.want {
			t.Errorf("jsRound(%v): got %v want %v", c.in, got, c.want)
		}
	}
}

func benchUplink() SvUplink {
	turret := fixtureTurret()
	turret.Guns = []Gun{fixtureGun(), fixtureGun()}
	ents := make([]Photo, 0, 60)
	for i := 0; i < 40; i++ {
		p := fixtureFull()
		p.ID = float64(i)
		p.Guns = []Gun{fixtureGun()}
		p.Turrets = []Photo{turret}
		ents = append(ents, p)
	}
	for i := 0; i < 20; i++ {
		p := fixtureBullet()
		p.ID = float64(1000 + i)
		ents = append(ents, p)
	}
	gui := GUIBlock{
		HasFPS: true, FPS: 0.5,
		HasLabel: true, Label: "0", Color: "11 0 1 0 false", BodyID: 7,
		HasScore: true, ScoreJSON: GUIScoreJSON(1000, 2, 1, 0),
		HasSkills: true, Skills: "000102030405060708ff",
	}
	fixtureStats(&gui)
	return SvUplink{LastCycle: 98765, X: 100.5, Y: -200.25, FOV: 2000,
		VX: 1.5, VY: -0.5, Scoping: false, GUI: gui, Entities: ents}
}

func benchBroadcast() (SvBroadcast, []DeltaRow, []DeltaRow, []DeltaRow) {
	mm := make([]DeltaRow, 0, 40)
	for i := 0; i < 40; i++ {
		mm = append(mm, DeltaRow{ID: float64(i), Data: []Value{
			N(0), N(float64(i - 20)), N(float64(20 - i)), S("16 0 1 0 false"), N(25)}})
	}
	team := make([]DeltaRow, 0, 10)
	for i := 0; i < 10; i++ {
		team = append(team, DeltaRow{ID: float64(i), Data: []Value{
			N(float64(i)), N(float64(-i)), S("10 0 1 0 false")}})
	}
	lb := make([]DeltaRow, 0, 10)
	for i := 0; i < 10; i++ {
		lb = append(lb, lbRow(float64(i), float64(5000-i*100), true))
	}
	return SvBroadcast{Minimap: NewDelta(5), Team: NewDelta(3), Leaderboard: NewDelta(7)}, mm, team, lb
}

func TestHotPathDoesNotAllocate(t *testing.T) {
	var b Builder
	b.Grow(4096)

	u := benchUplink()
	if _, err := b.Frame(u.Append(b.Buf())); err != nil { // warm the buffers
		t.Fatal(err)
	}
	if n := testing.AllocsPerRun(50, func() {
		if _, err := b.Frame(u.Append(b.Buf())); err != nil {
			t.Fatal(err)
		}
	}); n != 0 {
		t.Errorf("building `u` allocates %v times per call, want 0", n)
	}

	bc, mm, team, lb := benchBroadcast()
	for i := 0; i < 3; i++ {
		bc.Minimap.Update(mm)
		bc.Team.Update(team)
		bc.Leaderboard.Update(lb)
		if _, err := b.Frame(bc.Append(b.Buf())); err != nil {
			t.Fatal(err)
		}
	}
	if n := testing.AllocsPerRun(50, func() {
		bc.Minimap.Update(mm)
		bc.Team.Update(team)
		bc.Leaderboard.Update(lb)
		if _, err := b.Frame(bc.Append(b.Buf())); err != nil {
			t.Fatal(err)
		}
	}); n != 0 {
		t.Errorf("building `b` allocates %v times per call, want 0", n)
	}
}

func BenchmarkBuildUplink(b *testing.B) {
	var bl Builder
	bl.Grow(4096)
	u := benchUplink()
	if _, err := bl.Frame(u.Append(bl.Buf())); err != nil {
		b.Fatal(err)
	}
	b.ReportAllocs()
	b.ResetTimer()
	for i := 0; i < b.N; i++ {
		if _, err := bl.Frame(u.Append(bl.Buf())); err != nil {
			b.Fatal(err)
		}
	}
}

func BenchmarkBuildBroadcast(b *testing.B) {
	var bl Builder
	bl.Grow(1024)
	bc, mm, team, lb := benchBroadcast()
	for i := 0; i < 3; i++ {
		bc.Minimap.Update(mm)
		bc.Team.Update(team)
		bc.Leaderboard.Update(lb)
		if _, err := bl.Frame(bc.Append(bl.Buf())); err != nil {
			b.Fatal(err)
		}
	}
	b.ReportAllocs()
	b.ResetTimer()
	for i := 0; i < b.N; i++ {
		bc.Minimap.Update(mm)
		bc.Team.Update(team)
		bc.Leaderboard.Update(lb)
		if _, err := bl.Frame(bc.Append(bl.Buf())); err != nil {
			b.Fatal(err)
		}
	}
}
