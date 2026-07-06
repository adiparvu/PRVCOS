// Inspection compliance — safety analytics (roadmap 18.4). Pure + unit-tested.
//
// Measures whether scheduled safety inspections are actually being completed on
// schedule: the compliance rate over due inspections, the overdue backlog, the
// upcoming pipeline, and the average inspection score. Overdue is derived from
// the schedule (a scheduled/in-progress inspection past its date counts as
// overdue even if a job hasn't flipped its status yet).

export type InspectionStatus = "scheduled" | "in_progress" | "completed" | "overdue"

export interface InspectionInput {
  status: InspectionStatus
  scheduledAt: string // ISO
  completedAt: string | null // ISO
  score: number | null
  maxScore: number | null
}

export interface InspectionCompliance {
  total: number
  completed: number
  overdue: number
  upcoming: number // not yet due
  complianceRatePct: number | null // completed / (completed + overdue)
  avgScorePct: number | null // mean score over scored, completed inspections
}

function round1(n: number): number {
  return Math.round(n * 10) / 10
}

/**
 * Compute inspection-compliance KPIs as of `nowMs`. Compliance is measured over
 * *due* inspections (completed + overdue); still-upcoming inspections are not
 * yet counted for or against the rate.
 */
export function computeInspectionCompliance(
  inspections: InspectionInput[],
  nowMs: number
): InspectionCompliance {
  let completed = 0
  let overdue = 0
  let upcoming = 0
  let scoreSum = 0
  let scoreCount = 0

  for (const ins of inspections) {
    if (ins.status === "completed") {
      completed += 1
      if (
        ins.score !== null &&
        ins.maxScore !== null &&
        Number.isFinite(ins.score) &&
        Number.isFinite(ins.maxScore) &&
        ins.maxScore > 0
      ) {
        scoreSum += Math.max(0, Math.min(1, ins.score / ins.maxScore)) * 100
        scoreCount += 1
      }
      continue
    }
    const due = Date.parse(ins.scheduledAt)
    const isOverdue = ins.status === "overdue" || (Number.isFinite(due) && due < nowMs)
    if (isOverdue) overdue += 1
    else upcoming += 1
  }

  const dueTotal = completed + overdue

  return {
    total: inspections.length,
    completed,
    overdue,
    upcoming,
    complianceRatePct: dueTotal > 0 ? round1((completed / dueTotal) * 100) : null,
    avgScorePct: scoreCount > 0 ? round1(scoreSum / scoreCount) : null,
  }
}
