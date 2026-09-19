package wire

import (
	"arrasgo/internal/entity"
	"arrasgo/internal/net"
	"arrasgo/internal/room"
)

// Comms implements room.Comms over the socket manager. Fields are set after construction.
type Comms struct {
	Srv *net.Server
	Mgr *net.Manager

	Room *room.Room

	err error
}

func (c *Comms) Broadcast(message string) {
	if c.Mgr == nil || c.Srv == nil {
		return
	}
	if err := c.Mgr.Broadcast(c.Srv, message); err != nil {
		c.err = err
	}
}

func (c *Comms) BroadcastRoom() {
	if c.Mgr == nil || c.Srv == nil || c.Room == nil {
		return
	}
	tiles, err := c.Room.RefreshTilesJSON()
	if err != nil {
		c.err = err
		return
	}
	if err := c.Mgr.BroadcastRoom(c.Srv, c.Room.Geometry.Width(), c.Room.Geometry.Height(), tiles); err != nil {
		c.err = err
	}
}

func (c *Comms) SendTo(id entity.EntityID, message string) {
	if c.Mgr == nil || !id.Valid() {
		return
	}
	for _, s := range c.Mgr.Clients() {
		if s.Player.Body != id || !s.Player.Became {
			continue
		}
		msg := (&net.SvPopup{
			Duration: c.Mgr.Cfg.PopupMessageDuration,
			Text:     message,
		}).Append(s.Builder.Buf())
		if err := s.Talk(msg); err != nil {
			c.err = err
		}
		return
	}
}

func (c *Comms) ClientCount() int {
	if c.Mgr == nil {
		return 0
	}
	return len(c.Mgr.Clients())
}

func (c *Comms) Err() error { return c.err }

var _ room.Comms = (*Comms)(nil)
