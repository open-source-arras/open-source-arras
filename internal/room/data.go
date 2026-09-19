package room

import (
	"embed"
	"encoding/json"
	"fmt"
	"os"
)

//go:embed data/gamemodes.json
var embeddedGamemodes embed.FS

//go:embed data/rooms.json
var embeddedRooms embed.FS

const (
	embeddedGamemodesPath = "data/gamemodes.json"
	embeddedRoomsPath     = "data/rooms.json"
)

type gamemodeDumpFile struct {
	Gamemodes map[string]map[string]json.RawMessage `json:"gamemodes"`
	Count     int                                   `json:"count"`
}

type roomDumpFile struct {
	Tiles              map[string]tileDump   `json:"tiles"`
	Rooms              map[string][][]string `json:"rooms"`
	RoomTdmByTeamCount map[string][][]string `json:"roomTdmByTeamCount"`
	Counts             struct {
		TileCount int `json:"tileCount"`
		RoomCount int `json:"roomCount"`
	} `json:"counts"`
}

type tileDump struct {
	Name              string          `json:"name"`
	Image             *string         `json:"image"`
	Color             json.RawMessage `json:"color"`
	VisibleOnBlackout bool            `json:"visibleOnBlackout"`
	Data              json.RawMessage `json:"data"`
	InitSource        string          `json:"initSource"`
	TickSource        string          `json:"tickSource"`
}

func loadGamemodeDump() (gamemodeDumpFile, error) {
	data, err := embeddedGamemodes.ReadFile(embeddedGamemodesPath)
	if err != nil {
		return gamemodeDumpFile{}, fmt.Errorf("room: reading embedded gamemodes dump: %w", err)
	}
	return decodeGamemodeDump(data)
}

func loadGamemodeDumpPath(path string) (gamemodeDumpFile, error) {
	data, err := os.ReadFile(path)
	if err != nil {
		return gamemodeDumpFile{}, fmt.Errorf("room: reading %s: %w", path, err)
	}
	return decodeGamemodeDump(data)
}

func decodeGamemodeDump(data []byte) (gamemodeDumpFile, error) {
	var file gamemodeDumpFile
	if err := json.Unmarshal(data, &file); err != nil {
		return gamemodeDumpFile{}, fmt.Errorf("room: decoding gamemodes dump: %w", err)
	}
	if file.Count != len(file.Gamemodes) {
		return gamemodeDumpFile{}, fmt.Errorf("room: gamemodes dump says %d entries, found %d", file.Count, len(file.Gamemodes))
	}
	return file, nil
}

func loadRoomDump() (roomDumpFile, error) {
	data, err := embeddedRooms.ReadFile(embeddedRoomsPath)
	if err != nil {
		return roomDumpFile{}, fmt.Errorf("room: reading embedded rooms dump: %w", err)
	}
	return decodeRoomDump(data)
}

func loadRoomDumpPath(path string) (roomDumpFile, error) {
	data, err := os.ReadFile(path)
	if err != nil {
		return roomDumpFile{}, fmt.Errorf("room: reading %s: %w", path, err)
	}
	return decodeRoomDump(data)
}

func decodeRoomDump(data []byte) (roomDumpFile, error) {
	var file roomDumpFile
	if err := json.Unmarshal(data, &file); err != nil {
		return roomDumpFile{}, fmt.Errorf("room: decoding rooms dump: %w", err)
	}
	if file.Counts.TileCount != len(file.Tiles) {
		return roomDumpFile{}, fmt.Errorf("room: rooms dump says %d tiles, found %d", file.Counts.TileCount, len(file.Tiles))
	}
	// RoomCount includes room_tdm.js, which is carried separately in
	// RoomTdmByTeamCount rather than in Rooms See see tools/dump-rooms.js.
	if file.Counts.RoomCount != len(file.Rooms)+1 {
		return roomDumpFile{}, fmt.Errorf("room: rooms dump says %d room files, found %d (+1 for room_tdm)", file.Counts.RoomCount, len(file.Rooms))
	}
	return file, nil
}
