// Shift overlap detection (roadmap 7.2). Pure + unit-tested. Times are "HH:MM"
// 24-hour strings, so lexical comparison is chronological. Same-day shifts only
// (no overnight wrap), matching the schedule model.

/** Two half-open time ranges [aStart,aEnd) and [bStart,bEnd) overlap. */
export function timeRangesOverlap(
  aStart: string,
  aEnd: string,
  bStart: string,
  bEnd: string
): boolean {
  return aStart < bEnd && bStart < aEnd
}

export interface ShiftWindow {
  id: string
  title: string | null
  startTime: string
  endTime: string
}

/**
 * The first of `others` whose time window overlaps [startTime,endTime), or null.
 * Callers pre-filter `others` to the same employee + date.
 */
export function findConflict(
  startTime: string,
  endTime: string,
  others: ShiftWindow[]
): ShiftWindow | null {
  for (const o of others) {
    if (timeRangesOverlap(startTime, endTime, o.startTime, o.endTime)) return o
  }
  return null
}
