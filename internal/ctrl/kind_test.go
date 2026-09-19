package ctrl

import "testing"

func TestKindString(t *testing.T) {
	cases := []struct {
		k    Kind
		want string
	}{
		{KindNone, "none"},
		{KindWhirlwind, "whirlwind"},
		{KindOroboros, "oroboros"},
		{Kind(255), "unknown"}, // out of range
	}
	for _, c := range cases {
		if got := c.k.String(); got != c.want {
			t.Errorf("Kind(%d).String() = %q, want %q", c.k, got, c.want)
		}
	}
}

func TestKindByName(t *testing.T) {
	k, ok := KindByName("whirlwind")
	if !ok || k != KindWhirlwind {
		t.Errorf("KindByName(whirlwind) = (%v,%v), want (KindWhirlwind,true)", k, ok)
	}

	for kind := Kind(1); kind < kindCount; kind++ {
		name := kind.String()
		got, ok := KindByName(name)
		if !ok || got != kind {
			t.Errorf("KindByName(%q) = (%v,%v), want (%v,true)", name, got, ok, kind)
		}
	}

	if _, ok := KindByName("thisIsNotARealController"); ok {
		t.Error(`KindByName("thisIsNotARealController") = ok, want not found`)
	}
	if _, ok := KindByName("none"); ok {
		t.Error(`KindByName("none") = ok, want not found (not a registered ioTypes key)`)
	}
}

func TestAcceptsFromTop(t *testing.T) {
	falseKinds := []Kind{KindDoNothing, KindMoveInCircles, KindListenToPlayer, KindHangOutNearMaster}
	for _, k := range falseKinds {
		if k.AcceptsFromTop() {
			t.Errorf("%v.AcceptsFromTop() = true, want false", k)
		}
	}

	trueKinds := []Kind{KindSiegeAI, KindAlwaysFire, KindStackGuns, KindWhirlwind, KindOroboros}
	for _, k := range trueKinds {
		if !k.AcceptsFromTop() {
			t.Errorf("%v.AcceptsFromTop() = false, want true", k)
		}
	}
}
