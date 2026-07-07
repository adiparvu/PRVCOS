// Safety training / certification expiry compliance (roadmap 18.3). Pure +
// unit-tested.
//
// Turns the safety training records into an expiry register: per certificate,
// how many days until it lapses and an urgency band (expired / critical /
// warning / notice / valid) matching the roadmap's 60/30/14/7-day alert
// thresholds, plus a company compliance rate. Records without an expiry date
// are treated as non-expiring and always valid.

export type TrainingStatus = "expired" | "critical" | "warning" | "notice" | "valid"

export interface TrainingInput {
  id: string
  userName: string
  trainingName: string
  provider: string | null
  expiresAt: string | null // ISO, null = does not expire
}

export interface TrainingRow {
  id: string
  userName: string
  trainingName: string
  provider: string | null
  expiresAt: string | null
  daysUntilExpiry: number | null // null when non-expiring
  status: TrainingStatus
}

export interface TrainingCompliance {
  total: number
  valid: number
  expiringSoon: number // within 60 days, not yet expired
  expired: number
  complianceRatePct: number | null // (total − expired) / total
  records: TrainingRow[] // urgency first (expired, then soonest to lapse)
}

const CRITICAL_DAYS = 7
const WARNING_DAYS = 30
const NOTICE_DAYS = 60

const STATUS_RANK: Record<TrainingStatus, number> = {
  expired: 0,
  critical: 1,
  warning: 2,
  notice: 3,
  valid: 4,
}

function statusFor(days: number | null): TrainingStatus {
  if (days === null) return "valid"
  if (days < 0) return "expired"
  if (days <= CRITICAL_DAYS) return "critical"
  if (days <= WARNING_DAYS) return "warning"
  if (days <= NOTICE_DAYS) return "notice"
  return "valid"
}

/**
 * Build the training-compliance register as of `nowMs`, urgency-sorted with the
 * most overdue certificate first.
 */
export function computeTrainingCompliance(
  inputs: TrainingInput[],
  nowMs: number
): TrainingCompliance {
  const records: TrainingRow[] = inputs.map((t) => {
    let days: number | null = null
    if (t.expiresAt) {
      const exp = Date.parse(t.expiresAt)
      if (Number.isFinite(exp)) days = Math.floor((exp - nowMs) / 86_400_000)
    }
    return {
      id: t.id,
      userName: t.userName,
      trainingName: t.trainingName,
      provider: t.provider,
      expiresAt: t.expiresAt,
      daysUntilExpiry: days,
      status: statusFor(days),
    }
  })

  records.sort((a, b) => {
    if (STATUS_RANK[a.status] !== STATUS_RANK[b.status])
      return STATUS_RANK[a.status] - STATUS_RANK[b.status]
    const ad = a.daysUntilExpiry ?? Number.POSITIVE_INFINITY
    const bd = b.daysUntilExpiry ?? Number.POSITIVE_INFINITY
    return ad - bd || a.trainingName.localeCompare(b.trainingName)
  })

  const expired = records.filter((r) => r.status === "expired").length
  const expiringSoon = records.filter(
    (r) => r.status === "critical" || r.status === "warning" || r.status === "notice"
  ).length
  const valid = records.filter((r) => r.status === "valid").length
  const total = records.length

  return {
    total,
    valid,
    expiringSoon,
    expired,
    complianceRatePct: total > 0 ? Math.round(((total - expired) / total) * 1000) / 10 : null,
    records,
  }
}
