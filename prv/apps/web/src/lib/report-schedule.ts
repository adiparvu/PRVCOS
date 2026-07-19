// Phase 15.4 — Scheduled report delivery (pure scheduling logic).
//
// A schedule stores a frequency and an absolute `nextRunAt`. An hourly sweep
// delivers every due schedule, then advances `nextRunAt` to the next future
// occurrence. All arithmetic is UTC-based so it is deterministic and testable;
// callers pass `now` explicitly rather than reading the clock here.

export type ReportFrequency = "daily" | "weekly" | "monthly"

export const REPORT_FREQUENCIES: ReportFrequency[] = ["daily", "weekly", "monthly"]

export function isReportFrequency(v: string): v is ReportFrequency {
  return (REPORT_FREQUENCIES as string[]).includes(v)
}

// The first delivery: the next occurrence of `sendHourUtc` — today if that hour
// has not yet passed, otherwise tomorrow. Cadence only kicks in after run #1.
export function computeInitialRun(now: Date, sendHourUtc: number): Date {
  const hour = clampHour(sendHourUtc)
  const candidate = new Date(
    Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate(), hour, 0, 0, 0)
  )
  if (candidate.getTime() > now.getTime()) return candidate
  return new Date(candidate.getTime() + 86_400_000)
}

// Advance a timestamp by exactly one period, preserving time-of-day. Monthly
// clamps to the last day of a shorter month (e.g. Jan 31 → Feb 28).
export function advanceOnce(from: Date, frequency: ReportFrequency): Date {
  if (frequency === "daily") return new Date(from.getTime() + 86_400_000)
  if (frequency === "weekly") return new Date(from.getTime() + 7 * 86_400_000)
  // monthly
  const y = from.getUTCFullYear()
  const m = from.getUTCMonth()
  const d = from.getUTCDate()
  const targetMonthLastDay = new Date(Date.UTC(y, m + 2, 0)).getUTCDate()
  const day = Math.min(d, targetMonthLastDay)
  return new Date(
    Date.UTC(
      y,
      m + 1,
      day,
      from.getUTCHours(),
      from.getUTCMinutes(),
      from.getUTCSeconds(),
      from.getUTCMilliseconds()
    )
  )
}

// The next run strictly after `now`, advancing from `from` by whole periods.
// Advancing until future (rather than by a single period) means a schedule that
// missed several cycles while the worker was down catches up with ONE send, not
// one per missed cycle.
export function computeNextRun(from: Date, frequency: ReportFrequency, now: Date): Date {
  let next = advanceOnce(from, frequency)
  let guard = 0
  while (next.getTime() <= now.getTime() && guard < 1000) {
    next = advanceOnce(next, frequency)
    guard++
  }
  return next
}

// A schedule is due when it is enabled and its next run is at or before now.
export function isDue(schedule: { enabled: boolean; nextRunAt: Date }, now: Date): boolean {
  return schedule.enabled && schedule.nextRunAt.getTime() <= now.getTime()
}

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

// Split raw recipient input (comma/newline/semicolon separated) into a deduped
// set of valid addresses plus the rejected tokens, so the UI can flag typos.
export function parseRecipients(raw: string): { valid: string[]; invalid: string[] } {
  const tokens = raw
    .split(/[\s,;]+/)
    .map((t) => t.trim())
    .filter(Boolean)
  const valid: string[] = []
  const invalid: string[] = []
  const seen = new Set<string>()
  for (const token of tokens) {
    const lower = token.toLowerCase()
    if (!EMAIL_RE.test(token)) {
      invalid.push(token)
      continue
    }
    if (seen.has(lower)) continue
    seen.add(lower)
    valid.push(token)
  }
  return { valid, invalid }
}

function clampHour(h: number): number {
  if (!Number.isFinite(h)) return 7
  return Math.min(23, Math.max(0, Math.floor(h)))
}

export function frequencyLabel(freq: ReportFrequency): string {
  if (freq === "daily") return "Zilnic"
  if (freq === "weekly") return "Săptămânal"
  return "Lunar"
}
