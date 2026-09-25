package room

import "testing"

type stubBounds struct{ w, h float64 }

func (b *stubBounds) UpdateBounds(w, h float64) { b.w, b.h = w, h }

// TestSandbox_GrowsAndShrinksWithClientCount pins update()'s arithmetic
// (sandbox.js:5-15): +/-20 grid units per axis per client-count change,
// scaled by *30 into the BoundsUpdater call.
func TestSandbox_GrowsAndShrinksWithClientCount(t *testing.T) {
	room := newGamemodeTestRoom(t, 61, "sandbox")
	sb := newSandbox(room)
	bounds := &stubBounds{}
	sb.Bounds = bounds
	startX, startY := sb.xgrid, sb.ygrid

	comms := stubComms{clients: 3}
	room.Comms = comms
	sb.Update()
	if sb.xgrid != startX+20 || sb.ygrid != startY+20 {
		t.Fatalf("after growing to 3 clients: xgrid=%d ygrid=%d, want %d/%d", sb.xgrid, sb.ygrid, startX+20, startY+20)
	}
	if bounds.w != float64(sb.xgrid)*30 || bounds.h != float64(sb.ygrid)*30 {
		t.Errorf("UpdateBounds got (%v,%v), want (%v,%v)", bounds.w, bounds.h, float64(sb.xgrid)*30, float64(sb.ygrid)*30)
	}

	room.Comms = stubComms{clients: 1}
	sb.Update()
	if sb.xgrid != startX || sb.ygrid != startY {
		t.Fatalf("after shrinking back to 1 client: xgrid=%d ygrid=%d, want %d/%d", sb.xgrid, sb.ygrid, startX, startY)
	}
}

func TestSandbox_DoNotChangeArenaSizeBlocksResize(t *testing.T) {
	room := newGamemodeTestRoom(t, 62, "sandbox")
	sb := newSandbox(room)
	bounds := &stubBounds{}
	sb.Bounds = bounds
	sb.DoNotChangeArenaSize = true
	room.Comms = stubComms{clients: 5}
	sb.Update()
	if bounds.w != 0 || bounds.h != 0 {
		t.Error("DoNotChangeArenaSize should suppress the BoundsUpdater call entirely")
	}
}
