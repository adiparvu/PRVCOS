// Approval Engine — DB-backed approval workflow for PRV
// Works against the approval_requests table (single-approver model).
// Multi-step chain support deferred until a dedicated chain_steps table is added.

import { db } from "@prv/db"
import { approvalRequests } from "@prv/db/schema"
import { and, eq, inArray, lt } from "drizzle-orm"

// ── Types ─────────────────────────────────────────────────────────────────────

export type ApprovalStatus = "pending" | "approved" | "rejected" | "escalated" | "expired"
export type ApprovalType = "purchase" | "leave" | "expense" | "contract" | "overtime"
export type ApprovalPriority = "critical" | "high" | "normal" | "low"

export interface ApprovalRequest {
  companyId: string
  requestedByUserId: string
  type: ApprovalType
  title: string
  ref: string
  description?: string
  value?: number
  deadline: Date
  entityType?: string
  entityId?: string
}

export interface ApprovalDecision {
  approvalId: string
  decision: "approved" | "rejected"
  comment?: string
  decidedBy: string
  decidedAt: Date
}

export class ApprovalNotFoundError extends Error {
  constructor(id: string) {
    super(`Approval ${id} not found`)
    this.name = "ApprovalNotFoundError"
  }
}

// ── Validation ────────────────────────────────────────────────────────────────

export function validateApprovalRequest(req: ApprovalRequest): string[] {
  const errors: string[] = []
  if (!req.companyId) errors.push("companyId is required")
  if (!req.requestedByUserId) errors.push("requestedByUserId is required")
  if (!req.title || req.title.trim().length === 0) errors.push("title is required")
  if (!req.ref || req.ref.trim().length === 0) errors.push("ref is required")
  if (!(req.deadline instanceof Date) || isNaN(req.deadline.getTime())) {
    errors.push("deadline must be a valid Date")
  } else if (req.deadline <= new Date()) {
    errors.push("deadline must be in the future")
  }
  if (req.value !== undefined && (isNaN(req.value) || req.value < 0)) {
    errors.push("value must be a non-negative number")
  }
  return errors
}

export function deadlineFromSlaHours(slaHours: number, from: Date = new Date()): Date {
  return new Date(from.getTime() + slaHours * 3_600_000)
}

export function isOverdue(deadline: Date, now: Date = new Date()): boolean {
  return deadline < now
}

// ── Engine functions ──────────────────────────────────────────────────────────

/**
 * Create a new approval request in the database.
 * Returns the new approval ID.
 */
export async function submitForApproval(req: ApprovalRequest): Promise<string> {
  const errors = validateApprovalRequest(req)
  if (errors.length > 0) throw new Error(`Invalid approval request: ${errors.join(", ")}`)

  const [row] = await db
    .insert(approvalRequests)
    .values({
      companyId: req.companyId,
      requestedByUserId: req.requestedByUserId,
      type: req.type,
      title: req.title.trim(),
      ref: req.ref.trim(),
      description: req.description,
      value: req.value !== undefined ? String(req.value) : undefined,
      deadline: req.deadline,
      status: "pending",
      entityType: req.entityType,
      entityId: req.entityId,
    })
    .returning({ id: approvalRequests.id })

  if (!row) throw new Error("Database insert failed — no row returned")
  return row.id
}

/**
 * Approve or reject an existing approval.
 * Sets resolvedAt, approvedByUserId, and status.
 */
export async function processApproval(decision: ApprovalDecision): Promise<void> {
  const rows = await db
    .update(approvalRequests)
    .set({
      status: decision.decision,
      approvedByUserId: decision.decidedBy,
      resolvedAt: decision.decidedAt,
      updatedAt: new Date(),
    })
    .where(
      and(
        eq(approvalRequests.id, decision.approvalId),
        inArray(approvalRequests.status, ["pending", "urgent"])
      )
    )
    .returning({ id: approvalRequests.id })

  if (rows.length === 0) throw new ApprovalNotFoundError(decision.approvalId)
}

/**
 * Mark an approval as urgent (escalated).
 * Only transitions from "pending" — already urgent/resolved approvals are skipped.
 */
export async function escalateApproval(approvalId: string): Promise<void> {
  await db
    .update(approvalRequests)
    .set({ status: "urgent", updatedAt: new Date() })
    .where(and(eq(approvalRequests.id, approvalId), eq(approvalRequests.status, "pending")))
}

/**
 * Reassign the approver (delegate) without changing status.
 */
export async function delegateApproval(
  approvalId: string,
  newApproverUserId: string
): Promise<void> {
  const rows = await db
    .update(approvalRequests)
    .set({ approvedByUserId: newApproverUserId, updatedAt: new Date() })
    .where(
      and(
        eq(approvalRequests.id, approvalId),
        inArray(approvalRequests.status, ["pending", "urgent"])
      )
    )
    .returning({ id: approvalRequests.id })

  if (rows.length === 0) throw new ApprovalNotFoundError(approvalId)
}

/**
 * Fetch the current status of an approval by ID.
 * Maps DB "urgent" → "escalated" for the engine's status type.
 * Returns null if not found.
 */
export async function getApprovalStatus(approvalId: string): Promise<ApprovalStatus | null> {
  const rows = await db
    .select({ status: approvalRequests.status })
    .from(approvalRequests)
    .where(eq(approvalRequests.id, approvalId))
    .limit(1)

  const row = rows[0]
  if (!row) return null
  if (row.status === "urgent") return "escalated"
  return row.status as ApprovalStatus
}

/**
 * Sweep past-deadline approvals and mark them as expired.
 * Called by the approval-deadline-expire background job.
 * Returns the number of records updated.
 */
export async function markExpiredApprovals(companyId?: string): Promise<number> {
  const now = new Date()
  const conditions = [
    inArray(approvalRequests.status, ["pending", "urgent"]),
    lt(approvalRequests.deadline, now),
  ]
  if (companyId) conditions.push(eq(approvalRequests.companyId, companyId))

  const rows = await db
    .update(approvalRequests)
    .set({ status: "expired", updatedAt: now })
    .where(and(...conditions))
    .returning({ id: approvalRequests.id })

  return rows.length
}
