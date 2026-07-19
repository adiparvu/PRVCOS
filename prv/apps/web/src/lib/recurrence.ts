/**
 * Pure recurrence expansion for recurring shifts (Phase 7.2). Given a start
 * date and a frequency, produce the list of occurrence dates up to an inclusive
 * `until` date (capped, to bound generation). All dates are "YYYY-MM-DD" and
 * handled in UTC so no time zone shifts the day.
 */

export type RecurrenceFreq = "daily" | "weekly" | "biweekly" | "monthly"

const DAY_MS = 86_400_000

function parseISO(d: string): Date {
  const [y, m, day] = d.split("-").map(Number)
  return new Date(Date.UTC(y ?? 1970, (m ?? 1) - 1, day ?? 1))
}

function toISO(d: Date): string {
  return d.toISOString().slice(0, 10)
}

function addMonths(d: Date, n: number): Date {
  const day = d.getUTCDate()
  const first = new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth() + n, 1))
  // Clamp to the last day of the target month (e.g. Jan 31 → Feb 28/29).
  const lastDay = new Date(
    Date.UTC(first.getUTCFullYear(), first.getUTCMonth() + 1, 0)
  ).getUTCDate()
  first.setUTCDate(Math.min(day, lastDay))
  return first
}

// The nth occurrence, always computed from the original start so monthly series
// anchor to the start's day-of-month (Jan 31 → Feb 28 → Mar 31) instead of
// drifting off a clamped date.
function nthOccurrence(start: Date, freq: RecurrenceFreq, n: number): Date {
  if (freq === "monthly") return addMonths(start, n)
  const stepDays = freq === "daily" ? 1 : freq === "weekly" ? 7 : 14
  return new Date(start.getTime() + n * stepDays * DAY_MS)
}

/** Maximum occurrences generated in one series (safety cap). */
export const MAX_OCCURRENCES = 60

/**
 * Occurrence dates from `startISO` (inclusive) through `untilISO` (inclusive)
 * at the given frequency, capped at `maxCount`. Always includes the start; an
 * `until` before the start yields just the start date.
 */
export function expandRecurrence(
  startISO: string,
  freq: RecurrenceFreq,
  untilISO: string,
  maxCount: number = MAX_OCCURRENCES
): string[] {
  const cap = Math.max(1, Math.min(maxCount, MAX_OCCURRENCES))
  const start = parseISO(startISO)
  const until = parseISO(untilISO)
  const dates: string[] = [startISO]

  for (let n = 1; dates.length < cap; n++) {
    const next = nthOccurrence(start, freq, n)
    if (next.getTime() > until.getTime()) break
    dates.push(toISO(next))
  }
  return dates
}
