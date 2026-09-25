package trace

import (
	"bufio"
	"encoding/json"
	"fmt"
	"math"
	"os"
	"strconv"
	"strings"
)

// Num encodes non-finite numbers as tagged strings.
type Num struct {
	V    float64
	Null bool
}

func (n *Num) UnmarshalJSON(b []byte) error {
	s := string(b)
	if s == "null" {
		*n = Num{V: math.NaN(), Null: true}
		return nil
	}
	if len(s) > 0 && s[0] == '"' {
		var str string
		if err := json.Unmarshal(b, &str); err != nil {
			return err
		}
		switch str {
		case "NaN":
			*n = Num{V: math.NaN()}
		case "Infinity":
			*n = Num{V: math.Inf(1)}
		case "-Infinity":
			*n = Num{V: math.Inf(-1)}
		default:
			return fmt.Errorf("unrecognised numeric encoding %q", str)
		}
		return nil
	}
	var f float64
	if err := json.Unmarshal(b, &f); err != nil {
		return err
	}
	*n = Num{V: f}
	return nil
}

func (n Num) String() string {
	switch {
	case n.Null:
		return "null"
	case math.IsNaN(n.V):
		return "NaN"
	case math.IsInf(n.V, 1):
		return "Infinity"
	case math.IsInf(n.V, -1):
		return "-Infinity"
	}
	return strconv.FormatFloat(n.V, 'g', 17, 64)
}

// Equal treats two NaNs as agreement.
func (n Num) Equal(o Num, tol float64) bool {
	if n.Null != o.Null {
		return false
	}
	if n.Null {
		return true
	}
	if n.V == o.V { // also settles +Inf/+Inf and -Inf/-Inf
		return true
	}
	if math.IsNaN(n.V) || math.IsNaN(o.V) {
		return math.IsNaN(n.V) && math.IsNaN(o.V)
	}
	if tol == 0 {
		return false
	}
	return math.Abs(n.V-o.V) <= tol
}

// Tick is one line of a trace.
type Tick struct {
	Tick         int              `json:"tick"`
	Time         Num              `json:"time"`
	RngCalls     int              `json:"rngCalls"`
	NextEntityID int              `json:"nextEntityId"`
	Count        int              `json:"count"`
	Entities     []EntitySnapshot `json:"entities"`
}

// EntitySnapshot is one entity within a tick.
type EntitySnapshot struct {
	ID        int     `json:"id"`
	Index     *string `json:"index"`
	Type      *string `json:"type"`
	Label     *string `json:"label"`
	Team      Num     `json:"team"`
	X         Num     `json:"x"`
	Y         Num     `json:"y"`
	VX        Num     `json:"vx"`
	VY        Num     `json:"vy"`
	Size      Num     `json:"size"`
	Facing    Num     `json:"facing"`
	Health    Num     `json:"health"`
	HealthMax Num     `json:"healthMax"`
	Shield    Num     `json:"shield"`
	ShieldMax Num     `json:"shieldMax"`
	Alpha     Num     `json:"alpha"`
	Master    *int    `json:"master"`
	Dead      *bool   `json:"dead"`
}

// Load reads a whole trace into memory.
func Load(path string) ([]Tick, error) {
	f, err := os.Open(path)
	if err != nil {
		return nil, err
	}
	defer f.Close()

	var out []Tick
	sc := bufio.NewScanner(f)
	// Large tick lines need a bigger buffer to avoid truncation.
	sc.Buffer(make([]byte, 0, 1<<20), 64<<20)
	line := 0
	for sc.Scan() {
		line++
		text := strings.TrimSpace(sc.Text())
		if text == "" {
			continue
		}
		var t Tick
		if err := json.Unmarshal([]byte(text), &t); err != nil {
			return nil, fmt.Errorf("line %d: %w", line, err)
		}
		out = append(out, t)
	}
	return out, sc.Err()
}
