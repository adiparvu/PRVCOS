/**
 * Pure layout maths for the project timeline / Gantt view (Phase 6). Items are
 * positioned along a horizontal date window; dragging converts a horizontal
 * position back to a date. All dates are "YYYY-MM-DD", handled in UTC.
 */

const DAY_MS = 86_400_000

function parseISO(d: string): Date {
  const [y, m, day] = d.split("-").map(Number)
  return new Date(Date.UTC(y ?? 1970, (m ?? 1) - 1, day ?? 1))
}
const toISO = (d: Date): string => d.toISOString().slice(0, 10)
const clamp = (n: number, lo: number, hi: number): number => Math.min(hi, Math.max(lo, n))

/** A padded [start, end] window covering the given dates. A single distinct
 * date gets ±15 days of context; multiple dates get ±3 days of padding. */
export function timelineWindow(dates: string[]): { startISO: string; endISO: string } {
  const ms = dates.map((d) => parseISO(d).getTime()).filter((n) => Number.isFinite(n))
  if (ms.length === 0) {
    return { startISO: "1970-01-01", endISO: "1970-01-31" }
  }
  let min = Math.min(...ms)
  let max = Math.max(...ms)
  if (min === max) {
    min -= 15 * DAY_MS
    max += 15 * DAY_MS
  } else {
    min -= 3 * DAY_MS
    max += 3 * DAY_MS
  }
  return { startISO: toISO(new Date(min)), endISO: toISO(new Date(max)) }
}

/** Position of a date within the window as a percentage (0–100, clamped). */
export function datePct(iso: string, startISO: string, endISO: string): number {
  const start = parseISO(startISO).getTime()
  const end = parseISO(endISO).getTime()
  if (end <= start) return 0
  return clamp(((parseISO(iso).getTime() - start) / (end - start)) * 100, 0, 100)
}

/** Inverse of datePct: the date at a given percentage across the window,
 * rounded to the nearest day. */
export function pctToISO(pct: number, startISO: string, endISO: string): string {
  const start = parseISO(startISO).getTime()
  const end = parseISO(endISO).getTime()
  const at = start + (clamp(pct, 0, 100) / 100) * (end - start)
  return toISO(new Date(Math.round(at / DAY_MS) * DAY_MS))
}
