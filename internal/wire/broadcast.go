package wire

import (
	"arrasgo/internal/entity"
	"arrasgo/internal/jsutil"
	"arrasgo/internal/net"
	"arrasgo/internal/room"
	"arrasgo/internal/sim"
)

func BroadcastLoop(r *room.Room, s *sim.Sim, rng *jsutil.Rand, mgr *net.Manager, p *Players) func() {
	var (
		allRows   net.MinimapAll
		teamRows  net.MinimapAllTeams
		all       = net.NewDelta(net.MinimapFields)
		allTeams  = net.NewDelta(net.MinimapTeamFields)
		seeded    bool
		liveOrder []entity.EntityID
	)
	isMothership := func(id entity.EntityID) bool { return r.Extras.Get(id).IsMothership }
	minimapColor := func(id entity.EntityID) string { return r.Extras.Get(id).MinimapColor }

	return func() {
		set := net.MinimapSettings{
			Width:                r.Geometry.Width(),
			Height:               r.Geometry.Height(),
			Blackout:             r.Flags.Blackout,
			BlackoutMinimapColor: r.Flags.BlackoutMinimapColor,
			FlatTeamColor:        flatTeamColor(r),
			IsMothership:         isMothership,
			MinimapColor:         minimapColor,
		}
		liveOrder = s.Tracked()

		if !seeded {
			all.Seed(allRows.Build(s.W, liveOrder, set, rng))
			allTeams.Seed(teamRows.Build(s.W, liveOrder, set))
			seeded = true
		}
		all.Update(allRows.Build(s.W, liveOrder, set, rng))
		allTeams.Update(teamRows.Build(s.W, liveOrder, set))

		if p != nil {
			p.broadcast(all, allTeams, set, liveOrder)
		}
		if mgr != nil {
			mgr.Watchdog()
			mgr.SweepOverflowed()
		}
	}
}

func flatTeamColor(r *room.Room) bool {
	return r.Flags.Groups != 0 ||
		r.Mutable.Mode == "ffa" ||
		(r.Mutable.Mode == "clan" && !r.Flags.Tag)
}

type broadcastState struct {
	team   *net.Delta
	boards [4]*net.Delta

	teamSeeded  bool
	boardSeeded [4]bool
}

func newBroadcastState() *broadcastState {
	st := &broadcastState{team: net.NewDelta(net.MinimapTeamFields)}
	for i := range st.boards {
		st.boards[i] = net.NewDelta(net.LeaderboardFields - 1)
	}
	return st
}

func (p *Players) broadcast(all, allTeams *net.Delta, set net.MinimapSettings, order []entity.EntityID) {
	clients := p.g.Sockets.Clients()
	if len(clients) == 0 {
		return
	}
	lb := p.refreshLeaderboardSettings()

	for _, s := range clients {
		st := p.casts[s]
		if st == nil {
			st = newBroadcastState()
			p.casts[s] = st
		}

		team, hasTeam := s.Player.Team, s.Player.HasTeam
		if body := p.r.World.Get(s.Player.Body); body != nil {
			team, hasTeam = body.Team, true
		}
		if !st.teamSeeded {
			st.team.Seed(p.teamRows.Build(p.r.World, order, 0, false, set))
			st.teamSeeded = true
		}
		st.team.Update(p.teamRows.Build(p.r.World, order, team, hasTeam, set))

		if !s.Status.HasSelectedLeaderboard {
			s.Status.SelectedLeaderboard, s.Status.HasSelectedLeaderboard = "global", true
		}
		if !s.Status.HasSpawned || s.Status.SelectedLeaderboard == "stop" {
			continue
		}

		kind := net.ParseLeaderboardKind(s.Status.SelectedLeaderboard)
		board := st.boards[kind]
		if !st.boardSeeded[kind] {
			board.Seed(p.boardRows.Build(p.r.World, order, kind, lb))
			st.boardSeeded[kind] = true
		}
		rows := p.boardRows.Build(p.r.World, order, kind, lb)
		board.Update(rows)

		teamBlock := st.team
		if s.Status.SeesAllTeams {
			teamBlock = allTeams
		}

		if p.mockups != nil {
			for _, row := range rows {
				p.fail(p.mockups.Send(s, row.Data[1].Str))
			}
		}

		frame := net.SvBroadcast{Minimap: all, Team: teamBlock, Leaderboard: board}
		if s.Status.NeedsNewBroadcast {
			p.fail(s.Talk(net.SvResetMinimap{}.Append(s.Builder.Buf())))
			frame.Reset = true
			p.fail(s.Talk(frame.Append(s.Builder.Buf())))
			s.Status.NeedsNewBroadcast = false
		} else {
			p.fail(s.Talk(frame.Append(s.Builder.Buf())))
		}

		if s.Status.ForceNewBroadcast {
			p.fail(s.Talk(net.SvResetMinimap{}.Append(s.Builder.Buf())))
			p.fail(s.Talk(net.SvResetLeaderboard{}.Append(s.Builder.Buf())))
			s.Status.NeedsNewBroadcast = true
		}
	}
}

func (p *Players) initLeaderboardSettings() {
	p.lb = net.LeaderboardSettings{
		TagModeIndex:     p.tagModeIndex,
		TagModeLabel:     p.tagModeLabel,
		HPLabel:          p.hpLabel,
		TeamName:         room.TeamNameAt,
		TeamColor:        func(i int) string { return room.GetTeamColor(int32(-i-1), true) },
		IsBoss:           p.isBoss,
		Incognito:        p.isIncognito,
		LeaderboardColor: p.leaderboardColor,
		TopPlayerID:      p.setTopPlayerID,
	}
}

func (p *Players) refreshLeaderboardSettings() *net.LeaderboardSettings {
	p.lb.PaletteColor = p.r.Flags.Groups != 0 || (p.r.Mutable.Mode == "ffa" && !p.r.Flags.Tag)
	p.lb.FFAUntagged = p.r.Mutable.Mode == "ffa" && !p.r.Flags.Tag
	p.lb.Tag = p.r.Flags.Tag
	p.lb.Mothership = p.r.Flags.Mothership
	p.lb.TagTeams, p.lb.Motherships = nil, nil
	if gm := p.r.Gamemodes; gm != nil {
		if p.lb.Tag && gm.Tag != nil {
			p.lb.TagTeams = gm.Tag.Teams
		}
		if p.lb.Mothership && gm.Mothership != nil {
			p.lb.Motherships = gm.Mothership.GlobalMotherships()
		}
	}
	return &p.lb
}

func (p *Players) setTopPlayerID(id float64) { p.r.TopPlayerID = id }

func (p *Players) isBoss(id entity.EntityID) bool      { return p.r.Extras.Get(id).IsBoss }
func (p *Players) isIncognito(id entity.EntityID) bool { return p.r.Extras.Get(id).Incognito }
func (p *Players) leaderboardColor(id entity.EntityID) string {
	return p.r.Extras.Get(id).LeaderboardColor
}
