// Notification Escalation / SLA engine (Phase 14.6) — pure + unit-tested.
//
// An `action_required` notification that a recipient never acts on is a silent
// operational risk: a permit awaiting approval, an expense blocking a payment.
// This module decides — from plain data, no I/O — which unacknowledged
// notifications have breached an admin-declared SLA and to whom each escalates.
//
// SAFE-by-design invariants:
//   • Only `action_required` notifications ever escalate. Informational types
//     (info/warning/success/error) demand nothing, so they are never escalated.
//   • "Acknowledged" = read OR dismissed. Either means the recipient saw the
//     demand, so no escalation fires.
//   • Escalates at most once (guarded by `escalatedAt`). The engine never loops.
//   • The escalation target is ALWAYS the policy's explicit `escalateToUserId`.
//     The engine never infers an org chart or "who the manager is".
//   • Self-escalation is dropped: if the target is the original recipient,
//     escalating to themselves adds nothing, so it is skipped.

export interface EscalatableNotification {
  id: string
  companyId: string
  userId: string // original recipient
  type: string // notification_type enum value
  entityType: string | null
  isRead: boolean
  isDismissed: boolean
  escalatedAt: Date | null
  createdAt: Date
}

export interface EscalationPolicy {
  id: string
  companyId: string
  entityType: string | null // null = matches any action_required notification
  slaMinutes: number
  escalateToUserId: string
  isActive: boolean
}

export interface EscalationTarget {
  notificationId: string
  policyId: string
  escalateToUserId: string
  ageMinutes: number
}

const MS_PER_MINUTE = 60_000

/** Whole minutes elapsed between `createdAt` and `now` (never negative). */
export function ageInMinutes(createdAt: Date, now: Date): number {
  const diff = now.getTime() - createdAt.getTime()
  return diff <= 0 ? 0 : Math.floor(diff / MS_PER_MINUTE)
}

/** A notification is a candidate for escalation only while it is genuinely pending. */
export function isPendingAction(n: EscalatableNotification): boolean {
  return n.type === "action_required" && !n.isRead && !n.isDismissed && n.escalatedAt === null
}

/**
 * Does `policy` govern `n`? The company must match, the policy must be active,
 * and either the policy is company-wide (entityType null) or its entityType
 * matches the notification's. A policy scoped to an entityType never governs a
 * notification that has no entityType.
 */
export function policyMatches(policy: EscalationPolicy, n: EscalatableNotification): boolean {
  if (!policy.isActive) return false
  if (policy.companyId !== n.companyId) return false
  if (policy.entityType === null) return true
  return policy.entityType === n.entityType
}

/**
 * Among the policies governing `n`, choose the one that should fire. Preference:
 *   1. A specific entityType policy over a company-wide (null) one — the more
 *      targeted SLA wins when both match.
 *   2. Within the same specificity, the tightest (smallest) slaMinutes.
 * Returns null if no active policy governs the notification.
 */
export function selectPolicy(
  policies: EscalationPolicy[],
  n: EscalatableNotification
): EscalationPolicy | null {
  let best: EscalationPolicy | null = null
  for (const p of policies) {
    if (!policyMatches(p, n)) continue
    if (best === null) {
      best = p
      continue
    }
    const pSpecific = p.entityType !== null
    const bestSpecific = best.entityType !== null
    if (pSpecific !== bestSpecific) {
      if (pSpecific) best = p // specific beats company-wide
      continue
    }
    if (p.slaMinutes < best.slaMinutes) best = p // tighter SLA wins
  }
  return best
}

/**
 * The full decision for a set of pending notifications against a company's
 * policies at time `now`. Returns one target per notification that has both a
 * governing policy AND has aged past that policy's SLA — skipping any where the
 * target would be the original recipient (a no-op self-escalation).
 */
export function escalationTargets(
  notifications: EscalatableNotification[],
  policies: EscalationPolicy[],
  now: Date
): EscalationTarget[] {
  const out: EscalationTarget[] = []
  for (const n of notifications) {
    if (!isPendingAction(n)) continue
    const policy = selectPolicy(policies, n)
    if (!policy) continue
    const age = ageInMinutes(n.createdAt, now)
    if (age < policy.slaMinutes) continue
    if (policy.escalateToUserId === n.userId) continue // don't escalate to self
    out.push({
      notificationId: n.id,
      policyId: policy.id,
      escalateToUserId: policy.escalateToUserId,
      ageMinutes: age,
    })
  }
  return out
}
