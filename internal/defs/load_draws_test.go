package defs

import (
	"testing"

	"arrasgo/internal/jsutil"
)

const (
	jsDrawsServerPortal = 65
	jsDrawsRelicKeys    = 154
	jsDrawsTotal        = jsDrawsServerPortal + jsDrawsRelicKeys // 219
)

func TestLoadConsumesTheSameDrawsAsNode(t *testing.T) {
	rng := jsutil.NewRand(1)
	if _, err := Load(rng); err != nil {
		t.Fatalf("Load: %v", err)
	}

	if got := rng.Calls(); got != jsDrawsTotal {
		t.Errorf("definition loading consumed %d draws, Node consumes %d (delta %+d).\n"+
			"Re-measure with `node tools/count-relic-draws.js` before changing the "+
			"constant -- a mismatch here means every random number the server draws "+
			"afterwards is offset, which no test of the definition table can detect.",
			got, jsDrawsTotal, int64(got)-int64(jsDrawsTotal))
	}
}

func TestRelicBurnComesAfterServerPortal(t *testing.T) {
	rng := jsutil.NewRand(1)

	s, err := Load(jsutil.NewRand(1))
	if err != nil {
		t.Fatalf("Load: %v", err)
	}
	if err := s.rerollServerPortal(rng); err != nil {
		t.Fatalf("rerollServerPortal: %v", err)
	}
	if got := rng.Calls(); got != jsDrawsServerPortal {
		t.Fatalf("serverPortal consumed %d draws, Node consumes %d", got, jsDrawsServerPortal)
	}

	burnRelicKeyDraws(rng)
	if got := rng.Calls(); got != jsDrawsTotal {
		t.Errorf("after the relic burn: %d draws, want %d", got, jsDrawsTotal)
	}
}

func TestRelicBurnIsNotEmpty(t *testing.T) {
	rng := jsutil.NewRand(1)
	burnRelicKeyDraws(rng)
	if got := rng.Calls(); got != jsDrawsRelicKeys {
		t.Errorf("burnRelicKeyDraws consumed %d draws, want %d (%d makeRelic calls x 2)",
			got, jsDrawsRelicKeys, makeRelicCalls)
	}
}
