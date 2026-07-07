// Fleet readiness — Fleet Management analytics (roadmap Phase 21). Pure +
// unit-tested.
//
// Turns the vehicle fleet into an operational readiness view: each vehicle is
// ready, needs attention, or is grounded, based on service intervals (mileage
// vs the next-service odometer), insurance/ITP expiry, maintenance status, and
// fuel level. Produces a readiness rate plus a reasoned attention list so a
// fleet manager sees exactly what to action.

export type VehicleState = "ready" | "attention" | "grounded"

export interface VehicleInput {
  id: string
  label: string // e.g. "Ford Transit · B-123-ABC"
  status: string // active | maintenance | retired | sold
  mileageKm: number
  nextServiceAtKm: number | null
  fuelLevelPct: number | null
  insuranceExpiresAt: string | null // ISO
  itpExpiresAt: string | null // ISO (technical inspection)
}

export interface VehicleRow {
  id: string
  label: string
  state: VehicleState
  reasons: string[]
}

export interface FleetReadiness {
  total: number
  ready: number
  attention: number
  grounded: number
  serviceDue: number // vehicles overdue or due soon for service
  complianceIssues: number // insurance/ITP expired or expiring
  readinessRatePct: number | null // ready / total
  attentionList: VehicleRow[] // grounded first, then attention; worst first
}

const SERVICE_SOON_KM = 1000 // within this many km of the service odometer
const EXPIRY_SOON_DAYS = 30
const LOW_FUEL_PCT = 20

const STATE_RANK: Record<VehicleState, number> = { grounded: 0, attention: 1, ready: 2 }

function daysUntil(iso: string | null, nowMs: number): number | null {
  if (!iso) return null
  const t = Date.parse(iso)
  if (!Number.isFinite(t)) return null
  return Math.floor((t - nowMs) / 86_400_000)
}

/** Assess fleet readiness as of `nowMs`. */
export function computeFleetReadiness(vehicles: VehicleInput[], nowMs: number): FleetReadiness {
  let serviceDue = 0
  let complianceIssues = 0

  const rows: VehicleRow[] = vehicles.map((v) => {
    const reasons: string[] = []
    let grounded = false
    let hasService = false
    let hasCompliance = false

    if (v.status === "maintenance") {
      reasons.push("In maintenance")
      grounded = true
    }

    // Service interval.
    if (v.nextServiceAtKm !== null && Number.isFinite(v.nextServiceAtKm)) {
      if (v.mileageKm >= v.nextServiceAtKm) {
        reasons.push("Service overdue")
        hasService = true
      } else if (v.nextServiceAtKm - v.mileageKm <= SERVICE_SOON_KM) {
        reasons.push(`Service in ${v.nextServiceAtKm - v.mileageKm} km`)
        hasService = true
      }
    }

    // Insurance + ITP compliance.
    for (const [label, iso] of [
      ["Insurance", v.insuranceExpiresAt],
      ["ITP", v.itpExpiresAt],
    ] as const) {
      const d = daysUntil(iso, nowMs)
      if (d === null) continue
      if (d < 0) {
        reasons.push(`${label} expired`)
        hasCompliance = true
        grounded = true
      } else if (d <= EXPIRY_SOON_DAYS) {
        reasons.push(`${label} expires in ${d}d`)
        hasCompliance = true
      }
    }

    // Fuel.
    if (
      v.fuelLevelPct !== null &&
      Number.isFinite(v.fuelLevelPct) &&
      v.fuelLevelPct < LOW_FUEL_PCT
    ) {
      reasons.push("Low fuel")
    }

    if (hasService) serviceDue += 1
    if (hasCompliance) complianceIssues += 1

    const state: VehicleState = grounded ? "grounded" : reasons.length > 0 ? "attention" : "ready"
    return { id: v.id, label: v.label, state, reasons }
  })

  const total = rows.length
  const ready = rows.filter((r) => r.state === "ready").length
  const attention = rows.filter((r) => r.state === "attention").length
  const grounded = rows.filter((r) => r.state === "grounded").length

  const attentionList = rows
    .filter((r) => r.state !== "ready")
    .sort(
      (a, b) =>
        STATE_RANK[a.state] - STATE_RANK[b.state] ||
        b.reasons.length - a.reasons.length ||
        a.label.localeCompare(b.label)
    )

  return {
    total,
    ready,
    attention,
    grounded,
    serviceDue,
    complianceIssues,
    readinessRatePct: total > 0 ? Math.round((ready / total) * 1000) / 10 : null,
    attentionList,
  }
}
