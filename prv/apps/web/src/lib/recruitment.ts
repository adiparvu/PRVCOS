// Recruitment funnel math (roadmap 8.3). Pure + unit-tested.

export const PIPELINE_STAGES = [
  "sourcing",
  "screening",
  "phone_screen",
  "interview",
  "assessment",
  "offer",
  "hired",
] as const

export type PipelineStage = (typeof PIPELINE_STAGES)[number] | "rejected"

export interface Funnel {
  byStage: Record<string, number>
  total: number
  active: number // in pipeline, not hired/rejected
  hired: number
  rejected: number
  /** hired / (hired + rejected), 0–100, or null when none concluded. */
  hireRate: number | null
}

export function computeFunnel(stages: string[]): Funnel {
  const byStage: Record<string, number> = {}
  let hired = 0
  let rejected = 0
  for (const s of stages) {
    byStage[s] = (byStage[s] ?? 0) + 1
    if (s === "hired") hired += 1
    else if (s === "rejected") rejected += 1
  }
  const total = stages.length
  const concluded = hired + rejected
  return {
    byStage,
    total,
    active: total - concluded,
    hired,
    rejected,
    hireRate: concluded > 0 ? Math.round((hired / concluded) * 100) : null,
  }
}
