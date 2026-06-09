/** Pure formatting utilities shared across workspace components. */

/** Format a number as a compact Euro string: €1.5M, €24k, €850 */
export function fmtEuro(n: number): string {
  if (n >= 1_000_000) return `€${(n / 1_000_000).toFixed(1)}M`
  if (n >= 1_000) return `€${Math.round(n / 1000)}k`
  return `€${n.toLocaleString()}`
}

/** Format an ISO date string as a short locale date: "Jun 28" */
export function fmtShortDate(dateStr: string): string {
  if (!dateStr) return "—"
  try {
    return new Date(dateStr).toLocaleDateString("en-US", { month: "short", day: "numeric" })
  } catch {
    return dateStr
  }
}

/** Format minutes as a human-readable duration: "2h 30m" or "45m" */
export function fmtMins(mins: number | null | undefined): string | undefined {
  if (!mins) return undefined
  const h = Math.floor(mins / 60)
  const m = mins % 60
  return h > 0 ? `${h}h ${m}m` : `${m}m`
}

/** Format a date string as a relative label: "5 min ago", "3 hr ago", "Yesterday", "N days ago" */
export function fmtDateRelative(dateStr: string, now: Date = new Date()): string {
  try {
    const d = new Date(dateStr)
    const diffMs = now.getTime() - d.getTime()
    const diffMins = Math.floor(diffMs / 60000)
    const diffHours = Math.floor(diffMs / 3600000)
    const diffDays = Math.floor(diffMs / 86400000)
    if (diffMins < 60) return `${diffMins} min ago`
    if (diffHours < 24) return `${diffHours} hr ago`
    if (diffDays === 1) return "Yesterday"
    return `${diffDays} days ago`
  } catch {
    return dateStr
  }
}
