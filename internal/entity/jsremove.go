package entity

// JSRemoveID reproduces the JS bug: swap-removes if found, else just shortens.
// See docs/found-bugs.md #62.
func JSRemoveID(list []EntityID, id EntityID) []EntityID {
	if len(list) == 0 {
		return list
	}
	idx := -1
	for i, x := range list {
		if x == id {
			idx = i
			break
		}
	}
	if idx == len(list)-1 {
		return list[:len(list)-1]
	}
	last := list[len(list)-1]
	list = list[:len(list)-1]
	if idx >= 0 && idx < len(list) {
		list[idx] = last
	}
	return list
}
