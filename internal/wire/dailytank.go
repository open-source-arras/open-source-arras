package wire

import (
	"strings"

	"arrasgo/internal/config"
	"arrasgo/internal/net"
)

// dailyTankAd sends an ad if conditions permit.
func (p *Players) dailyTankAd(s *net.Socket) {
	cfg := p.r.Tuning.DailyTank
	if cfg == nil || !p.daily.Configured {
		return
	}
	b := p.r.World.Get(s.Player.Body)
	if b == nil {
		return
	}
	if int(b.Skill.Level) < p.r.Tuning.TierMultiplier*cfg.Tier {
		return
	}
	if !cfg.Ads || s.Status.DailyTankWatchedAd || len(cfg.AdSources) == 0 {
		return
	}

	ad := p.r.Rand.Choose(cfg.AdSources)
	isImage := hasAnySuffix(ad.File, ".png", ".jpg", ".jpeg")
	wait := "isVideo"
	if isImage {
		wait = jsonNumberOrOmit(ad)
	}
	p.fail(s.Talk((&net.SvDailyTankAd{
		AdJSON: dailyTankAdJSON(ad.File, !ad.HasUseRegularAdSize || ad.UseRegularAdSize, wait),
	}).Append(s.Builder.Buf())))

	if isImage {
		inner := int64(3000)
		if ad.HasImageWaitTime {
			inner = int64(ad.ImageWaitTime) * 1000
		}
		p.schedulePlayerTimer(p.r.World.Now()+int64(s.Camera.Ping), timerAdPing, s, inner)
	}
}

// dailyTankAdStart schedules timers for daily tank ads.
func (p *Players) dailyTankAdStart(s *net.Socket, seconds string) {
	if p.r.Tuning.DailyTank == nil {
		return
	}
	p.schedulePlayerTimer(p.r.World.Now()+int64(s.Camera.Ping), timerAdPing, s, adDelayMS(seconds))
}

// adDelayMS converts seconds to milliseconds, clamping to 1 ms minimum.
func adDelayMS(seconds string) int64 {
	var n int64
	if seconds == "" {
		return 1
	}
	neg := false
	i := 0
	if seconds[0] == '-' || seconds[0] == '+' {
		neg = seconds[0] == '-'
		i = 1
	}
	if i == len(seconds) {
		return 1
	}
	for ; i < len(seconds); i++ {
		c := seconds[i]
		if c < '0' || c > '9' {
			return 1
		}
		n = n*10 + int64(c-'0')
	}
	n *= 1000
	if neg {
		n = -n
	}
	if n < 1 {
		return 1
	}
	return n
}

// dailyTankAdJSON builds the DTA payload.
func dailyTankAdJSON(src string, normalSize bool, wait string) string {
	var b strings.Builder
	b.WriteString(`{"src":`)
	b.WriteString(jsonString(src))
	b.WriteString(`,"normalAdSize":`)
	if normalSize {
		b.WriteString("true")
	} else {
		b.WriteString("false")
	}
	if wait != "" {
		b.WriteString(`,"waitTime":`)
		if wait == "isVideo" {
			b.WriteString(`"isVideo"`)
		} else {
			b.WriteString(wait)
		}
	}
	b.WriteString("}")
	return b.String()
}

// jsonNumberOrOmit returns image wait time as JSON or omits it if absent.
func jsonNumberOrOmit(ad config.DailyTankAd) string {
	if !ad.HasImageWaitTime {
		return ""
	}
	return net.JSNumber(ad.ImageWaitTime)
}

func hasAnySuffix(s string, suffixes ...string) bool {
	for _, x := range suffixes {
		if strings.HasSuffix(s, x) {
			return true
		}
	}
	return false
}

func jsonString(s string) string { return net.JSONString(s) }
