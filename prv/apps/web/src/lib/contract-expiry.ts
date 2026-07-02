// Contract expiry alerts (roadmap 8.1). Pure + unit-tested. Dates are
// YYYY-MM-DD strings; reasoning is UTC.

/** Alert thresholds (days before expiry), tightest last. */
export const CONTRACT_ALERT_THRESHOLDS = [60, 30, 14, 7] as const

export type ContractAlert = "expired" | 7 | 14 | 30 | 60 | null

/** Whole days from `today` to `endDate` (negative once past). */
export function daysUntil(endDate: string, today: string): number {
  const a = new Date(today + "T00:00:00Z").getTime()
  const b = new Date(endDate + "T00:00:00Z").getTime()
  if (Number.isNaN(a) || Number.isNaN(b)) return NaN
  return Math.round((b - a) / 86_400_000)
}

/**
 * The alert level for a contract ending on `endDate`:
 *   "expired" if the end date has passed, otherwise the tightest threshold the
 *   remaining days fall within (7/14/30/60), or null if further out. Contracts
 *   with no end date (permanent) never alert — pass endDate null upstream.
 */
export function contractAlert(endDate: string | null, today: string): ContractAlert {
  if (!endDate) return null
  const days = daysUntil(endDate, today)
  if (Number.isNaN(days)) return null
  if (days < 0) return "expired"
  for (const t of [...CONTRACT_ALERT_THRESHOLDS].sort((a, b) => a - b)) {
    if (days <= t) return t
  }
  return null
}
