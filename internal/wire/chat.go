package wire

import (
	"strings"

	"arrasgo/internal/net"
)

// chat is sockets.js:638.
func (p *Players) chat(s *net.Socket, text string) {
	body := s.Player.Body
	if !body.Valid() {
		return
	}
	e := p.r.World.Get(body)
	if e == nil {
		return
	}
	message := text
	if p.r.Tuning.SanitizeChatInput {
		message = strings.ReplaceAll(message, "§", "§§§§")
	}
	p.chats.Say(e.WireID, message, float64(p.worldNow())+float64(p.r.Tuning.ChatMessageDuration))
	p.chatLoop()
}

// chatLoop is sockets.js:100.
func (p *Players) chatLoop() {
	p.chats.Expire(float64(p.worldNow()))
	for _, v := range p.views {
		s := v.Socket
		if s == nil {
			continue
		}
		p.chatIDs = p.chatIDs[:0]
		for _, id := range v.GetNearby() {
			if e := p.r.World.Get(id); e != nil {
				p.chatIDs = append(p.chatIDs, e.WireID)
			}
		}
		body := net.SvChat{EntitiesJSON: p.chats.Encode(p.chatIDs, s.Status.DisableChat)}
		p.fail(s.Talk(body.Append(s.Builder.Buf())))
	}
}
