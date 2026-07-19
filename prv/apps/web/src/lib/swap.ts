/**
 * Pure logic for shift swap requests (Phase 7.2). A worker requests to swap or
 * give up a shift they're assigned to; a team leader approves or rejects. Only
 * pending requests can be decided.
 */

export type SwapStatus = "pending" | "approved" | "rejected" | "cancelled"

/** A swap can only be decided while it is still pending. */
export function canDecideSwap(status: SwapStatus): boolean {
  return status === "pending"
}

/** The status a decision moves a pending swap into. */
export function swapDecisionStatus(decision: "approve" | "reject"): SwapStatus {
  return decision === "approve" ? "approved" : "rejected"
}
