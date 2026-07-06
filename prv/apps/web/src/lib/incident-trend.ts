// Incident month-over-month trend — safety analytics (roadmap 18.4). Pure +
// unit-tested.
//
// Buckets recordable incidents into calendar months over a trailing window so
// the safety dashboard can show whether the incident rate is climbing or
// falling. Near-misses and hazards are proactive reports and are excluded, to
// match the "recordable incident" definition used elsewhere.

export interface IncidentTrendInput {
  type: string
  incidentAt: string // ISO
}

export interface MonthBucket {
  month: string // YYYY-MM
  label: string // e.g. "Jul"
  count: number
}

export interface IncidentTrend {
  months: MonthBucket[] // oldest → newest
  momChangePct: number | null // last month vs previous month
}

const NON_RECORDABLE = new Set(["near_miss", "hazard"])
const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"]

function round1(n: number): number {
  return Math.round(n * 10) / 10
}

/**
 * Bucket recordable incidents into `monthsBack` calendar months ending at the
 * month containing `nowMs`, oldest → newest, with the month-over-month change
 * between the last two months.
 */
export function computeIncidentTrend(
  incidents: IncidentTrendInput[],
  nowMs: number,
  monthsBack = 6
): IncidentTrend {
  const span = Math.max(1, Math.floor(monthsBack))
  const now = new Date(nowMs)
  const baseYear = now.getUTCFullYear()
  const baseMonth = now.getUTCMonth() // 0-11

  const months: MonthBucket[] = []
  const indexByKey = new Map<string, number>()
  for (let i = span - 1; i >= 0; i--) {
    const d = new Date(Date.UTC(baseYear, baseMonth - i, 1))
    const y = d.getUTCFullYear()
    const m = d.getUTCMonth()
    const key = `${y}-${String(m + 1).padStart(2, "0")}`
    indexByKey.set(key, months.length)
    months.push({ month: key, label: MONTHS[m]!, count: 0 })
  }

  for (const inc of incidents) {
    if (NON_RECORDABLE.has(inc.type)) continue
    const ts = Date.parse(inc.incidentAt)
    if (!Number.isFinite(ts)) continue
    const d = new Date(ts)
    const key = `${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, "0")}`
    const idx = indexByKey.get(key)
    if (idx !== undefined) months[idx]!.count += 1
  }

  let momChangePct: number | null = null
  if (months.length >= 2) {
    const prev = months[months.length - 2]!.count
    const curr = months[months.length - 1]!.count
    if (prev > 0) momChangePct = round1(((curr - prev) / prev) * 100)
  }

  return { months, momChangePct }
}
