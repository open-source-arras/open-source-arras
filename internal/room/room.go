package room

import (
	"fmt"

	"arrasgo/internal/config"
	"arrasgo/internal/defs"
	"arrasgo/internal/entity"
	"arrasgo/internal/jsutil"
	"arrasgo/internal/vmath"
)

const defaultWorldCapacity = 4096

type RoomConfig struct {
	Tuning    *config.Tuning
	Gamemodes []string
	Resolver  *defs.Resolver
	Rand      *jsutil.Rand
	Now       func() int64

	Capacity int

	Definer   Definer
	Attach    ControllerAttacher
	Comms     Comms
	Lifegiver Lifegiver
	Maze      MazeGenerator

	OnSpawn func(id entity.EntityID)

	ForceCheckUsers bool

	OnError func(error)
}

type Room struct {
	World *entity.World

	Tuning config.Tuning

	Mutable RoomMutableConfig
	Flags   GamemodeFlags

	Rand     *jsutil.Rand
	Resolver *defs.Resolver

	Grid     *Grid
	Geometry RoomGeometry
	Pools    *SpawnPools

	Protected *Protected
	Extras    *EntityExtraTable

	Walls            []Wall
	Portals          []*TileInstance
	NexusPortalTiles []*TileInstance
	Permanents       []*PermanentSpawn

	ArenaClosed   bool
	CannotRespawn bool

	TopPlayerID float64

	SpawnPoint    vmath.Vec2
	HasSpawnPoint bool

	Bots                   []entity.EntityID
	Foods                  []entity.EntityID
	NestFoods              []entity.EntityID
	EnemyFoods             []entity.EntityID
	NaturallySpawnedBosses []entity.EntityID

	BossTimer     int
	PendingBosses []*PendingBossSpawn

	Definer   Definer
	Attach    ControllerAttacher
	Comms     Comms
	Lifegiver Lifegiver
	Maze      MazeGenerator

	OnSpawn func(id entity.EntityID)

	OnError func(error)

	ForceCheckUsers bool

	syncedTick int64

	timers   []roomTimer
	timerSeq uint64

	Targetable *TargetableSet

	NextTimerSeq func() uint64

	Gamemodes *GamemodeManager

	PartyHash float64

	Tag *Tag
}

func NewRoom(cfg RoomConfig) (*Room, error) {
	if cfg.Tuning == nil {
		return nil, fmt.Errorf("room: NewRoom requires a Tuning")
	}
	if cfg.Rand == nil {
		return nil, fmt.Errorf("room: NewRoom requires a Rand")
	}
	if cfg.Now == nil {
		return nil, fmt.Errorf("room: NewRoom requires Now (no implicit wall clock -- docs/architecture.md)")
	}

	capacity := cfg.Capacity
	if capacity == 0 {
		capacity = defaultWorldCapacity
	}

	r := &Room{
		Tuning:          *cfg.Tuning,
		Rand:            cfg.Rand,
		Resolver:        cfg.Resolver,
		Pools:           &SpawnPools{},
		Protected:       &Protected{},
		Extras:          NewEntityExtraTable(),
		Targetable:      NewTargetableSet(),
		Definer:         cfg.Definer,
		Attach:          cfg.Attach,
		Comms:           cfg.Comms,
		Lifegiver:       cfg.Lifegiver,
		Maze:            cfg.Maze,
		OnSpawn:         cfg.OnSpawn,
		OnError:         cfg.OnError,
		ForceCheckUsers: cfg.ForceCheckUsers,
	}
	r.World = entity.NewWorld(capacity)
	r.World.Tuning = &r.Tuning
	r.World.Now = cfg.Now

	r.Gamemodes = NewGamemodeManager(r)

	if err := ApplyGamemodes(&r.Tuning, &r.Mutable, &r.Flags, r.Rand, cfg.Gamemodes); err != nil {
		return nil, fmt.Errorf("room: applying gamemode config: %w", err)
	}

	if r.Flags.Tag {
		r.Tag = r.Gamemodes.Tag
	}

	teams, ok := r.Mutable.Teams.Int()
	if !ok {
		teams = 0
	}
	grid, geo, err := BuildGrid(r.Mutable.RoomSetup, teams, r.Mutable.TileWidth, r.Mutable.TileHeight)
	if err != nil {
		return nil, fmt.Errorf("room: building tile grid: %w", err)
	}
	r.Grid = grid
	r.Geometry = geo

	r.World.Room = entity.RoomInfo{Width: geo.Width(), Height: geo.Height()}

	r.PartyHash = float64(int32(r.Rand.Random(1000000))) + 1000000

	if err := r.Grid.InitAll(r.tileContext()); err != nil {
		return nil, fmt.Errorf("room: running tile INIT: %w", err)
	}
	return r, nil
}

func (r *Room) tileContext() *TileContext {
	return &TileContext{
		OnSpawn:          r.OnSpawn,
		World:            r.World,
		Resolver:         r.Resolver,
		Definer:          r.Definer,
		Attach:           r.Attach,
		Comms:            r.Comms,
		Rand:             r.Rand,
		Protected:        r.Protected,
		Tuning:           &r.Tuning,
		Flags:            &r.Flags,
		Geometry:         r.Geometry,
		Pools:            r.Pools,
		Lifegiver:        r.Lifegiver,
		Extras:           r.Extras,
		Walls:            &r.Walls,
		Portals:          &r.Portals,
		NexusPortalTiles: &r.NexusPortalTiles,
		Permanents:       &r.Permanents,
		schedule:         r.schedule,
	}
}

func (r *Room) TickTiles(live []entity.EntityID) error {
	return r.Grid.TickTiles(r.tileContext(), live)
}
