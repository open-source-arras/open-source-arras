package wire

// gui.go is sockets.js:780-1060.

import (
	"math"
	"strconv"

	"arrasgo/internal/entity"
	"arrasgo/internal/net"
)

type floppyNum struct {
	clean bool
	has   bool
	value float64
}

func (f *floppyNum) update(v float64) {
	if !f.has || v != f.value {
		f.clean = false
		f.has = true
		f.value = v
	}
}

func (f *floppyNum) publish() (float64, bool) {
	if !f.clean && f.has {
		f.clean = true
		return f.value, true
	}
	return 0, false
}

type floppyStr struct {
	clean bool
	has   bool
	value string
}

func (f *floppyStr) update(v string) {
	if !f.has || v != f.value {
		f.clean = false
		f.has = true
		f.value = v
	}
}

func (f *floppyStr) updateMissing() {
	if !f.has {
		f.clean = false
	}
}

func (f *floppyStr) publish() (string, bool) {
	if !f.clean && f.has {
		f.clean = true
		return f.value, true
	}
	return "", false
}

type floppyStrs struct {
	clean bool
	has   bool
	value []string
}

func (f *floppyStrs) update(v []string) {
	if !f.has || !sameStrings(f.value, v) {
		f.clean = false
		f.has = true
		f.value = append(f.value[:0], v...)
	}
}

func (f *floppyStrs) publish() ([]string, bool) {
	if !f.clean && f.has {
		f.clean = true
		return f.value, true
	}
	return nil, false
}

func sameStrings(a, b []string) bool {
	if len(a) != len(b) {
		return false
	}
	for i := range a {
		if a[i] != b[i] {
			return false
		}
	}
	return true
}

type statContainer struct {
	titles [10]floppyStr
	caps   [10]floppyNum
	soft   [10]floppyNum

	pending bool
}

func (c *statContainer) update(title *[10]string, cap, soft *[10]float64) {
	for i := 0; i < 10; i++ {
		c.titles[i].update(title[i])
		c.caps[i].update(cap[i])
		c.soft[i].update(soft[i])
	}
	needs := false
	for i := 0; i < 10; i++ {
		if _, ok := c.titles[i].publish(); ok {
			needs = true
		}
		if _, ok := c.caps[i].publish(); ok {
			needs = true
		}
		if _, ok := c.soft[i].publish(); ok {
			needs = true
		}
	}
	if needs {
		c.pending = true
	}
}

func (c *statContainer) publish(out *net.GUIBlock) {
	if !c.pending {
		return
	}
	c.pending = false
	out.HasStats = true
	for i := 0; i < 10; i++ {
		out.StatTitles[i] = c.titles[i].value
		out.StatCaps[i] = c.caps[i].value
		out.StatSoftCaps[i] = c.soft[i].value
	}
}

type guiState struct {
	// bodyID is gui.bodyid, initialised to -1 and only ever read inside the
	// label branch of publish.
	bodyID float64

	fps      floppyNum
	label    floppyStr
	score    floppyStr
	points   floppyNum
	upgrades floppyStrs
	colour   floppyStr
	skills   floppyStr
	topSpeed floppyNum
	accel    floppyNum
	stats    statContainer
	root     floppyStr
	class    floppyStr
	visible  floppyNum
	daily    floppyStr

	upgradeBuf []string
	labels     []upgradeLabel
	skipBuf    []int32
	wroteSkips bool

	in guiInput

	scoreMemo  scoreMemo
	skillsMemo skillsMemo
	dailyMemo  dailyMemo
}

type upgradeLabel struct {
	branch      int32
	branchLabel string
	index       string
	text        string
}

type scoreMemo struct {
	has                          bool
	score, solo, assists, bosses float64
	text                         string
}

type skillsMemo struct {
	has    bool
	amount [10]float64
	text   string
}

type dailyMemo struct {
	has   bool
	index string
	ads   bool
	text  string
}

func newGUIState() *guiState {
	return &guiState{bodyID: -1}
}

func (p *Players) updateGUI(s *net.Socket) {
	g := p.guis[s]
	if g == nil {
		return
	}
	// sockets.js:908. No body, no update. Note that publish still runs
	// afterwards, so a dead player's frame carries whatever was left flagged.
	b := p.r.World.Get(s.Player.Body)
	if b == nil {
		return
	}

	in := &g.in
	in.fps = p.speedSample()
	in.teamColor = s.Player.TeamColor
	in.bodyID = float64(b.WireID)
	in.index = b.Index
	in.score = float64(b.Skill.Score)
	in.solo = float64(b.KillCount.Solo)
	in.assists = float64(b.KillCount.Assists)
	in.bosses = float64(b.KillCount.Bosses)
	in.points = float64(b.Skill.Points)
	in.level = b.Skill.Level
	in.upgradePending = b.UpgradePending.Set
	in.upgrades = b.Upgrades
	in.accel = b.Acceleration
	in.topSpeed = b.TopSpeed
	in.root, in.hasRoot = b.RerootUpgradeTree, b.RerootUpgradeTree != ""
	in.class = b.Label
	in.canSeeInvisible = b.Settings.CanSeeInvisible
	in.dailyTankJSON = p.dailyTankJSON(g, b, s)

	for i := range net.StatNames {
		slot := guiStatSlots[i]
		in.titles[i] = b.Skill.Title(slot)
		in.caps[i] = float64(b.Skill.Cap(&p.r.Tuning, slot, false))
		in.softCaps[i] = float64(b.Skill.Cap(&p.r.Tuning, slot, true))
		in.amounts[i] = float64(b.Skill.Amount(slot))
	}

	g.update(in)
	if g.wroteSkips {
		b.SkippedUpgrades = append(b.SkippedUpgrades[:0], g.skipBuf...)
	}
}

type guiInput struct {
	fps             float64
	teamColor       string
	bodyID          float64
	index           string
	score           float64
	solo            float64
	assists         float64
	bosses          float64
	points          float64
	level           int32
	upgradePending  bool
	upgrades        []entity.Upgrade
	titles          [10]string
	caps            [10]float64
	softCaps        [10]float64
	amounts         [10]float64
	accel           float64
	topSpeed        float64
	root            string
	hasRoot         bool
	class           string
	canSeeInvisible bool
	dailyTankJSON   string
}

func (g *guiState) update(in *guiInput) {
	g.bodyID = in.bodyID

	g.fps.update(in.fps)
	g.colour.update(in.teamColor)
	g.label.update(in.index)
	g.score.update(g.scoreMemo.text4(in.score, in.solo, in.assists, in.bosses))
	g.points.update(float64(in.points))

	g.updateUpgrades(in)
	g.daily.update(in.dailyTankJSON)

	g.stats.update(&in.titles, &in.caps, &in.softCaps)
	g.skills.update(g.skillsMemo.hex(&in.amounts))

	g.accel.update(in.accel)
	g.topSpeed.update(in.topSpeed)

	if in.hasRoot {
		g.root.update(in.root)
	} else {
		g.root.updateMissing()
	}
	g.class.update(in.class)
	g.visible.update(boolToFloat(in.canSeeInvisible))
}

func (g *guiState) updateUpgrades(in *guiInput) {
	g.wroteSkips = false
	if in.upgradePending {
		g.upgrades.update(nil)
		return
	}
	g.upgradeBuf = g.upgradeBuf[:0]
	g.skipBuf = append(g.skipBuf[:0], 0)
	for i := range in.upgrades {
		up := &in.upgrades[i]
		if in.level >= up.Level {
			g.upgradeBuf = append(g.upgradeBuf, g.labelFor(i, up))
			continue
		}
		if int(up.Branch) >= len(g.skipBuf) {
			for len(g.skipBuf) <= int(up.Branch) {
				g.skipBuf = append(g.skipBuf, 0)
			}
			g.skipBuf[up.Branch] = 1
		} else {
			g.skipBuf[len(g.skipBuf)-1]++
		}
	}
	g.wroteSkips = true
	g.upgrades.update(g.upgradeBuf)
}

func (g *guiState) labelFor(i int, up *entity.Upgrade) string {
	for len(g.labels) <= i {
		g.labels = append(g.labels, upgradeLabel{})
	}
	c := &g.labels[i]
	label := up.BranchLabel
	if !up.HasBranchLabel {
		label = "undefined"
	}
	if c.text == "" || c.branch != up.Branch || c.branchLabel != label || c.index != up.Index {
		c.branch, c.branchLabel, c.index = up.Branch, label, up.Index
		c.text = strconv.FormatInt(int64(up.Branch), 10) + "_" + label + "_" + up.Index
	}
	return c.text
}

func (p *Players) dailyTankJSON(g *guiState, b *entity.Entity, s *net.Socket) string {
	if !p.daily.Configured {
		return `[false]`
	}
	index := ""
	if int(b.Skill.Level) >= p.r.Tuning.TierMultiplier*p.daily.Tier && p.bodyHasSpawnClass(b) {
		index = p.daily.Index
	}
	return g.dailyMemo.json(index, p.daily.Ads && !s.Status.DailyTankWatchedAd)
}

func (p *Players) publishGUI(s *net.Socket, out *net.GUIBlock) {
	g := p.guis[s]
	if g == nil {
		return
	}
	if v, ok := g.fps.publish(); ok {
		out.HasFPS, out.FPS = true, v
	}
	colour, hasColour := g.colour.publish()
	if v, ok := g.label.publish(); ok {
		out.HasLabel, out.Label, out.BodyID = true, v, g.bodyID
		if hasColour && colour != "" {
			out.Color = colour
		} else {
			out.Color = s.Player.TeamColor
		}
	}
	if v, ok := g.score.publish(); ok {
		out.HasScore, out.ScoreJSON = true, v
	}
	if v, ok := g.points.publish(); ok {
		out.HasPoints, out.Points = true, v
	}
	if v, ok := g.upgrades.publish(); ok {
		out.HasUpgrades, out.Upgrades = true, v
	}
	g.stats.publish(out)
	if v, ok := g.skills.publish(); ok {
		out.HasSkills, out.Skills = true, v
	}
	if v, ok := g.accel.publish(); ok {
		out.HasAccel, out.Accel = true, v
	}
	if v, ok := g.topSpeed.publish(); ok {
		out.HasTopSpeed, out.TopSpeed = true, v
	}
	if v, ok := g.root.publish(); ok {
		out.HasRoot, out.Root = true, v
	}
	if v, ok := g.class.publish(); ok {
		out.HasClass, out.Class = true, v
	}
	if v, ok := g.visible.publish(); ok {
		out.HasVisibleName, out.VisibleName = true, v
	}
	if v, ok := g.daily.publish(); ok {
		out.HasDailyTank, out.DailyTankJSON = true, v
	}
}

func (m *scoreMemo) text4(score, solo, assists, bosses float64) string {
	if !m.has || m.score != score || m.solo != solo || m.assists != assists || m.bosses != bosses {
		m.has = true
		m.score, m.solo, m.assists, m.bosses = score, solo, assists, bosses
		m.text = net.GUIScoreJSON(score, solo, assists, bosses)
	}
	return m.text
}

func (m *skillsMemo) hex(amount *[10]float64) string {
	if !m.has || *amount != m.amount {
		m.has = true
		m.amount = *amount
		m.text = net.SkillsHex(*amount)
	}
	return m.text
}

func (m *dailyMemo) json(index string, ads bool) string {
	if m.has && m.index == index && m.ads == ads {
		return m.text
	}
	m.has, m.index, m.ads = true, index, ads
	first := "null"
	if index != "" {
		first = strconv.Quote(index)
	}
	second := "false"
	if ads {
		second = "true"
	}
	m.text = "[" + first + "," + second + "]"
	return m.text
}

// guiStatSlots maps a position in net.StatNames to its skill slot. The two
// orders are different and both are load-bearing: skcnv (skills.js:1-12) fixes
// the slot order, and the client's HUD unpacks the block in StatNames order.
var guiStatSlots = func() [10]int {
	var out [10]int
	for i, name := range net.StatNames {
		slot, ok := entity.SkillIndexOf(name)
		if !ok {
			slot = 0
		}
		out[i] = slot
	}
	return out
}()

type dailyTankConfig struct {
	Configured bool
	Tier       int
	Ads        bool
	Index      string
}

func (p *Players) speedSample() float64 { return nanFPS }

var nanFPS = math.NaN()

func (p *Players) bodyHasSpawnClass(b *entity.Entity) bool {
	if p.spawnClassOrd < 0 {
		return false
	}
	for _, ord := range b.Defs {
		if int(ord) == p.spawnClassOrd {
			return true
		}
	}
	return false
}
