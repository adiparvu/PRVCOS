// Safety analytics — incident intelligence (roadmap 15.6, Phase 15 safety
// domain). Pure + unit-tested.
//
// Aggregates the safety incident log into headline counts, a severity-weighted
// risk index, a type breakdown, and resolution performance (rate + mean time to
// resolve). The risk index turns a heterogeneous incident mix into one signal a
// CEO can read at a glance; the band flags when open critical/high incidents
// demand attention.

export type IncidentSeverity = "low" | "medium" | "high" | "critical"
export type IncidentStatus = "open" | "under_investigation" | "resolved" | "closed"

export interface SafetyIncidentInput {
  severity: IncidentSeverity
  type: string
  status: IncidentStatus
  injuriesCount: number
  incidentAt: string // ISO
  closedAt: string | null // ISO, when resolved/closed
}

export type RiskBand = "stable" | "elevated" | "critical"

// Relative weight each severity contributes to the risk index.
export const SEVERITY_WEIGHT: Record<IncidentSeverity, number> = {
  low: 1,
  medium: 3,
  high: 7,
  critical: 15,
}

const OPEN_STATUSES: IncidentStatus[] = ["open", "under_investigation"]

export interface TypeBucket {
  type: string
  count: number
}

export interface SafetyAnalytics {
  total: number
  open: number
  injuriesTotal: number
  bySeverity: Record<IncidentSeverity, number>
  byType: TypeBucket[] // sorted by count desc
  riskIndex: number // severity-weighted sum over open incidents
  riskBand: RiskBand
  resolvedCount: number
  resolutionRate: number // 0–100, resolved / total
  mttrDays: number | null // mean days incidentAt → closedAt over resolved
}

function round1(n: number): number {
  return Math.round(n * 10) / 10
}
function safeInt(n: number): number {
  return Number.isFinite(n) ? Math.max(0, Math.floor(n)) : 0
}

function isResolved(status: IncidentStatus): boolean {
  return status === "resolved" || status === "closed"
}

function bandFor(openBySeverity: Record<IncidentSeverity, number>): RiskBand {
  if (openBySeverity.critical > 0) return "critical"
  if (openBySeverity.high > 0) return "elevated"
  return "stable"
}

/**
 * Aggregate a set of safety incidents into headline safety KPIs. The risk index
 * weights only *open* incidents (resolved ones no longer pose active risk).
 */
export function computeSafetyAnalytics(incidents: SafetyIncidentInput[]): SafetyAnalytics {
  const bySeverity: Record<IncidentSeverity, number> = { low: 0, medium: 0, high: 0, critical: 0 }
  const openBySeverity: Record<IncidentSeverity, number> = {
    low: 0,
    medium: 0,
    high: 0,
    critical: 0,
  }
  const typeCounts = new Map<string, number>()

  let injuriesTotal = 0
  let open = 0
  let resolvedCount = 0
  let riskIndex = 0
  let resolveDaysSum = 0
  let resolveDaysCount = 0

  for (const inc of incidents) {
    const sev = inc.severity
    bySeverity[sev] += 1
    injuriesTotal += safeInt(inc.injuriesCount)
    typeCounts.set(inc.type, (typeCounts.get(inc.type) ?? 0) + 1)

    if (OPEN_STATUSES.includes(inc.status)) {
      open += 1
      openBySeverity[sev] += 1
      riskIndex += SEVERITY_WEIGHT[sev]
    }
    if (isResolved(inc.status)) {
      resolvedCount += 1
      if (inc.closedAt) {
        const opened = Date.parse(inc.incidentAt)
        const closed = Date.parse(inc.closedAt)
        if (Number.isFinite(opened) && Number.isFinite(closed) && closed >= opened) {
          resolveDaysSum += (closed - opened) / 86_400_000
          resolveDaysCount += 1
        }
      }
    }
  }

  const total = incidents.length
  const byType: TypeBucket[] = [...typeCounts.entries()]
    .map(([type, count]) => ({ type, count }))
    .sort((a, b) => b.count - a.count || a.type.localeCompare(b.type))

  return {
    total,
    open,
    injuriesTotal,
    bySeverity,
    byType,
    riskIndex,
    riskBand: bandFor(openBySeverity),
    resolvedCount,
    resolutionRate: total > 0 ? round1((resolvedCount / total) * 100) : 0,
    mttrDays: resolveDaysCount > 0 ? round1(resolveDaysSum / resolveDaysCount) : null,
  }
}
