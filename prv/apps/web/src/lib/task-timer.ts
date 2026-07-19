// Phase 6.2 — Task time tracking (pure logic).
//
// A time entry has a start and (once stopped) an end; its duration rolls into the
// task's actualHours. One running entry per user at a time — starting another while
// one runs is rejected rather than silently auto-stopped, so time records that may
// feed payroll/billing are never mutated behind the user's back.

// Whole minutes between two instants, never negative. Sub-minute runs round down
// to 0 (a stop immediately after start is not billable time).
export function computeDurationMinutes(startedAt: Date, endedAt: Date): number {
  const ms = endedAt.getTime() - startedAt.getTime()
  if (ms <= 0) return 0
  return Math.floor(ms / 60_000)
}

// Live elapsed minutes for a running entry, for display.
export function elapsedMinutes(startedAt: Date, now: Date): number {
  return computeDurationMinutes(startedAt, now)
}

// Add minutes (as hours) to an existing actualHours decimal string, 2dp.
export function addHoursFromMinutes(actualHours: string | null, minutes: number): string {
  const base = actualHours ? parseFloat(actualHours) : 0
  const safeBase = Number.isFinite(base) ? base : 0
  const total = safeBase + minutes / 60
  return (Math.round(total * 100) / 100).toFixed(2)
}

// Whether a new timer may start: only when the user has no running entry.
export function canStartTimer(hasRunningEntry: boolean): { ok: boolean; reason?: string } {
  if (hasRunningEntry) {
    return { ok: false, reason: "A timer is already running — stop it before starting another" }
  }
  return { ok: true }
}

// Human duration, e.g. 85 → "1h 25m", 40 → "40m", 0 → "0m".
export function formatDuration(minutes: number): string {
  const m = Math.max(0, Math.floor(minutes))
  const h = Math.floor(m / 60)
  const rem = m % 60
  if (h === 0) return `${rem}m`
  if (rem === 0) return `${h}h`
  return `${h}h ${rem}m`
}
