// Customer health score (roadmap 10.2). Pure + unit-tested.
//
// A 0–100 score blending three signals — value, engagement and recency — into a
// single band the CRM can surface to flag VIPs and at-risk / dormant accounts.

export type HealthBand = "vip" | "healthy" | "at_risk" | "dormant"

export interface HealthSignals {
  ltv: number // lifetime value from paid invoices
  activeProjects: number
  openQuotes: number
  recentActivityCount: number // logged activities in the trailing window
  daysSinceLastTouch: number | null // days since the most recent activity (or null = never)
}

export interface HealthScore {
  score: number // 0–100
  band: HealthBand
  value: number // 0–45 component
  engagement: number // 0–35 component
  recency: number // 0–20 component
}

// LTV at/above this earns the full value component (also the VIP LTV threshold).
const VALUE_CEILING = 30_000

function clamp(n: number, lo: number, hi: number): number {
  return Math.max(lo, Math.min(hi, n))
}

function recencyPoints(daysSinceLastTouch: number | null): number {
  if (daysSinceLastTouch === null) return 0
  const d = daysSinceLastTouch
  if (d <= 7) return 20
  if (d <= 30) return 14
  if (d <= 90) return 8
  if (d <= 180) return 3
  return 0
}

export function bandFor(score: number): HealthBand {
  if (score >= 75) return "vip"
  if (score >= 50) return "healthy"
  if (score >= 25) return "at_risk"
  return "dormant"
}

export function computeHealthScore(s: HealthSignals): HealthScore {
  const value = clamp((Math.max(0, s.ltv) / VALUE_CEILING) * 45, 0, 45)
  const engagement = clamp(
    Math.max(0, s.activeProjects) * 10 +
      Math.max(0, s.openQuotes) * 5 +
      Math.max(0, s.recentActivityCount) * 3,
    0,
    35
  )
  const recency = recencyPoints(s.daysSinceLastTouch)

  const score = Math.round(value + engagement + recency)
  return {
    score,
    band: bandFor(score),
    value: Math.round(value),
    engagement: Math.round(engagement),
    recency,
  }
}

export const HEALTH_BAND_LABEL: Record<HealthBand, string> = {
  vip: "VIP",
  healthy: "Healthy",
  at_risk: "At risk",
  dormant: "Dormant",
}
