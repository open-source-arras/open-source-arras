// Package net carries the wire codec and the socket layer.
package net

import (
	"errors"
	"math"
	"unicode/utf16"
)

// Header nibbles, from the table at fasttalk.js:10-28.
const (
	hZero   = 0b0000 // 0 or false
	hOne    = 0b0001 // 1 or true
	hI8     = 0b0010 // 8 bit, positive
	hI8Neg  = 0b0011
	hI16    = 0b0100
	hI16Neg = 0b0101
	hI32    = 0b0110
	hI32Neg = 0b0111
	hFloat  = 0b1000
	hStr1   = 0b1001 // single optional non-null byte
	hStr8   = 0b1010 // 8-bit null-terminated
	hStr16  = 0b1011 // 16-bit null-terminated
	hRep2   = 0b1100
	hRep3   = 0b1101
	hRepN   = 0b1110 // repeat 4+n times, 0 <= n < 16
	hEnd    = 0b1111
)

var ErrNullInString = errors.New("fasttalk: null containing string")

// Kind distinguishes the two things the wire carries.
type Kind uint8

const (
	KindNumber Kind = iota
	KindString
)

// Value is one element of a message.
type Value struct {
	Kind Kind
	Num  float64
	Str  string
}

func N[T ~int | ~int8 | ~int16 | ~int32 | ~int64 | ~uint | ~uint8 | ~uint16 | ~uint32 | ~float32 | ~float64](v T) Value {
	return Value{Kind: KindNumber, Num: float64(v)}
}

func S(s string) Value { return Value{Kind: KindString, Str: s} }

func B(b bool) Value {
	if b {
		return Value{Kind: KindNumber, Num: 1}
	}
	return Value{Kind: KindNumber, Num: 0}
}

// isJSInteger mirrors Number.isInteger.
func isJSInteger(f float64) bool {
	return !math.IsNaN(f) && !math.IsInf(f, 0) && math.Trunc(f) == f
}

// classify returns the header nibble and content size (fasttalk.js:50-113).
func classify(v Value, units []uint16) (code int, size int, err error) {
	if v.Kind == KindNumber {
		f := v.Num
		if f == 0 {
			return hZero, 0, nil
		}
		if f == 1 {
			return hOne, 0, nil
		}
		if !isJSInteger(f) || f < -0x100000000 || f >= 0x100000000 {
			return hFloat, 4, nil
		}
		if f >= 0 {
			switch {
			case f < 0x100:
				return hI8, 1, nil
			case f < 0x10000:
				return hI16, 2, nil
			default:
				return hI32, 4, nil
			}
		}
		switch {
		case f >= -0x100:
			return hI8Neg, 1, nil
		case f >= -0x10000:
			return hI16Neg, 2, nil
		default:
			return hI32Neg, 4, nil
		}
	}

	hasUnicode := false
	for _, u := range units {
		if u > 0xff {
			hasUnicode = true
		} else if u == 0 {
			return 0, 0, ErrNullInString
		}
	}
	switch {
	case !hasUnicode && len(units) <= 1:
		return hStr1, 1, nil
	case hasUnicode:
		return hStr16, len(units)*2 + 2, nil
	default:
		return hStr8, len(units) + 1, nil
	}
}

// Encoder holds scratch buffers for zero-allocation frame encoding.
type Encoder struct {
	headers     []int
	headerCodes []int
	out         []byte
	unitPool    []uint16
	spans       []unitSpan
}

type unitSpan struct{ start, end int }

// Encode returns the wire bytes for a message.
func (e *Encoder) Encode(message []Value) ([]byte, error) {
	e.headers = e.headers[:0]
	e.headerCodes = e.headerCodes[:0]
	e.spans = e.spans[:0]
	e.unitPool = e.unitPool[:0]

	contentSize := 0
	lastTypeCode := hEnd
	repeatTypeCount := 0

	for _, block := range message {
		span := unitSpan{start: len(e.unitPool)}
		if block.Kind == KindString {
			if s := block.Str; isASCII(s) {
				for i := 0; i < len(s); i++ {
					e.unitPool = append(e.unitPool, uint16(s[i]))
				}
			} else {
				for _, r := range s {
					e.unitPool = utf16.AppendRune(e.unitPool, r)
				}
			}
		}
		span.end = len(e.unitPool)
		e.spans = append(e.spans, span)

		code, size, err := classify(block, e.unitPool[span.start:span.end])
		if err != nil {
			return nil, err
		}
		contentSize += size
		e.headers = append(e.headers, code)

		if code == lastTypeCode {
			repeatTypeCount++
			continue
		}
		e.headerCodes = append(e.headerCodes, lastTypeCode)
		e.flushRepeats(&repeatTypeCount, lastTypeCode)
		repeatTypeCount = 0
		lastTypeCode = code
	}

	e.headerCodes = append(e.headerCodes, lastTypeCode)
	e.flushRepeats(&repeatTypeCount, lastTypeCode)
	e.headerCodes = append(e.headerCodes, hEnd)
	if len(e.headerCodes)%2 == 1 {
		e.headerCodes = append(e.headerCodes, hEnd)
	}

	total := len(e.headerCodes)>>1 + contentSize
	if cap(e.out) < total {
		e.out = make([]byte, total)
	}
	e.out = e.out[:total]

	for i := 0; i < len(e.headerCodes); i += 2 {
		e.out[i>>1] = byte(e.headerCodes[i]<<4 | e.headerCodes[i+1])
	}

	idx := len(e.headerCodes) >> 1
	for i, block := range message {
		switch e.headers[i] {
		case hZero, hOne:

		case hI8, hI8Neg:
			// Modulo 256 so -1 round-trips as 0xff (fasttalk.js:177).
			e.out[idx] = byte(int64(block.Num))
			idx++

		case hI16, hI16Neg:
			u := uint16(int64(block.Num))
			e.out[idx] = byte(u)
			e.out[idx+1] = byte(u >> 8)
			idx += 2

		case hI32, hI32Neg:
			u := uint32(int64(block.Num))
			e.out[idx] = byte(u)
			e.out[idx+1] = byte(u >> 8)
			e.out[idx+2] = byte(u >> 16)
			e.out[idx+3] = byte(u >> 24)
			idx += 4

		case hFloat:
			// NaN sign bit must be preserved (fasttalk.js).
			u := math.Float32bits(float32(block.Num))
			e.out[idx] = byte(u)
			e.out[idx+1] = byte(u >> 8)
			e.out[idx+2] = byte(u >> 16)
			e.out[idx+3] = byte(u >> 24)
			idx += 4

		case hStr1:
			units := e.unitPool[e.spans[i].start:e.spans[i].end]
			var b byte
			if len(units) != 0 {
				b = byte(units[0])
			}
			e.out[idx] = b
			idx++

		case hStr8:
			for _, u := range e.unitPool[e.spans[i].start:e.spans[i].end] {
				e.out[idx] = byte(u)
				idx++
			}
			e.out[idx] = 0
			idx++

		case hStr16:
			for _, u := range e.unitPool[e.spans[i].start:e.spans[i].end] {
				e.out[idx] = byte(u)
				e.out[idx+1] = byte(u >> 8)
				idx += 2
			}
			e.out[idx] = 0
			e.out[idx+1] = 0
			idx += 2
		}
	}

	return e.out, nil
}

// flushRepeats emits run-length codes (fasttalk.js:119-135).
func (e *Encoder) flushRepeats(repeatTypeCount *int, lastTypeCode int) {
	n := *repeatTypeCount
	if n < 1 {
		return
	}
	for n > 19 {
		e.headerCodes = append(e.headerCodes, hRepN, 15)
		n -= 19
	}
	switch {
	case n == 1:
		e.headerCodes = append(e.headerCodes, lastTypeCode)
	case n == 2:
		e.headerCodes = append(e.headerCodes, hRep2)
	case n == 3:
		e.headerCodes = append(e.headerCodes, hRep3)
	case n < 20:
		e.headerCodes = append(e.headerCodes, hRepN, n-4)
	}
	*repeatTypeCount = n
}

// Decode parses a frame, returning nil for malformed input (fasttalk.js:226).
func Decode(data []byte) []Value {
	if len(data) == 0 || data[0]>>4 != hEnd {
		return nil
	}

	headers := make([]int, 0, 32)
	lastTypeCode := hEnd
	idx := 0
	consumedHalf := true

	for {
		if idx >= len(data) {
			return nil
		}
		typeCode := int(data[idx])
		if consumedHalf {
			typeCode &= 0b1111
			idx++
		} else {
			typeCode >>= 4
		}
		consumedHalf = !consumedHalf

		if typeCode&0b1100 != 0b1100 {
			headers = append(headers, typeCode)
			lastTypeCode = typeCode
			continue
		}
		if typeCode == hEnd {
			if consumedHalf {
				idx++
			}
			break
		}
		repeat := typeCode - 10 // 0b1100 -> 2, 0b1101 -> 3, 0b1110 -> 4
		if typeCode == hRepN {
			if idx >= len(data) {
				return nil
			}
			repeatCode := int(data[idx])
			if consumedHalf {
				repeatCode &= 0b1111
				idx++
			} else {
				repeatCode >>= 4
			}
			consumedHalf = !consumedHalf
			repeat += repeatCode
		}
		for i := 0; i < repeat; i++ {
			headers = append(headers, lastTypeCode)
		}
	}

	out := make([]Value, 0, len(headers))
	need := func(n int) bool { return idx+n <= len(data) }

	for _, header := range headers {
		switch header {
		case hZero:
			out = append(out, N(0))
		case hOne:
			out = append(out, N(1))
		case hI8:
			if !need(1) {
				return nil
			}
			out = append(out, N(float64(data[idx])))
			idx++
		case hI8Neg:
			if !need(1) {
				return nil
			}
			out = append(out, N(float64(data[idx])-0x100))
			idx++
		case hI16:
			if !need(2) {
				return nil
			}
			out = append(out, N(float64(uint16(data[idx])|uint16(data[idx+1])<<8)))
			idx += 2
		case hI16Neg:
			if !need(2) {
				return nil
			}
			out = append(out, N(float64(uint16(data[idx])|uint16(data[idx+1])<<8)-0x10000))
			idx += 2
		case hI32:
			if !need(4) {
				return nil
			}
			out = append(out, N(float64(le32(data[idx:]))))
			idx += 4
		case hI32Neg:
			if !need(4) {
				return nil
			}
			out = append(out, N(float64(le32(data[idx:]))-0x100000000))
			idx += 4
		case hFloat:
			if !need(4) {
				return nil
			}
			out = append(out, N(float64(math.Float32frombits(le32(data[idx:])))))
			idx += 4
		case hStr1:
			if !need(1) {
				return nil
			}
			b := data[idx]
			idx++
			if b == 0 {
				out = append(out, S(""))
			} else {
				out = append(out, S(string(rune(b))))
			}
		case hStr8:
			units := []uint16{}
			for {
				if !need(1) {
					return nil
				}
				b := data[idx]
				idx++
				if b == 0 {
					break
				}
				units = append(units, uint16(b))
			}
			out = append(out, S(string(utf16.Decode(units))))
		case hStr16:
			units := []uint16{}
			for {
				if !need(2) {
					return nil
				}
				u := uint16(data[idx]) | uint16(data[idx+1])<<8
				idx += 2
				if u == 0 {
					break
				}
				units = append(units, u)
			}
			out = append(out, S(string(utf16.Decode(units))))
		}
	}
	return out
}

func le32(b []byte) uint32 {
	return uint32(b[0]) | uint32(b[1])<<8 | uint32(b[2])<<16 | uint32(b[3])<<24
}

// isASCII reports whether every byte is below 0x80.
func isASCII(s string) bool {
	for i := 0; i < len(s); i++ {
		if s[i] >= 0x80 {
			return false
		}
	}
	return true
}
