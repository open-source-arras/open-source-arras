package jsutil

// SortRandomComparator shuffles arr using V8's sort algorithm with random comparator.
func (r *Rand) SortRandomComparator[T any](arr []T) {
	n := len(arr)
	if n < 2 {
		return
	}

	negative := func() bool { return 0.5-r.next() < 0 }

	runLength := 1
	if n >= 2 {
		runLength = 2
		isDescending := negative()
		for idx := 2; idx < n; idx++ {
			order := negative()
			if isDescending {
				if !order {
					break
				}
			} else if order {
				break
			}
			runLength++
		}
		if isDescending {
			for i, j := 0, runLength-1; i < j; i, j = i+1, j-1 {
				arr[i], arr[j] = arr[j], arr[i]
			}
		}
	}

	for start := runLength; start < n; start++ {
		left, right := 0, start
		pivot := arr[right]
		for left < right {
			mid := left + (right-left)>>1
			if negative() {
				right = mid
			} else {
				left = mid + 1
			}
		}
		for p := start; p > left; p-- {
			arr[p] = arr[p-1]
		}
		arr[left] = pivot
	}
}
