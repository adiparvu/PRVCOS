// Approvals analytics — approval queue health (roadmap Phase 16). Pure +
// unit-tested.
//
// Turns the approval request ledger into queue health: the status mix, the open
// backlog and how much of it is stale (waiting more than 48h), the approval
// rate over decided requests, the average decision time, and a by-type
// breakdown so an approver sees what is waiting and how fast it clears.

export type ApprovalStatus = "pending" | "urgent" | "expired" | "approved" | "rejected"
export type ApprovalType = "purchase" | "leave" | "expense" | "contract" | "overtime"

export interface ApprovalInput {
  type: ApprovalType
  status: ApprovalStatus
  createdAt: string // ISO
  resolvedAt: string | null // ISO
}

export interface ApprovalTypeBucket {
  type: string
  count: number
}

export interface ApprovalAnalytics {
  total: number
  open: number // pending + urgent
  stale: number // open and waiting > 48h
  expired: number
  approved: number
  rejected: number
  approvalRatePct: number | null // approved / (approved + rejected)
  avgDecisionHours: number | null // mean resolve time over decided requests
  byStatus: Record<ApprovalStatus, number>
  byType: ApprovalTypeBucket[] // largest first
}

const OPEN = new Set<ApprovalStatus>(["pending", "urgent"])
const STALE_MS = 48 * 3_600_000

function round1(n: number): number {
  return Math.round(n * 10) / 10
}

/** Aggregate approval requests into queue health as of `nowMs`. */
export function computeApprovalAnalytics(
  approvals: ApprovalInput[],
  nowMs: number
): ApprovalAnalytics {
  const byStatus: Record<ApprovalStatus, number> = {
    pending: 0,
    urgent: 0,
    expired: 0,
    approved: 0,
    rejected: 0,
  }
  const typeMap = new Map<string, number>()

  let open = 0
  let stale = 0
  let decisionHoursSum = 0
  let decisionCount = 0

  for (const a of approvals) {
    if (a.status in byStatus) byStatus[a.status] += 1
    typeMap.set(a.type, (typeMap.get(a.type) ?? 0) + 1)

    if (OPEN.has(a.status)) {
      open += 1
      const created = Date.parse(a.createdAt)
      if (Number.isFinite(created) && nowMs - created > STALE_MS) stale += 1
    }

    if ((a.status === "approved" || a.status === "rejected") && a.resolvedAt) {
      const created = Date.parse(a.createdAt)
      const resolved = Date.parse(a.resolvedAt)
      if (Number.isFinite(created) && Number.isFinite(resolved) && resolved >= created) {
        decisionHoursSum += (resolved - created) / 3_600_000
        decisionCount += 1
      }
    }
  }

  const approved = byStatus.approved
  const rejected = byStatus.rejected
  const decided = approved + rejected

  const byType: ApprovalTypeBucket[] = [...typeMap.entries()]
    .map(([type, count]) => ({ type, count }))
    .sort((a, b) => b.count - a.count || a.type.localeCompare(b.type))

  return {
    total: approvals.length,
    open,
    stale,
    expired: byStatus.expired,
    approved,
    rejected,
    approvalRatePct: decided > 0 ? round1((approved / decided) * 100) : null,
    avgDecisionHours: decisionCount > 0 ? round1(decisionHoursSum / decisionCount) : null,
    byStatus,
    byType,
  }
}
