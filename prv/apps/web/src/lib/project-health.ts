// Project health score (roadmap 6.1).
//
// A 0–100 composite blending three dimensions — budget, schedule/progress and
// risk — into a single figure with a healthy/at_risk/critical band. Pure and
// unit-tested so the API and any dashboard agree.

export type HealthBand = "healthy" | "at_risk" | "critical"
export type BudgetBand = "green" | "amber" | "red" | null

export interface HealthInput {
  /** Budget band from spend-vs-plan (null when no budget is set). */
  budgetBand: BudgetBand
  /** Fraction of tasks done, 0..1. */
  taskCompletion: number
  /** Total tasks (0 → progress is treated as neutral, not zero). */
  totalTasks: number
  /** Elapsed schedule fraction, 0..1. */
  scheduleFraction: number
  openCriticalRisks: number
  openHighRisks: number
}

export interface HealthResult {
  score: number
  band: HealthBand
  breakdown: { budget: number; progress: number; risk: number }
}

function clamp(n: number, lo = 0, hi = 100): number {
  if (Number.isNaN(n)) return lo
  return Math.max(lo, Math.min(hi, n))
}

const NEUTRAL = 75

export function computeHealth(input: HealthInput): HealthResult {
  const budget =
    input.budgetBand === "green"
      ? 100
      : input.budgetBand === "amber"
        ? 65
        : input.budgetBand === "red"
          ? 30
          : NEUTRAL // no budget set → neutral, don't punish

  // Progress: penalize being behind schedule (schedule elapsed > work done).
  const progress =
    input.totalTasks > 0
      ? clamp(100 - Math.max(0, input.scheduleFraction - input.taskCompletion) * 140)
      : NEUTRAL

  // Risk: each open critical costs 30, each open high 12.
  const risk = clamp(100 - input.openCriticalRisks * 30 - input.openHighRisks * 12)

  const score = Math.round(0.35 * budget + 0.35 * progress + 0.3 * risk)
  const band: HealthBand = score >= 75 ? "healthy" : score >= 50 ? "at_risk" : "critical"

  return {
    score,
    band,
    breakdown: {
      budget: Math.round(budget),
      progress: Math.round(progress),
      risk: Math.round(risk),
    },
  }
}
