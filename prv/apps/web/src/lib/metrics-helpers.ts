// Pure aggregation helpers shared by the intelligence + schedule API routes.
// Kept free of DB / request concerns so the math is unit-testable in isolation.

export interface DonutDatum {
  label: string
  value: number
}

export type AvailabilityCell = "yes" | "maybe" | "no"

const DAY_MS = 86_400_000

// Linear forecast tail: continue the last point by the recent growth rate
// (clamped to [-20%, +30%]), producing [lastActual, projectedNext] so a chart
// can draw a short forecast leg. Empty input → empty tail.
export function forecastTail(actual: number[]): number[] {
  if (actual.length === 0) return []
  const last = actual.at(-1) ?? 0
  const prev = actual.at(-2) ?? last
  let growth = prev > 0 ? (last - prev) / prev : 0.08
  growth = Math.max(-0.2, Math.min(0.3, growth))
  return [last, Math.round(last * (1 + growth))]
}

// Month-over-month trend descriptor: a labelled arrow, a direction, and a
// progress-bar percentage centred on 50 (clamped to [8, 95]).
export function trendOf(
  cur: number,
  prev: number
): { trend: string; dir: "up" | "down" | "flat"; pct: number } {
  const growth = prev > 0 ? ((cur - prev) / prev) * 100 : cur > 0 ? 100 : 0
  const dir: "up" | "down" | "flat" = growth > 1 ? "up" : growth < -1 ? "down" : "flat"
  const arrow = dir === "up" ? "▲" : dir === "down" ? "▼" : "→"
  return {
    trend: `${arrow} ${Math.abs(Math.round(growth * 10) / 10)}%`,
    dir,
    pct: Math.max(8, Math.min(95, Math.round(50 + growth))),
  }
}

// Compact euro formatter: €1.2M / €482K / €640.
export function eurK(n: number): string {
  if (n >= 1_000_000) return `€${(n / 1_000_000).toFixed(1)}M`
  if (n >= 1000) return `€${Math.round(n / 1000)}K`
  return `€${Math.round(n)}`
}

// Revenue breakdown: keep the top `top` stores by revenue, fold the remainder
// into a single "Other" slice. Null store names become "Unassigned"; zero /
// negative rows are dropped.
export function buildDonut(
  rows: { storeName: string | null; revenue: number | string | null }[],
  top = 4
): DonutDatum[] {
  const storeRev = rows
    .map((r) => ({ label: r.storeName ?? "Unassigned", value: Math.round(Number(r.revenue ?? 0)) }))
    .filter((d) => d.value > 0)
    .sort((a, b) => b.value - a.value)
  const restValue = storeRev.slice(top).reduce((acc, d) => acc + d.value, 0)
  return restValue > 0
    ? [...storeRev.slice(0, top), { label: "Other", value: restValue }]
    : storeRev
}

// The seven ISO dates (YYYY-MM-DD) of the week starting on `monday`.
export function weekDates(monday: string): string[] {
  const base = new Date(monday + "T12:00:00Z")
  return Array.from({ length: 7 }, (_, i) => {
    const d = new Date(base.getTime() + i * DAY_MS)
    return d.toISOString().slice(0, 10)
  })
}

// One availability cell from real signals: "no" on an approved-leave day, "yes"
// on a day the member holds a shift, "maybe" otherwise.
export function availabilityCell(
  date: string,
  onLeave: { start: string; end: string }[],
  shiftDates: Set<string>
): AvailabilityCell {
  const isOff = onLeave.some((pd) => pd.start <= date && date <= pd.end)
  return isOff ? "no" : shiftDates.has(date) ? "yes" : "maybe"
}
