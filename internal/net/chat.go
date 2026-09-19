package net

import "strconv"

// Chats is the room's chat log.
type Chats struct {
	logs    map[uint32]*chatLog
	next    float64
	scratch []byte
}

type chatLog struct {
	messages []chatMessage
}

type chatMessage struct {
	text    string
	id      float64
	expires float64
}

func NewChats() *Chats { return &Chats{logs: make(map[uint32]*chatLog)} }

func (c *Chats) Say(id uint32, message string, expires float64) {
	log := c.logs[id]
	if log == nil {
		log = &chatLog{}
		c.logs[id] = log
	}
	log.messages = append(log.messages, chatMessage{})
	copy(log.messages[1:], log.messages[:len(log.messages)-1])
	log.messages[0] = chatMessage{text: message, id: c.next, expires: expires}
	c.next++
}

func (c *Chats) Expire(now float64) {
	for _, log := range c.logs {
		kept := log.messages[:0]
		for _, m := range log.messages {
			if m.expires > now {
				kept = append(kept, m)
			}
		}
		for i := len(kept); i < len(log.messages); i++ {
			log.messages[i] = chatMessage{}
		}
		log.messages = kept
	}
}

func (c *Chats) Has(id uint32) bool { return c.logs[id] != nil }

func (c *Chats) Encode(ids []uint32, muted bool) string {
	b := c.scratch[:0]
	b = append(b, '[')
	first := true
	for _, id := range ids {
		log := c.logs[id]
		if log == nil {
			continue
		}
		if !first {
			b = append(b, ',')
		}
		first = false
		b = append(b, `{"id":`...)
		b = strconv.AppendUint(b, uint64(id), 10)
		b = append(b, `,"messages":[`...)
		if !muted {
			for i, m := range log.messages {
				if i > 0 {
					b = append(b, ',')
				}
				b = append(b, `{"text":`...)
				b = appendJSONString(b, m.text)
				b = append(b, `,"id":`...)
				b = appendJSNumber(b, m.id)
				b = append(b, '}')
			}
		}
		b = append(b, ']', '}')
	}
	b = append(b, ']')
	c.scratch = b
	return string(b)
}

func appendJSONString(b []byte, s string) []byte {
	b = append(b, '"')
	for i := 0; i < len(s); i++ {
		ch := s[i]
		switch {
		case ch == '"':
			b = append(b, '\\', '"')
		case ch == '\\':
			b = append(b, '\\', '\\')
		case ch == '\n':
			b = append(b, '\\', 'n')
		case ch == '\r':
			b = append(b, '\\', 'r')
		case ch == '\t':
			b = append(b, '\\', 't')
		case ch == '\b':
			b = append(b, '\\', 'b')
		case ch == '\f':
			b = append(b, '\\', 'f')
		case ch < 0x20:
			const hex = "0123456789abcdef"
			b = append(b, '\\', 'u', '0', '0', hex[ch>>4], hex[ch&0xf])
		default:
			b = append(b, ch)
		}
	}
	return append(b, '"')
}

func appendJSNumber(b []byte, v float64) []byte {
	if v == float64(int64(v)) {
		return strconv.AppendInt(b, int64(v), 10)
	}
	return strconv.AppendFloat(b, v, 'g', -1, 64)
}

func JSONString(s string) string { return string(appendJSONString(nil, s)) }

func JSNumber(v float64) string { return string(appendJSNumber(nil, v)) }
