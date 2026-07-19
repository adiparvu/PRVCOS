/**
 * Pure logic for worker clock-in / clock-out (Phase 7.1). The route handles
 * time zones and persistence; these helpers decide the next action, how late a
 * clock-in is, whether the GPS fix is trustworthy, and the resulting status.
 */

export type ClockAction = "clock_in" | "clock_out" | "done"

/** What the next clock press does, given today's record (or none yet). */
export function resolveClockAction(
  record: { clockIn: Date | null; clockOut: Date | null } | null
): ClockAction {
  if (!record || !record.clockIn) return "clock_in"
  if (!record.clockOut) return "clock_out"
  return "done"
}

const toMinutes = (hhmm: string): number => {
  const [h, m] = hhmm.split(":").map(Number)
  return (Number.isFinite(h) ? h! : 0) * 60 + (Number.isFinite(m) ? m! : 0)
}

/** Minutes late = clock-in local time minus scheduled start, floored at zero.
 * Both arguments are local "HH:MM" strings. */
export function lateMinutes(scheduledStartHHMM: string, clockInLocalHHMM: string): number {
  return Math.max(0, toMinutes(clockInLocalHHMM) - toMinutes(scheduledStartHHMM))
}

/** A GPS fix is trusted when a coordinate is present and the reported accuracy
 * is within the threshold (metres). A missing accuracy is accepted. */
export function isGpsVerified(
  lat: number | null,
  lng: number | null,
  accuracyM: number | null,
  thresholdM = 150
): boolean {
  if (lat === null || lng === null) return false
  if (accuracyM === null) return true
  return accuracyM <= thresholdM
}

/** Attendance status set on clock-in, from how late it was. */
export function clockInStatus(lateMin: number): "present" | "late" {
  return lateMin > 0 ? "late" : "present"
}
