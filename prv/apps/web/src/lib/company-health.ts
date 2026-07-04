// Company Health Score — composite index (roadmap 15.6). Pure + unit-tested.
//
// Blends bounded per-domain sub-scores (each 0–100) from the latest daily KPI
// snapshot into a single company health index. Every sub-score is a ratio that
// is naturally bounded, so no external baselines are needed.

export interface HealthSnapshot {
  revenueMonth: number
  grossProfit: number
  overdueAmount: number
  totalTasks: number
  doneTasks: number
  headcount: number
  presentToday: number
  pipelineValue: number
  activeLeads: number
}

export type HealthBand = "excellent" | "healthy" | "watch" | "at_risk"

export interface DomainScore {
  key: "finance" | "projects" | "people" | "sales"
  label: string
  score: number // 0–100
  detail: string
}

export interface CompanyHealth {
  composite: number // 0–100
  band: HealthBand
  domains: DomainScore[]
}

const clamp = (n: number) => Math.max(0, Math.min(100, n))
const round = (n: number) => Math.round(n)
const safeNum = (n: unknown) => {
  const v = Number(n ?? 0)
  return Number.isFinite(v) ? v : 0
}

export function bandFor(score: number): HealthBand {
  if (score >= 80) return "excellent"
  if (score >= 60) return "healthy"
  if (score >= 40) return "watch"
  return "at_risk"
}

/**
 * Finance score = margin health blended with AR (overdue) health.
 * margin = grossProfit / revenue; arHealth = 1 − overdue / revenue.
 */
function financeScore(s: HealthSnapshot): DomainScore {
  const rev = Math.max(0, s.revenueMonth)
  const margin = rev > 0 ? clamp((Math.max(0, s.grossProfit) / rev) * 100) : 0
  const arHealth = rev > 0 ? clamp(100 - (Math.max(0, s.overdueAmount) / rev) * 100) : 100
  const score = clamp(margin * 0.6 + arHealth * 0.4)
  return {
    key: "finance",
    label: "Finance",
    score: round(score),
    detail: `${round(margin)}% margin · ${round(arHealth)}% AR health`,
  }
}

/** Projects score = task completion rate. */
function projectsScore(s: HealthSnapshot): DomainScore {
  const total = Math.max(0, s.totalTasks)
  const score = total > 0 ? clamp((Math.max(0, s.doneTasks) / total) * 100) : 0
  return {
    key: "projects",
    label: "Projects",
    score: round(score),
    detail: `${s.doneTasks}/${s.totalTasks} tasks done`,
  }
}

/** People score = attendance rate (present / headcount). */
function peopleScore(s: HealthSnapshot): DomainScore {
  const hc = Math.max(0, s.headcount)
  const score = hc > 0 ? clamp((Math.max(0, s.presentToday) / hc) * 100) : 0
  return {
    key: "people",
    label: "People",
    score: round(score),
    detail: `${s.presentToday}/${s.headcount} present`,
  }
}

/**
 * Sales score = pipeline coverage vs. ~a quarter of monthly revenue, blended
 * with lead activity presence. Full marks at 3× monthly revenue of pipeline.
 */
function salesScore(s: HealthSnapshot): DomainScore {
  const rev = Math.max(0, s.revenueMonth)
  const coverageTarget = rev * 3
  const coverage =
    coverageTarget > 0
      ? clamp((Math.max(0, s.pipelineValue) / coverageTarget) * 100)
      : Math.max(0, s.pipelineValue) > 0
        ? 100
        : 0
  const activity = clamp(Math.min(100, Math.max(0, s.activeLeads) * 5)) // 20 leads → full
  const score = clamp(coverage * 0.7 + activity * 0.3)
  return {
    key: "sales",
    label: "Sales",
    score: round(score),
    detail: `${round(coverage)}% coverage · ${s.activeLeads} leads`,
  }
}

/** Compute the composite company health from a snapshot. */
export function computeCompanyHealth(raw: Partial<HealthSnapshot>): CompanyHealth {
  const s: HealthSnapshot = {
    revenueMonth: safeNum(raw.revenueMonth),
    grossProfit: safeNum(raw.grossProfit),
    overdueAmount: safeNum(raw.overdueAmount),
    totalTasks: safeNum(raw.totalTasks),
    doneTasks: safeNum(raw.doneTasks),
    headcount: safeNum(raw.headcount),
    presentToday: safeNum(raw.presentToday),
    pipelineValue: safeNum(raw.pipelineValue),
    activeLeads: safeNum(raw.activeLeads),
  }
  const domains = [financeScore(s), projectsScore(s), peopleScore(s), salesScore(s)]
  const composite = round(domains.reduce((sum, d) => sum + d.score, 0) / domains.length)
  return { composite, band: bandFor(composite), domains }
}
