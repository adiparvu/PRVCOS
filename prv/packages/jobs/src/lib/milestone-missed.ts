// Milestone-missed critical-alert producer helpers (Phase 14.5) — pure + tested.
//
// A renovation phase whose planned end date has passed while it is still open
// (not completed/cancelled) is a "missed milestone". Unlike an assigned incident
// or a permit requester, a slipped project milestone has no single natural
// recipient, so the company ADMIN declares, per the `ops.milestone_missed`
// trigger, exactly which user receives the alert (see critical_alert_routes). A
// company with no active route simply raises no alert — the recipient is never
// guessed.
//
// This module holds the trigger key, the pure overdue math, and the pure alert
// row builder. The cron does the DB I/O (claim-once, route lookup, insert).

// Keep in sync with CRITICAL_TRIGGERS in
// apps/web/src/lib/critical-alert-routing.ts — the jobs package cannot import
// apps/web libs, so this key is duplicated intentionally.
export const MILESTONE_MISSED_TRIGGER = "ops.milestone_missed"

const MS_PER_DAY = 24 * 60 * 60 * 1000

/**
 * Whole days a phase is past its planned end date, floored at 0. `plannedEnd`
 * is a DATE string ("YYYY-MM-DD"); it is anchored to UTC midnight so the result
 * is stable regardless of the server timezone.
 */
export function daysOverdue(plannedEnd: string, nowMs: number): number {
  const dueMs = Date.parse(`${plannedEnd.slice(0, 10)}T00:00:00.000Z`)
  if (Number.isNaN(dueMs)) return 0
  const days = Math.floor((nowMs - dueMs) / MS_PER_DAY)
  return days > 0 ? days : 0
}

export interface MilestoneMissedInput {
  recipientId: string
  companyId: string
  phaseId: string
  projectId: string
  projectLabel: string
  phaseTitle: string
  plannedEnd: string
  now: Date
}

export interface MilestoneMissedAlertRow {
  userId: string
  companyId: string
  type: "error"
  channel: "in_app"
  title: string
  body: string
  entityType: string
  entityId: string
  actionUrl: string
  requiresAck: true
  deliveredAt: Date
  metadata: Record<string, unknown>
}

/**
 * Build the single requiresAck critical-alert row for a missed milestone. Pure:
 * fully determined by its input, timestamps supplied by the caller.
 */
export function buildMilestoneMissedAlert(input: MilestoneMissedInput): MilestoneMissedAlertRow {
  const { recipientId, companyId, phaseId, projectId, projectLabel, phaseTitle, plannedEnd, now } =
    input
  const overdue = daysOverdue(plannedEnd, now.getTime())
  const dueLabel = plannedEnd.slice(0, 10)

  return {
    userId: recipientId,
    companyId,
    type: "error",
    channel: "in_app",
    title: `Milestone ratat: ${projectLabel}`.slice(0, 500),
    body:
      `Faza „${phaseTitle}" a depășit termenul planificat (${dueLabel})` +
      `, restanță de ${overdue} ${overdue === 1 ? "zi" : "zile"}. ` +
      `Fază încă deschisă — necesită atenție imediată.`,
    entityType: "renovation_phase",
    entityId: phaseId,
    actionUrl: `/renovation/${projectId}`,
    requiresAck: true,
    deliveredAt: now,
    metadata: {
      triggerKey: MILESTONE_MISSED_TRIGGER,
      phaseId,
      projectId,
      plannedEnd: dueLabel,
      daysOverdue: overdue,
    },
  }
}
