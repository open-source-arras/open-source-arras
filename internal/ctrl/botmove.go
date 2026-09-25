package ctrl

// botmove.go carries Config.BOT_MOVE, the scripted patrol routes for bots.

import (
	"encoding/json"
	"errors"
)

type BotMovePath struct {
	Team    int32
	AnyTeam bool

	Range    float64
	HasRange bool

	Movement [][2]float64
}

func (p BotMovePath) Radius() float64 {
	if p.HasRange {
		return p.Range
	}
	return 50
}

// UnmarshalJSON accepts TEAM as number or string.
func (p *BotMovePath) UnmarshalJSON(b []byte) error {
	var raw struct {
		Team     json.RawMessage `json:"TEAM"`
		Range    *float64        `json:"RANGE"`
		Movement [][2]float64    `json:"MOVEMENT"`
	}
	if err := json.Unmarshal(b, &raw); err != nil {
		return err
	}
	*p = BotMovePath{Movement: raw.Movement}
	if raw.Range != nil {
		p.Range, p.HasRange = *raw.Range, true
	}
	if len(raw.Team) == 0 {
		return nil
	}
	var team int32
	if err := json.Unmarshal(raw.Team, &team); err == nil {
		p.Team = team
		return nil
	}
	var name string
	if err := json.Unmarshal(raw.Team, &name); err != nil {
		return errors.New("ctrl: BOT_MOVE TEAM is neither a number nor a string")
	}
	p.AnyTeam = name == "any"
	return nil
}
