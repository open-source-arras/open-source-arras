package net

import (
	"encoding/hex"
	"encoding/json"
	"math"
	"os"
	"path/filepath"
	"testing"
)

type vectorFile struct {
	Cases []vectorCase `json:"cases"`
}

type vectorCase struct {
	Name      string            `json:"name"`
	Input     []json.RawMessage `json:"input"`
	Bytes     *string           `json:"bytes"`
	Err       *string           `json:"err"`
	RoundTrip []json.RawMessage `json:"roundTrip"`
	Note      string            `json:"note"`
}

func loadVectors(t *testing.T) vectorFile {
	t.Helper()
	p := filepath.Join("..", "..", "gen", "protocol-vectors.json")
	raw, err := os.ReadFile(p)
	if err != nil {
		t.Fatalf("read %s: %v (run: node tools/gen-protocol-vectors.js)", p, err)
	}
	var vf vectorFile
	if err := json.Unmarshal(raw, &vf); err != nil {
		t.Fatalf("parse vectors: %v", err)
	}
	if len(vf.Cases) == 0 {
		t.Fatal("no vectors loaded")
	}
	return vf
}

func parseValue(t *testing.T, raw json.RawMessage) Value {
	t.Helper()
	var tagged struct {
		Num  *string `json:"__num"`
		Bits string  `json:"bits"`
	}
	if err := json.Unmarshal(raw, &tagged); err == nil && tagged.Num != nil {
		switch *tagged.Num {
		case "nan":
			// Reconstruct the exact NaN Node had. The sign bit differs between a
			// literal NaN and one from Math.sqrt(-1), and it reaches the wire.
			if b, err := hex.DecodeString(tagged.Bits); err == nil && len(b) == 8 {
				var u uint64
				for _, c := range b {
					u = u<<8 | uint64(c)
				}
				return Value{Kind: KindNumber, Num: math.Float64frombits(u)}
			}
			return Value{Kind: KindNumber, Num: math.NaN()}
		case "inf":
			return Value{Kind: KindNumber, Num: math.Inf(1)}
		case "-inf":
			return Value{Kind: KindNumber, Num: math.Inf(-1)}
		case "-0":
			return Value{Kind: KindNumber, Num: math.Copysign(0, -1)}
		}
	}
	var s string
	if err := json.Unmarshal(raw, &s); err == nil {
		return S(s)
	}
	var f float64
	if err := json.Unmarshal(raw, &f); err == nil {
		return Value{Kind: KindNumber, Num: f}
	}
	var b bool
	if err := json.Unmarshal(raw, &b); err == nil {
		return B(b)
	}
	t.Fatalf("cannot parse vector element %s", string(raw))
	return Value{}
}

func TestEncodeMatchesNodeBytes(t *testing.T) {
	vf := loadVectors(t)
	var enc Encoder
	checked := 0

	for _, c := range vf.Cases {
		msg := make([]Value, 0, len(c.Input))
		for _, raw := range c.Input {
			msg = append(msg, parseValue(t, raw))
		}

		got, err := enc.Encode(msg)

		if c.Err != nil {
			if err == nil {
				t.Errorf("%s: expected an error (node: %s), got bytes %x", c.Name, *c.Err, got)
			}
			continue
		}
		if err != nil {
			t.Errorf("%s: unexpected error %v", c.Name, err)
			continue
		}
		want, decErr := hex.DecodeString(*c.Bytes)
		if decErr != nil {
			t.Fatalf("%s: bad hex in vectors: %v", c.Name, decErr)
		}
		if hex.EncodeToString(got) != *c.Bytes {
			t.Errorf("%s: bytes differ\n  go   %x\n  node %s\n  note %s",
				c.Name, got, *c.Bytes, c.Note)
			continue
		}
		_ = want
		checked++
	}
	t.Logf("byte-exact against node on %d/%d vectors", checked, len(vf.Cases))
}

func TestDecodeMatchesNodeRoundTrip(t *testing.T) {
	vf := loadVectors(t)

	for _, c := range vf.Cases {
		if c.Bytes == nil {
			continue
		}
		raw, err := hex.DecodeString(*c.Bytes)
		if err != nil {
			t.Fatalf("%s: bad hex: %v", c.Name, err)
		}
		got := Decode(raw)
		if got == nil {
			t.Errorf("%s: Decode returned nil for a frame node decoded fine", c.Name)
			continue
		}
		if len(got) != len(c.RoundTrip) {
			t.Errorf("%s: length %d, node got %d", c.Name, len(got), len(c.RoundTrip))
			continue
		}
		for i, rawWant := range c.RoundTrip {
			want := parseValue(t, rawWant)
			if !sameValue(got[i], want) {
				t.Errorf("%s[%d]: go %+v, node %+v", c.Name, i, got[i], want)
			}
		}
	}
}

func sameValue(a, b Value) bool {
	if a.Kind != b.Kind {
		return false
	}
	if a.Kind == KindString {
		return a.Str == b.Str
	}
	if math.IsNaN(a.Num) && math.IsNaN(b.Num) {
		return true
	}
	return a.Num == b.Num
}

func TestGoRoundTrip(t *testing.T) {
	var enc Encoder
	msgs := [][]Value{
		{N(0), N(1), N(255), N(256), N(65535), N(65536)},
		{N(-1), N(-256), N(-257), N(-65536), N(-65537)},
		{S(""), S("a"), S("hello"), S("héllo世")},
		{N(1.5), N(-2.25), N(math.Inf(1)), N(math.Inf(-1))},
		{N(7), N(7), N(7), N(7), N(7), N(7), N(7), N(7)},
	}
	for i, msg := range msgs {
		b, err := enc.Encode(msg)
		if err != nil {
			t.Fatalf("msg %d: %v", i, err)
		}
		got := Decode(b)
		if len(got) != len(msg) {
			t.Fatalf("msg %d: round trip length %d, want %d", i, len(got), len(msg))
		}
		for j := range msg {
			if !sameValue(got[j], msg[j]) {
				t.Errorf("msg %d elem %d: got %+v want %+v", i, j, got[j], msg[j])
			}
		}
	}
}

// A truncated frame must be dropped, not panic. The JS reads past the end of its
// Uint8Array and gets undefined. Go would index out of range.
func TestTruncatedFrameIsDroppedNotPanicked(t *testing.T) {
	var enc Encoder
	full, err := enc.Encode([]Value{S("hello"), N(1234567), N(2.5)})
	if err != nil {
		t.Fatal(err)
	}
	for n := 0; n < len(full); n++ {
		func() {
			defer func() {
				if r := recover(); r != nil {
					t.Errorf("panic decoding %d-byte prefix: %v", n, r)
				}
			}()
			Decode(full[:n])
		}()
	}
}

func FuzzDecodeNeverPanics(f *testing.F) {
	f.Add([]byte{0xf1, 0xff})
	f.Add([]byte{0xf8, 0xff, 0, 0, 0xc0, 0x7f})
	f.Add([]byte{0xfa, 0xff, 'h', 'i', 0})
	f.Fuzz(func(t *testing.T, data []byte) {
		Decode(data)
	})
}

func BenchmarkEncodeTypicalFrame(b *testing.B) {
	var enc Encoder
	msg := []Value{S("u"), N(12345), N(1), N(0), N(0), N(3.5), N(65535), S("player")}
	b.ReportAllocs()
	b.ResetTimer()
	for i := 0; i < b.N; i++ {
		if _, err := enc.Encode(msg); err != nil {
			b.Fatal(err)
		}
	}
}
