// memcheck reports the retained heap cost of the loaded definition table.
package main

import (
	"fmt"
	"runtime"

	"arrasgo/internal/defs"
	"arrasgo/internal/jsutil"
)

func heapMB() float64 {
	// Two collections: the first frees the garbage, the second sweeps what the
	// first made unreachable via finalisers.
	runtime.GC()
	runtime.GC()
	var m runtime.MemStats
	runtime.ReadMemStats(&m)
	return float64(m.HeapAlloc) / (1 << 20)
}

func main() {
	base := heapMB()
	fmt.Printf("baseline heap                 %7.1f MB\n", base)

	rng := jsutil.NewRand(1)
	set, err := defs.Load(rng)
	if err != nil {
		fmt.Println("load failed:", err)
		return
	}

	loaded := heapMB()
	fmt.Printf("after loading definitions     %7.1f MB  (+%.1f retained)\n", loaded, loaded-base)
	fmt.Printf("definitions                   %7d\n", set.Len())

	res, err := defs.NewResolver(set, rng)
	if err != nil {
		fmt.Println("resolver failed:", err)
		return
	}
	var lastErr error
	n := 0
	for _, name := range set.Names() {
		if _, err := res.Resolve(name); err != nil {
			lastErr = err
			continue
		}
		n++
	}
	resolved := heapMB()
	fmt.Printf("after resolving all %-9d %7.1f MB  (+%.1f over loaded)\n", n, resolved, resolved-loaded)
	if lastErr != nil {
		fmt.Println("last resolve error:", lastErr)
	}

	runtime.KeepAlive(set)
	runtime.KeepAlive(res)

	fmt.Println()
	fmt.Println("The table is immutable after load, so it is shared by every room in the")
	fmt.Println("process rather than paid per room. Per-room cost is the entity slab only.")
}
