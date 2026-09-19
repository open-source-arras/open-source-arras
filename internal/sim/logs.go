package sim

import "time"

const profiling = false

type logger struct {
	logTimes      []int64
	trackingStart int64
	tallyCount    int64
}

func (l *logger) set() {
	if !profiling {
		return
	}
	l.trackingStart = time.Now().UnixNano()
}

func (l *logger) mark() {
	if !profiling {
		return
	}
	l.logTimes = append(l.logTimes, time.Now().UnixNano()-l.trackingStart)
}

func (l *logger) tally() {
	if !profiling {
		return
	}
	l.tallyCount++
}

func (l *logger) record() (sum, average int64) {
	for _, t := range l.logTimes {
		sum += t
	}
	if n := int64(len(l.logTimes)); n > 0 {
		average = sum / n
	}
	l.logTimes = l.logTimes[:0]
	return sum, average
}

type loggers struct {
	loops      logger
	master     logger
	entities   logger
	physics    logger
	life       logger
	selfie     logger
	collide    logger
	activation logger
}
