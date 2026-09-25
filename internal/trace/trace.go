// Package trace writes the Go server's side of the differential trace for comparison with Node.
package trace

import (
	"bufio"
	"io"
	"strconv"

	"arrasgo/internal/entity"
)

type Writer struct {
	w   *bufio.Writer
	buf []byte
	ids []entity.EntityID
}

func NewWriter(dst io.Writer) *Writer {
	return &Writer{
		w:   bufio.NewWriterSize(dst, 1<<20),
		buf: make([]byte, 0, 1<<16),
	}
}

// WriteTick emits one JSON line for the tick state.
func (t *Writer) WriteTick(tick int, timeMS float64, rngCalls uint64, w *entity.World) error {
	b := t.buf[:0]

	b = append(b, `{"tick":`...)
	b = strconv.AppendInt(b, int64(tick), 10)
	b = append(b, `,"time":`...)
	b = appendNum(b, timeMS)
	b = append(b, `,"rngCalls":`...)
	b = strconv.AppendUint(b, rngCalls, 10)
	b = append(b, `,"nextEntityId":`...)
	b = strconv.AppendUint(b, uint64(w.NextWireID()), 10)

	t.ids = t.ids[:0]
	w.EachLive(func(id entity.EntityID, e *entity.Entity) {
		if w.Flag[id.Index].Has(entity.FlagUnlisted) {
			return
		}
		t.ids = append(t.ids, id)
	})
	sortByWireID(w, t.ids)

	b = append(b, `,"count":`...)
	b = strconv.AppendInt(b, int64(len(t.ids)), 10)
	b = append(b, `,"entities":[`...)
	for i, id := range t.ids {
		if i > 0 {
			b = append(b, ',')
		}
		b = t.appendEntity(b, w, id)
	}
	b = append(b, ']', '}', '\n')

	t.buf = b
	_, err := t.w.Write(b)
	return err
}

func (t *Writer) Flush() error { return t.w.Flush() }

// appendEntity mirrors run.js:197 snapshotEntity.
func (t *Writer) appendEntity(b []byte, w *entity.World, id entity.EntityID) []byte {
	e := w.Get(id)
	i := id.Index

	b = append(b, `{"id":`...)
	b = strconv.AppendUint(b, uint64(e.WireID), 10)
	b = append(b, `,"index":`...)
	b = appendStr(b, e.Index)
	b = append(b, `,"type":`...)
	b = appendStr(b, e.Type)
	b = append(b, `,"label":`...)
	b = appendStr(b, e.Label)
	b = append(b, `,"team":`...)
	b = strconv.AppendInt(b, int64(e.Team), 10)

	pos, vel := w.Pos[i], w.Vel[i]
	b = append(b, `,"x":`...)
	b = appendNum(b, float64(pos.X))
	b = append(b, `,"y":`...)
	b = appendNum(b, float64(pos.Y))
	b = append(b, `,"vx":`...)
	b = appendNum(b, float64(vel.X))
	b = append(b, `,"vy":`...)
	b = appendNum(b, float64(vel.Y))
	b = append(b, `,"size":`...)
	b = appendNum(b, float64(w.Size[i]))
	b = append(b, `,"facing":`...)
	b = appendNum(b, e.Facing)
	b = append(b, `,"health":`...)
	b = appendNum(b, e.Health.Amount)
	b = append(b, `,"healthMax":`...)
	b = appendNum(b, e.Health.Max)
	b = append(b, `,"shield":`...)
	b = appendNum(b, e.Shield.Amount)
	b = append(b, `,"shieldMax":`...)
	b = appendNum(b, e.Shield.Max)
	b = append(b, `,"alpha":`...)
	b = appendNum(b, e.Alpha)

	// A stale master handle emits null to show up in the diff as a divergence.
	b = append(b, `,"master":`...)
	switch {
	case !e.Master.Valid() || e.Master == id:
		b = strconv.AppendUint(b, uint64(e.WireID), 10)
	default:
		if m := w.Get(e.Master); m != nil {
			b = strconv.AppendUint(b, uint64(m.WireID), 10)
		} else {
			b = append(b, `null`...)
		}
	}

	b = append(b, `,"dead":`...)
	b = strconv.AppendBool(b, e.IsDead())

	return append(b, '}')
}

// appendNum tags NaN and Infinity as strings since JSON cannot represent them.
func appendNum(b []byte, v float64) []byte {
	switch {
	case v != v:
		return append(b, `"NaN"`...)
	case v > maxFloat64:
		return append(b, `"Infinity"`...)
	case v < -maxFloat64:
		return append(b, `"-Infinity"`...)
	}
	return strconv.AppendFloat(b, v, 'g', -1, 64)
}

const maxFloat64 = 1.7976931348623157e308

// appendStr writes a JSON string, escaping control characters and quotes.
func appendStr(b []byte, s string) []byte {
	b = append(b, '"')
	for i := 0; i < len(s); i++ {
		c := s[i]
		switch {
		case c == '"':
			b = append(b, '\\', '"')
		case c == '\\':
			b = append(b, '\\', '\\')
		case c == '\n':
			b = append(b, '\\', 'n')
		case c == '\r':
			b = append(b, '\\', 'r')
		case c == '\t':
			b = append(b, '\\', 't')
		case c < 0x20:
			b = append(b, '\\', 'u', '0', '0', hex[c>>4], hex[c&0xf])
		default:
			b = append(b, c)
		}
	}
	return append(b, '"')
}

const hex = "0123456789abcdef"

// sortByWireID sorts by insertion since slab is nearly sorted already.
func sortByWireID(w *entity.World, ids []entity.EntityID) {
	for i := 1; i < len(ids); i++ {
		x := ids[i]
		xv := w.Get(x).WireID
		j := i - 1
		for j >= 0 && w.Get(ids[j]).WireID > xv {
			ids[j+1] = ids[j]
			j--
		}
		ids[j+1] = x
	}
}
