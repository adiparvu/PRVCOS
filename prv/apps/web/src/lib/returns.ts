// Order returns math + workflow (roadmap 9.3). Pure + unit-tested.

export type ReturnStatus = "requested" | "approved" | "received" | "refunded" | "rejected"

export interface ReturnItemLike {
  quantity: number
  unitPrice: number
}

/** Refund total = Σ quantity × unit price, rounded to cents. */
export function computeRefund(items: ReturnItemLike[]): number {
  const total = items.reduce((s, i) => s + Math.max(0, i.quantity) * Math.max(0, i.unitPrice), 0)
  return Math.round(total * 100) / 100
}

// Allowed status transitions for the returns workflow.
export const RETURN_TRANSITIONS: Record<ReturnStatus, ReturnStatus[]> = {
  requested: ["approved", "rejected"],
  approved: ["received", "rejected"],
  received: ["refunded"],
  refunded: [],
  rejected: [],
}

export function isValidReturnTransition(from: string, to: string): boolean {
  return (RETURN_TRANSITIONS[from as ReturnStatus] ?? []).includes(to as ReturnStatus)
}
