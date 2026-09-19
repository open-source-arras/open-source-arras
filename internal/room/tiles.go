package room

import (
	"encoding/json"
	"fmt"
	"math"
	"strconv"

	"arrasgo/internal/config"
	"arrasgo/internal/defs"
	"arrasgo/internal/entity"
	"arrasgo/internal/jsutil"
	"arrasgo/internal/vmath"
)

// TileType is the static, shared shape for a named tile.
type TileType struct {
	Key               string
	DisplayName       string
	Image             string
	HasImage          bool
	BaseColor         string // COLOR as authored; a palette name, or "" if unset
	VisibleOnBlackout bool

	Init TileHook
	Tick TileHook
}

// TileHook is one tile's INIT or TICK closure.
type TileHook func(t *TileInstance, ctx *TileContext) error

// TileContext bundles everything a tile hook can reach.
type TileContext struct {
	World            *entity.World
	Resolver         *defs.Resolver
	Definer          Definer
	Attach           ControllerAttacher
	Comms            Comms
	Rand             *jsutil.Rand
	Protected        *Protected
	Tuning           *config.Tuning
	Flags            *GamemodeFlags
	Geometry         RoomGeometry
	Pools            *SpawnPools
	Lifegiver        Lifegiver
	OnSpawn          func(id entity.EntityID)
	Extras           *EntityExtraTable
	Walls            *[]Wall
	Portals          *[]*TileInstance
	NexusPortalTiles *[]*TileInstance
	Permanents       *[]*PermanentSpawn
	schedule         func(at int64, kind timerKind, id entity.EntityID)
}

// TileInstance is one grid cell's live state.
type TileInstance struct {
	GridX, GridY int
	Type         *TileType
	Color        string
	IsSanctuary  bool
	HasPortal    bool
	entities     []entity.EntityID
}

func newTileInstance(gx, gy int, t *TileType) *TileInstance {
	return &TileInstance{GridX: gx, GridY: gy, Type: t, Color: t.BaseColor}
}

func (t *TileInstance) Loc(geo RoomGeometry) vmath.Vec2 {
	return vmath.Vec2{
		X: float64(geo.TileWidth*(float64(t.GridX)+0.5) - geo.Width()/2),
		Y: float64(geo.TileHeight*(float64(t.GridY)+0.5) - geo.Height()/2),
	}
}

func (t *TileInstance) RandomInside(rng *jsutil.Rand, geo RoomGeometry) vmath.Vec2 {
	return vmath.Vec2{
		X: float64(geo.TileWidth*(float64(t.GridX)+rng.Random(1)) - geo.Width()/2),
		Y: float64(geo.TileHeight*(float64(t.GridY)+rng.Random(1)) - geo.Height()/2),
	}
}

func (t *TileInstance) Entities() []entity.EntityID { return t.entities }

// RoomGeometry holds tile grid dimensions.
type RoomGeometry struct {
	XGrid, YGrid          int
	TileWidth, TileHeight float64
}

func (g RoomGeometry) Width() float64  { return float64(g.XGrid) * g.TileWidth }
func (g RoomGeometry) Height() float64 { return float64(g.YGrid) * g.TileHeight }

func (g RoomGeometry) IsInRoom(pos vmath.Vec2) bool {
	w, h := g.Width(), g.Height()
	x, y := float64(pos.X), float64(pos.Y)
	return x >= -w/2 && x <= w/2 && y >= -h/2 && y <= h/2
}

// Grid is the resolved, per-room tile layout (row-major).
type Grid struct {
	Cells [][]*TileInstance
}

func (g *Grid) Height() int { return len(g.Cells) }
func (g *Grid) Width() int {
	if len(g.Cells) == 0 {
		return 0
	}
	return len(g.Cells[0])
}

// GetAt reproduces the JS bug. See docs/found-bugs.md.
func (g *Grid) GetAt(geo RoomGeometry, pos vmath.Vec2) (*TileInstance, bool) {
	if !geo.IsInRoom(pos) {
		return nil, false
	}
	row := int(math.Floor((float64(pos.Y) + geo.Height()/2) / geo.TileWidth))
	col := int(math.Floor((float64(pos.X) + geo.Width()/2) / geo.TileHeight))
	if row < 0 || row >= len(g.Cells) {
		return nil, false
	}
	rowCells := g.Cells[row]
	if col < 0 || col >= len(rowCells) {
		return nil, false
	}
	if rowCells[col] == nil {
		return nil, false
	}
	return rowCells[col], true
}

func (g *Grid) TickTiles(ctx *TileContext, live []entity.EntityID) error {
	for _, id := range live {
		e := ctx.World.Get(id)
		if e == nil || e.Godmode || e.Bond.Valid() || e.ImmuneToTiles {
			continue
		}
		if tile, ok := g.GetAt(ctx.Geometry, ctx.World.Pos[id.Index]); ok {
			tile.entities = append(tile.entities, id)
		}
	}
	for _, row := range g.Cells {
		for _, tile := range row {
			if tile == nil {
				continue
			}
			if tile.Type.Tick != nil {
				if err := tile.Type.Tick(tile, ctx); err != nil {
					return err
				}
			}
			tile.entities = tile.entities[:0]
		}
	}
	return nil
}

func (g *Grid) InitAll(ctx *TileContext) error {
	for _, row := range g.Cells {
		for _, tile := range row {
			if tile != nil && tile.Type.Init != nil {
				if err := tile.Type.Init(tile, ctx); err != nil {
					return err
				}
			}
		}
	}
	return nil
}

func BuildGrid(names []string, teamsForRoomTdm int, tileWidth, tileHeight float64) (*Grid, RoomGeometry, error) {
	return buildGridFromDump(roomDump, names, teamsForRoomTdm, tileWidth, tileHeight)
}

func BuildGridFromPath(dumpPath string, names []string, teamsForRoomTdm int, tileWidth, tileHeight float64) (*Grid, RoomGeometry, error) {
	dump, err := loadRoomDumpPath(dumpPath)
	if err != nil {
		return nil, RoomGeometry{}, err
	}
	return buildGridFromDump(dump, names, teamsForRoomTdm, tileWidth, tileHeight)
}

func buildGridFromDump(dump roomDumpFile, names []string, teamsForRoomTdm int, tileWidth, tileHeight float64) (*Grid, RoomGeometry, error) {
	var imported [][]string
	for _, name := range names {
		var current [][]string
		if name == "room_tdm" {
			g, err := roomTdmGrid(dump, teamsForRoomTdm)
			if err != nil {
				return nil, RoomGeometry{}, err
			}
			current = g
		} else {
			g, ok := dump.Rooms[name]
			if !ok {
				return nil, RoomGeometry{}, fmt.Errorf("room: room_setup module %q not found in rooms dump", name)
			}
			current = g
		}
		if len(current) == 0 {
			continue
		}
		h := len(current)
		w := len(current[0])
		for len(imported) < h {
			imported = append(imported, nil)
		}
		for y := 0; y < h; y++ {
			if imported[y] == nil {
				imported[y] = append([]string(nil), current[y]...)
				continue
			}
			for x := 0; x < w && x < len(current[y]); x++ {
				if current[y][x] == "" {
					continue
				}
				for len(imported[y]) <= x {
					imported[y] = append(imported[y], "")
				}
				imported[y][x] = current[y][x]
			}
		}
	}
	if len(imported) == 0 || len(imported[0]) == 0 {
		return nil, RoomGeometry{}, fmt.Errorf("room: room_setup produced an empty grid (names=%v)", names)
	}

	geo := RoomGeometry{XGrid: len(imported[0]), YGrid: len(imported), TileWidth: tileWidth, TileHeight: tileHeight}

	cells := make([][]*TileInstance, geo.YGrid)
	for y := 0; y < geo.YGrid; y++ {
		cells[y] = make([]*TileInstance, geo.XGrid)
		for x := 0; x < geo.XGrid; x++ {
			if x >= len(imported[y]) {
				continue
			}
			key := imported[y][x]
			if key == "" {
				continue
			}
			tt, ok := TileTypeByName(key)
			if !ok {
				return nil, RoomGeometry{}, fmt.Errorf("room: grid cell (%d,%d) references unknown tile %q", x, y, key)
			}
			cells[y][x] = newTileInstance(x, y, tt)
		}
	}
	return &Grid{Cells: cells}, geo, nil
}

func roomTdmGrid(dump roomDumpFile, teams int) ([][]string, error) {
	g, ok := dump.RoomTdmByTeamCount[strconv.Itoa(teams)]
	if !ok {
		return nil, fmt.Errorf("room: no room_tdm grid dumped for teams=%d (have 1-8)", teams)
	}
	return g, nil
}

// SpawnPools holds spawn location lists.
type SpawnPools struct {
	Default []*TileInstance
	ByKey   map[string][]*TileInstance
}

func (p *SpawnPools) RegisterDefault(t *TileInstance) { p.Default = append(p.Default, t) }

func (p *SpawnPools) Register(key string, t *TileInstance) {
	if p.ByKey == nil {
		p.ByKey = make(map[string][]*TileInstance)
	}
	p.ByKey[key] = append(p.ByKey[key], t)
}

func (p *SpawnPools) Unregister(key string, t *TileInstance) {
	pool := p.ByKey[key]
	for i, existing := range pool {
		if existing == t {
			pool[i] = pool[len(pool)-1]
			p.ByKey[key] = pool[:len(pool)-1]
			return
		}
	}
}

func (p *SpawnPools) Area(key string) []*TileInstance {
	if key == SpawnPoolDefault {
		return p.Default
	}
	if pool, ok := p.ByKey[key]; ok && len(pool) > 0 {
		return pool
	}
	return p.Default
}

func (p *SpawnPools) RandomPoint(rng *jsutil.Rand, geo RoomGeometry, key string) vmath.Vec2 {
	pool := p.Area(key)
	tile := rng.Choose(pool)
	return tile.RandomInside(rng, geo)
}

var tileTypes map[string]*TileType
var roomDump roomDumpFile

func init() {
	dump, err := loadRoomDump()
	if err != nil {
		panic(fmt.Sprintf("room: loading embedded rooms dump: %v", err))
	}
	roomDump = dump
	tileTypes = make(map[string]*TileType, len(dump.Tiles))
	for key, td := range dump.Tiles {
		t := &TileType{Key: key, DisplayName: td.Name, VisibleOnBlackout: td.VisibleOnBlackout}
		if td.Image != nil {
			t.Image, t.HasImage = *td.Image, true
		}
		if len(td.Color) > 0 && string(td.Color) != "null" {
			var s string
			if err := json.Unmarshal(td.Color, &s); err == nil {
				t.BaseColor = s
			}
		}
		tileTypes[key] = t
	}
	registerTileBehaviors(tileTypes)
}

func TileTypeByName(name string) (*TileType, bool) {
	t, ok := tileTypes[name]
	return t, ok
}
