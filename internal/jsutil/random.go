package jsutil

import (
	"math"
	"runtime"

	"arrasgo/internal/jsmath"

	"arrasgo/internal/vmath"
)

type Rand struct {
	src   *Mulberry32
	calls uint64
	sites func(pcs []uintptr)
}

func NewRand(seed uint64) *Rand {
	return &Rand{src: NewMulberry32(uint32(seed))}
}

func (r *Rand) Calls() uint64 { return r.calls }

func (r *Rand) WatchDraws(f func(pcs []uintptr)) { r.sites = f }

func (r *Rand) next() float64 {
	r.calls++
	if r.sites != nil {
		var pcs [16]uintptr
		n := runtime.Callers(2, pcs[:])
		r.sites(pcs[:n])
	}
	return r.src.Float64()
}

func (r *Rand) Random(x float64) float64 { return x * r.next() }

func (r *Rand) RandomAngle() float64 { return math.Pi * 2 * r.next() }

func (r *Rand) RandomRange(min, max float64) float64 { return r.next()*(max-min) + min }

func (r *Rand) Irandom(i float64) int {
	max := math.Floor(i)
	return int(math.Floor(r.next() * (max + 1)))
}

func (r *Rand) IrandomRange(min, max float64) int {
	lo := math.Ceil(min)
	hi := math.Floor(max)
	return int(math.Floor(r.next()*(hi-lo+1)) + lo)
}

func (r *Rand) PointInUnitCircle() vmath.Vec2 {
	angle := r.RandomAngle()
	distance := math.Sqrt(r.next())
	return vmath.Vec2{
		X: jsmath.Cos(angle) * distance,
		Y: jsmath.Sin(angle) * distance,
	}
}

func (r *Rand) Gauss(mean, stdev float64) float64 {
	u := 1 - r.next()
	v := r.next()
	z := math.Sqrt(-2.0*jsmath.Log(u)) * jsmath.Cos(2.0*math.Pi*v)
	return z*stdev + mean
}

func (r *Rand) GaussInverse(min, max, clustering float64) float64 {
	span := max - min
	output := r.Gauss(0, span/clustering)
	for output < 0 {
		output += span
	}
	for output > span {
		output -= span
	}
	return output + min
}

func (r *Rand) GaussRing(radius, clustering float64) vmath.Vec2 {
	angle := r.Random(math.Pi * 2)
	d := r.Gauss(radius, radius*clustering)
	return vmath.Vec2{
		X: d * jsmath.Cos(angle),
		Y: d * jsmath.Sin(angle),
	}
}

func (r *Rand) Chance(prob float64) bool { return r.Random(1) < prob }

func (r *Rand) Dice(sides float64) bool { return r.Random(sides) < 1 }

func (r *Rand) Choose[T any](arr []T) T { return arr[r.Irandom(float64(len(arr)-1))] }

func (r *Rand) ChooseN[T any](arr []T, num int) []T {
	result := make([]T, 0, num)
	extended := make([]T, 0, num)
	for len(extended) < num {
		extended = append(extended, r.Shuffle(arr)...)
	}
	for i := 0; i < num; i++ {
		result = append(result, extended[i])
	}
	return result
}

// Shuffle reproduces the JS bias. See docs/found-bugs.md.
func (r *Rand) Shuffle[T any](arr []T) []T {
	out := append([]T(nil), arr...) // copy: JS does `arr = arr.slice()` (random.js:74)
	for i := len(out) - 1; i > 0; i-- {
		j := int(math.Floor(r.next() * float64(i)))
		out[j], out[i] = out[i], out[j]
	}
	return out
}

func (r *Rand) ChooseChance(args ...float64) int {
	var total float64
	for _, v := range args {
		total += v
	}
	answer := r.Random(total)
	for i, v := range args {
		if answer < v {
			return i
		}
		answer -= v
	}
	return -1
}

var NameLists = map[string][]string{
	"bots": {
		"Alice", "Bob", "Carmen", "David", "Edith", "Freddy", "Gustav", "Helga", "Janet", "Lorenzo",
		"Mary", "Nora", "Olivia", "Peter", "Queen", "Roger", "Suzanne", "Tommy", "Ursula", "Vincent",
		"Wilhelm", "Xerxes", "Yvonne", "Zachary", "Alpha", "Bravo", "Charlie", "Delta", "Echo", "Foxtrot",
		"Hotel", "India", "Juliet", "Kilo", "Lima", "Mike", "November", "Oscar", "Papa", "Quebec",
		"Romeo", "Sierra", "Tango", "Uniform", "Victor", "Whiskey", "X-Ray", "Yankee", "Zulu",
	},
	"a": {
		"Archimedes", "Akilina", "Anastasios", "Athena", "Alkaios", "Amyntas", "Aniketos", "Artemis",
		"Anaxagoras", "Apollon",
	},
	"castle": {
		"Berezhany", "Lutsk", "Dobromyl", "Akkerman", "Palanok", "Zolochiv", "Palanok", "Mangup",
		"Olseko", "Brody", "Isiaslav", "Kaffa", "Bilhorod",
	},
	"legion": {"Vesta", "Juno", "Orcus", "Janus", "Minerva", "Ceres"},
}

func (r *Rand) ChooseBotName() string { return r.Choose(NameLists["bots"]) }

func (r *Rand) ChooseBossName(code string, amount int) []string {
	if list, ok := NameLists[code]; ok {
		return r.ChooseN(list, amount)
	}
	return []string{}
}
