package room

import (
	"testing"

	"arrasgo/internal/config"
	"arrasgo/internal/defs"
	"arrasgo/internal/entity"
	"arrasgo/internal/jsutil"
)

type stubComms struct{ clients int }

func (s stubComms) Broadcast(string)               {}
func (s stubComms) SendTo(entity.EntityID, string) {}
func (s stubComms) ClientCount() int               { return s.clients }
func (s stubComms) BroadcastRoom()                 {}

func newSpawnTestRoom(t *testing.T, seed uint64) (*Room, *int64) {
	t.Helper()
	tuning, err := config.Load("../../gen/config.json")
	if err != nil {
		t.Skipf("gen/config.json unavailable (%v)", err)
	}
	rng := jsutil.NewRand(seed)
	defSet, err := defs.LoadPath("../../gen/definitions.json", rng)
	if err != nil {
		t.Skipf("gen/definitions.json unavailable (%v)", err)
	}
	resolver, err := defs.NewResolver(defSet, rng)
	if err != nil {
		t.Fatalf("NewResolver: %v", err)
	}
	now := int64(1_000_000)
	room, err := NewRoom(RoomConfig{
		Tuning:    &tuning,
		Gamemodes: []string{"tile_testing"},
		Resolver:  resolver,
		Rand:      rng,
		Now:       func() int64 { return now },
		Comms:     stubComms{clients: 1},
	})
	if err != nil {
		t.Fatalf("NewRoom: %v", err)
	}
	return room, &now
}

func TestFoodLoop_SpawnsWithinCaps(t *testing.T) {
	room, _ := newSpawnTestRoom(t, 100)
	for i := 0; i < 500; i++ {
		if err := room.FoodLoop(); err != nil {
			t.Fatalf("FoodLoop iteration %d: %v", i, err)
		}
		maxFoods := room.Tuning.FoodCap - 1 + room.Tuning.FoodGroupCap
		if len(room.Foods) > maxFoods {
			t.Fatalf("iteration %d: len(Foods)=%d exceeds FoodCap=%d + group overshoot (max %d)",
				i, len(room.Foods), room.Tuning.FoodCap, maxFoods)
		}
		maxNest := room.Tuning.FoodCapNest - 1 + room.Tuning.FoodGroupCap
		if len(room.NestFoods) > maxNest {
			t.Fatalf("iteration %d: len(NestFoods)=%d exceeds FoodCapNest=%d + group overshoot (max %d)",
				i, len(room.NestFoods), room.Tuning.FoodCapNest, maxNest)
		}
	}
	if len(room.Foods)+len(room.NestFoods)+len(room.EnemyFoods) == 0 {
		t.Error("500 FoodLoop iterations spawned nothing; expected at least some food given a 1/10 chance per tick")
	}
	for _, id := range room.Foods {
		e := room.World.Get(id)
		if e == nil {
			continue
		}
		if e.Team != TeamEnemies {
			t.Errorf("food %v has team %d, want TeamEnemies", id, e.Team)
		}
		if !room.Extras.Get(id).IsFood {
			t.Errorf("food %v missing IsFood extras flag", id)
		}
	}
}

func TestSpawnBots_BasicShape(t *testing.T) {
	room, _ := newSpawnTestRoom(t, 7)
	loc := room.Pools.RandomPoint(room.Rand, room.Geometry, SpawnPoolDefault)
	id, err := room.SpawnBots(loc, TeamBlue)
	if err != nil {
		t.Fatalf("SpawnBots: %v", err)
	}
	e := room.World.Get(id)
	if e == nil {
		t.Fatal("SpawnBots returned an id that does not resolve")
	}
	if e.Team != TeamBlue {
		t.Errorf("bot team = %d, want TeamBlue", e.Team)
	}
	if e.Name == "" {
		t.Error("bot has no name")
	}
	if !e.Invuln {
		t.Error("a freshly spawned bot should be Invuln immediately after SpawnBots")
	}
	if !room.World.Flag[id.Index].Has(entity.FlagBot) {
		t.Error("FlagBot not set on a spawned bot")
	}
	if len(room.Bots) != 1 || room.Bots[0] != id {
		t.Errorf("Bots = %v, want [%v]", room.Bots, id)
	}
	if room.World.Size[id.Index] == 0 {
		t.Error("bot has zero broad-phase size; finishSpawn should have run")
	}
}

func TestSpawnBots_InvulnClearsAfterDeadline(t *testing.T) {
	room, now := newSpawnTestRoom(t, 8)
	loc := room.Pools.RandomPoint(room.Rand, room.Geometry, SpawnPoolDefault)
	id, err := room.SpawnBots(loc, 0)
	if err != nil {
		t.Fatalf("SpawnBots: %v", err)
	}
	if err := room.RunTimers(float64(*now), ^uint64(0)); err != nil {
		t.Fatalf("RunTimers (before deadline): %v", err)
	}
	if !room.World.Get(id).Invuln {
		t.Fatal("Invuln cleared before its deadline elapsed")
	}
	*now += 20_000 // past the 3000-10000ms window game/index.js:501 draws from
	if err := room.RunTimers(float64(*now), ^uint64(0)); err != nil {
		t.Fatalf("RunTimers (after deadline): %v", err)
	}
	if room.World.Get(id).Invuln {
		t.Error("Invuln did not clear after its deadline elapsed")
	}
	if n := room.PendingTimers(); n != 0 {
		t.Errorf("PendingTimers = %d after the release fired and levelling stopped, want 0", n)
	}
}

func TestMaintainBots_LevelsUpOverTime(t *testing.T) {
	room, now := newSpawnTestRoom(t, 3)
	loc := room.Pools.RandomPoint(room.Rand, room.Geometry, SpawnPoolDefault)
	id, err := room.SpawnBots(loc, 0)
	if err != nil {
		t.Fatalf("SpawnBots: %v", err)
	}
	for i := 0; i < 2000; i++ {
		*now += 100
		if err := room.RunTimers(float64(*now), ^uint64(0)); err != nil {
			t.Fatalf("iteration %d: RunTimers: %v", i, err)
		}
		room.MaintainBots()
		if err := room.TopUpBotsAndUpgrade(); err != nil {
			t.Fatalf("iteration %d: TopUpBotsAndUpgrade: %v", i, err)
		}
	}
	e := room.World.Get(id)
	if e == nil {
		t.Fatal("bot vanished")
	}
	if e.Skill.Level == 0 {
		t.Error("bot never leveled up after 2000 maintain cycles")
	}
	if e.Skill.Level < int32(room.Tuning.BotStartLevel) {
		t.Errorf("bot level %d never reached BotStartLevel %d", e.Skill.Level, room.Tuning.BotStartLevel)
	}
}

func TestTopUpBotsAndUpgrade_RespectsCapAndArenaClosed(t *testing.T) {
	room, _ := newSpawnTestRoom(t, 9)
	room.Tuning.BotCap = 2
	for i := 0; i < 200; i++ {
		if err := room.TopUpBotsAndUpgrade(); err != nil {
			t.Fatalf("iteration %d: %v", i, err)
		}
	}
	if len(room.Bots) > 2 {
		t.Errorf("len(Bots) = %d, exceeds BotCap=2", len(room.Bots))
	}
	if len(room.Bots) == 0 {
		t.Error("no bots were topped up despite an open arena and BotCap=2")
	}

	before := len(room.Bots)
	room.ArenaClosed = true
	for i := 0; i < 50; i++ {
		if err := room.TopUpBotsAndUpgrade(); err != nil {
			t.Fatalf("iteration %d (arena closed): %v", i, err)
		}
	}
	if len(room.Bots) < before {
		t.Errorf("bot count dropped from %d to %d while closed (TopUp should not remove bots)", before, len(room.Bots))
	}
	// No direct way to prove no NEW bot spawned other than the cap already
	// being met above. Re-run once more with room for growth to confirm the
	// gate, not just the cap, is what's holding the count.
	room.Tuning.BotCap = 100
	for i := 0; i < 50; i++ {
		if err := room.TopUpBotsAndUpgrade(); err != nil {
			t.Fatalf("iteration %d (arena closed, cap raised): %v", i, err)
		}
	}
	if len(room.Bots) != before {
		t.Errorf("bot count changed from %d to %d while ArenaClosed with room under the (raised) cap; ArenaClosed should block top-up", before, len(room.Bots))
	}
}

func TestMaintainBosses_AnnouncesThenSpawnsAfterDelay(t *testing.T) {
	room, _ := newSpawnTestRoom(t, 11)
	if len(room.Tuning.BossTypes) == 0 {
		t.Skip("gen/config.json's boss_types is empty; nothing to pin")
	}
	room.Tuning.EnableBosses = true
	room.Tuning.BossSpawnCooldown = 0

	var pending bool
	for i := 0; i < 5 && !pending; i++ {
		if err := room.MaintainBosses(); err != nil {
			t.Fatalf("iteration %d: %v", i, err)
		}
		pending = len(room.PendingBosses) > 0
	}
	if !pending {
		t.Fatal("no boss wave was scheduled after several MaintainBosses calls with cooldown=0")
	}
	if len(room.NaturallySpawnedBosses) != 0 {
		t.Error("bosses spawned immediately; expected the announce/spawn delay to still be pending")
	}
	want := int64(room.Tuning.BossSpawnDelay) * 30
	if got := room.PendingBosses[0].AtTick - room.syncedTick; got != want {
		t.Errorf("wave scheduled %d ticks out, want %d", got, want)
	}
	deadline := room.PendingBosses[0].AtTick
	for room.syncedTick < deadline {
		if err := room.SyncedDelays(); err != nil {
			t.Fatalf("SyncedDelays at tick %d: %v", room.syncedTick, err)
		}
		if len(room.NaturallySpawnedBosses) != 0 {
			t.Fatalf("the wave landed at tick %d, %d ticks early", room.syncedTick-1, deadline-(room.syncedTick-1))
		}
	}
	if err := room.SyncedDelays(); err != nil {
		t.Fatalf("SyncedDelays on the deadline: %v", err)
	}
	if len(room.PendingBosses) != 0 {
		t.Error("the wave is still pending after its own tick was emitted")
	}
	if len(room.NaturallySpawnedBosses) == 0 {
		t.Fatal("no bosses were actually spawned once the deadline elapsed")
	}
	for _, id := range room.NaturallySpawnedBosses {
		e := room.World.Get(id)
		if e == nil {
			t.Errorf("boss %v does not resolve", id)
			continue
		}
		if !room.Extras.Get(id).IsBoss {
			t.Errorf("boss %v missing IsBoss extras flag", id)
		}
		if e.Team != TeamEnemies {
			t.Errorf("boss %v team = %d, want TeamEnemies", id, e.Team)
		}
	}
}

func TestPermanentSpawn_RespawnsOnDeathAndNotOnDestroy(t *testing.T) {
	room, _ := newSpawnTestRoom(t, 13)
	if len(room.Permanents) == 0 {
		t.Skip("room_tiles_test has no wall tiles in this dump; nothing to respawn")
	}
	room.OnError = func(err error) { t.Errorf("respawning a permanent: %v", err) }

	slot := room.Permanents[0]
	oldID := slot.Live
	if !oldID.Valid() {
		t.Fatal("PermanentSpawn slot has no live entity right after room construction")
	}
	room.World.Kill(oldID)
	room.OnEntityDeath(oldID)

	if slot.Live == oldID {
		t.Error("slot.Live unchanged after its entity died")
	}
	if !room.World.Alive(slot.Live) {
		t.Error("slot.Live does not point at a live entity after the death respawn")
	}
	destroyed := slot.Live
	room.World.Destroy(destroyed)
	if slot.Live != destroyed {
		t.Error("a destroyed permanent was respawned; destroy() fires no death event")
	}
}

func TestListify(t *testing.T) {
	cases := []struct {
		names []string
		want  string
	}{
		{nil, ""},
		{[]string{"A"}, "A"},
		{[]string{"A", "B"}, "A and B"},
		{[]string{"A", "B", "C"}, "A, B and C"},
	}
	for _, c := range cases {
		if got := listify(c.names); got != c.want {
			t.Errorf("listify(%v) = %q, want %q", c.names, got, c.want)
		}
	}
}
