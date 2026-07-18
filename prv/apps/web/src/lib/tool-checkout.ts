/**
 * Pure helpers for the tool checkout / return custody ledger (Phase 22.1).
 *
 * A tool goes out on a checkout, stays out under a custodian until it is handed
 * back, and returns either ready-to-use or — if damage was reported — into
 * maintenance. These functions hold the decisions that logic depends on so the
 * API routes stay thin and the behaviour is unit-tested in one place. Nothing
 * here touches the database; callers pass in the reference time.
 */

export type ToolCheckoutStatus = "open" | "returned"

/** Tool statuses from which a fresh checkout may start. Only an idle, available
 * tool can be taken out — one already in use, in maintenance, retired or lost
 * cannot. */
export function canCheckout(toolStatus: string): boolean {
  return toolStatus === "available"
}

/**
 * The status a tool returns to once handed back: a damaged tool goes into
 * `maintenance` so it can't be checked out again until serviced; otherwise it
 * becomes `available`.
 */
export function resolveReturnedToolStatus(damageReported: boolean): "available" | "maintenance" {
  return damageReported ? "maintenance" : "available"
}

/** Whole days a tool has been (or was) out, floored at zero. `ref` is the
 * return time for a closed checkout or "now" for an open one. */
export function checkoutDurationDays(checkedOutAt: Date, ref: Date): number {
  const ms = ref.getTime() - checkedOutAt.getTime()
  return ms <= 0 ? 0 : Math.floor(ms / 86_400_000)
}

/** A checkout is overdue when it is still open and its expected-return time has
 * passed. A checkout with no expected-return date is never overdue, and a
 * returned one is never overdue. */
export function isCheckoutOverdue(
  expectedReturnAt: Date | null,
  returnedAt: Date | null,
  now: Date
): boolean {
  if (returnedAt !== null) return false
  if (expectedReturnAt === null) return false
  return expectedReturnAt.getTime() < now.getTime()
}

export interface CheckoutRow {
  checkedOutAt: Date
  expectedReturnAt: Date | null
  returnedAt: Date | null
}

export interface CheckoutSummary {
  status: ToolCheckoutStatus
  durationDays: number
  overdue: boolean
}

/** Derive the display state of a checkout row at time `now`. */
export function summarizeCheckout(row: CheckoutRow, now: Date): CheckoutSummary {
  const status: ToolCheckoutStatus = row.returnedAt !== null ? "returned" : "open"
  const ref = row.returnedAt ?? now
  return {
    status,
    durationDays: checkoutDurationDays(row.checkedOutAt, ref),
    overdue: isCheckoutOverdue(row.expectedReturnAt, row.returnedAt, now),
  }
}
