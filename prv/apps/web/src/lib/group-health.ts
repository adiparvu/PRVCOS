// Group company-health breakdown — Command Center (roadmap 16.2). Pure +
// unit-tested.
//
// Turns the per-company composite health scores (latest vs previous daily
// snapshot) into a CEO-level breakdown across a company group: each company's
// current score, its movement, an executive band, and the group average.

export type HealthBand = "excellent" | "good" | "attention" | "critical"

export interface CompanyHealthInput {
  companyId: string
  name: string
  latestScore: number | null // most recent composite health, null when no snapshot
  previousScore: number | null // prior snapshot, for the movement delta
}

export type HealthTrend = "up" | "down" | "flat"

export interface CompanyHealthRow {
  companyId: string
  name: string
  score: number | null
  delta: number // latest − previous, 0 when no comparison
  trend: HealthTrend
  band: HealthBand | null // null when the company has no health data yet
}

export interface GroupHealth {
  companies: CompanyHealthRow[] // worst score first; no-data companies last
  averageScore: number | null // mean of companies that have a score
  band: HealthBand | null
  reporting: number // companies with a score
  total: number
}

// Phase 16.2 thresholds.
export function bandForScore(score: number): HealthBand {
  if (score >= 90) return "excellent"
  if (score >= 70) return "good"
  if (score >= 50) return "attention"
  return "critical"
}

function trendOf(delta: number): HealthTrend {
  if (delta > 0) return "up"
  if (delta < 0) return "down"
  return "flat"
}

function clampScore(n: number | null): number | null {
  if (n === null || !Number.isFinite(n)) return null
  return Math.max(0, Math.min(100, Math.round(n)))
}

/**
 * Build the per-company health breakdown for a group, sorted worst-first with
 * no-data companies last, plus the group average over reporting companies.
 */
export function buildGroupHealth(inputs: CompanyHealthInput[]): GroupHealth {
  const companies: CompanyHealthRow[] = inputs.map((c) => {
    const score = clampScore(c.latestScore)
    const prev = clampScore(c.previousScore)
    const delta = score !== null && prev !== null ? score - prev : 0
    return {
      companyId: c.companyId,
      name: c.name,
      score,
      delta,
      trend: trendOf(delta),
      band: score !== null ? bandForScore(score) : null,
    }
  })

  companies.sort((a, b) => {
    if (a.score === null && b.score === null) return a.name.localeCompare(b.name)
    if (a.score === null) return 1
    if (b.score === null) return -1
    return a.score - b.score || a.name.localeCompare(b.name)
  })

  const scored = companies.filter((c) => c.score !== null) as (CompanyHealthRow & {
    score: number
  })[]
  const averageScore =
    scored.length > 0 ? Math.round(scored.reduce((s, c) => s + c.score, 0) / scored.length) : null

  return {
    companies,
    averageScore,
    band: averageScore !== null ? bandForScore(averageScore) : null,
    reporting: scored.length,
    total: companies.length,
  }
}
