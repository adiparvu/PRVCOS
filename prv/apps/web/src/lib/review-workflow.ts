// Review workflow (roadmap 8.4). Pure + unit-tested. The self → manager → HR →
// sign-off progression and cycle-level progress.

export const REVIEW_STAGES = ["self_review", "manager_review", "hr_review", "signed_off"] as const
export type ReviewStage = (typeof REVIEW_STAGES)[number]

export const STAGE_LABEL: Record<ReviewStage, string> = {
  self_review: "Self review",
  manager_review: "Manager review",
  hr_review: "HR review",
  signed_off: "Signed off",
}

export function stageIndex(stage: string): number {
  const i = (REVIEW_STAGES as readonly string[]).indexOf(stage)
  return i < 0 ? 0 : i
}

export function nextStage(stage: string): ReviewStage | null {
  const i = stageIndex(stage)
  return i >= REVIEW_STAGES.length - 1 ? null : REVIEW_STAGES[i + 1]!
}

/** 0–100 progress for a single review's stage (signed_off = 100). */
export function stageProgress(stage: string): number {
  return Math.round((stageIndex(stage) / (REVIEW_STAGES.length - 1)) * 100)
}

export interface CycleProgress {
  total: number
  signedOff: number
  byStage: Record<string, number>
  /** Average completion across the cycle's reviews, 0–100. */
  percent: number
}

export function cycleProgress(stages: string[]): CycleProgress {
  const byStage: Record<string, number> = {}
  let signedOff = 0
  let sum = 0
  for (const s of stages) {
    byStage[s] = (byStage[s] ?? 0) + 1
    if (s === "signed_off") signedOff += 1
    sum += stageProgress(s)
  }
  return {
    total: stages.length,
    signedOff,
    byStage,
    percent: stages.length ? Math.round(sum / stages.length) : 0,
  }
}
