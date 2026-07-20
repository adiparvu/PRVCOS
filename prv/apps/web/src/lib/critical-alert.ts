// Critical alerts (Phase 14.5) — pure + unit-tested.
//
// A critical alert is a notification with requiresAck=true: it must be
// explicitly acknowledged (persistent banner) rather than passively read. This
// module decides, from plain data, which critical alerts are still PENDING for a
// user and which unacknowledged ones are due to escalate to the recipient's
// manager. No I/O — the routes/cron mirror these predicates in SQL.

export interface CriticalAlertRow {
  isDismissed: boolean
  requiresAck: boolean
  acknowledgedAt: Date | null
  ackEscalatedAt: Date | null
  scheduledFor: Date | null
  expiresAt: Date | null
  createdAt: Date
}

/** Minutes after which an unacknowledged critical alert escalates (roadmap 14.5). */
export const CRITICAL_ESCALATE_MINUTES = 15

function isVisibleNow(n: CriticalAlertRow, now: Date): boolean {
  if (n.scheduledFor !== null && n.scheduledFor.getTime() > now.getTime()) return false
  if (n.expiresAt !== null && n.expiresAt.getTime() <= now.getTime()) return false
  return true
}

/**
 * Is this a critical alert still awaiting the user's acknowledgement? It must
 * require ack, not be acknowledged, not be dismissed, and be within its
 * scheduled/expiry window.
 */
export function isCriticalPending(n: CriticalAlertRow, now: Date): boolean {
  return n.requiresAck && n.acknowledgedAt === null && !n.isDismissed && isVisibleNow(n, now)
}

/** Whole minutes elapsed since createdAt (never negative). */
export function ageInMinutes(createdAt: Date, now: Date): number {
  const diff = now.getTime() - createdAt.getTime()
  return diff <= 0 ? 0 : Math.floor(diff / 60_000)
}

/**
 * Should the cron escalate this critical alert to the recipient's manager now?
 * Only a pending critical alert, not yet ack-escalated, older than the threshold.
 */
export function isAckEscalationDue(
  n: CriticalAlertRow,
  now: Date,
  minutes: number = CRITICAL_ESCALATE_MINUTES
): boolean {
  if (!isCriticalPending(n, now)) return false
  if (n.ackEscalatedAt !== null) return false
  return ageInMinutes(n.createdAt, now) >= minutes
}
