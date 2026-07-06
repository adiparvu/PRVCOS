// Safety metrics — industry KPIs (roadmap 18.4). Pure + unit-tested.
//
// Complements the incident-intelligence view with the standard safety-officer
// KPIs that are genuinely derivable from the incident log: days since the last
// incident (the prominent "streak" metric), the 30-day incident count, the
// recordable vs near-miss split, and the high-risk locations by incident
// density. TRIR/LTIR are intentionally omitted — they require hours-worked data
// the platform does not yet capture, and a fabricated rate would mislead.

export interface SafetyIncidentInput {
  type: string // accident | near_miss | hazard | property_damage | environmental | security
  incidentAt: string // ISO
  location: string | null
}

// Types that count as a "recordable" incident (excludes proactive reports).
const NON_RECORDABLE = new Set(["near_miss", "hazard"])
const WINDOW_MS = 30 * 86_400_000

export interface LocationCount {
  location: string
  count: number
}

export interface SafetyMetrics {
  total: number
  incidentsLast30: number
  recordable: number
  nearMiss: number
  // Share of reports that were proactive near-misses; higher is a healthier
  // reporting culture. Null when nothing has been reported.
  nearMissRatioPct: number | null
  daysSinceLastIncident: number | null // null when no recordable incident on record
  byLocation: LocationCount[] // high-risk first
  highRiskLocation: string | null
}

function round1(n: number): number {
  return Math.round(n * 10) / 10
}

/**
 * Compute the safety KPIs as of `nowMs`. "Days since last incident" and the
 * streak consider recordable incidents only; near-misses and hazards are
 * proactive reports and do not reset the streak.
 */
export function computeSafetyMetrics(
  incidents: SafetyIncidentInput[],
  nowMs: number
): SafetyMetrics {
  const total = incidents.length
  let incidentsLast30 = 0
  let recordable = 0
  let nearMiss = 0
  let lastRecordableMs = 0
  const locationCounts = new Map<string, number>()

  for (const inc of incidents) {
    const ts = Date.parse(inc.incidentAt)
    const isRecordable = !NON_RECORDABLE.has(inc.type)

    if (Number.isFinite(ts) && nowMs - ts <= WINDOW_MS && ts <= nowMs) incidentsLast30 += 1
    if (inc.type === "near_miss") nearMiss += 1
    if (isRecordable) {
      recordable += 1
      if (Number.isFinite(ts) && ts > lastRecordableMs) lastRecordableMs = ts
      const loc = inc.location?.trim() ? inc.location.trim() : "Unspecified"
      locationCounts.set(loc, (locationCounts.get(loc) ?? 0) + 1)
    }
  }

  const byLocation: LocationCount[] = [...locationCounts.entries()]
    .map(([location, count]) => ({ location, count }))
    .sort((a, b) => b.count - a.count || a.location.localeCompare(b.location))

  const daysSinceLastIncident =
    lastRecordableMs > 0 ? Math.max(0, Math.floor((nowMs - lastRecordableMs) / 86_400_000)) : null

  const reported = recordable + nearMiss

  return {
    total,
    incidentsLast30,
    recordable,
    nearMiss,
    nearMissRatioPct: reported > 0 ? round1((nearMiss / reported) * 100) : null,
    daysSinceLastIncident,
    byLocation,
    highRiskLocation: byLocation[0]?.location ?? null,
  }
}
