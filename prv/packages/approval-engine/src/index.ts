// Approval Engine — Shared library for all approval workflows in PRV
// Full implementation in Epic 06 (Shared Services, Sprint 14)

export type ApprovalStatus =
  | "pending"
  | "approved"
  | "rejected"
  | "delegated"
  | "escalated"
  | "expired"

export type ApprovalPriority = "critical" | "high" | "normal" | "low"

export interface ApprovalChainStep {
  approverRole: string
  approverUserId?: string
  slaHours: number
  escalateToRole?: string
  requiresComment: boolean
}

export interface ApprovalChainConfig {
  entityType: string
  entityId: string
  companyId: string
  steps: ApprovalChainStep[]
  priority: ApprovalPriority
  metadata?: Record<string, unknown>
}

export interface ApprovalDecision {
  approvalId: string
  decision: "approved" | "rejected"
  comment?: string
  decidedBy: string
  decidedAt: Date
}

// Stub implementations — full logic in Epic 06
export function createApprovalChain(_config: ApprovalChainConfig): Promise<string> {
  throw new Error("Not implemented — Epic 06, Sprint 14")
}

export function submitForApproval(
  _entityType: string,
  _entityId: string,
  _companyId: string
): Promise<string> {
  throw new Error("Not implemented — Epic 06, Sprint 14")
}

export function processApproval(_decision: ApprovalDecision): Promise<void> {
  throw new Error("Not implemented — Epic 06, Sprint 14")
}

export function delegateApproval(
  _approvalId: string,
  _delegateToUserId: string,
  _until: Date
): Promise<void> {
  throw new Error("Not implemented — Epic 06, Sprint 14")
}

export function escalateApproval(_approvalId: string, _reason: string): Promise<void> {
  throw new Error("Not implemented — Epic 06, Sprint 14")
}

export function getApprovalStatus(_approvalId: string): Promise<ApprovalStatus> {
  throw new Error("Not implemented — Epic 06, Sprint 14")
}
