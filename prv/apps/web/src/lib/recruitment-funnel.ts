// Recruitment funnel — HR analytics (roadmap Phase 8.3). Pure + unit-tested.
//
// Turns the candidate pipeline into a hiring funnel. Because each candidate
// carries only its current stage, "reached" a stage means the candidate is at
// that stage or beyond (to sit in Interview you cleared Screening) — so the
// counts descend into a proper funnel. Rejected candidates are excluded from
// the reached counts (we do not know how far they got) but still reported.

export type CandidateStage =
  | "sourcing"
  | "screening"
  | "phone_screen"
  | "interview"
  | "assessment"
  | "offer"
  | "hired"
  | "rejected"

export interface CandidateInput {
  stage: CandidateStage
  source: string | null
}

// Pipeline order (rejected is off-pipeline).
const PIPELINE: { stage: CandidateStage; label: string }[] = [
  { stage: "sourcing", label: "Sourcing" },
  { stage: "screening", label: "Screening" },
  { stage: "phone_screen", label: "Phone screen" },
  { stage: "interview", label: "Interview" },
  { stage: "assessment", label: "Assessment" },
  { stage: "offer", label: "Offer" },
  { stage: "hired", label: "Hired" },
]
const STAGE_INDEX = new Map(PIPELINE.map((s, i) => [s.stage, i]))

export interface FunnelStage {
  stage: CandidateStage
  label: string
  count: number // reached this stage or beyond
  conversionFromPrevPct: number // % of the previous stage that reached here (100 for the first)
}

export interface SourceBucket {
  source: string
  count: number
}

export interface RecruitmentFunnel {
  total: number
  active: number // in pipeline, not hired or rejected
  hired: number
  rejected: number
  overallConversionPct: number | null // hired / candidates that entered the pipeline
  funnel: FunnelStage[]
  bySource: SourceBucket[] // largest first
}

function round1(n: number): number {
  return Math.round(n * 10) / 10
}

/** Build the recruitment funnel from the current candidate pipeline. */
export function computeRecruitmentFunnel(candidates: CandidateInput[]): RecruitmentFunnel {
  const reached = new Array(PIPELINE.length).fill(0)
  const sourceMap = new Map<string, number>()
  let rejected = 0
  let hired = 0

  for (const c of candidates) {
    const src = c.source?.trim() ? c.source.trim() : "Unknown"
    sourceMap.set(src, (sourceMap.get(src) ?? 0) + 1)

    if (c.stage === "rejected") {
      rejected += 1
      continue
    }
    const idx = STAGE_INDEX.get(c.stage)
    if (idx === undefined) continue
    if (c.stage === "hired") hired += 1
    // Reached this stage and every earlier stage.
    for (let i = 0; i <= idx; i++) reached[i] += 1
  }

  const funnel: FunnelStage[] = PIPELINE.map((s, i) => {
    const count = reached[i]
    const prev = i === 0 ? count : reached[i - 1]
    return {
      stage: s.stage,
      label: s.label,
      count,
      conversionFromPrevPct: i === 0 ? 100 : prev > 0 ? round1((count / prev) * 100) : 0,
    }
  })

  const entered = reached[0] // non-rejected candidates
  const total = candidates.length
  const bySource: SourceBucket[] = [...sourceMap.entries()]
    .map(([source, count]) => ({ source, count }))
    .sort((a, b) => b.count - a.count || a.source.localeCompare(b.source))

  return {
    total,
    active: entered - hired,
    hired,
    rejected,
    overallConversionPct: entered > 0 ? round1((hired / entered) * 100) : null,
    funnel,
    bySource,
  }
}
