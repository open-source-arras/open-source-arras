package wire

import (
	"strconv"
	"strings"

	"arrasgo/internal/entity"
	"arrasgo/internal/jsutil"
	"arrasgo/internal/room"
	"arrasgo/internal/sim"
)

// deathAnnouncer handles death messages to victim, killers, and room. entity.js:1115-1220.
type deathAnnouncer struct {
	r *room.Room
	s *sim.Sim

	text   strings.Builder
	labels []string
	counts []int
}

func newDeathAnnouncer(r *room.Room, s *sim.Sim) *deathAnnouncer {
	return &deathAnnouncer{r: r, s: s}
}

// announce sends death messages once per tick when an entity dies.
func (a *deathAnnouncer) announce(d *sim.Death) {
	w := a.r.World
	me := w.Get(d.Victim)
	if me == nil {
		return
	}
	comms := a.r.Comms
	if comms == nil {
		return
	}

	master := w.Get(me.Master)
	if master == nil {
		master = me
	}
	var name string
	switch {
	case master.Name != "":
		name = master.Name + "'s " + me.Label
	case master.Type == "tank":
		name = "an unnamed " + me.Label
	case master.Type == "miniboss":
		name = "a visiting " + me.Label
	case strings.HasPrefix(me.Label, "The"):
		name = me.Label
	default:
		name = jsutil.AddArticle(me.Label)
	}

	a.text.Reset()
	if !d.NotJustFood {
		a.text.WriteString("You have been killed by ")
	}
	killSuffix := "."
	doISendAText := me.Settings.GivesKillMessage

	helped := "."
	if len(d.Killers) > 1 {
		helped = " (with some help)."
	}
	if d.NotJustFood {
		for _, kid := range d.Killers {
			killer := w.Get(kid)
			if killer == nil {
				continue
			}
			kmaster := w.Get(killer.Master)
			if kmaster == nil {
				kmaster = killer
			}
			if kmaster.Type != "food" && kmaster.Type != "crasher" {
				switch {
				case killer.Name != "":
					a.text.WriteString(killer.Name)
				case a.text.Len() == 0:
					// First killer opens the sentence, needs capitalization.
					a.text.WriteString("An unnamed player")
				default:
					a.text.WriteString("an unnamed player")
				}
				a.text.WriteString(" and ")
			}
			if doISendAText {
				comms.SendTo(kid, "You killed "+name+helped)
			}
			if me.Settings.KillMessage != "" {
				comms.SendTo(kid, "You "+me.Settings.KillMessage+" "+name+helped)
			}
		}
		a.setText(sliceEnd(a.text.String(), 4) + "killed you with ")
	}

	if me.Settings.BroadcastMessage != "" {
		comms.Broadcast(me.Settings.BroadcastMessage)
	}

	if me.Settings.DefeatMessage {
		defeat := jsutil.AddArticle(me.Label)
		if d.NotJustFood {
			defeat += " has been defeated by"
			for _, kid := range d.Killers {
				defeat += " "
				if killer := w.Get(kid); killer != nil && killer.Name != "" {
					defeat += killer.Name
				} else {
					defeat += "an unnamed player"
				}
				defeat += " and"
			}
			defeat = sliceEnd(defeat, 4) + "!"
		} else {
			defeat += " fought a polygon... and the polygon won."
		}
		comms.Broadcast(defeat)
	}

	a.appendKillTools(d)

	text := sliceEnd(a.text.String(), 5)
	if text == "You have been kille" {
		// When kill() is called from script there are no killers, so no tool list appears.
		text = "You have died a stupid death"
	}
	if a.r.Flags.Outbreak && !a.s.Zombified(d.Victim) {
		text = "You died and became a Zombified " + me.Label
		killSuffix = "!"
	}
	if !a.s.DontSendDeathMessage(d.Victim) {
		comms.SendTo(d.Victim, text+killSuffix)
	}

	a.usurp(d, me)
}

// appendKillTools groups kill tools by label for the death message. entity.js:1181-1191.
func (a *deathAnnouncer) appendKillTools(d *sim.Death) {
	w := a.r.World
	a.labels = a.labels[:0]
	a.counts = a.counts[:0]
	for _, tid := range d.KillTools {
		tool := w.Get(tid)
		if tool == nil {
			continue
		}
		if i := indexOfString(a.labels, tool.Label); i >= 0 {
			a.counts[i]++
			continue
		}
		a.labels = append(a.labels, tool.Label)
		a.counts = append(a.counts, 1)
	}

	for i := range a.labels {
		if a.counts[i] == 1 {
			// Reproduces the JS bug in tool label lookup. See docs/found-bugs.md #88.
			label := ""
			if i < len(d.KillTools) {
				if tool := w.Get(d.KillTools[i]); tool != nil {
					label = tool.Label
				}
			}
			a.text.WriteString(jsutil.AddArticle(label))
		} else {
			a.text.WriteString(strconv.Itoa(a.counts[i]))
			a.text.WriteString(" ")
			a.text.WriteString(a.labels[i])
			a.text.WriteString("s")
		}
		if i < len(a.labels)-2 {
			a.text.WriteString(", ")
		} else {
			a.text.WriteString(" and ")
		}
	}
}

// usurp announces when the leader is defeated. entity.js:1206-1220.
func (a *deathAnnouncer) usurp(d *sim.Death, me *entity.Entity) {
	if float64(me.WireID) != a.r.TopPlayerID {
		return
	}
	text := me.Name
	if text == "" {
		text = "The leader"
	}
	if d.NotJustFood {
		text += " has been usurped by"
		for _, kid := range d.Killers {
			text += " "
			if killer := a.r.World.Get(kid); killer != nil && killer.Name != "" {
				text += killer.Name
			} else {
				text += "an unnamed player"
			}
			text += " and"
		}
		text = sliceEnd(text, 4) + "!"
	} else {
		text += " fought a polygon... and the polygon won."
	}
	a.r.Comms.Broadcast(text)
}

// setText replaces the builder's contents.
func (a *deathAnnouncer) setText(s string) {
	a.text.Reset()
	a.text.WriteString(s)
}

// sliceEnd drops the last n characters from a string (JS str.slice(0, -n)).
func sliceEnd(s string, n int) string {
	if len(s) <= n {
		return ""
	}
	return s[:len(s)-n]
}

func indexOfString(list []string, s string) int {
	for i, v := range list {
		if v == s {
			return i
		}
	}
	return -1
}
