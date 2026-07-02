// Holiday + working-day math (roadmap 7.3). Pure + unit-tested. Dates are
// YYYY-MM-DD strings throughout; all reasoning is UTC to avoid TZ drift.

/**
 * The effective date a holiday falls on in `year`. A recurring holiday keeps its
 * month-day; a one-off only applies to its own year (else null).
 */
export function holidayForYear(dateStr: string, isRecurring: boolean, year: number): string | null {
  const [y, m, d] = dateStr.split("-")
  if (isRecurring) return `${year}-${m}-${d}`
  return Number(y) === year ? dateStr : null
}

/** True for Saturday/Sunday. */
export function isWeekend(dateStr: string): boolean {
  const day = new Date(dateStr + "T00:00:00Z").getUTCDay()
  return day === 0 || day === 6
}

/**
 * Working days in the inclusive range [from, to], excluding weekends and any
 * date present in `holidays`. Guardrailed to a sane span.
 */
export function countWorkingDays(
  from: string,
  to: string,
  holidays: Set<string> = new Set()
): number {
  let t = new Date(from + "T00:00:00Z").getTime()
  const end = new Date(to + "T00:00:00Z").getTime()
  if (Number.isNaN(t) || Number.isNaN(end) || end < t) return 0
  let count = 0
  let guard = 0
  while (t <= end && guard++ < 2000) {
    const iso = new Date(t).toISOString().slice(0, 10)
    if (!isWeekend(iso) && !holidays.has(iso)) count += 1
    t += 86_400_000
  }
  return count
}
